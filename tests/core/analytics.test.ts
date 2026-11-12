import { describe, expect, it } from 'vitest';
import { analyzeChat, parseChat } from '../../src/core';

// Ana = 0, Beto = 1, Carla = 2. 1 March 2026 is a Sunday.
const chat = parseChat(
  [
    '1/3/26, 10:00 - Ana: Buenos días equipo',
    '1/3/26, 10:01 - Ana: ¿Quién viene hoy?',
    '1/3/26, 10:05 - Beto: yo voy jajajaja 😂',
    '1/3/26, 10:06 - Ana: GENIAL NOS VEMOS',
    '1/3/26, 15:00 - Carla: hola??',
    '1/3/26, 15:01 - Carla: nadie?',
    '1/3/26, 15:02 - Carla: vale',
    '2/3/26, 2:30 - Beto: no puedo dormir https://example.com/x',
    '2/3/26, 2:31 - Ana: jsjsjs duerme',
    '4/3/26, 9:00 - Ana: <Multimedia omitido>',
  ].join('\n'),
);
const a = analyzeChat(chat);
const [ana, beto, carla] = a.people;
if (!ana || !beto || !carla) throw new Error('expected three people');

describe('global analytics', () => {
  it('counts totals', () => {
    expect(a.totals).toMatchObject({
      messages: 10,
      words: 20,
      emojis: 1,
      media: 1,
      links: 1,
      audios: 0,
    });
    expect(a.mediaTypesKnown).toBe(false);
  });

  it('finds the busiest day and its characteristic words', () => {
    expect(a.busiestDay).toEqual({
      day: '2026-03-01',
      messages: 7,
      keywords: ['días', 'equipo', 'genial', 'nadie', 'vemos', 'viene'],
    });
  });

  it('builds the hour x weekday heatmap', () => {
    expect(a.heatmap[6]?.[10]).toBe(4); // Sunday 10:00
    expect(a.heatmap[6]?.[15]).toBe(3);
    expect(a.heatmap[0]?.[2]).toBe(2); // Monday 02:00
    expect(a.peakHour).toBe(10);
    expect(a.wakeUpHour).toBe(9);
    expect(a.weekdayTotals).toEqual([2, 0, 1, 0, 0, 0, 7]);
  });

  it('measures the longest streak and the longest silence', () => {
    expect(a.longestStreak).toEqual({ days: 2, start: '2026-03-01', end: '2026-03-02' });
    expect(a.range).toEqual({
      firstDay: '2026-03-01',
      lastDay: '2026-03-04',
      activeDays: 3,
      totalDays: 4,
    });
    expect(a.longestSilence).toEqual({
      minutes: 3269,
      from: '2026-03-02T02:31',
      to: '2026-03-04T09:00',
      brokenBy: 0,
      brokenWithKind: 'media',
      brokenWithText: '',
    });
  });

  it('groups by month, per person', () => {
    expect(a.months).toEqual([{ month: '2026-03', total: 10, perPerson: [5, 2, 3] }]);
    expect(a.busiestMonth).toEqual({ month: '2026-03', messages: 10 });
  });

  it('counts laughs, emojis and words without stopwords or laughs', () => {
    expect(a.laughs).toEqual({ total: 3, longest: { text: 'jajajaja', length: 8, senderIdx: 1 } });
    expect(a.topEmojis).toEqual([{ key: '😂', count: 1 }]);
    const words = a.topWords.map((w) => w.key);
    expect(words).toContain('dormir');
    expect(words).not.toContain('jajajaja');
    expect(words).not.toContain('hola');
    expect(words).not.toContain('https');
    expect(a.topBigrams.map((b) => b.key)).toContain('días equipo');
  });

  it('only measures the positive side of the mood', () => {
    expect(a.sentiment).toEqual({ positive: 3, negative: 0, positiveShare: 1 });
  });
});

