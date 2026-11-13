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
export type PurchaseState = 'active' | 'refund_pending' | 'refunded';

/** One paid checkout. `code` is the keyed hash of its recovery code. */
type Purchase = { id: string; product: ProductId; code: string; state: PurchaseState };

/**
 * What a buyer (an email, stored only as a keyed hash) has paid for. `unlimited` and
 * `credits` are running totals of the active purchases; `codes` holds the recovery codes of
 * purchases made before `purchases` existed.
 */
type BuyerRecord = {
  unlimited: boolean;
  credits: number;
  spent: string[];
  codes: string[];
  purchases?: Purchase[];
};

export type RestoreOutcome = 'restored' | 'already_active' | 'refund_pending' | 'refunded';

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
/** Adds what a product gives to the running totals. */
function grant(buyer: BuyerRecord, product: ProductId) {
  if (product === 'unlimited') buyer.unlimited = true;
  else buyer.credits += PRODUCTS[product].credits;
}

/** Takes it away again (refund). Unlimited stays if another active purchase gives it. */
function revoke(buyer: BuyerRecord, product: ProductId) {
  if (product === 'unlimited') {
    buyer.unlimited = (buyer.purchases ?? []).some(
      (p) => p.product === 'unlimited' && p.state === 'active',
    );
  } else {
    buyer.credits = Math.max(0, buyer.credits - PRODUCTS[product].credits);
  }
}

/** Two browsers of the same device become one: chats used in either count once. */
function mergeDevices(into: DeviceRecord, from: DeviceRecord): DeviceRecord {
  const used = [...into.used];
  for (const chat of from.used) if (!used.includes(chat)) used.push(chat);
  return {
    used,
    buyer: into.buyer ?? from.buyer,
    created: Math.min(into.created, from.created),
  };
}

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
   * Which device is this? In order:
   * 1. the id the browser kept (cookie, storage), following merges;
   * 2. the same browser fingerprint on the same network (browser data was cleared);
   * 3. the same device fingerprint on the same network: traits every browser on the device
   *    shares (screen, time zone, OS), so another browser on the same phone is recognised;
   * 4. a new device.
   * When a known id turns out to be another browser of a device seen before, both are merged
   * into the older one, so all browsers of the device share one counter.
   */
  async function resolveDevice(input: {
    deviceId?: unknown;
    fingerprint?: string;
    crossFingerprint?: string;
    network: string;
  }): Promise<{ id: string; device: DeviceRecord }> {
    const fpKey = input.fingerprint
      ? `fp:${hash('fingerprint', `${input.fingerprint}|${input.network}`)}`
      : null;
    const xfpKey = input.crossFingerprint
      ? `xfp:${hash('cross-fingerprint', `${input.crossFingerprint}|${input.network}`)}`
      : null;
    const remember = async (id: string) => {
      if (fpKey) await store.setIfAbsent(fpKey, id, FINGERPRINT_TTL_S);
      if (xfpKey) await store.setIfAbsent(xfpKey, id, FINGERPRINT_TTL_S);
    };
    const follow = async (id: string) => (await store.get<string>(`alias:${id}`)) ?? id;

    const crossId = xfpKey ? await store.get<string>(xfpKey) : null;
    const crossDevice = crossId ? await loadDevice(crossId) : null;

    if (isDeviceId(input.deviceId)) {
      const id = await follow(input.deviceId);
      const device = await loadDevice(id);
      if (device) {
        if (crossId && crossDevice && crossId !== id) {
          const merged = mergeDevices(crossDevice, device);
          await store.set(deviceKey(crossId), merged);
          await store.set(`alias:${id}`, crossId);
          if (fpKey) await store.set(fpKey, crossId, FINGERPRINT_TTL_S);
          return { id: crossId, device: merged };
        }
        await remember(id);
        return { id, device };
      }
    }
    if (fpKey) {
      const known = await store.get<string>(fpKey);
      const id = known ? await follow(known) : null;
      const device = id ? await loadDevice(id) : null;
      if (id && device) {
        await remember(id);
        return { id, device };
      }
    }
    if (crossId && crossDevice) {
      await remember(crossId);
      return { id: crossId, device: crossDevice };
    }
    const id = isDeviceId(input.deviceId) ? input.deviceId : newDeviceId();
    const device: DeviceRecord = { used: [], created: Date.now() };
    await store.set(deviceKey(id), device);
    await remember(id);
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
      grant(buyer, input.product);
      buyer.purchases = [
        ...(buyer.purchases ?? []),
        {
          id: input.checkoutId,
          product: input.product,
          code: hash('code', normalizeCode(input.recoveryCode)),
          state: 'active' as const,
        },
      ].slice(-200);
      await store.set(buyerKey(key), buyer);
    }
    const device = await loadDevice(input.deviceId);
    if (device && device.buyer !== key) {
      device.buyer = key;
      await store.set(deviceKey(input.deviceId), device);
    }
  }

  /**
   * Links this device to an earlier purchase, given the email and its recovery code, and says
   * how it went: restored, already active here, or not active because it was refunded.
   */
  async function restore(
    id: string,
    device: DeviceRecord,
    email: string,
    code: string,
  ): Promise<{ status: Status; outcome: RestoreOutcome } | null> {
    const key = hash('email', normalizeEmail(email));
    const buyer = await loadBuyer(key);
    if (!buyer) return null;
    const codeHash = hash('code', normalizeCode(code));
    const purchase = buyer.purchases?.find((p) => p.code && sameHash(p.code, codeHash));
    const legacy = !purchase && buyer.codes.some((c) => sameHash(c, codeHash));
    if (!purchase && !legacy) return null;

    // Purchases from before states were kept: active while the buyer still has something.
    const state: PurchaseState = purchase
      ? purchase.state
      : buyer.unlimited || buyer.credits > 0
        ? 'active'
        : 'refunded';
    if (state !== 'active') {
      return { status: statusOf(id, device, await loadBuyer(device.buyer)), outcome: state };
    }

    const already = device.buyer === key;
    if (!already) {
      device.buyer = key;
      await store.set(deviceKey(id), device);
    }
    return {
      status: statusOf(id, device, buyer),
      outcome: already ? 'already_active' : 'restored',
    };
  }

  /**
   * A refund was started, finished, or failed for a checkout (from the Stripe webhook). Takes
   * away what it gave while the refund is pending or done, and gives it back if it failed.
   * `email` finds the buyer; purchases from before states were kept are added on the fly.
   */
  async function setRefundState(input: {
    checkoutId: string;
    email: string;
    product: ProductId;
    state: PurchaseState;
  }): Promise<void> {
    const key = hash('email', normalizeEmail(input.email));
    const buyer = await loadBuyer(key);
    if (!buyer) return;
    buyer.purchases ??= [];
    let purchase = buyer.purchases.find((p) => p.id === input.checkoutId);
    if (!purchase) {
      purchase = { id: input.checkoutId, product: input.product, code: '', state: 'active' };
      buyer.purchases.push(purchase);
    }
    const wasActive = purchase.state === 'active';
    const nowActive = input.state === 'active';
    purchase.state = input.state;
    if (wasActive && !nowActive) revoke(buyer, purchase.product);
    if (!wasActive && nowActive) grant(buyer, purchase.product);
    await store.set(buyerKey(key), buyer);
  }

  /** Counts attempts per window; false once the limit is passed. */
  async function allow(bucket: string, who: string, limit: number, windowS: number) {
    const count = await store.incr(`rl:${bucket}:${hash('rl', who)}`, windowS);
    return count <= limit;
  }

  return { resolveDevice, status, consume, applyPurchase, restore, setRefundState, allow };
}
