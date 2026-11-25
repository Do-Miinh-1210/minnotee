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
// Idempotent patch script: v0.0.8.2 Native Compact Hand-Holding-Pen Mouse Cursor
// Integrates `"handPen"` ("Tay cầm bút") directly into MinNote's native cursor system:
//   - Settings -> Con trỏ chuột (`vH`) & Cỡ con trỏ (`sH`: Nhỏ / Vừa / To / Rất to)
//   - CSS native hardware cursor `vpe(e, t)` (0ms latency, metal nib pixel-locked!)
//   - Tablet stylus cursor `Ooe` (`.tablet-cursor`)
//   - Canvas recording/preview cursor `paintTip`
//   - Exposes `window.__mnSetBoardCursor` & `window.__mnGetBoardCursor` bound to React `[df, vx]`
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_V82_NATIVE_HAND_CURSOR__*/";
if (src.includes(MARKER)) {
  console.log("[v82] Native hand-pen cursor patch already applied — skipping.");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) throw new Error(`[v82] Anchor not found: ${label}`);
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) throw new Error(`[v82] Anchor not unique: ${label}`);
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

// 1. Add VI & EN cursor labels
src = replaceOnce(
  src,
  `cursors:{pen:"Bút viết",hand:"Bàn tay",system:"Mặc định của máy",dot:"Chấm nhỏ"}`,
  `${MARKER}cursors:{pen:"Bút viết",handPen:"Tay cầm bút",hand:"Bàn tay",system:"Mặc định của máy",dot:"Chấm nhỏ"}`,
  "VI cursors label"
);
src = replaceOnce(
  src,
  `cursors:{pen:"Pen",hand:"Hand",system:"System default",dot:"Small dot"}`,
  `cursors:{pen:"Pen",handPen:"Hand pen",hand:"Hand",system:"System default",dot:"Small dot"}`,
  "EN cursors label"
);

// 2. Add "handPen" to vH cursor list
src = replaceOnce(
  src,
  `vH=["pen","hand","system","dot"]`,
  `vH=["pen","handPen","hand","system","dot"]`,
  "vH list"
);

// 3. Settings UI: icon for handPen + show Cỡ con trỏ when cursor is handPen
src = replaceOnce(
  src,
  `children:[Ne==="pen"?h.jsx(oe.pencil,{}):Ne==="hand"?h.jsx(oe.pointer,{}):Ne==="dot"?h.jsx(oe.dot,{}):h.jsx(oe.arrow,{}),kt.cursors[Ne]]},Ne))}),(_==="pen"||_==="dot")&&`,
  `children:[Ne==="pen"||Ne==="handPen"?h.jsx(oe.pencil,{}):Ne==="hand"?h.jsx(oe.pointer,{}):Ne==="dot"?h.jsx(oe.dot,{}):h.jsx(oe.arrow,{}),kt.cursors[Ne]]},Ne))}),(_==="pen"||_==="handPen"||_==="dot")&&`,
  "Settings cursor icon & size selector"
);

// 4. Native CSS hardware cursor generator `vpe(e, t)`
src = replaceOnce(
  src,
  `function vpe(e,t){const n=(o,s,i,r)=>\`url("data:image/svg+xml,\${encodeURIComponent(o.replace("SIZE",\`width='\${Math.round(s*t)}' height='\${Math.round(s*t)}'\`))}") \${Math.round(i*t)} \${Math.round(r*t)}, default\`;if(e==="pen")`,
  `function vpe(e,t){if(e==="handPen")return window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.getNativeCursorCss==="function"?window.MinNoteHandCursor.getNativeCursorCss(t):"default";const n=(o,s,i,r)=>\`url("data:image/svg+xml,\${encodeURIComponent(o.replace("SIZE",\`width='\${Math.round(s*t)}' height='\${Math.round(s*t)}'\`))}") \${Math.round(i*t)} \${Math.round(r*t)}, default\`;if(e==="pen")`,
  "vpe handPen native CSS cursor"
);

// 5. Canvas recording/preview cursor `paintTip`
src = replaceOnce(
  src,
  `i==="dot"?(t.scale(this.cursorScale,this.cursorScale),t.beginPath(),t.arc(0,0,2.6,0,Math.PI*2),t.fillStyle="#222",t.fill(),t.strokeStyle="#fff",t.lineWidth=1.2,t.stroke()):i==="system"||i==="hand"?`,
  `i==="handPen"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintNativeTip==="function"?window.MinNoteHandCursor.paintNativeTip(t,this.cursorScale):i==="dot"?(t.scale(this.cursorScale,this.cursorScale),t.beginPath(),t.arc(0,0,2.6,0,Math.PI*2),t.fillStyle="#222",t.fill(),t.strokeStyle="#fff",t.lineWidth=1.2,t.stroke()):i==="system"||i==="hand"?`,
  "paintTip handPen renderer"
);

