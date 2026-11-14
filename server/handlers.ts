import type Stripe from 'stripe';
import { createBilling, type Billing, type Status } from './billing.js';
import { env, isProductId, PENDING_TTL_S, type ProductId } from './config.js';
import { isEmail, isHash, isInviteCode, networkPrefix, newRecoveryCode } from './ids.js';
import { getStore } from './store.js';
import {
  createCheckout,
  getStripe,
  paidCheckout,
  refundStateOf,
  refundTarget,
  type RefundState,
} from './stripe.js';

/**
 * The API of the paid plan. Each handler takes a standard Request and returns a Response, so
 * the same code runs as a Vercel Function (api/*.ts) and inside the local dev server.
 */

const COOKIE = 'wr_device';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 730;

type Pending = { deviceId: string; product: ProductId; code: string };

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

const deviceCookie = (id: string, request: Request) => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${id}; Path=/api; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
};

const readCookie = (request: Request): string | undefined => {
  const header = request.headers.get('cookie') ?? '';
  const match = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(header);
  return match?.[1];
};

const clientIp = (request: Request) =>
  request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for');

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (text.length > 4096) return {};
    const parsed: unknown = JSON.parse(text || '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function origin(request: Request): string {
  const configured = env('PUBLIC_SITE_URL');
  if (configured) return configured.replace(/\/+$/, '');
  return new URL(request.url).origin;
}

/** Billing is on only when it has somewhere to keep the counts and a secret to hash with. */
function billingOrNull(): Billing | null {
  const store = getStore();
  const secret = env('WRAPPSAPP_SECRET');
  return store && secret ? createBilling(store, secret) : null;
}

const notEnforced = (deviceId = ''): Status => ({
  enforced: false,
  deviceId,
  used: 0,
  limit: 0,
  unlimited: false,
  remaining: null,
});

/** Shared start of every device-bound call: who is this, plus the cookie to send back. */
async function identify(billing: Billing, request: Request, body: Record<string, unknown>) {
  const fingerprint = isHash(body.fingerprint) ? body.fingerprint : undefined;
  const crossFingerprint = isHash(body.crossFingerprint) ? body.crossFingerprint : undefined;
  const { id, device } = await billing.resolveDevice({
    deviceId: readCookie(request) ?? body.deviceId,
    fingerprint,
    crossFingerprint,
    network: networkPrefix(clientIp(request)),
  });
  return { id, device, cookie: { 'Set-Cookie': deviceCookie(id, request) } };
}

/** POST /api/status — how many uses this device has left. */
export async function statusHandler(request: Request): Promise<Response> {
  const billing = billingOrNull();
  if (!billing) return json({ status: notEnforced() });
  const body = await readBody(request);
  const { id, device, cookie } = await identify(billing, request, body);
  return json({ status: await billing.status(id, device) }, 200, cookie);
}

/** POST /api/use — spends a use on a chat (the hash of the chat, never its content). */
export async function useHandler(request: Request): Promise<Response> {
  const billing = billingOrNull();
  if (!billing) return json({ allowed: true, status: notEnforced() });
  const body = await readBody(request);
  if (!isHash(body.chatKey)) return json({ error: 'bad_request' }, 400);
  const { id, device, cookie } = await identify(billing, request, body);
  const invite = isInviteCode(body.invite) ? body.invite : undefined;
  const result = await billing.consume(id, device, body.chatKey, invite);
  return json(result, 200, cookie);
}

/** POST /api/checkout — opens a Stripe payment page for a product. */
export async function checkoutHandler(request: Request): Promise<Response> {
  const billing = billingOrNull();
  const stripe = getStripe();
  const store = getStore();
  if (!billing || !stripe || !store) return json({ error: 'payments_unavailable' }, 503);
  const body = await readBody(request);
  if (!isProductId(body.product)) return json({ error: 'bad_request' }, 400);
  if (!(await billing.allow('checkout', clientIp(request) ?? 'unknown', 20, 3600))) {
    return json({ error: 'too_many_requests' }, 429);
  }
  const { id, cookie } = await identify(billing, request, body);
  const code = newRecoveryCode();
  const checkout = await createCheckout({
    stripe,
    product: body.product,
    deviceId: id,
    recoveryCode: code,
    origin: origin(request),
  });
  await store.set(
    `pending:${checkout.id}`,
    { deviceId: id, product: body.product, code },
    PENDING_TTL_S,
  );
  return json({ url: checkout.url }, 200, cookie);
}

