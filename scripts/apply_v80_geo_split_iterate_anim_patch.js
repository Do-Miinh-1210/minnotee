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
// Idempotent patch script: v0.0.8.0 Geometry Split Fix, Iteration (Phép lặp),
// 8-Effect Replay Engine, Pen Tip / Hand Cursor Hook, Auto-Follow Camera,
// Continuous 3D Auto-Orbit 360°, and Export Frame Renderer.
//
// Targets ONLY: Resources/Whiteboard/assets/index-CTbULhps.js
// Safe to run repeatedly (strict marker check + exact unique anchors).

const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_V80_SPLIT_ITER_ANIM__*/";

if (src.includes(MARKER)) {
  console.log("[v80] Patch already applied (idempotent check passed).");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) throw new Error(`[v80] Could not find anchor for: ${label}`);
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) throw new Error(`[v80] Anchor not unique for: ${label}`);
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

// ============================================================================
// 1. FIX 3D SPLIT / EXPLODE GHOST AUXILIARY LINES & RED DOTS
// ============================================================================

// 1a. Upgrade shownPage(t, n) to expand hidden point set across i.pts, o.section,
//     forward dependencies, AND touching non-other-solid shapes (free aux endpoints),
//     saving this._splitHiddenPts / this._splitHiddenPage for paintOverlay/paintTraces.
const oldShownPage = `shownPage(t,n){if(this._getActiveReplays(n).length)return this.replayHiddenPage(t,n);const o=this.turning,s=!!o&&o.split>0&&t.geo.shapes.some(u=>u.id===o.section);if(!o||o.unfold<=0&&!s||o.page!==n)return t;if(this.unfolded&&this.unfolded.page===t&&this.unfolded.id===o.id)return this.unfolded.shown;const i=Yi(t.geo,o.id);if(!i)return t;const r=new Set(Object.values(t.geo.points).filter(u=>u.group===i.group).map(u=>u.id));for(let u=!0;u;){u=!1;for(const p of Object.values(t.geo.points))!r.has(p.id)&&Om(p.def).some(d=>r.has(d))&&(r.add(p.id),u=!0)}const a=Object.fromEntries(Object.entries(t.geo.points).filter(([u])=>!r.has(u))),l=t.geo.shapes.filter(u=>u.group!==i.group&&!u.pts.some(p=>r.has(p))),c={...t,geo:{...t.geo,points:a,shapes:l}};return this.unfolded={page:t,id:o.id,shown:c},c}`;

const newShownPage = `${MARKER}shownPage(t,n){if(this._getActiveReplays(n).length)return this.replayHiddenPage(t,n);const o=this.turning,s=!!o&&o.split>0.001&&(Array.isArray(o.section)?o.section.length>0:t.geo.shapes.some(u=>u.id===o.section));if(!o||o.unfold<=0&&!s||o.page!==n){if(this._splitHiddenPage===n){this._splitHiddenPts=null;this._splitHiddenPage=-1;}return t;}const _secKey=Array.isArray(o.section)?o.section.join(","):(o.section||"");if(this.unfolded&&this.unfolded.page===t&&this.unfolded.id===o.id&&this.unfolded.split===s&&this.unfolded.sec===_secKey){this._splitHiddenPts=this.unfolded.hiddenPts;this._splitHiddenPage=n;return this.unfolded.shown;}const i=Yi(t.geo,o.id);if(!i)return t;const otherSolidGroups=new Set,otherSolidPts=new Set;for(const sh of t.geo.shapes){if(sh.kind==="solid"&&sh.id!==i.id){if(sh.group&&sh.group!==i.group)otherSolidGroups.add(sh.group);if(Array.isArray(sh.pts))for(const pid of sh.pts)otherSolidPts.add(pid);}}for(const pt of Object.values(t.geo.points)){if(pt.group&&otherSolidGroups.has(pt.group))otherSolidPts.add(pt.id);}const r=new Set;for(const u of Object.values(t.geo.points)){if(i.group&&u.group===i.group)r.add(u.id);}if(Array.isArray(i.pts))for(const pid of i.pts){r.add(pid);otherSolidPts.delete(pid);}if(Array.isArray(o.section)){for(const pid of o.section)if(!otherSolidPts.has(pid))r.add(pid);}else if(typeof o.section==="string"&&o.section){const secSh=t.geo.shapes.find(u=>u.id===o.section);if(secSh&&Array.isArray(secSh.pts))for(const pid of secSh.pts)if(!otherSolidPts.has(pid))r.add(pid);}const touchKinds=new Set(["segment","line","ray","extend","polygon","right","angle","tick"]);for(let ch=!0;ch;){ch=!1;for(const p of Object.values(t.geo.points)){if(r.has(p.id)||otherSolidPts.has(p.id))continue;if(Om(p.def).some(d=>r.has(d))){r.add(p.id);ch=!0;}}for(const sh of t.geo.shapes){if(!sh||!Array.isArray(sh.pts)||!sh.pts.length||sh.kind==="solid")continue;if(sh.group&&otherSolidGroups.has(sh.group))continue;if(!touchKinds.has(sh.kind)&&sh.group!==i.group)continue;if(sh.pts.some(pid=>r.has(pid))){for(const pid of sh.pts){if(!r.has(pid)&&!otherSolidPts.has(pid)){const pt=t.geo.points[pid];if(!pt||!(pt.group&&otherSolidGroups.has(pt.group))){r.add(pid);ch=!0;}}}}}}const a=Object.fromEntries(Object.entries(t.geo.points).filter(([u])=>!r.has(u))),l=t.geo.shapes.filter(u=>u.group!==i.group&&u.id!==o.section&&!u.pts.some(p=>r.has(p))),c={...t,geo:{...t.geo,points:a,shapes:l}};this._splitHiddenPts=r;this._splitHiddenPage=n;return this.unfolded={page:t,id:o.id,split:s,sec:_secKey,hiddenPts:r,shown:c},c}`;

src = replaceOnce(src, oldShownPage, newShownPage, "shownPage split hidden graph expansion");

// 1b. Invalidate split cache cleanly in setSplit & stopTurning (and stopAutoOrbit cleanly!)
src = replaceOnce(
  src,
  `setSplit(t){var o;if(!((o=this.turning)!=null&&o.section))return;const n=Math.max(0,Math.min(1,t));n!==this.turning.split&&(this.turning={...this.turning,split:n,unfold:0},this.redraw(),this.emit())}stopTurning(){this.turning&&(this.turning=null,this.unfolded=null,this.cache.clear(),this.redraw(),this.emit())}`,
  `setSplit(t){var o;if(!((o=this.turning)!=null&&o.section))return;const n=Math.max(0,Math.min(1,t));n!==this.turning.split&&(this.turning={...this.turning,split:n,unfold:0},this.unfolded=null,n<=0.001&&(this._splitHiddenPts=null,this._splitHiddenPage=-1),this.redraw(),this.emit())}stopTurning(){this.autoOrbit&&this.stopAutoOrbit(!0);this.turning&&(this.turning=null,this.unfolded=null,this._splitHiddenPts=null,this._splitHiddenPage=-1,this.cache.clear(),this.redraw(),this.emit())}`,
  "setSplit & stopTurning cache reset + stopAutoOrbit"
);

// 1c. Skip split-hidden points in paintTraces(t, n)
src = replaceOnce(
  src,
  `paintTraces(t,n){const o=this.view.pages[n];if(!(!o||!this.traces.size)){t.save(),t.lineCap="round",t.lineJoin="round";for(const s of Object.values(o.geo.points)){const i=s.trace?this.traces.get(\`\${o.id} \${s.id}\`):void 0;if(i){`,
  `paintTraces(t,n){const o=this.view.pages[n];if(!(!o||!this.traces.size)){const _spHide=this.turning&&this.turning.page===n&&(this.turning.split>0.001||this.turning.unfold>0)&&this._splitHiddenPage===n?this._splitHiddenPts:null;t.save(),t.lineCap="round",t.lineJoin="round";for(const s of Object.values(o.geo.points)){if(_spHide&&_spHide.has(s.id))continue;const i=s.trace?this.traces.get(\`\${o.id} \${s.id}\`):void 0;if(i){`,
  "paintTraces skip split-hidden points"
);

// 1d. Pass shownPage to drawInteractiveOverlay so split/unfold/replay hidden points & dots never paint over the gap
src = replaceOnce(
  src,
  `if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.drawInteractiveOverlay==="function"){const _pg=this.view.pages[n];if(_pg&&_pg.geo){try{window.MinNoteGeoParams.drawInteractiveOverlay(t,_pg.geo,Tt(_pg.geo),n)}catch(_e){}}}`,
  `if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.drawInteractiveOverlay==="function"){const _rawPg=this.view.pages[n];const _pg=_rawPg?this.shownPage(_rawPg,n):null;if(_pg&&_pg.geo){try{window.MinNoteGeoParams.drawInteractiveOverlay(t,_pg.geo,Tt(_pg.geo),n)}catch(_e){}}}`,
  "paintOverlay drawInteractiveOverlay uses shownPage"
);

// 1e. Also skip split-hidden hover dots & draw iterate pair preview arrows in paintOverlay
src = replaceOnce(
  src,
  `if(p.size||this.picks&&this.picks.page===n||d!=null&&d.shapes.size||this.hover&&this.hover.page===n&&this.hover.shape){const w=this.view.pages[n],x=Tt(w.geo);t.save();for(const j of p){const T=x.get(j),C=w.geo.points[j];!T||!C||(!C.show&&!this.revealHidden())||(t.beginPath(),t.arc(T.x,T.y,Math.max(4/s,this.dotR()+1.8/s),0,Math.PI*2),t.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),t.lineWidth=1.6/s,t.stroke())}`,
  `if(p.size||this.picks&&this.picks.page===n||d!=null&&d.shapes.size||this.hover&&this.hover.page===n&&this.hover.shape){const _spHide2=this.turning&&this.turning.page===n&&(this.turning.split>0.001||this.turning.unfold>0)&&this._splitHiddenPage===n?this._splitHiddenPts:null;const w=this.view.pages[n],x=Tt(w.geo);t.save();for(const j of p){if(_spHide2&&_spHide2.has(j))continue;const T=x.get(j),C=w.geo.points[j];!T||!C||(!C.show&&!this.revealHidden())||(t.beginPath(),t.arc(T.x,T.y,Math.max(4/s,this.dotR()+1.8/s),0,Math.PI*2),t.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),t.lineWidth=1.6/s,t.stroke())}if(this.tool.k==="geo"&&this.tool.t==="iterate"&&this.picks&&this.picks.page===n){const _pl=this.picks.list.filter(q=>q.kind==="point");for(let _k=0;_k+1<_pl.length;_k+=2){const _pA=x.get(_pl[_k].id),_pB=x.get(_pl[_k+1].id);if(_pA&&_pB){const _dx=_pB.x-_pA.x,_dy=_pB.y-_pA.y,_L=Math.hypot(_dx,_dy)||1,_ux=_dx/_L,_uy=_dy/_L,_aw=9/s;t.save();t.strokeStyle="#2563eb";t.fillStyle="#2563eb";t.lineWidth=2/s;t.setLineDash([6/s,4/s]);t.beginPath();t.moveTo(_pA.x,_pA.y);t.lineTo(_pB.x,_pB.y);t.stroke();t.setLineDash([]);t.beginPath();t.moveTo(_pB.x,_pB.y);t.lineTo(_pB.x-_ux*_aw-_uy*_aw*.48,_pB.y-_uy*_aw+_ux*_aw*.48);t.lineTo(_pB.x-_ux*_aw+_uy*_aw*.48,_pB.y-_uy*_aw-_ux*_aw*.48);t.closePath();t.fill();const _mx=(_pA.x+_pB.x)/2,_my=(_pA.y+_pB.y)/2;t.beginPath();t.arc(_mx,_my,8/s,0,Math.PI*2);t.fillStyle="#2563eb";t.fill();t.fillStyle="#fff";t.font="700 "+Math.round(10/s)+"px system-ui,sans-serif";t.textAlign="center";t.textBaseline="middle";t.fillText(String(_k/2+1),_mx,_my);t.restore();}}}`,
  "paintOverlay skip split-hidden hover + draw iterate arrows"
);

