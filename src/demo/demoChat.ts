import { createRng, type Rng } from '../core/random/rng';

/**
 * A made-up group chat, generated from a fixed seed so it is always the same text. It is used
 * by the "Ver demo" button and by the tests. Nobody here is real.
 *
 * The output is a regular iPhone export in Spanish, so it goes through the same parser as a
 * real file.
 */
export const DEMO_CHAT_NAME = 'Los del Insti 🍕';
export const DEMO_FILE_NAME = `Chat de WhatsApp con ${DEMO_CHAT_NAME}.txt`;

const MARK = String.fromCodePoint(0x200e);
const DAY_MS = 86_400_000;

type Persona = {
  name: string;
  /** How much they talk. */
  weight: number;
  /** Hours at which they tend to start conversations. */
  hours: readonly number[];
  audio: number;
  sticker: number;
  photo: number;
  link: number;
  laugh: number;
  question: number;
  shout: number;
  long: number;
  burst: number;
  laughStyle: readonly string[];
  emojis: readonly string[];
};

const PEOPLE: readonly Persona[] = [
  {
    name: 'Nico',
    weight: 30,
    hours: [10, 14, 18, 21, 22],
    audio: 0.02,
    sticker: 0.05,
    photo: 0.04,
    link: 0.01,
    laugh: 0.3,
    question: 0.08,
    shout: 0.03,
    long: 0.02,
    burst: 0.35,
    laughStyle: ['jajajaja', 'JAJAJAJA', 'jajajajajaja', 'jajaja'],
    emojis: ['😂', '🤣', '🔥', '🍕'],
  },
  {
    name: 'Vera',
    weight: 22,
    hours: [0, 1, 2, 3, 23, 23, 16],
    audio: 0.03,
    sticker: 0.04,
    photo: 0.05,
    link: 0.02,
    laugh: 0.15,
    question: 0.1,
    shout: 0.01,
    long: 0.05,
    burst: 0.2,
    laughStyle: ['jsjsjs', 'jsjsjsjs', 'jajaja'],
    emojis: ['💀', '🌙', '😭', '✨'],
  },
  {
    name: 'Leo',
    weight: 16,
    hours: [9, 13, 19, 20],
    audio: 0.38,
    sticker: 0.03,
    photo: 0.03,
    link: 0.01,
    laugh: 0.12,
    question: 0.06,
    shout: 0.02,
    long: 0.02,
    burst: 0.1,
    laughStyle: ['jajaja', 'jeje'],
    emojis: ['🎙️', '😅', '👍'],
  },
  {
    name: 'Sara',
    weight: 15,
    hours: [7, 8, 8, 12, 17],
    audio: 0.02,
    sticker: 0.02,
    photo: 0.06,
    link: 0.03,
    laugh: 0.1,
    question: 0.45,
    shout: 0.12,
    long: 0.04,
    burst: 0.15,
    laughStyle: ['jajaja', 'JAJAJA'],
    emojis: ['🙌', '📅', '❤️', '🎉'],
  },
  {
    name: 'Hugo',
    weight: 12,
    hours: [11, 15, 20, 22],
    audio: 0.01,
    sticker: 0.01,
    photo: 0.03,
    link: 0.22,
    laugh: 0.08,
    question: 0.07,
    shout: 0.01,
    long: 0.4,
    burst: 0.1,
    laughStyle: ['jajaja', 'xD'],
    emojis: ['🤔', '📎', '👀'],
  },
  {
    name: 'Irene',
    weight: 3,
    hours: [13, 21],
    audio: 0.02,
    sticker: 0.45,
    photo: 0.05,
    link: 0.01,
    laugh: 0.2,
    question: 0.05,
    shout: 0,
    long: 0,
    burst: 0.05,
    laughStyle: ['jajaja', 'jeje'],
    emojis: ['🫶', '😌'],
  },
];

