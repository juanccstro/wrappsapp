import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Everything the server stores about a person is a keyed hash: without the server secret it
 * cannot be linked back to an email, a network or a chat.
 */
export function keyedHash(secret: string, purpose: string, value: string): string {
  return createHmac('sha256', secret).update(`${purpose}\n${value}`).digest('base64url');
}

export const sameHash = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const newDeviceId = (): string => randomBytes(18).toString('base64url');

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{20,64}$/;
export const isDeviceId = (value: unknown): value is string =>
  typeof value === 'string' && DEVICE_ID_RE.test(value);

/** Fingerprints and chat keys arrive as SHA-256 hex from the browser. */
const HASH_RE = /^[a-f0-9]{64}$/;
export const isHash = (value: unknown): value is string =>
  typeof value === 'string' && HASH_RE.test(value);

/** Recovery codes: easy to type, no 0/O or 1/I. "K7QF-3MXA-PW2D". */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRecoveryCode(): string {
  const bytes = randomBytes(12);
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += CODE_ALPHABET[(bytes[i] as number) % CODE_ALPHABET.length];
    if (i === 3 || i === 7) code += '-';
  }
  return code;
}

/** Invite codes travel in shared links: short, no ambiguous letters ("K7QF3MXA"). */
export function newInviteCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[(bytes[i] as number) % CODE_ALPHABET.length];
  return code;
}

const INVITE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
export const isInviteCode = (value: unknown): value is string =>
  typeof value === 'string' && INVITE_RE.test(value);

export const normalizeCode = (code: string): string => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 320 && EMAIL_RE.test(value.trim());

/**
 * The network part of an address: /24 for IPv4, /48 for IPv6. Used only together with the
 * device fingerprint, so two identical phones on different networks are not mixed up.
 */
export function networkPrefix(ip: string | null): string {
  if (!ip) return 'unknown';
  const address = ip.split(',')[0]?.trim() ?? '';
  if (address.includes('.')) return address.split('.').slice(0, 3).join('.');
  if (address.includes(':')) return address.split(':').slice(0, 3).join(':');
  return 'unknown';
}
