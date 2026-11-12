import { definePool, num, type Variant } from '../engine';

/**
 * Texts of the slides. Written so they never assume anyone's gender. Emojis are welcome here
 * (this is Wrapped content, not interface).
 *
 * Slots available in every pool: {chat} ("el grupo" / "vuestro chat"), {del_chat},
 * {period} ("2026", "los últimos 12 meses", "toda vuestra historia").
 */
export const COMMON_SLOTS = ['chat', 'del_chat', 'period'] as const;

export const intro = definePool({
  slots: ['group', 'people', 'year'],
  titles: [
    'Wrappsapp {year}',
    'Vuestro Wrappsapp {year}',
    '{year}, en mensajes',
    'Esto ha sido {year}',
    '{group}: {year}',
    'Wrappsapp de {group}',
    '{group}, esto es lo vuestro',
    'Vuestro Wrappsapp',
    'Vuestro chat, en datos',
    'Os damos la bienvenida a vuestro Wrappsapp',
  ],
  bodies: [
    'Todo lo que ha pasado en {chat}, contado con números y sin filtros.',
    'Poneos cómodos: vamos a repasar lo que habéis escrito.',
    'Mensajes, risas, madrugadas y algún que otro audio. Empezamos.',
    'Hemos contado cada mensaje {del_chat}. Sí, también ese.',
    '{people} personas, un chat y muchas cosas que contar.',
    'Subid el volumen. Esto es lo que habéis hecho con el pulgar.',
    'Lo que pasa en {chat} se queda en {chat}. Hasta hoy.',
    'Nadie ha leído vuestros mensajes. Solo los hemos contado. Vamos allá.',
  ],
});

export const total = definePool({
  slots: ['n', 'words', 'perDay', 'sheets', 'days', 'readHours'],
  titles: [
    '{n|num} mensajes',
    '{n|num} mensajes. Sí, los hemos contado',
    'Habéis enviado {n|num} mensajes',
    '{n|num} veces sonó el móvil',
    'Total: {n|num} mensajes',
    '{n|num} mensajes y subiendo',
    'Esto son {n|num} mensajes',
    '{n|num} mensajes, ni uno menos',
  ],
  bodies: [
    'Si los imprimiéramos, ocuparían {sheets|num} {sheets|plural:folio,folios}. Los árboles agradecen que no lo hagáis.',
    'Son {words|num} palabras. Hay novelas más cortas, y con menos drama.',
    'Sale a {perDay|num} {perDay|plural:mensaje,mensajes} por cada día con actividad. El pulgar, en forma.',
    '{words|num} palabras en {days|num} {days|plural:día,días} de charla. Y eso que alguien dijo que no tenía tiempo.',
    'Repartidos en {days|num} {days|plural:día,días} con mensajes. Los otros días se os echó de menos.',
    'A {perDay|num} por día activo. Si cobraseis por mensaje, esto sería otro tema.',
    'Para leerlo todo del tirón harían falta unas {readHours|num} {readHours|plural:hora,horas}. Mejor el resumen, ¿no?',
    '{sheets|num} {sheets|plural:folio,folios} si alguien se atreviese a imprimirlo. Que nadie se atreva.',
  ],
});

export const busiestDay = definePool({
  slots: ['date', 'weekday', 'n', 'kw1', 'kwList'],
  titles: [
    'El día que {chat} ardió',
    '{date}: día histórico',
    'El {date} pasó algo',
    '{n|num} mensajes en un solo día',
    'El {weekday} que se os fue de las manos',
    '{date}, para el recuerdo',
    'Récord absoluto: {date}',
    'Aquel {weekday} de {n|num} mensajes',
  ],
  bodies: [
    'El {date} cayeron {n|num} mensajes. Algo gordo pasó.',
    '{n|num} mensajes el {date}. Se habló de: {kwList}.',
    'Aquel {weekday} nadie trabajó, nadie estudió y nadie descansó. {n|num} mensajes.',
    'Palabras del día: {kwList}. Con eso ya os acordáis, ¿verdad?',
    'El {date} los móviles pidieron clemencia: {n|num} mensajes.',
    'Si buscáis «{kw1}» en el chat, preparad palomitas. Fue el {date}.',
    '{n|num} mensajes en 24 horas. El {date} no se silenció nadie.',
    'Todo empezó con «{kw1}» y acabó con {n|num} mensajes.',
  ],
});

