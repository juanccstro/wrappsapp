const words = (list: string): ReadonlySet<string> => new Set(list.split(/\s+/).filter(Boolean));

/** Function words and chat fillers, Spanish and English. Lower-case, with and without accents. */
export const STOPWORDS = words(`
a al algo algun alguna alguno algunos alli allí ahi ahí ahora antes aqui aquí asi así aun aún aunque
bien bueno buena buenas buenos cada casi como cómo con contra cosa cosas creo cual cuál cuando cuándo
de del desde donde dónde dos el él ella ellas ello ellos en entonces entre era eran eres es esa esas
ese eso esos esta está estaba estamos estan están estar estas estás este esto estos estoy fue fuera
fui ha habia había hace hacer hacia han has hasta hay he hemos hola hoy igual la las le les lo los
luego mas más me mejor menos mi mí mis mismo mucha muchas mucho muchos muy nada ni no nos nosotros
nuestra nuestro o os otra otras otro otros para pero poco por porque porqué pues puede puedo que qué
quien quién se sea ser si sí sido siempre sin sobre solo sólo son soy su sus tal tambien también
tampoco tan tanto te ten tengo ti tiene tienen tienes toda todas todo todos tu tú tus un una uno unas
unos va vale vamos van vas vaya ve veces ver vez voy vosotros ya yo
alguien mira mirad oye ayer anda dime digo dice dicho hecho tener hace haciendo quiero quieres
pq xq porq tb tmb tbn bn vd dnd ns nse aki ok okay okey oki vale venga osea sea bueno claro nah eh ah
oh uf ay hey ey mm mmm hmm pff bua buah jo joe tio tía tia tío
the and you that was for are with his they this have from one had word but not what all were when
your can said there use each which she how their will other about out many then them these some her
would make like him into time has look two more write see number way could people than first been
call who its now find long down day did get come made may part just don dont doesn im ive ill youre
thats its yeah yes nope got too very much any our also here there why where does really well only
`);

/** Small sentiment lexicon. It is only ever used to celebrate the positive side of a chat. */
export const POSITIVE_WORDS = words(`
gracias genial increible increíble perfecto perfecta feliz felicidades enhorabuena guay bravo ole olé
precioso preciosa bonito bonita maravilla maravilloso maravillosa estupendo estupenda fantastico
fantástico fantástica encanta encantan encantado encantada quiero quiero amor cariño guapo guapa
guapos guapas buenisimo buenísimo buenísima ganas ilusion ilusión suerte animo ánimo orgullo orgulloso
orgullosa alegria alegría alegro risas fiesta divertido divertida top crack cracks temazo brutal
espectacular mola molan chulo chula contento contenta abrazo abrazos besos beso ganamos
thanks thank great awesome amazing perfect happy congrats congratulations love lovely nice cool
beautiful wonderful fantastic excited proud fun best yay
`);

export const NEGATIVE_WORDS = words(`
triste mal fatal horrible odio asco pena lastima lástima cansado cansada harto harta enfadado enfadada
agobio agobiado agobiada estres estrés miedo dolor enfermo enferma peor rabia aburrido aburrida
sad bad awful terrible hate tired angry sick worst boring stressed sorry
`);

export const POSITIVE_EMOJIS: ReadonlySet<string> = new Set(
  '😂 🤣 😍 🥰 😘 😊 😁 😄 😃 😀 🙌 👏 🎉 🥳 💪 🔥 ✨ 💖 💕 💗 💛 💚 💙 💜 🧡 🤩 😎 👍 🙏 🫶 🤗 😻 💯'.split(
    ' ',
  ),
);

export const NEGATIVE_EMOJIS: ReadonlySet<string> = new Set(
  '😢 😭 😡 🤬 😞 😔 😩 😫 💔 😠 😤 😰 😨 🤢 🤮 👎 😒'.split(' '),
);
