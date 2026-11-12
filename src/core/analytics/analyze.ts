import type { Message, MessageKind, ParsedChat } from '../parser';
import { dayKeyOf, dayNumberOf, hourOf, minuteOf, weekdayOf } from '../time';
import {
  NEGATIVE_EMOJIS,
  NEGATIVE_WORDS,
  POSITIVE_EMOJIS,
  POSITIVE_WORDS,
  STOPWORDS,
} from './lexicon';
import {
  extractEmojis,
  isShout,
  LAUGH_EMOJIS,
  laughFamily,
  laughLabel,
  splitLinks,
  tokenize,
} from './text';
import {
  DEFAULT_OPTIONS,
  type Analytics,
  type AnalyticsOptions,
  type Counted,
  type PersonStats,
} from './types';

const TOP_N = 10;
/** A reply counts as a reaction to a photo if it comes this soon after it. */
const IMAGE_REACTION_MINUTES = 3;
const IMAGE_REACTION_MAX_CHARS = 90;
const IMAGE_REACTIONS_KEPT = 3;
const KEYWORDS_PER_DAY = 10;
const SILENCE_PREVIEW_CHARS = 80;
const MIN_SIGNATURE_WORD_USES = 3;
const MIN_REPLIES_FOR_EVENNESS = 10;

type CountMap = Map<string, number>;

const bump = (map: CountMap, key: string, by = 1) => map.set(key, (map.get(key) ?? 0) + by);

