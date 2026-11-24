// Idempotent patch script: v0.0.7.6 Keyboard Shortcut Shift+D + Universal 2D/3D Curve Point/Snap/Intersection Kernel
// 1. Adds native "geo:point": ["Shift+D"] shortcut (displays <kbd>Shift+D</kbd> in MinNote Hình học, zero collision with D dashed)
// 2. Expands PY & upgrades pI / _mnShapeStrokes / $Y / fI / LY / VY / d5 to support ALL 2D & 3D shapes (solid + dashed outlines, rot & look3)
// 3. Upgrades _mnCurvesAt, _mnCurveToDesc, _mnCurveDeps, _mnSameCurve, _mnCurvePolys, _mnComputeLocusIntersections, pointOn, geoClick, wantsCurve, finishGeo, c5
//    so placing points, snapping, perpendiculars/parallels on plane edges, and live dynamic intersections work for ALL shapes in Hình mẫu!

const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_V76_SHORTCUTS_CURVES__*/";
const MARKER_EC = "/*__MN_V76_EC_STOPPROP__*/";
let changed = false;

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) throw new Error(`[v76] Could not find anchor for: ${label}`);
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) throw new Error(`[v76] Anchor not unique for: ${label}`);
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

if (!src.includes(MARKER)) {
// 1. Add native "geo:point":["Shift+D"] shortcut in YR shortcut map
src = replaceOnce(
  src,
  'geoMove:["U"],"geo:midpoint":["Ctrl+M"]',
  'geoMove:["U"],"geo:point":["Shift+D"],"geo:midpoint":["Ctrl+M"]',
  "YR add geo:point Shift+D"
);

// 2. Expand PY and upgrade pI, _mnShapeStrokes, $Y, fI, LY to support ALL 2D & 3D shapes (solid + dashed, rot & look3)
const oldPYBlock = `const PY=["circle","ellipse","hyperbola","parabola","polygon"],NY=e=>PY.includes(e);function pI(e,t){if(e.kind==="polygon")return t.length>1?[[...t,t[0]]]:null;const n=B7({kind:e.kind,rot:e.rot},t);return n?n.filter(o=>!o.dashed).map(o=>o.closed?[...o.pts,o.pts[0]]:o.pts):null}const mI=e=>e.reduce((t,n)=>t+n.slice(1).reduce((o,s,i)=>o+Je(n[i],s),0),0);function $Y(e,t){if(e.kind==="circle"){const i=Je(t[0],t[1]),r=2*Math.PI*e.k;return{x:t[0].x+i*Math.cos(r),y:t[0].y+i*Math.sin(r)}}const n=pI(e,t);if(!n)return null;let o=Math.min(1,Math.max(0,e.k))*mI(n);for(const i of n)for(let r=1;r<i.length;r++){const a=Je(i[r-1],i[r]);if(o<=a)return a<1e-12?i[r]:Cn(i[r-1],an(cn(i[r],i[r-1]),o/a));o-=a}const s=n[n.length-1];return s[s.length-1]??null}function fI(e,t,n){if(e.kind==="circle"){const l=Math.atan2(n.y-t[0].y,n.x-t[0].x)/(2*Math.PI);return l<0?l+1:l}const o=pI(e,t);if(!o)return null;const s=mI(o);if(s<1e-9)return null;let i=0,r=1/0,a=0;for(const l of o)for(let c=1;c<l.length;c++){const u=l[c-1],p=cn(l[c],u),d=Ar(p,p),m=d<1e-12?0:Math.min(1,Math.max(0,Ar(cn(n,u),p)/d)),g=Je(n,Cn(u,an(p,m)));g<r&&(r=g,a=i+m*Math.sqrt(d)),i+=Math.sqrt(d)}return a/s}function LY(e,t,n){if(!NY(e.kind))return null;const o=e.pts.map(r=>t.get(r));if(o.some(r=>!r))return null;const s={t:"path",kind:e.kind,pts:e.pts,k:0,...e.rot?{rot:e.rot}:{}},i=fI(s,o,n);return i===null?null:{...s,k:i}}`;

const newPYBlock = `${MARKER}const PY=["circle","arc","arc3","sector","ellipse","hyperbola","parabola","annulus","polygon","cone","cylinder","sphere","frustumCone","truncCylinder","cap","plane","wedge","wedgeRest"],NY=e=>PY.includes(e);function _mnShapeStrokes(e,t,g){const sh=g&&e.shapeId&&Array.isArray(g.shapes)?g.shapes.find(s=>s.id===e.shapeId):null,look3=sh?sh.look3:e.look3,rot=sh?sh.rot:e.rot;if(look3&&t.length)return D7({look3},t[0]);if(e.kind==="cone"||e.kind==="cylinder"||e.kind==="sphere"){const u=rot&&t.length?t.map(o=>Qh(o,t[0],-rot)):t;let res=null;if(e.kind==="sphere"&&u.length>=2){const[O,R]=u,r=Je(O,R);r>1e-6&&(res=[{pts:Ml(O,r,r,0,2*Math.PI,0,72),closed:!0},...wM(O,r)])}else if(e.kind==="cone"&&u.length>=3){const[O,R,S]=u,r=Je(O,R);r>1e-6&&(res=[...wM(O,r),{pts:[{x:O.x-r,y:O.y},S]},{pts:[{x:O.x+r,y:O.y},S]}])}else if(e.kind==="cylinder"&&u.length>=3){const[O,R,T]=u,r=Je(O,R);r>1e-6&&(res=[...wM(O,r),{pts:Ml(T,r,r*ab,0,2*Math.PI,0,48),closed:!0},{pts:[{x:O.x-r,y:O.y},{x:T.x-r,y:T.y}]},{pts:[{x:O.x+r,y:O.y},{x:T.x+r,y:T.y}]}])}return res&&rot&&t.length?res.map(o=>({...o,pts:o.pts.map(s=>Qh(s,t[0],rot))})):res}return B7({kind:e.kind,rot,look3},t)}function pI(e,t,g){if(e.kind==="polygon")return t.length>1?[[...t,t[0]]]:null;if(e.kind==="circle"){if(t.length<2)return null;const r=Je(t[0],t[1]);return r>1e-6?[Ml(t[0],r,r,0,2*Math.PI,0,96)]:null}const n=_mnShapeStrokes(e,t,g);if(!n)return null;const out=n.filter(o=>!o.text&&!o.shade&&o.pts&&o.pts.length>=2).map(o=>o.closed?[...o.pts,o.pts[0]]:o.pts);return out.length?out:null}const mI=e=>e.reduce((t,n)=>t+n.slice(1).reduce((o,s,i)=>o+Je(n[i],s),0),0);function $Y(e,t,g){if(e.kind==="circle"){const i=Je(t[0],t[1]),r=2*Math.PI*e.k;return{x:t[0].x+i*Math.cos(r),y:t[0].y+i*Math.sin(r)}}const n=pI(e,t,g);if(!n)return null;let o=Math.min(1,Math.max(0,e.k))*mI(n);for(const i of n)for(let r=1;r<i.length;r++){const a=Je(i[r-1],i[r]);if(o<=a)return a<1e-12?i[r]:Cn(i[r-1],an(cn(i[r],i[r-1]),o/a));o-=a}const s=n[n.length-1];return s[s.length-1]??null}function fI(e,t,n,g){if(e.kind==="circle"){const l=Math.atan2(n.y-t[0].y,n.x-t[0].x)/(2*Math.PI);return l<0?l+1:l}const o=pI(e,t,g);if(!o)return null;const s=mI(o);if(s<1e-9)return null;let i=0,r=1/0,a=0;for(const l of o)for(let c=1;c<l.length;c++){const u=l[c-1],p=cn(l[c],u),d=Ar(p,p),m=d<1e-12?0:Math.min(1,Math.max(0,Ar(cn(n,u),p)/d)),g2=Je(n,Cn(u,an(p,m)));g2<r&&(r=g2,a=i+m*Math.sqrt(d)),i+=Math.sqrt(d)}return a/s}function LY(e,t,n){if(!NY(e.kind))return null;const o=e.pts.map(r=>t.get(r));if(o.some(r=>!r))return null;const g=t&&t._geo,s={t:"path",kind:e.kind,pts:e.pts,k:0,...e.rot?{rot:e.rot}:{},...e.id?{shapeId:e.id}:{}},i=fI(s,o,n,g);return i===null?null:{...s,k:i}}`;

src = replaceOnce(src, oldPYBlock, newPYBlock, "PY / _mnShapeStrokes / pI / $Y / fI / LY");

// 3. Pass geo `g` in EY case "path" and BY path projection
src = replaceOnce(
  src,
  'case"path":{const n=e.pts.map(t);if(n.some(o=>!o))return null;const kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;return $Y({...e,k:kk},n)}',
  'case"path":{const n=e.pts.map(t);if(n.some(o=>!o))return null;const kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;return $Y({...e,k:kk},n,g)}',
  "EY case path pass geo g"
);

src = replaceOnce(
  src,
  'if(i.t==="path"){const r=i.pts.map(l=>t.get(l));if(r.some(l=>!l))return null;const a=fI(i,r,o);return a===null?null:{...i,k:a}}',
  'if(i.t==="path"){const r=i.pts.map(l=>t.get(l));if(r.some(l=>!l))return null;const a=fI(i,r,o,e);return a===null?null:{...i,k:a}}',
  "BY path pass geo e"
);

// 4. Upgrade _mnCurveToDesc, _mnCurveDeps, _mnSameCurve, _mnCurvePolys, _mnComputeLocusIntersections, _mnCurvesAt
const curveStart = src.indexOf("function _mnCurveToDesc(c){");
const curveEnd = src.indexOf("function Tt(e){", curveStart);
if (curveStart === -1 || curveEnd === -1) {
  throw new Error(`[v76] Could not locate _mnCurveToDesc..Tt block (start=${curveStart}, end=${curveEnd})`);
}

const newCurveEngine = `function _mnCurveToDesc(c){
  if(!c)return null;
  if(c.kind==="locus")return{kind:"locus",id:c.id||(c.shape&&c.shape.id)};
  if(c.kind==="shape")return{kind:"shape",id:c.id||(c.shape&&c.shape.id)};
  if(c.kind==="line")return{kind:"line",a:c.a,b:c.b,mode:c.mode||(c.seg?"seg":(c.shape&&c.shape.kind==="ray"?"ray":"line")),shapeId:c.shape&&c.shape.id};
  if(c.kind==="circle")return{kind:"circle",o:c.o,p:c.p,...(c.arcEnd?{arcEnd:c.arcEnd}:(c.shape&&c.shape.kind==="arc"&&c.shape.pts&&c.shape.pts[2]?{arcEnd:c.shape.pts[2]}:{})),shapeId:c.shape&&c.shape.id};
  return null;
}
function _mnCurveDeps(geo,c){
  if(!c)return[];
  if(c.kind==="line")return[c.a,c.b].filter(Boolean);
  if(c.kind==="circle")return[c.o,c.p,c.arcEnd].filter(Boolean);
  if(c.kind==="locus"||c.kind==="shape"){
    const sh=geo&&Array.isArray(geo.shapes)&&geo.shapes.find(s=>s.id===c.id);
    return sh&&Array.isArray(sh.pts)?sh.pts.slice():[];
  }
  return[];
}
function _mnSameCurve(a,b){
  if(!a||!b||a.kind!==b.kind)return!1;
  if(a.kind==="locus"||a.kind==="shape")return(a.id||(a.shape&&a.shape.id))===(b.id||(b.shape&&b.shape.id));
  if(a.kind==="circle")return(a.shape&&b.shape&&a.shape.id===b.shape.id)||(a.o===b.o&&a.p===b.p);
  if(a.kind==="line")return(a.a===b.a&&a.b===b.b)||(a.a===b.b&&a.b===b.a);
  return!1;
}
function _mnCurvePolys(geo,c,getPt){
  if(!geo||!c)return null;
  if(c.kind==="locus")return _mnLocusPolys(geo,c.id,getPt);
  if(c.kind==="shape"){
    const sh=Array.isArray(geo.shapes)&&geo.shapes.find(s=>s.id===c.id);
    if(!sh||!Array.isArray(sh.pts))return null;
    const pts=sh.pts.map(id=>getPt(id));
    if(pts.some(p=>!p))return null;
    return pI(sh,pts,geo);
  }
  return null;
}
function _mnComputeLocusIntersections(geo,rawC1,rawC2,baseCoords){
  if(!geo||!rawC1||!rawC2)return[];
  const c1=_mnCurveToDesc(rawC1)||rawC1,c2=_mnCurveToDesc(rawC2)||rawC2;
  const getPt=_mnBaseGet(baseCoords||Tt(geo));
  const isPoly=c=>!!c&&(c.kind==="locus"||c.kind==="shape");
  const getSegs=c=>{
    const polys=_mnCurvePolys(geo,c,getPt);
    if(!polys)return[];
    const segs=[];
    for(const poly of polys){
      for(let i=1;i<poly.length;i++)segs.push({p0:poly[i-1],p1:poly[i],idx:segs.length});
    }
    return segs;
  };
  const polyFirst=isPoly(c1);
  const polyC=polyFirst?c1:(isPoly(c2)?c2:null);
  const otherC=polyFirst?c2:c1;
  if(!polyC)return[];
  let rawHits=[];
  if(otherC.kind==="line"){
    const A=getPt(otherC.a),B=getPt(otherC.b);
    if(!A||!B)return[];
    const dLx=B.x-A.x,dLy=B.y-A.y;
    if(dLx*dLx+dLy*dLy<1e-12)return[];
    const segs=getSegs(polyC);
    const strict=[],ext=[];
    const mode=otherC.mode||"line";
    for(const seg of segs){
      const dSx=seg.p1.x-seg.p0.x,dSy=seg.p1.y-seg.p0.y;
      const denom=dSx*dLy-dSy*dLx;
      if(Math.abs(denom)<1e-10)continue;
      const dx=A.x-seg.p0.x,dy=A.y-seg.p0.y;
      const s=(dx*dLy-dy*dLx)/denom;
      if(s<-1e-6||s>1+1e-6)continue;
      const u=(dx*dSy-dy*dSx)/denom;
      const sc=Math.min(1,Math.max(0,s));
      const pt={x:seg.p0.x+sc*dSx,y:seg.p0.y+sc*dSy,order:seg.idx+sc};
      ext.push(pt);
      const okU=mode==="seg"?(u>=-1e-4&&u<=1+1e-4):(mode==="ray"?u>=-1e-4:!0);
      if(okU)strict.push(pt);
    }
    rawHits=strict.length?strict:ext;
  }else if(otherC.kind==="circle"){
    const O=getPt(otherC.o),P=getPt(otherC.p);
    if(!O||!P)return[];
    const R=Je(O,P);
    if(R<1e-6)return[];
    const E=otherC.arcEnd?getPt(otherC.arcEnd):null;
    const segs=getSegs(polyC);
    const strict=[],ext=[];
    for(const seg of segs){
      const dSx=seg.p1.x-seg.p0.x,dSy=seg.p1.y-seg.p0.y;
      const fx=seg.p0.x-O.x,fy=seg.p0.y-O.y;
      const a=dSx*dSx+dSy*dSy;
      if(a<1e-12)continue;
      const b=2*(fx*dSx+fy*dSy),c=fx*fx+fy*fy-R*R;
      const disc=b*b-4*a*c;
      if(disc<0)continue;
      const sq=Math.sqrt(disc);
      for(const s of[(-b-sq)/(2*a),(-b+sq)/(2*a)]){
        if(s<-1e-6||s>1+1e-6)continue;
        const sc=Math.min(1,Math.max(0,s));
        const pt={x:seg.p0.x+sc*dSx,y:seg.p0.y+sc*dSy,order:seg.idx+sc};
        ext.push(pt);
        if(!E||vI(O,P,E,pt,.02))strict.push(pt);
      }
    }
    rawHits=strict.length?strict:ext;
  }else if(isPoly(otherC)){
    const segs1=getSegs(polyC),segs2=getSegs(otherC);
    for(const s1 of segs1){
      const minX1=Math.min(s1.p0.x,s1.p1.x)-1e-3,maxX1=Math.max(s1.p0.x,s1.p1.x)+1e-3;
      const minY1=Math.min(s1.p0.y,s1.p1.y)-1e-3,maxY1=Math.max(s1.p0.y,s1.p1.y)+1e-3;
      const d1x=s1.p1.x-s1.p0.x,d1y=s1.p1.y-s1.p0.y;
      for(const s2 of segs2){
        if(Math.max(s2.p0.x,s2.p1.x)<minX1||Math.min(s2.p0.x,s2.p1.x)>maxX1||Math.max(s2.p0.y,s2.p1.y)<minY1||Math.min(s2.p0.y,s2.p1.y)>maxY1)continue;
        const d2x=s2.p1.x-s2.p0.x,d2y=s2.p1.y-s2.p0.y;
        const denom=d1x*d2y-d1y*d2x;
        if(Math.abs(denom)<1e-10)continue;
        const dx=s2.p0.x-s1.p0.x,dy=s2.p0.y-s1.p0.y;
        const s=(dx*d2y-dy*d2x)/denom;
        if(s<-1e-6||s>1+1e-6)continue;
        const u=(dx*d1y-dy*d1x)/denom;
        if(u<-1e-6||u>1+1e-6)continue;
        const sc=Math.min(1,Math.max(0,s));
        rawHits.push({x:s1.p0.x+sc*d1x,y:s1.p0.y+sc*d1y,order:s1.idx+sc});
      }
    }
  }
  rawHits.sort((a,b)=>a.order-b.order);
  const dedup=[];
  for(const h of rawHits){
    if(!dedup.some(p=>Je(p,h)<2.5))dedup.push({x:h.x,y:h.y});
  }
  return dedup;
}
function _mnCurvesAt(e,t,n,o){
  const list=[];
  const r=(a,l,c,u)=>{
    const p=t.get(a),d=t.get(l);
    if(!p||!d)return;
    const m=z7(u,p,d),g=m?Ea(n,m[0],m[1],"seg"):Ea(n,p,d,c);
    if(g<o)list.push({kind:"line",a,b:l,seg:c==="seg",mode:c,shape:u,dist:g});
  };
  for(const a of e.shapes)if(!a.hidden){
    if(a.kind==="segment")r(a.pts[0],a.pts[1],"seg",a);
    else if(a.kind==="line")r(a.pts[0],a.pts[1],"line",a);
    else if(a.kind==="ray")r(a.pts[0],a.pts[1],"ray",a);
    else if(a.kind==="polygon")a.pts.forEach((l,c)=>{var u;return!((u=a.hiddenSides)!=null&&u.includes(c))&&r(l,a.pts[(c+1)%a.pts.length],"seg",a)});
    else if(a.kind==="plane")a.pts.forEach((l,c)=>r(l,a.pts[(c+1)%a.pts.length],"seg",a));
    else if(a.kind==="circle"||a.kind==="arc"){
      const l=t.get(a.pts[0]),c=t.get(a.pts[1]);if(!l||!c)continue;
      if(a.kind==="arc"){const p=t.get(a.pts[2]);if(!p||!vI(l,c,p,n))continue}
      const u=Math.abs(Je(n,l)-Je(l,c));
      if(u<o)list.push({kind:"circle",o:a.pts[0],p:a.pts[1],shape:a,dist:u});
    }else if(a.kind==="locus"){
      const u=IN(_mnLocusStrokes(e,a,t),n);
      if(u<o)list.push({kind:"locus",id:a.id,shape:a,dist:u});
    }else if(NY(a.kind)){
      const pts=(a.pts||[]).map(id=>t.get(id));
      if(pts.length&&pts.every(Boolean)){
        const polys=pI(a,pts,e);
        if(polys&&polys.length){
          const u=IN(polys.map(p=>({pts:p})),n);
          if(u<o)list.push({kind:"shape",id:a.id,shape:a,dist:u});
        }
      }
    }
  }
  list.sort((a,b)=>{
    if(Math.abs(a.dist-b.dist)<2){
      const aa=a.shape&&a.shape.aux?1:0,ba=b.shape&&b.shape.aux?1:0;
      if(aa!==ba)return aa-ba;
    }
    return a.dist-b.dist;
  });
  return list;
}
`;

src = src.slice(0, curveStart) + newCurveEngine + src.slice(curveEnd);

// 5. Update _mnResolveDriver periodic list for path points
src = replaceOnce(
  src,
  'const periodic=d.kind==="circle"||d.kind==="ellipse"||d.kind==="polygon";',
  'const periodic=d.kind==="circle"||d.kind==="ellipse"||d.kind==="polygon"||d.kind==="plane"||d.kind==="sector";',
  "_mnResolveDriver periodic kinds"
);

// 6. Update c5 cascade delete to clean up interLocus points referencing deleted shape OR locus
src = replaceOnce(
  src,
  'const _al=new Set(a.filter(c=>c.kind==="locus").map(c=>c.id));for(const c of Object.values(e.points)){if(s.has(c.id)||!c.def)continue;const d=c.def;if((d.t==="onLocus"&&!_al.has(d.locusId))||(d.t==="interLocus"&&((d.c1&&d.c1.kind==="locus"&&!_al.has(d.c1.id))||(d.c2&&d.c2.kind==="locus"&&!_al.has(d.c2.id))))||Om(d).some(u=>s.has(u))){s.add(c.id);_lCh=!0;}}',
  'const _as=new Set(a.map(c=>c.id));for(const c of Object.values(e.points)){if(s.has(c.id)||!c.def)continue;const d=c.def;if((d.t==="onLocus"&&!_as.has(d.locusId))||(d.t==="interLocus"&&((d.c1&&(d.c1.kind==="locus"||d.c1.kind==="shape")&&!_as.has(d.c1.id))||(d.c2&&(d.c2.kind==="locus"||d.c2.kind==="shape")&&!_as.has(d.c2.id))))||Om(d).some(u=>s.has(u))){s.add(c.id);_lCh=!0;}}',
  "c5 cascade delete for shape & locus intersections"
);

// 7. Upgrade VY fallback to check all NY(r.kind) shapes and d5 sphere hit-testing to include equator
src = replaceOnce(
  src,
  'function VY(e,t,n,o){let s=null,i=o;for(const r of e.shapes){if(r.kind!=="ellipse"&&r.kind!=="hyperbola"&&r.kind!=="parabola")continue;const a=d5(r,t,n);a<i&&(i=a,s=r)}return s}',
  'function VY(e,t,n,o){let s=null,i=o;for(const r of e.shapes){if(r.hidden||!NY(r.kind))continue;const a=d5(r,t,n);a<i&&(i=a,s=r)}return s}',
  "VY support all NY(r.kind)"
);

src = replaceOnce(
  src,
  'case"circle":case"sphere":return Math.abs(Je(n,i[0])-Je(i[0],i[1]));',
  'case"circle":return Math.abs(Je(n,i[0])-Je(i[0],i[1]));case"sphere":{const _ss=_mnShapeStrokes(e,i,t&&t._geo);return _ss?IN(_ss,n):Math.abs(Je(n,i[0])-Je(i[0],i[1]))}',
  "d5 sphere includes equator ellipse"
);

// 8. Export PY, NY, pI, $Y, fI, LY, Kt, _mnShapeStrokes, _mnCurvePolys on window.__mnGeoKernel
src = replaceOnce(
  src,
  'window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps};',
  'window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,Kt,PY,NY,pI,$Y,fI,LY,_mnShapeStrokes,_mnCurvePolys,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps};',
  "export PY/NY/pI/LY/Kt on __mnGeoKernel"
);

// 9. Upgrade geoClick: (a) skip 1-click auto-intersect between a shape and its own aux helper segment in the same group;
//    (b) prefer matching curve for curve-consuming tools (perp/parallel/etc.) when overlapping shapes exist
src = replaceOnce(
  src,
  'else if(hits.length>=2){for(let hi=1;hi<hits.length;hi++){if(!_mnSameCurve(hits[0],hits[hi])){this.finishGeo(t,"intersect",[{kind:"curve",c:hits[0]},{kind:"curve",c:hits[hi]}]);return}}}}if(o==="equal"){if(r&&r.kind==="line"&&r.seg){const[d,m]=this.pieceAt(s,i,r.a,r.b,n);this.markEqual(t,d,m)}return}if(r&&this.wantsCurve(t,o,r)){',
  'else if(hits.length>=2){for(let hi=1;hi<hits.length;hi++){const _h0=hits[0],_h1=hits[hi];if(_mnSameCurve(_h0,_h1))continue;if(_h0.shape&&_h1.shape&&_h0.shape.group&&_h0.shape.group===_h1.shape.group&&(_h0.shape.aux||_h1.shape.aux||(_h0.kind==="line"&&_h1.kind==="shape"&&_h0.shape.pts.every(q=>_h1.shape.pts.includes(q)))||(_h1.kind==="line"&&_h0.kind==="shape"&&_h1.shape.pts.every(q=>_h0.shape.pts.includes(q)))))continue;this.finishGeo(t,"intersect",[{kind:"curve",c:_h0},{kind:"curve",c:_h1}]);return}}}if(o==="equal"){if(r&&r.kind==="line"&&r.seg){const[d,m]=this.pieceAt(s,i,r.a,r.b,n);this.markEqual(t,d,m)}return}if(o!=="intersect"){const _wh=hits.find(h=>this.wantsCurve(t,o,h));if(_wh)r=_wh;}if(r&&this.wantsCurve(t,o,r)){',
  "geoClick skip same-group aux/internal 1-click intersect + prefer wantsCurve"
);

// 10. Upgrade pointOn to snap to intersections of ANY shape/locus curve AND place path points on ANY NY(kind) shape (including plane, arc, sector, annulus, cone, cylinder, sphere, etc.)
const oldPointOn = `pointOn(t,n,o,s,i=this.tol()){const hits=_mnCurvesAt(t.geo,n,o,Math.max(i,10/this.zoom));if(hits.length>=2){for(let hi=1;hi<hits.length;hi++){const cA=hits[0],cB=hits[hi];if(_mnSameCurve(cA,cB))continue;if(cA.kind==="locus"||cB.kind==="locus"){const d1=_mnCurveToDesc(cA),d2=_mnCurveToDesc(cB),pts=_mnComputeLocusIntersections(t.geo,d1,d2,n);let bestI=-1,bestD=Math.max(i*1.5,14/this.zoom);pts.forEach((pt,idx)=>{const d=Je(pt,o);if(d<bestD){bestD=d;bestI=idx;}});if(bestI>=0){const deps=[...new Set([..._mnCurveDeps(t.geo,d1),..._mnCurveDeps(t.geo,d2)])];return{t:"interLocus",c1:d1,c2:d2,which:bestI,deps};}}}}const r=s===void 0?j0(t.geo,n,o,i):s;if(r&&r.kind==="locus"){const k=_mnProjectOnLocus(t.geo,r.id,o,n);if(k!==null)return{t:"onLocus",locusId:r.id,k,deps:[...(r.shape.pts||[])]};}const a=r&&(r.kind==="circle"||r.shape.kind==="polygon")?r.shape:r?null:VY(t.geo,n,o,i),l=a?LY(a,n,o):null;if(l)return l;if(r&&r.kind==="line"){const c=n.get(r.a),u=n.get(r.b),p=(u.x-c.x)**2+(u.y-c.y)**2;if(p>1e-6)return{t:"on",a:r.a,b:r.b,k:((o.x-c.x)*(u.x-c.x)+(o.y-c.y)*(u.y-c.y))/p,seg:r.seg}}return null}`;

const newPointOn = `pointOn(t,n,o,s,i=this.tol()){const hits=_mnCurvesAt(t.geo,n,o,Math.max(i,10/this.zoom));if(hits.length>=2){const visPts=Object.values(t.geo.points).filter(p=>p.show&&!p.hidden).map(p=>n.get(p.id)).filter(Boolean);for(let hi=1;hi<hits.length;hi++){const cA=hits[0],cB=hits[hi];if(_mnSameCurve(cA,cB))continue;if(cA.kind==="locus"||cB.kind==="locus"||cA.kind==="shape"||cB.kind==="shape"){const d1=_mnCurveToDesc(cA),d2=_mnCurveToDesc(cB),pts=_mnComputeLocusIntersections(t.geo,d1,d2,n);let bestI=-1,bestD=Math.max(i*1.5,14/this.zoom);pts.forEach((pt,idx)=>{const d=Je(pt,o);if(d<bestD&&!visPts.some(vp=>Je(vp,pt)<4)){bestD=d;bestI=idx;}});if(bestI>=0){const deps=[...new Set([..._mnCurveDeps(t.geo,d1),..._mnCurveDeps(t.geo,d2)])];return{t:"interLocus",c1:d1,c2:d2,which:bestI,deps};}}}}const r=s===void 0?j0(t.geo,n,o,i):s;if(r&&r.kind==="locus"){const k=_mnProjectOnLocus(t.geo,r.id,o,n);if(k!==null)return{t:"onLocus",locusId:r.id,k,deps:[...(r.shape.pts||[])]};}const a=r&&(r.kind==="circle"||r.kind==="shape"||r.shape.kind==="polygon"||r.shape.kind==="plane")?r.shape:r?null:VY(t.geo,n,o,i),l=a?LY(a,n,o):null;if(l)return l;if(r&&r.kind==="line"){const c=n.get(r.a),u=n.get(r.b),p=(u.x-c.x)**2+(u.y-c.y)**2;if(p>1e-6)return{t:"on",a:r.a,b:r.b,k:((o.x-c.x)*(u.x-c.x)+(o.y-c.y)*(u.y-c.y))/p,seg:r.seg}}return null}`;

src = replaceOnce(src, oldPointOn, newPointOn, "pointOn universal curve snap & placement");

// 11. Upgrade wantsCurve so kind === "shape" is accepted for intersect (and locus)
src = replaceOnce(
  src,
  'if(n==="locus")return!!(o.shape&&["segment","line","ray","circle","polygon","locus"].includes(o.shape.kind));if(o.kind==="locus")return n==="intersect";',
  'if(n==="locus")return!!(o.shape&&(["segment","line","ray","circle","polygon","locus"].includes(o.shape.kind)||NY(o.shape.kind)));if(o.kind==="locus"||o.kind==="shape")return n==="intersect";',
  "wantsCurve accept shape for intersect"
);

// 12. Upgrade finishGeo case "intersect" to compute live dynamic intersections for ANY shape or locus curve (fixing v73 onlyInterGeo bug too!)
const oldFinishInter = `case"intersect":{const[v,y]=a;if(v.kind==="locus"||y.kind==="locus"){const c1=_mnCurveToDesc(v),c2=_mnCurveToDesc(y),deps=[...new Set([..._mnCurveDeps(s.geo,c1),..._mnCurveDeps(s.geo,c2)])],pts=_mnComputeLocusIntersections(s.geo,c1,c2,Tt(s.geo));if(!pts.length){(m=(d=this.cb).geoRefused)==null||m.call(d,"apart");break}const cand=pts.map((_,idx)=>({id:nt(),def:{t:"interLocus",c1,c2,which:idx,deps},label:"",show:!0})),onlyInterGeo={...s.geo,points:Object.fromEntries(Object.entries(s.geo.points).filter(([,pt])=>!pt.def||pt.def.t==="interLocus"||pt.def.t==="inter"))};for(const T of OY(onlyInterGeo,cand,2))u.push({...T,label:c()});break}`;

const newFinishInter = `case"intersect":{const[v,y]=a;if(v.kind==="locus"||y.kind==="locus"||v.kind==="shape"||y.kind==="shape"){const c1=_mnCurveToDesc(v),c2=_mnCurveToDesc(y),deps=[...new Set([..._mnCurveDeps(s.geo,c1),..._mnCurveDeps(s.geo,c2)])],curCoords=Tt(s.geo),pts=_mnComputeLocusIntersections(s.geo,c1,c2,curCoords);if(!pts.length){(m=(d=this.cb).geoRefused)==null||m.call(d,"apart");break}const hasLocus=c1.kind==="locus"||c2.kind==="locus",existing=Object.values(s.geo.points).filter(pt=>pt.show&&!pt.hidden&&(!pt.def||pt.def.t==="inter"||pt.def.t==="interLocus"||(!hasLocus&&deps.includes(pt.id)))).map(pt=>curCoords.get(pt.id)).filter(Boolean);pts.forEach((pt,idx)=>{if(!existing.some(ep=>Je(ep,pt)<2)){existing.push(pt);u.push({id:nt(),def:{t:"interLocus",c1,c2,which:idx,deps},label:c(),show:!0});}});break}`;

src = replaceOnce(src, oldFinishInter, newFinishInter, "finishGeo intersect universal shape & locus");
changed = true;
}

