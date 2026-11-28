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
// MinNote v0.0.9.27:
// 1. Remove Nét đứt (dashed) button from main drawing toolbar while keeping D shortcut & selection bar button.
// 2. Replace orange-yellow selection border (#f7bc4c) & purge ALL leftover legacy maroon (#650f12 / #4a0a0d)
//    across both index-CTbULhps.js and index-BQ73TrLm.css with MinNote Cobalt Blue (#2563eb / #1d4ed8).
// 3. Soften filled-region hover/selection highlight (gentle brightening wash instead of harsh thick blue border).
// 4. Completely redesign Đồ thị hàm số (aoe) to mirror GeoGebra Calculator Suite:
//    - Left navigation rail (Đại số / Công cụ / Hiển thị) + unified "+ Nhập lệnh..." command input
//    - Spacious pan/zoom coordinate plane with ZERO click-to-add-point
//    - Collapsible 4-tab GeoGebra Virtual Math Keyboard (123, f(x), ABC + αβγ Greek, #&¬) + "⋯" Functions Catalog

const fs = require("fs");
const path = require("path");

const jsPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
const cssPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-BQ73TrLm.css");

let src = fs.readFileSync(jsPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

function replaceExact(label, from, to) {
  if (!src.includes(from)) throw new Error(`[${label}] Target not found!`);
  src = src.replace(from, to);
  console.log(`[OK] ${label}`);
}

function replaceRange(label, startMarker, endMarker, replacement) {
  const s = src.indexOf(startMarker);
  if (s === -1) throw new Error(`[${label}] Start marker not found: ${startMarker}`);
  const e = src.indexOf(endMarker, s + startMarker.length);
  if (e === -1) throw new Error(`[${label}] End marker not found: ${endMarker}`);
  src = src.slice(0, s) + replacement + src.slice(e);
  console.log(`[OK] ${label} (old=${e - s}, new=${replacement.length})`);
}

// ============================================================================
// 1. HIDE DASHED BUTTON FROM MAIN TOOLBAR (KEEP KEYBOARD SHORTCUT D!)
// ============================================================================
const dashedBtnOld = `dashed:()=>Pt("dashed")&&h.jsx(zt,{title:n.dashedTip,on:i==null?void 0:i.dashed,onClick:()=>J==null?void 0:J.toggleDashed(),children:h.jsx(oe.dashed,{})}),shapes:()=>`;
const dashedBtnNew = `/*__MN_V927_HIDE_DASHED_BTN__*/dashed:()=>null,shapes:()=>`;
if (src.includes(dashedBtnNew)) {
  console.log("[SKIP] Dashed toolbar button already hidden");
} else {
  replaceExact("Hide dashed button from main toolbar", dashedBtnOld, dashedBtnNew);
}

// ============================================================================
// 2. REPLACE SELECTION BORDER & PURGE ALL LEGACY MAROON (#650f12 / #4a0a0d)
// ============================================================================
// 2A. Canvas selection handles & box colors (light mode -> Cobalt #2563eb, zero amber #f7bc4c, zero maroon #650f12)
const oldCanvasPalette = `{mark:"#650f12",wash:"rgba(101, 15, 18, 0.08)",handle:"#fff",ring:"#607d8b"}`;
const newCanvasPalette = `{mark:"#2563eb",wash:"rgba(37, 99, 235, 0.08)",handle:"#fff",ring:"#64748b"}`;
if (src.includes(oldCanvasPalette)) replaceExact("Canvas light selection palette", oldCanvasPalette, newCanvasPalette);

// Replace #f7bc4c (amber dashed selection box, lasso border, link target border) with Cobalt blue / i.mark
let cAmber = 0;
src = src.replace(/#f7bc4c/gi, () => { cAmber++; return "#2563eb"; });
console.log(`[OK] Replaced ${cAmber} amber #f7bc4c selection borders with #2563eb`);

// Replace rgba(101, 15, 18, ...) and all remaining legacy maroon hex tokens in index-CTbULhps.js
let cMaroon = 0;
src = src.replace(/#650f12/gi, () => { cMaroon++; return "#2563eb"; });
src = src.replace(/#4a0a0d/gi, () => { cMaroon++; return "#1d4ed8"; });
src = src.replace(/#8e1a1f/gi, () => { cMaroon++; return "#3b82f6"; });
src = src.replace(/rgba\(101,\s*15,\s*18,/g, "rgba(37, 99, 235,");
src = src.replace(/#f6e9ea/gi, "#eff6ff");
src = src.replace(/#f7ecec/gi, "#eff6ff");
console.log(`[OK] Replaced ${cMaroon} legacy maroon occurrences in index-CTbULhps.js`);

// Upgrade default graph curve color palette `pm` so Cobalt Blue is first (modern GeoGebra feel)
const oldPm = `pm=["#d32f2f","#1565c0","#2e7d32","#6a1b9a","#ef6c00","#00838f"]`;
const newPm = `pm=["#2563eb","#dc2626","#059669","#7c3aed","#ea580c","#0891b2"]`;
if (src.includes(oldPm)) replaceExact("Graph curve modern color palette", oldPm, newPm);

// 2B. Purge legacy maroon defaults in index-BQ73TrLm.css
const cssReplacements = [
  [/#650f12/gi, "#2563eb"],
  [/#4a0a0d/gi, "#1d4ed8"],
  [/#8e1a1f/gi, "#3b82f6"],
  [/#c98b8e/gi, "#93c5fd"],
  [/#f7ecec/gi, "#eff6ff"],
  [/#f9eeee/gi, "#eff6ff"],
  [/#fbf3f3/gi, "#f0f7ff"],
  [/#f7e9ea/gi, "#dbeafe"],
  [/#f6e9ea/gi, "#eff6ff"]
];
let cssChanged = 0;
for (const [re, rep] of cssReplacements) {
  css = css.replace(re, () => { cssChanged++; return rep; });
}
fs.writeFileSync(cssPath, css, "utf8");
console.log(`[OK] Replaced ${cssChanged} legacy maroon CSS tokens in index-BQ73TrLm.css`);

// ============================================================================
// 3. SOFTEN FILLED-REGION SELECTION / HOVER HIGHLIGHT (BRIGHTEN GENTLY!)
// ============================================================================
const oldFillSel = `for(const j of S){const _hc=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),_fOnly=_mnIsFillOnlyPoly(j);t.save(),t.globalAlpha=_fOnly?.72:.48,gd(t,{points:w.geo.points,shapes:[_fOnly?{...j,color:_hc,fill:_hc+"26",gaps:void 0,hiddenSides:void 0,width:2.2+2.4/s}:{...j,color:_hc,width:(j.width||2)+2.8/s}]},x,{hidePoints:!0}),t.restore()}`;
const newFillSel = `for(const j of S){const _hc=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),_fOnly=_mnIsFillOnlyPoly(j);t.save(),_fOnly?(t.globalAlpha=1,gd(t,{points:w.geo.points,shapes:[{...j,color:"rgba(37, 99, 235, 0.22)",fill:"rgba(255, 255, 255, 0.34)",gaps:void 0,hiddenSides:void 0,width:1.1/s}]},x,{hidePoints:!0})):(t.globalAlpha=.48,gd(t,{points:w.geo.points,shapes:[{...j,color:_hc,width:(j.width||2)+2.8/s}]},x,{hidePoints:!0})),t.restore()}`;
if (src.includes(newFillSel)) {
  console.log("[SKIP] Filled-region soft highlight already applied");
} else {
  replaceExact("Soften filled-region hover/selection highlight", oldFillSel, newFillSel);
}

// Also ensure graph parser ES supports sgn and trunc
if (src.includes("round:Math.round,sign:Math.sign}") && !src.includes("sgn:Math.sign")) {
  replaceExact("Add sgn & trunc to graph parser ES", "round:Math.round,sign:Math.sign}", "round:Math.round,sign:Math.sign,sgn:Math.sign,trunc:Math.trunc}");
}

// Enhance t9 renderer to support GeoGebra per-function hidden / width / opacity / dashStyle / hideLabel / labelMode & point hidden / color
const oldT9Fns = `z||t.fns.forEach(Q=>{const re=$i(Q.expr);if(!(re instanceof Error)){if(e.save(),e.strokeStyle=Q.color,e.lineWidth=(w?1.8:2.6)*FJ(Q)*(t.lineScale??1),Q.dashed&&e.setLineDash(IJ),Q.lim){`;
const newT9Fns = `z||t.fns.forEach(Q=>{if(Q.hidden)return;const re=$i(Q.expr);if(!(re instanceof Error)){if(e.save(),Q.opacity!=null&&(e.globalAlpha=Q.opacity),e.strokeStyle=Q.color,e.lineWidth=(Q.width??(w?1.8:2.6))*FJ(Q)*(t.lineScale??1),(Q.dashed||Q.dashStyle==="dot")&&e.setLineDash(Q.dashStyle==="dot"?[2.5,4.5]:IJ),Q.lim){`;
if (!src.includes(newT9Fns) && src.includes(oldT9Fns)) {
  replaceExact("t9 curve hidden/width/opacity/dot style", oldT9Fns, newT9Fns);
}
const oldT9Leg = `U=[...t.fns.map(Q=>({color:Q.color,dashed:!!Q.dashed,tex:MJ(Q,!!t.comma),runs:g($r(Q.expr)&&!Qr(Q.expr)?kr(Q.expr):[{t:Qr(Q.expr)?"x":"y",italic:!0,sup:!1},{t:" = ",italic:!1,sup:!1},...kr(Sl(Q.expr))])})),`;
const newT9Leg = `U=[...t.fns.filter(Q=>!Q.hidden&&!Q.hideLabel).map(Q=>({color:Q.color,dashed:!!Q.dashed,tex:Q.labelMode==="fn"&&!$r(Q.expr)?(Q.name||"f")+"(x) = "+(Yr(Sl(Q.expr),!!t.comma)||Sl(Q.expr)):MJ(Q,!!t.comma),runs:g($r(Q.expr)&&!Qr(Q.expr)?kr(Q.expr):[{t:Qr(Q.expr)?"x":(Q.labelMode==="fn"?(Q.name||"f")+"(x)":"y"),italic:!0,sup:!1},{t:" = ",italic:!1,sup:!1},...kr(Sl(Q.expr))])})),`;
if (!src.includes(newT9Leg) && src.includes(oldT9Leg)) {
  replaceExact("t9 legend hidden/hideLabel/labelMode", oldT9Leg, newT9Leg);
}
const oldT9Pts = `H=(t.points??[]).flatMap((Q,re)=>{const be=$2(t,Q);`;
const newT9Pts = `H=(t.points??[]).flatMap((Q,re)=>{if(Q.hidden)return[];const be=$2(t,Q);`;
if (!src.includes(newT9Pts) && src.includes(oldT9Pts)) {
  replaceExact("t9 points hidden filter", oldT9Pts, newT9Pts);
}
const oldT9PtCol = `const ye=Q.fn>=0?((he=t.fns[Q.fn])==null?void 0:he.color)??"#1a1a1a":"#1a1a1a";`;
const newT9PtCol = `const ye=Q.color||(Q.fn>=0?((he=t.fns[Q.fn])==null?void 0:he.color)??"#1a1a1a":"#1a1a1a");`;
if (!src.includes(newT9PtCol) && src.includes(oldT9PtCol)) {
  replaceExact("t9 point custom color", oldT9PtCol, newT9PtCol);
}

// ============================================================================
// 4. REDESIGN ĐỒ THỊ HÀM SỐ (aoe) — GEOGEBRA CALCULATOR SUITE EDITION
// ============================================================================
function __mnNormShorthand(raw){
  let s=String(raw??"");
  s=s.replace(/≤/g,"<=").replace(/≥/g,">=").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
  s=s.replace(/(?<![A-Za-z_])(sin|cos|tan|cot)\^(\d+)\s*\(([^()]+)\)/gi,"($1($3))^$2");
  s=s.replace(/(?<![A-Za-z_])(sin|cos|tan|cot)\^(\d+)\s*([0-9]*[xy])\b/gi,"($1($3))^$2");
  s=s.replace(/(?<![A-Za-z_])(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|cot|sqrt|cbrt|abs|exp|ln|log)(?!h)(?:\s*\b|\s*)([0-9]*\.?[0-9]*[xy](?:\^[0-9]+)?|pi|π)\b(?!\s*\()/gi,(m,fn,arg)=>{
    if(/^(sin|cos|tan)$/i.test(fn)&&/^h/i.test(arg))return m;
    return `${fn.toLowerCase()}(${arg})`;
  });
  return s;
}

function __mnVisualMathTex(raw,caretPos,showCaret,useComma){
  const CT="\\textcolor{#2563ef}{\\rule[-0.18em]{1.5pt}{1.12em}}";
  const s0=String(raw??"");
  const pos=Math.max(0,Math.min(s0.length,caretPos??s0.length));
  const str=showCaret?s0.slice(0,pos)+"\uE000"+s0.slice(pos):s0;
  if(!str.trim()&&!showCaret)return"";
  // Tokenize
  const toks=[];
  let k=0;
  while(k<str.length){
    const ch=str[k];
    if(ch===" "||ch==="\t"||ch==="\n"){k++;continue}
    if(ch==="\uE000"){toks.push({t:"caret"});k++;continue}
    if((ch>="0"&&ch<="9")||ch==="."){
      let j=k;
      while(j<str.length&&((str[j]>="0"&&str[j]<="9")||str[j]==="."))j++;
      const v=str.slice(k,j);
      toks.push({t:"num",v:useComma?v.replace(".",","):v});
      k=j;continue;
    }
    const two=str.slice(k,k+2);
    if(two==="<="){toks.push({t:"rel",v:"\\le "});k+=2;continue}
    if(two===">="){toks.push({t:"rel",v:"\\ge "});k+=2;continue}
    if("+-*/^()|;,=<>≤≥×÷−".includes(ch)){
      const map={"≤":"\\le ","≥":"\\ge ","×":"*","÷":"/","−":"-"};
      const nv=map[ch]||ch;
      if(nv==="\\le "||nv==="\\ge "||nv==="<"||nv===">"||nv==="=")toks.push({t:"rel",v:nv==="="?" = ":` ${nv} `});
      else toks.push({t:"sym",v:nv});
      k++;continue;
    }
    // Identifier / function name (supports log_2, Greek letters)
    let j=k+1;
    while(j<str.length&&/[A-Za-z0-9_α-ωΑ-Ωϕς']/.test(str[j])&&str[j]!=="\uE000")j++;
    const id=str.slice(k,j);
    toks.push({t:"id",v:id});
    k=j;
  }
  let idx=0;
  const peek=()=>toks[idx];
  const next=()=>toks[idx++];
  const FNS=new Set(["sqrt","cbrt","abs","sin","cos","tan","cot","arcsin","arccos","arctan","asin","acos","atan","sinh","cosh","tanh","ln","log","lg","exp","sgn","sign","round","floor","ceil","trunc"]);
  const GREEK={pi:"\\pi",π:"\\pi",α:"\\alpha",β:"\\beta",γ:"\\gamma",δ:"\\delta",ε:"\\varepsilon",ζ:"\\zeta",η:"\\eta",θ:"\\theta",ι:"\\iota",κ:"\\kappa",λ:"\\lambda",μ:"\\mu",ν:"\\nu",ξ:"\\xi",ρ:"\\rho",σ:"\\sigma",ς:"\\varsigma",τ:"\\tau",υ:"\\upsilon",φ:"\\varphi",ϕ:"\\phi",χ:"\\chi",ψ:"\\psi",ω:"\\omega"};
  const unwrap=node=>node&&node.grouped?node.inner:(node?node.tex:"");
  const parseExpr=(stopR)=>{
    let out="";
    let first=!0;
    while(idx<toks.length){
      const tk=peek();
      if(!tk)break;
      if(stopR&&tk.t==="sym"&&tk.v===")")break;
      if(tk.t==="sym"&&(tk.v===";"||tk.v===",")){
        next();
        out+=(tk.v===";"?";\\, ":",\\, ");
        first=!0;continue;
      }
      if(tk.t==="rel"){
        next();
        out+=tk.v;
        first=!0;continue;
      }
      if(!first&&tk.t==="sym"&&(tk.v==="+"||tk.v==="-")){
        next();
        const rhs=parseMul();
        out+=` ${tk.v} ${rhs.tex}`;
        continue;
      }
      const term=parseMul();
      if(!term.tex){if(idx<toks.length)next();continue}
      out+=term.tex;
      first=!1;
    }
    return out;
  };
  const parseMul=()=>{
    let cur=parseFrac();
    while(idx<toks.length){
      const tk=peek();
      if(!tk)break;
      if(tk.t==="sym"&&tk.v==="*"){
        next();
        const rhs=parseFrac();
        cur={tex:`${cur.tex} \\cdot ${rhs.tex}`,grouped:!1};
        continue;
      }
      if(tk.t==="caret"||tk.t==="num"||tk.t==="id"||(tk.t==="sym"&&tk.v==="(")){
        const rhs=parseFrac();
        cur={tex:cur.tex+rhs.tex,grouped:!1};
        continue;
      }
      break;
    }
    return cur;
  };
  const parseFrac=()=>{
    let cur=parsePow();
    while(idx<toks.length&&peek().t==="sym"&&peek().v==="/"){
      next();
      const den=parsePow();
      const nTex=unwrap(cur)||"\\square";
      const dTex=unwrap(den)||"\\square";
      cur={tex:`\\dfrac{${nTex}}{${dTex}}`,grouped:!1};
    }
    return cur;
  };
  const parsePow=()=>{
    let cur=parseUnary();
    if(idx<toks.length&&peek().t==="sym"&&peek().v==="^"){
      next();
      const exp=parseUnary();
      const bTex=cur.tex||"\\square";
      const eTex=unwrap(exp)||"\\square";
      cur={tex:`{${bTex}}^{${eTex}}`,grouped:!1};
    }
    return cur;
  };
  const parseUnary=()=>{
    const tk=peek();
    if(tk&&tk.t==="sym"&&(tk.v==="+"||tk.v==="-")){
      next();
      const inner=parseUnary();
      return{tex:`${tk.v}${inner.tex}`,grouped:!1};
    }
    return parseAtom();
  };
  const wrapP=inner=>/\\dfrac|\\sqrt/.test(inner)?`\\left(${inner}\\right)`:`(${inner})`;
  const parseAtom=()=>{
    const tk=peek();
    if(!tk)return{tex:"",grouped:!1};
    if(tk.t==="caret"){next();return{tex:CT,grouped:!1}}
    if(tk.t==="num"){next();return{tex:tk.v,grouped:!1}}
    if(tk.t==="sym"&&tk.v==="("){
      next();
      const inner=parseExpr(!0);
      if(peek()&&peek().t==="sym"&&peek().v===")")next();
      const shown=inner||"\\square";
      return{tex:wrapP(shown),inner:inner,grouped:!0};
    }
    if(tk.t==="sym"&&tk.v==="|"){next();return{tex:"|",grouped:!1}}
    if(tk.t==="id"){
      next();
      const low=tk.v.toLowerCase();
      const logB=/^log_([0-9a-zA-Z]+)$/i.exec(tk.v);
      if((FNS.has(low)||logB)&&peek()&&peek().t==="sym"&&peek().v==="("){
        next();
        const inner=parseExpr(!0);
        if(peek()&&peek().t==="sym"&&peek().v===")")next();
        const arg=inner||"\\square";
        if(low==="sqrt")return{tex:`\\sqrt{${arg}}`,grouped:!1};
        if(low==="cbrt")return{tex:`\\sqrt[3]{${arg}}`,grouped:!1};
        if(low==="abs")return{tex:`\\left|${arg}\\right|`,grouped:!1};
        if(low==="exp")return{tex:`e^{${arg}}`,grouped:!1};
        if(logB)return{tex:`\\log_{${logB[1]}}${wrapP(arg)}`,grouped:!1};
        if(["sin","cos","tan","cot","arcsin","arccos","arctan","ln","log","sinh","cosh","tanh"].includes(low)){
          return{tex:`\\${low}${wrapP(arg)}`,grouped:!1};
        }
        const mapName={asin:"arcsin",acos:"arccos",atan:"arctan",lg:"log",sign:"sgn"}[low]||low;
        return{tex:`\\operatorname{${mapName}}${wrapP(arg)}`,grouped:!1};
      }
      // Shorthand live math: sinx -> \sin(x), cos2x -> \cos(2x), lnx -> \ln(x), sqrtx -> \sqrt{x}
      const shM=/^(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|cot|sqrt|cbrt|ln|log)([0-9]*[xy])$/i.exec(tk.v);
      if(shM&&!(/^(sin|cos|tan)$/i.test(shM[1])&&/^h/i.test(shM[2]))){
        const f0=shM[1].toLowerCase(),a0=shM[2];
        if(f0==="sqrt")return{tex:`\\sqrt{${a0}}`,grouped:!1};
        if(f0==="cbrt")return{tex:`\\sqrt[3]{${a0}}`,grouped:!1};
        return{tex:`\\${f0}(${a0})`,grouped:!1};
      }
      if(GREEK[tk.v])return{tex:GREEK[tk.v],grouped:!1};
      if(GREEK[low])return{tex:GREEK[low],grouped:!1};
      return{tex:tk.v,grouped:!1};
    }
    return{tex:"",grouped:!1};
  };
  return parseExpr(!1);
}

function MnMathBox({value,onChange,onFocusInput,onEnter,onEscape,placeholder,bad,autoFocus,useComma,className,ariaLabel}){
  const inpRef=D.useRef(null);
  const [focused,setFocused]=D.useState(!1);
  const [caret,setCaret]=D.useState(()=>String(value??"").length);
  const syncCaret=()=>{
    const el=inpRef.current;
    if(el)setCaret(el.selectionStart??el.value.length);
  };
  D.useEffect(()=>{
    const el=inpRef.current;
    if(!el)return;
    const onCustom=()=>syncCaret();
    el.addEventListener("mng-caret",onCustom);
    return()=>el.removeEventListener("mng-caret",onCustom);
  },[]);
  D.useEffect(()=>{
    if(autoFocus&&inpRef.current){
      const el=inpRef.current;
      el.focus();
      const len=el.value.length;
      try{el.setSelectionRange(len,len)}catch{}
      setCaret(len);
    }
  },[autoFocus]);
  const rawStr=String(value??"");
  const showPh=!rawStr&&!focused&&placeholder;
  const tex=showPh?__mnVisualMathTex(String(placeholder),0,!1,useComma):__mnVisualMathTex(rawStr,caret,focused,useComma);
  let katexHtml="";
  try{
    if(tex&&window.katex&&typeof window.katex.renderToString==="function"){
      katexHtml=window.katex.renderToString(tex,{throwOnError:!1,displayMode:!1});
    }
  }catch{}
  return h.jsxs("div",{
    className:`mng-mbox${focused?" focused":""}${bad?" bad":""}${showPh?" is-ph":""}${className?" "+className:""}`,
    onMouseDown:ev=>{
      if(ev.target!==inpRef.current){
        ev.preventDefault();
        inpRef.current&&inpRef.current.focus();
      }
    },
    children:[
      h.jsx("div",{className:"mng-mbox-view",dangerouslySetInnerHTML:{__html:katexHtml||(showPh?String(placeholder):rawStr)||"&nbsp;"}}),
      h.jsx("input",{
        ref:inpRef,
        className:"mng-mbox-native",
        "aria-label":ariaLabel,
        value:rawStr,
        onFocus:ev=>{
          setFocused(!0);
          onFocusInput&&onFocusInput(ev.target);
          setCaret(ev.target.selectionStart??ev.target.value.length);
        },
        onBlur:()=>setFocused(!1),
        onChange:ev=>{
          onChange(ev.target.value);
          setCaret(ev.target.selectionStart??ev.target.value.length);
        },
        onKeyDown:ev=>{
          const el=ev.target;
          const p0=el.selectionStart??el.value.length;
          if(ev.key==="Enter"){ev.preventDefault();onEnter&&onEnter();return}
          if(ev.key==="Escape"){ev.preventDefault();onEscape&&onEscape();return}
          if(ev.key==="ArrowRight"&&el.value.slice(p0,p0+3)===")/("){
            ev.preventDefault();
            try{el.setSelectionRange(p0+3,p0+3)}catch{}
            setCaret(p0+3);return;
          }
          if(ev.key==="ArrowLeft"&&p0>=3&&el.value.slice(p0-3,p0)===")/("){
            ev.preventDefault();
            try{el.setSelectionRange(p0-3,p0-3)}catch{}
            setCaret(p0-3);return;
          }
          requestAnimationFrame(syncCaret);
        },
        onKeyUp:syncCaret,
        onClick:syncCaret,
        onSelect:syncCaret
      })
    ]
  });
}

function __aoeTemplate({item:e,isNew:t,dark:n,box:o,onBox:s,onSave:i,onClose:r}){
  const a=tt();
  const isVi=a.graphTitle==="Đồ thị hàm số";
  const [l,c]=D.useState({...e,points:e.points??[],ineqs:e.ineqs??[],...t?{equal:e.equal!==void 0?e.equal:!0,grid:!0}:{}});
  const [u,p]=D.useState({xmin:String(e.xmin),xmax:String(e.xmax),ymin:String(e.ymin),ymax:String(e.ymax)});
  const [d,m]=D.useState({stepX:e.stepX?String(e.stepX):"",stepY:e.stepY?String(e.stepY):""});
  const [g,v]=D.useState("");
  const [rail,setRail]=D.useState("algebra"); // algebra | tools | settings
  const [toolSec,setToolSec]=D.useState("points"); // points | region | area | vectors | spin
  const [cmd,setCmd]=D.useState("");
  const [cmdErr,setCmdErr]=D.useState("");
  const [editKey,setEditKey]=D.useState(null); // null | "fn-0" | "iq-0" | "pt-0"
  const [fnDraft,setFnDraft]=D.useState("");
  const [ctxMenu,setCtxMenu]=D.useState(null); // null | { kind: "fn"|"pt"|"stage", index?: number, x: number, y: number }
  const [propsTarget,setPropsTarget]=D.useState(null); // null | { kind: "fn"|"pt", index: number }
  const [propsTab,setPropsTab]=D.useState("basic"); // basic | style | domain
  const [kbOpen,setKbOpen]=D.useState(!0);
  const [kbTab,setKbTab]=D.useState("123"); // 123 | fx | abc | sym
  const [kbGreek,setKbGreek]=D.useState(!1);
  const [kbShift,setKbShift]=D.useState(!1);
  const [catOpen,setCatOpen]=D.useState(!1);
  const [catGroup,setCatGroup]=D.useState("all");
  const [hoverXY,setHoverXY]=D.useState(null);
  const [hoverTarget,setHoverTarget]=D.useState(null); // null | { kind: "fn"|"pt", index: number, sx: number, sy: number }
  const [rowHover,setRowHover]=D.useState(null); // null | { kind: "fn"|"pt", index: number }
  const [selTarget,setSelTarget]=D.useState(null); // null | { kind: "fn"|"pt", index: number }
  const [isPanning,setIsPanning]=D.useState(!1);
  const [cSize,setCSize]=D.useState({w:640,h:420});
  const w=D.useRef(null);
  const shellRef=D.useRef(null);
  const stageRef=D.useRef(null);
  const cmdRef=D.useRef(null);
  const activeInpRef=D.useRef(null);
  const panRef=D.useRef(null);

  const x=l.points??[];
  const FN_POOL=["f","g","h","p","q","r","s","t"];
  const fnNames=D.useMemo(()=>{
    const explicit=new Set(l.fns.map(fn=>fn.name).filter(Boolean));
    const used=new Set();
    return l.fns.map(fn=>{
      if(fn.name&&!used.has(fn.name)){used.add(fn.name);return fn.name}
      for(const ch of FN_POOL){if(!used.has(ch)&&!explicit.has(ch)){used.add(ch);return ch}}
      for(const ch of FN_POOL){if(!used.has(ch)){used.add(ch);return ch}}
      let k=1;while(used.has(`f_${k}`))k++;
      const nm=`f_${k}`;used.add(nm);return nm;
    });
  },[l.fns]);
  const nextAutoFnName=D.useMemo(()=>{
    const used=new Set(fnNames);
    for(const ch of FN_POOL){if(!used.has(ch))return ch}
    let k=1;while(used.has(`f_${k}`))k++;
    return`f_${k}`;
  },[fnNames]);
  const renderTex=(tex,fallback)=>{
    if(!tex)return null;
    try{
      if(window.katex&&typeof window.katex.renderToString==="function"){
        return h.jsx("span",{className:"mng-tex",dangerouslySetInnerHTML:{__html:window.katex.renderToString(tex,{throwOnError:!1,displayMode:!1})}});
      }
    }catch{}
    return h.jsx("span",{className:"mng-tex-fb",children:fallback??tex});
  };
  const exprToTex=raw=>{
    const s0=String(raw??"").trim();
    if(!s0)return"";
    const tVis=__mnVisualMathTex(__mnNormShorthand(s0),0,!1,!!l.comma);
    if(tVis)return tVis;
    const t0=Yr(s0,!!l.comma);
    if(t0)return t0;
    return s0.replace(/\*/g,"\\cdot ").replace(/pi/gi,"\\pi ");
  };
  const [S,j]=D.useState(!t&&!e.fns.some(le=>Sl(le.expr).trim()));
  const T=le=>Number(String(le??"").replace(",","."));
  const C=T(u.xmax)>T(u.xmin)&&T(u.ymax)>T(u.ymin)&&Object.values(u).every(le=>le.trim()!==""&&Number.isFinite(T(le)));
  const _=le=>{const fe=Lr(String(le??"").replace(",","."));return fe>0?fe:void 0};
  const E=le=>le.trim()!==""&&!_(le);
  const P={...l,stepX:_(d.stepX),stepY:_(d.stepY)};
  const L=C?{...P,xmin:T(u.xmin),xmax:T(u.xmax),ymin:T(u.ymin),ymax:T(u.ymax)}:P;
  const O=l.equal&&C?JQ(L):L;
  if(typeof window!=="undefined"){
    window.__mnGraphKernel={evalFn:$i,verticalX:Gd,isImplicit:$r,asymptotes:SJ,evalNum:Lr,evalPt:$2,getLim:zF,parseIneq:DS,formatNum:U$,toComma:OF,exprTex:Yr};
  }
  const G=l.fns.map(le=>{if(!Sl(le.expr).trim())return"";const fe=$i(le.expr);return fe instanceof Uo?a.parse[fe.code](fe.text):fe instanceof Error?fe.message:""});
  const Z=l.fns.map((le,fe)=>!!Sl(le.expr).trim()&&!G[fe]);
  const X=l.ineqs??[];
  const z=X.map(le=>{if(!le.expr.trim())return"";const fe=DS(le.expr);return fe instanceof Uo?a.parse[fe.code](fe.text):fe instanceof Error?fe.message:""});
  const $=(le,fe)=>c({...l,ineqs:X.map((Le,Ue)=>Ue===le?{...Le,...fe}:Le)});
  const B=Ha(l),F=B[0];
  const K=le=>c(Ag(l,le));
  const H=(le,fe)=>K(B.map((Le,Ue)=>Ue===le?{...Le,...fe}:Le));
  const R=le=>K(B.map(fe=>({...fe,...le})));
  const q=le=>K(B.map(({view:fe,...Le})=>le?{...Le,view:le}:Le));
  const U=D.useRef(0);
  const [Y,ee]=D.useState(!1);
  const ce=D.useRef(null);
  D.useEffect(()=>()=>cancelAnimationFrame(U.current),[]);

  // Track responsive coordinate plane dimensions with exact CSS pixel precision (zero bilinear blur!)
  D.useEffect(()=>{
    const el=stageRef.current;
    if(!el)return;
    const upd=()=>{
      const r=el.getBoundingClientRect();
      const nw=Math.max(260,Math.round(r.width)),nh=Math.max(220,Math.round(r.height));
      setCSize(prev=>Math.abs(prev.w-nw)>=1||Math.abs(prev.h-nh)>=1?{w:nw,h:nh}:prev);
    };
    upd();
    let ro=null;
    if(typeof ResizeObserver!=="undefined"){ro=new ResizeObserver(upd);ro.observe(el)}
    window.addEventListener("resize",upd);
    return()=>{ro&&ro.disconnect(),window.removeEventListener("resize",upd)};
  },[kbOpen,!!propsTarget]);

  const he=()=>{
    if(!F)return;
    cancelAnimationFrame(U.current);
    const le=performance.now();
    const fe=Le=>{
      const Ue=Math.min(1,(Le-le)/yH);
      c(ue=>Ag(ue,Ha(ue).map(Se=>({...Se,angle:Math.round(360*Ue)}))));
      Ue<1&&(U.current=requestAnimationFrame(fe));
    };
    U.current=requestAnimationFrame(fe);
  };
  const [,Q]=D.useState(0);
  D.useEffect(()=>{const le=zb(()=>Q(fe=>fe+1));return()=>void le()},[]);

  // High-DPI (2x–3x Retina supersampled) live coordinate plane render + interactive glow highlight!
  const renderW=cSize.w,renderH=cSize.h;
  const viewBoxO=D.useMemo(()=>{
    if(!C)return{...O,w:renderW,h:renderH};
    const x0=T(u.xmin),x1=T(u.xmax),y0=T(u.ymin),y1=T(u.ymax);
    if(l.equal){
      const xSpan=x1-x0,yMid=(y0+y1)/2,ySpan=xSpan*(renderH/Math.max(1,renderW));
      return{...L,xmin:x0,xmax:x1,ymin:yMid-ySpan/2,ymax:yMid+ySpan/2,w:renderW,h:renderH};
    }
    return{...L,xmin:x0,xmax:x1,ymin:y0,ymax:y1,w:renderW,h:renderH};
  },[O,L,C,u.xmin,u.xmax,u.ymin,u.ymax,l.equal,renderW,renderH]);

  D.useEffect(()=>{
    const le=w.current;
    if(!le)return;
    const dpr=Math.max(2,Math.ceil((window.devicePixelRatio||1)*1.5));
    const pw=Math.round(renderW*dpr),ph=Math.round(renderH*dpr);
    if(le.width!==pw||le.height!==ph){le.width=pw,le.height=ph}
    const ctx=le.getContext("2d");
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,pw,ph);
    ctx.imageSmoothingEnabled=!0;
    ctx.imageSmoothingQuality="high";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    t9(ctx,{...viewBoxO,x:0,y:0});

    // Draw crisp live hover / selection / propsTarget visual glow right over the target curve or point!
    const drawTargets=[];
    const pushUniq=(tg,strong)=>{
      if(!tg)return;
      if(!drawTargets.some(d0=>d0.kind===tg.kind&&d0.index===tg.index))drawTargets.push({...tg,strong});
    };
    pushUniq(hoverTarget,!0);
    pushUniq(rowHover,!0);
    pushUniq(propsTarget,!1);
    pushUniq(selTarget,!1);
    if(drawTargets.length&&C&&viewBoxO.xmax>viewBoxO.xmin&&viewBoxO.ymax>viewBoxO.ymin){
      const x0=viewBoxO.xmin,x1=viewBoxO.xmax,y0=viewBoxO.ymin,y1=viewBoxO.ymax;
      const toPx=gx=>(gx-x0)/(x1-x0)*renderW;
      const toPy=gy=>renderH-(gy-y0)/(y1-y0)*renderH;
      const yClamp=(y1-y0)*1.6;
      for(const tg of drawTargets){
        if(tg.kind==="fn"&&l.fns[tg.index]&&!l.fns[tg.index].hidden){
          const fnObj=l.fns[tg.index];
          const col=fnObj.color||"#2563eb";
          const baseW=(fnObj.width??(l.plain?1.8:2.6))*(l.lineScale??1);
          const vx=Gd(fnObj.expr);
          ctx.save();
          ctx.beginPath();ctx.rect(0,0,renderW,renderH);ctx.clip();
          if(fnObj.lim){
            const lm=zF(fnObj);
            const lx0=Math.max(0,toPx(lm.xmin)),ly0=Math.max(0,toPy(lm.ymax));
            ctx.beginPath();
            ctx.rect(lx0,ly0,Math.max(0,Math.min(renderW,toPx(lm.xmax))-lx0),Math.max(0,Math.min(renderH,toPy(lm.ymin))-ly0));
            ctx.clip();
          }
          const strokeCurve=(lw,alpha)=>{
            ctx.save();
            ctx.strokeStyle=col;
            ctx.globalAlpha=alpha;
            ctx.lineWidth=lw;
            ctx.lineCap="round";
            ctx.lineJoin="round";
            if(vx!==null){
              const px=toPx(vx);
              ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,renderH);ctx.stroke();
            }else if(!$r(fnObj.expr)){
              const ev=$i(fnObj.expr);
              if(!(ev instanceof Error)&&typeof ev==="function"){
                const steps=Math.ceil(renderW*1.5);
                ctx.beginPath();
                let penDown=!1,prevY=NaN;
                for(let k=0;k<=steps;k++){
                  const gx=x0+(x1-x0)*k/steps,gy=ev(gx);
                  if(!Number.isFinite(gy)||(penDown&&Math.abs(gy-prevY)>yClamp)){penDown=!1;prevY=gy;continue}
                  const py=Math.min(Math.max(toPy(gy),-renderH),renderH*2);
                  penDown?ctx.lineTo(toPx(gx),py):ctx.moveTo(toPx(gx),py);
                  penDown=!0;prevY=gy;
                }
                ctx.stroke();
              }
            }
            ctx.restore();
          };
          strokeCurve(baseW+(tg.strong?9.5:6.5),tg.strong?0.26:0.16);
          strokeCurve(baseW+(tg.strong?1.1:0.5),tg.strong?0.98:0.85);
          ctx.restore();
        }else if(tg.kind==="pt"&&x[tg.index]&&!x[tg.index].hidden){
          const ptObj=x[tg.index];
          const atPt=$2(viewBoxO,ptObj);
          if(atPt){
            const px=toPx(atPt.x),py=toPy(atPt.y);
            const col=ptObj.color||(ptObj.fn>=0?((l.fns[ptObj.fn]||{}).color||"#2563eb"):"#0f172a");
            ctx.save();
            ctx.beginPath();ctx.arc(px,py,tg.strong?13:10,0,Math.PI*2);
            ctx.fillStyle=col;ctx.globalAlpha=tg.strong?0.24:0.16;ctx.fill();
            ctx.beginPath();ctx.arc(px,py,tg.strong?8.5:7.5,0,Math.PI*2);
            ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.globalAlpha=0.95;ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
  });

  const be=(le,fe)=>c({...l,fns:l.fns.map((Le,Ue)=>Ue===le?{...Le,...fe}:Le)});
  const Ee=(le,fe)=>be(le,{lim:{...JL,...l.fns[le].lim,...fe}});
  const Ae=le=>le.trim()!==""&&!Number.isFinite(s2(le,NaN));
  const ye=l.vectors??[];
  const He=(le,fe)=>c({...l,vectors:ye.map((Le,Ue)=>Ue===le?{...Le,...fe}:Le)});
  const qe=(le,fe)=>c({...l,points:x.map((Le,Ue)=>Ue===le?{...Le,...fe}:Le)});
  const rt=le=>{const fe=GQ(x.map(Le=>Le.label),le.length);c(prev=>({...prev,points:[...(prev.points??[]),...le.map((Le,Ue)=>({...Le,label:Le.label||fe[Ue]}))]}))};
  const ie=le=>{
    const fe=VQ(O,le).filter(Le=>{
      const Ue=$2(O,Le);
      return!x.some(ue=>{const Se=$2(O,ue);return Ue&&Se&&Math.abs(Ue.x-Se.x)<1e-6&&Math.abs(Ue.y-Se.y)<1e-6});
    });
    v(fe.length?"":a.noNewPoints);
    fe.length&&rt(fe);
    return fe.length;
  };
  const _e=le=>String(Math.round(le*100)/100);
  const ve=le=>{
    const fe=eJ(le,l.w,l.equal?l.w*.75:l.h);
    if(!fe){p({xmin:"-8",xmax:"8",ymin:"-6",ymax:"6"});return}
    p({xmin:_e(fe.xmin),xmax:_e(fe.xmax),ymin:_e(fe.ymin),ymax:_e(fe.ymax)});
    const Le=(Ue,ue)=>!!_(Ue)&&ue/_(Ue)>14;
    (Le(d.stepX,fe.xmax-fe.xmin)||Le(d.stepY,fe.ymax-fe.ymin))&&m({stepX:Le(d.stepX,fe.xmax-fe.xmin)?"":d.stepX,stepY:Le(d.stepY,fe.ymax-fe.ymin)?"":d.stepY});
  };
  const $e=l.fns.map(le=>le.expr).join("\n");
  D.useEffect(()=>{S&&ve(l.fns)},[$e,S]);

  // Smooth zoom helper for wheel & +/- floating buttons
  const zoomView=(factor,cxRatio=0.5,cyRatio=0.5)=>{
    if(!C)return;
    j(!1);
    const x0=T(u.xmin),x1=T(u.xmax),y0=T(u.ymin),y1=T(u.ymax);
    const rx=x0+(x1-x0)*cxRatio,ry=y1-(y1-y0)*cyRatio;
    const nx0=rx-(rx-x0)*factor,nx1=rx+(x1-rx)*factor;
    const ny0=ry-(ry-y0)*factor,ny1=ry+(y1-ry)*factor;
    if(nx1-nx0<0.05||nx1-nx0>20000)return;
    p({xmin:_e(nx0),xmax:_e(nx1),ymin:_e(ny0),ymax:_e(ny1)});
  };

  // Detect live command type badge as user types in "+ Nhập lệnh..."
  const detectCmdKind=raw=>{
    const s0=raw.trim();
    if(!s0)return"";
    if(/^(giaoox|nghiem|root|giaooy|yint|cuctri|extremum|giaodiem|intersect)\b/i.test(s0))return isVi?"Lệnh điểm":"Command";
    if(/^(tichphan|dientich|integral|∫)\s*\(/i.test(s0))return isVi?"Diện tích":"Integral";
    if(/^(tronxoay|spin)\s*\(/i.test(s0))return isVi?"Tròn xoay":"Solid";
    if(/^(vecto|vector)\s*\(/i.test(s0))return isVi?"Vectơ":"Vector";
    if(/[<>≤≥]/.test(s0))return isVi?"Miền nghiệm":"Inequality";
    const ptM=/^(?:([A-Za-z][A-Za-z0-9']*)\s*=?\s*)?\(\s*([^;()]+)\s*;\s*([^;()]+)\s*\)$/.exec(s0)||/^([A-Za-z][A-Za-z0-9']*)\s*=?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)$/.exec(s0);
    if(ptM&&!/\bx\b/i.test(ptM[2])&&!/\bx\b/i.test(ptM[3])){
      const nm=ptM[1]||"";
      if(nm&&/^[a-z]/.test(nm)&&ooe.includes(nm))return isVi?"Vectơ":"Vector";
      return isVi?"Điểm":"Point";
    }
    return isVi?"Hàm số":"Function";
  };

  // Unified GeoGebra-style Command Parser & Dispatcher ("Lấy phương thức nhập dữ liệu đầu vào")
  const runUnifiedCmd=rawInput=>{
    const raw=String(rawInput??cmd).trim();
    if(!raw)return;
    setCmdErr("");
    const norm=__mnNormShorthand(raw);

    // 1. Special point commands: GiaoOx, GiaoOy, CucTri, GiaoDiem
    if(/^(giaoox|nghiem|root)(\s*\(.*\))?$/i.test(norm)){
      const cnt=ie("root");
      if(!cnt)setCmdErr(isVi?"Không tìm thấy giao điểm Ox mới trong khung nhìn.":"No new x-intercepts in view.");
      setCmd("");return;
    }
    if(/^(giaooy|yint)(\s*\(.*\))?$/i.test(norm)){
      const cnt=ie("yint");
      if(!cnt)setCmdErr(isVi?"Không tìm thấy giao điểm Oy mới.":"No new y-intercepts.");
      setCmd("");return;
    }
    if(/^(cuctri|extremum)(\s*\(.*\))?$/i.test(norm)){
      const cnt=ie("extremum");
      if(!cnt)setCmdErr(isVi?"Không tìm thấy điểm cực trị mới trong khung nhìn.":"No new extrema in view.");
      setCmd("");return;
    }
    if(/^(giaodiem|intersect)(\s*\(.*\))?$/i.test(norm)){
      const cnt=ie("cross");
      if(!cnt)setCmdErr(isVi?"Cần ít nhất 2 đồ thị cắt nhau trong khung nhìn.":"Need 2 intersecting curves in view.");
      setCmd("");return;
    }

    // 2. Integral / Area command: TichPhan(a; b) or TichPhan(expr; a; b) or Integral(f1, a, b)
    const intM=/^(?:tichphan|dientich|integral|∫)\s*\((.*)\)$/i.exec(norm);
    if(intM){
      const parts=intM[1].split(/[;,]/).map(z0=>z0.trim()).filter(Boolean);
      if(parts.length===2&&l.fns.length>0){
        c(prev=>({...prev,areas:[...(prev.areas??[]),{fn:0,a:parts[0],b:parts[1]}]}));
        setCmd("");return;
      }
      if(parts.length>=3){
        const fnToken=parts[0],a0=parts[1],b0=parts[2];
        const byNameIdx=fnNames.findIndex(nm=>nm.toLowerCase()===fnToken.replace(/\(x\)$/i,"").toLowerCase());
        if(byNameIdx>=0){
          c(prev=>({...prev,areas:[...(prev.areas??[]),{fn:byNameIdx,a:a0,b:b0}]}));
          setCmd("");return;
        }
        const fIdxM=/^[fgh](\d+)$/i.exec(fnToken);
        if(fIdxM&&l.fns[Number(fIdxM[1])-1]){
          c(prev=>({...prev,areas:[...(prev.areas??[]),{fn:Number(fIdxM[1])-1,a:a0,b:b0}]}));
          setCmd("");return;
        }
        const testFn=$i(fnToken);
        if(!(testFn instanceof Error)){
          c(prev=>{
            const idxNew=prev.fns.length;
            return{...prev,fns:[...prev.fns,{expr:fnToken,color:pm[idxNew%pm.length]}],areas:[...(prev.areas??[]),{fn:idxNew,a:a0,b:b0}]};
          });
          setCmd("");return;
        }
      }
      setCmdErr(isVi?"Cú pháp: TichPhan(a; b) hoặc TichPhan(x^2; 0; 2)":"Syntax: Integral(a; b) or Integral(x^2; 0; 2)");
      return;
    }

    // 3. Solid of revolution command: TronXoay(a; b) or Spin(a; b)
    const spM=/^(?:tronxoay|spin)\s*\((.*)\)$/i.exec(norm);
    if(spM){
      const parts=spM[1].split(/[;,]/).map(z0=>z0.trim()).filter(Boolean);
      if(parts.length>=2&&l.fns.length>0){
        const a0=parts[parts.length-2],b0=parts[parts.length-1];
        K([...B,{fn:0,a:a0,b:b0,axis:(F==null?void 0:F.axis)??"x",angle:360,...F!=null&&F.view?{view:F.view}:{}}]);
        setCmd("");return;
      }
      setCmdErr(isVi?"Cú pháp: TronXoay(0; 2)":"Syntax: Spin(0; 2)");
      return;
    }

    // 4. Vector command: vecto((x1;y1); (x2;y2)) or vecto(x1;y1; x2;y2)
    const vecM=/^(?:([a-z][a-z0-9']*)\s*=\s*)?(?:vecto|vector)\s*\((.*)\)$/i.exec(norm);
    if(vecM){
      const vLbl=vecM[1]||ooe.find(fe=>!ye.some(Le=>Le.label===fe))||"u";
      const ptsMatches=[...vecM[2].matchAll(/\(\s*([^()]+)\s*\)/g)];
      let fromS="0; 0",toS="2; 1";
      if(ptsMatches.length>=2){fromS=ptsMatches[0][1].replace(",",";");toS=ptsMatches[1][1].replace(",",";")}
      else{
        const nums=vecM[2].split(/[;,]/).map(z0=>z0.trim()).filter(Boolean);
        if(nums.length===2){fromS="0; 0";toS=nums[0]+"; "+nums[1]}
        else if(nums.length>=4){fromS=nums[0]+"; "+nums[1];toS=nums[2]+"; "+nums[3]}
      }
      c(prev=>({...prev,vectors:[...(prev.vectors??[]),{from:fromS,to:toS,label:vLbl,color:pm[(prev.fns.length+(prev.vectors??[]).length)%pm.length]}]}));
      setCmd("");return;
    }

    // 5. Inequality / Miền nghiệm
    if(/[<>]/.test(norm)){
      const chk=DS(norm);
      if(chk instanceof Uo){setCmdErr(a.parse[chk.code](chk.text));return}
      if(chk instanceof Error){setCmdErr(chk.message);return}
      c(prev=>({...prev,ineqs:[...(prev.ineqs??[]),{expr:norm,color:pm[(prev.fns.length+(prev.ineqs??[]).length)%pm.length]}]}));
      setCmd("");return;
    }

    // 6. Coordinate Point or Vector: A = (1; 2), A=(sqrt(2); 3/2), (2; -1), A(1, 2), u = (2; 3)
    const ptM=/^(?:([A-Za-z][A-Za-z0-9']*)\s*=?\s*)?\(\s*([^;]+)\s*;\s*([^;]+)\s*\)$/.exec(norm)||/^([A-Za-z][A-Za-z0-9']*)\s*=?\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*\)$/.exec(norm);
    if(ptM&&!/\bx\b/i.test(ptM[2])&&!/\bx\b/i.test(ptM[3])){
      const nm=ptM[1]||"",pxS=ptM[2].trim(),pyS=ptM[3].trim();
      const xv=Lr(pxS.replace(",",".")),yv=Lr(pyS.replace(",","."));
      if(Number.isFinite(xv)&&Number.isFinite(yv)){
        if(nm&&/^[a-z]/.test(nm)&&ooe.includes(nm)){
          c(prev=>({...prev,vectors:[...(prev.vectors??[]),{from:"0; 0",to:pxS+"; "+pyS,label:nm,color:pm[(prev.fns.length+(prev.vectors??[]).length)%pm.length]}]}));
        }else{
          rt([{label:nm,x:pxS,y:pyS,fn:-1,guides:!0,coords:!0}]);
        }
        setCmd("");return;
      }
    }

    // 7. Standard Function / Curve / Vertical line / Implicit equation (auto-name f, g, h, p... or respect explicit name)
    const explicitNmM=/^([a-zA-Z][a-zA-Z0-9_]?)\s*\(\s*x\s*\)\s*=\s*/.exec(norm);
    const customName=explicitNmM?explicitNmM[1]:void 0;
    let fnExpr=norm.replace(/^[a-zA-Z][a-zA-Z0-9_]?\s*\(\s*x\s*\)\s*=\s*/,"").replace(/^y\s*=\s*/i,"");
    const chkFn=$i(fnExpr);
    if(chkFn instanceof Uo){setCmdErr(a.parse[chkFn.code](chkFn.text));return}
    if(chkFn instanceof Error){setCmdErr(chkFn.message);return}
    c(prev=>{
      const hasOnlyEmpty=prev.fns.length===1&&!Sl(prev.fns[0].expr).trim();
      if(hasOnlyEmpty)return{...prev,fns:[{...prev.fns[0],expr:fnExpr,...customName?{name:customName}:{}}]};
      return{...prev,fns:[...prev.fns,{expr:fnExpr,...customName?{name:customName}:{},color:pickNextColor(prev.fns)}]};
    });
    setCmd("");
  };

  // Virtual Math Keyboard insertion into active input (or unified command bar)
  const setControlledInput=(el,nextVal,nextPos)=>{
    const prevVal=el.value;
    const proto=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value");
    if(proto&&proto.set)proto.set.call(el,nextVal);else el.value=nextVal;
    if(el._valueTracker)el._valueTracker.setValue(prevVal);
    el.dispatchEvent(new Event("input",{bubbles:!0}));
    el.focus();
    try{el.setSelectionRange(nextPos,nextPos)}catch{}
    el.dispatchEvent(new Event("mng-caret"));
  };

  const insertAtActive=(tok,backOffset=0)=>{
    const el=activeInpRef.current&&document.body.contains(activeInpRef.current)?activeInpRef.current:cmdRef.current;
    if(!el)return;
    const s0=el.selectionStart??el.value.length,e0=el.selectionEnd??el.value.length;
    const nextVal=el.value.slice(0,s0)+tok+el.value.slice(e0);
    const nextPos=s0+tok.length-backOffset;
    setControlledInput(el,nextVal,nextPos);
  };

  const kbBackspace=()=>{
    const el=activeInpRef.current&&document.body.contains(activeInpRef.current)?activeInpRef.current:cmdRef.current;
    if(!el)return;
    const val=el.value,s0=el.selectionStart??val.length,e0=el.selectionEnd??val.length;
    let nextVal=val,nextPos=s0;
    if(s0!==e0){nextVal=val.slice(0,s0)+val.slice(e0);nextPos=s0}
    else if(s0>0){
      const mFn=/(?:arcsin|arccos|arctan|sqrt|cbrt|sin|cos|tan|abs|log|ln|exp|sgn|trunc|round)\($/i.exec(val.slice(0,s0));
      const cut=mFn?mFn[0].length:1;
      nextVal=val.slice(0,s0-cut)+val.slice(e0);
      nextPos=s0-cut;
    }
    setControlledInput(el,nextVal,nextPos);
  };

  const kbMove=dir=>{
    const el=activeInpRef.current&&document.body.contains(activeInpRef.current)?activeInpRef.current:cmdRef.current;
    if(!el)return;
    const cur=el.selectionStart??el.value.length;
    let np=Math.max(0,Math.min(el.value.length,cur+dir));
    if(dir>0&&el.value.slice(cur,cur+3)===")/(")np=cur+3;
    else if(dir<0&&cur>=3&&el.value.slice(cur-3,cur)===")/(")np=cur-3;
    el.focus();
    try{el.setSelectionRange(np,np)}catch{}
    el.dispatchEvent(new Event("mng-caret"));
  };

  const kbEnter=()=>{
    const el=activeInpRef.current&&document.body.contains(activeInpRef.current)?activeInpRef.current:cmdRef.current;
    if(el===cmdRef.current||!el){runUnifiedCmd(cmd)}
    else{setEditKey(null);el.blur()}
  };

  const at=()=>{
    var Ue,ue;
    let le={...O,fns:[...O.fns],points:[...(O.points??[])],ineqs:[...X],vectors:[...ye]};
    // If user typed a valid expression in "+ Nhập lệnh..." and clicked Xong directly, commit it cleanly!
    const pending=__mnNormShorthand(cmd.trim());
    if(pending){
      const ptM=/^(?:([A-Za-z][A-Za-z0-9']*)\s*=?\s*)?\(\s*([^;()]+)\s*;\s*([^;()]+)\s*\)$/.exec(pending)||/^([A-Za-z][A-Za-z0-9']*)\s*=?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)$/.exec(pending);
      if(/[<>]/.test(pending)&&!(DS(pending) instanceof Error)){
        le.ineqs=[...le.ineqs,{expr:pending,color:pm[(le.fns.length+le.ineqs.length)%pm.length]}];
      }else if(ptM&&!/\bx\b/i.test(ptM[2])&&!/\bx\b/i.test(ptM[3])&&Number.isFinite(Lr(ptM[2].trim().replace(",",".")))&&Number.isFinite(Lr(ptM[3].trim().replace(",",".")))){
        const nm=ptM[1]||"",pxS=ptM[2].trim(),pyS=ptM[3].trim();
        if(nm&&/^[a-z]/.test(nm)&&ooe.includes(nm)){
          le.vectors=[...le.vectors,{from:"0; 0",to:`${pxS}; ${pyS}`,label:nm,color:pm[(le.fns.length+le.vectors.length)%pm.length]}];
        }else{
          const autoLbl=nm||GQ(le.points.map(p0=>p0.label),1)[0];
          le.points=[...le.points,{label:autoLbl,x:pxS,y:pyS,fn:-1,guides:!0,coords:!0}];
        }
      }else{
        const explicitNmM=/^([a-zA-Z][a-zA-Z0-9_]?)\s*\(\s*x\s*\)\s*=\s*/.exec(pending);
        const customName=explicitNmM?explicitNmM[1]:void 0;
        const fnExpr=pending.replace(/^[a-zA-Z][a-zA-Z0-9_]?\s*\(\s*x\s*\)\s*=\s*/,"").replace(/^y\s*=\s*/i,"");
        if(!($i(fnExpr) instanceof Error)){
          const hasOnlyEmpty=le.fns.length===1&&!Sl(le.fns[0].expr).trim();
          le.fns=hasOnlyEmpty?[{...le.fns[0],expr:fnExpr,...customName?{name:customName}:{}}]:[...le.fns,{expr:fnExpr,...customName?{name:customName}:{},color:pm[le.fns.length%pm.length]}];
        }
      }
    }
    for(let Se=le.fns.length-1;Se>=0;Se--)Sl(le.fns[Se].expr).trim()||(le=QL(le,Se));
    const fe=le.fns.map(({lim:Se,...Be})=>Se&&Object.values(Se).some(Xe=>Xe.trim())?{...Be,lim:Se}:Be);
    const Le=le.vectors.filter(Se=>Se.from.trim()||Se.to.trim());
    i({...le,fns:fe,ineqs:le.ineqs.filter(Se=>Se.expr.trim()),vectors:Le.length?Le:void 0,xName:((Ue=l.xName)==null?void 0:Ue.trim())||void 0,yName:((ue=l.yName)==null?void 0:ue.trim())||void 0});
  };

  // GeoGebra Command & Function Catalog data (matching Image 10!)
  const CATALOG=[
    {g:"fn",cmd:"sqrt(x)",ins:"sqrt()",bo:1,desc:isVi?"Căn bậc hai √x":"Square root"},
    {g:"fn",cmd:"cbrt(x)",ins:"cbrt()",bo:1,desc:isVi?"Căn bậc ba ³√x":"Cube root"},
    {g:"fn",cmd:"abs(x)",ins:"abs()",bo:1,desc:isVi?"Giá trị tuyệt đối |x|":"Absolute value"},
    {g:"fn",cmd:"ln(x)",ins:"ln()",bo:1,desc:isVi?"Logarit tự nhiên":"Natural log"},
    {g:"fn",cmd:"log(x)",ins:"log()",bo:1,desc:isVi?"Logarit cơ số 10":"Log base 10"},
    {g:"fn",cmd:"log_2(x)",ins:"log_2()",bo:1,desc:isVi?"Logarit cơ số bất kỳ":"Log base b"},
    {g:"fn",cmd:"exp(x)",ins:"exp()",bo:1,desc:isVi?"Hàm mũ eˣ":"Exponential"},
    {g:"fn",cmd:"sgn(x)",ins:"sgn()",bo:1,desc:isVi?"Hàm dấu (-1, 0, 1)":"Sign function"},
    {g:"fn",cmd:"floor(x) / ceil(x) / round(x) / trunc(x)",ins:"round()",bo:1,desc:isVi?"Các hàm làm tròn & phần nguyên":"Rounding functions"},
    {g:"trig",cmd:"sin(x) / cos(x) / tan(x) / cot(x)",ins:"sin()",bo:1,desc:isVi?"Hàm lượng giác (radian)":"Trigonometric"},
    {g:"trig",cmd:"arcsin(x) / arccos(x) / arctan(x)",ins:"arcsin()",bo:1,desc:isVi?"Hàm lượng giác ngược":"Inverse trig"},
    {g:"trig",cmd:"sinh(x) / cosh(x) / tanh(x)",ins:"sinh()",bo:1,desc:isVi?"Hàm hypebolic":"Hyperbolic"},
    {g:"pt",cmd:"A = (1; 2)",ins:"A = (1; 2)",bo:0,desc:isVi?"Tạo điểm theo tọa độ (không bấm nhầm trên hình)":"Plot point by coords"},
    {g:"pt",cmd:"GiaoOx",ins:"GiaoOx",bo:0,desc:isVi?"Tự động tìm tất cả giao điểm với trục Ox":"Find all roots"},
    {g:"pt",cmd:"GiaoOy",ins:"GiaoOy",bo:0,desc:isVi?"Tự động tìm giao điểm với trục Oy":"Find y-intercept"},
    {g:"pt",cmd:"CucTri",ins:"CucTri",bo:0,desc:isVi?"Tự động tìm các điểm cực đại, cực tiểu":"Find local extrema"},
    {g:"pt",cmd:"GiaoDiem",ins:"GiaoDiem",bo:0,desc:isVi?"Tìm giao điểm giữa các đồ thị":"Intersect curves"},
    {g:"area",cmd:"y >= x^2 - 2",ins:"y >= x^2 - 2",bo:0,desc:isVi?"Vẽ miền nghiệm bất phương trình":"Inequality region"},
    {g:"area",cmd:"TichPhan(0; 2)",ins:"TichPhan(0; 2)",bo:0,desc:isVi?"Tô diện tích hình phẳng tích phân từ a đến b":"Shaded definite integral"},
    {g:"vec",cmd:"u = (2; 3)",ins:"u = (2; 3)",bo:0,desc:isVi?"Vẽ vectơ u từ gốc tọa độ":"Vector from origin"},
    {g:"vec",cmd:"vecto((1;1); (3;4))",ins:"vecto((0; 0); (2; 3))",bo:0,desc:isVi?"Vẽ vectơ nối 2 điểm bất kỳ":"Vector between 2 points"},
    {g:"vec",cmd:"TronXoay(0; 2)",ins:"TronXoay(0; 2)",bo:0,desc:isVi?"Tạo khối tròn xoay quay quanh Ox/Oy":"Solid of revolution"}
  ];
  const CAT_GROUPS=[
    {id:"all",lbl:isVi?"Tất cả câu lệnh":"All commands"},
    {id:"fn",lbl:isVi?"Hàm số & tính toán":"Functions"},
    {id:"trig",lbl:isVi?"Lượng giác":"Trigonometry"},
    {id:"pt",lbl:isVi?"Điểm & Giao điểm":"Points & Roots"},
    {id:"area",lbl:isVi?"Miền nghiệm & Diện tích":"Regions & Integrals"},
    {id:"vec",lbl:isVi?"Vectơ & Tròn xoay":"Vectors & Solids"}
  ];

  // Keyboard layouts (exact GeoGebra Calculator Suite Tabs 1-4)
  const kbKey=(lbl,act,cls="")=>h.jsx("button",{type:"button",className:`mng-k${cls?" "+cls:""}`,onMouseDown:ev=>ev.preventDefault(),onClick:act,children:lbl},lbl+cls);

  const renderKeyboard=()=>{
    if(!kbOpen)return null;
    const qwerty=[["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["z","x","c","v","b","n","m"]];
    const greek=[["ϕ","ς","ε","ρ","τ","υ","θ","ι","ο","π"],["α","σ","δ","φ","γ","η","ξ","κ","λ"],["ζ","χ","ψ","ω","β","ν","μ"]];
    return h.jsxs("div",{className:"mng-kb",onMouseDown:ev=>{if(ev.target.closest("button"))ev.preventDefault()},children:[
      h.jsxs("div",{className:"mng-kb-head",children:[
        h.jsx("div",{className:"mng-kb-tabs",role:"tablist",children:[
          {id:"123",lbl:"123"},
          {id:"fx",lbl:"f(x)"},
          {id:"abc",lbl:"ABC"},
          {id:"sym",lbl:"#&¬"}
        ].map(tb=>h.jsx("button",{type:"button",role:"tab","aria-selected":kbTab===tb.id,className:`mng-kb-tab${kbTab===tb.id?" on":""}`,onClick:()=>setKbTab(tb.id),children:tb.lbl},tb.id))}),
        h.jsxs("div",{className:"mng-kb-r",children:[
          h.jsx("button",{type:"button",className:`mng-kb-more${catOpen?" on":""}`,title:isVi?"Các hàm & lệnh toán học":"Math functions & commands",onClick:()=>setCatOpen(!catOpen),children:"⋯"}),
          h.jsx("button",{type:"button",className:"mng-kb-close",title:isVi?"Ẩn bàn phím":"Hide keyboard",onClick:()=>{setCatOpen(!1),setKbOpen(!1)},children:"×"})
        ]})
      ]}),
      kbTab==="123"&&h.jsxs("div",{className:"mng-kb-grid-123",children:[
        h.jsxs("div",{className:"mng-kb-block mng-kb-4",children:[
          kbKey("x",()=>insertAtActive("x"),"math"),
          kbKey("y",()=>insertAtActive("y"),"math"),
          kbKey("π",()=>insertAtActive("pi"),"math"),
          kbKey("e",()=>insertAtActive("e"),"math"),
          kbKey("□²",()=>insertAtActive("^2")),
          kbKey("□ⁿ",()=>insertAtActive("^")),
          kbKey("√□",()=>insertAtActive("sqrt()",1)),
          kbKey("|□|",()=>insertAtActive("abs()",1)),
          kbKey("<",()=>insertAtActive(" < ")),
          kbKey(">",()=>insertAtActive(" > ")),
          kbKey("≤",()=>insertAtActive(" <= ")),
          kbKey("≥",()=>insertAtActive(" >= ")),
          kbKey("a/b",()=>insertAtActive("()/()",4)),
          kbKey(";",()=>insertAtActive("; ")),
          kbKey("(",()=>insertAtActive("(",0)),
          kbKey(")",()=>insertAtActive(")",0))
        ]}),
        h.jsxs("div",{className:"mng-kb-block mng-kb-5",children:[
          kbKey("7",()=>insertAtActive("7"),"num"),
          kbKey("8",()=>insertAtActive("8"),"num"),
          kbKey("9",()=>insertAtActive("9"),"num"),
          kbKey("×",()=>insertAtActive("*"),"op"),
          kbKey("÷",()=>insertAtActive("/"),"op"),
          kbKey("4",()=>insertAtActive("4"),"num"),
          kbKey("5",()=>insertAtActive("5"),"num"),
          kbKey("6",()=>insertAtActive("6"),"num"),
          kbKey("+",()=>insertAtActive(" + "),"op"),
          kbKey("−",()=>insertAtActive(" - "),"op"),
          kbKey("1",()=>insertAtActive("1"),"num"),
          kbKey("2",()=>insertAtActive("2"),"num"),
          kbKey("3",()=>insertAtActive("3"),"num"),
          kbKey("=",()=>insertAtActive(" = "),"op"),
          kbKey("⌫",kbBackspace,"del"),
          kbKey("0",()=>insertAtActive("0"),"num"),
          kbKey(".",()=>insertAtActive("."),"num"),
          kbKey("◀",()=>kbMove(-1),"nav"),
          kbKey("▶",()=>kbMove(1),"nav"),
          kbKey("↵",kbEnter,"enter")
        ]})
      ]}),
      kbTab==="fx"&&h.jsxs("div",{className:"mng-kb-grid-fx",children:[
        h.jsxs("div",{className:"mng-kb-block mng-kb-3",children:[
          kbKey("sin",()=>insertAtActive("sin()",1)),
          kbKey("cos",()=>insertAtActive("cos()",1)),
          kbKey("tan",()=>insertAtActive("tan()",1)),
          kbKey("sin⁻¹",()=>insertAtActive("arcsin()",1)),
          kbKey("cos⁻¹",()=>insertAtActive("arccos()",1)),
          kbKey("tan⁻¹",()=>insertAtActive("arctan()",1)),
          kbKey("ln",()=>insertAtActive("ln()",1)),
          kbKey("log₁₀",()=>insertAtActive("log()",1)),
          kbKey("log₂",()=>insertAtActive("log_2()",1)),
          kbKey("eˣ",()=>insertAtActive("exp()",1)),
          kbKey("10ˣ",()=>insertAtActive("10^")),
          kbKey("³√",()=>insertAtActive("cbrt()",1))
        ]}),
        h.jsxs("div",{className:"mng-kb-block mng-kb-4",children:[
          kbKey("cot",()=>insertAtActive("cot()",1)),
          kbKey("abs",()=>insertAtActive("abs()",1)),
          kbKey("sgn",()=>insertAtActive("sgn()",1)),
          kbKey("trunc",()=>insertAtActive("trunc()",1)),
          kbKey("round",()=>insertAtActive("round()",1)),
          kbKey("floor",()=>insertAtActive("floor()",1)),
          kbKey("≤",()=>insertAtActive(" <= ")),
          kbKey("≥",()=>insertAtActive(" >= ")),
          kbKey("∫",()=>insertAtActive("TichPhan(0; 2)"),"cmd"),
          kbKey("Giao Ox",()=>runUnifiedCmd("GiaoOx"),"cmd"),
          kbKey("Cực trị",()=>runUnifiedCmd("CucTri"),"cmd"),
          kbKey("⌫",kbBackspace,"del"),
          kbKey("A=(x;y)",()=>insertAtActive("A = (1; 2)"),"cmd"),
          kbKey("◀",()=>kbMove(-1),"nav"),
          kbKey("▶",()=>kbMove(1),"nav"),
          kbKey("↵",kbEnter,"enter")
        ]})
      ]}),
      kbTab==="abc"&&h.jsxs("div",{className:"mng-kb-abc",children:[
        (kbGreek?greek:qwerty).map((row,ri)=>h.jsxs("div",{className:`mng-kb-abc-row r-${ri}`,children:[
          ri===2&&h.jsx("button",{type:"button",className:`mng-k nav${kbShift?" on":""}`,onClick:()=>setKbShift(!kbShift),children:"⇧"}),
          row.map(ch=>{const out=!kbGreek&&kbShift?ch.toUpperCase():ch;return kbKey(out,()=>insertAtActive(out))}),
          ri===2&&kbKey("⌫",kbBackspace,"del")
        ]},ri)),
        h.jsxs("div",{className:"mng-kb-abc-row r-3",children:[
          h.jsx("button",{type:"button",className:`mng-k nav${kbGreek?" on":""}`,onClick:()=>setKbGreek(!kbGreek),children:kbGreek?"ABC":"αβγ"}),
          kbKey(",",()=>insertAtActive(", ")),
          kbKey(";",()=>insertAtActive("; ")),
          kbKey("(",()=>insertAtActive("(")),
          kbKey(")",()=>insertAtActive(")")),
          h.jsx("button",{type:"button",className:"mng-k space",onClick:()=>insertAtActive(" "),children:"Space"}),
          kbKey("◀",()=>kbMove(-1),"nav"),
          kbKey("▶",()=>kbMove(1),"nav"),
          kbKey("↵",kbEnter,"enter")
        ]})
      ]}),
      kbTab==="sym"&&h.jsxs("div",{className:"mng-kb-sym",children:[
        [["π","pi"],["e","e"],["≤"," <= "],["≥"," >= "],["<"," < "],[">"," > "],["="," = "],["^","^"],["(","("],[")",")"],
         ["[","["],["]","]"],[";","; "],[":",":"],[",",", "],["+"," + "],["−"," - "],["×","*"],["÷","/"],["|","|"],
         ["x²","^2"],["x³","^3"],["√","sqrt()"],["|x|","abs()"],["α","α"],["β","β"],["θ","θ"],["λ","λ"]].map(([lb,tk])=>
          kbKey(lb,()=>insertAtActive(tk,tk.endsWith("()")?1:0))
        ),
        kbKey("⌫",kbBackspace,"del"),
        kbKey("↵",kbEnter,"enter")
      ]})
    ]});
  };

  const totalToolsCount=x.length+ye.length+X.length+(l.areas??[]).length+B.length;
  const cmdBadge=detectCmdKind(cmd);
  const cmdLiveTex=D.useMemo(()=>{
    const raw=cmd.trim();
    if(!raw)return"";
    const norm=__mnNormShorthand(raw);
    if(/^(giaoox|nghiem|root|giaooy|yint|cuctri|extremum|giaodiem|intersect|tichphan|dientich|integral|∫|tronxoay|spin|vecto|vector)\b/i.test(norm))return"";
    if(/[<>]/.test(norm)){return !(DS(norm) instanceof Error)?exprToTex(norm):""}
    const ptM=/^(?:([A-Za-z][A-Za-z0-9']*)\s*=?\s*)?\(\s*([^;()]+)\s*;\s*([^;()]+)\s*\)$/.exec(norm)||/^([A-Za-z][A-Za-z0-9']*)\s*=?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)$/.exec(norm);
    if(ptM&&!/\bx\b/i.test(ptM[2])&&!/\bx\b/i.test(ptM[3])){
      const nm=ptM[1]||GQ(x.map(p0=>p0.label),1)[0];
      return`${nm}\\left(${exprToTex(ptM[2])};\\, ${exprToTex(ptM[3])}\\right)`;
    }
    const nmM=/^([a-zA-Z][a-zA-Z0-9_]?)\s*\(\s*x\s*\)\s*=\s*/.exec(norm);
    const body=norm.replace(/^[a-zA-Z][a-zA-Z0-9_]?\s*\(\s*x\s*\)\s*=\s*/,"").replace(/^y\s*=\s*/i,"");
    if(!body||$i(body) instanceof Error)return"";
    const fnL=nmM?nmM[1]:nextAutoFnName;
    if($r(body)&&!Qr(body))return exprToTex(body);
    return Qr(body)?`x = ${exprToTex(Sl(body))}`:`${fnL}(x) = ${exprToTex(body)}`;
  },[cmd,nextAutoFnName,x,l.comma]);

  // Seamless function row edit helpers (supports renaming f(x)=x^2 -> g(x)=x^2 AND bare shorthand sinx -> f(x)=sin(x))
  const startEditFn=(fe,le,fNm)=>{
    const isImp=$r(le.expr)&&!Qr(le.expr);
    const isX=Qr(le.expr);
    const fullStr=(isImp||isX)?le.expr:(Sl(le.expr).trim()?`${fNm}(x) = ${le.expr}`:"");
    setFnDraft(fullStr);
    setEditKey(`fn-${fe}`);
  };
  const onFnDraftChange=(fe,val)=>{
    setFnDraft(val);
    const trimmed=val.trim();
    if(!trimmed){be(fe,{expr:""});return}
    const norm=__mnNormShorthand(trimmed);
    const nmM=/^([a-zA-Z][a-zA-Z0-9_]?)\s*\(\s*x\s*\)\s*=\s*(.*)$/.exec(norm);
    if(nmM){
      be(fe,{name:nmM[1],expr:nmM[2].trim()});
      return;
    }
    const yM=/^y\s*=\s*(.*)$/i.exec(norm);
    if(yM){
      be(fe,{expr:yM[1].trim()});
      return;
    }
    be(fe,{expr:norm});
  };

  // Close context menu / popups cleanly on outside click or Escape (capture phase so dialog stays open!)
  D.useEffect(()=>{
    const onDown=ev=>{if(ctxMenu&&!ev.target.closest(".mng-ctx"))setCtxMenu(null)};
    const onKey=ev=>{
      if(ev.key!=="Escape")return;
      if(ctxMenu){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();setCtxMenu(null);return}
      if(catOpen){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();setCatOpen(!1);return}
      if(propsTarget){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();setPropsTarget(null);return}
    };
    window.addEventListener("pointerdown",onDown);
    window.addEventListener("keydown",onKey,!0);
    return()=>{window.removeEventListener("pointerdown",onDown),window.removeEventListener("keydown",onKey,!0)};
  },[ctxMenu,catOpen,propsTarget]);

  // Open GeoGebra Context Menu positioned accurately relative to .mng-shell (immune to dialog CSS transform!)
  const openCtxMenu=(ev,info)=>{
    ev.preventDefault();
    ev.stopPropagation();
    const sh=shellRef.current;
    const rc=sh?sh.getBoundingClientRect():{left:0,top:0,width:window.innerWidth,height:window.innerHeight};
    const relX=ev.clientX-rc.left;
    const relY=ev.clientY-rc.top;
    const mx=Math.max(8,Math.min(relX,rc.width-236));
    const my=Math.max(8,Math.min(relY,rc.height-288));
    setCtxMenu({...info,x:mx,y:my});
  };
  const openProps=(kind,index,tab="basic")=>{
    setCtxMenu(null);
    setPropsTab(tab);
    setPropsTarget({kind,index});
  };
  const pickNextColor=existingFns=>{
    const toRgb=hex=>{const m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex||""));return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:null};
    const used=(existingFns||[]).map(f0=>toRgb(f0.color)).filter(Boolean);
    for(const cand of pm){
      const c0=toRgb(cand);
      if(!c0||used.every(u0=>Math.hypot(u0[0]-c0[0],u0[1]-c0[1],u0[2]-c0[2])>88))return cand;
    }
    return pm[(existingFns||[]).length%pm.length];
  };
  const duplicateFn=idx=>{
    const srcFn=l.fns[idx];
    if(!srcFn)return;
    const {name:_drop,...rest}=srcFn;
    c(prev=>({...prev,fns:[...prev.fns,{...rest,color:pickNextColor(prev.fns)}]}));
    setCtxMenu(null);
  };
  const duplicatePt=idx=>{
    const srcPt=x[idx];
    if(!srcPt)return;
    const nx=GQ(x.map(p0=>p0.label),1)[0];
    c(prev=>({...prev,points:[...(prev.points??[]),{...srcPt,label:nx}]}));
    setCtxMenu(null);
  };
  const removeFnAt=idx=>{
    if(l.fns[idx]&&l.fns[idx].locked)return;
    c(QL(l,idx));
    if(propsTarget&&propsTarget.kind==="fn"){
      if(propsTarget.index===idx)setPropsTarget(null);
      else if(propsTarget.index>idx)setPropsTarget({kind:"fn",index:propsTarget.index-1});
    }
    setCtxMenu(null);
  };
  const removePtAt=idx=>{
    if(x[idx]&&x[idx].locked)return;
    c({...l,points:x.filter((ue,Se)=>Se!==idx)});
    if(propsTarget&&propsTarget.kind==="pt"){
      if(propsTarget.index===idx)setPropsTarget(null);
      else if(propsTarget.index>idx)setPropsTarget({kind:"pt",index:propsTarget.index-1});
    }
    setCtxMenu(null);
  };

  // Hit-test plotted points and function curves on right-click on coordinate plane
  const hitTestCanvas=(clientX,clientY)=>{
    const el=w.current;
    if(!el||!C)return{kind:"stage"};
    const rc=el.getBoundingClientRect();
    if(rc.width<=0||rc.height<=0)return{kind:"stage"};
    const sx=clientX-rc.left,sy=clientY-rc.top;
    const x0=viewBoxO.xmin,x1=viewBoxO.xmax,y0=viewBoxO.ymin,y1=viewBoxO.ymax;
    const toPx=gx=>(gx-x0)/(x1-x0)*rc.width;
    const toPy=gy=>rc.height-(gy-y0)/(y1-y0)*rc.height;
    // 1. Check points first (within 16px)
    let bestPt=-1,bestPtD=16;
    x.forEach((pt,pi)=>{
      if(pt.hidden)return;
      const atPt=$2(viewBoxO,pt);
      if(!atPt)return;
      const dist=Math.hypot(toPx(atPt.x)-sx,toPy(atPt.y)-sy);
      if(dist<=bestPtD){bestPtD=dist;bestPt=pi}
    });
    if(bestPt>=0)return{kind:"pt",index:bestPt};
    // 2. Check function curves (within 20px, sampling local neighborhood for steep curves)
    let bestFn=-1,bestFnD=20;
    const dxs=[-12,-6,0,6,12];
    l.fns.forEach((fn,fi)=>{
      if(fn.hidden||!Sl(fn.expr).trim())return;
      const vx=Gd(fn.expr);
      if(vx!==null){
        const dist=Math.abs(toPx(vx)-sx);
        if(dist<bestFnD){bestFnD=dist;bestFn=fi}
        return;
      }
      if($r(fn.expr)){
        const imp=H7(fn.expr);
        if(!(imp instanceof Error)&&typeof imp==="function"){
          const gx0=x0+sx/rc.width*(x1-x0),gy0=y1-sy/rc.height*(y1-y0);
          const epsX=(x1-x0)/rc.width*6,epsY=(y1-y0)/rc.height*6;
          const v0=imp(gx0,gy0),v1=imp(gx0+epsX,gy0),v2=imp(gx0-epsX,gy0),v3=imp(gx0,gy0+epsY),v4=imp(gx0,gy0-epsY);
          const signs=[v0,v1,v2,v3,v4].filter(Number.isFinite);
          if(signs.length&&((Math.min(...signs)<=0&&Math.max(...signs)>=0)||Math.abs(v0)<0.12)){
            if(8<bestFnD){bestFnD=8;bestFn=fi}
          }
        }
        return;
      }
      const ev=$i(fn.expr);
      if(ev instanceof Error||typeof ev!=="function")return;
      for(const dx of dxs){
        const gxTest=x0+(sx+dx)/rc.width*(x1-x0);
        const yv=ev(gxTest);
        if(Number.isFinite(yv)){
          const dist=Math.hypot(dx,toPy(yv)-sy);
          if(dist<bestFnD){bestFnD=dist;bestFn=fi}
        }
      }
    });
    if(bestFn>=0)return{kind:"fn",index:bestFn};
    return{kind:"stage"};
  };
  const SWATCHES=["#2563eb","#dc2626","#059669","#7c3aed","#ea580c","#0891b2","#db2777","#0f172a"];

  // Crisp GeoGebra-inspired inline SVG icons for left rail
  const icoAlg=h.jsxs("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:[
    h.jsx("rect",{x:4,y:3,width:16,height:18,rx:3}),
    h.jsx("line",{x1:8,y1:8,x2:16,y2:8}),
    h.jsx("line",{x1:8,y1:12.5,x2:11,y2:12.5}),
    h.jsx("line",{x1:13.5,y1:12.5,x2:16,y2:12.5}),
    h.jsx("line",{x1:8,y1:16.5,x2:16,y2:16.5})
  ]});
  const icoTools=h.jsxs("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.9,strokeLinecap:"round",strokeLinejoin:"round",children:[
    h.jsx("circle",{cx:14.5,cy:13.5,r:5.5}),
    h.jsx("polygon",{points:"9.5,4.5 3.5,16 15.5,16"})
  ]});
  const icoDisp=h.jsxs("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.9,strokeLinecap:"round",strokeLinejoin:"round",children:[
    h.jsx("line",{x1:4,y1:7,x2:20,y2:7}),
    h.jsx("circle",{cx:9,cy:7,r:2.2,fill:"currentColor"}),
    h.jsx("line",{x1:4,y1:12,x2:20,y2:12}),
    h.jsx("circle",{cx:15,cy:12,r:2.2,fill:"currentColor"}),
    h.jsx("line",{x1:4,y1:17,x2:20,y2:17}),
    h.jsx("circle",{cx:10,cy:17,r:2.2,fill:"currentColor"})
  ]});

  return h.jsxs(un,{title:a.graphTitle,onClose:r,wide:!0,className:"mn-geo-graph-dlg",movable:{box:o,onBox:s},children:[
    h.jsxs("div",{className:"mng-shell",ref:shellRef,children:[
      h.jsxs("div",{className:"mng-main",children:[
        // 1. Left GeoGebra Navigation Rail
        h.jsxs("nav",{className:"mng-rail","aria-label":isVi?"Điều hướng đồ thị":"Graph navigation",children:[
          h.jsxs("button",{type:"button",className:`mng-rail-btn${rail==="algebra"?" on":""}`,onClick:()=>setRail("algebra"),children:[
            h.jsx("span",{className:"mng-rail-ico",children:icoAlg}),
            h.jsx("span",{children:isVi?"Đại số":"Algebra"})
          ]}),
          h.jsxs("button",{type:"button",className:`mng-rail-btn${rail==="tools"?" on":""}`,onClick:()=>setRail("tools"),children:[
            h.jsx("span",{className:"mng-rail-ico",children:icoTools}),
            h.jsx("span",{children:isVi?"Công cụ":"Tools"}),
            totalToolsCount>0&&h.jsx("em",{className:"mng-rail-cnt",children:totalToolsCount})
          ]}),
          h.jsxs("button",{type:"button",className:`mng-rail-btn${rail==="settings"?" on":""}`,onClick:()=>setRail("settings"),children:[
            h.jsx("span",{className:"mng-rail-ico",children:icoDisp}),
            h.jsx("span",{children:isVi?"Hiển thị":"Display"})
          ]})
        ]}),

        // 2. Left Algebra / Tools / Settings Drawer
        h.jsxs("aside",{className:"mng-side",children:[
          rail==="algebra"&&h.jsxs("div",{className:"mng-algebra",children:[
            // Unified GeoGebra "+ Nhập lệnh..." input bar
            h.jsxs("div",{className:"mng-cmd-bar",children:[
              h.jsx("button",{type:"button",className:"mng-cmd-add",title:isVi?"Thêm vào đồ thị (Enter)":"Add to graph (Enter)",onClick:()=>runUnifiedCmd(cmd),children:"+"}),
              h.jsx("input",{
                ref:cmdRef,
                id:"mng-cmd-input",
                className:"mng-cmd-inp",
                value:cmd,
                autoFocus:!0,
                placeholder:isVi?"Nhập lệnh… (VD: x^2-2, A=(1;2))":"Input… (e.g. x^2-2, A=(1;2))",
                onFocus:ev=>{activeInpRef.current=ev.target,setEditKey(null)},
                onChange:ev=>{setCmd(ev.target.value),cmdErr&&setCmdErr("")},
                onKeyDown:ev=>{if(ev.key==="Enter"){ev.preventDefault();runUnifiedCmd(cmd)}}
              }),
              cmdBadge&&h.jsx("span",{className:"mng-cmd-tag",children:cmdBadge})
            ]}),
            cmdLiveTex&&!cmdErr&&h.jsx("div",{className:"mng-cmd-preview",children:renderTex(cmdLiveTex,cmd)}),
            cmdErr&&h.jsx("div",{className:"mng-cmd-err",children:cmdErr}),

            // Live Algebra Items List (Seamless GeoGebra f(x) = x^2 text — right-click or ⋮ for Settings!)
            h.jsxs("div",{className:"mng-alg-list",children:[
              l.fns.map((le,fe)=>{
                const fNm=fnNames[fe]||"f";
                const isImp=$r(le.expr)&&!Qr(le.expr);
                const isX=Qr(le.expr);
                const isEd=editKey===`fn-${fe}`||!Sl(le.expr).trim()||!!G[fe];
                const isSelProps=(propsTarget&&propsTarget.kind==="fn"&&propsTarget.index===fe)||(selTarget&&selTarget.kind==="fn"&&selTarget.index===fe);
                const isHov=hoverTarget&&hoverTarget.kind==="fn"&&hoverTarget.index===fe;
                const fullTex=(isImp||isX)
                  ?(isX?`x = ${exprToTex(Sl(le.expr))}`:exprToTex(le.expr))
                  :`${fNm}(x) = ${exprToTex(le.expr)}`;
                const fullFb=(isImp||isX)?le.expr:`${fNm}(x) = ${le.expr}`;
                const draftVal=editKey===`fn-${fe}`?fnDraft:((isImp||isX)?le.expr:(Sl(le.expr).trim()?`${fNm}(x) = ${le.expr}`:""));
                return h.jsxs("div",{
                  className:`mng-item${G[fe]?" bad":""}${isEd?" editing":""}${isSelProps?" selected":""}${isHov?" is-hover":""}${le.hidden?" is-hidden":""}`,
                  onMouseEnter:()=>setRowHover({kind:"fn",index:fe}),
                  onMouseLeave:()=>setRowHover(null),
                  onContextMenu:ev=>openCtxMenu(ev,{kind:"fn",index:fe}),
                  children:[
                  h.jsxs("div",{className:"mng-item-row",children:[
                    h.jsx("button",{
                      type:"button",
                      className:`mng-vis-dot${le.hidden?" off":""}`,
                      title:le.hidden?(isVi?"Hiện hàm số":"Show function"):(isVi?"Ẩn hàm số":"Hide function"),
                      style:le.hidden?{borderColor:le.color}:{background:le.color,borderColor:le.color},
                      onClick:()=>be(fe,{hidden:le.hidden?void 0:!0})
                    }),
                    isEd&&!le.locked?h.jsx(MnMathBox,{
                      className:"mng-mbox-fn",
                      ariaLabel:`${fNm}(x)`,
                      value:draftVal,
                      bad:!!G[fe],
                      autoFocus:editKey===`fn-${fe}`,
                      useComma:!!l.comma,
                      placeholder:`${fNm}(x) = sin(x)`,
                      onFocusInput:el=>{activeInpRef.current=el;if(editKey!==`fn-${fe}`)startEditFn(fe,le,fNm)},
                      onEnter:()=>setEditKey(null),
                      onEscape:()=>setEditKey(null),
                      onChange:val=>onFnDraftChange(fe,val)
                    }):h.jsx("div",{
                      className:"mng-item-katex mng-fn-katex",
                      role:"button",
                      tabIndex:0,
                      title:le.locked?(isVi?"Đang cố định — chuột phải để mở khóa / thiết lập":"Locked — right-click for settings"):(isVi?"Bấm để sửa · Chuột phải để thiết lập hàm số":"Click to edit · Right-click for settings"),
                      onClick:()=>{if(!le.locked)startEditFn(fe,le,fNm)},
                      onKeyDown:ev=>{if(!le.locked&&(ev.key==="Enter"||ev.key===" ")){ev.preventDefault();startEditFn(fe,le,fNm)}},
                      children:renderTex(fullTex,fullFb)
                    }),
                    isEd&&!le.locked&&!G[fe]&&Sl(le.expr).trim()&&h.jsx("button",{type:"button",className:"mng-act on",title:isVi?"Xong":"Done",onClick:()=>setEditKey(null),children:"✓"}),
                    le.locked&&h.jsx("span",{className:"mng-lock-ico",title:isVi?"Đã cố định":"Locked",children:"🔒"}),
                    h.jsx("button",{
                      type:"button",
                      className:"mng-kebab",
                      title:isVi?"Tùy chọn & Thiết lập hàm số (hoặc Chuột phải)":"Function options & Settings (or Right-click)",
                      onClick:ev=>openCtxMenu(ev,{kind:"fn",index:fe}),
                      children:"⋮"
                    })
                  ]}),
                  G[fe]&&h.jsx("div",{className:"fn-error",children:G[fe]}),
                  le.lim&&h.jsx("div",{className:"mng-lim-row",children:["xmin","xmax","ymin","ymax"].map(Le=>h.jsxs("label",{children:[a.range[Le],h.jsx("input",{className:Ae(le.lim[Le])?"bad":"",value:le.lim[Le],placeholder:Le.endsWith("min")?"−∞":"+∞",onFocus:ev=>{activeInpRef.current=ev.target},onChange:Ue=>Ee(fe,{[Le]:Ue.target.value})})]},Le))})
                ]},`fn-${fe}`);
              }),

              // Inequalities in Algebra list (KaTeX display, click for Live MathBox!)
              X.map((le,fe)=>{
                const isEd=editKey===`iq-${fe}`||!le.expr.trim()||!!z[fe];
                const iqTex=!z[fe]&&le.expr.trim()?exprToTex(le.expr):"";
                return h.jsxs("div",{className:`mng-item${z[fe]?" bad":""}${isEd?" editing":""}`,children:[
                  h.jsxs("div",{className:"mng-item-row",children:[
                    h.jsx("label",{className:"mng-dot-pick sq",title:a.color,style:{background:le.color},children:h.jsx("input",{type:"color",value:le.color,onChange:Le=>$(fe,{color:Le.target.value})})}),
                    h.jsx("span",{className:"mng-kind-pill",children:"▧"}),
                    isEd?h.jsx(MnMathBox,{
                      className:"mng-mbox-fn",
                      value:le.expr,
                      bad:!!z[fe],
                      autoFocus:editKey===`iq-${fe}`,
                      useComma:!!l.comma,
                      placeholder:"y >= x^2",
                      onFocusInput:el=>{activeInpRef.current=el},
                      onEnter:()=>setEditKey(null),
                      onEscape:()=>setEditKey(null),
                      onChange:val=>$(fe,{expr:val})
                    }):h.jsx("div",{
                      className:"mng-item-katex",
                      role:"button",
                      tabIndex:0,
                      onClick:()=>setEditKey(`iq-${fe}`),
                      children:renderTex(iqTex,le.expr)
                    }),
                    h.jsx("button",{type:"button",className:"mng-act del",title:a.removeIneq,onClick:()=>c({...l,ineqs:X.filter((Le,Ue)=>Ue!==fe)}),children:"×"})
                  ]}),
                  z[fe]&&h.jsx("div",{className:"fn-error",children:z[fe]})
                ]},`iq-${fe}`);
              }),

              // Points in Algebra list — Compact A(x; y) KaTeX; click -> Live MathBox; right-click or ⋮ -> Settings!
              x.map((le,fe)=>{
                const Le=$2(O,le);
                const col=le.color||(le.fn>=0?((l.fns[le.fn]||{}).color||"#2563eb"):"#0f172a");
                const isEd=editKey===`pt-${fe}`;
                const isSelProps=(propsTarget&&propsTarget.kind==="pt"&&propsTarget.index===fe)||(selTarget&&selTarget.kind==="pt"&&selTarget.index===fe);
                const isHov=hoverTarget&&hoverTarget.kind==="pt"&&hoverTarget.index===fe;
                const yDisplay=le.fn>=0?(Le?ioe(Go(Le.y)):"0"):(le.y||"0");
                const ptTex=`${le.label||"A"}\\left(${exprToTex(le.x||"0")};\\, ${exprToTex(yDisplay)}\\right)`;
                return h.jsx("div",{
                  className:`mng-item mng-item-pt${isEd?" editing":""}${isSelProps?" selected":""}${isHov?" is-hover":""}${le.hidden?" is-hidden":""}`,
                  onMouseEnter:()=>setRowHover({kind:"pt",index:fe}),
                  onMouseLeave:()=>setRowHover(null),
                  onContextMenu:ev=>openCtxMenu(ev,{kind:"pt",index:fe}),
                  children:h.jsxs("div",{className:"mng-item-row",children:[
                  h.jsx("button",{
                    type:"button",
                    className:`mng-vis-dot${le.hidden?" off":""}`,
                    title:le.hidden?(isVi?"Hiện điểm":"Show point"):(isVi?"Ẩn điểm":"Hide point"),
                    style:le.hidden?{borderColor:col}:{background:col,borderColor:col},
                    onClick:()=>qe(fe,{hidden:le.hidden?void 0:!0})
                  }),
                  isEd?h.jsxs("div",{className:"mng-pt-editor",children:[
                    h.jsx("input",{className:"mng-pt-nm",title:a.pointName,value:le.label,maxLength:6,placeholder:"A",onChange:ue=>qe(fe,{label:ue.target.value})}),
                    h.jsx("span",{className:"mng-pt-paren",children:"("}),
                    h.jsx(MnMathBox,{
                      className:"mng-mbox-pt",
                      ariaLabel:"x",
                      value:le.x,
                      bad:!Number.isFinite(Lr(le.x)),
                      autoFocus:!0,
                      useComma:!!l.comma,
                      placeholder:"0",
                      onFocusInput:el=>{activeInpRef.current=el},
                      onEnter:()=>setEditKey(null),
                      onEscape:()=>setEditKey(null),
                      onChange:val=>qe(fe,{x:val})
                    }),
                    h.jsx("span",{className:"mng-pt-sep",children:";"}),
                    h.jsx(MnMathBox,{
                      className:"mng-mbox-pt",
                      ariaLabel:"y",
                      value:le.fn>=0?"":le.y,
                      bad:le.fn<0&&!Number.isFinite(Lr(le.y)),
                      useComma:!!l.comma,
                      placeholder:le.fn>=0&&Le?ioe(Go(Le.y)):"0",
                      onFocusInput:el=>{activeInpRef.current=el},
                      onEnter:()=>setEditKey(null),
                      onEscape:()=>setEditKey(null),
                      onChange:val=>qe(fe,{y:val,fn:-1})
                    }),
                    h.jsx("span",{className:"mng-pt-paren",children:")"}),
                    h.jsx("button",{type:"button",className:"mng-act on",title:isVi?"Xong":"Done",onClick:()=>setEditKey(null),children:"✓"})
                  ]}):h.jsx("div",{
                    className:"mng-item-katex mng-pt-katex",
                    role:"button",
                    tabIndex:0,
                    title:isVi?"Bấm để sửa tọa độ · Chuột phải để thiết lập điểm":"Click to edit · Right-click for settings",
                    onClick:()=>setEditKey(`pt-${fe}`),
                    onKeyDown:ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();setEditKey(`pt-${fe}`)}},
                    children:renderTex(ptTex,`${le.label||"A"}(${le.x}; ${yDisplay})`)
                  }),
                  h.jsx("button",{
                    type:"button",
                    className:"mng-kebab",
                    title:isVi?"Tùy chọn & Thiết lập điểm (hoặc Chuột phải)":"Point options & Settings",
                    onClick:ev=>openCtxMenu(ev,{kind:"pt",index:fe}),
                    children:"⋮"
                  })
                ]})},`pt-${fe}`);
              }),

              // Vectors summary chips in Algebra list
              ye.map((le,fe)=>h.jsx("div",{className:"mng-item mng-item-mini",children:h.jsxs("div",{className:"mng-item-row",children:[
                h.jsx("span",{className:"mng-dot-static",style:{background:le.color}}),
                h.jsx("span",{className:"mng-mini-txt",onClick:()=>{setRail("tools"),setToolSec("vectors")},children:renderTex(`\\vec{${le.label||"u"}}: (${le.from}) \\to (${le.to})`,`→ ${le.label||"u"}: (${le.from}) → (${le.to})`)}),
                h.jsx("button",{type:"button",className:"mng-act del",onClick:()=>c({...l,vectors:ye.filter((Le,Ue)=>Ue!==fe)}),children:"×"})
              ]})},`vc-${fe}`)),

              // Areas summary chips in Algebra list
              (l.areas??[]).map((le,fe)=>h.jsx("div",{className:"mng-item mng-item-mini",children:h.jsxs("div",{className:"mng-item-row",children:[
                h.jsx("span",{className:"mng-dot-static sq",style:{background:RF(le,fe)}}),
                h.jsx("span",{className:"mng-mini-txt",onClick:()=>{setRail("tools"),setToolSec("area")},children:renderTex(`\\int_{${exprToTex(le.a)}}^{${exprToTex(le.b)}} ${fnNames[le.fn]||"f"}(x)\\,dx`,`∫ ${fnNames[le.fn]||"f"} [${le.a}; ${le.b}]`)}),
                h.jsx("button",{type:"button",className:"mng-act del",onClick:()=>c({...l,areas:(l.areas??[]).filter((Be,Xe)=>Xe!==fe)}),children:"×"})
              ]})},`ar-${fe}`)),

              // Solids of revolution summary chips
              B.map((le,fe)=>h.jsx("div",{className:"mng-item mng-item-mini",children:h.jsxs("div",{className:"mng-item-row",children:[
                h.jsx("span",{className:"mng-dot-static sq",style:{background:Z7(le,fe)}}),
                h.jsx("span",{className:"mng-mini-txt",onClick:()=>{setRail("tools"),setToolSec("spin")},children:`⟲ O${le.axis} · ${fnNames[le.fn]||"f"}(x) [${le.a}; ${le.b}] (${le.angle}°)`}),
                h.jsx("button",{type:"button",className:"mng-act del",onClick:()=>(cancelAnimationFrame(U.current),K(B.filter((Ue,ue)=>ue!==fe))),children:"×"})
              ]})},`sp-${fe}`))
            ]}),

            // Quick chips at bottom of Algebra pane (no canvas click needed!)
            h.jsxs("div",{className:"mng-quick-strip",children:[
              soe.filter(le=>le!=="cross"||Z.filter(Boolean).length>1).map(le=>h.jsx("button",{type:"button",className:"mng-qchip",title:a.quick[le][1],disabled:!C||!Z.some(Boolean),onClick:()=>ie(le),children:a.quick[le][0]},le)),
              h.jsx("button",{type:"button",className:"mng-qchip accent",onClick:()=>setCatOpen(!catOpen),children:isVi?"⋯ Câu lệnh":"⋯ Commands"})
            ]}),
            g&&h.jsx("div",{className:"mng-note",children:g})
          ]}),

          // TOOLS TAB (Points, Region, Integral Area, Vectors, 3D Spin)
          rail==="tools"&&h.jsxs("div",{className:"mng-tools",children:[
            h.jsx("div",{className:"mng-tool-pills",children:[
              {id:"points",lbl:a.graphTabs.points,cnt:x.length},
              {id:"region",lbl:a.graphTabs.region,cnt:X.length},
              {id:"area",lbl:a.graphTabs.area,cnt:(l.areas??[]).length},
              {id:"vectors",lbl:a.graphTabs.vectors,cnt:ye.length},
              {id:"spin",lbl:a.graphTabs.spin,cnt:B.length}
            ].map(tb=>h.jsxs("button",{type:"button",className:`mng-tpill${toolSec===tb.id?" on":""}`,onClick:()=>setToolSec(tb.id),children:[tb.lbl,tb.cnt>0&&h.jsx("b",{children:tb.cnt})]},tb.id))}),

            h.jsxs("div",{className:"mng-tool-body",children:[
              toolSec==="points"&&h.jsxs("div",{className:"mng-tsec",children:[
                h.jsxs("div",{className:"chips",children:[
                  h.jsx("button",{type:"button",className:"chip primary",onClick:()=>rt([{label:"",x:"1",y:"1",fn:-1,guides:!0,coords:!0}]),children:a.addPoint}),
                  soe.filter(le=>le!=="cross"||Z.filter(Boolean).length>1).map(le=>h.jsx("button",{type:"button",className:"chip",title:a.quick[le][1],disabled:!C||!Z.some(Boolean),onClick:()=>ie(le),children:a.quick[le][0]},le))
                ]}),
                x.map((le,fe)=>{
                  var Ue;const Le=$2(O,le);
                  return h.jsxs("div",{className:"pt-card",children:[
                    h.jsxs("div",{className:"pt-main mng-pt-tool-row",children:[
                      h.jsx("span",{className:"pt-dot",style:{background:le.fn>=0?(Ue=l.fns[le.fn])==null?void 0:Ue.color:"#0f172a"}}),
                      h.jsx("input",{className:"mng-pt-nm",title:a.pointName,value:le.label,maxLength:6,placeholder:a.namePlaceholder,onChange:ue=>qe(fe,{label:ue.target.value})}),
                      h.jsx("span",{className:"mng-pt-paren",children:"("}),
                      h.jsx(MnMathBox,{
                        className:"mng-mbox-pt",
                        ariaLabel:"x",
                        value:le.x,
                        bad:!Number.isFinite(Lr(le.x)),
                        useComma:!!l.comma,
                        placeholder:"0",
                        onFocusInput:el=>{activeInpRef.current=el},
                        onChange:val=>qe(fe,{x:val})
                      }),
                      h.jsx("span",{className:"mng-pt-sep",children:";"}),
                      h.jsx(MnMathBox,{
                        className:"mng-mbox-pt",
                        ariaLabel:"y",
                        value:le.fn>=0?"":le.y,
                        bad:le.fn<0&&!Number.isFinite(Lr(le.y)),
                        useComma:!!l.comma,
                        placeholder:le.fn>=0?Le?ioe(Go(Le.y)):"0":"0",
                        onFocusInput:el=>{activeInpRef.current=el},
                        onChange:val=>qe(fe,{y:val,fn:-1})
                      }),
                      h.jsx("span",{className:"mng-pt-paren",children:")"}),
                      h.jsx("button",{type:"button",className:"mng-act del",title:a.removePoint,onClick:()=>c({...l,points:x.filter((ue,Se)=>Se!==fe)}),children:"×"})
                    ]}),
                    h.jsxs("div",{className:"pt-options",children:[
                      h.jsxs("select",{value:le.fn,onChange:ue=>{const Se=Number(ue.target.value);qe(fe,{fn:Se,y:Se<0&&Le?Go(Le.y):le.y})},children:[
                        h.jsx("option",{value:-1,children:a.freePoint}),
                        l.fns.map((ue,Se)=>!$r(ue.expr)&&h.jsxs("option",{value:Se,children:[a.onGraph(Se+1),Sl(ue.expr).trim()?`: ${BJ(ue.expr)}`:""]},Se))
                      ]}),
                      h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:le.guides,onChange:ue=>qe(fe,{guides:ue.target.checked})})," ",a.guides]}),
                      h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!le.hideLabel,onChange:ue=>qe(fe,{hideLabel:ue.target.checked?void 0:!0})})," ",a.showPointName]}),
                      h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:le.coords,onChange:ue=>qe(fe,{coords:ue.target.checked})})," ",a.coords]})
                    ]})
                  ]},fe);
                }),
                g&&h.jsx("p",{className:"help",children:g})
              ]}),

              toolSec==="region"&&h.jsxs("div",{className:"mng-tsec",children:[
                X.map((le,fe)=>h.jsxs("div",{className:"fn-row ineq-row",children:[
                  h.jsx("input",{type:"color",title:a.color,value:le.color,onChange:Le=>$(fe,{color:Le.target.value})}),
                  h.jsx("input",{className:z[fe]?"bad":"",value:le.expr,placeholder:a.ineqPlaceholder,onFocus:ev=>{activeInpRef.current=ev.target},onChange:Le=>$(fe,{expr:Le.target.value})}),
                  h.jsx("button",{type:"button",className:"icon-button",title:a.removeIneq,onClick:()=>c({...l,ineqs:X.filter((Le,Ue)=>Ue!==fe)}),children:"×"}),
                  z[fe]&&h.jsx("div",{className:"fn-error",children:z[fe]})
                ]},fe)),
                h.jsx("button",{type:"button",className:"link",onClick:()=>c({...l,ineqs:[...X,{expr:"",color:pm[(l.fns.length+X.length)%pm.length]}]}),children:a.addIneq}),
                X.length>1&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.ineqPoints,onChange:le=>c({...l,ineqPoints:le.target.checked||void 0})})," ",a.ineqPoints]})
              ]}),

              toolSec==="area"&&h.jsxs("div",{className:"mng-tsec",children:[
                (l.areas??[]).map((le,fe)=>{
                  const Le=l.areas??[];
                  const Ue=Be=>{const Xe=PM(l,Be.fn,Be.fn2);return Xe?{...Be,a:Xe[0],b:Xe[1]}:Be};
                  const ue=Be=>c({...l,areas:Le.map((Xe,At)=>At===fe?{...Xe,...Be}:Xe)});
                  const Se=PM(l,le.fn,le.fn2);
                  return h.jsxs("div",{className:"spin-card",children:[
                    h.jsxs("label",{children:[h.jsx("input",{type:"color",title:a.color,value:RF(le,fe),onChange:Be=>ue({color:Be.target.value})}),a.areaFn,h.jsx("select",{value:le.fn,onChange:Be=>c({...l,areas:Le.map((Xe,At)=>At===fe?Ue({...Xe,fn:Number(Be.target.value)}):Xe)}),children:l.fns.map((Be,Xe)=>h.jsx("option",{value:Xe,children:f4(Be.expr)},Xe))}),h.jsx("button",{type:"button",className:"icon-button",title:a.areaRemove,onClick:()=>c({...l,areas:Le.filter((Be,Xe)=>Xe!==fe)}),children:"×"})]}),
                    h.jsxs("label",{children:[a.spinFn2,h.jsxs("select",{value:le.fn2??-1,onChange:Be=>{const{fn2:Xe,...At}=le,me=Number(Be.target.value);c({...l,areas:Le.map((Me,Yt)=>Yt===fe?Ue(me<0?At:{...At,fn2:me}):Me)})},children:[h.jsx("option",{value:-1,children:a.spinToAxis("x")}),l.fns.map((Be,Xe)=>h.jsx("option",{value:Xe,disabled:Xe===le.fn,children:f4(Be.expr)},Xe))]})]}),
                    h.jsxs("label",{children:[a.areaFill,h.jsx("select",{value:le.fill??"solid",onChange:Be=>{const{fill:Xe,...At}=le,me=Be.target.value;c({...l,areas:Le.map((Me,Yt)=>Yt===fe?me==="hatch"||me==="cross"?{...At,fill:me}:At:Me)})},children:["solid","hatch","cross"].map(Be=>h.jsx("option",{value:Be,children:a.areaFills[Be]},Be))})]}),
                    h.jsxs("span",{className:"spin-range",children:[a.spinFrom,h.jsx("input",{value:le.a,onFocus:ev=>{activeInpRef.current=ev.target},onChange:Be=>ue({a:Be.target.value})}),a.spinTo,h.jsx("input",{value:le.b,onFocus:ev=>{activeInpRef.current=ev.target},onChange:Be=>ue({b:Be.target.value})}),h.jsx("button",{type:"button",className:"link area-cross",disabled:!Se,onClick:()=>Se&&ue({a:Se[0],b:Se[1]}),children:Se?a.areaCross:a.areaNoCross})]}),
                    !qF(O.fns,le)&&h.jsx("div",{className:"fn-error",children:a.spinBad})
                  ]},fe);
                }),
                h.jsx("button",{type:"button",className:"link",disabled:!l.fns.length,onClick:()=>{const fe=l.fns.length>1?1:void 0,Le=PM(l,0,fe);c({...l,areas:[...l.areas??[],{fn:0,...fe!==void 0?{fn2:fe}:{},a:(Le==null?void 0:Le[0])??"0",b:(Le==null?void 0:Le[1])??"1"}]})},children:a.areaAdd}),
                (l.areas??[]).length>0&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:l.areaValues!==!1,onChange:le=>c({...l,areaValues:le.target.checked?void 0:!1})})," ",a.areaValues]})
              ]}),

              toolSec==="vectors"&&h.jsxs("div",{className:"mng-tsec",children:[
                ye.map((le,fe)=>h.jsxs("div",{className:"fn-row vector-row",children:[
                  h.jsx("input",{type:"color",title:a.color,value:le.color,onChange:Le=>He(fe,{color:Le.target.value})}),
                  h.jsx("input",{className:"vector-name",value:le.label??"",maxLength:8,placeholder:"u",onChange:Le=>He(fe,{label:Le.target.value})}),
                  h.jsxs("label",{children:[a.vectorFrom,h.jsx("input",{className:le.from.trim()&&!_5(l,le.from)?"bad":"",value:le.from,placeholder:"0; 0",onFocus:ev=>{activeInpRef.current=ev.target},onChange:Le=>He(fe,{from:Le.target.value})})]}),
                  h.jsxs("label",{children:[a.vectorTo,h.jsx("input",{className:le.to.trim()&&!_5(l,le.to)?"bad":"",value:le.to,placeholder:"2; 1",onFocus:ev=>{activeInpRef.current=ev.target},onChange:Le=>He(fe,{to:Le.target.value})})]}),
                  h.jsx("button",{type:"button",className:"icon-button",title:a.removeVector,onClick:()=>c({...l,vectors:ye.filter((Le,Ue)=>Ue!==fe)}),children:"×"})
                ]},fe)),
                h.jsx("button",{type:"button",className:"link",onClick:()=>{const le=ooe.find(fe=>!ye.some(Le=>Le.label===fe))??"";c({...l,vectors:[...ye,{from:"0; 0",to:"2; 1",label:le,color:pm[(l.fns.length+ye.length)%pm.length]}]})},children:a.addVector})
              ]}),

              toolSec==="spin"&&h.jsxs("div",{className:"mng-tsec",children:[
                B.map((le,fe)=>{var Le;return h.jsxs("div",{className:"spin-card",children:[
                  h.jsxs("label",{children:[h.jsx("input",{type:"color",title:a.color,value:Z7(le,fe),onChange:Ue=>H(fe,{color:Ue.target.value})}),a.spinFn,h.jsx("select",{value:le.fn,onChange:Ue=>H(fe,{fn:Number(Ue.target.value)}),children:l.fns.map((Ue,ue)=>h.jsx("option",{value:ue,children:f4(Ue.expr)},ue))}),h.jsx("button",{type:"button",className:"icon-button",title:a.spinRemove,onClick:()=>(cancelAnimationFrame(U.current),K(B.filter((Ue,ue)=>ue!==fe))),children:"×"})]}),
                  h.jsxs("label",{children:[a.spinFn2,h.jsxs("select",{value:le.fn2??-1,onChange:Ue=>{const{fn2:ue,...Se}=le,Be=Number(Ue.target.value);K(B.map((Xe,At)=>At===fe?Be<0?Se:{...Se,fn2:Be}:Xe))},children:[h.jsx("option",{value:-1,children:a.spinToAxis(le.axis)}),l.fns.map((Ue,ue)=>h.jsx("option",{value:ue,disabled:ue===le.fn,children:f4(Ue.expr)},ue))]})]}),
                  h.jsxs("span",{className:"spin-range",children:[le.axis==="y"&&US(((Le=l.fns[le.fn])==null?void 0:Le.expr)??"")?a.spinFromY:a.spinFrom,h.jsx("input",{value:le.a,onChange:Ue=>H(fe,{a:Ue.target.value})}),a.spinTo,h.jsx("input",{value:le.b,onChange:Ue=>H(fe,{b:Ue.target.value})})]}),
                  !Ym(O.fns,le)&&h.jsx("div",{className:"fn-error",children:a.spinBad})
                ]},fe)}),
                h.jsx("button",{type:"button",className:"link",disabled:!l.fns.length,onClick:()=>K([...B,{fn:Math.min(B.length,l.fns.length-1),a:"0",b:"2",axis:(F==null?void 0:F.axis)??"x",angle:(F==null?void 0:F.angle)??360,...F!=null&&F.view?{view:F.view}:{}}]),children:B.length?a.spinAddMore:a.spinAdd}),
                F&&h.jsxs("div",{className:"spin-form",children:[
                  h.jsxs("span",{className:"spin-axis",children:[a.spinAxis,["x","y"].map(le=>h.jsxs("button",{type:"button",className:`spin-axis-btn${F.axis===le?" on":""}`,onClick:()=>R({axis:le}),children:["O",le]},le))]}),
                  h.jsxs("span",{className:"spin-axis spin-views",children:[a.spinViews,["sgk","front","top","side"].map(le=>h.jsx("button",{type:"button",className:"spin-view-btn",onClick:()=>q(le==="sgk"?void 0:BF[le]),children:a.spinView[le]},le)),h.jsx("button",{type:"button",className:`spin-view-btn${Y?" on":""}`,onClick:()=>ee(!Y),children:a.spinTurn3d})]}),
                  h.jsxs("label",{className:"spin-angle",children:[a.spinAngle,h.jsx("input",{type:"range",min:0,max:360,step:1,value:F.angle,onChange:le=>(cancelAnimationFrame(U.current),R({angle:Number(le.target.value)}))}),h.jsxs("span",{children:[F.angle,"°"]})]}),
                  B.length>1&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.spinMeet,onChange:le=>c({...l,spinMeet:le.target.checked||void 0})})," ",a.spinMeet]}),
                  h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.spinValue,onChange:le=>c({...l,spinValue:le.target.checked||void 0})})," ",a.spinValue]}),
                  h.jsx("span",{className:"spin-actions",children:h.jsxs("button",{type:"button",className:"primary",onClick:he,children:["▶ ",a.spinPlay]})})
                ]})
              ]})
            ]})
          ]}),

          // DISPLAY / SETTINGS TAB (View bounds + Axis styles)
          rail==="settings"&&h.jsxs("div",{className:"mng-settings",children:[
            h.jsx("div",{className:"mng-sec-hd",children:a.view}),
            h.jsx("div",{className:"range-grid",children:["xmin","xmax","ymin","ymax"].map(le=>h.jsxs("span",{children:[a.range[le],h.jsx("input",{value:u[le],onChange:fe=>{j(!1),p({...u,[le]:fe.target.value})}})]},le))}),
            h.jsx("div",{className:"range-grid",children:["stepX","stepY"].map(le=>h.jsxs("span",{children:[a.tickStep[le],h.jsx("input",{className:E(d[le])?"bad":"",value:d[le],placeholder:a.auto,onChange:fe=>m({...d,[le]:fe.target.value})})]},le))}),
            h.jsx("div",{className:"range-grid axis-names",children:[
              h.jsxs("span",{children:[a.axisNameX,h.jsx("input",{value:l.xName??"",maxLength:20,placeholder:"x",onChange:le=>c({...l,xName:le.target.value})})]}),
              h.jsxs("span",{children:[a.axisNameY,h.jsx("input",{value:l.yName??"",maxLength:20,placeholder:"y",onChange:le=>c({...l,yName:le.target.value})})]})
            ]}),
            h.jsxs("div",{className:"mng-chk-grid",children:[
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.equal,onChange:le=>c({...l,equal:le.target.checked||void 0})})," ",a.equalUnits]}),
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:l.grid,onChange:le=>c({...l,grid:le.target.checked})})," ",a.grid]}),
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:l.legend!==!1,onChange:le=>c({...l,legend:le.target.checked})})," ",a.showLegend]}),
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!l.hideCoords,onChange:le=>c({...l,hideCoords:le.target.checked?void 0:!0})})," ",a.showCoords]}),
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.comma,onChange:le=>c({...l,comma:le.target.checked||void 0})})," ",a.decimalComma]}),
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.plain,onChange:le=>c({...l,plain:le.target.checked||void 0})})," ",a.graphPlain]}),
              h.jsxs("label",{className:`check${l.plain?"":" off"}`,children:[h.jsx("input",{type:"checkbox",disabled:!l.plain,checked:!!l.white,onChange:le=>c({...l,white:le.target.checked||void 0})})," ",a.graphWhite]}),
              h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:!!l.asymptotes,onChange:le=>c({...l,asymptotes:le.target.checked||void 0})})," ",a.showAsymptotes]}),
              h.jsxs("label",{className:`check${l.asymptotes?"":" off"}`,children:[h.jsx("input",{type:"checkbox",disabled:!l.asymptotes,checked:!!l.asymptoteEqs,onChange:le=>c({...l,asymptoteEqs:le.target.checked||void 0})})," ",a.asymptoteEqs]})
            ]}),
            h.jsx(bH,{value:l.axisColor,onChange:le=>c({...l,axisColor:le})}),
            h.jsxs("label",{className:"graph-scale",children:[a.graphTextSize(Math.round((l.textScale??1)*100)),h.jsx("input",{type:"range",min:1,max:3,step:.25,value:l.textScale??1,onChange:le=>c({...l,textScale:Number(le.target.value)===1?void 0:Number(le.target.value)})})]}),
            h.jsxs("label",{className:"graph-scale",children:[a.graphLineSize(Math.round((l.lineScale??1)*100)),h.jsx("input",{type:"range",min:.4,max:3,step:.1,value:l.lineScale??1,onChange:le=>c({...l,lineScale:Number(le.target.value)===1?void 0:Number(le.target.value)})})]}),
            h.jsxs("label",{className:"graph-scale",children:[a.graphDotSize(Math.round((l.dotScale??1)*100)),h.jsx("input",{type:"range",min:.4,max:2,step:.1,value:l.dotScale??1,onChange:le=>c({...l,dotScale:Number(le.target.value)===1?void 0:Number(le.target.value)})})]}),
            h.jsxs("label",{className:`graph-scale${l.legend===!1?" off":""}`,children:[a.graphLegendSize(Math.round((l.legendScale??1)*100)),h.jsx("input",{type:"range",min:.4,max:2,step:.1,disabled:l.legend===!1,value:l.legendScale??1,onChange:le=>c({...l,legendScale:Number(le.target.value)===1?void 0:Number(le.target.value)})})]})
          ]})
        ]}),

        // 3. Right Spacious GeoGebra Coordinate Plane (PAN & ZOOM + LIVE HOVER GLOW & TARGET TOOLTIP!)
        h.jsxs("div",{className:"mng-stage",ref:stageRef,children:[
          h.jsx("canvas",{
            ref:w,
            className:"mng-canvas graph-preview",
            "data-dark":n?"":void 0,
            style:{width:"100%",height:"100%",cursor:isPanning?"grabbing":(hoverTarget?"pointer":"grab"),touchAction:"none"},
            onPointerDown:ev=>{
              if(ctxMenu)setCtxMenu(null);
              if(ev.button!==0)return;
              ev.currentTarget.setPointerCapture(ev.pointerId);
              if(Y&&F){ce.current={x:ev.clientX,y:ev.clientY};return}
              if(!C)return;
              panRef.current={sx:ev.clientX,sy:ev.clientY,moved:!1,xmin:T(u.xmin),xmax:T(u.xmax),ymin:T(u.ymin),ymax:T(u.ymax),vxSpan:viewBoxO.xmax-viewBoxO.xmin,vySpan:viewBoxO.ymax-viewBoxO.ymin,w:renderW,h:renderH};
            },
            onContextMenu:ev=>{
              const hit=hitTestCanvas(ev.clientX,ev.clientY);
              if(hit.kind==="fn"||hit.kind==="pt")setSelTarget({kind:hit.kind,index:hit.index});
              openCtxMenu(ev,hit);
            },
            onDoubleClick:ev=>{
              const hit=hitTestCanvas(ev.clientX,ev.clientY);
              if(hit.kind==="fn"||hit.kind==="pt")openProps(hit.kind,hit.index,"basic");
            },
            onPointerMove:ev=>{
              const rc=ev.currentTarget.getBoundingClientRect();
              const sx=ev.clientX-rc.left,sy=ev.clientY-rc.top;
              if(C&&rc.width>0&&rc.height>0){
                const gx=viewBoxO.xmin+sx/rc.width*(viewBoxO.xmax-viewBoxO.xmin);
                const gy=viewBoxO.ymax-sy/rc.height*(viewBoxO.ymax-viewBoxO.ymin);
                setHoverXY({x:Math.round(gx*100)/100,y:Math.round(gy*100)/100});
              }
              if(Y&&F&&ce.current){
                const prev=ce.current;
                ce.current={x:ev.clientX,y:ev.clientY};
                q(DF(F,ev.clientX-prev.x,ev.clientY-prev.y));
                return;
              }
              const pr=panRef.current;
              if(pr){
                if(!pr.moved&&Math.hypot(ev.clientX-pr.sx,ev.clientY-pr.sy)>=4){pr.moved=!0;setIsPanning(!0);setHoverTarget(null)}
                if(pr.moved){
                  const dx=(ev.clientX-pr.sx)/Math.max(1,pr.w)*pr.vxSpan;
                  const dy=(ev.clientY-pr.sy)/Math.max(1,pr.h)*pr.vySpan;
                  j(!1);
                  p({xmin:_e(pr.xmin-dx),xmax:_e(pr.xmax-dx),ymin:_e(pr.ymin+dy),ymax:_e(pr.ymax+dy)});
                }
                return;
              }
              // Live hover target detection for visual curve/point glow & tooltip
              const hit=hitTestCanvas(ev.clientX,ev.clientY);
              if(hit.kind==="fn"||hit.kind==="pt"){
                setHoverTarget({kind:hit.kind,index:hit.index,sx,sy});
              }else{
                setHoverTarget(prev=>prev?null:prev);
              }
            },
            onPointerUp:ev=>{
              const pr=panRef.current;
              if(pr&&!pr.moved){
                const hit=hitTestCanvas(ev.clientX,ev.clientY);
                if(hit.kind==="fn"||hit.kind==="pt")setSelTarget({kind:hit.kind,index:hit.index});
                else setSelTarget(null);
              }
              panRef.current=null;ce.current=null;setIsPanning(!1);
            },
            onPointerCancel:()=>{panRef.current=null;ce.current=null;setIsPanning(!1)},
            onPointerLeave:()=>{setHoverXY(null);setHoverTarget(null)},
            onWheel:ev=>{
              ev.preventDefault();
              const rc=ev.currentTarget.getBoundingClientRect();
              const cxR=rc.width>0?(ev.clientX-rc.left)/rc.width:0.5;
              const cyR=rc.height>0?(ev.clientY-rc.top)/rc.height:0.5;
              zoomView(ev.deltaY>0?1.16:0.86,cxR,cyR);
            }
          }),

          // Floating Target Tooltip Pill near hovered curve or point!
          hoverTarget&&!isPanning&&!ctxMenu&&(()=>{
            let col="#2563eb",tex="",fb="";
            if(hoverTarget.kind==="fn"&&l.fns[hoverTarget.index]){
              const f0=l.fns[hoverTarget.index],nm=fnNames[hoverTarget.index]||"f";
              col=f0.color||"#2563eb";
              const isImp=$r(f0.expr)&&!Qr(f0.expr),isX=Qr(f0.expr);
              tex=(isImp||isX)?(isX?`x = ${exprToTex(Sl(f0.expr))}`:exprToTex(f0.expr)):`${nm}(x) = ${exprToTex(f0.expr)}`;
              fb=`${nm}(x) = ${f0.expr}`;
            }else if(hoverTarget.kind==="pt"&&x[hoverTarget.index]){
              const p0=x[hoverTarget.index],at0=$2(O,p0);
              col=p0.color||(p0.fn>=0?((l.fns[p0.fn]||{}).color||"#2563eb"):"#0f172a");
              const yD=p0.fn>=0?(at0?ioe(Go(at0.y)):"0"):(p0.y||"0");
              tex=`${p0.label||"A"}(${exprToTex(p0.x||"0")};\\, ${exprToTex(yD)})`;
              fb=`${p0.label||"A"}(${p0.x}; ${yD})`;
            }else return null;
            const lx=Math.max(10,Math.min(hoverTarget.sx+14,renderW-255));
            const ly=Math.max(10,hoverTarget.sy>48?hoverTarget.sy-38:hoverTarget.sy+16);
            return h.jsxs("div",{className:"mng-hover-tip",style:{left:lx,top:ly},children:[
              h.jsx("span",{className:"mng-dot-static",style:{background:col,width:10,height:10}}),
              renderTex(tex,fb),
              h.jsx("span",{className:"mng-hover-hint",children:isVi?"Chuột phải: Thiết lập":"Right-click: Settings"})
            ]});
          })(),

          // Read-only live cursor coordinates badge (bottom-left)
          hoverXY&&h.jsx("div",{className:"mng-coord-pill",children:`(${String(hoverXY.x).replace(".",",")}; ${String(hoverXY.y).replace(".",",")})`}),

          // Floating GeoGebra Canvas Control Buttons (right edge — matching Images 5–9!)
          h.jsxs("div",{className:"mng-float-ctrls",children:[
            h.jsx("button",{type:"button",className:"mng-fbtn",title:isVi?"Tự căn khung nhìn":"Auto-fit / Home",onClick:()=>ve(l.fns),children:"⌂"}),
            h.jsx("button",{type:"button",className:`mng-fbtn${l.grid?" on":""}`,title:a.grid,onClick:()=>c({...l,grid:!l.grid}),children:"⊞"}),
            h.jsx("button",{type:"button",className:"mng-fbtn",title:isVi?"Phóng to":"Zoom in",onClick:()=>zoomView(0.78),children:"+"}),
            h.jsx("button",{type:"button",className:"mng-fbtn",title:isVi?"Thu nhỏ":"Zoom out",onClick:()=>zoomView(1.28),children:"−"}),
            h.jsx("button",{type:"button",className:`mng-fbtn${kbOpen?" on":""}`,title:isVi?"Bật / tắt bàn phím toán học":"Toggle math keyboard",onClick:()=>setKbOpen(!kbOpen),children:"⌨"})
          ]}),

          // GeoGebra "Các hàm toán học" Catalog Popup (triggered by ⋯ button — Image 10!)
          catOpen&&h.jsxs("div",{className:"mng-cat-pop",role:"dialog","aria-label":isVi?"Các hàm toán học":"Math functions",children:[
            h.jsxs("div",{className:"mng-cat-head",children:[
              h.jsx("span",{children:isVi?"Các hàm & lệnh toán học":"Math Functions & Commands"}),
              h.jsx("button",{type:"button",onClick:()=>setCatOpen(!1),children:isVi?"Đóng":"Close"})
            ]}),
            h.jsxs("div",{className:"mng-cat-body",children:[
              h.jsx("div",{className:"mng-cat-list",children:CATALOG.filter(it=>catGroup==="all"||it.g===catGroup).map((it,idx2)=>
                h.jsxs("button",{type:"button",className:"mng-cat-item",onClick:()=>{
                  setCatOpen(!1);
                  if(it.g==="pt"&&!it.ins.includes("=")){runUnifiedCmd(it.ins)}
                  else{insertAtActive(it.ins,it.bo)}
                },children:[
                  h.jsx("code",{children:it.cmd}),
                  h.jsx("span",{children:it.desc})
                ]},idx2)
              )}),
              h.jsx("div",{className:"mng-cat-cats",children:CAT_GROUPS.map(cg=>
                h.jsx("button",{type:"button",className:`mng-cat-grp${catGroup===cg.id?" on":""}`,onClick:()=>setCatGroup(cg.id),children:cg.lbl},cg.id)
              )})
            ]})
          ]})
        ]}),

        // 3B. Right-Side GeoGebra Settings Drawer ("Hàm số" / "Điểm" — opened from Right-Click -> Thiết lập!)
        propsTarget&&((propsTarget.kind==="fn"&&l.fns[propsTarget.index])||(propsTarget.kind==="pt"&&x[propsTarget.index]))&&(()=>{
          const isFn=propsTarget.kind==="fn";
          const idx0=propsTarget.index;
          const fnObj=isFn?l.fns[idx0]:null;
          const ptObj=!isFn?x[idx0]:null;
          const fNm=isFn?(fnNames[idx0]||"f"):"";
          const ptAt=!isFn?$2(O,ptObj):null;
          const ptCol=!isFn?(ptObj.color||(ptObj.fn>=0?((l.fns[ptObj.fn]||{}).color||"#2563eb"):"#0f172a")):"#2563eb";
          return h.jsxs("aside",{className:"mng-props",role:"complementary","aria-label":isFn?(isVi?"Thiết lập hàm số":"Function settings"):(isVi?"Thiết lập điểm":"Point settings"),children:[
            h.jsxs("div",{className:"mng-props-head",children:[
              h.jsx("span",{className:"mng-props-title",children:isFn?(isVi?"Hàm số":"Function"):(isVi?"Điểm":"Point")}),
              h.jsx("button",{type:"button",className:"mng-props-close",title:isVi?"Đóng":"Close",onClick:()=>setPropsTarget(null),children:"×"})
            ]}),
            h.jsx("div",{className:"mng-props-tabs",children:(isFn?[
              {id:"basic",lbl:isVi?"Căn bản":"Basic"},
              {id:"style",lbl:isVi?"Kiểu":"Style"},
              {id:"domain",lbl:isVi?"Miền [a;b]":"Domain"}
            ]:[
              {id:"basic",lbl:isVi?"Căn bản":"Basic"},
              {id:"style",lbl:isVi?"Kiểu":"Style"}
            ]).map(tb=>h.jsx("button",{type:"button",className:`mng-props-tab${propsTab===tb.id?" on":""}`,onClick:()=>setPropsTab(tb.id),children:tb.lbl},tb.id))}),

            h.jsxs("div",{className:"mng-props-body",children:[
              isFn&&propsTab==="basic"&&h.jsxs("div",{className:"mng-props-sec",children:[
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Tên":"Name"}),
                  h.jsx("input",{
                    className:"mng-props-inp",
                    value:fNm,
                    maxLength:6,
                    disabled:!!fnObj.locked,
                    onChange:ev=>{
                      const v0=ev.target.value.replace(/[^a-zA-Z0-9_]/g,"");
                      be(idx0,{name:v0||void 0});
                    }
                  })
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Định nghĩa":"Definition"}),
                  h.jsx(MnMathBox,{
                    className:"mng-mbox-props",
                    ariaLabel:isVi?"Định nghĩa hàm số":"Function definition",
                    value:fnObj.expr,
                    bad:!!G[idx0],
                    useComma:!!l.comma,
                    placeholder:"sin(x)",
                    onFocusInput:el=>{activeInpRef.current=el},
                    onChange:val=>{if(!fnObj.locked)be(idx0,{expr:__mnNormShorthand(val)})}
                  })
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Hiển thị nhãn":"Label"}),
                  h.jsxs("select",{
                    className:"mng-props-sel",
                    value:fnObj.hideLabel?"none":(fnObj.labelMode==="fn"?"fn":"eq"),
                    onChange:ev=>{
                      const v0=ev.target.value;
                      if(v0==="none")be(idx0,{hideLabel:!0,labelMode:void 0});
                      else if(v0==="fn")be(idx0,{hideLabel:void 0,labelMode:"fn"});
                      else be(idx0,{hideLabel:void 0,labelMode:void 0});
                    },
                    children:[
                      h.jsx("option",{value:"eq",children:isVi?"Phương trình (y = ...)":"Equation (y = ...)"}),
                      h.jsx("option",{value:"fn",children:isVi?`Tên hàm (${fNm}(x) = ...)`:`Function name (${fNm}(x) = ...)`}),
                      h.jsx("option",{value:"none",children:isVi?"Ẩn nhãn trên đồ thị":"Hide label"})
                    ]
                  })
                ]}),
                h.jsxs("div",{className:"mng-props-checks",children:[
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!fnObj.hidden,onChange:ev=>be(idx0,{hidden:ev.target.checked?void 0:!0})}),h.jsx("span",{children:isVi?"Hiển thị đối tượng":"Show object"})]}),
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!!fnObj.dashed,onChange:ev=>be(idx0,{dashed:ev.target.checked?!0:void 0,dashStyle:void 0})}),h.jsx("span",{children:isVi?"Đường nét đứt":"Dashed line"})]}),
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!!fnObj.locked,onChange:ev=>be(idx0,{locked:ev.target.checked?!0:void 0})}),h.jsx("span",{children:isVi?"Cố định đối tượng":"Fix object"})]})
                ]})
              ]}),

              isFn&&propsTab==="style"&&h.jsxs("div",{className:"mng-props-sec",children:[
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Màu sắc":"Color"}),
                  h.jsxs("div",{className:"mng-swatch-row",children:[
                    SWATCHES.map(col=>h.jsx("button",{type:"button",className:`mng-sw${fnObj.color.toLowerCase()===col?" on":""}`,style:{background:col},onClick:()=>be(idx0,{color:col})},col)),
                    h.jsxs("label",{className:"mng-sw-pick",title:isVi?"Màu tùy chọn":"Custom color",children:[
                      h.jsx("input",{type:"color",value:fnObj.color,onChange:ev=>be(idx0,{color:ev.target.value})}),
                      h.jsx("span",{children:"+"})
                    ]})
                  ]})
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsxs("label",{children:[isVi?"Độ dày đường":"Line thickness",h.jsx("b",{children:`${(fnObj.width??2.6).toFixed(1)} px`})]}),
                  h.jsx("input",{type:"range",min:1.2,max:5.2,step:0.2,value:fnObj.width??2.6,onChange:ev=>be(idx0,{width:Number(ev.target.value)})})
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsxs("label",{children:[isVi?"Độ mờ":"Opacity",h.jsx("b",{children:`${Math.round((fnObj.opacity??1)*100)}%`})]}),
                  h.jsx("input",{type:"range",min:0.2,max:1,step:0.05,value:fnObj.opacity??1,onChange:ev=>{const v0=Number(ev.target.value);be(idx0,{opacity:v0>=0.99?void 0:v0})}})
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Kiểu đường":"Line style"}),
                  h.jsxs("div",{className:"mng-lstyle-row",children:[
                    h.jsx("button",{type:"button",className:`mng-lstyle${!fnObj.dashed&&fnObj.dashStyle!=="dot"?" on":""}`,onClick:()=>be(idx0,{dashed:void 0,dashStyle:void 0}),children:isVi?"Nét liền":"Solid"}),
                    h.jsx("button",{type:"button",className:`mng-lstyle${fnObj.dashed&&fnObj.dashStyle!=="dot"?" on":""}`,onClick:()=>be(idx0,{dashed:!0,dashStyle:void 0}),children:isVi?"Nét đứt":"Dashed"}),
                    h.jsx("button",{type:"button",className:`mng-lstyle${fnObj.dashStyle==="dot"?" on":""}`,onClick:()=>be(idx0,{dashed:!0,dashStyle:"dot"}),children:isVi?"Chấm bi":"Dotted"})
                  ]})
                ]})
              ]}),

              isFn&&propsTab==="domain"&&h.jsxs("div",{className:"mng-props-sec",children:[
                h.jsxs("label",{className:"mng-pchk",children:[
                  h.jsx("input",{type:"checkbox",checked:!!fnObj.lim,onChange:ev=>be(idx0,{lim:ev.target.checked?JL:void 0})}),
                  h.jsx("span",{children:isVi?"Giới hạn miền vẽ [a; b]":"Restrict drawing domain"})
                ]}),
                fnObj.lim&&h.jsx("div",{className:"mng-props-lim",children:["xmin","xmax","ymin","ymax"].map(Le=>
                  h.jsxs("div",{className:"mng-field",children:[
                    h.jsx("label",{children:a.range[Le]}),
                    h.jsx("input",{className:`mng-props-inp${Ae(fnObj.lim[Le])?" bad":""}`,value:fnObj.lim[Le],placeholder:Le.endsWith("min")?"−∞":"+∞",onFocus:ev=>{activeInpRef.current=ev.target},onChange:Ue=>Ee(idx0,{[Le]:Ue.target.value})})
                  ]},Le)
                )}),
                h.jsxs("div",{className:"mng-props-quick",children:[
                  h.jsx("button",{type:"button",className:"mng-qchip",onClick:()=>ie("root"),children:isVi?"Tìm giao Ox":"Roots"}),
                  h.jsx("button",{type:"button",className:"mng-qchip",onClick:()=>ie("extremum"),children:isVi?"Tìm cực trị":"Extrema"})
                ]})
              ]}),

              !isFn&&propsTab==="basic"&&h.jsxs("div",{className:"mng-props-sec",children:[
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Tên điểm":"Point name"}),
                  h.jsx("input",{className:"mng-props-inp",value:ptObj.label,maxLength:6,onChange:ev=>qe(idx0,{label:ev.target.value})})
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Tọa độ (x; y)":"Coordinates (x; y)"}),
                  h.jsxs("div",{className:"mng-pt-editor",children:[
                    h.jsx("span",{className:"mng-pt-paren",children:"("}),
                    h.jsx(MnMathBox,{className:"mng-mbox-pt",value:ptObj.x,bad:!Number.isFinite(Lr(ptObj.x)),useComma:!!l.comma,placeholder:"0",onFocusInput:el=>{activeInpRef.current=el},onChange:val=>qe(idx0,{x:val})}),
                    h.jsx("span",{className:"mng-pt-sep",children:";"}),
                    h.jsx(MnMathBox,{className:"mng-mbox-pt",value:ptObj.fn>=0?"":ptObj.y,bad:ptObj.fn<0&&!Number.isFinite(Lr(ptObj.y)),useComma:!!l.comma,placeholder:ptObj.fn>=0&&ptAt?ioe(Go(ptAt.y)):"0",onFocusInput:el=>{activeInpRef.current=el},onChange:val=>qe(idx0,{y:val,fn:-1})}),
                    h.jsx("span",{className:"mng-pt-paren",children:")"})
                  ]})
                ]}),
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Vị trí":"Attachment"}),
                  h.jsxs("select",{className:"mng-props-sel",value:ptObj.fn,onChange:ev=>{const Se=Number(ev.target.value);qe(idx0,{fn:Se,y:Se<0&&ptAt?Go(ptAt.y):ptObj.y})},children:[
                    h.jsx("option",{value:-1,children:a.freePoint}),
                    l.fns.map((ue,Se)=>!$r(ue.expr)&&h.jsxs("option",{value:Se,children:[`${fnNames[Se]||"f"}(x) = ${ue.expr}`]},Se))
                  ]})
                ]}),
                h.jsxs("div",{className:"mng-props-checks",children:[
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!ptObj.hidden,onChange:ev=>qe(idx0,{hidden:ev.target.checked?void 0:!0})}),h.jsx("span",{children:isVi?"Hiển thị đối tượng":"Show object"})]}),
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!!ptObj.guides,onChange:ev=>qe(idx0,{guides:ev.target.checked})}),h.jsx("span",{children:a.guides})]}),
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!ptObj.hideLabel,onChange:ev=>qe(idx0,{hideLabel:ev.target.checked?void 0:!0})}),h.jsx("span",{children:a.showPointName})]}),
                  h.jsxs("label",{className:"mng-pchk",children:[h.jsx("input",{type:"checkbox",checked:!!ptObj.coords,onChange:ev=>qe(idx0,{coords:ev.target.checked})}),h.jsx("span",{children:a.coords})]})
                ]})
              ]}),

              !isFn&&propsTab==="style"&&h.jsxs("div",{className:"mng-props-sec",children:[
                h.jsxs("div",{className:"mng-field",children:[
                  h.jsx("label",{children:isVi?"Màu điểm":"Point color"}),
                  h.jsxs("div",{className:"mng-swatch-row",children:[
                    SWATCHES.map(col=>h.jsx("button",{type:"button",className:`mng-sw${ptCol.toLowerCase()===col?" on":""}`,style:{background:col},onClick:()=>qe(idx0,{color:col})},col)),
                    h.jsxs("label",{className:"mng-sw-pick",title:isVi?"Màu tùy chọn":"Custom color",children:[
                      h.jsx("input",{type:"color",value:ptCol,onChange:ev=>qe(idx0,{color:ev.target.value})}),
                      h.jsx("span",{children:"+"})
                    ]})
                  ]})
                ]})
              ]})
            ]})
          ]});
        })()
      ]}),

      // GeoGebra Right-Click Context Menu Popup (for Function / Point / Coordinate Plane)
      ctxMenu&&(()=>{
        const svgIco=(paths)=>h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:paths});
        const icDup=svgIco([h.jsx("rect",{x:9,y:9,width:13,height:13,rx:2}),h.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]);
        const icLock=svgIco([h.jsx("rect",{x:5,y:11,width:14,height:10,rx:2}),h.jsx("path",{d:"M8 11V7a4 4 0 0 1 8 0v4"})]);
        const icEye=svgIco([h.jsx("path",{d:"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"}),h.jsx("circle",{cx:12,cy:12,r:3})]);
        const icDash=svgIco([h.jsx("line",{x1:3,y1:12,x2:7,y2:12}),h.jsx("line",{x1:10,y1:12,x2:14,y2:12}),h.jsx("line",{x1:17,y1:12,x2:21,y2:12})]);
        const icGear=svgIco([h.jsx("circle",{cx:12,cy:12,r:3}),h.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"})]);
        const icDel=svgIco([h.jsx("polyline",{points:"3 6 5 6 21 6"}),h.jsx("path",{d:"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"}),h.jsx("path",{d:"M10 11v6"}),h.jsx("path",{d:"M14 11v6"})]);
        if(ctxMenu.kind==="fn"&&l.fns[ctxMenu.index]){
          const idx0=ctxMenu.index,fnObj=l.fns[idx0],fNm=fnNames[idx0]||"f";
          return h.jsxs("div",{className:"mng-ctx",role:"menu",style:{left:ctxMenu.x,top:ctxMenu.y},children:[
            h.jsxs("div",{className:"mng-ctx-hd",children:[
              h.jsx("span",{className:"mng-dot-static",style:{background:fnObj.color}}),
              h.jsx("span",{className:"mng-ctx-title",children:renderTex(`${fNm}(x) = ${exprToTex(fnObj.expr)}`,`${fNm}(x) = ${fnObj.expr}`)})
            ]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>duplicateFn(idx0),children:[h.jsx("span",{className:"mng-ctx-ico",children:icDup}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Nhân bản":"Duplicate"})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{be(idx0,{locked:fnObj.locked?void 0:!0}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:icLock}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Cố định đối tượng":"Fix object"}),h.jsx("span",{className:`mng-ctx-chk${fnObj.locked?" on":""}`,children:fnObj.locked?"✓":""})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{be(idx0,{hidden:fnObj.hidden?void 0:!0}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:icEye}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Hiển thị đối tượng":"Show object"}),h.jsx("span",{className:`mng-ctx-chk${!fnObj.hidden?" on":""}`,children:!fnObj.hidden?"✓":""})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{be(idx0,{dashed:fnObj.dashed?void 0:!0,dashStyle:void 0}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:icDash}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Đường nét đứt":"Dashed line"}),h.jsx("span",{className:`mng-ctx-chk${fnObj.dashed?" on":""}`,children:fnObj.dashed?"✓":""})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{be(idx0,{lim:fnObj.lim?void 0:JL}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"[a]"}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Giới hạn đoạn [a; b]":"Restrict [a; b]"}),h.jsx("span",{className:`mng-ctx-chk${fnObj.lim?" on":""}`,children:fnObj.lim?"✓":""})]}),
            h.jsx("div",{className:"mng-ctx-sep"}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>openProps("fn",idx0,"basic"),children:[h.jsx("span",{className:"mng-ctx-ico",children:icGear}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Thiết lập":"Settings"})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn del",disabled:!!fnObj.locked,onClick:()=>removeFnAt(idx0),children:[h.jsx("span",{className:"mng-ctx-ico",children:icDel}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Xóa":"Delete"})]})
          ]});
        }
        if(ctxMenu.kind==="pt"&&x[ctxMenu.index]){
          const idx0=ctxMenu.index,ptObj=x[idx0],ptAt=$2(O,ptObj);
          const ptCol=ptObj.color||(ptObj.fn>=0?((l.fns[ptObj.fn]||{}).color||"#2563eb"):"#0f172a");
          const yD=ptObj.fn>=0?(ptAt?ioe(Go(ptAt.y)):"0"):(ptObj.y||"0");
          return h.jsxs("div",{className:"mng-ctx",role:"menu",style:{left:ctxMenu.x,top:ctxMenu.y},children:[
            h.jsxs("div",{className:"mng-ctx-hd",children:[
              h.jsx("span",{className:"mng-dot-static",style:{background:ptCol}}),
              h.jsx("span",{className:"mng-ctx-title",children:renderTex(`${ptObj.label||"A"}(${exprToTex(ptObj.x||"0")};\\, ${exprToTex(yD)})`,`${ptObj.label||"A"}(${ptObj.x}; ${yD})`)})
            ]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>duplicatePt(idx0),children:[h.jsx("span",{className:"mng-ctx-ico",children:icDup}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Nhân bản":"Duplicate"})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{qe(idx0,{hidden:ptObj.hidden?void 0:!0}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:icEye}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Hiển thị đối tượng":"Show object"}),h.jsx("span",{className:`mng-ctx-chk${!ptObj.hidden?" on":""}`,children:!ptObj.hidden?"✓":""})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{qe(idx0,{guides:!ptObj.guides}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"⊞"}),h.jsx("span",{className:"mng-ctx-lbl",children:a.guides}),h.jsx("span",{className:`mng-ctx-chk${ptObj.guides?" on":""}`,children:ptObj.guides?"✓":""})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{qe(idx0,{coords:!ptObj.coords}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"(x)"}),h.jsx("span",{className:"mng-ctx-lbl",children:a.coords}),h.jsx("span",{className:`mng-ctx-chk${ptObj.coords?" on":""}`,children:ptObj.coords?"✓":""})]}),
            h.jsx("div",{className:"mng-ctx-sep"}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>openProps("pt",idx0,"basic"),children:[h.jsx("span",{className:"mng-ctx-ico",children:icGear}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Thiết lập":"Settings"})]}),
            h.jsxs("button",{type:"button",className:"mng-ctx-btn del",onClick:()=>removePtAt(idx0),children:[h.jsx("span",{className:"mng-ctx-ico",children:icDel}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Xóa":"Delete"})]})
          ]});
        }
        return h.jsxs("div",{className:"mng-ctx",role:"menu",style:{left:ctxMenu.x,top:ctxMenu.y},children:[
          h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{c({...l,grid:!l.grid}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"⊞"}),h.jsx("span",{className:"mng-ctx-lbl",children:a.grid}),h.jsx("span",{className:`mng-ctx-chk${l.grid?" on":""}`,children:l.grid?"✓":""})]}),
          h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{c({...l,equal:l.equal?void 0:!0}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"1:1"}),h.jsx("span",{className:"mng-ctx-lbl",children:a.equalUnits}),h.jsx("span",{className:`mng-ctx-chk${l.equal?" on":""}`,children:l.equal?"✓":""})]}),
          h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{c({...l,legend:l.legend===!1?!0:!1}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"fx"}),h.jsx("span",{className:"mng-ctx-lbl",children:a.showLegend}),h.jsx("span",{className:`mng-ctx-chk${l.legend!==!1?" on":""}`,children:l.legend!==!1?"✓":""})]}),
          h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{c({...l,asymptotes:l.asymptotes?void 0:!0}),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:icDash}),h.jsx("span",{className:"mng-ctx-lbl",children:a.showAsymptotes}),h.jsx("span",{className:`mng-ctx-chk${l.asymptotes?" on":""}`,children:l.asymptotes?"✓":""})]}),
          h.jsx("div",{className:"mng-ctx-sep"}),
          h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{ve(l.fns),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:"⌂"}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Về khung nhìn chuẩn":"Reset view"})]}),
          h.jsxs("button",{type:"button",className:"mng-ctx-btn",onClick:()=>{setRail("settings"),setCtxMenu(null)},children:[h.jsx("span",{className:"mng-ctx-ico",children:icGear}),h.jsx("span",{className:"mng-ctx-lbl",children:isVi?"Thiết lập hiển thị":"Display settings"})]})
        ]});
      })(),

      // 4. Bottom Collapsible 4-Tab GeoGebra Virtual Math Keyboard
      renderKeyboard()
    ]}),

    h.jsxs("footer",{className:"dialog-actions mng-footer",children:[
      h.jsx("span",{className:"mng-foot-tip",children:isVi?"Kéo chuột trên đồ thị để di chuyển · Lăn chuột để phóng to/thu nhỏ":"Drag graph to pan · Scroll to zoom"}),
      h.jsxs("div",{className:"mng-foot-btns",children:[
        h.jsx("button",{
          type:"button",
          className:"mng-btn-tikz",
          disabled:!C,
          title:isVi?"Xuất mã TikZ chuẩn DoMinhMath từ đồ thị hiện tại":"Export DoMinhMath TikZ code from this graph",
          onClick:()=>{
            if(typeof window!=="undefined"&&window.MinNoteTikzExport&&typeof window.MinNoteTikzExport.openModal==="function"){
              window.MinNoteTikzExport.openModal({mode:"graph",graph:O});
            }
          },
          children:isVi?"📐 Xuất TikZ":"📐 Export TikZ"
        }),
        h.jsx("button",{type:"button",onClick:r,children:a.cancel}),
        h.jsx("button",{type:"button",className:"primary",disabled:!C,onClick:at,children:a.done})
      ]})
    ]})
  ]});
}
const geoGraphCode = [
  __mnNormShorthand.toString(),
  __mnVisualMathTex.toString(),
  MnMathBox.toString(),
  __aoeTemplate.toString().replace("function __aoeTemplate", "function aoe")
].join("\n");

