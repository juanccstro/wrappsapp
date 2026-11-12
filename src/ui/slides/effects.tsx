import confetti from 'canvas-confetti';
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

/** Confetti burst from a point of the screen (0–1 coordinates). */
let cannon: confetti.CreateTypes | null = null;

export function fireConfetti(x = 0.5, y = 0.6) {
  try {
    // One shared instance on the main thread. The default instance moves the drawing to a
    // Worker with an OffscreenCanvas, which can freeze the page on some mobile browsers.
    cannon ??= confetti.create(undefined, { resize: true, useWorker: false });
  } catch {
    return; // Confetti is decoration: never let it break a slide.
  }
  void cannon({
    particleCount: 60,
    spread: 75,
    startVelocity: 38,
    origin: { x, y },
    disableForReducedMotion: true,
    colors: ['#ffffff', '#ffd166', '#ff4d8d', '#7c5cff', '#22d3c5'],
  });
}
