// The kamon grammar: enclosure × layout × motif (+ centre, overlay, style) → ink paths,
// compass/ruler construction guides, and a name built the way real crests are named
// (囲み に 数 + 紋様, e.g. 丸に三つ巴 “maru ni mitsu tomoe”).
// Frame: origin at the crest centre, y down, outer radius R. Motifs are drawn in a local
// frame where −y points outward from the crest centre.

export const R = 460;
const TAU = Math.PI * 2;
const f = (n) => +n.toFixed(1);
const pt = (x, y) => `${f(x)} ${f(y)}`;
const circle = (cx, cy, r) => `M${pt(cx - r, cy)}A${f(r)} ${f(r)} 0 1 0 ${pt(cx + r, cy)}A${f(r)} ${f(r)} 0 1 0 ${pt(cx - r, cy)}Z`;
const poly = (pts) => 'M' + pts.map(([x, y]) => pt(x, y)).join('L') + 'Z';

// ---------- path transforms (we only emit M/L/C/Q/A/Z with absolute coords) ----------
function transform(d, { tx = 0, ty = 0, rot = 0, s = 1, sx = 1 }) {
  const a = (rot * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const P = (x0, y) => { const x = x0 * sx; return [tx + s * (co * x - si * y), ty + s * (si * x + co * y)]; };
  return d.replace(/([MLCQA])([^MLCQAZ]*)/g, (_, cmd, args) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'A') {
      const out = [];
      for (let i = 0; i < n.length; i += 7) out.push(f(n[i] * s * sx), f(n[i + 1] * s), f(n[i + 2] + rot), n[i + 3], n[i + 4], ...P(n[i + 5], n[i + 6]).map(f));
      return cmd + out.join(' ');
    }
    const out = [];
    for (let i = 0; i < n.length; i += 2) out.push(...P(n[i], n[i + 1]).map(f));
    return cmd + out.join(' ');
  });
}

// ---------- motifs: unit size s → { d, paper?: [d...], hw, hh } ----------
const heart = (s) =>
  `M${pt(0, s)}C${pt(-0.25 * s, 0.62 * s)} ${pt(-1.0 * s, 0.22 * s)} ${pt(-1.0 * s, -0.32 * s)}` +
  `A${f(0.52 * s)} ${f(0.52 * s)} 0 0 1 ${pt(0, -0.42 * s)}A${f(0.52 * s)} ${f(0.52 * s)} 0 0 1 ${pt(1.0 * s, -0.32 * s)}` +
  `C${pt(1.0 * s, 0.22 * s)} ${pt(0.25 * s, 0.62 * s)} ${pt(0, s)}Z`;

