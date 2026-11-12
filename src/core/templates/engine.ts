import type { Rng } from '../random/rng';
import { formatNumber } from './es/format';

export type SlotValue = string | number | null | undefined;
export type Slots = Record<string, SlotValue>;

/**
 * A text with slots, optionally with a condition on the data:
 *
 *   "{name} mandó {audios|num} {audios|plural:audio,audios}"
 *   { text: "…", when: (s) => num(s.audios) > 50 }
 *
 * Filters: `num` (1.234), `plural:one,many`, `cap`, `upper`, `lower`.
 * A variant whose slots are missing (null/undefined) is simply not eligible.
 */
export type Variant = string | { text: string; when?: (slots: Slots) => boolean };

export type Pool<K extends string = string> = {
  /** Every slot the texts of this pool may use (besides the common ones). */
  slots: readonly K[];
  titles: readonly Variant[];
  bodies: readonly Variant[];
};

export const definePool = <const K extends string>(pool: Pool<K>): Pool<K> => pool;

/** Reads a slot as a number inside a `when` condition. */
export const num = (value: SlotValue): number =>
  typeof value === 'number' ? value : Number(value);

const TOKEN_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)((?:\|[^{}|]+)*)\}/g;

const textOf = (variant: Variant) => (typeof variant === 'string' ? variant : variant.text);

/** Names of the slots a template uses. */
export function slotsOf(variant: Variant): string[] {
  const names = new Set<string>();
  for (const match of textOf(variant).matchAll(TOKEN_RE)) names.add(match[1] as string);
  return Array.from(names);
}

function applyFilter(value: string | number, filter: string, template: string): string | number {
  const colon = filter.indexOf(':');
  const name = colon === -1 ? filter : filter.slice(0, colon);
  const arg = colon === -1 ? '' : filter.slice(colon + 1);
  switch (name) {
    case 'num':
      return formatNumber(Number(value));
    case 'plural': {
      const [one, many] = arg.split(',');
      if (one === undefined || many === undefined) {
        throw new Error(`plural needs "one,many" in template: ${template}`);
      }
      return Number(value) === 1 ? one : many;
    }
    case 'cap': {
      const s = String(value);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case 'upper':
      return String(value).toUpperCase();
    case 'lower':
      return String(value).toLowerCase();
    default:
      throw new Error(`Unknown filter "${name}" in template: ${template}`);
  }
}

/** Spanish contractions produced by joining pieces: "de el" → "del", "a el" → "al". */
const contract = (text: string) =>
  text.replace(/(?<!\p{L})(de|a) el(?!\p{L})/gu, (_m, prep: string) =>
    prep === 'de' ? 'del' : 'al',
  );

/** Fills a template. Throws if a slot is missing: templates must never print "undefined". */
export function render(variant: Variant, slots: Slots): string {
  const template = textOf(variant);
  const out = template.replace(TOKEN_RE, (_match, name: string, filters: string) => {
    let value = slots[name];
    if (value === null || value === undefined) {
      throw new Error(`Missing slot "${name}" for template: ${template}`);
    }
    if (filters) {
      for (const filter of filters.slice(1).split('|'))
        value = applyFilter(value, filter, template);
    }
    return String(value);
  });
  return contract(out);
}

export function isEligible(variant: Variant, slots: Slots): boolean {
  for (const name of slotsOf(variant)) {
    const value = slots[name];
    if (value === null || value === undefined) return false;
  }
  return typeof variant === 'string' || !variant.when || variant.when(slots);
}

/** Picks one eligible variant with the given random stream and renders it. */
export function pickText(rng: Rng, variants: readonly Variant[], slots: Slots): string {
  const eligible = variants.filter((v) => isEligible(v, slots));
  if (eligible.length === 0) {
    throw new Error(`No eligible variant among: ${variants.map(textOf).join(' | ')}`);
  }
  return render(rng.pick(eligible), slots);
}
