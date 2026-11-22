// Dựng bộ icon UI v2 "Atelier" → Resources/Whiteboard/assets/ui-v2/icons-v2.js
//
// Phong cách: khối đặc (solid). Icon chung lấy từ Phosphor Icons "fill" (MIT),
// icon riêng của toán/hình học/kiểu nét được vẽ tay cùng phong cách (lưới 256).
//
// Cách chạy:
//   npm pack @phosphor-icons/core && tar xzf phosphor-icons-core-*.tgz
//   node scripts/build_icons_v2.js package/assets/fill
//
// Mỗi khoá trùng với khoá trong bộ icon `oe` của bundle (index-*.js).

const fs = require('fs');
const path = require('path');

const PH_DIR = process.argv[2];
if (!PH_DIR) { console.error('Usage: node scripts/build_icons_v2.js <phosphor fill dir>'); process.exit(1); }
const OUT = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'ui-v2', 'icons-v2.js');

// ---- 1. Icon lấy từ Phosphor fill ----
const PHOSPHOR = {
  stretch: 'arrows-out-line-vertical', favBar: 'sparkle', globe: 'globe-hemisphere-west', mic: 'microphone',
  newNote: 'notebook', addPage: 'file-plus', saveAs: 'floppy-disk-back', importPdf: 'file-pdf',
  exportPdf: 'file-arrow-up', exportPng: 'file-image', importWord: 'file-doc', videoFolder: 'film-strip',
  projectorPage: 'projector-screen', renameTab: 'textbox', scribbleFields: 'scribble-loop',
  selectAll: 'selection-all', selectRect: 'selection', zoomIn: 'magnifying-glass-plus',
  zoomOut: 'magnifying-glass-minus', zoomLock: 'lock-key', fitWidth: 'arrows-out-line-horizontal',
  fullScreen: 'corners-out', sheetBar: 'tabs', sheetLeft: 'arrow-fat-line-left', sheetRight: 'arrow-fat-line-right',
  quickBar: 'lightning', tabletCursor: 'cursor-click', penStats: 'gauge', recordMini: 'record',
  gridSnap: 'dots-nine', clearTrace: 'broom', tikzFigure: 'brackets-curly', tikzImage: 'code-block',
  fillRegion: 'drop-half', fillPlane: 'polygon', unfillSel: 'selection-slash', sync: 'cloud-arrow-up',
  laserStay: 'push-pin', laserFade: 'hourglass-medium', laserGlow: 'sun', laserColor: 'palette',
  pressure: 'feather', search: 'magnifying-glass', menu: 'list', save: 'floppy-disk',
  undo: 'arrow-u-up-left', redo: 'arrow-u-up-right', paste: 'clipboard-text', page: 'file',
  eye: 'eye', eyeOff: 'eye-slash', settings: 'gear-six', laser: 'flashlight', connect: 'flow-arrow',
  callout: 'chat-teardrop-text', flask: 'flask', lab: 'test-tube', circuit: 'circuitry', forces: 'vector-two',
  optics: 'eyeglasses', bioGraph: 'chart-line-up', physGraph: 'chart-line', waveTool: 'wave-sine',
  fieldTool: 'magnet', physConst: 'pi', formulaSheet: 'book-open-text', structure: 'hexagon',
  atomTool: 'atom', chemDiagram: 'chart-scatter', apparatus: 'thermometer', probTool: 'tree-structure',
  statTool: 'chart-bar', cross: 'grid-four', pedigree: 'users-three', bioFig: 'leaf', division: 'circles-three',
  dna: 'dna', ecology: 'tree-evergreen', periodic: 'squares-four', table: 'table',
  inkFree: 'scribble', inkLine: 'line-segment', inkShape: 'shapes', inkBoth: 'magic-wand',
  scratch: 'note-pencil', highlighter: 'highlighter', ruler: 'ruler', compass: 'compass-tool',
  close: 'x', eraser: 'eraser', select: 'selection-foreground', lasso: 'lasso', cutRect: 'crop',
  cutFree: 'scissors', nameTag: 'tag', points: 'graph', turn3d: 'cube-focus', record: 'record',
  flatPlane: 'parallelogram', splitSection: 'intersect-square', auxLines: 'line-segments',
  alignLines: 'align-center-horizontal', pencil: 'pen-nib', pointer: 'hand-pointing', arrow: 'cursor',
  hand: 'hand-grabbing', shapes: 'shapes', geometry: 'triangle', graph: 'function', formula: 'sigma',
  spreadPlane: 'selection-inverse', layers: 'stack', layerFront: 'arrow-line-up', layerForward: 'arrow-up',
  layerBackward: 'arrow-down', layerBack: 'arrow-line-down', problem: 'exam', sticker: 'sticker',
  space: 'arrows-down-up', trace: 'path', fill: 'paint-bucket', unfill: 'drop-slash', text: 'text-t',
  finger: 'hand-tap', chevron: 'caret-down', trash: 'trash', copy: 'copy', move: 'arrows-out-cardinal',
  scissors: 'scissors', duplicate: 'copy-simple', edit: 'pencil-simple-line', pages: 'files',
  pagePrev: 'caret-circle-left', pageNext: 'caret-circle-right', present: 'presentation-chart',
  toolsToggle: 'toolbox', barToggle: 'sidebar', answers: 'list-checks', solution: 'lightbulb',
  pageLeft: 'text-align-left', pageCenter: 'text-align-center', pageRight: 'text-align-right',
  moon: 'moon', barFloat: 'app-window', timer: 'timer', dice: 'dice-five', star: 'star',
  library: 'books', folder: 'folder', plus: 'plus', more: 'dots-three', rotate: 'arrow-clockwise',
};

