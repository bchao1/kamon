// Usage: node tools/run.mjs url 'js expression' ...  (prints JSON of each result)
import { chromium } from '/Users/brianchao/Documents/agents/rider-maker/node_modules/playwright-core/index.mjs';
const [url, ...evals] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text()));
await page.goto(url); await page.waitForFunction(() => window.ready, null, { timeout: 15000 });
for (const e of evals) console.log(JSON.stringify(await page.evaluate(e)));
await browser.close();
