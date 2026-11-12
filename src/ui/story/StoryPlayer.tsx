import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  type Variant,
  type Variants,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { AudioPlayer } from '../../audio/player';
import { sceneFor } from '../../audio/scenes';
import type { Slide, SlideKind, WrappedResult } from '../../core';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import {
  CloseIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  SoundIcon,
  SoundOffIcon,
} from '../components/icons';
import { clampIndex, classifyGesture, HOLD_MS } from './gestures';
import { Background } from '../backgrounds/Background';
import type { SlideCtx } from '../slides/common';
import { CARD_MS } from '../slides/PersonCards';
import { SlideView } from '../slides/SlideView';
import { useShare } from '../share/useShare';
import { paletteVars, slideGradient } from '../theme/palettes';

type Props = {
  wrapped: WrappedResult;
  isDemo: boolean;
  audio: AudioPlayer;
  muted: boolean;
  onToggleMute: () => void;
  /** "Borrar y salir". */
  onClose: () => void;
  /** Opens the full report ("Ver todos los datos"). */
  onOpenReport: () => void;
  /** Coming back from the report: open on the final card instead of the intro. */
  startAtEnd?: boolean;
};

/** The people slide lasts as long as its cards need. */
const QUIZ_MS = 12_000;
/** How long the answer of a quiz stays on screen before moving on. */
const QUIZ_REVEAL_MS = 3800;

