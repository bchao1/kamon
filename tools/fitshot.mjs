// node tools/fitshot.mjs out.png '[["oda",{...spec}],...]'  → overlay screenshots with scores
import { chromium } from '/Users/brianchao/Documents/agents/rider-maker/node_modules/playwright-core/index.mjs';
const [out, json] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage({ viewport: { width: 1480, height: 1000 } });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto('http://localhost:8765/tools/fit.html'); await p.waitForFunction(() => window.ready);
console.log(await p.evaluate((L) => L.map(([k, s]) => (view(k, s), k + ' ' + score(k, s).toFixed(3))).join('\n'), JSON.parse(json)));
await p.waitForTimeout(300); await p.screenshot({ path: out, fullPage: true }); await b.close();
