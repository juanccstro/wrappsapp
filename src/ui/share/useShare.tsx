import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WrappedResult } from '../../core';
import { es } from '../../i18n/es';
import type { ReadyImage } from './ImageSaver';
import { PersonPoster, SummaryPoster } from './Posters';
import {
  posterFileName,
  renderPoster,
  shareOrDownload,
  type ShareMode,
  type ShareTarget,
} from './share';

export type ShareStatus = 'idle' | 'working' | 'error';

/**
 * Exports the final card or a person card as an image. The poster is mounted off-screen at
 * its real size only while it is being captured, so it costs nothing the rest of the time.
 * `hd` (an unlocked chat): full size and no watermark; otherwise smaller and watermarked.
 */
export function useShare(wrapped: WrappedResult, hd: boolean) {
  const [target, setTarget] = useState<ShareTarget | null>(null);
  /** A downloaded image waiting for the tap that saves it (see ImageSaver). */
  const [ready, setReady] = useState<ReadyImage | null>(null);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const node = useRef<HTMLDivElement>(null);
  const pending = useRef<{ resolve: (blob: Blob) => void; reject: (err: unknown) => void } | null>(
    null,
  );

  /** Renders a poster and returns the PNG. */
  const make = useCallback(
    (next: ShareTarget) =>
      new Promise<Blob>((resolve, reject) => {
        pending.current?.reject(new Error('superseded'));
        pending.current = { resolve, reject };
        setTarget(next);
      }),
    [],
  );

  useEffect(() => {
    if (!target) return;
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
    async (next: ShareTarget, mode: ShareMode) => {
      setStatus('working');
      try {
        const blob = await make(next);
        const fileName = posterFileName(wrapped, next);
        if (mode === 'share') await shareOrDownload(blob, fileName, es.app.name);
        else setReady({ blob, fileName });
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [make, wrapped],
  );

  let content: ReactNode = null;
  if (target?.type === 'summary') {
    const slide = wrapped.slides.find((s) => s.kind === 'summary');
    if (slide?.kind === 'summary') {
      content = <SummaryPoster wrapped={wrapped} slide={slide} watermark={!hd} />;
    }
  } else if (target?.type === 'person') {
    const people = wrapped.slides.find((s) => s.kind === 'people');
    const card =
      people?.kind === 'people' ? people.data.cards.find((c) => c.idx === target.idx) : undefined;
    if (card) content = <PersonPoster wrapped={wrapped} card={card} watermark={!hd} />;
  }

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