// 6. Tablet stylus cursor `Ooe` (`.tablet-cursor`)
src = replaceOnce(
  src,
  `function Ooe({kind:e,scale:t,off:n}){const o=D.useRef(null),s=D.useRef(n);s.current=n;const i=e==="pen"||e==="dot"?e:"arrow",r=Doe[i];return D.useEffect(()=>{const a=o.current;let l=0;const c=()=>{clearTimeout(l),a.style.display="none"},u=g=>{if(g.pointerType==="pen"){if(clearTimeout(l),s.current||g.buttons&32||g.button===5)return c();a.style.display="block",a.style.transform=\`translate(\${g.clientX-r.x*t}px, \${g.clientY-r.y*t}px)\`}},p=g=>{g.pointerType==="pen"&&(clearTimeout(l),l=window.setTimeout(c,zoe))},d=g=>{g.pointerType==="pen"&&!g.relatedTarget&&c()},m={capture:!0,passive:!0};return window.addEventListener("pointerdown",u,m),window.addEventListener("pointermove",u,m),window.addEventListener("pointerup",p,m),window.addEventListener("pointercancel",c,m),window.addEventListener("pointerout",d,m),()=>{clearTimeout(l),window.removeEventListener("pointerdown",u,m),window.removeEventListener("pointermove",u,m),window.removeEventListener("pointerup",p,m),window.removeEventListener("pointercancel",c,m),window.removeEventListener("pointerout",d,m)}},[r,t]),D.useEffect(()=>{n&&o.current&&(o.current.style.display="none")},[n]),h.jsx("div",{ref:o,className:"tablet-cursor",style:{width:r.size*t,height:r.size*t,backgroundImage:\`url("data:image/svg+xml,\${encodeURIComponent(Boe[i])}")\`}})}`,
  `function Ooe({kind:e,scale:t,off:n}){const o=D.useRef(null),s=D.useRef(n);s.current=n;const isHP=e==="handPen"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.getTabletCursorInfo==="function";const hpInfo=isHP?window.MinNoteHandCursor.getTabletCursorInfo(t):null;const i=e==="pen"||e==="dot"?e:"arrow",r=hpInfo?{size:hpInfo.w,h:hpInfo.h,x:hpInfo.hotX,y:hpInfo.hotY,url:hpInfo.url,direct:!0}:Doe[i];return D.useEffect(()=>{const a=o.current;let l=0;const c=()=>{clearTimeout(l),a.style.display="none"},u=g=>{if(g.pointerType==="pen"){if(clearTimeout(l),s.current||g.buttons&32||g.button===5)return c();const ox=r.direct?r.x:r.x*t,oy=r.direct?r.y:r.y*t;a.style.display="block",a.style.transform=\`translate(\${g.clientX-ox}px, \${g.clientY-oy}px)\`}},p=g=>{g.pointerType==="pen"&&(clearTimeout(l),l=window.setTimeout(c,zoe))},d=g=>{g.pointerType==="pen"&&!g.relatedTarget&&c()},m={capture:!0,passive:!0};return window.addEventListener("pointerdown",u,m),window.addEventListener("pointermove",u,m),window.addEventListener("pointerup",p,m),window.addEventListener("pointercancel",c,m),window.addEventListener("pointerout",d,m),()=>{clearTimeout(l),window.removeEventListener("pointerdown",u,m),window.removeEventListener("pointermove",u,m),window.removeEventListener("pointerup",p,m),window.removeEventListener("pointercancel",c,m),window.removeEventListener("pointerout",d,m)}},[r,t]),D.useEffect(()=>{n&&o.current&&(o.current.style.display="none")},[n]),h.jsx("div",{ref:o,className:"tablet-cursor",style:{width:r.direct?r.size:r.size*t,height:r.direct?r.h:r.size*t,backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundImage:r.direct?\`url("\${r.url}")\`:\`url("data:image/svg+xml,\${encodeURIComponent(Boe[i])}")\`}})}`,
  "Ooe tablet-cursor handPen support"
);

// 7. Expose window.__mnSetBoardCursor / window.__mnGetBoardCursor bound directly to React [df, vx]
//    (kept strictly inside the comma-separated `const` declaration so subsequent bindings remain const!)
src = replaceOnce(
  src,
  `[df,vx]=D.useState(()=>{try{const A=localStorage.getItem("cursor");return vH.includes(A??"")?A:"pen"}catch{return"pen"}}),[pf,tv]=D.useState(u.cursorScale??1)`,
  `[df,vx]=D.useState(()=>{try{const A=localStorage.getItem("cursor");return vH.includes(A??"")?A:"pen"}catch{return"pen"}}),[pf,tv]=D.useState(u.cursorScale??1),_mnCurBridge=(window.__mnGetBoardCursor=()=>df,window.__mnSetBoardCursor=A=>{if(!vH.includes(A))return;vx(A);try{localStorage.setItem("cursor",A)}catch{}},0)`,
  "React cursor hook bridge"
);

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v82] Successfully patched index-CTbULhps.js with native compact Hand-Pen mouse cursor!");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
