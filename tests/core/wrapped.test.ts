import { describe, expect, it } from 'vitest';
import {
  analyzeChat,
  assignArchetypes,
  buildWrapped,
  chatNameFromFileName,
  computeSeed,
  detectChatName,
  parseChat,
  resolvePeriod,
  sliceChat,
  PALETTE_COUNT,
  type ParsedChat,
  type PeriodKind,
  type WrappedResult,
} from '../../src/core';
import { DEMO_CHAT_NAME, DEMO_FILE_NAME, generateDemoChat } from '../../src/demo/demoChat';
import { FIXTURES, loadFixture, withoutMediaTypes } from './helpers';

async function wrap(chat: ParsedChat, kind: PeriodKind = 'all', fileName?: string) {
  const period = resolvePeriod(chat, kind);
  const sliced = sliceChat(chat, period);
  const seed = await computeSeed(sliced, period.key);
  const analytics = analyzeChat(sliced);
  const wrapped = buildWrapped({
    seed,
    period,
    participants: sliced.participants,
    isGroup: sliced.meta.isGroup,
    analytics,
    chatName: detectChatName(chat, fileName),
  });
  return { wrapped, analytics };
}

/** Every text a person would read, to check nothing leaks from the template engine. */
function allTexts(w: WrappedResult): string[] {
  const texts = [w.vibe.name, w.vibe.description];
  for (const s of w.slides) {
    texts.push(s.title, s.body);
    if (s.kind === 'quiz') texts.push(s.data.right, s.data.wrong);
    if (s.kind === 'summary') for (const h of s.data.highlights) texts.push(h.label, h.value);
    if (s.kind === 'people') {
      for (const c of s.data.cards) {
        texts.push(c.label, c.title, c.phrase, ...c.stats.flatMap((x) => [x.label, x.value]));
      }
    }
  }
  return texts;
}

const demoChat = parseChat(generateDemoChat());

describe('demo chat', () => {
  it('is always the same text', () => {
    expect(generateDemoChat()).toBe(generateDemoChat());
    expect(demoChat.participants.map((p) => p.displayName).sort()).toEqual([
      'Hugo',
      'Irene',
      'Leo',
      'Nico',
      'Sara',
      'Vera',
    ]);
    expect(demoChat.meta).toMatchObject({ platform: 'ios', locale: 'es', isGroup: true });
    expect(detectChatName(demoChat, DEMO_FILE_NAME)).toBe(DEMO_CHAT_NAME);
  });
});

describe('archetypes', () => {
  it('gives each person of the demo the archetype they were written to have', async () => {
    const { analytics } = await wrap(demoChat, 'year');
    const period = resolvePeriod(demoChat, 'year');
    const names = sliceChat(demoChat, period).participants.map((p) => p.displayName);
    const byName = Object.fromEntries(
      assignArchetypes(analytics).map((a) => [names[a.idx], a.archetype]),
    );
    expect(byName).toMatchObject({
      Vera: 'owl',
      Leo: 'podcaster',
      Sara: 'interrogator',
      Nico: 'laugher',
    });
    expect(new Set(Object.values(byName)).size).toBe(6); // nobody repeats
  });

  it('falls back to a neutral archetype when there is too little data', async () => {
    const { analytics } = await wrap(parseChat(loadFixture('android-es-24h.txt')));
    expect(assignArchetypes(analytics).every((a) => a.archetype === 'classic')).toBe(true);
  });
});

