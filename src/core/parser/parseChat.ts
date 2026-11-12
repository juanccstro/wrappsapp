import { classifyBody, classifySystem, looksLikeSystemSender, type Lang } from './classify';
import { normalizeText, startsWithDirectionMark } from './normalize';
import {
  ChatParseError,
  type DateOrder,
  type Locale,
  type Message,
  type ParsedChat,
  type Participant,
  type Platform,
} from './types';

/** A line that starts a message, before the date order (dd/mm vs mm/dd) is known. */
type RawEntry = {
  /** First, second and third numeric fields of the date, as written. */
  a: number;
  b: number;
  c: number;
  yearFirst: boolean;
  hour: number; // already converted to 24 h
  minute: number;
  second: number;
  ios: boolean;
  /** 0 = 24 h clock, 1 = "PM", 2 = "p. m." */
  meridiemStyle: 0 | 1 | 2;
  /** Everything after the timestamp; continuation lines are appended with "\n". */
  rest: string;
};

const MARKS = '[\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]*';
const SP = '[ \\u00a0\\u202f\\u2009]';

// Groups: 1 "[" · 2,4,5 date fields · 3 date separator · 6 hour · 7 minute · 8 second
// · 9 meridiem (a/p + optional dots) · 10 "]" · 11 rest
const HEADER_RE = new RegExp(
  '^' +
    MARKS +
    '(\\[)?' +
    MARKS +
    '(\\d{1,4})([./-])(\\d{1,2})\\3(\\d{2,4}),?' +
    SP +
    '+(\\d{1,2})[:.](\\d{2})(?:[:.](\\d{2}))?' +
    '(?:' +
    SP +
    '*([AaPp]\\.?' +
    SP +
    '?[Mm]\\.?))?' +
    '(?:(\\])' +
    SP +
    '?|' +
    SP +
    '[-–]' +
    SP +
    ')' +
    '([\\s\\S]*)$',
);

