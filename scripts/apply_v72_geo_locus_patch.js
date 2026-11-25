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
// Idempotent patch script: v0.0.7.2 Dynamic Locus (Quỹ tích) Kernel & Native Tool Hooks
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_GEO_LOCUS_V72__*/";
if (src.includes(MARKER)) {
  console.log("[v72] Locus patch already applied to index-CTbULhps.js — skipping.");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) throw new Error(`[v72] Could not find anchor for: ${label}`);
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) throw new Error(`[v72] Anchor not unique for: ${label}`);
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

// 1. Attach _geo reference to Tt(e) result map + define fast WeakMap-cached _mnLocusStrokes engine
const ttOld = `function Tt(e){const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o,e);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);return t}`;

const ttNew = `${MARKER}
const _mnLocusCache=new WeakMap();
function _mnIsDriverDef(d){
  if(!d)return!1;
  if(d.t==="path"||d.t==="on")return!(d.kParamId||d.kExpr);
  if(d.t==="vec")return!(d.kParamId||d.kExpr||d.distParamId||d.distExpr||d.distVal!=null);
  if(d.t==="len")return!d.lockedAng&&!d.angParamId&&!d.angExpr;
  if(d.t==="polar")return(!!d.fixedDist&&!d.fixedAng)||(!!d.fixedAng&&!d.fixedDist);
  return!1;
}
function _mnLocusStrokes(geo,sh,baseCoords){
  if(!geo||!sh||!sh.locus||!geo.points)return[];
  const coords=baseCoords||Tt(geo);
  let gMap=_mnLocusCache.get(geo);
  if(!gMap){gMap=new Map();_mnLocusCache.set(geo,gMap);}
  const L=sh.locus;
  const cacheKey=sh.id+"|"+(sh.pts?sh.pts.join(","):"")+"|"+(L.mode||"point")+"|"+(L.driverType||"point")+"|"+(L.paramId||"")+"|"+(L.samples||"")+"|"+(L.min??"")+"|"+(L.max??"");
  if(gMap.has(cacheKey))return gMap.get(cacheKey);

  const mode=L.mode==="shape"?"shape":"point";
  const driverType=L.driverType==="param"?"param":"point";
  const ptsArr=Array.isArray(sh.pts)?sh.pts:[];
  let tracedPts,driverId=null,tMin=0,tMax=1,periodic=!1,applyDriver=null,sampleGeo=geo,sampleParams=null,pIdx=-1;
  const affected=new Set();

  if(driverType==="point"){
    if(ptsArr.length<2){gMap.set(cacheKey,[]);return[];}
    driverId=ptsArr[ptsArr.length-1];
    tracedPts=mode==="point"?[ptsArr[0]]:ptsArr.slice(0,-1);
    const dPt=geo.points[driverId];
    if(!dPt||!dPt.def){gMap.set(cacheKey,[]);return[];}
    const d=dPt.def;
    if(d.t==="path"){
      tMin=Number.isFinite(L.min)?L.min:0;
      tMax=Number.isFinite(L.max)?L.max:1;
      periodic=(d.kind==="circle"||d.kind==="ellipse"||d.kind==="polygon")&&L.min==null&&L.max==null;
      applyDriver=v=>({...d,k:v,kParamId:void 0,kExpr:void 0});
    }else if(d.t==="on"){
      if(d.seg){
        tMin=Number.isFinite(L.min)?L.min:0;
        tMax=Number.isFinite(L.max)?L.max:1;
      }else{
        const pA=coords.get(d.a),pB=coords.get(d.b);
        const span=pA&&pB?Math.min(14,Math.max(2.5,900/Math.max(25,Je(pA,pB)))):3.5;
        tMin=Number.isFinite(L.min)?L.min:-span;
        tMax=Number.isFinite(L.max)?L.max:1+span;
      }
      applyDriver=v=>({...d,k:v,kParamId:void 0,kExpr:void 0});
    }else if(d.t==="vec"){
      const pA=coords.get(d.a),pB=coords.get(d.b);
      const span=pA&&pB?Math.min(14,Math.max(2.5,900/Math.max(25,Je(pA,pB)))):3.5;
      tMin=Number.isFinite(L.min)?L.min:-span;
      tMax=Number.isFinite(L.max)?L.max:1+span;
      applyDriver=v=>({...d,k:v,kParamId:void 0,kExpr:void 0,distParamId:void 0,distExpr:void 0,distVal:void 0});
    }else if(d.t==="len"){
      tMin=Number.isFinite(L.min)?L.min:0;
      tMax=Number.isFinite(L.max)?L.max:Math.PI*2;
      periodic=L.min==null&&L.max==null;
      applyDriver=v=>({...d,ang:v,lockedAng:!1,angParamId:void 0,angExpr:void 0});
    }else if(d.t==="polar"){
      if(d.fixedDist&&!d.fixedAng){
        tMin=Number.isFinite(L.min)?L.min:0;
        tMax=Number.isFinite(L.max)?L.max:360;
        periodic=L.min==null&&L.max==null;
        applyDriver=v=>({...d,curAngDeg:v});
      }else if(d.fixedAng&&!d.fixedDist){
        tMin=Number.isFinite(L.min)?L.min:10;
        tMax=Number.isFinite(L.max)?L.max:600;
        applyDriver=v=>({...d,curDistPx:v});
      }else{gMap.set(cacheKey,[]);return[];}
    }else{gMap.set(cacheKey,[]);return[];}
    affected.add(driverId);
  }else{
    if(!ptsArr.length){gMap.set(cacheKey,[]);return[];}
    tracedPts=mode==="point"?[ptsArr[0]]:ptsArr.slice();
    const pList=Array.isArray(geo.params)?geo.params:[];
    pIdx=pList.findIndex(x=>x&&x.id===L.paramId);
    if(pIdx<0){gMap.set(cacheKey,[]);return[];}
    const pm=pList[pIdx];
    tMin=Number.isFinite(L.min)?L.min:(Number.isFinite(pm.min)?pm.min:0);
    tMax=Number.isFinite(L.max)?L.max:(Number.isFinite(pm.max)?pm.max:10);
    periodic=pm.unit==="angle"&&Math.abs(Math.abs(tMax-tMin)-360)<1e-2;
    sampleParams=pList.map(x=>({...x}));
    sampleGeo={...geo,params:sampleParams};
    const pIds=new Set([pm.id]),pNames=new Set([pm.name]);
    let pCh=!0;
    while(pCh){
      pCh=!1;
      for(const x of pList){
        if(!x||pIds.has(x.id)||!x.expr)continue;
        for(const nm of pNames){
          if(String(x.expr).includes(nm)){pIds.add(x.id);pNames.add(x.name);pCh=!0;break;}
        }
      }
    }
    for(const [id,pt] of Object.entries(geo.points)){
      const d=pt&&pt.def;if(!d)continue;
      if(pIds.has(d.paramId)||pIds.has(d.distParamId)||pIds.has(d.angParamId)||pIds.has(d.kParamId)||pIds.has(d.xParamId)||pIds.has(d.yParamId)||pIds.has(d.zParamId)){affected.add(id);continue;}
      const exs=[d.expr,d.distExpr,d.angExpr,d.kExpr,d.vx,d.vy,d.vz].filter(Boolean);
      if(exs.length){
        for(const nm of pNames){if(exs.some(s=>String(s).includes(nm))){affected.add(id);break;}}
      }
    }
  }

  let ch=!0;
  while(ch){
    ch=!1;
    for(const [id,pt] of Object.entries(geo.points)){
      if(affected.has(id)||!pt||!pt.def)continue;
      if(Om(pt.def).some(dep=>affected.has(dep))){affected.add(id);ch=!0;}
    }
  }

  const needed=new Set(),evalOrder=[],vis=new Set();
  const collect=id=>{
    if(!id||needed.has(id)||!affected.has(id))return;
    const pt=geo.points[id];if(!pt||!pt.def)return;
    needed.add(id);
    for(const dep of Om(pt.def))collect(dep);
  };
  for(const tid of tracedPts)collect(tid);
  if(!needed.size){gMap.set(cacheKey,[]);return[];}
  const topo=id=>{
    if(vis.has(id)||!needed.has(id))return;
    vis.add(id);
    const pt=geo.points[id];
    if(pt&&pt.def)for(const dep of Om(pt.def))topo(dep);
    evalOrder.push(id);
  };
  for(const id of needed)topo(id);

  const BOUND=14000;
  const evalAt=t=>{
    if(driverType==="param")sampleParams[pIdx].value=t;
    const loc=new Map();
    const get=id=>loc.has(id)?loc.get(id):coords.get(id);
    for(const id of evalOrder){
      const def=(driverType==="point"&&id===driverId)?applyDriver(t):geo.points[id].def;
      const r=EY(def,get,sampleGeo);
      const ok=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)&&Math.abs(r.x)<BOUND&&Math.abs(r.y)<BOUND;
      loc.set(id,ok?r:null);
    }
    if(mode==="point")return get(tracedPts[0])||null;
    const arr=tracedPts.map(get);
    return arr.some(p=>!p)?null:arr;
  };

  let out=[];
  if(mode==="shape"){
    const N=Math.max(6,Math.min(120,Number(L.samples)||28));
    const sk=L.shapeKind||"segment";
    const steps=periodic?N:N+1;
    for(let i=0;i<steps;i++){
      const t=tMin+(tMax-tMin)*(i/N);
      const pts=evalAt(t);if(!pts)continue;
      if(sk==="segment"&&pts.length>=2){
        out.push({pts:[pts[0],pts[1]],envelope:!0});
      }else if((sk==="line"||sk==="ray")&&pts.length>=2){
        const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,len=Math.hypot(dx,dy);
        if(len<1e-6)continue;
        const ux=dx/len,uy=dy/len,ext=420;
        const a=sk==="line"?{x:pts[0].x-ux*ext,y:pts[0].y-uy*ext}:pts[0];
        const b={x:pts[1].x+ux*ext,y:pts[1].y+uy*ext};
        out.push({pts:[a,b],envelope:!0});
      }else if(sk==="circle"&&pts.length>=2){
        const rad=Je(pts[0],pts[1]);
        if(rad>0.5&&rad<BOUND)out.push({pts:Ml(pts[0],rad,rad,0,Math.PI*2,0,48),closed:!0,envelope:!0});
      }else if(sk==="polygon"&&pts.length>=3){
        out.push({pts,closed:!0,envelope:!0});
      }
    }
  }else{
    const N=Math.max(24,Math.min(720,Number(L.samples)||240));
    const raw=[];
    const count=periodic?N:N+1;
    for(let i=0;i<count;i++){
      const t=tMin+(tMax-tMin)*(i/N);
      raw.push({t,p:evalAt(t)});
    }
    const dists=[];
    for(let i=1;i<raw.length;i++){
      if(raw[i-1].p&&raw[i].p){
        const d=Je(raw[i-1].p,raw[i].p);
        if(d>1e-4)dists.push(d);
      }
    }
    dists.sort((a,b)=>a-b);
    const med=dists.length?dists[Math.floor(dists.length*0.5)]:12;
    const smoothLim=Math.max(20,med*4.5);
    const jumpLim=Math.max(220,med*20);

    let cur=[];
    const flush=()=>{if(cur.length>=2)out.push({pts:cur});cur=[];};
    const appendSeg=(t0,p0,t1,p1,depth)=>{
      const d=Je(p0,p1);
      if(d<=smoothLim){cur.push(p1);return;}
      const tm=(t0+t1)*0.5,pm=evalAt(tm);
      if(!pm){flush();cur=[p1];return;}
      const d0=Je(p0,pm),d1=Je(pm,p1);
      if((d0>d*1.12||d1>d*1.12)&&Math.max(d0,d1)>Math.max(60,med*9)){flush();cur=[p1];return;}
      if(depth<3&&(d>smoothLim*1.4||Math.abs(d0+d1-d)>2.2)){
        appendSeg(t0,p0,tm,pm,depth+1);
        appendSeg(tm,pm,t1,p1,depth+1);
        return;
      }
      if(d>jumpLim){flush();cur=[p1];return;}
      cur.push(p1);
    };

    let prev=null;
    for(const item of raw){
      if(!item.p){flush();prev=null;continue;}
      if(!prev){cur=[item.p];prev=item;}
      else{appendSeg(prev.t,prev.p,item.t,item.p,0);prev=item;}
    }
    flush();

    if(periodic&&out.length&&raw[0].p&&raw[raw.length-1].p){
      const firstPoly=out[0].pts,lastPoly=out[out.length-1].pts;
      const pEnd=lastPoly[lastPoly.length-1],pStart=firstPoly[0];
      const dClose=Je(pEnd,pStart);
      if(dClose<=jumpLim){
        const pm=evalAt(tMin+(tMax-tMin)*((N-0.5)/N));
        const okClose=pm&&(Je(pEnd,pm)<=dClose*1.15&&Je(pm,pStart)<=dClose*1.15||dClose<=smoothLim);
        if(okClose){
          if(out.length===1)out[0].closed=!0;
          else{out[0].pts=[...lastPoly,...firstPoly];out.pop();}
        }
      }
    }
    if(!out.length){
      const valid=raw.find(r=>r.p);
      if(valid)out.push({pts:[valid.p,{x:valid.p.x+0.5,y:valid.p.y+0.5}]});
    }
  }
  gMap.set(cacheKey,out);
  return out;
}
function Tt(e){const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o,e);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);t._geo=e;return t}`;