// 1f. Upgrade kee() to skip ye.aux & ye.hidden AND exclude floating external construction spikes/labels outside solid envelope
src = replaceOnce(
  src,
  `const ee=(ye,He,qe)=>{const rt=St(qe,He),ie=Math.max(0,Math.min(1,bn(St(ye,He),rt)/Math.max(1e-9,bn(rt,rt))));return wn(St(ye,Xn(He,Bn(rt,ie))))<m},ce=[],he=(ye,He,qe)=>{const[rt,ie]=[G.get(ye)??l.get(ye),G.get(He)??l.get(He)];if(!rt||!ie)return;const[xe,_e]=[w(rt)*$,w(ie)*$];if(xe<0&&_e<=0||xe<=0&&_e<0)return;const ve=xe*_e<0?S(rt,ie,xe,_e):null,$e=xe>=0?rt:ve,at=_e>=0?ie:ve;if(wn(St($e,at))<m||q.some(Le=>ee($e,Le.a,Le.b)&&ee(at,Le.a,Le.b)))return;const le=Bn(Xn($e,at),.5),fe=K.some(Le=>Le.front&&Math.abs(bn(St(le,Le.pts[0]),Le.normal))<m);ce.push({a:$e,b:at,seen:fe,color:qe.color,width:qe.width})};for(const ye of e.shapes)ye.hidden||ye.id===n||(ye.kind==="segment"?he(ye.pts[0],ye.pts[1],ye):ye.kind==="polygon"&&!ye.fill&&ye.pts.forEach((He,qe)=>{var rt;return!((rt=ye.gaps)!=null&&rt.includes(qe))&&he(He,ye.pts[(qe+1)%ye.pts.length],ye)}));`,
  `const _sC=_r(x.flat()),_xPl=x.map(ff=>({o:ff[0],n:Zg(ff,_sC)})),_inS=pt=>_xPl.every(pl=>bn(St(pt,pl.o),pl.n)<=Math.max(m*3,2)),_corePts=new Set([...i.pts,...r.pts]);const ee=(ye,He,qe)=>{const rt=St(qe,He),ie=Math.max(0,Math.min(1,bn(St(ye,He),rt)/Math.max(1e-9,bn(rt,rt))));return wn(St(ye,Xn(He,Bn(rt,ie))))<m},ce=[],he=(ye,He,qe)=>{const[rt,ie]=[G.get(ye)??l.get(ye),G.get(He)??l.get(He)];if(!rt||!ie)return;const[xe,_e]=[w(rt)*$,w(ie)*$];if(xe<0&&_e<=0||xe<=0&&_e<0)return;const ve=xe*_e<0?S(rt,ie,xe,_e):null,$e=xe>=0?rt:ve,at=_e>=0?ie:ve;if(wn(St($e,at))<m||q.some(Le=>ee($e,Le.a,Le.b)&&ee(at,Le.a,Le.b)))return;if(qe.group!==i.group&&(!(_corePts.has(ye)||_inS($e))||!(_corePts.has(He)||_inS(at))))return;const le=Bn(Xn($e,at),.5),fe=K.some(Le=>Le.front&&Math.abs(bn(St(le,Le.pts[0]),Le.normal))<m);ce.push({a:$e,b:at,seen:fe,color:qe.color,width:qe.width})};for(const ye of e.shapes)ye.hidden||ye.aux||ye.id===n||(ye.kind==="segment"?he(ye.pts[0],ye.pts[1],ye):ye.kind==="polygon"&&!ye.fill&&ye.pts.forEach((He,qe)=>{var rt;return!((rt=ye.gaps)!=null&&rt.includes(qe))&&he(He,ye.pts[(qe+1)%ye.pts.length],ye)}));`,
  "kee skip ye.aux & external auxiliary spikes"
);

// Also keep external auxiliary labels outside the solid envelope out of kee() labels
src = replaceOnce(
  src,
  `for(const[ye,He]of l){const qe=O(ye);if(!qe||w(He)*$<0)continue;const rt=R(G.get(ye)??He);Ae.push({text:qe,at:rt,out:{x:rt.x-Ee.x,y:rt.y-Ee.y}})}`,
  `for(const[ye,He]of l){const qe=O(ye);if(!qe||w(He)*$<0)continue;const _p3=G.get(ye)??He;if(!_corePts.has(ye)&&!_inS(_p3))continue;const rt=R(_p3);Ae.push({text:qe,at:rt,out:{x:rt.x-Ee.x,y:rt.y-Ee.y}})}`,
  "kee filter external auxiliary labels"
);

// ============================================================================
// 2. ADD "PHÉP LẶP" (iterate) INSIDE "PHÉP BIẾN HÌNH"
// ============================================================================

