import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  type Variant,
  type Variants,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Slide, SlideKind, WrappedResult } from '../../core';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import { CloseIcon, PauseIcon, PlayIcon } from '../components/icons';
import { clampIndex, classifyGesture, HOLD_MS } from './gestures';
import { Background } from '../backgrounds/Background';
import type { SlideCtx } from '../slides/common';
import { CARD_MS } from '../slides/PersonCards';
import { SlideView } from '../slides/SlideView';
import { paletteVars, slideGradient } from '../theme/palettes';

type Props = {
  wrapped: WrappedResult;
  isDemo: boolean;
  /** "Borrar y salir". */
  onClose: () => void;
};

/** The people slide lasts as long as its cards need. */
const durationOf = (slide: Slide) =>
  slide.kind === 'people'
    ? Math.max(slide.durationMs, slide.data.cards.length * CARD_MS + 1200)
    : slide.durationMs;

type Motion = { initial: Variant; exit: Variant };

/** Different kinds of slide arrive in different ways. */
const TRANSITIONS: Record<'zoom' | 'rise' | 'wipe' | 'slide', Motion> = {
  zoom: { initial: { opacity: 0, scale: 1.08 }, exit: { opacity: 0, scale: 0.95 } },
  rise: { initial: { opacity: 0, y: '18%' }, exit: { opacity: 0, y: '-12%' } },
  wipe: {
    initial: { clipPath: 'circle(0% at 50% 60%)', opacity: 1 },
    exit: { opacity: 0, scale: 0.97 },
  },
  slide: { initial: { opacity: 0, x: '30%' }, exit: { opacity: 0, x: '-30%' } },
};

function transitionOf(kind: SlideKind): Motion {
  switch (kind) {
    case 'intro':
    case 'vibe':
    case 'busiestDay':
    case 'quiz':
      return TRANSITIONS.wipe;
    case 'total':
    case 'laughs':
    case 'streakSilence':
    case 'fact':
    case 'summary':
      return TRANSITIONS.rise;
    case 'race':
    case 'replySpeed':
    case 'ranking':
    case 'starterVsMystery':
      return TRANSITIONS.slide;
    default:
      return TRANSITIONS.zoom;
  }
}

/**
 * Stories player: progress bars, tap right/left, swipe, hold to pause, keyboard and
 * auto-advance. Slides only need to render; all navigation lives here.
 */
