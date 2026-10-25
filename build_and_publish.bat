@echo off
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
