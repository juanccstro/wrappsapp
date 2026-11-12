import type { Message, ParsedChat } from '../parser';

/** Bump when the canonical form changes: every seed changes with it. */
export const CANONICAL_VERSION = 'wrappsapp:v1';

/**
 * Text of a message in a form that does not depend on the platform, the phone language or
 * who exported the chat.
 *
 * Media is a bare `<MEDIA>`: Android exports without files do not say whether it was a photo,
 * an audio or a sticker, so including the type would give Android and iOS different seeds.
 * Captions, poll options and locations are left out for the same reason (their wording
 * changes with the language or the export mode).
 */
export function canonicalText(m: Message): string {
  switch (m.kind) {
    case 'text': {
      const text = m.text.normalize('NFC').replace(/\s+/g, ' ').trim();
      return m.edited ? `${text} <EDITED>` : text;
    }
    case 'media':
      return '<MEDIA>';
    case 'deleted':
      return '<DELETED>';
    case 'poll':
      return '<POLL>';
    case 'location':
      return '<LOCATION>';
    case 'contact':
      return '<CONTACT>';
    case 'call':
      return '<CALL>';
    case 'system':
      return '<SYSTEM>';
  }
}

/**
 * One line per authored message: minuteKey, senderIdx, canonical text. System notices and
 * anything without an author are excluded: they depend on the language and on who exports.
 */
export function canonicalForm(chat: ParsedChat): string {
  const lines: string[] = [];
  for (const m of chat.messages) {
    if (m.senderIdx < 0 || m.kind === 'system') continue;
    lines.push(`${m.minuteKey}\t${m.senderIdx}\t${canonicalText(m)}`);
  }
  return lines.join('\n');
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/**
 * Seed of a Wrapped: SHA-256 of the canonical form of the chat (already sliced to the
 * period) plus the period key. 64 hex characters.
 */
export async function computeSeed(chat: ParsedChat, periodKey: string): Promise<string> {
  const input = `${CANONICAL_VERSION}\n${periodKey}\n${canonicalForm(chat)}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}
