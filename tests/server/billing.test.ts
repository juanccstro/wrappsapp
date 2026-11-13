import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createBilling } from '../../server/billing';
import { createMemoryStore } from '../../server/store';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const chat = (n: number) => sha(`chat ${n}`);
const FP = sha('iPhone 15, es-ES, Europe/Madrid');

function setup() {
  const store = createMemoryStore();
  const billing = createBilling(store, 'test-secret');
  const device = (deviceId?: string, network = '83.45.12', fingerprint = FP) =>
    billing.resolveDevice({ deviceId, fingerprint, network });
  return { store, billing, device };
}

describe('free tier', () => {
  it('allows two different chats, then blocks the third', async () => {
    const { billing, device } = setup();
    const { id, device: d } = await device();
    expect(await billing.status(id, d)).toMatchObject({ used: 0, limit: 2, remaining: 2 });

    expect((await billing.consume(id, d, chat(1))).allowed).toBe(true);
    expect((await billing.consume(id, d, chat(2))).allowed).toBe(true);
    const third = await billing.consume(id, d, chat(3));
    expect(third.allowed).toBe(false);
    expect(third.status).toMatchObject({ used: 2, limit: 2, remaining: 0, unlimited: false });
  });

  it('never charges twice for the same chat (another period, seeing it again)', async () => {
    const { billing, device } = setup();
    const { id, device: d } = await device();
    await billing.consume(id, d, chat(1));
    await billing.consume(id, d, chat(1));
    await billing.consume(id, d, chat(2));
    expect((await billing.consume(id, d, chat(1))).allowed).toBe(true);
    expect((await billing.status(id, d)).used).toBe(2);
  });

  it('remembers the device after the browser data is cleared (same phone, same network)', async () => {
    const { billing, device } = setup();
    const first = await device();
    await billing.consume(first.id, first.device, chat(1));
    await billing.consume(first.id, first.device, chat(2));

    // No stored id any more: found again through fingerprint + network.
    const again = await device(undefined);
    expect(again.id).toBe(first.id);
    expect((await billing.consume(again.id, again.device, chat(3))).allowed).toBe(false);
  });

  it('does not mix up two identical phones on different networks', async () => {
    const { billing, device } = setup();
    const mine = await device(undefined, '83.45.12');
    await billing.consume(mine.id, mine.device, chat(1));
    await billing.consume(mine.id, mine.device, chat(2));

    const friend = await device(undefined, '91.200.7');
    expect(friend.id).not.toBe(mine.id);
    expect((await billing.status(friend.id, friend.device)).remaining).toBe(2);
  });

  it('gives a new device its own free uses', async () => {
    const { billing, device } = setup();
    const phone = await device(undefined, '83.45.12', sha('phone'));
    await billing.consume(phone.id, phone.device, chat(1));
    await billing.consume(phone.id, phone.device, chat(2));
    const laptop = await device(undefined, '83.45.12', sha('laptop'));
    expect((await billing.consume(laptop.id, laptop.device, chat(3))).allowed).toBe(true);
  });
});

describe('purchases', () => {
  const buy = async (
    billing: ReturnType<typeof setup>['billing'],
    deviceId: string,
    product: 'pack3' | 'unlimited',
    checkoutId = `cs_test_${product}`,
  ) =>
    billing.applyPurchase({
      checkoutId,
      deviceId,
      email: 'Ana@Example.com',
      product,
      recoveryCode: 'ABCD-EFGH-JKLM',
    });

  it('a pack adds three more chats', async () => {
    const { billing, device } = setup();
    const { id } = await device();
    for (const n of [1, 2]) await billing.consume(id, (await device(id)).device, chat(n));
    await buy(billing, id, 'pack3');

    let d = (await device(id)).device;
    expect(await billing.status(id, d)).toMatchObject({ used: 2, limit: 5, remaining: 3 });
    for (const n of [3, 4, 5]) {
      d = (await device(id)).device;
      expect((await billing.consume(id, d, chat(n))).allowed).toBe(true);
    }
    d = (await device(id)).device;
    expect((await billing.consume(id, d, chat(6))).allowed).toBe(false);
  });

  it('applies the same checkout only once (webhook and return page)', async () => {
    const { billing, device } = setup();
    const { id } = await device();
    await buy(billing, id, 'pack3', 'cs_test_same');
    await buy(billing, id, 'pack3', 'cs_test_same');
    expect((await billing.status(id, (await device(id)).device)).limit).toBe(5);
  });

  it('unlimited never blocks', async () => {
    const { billing, device } = setup();
    const { id } = await device();
    await buy(billing, id, 'unlimited');
    for (let n = 1; n <= 12; n++) {
      const d = (await device(id)).device;
      expect((await billing.consume(id, d, chat(n))).allowed).toBe(true);
    }
    expect(await billing.status(id, (await device(id)).device)).toMatchObject({
      unlimited: true,
      remaining: null,
    });
  });

  it('is restored on another device with the email and the recovery code', async () => {
    const { billing, device } = setup();
    const phone = await device(undefined, '83.45.12', sha('phone'));
    await buy(billing, phone.id, 'unlimited');

    const laptop = await device(undefined, '10.0.0', sha('laptop'));
    expect(
      await billing.restore(laptop.id, laptop.device, 'ana@example.com', 'wrong-code'),
    ).toBeNull();
    expect(
      await billing.restore(laptop.id, laptop.device, 'otra@example.com', 'ABCD-EFGH-JKLM'),
    ).toBeNull();
    const restored = await billing.restore(
      laptop.id,
      laptop.device,
      ' ANA@example.com ',
      'abcd efgh jklm',
    );
    expect(restored).toMatchObject({ outcome: 'restored', status: { unlimited: true } });
  });

  it('stores no email, chat or code in clear', async () => {
    const { billing, device, store } = setup();
    const { id, device: d } = await device();
    await billing.consume(id, d, chat(1));
    await buy(billing, id, 'pack3');
    const dump = JSON.stringify(
      await Promise.all([store.get(`dev:${id}`), store.get(`done:cs_test_pack3`)]),
    );
    expect(dump).not.toContain('example.com');
    expect(dump).not.toContain(chat(1));
    expect(dump).not.toContain('ABCD');
  });
});

