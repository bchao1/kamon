# Kamon, taken apart

Twenty Sengoku-era clan crests (kamon): a sortable gallery, a five-step deconstruction of each crest, and a workshop that generates new crests from the same grammar and names them by the traditional rules.

Live: https://bchao1.github.io/kamon/

```
npm run serve          # python3 -m http.server 8765 → http://localhost:8765
npm run normalize      # re-run the crest pipeline (needs Chrome + playwright-core from ../rider-maker)
```

## Where the crests come from
- `assets/crests/*.svg`: originals from Wikimedia Commons ([Category:SVG Japanese family crests](https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests), 508 files, all openly licensed). Artist and license for each crest are in `assets/crests/credits.json`. Most are CC BY-SA, so derived shapes keep that license.
- irohakamon.com blocks scraping and has no stated reuse license. Use it for reference only.

## Pipeline (`tools/normalize.mjs`)
1. Rasterize each SVG at 2000px in headless Chrome. Detect inverted sources (white crest on a black square) and flip them.
2. Crop and center each crest in a 1000×1000 box, then write a mask to `assets/masks/`.
3. Retrace the whole crest with potrace, plus each connected piece of ink separately. Pieces with matching area are grouped as "repeated units".
4. Compute symmetry fingerprints around the ink centroid: overlap with itself rotated through θ (`rot`, 2° steps) and mirrored about axis φ (`mir`).

Output: `data/crests.json`. `js/main.js` reads n-fold symmetry from the fingerprints (score ≥ 0.83 and ≥ 0.1 above the crest's median overlap).

## Files
- `js/data.js`: clan facts plus an optional `recipe` (a compass rebuild written in the grammar)
- `js/grammar.js`: enclosure × layout × motif → paths, construction guides, and the Japanese, romaji and English name; also `randomSpec(seed)`
- `js/render.js`: SVG markup, the compass-drawing animation, SVG export
- `tools/recipes.html`: overlays each recipe on its original, for tuning recipes
- `tools/shot.mjs`: headless screenshot tool: `node tools/shot.mjs out.png URL w h waitMs "js…" "wait:ms" "anim:ms"`
