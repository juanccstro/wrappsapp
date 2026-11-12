/**
 * Todos los textos de la interfaz. Añadir `en.ts` con la misma forma para el inglés.
 * La interfaz no lleva emojis (se ven distintos en cada dispositivo): iconos SVG, y pocos.
 */
export const es = {
  app: {
    name: 'Wrappsapp',
    tagline: 'El Wrapped de tu grupo',
    privacy: 'Tus mensajes no salen de tu dispositivo.',
    disclaimer: 'Wrappsapp no está afiliado a WhatsApp ni a Meta.',
  },
  landing: {
    kicker: 'Para grupos, parejas y familias',
    title: ['El Wrapped', 'de tu grupo'],
    intro:
      'Convierte la exportación de un chat en un resumen animado: quién escribe más, a qué hora, vuestras risas y un título para cada persona.',
    start: 'Haz tu Wrapped',
    demo: 'Ver demo',
    privacy: 'Privacidad',
    privacyDetail: 'Todo se calcula en tu navegador. No hay servidor ni subida de archivos.',
    consent: 'Úsalo con chats en los que todo el mundo esté de acuerdo en verlo.',
  },
  privacy: {
    title: 'Privacidad',
    summary:
      'Wrappsapp funciona entero en tu navegador. Tu chat no se sube, no se guarda y no lo ve nadie más que tú.',
    points: [
      {
        title: 'Tus mensajes no salen de tu dispositivo',
        text: 'No hay servidor. El archivo se lee y se analiza en tu navegador, y la web tiene bloqueado por configuración el envío de datos a otros sitios.',
      },
      {
        title: 'No se guarda nada del chat',
        text: 'El chat vive solo en memoria mientras ves el resumen. Al pulsar «Borrar y salir» o cerrar la pestaña, desaparece. Lo único que se recuerda es si tienes la música silenciada.',
      },
      {
        title: 'Sin cookies ni seguimiento',
        text: 'No hay cookies, cuentas ni analítica sobre lo que escribes. Las imágenes que compartes se crean en tu dispositivo y solo salen si tú las envías.',
      },
      {
        title: 'Los demás también cuentan',
        text: 'Un chat es de todas las personas que escriben en él. Úsalo con conversaciones en las que todo el mundo esté de acuerdo en verlo.',
      },
    ],
  },
  upload: {
    title: 'Sube tu chat',
    drop: 'Arrastra aquí el archivo',
    dropping: 'Suéltalo aquí',
    choose: 'Elegir archivo',
    formats: 'Sirve el .txt o el .zip de la exportación.',
    back: 'Volver',
    guideTitle: 'Cómo exportar un chat',
    platforms: { android: 'Android', ios: 'iPhone' },
    steps: {
      android: [
        'Abre el chat y toca los tres puntos de arriba a la derecha.',
        'Toca «Más» y después «Exportar chat».',
        'Elige «Sin archivos».',
        'Guarda el archivo o envíatelo, y súbelo aquí.',
      ],
      ios: [
        'Abre el chat y toca el nombre del grupo, arriba.',
        'Baja hasta el final y toca «Exportar chat».',
        'Elige «Sin archivos».',
        'Guarda el .zip en Archivos y súbelo aquí.',
      ],
    },
  },
  errors: {
    empty: 'Este archivo está vacío. ¿Seguro que es la exportación del chat?',
    not_a_chat:
      'No hemos reconocido este archivo como un chat exportado. Sigue los pasos de abajo y sube el .txt o el .zip que se genera.',
    no_messages: 'Hemos abierto el chat, pero no tiene mensajes de nadie. Prueba con otro.',
    bad_zip: 'No hemos podido abrir este .zip. Vuelve a exportar el chat y súbelo de nuevo.',
    zip_without_chat:
      'Este .zip no contiene ningún chat. Tiene que ser el que se genera al pulsar «Exportar chat».',
    no_chat_loaded: 'Primero hay que subir un chat.',
    unexpected: 'Algo ha fallado al leer el archivo. Vuelve a intentarlo.',
  },
  loading: {
    title: 'Preparando vuestro Wrapped',
    messages: [
      'Contando jajajas…',
      'Midiendo quién deja en visto…',
      'Buscando el día que ardió el chat…',
      'Pesando audios…',
      'Clasificando emojis…',
      'Calculando madrugadas…',
      'Afinando el jajómetro…',
      'Repartiendo títulos…',
    ],
  },
  period: {
    title: '¿Qué periodo quieres ver?',
    found: (people: string, messages: string) => `${people} personas · ${messages} mensajes`,
    options: {
      year: (year: number | undefined) => (year ? `Este año (${year})` : 'Este año'),
      last12: 'Últimos 12 meses',
      all: 'Desde siempre',
    },
    messages: (n: string) => `${n} mensajes`,
    start: 'Empezar',
    discard: 'Borrar y salir',
  },
  share: {
    share: 'Compartir',
    download: 'Descargar imagen',
    downloadShort: 'Descargar',
    /** Share button of a person card: «Compartir» + this. */
    shareCardRest: ' esta tarjeta',
    working: 'Preparando la imagen…',
    error: 'No se ha podido crear la imagen. Vuelve a intentarlo.',
    footer: 'Hecho con Wrappsapp · Los mensajes no salieron del dispositivo',
  },
  report: {
    title: 'Todos los datos',
    back: 'Volver al resumen',
    totals: { emojis: 'emojis', media: 'archivos', links: 'enlaces' },
    overTime: 'Actividad mes a mes',
    overTimeHint: 'Mensajes enviados cada mes.',
    weekdaysTitle: 'Días de la semana',
    weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    hours: 'Mapa de horas',
    hoursHint: 'Cada fila es un día de la semana; cuanto más brilla la casilla, más mensajes.',
    ranking: 'Ranking completo',
    people: 'Persona a persona',
    words: 'Palabras más usadas',
    emojis: 'Emojis más usados',
    person: {
      words: 'Palabras',
      avgWords: 'Palabras por mensaje',
      reply: 'Suele contestar en',
      night: 'Mensajes de madrugada',
      started: 'Conversaciones abiertas',
      laughs: 'Risas',
      questions: 'Preguntas',
      emoji: 'Emoji favorito',
      word: 'Palabra estrella',
      laugh: 'Risa oficial',
      favorite: 'Habla más con',
      audios: 'Audios',
      images: 'Fotos',
    },
    records: {
      title: 'Récords',
      busiestDay: 'Día con más mensajes',
      streak: 'Racha más larga',
      silence: 'Silencio más largo',
      brokenBy: (name: string) => `lo rompió ${name}`,
      by: (name: string) => `de ${name}`,
      laugh: 'Risa más larga',
      letters: 'letras',
      peakHour: 'Hora punta',
    },
  },
  /** Small labels next to the figures inside the slides. */
  slides: {
    messages: 'mensajes',
    words: 'palabras',
    activeDays: 'días con mensajes',
    streakDays: 'días seguidos',
    longestSilence: 'Silencio más largo',
    brokenBy: (name: string) => `Lo rompió ${name}`,
    conversationsStarted: 'conversaciones abiertas',
    previousCard: 'Tarjeta anterior',
    nextCard: 'Tarjeta siguiente',
    cardOf: (current: number, total: number) => `Tarjeta ${current} de ${total}`,
  },
  story: {
    close: 'Borrar y salir',
    pause: 'Pausar',
    resume: 'Reanudar',
    previous: 'Anterior',
    next: 'Siguiente',
    replay: 'Ver otra vez',
    report: 'Ver todos los datos',
    mute: 'Silenciar la música',
    unmute: 'Activar la música',
    position: (current: number, total: number) => `Diapositiva ${current} de ${total}`,
    demo: 'Demo',
  },
} as const;

export type Strings = typeof es;