describe('per-person analytics', () => {
  it('counts messages and shares', () => {
    expect([ana.messages, beto.messages, carla.messages]).toEqual([5, 2, 3]);
    expect(ana.share).toBe(0.5);
    expect(ana.avgWords).toBe(11 / 4);
    expect(ana.longestMessage).toEqual({ chars: 18, words: 3, minuteKey: '2026-03-01T10:00' });
  });

  it('detects conversation starters and ignored starts', () => {
    expect([
      ana.conversationsStarted,
      beto.conversationsStarted,
      carla.conversationsStarted,
    ]).toEqual([2, 1, 1]);
    expect([ana.ignoredStarts, beto.ignoredStarts, carla.ignoredStarts]).toEqual([0, 0, 1]);
  });

  it('measures replies and who replies to whom', () => {
    expect([ana.medianReplyMinutes, beto.medianReplyMinutes, carla.medianReplyMinutes]).toEqual([
      1, 4, 294,
    ]);
    expect(a.replyMatrix).toEqual([
      [0, 2, 0],
      [1, 0, 0],
      [1, 0, 0],
    ]);
    expect([ana.favoritePerson, beto.favoritePerson, carla.favoritePerson]).toEqual([1, 0, 0]);
    expect(a.topPair).toEqual({ a: 0, b: 1, replies: 3 });
  });

  it('respects a custom reply window', () => {
    const strict = analyzeChat(chat, { replyWindowMinutes: 60 });
    expect(strict.people[2]?.medianReplyMinutes).toBeNull();
    expect(strict.people[2]?.favoritePerson).toBeNull();
  });

  it('counts double texts, triple texts and monologues', () => {
    expect([ana.doubleTexts, ana.tripleTexts, ana.longestMonologue]).toEqual([1, 0, 2]);
    expect([carla.doubleTexts, carla.tripleTexts, carla.longestMonologue]).toEqual([0, 1, 3]);
  });

  it('finds night owls, questions, shouts and links', () => {
    expect([ana.nightShare, beto.nightShare, carla.nightShare]).toEqual([0.2, 0.5, 0]);
    expect([ana.questions, beto.questions, carla.questions]).toEqual([1, 0, 2]);
    expect([ana.shouts, beto.shouts, carla.shouts]).toEqual([1, 0, 0]);
    expect(beto.links).toBe(1);
  });

  it('finds each laugh style and favourite emoji', () => {
    expect([ana.signatureLaugh, beto.signatureLaugh, carla.signatureLaugh]).toEqual([
      'jsjsjs',
      'jajaja',
      null,
    ]);
    expect(beto.favoriteEmoji).toBe('😂');
    expect([ana.laughs, beto.laughs]).toEqual([1, 2]);
  });

  it('tracks activity and absences', () => {
    expect([ana.activeDays, ana.longestAbsenceDays]).toEqual([3, 1]);
    expect([carla.activeDays, carla.longestAbsenceDays]).toEqual([1, 0]);
  });
});

