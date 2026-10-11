// Download crests from Wikimedia Commons and record artist + license in assets/crests/credits.json.
// Usage: node tools/fetch.mjs key="File title" ...   (or a JSON file of {key: title})
// Commons rate-limits (HTTP 429), so files are fetched one at a time with a pause and retries.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const UA = 'KamonAtlas/1.0 (https://github.com/bchao1/kamon)';
const CREDITS = `${ROOT}/assets/crests/credits.json`;
const credits = JSON.parse(fs.readFileSync(CREDITS, 'utf8'));
const args = process.argv.slice(2);
const jobs = args.length === 1 && args[0].endsWith('.json') ? JSON.parse(fs.readFileSync(args[0], 'utf8')) : Object.fromEntries(args.map((a) => a.split(/=(.*)/s).slice(0, 2)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => (h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function get(url, json = true) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return json ? r.json() : Buffer.from(await r.arrayBuffer());
    if (r.status !== 429 && r.status < 500) throw new Error(`${r.status} ${url}`);
    await sleep(5000 * (i + 1));
  }
  throw new Error(`gave up on ${url}`);
}

for (const [key, title0] of Object.entries(jobs)) {
  const title = title0.replace(/^File:/, '');
  const q = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|user|extmetadata&titles=${encodeURIComponent('File:' + title)}`);
  const page = Object.values(q.query.pages)[0];
  if (!page.imageinfo) { console.log(key.padEnd(12), 'NOT FOUND', title); continue; }
  const ii = page.imageinfo[0], m = ii.extmetadata || {};
  const ext = path.extname(new URL(ii.url).pathname).toLowerCase().replace('.jpeg', '.jpg');
  fs.writeFileSync(`${ROOT}/assets/crests/${key}${ext}`, await get(ii.url, false));
  credits[key] = {
    file: title, page: ii.descriptionurl, license: strip(m.LicenseShortName?.value) || 'see source page',
    licenseUrl: m.LicenseUrl?.value || '', artist: strip(m.Artist?.value), uploader: ii.user, ...(ext !== '.svg' ? { ext } : {}),
  };
  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + '\n');
  console.log(key.padEnd(12), credits[key].license.padEnd(14), ext, title);
  await sleep(3000);
}
