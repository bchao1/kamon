// Preview-only tweak: the space above and below each section. Shown inside the preview frame or with ?tweak.
const on = new URLSearchParams(location.search).has('tweak') || window.self !== window.top;
if (on) {
  const KEY = 'kamon-page-space';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const root = document.documentElement;
  const start = saved || '128';
  const box = document.createElement('label');
  box.className = 'tweak';
  box.innerHTML = `<span>Section space</span><input type="range" min="64" max="256" step="8" value="${start}"><output>${start}</output>`;
  const input = box.querySelector('input'), out = box.querySelector('output');
  const apply = (v) => { root.style.setProperty('--page', `${v}px`); out.textContent = v; };
  if (saved) apply(saved);
  input.addEventListener('input', () => { apply(input.value); try { localStorage.setItem(KEY, input.value); } catch {} });
  document.body.append(box);
}
