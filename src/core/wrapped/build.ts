import type { Analytics, PersonStats } from '../analytics';
import { assignArchetypes } from '../archetypes/assign';
import type { Participant } from '../parser';
import type { Period } from '../period/period';
import { createRng } from '../random/rng';
import {
  isEligible,
  pickText,
  render,
  type Pool,
  type Slots,
  type SlotValue,
} from '../templates/engine';
import {
  ARCHETYPES,
  CARD_STATS,
  PERSON_SLOTS,
  TITLE_PREFIXES,
  TITLE_SUFFIXES,
} from '../templates/es/archetypes';
import {
  formatDay,
  formatDuration,
  formatHour,
  formatMonth,
  formatNumber,
  joinList,
  WEEKDAYS,
  weekdayOfDay,
} from '../templates/es/format';
import * as pools from '../templates/es/slides';
import { QUIZ_QUESTIONS, QUIZ_UNITS, type QuizMetric } from '../templates/es/slides';
import { VIBES, type VIBE_SLOTS, type VibeId } from '../templates/es/vibes';
import {
  BACKGROUNDS,
  PALETTE_COUNT,
  type PersonCard,
  type Ranked,
  type RankingTopic,
  type Slide,
  type SlideKind,
  type WrappedResult,
} from './types';

export type WrappedInput = {
  seed: string;
  period: Period;
  /** Participants of the period, indexed like the analytics. */
  participants: Participant[];
  isGroup: boolean;
  analytics: Analytics;
  chatName?: string | null;
};

const DURATIONS: Record<SlideKind, number> = {
  intro: 7000,
  total: 7000,
  busiestDay: 8000,
  clock: 8000,
  emojis: 8000,
  words: 8000,
  laughs: 7000,
  quiz: 9000,
  race: 9000,
  owls: 7000,
  replySpeed: 8000,
  graph: 9000,
  starterVsMystery: 8000,
  streakSilence: 8000,
  ranking: 7000,
  images: 9000,
  fact: 6000,
  people: 9000,
  vibe: 8000,
  summary: 9000,
};

const MAX_OPTIONAL_SLIDES = 2;
const MAX_QUIZ_OPTIONS = 4;
const RANKING_SIZE = 5;

type PersonSlot = (typeof PERSON_SLOTS)[number];
type VibeSlot = (typeof VIBE_SLOTS)[number];

const oneLine = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

/** People ordered by a value, highest first; ties go to whoever appeared first in the chat. */
function rank(people: PersonStats[], value: (p: PersonStats) => number, min = 1): Ranked[] {
  return people
    .map((p) => ({ idx: p.idx, value: value(p) }))
    .filter((r) => r.value >= min)
    .sort((x, y) => y.value - x.value || x.idx - y.idx);
}

const nightCount = (p: PersonStats) => Math.round(p.nightShare * p.messages);

function chooseVibe(a: Analytics, isGroup: boolean): VibeId {
  const t = a.totals;
  const messages = Math.max(1, t.messages);
  const activeDays = Math.max(1, a.range?.activeDays ?? 1);
  const totalDays = Math.max(1, a.range?.totalDays ?? 1);
  const perDay = messages / activeDays;
  const night = a.hourTotals.slice(0, 6).reduce((sum, n) => sum + n, 0) / messages;
  const textMessages = Math.max(
    1,
    messages - t.media - t.deleted - t.polls - t.locations - t.contacts,
  );
  const medians = a.people
    .map((p) => p.medianReplyMinutes)
    .filter((m): m is number => m !== null)
    .sort((x, y) => x - y);
  const typicalReply = medians.length > 0 ? (medians[medians.length >> 1] as number) : null;

  // Each personality has an entry condition and a strength. The strongest wins; "familia"
  // always qualifies, so there is always an answer.
  const scores: [VibeId, number][] = [
    ['duo', a.people.length <= 2 || !isGroup ? 10 : 0],
    ['radio', a.mediaTypesKnown && t.audios / messages >= 0.08 ? (t.audios / messages) * 8 : 0],
    ['madrugada', night >= 0.1 ? night * 6 : 0],
    ['memes', t.media / messages >= 0.15 ? (t.media / messages) * 4 : 0],
    ['risas', a.laughs.total / messages >= 0.12 ? (a.laughs.total / messages) * 5 : 0],
    ['debate', t.words / textMessages >= 10 ? t.words / textMessages / 14 : 0],
    ['rayo', typicalReply !== null && typicalReply <= 2 && messages >= 200 ? 0.8 : 0],
    ['caos', perDay >= 80 ? Math.min(1.2, perDay / 150) : 0],
    ['pocos', perDay < 12 || activeDays / totalDays < 0.3 ? 0.7 : 0],
    ['familia', 0.5],
  ];
  let best = scores[0] as [VibeId, number];
  for (const entry of scores) if (entry[1] > best[1]) best = entry;
  return best[0];
}

