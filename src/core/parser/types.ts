export type MediaType =
  'image' | 'audio' | 'video' | 'sticker' | 'gif' | 'document' | 'media_unknown';

export type MessageKind =
  'text' | 'media' | 'deleted' | 'poll' | 'location' | 'contact' | 'call' | 'system';

export type SystemEvent =
  | 'encryption_notice'
  | 'group_created'
  | 'subject_change'
  | 'icon_change'
  | 'description_change'
  | 'member_added'
  | 'member_left'
  | 'member_removed'
  | 'other';

export type Locale = 'es' | 'en' | 'unknown';
export type Platform = 'android' | 'ios' | 'unknown';
export type DateOrder = 'dmy' | 'mdy';

export type Message = {
  /** Epoch ms of the wall-clock time, computed as if it were UTC (no time zone conversion). */
  ts: number;
  /** "2026-11-12T17:03": truncated to the minute, base of the determinism. */
  minuteKey: string;
  /** Index by order of first appearance (0, 1, 2…). -1 for messages without an author. */
  senderIdx: number;
  /** Normalized text. Empty for omitted media; the caption if the media has one. */
  text: string;
  kind: MessageKind;
  mediaType?: MediaType;
  edited: boolean;
  /** Only for kind === 'system'. */
  systemEvent?: SystemEvent;
};

export type Participant = { idx: number; displayName: string };

export type ParsedChat = {
  participants: Participant[];
  messages: Message[];
  meta: { platform: Platform; locale: Locale; isGroup: boolean; dateOrder: DateOrder };
};

export type ChatParseErrorCode = 'empty' | 'not_a_chat' | 'no_messages';

/** Thrown when the file is not a usable chat export. The UI maps `code` to a friendly text. */
export class ChatParseError extends Error {
  readonly code: ChatParseErrorCode;

  constructor(code: ChatParseErrorCode) {
    super(`Chat parse error: ${code}`);
    this.name = 'ChatParseError';
    this.code = code;
  }
}