function phosphorInner(name) {
  const svg = fs.readFileSync(path.join(PH_DIR, `${name}-fill.svg`), 'utf8');
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
}

// ---- 2. Icon vẽ tay (lưới 256, cùng phong cách khối đặc) ----
const S = (d, extra = '') =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const T = (d, w, extra = '') =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const C = (cx, cy, r, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}"${extra}/>`;
const P = (d, extra = '') => `<path d="${d}"${extra}/>`;
const scaled = (inner, s, tx = 0, ty = 0) => `<g transform="translate(${tx} ${ty}) scale(${s})">${inner}</g>`;

const BAR_FRAME = S('M60 40h136a28 28 0 0 1 28 28v120a28 28 0 0 1-28 28H60a28 28 0 0 1-28-28V68a28 28 0 0 1 28-28z');

function custom(eraserInner) {
  const er = scaled(eraserInner, 0.74, 0, 0);
  return {
    // độ dày nét
    width1: C(128, 128, 22),
    width2: C(128, 128, 44),
    width3: C(128, 128, 70),
    dot: C(48, 128, 16) + C(116, 128, 26) + C(196, 128, 40),

    // tẩy theo cỡ
    eraserStroke: er + S('M120 226q24-28 48 0t48 0'),
    eraserSmall: er + C(206, 206, 16),
    eraserMedium: er + C(202, 202, 28),
    eraserLarge: er + C(196, 196, 42),
    scratchErase: S('M36 196c20-60 40-60 52-20s28 40 48-40') + S('M168 48l56 56M224 48l-56 56'),

    // kiểu đường
    lineSolid: S('M56 200L200 56') + C(48, 208, 22) + C(208, 48, 22),
    lineDash: S('M48 208L208 48', ' stroke-dasharray="34 34"') + C(208, 48, 20),
    lineDashDot: S('M48 208L208 48', ' stroke-dasharray="52 32 1 32"'),
    lineArrow: S('M48 208L188 68') + P('M224 32l-18 96-78-78z'),
    lineDouble: S('M68 188L188 68') + P('M224 32l-18 96-78-78z') + P('M32 224l18-96 78 78z'),
    lineElbow: S('M32 200H128V56H224') + C(32, 200, 20) + C(224, 56, 20),
    lineElbowArrow: S('M32 200H128V56H196') + P('M236 56l-48-32v64z') + C(32, 200, 20),
    lineElbowDouble: S('M60 200H128V56H196') + P('M236 56l-48-32v64z') + P('M20 200l48-32v64z'),
    lineCurve: S('M40 208C104 208 152 48 216 48') + C(40, 208, 20) + C(216, 48, 20),
    lineCurveArrow: S('M40 208C104 208 148 48 196 48') + P('M236 48l-48-30v60z') + C(40, 208, 20),
    lineCurveDouble: S('M60 208C112 208 148 48 196 48') + P('M236 48l-48-30v60z') + P('M20 208l48-30v60z'),
    lineArc: S('M48 64A152 152 0 0 1 200 216') + C(48, 64, 20) + C(200, 216, 20),
    lineBrackets: S('M100 40H64V216H100') + S('M156 40H192V216H156'),
    lineBraces: S('M100 40c-24 0-32 10-32 30v30c0 16-8 28-28 28 20 0 28 12 28 28v30c0 20 8 30 32 30')
      + S('M156 40c24 0 32 10 32 30v30c0 16 8 28 28 28-20 0-28 12-28 28v30c0 20-8 30-32 30'),
    lineBracketL: S('M152 40H104V216H152'),
    lineBracketR: S('M104 40H152V216H104'),
    lineBraceL: S('M156 40c-24 0-32 10-32 30v30c0 16-8 28-28 28 20 0 28 12 28 28v30c0 20 8 30 32 30'),
    lineBraceR: S('M100 40c24 0 32 10 32 30v30c0 16 8 28 28 28-20 0-28 12-28 28v30c0 20-8 30-32 30'),
    dashed: S('M52 204L204 52', ' stroke-dasharray="40 36"') + C(48, 208, 22) + C(208, 48, 22),
    lineStyle: S('M40 64H216') + S('M40 124H216', ' stroke-dasharray="30 30"') + '<rect x="32" y="168" width="192" height="44" rx="22"/>',

    // dụng cụ hình học
    trigTool: T('M20 128H236M128 20V236', 12, ' opacity=".45"')
      + P('M128 128h88a88 88 0 0 0-26-62z')
      + S('M128 40a88 88 0 1 1 0 176a88 88 0 1 1 0-176')
      + C(190, 66, 22),
    protractor: P('M16 192a112 112 0 0 1 224 0zM80 192a48 48 0 0 1 96 0z', ' fill-rule="evenodd"')
      + T('M128 192L196 120', 16) + C(128, 192, 16),
    circleRuler: P('M128 24a104 104 0 1 1 0 208a104 104 0 1 1 0-208zM128 72a56 56 0 1 0 0 112a56 56 0 1 0 0-112z', ' fill-rule="evenodd"')
      + C(128, 128, 18),
    setsquare: P('M36 224V32a8 8 0 0 1 14-6l192 192a8 8 0 0 1-6 14H44a8 8 0 0 1-8-8zM76 184h52L76 132z', ' fill-rule="evenodd"'),
    parabola: T('M24 212H232M128 24V236', 12, ' opacity=".45"') + S('M44 36Q128 334 212 36') + C(128, 185, 22),
    net: '<rect x="102" y="10" width="52" height="52" rx="10"/><rect x="102" y="70" width="52" height="52" rx="10"/>'
      + '<rect x="102" y="130" width="52" height="52" rx="10"/><rect x="102" y="190" width="52" height="52" rx="10"/>'
      + '<rect x="42" y="70" width="52" height="52" rx="10" opacity=".55"/><rect x="162" y="70" width="52" height="52" rx="10" opacity=".55"/>',
    vartable: S('M56 40h144a24 24 0 0 1 24 24v128a24 24 0 0 1-24 24H56a24 24 0 0 1-24-24V64a24 24 0 0 1 24-24z')
      + P('M32 64a24 24 0 0 1 24-24h144a24 24 0 0 1 24 24v28H32z')
      + T('M88 92V216', 14) + S('M112 190L156 128L200 190') + C(156, 128, 16),
    oxyz: S('M100 164V48') + S('M100 164H200') + S('M100 164L48 216')
      + P('M100 16l-26 40h52z') + P('M236 164l-40-26v52z') + P('M30 234l10-46 36 36z')
      + T('M176 92V164M176 92L136 132', 10, ' stroke-dasharray="14 16" opacity=".6"') + C(176, 92, 24),

    // vị trí thanh công cụ
    barTop: BAR_FRAME + P('M32 68a28 28 0 0 1 28-28h136a28 28 0 0 1 28 28v28H32z'),
    barBottom: BAR_FRAME + P('M32 160h192v28a28 28 0 0 1-28 28H60a28 28 0 0 1-28-28z'),
    barLeft: BAR_FRAME + P('M60 40h36v176H60a28 28 0 0 1-28-28V68a28 28 0 0 1 28-28z'),
    barRight: BAR_FRAME + P('M160 40h36a28 28 0 0 1 28 28v120a28 28 0 0 1-28 28h-36z'),
  };
}