export const clock = definePool({
  slots: ['peak', 'wake', 'dayName', 'nightPct'],
  titles: [
    'El reloj {del_chat}',
    'Vuestra hora punta: las {peak}',
    'A las {peak} pasa todo',
    'Así es un día cualquiera',
    'Las {peak}, hora sagrada',
    'Horario oficial {del_chat}',
    '24 horas con vosotros',
    'Cuándo habláis de verdad',
  ],
  bodies: [
    'La hora punta son las {peak}. A esa hora, mejor no esperar respuesta de nadie más.',
    '{chat|cap} se despierta sobre las {wake} y lo da todo a las {peak}.',
    'El día fuerte es el {dayName}. El resto de la semana es calentamiento.',
    'A las {peak} es cuando más escribís. Casualidad no es.',
    'Primer movimiento sobre las {wake}. Pico de actividad a las {peak}. Un horario muy vuestro.',
    'Si alguien quiere atención, que escriba a las {peak} de un {dayName}.',
    {
      text: 'Un {nightPct}% de los mensajes llega de madrugada. Dormir está sobrevalorado.',
      when: (s) => num(s.nightPct) >= 5,
    },
    'Entre las {wake} y las {peak} se cuece todo. Fuera de ahí, calma tensa.',
    'Los {dayName} a las {peak}: ahí es donde hay que estar.',
  ],
});

export const emojis = definePool({
  slots: ['e1', 'e2', 'e3', 'n1', 'total'],
  titles: [
    'Lluvia de {e1}',
    'Vuestro emoji: {e1}',
    '{e1} lo dice todo',
    'El podio de emojis',
    '{n1|num} veces {e1}',
    'Idioma oficial: {e1}',
    'Sin {e1} no sois nadie',
    '{e1} {e2} {e3}',
  ],
  bodies: [
    '{e1} apareció {n1|num} veces. Es casi un miembro más.',
    'Podio: {e1}, {e2} y {e3}. El resto de emojis, de figurantes.',
    'En total, {total|num} emojis. Hay conversaciones enteras sin una sola letra.',
    'Si {chat} fuese un emoji, sería {e1}. No hay debate.',
    '{e1} lidera con {n1|num} apariciones. {e2} le pisa los talones.',
    'Usasteis {total|num} emojis. {e1} se llevó la mayor parte del trabajo.',
    'Medalla de oro para {e1}, plata para {e2} y bronce para {e3}.',
    '{n1|num} veces {e1}. Si eso no es una seña de identidad, que baje alguien y lo vea.',
  ],
});

export const words = definePool({
  slots: ['w1', 'w2', 'w3', 'n1', 'bigram'],
  titles: [
    'Vuestras palabras',
    'Diccionario {del_chat}',
    '«{w1}», «{w2}», «{w3}»',
    'La palabra estrella: «{w1}»',
    'Así habláis',
    'Vocabulario oficial',
    'Lo que más se dice aquí',
    'En pocas palabras',
  ],
  bodies: [
    '«{w1}» se dijo {n1|num} veces. Y las que quedan.',
    'Las tres que más repetís: «{w1}», «{w2}» y «{w3}».',
    'Si hubiera que resumiros en una palabra: «{w1}».',
    '«{w1}» va primera con {n1|num} menciones. «{w2}» y «{w3}» completan el podio.',
    'Y vuestra pareja de palabras favorita: «{bigram}».',
    'Quitando los «jajaja» y los «vale», lo que queda es «{w1}».',
    'Un chat se conoce por sus palabras. El vuestro: «{w1}», «{w2}», «{w3}».',
    '«{bigram}»: lo habéis escrito tantas veces que ya sale solo en el teclado.',
  ],
});

