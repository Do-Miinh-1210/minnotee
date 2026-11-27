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
// Idempotent patch script: v0.0.9.24 Smooth Curves (Spline & Cubic Bézier), Spirals (Golden/Archimedean),
// Rigid Dynamic Fibonacci Tiling + Quarter-Circle Spiral, and Arc Direction Flip (cw)
// Applies cleanly to Resources/Whiteboard/assets/index-CTbULhps.js.

const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_V924_CURVES_FIBONACCI__*/";

if (src.includes(MARKER)) {
  console.log("[v924] Curves & Fibonacci patch already applied to index-CTbULhps.js — skipping.");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  let target = search;
  let rep = replacement;
  let idx = str.indexOf(target);
  if (idx === -1 && search.includes("\n") && !search.includes("\r\n")) {
    target = search.replace(/\n/g, "\r\n");
    rep = replacement.replace(/\n/g, "\r\n");
    idx = str.indexOf(target);
  }
  if (idx === -1) throw new Error(`[v924] Could not find anchor for: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v924] Anchor not unique for: ${label}`);
  return str.slice(0, idx) + rep + str.slice(idx + target.length);
}

// 1. Expand PY, upgrade _mnShapeStrokes & LY to preserve curve options (closed, cw, spiralKind, turns)
src = replaceOnce(
  src,
  '/*__MN_V76_SHORTCUTS_CURVES__*/const PY=["circle","arc","arc3","sector","ellipse","hyperbola","parabola","annulus","polygon","cone","cylinder","sphere","frustumCone","truncCylinder","cap","plane","wedge","wedgeRest"],NY=e=>PY.includes(e);function _mnShapeStrokes(e,t,g){const sh=g&&e.shapeId&&Array.isArray(g.shapes)?g.shapes.find(s=>s.id===e.shapeId):null,look3=sh?sh.look3:e.look3,rot=sh?sh.rot:e.rot;',
  `/*__MN_V76_SHORTCUTS_CURVES__*/${MARKER}const PY=["circle","arc","arc3","sector","ellipse","hyperbola","parabola","annulus","spline","bezier","spiral","polygon","cone","cylinder","sphere","frustumCone","truncCylinder","cap","plane","wedge","wedgeRest"],NY=e=>PY.includes(e);function _mnShapeStrokes(e,t,g){const sh=g&&e.shapeId&&Array.isArray(g.shapes)?g.shapes.find(s=>s.id===e.shapeId):null,look3=sh?sh.look3:e.look3,rot=sh?sh.rot:e.rot;`,
  "PY + marker"
);

src = replaceOnce(
  src,
  'return B7({kind:e.kind,rot,look3},t)}',
  'return B7({...e,...(sh||{}),kind:e.kind,rot,look3},t)}',
  "_mnShapeStrokes forward shape options to B7"
);

src = replaceOnce(
  src,
  'const g=t&&t._geo,s={t:"path",kind:e.kind,pts:e.pts,k:0,...e.rot?{rot:e.rot}:{},...e.id?{shapeId:e.id}:{}},i=fI(s,o,n,g);',
  'const g=t&&t._geo,s={t:"path",kind:e.kind,pts:e.pts,k:0,...e.rot?{rot:e.rot}:{},...e.id?{shapeId:e.id}:{},...e.closed?{closed:!0}:{},...e.cw?{cw:!0}:{},...e.spiralKind?{spiralKind:e.spiralKind}:{},...e.turns!==void 0?{turns:e.turns}:{}},i=fI(s,o,n,g);',
  "LY preserve curve options on path def"
);

// 2. Propagate cw for arc in _mnCurveToDesc, _mnComputeLocusIntersections, _mnCurvesAt, and periodic closed spline in _mnResolveDriver
src = replaceOnce(
  src,
  'if(c.kind==="circle")return{kind:"circle",o:c.o,p:c.p,...(c.arcEnd?{arcEnd:c.arcEnd}:(c.shape&&c.shape.kind==="arc"&&c.shape.pts&&c.shape.pts[2]?{arcEnd:c.shape.pts[2]}:{})),shapeId:c.shape&&c.shape.id};',
  'if(c.kind==="circle")return{kind:"circle",o:c.o,p:c.p,...(c.arcEnd?{arcEnd:c.arcEnd}:(c.shape&&c.shape.kind==="arc"&&c.shape.pts&&c.shape.pts[2]?{arcEnd:c.shape.pts[2]}:{})),...(c.cw||(c.shape&&c.shape.cw)?{cw:!0}:{}),shapeId:c.shape&&c.shape.id};',
  "_mnCurveToDesc preserve arc cw"
);

src = replaceOnce(
  src,
  'if(!E||vI(O,P,E,pt,.02))strict.push(pt);',
  'if(!E||vI(O,P,E,pt,.02,!!otherC.cw))strict.push(pt);',
  "_mnComputeLocusIntersections arc cw"
);

src = replaceOnce(
  src,
  'if(a.kind==="arc"){const p=t.get(a.pts[2]);if(!p||!vI(l,c,p,n))continue}',
  'if(a.kind==="arc"){const p=t.get(a.pts[2]);if(!p||!vI(l,c,p,n,0,!!a.cw))continue}',
  "_mnCurvesAt arc cw"
);

src = replaceOnce(
  src,
  'const periodic=d.kind==="circle"||d.kind==="ellipse"||d.kind==="polygon"||d.kind==="plane"||d.kind==="sector";',
  'const periodic=d.kind==="circle"||d.kind==="ellipse"||d.kind==="polygon"||d.kind==="plane"||d.kind==="sector"||(d.kind==="spline"&&!!d.closed);',
  "_mnResolveDriver periodic closed spline"
);

// 3. Add bezier, spiral, fibonacci to dk Shapes list (section: "plane")
src = replaceOnce(
  src,
  '{id:"parabola",section:"plane"},{id:"annulus",section:"plane"}',
  '{id:"parabola",section:"plane"},{id:"annulus",section:"plane"},{id:"bezier",section:"plane"},{id:"spiral",section:"plane"},{id:"fibonacci",section:"plane"}',
  "dk add bezier, spiral, fibonacci"
);

