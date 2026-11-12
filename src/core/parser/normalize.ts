// Bidi marks, zero-width space, word joiner and BOM. ZWJ/ZWNJ (U+200C/U+200D) are kept:
// they are part of emoji sequences.
const INVISIBLE_RE = /[\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
// NBSP, narrow NBSP (used before AM/PM), thin spaces, etc.
const ODD_SPACE_RE = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

/** Removes invisible characters and turns exotic spaces into regular ones. */
export function stripInvisible(input: string): string {
  return input.replace(INVISIBLE_RE, '').replace(ODD_SPACE_RE, ' ');
}

// "@⁨Name⁩": a mention, wrapped in the isolate marks U+2068 … U+2069.
const MENTION_RE = new RegExp(
  '@' +
    String.fromCodePoint(0x2068) +
    '[^' +
    String.fromCodePoint(0x2069) +
    '\\n]{1,80}' +
    String.fromCodePoint(0x2069),
  'g',
);
/** What a mention becomes: no letters, so it is never counted as a word. */
export const MENTION_TOKEN = '@~';

/** Invisible characters out, Unicode NFC, trimmed. Line breaks are preserved. */
export function normalizeText(input: string): string {
  const text = input.indexOf('@') === -1 ? input : input.replace(MENTION_RE, MENTION_TOKEN);
  return stripInvisible(text).normalize('NFC').trim();
}

/** True if the raw text starts with a left-to-right / right-to-left mark. */
export function startsWithDirectionMark(raw: string): boolean {
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c === 0x200e || c === 0x200f) return true;
    if (c !== 0x20 && c !== 0xfeff) return false;
  }
  return false;
}
