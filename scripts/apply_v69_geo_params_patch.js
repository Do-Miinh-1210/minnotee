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
// Idempotent patch script: v0.0.6.9 GSP5 Parametric Geometry & Constraints Kernel Hook
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_GEO_PARAMS_V69__*/";
if (src.includes(MARKER)) {
  console.log("[v69] Patch already applied to index-CTbULhps.js — skipping.");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) {
    throw new Error(`[v69] Could not find anchor for: ${label}`);
  }
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) {
    throw new Error(`[v69] Anchor not unique for: ${label} (found at ${idx} and ${second})`);
  }
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

// 1. Add safe GSP5 expression/parameter evaluator + extend EY, Tt, Om
const eyOld = `function EY(e,t){switch(e.t){case"path":{const n=e.pts.map(t);return n.some(o=>!o)?null:$Y(e,n)}case"free":return{x:e.x,y:e.y};case"mid":{const n=t(e.a),o=t(e.b);return n&&o?an(Cn(n,o),.5):null}case"foot":{const n=t(e.p),o=t(e.a),s=t(e.b);if(!n||!o||!s)return null;const i=cn(s,o),r=Ar(i,i);return r<1e-12?o:Cn(o,an(i,Ar(cn(n,o),i)/r))}case"rot":{const n=t(e.c),o=t(e.p);return n&&o?Cn(n,an(AY(cn(o,n),e.ang),e.k)):null}case"sum":{const n=t(e.a),o=t(e.b),s=t(e.c);return n&&o&&s?cn(Cn(n,o),s):null}case"vec":{const n=t(e.o),o=t(e.a),s=t(e.b);if(!n||!o||!s)return null;const i=cn(s,o);return Cn(n,an(e.perp?Hg(i):i,e.k))}case"on":{const n=t(e.a),o=t(e.b);return n&&o?Cn(n,an(cn(o,n),e.k)):null}case"inter":{const n=[t(e.l1[0]),t(e.l1[1]),t(e.l2[0]),t(e.l2[1])];if(n.some(l=>!l))return null;const[o,s,i,r]=n;let a;if(!e.c1&&!e.c2){const l=cn(s,o),c=cn(r,i),u=jm(l,c);if(Math.abs(u)<1e-9)return null;a=[Cn(o,an(l,jm(cn(i,o),c)/u))]}else e.c1&&e.c2?a=_Y(o,Je(o,s),i,Je(i,r)):e.c1?a=$N(i,r,o,Je(o,s)):a=$N(o,s,i,Je(i,r));return a[Math.min(e.which,a.length-1)]??null}case"ctan":{const n=[t(e.c1[0]),t(e.c1[1]),t(e.c2[0]),t(e.c2[1])];if(n.some(l=>!l))return null;const[o,s,i,r]=n,a=gI(o,Je(o,s),i,Je(i,r),e.inner,e.which);return a?a[e.on-1]:null}case"bis":{const n=t(e.a),o=t(e.o),s=t(e.b);if(!n||!o||!s)return null;const i=Je(n,o),r=Je(s,o);if(i<1e-9||r<1e-9)return null;const a=an(cn(n,o),1/i);let l=Cn(a,an(cn(s,o),1/r));return Math.hypot(l.x,l.y)<1e-9&&(l=Hg(a)),Cn(o,an(l,i/Math.hypot(l.x,l.y)))}}}function Tt(e){const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);return t}function Om(e){switch(e.t){case"free":return[];case"mid":return[e.a,e.b];case"foot":return[e.p,e.a,e.b];case"rot":return[e.c,e.p];case"sum":return[e.a,e.b,e.c];case"vec":return[e.o,e.a,e.b];case"on":return[e.a,e.b];case"inter":return[...e.l1,...e.l2];case"bis":return[e.a,e.o,e.b];case"path":return e.pts;case"ctan":return[...e.c1,...e.c2]}}`;