// 4. Add case "bezier", case "spiral", case "fibonacci" to kM shape factory
src = replaceOnce(
  src,
  'case"annulus":{const P=Math.max(x,S),L=m({x:k+P/2,y:w+P/2},"O"),O=m({x:k+P,y:w+P/2},"R"),G=d({t:"on",a:L,b:O,k:.6,seg:!0},"r");v("annulus",[L,O,G]);break}',
  `case"annulus":{const P=Math.max(x,S),L=m({x:k+P/2,y:w+P/2},"O"),O=m({x:k+P,y:w+P/2},"R"),G=d({t:"on",a:L,b:O,k:.6,seg:!0},"r");v("annulus",[L,O,G]);break}` +
  `case"bezier":{const P=m(j(0,.85)),L=m(j(.32,.05)),O=m(j(.68,.95)),G=m(j(1,.15));v("bezier",[P,L,O,G]);break}` +
  `case"spiral":{const P=m(j(.62,.56),"O"),L=m(j(.06,.84),"A");v("spiral",[P,L],{spiralKind:"golden",turns:Math.max(.5,Math.min(8,Number(s.spiralTurns)||2.5)),cw:!1});break}` +
  `case"fibonacci":{const nF=Math.max(3,Math.min(10,Math.round(Number(s.fibSteps)||7))),sp=_mnBuildFibonacciSpec(nF),sc=Math.max(4,Math.min(x/sp.W,S/sp.H)),ox=k+(x-sp.W*sc)*.5,oy=w+(S+sp.H*sc)*.5,pA=m({x:ox,y:oy},"A"),pB=m({x:ox+sp.W*sc,y:oy},"B"),gm=new Map([["0,0",pA],[sp.W+",0",pB]]),ptAt=(gx,gy)=>{const ky=gx+","+gy;if(gm.has(ky))return gm.get(ky);let id;if(gy===0)id=d({t:"on",a:pA,b:pB,k:gx/sp.W},null,!1);else if(gx===0)id=d({t:"vec",o:pA,a:pA,b:pB,k:gy/sp.W,perp:!0},null,!1);else{const bx=ptAt(gx,0);id=d({t:"vec",o:bx,a:pA,b:pB,k:gy/sp.W,perp:!0},null,!1);}return gm.set(ky,id),id};const sqW=Math.max(1,Number((s.width*.55).toFixed(2))),arcW=Math.max(2.2,Number((s.width*1.15).toFixed(2)));for(const sq of sp.squares)v("polygon",sq.corners.map(([cx,cy])=>ptAt(cx,cy)),{width:sqW});for(const sq of sp.squares)v("arc",[ptAt(sq.center[0],sq.center[1]),ptAt(sq.start[0],sq.start[1]),ptAt(sq.end[0],sq.end[1])],{width:arcW});break}`,
  "kM add bezier, spiral, fibonacci"
);

// 5. Add pure math curve samplers (_mnSampleSpline, _mnSampleBezier, _mnSampleSpiral, _mnBuildFibonacciSpec) + upgrade B7 and $S
const curveHelpers = `function _mnSampleSpline(pts,closed){if(!pts||pts.length<2)return[];if(pts.length===2)return[pts[0],pts[1]];const n=pts.length,out=[],lp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),kn=(t,a,b)=>t+Math.pow(Math.max(Math.hypot(b.x-a.x,b.y-a.y),1e-4),.5),segs=closed?n:n-1;for(let i=0;i<segs;i++){const p1=pts[i],p2=pts[(i+1)%n],p0=closed?pts[(i-1+n)%n]:(i>0?pts[i-1]:{x:2*p1.x-p2.x,y:2*p1.y-p2.y}),p3=closed?pts[(i+2)%n]:(i+2<n?pts[i+2]:{x:2*p2.x-p1.x,y:2*p2.y-p1.y}),t0=0,t1=kn(t0,p0,p1),t2=kn(t1,p1,p2),t3=kn(t2,p2,p3),st=Math.max(12,Math.min(36,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/8)));for(let s=i===0?0:1;s<=st;s++){const t=t1+(t2-t1)*(s/st),A1=lp(p0,p1,(t-t0)/Math.max(1e-9,t1-t0)),A2=lp(p1,p2,(t-t1)/Math.max(1e-9,t2-t1)),A3=lp(p2,p3,(t-t2)/Math.max(1e-9,t3-t2)),B1=lp(A1,A2,(t-t0)/Math.max(1e-9,t2-t0)),B2=lp(A2,A3,(t-t1)/Math.max(1e-9,t3-t1));out.push(lp(B1,B2,(t-t1)/Math.max(1e-9,t2-t1)))}}if(closed&&out.length>2&&Je(out[0],out[out.length-1])<1e-5)out.pop();return out}function _mnSampleBezier(pts){if(!pts||pts.length<2)return[];if(pts.length===2)return[pts[0],pts[1]];if(pts.length===3){const[a,b,c]=pts,st=Math.max(20,Math.min(64,Math.ceil((Je(a,b)+Je(b,c))/6))),out=[];for(let k=0;k<=st;k++){const u=k/st,v=1-u;out.push({x:v*v*a.x+2*v*u*b.x+u*u*c.x,y:v*v*a.y+2*v*u*b.y+u*u*c.y})}return out}const out=[];for(let i=0;i+3<pts.length;i+=3){const[a,b,c,d]=pts.slice(i,i+4),st=Math.max(24,Math.min(72,Math.ceil((Je(a,b)+Je(b,c)+Je(c,d))/6)));for(let k=i===0?0:1;k<=st;k++){const u=k/st,v=1-u,v2=v*v,u2=u*u;out.push({x:v2*v*a.x+3*v2*u*b.x+3*v*u2*c.x+u2*u*d.x,y:v2*v*a.y+3*v2*u*b.y+3*v*u2*c.y+u2*u*d.y})}}return out}function _mnSampleSpiral(pts,sh){if(!pts||pts.length<2)return[];const[O,A]=pts,R=Je(O,A);if(R<1e-4)return[];const sk=(sh&&sh.spiralKind)||"golden",turns=Math.max(.25,Math.min(10,Number(sh&&sh.turns)||(sk==="archimedean"?3:2.5))),cw=!!(sh&&sh.cw),base=Math.atan2(A.y-O.y,A.x-O.x),thMax=2*Math.PI*turns,steps=Math.max(72,Math.min(720,Math.round(turns*96))),bG=(2*Math.log((1+Math.sqrt(5))/2))/Math.PI,out=[];for(let k=0;k<=steps;k++){const u=k/steps,th=u*thMax,r=sk==="archimedean"?R*u:R*Math.exp(bG*(th-thMax)),ang=cw?base-(thMax-th):base+(thMax-th);out.push({x:O.x+r*Math.cos(ang),y:O.y+r*Math.sin(ang)})}return out}function _mnBuildFibonacciSpec(steps){const n=Math.max(3,Math.min(10,Math.round(Number(steps)||7))),F=[1,1];while(F.length<n)F.push(F[F.length-1]+F[F.length-2]);let minX=0,minY=0,maxX=1,maxY=1;const raw=[{x0:0,y0:0,x1:1,y1:1,dir:0,size:1}];for(let k=1;k<n;k++){const s=F[k],dir=k%4;let x0,y0,x1,y1;if(dir===0){x0=minX-s;y0=minY;x1=minX;y1=minY+s;minX-=s}else if(dir===1){x0=minX;y0=minY-s;x1=minX+s;y1=minY;minY-=s}else if(dir===2){x0=maxX;y0=minY;x1=maxX+s;y1=minY+s;maxX+=s}else{x0=minX;y0=maxY;x1=minX+s;y1=maxY+s;maxY+=s}raw.push({x0,y0,x1,y1,dir,size:s})}const rotSteps=(4-((n-1)%4))%4,rotPt=(x,y)=>{let rx=x,ry=y;for(let i=0;i<rotSteps;i++){const nx=-ry,ny=rx;rx=nx;ry=ny}return[rx,ry]};const withArc=raw.map((q,idx)=>{const{x0,y0,x1,y1,dir,size}=q;let center,start,end;if(dir===0){center=[x1,y0];start=[x1,y1];end=[x0,y0]}else if(dir===1){center=[x1,y1];start=[x0,y1];end=[x1,y0]}else if(dir===2){center=[x0,y1];start=[x0,y0];end=[x1,y1]}else{center=[x0,y0];start=[x1,y0];end=[x0,y1]}const cs=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([px,py])=>rotPt(px,py));return{idx,size,corners:cs,center:rotPt(center[0],center[1]),start:rotPt(start[0],start[1]),end:rotPt(end[0],end[1])}});let gx0=1/0,gy0=1/0,gx1=-1/0,gy1=-1/0;for(const sq of withArc)for(const[px,py]of sq.corners){if(px<gx0)gx0=px;if(py<gy0)gy0=py;if(px>gx1)gx1=px;if(py>gy1)gy1=py}const shift=([px,py])=>[px-gx0,py-gy0];return{W:gx1-gx0,H:gy1-gy0,squares:withArc.map(sq=>({idx:sq.idx,size:sq.size,corners:sq.corners.map(shift),center:shift(sq.center),start:shift(sq.start),end:shift(sq.end)}))}}`;

