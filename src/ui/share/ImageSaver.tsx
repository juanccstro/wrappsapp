import { useEffect, useMemo, useState } from 'react';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import { CloseIcon, DownloadIcon, LockIcon, ShareIcon } from '../components/icons';
import { saveImage, saveTarget, shareOrDownload } from './share';

export type ReadyImage = {
  blob: Blob;
  fileName: string;
  /** A tall image (the report): scrolls instead of fitting the screen. */
  long?: boolean;
  /** False: made smaller and watermarked (the chat is not unlocked). */
  hd?: boolean;
};

/**
 * A finished image, shown before saving it. Rendering takes a moment, and phones only open
 * the share sheet (the way to the gallery on iPhone) right after a tap: so the image is made
 * first and saved with a second tap here. It can also be long-pressed and saved directly.
 */
export function ImageSaver({
  image,
  onClose,
  onUnlock,
}: {
  image: ReadyImage | null;
  onClose: () => void;
  /** Offered under a watermarked image: unlock the chat to get it in HD, without the mark. */
  onUnlock?: () => void;
}) {
  const url = useMemo(() => (image ? URL.createObjectURL(image.blob) : null), [image]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  const [busy, setBusy] = useState(false);
  const target = saveTarget();

  useEffect(() => {
    if (!image) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image, onClose]);

  if (!image || !url) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={es.share.saveTitle}
      data-no-nav
      className="absolute inset-0 z-50 flex flex-col bg-[#07020f]/90 px-4 pt-4 pb-5 backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-black">{es.share.saveTitle}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={es.billing.close}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20"
        >
          <CloseIcon />
        </button>
      </div>
      <div
        className={`mt-3 min-h-0 flex-1 rounded-2xl bg-black/30 ${image.long ? 'touch-pan-y overflow-y-auto overscroll-contain' : 'flex items-center justify-center'}`}
      >
        {/* A real <img>: long-press (or right click) offers «Guardar imagen». */}
        <img
          src={url}
          alt={es.share.saveTitle}
          className={`mx-auto block select-auto ${image.long ? 'w-full max-w-sm' : 'h-full w-auto max-w-full object-contain'}`}
          style={{ WebkitTouchCallout: 'default' }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-white/70">
        {target === 'desktop' ? es.share.saveHintDesktop : es.share.saveHint}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          className="!px-3"
          disabled={busy}
          onClick={() => void run(() => saveImage(image.blob, image.fileName))}
        >
          <DownloadIcon />
          {target === 'desktop' ? es.share.saveDownload : es.share.saveGallery}
        </Button>
        <Button
          variant="secondary"
          className="!px-3"
          disabled={busy}
          onClick={() => void run(() => shareOrDownload(image.blob, image.fileName, es.app.name))}
        >
          <ShareIcon />
          {es.share.saveShare}
        </Button>
      </div>
      {image.hd === false && onUnlock && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onUnlock();
          }}
          className="mt-3 flex min-h-9 cursor-pointer items-center justify-center gap-1.5 text-xs font-semibold text-white/85"
        >
          <LockIcon className="text-[var(--wr-hi)]" />
          {es.share.hdLocked}
          <span className="underline underline-offset-4">{es.share.hdUnlock}</span>
        </button>
      )}
    </div>
  );
}