// 2a. Implement _mnRemapDef & _mnBuildIteration right after BN()
const iterEngineCode = `function _mnRemapDef(d,mp,ms){if(!d||typeof d!=="object")return d;const r=id=>mp.has(id)?mp.get(id):id,rs=id=>ms&&ms.has(id)?ms.get(id):id;switch(d.t){case"free":return{...d};case"mid":return{...d,a:r(d.a),b:r(d.b)};case"foot":return{...d,p:r(d.p),a:r(d.a),b:r(d.b)};case"rot":return{...d,c:r(d.c),p:r(d.p)};case"sum":return{...d,a:r(d.a),b:r(d.b),c:r(d.c)};case"vec":return{...d,o:r(d.o),a:r(d.a),b:r(d.b)};case"on":return{...d,a:r(d.a),b:r(d.b)};case"len":return{...d,a:r(d.a)};case"polar":return{...d,o:r(d.o),ref:r(d.ref)};case"p3d":return{...d,o:r(d.o)};case"inter":return{...d,l1:d.l1.map(r),l2:d.l2.map(r)};case"bis":return{...d,a:r(d.a),o:r(d.o),b:r(d.b)};case"path":return{...d,pts:d.pts.map(r),...(d.shapeId?{shapeId:rs(d.shapeId)}:{})};case"ctan":return{...d,c1:d.c1.map(r),c2:d.c2.map(r)};case"onLocus":return{...d,locusId:rs(d.locusId),deps:(d.deps||[]).map(r)};case"interLocus":{const rc=c=>{if(!c)return c;if(c.kind==="line")return{...c,a:r(c.a),b:r(c.b),...(c.shapeId?{shapeId:rs(c.shapeId)}:{})};if(c.kind==="circle")return{...c,o:r(c.o),p:r(c.p),...(c.arcEnd?{arcEnd:r(c.arcEnd)}:{}),...(c.shapeId?{shapeId:rs(c.shapeId)}:{})};if(c.kind==="locus"||c.kind==="shape")return{...c,id:rs(c.id)};return c;};return{...d,c1:rc(d.c1),c2:rc(d.c2),deps:(d.deps||[]).map(r)};}default:return{...d};}}
function _mnBuildIteration(geo,rawPairs,depthArg,idGen){
  if(!geo||!Array.isArray(rawPairs)||!rawPairs.length)return{points:[],shapes:[]};
  const depth=Math.max(1,Math.min(16,Math.round(Number(depthArg)||5)));
  const seenSrc=new Set,pairs=[];
  for(const pr of rawPairs){
    if(!Array.isArray(pr)||pr.length<2)continue;
    const[s,t]=pr;
    if(!s||!t||s===t||seenSrc.has(s)||!geo.points[s]||!geo.points[t])continue;
    seenSrc.add(s);
    pairs.push([s,t]);
  }
  if(!pairs.length)return{points:[],shapes:[]};
  const srcIds=pairs.map(p=>p[0]),dstIds=pairs.map(p=>p[1]);
  const srcSet=new Set(srcIds);
  const usedLabels=new Set(Object.values(geo.points).map(p=>p.label).filter(Boolean));
  const nextLbl=(base,step)=>{
    if(step>2||!base)return "";
    const clean=String(base).replace(/'+$/,"");
    let cand=clean+"'".repeat(Math.min(3,step+1));
    if(usedLabels.has(cand))cand=clean+"_"+(step+1);
    let n=step+2;
    while(usedLabels.has(cand)&&n<40){cand=clean+"_"+n;n++;}
    usedLabels.add(cand);
    return cand;
  };
  // Collect forward reachable points from srcSet
  const reach=new Set(srcSet);
  for(let ch=!0;ch;){
    ch=!1;
    for(const pt of Object.values(geo.points)){
      if(reach.has(pt.id)||!pt.def)continue;
      const deps=Om(pt.def);
      if(deps.length&&deps.some(d=>reach.has(d))){reach.add(pt.id);ch=!0;}
    }
  }
  const hasDepTarget=dstIds.some(t=>reach.has(t));
  const outPts=[],outShs=[];
  if(hasDepTarget){
    // True GSP5 parametric iteration
    const subPtSet=new Set([...reach].filter(id=>!srcSet.has(id)));
    // Topological sort of subPtSet so parents come before children
    const subPtsOrdered=[],vis=new Set;
    const visit=id=>{
      if(vis.has(id)||!subPtSet.has(id))return;
      vis.add(id);
      const pt=geo.points[id];
      if(pt&&pt.def)for(const d of Om(pt.def))if(subPtSet.has(d))visit(d);
      subPtsOrdered.push(id);
    };
    for(const id of subPtSet)visit(id);
    // Collect shapes in dependent subgraph (touching subPtSet & all pts valid, excluding solids/hidden)
    let subShapes=(geo.shapes||[]).filter(sh=>sh&&!sh.hidden&&sh.kind!=="solid"&&sh.kind!=="flatLink"&&Array.isArray(sh.pts)&&sh.pts.length&&sh.pts.some(pid=>subPtSet.has(pid)));
    let cloneSrcOnlyShapes=!1;
    if(!subShapes.length){
      const srcShapes=(geo.shapes||[]).filter(sh=>sh&&!sh.hidden&&sh.kind!=="solid"&&sh.kind!=="flatLink"&&Array.isArray(sh.pts)&&sh.pts.length&&sh.pts.every(pid=>srcSet.has(pid)));
      if(srcShapes.length){subShapes=srcShapes;cloneSrcOnlyShapes=!0;}
    }
    let curImg=dstIds.slice();
    if(cloneSrcOnlyShapes){
      // First emit step-0 image shapes mapped onto dstIds if not already present
      const m0=new Map;
      srcIds.forEach((sid,k)=>m0.set(sid,dstIds[k]));
      for(const sh of subShapes){
        outShs.push({...sh,id:idGen(),pts:sh.pts.map(pid=>m0.get(pid)??pid),group:void 0});
      }
    }
    for(let step=1;step<=depth;step++){
      const mp=new Map,ms=new Map;
      srcIds.forEach((sid,k)=>mp.set(sid,curImg[k]));
      for(const pid of subPtsOrdered)mp.set(pid,idGen());
      for(const sh of subShapes)ms.set(sh.id,idGen());
      for(const pid of subPtsOrdered){
        const orig=geo.points[pid];
        const nid=mp.get(pid);
        const lbl=orig.show&&!orig.noName?nextLbl(orig.label,step):"";
        outPts.push({
          ...orig,
          id:nid,
          def:_mnRemapDef(orig.def,mp,ms),
          label:lbl,
          noName:step>2||!lbl||!!orig.noName,
          group:void 0,
          named:void 0
        });
      }
      // If any target dstIds[k] wasn't in subPtSet (e.g. mixed free target), advance via translation sum
      const nextImg=curImg.slice();
      dstIds.forEach((tid,k)=>{
        if(mp.has(tid)){
          nextImg[k]=mp.get(tid);
        }else{
          const nid=idGen();
          const orig=geo.points[tid];
          const lbl=orig&&orig.show?nextLbl(orig.label,step):"";
          outPts.push({...(orig||{show:!0}),id:nid,def:{t:"sum",a:curImg[k],b:tid,c:srcIds[k]},label:lbl,noName:step>2||!lbl,group:void 0,named:void 0});
          mp.set(tid,nid);
          nextImg[k]=nid;
        }
      });
      for(const sh of subShapes){
        const nid=ms.get(sh.id)||idGen();
        outShs.push({
          ...sh,
          id:nid,
          pts:sh.pts.map(pid=>mp.has(pid)?mp.get(pid):pid),
          group:void 0
        });
      }
      curImg=nextImg;
    }
  }else{
    // Independent fallback: treat A -> B as live parametric translation step vector!
    const[s0,t0]=pairs[0];
    const touchShapes=(geo.shapes||[]).filter(sh=>sh&&!sh.hidden&&sh.kind!=="solid"&&sh.kind!=="flatLink"&&Array.isArray(sh.pts)&&sh.pts.some(pid=>srcSet.has(pid)));
    const extraPtIds=new Set;
    for(const sh of touchShapes)for(const pid of sh.pts)if(!srcSet.has(pid)&&!dstIds.includes(pid))extraPtIds.add(pid);
    let prevMap=new Map;
    srcIds.forEach((sid,k)=>prevMap.set(sid,dstIds[k]));
    // First translate extra shape vertices by 1*(t0-s0) so step 1 matches dstIds
    if(extraPtIds.size){
      for(const eid of extraPtIds){
        const nid=idGen(),orig=geo.points[eid];
        const lbl=orig&&orig.show?nextLbl(orig.label,1):"";
        outPts.push({...(orig||{show:!0}),id:nid,def:{t:"sum",a:eid,b:t0,c:s0},label:lbl,noName:!lbl,group:void 0,named:void 0});
        prevMap.set(eid,nid);
      }
      for(const sh of touchShapes){
        outShs.push({...sh,id:idGen(),pts:sh.pts.map(pid=>prevMap.get(pid)??pid),group:void 0});
      }
    }
    for(let step=1;step<=depth;step++){
      const nextMap=new Map;
      pairs.forEach(([sid,tid])=>{
        const prevId=prevMap.get(sid);
        const nid=idGen(),orig=geo.points[tid]||geo.points[sid];
        const lbl=orig&&orig.show?nextLbl(orig.label,step):"";
        outPts.push({...(orig||{show:!0}),id:nid,def:{t:"sum",a:prevId,b:tid,c:sid},label:lbl,noName:step>2||!lbl,group:void 0,named:void 0});
        nextMap.set(sid,nid);
      });
      for(const eid of extraPtIds){
        const prevId=prevMap.get(eid);
        const nid=idGen(),orig=geo.points[eid];
        const lbl=orig&&orig.show?nextLbl(orig.label,step+1):"";
        outPts.push({...(orig||{show:!0}),id:nid,def:{t:"sum",a:prevId,b:t0,c:s0},label:lbl,noName:step>=2||!lbl,group:void 0,named:void 0});
        nextMap.set(eid,nid);
      }
      for(const sh of touchShapes){
        const mappedPts=sh.pts.map(pid=>{
          if(nextMap.has(pid))return nextMap.get(pid);
          if(prevMap.has(pid))return prevMap.get(pid);
          return pid;
        });
        // Avoid duplicating segment when sh connects s0 and t0 directly (shift both endpoints cleanly!)
        const shPts=sh.pts.map(pid=>pid===t0?(nextMap.get(s0)??pid):(pid===s0?(prevMap.get(s0)??pid):(nextMap.get(pid)??pid)));
        const isVecSeg=sh.pts.length===2&&sh.pts.includes(s0)&&sh.pts.includes(t0);
        outShs.push({...sh,id:idGen(),pts:isVecSeg?shPts:mappedPts,group:void 0});
      }
      prevMap=nextMap;
    }
  }
  return{points:outPts,shapes:outShs};
}
`;

src = replaceOnce(
  src,
  `t.forEach(c);const u=n.map(p=>({...p,id:s(),pts:p.pts.map(c),group:void 0}));return{points:i,shapes:u}}`,
  `t.forEach(c);const u=n.map(p=>({...p,id:s(),pts:p.pts.map(c),group:void 0}));return{points:i,shapes:u}}${iterEngineCode}`,
  "insert _mnRemapDef & _mnBuildIteration after BN"
);

// 2b. Add "iterate" to l2 under transforms
src = replaceOnce(
  src,
  `["transforms",["reflectLine","reflectPoint","translate","rotate","dilate"]]`,
  `["transforms",["reflectLine","reflectPoint","translate","rotate","dilate","iterate"]]`,
  "l2 add iterate under transforms"
);

// 2c. Add crisp duotone icon x9.iterate
src = replaceOnce(
  src,
  `dilate:()=>h.jsxs(Mt,{children:[h.jsx(ot,{soft:!0,d:"M3 21 19 11M3 21l10-19"}),h.jsx(ot,{d:"M7 17h4l-3-4.5z"}),h.jsx(ot,{hot:!0,d:"M11 13h8l-6-9z"}),h.jsx(Qt,{x:3,y:21})]}),`,
  `dilate:()=>h.jsxs(Mt,{children:[h.jsx(ot,{soft:!0,d:"M3 21 19 11M3 21l10-19"}),h.jsx(ot,{d:"M7 17h4l-3-4.5z"}),h.jsx(ot,{hot:!0,d:"M11 13h8l-6-9z"}),h.jsx(Qt,{x:3,y:21})]}),iterate:()=>h.jsxs(Mt,{children:[h.jsx(ot,{d:"M3 19h8l-4-7z"}),h.jsx(ot,{soft:!0,d:"M9.5 14.5h6.5l-3.25-5.5z"}),h.jsx(ot,{hot:!0,d:"M15 10h6l-3-5z"}),h.jsx(ot,{soft:!0,d:"M7 10.5c1.6-2.7 4.2-4.3 7.4-4.7m-1.9-1.7 2.4 1.6-1.8 2.2"})]}),`,
  "x9 add iterate duotone icon"
);

// 2d. Add VI & EN labels, hints, and turnAutoOrbit strings
src = replaceOnce(
  src,
  `dilate:"Phép vị tự",angle:"Góc (số đo)"`,
  `dilate:"Phép vị tự",iterate:"Phép lặp",angle:"Góc (số đo)"`,
  "VI geoTools.iterate"
);
src = replaceOnce(
  src,
  `geoParts:"Số phần n (2–20)",geoShift:"Tỉ số k (vectơ k·AB)"`,
  `geoParts:"Số phần n (2–20)",geoShift:"Tỉ số k (vectơ k·AB)",geoIterDepth:"Số lần lặp",geoIterApply:"Dựng lặp"`,
  "VI geoIterDepth & geoIterApply"
);
src = replaceOnce(
  src,
  `dilate:"Bấm điểm hoặc hình, rồi bấm tâm vị tự",angle:"Bấm 3 điểm, điểm giữa là đỉnh góc"`,
  `dilate:"Bấm điểm hoặc hình, rồi bấm tâm vị tự",iterate:"Chọn điểm nguồn (hoặc hình) rồi chọn điểm ảnh tương ứng — điều chỉnh số lần lặp n ở thanh nổi; bấm Enter hoặc chọn lại để dựng",angle:"Bấm 3 điểm, điểm giữa là đỉnh góc"`,
  "VI geoHints.iterate"
);
src = replaceOnce(
  src,
  `dilate:"Dilation",angle:"Angle (measure)"`,
  `dilate:"Dilation",iterate:"Iterate",angle:"Angle (measure)"`,
  "EN geoTools.iterate"
);
src = replaceOnce(
  src,
  `geoParts:"Parts n (2–20)",geoShift:"Ratio k (vector k·AB)"`,
  `geoParts:"Parts n (2–20)",geoShift:"Ratio k (vector k·AB)",geoIterDepth:"Iterations",geoIterApply:"Iterate"`,
  "EN geoIterDepth & geoIterApply"
);
src = replaceOnce(
  src,
  `dilate:"Click the point or figure, then the centre of dilation",angle:"Click 3 points; the middle one is the vertex"`,
  `dilate:"Click the point or figure, then the centre of dilation",iterate:"Click source point (or shape) then its image point — adjust iterations n in the floating bar; press Enter or click Iterate to build",angle:"Click 3 points; the middle one is the vertex"`,
  "EN geoHints.iterate"
);
src = replaceOnce(
  src,
  `unfold:"Trải hình",fold:"Gấp lại"`,
  `unfold:"Trải hình",fold:"Gấp lại",turnAutoOrbit:"Xoay 360°"`,
  "VI turnAutoOrbit"
);
src = replaceOnce(
  src,
  `unfold:"Unfold",fold:"Fold"`,
  `unfold:"Unfold",fold:"Fold",turnAutoOrbit:"Orbit 360°"`,
  "EN turnAutoOrbit"
);

