import { AnimatePresence, motion } from 'framer-motion';
import { useRef, type PointerEvent } from 'react';
import type { PersonCard } from '../../core';
import { es } from '../../i18n/es';
import { ShareIcon } from '../components/icons';
import { Avatar, useTicker, type SlideCtx } from './common';

/** Time each card stays on screen. The player stretches the slide to fit them all. */
export const CARD_MS = 3600;

/**
 * One collectible card: 3D entrance, tilt that follows the pointer and a holographic sheen.
 * Also the element that Phase 7 exports as an image, hence the fixed 3:4 proportion.
 */
export function PersonCardView({ card, reduced }: { card: PersonCard; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reduced) return;
    const box = el.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div className="[perspective:900px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[1.75rem] border-2 border-white/70 bg-[var(--wr-bg)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-out [transform-style:preserve-3d]"
      >
        {/* Holographic sheen */}
        <div
          aria-hidden="true"
          className="wr-anim pointer-events-none absolute -inset-y-1/2 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent mix-blend-overlay"
          style={{ animation: 'wr-holo 3.2s ease-in-out infinite' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'linear-gradient(135deg, var(--wr-a), transparent 40%), linear-gradient(315deg, var(--wr-c), transparent 45%)',
          }}
        />

        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar idx={card.idx} name={card.name} size={64} />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-black">{card.name}</p>
              <p className="mt-1 inline-block rounded-full bg-[var(--wr-hi)] px-3 py-0.5 text-xs font-bold text-[#12062b]">
                {card.label}
              </p>
            </div>
          </div>

          <p className="font-display text-lg leading-tight font-black text-balance">{card.title}</p>
          <p className="text-sm leading-snug text-white/90">{card.phrase}</p>

          <dl className="grid grid-cols-3 gap-2">
            {card.stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/12 px-2 py-2 text-center">
                <dd className="font-display text-[0.8rem] leading-tight font-black text-balance">
                  {stat.value}
                </dd>
                <dt className="mt-0.5 text-[0.65rem] leading-tight text-white/75">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

/** The parade: one card after another. */
export function PersonCards({ cards, ctx }: { cards: PersonCard[]; ctx: SlideCtx }) {
  // With reduced motion the ticker starts at the end, so show a plain list instead.
  const step = useTicker(cards.length, CARD_MS, ctx);

  if (ctx.reduced) {
    return (
      <ul className="flex flex-col gap-2 overflow-y-auto" data-no-nav>
        {cards.map((card) => (
          <li key={card.idx} className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2">
            <Avatar idx={card.idx} name={card.name} size={40} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--wr-hi)]">
                {card.name} · {card.label}
              </p>
              <p className="font-display text-sm leading-snug font-bold">{card.title}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const card = cards[step];
  if (!card) return null;

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={card.idx}
          initial={{ opacity: 0, rotateY: 80, scale: 0.9 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: -60, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 130, damping: 16 }}
          style={{ transformPerspective: 900 }}
        >
          <PersonCardView card={card} reduced={false} />
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 flex justify-center" data-no-nav>
        <button
          type="button"
          disabled={ctx.sharing}
          onClick={() => ctx.onShare({ type: 'person', idx: card.idx })}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-black/35 px-5 text-sm font-bold hover:bg-black/50 disabled:opacity-60"
        >
          <ShareIcon />
          {es.share.shareCard}
        </button>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {cards.map((c, i) => (
          <span
            key={c.idx}
            className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
