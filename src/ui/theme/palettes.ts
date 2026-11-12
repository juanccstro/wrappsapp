import type { CSSProperties } from 'react';
import { PALETTE_COUNT } from '../../core';

/**
 * Curated palettes. `a`–`d` are the saturated colours the slide gradients rotate through
 * (dark enough for white text once the slide scrim is on top), `hi` is the light accent for
 * highlights on those gradients.
 */
export type Palette = {
  name: string;
  bg: string;
  a: string;
  b: string;
  c: string;
  d: string;
  hi: string;
};

export const PALETTES: readonly Palette[] = [
  {
    name: 'Neón',
    bg: '#12062b',
    a: '#e83e7c',
    b: '#e8722e',
    c: '#6a4be8',
    d: '#0f9d8e',
    hi: '#ffe066',
  },
  {
    name: 'Atardecer',
    bg: '#2b0a1e',
    a: '#e24a4e',
    b: '#d9783f',
    c: '#b3154f',
    d: '#7b1fa2',
    hi: '#fff1a8',
  },
  {
    name: 'Océano',
    bg: '#04162e',
    a: '#0077b6',
    b: '#008f8f',
    c: '#3a4fd8',
    d: '#7b2ff7',
    hi: '#a7f3ff',
  },
  {
    name: 'Selva',
    bg: '#06231a',
    a: '#0c8a4c',
    b: '#5f8f10',
    c: '#00796b',
    d: '#1565c0',
    hi: '#f9f871',
  },
  {
    name: 'Caramelo',
    bg: '#2a0a3a',
    a: '#e01f77',
    b: '#a8158f',
    c: '#7209b7',
    d: '#3b55d9',
    hi: '#ffd6ff',
  },
  {
    name: 'Fuego',
    bg: '#2a0707',
    a: '#d62f3c',
    b: '#d96c00',
    c: '#b80000',
    d: '#8a0207',
    hi: '#ffe8a3',
  },
  {
    name: 'Menta',
    bg: '#072a2a',
    a: '#009d7e',
    b: '#0876cc',
    c: '#008f8f',
    d: '#6050d6',
    hi: '#dffff3',
  },
  {
    name: 'Uva',
    bg: '#1a0633',
    a: '#8327d1',
    b: '#b3154f',
    c: '#4a00e0',
    d: '#d43a50',
    hi: '#ffe29a',
  },
  {
    name: 'Cítrico',
    bg: '#1f1a02',
    a: '#d95503',
    b: '#a87f00',
    c: '#c72a02',
    d: '#557d3e',
    hi: '#fffbcc',
  },
  {
    name: 'Aurora',
    bg: '#061a2e',
    a: '#1487dd',
    b: '#0b9c78',
    c: '#7048f0',
    d: '#c9468c',
    hi: '#eaffd0',
  },
  {
    name: 'Chicle',
    bg: '#2b0b2b',
    a: '#e02c95',
    b: '#784ba0',
    c: '#2676b0',
    d: '#d9557a',
    hi: '#fff5b8',
  },
  {
    name: 'Tierra',
    bg: '#24130a',
    a: '#b03f41',
    b: '#bf6520',
    c: '#6a4c93',
    d: '#386641',
    hi: '#ffe8c2',
  },
  {
    name: 'Eléctrico',
    bg: '#050a30',
    a: '#2541ff',
    b: '#8a00e0',
    c: '#0086d6',
    d: '#d6006b',
    hi: '#c8ff00',
  },
  {
    name: 'Coral',
    bg: '#2a0d14',
    a: '#de5252',
    b: '#d4501e',
    c: '#b83d60',
    d: '#574b90',
    hi: '#fff3b0',
  },
];

if (PALETTES.length !== PALETTE_COUNT) {
  throw new Error(`Expected ${PALETTE_COUNT} palettes, found ${PALETTES.length}`);
}

/** CSS variables that paint a whole Wrapped with its palette. */
export function paletteVars(index: number): CSSProperties {
  const p = PALETTES[index % PALETTES.length] as Palette;
  return {
    '--wr-bg': p.bg,
    '--wr-a': p.a,
    '--wr-b': p.b,
    '--wr-c': p.c,
    '--wr-d': p.d,
    '--wr-hi': p.hi,
  } as CSSProperties;
}

const STOPS = ['a', 'b', 'c', 'd'] as const;

/** Each slide rotates inside the palette of the chat. */
export function slideGradient(position: number): string {
  const from = STOPS[position % 4];
  const to = STOPS[(position + 1) % 4];
  const angle = 150 + ((position * 37) % 60);
  return `linear-gradient(${angle}deg, var(--wr-${from}), var(--wr-${to}))`;
}
