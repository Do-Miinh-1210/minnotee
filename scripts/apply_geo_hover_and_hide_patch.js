/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
const fs = require('fs');
const filePath = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let code = fs.readFileSync(filePath, 'utf8');

// Target 1: hoverAt to highlight points and lines when in geo tools
const t1 = `if(this.gridHoverAt(n,o),this.tool.k==="geo"||this.tool.k==="select"||this.tool.k==="shape"&&Up.includes(this.tool.t)){const a=this.doc.pages[n],l=Tt(a.geo),c=this.tool.k==="geo"&&this.tool.t!=="move",u=this.tool.k==="shape"?this.pointTouched(a,l,o):c?this.endPointNear(a,l,o):this.pointNear(a,l,o,this.tool.k==="select"),sh=(!u&&this.tool.k==="select")?$0(a.geo.shapes,l,o,this.tol(),this.revealHidden()):null,shId=sh?sh.id:null;if(this.lineStart&&this.lineStart.page===n&&this.tool.k==="shape"&&(this.lineHover=u&&u!==this.lineStart.id?{at:l.get(u),id:u}:{at:((s=this.gridHover)==null?void 0:s.p)??o},this.redraw()),u!==(((i=this.hover)==null?void 0:i.point)??null)||shId!==(((s=this.hover)==null?void 0:s.shape)??null)||((r=this.hover)==null?void 0:r.page)!==n){this.hover={page:n,point:u,shape:shId};const p=this.tool.k==="select"||this.tool.k==="geo"&&this.tool.t==="move";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()}}}`;

const r1 = `if(this.gridHoverAt(n,o),this.tool.k==="geo"||this.tool.k==="select"||this.tool.k==="shape"&&Up.includes(this.tool.t)){const a=this.doc.pages[n],l=Tt(a.geo),c=this.tool.k==="geo"&&this.tool.t!=="move",u=this.tool.k==="shape"?this.pointTouched(a,l,o):c?this.pointNear(a,l,o,!0):this.pointNear(a,l,o,this.tool.k==="select"),sh=(!u&&(this.tool.k==="select"||this.tool.k==="geo"||(this.tool.k==="shape"&&Up.includes(this.tool.t))))?$0(a.geo.shapes,l,o,this.tol(),this.revealHidden()):null,shId=sh?sh.id:null;if(this.lineStart&&this.lineStart.page===n&&this.tool.k==="shape"&&(this.lineHover=u&&u!==this.lineStart.id?{at:l.get(u),id:u}:{at:((s=this.gridHover)==null?void 0:s.p)??o},this.redraw()),u!==(((i=this.hover)==null?void 0:i.point)??null)||shId!==(((s=this.hover)==null?void 0:s.shape)??null)||((r=this.hover)==null?void 0:r.page)!==n){this.hover={page:n,point:u,shape:shId};const p=this.tool.k==="select"||this.tool.k==="geo";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()}}}`;

// Target 2: selectionHidden, toggleHidden, and helpers
const t2 = `selectionHidden(){var i;const t=this.sel;if(!t)return null;const n=this.doc.pages[t.page].geo,o=t.side;if(o){const r=n.shapes.find(a=>a.id===o.shape);return r?!!((i=r.hiddenSides)!=null&&i.includes(o.i)):null}const s=[...n.shapes.filter(r=>t.shapes.has(r.id)),...Object.values(n.points).filter(r=>r.show&&t.points.has(r.id))];return s.length?s.every(r=>r.hidden):null}toggleHidden(){const t=this.sel,n=this.selectionHidden();if(!t||n===null)return;const o=t.side;this.commit(this.updatePage(t.page,s=>{const i=s.geo.shapes.map(a=>{if(o){if(a.id!==o.shape)return a;const l=(a.hiddenSides??[]).filter(u=>u!==o.i),c=n?l:[...l,o.i].sort((u,p)=>u-p);return{...a,hiddenSides:c.length?c:void 0}}return t.shapes.has(a.id)?{...a,hidden:n?void 0:!0}:a}),r=o?s.geo.points:Object.fromEntries(Object.entries(s.geo.points).map(([a,l])=>[a,l.show&&t.points.has(a)?{...l,hidden:n?void 0:!0}:l]));return{...s,geo:{points:r,shapes:i}}})),n||(this.sel=null),this.redraw(),this.emit()}`;

