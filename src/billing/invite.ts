/**
 * Invites. A shared link carries the sharer's invite code in `?r=`. The first code a browser
 * arrives with is kept and sent along with this device's first Wrapped: if it is really the
 * device's first one, the sharer earns a point (the server decides). Nothing personal: the
 * code is random and only identifies the sharer's device to the server.
 */

const KEY = 'wr_invite';
const PARAM = 'r';
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

/** Reads `?r=` once, keeps it if none was kept before, and removes it from the address. */
export function captureInvite(): void {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get(PARAM)?.toUpperCase();
    if (!url.searchParams.has(PARAM)) return;
    url.searchParams.delete(PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (code && CODE_RE.test(code) && !localStorage.getItem(KEY)) localStorage.setItem(KEY, code);
  } catch {
    // Storage blocked: the invite simply does not count.
  }
}

export function storedInvite(): string | undefined {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** The address of the web with this device's invite code. */
export function inviteUrl(code: string | undefined, hash = ''): string {
  const base = `${window.location.origin}/`;
  return `${base}${code ? `?${PARAM}=${code}` : ''}${hash}`;
}
