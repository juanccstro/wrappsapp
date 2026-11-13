import { es } from '../../i18n/es';
import { LEGAL } from '../../legal';
import { BackIcon } from '../components/icons';

/** Conditions of sale and legal notice (who sells, prices, withdrawal, contact). */
export function Terms({ onBack }: { onBack: () => void }) {
  const t = es.terms;
  const owner = t.sections[0];
  return (
    <main className="flex h-full flex-col gap-5 overflow-y-auto px-6 pt-6 pb-6">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-10 cursor-pointer items-center gap-1 self-start text-sm font-semibold text-white/80 hover:text-white"
      >
        <BackIcon />
        {es.upload.back}
      </button>

      <div>
        <h1 className="font-display text-3xl leading-tight font-black">{t.title}</h1>
        <p className="mt-1 text-xs text-white/60">{t.updated(LEGAL.updated)}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {owner && (
          <li className="rounded-2xl bg-white/5 p-4">
            <h2 className="font-display text-sm font-bold">{owner.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              {owner.text(LEGAL.owner, LEGAL.taxId, LEGAL.location, LEGAL.email)}
            </p>
          </li>
        )}
        {t.items.map((item) => (
          <li key={item.title} className="rounded-2xl bg-white/5 p-4">
            <h2 className="font-display text-sm font-bold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{item.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-auto text-center text-xs text-white/60">{es.app.disclaimer}</p>
    </main>
  );
}