describe('WrappedResult', () => {
  it('builds a complete story for the demo', async () => {
    const { wrapped: w } = await wrap(demoChat, 'year', DEMO_FILE_NAME);
    const kinds = w.slides.map((s) => s.kind);

    expect(kinds.slice(0, 2)).toEqual(['intro', 'total']);
    expect(kinds.slice(-3)).toEqual(['people', 'vibe', 'summary']);
    expect(w.slides.length).toBeGreaterThanOrEqual(15);
    expect(w.slides.length).toBeLessThanOrEqual(20);
    expect(new Set(w.slides.map((s) => s.id)).size).toBe(w.slides.length);
    for (const kind of [
      'busiestDay',
      'clock',
      'emojis',
      'words',
      'laughs',
      'race',
      'owls',
      'graph',
      'quiz',
    ] as const) {
      expect(kinds).toContain(kind);
    }
    expect(w.chatName).toBe(DEMO_CHAT_NAME);
    expect(w.period).toEqual({ kind: 'year', key: 'year:2026', label: '2026' });
    expect(w.theme.palette).toBeGreaterThanOrEqual(0);
    expect(w.theme.palette).toBeLessThan(PALETTE_COUNT);
    for (const s of w.slides) {
      expect(s.durationMs).toBeGreaterThanOrEqual(6000);
      expect(s.durationMs).toBeLessThanOrEqual(9000);
    }
  });

  it('never leaks template syntax or broken values into the texts', async () => {
    for (const chat of [demoChat, parseChat(loadFixture('ios-es-24h.txt'))]) {
      for (const kind of ['year', 'last12', 'all'] as const) {
        const { wrapped } = await wrap(chat, kind);
        for (const text of allTexts(wrapped)) {
          expect(text).not.toMatch(/[{}]|undefined|null|NaN|Infinity/);
          expect(text.trim()).toBe(text);
          expect(text.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every person a card with a unique title and three stats', async () => {
    const { wrapped: w } = await wrap(demoChat, 'year');
    const people = w.slides.find((s) => s.kind === 'people');
    if (people?.kind !== 'people') throw new Error('no people slide');
    const cards = people.data.cards;
    expect(cards).toHaveLength(6);
    expect(new Set(cards.map((c) => c.title)).size).toBe(6);
    expect(cards.map((c) => c.stats.length)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(cards[0]?.name).toBe('Nico'); // most active first
  });

  it('adds the photos slide with laughing reactions when the export names photos', async () => {
    const { wrapped: w } = await wrap(demoChat, 'year');
    const images = w.slides.find((s) => s.kind === 'images');
    if (images?.kind !== 'images') throw new Error('no images slide');
    expect(images.data.ranking.length).toBeGreaterThan(0);
    expect(images.data.reactions.length).toBeGreaterThan(0);
    expect(images.data.reactions.length).toBeLessThanOrEqual(3);

    // Android without files cannot tell photos apart: the slide must not appear.
    const levelled = await wrap(withoutMediaTypes(demoChat), 'year');
    expect(levelled.wrapped.slides.map((s) => s.kind)).not.toContain('images');
  });

  it('makes quizzes that can be answered', async () => {
    const { wrapped: w } = await wrap(demoChat, 'year');
    const quizzes = w.slides.filter((s) => s.kind === 'quiz');
    expect(quizzes.length).toBeGreaterThanOrEqual(1);
    expect(quizzes.length).toBeLessThanOrEqual(2);
    for (const q of quizzes) {
      if (q.kind !== 'quiz') continue;
      expect(q.data.options).toContain(q.data.answer);
      expect(new Set(q.data.options).size).toBe(q.data.options.length);
      expect(q.data.options.length).toBeGreaterThanOrEqual(2);
      expect(q.data.options.length).toBeLessThanOrEqual(4);
    }
    expect(new Set(quizzes.map((q) => (q.kind === 'quiz' ? q.data.metric : ''))).size).toBe(
      quizzes.length,
    );
  });

  it('is plain serialisable data and identical on every run', async () => {
    const first = await wrap(demoChat, 'year', DEMO_FILE_NAME);
    const second = await wrap(parseChat(generateDemoChat()), 'year', DEMO_FILE_NAME);
    const json = JSON.stringify(first.wrapped);
    expect(JSON.stringify(second.wrapped)).toBe(json);
    expect(JSON.parse(json)).toEqual(first.wrapped);
    expect(structuredClone(first.wrapped)).toEqual(first.wrapped);
  });

  it('changes with the chat and with the period', async () => {
    const year = (await wrap(demoChat, 'year')).wrapped;
    const all = (await wrap(demoChat, 'all')).wrapped;
    expect(all.seed).not.toBe(year.seed);
    const titles = (w: WrappedResult) =>
      w.slides.map((s) => `${s.id}:${s.title}:${s.body}`).join('|');
    expect(titles(all)).not.toBe(titles(year));
  });

  it('is the same on Android and iOS once media types are levelled', async () => {
    const results = await Promise.all(
      FIXTURES.map(async (f) =>
        JSON.stringify((await wrap(withoutMediaTypes(parseChat(loadFixture(f))))).wrapped),
      ),
    );
    expect(new Set(results).size).toBe(1);
  });

  it('only changes the names shown when contacts are saved differently', async () => {
    const original = loadFixture('android-es-24h.txt');
    const renames: [string, string][] = [
      ['Juan', 'Juanito Trabajo'],
      ['Marta', '+34 600 11 22 33'],
      ['Dani', 'Daniel Primo'],
    ];
    let renamedText = original;
    for (const [from, to] of renames) renamedText = renamedText.replaceAll(from, to);

    const a = JSON.stringify((await wrap(parseChat(original))).wrapped);
    let b = JSON.stringify((await wrap(parseChat(renamedText))).wrapped);
    expect(b).not.toBe(a);
    for (const [from, to] of renames) b = b.replaceAll(to, from);
    expect(b).toBe(a);
  });

  it('adapts the wording to a two-person chat', async () => {
    const lines: string[] = [];
    for (let i = 0; i < 40; i++) {
      lines.push(
        `${1 + (i % 20)}/2/26, 10:${String(i).padStart(2, '0')} - Ana: qué tal el día ${i} jajaja`,
      );
      lines.push(
        `${1 + (i % 20)}/2/26, 10:${String(i).padStart(2, '0')} - Beto: bien, luego te cuento 😂`,
      );
    }
    const { wrapped: w } = await wrap(
      parseChat(lines.join('\n')),
      'all',
      'Chat de WhatsApp con Beto.txt',
    );
    expect(w.isGroup).toBe(false);
    expect(w.vibe.id).toBe('duo');
    expect(w.chatName).toBe('Beto');
    const texts = allTexts(w).join(' ');
    expect(texts).not.toMatch(/\bel grupo\b|\bdel grupo\b/);
    expect(w.slides.map((s) => s.kind)).not.toContain('graph');
  });

  it('keeps the slide order stable (snapshot)', async () => {
    const { wrapped: w } = await wrap(demoChat, 'year', DEMO_FILE_NAME);
    expect({
      seed: w.seed,
      theme: w.theme,
      vibe: w.vibe.id,
      slides: w.slides.map((s) => s.id),
    }).toMatchSnapshot();
  });
});

describe('chat name', () => {
  it('reads it from the file name in Spanish and English', () => {
    expect(chatNameFromFileName('Chat de WhatsApp con Los del Insti.txt')).toBe('Los del Insti');
    expect(chatNameFromFileName('WhatsApp Chat with Uni friends.zip')).toBe('Uni friends');
    expect(chatNameFromFileName('WhatsApp Chat - Familia.zip')).toBe('Familia');
    expect(chatNameFromFileName('_chat.txt')).toBeNull();
  });

  it('prefers the last name the group was given', () => {
    const chat = parseChat(loadFixture('android-es-24h.txt'));
    expect(detectChatName(chat, 'Chat de WhatsApp con Otro.txt')).toBe('Insti: la secuela 🍕');
  });
});
