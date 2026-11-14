import type { PeriodKind } from '../core';
import type { AnalysisResult, ChatSummary, SessionErrorCode } from './session';

/** Messages the page sends to the Worker. The chat only ever travels page → Worker. */
export type WorkerRequest =
  | { id: number; type: 'load'; file: Blob; fileName?: string }
  | { id: number; type: 'loadText'; text: string; fileName?: string }
  | { id: number; type: 'analyze'; period: PeriodKind }
  | { id: number; type: 'text' }
  | { id: number; type: 'clear' };

export type WorkerResult = {
  load: ChatSummary;
  loadText: ChatSummary;
  analyze: AnalysisResult;
  text: string;
  clear: null;
};

export type WorkerResponse =
  | { id: number; ok: true; result: WorkerResult[keyof WorkerResult] }
  | { id: number; ok: false; code: SessionErrorCode };
