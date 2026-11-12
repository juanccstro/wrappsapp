import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { Ranked } from '../../core';
import { formatNumber } from '../../core/templates/es/format';
import { Avatar, useTicker, type SlideCtx } from './common';
import { RACE_START_MS, raceStepMs } from './timing';

const TAU = Math.PI * 2;

/** Wedge of a ring between two angles (0 = top, clockwise). */
function wedge(inner: number, outer: number, from: number, to: number): string {
  const point = (r: number, angle: number) =>
    `${(r * Math.sin(angle)).toFixed(2)} ${(-r * Math.cos(angle)).toFixed(2)}`;
  return `M${point(inner, from)} L${point(outer, from)} A${outer} ${outer} 0 0 1 ${point(outer, to)} L${point(inner, to)} A${inner} ${inner} 0 0 0 ${point(inner, from)}Z`;
}

/** 24-hour radial clock: the longer the wedge, the more messages at that hour. */
export function RadialClock({ hours, peak }: { hours: number[]; peak: number }) {
  const max = Math.max(1, ...hours);
  const inner = 34;
  return (
    <svg viewBox="-112 -112 224 224" className="mx-auto w-[78%] max-w-72" aria-hidden="true">
      <circle r={inner + 64} fill="none" stroke="white" strokeOpacity="0.15" />
      {hours.map((count, hour) => {
        const from = (hour / 24) * TAU + 0.02;
        const to = ((hour + 1) / 24) * TAU - 0.02;
        const outer = inner + 6 + 58 * (count / max);
        return (
          <motion.path
            key={hour}
            d={wedge(inner, outer, from, to)}
            fill={hour === peak ? 'var(--wr-hi)' : 'white'}
            initial={{ opacity: 0 }}
            animate={{ opacity: hour === peak ? 1 : 0.35 + 0.55 * (count / max) }}
            transition={{ duration: 0.35, delay: 0.4 + hour * 0.045 }}
          />
        );
      })}
      {[0, 6, 12, 18].map((hour) => {
        const angle = (hour / 24) * TAU;
        return (
          <text
            key={hour}
            x={106 * Math.sin(angle)}
            y={-106 * Math.cos(angle)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontWeight="700"
            fill="white"
            opacity="0.8"
          >
            {hour}
          </text>
        );
      })}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize="17"
        fill="white"
      >
        {peak}:00
      </text>
    </svg>
  );
}

/** Bar chart race: messages per person, month by month. */
export function BarRace({
  months,
  ctx,
}: {
  months: { month: string; label: string; perPerson: number[] }[];
  ctx: SlideCtx;
}) {
  // Its timing is mirrored in timing.ts, which keeps the slide on screen until it ends.
  const step = useTicker(months.length, raceStepMs(months.length), ctx, RACE_START_MS);

  const frames = useMemo(() => {
    const totals: number[] = [];
    return months.map((m) => {
      m.perPerson.forEach((n, idx) => (totals[idx] = (totals[idx] ?? 0) + n));
      return totals.slice();
    });
  }, [months]);

  const current = frames[step] ?? [];
  const final = frames[frames.length - 1] ?? [];
  const max = Math.max(1, ...final);
  const rows = current
    .map((value, idx) => ({ idx, value }))
    .sort((x, y) => y.value - x.value || x.idx - y.idx)
    .slice(0, 6);

  return (
    <div>
      <p className="font-display text-3xl font-black text-[var(--wr-hi)] capitalize">
        {months[step]?.label}
      </p>
      <ol className="mt-3 flex flex-col gap-2">
        {rows.map((row, i) => (
          <motion.li
            key={row.idx}
            layout={!ctx.reduced}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="flex items-center gap-2"
          >
            <Avatar idx={row.idx} name={ctx.name(row.idx)} size={34} />
            <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-white/15">
              <div
                className="h-full origin-left rounded-lg transition-transform duration-300 ease-out"
                style={{
                  transform: `scaleX(${Math.max(0.02, row.value / max)})`,
                  background: i === 0 ? 'var(--wr-hi)' : 'rgba(255,255,255,0.85)',
                }}
              />
              <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-[#12062b]">
                {ctx.name(row.idx)}
              </span>
            </div>
            <span className="w-12 text-right font-display text-xs font-bold tabular-nums">
              {formatNumber(row.value)}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

type GraphNode = SimulationNodeDatum & { idx: number };

/**
 * Who replies to whom. Layout by d3-force, computed once (the simulation is deterministic)
 * and then drawn in: thicker lines mean more replies, the strongest pair is highlighted.
 */
/** Short label: the first word of a name (all of it if another person shares that word). */
function shortName(name: string, all: string[]): string {
  const firstOf = (n: string) => n.trim().split(/\s+/)[0] ?? n;
  const first = firstOf(name);
  const label = all.filter((n) => firstOf(n) === first).length > 1 ? name.trim() : first;
  const chars = Array.from(label);
  return chars.length > 12 ? `${chars.slice(0, 11).join('')}…` : label;
}

export function ReplyGraph({
  matrix,
  pair,
  ctx,
}: {
  matrix: number[][];
  pair: { a: number; b: number };
  ctx: SlideCtx;
}) {
  const { nodes, links, max } = useMemo(() => {
    const weight = (a: number, b: number) => (matrix[a]?.[b] ?? 0) + (matrix[b]?.[a] ?? 0);
    const involvement = matrix
      .map((_, idx) => ({ idx, value: matrix.reduce((sum, __, o) => sum + weight(idx, o), 0) }))
      .sort((x, y) => y.value - x.value || x.idx - y.idx)
      .slice(0, 8);
    const graphNodes: GraphNode[] = involvement.map(({ idx }, i) => ({
      idx,
      x: 70 * Math.cos((i / involvement.length) * TAU),
      y: 70 * Math.sin((i / involvement.length) * TAU),
    }));
    const graphLinks: { source: number; target: number; value: number }[] = [];
    for (let i = 0; i < graphNodes.length; i++) {
      for (let j = i + 1; j < graphNodes.length; j++) {
        const value = weight((graphNodes[i] as GraphNode).idx, (graphNodes[j] as GraphNode).idx);
        if (value > 0) graphLinks.push({ source: i, target: j, value });
      }
    }
    const top = Math.max(1, ...graphLinks.map((l) => l.value));
    forceSimulation(graphNodes)
      .force('charge', forceManyBody().strength(-260))
      .force(
        'link',
        forceLink(graphLinks.map((l) => ({ ...l })))
          .distance((l) => 120 - 60 * ((l as { value: number }).value / top))
          .strength(0.5),
      )
      .force('collide', forceCollide(48))
      .force('center', forceCenter(0, 0))
      .stop()
      .tick(220);
    // Fit inside the view box whatever the simulation produced.
    const reach = Math.max(
      1,
      ...graphNodes.map((n) => Math.max(Math.abs(n.x ?? 0), Math.abs(n.y ?? 0))),
    );
    // Leave room for the names under the avatars.
    const scale = 100 / reach;
    for (const n of graphNodes) {
      n.x = (n.x ?? 0) * scale;
      n.y = (n.y ?? 0) * scale;
    }
    return { nodes: graphNodes, links: graphLinks, max: top };
  }, [matrix]);

  const isPair = (l: { source: number; target: number }) => {
    const a = nodes[l.source]?.idx;
    const b = nodes[l.target]?.idx;
    return (a === pair.a && b === pair.b) || (a === pair.b && b === pair.a);
  };

  return (
    <svg
      viewBox="-150 -140 300 300"
      overflow="visible"
      className="mx-auto w-full max-w-80"
      aria-hidden="true"
    >
      {links.map((l, i) => {
        const a = nodes[l.source] as GraphNode;
        const b = nodes[l.target] as GraphNode;
        const strong = isPair(l);
        return (
          <motion.line
            key={`${l.source}-${l.target}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={strong ? 'var(--wr-hi)' : 'white'}
            strokeWidth={1 + 9 * (l.value / max)}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: strong ? 1 : 0.2 + 0.5 * (l.value / max) }}
            transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
          />
        );
      })}
      {nodes.map((n, i) => (
        <motion.g
          key={n.idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
        >
          <Avatar
            idx={n.idx}
            name={ctx.name(n.idx)}
            size={44}
            x={(n.x ?? 0) - 22}
            y={(n.y ?? 0) - 22}
          />
          <text
            x={n.x}
            y={(n.y ?? 0) + 34}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10.5"
            fontWeight="700"
            fill="white"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="3"
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {shortName(
              ctx.name(n.idx),
              nodes.map((o) => ctx.name(o.idx)),
            )}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

/** Avatars racing to the right: the faster someone replies, the sooner they arrive. */
export function ReplyRace({
  ranking,
  ctx,
  format,
}: {
  ranking: Ranked[];
  ctx: SlideCtx;
  format: (minutes: number) => string;
}) {
  const lanes = ranking.slice(0, 5);
  return (
    <ol className="flex flex-col gap-3">
      {lanes.map((r, i) => (
        <li key={r.idx} className="relative h-12 rounded-full bg-white/15">
          <motion.div
            className="absolute inset-y-0 left-0 flex w-full items-center justify-end"
            initial={{ x: ctx.reduced ? 0 : '-78%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.9 + i * 0.55, ease: [0.2, 0.8, 0.2, 1], delay: 0.5 }}
          >
            <span className="mr-2 text-right text-xs leading-tight font-bold">
              <span className="block">{ctx.name(r.idx)}</span>
              <span className="block text-[var(--wr-hi)]">{format(r.value)}</span>
            </span>
            <Avatar idx={r.idx} name={ctx.name(r.idx)} size={48} />
          </motion.div>
        </li>
      ))}
    </ol>
  );
}
