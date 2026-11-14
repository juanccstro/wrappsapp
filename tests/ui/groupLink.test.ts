import { describe, expect, it } from 'vitest';
import { decodeShared, encodeShared, type SharedWrapped } from '../../src/ui/share/groupLink';

const shared: SharedWrapped = {
  v: 1,
  chatName: 'Los del Insti 🍕',
  period: 'Toda vuestra historia',
  palette: 3,
  background: 'stars',
  vibe: 'Fábrica de jajajas',
  podium: [
    { idx: 0, name: 'Nico', messages: 1200 },
    { idx: 1, name: 'Vera', messages: 900 },
  ],
  people: [
    { idx: 0, name: 'Nico' },
    { idx: 1, name: 'Vera' },
  ],
  cards: [
    {
      idx: 0,
      name: 'Nico',
      label: 'Búho nocturno',
      title: 'Leyenda de la madrugada',
      phrase: 'Si son las 3:00, Nico está escribiendo.',
      stats: [{ label: 'Mensajes', value: '1.200' }],
    },
  ],
  hd: true,
};

describe('group link', () => {
  it('round-trips through the part of the address after #', async () => {
    const hash = await encodeShared(shared);
    expect(hash.startsWith('#w=z')).toBe(true);
    expect(hash).not.toContain('Nico'); // compressed, not readable at a glance
    expect(await decodeShared(hash)).toEqual(shared);
  });

  it('keeps cards out while the chat is locked', async () => {
    const locked = { ...shared, cards: null, hd: false };
    expect(await decodeShared(await encodeShared(locked))).toEqual(locked);
  });

  it('rejects broken or tampered links', async () => {
    expect(await decodeShared('#w=zAAAA')).toBeNull();
    expect(await decodeShared('#something')).toBeNull();
    const bad = { ...shared, palette: 999 } as SharedWrapped;
    expect(await decodeShared(await encodeShared(bad))).toBeNull();
    const html = { ...shared, people: [{ idx: 0, name: 'x'.repeat(500) }] } as SharedWrapped;
    expect(await decodeShared(await encodeShared(html))).toBeNull();
  });
});
