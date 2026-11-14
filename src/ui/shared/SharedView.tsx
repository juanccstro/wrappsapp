import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatNumber } from '../../core/templates/es/format';
import { es } from '../../i18n/es';
import { Background } from '../backgrounds/Background';
import { Button } from '../components/Shell';
import { LockIcon } from '../components/icons';
import { decodeShared, type SharedCard, type SharedWrapped } from '../share/groupLink';
import { ImageSaver } from '../share/ImageSaver';
import { PersonPoster } from '../share/Posters';
import { slugify } from '../share/share';
import { usePosterExport } from '../share/useShare';
import { Avatar } from '../slides/common';
import { paletteVars } from '../theme/palettes';

const t = es.shared;

/** One person's card, as the group sees it in the link. */
function Card({ card, onMine, busy }: { card: SharedCard; onMine: () => void; busy: boolean }) {
  return (
    <li className="rounded-3xl bg-white/10 p-4">
      <div className="flex items-center gap-3">
        <Avatar idx={card.idx} name={card.name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight font-black">{card.name}</p>
          <p className="truncate text-sm font-bold text-[var(--wr-hi)]">{card.label}</p>
        </div>
      </div>
      <p className="mt-3 font-display text-base leading-snug font-bold">{card.title}</p>
      <p className="mt-1 text-sm leading-snug text-white/85">{card.phrase}</p>
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        {card.stats.slice(0, 3).map((s) => (
          <div key={s.label} className="rounded-xl bg-black/20 px-2 py-1.5">
            <dt className="text-[0.65rem] leading-tight text-white/70">{s.label}</dt>
            <dd className="mt-0.5 text-sm leading-tight font-bold break-words">{s.value}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" className="mt-3 w-full" disabled={busy} onClick={onMine}>
        {t.mine}
      </Button>
    </li>
  );
}

function Shell({ shared, children }: { shared: SharedWrapped | null; children: ReactNode }) {
  return (
    <main
      className="relative h-full overflow-hidden bg-[var(--wr-bg)]"
      style={shared ? paletteVars(shared.palette) : undefined}
    >
      {shared && (
        <div className="absolute inset-0 opacity-70">
          <Background kind={shared.background} seed={shared.vibe} position={0} />
        </div>
      )}
      <div className="relative flex h-full flex-col">{children}</div>
    </main>
  );
}

/**
 * What someone sees when they open a link sent to the group: the podium and the person cards
 * (blurred if the sharer has not unlocked the chat), their own story card, and the way to
 * make theirs. Nothing here comes from a server: it is all in the link.
 */
export function SharedView({ hash, onMakeYours }: { hash: string; onMakeYours: () => void }) {
  const [shared, setShared] = useState<SharedWrapped | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void decodeShared(hash).then((data) => alive && setShared(data));
    return () => {
      alive = false;
    };
  }, [hash]);

  const render = useCallback(
    (card: SharedCard, watermark: boolean) =>
      shared ? (
        <PersonPoster
          card={card}
          palette={shared.palette}
          period={shared.period}
          chatName={shared.chatName}
          watermark={watermark}
        />
      ) : null,
    [shared],
  );
  const fileName = useCallback((card: SharedCard) => {
    const slug = slugify(card.name);
    return `wrappsapp${slug ? `-${slug}` : ''}.png`;
  }, []);
  const poster = usePosterExport({ render, fileName, hd: shared?.hd ?? false });

  if (shared === undefined) return <Shell shared={null}>{null}</Shell>;

  const cta = (
    <div className="border-t border-white/10 bg-[var(--wr-bg)]/85 px-5 pt-3 pb-5 backdrop-blur-md">
      <Button className="w-full" onClick={onMakeYours}>
        {t.cta}
      </Button>
      <p className="mt-2 text-center text-xs text-white/70">{t.ctaHint}</p>
    </div>
  );

  if (shared === null) {
    return (
      <Shell shared={null}>
        <div className="flex flex-1 flex-col justify-center gap-3 px-6">
          <h1 className="font-display text-3xl font-black">{t.broken}</h1>
          <p className="text-white/80">{t.brokenText}</p>
        </div>
        {cta}
      </Shell>
    );
  }

  const [first, second, third] = shared.podium;
  const podium = [second, first, third].filter(Boolean) as SharedWrapped['podium'];

  return (
    <Shell shared={shared}>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-6">
        <p className="font-display text-xs font-bold tracking-widest text-[var(--wr-hi)] uppercase">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.02] font-black text-balance">
          {shared.chatName ?? t.fallbackTitle}
        </h1>
        <p className="mt-2 text-sm text-white/80">{shared.period}</p>
        <p className="mt-3 inline-block rounded-full bg-[var(--wr-hi)] px-3 py-1 font-display text-sm font-black text-[#12062b]">
          {shared.vibe}
        </p>

        {podium.length > 0 && (
          <section className="mt-6 rounded-3xl bg-black/25 p-4">
            <h2 className="font-display text-base font-black">{t.podium}</h2>
            <ol className="mt-4 flex items-end justify-around gap-2">
              {podium.map((p) => {
                const top = p === first;
                return (
                  <li key={p.idx} className="flex w-1/3 flex-col items-center text-center">
                    <Avatar idx={p.idx} name={p.name} size={top ? 72 : 56} />
                    <p className="mt-2 w-full truncate font-display text-sm font-black">{p.name}</p>
                    <p className="text-xs text-white/75">
                      {formatNumber(p.messages)} {t.messages}
                    </p>
                    <span
                      className={`mt-2 w-full rounded-t-xl ${top ? 'h-16 bg-[var(--wr-hi)]' : p === second ? 'h-11 bg-white/70' : 'h-8 bg-white/45'}`}
                    />
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-display text-base font-black">{t.cards}</h2>
          {shared.cards ? (
            <>
              <p className="mt-1 text-xs text-white/75">{t.cardsHint}</p>
              <ul className="mt-3 flex flex-col gap-3">
                {shared.cards.map((card) => (
                  <Card
                    key={card.idx}
                    card={card}
                    busy={poster.status === 'working'}
                    onMine={() => void poster.run(card)}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div className="relative mt-3">
              <ul aria-hidden="true" className="flex flex-col gap-3 blur-md select-none">
                {shared.people.slice(0, 4).map((p) => (
                  <li key={p.idx} className="flex items-center gap-3 rounded-3xl bg-white/10 p-4">
                    <Avatar idx={p.idx} name={p.name} size={48} />
                    <div className="flex-1">
                      <p className="font-display text-lg font-black">{p.name}</p>
                      <p className="mt-1 h-3 w-2/3 rounded-full bg-white/30" />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/20 bg-black/50 p-5 text-center backdrop-blur-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--wr-hi)] text-xl text-[#12062b]">
                    <LockIcon />
                  </span>
                  <p className="font-display text-lg font-black">{t.lockedTitle}</p>
                  <p className="text-sm text-white/85">{t.lockedText}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      {cta}
      <p
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute inset-x-6 bottom-32 rounded-2xl bg-black/70 px-4 py-2 text-center text-sm font-semibold transition-opacity ${poster.status === 'idle' ? 'opacity-0' : 'opacity-100'}`}
      >
        {poster.status === 'working'
          ? es.share.working
          : poster.status === 'error'
            ? es.share.error
            : ''}
      </p>
      {poster.poster}
      <ImageSaver image={poster.ready} onClose={poster.clearReady} />
    </Shell>
  );
}
