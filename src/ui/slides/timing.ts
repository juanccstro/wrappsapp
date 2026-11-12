import type { Slide } from '../../core';

/**
 * How long each slide's own animation runs, so the story never moves on before it ends.
 * The numbers mirror the delays and durations used by the slide components; keep them in
 * sync when an animation changes.
 */

/** Time to look at the finished animation before the story moves on. */
export const SETTLE_MS = 3500;

/** Bar chart race: waits for the title, then one step per month. */
export const RACE_START_MS = 900;
/** Fast for long periods, unhurried for short ones: the whole race takes 4–10 s. */
export const raceStepMs = (months: number) =>
  Math.round(Math.max(170, Math.min(450, 6000 / Math.max(1, months))));
/** The last bars still glide into place after the last step. */
const RACE_TAIL_MS = 600;

/** Reply race: lane i arrives after 0.5 s + 0.9 s + i × 0.55 s. */
const replyRaceMs = (lanes: number) => 500 + 900 + Math.max(0, lanes - 1) * 550;

/** Ranked list: row i lands after delay + 0.15 s + i × 0.12 s + 0.9 s. */
const rankListMs = (delayS: number, rows: number) =>
  Math.round((delayS + 0.15 + Math.max(0, rows - 1) * 0.12 + 0.9) * 1000);

/** When the slide's animation is over (ms from the moment it appears). */
export function animationEndMs(slide: Slide): number {
  switch (slide.kind) {
    case 'race': {
      const months = slide.data.months.length;
      return RACE_START_MS + Math.max(0, months - 1) * raceStepMs(months) + RACE_TAIL_MS;
    }
    case 'replySpeed':
      return replyRaceMs(Math.min(5, slide.data.ranking.length));
    case 'graph':
      // Up to 8 people → 28 links drawn one after another (0.5 s + i × 0.05 s + 0.8 s).
      return 500 + 27 * 50 + 800;
    case 'clock':
      return 400 + 23 * 45 + 350;
    case 'laughs':
      return rankListMs(1.3, Math.min(3, slide.data.ranking.length));
    case 'owls':
    case 'ranking':
      return rankListMs(0.9, slide.data.ranking.length);
    case 'images':
      return Math.max(
        rankListMs(0.8, slide.data.ranking.length),
        1500 + Math.max(0, slide.data.reactions.length - 1) * 350 + 700,
      );
    case 'total':
      return 2200;
    default:
      return 2000;
  }
}

/** A slide lasts its planned time, or longer if its animation needs it. */
export function slideDurationMs(slide: Slide): number {
  return Math.max(slide.durationMs, animationEndMs(slide) + SETTLE_MS);
}