export const laughs = definePool({
  slots: ['n', 'longest', 'len', 'who', 'everyLabel'],
  titles: [
    'Jajómetro',
    'Jajómetro: {n|num}',
    '{n|num} risas',
    'Aquí se viene a reír',
    'Nivel de risa: alto',
    '{n|num} jajajas después',
    'Risas contadas una a una',
    'El medidor de risas',
  ],
  bodies: [
    '{n|num} risas entre jajas, jejes y calaveras. No está nada mal.',
    'La risa más larga la escribió {who}: «{longest}». {len} letras.',
    '{who} se dejó el dedo en el teclado: {len} letras de risa seguidas.',
    'Hay una risa cada {everyLabel}. Envidiable.',
    '{n|num} veces os habéis reído por escrito. En persona, seguro que más.',
    'Récord de risa: «{longest}», obra de {who}.',
    'Entre todos sumáis {n|num} risas. Esto, en el fondo, es un club de comedia.',
    '«{longest}». Así, sin respirar. Gracias, {who}.',
  ],
});

export const race = definePool({
  slots: ['leader', 'leaderN', 'second', 'months', 'bestMonth', 'diff'],
  titles: [
    'La carrera',
    'La gran carrera',
    '¿Quién escribe más?',
    'Mes a mes',
    'El ranking, en movimiento',
    'Carrera de mensajes',
    '{leader} en cabeza',
    'Que empiece la carrera',
  ],
  bodies: [
    '{leader} cruza la meta en cabeza con {leaderN|num} mensajes.',
    '{months} meses de carrera y un podio muy peleado.',
    {
      text: '{leader} gana, pero {second} no lo puso fácil: solo {diff|num} mensajes de diferencia.',
      when: (s) => num(s.diff) > 0 && num(s.diff) < num(s.leaderN) * 0.15,
    },
    'El mes más intenso fue {bestMonth}. Ahí se decidió todo.',
    '{leader} lidera con {leaderN|num}. {second} llega con la lengua fuera.',
    'En {bestMonth} se escribió más que nunca. ¿Qué pasó en {bestMonth}?',
    'Primer puesto para {leader}. El resto, a entrenar el pulgar.',
    '{leaderN|num} mensajes de {leader}. Eso es constancia.',
    'La carrera dura {months} meses. {leader} no levantó el pie.',
  ],
});

export const owls = definePool({
  slots: ['owl', 'pct', 'count'],
  titles: [
    'Los búhos',
    'Club de la madrugada',
    'Las 3 a. m. tienen nombre',
    'Quien no duerme, escribe',
    'Turno de noche',
    'Guardia nocturna',
    'Mientras el resto dormía',
    'Insomnio compartido',
  ],
  bodies: [
    '{owl} mandó {count|num} mensajes entre las 00:00 y las 06:00. Alguien tiene que vigilar.',
    'El {pct}% de lo que escribe {owl} llega de madrugada.',
    'A esas horas solo hay dos cosas despiertas: el frigorífico y {owl}.',
    '{owl} lidera el turno de noche con {count|num} mensajes.',
    'Cuando el resto duerme, {owl} sigue en línea. {count|num} veces, para ser exactos.',
    '{count|num} mensajes de madrugada con la firma de {owl}. Las ojeras, aparte.',
    'Nadie pidió un informe a las 3 a. m., pero {owl} lo entregó igualmente.',
    'De madrugada {chat} tiene quien lo cuide: {owl}.',
  ],
});

export const replySpeed = definePool({
  slots: ['fast', 'fastTime', 'slow', 'slowTime'],
  titles: [
    'Velocidad de respuesta',
    '¿Quién contesta antes?',
    'Reflejos de campeonato',
    'A la velocidad del pulgar',
    'Carrera de respuestas',
    'Respuesta exprés',
    'Tiempo de reacción',
    'Contestar es un deporte',
  ],
  bodies: [
    '{fast} suele contestar en {fastTime}. Ni tiempo a bloquear el móvil.',
    'Lo normal en {fast}: {fastTime}. Eso es tener el chat abierto.',
    '{fast} responde en {fastTime}. {slow} se toma {slowTime}: las prisas no son buenas.',
    '{slow} contesta en {slowTime}. No es tardar, es crear expectación.',
    'Medalla a los reflejos para {fast}: {fastTime}.',
    'Si necesitáis una respuesta ya, escribid a {fast}.',
    '{fastTime}. Eso tarda {fast} en contestar. Hay semáforos más lentos.',
    '{fast} contesta antes de que termines de escribir. Casi.',
  ],
});