const r2 = `selectionHasLines(){const t=this.sel;if(!t)return!1;const n=this.doc.pages[t.page].geo;return n.shapes.some(r=>t.shapes.has(r.id)&&["segment","line","ray","extend"].includes(r.kind))}selectionHasPoints(){const t=this.sel;if(!t)return!1;return t.points.size>0}selectionHasFaces(){const t=this.sel;if(!t)return!1;const n=this.doc.pages[t.page].geo;return n.shapes.some(r=>t.shapes.has(r.id)&&["polygon","plane","circle","arc","sphere"].includes(r.kind))}selectionHidden(k){var i;const t=this.sel;if(!t)return null;const n=this.doc.pages[t.page].geo,o=t.side;if(o&&(!k||k==="line"||k==="face")){const r=n.shapes.find(a=>a.id===o.shape);return r?!!((i=r.hiddenSides)!=null&&i.includes(o.i)):null}const isL=r=>["segment","line","ray","extend"].includes(r.kind),isF=r=>["polygon","plane","circle","arc","sphere"].includes(r.kind);let s=[];if(k==="line")s=n.shapes.filter(r=>t.shapes.has(r.id)&&isL(r));else if(k==="face")s=n.shapes.filter(r=>t.shapes.has(r.id)&&isF(r));else if(k==="point")s=Object.values(n.points).filter(r=>r.show&&t.points.has(r.id));else s=[...n.shapes.filter(r=>t.shapes.has(r.id)),...Object.values(n.points).filter(r=>r.show&&t.points.has(r.id)&&(!t.carried||!t.carried.has(r.id)))];return s.length?s.every(r=>r.hidden):null}toggleHidden(k){const t=this.sel,n=this.selectionHidden(k);if(!t||n===null)return;const o=t.side;this.commit(this.updatePage(t.page,s=>{const isL=a=>["segment","line","ray","extend"].includes(a.kind),isF=a=>["polygon","plane","circle","arc","sphere"].includes(a.kind),mSh=a=>{if(!t.shapes.has(a.id))return!1;if(k==="line")return isL(a);if(k==="face")return isF(a);if(k==="point")return!1;return!0},mPt=pId=>{if(k==="line"||k==="face")return!1;if(!t.points.has(pId))return!1;if(!k&&t.carried&&t.carried.has(pId)&&t.shapes.size>0)return!1;return!0};const i=s.geo.shapes.map(a=>{if(o&&(!k||k==="line"||k==="face")){if(a.id!==o.shape)return a;const l=(a.hiddenSides??[]).filter(u=>u!==o.i),c=n?l:[...l,o.i].sort((u,p)=>u-p);return{...a,hiddenSides:c.length?c:void 0}}return mSh(a)?{...a,hidden:n?void 0:!0}:a}),r=o?s.geo.points:Object.fromEntries(Object.entries(s.geo.points).map(([a,l])=>[a,l.show&&mPt(a)?{...l,hidden:n?void 0:!0}:l]));return{...s,geo:{points:r,shapes:i}}})),n||(this.sel=null),this.redraw(),this.emit()}`;

// Target 3: down(t) passing t (event) to selectDown
const t3 = `case"select":return this.selectDown(i,p,d,r,l);`;
const r3 = `case"select":return this.selectDown(i,p,d,r,l,t);`;

// Target 4_head: selectDown signature
const t4_head = `selectDown(t,n,o,s,i){`;
const r4_head = `selectDown(t,n,o,s,i,ev){`;

