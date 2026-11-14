import type { CSSProperties, ReactNode } from 'react';
import type { PersonCard, Slide, WrappedResult } from '../../core';
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
          {`${es.share.watermark}   ·   ${es.share.watermark}   ·   ${es.share.watermark}`}
        </p>
      ))}
    </div>
  );
}

type FrameProps = { wrapped: WrappedResult; watermark?: boolean; children: ReactNode };

/** Common frame of every exported image: palette, brand line and footer. */
function Frame({ wrapped, watermark = false, children }: FrameProps) {
  return (
    <div
      style={{
        ...paletteVars(wrapped.theme.palette),
        width: POSTER.width,
        height: POSTER.height,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: 96,
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
          {es.app.name.toUpperCase()} · {wrapped.period.label.toUpperCase()}
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
        <p style={{ margin: 0, fontSize: 30, opacity: 0.8 }}>{es.share.footer}</p>
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
    <Frame wrapped={wrapped} watermark={watermark}>
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

export function PersonPoster({
  wrapped,
  card,
  watermark = false,
}: {
  wrapped: WrappedResult;
  card: PersonCard;
  watermark?: boolean;
}) {
  return (
    <Frame wrapped={wrapped} watermark={watermark}>
      <div style={{ marginTop: 96 }}>
        <Avatar idx={card.idx} name={card.name} size={340} />
      </div>
      <p style={{ ...display, margin: '48px 0 28px', fontSize: 112, lineHeight: 1 }}>{card.name}</p>
      <p style={chip}>{card.label}</p>
      <p style={{ ...display, margin: '64px 0 0', fontSize: 74, lineHeight: 1.08 }}>{card.title}</p>
      <p style={{ margin: '40px 0 0', fontSize: 46, lineHeight: 1.3, opacity: 0.95 }}>
        {card.phrase}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 72 }}>
        {card.stats.map((stat) => (
          <div key={stat.label} style={{ ...tile, padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 28, lineHeight: 1.2, opacity: 0.85 }}>{stat.label}</p>
            <p style={{ ...display, margin: '10px 0 0', fontSize: 44, lineHeight: 1.1 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </Frame>
  );
}
