import { describe, expect, it } from 'vitest';
import { createSession, SessionError } from '../../src/worker/session';
import { loadFixture } from './helpers';

function* inBlocks(text: string, size: number) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    if (err instanceof SessionError) return err.code;
    throw err;
  }
  return null;
};

describe('worker session', () => {
  it('loads a chat in blocks, summarises it and analyses a period', async () => {
    const session = createSession();
    const summary = await session.load(inBlocks(loadFixture('ios-es-24h.txt'), 37));
    expect(summary.participants).toHaveLength(4);
    expect(summary.meta.platform).toBe('ios');
    expect(summary.periods.map((p) => p.period.kind)).toEqual(['year', 'last12', 'all']);
    expect(summary.defaultPeriod).toBe('all');

    const result = await session.analyze('all');
    expect(result.seed).toMatch(/^[0-9a-f]{64}$/);
    expect(result.analytics.totals.messages).toBe(18);
    expect(result.isGroup).toBe(true);
    // The result must survive postMessage (structured clone).
    expect(structuredClone(result)).toEqual(result);
  });

  it('reports friendly error codes', async () => {
    const session = createSession();
    expect(await codeOf(session.analyze('all'))).toBe('no_chat_loaded');
    expect(await codeOf(session.load([loadFixture('not-a-chat.txt')]))).toBe('not_a_chat');
    expect(await codeOf(session.load([]))).toBe('empty');
  });

  it('forgets the chat on clear', async () => {
    const session = createSession();
    await session.load([loadFixture('android-es-24h.txt')]);
    session.clear();
    expect(await codeOf(session.analyze('all'))).toBe('no_chat_loaded');
  });
});