src = replaceOnce(
  src,
  'function B7(e,t){if(e.look3&&t.length)return D7(e,t[0]);if(!e.rot||!t.length)return $S(e.kind,t);const n=$S(e.kind,t.map(o=>Qh(o,t[0],-e.rot)));return n&&n.map(o=>({...o,pts:o.pts.map(s=>Qh(s,t[0],e.rot))}))}function D7(e,t){return(e.look3??[]).map(n=>({...n,pts:n.pts.map(o=>({x:o.x+t.x,y:o.y+t.y}))}))}function $S(e,t){',
  `${curveHelpers}function B7(e,t){if(e.look3&&t.length)return D7(e,t[0]);if(!e.rot||!t.length)return $S(e.kind,t,e);const n=$S(e.kind,t.map(o=>Qh(o,t[0],-e.rot)),e);return n&&n.map(o=>({...o,pts:o.pts.map(s=>Qh(s,t[0],e.rot))}))}function D7(e,t){return(e.look3??[]).map(n=>({...n,pts:n.pts.map(o=>({x:o.x+t.x,y:o.y+t.y}))}))}function $S(e,t,sh){`,
  "curveHelpers + B7/$S forward sh"
);

src = replaceOnce(
  src,
  'case"arc":case"sector":{const[n,o,s]=t,i=Je(n,o),r=Math.atan2(o.y-n.y,o.x-n.x);let a=(r-Math.atan2(s.y-n.y,s.x-n.x))%(2*Math.PI);a<0&&(a+=2*Math.PI),a<1e-6&&(a=2*Math.PI);const l=Ml(n,i,i,r,r-a,0,Math.max(8,Math.ceil(72*a/(2*Math.PI))));return e==="arc"?[{pts:l}]:[{pts:[n,...l],closed:!0}]}default:return null}}',
  'case"arc":case"sector":{const[n,o,s]=t,i=Je(n,o),r=Math.atan2(o.y-n.y,o.x-n.x),cw=!!(sh&&sh.cw);let a=(cw?(Math.atan2(s.y-n.y,s.x-n.x)-r):(r-Math.atan2(s.y-n.y,s.x-n.x)))%(2*Math.PI);a<0&&(a+=2*Math.PI),a<1e-6&&(a=2*Math.PI);const l=Ml(n,i,i,r,cw?r+a:r-a,0,Math.max(8,Math.ceil(72*a/(2*Math.PI))));return e==="arc"?[{pts:l}]:[{pts:[n,...l],closed:!0}]}case"spline":{const cl=!!(sh&&sh.closed),pts=_mnSampleSpline(t,cl);return pts.length>=2?[{pts,closed:cl}]:null}case"bezier":{const pts=_mnSampleBezier(t);return pts.length>=2?[{pts}]:null}case"spiral":{const pts=_mnSampleSpiral(t,sh);return pts.length>=2?[{pts}]:null}default:return null}}',
  "$S add spline, bezier, spiral + arc cw"
);

// 6. Upgrade vI, _mnRemapShape, and _mnCurvedFaceAt for cw arcs & flipped spirals
src = replaceOnce(
  src,
  'function vI(e,t,n,o,s=0){const i=Math.atan2(t.y-e.y,t.x-e.x),r=c=>{const u=(i-Math.atan2(c.y-e.y,c.x-e.x))%(2*Math.PI);return u<0?u+2*Math.PI:u};let a=r(n);a<1e-6&&(a=2*Math.PI);const l=r(o);return l<=a+s||l>=2*Math.PI-s}',
  'function vI(e,t,n,o,s=0,cw=!1){const i=Math.atan2(t.y-e.y,t.x-e.x),r=c=>{const u=(cw?(Math.atan2(c.y-e.y,c.x-e.x)-i):(i-Math.atan2(c.y-e.y,c.x-e.x)))%(2*Math.PI);return u<0?u+2*Math.PI:u};let a=r(n);a<1e-6&&(a=2*Math.PI);const l=r(o);return l<=a+s||l>=2*Math.PI-s}',
  "vI support cw"
);

src = replaceOnce(
  src,
  'function _mnRemapShape(sh,mapFn,newId,newGroup,flipOrient){\n  const out={...sh,id:newId,pts:(sh.pts||[]).map(mapFn),group:newGroup};',
  'function _mnRemapShape(sh,mapFn,newId,newGroup,flipOrient){\n  const out={...sh,id:newId,pts:(sh.pts||[]).map(mapFn),group:newGroup};\n  if(flipOrient&&(sh.kind==="arc"||sh.kind==="sector"||sh.kind==="spiral"))out.cw=!sh.cw;',
  "_mnRemapShape flipOrient for arc/sector/spiral"
);

