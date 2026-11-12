# Wrappsapp

El Wrapped de tu grupo: convierte la exportación de un chat en un resumen animado con formato
de stories. Quién escribe más, a qué hora, las risas, el día que el chat ardió y un título
para cada persona.

**Tus mensajes no salen de tu dispositivo.** No hay servidor: el archivo se lee y se analiza
en el navegador, y lo único que se guarda es si tienes la música silenciada.

## Qué hace

- Lee el `.txt` o el `.zip` de la exportación (Android e iPhone, español e inglés).
- Calcula las estadísticas del grupo y de cada persona en un Web Worker.
- Genera unas 15–20 diapositivas animadas, con preguntas interactivas y música.
- Reparte un arquetipo y un título a cada persona, con textos por plantillas (sin IA).
- Al terminar, «Ver todos los datos» abre un informe con las gráficas completas: actividad
  por meses, días de la semana, mapa de horas, ranking y ficha de cada persona.
- Exporta la tarjeta final y las de cada persona como imagen 1080×1920 para compartir.
- Incluye una demo con un chat inventado, para probarlo sin subir nada.

El mismo chat produce siempre el mismo resultado, lo exporte quien lo exporte: todas las
decisiones (textos, colores, orden, música) salen de una semilla calculada a partir del
contenido del chat.

## Cómo usarlo

```bash
npm install
npm run dev
```

Para exportar un chat: abre el chat → menú → **Más** → **Exportar chat** → **Sin archivos**.

## Scripts

| Comando                        | Qué hace                                 |
| ------------------------------ | ---------------------------------------- |
| `npm run dev`                  | Servidor de desarrollo                   |
| `npm run build`                | Compilación de producción en `dist/`     |
| `npm test`                     | Tests unitarios                          |
| `npm run lint`                 | ESLint                                   |
| `npm run typecheck`            | Comprobación de tipos                    |
| `npm run e2e`                  | Test de extremo a extremo (Playwright)   |
| `npm run demo`                 | Imprime en consola el Wrapped de la demo |
| `npm run parse -- archivo.txt` | Resumen de un chat exportado             |

## Cómo está hecho

- **React + TypeScript + Vite + Tailwind**, con Framer Motion para las animaciones.
- `src/core/`: lógica pura y testeada (lector de exportaciones, semilla, estadísticas,
  arquetipos, plantillas). No usa azar ni la fecha actual.
- `src/worker/`: Web Worker que ejecuta `core` sin bloquear la interfaz.
- `src/ui/`: pantallas, motor de stories, diapositivas y exportación de imágenes.
- `src/audio/`: música generada en el navegador; admite pistas propias en `public/audio/`.

## Despliegue

Es un sitio estático: sirve cualquier alojamiento que publique `dist/`. Para Vercel basta con
importar el repositorio; `vercel.json` ya incluye las cabeceras de seguridad, entre ellas una
Content Security Policy que solo permite conexiones al propio sitio.

La vista previa al compartir el enlace (título, descripción e imagen) usa el dominio de
producción de Vercel. Con un dominio propio, define la variable de entorno `SITE_URL` en el
proyecto. La imagen se regenera con `npm run og`.

## Privacidad

- Ningún mensaje se envía a ningún sitio: no hay backend, analítica de contenido ni cookies.
- Los chats de prueba del repositorio son sintéticos. Los chats reales no deben subirse:
  `tests/fixtures/private/` y los nombres habituales de exportación están en `.gitignore`.
- Úsalo con chats en los que todo el mundo esté de acuerdo en verlo.

Wrappsapp no está afiliado a WhatsApp ni a Meta.
