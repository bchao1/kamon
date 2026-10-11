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
    title: 'Kamon, taken apart',
    lede: 'Twenty crests of the Sengoku houses, broken down into the compass strokes they were drawn with. Then a workshop where you can draw your own.',
    navGallery: 'See the twenty houses', navWorkshop: 'Draw a crest', langLabel: 'Language',
    heroAria: 'A crest being drawn with compass and ruler',
    heroCap: (c) => `<b>${c.mon}</b>${c.monEn}, the ${c.houseEn} crest`,
    galleryH: 'Twenty houses',
    galleryP: 'Every crest here was worn into battle between 1560 and 1600. Re-sort them to see what they share, or pick one to take it apart.',
    arrange: 'Arrange crests', byHouse: 'By house', bySym: 'By symmetry', byMotif: 'By motif', bySide: 'At Sekigahara',
    stepsAria: 'Ways to take the crest apart', sWhole: 'Whole', sPieces: 'Pieces', sSym: 'Symmetry', sUnit: 'Unit', sCompass: 'Compass',
    wsH: 'Workshop',
    wsP: 'Every crest in this workshop is built from the same parts as the real ones: a motif, repeated in an arrangement, inside an enclosure. The name updates as you build, following the traditional naming rules.',
    draw: 'Draw with compass', guides: 'Show guides', surprise: 'Surprise me', download: 'Download SVG',
    fieldH: 'A field of crests', fieldP: 'Twenty-four random crests built from the grammar. Pick one to open it in the workshop.', fieldAgain: 'Make another field',
    openWs: (n) => `${n}: open in workshop`,
    foot: 'Crest drawings from <a href="https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests">Wikimedia Commons</a>, re-traced for consistency; each crest lists its artist and license. The re-traced shapes share those licenses (CC BY-SA where the source is CC BY-SA). The workshop’s crests are generated from scratch.',
    houses: (n) => `${n} ${n > 1 ? 'houses' : 'house'}`, destroyedRange: 'Destroyed in 1560–1590',
    lord: 'Lord', province: 'Province', in1600: 'In 1600', destroyed: (y) => `Destroyed in ${y}`,
    statPieces: 'separate pieces of ink', statRot: 'rotational symmetry', statSym: 'symmetry', statInk: 'of its square is ink', mirror: 'Mirror', none: 'None',
    credit: (c) => `Source: <a href="${c.page}">${c.file}</a> by ${c.artist || c.uploader}, ${c.license}. Re-traced here.`,
    choose: 'Choose a crest', stageAria: (c) => `${c.monEn}, crest of the ${c.houseEn}`,
    capWhole: (c) => `${c.mon}, ${c.monEn}. ${c.gloss}.`,
    capPieces: (n) => `${n} separate pieces of ink, pulled apart. Pieces with the same area share a colour: the shapes the painter repeated.`,
    matching: (n) => `${n} matching`, unique: (n) => `${n} unique`, tiny: (n) => `${n} tiny details`,
    capSym: (peaks, res) => `The yellow line shows how much the crest overlaps itself as it turns through 360°: further out means a closer match. ${peaks} Blue dashes mark mirror axes. Result: <b>${res}</b>.`,
    peaks: (d) => `It peaks every ${d}°.`,
    symInf: 'Same at every angle', symRot: (n, a) => `${n}-fold rotation` + (a ? `, ${a} mirror ${a > 1 ? 'axes' : 'axis'}` : ''), symOneMirror: 'One mirror axis', symNone: 'None',
    unitInf: 'Any thin slice is the whole crest: a circle looks the same at every angle.',
    unitWedge: (w, n, half) => `The yellow wedge is ${w}° of the crest. Turn it ${n} times and you have the whole thing.${half ? ' Each wedge is also mirror-symmetric, so the true unit is half a wedge.' : ''}`,
    unitMirror: 'Only one mirror axis. The yellow half, flipped across the blue line, gives you the other half.',
    unitNone: 'No part repeats exactly, so the whole crest is its own unit. Crests like this were drawn freehand, not built up from a repeated wedge.',
    capCompass: 'A rebuild using only circles and straight lines, the way crest painters lay them out. The faint shape underneath is the original.',
    match: (p) => `Overlap with the original: ${p}%.`, toWs: 'Open in the workshop',
    symGroups: { none: ['No symmetry', 'Drawn freehand'], mirror: ['Mirror', 'Left matches right'], r2: ['2-fold', 'Same after a half turn'], r3: ['3-fold', 'Repeats every 120°'], r4: ['4-fold', 'Repeats every 90°'], r5: ['5-fold', 'Repeats every 72°'], r6: ['6-fold', 'Repeats every 60°'], r8: ['8-fold', 'Repeats every 45°'], inf: ['Circle', 'Same at every angle'] },
    motifGroups: { plant: 'Plants', animal: 'Animals', geometric: 'Geometry', object: 'Objects', script: 'Writing' },
    sides: { east: 'Eastern army', west: 'Western army', split: 'Both sides', fallen: 'Gone before 1600' },
    cMotif: 'Motif', cLayout: 'Arrangement', cN: 'How many', cRows: 'Rows', cCols: 'Columns', cR: 'Distance from centre', cSize: 'Motif size', cRot: 'Turn', cAspect: 'Stretch', cDy: 'Shift down',
    cEnc: 'Enclosure', cLobes: 'Quince lobes', cCenter: 'Centre', cCenterSize: 'Centre size', cOverlay: 'Overlay', cStyle: 'Style', hinata: 'Solid (hinata)', kage: 'Outline (kage)',
    motifs: { kikyo: 'bellflower', karahana: 'Chinese flower', ume: 'plum', katabami: 'wood sorrel', aoi: 'hollyhock', hishi: 'diamond', uroko: 'scale', hoshi: 'star', sen: 'coin', tomoe: 'swirl', sasa: 'bamboo leaf' },
    encs: { none: 'none', maru: 'ring', hosowa: 'thin ring', futowa: 'heavy ring', nijuwa: 'double ring', kikko: 'hexagon', kaku: 'standing square', mokko: 'quince', janome: 'snake’s eye' },
    layouts: { ring: 'Ring', single: 'Single', mitsumori: 'Pile of three', grid: 'Grid' },
    centers: { none: 'None', hoshi: 'Star', stamen: 'Stamens', ken: 'Sword stamens', same: 'Repeat motif' },
    overlays: { none: 'None', juji: 'Cross', ichimonji: 'The character 一', hiki1: 'One bar', hiki2: 'Two bars', hiki3: 'Three bars' },
  },
  ja: {
    title: '家紋を解く',
    lede: '戦国大名二十家の家紋を、描かれたときのコンパスと定規の線にまで分解します。そのあとは工房で、自分の家紋を描いてみてください。',
    navGallery: '二十家を見る', navWorkshop: '家紋を描く', langLabel: '言語',
    heroAria: 'コンパスと定規で描かれていく家紋',
    heroCap: (c) => `<b>${c.mon}</b>${c.houseJa}家の紋`,
    galleryH: '二十の家',
    galleryP: 'ここにある家紋はすべて、1560年から1600年の間に戦場で掲げられたものです。並べ替えて共通点を探すか、一つ選んで分解してみてください。',
    arrange: '並べ方', byHouse: '家ごと', bySym: '対称性', byMotif: '図柄', bySide: '関ヶ原',
    stepsAria: '家紋の分解のしかた', sWhole: '全体', sPieces: '部品', sSym: '対称', sUnit: '単位', sCompass: '作図',
    wsH: '工房',
    wsP: 'この工房の家紋は、本物と同じ部品でできています。図柄を、配置に従って繰り返し、囲みの中に収める。組み立てるたびに、伝統的な命名の決まりに従って名前が変わります。',
    draw: 'コンパスで描く', guides: '補助線を表示', surprise: 'おまかせ', download: 'SVGで保存',
    fieldH: '家紋の野', fieldP: '文法から無作為に作った二十四の家紋。一つ選ぶと工房で開きます。', fieldAgain: '別の野を作る',
    openWs: (n) => `${n}：工房で開く`,
    foot: '家紋の図版は<a href="https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests">ウィキメディア・コモンズ</a>より。統一のためにトレースし直しています。各家紋に作者とライセンスを記載しています。トレースした図形は元のライセンスを引き継ぎます（元がCC BY-SAならCC BY-SA）。工房の家紋はすべて一から生成したものです。',
    houses: (n) => `${n}家`, destroyedRange: '1560〜1590年に滅亡',
    lord: '当主', province: '国', in1600: '1600年', destroyed: (y) => `${y}年に滅亡`,
    statPieces: '個の独立した墨の部品', statRot: '回転対称', statSym: '対称性', statInk: 'が墨で覆われている', mirror: '鏡映', none: 'なし',
    credit: (c) => `出典：<a href="${c.page}">${c.file}</a>（作者 ${c.artist || c.uploader}、${c.license}）。ここでトレースし直しています。`,
    choose: '家紋を選ぶ', stageAria: (c) => `${c.houseJa}家の家紋、${c.mon}`,
    capWhole: (c) => `${c.mon}（${c.read}）。${c.gloss}。`,
    capPieces: (n) => `${n}個の墨の部品を引き離しました。面積が同じ部品は同じ色です。描き手が繰り返した形がわかります。`,
    matching: (n) => `同形 ${n}個`, unique: (n) => `単独 ${n}個`, tiny: (n) => `細部 ${n}個`,
    capSym: (peaks, res) => `黄色い線は、家紋を360°回したときに元の形とどれだけ重なるかを示します。外側ほどよく重なります。${peaks}青い破線は鏡映の軸です。結果：<b>${res}</b>。`,
    peaks: (d) => `${d}°ごとに山があります。`,
    symInf: 'どの角度でも同じ', symRot: (n, a) => `${n}回回転対称` + (a ? `、鏡映軸${a}本` : ''), symOneMirror: '鏡映軸1本', symNone: 'なし',
    unitInf: 'どんなに細い切れ端も全体と同じです。円はどの角度から見ても変わりません。',
    unitWedge: (w, n, half) => `黄色い扇形は家紋の${w}°分です。これを${n}回まわすと全体になります。${half ? 'それぞれの扇形も左右対称なので、本当の単位は扇形の半分です。' : ''}`,
    unitMirror: '鏡映軸は1本だけです。黄色い半分を青い線で裏返すと、もう半分になります。',
    unitNone: '正確に繰り返す部分がないので、家紋全体がそのまま単位です。こうした家紋は、扇形の繰り返しではなく手で描かれました。',
    capCompass: '円と直線だけで描き直したものです。紋章上絵師も同じように割り付けます。下に薄く見えるのが元の家紋です。',
    match: (p) => `元の家紋との重なり：${p}%。`, toWs: '工房で開く',
    symGroups: { none: ['対称なし', '手描き'], mirror: ['鏡映', '左右が一致'], r2: ['2回対称', '半回転で一致'], r3: ['3回対称', '120°ごとに繰り返す'], r4: ['4回対称', '90°ごとに繰り返す'], r5: ['5回対称', '72°ごとに繰り返す'], r6: ['6回対称', '60°ごとに繰り返す'], r8: ['8回対称', '45°ごとに繰り返す'], inf: ['円', 'どの角度でも同じ'] },
    motifGroups: { plant: '植物', animal: '動物', geometric: '幾何', object: '器物', script: '文字' },
    sides: { east: '東軍', west: '西軍', split: '両軍に分かれる', fallen: '1600年以前に滅亡' },
    cMotif: '図柄', cLayout: '配置', cN: '数', cRows: '行', cCols: '列', cR: '中心からの距離', cSize: '図柄の大きさ', cRot: '回転', cAspect: '縦横比', cDy: '下へずらす',
    cEnc: '囲み', cLobes: '木瓜の弁の数', cCenter: '中心', cCenterSize: '中心の大きさ', cOverlay: '重ね', cStyle: '描き方', hinata: '日向（塗り）', kage: '陰（輪郭）',
    motifs: { kikyo: '桔梗', karahana: '唐花', ume: '梅', katabami: '酢漿草', aoi: '葵', hishi: '菱', uroko: '鱗', hoshi: '星', sen: '銭', tomoe: '巴', sasa: '笹' },
    encs: { none: 'なし', maru: '丸', hosowa: '細輪', futowa: '太輪', nijuwa: '二重輪', kikko: '亀甲', kaku: '隅立て角', mokko: '木瓜', janome: '蛇の目' },
    layouts: { ring: '輪', single: '一つ', mitsumori: '三つ盛り', grid: '並べ' },
    centers: { none: 'なし', hoshi: '星', stamen: 'しべ', ken: '剣', same: '同じ図柄' },
    overlays: { none: 'なし', juji: '十字', ichimonji: '一文字', hiki1: '一つ引', hiki2: '二つ引', hiki3: '三つ引' },
  },
  zh: {
    title: '拆解家紋',
    lede: '把戰國時代二十個家族的家紋，拆解成繪製時所用的圓規與直尺線條。接著在工坊裡，畫出你自己的家紋。',
    navGallery: '看二十個家族', navWorkshop: '畫一個家紋', langLabel: '語言',
    heroAria: '用圓規與直尺繪製中的家紋',
    heroCap: (c) => `<b>${c.mon}</b>${c.houseZh}家的家紋`,
    galleryH: '二十個家族',
    galleryP: '這裡的每個家紋，都曾在1560到1600年間被帶上戰場。重新排列看看它們的共同點，或選一個把它拆開。',
    arrange: '排列方式', byHouse: '依家族', bySym: '依對稱', byMotif: '依圖案', bySide: '關原之戰',
    stepsAria: '拆解家紋的方式', sWhole: '整體', sPieces: '部件', sSym: '對稱', sUnit: '單元', sCompass: '作圖',
    wsH: '工坊',
    wsP: '工坊裡的每個家紋，都由和真實家紋相同的部件組成：一個圖案，依某種排列重複，再放進外框中。名稱會隨著你的設計，依照傳統命名規則自動更新。',
    draw: '用圓規畫出', guides: '顯示輔助線', surprise: '隨機產生', download: '下載 SVG',
    fieldH: '一片家紋', fieldP: '依規則隨機產生的二十四個家紋。點選一個即可在工坊中開啟。', fieldAgain: '再產生一片',
    openWs: (n) => `${n}：在工坊中開啟`,
    foot: '家紋圖檔來自<a href="https://commons.wikimedia.org/wiki/Category:SVG_Japanese_family_crests">維基共享資源</a>，為求一致重新描繪；每個家紋都標明作者與授權。重新描繪的圖形沿用原授權（原檔為 CC BY-SA 者即為 CC BY-SA）。工坊中的家紋則全部從零生成。',
    houses: (n) => `${n} 個家族`, destroyedRange: '於1560–1590年滅亡',
    lord: '家主', province: '令制國', in1600: '1600年', destroyed: (y) => `於${y}年滅亡`,
    statPieces: '塊獨立的墨色部件', statRot: '旋轉對稱', statSym: '對稱性', statInk: '的面積是墨色', mirror: '鏡像', none: '無',
    credit: (c) => `來源：<a href="${c.page}">${c.file}</a>，作者 ${c.artist || c.uploader}，${c.license}。本站重新描繪。`,
    choose: '選擇家紋', stageAria: (c) => `${c.houseZh}家的家紋，${c.mon}`,
    capWhole: (c) => `${c.mon}（${c.read}）。${c.gloss}。`,
    capPieces: (n) => `把 ${n} 塊墨色部件拉開。面積相同的部件顏色相同：也就是繪師重複使用的形狀。`,
    matching: (n) => `${n} 個相同`, unique: (n) => `${n} 個獨有`, tiny: (n) => `${n} 個細節`,
    capSym: (peaks, res) => `黃線表示家紋旋轉 360° 時與自身重疊的程度：越往外代表越吻合。${peaks}藍色虛線是鏡像對稱軸。結果：<b>${res}</b>。`,
    peaks: (d) => `每 ${d}° 出現一次高峰。`,
    symInf: '任何角度都相同', symRot: (n, a) => `${n} 重旋轉對稱` + (a ? `，${a} 條鏡像軸` : ''), symOneMirror: '一條鏡像軸', symNone: '無',
    unitInf: '任何一小片都等於整體：圓形從哪個角度看都一樣。',
    unitWedge: (w, n, half) => `黃色扇形是家紋的 ${w}°。把它轉 ${n} 次，就得到整個家紋。${half ? '每個扇形本身也左右對稱，所以真正的單元是半個扇形。' : ''}`,
    unitMirror: '只有一條鏡像軸。把黃色的一半沿藍線翻過去，就得到另一半。',
    unitNone: '沒有任何部分完全重複，所以整個家紋就是它自己的單元。這類家紋是徒手繪製的，不是由扇形重複組成。',
    capCompass: '只用圓和直線重新繪製，就像家紋繪師的打稿方式。底下淡淡的形狀是原圖。',
    match: (p) => `與原圖的重合度：${p}%。`, toWs: '在工坊中開啟',
    symGroups: { none: ['無對稱', '徒手繪製'], mirror: ['鏡像', '左右相同'], r2: ['2 重對稱', '轉半圈後相同'], r3: ['3 重對稱', '每 120° 重複'], r4: ['4 重對稱', '每 90° 重複'], r5: ['5 重對稱', '每 72° 重複'], r6: ['6 重對稱', '每 60° 重複'], r8: ['8 重對稱', '每 45° 重複'], inf: ['圓形', '任何角度都相同'] },
    motifGroups: { plant: '植物', animal: '動物', geometric: '幾何', object: '器物', script: '文字' },
    sides: { east: '東軍', west: '西軍', split: '分屬兩軍', fallen: '1600年前已滅亡' },
    cMotif: '圖案', cLayout: '排列', cN: '數量', cRows: '列數', cCols: '行數', cR: '與中心的距離', cSize: '圖案大小', cRot: '旋轉', cAspect: '長寬比', cDy: '向下移動',
    cEnc: '外框', cLobes: '木瓜瓣數', cCenter: '中心', cCenterSize: '中心大小', cOverlay: '疊加', cStyle: '樣式', hinata: '實心（日向）', kage: '輪廓（陰）',
    motifs: { kikyo: '桔梗', karahana: '唐花', ume: '梅', katabami: '酢漿草', aoi: '葵葉', hishi: '菱形', uroko: '鱗', hoshi: '星', sen: '錢', tomoe: '巴', sasa: '竹葉' },
    encs: { none: '無', maru: '圓環', hosowa: '細環', futowa: '粗環', nijuwa: '雙環', kikko: '龜甲', kaku: '方框', mokko: '木瓜', janome: '蛇目' },
    layouts: { ring: '環狀', single: '單一', mitsumori: '三疊', grid: '格狀' },
    centers: { none: '無', hoshi: '星', stamen: '花蕊', ken: '劍形花蕊', same: '相同圖案' },
    overlays: { none: '無', juji: '十字', ichimonji: '「一」字', hiki1: '一條橫槓', hiki2: '兩條橫槓', hiki3: '三條橫槓' },
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
