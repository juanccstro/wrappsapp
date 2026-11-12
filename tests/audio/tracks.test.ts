import { describe, expect, it } from 'vitest';
import { pickTrack, type Track } from '../../src/audio/tracks';

const track = (id: string, vibes: string[], bpm = 120): Track => ({
  id,
  file: id + '.mp3',
  title: id,
  author: 'Alguien',
  license: 'CC0',
  url: 'https://example.com',
  bpm,
  vibes,
});

describe('choosing the music', () => {
  const tracks = [
    track('noche', ['madrugada']),
    track('fiesta', ['risas', 'caos']),
    track('comodin', []),
  ];

  it('returns nothing without tracks, so the synth plays instead', () => {
    expect(pickTrack([], 'risas', 'seed')).toBeNull();
  });

  it('prefers tracks that suit the personality of the chat', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      expect(['noche', 'comodin']).toContain(pickTrack(tracks, 'madrugada', seed)?.id);
    }
    expect(pickTrack([track('noche', ['madrugada'])], 'risas', 'x')?.id).toBe('noche');
  });

  it('gives the same chat the same track, whatever the order of the manifest', () => {
    const first = pickTrack(tracks, 'risas', 'seed-1');
    expect(pickTrack(tracks.slice().reverse(), 'risas', 'seed-1')).toEqual(first);
    const picks = new Set(
      Array.from({ length: 30 }, (_, i) => pickTrack(tracks, 'risas', 'seed-' + i)?.id),
    );
    expect(picks).toEqual(new Set(['fiesta', 'comodin']));
  });
});
