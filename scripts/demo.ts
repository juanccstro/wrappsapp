/**
 * Prints the texts of a Wrapped, to review tone and variety without opening the browser.
 *
 *   npm run demo                      the built-in demo chat
 *   npm run demo -- chat.txt [all]    a real export (period: year | last12 | all)
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { PeriodKind } from '../src/core';
import { DEMO_FILE_NAME, generateDemoChat } from '../src/demo/demoChat';
import { createSession } from '../src/worker/session';

const file = process.argv[2];
const session = createSession();
const summary = file
  ? await session.load([readFileSync(file, 'utf8')], basename(file))
  : await session.load([generateDemoChat()], DEMO_FILE_NAME);
const kind = (process.argv[3] as PeriodKind | undefined) ?? summary.defaultPeriod;
const { wrapped: w } = await session.analyze(kind);
const name = (idx: number) => w.participants[idx]?.name ?? '?';

console.log(`Periodos: ${summary.periods.map((p) => `${p.period.kind}=${p.messages}`).join('  ')}`);
console.log(
  `Chat: ${w.chatName ?? '(sin nombre)'} · periodo: ${w.period.label} · semilla: ${w.seed.slice(0, 12)}…`,
);
console.log(`Vibe: ${w.vibe.name} — ${w.vibe.description}`);
console.log(`Tema: paleta ${w.theme.palette}, fondo ${w.theme.background}`);

for (const slide of w.slides) {
  console.log(`\n[${slide.id}] ${slide.title}\n    ${slide.body}`);
  if (slide.kind === 'quiz') {
    console.log(`    opciones: ${slide.data.options.map(name).join(', ')}`);
    console.log(`    acierto: ${slide.data.right}\n    fallo:   ${slide.data.wrong}`);
  }
  if (slide.kind === 'people') {
    for (const card of slide.data.cards) {
      console.log(`    · ${card.name} — ${card.label} — ${card.title}`);
      console.log(`        ${card.phrase}`);
      console.log(`        ${card.stats.map((s) => `${s.label}: ${s.value}`).join(' | ')}`);
    }
  }
  if (slide.kind === 'summary') {
    console.log(`    ${slide.data.highlights.map((h) => `${h.label}: ${h.value}`).join(' | ')}`);
  }
}
