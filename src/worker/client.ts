import type { PeriodKind } from '../core';
import type { WorkerRequest, WorkerResponse, WorkerResult } from './protocol';
import { SessionError } from './errors';
import type { AnalysisResult, ChatSummary } from './session';

type Pending = { resolve: (value: never) => void; reject: (error: Error) => void };
type RequestBody = WorkerRequest extends infer R
  ? R extends { id: number }
    ? Omit<R, 'id'>
    : never
  : never;

export type WrappedClient = {
  /** Parses a .txt export inside the Worker. */
  loadFile(file: Blob, fileName?: string): Promise<ChatSummary>;
  loadText(text: string, fileName?: string): Promise<ChatSummary>;
  analyze(period: PeriodKind): Promise<AnalysisResult>;
  /** The loaded chat as text. */
  text(): Promise<string>;
  /** Forgets the chat and stops the Worker. */
  dispose(): void;
};

/** Promise API over the Worker. Rejects with SessionError (see `code`). */
export function createWrappedClient(): WrappedClient {
  const worker = new Worker(new URL('./wrapped.worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, Pending>();
  let nextId = 1;

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) return;
    pending.delete(response.id);
    if (response.ok) entry.resolve(response.result as never);
    else entry.reject(new SessionError(response.code));
  };
  worker.onerror = () => {
    for (const entry of pending.values()) entry.reject(new SessionError('unexpected'));
    pending.clear();
  };

  const call = <K extends keyof WorkerResult>(body: RequestBody & { type: K }) =>
    new Promise<WorkerResult[K]>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: resolve as Pending['resolve'], reject });
      worker.postMessage({ ...body, id } as WorkerRequest);
    });

  return {
    loadFile: (file, fileName) => call({ type: 'load', file, fileName }),
    loadText: (text, fileName) => call({ type: 'loadText', text, fileName }),
    analyze: (period) => call({ type: 'analyze', period }),
    text: () => call({ type: 'text' }),
    dispose() {
      worker.terminate();
      for (const entry of pending.values()) entry.reject(new SessionError('unexpected'));
      pending.clear();
    },
  };
}