src = replaceOnce(
  src,
  'const rad=Je(C,A),a0=Math.atan2(A.y-C.y,A.x-C.x),a1=Math.atan2(B.y-C.y,B.x-C.x);\n        const span=_mnAngSpan(a0,a1,!0);\n        circs.push({cId:sh.pts[0],rId:sh.pts[1],C,rad,full:!1,a0,a1,span,startId:sh.pts[1],endId:sh.pts[2],pts:[]});',
  'const rad=Je(C,A),rawA0=Math.atan2(A.y-C.y,A.x-C.x),rawA1=Math.atan2(B.y-C.y,B.x-C.x),a0=sh.cw?rawA1:rawA0,a1=sh.cw?rawA0:rawA1;\n        const span=_mnAngSpan(a0,a1,!0);\n        circs.push({cId:sh.pts[0],rId:sh.pts[1],C,rad,full:!1,a0,a1,span,startId:sh.cw?sh.pts[2]:sh.pts[1],endId:sh.cw?sh.pts[1]:sh.pts[2],pts:[]});',
  "_mnCurvedFaceAt support cw arc"
);

// 7. Pass `t` into `$S(t.kind, s, t)` in tee & _teePartial + support closed spline fill!
src = replaceOnce(
  src,
  'const i=t.look3?D7(t,s[0]):$S(t.kind,s);if(i){if(t.kind==="annulus"){',
  'const i=t.look3?D7(t,s[0]):$S(t.kind,s,t);if(i){if(t.kind==="spline"&&t.closed&&t.fill&&i[0]&&i[0].pts&&i[0].pts.length>=3){e.beginPath();i[0].pts.forEach((c,u)=>u?e.lineTo(c.x,c.y):e.moveTo(c.x,c.y));e.closePath();e.fillStyle=t.fill;e.fill()}if(t.kind==="annulus"){',
  "tee pass t to $S + closed spline fill"
);

src = replaceOnce(
  src,
  'const i=t.look3?D7(t,s[0]):$S(t.kind,s);\n  if(i){\n    const strokes=i.filter(c=>!c.shade&&!c.text);',
  'const i=t.look3?D7(t,s[0]):$S(t.kind,s,t);\n  if(i){\n    const strokes=i.filter(c=>!c.shade&&!c.text);\n    if(t.kind==="spline"&&t.closed&&t.fill&&pDraw>.72&&i[0]&&i[0].pts&&i[0].pts.length>=3){e.save();e.beginPath();i[0].pts.forEach((u,k)=>k?e.lineTo(u.x,u.y):e.moveTo(u.x,u.y));e.closePath();e.fillStyle=t.fill;e.globalAlpha*=(pDraw-.72)/.28;e.fill();e.restore();}',
  "_teePartial pass t to $S + closed spline fill"
);

// 8. Export curve helpers on window.__mnGeoKernel
src = replaceOnce(
  src,
  'Kt,PY,NY,pI,$Y,fI,LY,_mnShapeStrokes,_mnCurvePolys,',
  'Kt,PY,NY,pI,$Y,fI,LY,B7,$S,_mnSampleSpline,_mnSampleBezier,_mnSampleSpiral,_mnBuildFibonacciSpec,_mnShapeStrokes,_mnCurvePolys,',
  "export curve helpers on __mnGeoKernel"
);

// 9. Labels & Hints (Vietnamese + English)
src = replaceOnce(
  src,
  'parabola:"Parabol",annulus:"Hình vành khăn",regular:"Đa giác đều"',
  'parabola:"Parabol",annulus:"Hình vành khăn",bezier:"Đường cong Bézier",spiral:"Xoắn ốc (Vàng / Archimede)",fibonacci:"Xoắn ốc Fibonacci",regular:"Đa giác đều"',
  "VN shapes labels"
);

src = replaceOnce(
  src,
  'arc3:"Cung tròn qua 3 điểm",arc:"Cung tròn (tâm & 2 điểm)",midpoint:"Trung điểm"',
  'arc3:"Cung tròn qua 3 điểm",arc:"Cung tròn (tâm & 2 điểm)",spline:"Đường cong trơn (nhiều điểm)",bezier:"Đường cong Bézier (4 điểm)",midpoint:"Trung điểm"',
  "VN geoTools labels"
);

src = replaceOnce(
  src,
  'arc:"Bấm tâm đường tròn, sau đó bấm điểm đầu và điểm cuối (ngược chiều kim đồng hồ) để tạo cung tròn",polygon:"Bấm các đỉnh, bấm lại đỉnh đầu để khép kín"',
  'arc:"Bấm tâm đường tròn, sau đó bấm điểm đầu và điểm cuối (ngược chiều kim đồng hồ; có thể Đảo cung khi chọn)",spline:"Bấm lần lượt các điểm để vẽ đường cong trơn; bấm lại điểm cuối / nhấn Enter / nháy đúp để kết thúc, hoặc bấm lại điểm đầu để khép kín",bezier:"Bấm 4 điểm: điểm đầu, 2 điểm điều khiển tiếp tuyến và điểm cuối (hoặc Enter sau 3 điểm để vẽ Bézier bậc 2)",polygon:"Bấm các đỉnh, bấm lại đỉnh đầu để khép kín"',
  "VN geoHints"
);

src = replaceOnce(
  src,
  'regularSides:e=>`${e} đỉnh`,sidesRange:(e,t)=>`Số đỉnh: từ ${e} đến ${t}`',
  'regularSides:e=>`${e} đỉnh`,sidesRange:(e,t)=>`Số đỉnh: từ ${e} đến ${t}`,fibSteps:e=>`${e} bậc`,fibRange:(e,t)=>`Số hình vuông Fibonacci: từ ${e} đến ${t}`,spiralTurns:e=>`${e} vòng`,spiralRange:(e,t)=>`Số vòng xoắn: từ ${e} đến ${t}`',
  "VN fibSteps/spiralTurns tooltips"
);

src = replaceOnce(
  src,
  'parabola:"Parabola",annulus:"Annulus",regular:"Regular polygon"',
  'parabola:"Parabola",annulus:"Annulus",bezier:"Bézier curve",spiral:"Spiral (Golden / Archimedean)",fibonacci:"Fibonacci spiral",regular:"Regular polygon"',
  "EN shapes labels"
);

