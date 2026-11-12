import type { Counted } from '../analytics';

/**
 * Words that are somebody's name ("juan", "marta"…), taken from the participants. Names said
 * in the chat are not interesting as "your most used words": everybody knows who is in the
 * group, and a name at the top looks like the app counted the author of each message.
 *
 * This is applied when choosing what to show, not in the analytics: contact names depend on
 * who exported the chat, and the statistics must not.
 */
export function nameWords(names: readonly string[]): Set<string> {
  const words = new Set<string>();
  for (const name of names) {
    for (const word of name.toLowerCase().match(/\p{L}+/gu) ?? []) {
      if (word.length >= 3) words.add(word);
    }
  }
  return words;
}

/** Drops entries that are a name or (for pairs of words) contain one. */
export function withoutNames<T extends Counted>(items: readonly T[], names: Set<string>): T[] {
  if (names.size === 0) return items.slice();
  return items.filter((item) => !item.key.split(' ').some((word) => names.has(word)));
}