// Target 4_pt: point multi-selection with shift/ctrl
const t4_pt = `const c=this.selectMode==="object"&&$0(n.geo.shapes.filter(x=>x.kind==="right"||x.kind==="angle"),o,s,this.tol(),this.revealHidden()),u=this.pointNear(n,o,s,!0),p=c&&u&&Je(s,o.get(u))>this.dotR()+4/this.zoom?null:u;if(p&&!(this.sel&&this.sel.page===t&&this.sel.points.has(p)&&this.sel.points.size>1)){this.drag={k:"point",page:t,id:p,from:s,moved:!1,pick:!1};return}`;
const r4_pt = `const c=this.selectMode==="object"&&$0(n.geo.shapes.filter(x=>x.kind==="right"||x.kind==="angle"),o,s,this.tol(),this.revealHidden()),u=this.pointNear(n,o,s,!0),p=c&&u&&Je(s,o.get(u))>this.dotR()+4/this.zoom?null:u;if(p){if(ev&&(ev.shiftKey||ev.ctrlKey)){const d=(this.sel&&this.sel.page===t)?this.sel:{page:t,strokes:new Set,items:new Set,points:new Set,shapes:new Set};d.points.has(p)?d.points.delete(p):d.points.add(p);this.sel=d,this.redraw(),this.emit();return}if(!(this.sel&&this.sel.page===t&&this.sel.points.has(p)&&this.sel.points.size>1)){this.drag={k:"point",page:t,id:p,from:s,moved:!1,pick:!1};return}}`;

// Target 4_sh: shape/stroke/item multi-selection with shift/ctrl
const t4_sh = `const d={page:t,strokes:new Set,items:new Set,points:new Set,shapes:new Set},m=this.selectMode==="object"?this.objectReach():this.tol(),g=this.selectMode==="object"?this.nearestStroke(n,s,m):[...n.strokes].reverse().find(x=>dh(x,s,m)),v=g?void 0:$0(n.geo.shapes,o,s,m,this.revealHidden()),y=!g&&!v?[...n.items].reverse().find(x=>!xr(x)&&xl(x,s)):void 0,k=!g&&!v&&!y?n.geo.shapes.find(x=>x.kind==="polygon"&&x.group&&Ah(s,x.pts.map(S=>o.get(S)??{x:NaN,y:NaN}))):void 0,w=y&&xL(y)&&this.selectMode!=="object"?y:void 0;if(g)d.strokes.add(g.id);else if(v||k)d.shapes.add((v??k).id);else if(y&&!w)d.items.add(y.id);else{this.sel=null,this.drag={k:"lasso",page:t,path:[s],free:this.selectMode!=="rect",touch:this.selectMode==="object",...w?{item:w.id}:{}},this.emit();return}`;
const r4_sh = `const isM=ev&&(ev.shiftKey||ev.ctrlKey),d=isM&&this.sel&&this.sel.page===t?this.sel:{page:t,strokes:new Set,items:new Set,points:new Set,shapes:new Set},m=this.selectMode==="object"?this.objectReach():this.tol(),g=this.selectMode==="object"?this.nearestStroke(n,s,m):[...n.strokes].reverse().find(x=>dh(x,s,m)),v=g?void 0:$0(n.geo.shapes,o,s,m,this.revealHidden()),y=!g&&!v?[...n.items].reverse().find(x=>!xr(x)&&xl(x,s)):void 0,k=!g&&!v&&!y?n.geo.shapes.find(x=>x.kind==="polygon"&&x.group&&Ah(s,x.pts.map(S=>o.get(S)??{x:NaN,y:NaN}))):void 0,w=y&&xL(y)&&this.selectMode!=="object"?y:void 0;if(g){if(isM){d.strokes.has(g.id)?d.strokes.delete(g.id):d.strokes.add(g.id);this.sel=d,this.redraw(),this.emit();return}d.strokes.add(g.id)}else if(v||k){const shId=(v??k).id;if(isM){d.shapes.has(shId)?d.shapes.delete(shId):d.shapes.add(shId);this.expandGeo(n,d);this.sel=d,this.redraw(),this.emit();return}d.shapes.add(shId)}else if(y&&!w){if(isM){d.items.has(y.id)?d.items.delete(y.id):d.items.add(y.id);this.sel=d,this.redraw(),this.emit();return}d.items.add(y.id)}else{this.sel=null,this.drag={k:"lasso",page:t,path:[s],free:this.selectMode!=="rect",touch:this.selectMode==="object",...w?{item:w.id}:{}},this.emit();return}`;

