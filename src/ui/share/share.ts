import type { WrappedResult } from '../../core';
import { POSTER } from './Posters';

export type ShareTarget = { type: 'summary' } | { type: 'person'; idx: number };
export type ShareMode = 'share' | 'download';

/** "Los del Insti 🍕" → "los-del-insti". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function posterFileName(wrapped: WrappedResult, target: ShareTarget): string {
  const subject =
    target.type === 'person'
      ? (wrapped.participants[target.idx]?.name ?? '')
      : (wrapped.chatName ?? '');
  const slug = slugify(subject);
  return `wrappsapp${slug ? `-${slug}` : ''}.png`;
}

/** Free posters are exported smaller (720×1280); unlocked ones in full HD (1080×1920). */
export const FREE_POSTER_SCALE = 2 / 3;

/** Turns a poster already in the document into a PNG: 1080×1920 in HD, smaller if not. */
export async function renderPoster(node: HTMLElement, hd = true): Promise<Blob> {
  const { toBlob } = await import('html-to-image');
  await document.fonts.ready;
  const blob = await toBlob(node, {
    width: POSTER.width,
    height: POSTER.height,
    pixelRatio: hd ? 1 : FREE_POSTER_SCALE,
    cacheBust: false,
  });
  if (!blob) throw new Error('Poster could not be rendered');
  return blob;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Native share sheet when the device can share files (phones); otherwise the image is
 * downloaded. Closing the share sheet is not an error.
 */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<void> {
  const file = new File([blob], fileName, { type: 'image/png' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Anything else (permission, unsupported type): fall back to downloading.
    }
  }
  downloadBlob(blob, fileName);
}

/** Phones keep pictures in a gallery that only the share sheet reaches from the web. */
export type SaveTarget = 'ios' | 'android' | 'desktop';

export function saveTarget(): SaveTarget {
  const ua = navigator.userAgent;
  const ipadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || ipadOs) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Saves an image where the device keeps pictures. On iPhone and iPad a download ends up in
 * Files, so the share sheet is used instead: its «Guardar imagen» puts it in Photos. Android
 * saves downloaded images to Download, which the gallery and Google Photos show. Must be
 * called straight from a tap: share sheets need a fresh user gesture.
 */
export async function saveImage(blob: Blob, fileName: string): Promise<void> {
  const target = saveTarget();
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  if (target === 'ios' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  downloadBlob(blob, fileName);
}

/** Captures a long, scrolling element whole (the report) as one tall PNG. */
export async function renderLongImage(node: HTMLElement, background: string): Promise<Blob> {
  const { toBlob } = await import('html-to-image');
  await document.fonts.ready;
  const width = node.scrollWidth;
  const height = node.scrollHeight;
  // 1080 px wide, but under the largest canvas phones can draw (about 16 million pixels).
  const ratio = Math.min(1080 / width, Math.sqrt(16_000_000 / (width * height)), 3);
  const blob = await toBlob(node, {
    width,
    height,
    pixelRatio: ratio,
    backgroundColor: background,
    cacheBust: false,
    style: { height: `${height}px`, overflow: 'visible', maxHeight: 'none' },
  });
  if (!blob) throw new Error('Image could not be rendered');
  return blob;
}
