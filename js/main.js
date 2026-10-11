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

// ================= ARRIVAL =================
// Each section's titles, menus and notes rise into place the first time it comes into view.
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  e.target.dispatchEvent(new CustomEvent('arrive'));
  io.unobserve(e.target);
}), { threshold: 0.2 });
document.querySelectorAll('.hero, .frame').forEach((s) => {
  s.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--d', `${i * 120}ms`));
  io.observe(s);
});

// Shared-element move: the crest you pick flies to where it lands (View Transitions, where supported).
function morph(fromEl, toEl, update) {
  if (!document.startViewTransition || reduced || !fromEl) { update(); return; }
  fromEl.style.viewTransitionName = 'crest';
  const vt = document.startViewTransition(() => { fromEl.style.viewTransitionName = ''; update(); toEl.style.viewTransitionName = 'crest'; });
  vt.finished.finally(() => { toEl.style.viewTransitionName = ''; });
}

// ================= HERO =================
// S6: the Oda crest draws itself once, low on the centre line. Scrolling pins the hero for one screen while the crest
// rises into full view, turning one step of its own symmetry (72°), and the words step aside. Scrolling on, the
// crest shrinks into its place among the twenty houses and the other nineteen are dealt out from it, nearest first.
const HERO = BY_KEY.oda;
const heroMotion = !reduced && matchMedia('(min-width: 1101px)');
const lerp = (a, b, t) => a + (b - a) * t, clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeHero = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function hero() {
  const svg = $('#hero-svg');
  svg.innerHTML = crestMarkup(HERO.recipe, { guides: true });
  $('#hero-traced').innerHTML = crestPath(HERO);
  $('#hero-cap').innerHTML = `<b lang="ja">${HERO.mon}</b>${HERO.monEn}, the ${HERO.houseEn} crest`;
  animateConstruction(svg, { speed: 1, keepGuides: 0.18 });
}
(() => {
  const track = $('.hero-track'), fig = $('.hero-crest'), built = $('#hero-svg'), traced = $('#hero-traced'), gallery = $('#gallery');
  const words = $('.hero-words'), late = [$('.hero-kanji'), $('.hero-nav')], cue = $('.cue');
  let on = false, queued = false;
  const centre = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; };
  const aside = (el, t) => { el.style.opacity = 1 - t; el.style.translate = `0 ${(-96 * t).toFixed(1)}px`; };
  function frame() {
    queued = false;
    const vh = innerHeight, vw = document.documentElement.clientWidth, y = scrollY;
    const pinEnd = track.offsetTop + track.offsetHeight - vh;
    const p = clamp01((y - track.offsetTop) / (pinEnd - track.offsetTop));
    const q = clamp01((y - pinEnd) / Math.max(1, gallery.offsetTop - pinEnd));
    // the rise
    aside(words, easeHero(clamp01(p / 0.6)));
    late.forEach((el) => aside(el, easeHero(clamp01((p - 0.07) / 0.6))));
    cue.style.opacity = 1 - clamp01(p / 0.13);
    const cs = Math.min(vw * 0.486, vh * 0.78), a = easeHero(p);
    let cx = vw / 2, cy = lerp(0.52 * vh + cs / 2, vh / 2, a), size = cs, rot = 72 * a;
    // the deal: the crest lands on its own tile; the others fly out from under it
    const tiles = [...$('#board').querySelectorAll('.tile')], home = tiles.find((t) => t.dataset.key === HERO.key);
    const [hx, hy, hw] = centre(home.querySelector('svg'));
    if (q > 0) { const t = easeHero(q); cx = lerp(cx, hx, t); cy = lerp(cy, hy, t); size = lerp(cs, hw, t); rot = 72 + 72 * t; }
    fig.style.width = `${size}px`;
    fig.style.transform = `translate(${(cx - size / 2).toFixed(1)}px, ${(cy - size / 2).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    fig.style.visibility = q >= 1 ? 'hidden' : '';
    built.style.opacity = 1 - clamp01(q * 1.6);
    traced.style.opacity = clamp01(q * 1.6 - 0.3);
    home.style.opacity = q >= 1 ? '' : 0;
    $('#board').classList.toggle('dealing', q < 1);
    const order = tiles.filter((t) => t !== home).map((t) => { const [x, y0] = centre(t.querySelector('svg')); const dx = +(t._dx || 0), dy = +(t._dy || 0); return { t, bx: x - dx, by: y0 - dy }; })
      .sort((m, n) => Math.hypot(m.bx - hx, m.by - hy) - Math.hypot(n.bx - hx, n.by - hy));
    order.forEach(({ t, bx, by }, k) => {
      const e = easeHero(clamp01((q - 0.3 * (k / order.length)) / 0.7));
      if (e >= 1) { t.style.translate = t.style.scale = t.style.opacity = ''; t._dx = t._dy = 0; return; }
      t._dx = (cx - bx) * (1 - e); t._dy = (cy - by) * (1 - e);
      t.style.translate = `${t._dx.toFixed(1)}px ${t._dy.toFixed(1)}px`;
      t.style.scale = lerp(0.3, 1, e).toFixed(3);
      t.style.opacity = e.toFixed(3);
    });
  }
  const queue = () => { if (on && !queued) { queued = true; requestAnimationFrame(frame); } };
  const reset = () => {
    [words, ...late, cue, fig, built, traced].forEach((el) => el.removeAttribute('style'));
    $('#board').querySelectorAll('.tile').forEach((t) => { t.style.translate = t.style.scale = t.style.opacity = ''; t._dx = t._dy = 0; });
    $('#board').classList.remove('dealing');
  };
  const toggle = () => { on = !!heroMotion && heroMotion.matches; document.documentElement.classList.toggle('hero-motion', on); if (on) queue(); else reset(); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  heroMotion && heroMotion.addEventListener('change', toggle);
  toggle();
  window.__heroFrame = queue;
})();

// ================= TWENTY HOUSES =================
const board = $('#board');
let mode = 'grid', active = 'oda';
const SEKIGAHARA = 'Hideyoshi died in 1598, leaving a five-year-old heir. Tokugawa Ieyasu began to rule alone, and Ishida Mitsunari rallied the Toyotomi loyalists against him. On 21 October 1600 the two armies met at Sekigahara. Defections turned the day, and Ieyasu was shōgun three years later.';
const MODES = {
  grid: ['二十の家', 'Twenty houses . 1560–1600', '+ Pick a house'],
  symmetry: ['対称', 'By symmetry . how each crest repeats', '+ Pick a house'],
  motif: ['紋様', 'By motif . what each crest shows', '+ Pick a house'],
  side: ['関ヶ原', 'At Sekigahara . 1600', SEKIGAHARA],
};
const SYM_COLS = [['none', 'None', 'freehand'], ['mirror', 'Mirror', 'one fold'], ['r2', '2-fold', '180°'], ['r3', '3-fold', '120°'], ['r4', '4-fold', '90°'], ['r5', '5-fold', '72°'], ['r6', '6-fold', '60°'], ['r8', '8-fold', '45°'], ['inf', 'Circle', 'any angle']];
function initBoard() {
  CLANS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.key = c.key;
    b.setAttribute('aria-label', `${c.houseEn}: ${c.monEn}`);
    b.innerHTML = `<svg viewBox="0 0 1000 1000" aria-hidden="true"><g class="crest">${crestPath(c)}</g></svg><span class="lbl"><i>${String(i + 1).padStart(2, '0')}</i>${c.houseEn}</span>`;
    b.onclick = () => goToHouse(c.key, b.querySelector('svg'));
    board.append(b);
  });
  document.querySelectorAll('#gallery .vmenu button').forEach((btn) => btn.onclick = () => {
    if (mode === btn.dataset.mode) return;
    mode = btn.dataset.mode;
    document.querySelectorAll('#gallery .vmenu button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
    const t = $('#g-title');
    if (!reduced) t.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' });
    layout();
  });
  new ResizeObserver(() => layout()).observe(board);
}
function layout() {
  const [jp, en, note] = MODES[mode];
  $('#g-jp').textContent = jp; $('#g-en').textContent = en;
  const fn = $('#g-note'); fn.textContent = note; fn.classList.toggle('story-mode', mode === 'side');
  board.classList.toggle('quiet', mode === 'symmetry' || mode === 'motif');
  board.querySelectorAll('.row-label').forEach((l) => l.remove());
  const W = board.clientWidth, H = board.clientHeight > 240 ? board.clientHeight : 640, lblH = 26;
  const tile = (c) => board.querySelector(`.tile[data-key="${c.key}"]`);
  const place = (c, x, y, t, gone = false) => { const el = tile(c); el.style.setProperty('--t', `${t}px`); el.style.transform = `translate(${x}px, ${y}px)`; el.classList.toggle('gone', gone); el.tabIndex = gone ? -1 : 0; };
  const label = (html, x, y, w) => { const l = document.createElement('div'); l.className = 'row-label'; l.innerHTML = html; l.style.width = `${w}px`; l.style.transform = `translate(${x}px, ${y}px)`; board.append(l); };
  if (mode === 'grid') {
    // five across, read from the right, like a page of a crest book
    const cols = W > 560 ? 5 : W > 400 ? 4 : 3, rows = Math.ceil(CLANS.length / cols), cell = W / cols, gap = 24;
    const t = Math.max(48, Math.min(cell - 24, (H - rows * (lblH + gap) + gap) / rows, 104));
    const total = rows * (t + lblH + gap) - gap, y0 = Math.max(0, (H - total) / 2);
    CLANS.forEach((c, i) => place(c, W - ((i % cols) + 1) * cell + (cell - t) / 2, y0 + Math.floor(i / cols) * (t + lblH + gap), t));
  } else if (mode === 'symmetry' || mode === 'motif') {
    // one column per group, right to left, like lines of vertical text
    const keyOf = (c) => (mode === 'symmetry' ? c.sym.key : c.motif);
    const groups = (mode === 'symmetry' ? SYM_COLS : Object.entries(MOTIF_LABEL).map(([k, v]) => [k, v, ''])).map(([k, name, sub]) => [name, sub, CLANS.filter((c) => keyOf(c) === k)]).filter((g) => g[2].length);
    const colW = W / groups.length, maxN = Math.max(...groups.map((g) => g[2].length)), labH = 48, vg = 8;
    const t = Math.max(28, Math.min(colW - 16, (H - labH) / maxN - vg, 88));
    const total = labH + maxN * (t + vg) - vg, y0 = Math.max(0, (H - total) / 2);
    groups.forEach(([name, sub, members], gi) => {
      const x0 = W - (gi + 1) * colW;
      label(`<b>${name}</b><span>${sub || `${members.length} ${members.length > 1 ? 'houses' : 'house'}`}</span>`, x0, y0, colW);
      members.forEach((c, i) => place(c, x0 + (colW - t) / 2, y0 + labH + i * (t + vg), t));
    });
  } else {
    // Sekigahara: the West on the left, the East on the right, the Sanada on the line between them
    const by = (k) => CLANS.filter((c) => c.side === k);
    const labH = 56, S = Math.min(W / 7, (H - labH) / 4, 132), t = Math.min(S - lblH - 8, S * 0.62), CX = W / 2;
    const total = labH + 4 * S, y0 = Math.max(0, (H - total) / 2), top = y0 + labH;
    const at = (cx, row) => [cx - t / 2, top + row * S];
    by('west').forEach((c, i) => place(c, ...at(CX - (3 - (i % 2)) * S, Math.floor(i / 2)), t));
    by('east').forEach((c, i) => place(c, ...at(CX + (2 + (i % 2)) * S, Math.floor(i / 2)), t));
    by('split').forEach((c) => place(c, ...at(CX, 1.5), t));
    by('fallen').forEach((c) => place(c, CX - t / 2, top + 1.5 * S, t, true));
    label('<b lang="ja">西軍</b><span>West</span>', CX - 2.5 * S - 60, y0, 120);
    label('<b lang="ja">東軍</b><span>East</span>', CX + 2.5 * S - 60, y0, 120);
    label('<b lang="ja">両方</b><span>Both sides</span>', CX - 60, top + 1.5 * S - labH, 120);
  }
}

// ================= TAKEN APART =================
const stage = $('#stage');
let step = 'whole', cur = null, quietDraw = false, storyTimer = 0;
const GROUP_COLORS = ['var(--g0)', 'var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)'];
// Taken apart is a sheet that slides in from the right over the twenty houses, so the scroll stays
// houses → workshop. The picked crest flies from its tile to the stage; closing flies it home.
const sheet = $('#anatomy'), scrim = $('#scrim');
let returnTo = null;
function setSheet(open) {
  sheet.classList.toggle('open', open); scrim.classList.toggle('on', open);
  document.documentElement.classList.toggle('sheet-open', open);
  sheet.inert = !open;
  document.querySelectorAll('body > header, body > main, body > footer').forEach((el) => { el.inert = open; });
  if (open) sheet.scrollTop = 0;
}
function sheetMove(fromEl, toEl, update, done) {
  if (!document.startViewTransition || reduced) { update(); done(); return; }
  sheet.classList.add('instant'); sheet.style.viewTransitionName = 'sheet';
  if (fromEl) fromEl.style.viewTransitionName = 'crest';
  const vt = document.startViewTransition(() => { if (fromEl) fromEl.style.viewTransitionName = ''; update(); if (fromEl && toEl) toEl.style.viewTransitionName = 'crest'; });
  vt.finished.finally(() => { if (toEl) toEl.style.viewTransitionName = ''; sheet.style.viewTransitionName = ''; sheet.classList.remove('instant'); done(); });
}
function goToHouse(key, fromEl) {
  returnTo = fromEl?.closest('button') || null;
  sheetMove(fromEl, stage, () => { quietDraw = !!document.startViewTransition && !reduced; openAnatomy(key); quietDraw = false; setSheet(true); }, () => $('#a-close').focus({ preventScroll: true }));
}
function closeSheet(after) {
  if (!sheet.classList.contains('open')) { after?.(); return; }
  const tile = board.querySelector(`.tile[data-key="${active}"]`), svg = tile && !tile.classList.contains('gone') && tile.getBoundingClientRect().top < innerHeight && tile.getBoundingClientRect().bottom > 0 ? tile.querySelector('svg') : null;
  sheetMove(svg ? stage : null, svg, () => setSheet(false), () => { (tile || returnTo)?.focus({ preventScroll: true }); after?.(); });
}
$('#a-close').onclick = () => closeSheet();
scrim.onclick = () => closeSheet();
addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); });
function openAnatomy(key) {
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
  unfoldStory();
}
// the story opens by itself, a few words at a time; the full text is there for screen readers at once
function unfoldStory() {
  clearInterval(storyTimer);
  const el = $('#a-story'), words = cur.note.split(' ');
  el.innerHTML = `<span class="visually-hidden-text" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${cur.note}</span><span aria-hidden="true"></span>`;
  const shown = el.lastChild;
  if (reduced) { shown.textContent = cur.note; return; }
  let n = 0;
  storyTimer = setInterval(() => { n += 1; shown.textContent = words.slice(0, n).join(' '); if (n >= words.length) clearInterval(storyTimer); }, 60);
}
function renderInfo() {
  const c = cur, d = c.data;
  $('#a-name').innerHTML = `${c.houseEn}<span lang="ja">${c.house}</span>`;
  $('#a-name').setAttribute('aria-label', `${c.houseEn}: replay the story`);
  $('#a-meta').textContent = `${c.province} . ${c.side === 'fallen' ? `Gone ${c.fell}` : SIDE_LABEL[c.side]}`;
  $('#a-facts').innerHTML = `<dl><dt>Lord</dt><dd>${c.lord}</dd><dt>Crest</dt><dd>${c.gloss}</dd><dt>Ink</dt><dd>${d.components} pieces . ${symText(c.sym).toLowerCase()} . ${Math.round(d.ink * 100)}% of its square</dd></dl>`;
  $('#a-source').innerHTML = `<a href="${c.credit.page}">${c.credit.file}</a> by ${c.credit.artist || c.credit.uploader}, ${c.credit.license}. Re-traced here.`;
  $('#a-title').textContent = c.mon;
  $('#a-en').textContent = `${c.monEn} . ${c.houseEn}`;
  const strip = $('#strip');
  if (!strip.children.length) {
    strip.innerHTML = CLANS.map((x) => `<button data-key="${x.key}" aria-label="${x.houseEn}"><svg viewBox="0 0 1000 1000" aria-hidden="true">${crestPath(x)}</svg></button>`).join('');
    strip.onclick = (e) => { const b = e.target.closest('button'); if (b) morph(b.querySelector('svg'), stage, () => { quietDraw = true; openAnatomy(b.dataset.key); quietDraw = false; }); };
  }
  strip.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.key === c.key));
}
$('#a-name').onclick = () => unfoldStory();
[['#a-facts-btn', '#a-facts', 'Facts'], ['#a-source-btn', '#a-source', 'Source']].forEach(([b, p, name]) => {
  $(b).onclick = () => { const open = $(p).hidden; $(p).hidden = !open; $(b).setAttribute('aria-expanded', open); $(b).textContent = `${open ? '−' : '+'} ${name}`; };
});

function groupStats(d) {
  const gs = {};
  d.pieces.forEach((p) => { if (p.group != null) (gs[p.group] ||= []).push(p); });
  return Object.values(gs).sort((a, b) => b.length - a.length || b[0].area - a[0].area);
}
// Step motion is drawn by setting SVG transform attributes each frame (rotate(a cx cy)), so the
// centre of every turn is exact in every browser, without relying on CSS transform-box.
let stageToken = 0;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function setStep(s, fresh) {
  step = s;
  const token = ++stageToken;
  const run = (fn, duration, delay = 0, loop = false) => {
    if (reduced) { fn(1); return; }
    const t0 = performance.now() + delay;
    const tick = (now) => {
      if (token !== stageToken) return;
      let t = (now - t0) / duration;
      if (t >= 0) { t = loop ? t % 1 : Math.min(1, t); fn(t); if (!loop && t >= 1) return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll('#steps button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.step === s));
  stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  const under = $('#L-under', stage), over = $('#L-over', stage), pcsG = $('#L-pieces', stage);
  under.innerHTML = over.innerHTML = '';
  pcsG.style.opacity = 1;
  const pcs = [...stage.querySelectorAll('.pc')];
  pcs.forEach((p) => { p.style.transform = ''; p.style.fill = 'var(--shiro)'; });
  const c = cur, d = c.data, [cx, cy] = d.centroid, sym = c.sym, cap = $('#step-cap');

  if (s === 'whole') {
    cap.textContent = `${c.gloss}.`;
    if (!quietDraw) pcs.forEach((p, i) => p.animate([{ fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: 4, strokeDasharray: '1 1', strokeDashoffset: 1 }, { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: 4, strokeDasharray: '1 1', strokeDashoffset: 0, offset: 0.7 }, { fillOpacity: 1, strokeWidth: 0, strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: reduced ? 0 : 1100, delay: reduced ? 0 : Math.min(i * 40, 1200), easing: 'ease-in-out', fill: 'both' }));
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
    cap.innerHTML = `${d.components} pieces of ink. Matching colours are the shapes the painter repeated.` +
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
      over.append(ghost);
      const n = sym.n === Infinity ? 0 : sym.n;
      // hold, then turn one step about the crest's own centre; repeat
      run((t) => {
        let a;
        if (!n) a = t * 360;
        else { const seg = t * n, k = Math.floor(seg), u = seg - k; a = (k + easeIO(Math.min(1, Math.max(0, (u - 0.5) * 2)))) * (360 / n); }
        ghost.setAttribute('transform', `rotate(${a.toFixed(2)} ${cx} ${cy})`);
      }, (n ? n * 1.4 : 6) * 1000, 0, true);
    }
    cap.innerHTML = `<b>${symText(sym)}</b>. The yellow trace bulges where a turn lands on the original.`;
  }
  if (s === 'unit') {
    const n = sym.n === Infinity ? 36 : sym.n;
    if (n > 1) {
      pcsG.style.opacity = 0.12;
      const w = 360 / n, a0 = -90 - w / 2, R = 900;
      const P = (a) => `${(cx + R * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + R * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
      over.innerHTML = `<clipPath id="wedge"><path d="M${cx} ${cy}L${P(a0)}A${R} ${R} 0 ${w > 180 ? 1 : 0} 1 ${P(a0 + w)}Z"/></clipPath>` +
        Array.from({ length: n }, (_, k) => `<g class="cp"${k ? ` opacity="0" transform="rotate(${(k - 1) * w} ${cx} ${cy})"` : ''}><use href="#pcs" clip-path="url(#wedge)" fill="${k ? 'var(--shiro)' : 'var(--kihada)'}"/></g>`).join('') +
        `<path d="M${P(a0)}L${cx} ${cy}L${P(a0 + w)}" fill="none" stroke="var(--kihada)" stroke-width="5" stroke-dasharray="10 8"/>`;
      [...over.querySelectorAll('.cp')].forEach((g, k) => {
        if (!k) return;
        run((t) => { const e = easeIO(t); g.setAttribute('transform', `rotate(${((k - 1 + e) * w).toFixed(2)} ${cx} ${cy})`); g.setAttribute('opacity', e.toFixed(3)); }, 600, 500 + k * (n > 12 ? 60 : 380));
      });
      cap.innerHTML = sym.n === Infinity ? 'A circle: any slice is the whole.' : `${Math.round(w)}°, turned ${n} times.${sym.axes.length >= n ? ' Each wedge mirrors itself, so the true unit is half of one.' : ''}`;
    } else if (sym.axes.length) {
      pcsG.style.opacity = 0.12;
      const ax = sym.axes[0];
      over.innerHTML = `<clipPath id="half"><rect x="${cx}" y="-200" width="900" height="1400"/></clipPath>
        <g transform="rotate(${ax - 90} ${cx} ${cy})"><use href="#pcs" clip-path="url(#half)" fill="var(--kihada)"/><g class="mir" opacity="0.2"><use href="#pcs" clip-path="url(#half)" fill="var(--shiro)"/></g>
        <line x1="${cx}" y1="-120" x2="${cx}" y2="1120" stroke="var(--aobana)" stroke-width="5" stroke-dasharray="14 10"/></g>`;
      const mir = $('.mir', over);
      run((t) => { const e = easeIO(t); mir.setAttribute('transform', `translate(${cx} 0) scale(${(1 - 2 * e).toFixed(3)} 1) translate(${-cx} 0)`); mir.setAttribute('opacity', (0.2 + 0.8 * e).toFixed(3)); }, 1200, 500);
      cap.textContent = 'One mirror axis.';
    } else {
      cap.textContent = 'Nothing repeats: drawn freehand.';
    }
  }
  if (s === 'compass' && c.recipe) {
    pcsG.style.opacity = 0.16;
    over.innerHTML = `<g transform="translate(500 500)"><svg x="-500" y="-500" width="1000" height="1000" viewBox="-500 -500 1000 1000" overflow="visible" id="cmp">${crestMarkup(c.recipe, { guides: true })}</svg></g>`;
    animateConstruction($('#cmp', over), { speed: 1.4, keepGuides: 0.35 });
    cap.innerHTML = `Circles and straight lines only; the faint shape is the original. <button id="to-ws" class="text-btn">Open in the workshop</button>`;
    $('#to-ws').onclick = () => { ws.set({ ...DEFAULT, ...c.recipe }); setSheet(false); $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => ws.draw(), reduced ? 0 : 900); };
  }
}
$('#steps').onclick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) setStep(b.dataset.step); };

