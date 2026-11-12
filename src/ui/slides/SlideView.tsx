import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import type { Slide } from '../../core';
import { createRng } from '../../core/random/rng';
import {
  formatDay,
  formatDuration,
  formatMonth,
  formatNumber,
  weekdayOfDay,
} from '../../core/templates/es/format';
import { es } from '../../i18n/es';
import { BarRace, RadialClock, ReplyGraph, ReplyRace } from './charts';
import { Avatar, Body, CountUp, Layout, RankList, Rise, Title, type SlideCtx } from './common';
import { EmojiRain, fireConfetti } from './effects';
import { PersonCards } from './PersonCards';

type Of<K extends Slide['kind']> = { slide: Extract<Slide, { kind: K }>; ctx: SlideCtx };

const t = es.slides;

function Intro({ slide, ctx }: Of<'intro'>) {
  // Letter by letter, but never breaking a word across lines.
  let offset = 0;
  const words = slide.title.split(' ').map((word) => {
    const chars = Array.from(word);
    const start = offset;
    offset += chars.length;
    return { chars, start };
  });
  return (
    <Layout className="items-start">
      {!ctx.reduced && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="wr-anim absolute h-48 w-48 rounded-full border-4 border-white/50"
              style={{ animation: `wr-ring 2.6s ease-out ${i * 0.8}s infinite` }}
            />
          ))}
        </div>
      )}
      <Rise>
        <p className="font-display text-sm font-bold tracking-widest text-[var(--wr-hi)] uppercase">
          {es.app.name} · {ctx.wrapped.period.label}
        </p>
      </Rise>
      <h2
        className="wr-shadow font-display text-[2.4rem] leading-[1.05] font-black"
        aria-label={slide.title}
      >
        {words.map((word, w) => (
          <span key={w} aria-hidden="true" className="mr-[0.28em] inline-block whitespace-nowrap">
            {word.chars.map((char, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: 40, rotate: -12 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 220,
                  damping: 14,
                  delay: 0.3 + (word.start + i) * 0.045,
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        ))}
      </h2>
      <Body text={slide.body} delay={0.5 + offset * 0.045} />
    </Layout>
  );
}

function Total({ slide, ctx }: Of<'total'>) {
  return (
    <Layout>
      <Rise>
        <p className="wr-shadow font-display text-[4.2rem] leading-none font-black text-[var(--wr-hi)]">
          <CountUp value={slide.data.messages} ctx={ctx} durationMs={2200} />
        </p>
        <p className="mt-1 font-display text-sm font-bold tracking-widest uppercase">
          {t.messages}
        </p>
      </Rise>
      <Title text={slide.title} />
      <Body text={slide.body} delay={0.9} />
      <Rise delay={1.1} className="grid grid-cols-2 gap-2">
        <Stat value={formatNumber(slide.data.words)} label={t.words} />
        <Stat value={formatNumber(slide.data.days)} label={t.activeDays} />
      </Rise>
    </Layout>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-black/25 px-4 py-3">
      <p className="font-display text-xl font-black">{value}</p>
      <p className="text-xs text-white/80">{label}</p>
    </div>
  );
}

function BusiestDay({ slide, ctx }: Of<'busiestDay'>) {
  const [, month, day] = slide.data.day.split('-');
  return (
    <Layout>
      <motion.div
        className="mx-auto w-40 overflow-hidden rounded-3xl bg-white text-center text-[#12062b] shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        initial={ctx.reduced ? { opacity: 0 } : { opacity: 0, scale: 3.2, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 0.1 }}
      >
        <p className="bg-[var(--wr-a)] py-1.5 font-display text-sm font-black text-white capitalize">
          {formatMonth(`0000-${month}`)}
        </p>
        <p className="font-display text-7xl leading-none font-black">{Number(day)}</p>
        <p className="pb-2 text-sm font-bold capitalize">{weekdayOfDay(slide.data.day)}</p>
      </motion.div>
      <Title text={slide.title} />
      <Body text={slide.body} delay={0.8} />
      <div className="flex flex-wrap gap-2">
        {slide.data.keywords.map((word, i) => (
          <motion.span
            key={word}
            className="rounded-full bg-black/30 px-3 py-1.5 text-sm font-bold"
            initial={{ opacity: 0, y: 30 }}
            animate={ctx.reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
            transition={
              ctx.reduced
                ? { delay: 0.2 }
                : {
                    opacity: { delay: 1 + i * 0.12 },
                    y: { delay: 1 + i * 0.12, duration: 2.4 + i * 0.3, repeat: Infinity },
                  }
            }
          >
            {word}
          </motion.span>
        ))}
      </div>
    </Layout>
  );
}

function Clock({ slide }: Of<'clock'>) {
  return (
    <Layout>
      <Title text={slide.title} />
      <RadialClock hours={slide.data.hourTotals} peak={slide.data.peakHour} />
      <Body text={slide.body} delay={1.4} />
    </Layout>
  );
}

function Emojis({ slide, ctx }: Of<'emojis'>) {
  const top = slide.data.top.slice(0, 5);
  const max = Math.max(1, ...top.map((e) => e.count));
  // Podium order: 4th, 2nd, 1st, 3rd, 5th.
  const order = [3, 1, 0, 2, 4].map((i) => top[i]).filter((e) => e !== undefined);
  return (
    <Layout>
      {!ctx.reduced && top[0] && (
        <EmojiRain emoji={top[0].key} seed={ctx.wrapped.seed} running={ctx.running} />
      )}
      <Title text={slide.title} />
      <div className="flex h-44 items-end justify-center gap-2">
        {order.map((e, i) => (
          <div key={e.key} className="flex w-14 flex-col items-center gap-1">
            <motion.span
              className="text-3xl"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 1.3 + i * 0.1 }}
            >
              {e.key}
            </motion.span>
            <motion.div
              className="w-full origin-bottom rounded-t-xl"
              style={{
                height: `${24 + 76 * (e.count / max)}px`,
                background: e === top[0] ? 'var(--wr-hi)' : 'rgba(255,255,255,0.85)',
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 + i * 0.1 }}
            />
            <span className="font-display text-xs font-bold tabular-nums">
              {formatNumber(e.count)}
            </span>
          </div>
        ))}
      </div>
      <Body text={slide.body} delay={1.5} />
    </Layout>
  );
}

