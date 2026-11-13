import { checkoutHandler, safe } from '../server/handlers.js';

/** Vercel Function: see server/handlers.ts. */
export const POST = safe(checkoutHandler);
