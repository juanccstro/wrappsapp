import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createBilling } from '../../server/billing';
import { createMemoryStore } from '../../server/store';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const chat = (n: number) => sha(`chat ${n}`);

function setup() {
  const store = createMemoryStore();
  const billing = createBilling(store, 'test-secret');
  const device = (name: string, deviceId?: string) =>
    billing.resolveDevice({ deviceId, fingerprint: sha(name), network: `10.0.${name.length}` });
  return { billing, device };
}

describe('inviting friends', () => {
  it('two friends making their first Wrapped through the link unlock one chat', async () => {
    const { billing, device } = setup();
    const me = await device('my phone');
    const code = (await billing.status(me.id, me.device)).invite?.code;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    await billing.consume(me.id, me.device, chat(1));
    expect((await billing.consume(me.id, me.device, chat(2))).allowed).toBe(false);

    const ana = await device('ana phone');
    await billing.consume(ana.id, ana.device, chat(10), code);
    let mine = await device('my phone', me.id);
    expect((await billing.status(mine.id, mine.device)).invite).toMatchObject({
      friends: 1,
      progress: 1,
      earned: 0,
    });

    const beto = await device('beto phone');
    await billing.consume(beto.id, beto.device, chat(11), code);
    mine = await device('my phone', me.id);
    expect((await billing.status(mine.id, mine.device)).invite).toMatchObject({
      friends: 2,
      progress: 0,
      earned: 1,
    });
    expect((await billing.consume(mine.id, mine.device, chat(2))).allowed).toBe(true);
    expect((await billing.consume(mine.id, mine.device, chat(3))).allowed).toBe(false);
  });

  it('a friend counts once, only on their first Wrapped, and never yourself', async () => {
    const { billing, device } = setup();
    const me = await device('my phone');
    const code = (await billing.status(me.id, me.device)).invite?.code;

    // Using your own link does nothing.
    await billing.consume(me.id, me.device, chat(1), code);
    // The same friend again, or a friend who had already made a Wrapped, does not count.
    const ana = await device('ana phone');
    await billing.consume(ana.id, ana.device, chat(10), code);
    await billing.consume(ana.id, ana.device, chat(11), code);
    const old = await device('old user');
    await billing.consume(old.id, old.device, chat(20));
    await billing.consume(old.id, old.device, chat(21), code);

    const mine = await device('my phone', me.id);
    expect((await billing.status(mine.id, mine.device)).invite).toMatchObject({
      friends: 1,
      earned: 0,
    });
  });

  it('ignores unknown codes', async () => {
    const { billing, device } = setup();
    const ana = await device('ana phone');
    expect((await billing.consume(ana.id, ana.device, chat(1), 'ABCDEFGH')).allowed).toBe(true);
  });
});
