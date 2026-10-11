import { CLANS } from './data.js';
import { t, lang, setLang, onLang, LANGS, clanText, describeZh } from './i18n.js';
import { build, MOTIFS, ENCLOSURES, LAYOUTS, CENTERS, OVERLAYS, DEFAULT, randomSpec, nameCount } from './grammar.js';
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

const SYM_KEYS = ['none', 'mirror', 'r2', 'r3', 'r4', 'r5', 'r6', 'r8', 'inf'];
const symText = (s) => (s.n === Infinity ? t('symInf') : s.n > 1 ? t('symRot', s.n, s.axes.length) : s.axes.length ? t('symOneMirror') : t('symNone'));

// ---------- small svg builders ----------
// overlap is stretched from its own minimum to 1 so every crest's peaks read clearly
const fpPath = (rot, r0 = 520, k = 95) => { const lo = Math.min(...rot); return 'M' + rot.map((v, i) => { const a = (i * 2 * Math.PI) / 180, rr = r0 + k * ((v - lo) / (1 - lo || 1)); return `${(500 + rr * Math.sin(a)).toFixed(1)} ${(500 - rr * Math.cos(a)).toFixed(1)}`; }).join('L') + 'Z'; };
const crestPath = (c) => `<path d="${c.data.d}" fill-rule="evenodd" fill="var(--shiro)"/>`;