function Words({ slide, ctx }: Of<'words'>) {
  const words = slide.data.words.slice(0, 10);
  const max = Math.max(1, ...words.map((w) => w.count));
  const from = useMemo(() => {
    const rng = createRng(ctx.wrapped.seed, `fx:${slide.id}`);
    return Array.from({ length: 10 }, () => ({
      x: (rng.next() - 0.5) * 520,
      y: (rng.next() - 0.5) * 520,
      r: (rng.next() - 0.5) * 60,
    }));
  }, [ctx.wrapped.seed, slide.id]);

  return (
    <Layout>
      <Title text={slide.title} />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {words.map((w, i) => (
          <motion.span
            key={w.key}
            className="wr-shadow font-display leading-tight font-black"
            style={{
              fontSize: `${1 + 1.5 * (w.count / max)}rem`,
              color: i === 0 ? 'var(--wr-hi)' : 'white',
              opacity: 0.6 + 0.4 * (w.count / max),
            }}
            initial={
              ctx.reduced
                ? { opacity: 0 }
                : { opacity: 0, x: from[i]?.x, y: from[i]?.y, rotate: from[i]?.r }
            }
            animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 13, delay: 0.5 + i * 0.11 }}
          >
            {w.key}
          </motion.span>
        ))}
      </div>
      <Body text={slide.body} delay={1.8} />
    </Layout>
  );
}