export const MOTIFS = {
  kikyo: { jp: '桔梗', ro: 'kikyō', en: 'bellflower', petal: true,
    draw: (s, a = 0.75) => {
      const k = a / 0.75, P = (x, y) => pt(x * k * s, y * s);
      return { hw: 0.66 * k * s, hh: s,
        d: `M${P(0, 1)}C${P(0.18, 0.75)} ${P(0.62, 0.15)} ${P(0.66, -0.35)}Q${P(0.52, -0.86)} ${P(0.26, -0.8)}Q${P(0.08, -0.82)} ${P(0, -1.02)}` +
           `Q${P(-0.08, -0.82)} ${P(-0.26, -0.8)}Q${P(-0.52, -0.86)} ${P(-0.66, -0.35)}C${P(-0.62, 0.15)} ${P(-0.18, 0.75)} ${P(0, 1)}Z` };
    } },
  ume: { jp: '梅', ro: 'ume', en: 'plum', petal: true, draw: (s) => ({ d: circle(0, 0, s), hw: s, hh: s }) },
  katabami: { jp: '酢漿草', ro: 'katabami', en: 'wood sorrel',
    draw: (s) => ({ hw: s, hh: s,
      d: [0, 1, 2].map((i) => transform(heart(0.52 * s), { tx: 0.5 * s * Math.sin((i * TAU) / 3), ty: -0.5 * s * Math.cos((i * TAU) / 3), rot: i * 120 })).join(''),
      paper: [0, 120, 240].map((r) => transform(`M0 0L0 ${f(-0.18 * s)}`, { rot: r + 60 })) }) },
  aoi: { jp: '葵', ro: 'aoi', en: 'hollyhock',
    draw: (s, a = 0.75) => {
      const k = a / 0.75;
      const veins = [`M${pt(0, 0.92 * s)}L${pt(0, -0.38 * s)}`];
      for (const k of [-1, 1]) for (const [y0, x1, y1] of [[0.55, 0.62, 0.1], [0.3, 0.78, -0.18], [0.05, 0.6, -0.42]]) veins.push(`M${pt(0, y0 * s)}Q${pt(k * x1 * 0.6 * s, (y0 - 0.12) * s)} ${pt(k * x1 * s, y1 * s)}`);
      return { d: transform(heart(s), { rot: 180, sx: k }), paper: veins.map((v) => transform(v, { rot: 180, sx: k })), hw: s * k, hh: s };
    } },
  hishi: { jp: '菱', ro: 'hishi', en: 'diamond',
    draw: (s, a = 0.75) => ({ d: poly([[0, -s], [a * s, 0], [0, s], [-a * s, 0]]), hw: a * s, hh: s }) },
  uroko: { jp: '鱗', ro: 'uroko', en: 'scale',
    draw: (s, a = 0.866) => ({ d: poly([[0, -a * s], [s, a * s], [-s, a * s]]), hw: s, hh: a * s }) },
  hoshi: { jp: '星', ro: 'hoshi', en: 'star', draw: (s) => ({ d: circle(0, 0, s), hw: s, hh: s }) },
  sen: { jp: '銭', ro: 'zeni', en: 'coin',
    draw: (s) => ({ d: circle(0, 0, s) + poly([[-0.24 * s, -0.24 * s], [0.24 * s, -0.24 * s], [0.24 * s, 0.24 * s], [-0.24 * s, 0.24 * s]]), hw: s, hh: s }) },
  tomoe: { jp: '巴', ro: 'tomoe', en: 'swirl',
    draw: (s) => ({ hw: s, hh: s,
      d: `M${pt(0, -s)}A${f(s)} ${f(s)} 0 0 1 ${pt(0, s)}A${f(s / 2)} ${f(s / 2)} 0 0 1 ${pt(0, 0)}A${f(s / 2)} ${f(s / 2)} 0 0 0 ${pt(0, -s)}Z` }) },
  sasa: { jp: '笹', ro: 'sasa', en: 'bamboo leaf',
    draw: (s) => ({ hw: 0.36 * s, hh: s, d: `M${pt(0, -s)}Q${pt(0.42 * s, -0.15 * s)} ${pt(0, s)}Q${pt(-0.42 * s, -0.15 * s)} ${pt(0, -s)}Z`, paper: [`M${pt(0, -0.7 * s)}L${pt(0, 0.8 * s)}`] }) },
  none: { jp: '', ro: '', en: '', draw: () => ({ d: '', hw: 0, hh: 0 }) },
};

export const ENCLOSURES = {
  none: { jp: '', ro: '', en: '' },
  maru: { jp: '丸に', ro: 'maru ni', en: 'in a ring' },
  hosowa: { jp: '細輪に', ro: 'hosowa ni', en: 'in a thin ring' },
  futowa: { jp: '太輪に', ro: 'futowa ni', en: 'in a heavy ring' },
  nijuwa: { jp: '二重輪に', ro: 'nijūwa ni', en: 'in a double ring' },
  kikko: { jp: '亀甲に', ro: 'kikkō ni', en: 'in a tortoiseshell hexagon' },
  kaku: { jp: '隅立て角に', ro: 'sumitate kaku ni', en: 'in a standing square' },
  mokko: { jp: '木瓜に', ro: 'mokkō ni', en: 'in a quince outline' },
  janome: { jp: '蛇の目に', ro: 'janome ni', en: 'in a snake’s eye' },
};
export const LAYOUTS = { ring: 'Ring', single: 'Single', mitsumori: 'Pile of three', grid: 'Grid' };
export const CENTERS = { none: 'None', hoshi: 'Star', stamen: 'Stamens', ken: 'Sword stamens', same: 'Repeat motif' };
export const OVERLAYS = { none: 'None', juji: 'Cross', ichimonji: 'The character 一', hiki1: 'One bar', hiki2: 'Two bars', hiki3: 'Three bars' };

