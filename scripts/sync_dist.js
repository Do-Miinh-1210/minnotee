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
// Đồng bộ giao diện Resources/Whiteboard vào bản Electron (MinNote_App/resources/app.asar).
//
// Cách cũ đóng gói lại từ MinNote_App/resources/app, nhưng thư mục đó không có node_modules
// (hơn 3.200 file chỉ nằm trong app.asar), nên app.asar mới sẽ thiếu thư viện và hỏng app.
// Cách mới: giải nén app.asar hiện có → phủ Resources/Whiteboard lên dist/ → đóng gói lại.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'Resources', 'Whiteboard');
const asarFile = path.join(root, 'MinNote_App', 'resources', 'app.asar');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'minnote-asar-'));
const extracted = path.join(work, 'app');
const packed = path.join(work, 'app.asar');

function copyRecursive(s, d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
    const sp = path.join(s, entry.name);
    const dp = path.join(d, entry.name);
    if (entry.isDirectory()) copyRecursive(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}
function countFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  return n;
}

try {
  console.log('[MinNote] Extracting current app.asar...');
  execSync(`npx --yes @electron/asar extract "${asarFile}" "${extracted}"`, { stdio: 'inherit' });
  const nm = path.join(extracted, 'node_modules');
  const nmBefore = fs.existsSync(nm) ? countFiles(nm) : 0;

  console.log('[MinNote] Overlaying Resources/Whiteboard -> dist/ ...');
  copyRecursive(src, path.join(extracted, 'dist'));

  console.log('[MinNote] Packing app.asar...');
  execSync(`npx --yes @electron/asar pack "${extracted}" "${packed}"`, { stdio: 'inherit' });

  const nmAfter = fs.existsSync(nm) ? countFiles(nm) : 0;
  if (nmAfter !== nmBefore) throw new Error(`node_modules changed (${nmBefore} -> ${nmAfter}), aborting`);
  fs.copyFileSync(packed, asarFile);
  console.log(`[MinNote] app.asar updated (node_modules kept: ${nmAfter} files).`);
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
