import { CLANS } from './data.js';
import { t, lang, setLang, onLang, LANGS, clanText, describeZh } from './i18n.js';
import { build, MOTIFS, ENCLOSURES, DEFAULT, randomSpec, nameCount } from './grammar.js';
import { crestMarkup, animateConstruction, crestFile, reduced } from './render.js';

const $ = (s, el = document) => el.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const V = document.getElementById('kamon-version')?.dataset.v || ''; // see tools/stamp.mjs
const [DATA, CREDITS] = await Promise.all([fetch(`data/crests.json?v=${V}`).then((r) => r.json()), fetch(`assets/crests/credits.json?v=${V}`).then((r) => r.json())]);
const BY_KEY = Object.fromEntries(CLANS.map((c) => [c.key, c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- symmetry from the fingerprints computed in tools/normalize.mjs ----------
const at = (arr, step, deg) => { const x = ((((deg % 360) + 360) % 360) / step), i = Math.floor(x), fr = x - i; return arr[i % arr.length] * (1 - fr) + arr[(i + 1) % arr.length] * fr; };
function symmetryOf(c) {
  const med = [...c.rot].sort((a, b) => a - b)[c.rot.length >> 1];
  const axes = [], top = Math.max(...c.mir);
  c.mir.forEach((v, i) => { const p = c.mir[(i + c.mir.length - 1) % c.mir.length], q = c.mir[(i + 1) % c.mir.length]; if (v >= 0.8 && v >= top - 0.1 && v >= p && v > q) axes.push(i * 2); });
  if (med > 0.95) return { n: Infinity, axes: [], key: 'inf' };
  // n-fold if every multiple of 360/n overlaps well; the relative test catches near-round crests (the chrysanthemum)
  let n = 1;
  for (let k = 2; k <= 24; k++) { let m = 1; for (let j = 1; j < k; j++) m = Math.min(m, at(c.rot, 2, (j * 360) / k)); if (m >= 0.83 && (m - med >= 0.1 || (m - med) / (1 - med) >= 0.45)) n = k; }
  // n-fold rotation plus one mirror means n mirrors (dihedral group): fill in any the threshold missed
  if (n > 1 && axes.length) { const base = axes.reduce((b, a) => (Math.abs(a - 90) < Math.abs(b - 90) ? a : b)); axes.length = 0; for (let k = 0; k < n; k++) axes.push((base + (k * 180) / n) % 180); }
  return { n, axes, key: n > 1 ? `r${n}` : axes.length ? 'mirror' : 'none' };
}
for (const c of CLANS) Object.assign(c, { kind: c.kind || 'buke', data: DATA[c.key], sym: symmetryOf(DATA[c.key]), credit: CREDITS[c.key] });
for (const c of CLANS) if (c.fold) { const { axes } = c.sym, base = axes[0] ?? 90; c.sym = { n: c.fold, axes: Array.from({ length: c.fold }, (_, k) => (base + (k * 180) / c.fold) % 180), key: `r${c.fold}` }; }
// the count in kanji, for the title of the crest book: 53 → 五十三
const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const kanjiNum = (n) => (n >= 100 ? String(n) : (n >= 20 ? KANJI[Math.floor(n / 10)] : '') + (n >= 10 ? '十' : '') + KANJI[n % 10]);
const ALL_JP = `${kanjiNum(CLANS.length)}の紋`;

const symText = (s) => (s.n === Infinity ? t('symInf') : s.n > 1 ? t('symRot', s.n, s.axes.length) : s.axes.length ? t('symOneMirror') : t('symNone'));
const LANG_TAG = { en: 'en', ja: 'ja', zh: 'zh-Hant' };
// a house's name in the reader's language (romanised in English)
const houseName = (c) => (lang === 'en' ? c.houseEn : lang === 'zh' ? clanText(c).houseZh : c.house);
// a generated crest's description: English name, Chinese description, or (in Japanese) its proper name
const crestDesc = (spec, b) => (lang === 'en' ? b.name.en : lang === 'zh' ? describeZh(spec, nameCount(spec)) : '');

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
// crest shrinks onto its own tile among the twenty houses and disappears into it.
const HERO = BY_KEY.oda;
const heroMotion = !reduced && matchMedia('(min-width: 1101px)');
const lerp = (a, b, t) => a + (b - a) * t, clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeHero = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const heroCap = () => { $('#hero-cap').innerHTML = t('heroCap', clanText(HERO)).replace('<b>', '<b lang="ja">'); };
function hero() {
  const svg = $('#hero-svg');
  svg.innerHTML = crestMarkup(HERO.recipe, { guides: true });
  $('#hero-traced').innerHTML = crestPath(HERO);
  heroCap();
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
    // the landing: the crest settles onto its own tile, then hands over to it and is gone. Nothing else on the
    // houses page is touched, so every arrangement works as normal. If its tile isn't showing, it simply fades.
    const home = $('#board').querySelector(`.tile[data-key="${HERO.key}"]`);
    const lands = mode === 'grid' && home && !home.classList.contains('gone');
    let fade = 1;
    if (q > 0 && lands) {
      const [hx, hy, hw] = centre(home.querySelector('svg')), t = easeHero(q);
      cx = lerp(cx, hx, t); cy = lerp(cy, hy, t); size = lerp(cs, hw, t); rot = 72 + 72 * t;
    } else if (q > 0) fade = 1 - easeHero(q);
    fig.style.width = `${size}px`;
    fig.style.transform = `translate(${(cx - size / 2).toFixed(1)}px, ${(cy - size / 2).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    fig.style.opacity = fade;
    fig.style.visibility = q >= 1 ? 'hidden' : '';
    built.style.opacity = lands ? 1 - clamp01(q * 1.6) : 1;
    traced.style.opacity = lands ? clamp01(q * 1.6 - 0.3) : 0;
    // the swap between flying crest and tile is instant, so it can't be seen
    if (home && lands && q > 0 && q < 1) { home.style.transition = 'none'; home.style.opacity = 0; }
    else if (home && home.style.opacity === '0') { home.style.opacity = ''; requestAnimationFrame(() => requestAnimationFrame(() => { home.style.transition = ''; })); }
  }
  const queue = () => { if (on && !queued) { queued = true; requestAnimationFrame(frame); } };
  const reset = () => {
    [words, ...late, cue, fig, built, traced].forEach((el) => el.removeAttribute('style'));
    const home = $('#board').querySelector(`.tile[data-key="${HERO.key}"]`); if (home) home.style.opacity = home.style.transition = '';
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
const MODE_JP = { grid: ALL_JP, kind: '使い手', symmetry: '対称', motif: '紋様', side: '関ヶ原' };
// symmetry groups that actually occur, in order: none, mirror, 2-fold … n-fold, circle
const SYM_KEYS = ['none', 'mirror', ...[...new Set(CLANS.filter((c) => c.sym.n > 1 && c.sym.n !== Infinity).map((c) => c.sym.n))].sort((a, b) => a - b).map((n) => `r${n}`), 'inf'];
const symCol = (k) => t('symCols')[k] || [t('symFold', +k.slice(1)), `${Math.round(360 / +k.slice(1))}°`];
function initBoard() {
  CLANS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.key = c.key;
    b.innerHTML = `<svg viewBox="0 0 1000 1000" aria-hidden="true"><g class="crest">${crestPath(c)}</g></svg><span class="lbl"><i>${String(i + 1).padStart(2, '0')}</i><span></span></span>`;
    b.onclick = () => goToHouse(c.key, b.querySelector('svg'));
    board.append(b);
  });
  relabelTiles();
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
function relabelTiles() {
  for (const b of board.querySelectorAll('.tile')) {
    const c = clanText(BY_KEY[b.dataset.key]);
    b.setAttribute('aria-label', `${houseName(c)}: ${lang === 'en' ? c.monEn : c.mon}`);
    const name = b.querySelector('.lbl > span');
    name.textContent = houseName(c); name.lang = LANG_TAG[lang];
  }
}
function layout() {
  $('#g-jp').textContent = MODE_JP[mode]; $('#g-en').textContent = mode === 'grid' ? t('gAll', CLANS.length) : t('gTitle')[mode];
  const fn = $('#g-note'); fn.textContent = mode === 'side' ? t('sekigahara') : t('clickHint'); fn.classList.toggle('story-mode', mode === 'side');
  board.classList.toggle('quiet', mode !== 'grid' && mode !== 'side');
  board.querySelectorAll('.row-label').forEach((l) => l.remove());
  // the board keeps its CSS height (600px, or 70vh on phones) and grows when an arrangement needs more
  board.classList.remove('wrap');
  const frame = board.parentElement; frame.style.minHeight = '';
  const W = board.clientWidth, H = board.clientHeight > 240 ? board.clientHeight : 640;
  let need = H;
  const tile = (c) => board.querySelector(`.tile[data-key="${c.key}"]`);
  const place = (c, x, y, ts, gone = false) => { const el = tile(c); el.style.setProperty('--t', `${ts}px`); el.style.transform = `translate(${x}px, ${y}px)`; el.classList.toggle('gone', gone); el.tabIndex = gone ? -1 : 0; };
  const label = (html, x, y, w) => { const l = document.createElement('div'); l.className = 'row-label'; l.innerHTML = html; l.style.width = `${w}px`; l.style.transform = `translate(${x}px, ${y}px)`; board.append(l); };
  const keyOf = (c) => (mode === 'symmetry' ? c.sym.key : mode === 'motif' ? c.motif : c.kind);
  const columnGroups = () => {
    const named = mode === 'symmetry' ? SYM_KEYS.map((k) => [k, ...symCol(k)]) : Object.entries(t(mode === 'motif' ? 'motifGroups' : 'kinds')).map(([k, v]) => [k, ...(Array.isArray(v) ? v : [v, ''])]);
    return named.map(([k, name, sub]) => [name, sub, CLANS.filter((c) => keyOf(c) === k)]).filter((g) => g[2].length);
  };
  const by = (k) => CLANS.filter((c) => c.side === k);
  const SIDE_MID = [['split', '両方'], ['switched', '寝返り'], ['neutral', '動かず']];
  // columns need room for every group side by side; otherwise (phones, and tablets for symmetry) stack them
  if (mode !== 'grid' && (W < 560 || (mode !== 'side' && columnGroups().length * 72 > W))) {
    // phones: each group is a label over a wrapped row of crests, stacked top to bottom
    const side = t('sideShort'), named = mode === 'side'
      ? [['西軍', side.west, by('west')], ['東軍', side.east, by('east')], ...SIDE_MID.map(([k, jp]) => [jp, side[k], by(k)])].filter((g) => g[2].length).map(([jp, sub, m]) => [`<b lang="ja">${jp}</b><span>${sub}</span>`, m])
      : columnGroups().map(([name, sub, m]) => [`<b>${name}</b><span>${sub || t('houses', m.length)}</span>`, m]);
    // Sekigahara keeps its names under each crest, wrapped to two lines across the cell
    const ts = 48, gap = mode === 'side' ? 24 : 12, rowH = ts + (mode === 'side' ? 36 + gap : gap), labH = 52, per = Math.max(1, Math.floor((W + gap) / (ts + gap)));
    board.classList.toggle('wrap', mode === 'side'); board.style.setProperty('--cell', `${ts + gap - 4}px`);
    let y = 0;
    named.forEach(([html, members]) => {
      label(html, 0, y, W); y += labH;
      const n = Math.min(per, members.length), x0 = (W - n * ts - (n - 1) * gap) / 2;
      members.forEach((c, i) => place(c, x0 + (i % per) * (ts + gap), y + Math.floor(i / per) * rowH, ts));
      y += Math.ceil(members.length / per) * rowH + gap;
    });
    for (const c of CLANS) if (mode === 'side' && (c.side === 'fallen' || c.side === 'none')) place(c, W / 2 - ts / 2, 0, ts, true);
    need = y;
  } else if (mode === 'grid') {
    // a page of a crest book, read from the right; names wrap to two lines under each crest
    const cols = Math.max(3, Math.min(10, Math.floor(W / (W < 500 ? 76 : 88)))), rows = Math.ceil(CLANS.length / cols), cell = W / cols, gap = 24, lblH = 36;
    const ts = Math.max(40, Math.min(cell - 24, 104));
    const total = rows * (ts + lblH + gap) - gap, y0 = Math.max(0, (H - total) / 2);
    board.classList.add('wrap'); board.style.setProperty('--cell', `${cell - 8}px`);
    CLANS.forEach((c, i) => place(c, W - ((i % cols) + 1) * cell + (cell - ts) / 2, y0 + Math.floor(i / cols) * (ts + lblH + gap), ts));
    need = total;
  } else if (mode !== 'side') {
    // one group per column, right to left, like lines of vertical text; a big group wraps into more columns.
    // Pick the largest tile that fits every group across the board.
    const groups = columnGroups(), labH = 48, vg = 8, pad = 16, minW = 64, ggap = 8;
    const tryFit = (ts, rows) => {
      const widths = groups.map((g) => Math.max(minW, Math.ceil(g[2].length / rows) * (ts + pad)));
      return widths.reduce((a, b) => a + b, 0) + ggap * (groups.length - 1) <= W ? { ts, rows, widths } : null;
    };
    let fit = null;
    for (let ts = 88; ts >= 28 && !fit; ts -= 2) fit = tryFit(ts, Math.max(1, Math.floor((H - labH + vg) / (ts + vg))));
    // too narrow even at the smallest size: keep small tiles and let the columns run longer
    for (let rows = 1; !fit; rows++) fit = tryFit(28, rows) || (rows >= CLANS.length ? { ts: 28, rows, widths: groups.map(() => W / groups.length) } : null);
    const { ts, rows, widths } = fit, used = widths.reduce((a, b) => a + b, 0) + ggap * (groups.length - 1);
    const maxN = Math.min(rows, Math.max(...groups.map((g) => g[2].length)));
    const total = labH + maxN * (ts + vg) - vg, y0 = Math.max(0, (H - total) / 2);
    let x = W - Math.max(0, (W - used) / 2);
    groups.forEach(([name, sub, members], gi) => {
      const w = widths[gi], x0 = x - w, cols = Math.ceil(members.length / rows), colW = w / cols;
      label(`<b>${name}</b><span>${sub || t('houses', members.length)}</span>`, x0, y0, w);
      // fill each column top to bottom, columns right to left
      members.forEach((c, i) => place(c, x - (Math.floor(i / rows) + 1) * colW + (colW - ts) / 2, y0 + labH + (i % rows) * (ts + vg), ts));
      x = x0 - ggap;
    });
    need = total;
  } else {
    // Sekigahara: the West on the left, the East on the right, three columns each; on the line between them
    // the houses that split, switched or stayed out. Houses gone by 1600, and those that aren't warrior houses, step away.
    const lblH = 26;
    const rows = Math.max(Math.ceil(by('west').length / 3), Math.ceil(by('east').length / 3));
    const labH = 56, S = Math.min(W / 7.8, 132), ts = Math.min(S - lblH - 8, S * 0.62), CX = W / 2;
    const total = labH + rows * S, y0 = Math.max(0, (H - total) / 2), top = y0 + labH;
    const at = (cx, row) => [cx - ts / 2, top + row * S];
    by('west').forEach((c, i) => place(c, ...at(CX - (3.5 - (i % 3)) * S, Math.floor(i / 3)), ts));
    by('east').forEach((c, i) => place(c, ...at(CX + (1.5 + (i % 3)) * S, Math.floor(i / 3)), ts));
    const side = t('sideShort');
    label(`<b lang="ja">西軍</b><span>${side.west}</span>`, CX - 2.5 * S - 80, y0, 160);
    label(`<b lang="ja">東軍</b><span>${side.east}</span>`, CX + 2.5 * S - 80, y0, 160);
    const middle = SIDE_MID.filter(([k]) => by(k).length);
    const step = Math.max(S + labH - 8, (rows * S) / middle.length);
    middle.forEach(([k, jp], mi) => {
      const y = top + mi * step;
      label(`<b lang="ja">${jp}</b><span>${side[k]}</span>`, CX - 60, y - labH + 8, 120);
      by(k).forEach((c, i) => place(c, CX - ts / 2 + i * (ts + 8), y, ts));
    });
    for (const c of CLANS) if (c.side === 'fallen' || c.side === 'none') place(c, CX - ts / 2, top + (rows * S) / 2, ts, true);
    need = total;
  }
  if (need > H) frame.style.minHeight = `${Math.ceil(need)}px`;
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
  stage.setAttribute('aria-label', t('stageAria', clanText(cur)));
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
  // English unfolds a word at a time; Japanese and Chinese, which have no spaces, a character at a time
  const note = clanText(cur).note, el = $('#a-story'), sep = lang === 'en' ? ' ' : '', words = sep ? note.split(sep) : [...note];
  el.innerHTML = `<span class="visually-hidden-text" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${note}</span><span aria-hidden="true"></span>`;
  const shown = el.lastChild;
  if (reduced) { shown.textContent = note; return; }
  let n = 0;
  storyTimer = setInterval(() => { n += 1; shown.textContent = words.slice(0, n).join(sep); if (n >= words.length) clearInterval(storyTimer); }, sep ? 60 : 24);
}
function renderInfo() {
  const c = clanText(cur), d = c.data;
  // clanText gives the house in Traditional Chinese characters when reading in Chinese
  $('#a-name').innerHTML = `${c.houseEn}<span lang="${lang === 'zh' ? 'zh-Hant' : 'ja'}">${c.house}</span>`;
  $('#a-name').setAttribute('aria-label', t('replay', houseName(c)));
  // warrior houses give their side in 1600; clans, the court and temples say what they are
  $('#a-meta').textContent = `${c.province} . ${c.kind !== 'buke' ? t('kinds')[c.kind][0] : c.side === 'fallen' ? t('gone', c.fell) : t('sides')[c.side]}`;
  $('#a-facts').innerHTML = `<dl><dt>${t('lordBy')[c.kind]}</dt><dd>${c.lord}</dd><dt>${t('crestL')}</dt><dd>${c.gloss}</dd><dt>${t('inkL')}</dt><dd>${t('inkLine', d.components, symText(c.sym), Math.round(d.ink * 100))}</dd></dl>`;
  $('#a-source').innerHTML = t('sourceLine', c.credit);
  $('#a-title').textContent = c.mon;
  $('#a-en').textContent = `${c.read} . ${houseName(c)}`;
  const strip = $('#strip');
  if (!strip.children.length) {
    strip.innerHTML = CLANS.map((x) => `<button data-key="${x.key}"><svg viewBox="0 0 1000 1000" aria-hidden="true">${crestPath(x)}</svg></button>`).join('');
    strip.onclick = (e) => { const b = e.target.closest('button'); if (b) morph(b.querySelector('svg'), stage, () => { quietDraw = true; openAnatomy(b.dataset.key); quietDraw = false; }); };
  }
  strip.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-current', b.dataset.key === c.key); b.setAttribute('aria-label', houseName(BY_KEY[b.dataset.key])); });
}
$('#a-name').onclick = () => unfoldStory();
const FOLDS = [['#a-facts-btn', '#a-facts', 'facts'], ['#a-source-btn', '#a-source', 'source']];
const foldLabels = () => FOLDS.forEach(([b, p, key]) => { $(b).textContent = `${$(p).hidden ? '+' : '−'} ${t(key)}`; });
FOLDS.forEach(([b, p]) => {
  $(b).onclick = () => { const open = $(p).hidden; $(p).hidden = !open; $(b).setAttribute('aria-expanded', open); foldLabels(); };
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
  const c = clanText(cur), d = c.data, [cx, cy] = d.centroid, sym = c.sym, cap = $('#step-cap');

  if (s === 'whole') {
    cap.textContent = t('capGloss', c.gloss);
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
    cap.innerHTML = t('capPieces', d.components) +
      `<span class="legend">${groups.slice(0, 6).map((g, gi) => `<span><i style="background:${GROUP_COLORS[gi]}"></i>${t('matching', g.length)}</span>`).join('')}${singles ? `<span><i style="background:var(--shiro)"></i>${t('unique', singles)}</span>` : ''}${dust ? `<span>${t('tiny', dust.dust)}</span>` : ''}</span>`;
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
    cap.innerHTML = t('capSym', symText(sym));
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
      cap.innerHTML = sym.n === Infinity ? t('unitInf') : t('unitWedge', Math.round(w), n, sym.axes.length >= n);
    } else if (sym.axes.length) {
      pcsG.style.opacity = 0.12;
      const ax = sym.axes[0];
      over.innerHTML = `<clipPath id="half"><rect x="${cx}" y="-200" width="900" height="1400"/></clipPath>
        <g transform="rotate(${ax - 90} ${cx} ${cy})"><use href="#pcs" clip-path="url(#half)" fill="var(--kihada)"/><g class="mir" opacity="0.2"><use href="#pcs" clip-path="url(#half)" fill="var(--shiro)"/></g>
        <line x1="${cx}" y1="-120" x2="${cx}" y2="1120" stroke="var(--aobana)" stroke-width="5" stroke-dasharray="14 10"/></g>`;
      const mir = $('.mir', over);
      run((t) => { const e = easeIO(t); mir.setAttribute('transform', `translate(${cx} 0) scale(${(1 - 2 * e).toFixed(3)} 1) translate(${-cx} 0)`); mir.setAttribute('opacity', (0.2 + 0.8 * e).toFixed(3)); }, 1200, 500);
      cap.textContent = t('unitMirror');
    } else {
      cap.textContent = t('unitNone');
    }
  }
  if (s === 'compass' && c.recipe) {
    pcsG.style.opacity = 0.16;
    over.innerHTML = `<g transform="translate(500 500)"><svg x="-500" y="-500" width="1000" height="1000" viewBox="-500 -500 1000 1000" overflow="visible" id="cmp">${crestMarkup(c.recipe, { guides: true })}</svg></g>`;
    animateConstruction($('#cmp', over), { speed: 1.4, keepGuides: 0.35 });
    cap.innerHTML = `${t('capCompass')}${c.fit ? ` ${t('match', Math.round(c.fit * 100))}` : ''} <button id="to-ws" class="text-btn">${t('toWs')}</button>`;
    $('#to-ws').onclick = () => { ws.set({ ...DEFAULT, ...c.recipe }); setSheet(false); $('#workshop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => ws.draw(), reduced ? 0 : 900); };
  }
}
$('#steps').onclick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) setStep(b.dataset.step); };

// ================= DRAW YOUR OWN =================
// The crest sits in the middle. Every choice is drawn as a symbol, in vertical columns on the left;
// every number is a brush stroke on the right, as long as its value. Each group is named by one kanji.
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
const LADDERS = { n: range(1, 12, 1), rows: range(1, 4, 1), cols: range(1, 4, 1), r: range(0.05, 0.9, 0.05), size: range(0.1, 1, 0.05), centerSize: [0.03, 0.05, 0.07, 0.1, 0.13, 0.16, 0.2, 0.25, 0.3, 0.35, 0.42, 0.5], tail: range(0.4, 1.8, 0.1), reach: range(0, 1.1, 0.05) };
const ws = (() => {
  let spec = { ...DEFAULT }, guides = false;
  const root = $('#workshop'), svg = $('#ws-svg');
  const mini = (s) => `<svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(s)}</svg>`;
  const motifSpec = (k) => ({ enclosure: 'none', layout: 'single', motif: k, size: 0.85, aspect: k === 'uroko' ? 0.866 : 0.75, center: 'none' });
  const encSpec = (k) => ({ enclosure: k, layout: 'single', motif: k === 'none' ? 'hoshi' : 'none', size: 0.12, lobes: 4 });
  // overlay has no 'none' symbol: picking the current one again takes it off
  const names = (key) => ({ layout: t('layouts'), center: t('centers'), overlay: Object.fromEntries(Object.entries(t('overlays')).filter(([k]) => k !== 'none')), style: { hinata: t('hinata'), kage: t('kage') } })[key];
  // a group of symbols: its kanji (its name on hover) over columns of five
  const group = (key, jp, en, opts) => `<div class="sym" data-for="${key}"><b lang="ja" title="${en}">${jp}</b><div class="opts" data-pick="${key}" role="group" aria-label="${en}">${opts.map(([v, label, art]) => `<button type="button" data-v="${v}" aria-pressed="false" aria-label="${label}" title="${label}">${art}</button>`).join('')}</div></div>`;
  const singles = (key) => Object.entries(names(key)).map(([v, label]) => [v, label, icon(ICON[key][v])]);
  const tomoeSpec = (flip) => ({ enclosure: 'none', layout: 'single', motif: 'tomoe', size: 0.9, tail: 1, flip });
  // a number: its kanji, a brush stroke, and the value
  const brush = (key, en) => `<div class="brush" role="slider" tabindex="0" aria-label="${en}" data-key="${key}"><svg viewBox="0 0 180 24" aria-hidden="true"><path class="track" filter="url(#dry)"/><path class="ink" filter="url(#ink)"/><circle class="drop" cy="12" r="2.6"/></svg></div>`;
  const num = (key, jp, en, ctl) => `<div class="num" data-for="${key}"><b lang="ja" title="${en}">${jp}</b>${ctl}<output data-out="${key}"></output></div>`;
  const stepper = (key, en, extra = '') => `<div class="stepper"><button type="button" data-step-key="${key}" data-dir="-1" aria-label="${t('less', en)}">‹</button>${extra}<button type="button" data-step-key="${key}" data-dir="1" aria-label="${t('more', en)}">›</button></div>`;
  const slide = (key, jp, label) => num(key, jp, t(label), brush(key, t(label)));
  const stepNum = (key, jp, label, extra) => num(key, jp, t(label), stepper(key, t(label), extra));
  function renderControls() {
    $('#ws-symbols').innerHTML =
      `<div class="tier top">${group('layout', '配置', t('cLayout'), singles('layout'))}${group('center', '芯', t('cCenter'), singles('center'))}${group('overlay', '重ね', t('cOverlay'), singles('overlay'))}${group('style', '色', t('cStyle'), singles('style'))}${group('flip', '向', t('cFlip'), [['false', t('migi'), mini(tomoeSpec(false))], ['true', t('hidari'), mini(tomoeSpec(true))]])}</div>` +
      `<div class="tier">${group('motif', '紋', t('cMotif'), Object.keys(MOTIFS).filter((k) => k !== 'none').map((k) => [k, t('motifs')[k], mini(motifSpec(k))]))}${group('enclosure', '輪', t('cEnc'), Object.keys(ENCLOSURES).map((k) => [k, t('encs')[k], mini(encSpec(k))]))}</div>`;
    $('#ws-numbers').innerHTML = [
      slide('n', '数', 'cN'), slide('rows', '行', 'cRows'), slide('cols', '列', 'cCols'), slide('r', '間', 'cR'), slide('size', '大', 'cSize'), slide('centerSize', '芯径', 'cCenterSize'),
      stepNum('rot', '回', 'cRot', '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path id="dial" fill-rule="evenodd"/></svg>'),
      stepNum('spin', '転', 'cSpin', '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path id="dial-spin" fill-rule="evenodd"/></svg>'),
      slide('tail', '尾', 'cTail'), slide('reach', '広', 'cReach'),
      stepNum('dy', '下', 'cDy'), stepNum('aspect', '伸', 'cAspect'), stepNum('lobes', '弁', 'cLobes'),
      `<div class="actions"><button type="button" class="primary" id="ws-draw">${t('draw')}</button><button type="button" id="ws-guides" aria-pressed="false">${t('guides')}</button><button type="button" id="ws-random">${t('surprise')}</button><button type="button" id="ws-download">${t('download')}</button></div>`,
    ].join('');
    $('#ws-guides').onclick = () => { guides = !guides; set(spec); };
    $('#ws-draw').onclick = draw;
    $('#ws-random').onclick = () => { set(randomSpec((Math.random() * 1e9) | 0)); draw(); };
    $('#ws-download').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([crestFile(spec)], { type: 'image/svg+xml' }));
      a.download = `kamon-${build(spec).name.ro.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
      a.click();
    };
  }
  renderControls();
  const STEPS = { rot: [15, 0, 180], spin: [15, 0, 345], aspect: [0.05, 0.4, 1.6], dy: [0.02, -0.4, 0.4], lobes: [1, 4, 8] };
  // an unset value counts as 0 (the tomoe's reach: 0 = the head's own outer edge)
  const nearest = (vals, v = 0) => vals.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(vals[bi] - v) ? i : bi), 0);
  // a brush stroke: a blunt round start that tapers to a point with a small lift
  const stroke = (len) => { const L = Math.max(len, 8); return `M5 7.5Q${f1(L * 0.45)} 5.5 ${f1(L)} 10.5Q${f1(L * 0.5)} 17.5 5 16.5A4.5 4.5 0 0 1 5 7.5Z`; };
  const off = (k) => sliderOff[k] && sliderOff[k]();
  const sliderOff = { r: () => spec.layout !== 'ring', centerSize: () => spec.layout !== 'ring' || spec.center === 'none' };

  root.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick] button');
    if (pick) {
      const k = pick.parentElement.dataset.pick, v = pick.dataset.v === 'true' ? true : pick.dataset.v === 'false' ? false : pick.dataset.v;
      const next = { ...spec, [k]: k === 'overlay' && spec.overlay === v ? 'none' : v };
      // settings tuned for one historical crest don't carry over to a different enclosure or motif
      if (k === 'enclosure') for (const x of ['ringW', 'innerRing', 'clip', 'mokkoFill', 'lobeR', 'holeR']) delete next[x];
      if (k === 'motif') for (const x of ['spin', 'centerSpin', 'reach']) delete next[x];
      return set(next);
    }
    const st = e.target.closest('[data-step-key]');
    if (st) { const k = st.dataset.stepKey, [d, lo, hi] = STEPS[k]; return set({ ...spec, [k]: +Math.min(hi, Math.max(lo, spec[k] + d * +st.dataset.dir)).toFixed(2) }); }
  });
  root.addEventListener('keydown', (e) => {
    const sl = e.target.closest('[role="slider"]');
    if (!sl || off(sl.dataset.key) || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const k = sl.dataset.key, vals = LADDERS[k], i = nearest(vals, spec[k]);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? vals.length - 1 : Math.min(vals.length - 1, Math.max(0, i + (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1)));
    set({ ...spec, [k]: vals[j] });
  });
  // drag along a stroke (or press anywhere on it): the ink follows the pointer
  let drag = null;
  const pull = (sl, x) => {
    const r = sl.getBoundingClientRect(), vals = LADDERS[sl.dataset.key];
    const j = Math.min(vals.length - 1, Math.max(0, Math.ceil(((x - r.left) / r.width) * vals.length) - 1));
    if (vals[j] !== spec[sl.dataset.key]) set({ ...spec, [sl.dataset.key]: vals[j] });
  };
  root.addEventListener('pointerdown', (e) => {
    const sl = e.target.closest('.brush');
    if (!sl || off(sl.dataset.key) || e.button > 0) return;
    e.preventDefault(); sl.focus({ preventScroll: true }); sl.setPointerCapture(e.pointerId);
    drag = sl; sl.classList.add('dragging'); pull(sl, e.clientX);
  });
  root.addEventListener('pointermove', (e) => { if (drag) pull(drag, e.clientX); });
  const drop = () => { if (drag) { drag.classList.remove('dragging'); drag = null; } };
  root.addEventListener('pointerup', drop);
  root.addEventListener('pointercancel', drop);

  function sync() {
    root.querySelectorAll('[data-pick]').forEach((p) => p.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(spec[p.dataset.pick]) === b.dataset.v)));
    root.querySelectorAll('.brush').forEach((sl) => {
      const k = sl.dataset.key, vals = LADDERS[k], i = nearest(vals, spec[k]), len = ((i + 1) / vals.length) * 180, o = off(k);
      sl.setAttribute('aria-valuenow', spec[k] ?? 0); sl.setAttribute('aria-valuemin', vals[0]); sl.setAttribute('aria-valuemax', vals[vals.length - 1]);
      sl.setAttribute('aria-disabled', !!o); sl.tabIndex = o ? -1 : 0;
      $('.track', sl).setAttribute('d', stroke(180));
      $('.ink', sl).setAttribute('d', stroke(len - 4));
      $('.drop', sl).setAttribute('cx', f1(Math.min(len + 1, 178)));
    });
    const ring = spec.layout === 'ring', grid = spec.layout === 'grid';
    const show = { n: ring, rows: grid, cols: grid, center: ring, rot: ring || spec.layout === 'single', aspect: ['hishi', 'uroko', 'kikyo', 'karahana', 'aoi', 'katabami'].includes(spec.motif), lobes: spec.enclosure === 'mokko', spin: ring, tail: spec.motif === 'tomoe', reach: spec.motif === 'tomoe', flip: spec.motif === 'tomoe' };
    root.querySelectorAll('[data-for]').forEach((el) => { if (el.dataset.for in show) el.hidden = !show[el.dataset.for]; });
    root.querySelectorAll('[data-out]').forEach((o) => {
      const k = o.dataset.out;
      o.textContent = off(k) ? (k === 'r' || spec.layout !== 'ring' ? t('ringOnly') : t('pickCentre')) : k === 'rot' || k === 'spin' ? `${spec[k]}°` : ['n', 'rows', 'cols', 'lobes'].includes(k) ? String(spec[k]) : (+(spec[k] ?? 0)).toFixed(2);
    });
    $('#dial').setAttribute('d', RING + spoke((spec.rot - 90) * Math.PI / 180, 0, 36, 8));
    $('#dial-spin').setAttribute('d', RING + spoke((spec.spin - 90) * Math.PI / 180, 0, 36, 8));
    $('#ws-guides').setAttribute('aria-pressed', guides);
  }

  function set(s) {
    spec = { ...DEFAULT, ...s };
    const b = build(spec);
    svg.innerHTML = crestMarkup(b, { guides });
    const sub = crestDesc(spec, b);
    svg.setAttribute('aria-label', sub || b.name.jp);
    $('#ws-name').innerHTML = `<span lang="ja">${b.name.jp}</span><span>${b.name.ro}${sub ? ` . <span lang="${LANG_TAG[lang]}">${sub}</span>` : ''}</span>`;
    sync();
  }
  async function draw() {
    svg.innerHTML = crestMarkup(build(spec), { guides: true });
    await animateConstruction(svg, { speed: 1, keepGuides: guides ? 0.75 : 0 });
  }
  return { set, draw, get: () => spec, svg, relabel: () => { renderControls(); set(spec); } };
})();

