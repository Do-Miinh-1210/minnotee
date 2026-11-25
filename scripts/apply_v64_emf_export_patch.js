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
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../Resources/Whiteboard/assets/index-CTbULhps.js');
let code = fs.readFileSync(filePath, 'utf8');

const MARKER = '__MINNOTE_V64_EMF_PATCH__';
if (code.includes(MARKER)) {
  console.log('Patch v0.0.6.4 EMF already applied.');
  process.exit(0);
}

// 1. Patch selectionImage() to render transparent 3x PNG (no white #fff background)
//    + record transparent vector SVG via window.__MinNoteEmf.createRecorder()
//    + add exportEmfSvg() method on board class for Exporting selection or full page to .emf
const selOld = 'return(async()=>{await bc([{...n,items:o.items}]);const a=16,l=3,c=document.createElement("canvas");c.width=Math.ceil((t.x1-t.x0+2*a)*l),c.height=Math.ceil((t.y1-t.y0+2*a)*l);const u=c.getContext("2d");u.fillStyle="#fff",u.fillRect(0,0,c.width,c.height),u.scale(l,l),u.translate(a-t.x0,a-t.y0);for(const p of o.items)pb(u,p);return kR(u,{...n,items:o.items,links:o.links}),gd(u,i,void 0,r),z5(u,o.strokes),c.toDataURL("image/png")})()}';
if (!code.includes(selOld)) {
  throw new Error('Could not find selectionImage() target block!');
}

const selNew = [
  'return(async()=>{',
  'await bc([{...n,items:o.items}]);',
  'const a=16,l=3,_w=Math.max(1,Math.ceil(t.x1-t.x0+2*a)),_h=Math.max(1,Math.ceil(t.y1-t.y0+2*a)),c=document.createElement("canvas");',
  'c.width=_w*l,c.height=_h*l;',
  'const u=c.getContext("2d");',
  'u.scale(l,l),u.translate(a-t.x0,a-t.y0);',
  'for(const p of o.items)pb(u,p);',
  'kR(u,{...n,items:o.items,links:o.links}),gd(u,i,void 0,r),z5(u,o.strokes);',
  'const _png=c.toDataURL("image/png");',
  'if(window.__MinNoteEmf&&typeof window.__MinNoteEmf.createRecorder==="function"){',
  'try{const _rec=window.__MinNoteEmf.createRecorder(_w,_h);_rec.translate(a-t.x0,a-t.y0);for(const p of o.items)pb(_rec,p);kR(_rec,{...n,items:o.items,links:o.links}),gd(_rec,i,void 0,r),z5(_rec,o.strokes);window.__MinNoteEmf.lastSelectionSvg=_rec.toSvgString();window.__MinNoteEmf.lastSelectionPng=_png;}catch(_e){console.warn("EMF SVG rec err",_e);window.__MinNoteEmf.lastSelectionSvg=null;}',
  '}',
  'return _png})()}',
  'async exportEmfSvg(){',
  'if(this.sel){await this.selectionImage();if(window.__MinNoteEmf&&window.__MinNoteEmf.lastSelectionSvg)return window.__MinNoteEmf.lastSelectionSvg;}',
  'if(!window.__MinNoteEmf||typeof window.__MinNoteEmf.createRecorder!=="function")return null;',
  'const _pi=typeof this.currentPage==="function"?this.currentPage():0,_n=this.doc.pages[_pi];if(!_n)return null;',
  'await bc([_n]);',
  'const _s=this.doc,_r={names:_s.names!==!1,labelSize:_s.labelSize,dots:_s.dots,labelColor:_s.labelColor,dotColor:_s.dotColor,dotSize:_s.dotSize};',
  'let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;',
  'const _ext=(x,y,pad=0)=>{if(Number.isFinite(x)&&Number.isFinite(y)){x0=Math.min(x0,x-pad);y0=Math.min(y0,y-pad);x1=Math.max(x1,x+pad);y1=Math.max(y1,y+pad);}};',
  'const _coords=Tt(_n.geo),_dotR=Pm(_r)+4,_ls=_r.labelSize??Ll;',
  'for(const _p of Object.values(_n.geo.points||{})){if(_p.hidden)continue;const _c=_coords.get(_p.id);if(_c)_ext(_c.x,_c.y,_dotR);}',
  'for(const[_id,_l]of xk(_n.geo,_coords,_r)){const _pt=_n.geo.points[_id],_len=_pt&&_pt.label?_pt.label.length:1,_hw=Math.max(_ls*.75,_ls*.42*_len+8),_hh=_ls*.8+6;_ext(_l.x-_hw,_l.y-_hh),_ext(_l.x+_hw,_l.y+_hh);}',
  'for(const _it of(_n.items||[])){if(Number.isFinite(_it.x)&&Number.isFinite(_it.y)){_ext(_it.x,_it.y),_ext(_it.x+(_it.w||0),_it.y+(_it.h||0));}}',
  'for(const _st of(_n.strokes||[])){const _pts=_st.pts||[];const _pw=(_st.width||2)*2;for(let _k=0;_k<_pts.length;_k+=3){_ext(_pts[_k],_pts[_k+1],_pw);}}',
  'if(!Number.isFinite(x0)){x0=0;y0=0;x1=Kt(_s)||800;y1=Li(_s,_n)||600;}',
  'const _pad=18,_w=Math.max(1,Math.ceil(x1-x0+2*_pad)),_h=Math.max(1,Math.ceil(y1-y0+2*_pad));',
  'const _rec=window.__MinNoteEmf.createRecorder(_w,_h);_rec.translate(_pad-x0,_pad-y0);',
  'for(const _p of(_n.items||[]))pb(_rec,_p);',
  'kR(_rec,_n),gd(_rec,_n.geo,void 0,_r),z5(_rec,_n.strokes||[]);',
  'return _rec.toSvgString();}'
].join('');