const eyNew = `${MARKER}
function _mnGeoCm(g){
  if(g&&typeof g.cmPx==="number"&&g.cmPx>1)return g.cmPx;
  const ed=typeof window!=="undefined"&&window.__noteRendererEditor;
  if(ed&&typeof ed.cm==="function"){const c=ed.cm();if(Number.isFinite(c)&&c>1)return c;}
  return 150/2.54;
}
function _mnEvalExpr(expr,env){
  if(typeof expr==="number")return Number.isFinite(expr)?expr:NaN;
  const raw=String(expr||"").trim().replace(/,/g,".").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
  if(!raw)return NaN;
  const toks=[];let i=0;
  while(i<raw.length){
    const ch=raw[i];
    if(/\\s/.test(ch)){i++;continue;}
    if(/[0-9.]/.test(ch)){
      let j=i;while(j<raw.length&&/[0-9.eE]/.test(raw[j])){if((raw[j]==="e"||raw[j]==="E")&&(raw[j+1]==="+"||raw[j+1]==="-"))j++;j++;}
      toks.push({t:"num",v:parseFloat(raw.slice(i,j))});i=j;continue;
    }
    if("+-*/^(),".includes(ch)){toks.push({t:"op",v:ch});i++;continue;}
    let j=i;
    while(j<raw.length&&!/[\\s+\\-*/^(),]/.test(raw[j]))j++;
    toks.push({t:"id",v:raw.slice(i,j)});i=j;
  }
  let pos=0;
  const peek=()=>toks[pos];
  const next=()=>toks[pos++];
  const D2R=Math.PI/180,R2D=180/Math.PI;
  const fns={
    sqrt:Math.sqrt,abs:Math.abs,floor:Math.floor,ceil:Math.ceil,round:Math.round,
    sin:x=>Math.sin(x*D2R),cos:x=>Math.cos(x*D2R),tan:x=>Math.tan(x*D2R),
    sind:x=>Math.sin(x*D2R),cosd:x=>Math.cos(x*D2R),tand:x=>Math.tan(x*D2R),
    sinr:Math.sin,cosr:Math.cos,tanr:Math.tan,
    asin:x=>Math.asin(Math.max(-1,Math.min(1,x)))*R2D,
    acos:x=>Math.acos(Math.max(-1,Math.min(1,x)))*R2D,
    atan:x=>Math.atan(x)*R2D,
    rad:x=>x*D2R,deg:x=>x*R2D,
    min:Math.min,max:Math.max,pow:Math.pow,ln:Math.log,log:Math.log10||((x)=>Math.log(x)/Math.LN10),exp:Math.exp
  };
  function parseAdd(){
    let v=parseMul();
    while(peek()&&peek().t==="op"&&(peek().v==="+"||peek().v==="-")){
      const op=next().v;v=op==="+"?v+parseMul():v-parseMul();
    }
    return v;
  }
  function parseMul(){
    let v=parsePow();
    while(peek()){
      if(peek().t==="op"&&(peek().v==="*"||peek().v==="/")){
        const op=next().v;const r=parsePow();v=op==="*"?v*r:(Math.abs(r)<1e-12?NaN:v/r);
      }else if(peek().t==="id"||(peek().t==="op"&&peek().v==="(")){
        v*=parsePow();
      }else break;
    }
    return v;
  }
  function parsePow(){
    let v=parseUnary();
    if(peek()&&peek().t==="op"&&peek().v==="^"){next();v=Math.pow(v,parsePow());}
    return v;
  }
  function parseUnary(){
    if(peek()&&peek().t==="op"&&(peek().v==="+"||peek().v==="-")){
      const op=next().v;return op==="-"?-parseUnary():parseUnary();
    }
    return parseAtom();
  }
  function parseAtom(){
    const tk=peek();if(!tk)return NaN;
    if(tk.t==="num"){next();return tk.v;}
    if(tk.t==="op"&&tk.v==="("){
      next();const v=parseAdd();if(peek()&&peek().t==="op"&&peek().v===")")next();return v;
    }
    if(tk.t==="id"){
      next();const nm=tk.v,low=nm.toLowerCase();
      if(peek()&&peek().t==="op"&&peek().v==="("&&fns[low]){
        next();const args=[];
        if(!(peek()&&peek().t==="op"&&peek().v===")")){
          args.push(parseAdd());
          while(peek()&&peek().t==="op"&&peek().v===","){next();args.push(parseAdd());}
        }
        if(peek()&&peek().t==="op"&&peek().v===")")next();
        return fns[low](...args);
      }
      if(env&&Object.prototype.hasOwnProperty.call(env,nm))return env[nm];
      if(low==="pi"||nm==="π")return Math.PI;
      if(low==="e")return Math.E;
      return NaN;
    }
    return NaN;
  }
  const out=parseAdd();
  return Number.isFinite(out)?out:NaN;
}
function _mnBuildParamEnv(g){
  const env={};
  const list=(g&&Array.isArray(g.params))?g.params:[];
  if(!list.length)return env;
  for(const p of list){if(p&&p.name)env[p.name]=Number(p.value)||0;}
  for(let pass=0;pass<4;pass++){
    let ch=false;
    for(const p of list){
      if(!p||!p.name||!p.expr||!String(p.expr).trim())continue;
      const v=_mnEvalExpr(p.expr,env);
      if(Number.isFinite(v)&&Math.abs(v-(env[p.name]??NaN))>1e-9){env[p.name]=v;ch=true;}
    }
    if(!ch)break;
  }
  return env;
}
function _mnGeoVal(g,paramId,expr,fallback){
  const list=(g&&Array.isArray(g.params))?g.params:[];
  if(paramId&&list.length){
    const p=list.find(x=>x&&x.id===paramId);
    if(p){
      if(p.expr&&String(p.expr).trim()){
        const env=_mnBuildParamEnv(g);
        const v=_mnEvalExpr(p.expr,env);
        if(Number.isFinite(v))return v;
      }
      const nv=Number(p.value);
      if(Number.isFinite(nv))return nv;
    }
  }
  if(expr!==undefined&&expr!==null&&String(expr).trim()!==""){
    if(typeof expr==="number"&&Number.isFinite(expr))return expr;
    const env=_mnBuildParamEnv(g);
    const v=_mnEvalExpr(expr,env);
    if(Number.isFinite(v))return v;
  }
  return Number.isFinite(Number(fallback))?Number(fallback):0;
}
function EY(e,t,g){switch(e.t){
  case"path":{const n=e.pts.map(t);if(n.some(o=>!o))return null;const kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;return $Y({...e,k:kk},n)}
  case"free":return{x:e.x,y:e.y};
  case"mid":{const n=t(e.a),o=t(e.b);return n&&o?an(Cn(n,o),.5):null}
  case"foot":{const n=t(e.p),o=t(e.a),s=t(e.b);if(!n||!o||!s)return null;const i=cn(s,o),r=Ar(i,i);return r<1e-12?o:Cn(o,an(i,Ar(cn(n,o),i)/r))}
  case"rot":{const n=t(e.c),o=t(e.p);if(!n||!o)return null;const ang=(e.angParamId||e.angExpr)?-_mnGeoVal(g,e.angParamId,e.angExpr,-e.ang):e.ang;const kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;return Cn(n,an(AY(cn(o,n),ang),kk))}
  case"sum":{const n=t(e.a),o=t(e.b),s=t(e.c);return n&&o&&s?cn(Cn(n,o),s):null}
  case"vec":{const n=t(e.o),o=t(e.a),s=t(e.b);if(!n||!o||!s)return null;const i=cn(s,o),dir=e.perp?Hg(i):i;if(e.distParamId||e.distExpr||e.distVal!=null){const len=Math.hypot(dir.x,dir.y);if(len<1e-12)return n;const dPx=_mnGeoVal(g,e.distParamId,e.distExpr,e.distVal)*_mnGeoCm(g);return Cn(n,an(dir,dPx/len))}const kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;return Cn(n,an(dir,kk))}
  case"on":{const n=t(e.a),o=t(e.b);if(!n||!o)return null;let kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;if(e.seg)kk=Math.min(1,Math.max(0,kk));return Cn(n,an(cn(o,n),kk))}
  case"len":{const n=t(e.a);if(!n)return null;const dPx=Math.max(1e-4,_mnGeoVal(g,e.paramId,e.expr,e.val??2))*_mnGeoCm(g);const ang=(e.angParamId||e.angExpr)?-_mnGeoVal(g,e.angParamId,e.angExpr,0)*Math.PI/180:(e.ang??0);return{x:n.x+dPx*Math.cos(ang),y:n.y+dPx*Math.sin(ang)}}
  case"polar":{const O=t(e.o),R=t(e.ref);if(!O||!R)return null;const base=Math.atan2(R.y-O.y,R.x-O.x);const deg=e.fixedAng?_mnGeoVal(g,e.angParamId,e.angExpr,e.angVal??60):(e.curAngDeg??60);const rad=base-deg*Math.PI/180;const dPx=e.fixedDist?Math.max(1e-4,_mnGeoVal(g,e.distParamId,e.distExpr,e.distVal??2))*_mnGeoCm(g):Math.max(4,e.curDistPx??120);return{x:O.x+dPx*Math.cos(rad),y:O.y+dPx*Math.sin(rad)}}
  case"p3d":{const O=t(e.o);if(!O)return null;const cm=_mnGeoCm(g);const sh=g&&g.shapes&&e.solidId?g.shapes.find(s=>s.id===e.solidId):null;const mat=sh&&sh.solid?rb(sh.solid.view,sh.solid.turn):(e.view||wr);const x=_mnGeoVal(g,e.xParamId,e.vx,0)*cm,y=_mnGeoVal(g,e.yParamId,e.vy,0)*cm,z=_mnGeoVal(g,e.zParamId,e.vz,0)*cm;const pr=Nr(mat,[x,y,z]);return{x:O.x+pr[0],y:O.y+pr[1]}}
  case"inter":{const n=[t(e.l1[0]),t(e.l1[1]),t(e.l2[0]),t(e.l2[1])];if(n.some(l=>!l))return null;const[o,s,i,r]=n;let a;if(!e.c1&&!e.c2){const l=cn(s,o),c=cn(r,i),u=jm(l,c);if(Math.abs(u)<1e-9)return null;a=[Cn(o,an(l,jm(cn(i,o),c)/u))]}else e.c1&&e.c2?a=_Y(o,Je(o,s),i,Je(i,r)):e.c1?a=$N(i,r,o,Je(o,s)):a=$N(o,s,i,Je(i,r));return a[Math.min(e.which,a.length-1)]??null}
  case"ctan":{const n=[t(e.c1[0]),t(e.c1[1]),t(e.c2[0]),t(e.c2[1])];if(n.some(l=>!l))return null;const[o,s,i,r]=n,a=gI(o,Je(o,s),i,Je(i,r),e.inner,e.which);return a?a[e.on-1]:null}
  case"bis":{const n=t(e.a),o=t(e.o),s=t(e.b);if(!n||!o||!s)return null;const i=Je(n,o),r=Je(s,o);if(i<1e-9||r<1e-9)return null;const a=an(cn(n,o),1/i);let l=Cn(a,an(cn(s,o),1/r));return Math.hypot(l.x,l.y)<1e-9&&(l=Hg(a)),Cn(o,an(l,i/Math.hypot(l.x,l.y)))}
}}
function Tt(e){const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o,e);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);return t}
function Om(e){switch(e.t){case"free":return[];case"mid":return[e.a,e.b];case"foot":return[e.p,e.a,e.b];case"rot":return[e.c,e.p];case"sum":return[e.a,e.b,e.c];case"vec":return[e.o,e.a,e.b];case"on":return[e.a,e.b];case"len":return[e.a];case"polar":return[e.o,e.ref];case"p3d":return[e.o];case"inter":return[...e.l1,...e.l2];case"bis":return[e.a,e.o,e.b];case"path":return e.pts;case"ctan":return[...e.c1,...e.c2];default:return[]}}`;