src = replaceOnce(src, ttOld, ttNew, "Tt + _mnLocusStrokes engine");

// 2. Expose _mnLocusStrokes and _mnIsDriverDef on window.__mnGeoKernel
src = replaceOnce(
  src,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv};`,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef};`,
  "expose _mnLocusStrokes on __mnGeoKernel"
);

// 3. Render kind === "locus" in tee(e, t, n)
src = replaceOnce(
  src,
  `function tee(e,t,n){var r,a;if(t.kind==="solid"||t.kind==="flatLink")return;`,
  `function tee(e,t,n){var r,a;if(t.kind==="solid"||t.kind==="flatLink")return;if(t.kind==="locus"){const _ls=_mnLocusStrokes(n&&n._geo,t,n);if(!_ls.length)return;e.save(),e.strokeStyle=t.color,e.lineWidth=t.width,e.lineCap="round",e.lineJoin="round",t.dashed&&e.setLineDash([9,7]);for(const l of _ls){if(!l.pts||l.pts.length<2)continue;if(l.envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}e.beginPath(),l.pts.forEach((c,u)=>u?e.lineTo(c.x,c.y):e.moveTo(c.x,c.y)),l.closed&&e.closePath(),e.stroke()}e.restore();return}`,
  "tee locus renderer"
);

