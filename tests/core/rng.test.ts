import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core';

const take = (next: () => number, n: number) => Array.from({ length: n }, next);

describe('seeded rng', () => {
  it('repeats exactly for the same seed and scope', () => {
    expect(take(createRng('abc').next, 20)).toEqual(take(createRng('abc').next, 20));
    expect(take(createRng('abc').scope('palette').next, 5)).toEqual(
      take(createRng('abc').scope('palette').next, 5),
    );
  });

  it('changes with the seed and with the scope', () => {
    const base = take(createRng('abc').next, 5);
    expect(take(createRng('abd').next, 5)).not.toEqual(base);
    expect(take(createRng('abc').scope('music').next, 5)).not.toEqual(base);
    expect(take(createRng('abc').scope('music').next, 5)).not.toEqual(
      take(createRng('abc').scope('palette').next, 5),
    );
  });

  it('keeps scopes independent: using one never shifts another', () => {
    const quiet = createRng('seed');
    const busy = createRng('seed');
    take(busy.next, 100);
    take(busy.scope('slide:intro:title').next, 50);
    expect(take(busy.scope('person:2:archetype').next, 5)).toEqual(
      take(quiet.scope('person:2:archetype').next, 5),
    );
  });

  it('stays in range and is roughly uniform', () => {
    const rng = createRng('uniform');
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 20_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const bucket = Math.floor(v * 10);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) expect(Math.abs(count - 2000)).toBeLessThan(250);
  });

  it('picks, shuffles and weighs deterministically', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const shuffled = createRng('s').shuffle(items);
    expect(shuffled).toEqual(createRng('s').shuffle(items));
    expect(shuffled.slice().sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(items).toContain(createRng('s').pick(items));
    expect(createRng('s').weighted(items, (i) => (i === 'c' ? 1 : 0))).toBe('c');
    expect(createRng('s').int(1)).toBe(0);
    expect(() => createRng('s').pick([])).toThrow();
  });
});