src = replaceOnce(src, eyOld, eyNew, "EY/Tt/Om");

// 2. Extend EN and BY for locked/parametric points
const enByOld = `const EN=e=>e.def.t==="free"||e.def.t==="vec"||e.def.t==="on"||e.def.t==="path";function BY(e,t,n,o){const s=e.points[n];if(!s)return null;const i=s.def;if(i.t==="free")return{...i,x:o.x,y:o.y};if(i.t==="vec"){const r=t.get(i.o),a=t.get(i.a),l=t.get(i.b);if(!r||!a||!l)return null;const c=i.perp?Hg(cn(l,a)):cn(l,a),u=Ar(c,c);return u<1e-9?null:{...i,k:Ar(cn(o,r),c)/u}}if(i.t==="on"){const r=t.get(i.a),a=t.get(i.b);if(!r||!a)return null;const l=cn(a,r),c=Ar(l,l);if(c<1e-9)return null;let u=Ar(cn(o,r),l)/c;return i.seg&&(u=Math.min(1,Math.max(0,u))),{...i,k:u}}if(i.t==="path"){const r=i.pts.map(l=>t.get(l));if(r.some(l=>!l))return null;const a=fI(i,r,o);return a===null?null:{...i,k:a}}return null}`;

const enByNew = `const EN=e=>{const d=e&&e.def;if(!d)return!1;if(d.t==="free")return!0;if(d.t==="vec")return!(d.kParamId||d.kExpr||d.distParamId||d.distExpr||d.distVal!=null);if(d.t==="on"||d.t==="path")return!(d.kParamId||d.kExpr);if(d.t==="len")return!d.lockedAng&&!d.angParamId&&!d.angExpr;if(d.t==="polar")return!(d.fixedDist&&d.fixedAng);return!1};
function BY(e,t,n,o){const s=e.points[n];if(!s||!EN(s))return null;const i=s.def;if(i.t==="free")return{...i,x:o.x,y:o.y};if(i.t==="len"){const a=t.get(i.a);if(!a)return null;return{...i,ang:Math.atan2(o.y-a.y,o.x-a.x)}}if(i.t==="polar"){const O=t.get(i.o),R=t.get(i.ref);if(!O||!R)return null;const base=Math.atan2(R.y-O.y,R.x-O.x);if(i.fixedAng&&!i.fixedDist){const deg=_mnGeoVal(e,i.angParamId,i.angExpr,i.angVal??60),rad=base-deg*Math.PI/180,proj=(o.x-O.x)*Math.cos(rad)+(o.y-O.y)*Math.sin(rad);return{...i,curDistPx:Math.max(8,proj)}}if(i.fixedDist&&!i.fixedAng){const cur=Math.atan2(o.y-O.y,o.x-O.x);let deg=(base-cur)*180/Math.PI;deg=((deg%360)+360)%360;return{...i,curAngDeg:deg}}return null}if(i.t==="vec"){const r=t.get(i.o),a=t.get(i.a),l=t.get(i.b);if(!r||!a||!l)return null;const c=i.perp?Hg(cn(l,a)):cn(l,a),u=Ar(c,c);return u<1e-9?null:{...i,k:Ar(cn(o,r),c)/u}}if(i.t==="on"){const r=t.get(i.a),a=t.get(i.b);if(!r||!a)return null;const l=cn(a,r),c=Ar(l,l);if(c<1e-9)return null;let u=Ar(cn(o,r),l)/c;return i.seg&&(u=Math.min(1,Math.max(0,u))),{...i,k:u}}if(i.t==="path"){const r=i.pts.map(l=>t.get(l));if(r.some(l=>!l))return null;const a=fI(i,r,o);return a===null?null:{...i,k:a}}return null}`;

