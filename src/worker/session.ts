import {
  analyzeChat,
  buildWrapped,
  ChatParseError,
  computeSeed,
  createChatParser,
  defaultPeriodKind,
  detectChatName,
  listPeriods,
  resolvePeriod,
  sliceChat,
  type Analytics,
  type ParsedChat,
  type Participant,
  type Period,
  type PeriodKind,
  type PeriodOption,
  type WrappedResult,
} from '../core';
import { SessionError } from './errors';

export type ChatSummary = {
  participants: Participant[];
  meta: ParsedChat['meta'];
  periods: PeriodOption[];
  defaultPeriod: PeriodKind;
  /**
   * SHA-256 of the whole chat in canonical form (no names, no period). Identifies "this chat"
   * for the free-use limit without revealing anything about its content.
   */
  chatKey: string;
};

export type AnalysisResult = {
  /** SHA-256 hex of the canonical chat + period: the source of every random decision. */
  seed: string;
  period: Period;
  /** Participants of the period, in the order the analytics indexes them. */
  participants: Participant[];
  isGroup: boolean;
  analytics: Analytics;
  /** Slides, texts and theme: what the UI plays. */
  wrapped: WrappedResult;
};

export { SessionError, type SessionErrorCode } from './errors';

/**
 * Holds the parsed chat in memory (and only in memory) and runs the core on it. No DOM and no
 * Worker APIs here, so it can be tested directly; the Worker is a thin wrapper around it.
 */
export function createSession() {
  let chat: ParsedChat | null = null;
  let chatName: string | null = null;
  /** The text as read, kept only so the page can hold on to it across a payment. */
  let text: string[] = [];

  const summarize = async (parsed: ParsedChat): Promise<ChatSummary> => ({
    participants: parsed.participants,
    meta: parsed.meta,
    periods: listPeriods(parsed),
    defaultPeriod: defaultPeriodKind(parsed),
    chatKey: await computeSeed(parsed, 'billing:chat'),
  });

  return {
    /** Parses a chat that arrives in blocks (e.g. from a file stream). */
    async load(
      chunks: AsyncIterable<string> | Iterable<string>,
      fileName?: string,
    ): Promise<ChatSummary> {
      chat = null;
      chatName = null;
      text = [];
      const parser = createChatParser();
      try {
        for await (const chunk of chunks) {
          text.push(chunk);
          parser.push(chunk);
        }
        chat = parser.finish();
        chatName = detectChatName(chat, fileName);
      } catch (err) {
        if (err instanceof SessionError) throw err;
        throw new SessionError(err instanceof ChatParseError ? err.code : 'unexpected');
      }
      return summarize(chat);
    },

    async analyze(kind: PeriodKind): Promise<AnalysisResult> {
      if (!chat) throw new SessionError('no_chat_loaded');
      const period = resolvePeriod(chat, kind);
      const sliced = sliceChat(chat, period);
      const seed = await computeSeed(sliced, period.key);
      const analytics = analyzeChat(sliced);
      const participants = sliced.participants;
      const isGroup = sliced.meta.isGroup;
      return {
        seed,
        period,
        participants,
        isGroup,
        analytics,
        wrapped: buildWrapped({ seed, period, participants, isGroup, analytics, chatName }),
      };
    },

    /** The loaded chat as text (to carry it across the payment page, on this device). */
    text(): string {
      if (!chat) throw new SessionError('no_chat_loaded');
      return text.join('');
    },

    /** "Borrar y salir": forgets the chat. */
    clear(): void {
      chat = null;
      chatName = null;
      text = [];
    },
  };
}

export type Session = ReturnType<typeof createSession>;
