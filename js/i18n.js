// Three languages: English, Japanese, Traditional Chinese. UI strings live in STR; per-house text
// for ja / zh lives in CLAN_TX (English stays in data.js). Values may be functions of arguments.
export const LANGS = [['en', 'EN'], ['ja', '日本語'], ['zh', '繁中']];
const HTML_LANG = { en: 'en', ja: 'ja', zh: 'zh-Hant' };

function initial() {
  const q = new URLSearchParams(location.search).get('lang');
  if (HTML_LANG[q]) return q;
  const saved = localStorage.getItem('kamon-lang');
  if (HTML_LANG[saved]) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('ja') ? 'ja' : /^zh-(tw|hk|mo|hant)/.test(nav) ? 'zh' : 'en';
}
export let lang = initial();
const listeners = [];
export const onLang = (fn) => listeners.push(fn);
export function setLang(l) {
  if (!HTML_LANG[l] || l === lang) return;
  lang = l; localStorage.setItem('kamon-lang', l);
  document.documentElement.lang = HTML_LANG[l];
  listeners.forEach((fn) => fn(l));
}
document.documentElement.lang = HTML_LANG[lang];

export const t = (key, ...a) => { const v = STR[lang][key] ?? STR.en[key]; return typeof v === 'function' ? v(...a) : v ?? key; };

