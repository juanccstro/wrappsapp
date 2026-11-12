import { motion, useReducedMotion } from 'framer-motion';
import logo from '../../assets/logo.png';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import { LockIcon } from '../components/icons';

type Props = { onStart: () => void; onDemo: () => void };

export function Landing({ onStart, onDemo }: Props) {
  const reduced = useReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay } }
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { type: 'spring' as const, stiffness: 120, damping: 16, delay },
        };

  return (
    <main className="relative flex h-full flex-col overflow-y-auto px-6 pt-10 pb-6">
      {/* Decorative shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="wr-blob wr-blob-a -top-16 -right-20 h-64 w-64 bg-[var(--wr-a)]" />
        <div className="wr-blob wr-blob-b top-1/2 -left-24 h-72 w-72 bg-[var(--wr-c)]" />
        <div className="wr-blob wr-blob-c -bottom-20 right-0 h-56 w-56 bg-[var(--wr-b)]" />
      </div>

      <div className="relative flex flex-1 flex-col justify-center gap-6">
        <motion.div {...rise(0)} className="flex items-center gap-3">
          <img src={logo} alt="" width={56} height={56} className="h-14 w-14" />
          <p className="font-display text-xl font-black tracking-tight">{es.app.name}</p>
        </motion.div>

        <h1 className="font-display text-[2.6rem] leading-[1.02] font-black tracking-tight">
          {es.landing.title.map((line, i) => (
            <motion.span key={line} {...rise(0.08 + i * 0.1)} className="block">
              {i === 1 ? (
                <span className="bg-gradient-to-r from-[var(--wr-a)] via-[var(--wr-b)] to-[var(--wr-d)] bg-clip-text text-transparent">
                  {line}
                </span>
              ) : (
                line
              )}
            </motion.span>
          ))}
        </h1>

        <motion.p {...rise(0.3)} className="max-w-[34ch] text-base leading-relaxed text-white/85">
          {es.landing.intro}
        </motion.p>

        <motion.div {...rise(0.42)} className="flex flex-col gap-3">
          <Button onClick={onStart}>{es.landing.start}</Button>
          <Button variant="secondary" onClick={onDemo}>
            {es.landing.demo}
          </Button>
        </motion.div>

        <motion.div
          {...rise(0.54)}
          className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed"
        >
          <p className="flex items-start gap-2 font-semibold">
            <LockIcon className="mt-0.5 shrink-0 text-[var(--wr-d)]" />
            {es.app.privacy}
          </p>
          <p className="mt-1 text-white/75">{es.landing.privacyDetail}</p>
          <p className="mt-2 text-white/75">{es.landing.consent}</p>
        </motion.div>
      </div>

      <footer className="relative pt-6 text-center text-xs text-white/60">
        {es.app.disclaimer}
      </footer>
    </main>
  );
}