// ---------- enclosures: → { d, rin, guides } ----------
function mokkoOutline(n, rc, rl, rot = -90) {
  const a0 = (rot * Math.PI) / 180, half = Math.PI / n;
  const dd = rc * Math.cos(half) + Math.sqrt(Math.max(0, rl * rl - (rc * Math.sin(half)) ** 2));
  const P = (k) => [dd * Math.cos(a0 + (2 * k + 1) * half), dd * Math.sin(a0 + (2 * k + 1) * half)];
  let d = '';
  for (let k = 0; k < n; k++) {
    const c = [rc * Math.cos(a0 + 2 * k * half), rc * Math.sin(a0 + 2 * k * half)];
    const p0 = P(k - 1), p1 = P(k);
    const ang = (p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
    const t0 = ang(p0), t1 = ang(p1), to = a0 + 2 * k * half;
    const ext = (((t1 - t0) % TAU) + TAU) % TAU, out = (((to - t0) % TAU) + TAU) % TAU;
    const sweep = out < ext ? 1 : 0, span = sweep ? ext : TAU - ext;
    d += (k ? 'L' : 'M') + pt(...p0) + `A${f(rl)} ${f(rl)} 0 ${span > Math.PI ? 1 : 0} ${sweep} ${pt(...p1)}`;
  }
  return d + 'Z';
}
function enclosure(spec) {
  const e = spec.enclosure || 'none', g = [];
  const ring = (ro, ri) => { g.push({ c: [0, 0, ro] }, { c: [0, 0, ri] }); return circle(0, 0, ro) + circle(0, 0, ri); };
  switch (e) {
    case 'maru': return { d: ring(R, R - 48), rin: R - 48 - 34, guides: g };
    case 'hosowa': return { d: ring(R, R - 20), rin: R - 20 - 34, guides: g };
    case 'futowa': return { d: ring(R, R - 100), rin: R - 100 - 32, guides: g };
    case 'nijuwa': return { d: ring(R, R - 26) + ring(R - 50, R - 74), rin: R - 74 - 30, guides: g };
    case 'janome': return { d: ring(R, R * 0.36), rin: R * 0.36 - 26, guides: g };
    case 'kikko': case 'kaku': {
      const n = e === 'kikko' ? 6 : 4, t = 42, rot = e === 'kikko' ? 0 : -90;
      const P = (r) => Array.from({ length: n }, (_, k) => [r * Math.cos(((rot + (k * 360) / n) * Math.PI) / 180), r * Math.sin(((rot + (k * 360) / n) * Math.PI) / 180)]);
      const ap = Math.cos(Math.PI / n), ri = R - t / ap;
      g.push({ c: [0, 0, R] }, ...P(R).map((p, k, a) => ({ l: [...p, ...a[(k + 1) % n]] })));
      return { d: poly(P(R)) + poly(P(ri)), rin: ri * ap - 30, guides: g };
    }
    case 'mokko': {
      const n = spec.lobes || 4, rl = R * (n === 4 ? 0.5 : n === 5 ? 0.5 : 0.42), rc = R - rl, t = 40;
      for (let k = 0; k < n; k++) { const a = (-90 + (k * 360) / n) * Math.PI / 180; g.push({ c: [rc * Math.cos(a), rc * Math.sin(a), rl] }); }
      return { d: mokkoOutline(n, rc, rl) + mokkoOutline(n, rc, rl - t), rin: (rc * Math.cos(Math.PI / n) + Math.sqrt(Math.max(0, (rl - t) ** 2 - (rc * Math.sin(Math.PI / n)) ** 2))) * 0.82, guides: g };
    }
    default: return { d: '', rin: R, guides: g };
  }
}

// ---------- the builder ----------
export const DEFAULT = { enclosure: 'maru', lobes: 4, layout: 'ring', motif: 'kikyo', n: 5, r: 0.44, size: 0.46, rot: 0, aspect: 0.75, upright: false, rows: 2, cols: 3, gap: 0.04, dy: 0, center: 'none', centerSize: 0.12, overlay: 'none', style: 'hinata' };

export function build(input) {
  const spec = { ...DEFAULT, ...input };
  const enc = enclosure(spec), Rin = enc.rin;
  const parts = []; // { d, role, paper? }   in drawing order
  const guides = [...enc.guides.map((x) => ({ ...x, step: 'enclosure' }))];
  if (enc.d) parts.push({ d: enc.d, role: 'enclosure' });

  const M = MOTIFS[spec.motif] || MOTIFS.none;
  const unit = (s) => M.draw(s, spec.aspect);
  const place = (s, x, y, rot) => {
    const u = unit(s);
    if (!u.d) return;
    parts.push({ d: transform(u.d, { tx: x, ty: y, rot }), role: 'motif', paper: (u.paper || []).map((p) => transform(p, { tx: x, ty: y, rot })), stroke: s * 0.07 });
  };
  const s = spec.size * Rin;
  const yo = spec.dy * Rin;
  if (spec.layout === 'ring' && spec.motif !== 'none') {
    const rr = spec.r * Rin;
    guides.push({ c: [0, 0, rr], step: 'layout' });
    for (let i = 0; i < spec.n; i++) {
      const a = ((spec.rot + (i * 360) / spec.n) * Math.PI) / 180;
      const x = Math.sin(a) * rr * (spec.upright ? (spec.aspect || 1) : 1), y = -Math.cos(a) * rr + yo;
      guides.push({ l: [0, yo, Math.sin(a) * Rin, -Math.cos(a) * Rin + yo], step: 'layout' }, { c: [x, y, s], step: 'motif' });
      place(s, x, y, spec.upright ? 0 : spec.rot + (i * 360) / spec.n);
    }
  } else if (spec.layout === 'mitsumori') {
    const u = unit(s), dx = u.hw * 1.06, dy2 = u.hh * 1.06;
    const P = [[0, -dy2 + yo], [-dx, dy2 + yo], [dx, dy2 + yo]];
    guides.push({ l: [...P[0], ...P[1]], step: 'layout' }, { l: [...P[1], ...P[2]], step: 'layout' }, { l: [...P[2], ...P[0]], step: 'layout' });
    for (const [x, y] of P) { guides.push({ c: [x, y, Math.max(u.hw, u.hh)], step: 'motif' }); place(s, x, y, 0); }
  } else if (spec.layout === 'grid') {
    const step = 2 * s + spec.gap * Rin, w = (spec.cols - 1) * step, h = (spec.rows - 1) * step;
    for (let r = 0; r <= spec.rows; r++) guides.push({ l: [-w / 2 - step / 2, -h / 2 - step / 2 + r * step + yo, w / 2 + step / 2, -h / 2 - step / 2 + r * step + yo], step: 'layout' });
    for (let c = 0; c <= spec.cols; c++) guides.push({ l: [-w / 2 - step / 2 + c * step, -h / 2 - step / 2 + yo, -w / 2 - step / 2 + c * step, h / 2 + step / 2 + yo], step: 'layout' });
    for (let r = 0; r < spec.rows; r++) for (let c = 0; c < spec.cols; c++) place(s, -w / 2 + c * step, -h / 2 + r * step + yo, 0);
  } else if (spec.layout === 'single' && spec.motif !== 'none') {
    guides.push({ c: [0, yo, s], step: 'motif' });
    place(s, 0, yo, spec.rot);
  }

  // centre
  const cs = spec.centerSize * Rin;
  if (spec.center !== 'none' && spec.layout === 'ring') {
    guides.push({ c: [0, yo, cs], step: 'center' });
    if (spec.center === 'hoshi') parts.push({ d: circle(0, yo, cs), role: 'center' });
    if (spec.center === 'same') place(cs, 0, yo, spec.rot);
    if (spec.center === 'stamen') {
      const lines = [circle(0, yo, cs * 1.75)];
      for (let i = 0; i < spec.n; i++) { const a = ((spec.rot + (i * 360) / spec.n) * Math.PI) / 180; lines.push(`M${pt(Math.sin(a) * cs * 1.75, yo - Math.cos(a) * cs * 1.75)}L${pt(Math.sin(a) * cs * 3.6, yo - Math.cos(a) * cs * 3.6)}`); }
      parts.push({ d: circle(0, yo, cs), role: 'center', paper: lines, stroke: cs * 0.32 });
    }
    if (spec.center === 'ken') {
      let d = circle(0, yo, cs * 0.42);
      for (let i = 0; i < spec.n; i++) {
        const a = spec.rot + ((i + 0.5) * 360) / spec.n;
        d += transform(poly([[0, -cs * 1.05], [cs * 0.13, -cs * 0.72], [cs * 0.06, -cs * 0.56], [-cs * 0.06, -cs * 0.56], [-cs * 0.13, -cs * 0.72]]), { ty: yo, rot: a });
      }
      parts.push({ d, role: 'center' });
    }
  }

  // overlays
  const ov = spec.overlay;
  if (ov === 'juji') { const t = Rin * 0.16, L = enc.d ? Rin + 40 : Rin; parts.push({ d: poly([[-t, -L], [t, -L], [t, -t], [L, -t], [L, t], [t, t], [t, L], [-t, L], [-t, t], [-L, t], [-L, -t], [-t, -t]]), role: 'overlay' }); }
  if (ov === 'ichimonji') {
    const y = -Rin * 0.8, h = Rin * 0.11, w = Rin * 0.95;
    parts.push({ d: `M${pt(-w, y - h * 1.6)}Q${pt(-w * 0.75, y - h * 0.6)} ${pt(-w * 0.5, y - h)}L${pt(w * 0.55, y - h)}Q${pt(w * 0.85, y - h * 1.5)} ${pt(w, y - h * 1.3)}Q${pt(w * 1.06, y + h * 0.3)} ${pt(w * 0.92, y + h * 1.6)}Q${pt(w * 0.7, y + h)} ${pt(w * 0.45, y + h)}L${pt(-w * 0.6, y + h)}Q${pt(-w * 0.95, y + h * 1.4)} ${pt(-w * 1.02, y)}Z`, role: 'overlay' });
  }
  if (ov.startsWith('hiki')) {
    const k = +ov.slice(4), t = Rin * (k === 1 ? 0.36 : k === 2 ? 0.3 : 0.22), pitch = t * 1.9, L = enc.d ? Rin + 40 : Rin;
    for (let i = 0; i < k; i++) {
      const y = (i - (k - 1) / 2) * pitch, y0 = y - t / 2, y1 = y + t / 2;
      const x0 = Math.sqrt(Math.max(0, L * L - Math.max(y0 * y0, y1 * y1)));
      parts.push({ d: poly([[-x0, y0], [x0, y0], [x0, y1], [-x0, y1]]), role: 'overlay' });
    }
  }
  return { spec, parts, guides, name: nameOf(spec) };
}

// ---------- naming ----------
const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];
const COUNT_RO = ['', 'hitotsu', 'futatsu', 'mitsu', 'yotsu', 'itsutsu', 'mutsu', 'nanatsu', 'yattsu', 'kokonotsu', 'tō', 'jūichi', 'jūni', 'jūsan'];
const COUNT_EN = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen'];
const plural = (en, n) => (n === 1 ? en : en.endsWith('f') ? en.slice(0, -1) + 'ves' : en.endsWith('sh') ? en + 'es' : en + 's');