function matchHeader(line: string): RawEntry | null {
  // Cheap pre-filter: a header starts with a digit, "[" or an invisible mark.
  const c0 = line.charCodeAt(0);
  if (!((c0 >= 48 && c0 <= 57) || c0 === 91 || c0 >= 0x200e)) return null;

  const m = HEADER_RE.exec(line);
  if (!m) return null;

  const ios = m[1] !== undefined;
  if (ios !== (m[10] !== undefined)) return null;

  const a = Number(m[2]);
  const b = Number(m[4]);
  const c = Number(m[5]);
  const yearFirst = (m[2] ?? '').length === 4;
  if (yearFirst) {
    if (b < 1 || b > 12 || c < 1 || c > 31) return null;
  } else {
    if ((m[2] ?? '').length > 2 || (m[5] ?? '').length === 3) return null;
    if (a < 1 || a > 31 || b < 1 || b > 31 || (a > 12 && b > 12)) return null;
  }

  let hour = Number(m[6]);
  const minute = Number(m[7]);
  const second = m[8] !== undefined ? Number(m[8]) : 0;
  if (minute > 59 || second > 59) return null;

  let meridiemStyle: 0 | 1 | 2 = 0;
  const meridiem = m[9];
  if (meridiem !== undefined) {
    if (hour < 1 || hour > 12) return null;
    const pm = meridiem.charCodeAt(0) === 112 || meridiem.charCodeAt(0) === 80; // p / P
    hour = (hour % 12) + (pm ? 12 : 0);
    meridiemStyle = meridiem.indexOf('.') === -1 ? 1 : 2;
  } else if (hour > 23) {
    return null;
  }

  return { a, b, c, yearFirst, hour, minute, second, ios, meridiemStyle, rest: m[11] ?? '' };
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/**
 * dd/mm vs mm/dd. In order: a field above 12 settles it; otherwise the interpretation that
 * keeps the chat chronological wins; otherwise the export language; otherwise dd/mm.
 */
export function detectDateOrder(
  entries: ReadonlyArray<Pick<RawEntry, 'a' | 'b' | 'c' | 'yearFirst'>>,
  locale: Locale,
): DateOrder {
  let firstAbove12 = 0;
  let secondAbove12 = 0;
  for (const e of entries) {
    if (e.yearFirst) continue;
    if (e.a > 12) firstAbove12++;
    else if (e.b > 12) secondAbove12++;
  }
  if (firstAbove12 > 0 || secondAbove12 > 0) return firstAbove12 >= secondAbove12 ? 'dmy' : 'mdy';

  let dmyBackwards = 0;
  let mdyBackwards = 0;
  let prevDmy = -1;
  let prevMdy = -1;
  for (const e of entries) {
    if (e.yearFirst) continue;
    const y = fullYear(e.c) * 10000;
    const dmy = y + e.b * 100 + e.a;
    const mdy = y + e.a * 100 + e.b;
    if (dmy < prevDmy) dmyBackwards++;
    if (mdy < prevMdy) mdyBackwards++;
    prevDmy = dmy;
    prevMdy = mdy;
  }
  if (dmyBackwards !== mdyBackwards) return dmyBackwards < mdyBackwards ? 'dmy' : 'mdy';

  return locale === 'en' ? 'mdy' : 'dmy';
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function splitSender(rest: string): { senderRaw: string | null; bodyRaw: string } {
  const nl = rest.indexOf('\n');
  const idx = rest.indexOf(': ');
  if (idx > 0 && idx <= 120 && (nl === -1 || idx < nl)) {
    const senderRaw = rest.slice(0, idx);
    if (!looksLikeSystemSender(senderRaw)) return { senderRaw, bodyRaw: rest.slice(idx + 2) };
  } else if (nl === -1 && rest.length <= 121 && rest.endsWith(':') && rest.length > 1) {
    // "Name:" with an empty message.
    return { senderRaw: rest.slice(0, -1), bodyRaw: '' };
  }
  return { senderRaw: null, bodyRaw: rest };
}

function build(entries: RawEntry[], sawAnyText: boolean): ParsedChat {
  if (entries.length === 0) throw new ChatParseError(sawAnyText ? 'not_a_chat' : 'empty');

  const participants: Participant[] = [];
  const idxByName = new Map<string, number>();
  const messages: Message[] = new Array<Message>(entries.length);
  const langHits = { es: 0, en: 0 };
  let iosCount = 0;
  let groupHint = false;
  let dottedMeridiem = 0;
  let plainMeridiem = 0;

  const countLang = (lang: Lang | undefined) => {
    if (lang) langHits[lang]++;
  };

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as RawEntry;
    if (e.ios) iosCount++;
    if (e.meridiemStyle === 1) plainMeridiem++;
    else if (e.meridiemStyle === 2) dottedMeridiem++;

    const { senderRaw, bodyRaw } = splitSender(e.rest);
    const body = classifyBody(normalizeText(bodyRaw));
    countLang(body.lang);

    // iOS marks everything it generates itself with a leading direction mark. If such a body
    // is not media, a deleted message, etc., it is a system notice attributed to a name.
    const isSystem =
      senderRaw === null
        ? body.kind !== 'call'
        : e.ios && body.kind === 'text' && startsWithDirectionMark(bodyRaw);

    let message: Message;
    if (isSystem) {
      const text = normalizeText(bodyRaw);
      const sys = classifySystem(text);
      countLang(sys.lang);
      if (sys.groupHint) groupHint = true;
      message = {
        ts: 0,
        minuteKey: '',
        senderIdx: -1,
        text,
        kind: 'system',
        edited: false,
        systemEvent: sys.event,
      };
    } else {
      let senderIdx = -1;
      if (senderRaw !== null) {
        const name = normalizeText(senderRaw).replace(/^~ ?/, '');
        const known = idxByName.get(name);
        if (known !== undefined) {
          senderIdx = known;
        } else {
          senderIdx = participants.length;
          idxByName.set(name, senderIdx);
          participants.push({ idx: senderIdx, displayName: name });
        }
      }
      message = {
        ts: 0,
        minuteKey: '',
        senderIdx,
        text: body.text,
        kind: body.kind,
        edited: body.edited,
      };
      if (body.mediaType) message.mediaType = body.mediaType;
    }
    messages[i] = message;
  }

  if (participants.length === 0) throw new ChatParseError('no_messages');

  let locale: Locale = 'unknown';
  if (langHits.es > langHits.en) locale = 'es';
  else if (langHits.en > langHits.es) locale = 'en';
  else if (dottedMeridiem > plainMeridiem) locale = 'es';
  else if (plainMeridiem > dottedMeridiem) locale = 'en';

  const dateOrder = detectDateOrder(entries, locale);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as RawEntry;
    let year: number;
    let month: number;
    let day: number;
    if (e.yearFirst) {
      year = e.a;
      month = e.b;
      day = e.c;
    } else {
      year = fullYear(e.c);
      day = dateOrder === 'dmy' ? e.a : e.b;
      month = dateOrder === 'dmy' ? e.b : e.a;
      if (month > 12) {
        // A stray line that contradicts the detected order: read it the only valid way.
        const swap = day;
        day = month;
        month = swap;
      }
    }
    const message = messages[i] as Message;
    message.ts = Date.UTC(year, month - 1, day, e.hour, e.minute, e.second);
    message.minuteKey = `${year}-${pad2(month)}-${pad2(day)}T${pad2(e.hour)}:${pad2(e.minute)}`;
  }

  let platform: Platform = 'android';
  if (iosCount * 2 > entries.length) platform = 'ios';

  return {
    participants,
    messages,
    meta: { platform, locale, isGroup: participants.length > 2 || groupHint, dateOrder },
  };
}

export type ChatParser = {
  /** Feed the next block of the file. Blocks may cut a line anywhere. */
  push(chunk: string): void;
  /** Call once after the last block. Throws ChatParseError if this is not a usable chat. */
  finish(): ParsedChat;
};

/** Incremental parser, so a Worker can read a large file block by block. */
export function createChatParser(): ChatParser {
  const entries: RawEntry[] = [];
  let pending = '';
  let last: RawEntry | null = null;
  let sawAnyText = false;

  const handleLine = (rawLine: string) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!sawAnyText && line.trim() !== '') sawAnyText = true;
    const entry = matchHeader(line);
    if (entry) {
      entries.push(entry);
      last = entry;
    } else if (last) {
      last.rest += '\n' + line;
    }
  };

  return {
    push(chunk) {
      const data = pending + chunk;
      let start = 0;
      let nl = data.indexOf('\n', start);
      while (nl !== -1) {
        handleLine(data.slice(start, nl));
        start = nl + 1;
        nl = data.indexOf('\n', start);
      }
      pending = data.slice(start);
    },
    finish() {
      if (pending !== '') handleLine(pending);
      pending = '';
      return build(entries, sawAnyText);
    },
  };
}

/** Parses a whole exported chat (.txt content). */
export function parseChat(text: string): ParsedChat {
  const parser = createChatParser();
  parser.push(text);
  return parser.finish();
}