const durationOf = (slide: Slide) =>
  slide.kind === 'people'
    ? Math.max(slide.durationMs, slide.data.cards.length * CARD_MS + 1200)
    : slide.kind === 'quiz'
      ? QUIZ_MS
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
    case 'images':
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
export function StoryPlayer({
  wrapped,
  isDemo,
  audio,
  muted,
  onToggleMute,
  onClose,
  onOpenReport,
  startAtEnd = false,
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const slides = wrapped.slides;
  const count = slides.length;

  const [index, setIndex] = useState(() =>
    startAtEnd ? Math.max(0, wrapped.slides.length - 1) : 0,
  );
  const [userPaused, setUserPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const slide = slides[clampIndex(index, count)];
  const isLast = index >= count - 1;
  const running = !userPaused && !holding && !hidden && !isLast;
  const quizAnswered = slide?.kind === 'quiz' && answers[slide.id] !== undefined;

  const share = useShare(wrapped);
  const { run: runShare, status: shareStatus, make: makePoster } = share;

  // Development only: lets the poster be inspected without triggering a download.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    Object.assign(window, { __wrappsappPoster: makePoster });
  }, [makePoster]);

  const ctx = useMemo<SlideCtx>(
    () => ({
      wrapped,
      name: (idx) => wrapped.participants[idx]?.name ?? '',
      reduced,
      running: !userPaused && !holding && !hidden,
      answers,
      onAnswer: (id, idx) => setAnswers((a) => ({ ...a, [id]: idx })),
      onShare: (target) => void runShare(target, 'share'),
      sharing: shareStatus === 'working',
    }),
    [wrapped, reduced, userPaused, holding, hidden, answers, runShare, shareStatus],
  );

  const fill = useRef<HTMLSpanElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const press = useRef<{ x: number; y: number; left: number; width: number; held: boolean } | null>(
    null,
  );
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback((delta: number) => setIndex((i) => clampIndex(i + delta, count)), [count]);

  // Restart the clock on every slide.
  useEffect(() => {
    elapsed.current = 0;
    // The clock writes the current bar straight to the DOM, so React does not know its real
    // width. Reset every bar here: full before the current slide, empty from it onwards.
    // Otherwise a half-watched bar stays half full after going back.
    bars.current?.querySelectorAll<HTMLElement>('[data-fill]').forEach((bar, i) => {
      bar.style.transform = i < index ? 'scaleX(1)' : 'scaleX(0)';
    });
  }, [index]);

  // A quiz never holds the story: it has its own (longer) time, and once answered the
  // result stays a few seconds and the story moves on.
  useEffect(() => {
    if (quizAnswered && slide) {
      elapsed.current = Math.max(elapsed.current, durationOf(slide) - QUIZ_REVEAL_MS);
    }
  }, [quizAnswered, slide]);

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
      // The target is not always an element (it can be the window itself).
      const onControl =
        event.target instanceof Element && event.target.closest('button, a, input') !== null;
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

  // Music: starts with the story (the tap that opened it already unlocked audio), follows
  // the mute button, pauses with the tab and fades out when the story is closed.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(() => {
    void audio.start({ seed: wrapped.seed, vibe: wrapped.vibe.id, muted: mutedRef.current });
    return () => audio.stop();
  }, [audio, wrapped.seed, wrapped.vibe.id]);
  useEffect(() => audio.setMuted(muted), [audio, muted]);
  // The music changes with the story: each slide has its scene.
  const slideKind = slide?.kind;
  useEffect(() => {
    if (slideKind) audio.setScene(sceneFor(slideKind, index));
  }, [audio, slideKind, index]);
  useEffect(() => {
    if (hidden) audio.suspend();
    else audio.resume();
  }, [audio, hidden]);
  useEffect(() => audio.setLevel(isLast ? 0.4 : 1, isLast ? 3 : 1), [audio, isLast]);

  // Visual beat: a glow on every beat of the track, written straight to the DOM like the
  // progress bar. Only opacity changes. (It used to scale the whole slide too: on phones
  // that re-rendered everything on every frame and made buttons move under the finger.)
  const glow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced) return;
    let frame = requestAnimationFrame(function tick() {
      const beat = audio.beat();
      const pulse = beat ? Math.pow(1 - beat.phase, 3) : 0;
      if (glow.current) glow.current.style.opacity = String(pulse * 0.22);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [audio, reduced]);

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
        {/* Everything that follows the beat lives outside the slides: a ref inside a slide
            is cleared when the previous slide unmounts. */}
        <div className="absolute inset-0">
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
        </div>
        <div
          ref={glow}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{ background: 'radial-gradient(circle at 50% 55%, white, transparent 65%)' }}
        />

        {/* Screen readers get each slide as it arrives. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {slide.title}. {slide.body}
        </p>

        {/* Chrome */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/45 to-transparent px-3 pt-3 pb-8">
          <div
            className="flex gap-1"
            ref={bars}
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
                  data-fill
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
                aria-label={muted ? es.story.unmute : es.story.mute}
                aria-pressed={muted}
                onClick={onToggleMute}
              >
                {muted ? <SoundOffIcon /> : <SoundIcon />}
              </button>
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="!px-3"
                disabled={shareStatus === 'working'}
                onClick={() => void runShare({ type: 'summary' }, 'share')}
              >
                <ShareIcon />
                {es.share.share}
              </Button>
              <Button
                variant="secondary"
                className="!px-3"
                aria-label={es.share.download}
                disabled={shareStatus === 'working'}
                onClick={() => void runShare({ type: 'summary' }, 'download')}
              >
                <DownloadIcon />
                {es.share.downloadShort}
              </Button>
            </div>
            <Button variant="secondary" onClick={onOpenReport}>
              {es.story.report}
            </Button>
            <div className="flex justify-center gap-6">
              <Button
                variant="ghost"
                className="!px-2"
                onClick={() => {
                  setAnswers({});
                  setUserPaused(false);
                  setIndex(0);
                }}
              >
                {es.story.replay}
              </Button>
              <Button variant="ghost" className="!px-2" onClick={onClose}>
                {es.story.close}
              </Button>
            </div>
          </div>
        )}
        <p
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute inset-x-6 bottom-56 z-20 rounded-2xl bg-black/70 px-4 py-2 text-center text-sm font-semibold transition-opacity ${shareStatus === 'idle' ? 'opacity-0' : 'opacity-100'}`}
        >
          {shareStatus === 'working'
            ? es.share.working
            : shareStatus === 'error'
              ? es.share.error
              : ''}
        </p>
        {share.poster}
      </div>
    </MotionConfig>
  );
}
