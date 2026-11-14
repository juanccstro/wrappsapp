import type { SlideKind } from '../core';

/**
 * The slides a chat that is not unlocked shows blurred, with a lock: the ones people most
 * want to see (who wins the rankings, the awards, each person's card). The rest of the
 * Wrapped plays in full, so a free Wrapped is still worth watching and sharing.
 */
export const LOCKED_KINDS: ReadonlySet<SlideKind> = new Set<SlideKind>([
  'ranking',
  'replySpeed',
  'starterVsMystery',
  'graph',
  'people',
]);

export const isLockedSlide = (kind: SlideKind, unlocked: boolean) =>
  !unlocked && LOCKED_KINDS.has(kind);