code = code.replace(selOld, selNew);

// 2. Patch lQ(e) so Ctrl+C / Copy routes through WPF WebView2 MininkEmfService + NativeClipboardService
const lqOld = 'async function lQ(e){n2=!1,u$||(u$=!0,window.addEventListener("blur",()=>n2=!1),document.addEventListener("visibilitychange",()=>n2=!1));const t=e.then(n=>{const o=atob(n.slice(n.indexOf(",")+1));return new Blob([Uint8Array.from(o,s=>s.charCodeAt(0))],{type:"image/png"})});try{await navigator.clipboard.write([new ClipboardItem({"image/png":t})])}finally{n2=!0}}';
if (!code.includes(lqOld)) {
  throw new Error('Could not find lQ() target block!');
}

const lqNew = [
  'async function lQ(e){',
  'n2=!1,u$||(u$=!0,window.addEventListener("blur",()=>n2=!1),document.addEventListener("visibilitychange",()=>n2=!1));',
  'if(window.__MinNoteEmf&&window.chrome&&window.chrome.webview){',
  'try{const _n=await e;if(_n&&window.__MinNoteEmf.copySelectionToClipboard(_n,window.__MinNoteEmf.lastSelectionSvg||"",!1))return;}catch{}finally{n2=!0}',
  'return;}',
  'const t=e.then(n=>{const o=atob(n.slice(n.indexOf(",")+1));return new Blob([Uint8Array.from(o,s=>s.charCodeAt(0))],{type:"image/png"})});',
  'try{await navigator.clipboard.write([new ClipboardItem({"image/png":t})])}finally{n2=!0}}'
].join('');

code = code.replace(lqOld, lqNew);

// 3. Add "Xuất EMF (vector không nền)..." to the Export menu
const exportMenuOld = 'Wn("export",n.exportGroup,h.jsxs(h.Fragment,{children:[h.jsxs("button",{onClick:()=>Me({k:"png"}),children:[n.exportPng,h.jsx("kbd",{children:Rt("exportPng")})]}),h.jsx("button",{onClick:()=>Me({k:"pdf"}),children:n.exportPdf})]}))';
if (!code.includes(exportMenuOld)) {
  throw new Error('Could not find export menu target block!');
}

const exportMenuNew = 'Wn("export",n.exportGroup,h.jsxs(h.Fragment,{children:[h.jsxs("button",{onClick:()=>Me({k:"png"}),children:[n.exportPng,h.jsx("kbd",{children:Rt("exportPng")})]}),h.jsx("button",{onClick:()=>Me({k:"pdf"}),children:n.exportPdf}),h.jsx("button",{onClick:()=>{xt("");const _W=s.current;if(_W&&typeof _W.exportEmfSvg==="function"){_W.exportEmfSvg().then(_svg=>{if(_svg&&window.__MinNoteEmf){const _nm=((J&&J.doc&&J.doc.title)||"MinNote")+"_vector.emf";window.__MinNoteEmf.saveEmfFile(_svg,_nm);}});}},children:"Xuất EMF (không nền)..."})]}))';

code = code.replace(exportMenuOld, exportMenuNew);

// 4. Add dedicated "EMF" button right next to "Sao chép" in the Selection bar (pure CF_ENHMETAFILE for Word/PowerPoint)
const copyBtnOld = 'h.jsxs("button",{onClick:()=>{rl(),Ln(e.mobile?n.copiedHintTouch:n.copiedHint)},children:[h.jsx(oe.copy,{})," ",n.copy]})';
if (!code.includes(copyBtnOld)) {
  throw new Error('Could not find selection copy button target block!');
}

const copyBtnNew = copyBtnOld + ',h.jsxs("button",{title:"Sao chép thuần Vector EMF (không nền) cho Word/PowerPoint",onClick:()=>{const _W=s.current;if(!_W)return;_W.selectionImage().then(_png=>{if(_png&&window.__MinNoteEmf){window.__MinNoteEmf.copySelectionToClipboard(_png,window.__MinNoteEmf.lastSelectionSvg||"",!0);}});},children:[h.jsx(oe.copy,{})," EMF"]})';

code = code.replace(copyBtnOld, copyBtnNew);

// 5. Update copiedHint VI & EN strings
code = code.replace(
  'copiedHint:"Đã chép. Đưa chuột đến chỗ muốn đặt rồi nhấn Ctrl+V, hoặc bấm nút Dán. Dán vào Word thì được ảnh PNG."',
  'copiedHint:"Đã chép ảnh vector EMF không nền (Word) & PNG tách nền (Zalo). Nhấn Ctrl+V để dán."'
);
code = code.replace(
  'copiedHint:"Copied. Put the mouse where it should go and press Ctrl+V, or press the Paste button. Pasted into Word, it is a PNG picture."',
  'copiedHint:"Copied transparent Vector EMF (Word) & transparent PNG. Press Ctrl+V to paste."'
);

// Add idempotency marker at end
code += `\n/* ${MARKER} */\n`;

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully applied v0.0.6.4 EMF Vector Export patch to index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