src = replaceOnce(src, enByOld, enByNew, "EN/BY");

// 3. Preserve ...e on c5 return
src = replaceOnce(
  src,
  `return a=a.filter(c=>c.pts.every(u=>l[u])),{points:l,shapes:a}}`,
  `return a=a.filter(c=>c.pts.every(u=>l[u])),{...e,points:l,shapes:a}}`,
  "c5 preserve geo metadata"
);

// 4. Preserve ...geo on addGeo, color change, hidden toggle, paste, cross-page move
src = replaceOnce(
  src,
  `addGeo(t,n,o,s=this.doc){return this.updatePage(t,i=>({...i,geo:{points:{...i.geo.points,...Object.fromEntries(n.map(r=>[r.id,r]))},shapes:[...i.geo.shapes,...o]}}),s)}`,
  `addGeo(t,n,o,s=this.doc){return this.updatePage(t,i=>({...i,geo:{...i.geo,points:{...i.geo.points,...Object.fromEntries(n.map(r=>[r.id,r]))},shapes:[...i.geo.shapes,...o]}}),s)}`,
  "addGeo preserve geo metadata"
);

src = replaceOnce(
  src,
  `geo:{points:o?Object.fromEntries(Object.entries(s.geo.points).map(([i,r])=>[i,n.points.has(i)&&r.show?{...r,color:t}:r])):s.geo.points,shapes:s.geo.shapes.map(i=>n.shapes.has(i.id)?{...i,color:t}:i)}`,
  `geo:{...s.geo,points:o?Object.fromEntries(Object.entries(s.geo.points).map(([i,r])=>[i,n.points.has(i)&&r.show?{...r,color:t}:r])):s.geo.points,shapes:s.geo.shapes.map(i=>n.shapes.has(i.id)?{...i,color:t}:i)}`,
  "recolor preserve geo metadata"
);

