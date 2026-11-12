import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { es } from '../../i18n/es';

const MESSAGE_MS = 1100;
const BARS = [0, 1, 2, 3, 4, 5, 6];

/** Fun waiting screen while the Worker reads and analyses the chat. */
export function Loading() {
  const reduced = useReducedMotion();
  const messages = es.loading.messages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), MESSAGE_MS);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <div aria-hidden="true" className="flex h-24 items-center gap-2">
        {BARS.map((bar) => (
          <span
            key={bar}
            className="wr-eq-bar block h-full w-3 origin-center rounded-full"
            style={{
              background: `var(--wr-${'abcd'[bar % 4]})`,
              animation: `wr-pulse-bar ${0.7 + (bar % 3) * 0.18}s ease-in-out ${bar * 0.09}s infinite`,
            }}
          />
        ))}
      </div>

      <h1 className="font-display text-2xl leading-tight font-black">{es.loading.title}</h1>

      <div className="h-8" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -12 }}
            transition={{ duration: 0.25 }}
            className="text-lg text-white/90"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-sm text-white/70">{es.app.privacy}</p>
    </main>
  );
}