// 4. Partial replay rendering for kind === "locus" in _teePartial
src = replaceOnce(
  src,
  `function _teePartial(e,t,n,p,rev){if(p>=.999){tee(e,t,n);return null}if(p<=0||t.kind==="solid"||t.kind==="flatLink")return null;`,
  `function _teePartial(e,t,n,p,rev){if(p>=.999){tee(e,t,n);return null}if(p<=0||t.kind==="solid"||t.kind==="flatLink")return null;if(t.kind==="locus"){const _ls=_mnLocusStrokes(n&&n._geo,t,n);if(!_ls.length)return null;e.save(),e.strokeStyle=t.color,e.lineWidth=t.width,e.lineCap="round",e.lineJoin="round";if(_ls[0]&&_ls[0].envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}const tip=_drawPolylinesPartial(e,_ls.map(l=>({...l,dashed:!!t.dashed})),p,rev);_drawTip(e,tip),e.restore();return tip}`,
  "_teePartial locus renderer"
);

// 5. Ensure gd() guarantees n._geo is always attached
src = replaceOnce(
  src,
  `function gd(e,t,n=Tt(t),o={}){var a;for(const l of t.shapes)l.hidden||tee(e,l,n);`,
  `function gd(e,t,n=Tt(t),o={}){var a;if(n&&!n._geo)n._geo=t;for(const l of t.shapes)l.hidden||tee(e,l,n);`,
  "gd ensure n._geo"
);

