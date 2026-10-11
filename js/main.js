import { CLANS, MOTIF_LABEL, SIDE_LABEL } from './data.js';
import { build, MOTIFS, ENCLOSURES, LAYOUTS, CENTERS, OVERLAYS, DEFAULT, randomSpec } from './grammar.js';
import { crestMarkup, animateConstruction, crestFile, reduced } from './render.js';

const $ = (s, el = document) => el.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const [DATA, CREDITS] = await Promise.all([fetch('data/crests.json').then((r) => r.json()), fetch('assets/crests/credits.json').then((r) => r.json())]);
const BY_KEY = Object.fromEntries(CLANS.map((c) => [c.key, c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- symmetry from the fingerprints computed in tools/normalize.mjs ----------
const at = (arr, step, deg) => { const x = ((((deg % 360) + 360) % 360) / step), i = Math.floor(x), fr = x - i; return arr[i % arr.length] * (1 - fr) + arr[(i + 1) % arr.length] * fr; };
function symmetryOf(c) {
  const med = [...c.rot].sort((a, b) => a - b)[c.rot.length >> 1];
  const axes = [], top = Math.max(...c.mir);
  c.mir.forEach((v, i) => { const p = c.mir[(i + c.mir.length - 1) % c.mir.length], q = c.mir[(i + 1) % c.mir.length]; if (v >= 0.8 && v >= top - 0.1 && v >= p && v > q) axes.push(i * 2); });
  if (med > 0.95) return { n: Infinity, axes: [], key: 'inf' };
  let n = 1;
  for (let k = 2; k <= 12; k++) { let m = 1; for (let j = 1; j < k; j++) m = Math.min(m, at(c.rot, 2, (j * 360) / k)); if (m >= 0.83 && m - med >= 0.1) n = k; }
  // n-fold rotation plus one mirror means n mirrors (dihedral group): fill in any the threshold missed
  if (n > 1 && axes.length) { const base = axes.reduce((b, a) => (Math.abs(a - 90) < Math.abs(b - 90) ? a : b)); axes.length = 0; for (let k = 0; k < n; k++) axes.push((base + (k * 180) / n) % 180); }
  return { n, axes, key: n > 1 ? `r${n}` : axes.length ? 'mirror' : 'none' };
}
for (const c of CLANS) Object.assign(c, { data: DATA[c.key], sym: symmetryOf(DATA[c.key]), credit: CREDITS[c.key] });

const SYM_GROUPS = [
  ['none', 'No symmetry', 'Drawn freehand'], ['mirror', 'Mirror', 'Left matches right'], ['r2', '2-fold', 'Same after a half turn'],
  ['r3', '3-fold', 'Repeats every 120°'], ['r4', '4-fold', 'Repeats every 90°'], ['r5', '5-fold', 'Repeats every 72°'],
  ['r6', '6-fold', 'Repeats every 60°'], ['r8', '8-fold', 'Repeats every 45°'], ['inf', 'Circle', 'Same at every angle'],
];
const symText = (s) => (s.n === Infinity ? 'Same at every angle' : s.n > 1 ? `${s.n}-fold rotation` + (s.axes.length ? `, ${s.axes.length} mirror ${s.axes.length > 1 ? 'axes' : 'axis'}` : '') : s.axes.length ? 'One mirror axis' : 'None');

// ---------- small svg builders ----------
// overlap is stretched from its own minimum to 1 so every crest's peaks read clearly
const fpPath = (rot, r0 = 520, k = 95) => { const lo = Math.min(...rot); return 'M' + rot.map((v, i) => { const a = (i * 2 * Math.PI) / 180, rr = r0 + k * ((v - lo) / (1 - lo || 1)); return `${(500 + rr * Math.sin(a)).toFixed(1)} ${(500 - rr * Math.cos(a)).toFixed(1)}`; }).join('L') + 'Z'; };
const crestPath = (c) => `<path d="${c.data.d}" fill-rule="evenodd" fill="var(--shiro)"/>`;

// ================= HERO =================
// Scattered pieces drift in as outlines, gather into place, the compass lines are sketched over them,
// the ink fills in, and then the crest breaks apart and the next one gathers.
const rand = (a, b) => a + Math.random() * (b - a);
const scatterT = () => `translate(${rand(-430, 430).toFixed(0)}px, ${rand(-430, 430).toFixed(0)}px) rotate(${rand(-140, 140).toFixed(0)}deg) scale(${rand(0.28, 0.6).toFixed(2)})`;
const done = (anims) => Promise.all(anims.map((a) => a.finished.catch(() => {})));
async function assemble(svg) {
  const kage = !!svg.querySelector('.kage');
  const pieces = [...svg.querySelectorAll('.ink .piece')];
  const parts = pieces.map((g) => g.querySelector('.part'));
  const stroked = (p) => kage && !['enclosure', 'overlay'].includes(p.dataset.role);
  const papers = [...svg.querySelectorAll('.ink .paper')];
  const guides = [...svg.querySelectorAll('.guides .g')], dots = [...svg.querySelectorAll('.guides .dot')];
  const gEl = svg.querySelector('.guides');
  const from = pieces.map(() => scatterT());
  papers.forEach((p) => p.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' }));
  guides.forEach((g) => g.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 1 }], { duration: 1, fill: 'forwards' }));
  dots.forEach((d) => d.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' }));
  // 1. disparate icons appear, drawn as outlines
  await done(pieces.map((g, i) => g.animate([{ transform: from[i], opacity: 0 }, { transform: from[i], opacity: 1 }], { duration: 500, delay: i * 50, fill: 'forwards' })).concat(
    parts.map((p, i) => p.animate([
      { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: '6px', strokeDasharray: '1 1', strokeDashoffset: 1 },
      { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: '6px', strokeDasharray: '1 1', strokeDashoffset: 0 },
    ], { duration: 900, delay: i * 50, easing: 'ease-in-out', fill: 'forwards' }))));
  await sleep(500);
  // 2. they come together
  await done(pieces.map((g, i) => g.animate([{ transform: from[i] }, { transform: 'none' }], { duration: 1500, delay: i * 70, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' })));
  // 3. the compass sketches over them
  const stagger = Math.min(110, 900 / Math.max(1, guides.length));
  await done(guides.map((g, i) => g.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: 650, delay: i * stagger, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }))
    .concat(dots.map((d, i) => d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: i * stagger, fill: 'forwards' }))));
  // 4. ink fills in, the guides fade back
  await done(parts.map((p, i) => p.animate([
    { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: '6px', strokeDasharray: '1 1', strokeDashoffset: 0 },
    stroked(p) ? { fillOpacity: 0, stroke: 'var(--shiro)', strokeDasharray: '1 1', strokeDashoffset: 0 } : { fillOpacity: 1, stroke: 'var(--shiro)', strokeWidth: '0px', strokeDasharray: '1 1', strokeDashoffset: 0 },
  ], { duration: 700, delay: i * 60, easing: 'ease-in-out', fill: 'forwards' }))
    .concat(papers.map((p) => p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 500, fill: 'forwards' })))
    .concat(gEl ? [gEl.animate([{ opacity: 0.75 }, { opacity: 0.2 }], { duration: 900, delay: 300, fill: 'forwards' })] : []));
}
async function disperse(svg) {
  const pieces = [...svg.querySelectorAll('.ink .piece')], gEl = svg.querySelector('.guides');
  await done(pieces.map((g, i) => g.animate([{ transform: 'none', opacity: 1 }, { transform: scatterT(), opacity: 0 }], { duration: 1000, delay: i * 30, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }))
    .concat(gEl ? [gEl.animate([{ opacity: 0.2 }, { opacity: 0 }], { duration: 500, fill: 'forwards' })] : []));
}
async function hero() {
  const svg = $('#hero-svg'), cap = $('#hero-cap');
  const seq = ['hosokawa', 'akechi', 'chosokabe', 'tokugawa', 'maeda', 'takeda', 'sanada', 'mori'].map((k) => BY_KEY[k]);
  for (let i = 0; ; i = (i + 1) % seq.length) {
    const c = seq[i];
    svg.innerHTML = crestMarkup(c.recipe, { guides: true });
    svg.setAttribute('aria-label', `${c.monEn}, the ${c.houseEn} crest, gathering from its pieces`);
    cap.innerHTML = `<b lang="ja">${c.mon}</b>${c.monEn}, the ${c.houseEn} crest`;
    if (reduced) { svg.querySelector('.guides')?.setAttribute('opacity', '0.25'); return; }
    await assemble(svg);
    await sleep(2800);
    await disperse(svg);
  }
}

