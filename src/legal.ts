/**
 * Who sells. Spanish law (LSSI) requires showing it on the site; it appears in the terms
 * screen. FILL THESE IN before taking real payments.
 */
export const LEGAL = {
  owner: '[Nombre y apellidos del titular]',
  taxId: '[NIF]',
  location: '[Ciudad], España',
  email: '[email de contacto]',
  updated: '13 de noviembre de 2026',
} as const;

/** True while any field above still holds a placeholder. */
export const legalIncomplete = Object.values(LEGAL).some((value) => value.startsWith('['));
