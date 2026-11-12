/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from './protocol';
import { createSession, SessionError } from './session';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const session = createSession();

/** Reads a file block by block, so a huge export never has to be one giant string. */
async function* readText(file: Blob): AsyncGenerator<string> {
  const reader = file.stream().pipeThrough(new TextDecoderStream('utf-8')).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

async function handle(request: WorkerRequest) {
  switch (request.type) {
    case 'load':
      return session.load(readText(request.file));
    case 'loadText':
      return session.load([request.text]);
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
