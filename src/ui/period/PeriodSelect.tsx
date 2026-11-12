import { useState } from 'react';
import type { PeriodKind } from '../../core';
import { formatNumber } from '../../core/templates/es/format';
import { es } from '../../i18n/es';
import type { ChatSummary } from '../../worker/session';
import { Button } from '../components/Shell';

type Props = {
  summary: ChatSummary;
  onStart: (period: PeriodKind) => void;
  onDiscard: () => void;
};

export function PeriodSelect({ summary, onStart, onDiscard }: Props) {
  const [selected, setSelected] = useState<PeriodKind>(summary.defaultPeriod);
  const total = summary.periods.find((p) => p.period.kind === 'all')?.messages ?? 0;

  const label = (kind: PeriodKind, year: number | undefined) =>
    kind === 'year' ? es.period.options.year(year) : es.period.options[kind];

  return (
    <main className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-10 pb-6">
      <div>
        <h1 className="font-display text-3xl leading-tight font-black">{es.period.title}</h1>
        <p className="mt-3 text-sm text-white/80">
          {es.period.found(String(summary.participants.length), formatNumber(total))}
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{es.period.title}</legend>
        {summary.periods.map(({ period, messages }) => {
          const active = selected === period.kind;
          const empty = messages === 0;
          return (
            <label
              key={period.kind}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 px-5 py-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--wr-b)] ${
                active ? 'border-white bg-white text-[#12062b]' : 'border-white/25 bg-white/5'
              } ${empty ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name="period"
                value={period.kind}
                checked={active}
                disabled={empty}
                onChange={() => setSelected(period.kind)}
                className="sr-only"
              />
              <span className="font-display text-base font-bold">
                {label(period.kind, period.year)}
              </span>
              <span className={`text-sm ${active ? 'text-[#12062b]/75' : 'text-white/75'}`}>
                {es.period.messages(formatNumber(messages))}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-auto flex flex-col gap-3">
        <Button onClick={() => onStart(selected)}>{es.period.start}</Button>
        <Button variant="ghost" onClick={onDiscard}>
          {es.period.discard}
        </Button>
      </div>
    </main>
  );
}
