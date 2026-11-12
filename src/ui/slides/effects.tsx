import { useMemo } from 'react';
import { createRng } from '../../core/random/rng';

const DROPS = 16;

/**
 * Rain of one emoji. Each drop is its own element animated only with `transform`, so the
 * browser moves it on the compositor instead of redrawing the emoji on every frame (drawing
 * emoji glyphs on a canvas 60 times a second is what made this slide stutter). Positions and
 * speeds come from the seed. Not rendered at all with reduced motion.
 */
export function EmojiRain({
  emoji,
  seed,
  running,
}: {
  emoji: string;
  seed: string;
  running: boolean;
}) {
  const drops = useMemo(() => {
    const rng = createRng(seed, 'fx:emoji-rain');
    return Array.from({ length: DROPS }, (_, id) => ({
      id,
      left: (id + rng.next()) * (100 / DROPS),
      size: 20 + rng.next() * 26,
      duration: 4.5 + rng.next() * 4,
      delay: rng.next() * 6,
      spin: Math.round((rng.next() - 0.5) * 240),
    }));
  }, [seed]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-60"
    >
      {drops.map((d) => (
        <span
          key={d.id}
          className="wr-anim absolute -top-16 leading-none will-change-transform"
          style={{
            left: `${d.left}%`,
            fontSize: d.size,
            ['--wr-spin' as string]: `${d.spin}deg`,
            animation: `wr-fall ${d.duration}s linear ${-d.delay}s infinite`,
            animationPlayState: running ? 'running' : 'paused',
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * Burst of rings from the middle of its parent, drawn with CSS only (transform + opacity on a
 * handful of elements). Replaces the canvas confetti, which froze some phones. Plays once.
 */
export function RingBurst({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="wr-anim absolute aspect-square w-full rounded-full border-2 border-[var(--wr-hi)] opacity-0"
          style={{
            animation: `wr-burst 1.1s cubic-bezier(0.2, 0.7, 0.3, 1) ${delay + i * 0.16}s 1 both`,
          }}
        />
      ))}
    </span>
  );
}
