/**
 * Prints a summary of an exported chat. Nothing leaves this machine.
 *
 *   npm run parse -- path/to/chat.txt
 */
import { readFileSync } from 'node:fs';
import { ChatParseError, parseChat } from '../src/core/parser';
import { es } from '../src/i18n/es';

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run parse -- archivo.txt');
  process.exit(1);
}

const started = performance.now();
let chat;
try {
  chat = parseChat(readFileSync(file, 'utf8'));
} catch (err) {
  if (err instanceof ChatParseError) {
    console.error(`✖ ${es.errors[err.code]}`);
    process.exit(2);
  }
  throw err;
}
const elapsed = performance.now() - started;

const { messages, participants, meta } = chat;
const count = (key: (i: number) => string | undefined) => {
  const totals = new Map<string, number>();
  for (let i = 0; i < messages.length; i++) {
    const k = key(i);
    if (k !== undefined) totals.set(k, (totals.get(k) ?? 0) + 1);
  }
  return [...totals.entries()].sort((x, y) => y[1] - x[1]);
};
const table = (rows: [string, number][]) =>
  rows.map(([label, n]) => `  ${String(n).padStart(7)}  ${label}`).join('\n');

const first = messages[0];
const last = messages[messages.length - 1];

console.log(`Archivo:       ${file}`);
console.log(`Plataforma:    ${meta.platform}   Idioma: ${meta.locale}   Fechas: ${meta.dateOrder}`);
console.log(`Tipo:          ${meta.isGroup ? 'grupo' : 'chat individual'}`);
console.log(`Periodo:       ${first?.minuteKey} → ${last?.minuteKey}`);
console.log(`Mensajes:      ${messages.length} (leídos en ${elapsed.toFixed(0)} ms)`);
console.log(`Editados:      ${messages.filter((m) => m.edited).length}`);
console.log(`\nParticipantes (${participants.length}):`);
console.log(
  table(
    count((i) => {
      const idx = messages[i]?.senderIdx ?? -1;
      return idx >= 0 ? `#${idx} ${participants[idx]?.displayName}` : undefined;
    }),
  ),
);
console.log('\nPor tipo:');
console.log(table(count((i) => messages[i]?.kind)));
console.log('\nMultimedia:');
console.log(table(count((i) => messages[i]?.mediaType)) || '  (nada)');
console.log('\nEventos de sistema:');
console.log(table(count((i) => messages[i]?.systemEvent)) || '  (nada)');
