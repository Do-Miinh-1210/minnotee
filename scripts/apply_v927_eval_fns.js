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
// MinNote v0.0.9.27: Add sgn, trunc, arcsin, arccos, arctan support to _mnEvalExpr
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const oldBlock = `    sqrt:Math.sqrt,abs:Math.abs,floor:Math.floor,ceil:Math.ceil,round:Math.round,
    sin:x=>Math.sin(x*D2R),cos:x=>Math.cos(x*D2R),tan:x=>Math.tan(x*D2R),
    sind:x=>Math.sin(x*D2R),cosd:x=>Math.cos(x*D2R),tand:x=>Math.tan(x*D2R),
    sinr:Math.sin,cosr:Math.cos,tanr:Math.tan,
    asin:x=>Math.asin(Math.max(-1,Math.min(1,x)))*R2D,
    acos:x=>Math.acos(Math.max(-1,Math.min(1,x)))*R2D,
    atan:x=>Math.atan(x)*R2D,`;

const newBlock = `    sqrt:Math.sqrt,abs:Math.abs,floor:Math.floor,ceil:Math.ceil,round:Math.round,
    trunc:Math.trunc,sgn:x=>x>0?1:x<0?-1:0,sign:x=>x>0?1:x<0?-1:0,
    sin:x=>Math.sin(x*D2R),cos:x=>Math.cos(x*D2R),tan:x=>Math.tan(x*D2R),
    sind:x=>Math.sin(x*D2R),cosd:x=>Math.cos(x*D2R),tand:x=>Math.tan(x*D2R),
    sinr:Math.sin,cosr:Math.cos,tanr:Math.tan,
    asin:x=>Math.asin(Math.max(-1,Math.min(1,x)))*R2D,
    acos:x=>Math.acos(Math.max(-1,Math.min(1,x)))*R2D,
    atan:x=>Math.atan(x)*R2D,
    arcsin:x=>Math.asin(Math.max(-1,Math.min(1,x)))*R2D,
    arccos:x=>Math.acos(Math.max(-1,Math.min(1,x)))*R2D,
    arctan:x=>Math.atan(x)*R2D,`;

const oldBlockCrlf = oldBlock.replace(/\n/g, "\r\n");
const newBlockCrlf = newBlock.replace(/\n/g, "\r\n");

if (src.includes("trunc:Math.trunc,sgn:")) {
  console.log("[SKIP] _mnEvalExpr already has trunc/sgn/arcsin/arccos/arctan");
} else if (src.includes(oldBlockCrlf)) {
  src = src.replace(oldBlockCrlf, newBlockCrlf);
  fs.writeFileSync(targetPath, src, "utf8");
  console.log("[OK] Patched _mnEvalExpr (CRLF) with trunc, sgn, arcsin, arccos, arctan");
} else if (src.includes(oldBlock)) {
  src = src.replace(oldBlock, newBlock);
  fs.writeFileSync(targetPath, src, "utf8");
  console.log("[OK] Patched _mnEvalExpr (LF) with trunc, sgn, arcsin, arccos, arctan");
} else {
  throw new Error("Could not find _mnEvalExpr fns block!");
}
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
