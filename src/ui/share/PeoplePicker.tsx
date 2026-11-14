import { es } from '../../i18n/es';
import { CloseIcon } from '../components/icons';
import { Avatar } from '../slides/common';

/**
 * "¿Cuál eres tú?": pick a person to make their story card. A sheet over the bottom of the
 * screen, only while choosing.
 */
export function PeoplePicker({
  people,
  open,
  busy,
  onPick,
  onClose,
}: {
  people: { idx: number; name: string; label?: string }[];
  open: boolean;
  busy: boolean;
  onPick: (idx: number) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end bg-[#07020f]/70 backdrop-blur-sm"
      data-no-nav
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={es.share.whoAreYou}
        className="max-h-[75%] overflow-y-auto overscroll-contain rounded-t-[2rem] border-t border-white/15 bg-[var(--wr-bg)] px-5 pt-5 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black">{es.share.whoAreYou}</h2>
            <p className="mt-1 text-sm text-white/75">{es.share.whoAreYouText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={es.billing.close}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20"
          >
            <CloseIcon />
          </button>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {people.map((p) => (
            <li key={p.idx}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPick(p.idx)}
                className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-2 py-3 text-center hover:bg-white/12 disabled:opacity-60"
              >
                <Avatar idx={p.idx} name={p.name} size={48} />
                <span className="w-full truncate text-sm font-bold">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