describe('refunds and restore feedback', () => {
  const buyPack = (billing: ReturnType<typeof setup>['billing'], deviceId: string) =>
    billing.applyPurchase({
      checkoutId: 'cs_live_pack',
      deviceId,
      email: 'ana@example.com',
      product: 'pack3',
      recoveryCode: 'ABCD-EFGH-JKLM',
    });
  const refund = (
    billing: ReturnType<typeof setup>['billing'],
    state: 'active' | 'refund_pending' | 'refunded',
    checkoutId = 'cs_live_pack',
  ) => billing.setRefundState({ checkoutId, email: 'ana@example.com', product: 'pack3', state });

  it('a refund in progress or done takes the pack away; a failed one gives it back', async () => {
    const { billing, device } = setup();
    const { id } = await device();
    await buyPack(billing, id);
    expect((await billing.status(id, (await device(id)).device)).limit).toBe(5);

    await refund(billing, 'refund_pending');
    expect((await billing.status(id, (await device(id)).device)).limit).toBe(2);
    await refund(billing, 'refunded');
    expect((await billing.status(id, (await device(id)).device)).limit).toBe(2);
    await refund(billing, 'active');
    expect((await billing.status(id, (await device(id)).device)).limit).toBe(5);
  });

  it('tells whether the purchase was restored, already active, or refunded', async () => {
    const { billing, device } = setup();
    const phone = await device(undefined, '83.45.12', sha('phone'));
    await buyPack(billing, phone.id);

    const again = await device(phone.id);
    expect(
      (await billing.restore(phone.id, again.device, 'ana@example.com', 'ABCD-EFGH-JKLM'))?.outcome,
    ).toBe('already_active');

    const laptop = await device(undefined, '10.0.0', sha('laptop'));
    expect(
      (await billing.restore(laptop.id, laptop.device, 'ana@example.com', 'ABCD-EFGH-JKLM'))
        ?.outcome,
    ).toBe('restored');

    await refund(billing, 'refund_pending');
    const tablet = await device(undefined, '10.0.1', sha('tablet'));
    const pending = await billing.restore(
      tablet.id,
      tablet.device,
      'ana@example.com',
      'ABCDEFGHJKLM',
    );
    expect(pending?.outcome).toBe('refund_pending');
    expect(pending?.status.limit).toBe(2);

    await refund(billing, 'refunded');
    expect(
      (await billing.restore(tablet.id, tablet.device, 'ana@example.com', 'ABCD-EFGH-JKLM'))
        ?.outcome,
    ).toBe('refunded');
  });

  it('handles a refund of a purchase made before states were kept', async () => {
    const { billing, device, store } = setup();
    const { id } = await device();
    await buyPack(billing, id);
    // Strip the purchase list to look like a record from the previous version.
    const dev = await store.get<{ buyer: string }>('dev:' + id);
    const key = 'buyer:' + dev?.buyer;
    const buyer = await store.get<Record<string, unknown>>(key);
    // The previous version kept recovery codes in a plain list.
    if (buyer) buyer.codes = (buyer.purchases as { code: string }[]).map((p) => p.code);
    delete buyer?.purchases;
    await store.set(key, buyer);

    expect((await billing.status(id, (await device(id)).device)).limit).toBe(5);
    await refund(billing, 'refunded', 'cs_live_old');
    expect((await billing.status(id, (await device(id)).device)).limit).toBe(2);
    const other = await device(undefined, '10.0.2', sha('other'));
    expect(
      (await billing.restore(other.id, other.device, 'ana@example.com', 'ABCD-EFGH-JKLM'))?.outcome,
    ).toBe('refunded');
  });
});

describe('rate limit', () => {
  it('stops after the limit within the window', async () => {
    const { billing } = setup();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await billing.allow('restore', '1.2.3.4', 3, 60));
    expect(results).toEqual([true, true, true, false, false]);
  });
});
