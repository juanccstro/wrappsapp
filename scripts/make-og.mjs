/**
 * Generates public/og-image.jpg, the 1200×630 picture that chat apps and social networks show
 * when someone shares the link. It renders a small HTML page with the project's own logo and
 * fonts in headless Chromium (the one Playwright installs) and takes a screenshot.
 *
 *   npm run og
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;

const logo = dataUri('src/favicon-wrappsapp.png', 'image/png');
const display = dataUri(
  'node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2',
  'font/woff2',
);
const text = dataUri(
  'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
  'font/woff2',
);

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face { font-family: Display; src: url(${display}) format('woff2'); font-weight: 200 900; }
      @font-face { font-family: Text; src: url(${text}) format('woff2'); font-weight: 300 700; }
      * { box-sizing: border-box; margin: 0; }
      body {
        width: 1200px; height: 630px; overflow: hidden; position: relative;
        background: #12062b; color: #fff; font-family: Text, sans-serif;
      }
      .blob { position: absolute; border-radius: 50%; filter: blur(110px); opacity: 0.6; }
      .a { width: 620px; height: 620px; background: #ff4d8d; top: -260px; right: -140px; }
      .b { width: 640px; height: 640px; background: #7c5cff; bottom: -320px; left: -180px; }
      .c { width: 420px; height: 420px; background: #ffb443; bottom: -230px; right: 160px; opacity: 0.45; }
      .shade { position: absolute; inset: 0; background: rgba(18, 6, 43, 0.35); }
      main {
        position: relative; height: 100%; padding: 64px 72px;
        display: flex; align-items: center; gap: 56px;
      }
      img { width: 330px; height: 330px; flex: none; margin-left: -24px; }
      .name { font-family: Display; font-weight: 800; font-size: 40px; color: #ffd166; letter-spacing: 1px; }
      h1 { font-family: Display; font-weight: 900; font-size: 84px; line-height: 1.02; margin-top: 14px; }
      h1 span {
        background: linear-gradient(90deg, #ff4d8d, #ffb443 55%, #22d3c5);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      p { font-size: 32px; line-height: 1.3; margin-top: 26px; color: rgba(255, 255, 255, 0.9); max-width: 660px; }
      .pill {
        display: inline-flex; align-items: center; gap: 12px; margin-top: 30px;
        padding: 12px 24px; border-radius: 999px; font-size: 26px; font-weight: 700;
        background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.3);
      }
      svg { width: 26px; height: 26px; stroke: #22d3c5; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    </style>
  </head>
  <body>
    <div class="blob a"></div><div class="blob b"></div><div class="blob c"></div>
    <div class="shade"></div>
    <main>
      <img src="${logo}" alt="" />
      <div>
        <div class="name">Wrappsapp</div>
        <h1>El Wrapped<br /><span>de tu grupo</span></h1>
        <p>Convierte un chat en un resumen animado: quién escribe más, vuestras risas y un título para cada persona.</p>
        <div class="pill">
          <svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          Tus mensajes no salen de tu dispositivo
        </div>
      </div>
    </main>
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: 'load' });
// Runs inside the page: wait until the embedded fonts are ready before the screenshot.
await page.evaluate('document.fonts.ready');
await page.screenshot({ path: 'public/og-image.jpg', type: 'jpeg', quality: 86 });
await browser.close();
console.log('wrote public/og-image.jpg');