src = replaceOnce(
  src,
  'arc3:"Arc through 3 points",arc:"Circular arc (centre & 2 points)",midpoint:"Midpoint"',
  'arc3:"Arc through 3 points",arc:"Circular arc (centre & 2 points)",spline:"Smooth curve (multi-point spline)",bezier:"Bézier curve (4 points)",midpoint:"Midpoint"',
  "EN geoTools labels"
);

src = replaceOnce(
  src,
  'arc:"Click the centre, then the start point and end point (anticlockwise) to draw a circular arc",polygon:"Click the corners; click the first one again to close it"',
  'arc:"Click the centre, then the start point and end point (anticlockwise; flip direction anytime when selected)",spline:"Click points along the curve; click the last point again, double-click, or press Enter to finish open, or click the first point to close",bezier:"Click 4 points: start, two tangent control points, and end (or press Enter after 3 points for quadratic Bézier)",polygon:"Click the corners; click the first one again to close it"',
  "EN geoHints"
);

src = replaceOnce(
  src,
  'regularSides:e=>`${e} corners`,sidesRange:(e,t)=>`Corners: ${e} to ${t}`',
  'regularSides:e=>`${e} corners`,sidesRange:(e,t)=>`Corners: ${e} to ${t}`,fibSteps:e=>`${e} squares`,fibRange:(e,t)=>`Fibonacci steps: ${e} to ${t}`,spiralTurns:e=>`${e} turns`,spiralRange:(e,t)=>`Spiral turns: ${e} to ${t}`',
  "EN fibSteps/spiralTurns tooltips"
);

// 10. Add spline & bezier to l2 Geo Tools Draw section
src = replaceOnce(
  src,
  '["draw",["move","point","segment","line","ray","opposite","polygon","circle","circleRadius","arc3","arc"]]',
  '["draw",["move","point","segment","line","ray","opposite","polygon","circle","circleRadius","arc3","arc","spline","bezier"]]',
  "l2 draw add spline & bezier"
);

// 11. Add crisp vector icons to _h (Shapes) and Geo tool icons
src = replaceOnce(
  src,
  'annulus:()=>h.jsxs(Mt,{children:[h.jsx("circle",{cx:12,cy:12,r:9}),h.jsx("circle",{cx:12,cy:12,r:4.5})]}),pyramid4:',
  'annulus:()=>h.jsxs(Mt,{children:[h.jsx("circle",{cx:12,cy:12,r:9}),h.jsx("circle",{cx:12,cy:12,r:4.5})]}),' +
  'bezier:()=>h.jsxs(Mt,{children:[h.jsx(ot,{hid:!0,d:"M4 18 7 5M20 6l-3 13"}),h.jsx(ot,{d:"M4 18C7 5 17 19 20 6"}),h.jsx(Qt,{x:4,y:18}),h.jsx(Qt,{x:20,y:6}),h.jsx(Qt,{x:7,y:5,r:1.5}),h.jsx(Qt,{x:17,y:19,r:1.5})]}),' +
  'spiral:()=>h.jsx(Mt,{children:h.jsx(ot,{d:"M12.6 12.6a1.4 1.4 0 0 0-1.6-1.2 2.4 2.4 0 0 0-1.6 2.8 4 4 0 0 0 4.6 2.4 6 6 0 0 0 3.7-6.9A8.4 8.4 0 0 0 8.2 4.5 10.5 10.5 0 0 0 3 16.5"})}),' +
  'fibonacci:()=>h.jsxs(Mt,{children:[h.jsx("rect",{x:2.5,y:5,width:19,height:14}),h.jsx(ot,{d:"M14.5 5v14M14.5 12.5h7M17.5 12.5v6.5M14.5 15.5h3"}),h.jsx(ot,{hot:!0,d:"M2.5 19A12 12 0 0 1 14.5 5A7.5 7.5 0 0 1 21.5 12.5A4.5 4.5 0 0 1 17.5 19A3 3 0 0 1 14.5 15.5"})]}),pyramid4:',
  "_h add bezier, spiral, fibonacci icons"
);

src = replaceOnce(
  src,
  'arc:()=>h.jsxs(Mt,{children:[h.jsx(ot,{hot:!0,d:"M15.5 18.5A9.43 9.43 0 0 0 12.5 5.5"}),h.jsx(Qt,{x:7.5,y:13.5}),h.jsx(Qt,{x:15.5,y:18.5}),h.jsx(Qt,{x:12.5,y:5.5})]}),midpoint:',
  'arc:()=>h.jsxs(Mt,{children:[h.jsx(ot,{hot:!0,d:"M15.5 18.5A9.43 9.43 0 0 0 12.5 5.5"}),h.jsx(Qt,{x:7.5,y:13.5}),h.jsx(Qt,{x:15.5,y:18.5}),h.jsx(Qt,{x:12.5,y:5.5})]}),' +
  'spline:()=>h.jsxs(Mt,{children:[h.jsx(ot,{hot:!0,d:"M3 17C6 6 10 6 12 12s6 6 9-5"}),h.jsx(Qt,{x:3,y:17}),h.jsx(Qt,{x:8,y:8}),h.jsx(Qt,{x:15,y:15.5}),h.jsx(Qt,{x:21,y:7})]}),' +
  'bezier:()=>h.jsxs(Mt,{children:[h.jsx(ot,{hid:!0,d:"M4 18 7 5M20 6l-3 13"}),h.jsx(ot,{hot:!0,d:"M4 18C7 5 17 19 20 6"}),h.jsx(Qt,{x:4,y:18}),h.jsx(Qt,{x:7,y:5,r:1.6}),h.jsx(Qt,{x:17,y:19,r:1.6}),h.jsx(Qt,{x:20,y:6})]}),midpoint:',
  "geo tool icons add spline & bezier"
);

// 12. Editor fields, prefs persistence, kM calls, Enter keydown, geoPick, finishGeo, hoverAt, paintArcPick, curve helpers, Shapes UI, SelectionBar UI
src = replaceOnce(
  src,
  'We(this,"regularSides",5);',
  'We(this,"regularSides",5);We(this,"fibSteps",7);We(this,"spiralTurns",2.5);',
  "editor fields fibSteps & spiralTurns"
);

src = replaceOnce(
  src,
  'const c=o.regularSides;typeof c=="number"&&Number.isInteger(c)&&c>=vc.min&&c<=vc.max&&(s.regularSides=c);',
  'const c=o.regularSides;typeof c=="number"&&Number.isInteger(c)&&c>=vc.min&&c<=vc.max&&(s.regularSides=c);if(typeof o.fibSteps=="number"&&Number.isInteger(o.fibSteps)&&o.fibSteps>=3&&o.fibSteps<=10)s.fibSteps=o.fibSteps;if(typeof o.spiralTurns=="number"&&Number.isFinite(o.spiralTurns)&&o.spiralTurns>=.5&&o.spiralTurns<=8)s.spiralTurns=o.spiralTurns;',
  "prefs load fibSteps & spiralTurns"
);

