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
async function hero() {
  const svg = $('#hero-svg'), cap = $('#hero-cap');
  const seq = ['hosokawa', 'akechi', 'chosokabe', 'tokugawa', 'maeda', 'takeda', 'sanada', 'mori'].map((k) => BY_KEY[k]);
  for (let i = 0; ; i = (i + 1) % seq.length) {
    const c = seq[i];
    svg.innerHTML = crestMarkup(c.recipe, { guides: true });
    cap.innerHTML = `<b>${c.mon}</b>${c.monEn}, the ${c.houseEn} crest`;
    await animateConstruction(svg, { speed: 1, keepGuides: 0.18 });
    if (reduced) return;
    await sleep(2600);
    await svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished;
    svg.getAnimations().forEach((a) => a.cancel());
  }
}

// ================= GALLERY =================
const board = $('#board');
let mode = 'grid', active = 'oda';
function initBoard() {
  for (const c of CLANS) {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.key = c.key;
    b.setAttribute('aria-label', `${c.houseEn}: ${c.monEn}`);
    b.innerHTML = `<svg viewBox="-130 -130 1260 1260" aria-hidden="true"><g class="fp"><circle cx="500" cy="500" r="520" fill="none" stroke="#2c4170" stroke-width="3"/><path d="${fpPath(c.data.rot)}" fill="none" stroke="var(--kihada)" stroke-width="12" stroke-linejoin="round"/></g><g class="crest">${crestPath(c)}</g></svg><span class="lbl"><b>${c.house}</b>${c.houseEn}</span>`;
    b.onclick = () => openAnatomy(c.key, true);
    board.append(b);
  }
  document.querySelectorAll('.seg button').forEach((btn) => btn.onclick = () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
    layout();
  });
  new ResizeObserver(() => layout()).observe(board);
}
function layout() {
  board.dataset.mode = mode;
  board.querySelectorAll('.row-label').forEach((l) => l.remove());
  const W = board.clientWidth, gap = 18, tiles = [...board.querySelectorAll('.tile')];
  const lblH = 52;
  if (mode === 'grid') {
    const cols = W > 1100 ? 5 : W > 760 ? 4 : W > 480 ? 3 : 2, t = (W - gap * (cols - 1)) / cols;
    const tileH = t + lblH;
    tiles.forEach((el, i) => { el.style.setProperty('--t', `${t}px`); el.style.transform = `translate(${(i % cols) * (t + gap)}px, ${Math.floor(i / cols) * (tileH + gap)}px)`; });
    board.style.height = `${Math.ceil(tiles.length / cols) * (tileH + gap)}px`;
    return;
  }
  const groups = mode === 'symmetry' ? SYM_GROUPS : mode === 'motif' ? Object.entries(MOTIF_LABEL).map(([k, v]) => [k, v, '']) : Object.entries(SIDE_LABEL).map(([k, v]) => [k, v, '']);
  const keyOf = (c) => (mode === 'symmetry' ? c.sym.key : mode === 'motif' ? c.motif : c.side);
  const biggest = Math.max(...groups.map(([gk]) => CLANS.filter((c) => keyOf(c) === gk).length));
  const narrow = W < 700, L = narrow ? 0 : 220, t = narrow ? Math.min(110, (W - gap * 2) / 3) : Math.max(96, Math.min(132, (W - L) / biggest - gap)), per = Math.max(1, Math.floor((W - L + gap) / (t + gap)));
  let y = 0;
  for (const [gk, name, sub] of groups) {
    const members = CLANS.filter((c) => keyOf(c) === gk);
    if (!members.length) continue;
    const lab = document.createElement('div');
    lab.className = 'row-label';
    const subText = sub || (mode === 'side' && gk === 'fallen' ? 'Destroyed in 1560–1590' : `${members.length} ${members.length > 1 ? 'houses' : 'house'}`);
    lab.innerHTML = `<b>${name}</b><span>${subText}</span>`;
    lab.style.transform = `translate(0, ${y + (narrow ? 0 : t * 0.3)}px)`;
    board.append(lab);
    if (narrow) y += 56;
    members.forEach((c, i) => {
      const el = board.querySelector(`.tile[data-key="${c.key}"]`);
      el.style.setProperty('--t', `${t}px`);
      el.style.transform = `translate(${L + (i % per) * (t + gap)}px, ${y + Math.floor(i / per) * (t + lblH + gap)}px)`;
    });
    y += Math.ceil(members.length / per) * (t + lblH + gap) + 14;
  }
  board.style.height = `${y}px`;
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
  stage.setAttribute('viewBox', '-130 -130 1260 1260');
  stage.setAttribute('aria-label', `${cur.monEn}, crest of the ${cur.houseEn}`);
  stage.innerHTML = `<defs><g id="pcs">${cur.data.pieces.map((p) => `<path d="${p.d}" fill-rule="evenodd"/>`).join('')}</g></defs>
    <g id="L-under"></g>
    <g id="L-pieces">${cur.data.pieces.map((p, i) => `<path class="pc" data-i="${i}" d="${p.d}" fill-rule="evenodd" pathLength="1" style="fill:var(--shiro);transition:transform .9s cubic-bezier(.6,0,.2,1), fill .6s, opacity .6s"/>`).join('')}</g>
    <g id="L-over"></g>`;
  setStep(step, true);
  if (scroll) $('#anatomy').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
function renderInfo() {
  const c = cur, d = c.data, groups = groupStats(d);
  $('#info').innerHTML = `
    <p class="tategaki" aria-hidden="true">${c.mon}</p>
    <div>
      <h3>${c.houseEn} <span lang="ja">${c.house}</span></h3>
      <p class="romaji">${c.monEn}</p>
      <p class="gloss">${c.gloss}</p>
      <dl class="facts">
        <dt>Lord</dt><dd>${c.lord}</dd>
        <dt>Province</dt><dd>${c.province}</dd>
        <dt>In 1600</dt><dd>${c.side === 'fallen' ? `Destroyed in ${c.fell}` : SIDE_LABEL[c.side]}</dd>
      </dl>
      <p class="note">${c.note}</p>
      <div class="stats">
        <div class="stat"><b>${d.components}</b><span>separate pieces of ink</span></div>
        <div class="stat"><b>${c.sym.n === Infinity ? '∞' : c.sym.n > 1 ? `${c.sym.n}×` : c.sym.axes.length ? 'Mirror' : 'None'}</b><span>${c.sym.n > 1 || c.sym.n === Infinity ? 'rotational symmetry' : 'symmetry'}</span></div>
        <div class="stat"><b>${Math.round(d.ink * 100)}%</b><span>of its square is ink</span></div>
      </div>
      <p class="credit">Source: <a href="${c.credit.page}">${c.credit.file}</a> by ${c.credit.artist || c.credit.uploader}, ${c.credit.license}. Re-traced here.</p>
    </div>
    <div class="strip" role="group" aria-label="Choose a crest">${CLANS.map((x) => `<button data-key="${x.key}" aria-label="${x.houseEn}" aria-current="${x.key === c.key}"><svg viewBox="0 0 1000 1000">${crestPath(x)}</svg></button>`).join('')}</div>`;
  $('#info .strip').onclick = (e) => { const b = e.target.closest('button'); if (b) openAnatomy(b.dataset.key, false); };
  void groups;
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
    over.innerHTML = `<circle cx="500" cy="500" r="520" fill="none" stroke="#2c4170" stroke-width="2"/><circle cx="500" cy="500" r="615" fill="none" stroke="#2c4170" stroke-width="2" stroke-dasharray="4 8"/>
      <path class="fp" d="${fpPath(d.rot)}" fill="none" stroke="var(--kihada)" stroke-width="5" stroke-linejoin="round" pathLength="1"/>
      ${sym.axes.map((a) => { const r = (a * Math.PI) / 180, dx = Math.cos(r) * 640, dy = Math.sin(r) * 640; return `<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" stroke="var(--aobana)" stroke-width="3" stroke-dasharray="14 10"/>`; }).join('')}
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
        `<path d="M${P(a0)}L${cx} ${cy}L${P(a0 + w)}" fill="none" stroke="var(--kihada)" stroke-width="3" stroke-dasharray="10 8"/>`;
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
        <line x1="${cx}" y1="-120" x2="${cx}" y2="1120" stroke="var(--aobana)" stroke-width="3" stroke-dasharray="14 10"/></g>`;
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
    cap.innerHTML = `A rebuild using only circles and straight lines, the way crest painters lay them out. The faint shape underneath is the original. <button id="to-ws">Open in the workshop</button>`;
    $('#to-ws').onclick = () => { ws.set({ ...DEFAULT, ...c.recipe }); $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => ws.draw(), reduced ? 0 : 700); };
  }
}
$('#steps').onclick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) setStep(b.dataset.step); };

// ================= WORKSHOP =================
const ws = (() => {
  let spec = { ...DEFAULT };
  const svg = $('#ws-svg'), form = $('#controls');
  const mini = (s) => `<svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(s)}</svg>`;
  const motifSpec = (k) => ({ enclosure: 'none', layout: 'single', motif: k, size: 0.85, aspect: k === 'uroko' ? 0.866 : 0.75, center: 'none' });
  const encSpec = (k) => ({ enclosure: k, layout: 'single', motif: k === 'none' ? 'hoshi' : 'none', size: 0.3, lobes: 4 });
  const slider = (key, label, min, max, st) => `<label class="ctl" data-for="${key}"><span>${label}<output></output></span><input type="range" name="${key}" min="${min}" max="${max}" step="${st}"></label>`;
  form.innerHTML = `
    <div class="ctl"><span>Motif</span><div class="picker" data-pick="motif">${Object.keys(MOTIFS).filter((k) => k !== 'none').map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${mini(motifSpec(k))}${MOTIFS[k].en}</button>`).join('')}</div></div>
    <div class="ctl"><span>Arrangement</span><div class="seg" data-pick="layout">${Object.entries(LAYOUTS).map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="false">${v}</button>`).join('')}</div></div>
    ${slider('n', 'How many', 1, 12, 1)}${slider('rows', 'Rows', 1, 4, 1)}${slider('cols', 'Columns', 1, 4, 1)}
    ${slider('r', 'Distance from centre', 0, 0.9, 0.01)}${slider('size', 'Motif size', 0.05, 1, 0.01)}${slider('rot', 'Turn', 0, 180, 1)}${slider('aspect', 'Stretch', 0.4, 1.6, 0.01)}${slider('dy', 'Shift down', -0.4, 0.4, 0.01)}
    <div class="ctl"><span>Enclosure</span><div class="picker" data-pick="enclosure">${Object.keys(ENCLOSURES).map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${mini(encSpec(k))}${k === 'none' ? 'none' : ENCLOSURES[k].en.replace(/^in an? /, '').replace('tortoiseshell ', '').replace(' outline', '')}</button>`).join('')}</div></div>
    ${slider('lobes', 'Quince lobes', 4, 8, 1)}
    <label class="ctl" data-for="center"><span>Centre</span><select name="center">${Object.entries(CENTERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    ${slider('centerSize', 'Centre size', 0.03, 0.5, 0.01)}
    <label class="ctl"><span>Overlay</span><select name="overlay">${Object.entries(OVERLAYS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <div class="ctl"><span>Style</span><div class="seg" data-pick="style"><button type="button" data-v="hinata" aria-pressed="false">Solid (hinata)</button><button type="button" data-v="kage" aria-pressed="false">Outline (kage)</button></div></div>`;
  form.addEventListener('click', (e) => { const b = e.target.closest('[data-pick] button'); if (!b) return; set({ ...spec, [b.parentElement.dataset.pick]: b.dataset.v }); });
  form.addEventListener('input', (e) => { const el = e.target; if (!el.name) return; set({ ...spec, [el.name]: el.type === 'range' ? +el.value : el.value }); });
  function sync() {
    form.querySelectorAll('[data-pick]').forEach((p) => p.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', spec[p.dataset.pick] === b.dataset.v)));
    form.querySelectorAll('input, select').forEach((el) => { if (el.name in spec) { el.value = spec[el.name]; const o = el.closest('label')?.querySelector('output'); if (o) o.textContent = el.name === 'rot' ? `${spec.rot}°` : (+spec[el.name]).toFixed(el.step < 1 ? 2 : 0); } });
    const show = { n: spec.layout === 'ring', rows: spec.layout === 'grid', cols: spec.layout === 'grid', r: spec.layout === 'ring', rot: spec.layout === 'ring' || spec.layout === 'single', aspect: ['hishi', 'uroko'].includes(spec.motif), lobes: spec.enclosure === 'mokko', center: spec.layout === 'ring', centerSize: spec.layout === 'ring' && spec.center !== 'none', dy: spec.layout !== 'ring' || true };
    form.querySelectorAll('[data-for]').forEach((el) => (el.hidden = show[el.dataset.for] === false));
  }
  function set(s) {
    spec = { ...DEFAULT, ...s };
    const b = build(spec);
    svg.innerHTML = crestMarkup(b, { guides: $('#ws-guides').checked });
    svg.setAttribute('aria-label', `${b.name.en}`);
    $('#ws-name').innerHTML = `<p class="tategaki" lang="ja">${b.name.jp}</p><p class="ro">${b.name.ro}</p><p class="en">${b.name.en}</p>`;
    sync();
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
  return { set, draw, get: () => spec };
})();

function field(seed0) {
  const el = $('#field');
  el.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const spec = randomSpec(seed0 + i * 7919), b = build(spec);
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', `${b.name.en}: open in workshop`);
    btn.innerHTML = `<svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(b)}</svg><span lang="ja">${b.name.jp}</span>`;
    btn.onclick = () => { ws.set(spec); $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => ws.draw(), reduced ? 0 : 600); };
    el.append(btn);
  }
}
$('#field-again').onclick = () => field((Math.random() * 1e9) | 0);

// ---------- boot ----------
initBoard();
layout();
openAnatomy('oda', false);
ws.set({ ...DEFAULT, ...BY_KEY.akechi.recipe, enclosure: 'maru' });
field(1600);
hero();
window.__kamon = { openAnatomy, setStep, ws, CLANS };