describe('text details', () => {
  const of = (lines: string[]) => analyzeChat(parseChat(lines.join('\n')));

  it('recognises laugh variants and keeps the longest written one', () => {
    const r = of([
      '1/3/26, 10:00 - Ana: JAJAJAJAJAJA',
      '1/3/26, 10:01 - Ana: JAJAJA xD lol 🤣 💀',
      '1/3/26, 10:02 - Beto: jejeje hahaha jijiji',
      '1/3/26, 10:03 - Beto: jamás bajaba la alhaja',
    ]);
    expect(r.laughs.total).toBe(9);
    expect(r.laughs.longest).toEqual({ text: 'JAJAJAJAJAJA', length: 12, senderIdx: 0 });
    expect(r.people[0]?.signatureLaugh).toBe('JAJAJA');
    expect(r.people[0]?.shouts).toBe(0); // laughing in capitals is not shouting
  });

  it('counts emojis with skin tones and joined sequences as one each', () => {
    const family = ['👨', '👩', '👧'].join(String.fromCodePoint(0x200d));
    const r = of([`1/3/26, 10:00 - Ana: 👍🏽 👍 ${family} 🇪🇸 🎉`, '1/3/26, 10:01 - Beto: ok']);
    expect(r.totals.emojis).toBe(5);
    expect(r.topEmojis[0]).toEqual({ key: '👍', count: 2 });
  });

  it('finds the word a person uses far more than the rest', () => {
    const lines: string[] = [];
    for (let i = 0; i < 6; i++) {
      lines.push(`1/3/26, 10:${10 + i} - Ana: quedamos mañana en la bolera`);
      lines.push(`1/3/26, 11:${10 + i} - Beto: mañana tengo fútbol`);
    }
    const r = of(lines);
    expect(r.people[0]?.signatureWord).toBe('bolera');
    expect(r.people[1]?.signatureWord).toBe('fútbol');
  });

  it('counts media by type when the export says it', () => {
    const mark = String.fromCodePoint(0x200e);
    const r = of([
      `[1/3/26, 10:00:00] Ana: ${mark}audio omitido`,
      `[1/3/26, 10:01:00] Ana: ${mark}audio omitido`,
      `[1/3/26, 10:02:00] Beto: ${mark}sticker omitido`,
      `[1/3/26, 10:03:00] Beto: ${mark}Se eliminó este mensaje.`,
    ]);
    expect(r.mediaTypesKnown).toBe(true);
    expect(r.totals).toMatchObject({ audios: 2, stickers: 1, deleted: 1 });
    expect(r.people[0]).toMatchObject({ audios: 2, podcastMinutes: 2 });
    expect(r.people[1]).toMatchObject({ stickers: 1, deleted: 1 });
  });

  it('counts photos and keeps the replies that laughed the most at them', () => {
    const mark = String.fromCodePoint(0x200e);
    const r = of([
      `[1/3/26, 10:00:00] Ana: ${mark}imagen omitida`,
      '[1/3/26, 10:00:30] Beto: JAJAJAJAJAJA no puede ser',
      '[1/3/26, 10:01:00] Carla: jaja',
      '[1/3/26, 10:01:10] Ana: jajajajajajajajaja', // laughing at your own photo does not count
      '[1/3/26, 10:02:00] Carla: qué bonito',
      `[1/3/26, 12:00:00] Beto: ${mark}imagen omitida`,
      '[1/3/26, 12:30:00] Ana: jajajajajajajajajajajaja', // too late to be a reaction
    ]);
    expect(r.people.map((p) => p.images)).toEqual([1, 1, 0]);
    expect(r.imageReactions).toEqual([
      { text: 'JAJAJAJAJAJA no puede ser', senderIdx: 1, toIdx: 0 },
      { text: 'jaja', senderIdx: 2, toIdx: 0 },
    ]);
  });

  it('handles 300k messages quickly', () => {
    const names = ['Juan', 'Marta', 'Lucía', 'Dani', 'Pepe', 'Ana'];
    const bodies = [
      'jajajaja qué bueno 😂',
      '<Multimedia omitido>',
      'vale, nos vemos luego en el bar',
      '¿Quién viene mañana?',
    ];
    const lines: string[] = [];
    for (let i = 0; i < 300_000; i++) {
      const day = 1 + (Math.floor(i / 12_000) % 28);
      const hour = Math.floor(i / 500) % 24;
      const minute = String(i % 60).padStart(2, '0');
      lines.push(`${day}/3/26, ${hour}:${minute} - ${names[i % 6]}: ${bodies[i % 4]}`);
    }
    const big = parseChat(lines.join('\n'));
    const start = performance.now();
    const r = analyzeChat(big);
    // Loose bound: other test files run at the same time. See scripts/bench.ts for real timings.
    expect(performance.now() - start).toBeLessThan(6000);
    expect(r.totals.messages).toBe(300_000);
  }, 30_000);
});
