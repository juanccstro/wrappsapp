import { BACKGROUNDS, PALETTE_COUNT, type BackgroundId, type WrappedResult } from '../../core';

/**
 * "Enviar al grupo": a link that shows the group its Wrapped, without the chat. It carries
 * only the podium and the person cards, and only the cards if the sharer unlocked the chat
 * (locked stays locked). Everything travels after the `#`, which browsers never send to any
 * server: the link itself is the data. Never messages, only names, labels and a few numbers.
 */
export type SharedCard = {
  idx: number;
  name: string;
  label: string;
  title: string;
  phrase: string;
  stats: { label: string; value: string }[];
};

export type SharedWrapped = {
  v: 1;
  chatName: string | null;
  period: string;
  palette: number;
  background: BackgroundId;
  vibe: string;
  podium: { idx: number; name: string; messages: number }[];
  /** Everyone in the chat (for the locked cards). */
  people: { idx: number; name: string }[];
  /** Null while the sharer has not unlocked the chat. */
  cards: SharedCard[] | null;
  /** The sharer unlocked the chat: images are HD, without watermark. */
  hd: boolean;
};

const PREFIX = '#w=';
const MAX_PEOPLE = 40;

export function sharedFrom(wrapped: WrappedResult, unlocked: boolean): SharedWrapped {
  const name = (idx: number) => wrapped.participants[idx]?.name ?? '';
  const summary = wrapped.slides.find((s) => s.kind === 'summary');
  const people = wrapped.slides.find((s) => s.kind === 'people');
  return {
    v: 1,
    chatName: wrapped.chatName,
    period: wrapped.period.label,
    palette: wrapped.theme.palette,
    background: wrapped.theme.background,
    vibe: summary?.kind === 'summary' ? summary.data.vibeName : wrapped.vibe.name,
    podium:
      summary?.kind === 'summary'
        ? summary.data.podium.map((p) => ({ idx: p.idx, name: name(p.idx), messages: p.value }))
        : [],
    people: wrapped.participants.slice(0, MAX_PEOPLE).map((p) => ({ idx: p.idx, name: p.name })),
    cards:
      unlocked && people?.kind === 'people'
        ? people.data.cards.slice(0, MAX_PEOPLE).map((c) => ({
            idx: c.idx,
            name: c.name,
            label: c.label,
            title: c.title,
            phrase: c.phrase,
            stats: c.stats,
          }))
        : null,
    hd: unlocked,
  };
}

// base64url over bytes, without btoa's Latin-1 limits.
const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (text: string) => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: GenericTransformStream): Promise<Uint8Array> {
  const out = new Blob([bytes as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** "#w=" + compressed data ("z") or, without CompressionStream, plain data ("p"). */
export async function encodeShared(shared: SharedWrapped): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(shared));
  if (typeof CompressionStream !== 'undefined') {
    const packed = await pipe(json, new CompressionStream('deflate-raw'));
    return `${PREFIX}z${toBase64Url(packed)}`;
  }
  return `${PREFIX}p${toBase64Url(json)}`;
}

export const hasSharedHash = (hash: string) => hash.startsWith(PREFIX);

const str = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
const int = (value: unknown, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

/** Reads a link. Anything malformed (or edited by hand) gives null: never trust the link. */
export async function decodeShared(hash: string): Promise<SharedWrapped | null> {
  if (!hasSharedHash(hash) || hash.length > 60_000) return null;
  try {
    const mode = hash[PREFIX.length];
    const bytes = fromBase64Url(hash.slice(PREFIX.length + 1));
    const json =
      mode === 'z'
        ? await pipe(bytes, new DecompressionStream('deflate-raw'))
        : mode === 'p'
          ? bytes
          : null;
    if (!json) return null;
    const data = JSON.parse(new TextDecoder().decode(json)) as Record<string, unknown>;
    return validate(data);
  } catch {
    return null;
  }
}

function validate(d: Record<string, unknown>): SharedWrapped | null {
  if (d.v !== 1) return null;
  if (!(d.chatName === null || str(d.chatName, 120))) return null;
  if (!str(d.period, 60) || !str(d.vibe, 80)) return null;
  if (!int(d.palette, PALETTE_COUNT - 1)) return null;
  if (!BACKGROUNDS.includes(d.background as BackgroundId)) return null;
  const person = (p: unknown): p is { idx: number; name: string } =>
    typeof p === 'object' &&
    p !== null &&
    int((p as { idx: unknown }).idx, 500) &&
    str((p as { name: unknown }).name, 80);
  if (!Array.isArray(d.people) || d.people.length > MAX_PEOPLE || !d.people.every(person)) {
    return null;
  }
  if (
    !Array.isArray(d.podium) ||
    d.podium.length > 3 ||
    !d.podium.every((p) => person(p) && int((p as unknown as { messages: unknown }).messages, 1e9))
  ) {
    return null;
  }
  const card = (c: unknown): c is SharedCard => {
    if (!person(c)) return false;
    const x = c as unknown as Record<string, unknown>;
    return (
      str(x.label, 80) &&
      str(x.title, 200) &&
      str(x.phrase, 300) &&
      Array.isArray(x.stats) &&
      x.stats.length <= 6 &&
      x.stats.every(
        (s: unknown) =>
          typeof s === 'object' &&
          s !== null &&
          str((s as { label: unknown }).label, 60) &&
          str((s as { value: unknown }).value, 60),
      )
    );
  };
  if (!(
    d.cards === null ||
    (Array.isArray(d.cards) && d.cards.length <= MAX_PEOPLE && d.cards.every(card))
  )) {
    return null;
  }
  return {
    v: 1,
    chatName: d.chatName,
    period: d.period,
    palette: d.palette,
    background: d.background as BackgroundId,
    vibe: d.vibe,
    podium: d.podium as SharedWrapped['podium'],
    people: d.people,
    cards: d.cards as SharedCard[] | null,
    hd: d.hd === true,
  };
}

export type SendResult = 'shared' | 'copied' | 'cancelled' | 'error';

/**
 * Sends a link: the share sheet on phones (straight into WhatsApp), or the clipboard on a
 * computer. Called from the tap, so the share sheet is allowed to open.
 */
export async function sendLink(url: string, text: string): Promise<SendResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'error';
  }
}
