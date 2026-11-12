import { motion } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { Ranked, WrappedResult } from '../../core';
import { formatNumber } from '../../core/templates/es/format';
import type { ShareTarget } from '../share/share';

/** What every slide gets from the player. */
export type SlideCtx = {
  wrapped: WrappedResult;
  name: (idx: number) => string;
  /** prefers-reduced-motion: soft fades only, no particles, final values straight away. */
  reduced: boolean;
  /** False while the story is paused: internal timers must stop too. */
  running: boolean;
  answers: Record<string, number>;
  onAnswer: (slideId: string, idx: number) => void;
  /** Exports a card as an image and opens the share sheet (or downloads it). */
  onShare: (target: ShareTarget) => void;
  /** An image is being prepared. */
  sharing: boolean;
};

export function Layout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative flex h-full flex-col justify-center gap-5 px-6 pt-24 pb-10 ${className}`}
    >
      {children}
    </div>
  );
}

/** Title revealed word by word with a spring. */
export function Title({ text, className = '' }: { text: string; className?: string }) {
  const size =
    text.length > 44 ? 'text-2xl' : text.length > 26 ? 'text-[1.75rem]' : 'text-[2.1rem]';
  return (
    <h2
      className={`wr-shadow font-display leading-[1.08] font-black text-balance ${size} ${className}`}
    >
      {text.split(' ').map((word, i) => (
        // No overflow mask here: it cut the text shadow into visible boxes behind the words.
        <span key={`${word}-${i}`} className="inline-block pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '55%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 170, damping: 18, delay: 0.08 + i * 0.06 }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

export function Body({ text, delay = 0.5 }: { text: string; delay?: number }) {
  return (
    <motion.p
      className="wr-shadow text-lg leading-snug text-white/95 text-pretty"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      {text}
    </motion.p>
  );
}

/** Generic entrance for a block. */
export function Rise({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 140, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A number that counts up with easing. Jumps to the end with reduced motion. */
export function useCountUp(target: number, durationMs: number, instant: boolean): number {
  const [value, setValue] = useState(instant ? target : 0);
  useEffect(() => {
    if (instant) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, Math.max(0, now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 4))));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, instant]);
  return value;
}

export function CountUp({
  value,
  ctx,
  durationMs = 1800,
  className = '',
}: {
  value: number;
  ctx: SlideCtx;
  durationMs?: number;
  className?: string;
}) {
  const shown = useCountUp(value, durationMs, ctx.reduced);
  return <span className={`tabular-nums ${className}`}>{formatNumber(shown)}</span>;
}

/**
 * Steps 0, 1, 2… up to count - 1 while the story is running. `startDelayMs` holds the first
 * step a little longer (e.g. until the title has appeared).
 */
export function useTicker(count: number, stepMs: number, ctx: SlideCtx, startDelayMs = 0): number {
  const [step, setStep] = useState(ctx.reduced ? Math.max(0, count - 1) : 0);
  useEffect(() => {
    if (!ctx.running || ctx.reduced || step >= count - 1) return;
    const wait = step === 0 ? stepMs + startDelayMs : stepMs;
    const timer = setTimeout(() => setStep((s) => Math.min(count - 1, s + 1)), wait);
    return () => clearTimeout(timer);
  }, [step, count, stepMs, startDelayMs, ctx.running, ctx.reduced]);
  return step;
}

const AVATAR_COLORS = ['var(--wr-a)', 'var(--wr-b)', 'var(--wr-c)', 'var(--wr-d)'];

function initialsOf(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length === 0) return '?';
  if (/^\d+$/.test(words.join(''))) return words.join('').slice(-2);
  const first = Array.from(words[0] as string)[0] ?? '';
  const second = words.length > 1 ? (Array.from(words[1] as string)[0] ?? '') : '';
  return (first + second).toUpperCase();
}

/** Procedural avatar: initials on palette shapes. Photos are never used. */
export function Avatar({
  idx,
  name,
  size = 56,
  x,
  y,
}: {
  idx: number;
  name: string;
  size?: number;
  /** Position when nested inside another SVG (no foreignObject: Safari misplaces it). */
  x?: number;
  y?: number;
}) {
  const base = AVATAR_COLORS[idx % 4] as string;
  const accent = AVATAR_COLORS[(idx + 2) % 4] as string;
  const shape = idx % 3;
  const clip = `wr-av-${useId().replace(/:/g, '')}`;
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={name}
      className="shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill={base} />
      {/* Decorative shapes stay inside the circle. */}
      <g clipPath={`url(#${clip})`}>
        {shape === 0 && <circle cx="48" cy="18" r="16" fill={accent} opacity="0.85" />}
        {shape === 1 && (
          <rect
            x="-6"
            y="38"
            width="44"
            height="44"
            rx="8"
            fill={accent}
            opacity="0.85"
            transform="rotate(-18 16 60)"
          />
        )}
        {shape === 2 && <path d="M32 2 62 62H2Z" fill={accent} opacity="0.55" />}
      </g>
      <circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.18)" stroke="white" strokeWidth="3" />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize="22"
        fill="white"
      >
        {initialsOf(name)}
      </text>
    </svg>
  );
}

/** Ranking with avatars and bars that grow in. */
export function RankList({
  items,
  ctx,
  format = formatNumber,
  delay = 0.6,
}: {
  items: Ranked[];
  ctx: SlideCtx;
  format?: (value: number) => string;
  delay?: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <motion.li
          key={item.idx}
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 18, delay: delay + i * 0.12 }}
        >
          <Avatar idx={item.idx} name={ctx.name(item.idx)} size={i === 0 ? 46 : 38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold">{ctx.name(item.idx)}</span>
              <span className="font-display text-sm font-bold tabular-nums">
                {format(item.value)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: i === 0 ? 'var(--wr-hi)' : 'white' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(0.04, item.value / max) }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: delay + 0.15 + i * 0.12 }}
              />
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
