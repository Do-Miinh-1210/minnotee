const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(target, 'utf8');

// 1. Points selection/hover highlight: replace 3-layer bloated halo with 1 single thin Cobalt ring
const oldPointHighlight =
  't.beginPath(),t.arc(T.x,T.y,this.dotR()*2.35+2/s,0,Math.PI*2),t.fillStyle=(globalThis.__mnHi?globalThis.__mnHi(.22):"rgba(37, 99, 235, 0.22)"),t.fill(),t.beginPath(),t.arc(T.x,T.y,this.dotR()*1.4+1/s,0,Math.PI*2),t.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi():"#0d9488"),t.lineWidth=2/s,t.stroke(),t.beginPath(),t.arc(T.x,T.y,Math.max(2,this.dotR()*.75),0,Math.PI*2),t.fillStyle=(globalThis.__mnHi?globalThis.__mnHi():"#0d9488"),t.fill(),d!=null&&d.points.has(j)&&(t.fillStyle=(globalThis.__mnHi?globalThis.__mnHi(.35):"rgba(13, 148, 136, 0.35)"),t.fill())';

const newPointHighlight =
  't.beginPath(),t.arc(T.x,T.y,Math.max(4/s,this.dotR()+1.8/s),0,Math.PI*2),t.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),t.lineWidth=1.6/s,t.stroke()';

// 2. Shapes (circles, segments, polygons, curves) selection/hover highlight:
//    Replace thick 2-layer halo (+7 @ 0.22 + +2.5 @ 0.68) with 1 single thin zoom-aware layer (+2.8/s @ 0.48)
const oldShapeHighlight =
  'for(const j of S){const _hc=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb");t.save(),t.globalAlpha=.22,gd(t,{points:w.geo.points,shapes:[{...j,color:_hc,width:(j.width||2)+7}]},x,{hidePoints:!0}),t.globalAlpha=.68,gd(t,{points:w.geo.points,shapes:[{...j,color:_hc,width:(j.width||2)+2.5}]},x,{hidePoints:!0}),t.restore()}';

const newShapeHighlight =
  'for(const j of S){const _hc=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb");t.save(),t.globalAlpha=.48,gd(t,{points:w.geo.points,shapes:[{...j,color:_hc,width:(j.width||2)+2.8/s}]},x,{hidePoints:!0}),t.restore()}';

// 3. Hand-drawn strokes & multi-select item boxes: thin zoom-aware 1-layer border + Cobalt fallback
const oldStrokeHighlight =
  't.save(),t.globalAlpha=.45,Na(t,{...st,color:(globalThis.__mnHi?globalThis.__mnHi():"#0d9488"),width:(st.width||2)+4}),t.restore()';

const newStrokeHighlight =
  't.save(),t.globalAlpha=.45,Na(t,{...st,color:(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),width:(st.width||2)+2.8/s}),t.restore()';

const oldMultiBox =
  't.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi():"#0d9488"),t.lineWidth=2/s,t.setLineDash([6/s,4/s])';

const newMultiBox =
  't.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),t.lineWidth=1.6/s,t.setLineDash([6/s,4/s])';

const patches = [
  ['PointHighlight', oldPointHighlight, newPointHighlight],
  ['ShapeHighlight', oldShapeHighlight, newShapeHighlight],
  ['StrokeHighlight', oldStrokeHighlight, newStrokeHighlight],
  ['MultiBox', oldMultiBox, newMultiBox],
];

for (const [name, oldStr, newStr] of patches) {
  if (src.includes(newStr)) {
    console.log(`[SKIP] ${name} already patched.`);
    continue;
  }
  if (!src.includes(oldStr)) {
    throw new Error(`[FAIL] Pattern not found for ${name}!`);
  }
  src = src.replace(oldStr, newStr);
  console.log(`[OK] Patched ${name}`);
}

fs.writeFileSync(target, src, 'utf8');
console.log('Saved:', target);
