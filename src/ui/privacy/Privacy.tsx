import { es } from '../../i18n/es';
import { BackIcon, LockIcon } from '../components/icons';

/** Short and plain: what happens to a chat (nothing leaves the device). */
export function Privacy({ onBack }: { onBack: () => void }) {
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

      <h1 className="flex items-center gap-3 font-display text-3xl leading-tight font-black">
        <LockIcon className="shrink-0 text-[var(--wr-d)]" />
        {es.privacy.title}
      </h1>
      <p className="text-base leading-relaxed text-white/90">{es.privacy.summary}</p>

      <ul className="flex flex-col gap-3">
        {es.privacy.points.map((point) => (
          <li key={point.title} className="rounded-2xl bg-white/5 p-4">
            <h2 className="font-display text-sm font-bold">{point.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{point.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-auto text-center text-xs text-white/60">{es.app.disclaimer}</p>
    </main>
  );
}
