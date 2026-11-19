const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let code = fs.readFileSync(targetFile, 'utf8');

function replaceOnce(label, target, replacement) {
  const idx = code.indexOf(target);
  if (idx === -1) {
    throw new Error(`Anchor not found for [${label}]`);
  }
  if (code.indexOf(target, idx + 1) !== -1) {
    throw new Error(`Anchor not unique for [${label}]`);
  }
  code = code.slice(0, idx) + replacement + code.slice(idx + target.length);
  console.log(`✓ Patched [${label}] at ${idx}`);
}

// 1. Upgrade mee() to also handle line/ray/extend with 5-point sampling + add sAD(geo, movedIds) helper
replaceOnce(
  'mee + sAD helper',
  'function mee(e,t){const n=Tt(e),o=Fc(e,t,n),s=TR(dee(e,t,o),t.solid.view);if(!s.front.length)return e;const i=e.shapes.map(r=>{if(r.kind!=="segment")return r;const a=o.get(r.pts[0]),l=o.get(r.pts[1]);if(!a||!l)return r;const c=[.2,.5,.8].filter(d=>jR(Xn(a,Bn(St(l,a),d)),s,t.solid.view)).length>=2;if(!!r.dashed===c)return r;const{dashed:u,...p}=r;return c?{...p,dashed:!0}:p});return{...e,shapes:i}}',
  'function mee(e,t){const n=Tt(e),o=Fc(e,t,n),s=TR(dee(e,t,o),t.solid.view);if(!s.front.length)return e;const i=e.shapes.map(r=>{if(r.kind!=="segment"&&r.kind!=="line"&&r.kind!=="ray"&&r.kind!=="extend")return r;const a=o.get(r.pts[0]),l=o.get(r.pts[1]);if(!a||!l)return r;const c=[.15,.32,.5,.68,.85].filter(d=>jR(Xn(a,Bn(St(l,a),d)),s,t.solid.view)).length>=3;if(!!r.dashed===c)return r;const{dashed:u,...p}=r;return c?{...p,dashed:!0}:p});return{...e,shapes:i}}function sAD(e,t){const n=e.shapes.filter(r=>r.kind==="solid"&&r.solid);if(!n.length)return e;const o=Tt(e);let s=e;for(const i of n){const r=Fc(s,i,o);let a=!1;for(const l of t)if(r.has(l)||i.pts.includes(l)){a=!0;break}a&&(s=mee(s,i))}return s}'
);

// 2. Add autoDash3d property (default true) on whiteboard controller
replaceOnce(
  'autoDash3d field',
  'We(this,"gridSnap",!0);',
  'We(this,"gridSnap",!0);We(this,"autoDash3d",!0);'
);

// 3. Add setAutoDash3d setter
replaceOnce(
  'setAutoDash3d method',
  'setGridSnap(t){this.gridSnap=t,this.gridHover=null,this.redraw()}',
  'setGridSnap(t){this.gridSnap=t,this.gridHover=null,this.redraw()}setAutoDash3d(t){this.autoDash3d=t}'
);

// 4. Live auto solid/dashed recomputation during point drag in move()
replaceOnce(
  'move() case point',
  'y&&(this.live=this.updatePage(r.page,k=>({...k,geo:{...k.geo,points:{...k.geo.points,[r.id]:{...k.geo.points[r.id],def:y}}}})),this.recordTraces(r.page,d));break}',
  'y&&(this.live=this.updatePage(r.page,k=>{let _g={...k.geo,points:{...k.geo.points,[r.id]:{...k.geo.points[r.id],def:y}}};return this.autoDash3d&&(_g=sAD(_g,[r.id])),{...k,geo:_g}}),this.recordTraces(r.page,d));break}'
);

// 5. Auto solid/dashed recomputation after point merge in up()
replaceOnce(
  'up() case point merge',
  'case"point":if(o.moved&&this.live&&o.onto){const a=o.onto;this.commit(this.updatePage(o.page,l=>({...l,geo:eZ(l.geo,o.id,a)}),this.live))}',
  'case"point":if(o.moved&&this.live&&o.onto){const a=o.onto;this.commit(this.updatePage(o.page,l=>{let _g=eZ(l.geo,o.id,a);return this.autoDash3d&&(_g=sAD(_g,[a])),{...l,geo:_g}},this.live))}'
);