// ================= DRAW YOUR OWN =================
// The crest sits in the middle like a sketch. Six notes point into the part each one changes;
// everything else is on the shelf underneath, drawn as small pictures of what it does.
const f1 = (n) => +n.toFixed(1);
const C = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const Rc = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const P = (pts) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'Z';
const around = (n, rad, fn) => Array.from({ length: n }, (_, i) => { const a = (-90 + (i * 360) / n) * Math.PI / 180; return fn(Math.cos(a) * rad, Math.sin(a) * rad, a); }).join('');
const spoke = (a, r0, r1, w) => { const c = Math.cos(a), s = Math.sin(a), px = -s * w / 2, py = c * w / 2; return P([[c * r0 + px, s * r0 + py], [c * r1 + px, s * r1 + py], [c * r1 - px, s * r1 - py], [c * r0 - px, s * r0 - py]]); };
const RING = C(0, 0, 46) + C(0, 0, 38), DOTS = around(5, 34, (x, y) => C(x, y, 8));
const ICON = {
  layout: { ring: around(5, 30, (x, y) => C(x, y, 10)), single: C(0, 0, 28), mitsumori: C(0, -18, 17) + C(-19, 14, 17) + C(19, 14, 17), grid: [-34, -8, 18].map((x) => Rc(x, -24, 18, 18) + Rc(x, 4, 18, 18)).join('') },
  center: { none: DOTS, hoshi: DOTS + C(0, 0, 14), stamen: DOTS + C(0, 0, 7) + around(5, 0, (x, y, a) => spoke(a, 10, 22, 5)), ken: DOTS + C(0, 0, 6) + around(5, 0, (x, y, a) => P([[Math.cos(a) * 24, Math.sin(a) * 24], [Math.cos(a + 0.35) * 11, Math.sin(a + 0.35) * 11], [Math.cos(a - 0.35) * 11, Math.sin(a - 0.35) * 11]])), same: DOTS + C(0, 0, 8) },
  overlay: { none: RING, juji: RING + Rc(-6, -34, 12, 68) + Rc(-34, -6, 28, 12) + Rc(6, -6, 28, 12), ichimonji: RING + Rc(-30, -26, 60, 10), hiki1: RING + Rc(-34, -8, 68, 16), hiki2: RING + Rc(-34, -18, 68, 12) + Rc(-34, 6, 68, 12), hiki3: RING + Rc(-32, -23, 64, 9) + Rc(-36, -5, 72, 9) + Rc(-32, 13, 64, 9) },
  style: { hinata: C(0, 0, 34), kage: C(0, 0, 34) + C(0, 0, 26) },
};
const icon = (d) => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="${d}" fill-rule="evenodd"/></svg>`;
const range = (a, b, s) => Array.from({ length: Math.round((b - a) / s) + 1 }, (_, i) => +(a + i * s).toFixed(2));
const LADDERS = { n: range(1, 12, 1), rows: range(1, 4, 1), cols: range(1, 4, 1), r: range(0.05, 0.9, 0.05), size: range(0.1, 1, 0.05), centerSize: [0.03, 0.05, 0.07, 0.1, 0.13, 0.16, 0.2, 0.25, 0.3, 0.35, 0.42, 0.5] };
const ws = (() => {
  let spec = { ...DEFAULT };
  const root = $('#workshop'), svg = $('#ws-svg'), sketch = $('#ws-sketch'), leaders = $('#ws-leaders');
  const mini = (s) => `<svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(s)}</svg>`;
  const motifSpec = (k) => ({ enclosure: 'none', layout: 'single', motif: k, size: 0.85, aspect: k === 'uroko' ? 0.866 : 0.75, center: 'none' });
  const encSpec = (k) => ({ enclosure: k, layout: 'single', motif: k === 'none' ? 'hoshi' : 'none', size: 0.12, lobes: 4 });
  const encName = (k) => (k === 'none' ? 'None' : ENCLOSURES[k].en.replace(/^in an? /, '').replace('tortoiseshell ', '').replace(' outline', ''));
  $('[data-pick="motif"]', root).innerHTML = Object.keys(MOTIFS).filter((k) => k !== 'none').map((k) => `<button type="button" data-v="${k}" aria-pressed="false" aria-label="${MOTIFS[k].en}" title="${MOTIFS[k].en}">${mini(motifSpec(k))}</button>`).join('');
  $('[data-pick="enclosure"]', root).innerHTML = Object.keys(ENCLOSURES).map((k) => `<button type="button" data-v="${k}" aria-pressed="false" aria-label="${encName(k)}" title="${encName(k)}">${mini(encSpec(k))}</button>`).join('');
  // a ladder is a vertical scale of ticks: filled up to the value, the value itself long and yellow
  const ladder = (key, label, caption = '') => `<div class="ladder" data-for="${key}"><div role="slider" tabindex="0" aria-label="${label}" data-key="${key}">${LADDERS[key].map((v) => `<button type="button" class="tick" tabindex="-1" aria-hidden="true" data-key="${key}" data-v="${v}"><span></span></button>`).join('')}</div>${caption ? `<small>${caption}</small>` : ''}</div>`;
  $('#l-count').innerHTML = ladder('n', 'How many') + ladder('rows', 'Rows', 'rows') + ladder('cols', 'Columns', 'cols') + '<p class="fixed" data-for="fixed"></p>';
  $('#l-r').innerHTML = ladder('r', 'Distance from centre');
  $('#l-size').innerHTML = ladder('size', 'Motif size');
  $('#l-cs').innerHTML = ladder('centerSize', 'Centre size');
  const icons = (key, label, set, names) => `<div class="grp" data-for="${key}"><span id="k-${key}">${label}</span><div class="icons" data-pick="${key}" role="group" aria-labelledby="k-${key}">${Object.keys(set).map((k) => `<button type="button" data-v="${k}" aria-pressed="false" aria-label="${names[k]}" title="${names[k]}">${icon(set[k])}</button>`).join('')}</div></div>`;
  const stepper = (key, label, extra = '') => `<div class="grp" data-for="${key}"><span>${label}<output data-out="${key}"></output></span><div class="stepper"><button type="button" data-step-key="${key}" data-dir="-1" aria-label="${label}: less">‹</button>${extra}<button type="button" data-step-key="${key}" data-dir="1" aria-label="${label}: more">›</button></div></div>`;
  $('#shelf').innerHTML = '<div class="controls">' + [
    icons('layout', 'Arrangement', ICON.layout, LAYOUTS),
    icons('center', 'Centre', ICON.center, { none: 'No centre', hoshi: 'Star', stamen: 'Stamens', ken: 'Sword stamens', same: 'Repeat the motif' }),
    icons('overlay', 'Overlay', ICON.overlay, { none: 'No overlay', juji: 'Cross', ichimonji: 'The character 一', hiki1: 'One bar', hiki2: 'Two bars', hiki3: 'Three bars' }),
    icons('style', 'Style', ICON.style, { hinata: 'Solid (hinata)', kage: 'Outline (kage)' }),
    stepper('rot', 'Turn', '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path id="dial" fill-rule="evenodd"/></svg>'),
    stepper('aspect', 'Stretch'), stepper('dy', 'Shift down'), stepper('lobes', 'Quince lobes'),
  ].join('') + '</div>' + [
    `<div class="actions"><button type="button" class="primary" id="ws-draw">Draw with compass</button><button type="button" id="ws-guides" aria-pressed="false">Guides</button><button type="button" id="ws-random">Surprise me</button><button type="button" id="ws-download">Download SVG</button></div>`,
  ].join('');
  const STEPS = { rot: [15, 0, 180], aspect: [0.05, 0.4, 1.6], dy: [0.02, -0.4, 0.4], lobes: [1, 4, 8] };
  let guides = false;
  root.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick] button');
    if (pick) return set({ ...spec, [pick.parentElement.dataset.pick === 'enclosure' ? 'enclosure' : pick.parentElement.dataset.pick]: pick.dataset.v });
    const st = e.target.closest('[data-step-key]');
    if (st) { const k = st.dataset.stepKey, [d, lo, hi] = STEPS[k]; return set({ ...spec, [k]: +Math.min(hi, Math.max(lo, spec[k] + d * +st.dataset.dir)).toFixed(2) }); }
  });
  root.addEventListener('keydown', (e) => {
    const sl = e.target.closest('[role="slider"]');
    if (!sl || sl.getAttribute('aria-disabled') === 'true' || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const k = sl.dataset.key, vals = LADDERS[k], i = nearest(vals, spec[k]);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? vals.length - 1 : Math.min(vals.length - 1, Math.max(0, i + (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1)));
    set({ ...spec, [k]: vals[j] });
  });
  // drag along a ladder (or press anywhere on it) to set the value; the tick nearest the pointer wins
  let drag = null;
  const tickAt = (sl, y) => [...sl.querySelectorAll('.tick')].reduce((a, t) => { const r = t.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - y); return d < a.d ? { t, d } : a; }, { t: null, d: Infinity }).t;
  const pull = (sl, y) => { const t = tickAt(sl, y); if (t && +t.dataset.v !== spec[sl.dataset.key]) set({ ...spec, [sl.dataset.key]: +t.dataset.v }); };
  const hot = (sl, on) => leaders.querySelector(`[data-for="${sl.closest('.note').dataset.note}"]`)?.classList.toggle('hot', on);
  root.addEventListener('pointerdown', (e) => {
    const sl = e.target.closest('[role="slider"]');
    if (!sl || sl.getAttribute('aria-disabled') === 'true' || e.button > 0) return;
    e.preventDefault(); sl.focus({ preventScroll: true }); sl.setPointerCapture(e.pointerId);
    drag = sl; sl.classList.add('dragging'); hot(sl, true); pull(sl, e.clientY);
  });
  root.addEventListener('pointermove', (e) => { if (drag) pull(drag, e.clientY); });
  const drop = () => { if (!drag) return; drag.classList.remove('dragging'); hot(drag, false); drag = null; };
  root.addEventListener('pointerup', drop);
  root.addEventListener('pointercancel', drop);
  const nearest = (vals, v) => vals.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(vals[bi] - v) ? i : bi), 0);
  sketch.querySelectorAll('.note').forEach((n) => {
    n.addEventListener('mouseenter', () => leaders.querySelector(`[data-for="${n.dataset.note}"]`)?.classList.add('hot'));
    n.addEventListener('mouseleave', () => leaders.querySelector(`[data-for="${n.dataset.note}"]`)?.classList.remove('hot'));
  });

  function sync() {
    root.querySelectorAll('[data-pick]').forEach((p) => p.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', spec[p.dataset.pick] === b.dataset.v)));
    root.querySelectorAll('[role="slider"]').forEach((sl) => {
      const k = sl.dataset.key, vals = LADDERS[k], i = nearest(vals, spec[k]);
      sl.setAttribute('aria-valuenow', spec[k]); sl.setAttribute('aria-valuemin', vals[0]); sl.setAttribute('aria-valuemax', vals[vals.length - 1]);
      sl.querySelectorAll('.tick').forEach((t, j) => { t.classList.toggle('cur', j === i); t.classList.toggle('filled', j < i); });
    });
    root.querySelectorAll('[data-out]').forEach((o) => { const k = o.dataset.out; o.textContent = k === 'rot' ? `${spec.rot}°` : (+spec[k]).toFixed(k === 'lobes' ? 0 : 2); });
    $('#dial').setAttribute('d', RING + spoke((spec.rot - 90) * Math.PI / 180, 0, 36, 8));
    const ring = spec.layout === 'ring', grid = spec.layout === 'grid';
    const show = { n: ring, rows: grid, cols: grid, fixed: !ring && !grid, lobes: spec.enclosure === 'mokko', center: ring, rot: ring || spec.layout === 'single', aspect: ['hishi', 'uroko'].includes(spec.motif) };
    root.querySelectorAll('[data-for]').forEach((el) => { if (el.dataset.for in show) el.hidden = !show[el.dataset.for]; });
    $('[data-for="fixed"]').textContent = `${spec.layout === 'mitsumori' ? 3 : spec.motif === 'none' ? 0 : 1} . set by arrangement`;
    // distance and centre size only mean something on a ring (and a ring with a centre): otherwise they rest, greyed
    const off = { r: !ring, centerSize: !ring || spec.center === 'none' };
    Object.entries(off).forEach(([k, o]) => { const sl = $(`[role="slider"][data-key="${k}"]`); sl.setAttribute('aria-disabled', o); sl.tabIndex = o ? -1 : 0; });
    $('#o-motif').textContent = MOTIFS[spec.motif]?.en || 'None';
    $('#o-enc').textContent = encName(spec.enclosure);
    $('#o-count').textContent = ring ? spec.n : grid ? `${spec.rows} × ${spec.cols}` : '';
    $('#o-r').textContent = off.r ? 'Ring only' : (+spec.r).toFixed(2);
    $('#o-size').textContent = (+spec.size).toFixed(2);
    $('#o-cs').textContent = !ring ? 'Ring only' : spec.center === 'none' ? 'Pick a centre' : (+spec.centerSize).toFixed(2);
    $('#ws-guides').setAttribute('aria-pressed', guides);
  }

  // pointing lines: from each note's label, across and then down or up, to the part it changes
  function drawLeaders() {
    if (getComputedStyle(leaders).display === 'none') return;
    const box = sketch.getBoundingClientRect(), ctm = svg.getScreenCTM();
    if (!ctm || !box.width) return;
    const b = build(spec);
    const units = b.guides.filter((g) => g.step === 'motif' && g.c).map((g) => ({ x: g.c[0], y: g.c[1], s: g.c[2] }));
    const ctr = b.guides.find((g) => g.step === 'layout' && g.c)?.c || [0, spec.dy * 400];
    const best = (score, fx, fy) => (units.length ? units.reduce((a, u) => (score(u) > score(a) ? u : a)) : { x: fx, y: fy, s: 60 });
    const tl = best((u) => -u.x - u.y, -150, -150), tr = best((u) => u.x - u.y, 150, -150), br = best((u) => u.x + u.y, 150, 150);
    // targets on each side run top to bottom in the same order as their notes, so no two lines cross
    const R = spec.enclosure === 'none' ? 300 : 436, ey = (tl.y + ctr[1]) / 2;
    const T = {
      motif: [tl.x, tl.y],
      enc: [-Math.sqrt(Math.max(0, R * R - ey * ey)), ey],
      cs: [ctr[0], ctr[1]],
      count: [tr.x, tr.y],
      r: units.length ? [(ctr[0] + br.x) / 2, (ctr[1] + br.y) / 2] : [br.x, 0],
      size: [br.x + br.s * 0.6, br.y + br.s * 0.6],
    };
    const to = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(ctm); return [p.x - box.left, p.y - box.top]; };
    // each line leaves its label, drops down its own lane beside the notes, then runs in to its point;
    // upper notes take the lanes nearer the crest
    leaders.innerHTML = [...sketch.querySelectorAll('.note')].map((n) => {
      const lab = n.querySelector('.note-label').getBoundingClientRect(), left = n.classList.contains('l');
      const k = n.classList.contains('n1') ? 2 : n.classList.contains('n2') ? 1 : 0;
      const ax = (left ? lab.right + 16 : lab.left - 16) - box.left, ay = lab.top + lab.height / 2 - box.top;
      const lane = ax + (left ? 1 : -1) * (16 + k * 16);
      const [tx, ty] = to(...T[n.dataset.note]);
      return `<g data-for="${n.dataset.note}"><path d="M${f1(ax)} ${f1(ay)}H${f1(lane)}V${f1(ty)}H${f1(tx)}"/><circle cx="${f1(tx)}" cy="${f1(ty)}" r="2.5"/></g>`;
    }).join('');
  }

  function set(s) {
    spec = { ...DEFAULT, ...s };
    const b = build(spec);
    svg.innerHTML = crestMarkup(b, { guides });
    svg.setAttribute('aria-label', b.name.en);
    $('#ws-title').innerHTML = `<span lang="ja">${b.name.jp}</span><span class="ften">${b.name.ro} . ${b.name.en}</span>`;
    sync();
    requestAnimationFrame(drawLeaders);
  }
  async function draw() {
    svg.innerHTML = crestMarkup(build(spec), { guides: true });
    await animateConstruction(svg, { speed: 1, keepGuides: guides ? 0.75 : 0 });
  }
  $('#ws-guides').onclick = () => { guides = !guides; set(spec); };
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
  return { set, draw, get: () => spec, svg };
})();

// ================= FOOTER: A CLOTH OF CRESTS =================
// Each crest turns by whole steps of its own symmetry, so it lands looking unchanged.
// The short yellow line between the rows turns the whole cloth in a wave and deals new crests.
const stepOf = (s) => (s.layout === 'ring' ? 360 / s.n : s.layout === 'mitsumori' ? 120 : s.layout === 'grid' && s.rows === s.cols ? 90 : s.layout === 'single' && s.motif === 'none' ? 90 : 360);
function turnOf(s) { const step = stepOf(s); return step * Math.ceil(120 / step); }
let seed = 1600, spins = 0;
function weaveCell(s) {
  const b = build(s);
  return `<button type="button" class="turn" style="--deg:${turnOf(b.spec)}deg" data-step="${stepOf(b.spec)}" aria-label="${b.name.en}: open in the workshop"><svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(b)}</svg></button>`;
}
function weave() {
  // two blocks of two rows on the 12-column grid; narrower screens show 8 or 4 columns (CSS hides the rest)
  const el = $('#weave'), per = 24;
  const specs = Array.from({ length: per * 2 }, (_, i) => randomSpec(seed + i * 7919));
  const block = (b) => `<div class="row">${specs.slice(b * per, b * per + per).map((s, i) => `<span class="cell" style="--d:${((i % 12) + Math.floor(i / 12) * 3 + b * 6) * 40}ms;transform:rotate(${spins * 360}deg)" data-i="${b * per + i}">${weaveCell(s)}</span>`).join('')}</div>`;
  el.innerHTML = block(0) + '<button type="button" class="again" aria-label="Draw new crests"><b>Draw again</b></button>' + block(1);
  el.querySelector('.again').onclick = again;
  el.onclick = (e) => {
    const t = e.target.closest('.turn'); if (!t) return;
    const s = el._specs[+t.parentElement.dataset.i];
    morph(t.querySelector('svg'), ws.svg, () => { ws.set(s); $('#workshop').scrollIntoView({ behavior: 'instant', block: 'start' }); });
    if (!document.startViewTransition || reduced) $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  el._specs = specs;
}
// The pointer is a wide, soft field: crests near its middle spin fast, those at its edge slowly.
// Each one speeds up and slows down smoothly, and when the pointer leaves it settles on the next
// whole step of its own symmetry, so it comes to rest looking unchanged.
(() => {
  if (reduced) return;
  const el = $('#weave'), R = 240, VMAX = 540; // px of reach, degrees per second at the centre
  let px = null, py = null, raf = 0, last = 0;
  const state = new WeakMap();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    let busy = false;
    el.querySelectorAll('.turn').forEach((t) => {
      let st = state.get(t);
      const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = px == null ? Infinity : Math.hypot(px - cx, py - cy), f = Math.max(0, 1 - d / R);
      if (!st) { if (!f) return; st = { a: 0, v: 0 }; state.set(t, st); }
      const want = VMAX * f * f;
      st.v += (want - st.v) * Math.min(1, dt * (want > st.v ? 3 : 2.2));
      if (want === 0 && st.v < 30) {
        const step = +t.dataset.step || 360, goal = Math.ceil(st.a / step - 1e-6) * step;
        st.a += (goal - st.a) * Math.min(1, dt * 6); st.v = 0;
        if (Math.abs(goal - st.a) < 0.2) { st.a = goal % 360; state.delete(t); t.firstElementChild.style.transform = ''; return; }
      } else st.a += st.v * dt;
      t.firstElementChild.style.transform = `rotate(${st.a.toFixed(2)}deg)`;
      busy = true;
    });
    raf = busy || px != null ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  el.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; wake(); });
  el.addEventListener('pointerleave', () => { px = py = null; wake(); });
})();
function again() {
  spins += 1;
  const el = $('#weave');
  el.querySelectorAll('.cell').forEach((c) => { c.style.transform = `rotate(${spins * 360}deg)`; });
  setTimeout(() => {
    seed = (Math.random() * 1e9) | 0;
    el._specs = Array.from({ length: 48 }, (_, i) => randomSpec(seed + i * 7919));
    el.querySelectorAll('.cell').forEach((c, i) => { c.innerHTML = weaveCell(el._specs[i]); });
  }, reduced ? 0 : 700);
}

// ---------- boot ----------
initBoard();
layout();
quietDraw = true; openAnatomy('oda'); quietDraw = false;
ws.set({ ...DEFAULT, ...BY_KEY.akechi.recipe, enclosure: 'maru' });
weave();
hero();
window.__kamon = { openAnatomy, setStep, ws, CLANS, layout, goToHouse, closeSheet };
