import type { Variant } from '../engine';

export type VibeId =
  | 'duo'
  | 'radio'
  | 'madrugada'
  | 'memes'
  | 'risas'
  | 'debate'
  | 'rayo'
  | 'caos'
  | 'pocos'
  | 'familia';

export const VIBE_SLOTS = [
  'n',
  'days',
  'perDay',
  'nightPct',
  'mediaPct',
  'everyLabel',
  'laughs',
  'audios',
  'avgWords',
  'replyTime',
] as const;

/** Personality of the chat: a few names and descriptions each; the seed picks. */
export const VIBES: Record<VibeId, { names: readonly string[]; descriptions: readonly Variant[] }> =
  {
    caos: {
      names: ['Caos Organizado', 'Desorden con Encanto', 'Jaula de Grillos (de los Buenos)'],
      descriptions: [
        '{perDay|num} mensajes por día activo y todo el mundo opinando. Funciona, nadie sabe cómo.',
        'Aquí se habla de todo a la vez y, aun así, os entendéis.',
        'Mucho ruido y mucho cariño. No cambiéis.',
        'Si alguien se va diez minutos, vuelve con 80 mensajes sin leer.',
        'No hay orden del día, pero siempre hay tema.',
      ],
    },
    madrugada: {
      names: ['Club de la Madrugada', 'Turno de Noche', 'Sociedad del Insomnio'],
      descriptions: [
        'Un {nightPct}% de los mensajes llega entre las 00:00 y las 06:00. El sueño puede esperar.',
        'Lo mejor de este chat pasa cuando deberíais estar durmiendo.',
        'De día, calma. De noche, todo.',
        'Vuestras mejores conversaciones tienen ojeras.',
        'Hay chats de mañana y chats de noche. No hay dudas de cuál es este.',
      ],
    },
    memes: {
      names: ['Comité de Memes', 'Galería de Arte Moderno', 'Museo del Sticker'],
      descriptions: [
        'Un {mediaPct}% de lo que mandáis no lleva ni una letra. Y se entiende todo.',
        'Aquí una imagen vale más que mil palabras, y vais sobrados de imágenes.',
        'Habláis en fotos, stickers y vídeos. Idioma propio.',
        'Menos texto y más material gráfico: así se comunica este chat.',
        'Si hubiera que archivar este chat, haría falta un museo.',
      ],
    },
    familia: {
      names: ['Familia Funcional', 'Equipo Bien Avenido', 'Mesa Camilla'],
      descriptions: [
        'Todo el mundo participa y nadie acapara. Rarísimo. Precioso.',
        'Aquí hay sitio para cada cual, y se nota en los números.',
        'Reparto equilibrado, buen tono y ganas de hablar. Así da gusto.',
        'Ni protagonistas ni figurantes: un reparto coral.',
        'Un chat donde todo el mundo cuenta. Literalmente: lo hemos contado.',
      ],
    },
    risas: {
      names: ['Club de la Comedia', 'Fábrica de Jajajas', 'Risas Garantizadas'],
      descriptions: [
        'Una risa cada {everyLabel}. Esto es salud.',
        'Habéis escrito {laughs|num} risas. El resto es relleno.',
        'Aquí se viene a reír, y se cumple.',
        'Hay monólogos de humor con menos carcajadas.',
        'Si la risa alarga la vida, tenéis para rato.',
      ],
    },
    radio: {
      names: ['Radio Patio', 'Emisora Pirata', 'Podcast Coral'],
      descriptions: [
        '{audios|num} audios. Este chat se escucha más que se lee.',
        'Aquí el teclado es decorativo: {audios|num} notas de voz.',
        'Vuestro chat tiene más horas de audio que algunas radios.',
        'Si esto fuese un podcast, ya tendríais patrocinador.',
        'Hablar, hablar y hablar. Escribir, ya si eso.',
      ],
    },
    debate: {
      names: ['Tertulia Sin Fin', 'Debate Eterno', 'Ateneo de Barrio'],
      descriptions: [
        '{avgWords} palabras por mensaje de media. Aquí se argumenta.',
        'Mensajes largos, opiniones firmes y ninguna conclusión. Perfecto.',
        'En este chat nadie contesta con un «ok».',
        'Cada tema da para un ensayo, y lo escribís.',
        'Aquí se viene con los deberes hechos y ganas de explayarse.',
      ],
    },
    rayo: {
      names: ['Línea Directa', 'Respuesta Inmediata', 'Conexión Permanente'],
      descriptions: [
        'Lo normal aquí es contestar en {replyTime}. ¿Trabajáis en algún momento?',
        'Mensaje enviado, mensaje contestado. Así, siempre.',
        'Este chat no conoce el «luego te digo».',
        'Nadie deja a nadie esperando. Qué lujo.',
        'Aquí el doble check dura lo que un suspiro.',
      ],
    },
    pocos: {
      names: ['Pocos pero Buenos', 'Calidad sobre Cantidad', 'Sesión Tranquila'],
      descriptions: [
        'No escribís cada día, pero cuando escribís, importa.',
        '{n|num} mensajes sin prisa ni ruido. Un chat que respeta el silencio.',
        'Aquí no hay spam: hay mensajes con motivo.',
        'Un chat tranquilo, de los que no agobian. Tesoro.',
        'Menos notificaciones, más sustancia.',
      ],
    },
    duo: {
      names: ['Dúo Dinámico', 'Equipo de Dos', 'Línea Privada'],
      descriptions: [
        'Dos personas y {n|num} mensajes. No hace falta más gente.',
        'Lo vuestro es un diálogo continuo: {days|num} días con mensajes.',
        'Entre vosotros dos hay más conversación que en muchos grupos de veinte.',
        'Un chat de dos que no baja el ritmo.',
        'Vosotros dos, a lo vuestro. Y qué bien.',
      ],
    },
  };
