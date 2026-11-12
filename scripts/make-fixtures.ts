/**
 * Generates the synthetic fixtures in tests/fixtures/ from ONE conversation, rendered the way
 * each platform / language / clock format exports it. Because every file comes from the same
 * source, the tests can assert that they all parse to the same chat.
 *
 *   npm run fixtures
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LRM = '\u200e';
const NNBSP = '\u202f';
const NBSP = '\u00a0';

type At = [year: number, month: number, day: number, hour: number, minute: number, second: number];
type Media = 'image' | 'audio' | 'sticker' | 'video' | 'gif' | 'document';
type Ev =
  | {
      t: 'sys';
      at: At;
      key: 'e2e' | 'created' | 'added' | 'subject' | 'icon' | 'left';
      actor: string;
      target?: string;
    }
  | { t: 'text'; at: At; from: string; text: string; edited?: boolean }
  | { t: 'media'; at: At; from: string; media: Media }
  | { t: 'deleted' | 'poll' | 'location' | 'contact'; at: At; from: string };

const GROUP = 'Los del Insti 🍕';
const NEW_SUBJECT = 'Insti: la secuela 🍕';

export const CONVERSATION: Ev[] = [
  { t: 'sys', at: [2026, 11, 12, 9, 0, 1], key: 'e2e', actor: GROUP },
  { t: 'sys', at: [2026, 11, 12, 9, 0, 2], key: 'created', actor: 'Juan' },
  { t: 'sys', at: [2026, 11, 12, 9, 1, 0], key: 'added', actor: 'Juan', target: 'Marta' },
  { t: 'text', at: [2026, 11, 12, 17, 3, 45], from: 'Juan', text: 'Hola qué tal' },
  {
    t: 'text',
    at: [2026, 11, 12, 17, 4, 10],
    from: 'Marta',
    text: 'Bien!! 😂😂\nOs cuento luego\n\nque es largo',
  },
  { t: 'media', at: [2026, 11, 12, 17, 5, 2], from: 'Lucía', media: 'image' },
  { t: 'media', at: [2026, 11, 12, 17, 5, 30], from: 'Dani', media: 'audio' },
  { t: 'media', at: [2026, 11, 12, 23, 59, 59], from: 'Marta', media: 'sticker' },
  {
    t: 'text',
    at: [2026, 11, 13, 0, 1, 7],
    from: 'Juan',
    text: 'jajajaja no puede ser',
    edited: true,
  },
  { t: 'deleted', at: [2026, 11, 13, 0, 2, 0], from: 'Lucía' },
  { t: 'poll', at: [2026, 11, 13, 12, 0, 0], from: 'Dani' },
  { t: 'location', at: [2026, 11, 13, 12, 30, 12], from: 'Marta' },
  { t: 'contact', at: [2026, 11, 13, 12, 31, 0], from: 'Juan' },
  { t: 'media', at: [2026, 11, 14, 8, 15, 0], from: 'Dani', media: 'video' },
  { t: 'media', at: [2026, 11, 14, 8, 16, 0], from: 'Lucía', media: 'gif' },
  { t: 'media', at: [2026, 11, 14, 8, 17, 0], from: 'Juan', media: 'document' },
  { t: 'sys', at: [2026, 11, 14, 10, 0, 0], key: 'subject', actor: 'Juan' },
  { t: 'sys', at: [2026, 11, 14, 10, 1, 0], key: 'icon', actor: 'Marta' },
  {
    t: 'text',
    at: [2026, 11, 14, 12, 12, 12],
    from: 'Lucía',
    text: 'Mirad: https://example.com/a?b=1',
  },
  { t: 'text', at: [2026, 11, 15, 5, 3, 0], from: 'Dani', text: 'A las 5:03 PM quedamos, ¿no?' },
  { t: 'text', at: [2026, 11, 16, 0, 30, 0], from: 'Marta', text: 'NO ME LO CREO' },
  { t: 'text', at: [2026, 11, 16, 12, 5, 0], from: 'Juan', text: 'Buenos días 🌞' },
  { t: 'sys', at: [2026, 12, 1, 18, 0, 0], key: 'left', actor: 'Dani' },
  { t: 'text', at: [2026, 12, 1, 18, 1, 0], from: 'Juan', text: 'Feliz diciembre 🎄' },
];

type Variant = {
  file: string;
  platform: 'android' | 'ios';
  lang: 'es' | 'en';
  clock: 12 | 24;
  year4?: boolean;
  withMedia?: boolean;
  bom?: boolean;
};

const VARIANTS: Variant[] = [
  { file: 'android-es-24h.txt', platform: 'android', lang: 'es', clock: 24 },
  { file: 'android-es-12h.txt', platform: 'android', lang: 'es', clock: 12 },
  { file: 'android-en-12h.txt', platform: 'android', lang: 'en', clock: 12 },
  { file: 'android-es-year4.txt', platform: 'android', lang: 'es', clock: 24, year4: true },
  {
    file: 'android-es-with-media.txt',
    platform: 'android',
    lang: 'es',
    clock: 24,
    withMedia: true,
  },
  { file: 'ios-es-24h.txt', platform: 'ios', lang: 'es', clock: 24, bom: true },
  { file: 'ios-en-12h.txt', platform: 'ios', lang: 'en', clock: 12 },
];

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(at: At, v: Variant): string {
  const [y, mo, d, h, mi, s] = at;
  const year = v.year4 ? String(y) : pad(y % 100);
  const date = v.lang === 'es' ? `${d}/${mo}/${year}` : `${mo}/${d}/${year}`;
  const seconds = v.platform === 'ios' ? `:${pad(s)}` : '';
  let time: string;
  if (v.clock === 24) {
    time = `${h}:${pad(mi)}${seconds}`;
  } else {
    const suffix =
      v.lang === 'es' ? (h < 12 ? `a.${NBSP}m.` : `p.${NBSP}m.`) : h < 12 ? 'AM' : 'PM';
    time = `${h % 12 || 12}:${pad(mi)}${seconds}${NNBSP}${suffix}`;
  }
  return v.platform === 'ios' ? `[${date}, ${time}]` : `${date}, ${time} -`;
}

function systemText(ev: Extract<Ev, { t: 'sys' }>, lang: 'es' | 'en'): string {
  const es = lang === 'es';
  switch (ev.key) {
    case 'e2e':
      return es
        ? 'Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos. Toca para obtener más información.'
        : 'Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Tap to learn more.';
    case 'created':
      return es ? `${ev.actor} creó el grupo "${GROUP}"` : `${ev.actor} created group "${GROUP}"`;
    case 'added':
      return es ? `${ev.actor} añadió a ${ev.target}` : `${ev.actor} added ${ev.target}`;
    case 'subject':
      return es
        ? `${ev.actor} cambió el asunto de "${GROUP}" a "${NEW_SUBJECT}"`
        : `${ev.actor} changed the subject from "${GROUP}" to "${NEW_SUBJECT}"`;
    case 'icon':
      return es
        ? `${ev.actor} cambió el icono de este grupo`
        : `${ev.actor} changed this group's icon`;
    case 'left':
      return es ? `${ev.actor} salió` : `${ev.actor} left`;
  }
}

const ANDROID_FILES: Record<Media, string> = {
  image: 'IMG-20261112-WA0001.jpg',
  audio: 'PTT-20261112-WA0002.opus',
  sticker: 'STK-20261112-WA0003.webp',
  video: 'VID-20261114-WA0004.mp4',
  gif: 'VID-20261114-WA0005.mp4', // Android stores GIFs as mp4: indistinguishable from video
  document: 'apuntes.pdf',
};

const IOS_MEDIA: Record<'es' | 'en', Record<Media, string>> = {
  es: {
    image: `${LRM}imagen omitida`,
    audio: `${LRM}audio omitido`,
    sticker: `${LRM}sticker omitido`,
    video: `${LRM}Video omitido`,
    gif: `${LRM}GIF omitido`,
    document: `${LRM}apuntes.pdf • ${LRM}3 páginas ${LRM}documento omitido`,
  },
  en: {
    image: `${LRM}image omitted`,
    audio: `${LRM}audio omitted`,
    sticker: `${LRM}sticker omitted`,
    video: `${LRM}video omitted`,
    gif: `${LRM}GIF omitted`,
    document: `${LRM}apuntes.pdf • ${LRM}3 pages ${LRM}document omitted`,
  },
};

function body(ev: Exclude<Ev, { t: 'sys' }>, v: Variant): string {
  const es = v.lang === 'es';
  const ios = v.platform === 'ios';
  const mark = ios ? LRM : '';
  switch (ev.t) {
    case 'text': {
      if (!ev.edited) return ev.text;
      const tag = es ? '<Se editó este mensaje.>' : '<This message was edited>';
      return `${ev.text} ${mark}${tag}`;
    }
    case 'media':
      if (ios) return IOS_MEDIA[v.lang][ev.media];
      if (v.withMedia)
        return `${ANDROID_FILES[ev.media]} (${es ? 'archivo adjunto' : 'file attached'})`;
      return es ? '<Multimedia omitido>' : '<Media omitted>';
    case 'deleted':
      if (ios) return mark + (es ? 'Se eliminó este mensaje.' : 'This message was deleted.');
      return es ? 'Se eliminó este mensaje' : 'This message was deleted';
    case 'poll':
      return es
        ? `${mark}ENCUESTA:\n${mark}¿Pizza o kebab?\n${mark}OPCIÓN: Pizza (${mark}2 votos)\n${mark}OPCIÓN: Kebab (${mark}1 voto)`
        : `${mark}POLL:\n${mark}¿Pizza o kebab?\n${mark}OPTION: Pizza (${mark}2 votes)\n${mark}OPTION: Kebab (${mark}1 vote)`;
    case 'location': {
      const url = 'https://maps.google.com/?q=40.4168,-3.7038';
      if (ios) return mark + (es ? `Ubicación: ${url}` : `Location: ${url}`);
      return es ? `ubicación: ${url}` : `location: ${url}`;
    }
    case 'contact':
      if (ios) return mark + (es ? 'Tarjeta de contacto omitida' : 'Contact card omitted');
      return `Pepe Fontanero.vcf (${es ? 'archivo adjunto' : 'file attached'})`;
  }
}

export function render(v: Variant): string {
  const lines: string[] = [];
  for (const ev of CONVERSATION) {
    const ts = stamp(ev.at, v);
    if (ev.t === 'sys') {
      const text = systemText(ev, v.lang);
      // iOS attributes notices to the group or to a person and prefixes the body with a mark.
      lines.push(v.platform === 'ios' ? `${ts} ${ev.actor}: ${LRM}${text}` : `${ts} ${text}`);
    } else {
      const content = body(ev, v);
      const generated = v.platform === 'ios' && content.startsWith(LRM);
      lines.push(`${generated ? LRM : ''}${ts} ${ev.from}: ${content}`);
    }
  }
  const eol = v.platform === 'ios' ? '\r\n' : '\n';
  return (v.bom ? '\ufeff' : '') + lines.join(eol) + eol;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures');
mkdirSync(outDir, { recursive: true });
for (const v of VARIANTS) {
  writeFileSync(join(outDir, v.file), render(v), 'utf8');
  console.log(`wrote tests/fixtures/${v.file}`);
}
writeFileSync(
  join(outDir, 'not-a-chat.txt'),
  'Lista de la compra\n- Huevos\n- Leche\n- 12 yogures\n',
  'utf8',
);
console.log('wrote tests/fixtures/not-a-chat.txt');