/** Builds the whole Wrapped: which slides, in which order, with which texts. Pure. */
export function buildWrapped(input: WrappedInput): WrappedResult {
  const { seed, analytics: a, period, isGroup } = input;
  const rng = createRng(seed);
  const people = a.people;
  const count = people.length;
  const chatName = input.chatName ?? null;
  const nameOf = (idx: number) => input.participants[idx]?.displayName ?? '';
  const t = a.totals;
  const activeDays = Math.max(1, a.range?.activeDays ?? 1);

  const periodLabel =
    period.kind === 'year'
      ? String(period.year)
      : period.kind === 'last12'
        ? 'los últimos 12 meses'
        : 'toda vuestra historia';
  const common: Slots = {
    chat: isGroup ? 'el grupo' : 'vuestro chat',
    del_chat: isGroup ? 'del grupo' : 'de vuestro chat',
    period: periodLabel,
  };

  const write = <K extends string>(id: string, pool: Pool<K>, slots: Record<K, SlotValue>) => {
    const all = { ...common, ...slots };
    return {
      title: pickText(rng.scope(`slide:${id}:title`), pool.titles, all),
      body: pickText(rng.scope(`slide:${id}:body`), pool.bodies, all),
    };
  };
  const slide = <K extends SlideKind>(
    id: string,
    kind: K,
    texts: { title: string; body: string },
    data: Extract<Slide, { kind: K }>['data'],
  ): Slide => ({ id, kind, durationMs: DURATIONS[kind], ...texts, data }) as Slide;

  // ── Personality of the chat ────────────────────────────────────────────────
  const vibeId = chooseVibe(a, isGroup);
  const every = a.laughs.total > 0 ? Math.round(t.messages / a.laughs.total) : 0;
  const everyLabel = a.laughs.total === 0 ? null : every <= 1 ? 'mensaje' : `${every} mensajes`;
  const textMessages = Math.max(
    1,
    t.messages - t.media - t.deleted - t.polls - t.locations - t.contacts,
  );
  const medians = people
    .map((p) => p.medianReplyMinutes)
    .filter((m): m is number => m !== null)
    .sort((x, y) => x - y);
  const perDay = Math.round(t.messages / activeDays);
  const nightTotal = a.hourTotals.slice(0, 6).reduce((sum, n) => sum + n, 0);
  const nightPct = t.messages > 0 ? Math.round((100 * nightTotal) / t.messages) : 0;
  const vibeSlots: Record<VibeSlot, SlotValue> = {
    n: t.messages,
    days: activeDays,
    perDay,
    nightPct,
    mediaPct: t.messages > 0 ? Math.round((100 * t.media) / t.messages) : 0,
    everyLabel,
    laughs: a.laughs.total,
    audios: t.audios,
    avgWords: formatNumber(t.words / textMessages),
    replyTime: medians.length > 0 ? formatDuration(medians[medians.length >> 1] as number) : null,
  };
  const vibe = {
    id: vibeId,
    name: rng.scope('vibe:name').pick(VIBES[vibeId].names),
    description: pickText(rng.scope('vibe:description'), VIBES[vibeId].descriptions, {
      ...common,
      ...vibeSlots,
    }),
  };

  // ── People cards ───────────────────────────────────────────────────────────
  const personSlots = (p: PersonStats): Slots => {
    const slots: Record<PersonSlot, SlotValue> = {
      name: nameOf(p.idx),
      messages: p.messages,
      pct: Math.round(p.share * 100),
      oneIn: p.share > 0 ? Math.round(1 / p.share) : null,
      nightPct: Math.round(p.nightShare * 100),
      nightCount: nightCount(p),
      earlyPct: Math.round(p.earlyShare * 100),
      audios: p.audios,
      minutes: p.podcastMinutes,
      replyTime: p.medianReplyMinutes === null ? null : formatDuration(p.medianReplyMinutes),
      starts: p.conversationsStarted,
      avgWords: formatNumber(p.avgWords),
      stickers: p.stickers + p.gifs,
      links: p.links,
      laughs: p.laughs,
      laugh: p.signatureLaugh,
      questions: p.questions,
      shouts: p.shouts,
      doubles: p.doubleTexts + p.tripleTexts,
      emojis: p.emojis,
      emoji: p.favoriteEmoji,
      deleted: p.deleted,
      edited: p.edited,
      monologue: p.longestMonologue,
      polls: p.polls,
      absence: p.longestAbsenceDays,
      activeDays: p.activeDays,
      word: p.signatureWord,
      media: p.media,
      positivePct: p.positivity === null ? null : Math.round(p.positivity * 100),
      favorite: p.favoritePerson === null ? null : nameOf(p.favoritePerson),
    };
    return { ...common, ...slots };
  };

  const usedTitles = new Set<string>();
  const assignments = assignArchetypes(a);
  const cards: PersonCard[] = rank(people, (p) => p.messages, 0).map(({ idx }) => {
    const p = people[idx] as PersonStats;
    const archetype = assignments[idx]?.archetype ?? 'classic';
    const texts = ARCHETYPES[archetype];
    const slots = personSlots(p);
    const scope = `person:${idx}`;

    // Two people may share an archetype, but never a title.
    let title = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const suffixScope = attempt === 0 ? '' : `:${attempt}`;
      const prefix = rng.scope(`${scope}:title:prefix${suffixScope}`).pick(TITLE_PREFIXES);
      const core = pickText(rng.scope(`${scope}:title:core${suffixScope}`), texts.cores, slots);
      const suffix = rng.scope(`${scope}:title:suffix${suffixScope}`).pick(TITLE_SUFFIXES);
      title = render(`${prefix} ${core}${suffix ? `, ${suffix}` : ''}`, {});
      if (!usedTitles.has(title)) break;
    }
    usedTitles.add(title);

    const stats: PersonCard['stats'] = [];
    if (isEligible(texts.stat.value, slots)) {
      stats.push({ label: texts.stat.label, value: render(texts.stat.value, slots) });
    }
    for (const stat of rng.scope(`${scope}:stats`).shuffle(CARD_STATS)) {
      if (stats.length >= 3) break;
      if (stats.some((s) => s.label === stat.label) || !isEligible(stat.value, slots)) continue;
      stats.push({ label: stat.label, value: render(stat.value, slots) });
    }

    return {
      idx,
      name: nameOf(idx),
      archetype,
      label: texts.label,
      title,
      phrase: pickText(rng.scope(`${scope}:phrase`), texts.phrases, slots),
      stats,
    };
  });

  // ── Slides ─────────────────────────────────────────────────────────────────
  const byMessages = rank(people, (p) => p.messages, 0);

  const intro = slide(
    'intro',
    'intro',
    write('intro', pools.intro, {
      group: chatName,
      people: count,
      year: period.kind === 'year' ? (period.year ?? null) : null,
    }),
    { chatName, people: count },
  );

  const total = slide(
    'total',
    'total',
    write('total', pools.total, {
      n: t.messages,
      words: t.words,
      perDay,
      sheets: Math.max(1, Math.round(t.words / 300)),
      days: activeDays,
      readHours: Math.max(1, Math.round(t.words / 200 / 60)),
    }),
    { messages: t.messages, words: t.words, perDay, days: activeDays },
  );

  /** First block: what the chat is like. The seed shuffles it. */
  const blockA: Slide[] = [];

  if (a.busiestDay) {
    const d = a.busiestDay;
    blockA.push(
      slide(
        'busiestDay',
        'busiestDay',
        write('busiestDay', pools.busiestDay, {
          date: formatDay(d.day),
          weekday: weekdayOfDay(d.day),
          n: d.messages,
          kw1: d.keywords[0] ?? null,
          kwList: d.keywords.length >= 2 ? joinList(d.keywords.slice(0, 3)) : null,
        }),
        { day: d.day, messages: d.messages, keywords: d.keywords },
      ),
    );
  }

  let busiestWeekday = 0;
  a.weekdayTotals.forEach((n, i) => {
    if (n > (a.weekdayTotals[busiestWeekday] as number)) busiestWeekday = i;
  });
  blockA.push(
    slide(
      'clock',
      'clock',
      write('clock', pools.clock, {
        peak: formatHour(a.peakHour),
        wake: formatHour(a.wakeUpHour),
        dayName: WEEKDAYS[busiestWeekday] as string,
        nightPct,
      }),
      {
        hourTotals: a.hourTotals,
        heatmap: a.heatmap,
        peakHour: a.peakHour,
        wakeUpHour: a.wakeUpHour,
      },
    ),
  );

  const [e1, e2, e3] = a.topEmojis;
  if (e1 && e2 && e3 && t.emojis >= 10) {
    blockA.push(
      slide(
        'emojis',
        'emojis',
        write('emojis', pools.emojis, {
          e1: e1.key,
          e2: e2.key,
          e3: e3.key,
          n1: e1.count,
          total: t.emojis,
        }),
        { top: a.topEmojis.slice(0, 5), total: t.emojis },
      ),
    );
  }

  const [w1, w2, w3] = a.topWords;
  if (w1 && w2 && w3 && w1.count >= 3) {
    const bigram = a.topBigrams[0];
    blockA.push(
      slide(
        'words',
        'words',
        write('words', pools.words, {
          w1: w1.key,
          w2: w2.key,
          w3: w3.key,
          n1: w1.count,
          bigram: bigram && bigram.count >= 3 ? bigram.key : null,
        }),
        { words: a.topWords.slice(0, 12), bigrams: a.topBigrams.slice(0, 3) },
      ),
    );
  }

  if (a.laughs.total >= 10) {
    const longest = a.laughs.longest;
    blockA.push(
      slide(
        'laughs',
        'laughs',
        write('laughs', pools.laughs, {
          n: a.laughs.total,
          longest: longest ? oneLine(longest.text, 40) : null,
          len: longest ? longest.length : null,
          who: longest ? nameOf(longest.senderIdx) : null,
          everyLabel,
        }),
        {
          total: a.laughs.total,
          longest,
          ranking: rank(people, (p) => p.laughs).slice(0, RANKING_SIZE),
        },
      ),
    );
  }

  /** Second block: who does what. Optional slides join it when the data is fun enough. */
  const blockB: Slide[] = [];

  const leader = byMessages[0];
  const second = byMessages[1];
  if (a.months.length >= 3 && leader && second && a.busiestMonth) {
    blockB.push(
      slide(
        'race',
        'race',
        write('race', pools.race, {
          leader: nameOf(leader.idx),
          leaderN: leader.value,
          second: nameOf(second.idx),
          months: a.months.length,
          bestMonth: formatMonth(a.busiestMonth.month),
          diff: leader.value - second.value,
        }),
        {
          months: a.months.map((m) => ({
            month: m.month,
            label: formatMonth(m.month),
            perPerson: m.perPerson,
          })),
          ranking: byMessages,
        },
      ),
    );
  }

  const owlRanking = rank(people, nightCount);
  const owl = owlRanking[0];
  if (count >= 2 && owl && owl.value >= 10) {
    const p = people[owl.idx] as PersonStats;
    blockB.push(
      slide(
        'owls',
        'owls',
        write('owls', pools.owls, {
          owl: nameOf(owl.idx),
          pct: Math.round(p.nightShare * 100),
          count: owl.value,
        }),
        { ranking: owlRanking.slice(0, RANKING_SIZE) },
      ),
    );
  }

  const repliers = people
    .filter((p) => p.medianReplyMinutes !== null && p.replies >= 5)
    .map((p) => ({ idx: p.idx, value: p.medianReplyMinutes as number }))
    .sort((x, y) => x.value - y.value || x.idx - y.idx);
  const fastest = repliers[0];
  const slowest = repliers[repliers.length - 1];
  if (fastest && slowest && repliers.length >= 2) {
    const different = slowest.value > fastest.value;
    blockB.push(
      slide(
        'replySpeed',
        'replySpeed',
        write('replySpeed', pools.replySpeed, {
          fast: nameOf(fastest.idx),
          fastTime: formatDuration(fastest.value),
          slow: different ? nameOf(slowest.idx) : null,
          slowTime: different ? formatDuration(slowest.value) : null,
        }),
        { ranking: repliers },
      ),
    );
  }

  if (count >= 3 && a.topPair && a.topPair.replies >= 5) {
    blockB.push(
      slide(
        'graph',
        'graph',
        write('graph', pools.graph, {
          a: nameOf(a.topPair.a),
          b: nameOf(a.topPair.b),
          n: a.topPair.replies,
        }),
        { matrix: a.replyMatrix, pair: a.topPair },
      ),
    );
  }

  const starter = rank(people, (p) => p.conversationsStarted, 3)[0];
  const quietest = byMessages.filter((r) => r.value >= 1 && r.idx !== starter?.idx).pop();
  if (count >= 3 && starter && quietest) {
    blockB.push(
      slide(
        'starterVsMystery',
        'starterVsMystery',
        write('starterVsMystery', pools.starterVsMystery, {
          starter: nameOf(starter.idx),
          starts: starter.value,
          mystery: nameOf(quietest.idx),
          mysteryN: quietest.value,
        }),
        { starter, mystery: quietest },
      ),
    );
  }

  if (a.longestStreak && a.longestStreak.days >= 2) {
    const silence = a.longestSilence && a.longestSilence.minutes >= 60 ? a.longestSilence : null;
    blockB.push(
      slide(
        'streakSilence',
        'streakSilence',
        write('streakSilence', pools.streakSilence, {
          streak: a.longestStreak.days,
          streakStart: formatDay(a.longestStreak.start),
          silence: silence ? formatDuration(silence.minutes) : null,
          breaker: silence ? nameOf(silence.brokenBy) : null,
          breakText: silence?.brokenWithText ? oneLine(silence.brokenWithText, 60) : null,
        }),
        {
          streak: a.longestStreak,
          silence: silence ? { minutes: silence.minutes, brokenBy: silence.brokenBy } : null,
        },
      ),
    );
  }

  // Photos: who sends the most and the replies that laughed the hardest at them. Only when
  // the export says which media are photos (iPhone, or Android exported with files).
  const photographers = rank(people, (p) => p.images);
  const photographer = photographers[0];
  const hasImages = a.mediaTypesKnown && photographer !== undefined && photographer.value >= 10;
  if (hasImages && photographer) {
    const reactions = a.imageReactions.map((r) => ({
      text: oneLine(r.text, 70),
      idx: r.senderIdx,
    }));
    blockB.push(
      slide(
        'images',
        'images',
        write('images', pools.images, {
          who: nameOf(photographer.idx),
          n: photographer.value,
          total: t.images,
          reactor: reactions[0] ? nameOf(reactions[0].idx) : null,
        }),
        { ranking: photographers.slice(0, 3), reactions },
      ),
    );
  }

  // Optional slides.
  const optional: { slide: Slide; reveals?: QuizMetric }[] = [];
  const ranking = (
    topic: RankingTopic,
    pool: Pool<'who' | 'n'> | Pool<'who' | 'n' | 'minutes'> | Pool<'who' | 'n' | 'total'>,
    value: (p: PersonStats) => number,
    min: number,
    extra: (top: PersonStats) => Record<string, SlotValue>,
    reveals?: QuizMetric,
  ) => {
    const ranked = rank(people, value);
    const top = ranked[0];
    if (!top || top.value < min) return;
    const slots = { who: nameOf(top.idx), n: top.value, ...extra(people[top.idx] as PersonStats) };
    optional.push({
      slide: slide(
        `ranking:${topic}`,
        'ranking',
        write(`ranking:${topic}`, pool as Pool<string>, slots),
        {
          topic,
          ranking: ranked.slice(0, RANKING_SIZE),
        },
      ),
      reveals,
    });
  };
  if (a.mediaTypesKnown) {
    ranking(
      'podcast',
      pools.podcast,
      (p) => p.audios,
      20,
      (p) => ({ minutes: p.podcastMinutes }),
      'audios',
    );
  }
  ranking(
    'shouts',
    pools.shouts,
    (p) => p.shouts,
    10,
    () => ({}),
    'shouts',
  );
  ranking(
    'deleted',
    pools.deleted,
    (p) => p.deleted,
    8,
    () => ({ total: t.deleted }),
  );
  ranking(
    'questions',
    pools.questions,
    (p) => p.questions,
    20,
    () => ({}),
    'questions',
  );
  ranking(
    'monologue',
    pools.monologue,
    (p) => p.longestMonologue,
    8,
    () => ({}),
  );
  if (isGroup && a.systemEvents.subjectChanges >= 2) {
    const n = a.systemEvents.subjectChanges;
    optional.push({
      slide: slide('fact:subject', 'fact', write('fact:subject', pools.subject, { n }), {
        topic: 'subject',
        value: n,
      }),
    });
  }
  const chosenOptional = rng
    .scope('slides:optional')
    .shuffle(optional)
    // The photos slide takes one of the optional places, to keep the story at 15–20 slides.
    .slice(0, hasImages ? MAX_OPTIONAL_SLIDES - 1 : MAX_OPTIONAL_SLIDES);
  for (const o of chosenOptional) blockB.push(o.slide);

  // Quizzes: one before the "who does what" block, another after it about something that
  // block has not already revealed.
  const quizValues: Record<QuizMetric, ((p: PersonStats) => number) | null> = {
    messages: (p) => p.messages,
    audios: a.mediaTypesKnown ? (p) => p.audios : null,
    laughs: (p) => p.laughs,
    night: nightCount,
    questions: (p) => p.questions,
    shouts: (p) => p.shouts,
    stickers: a.mediaTypesKnown ? (p) => p.stickers : null,
    emojis: (p) => p.emojis,
    links: (p) => p.links,
  };
  const quizCandidates: { metric: QuizMetric; answer: Ranked }[] = [];
  for (const metric of Object.keys(QUIZ_QUESTIONS) as QuizMetric[]) {
    const value = quizValues[metric];
    if (!value || count < 2) continue;
    const ranked = rank(people, value, 0);
    const top = ranked[0];
    const next = ranked[1];
    if (top && next && top.value >= 5 && top.value > next.value)
      quizCandidates.push({ metric, answer: top });
  }
  const buildQuiz = (id: string, candidate: { metric: QuizMetric; answer: Ranked }): Slide => {
    const { metric, answer } = candidate;
    const others = rng
      .scope(`slide:${id}:others`)
      .shuffle(people.filter((p) => p.idx !== answer.idx).map((p) => p.idx))
      .slice(0, MAX_QUIZ_OPTIONS - 1);
    const slots: Slots = {
      ...common,
      answer: nameOf(answer.idx),
      amount: render(QUIZ_UNITS[metric], { value: answer.value }),
    };
    return slide(
      id,
      'quiz',
      {
        title: pickText(rng.scope(`slide:${id}:title`), QUIZ_QUESTIONS[metric], slots),
        body: pickText(rng.scope(`slide:${id}:body`), pools.quiz.hints, slots),
      },
      {
        metric,
        options: rng.scope(`slide:${id}:options`).shuffle([answer.idx, ...others]),
        answer: answer.idx,
        right: pickText(rng.scope(`slide:${id}:right`), pools.quiz.right, slots),
        wrong: pickText(rng.scope(`slide:${id}:wrong`), pools.quiz.wrong, slots),
      },
    );
  };
  const shuffledQuiz = rng.scope('slides:quiz').shuffle(quizCandidates);
  const firstQuiz = shuffledQuiz[0];
  const revealed = new Set<QuizMetric>(['messages', 'night']);
  for (const o of chosenOptional) if (o.reveals) revealed.add(o.reveals);
  const secondQuiz =
    count >= 3 ? shuffledQuiz.find((c) => c !== firstQuiz && !revealed.has(c.metric)) : undefined;

  const peopleSlide = slide('people', 'people', write('people', pools.people, { people: count }), {
    cards,
  });

  const vibeSlide = slide(
    'vibe',
    'vibe',
    {
      title: pickText(rng.scope('slide:vibe:title'), pools.vibe.titles, {
        ...common,
        vibe: vibe.name,
      }),
      body: vibe.description,
    },
    { vibeId, name: vibe.name },
  );

  const highlights: { label: string; value: string }[] = [
    { label: 'Mensajes', value: formatNumber(t.messages) },
  ];
  if (a.busiestDay) highlights.push({ label: 'Día récord', value: formatDay(a.busiestDay.day) });
  highlights.push({ label: 'Hora punta', value: formatHour(a.peakHour) });
  if (e1) highlights.push({ label: 'Emoji', value: e1.key });
  if (w1) highlights.push({ label: 'Palabra', value: w1.key });
  if (a.laughs.total > 0) highlights.push({ label: 'Risas', value: formatNumber(a.laughs.total) });
  if (a.longestStreak && a.longestStreak.days >= 2) {
    highlights.push({ label: 'Racha', value: `${formatNumber(a.longestStreak.days)} días` });
  }
  const summary = slide(
    'summary',
    'summary',
    write('summary', pools.summary, {
      n: t.messages,
      people: count,
      vibe: vibe.name,
      emoji: e1?.key ?? null,
      word: w1?.key ?? null,
    }),
    { highlights, podium: byMessages.slice(0, 3), vibeName: vibe.name },
  );

  const order = (scope: string, items: Slide[]): Slide[] => rng.scope(scope).shuffle(items);
  const slides: Slide[] = [
    intro,
    total,
    ...order('slides:blockA', blockA),
    ...(firstQuiz ? [buildQuiz('quiz:1', firstQuiz)] : []),
    ...order('slides:blockB', blockB),
    ...(secondQuiz ? [buildQuiz('quiz:2', secondQuiz)] : []),
    peopleSlide,
    vibeSlide,
    summary,
  ];

  return {
    version: 1,
    seed,
    period: { kind: period.kind, key: period.key, label: periodLabel },
    chatName,
    isGroup,
    participants: input.participants.map((p) => ({ idx: p.idx, name: p.displayName })),
    theme: {
      palette: rng.scope('palette').int(PALETTE_COUNT),
      background: rng.scope('background').pick(BACKGROUNDS),
    },
    vibe,
    slides,
  };
}
