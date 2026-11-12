import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analytics, PeriodKind, WrappedResult } from '../core';
import { createWrappedClient, type WrappedClient } from '../worker/client';
import { SessionError, type SessionErrorCode } from '../worker/errors';
import type { ChatSummary } from '../worker/session';

export type Screen =
  | { name: 'landing' }
  | { name: 'privacy' }
  | { name: 'upload'; error: SessionErrorCode | null }
  | { name: 'loading' }
  | { name: 'period'; summary: ChatSummary }
  | { name: 'story'; wrapped: WrappedResult; analytics: Analytics; isDemo: boolean; atEnd: boolean }
  | { name: 'report'; wrapped: WrappedResult; analytics: Analytics; isDemo: boolean };

/** The waiting screen is part of the show: never flash it for a few milliseconds. */
const MIN_LOADING_MS = 1600;

const atLeast = async <T>(work: Promise<T>, ms: number): Promise<T> => {
  const [result] = await Promise.all([work, new Promise((resolve) => setTimeout(resolve, ms))]);
  return result;
};

const codeOf = (err: unknown): SessionErrorCode =>
  err instanceof SessionError ? err.code : 'unexpected';

/**
 * Flow of the app: landing → upload → loading → period → story. The chat lives only inside
 * the Worker; leaving terminates it, which is what "Borrar y salir" promises.
 */
export function useWrappsapp() {
  const [screen, setScreen] = useState<Screen>({ name: 'landing' });
  const client = useRef<WrappedClient | null>(null);
  /** Ignores results of work that the user has already walked away from. */
  const run = useRef(0);

  const getClient = () => (client.current ??= createWrappedClient());

  const discard = useCallback(() => {
    run.current++;
    client.current?.dispose();
    client.current = null;
  }, []);

  useEffect(() => discard, [discard]);

  const loadFile = useCallback(async (file: File) => {
    const id = ++run.current;
    setScreen({ name: 'loading' });
    try {
      const summary = await atLeast(getClient().loadFile(file, file.name), MIN_LOADING_MS);
      if (run.current === id) setScreen({ name: 'period', summary });
    } catch (err) {
      if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
    }
  }, []);

  const start = useCallback(async (period: PeriodKind, isDemo = false) => {
    const id = ++run.current;
    setScreen({ name: 'loading' });
    try {
      const { wrapped, analytics } = await atLeast(getClient().analyze(period), MIN_LOADING_MS);
      if (run.current === id) {
        setScreen({ name: 'story', wrapped, analytics, isDemo, atEnd: false });
      }
    } catch (err) {
      if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
    }
  }, []);

  const loadDemo = useCallback(async () => {
    const id = ++run.current;
    setScreen({ name: 'loading' });
    try {
      const { DEMO_FILE_NAME, generateDemoChat } = await import('../demo/demoChat');
      const summary = await getClient().loadText(generateDemoChat(), DEMO_FILE_NAME);
      if (run.current === id) await start(summary.defaultPeriod, true);
    } catch (err) {
      if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
    }
  }, [start]);

  const goUpload = useCallback(() => setScreen({ name: 'upload', error: null }), []);
  const goPrivacy = useCallback(() => setScreen({ name: 'privacy' }), []);

  /** From the last slide to the full report, and back to where the story ended. */
  const openReport = useCallback(() => {
    setScreen((s) => (s.name === 'story' ? { ...s, name: 'report' } : s));
  }, []);
  const backToStory = useCallback(() => {
    setScreen((s) => (s.name === 'report' ? { ...s, name: 'story', atEnd: true } : s));
  }, []);

  const reset = useCallback(() => {
    discard();
    setScreen({ name: 'landing' });
  }, [discard]);

  return {
    screen,
    goUpload,
    goPrivacy,
    loadFile,
    loadDemo,
    start,
    openReport,
    backToStory,
    reset,
  };
}
