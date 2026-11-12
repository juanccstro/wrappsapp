import { createRng } from '../core';

/** One entry of public/audio/tracks.json. */
export type Track = {
  id: string;
  file: string;
  title: string;
  author: string;
  license: string;
  url: string;
  bpm: number;
  /** Chat personalities this track suits. Empty = any. */
  vibes: string[];
};

const isTrack = (value: unknown): value is Track => {
  const t = value as Partial<Track> | null;
  return (
    typeof t === 'object' &&
    t !== null &&
    typeof t.id === 'string' &&
    typeof t.file === 'string' &&
    typeof t.title === 'string' &&
    typeof t.bpm === 'number' &&
    t.bpm > 0
  );
};

const audioUrl = (file: string) => `${import.meta.env.BASE_URL}audio/${file}`;

/** Reads the manifest. Any problem (missing file, bad JSON) simply means "no tracks". */
export async function loadTracks(): Promise<Track[]> {
  try {
    const response = await fetch(audioUrl('tracks.json'));
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter(isTrack).map((t) => ({
      ...t,
      author: t.author ?? '',
      license: t.license ?? '',
      url: t.url ?? '',
      vibes: Array.isArray(t.vibes) ? t.vibes : [],
    }));
  } catch {
    return [];
  }
}

export const trackUrl = (track: Track) => audioUrl(track.file);

/**
 * The track of a Wrapped: one that suits the personality of the chat if there is any,
 * otherwise any track; which one is decided by the seed, so a chat always gets the same music.
 */
export function pickTrack(tracks: readonly Track[], vibe: string, seed: string): Track | null {
  if (tracks.length === 0) return null;
  const sorted = tracks.slice().sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const fitting = sorted.filter((t) => t.vibes.length === 0 || t.vibes.includes(vibe));
  return createRng(seed, 'music').pick(fitting.length > 0 ? fitting : sorted);
}
