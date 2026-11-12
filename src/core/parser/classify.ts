import type { MediaType, MessageKind, SystemEvent } from './types';

export type Lang = 'es' | 'en';

export type ClassifiedBody = {
  kind: Exclude<MessageKind, 'system'>;
  mediaType?: MediaType;
  text: string;
  edited: boolean;
  /** Language revealed by the export's own markers (not by what people wrote). */
  lang?: Lang;
};

const EDITED_RE = /\s*<(?:(se editó este mensaje)|this message was edited)\.?>\s*$/i;
const DELETED_RE =
  /^(?:(se eliminó este mensaje|eliminaste este mensaje|este mensaje fue eliminado)|this message was deleted|you deleted this message)\.?$/i;
// "<Multimedia omitido>", "imagen omitida", "apuntes.pdf • 3 páginas documento omitido"…
const OMITTED_RE = /^(<)?\s*(.{0,160}?)\s*(omitid[oa]|omitted)\s*>?$/i;
const ATTACHED_TAG_RE = /^<(?:(adjunto)|attached): ([^>\n]+)>\s*/i;
const ATTACHED_SUFFIX_RE =
  /^([^\n]+?\.[A-Za-z0-9]{2,5}) \((?:(archivo adjunto)|file attached)\)(?:\n|$)/;
const POLL_RE = /^(?:(ENCUESTA)|POLL):/;
const LOCATION_RE = /^(?:(ubicación)|location): https?:\/\//i;
const LIVE_LOCATION_RE = /^(?:(ubicación en tiempo real compartida)|live location shared)\.?$/i;
const CALL_RE =
  /^(?:((?:video)?llamada(?: de voz| grupal)? perdida)|missed (?:voice |video |group )*call)(?:[.,][^\n]*)?$/i;

function langOf(spanishGroup: string | undefined): Lang {
  return spanishGroup !== undefined ? 'es' : 'en';
}

function mediaTypeFromFileName(fileName: string): MediaType | 'contact' {
  const name = fileName.toUpperCase();
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1);
  if (ext === 'VCF') return 'contact';
  if (ext === 'WEBP' || /STK-|STICKER/.test(name)) return 'sticker';
  if (ext === 'GIF' || /(^|[-_ ])GIF[-_ ]/.test(name)) return 'gif';
  if (/^(OPUS|M4A|MP3|OGG|AAC|WAV|AMR)$/.test(ext) || /PTT-|AUD-|AUDIO/.test(name)) return 'audio';
  if (/^(JPG|JPEG|PNG|HEIC)$/.test(ext) || /IMG-|PHOTO/.test(name)) return 'image';
  if (/^(MP4|MOV|3GP|MKV)$/.test(ext) || /VID-|VIDEO/.test(name)) return 'video';
  return 'document';
}

function mediaTypeFromOmittedLabel(
  label: string,
  hadBracket: boolean,
): MediaType | 'contact' | null {
  const l = label.toLowerCase();
  if (/document[oa]?$/.test(l)) return 'document';
  if (/contact/.test(l)) return 'contact';
  if (/multimedia|^media$|archivo|^file$/.test(l)) return 'media_unknown';
  if (/sticker/.test(l)) return 'sticker';
  if (/gif/.test(l)) return 'gif';
  if (/imagen|image|foto|photo/.test(l)) return 'image';
  if (/v[ií]deo/.test(l)) return 'video';
  if (/audio|voz|voice/.test(l)) return 'audio';
  // "<Algo omitido>" in brackets is still an export marker; free text is not.
  return hadBracket ? 'media_unknown' : null;
}

function asMedia(
  type: MediaType | 'contact',
  text: string,
  edited: boolean,
  lang: Lang,
): ClassifiedBody {
  if (type === 'contact') return { kind: 'contact', text, edited, lang };
  return { kind: 'media', mediaType: type, text, edited, lang };
}

/**
 * Classifies the body of a message (already stripped of invisible characters and trimmed).
 * Pure and language-independent in its output: only `lang` records what language the
 * export markers were written in.
 */
