import type { Slide, WrappedResult } from '../../core';

type Props = {
  slide: Slide;
  wrapped: WrappedResult;
  /** Chosen answer of each quiz, by slide id. */
  answers: Record<string, number>;
  onAnswer: (slideId: string, idx: number) => void;
};

/**
 * Provisional rendering of a slide: its texts and the minimum data to make sense of it. The
 * real visuals (charts, particles, cards) replace this slide by slide.
 */
export function SlideView({ slide, wrapped, answers, onAnswer }: Props) {
  const name = (idx: number) => wrapped.participants[idx]?.name ?? '';

  return (
    <div className="flex h-full flex-col justify-center gap-5 px-6 pt-24 pb-10">
      <h2 className="font-display text-[1.9rem] leading-[1.08] font-black text-balance">
        {slide.title}
      </h2>
      <p className="text-lg leading-snug text-white/90 text-pretty">{slide.body}</p>

      {slide.kind === 'emojis' && (
        <p className="flex gap-3 text-5xl" aria-hidden="true">
          {slide.data.top.slice(0, 5).map((e) => (
            <span key={e.key}>{e.key}</span>
          ))}
        </p>
      )}

      {slide.kind === 'quiz' && (
        <QuizOptions
          slide={slide}
          name={name}
          chosen={answers[slide.id]}
          onAnswer={(idx) => onAnswer(slide.id, idx)}
        />
      )}

      {slide.kind === 'people' && (
        <ul className="flex flex-col gap-2 overflow-y-auto" data-no-nav>
          {slide.data.cards.map((card) => (
            <li key={card.idx} className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-[var(--wr-b)] uppercase">
                {card.name} · {card.label}
              </p>
              <p className="font-display text-sm leading-snug font-bold">{card.title}</p>
            </li>
          ))}
        </ul>
      )}

      {slide.kind === 'summary' && (
        <dl className="grid grid-cols-2 gap-2">
          {slide.data.highlights.map((h) => (
            <div key={h.label} className="rounded-2xl bg-white/10 px-4 py-3">
              <dt className="text-xs text-white/70">{h.label}</dt>
              <dd className="font-display text-base font-bold">{h.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function QuizOptions({
  slide,
  name,
  chosen,
  onAnswer,
}: {
  slide: Extract<Slide, { kind: 'quiz' }>;
  name: (idx: number) => string;
  chosen: number | undefined;
  onAnswer: (idx: number) => void;
}) {
  const answered = chosen !== undefined;
  const correct = chosen === slide.data.answer;

  return (
    <div className="flex flex-col gap-3" data-no-nav>
      <div className="grid grid-cols-2 gap-2">
        {slide.data.options.map((idx) => {
          const isAnswer = idx === slide.data.answer;
          const state = !answered
            ? 'border-white/40 bg-white/10 hover:bg-white/20'
            : isAnswer
              ? 'border-white bg-white text-[#12062b]'
              : idx === chosen
                ? 'border-white/60 bg-white/5 opacity-70'
                : 'border-white/20 bg-white/5 opacity-50';
          return (
            <button
              key={idx}
              type="button"
              disabled={answered}
              aria-pressed={idx === chosen}
              onClick={() => onAnswer(idx)}
              className={`min-h-14 cursor-pointer rounded-2xl border-2 px-3 py-2 text-base font-bold transition-colors disabled:cursor-default ${state}`}
            >
              {name(idx)}
            </button>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="min-h-12 text-base font-semibold">
        {answered ? (correct ? slide.data.right : slide.data.wrong) : ''}
      </p>
    </div>
  );
}