src = replaceOnce(
  src,
  'kM(o.t,o.from,o.to,w,{...this.shapeStyle,dashed:this.dashed},()=>nt(),o.ends,this.regularSides)',
  'kM(o.t,o.from,o.to,w,{...this.shapeStyle,dashed:this.dashed,fibSteps:this.fibSteps,spiralTurns:this.spiralTurns},()=>nt(),o.ends,this.regularSides)',
  "kM drag preview pass fibSteps & spiralTurns"
);

src = replaceOnce(
  src,
  'const g=kM(o.t,a,l,d,{...this.shapeStyle,dashed:this.dashed},()=>nt(),c,this.regularSides);',
  'const g=kM(o.t,a,l,d,{...this.shapeStyle,dashed:this.dashed,fibSteps:this.fibSteps,spiralTurns:this.spiralTurns},()=>nt(),c,this.regularSides);',
  "kM commit pass fibSteps & spiralTurns"
);

// Keyboard Enter confirms open spline (>=2 pts) or quadratic bezier (>=3 pts)
src = replaceOnce(
  src,
  'if(this.tool.k==="geo"&&this.tool.t==="iterate"&&this.picks&&this.picks.list.length>=1&&this.confirmGeoIterate()){m.preventDefault();m.stopPropagation();}',
  'if(this.tool.k==="geo"&&this.tool.t==="iterate"&&this.picks&&this.picks.list.length>=1&&this.confirmGeoIterate()){m.preventDefault();m.stopPropagation();}else if(this.tool.k==="geo"&&this.tool.t==="spline"&&this.picks&&this.picks.list.filter(q=>q.kind==="point").length>=2){this.finishGeo(this.picks.page,"spline",this.picks.list.slice(),{closed:!1});m.preventDefault();m.stopPropagation();}else if(this.tool.k==="geo"&&this.tool.t==="bezier"&&this.picks&&this.picks.list.filter(q=>q.kind==="point").length>=3){this.finishGeo(this.picks.page,"bezier",this.picks.list.slice());m.preventDefault();m.stopPropagation();}',
  "Enter confirms spline & bezier"
);

// geoPick: handle spline (click first -> closed, click last -> open) & bezier (auto finish at 4 points)
src = replaceOnce(
  src,
  'if(o==="polygon"&&n.kind==="point"&&s.length>=3&&s[0].kind==="point"&&s[0].id===n.id){this.finishGeo(t,"polygon",s);return}',
  'if(o==="polygon"&&n.kind==="point"&&s.length>=3&&s[0].kind==="point"&&s[0].id===n.id){this.finishGeo(t,"polygon",s);return}' +
  'if(o==="spline"&&n.kind==="point"){if(s.length>=3&&s[0].kind==="point"&&s[0].id===n.id){this.finishGeo(t,"spline",s.slice(),{closed:!0});return}if(s.length>=2&&s[s.length-1].kind==="point"&&s[s.length-1].id===n.id){this.finishGeo(t,"spline",s.slice(),{closed:!1});return}}',
  "geoPick spline finish"
);

src = replaceOnce(
  src,
  '["angle","angleMark","rightMark","bisector","equalAngle","arc3","arc"].includes(o)&&r===3',
  '["angle","angleMark","rightMark","bisector","equalAngle","arc3","arc"].includes(o)&&r===3||(o==="bezier"&&r===4)',
  "geoPick bezier auto-finish at 4 pts"
);

// finishGeo: accept optional extra arg and handle spline & bezier
src = replaceOnce(
  src,
  'finishGeo(t,n,o){var d,m,g;this.picks=null;',
  'finishGeo(t,n,o,ex){var d,m,g;this.picks=null;',
  "finishGeo add ex parameter"
);

src = replaceOnce(
  src,
  'case"polygon":p.push(l("polygon",r));break;',
  'case"polygon":p.push(l("polygon",r));break;case"spline":if(r.length>=2)p.push(l("spline",r,ex&&ex.closed?{closed:!0}:{}));break;case"bezier":if(r.length>=3)p.push(l("bezier",r));break;',
  "finishGeo cases spline & bezier"
);

// hoverAt: redraw live while picking spline or bezier too
src = replaceOnce(
  src,
  'if((this.tool.k==="geo"&&this.tool.t==="arc"&&this.picks&&this.picks.page===n&&this.picks.list.length>=1)||(this.tool.k==="fill"&&this.fillMode==="diff"))this.redraw();',
  'if((this.tool.k==="geo"&&(this.tool.t==="arc"||this.tool.t==="spline"||this.tool.t==="bezier")&&this.picks&&this.picks.page===n&&this.picks.list.length>=1)||(this.tool.k==="fill"&&this.fillMode==="diff"))this.redraw();',
  "hoverAt live redraw for spline & bezier"
);