export function classifyBody(input: string): ClassifiedBody {
  let body = input;
  let edited = false;
  let lang: Lang | undefined;

  if (body.endsWith('>')) {
    const m = EDITED_RE.exec(body);
    if (m) {
      edited = true;
      lang = langOf(m[1]);
      body = body.slice(0, m.index).trimEnd();
    }
  }

  const first = body.charCodeAt(0);
  const singleLine = body.indexOf('\n') === -1;

  if (singleLine && body.length <= 200) {
    let m = DELETED_RE.exec(body);
    if (m) return { kind: 'deleted', text: '', edited, lang: langOf(m[1]) };

    m = OMITTED_RE.exec(body);
    if (m) {
      const type = mediaTypeFromOmittedLabel(m[2] ?? '', m[1] !== undefined);
      if (type) return asMedia(type, '', edited, m[3]?.toLowerCase() === 'omitted' ? 'en' : 'es');
    }

    m = LIVE_LOCATION_RE.exec(body);
    if (m) return { kind: 'location', text: '', edited, lang: langOf(m[1]) };

    m = CALL_RE.exec(body);
    if (m) return { kind: 'call', text: body, edited, lang: langOf(m[1]) };
  }

  if (first === 0x3c /* < */) {
    const m = ATTACHED_TAG_RE.exec(body);
    if (m) {
      const caption = body.slice(m[0].length).trim();
      return asMedia(mediaTypeFromFileName(m[2] ?? ''), caption, edited, langOf(m[1]));
    }
  }

  if (body.indexOf(' adjunto)') !== -1 || body.indexOf(' attached)') !== -1) {
    const m = ATTACHED_SUFFIX_RE.exec(body);
    if (m) {
      const caption = body.slice(m[0].length).trim();
      return asMedia(mediaTypeFromFileName(m[1] ?? ''), caption, edited, langOf(m[2]));
    }
  }

  let m = POLL_RE.exec(body);
  if (m) return { kind: 'poll', text: body, edited, lang: langOf(m[1]) };

  m = LOCATION_RE.exec(body);
  if (m) return { kind: 'location', text: body, edited, lang: langOf(m[1]) };

  return { kind: 'text', text: body, edited, lang };
}

type SystemPattern = { re: RegExp; event: SystemEvent; lang: Lang; group: boolean };

// Order matters: the first match wins. No \b next to accented letters (JS treats them as
// non-word characters without the `u` flag).
const SYSTEM_PATTERNS: SystemPattern[] = [
  { re: /cifrados? de extremo a extremo/i, event: 'encryption_notice', lang: 'es', group: false },
  { re: /end-to-end encrypted/i, event: 'encryption_notice', lang: 'en', group: false },
  { re: /(creó|creaste) (el|este) grupo/i, event: 'group_created', lang: 'es', group: true },
  { re: /created (this )?group/i, event: 'group_created', lang: 'en', group: true },
  {
    re: /(cambió|cambiaste) el (asunto|nombre del grupo)/i,
    event: 'subject_change',
    lang: 'es',
    group: true,
  },
  { re: /changed the (subject|group name)/i, event: 'subject_change', lang: 'en', group: true },
  {
    re: /(cambió|cambiaste|eliminó|eliminaste) (el [ií]cono|la (foto|imagen)) de/i,
    event: 'icon_change',
    lang: 'es',
    group: true,
  },
  {
    re: /(changed|deleted) (this group's|the group) icon/i,
    event: 'icon_change',
    lang: 'en',
    group: true,
  },
  {
    re: /(cambió|cambiaste) la descripción/i,
    event: 'description_change',
    lang: 'es',
    group: true,
  },
  { re: /changed the group description/i, event: 'description_change', lang: 'en', group: true },
  {
    re: /(añadió|añadiste|agregó|agregaste) a |se unió |te uniste /i,
    event: 'member_added',
    lang: 'es',
    group: true,
  },
  { re: /\b(added|joined)\b/i, event: 'member_added', lang: 'en', group: true },
  { re: /(eliminó|eliminaste) a /i, event: 'member_removed', lang: 'es', group: true },
  { re: /\bremoved\b/i, event: 'member_removed', lang: 'en', group: true },
  { re: /(^| )(salió|saliste)( |$)/i, event: 'member_left', lang: 'es', group: true },
  { re: /\bleft$/i, event: 'member_left', lang: 'en', group: true },
];

export type ClassifiedSystem = { event: SystemEvent; lang?: Lang; groupHint: boolean };

export function classifySystem(text: string): ClassifiedSystem {
  for (const p of SYSTEM_PATTERNS) {
    if (p.re.test(text)) return { event: p.event, lang: p.lang, groupHint: p.group };
  }
  return { event: 'other', groupHint: false };
}

/**
 * System lines that contain ": " (e.g. a new group subject with a colon) would otherwise be
 * split as "sender: text". A real contact name does not contain these verbs.
 */
const SYSTEM_VERB_IN_SENDER_RE =
  / (cambió|cambiaste|creó|creaste|añadió|añadiste|eliminó|eliminaste|changed|created|added|removed) /i;

export function looksLikeSystemSender(senderCandidate: string): boolean {
  return SYSTEM_VERB_IN_SENDER_RE.test(senderCandidate);
}
