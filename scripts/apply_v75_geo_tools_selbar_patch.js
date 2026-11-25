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

const target = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(target, 'utf8');

const anchor = 'window.MinNoteGeoParams.getLocusSelBarLabel():"Quỹ tích"]}),(J==null?void 0:J.selectionSolid())';
const snippet = 'window.MinNoteGeoParams.getLocusSelBarLabel():"Quỹ tích"]}),(window.MinNoteGeoTools&&typeof window.MinNoteGeoTools.canShowInSelBar==="function"&&window.MinNoteGeoTools.canShowInSelBar())&&h.jsxs("button",{"data-mn-gsp-trigger":"1",title:"Đo đạc động, tính toán, tách/ghép điểm, chọn cha/con",onClick:A=>window.MinNoteGeoTools.togglePopover(A),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 21L21 3"}),h.jsx("path",{d:"M14 4l6 6"}),h.jsx("path",{d:"M9 9l2 2"}),h.jsx("path",{d:"M13 5l2 2"})]})," Đo & Dựng"]}),(J==null?void 0:J.selectionSolid())';

if (src.includes('data-mn-gsp-trigger')) {
  console.log('[SKIP] Đo & Dựng selection-bar button already patched.');
} else if (!src.includes(anchor)) {
  throw new Error('[FAIL] Anchor not found in index-CTbULhps.js');
} else {
  src = src.replace(anchor, snippet);
  fs.writeFileSync(target, src, 'utf8');
  console.log('[OK] Added native React Đo & Dựng button to selection-bar!');
}
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
