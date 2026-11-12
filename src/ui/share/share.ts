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

/** Turns a poster already in the document into a 1080×1920 PNG. */
export async function renderPoster(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image');
  await document.fonts.ready;
  const blob = await toBlob(node, {
    width: POSTER.width,
    height: POSTER.height,
    pixelRatio: 1,
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
