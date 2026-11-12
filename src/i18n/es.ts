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
    privacyDetail: 'Todo se calcula en tu navegador. No hay servidor ni subida de archivos.',
    consent: 'Úsalo con chats en los que todo el mundo esté de acuerdo en verlo.',
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
    shareCard: 'Compartir esta tarjeta',
    working: 'Preparando la imagen…',
    error: 'No se ha podido crear la imagen. Vuelve a intentarlo.',
    footer: 'Hecho con Wrappsapp · Los mensajes no salieron del dispositivo',
  },
  /** Small labels next to the figures inside the slides. */
  slides: {
    messages: 'mensajes',
    words: 'palabras',
    activeDays: 'días con mensajes',
    streakDays: 'días seguidos',
    longestSilence: 'Silencio más largo, roto por',
    conversationsStarted: 'conversaciones abiertas',
  },
  story: {
    close: 'Borrar y salir',
    pause: 'Pausar',
    resume: 'Reanudar',
    previous: 'Anterior',
    next: 'Siguiente',
    replay: 'Ver otra vez',
    mute: 'Silenciar la música',
    unmute: 'Activar la música',
    position: (current: number, total: number) => `Diapositiva ${current} de ${total}`,
    demo: 'Demo',
  },
} as const;

export type Strings = typeof es;
