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
// Idempotent patch script: v0.0.8.8 TikZ Dashed/Solid Lines & Automatic 3D Visibility Engine
// Fixes ALL 5 root causes of missing dashed/solid behavior on TikZ-drawn figures:
//  1. uC / hC / So: support declare function={...}, \begin{scope}[dashed/...] inheritance,
//     \tikzset / \tikzstyle custom styles, style=dashed (tkz-euclide), dash pattern=on...off...,
//     and solid-over-dashed segment deduplication.
//  2. xoe / Toe: robust PDF dash-array tokenization ([2.98 2.98]0 d AND [ 2.98 2.98 ] 0 d)
//     + ground-truth dashed/solid reconciliation from pdflatex trace onto uC segments/polygons/circles/arcs.
//  3. cee / LR / liftNext / Aee: support 3D foot points, collinear/intersection interior points (even deg>=3),
//     skip derived non-apex points in liftNext, and keep derived base vertices (like C = B+D-A) in solid.pts & solid.faces.
//  4. insertFigure + _mnAutoLiftTikz3d: zero-false-positive automatic 3D polyhedron recognition on TikZ import
//     (verified 100% against initial TikZ dashed/solid visibility) so autoDash3d works immediately on drag/rotate!
//     Also accepts raw traceTikz string defensively.
//  5. toggleDashed + selection-bar: direct 1-click Nét đứt / Nét liền toggle for selected geometry segments & polygon sides.