export const graph = definePool({
  slots: ['a', 'b', 'n'],
  titles: [
    'Quién habla con quién',
    'El mapa {del_chat}',
    'Conexiones',
    'La pareja más conectada',
    '{a} y {b}',
    'Hilos invisibles',
    'Así os contestáis',
    'Red de respuestas',
  ],
  bodies: [
    '{a} y {b} se han contestado {n|num} veces. Lo suyo es un chat dentro del chat.',
    'La conexión más fuerte: {a} y {b}.',
    '{a} escribe, {b} responde. {b} escribe, {a} responde. Así {n|num} veces.',
    'Si {a} y {b} montasen un chat aparte, no se notaría la diferencia.',
    '{n|num} respuestas cruzadas entre {a} y {b}. El resto mira y aprende.',
    'Cada línea es una respuesta. La más gruesa une a {a} y {b}.',
    'Dúo destacado: {a} y {b}, con {n|num} respuestas mutuas.',
    '{a} y {b}: {n|num} idas y venidas. Química de la buena.',
  ],
});

export const starterVsMystery = definePool({
  slots: ['starter', 'starts', 'mystery', 'mysteryN'],
  titles: [
    'Quien empieza y quien observa',
    'La chispa y el misterio',
    '{starter} abre, {mystery} observa',
    'Dos formas de estar',
    'Arranque y sigilo',
    'Quien rompe el hielo',
    'El motor y el enigma',
    'Empezar o aparecer',
  ],
  bodies: [
    '{starter} empezó {starts|num} conversaciones. Sin {starter}, esto sería un grupo de avisos.',
    '{mystery} escribió {mysteryN|num} {mysteryN|plural:mensaje,mensajes}. Pocos, pero elegidos con cuidado.',
    '{starter} rompe el silencio; {mystery} lo respeta. Equilibrio perfecto.',
    '{starts|num} veces dijo algo {starter} cuando nadie decía nada.',
    '{mystery} lo lee todo y habla cuando toca. Presencia discreta, que también hace falta.',
    'Si hay conversación, seguramente la abrió {starter}.',
    '{mystery}: {mysteryN|num} {mysteryN|plural:mensaje,mensajes}, y cada uno, un acontecimiento.',
    '{starter} pone el tema; {mystery}, el misterio.',
  ],
});

export const streakSilence = definePool({
  slots: ['streak', 'streakStart', 'silence', 'breaker', 'breakText'],
  titles: [
    '{streak|num} días seguidos hablando',
    'Racha y silencio',
    '{streak|num} días sin parar',
    'La racha más larga',
    'Ni un día de descanso',
    'Del ruido al silencio',
    'Récord de constancia',
    'Cuando no callabais (y cuando sí)',
  ],
  bodies: [
    '{streak|num} días seguidos con mensajes, desde el {streakStart}. Constancia olímpica.',
    'Vuestro silencio más largo duró {silence}. Lo rompió {breaker}.',
    'Tras {silence} sin una palabra, {breaker} escribió: «{breakText}».',
    '{streak|num} días sin fallar ni uno. Hay gimnasios con menos asistencia.',
    'El récord de silencio: {silence}. Luego llegó {breaker} y todo volvió a su sitio.',
    'Racha más larga: {streak|num} días. Silencio más largo: {silence}.',
    '{breaker} tiene el honor de haber roto el silencio más largo: {silence}.',
    '{silence} en silencio y luego, como si nada. Así sois.',
  ],
});

/** Optional slides: one person stands out in something. */
export const podcast = definePool({
  slots: ['who', 'n', 'minutes'],
  titles: [
    'Radio {who}',
    'El podcast que nadie pidió',
    '{n|num} audios',
    'En antena: {who}',
    'Notas de voz, temporada completa',
  ],
  bodies: [
    '{who} mandó {n|num} audios. Eso son unos {minutes|num} minutos de podcast que nadie pidió (pero todos escuchamos).',
    'Calculando a ojo, {minutes|num} minutos de {who} en vuestros oídos.',
    '{n|num} audios de {who}. A velocidad 1,5 se sobrelleva.',
    'Si {who} cobrase por minuto de audio, ya habría invitado a cenar.',
    '{who}: {n|num} notas de voz. Escribir está sobrevalorado.',
    'Unos {minutes|num} minutos de audio (estimación de bar, no de laboratorio). Voz principal: {who}.',
    'Hay series con menos metraje que los audios de {who}.',
    '{n|num} veces pulsó {who} el micrófono. Y qué bien se explica.',
  ],
});