const STR = {
  en: {
    title: 'Kamon Deconstruct', h1: 'Kamon<br>Deconstruct',
    lede: 'The kamon are the family crests of Japan’s warring houses, laid out by painters with a compass and a ruler. This experiment traces twenty of them back to that geometry, then turns the rules into a grammar you can draw with.',
    startNav: 'Start', navGallery: 'Twenty houses', navWorkshop: 'Draw a crest', cue: '+ Scroll', langLabel: 'Language',
    heroCap: (c) => `<b>${c.mon}</b>${c.monEn}, the ${c.houseEn} crest`,
    arrange: 'Arrange the houses', arrange2: 'Arrange the houses, continued', byHouse: 'By house', bySym: 'Symmetry', byMotif: 'Motif', bySide: 'Sekigahara',
    gTitle: { grid: 'Twenty houses . 1560–1600', symmetry: 'By symmetry . how each crest repeats', motif: 'By motif . what each crest shows', side: 'At Sekigahara . 1600' },
    clickHint: '+ Click a house to take it apart',
    sekigahara: 'Hideyoshi died in 1598, leaving a five-year-old heir. Tokugawa Ieyasu began to rule alone, and Ishida Mitsunari rallied the Toyotomi loyalists against him. On 21 October 1600 the two armies met at Sekigahara. Defections turned the day, and Ieyasu was shōgun three years later.',
    symCols: { none: ['None', 'freehand'], mirror: ['Mirror', 'one fold'], r2: ['2-fold', '180°'], r3: ['3-fold', '120°'], r4: ['4-fold', '90°'], r5: ['5-fold', '72°'], r6: ['6-fold', '60°'], r8: ['8-fold', '45°'], inf: ['Circle', 'any angle'] },
    motifGroups: { plant: 'Plants', animal: 'Animals', geometric: 'Geometry', object: 'Objects', script: 'Writing' },
    houses: (n) => `${n} ${n > 1 ? 'houses' : 'house'}`,
    sides: { east: 'Eastern army', west: 'Western army', split: 'Both sides', fallen: 'Gone before 1600' },
    sideShort: { west: 'West', east: 'East', split: 'Both sides' },
    back: 'Back to the twenty houses', facts: 'Facts', source: 'Source', choose: 'Choose a house',
    stepsAria: 'Ways to take the crest apart', sWhole: 'Whole', sPieces: 'Pieces', sSym: 'Symmetry', sUnit: 'Unit', sCompass: 'Compass',
    replay: (n) => `${n}: replay the story`, gone: (y) => `Gone ${y}`,
    lord: 'Lord', crestL: 'Crest', inkL: 'Ink', inkLine: (n, sym, p) => `${n} pieces . ${sym.toLowerCase()} . ${p}% of its square`,
    sourceLine: (c) => `<a href="${c.page}">${c.file}</a> by ${c.artist || c.uploader}, ${c.license}. Re-traced here.`,
    stageAria: (c) => `${c.monEn}, crest of the ${c.houseEn}`,
    capGloss: (g) => `${g}.`,
    capPieces: (n) => `${n} pieces of ink. Matching colours are the shapes the painter repeated.`,
    matching: (n) => `${n} matching`, unique: (n) => `${n} unique`, tiny: (n) => `${n} tiny details`,
    capSym: (res) => `<b>${res}</b>. The yellow trace bulges where a turn lands on the original.`,
    symInf: 'Same at every angle', symRot: (n, a) => `${n}-fold rotation` + (a ? `, ${a} mirror ${a > 1 ? 'axes' : 'axis'}` : ''), symOneMirror: 'One mirror axis', symNone: 'None',
    unitInf: 'A circle: any slice is the whole.',
    unitWedge: (w, n, half) => `${w}°, turned ${n} times.${half ? ' Each wedge mirrors itself, so the true unit is half of one.' : ''}`,
    unitMirror: 'One mirror axis.', unitNone: 'Nothing repeats: drawn freehand.',
    capCompass: 'Circles and straight lines only; the faint shape is the original.',
    match: (p) => `Overlap with the original: ${p}%.`, toWs: 'Open in the workshop',
    wsH: 'Draw your own',
    cMotif: 'Motif', cLayout: 'Arrangement', cN: 'How many', cRows: 'Rows', cCols: 'Columns', cR: 'Distance from centre', cSize: 'Motif size', cRot: 'Turn', cAspect: 'Stretch', cDy: 'Shift down',
    cEnc: 'Enclosure', cLobes: 'Quince lobes', cCenter: 'Centre', cCenterSize: 'Centre size', cOverlay: 'Overlay', cStyle: 'Style', hinata: 'Solid (hinata)', kage: 'Outline (kage)',
    less: (n) => `${n}: less`, more: (n) => `${n}: more`, ringOnly: 'Ring only', pickCentre: 'Pick a centre',
    draw: 'Draw with compass', guides: 'Guides', surprise: 'Surprise me', download: 'Download SVG',
    motifs: { kikyo: 'bellflower', karahana: 'Chinese flower', ume: 'plum', katabami: 'wood sorrel', aoi: 'hollyhock', hishi: 'diamond', uroko: 'scale', hoshi: 'star', sen: 'coin', tomoe: 'swirl', sasa: 'bamboo leaf' },
    encs: { none: 'None', maru: 'ring', hosowa: 'thin ring', futowa: 'heavy ring', nijuwa: 'double ring', kikko: 'hexagon', kaku: 'standing square', mokko: 'quince', janome: 'snake’s eye' },
    layouts: { ring: 'Ring', single: 'Single', mitsumori: 'Pile of three', grid: 'Grid' },
    centers: { none: 'No centre', hoshi: 'Star', stamen: 'Stamens', ken: 'Sword stamens', same: 'Repeat the motif' },
    overlays: { none: 'None', juji: 'Cross', ichimonji: 'The character 一', hiki1: 'One bar', hiki2: 'Two bars', hiki3: 'Three bars' },
    fieldAria: 'Crests drawn by the workshop. Pick one to open it in the workshop.',
    openWs: (n) => `${n}: open in the workshop`, drawAgain: 'Draw again', drawNew: 'Draw new crests',
    foot: 'Crest drawings from <a href="https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests">Wikimedia Commons</a>, re-traced. Each lists its artist and licence; the re-traced shapes share it (CC BY-SA where the source is). The workshop’s crests are drawn from scratch.',
  },
  ja: {
    title: '家紋を解く', h1: '家紋を<br>解く',
    lede: '家紋は、戦国の家々が掲げた紋章です。紋章上絵師はそれをコンパスと定規で割り付けました。この実験では二十の家紋をその幾何学までたどり、その決まりを、自分で描ける文法に変えます。',
    startNav: 'はじめに', navGallery: '二十家を見る', navWorkshop: '家紋を描く', cue: '+ スクロール', langLabel: '言語',
    heroCap: (c) => `<b>${c.mon}</b>${c.houseJa}家の紋`,
    arrange: '並べ方', arrange2: '並べ方（続き）', byHouse: '家ごと', bySym: '対称性', byMotif: '図柄', bySide: '関ヶ原',
    gTitle: { grid: '二十家 . 1560–1600', symmetry: '対称性 . 家紋の繰り返し方', motif: '図柄 . 家紋に描かれたもの', side: '関ヶ原の戦い . 1600' },
    clickHint: '+ 家を選ぶと分解します',
    sekigahara: '1598年に秀吉が没し、跡継ぎはわずか五歳だった。徳川家康が独りで政を握り始め、石田三成は豊臣恩顧の大名を集めて対抗した。1600年10月21日、両軍は関ヶ原で激突した。寝返りが勝敗を決め、三年後、家康は将軍となった。',
    symCols: { none: ['なし', '手描き'], mirror: ['鏡映', '左右'], r2: ['2回', '180°'], r3: ['3回', '120°'], r4: ['4回', '90°'], r5: ['5回', '72°'], r6: ['6回', '60°'], r8: ['8回', '45°'], inf: ['円', '全角度'] },
    motifGroups: { plant: '植物', animal: '動物', geometric: '幾何', object: '器物', script: '文字' },
    houses: (n) => `${n}家`,
    sides: { east: '東軍', west: '西軍', split: '両軍に分かれる', fallen: '1600年以前に滅亡' },
    sideShort: { west: '石田三成方', east: '徳川家康方', split: '両軍に分かれる' },
    back: '二十家へ戻る', facts: '概要', source: '出典', choose: '家を選ぶ',
    stepsAria: '家紋の分解のしかた', sWhole: '全体', sPieces: '部品', sSym: '対称', sUnit: '単位', sCompass: '作図',
    replay: (n) => `${n}：話をもう一度`, gone: (y) => `${y}年に滅亡`,
    lord: '当主', crestL: '紋', inkL: '墨', inkLine: (n, sym, p) => `墨の部品${n}個 . ${sym} . 正方形の${p}%が墨`,
    sourceLine: (c) => `<a href="${c.page}">${c.file}</a>（作者 ${c.artist || c.uploader}、${c.license}）。ここでトレースし直しています。`,
    stageAria: (c) => `${c.houseJa}家の家紋、${c.mon}`,
    capGloss: (g) => `${g}。`,
    capPieces: (n) => `墨の部品は${n}個。同じ色の部品は、描き手が繰り返した形です。`,
    matching: (n) => `同形 ${n}個`, unique: (n) => `単独 ${n}個`, tiny: (n) => `細部 ${n}個`,
    capSym: (res) => `<b>${res}</b>。回したときに元の形と重なる角度で、黄色い線がふくらみます。`,
    symInf: 'どの角度でも同じ', symRot: (n, a) => `${n}回回転対称` + (a ? `、鏡映軸${a}本` : ''), symOneMirror: '鏡映軸1本', symNone: 'なし',
    unitInf: '円：どの切れ端も全体と同じ。',
    unitWedge: (w, n, half) => `${w}°を${n}回まわす。${half ? 'それぞれの扇形も左右対称なので、本当の単位はその半分。' : ''}`,
    unitMirror: '鏡映軸は1本。', unitNone: '繰り返しなし：手描き。',
    capCompass: '円と直線だけ。薄く見えるのが元の家紋です。',
    match: (p) => `元の家紋との重なり：${p}%。`, toWs: '工房で開く',
    wsH: '自分で描く',
    cMotif: '図柄', cLayout: '配置', cN: '数', cRows: '行', cCols: '列', cR: '中心からの距離', cSize: '図柄の大きさ', cRot: '回転', cAspect: '縦横比', cDy: '下へずらす',
    cEnc: '囲み', cLobes: '木瓜の弁の数', cCenter: '中心', cCenterSize: '中心の大きさ', cOverlay: '重ね', cStyle: '描き方', hinata: '日向（塗り）', kage: '陰（輪郭）',
    less: (n) => `${n}：減らす`, more: (n) => `${n}：増やす`, ringOnly: '輪のみ', pickCentre: '中心を選ぶ',
    draw: 'コンパスで描く', guides: '補助線', surprise: 'おまかせ', download: 'SVGで保存',
    motifs: { kikyo: '桔梗', karahana: '唐花', ume: '梅', katabami: '酢漿草', aoi: '葵', hishi: '菱', uroko: '鱗', hoshi: '星', sen: '銭', tomoe: '巴', sasa: '笹' },
    encs: { none: 'なし', maru: '丸', hosowa: '細輪', futowa: '太輪', nijuwa: '二重輪', kikko: '亀甲', kaku: '隅立て角', mokko: '木瓜', janome: '蛇の目' },
    layouts: { ring: '輪', single: '一つ', mitsumori: '三つ盛り', grid: '並べ' },
    centers: { none: 'なし', hoshi: '星', stamen: 'しべ', ken: '剣', same: '同じ図柄' },
    overlays: { none: 'なし', juji: '十字', ichimonji: '一文字', hiki1: '一つ引', hiki2: '二つ引', hiki3: '三つ引' },
    fieldAria: '工房が描いた家紋。選ぶと工房で開きます。',
    openWs: (n) => `${n}：工房で開く`, drawAgain: 'もう一度描く', drawNew: '新しい家紋を描く',
    foot: '家紋の図版は<a href="https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests">ウィキメディア・コモンズ</a>よりトレースし直したもの。各家紋に作者とライセンスを記載し、トレースした図形もそれを引き継ぎます（元がCC BY-SAならCC BY-SA）。工房の家紋は一から描いたものです。',
  },
  zh: {
    title: '拆解家紋', h1: '拆解<br>家紋',
    lede: '家紋是日本戰國各家族的紋章，由繪師用圓規與直尺打稿而成。這個實驗把其中二十個家紋追溯回那套幾何，再把規則變成一套你可以拿來作畫的文法。',
    startNav: '開始', navGallery: '看二十個家族', navWorkshop: '畫一個家紋', cue: '+ 向下捲動', langLabel: '語言',
    heroCap: (c) => `<b>${c.mon}</b>${c.houseZh}家的家紋`,
    arrange: '排列方式', arrange2: '排列方式（續）', byHouse: '依家族', bySym: '依對稱', byMotif: '依圖案', bySide: '關原之戰',
    gTitle: { grid: '二十個家族 . 1560–1600', symmetry: '依對稱 . 家紋如何重複', motif: '依圖案 . 家紋畫的是什麼', side: '關原之戰 . 1600' },
    clickHint: '+ 點選一個家族即可拆解',
    sekigahara: '1598年秀吉去世，留下年僅五歲的繼承人。德川家康開始獨攬大權，石田三成則召集忠於豐臣家的大名與之對抗。1600年10月21日，兩軍在關原交戰。倒戈決定了勝負，三年後家康成為將軍。',
    symCols: { none: ['無', '徒手'], mirror: ['鏡像', '左右'], r2: ['2 重', '180°'], r3: ['3 重', '120°'], r4: ['4 重', '90°'], r5: ['5 重', '72°'], r6: ['6 重', '60°'], r8: ['8 重', '45°'], inf: ['圓', '任何角度'] },
    motifGroups: { plant: '植物', animal: '動物', geometric: '幾何', object: '器物', script: '文字' },
    houses: (n) => `${n} 個家族`,
    sides: { east: '東軍', west: '西軍', split: '分屬兩軍', fallen: '1600年前已滅亡' },
    sideShort: { west: '石田方', east: '德川方', split: '分屬兩軍' },
    back: '回到二十個家族', facts: '資料', source: '來源', choose: '選擇家族',
    stepsAria: '拆解家紋的方式', sWhole: '整體', sPieces: '部件', sSym: '對稱', sUnit: '單元', sCompass: '作圖',
    replay: (n) => `${n}：重播故事`, gone: (y) => `於${y}年滅亡`,
    lord: '家主', crestL: '家紋', inkL: '墨色', inkLine: (n, sym, p) => `${n} 塊墨色部件 . ${sym} . 墨色佔方形的 ${p}%`,
    sourceLine: (c) => `<a href="${c.page}">${c.file}</a>，作者 ${c.artist || c.uploader}，${c.license}。本站重新描繪。`,
    stageAria: (c) => `${c.houseZh}家的家紋，${c.mon}`,
    capGloss: (g) => `${g}。`,
    capPieces: (n) => `共 ${n} 塊墨色部件。顏色相同的，就是繪師重複使用的形狀。`,
    matching: (n) => `${n} 個相同`, unique: (n) => `${n} 個獨有`, tiny: (n) => `${n} 個細節`,
    capSym: (res) => `<b>${res}</b>。轉到與原圖重合的角度時，黃線會向外鼓起。`,
    symInf: '任何角度都相同', symRot: (n, a) => `${n} 重旋轉對稱` + (a ? `，${a} 條鏡像軸` : ''), symOneMirror: '一條鏡像軸', symNone: '無',
    unitInf: '圓形：任何一片都是整體。',
    unitWedge: (w, n, half) => `${w}°，轉 ${n} 次。${half ? '每個扇形本身也左右對稱，所以真正的單元是半個扇形。' : ''}`,
    unitMirror: '一條鏡像軸。', unitNone: '沒有重複：徒手繪製。',
    capCompass: '只用圓和直線；淡淡的形狀是原圖。',
    match: (p) => `與原圖的重合度：${p}%。`, toWs: '在工坊中開啟',
    wsH: '自己畫',
    cMotif: '圖案', cLayout: '排列', cN: '數量', cRows: '列數', cCols: '行數', cR: '與中心的距離', cSize: '圖案大小', cRot: '旋轉', cAspect: '長寬比', cDy: '向下移動',
    cEnc: '外框', cLobes: '木瓜瓣數', cCenter: '中心', cCenterSize: '中心大小', cOverlay: '疊加', cStyle: '樣式', hinata: '實心（日向）', kage: '輪廓（陰）',
    less: (n) => `${n}：減少`, more: (n) => `${n}：增加`, ringOnly: '僅限環狀', pickCentre: '請先選擇中心',
    draw: '用圓規畫出', guides: '輔助線', surprise: '隨機產生', download: '下載 SVG',
    motifs: { kikyo: '桔梗', karahana: '唐花', ume: '梅', katabami: '酢漿草', aoi: '葵葉', hishi: '菱形', uroko: '鱗', hoshi: '星', sen: '錢', tomoe: '巴', sasa: '竹葉' },
    encs: { none: '無', maru: '圓環', hosowa: '細環', futowa: '粗環', nijuwa: '雙環', kikko: '龜甲', kaku: '方框', mokko: '木瓜', janome: '蛇目' },
    layouts: { ring: '環狀', single: '單一', mitsumori: '三疊', grid: '格狀' },
    centers: { none: '無', hoshi: '星', stamen: '花蕊', ken: '劍形花蕊', same: '相同圖案' },
    overlays: { none: '無', juji: '十字', ichimonji: '「一」字', hiki1: '一條橫槓', hiki2: '兩條橫槓', hiki3: '三條橫槓' },
    fieldAria: '工坊畫出的家紋。點選一個即可在工坊中開啟。',
    openWs: (n) => `${n}：在工坊中開啟`, drawAgain: '再畫一次', drawNew: '畫出新的家紋',
    foot: '家紋圖檔來自<a href="https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests">維基共享資源</a>，並重新描繪。每個家紋都標明作者與授權，重新描繪的圖形沿用該授權（原檔為 CC BY-SA 者即為 CC BY-SA）。工坊中的家紋則全部從零畫出。',
  },
};