// 2e. Add Nte fields (geoIterDepth, autoOrbit, _replayTip, _splitHiddenPts, _userScrollUntil) + React state + prefs
src = replaceOnce(
  src,
  `We(this,"geoParts",3);We(this,"geoShift",1);`,
  `We(this,"geoParts",3);We(this,"geoShift",1);We(this,"geoIterDepth",5);We(this,"autoOrbit",null);We(this,"_replayTip",null);We(this,"_splitHiddenPts",null);We(this,"_splitHiddenPage",-1);We(this,"_userScrollUntil",0);We(this,"_autoFollowing",!1);`,
  "Nte v80 fields"
);
src = replaceOnce(
  src,
  `Tn(o.geoParts)&&Number.isInteger(o.geoParts)&&o.geoParts>=2&&o.geoParts<=20&&(s.geoParts=o.geoParts)`,
  `Tn(o.geoParts)&&Number.isInteger(o.geoParts)&&o.geoParts>=2&&o.geoParts<=20&&(s.geoParts=o.geoParts),Tn(o.geoIterDepth)&&Number.isInteger(o.geoIterDepth)&&o.geoIterDepth>=1&&o.geoIterDepth<=16&&(s.geoIterDepth=o.geoIterDepth)`,
  "prefs parse geoIterDepth"
);
src = replaceOnce(
  src,
  `[sv,Mx]=D.useState(u.geoParts??3),`,
  `[sv,Mx]=D.useState(u.geoParts??3),[mnIter,setMnIter]=D.useState(u.geoIterDepth??5),`,
  "React state mnIter"
);
src = replaceOnce(
  src,
  `A.geoParts=sv,`,
  `A.geoParts=sv,A.geoIterDepth=mnIter,`,
  "Nte init geoIterDepth"
);

// 2f. Add floating geo-amount bar for iterate
src = replaceOnce(
  src,
  `l.k==="geo"&&l.t==="divide"&&h.jsxs("label",{className:"geo-amount",children:[n.geoParts,h.jsx("input",{type:"number",inputMode:"numeric",min:2,max:20,step:1,value:C1??String(sv),onFocus:A=>A.target.select(),onBlur:()=>ff(null),onChange:A=>{ff(A.target.value);const W=Number(A.target.value);!A.target.value.trim()||!Number.isInteger(W)||W<2||W>20||(Mx(W),ht({geoParts:W}),s.current.geoParts=W)}})]}),`,
  `l.k==="geo"&&l.t==="divide"&&h.jsxs("label",{className:"geo-amount",children:[n.geoParts,h.jsx("input",{type:"number",inputMode:"numeric",min:2,max:20,step:1,value:C1??String(sv),onFocus:A=>A.target.select(),onBlur:()=>ff(null),onChange:A=>{ff(A.target.value);const W=Number(A.target.value);!A.target.value.trim()||!Number.isInteger(W)||W<2||W>20||(Mx(W),ht({geoParts:W}),s.current.geoParts=W)}})]}),l.k==="geo"&&l.t==="iterate"&&h.jsxs("div",{className:"geo-amount geo-iter-bar",children:[h.jsx("span",{className:"geo-iter-lbl",children:n.geoIterDepth||"Số lần lặp"}),h.jsx("button",{type:"button",className:"geo-iter-step",title:"Giảm số lần lặp",onClick:()=>{const W=Math.max(1,mnIter-1);setMnIter(W),ht({geoIterDepth:W}),s.current&&(s.current.geoIterDepth=W)},children:"−"}),h.jsx("input",{type:"number",inputMode:"numeric",min:1,max:16,step:1,value:C1??String(mnIter),onFocus:A=>A.target.select(),onBlur:()=>ff(null),onChange:A=>{ff(A.target.value);const W=Number(A.target.value);!A.target.value.trim()||!Number.isInteger(W)||W<1||W>16||(setMnIter(W),ht({geoIterDepth:W}),s.current&&(s.current.geoIterDepth=W))}}),h.jsx("button",{type:"button",className:"geo-iter-step",title:"Tăng số lần lặp",onClick:()=>{const W=Math.min(16,mnIter+1);setMnIter(W),ht({geoIterDepth:W}),s.current&&(s.current.geoIterDepth=W)},children:"+"}),h.jsx("button",{type:"button",className:"geo-iter-apply",disabled:!(i&&(i.iterPairs>=1||i.iterCurveReady)),onClick:()=>{s.current&&typeof s.current.confirmGeoIterate==="function"&&s.current.confirmGeoIterate()},children:\`\${n.geoIterApply||"Dựng lặp"}\${i&&i.iterPairs>0?\` (\${i.iterPairs})\`:""}\`})]}),`,
  "geo-amount floating bar for iterate"
);

// 2g. Update emit() with iterPairs, iterCurveReady, autoOrbiting
src = replaceOnce(
  src,
  `flatSync:!!this.flatSync,spinTurning:!!this.spinTurned()}`,
  `flatSync:!!this.flatSync,spinTurning:!!this.spinTurned(),autoOrbiting:this.isAutoOrbiting(),iterPairs:this.tool.k==="geo"&&this.tool.t==="iterate"&&this.picks?Math.floor(this.picks.list.filter(q=>q.kind==="point").length/2):0,iterCurveReady:!!(this.tool.k==="geo"&&this.tool.t==="iterate"&&this.picks&&this.picks.list.length>=1&&this.picks.list[0].kind==="curve")}`,
  "emit() add autoOrbiting, iterPairs, iterCurveReady"
);

// 2h. Upgrade geoClick, wantsCurve, geoPick, finishGeo, plus confirmGeoIterate & Enter key listener
src = replaceOnce(
  src,
  `if(o==="locus"||o==="intersect"||o==="reflectLine"&&((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length)return;`,
  `if(o==="locus"||o==="intersect"||o==="iterate"||o==="reflectLine"&&((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length)return;`,
  "geoClick guard iterate against stray free points"
);

src = replaceOnce(
  src,
  `if(n==="locus")return!!(o.shape&&(["segment","line","ray","circle","polygon","locus"].includes(o.shape.kind)||NY(o.shape.kind)));if(o.kind==="locus"||o.kind==="shape")return n==="intersect";`,
  `if(n==="iterate"){const _pl=this.picks&&this.picks.page===t?this.picks.list:[];return!!(o.shape&&(!_pl.length||_pl.length===1&&_pl[0].kind==="curve"));}if(n==="locus")return!!(o.shape&&(["segment","line","ray","circle","polygon","locus"].includes(o.shape.kind)||NY(o.shape.kind)));if(o.kind==="locus"||o.kind==="shape")return n==="intersect";`,
  "wantsCurve accept shapes for iterate"
);

src = replaceOnce(
  src,
  `if(o==="polygon"&&n.kind==="point"&&s.length>=3&&s[0].kind==="point"&&s[0].id===n.id){this.finishGeo(t,"polygon",s);return}`,
  `if(o==="polygon"&&n.kind==="point"&&s.length>=3&&s[0].kind==="point"&&s[0].id===n.id){this.finishGeo(t,"polygon",s);return}if(o==="iterate"){if(n.kind==="point"&&s.length>=2&&s.length%2===0&&s.every(p=>p.kind==="point")&&(s[0].id===n.id||s[s.length-1].id===n.id)){this.finishGeo(t,"iterate",s.slice());return}if(n.kind==="curve"){if(s.length===1&&s[0].kind==="curve"){if(s[0].c.shape.id===n.c.shape.id){this.finishGeo(t,"iterate",[s[0]]);return}this.finishGeo(t,"iterate",[s[0],n]);return}if(!s.length){s.push(n);this.redraw();this.emit();return}return}if(n.kind==="point"){if(s.length&&s[0].kind==="curve")s.length=0;if(s.length%2===1&&s[s.length-1].id===n.id)return;s.push(n);this.redraw();this.emit();return}return}`,
  "geoPick handle iterate 1-pair, multi-pair, and shape quick iteration"
);

src = replaceOnce(
  src,
  `const S=v.kind==="point"?BN(s.geo,[v.id],[],x,nt):BN(s.geo,v.c.shape.pts,[v.c.shape],x,nt);u.push(...S.points),p.push(...S.shapes);break}}`,
  `const S=v.kind==="point"?BN(s.geo,[v.id],[],x,nt):BN(s.geo,v.c.shape.pts,[v.c.shape],x,nt);u.push(...S.points),p.push(...S.shapes);break}case"iterate":{let pairs=[];const cList=o.filter(q=>q.kind==="curve").map(q=>q.c);if(cList.length>=2){const s1=cList[0].shape,s2=cList[1].shape;if(s1&&s2&&Array.isArray(s1.pts)&&Array.isArray(s2.pts)){const m=Math.min(s1.pts.length,s2.pts.length);for(let k=0;k<m;k++)pairs.push([s1.pts[k],s2.pts[k]]);}}else if(cList.length===1&&cList[0].shape){const sh=cList[0].shape;const inferSrc=pid=>{const pt=s.geo.points[pid];if(!pt||!pt.def)return null;const d=pt.def;if(d.t==="rot"&&d.p){const cPt=s.geo.points[d.c];if(cPt&&cPt.def&&cPt.def.t==="foot"&&cPt.def.p===d.p)return d.p;return d.p;}if(d.t==="sum"&&d.a)return d.a;if(d.t==="vec"&&d.o)return d.o;return null;};const inferred=[];for(const pid of (sh.pts||[])){const sp=inferSrc(pid);if(sp&&sp!==pid)inferred.push([sp,pid]);}if(inferred.length)pairs=inferred;}else{for(let k=0;k+1<r.length;k+=2)pairs.push([r[k],r[k+1]]);}if(pairs.length){const res=_mnBuildIteration(s.geo,pairs,this.geoIterDepth??5,nt);u.push(...res.points),p.push(...res.shapes);}break}}`,
  "finishGeo case iterate"
);

