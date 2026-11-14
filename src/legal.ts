/**
 * Who runs Wrappsapp, shown in the terms screen. The tax ID is deliberately not published
 * (the owner's choice): the sale itself is made by Link (Stripe) as merchant of record.
 */
export const LEGAL = {
  owner: 'DroneScope',
  location: 'Vigo, España',
  email: 'dronescopecompare@gmail.com',
  updated: '14 de noviembre de 2026',
} as const;

/** True while any field above still holds a placeholder. */
export const legalIncomplete = Object.values(LEGAL).some((value) => value.startsWith('['));