// 6. Auto solid/dashed recomputation in transformedPage() when a 3D solid is deformed (partial vertex move / non-uniform scale / 2D rotate)
replaceOnce(
  'transformedPage() solid deformation',
  'return{...a,strokes:l,items:c,geo:{points:u,shapes:p},...v?{links:v}:{}}},t)}',
  'let _g3={points:u,shapes:p};if(this.autoDash3d&&n.points.size){for(const k of p){if(k.kind!=="solid"||!k.solid)continue;const _f3=CR(_g3,k),_m3=_f3.filter(w=>n.points.has(w)).length;_m3>0&&(_m3<_f3.length||i!==0||r&&Math.abs(r.x-r.y)>1e-6)&&(_g3=mee(_g3,k))}}return{...a,strokes:l,items:c,geo:_g3,...v?{links:v}:{}}},t)}'
);

// 7. Vietnamese strings
replaceOnce(
  'vi strings',
  'gridSnap:"Bắt điểm lưới",gridSnapHint:"Trên giấy ô vuông (chấm): điểm, tâm, đỉnh, đầu đoạn và compa tự bắt vào mắt lưới ở gần; xa mắt lưới thì đặt tự do",',
  'gridSnap:"Bắt điểm lưới",gridSnapHint:"Trên giấy ô vuông (chấm): điểm, tâm, đỉnh, đầu đoạn và compa tự bắt vào mắt lưới ở gần; xa mắt lưới thì đặt tự do",autoDash3d:"Tự động nét liền / đứt",autoDash3dHint:"Tự động đổi nét liền và nét đứt theo không gian 3D khi kéo di chuyển đỉnh hoặc điểm của hình khối",'
);

// 8. English strings
replaceOnce(
  'en strings',
  'gridSnap:"Snap to grid",gridSnapHint:"On squared (dotted) paper: points, centres, corners, line ends and the compass go onto the crossing near them; away from one they go freely",',
  'gridSnap:"Snap to grid",gridSnapHint:"On squared (dotted) paper: points, centres, corners, line ends and the compass go onto the crossing near them; away from one they go freely",autoDash3d:"Auto solid / dashed (3D)",autoDash3dHint:"Automatically update solid and dashed lines in 3D when dragging vertices or points of a solid",'
);

// 9. React state for autoDash3d (default true, persisted in preferences)
replaceOnce(
  'React state aD3',
  '[Br,Di]=D.useState(u.gridSnap??!0),',
  '[Br,Di]=D.useState(u.gridSnap??!0),[aD3,saD3]=D.useState(u.autoDash3d??!0),'
);

// 10. Sync initial state to whiteboard controller
replaceOnce(
  'init setAutoDash3d',
  'A.setGridSnap(Br),',
  'A.setGridSnap(Br),A.setAutoDash3d(aD3),'
);

// 11. Toggle handler tAD3
replaceOnce(
  'toggle handler tAD3',
  '_p=()=>{Di(!Br),ht({gridSnap:!Br}),J==null||J.setGridSnap(!Br)},',
  '_p=()=>{Di(!Br),ht({gridSnap:!Br}),J==null||J.setGridSnap(!Br)},tAD3=()=>{saD3(!aD3),ht({autoDash3d:!aD3}),J==null||J.setAutoDash3d(!aD3)},'
);

// 12. Toggle button in HÌNH VẼ menu
replaceOnce(
  'HÌNH VẼ menu button',
  'h.jsxs("button",{className:Br?"checked":"",title:n.gridSnapHint,onClick:_p,children:[Br?"✓ ":"",n.gridSnap,!e.mobile&&Rt("gridSnap")&&h.jsx("kbd",{children:Rt("gridSnap")})]})]}),',
  'h.jsxs("button",{className:Br?"checked":"",title:n.gridSnapHint,onClick:_p,children:[Br?"✓ ":"",n.gridSnap,!e.mobile&&Rt("gridSnap")&&h.jsx("kbd",{children:Rt("gridSnap")})]}),h.jsxs("button",{className:aD3?"checked":"",title:n.autoDash3dHint,onClick:tAD3,children:[aD3?"✓ ":"",n.autoDash3d]})]}),'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully patched', targetFile);