// Add confirmGeoIterate + autoOrbit methods + renderReplayExportFrame + _stepAutoFollow on Nte
const boardNewMethods = `confirmGeoIterate(){if(!this.picks||this.tool.k!=="geo"||this.tool.t!=="iterate")return!1;const list=this.picks.list;if(!list||!list.length)return!1;if(list[0].kind==="curve"){this.finishGeo(this.picks.page,"iterate",list.slice());return!0}const pts=list.filter(x=>x.kind==="point");if(pts.length>=2){const even=pts.length-pts.length%2;this.finishGeo(this.picks.page,"iterate",pts.slice(0,even));return!0}return!1}isAutoOrbiting(){return!!this.autoOrbit}findOrbitSolid(pageIdxArg,scopeShapes){const pIdx=pageIdxArg!==void 0?pageIdxArg:(this.turning?this.turning.page:this.currentPage());const pg=this.doc.pages[pIdx];if(!pg||!pg.geo)return null;if(this.turning&&this.turning.page===pIdx&&Yi(pg.geo,this.turning.id))return{page:pIdx,id:this.turning.id};const selS=this.selectedSolid();if(selS&&selS.page===pIdx)return selS;const solids=pg.geo.shapes.filter(sh=>sh.kind==="solid"&&sh.solid);if(!solids.length)return null;if(scopeShapes&&scopeShapes.size){const grpSet=new Set;for(const sh of pg.geo.shapes)if(scopeShapes.has(sh.id)&&sh.group)grpSet.add(sh.group);const matched=solids.find(s=>s.group&&grpSet.has(s.group));if(matched)return{page:pIdx,id:matched.id};}return{page:pIdx,id:solids[0].id}}startAutoOrbit(pageIdx,solidId,speed=.75){let pIdx=pageIdx,sId=solidId;if(pIdx===void 0||!sId){const found=this.findOrbitSolid(pIdx);if(!found)return!1;pIdx=found.page;sId=found.id;}const pg=this.doc.pages[pIdx];if(!pg||!Yi(pg.geo,sId))return!1;this.stopAutoOrbit(!1);const st={page:pIdx,id:sId,speed:Number(speed)||.75,raf:0,last:performance.now(),base:pg.geo,angle:0};this.autoOrbit=st;const tick=now=>{if(this.autoOrbit!==st)return;st.raf=0;const curPg=this.doc.pages[st.page];if(!curPg||!Yi(curPg.geo,st.id)){this.stopAutoOrbit(!1);return;}const dt=Math.min(.05,Math.max(.001,(now-st.last)/1e3));st.last=now;st.angle+=st.speed*dt;this.live=this.updatePage(st.page,d=>({...d,geo:a9(st.base,st.id,Td([0,0,1],st.angle))}));this.redraw();if(this.autoOrbit===st)st.raf=requestAnimationFrame(tick);};st.raf=requestAnimationFrame(tick);this.emit();return!0}stopAutoOrbit(commitChange=!0){const st=this.autoOrbit;if(!st)return;if(st.raf)cancelAnimationFrame(st.raf);this.autoOrbit=null;if(commitChange&&this.live){const fin=this.live;this.live=null;this.commit(fin);}else{this.live=null;this.redraw();}this.emit();}toggleAutoOrbit(speed=.75,pageIdx,solidId){if(this.autoOrbit){this.stopAutoOrbit(!0);return!1;}return this.startAutoOrbit(pageIdx,solidId,speed);}_stepAutoFollow(dt){if(performance.now()<(this._userScrollUntil||0))return;const playing=this._getActiveReplays().filter(r=>r.playing&&r.followCamera!==!1);if(!playing.length)return;const r=playing.find(x=>x.id===this.activeReplayId)||playing[0];const pg=this.view.pages[r.page];if(!pg||!pg.geo)return;let fx=null,fy=null;if(this._replayTip&&this._replayTip.active&&this._replayTip.pageIdx===r.page&&Number.isFinite(this._replayTip.x)){fx=this._replayTip.x;fy=this._replayTip.y;}else{const activeSteps=r.steps.filter(s=>s.enabled!==!1);const st=activeSteps[Math.min(r.stepIdx,activeSteps.length-1)];if(st){const fp=_mnStepFocusPt(pg.geo,Tt(pg.geo),st);if(fp){fx=fp.x;fy=fp.y;}}}if(fx===null||fy===null)return;const sc=this.scroller;if(!sc)return;const cw=sc.clientWidth,ch=sc.clientHeight;if(cw<=0||ch<=0)return;const docX=this.offsetX+fx*this.zoom,docY=(this.pageTop(r.page)+fy)*this.zoom;const sl=sc.scrollLeft,stTop=sc.scrollTop;const outX=docX<sl+cw*.25||docX>sl+cw*.75,outY=docY<stTop+ch*.25||docY>stTop+ch*.75;if(!outX&&!outY)return;const factor=1-Math.exp(-7*dt);const maxL=Math.max(0,sc.scrollWidth-cw),maxT=Math.max(0,sc.scrollHeight-ch);const targetL=Math.max(0,Math.min(maxL,docX-cw*.5)),targetT=Math.max(0,Math.min(maxT,docY-ch*.5));this._autoFollowing=!0;try{if(outX&&maxL>2)sc.scrollLeft=sl+(targetL-sl)*factor;if(outY&&maxT>2)sc.scrollTop=stTop+(targetT-stTop)*factor;}finally{this._autoFollowing=!1;}}renderReplayExportFrame(ctx,replay,stepIdx,stepProgress,opts={}){if(!ctx||!replay)return{tip:null};const pg=this.doc.pages[replay.page];if(!pg||!pg.geo)return{tip:null};let geo=pg.geo;if(opts.orbitAngle&&opts.orbitSolidId&&Yi(geo,opts.orbitSolidId)){geo=a9(geo,opts.orbitSolidId,Td([0,0,1],opts.orbitAngle));}const snap={...replay,active:!0,stepIdx:Math.max(0,stepIdx|0),stepProgress:Math.max(0,Math.min(1,Number(stepProgress)||0)),playing:Number(stepProgress)<.999};const res=this._paintReplayGeo(ctx,geo,[snap],{...opts,pageIdx:replay.page,isExport:!0});if(opts.showHandCursor!==!1&&res&&res.tip&&res.tip.active&&typeof window!=="undefined"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintReplayTip==="function"){try{window.MinNoteHandCursor.paintReplayTip(ctx,res.tip,this);}catch(_e){}}return res;}`;

src = replaceOnce(
  src,
  `cancel(){this.lineStart=null,this.lineHover=null,this.drag&&(this.drag=null,this.live=null),this.picks=null,this.sel=null,this.redraw(),this.emit()}`,
  `${boardNewMethods}cancel(){this.lineStart=null,this.lineHover=null,this.drag&&(this.drag=null,this.live=null),this.picks=null,this.sel=null,this.redraw(),this.emit()}`,
  "add confirmGeoIterate, autoOrbit, _stepAutoFollow, renderReplayExportFrame on Nte"
);

// Hook Enter key for iterate + user scroll yield detection in Nte constructor
src = replaceOnce(
  src,
  `const c=m=>{m.key==="Shift"&&!m.repeat&&(this.shiftAt=performance.now())};window.addEventListener("keydown",c),this.disposers.push(()=>window.removeEventListener("keydown",c));`,
  `const c=m=>{m.key==="Shift"&&!m.repeat&&(this.shiftAt=performance.now());if(m.key==="Enter"&&this.tool.k==="geo"&&this.tool.t==="iterate"&&this.picks&&this.picks.list.length>=1){const _tg=m.target;if(!(_tg&&(_tg.tagName==="INPUT"||_tg.tagName==="TEXTAREA"||_tg.isContentEditable))){if(this.confirmGeoIterate()){m.preventDefault();m.stopPropagation();}}}};window.addEventListener("keydown",c),this.disposers.push(()=>window.removeEventListener("keydown",c));`,
  "Nte keydown Enter confirms iterate"
);

src = replaceOnce(
  src,
  `r("scroll",()=>{this.growAtEnd(),this.growAtRight(),this.dropSelectionOutOfView(),this.redraw(),this.emit()}),r("wheel",m=>this.wheel(m),{passive:!1});`,
  `r("scroll",()=>{if(!this._autoFollowing)this._userScrollUntil=performance.now()+2500;this.growAtEnd(),this.growAtRight(),this.dropSelectionOutOfView(),this.redraw(),this.emit()}),r("wheel",m=>{this._userScrollUntil=performance.now()+2500;this.wheel(m)},{passive:!1});`,
  "Nte scroller user scroll yield detection for Auto-Follow"
);

// Stop autoOrbit cleanly on manual startTurn, turnView, setTool, and dispose
src = replaceOnce(
  src,
  `startTurn(t,n){var i;const o=this.turning,`,
  `startTurn(t,n){var i;this.autoOrbit&&this.stopAutoOrbit(!0);const o=this.turning,`,
  "startTurn pauses autoOrbit"
);
src = replaceOnce(
  src,
  `turnView(t){const n=this.turning;if(!n||!Yi(this.doc.pages[n.page].geo,n.id))return this.stopTurning();`,
  `turnView(t){this.autoOrbit&&this.stopAutoOrbit(!1);const n=this.turning;if(!n||!Yi(this.doc.pages[n.page].geo,n.id))return this.stopTurning();`,
  "turnView stops autoOrbit"
);
src = replaceOnce(
  src,
  `setTool(t){this.finishPlane(),this.turning&&this.stopTurning(),`,
  `setTool(t){this.autoOrbit&&this.stopAutoOrbit(!0),this.finishPlane(),this.turning&&this.stopTurning(),`,
  "setTool stops autoOrbit"
);
src = replaceOnce(
  src,
  `this.replayRaf&&cancelAnimationFrame(this.replayRaf),clearTimeout(this.wheelTimer)`,
  `this.replayRaf&&cancelAnimationFrame(this.replayRaf),this.autoOrbit&&this.stopAutoOrbit(!1),clearTimeout(this.wheelTimer)`,
  "dispose stops autoOrbit"
);

// Export new helpers on window.__mnGeoKernel
src = replaceOnce(
  src,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,Kt,PY,NY,pI,$Y,fI,LY,_mnShapeStrokes,_mnCurvePolys,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps};`,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,Td,Yi,kee,xk,gd,tee,mee,AR,Je,Kt,PY,NY,pI,$Y,fI,LY,_mnShapeStrokes,_mnCurvePolys,_mnBuildIteration,_mnRemapDef,_mnEvalEase,_mnShapeBBox,_mnStepFocusPt,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps};`,
  "export v80 kernel helpers on __mnGeoKernel"
);

// ============================================================================
// 3. UPGRADE REPLAY 8 EFFECTS, EASING, PAUSE-AFTER, _replayTip, AUTO-FOLLOW,
//    360° AUTO-ORBIT BUTTON IN 3D TURN BAR, AND EXPORT FRAME RENDERER
// ============================================================================

