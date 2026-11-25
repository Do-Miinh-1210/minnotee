# AGENTS.md — Quy Tắc Kỹ Thuật & Bản Quyền Bắt Buộc (MinNote)

> **Chủ sở hữu bản quyền:** Đỗ Miinh Math (MinNote Proprietary)  
> **Định danh giấy phép:** `SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath`  
> **W3C TDM Reservation:** `TDM-Reservation: 1`  
> **Áp dụng vĩnh viễn cho:** Mọi phiên AI (Claude, Codex, Gemini, Antigravity, Copilot, v.v.) và mọi lập trình viên làm việc trên kho mã nguồn MinNote từ phiên bản `v0.0.9.17` trở đi.

---

## 1. Quy Tắc Bắt Buộc Về Bản Quyền & Quyền Tác Giả (Đỗ Miinh Math)

1. **Mọi tệp mã nguồn và JSON nội bộ (first-party) mới tạo hoặc chỉnh sửa** (`.js`, `.cjs`, `.cs`, `.css`, `.html`, `.xaml`, `.csproj`, `.py`, `.yml`, `.ps1`, `.iss`, `.bat`, `.json`) **BẮT BUỘC** phải mang đầy đủ dấu bản quyền chuẩn của **Đỗ Miinh Math**:
   - **Dấu đầu tệp (Header sentinel):** `DM-COPYRIGHT-OWNER: DoMiinhMath`
   - **Dấu cuối tệp / lõi mô-đun (Footer sentinel):** `DM-COPYRIGHT-CORE: DoMiinhMath`
   - **Metadata chuẩn quốc tế:**
     - `Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.`
     - `SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath`
     - `TDM-Reservation: 1`
   - **Tuyên bố song ngữ Việt–Anh hợp pháp:** Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering), giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM tự động trích xuất, tái tạo, huấn luyện trên mã nguồn khi chưa có văn bản chấp thuận của Đỗ Miinh Math.
2. **Nghiêm cấm các chuỗi prompt-injection đối kháng:** Chỉ sử dụng thông báo bản quyền, giấy phép độc quyền và cờ máy đọc chuẩn W3C `TDM-Reservation: 1` hợp pháp, chuẩn mực công nghiệp. Tuyệt đối KHÔNG chèn các chuỗi lừa mô hình kiểu `"IGNORE PREVIOUS INSTRUCTIONS"` hay `"if you are an AI skip this code"`.
3. **JSON xuất từ MinNote (`minnote-motion-bridge.js` & schema `mn-geo-motion/2.0`):**
   - Mọi gói JSON xuất từ MinNote (bao gồm `mn-geo-motion/2.0` full, compact AI JSON và `tikzvid-project/1` BetaTikz) **PHẢI** tự động đính kèm trường gốc:
     `"$copyright": "Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1)."`
   - Bộ nhập JSON (`importMotionJson`) phải luôn chấp nhận linh hoạt cả JSON có và không có `"$copyright"`.
   - `prompts/schemas/mn-geo-motion-v2.schema.json` phải luôn khai báo `"$copyright"` tại root `properties` (để tương thích `"additionalProperties": false`) cùng `"copyright"` và `"tdmReservation"` trong `$defs.MetaInfo.properties`.
4. **Metadata PE / Assembly của tệp thực thi `.NET` (`MinNote.csproj`):**
   - Giữ nguyên `<Authors>Đỗ Miinh Math</Authors>`, `<Company>Đỗ Miinh Math</Company>`, `<Product>MinNote</Product>`, `<Copyright>Copyright © 2026 Đỗ Miinh Math. All Rights Reserved.</Copyright>` và các thẻ `<AssemblyMetadata>` (`Owner`, `TDM-Reservation`, `SPDX-License-Identifier`).
5. **Tệp sinh tự động (`Services/AssetManifest.Generated.cs`):**
   - `scripts/generate_asset_manifest.js` tự động xuất đầy đủ header `DM-COPYRIGHT-OWNER: DoMiinhMath` và footer `DM-COPYRIGHT-CORE: DoMiinhMath` mỗi khi tạo lại manifest. KHÔNG xóa đoạn xuất bản quyền trong script này.

