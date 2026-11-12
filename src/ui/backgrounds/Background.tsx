import { useMemo } from 'react';
import type { BackgroundId } from '../../core';
import { createRng } from '../../core/random/rng';

type Props = { kind: BackgroundId; seed: string };

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")";

/**
 * Animated layer between the slide gradient and its content. The style is chosen by the seed
 * and so are the positions, so the same chat always looks the same. Only transform and
 * opacity are animated; everything stops with prefers-reduced-motion (see index.css).
 */
export function Background({ kind, seed }: Props) {
  const items = useMemo(() => {
    const rng = createRng(seed, `fx:background:${kind}`);
    return Array.from({ length: kind === 'stars' ? 46 : 9 }, (_, i) => ({
      id: i,
      x: rng.next() * 100,
      y: rng.next() * 100,
      size: rng.next(),
      delay: rng.next() * 6,
      shape: rng.int(3),
    }));
  }, [kind, seed]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {kind === 'blobs' && (
        <>
          <div className="wr-blob wr-blob-a -top-1/4 -left-1/4 h-[70%] w-[95%] bg-[var(--wr-hi)] opacity-40" />
          <div className="wr-blob wr-blob-b top-1/3 -right-1/3 h-[65%] w-[95%] bg-white opacity-25" />
          <div className="wr-blob wr-blob-c -bottom-1/4 left-0 h-[60%] w-[85%] bg-[var(--wr-bg)] opacity-60" />
        </>
      )}

      {kind === 'geometry' &&
        items.map((it) => {
          const size = 40 + it.size * 110;
          const radius = it.shape === 0 ? '9999px' : it.shape === 1 ? '18%' : '0';
          return (
            <span
              key={it.id}
              className="wr-anim absolute border-2 border-white/25"
              style={{
                left: `${it.x}%`,
                top: `${it.y}%`,
                width: size,
                height: size,
                borderRadius: radius,
                animation: `wr-spin ${18 + it.size * 22}s linear ${-it.delay}s infinite`,
              }}
            />
          );
        })}

      {kind === 'grid3d' && (
        <div className="absolute inset-x-0 bottom-0 h-[70%] [perspective:340px]">
          <div
            className="wr-anim absolute inset-x-[-50%] top-0 h-[200%] origin-top opacity-40 [transform:rotateX(62deg)]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              animation: 'wr-grid 2.4s linear infinite',
            }}
          />
        </div>
      )}

      {kind === 'stars' &&
        items.map((it) => (
          <span
            key={it.id}
            className="wr-anim absolute rounded-full bg-white"
            style={{
              left: `${it.x}%`,
              top: `${it.y}%`,
              width: 2 + it.size * 3,
              height: 2 + it.size * 3,
              animation: `wr-twinkle ${2 + it.size * 3}s ease-in-out ${-it.delay}s infinite`,
            }}
          />
        ))}

      {kind === 'waves' && (
        <svg
          className="absolute inset-x-0 bottom-0 h-[55%] w-full"
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
        >
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              className="wr-anim"
              d="M-400 120 Q-300 60 -200 120 T0 120 T200 120 T400 120 T600 120 T800 120 V300 H-400 Z"
              fill="white"
              opacity={0.1 + i * 0.05}
              style={{
                ['--wr-wave-y' as string]: `${i * 46}px`,
                transform: `translateY(${i * 46}px)`,
                animation: `wr-wave ${9 + i * 4}s linear ${-i * 2}s infinite`,
              }}
            />
          ))}
        </svg>
      )}

      {/* Scrim for text contrast, then film grain. */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