export function nameOf(spec) {
  spec = { ...DEFAULT, ...spec };
  const E = ENCLOSURES[spec.enclosure] || ENCLOSURES.none, M = MOTIFS[spec.motif] || MOTIFS.none;
  let jp = '', ro = '', en = '';
  const count = spec.layout === 'ring' ? spec.n + (spec.center === 'same' ? 1 : 0) : spec.layout === 'mitsumori' ? 3 : spec.layout === 'grid' ? spec.rows * spec.cols : spec.motif === 'none' ? 0 : 1;
  if (M.petal && spec.layout === 'ring') {
    const base = spec.motif === 'ume' ? (spec.center === 'ken' || spec.center === 'hoshi' ? ['梅鉢', 'umebachi', 'plum blossom'] : ['梅', 'ume', 'plum blossom']) : ['桔梗', 'kikyō', 'bellflower'];
    jp = spec.n === 5 ? base[0] : `${KANJI[spec.n]}弁${base[0]}`;
    ro = spec.n === 5 ? base[1] : `${COUNT_RO[spec.n]}-ben ${base[1]}`;
    en = spec.n === 5 ? `A ${base[2]}` : `${[8, 11].includes(spec.n) ? 'An' : 'A'} ${spec.n}-petalled ${base[2]}`;
  } else if (spec.motif === 'hoshi' && spec.layout === 'ring' && spec.center === 'hoshi' && spec.n + 1 >= 5) {
    jp = `${KANJI[spec.n + 1]}曜`; ro = ['', '', '', '', '', 'goyō', 'rokuyō', 'shichiyō', 'hachiyō', 'kuyō', 'jūyō', 'jūichiyō', 'jūniyō', 'jūsan’yō'][spec.n + 1];
    en = `${COUNT_EN[spec.n + 1]} luminaries`;
  } else if (spec.motif === 'sen' && count === 6) { jp = '六文銭'; ro = 'rokumonsen'; en = 'Six coins'; }
  else if (count > 0) {
    const c = count > 13 ? 13 : count;
    const pile = spec.layout === 'mitsumori' && !['uroko', 'hoshi'].includes(spec.motif);
    jp = (c === 1 ? '' : `${KANJI[c]}つ`) + (pile ? '盛り' : '') + M.jp;
    ro = (c === 1 ? '' : COUNT_RO[c] + (pile ? '-mori' : '') + ' ') + M.ro;
    if (spec.motif === 'hoshi' && c > 1 && !pile) ro = COUNT_RO[c] + 'boshi'; // rendaku: mitsu + hoshi → mitsuboshi
    en = (c === 1 ? `A ${M.en}` : `${COUNT_EN[c]} ${plural(M.en, c)}`) + (pile ? ', piled' : '');
    if (c > 10) { jp = jp.replace('つ', ''); }
  }
  const OV = { juji: ['十字', 'jūji', 'a cross'], ichimonji: ['一文字', 'ichimonji', 'the character “one”'], hiki1: ['一つ引', 'hitotsu hiki', 'one bar'], hiki2: ['二つ引', 'futatsu hiki', 'two bars'], hiki3: ['三つ引', 'mitsu hiki', 'three bars'] }[spec.overlay];
  if (OV) {
    if (!jp) { jp = OV[0]; ro = OV[1]; en = OV[2][0].toUpperCase() + OV[2].slice(1); }
    else if (spec.overlay === 'ichimonji') { jp = `${OV[0]}に${jp}`; ro = `${OV[1]} ni ${ro}`; en = `${en} under ${OV[2]}`; }
    else { jp = `${jp}に${OV[0]}`; ro = `${ro} ni ${OV[1]}`; en = `${en} with ${OV[2]}`; }
  }
  if (!jp) { jp = spec.enclosure === 'janome' ? '蛇の目' : spec.enclosure === 'none' ? '無地' : E.jp.replace('に', ''); ro = spec.enclosure === 'janome' ? 'Janome' : spec.enclosure === 'none' ? 'muji' : E.ro.replace(' ni', ''); en = spec.enclosure === 'janome' ? 'Snake’s eye' : 'An empty crest'; return { jp, ro, en }; }
  if (spec.enclosure !== 'none' && spec.enclosure !== 'janome' || (spec.enclosure === 'janome' && count)) { jp = E.jp + jp; ro = `${E.ro} ${ro}`; en = `${en} ${E.en}`; }
  if (spec.style === 'kage') { jp = '陰' + jp; ro = 'kage ' + ro; en = `${en}, in outline`; }
  ro = ro.replace(/\s+/g, ' ').trim();
  return { jp, ro: ro[0].toUpperCase() + ro.slice(1), en };
}

