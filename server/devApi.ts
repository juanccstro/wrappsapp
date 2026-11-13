import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import {
  checkoutHandler,
  confirmHandler,
  restoreHandler,
  safe,
  statusHandler,
  useHandler,
  webhookHandler,
} from './handlers.js';
import { createMemoryStore, getStore, setStore } from './store.js';

const routes: Record<string, (request: Request) => Promise<Response>> = {
  '/api/status': safe(statusHandler),
  '/api/use': safe(useHandler),
  '/api/checkout': safe(checkoutHandler),
  '/api/confirm': safe(confirmHandler),
  '/api/restore': safe(restoreHandler),
  '/api/stripe-webhook': safe(webhookHandler),
};

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(', '));
  }
  if (!headers.has('x-real-ip')) headers.set('x-real-ip', req.socket.remoteAddress ?? '127.0.0.1');
  return new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
  });
}

async function send(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

const middleware: Connect.NextHandleFunction = (req, res, next) => {
  const path = (req.url ?? '').split('?')[0] ?? '';
  const route = routes[path];
  if (!route) return next();
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }
  void toRequest(req)
    .then(route)
    .then((response) => send(res, response))
    .catch(() => {
      res.statusCode = 500;
      res.end();
    });
};

/**
 * Serves the /api functions inside `vite` and `vite preview`, so the paid plan works locally
 * and in the E2E tests exactly as on Vercel. Without Redis credentials it keeps the counts in
 * memory; set WRAPPSAPP_SECRET to any value locally (a default one is used otherwise).
 */
export function devApi(): Plugin {
  const setup = () => {
    if (!process.env.WRAPPSAPP_SECRET) process.env.WRAPPSAPP_SECRET = 'local-development-only';
    if (process.env.WRAPPSAPP_BILLING === 'off') {
      setStore(null);
      delete process.env.WRAPPSAPP_SECRET;
    } else if (!getStore()) setStore(createMemoryStore());
  };
  return {
    name: 'wrappsapp-dev-api',
    configureServer(server) {
      setup();
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      setup();
      server.middlewares.use(middleware);
    },
  };
}