function Laughs({ slide, ctx }: Of<'laughs'>) {
  const longest = slide.data.longest?.text;
  return (
    <Layout>
      <Title text={slide.title} />
      <Rise delay={0.4}>
        <p className="font-display text-5xl font-black text-[var(--wr-hi)]">
          <CountUp value={slide.data.total} ctx={ctx} durationMs={2000} />
        </p>
        <div className="mt-2 h-5 overflow-hidden rounded-full bg-black/30">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-white to-[var(--wr-hi)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
      </Rise>
      {longest && (
        <div aria-hidden="true" className="-mx-6 overflow-hidden py-1">
          <p
            className="wr-anim w-max font-display text-4xl font-black whitespace-nowrap text-white/90"
            style={{ animation: 'wr-marquee 9s linear infinite' }}
          >
            {`${longest}  ${longest}  ${longest}  ${longest}  `}
          </p>
        </div>
      )}
      <Body text={slide.body} delay={1} />
      <RankList items={slide.data.ranking.slice(0, 3)} ctx={ctx} delay={1.3} />
    </Layout>
  );
}

function Quiz({ slide, ctx }: Of<'quiz'>) {
  const chosen = ctx.answers[slide.id];
  const answered = chosen !== undefined;
  const correct = chosen === slide.data.answer;

  useEffect(() => {
    if (answered && correct) fireConfetti(0.5, 0.55);
  }, [answered, correct]);

  return (
    <Layout>
      <Title text={slide.title} />
      {!answered && <Body text={slide.body} delay={0.4} />}
      {/* Once answered, taps go through to the story: tap anywhere to continue. */}
      <div
        className={`grid grid-cols-2 gap-3 ${answered ? 'pointer-events-none' : ''}`}
        data-no-nav={answered ? undefined : true}
      >
        {slide.data.options.map((idx, i) => {
          const isAnswer = idx === slide.data.answer;
          const state = !answered
            ? 'bg-black/25 hover:bg-black/40 border-white/50'
            : isAnswer
              ? 'bg-white text-[#12062b] border-white'
              : 'bg-black/20 border-white/20 opacity-50';
          return (
            <motion.button
              key={idx}
              type="button"
              aria-disabled={answered}
              tabIndex={answered ? -1 : 0}
              aria-pressed={idx === chosen}
              onClick={() => {
                if (!answered) ctx.onAnswer(slide.id, idx);
              }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 px-2 py-4 text-sm font-bold transition-colors ${state}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: answered && isAnswer ? 1.06 : 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: answered ? 0 : 0.5 + i * 0.1,
              }}
            >
              <Avatar idx={idx} name={ctx.name(idx)} size={56} />
              <span className="max-w-full truncate">{ctx.name(idx)}</span>
            </motion.button>
          );
        })}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="wr-shadow min-h-14 text-lg leading-snug font-bold"
      >
        {answered ? (correct ? slide.data.right : slide.data.wrong) : ''}
      </p>
    </Layout>
  );
}

function Race({ slide, ctx }: Of<'race'>) {
  return (
    <Layout>
      <Title text={slide.title} />
      <BarRace months={slide.data.months} ctx={ctx} />
      <Body text={slide.body} delay={1} />
    </Layout>
  );
}

function Owls({ slide, ctx }: Of<'owls'>) {
  return (
    <Layout>
      <div aria-hidden="true" className="absolute inset-0 bg-[#050720]/55" />
      <motion.div
        aria-hidden="true"
        className="absolute top-20 right-8 h-20 w-20 rounded-full bg-[var(--wr-hi)] shadow-[0_0_60px_var(--wr-hi)]"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <div className="relative flex flex-col gap-5">
        <Title text={slide.title} />
        <Body text={slide.body} />
        <RankList items={slide.data.ranking} ctx={ctx} delay={0.9} />
      </div>
    </Layout>
  );
}

function ReplySpeed({ slide, ctx }: Of<'replySpeed'>) {
  return (
    <Layout>
      <Title text={slide.title} />
      <ReplyRace ranking={slide.data.ranking} ctx={ctx} format={formatDuration} />
      <Body text={slide.body} delay={1.6} />
    </Layout>
  );
}

function Graph({ slide, ctx }: Of<'graph'>) {
  return (
    <Layout>
      <Title text={slide.title} />
      <ReplyGraph matrix={slide.data.matrix} pair={slide.data.pair} ctx={ctx} />
      <Body text={slide.body} delay={1.6} />
    </Layout>
  );
}

function StarterVsMystery({ slide, ctx }: Of<'starterVsMystery'>) {
  const { starter, mystery } = slide.data;
  const side = (who: typeof starter, label: string, fromX: number, dark: boolean) => (
    <motion.div
      className={`flex flex-1 flex-col items-center gap-2 rounded-3xl px-3 py-5 text-center ${dark ? 'bg-black/45' : 'bg-white/20'}`}
      initial={{ opacity: 0, x: ctx.reduced ? 0 : fromX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 16, delay: 0.5 }}
    >
      <Avatar idx={who.idx} name={ctx.name(who.idx)} size={72} />
      <p className="max-w-full truncate font-display text-base font-black">{ctx.name(who.idx)}</p>
      <p className="font-display text-3xl font-black text-[var(--wr-hi)]">
        <CountUp value={who.value} ctx={ctx} />
      </p>
      <p className="text-xs leading-tight text-white/85">{label}</p>
    </motion.div>
  );
  return (
    <Layout>
      <Title text={slide.title} />
      <div className="flex gap-3">
        {side(starter, t.conversationsStarted, -160, false)}
        {side(mystery, t.messages, 160, true)}
      </div>
      <Body text={slide.body} delay={1.2} />
    </Layout>
  );
}