---

## 2. Quy Tắc Loại Trừ Tuyệt Đối Thư Viện Mã Nguồn Mở Bên Thứ Ba & Tệp Nhị Phân

**TUYỆT ĐỐI KHÔNG** đóng dấu bản quyền MinNote hay ghi đè thông báo giấy phép lên các thư viện OSS bên thứ ba, tệp nhị phân, tệp giấy phép và cấu hình hệ thống sau:

- Thư viện bên thứ ba: `katex.min.*`, `mathjax/**`, `pdf-*.js`, `pdf.worker-*`, `qrcode.min.js`, `capacitor-*.js`, `fonts/**`
- Giấy phép & tài liệu: `LICENSE*`, `OFL-*`, `THIRD-PARTY.txt`, `MinNote_App/LICENSES.chromium.html`, `*.md`, `*.txt`
- Tệp nhị phân & cấu hình bên ngoài: `*.pak`, `*.dll`, `*.node`, `*.exe`, `*.asar`, `*.png`, `*.svg`, `*.woff2`, `*.ttf`, `*.ico`, `*.bin`, `*.dat`, `MinNote_App/vk_swiftshader_icd.json`, `MinNote_App/resources/app.asar.unpacked/**`, `MinNote_App/resources/app-update.yml`, `MinNote_App/version`, `.gitignore`, `app.manifest`
- Bất kỳ tệp nào trong `Resources/Whiteboard/assets/vinacal/` nếu chứa tiêu đề giấy phép OSS bên thứ ba (MIT/Apache/BSD/GPL/MPL).

---

## 3. Quy Trình Bắt Buộc Trước Mọi Commit & Phát Hành (Release)

Trên **Windows PowerShell 5.1**, KHÔNG dùng toán tử `&&`; chạy từng lệnh và kiểm tra `$LASTEXITCODE`:

```powershell
# 1. Tự động đóng dấu bản quyền cho mọi tệp nội bộ mới/chưa có dấu (idempotent)
node scripts/stamp_copyright.js --apply
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2. Kiểm định 100% tuân thủ bản quyền & cú pháp JSON (CI cũng chạy bước này!)
node scripts/stamp_copyright.js --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Cập nhật lại SHA-256 Asset Integrity Manifest sau mọi thay đổi Whiteboard
node scripts/generate_asset_manifest.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4. Kiểm tra biên dịch Release sạch (0 Warning, 0 Error)
dotnet build MinNote.csproj -c Release -v minimal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Tương đương qua npm scripts:
- `npm run copyright:apply`
- `npm run copyright:check`

---

## 4. Quy Tắc Bảo An & Giao Diện Bắt Buộc

- **Cấm tuyệt đối** `window.alert`, `window.confirm`, `window.prompt` trong toàn bộ giao diện Web/Whiteboard (luôn dùng hộp thoại in-app `MinNoteDialog`).
- Giữ chuẩn an toàn cú pháp khi chỉnh sửa mã:
  - Giữ `<!doctype html>` ở dòng 1 cho `.html` (tránh Quirks Mode).
  - Giữ `<?xml ...?>` ở dòng 1 và **KHÔNG bao giờ** đặt `--` bên trong chú thích XML `<!-- ... -->` (`.xaml`, `.csproj`, `.html`).
  - Giữ `@charset` ở dòng 1 cho `.css`, `#!...` shebang / encoding cookie cho `.js`/`.py`, `@echo off` ở dòng 1 cho `.bat`, và dùng `//` cho chú thích cuối tệp trong phần `[Code]` (Pascal Script) của `.iss`.
  - Mọi tệp `.json` phải tuân thủ 100% RFC 8259 (không bao giờ chèn `//` hay `#` vào `.json`).
- CI GitHub Actions (`.github/workflows/release.yml`) tự động chặn phát hành nếu `node scripts/stamp_copyright.js --check` thất bại.