// 6. Hit testing for kind === "locus" in d5()
src = replaceOnce(
  src,
  `function d5(e,t,n,o=!1){if(e.hidden&&!o||e.kind==="solid"||e.kind==="flatLink")return 1/0;`,
  `function d5(e,t,n,o=!1){if(e.hidden&&!o||e.kind==="solid"||e.kind==="flatLink")return 1/0;if(e.kind==="locus")return IN(_mnLocusStrokes(t&&t._geo,e,t),n);`,
  "d5 locus hit test"
);

// 7. Selection bounding box for kind === "locus"
src = replaceOnce(
  src,
  `for(const i of t.geo.shapes){if(!this.sel.shapes.has(i.id))continue;const r=B7(i,`,
  `for(const i of t.geo.shapes){if(!this.sel.shapes.has(i.id))continue;if(i.kind==="locus"){for(const c of _mnLocusStrokes(t.geo,i,s))for(const u of c.pts)o(u.x,u.y,u.x,u.y);continue}const r=B7(i,`,
  "selectionBounds locus"
);

// 8. Add native "locus" tool to Dựng hình menu (l2, x9, geoTools VI/EN, geoHints VI/EN, wantsCurve, geoClick)
src = replaceOnce(
  src,
  `["construct",["midpoint","divide","perp","parallel","altitude","bisector","intersect","tangent","commonTangent"]]`,
  `["construct",["midpoint","divide","perp","parallel","altitude","bisector","intersect","tangent","commonTangent","locus"]]`,
  "l2 add locus to construct section"
);

src = replaceOnce(
  src,
  `commonTangent:"Tiếp tuyến chung hai đường tròn"`,
  `commonTangent:"Tiếp tuyến chung hai đường tròn",locus:"Quỹ tích"`,
  "geoTools VI locus"
);

