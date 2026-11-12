import { describe, expect, it } from 'vitest';
import {
  createRng,
  isEligible,
  num,
  pickText,
  render,
  slotsOf,
  type Pool,
  type Variant,
} from '../../src/core';
import {
  ARCHETYPES,
  CARD_STATS,
  PERSON_SLOTS,
  TITLE_PREFIXES,
  TITLE_SUFFIXES,
} from '../../src/core/templates/es/archetypes';
import {
  formatDay,
  formatDuration,
  formatNumber,
  joinList,
  weekdayOfDay,
} from '../../src/core/templates/es/format';
import * as slides from '../../src/core/templates/es/slides';
import { VIBE_SLOTS, VIBES } from '../../src/core/templates/es/vibes';

const COMMON: readonly string[] = slides.COMMON_SLOTS;

const SLIDE_POOLS: Record<string, Pool> = {
  intro: slides.intro,
  total: slides.total,
  busiestDay: slides.busiestDay,
  clock: slides.clock,
  emojis: slides.emojis,
  words: slides.words,
  laughs: slides.laughs,
  race: slides.race,
  owls: slides.owls,
  replySpeed: slides.replySpeed,
  graph: slides.graph,
  starterVsMystery: slides.starterVsMystery,
  streakSilence: slides.streakSilence,
  podcast: slides.podcast,
  shouts: slides.shouts,
  deleted: slides.deleted,
  questions: slides.questions,
  monologue: slides.monologue,
  subject: slides.subject,
  people: slides.people,
  summary: slides.summary,
};

describe('template engine', () => {
  it('fills slots and applies filters', () => {
    expect(render('{name} mandó {n|num} {n|plural:audio,audios}', { name: 'Ana', n: 1234 })).toBe(
      'Ana mandó 1.234 audios',
    );
    expect(render('{n} {n|plural:día,días}', { n: 1 })).toBe('1 día');
    expect(render('{chat|cap} manda. {who|upper}', { chat: 'el grupo', who: 'ana' })).toBe(
      'El grupo manda. ANA',
    );
  });

  it('contracts "de el" and "a el" without touching other words', () => {
    expect(render('Leyenda de {core}', { core: 'el insomnio' })).toBe('Leyenda del insomnio');
    expect(render('Monumento a {core}', { core: 'el sigilo' })).toBe('Monumento al sigilo');
    expect(render('cada día el grupo va a el bar de El Cairo', {})).toBe(
      'cada día el grupo va al bar de El Cairo',
    );
  });

  it('refuses to print a missing slot', () => {
    expect(() => render('Hola {name}', {})).toThrow(/Missing slot "name"/);
    expect(() => render('{n|shout}', { n: 1 })).toThrow(/Unknown filter/);
  });

  it('treats variants with missing data or a false condition as not eligible', () => {
    const variants: Variant[] = [
      'Su palabra: {word}',
      { text: 'Más de 50: {n}', when: (s) => num(s.n) > 50 },
      'Siempre vale',
    ];
    expect(variants.map((v) => isEligible(v, { n: 10, word: null }))).toEqual([false, false, true]);
    expect(pickText(createRng('x'), variants, { n: 10, word: null })).toBe('Siempre vale');
    expect(() => pickText(createRng('x'), ['{word}'], { word: null })).toThrow(/No eligible/);
  });

  it('formats numbers, durations and dates the Spanish way', () => {
    expect([0, 999, 1000, 1234567, 2.5, 3.04].map(formatNumber)).toEqual([
      '0',
      '999',
      '1.000',
      '1.234.567',
      '2,5',
      '3',
    ]);
    expect([0, 1, 45, 60, 150, 1440, 4000, 20000].map(formatDuration)).toEqual([
      'menos de un minuto',
      '1 minuto',
      '45 minutos',
      '1 hora',
      '2 horas y 30 minutos',
      '1 día',
      '2 días y 18 horas',
      '13 días',
    ]);
    expect(formatDay('2026-03-14')).toBe('14 de marzo');
    expect(formatDay('2026-03-14', true)).toBe('14 de marzo de 2026');
    expect(weekdayOfDay('2026-03-14')).toBe('sábado');
    expect(joinList(['Ana', 'Beto', 'Carla'])).toBe('Ana, Beto y Carla');
  });
});

