// SVG helpers shared by the hero, anatomy "compass" step and the workshop.
import { build } from './grammar.js';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => s.replace(/"/g, '&quot;');
let clipSeq = 0;

function guideMarkup(g) {
  if (g.c) return `<path class="g g-${g.step}" pathLength="1" d="M${g.c[0] - g.c[2]} ${g.c[1]}a${g.c[2]} ${g.c[2]} 0 1 0 ${2 * g.c[2]} 0a${g.c[2]} ${g.c[2]} 0 1 0 ${-2 * g.c[2]} 0"/><circle class="dot g-${g.step}" cx="${g.c[0]}" cy="${g.c[1]}" r="4"/>`;
  return `<path class="g g-${g.step}" pathLength="1" d="M${g.l[0]} ${g.l[1]}L${g.l[2]} ${g.l[3]}"/>`;
}

// Markup for a built crest. `guides`: include construction lines. Everything is in the −500..500 frame.
export function crestMarkup(spec, { guides = false } = {}) {
  const b = typeof spec.parts === 'object' && spec.parts ? spec : build(spec);
  const kage = b.spec.style === 'kage', cid = `kclip${++clipSeq}`;
  const ink = b.parts.map((p, i) => {
    const sw = kage ? ` style="stroke-width:${Math.max(6, (p.stroke || 9) * 0.9).toFixed(1)}"` : '';
    const paper = (p.paper || []).map((d) => `<path class="paper" d="${esc(d)}" style="stroke-width:${(p.stroke || 9).toFixed(1)}"/>`).join('');
    const isEnc = p.role === 'enclosure' || p.role === 'overlay';
    return `<g class="piece" data-i="${i}"${p.clip ? ` clip-path="url(#${cid})"` : ''}><path class="part${kage && !isEnc ? '' : ''}" fill-rule="evenodd" pathLength="1" d="${esc(p.d)}"${kage && !isEnc ? sw : ''} data-role="${p.role}"/>${kage ? '' : paper}</g>`;
  }).join('');
  const defs = b.clip ? `<defs><clipPath id="${cid}"><circle cy="${b.clipY}" r="${b.clip}"/></clipPath></defs>` : '';
  return `<g class="${kage ? 'kage' : ''}">${defs}${guides ? `<g class="guides">${b.guides.map(guideMarkup).join('')}</g>` : ''}<g class="ink">${ink}</g></g>`;
}

// Animate a compass-and-ruler construction inside `svg` (which must contain crestMarkup with guides).
// Returns a promise that resolves when the drawing is complete.
export function animateConstruction(svg, { speed = 1, keepGuides = 0.22 } = {}) {
  svg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  const T = (ms) => (reduced ? 0 : ms / speed);
  const anims = [];
  let t = 0;
  const order = ['enclosure', 'layout', 'motif', 'center'];
  for (const step of order) {
    const els = [...svg.querySelectorAll(`.guides .g-${step}`)];
    if (!els.length) continue;
    const stagger = Math.min(140, 900 / els.length);
    els.forEach((el, i) => {
      if (el.classList.contains('dot')) {
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(200), delay: T(t + i * stagger), fill: 'both' }));
      } else {
        anims.push(el.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: T(650), delay: T(t + i * stagger), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }));
      }
    });
    t += els.length * stagger + 450;
  }
  const kage = !!svg.querySelector('.kage');
  const pieces = [...svg.querySelectorAll('.ink .piece')];
  const stagger = Math.min(260, 2200 / Math.max(1, pieces.length));
  pieces.forEach((g, i) => {
    const part = g.querySelector('.part');
    const sw = kage ? getComputedStyle(part).strokeWidth : '5px';
    anims.push(part.animate([
      { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: '5px', strokeDasharray: '1 1', strokeDashoffset: 1 },
      { fillOpacity: 0, stroke: 'var(--shiro)', strokeWidth: '5px', strokeDasharray: '1 1', strokeDashoffset: 0, offset: 0.6 },
      { fillOpacity: kage ? 0 : 1, stroke: 'var(--shiro)', strokeWidth: kage ? sw : '0px', strokeDasharray: '1 1', strokeDashoffset: 0 },
    ], { duration: T(900), delay: T(t + i * stagger), easing: 'ease-in-out', fill: 'both' }));
    g.querySelectorAll('.paper').forEach((p) => anims.push(p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(300), delay: T(t + i * stagger + 700), fill: 'both' })));
  });
  t += pieces.length * stagger + 900;
  const gEl = svg.querySelector('.guides');
  if (gEl) anims.push(gEl.animate([{ opacity: 0.75 }, { opacity: keepGuides }], { duration: T(800), delay: T(t), fill: 'both' }));
  return Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => t);
}

// Static SVG file for download (black ink on white, no CSS vars)
export function crestFile(spec) {
  const b = build(spec), kage = b.spec.style === 'kage';
  const body = (b.clip ? `<defs><clipPath id="c"><circle cy="${b.clipY}" r="${b.clip}"/></clipPath></defs>\n  ` : '') + b.parts.map((p) => {
    const isEnc = p.role === 'enclosure' || p.role === 'overlay';
    const main = kage && !isEnc ? `<path d="${p.d}" fill="none" stroke="#000" stroke-width="${Math.max(6, (p.stroke || 9) * 0.9).toFixed(1)}"/>` : `<path d="${p.d}" fill="#000" fill-rule="evenodd"/>`;
    const paper = kage ? '' : (p.paper || []).map((d) => `<path d="${d}" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="${(p.stroke || 9).toFixed(1)}"/>`).join('');
    return p.clip ? `<g clip-path="url(#c)">${main}${paper}</g>` : main + paper;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" width="1000" height="1000">\n  <title>${b.name.jp} ${b.name.ro}</title>\n  <rect x="-500" y="-500" width="1000" height="1000" fill="#fff"/>\n  ${body}\n</svg>\n`;
}