const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V88_TIKZ_DASHED__*/';
if (src.includes(MARKER)) {
  console.log('[v88-tikz] Patch already applied — skipping.');
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  let target = search;
  let repl = replacement;
  let idx = str.indexOf(target);
  if (idx === -1) {
    target = search.replace(/\r?\n/g, '\r\n');
    repl = replacement.replace(/\r?\n/g, '\r\n');
    idx = str.indexOf(target);
  }
  if (idx === -1) throw new Error(`[v88-tikz] Anchor not found: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v88-tikz] Anchor not unique: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + target.length);
}

// ---------------------------------------------------------------------------
// 1. Upgrade So(e, vars) to accept optional declare-function variable map
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `function So(e){const t=e.replace(/[{}]/g," ").trim();`,
  `${MARKER}function So(e,V){const t=String(e??"").replace(/[{}]/g," ").trim();`,
  'So signature'
);
src = replaceOnce(
  src,
  `if(n+=p[0].length,p[0]==="pi")return Math.PI;if(p[0]==="e")return Math.E;const d=s[p[0]];`,
  `if(n+=p[0].length,p[0]==="pi")return Math.PI;if(p[0]==="e")return Math.E;if(V&&V.has(p[0])&&t[n]!=="(")return V.get(p[0]);const d=s[p[0]];`,
  'So variable lookup'
);

// ---------------------------------------------------------------------------
// 2. Upgrade hC() to preserve \begin{scope}[...] / \end{scope} instead of stripping them
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `function hC(e,t,n){const o=[],s=i=>{let r=i;for(const[a,l]of t)r=r.replace(new RegExp(\`\\\\\\\\\${a}(?![a-zA-Z])\`,\"g\"),l);return r};for(const i of Rh(e,\";\")){let r=i.replace(/\\\\begin\\{scope\\}(\\[[^\\]]*\\])?|\\\\end\\{scope\\}/g,\" \").trim();for(;;){const a=/^\\\\def\\s*\\\\([a-zA-Z]+)\\s*\\{/.exec(r)??/^\\\\pgfmathsetmacro\\s*\\{?\\\\([a-zA-Z]+)\\}?\\s*\\{/.exec(r);if(a){const c=Fh(r,a[0].length-1);if(c<0)break;const u=s(r.slice(a[0].length,c)),p=So(u);t.set(a[1],Number.isFinite(p)?String(p):u),r=r.slice(c+1).trim();continue}const l=Mk(r);if(l){o.push(s(r.slice(0,l)).trim()),r=r.slice(l).trim();continue}break}if(r){if(r=s(r),r.startsWith(\"\\\\foreach\")){o.push(...Qee(r,t,n));continue}o.push(r)}}return o}`,
  `function hC(e,t,n,V){const o=[],s=i=>{let r=i;for(const[a,l]of t)r=r.replace(new RegExp(\`\\\\\\\\\${a}(?![a-zA-Z])\`,\"g\"),l);return r};for(const i of Rh(e,\";\")){let r=i.trim();const trail=[];for(;;){const bs=/^\\\\begin\\{scope\\}\\s*/.exec(r);if(bs){r=r.slice(bs[0].length);let opt=\"\";if(r[0]===\"[\"){const c=Fh(r,0);if(c>=0){opt=r.slice(1,c);r=r.slice(c+1)}}o.push(\"\\\\mnScopePush[\"+s(opt)+\"]\");r=r.trim();continue}const es=/^\\\\end\\{scope\\}\\s*/.exec(r);if(es){o.push(\"\\\\mnScopePop\");r=r.slice(es[0].length).trim();continue}const a=/^\\\\def\\s*\\\\([a-zA-Z]+)\\s*\\{/.exec(r)??/^\\\\pgfmathsetmacro\\s*\\{?\\\\([a-zA-Z]+)\\}?\\s*\\{/.exec(r);if(a){const c=Fh(r,a[0].length-1);if(c<0)break;const u=s(r.slice(a[0].length,c)),p=So(u,V);t.set(a[1],Number.isFinite(p)?String(p):u),r=r.slice(c+1).trim();continue}const l=Mk(r);if(l){o.push(s(r.slice(0,l)).trim()),r=r.slice(l).trim();continue}break}for(;;){const te=/\\\\end\\{scope\\}\\s*$/.exec(r);if(!te)break;trail.push(\"\\\\mnScopePop\");r=r.slice(0,te.index).trim()}if(r){if(r=s(r),r.startsWith(\"\\\\foreach\")){o.push(...Qee(r,t,n));}else o.push(r)}for(const pop of trail)o.push(pop)}return o}`,
  'hC preserve scopes + V'
);

// ---------------------------------------------------------------------------
// 3. Upgrade uC(): declare function, \tikzset/\tikzstyle, scope stack, style=dashed, dash pattern, solid-over-dashed
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `const c=(Number(l.get("xscale"))||1)*(l.has("x")&&So(l.get("x"))||1),u=(Number(l.get("yscale"))||1)*(l.has("y")&&So(l.get("y"))||1),p=[],d=[],m=new Map,g=new Map,v=new Map,y=new Map;`,
  `const fnV=new Map,stD=new Map,pDf=str=>{if(!str)return;for(const chunk of String(str).split(";")){const m2=/^\\s*([a-zA-Z][a-zA-Z0-9_]*)\\s*=\\s*(.+)$/.exec(chunk.trim());if(!m2)continue;const val=So(m2[2].trim(),fnV);Number.isFinite(val)&&fnV.set(m2[1],val)}},regSt=mp=>{for(const[k2,v2]of mp){if(k2==="declare function")pDf(v2);else if(/\\/\\.style$/.test(k2))stD.set(k2.replace(/\\/\\.style$/,"").trim(),v2)}};regSt(l);const Sv=str=>So(str,fnV),c=(Number(l.get("xscale"))||1)*(l.has("x")&&Sv(l.get("x"))||1),u=(Number(l.get("yscale"))||1)*(l.has("y")&&Sv(l.get("y"))||1),p=[],d=[],m=new Map,g=new Map,v=new Map,y=new Map;`,
  'uC declare function + styleDefs'
);

// Use Sv instead of So inside uC coordinate & geometry evaluation (L, O, G, Z, circle, ellipse, arc, at, K, H)
src = replaceOnce(
  src,
  `const ee=Rh(q,",");if(ee.length===2){const[he,Q]=ee.map(So);if(Number.isFinite(he)&&Number.isFinite(Q))return C({x:he*c,y:-Q*u})}const ce=Rh(q,":");if(ce.length===2){const he=So(ce[0]),Q=So(ce[1]);if(Number.isFinite(he)&&Number.isFinite(Q))return C({x:Q*Math.cos(he*Math.PI/180)*c,y:-Q*Math.sin(he*Math.PI/180)*u})}return null},O=R=>{const q=Rh(R,",");if(q.length===2){const[Y,ee]=q.map(So);return Number.isFinite(Y)&&Number.isFinite(ee)?{x:Y*c,y:-ee*u}:null}const U=Rh(R,":");if(U.length===2){const Y=So(U[0]),ee=So(U[1]);return Number.isFinite(Y)&&Number.isFinite(ee)?{x:ee*Math.cos(Y*Math.PI/180)*c,y:-ee*Math.sin(Y*Math.PI/180)*u}:null}return null},G=R=>{const q=R.trim(),U=Rh(q,"!");if(U.length===3){const Ae=L(U[0].trim().replace(/^\\(|\\)$/g,""));let ye=U[1].trim(),He=U[2].trim();const qe=/^([-+\\d.]+)\\s*:\\s*\\(/.exec(He),rt=qe?Number(qe[1]):0;qe&&(He=He.slice(qe[0].length-1));const ie=L(He.replace(/^\\(|\\)$/g,""));if(!Ae||!ie)return null;if(ye.startsWith("(")){const ve=L(ye.slice(1,-1));return ve?x({t:"foot",p:ve,a:Ae,b:ie}):null}const xe=/[a-z]/i.test(ye.replace(/\\b(sqrt|sin|cos|tan|pi)\\b/g,""));let _e=So(ye);`,
  `const ee=Rh(q,",");if(ee.length===2){const[he,Q]=ee.map(Sv);if(Number.isFinite(he)&&Number.isFinite(Q))return C({x:he*c,y:-Q*u})}const ce=Rh(q,":");if(ce.length===2){const he=Sv(ce[0]),Q=Sv(ce[1]);if(Number.isFinite(he)&&Number.isFinite(Q))return C({x:Q*Math.cos(he*Math.PI/180)*c,y:-Q*Math.sin(he*Math.PI/180)*u})}return null},O=R=>{const q=Rh(R,",");if(q.length===2){const[Y,ee]=q.map(Sv);return Number.isFinite(Y)&&Number.isFinite(ee)?{x:Y*c,y:-ee*u}:null}const U=Rh(R,":");if(U.length===2){const Y=Sv(U[0]),ee=Sv(U[1]);return Number.isFinite(Y)&&Number.isFinite(ee)?{x:ee*Math.cos(Y*Math.PI/180)*c,y:-ee*Math.sin(Y*Math.PI/180)*u}:null}return null},G=R=>{const q=R.trim(),U=Rh(q,"!");if(U.length===3){const Ae=L(U[0].trim().replace(/^\\(|\\)$/g,""));let ye=U[1].trim(),He=U[2].trim();const qe=/^([-+\\d.]+)\\s*:\\s*\\(/.exec(He),rt=qe?Number(qe[1]):0;qe&&(He=He.slice(qe[0].length-1));const ie=L(He.replace(/^\\(|\\)$/g,""));if(!Ae||!ie)return null;if(ye.startsWith("(")){const ve=L(ye.slice(1,-1));return ve?x({t:"foot",p:ve,a:Ae,b:ie}):null}const xe=/\\b(cm|mm|pt|bp|in|ex|em)\\b/i.test(ye);let _e=Sv(ye);`,
  'uC L/O/G use Sv'
);

// Upgrade Z(), scopeStack, X() (\mnScopePush, \mnScopePop, \tikzset, \tikzstyle), and rt() solid-over-dashed
src = replaceOnce(
  src,
  `Z=(R,q)=>{const U={...q};for(const[Y,ee]of R){const ce=ee?null:u4(Y);if(ce)U.color=ce;else if(Y==="color"||Y==="draw"){const he=u4(ee);he&&(U.color=he),Y==="draw"?U.draw=ee!=="none":U.draw||(U.draw=!1)}else if(Y==="fill"){const he=u4(ee)??(ee?null:U.color??t.color);he&&(U.fill=he)}else if(/^(densely |loosely )?(dashed|dotted|dash dot)$/.test(Y))U.dashed=!0;else if(Y==="solid")U.dashed=!1;else if(Y==="line width"){const he=So(ee);Number.isFinite(he)&&(U.width=Math.max(.8,he/HR.pt*2.1))}else Y in dL?U.width=dL[Y]:Y==="->"||Y==="-latex"||Y==="-stealth"||Y==="-{Stealth}"||Y==="-{Latex}"||Y==="-{>}"?U.arrow="end":(Y==="<-"||Y==="latex-"||Y==="stealth-")&&(U.arrow="start")}return U},X=R=>{const q=/^\\\\([a-zA-Z]+)\\s*/.exec(R);if(!q){i.add(R.slice(0,20));return}const U=q[1],Y=R.slice(q[0].length);if(U.startsWith("tkz"))return K(U.slice(3),Y);if(!(U==="tikzset"||U==="tikzstyle"||U==="usetikzlibrary"||U==="clip"||U==="useasboundingbox")){if(U==="coordinate")return z(\`coordinate \${Y}\`,{draw:!1},!0);if(U==="node")return z(\`node \${Y}\`,{draw:!1},!0);if(U==="pic")return z(\`pic \${Y}\`,{draw:!1});if(U==="draw")return z(Y,{draw:!0});if(U==="path")return z(Y,{draw:!1});if(U==="fill")return z(Y,{draw:!1,fill:t.color});if(U==="filldraw")return z(Y,{draw:!0,fill:t.color});i.add(\`\\\\\${U}\`)}}`,
  `Z=(R,q,dep=0)=>{let U={...q};for(const[Y,ee]of R){if(dep<4&&!ee&&stD.has(Y)){U=Z(qr(stD.get(Y)),U,dep+1);continue}if(Y==="style"&&ee&&dep<4){U=Z(qr(ee),U,dep+1);continue}const ce=ee?null:u4(Y);if(ce)U.color=ce;else if(Y==="color"||Y==="draw"){const he=u4(ee);he&&(U.color=he),Y==="draw"?U.draw=ee!=="none":U.draw||(U.draw=!1)}else if(Y==="fill"){const he=u4(ee)??(ee?null:U.color??t.color);he&&(U.fill=he)}else if(/^(densely |loosely )?(dashed|dotted|dash dot|dash dot dot)$/.test(Y))U.dashed=!0;else if(Y==="dash pattern")U.dashed=/\\bon\\b/i.test(ee)&&/\\boff\\b/i.test(ee);else if(Y==="solid")U.dashed=!1;else if(Y==="line width"){const he=Sv(ee);Number.isFinite(he)&&(U.width=Math.max(.8,he/HR.pt*2.1))}else Y in dL?U.width=dL[Y]:Y==="->"||Y==="-latex"||Y==="-stealth"||Y==="-{Stealth}"||Y==="-{Latex}"||Y==="-{>}"?U.arrow="end":(Y==="<-"||Y==="latex-"||Y==="stealth-")&&(U.arrow="start")}return U};const scBase=()=>{const b=Z(l,{});delete b.draw;return b},scStk=[scBase()],curSc=()=>scStk[scStk.length-1];const X=R=>{const q=/^\\\\([a-zA-Z]+)\\s*/.exec(R);if(!q){i.add(R.slice(0,20));return}const U=q[1],Y=R.slice(q[0].length);if(U==="mnScopePush"){const m2=/^\\[([\\s\\S]*)\\]$/.exec(Y.trim());const mp=m2&&m2[1]?qr(m2[1]):new Map;regSt(mp);const nx=Z(mp,curSc());delete nx.draw;scStk.push(nx);return}if(U==="mnScopePop"){scStk.length>1&&scStk.pop();return}if(U==="tikzset"){const tY=Y.trim();if(tY[0]==="{"){const e2=Fh(tY,0);if(e2>0)regSt(qr(tY.slice(1,e2)))}return}if(U==="tikzstyle"){const m2=/^\\{?([a-zA-Z0-9_\\s-]+)\\}?\\s*=\\s*\\[([\\s\\S]*)\\]/.exec(Y.trim());m2&&stD.set(m2[1].trim(),m2[2]);return}if(U.startsWith("tkz"))return K(U.slice(3),Y);if(!(U==="usetikzlibrary"||U==="clip"||U==="useasboundingbox")){const sc=curSc();if(U==="coordinate")return z(\`coordinate \${Y}\`,{...sc,draw:!1},!0);if(U==="node")return z(\`node \${Y}\`,{...sc,draw:!1},!0);if(U==="pic")return z(\`pic \${Y}\`,{...sc,draw:!1});if(U==="draw")return z(Y,{...sc,draw:!0});if(U==="path")return z(Y,{...sc,draw:!1});if(U==="fill")return z(Y,{...sc,draw:!1,fill:t.color});if(U==="filldraw")return z(Y,{...sc,draw:!0,fill:t.color});i.add(\`\\\\\${U}\`)}}`,
  'uC Z + scopeStack + tikzset/tikzstyle + X'
);

// In K() (\tkzDraw*), inherit curSc() and let solid overwrite earlier dashed duplicate
src = replaceOnce(
  src,
  `Ae=Z(Y,{draw:!0}),`,
  `Ae=Z(Y,{...curSc(),draw:!0}),`,
  'uC K inherit scope'
);
src = replaceOnce(
  src,
  `d.some(Be=>Be.kind==="segment"&&!ue&&!Be.arrow&&Be.pts.includes(fe)&&Be.pts.includes(Le))||_("segment",Se,ee,ue?{arrow:!0}:{})`,
  `(()=>{const ex=!ue&&d.find(Be=>Be.kind==="segment"&&!Be.arrow&&Be.pts.includes(fe)&&Be.pts.includes(Le));if(ex){if(ex.dashed&&!ee.dashed)delete ex.dashed;return}_("segment",Se,ee,ue?{arrow:!0}:{})})()`,
  'uC rt solid overwrites dashed dup'
);
src = replaceOnce(
  src,
  `!at&&d.some(le=>le.kind==="segment"&&le.pts.includes(ve)&&le.pts.includes($e))||_("segment",[ve,$e],Ae,at?{arrow:!0}:{})`,
  `(()=>{const ex=!at&&d.find(le=>le.kind==="segment"&&!le.arrow&&le.pts.includes(ve)&&le.pts.includes($e));if(ex){if(ex.dashed&&!Ae.dashed)delete ex.dashed;return}_("segment",[ve,$e],Ae,at?{arrow:!0}:{})})()`,
  'uC K DrawSegments solid overwrites dashed dup'
);
src = replaceOnce(
  src,
  `for(const R of hC(r,H,i))try{X(R)}catch{i.add(R.slice(0,24))}`,
  `for(const R of hC(r,H,i,fnV))try{X(R)}catch{i.add(R.slice(0,24))}`,
  'uC pass fnV to hC'
);

// ---------------------------------------------------------------------------
// 4. Upgrade xoe() PDF dash array parser & Toe() dashed/solid reconciliation
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `const v=[];let y=null;for(const k of m.split(/\\s+/)){if(k==="["){y=[];continue}if(k==="]")continue;const w=Number(k);if(Number.isFinite(w)&&k!==""){(y&&!v.length&&m.indexOf("]")>m.indexOf(k)?y:v).push(w);continue}`,
  `const v=[];let y=null,inArr=!1;for(const k of m.replace(/\\[/g," [ ").replace(/\\]/g," ] ").trim().split(/\\s+/)){if(k==="["){y=[];inArr=!0;continue}if(k==="]"){inArr=!1;continue}const w=Number(k);if(Number.isFinite(w)&&k!==""){(inArr&&y?y:v).push(w);continue}`,
  'xoe bracket-safe dash tokenization'
);
src = replaceOnce(
  src,
  `case"d":o={...o,dashed:!!y&&y.length>0&&y.some(S=>S>0)},y=null;break;`,
  `case"d":o={...o,dashed:!!y&&y.length>0&&y.some(S=>S>0)},y=null,inArr=!1;break;`,
  'xoe reset inArr on d'
);

src = replaceOnce(
  src,
  `const k=new Set([...t.names.values()].map(z=>g(z)).filter(z=>!!z)),w=[];for(const z of t.draws)if(z.stroke)for(const $ of z.subs){const B=u2($);for(let F=1;F<B.length;F++)w.push([B[F-1],B[F]])}const x=z=>w.some(([$,B])=>xC(z,$,B)<Ca),S=(z,$)=>[.15,.3,.5,.7,.85].every(B=>x(Dy(z,$,B)));a=a.flatMap(z=>{const $=z.pts.map(B=>c.get(B));if($.some(B=>!B)||z.hidden)return[z];if(z.kind==="segment")return S($[0],$[1])?[z]:[];if(z.kind==="polygon"&&z.width>0){const B=new Set(z.gaps??[]);return $.forEach((F,K)=>!B.has(K)&&!S(F,$[(K+1)%$.length])&&B.add(K)),B.size>=$.length&&!z.fill?[]:[B.size?{...z,gaps:[...B].sort((F,K)=>F-K)}:z]}if(z.kind==="circle"){const B=qo($[0],$[1]);return Array.from({length:8},(K,H)=>({x:$[0].x+B*Math.cos(H*Math.PI/4),y:$[0].y+B*Math.sin(H*Math.PI/4)})).filter(x).length>=6?[z]:[]}if(z.kind==="arc"||z.kind==="sector"){const[B,F,K]=$,H=qo(B,F),R=Math.atan2(F.y-B.y,F.x-B.x),q=((R-Math.atan2(K.y-B.y,K.x-B.x))%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return[.1,.3,.5,.7,.9].map(Y=>({x:B.x+H*Math.cos(R-Y*q),y:B.y+H*Math.sin(R-Y*q)})).every(x)?[z]:[]}return z.kind==="arc3"?$.every(B=>x(B))?[z]:[]:[z]});`,
  `const k=new Set([...t.names.values()].map(z=>g(z)).filter(z=>!!z)),w=[],wSol=[],wDsh=[];for(const z of t.draws)if(z.stroke)for(const $ of z.subs){const B=u2($);for(let F=1;F<B.length;F++){const seg=[B[F-1],B[F]];w.push(seg);(z.dashed?wDsh:wSol).push(seg)}}const x=z=>w.some(([$,B])=>xC(z,$,B)<Ca),xS=z=>wSol.some(([$,B])=>xC(z,$,B)<Ca),xD=z=>wDsh.some(([$,B])=>xC(z,$,B)<Ca),S=(z,$)=>[.15,.3,.5,.7,.85].every(B=>x(Dy(z,$,B))),sS=(z,$)=>[.15,.3,.5,.7,.85].every(B=>xS(Dy(z,$,B))),sD=(z,$)=>[.15,.3,.5,.7,.85].every(B=>xD(Dy(z,$,B))),setD=(sh,isD)=>{if(!!sh.dashed===isD)return sh;const{dashed:_dd,...rest}=sh;return isD?{...rest,dashed:!0}:rest};a=a.flatMap(z=>{const $=z.pts.map(B=>c.get(B));if($.some(B=>!B)||z.hidden)return[z];if(z.kind==="segment"){if(!S($[0],$[1]))return[];const hs=sS($[0],$[1]),hd=sD($[0],$[1]);return[hd&&!hs?setD(z,!0):hs&&!hd?setD(z,!1):z]}if(z.kind==="polygon"&&z.width>0){const B=new Set(z.gaps??[]),exSegs=[];let solidSides=0,dashSides=0;$.forEach((F,K)=>{if(B.has(K))return;const G=$[(K+1)%$.length];if(!S(F,G)){B.add(K);return}const hs=sS(F,G),hd=sD(F,G);if(hd&&!hs)dashSides++;else if(hs)solidSides++});if(dashSides>0&&solidSides>0){$.forEach((F,K)=>{if(B.has(K))return;const G=$[(K+1)%$.length];if(sD(F,G)&&!sS(F,G)){B.add(K);exSegs.push({id:o(),kind:"segment",pts:[z.pts[K],z.pts[(K+1)%$.length]],color:z.color,width:z.width,dashed:!0})}})}const nz=dashSides>0&&solidSides===0?setD(z,!0):solidSides>0&&dashSides===0?setD(z,!1):z;return B.size>=$.length&&!nz.fill?exSegs:[B.size?{...nz,gaps:[...B].sort((F,K)=>F-K)}:nz,...exSegs]}if(z.kind==="circle"){const B=qo($[0],$[1]),pts8=Array.from({length:8},(K,H)=>({x:$[0].x+B*Math.cos(H*Math.PI/4),y:$[0].y+B*Math.sin(H*Math.PI/4)}));if(pts8.filter(x).length<6)return[];const hs=pts8.filter(xS).length>=6,hd=pts8.filter(xD).length>=6;return[hd&&!hs?setD(z,!0):hs&&!hd?setD(z,!1):z]}if(z.kind==="arc"||z.kind==="sector"){const[B,F,K]=$,H=qo(B,F),R=Math.atan2(F.y-B.y,F.x-B.x),q=((R-Math.atan2(K.y-B.y,K.x-B.x))%(2*Math.PI)+2*Math.PI)%(2*Math.PI),pts5=[.1,.3,.5,.7,.9].map(Y=>({x:B.x+H*Math.cos(R-Y*q),y:B.y+H*Math.sin(R-Y*q)}));if(!pts5.every(x))return[];const hs=pts5.every(xS),hd=pts5.every(xD);return[hd&&!hs?setD(z,!0):hs&&!hd?setD(z,!1):z]}return z.kind==="arc3"?$.every(B=>x(B))?[z]:[]:[z]});`,
  'Toe ground-truth dashed/solid reconciliation'
);

// ---------------------------------------------------------------------------
// 5. Upgrade cee (add 3D foot), LR (intersections & collinear interior pts even deg>=3),
//    liftNext (skip derived non-apex pts), Aee (keep derived base/top vertices in solid.pts & faces + preserve fill polygons)
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `case"mid":{const s=o(e.a,e.b);return s&&Bn(Xn(s[0],s[1]),.5)}`,
  `case"mid":{const s=o(e.a,e.b);return s&&Bn(Xn(s[0],s[1]),.5)}case"foot":{const s=o(e.p,e.a,e.b);if(!s)return null;const d=St(s[2],s[1]),d2=bn(d,d);return d2<1e-9?s[1]:Xn(s[1],Bn(d,bn(St(s[0],s[1]),d)/d2))}`,
  'cee add 3D foot support'
);

const newLRAndAee = `function _mnIsDerivedNonApex(e,id,allSet){const pt=e.points[id];if(!pt||!pt.def||pt.def.t==="free")return!1;const t=pt.def.t;if(t==="mid"||t==="on"||t==="foot"||t==="inter"||t==="bis"||t==="path"||t==="ctan")return!0;const deps=Om(pt.def);return deps.length>0&&deps.every(d=>allSet.has(d))}
function LR(e,t,n,o,s=Tt(e)){const i=new Set(n),r=[];for(const d of e.shapes)i.has(d.id)&&(d.kind==="segment"?r.push([d.pts[0],d.pts[1]]):d.kind==="polygon"&&d.pts.forEach((m,g)=>{var v;return!((v=d.gaps)!=null&&v.includes(g))&&r.push([m,d.pts[(g+1)%d.pts.length]])}));const a=(d,m,g,tol=3)=>{const v={x:g.x-m.x,y:g.y-m.y},y=Math.hypot(v.x,v.y);if(y<1e-9)return null;const k=((d.x-m.x)*v.x+(d.y-m.y)*v.y)/(y*y),w=Math.abs((d.x-m.x)*v.y-(d.y-m.y)*v.x)/y;return k>.02&&k<.98&&w<=tol+(tol>=3?.01*y:.004*y)?{k,off:w}:null},l=t.filter(d=>{var m;return((m=e.points[d])==null?void 0:m.def.t)==="free"&&s.get(d)}),c=d=>r.filter(([m,g])=>m===d||g===d).length,u=new Set(l.filter(d=>{if(o.includes(d))return!1;const deg=c(d),tol=deg<3?3:2;return r.some(([m,g])=>m!==d&&g!==d&&s.get(m)&&s.get(g)&&a(s.get(d),s.get(m),s.get(g),tol)!==null)})),p=new Map;for(let d=!0;d;){d=!1;for(const m of u){if(p.has(m))continue;const g=y=>!u.has(y)||p.has(y),tol=c(m)<3?3:2,hits=[];for(const[y,k]of r){if(y===m||k===m||!g(y)||!g(k)||!s.get(y)||!s.get(k))continue;const w=a(s.get(m),s.get(y),s.get(k),tol);w&&hits.push({a:y,b:k,...w})}if(!hits.length)continue;hits.sort((x,y)=>x.off-y.off);let interDef=null;for(let q=1;q<hits.length;q++){const h0=hits[0],hq=hits[q];if(h0.a===hq.a||h0.a===hq.b||h0.b===hq.a||h0.b===hq.b)continue;const p1=s.get(h0.a),p2=s.get(h0.b),p3=s.get(hq.a),p4=s.get(hq.b),det=(p2.x-p1.x)*(p4.y-p3.y)-(p2.y-p1.y)*(p4.x-p3.x),ln=Math.hypot(p2.x-p1.x,p2.y-p1.y)*Math.hypot(p4.x-p3.x,p4.y-p3.y);if(Math.abs(det)>.08*ln){interDef={t:"inter",l1:[h0.a,h0.b],c1:!1,l2:[hq.a,hq.b],c2:!1,which:0};break}}p.set(m,interDef||{t:"on",a:hits[0].a,b:hits[0].b,k:hits[0].k,seg:!0}),d=!0}}return p}
function Aee(e,t,n){const o=Tt(e),s=x=>o.get(x),i=t.base.filter(x=>s(x));if(i.length<3)return null;const r=wee(i.map(x=>s(x))),a=[r[6],r[7],r[8]],l=LR(e,t.points,t.shapes,i,o),allSet=new Set(t.points),feetObj=t.feet||{},c=t.points.filter(x=>{const pt=e.points[x];if(!pt||!s(x)||l.has(x))return!1;if(i.includes(x))return!0;if(pt.def.t==="free")return!0;if(feetObj[x])return!0;return!_mnIsDerivedNonApex(e,x,allSet)}),u=new Map;for(const x of c){const S=s(x);if(i.includes(x))u.set(x,iL(r,S));else{const j=iL(r,feetObj[x]??S);u.set(x,[j[0],j[1],r[4]*j[1]-S.y])}}for(const x of t.points){if(u.has(x)||l.has(x)||!s(x))continue;const pt=e.points[x];if(pt&&(pt.def.t==="sum"||pt.def.t==="vec"||pt.def.t==="rot")){const deps=Om(pt.def);if(deps.length&&deps.every(q=>u.has(q))){const v3=cee(pt.def,q=>u.get(q),o,e);v3&&u.set(x,v3)}}}if(!c.some(x=>!i.includes(x)))return null;const p=n(),d={...e.points};for(const x of t.points){if(!d[x])continue;const orig=d[x],S={...orig,group:p},j=l.get(x);j&&(S.def=j);const T=u.get(x);if(T){const keepParam=orig.def.t!=="free"&&Om(orig.def).length>0&&Om(orig.def).every(q=>u.has(q));if(!keepParam){S.z=bn(a,T);const[C,_]=Nr(r,T);S.def={t:"free",x:C,y:_}}}d[x]=S}const m=new Set(t.shapes);let g={color:"#1a1a1a",width:2.5};const v=[],seenSeg=new Map;const addSeg=(sh)=>{const k2=sh.pts[0]<sh.pts[1]?sh.pts[0]+"|"+sh.pts[1]:sh.pts[1]+"|"+sh.pts[0];const prev=seenSeg.get(k2);if(prev){if(prev.dashed&&!sh.dashed)delete prev.dashed;return}seenSeg.set(k2,sh);v.push(sh)};for(const x of e.shapes){if(!m.has(x.id)){v.push(x);continue}g={color:x.color,width:x.width};if(x.kind==="polygon"){if(x.fill){const gapAll=x.pts.map((_,idx)=>idx);v.push({...x,group:p,gaps:gapAll})}x.pts.forEach((S,j)=>{var T;(T=x.gaps)!=null&&T.includes(j)||addSeg({id:n(),kind:"segment",pts:[S,x.pts[(j+1)%x.pts.length]],color:x.color,width:x.width,group:p,...x.dashed?{dashed:!0}:{}})})}else if(x.kind==="segment"&&!x.arrow){addSeg({...x,group:p})}else{v.push({...x,group:p})}}const y=[...u.keys()],k=Cee(y.map(x=>u.get(x))),w=n();return v.push({id:w,kind:"solid",pts:y,color:g.color,width:g.width,group:p,solid:{of:"custom",view:r,turn:Hd,faces:k,home:r}}),a9({...e,points:d,shapes:v},w,Hd)}
function _mnAutoLiftTikz3d(geo,idGen){
  try{
    if(!geo||!geo.points||!Array.isArray(geo.shapes))return null;
    if(geo.shapes.some(s=>s.kind==="solid"))return null;
    const coords=Tt(geo);
    const allPts=Object.values(geo.points).filter(p=>p&&p.show&&!p.hidden&&coords.get(p.id));
    if(allPts.length<4||allPts.length>40)return null;
    const rawSegs=[];
    const addRaw=(a,b,dashed)=>{if(a===b||!coords.get(a)||!coords.get(b))return;const k=a<b?a+"|"+b:b+"|"+a;const ex=rawSegs.find(s=>s.k===k);if(ex){if(ex.dashed&&!dashed)ex.dashed=!1;return}rawSegs.push({k,a,b,dashed:!!dashed})};
    for(const sh of geo.shapes){
      if(sh.hidden)continue;
      if(sh.kind==="segment"&&sh.pts.length>=2)addRaw(sh.pts[0],sh.pts[1],!!sh.dashed);
      else if(sh.kind==="polygon"&&sh.pts.length>=3&&sh.width!==0){
        const gp=new Set(sh.gaps||[]);
        for(let j=0;j<sh.pts.length;j++)if(!gp.has(j))addRaw(sh.pts[j],sh.pts[(j+1)%sh.pts.length],!!sh.dashed);
      }
    }
    if(rawSegs.length<6)return null;
    const nDash=rawSegs.filter(s=>s.dashed).length,nSol=rawSegs.length-nDash;
    if(nDash<1||nSol<3)return null;
    const onSeg=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<1e-6)return null;const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(L*L),off=Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/L;return t>.03&&t<.97&&off<=Math.max(2.5,.012*L)?t:null};
    // Build skeleton candidate vertices (exclude derived mid/on/foot/inter and free collinear interior points)
    const skelIds=[];
    const derivedNonBase=new Set;
    for(const pt of allPts){
      const t=pt.def&&pt.def.t;
      if(t==="mid"||t==="on"||t==="foot"||t==="inter"||t==="bis"||t==="path"||t==="ctan"){derivedNonBase.add(pt.id);continue}
      const pc=coords.get(pt.id);
      const isInterior=rawSegs.some(sg=>sg.a!==pt.id&&sg.b!==pt.id&&onSeg(pc,coords.get(sg.a),coords.get(sg.b))!==null);
      if(isInterior){derivedNonBase.add(pt.id);continue}
      skelIds.push(pt.id);
    }
    if(skelIds.length<4||skelIds.length>14)return null;
    const skelSet=new Set(skelIds);
    // Build skeleton adjacency: u-v adjacent if direct rawSeg OR collinear chain of rawSegs through non-skel pts
    const adj=new Map(skelIds.map(id=>[id,new Map]));
    const checkCollinearEdge=(u,v)=>{
      const k=u<v?u+"|"+v:v+"|"+u;
      const direct=rawSegs.find(s=>s.k===k);
      if(direct)return{exists:!0,dashed:direct.dashed};
      const pu=coords.get(u),pv=coords.get(v),L=Math.hypot(pv.x-pu.x,pv.y-pu.y);
      if(L<1e-4)return{exists:!1};
      const pieces=[];
      for(const sg of rawSegs){
        const pa=coords.get(sg.a),pb=coords.get(sg.b);
        const ta=sg.a===u?0:sg.a===v?1:onSeg(pa,pu,pv);
        const tb=sg.b===u?0:sg.b===v?1:onSeg(pb,pu,pv);
        if(ta!==null&&tb!==null){
          if((sg.a!==u&&sg.a!==v&&skelSet.has(sg.a))||(sg.b!==u&&sg.b!==v&&skelSet.has(sg.b)))continue;
          pieces.push({t0:Math.min(ta,tb),t1:Math.max(ta,tb),dashed:sg.dashed});
        }
      }
      if(!pieces.length)return{exists:!1};
      pieces.sort((x,y)=>x.t0-y.t0);
      let cov=0;
      for(const pc of pieces){if(pc.t0>cov+.03)return{exists:!1};if(pc.t1>cov)cov=pc.t1}
      if(cov<.97)return{exists:!1};
      return{exists:!0,dashed:pieces.every(pc=>pc.dashed)};
    };
    const skelEdges=[];
    for(let a=0;a<skelIds.length;a++)for(let b=a+1;b<skelIds.length;b++){
      const u=skelIds[a],v=skelIds[b],res=checkCollinearEdge(u,v);
      if(res.exists){
        adj.get(u).set(v,res.dashed);
        adj.get(v).set(u,res.dashed);
        skelEdges.push({u,v,dashed:res.dashed});
      }
    }
    const allShowIds=allPts.map(p=>p.id);
    const allShapeIds=geo.shapes.filter(s=>!s.hidden).map(s=>s.id);
    const cands=[];
    // Family 1: Pyramids (1 apex S connected to all n>=3 base vertices forming a cycle)
    const byTop=skelIds.slice().sort((a,b)=>coords.get(a).y-coords.get(b).y);
    for(const S of byTop){
      const rest=skelIds.filter(id=>id!==S);
      if(rest.length<3||rest.length>8)continue;
      if(!rest.every(b=>adj.get(S).has(b)))continue;
      // Order base vertices CCW around centroid
      const basePts=rest.map(id=>({id,...coords.get(id)}));
      const cx=basePts.reduce((acc,p)=>acc+p.x,0)/basePts.length,cy=basePts.reduce((acc,p)=>acc+p.y,0)/basePts.length;
      basePts.sort((p,q)=>Math.atan2(p.y-cy,p.x-cx)-Math.atan2(q.y-cy,q.x-cx));
      const baseIds=basePts.map(p=>p.id);
      let cycleOk=!0;
      for(let j=0;j<baseIds.length;j++){if(!adj.get(baseIds[j]).has(baseIds[(j+1)%baseIds.length])){cycleOk=!1;break}}
      if(!cycleOk)continue;
      const bPos=baseIds.map(id=>coords.get(id));
      const sPos=coords.get(S);
      const choices=xee(bPos);
      const footCands=[Mee(sPos,choices,bPos),{x:cx,y:cy}];
      for(const bp of bPos){if(bp.y>sPos.y&&Math.abs(bp.x-sPos.x)<.45*(bp.y-sPos.y))footCands.push(bp)}
      for(const ft of footCands){cands.push({base:baseIds,feet:{[S]:ft},pri:Math.abs(ft.x-sPos.x)})}
    }
    // Family 2: Prisms / Boxes / Frustums (2 disjoint cycles of size n=3..6 connected 1-to-1)
    if(skelIds.length>=6&&skelIds.length%2===0&&skelIds.length<=12){
      const nHalf=skelIds.length/2;
      const sortedY=skelIds.slice().sort((a,b)=>coords.get(a).y-coords.get(b).y);
      const topIds=sortedY.slice(0,nHalf),botIds=sortedY.slice(nHalf);
      const ordCycle=ids=>{
        const ps=ids.map(id=>({id,...coords.get(id)}));
        const cx=ps.reduce((a,p)=>a+p.x,0)/ps.length,cy=ps.reduce((a,p)=>a+p.y,0)/ps.length;
        ps.sort((p,q)=>Math.atan2(p.y-cy,p.x-cx)-Math.atan2(q.y-cy,q.x-cx));
        const ord=ps.map(p=>p.id);
        return ord.every((id,j)=>adj.get(id).has(ord[(j+1)%ord.length]))?ord:null;
      };
      const tCyc=ordCycle(topIds),bCyc=ordCycle(botIds);
      if(tCyc&&bCyc){
        const bPos=bCyc.map(id=>coords.get(id)),tPos=tCyc.map(id=>coords.get(id));
        const conns=tCyc.map(tid=>bCyc.map((bid,idx)=>adj.get(tid).has(bid)?idx:-1).filter(idx=>idx>=0));
        const pFeet=See(bPos,tPos,conns);
        const choices=xee(bPos);
        const fMap={};
        tCyc.forEach((tid,idx)=>{fMap[tid]=pFeet?pFeet[idx]:Mee(tPos[idx],choices,conns[idx].map(bi=>bPos[bi]))});
        cands.push({base:bCyc,feet:fMap,pri:0});
      }
    }
    if(!cands.length)return null;
    // Strict Verification Gate: lift candidate & require 100% skeleton edge dashed/solid match + >=85% total segment match!
    let best=null;
    for(const cd of cands){
      const lifted=Aee(geo,{points:allShowIds,shapes:allShapeIds,base:cd.base,feet:cd.feet},idGen);
      if(!lifted)continue;
      const liftedMap=new Map;
      for(const sh of lifted.shapes){
        if(sh.kind==="segment"&&sh.pts.length>=2){
          const k=sh.pts[0]<sh.pts[1]?sh.pts[0]+"|"+sh.pts[1]:sh.pts[1]+"|"+sh.pts[0];
          liftedMap.set(k,!!sh.dashed);
        }
      }
      let skelOk=!0;
      for(const se of skelEdges){
        const k=se.u<se.v?se.u+"|"+se.v:se.v+"|"+se.u;
        if(liftedMap.has(k)&&liftedMap.get(k)!==se.dashed){skelOk=!1;break}
      }
      if(!skelOk)continue;
      let matchAll=0,totAll=0;
      for(const rs of rawSegs){
        if(liftedMap.has(rs.k)){totAll++;if(liftedMap.get(rs.k)===rs.dashed)matchAll++}
      }
      if(totAll>0&&matchAll/totAll<.85)continue;
      const score=matchAll*1000-cd.pri*.01;
      if(!best||score>best.score)best={lifted,score};
    }
    return best?best.lifted:null;
  }catch(_e){return null}
}`;

src = replaceOnce(
  src,
  `function LR(e,t,n,o,s=Tt(e)){const i=new Set(n),r=[];for(const d of e.shapes)i.has(d.id)&&(d.kind==="segment"?r.push([d.pts[0],d.pts[1]]):d.kind==="polygon"&&d.pts.forEach((m,g)=>{var v;return!((v=d.gaps)!=null&&v.includes(g))&&r.push([m,d.pts[(g+1)%d.pts.length]])}));const a=(d,m,g)=>{const v={x:g.x-m.x,y:g.y-m.y},y=Math.hypot(v.x,v.y);if(y<1e-9)return null;const k=((d.x-m.x)*v.x+(d.y-m.y)*v.y)/(y*y),w=Math.abs((d.x-m.x)*v.y-(d.y-m.y)*v.x)/y;return k>.02&&k<.98&&w<=3+.01*y?{k,off:w}:null},l=t.filter(d=>{var m;return((m=e.points[d])==null?void 0:m.def.t)==="free"&&s.get(d)}),c=d=>r.filter(([m,g])=>m===d||g===d).length,u=new Set(l.filter(d=>!o.includes(d)&&c(d)<3&&r.some(([m,g])=>m!==d&&g!==d&&s.get(m)&&s.get(g)&&a(s.get(d),s.get(m),s.get(g))!==null))),p=new Map;for(let d=!0;d;){d=!1;for(const m of u){if(p.has(m))continue;const g=y=>!u.has(y)||p.has(y);let v=null;for(const[y,k]of r){if(y===m||k===m||!g(y)||!g(k)||!s.get(y)||!s.get(k))continue;const w=a(s.get(m),s.get(y),s.get(k));w&&(!v||w.off<v.off)&&(v={a:y,b:k,...w})}v&&(p.set(m,{t:"on",a:v.a,b:v.b,k:v.k,seg:!0}),d=!0)}}return p}function Aee(e,t,n){const o=Tt(e),s=x=>o.get(x),i=t.base.filter(x=>s(x));if(i.length<3)return null;const r=wee(i.map(x=>s(x))),a=[r[6],r[7],r[8]],l=LR(e,t.points,t.shapes,i,o),c=t.points.filter(x=>{var S;return((S=e.points[x])==null?void 0:S.def.t)==="free"&&s(x)&&!l.has(x)}),u=new Map;for(const x of c){const S=s(x);if(i.includes(x))u.set(x,iL(r,S));else{const j=iL(r,t.feet[x]??S);u.set(x,[j[0],j[1],r[4]*j[1]-S.y])}}if(!c.some(x=>!i.includes(x)))return null;const p=n(),d={...e.points};for(const x of t.points){if(!d[x])continue;const S={...d[x],group:p},j=l.get(x);j&&(S.def=j);const T=u.get(x);if(T){S.z=bn(a,T);const[C,_]=Nr(r,T);S.def={t:"free",x:C,y:_}}d[x]=S}const m=new Set(t.shapes);let g={color:"#1a1a1a",width:2.5};const v=[];for(const x of e.shapes){if(!m.has(x.id)){v.push(x);continue}g={color:x.color,width:x.width},x.kind==="polygon"?x.pts.forEach((S,j)=>{var T;(T=x.gaps)!=null&&T.includes(j)||v.push({id:n(),kind:"segment",pts:[S,x.pts[(j+1)%x.pts.length]],color:x.color,width:x.width,group:p,...x.dashed?{dashed:!0}:{}})}):v.push({...x,group:p})}const y=[...u.keys()],k=Cee(y.map(x=>u.get(x))),w=n();return v.push({id:w,kind:"solid",pts:y,color:g.color,width:g.width,group:p,solid:{of:"custom",view:r,turn:Hd,faces:k,home:r}}),a9({...e,points:d,shapes:v},w,Hd)}`,
  newLRAndAee,
  'LR + Aee + _mnAutoLiftTikz3d'
);

// Fix liftNext() so derived non-apex points (O, M, N, I) do NOT get fake orange feet!
src = replaceOnce(
  src,
  `u=t.points.filter(d=>!t.base.includes(d)&&!c.has(d)),`,
  `_allS=new Set(t.points),u=t.points.filter(d=>!t.base.includes(d)&&!c.has(d)&&!_mnIsDerivedNonApex(n,d,_allS)),`,
  'liftNext skip derived non-apex points'
);

// ---------------------------------------------------------------------------
// 6. Upgrade insertFigure(t): auto-lift verified TikZ 3D solids + defensive raw traceTikz string support
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `insertFigure(t){const n=qh(t);if(!n)return;const o=this.viewCentre(),s=Math.max(n.x1-n.x0,n.y1-n.y0,.5),i=Math.max(Nm,Math.min(4*Nm,cte/s)),r=g9(t,i,o),a=yc(this.doc.pages[o.index].geo),l=r.points.map(c=>c.show&&!c.label?{...c,label:a()}:c);this.commit(this.addGeo(o.index,l,r.shapes)),this.setTool({k:"select"}),this.sel={page:o.index,strokes:new Set,items:new Set,points:new Set(l.filter(c=>c.show).map(c=>c.id)),shapes:new Set(r.shapes.map(c=>c.id))},this.redraw(),this.emit()}`,
  `insertFigure(t){if(typeof t==="string"){const _tr=Toe({points:[],shapes:[],names:{}},xoe(t),this.shapeStyle,()=>nt(),()=>"");if(!_tr||!qh(_tr))return;t=_tr}const n=qh(t);if(!n)return;const o=this.viewCentre(),s=Math.max(n.x1-n.x0,n.y1-n.y0,.5),i=Math.max(Nm,Math.min(4*Nm,cte/s)),r=g9(t,i,o),a=yc(this.doc.pages[o.index].geo);let l=r.points.map(c=>c.show&&!c.label?{...c,label:a()}:c),shs=r.shapes;if(this.autoDash3d!==!1){const _tmp={points:Object.fromEntries(l.map(c=>[c.id,c])),shapes:shs},_lifted=_mnAutoLiftTikz3d(_tmp,()=>nt());if(_lifted){l=Object.values(_lifted.points);shs=_lifted.shapes}}this.commit(this.addGeo(o.index,l,shs)),this.setTool({k:"select"}),this.sel={page:o.index,strokes:new Set,items:new Set,points:new Set(l.filter(c=>c.show).map(c=>c.id)),shapes:new Set(shs.map(c=>c.id))},this.redraw(),this.emit()}`,
  'insertFigure auto-lift 3D solid + trace string fallback'
);

// ---------------------------------------------------------------------------
// 7. Upgrade toggleDashed() for polygon side selection + show quick Nét đứt/Nét liền button in selection-bar for geometry too!
// ---------------------------------------------------------------------------
src = replaceOnce(
  src,
  `toggleDashed(){const t=this.sel,n=t?this.doc.pages[t.page]:null,o=n?n.strokes.filter(r=>t.strokes.has(r.id)):[],s=n?n.geo.shapes.filter(r=>t.shapes.has(r.id)&&Z0(r.kind)):[];if(!t||!o.length&&!s.length){this.dashed=!this.dashed,this.emit();return}const i=[...o,...s].some(r=>!r.dashed);this.commit(this.updatePage(t.page,r=>({...r,strokes:r.strokes.map(a=>t.strokes.has(a.id)?{...a,dashed:i}:a),geo:{...r.geo,shapes:r.geo.shapes.map(a=>t.shapes.has(a.id)&&Z0(a.kind)?{...a,dashed:i}:a)}})))}`,
  `toggleDashed(){const t=this.sel,n=t?this.doc.pages[t.page]:null;if(t&&t.side&&n){this.styleLines({dashed:!this.selectionDashed()});return}const o=n?n.strokes.filter(r=>t.strokes.has(r.id)):[],s=n?n.geo.shapes.filter(r=>t.shapes.has(r.id)&&Z0(r.kind)):[];if(!t||!o.length&&!s.length){this.dashed=!this.dashed,this.emit();return}const i=[...o,...s].some(r=>!r.dashed);this.commit(this.updatePage(t.page,r=>({...r,strokes:r.strokes.map(a=>t.strokes.has(a.id)?{...a,dashed:i}:a),geo:{...r.geo,shapes:r.geo.shapes.map(a=>t.shapes.has(a.id)&&Z0(a.kind)?(i?{...a,dashed:!0}:(({dashed:_dd,...rest})=>rest)(a)):a)}})))}selectionHasDashable(){const t=this.sel;if(!t)return!1;const n=this.doc.pages[t.page];if(!n)return!1;return n.strokes.some(s=>s.kind==="pen"&&t.strokes.has(s.id))||n.geo.shapes.some(s=>t.shapes.has(s.id)&&Z0(s.kind)&&s.kind!=="solid")}`,
  'toggleDashed polygon-side support + selectionHasDashable'
);

src = replaceOnce(
  src,
  `(J==null?void 0:J.selectionHasInk())&&h.jsxs("button",{onClick:()=>J.toggleDashed(),children:[h.jsx(oe.dashed,{})," ",J.selectionDashed()?n.solid:n.dashed]})`,
  `(J==null?void 0:J.selectionHasDashable())&&h.jsxs("button",{onClick:()=>J.toggleDashed(),children:[h.jsx(oe.dashed,{})," ",J.selectionDashed()?n.solid:n.dashed]})`,
  'selection-bar quick dashed/solid toggle for geometry lines'
);

fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v88-tikz] Successfully applied v0.0.8.8 TikZ dashed/solid & 3D auto-dash patch!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
