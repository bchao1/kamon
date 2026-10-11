// Normalize the downloaded Commons SVGs into one canonical form:
//   ink-on-transparent, centered, 1000×1000 box, re-traced with potrace,
//   split into connected "pieces", plus rotation / mirror symmetry fingerprints.
// Usage: node tools/normalize.mjs            → writes data/crests.json + assets/masks/*.png
import { chromium } from '/Users/brianchao/Documents/agents/rider-maker/node_modules/playwright-core/index.mjs';
import { PNG } from 'pngjs';
import potrace from 'potrace';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KEYS = JSON.parse(fs.readFileSync(`${ROOT}/assets/crests/credits.json`, 'utf8'));
const N = 1000; // canonical box
fs.mkdirSync(`${ROOT}/assets/masks`, { recursive: true });
fs.mkdirSync(`${ROOT}/data`, { recursive: true });

// ---------- Stage A: rasterize in Chrome, fix polarity, crop & center ----------
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.goto('about:blank');
const masks = {};
for (const key of Object.keys(KEYS)) {
  const svg = fs.readFileSync(`${ROOT}/assets/crests/${key}.svg`, 'utf8');
  masks[key] = await page.evaluate(async ({ svg, N }) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const w0 = img.naturalWidth || 1000, h0 = img.naturalHeight || 1000;
    const sc = 2000 / Math.max(w0, h0);
    const W = Math.round(w0 * sc), H = Math.round(h0 * sc);
    const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.drawImage(img, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    const lum = (i) => 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    // polarity: what colour is the border?
    const border = [];
    for (let x = 0; x < W; x += 4) border.push(lum(x), lum((H - 1) * W + x));
    for (let y = 0; y < H; y += 4) border.push(lum(y * W), lum(y * W + W - 1));
    border.sort((a, b) => a - b);
    // sample ~3% in from the edge so a hairline margin around a black square doesn't fool us
    const inset = Math.round(Math.min(W, H) * 0.03), mid = [];
    for (let x = inset; x < W - inset; x += 4) mid.push(lum(inset * W + x), lum((H - 1 - inset) * W + x));
    for (let y = inset; y < H - inset; y += 4) mid.push(lum(y * W + inset), lum(y * W + W - 1 - inset));
    mid.sort((a, b) => a - b);
    const bgDark = border[border.length >> 1] < 128 || mid[mid.length >> 1] < 128;
    const edge = Math.round(Math.min(W, H) * 0.004); // ignore hairlines along the source edge
    const ink = new Uint8Array(W * H);
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, onEdge = x < edge || y < edge || x >= W - edge || y >= H - edge;
      const v = !onEdge && (bgDark ? lum(i) > 128 : lum(i) < 128);
      if (v) { ink[i] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    // centered square crop with a small margin → N×N
    const side = Math.max(x1 - x0, y1 - y0) / 0.92, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const m = new OffscreenCanvas(W, H), mg = m.getContext('2d');
    const id = mg.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const v = ink[i] ? 0 : 255; id.data.set([v, v, v, 255], i * 4); }
    mg.putImageData(id, 0, 0);
    const o = new OffscreenCanvas(N, N), og = o.getContext('2d');
    og.fillStyle = '#fff'; og.fillRect(0, 0, N, N);
    og.imageSmoothingQuality = 'high';
    og.drawImage(m, cx - side / 2, cy - side / 2, side, side, 0, 0, N, N);
    const blob = await o.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (const b of buf) s += String.fromCharCode(b);
    return { png: btoa(s), bgDark };
  }, { svg, N });
  fs.writeFileSync(`${ROOT}/assets/masks/${key}.png`, Buffer.from(masks[key].png, 'base64'));
  console.log('mask', key, masks[key].bgDark ? '(inverted source)' : '');
}
await browser.close();

// ---------- Stage B: pieces, tracing, symmetry ----------
const trace = (buf) => new Promise((res, rej) => {
  const p = new potrace.Potrace({ turdSize: 4, optTolerance: 0.25, threshold: 128 });
  p.loadImage(buf, (err) => (err ? rej(err) : res(p.getPathTag().match(/ d="([^"]+)"/)?.[1] ?? '')));
});
const r1 = (d) => d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1));

