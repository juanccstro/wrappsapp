import { describe, expect, it } from 'vitest';
import {
  defaultPeriodKind,
  listPeriods,
  parseChat,
  resolvePeriod,
  sliceChat,
} from '../../src/core';
import { run } from './helpers';

const YEAR_2026 = [
  '10/1/26, 10:00 - Ana: feliz año',
  '10/1/26, 10:01 - Beto: igualmente',
  '5/6/26, 22:00 - Ana: verano ya',
  '20/11/26, 9:30 - Beto: qué frío',
];
const OLDER = [
  '3/5/25, 12:00 - Zoe: hola a todos',
  '20/11/25, 9:30 - Beto: buenas',
  '21/11/25, 9:30 - Zoe: adiós',
];

describe('periods', () => {
  const chat = parseChat([...OLDER, ...YEAR_2026].join('\n'));

  it('anchors every period to the last message, not to today', () => {
    expect(resolvePeriod(chat, 'year')).toMatchObject({ key: 'year:2026', year: 2026 });
    expect(listPeriods(chat).map((o) => [o.period.kind, o.messages])).toEqual([
      ['year', 4],
      ['last12', 5], // from 21/11/25 (the day after 20/11/25) to 20/11/26
      ['all', 7],
    ]);
  });

  it('only defaults to "this year" when the year has enough messages', () => {
    expect(defaultPeriodKind(chat)).toBe('all');
    const busy = Array.from(
      { length: 250 },
      (_, i) => `1/2/26, 10:${String(i % 60).padStart(2, '0')} - Ana: hola ${i}`,
    );
    expect(defaultPeriodKind(parseChat(busy.join('\n')))).toBe('year');
  });

  it('re-indexes participants by first appearance inside the period', () => {
    const sliced = sliceChat(chat, resolvePeriod(chat, 'year'));
    expect(sliced.participants).toEqual([
      { idx: 0, displayName: 'Ana' },
      { idx: 1, displayName: 'Beto' },
    ]);
    expect(sliced.messages.map((m) => m.senderIdx)).toEqual([0, 1, 0, 1]);
  });

  it('a finished year gives the same Wrapped whatever else the export contains', async () => {
    const full = await run(chat, 'year');
    const onlyThatYear = await run(parseChat(YEAR_2026.join('\n')), 'year');
    expect(full.seed).toBe(onlyThatYear.seed);
    expect(JSON.stringify(full.analytics)).toBe(JSON.stringify(onlyThatYear.analytics));
  });
});