// ================= FOOTER: A CLOTH OF CRESTS =================
// Each crest turns by whole steps of its own symmetry, so it lands looking unchanged.
// The short yellow line between the rows turns the whole cloth in a wave and deals new crests.
const stepOf = (s) => (s.layout === 'ring' ? 360 / s.n : s.layout === 'mitsumori' ? 120 : s.layout === 'grid' && s.rows === s.cols ? 90 : s.layout === 'single' && s.motif === 'none' ? 90 : 360);
function turnOf(s) { const step = stepOf(s); return step * Math.ceil(120 / step); }
let seed = 1600, spins = 0;
function weaveCell(s) {
  const b = build(s);
  return `<button type="button" class="turn" style="--deg:${turnOf(b.spec)}deg" data-step="${stepOf(b.spec)}" aria-label="${t('openWs', crestDesc(b.spec, b) || b.name.jp)}"><svg viewBox="-500 -500 1000 1000" aria-hidden="true">${crestMarkup(b)}</svg></button>`;
}
function weave() {
  // two blocks of two rows on the 12-column grid; narrower screens show 8 or 4 columns (CSS hides the rest)
  const el = $('#weave'), per = 24;
  const specs = Array.from({ length: per * 2 }, (_, i) => randomSpec(seed + i * 7919));
  const block = (b) => `<div class="row">${specs.slice(b * per, b * per + per).map((s, i) => `<span class="cell" style="--d:${((i % 12) + Math.floor(i / 12) * 3 + b * 6) * 40}ms;transform:rotate(${spins * 360}deg)" data-i="${b * per + i}">${weaveCell(s)}</span>`).join('')}</div>`;
  el.innerHTML = block(0) + `<button type="button" class="again" aria-label="${t('drawNew')}"><b>${t('drawAgain')}</b></button>` + block(1);
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

// ---------- language ----------
function applyStatic() {
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.innerHTML = t(el.dataset.i18n, CLANS.length)));
  document.querySelectorAll('[data-all-jp]').forEach((el) => (el.textContent = ALL_JP));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  const sw = $('#lang-switch');
  sw.setAttribute('aria-label', t('langLabel'));
  sw.innerHTML = LANGS.map(([k, label]) => `<button type="button" data-lang="${k}" lang="${LANG_TAG[k]}" aria-pressed="${k === lang}">${label}</button>`).join('');
  foldLabels();
}
$('#lang-switch').onclick = (e) => { const b = e.target.closest('button'); if (b) setLang(b.dataset.lang); };
onLang(() => {
  applyStatic(); heroCap(); relabelTiles(); layout();
  renderInfo(); unfoldStory(); quietDraw = true; setStep(step); quietDraw = false;
  ws.relabel();
  const el = $('#weave'); el.querySelectorAll('.cell').forEach((c, i) => { c.innerHTML = weaveCell(el._specs[i]); });
  const again = el.querySelector('.again'); again.setAttribute('aria-label', t('drawNew')); again.firstElementChild.textContent = t('drawAgain');
});

// ---------- boot ----------
applyStatic();
initBoard();
layout();
quietDraw = true; openAnatomy('oda'); quietDraw = false;
ws.set({ ...DEFAULT, ...BY_KEY.akechi.recipe, enclosure: 'maru' });
weave();
hero();
window.__kamon = { openAnatomy, setStep, ws, CLANS, layout, goToHouse, closeSheet };