const OPENERS = [
  'Buenos días',
  'Alguien despierto',
  'Oye una cosa',
  'Qué hacéis hoy',
  'Tengo que contaros algo',
  'Plan para el finde',
  'Habéis visto lo de ayer',
  'Estoy en la biblioteca y no avanzo',
  'Me aburro',
  'Quién se apunta a cenar',
];
const LINES = [
  'vale, me apunto',
  'yo no puedo, tengo entrenamiento',
  'pues a mí me parece bien',
  'eso lo dije yo la semana pasada',
  'en la pizzería de siempre',
  'llego tarde, empezad sin mí',
  'no me lo puedo creer',
  'qué fuerte',
  'yo llevo la tortilla',
  'mañana examen de mates, ánimo',
  'el profe de historia otra vez con lo mismo',
  'me he dormido en el bus',
  'eso es mentira y lo sabes',
  'sois lo mejor',
  'gracias por lo de ayer, de verdad',
  'qué ganas de verano',
  'pizza o kebab, decidid ya',
  'yo voto pizza',
  'el sábado en casa de Leo',
  'me encanta este grupo',
  'genial, entonces quedamos a las ocho',
  'ya estoy en la puerta',
  'no encuentro las llaves',
  'ha sido increíble',
  'me parto con vosotros',
  'la tortilla estaba buenísima',
  'aprobado, por fin',
  'esto hay que repetirlo',
];
const QUESTIONS = [
  '¿A qué hora quedamos?',
  '¿Quién viene al final?',
  '¿Alguien tiene los apuntes de física?',
  '¿Pizza o kebab?',
  '¿Dónde era?',
  '¿Lleváis algo de beber?',
  '¿Cuánto os debo?',
  '¿Confirmáis antes del jueves?',
  '¿Alguien me recoge?',
];
const SHOUTS = [
  'CONFIRMAD YA POR FAVOR',
  'NO ME LO CREO',
  'APROBADO TODO',
  'QUE ES MAÑANA EH',
  'VENID YA',
  'FELICIDADES',
];
const LONG_LINES = [
  'A ver, lo he estado pensando y creo que lo mejor es que quedemos antes, porque luego siempre pasa lo mismo: llegamos tarde, no hay mesa y acabamos cenando de pie en la plaza como la última vez.',
  'Os paso un resumen de lo que dijo la tutora, porque sé que nadie estaba escuchando: el trabajo se entrega el viernes, es por parejas, y cuenta lo mismo que el examen, así que mejor empezar ya.',
  'Mi teoría es que el final de la serie tiene todo el sentido del mundo si recordáis el segundo capítulo, donde ya avisan de lo que va a pasar, pero claro, eso exige haber prestado atención.',
  'He mirado tres sitios distintos y el más barato es el del centro, aunque está más lejos de la parada, así que habría que decidir si preferimos ahorrar o caminar menos, que nos conocemos.',
];
const LINKS = [
  'https://example.com/noticias/instituto',
  'https://example.com/video/gol-imposible',
  'https://example.com/mapa/pizzeria',
  'https://example.com/articulo/por-que-dormimos-poco',
  'https://example.com/entradas/concierto',
];
const PARTY_WORDS = ['fiesta', 'cumple', 'tarta', 'sorpresa', 'regalo', 'Irene'];
const TRIP_WORDS = ['excursión', 'autobús', 'mochila', 'playa', 'bocadillo'];

/** Days with a lot going on: [month, day, keywords]. */
const BIG_DAYS: readonly [number, number, readonly string[]][] = [
  [3, 14, PARTY_WORDS],
  [6, 20, TRIP_WORDS],
  [10, 31, PARTY_WORDS],
];

const pad = (n: number) => String(n).padStart(2, '0');

function line(ts: number, name: string, body: string, generated = false): string {
  const d = new Date(ts);
  const stamp = `[${d.getUTCDate()}/${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(2)}, ${d.getUTCHours()}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}]`;
  return `${generated ? MARK : ''}${stamp} ${name}: ${generated ? MARK : ''}${body}`;
}

function message(rng: Rng, p: Persona, keywords: readonly string[] | null): [string, boolean] {
  const roll = rng.next();
  let edge = p.audio;
  if (roll < edge) return ['audio omitido', true];
  if (roll < (edge += p.sticker)) return ['sticker omitido', true];
  if (roll < (edge += p.photo)) return [rng.chance(0.8) ? 'imagen omitida' : 'Video omitido', true];
  if (roll < (edge += p.link)) return [`mirad esto ${rng.pick(LINKS)}`, false];
  if (roll < (edge += p.laugh)) {
    const laugh = rng.pick(p.laughStyle);
    return [rng.chance(0.5) ? `${laugh} ${rng.pick(p.emojis)}` : laugh, false];
  }
  if (roll < (edge += p.question)) return [rng.pick(QUESTIONS), false];
  if (roll < (edge += p.shout)) return [rng.pick(SHOUTS), false];
  if (roll < (edge += p.long)) return [rng.pick(LONG_LINES), false];
  if (roll < edge + 0.012) return ['Se eliminó este mensaje.', true];

  let text: string = rng.pick(LINES);
  if (keywords && rng.chance(0.6)) text = `${text}, lo de la ${rng.pick(keywords)}`;
  if (rng.chance(0.25)) text = `${text} ${rng.pick(p.emojis)}`;
  if (rng.chance(0.02)) text = `${text} ${MARK}<Se editó este mensaje.>`;
  return [text, false];
}

