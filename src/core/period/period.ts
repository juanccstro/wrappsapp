import type { Message, ParsedChat } from '../parser';

export type PeriodKind = 'year' | 'last12' | 'all';

export type Period = {
  kind: PeriodKind;
  /** Stable id that goes into the seed: "year:2026", "last12", "all". */
  key: string;
  /** Bounds compared as strings against `minuteKey`: from <= minuteKey <= to. */
  from: string;
  to: string;
  /** Only for kind === 'year'. */
  year?: number;
};

/** Below this, "this year" is not offered as the default. */
export const MIN_MESSAGES_FOR_YEAR = 200;

const isAuthored = (m: Message) => m.senderIdx >= 0;

function lastAuthored(chat: ParsedChat): Message | undefined {
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i];
    if (m && isAuthored(m)) return m;
  }
  return undefined;
}

/**
 * Periods are anchored to the LAST MESSAGE of the chat, never to today's date: "this year" is
 * the year of the last message and "last 12 months" ends on its day. That keeps the result
 * identical no matter when the Wrapped is generated.
 */
export function resolvePeriod(chat: ParsedChat, kind: PeriodKind): Period {
  const last = lastAuthored(chat);
  if (kind === 'all' || !last) return { kind: 'all', key: 'all', from: '', to: '9999' };

  const year = Number(last.minuteKey.slice(0, 4));
  if (kind === 'year') {
    return {
      kind,
      key: `year:${year}`,
      from: `${year}-01-01T00:00`,
      to: `${year}-12-31T23:59`,
      year,
    };
  }
  // Days strictly after the same date one year earlier. "T99" sorts after every minute of
  // that day, so the day itself is excluded.
  const monthDay = last.minuteKey.slice(4, 10);
  return { kind, key: 'last12', from: `${year - 1}${monthDay}T99`, to: last.minuteKey };
}

const inPeriod = (m: Message, p: Period) => m.minuteKey >= p.from && m.minuteKey <= p.to;

export function countAuthoredIn(chat: ParsedChat, period: Period): number {
  let n = 0;
  for (const m of chat.messages) if (isAuthored(m) && inPeriod(m, period)) n++;
  return n;
}

export type PeriodOption = { period: Period; messages: number };

export function listPeriods(chat: ParsedChat): PeriodOption[] {
  return (['year', 'last12', 'all'] as const).map((kind) => {
    const period = resolvePeriod(chat, kind);
    return { period, messages: countAuthoredIn(chat, period) };
  });
}

export function defaultPeriodKind(chat: ParsedChat): PeriodKind {
  const year = resolvePeriod(chat, 'year');
  return countAuthoredIn(chat, year) >= MIN_MESSAGES_FOR_YEAR ? 'year' : 'all';
}

/**
 * The chat restricted to a period, with participants re-indexed by order of first appearance
 * INSIDE the period. A Wrapped of a finished year is therefore the same whether the export
 * was made in January or in June, or by someone whose export starts earlier.
 */
export function sliceChat(chat: ParsedChat, period: Period): ParsedChat {
  const newIdx = new Map<number, number>();
  const participants: ParsedChat['participants'] = [];
  const messages: Message[] = [];

  for (const m of chat.messages) {
    if (!inPeriod(m, period)) continue;
    if (!isAuthored(m)) {
      messages.push(m);
      continue;
    }
    let idx = newIdx.get(m.senderIdx);
    if (idx === undefined) {
      idx = participants.length;
      newIdx.set(m.senderIdx, idx);
      participants.push({
        idx,
        displayName: chat.participants[m.senderIdx]?.displayName ?? '',
      });
    }
    messages.push(idx === m.senderIdx ? m : { ...m, senderIdx: idx });
  }

  return { participants, messages, meta: chat.meta };
}
