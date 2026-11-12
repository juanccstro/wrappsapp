// Links as people write them: with the scheme or starting with www.
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;
const WORD_RE = /[\p{L}\p{N}]+/gu;

/** Number of links and the text without them (so URL fragments do not count as words). */
export function splitLinks(text: string): { links: number; rest: string } {
  if (text.indexOf('http') === -1 && text.indexOf('www.') === -1) return { links: 0, rest: text };
  let links = 0;
  const rest = text.replace(URL_RE, () => {
    links++;
    return ' ';
  });
  return { links, rest };
}

/** Words in their original case. */
export function tokenize(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

// Built from code points so the source has no invisible characters.
const ZWJ = String.fromCodePoint(0x200d);
const VS16 = String.fromCodePoint(0xfe0f);
const PICTO = String.raw`\p{Extended_Pictographic}`;
const MODIFIER = String.raw`\p{Emoji_Modifier}`;
const FLAG = String.raw`\p{Regional_Indicator}{2}`;
const ONE = `${PICTO}(?:${VS16}|${MODIFIER})*`;
const EMOJI_RE = new RegExp(`${FLAG}|${ONE}(?:${ZWJ}${ONE})*`, 'gu');
const MODIFIER_RE = new RegExp(MODIFIER, 'gu');

/**
 * Emojis of a text, in order. Skin tones are removed so that every variant of the same
 * emoji counts together.
 */
export function extractEmojis(text: string): string[] {
  // Fast exit for the vast majority of messages: no character outside the basic ranges.
  let candidate = false;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) >= 0x203c) {
      candidate = true;
      break;
    }
  }
  if (!candidate) return [];
  const found = text.match(EMOJI_RE);
  if (!found) return [];
  return found.map((e) => e.replace(MODIFIER_RE, ''));
}

/** Emojis that count as laughter in the "jajómetro". */
export const LAUGH_EMOJIS: ReadonlySet<string> = new Set(['😂', '🤣', '💀', '😆', '😹']);

export type LaughFamily = 'ja' | 'ha' | 'je' | 'he' | 'ji' | 'js' | 'xd' | 'lol';

function countChar(s: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) n++;
  return n;
}

/** Which kind of written laugh a lower-case word is, or null if it is not one. */
export function laughFamily(word: string): LaughFamily | null {
  const len = word.length;
  if (len < 2 || len > 200) return null;
  const c0 = word.charCodeAt(0);
  // Fast exit: laughs start with a, e, h, i, j, k, l, s or x.
  if (
    c0 !== 106 &&
    c0 !== 104 &&
    c0 !== 97 &&
    c0 !== 120 &&
    c0 !== 108 &&
    c0 !== 101 &&
    c0 !== 105 &&
    c0 !== 107 &&
    c0 !== 115
  ) {
    return null;
  }

  if (len >= 4) {
    if (/^[jha]+$/.test(word) && countChar(word, 'a') >= 2) {
      const j = countChar(word, 'j');
      const h = countChar(word, 'h');
      if (j >= 2 && j >= h) return 'ja';
      if (h >= 2) return 'ha';
    }
    if (/^[jhe]+$/.test(word) && countChar(word, 'e') >= 2) {
      const j = countChar(word, 'j');
      const h = countChar(word, 'h');
      if (j >= 2 && j >= h) return 'je';
      if (h >= 2) return 'he';
    }
    if (/^[ji]+$/.test(word) && countChar(word, 'j') >= 2 && countChar(word, 'i') >= 2) return 'ji';
    // "jsjsjs", also mixed with a's when typed in a hurry ("jajsjsja").
    if (/^[jska]+$/.test(word) && countChar(word, 'j') >= 2 && countChar(word, 's') >= 1)
      return 'js';
  }
  if (/^x+d+$/.test(word)) return 'xd';
  if (/^lo+l+$/.test(word) || /^lmf?ao+$/.test(word)) return 'lol';
  return null;
}

const LAUGH_LABEL: Record<LaughFamily, string> = {
  ja: 'jajaja',
  ha: 'hahaha',
  je: 'jejeje',
  he: 'hehehe',
  ji: 'jijiji',
  js: 'jsjsjs',
  xd: 'xD',
  lol: 'lol',
};

/** How a laugh is shown: "jajaja" vs "JAJAJA" vs "jsjsjs". */
export function laughLabel(family: LaughFamily, original: string): string {
  const label = LAUGH_LABEL[family];
  if (family === 'xd') return label;
  return original === original.toUpperCase() ? label.toUpperCase() : label;
}

/** True if a text kind message is written in capitals (at least 5 letters, none lower-case). */
export function isShout(text: string): boolean {
  // Fast exit: any plain lower-case letter rules it out.
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 97 && c <= 122) return false;
  }
  if (text === text.toLowerCase()) return false;
  if (text !== text.toUpperCase()) return false;
  const letters = text.match(/\p{Lu}/gu);
  return letters !== null && letters.length >= 5;
}
