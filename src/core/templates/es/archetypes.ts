import { num, type Variant } from '../engine';

export type ArchetypeId =
  | 'owl'
  | 'podcaster'
  | 'lightning'
  | 'mystery'
  | 'starter'
  | 'essayist'
  | 'memeLord'
  | 'correspondent'
  | 'laugher'
  | 'interrogator'
  | 'shouter'
  | 'doubleTexter'
  | 'emojiWalker'
  | 'earlyBird'
  | 'regretful'
  | 'editor'
  | 'glue'
  | 'monologuist'
  | 'pollster'
  | 'comeback'
  | 'engine'
  | 'telegraph'
  | 'optimist'
  | 'constant'
  | 'paparazzi'
  | 'classic';

/** Slots every person text can use. Null when the data does not exist for that person. */
export const PERSON_SLOTS = [
  'name',
  'messages',
  'pct',
  'oneIn',
  'nightPct',
  'nightCount',
  'earlyPct',
  'audios',
  'minutes',
  'replyTime',
  'starts',
  'avgWords',
  'stickers',
  'links',
  'laughs',
  'laugh',
  'questions',
  'shouts',
  'doubles',
  'emojis',
  'emoji',
  'deleted',
  'edited',
  'monologue',
  'polls',
  'absence',
  'activeDays',
  'word',
  'media',
  'positivePct',
  'favorite',
] as const;

/**
 * Titles are built as  [prefix] + [core] + [optional suffix]:
 * "Leyenda de" + "la madrugada" + ", sin remedio".
 * Every prefix ends in "de", "en" or "a" and every core is a noun phrase or an infinitive, so
 * any combination reads well and none assumes the person's gender.
 */
export const TITLE_PREFIXES = [
  'Leyenda de',
  'CEO de',
  'Patrimonio de',
  'Embajada de',
  'Ministerio de',
  'Voz oficial de',
  'Doctorado en',
  'Máster en',
  'Récord mundial de',
  'Alma de',
  'Realeza de',
  'Eminencia en',
  'Referente en',
  'Cátedra de',
  'Monumento a',
  'Oda a',
] as const;

/** Empty entries make "no suffix" more likely. */
export const TITLE_SUFFIXES = [
  '',
  '',
  '',
  '',
  'nivel leyenda',
  'sin remedio',
  'con honores',
  'a jornada completa',
  'de pura cepa',
  'por aclamación popular',
  'con denominación de origen',
  'y con orgullo',
  'edición limitada',
] as const;

export type ArchetypeTexts = {
  /** Short name shown on the card. */
  label: string;
  cores: readonly Variant[];
  phrases: readonly Variant[];
  /** The stat that justifies the archetype: always shown on the card. */
  stat: { label: string; value: string };
};

