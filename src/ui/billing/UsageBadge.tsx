import type { UsageStatus } from '../../billing/api';
import { es } from '../../i18n/es';

/**
 * Small pill in the corner: "1 de 2 usados", or "Ilimitado". Tapping it opens the plans.
 * Hidden while the limit is not enforced (billing not configured).
 */
export function UsageBadge({ status, onOpen }: { status: UsageStatus | null; onOpen: () => void }) {
  if (!status?.enforced) return null;
  const text = status.unlimited
    ? es.billing.badgeUnlimited
    : es.billing.badge(status.used, status.limit);
  const full = !status.unlimited && status.remaining === 0;
  const progress = status.unlimited || status.limit === 0 ? 1 : status.used / status.limit;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${text}. ${es.billing.badgeLabel}`}
      className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-30 flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/30 py-1.5 pr-3 pl-2 text-xs font-semibold text-white/90 backdrop-blur-md transition-colors hover:bg-black/45"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke={full ? 'var(--wr-a)' : 'var(--wr-d)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(2 * Math.PI * 6 * Math.min(1, progress)).toFixed(2)} 100`}
          transform="rotate(-90 8 8)"
        />
      </svg>
      <span className="tabular-nums">{text}</span>
    </button>
  );
}
