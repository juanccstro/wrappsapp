import { describe, expect, it } from 'vitest';
import { parseChat } from '../../src/core';
import { FIXTURES, loadFixture, run, runText, withoutMediaTypes } from './helpers';

describe('determinism: same chat, same result', () => {
  it('gives the same seed for every platform, language and clock format', async () => {
    const seeds = await Promise.all(
      FIXTURES.map(async (f) => (await runText(loadFixture(f))).seed),
    );
    expect(seeds[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(seeds).size).toBe(1);
  });

  it('gives identical analytics across phone languages and clock formats', async () => {
    const android = [
      'android-es-24h.txt',
      'android-es-12h.txt',
      'android-en-12h.txt',
      'android-es-year4.txt',
    ];
    const ios = ['ios-es-24h.txt', 'ios-en-12h.txt'];
    for (const group of [android, ios]) {
      const results = await Promise.all(
        group.map(async (f) => JSON.stringify((await runText(loadFixture(f))).analytics)),
      );
      expect(new Set(results).size).toBe(1);
    }
  });

  it('Android and iOS only differ in what Android does not export (media types)', async () => {
    const results = await Promise.all(
      FIXTURES.map(async (f) =>
        JSON.stringify((await run(withoutMediaTypes(parseChat(loadFixture(f))))).analytics),
      ),
    );
    expect(new Set(results).size).toBe(1);
  });

  it('does not depend on how contacts are saved', async () => {
    const original = loadFixture('android-es-24h.txt');
    const renamed = original
      .replaceAll('Juan', 'Juanito 🍺')
      .replaceAll('Marta', '+34 600 11 22 33')
      .replaceAll('Dani', 'Daniel Trabajo');
    const a = await runText(original);
    const b = await runText(renamed);
    expect(b.sliced.participants[0]?.displayName).toBe('Juanito 🍺');
    expect(b.seed).toBe(a.seed);
    expect(JSON.stringify(b.analytics)).toBe(JSON.stringify(a.analytics));
  });

  it('gives different seeds for different chats and different periods', async () => {
    const original = loadFixture('android-es-24h.txt');
    const seeds = await Promise.all([
      runText(original),
      runText(original.replace('Hola qué tal', 'Hola que tal')),
      runText(original.replace('17:03 - Juan', '17:04 - Juan')),
      runText(original.replace('18:01 - Juan', '18:01 - Marta')),
      runText(original, 'year'),
    ]);
    expect(new Set(seeds.map((s) => s.seed)).size).toBe(5);
  });

  it('gives the same output when run twice', async () => {
    const text = loadFixture('ios-es-24h.txt');
    const first = await runText(text);
    const second = await runText(text);
    expect(second.seed).toBe(first.seed);
    expect(JSON.stringify(second.analytics)).toBe(JSON.stringify(first.analytics));
  });

  it('matches the stored snapshot', async () => {
    const { seed, analytics } = await runText(loadFixture('android-es-24h.txt'));
    expect({ seed, analytics }).toMatchSnapshot();
  });
});
