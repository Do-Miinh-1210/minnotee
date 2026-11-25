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
// Idempotent patch script: v0.0.8.7 Always-Visible Hand-Holding-Pen Cursor
// Fixes every place where handPen disappeared while using MinNote:
//  1. Default cursor falls back to "handPen" instead of plain "pen"
//  2. hoverAt() no longer overwrites inline scroller.style.cursor="pointer" when handPen is active
//  3. showPointer() never hides handPen via .no-pointer idle timeout
//  4. Stylus / graphics tablet (pointerType==="pen") keeps handPen visible during BOTH hover & draw
//     and fixes tipBoxNow() bounding box so paintWet() never clips the hand-pen sprite!
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V87_ALWAYS_HAND_CURSOR__*/';
if (src.includes(MARKER)) {
  console.log('[v87-hand] Always-visible hand cursor patch already applied — skipping.');
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
  if (idx === -1) throw new Error(`[v87-hand] Anchor not found: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v87-hand] Anchor not unique: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + target.length);
}

// 1. Default board cursor -> "handPen"
src = replaceOnce(
  src,
  `[df,vx]=D.useState(()=>{try{const A=localStorage.getItem("cursor");return vH.includes(A??"")?A:"pen"}catch{return"pen"}})`,
  `${MARKER}[df,vx]=D.useState(()=>{try{const A=localStorage.getItem("cursor");return vH.includes(A??"")?A:"handPen"}catch{return"handPen"}})`,
  'default cursor state handPen'
);

// 2. hoverAt(): keep handPen cursor instead of overwriting inline scroller.style.cursor = "pointer"
src = replaceOnce(
  src,
  `const p=this.tool.k==="select"||this.tool.k==="geo"||this.tool.k==="fill";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()`,
  `const p=this.tool.k==="select"||this.tool.k==="geo"||this.tool.k==="fill";const _kh=this.host&&this.host.dataset&&this.host.dataset.cursor==="handPen";this.scroller.style.cursor=(!_kh&&(u||shId)&&p)?"pointer":"",this.redraw()`,
  'hoverAt preserve handPen cursor'
);

// 3. showPointer(): never hide handPen after idle timeout (.no-pointer)
src = replaceOnce(
  src,
  `showPointer(t){clearTimeout(this.pointerTimer),t.pointerType!=="touch"&&(this.scroller.classList.remove("no-pointer"),this.pointerTimer=window.setTimeout(()=>this.scroller.classList.add("no-pointer"),pte))}`,
  `showPointer(t){clearTimeout(this.pointerTimer),t.pointerType!=="touch"&&(this.scroller.classList.remove("no-pointer"),this.host&&this.host.dataset&&this.host.dataset.cursor==="handPen"||(this.pointerTimer=window.setTimeout(()=>this.scroller.classList.add("no-pointer"),pte)))}`,
  'showPointer never hide handPen on idle'
);

// 4. tipBoxNow() + paintPenTip(): full handPen bounds (no clipping during wet ink!) + show handPen while hovering stylus!
src = replaceOnce(
  src,
  `tipBoxNow(t){const n=this.penTip;if(!n)return null;const o=this.cursorScale;return{x0:t*(n.sx-8*o),y0:t*(n.sy-28*o),x1:t*(n.sx+28*o),y1:t*(n.sy+24*o)}}paintPenTip(t,n){const o=this.penTip,s=this.drag;if(this.tipBox=null,!o||!s||s.k==="erase"||s.k==="pan"||document.documentElement.classList.contains("mobile"))return;this.tipBox=this.tipBoxNow(n);const i=this.host.dataset.cursor;t.save(),t.setTransform(n,0,0,n,n*o.sx,n*o.sy),t.lineJoin="round",i==="handPen"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintNativeTip==="function"?window.MinNoteHandCursor.paintNativeTip(t,this.cursorScale):`,
  `tipBoxNow(t){const n=this.penTip;if(!n)return null;const o=this.cursorScale;if(this.host&&this.host.dataset&&this.host.dataset.cursor==="handPen"){const _m=window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.getNativeTipMetrics==="function"?window.MinNoteHandCursor.getNativeTipMetrics(o):{w:96,h:108};return{x0:t*(n.sx-16),y0:t*(n.sy-20),x1:t*(n.sx+_m.w+20),y1:t*(n.sy+_m.h+20)};}return{x0:t*(n.sx-8*o),y0:t*(n.sy-28*o),x1:t*(n.sx+28*o),y1:t*(n.sy+24*o)}}paintPenTip(t,n){const o=this.penTip,s=this.drag,i=this.host&&this.host.dataset?this.host.dataset.cursor:"pen";const _handHover=i==="handPen"&&!!o&&!s;if(this.tipBox=null,!o||(!s&&!_handHover)||(s&&(s.k==="erase"||s.k==="pan"))||document.documentElement.classList.contains("mobile"))return;this.tipBox=this.tipBoxNow(n);const _lx=o.hovering?2:0,_ly=o.hovering?-3:0;t.save(),t.setTransform(n,0,0,n,n*(o.sx+_lx),n*(o.sy+_ly)),t.lineJoin="round",i==="handPen"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintNativeTip==="function"?window.MinNoteHandCursor.paintNativeTip(t,this.cursorScale):`,
  'tipBoxNow full handPen box + paintPenTip stylus hover support'
);

// 5. move() hover branch: keep penTip updated while hovering with stylus (pointerType==="pen") when handPen is active!
src = replaceOnce(
  src,
  `if(!r){this.penTip=null,this.coarse=t.pointerType!=="mouse",this.hoverAt(i);return}`,
  `if(!r){const _isPenHand=t.pointerType==="pen"&&this.host&&this.host.dataset&&this.host.dataset.cursor==="handPen";const _hadTip=!!this.penTip;this.penTip=_isPenHand?{sx:o,sy:s,hovering:!0}:null;this.coarse=t.pointerType!=="mouse";this.hoverAt(i);if(_isPenHand||_hadTip)this.redraw();return}`,
  'move() keep stylus penTip visible on hover'
);

// 6. up() branch: keep penTip hovering after lifting stylus instead of vanishing until next stroke
src = replaceOnce(
  src,
  `t.pointerType==="pen"&&(this.penDown=!1,this.penAt=performance.now(),this.penTip=null)`,
  `t.pointerType==="pen"&&(this.penDown=!1,this.penAt=performance.now(),this.penTip=(this.host&&this.host.dataset&&this.host.dataset.cursor==="handPen"&&this.penTip)?{sx:this.penTip.sx,sy:this.penTip.sy,hovering:!0}:null)`,
  'up() keep stylus penTip hovering after lift'
);

fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v87-hand] Successfully patched index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