/**
 * POST /api/confirm — the return page after paying. Checks the payment with Stripe (so it
 * works even if the webhook is slow), applies it and shows the recovery code once more.
 */
export async function confirmHandler(request: Request): Promise<Response> {
  const billing = billingOrNull();
  const stripe = getStripe();
  const store = getStore();
  if (!billing || !stripe || !store) return json({ error: 'payments_unavailable' }, 503);
  const body = await readBody(request);
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return json({ error: 'bad_request' }, 400);

  const pending = await store.get<Pending>(`pending:${sessionId}`);
  const paid = paidCheckout(await stripe.checkout.sessions.retrieve(sessionId));
  if (!paid || !pending) return json({ paid: false });

  await billing.applyPurchase({
    checkoutId: paid.id,
    deviceId: paid.deviceId,
    email: paid.email,
    product: paid.product,
    recoveryCode: pending.code,
  });
  const { id, device, cookie } = await identify(billing, request, {
    ...body,
    deviceId: paid.deviceId,
  });
  return json(
    {
      paid: true,
      product: paid.product,
      recoveryCode: pending.code,
      status: await billing.status(id, device),
    },
    200,
    cookie,
  );
}

/** POST /api/restore — brings a purchase to this device with the email and recovery code. */
export async function restoreHandler(request: Request): Promise<Response> {
  const billing = billingOrNull();
  if (!billing) return json({ error: 'payments_unavailable' }, 503);
  const body = await readBody(request);
  if (!isEmail(body.email) || typeof body.code !== 'string' || body.code.length > 40) {
    return json({ error: 'bad_request' }, 400);
  }
  // Brute-force protection: a few attempts per network per hour.
  if (!(await billing.allow('restore', clientIp(request) ?? 'unknown', 8, 3600))) {
    return json({ error: 'too_many_requests' }, 429);
  }
  const { id, device, cookie } = await identify(billing, request, body);
  const result = await billing.restore(id, device, body.email, body.code);
  if (!result) return json({ error: 'not_found' }, 404, cookie);
  return json(result, 200, cookie);
}

/** POST /api/stripe-webhook — Stripe tells us a payment went through. Signature checked. */
export async function webhookHandler(request: Request): Promise<Response> {
  const billing = billingOrNull();
  const stripe = getStripe();
  const store = getStore();
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!billing || !stripe || !store || !secret) return json({ error: 'not_configured' }, 503);

  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'bad_signature' }, 400);
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return json({ error: 'bad_signature' }, 400);
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const paid = paidCheckout(event.data.object);
    const pending = paid ? await store.get<Pending>(`pending:${paid.id}`) : null;
    if (paid && pending) {
      await billing.applyPurchase({
        checkoutId: paid.id,
        deviceId: paid.deviceId,
        email: paid.email,
        product: paid.product,
        recoveryCode: pending.code,
      });
    }
  }

  // Refunds made from the Stripe dashboard take the purchase away (and give it back if the
  // refund fails). Partial refunds leave it as it is.
  let refundObject: Stripe.Refund | Stripe.Charge | null = null;
  let state: RefundState | null = null;
  if (
    event.type === 'refund.created' ||
    event.type === 'refund.updated' ||
    event.type === 'refund.failed' ||
    event.type === 'charge.refund.updated'
  ) {
    refundObject = event.data.object;
    state = refundStateOf(event.data.object.status);
  } else if (event.type === 'charge.refunded' && event.data.object.refunded) {
    refundObject = event.data.object;
    state = 'refunded';
  }
  if (refundObject && state) {
    const target = await refundTarget(stripe, refundObject);
    if (target && (target.full || state === 'active')) {
      await billing.setRefundState({
        checkoutId: target.checkoutId,
        email: target.email,
        product: target.product,
        state,
      });
    }
  }
  return json({ received: true });
}

/** Wraps a handler so an unexpected failure never leaks details. */
export const safe =
  (handler: (request: Request) => Promise<Response>) =>
  async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (err) {
      console.error('[api]', err instanceof Error ? err.message : 'unknown error');
      return json({ error: 'server_error' }, 500);
    }
  };
