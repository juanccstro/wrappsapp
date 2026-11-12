import type { MessageKind } from '../parser';

export type Counted<T extends string = string> = { key: T; count: number };

export type AnalyticsOptions = {
  /** A message is a reply if it follows another person's message within this time. */
  replyWindowMinutes: number;
  /** Silence after which the next message starts a new conversation. */
  conversationGapMinutes: number;
  /** Audios have no duration in the export: assumed average, used for a joke stat. */
  averageAudioMinutes: number;
};

export const DEFAULT_OPTIONS: AnalyticsOptions = {
  replyWindowMinutes: 6 * 60,
  conversationGapMinutes: 3 * 60,
  averageAudioMinutes: 0.75,
};

export type PersonStats = {
  idx: number;
  messages: number;
  /** Fraction of all messages (0–1). */
  share: number;
  words: number;
  /** Mean words per text message. */
  avgWords: number;
  longestMessage: { chars: number; words: number; minuteKey: string } | null;
  /** Fraction of their messages sent 00:00–05:59. */
  nightShare: number;
  /** Fraction sent 06:00–08:59. */
  earlyShare: number;
  replies: number;
  medianReplyMinutes: number | null;
  conversationsStarted: number;
  /** Conversations they started that nobody else joined. */
  ignoredStarts: number;
  doubleTexts: number;
  tripleTexts: number;
  /** Longest run of consecutive messages without anyone else in between. */
  longestMonologue: number;
  emojis: number;
  favoriteEmoji: string | null;
  /** Word they use far more than the rest of the group. */
  signatureWord: string | null;
  laughs: number;
  /** "jajaja", "JAJAJA", "jsjsjs", "😂"… */
  signatureLaugh: string | null;
  audios: number;
  podcastMinutes: number;
  questions: number;
  shouts: number;
  links: number;
  stickers: number;
  gifs: number;
  media: number;
  deleted: number;
  edited: number;
  polls: number;
  /** Who they reply to the most. */
  favoritePerson: number | null;
  /** How evenly they reply to everyone (0–1; 1 = perfectly even). Null with too few replies. */
  replyEvenness: number | null;
  /** Messages with a clearly positive mood. */
  positiveMessages: number;
  /** Fraction of their messages with a clear mood that are positive. Null if none. */
  positivity: number | null;
  activeDays: number;
  /** Longest stretch of days without writing, between two of their messages. */
  longestAbsenceDays: number;
};

export type Analytics = {
  totals: {
    messages: number;
    words: number;
    emojis: number;
    media: number;
    audios: number;
    images: number;
    videos: number;
    stickers: number;
    gifs: number;
    documents: number;
    links: number;
    deleted: number;
    edited: number;
    polls: number;
    locations: number;
    contacts: number;
  };
  /**
   * False when the export only says "media omitted" (Android without files): audios, photos
   * and stickers cannot be told apart, so slides about them must be skipped.
   */
  mediaTypesKnown: boolean;
  range: { firstDay: string; lastDay: string; activeDays: number; totalDays: number } | null;
  busiestDay: { day: string; messages: number; keywords: string[] } | null;
  /** [weekday][hour], weekday 0 = Monday. */
  heatmap: number[][];
  hourTotals: number[];
  weekdayTotals: number[];
  peakHour: number;
  /** Hour at which the chat "wakes up" (first hour from 05:00 with real activity). */
  wakeUpHour: number;
  longestStreak: { days: number; start: string; end: string } | null;
  longestSilence: {
    minutes: number;
    from: string;
    to: string;
    brokenBy: number;
    brokenWithKind: MessageKind;
    /** Start of the message that broke it (text messages only). */
    brokenWithText: string;
  } | null;
  months: { month: string; total: number; perPerson: number[] }[];
  busiestMonth: { month: string; messages: number } | null;
  topEmojis: Counted[];
  topWords: Counted[];
  topBigrams: Counted[];
  laughs: {
    total: number;
    longest: { text: string; length: number; senderIdx: number } | null;
  };
  sentiment: { positive: number; negative: number; positiveShare: number | null };
  systemEvents: {
    subjectChanges: number;
    iconChanges: number;
    membersAdded: number;
    membersLeft: number;
  };
  people: PersonStats[];
  /** replyMatrix[a][b] = times a replied to b. */
  replyMatrix: number[][];
  /** The two people who reply to each other the most. */
  topPair: { a: number; b: number; replies: number } | null;
};
