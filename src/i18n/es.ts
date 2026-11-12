/** Todos los textos de la interfaz. Añadir `en.ts` con la misma forma para el inglés. */
export const es = {
  app: {
    name: 'Wrappsapp',
    tagline: 'El Wrapped de tu grupo',
    privacy: 'Tus mensajes no salen de tu dispositivo.',
    comingSoon: 'En construcción: el parser ya funciona, la fiesta llega pronto.',
    disclaimer: 'Wrappsapp no está afiliado a WhatsApp ni a Meta.',
  },
  errors: {
    empty: 'Este archivo está vacío. ¿Seguro que es la exportación del chat?',
    not_a_chat:
      'No hemos reconocido este archivo como un chat exportado. Exporta el chat desde la app (Más → Exportar chat → Sin archivos) y sube el .txt o el .zip.',
    no_messages: 'Hemos abierto el chat, pero no tiene mensajes de nadie. Prueba con otro.',
  },
} as const;

export type Strings = typeof es;
