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
// Upgrade physical on-canvas rulers, protractors, set-squares, circle/parabola rulers, and compass
// from legacy NoteRenderer burgundy handles (#650f12) to MinNote Signature Frosted Cobalt Glass.
const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(target, 'utf8');

const OLD = 'const Wee={body:"rgba(120, 144, 156, 0.26)",line:"rgba(55, 71, 79, 0.85)",text:"#263238",red:"#b71c1c",guide:"rgba(55, 71, 79, 0.35)",needle:"#37474f",halo:"rgba(255,255,255,0.9)"},Vee={body:"rgba(255, 255, 255, 0.14)",line:"rgba(255, 255, 255, 0.85)",text:"rgba(255, 255, 255, 0.95)",red:"#ff8a80",guide:"rgba(255, 255, 255, 0.4)",needle:"#eceff1",halo:"rgba(0, 0, 0, 0.55)"},RR="rgba(101,15,18,0.85)";';
const NEW = 'const Wee={body:"rgba(37, 99, 235, 0.11)",line:"rgba(15, 23, 42, 0.78)",text:"#0f172a",red:"#2563eb",guide:"rgba(37, 99, 235, 0.36)",needle:"#1e293b",halo:"rgba(255,255,255,0.96)"},Vee={body:"rgba(59, 130, 246, 0.18)",line:"rgba(226, 232, 240, 0.88)",text:"#f8fafc",red:"#60a5fa",guide:"rgba(96, 165, 250, 0.44)",needle:"#e2e8f0",halo:"rgba(15, 23, 42, 0.88)"},RR="rgba(37,99,235,0.94)";';

if (src.includes(NEW)) {
  console.log('Already patched with MinNote Cobalt Glass rulers.');
  process.exit(0);
}
if (!src.includes(OLD)) {
  console.error('Could not find legacy ruler palette block!');
  process.exit(1);
}
src = src.replace(OLD, NEW);
fs.writeFileSync(target, src, 'utf8');
console.log('Successfully upgraded canvas rulers/protractors/compass to MinNote Frosted Cobalt Glass!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