describe('text pools', () => {
  const unknownSlots = (variants: readonly Variant[], allowed: readonly string[]) =>
    variants.flatMap((v) => slotsOf(v).filter((s) => !allowed.includes(s) && !COMMON.includes(s)));

  it.each(Object.entries(SLIDE_POOLS))('%s only uses the slots it declares', (_name, pool) => {
    expect(unknownSlots([...pool.titles, ...pool.bodies], pool.slots)).toEqual([]);
  });

  it.each(Object.entries(SLIDE_POOLS))('%s has enough variety', (_name, pool) => {
    expect(pool.titles.length).toBeGreaterThanOrEqual(5);
    expect(pool.bodies.length).toBeGreaterThanOrEqual(8);
    expect(new Set(pool.titles).size).toBe(pool.titles.length);
    expect(new Set(pool.bodies).size).toBe(pool.bodies.length);
  });

  it('quiz, vibe and archetype texts only use known slots', () => {
    const quizTexts = [...slides.quiz.hints, ...slides.quiz.right, ...slides.quiz.wrong];
    expect(unknownSlots(quizTexts, slides.quiz.slots)).toEqual([]);
    expect(unknownSlots(Object.values(slides.QUIZ_UNITS), ['value'])).toEqual([]);
    expect(Object.keys(slides.QUIZ_UNITS)).toEqual(Object.keys(slides.QUIZ_QUESTIONS));
    expect(unknownSlots(slides.vibe.titles, slides.vibe.slots)).toEqual([]);
    for (const vibe of Object.values(VIBES)) {
      expect(unknownSlots(vibe.descriptions, VIBE_SLOTS)).toEqual([]);
      expect(vibe.names.length).toBeGreaterThanOrEqual(3);
      expect(vibe.descriptions.length).toBeGreaterThanOrEqual(5);
    }
    for (const archetype of Object.values(ARCHETYPES)) {
      const texts = [...archetype.cores, ...archetype.phrases, archetype.stat.value];
      expect(unknownSlots(texts, PERSON_SLOTS)).toEqual([]);
      expect(archetype.cores.length).toBeGreaterThanOrEqual(6);
      expect(archetype.phrases.length).toBeGreaterThanOrEqual(4);
    }
    expect(
      unknownSlots(
        CARD_STATS.map((s) => s.value),
        PERSON_SLOTS,
      ),
    ).toEqual([]);
  });

  it('has around 25 archetypes and 10 personalities', () => {
    expect(Object.keys(ARCHETYPES)).toHaveLength(26);
    expect(Object.keys(VIBES)).toHaveLength(10);
  });

  it('offers millions of combinations', () => {
    const suffixes = new Set(TITLE_SUFFIXES).size;
    const perArchetype = Object.values(ARCHETYPES).map(
      (a) => TITLE_PREFIXES.length * a.cores.length * suffixes * a.phrases.length,
    );
    const cardCombos = perArchetype.reduce((sum, n) => sum + n, 0);
    const slideCombos = Object.values(SLIDE_POOLS).map((p) => p.titles.length * p.bodies.length);
    // A Wrapped shows about 16 of these slides plus one card per person.
    const core = [
      'intro',
      'total',
      'busiestDay',
      'clock',
      'emojis',
      'words',
      'laughs',
      'people',
      'summary',
    ];
    const coreCombos = core.reduce((product, k) => {
      const pool = SLIDE_POOLS[k] as Pool;
      return product * pool.titles.length * pool.bodies.length;
    }, 1);

    console.log(
      [
        `Title + phrase combinations per archetype: ${Math.min(...perArchetype)}–${Math.max(...perArchetype)}`,
        `Different person cards (all archetypes): ${cardCombos.toLocaleString('en')}`,
        `Text combinations per slide: ${Math.min(...slideCombos)}–${Math.max(...slideCombos)}`,
        `Text combinations of the 9 core slides alone: ${coreCombos.toExponential(2)}`,
        `…times 14 palettes × 5 backgrounds × slide orders × one card per person.`,
      ].join('\n'),
    );

    expect(Math.min(...perArchetype)).toBeGreaterThan(3000);
    expect(cardCombos).toBeGreaterThan(80_000);
    expect(coreCombos).toBeGreaterThan(1e12);
  });
});
