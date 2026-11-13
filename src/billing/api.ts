import { deviceFingerprint, readDeviceId, saveDeviceId } from './device';

/** Mirrors server/billing.ts (the client never imports server code). */
export type UsageStatus = {
  enforced: boolean;
  deviceId: string;
  used: number;
  limit: number;
  unlimited: boolean;
  remaining: number | null;
};

export type Product = 'pack3' | 'unlimited';

export class BillingError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`Billing error: ${code}`);
    this.name = 'BillingError';
    this.code = code;
  }
}

/**
 * Calls the paid-plan API. Every call carries who this device is (stored id + fingerprint);
 * none carries anything from the chat except, for `use`, a one-way hash of it.
 */
async function call<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const [deviceId, fingerprint] = await Promise.all([readDeviceId(), deviceFingerprint()]);
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, deviceId, fingerprint }),
    });
  } catch {
    throw new BillingError('offline');
  }
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    status?: UsageStatus;
  };
  if (!response.ok) throw new BillingError(data.error ?? 'server_error');
  if (data.status?.deviceId) await saveDeviceId(data.status.deviceId);
  return data;
}

export const fetchStatus = () => call<{ status: UsageStatus }>('status');

export const spendUse = (chatKey: string) =>
  call<{ allowed: boolean; status: UsageStatus }>('use', { chatKey });

export const startCheckout = (product: Product) => call<{ url: string }>('checkout', { product });

export const confirmCheckout = (sessionId: string) =>
  call<{ paid: boolean; product?: Product; recoveryCode?: string; status?: UsageStatus }>(
    'confirm',
    { sessionId },
  );

export const restorePurchase = (email: string, code: string) =>
  call<{ status: UsageStatus }>('restore', { email, code });
