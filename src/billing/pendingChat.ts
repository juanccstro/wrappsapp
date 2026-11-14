import type { PeriodKind } from '../core';

/**
 * The chat someone was looking at when they went to pay. Paying leaves the page (Stripe's own
 * payment page), which would lose the chat; it is kept here, in this browser only, and read
 * back (and deleted) on return. Never sent anywhere. Forgotten after two hours regardless.
 */
export type PendingChat = {
  text: string;
  fileName?: string;
  period: PeriodKind;
  /** Where to come back to: a slide index, or the full report. */
  at: number | 'report';
  savedAt: number;
};

const DB = 'wrappsapp-pending';
const STORE = 'chat';
const KEY = 'current';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB'));
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('indexedDB'));
    });
  } finally {
    db.close();
  }
}

/** Keeps the chat until the visitor is back. False if the browser does not allow it. */
export async function savePendingChat(chat: Omit<PendingChat, 'savedAt'>): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put({ ...chat, savedAt: Date.now() }, KEY));
    return true;
  } catch {
    return false;
  }
}

/** Reads the chat kept before paying and deletes it in the same step. */
export async function takePendingChat(): Promise<PendingChat | null> {
  try {
    const chat = await run<PendingChat | undefined>('readonly', (store) => store.get(KEY));
    await run('readwrite', (store) => store.delete(KEY));
    if (!chat || Date.now() - chat.savedAt > MAX_AGE_MS) return null;
    return chat;
  } catch {
    return null;
  }
}
