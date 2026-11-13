import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const root = '';
const uri = (p, t) => `data:${t};base64,${readFileSync(root + p).toString('base64')}`;
const logo = uri('src/assets/logo.png', 'image/png');
const font = uri(
  'node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2',
  'font/woff2',
);
const html = `<!doctype html><html><head><style>
@font-face{font-family:D;src:url(${font}) format('woff2');font-weight:200 900}
*{margin:0}body{width:1400px;height:240px;background:transparent;display:flex;align-items:center;gap:28px;padding:0 20px;box-sizing:border-box}
img{width:200px;height:200px}span{font-family:D;font-weight:800;font-size:112px;color:#12062b;letter-spacing:-2px}
</style></head><body><img src="${logo}"><span>Wrappsapp</span></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 240 } });
await p.setContent(html, { waitUntil: 'load' });
await p.evaluate('document.fonts.ready');
const width = await p.evaluate(
  'Math.ceil(document.querySelector("span").getBoundingClientRect().right + 20)',
);
await p.screenshot({
  path: process.argv[2],
  omitBackground: true,
  clip: { x: 0, y: 0, width, height: 240 },
});
await b.close();
console.log('ok', width);