export const images = definePool({
  slots: ['who', 'n', 'total', 'reactor'],
  titles: [
    'Reportaje gráfico',
    '{n|num} fotos de {who}',
    'Si no hay foto, no pasó',
    'El carrete de {who}',
    'Fotos que dieron que hablar',
  ],
  bodies: [
    '{who} mandó {n|num} fotos. Todo queda documentado.',
    'De las {total|num} fotos del chat, {n|num} son de {who}.',
    '{n|num} fotos de {who}. Y cada una, con su ronda de comentarios.',
    'Nadie dispara tanto como {who}: {n|num} fotos.',
    '{who} manda la foto y {reactor} pone la risa. Equipo perfecto.',
    'Las mejores reacciones del chat llegaron justo después de una foto de {who}.',
    '{n|num} veces dijo {who} «mirad esto» sin decir nada.',
    'El álbum del chat lo firma {who}: {n|num} fotos.',
  ],
});

export const shouts = definePool({
  slots: ['who', 'n'],
  titles: [
    'VOLUMEN AL MÁXIMO',
    '{who|upper} NO GRITA, ENFATIZA',
    'Mayúsculas a tope',
    '{n|num} MENSAJES EN MAYÚSCULAS',
    'Bloq Mayús, modo de vida',
  ],
  bodies: [
    '{who} escribió {n|num} mensajes ENTEROS EN MAYÚSCULAS. Se oyen desde aquí.',
    '{n|num} veces subió el volumen {who}. Con cariño, pero subió.',
    'No es gritar, es entusiasmo. {who}: {n|num} mensajes en mayúsculas.',
    'El teclado de {who} tiene el Bloq Mayús en nómina.',
    'CUANDO {who|upper} ESCRIBE ASÍ, SE NOTA. {n|num} veces.',
    '{who} lidera en mayúsculas con {n|num} mensajes. Pasión no falta.',
    'Hay énfasis y luego está {who}: {n|num} mensajes a todo volumen.',
    '{n|num} mensajes en mayúsculas de {who}. Nadie se quedó sin enterarse.',
  ],
});

export const deleted = definePool({
  slots: ['who', 'n', 'total'],
  titles: [
    'Se eliminó este mensaje',
    'Mensajes que ya no están',
    '{total|num} mensajes borrados',
    'Nunca sabremos qué ponía',
    'Borrar también es un arte',
  ],
  bodies: [
    '{who} borró {n|num} mensajes. Nunca sabremos qué decían, y quizá sea mejor.',
    '{total|num} mensajes eliminados en total. El misterio continúa.',
    '{n|num} veces se lo pensó mejor {who}. Prudencia ante todo.',
    '«Se eliminó este mensaje», versión {who}: {n|num} entregas.',
    '{who} escribe, envía, recapacita y borra. {n|num} veces.',
    'Entre todos habéis borrado {total|num} mensajes. Alguno se llegó a leer.',
    '{n|num} mensajes de {who} que solo vieron los más rápidos.',
    'Lo que {who} borró ({n|num} mensajes) se queda entre {who} y su conciencia.',
  ],
});

export const questions = definePool({
  slots: ['who', 'n'],
  titles: [
    '¿Y eso?',
    'Preguntas, preguntas',
    '{who} quiere saber',
    '{n|num} preguntas',
    'La curiosidad manda',
  ],
  bodies: [
    '{who} hizo {n|num} preguntas. Alguna hasta tuvo respuesta.',
    '{n|num} mensajes con interrogación de {who}. La curiosidad mueve {chat}.',
    'Si hay una duda en el aire, la escribe {who}. {n|num} veces.',
    '{who} pregunta lo que todos pensáis. {n|num} veces.',
    '¿Quién? ¿Cuándo? ¿Dónde? {who} lo ha preguntado todo: {n|num} veces.',
    '{n|num} preguntas de {who}. Sin ellas, la mitad de los planes no habrían salido.',
    'El signo de interrogación de {who} pide vacaciones: {n|num} usos.',
    '{who} lidera en preguntas con {n|num}. Preguntar es de sabios.',
  ],
});

