// Give every script and data file a shared version tag, so a browser never mixes a cached old file
// with a new one (GitHub Pages lets browsers cache each file for 10 minutes).
// Run before each commit: node tools/stamp.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const v = Date.now().toString(36);
const mods = fs.readdirSync(`${ROOT}/js`).filter((f) => f.endsWith('.js'));
const map = { imports: Object.fromEntries(mods.map((f) => [`./js/${f}`, `./js/${f}?v=${v}`])) };
const tag = `<script type="importmap" id="kamon-version" data-v="${v}">${JSON.stringify(map)}</script>`;
let html = fs.readFileSync(`${ROOT}/index.html`, 'utf8');
html = html.replace(/<script type="importmap" id="kamon-version"[^]*?<\/script>\n?\s*/, '');
html = html.replace(/<script type="module" src="js\/main\.js[^"]*"><\/script>/, `${tag}\n  <script type="module" src="./js/main.js?v=${v}"></script>`);
fs.writeFileSync(`${ROOT}/index.html`, html);
console.log('stamped', v);
