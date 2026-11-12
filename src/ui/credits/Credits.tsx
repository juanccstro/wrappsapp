import { useEffect, useState } from 'react';
import { loadTracks, type Track } from '../../audio/tracks';
import { es } from '../../i18n/es';
import { BackIcon } from '../components/icons';

/** Who made the music, the fonts and the software. Tracks come from tracks.json. */
export function Credits({ onBack }: { onBack: () => void }) {
  const [tracks, setTracks] = useState<Track[] | null>(null);

  useEffect(() => {
    let alive = true;
    void loadTracks().then((list) => {
      if (alive) setTracks(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-6 pb-6">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-10 cursor-pointer items-center gap-1 self-start text-sm font-semibold text-white/80 hover:text-white"
      >
        <BackIcon />
        {es.upload.back}
      </button>

      <h1 className="font-display text-3xl leading-tight font-black">{es.credits.title}</h1>

      <section className="rounded-2xl bg-white/5 p-4">
        <h2 className="font-display text-sm font-bold">{es.credits.music}</h2>
        {tracks && tracks.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {tracks.map((track) => (
              <li key={track.id}>
                <p className="font-semibold">
                  {track.title}
                  {track.author && (
                    <span className="font-normal text-white/75"> · {track.author}</span>
                  )}
                </p>
                <p className="text-white/75">
                  {track.license}
                  {track.url && (
                    <>
                      {' · '}
                      <a
                        href={track.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline underline-offset-2"
                      >
                        {es.credits.source}
                      </a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            {tracks ? es.credits.synth : es.credits.loading}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white/5 p-4">
        <h2 className="font-display text-sm font-bold">{es.credits.fonts}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85">{es.credits.fontsDetail}</p>
      </section>

      <section className="rounded-2xl bg-white/5 p-4">
        <h2 className="font-display text-sm font-bold">{es.credits.software}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85">{es.credits.softwareDetail}</p>
      </section>

      <p className="mt-auto text-center text-xs text-white/60">{es.app.disclaimer}</p>
    </main>
  );
}
