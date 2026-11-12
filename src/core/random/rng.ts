/**
 * Seeded randomness. Every decision of the Wrapped asks for its own scope
 * (`rng.scope('slide:intro:title')`), whose stream depends only on the seed and the scope
 * name. Adding a new slide or decision never changes the others.
 *
 * Sub-seeds use a synchronous 128-bit string hash (cyrb128) instead of SHA-256: Web Crypto is
 * async, and one await per decision would make every template function async for no gain.
 * The SHA-256 seed already carries all the entropy of the chat.
 */

/** 128-bit non-cryptographic string hash. */
function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  return [h1 >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/** sfc32: small, fast, passes PractRand. Returns floats in [0, 1). */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export type Rng = {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** Picks by weight (weights >= 0, at least one > 0). */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** New shuffled array (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  chance(probability: number): boolean;
  /** Independent stream for a named decision. Does not consume from this one. */
  scope(name: string): Rng;
};

export function createRng(seed: string, scope = 'root'): Rng {
  const [a, b, c, d] = cyrb128(`${seed}:${scope}`);
  const next = sfc32(a, b, c, d);
  for (let i = 0; i < 15; i++) next(); // warm-up

  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive);

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error(`rng.pick on an empty list (scope "${scope}")`);
      return items[int(items.length)] as T;
    },
    weighted<T>(items: readonly T[], weight: (item: T) => number): T {
      let total = 0;
      for (const item of items) total += Math.max(0, weight(item));
      if (total <= 0) throw new Error(`rng.weighted without positive weights (scope "${scope}")`);
      let target = next() * total;
      for (const item of items) {
        target -= Math.max(0, weight(item));
        if (target < 0) return item;
      }
      return items[items.length - 1] as T;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
    chance: (probability: number) => next() < probability,
    scope: (name: string) => createRng(seed, name),
  };
}
