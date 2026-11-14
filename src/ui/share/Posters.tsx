import type { CSSProperties, ReactNode } from 'react';
import type { Slide, WrappedResult } from '../../core';
import { formatNumber } from '../../core/templates/es/format';
import { es } from '../../i18n/es';
import { Avatar } from '../slides/common';
import { paletteVars } from '../theme/palettes';

/** Instagram story size. Posters are laid out in real pixels at this size. */
export const POSTER = { width: 1080, height: 1920 } as const;

const display: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 900 };

/** Diagonal brand lines across the free version of a poster. */
function Watermark() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: -500,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        transform: 'rotate(-28deg)',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <p
          key={i}
          style={{
            ...display,
            margin: 0,
            whiteSpace: 'nowrap',
            fontSize: 70,
            letterSpacing: 8,
            color: 'rgba(255,255,255,0.22)',
            textShadow: '0 2px 6px rgba(0,0,0,0.25)',
            marginLeft: i % 2 ? -260 : 0,
          }}
        >
          {Array.from({ length: 6 }, () => es.share.watermark).join('   ·   ')}
        </p>
      ))}
    </div>
  );
}

type FrameProps = {
  palette: number;
  period: string;
  watermark?: boolean;
  /**
   * Made for Instagram and WhatsApp stories: the top and bottom stay clear of the app's own
   * bars, and the footer invites whoever sees it to make theirs.
   */
  story?: boolean;
  children: ReactNode;
};

/** Where the web lives, as shown on images ("wrappsapp.vercel.app"). */
const siteHost = () => (typeof window === 'undefined' ? '' : window.location.host);

/** Common frame of every exported image: palette, brand line and footer. */
function Frame({ palette, period, watermark = false, story = false, children }: FrameProps) {
  return (
    <div
      style={{
        ...paletteVars(palette),
        width: POSTER.width,
        height: POSTER.height,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: story ? '230px 96px 330px' : 96,
        color: '#ffffff',
        fontFamily: 'var(--font-sans)',
        background: 'linear-gradient(160deg, var(--wr-a), var(--wr-c) 55%, var(--wr-d))',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: 900,
          top: -320,
          right: -320,
          background: 'var(--wr-hi)',
          opacity: 0.16,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 760,
          height: 760,
          borderRadius: 760,
          bottom: -260,
          left: -260,
          background: 'var(--wr-bg)',
          opacity: 0.45,
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ ...display, margin: 0, fontSize: 40, letterSpacing: 6, color: 'var(--wr-hi)' }}>
          {es.app.name.toUpperCase()} · {period.toUpperCase()}
        </p>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingBottom: 48,
          }}
        >
          {children}
        </div>
        {story ? (
          <p
            style={{
              ...display,
              alignSelf: 'center',
              margin: 0,
              padding: '22px 44px',
              borderRadius: 999,
              background: '#ffffff',
              color: '#12062b',
              fontSize: 38,
            }}
          >
            {es.share.storyCta} · {siteHost()}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 30, opacity: 0.8 }}>{es.share.footer}</p>
        )}
      </div>
      {watermark && <Watermark />}
    </div>
  );
}

const chip: CSSProperties = {
  ...display,
  alignSelf: 'flex-start',
  margin: 0,
  padding: '14px 36px',
  borderRadius: 999,
  background: 'var(--wr-hi)',
  color: '#12062b',
  fontSize: 40,
};

const tile: CSSProperties = {
  background: 'rgba(0,0,0,0.32)',
  borderRadius: 40,
  padding: '32px 36px',
  // Label on top, value pinned to the bottom so values line up across a row.
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

export function SummaryPoster({
  wrapped,
  slide,
  watermark = false,
}: {
  wrapped: WrappedResult;
  slide: Extract<Slide, { kind: 'summary' }>;
  watermark?: boolean;
}) {
  const name = (idx: number) => wrapped.participants[idx]?.name ?? '';
  return (
    <Frame palette={wrapped.theme.palette} period={wrapped.period.label} watermark={watermark}>
      <p style={{ ...display, margin: '56px 0 36px', fontSize: 104, lineHeight: 1.02 }}>
        {wrapped.chatName ?? es.app.tagline}
      </p>
      <p style={chip}>{slide.data.vibeName}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 72 }}>
        {slide.data.highlights.slice(0, 6).map((h) => (
          <div key={h.label} style={tile}>
            <p style={{ margin: 0, fontSize: 32, opacity: 0.85 }}>{h.label}</p>
            <p style={{ ...display, margin: '10px 0 0', fontSize: 60, lineHeight: 1.05 }}>
              {h.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-end',
          marginTop: 84,
        }}
      >
        {slide.data.podium.map((p, i) => (
          <div key={p.idx} style={{ textAlign: 'center', width: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Avatar idx={p.idx} name={name(p.idx)} size={i === 0 ? 200 : 156} />
            </div>
            <p
              style={{
                ...display,
                margin: '20px 0 0',
                fontSize: 38,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name(p.idx)}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 32, opacity: 0.85 }}>
              {formatNumber(p.value)} {es.slides.messages}
            </p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** What a person card needs (from the Wrapped, or from a shared link). */
export type PosterCard = {
  idx: number;
  name: string;
  label: string;
  title: string;
  phrase: string;
  stats: { label: string; value: string }[];
};

/**
 * "¿Cuál eres tú?": one person's card as an Instagram or WhatsApp story. The archetype is the
 * hero (it is what people share about themselves); the footer asks the viewer for theirs.
 */
export function PersonPoster({
  card,
  palette,
  period,
  chatName,
  watermark = false,
}: {
  card: PosterCard;
  palette: number;
  period: string;
  chatName: string | null;
  watermark?: boolean;
}) {
  return (
    <Frame palette={palette} period={period} watermark={watermark} story>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Avatar idx={card.idx} name={card.name} size={200} />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              ...display,
              margin: 0,
              fontSize: 84,
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.name}
          </p>
          {chatName && (
            <p style={{ margin: '14px 0 0', fontSize: 36, opacity: 0.85 }}>{chatName}</p>
          )}
        </div>
      </div>

      <p style={{ ...display, margin: '84px 0 0', fontSize: 40, letterSpacing: 4, opacity: 0.85 }}>
        {es.share.storyIs.toUpperCase()}
      </p>
      <p
        style={{
          ...display,
          margin: '12px 0 0',
          fontSize: card.label.length > 16 ? 112 : 136,
          lineHeight: 0.98,
          color: 'var(--wr-hi)',
        }}
      >
        {card.label}
      </p>
      <p style={{ ...display, margin: '44px 0 0', fontSize: 60, lineHeight: 1.1 }}>{card.title}</p>
      <p style={{ margin: '32px 0 0', fontSize: 42, lineHeight: 1.3, opacity: 0.95 }}>
        {card.phrase}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 64 }}>
        {card.stats.slice(0, 3).map((stat) => (
          <div key={stat.label} style={{ ...tile, padding: '26px 20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 26, lineHeight: 1.2, opacity: 0.85 }}>{stat.label}</p>
            <p style={{ ...display, margin: '10px 0 0', fontSize: 42, lineHeight: 1.1 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </Frame>
  );
}
