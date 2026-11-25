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

const fromStr = 'const playing=this._getActiveReplays().filter(r=>r.playing&&r.followCamera!==!1);';
const toStr = 'const playing=this._getActiveReplays().filter(r=>r.playing&&!r._editPreview&&!r.stopAfterStep&&r.followCamera!==!1);';

if (src.includes(toStr)) {
  console.log('Already patched _stepAutoFollow in index-CTbULhps.js');
} else {
  const idx = src.indexOf(fromStr);
  if (idx < 0) {
    throw new Error('Target _stepAutoFollow filter string not found in index-CTbULhps.js');
  }
  const second = src.indexOf(fromStr, idx + 1);
  if (second >= 0) {
    throw new Error('Multiple matches for _stepAutoFollow filter string in index-CTbULhps.js');
  }
  src = src.slice(0, idx) + toStr + src.slice(idx + fromStr.length);
  fs.writeFileSync(targetPath, src, 'utf8');
  console.log('Patched _stepAutoFollow in index-CTbULhps.js cleanly');
}
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
