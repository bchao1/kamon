// Usage: node tools/shot.mjs out.png url [w] [h] [waitMs] [js-to-eval...]
import { chromium } from '/Users/brianchao/Documents/agents/rider-maker/node_modules/playwright-core/index.mjs';
const [out = 'shot.png', url = 'http://localhost:8765/', w = '1400', h = '900', wait = '1200', ...evals] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(`[${m.type()}]`, m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
await page.waitForTimeout(+wait);
for (const e of evals) {
  if (e.startsWith('wait:')) { await page.waitForTimeout(+e.slice(5)); continue; }
  if (e.startsWith('anim:')) { await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), +e.slice(5)); await page.waitForTimeout(200); continue; }
  console.log('=>', JSON.stringify(await page.evaluate(e)));
  await page.waitForTimeout(400);
}
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
await browser.close();