// 3a. Upgrade _drawTip, _drawPolylinesPartial, _teePartial + add _mnEvalEase, _mnShapeBBox, _mnStepFocusPt
const oldPartialStart = `function _drawTip(e,p){`;
const oldPartialEnd = `function _drawInterGuideLine(`;
const pStartIdx = src.indexOf(oldPartialStart);
const pEndIdx = src.indexOf(oldPartialEnd, pStartIdx);
if (pStartIdx === -1 || pEndIdx === -1) {
  throw new Error(`[v80] Could not locate _drawTip.._drawInterGuideLine block (start=${pStartIdx}, end=${pEndIdx})`);
}

const newPartialBlock = `function _mnEvalEase(t,easing){
  const u=Math.max(0,Math.min(1,Number(t)||0));
  switch(easing){
    case"linear":return u;
    case"easeOut":return 1-Math.pow(1-u,3);
    case"spring":return u<=0?0:u>=1?1:Math.min(1.18,1-Math.exp(-6.2*u)*Math.cos(10.5*u));
    default:return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
  }
}
function _mnShapeBBox(sh,coords){
  if(!sh||!coords)return null;
  let x0=1/0,y0=1/0,x1=-1/0,y1=-1/0;
  const add=p=>{if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){if(p.x<x0)x0=p.x;if(p.y<y0)y0=p.y;if(p.x>x1)x1=p.x;if(p.y>y1)y1=p.y;}};
  if(sh.kind==="locus"){
    const ls=_mnLocusStrokes(coords._geo,sh,coords);
    for(const l of (ls||[]))for(const p of (l.pts||[]))add(p);
  }else{
    const pts=(sh.pts||[]).map(id=>coords.get(id)).filter(Boolean);
    if(!pts.length)return null;
    if(sh.kind==="circle"&&pts.length>=2){
      const r=Je(pts[0],pts[1]);
      add({x:pts[0].x-r,y:pts[0].y-r});add({x:pts[0].x+r,y:pts[0].y+r});
    }else if((sh.kind==="line"||sh.kind==="ray")&&pts.length>=2){
      const l=z7(sh,pts[0],pts[1]);
      if(l){add(l[0]);add(l[1]);}else{add(pts[0]);add(pts[1]);}
    }else{
      const st=sh.look3?D7(sh,pts[0]):_mnShapeStrokes(sh,pts,coords._geo);
      if(st&&st.length){
        for(const s of st)for(const p of (s.pts||[]))add(p);
      }else{
        for(const p of pts)add(p);
      }
    }
  }
  if(!Number.isFinite(x0))return null;
  return{x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};
}
function _mnStepFocusPt(geo,coords,st){
  if(!geo||!coords||!st)return null;
  const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId}];
  let sx=0,sy=0,cnt=0;
  for(const it of items){
    if(it.kind==="point"){
      const p=coords.get(it.refId);
      if(p){sx+=p.x;sy+=p.y;cnt++;}
    }else if(it.kind==="shape"){
      const sh=geo.shapes.find(s=>s.id===it.refId);
      const bb=sh?_mnShapeBBox(sh,coords):null;
      if(bb){sx+=bb.cx;sy+=bb.cy;cnt++;}
    }
  }
  return cnt?{x:sx/cnt,y:sy/cnt}:null;
}
function _drawTip(e,p,glow){
  if(!p)return;
  e.save(),e.setLineDash([]);
  if(glow){
    e.shadowColor="#38bdf8";e.shadowBlur=16;
    e.beginPath(),e.arc(p.x,p.y,8.5,0,Math.PI*2),e.fillStyle="rgba(56,189,248,0.28)",e.fill();
    e.beginPath(),e.arc(p.x,p.y,4.6,0,Math.PI*2),e.fillStyle="#38bdf8",e.fill();
    e.shadowBlur=0;
    e.beginPath(),e.arc(p.x,p.y,2.2,0,Math.PI*2),e.fillStyle="#ffffff",e.fill();
  }else{
    e.beginPath(),e.arc(p.x,p.y,5.5,0,Math.PI*2),e.fillStyle=(globalThis.__mnHi?globalThis.__mnHi(.28):"rgba(37,99,235,0.28)"),e.fill();
    e.beginPath(),e.arc(p.x,p.y,2.8,0,Math.PI*2),e.fillStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),e.fill();
  }
  e.restore();
}
function _drawPolylinesPartial(e,paths,p,rev){
  const list=rev?[...paths].reverse().map(x=>({...x,pts:[...x.pts].reverse()})):paths;
  const segs=[];let tot=0;
  for(const l of list){
    const pts=l.closed&&l.pts.length>1?[...l.pts,l.pts[0]]:l.pts;
    for(let i=1;i<pts.length;i++){
      const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y,d=Math.hypot(dx,dy);
      if(d>1e-6){segs.push({a:pts[i-1],b:pts[i],dx,dy,d,dashed:!!l.dashed});tot+=d;}
    }
  }
  if(tot<1e-6)return null;
  let rem=tot*Math.max(0,Math.min(1,p)),tip=null;
  for(const sg of segs){
    if(rem<=0)break;
    const f=Math.min(1,rem/sg.d),end=f>=1?sg.b:_lerpPt(sg.a,sg.b,f);
    e.save(),sg.dashed&&e.setLineDash([9,7]),e.beginPath(),e.moveTo(sg.a.x,sg.a.y),e.lineTo(end.x,end.y),e.stroke(),e.restore();
    tip={x:end.x,y:end.y,dx:sg.dx/sg.d,dy:sg.dy/sg.d};
    rem-=sg.d;
  }
  return tip;
}
function _teePartial(e,t,n,p,rev,fxOpts){
  const fx=(fxOpts&&fxOpts.effect)||"draw";
  const rawP=(fxOpts&&typeof fxOpts.rawP==="number")?fxOpts.rawP:p;
  if(rawP>=.999&&fx!=="pulse"){tee(e,t,n);return null}
  if(rawP<=0||t.kind==="solid"||t.kind==="flatLink")return null;
  const bb=_mnShapeBBox(t,n);
  // Transform/Reveal Effects: spring, fade, zoom, slide, wipe
  if(fx==="fade"){
    e.save();e.globalAlpha*=Math.max(0,Math.min(1,p));tee(e,t,n);e.restore();
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }
  if(fx==="zoom"&&bb){
    const sc=Math.max(.12,.15+.85*Math.max(0,Math.min(1.15,p)));
    e.save();e.globalAlpha*=Math.min(1,.22+.78*rawP);
    e.translate(bb.cx,bb.cy);e.scale(sc,sc);e.translate(-bb.cx,-bb.cy);
    tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy,dx:1,dy:0};
  }
  if(fx==="spring"&&bb){
    const sc=rawP>=.999?1:Math.max(.08,1+.22*Math.sin(rawP*Math.PI*2.5)*Math.exp(-3.1*rawP)-Math.exp(-6.5*rawP));
    e.save();e.globalAlpha*=Math.min(1,rawP*2.6);
    e.translate(bb.cx,bb.cy);e.scale(sc,sc);e.translate(-bb.cx,-bb.cy);
    tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy,dx:1,dy:0};
  }
  if(fx==="slide"&&bb){
    const dir=rev?-1:1,offY=dir*28*(1-Math.max(0,Math.min(1,p)));
    e.save();e.globalAlpha*=Math.min(1,rawP*1.35);
    e.translate(0,offY);tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy+offY,dx:0,dy:-dir};
  }
  if(fx==="wipe"&&bb){
    const pad=Math.max(12,(t.width||2.5)*3),wTot=bb.w+pad*2,hTot=bb.h+pad*2;
    const clP=Math.max(0,Math.min(1,p));
    const rx=rev?(bb.x1+pad-wTot*clP):(bb.x0-pad);
    const edgeX=rev?rx:(rx+wTot*clP);
    e.save();e.beginPath();e.rect(rx,bb.y0-pad,wTot*clP,hTot);e.clip();
    tee(e,t,n);e.restore();
    if(clP>0.02&&clP<0.98){
      e.save();e.strokeStyle="#38bdf8";e.globalAlpha=.55;e.lineWidth=1.8;e.beginPath();e.moveTo(edgeX,bb.y0-pad*.4);e.lineTo(edgeX,bb.y1+pad*.4);e.stroke();e.restore();
    }
    return{x:edgeX,y:bb.cy,dx:rev?-1:1,dy:0};
  }
  // Progressive stroke effects: draw, glow, pulse
  const pDraw=Math.max(0,Math.min(1,fx==="pulse"?Math.min(1,p/.84):p));
  const isGlow=fx==="glow";
  const drawPulseRing=pt=>{
    if(fx!=="pulse"||rawP<.62||!pt)return;
    const u=(rawP-.62)/.38;
    e.save();e.setLineDash([]);
    for(const ph of [u,Math.max(0,u-.28)]){
      if(ph<=0||ph>=1)continue;
      e.beginPath();e.arc(pt.x,pt.y,6+26*ph,0,Math.PI*2);
      e.strokeStyle="rgba(37,99,235,"+((1-ph)*.68).toFixed(3)+")";
      e.lineWidth=2.2*(1-ph*.5);e.stroke();
    }
    e.restore();
  };
  if(pDraw>=.999){
    tee(e,t,n);
    drawPulseRing(bb?{x:bb.cx,y:bb.cy}:null);
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }
  if(t.kind==="locus"){
    const _ls=_mnLocusStrokes(n&&n._geo,t,n);if(!_ls.length)return null;
    e.save(),e.strokeStyle=t.color,e.lineWidth=t.width,e.lineCap="round",e.lineJoin="round";
    if(isGlow){e.shadowColor="#38bdf8";e.shadowBlur=12;}
    if(_ls[0]&&_ls[0].envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}
    const tip=_drawPolylinesPartial(e,_ls.map(l=>({...l,dashed:!!t.dashed})),pDraw,rev);
    _drawTip(e,tip,isGlow),e.restore();drawPulseRing(tip);return tip;
  }
  const o=t.pts.map(l=>n.get(l));if(o.some(l=>!l))return null;
  let s=o,tip=null;
  e.save();
  if(t.rot&&!t.look3){const l=s[0];s=s.map(c=>Qh(c,l,-t.rot)),e.translate(l.x,l.y),e.rotate(t.rot),e.translate(-l.x,-l.y)}
  e.strokeStyle=t.color,e.lineWidth=t.width,e.lineCap="round",e.lineJoin="round",t.dashed&&e.setLineDash([9,7]);
  if(isGlow){e.shadowColor="#38bdf8";e.shadowBlur=13;}
  const i=t.look3?D7(t,s[0]):$S(t.kind,s);
  if(i){
    const strokes=i.filter(c=>!c.shade&&!c.text);
    if(t.kind==="plane"){
      if(pDraw>.65){e.save(),e.beginPath(),s.forEach((u,k)=>k?e.lineTo(u.x,u.y):e.moveTo(u.x,u.y)),e.closePath(),e.fillStyle=t.fill??t.color,e.globalAlpha=(t.fill?1:.1)*((pDraw-.65)/.35),e.fill(),e.restore();}
      e.globalAlpha=.6,e.lineWidth*=.7;
    }
    tip=_drawPolylinesPartial(e,strokes.map(l=>({...l,dashed:!!(l.dashed||t.dashed)})),pDraw,rev);
    if(pDraw>.75){
      const fa=(pDraw-.75)/.25;
      for(const l of i.filter(c=>c.shade))e.save(),e.beginPath(),l.pts.forEach((c,u)=>u?e.lineTo(c.x,c.y):e.moveTo(c.x,c.y)),e.closePath(),e.fillStyle=t.color,e.globalAlpha=l.shade*fa,e.fill(),e.restore();
      if(t.kind==="plane"){const nm=t.name??"P",c=SR(t,s);nm&&(e.save(),e.fillStyle=t.color,e.globalAlpha=fa,e.font="italic 24px 'Times New Roman', serif",e.textAlign="center",e.textBaseline="middle",e.fillText("("+nm+")",c.x,c.y),e.restore())}
    }
    _drawTip(e,tip,isGlow),e.restore();
    if(tip&&t.rot&&!t.look3){const rp=Qh(tip,o[0],t.rot);tip={x:rp.x,y:rp.y,dx:tip.dx,dy:tip.dy};}
    drawPulseRing(tip);return tip;
  }
  switch(t.kind){
    case"segment":{
      const a=rev?s[1]:s[0],b=rev?s[0]:s[1],cur=_lerpPt(a,b,pDraw),L=Math.hypot(b.x-a.x,b.y-a.y)||1;
      e.beginPath(),e.moveTo(a.x,a.y),e.lineTo(cur.x,cur.y),e.stroke(),tip={x:cur.x,y:cur.y,dx:(b.x-a.x)/L,dy:(b.y-a.y)/L};
      if(t.arrow&&pDraw>.82){const c={x:(b.x-a.x)/L,y:(b.y-a.y)/L},u=Math.min(L,12+2.5*t.width)*((pDraw-.82)/.18);e.setLineDash([]),e.beginPath(),e.moveTo(cur.x,cur.y),e.lineTo(cur.x-c.x*u-c.y*u*.42,cur.y-c.y*u+c.x*u*.42),e.lineTo(cur.x-c.x*u+c.y*u*.42,cur.y-c.y*u-c.x*u*.42),e.closePath(),e.fillStyle=t.color,e.fill();}
      break;
    }
    case"line":case"ray":{
      let e0,e1;const l=z7(t,s[0],s[1]);
      if(l){e0=l[0],e1=l[1]}else{const c={x:s[1].x-s[0].x,y:s[1].y-s[0].y},u=Math.hypot(c.x,c.y)||1,v={x:c.x/u*eL,y:c.y/u*eL};e0=t.kind==="line"?{x:s[0].x-v.x,y:s[0].y-v.y}:s[0],e1={x:s[0].x+v.x,y:s[0].y+v.y}}
      const a=rev?e1:e0,b=rev?e0:e1,cur=_lerpPt(a,b,pDraw),L=Math.hypot(b.x-a.x,b.y-a.y)||1;
      e.beginPath(),e.moveTo(a.x,a.y),e.lineTo(cur.x,cur.y),e.stroke(),tip={x:cur.x,y:cur.y,dx:(b.x-a.x)/L,dy:(b.y-a.y)/L};break;
    }
    case"extend":{
      const[l,c,u]=s,v={x:u.x-c.x,y:u.y-c.y},d=v.x*v.x+v.y*v.y,m=d?((l.x-c.x)*v.x+(l.y-c.y)*v.y)/d:0;
      let e0=m<0?c:m>1?u:null,e1=l;
      if(e0){const a=rev?e1:e0,b=rev?e0:e1,cur=_lerpPt(a,b,pDraw),L=Math.hypot(b.x-a.x,b.y-a.y)||1;e.beginPath(),e.moveTo(a.x,a.y),e.lineTo(cur.x,cur.y),e.stroke(),tip={x:cur.x,y:cur.y,dx:(b.x-a.x)/L,dy:(b.y-a.y)/L}}
      break;
    }
    case"circle":{
      const O=s[0],R=s[1],r=Math.hypot(R.x-O.x,R.y-O.y),a0=Math.atan2(R.y-O.y,R.x-O.x),dir=rev?-1:1,a1=a0+dir*Math.PI*2*pDraw;
      e.beginPath(),e.arc(O.x,O.y,r,a0,a1,!!rev),e.stroke();
      tip={x:O.x+r*Math.cos(a1),y:O.y+r*Math.sin(a1),dx:-dir*Math.sin(a1),dy:dir*Math.cos(a1)};break;
    }
    case"polygon":{
      const skip=new Set([...t.gaps??[],...t.hiddenSides??[]]),paths=[];
      for(let k=0;k<s.length;k++){if(!skip.has(k))paths.push({pts:[s[k],s[(k+1)%s.length]],dashed:!!t.dashed})}
      if(t.fill&&pDraw>.65){e.save(),e.beginPath(),s.forEach((u,k)=>k?e.lineTo(u.x,u.y):e.moveTo(u.x,u.y)),e.closePath(),e.fillStyle=t.fill,e.globalAlpha=(pDraw-.65)/.35,e.fill(),e.restore();}
      tip=_drawPolylinesPartial(e,paths,pDraw,rev);break;
    }
    case"angle":{
      if(I7(t,s)){e.globalAlpha=Math.min(1,pDraw*1.3),e.beginPath(),tL(e,t,s),e.stroke();tip=bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;break}
      const l=s[1],c=Math.atan2(s[0].y-l.y,s[0].x-l.x);let sp=Math.atan2(s[2].y-l.y,s[2].x-l.x)-c;
      for(;sp<=-Math.PI;)sp+=2*Math.PI;for(;sp>Math.PI;)sp-=2*Math.PI;
      e.lineWidth=Math.max(1.2,t.width*.6);const d=O7(t),spNow=sp*pDraw;
      e.beginPath(),e.arc(l.x,l.y,d,c,c+spNow,sp<0),e.stroke();
      for(let g=1;g<Math.min(3,t.n??1);g++)e.beginPath(),e.arc(l.x,l.y,d-g*5,c,c+spNow,sp<0),e.stroke();
      tip={x:l.x+d*Math.cos(c+spNow),y:l.y+d*Math.sin(c+spNow),dx:-Math.sin(c+spNow),dy:Math.cos(c+spNow)};
      if(!t.plain&&pDraw>.7){const m=F7(t,s);e.save(),e.globalAlpha=(pDraw-.7)/.3,e.fillStyle=t.color,e.font="17px 'Times New Roman', serif",e.textAlign="center",e.textBaseline="middle",e.fillText(wI(s[0],l,s[2]).toFixed(1).replace(/\.0$/,"")+"°",m.x,m.y),e.restore()}
      break;
    }
    default:{
      e.restore();e.save();e.globalAlpha=Math.min(1,pDraw*1.25);if(isGlow){e.shadowColor="#38bdf8";e.shadowBlur=12;}tee(e,t,n);e.restore();
      const dtTip=bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;drawPulseRing(dtTip);return dtTip;
    }
  }
  _drawTip(e,tip,isGlow),e.restore();
  if(tip&&t.rot&&!t.look3){const rp=Qh(tip,o[0],t.rot);tip={x:rp.x,y:rp.y,dx:tip.dx,dy:tip.dy};}
  drawPulseRing(tip);
  return tip;
}`;