// ================= HERO =================
let heroClan = null;
async function hero() {
  const svg = $('#hero-svg'), cap = $('#hero-cap');
  const seq = ['hosokawa', 'akechi', 'chosokabe', 'tokugawa', 'maeda', 'takeda', 'sanada', 'mori'].map((k) => BY_KEY[k]);
  for (let i = 0; ; i = (i + 1) % seq.length) {
    const c = seq[i];
    svg.innerHTML = crestMarkup(c.recipe, { guides: true });
    heroClan = c; cap.innerHTML = t('heroCap', clanText(c));
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
    b.innerHTML = `<svg viewBox="-130 -130 1260 1260" aria-hidden="true"><g class="fp"><circle cx="500" cy="500" r="520" fill="none" stroke="#2c4170" stroke-width="3"/><path d="${fpPath(c.data.rot)}" fill="none" stroke="var(--kihada)" stroke-width="12" stroke-linejoin="round"/></g><g class="crest">${crestPath(c)}</g></svg><span class="lbl"></span>`;
    b.onclick = () => openAnatomy(c.key, true);
    board.append(b);
  }
  relabelTiles();
  document.querySelectorAll('.seg button').forEach((btn) => btn.onclick = () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
    layout();
  });
  new ResizeObserver(() => layout()).observe(board);
}
function relabelTiles() {
  for (const b of board.querySelectorAll('.tile')) {
    const c = clanText(BY_KEY[b.dataset.key]);
    b.setAttribute('aria-label', `${c.houseEn} ${c.house}: ${c.mon}`);
    b.querySelector('.lbl').innerHTML = `<b lang="${lang === 'zh' ? 'zh-Hant' : 'ja'}">${c.house}</b>${c.houseEn}`;
  }
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
  const groups = mode === 'symmetry' ? SYM_KEYS.map((k) => [k, ...t('symGroups')[k]]) : Object.entries(t(mode === 'motif' ? 'motifGroups' : 'sides')).map(([k, v]) => [k, v, '']);
  const keyOf = (c) => (mode === 'symmetry' ? c.sym.key : mode === 'motif' ? c.motif : c.side);
  const biggest = Math.max(...groups.map(([gk]) => CLANS.filter((c) => keyOf(c) === gk).length));
  const narrow = W < 700, L = narrow ? 0 : 220, t = narrow ? Math.min(110, (W - gap * 2) / 3) : Math.max(96, Math.min(132, (W - L) / biggest - gap)), per = Math.max(1, Math.floor((W - L + gap) / (t + gap)));
  let y = 0;
  for (const [gk, name, sub] of groups) {
    const members = CLANS.filter((c) => keyOf(c) === gk);
    if (!members.length) continue;
    const lab = document.createElement('div');
    lab.className = 'row-label';
    const subText = sub || (mode === 'side' && gk === 'fallen' ? t('destroyedRange') : t('houses', members.length));
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
  stage.setAttribute('aria-label', t('stageAria', clanText(cur)));
  stage.innerHTML = `<defs><g id="pcs">${cur.data.pieces.map((p) => `<path d="${p.d}" fill-rule="evenodd"/>`).join('')}</g></defs>
    <g id="L-under"></g>
    <g id="L-pieces">${cur.data.pieces.map((p, i) => `<path class="pc" data-i="${i}" d="${p.d}" fill-rule="evenodd" pathLength="1" style="fill:var(--shiro);transition:transform .9s cubic-bezier(.6,0,.2,1), fill .6s, opacity .6s"/>`).join('')}</g>
    <g id="L-over"></g>`;
  setStep(step, true);
  if (scroll) $('#anatomy').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
function renderInfo() {
  const c = clanText(cur), d = c.data, groups = groupStats(d), en = lang === 'en';
  $('#info').innerHTML = `
    <p class="tategaki" aria-hidden="true">${c.mon}</p>
    <div>
      <h3>${en ? `${c.houseEn} <span lang="ja">${c.house}</span>` : `${c.house} <span>${c.houseEn}</span>`}</h3>
      <p class="romaji">${c.read}</p>
      <p class="gloss">${c.gloss}</p>
      <dl class="facts">
        <dt>${t('lord')}</dt><dd>${c.lord}</dd>
        <dt>${t('province')}</dt><dd>${c.province}</dd>
        <dt>${t('in1600')}</dt><dd>${c.side === 'fallen' ? t('destroyed', c.fell) : t('sides')[c.side]}</dd>
      </dl>
      <p class="note">${c.note}</p>
      <div class="stats">
        <div class="stat"><b>${d.components}</b><span>${t('statPieces')}</span></div>
        <div class="stat"><b>${c.sym.n === Infinity ? '∞' : c.sym.n > 1 ? `${c.sym.n}×` : c.sym.axes.length ? t('mirror') : t('none')}</b><span>${c.sym.n > 1 || c.sym.n === Infinity ? t('statRot') : t('statSym')}</span></div>
        <div class="stat"><b>${Math.round(d.ink * 100)}%</b><span>${t('statInk')}</span></div>
      </div>
      <p class="credit">${t('credit', c.credit)}</p>
    </div>
    <div class="strip" role="group" aria-label="${t('choose')}">${CLANS.map((x) => `<button data-key="${x.key}" aria-label="${clanText(x).house} ${x.houseEn}" aria-current="${x.key === c.key}"><svg viewBox="0 0 1000 1000">${crestPath(x)}</svg></button>`).join('')}</div>`;
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
  const c = clanText(cur), d = c.data, [cx, cy] = d.centroid, sym = c.sym, cap = $('#step-cap');

  if (s === 'whole') {
    cap.textContent = t('capWhole', c);
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
    cap.innerHTML = t('capPieces', d.components) +
      `<span class="legend">${groups.slice(0, 6).map((g, gi) => `<span><i style="background:${GROUP_COLORS[gi]}"></i>${t('matching', g.length)}</span>`).join('')}${singles ? `<span><i style="background:var(--shiro)"></i>${t('unique', singles)}</span>` : ''}${dust ? `<span>${t('tiny', dust.dust)}</span>` : ''}</span>`;
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
    const peaks = sym.n > 1 && sym.n !== Infinity ? t('peaks', Math.round(360 / sym.n)) : '';
    cap.innerHTML = t('capSym', peaks, symText(sym));
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
      cap.innerHTML = sym.n === Infinity ? t('unitInf') : t('unitWedge', Math.round(w), n, sym.axes.length >= n);
    } else if (sym.axes.length) {
      pcsG.style.opacity = 0.12;
      const ax = sym.axes[0];
      over.innerHTML = `<clipPath id="half"><rect x="${cx}" y="-200" width="900" height="1400"/></clipPath>
        <g style="transform-origin:${cx}px ${cy}px;transform-box:view-box;transform:rotate(${ax - 90}deg)"><use href="#pcs" clip-path="url(#half)" fill="var(--kihada)"/><g class="mir" style="transform-origin:${cx}px ${cy}px;transform-box:view-box"><use href="#pcs" clip-path="url(#half)" fill="var(--shiro)"/></g>
        <line x1="${cx}" y1="-120" x2="${cx}" y2="1120" stroke="var(--aobana)" stroke-width="3" stroke-dasharray="14 10"/></g>`;
      $('.mir', over).animate([{ transform: 'scaleX(1)', opacity: 0.2 }, { transform: 'scaleX(-1)', opacity: 1 }], { duration: reduced ? 0 : 1200, delay: reduced ? 0 : 500, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
      cap.textContent = t('unitMirror');
    } else {
      cap.textContent = t('unitNone');
    }
  }
  if (s === 'compass' && c.recipe) {
    pcsG.style.opacity = 0.16;
    over.innerHTML = `<g transform="translate(500 500)"><svg x="-500" y="-500" width="1000" height="1000" viewBox="-500 -500 1000 1000" overflow="visible" id="cmp">${crestMarkup(c.recipe, { guides: true })}</svg></g>`;
    animateConstruction($('#cmp', over), { speed: 1.4, keepGuides: 0.35 });
    cap.innerHTML = `${t('capCompass')} ${c.fit ? t('match', Math.round(c.fit * 100)) : ''} <button id="to-ws">${t('toWs')}</button>`;
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
  const renderForm = () => { form.innerHTML = `
    <div class="ctl"><span>${t('cMotif')}</span><div class="picker" data-pick="motif">${Object.keys(MOTIFS).filter((k) => k !== 'none').map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${mini(motifSpec(k))}${t('motifs')[k]}</button>`).join('')}</div></div>
    <div class="ctl"><span>${t('cLayout')}</span><div class="seg" data-pick="layout">${Object.keys(LAYOUTS).map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${t('layouts')[k]}</button>`).join('')}</div></div>
    ${slider('n', t('cN'), 1, 12, 1)}${slider('rows', t('cRows'), 1, 4, 1)}${slider('cols', t('cCols'), 1, 4, 1)}
    ${slider('r', t('cR'), 0, 0.9, 0.01)}${slider('size', t('cSize'), 0.05, 1, 0.01)}${slider('rot', t('cRot'), 0, 180, 1)}${slider('aspect', t('cAspect'), 0.4, 1.6, 0.01)}${slider('dy', t('cDy'), -0.4, 0.4, 0.01)}
    <div class="ctl"><span>${t('cEnc')}</span><div class="picker" data-pick="enclosure">${Object.keys(ENCLOSURES).map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${mini(encSpec(k))}${t('encs')[k]}</button>`).join('')}</div></div>
    ${slider('lobes', t('cLobes'), 4, 8, 1)}
    <label class="ctl" data-for="center"><span>${t('cCenter')}</span><select name="center">${Object.keys(CENTERS).map((k) => `<option value="${k}">${t('centers')[k]}</option>`).join('')}</select></label>
    ${slider('centerSize', t('cCenterSize'), 0.03, 0.5, 0.01)}
    <label class="ctl"><span>${t('cOverlay')}</span><select name="overlay">${Object.keys(OVERLAYS).map((k) => `<option value="${k}">${t('overlays')[k]}</option>`).join('')}</select></label>
    <div class="ctl"><span>${t('cStyle')}</span><div class="seg" data-pick="style"><button type="button" data-v="hinata" aria-pressed="false">${t('hinata')}</button><button type="button" data-v="kage" aria-pressed="false">${t('kage')}</button></div></div>`; };
  renderForm();
  form.addEventListener('click', (e) => { const b = e.target.closest('[data-pick] button'); if (!b) return; const k = b.parentElement.dataset.pick, next = { ...spec, [k]: b.dataset.v };
    // settings tuned for one historical crest don't carry over to a different enclosure or motif
    if (k === 'enclosure') for (const x of ['ringW', 'innerRing', 'clip', 'mokkoFill', 'lobeR', 'holeR']) delete next[x];
    if (k === 'motif') for (const x of ['spin', 'centerSpin']) delete next[x];
    set(next); });
  form.addEventListener('input', (e) => { const el = e.target; if (!el.name) return; set({ ...spec, [el.name]: el.type === 'range' ? +el.value : el.value }); });
  function sync() {
    form.querySelectorAll('[data-pick]').forEach((p) => p.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', spec[p.dataset.pick] === b.dataset.v)));
    form.querySelectorAll('input, select').forEach((el) => { if (el.name in spec) { el.value = spec[el.name]; const o = el.closest('label')?.querySelector('output'); if (o) o.textContent = el.name === 'rot' ? `${spec.rot}°` : (+spec[el.name]).toFixed(el.step < 1 ? 2 : 0); } });
    const show = { n: spec.layout === 'ring', rows: spec.layout === 'grid', cols: spec.layout === 'grid', r: spec.layout === 'ring', rot: spec.layout === 'ring' || spec.layout === 'single', aspect: ['hishi', 'uroko', 'kikyo', 'karahana', 'aoi', 'katabami'].includes(spec.motif), lobes: spec.enclosure === 'mokko', center: spec.layout === 'ring', centerSize: spec.layout === 'ring' && spec.center !== 'none', dy: spec.layout !== 'ring' || true };
    form.querySelectorAll('[data-for]').forEach((el) => (el.hidden = show[el.dataset.for] === false));
  }
  function set(s) {
    spec = { ...DEFAULT, ...s };
    const b = build(spec);
    svg.innerHTML = crestMarkup(b, { guides: $('#ws-guides').checked });
    const sub = lang === 'en' ? b.name.en : lang === 'zh' ? describeZh(spec, nameCount(spec)) : '';
    svg.setAttribute('aria-label', sub || b.name.jp);
    $('#ws-name').innerHTML = `<p class="tategaki" lang="ja">${b.name.jp}</p><p class="ro">${b.name.ro}</p>${sub ? `<p class="en">${sub}</p>` : ''}`;
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
  return { set, draw, get: () => spec, relabel: () => { renderForm(); set(spec); } };
})();

let fieldSeed = 1600;
function field(seed0) {
  fieldSeed = seed0;
  const el = $('#field');
  el.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const spec = randomSpec(seed0 + i * 7919), b = build(spec);
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', t('openWs', lang === 'en' ? b.name.en : lang === 'zh' ? describeZh(spec, nameCount(spec)) : b.name.jp));
    btn.innerHTML = `<svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(b)}</svg><span lang="ja">${b.name.jp}</span>`;
    btn.onclick = () => { ws.set(spec); $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => ws.draw(), reduced ? 0 : 600); };
    el.append(btn);
  }
}
$('#field-again').onclick = () => field((Math.random() * 1e9) | 0);

// ---------- language ----------
function applyStatic() {
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  const sw = $('#lang-switch');
  sw.setAttribute('aria-label', t('langLabel'));
  sw.innerHTML = LANGS.map(([k, label]) => `<button type="button" data-lang="${k}" lang="${k === 'zh' ? 'zh-Hant' : k}" aria-pressed="${k === lang}">${label}</button>`).join('');
}
$('#lang-switch').onclick = (e) => { const b = e.target.closest('button'); if (b) setLang(b.dataset.lang); };
onLang(() => {
  applyStatic(); relabelTiles(); layout(); renderInfo(); setStep(step); ws.relabel(); field(fieldSeed);
  if (heroClan) $('#hero-cap').innerHTML = t('heroCap', clanText(heroClan));
});

// ---------- boot ----------
applyStatic();
initBoard();
layout();
openAnatomy('oda', false);
ws.set({ ...DEFAULT, ...BY_KEY.akechi.recipe, enclosure: 'maru' });
field(1600);
hero();
window.__kamon = { openAnatomy, setStep, ws, CLANS };
