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
// Gắn móc bộ icon UI v2 vào bundle: oe={...}  →  oe=(globalThis.__mnIconsV2||(x=>x))({...},h)
// Không có ui-v2/icons-v2.js thì móc trả về nguyên bộ icon cũ. Chạy lại nhiều lần vẫn an toàn.
const fs = require('fs');
const file = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let s = fs.readFileSync(file, 'utf8');
const HOOK = 'oe=(globalThis.__mnIconsV2||(x=>x))(';
if (s.includes(HOOK)) { console.log('Already patched'); process.exit(0); }
const start = s.indexOf('oe={stretch:');
if (start < 0 || s.indexOf('oe={stretch:', start + 1) >= 0) throw new Error('Icon registry not found exactly once');
const pre = s.slice(Math.max(0, start - 400), start);
if (!/const Te=\(\{children:e,size:t=24,className:n\}\)=>h\.jsx\("svg"/.test(pre)) throw new Error('Unexpected context before registry');
let depth = 0, end = start + 3;
for (; end < s.length; end++) {
  const c = s[end];
  if (c === '"' || c === "'" || c === '`') { const q = c; end++; while (s[end] !== q) { if (s[end] === '\\') end++; end++; } continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) break; }
}
const body = s.slice(start + 3, end + 1);
s = s.slice(0, start) + HOOK + body + ',h)' + s.slice(end + 1);
fs.writeFileSync(file, s);
console.log('Patched icon registry (' + body.length + ' chars), next char:', JSON.stringify(s[start + HOOK.length + body.length + 2]));
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