// paintArcPick: also draw live spline preview, live bezier preview, and subtle tangent handle arms for selected/hovered bezier curves!
const oldPaintArcStart = 'paintArcPick(t,n){if(this.tool.k!=="geo"||this.tool.t!=="arc"||!this.picks||this.picks.page!==n||!this.pointerSeen)return;';
const newPaintArcStart = `paintArcPick(t,n){` +
  `const _pgB=this.view.pages[n];if(_pgB&&_pgB.geo&&Array.isArray(_pgB.geo.shapes)){const _selS=this.sel&&this.sel.page===n?this.sel.shapes:null,_selP=this.sel&&this.sel.page===n?this.sel.points:null,_hovS=this.hover&&this.hover.page===n?this.hover.shape:null,_hovP=this.hover&&this.hover.page===n?this.hover.point:null;const _bShs=_pgB.geo.shapes.filter(sh=>sh&&!sh.hidden&&sh.kind==="bezier"&&Array.isArray(sh.pts)&&sh.pts.length>=3&&((_selS&&_selS.has(sh.id))||_hovS===sh.id||sh.pts.some(pid=>(_selP&&_selP.has(pid))||_hovP===pid)));if(_bShs.length){const _cb=Tt(_pgB.geo);t.save();t.strokeStyle="#2563eb";t.globalAlpha=.48;t.lineWidth=1.3/this.zoom;t.setLineDash([5/this.zoom,4/this.zoom]);for(const sh of _bShs){const ps=sh.pts.map(id=>_cb.get(id));if(ps.some(q=>!q))continue;t.beginPath();if(ps.length===3){t.moveTo(ps[0].x,ps[0].y);t.lineTo(ps[1].x,ps[1].y);t.lineTo(ps[2].x,ps[2].y)}else{for(let k=0;k+3<ps.length;k+=3){t.moveTo(ps[k].x,ps[k].y);t.lineTo(ps[k+1].x,ps[k+1].y);t.moveTo(ps[k+3].x,ps[k+3].y);t.lineTo(ps[k+2].x,ps[k+2].y)}}t.stroke();for(let k=1;k<ps.length-1;k++){if(ps.length>4&&k%3===0)continue;t.beginPath();t.setLineDash([]);t.arc(ps[k].x,ps[k].y,Math.max(4/this.zoom,this.dotR()+1.2/this.zoom),0,Math.PI*2);t.stroke();t.setLineDash([5/this.zoom,4/this.zoom])}}t.restore()}}` +
  `if(this.tool.k==="geo"&&(this.tool.t==="spline"||this.tool.t==="bezier")&&this.picks&&this.picks.page===n&&this.pointerSeen){const pts=this.picks.list.filter(q=>q.kind==="point");if(pts.length&&_pgB){const s=Tt(_pgB.geo),dp=this.toDoc(this.pointerSeen.sx,this.pointerSeen.sy);if(this.pageAt(dp.y)===n){const rawCur=this.toPage(dp,n),hovId=this.hover&&this.hover.page===n&&this.hover.point?this.hover.point:null,hovPt=hovId?s.get(hovId):null,cur=hovPt||rawCur,picked=pts.map(q=>s.get(q.id)).filter(Boolean);if(picked.length){const closing=this.tool.t==="spline"&&pts.length>=3&&hovId===pts[0].id,finishing=this.tool.t==="spline"&&pts.length>=2&&hovId===pts[pts.length-1].id;const previewPts=(closing||finishing)?picked:[...picked,cur];const curvePts=this.tool.t==="spline"?_mnSampleSpline(previewPts,closing):_mnSampleBezier(previewPts);t.save();if(this.tool.t==="bezier"&&previewPts.length>=2){t.strokeStyle="#64748b";t.globalAlpha=.5;t.lineWidth=1.3/this.zoom;t.setLineDash([5/this.zoom,4/this.zoom]);t.beginPath();t.moveTo(previewPts[0].x,previewPts[0].y);t.lineTo(previewPts[1].x,previewPts[1].y);if(previewPts.length>=4){t.moveTo(previewPts[2].x,previewPts[2].y);t.lineTo(previewPts[3].x,previewPts[3].y)}else if(previewPts.length===3){t.moveTo(previewPts[1].x,previewPts[1].y);t.lineTo(previewPts[2].x,previewPts[2].y)}t.stroke()}if(curvePts.length>=2){t.setLineDash([]);t.strokeStyle="#2563eb";t.globalAlpha=.85;t.lineWidth=Math.max(2,this.shapeStyle.width);t.lineCap="round";t.lineJoin="round";t.beginPath();curvePts.forEach((p,idx)=>idx?t.lineTo(p.x,p.y):t.moveTo(p.x,p.y));closing&&t.closePath();t.stroke()}if(closing){t.setLineDash([]);t.beginPath();t.arc(picked[0].x,picked[0].y,Math.max(8/this.zoom,this.dotR()+4/this.zoom),0,Math.PI*2);t.strokeStyle="#10b981";t.lineWidth=2.2/this.zoom;t.stroke()}else if(finishing){const lp=picked[picked.length-1];t.setLineDash([]);t.beginPath();t.arc(lp.x,lp.y,Math.max(8/this.zoom,this.dotR()+4/this.zoom),0,Math.PI*2);t.strokeStyle="#2563eb";t.lineWidth=2.2/this.zoom;t.stroke()}t.restore()}}}return}` +
  `if(this.tool.k!=="geo"||this.tool.t!=="arc"||!this.picks||this.picks.page!==n||!this.pointerSeen)return;`;

src = replaceOnce(src, oldPaintArcStart, newPaintArcStart, "paintArcPick extend for spline, bezier & tangent handles");

// Editor helper methods for contextual curve editing in SelectionBar
src = replaceOnce(
  src,
  'selectionSolid(){return!!this.selectedSolid()}',
  'selectionSolid(){return!!this.selectedSolid()}' +
  'selectionCurve(){const t=this.sel;if(!t||!t.shapes||t.shapes.size!==1)return null;const p=this.doc.pages[t.page];if(!p||!p.geo)return null;const sid=[...t.shapes][0],sh=p.geo.shapes.find(q=>q.id===sid);return sh&&(sh.kind==="arc"||sh.kind==="sector"||sh.kind==="spline"||sh.kind==="spiral")?sh:null}' +
  'mutateSelectedCurve(fn){const t=this.sel;if(!t||!t.shapes||t.shapes.size!==1)return;const sid=[...t.shapes][0];this.commit(this.updatePage(t.page,pg=>({...pg,geo:{...pg.geo,shapes:pg.geo.shapes.map(sh=>sh.id===sid?fn(sh):sh)}})));this.redraw();this.emit()}' +
  'toggleSelectionArcCw(){this.mutateSelectedCurve(sh=>({...sh,cw:!sh.cw}))}' +
  'toggleSelectionSplineClosed(){this.mutateSelectedCurve(sh=>({...sh,closed:!sh.closed}))}' +
  'cycleSelectionSpiralKind(){this.mutateSelectedCurve(sh=>({...sh,spiralKind:(sh.spiralKind||"golden")==="golden"?"archimedean":"golden"}))}' +
  'stepSelectionSpiralTurns(delta){this.mutateSelectedCurve(sh=>{const cur=Number(sh.turns)||((sh.spiralKind||"golden")==="archimedean"?3:2.5),nxt=Math.max(.5,Math.min(8,Math.round((cur+delta)*2)/2));return{...sh,turns:nxt}})}',
  "editor curve selection helper methods"
);

// React state for fibSteps & spiralTurns + sync on editor mount
src = replaceOnce(
  src,
  '[F,K]=D.useState(u.regularSides??5),[H,R]=D.useState(String(u.regularSides??5)),',
  '[F,K]=D.useState(u.regularSides??5),[H,R]=D.useState(String(u.regularSides??5)),[_mnFib,_mnSetFib]=D.useState(u.fibSteps??7),[_mnFibTxt,_mnSetFibTxt]=D.useState(String(u.fibSteps??7)),[_mnSpT,_mnSetSpT]=D.useState(u.spiralTurns??2.5),[_mnSpTxt,_mnSetSpTxt]=D.useState(String(u.spiralTurns??2.5)),',
  "React state fibSteps & spiralTurns"
);

