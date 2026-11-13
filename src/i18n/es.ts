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
    terms: 'Condiciones',
    privacyDetail: 'Todo se calcula en tu navegador. El archivo nunca se sube a ningún servidor.',
    consent: 'Úsalo con chats en los que todo el mundo esté de acuerdo en verlo.',
  },
  privacy: {
    title: 'Privacidad',
    summary:
      'Tu chat se lee y se analiza en tu navegador: no se sube, no se guarda y no lo ve nadie más que tú. Para el límite de Wrapped gratis y las compras, el servidor guarda lo mínimo, y nunca el contenido.',
    points: [
      {
        title: 'Tus mensajes no salen de tu dispositivo',
        text: 'El archivo se lee en tu navegador y la web tiene bloqueado por configuración el envío de datos a otros sitios. El chat vive en memoria y desaparece al pulsar «Borrar y salir» o cerrar la pestaña.',
      },
      {
        title: 'Qué se guarda para el límite gratis',
        text: 'Para contar tus 2 Wrapped gratis se guarda un identificador de este dispositivo (en una cookie técnica y en el almacenamiento del navegador) y, para reconocerlo si borras esos datos, una huella cifrada del dispositivo combinada con tu red. De cada chat solo se guarda una huella cifrada que sirve para no cobrarte dos veces el mismo y de la que no se puede reconstruir nada. Se usa solo para esto y se borra a los 2 años sin uso.',
      },
      {
        title: 'Pagos',
        text: 'Pagas en la página de Stripe y la venta se hace a través de Link, el servicio de pagos de Stripe, que actúa como vendedor: Wrappsapp nunca ve tu tarjeta ni tus datos bancarios. De tu compra se guarda el producto y una huella cifrada de tu email, para que puedas recuperarla en otro dispositivo con tu código. Stripe y Link tratan tus datos según su propia política de privacidad.',
      },
      {
        title: 'Sin publicidad ni seguimiento',
        text: 'No hay anuncios, analítica sobre lo que escribes ni cookies de terceros. Las imágenes que compartes se crean en tu dispositivo y solo salen si tú las envías.',
      },
      {
        title: 'Tus derechos',
        text: 'Puedes pedir el acceso o el borrado de estos datos, o hacer cualquier consulta, escribiendo al contacto que aparece en Condiciones.',
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
  billing: {
    badge: (used: number, limit: number) => `${used} de ${limit} usados`,
    badgeUnlimited: 'Ilimitado',
    badgeLabel: 'Wrapped usados en este dispositivo. Toca para ver opciones.',
    limitTitle: 'Has agotado tus Wrapped gratis',
    limitText: (limit: number) =>
      `Ya has creado ${limit} Wrapped en este dispositivo. Elige cómo seguir: los chats que ya hiciste se pueden volver a ver sin gastar nada.`,
    moreTitle: 'Más Wrapped',
    moreText: 'Elige cómo seguir creando Wrapped de tus chats.',
    plans: {
      pack3: { title: 'Pack de 3', detail: '3 Wrapped más', price: '1,99 €' },
      unlimited: {
        title: 'Ilimitado',
        detail: 'Para siempre, sin límites',
        price: '4,99 €',
        badge: 'Mejor opción',
      },
    },
    oneTime: 'Pago único. IVA incluido. Sin suscripción.',
    consent:
      'Acepto las condiciones y pido que el acceso empiece ya. Sé que, al ser contenido digital, una vez empezado pierdo el derecho de desistimiento.',
    pay: (price: string) => `Ir al pago seguro · ${price}`,
    redirecting: 'Abriendo la página de pago…',
    secure: 'Pago seguro con Stripe',
    secureDetail:
      'Pagas en la página de Stripe, la plataforma de pagos que usan millones de tiendas, y la venta se hace a través de Link (Stripe), que te envía el recibo. Wrappsapp nunca ve tu tarjeta ni tus datos bancarios.',
    methods: 'Tarjeta · Apple Pay · Google Pay · Link',
    restoreLink: '¿Ya pagaste? Recupera tu compra',
    termsLink: 'Condiciones',
    close: 'Cerrar',
    back: 'Volver',
    restoreTitle: 'Recupera tu compra',
    restoreText:
      'Escribe el email con el que pagaste y el código de recuperación que te mostramos al terminar el pago.',
    email: 'Email',
    code: 'Código de recuperación',
    codePlaceholder: 'XXXX-XXXX-XXXX',
    restore: 'Recuperar',
    restored: 'Compra recuperada en este dispositivo.',
    restoreOutcome: {
      restored: 'Compra recuperada en este dispositivo.',
      already_active:
        'Esta compra ya estaba activa en este dispositivo. No tienes que hacer nada más.',
      refund_pending:
        'Esta compra está en proceso de reembolso, así que ya no está activa. Si es un error, escríbenos al contacto de Condiciones.',
      refunded: 'Esta compra se reembolsó, así que ya no está activa.',
    },
    successTitle: {
      pack3: 'Tienes 3 Wrapped más',
      unlimited: 'Wrapped ilimitados',
    },
    successText:
      'Pago completado. Vuelve a subir tu chat cuando quieras: ya está desbloqueado en este dispositivo.',
    codeTitle: 'Tu código de recuperación',
    codeText:
      'Guárdalo o haz una captura: con él y tu email recuperas la compra en otro dispositivo o si borras los datos del navegador.',
    copy: 'Copiar',
    copied: 'Copiado',
    continue: 'Seguir',
    pendingTitle: 'Estamos confirmando tu pago',
    pendingText:
      'Algunos métodos de pago tardan unos minutos. En cuanto se confirme, tendrás tu compra en este dispositivo. Si no aparece, escríbenos al contacto de Condiciones con el email del pago.',
    cancelTitle: 'No se ha completado el pago',
    cancelText: 'No se te ha cobrado nada. Puedes intentarlo otra vez cuando quieras.',
    errors: {
      offline: 'No hay conexión. Comprueba tu internet y vuelve a intentarlo.',
      payments_unavailable: 'Los pagos no están disponibles ahora mismo. Inténtalo más tarde.',
      too_many_requests: 'Demasiados intentos seguidos. Espera un rato y vuelve a probar.',
      not_found: 'No encontramos una compra con ese email y ese código. Revisa los dos.',
      bad_request: 'Revisa el email y el código.',
      server_error: 'Algo ha fallado. Vuelve a intentarlo en un momento.',
      check:
        'No hemos podido comprobar tus Wrapped disponibles. Revisa tu conexión y vuelve a pulsar «Empezar».',
    } as Record<string, string>,
  },
  terms: {
    title: 'Condiciones',
    updated: (date: string) => `Última actualización: ${date}`,
    sections: [
      {
        title: 'Quién vende',
        text: (owner: string, location: string, email: string) =>
          `Wrappsapp es un servicio de ${owner} (${location}). Las compras se venden a través de Link (Stripe), que actúa como vendedor. Contacto: ${email}.`,
      },
    ],
    items: [
      {
        title: 'Qué es Wrappsapp',
        text: 'Una web que convierte la exportación de un chat en un resumen animado. El análisis se hace en tu navegador; el chat no se envía a ningún servidor.',
      },
      {
        title: 'Uso gratuito',
        text: 'Cada dispositivo puede crear 2 Wrapped de chats distintos gratis. Volver a ver un chat que ya hiciste, o cambiar su periodo, no cuenta. La demo es siempre gratis.',
      },
      {
        title: 'Compras',
        text: 'Pack de 3 Wrapped: 1,99 €. Acceso ilimitado para siempre: 4,99 €. Precios finales con IVA incluido. Son pagos únicos, sin suscripción ni renovaciones. El pago se hace en la página de Stripe y la venta se realiza a través de Link (Stripe), que actúa como vendedor, gestiona el IVA y te envía el recibo por email.',
      },
      {
        title: 'Entrega y recuperación',
        text: 'La compra se activa al momento en el dispositivo donde pagas. Al terminar el pago te mostramos un código de recuperación: con él y tu email puedes activarla en otros dispositivos.',
      },
      {
        title: 'Derecho de desistimiento',
        text: 'Al ser contenido digital que se entrega al momento, antes de pagar se te pide que aceptes que el acceso empiece ya y que, una vez empezado, pierdes el derecho de desistimiento de 14 días (art. 103.m de la Ley General para la Defensa de los Consumidores y Usuarios).',
      },
      {
        title: 'Si algo falla',
        text: 'Si pagas y la compra no se activa, o la web no funciona con tu chat, escríbenos al contacto de arriba: lo solucionamos o te devolvemos el dinero.',
      },
      {
        title: 'Uso responsable',
        text: 'Usa Wrappsapp solo con chats en los que tengas derecho a hacerlo y en los que el resto de personas estén de acuerdo. Wrappsapp no está afiliado a WhatsApp ni a Meta.',
      },
      {
        title: 'Ley aplicable',
        text: 'Estas condiciones se rigen por la ley española. Como consumidor, conservas los derechos que te reconoce la normativa de tu lugar de residencia.',
      },
    ],
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