// ================= GALLERY =================
const board = $('#board');
let mode = 'grid', active = 'oda';
const GALLERY_TEXT = {
  grid: '<b>Every crest here was worn into battle between 1560 and 1600.</b> Read from the right. Pick one to take it apart.',
  symmetry: '<b>Sorted by how each crest repeats</b> when it turns or folds, from freehand drawings to perfect circles.',
  motif: '<b>Sorted by what each crest depicts:</b> plants, animals, geometry, objects and writing.',
  side: 'When Hideyoshi died in 1598 he left a five-year-old heir and a council of regents. The strongest regent, Tokugawa Ieyasu, began to rule alone. Ishida Mitsunari rallied lords loyal to the Toyotomi against him; those who resented Mitsunari, or bet on Ieyasu, took the East. <b>On 21 October 1600 the two armies met at Sekigahara.</b> Defections turned the day, and Ieyasu was shōgun three years later.',
};
const SYM_COLS = [['none', 'None', 'freehand'], ['mirror', 'Mirror', 'one fold'], ['r2', '2-fold', '180°'], ['r3', '3-fold', '120°'], ['r4', '4-fold', '90°'], ['r5', '5-fold', '72°'], ['r6', '6-fold', '60°'], ['r8', '8-fold', '45°'], ['inf', 'Circle', 'any angle']];
function initBoard() {
  for (const c of CLANS) {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.key = c.key;
    b.setAttribute('aria-label', `${c.houseEn}: ${c.monEn}`);
    b.innerHTML = `<svg viewBox="0 0 1000 1000" aria-hidden="true"><g class="crest">${crestPath(c)}</g></svg><span class="lbl"><b lang="ja">${c.house}</b>${c.houseEn}</span>`;
    b.onclick = () => openAnatomy(c.key, true);
    board.append(b);
  }
  document.querySelectorAll('#gallery .vmenu button').forEach((btn) => btn.onclick = () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('#gallery .vmenu button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
    layout();
  });
  new ResizeObserver(() => layout()).observe(board);
}
function layout() {
  board.dataset.mode = mode;
  board.classList.toggle('quiet', mode === 'symmetry' || mode === 'motif');
  board.querySelectorAll('.row-label').forEach((l) => l.remove());
  $('#gallery-text').innerHTML = GALLERY_TEXT[mode];
  const W = board.clientWidth, fixed = board.clientHeight > 240, H = fixed ? board.clientHeight : 9999, gap = 16, lblH = 46;
  const tile = (c) => board.querySelector(`.tile[data-key="${c.key}"]`);
  const place = (c, x, y, t, faded = false) => { const el = tile(c); el.style.setProperty('--t', `${t}px`); el.style.transform = `translate(${x}px, ${y}px)`; el.classList.toggle('faded', faded); };
  const label = (html, x, y, w) => { const l = document.createElement('div'); l.className = 'row-label'; l.innerHTML = html; l.style.width = `${w}px`; l.style.transform = `translate(${x}px, ${y}px)`; board.append(l); };
  let total = 0;
  if (mode === 'grid') {
    // five across, read from the right
    const cols = W > 640 ? 5 : W > 420 ? 4 : 3, rows = Math.ceil(CLANS.length / cols), cell = W / cols;
    const t = Math.max(52, Math.min(cell - gap * 2, (H - rows * (lblH + gap)) / rows, 150));
    total = rows * (t + lblH + gap) - gap;
    const y0 = fixed ? Math.max(0, (H - total) / 2) : 0;
    CLANS.forEach((c, i) => place(c, W - ((i % cols) + 1) * cell + (cell - t) / 2, y0 + Math.floor(i / cols) * (t + lblH + gap), t));
  } else if (mode === 'symmetry' || mode === 'motif') {
    // one column per group, right to left, like lines of vertical text
    const keyOf = (c) => (mode === 'symmetry' ? c.sym.key : c.motif);
    const groups = (mode === 'symmetry' ? SYM_COLS : Object.entries(MOTIF_LABEL).map(([k, v]) => [k, v, ''])).map(([k, name, sub]) => [name, sub, CLANS.filter((c) => keyOf(c) === k)]).filter((g) => g[2].length);
    const colW = W / groups.length, maxN = Math.max(...groups.map((g) => g[2].length)), labH = 56, vg = 10;
    const t = Math.max(30, Math.min(colW - gap, (H - labH) / maxN - vg, 110));
    total = labH + maxN * (t + vg);
    const y0 = fixed ? Math.max(0, (H - total) / 2) : 0;
    groups.forEach(([name, sub, members], gi) => {
      const x0 = W - (gi + 1) * colW;
      label(`<b>${name}</b><span>${sub || `${members.length} ${members.length > 1 ? 'houses' : 'house'}`}</span>`, x0, y0, colW);
      members.forEach((c, i) => place(c, x0 + (colW - t) / 2, y0 + labH + i * (t + vg), t));
    });
  } else {
    // Sekigahara: the West on the left of the page, the East on the right, the Sanada on the line
    const by = (k) => CLANS.filter((c) => c.side === k);
    const west = by('west'), east = by('east'), split = by('split'), fallen = by('fallen'), labH = 54;
    const t = Math.max(44, Math.min((W - gap * 8) / 7, (H - labH * 2 - lblH * 5 - gap * 5) / 4.6, 104)), tf = t * 0.6, rowH = t + lblH + gap, gx = t * 0.35;
    total = labH + 4 * rowH + labH * 0.7 + tf + lblH;
    const y0 = fixed ? Math.max(0, (H - total) / 2) : 0, top = y0 + labH;
    label('<b lang="ja">西軍</b><span>Western army</span>', 0, y0, 2 * t + gx);
    label('<b lang="ja">東軍</b><span>Eastern army</span>', W - 2 * t - gx, y0, 2 * t + gx);
    west.forEach((c, i) => place(c, Math.floor(i / 4) * (t + gx), top + (i % 4) * rowH, t));
    east.forEach((c, i) => place(c, W - t - Math.floor(i / 4) * (t + gx), top + (i % 4) * rowH, t));
    label('<b>Both sides</b><span>split on purpose</span>', W / 2 - 80, top + 1.5 * rowH - labH * 0.9, 160);
    split.forEach((c) => place(c, W / 2 - t / 2, top + 1.5 * rowH, t));
    const fy = top + 4 * rowH + labH * 0.1, fw = fallen.length * (tf + gap * 2);
    label('<span>Gone before 1600</span>', W / 2 - 80, fy, 160);
    fallen.forEach((c, i) => place(c, W / 2 - fw / 2 + gap + i * (tf + gap * 2), fy + 26, tf, true));
  }
  board.style.minHeight = fixed ? '' : `${total}px`;
}

