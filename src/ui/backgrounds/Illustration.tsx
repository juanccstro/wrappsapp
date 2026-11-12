import type { CSSProperties, ReactNode } from 'react';
import { createRng } from '../../core/random/rng';

/**
 * Big flat drawings behind each slide, in the spirit of a year-in-review story: a starburst,
 * a flower, rings, stripes, a wave… One per slide, never the same twice in a row, in a corner
 * so the middle of the screen (where the text is) stays calm. They sit under the slide scrim
 * and only animate transform/opacity, so they cost the phone almost nothing.
 */

const HI = 'var(--wr-hi)';
const INK = 'white';
const DEEP = 'var(--wr-bg)';

type Art = {
  /** The drawing, in a 200×200 box. */
  svg: ReactNode;
  /** Looping motion of the drawing (CSS animation shorthand). */
  loop: string;
  /** Where it sits and how big. */
  place: 'corner' | 'band';
};

const star = (points: number, outer: number, inner: number) =>
  Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${(100 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const ARTS: Art[] = [
  // Starburst
  {
    svg: <polygon points={star(14, 100, 66)} fill={HI} />,
    loop: 'wr-spin 38s linear infinite',
    place: 'corner',
  },
  // Flower
  {
    svg: (
      <g fill={INK}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={100 + 52 * Math.cos(a)}
              cy={100 + 52 * Math.sin(a)}
              r="40"
              opacity="0.9"
            />
          );
        })}
        <circle cx="100" cy="100" r="34" fill={HI} />
      </g>
    ),
    loop: 'wr-spin 46s linear infinite reverse',
    place: 'corner',
  },
  // Concentric rings
  {
    svg: (
      <g fill="none" strokeWidth="11">
        {[96, 72, 48, 24].map((r, i) => (
          <circle key={r} cx="100" cy="100" r={r} stroke={i % 2 === 0 ? HI : INK} />
        ))}
      </g>
    ),
    loop: 'wr-breathe 5s ease-in-out infinite',
    place: 'corner',
  },
  // Diagonal stripes
  {
    svg: (
      <g transform="rotate(-30 100 100)">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x="-60"
            y={20 + i * 34}
            width="320"
            height="18"
            rx="9"
            fill={i % 2 === 0 ? HI : INK}
          />
        ))}
      </g>
    ),
    loop: 'wr-float 6s ease-in-out infinite',
    place: 'corner',
  },
  // Wave (a long one that slides sideways)
  {
    svg: (
      <path
        d="M-200 100 q25 -46 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0"
        fill="none"
        stroke={HI}
        strokeWidth="16"
        strokeLinecap="round"
      />
    ),
    loop: 'wr-wave-slide 4s linear infinite',
    place: 'band',
  },
  // Rainbow arcs
  {
    svg: (
      <g fill="none" strokeWidth="16" strokeLinecap="round">
        {[92, 68, 44].map((r, i) => (
          <path
            key={r}
            d={`M${100 - r} 170 A${r} ${r} 0 0 1 ${100 + r} 170`}
            stroke={[HI, INK, DEEP][i]}
          />
        ))}
      </g>
    ),
    loop: 'wr-float 5s ease-in-out infinite',
    place: 'corner',
  },
  // Halftone dots
  {
    svg: (
      <g fill={INK}>
        {Array.from({ length: 36 }, (_, i) => {
          const x = i % 6;
          const y = Math.floor(i / 6);
          return <circle key={i} cx={20 + x * 32} cy={20 + y * 32} r={3 + (x + y) * 1.15} />;
        })}
      </g>
    ),
    loop: 'wr-float 7s ease-in-out infinite',
    place: 'corner',
  },
  // Organic blob
  {
    svg: (
      <path
        d="M152 41c25 26 33 66 18 98s-56 50-93 44-66-33-71-67 18-70 51-84 70-17 95 9z"
        fill={HI}
      />
    ),
    loop: 'wr-spin 30s linear infinite',
    place: 'corner',
  },
  // Sparkles
  {
    svg: (
      <g fill={INK}>
        <path d="M70 20 Q76 64 120 70 Q76 76 70 120 Q64 76 20 70 Q64 64 70 20z" />
        <path
          d="M150 100 Q153 126 178 130 Q153 134 150 160 Q147 134 122 130 Q147 126 150 100z"
          fill={HI}
        />
        <path d="M60 140 Q62 156 78 158 Q62 160 60 176 Q58 160 42 158 Q58 156 60 140z" />
      </g>
    ),
    loop: 'wr-breathe 3.2s ease-in-out infinite',
    place: 'corner',
  },
  // Zigzag
  {
    svg: (
      <polyline
        points="10,40 45,80 80,40 115,80 150,40 185,80"
        transform="translate(0 40)"
        fill="none"
        stroke={INK}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    loop: 'wr-float 4.5s ease-in-out infinite',
    place: 'corner',
  },
];

/** Which drawing a slide gets: consecutive slides always differ, the start comes from the seed. */
export function illustrationFor(seed: string, position: number): number {
  const offset = createRng(seed, 'fx:illustration').int(ARTS.length);
  // 3 and the number of drawings share no factor, so neighbours never repeat.
  return (offset + position * 3) % ARTS.length;
}

const CORNERS: CSSProperties[] = [
  { top: '-8%', right: '-22%', width: '78%' },
  { bottom: '-10%', left: '-24%', width: '80%' },
  { bottom: '-6%', right: '-20%', width: '72%' },
  { top: '6%', left: '-26%', width: '70%' },
];

export function Illustration({ seed, position }: { seed: string; position: number }) {
  const art = ARTS[illustrationFor(seed, position)] as Art;
  const style: CSSProperties =
    art.place === 'band'
      ? { bottom: '-16%', left: '-10%', width: '120%' }
      : (CORNERS[position % CORNERS.length] as CSSProperties);
  return (
    <div
      aria-hidden="true"
      className="wr-anim absolute aspect-square"
      style={{ ...style, animation: 'wr-pop-in 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}
    >
      <svg
        viewBox="0 0 200 200"
        overflow="visible"
        className="wr-anim h-full w-full will-change-transform"
        style={{ animation: art.loop, opacity: 0.4 }}
      >
        {art.svg}
      </svg>
    </div>
  );
}
