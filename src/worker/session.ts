import {
  analyzeChat,
  ChatParseError,
  computeSeed,
  createChatParser,
  defaultPeriodKind,
  listPeriods,
  resolvePeriod,
  sliceChat,
  type Analytics,
  type ChatParseErrorCode,
  type ParsedChat,
  type Participant,
  type Period,
  type PeriodKind,
  type PeriodOption,
} from '../core';

export type ChatSummary = {
  participants: Participant[];
  meta: ParsedChat['meta'];
  periods: PeriodOption[];
  defaultPeriod: PeriodKind;
};

export type AnalysisResult = {
  /** SHA-256 hex of the canonical chat + period: the source of every random decision. */
  seed: string;
  period: Period;
  /** Participants of the period, in the order the analytics indexes them. */
  participants: Participant[];
  isGroup: boolean;
  analytics: Analytics;
};

export type SessionErrorCode = ChatParseErrorCode | 'no_chat_loaded' | 'unexpected';

export class SessionError extends Error {
  readonly code: SessionErrorCode;

  constructor(code: SessionErrorCode) {
    super(`Session error: ${code}`);
    this.name = 'SessionError';
    this.code = code;
  }
}

/**
 * Holds the parsed chat in memory (and only in memory) and runs the core on it. No DOM and no
 * Worker APIs here, so it can be tested directly; the Worker is a thin wrapper around it.
 */
export function createSession() {
  let chat: ParsedChat | null = null;

  const summarize = (parsed: ParsedChat): ChatSummary => ({
    participants: parsed.participants,
    meta: parsed.meta,
    periods: listPeriods(parsed),
    defaultPeriod: defaultPeriodKind(parsed),
  });

  return {
    /** Parses a chat that arrives in blocks (e.g. from a file stream). */
    async load(chunks: AsyncIterable<string> | Iterable<string>): Promise<ChatSummary> {
      chat = null;
      const parser = createChatParser();
      try {
        for await (const chunk of chunks) parser.push(chunk);
        chat = parser.finish();
      } catch (err) {
        throw new SessionError(err instanceof ChatParseError ? err.code : 'unexpected');
      }
      return summarize(chat);
    },

    async analyze(kind: PeriodKind): Promise<AnalysisResult> {
      if (!chat) throw new SessionError('no_chat_loaded');
      const period = resolvePeriod(chat, kind);
      const sliced = sliceChat(chat, period);
      const seed = await computeSeed(sliced, period.key);
      return {
        seed,
        period,
        participants: sliced.participants,
        isGroup: sliced.meta.isGroup,
        analytics: analyzeChat(sliced),
      };
    },

    /** "Borrar y salir": forgets the chat. */
    clear(): void {
      chat = null;
    },
  };
}

export type Session = ReturnType<typeof createSession>;
