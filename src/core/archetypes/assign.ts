import type { Analytics, PersonStats } from '../analytics';
import type { ArchetypeId } from '../templates/es/archetypes';

type Context = { people: number; totalDays: number; mediaTypesKnown: boolean };

type Rule = {
  id: Exclude<ArchetypeId, 'classic'>;
  /** What is compared between people (higher = more of this archetype). Null = no data. */
  feature: (p: PersonStats, c: Context) => number | null;
  /** Absolute minimum to deserve it, whatever the rest of the group does. */
  eligible: (p: PersonStats, c: Context) => boolean;
};

const per = (count: number, p: PersonStats) => (p.messages > 0 ? count / p.messages : 0);

/**
 * The order is the tie-break: when two archetypes fit a person equally well, the one listed
 * first wins.
 */
export const RULES: readonly Rule[] = [
  {
    id: 'owl',
    feature: (p) => p.nightShare,
    eligible: (p) => p.nightShare >= 0.08 && p.nightShare * p.messages >= 10,
  },
  {
    id: 'podcaster',
    feature: (p, c) => (c.mediaTypesKnown ? per(p.audios, p) : null),
    eligible: (p) => p.audios >= 15,
  },
  {
    id: 'lightning',
    feature: (p) => (p.medianReplyMinutes === null ? null : -p.medianReplyMinutes),
    eligible: (p) => p.replies >= 15 && p.medianReplyMinutes !== null && p.medianReplyMinutes <= 3,
  },
  {
    id: 'mystery',
    feature: (p) => -p.share,
    eligible: (p, c) => c.people >= 3 && p.messages >= 1 && p.share <= 0.6 / c.people,
  },
  {
    id: 'starter',
    feature: (p) => p.conversationsStarted,
    eligible: (p) => p.conversationsStarted >= 8,
  },
  {
    id: 'essayist',
    feature: (p) => p.avgWords,
    eligible: (p) => p.avgWords >= 9 && p.words >= 200,
  },
  {
    id: 'memeLord',
    feature: (p, c) => (c.mediaTypesKnown ? per(p.stickers + p.gifs, p) : null),
    eligible: (p) => p.stickers + p.gifs >= 15,
  },
  { id: 'correspondent', feature: (p) => per(p.links, p), eligible: (p) => p.links >= 8 },
  { id: 'laugher', feature: (p) => per(p.laughs, p), eligible: (p) => p.laughs >= 15 },
  { id: 'interrogator', feature: (p) => per(p.questions, p), eligible: (p) => p.questions >= 15 },
  { id: 'shouter', feature: (p) => per(p.shouts, p), eligible: (p) => p.shouts >= 8 },
  {
    id: 'doubleTexter',
    feature: (p) => per(p.doubleTexts + p.tripleTexts, p),
    eligible: (p) => p.doubleTexts + p.tripleTexts >= 15,
  },
  {
    id: 'emojiWalker',
    feature: (p) => per(p.emojis, p),
    eligible: (p) => p.emojis >= 25 && p.favoriteEmoji !== null,
  },
  {
    id: 'earlyBird',
    feature: (p) => p.earlyShare,
    eligible: (p) => p.earlyShare >= 0.08 && p.earlyShare * p.messages >= 10,
  },
  { id: 'regretful', feature: (p) => per(p.deleted, p), eligible: (p) => p.deleted >= 5 },
  { id: 'editor', feature: (p) => per(p.edited, p), eligible: (p) => p.edited >= 5 },
  {
    id: 'glue',
    feature: (p) => p.replyEvenness,
    eligible: (p, c) => c.people >= 3 && p.replyEvenness !== null && p.replyEvenness >= 0.85,
  },
  {
    id: 'monologuist',
    feature: (p) => p.longestMonologue,
    eligible: (p) => p.longestMonologue >= 6,
  },
  { id: 'pollster', feature: (p) => p.polls, eligible: (p) => p.polls >= 3 },
  {
    id: 'comeback',
    feature: (p) => p.longestAbsenceDays,
    eligible: (p) => p.longestAbsenceDays >= 21,
  },
  {
    id: 'engine',
    feature: (p) => p.share,
    eligible: (p, c) => (c.people >= 3 ? p.share >= 1.5 / c.people : p.share >= 0.6),
  },
  {
    id: 'telegraph',
    feature: (p) => (p.avgWords > 0 ? -p.avgWords : null),
    eligible: (p) => p.avgWords > 0 && p.avgWords <= 3 && p.messages >= 30,
  },
  {
    id: 'optimist',
    feature: (p) => p.positivity,
    eligible: (p) => p.positivity !== null && p.positivity >= 0.85 && p.positiveMessages >= 15,
  },
  {
    id: 'constant',
    feature: (p, c) => (c.totalDays > 0 ? p.activeDays / c.totalDays : null),
    eligible: (p, c) => c.totalDays >= 14 && p.activeDays / c.totalDays >= 0.6,
  },
  {
    id: 'paparazzi',
    feature: (p) => per(p.media, p),
    eligible: (p) => p.media >= 20,
  },
];

