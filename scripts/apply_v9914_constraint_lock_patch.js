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
 * Idempotent patch for MinNote v0.0.9.14 — "cha kéo, con khóa":
 *  - EN (draggable predicate of the geometry kernel):
 *      • def.lock / point.lock ⇒ never draggable (pins a glider / any point).
 *      • t:"vec" (song song / vuông góc) ⇒ locked by default; only def.drag===true lets it slide
 *        along its fixed direction (still parallel/perpendicular). Free points & gliders unchanged.
 * Run: node scripts/apply_v9914_constraint_lock_patch.js
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
const MARKER = '/*__MN_CONSTRAINT_LOCK_V9914__*/';
const FROM = 'const EN=e=>{const d=e&&e.def;if(!d)return!1;if(d.t==="free")return!0;if(d.t==="vec")return!(';
const TO = `const EN=e=>{${MARKER}const d=e&&e.def;if(!d)return!1;if(d.lock||e.lock)return!1;if(d.t==="free")return!0;if(d.t==="vec")return d.drag===!0&&!(`;

// Floating selection bar: icon-only lock 🔒/🔓 shown whenever points are selected; hovering it shows the info popover,
// clicking toggles move-lock. Wired to window.__mnMoveLock (minnote-geo-lock-ui.js).
const BAR_MARKER = '/*__MN_MOVE_LOCK_ICON_V9914B__*/';
const BAR_FROM = 'h.jsxs("button",{title:"Ẩn/Hiện toàn bộ đối tượng đang chọn"';
const BAR_TO = `${BAR_MARKER}window.__mnMoveLock&&window.__mnMoveLock.visible(J)&&h.jsx("button",{className:"mn-move-lock-btn","aria-label":"Khóa / mở khóa di chuyển điểm",style:window.__mnMoveLock.style(J),onMouseEnter:e=>window.__mnMoveLock.showInfo(J,e.currentTarget),onMouseLeave:()=>window.__mnMoveLock.hideInfo(),onClick:e=>{window.__mnMoveLock.toggleSelection(J,e.currentTarget)},children:window.__mnMoveLock.icon(J)}),${BAR_FROM}`;
// First iteration of the button (text label) — migrated in place if present.
const OLD_BAR = '/*__MN_MOVE_LOCK_BTN_V9914__*/window.__mnMoveLock&&window.__mnMoveLock.available(J)&&h.jsxs("button",{title:window.__mnMoveLock.title(J),onClick:()=>{window.__mnMoveLock.toggleSelection(J)},children:[window.__mnMoveLock.icon(J)," ",window.__mnMoveLock.label(J)]}),';

function applyOnce(src, name, marker, from, to) {
  if (src.includes(marker)) {
    console.log(`[v9914 patch] ${name}: already applied.`);
    return src;
  }
  const hits = src.split(from).length - 1;
  if (hits !== 1) {
    console.error(`[v9914 patch] ${name}: expected exactly 1 anchor, found ${hits}. Aborting.`);
    process.exit(1);
  }
  console.log(`[v9914 patch] ${name}: patched.`);
  return src.replace(from, () => to);
}

let src = fs.readFileSync(TARGET, 'utf8');
if (src.includes(OLD_BAR)) {
  src = src.replace(OLD_BAR, '');
  console.log('[v9914 patch] removed old text-label move-lock button.');
}
src = applyOnce(src, 'EN predicate (vec locked unless drag:true, lock pins any point)', MARKER, FROM, TO);
src = applyOnce(src, 'selection-bar move-lock button', BAR_MARKER, BAR_FROM, BAR_TO);
fs.writeFileSync(TARGET, src);
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