export const monologue = definePool({
  slots: ['who', 'n'],
  titles: [
    'El monólogo',
    '{n} mensajes seguidos',
    'Solo de {who}',
    'Sin pausa para respirar',
    'Función en solitario',
  ],
  bodies: [
    '{who} encadenó {n} mensajes seguidos sin que nadie dijera nada. Función completa.',
    '{n} mensajes del tirón. {who} tenía cosas que contar.',
    'Hay hilos de {who} que merecen índice: {n} mensajes sin interrupción.',
    '{who} escribió {n} mensajes seguidos. El resto, palomitas.',
    'Récord de monólogo: {n} mensajes de {who} sin respuesta de por medio.',
    'Cuando {who} arranca, arranca: {n} mensajes consecutivos.',
    '{n} mensajes seguidos de {who}. Y ni un punto y aparte.',
    '{who} no necesitó público para {n} mensajes. Aunque lo tenía.',
  ],
});

export const subject = definePool({
  slots: ['n'],
  titles: [
    'Crisis de identidad',
    '{n} cambios de nombre',
    'El nombre del grupo',
    'Rebautizos',
    '¿Cómo nos llamábamos?',
  ],
  bodies: [
    'El nombre del grupo cambió {n} veces. Ninguno era el definitivo.',
    '{n} cambios de nombre. El grupo sigue buscándose a sí mismo.',
    'Habéis rebautizado el grupo {n} veces. Los bancos cambian menos de logo.',
    '{n} nombres después, aquí seguís. Lo importante es el interior.',
    'Cada cambio de nombre tiene una historia. Hay {n}.',
    'El grupo ha tenido {n} cambios de nombre. Normal perderse.',
    '{n} veces alguien pensó: «este nombre ya no nos representa».',
    'Cambiar el nombre del grupo: {n} veces. Deporte no olímpico, de momento.',
  ],
});

export const people = definePool({
  slots: ['people'],
  titles: [
    'El desfile',
    'Con todos vosotros…',
    'Quién es quién',
    'Vuestras cartas',
    'El elenco',
    'Pasen y vean',
    'Tarjetas de identidad',
    'Cada cual con lo suyo',
  ],
  bodies: [
    'Cada persona {del_chat}, con su título oficial.',
    '{people} personas, {people} formas de estar en un chat.',
    'Hemos estudiado vuestros mensajes y esto es lo que sois. Con cariño.',
    'Nadie se libra: hay carta para cada cual.',
    'Títulos concedidos con rigor estadístico y cero seriedad.',
    'Lo dicen los datos, no nosotros.',
    'Coleccionadlas todas.',
    'Un título por persona. Las reclamaciones, al grupo.',
  ],
});

export const vibe = definePool({
  slots: ['vibe'],
  titles: [
    'La vibra {del_chat}',
    'Y entonces, ¿qué sois?',
    'Vuestra personalidad',
    'El diagnóstico',
    'Si {chat} fuese una persona',
    'Veredicto final',
    'Lo vuestro tiene nombre',
    'En resumen, sois…',
  ],
  bodies: [],
});

export const summary = definePool({
  slots: ['n', 'people', 'vibe', 'emoji', 'word'],
  titles: [
    'Y esto ha sido todo',
    'Resumen final',
    'Para enmarcar',
    'Lo mejor, en una tarjeta',
    'Vuestro Wrappsapp',
    'Hasta el próximo Wrapped',
    'Guardadlo bien',
    'Fin de la función',
  ],
  bodies: [
    '{n|num} mensajes, {people} personas y una vibra: {vibe}.',
    'Esto es {chat} en una imagen. Compartidla donde queráis.',
    'Todo lo anterior, en una tarjeta. Para que no se pierda.',
    'Vuestro emoji fue {emoji} y vuestra palabra, «{word}». Lo demás es historia.',
    '{vibe}: {n|num} mensajes lo demuestran.',
    'Guardad esta tarjeta. Luego diréis que no era para tanto.',
    'Así queda {chat} para la posteridad.',
    'Se acabó lo que se daba. Hasta la próxima.',
  ],
});

