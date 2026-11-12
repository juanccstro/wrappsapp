/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from './protocol';
import { readExport } from './readExport';
import { createSession, SessionError } from './session';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const session = createSession();

async function handle(request: WorkerRequest) {
  switch (request.type) {
    case 'load':
      return session.load(readExport(request.file), request.fileName);
    case 'loadText':
      return session.load([request.text], request.fileName);
    case 'analyze':
      return session.analyze(request.period);
    case 'clear':
      session.clear();
      return null;
  }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id } = event.data;
  handle(event.data).then(
    (result) => ctx.postMessage({ id, ok: true, result } satisfies WorkerResponse),
    (err: unknown) =>
      ctx.postMessage({
        id,
        ok: false,
        code: err instanceof SessionError ? err.code : 'unexpected',
      } satisfies WorkerResponse),
  );
};
