import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { WrappedResult } from '../../core';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import { CloseIcon, PauseIcon, PlayIcon } from '../components/icons';
import { clampIndex, classifyGesture, HOLD_MS } from './gestures';
import { SlideView } from './SlideView';

type Props = {
  wrapped: WrappedResult;
  isDemo: boolean;
  /** "Borrar y salir". */
  onClose: () => void;
};

/** Backgrounds rotate through the palette, one per slide. */
const GRADIENTS = [
  'linear-gradient(160deg, var(--wr-c), var(--wr-a))',
  'linear-gradient(160deg, var(--wr-a), var(--wr-b))',
  'linear-gradient(160deg, #1b0a44, var(--wr-c))',
  'linear-gradient(160deg, var(--wr-d), var(--wr-c))',
  'linear-gradient(160deg, #2a0b3d, var(--wr-a))',
];

/**
 * Stories player: progress bars, tap right/left, swipe, hold to pause, keyboard and
 * auto-advance. Slides only need to render; all navigation lives here.
 */
export function StoryPlayer({ wrapped, isDemo, onClose }: Props) {
  const reduced = useReducedMotion();
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
    const duration = slide.durationMs;
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

  const paused = userPaused || holding;
  const chromeButton =
    'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/25 text-xl text-white backdrop-blur-sm hover:bg-black/40';

  return (
    <div
      className="relative h-full touch-none overflow-hidden select-none"
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
          style={{ background: GRADIENTS[index % GRADIENTS.length] }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: reduced ? 0.2 : 0.35, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
          <div className="relative h-full">
            <SlideView
              slide={slide}
              wrapped={wrapped}
              answers={answers}
              onAnswer={(id, idx) => setAnswers((a) => ({ ...a, [id]: idx }))}
            />
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
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-6 pb-6" data-no-nav>
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
  );
}
