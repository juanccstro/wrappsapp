import type { Analytics, Counted } from '../analytics';
import type { PeriodKind } from '../period/period';
import type { ArchetypeId } from '../templates/es/archetypes';
import type { QuizMetric } from '../templates/es/slides';
import type { VibeId } from '../templates/es/vibes';

/** A person and a number (messages, minutes, audios…), for rankings. */
export type Ranked = { idx: number; value: number };

export type PersonCard = {
  idx: number;
  name: string;
  archetype: ArchetypeId;
  /** Short archetype name: "Búho nocturno". */
  label: string;
  /** Generated title: "Leyenda de la madrugada, sin remedio". */
  title: string;
  phrase: string;
  stats: { label: string; value: string }[];
};

export type RankingTopic = 'podcast' | 'shouts' | 'deleted' | 'questions' | 'monologue';

export const BACKGROUNDS = ['blobs', 'geometry', 'grid3d', 'stars', 'waves'] as const;
export type BackgroundId = (typeof BACKGROUNDS)[number];

/** Number of curated palettes the UI provides. The seed picks an index. */
export const PALETTE_COUNT = 14;

type SlideOf<K extends string, D> = {
  /** Unique inside the Wrapped; also the scope of its random decisions. */
  id: string;
  kind: K;
  title: string;
  body: string;
  /** Auto-advance time. */
  durationMs: number;
  data: D;
};

export type Slide =
  | SlideOf<'intro', { chatName: string | null; people: number }>
  | SlideOf<'total', { messages: number; words: number; perDay: number; days: number }>
  | SlideOf<'busiestDay', { day: string; messages: number; keywords: string[] }>
  | SlideOf<
      'clock',
      { hourTotals: number[]; heatmap: number[][]; peakHour: number; wakeUpHour: number }
    >
  | SlideOf<'emojis', { top: Counted[]; total: number }>
  | SlideOf<'words', { words: Counted[]; bigrams: Counted[] }>
  | SlideOf<'laughs', { total: number; longest: Analytics['laughs']['longest']; ranking: Ranked[] }>
  | SlideOf<
      'quiz',
      {
        metric: QuizMetric;
        /** People to choose from, already shuffled. */
        options: number[];
        answer: number;
        right: string;
        wrong: string;
      }
    >
  | SlideOf<
      'race',
      { months: { month: string; label: string; perPerson: number[] }[]; ranking: Ranked[] }
    >
  | SlideOf<'owls', { ranking: Ranked[] }>
  | SlideOf<'replySpeed', { ranking: Ranked[] }>
  | SlideOf<'graph', { matrix: number[][]; pair: { a: number; b: number; replies: number } }>
  | SlideOf<'starterVsMystery', { starter: Ranked; mystery: Ranked }>
  | SlideOf<
      'streakSilence',
      {
        streak: NonNullable<Analytics['longestStreak']>;
        silence: { minutes: number; brokenBy: number } | null;
      }
    >
  | SlideOf<'ranking', { topic: RankingTopic; ranking: Ranked[] }>
  | SlideOf<
      'images',
      {
        ranking: Ranked[];
        /** Laughing replies that followed a photo: the text and who wrote it. */
        reactions: { text: string; idx: number }[];
      }
    >
  | SlideOf<'fact', { topic: 'subject'; value: number }>
  | SlideOf<'people', { cards: PersonCard[] }>
  | SlideOf<'vibe', { vibeId: VibeId; name: string }>
  | SlideOf<
      'summary',
      { highlights: { label: string; value: string }[]; podium: Ranked[]; vibeName: string }
    >;

export type SlideKind = Slide['kind'];

/**
 * Everything the UI needs to play a Wrapped. Plain data: it can cross the Worker boundary and
 * be serialised, and the same chat always produces exactly the same object.
 */
export type WrappedResult = {
  version: 1;
  seed: string;
  period: { kind: PeriodKind; key: string; label: string };
  /** Group name (or the other person in a two-person chat), if the export reveals it. */
  chatName: string | null;
  isGroup: boolean;
  participants: { idx: number; name: string }[];
  theme: { palette: number; background: BackgroundId };
  vibe: { id: VibeId; name: string; description: string };
  slides: Slide[];
};