src = replaceOnce(
  src,
  `return{...s,geo:{points:r,shapes:i}}})),n||(this.sel=null),this.redraw(),this.emit()}selectionAuxHidden`,
  `return{...s,geo:{...s.geo,points:r,shapes:i}}})),n||(this.sel=null),this.redraw(),this.emit()}selectionAuxHidden`,
  "toggleHidden preserve geo metadata"
);

src = replaceOnce(
  src,
  `geo:{points:{...C.geo.points,...E.geo.points},shapes:[...C.geo.shapes,...E.geo.shapes]}`,
  `geo:{...C.geo,points:{...C.geo.points,...E.geo.points},shapes:[...C.geo.shapes,...E.geo.shapes]}`,
  "settle page move preserve geo metadata"
);

src = replaceOnce(
  src,
  `items:[...y.items,...p],geo:{points:g,shapes:v},...d.length?`,
  `items:[...y.items,...p],geo:{...y.geo,points:g,shapes:v},...d.length?`,
  "paste preserve geo metadata"
);

// 5. Extend cee and Fc to support p3d parametric 3D vertices
src = replaceOnce(
  src,
  `function cee(e,t,n){const o=(...s)=>{const i=s.map(t);return i.every(r=>r)?i:null};switch(e.t){`,
  `function cee(e,t,n,g){const o=(...s)=>{const i=s.map(t);return i.every(r=>r)?i:null};switch(e.t){case"p3d":{const s=o(e.o);if(!s)return null;const cm=_mnGeoCm(g),sh=g&&g.shapes&&e.solidId?g.shapes.find(q=>q.id===e.solidId):null,tr=sh&&sh.solid?sh.solid.turn:Hd;const lx=_mnGeoVal(g,e.xParamId,e.vx,0)*cm,ly=_mnGeoVal(g,e.yParamId,e.vy,0)*cm,lz=_mnGeoVal(g,e.zParamId,e.vz,0)*cm;return Xn(s[0],Nr(tr,[lx,ly,lz]))}`,
  "cee p3d support"
);

src = replaceOnce(
  src,
  `u.def.t==="free"?null:cee(u.def,a,n)),r.set(c,d),d}`,
  `u.def.t==="free"?null:cee(u.def,a,n,e)),r.set(c,d),d}`,
  "Fc pass geo to cee"
);

// 6. Add overlay hook in gd() + distinct color for constrained points in MR()
src = replaceOnce(
  src,
  `function MR(e,t){const n=e.def.t==="free"||e.def.t==="vec"||e.def.t==="on"||e.def.t==="path";return e.color??t??(n?wk:"#37474f")}`,
  `function MR(e,t){if(e.color)return e.color;if(e.def&&(e.def.t==="len"||e.def.t==="polar"||e.def.t==="p3d"||e.def.paramId||e.def.distParamId||e.def.angParamId||e.def.kParamId))return"#0d9488";const n=EN(e);return t??(n?wk:"#37474f")}`,
  "MR constrained point color"
);

