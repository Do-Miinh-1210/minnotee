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
// Idempotent patch script: v0.0.8.4 Popover Safe-Top Viewport Clamp
// Fixes function si() in index-CTbULhps.js so tall dropdown popovers (MINNOTE HÌNH HỌC,
// MINNOTE HÌNH MẪU, etc.) NEVER shift upward over the top toolbar regardless of whether
// the tool bar is docked/floating at bottom, top, left, or right.
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V84_POPOVER_CLAMP__*/';
if (src.includes(MARKER)) {
  console.log('[v84-popover] Popover clamp patch already applied — skipping.');
  process.exit(0);
}

const oldSi = `function si({button:e,children:t,open:n,setOpen:o,align:s="left",columns:i,bySection:r}){const a=D.useRef(null),l=D.useRef(null),[c,u]=D.useState({}),p=D.useContext(zK);return D.useLayoutEffect(()=>{var v;if(!n||!a.current)return;const d=a.current.getBoundingClientRect(),_bar=a.current.closest("aside.tools-bar"),_br=_bar?_bar.getBoundingClientRect():null;if(p==="bottom"){const _top=_br?Math.min(d.top,_br.top):d.top,y=window.innerHeight-_top+8,k=Math.max(38,((v=document.querySelector(".board-wrap"))==null?void 0:v.getBoundingClientRect().top)??38),w=Math.max(120,_top-8-k-8);u(s==="right"?{bottom:y,maxHeight:w,right:Math.max(8,window.innerWidth-d.right)}:s==="center"?{bottom:y,maxHeight:w,left:d.left+d.width/2,transform:"translateX(-50%)"}:{bottom:y,maxHeight:w,left:Math.max(8,d.left)});return}if(p==="left"||p==="right"){const y=Math.max(8,d.top),k=window.innerHeight-16,_rEdge=_br?Math.max(d.right,_br.right):d.right,_lEdge=_br?Math.min(d.left,_br.left):d.left;u(p==="left"?{top:y,maxHeight:k,left:_rEdge+8}:{top:y,maxHeight:k,right:window.innerWidth-_lEdge+8});return}const m=d.bottom+6,g=window.innerHeight-m-8;u(s==="right"?{top:m,maxHeight:g,right:Math.max(8,window.innerWidth-d.right)}:s==="center"?{top:m,maxHeight:g,left:d.left+d.width/2,transform:"translateX(-50%)"}:{top:m,maxHeight:g,left:Math.max(8,d.left)})},[n,s,p]),D.useLayoutEffect(()=>{const d=l.current;if(!n||!d)return;const m=d.getBoundingClientRect();if(p==="left"||p==="right"){const g=Math.max(8,Math.min(m.top,window.innerHeight-8-m.height));Math.abs(g-m.top)>.5&&u(v=>({...v,top:g}));return}if(c.top!==void 0&&c.top>8){const S=Math.max(m.height,d.scrollHeight+2)-(window.innerHeight-8-c.top);if(S>.5){const nt=Math.max(8,c.top-Math.min(c.top-8,S)),nm=window.innerHeight-nt-8;if(Math.abs(nt-c.top)>.5){u(v=>({...v,top:nt,maxHeight:nm}));return}}}c.top===void 0&&c.bottom===void 0||c.left!==8&&(m.left<8?u(g=>({top:g.top,bottom:g.bottom,maxHeight:g.maxHeight,left:8})):m.right>window.innerWidth-8&&c.right===void 0&&u(g=>({top:g.top,bottom:g.bottom,maxHeight:g.maxHeight,right:8})))},[n,c,p])`;

