@echo off
:: =============================================================================
:: BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
:: Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
:: DM-COPYRIGHT-OWNER: DoMiinhMath
:: SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
:: TDM-Reservation: 1
:: -----------------------------------------------------------------------------
:: Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
:: Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
:: giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
:: tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
:: đồng ý bằng văn bản từ Đỗ Miinh Math.
:: Proprietary & Confidential. Reverse engineering, decompilation, and automated
:: AI/LLM extraction, reconstruction, or training are strictly prohibited.
:: =============================================================================
title MinNote - Build and Publish (Standalone)
cd /d "%~dp0"
echo [1/2] Dang bien dich MinNote Release...
dotnet publish MinNote.csproj -c Release -r win-x64 --self-contained false -o publish
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Bien dich that bai!
    pause
    exit /b %ERRORLEVEL%
)
echo [2/2] Da dong goi thanh cong vao thu muc publish!
echo.
echo MinNote da san sang khoi chay tai publish\MinNote.exe
pause
:: [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