function labels(bin) {
  const lab = new Int32Array(N * N).fill(-1), comps = [];
  const stack = [];
  for (let s = 0; s < N * N; s++) {
    if (!bin[s] || lab[s] >= 0) continue;
    const id = comps.length; let area = 0, sx = 0, sy = 0, x0 = N, y0 = N, x1 = 0, y1 = 0;
    stack.push(s); lab[s] = id;
    while (stack.length) {
      const i = stack.pop(), x = i % N, y = (i / N) | 0;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const j = ny * N + nx;
        if (bin[j] && lab[j] < 0) { lab[j] = id; stack.push(j); }
      }
    }
    comps.push({ id, area, cx: sx / area, cy: sy / area, bbox: [x0, y0, x1, y1] });
  }
  return { lab, comps };
}

function maskPng(pred) {
  const png = new PNG({ width: N, height: N });
  for (let i = 0; i < N * N; i++) { const v = pred(i) ? 0 : 255; png.data[i * 4] = png.data[i * 4 + 1] = png.data[i * 4 + 2] = v; png.data[i * 4 + 3] = 255; }
  return PNG.sync.write(png);
}

// symmetry fingerprints on a 160px copy: IoU of the crest with itself rotated by θ / mirrored about φ
function fingerprints(bin) {
  const M = 160, s = N / M, small = new Uint8Array(M * M);
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) small[y * M + x] = bin[Math.floor((y + 0.5) * s) * N + Math.floor((x + 0.5) * s)];
  // rotate / reflect about the ink centroid: a pentagon's bbox centre is not its rotation centre
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) if (small[y * M + x]) { sx += x; sy += y; n++; }
  const cx = sx / n, cy = sy / n;
  const iou = (map) => {
    let inter = 0, uni = 0;
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
      const [u, v] = map(x - cx, y - cy), ux = Math.round(u + cx), vy = Math.round(v + cy);
      const a = small[y * M + x], b = ux >= 0 && vy >= 0 && ux < M && vy < M ? small[vy * M + ux] : 0;
      inter += a & b; uni += a | b;
    }
    return uni ? inter / uni : 0;
  };
  const rot = [], mir = [];
  for (let t = 0; t < 360; t += 2) { const a = (t * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a); rot.push(+iou((x, y) => [co * x - si * y, si * x + co * y]).toFixed(3)); }
  for (let t = 0; t < 180; t += 2) { const a = (2 * t * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a); mir.push(+iou((x, y) => [co * x + si * y, si * x - co * y]).toFixed(3)); }
  return { rot, mir, centroid: [Math.round(((cx + 0.5) * N) / M), Math.round(((cy + 0.5) * N) / M)] };
}

const out = {};
for (const key of Object.keys(KEYS)) {
  const png = PNG.sync.read(fs.readFileSync(`${ROOT}/assets/masks/${key}.png`));
  const bin = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) bin[i] = png.data[i * 4] < 128 ? 1 : 0;
  const { lab, comps } = labels(bin);
  const total = comps.reduce((a, c) => a + c.area, 0);
  comps.sort((a, b) => b.area - a.area);
  const big = comps.filter((c) => c.area >= total * 0.002).slice(0, 48);
  const bigIds = new Set(big.map((c) => c.id));
  const pieces = [];
  for (const c of big) pieces.push({ d: r1(await trace(maskPng((i) => lab[i] === c.id))), area: +(c.area / total).toFixed(4), cx: Math.round(c.cx), cy: Math.round(c.cy), bbox: c.bbox });
  const dust = comps.filter((c) => !bigIds.has(c.id));
  if (dust.length) {
    const da = dust.reduce((a, c) => a + c.area, 0);
    pieces.push({ d: r1(await trace(maskPng((i) => lab[i] >= 0 && !bigIds.has(lab[i])))), area: +(da / total).toFixed(4), cx: 500, cy: 500, dust: dust.length });
  }
  // repeated units: pieces whose areas agree within 10%
  let g = 0;
  for (const p of pieces) {
    if (p.dust || p.group != null) continue;
    const twins = pieces.filter((q) => !q.dust && q.group == null && Math.abs(q.area - p.area) / p.area < 0.1);
    if (twins.length > 1) { twins.forEach((q) => (q.group = g)); g++; }
  }
  out[key] = { d: r1(await trace(maskPng((i) => bin[i]))), ink: +(total / (N * N)).toFixed(4), components: comps.length, pieces, ...fingerprints(bin) };
  console.log(key.padEnd(10), 'components', String(comps.length).padStart(4), 'pieces', pieces.length, 'groups', g);
}
fs.writeFileSync(`${ROOT}/data/crests.json`, JSON.stringify(out));
console.log('wrote data/crests.json', (fs.statSync(`${ROOT}/data/crests.json`).size / 1024).toFixed(0), 'KB');
