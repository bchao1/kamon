# Kamon, taken apart

53 crests (kamon) from 44 warrior houses, the four Heian clans 源平藤橘, the imperial house and four Buddhist sects: a sortable gallery, a five-step deconstruction of each crest, and a workshop that generates new crests from the same grammar and names them by the traditional rules.

Live: https://bchao1.github.io/kamon/ (English, 日本語 and 繁體中文; add `?lang=ja` or `?lang=zh` to link to a language)

```
npm run serve          # python3 -m http.server 8765 → http://localhost:8765
npm run normalize      # re-run the crest pipeline (needs Chrome + playwright-core from ../rider-maker)
```

## Where the crests come from
- `assets/crests/*`: originals from Wikimedia Commons (mostly SVG; Gamō, Tōdō, Sōtō and Nichiren are PNG/JPG) ([Category:SVG Japanese family crests](https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests), 508 files, all openly licensed). Artist and license for each crest are in `assets/crests/credits.json`. Most are CC BY-SA, so derived shapes keep that license.
- irohakamon.com blocks scraping and has no stated reuse license. Use it for reference only.

## Adding a crest
1. `node tools/fetch.mjs key="Commons file title.svg"` downloads it and writes artist + license into `credits.json`.
2. Add the entry to `CLANS` in `js/data.js` (`kind`: buke / heian / imperial / buddhist) and its ja / zh text to `CLAN_TX` in `js/i18n.js`.
3. `npm run normalize`, then check the mask in `assets/masks/`.

Tendai's 三諦星 is missing: no openly licensed drawing was found.

## Pipeline (`tools/normalize.mjs`)
1. Rasterize each SVG at 2000px in headless Chrome. Detect inverted sources (white crest on a black square) and flip them.
2. Crop and center each crest in a 1000×1000 box, then write a mask to `assets/masks/`.
3. Retrace the whole crest with potrace, plus each connected piece of ink separately. Pieces with matching area are grouped as "repeated units".
4. Compute symmetry fingerprints (at 320px) around the ink centroid: overlap with itself rotated through θ (`rot`, 2° steps) and mirrored about axis φ (`mir`).

Output: `data/crests.json`. `js/main.js` reads n-fold symmetry from the fingerprints (score ≥ 0.83, and either ≥ 0.1 above the crest's median overlap or ≥ 45% of the way from the median to 1). A clan's `fold` overrides it when the source drawing breaks the design's symmetry (the imperial chrysanthemum).

## Files
- `js/data.js`: clan facts plus an optional `recipe` (a compass rebuild written in the grammar)
- `js/grammar.js`: enclosure × layout × motif → paths, construction guides, and the Japanese, romaji and English name; also `randomSpec(seed)`
- `js/render.js`: SVG markup, the compass-drawing animation, SVG export
- `js/i18n.js`: UI strings and per-house text in English, Japanese and Traditional Chinese (English house text stays in `data.js`)
- `tools/fit.html`: scores each recipe against its original (IoU at 300px) and hill-climbs its numbers. In the console: `scores()`, `fit('oda', spec, ['r', 'size'])`, `view('oda', spec)` (cream = both, gold = missing, red = extra). Run headless with `node tools/run.mjs URL 'scores()'` or `node tools/fitshot.mjs out.png '[["oda", {...}]]'`. Write the result into the clan's `recipe` and `fit` in `data.js`.
- `tools/recipes.html`: overlays each recipe on its original
- `tools/shot.mjs`: headless screenshot tool: `node tools/shot.mjs out.png URL w h waitMs "js…" "wait:ms" "anim:ms"`
