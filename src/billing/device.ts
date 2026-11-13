/**
 * How this browser is recognised for the free-use limit. The id the server hands out is kept
 * in two places (localStorage and IndexedDB) besides the server's own cookie; if all of them
 * are cleared, the server can still find the device through a fingerprint of the device
 * combined with its network. Nothing here reads the chat.
 */

const KEY = 'wrappsapp:device';
const DB = 'wrappsapp';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE).objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(value: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, KEY);
  } catch {
    // Storage blocked: the cookie and the fingerprint still work.
  }
}

export async function readDeviceId(): Promise<string | undefined> {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
  } catch {
    // Private mode or storage disabled.
  }
  return (await idbGet()) ?? undefined;
}

export async function saveDeviceId(id: string): Promise<void> {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Ignore: see readDeviceId.
  }
  await idbSet(id);
}

function canvasSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 5, 90, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Wrappsapp, 2026', 4, 12);
    return canvas.toDataURL().slice(-64);
  } catch {
    return '';
  }
}

function webglSignature(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info
      ? `${gl.getParameter(info.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(info.UNMASKED_RENDERER_WEBGL)}`
      : String(gl.getParameter(gl.RENDERER));
  } catch {
    return '';
  }
}

let cached: Promise<string> | null = null;

/** SHA-256 of a few stable traits of this device and browser. Computed once per visit. */
export function deviceFingerprint(): Promise<string> {
  cached ??= (async () => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const traits = [
      nav.userAgent,
      nav.language,
      (nav.languages ?? []).join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(window.devicePixelRatio),
      String(nav.hardwareConcurrency ?? ''),
      String(nav.deviceMemory ?? ''),
      String(nav.maxTouchPoints ?? ''),
      canvasSignature(),
      webglSignature(),
    ].join('\n');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(traits));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  })();
  return cached;
}

/** Operating system family from the user agent, without versions (they change per browser). */
function osFamily(userAgent: string): string {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    // iPadOS reports itself as a Mac, but has a touch screen.
    return navigator.maxTouchPoints > 1 ? 'ios' : 'mac';
  }
  if (/Windows/i.test(userAgent)) return 'windows';
  if (/CrOS/i.test(userAgent)) return 'chromeos';
  if (/Linux/i.test(userAgent)) return 'linux';
  return 'other';
}

let cachedCross: Promise<string> | null = null;

/**
 * SHA-256 of traits every browser on the same device reports alike, and that privacy browsers
 * such as Brave do not randomise: physical screen size (CSS size × pixel ratio, so page zoom
 * does not change it), colour depth, time zone, OS family and touch support. Combined on the
 * server with the network, it lets another browser of the same phone share the counter.
 */
export function crossDeviceFingerprint(): Promise<string> {
  cachedCross ??= (async () => {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(screen.width * ratio);
    const h = Math.round(screen.height * ratio);
    const traits = [
      osFamily(navigator.userAgent),
      // Orientation-independent: phones swap width and height when rotated.
      `${Math.max(w, h)}x${Math.min(w, h)}`,
      String(screen.colorDepth),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.maxTouchPoints > 0 ? 'touch' : 'no-touch',
    ].join('\n');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(traits));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  })();
  return cachedCross;
}