const icons = {};
for (const [k, name] of Object.entries(PHOSPHOR)) icons[k] = phosphorInner(name);
Object.assign(icons, custom(phosphorInner('eraser')));

// Icon cho các nút do minnote-noteboard-bridge.js tạo (không nằm trong bộ `oe`)
const DOCK = {
  'tb-btn-questionbank': 'books', 'tb-btn-mindmap': 'tree-view', 'tb-btn-spatial': 'cube',
  'tb-btn-chem': 'atom', 'tb-btn-word': 'clipboard-text', 'tb-btn-import-word': 'file-doc',
  'tb-btn-google-drive': 'cloud-arrow-up', 'tb-btn-insert-image': 'image',
};
const dock = {};
for (const [id, name] of Object.entries(DOCK)) dock[id] = phosphorInner(name);

const header = `/* MinNote UI v2 — bộ icon khối đặc (tự sinh bởi scripts/build_icons_v2.js, đừng sửa tay).
   Icon gốc: Phosphor Icons (https://phosphoricons.com), giấy phép MIT, © Phosphor Icons.
   Icon toán học / kiểu nét: vẽ riêng cho MinNote. */\n`;

const runtime = `
(function () {
  var ICONS = ${JSON.stringify(icons)};
  var DOCK = ${JSON.stringify(dock)};

  // Bundle gọi hàm này với bộ icon gốc: oe = (globalThis.__mnIconsV2 || (x=>x))({...}, h)
  // Mỗi icon render cả bản cũ (.mn-ic1) lẫn bản mới (.mn-ic2); CSS chọn cái nào hiện theo html[data-ui].
  globalThis.__mnIconsV2 = function (reg, h) {
    if (!h || !h.jsx) return reg;
    var out = {};
    Object.keys(reg).forEach(function (k) {
      var orig = reg[k];
      var inner = ICONS[k];
      if (!inner || typeof orig !== 'function') { out[k] = orig; return; }
      out[k] = function (p) {
        var el = orig(p);
        if (!el || !el.props) return el;
        var oldEl = h.jsx(el.type, Object.assign({}, el.props, {
          className: ((el.props.className || '') + ' mn-ic1').trim()
        }));
        var newEl = h.jsx('svg', {
          className: ((el.props.className || '') + ' mn-ic2').trim(),
          width: 24, height: 24, viewBox: '0 0 256 256', fill: 'currentColor',
          'aria-hidden': 'true', focusable: 'false',
          dangerouslySetInnerHTML: { __html: inner }
        });
        return h.jsxs(h.Fragment, { children: [oldEl, newEl] });
      };
    });
    return out;
  };

  // Nút trong nhóm "Chèn" do minnote-noteboard-bridge.js tạo bằng DOM thuần
  function patchDock() {
    Object.keys(DOCK).forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.querySelector('svg.mn-ic2')) return;
      var old = btn.querySelector('svg');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'mn-ic2');
      svg.setAttribute('viewBox', '0 0 256 256');
      svg.setAttribute('width', old ? (old.getAttribute('width') || '16') : '16');
      svg.setAttribute('height', old ? (old.getAttribute('height') || '16') : '16');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = DOCK[id];
      if (old) { old.classList.add('mn-ic1'); old.after(svg); } else { btn.prepend(svg); }
    });
  }
  function start() {
    patchDock();
    new MutationObserver(function () { patchDock(); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
`;

fs.writeFileSync(OUT, header + runtime);
const missing = [];
console.log(`Wrote ${OUT}: ${Object.keys(icons).length} icons + ${Object.keys(dock).length} dock icons`);
module.exports = { icons, missing };
