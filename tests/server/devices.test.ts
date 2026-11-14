import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createBilling } from '../../server/billing';
import { createMemoryStore } from '../../server/store';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const chat = (n: number) => sha(`chat ${n}`);

// The same phone: one cross-browser trait set, a different browser trace per browser.
const PHONE = sha('ios 1170x2532 Europe/Madrid touch');
const BRAVE = sha('brave canvas A');
const BRAVE_AFTER_SHRED = sha('brave canvas B (randomised again)');
const CHROME = sha('chrome canvas');
const HOME = '83.45.12';

function setup() {
  const billing = createBilling(createMemoryStore(), 'test-secret');
  const visit = (opts: {
    deviceId?: string;
    fingerprint: string;
    cross?: string;
    network?: string;
  }) =>
    billing.resolveDevice({
      deviceId: opts.deviceId,
      fingerprint: opts.fingerprint,
      crossFingerprint: opts.cross ?? PHONE,
      network: opts.network ?? HOME,
    });
  return { billing, visit };
}

const useTwo = async (
  billing: ReturnType<typeof setup>['billing'],
  id: string,
  d: { used: string[] },
) => {
  await billing.consume(id, d as never, chat(1));
  await billing.consume(id, d as never, chat(2));
};

describe('recognising a device across browsers', () => {
  it('Brave after "shred site data": no storage and a new trace, same device', async () => {
    const { billing, visit } = setup();
    const first = await visit({ fingerprint: BRAVE });
    await useTwo(billing, first.id, first.device);

    const after = await visit({ fingerprint: BRAVE_AFTER_SHRED });
    expect(after.id).toBe(first.id);
    expect(await billing.status(after.id, after.device)).toMatchObject({ used: 1, remaining: 0 });
  });

  it('another browser on the same phone sees the same uses', async () => {
    const { billing, visit } = setup();
    const brave = await visit({ fingerprint: BRAVE });
    await billing.consume(brave.id, brave.device, chat(1));

    const chrome = await visit({ fingerprint: CHROME });
    expect(chrome.id).toBe(brave.id);
    expect((await billing.status(chrome.id, chrome.device)).used).toBe(1);
  });

  it('merges two browsers that already had their own id', async () => {
    const { billing, visit } = setup();
    // Before cross-browser recognition: each browser got its own device.
    const brave = await visit({ fingerprint: BRAVE });
    await billing.consume(brave.id, brave.device, chat(1));
    const chrome = await visit({ fingerprint: CHROME, cross: sha('no cross trace yet') });
    await billing.consume(chrome.id, chrome.device, chat(2));
    expect(chrome.id).not.toBe(brave.id);

    // Chrome comes back with its id and now the cross-browser trace: merged into Brave's.
    const merged = await visit({ deviceId: chrome.id, fingerprint: CHROME });
    expect(merged.id).toBe(brave.id);
    // Both chats stay unlocked on the merged device.
    expect(merged.device.used).toHaveLength(2);

    // The old Chrome id keeps pointing to the merged device.
    const again = await visit({ deviceId: chrome.id, fingerprint: CHROME });
    expect(again.id).toBe(brave.id);
  });

  it('two different phones on the same Wi-Fi stay apart', async () => {
    const { billing, visit } = setup();
    const mine = await visit({ fingerprint: BRAVE });
    await useTwo(billing, mine.id, mine.device);
    const other = await visit({
      fingerprint: sha('android chrome'),
      cross: sha('android 1080x2400'),
    });
    expect(other.id).not.toBe(mine.id);
    expect((await billing.status(other.id, other.device)).remaining).toBe(1);
  });
});