// Idempotently replace from __mnNormShorthand, __mnVisualMathTex, or function aoe up to const C9=46,n8=
const aoeStart = src.includes("function __mnNormShorthand(")
  ? "function __mnNormShorthand("
  : (src.includes("function __mnVisualMathTex(")
    ? "function __mnVisualMathTex("
    : "function aoe({item:e,isNew:t,dark:n,box:o,onBox:s,onSave:i,onClose:r}){");
replaceRange("GeoGebra-Style Graph Studio (aoe + Seamless f(x) + Live KaTeX MathBox)", aoeStart, "const C9=46,n8=", geoGraphCode);

// 7. Add direct "📐 Xuất TikZ" action button to Whiteboard selection-bar when a graph item is selected
const selBarEditAnchor = `(J==null?void 0:J.selectedItem())&&J.selectedItem().item.type!=="image"&&h.jsxs("button",{onClick:ll,children:[h.jsx(oe.edit,{})," ",n.edit]})`;
const selBarGraphTikzBtn = `${selBarEditAnchor},(J==null?void 0:J.selectedItem())&&J.selectedItem().item.type==="graph"&&h.jsxs("button",{className:"mng-sel-tikz",title:"Xuất mã TikZ chuẩn DoMinhMath từ đồ thị đang chọn",onClick:()=>{const it=J.selectedItem();it&&window.MinNoteTikzExport&&window.MinNoteTikzExport.openModal({mode:"graph",graph:it.item})},children:["📐 Xuất TikZ"]})`;
if (!src.includes('className:"mng-sel-tikz"')) {
  replaceExact("Selection-bar Graph Export TikZ button", selBarEditAnchor, selBarGraphTikzBtn);
} else {
  console.log("[OK] Selection-bar Graph Export TikZ button already present");
}

