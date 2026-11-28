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
 * Idempotent patch for MinNote v0.0.9.26:
 *  - Replaces the top mode switchers in Đề bài LaTeX / Hình TikZ / Typst dialog
 *    with true tactile in-pill ON/OFF switches:
 *      [ ● Đề bài ] ⇄ [ Hình TikZ ● ]
 *      [ ● LaTeX  ] ⇄ [ Typst ● ]
 *      [ ● Hình sửa được ] ⇄ [ Ảnh TeX ● ]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TARGET = path.resolve(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
const MARKER = '/*__MN_V926_ONOFF_PILL_SWITCHES__*/';

let src = fs.readFileSync(TARGET, 'utf8');
if (src.includes(MARKER)) {
  console.log('[v926] Patch already applied — skipping.');
  process.exit(0);
}

function replaceExact(str, find, repl, label) {
  const idx = str.indexOf(find);
  if (idx < 0) throw new Error(`[v926] Anchor NOT FOUND: ${label}`);
  if (str.indexOf(find, idx + 1) >= 0) throw new Error(`[v926] Anchor NOT UNIQUE: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + find.length);
}

// 1. Replace Bo top switches with pure clean in-pill ON/OFF switches (no clutter hint text!)
src = replaceExact(
  src,
  'Bo=!e&&v===void 0&&l===void 0&&h.jsxs("div",{className:"problem-modes mn-prob-topbar",children:[h.jsxs("button",{type:"button",className:`mn-rocker${T==="tikz"?" is-right":""}`,role:"switch","aria-checked":T==="tikz",title:"Bấm để chuyển đổi Đề bài ↔ Hình vẽ",onClick:()=>C(T==="problem"?"tikz":"problem"),children:[h.jsx("span",{className:"mn-rocker-thumb","aria-hidden":!0}),h.jsx("span",{className:`mn-rocker-opt${T==="problem"?" on":""}`,children:j.problemModeText}),h.jsx("span",{className:`mn-rocker-opt${T==="tikz"?" on":""}`,children:L?j.problemModeTypstFig:j.problemModeTikz})]}),h.jsxs("button",{type:"button",className:`mn-rocker is-lang${_==="typst"?" is-right":""}`,role:"switch","aria-checked":_==="typst","aria-label":j.problemLang,title:"Bấm để chuyển đổi LaTeX ↔ Typst",onClick:()=>P(_==="latex"?"typst":"latex"),children:[h.jsx("span",{className:"mn-rocker-thumb","aria-hidden":!0}),h.jsx("span",{className:`mn-rocker-opt${_==="latex"?" on":""}`,children:"LaTeX"}),h.jsx("span",{className:`mn-rocker-opt${_==="typst"?" on":""}`,children:"Typst"})]})]})',
  MARKER + 'Bo=!e&&v===void 0&&l===void 0&&h.jsxs("div",{className:"problem-modes mn-prob-topbar",children:[h.jsxs("button",{type:"button",className:`mn-onoff-pill mn-onoff-mode${T==="tikz"?" is-on":""}`,role:"switch","aria-checked":T==="tikz",title:`Bấm để đổi sang ${T==="problem"?(L?j.problemModeTypstFig:j.problemModeTikz):j.problemModeText}`,onClick:()=>C(T==="problem"?"tikz":"problem"),children:[h.jsx("span",{className:"mn-onoff-knob","aria-hidden":!0}),h.jsx("span",{className:"mn-onoff-txt",children:T==="problem"?j.problemModeText:L?j.problemModeTypstFig:j.problemModeTikz})]}),h.jsxs("button",{type:"button",className:`mn-onoff-pill mn-onoff-lang${_==="typst"?" is-on":""}`,role:"switch","aria-checked":_==="typst","aria-label":j.problemLang,title:`Bấm để đổi sang ${_==="latex"?"Typst":"LaTeX"}`,onClick:()=>P(_==="latex"?"typst":"latex"),children:[h.jsx("span",{className:"mn-onoff-knob","aria-hidden":!0}),h.jsx("span",{className:"mn-onoff-txt",children:_==="latex"?"LaTeX":"Typst"})]})]})',
  'Bo in-pill ON/OFF switches'
);

// 2. Replace Noe TikZ mode switch (Hình sửa được <-> Ảnh TeX) with matching pure in-pill ON/OFF switch
src = replaceExact(
  src,
  'h.jsx("div",{className:"problem-modes mn-prob-topbar",children:h.jsxs("button",{type:"button",className:`mn-rocker${d==="image"?" is-right":""}`,role:"switch","aria-checked":d==="image","aria-label":c.tikzModes,title:"Bấm để chuyển đổi Hình sửa được ↔ Ảnh TeX",onClick:()=>g(d==="edit"?"image":"edit"),children:[h.jsx("span",{className:"mn-rocker-thumb","aria-hidden":!0}),h.jsx("span",{className:`mn-rocker-opt${d==="edit"?" on":""}`,children:c.tikzModeEdit}),h.jsx("span",{className:`mn-rocker-opt${d==="image"?" on":""}`,children:c.tikzModeImage})]})})',
  'h.jsx("div",{className:"problem-modes mn-prob-topbar",children:h.jsxs("button",{type:"button",className:`mn-onoff-pill mn-onoff-tikz${d==="image"?" is-on":""}`,role:"switch","aria-checked":d==="image","aria-label":c.tikzModes,title:`Bấm để đổi sang ${d==="edit"?c.tikzModeImage:c.tikzModeEdit}`,onClick:()=>g(d==="edit"?"image":"edit"),children:[h.jsx("span",{className:"mn-onoff-knob","aria-hidden":!0}),h.jsx("span",{className:"mn-onoff-txt",children:d==="edit"?c.tikzModeEdit:c.tikzModeImage})]})})',
  'Noe TikZ in-pill ON/OFF switch'
);

fs.writeFileSync(TARGET, src, 'utf8');
console.log('[v926] Successfully applied tactile in-pill ON/OFF switches to index-CTbULhps.js!');

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
