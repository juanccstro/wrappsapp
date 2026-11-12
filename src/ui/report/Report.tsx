import type { ReactNode } from 'react';
import type { Analytics, PersonStats, WrappedResult } from '../../core';
import {
  formatDay,
  formatDuration,
  formatMonth,
  formatNumber,
} from '../../core/templates/es/format';
import { es } from '../../i18n/es';
import { Button } from '../components/Shell';
import { BackIcon } from '../components/icons';
import { Avatar } from '../slides/common';
import { paletteVars } from '../theme/palettes';

type Props = {
  wrapped: WrappedResult;
  analytics: Analytics;
  onBack: () => void;
  onClose: () => void;
};

const t = es.report;
const percent = (value: number) => `${Math.round(value * 100)}%`;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/7 p-4">
      <h2 className="font-display text-base font-black">{title}</h2>
      {hint && <p className="mt-1 text-xs text-white/70">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3">
      <p className="font-display text-lg leading-tight font-black break-words">{value}</p>
      <p className="mt-0.5 text-xs text-white/75">{label}</p>
    </div>
  );
}

/** Messages per month as an area chart. */
function MonthChart({ months }: { months: Analytics['months'] }) {
  const width = 320;
  const height = 110;
  const max = Math.max(1, ...months.map((m) => m.total));
  const step = months.length > 1 ? width / (months.length - 1) : 0;
  const points = months.map((m, i) => ({
    x: months.length > 1 ? i * step : width / 2,
    y: height - 6 - (height - 16) * (m.total / max),
  }));
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const every = Math.max(1, Math.ceil(months.length / 6));

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={t.overTime}>
        {first && last && (
          <path
            d={`${line} L${last.x} ${height} L${first.x} ${height} Z`}
            fill="var(--wr-hi)"
            opacity="0.22"
          />
        )}
        <path d={line} fill="none" stroke="var(--wr-hi)" strokeWidth="3" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={months[i]?.month} cx={p.x} cy={p.y} r="3.5" fill="var(--wr-hi)" />
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[0.65rem] text-white/70 capitalize">
        {months
          .filter((_, i) => i % every === 0)
          .map((m) => (
            <span key={m.month}>
              {formatMonth(m.month).slice(0, 3)} {m.month.slice(2, 4)}
            </span>
          ))}
      </figcaption>
    </figure>
  );
}

