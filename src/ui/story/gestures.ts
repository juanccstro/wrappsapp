export type StoryAction = 'next' | 'previous' | 'none';

/** Press longer than this and it is "hold to pause", not a tap. */
export const HOLD_MS = 220;
const SWIPE_PX = 48;
const TAP_SLOP_PX = 12;
/** Left part of the screen that goes back on tap, like Instagram stories. */
const BACK_ZONE = 0.3;

export type Gesture = {
  /** Where the finger went down, relative to the stage's left edge. */
  x: number;
  width: number;
  dx: number;
  dy: number;
  /** The press lasted long enough to pause the story. */
  held: boolean;
};

/** What a finished press means. Pure, so it can be tested without a browser. */
export function classifyGesture({ x, width, dx, dy, held }: Gesture): StoryAction {
  if (held) return 'none';
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (horizontal >= SWIPE_PX && horizontal > vertical) return dx < 0 ? 'next' : 'previous';
  if (horizontal <= TAP_SLOP_PX && vertical <= TAP_SLOP_PX) {
    return x < width * BACK_ZONE ? 'previous' : 'next';
  }
  return 'none';
}

export const clampIndex = (index: number, count: number) =>
  Math.min(Math.max(index, 0), Math.max(0, count - 1));
