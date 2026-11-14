import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WrappedResult } from '../../core';
import type { ReadyImage } from './ImageSaver';
import { PersonPoster, SummaryPoster, type PosterCard } from './Posters';
import { posterFileName, renderPoster, type ShareTarget } from './share';

export type ShareStatus = 'idle' | 'working' | 'error';

/**
 * Turns a poster into an image. The poster is mounted off-screen at its real size only while
 * it is being captured, so it costs nothing the rest of the time. The image then waits in
 * `ready` for the tap that saves or shares it (ImageSaver): phones only open the share sheet
 * right after a tap, and rendering takes longer than that.
 * `hd` (an unlocked chat): full size and no watermark; otherwise smaller and watermarked.
 */
export function usePosterExport<T>(options: {
  render: (target: T, watermark: boolean) => ReactNode;
  fileName: (target: T) => string;
  hd: boolean;
}) {
  const { render, fileName, hd } = options;
  const [target, setTarget] = useState<T | null>(null);
  const [ready, setReady] = useState<ReadyImage | null>(null);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const node = useRef<HTMLDivElement>(null);
  const pending = useRef<{ resolve: (blob: Blob) => void; reject: (err: unknown) => void } | null>(
    null,
  );

  /** Renders a poster and returns the PNG. */
  const make = useCallback(
    (next: T) =>
      new Promise<Blob>((resolve, reject) => {
        pending.current?.reject(new Error('superseded'));
        pending.current = { resolve, reject };
        setTarget(next);
      }),
    [],
  );

  useEffect(() => {
    if (target === null) return;
    let alive = true;
    const job = pending.current;
    // Two frames so the poster is laid out and painted before capturing it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const element = node.current;
        if (!alive || !element) return;
        renderPoster(element, hd)
          .then((blob) => job?.resolve(blob))
          .catch((err: unknown) => job?.reject(err))
          .finally(() => {
            if (alive) setTarget(null);
          });
      }),
    );
    return () => {
      alive = false;
    };
  }, [target, hd]);

  const run = useCallback(
    async (next: T) => {
      setStatus('working');
      try {
        const blob = await make(next);
        setReady({ blob, fileName: fileName(next), hd });
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [make, fileName, hd],
  );

  const content = target === null ? null : render(target, !hd);
  const poster = content ? (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}
    >
      <div ref={node}>{content}</div>
    </div>
  ) : null;

  const clearReady = useCallback(() => setReady(null), []);

  return { run, make, status, poster, ready, clearReady };
}

/** The final card or a person card of a Wrapped. */
export function useShare(wrapped: WrappedResult, hd: boolean) {
  const render = useCallback(
    (target: ShareTarget, watermark: boolean): ReactNode => {
      if (target.type === 'summary') {
        const slide = wrapped.slides.find((s) => s.kind === 'summary');
        return slide?.kind === 'summary' ? (
          <SummaryPoster wrapped={wrapped} slide={slide} watermark={watermark} />
        ) : null;
      }
      const card: PosterCard | undefined = cardsOf(wrapped).find((c) => c.idx === target.idx);
      return card ? (
        <PersonPoster
          card={card}
          palette={wrapped.theme.palette}
          period={wrapped.period.label}
          chatName={wrapped.chatName}
          watermark={watermark}
        />
      ) : null;
    },
    [wrapped],
  );
  const fileName = useCallback((target: ShareTarget) => posterFileName(wrapped, target), [wrapped]);
  return usePosterExport({ render, fileName, hd });
}

export function cardsOf(wrapped: WrappedResult): PosterCard[] {
  const people = wrapped.slides.find((s) => s.kind === 'people');
  return people?.kind === 'people' ? people.data.cards : [];
}
