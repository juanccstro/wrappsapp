import { useCallback, useEffect, useState } from 'react';
import {
  BillingError,
  confirmCheckout,
  fetchStatus,
  restorePurchase,
  startCheckout,
  spendUse,
  type Product,
  type RestoreOutcome,
  type UsageStatus,
} from './api';

export type PurchaseResult = { product: Product; recoveryCode: string };

export type ConsumeResult = 'ok' | 'blocked' | 'error';

const errorCode = (err: unknown) => (err instanceof BillingError ? err.code : 'server_error');

/**
 * State of the free-use limit and purchases. When the server reports that billing is not
 * configured (`enforced: false`), nothing is limited and nothing is shown.
 */
export function useBilling() {
  const [status, setStatus] = useState<UsageStatus | null>(null);
  const [purchase, setPurchase] = useState<PurchaseResult | null>(null);
  /** Set when the visitor comes back from Stripe, to open the right view of the paywall. */
  const [returned, setReturned] = useState<'success' | 'pending' | 'cancel' | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus((await fetchStatus()).status);
    } catch {
      // Offline or API missing: no indicator; the limit is checked again before each use.
    }
  }, []);

  // Coming back from the Stripe payment page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('checkout');
    const sessionId = params.get('session_id');
    if (outcome) window.history.replaceState(null, '', window.location.pathname);

    if (outcome === 'success' && sessionId) {
      setReturned('pending');
      void confirmCheckout(sessionId)
        .then((result) => {
          if (result.paid && result.product && result.recoveryCode) {
            setPurchase({ product: result.product, recoveryCode: result.recoveryCode });
            if (result.status) setStatus(result.status);
            setReturned('success');
          } else {
            // Paid with a delayed method, or the confirmation is still on its way.
            setReturned('pending');
            void refresh();
          }
        })
        .catch(() => {
          setReturned('pending');
          void refresh();
        });
    } else {
      if (outcome === 'cancel') setReturned('cancel');
      void refresh();
    }
  }, [refresh]);

  /** Spends a use on a chat before generating its Wrapped. */
  const consume = useCallback(async (chatKey: string): Promise<ConsumeResult> => {
    try {
      const result = await spendUse(chatKey);
      setStatus(result.status);
      if (!result.status.enforced) return 'ok';
      return result.allowed ? 'ok' : 'blocked';
    } catch {
      return 'error';
    }
  }, []);

  /** Sends the visitor to Stripe. Returns an error code if it could not start. */
  const checkout = useCallback(async (product: Product): Promise<string | null> => {
    try {
      const { url } = await startCheckout(product);
      window.location.assign(url);
      return null;
    } catch (err) {
      return errorCode(err);
    }
  }, []);

  /** Restores a purchase. Returns what happened, or an error code. */
  const restore = useCallback(
    async (email: string, code: string): Promise<{ outcome?: RestoreOutcome; error?: string }> => {
      try {
        const result = await restorePurchase(email, code);
        setStatus(result.status);
        return { outcome: result.outcome };
      } catch (err) {
        return { error: errorCode(err) };
      }
    },
    [],
  );

  const exhausted = Boolean(
    status?.enforced && !status.unlimited && status.remaining !== null && status.remaining <= 0,
  );

  return {
    status,
    exhausted,
    purchase,
    returned,
    clearReturned: () => setReturned(null),
    refresh,
    consume,
    checkout,
    restore,
  };
}

export type BillingApi = ReturnType<typeof useBilling>;