/**
 * Traits based on a handful of events (a few polls, a few edits) produce extreme z-scores,
 * because almost nobody else has any. They count less than traits backed by many messages,
 * so someone who writes 250 messages at night is an owl before being "the one who edited 18".
 */
const WEIGHTS: Partial<Record<Rule['id'], number>> = {
  regretful: 0.7,
  editor: 0.7,
  pollster: 0.7,
  comeback: 0.7,
  monologuist: 0.8,
  glue: 0.8,
  optimist: 0.8,
  constant: 0.8,
  paparazzi: 0.9,
};
const MAX_Z = 2;

export type Assignment = { idx: number; archetype: ArchetypeId; score: number };

/** How far each person is from the group average, in standard deviations. */
function zScores(values: (number | null)[]): (number | null)[] {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return values.map(() => null);
  const mean = known.reduce((sum, v) => sum + v, 0) / known.length;
  const variance = known.reduce((sum, v) => sum + (v - mean) ** 2, 0) / known.length;
  const std = Math.sqrt(variance);
  return values.map((v) => (v === null ? null : std > 0 ? (v - mean) / std : 0));
}

/**
 * One archetype per person, comparing everyone inside their own group. Greedy: the strongest
 * (person, archetype) match is settled first and each archetype is used once; only if someone
 * is left without options do archetypes repeat, and "classic" is the last resort.
 */
export function assignArchetypes(analytics: Analytics): Assignment[] {
  const people = analytics.people;
  const context: Context = {
    people: people.length,
    totalDays: analytics.range?.totalDays ?? 0,
    mediaTypesKnown: analytics.mediaTypesKnown,
  };

  type Candidate = { idx: number; rule: number; score: number };
  const candidates: Candidate[] = [];
  RULES.forEach((rule, ruleIdx) => {
    const scores = zScores(people.map((p) => rule.feature(p, context)));
    people.forEach((p, idx) => {
      const score = scores[idx];
      if (score === null || score === undefined || !rule.eligible(p, context)) return;
      candidates.push({
        idx,
        rule: ruleIdx,
        score: Math.min(score, MAX_Z) * (WEIGHTS[rule.id] ?? 1),
      });
    });
  });
  candidates.sort((x, y) => y.score - x.score || x.rule - y.rule || x.idx - y.idx);

  const result = new Map<number, Assignment>();
  const used = new Set<number>();
  for (const c of candidates) {
    if (result.has(c.idx) || used.has(c.rule)) continue;
    used.add(c.rule);
    result.set(c.idx, { idx: c.idx, archetype: (RULES[c.rule] as Rule).id, score: c.score });
  }
  // Second pass: repeats allowed.
  for (const c of candidates) {
    if (result.has(c.idx)) continue;
    result.set(c.idx, { idx: c.idx, archetype: (RULES[c.rule] as Rule).id, score: c.score });
  }

  return people.map(
    (p) => result.get(p.idx) ?? { idx: p.idx, archetype: 'classic' as const, score: 0 },
  );
}
