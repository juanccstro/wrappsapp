import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { PersonCard } from '../../core';
import { es } from '../../i18n/es';
import { ChevronIcon, ShareIcon } from '../components/icons';
import { Avatar, type SlideCtx } from './common';

/** Time each card stays on screen. The player stretches the slide to fit them all. */
export const CARD_MS = 5200;

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

/** A swipe this long (or this fast) changes card. */
const SWIPE_PX = 60;
const SWIPE_SPEED = 400;

/**
 * The parade: one card after another, on their own, and the user can also swipe (or tap the
 * arrows and dots) to go back and forth. Swiping never touches the story clock: the slide
 * lasts the same either way, long enough to see every card.
 */
export function PersonCards({ cards, ctx }: { cards: PersonCard[]; ctx: SlideCtx }) {
  const count = cards.length;
  // [current card, direction of the last change] so the cards slide the right way.
  const [[step, dir], setStep] = useState<[number, number]>([0, 1]);

  const goTo = (next: number) => {
    const clamped = Math.min(count - 1, Math.max(0, next));
    if (clamped !== step) setStep([clamped, clamped > step ? 1 : -1]);
  };

  // Auto-advance. Restarts on every change, so a card picked by hand gets its full time.
  useEffect(() => {
    if (!ctx.running || ctx.reduced || step >= count - 1) return;
    const timer = setTimeout(() => setStep(([s]) => [Math.min(count - 1, s + 1), 1]), CARD_MS);
    return () => clearTimeout(timer);
  }, [step, count, ctx.running, ctx.reduced]);

  // With reduced motion: a plain list, nothing moves.
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

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_SPEED) goTo(step + 1);
    else if (info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_SPEED) goTo(step - 1);
  };

  const arrow =
    'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/30 text-lg text-white transition-opacity hover:bg-black/45 disabled:pointer-events-none disabled:opacity-0';

  return (
    // The whole block is the cards' own: the story ignores taps and swipes here.
    <div data-no-nav role="group" aria-roledescription="carrusel">
      <div className="relative">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div
            key={card.idx}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 120, rotate: d * 4, scale: 0.94 }),
              center: { opacity: 1, x: 0, rotate: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -120, rotate: d * -4, scale: 0.94 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.55}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing"
            aria-label={es.slides.cardOf(step + 1, count)}
          >
            <PersonCardView card={card} reduced={false} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className={arrow}
          aria-label={es.slides.previousCard}
          disabled={step === 0}
          onClick={() => goTo(step - 1)}
        >
          <ChevronIcon className="rotate-180" />
        </button>
        <button
          type="button"
          disabled={ctx.sharing}
          onClick={() => ctx.onShare({ type: 'person', idx: card.idx })}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-black/35 px-5 text-sm font-bold whitespace-nowrap hover:bg-black/50 disabled:opacity-60"
        >
          <ShareIcon />
          {/* Narrow phones show just "Compartir"; the accessible name stays complete. */}
          {es.share.share}
          <span className="max-[380px]:sr-only">{es.share.shareCardRest}</span>
        </button>
        <button
          type="button"
          className={arrow}
          aria-label={es.slides.nextCard}
          disabled={step >= count - 1}
          onClick={() => goTo(step + 1)}
        >
          <ChevronIcon />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap justify-center">
        {cards.map((c, i) => (
          <button
            key={c.idx}
            type="button"
            aria-label={es.slides.cardOf(i + 1, count)}
            aria-current={i === step}
            onClick={() => goTo(i)}
            className="flex h-6 cursor-pointer items-center px-1"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