function StreakSilence({ slide, ctx }: Of<'streakSilence'>) {
  const { streak, silence } = slide.data;
  return (
    <Layout>
      <Rise>
        <p className="wr-shadow font-display text-[5rem] leading-none font-black text-[var(--wr-hi)]">
          <CountUp value={streak.days} ctx={ctx} />
        </p>
        <p className="font-display text-sm font-bold tracking-widest uppercase">{t.streakDays}</p>
        <p className="mt-1 text-sm text-white/85">
          {formatDay(streak.start)} – {formatDay(streak.end)}
        </p>
      </Rise>
      <Title text={slide.title} />
      <Body text={slide.body} delay={0.9} />
      {silence && (
        <Rise delay={1.3} className="flex items-center gap-3 rounded-3xl bg-black/35 px-4 py-3">
          <Avatar idx={silence.brokenBy} name={ctx.name(silence.brokenBy)} size={48} />
          <div>
            <p className="text-xs text-white/80">{t.longestSilence}</p>
            <p className="font-display text-lg font-black">{formatDuration(silence.minutes)}</p>
          </div>
        </Rise>
      )}
    </Layout>
  );
}

function Ranking({ slide, ctx }: Of<'ranking'>) {
  const top = slide.data.ranking[0];
  return (
    <Layout>
      {top && (
        <motion.div
          className="self-start"
          initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.15 }}
        >
          <Avatar idx={top.idx} name={ctx.name(top.idx)} size={96} />
        </motion.div>
      )}
      <Title text={slide.title} />
      <Body text={slide.body} />
      <RankList items={slide.data.ranking} ctx={ctx} delay={0.9} />
    </Layout>
  );
}

function Images({ slide, ctx }: Of<'images'>) {
  return (
    <Layout className="!gap-4">
      <Title text={slide.title} />
      <Body text={slide.body} />
      <RankList items={slide.data.ranking} ctx={ctx} delay={0.8} />
      <ul className="flex flex-col gap-2">
        {slide.data.reactions.map((reaction, i) => (
          <motion.li
            key={i}
            className="flex items-end gap-2"
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 170, damping: 16, delay: 1.5 + i * 0.35 }}
          >
            <Avatar idx={reaction.idx} name={ctx.name(reaction.idx)} size={32} />
            <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm leading-snug font-semibold break-words text-[#12062b]">
              {reaction.text}
            </p>
          </motion.li>
        ))}
      </ul>
    </Layout>
  );
}

function Fact({ slide, ctx }: Of<'fact'>) {
  return (
    <Layout>
      <Rise>
        <p className="wr-shadow font-display text-[6rem] leading-none font-black text-[var(--wr-hi)]">
          <CountUp value={slide.data.value} ctx={ctx} durationMs={1200} />
        </p>
      </Rise>
      <Title text={slide.title} />
      <Body text={slide.body} delay={0.8} />
    </Layout>
  );
}

function People({ slide, ctx }: Of<'people'>) {
  return (
    <Layout className="!justify-start !pt-28">
      <Title text={slide.title} className="!text-2xl" />
      <PersonCards cards={slide.data.cards} ctx={ctx} />
    </Layout>
  );
}

function Vibe({ slide, ctx }: Of<'vibe'>) {
  const longestWord = Math.max(...slide.data.name.split(' ').map((w) => w.length));
  const vibeSize = longestWord >= 12 ? '1.75rem' : longestWord >= 9 ? '2.15rem' : '2.7rem';
  return (
    <Layout className="items-center text-center">
      {!ctx.reduced && (
        <div
          aria-hidden="true"
          className="wr-anim absolute top-1/2 left-1/2 -mt-40 -ml-40 h-80 w-80 rounded-full opacity-60"
          style={{
            background:
              'conic-gradient(from 0deg, var(--wr-hi), transparent 30%, white 50%, transparent 70%, var(--wr-hi))',
            animation: 'wr-spin 9s linear infinite',
            maskImage: 'radial-gradient(circle, transparent 56%, black 58%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 56%, black 58%)',
          }}
        />
      )}
      <Rise>
        <p className="font-display text-sm font-bold tracking-widest uppercase">{slide.title}</p>
      </Rise>
      <motion.p
        className="wr-shadow max-w-full font-display leading-[1.04] font-black text-balance text-[var(--wr-hi)]"
        style={{ fontSize: vibeSize }}
        initial={ctx.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.2, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.7 }}
      >
        {slide.data.name}
      </motion.p>
      <Body text={slide.body} delay={1.4} />
    </Layout>
  );
}

