import { Redis } from '@upstash/redis';
import { env } from './config.js';

/** The little the server keeps: small JSON documents and counters, all keyed by hashes. */
export type Store = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  /** Sets only if the key does not exist. Returns true if it was set. */
  setIfAbsent(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  /** Increments a counter; the expiry is set when the counter is created. */
  incr(key: string, ttlSeconds: number): Promise<number>;
};

/** In-memory store for local development and tests. Lost on restart. */
export function createMemoryStore(): Store {
  const data = new Map<string, { value: string; expires: number | null }>();
  const read = (key: string) => {
    const entry = data.get(key);
    if (!entry) return null;
    if (entry.expires !== null && entry.expires < Date.now()) {
      data.delete(key);
      return null;
    }
    return entry.value;
  };
  const write = (key: string, value: unknown, ttl?: number) =>
    data.set(key, { value: JSON.stringify(value), expires: ttl ? Date.now() + ttl * 1000 : null });

  return {
    async get<T>(key: string) {
      const raw = read(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    },
    async set(key, value, ttl) {
      write(key, value, ttl);
    },
    async setIfAbsent(key, value, ttl) {
      if (read(key) !== null) return false;
      write(key, value, ttl);
      return true;
    },
    async incr(key, ttl) {
      const next = Number(read(key) ?? '0') + 1;
      const existing = data.get(key);
      data.set(key, {
        value: String(next),
        expires: existing?.expires ?? Date.now() + ttl * 1000,
      });
      return next;
    },
  };
}

function createRedisStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    async get<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async set(key, value, ttl) {
      if (ttl) await redis.set(key, value, { ex: ttl });
      else await redis.set(key, value);
    },
    async setIfAbsent(key, value, ttl) {
      const result = ttl
        ? await redis.set(key, value, { nx: true, ex: ttl })
        : await redis.set(key, value, { nx: true });
      return result === 'OK';
    },
    async incr(key, ttl) {
      const next = await redis.incr(key);
      if (next === 1) await redis.expire(key, ttl);
      return next;
    },
  };
}

let shared: Store | null | undefined;

/**
 * The production store (Upstash Redis, connected from the Vercel dashboard), or null when it
 * is not configured. Accepts both the Upstash and the older Vercel KV variable names.
 */
export function getStore(): Store | null {
  if (shared !== undefined) return shared;
  const url = env('UPSTASH_REDIS_REST_URL') ?? env('KV_REST_API_URL');
  const token = env('UPSTASH_REDIS_REST_TOKEN') ?? env('KV_REST_API_TOKEN');
  shared = url && token ? createRedisStore(url, token) : null;
  return shared;
}

/** Lets the local dev server and the tests plug in a memory store. */
export function setStore(store: Store | null): void {
  shared = store;
}