export function StoryPlayer({ wrapped, isDemo, onClose }: Props) {
  const reduced = useReducedMotion() ?? false;
  const slides = wrapped.slides;
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const slide = slides[clampIndex(index, count)];
  const isLast = index >= count - 1;
  // A quiz waits for an answer before the clock starts.
  const waitingForAnswer = slide?.kind === 'quiz' && answers[slide.id] === undefined;
  const running = !userPaused && !holding && !hidden && !waitingForAnswer && !isLast;

  const ctx = useMemo<SlideCtx>(
    () => ({
      wrapped,
      name: (idx) => wrapped.participants[idx]?.name ?? '',
      reduced,
      running: !userPaused && !holding && !hidden,
      answers,
      onAnswer: (id, idx) => setAnswers((a) => ({ ...a, [id]: idx })),
    }),
    [wrapped, reduced, userPaused, holding, hidden, answers],
  );

  const fill = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const press = useRef<{ x: number; y: number; left: number; width: number; held: boolean } | null>(
    null,
  );
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback((delta: number) => setIndex((i) => clampIndex(i + delta, count)), [count]);

  // Restart the clock on every slide.
  useEffect(() => {
    elapsed.current = 0;
    if (fill.current) fill.current.style.transform = 'scaleX(0)';
  }, [index]);

  // The clock. Progress is written straight to the DOM: no re-render per frame.
  useEffect(() => {
    if (!running || !slide) return;
    const duration = durationOf(slide);
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      // The first frame can carry a timestamp slightly older than `last`.
      elapsed.current += Math.max(0, now - last);
      last = now;
      const progress = Math.min(1, elapsed.current / duration);
      if (fill.current) fill.current.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        go(1);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running, slide, go]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const onControl = target?.closest('button, a, input') !== null;
      if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'Escape') onClose();
      else if (event.key === ' ' && !onControl) setUserPaused((p) => !p);
      else return;
      if (event.key !== ' ' || !onControl) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-no-nav]')) return;
    const box = event.currentTarget.getBoundingClientRect();
    const current = {
      x: event.clientX,
      y: event.clientY,
      left: box.left,
      width: box.width,
      held: false,
    };
    press.current = current;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      current.held = true;
      setHolding(true);
    }, HOLD_MS);
  };

  const endPress = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = press.current;
    press.current = null;
    clearTimeout(holdTimer.current);
    setHolding(false);
    if (!current || cancelled) return;
    const action = classifyGesture({
      x: current.x - current.left,
      width: current.width,
      dx: event.clientX - current.x,
      dy: event.clientY - current.y,
      held: current.held,
    });
    if (action === 'next') go(1);
    else if (action === 'previous') go(-1);
  };

  if (!slide) return null;

  const fade: Variant = { opacity: 0 };
  const variants: Variants = {
    enter: reduced ? fade : transitionOf(slide.kind).initial,
    center: { opacity: 1, scale: 1, x: 0, y: 0, clipPath: 'circle(150% at 50% 60%)' },
    exit: reduced ? fade : transitionOf(slide.kind).exit,
  };

  const paused = userPaused || holding;
  const chromeButton =
    'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/25 text-xl text-white backdrop-blur-sm hover:bg-black/40';

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="relative h-full touch-none overflow-hidden select-none"
        style={paletteVars(wrapped.theme.palette)}
        onPointerDown={onPointerDown}
        onPointerUp={(e) => endPress(e, false)}
        onPointerCancel={(e) => endPress(e, true)}
        onPointerLeave={(e) => endPress(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.section
            key={slide.id}
            aria-roledescription="diapositiva"
            aria-label={es.story.position(index + 1, count)}
            className="absolute inset-0"
            style={{ background: slideGradient(index) }}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Background kind={wrapped.theme.background} seed={wrapped.seed} />
            <div className="relative h-full">
              <SlideView slide={slide} ctx={ctx} />
            </div>
          </motion.section>
        </AnimatePresence>

        {/* Screen readers get each slide as it arrives. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {slide.title}. {slide.body}
        </p>

        {/* Chrome */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/45 to-transparent px-3 pt-3 pb-8">
          <div
            className="flex gap-1"
            role="progressbar"
            aria-label={es.story.position(index + 1, count)}
            aria-valuemin={1}
            aria-valuemax={count}
            aria-valuenow={index + 1}
          >
            {slides.map((s, i) => (
              <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  ref={i === index ? fill : undefined}
                  className="block h-full origin-left rounded-full bg-white"
                  style={{ transform: `scaleX(${i < index ? 1 : 0})` }}
                />
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-semibold text-white/95">
              {wrapped.chatName ?? es.app.name}
              {isDemo && (
                <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">
                  {es.story.demo}
                </span>
              )}
            </p>
            <div className="pointer-events-auto flex gap-2" data-no-nav>
              <button
                type="button"
                className={chromeButton}
                aria-label={paused ? es.story.resume : es.story.pause}
                onClick={() => setUserPaused((p) => !p)}
              >
                {paused ? <PlayIcon /> : <PauseIcon />}
              </button>
              <button
                type="button"
                className={chromeButton}
                aria-label={es.story.close}
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>

        {isLast && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-6 pb-6"
            data-no-nav
          >
            <Button
              onClick={() => {
                setAnswers({});
                setUserPaused(false);
                setIndex(0);
              }}
            >
              {es.story.replay}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {es.story.close}
            </Button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