/** One bar per item, tallest = busiest. */
function Bars({ values, labels }: { values: number[]; labels: readonly string[] }) {
  const max = Math.max(1, ...values);
  const top = values.indexOf(Math.max(...values));
  return (
    <ol className="flex h-32 items-end gap-2">
      {values.map((value, i) => (
        <li key={labels[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[0.65rem] tabular-nums text-white/75">{formatNumber(value)}</span>
          <span
            className="w-full rounded-t-lg"
            style={{
              height: `${Math.max(3, 100 * (value / max))}%`,
              background: i === top ? 'var(--wr-hi)' : 'rgba(255,255,255,0.75)',
            }}
          />
          <span className="text-xs font-bold">{labels[i]}</span>
        </li>
      ))}
    </ol>
  );
}

/** Hour × weekday grid: the brighter the cell, the more messages. */
function Heatmap({ heatmap }: { heatmap: number[][] }) {
  const max = Math.max(1, ...heatmap.flat());
  return (
    <div role="img" aria-label={t.hours}>
      <div className="flex flex-col gap-[3px]">
        {heatmap.map((row, day) => (
          <div key={day} className="flex items-center gap-[3px]">
            <span className="w-4 text-[0.65rem] font-bold text-white/75">{t.weekdays[day]}</span>
            {row.map((count, hour) => (
              <span
                key={hour}
                className="h-3.5 flex-1 rounded-[3px] bg-[var(--wr-hi)]"
                style={{ opacity: count === 0 ? 0.07 : 0.18 + 0.82 * (count / max) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between pl-5 text-[0.65rem] text-white/70">
        {['0h', '6h', '12h', '18h', '23h'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function PersonSheet({
  person,
  wrapped,
  mediaTypesKnown,
}: {
  person: PersonStats;
  wrapped: WrappedResult;
  mediaTypesKnown: boolean;
}) {
  const name = (idx: number) => wrapped.participants[idx]?.name ?? '';
  const people = wrapped.slides.find((s) => s.kind === 'people');
  const card =
    people?.kind === 'people' ? people.data.cards.find((c) => c.idx === person.idx) : null;

  const rows: [string, string | null][] = [
    [t.person.words, formatNumber(person.words)],
    [t.person.avgWords, formatNumber(person.avgWords)],
    [
      t.person.reply,
      person.medianReplyMinutes === null ? null : formatDuration(person.medianReplyMinutes),
    ],
    [t.person.night, percent(person.nightShare)],
    [t.person.started, formatNumber(person.conversationsStarted)],
    [t.person.laughs, formatNumber(person.laughs)],
    [t.person.questions, formatNumber(person.questions)],
    [t.person.emoji, person.favoriteEmoji],
    [t.person.word, person.signatureWord],
    [t.person.laugh, person.signatureLaugh],
    [t.person.favorite, person.favoritePerson === null ? null : name(person.favoritePerson)],
    [t.person.audios, mediaTypesKnown ? formatNumber(person.audios) : null],
    [t.person.images, mediaTypesKnown ? formatNumber(person.images) : null],
  ];

  return (
    <li className="rounded-2xl bg-white/10 p-3">
      <div className="flex items-center gap-3">
        <Avatar idx={person.idx} name={name(person.idx)} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-black">{name(person.idx)}</p>
          {card && (
            <p className="truncate text-xs font-semibold text-[var(--wr-hi)]">{card.label}</p>
          )}
        </div>
        <p className="text-right">
          <span className="block font-display text-base font-black tabular-nums">
            {formatNumber(person.messages)}
          </span>
          <span className="block text-[0.65rem] text-white/70">{percent(person.share)}</span>
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        {rows
          .filter((row): row is [string, string] => row[1] !== null)
          .map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/8 px-2 py-1.5">
              <dd className="text-sm leading-tight font-bold break-words">{value}</dd>
              <dt className="mt-0.5 text-[0.65rem] leading-tight text-white/70">{label}</dt>
            </div>
          ))}
      </dl>
    </li>
  );
}

/**
 * "Ver todos los datos": everything the stories summarise, in one scrollable page. Same
 * numbers, same palette; nothing here is new data, so nothing leaves the device either.
 */
export function Report({ wrapped, analytics: a, onBack, onClose }: Props) {
  const totals = a.totals;
  const ranking = a.people.slice().sort((x, y) => y.messages - x.messages || x.idx - y.idx);
  const maxMessages = Math.max(1, ...ranking.map((p) => p.messages));
  const name = (idx: number) => wrapped.participants[idx]?.name ?? '';

  const records: [string, string][] = [];
  if (a.busiestDay) {
    records.push([
      t.records.busiestDay,
      `${formatDay(a.busiestDay.day, true)} · ${formatNumber(a.busiestDay.messages)} ${es.slides.messages}`,
    ]);
  }
  if (a.longestStreak) {
    records.push([
      t.records.streak,
      `${formatNumber(a.longestStreak.days)} ${es.slides.streakDays}`,
    ]);
  }
  if (a.longestSilence) {
    records.push([
      t.records.silence,
      `${formatDuration(a.longestSilence.minutes)} · ${name(a.longestSilence.brokenBy)}`,
    ]);
  }
  if (a.laughs.longest) {
    records.push([
      t.records.laugh,
      `${a.laughs.longest.length} ${t.records.letters} · ${name(a.laughs.longest.senderIdx)}`,
    ]);
  }
  records.push([t.records.peakHour, `${a.peakHour}:00`]);

  return (
    <main
      className="flex h-full flex-col gap-4 overflow-y-auto bg-[var(--wr-bg)] px-4 pt-5 pb-6"
      style={paletteVars(wrapped.theme.palette)}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-10 cursor-pointer items-center gap-1 self-start text-sm font-semibold text-white/80 hover:text-white"
      >
        <BackIcon />
        {t.back}
      </button>

      <header className="px-1">
        <p className="font-display text-xs font-bold tracking-widest text-[var(--wr-hi)] uppercase">
          {es.app.name} · {wrapped.period.label}
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight font-black">{t.title}</h1>
        {wrapped.chatName && <p className="mt-1 text-sm text-white/80">{wrapped.chatName}</p>}
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Tile value={formatNumber(totals.messages)} label={es.slides.messages} />
        <Tile value={formatNumber(totals.words)} label={es.slides.words} />
        <Tile value={formatNumber(a.range?.activeDays ?? 0)} label={es.slides.activeDays} />
        <Tile value={formatNumber(totals.emojis)} label={t.totals.emojis} />
        <Tile value={formatNumber(totals.media)} label={t.totals.media} />
        <Tile value={formatNumber(totals.links)} label={t.totals.links} />
      </div>

      {a.months.length > 1 && (
        <Section title={t.overTime} hint={t.overTimeHint}>
          <MonthChart months={a.months} />
        </Section>
      )}

      <Section title={t.weekdaysTitle}>
        <Bars values={a.weekdayTotals} labels={t.weekdays} />
      </Section>

      <Section title={t.hours} hint={t.hoursHint}>
        <Heatmap heatmap={a.heatmap} />
      </Section>

      <Section title={t.ranking}>
        <ol className="flex flex-col gap-2.5">
          {ranking.map((p, i) => (
            <li key={p.idx} className="flex items-center gap-3">
              <span className="w-5 text-right font-display text-sm font-black text-white/70">
                {i + 1}
              </span>
              <Avatar idx={p.idx} name={name(p.idx)} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-bold">{name(p.idx)}</span>
                  <span className="font-display text-xs font-bold tabular-nums">
                    {formatNumber(p.messages)} · {percent(p.share)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, 100 * (p.messages / maxMessages))}%`,
                      background: i === 0 ? 'var(--wr-hi)' : 'rgba(255,255,255,0.85)',
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t.people}>
        <ul className="flex flex-col gap-3">
          {ranking.map((p) => (
            <PersonSheet
              key={p.idx}
              person={p}
              wrapped={wrapped}
              mediaTypesKnown={a.mediaTypesKnown}
            />
          ))}
        </ul>
      </Section>

      {a.topWords.length > 0 && (
        <Section title={t.words}>
          <ul className="flex flex-wrap gap-2">
            {a.topWords.slice(0, 20).map((w) => (
              <li key={w.key} className="rounded-full bg-white/12 px-3 py-1 text-sm font-semibold">
                {w.key} <span className="text-white/65 tabular-nums">{formatNumber(w.count)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.topEmojis.length > 0 && (
        <Section title={t.emojis}>
          <ul className="grid grid-cols-5 gap-2 text-center">
            {a.topEmojis.map((e) => (
              <li key={e.key} className="rounded-2xl bg-white/10 py-2">
                <span className="block text-2xl">{e.key}</span>
                <span className="block text-xs tabular-nums text-white/75">
                  {formatNumber(e.count)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={t.records.title}>
        <dl className="flex flex-col gap-2 text-sm">
          {records.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2"
            >
              <dt className="text-white/75">{label}</dt>
              <dd className="text-right font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onBack}>{t.back}</Button>
        <Button variant="ghost" onClick={onClose}>
          {es.story.close}
        </Button>
      </div>
      <p className="text-center text-xs text-white/60">{es.app.privacy}</p>
    </main>
  );
}