// ================= ANATOMY =================
const stage = $('#stage');
let step = 'whole', cur = null;
const GROUP_COLORS = ['var(--g0)', 'var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)'];
function openAnatomy(key, scroll) {
  active = key; cur = BY_KEY[key];
  board.querySelectorAll('.tile').forEach((t) => t.classList.toggle('active', t.dataset.key === key));
  renderInfo();
  $('#steps [data-step="compass"]').disabled = !cur.recipe;
  if (step === 'compass' && !cur.recipe) step = 'whole';
  stage.setAttribute('aria-label', `${cur.monEn}, crest of the ${cur.houseEn}`);
  stage.innerHTML = `<defs><g id="pcs">${cur.data.pieces.map((p) => `<path d="${p.d}" fill-rule="evenodd"/>`).join('')}</g></defs>
    <g id="L-under"></g>
    <g id="L-pieces">${cur.data.pieces.map((p, i) => `<path class="pc" data-i="${i}" d="${p.d}" fill-rule="evenodd" pathLength="1" style="fill:var(--shiro);transition:transform .9s cubic-bezier(.6,0,.2,1), fill .6s, opacity .6s"/>`).join('')}</g>
    <g id="L-over"></g>`;
  setStep(step, true);
  if (scroll) $('#anatomy').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
function renderInfo() {
  const c = cur, d = c.data;
  $('#ana-title').textContent = c.mon;
  $('#ana-en').textContent = `${c.monEn} · ${c.houseEn}`;
  $('#info').innerHTML = `
    <h3>${c.houseEn}<span lang="ja">${c.house}</span></h3>
    <p class="gloss">${c.gloss}</p>
    <dl class="facts">
      <dt>Lord</dt><dd>${c.lord}</dd>
      <dt>Province</dt><dd>${c.province}</dd>
      <dt>In 1600</dt><dd>${c.side === 'fallen' ? `Destroyed in ${c.fell}` : SIDE_LABEL[c.side]}</dd>
      <dt>Ink</dt><dd>${d.components} pieces · ${symText(c.sym).toLowerCase()} · ${Math.round(d.ink * 100)}% of its square</dd>
    </dl>
    <p class="note-text">${c.note}</p>
    <p class="credit">Source: <a href="${c.credit.page}">${c.credit.file}</a> by ${c.credit.artist || c.credit.uploader}, ${c.credit.license}. Re-traced here.</p>`;
  const strip = $('#strip');
  if (!strip.children.length) {
    strip.innerHTML = CLANS.map((x) => `<button data-key="${x.key}" aria-label="${x.houseEn}"><svg viewBox="0 0 1000 1000" aria-hidden="true">${crestPath(x)}</svg></button>`).join('');
    strip.onclick = (e) => { const b = e.target.closest('button'); if (b) openAnatomy(b.dataset.key, false); };
  }
  strip.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.key === c.key));
}