/** Code-point order: unlike localeCompare, it is the same on every device. */
const compareKeys = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Highest count first; ties broken by key so the order never depends on the engine. */
function top(map: CountMap, n: number): Counted[] {
  const entries: Counted[] = [];
  for (const [key, count] of map) entries.push({ key, count });
  entries.sort((x, y) => y.count - x.count || compareKeys(x.key, y.key));
  return entries.slice(0, n);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

const isDigit = (code: number) => code >= 48 && code <= 57;

function isContentWord(lower: string): boolean {
  if (lower.length < 3 || STOPWORDS.has(lower)) return false;
  // Only words that start with a digit can be plain numbers.
  return !(isDigit(lower.charCodeAt(0)) && /^\d+$/.test(lower));
}

type PersonAcc = {
  messages: number;
  textMessages: number;
  words: number;
  contentWords: number;
  longest: PersonStats['longestMessage'];
  night: number;
  early: number;
  replyTimes: number[];
  conversationsStarted: number;
  ignoredStarts: number;
  doubleTexts: number;
  tripleTexts: number;
  longestMonologue: number;
  emojis: number;
  emojiCounts: CountMap;
  wordCounts: CountMap;
  laughs: number;
  laughCounts: CountMap;
  audios: number;
  questions: number;
  shouts: number;
  links: number;
  stickers: number;
  gifs: number;
  images: number;
  media: number;
  deleted: number;
  edited: number;
  polls: number;
  positive: number;
  negative: number;
  activeDays: number;
  lastDay: number;
  longestAbsenceDays: number;
};

const newPerson = (): PersonAcc => ({
  messages: 0,
  textMessages: 0,
  words: 0,
  contentWords: 0,
  longest: null,
  night: 0,
  early: 0,
  replyTimes: [],
  conversationsStarted: 0,
  ignoredStarts: 0,
  doubleTexts: 0,
  tripleTexts: 0,
  longestMonologue: 0,
  emojis: 0,
  emojiCounts: new Map(),
  wordCounts: new Map(),
  laughs: 0,
  laughCounts: new Map(),
  audios: 0,
  questions: 0,
  shouts: 0,
  links: 0,
  stickers: 0,
  gifs: 0,
  images: 0,
  media: 0,
  deleted: 0,
  edited: 0,
  polls: 0,
  positive: 0,
  negative: 0,
  activeDays: 0,
  lastDay: -1,
  longestAbsenceDays: 0,
});

/** Day with the most messages (earliest on a tie) and the count per day, in day order. */
function countDays(authored: Message[]): { perDay: Map<number, number>; busiest: number } {
  const perDay = new Map<number, number>();
  for (const m of authored) {
    const day = dayNumberOf(m.ts);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  let busiest = -1;
  let best = 0;
  for (const [day, count] of perDay) {
    if (count > best || (count === best && day < busiest)) {
      best = count;
      busiest = day;
    }
  }
  return { perDay, busiest };
}

/**
 * All the statistics of a chat (already sliced to the chosen period). Pure: same chat in,
 * same object out. Contains indexes, never names, so it does not depend on how each phone
 * has its contacts saved.
 */
export function analyzeChat(
  chat: ParsedChat,
  overrides: Partial<AnalyticsOptions> = {},
): Analytics {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  const personCount = chat.participants.length;
  const authored = chat.messages.filter((m) => m.senderIdx >= 0 && m.senderIdx < personCount);
  const people = Array.from({ length: personCount }, newPerson);

  const totals: Analytics['totals'] = {
    messages: 0,
    words: 0,
    emojis: 0,
    media: 0,
    audios: 0,
    images: 0,
    videos: 0,
    stickers: 0,
    gifs: 0,
    documents: 0,
    links: 0,
    deleted: 0,
    edited: 0,
    polls: 0,
    locations: 0,
    contacts: 0,
  };
  let typedMedia = 0;

  const heatmap = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const hourTotals = new Array<number>(24).fill(0);
  const weekdayTotals = new Array<number>(7).fill(0);
  const months = new Map<string, { total: number; perPerson: number[] }>();

  const emojiCounts: CountMap = new Map();
  const wordCounts: CountMap = new Map();
  const bigramCounts: CountMap = new Map();
  let contentWordsTotal = 0;

  // TF-IDF of the busiest day: term frequency that day, document frequency over all days.
  const { perDay, busiest: busiestDay } = countDays(authored);
  const busiestDayWords: CountMap = new Map();
  const daysWithWord: CountMap = new Map();
  const lastDayOfWord = new Map<string, number>();

  let laughTotal = 0;
  let longestLaugh: Analytics['laughs']['longest'] = null;
  let positive = 0;
  let negative = 0;

  const replyMatrix = Array.from({ length: personCount }, () =>
    new Array<number>(personCount).fill(0),
  );
  let longestSilence: Analytics['longestSilence'] = null;

  // Laughing replies to photos.
  let lastImage: { sender: number; minute: number } | null = null;
  const reactions: {
    text: string;
    senderIdx: number;
    toIdx: number;
    score: number;
    order: number;
  }[] = [];

  // Conversation state.
  let prevSender = -1;
  let prevMinute = 0;
  let prevMinuteKey = '';
  let runLength = 0;
  let starter = -1;
  let othersJoined = false;

  const closeRun = () => {
    if (prevSender < 0) return;
    const p = people[prevSender] as PersonAcc;
    if (runLength === 2) p.doubleTexts++;
    else if (runLength >= 3) p.tripleTexts++;
    if (runLength > p.longestMonologue) p.longestMonologue = runLength;
  };

  for (const m of authored) {
    const sender = m.senderIdx;
    const p = people[sender] as PersonAcc;
    const minute = minuteOf(m.ts);
    const day = dayNumberOf(m.ts);
    const hour = hourOf(m.ts);
    const weekday = weekdayOf(m.ts);

    totals.messages++;
    p.messages++;
    (heatmap[weekday] as number[])[hour]!++;
    hourTotals[hour]!++;
    weekdayTotals[weekday]!++;
    if (hour < 6) p.night++;
    else if (hour < 9) p.early++;

    if (day !== p.lastDay) {
      if (p.lastDay >= 0 && day - p.lastDay - 1 > p.longestAbsenceDays) {
        p.longestAbsenceDays = day - p.lastDay - 1;
      }
      p.activeDays++;
      p.lastDay = day;
    }

    const monthKey = m.minuteKey.slice(0, 7);
    let month = months.get(monthKey);
    if (!month) {
      month = { total: 0, perPerson: new Array<number>(personCount).fill(0) };
      months.set(monthKey, month);
    }
    month.total++;
    month.perPerson[sender]!++;

    if (m.edited) {
      totals.edited++;
      p.edited++;
    }

    switch (m.kind) {
      case 'media':
        totals.media++;
        p.media++;
        if (m.mediaType && m.mediaType !== 'media_unknown') typedMedia++;
        if (m.mediaType === 'audio') {
          totals.audios++;
          p.audios++;
        } else if (m.mediaType === 'sticker') {
          totals.stickers++;
          p.stickers++;
        } else if (m.mediaType === 'gif') {
          totals.gifs++;
          p.gifs++;
        } else if (m.mediaType === 'image') {
          totals.images++;
          p.images++;
          lastImage = { sender, minute };
        } else if (m.mediaType === 'video') totals.videos++;
        else if (m.mediaType === 'document') totals.documents++;
        break;
      case 'deleted':
        totals.deleted++;
        p.deleted++;
        break;
      case 'poll':
        totals.polls++;
        p.polls++;
        break;
      case 'location':
        totals.locations++;
        break;
      case 'contact':
        totals.contacts++;
        break;
      case 'text': {
        // Only real text is analysed: captions, polls and locations change with the
        // language of the phone and the export mode.
        p.textMessages++;
        const { links, rest } = splitLinks(m.text);
        totals.links += links;
        p.links += links;

        const tokens = tokenize(rest);
        totals.words += tokens.length;
        p.words += tokens.length;
        if (!p.longest || m.text.length > p.longest.chars) {
          p.longest = { chars: m.text.length, words: tokens.length, minuteKey: m.minuteKey };
        }
        if (m.text.indexOf('?') !== -1) p.questions++;

        let mood = 0;
        let laughsHere = 0;
        let laughLetters = 0;
        let previousContentWord = '';
        for (const token of tokens) {
          const lower = token.toLowerCase();
          const family = laughFamily(lower);
          if (family) {
            laughsHere++;
            laughLetters += token.length;
            bump(p.laughCounts, laughLabel(family, token));
            if (
              family !== 'xd' &&
              family !== 'lol' &&
              (!longestLaugh || token.length > longestLaugh.length)
            ) {
              longestLaugh = { text: token, length: token.length, senderIdx: sender };
            }
            previousContentWord = '';
            continue;
          }
          if (POSITIVE_WORDS.has(lower)) mood++;
          else if (NEGATIVE_WORDS.has(lower)) mood--;
          if (!isContentWord(lower)) {
            previousContentWord = '';
            continue;
          }
          contentWordsTotal++;
          p.contentWords++;
          bump(wordCounts, lower);
          bump(p.wordCounts, lower);
          if (previousContentWord) bump(bigramCounts, `${previousContentWord} ${lower}`);
          previousContentWord = lower;

          if (lastDayOfWord.get(lower) !== day) {
            lastDayOfWord.set(lower, day);
            bump(daysWithWord, lower);
          }
          if (day === busiestDay) bump(busiestDayWords, lower);
        }

        for (const emoji of extractEmojis(rest)) {
          totals.emojis++;
          p.emojis++;
          bump(emojiCounts, emoji);
          bump(p.emojiCounts, emoji);
          if (LAUGH_EMOJIS.has(emoji)) {
            laughsHere++;
            laughLetters += 4;
            bump(p.laughCounts, emoji);
          }
          if (POSITIVE_EMOJIS.has(emoji)) mood++;
          else if (NEGATIVE_EMOJIS.has(emoji)) mood--;
        }

        if (
          lastImage &&
          laughsHere > 0 &&
          sender !== lastImage.sender &&
          minute - lastImage.minute <= IMAGE_REACTION_MINUTES &&
          m.text.length <= IMAGE_REACTION_MAX_CHARS
        ) {
          reactions.push({
            text: m.text,
            senderIdx: sender,
            toIdx: lastImage.sender,
            score: laughLetters,
            order: reactions.length,
          });
        }

        laughTotal += laughsHere;
        p.laughs += laughsHere;
        if (laughsHere > 0) mood++;
        if (mood > 0) {
          positive++;
          p.positive++;
        } else if (mood < 0) {
          negative++;
          p.negative++;
        }
        // A message made only of laughter in capitals is laughter, not shouting.
        if (laughsHere < tokens.length && isShout(m.text)) p.shouts++;
        break;
      }
      default:
        break;
    }

    // Conversations, replies and runs.
    const gap = minute - prevMinute;
    if (prevSender < 0 || gap >= options.conversationGapMinutes) {
      closeRun();
      if (starter >= 0 && !othersJoined) (people[starter] as PersonAcc).ignoredStarts++;
      starter = sender;
      othersJoined = false;
      runLength = 1;
      p.conversationsStarted++;
    } else if (sender !== prevSender) {
      closeRun();
      runLength = 1;
      othersJoined = true;
    } else {
      runLength++;
    }

    if (prevSender >= 0) {
      if (sender !== prevSender && gap <= options.replyWindowMinutes) {
        (replyMatrix[sender] as number[])[prevSender]!++;
        p.replyTimes.push(gap);
      }
      if (!longestSilence || gap > longestSilence.minutes) {
        longestSilence = {
          minutes: gap,
          from: prevMinuteKey,
          to: m.minuteKey,
          brokenBy: sender,
          brokenWithKind: m.kind as MessageKind,
          brokenWithText: m.kind === 'text' ? m.text.slice(0, SILENCE_PREVIEW_CHARS) : '',
        };
      }
    }

    prevSender = sender;
    prevMinute = minute;
    prevMinuteKey = m.minuteKey;
  }
  closeRun(); // The last conversation is still open: it cannot be called "ignored".
  if (longestSilence && longestSilence.minutes <= 0) longestSilence = null;

  // Days: range, streak, busiest day keywords.
  const dayNumbers = Array.from(perDay.keys()).sort((x, y) => x - y);
  let range: Analytics['range'] = null;
  let longestStreak: Analytics['longestStreak'] = null;
  if (dayNumbers.length > 0) {
    const first = dayNumbers[0] as number;
    const last = dayNumbers[dayNumbers.length - 1] as number;
    range = {
      firstDay: dayKeyOf(first),
      lastDay: dayKeyOf(last),
      activeDays: dayNumbers.length,
      totalDays: last - first + 1,
    };
    let bestStart = first;
    let bestLength = 1;
    let runStart = first;
    for (let i = 1; i < dayNumbers.length; i++) {
      const dayNumber = dayNumbers[i] as number;
      if (dayNumber !== (dayNumbers[i - 1] as number) + 1) runStart = dayNumber;
      const length = dayNumber - runStart + 1;
      if (length > bestLength) {
        bestLength = length;
        bestStart = runStart;
      }
    }
    longestStreak = {
      days: bestLength,
      start: dayKeyOf(bestStart),
      end: dayKeyOf(bestStart + bestLength - 1),
    };
  }

  let busiest: Analytics['busiestDay'] = null;
  if (busiestDay >= 0) {
    const scored: { key: string; score: number }[] = [];
    const repeated = Array.from(busiestDayWords.values()).some((count) => count >= 2);
    for (const [word, count] of busiestDayWords) {
      if (repeated && count < 2) continue;
      const idf = Math.log((dayNumbers.length + 1) / (daysWithWord.get(word) ?? 1));
      scored.push({ key: word, score: count * idf });
    }
    scored.sort((x, y) => y.score - x.score || compareKeys(x.key, y.key));
    busiest = {
      day: dayKeyOf(busiestDay),
      messages: perDay.get(busiestDay) ?? 0,
      keywords: scored.slice(0, KEYWORDS_PER_DAY).map((s) => s.key),
    };
  }

  // Hours.
  let peakHour = 0;
  for (let h = 1; h < 24; h++)
    if ((hourTotals[h] as number) > (hourTotals[peakHour] as number)) peakHour = h;
  let wakeUpHour = peakHour;
  let cumulative = 0;
  for (let i = 0; i < 24; i++) {
    const h = (5 + i) % 24;
    cumulative += hourTotals[h] as number;
    if (totals.messages > 0 && cumulative >= totals.messages * 0.05) {
      wakeUpHour = h;
      break;
    }
  }

  // Months.
  const monthList = Array.from(months, ([month, v]) => ({ month, ...v })).sort((x, y) =>
    compareKeys(x.month, y.month),
  );
  let busiestMonth: Analytics['busiestMonth'] = null;
  for (const mo of monthList) {
    if (!busiestMonth || mo.total > busiestMonth.messages) {
      busiestMonth = { month: mo.month, messages: mo.total };
    }
  }

  // People.
  const peopleStats: PersonStats[] = people.map((p, idx) => {
    let signatureWord: string | null = null;
    let bestScore = 0;
    for (const [word, count] of p.wordCounts) {
      if (count < MIN_SIGNATURE_WORD_USES) continue;
      const own = count / p.contentWords;
      const group = (wordCounts.get(word) ?? count) / contentWordsTotal;
      const score = (own / group) * Math.log(1 + count);
      if (
        score > bestScore ||
        (score === bestScore && signatureWord !== null && word < signatureWord)
      ) {
        bestScore = score;
        signatureWord = word;
      }
    }

    const row = replyMatrix[idx] as number[];
    let favoritePerson: number | null = null;
    let replies = 0;
    for (let other = 0; other < personCount; other++) {
      const count = row[other] as number;
      replies += count;
      if (count > 0 && (favoritePerson === null || count > (row[favoritePerson] as number))) {
        favoritePerson = other;
      }
    }
    // Normalised entropy of who they reply to.
    let replyEvenness: number | null = null;
    if (replies >= MIN_REPLIES_FOR_EVENNESS && personCount > 2) {
      let entropy = 0;
      for (const count of row) {
        if (count > 0) entropy -= (count / replies) * Math.log(count / replies);
      }
      replyEvenness = entropy / Math.log(personCount - 1);
    }

    const moody = p.positive + p.negative;
    return {
      idx,
      messages: p.messages,
      share: totals.messages > 0 ? p.messages / totals.messages : 0,
      words: p.words,
      avgWords: p.textMessages > 0 ? p.words / p.textMessages : 0,
      longestMessage: p.longest,
      nightShare: p.messages > 0 ? p.night / p.messages : 0,
      earlyShare: p.messages > 0 ? p.early / p.messages : 0,
      replies,
      medianReplyMinutes: median(p.replyTimes),
      conversationsStarted: p.conversationsStarted,
      ignoredStarts: p.ignoredStarts,
      doubleTexts: p.doubleTexts,
      tripleTexts: p.tripleTexts,
      longestMonologue: p.longestMonologue,
      emojis: p.emojis,
      favoriteEmoji: top(p.emojiCounts, 1)[0]?.key ?? null,
      signatureWord,
      laughs: p.laughs,
      signatureLaugh: top(p.laughCounts, 1)[0]?.key ?? null,
      audios: p.audios,
      podcastMinutes: Math.round(p.audios * options.averageAudioMinutes),
      questions: p.questions,
      shouts: p.shouts,
      links: p.links,
      stickers: p.stickers,
      gifs: p.gifs,
      images: p.images,
      media: p.media,
      deleted: p.deleted,
      edited: p.edited,
      polls: p.polls,
      favoritePerson,
      replyEvenness,
      positiveMessages: p.positive,
      positivity: moody > 0 ? p.positive / moody : null,
      activeDays: p.activeDays,
      longestAbsenceDays: p.longestAbsenceDays,
    };
  });

  let topPair: Analytics['topPair'] = null;
  for (let a = 0; a < personCount; a++) {
    for (let b = a + 1; b < personCount; b++) {
      const replies =
        ((replyMatrix[a] as number[])[b] as number) + ((replyMatrix[b] as number[])[a] as number);
      if (replies > 0 && (!topPair || replies > topPair.replies)) topPair = { a, b, replies };
    }
  }

  const systemEvents = { subjectChanges: 0, iconChanges: 0, membersAdded: 0, membersLeft: 0 };
  for (const m of chat.messages) {
    if (m.kind !== 'system') continue;
    if (m.systemEvent === 'subject_change') systemEvents.subjectChanges++;
    else if (m.systemEvent === 'icon_change') systemEvents.iconChanges++;
    else if (m.systemEvent === 'member_added') systemEvents.membersAdded++;
    else if (m.systemEvent === 'member_left' || m.systemEvent === 'member_removed') {
      systemEvents.membersLeft++;
    }
  }

  return {
    totals,
    mediaTypesKnown: totals.media === 0 || typedMedia > 0,
    range,
    busiestDay: busiest,
    heatmap,
    hourTotals,
    weekdayTotals,
    peakHour,
    wakeUpHour,
    longestStreak,
    longestSilence,
    months: monthList,
    busiestMonth,
    topEmojis: top(emojiCounts, TOP_N),
    topWords: top(wordCounts, TOP_N * 3),
    topBigrams: top(bigramCounts, TOP_N),
    laughs: { total: laughTotal, longest: longestLaugh },
    sentiment: {
      positive,
      negative,
      positiveShare: positive + negative > 0 ? positive / (positive + negative) : null,
    },
    systemEvents,
    people: peopleStats,
    replyMatrix,
    topPair,
    imageReactions: reactions
      .sort((x, y) => y.score - x.score || x.order - y.order)
      .slice(0, IMAGE_REACTIONS_KEPT)
      .map(({ text, senderIdx, toIdx }) => ({ text, senderIdx, toIdx })),
  };
}