src = replaceOnce(
  src,
  `const p=s.get(l.id);p&&(e.fillStyle=l.color??o.labelColor??kk,e.fillText(l.label,p.x,p.y))}e.restore()}function tL`,
  `const p=s.get(l.id);p&&(e.fillStyle=l.color??o.labelColor??kk,e.fillText(l.label,p.x,p.y))}if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.drawOverlay==="function"){try{window.MinNoteGeoParams.drawOverlay(e,t,n,o)}catch(_e){}}e.restore()}function tL`,
  "gd drawOverlay hook"
);

// 7. Prevent mergeTarget from merging constrained points
src = replaceOnce(
  src,
  `mergeTarget(t,n,o,s){let i=null,r=this.snapReach();`,
  `mergeTarget(t,n,o,s){const _mp=t.geo.points[o];if(_mp&&_mp.def&&(_mp.def.t==="len"||_mp.def.t==="polar"||_mp.def.t==="p3d"))return null;let i=null,r=this.snapReach();`,
  "mergeTarget guard constrained points"
);

// 8. Rotate len points properly in transformedPage when selection is rotated
src = replaceOnce(
  src,
  `for(const k of n.points){const w=u[k];if(w&&w.def.t==="free"){const x=o({x:w.def.x,y:w.def.y});u[k]={...w,def:{t:"free",x:x.x,y:x.y}}}}`,
  `for(const k of n.points){const w=u[k];if(!w)continue;if(w.def.t==="free"){const x=o({x:w.def.x,y:w.def.y});u[k]={...w,def:{t:"free",x:x.x,y:x.y}}}else if(i&&w.def.t==="len"&&!w.def.angParamId&&!w.def.angExpr){u[k]={...w,def:{...w.def,ang:(w.def.ang??0)+i}}}}`,
  "transformedPage rotate len points"
);

// 9. Upgrade lengthTarget & setSelectionLength + add lock/param/angle helpers on editor
const lenOld = `lengthTarget(){const t=this.sel;if(!t)return null;const n=this.doc.pages[t.page],o=c=>{var u;return((u=n.geo.points[c])==null?void 0:u.def.t)==="free"},s=n.geo.shapes.filter(c=>t.shapes.has(c.id)&&c.kind==="segment");if(s.length!==1){const c=n.geo.shapes.filter(u=>t.shapes.has(u.id)&&u.kind==="circle");return s.length||c.length!==1||!o(c[0].pts[1])?null:{page:t.page,from:c[0].pts[0],to:c[0].pts[1],radius:!0}}const[i,r]=s[0].pts,[a,l]=o(r)?[i,r]:o(i)?[r,i]:[null,null];return a&&l?{page:t.page,from:a,to:l,radius:!1}:null}selectionLengthKind(){const t=this.lengthTarget();return t?t.radius?"radius":"length":null}cm(){return Bee(this.doc.paper,this.doc.spacing,this.doc.paperImage)}selectionLength(){const t=this.lengthTarget();if(!t)return null;const n=Tt(this.doc.pages[t.page].geo),o=n.get(t.from),s=n.get(t.to);return o&&s?Je(o,s)/this.cm():null}setSelectionLength(t){const n=this.lengthTarget();if(!n||!(t>0))return;const o=Tt(this.doc.pages[n.page].geo),s=o.get(n.from),i=o.get(n.to);if(!s||!i)return;const r=Je(s,i)||1,a=t*this.cm()/r,l={x:s.x+(i.x-s.x)*a,y:s.y+(i.y-s.y)*a};this.commit(this.updatePage(n.page,c=>({...c,geo:{...c.geo,points:{...c.geo.points,[n.to]:{...c.geo.points[n.to],def:{t:"free",x:l.x,y:l.y}}}}}))),this.redraw(),this.emit()}`;