// 8. Also register window.__mnGraphKernel eagerly with TDZ-safe lazy getters right after SJ()!
const sjKernelAnchor = `function SJ(e){return e.asymptotes?e.fns.flatMap(t=>{if($r(t.expr)||Gd(t.expr)!==null)return[];const n=$i(t.expr);return n instanceof Error?[]:KF(n,e.xmin,e.xmax,e.ymin,e.ymax).map(o=>({a:o,color:t.color}))}):[]}`;
const sjKernelOldBad = `${sjKernelAnchor}if(typeof window!=="undefined"&&!window.__mnGraphKernel){window.__mnGraphKernel={evalFn:$i,verticalX:Gd,isImplicit:$r,asymptotes:SJ,evalNum:Lr,evalPt:$2,getLim:zF,parseIneq:DS,formatNum:U$,toComma:OF,exprTex:Yr};}`;
const sjKernelWithReg = `${sjKernelAnchor}if(typeof window!=="undefined"&&!window.__mnGraphKernel){window.__mnGraphKernel={get evalFn(){return $i},get verticalX(){return Gd},get isImplicit(){return $r},get asymptotes(){return SJ},get evalNum(){return Lr},get evalPt(){return $2},get getLim(){return zF},get parseIneq(){return DS},get formatNum(){return U$},get toComma(){return OF},get exprTex(){return Yr}};} `;
if (src.includes(sjKernelOldBad)) {
  replaceExact("Upgrade window.__mnGraphKernel to TDZ-safe lazy getters", sjKernelOldBad, sjKernelWithReg);
} else if (!src.includes("get evalFn(){return $i}")) {
  replaceExact("Eager window.__mnGraphKernel registration (TDZ-safe)", sjKernelAnchor, sjKernelWithReg);
} else {
  console.log("[OK] TDZ-safe window.__mnGraphKernel registration already present");
}

fs.writeFileSync(jsPath, src, "utf8");
console.log("[DONE] Successfully applied all v0.0.9.27/v0.0.9.29 patches!");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