// 13. Keep Shapes/Geo popover open when clicking the 3 option toggle pills (pointDots, gridSnap, autoDash3d)
if (!src.includes(MARKER_EC)) {
  const oldEcToggles = `h.jsxs("button",{className:Cu?"checked":"",onClick:()=>{J&&(J.setDots(!Cu),B1({...u.paper??GD(J.doc),dots:!Cu}))},children:[Cu?"✓ ":"",n.pointDots]}),h.jsxs("button",{className:Br?"checked":"",title:n.gridSnapHint,onClick:_p,children:[Br?"✓ ":"",n.gridSnap,!e.mobile&&Rt("gridSnap")&&h.jsx("kbd",{children:Rt("gridSnap")})]}),h.jsxs("button",{className:aD3?"checked":"",title:n.autoDash3dHint,onClick:tAD3,children:[aD3?"✓ ":"",n.autoDash3d]})`;
  const newEcToggles = `${MARKER_EC}h.jsxs("button",{className:Cu?"checked":"",onClick:_ev=>{_ev.stopPropagation(),J&&(J.setDots(!Cu),B1({...u.paper??GD(J.doc),dots:!Cu}))},children:[Cu?"✓ ":"",n.pointDots]}),h.jsxs("button",{className:Br?"checked":"",title:n.gridSnapHint,onClick:_ev=>{_ev.stopPropagation(),_p()},children:[Br?"✓ ":"",n.gridSnap,!e.mobile&&Rt("gridSnap")&&h.jsx("kbd",{children:Rt("gridSnap")})]}),h.jsxs("button",{className:aD3?"checked":"",title:n.autoDash3dHint,onClick:_ev=>{_ev.stopPropagation(),tAD3()},children:[aD3?"✓ ":"",n.autoDash3d]})`;
  src = replaceOnce(src, oldEcToggles, newEcToggles, "ec option pills stopPropagation");
  changed = true;
}

if (!changed) {
  console.log("[v76] All v76 patches already applied to index-CTbULhps.js — skipping.");
  process.exit(0);
}

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v76] Successfully patched index-CTbULhps.js (Shift+D shortcut + universal 2D/3D curve engine + option pills stopPropagation)!");
