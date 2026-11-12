import type { SlideKind } from '../core';

/** Middle of the story: alternates between the beat, the melody and the full arrangement. */
const MIDDLE = [2, 1, 4] as const;

/**
 * Which musical scene (see SCENES in synth.ts) goes with each slide: the story opens with
 * pads only, builds up, holds its breath on the quizzes, goes all in for the people and the
 * verdict, and winds down on the final card.
 */
export function sceneFor(kind: SlideKind, index: number): number {
  switch (kind) {
    case 'intro':
      return 0;
    case 'total':
      return 1;
    case 'quiz':
    case 'owls':
      return 3;
    case 'people':
    case 'vibe':
    case 'race':
      return 4;
    case 'summary':
      return 5;
    default:
      return MIDDLE[index % MIDDLE.length] as number;
  }
}
