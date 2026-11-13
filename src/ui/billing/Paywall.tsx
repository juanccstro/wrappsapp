import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Product, RestoreOutcome, UsageStatus } from '../../billing/api';
import type { PurchaseResult } from '../../billing/useBilling';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import { BackIcon, CheckIcon, CloseIcon, LockIcon } from '../components/icons';

export type PaywallView = 'limit' | 'more' | 'restore' | 'success' | 'pending' | 'cancel' | 'error';

type Props = {
  view: PaywallView | null;
  status: UsageStatus | null;
  purchase: PurchaseResult | null;
  /** Error shown in the "error" view (a key of es.billing.errors). */
  errorCode?: string;
  onClose: () => void;
  onCheckout: (product: Product) => Promise<string | null>;
  onRestore: (email: string, code: string) => Promise<{ outcome?: RestoreOutcome; error?: string }>;
  onTerms: () => void;
};

const t = es.billing;
const errorText = (code: string) => t.errors[code] ?? t.errors.server_error;

/**
 * The paid plan, as a sheet that rises from the bottom over the app. Payment happens on
 * Stripe's own page: this only lets the visitor choose, accept the conditions and go there.
 */
export function Paywall(props: Props) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PaywallView | null>(props.view);

  useEffect(() => setView(props.view), [props.view]);

  // Keyboard: Escape closes, focus moves into the sheet when it opens.
  useEffect(() => {
    if (!view) return;
    sheet.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, props]);

  return (
    <AnimatePresence>
      {view && (
        <motion.div
          key="paywall"
          className="absolute inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label={t.close}
            tabIndex={-1}
            onClick={props.onClose}
            className="absolute inset-0 cursor-default bg-[#07020f]/70 backdrop-blur-sm"
          />
          <motion.div
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative max-h-[92%] w-full overflow-y-auto rounded-t-[2rem] border-t border-white/15 bg-[var(--wr-bg)] px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-30px_80px_rgba(0,0,0,0.55)] outline-none"
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            {/* Soft glow of the palette behind the top of the sheet */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60"
              style={{
                background:
                  'radial-gradient(70% 100% at 50% 0%, color-mix(in srgb, var(--wr-a) 45%, transparent), transparent 70%)',
              }}
            />
            <div className="relative">
              <div
                className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={props.onClose}
                aria-label={t.close}
                className="absolute top-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20"
              >
                <CloseIcon />
              </button>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: reduced ? 0 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduced ? 0 : -24 }}
                  transition={{ duration: 0.18 }}
                >
                  {(view === 'limit' || view === 'more') && (
                    <Plans
                      {...props}
                      titleId={titleId}
                      limitReached={view === 'limit'}
                      onRestoreView={() => setView('restore')}
                    />
                  )}
                  {view === 'restore' && (
                    <Restore {...props} titleId={titleId} onBack={() => setView('more')} />
                  )}
                  {view === 'success' && props.purchase && (
                    <Success purchase={props.purchase} titleId={titleId} onClose={props.onClose} />
                  )}
                  {view === 'pending' && (
                    <Message
                      titleId={titleId}
                      title={t.pendingTitle}
                      text={t.pendingText}
                      action={t.continue}
                      onAction={props.onClose}
                      secondary={t.restoreLink}
                      onSecondary={() => setView('restore')}
                    />
                  )}
                  {view === 'cancel' && (
                    <Message
                      titleId={titleId}
                      title={t.cancelTitle}
                      text={t.cancelText}
                      action={t.back}
                      onAction={() => setView('more')}
                    />
                  )}
                  {view === 'error' && (
                    <Message
                      titleId={titleId}
                      title={t.errors.server_error ?? ''}
                      text={errorText(props.errorCode ?? 'server_error')}
                      action={t.continue}
                      onAction={props.onClose}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="pr-12 font-display text-[1.7rem] leading-[1.08] font-black text-balance">
      {children}
    </h2>
  );
}

function Plans({
  titleId,
  status,
  limitReached,
  onCheckout,
  onRestoreView,
  onTerms,
}: Props & { titleId: string; limitReached: boolean; onRestoreView: () => void }) {
  const [product, setProduct] = useState<Product>('unlimited');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentId = useId();

  const pay = async () => {
    if (!accepted || busy) return;
    setBusy(true);
    setError(null);
    const failure = await onCheckout(product);
    // On success the browser is already leaving for Stripe: keep the busy state.
    if (failure) {
      setError(errorText(failure));
      setBusy(false);
    }
  };

  const plans: Product[] = ['unlimited', 'pack3'];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Heading id={titleId}>{limitReached ? t.limitTitle : t.moreTitle}</Heading>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          {limitReached ? t.limitText(status?.limit ?? 2) : t.moreText}
        </p>
      </div>

      <div role="radiogroup" aria-label={t.moreTitle} className="flex flex-col gap-2.5">
        {plans.map((id) => {
          const plan = t.plans[id];
          const selected = product === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setProduct(id)}
              className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors ${
                selected
                  ? 'border-[var(--wr-hi)] bg-white/10'
                  : 'border-white/15 bg-white/[0.04] hover:border-white/30'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected
                    ? 'border-[var(--wr-hi)] bg-[var(--wr-hi)] text-[#12062b]'
                    : 'border-white/40'
                }`}
              >
                {selected && <CheckIcon className="text-xs" strokeWidth={3.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-base font-black">{plan.title}</span>
                  {'badge' in plan && (
                    <span className="rounded-full bg-[var(--wr-hi)] px-2 py-0.5 text-[0.65rem] font-bold text-[#12062b]">
                      {plan.badge}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-white/75">{plan.detail}</span>
              </span>
              <span className="font-display text-lg font-black tabular-nums">{plan.price}</span>
            </button>
          );
        })}
        <p className="text-center text-xs text-white/65">{t.oneTime}</p>
      </div>

      <label
        htmlFor={consentId}
        className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.04] p-3 text-xs leading-relaxed text-white/85"
      >
        <input
          id={consentId}
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--wr-hi)]"
        />
        <span>
          {t.consent}{' '}
          <button
            type="button"
            onClick={onTerms}
            className="cursor-pointer font-semibold text-white underline underline-offset-2"
          >
            {t.termsLink}
          </button>
        </span>
      </label>

      <Button onClick={() => void pay()} disabled={!accepted || busy}>
        <LockIcon />
        {busy ? t.redirecting : t.pay(t.plans[product].price)}
      </Button>

      <p
        role="alert"
        aria-live="assertive"
        className="min-h-0 text-center text-sm text-[var(--wr-hi)] empty:hidden"
      >
        {error ?? ''}
      </p>

      <div className="rounded-2xl border border-white/10 p-3 text-xs leading-relaxed text-white/75">
        <p className="flex items-center gap-2 font-semibold text-white">
          <LockIcon className="text-[var(--wr-d)]" />
          {t.secure}
        </p>
        <p className="mt-1">{t.secureDetail}</p>
        <p className="mt-1.5 font-semibold text-white/85">{t.methods}</p>
      </div>

      <button
        type="button"
        onClick={onRestoreView}
        className="min-h-10 cursor-pointer text-sm font-semibold text-white/85 underline underline-offset-4 hover:text-white"
      >
        {t.restoreLink}
      </button>
    </div>
  );
}

function Restore({ titleId, onRestore, onBack }: Props & { titleId: string; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const emailId = useId();
  const codeId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await onRestore(email, code);
    if (result.error) setMessage({ ok: false, text: errorText(result.error) });
    else {
      const outcome = result.outcome ?? 'restored';
      setMessage({
        ok: outcome === 'restored' || outcome === 'already_active',
        text: t.restoreOutcome[outcome],
      });
    }
    setBusy(false);
  };

  const input =
    'min-h-12 w-full rounded-2xl border border-white/20 bg-white/[0.06] px-4 text-base text-white placeholder:text-white/40 focus:border-[var(--wr-hi)] focus:outline-none';

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-9 cursor-pointer items-center gap-1 self-start text-sm font-semibold text-white/80 hover:text-white"
      >
        <BackIcon />
        {t.back}
      </button>
      <div>
        <Heading id={titleId}>{t.restoreTitle}</Heading>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{t.restoreText}</p>
      </div>
      <label htmlFor={emailId} className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.email}
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      <label htmlFor={codeId} className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.code}
        <input
          id={codeId}
          required
          autoCapitalize="characters"
          autoComplete="one-time-code"
          spellCheck={false}
          placeholder={t.codePlaceholder}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${input} font-mono tracking-widest uppercase`}
        />
      </label>
      <Button type="submit" disabled={busy || !email || !code}>
        {t.restore}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={`text-center text-sm empty:hidden ${message?.ok ? 'text-[var(--wr-d)]' : 'text-[var(--wr-hi)]'}`}
      >
        {message?.text ?? ''}
      </p>
    </form>
  );
}

function Success({
  purchase,
  titleId,
  onClose,
}: {
  purchase: PurchaseResult;
  titleId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(purchase.recoveryCode);
      setCopied(true);
    } catch {
      // Clipboard blocked: the code is on screen and in the receipt.
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <motion.div
        className="mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wr-hi)] text-3xl text-[#12062b]"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      >
        <CheckIcon strokeWidth={3} />
      </motion.div>
      <Heading id={titleId}>{t.successTitle[purchase.product]}</Heading>
      <p className="-mt-2 text-sm leading-relaxed text-white/80">{t.successText}</p>

      <div className="w-full rounded-2xl border border-white/15 bg-white/[0.05] p-4">
        <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">{t.codeTitle}</p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-[0.15em] select-all">
          {purchase.recoveryCode}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-2 min-h-9 cursor-pointer rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/20"
        >
          {copied ? t.copied : t.copy}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-white/70">{t.codeText}</p>
      </div>

      <Button className="w-full" onClick={onClose}>
        {t.continue}
      </Button>
    </div>
  );
}

function Message({
  titleId,
  title,
  text,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  titleId: string;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Heading id={titleId}>{title}</Heading>
      <p className="text-sm leading-relaxed text-white/80">{text}</p>
      <Button onClick={onAction}>{action}</Button>
      {secondary && onSecondary && (
        <button
          type="button"
          onClick={onSecondary}
          className="min-h-10 cursor-pointer text-sm font-semibold text-white/85 underline underline-offset-4"
        >
          {secondary}
        </button>
      )}
    </div>
  );
}
