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
/**
 * Idempotent patch for MinNote v0.0.9.2:
 *  - Fixes TikZ segment clamping (seg: true when 0 <= k <= 1) in uC calc / DefPointOnLine / affine linear combos
 *  - Adds DefBarycentricPoint support in uC
 *  - Wires window.__mnRefineTikzConstraints into uC and Toe
 *  - Exposes uC, Toe, xoe, lE, g9, qh, _mnAutoLiftTikz3d on window.__mnGeoKernel & captures window.__mnTraceTikz
 *  - Adds ✨ AI Dựng hình button on the floating selection action bar
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
const MARKER = '/*__MN_AI_GEO_TIKZ_V92__*/';

let src = fs.readFileSync(TARGET, 'utf8');
if (src.includes(MARKER)) {
  console.log('[v92 patch] Already applied to index-CTbULhps.js.');
  process.exit(0);
}

const replacements = [
  {
    name: 'uC calc ($(A)!k!(B)$) seg clamping',
    target: 'x({t:"on",a:Ae,b:ie,k:_e,seg:!1})',
    replacement: 'x({t:"on",a:Ae,b:ie,k:_e,seg:_e>=0&&_e<=1})'
  },
  {
    name: 'uC affine combinations (k1*A + k2*B, 1/3*(A+B+C))',
    target: 'else if(Q.length===2&&Q.every(Ae=>Math.abs(Ae.k-.5)<1e-12))Ee=x({t:"mid",a:Q[0].id,b:Q[1].id});',
    replacement: 'else if(Q.length===2&&Q.every(Ae=>Math.abs(Ae.k-.5)<1e-12))Ee=x({t:"mid",a:Q[0].id,b:Q[1].id});else if(Q.length===2&&Math.abs(Q[0].k+Q[1].k-1)<1e-6)Ee=x({t:"on",a:Q[0].id,b:Q[1].id,k:Q[1].k,seg:Q[1].k>=0&&Q[1].k<=1});else if(Q.length===3&&Q.every(Ae=>Math.abs(Ae.k-1/3)<1e-3))Ee=x({t:"on",a:Q[0].id,b:S({t:"mid",a:Q[1].id,b:Q[2].id}),k:2/3,seg:!0});'
  },
  {
    name: 'uC DefPointOnLine seg clamping + DefBarycentricPoint',
    target: 'case"DefPointOnLine":{const[ve,$e]=Q(),at=So(Y.get("pos")??"0.5");ve&&$e&&Number.isFinite(at)&&(F=[x({t:"on",a:ve,b:$e,k:at,seg:!1})]);return}',
    replacement: 'case"DefPointOnLine":{const[ve,$e]=Q(),at=So(Y.get("pos")??"0.5");ve&&$e&&Number.isFinite(at)&&(F=[x({t:"on",a:ve,b:$e,k:at,seg:at>=0&&at<=1})]);return}case"DefBarycentricPoint":{const _pts=(ee[0]??"").split(",").map(s2=>{const[nm,wt]=s2.split("=").map(z=>z.trim());return{id:he(nm),w:So(wt??"1")}}).filter(z=>z.id&&Number.isFinite(z.w)),_tot=_pts.reduce((a2,z)=>a2+z.w,0);if(_pts.length===2&&Math.abs(_tot)>1e-9){const k2=_pts[1].w/_tot;F=[Math.abs(k2-.5)<1e-6?x({t:"mid",a:_pts[0].id,b:_pts[1].id}):x({t:"on",a:_pts[0].id,b:_pts[1].id,k:k2,seg:k2>=0&&k2<=1})]}else if(_pts.length===3&&Math.abs(_tot)>1e-9){const w12=_pts[1].w+_pts[2].w;if(Math.abs(w12)>1e-9){const k12=_pts[2].w/w12,m12=Math.abs(k12-.5)<1e-6?S({t:"mid",a:_pts[1].id,b:_pts[2].id}):S({t:"on",a:_pts[1].id,b:_pts[2].id,k:k12,seg:k12>=0&&k12<=1}),kAll=w12/_tot;F=[x({t:"on",a:_pts[0].id,b:m12,k:kAll,seg:kAll>=0&&kAll<=1})]}}return}'
  },
  {
    name: 'uC post-parse constraint refiner hook',
    target: 'return{points:p,shapes:d,skipped:[...i],names:Object.fromEntries(m)}',
    replacement: 'const _ucRes={points:p,shapes:d,skipped:[...i],names:Object.fromEntries(m)};return typeof window!=="undefined"&&window.__mnRefineTikzConstraints?window.__mnRefineTikzConstraints(_ucRes,n):_ucRes'
  },
  {
    name: 'Toe post-trace constraint refiner hook',
    target: 'return{points:r,shapes:a,skipped:[],names:i}',
    replacement: 'const _toeRes={points:r,shapes:a,skipped:[],names:i};return typeof window!=="undefined"&&window.__mnRefineTikzConstraints?window.__mnRefineTikzConstraints(_toeRes,o):_toeRes'
  },
  {
    name: 'Expose TikZ parser & helpers on window.__mnGeoKernel',
    target: 'window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,Td,Yi,kee,xk,gd,tee,mee,AR,Je,Kt,PY,NY,pI,$Y,fI,LY,_mnShapeStrokes,_mnCurvePolys,_mnBuildIteration,_mnRemapDef,_mnEvalEase,_mnShapeBBox,_mnStepFocusPt,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps,pb,z2,vk,z5,xr};',
    replacement: 'window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,Td,Yi,kee,xk,gd,tee,mee,AR,Je,Kt,PY,NY,pI,$Y,fI,LY,_mnShapeStrokes,_mnCurvePolys,_mnBuildIteration,_mnRemapDef,_mnEvalEase,_mnShapeBBox,_mnStepFocusPt,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps,pb,z2,vk,z5,xr,uC,Toe,xoe,lE,g9,qh,_mnAutoLiftTikz3d};'
  },
  {
    name: 'Capture e.traceTikz onto window.__mnTraceTikz',
    target: 'trace:e.traceTikz',
    replacement: 'trace:(window.__mnTraceTikz=e.traceTikz)'
  },
  {
    name: 'Selection bar ✨ AI Dựng hình button',
    target: '(J!=null&&J.sel&&(J.sel.shapes.size||J.sel.points.size||J.sel.items.size||J.sel.strokes.size))&&h.jsxs("button",{title:"Dựng lại hình theo kịch bản thứ tự vẽ"',
    replacement: '(window.MinNoteAiGeo&&typeof window.MinNoteAiGeo.canShowInSelBar==="function"&&window.MinNoteAiGeo.canShowInSelBar(J))&&h.jsxs("button",{className:"mn-sel-ai-geo-btn",title:"Dùng AI đọc đề/ảnh đang chọn và tự dựng hình từng nét",onClick:()=>window.MinNoteAiGeo.openFromSelection(J),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M12 3l1.6 3.8L17.5 8.4l-3.9 1.6L12 13.8l-1.6-3.8L6.5 8.4l3.9-1.6L12 3z",fill:"currentColor",fillOpacity:.22}),h.jsx("polygon",{points:"12 15 19 21 5 21 12 15"})]})," ","AI Dựng hình"]}),(J!=null&&J.sel&&(J.sel.shapes.size||J.sel.points.size||J.sel.items.size||J.sel.strokes.size))&&h.jsxs("button",{title:"Dựng lại hình theo kịch bản thứ tự vẽ"'
  }
];

for (const r of replacements) {
  const first = src.indexOf(r.target);
  const last = src.lastIndexOf(r.target);
  if (first < 0 || first !== last) {
    throw new Error(`Anchor check failed for "${r.name}": first=${first}, last=${last}`);
  }
  src = src.slice(0, first) + r.replacement + src.slice(first + r.target.length);
  console.log(`[v92 patch] Applied: ${r.name}`);
}

src = src + '\n' + MARKER + '\n';
fs.writeFileSync(TARGET, src, 'utf8');
console.log('[v92 patch] Successfully wrote updated index-CTbULhps.js');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