// ---------- seeded random crests ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function randomSpec(seed) {
  const r = rng(seed), pick = (arr) => arr[Math.floor(r() * arr.length)], wpick = (o) => { let t = r() * Object.values(o).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(o)) if ((t -= w) <= 0) return k; return Object.keys(o)[0]; };
  const motif = wpick({ kikyo: 3, ume: 2, katabami: 2, aoi: 2, hishi: 2, uroko: 1.5, hoshi: 2, sen: 1, tomoe: 2, sasa: 2 });
  const enclosure = wpick({ none: 4, maru: 4, hosowa: 2, futowa: 1, nijuwa: 1, kikko: 1.5, kaku: 1, mokko: 1 });
  const spec = { ...DEFAULT, motif, enclosure, lobes: pick([4, 4, 5]), rot: 0, center: 'none', overlay: 'none', style: r() < 0.18 ? 'kage' : 'hinata', dy: 0 };
  const ring = (n, r0, k) => { spec.layout = 'ring'; spec.n = n; spec.r = r0; spec.size = Math.min(r0 * Math.sin(Math.PI / n) * k, 1 - r0 - 0.02); };
  if (MOTIFS[motif].petal) { const n = pick([5, 5, 5, 6, 8]); spec.layout = 'ring'; spec.n = n; if (motif === 'kikyo') { spec.r = 0.47; spec.size = 0.48; spec.center = pick(['stamen', 'hoshi', 'none']); spec.centerSize = 0.07; } else { spec.r = 0.62; spec.size = Math.min(0.36, 0.62 * Math.sin(Math.PI / n) * 0.98); spec.center = pick(['ken', 'hoshi']); spec.centerSize = spec.center === 'ken' ? 0.32 : 0.18; } }
  else if (motif === 'tomoe') { ring(pick([2, 3, 3, 3, 4]), 0.5, 1.0); spec.size = 0.5; spec.r = 0.48; }
  else if (motif === 'aoi') { const n = pick([3, 3, 3, 4]); spec.layout = 'ring'; spec.n = n; spec.size = n === 3 ? 0.52 : 0.44; spec.r = n === 3 ? 0.5 : 0.48; spec.aspect = n === 3 ? 0.62 : 0.55; spec.rot = n === 3 ? 60 : 45; }
  else if (motif === 'katabami') { if (r() < 0.5) { spec.layout = 'single'; spec.size = 0.92; } else { ring(6, 0.62, 1.0); spec.size = 0.38; spec.center = 'same'; spec.centerSize = 0.38; } }
  else if (motif === 'sasa') { const n = pick([3, 5, 6, 8]); spec.layout = 'ring'; spec.n = n; spec.size = 0.5; spec.r = 0.5; spec.center = pick(['none', 'hoshi']); spec.centerSize = 0.1; }
  else if (motif === 'hishi') { if (r() < 0.5) { spec.layout = 'ring'; spec.n = 4; spec.upright = true; spec.aspect = pick([1, 1.3, 1.5]); spec.size = 0.32 / Math.max(1, spec.aspect / 1.0) * 1.0; spec.r = spec.size * 1.08; } else { spec.layout = 'mitsumori'; spec.aspect = pick([0.6, 0.75]); spec.size = 0.42; } }
  else if (motif === 'uroko') { if (r() < 0.6) { spec.layout = 'mitsumori'; spec.upright = true; spec.aspect = pick([0.55, 0.866]); spec.size = 0.46; spec.dy = 0.05; } else { ring(pick([3, 4, 6]), 0.55, 1.0); spec.aspect = 0.866; } }
  else if (motif === 'hoshi') { if (r() < 0.6) { ring(pick([6, 7, 8]), 0.72, 0.85); spec.center = 'hoshi'; spec.centerSize = Math.min(0.42, 0.72 - spec.size - 0.06); } else { spec.layout = 'mitsumori'; spec.size = 0.36; spec.overlay = r() < 0.4 ? 'ichimonji' : 'none'; spec.dy = spec.overlay === 'ichimonji' ? 0.2 : 0.05; if (spec.overlay !== 'none') spec.size = 0.27; } }
  else if (motif === 'sen') { if (r() < 0.5) { spec.layout = 'grid'; spec.rows = pick([1, 2, 2, 3]); spec.cols = pick([2, 3]); spec.size = Math.min(0.9 / (spec.cols * 2.1), 0.9 / (spec.rows * 2.1)) * 0.98; } else ring(pick([3, 5, 6]), 0.6, 0.9); }
  if (r() < 0.07) Object.assign(spec, { motif: 'none', layout: 'single', enclosure: 'maru', overlay: pick(['hiki1', 'hiki2', 'hiki3', 'juji']), style: 'hinata' });
  return spec;
}
