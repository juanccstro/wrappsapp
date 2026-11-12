import { useId, useRef, useState, type DragEvent } from 'react';
import { es } from '../../i18n/es';
import type { SessionErrorCode } from '../../worker/session';
import { Button } from '../components/Shell';
import { BackIcon, LockIcon, UploadIcon } from '../components/icons';

type Props = {
  error: SessionErrorCode | null;
  onFile: (file: File) => void;
  onBack: () => void;
};

type Platform = 'android' | 'ios';

function ExportGuide() {
  const [platform, setPlatform] = useState<Platform>('android');
  const panelId = useId();

  return (
    <section aria-labelledby={`${panelId}-title`} className="rounded-2xl bg-white/5 p-4">
      <h2 id={`${panelId}-title`} className="font-display text-sm font-bold">
        {es.upload.guideTitle}
      </h2>
      <div role="tablist" aria-label={es.upload.guideTitle} className="mt-3 flex gap-2">
        {(['android', 'ios'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`${panelId}-tab-${p}`}
            aria-selected={platform === p}
            aria-controls={`${panelId}-panel`}
            onClick={() => setPlatform(p)}
            className={`min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors ${
              platform === p ? 'bg-white text-[#12062b]' : 'border border-white/30 text-white'
            }`}
          >
            {es.upload.platforms[p]}
          </button>
        ))}
      </div>
      <ol
        id={`${panelId}-panel`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${platform}`}
        className="mt-4 flex flex-col gap-3 text-sm leading-snug"
      >
        {es.upload.steps[platform].map((step, i) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--wr-c)] text-xs font-bold"
            >
              {i + 1}
            </span>
            <span className="text-white/90">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Upload({ error, onFile, onBack }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

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

      <h1 className="font-display text-3xl leading-tight font-black">{es.upload.title}</h1>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
          dragging ? 'border-[var(--wr-b)] bg-white/15' : 'border-white/35 bg-white/5'
        }`}
      >
        <UploadIcon className="text-4xl text-[var(--wr-b)]" />
        <p className="font-display text-base font-bold">
          {dragging ? es.upload.dropping : es.upload.drop}
        </p>
        <Button onClick={() => input.current?.click()}>{es.upload.choose}</Button>
        <p className="text-sm text-white/75">{es.upload.formats}</p>
        <input
          ref={input}
          type="file"
          accept=".txt,.zip,text/plain,application/zip"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFile(file);
          }}
        />
      </div>

      <div role="alert" aria-live="assertive">
        {error && (
          <p className="rounded-2xl border border-[var(--wr-b)] bg-[var(--wr-b)]/15 p-4 text-sm leading-relaxed">
            {es.errors[error]}
          </p>
        )}
      </div>

      <p className="flex items-start gap-2 text-sm text-white/85">
        <LockIcon className="mt-0.5 shrink-0 text-[var(--wr-d)]" />
        {es.app.privacy}
      </p>

      <ExportGuide />
    </main>
  );
}
