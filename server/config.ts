/** Business rules of the paid plan. Prices are in euro cents. */
export const FREE_USES = 2;

export const PRODUCTS = {
  pack3: {
    name: 'Wrappsapp · Pack de 3 Wrapped',
    description: '3 Wrapped más en este dispositivo y en los que recuperes tu compra.',
    amount: 199,
    credits: 3,
  },
  unlimited: {
    name: 'Wrappsapp · Acceso ilimitado',
    description: 'Wrapped ilimitados para siempre.',
    amount: 499,
    credits: 0,
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export const isProductId = (value: unknown): value is ProductId =>
  value === 'pack3' || value === 'unlimited';

/** How long the "same device and network" fallback remembers a device. */
export const FINGERPRINT_TTL_S = 60 * 60 * 24 * 180;
/** A checkout that was started but not finished is forgotten after this. */
export const PENDING_TTL_S = 60 * 60 * 24 * 7;

export const env = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
};
