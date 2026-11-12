import type { ChatParseErrorCode } from '../core/parser/types';

export type SessionErrorCode =
  ChatParseErrorCode | 'no_chat_loaded' | 'bad_zip' | 'zip_without_chat' | 'unexpected';

/** What the Worker reports when something goes wrong. The UI maps `code` to a text. */
export class SessionError extends Error {
  readonly code: SessionErrorCode;

  constructor(code: SessionErrorCode) {
    super(`Session error: ${code}`);
    this.name = 'SessionError';
    this.code = code;
  }
}