function groupStats(d) {
  const gs = {};
  d.pieces.forEach((p) => { if (p.group != null) (gs[p.group] ||= []).push(p); });
  return Object.values(gs).sort((a, b) => b.length - a.length || b[0].area - a[0].area);
}
function setStep(s, fresh) {
  step = s;
  document.querySelectorAll('#steps button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.step === s));
  stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  const under = $('#L-under', stage), over = $('#L-over', stage), pcsG = $('#L-pieces', stage);
  under.innerHTML = over.innerHTML = '';
  pcsG.style.opacity = 1;
  const pcs = [...stage.querySelectorAll('.pc')];
  pcs.forEach((p) => { p.style.transform = ''; p.style.fill = 'var(--shiro)'; });
  const c = cur, d = c.data, [cx, cy] = d.centroid, sym = c.sym, cap = $('#step-cap');

  if (s === 'whole') {
    cap.textContent = `${c.mon}, ${c.monEn}. ${c.gloss}.`;
    if (fresh || true) pcs.forEach((p, i) => p.animate([{ fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: 4, strokeDasharray: '1 1', strokeDashoffset: 1 }, { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: 4, strokeDasharray: '1 1', strokeDashoffset: 0, offset: 0.7 }, { fillOpacity: 1, strokeWidth: 0, strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: reduced ? 0 : 1100, delay: reduced ? 0 : Math.min(i * 40, 1200), easing: 'ease-in-out', fill: 'both' }));
  }
  if (s === 'pieces') {
    const groups = groupStats(d);
    const color = new Map();
    groups.forEach((g, gi) => g.forEach((p) => color.set(p, GROUP_COLORS[gi % GROUP_COLORS.length])));
    requestAnimationFrame(() => pcs.forEach((el, i) => {
      const p = d.pieces[i], k = p.dust ? 0 : 0.2;
      el.style.transform = `translate(${((p.cx - cx) * k).toFixed(1)}px, ${((p.cy - cy) * k).toFixed(1)}px)`;
      if (color.has(p)) el.style.fill = color.get(p);
    }));
    const singles = d.pieces.filter((p) => p.group == null && !p.dust).length, dust = d.pieces.find((p) => p.dust);
    cap.innerHTML = `${d.components} separate pieces of ink, pulled apart. Pieces with the same area share a colour: the shapes the painter repeated.` +
      `<span class="legend">${groups.slice(0, 6).map((g, gi) => `<span><i style="background:${GROUP_COLORS[gi]}"></i>${g.length} matching</span>`).join('')}${singles ? `<span><i style="background:var(--shiro)"></i>${singles} unique</span>` : ''}${dust ? `<span>${dust.dust} tiny details</span>` : ''}</span>`;
  }
  if (s === 'symmetry') {
    over.innerHTML = `<path class="fp" d="${fpPath(d.rot)}" fill="none" stroke="var(--kihada)" stroke-width="7" stroke-linejoin="round" pathLength="1"/>
      ${sym.axes.map((a) => { const r = (a * Math.PI) / 180, dx = Math.cos(r) * 640, dy = Math.sin(r) * 640; return `<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" stroke="var(--aobana)" stroke-width="5" stroke-dasharray="14 10"/>`; }).join('')}
      <text x="500" y="-92" text-anchor="middle" fill="var(--mute)" font-size="26" font-family="var(--gothic)">0°</text>`;
    const fp = $('.fp', over);
    fp.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: reduced ? 0 : 1600, easing: 'ease-in-out', fill: 'both' });
    if (sym.n > 1) {
      const ghost = document.createElementNS(NS, 'use');
      ghost.setAttribute('href', '#pcs'); ghost.setAttribute('fill', 'var(--kihada)'); ghost.setAttribute('opacity', '0.45');
      ghost.style.transformOrigin = `${cx}px ${cy}px`; ghost.style.transformBox = 'view-box';
      over.append(ghost);
      if (!reduced) {
        const n = sym.n === Infinity ? 1 : sym.n, frames = [];
        for (let k = 0; k <= n; k++) { frames.push({ transform: `rotate(${(k * 360) / n}deg)`, offset: k / n }); }
        ghost.animate(sym.n === Infinity ? [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }] : frames.flatMap((f, k) => k === 0 ? [f] : [{ ...f, offset: f.offset - 0.5 / n }, f]).map((f, i, a) => ({ ...f, offset: i === 0 ? 0 : i === a.length - 1 ? 1 : f.offset })), { duration: (sym.n === Infinity ? 6 : sym.n * 1.4) * 1000, iterations: Infinity, easing: 'cubic-bezier(.6,0,.3,1)' });
      }
    }
    const peaks = sym.n > 1 && sym.n !== Infinity ? `It peaks every ${Math.round(360 / sym.n)}°.` : '';
    cap.innerHTML = `The yellow line shows how much the crest overlaps itself as it turns through 360°: further out means a closer match. ${peaks} Blue dashes mark mirror axes. Result: <b>${symText(sym)}</b>.`;
  }
  if (s === 'unit') {
    const n = sym.n === Infinity ? 36 : sym.n;
    if (n > 1) {
      pcsG.style.opacity = 0.12;
      const w = 360 / n, a0 = -90 - w / 2, R = 900;
      const P = (a) => `${(cx + R * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + R * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
      over.innerHTML = `<clipPath id="wedge"><path d="M${cx} ${cy}L${P(a0)}A${R} ${R} 0 ${w > 180 ? 1 : 0} 1 ${P(a0 + w)}Z"/></clipPath>` +
        Array.from({ length: n }, (_, k) => `<g class="cp" style="transform-origin:${cx}px ${cy}px;transform-box:view-box"><use href="#pcs" clip-path="url(#wedge)" fill="${k ? 'var(--shiro)' : 'var(--kihada)'}"/></g>`).join('') +
        `<path d="M${P(a0)}L${cx} ${cy}L${P(a0 + w)}" fill="none" stroke="var(--kihada)" stroke-width="5" stroke-dasharray="10 8"/>`;
      [...over.querySelectorAll('.cp')].forEach((g, k) => {
        if (!k) return;
        g.animate([{ transform: `rotate(${(k - 1) * w}deg)`, opacity: 0 }, { transform: `rotate(${k * w}deg)`, opacity: 1 }], { duration: reduced ? 0 : 600, delay: reduced ? 0 : 500 + k * (n > 12 ? 60 : 380), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
      });
      cap.innerHTML = sym.n === Infinity ? 'Any thin slice is the whole crest: a circle looks the same at every angle.' : `The yellow wedge is ${Math.round(w)}° of the crest. Turn it ${n} times and you have the whole thing.${sym.axes.length >= n ? ' Each wedge is also mirror-symmetric, so the true unit is half a wedge.' : ''}`;
    } else if (sym.axes.length) {
      pcsG.style.opacity = 0.12;
      const ax = sym.axes[0];
      over.innerHTML = `<clipPath id="half"><rect x="${cx}" y="-200" width="900" height="1400"/></clipPath>
        <g style="transform-origin:${cx}px ${cy}px;transform-box:view-box;transform:rotate(${ax - 90}deg)"><use href="#pcs" clip-path="url(#half)" fill="var(--kihada)"/><g class="mir" style="transform-origin:${cx}px ${cy}px;transform-box:view-box"><use href="#pcs" clip-path="url(#half)" fill="var(--shiro)"/></g>
        <line x1="${cx}" y1="-120" x2="${cx}" y2="1120" stroke="var(--aobana)" stroke-width="5" stroke-dasharray="14 10"/></g>`;
      $('.mir', over).animate([{ transform: 'scaleX(1)', opacity: 0.2 }, { transform: 'scaleX(-1)', opacity: 1 }], { duration: reduced ? 0 : 1200, delay: reduced ? 0 : 500, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
      cap.textContent = 'Only one mirror axis. The yellow half, flipped across the blue line, gives you the other half.';
    } else {
      cap.textContent = 'No part repeats exactly, so the whole crest is its own unit. Crests like this were drawn freehand, not built up from a repeated wedge.';
    }
  }
  if (s === 'compass' && c.recipe) {
    pcsG.style.opacity = 0.16;
    over.innerHTML = `<g transform="translate(500 500)"><svg x="-500" y="-500" width="1000" height="1000" viewBox="-500 -500 1000 1000" overflow="visible" id="cmp">${crestMarkup(c.recipe, { guides: true })}</svg></g>`;
    animateConstruction($('#cmp', over), { speed: 1.4, keepGuides: 0.35 });
    cap.innerHTML = `A rebuild using only circles and straight lines, the way crest painters lay them out. The faint shape underneath is the original. <button id="to-ws" class="text-btn">Open in the workshop</button>`;
    $('#to-ws').onclick = () => { ws.set({ ...DEFAULT, ...c.recipe }); $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => ws.draw(), reduced ? 0 : 700); };
  }
}
$('#steps').onclick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) setStep(b.dataset.step); };

// ================= WORKSHOP =================
// The crest sits in the middle like a sketch; four notes point into it and carry the main controls
// as vertical sliders. Everything else sits on the shelf underneath.
const ws = (() => {
  let spec = { ...DEFAULT };
  const svg = $('#ws-svg'), sketch = $('#ws-sketch'), shelf = $('#shelf'), leaders = $('#ws-leaders');
  const mini = (s) => `<svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(s)}</svg>`;
  const motifSpec = (k) => ({ enclosure: 'none', layout: 'single', motif: k, size: 0.85, aspect: k === 'uroko' ? 0.866 : 0.75, center: 'none' });
  const vslider = (key, label, min, max, st, unit = '') => `<label class="vs" data-for="${key}"><output></output><span class="vs-row"><span class="ruler" aria-hidden="true"></span><input class="v" type="range" name="${key}" min="${min}" max="${max}" step="${st}" aria-label="${label}"></span><small>${unit}</small></label>`;
  const hslider = (key, label, min, max, st) => `<label class="grp" data-for="${key}"><span class="k">${label}<output></output></span><input type="range" name="${key}" min="${min}" max="${max}" step="${st}"></label>`;
  const opts = (key, label, entries) => `<div class="grp" data-for="${key}"><span class="k" id="k-${key}">${label}</span><div class="opts" data-pick="${key}" role="group" aria-labelledby="k-${key}">${entries.map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="false">${v}</button>`).join('')}</div></div>`;
  const encName = (k) => (k === 'none' ? 'None' : ENCLOSURES[k].en.replace(/^in an? /, '').replace('tortoiseshell ', '').replace(' outline', ''));

  $('[data-pick="motif"]', sketch).innerHTML = Object.keys(MOTIFS).filter((k) => k !== 'none').map((k) => `<button type="button" data-v="${k}" aria-pressed="false" aria-label="${MOTIFS[k].en}" title="${MOTIFS[k].en}">${mini(motifSpec(k))}</button>`).join('');
  $('#count-sliders').innerHTML = vslider('n', 'How many', 1, 12, 1, 'count') + vslider('rows', 'Rows', 1, 4, 1, 'rows') + vslider('cols', 'Columns', 1, 4, 1, 'cols') + `<p class="vs fixed" data-for="fixed"><output></output><small>set by arrangement</small></p>`;
  $('#r-sliders').innerHTML = vslider('r', 'Distance from centre', 0, 0.9, 0.01, 'radius');
  $('#size-sliders').innerHTML = vslider('size', 'Motif size', 0.05, 1, 0.01, 'size');
  shelf.innerHTML = `
    ${opts('layout', 'Arrangement', Object.entries(LAYOUTS))}
    ${opts('enclosure', 'Enclosure', Object.keys(ENCLOSURES).map((k) => [k, encName(k)]))}
    ${hslider('lobes', 'Quince lobes', 4, 8, 1)}
    ${opts('center', 'Centre', Object.entries(CENTERS))}
    ${hslider('centerSize', 'Centre size', 0.03, 0.5, 0.01)}
    ${opts('overlay', 'Overlay', Object.entries(OVERLAYS))}
    ${hslider('rot', 'Turn', 0, 180, 1)}
    ${hslider('aspect', 'Stretch', 0.4, 1.6, 0.01)}
    ${hslider('dy', 'Shift down', -0.4, 0.4, 0.01)}
    ${opts('style', 'Style', [['hinata', 'Solid (hinata)'], ['kage', 'Outline (kage)']])}
    <div class="actions">
      <button type="button" class="primary" id="ws-draw">Draw with compass</button>
      <label class="check"><input type="checkbox" id="ws-guides" /> Show guides</label>
      <button type="button" id="ws-random">Surprise me</button>
      <button type="button" id="ws-download">Download SVG</button>
    </div>`;

  const root = $('#workshop');
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-pick] button'); if (!b) return; set({ ...spec, [b.parentElement.dataset.pick]: b.dataset.v }); });
  root.addEventListener('input', (e) => { const el = e.target; if (!el.name) return; set({ ...spec, [el.name]: el.type === 'range' ? +el.value : el.value }); });

  function sync() {
    root.querySelectorAll('[data-pick]').forEach((p) => p.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', spec[p.dataset.pick] === b.dataset.v)));
    root.querySelectorAll('input[type=range]').forEach((el) => { if (el.name in spec) { el.value = spec[el.name]; const o = el.closest('label')?.querySelector('output'); if (o) o.textContent = el.name === 'rot' ? `${spec.rot}°` : (+spec[el.name]).toFixed(el.step < 1 ? 2 : 0); } });
    $('#o-motif').textContent = MOTIFS[spec.motif]?.en || '';
    const ring = spec.layout === 'ring', grid = spec.layout === 'grid';
    const show = { n: ring, rows: grid, cols: grid, fixed: !ring && !grid, lobes: spec.enclosure === 'mokko', center: ring, centerSize: ring && spec.center !== 'none', rot: ring || spec.layout === 'single', aspect: ['hishi', 'uroko'].includes(spec.motif) };
    root.querySelectorAll('[data-for]').forEach((el) => { if (el.dataset.for in show) el.hidden = !show[el.dataset.for]; });
    $('[data-for="fixed"] output').textContent = spec.layout === 'mitsumori' ? 3 : spec.motif === 'none' ? 0 : 1;
    $('#count-label').textContent = grid ? 'Rows × columns' : 'How many';
    const r = $('input[name="r"]'); r.disabled = !ring;
  }

  // leader lines: from each note's inner edge to the part of the crest it controls
  function drawLeaders() {
    if (getComputedStyle(leaders).display === 'none') return;
    const box = sketch.getBoundingClientRect(), ctm = svg.getScreenCTM();
    if (!ctm || !box.width) return;
    const b = build(spec);
    const units = b.guides.filter((g) => g.step === 'motif' && g.c).map((g) => ({ x: g.c[0], y: g.c[1], s: g.c[2] }));
    const ctr = b.guides.find((g) => g.step === 'layout' && g.c)?.c || [0, spec.dy * 400];
    const pick = (dx, dy, fx, fy) => (units.length ? units.reduce((a, u) => (u.x * dx + u.y * dy > a.x * dx + a.y * dy ? u : a)) : { x: fx, y: fy, s: 60 });
    const toBox = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(ctm); return [p.x - box.left, p.y - box.top]; };
    const uTL = pick(-1, -1, -170, -170), uTR = pick(1, -1, 170, -170), uBL = pick(-1, 1, -170, 170), uBR = pick(1, 1, 170, 170);
    const targets = {
      motif: [uTL.x, uTL.y],
      count: [uTR.x, uTR.y],
      r: units.length ? [(ctr[0] + uBL.x) / 2, (ctr[1] + uBL.y) / 2] : [uBL.x, uBL.y],
      size: [uBR.x + uBR.s * 0.7, uBR.y + uBR.s * 0.7],
    };
    let out = '';
    sketch.querySelectorAll('.note').forEach((n) => {
      const lab = n.querySelector('.note-label').getBoundingClientRect(), left = n.classList.contains('tl') || n.classList.contains('bl');
      const ax = (left ? lab.right + 14 : lab.left - 14) - box.left, ay = lab.top + lab.height / 2 - box.top;
      const [tx, ty] = toBox(...targets[n.dataset.note]);
      const kx = ax + (left ? 28 : -28);
      out += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}H${kx.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}"/><circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4.5"/>`;
    });
    leaders.innerHTML = out;
  }

  function set(s) {
    spec = { ...DEFAULT, ...s };
    const b = build(spec);
    svg.innerHTML = crestMarkup(b, { guides: $('#ws-guides').checked });
    svg.setAttribute('aria-label', b.name.en);
    $('#ws-name').innerHTML = `<p class="tategaki" lang="ja">${b.name.jp}</p><p class="ro">${b.name.ro}</p><p class="en">${b.name.en}</p>`;
    sync();
    requestAnimationFrame(drawLeaders);
  }
  async function draw() {
    const b = build(spec);
    svg.innerHTML = crestMarkup(b, { guides: true });
    await animateConstruction(svg, { speed: 1, keepGuides: $('#ws-guides').checked ? 0.75 : 0 });
  }
  $('#ws-guides').onchange = () => set(spec);
  $('#ws-draw').onclick = draw;
  $('#ws-random').onclick = () => { set(randomSpec((Math.random() * 1e9) | 0)); draw(); };
  $('#ws-download').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([crestFile(spec)], { type: 'image/svg+xml' }));
    a.download = `kamon-${build(spec).name.ro.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    a.click();
  };
  new ResizeObserver(() => drawLeaders()).observe(sketch);
  document.fonts?.ready.then(drawLeaders);
  return { set, draw, get: () => spec };
})();

// ================= PATTERN =================
// A cloth of crests drawn by the grammar: two dozen designs repeated like a woven komon.
function weave(seed0) {
  const el = $('#weave'), n = 24;
  const defs = Array.from({ length: n }, (_, i) => `<symbol id="w${i}" viewBox="-500 -500 1000 1000">${crestMarkup(build(randomSpec(seed0 + i * 7919)))}</symbol>`).join('');
  const cells = Array.from({ length: 180 }, (_, i) => `<svg><use href="#w${(i * 7) % n}"/></svg>`).join('');
  el.innerHTML = `<svg width="0" height="0" style="position:absolute;width:0;height:0;margin:0">${defs}</svg>${cells}`;
}

// ---------- boot ----------
initBoard();
layout();
openAnatomy('oda', false);
ws.set({ ...DEFAULT, ...BY_KEY.akechi.recipe, enclosure: 'maru' });
weave(1600);
hero();
window.__kamon = { openAnatomy, setStep, ws, CLANS };