/** Final card. `data-share-card` marks what gets exported as an image. */
function Summary({ slide, ctx }: Of<'summary'>) {
  const w = ctx.wrapped;
  useEffect(() => {
    if (!ctx.reduced) fireConfetti(0.5, 0.35);
  }, [ctx.reduced]);

  return (
    <Layout className="!justify-start !gap-3 !pt-24 !pb-56">
      <Title text={slide.title} className="!text-2xl" />
      <Rise delay={0.4}>
        <div
          data-share-card
          className="relative overflow-hidden rounded-[1.75rem] border-2 border-white/70 bg-[var(--wr-bg)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-45"
            style={{
              background:
                'linear-gradient(135deg, var(--wr-a), transparent 45%), linear-gradient(315deg, var(--wr-c), transparent 45%)',
            }}
          />
          <div className="relative flex flex-col gap-3">
            <div>
              <p className="font-display text-xs font-bold tracking-widest text-[var(--wr-hi)] uppercase">
                {es.app.name} · {w.period.label}
              </p>
              {w.chatName && (
                <p className="font-display text-xl leading-tight font-black">{w.chatName}</p>
              )}
              <p className="mt-1 inline-block rounded-full bg-[var(--wr-hi)] px-3 py-0.5 text-xs font-bold text-[#12062b]">
                {slide.data.vibeName}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-1.5">
              {slide.data.highlights.slice(0, 6).map((h) => (
                <div key={h.label} className="rounded-xl bg-white/12 px-2 py-1.5">
                  <dd className="font-display text-[0.8rem] leading-tight font-black">{h.value}</dd>
                  <dt className="text-[0.65rem] text-white/75">{h.label}</dt>
                </div>
              ))}
            </dl>
            <ol className="flex items-end justify-around gap-2">
              {slide.data.podium.map((p, i) => (
                <li key={p.idx} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <Avatar idx={p.idx} name={ctx.name(p.idx)} size={i === 0 ? 52 : 40} />
                  <span className="max-w-20 truncate text-xs font-bold">{ctx.name(p.idx)}</span>
                  <span className="font-display text-[0.7rem] tabular-nums">
                    {formatNumber(p.value)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Rise>
      <Body text={slide.body} delay={0.9} />
    </Layout>
  );
}

/** Picks the visual for each kind of slide. */
export function SlideView({ slide, ctx }: { slide: Slide; ctx: SlideCtx }) {
  switch (slide.kind) {
    case 'intro':
      return <Intro slide={slide} ctx={ctx} />;
    case 'total':
      return <Total slide={slide} ctx={ctx} />;
    case 'busiestDay':
      return <BusiestDay slide={slide} ctx={ctx} />;
    case 'clock':
      return <Clock slide={slide} ctx={ctx} />;
    case 'emojis':
      return <Emojis slide={slide} ctx={ctx} />;
    case 'words':
      return <Words slide={slide} ctx={ctx} />;
    case 'laughs':
      return <Laughs slide={slide} ctx={ctx} />;
    case 'quiz':
      return <Quiz slide={slide} ctx={ctx} />;
    case 'race':
      return <Race slide={slide} ctx={ctx} />;
    case 'owls':
      return <Owls slide={slide} ctx={ctx} />;
    case 'replySpeed':
      return <ReplySpeed slide={slide} ctx={ctx} />;
    case 'graph':
      return <Graph slide={slide} ctx={ctx} />;
    case 'starterVsMystery':
      return <StarterVsMystery slide={slide} ctx={ctx} />;
    case 'streakSilence':
      return <StreakSilence slide={slide} ctx={ctx} />;
    case 'ranking':
      return <Ranking slide={slide} ctx={ctx} />;
    case 'images':
      return <Images slide={slide} ctx={ctx} />;
    case 'fact':
      return <Fact slide={slide} ctx={ctx} />;
    case 'people':
      return <People slide={slide} ctx={ctx} />;
    case 'vibe':
      return <Vibe slide={slide} ctx={ctx} />;
    case 'summary':
      return <Summary slide={slide} ctx={ctx} />;
  }
}
