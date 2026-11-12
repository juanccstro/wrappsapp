/** Rough timings of the pipeline on a large synthetic chat:  npx tsx scripts/bench.ts */
import { analyzeChat, parseChat } from '../src/core';

const names = ['Juan', 'Marta', 'Lucía', 'Dani', 'Pepe', 'Ana'];
const bodies = [
  'jajajaja qué bueno 😂',
  '<Multimedia omitido>',
  'vale, nos vemos luego en el bar de siempre',
  '¿Quién viene mañana al final?',
  'pues yo creo que lo mejor es quedar antes porque luego siempre llegamos tarde',
];
const lines: string[] = [];
for (let i = 0; i < 300_000; i++) {
  const day = 1 + (Math.floor(i / 12_000) % 28);
  const hour = Math.floor(i / 500) % 24;
  lines.push(
    `${day}/3/26, ${hour}:${String(i % 60).padStart(2, '0')} - ${names[i % 6]}: ${bodies[i % 5]} ${i % 97}`,
  );
}
const text = lines.join('\n');
for (let run = 0; run < 3; run++) {
  const t0 = performance.now();
  const chat = parseChat(text);
  const t1 = performance.now();
  analyzeChat(chat);
  const t2 = performance.now();
  console.log(`parse ${(t1 - t0).toFixed(0)} ms · analyze ${(t2 - t1).toFixed(0)} ms`);
}
