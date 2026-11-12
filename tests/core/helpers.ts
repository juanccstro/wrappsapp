import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  analyzeChat,
  computeSeed,
  parseChat,
  resolvePeriod,
  sliceChat,
  type ParsedChat,
  type PeriodKind,
} from '../../src/core';

export const loadFixture = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', 'fixtures', name), 'utf8');

export const FIXTURES = [
  'android-es-24h.txt',
  'android-es-12h.txt',
  'android-en-12h.txt',
  'android-es-year4.txt',
  'android-es-with-media.txt',
  'ios-es-24h.txt',
  'ios-en-12h.txt',
] as const;

/** The whole pipeline for a chat and a period, as the Worker runs it. */
export async function run(chat: ParsedChat, kind: PeriodKind = 'all') {
  const period = resolvePeriod(chat, kind);
  const sliced = sliceChat(chat, period);
  return { seed: await computeSeed(sliced, period.key), analytics: analyzeChat(sliced), sliced };
}

export const runText = (text: string, kind: PeriodKind = 'all') => run(parseChat(text), kind);

/** Android exports without files cannot tell media types apart: level the field. */
export function withoutMediaTypes(chat: ParsedChat): ParsedChat {
  return {
    ...chat,
    messages: chat.messages.map((m) =>
      m.kind === 'media' ? { ...m, mediaType: 'media_unknown' as const } : m,
    ),
  };
}
