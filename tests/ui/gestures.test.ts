import { describe, expect, it } from 'vitest';
import { clampIndex, classifyGesture } from '../../src/ui/story/gestures';

const press = (over: Partial<Parameters<typeof classifyGesture>[0]>) =>
  classifyGesture({ x: 200, width: 360, dx: 0, dy: 0, held: false, ...over });

describe('story gestures', () => {
  it('taps on the right go forward and taps on the left go back', () => {
    expect(press({ x: 300 })).toBe('next');
    expect(press({ x: 150 })).toBe('next');
    expect(press({ x: 60 })).toBe('previous');
  });

  it('swipes win over the tap position', () => {
    expect(press({ x: 20, dx: -90 })).toBe('next');
    expect(press({ x: 340, dx: 90 })).toBe('previous');
  });

  it('ignores holds, vertical drags and half-hearted moves', () => {
    expect(press({ held: true })).toBe('none');
    expect(press({ dx: -60, dy: 140 })).toBe('none');
    expect(press({ dx: 30 })).toBe('none');
  });

  it('never leaves the list of slides', () => {
    expect([clampIndex(-1, 5), clampIndex(2, 5), clampIndex(9, 5), clampIndex(3, 0)]).toEqual([
      0, 2, 4, 0,
    ]);
  });
});