const lenNew = `lengthTarget(){const t=this.sel;if(!t)return null;const n=this.doc.pages[t.page];if(!n)return null;const can=(id,anchor)=>{const p=n.geo.points[id];if(!p||!p.def)return!1;if(p.def.t==="free")return!0;if(p.def.t==="len"&&p.def.a===anchor)return!0;if(p.def.t==="polar"&&p.def.o===anchor)return!0;return!1};const isLock=(id,anchor)=>{const p=n.geo.points[id];if(!p||!p.def)return!1;if(p.def.t==="len"&&p.def.a===anchor)return!0;if(p.def.t==="polar"&&p.def.o===anchor&&p.def.fixedDist)return!0;return!1};const s=n.geo.shapes.filter(c=>t.shapes.has(c.id)&&c.kind==="segment");if(s.length!==1){const c=n.geo.shapes.filter(u=>t.shapes.has(u.id)&&u.kind==="circle");if(!s.length&&c.length===1&&can(c[0].pts[1],c[0].pts[0]))return{page:t.page,from:c[0].pts[0],to:c[0].pts[1],radius:!0,locked:isLock(c[0].pts[1],c[0].pts[0])};if(!s.length&&!c.length&&t.points.size===2){const [p1,p2]=[...t.points];const [a,l]=isLock(p2,p1)?[p1,p2]:isLock(p1,p2)?[p2,p1]:can(p2,p1)?[p1,p2]:can(p1,p2)?[p2,p1]:[null,null];if(a&&l)return{page:t.page,from:a,to:l,radius:!1,locked:isLock(l,a)};}return null}const[i,r]=s[0].pts,[a,l]=isLock(r,i)?[i,r]:isLock(i,r)?[r,i]:can(r,i)?[i,r]:can(i,r)?[r,i]:[null,null];return a&&l?{page:t.page,from:a,to:l,radius:!1,locked:isLock(l,a)}:null}
selectionLengthKind(){const t=this.lengthTarget();return t?t.radius?"radius":"length":null}
selectionLengthLocked(){const t=this.lengthTarget();return!!(t&&t.locked)}
selectionLengthParamName(){const t=this.lengthTarget();if(!t||!t.locked)return"";const g=this.doc.pages[t.page].geo,pt=g.points[t.to],d=pt&&pt.def;if(!d)return"";const pid=d.t==="len"?d.paramId:d.distParamId,ex=d.t==="len"?d.expr:d.distExpr;if(pid&&Array.isArray(g.params)){const p=g.params.find(x=>x.id===pid);if(p)return p.name;}return ex?String(ex):""}
toggleSelectionLengthLock(){const n=this.lengthTarget();if(!n)return;const pg=this.doc.pages[n.page],o=Tt(pg.geo),s=o.get(n.from),i=o.get(n.to),pt=pg.geo.points[n.to];if(!s||!i||!pt)return;const cm=this.cm(),lenCm=Math.max(.05,Math.round(Je(s,i)/cm*100)/100);if(n.locked){const nd=pt.def.t==="polar"?{...pt.def,fixedDist:!1,curDistPx:Je(s,i),distParamId:void 0,distExpr:void 0,distVal:void 0}:{t:"free",x:i.x,y:i.y};this.commit(this.updatePage(n.page,c=>({...c,geo:{...c.geo,cmPx:cm,points:{...c.geo.points,[n.to]:{...c.geo.points[n.to],def:nd}}}})));}else{const nd=pt.def.t==="polar"?{...pt.def,fixedDist:!0,distVal:lenCm,distParamId:void 0,distExpr:void 0}:{t:"len",a:n.from,ang:Math.atan2(i.y-s.y,i.x-s.x),val:lenCm,lockedAng:!1};this.commit(this.updatePage(n.page,c=>({...c,geo:{...c.geo,cmPx:cm,points:{...c.geo.points,[n.to]:{...c.geo.points[n.to],def:nd}}}})));}this.redraw(),this.emit()}
cm(){return Bee(this.doc.paper,this.doc.spacing,this.doc.paperImage)}
selectionLength(){const t=this.lengthTarget();if(!t)return null;const n=Tt(this.doc.pages[t.page].geo),o=n.get(t.from),s=n.get(t.to);return o&&s?Je(o,s)/this.cm():null}
setSelectionLength(t){const n=this.lengthTarget();if(!n||!(t>0))return;const pg=this.doc.pages[n.page],o=Tt(pg.geo),s=o.get(n.from),i=o.get(n.to),pt=pg.geo.points[n.to];if(!s||!i||!pt)return;const cm=this.cm();if(pt.def.t==="len"){this.commit(this.updatePage(n.page,c=>({...c,geo:{...c.geo,cmPx:cm,points:{...c.geo.points,[n.to]:{...c.geo.points[n.to],def:{...c.geo.points[n.to].def,val:t,paramId:void 0,expr:void 0}}}}})));this.redraw(),this.emit();return}if(pt.def.t==="polar"){this.commit(this.updatePage(n.page,c=>({...c,geo:{...c.geo,cmPx:cm,points:{...c.geo.points,[n.to]:{...c.geo.points[n.to],def:{...c.geo.points[n.to].def,fixedDist:!0,distVal:t,distParamId:void 0,distExpr:void 0}}}}})));this.redraw(),this.emit();return}const r=Je(s,i)||1,a=t*cm/r,l={x:s.x+(i.x-s.x)*a,y:s.y+(i.y-s.y)*a};this.commit(this.updatePage(n.page,c=>({...c,geo:{...c.geo,cmPx:cm,points:{...c.geo.points,[n.to]:{...c.geo.points[n.to],def:{t:"free",x:l.x,y:l.y}}}}}))),this.redraw(),this.emit()}`;