/** The demo chat as the text of an exported file. Always identical. */
export function generateDemoChat(): string {
  const rng = createRng('wrappsapp-demo-v1');
  const lines: string[] = [];
  const start = Date.UTC(2026, 0, 1);
  const days = 354; // 1 January – 20 December 2026

  lines.push(
    line(
      start + 9 * 3_600_000,
      DEMO_CHAT_NAME,
      'Los mensajes y las llamadas están cifrados de extremo a extremo.',
      true,
    ),
    line(start + 9 * 3_600_000 + 1000, 'Nico', `Nico creó el grupo "Los del Insti"`, true),
  );

  for (let day = 0; day < days; day++) {
    const dayStart = start + day * DAY_MS;
    const date = new Date(dayStart);
    const month = date.getUTCMonth() + 1;
    const dayOfMonth = date.getUTCDate();
    // Two weeks of holidays without a single message.
    if (month === 8 && dayOfMonth >= 3 && dayOfMonth <= 16) continue;
    // A handful of quiet days so the streak is not the whole year.
    if (rng.chance(0.06)) continue;

    const big = BIG_DAYS.find(([m, d]) => m === month && d === dayOfMonth);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const conversations = big ? 9 : 1 + rng.int(weekend ? 4 : 3);

    const starts: { at: number; who: Persona }[] = [];
    for (let c = 0; c < conversations; c++) {
      const who = rng.weighted(PEOPLE, (p) => p.weight);
      starts.push({ at: rng.pick(who.hours) * 60 + rng.int(60), who });
    }
    starts.sort((x, y) => x.at - y.at);

    let cursor = 0;
    for (const { at, who } of starts) {
      let minute = Math.max(at, cursor + 5);
      let seconds = rng.int(60);
      const length = big ? 14 + rng.int(18) : 3 + rng.int(14);
      let speaker = who;
      for (let i = 0; i < length && minute < 1439; i++) {
        const ts = dayStart + minute * 60_000 + seconds * 1000;
        let [body, generated] =
          i === 0 ? [rng.pick(OPENERS), false] : message(rng, speaker, big?.[2] ?? null);
        if (i === 0 && rng.chance(0.3)) body = `${body} ${rng.pick(speaker.emojis)}`;
        if (generated && body.startsWith('Se eliminó')) generated = true;
        lines.push(line(ts, speaker.name, body, generated));

        if (!rng.chance(speaker.burst)) {
          const previous = speaker;
          speaker = rng.weighted(
            PEOPLE.filter((p) => p !== previous),
            (p) => p.weight,
          );
        }
        seconds += 5 + rng.int(50);
        minute += Math.floor(seconds / 60) + (rng.chance(0.3) ? rng.int(4) : 0);
        seconds %= 60;
      }
      cursor = minute;
    }

    if (month === 5 && dayOfMonth === 2) {
      lines.push(
        line(
          dayStart + 86_000_000,
          'Sara',
          `Sara cambió el nombre del grupo a "Los del Insti 🎓"`,
          true,
        ),
      );
    }
    if (month === 9 && dayOfMonth === 12) {
      lines.push(
        line(
          dayStart + 86_000_000,
          'Nico',
          `Nico cambió el nombre del grupo a "${DEMO_CHAT_NAME}"`,
          true,
        ),
      );
    }
    if (dayOfMonth === 1 && month % 3 === 0) {
      lines.push(
        line(
          dayStart + 86_100_000,
          'Sara',
          `ENCUESTA:\n${MARK}¿Pizza o kebab?\n${MARK}OPCIÓN: Pizza (${MARK}4 votos)\n${MARK}OPCIÓN: Kebab (${MARK}2 votos)`,
          true,
        ),
      );
    }
  }

  return lines.join('\r\n') + '\r\n';
}
