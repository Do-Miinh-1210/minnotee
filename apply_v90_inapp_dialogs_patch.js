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

const targetPath = path.join(__dirname, 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const patches = [
  {
    name: 'problemSampleReplace',
    from: 'F=Ze=>{X.trim()&&!B.includes(X.trim())&&!window.confirm(j.problemSampleReplace)||(z(Ze),requestAnimationFrame(()=>{const _t=$.current;_t&&(_t.focus(),_t.setSelectionRange(Ze.length,Ze.length),_t.scrollTop=0)}))}',
    to: 'F=async Ze=>{if(X.trim()&&!B.includes(X.trim())&&!(await window.meaConfirm(j.problemSampleReplace)))return;z(Ze),requestAnimationFrame(()=>{const _t=$.current;_t&&(_t.focus(),_t.setSelectionRange(Ze.length,Ze.length),_t.scrollTop=0)})}'
  },
  {
    name: 'confirmSignOut',
    from: 'onClick:()=>window.confirm(i.confirmSignOut)&&void e.signOut()',
    to: 'onClick:async()=>await window.meaConfirm(i.confirmSignOut)&&void e.signOut()'
  },
  {
    name: 'confirmDelete',
    from: 'Ae=ie=>{if(!window.confirm(n.confirmDelete(o[ie].name)))return;',
    to: 'Ae=async ie=>{if(!await window.meaConfirm(n.confirmDelete(o[ie].name)))return;'
  },
  {
    name: 'deleteProjectConfirm',
    from: 'ce=ie=>{const xe=(y==null?void 0:y.notebooks.filter(_e=>Kh(_e.project,ie)))??[];window.confirm(v.deleteProjectConfirm(id(ie),xe.length))&&q(async()=>{',
    to: 'ce=async ie=>{const xe=(y==null?void 0:y.notebooks.filter(_e=>Kh(_e.project,ie)))??[];await window.meaConfirm(v.deleteProjectConfirm(id(ie),xe.length))&&q(async()=>{'
  },
  {
    name: 'deleteNotebooksConfirm',
    from: 'He=()=>{const ie=be();!ie.length||!window.confirm(v.deleteNotebooksConfirm(ie.length))||q(async()=>{',
    to: 'He=async()=>{const ie=be();!ie.length||!await window.meaConfirm(v.deleteNotebooksConfirm(ie.length))||q(async()=>{'
  },
  {
    name: 'deleteNotebookConfirm',
    from: 'qe=ie=>{window.confirm(v.deleteNotebookConfirm(ie.name))&&q(async()=>{',
    to: 'qe=async ie=>{await window.meaConfirm(v.deleteNotebookConfirm(ie.name))&&q(async()=>{'
  },
  {
    name: 'discardChanges',
    from: 'else if(!window.confirm(n.discardChanges))return',
    to: 'else if(!await window.meaConfirm(n.discardChanges))return'
  },
  {
    name: 'confirmDeletePage',
    from: 'onClick:()=>window.confirm(n.confirmDeletePage)&&(J==null?void 0:J.deletePage())',
    to: 'onClick:async()=>await window.meaConfirm(n.confirmDeletePage)&&(J==null?void 0:J.deletePage())'
  },
  {
    name: 'deleteSheetConfirmTab',
    from: 'onClick:()=>window.confirm(n.deleteSheetConfirm(A.name))&&H1()',
    to: 'onClick:async()=>await window.meaConfirm(n.deleteSheetConfirm(A.name))&&H1()'
  },
  {
    name: 'deleteSheetConfirmMenu',
    from: 'onDelete:()=>{window.confirm(n.deleteSheetConfirm(kn[Jn].name))&&(H1(),Me(null))}',
    to: 'onDelete:async()=>{await window.meaConfirm(n.deleteSheetConfirm(kn[Jn].name))&&(H1(),Me(null))}'
  }
];

let applied = 0;
let already = 0;
for (const p of patches) {
  if (src.includes(p.to)) {
    already++;
    continue;
  }
  const idx = src.indexOf(p.from);
  if (idx < 0) {
    throw new Error(`Patch target not found: ${p.name}`);
  }
  const second = src.indexOf(p.from, idx + 1);
  if (second >= 0) {
    throw new Error(`Patch target appeared multiple times: ${p.name}`);
  }
  src = src.slice(0, idx) + p.to + src.slice(idx + p.from.length);
  applied++;
}

fs.writeFileSync(targetPath, src, 'utf8');
const remaining = (src.match(/window\.confirm\s*\(/g) || []).length;
console.log(`Patched index-CTbULhps.js: applied=${applied}, already=${already}, remaining window.confirm=${remaining}`);
if (remaining !== 0) {
  throw new Error(`Expected 0 remaining window.confirm calls, found ${remaining}`);
}
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
