/** Business rules of the paid plan. Prices are in euro cents. */
/** Chats a device unlocks for free (the first one): the rest play with some slides locked. */
export const FREE_USES = 1;
/** Devices a purchase can be used on (the buyer's phone, computer, tablet). */
export const MAX_DEVICES = 3;

export const PRODUCTS = {
  chat: {
    name: 'Wrappsapp · Desbloquear un chat',
    description: 'Desbloquea el Wrapped completo, los datos y las imágenes HD de un chat.',
    amount: 99,
    credits: 1,
    lookupKey: 'wrappsapp_chat',
  },
  pack3: {
    name: 'Wrappsapp · Pack de 3 Wrapped',
    description: 'Desbloquea 3 chats completos, con sus datos e imágenes HD.',
    amount: 199,
    credits: 3,
    /** Lookup key of the price created in the Stripe dashboard. */
    lookupKey: 'wrappsapp_pack3',
  },
  unlimited: {
    name: 'Wrappsapp · Acceso ilimitado',
    description: 'Todos tus chats desbloqueados para siempre, en hasta 3 dispositivos.',
    amount: 499,
    credits: 0,
    lookupKey: 'wrappsapp_unlimited',
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export const isProductId = (value: unknown): value is ProductId =>
  value === 'chat' || value === 'pack3' || value === 'unlimited';

/** How long the "same device and network" fallback remembers a device. */
export const FINGERPRINT_TTL_S = 60 * 60 * 24 * 180;
/** A checkout that was started but not finished is forgotten after this. */
export const PENDING_TTL_S = 60 * 60 * 24 * 7;

export const env = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
};