// Target 5: UI buttons in selection toolbar (Hide Line, Hide Point, Hide Face, Hide All)
const t5 = `J&&J.selectionHidden()!==null&&h.jsxs("button",{onClick:()=>{const A=!J.selectionHidden();J.toggleHidden(),A&&Ln(n.hiddenNote)},children:[J.selectionHidden()?h.jsx(oe.eye,{}):h.jsx(oe.eyeOff,{})," ",J.selectionHidden()?n.showObject:n.hideObject]})`;
const r5 = `J&&J.selectionHidden()!==null&&h.jsxs(h.Fragment,{children:[(J.selectionHasLines&&J.selectionHasLines())&&h.jsxs("button",{title:J.selectionHidden("line")?"Hiện các đường đang chọn":"Ẩn các đường đang chọn (giữ nguyên điểm)",onClick:()=>{const A=!J.selectionHidden("line");J.toggleHidden("line"),A&&Ln(n.hiddenNote)},children:[J.selectionHidden("line")?h.jsx(oe.eye,{}):h.jsx(oe.eyeOff,{})," ",J.selectionHidden("line")?"Hiện đường":"Ẩn đường"]}),(J.selectionHasPoints&&J.selectionHasPoints())&&h.jsxs("button",{title:J.selectionHidden("point")?"Hiện các điểm đang chọn":"Ẩn các điểm đang chọn",onClick:()=>{const A=!J.selectionHidden("point");J.toggleHidden("point"),A&&Ln(n.hiddenNote)},children:[J.selectionHidden("point")?h.jsx(oe.eye,{}):h.jsx(oe.eyeOff,{})," ",J.selectionHidden("point")?"Hiện điểm":"Ẩn điểm"]}),(J.selectionHasFaces&&J.selectionHasFaces())&&h.jsxs("button",{title:J.selectionHidden("face")?"Hiện các mặt đang chọn":"Ẩn các mặt đang chọn",onClick:()=>{const A=!J.selectionHidden("face");J.toggleHidden("face"),A&&Ln(n.hiddenNote)},children:[J.selectionHidden("face")?h.jsx(oe.eye,{}):h.jsx(oe.eyeOff,{})," ",J.selectionHidden("face")?"Hiện mặt":"Ẩn mặt"]}),h.jsxs("button",{title:"Ẩn/Hiện toàn bộ đối tượng đang chọn",onClick:()=>{const A=!J.selectionHidden();J.toggleHidden(),A&&Ln(n.hiddenNote)},children:[J.selectionHidden()?h.jsx(oe.eye,{}):h.jsx(oe.eyeOff,{})," ",J.selectionHidden()?"Hiện tất cả":"Ẩn tất cả"]})]})`;

console.log('Checking target presence:');
const checks = [
  ['t1', t1], ['t2', t2], ['t3', t3],
  ['t4_head', t4_head], ['t4_pt', t4_pt], ['t4_sh', t4_sh],
  ['t5', t5]
];

for (const [name, target] of checks) {
  const count = code.split(target).length - 1;
  console.log(`- ${name}: count = ${count}`);
  if (count !== 1) {
    throw new Error(`Target ${name} count is ${count}, expected 1! Aborting.`);
  }
}

code = code.replace(t1, r1);
code = code.replace(t2, r2);
code = code.replace(t3, r3);
code = code.replace(t4_head, r4_head);
code = code.replace(t4_pt, r4_pt);
code = code.replace(t4_sh, r4_sh);
code = code.replace(t5, r5);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated Resources/Whiteboard/assets/index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
