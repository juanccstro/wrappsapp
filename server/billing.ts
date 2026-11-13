import { FINGERPRINT_TTL_S, FREE_USES, PRODUCTS, type ProductId } from './config.js';
import {
  isDeviceId,
  keyedHash,
  newDeviceId,
  normalizeCode,
  normalizeEmail,
  sameHash,
} from './ids.js';
import type { Store } from './store.js';

/** What a device has done. `used` holds keyed hashes of chats, never their content. */
type DeviceRecord = { used: string[]; buyer?: string; created: number };
/** What a buyer (an email, stored only as a keyed hash) has paid for. */
type BuyerRecord = { unlimited: boolean; credits: number; spent: string[]; codes: string[] };

export type Status = {
  /** False while billing is not configured: the app then has no limit. */
  enforced: boolean;
  deviceId: string;
  used: number;
  limit: number;
  unlimited: boolean;
  /** Null when unlimited. */
  remaining: number | null;
};

const MAX_SPENT = 2000;

const deviceKey = (id: string) => `dev:${id}`;
const buyerKey = (hash: string) => `buyer:${hash}`;

export type Billing = ReturnType<typeof createBilling>;

/**
 * The free tier and purchases. Pure logic over a Store, so it is tested without Stripe or a
 * network. Every chat is counted once per device: seeing it again, or with another period,
 * never spends a use.
 */
export function createBilling(store: Store, secret: string) {
  const hash = (purpose: string, value: string) => keyedHash(secret, purpose, value);

  const loadDevice = async (id: string) => store.get<DeviceRecord>(deviceKey(id));
  const loadBuyer = async (key: string | undefined) =>
    key ? store.get<BuyerRecord>(buyerKey(key)) : null;

  const statusOf = (id: string, device: DeviceRecord, buyer: BuyerRecord | null): Status => {
    const unlimited = buyer?.unlimited ?? false;
    const limit = FREE_USES + (buyer?.credits ?? 0);
    const used =
      Math.min(device.used.length, FREE_USES) + (unlimited ? 0 : (buyer?.spent.length ?? 0));
    return {
      enforced: true,
      deviceId: id,
      used: Math.min(used, limit),
      limit,
      unlimited,
      remaining: unlimited ? null : Math.max(0, limit - used),
    };
  };

  /**
   * Which device is this? In order: the id the browser kept (cookie, storage), then the same
   * device fingerprint on the same network (the browser data was cleared), then a new one.
   */
  async function resolveDevice(input: {
    deviceId?: unknown;
    fingerprint?: string;
    network: string;
  }): Promise<{ id: string; device: DeviceRecord }> {
    const fpKey = input.fingerprint
      ? `fp:${hash('fingerprint', `${input.fingerprint}|${input.network}`)}`
      : null;

    if (isDeviceId(input.deviceId)) {
      const device = await loadDevice(input.deviceId);
      if (device) {
        if (fpKey) await store.setIfAbsent(fpKey, input.deviceId, FINGERPRINT_TTL_S);
        return { id: input.deviceId, device };
      }
    }
    if (fpKey) {
      const known = await store.get<string>(fpKey);
      if (known) {
        const device = await loadDevice(known);
        if (device) return { id: known, device };
      }
    }
    const id = isDeviceId(input.deviceId) ? input.deviceId : newDeviceId();
    const device: DeviceRecord = { used: [], created: Date.now() };
    await store.set(deviceKey(id), device);
    if (fpKey) await store.set(fpKey, id, FINGERPRINT_TTL_S);
    return { id, device };
  }

  async function status(id: string, device: DeviceRecord): Promise<Status> {
    return statusOf(id, device, await loadBuyer(device.buyer));
  }

  /** Spends a use on a chat, unless it was already counted. */
  async function consume(
    id: string,
    device: DeviceRecord,
    chatKey: string,
  ): Promise<{ allowed: boolean; status: Status }> {
    const chat = hash('chat', chatKey);
    const buyer = await loadBuyer(device.buyer);

    const already =
      device.used.some((h) => sameHash(h, chat)) || buyer?.spent.some((h) => sameHash(h, chat));
    if (already) return { allowed: true, status: statusOf(id, device, buyer) };

    if (device.used.length < FREE_USES) {
      device.used.push(chat);
      await store.set(deviceKey(id), device);
      return { allowed: true, status: statusOf(id, device, buyer) };
    }
    if (buyer && device.buyer && (buyer.unlimited || buyer.spent.length < buyer.credits)) {
      buyer.spent = [...buyer.spent, chat].slice(-MAX_SPENT);
      await store.set(buyerKey(device.buyer), buyer);
      return { allowed: true, status: statusOf(id, device, buyer) };
    }
    return { allowed: false, status: statusOf(id, device, buyer) };
  }

  /**
   * Adds a paid purchase to the buyer behind `email` and links the device to it. Safe to call
   * twice for the same checkout (the webhook and the return page both do).
   */
  async function applyPurchase(input: {
    checkoutId: string;
    deviceId: string;
    email: string;
    product: ProductId;
    recoveryCode: string;
  }): Promise<void> {
    const first = await store.setIfAbsent(`done:${input.checkoutId}`, 1);
    const key = hash('email', normalizeEmail(input.email));
    if (first) {
      const buyer = (await loadBuyer(key)) ?? {
        unlimited: false,
        credits: 0,
        spent: [],
        codes: [],
      };
      if (input.product === 'unlimited') buyer.unlimited = true;
      else buyer.credits += PRODUCTS[input.product].credits;
      buyer.codes = [...buyer.codes, hash('code', normalizeCode(input.recoveryCode))].slice(-50);
      await store.set(buyerKey(key), buyer);
    }
    const device = await loadDevice(input.deviceId);
    if (device && device.buyer !== key) {
      device.buyer = key;
      await store.set(deviceKey(input.deviceId), device);
    }
  }

  /** Links this device to an earlier purchase, given the email and its recovery code. */
  async function restore(
    id: string,
    device: DeviceRecord,
    email: string,
    code: string,
  ): Promise<Status | null> {
    const key = hash('email', normalizeEmail(email));
    const buyer = await loadBuyer(key);
    const codeHash = hash('code', normalizeCode(code));
    if (!buyer || !buyer.codes.some((c) => sameHash(c, codeHash))) return null;
    device.buyer = key;
    await store.set(deviceKey(id), device);
    return statusOf(id, device, buyer);
  }

  /** Counts attempts per window; false once the limit is passed. */
  async function allow(bucket: string, who: string, limit: number, windowS: number) {
    const count = await store.incr(`rl:${bucket}:${hash('rl', who)}`, windowS);
    return count <= limit;
  }

  return { resolveDevice, status, consume, applyPurchase, restore, allow };
}
