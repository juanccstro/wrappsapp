import { describe, expect, it } from 'vitest';
import type { Slide } from '../../src/core';
import {
  animationEndMs,
  RACE_START_MS,
  raceStepMs,
  SETTLE_MS,
  slideDurationMs,
} from '../../src/ui/slides/timing';

const race = (months: number) =>
  ({
    id: 'race',
    kind: 'race',
    durationMs: 9000,
    title: '',
    body: '',
    data: {
      months: Array.from({ length: months }, (_, i) => ({
        month: `2026-${i}`,
        label: '',
        perPerson: [1, 2],
      })),
      ranking: [],
    },
  }) as unknown as Slide;

describe('slides last until their animation is over', () => {
  it.each([3, 12, 24, 60, 120])('a race of %i months ends with time to spare', (months) => {
    const slide = race(months);
    const raceEnd = RACE_START_MS + (months - 1) * raceStepMs(months);
    expect(animationEndMs(slide)).toBeGreaterThan(raceEnd);
    expect(slideDurationMs(slide)).toBeGreaterThanOrEqual(animationEndMs(slide) + SETTLE_MS);
  });

  it('long races speed up instead of lasting forever', () => {
    expect(slideDurationMs(race(120))).toBeLessThan(40_000);
    expect(slideDurationMs(race(60))).toBeLessThan(16_000);
  });

  it('a slide never gets shorter than planned', () => {
    expect(slideDurationMs(race(2))).toBe(9000);
  });
});
