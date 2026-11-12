import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ChatParseError, parseChat, type ParsedChat } from '../../src/core/parser';

const load = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', 'fixtures', name), 'utf8');

const VARIANTS = [
  { file: 'android-es-24h.txt', platform: 'android', locale: 'es', dateOrder: 'dmy' },
  { file: 'android-es-12h.txt', platform: 'android', locale: 'es', dateOrder: 'dmy' },
  { file: 'android-en-12h.txt', platform: 'android', locale: 'en', dateOrder: 'mdy' },
  { file: 'android-es-year4.txt', platform: 'android', locale: 'es', dateOrder: 'dmy' },
  { file: 'android-es-with-media.txt', platform: 'android', locale: 'es', dateOrder: 'dmy' },
  { file: 'ios-es-24h.txt', platform: 'ios', locale: 'es', dateOrder: 'dmy' },
  { file: 'ios-en-12h.txt', platform: 'ios', locale: 'en', dateOrder: 'mdy' },
] as const;

// What every variant of the conversation must parse to (authored messages only).
const EXPECTED: [minuteKey: string, senderIdx: number, kind: string, edited: boolean][] = [
  ['2026-11-12T17:03', 0, 'text', false],
  ['2026-11-12T17:04', 1, 'text', false],
  ['2026-11-12T17:05', 2, 'media', false],
  ['2026-11-12T17:05', 3, 'media', false],
  ['2026-11-12T23:59', 1, 'media', false],
  ['2026-11-13T00:01', 0, 'text', true],
  ['2026-11-13T00:02', 2, 'deleted', false],
  ['2026-11-13T12:00', 3, 'poll', false],
  ['2026-11-13T12:30', 1, 'location', false],
  ['2026-11-13T12:31', 0, 'contact', false],
  ['2026-11-14T08:15', 3, 'media', false],
  ['2026-11-14T08:16', 2, 'media', false],
  ['2026-11-14T08:17', 0, 'media', false],
  ['2026-11-14T12:12', 2, 'text', false],
  ['2026-11-15T05:03', 3, 'text', false],
  ['2026-11-16T00:30', 1, 'text', false],
  ['2026-11-16T12:05', 0, 'text', false],
  ['2026-12-01T18:01', 0, 'text', false],
];

const EXPECTED_TEXTS = [
  'Hola qué tal',
  'Bien!! 😂😂\nOs cuento luego\n\nque es largo',
  'jajajaja no puede ser',
  'Mirad: https://example.com/a?b=1',
  'A las 5:03 PM quedamos, ¿no?',
  'NO ME LO CREO',
  'Buenos días 🌞',
  'Feliz diciembre 🎄',
];

const authored = (chat: ParsedChat) => chat.messages.filter((m) => m.kind !== 'system');
const mediaTypes = (chat: ParsedChat) =>
  chat.messages.filter((m) => m.kind === 'media').map((m) => m.mediaType);

describe.each(VARIANTS)('fixture $file', ({ file, platform, locale, dateOrder }) => {
  const chat = parseChat(load(file));

  it('detects platform, language, date order and group', () => {
    expect(chat.meta).toEqual({ platform, locale, isGroup: true, dateOrder });
  });

  it('finds the participants in order of first appearance', () => {
    expect(chat.participants).toEqual([
      { idx: 0, displayName: 'Juan' },
      { idx: 1, displayName: 'Marta' },
      { idx: 2, displayName: 'Lucía' },
      { idx: 3, displayName: 'Dani' },
    ]);
  });

  it('parses every authored message with the same time, sender and kind', () => {
    expect(authored(chat).map((m) => [m.minuteKey, m.senderIdx, m.kind, m.edited])).toEqual(
      EXPECTED,
    );
  });

  it('keeps the texts intact (multi-line, emoji, colons) and free of invisible characters', () => {
    expect(
      authored(chat)
        .filter((m) => m.kind === 'text')
        .map((m) => m.text),
    ).toEqual(EXPECTED_TEXTS);
    for (const m of chat.messages) {
      expect(m.text).not.toMatch(/[\u200e\u200f\u202f\u00a0\ufeff]/);
    }
  });

  it('classifies system messages and keeps them out of the participants', () => {
    const system = chat.messages.filter((m) => m.kind === 'system');
    expect(system.map((m) => m.systemEvent)).toEqual([
      'encryption_notice',
      'group_created',
      'member_added',
      'subject_change',
      'icon_change',
      'member_left',
    ]);
    expect(system.every((m) => m.senderIdx === -1)).toBe(true);
    expect(system[3]?.text).toContain('Insti: la secuela 🍕');
  });

  it('stores the wall-clock time as if it were UTC', () => {
    const first = authored(chat)[0];
    const seconds = platform === 'ios' ? 45 : 0;
    expect(first?.ts).toBe(Date.UTC(2026, 10, 12, 17, 3, seconds));
  });
});

describe('media types', () => {
  it('iOS names each type', () => {
    for (const file of ['ios-es-24h.txt', 'ios-en-12h.txt']) {
      expect(mediaTypes(parseChat(load(file)))).toEqual([
        'image',
        'audio',
        'sticker',
        'video',
        'gif',
        'document',
      ]);
    }
  });

  it('Android without files only says "media omitted"', () => {
    expect(new Set(mediaTypes(parseChat(load('android-es-24h.txt'))))).toEqual(
      new Set(['media_unknown']),
    );
  });

  it('Android with files is classified by file name', () => {
    expect(mediaTypes(parseChat(load('android-es-with-media.txt')))).toEqual([
      'image',
      'audio',
      'sticker',
      'video',
      'video',
      'document',
    ]);
  });
});

describe('invalid files', () => {
  const codeOf = (text: string) => {
    try {
      parseChat(text);
    } catch (err) {
      if (err instanceof ChatParseError) return err.code;
      throw err;
    }
    return null;
  };

  it('rejects a file that is not a chat', () => {
    expect(codeOf(load('not-a-chat.txt'))).toBe('not_a_chat');
  });

  it('rejects an empty file', () => {
    expect(codeOf('')).toBe('empty');
    expect(codeOf('\ufeff\n  \n')).toBe('empty');
  });

  it('rejects a chat with only system messages', () => {
    expect(codeOf('12/11/26, 9:00 - Juan creó el grupo "Nada"\n')).toBe('no_messages');
  });
});