/** Interactive slides. */
export const QUIZ_QUESTIONS = {
  messages: [
    '¿Quién ha escrito más mensajes?',
    '¿Quién no suelta el móvil?',
    '¿De quién son más mensajes?',
  ],
  audios: [
    '¿Quién mandó más audios?',
    '¿Quién tiene el micrófono en propiedad?',
    '¿De quién son más notas de voz?',
  ],
  laughs: [
    '¿Quién se ríe más por escrito?',
    '¿De quién son más jajajas?',
    '¿Quién tiene la risa más fácil?',
  ],
  night: [
    '¿Quién escribe más de madrugada?',
    '¿Quién no duerme?',
    '¿De quién son los mensajes de las 3 a. m.?',
  ],
  questions: [
    '¿Quién hace más preguntas?',
    '¿Quién pregunta por todo?',
    '¿De quién son más interrogaciones?',
  ],
  shouts: [
    '¿Quién escribe más EN MAYÚSCULAS?',
    '¿QUIÉN SUBE MÁS EL VOLUMEN?',
    '¿De quién es el Bloq Mayús?',
  ],
  stickers: [
    '¿Quién manda más stickers?',
    '¿Quién tiene el mejor arsenal de stickers?',
    '¿De quién son más stickers?',
  ],
  emojis: [
    '¿Quién usa más emojis?',
    '¿Quién no sabe escribir sin emojis?',
    '¿De quién son más emojis?',
  ],
  links: [
    '¿Quién comparte más enlaces?',
    '¿Quién es la agencia de noticias?',
    '¿De quién son más enlaces?',
  ],
} as const satisfies Record<string, readonly Variant[]>;

export type QuizMetric = keyof typeof QUIZ_QUESTIONS;

/** How each quiz answer is counted: "{value|num} audios". */
export const QUIZ_UNITS: Record<QuizMetric, string> = {
  messages: '{value|num} {value|plural:mensaje,mensajes}',
  audios: '{value|num} {value|plural:audio,audios}',
  laughs: '{value|num} {value|plural:risa,risas}',
  night: '{value|num} {value|plural:mensaje,mensajes} de madrugada',
  questions: '{value|num} {value|plural:pregunta,preguntas}',
  shouts: '{value|num} {value|plural:mensaje,mensajes} en mayúsculas',
  stickers: '{value|num} {value|plural:sticker,stickers}',
  emojis: '{value|num} {value|plural:emoji,emojis}',
  links: '{value|num} {value|plural:enlace,enlaces}',
};

export const quiz = {
  slots: ['answer', 'amount'],
  hints: [
    'Tocad a quien creáis.',
    'Una oportunidad. Sin presión.',
    'Elegid bien: hay reputaciones en juego.',
    'Pensadlo dos segundos y tocad.',
    '¿Lo tenéis claro? Tocad.',
    'Apostad por alguien.',
    'A ver cuánto os conocéis.',
    'Solo hay una respuesta buena.',
  ],
  right: [
    '¡Exacto! {answer}, con {amount}.',
    'Correcto: {answer}. {amount|cap}, nada menos.',
    '¡Eso es! {answer} lidera con {amount}.',
    'Os conocéis bien. {answer}: {amount}.',
    'Pleno. Era {answer}, con {amount}.',
    'Ni lo habéis dudado: {answer}, {amount}.',
    'Acierto limpio. {answer} y sus {amount}.',
    '¡Sí! {amount|cap} avalan a {answer}.',
  ],
  wrong: [
    '¡Casi! Era {answer}, con {amount}.',
    'Por poco. La respuesta era {answer}: {amount}.',
    'No esta vez: {answer}, con {amount}.',
    'Sorpresa: era {answer}. {amount|cap}.',
    'Buen intento, pero gana {answer} con {amount}.',
    'Nadie lo vio venir: {answer}, {amount}.',
    'Era {answer}. {amount|cap}, para que conste.',
    'Fallo honroso. {answer} lidera con {amount}.',
  ],
} as const satisfies { slots: readonly string[] } & Record<
  'hints' | 'right' | 'wrong',
  readonly Variant[]
>;