src = src.slice(0, pStartIdx) + newPartialBlock + src.slice(pEndIdx);

// 3b. Upgrade saveBuildScript to persist followCamera & autoOrbitAfter
src = replaceOnce(
  src,
  `speed:(meta&&typeof meta.speed==="number")?meta.speed:1,pauseBetween:!!(meta&&meta.pauseBetween),steps:clean,updatedAt:Date.now()`,
  `speed:(meta&&typeof meta.speed==="number")?meta.speed:1,pauseBetween:!!(meta&&meta.pauseBetween),followCamera:meta&&typeof meta.followCamera==="boolean"?meta.followCamera:!0,autoOrbitAfter:!!(meta&&meta.autoOrbitAfter),steps:clean,updatedAt:Date.now()`,
  "saveBuildScript persist followCamera & autoOrbitAfter"
);

// 3c. Upgrade stopReplay, _ensureReplayLoop, paintReplay -> factor out _paintReplayGeo + 8 effects + _replayTip + MinNoteHandCursor.paintReplayTip + Auto-Follow + Auto-Orbit-After!
const oldReplayLoopStart = `stopReplay(id){`;
const oldReplayLoopEnd = `setPageBreaks(t){`;
const rStartIdx = src.indexOf(oldReplayLoopStart);
const rEndIdx = src.indexOf(oldReplayLoopEnd, rStartIdx);
if (rStartIdx === -1 || rEndIdx === -1) {
  throw new Error(`[v80] Could not locate stopReplay..setPageBreaks block (start=${rStartIdx}, end=${rEndIdx})`);
}

