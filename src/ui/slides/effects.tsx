import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';
import { createRng } from '../../core';

/**
 * Rain of one emoji on a canvas. Positions and speeds come from the seed, so the same chat
 * always rains the same way. Not rendered at all with reduced motion.
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
  const ref = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rng = createRng(seed, 'fx:emoji-rain');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const drops = Array.from({ length: 34 }, () => ({
      x: rng.next() * width,
      y: -rng.next() * height * 1.2,
      size: 18 + rng.next() * 30,
      speed: 90 + rng.next() * 200,
      spin: (rng.next() - 0.5) * 2,
      angle: rng.next() * 6,
    }));

    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = runningRef.current ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0;
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const d of drops) {
        d.y += d.speed * dt;
        d.angle += d.spin * dt;
        if (d.y > height + 40) d.y = -40;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle);
        ctx.font = `${d.size}px sans-serif`;
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [emoji, seed]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
    />
  );
}

/** Confetti burst from a point of the screen (0–1 coordinates). */
export function fireConfetti(x = 0.5, y = 0.6) {
  void confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { x, y },
    disableForReducedMotion: true,
    colors: ['#ffffff', '#ffd166', '#ff4d8d', '#7c5cff', '#22d3c5'],
  });
}