src = replaceOnce(
  src,
  'A.regularSides=F,',
  'A.regularSides=F,A.fibSteps=_mnFib,A.spiralTurns=_mnSpT,',
  "sync fibSteps & spiralTurns to editor instance"
);

// Shapes popover inline number boxes for fibonacci (3..10) & spiral (0.5..8 turns)
src = replaceOnce(
  src,
  'if(de.id!=="regular")return Ke;const lt=Ie=>{R(Ie);const ze=Number(Ie);!/^\\d+$/.test(Ie)||ze<vc.min||ze>vc.max||(K(ze),s.current&&(s.current.regularSides=ze),ht({regularSides:ze}),mn({k:"shape",t:"regular"}))};return h.jsxs("div",{className:"shape-sides",onClick:Ie=>Ie.stopPropagation(),children:[Ke,h.jsx("input",{className:"sides",type:"number",inputMode:"numeric",min:vc.min,max:vc.max,value:H,"aria-label":n.regularSides(F),title:n.sidesRange(vc.min,vc.max),onChange:Ie=>lt(Ie.target.value.trim()),onFocus:Ie=>Ie.target.select(),onBlur:()=>R(String(F)),onKeyDown:Ie=>Ie.key==="Enter"&&Ie.target.blur()})]},de.id)',
  'if(de.id==="fibonacci"){const lt=Ie=>{_mnSetFibTxt(Ie);const ze=Number(Ie);!/^\\d+$/.test(Ie)||ze<3||ze>10||(_mnSetFib(ze),s.current&&(s.current.fibSteps=ze),ht({fibSteps:ze}),mn({k:"shape",t:"fibonacci"}))};return h.jsxs("div",{className:"shape-sides",onClick:Ie=>Ie.stopPropagation(),children:[Ke,h.jsx("input",{className:"sides",type:"number",inputMode:"numeric",min:3,max:10,value:_mnFibTxt,"aria-label":n.fibSteps(_mnFib),title:n.fibRange(3,10),onChange:Ie=>lt(Ie.target.value.trim()),onFocus:Ie=>Ie.target.select(),onBlur:()=>_mnSetFibTxt(String(_mnFib)),onKeyDown:Ie=>Ie.key==="Enter"&&Ie.target.blur()})]},de.id)}' +
  'if(de.id==="spiral"){const lt=Ie=>{_mnSetSpTxt(Ie);const ze=Number(Ie.replace(",","."));!Number.isFinite(ze)||ze<.5||ze>8||(_mnSetSpT(ze),s.current&&(s.current.spiralTurns=ze),ht({spiralTurns:ze}),mn({k:"shape",t:"spiral"}))};return h.jsxs("div",{className:"shape-sides",onClick:Ie=>Ie.stopPropagation(),children:[Ke,h.jsx("input",{className:"sides",style:{width:"38px",padding:"0 3px"},type:"number",inputMode:"decimal",min:.5,max:8,step:.5,value:_mnSpTxt,"aria-label":n.spiralTurns(_mnSpT),title:n.spiralRange(.5,8),onChange:Ie=>lt(Ie.target.value.trim()),onFocus:Ie=>Ie.target.select(),onBlur:()=>_mnSetSpTxt(String(_mnSpT)),onKeyDown:Ie=>Ie.key==="Enter"&&Ie.target.blur()})]},de.id)}' +
  'if(de.id!=="regular")return Ke;const lt=Ie=>{R(Ie);const ze=Number(Ie);!/^\\d+$/.test(Ie)||ze<vc.min||ze>vc.max||(K(ze),s.current&&(s.current.regularSides=ze),ht({regularSides:ze}),mn({k:"shape",t:"regular"}))};return h.jsxs("div",{className:"shape-sides",onClick:Ie=>Ie.stopPropagation(),children:[Ke,h.jsx("input",{className:"sides",type:"number",inputMode:"numeric",min:vc.min,max:vc.max,value:H,"aria-label":n.regularSides(F),title:n.sidesRange(vc.min,vc.max),onChange:Ie=>lt(Ie.target.value.trim()),onFocus:Ie=>Ie.target.select(),onBlur:()=>R(String(F)),onKeyDown:Ie=>Ie.key==="Enter"&&Ie.target.blur()})]},de.id)',
  "Shapes popover inline inputs for fibonacci & spiral"
);

// SelectionBar contextual curve controls (Đảo cung, Khép kín/Mở, Vàng/Archimede, -/+ vòng)
src = replaceOnce(
  src,
  '(J==null?void 0:J.selectionSolid())&&h.jsxs("button",{onClick:()=>J.startTurning(),children:[h.jsx(oe.turn3d,{})," ",n.turn3d]})',
  '((J==null?void 0:J.selectionCurve())&&(()=>{const _cv=J.selectionCurve();if(_cv.kind==="arc"||_cv.kind==="sector")return h.jsx("button",{title:"Đảo chiều quét cung tròn (ngược / thuận chiều kim đồng hồ)",onClick:()=>J.toggleSelectionArcCw(),children:"⇄ Đảo cung"});if(_cv.kind==="spline")return h.jsx("button",{title:"Chuyển giữa đường cong trơn khép kín và đường cong hở",onClick:()=>J.toggleSelectionSplineClosed(),children:_cv.closed?"◠ Mở cong":"○ Khép kín"});if(_cv.kind==="spiral")return h.jsxs(D.Fragment,{children:[h.jsx("button",{title:"Đổi kiểu xoắn ốc: Vàng (Logarit vỏ ốc) ↔ Archimede",onClick:()=>J.cycleSelectionSpiralKind(),children:(_cv.spiralKind||"golden")==="golden"?"Xoắn vàng":"Archimede"}),h.jsx("button",{title:"Đảo chiều xoắn ốc",onClick:()=>J.toggleSelectionArcCw(),children:"⇄ Chiều"}),h.jsx("button",{title:"Giảm 0,5 vòng xoắn",onClick:()=>J.stepSelectionSpiralTurns(-.5),children:"− vòng"}),h.jsx("button",{title:"Tăng 0,5 vòng xoắn",onClick:()=>J.stepSelectionSpiralTurns(.5),children:"+ vòng"})]});return null})()),(J==null?void 0:J.selectionSolid())&&h.jsxs("button",{onClick:()=>J.startTurning(),children:[h.jsx(oe.turn3d,{})," ",n.turn3d]})',
  "SelectionBar contextual curve controls"
);

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v924] Successfully patched index-CTbULhps.js with Spline, Bézier, Spiral, Fibonacci & Arc CW!");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