const newReplayBlock = `stopReplay(id){
  if(id){
    const next=(Array.isArray(this.replays)?this.replays:[]).filter(r=>r&&r.id!==id);
    this.setReplays(next,this.activeReplayId===id?(next[0]?next[0].id:null):this.activeReplayId);
    return;
  }
  if(this.replayRaf){cancelAnimationFrame(this.replayRaf);this.replayRaf=0;}
  this.replays=[];this.activeReplayId=null;this.replay=null;this._replayHiddenCache=null;this._replayTip=null;
  this.redraw();this._notifyAuxUI();
}
_ensureReplayLoop(){
  if(this.replayRaf)return;
  const hasPlaying=()=>this._getActiveReplays().some(r=>r.playing);
  if(!hasPlaying())return;
  this.replayLast=performance.now();
  const tick=now=>{
    this.replayRaf=0;
    const playingList=this._getActiveReplays().filter(r=>r.playing);
    if(!playingList.length){if(this._replayTip)this._replayTip={...this._replayTip,active:!1,drawing:!1};return;}
    const dt=Math.min(.06,Math.max(.001,(now-this.replayLast)/1e3));
    this.replayLast=now;
    let uiDirty=!1;
    let autoOrbitTrigger=null;
    for(const r of playingList){
      const activeSteps=r.steps.filter(s=>s.enabled!==!1);
      if(!activeSteps.length){r.playing=!1;r._pauseTimer=0;uiDirty=!0;continue;}
      if(r.stepIdx>=activeSteps.length){r.playing=!1;r.stepProgress=1;r._pauseTimer=0;uiDirty=!0;continue;}
      const cur=activeSteps[r.stepIdx];
      const pg0=this.doc.pages[r.page];
      const isInterGuide=cur.kind==="point"&&cur.showGuides!==!1&&pg0&&pg0.geo.points[cur.refId]&&pg0.geo.points[cur.refId].def.t==="inter";
      const durMul=Math.max(.25,Math.min(4,Number(cur.durationMul)||1));
      const baseDur=isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.52:.95;
      const dur=(baseDur*durMul)/Math.max(.15,r.speed||1);
      if(r.stepProgress<1){
        r.stepProgress=Math.min(1,r.stepProgress+dt/dur);
        r._pauseTimer=0;
      }
      if(r.stepProgress>=1){
        if(r.stepIdx>=activeSteps.length-1){
          r.stepProgress=1;r.playing=!1;r._pauseTimer=0;uiDirty=!0;
          if(r.autoOrbitAfter&&!r.stopAfterStep)autoOrbitTrigger=r;
          continue;
        }
        if(r.pauseBetween||r.stopAfterStep){
          r.stopAfterStep=!1;r.stepProgress=1;r.playing=!1;r._pauseTimer=0;uiDirty=!0;continue;
        }
        const pa=Math.max(0,Number(cur.pauseAfter)||0);
        if(pa>0&&(r._pauseTimer||0)<pa){
          r._pauseTimer=(r._pauseTimer||0)+dt;
          continue;
        }
        r._pauseTimer=0;r.stepIdx++;r.stepProgress=0;uiDirty=!0;
      }
    }
    this._stepAutoFollow(dt);
    if(uiDirty)this._notifyAuxUI();
    this.redraw();
    if(autoOrbitTrigger){
      const found=this.findOrbitSolid(autoOrbitTrigger.page,autoOrbitTrigger.scopeShapes);
      if(found)this.startAutoOrbit(found.page,found.id,.75);
    }
    if(hasPlaying())this.replayRaf=requestAnimationFrame(tick);
  };
  this.replayRaf=requestAnimationFrame(tick);
}
_paintReplayGeo(ctx,geo,actives,extraOpts={}){
  if(!ctx||!geo||!actives||!actives.length)return{tip:null};
  const pageIdx=extraOpts.pageIdx??0;
  const coords=Tt(geo);
  const shMap=new Map(geo.shapes.map(s=>[s.id,s]));
  const opts={names:this.doc.names!==!1,labelSize:this.doc.labelSize,dots:this.doc.dots,labelColor:this.doc.labelColor,dotColor:this.doc.dotColor,dotSize:this.doc.dotSize,...(extraOpts.renderOpts||{})};
  const lblPos=xk(geo,coords,opts);
  const fsz=opts.labelSize??Ll,dotR=Pm(opts);
  const donePts=new Set,animPts=new Map,ptEffectMap=new Map,scopedPts=new Set;
  let anyWholePage=!1,activeTip=null;
  const markPts=(sh,prog,fx)=>{
    for(const pid of sh.pts){
      if(prog>=1)donePts.add(pid);
      else{
        animPts.set(pid,Math.max(animPts.get(pid)??0,prog));
        if(fx&&!ptEffectMap.has(pid))ptEffectMap.set(pid,fx);
      }
    }
  };
  for(const r of actives){
    if(!r.scopePoints)anyWholePage=!0;else for(const pid of r.scopePoints)scopedPts.add(pid);
    const activeSteps=r.steps.filter(s=>s.enabled!==!1);
    for(let i=0;i<activeSteps.length;i++){
      if(i>r.stepIdx)break;
      const st=activeSteps[i];
      const isCurStep=i===r.stepIdx;
      const rawP=i<r.stepIdx?1:Math.max(0,Math.min(1,r.stepProgress));
      const fx=st.effect||"draw";
      const easing=st.easing||"easeInOut";
      const prog=i<r.stepIdx?1:_mnEvalEase(rawP,easing);
      const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId,rev:!!st.rev}];
      for(const it of items){
        if(it.kind==="shape"){
          const sh=shMap.get(it.refId);
          if(!sh||(sh.hidden&&!st.tempHide&&!st.includeHidden))continue;
          if(st.tempHide){
            if(i<r.stepIdx)continue;
            const dp=Math.min(1,rawP/.72),fa=rawP<.72?1:Math.max(0,1-(rawP-.72)/.28);
            if(dp>0&&fa>0){
              ctx.save();ctx.globalAlpha*=fa;
              const tp=_teePartial(ctx,sh,coords,_mnEvalEase(dp,easing),!!(it.rev??st.rev),{effect:fx,rawP:dp,isExport:!!extraOpts.isExport});
              ctx.restore();
              if(isCurStep&&tp&&rawP<.72)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
            }
          }else if(rawP>=.999&&(!isCurStep||fx!=="pulse")){
            tee(ctx,sh,coords);markPts(sh,1,fx);
          }else if(rawP>0){
            const tp=_teePartial(ctx,sh,coords,prog,!!(it.rev??st.rev),{effect:fx,rawP,isExport:!!extraOpts.isExport});
            markPts(sh,Math.min(1,rawP*2.4),fx);
            if(isCurStep&&tp&&rawP<.995)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }else if(it.kind==="point"){
          const pt=geo.points[it.refId];
          if(i<r.stepIdx){donePts.add(it.refId);}
          else if(rawP>0){
            ptEffectMap.set(it.refId,fx);
            if(pt&&pt.def&&pt.def.t==="inter"&&st.showGuides!==!1){
              const tp=_drawInterGuides(ctx,pt,coords,rawP);
              if(tp>0)animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,tp));
            }else{
              animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,rawP));
            }
            const c=coords.get(it.refId);
            if(isCurStep&&c&&rawP<.995)activeTip={pageIdx,x:c.x,y:c.y,dx:1,dy:0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }
      }
    }
  }
  ctx.save();
  ctx.font="italic "+fsz+"px 'Times New Roman', serif",ctx.textAlign="center",ctx.textBaseline="middle";
  for(const pt of Object.values(geo.points)){
    if(!pt.show||pt.hidden)continue;
    if(!anyWholePage&&!scopedPts.has(pt.id))continue;
    const isDone=donePts.has(pt.id),ap=isDone?1:(animPts.get(pt.id)??0);
    if(ap<=0)continue;
    const c=coords.get(pt.id);if(!c)continue;
    const pFx=ptEffectMap.get(pt.id)||"draw";
    ctx.save();
    let ox=0,oy=0,sc=1,alpha=Math.min(1,ap*1.2);
    if(!isDone){
      if(pFx==="spring")sc=Math.max(.15,1+.24*Math.sin(ap*Math.PI*2.5)*Math.exp(-3*ap)-Math.exp(-6*ap));
      else if(pFx==="zoom")sc=.15+.85*ap;
      else if(pFx==="slide"){oy=22*(1-ap);alpha=Math.min(1,ap*1.4);}
      else if(pFx==="fade")alpha=ap;
      else if(pFx==="glow"){ctx.shadowColor="#38bdf8";ctx.shadowBlur=14;}
    }
    ctx.globalAlpha*=alpha;
    if(opts.dots!==!1&&!pt.noDot){
      const baseD=(pt.size??dotR)*(isDone?1:Math.min(1.35,(.38+.62*ap)*sc));
      const m=MR(pt,opts.dotColor);
      ctx.beginPath();
      if(pt.dotStyle==="cross"){
        const g=baseD*1.1;ctx.moveTo(c.x+ox-g,c.y+oy-g),ctx.lineTo(c.x+ox+g,c.y+oy+g),ctx.moveTo(c.x+ox-g,c.y+oy+g),ctx.lineTo(c.x+ox+g,c.y+oy-g),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.5,baseD*.45),ctx.stroke();
      }else if(pt.dotStyle==="ring"){
        ctx.arc(c.x+ox,c.y+oy,baseD,0,Math.PI*2),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.2,baseD*.4),ctx.stroke();
      }else{
        ctx.arc(c.x+ox,c.y+oy,baseD,0,Math.PI*2),ctx.fillStyle=m,ctx.fill();
      }
      if(!isDone&&ap<.96){
        ctx.beginPath(),ctx.arc(c.x+ox,c.y+oy,baseD+12*ap,0,Math.PI*2),ctx.strokeStyle=pFx==="glow"?"rgba(56,189,248,"+((1-ap)*.85)+")":"rgba(37,99,235,"+((1-ap)*.7)+")",ctx.lineWidth=1.8,ctx.stroke();
        if(pFx==="pulse"&&ap>.25){
          ctx.beginPath(),ctx.arc(c.x+ox,c.y+oy,baseD+22*(ap-.25),0,Math.PI*2),ctx.strokeStyle="rgba(37,99,235,"+((1-ap)*.5)+")",ctx.lineWidth=1.4,ctx.stroke();
        }
      }
    }
    const lp=lblPos.get(pt.id);
    if(lp){ctx.fillStyle=pt.color??opts.labelColor??kk;ctx.fillText(pt.label,lp.x+ox,lp.y+oy);}
    ctx.restore();
  }
  ctx.restore();
  return{tip:activeTip};
}
paintReplay(ctx,pageIdx){
  const actives=this._getActiveReplays(pageIdx);
  if(!actives.length)return;
  const pg=this.view.pages[pageIdx];if(!pg)return;
  const res=this._paintReplayGeo(ctx,pg.geo,actives,{pageIdx,isExport:!1});
  const tip=res&&res.tip?res.tip:{pageIdx,x:0,y:0,dx:1,dy:0,active:!1,drawing:!1};
  this._replayTip=tip;
  if(tip.active&&typeof window!=="undefined"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintReplayTip==="function"){
    try{window.MinNoteHandCursor.paintReplayTip(ctx,tip,this);}catch(_e){}
  }
}`;

src = src.slice(0, rStartIdx) + newReplayBlock + src.slice(rEndIdx);

// 3d. Add "↻ Xoay 360°" button inside the 3D Turn Bar JSX
src = replaceOnce(
  src,
  `h.jsx("span",{className:"turn-sep"}),h.jsxs("button",{className:"turn-done",onClick:()=>J.stopTurning(),children:["✓ ",n.done]})`,
  `h.jsx("span",{className:"turn-sep"}),h.jsxs("button",{className:i.autoOrbiting?"on":"",title:"Xoay tròn đều 360°",onClick:()=>J.toggleAutoOrbit(),children:["↻ ",n.turnAutoOrbit||"Xoay 360°"]}),h.jsx("span",{className:"turn-sep"}),h.jsxs("button",{className:"turn-done",onClick:()=>J.stopTurning(),children:["✓ ",n.done]})`,
  "3D Turn Bar add Xoay 360° button"
);

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v80] Successfully applied v0.0.8.0 split/iterate/animation/orbit patch to index-CTbULhps.js");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