const newSi = `${MARKER}function si({button:e,children:t,open:n,setOpen:o,align:s="left",columns:i,bySection:r}){const a=D.useRef(null),l=D.useRef(null),[c,u]=D.useState({}),p=D.useContext(zK),_safeTop=()=>{let st=8;try{const bw=document.querySelector(".board-wrap");if(bw){const bwr=bw.getBoundingClientRect();if(bwr.height>40&&bwr.top>st)st=Math.ceil(bwr.top)+6;}const hs=document.querySelectorAll("header.toolbar > .tb-group:first-child, header.toolbar > .tb-title, header.toolbar > .tb-palette, header.toolbar > .nb-tools-dock");hs.forEach(el=>{const er=el.getBoundingClientRect();if(er.width>0&&er.height>0&&er.top<80&&er.bottom<window.innerHeight*.4)st=Math.max(st,Math.ceil(er.bottom)+6);});}catch{}return Math.min(st,Math.max(8,window.innerHeight-180))};return D.useLayoutEffect(()=>{if(!n||!a.current)return;const d=a.current.getBoundingClientRect(),_bar=a.current.closest("aside.tools-bar"),_br=_bar?_bar.getBoundingClientRect():null,_st=_safeTop();if(p==="bottom"){const _top=_br?Math.min(d.top,_br.top):d.top,y=window.innerHeight-_top+8,w=Math.max(150,_top-8-_st);u(s==="right"?{bottom:y,maxHeight:w,right:Math.max(8,window.innerWidth-d.right)}:s==="center"?{bottom:y,maxHeight:w,left:d.left+d.width/2,transform:"translateX(-50%)"}:{bottom:y,maxHeight:w,left:Math.max(8,d.left)});return}if(p==="left"||p==="right"){const y=Math.max(_st,d.top),k=Math.max(150,window.innerHeight-_st-10),_rEdge=_br?Math.max(d.right,_br.right):d.right,_lEdge=_br?Math.min(d.left,_br.left):d.left;u(p==="left"?{top:y,maxHeight:k,left:_rEdge+8}:{top:y,maxHeight:k,right:window.innerWidth-_lEdge+8});return}const m=Math.max(_st,d.bottom+6),g=Math.max(150,window.innerHeight-m-10);u(s==="right"?{top:m,maxHeight:g,right:Math.max(8,window.innerWidth-d.right)}:s==="center"?{top:m,maxHeight:g,left:d.left+d.width/2,transform:"translateX(-50%)"}:{top:m,maxHeight:g,left:Math.max(8,d.left)})},[n,s,p]),D.useLayoutEffect(()=>{const d=l.current;if(!n||!d)return;const m=d.getBoundingClientRect(),_st=_safeTop();if(p==="left"||p==="right"){const g=Math.max(_st,Math.min(m.top,window.innerHeight-10-m.height));Math.abs(g-m.top)>.5&&u(v=>({...v,top:g,maxHeight:Math.max(150,window.innerHeight-g-10)}));return}if(c.top!==void 0&&c.top>_st){const S=Math.max(m.height,d.scrollHeight+2)-(window.innerHeight-10-c.top);if(S>.5){const nt=Math.max(_st,c.top-Math.min(c.top-_st,S)),nm=Math.max(150,window.innerHeight-nt-10);if(Math.abs(nt-c.top)>.5){u(v=>({...v,top:nt,maxHeight:nm}));return}}}c.top===void 0&&c.bottom===void 0||c.left!==8&&(m.left<8?u(g=>({top:g.top,bottom:g.bottom,maxHeight:g.maxHeight,left:8})):m.right>window.innerWidth-8&&c.right===void 0&&u(g=>({top:g.top,bottom:g.bottom,maxHeight:g.maxHeight,right:8})))},[n,c,p])`;

const idx = src.indexOf(oldSi);
if (idx === -1) throw new Error('[v84-popover] Anchor not found: function si()');
if (src.indexOf(oldSi, idx + oldSi.length) !== -1) throw new Error('[v84-popover] Anchor not unique: function si()');

src = src.slice(0, idx) + newSi + src.slice(idx + oldSi.length);
fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v84-popover] Successfully patched function si() in index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