export const ARCHETYPES: Record<ArchetypeId, ArchetypeTexts> = {
  owl: {
    label: 'Búho nocturno',
    cores: [
      'las 3 a. m.',
      'la madrugada',
      'el insomnio colectivo',
      'el turno de noche',
      'las horas intempestivas',
      'la luna llena',
    ],
    phrases: [
      '{name} mandó el {nightPct}% de sus mensajes de madrugada. Dormir es opcional.',
      'Cuando {chat} duerme, {name} sigue en línea.',
      '{nightCount|num} mensajes entre las 00:00 y las 06:00. {name} vigila.',
      'Si son las 3 a. m. y suena el móvil, es {name}.',
    ],
    stat: { label: 'Mensajes de madrugada', value: '{nightPct}%' },
  },
  podcaster: {
    label: 'Podcaster',
    cores: [
      'las notas de voz',
      'el micrófono abierto',
      'los audios de 4 minutos',
      'la radio del grupo',
      'el botón del micro',
      'la voz en off',
    ],
    phrases: [
      '{name} mandó {audios|num} audios. Eso son unos {minutes|num} minutos de podcast que nadie pidió (pero todos escuchamos).',
      '{audios|num} notas de voz. {name} no escribe: emite.',
      'Unos {minutes|num} minutos de {name} en vuestros oídos, calculando a ojo.',
      'Para qué escribir pudiendo contarlo: {audios|num} audios de {name}.',
    ],
    stat: { label: 'Audios', value: '{audios|num}' },
  },
  lightning: {
    label: 'Rayo',
    cores: [
      'la respuesta inmediata',
      'los reflejos felinos',
      'el doble check instantáneo',
      'la velocidad del pulgar',
      'el «en línea» permanente',
      'contestar antes de tiempo',
    ],
    phrases: [
      '{name} suele contestar en {replyTime}. Ni tiempo a bloquear el móvil.',
      'Respuesta habitual de {name}: {replyTime}. Reflejos de campeonato.',
      'Si escribes, {name} ya ha contestado.',
      '{replyTime}: lo que tarda {name}. Hay microondas más lentos.',
    ],
    stat: { label: 'Suele contestar en', value: '{replyTime}' },
  },
  mystery: {
    label: 'Misterio',
    cores: [
      'el perfil bajo',
      'la presencia silenciosa',
      'el visto elegante',
      'las apariciones estelares',
      'el sigilo',
      'leer sin hacer ruido',
    ],
    phrases: [
      '{name} escribió {messages|num} {messages|plural:mensaje,mensajes}. Pocos, pero con criterio.',
      '{name} lo lee todo y habla cuando toca.',
      'Cada mensaje de {name} es un acontecimiento: hubo {messages|num}.',
      '{name} es calidad antes que cantidad.',
    ],
    stat: { label: 'Mensajes', value: '{messages|num}' },
  },
  starter: {
    label: 'Chispa',
    cores: [
      'el primer mensaje',
      'romper el hielo',
      'los buenos días',
      'el «¿qué hacéis?»',
      'las conversaciones nuevas',
      'la iniciativa',
    ],
    phrases: [
      '{name} abrió {starts|num} conversaciones. Sin {name}, silencio.',
      '{starts|num} veces rompió el hielo {name}.',
      'Si hay tema, lo puso {name}.',
      '{name} no espera a que pase algo: lo provoca. {starts|num} veces.',
    ],
    stat: { label: 'Conversaciones abiertas', value: '{starts|num}' },
  },
  essayist: {
    label: 'Ensayista',
    cores: [
      'los párrafos enteros',
      'el mensaje largo',
      'el «leer más»',
      'la reflexión profunda',
      'los textos con introducción y desenlace',
      'la prosa',
    ],
    phrases: [
      '{name} escribe {avgWords} palabras por mensaje. Aquí se viene a desarrollar.',
      'Los mensajes de {name} tienen planteamiento, nudo y desenlace.',
      '{avgWords} palabras por mensaje. {name} no resume.',
      'Cuando {name} escribe, aparece el «leer más».',
    ],
    stat: { label: 'Palabras por mensaje', value: '{avgWords}' },
  },
  memeLord: {
    label: 'Meme Lord',
    cores: [
      'los stickers',
      'el sticker exacto',
      'los GIF de reacción',
      'el humor sin palabras',
      'la carpeta de stickers',
      'el meme a tiempo',
    ],
    phrases: [
      '{name} mandó {stickers|num} stickers y GIF. Un sticker vale más que mil palabras.',
      '{name} tiene un sticker para cada situación. Usó {stickers|num}.',
      '{stickers|num} reacciones gráficas de {name}. Arte contemporáneo.',
      'Si existe un sticker para esto, {name} lo tiene.',
    ],
    stat: { label: 'Stickers y GIF', value: '{stickers|num}' },
  },
  correspondent: {
    label: 'Corresponsal',
    cores: [
      'los enlaces',
      'el «mirad esto»',
      'la última hora',
      'las noticias frescas',
      'el enlace que nadie abrió',
      'la actualidad',
    ],
    phrases: [
      '{name} compartió {links|num} enlaces. Agencia de noticias propia.',
      '{links|num} enlaces de {name}. ¿Cuántos abristeis? Sed sinceros.',
      'Antes de que salga en las noticias, {name} ya lo ha pasado.',
      '{name} os mantiene al día: {links|num} enlaces.',
    ],
    stat: { label: 'Enlaces', value: '{links|num}' },
  },
  laugher: {
    label: 'Risa fácil',
    cores: [
      'el jajaja',
      'la risa floja',
      'la carcajada escrita',
      'el «me muero»',
      'reírse por todo',
      'la risa contagiosa',
    ],
    phrases: [
      '{name} se rio {laughs|num} veces por escrito. Público ideal.',
      '{laughs|num} risas de {name}. Con {name}, todo chiste funciona.',
      'Su risa oficial: «{laugh}».',
      'Con {name} delante, contar algo merece la pena: {laughs|num} risas.',
    ],
    stat: { label: 'Risas', value: '{laughs|num}' },
  },
  interrogator: {
    label: 'Signo de interrogación',
    cores: [
      'las preguntas',
      'el «¿y eso?»',
      'la curiosidad',
      'el interrogatorio amable',
      'querer saberlo todo',
      'el «¿a qué hora?»',
    ],
    phrases: [
      '{name} hizo {questions|num} preguntas. Alguna hasta tuvo respuesta.',
      '{questions|num} interrogaciones. {name} quiere saber.',
      '{name} pregunta lo que el resto no se atreve.',
      'Sin las {questions|num} preguntas de {name}, nadie sabría a qué hora se queda.',
    ],
    stat: { label: 'Preguntas', value: '{questions|num}' },
  },
  shouter: {
    label: 'Mayúsculas',
    cores: [
      'las MAYÚSCULAS',
      'el Bloq Mayús',
      'el énfasis',
      'el volumen alto',
      'el entusiasmo escrito',
      'hablar EN GRANDE',
    ],
    phrases: [
      '{name} escribió {shouts|num} mensajes EN MAYÚSCULAS. Se oyen desde aquí.',
      'No es gritar, es énfasis: {shouts|num} mensajes de {name}.',
      '{name} vive las cosas CON INTENSIDAD. {shouts|num} veces.',
      'El Bloq Mayús de {name} pide un descanso.',
    ],
    stat: { label: 'Mensajes en mayúsculas', value: '{shouts|num}' },
  },
  doubleTexter: {
    label: 'Doble mensaje',
    cores: [
      'el doble mensaje',
      'el «y otra cosa»',
      'escribir por entregas',
      'el mensaje en tres partes',
      'el punto y seguido',
      'las ráfagas',
    ],
    phrases: [
      '{name} encadenó mensajes {doubles|num} veces. Las ideas llegan por entregas.',
      'Un mensaje nunca es suficiente para {name}: {doubles|num} ráfagas.',
      '{name} piensa mientras escribe, y escribe mientras piensa.',
      'Para {name}, el punto y aparte es otro mensaje. {doubles|num} veces.',
    ],
    stat: { label: 'Ráfagas de mensajes', value: '{doubles|num}' },
  },
  emojiWalker: {
    label: 'Emoji andante',
    cores: [
      'los emojis',
      'el emoji exacto',
      'escribir con dibujitos',
      'la expresividad',
      'el teclado de emojis',
      'decirlo con caritas',
    ],
    phrases: [
      '{name} usó {emojis|num} emojis. Su favorito: {emoji}.',
      '{emojis|num} emojis de {name}. Las palabras se quedan cortas.',
      '{name} y {emoji}: una historia de amor.',
      'Si {name} no pone emoji, preocupaos.',
    ],
    stat: { label: 'Emojis', value: '{emojis|num}' },
  },
  earlyBird: {
    label: 'Despertador',
    cores: [
      'los buenos días',
      'las 7 a. m.',
      'el primer café',
      'amanecer con el móvil',
      'el mensaje antes del desayuno',
      'la primera hora',
    ],
    phrases: [
      'El {earlyPct}% de los mensajes de {name} llega antes de las 9. Buenos días a quien madruga.',
      '{name} ya ha escrito cuando el resto apaga la alarma.',
      'Mientras los demás se despiertan, {name} ya va por el segundo mensaje.',
      'Si hay un mensaje a las 7, es de {name}.',
    ],
    stat: { label: 'Mensajes antes de las 9', value: '{earlyPct}%' },
  },
  regretful: {
    label: 'Marcha atrás',
    cores: [
      'el «Se eliminó este mensaje»',
      'borrar a tiempo',
      'el mensaje fantasma',
      'pensárselo dos veces',
      'la marcha atrás',
      'el «no he dicho nada»',
    ],
    phrases: [
      '{name} borró {deleted|num} mensajes. Nunca sabremos qué ponían.',
      '{deleted|num} mensajes eliminados. {name} y el misterio.',
      '{name} escribe, envía y recapacita. {deleted|num} veces.',
      'Lo que {name} borró, borrado está.',
    ],
    stat: { label: 'Mensajes borrados', value: '{deleted|num}' },
  },
  editor: {
    label: 'Edición final',
    cores: [
      'el «editado»',
      'la versión corregida',
      'el perfeccionismo',
      'la errata cazada',
      'pulir cada mensaje',
      'la segunda versión',
    ],
    phrases: [
      '{name} editó {edited|num} mensajes. La perfección lleva su tiempo.',
      '{edited|num} mensajes corregidos. {name} no deja pasar una errata.',
      'Lo que {name} envía es un borrador; lo bueno llega después.',
      '{name} siempre tiene una versión mejor.',
    ],
    stat: { label: 'Mensajes editados', value: '{edited|num}' },
  },
  glue: {
    label: 'Pegamento',
    cores: [
      'la conversación con todo el mundo',
      'hablar con cada cual',
      'el buen ambiente',
      'unir al grupo',
      'las respuestas para todos',
      'la diplomacia',
    ],
    phrases: [
      '{name} contesta a todo el mundo por igual. Así se mantiene unido un grupo.',
      'Nadie se queda sin respuesta si está {name}.',
      '{name} reparte respuestas con una equidad admirable.',
      'Si {chat} sigue en pie, parte del mérito es de {name}.',
    ],
    stat: { label: 'Habla más con', value: '{favorite}' },
  },
  monologuist: {
    label: 'Monólogo',
    cores: [
      'el monólogo',
      'hablar sin interrupciones',
      'el hilo infinito',
      'los {monologue} mensajes seguidos',
      'la función en solitario',
      'el soliloquio',
    ],
    phrases: [
      '{name} llegó a encadenar {monologue} mensajes seguidos. Función completa.',
      '{monologue} mensajes del tirón. {name} tenía cosas que contar.',
      '{name} no necesita réplica para seguir.',
      'Cuando {name} arranca, mejor coger sitio.',
    ],
    stat: { label: 'Mensajes seguidos', value: '{monologue}' },
  },
  pollster: {
    label: 'Encuestas',
    cores: [
      'las encuestas',
      'la democracia directa',
      'el «votad»',
      'la consulta popular',
      'decidir en grupo',
      'el recuento de votos',
    ],
    phrases: [
      '{name} lanzó {polls} encuestas. Aquí se vota todo.',
      '{polls} encuestas de {name}. Democracia directa.',
      'Con {name}, ninguna decisión se toma sin urnas.',
      '¿Pizza o kebab? {name} lo somete a votación.',
    ],
    stat: { label: 'Encuestas', value: '{polls}' },
  },
  comeback: {
    label: 'Regreso estelar',
    cores: [
      'las reapariciones',
      'el «¿qué me he perdido?»',
      'volver por sorpresa',
      'las vacaciones del chat',
      'la desconexión',
      'el regreso triunfal',
    ],
    phrases: [
      '{name} estuvo {absence} días sin escribir… y volvió. Qué alegría.',
      '{absence} días de ausencia y un regreso por todo lo alto.',
      '{name} desaparece, pero siempre vuelve.',
      'Las pausas de {name} hacen sus regresos más especiales.',
    ],
    stat: { label: 'Mayor pausa', value: '{absence} días' },
  },
  engine: {
    label: 'Motor',
    cores: [
      'los {messages|num} mensajes',
      'no soltar el móvil',
      'la conversación',
      'el teclado',
      'mantener esto vivo',
      'la actividad',
    ],
    phrases: [
      '{name} escribió {messages|num} mensajes: el {pct}% del total.',
      'Sin {name}, esto iría a medio gas. {messages|num} mensajes.',
      {
        text: 'Uno de cada {oneIn} mensajes es de {name}.',
        when: (s) => num(s.oneIn) >= 2,
      },
      '{name} mantiene {chat} en marcha.',
    ],
    stat: { label: 'Peso en el chat', value: '{pct}%' },
  },
  telegraph: {
    label: 'Telegrama',
    cores: [
      'el mensaje corto',
      'el «ok»',
      'la economía de palabras',
      'ir al grano',
      'la brevedad',
      'decirlo en dos palabras',
    ],
    phrases: [
      '{name} usa {avgWords} palabras por mensaje. Claro y al grano.',
      'Para qué más: {avgWords} palabras por mensaje.',
      '{name} dice en tres palabras lo que otros en tres párrafos.',
      'Breve. Así es {name}.',
    ],
    stat: { label: 'Palabras por mensaje', value: '{avgWords}' },
  },
  optimist: {
    label: 'Buen rollo',
    cores: [
      'el buen rollo',
      'los ánimos',
      'las buenas noticias',
      'el «qué bien»',
      'la energía positiva',
      'alegrar el chat',
    ],
    phrases: [
      'De los mensajes de {name} con algo de emoción, el {positivePct}% son de buen rollo.',
      '{name} sube el ánimo {del_chat}.',
      'Con {name}, todo plan suena mejor.',
      'Si hay algo que celebrar, {name} llega primero.',
    ],
    stat: { label: 'Buen rollo', value: '{positivePct}%' },
  },
  constant: {
    label: 'Reloj suizo',
    cores: [
      'la constancia',
      'no fallar ni un día',
      'la asistencia perfecta',
      'estar siempre',
      'la regularidad',
      'fichar a diario',
    ],
    phrases: [
      '{name} escribió en {activeDays|num} días distintos. Asistencia casi perfecta.',
      '{activeDays|num} días con mensajes. {name} no falla.',
      'Llueva o truene, {name} aparece.',
      'Si pasasen lista, {name} tendría matrícula.',
    ],
    stat: { label: 'Días activos', value: '{activeDays|num}' },
  },
  paparazzi: {
    label: 'Paparazzi',
    cores: [
      'las fotos',
      'el «mirad»',
      'el carrete',
      'documentarlo todo',
      'la galería',
      'las pruebas gráficas',
    ],
    phrases: [
      '{name} compartió {media|num} fotos, vídeos y demás. Todo queda documentado.',
      '{media|num} archivos de {name}. Si no hay foto, no pasó.',
      '{name} es la memoria gráfica {del_chat}.',
      'Gracias a {name}, hay pruebas de todo.',
    ],
    stat: { label: 'Fotos, vídeos y demás', value: '{media|num}' },
  },
  classic: {
    label: 'Imprescindible',
    cores: [
      'estar ahí',
      'el equilibrio',
      'el término medio',
      'la buena compañía',
      'el sentido común',
      'aparecer cuando hace falta',
    ],
    phrases: [
      '{name} escribió {messages|num} {messages|plural:mensaje,mensajes}. Ni mucho ni poco: lo justo.',
      '{name} está cuando hace falta.',
      'Sin estridencias y sin faltar: así es {name}.',
      '{chat|cap} no sería igual sin {name}.',
    ],
    stat: { label: 'Mensajes', value: '{messages|num}' },
  },
};

/** Extra stats for the card. Two are picked among those that have data. */
export const CARD_STATS: readonly { label: string; value: string }[] = [
  { label: 'Mensajes', value: '{messages|num}' },
  { label: 'Emoji favorito', value: '{emoji}' },
  { label: 'Palabra estrella', value: '«{word}»' },
  { label: 'Risa oficial', value: '«{laugh}»' },
  { label: 'Suele contestar en', value: '{replyTime}' },
  { label: 'Habla más con', value: '{favorite}' },
  { label: 'Días activos', value: '{activeDays|num}' },
  { label: 'Peso en el chat', value: '{pct}%' },
];