// Chinese description of a generated crest (the Japanese name stays the crest's proper name).
const NUM_ZH = ['', '一', '兩', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];
export function describeZh(spec, count) {
  const m = STR.zh.motifs[spec.motif];
  let main = '';
  if (['kikyo', 'karahana', 'ume'].includes(spec.motif) && spec.layout === 'ring') main = `${NUM_ZH[spec.n] === '兩' ? '二' : NUM_ZH[spec.n]}瓣${m}`;
  else if (count > 0 && m) main = count === 1 ? m : `${NUM_ZH[Math.min(count, 13)]}個${m}`;
  const ov = spec.overlay && spec.overlay !== 'none' ? STR.zh.overlays[spec.overlay] : '';
  const enc = spec.enclosure && spec.enclosure !== 'none' ? STR.zh.encs[spec.enclosure] : '';
  let s = [main, ov].filter(Boolean).join('與') || (enc ? `空的${enc}` : '空白家紋');
  if (enc && (main || ov)) s = `${enc}中的${s}`;
  return s + (spec.style === 'kage' ? '（陰紋）' : '');
}

// ---------- per-house text ----------
// read: ja = kana reading of the crest name; zh = the crest's usual Chinese name.
export const CLAN_TX = {
  ja: {
    oda: { lord: '織田信長', province: '尾張', read: 'おだもっこう', gloss: '五弁の木瓜、中心に唐花', note: '信長は天下統一への道を切り開いた。木瓜は瓜の断面とも、上から見た鳥の巣とも言われ、定説はない。1600年、孫の秀信は西軍として岐阜城を守ったが、一日で落城した。' },
    tokugawa: { lord: '徳川家康', province: '三河', read: 'みつばあおい', gloss: '丸の中に三枚の葵の葉', note: '葉の正体はフタバアオイ（カンアオイの仲間）。1600年以降、幕府は他家がこの紋を使うことを禁じ、三枚の葉は江戸時代で最も厳重に守られた図柄となった。' },
    toyotomi: { lord: '豊臣秀吉', province: '尾張', read: 'ごしちのきり', gloss: '桐、花房は五・七・五', note: '朝廷から下賜された紋。秀吉は格下の桐紋を家臣に分け与えたため、桐紋は全国に広まった。現在は日本政府の紋章でもある。' },
    takeda: { lord: '武田信玄', province: '甲斐', read: 'たけだびし', gloss: '四つの菱で大きな菱を組む', note: '信玄の騎馬隊は東国で最も恐れられた。十字で分かれた四つの菱は、菱の葉に由来するとも言われる。1582年、織田・徳川に滅ぼされた。' },
    uesugi: { lord: '上杉謙信', province: '越後', read: 'たけにすずめ', gloss: '竹の輪の中に二羽の雀', note: '「越後の龍」謙信は、上杉の名とともにこの紋を継いだ。1600年、後継の景勝は関ヶ原へ向かわず、北で伊達・最上と戦った。' },
    date: { lord: '伊達政宗', province: '陸奥', read: 'せんだいざさ', gloss: '竹に雀、上杉の紋をより奔放に', note: '伊達家は養子縁組を通じて上杉家から雀の紋を得た。「独眼竜」政宗は、竹を輪の外へ伸ばした。' },
    sanada: { lord: '真田幸村', province: '信濃', read: 'ろくもんせん', gloss: '六枚の銭、三途の川の渡し賃', note: '六文は三途の川の渡し賃。真田の武士はいつでも死ぬ覚悟がある、という意味だ。1600年、一族はあえて二手に分かれた。幸村と父は西軍、兄は東軍についた。' },
    mori: { lord: '毛利元就', province: '安芸', read: 'いちもんじにみつぼし', gloss: '「一」の字と三つの星', note: '三つ星はオリオン座の三つ星、中国の天文学でいう「将軍星」。元就の後継・輝元は西軍の総大将だったが、大坂城にとどまり戦わなかった。' },
    shimazu: { lord: '島津義弘', province: '薩摩', read: 'まるにじゅうじ', gloss: '丸の中に十字', note: '古い図では轡（くつわ）の十字として描かれている。西軍が敗れると、義弘は東軍のただ中を正面突破して退いた。この「島津の退き口」は今も語り継がれる。' },
    akechi: { lord: '明智光秀', province: '美濃', read: 'みずいろききょう', gloss: '桔梗、伝統的に水色で染める', note: '土岐氏から受け継いだ紋。光秀は1582年に本能寺で信長を討ったが、十三日後に命を落とした。歴史書の中で、その桔梗は裏切りの象徴となった。' },
    imagawa: { lord: '今川義元', province: '駿河', read: 'あかどり', gloss: '馬の毛を梳く櫛', note: '女神が一族に、この櫛が勝利をもたらすと告げたという伝説がある。義元は二万五千の兵で京を目指したが、桶狭間で信長のわずか二千に討たれた。信長の名を天下に知らしめた戦いである。' },
    hojo: { lord: '北条氏康', province: '相模', read: 'みつうろこ', gloss: '三枚の龍の鱗', note: '伝説では、江の島の龍女が証として三枚の鱗を残した。小田原の北条は鎌倉の執権北条氏からこの紋を受け継ぎ、1590年の秀吉の小田原攻めですべてを失った。' },
    chosokabe: { lord: '長宗我部元親', province: '土佐', read: 'ななつかたばみ', gloss: '丸の中に七つの酢漿草', note: '酢漿草はしぶとく広がり、なかなか抜けない。元親は四国を制した。息子は関ヶ原で西軍につき、領地を失った。' },
    ishida: { lord: '石田三成', province: '近江', read: 'だいいちだいまんだいきち', gloss: '「一人が万人のために、万人が一人のために尽くせば、天下は吉となる」', note: '言葉でできた紋。三成は西軍をまとめ上げ、この標語を旗に掲げた。関ヶ原で裏切りにあい、数週間後に京で処刑された。' },
    maeda: { lord: '前田利家', province: '加賀', read: 'かがうめばち', gloss: '剣の形のしべを持つ梅の花', note: '梅は、梅を愛した学者・菅原道真の子孫であることを示す。前田家は東軍につき、将軍家に次ぐ日本一の大大名となった。' },
    hosokawa: { lord: '細川忠興', province: '丹後', read: 'くよう', gloss: '九つの星：日・月・惑星と蝕', note: '大きな星一つと小さな星八つ。インドの占星術が仏教とともに伝わったもの。忠興の妻ガラシャは石田方の人質となることを拒んで死を選び、忠興は東軍として戦った。' },
    kuroda: { lord: '黒田官兵衛', province: '豊前', read: 'くろだふじどもえ', gloss: '藤を三つ巴に巻いた形', note: '藤を巴の形に描いた紋。官兵衛は秀吉の軍師。息子の長政は小早川を寝返らせ、関ヶ原の勝敗を決めた。' },
    kato: { lord: '加藤清正', province: '肥後', read: 'じゃのめ', gloss: '蛇の目、替え弦を巻く弦巻とも', note: 'いちばん簡素な紋、ただの太い輪。築城の名手・清正は東軍として熊本を守った。' },
    ii: { lord: '井伊直政', province: '上野', read: 'ひこねたちばな', gloss: '丸に囲まれた橘の花', note: '橘は不老長寿の象徴。直政の「赤備え」は全身赤い甲冑をまとった。関ヶ原で負った傷に苦しみ、二年後に没した。' },
    nabeshima: { lord: '鍋島直茂', province: '肥前', read: 'ぎょうよう', gloss: '杏の葉の形をした馬具の飾り', note: '1570年の今山の戦いの後、敗れた大友氏から奪った紋。鍋島家は最初西軍についたが、領地を守るため東軍に寝返った。' },
  },
  zh: {
    oda: { house: '織田', lord: '織田信長', province: '尾張', read: '織田木瓜紋', gloss: '五瓣木瓜，中心為唐花', note: '信長開啟了統一日本的進程。木瓜紋可能是瓜果的橫切面，也可能是從上方俯瞰的鳥巢，眾說紛紜。1600年，他的孫子秀信為西軍守岐阜城，一天就失守了。' },
    tokugawa: { house: '德川', lord: '德川家康', province: '三河', read: '三葉葵紋', gloss: '圓環中的三片葵葉', note: '這種葉子其實是細辛屬的雙葉葵。1600年後，幕府禁止他人使用此紋，這三片葉子成了江戶時代受保護最嚴密的圖案。' },
    toyotomi: { house: '豐臣', lord: '豐臣秀吉', province: '尾張', read: '五七桐紋', gloss: '桐紋，花穗為五、七、五朵', note: '由朝廷賜予。秀吉又把較低階的桐紋分賜家臣，桐紋因此遍及全日本。如今它是日本政府的徽章。' },
    takeda: { house: '武田', lord: '武田信玄', province: '甲斐', read: '武田菱', gloss: '四個菱形組成一個大菱形', note: '信玄的騎兵是東國最令人畏懼的部隊。被十字分開的四個菱形，可能源自菱角的葉子。武田家於1582年被織田與德川所滅。' },
    uesugi: { house: '上杉', lord: '上杉謙信', province: '越後', read: '竹雀紋', gloss: '竹環中的兩隻麻雀', note: '「越後之龍」謙信在繼承上杉姓氏時一併繼承了此紋。1600年，繼承人景勝沒有前往關原，而是在北方與伊達、最上作戰。' },
    date: { house: '伊達', lord: '伊達政宗', province: '陸奧', read: '仙台竹雀紋', gloss: '竹與雀，比上杉家紋更奔放', note: '伊達家透過過繼從上杉家得到了雀紋。「獨眼龍」政宗讓竹子長出了圓環之外。' },
    sanada: { house: '真田', lord: '真田幸村', province: '信濃', read: '六文錢', gloss: '六枚錢幣，渡三途川的船資', note: '六文錢是付給冥河擺渡人的船資，表示真田武士隨時準備赴死。1600年，真田家刻意分成兩邊：幸村與父親加入西軍，兄長則加入東軍。' },
    mori: { house: '毛利', lord: '毛利元就', province: '安藝', read: '一文字三星紋', gloss: '「一」字下方三顆星', note: '三顆星是獵戶座腰帶，即中國天文學中的「將軍星」。元就的繼承人輝元名義上是西軍總大將，卻留在大阪城，始終沒有出戰。' },
    shimazu: { house: '島津', lord: '島津義弘', province: '薩摩', read: '丸十字紋', gloss: '圓環中的十字', note: '早期的圖樣畫的是馬嚼子的十字。西軍戰敗後，義弘率軍直接衝破東軍陣中撤退，這場「島津退兵」至今仍廣為流傳。' },
    akechi: { house: '明智', lord: '明智光秀', province: '美濃', read: '水色桔梗紋', gloss: '桔梗花，傳統上染成水藍色', note: '繼承自土岐氏。光秀於1582年在本能寺背叛信長，十三天後便身亡。在史書中，他的桔梗成了背叛的象徵。' },
    imagawa: { house: '今川', lord: '今川義元', province: '駿河', read: '赤鳥紋', gloss: '梳理馬毛的梳子', note: '傳說一位女神告訴今川家，這把梳子會帶來勝利。義元率兩萬五千大軍上洛，卻在桶狹間被信長僅兩千人討取，這一戰讓信長名揚天下。' },
    hojo: { house: '北條', lord: '北條氏康', province: '相模', read: '三鱗紋', gloss: '三片龍鱗', note: '傳說江之島的龍女留下三片鱗片作為信物。小田原北條氏從鎌倉執權北條氏承襲此紋，1590年秀吉圍攻小田原時失去了一切。' },
    chosokabe: { house: '長宗我部', lord: '長宗我部元親', province: '土佐', read: '七酢漿草紋', gloss: '圓環中的七朵酢漿草', note: '酢漿草生命力頑強，四處蔓延，難以拔除。元親統一了四國。他的兒子在關原選擇西軍，失去了家族的領地。' },
    ishida: { house: '石田', lord: '石田三成', province: '近江', read: '大一大萬大吉', gloss: '「一人為萬人，萬人為一人，則天下大吉」', note: '由文字組成的家紋。三成組織了西軍，並把這句格言寫在旗幟上。他在關原遭到背叛，數週後在京都被處決。' },
    maeda: { house: '前田', lord: '前田利家', province: '加賀', read: '加賀梅鉢紋', gloss: '帶有劍形花蕊的梅花', note: '梅紋表示自稱是愛梅的學者菅原道真的後裔。前田家加入東軍，成為僅次於將軍家的日本最富大名。' },
    hosokawa: { house: '細川', lord: '細川忠興', province: '丹後', read: '九曜紋', gloss: '九曜：日、月、行星與蝕', note: '一顆大星與八顆小星，源自印度占星術，經由佛教傳入。忠興之妻細川伽羅奢寧死也不願成為石田方的人質，忠興則為東軍作戰。' },
    kuroda: { house: '黑田', lord: '黑田官兵衛', province: '豐前', read: '黑田藤巴紋', gloss: '紫藤捲成三巴漩渦', note: '把紫藤畫成巴紋的漩渦形。官兵衛是秀吉的軍師。他的兒子長政說服小早川倒戈，決定了關原之戰的勝負。' },
    kato: { house: '加藤', lord: '加藤清正', province: '肥後', read: '蛇目紋', gloss: '蛇目，也是收納備用弓弦的弦卷', note: '所有家紋中最簡單的一個：一個粗圓環。築城名家清正為東軍鎮守熊本。' },
    ii: { house: '井伊', lord: '井伊直政', province: '上野', read: '彥根橘紋', gloss: '圓環中的橘花', note: '橘象徵長生不老。直政的「赤備」部隊身穿全紅鎧甲；他在關原所受的傷一直困擾著他，兩年後便去世了。' },
    nabeshima: { house: '鍋島', lord: '鍋島直茂', province: '肥前', read: '杏葉紋', gloss: '杏葉形的馬具飾物', note: '1570年今山之戰後，從戰敗的大友氏手中取得此紋。鍋島家起初加入西軍，後來為保住領地轉投東軍。' },
  },
};

// A house's text in the current language: { house, houseEn, houseJa, houseZh, lord, province, read, gloss, note, ... }
export function clanText(c) {
  const x = lang === 'en' ? {} : CLAN_TX[lang][c.key] || {};
  return { ...c, houseJa: c.house, houseZh: CLAN_TX.zh[c.key]?.house || c.house, read: c.monEn, ...x };
}
