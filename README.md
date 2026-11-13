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

## Pagos (plan gratuito y de pago)

Cada dispositivo crea 2 Wrapped de chats distintos gratis; después se ofrece un pack de 3
(1,99 €) o el acceso ilimitado (4,99 €), con Stripe Checkout. Mientras no se configuren las
variables de abajo, la web funciona sin límite y no muestra nada de esto.

- `server/` y `api/`: funciones de Vercel que cuentan los usos y comprueban los pagos. Solo
  guardan huellas cifradas (dispositivo, chat, email), nunca el contenido de un chat.
- La tarjeta se introduce en la página de Stripe, nunca en Wrappsapp.
- Tras pagar se muestra un código de recuperación, que también llega en el recibo de Stripe.
  Con email + código se recupera la compra en otro dispositivo.

Puesta en marcha (ver `.env.example`):

1. **Base de datos**: Vercel → Storage → Upstash Redis → conectar al proyecto.
2. **Secreto**: variable `WRAPPSAPP_SECRET` con un texto largo y aleatorio.
3. **Stripe**: variable `STRIPE_SECRET_KEY` (empieza por `sk_test_` para pruebas).
4. **Webhook**: en Stripe, un endpoint a `https://<tu-dominio>/api/stripe-webhook` con los
   eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`; su
   secreto va en `STRIPE_WEBHOOK_SECRET`.
5. **Recibos**: Stripe → Settings → Customer emails → activar recibos de pagos.
6. **Datos legales**: rellenar `src/legal.ts` (el enlace a Condiciones aparece entonces).

En local, `npm run dev` ya incluye la API con una base de datos en memoria.

## Privacidad

- Ningún mensaje se envía a ningún sitio: el chat se analiza en el navegador. El servidor
  solo cuenta usos y compras, con datos cifrados, y no hay analítica ni publicidad.
- Los chats de prueba del repositorio son sintéticos. Los chats reales no deben subirse:
  `tests/fixtures/private/` y los nombres habituales de exportación están en `.gitignore`.
- Úsalo con chats en los que todo el mundo esté de acuerdo en verlo.

Wrappsapp no está afiliado a WhatsApp ni a Meta.
