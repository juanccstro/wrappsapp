import type { ParsedChat } from '../parser';

const QUOTED_AT_END_RE = /["“«]([^"”»]+)["”»]\s*$/;

const FILE_NAME_PATTERNS = [
  /^Chat de WhatsApp con (.+)$/i,
  /^WhatsApp Chat with (.+)$/i,
  /^(?:Chat de WhatsApp|WhatsApp Chat) - (.+)$/i,
];

/** Name of the group taken from the last "created group" / "changed the subject" notice. */
export function chatNameFromSystem(chat: ParsedChat): string | null {
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i];
    if (!m || m.kind !== 'system') continue;
    if (m.systemEvent !== 'subject_change' && m.systemEvent !== 'group_created') continue;
    const match = QUOTED_AT_END_RE.exec(m.text);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

/** "Chat de WhatsApp con Los del Insti.txt" → "Los del Insti". */
export function chatNameFromFileName(fileName: string): string | null {
  const base = fileName.replace(/\.(txt|zip)$/i, '').trim();
  for (const pattern of FILE_NAME_PATTERNS) {
    const match = pattern.exec(base);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

/** Display only: the name never takes part in the seed. */
export function detectChatName(chat: ParsedChat, fileName?: string): string | null {
  return chatNameFromSystem(chat) ?? (fileName ? chatNameFromFileName(fileName) : null);
}
