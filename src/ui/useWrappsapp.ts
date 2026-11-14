import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analytics, PeriodKind, WrappedResult } from '../core';
import { createWrappedClient, type WrappedClient } from '../worker/client';
import { SessionError, type SessionErrorCode } from '../worker/errors';
import type { ChatSummary } from '../worker/session';

export type Screen =
  | { name: 'landing' }
  | { name: 'privacy' }
  | { name: 'terms' }
  | { name: 'upload'; error: SessionErrorCode | null }
  | { name: 'loading' }
  | { name: 'period'; summary: ChatSummary }
  | {
      name: 'story';
      wrapped: WrappedResult;
      analytics: Analytics;
      isDemo: boolean;
      /** Slide to open on (0 normally, the last one coming back from the report). */
      at: number;
      /** False while the chat is not unlocked: some slides, the report and HD are locked. */
      unlocked: boolean;
    }
  | {
      name: 'report';
      wrapped: WrappedResult;
      analytics: Analytics;
      isDemo: boolean;
      unlocked: boolean;
    };

/** What the page knows about the chat on screen, to unlock it or carry it across a payment. */
export type CurrentChat = { chatKey: string; fileName?: string; period: PeriodKind };

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
  const current = useRef<{ chatKey: string; fileName?: string; period?: PeriodKind } | null>(null);

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
      current.current = { chatKey: summary.chatKey, fileName: file.name };
      if (run.current === id) setScreen({ name: 'period', summary });
    } catch (err) {
      if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
    }
  }, []);

  const start = useCallback(
    async (
      period: PeriodKind,
      options: { isDemo?: boolean; unlocked?: boolean; at?: number | 'report' } = {},
    ) => {
      const { isDemo = false, unlocked = true, at = 0 } = options;
      const id = ++run.current;
      setScreen({ name: 'loading' });
      if (current.current) current.current.period = period;
      try {
        const { wrapped, analytics } = await atLeast(getClient().analyze(period), MIN_LOADING_MS);
        if (run.current === id) {
          setScreen(
            at === 'report'
              ? { name: 'report', wrapped, analytics, isDemo, unlocked }
              : { name: 'story', wrapped, analytics, isDemo, at, unlocked },
          );
        }
      } catch (err) {
        if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
      }
    },
    [],
  );

  const loadDemo = useCallback(async () => {
    const id = ++run.current;
    setScreen({ name: 'loading' });
    try {
      const { DEMO_FILE_NAME, generateDemoChat } = await import('../demo/demoChat');
      const summary = await getClient().loadText(generateDemoChat(), DEMO_FILE_NAME);
      current.current = null;
      if (run.current === id) await start(summary.defaultPeriod, { isDemo: true });
    } catch (err) {
      if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
    }
  }, [start]);

  const goUpload = useCallback(() => setScreen({ name: 'upload', error: null }), []);
  const goPrivacy = useCallback(() => setScreen({ name: 'privacy' }), []);
  const goTerms = useCallback(() => setScreen({ name: 'terms' }), []);

  /** From the last slide to the full report, and back to where the story ended. */
  const openReport = useCallback(() => {
    setScreen((s) => (s.name === 'story' ? { ...s, name: 'report' } : s));
  }, []);
  const backToStory = useCallback(() => {
    setScreen((s) =>
      s.name === 'report' ? { ...s, name: 'story', at: s.wrapped.slides.length - 1 } : s,
    );
  }, []);

  /** The chat on screen is now unlocked (paid, or a purchase applied to it). */
  const markUnlocked = useCallback(() => {
    setScreen((s) => (s.name === 'story' || s.name === 'report' ? { ...s, unlocked: true } : s));
  }, []);

  const currentChat = useCallback((): CurrentChat | null => {
    const chat = current.current;
    return chat?.period
      ? { chatKey: chat.chatKey, fileName: chat.fileName, period: chat.period }
      : null;
  }, []);

  /** The text of the chat on screen, to keep it on this device while paying. */
  const chatText = useCallback(() => getClient().text(), []);

  /** Back from paying: the chat kept before leaving is loaded again. */
  const resumeChat = useCallback(async (text: string, fileName?: string) => {
    const id = ++run.current;
    setScreen({ name: 'loading' });
    try {
      const summary = await getClient().loadText(text, fileName);
      current.current = { chatKey: summary.chatKey, fileName };
      return run.current === id ? summary : null;
    } catch (err) {
      if (run.current === id) setScreen({ name: 'upload', error: codeOf(err) });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    current.current = null;
    discard();
    setScreen({ name: 'landing' });
  }, [discard]);

  return {
    screen,
    goUpload,
    goPrivacy,
    goTerms,
    loadFile,
    loadDemo,
    start,
    openReport,
    backToStory,
    markUnlocked,
    currentChat,
    chatText,
    resumeChat,
    reset,
  };
}