src = replaceOnce(
  src,
  `commonTangent:"Common tangents of two circles"`,
  `commonTangent:"Common tangents of two circles",locus:"Locus"`,
  "geoTools EN locus"
);

src = replaceOnce(
  src,
  `commonTangent:"Bấm hai đường tròn: vẽ mọi tiếp tuyến chung (2 ngoài, và 2 trong khi hai đường tròn rời nhau)"`,
  `commonTangent:"Bấm hai đường tròn: vẽ mọi tiếp tuyến chung (2 ngoài, và 2 trong khi hai đường tròn rời nhau)",locus:"Bấm điểm (hoặc đường) cần vẽ quỹ tích rồi bấm điểm chuyển động (hoặc chọn sẵn tham số KaTeX rồi bấm 1 điểm)"`,
  "geoHints VI locus"
);

src = replaceOnce(
  src,
  `commonTangent:"Click two circles: all their common tangents (2 outer, and 2 inner when the circles are apart)"`,
  `commonTangent:"Click two circles: all their common tangents (2 outer, and 2 inner when the circles are apart)",locus:"Click the traced point (or curve) then the moving driver point (or select a KaTeX parameter and click 1 point)"`,
  "geoHints EN locus"
);

src = replaceOnce(
  src,
  `equalAngle:()=>h.jsxs(Mt,{children:[h.jsx(ot,{d:"M3 11h8M3 11l6-7M13 21h8M13 21l6-7"}),h.jsx(ot,{hot:!0,d:"M7 11a4 4 0 0 0-1.4-3M17 21a4 4 0 0 0-1.4-3M5.4 10.6l1.6-1M15.4 20.6l1.6-1"})]})}`,
  `equalAngle:()=>h.jsxs(Mt,{children:[h.jsx(ot,{d:"M3 11h8M3 11l6-7M13 21h8M13 21l6-7"}),h.jsx(ot,{hot:!0,d:"M7 11a4 4 0 0 0-1.4-3M17 21a4 4 0 0 0-1.4-3M5.4 10.6l1.6-1M15.4 20.6l1.6-1"})]}),locus:()=>h.jsxs(Mt,{children:[h.jsx(ot,{hot:!0,d:"M3 17C6 7 11 5 15 11s5 6 6 2",strokeDasharray:"2.4 2"}),h.jsx(Qt,{x:7.5,y:8.2,hot:!0,r:2.3}),h.jsx(Qt,{x:16.5,y:14.2,r:2})]})}`,
  "x9 locus icon"
);

src = replaceOnce(
  src,
  `wantsCurve(t,n,o){var i,r,a;const s=!this.picks||this.picks.page!==t||!this.picks.list.length;`,
  `wantsCurve(t,n,o){var i,r,a;const s=!this.picks||this.picks.page!==t||!this.picks.list.length;if(n==="locus")return s&&o.shape&&["segment","line","ray","circle","polygon"].includes(o.shape.kind);`,
  "wantsCurve locus support"
);

src = replaceOnce(
  src,
  `if(o==="intersect"||o==="reflectLine"&&((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length)return;`,
  `if(o==="locus"||o==="intersect"||o==="reflectLine"&&((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length)return;`,
  "geoClick prevent stray free point for locus"
);

// 9. Add "Quỹ tích" button in .sel-bar right next to "Tham số"
const paramBtnTail = `children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("line",{x1:"4",y1:"7",x2:"20",y2:"7"}),h.jsx("circle",{cx:"9",cy:"7",r:"2.2",fill:"currentColor",fillOpacity:".25"}),h.jsx("line",{x1:"4",y1:"17",x2:"20",y2:"17"}),h.jsx("circle",{cx:"15",cy:"17",r:"2.2",fill:"currentColor",fillOpacity:".25"})]})," ","Tham số"]})`;

const locusSelBtn = `${paramBtnTail},(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Tạo Quỹ tích động / Vết điểm (GSP5)",onClick:()=>window.MinNoteGeoParams&&window.MinNoteGeoParams.onLocusSelectionClick(),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 17C6 7 11 5 15 11s5 6 6 2",strokeDasharray:"2.6 2.2"}),h.jsx("circle",{cx:"8",cy:"8.2",r:"2.2",fill:"currentColor"})]})," ","Quỹ tích"]})`;

src = replaceOnce(src, paramBtnTail, locusSelBtn, "sel-bar Quỹ tích button");

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v72] Successfully patched index-CTbULhps.js with Dynamic Locus (Quỹ tích) support!");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
