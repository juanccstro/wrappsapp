import { describe, expect, it } from 'vitest';
import { sceneFor } from '../../src/audio/scenes';
import { SCENES } from '../../src/audio/synth';

describe('music scenes', () => {
  it('opens quietly, holds back on quizzes and winds down at the end', () => {
    expect(sceneFor('intro', 0)).toBe(0);
    expect(sceneFor('quiz', 7)).toBe(3);
    expect(sceneFor('people', 17)).toBe(4);
    expect(sceneFor('summary', 19)).toBe(5);
    expect(SCENES[0]?.kick).toBe('none');
    expect(SCENES[5]?.kick).toBe('none');
  });

  it('keeps changing through the middle of the story', () => {
    const middle = [2, 3, 4, 5, 6].map((i) => sceneFor('words', i));
    expect(new Set(middle).size).toBeGreaterThan(1);
    for (const scene of middle) expect(SCENES[scene]).toBeDefined();
  });
});
