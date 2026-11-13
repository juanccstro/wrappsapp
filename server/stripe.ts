import Stripe from 'stripe';
import { env, PRODUCTS, type ProductId } from './config.js';

let client: Stripe | null | undefined;

/** Created lazily: the key is only read when a payment is actually requested. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = env('STRIPE_SECRET_KEY');
  client = key ? new Stripe(key) : null;
  return client;
}

/**
 * A Stripe-hosted payment page. Wrappsapp never sees card or bank details: the customer pays
 * on checkout.stripe.com, with whatever methods are enabled in the Stripe dashboard (cards,
 * Apple Pay, Google Pay, PayPal…). The recovery code goes into the receipt Stripe emails.
 */
export async function createCheckout(input: {
  stripe: Stripe;
  product: ProductId;
  deviceId: string;
  recoveryCode: string;
  origin: string;
}): Promise<{ id: string; url: string }> {
  const product = PRODUCTS[input.product];
  const session = await input.stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'es',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: product.amount,
          product_data: { name: product.name, description: product.description },
        },
      },
    ],
    client_reference_id: input.deviceId,
    metadata: { deviceId: input.deviceId, product: input.product },
    payment_intent_data: {
      description: `${product.name}. Código de recuperación: ${input.recoveryCode}`,
      metadata: { deviceId: input.deviceId, product: input.product },
    },
    success_url: `${input.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/?checkout=cancel`,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { id: session.id, url: session.url };
}

export type PaidCheckout = {
  id: string;
  deviceId: string;
  product: ProductId;
  email: string;
};

/** The facts of a finished, paid checkout, or null if it is not paid (yet). */
export function paidCheckout(session: Stripe.Checkout.Session): PaidCheckout | null {
  if (session.payment_status !== 'paid') return null;
  const deviceId = session.metadata?.deviceId;
  const product = session.metadata?.product;
  const email = session.customer_details?.email ?? session.customer_email;
  if (!deviceId || (product !== 'pack3' && product !== 'unlimited') || !email) return null;
  return { id: session.id, deviceId, product, email };
}