src = replaceOnce(src, lenOld, lenNew, "lengthTarget & setSelectionLength upgrade");

// 10. Expose kernel helpers globally once `nt` and `a9` are initialized (attach inside constructor or right after `function Tt`)
// Actually expose via a getter function right after `function gee(` where all helpers (Tt, EY, Om, EN, BY, c5, yc, nt, wr, NS, Hd, vM, DN, Nr, rb, Iw, a9, mee, AR, _mnGeoVal, _mnGeoCm) are in scope!
src = replaceOnce(
  src,
  `function gee(e,t,n){`,
  `if(typeof window!=="undefined"){window.__mnGeoKernel={Tt,EY,Om,EN,BY,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv};}function gee(e,t,n){`,
  "expose window.__mnGeoKernel"
);

// 11. Upgrade .sel-bar UI: add Lock button & Param button right on sel-length, plus "Tham số" button next to "Dựng lại hình"
const selLenOld = `J&&J.selectionLength()!==null&&h.jsxs("form",{className:"sel-length",onSubmit:A=>{A.preventDefault(),A.currentTarget.elements[0].blur()},children:[J.selectionLengthKind()==="radius"?n.radius:n.length,h.jsx("input",{type:"text",inputMode:"decimal",defaultValue:String(Math.round(J.selectionLength()*10)/10).replace(".",n.decimalPoint),onFocus:A=>A.target.select(),onBlur:A=>{const W=Number(A.target.value.replace(",","."));Number.isFinite(W)&&W>0&&Math.abs(W-J.selectionLength())>.005&&J.setSelectionLength(W)}}),"cm"]},J.selectionLength().toFixed(2))`;

const selLenNew = `J&&J.selectionLength()!==null&&h.jsxs("form",{className:"sel-length"+(J.selectionLengthLocked()?" mn-len-locked":""),onSubmit:A=>{A.preventDefault(),A.currentTarget.elements[0].blur()},children:[J.selectionLengthKind()==="radius"?n.radius:n.length,h.jsx("input",{type:"text",inputMode:"decimal",defaultValue:String(Math.round(J.selectionLength()*100)/100).replace(".",n.decimalPoint),onFocus:A=>A.target.select(),onBlur:A=>{const W=Number(A.target.value.replace(",","."));Number.isFinite(W)&&W>0&&Math.abs(W-J.selectionLength())>.002&&J.setSelectionLength(W)}}),"cm",h.jsx("button",{type:"button",className:"mn-len-lock-btn"+(J.selectionLengthLocked()?" on":""),title:J.selectionLengthLocked()?"Đang KHÓA độ dài (không thể kéo thay đổi) — bấm để mở khóa":"Bấm để KHÓA cố định độ dài này (không thể kéo thay đổi)",onClick:()=>J.toggleSelectionLengthLock(),children:J.selectionLengthLocked()?"🔒":"🔓"}),h.jsx("button",{type:"button",className:"mn-len-param-btn"+(J.selectionLengthParamName()?" on":""),title:"Gắn tham số GSP5 cho độ dài này",onClick:()=>window.MinNoteGeoParams&&window.MinNoteGeoParams.openForSelection("length"),children:J.selectionLengthParamName()||"fx"})]},J.selectionLength().toFixed(2)+"_"+(J.selectionLengthLocked()?1:0)+"_"+J.selectionLengthParamName())`;

src = replaceOnce(src, selLenOld, selLenNew, "sel-bar length lock & param controls");

const replayBtnOld = `(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Dựng lại hình theo kịch bản thứ tự vẽ",onClick:()=>window.MinNoteGeoReplay&&window.MinNoteGeoReplay.open(true),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 12a9 9 0 1 0 3-6.7L3 8"}),h.jsx("path",{d:"M3 3v5h5"}),h.jsx("polygon",{points:"10 8.5 16 12 10 15.5 10 8.5",fill:"currentColor",fillOpacity:.22})]})," ","Dựng lại hình"]})`;

const replayBtnNew = `${replayBtnOld},(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Bảng Tham số & Ràng buộc GSP5 (khóa độ dài, góc, tỉ lệ 2D/3D)",onClick:()=>window.MinNoteGeoParams&&window.MinNoteGeoParams.openForSelection(),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("line",{x1:"4",y1:"7",x2:"20",y2:"7"}),h.jsx("circle",{cx:"9",cy:"7",r:"2.2",fill:"currentColor",fillOpacity:".25"}),h.jsx("line",{x1:"4",y1:"17",x2:"20",y2:"17"}),h.jsx("circle",{cx:"15",cy:"17",r:"2.2",fill:"currentColor",fillOpacity:".25"})]})," ","Tham số"]})`;

src = replaceOnce(src, replayBtnOld, replayBtnNew, "sel-bar Tham số button");

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v69] Successfully patched index-CTbULhps.js!");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
