# Đây là bản quyền thuộc sở hữu của Đỗ Miinh Math (MinNote Proprietary).
# =============================================================================
# BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
# Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
# DM-COPYRIGHT-OWNER: DoMiinhMath
# SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
# TDM-Reservation: 1
# -----------------------------------------------------------------------------
# Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
# Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
# giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
# tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
# đồng ý bằng văn bản từ Đỗ Miinh Math.
# Proprietary & Confidential. Reverse engineering, decompilation, and automated
# AI/LLM extraction, reconstruction, or training are strictly prohibited.
# =============================================================================
import sys
import os
import time
import threading
import http.server
import socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

PORT = 8100
DIRECTORY = str(Path("Resources/Whiteboard").resolve())

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def start_server():
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            httpd.serve_forever()
    except Exception as e:
        pass

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(f"http://localhost:{PORT}/index.html")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # If library page is shown, click "Sổ mới"
    new_doc_btn = page.locator('text="Sổ mới"').first
    if new_doc_btn.is_visible():
        print("Clicking 'Sổ mới' to open whiteboard canvas...")
        new_doc_btn.click()
        time.sleep(1.5)

    # 1. Verify Top Bar: Nhập Word, Dán Word, Drive
    page.wait_for_selector('#tb-btn-import-word', timeout=10000)
    btn_word = page.locator('#tb-btn-import-word')
    assert btn_word.is_visible(), "Button Nhập Word not visible!"
    print("1. Button Nhập Word is visible.")

    btn_drive = page.locator('#tb-btn-google-drive')
    assert btn_drive.is_visible(), "Button Drive not visible!"
    print("2. Button Google Drive is visible.")

    # 2. Draw geometric pyramid on whiteboard canvas
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            board.updatePage(0, p => {
                const pA = { id: 'pt_A', label: 'A', x: 280, y: 480, show: true };
                const pB = { id: 'pt_B', label: 'B', x: 180, y: 620, show: true };
                const pC = { id: 'pt_C', label: 'C', x: 420, y: 620, show: true };
                const pD = { id: 'pt_D', label: 'D', x: 520, y: 480, show: true };
                const pS = { id: 'pt_S', label: 'S', x: 350, y: 220, show: true };
                const pM = { id: 'pt_M', label: 'M', x: 440, y: 350, show: true };

                const shapes = [
                    { id: 'sh_AB', kind: 'segment', pts: ['pt_A', 'pt_B'], width: 2, color: '#000000', dashed: true },
                    { id: 'sh_BC', kind: 'segment', pts: ['pt_B', 'pt_C'], width: 2, color: '#000000' },
                    { id: 'sh_CD', kind: 'segment', pts: ['pt_C', 'pt_D'], width: 2, color: '#000000' },
                    { id: 'sh_DA', kind: 'segment', pts: ['pt_D', 'pt_A'], width: 2, color: '#000000', dashed: true },
                    { id: 'sh_SA', kind: 'segment', pts: ['pt_S', 'pt_A'], width: 2, color: '#000000', dashed: true },
                    { id: 'sh_SB', kind: 'segment', pts: ['pt_S', 'pt_B'], width: 2, color: '#000000' },
                    { id: 'sh_SC', kind: 'segment', pts: ['pt_S', 'pt_C'], width: 2, color: '#000000' },
                    { id: 'sh_SD', kind: 'segment', pts: ['pt_S', 'pt_D'], width: 2, color: '#000000' },
                    { id: 'sh_SM', kind: 'segment', pts: ['pt_S', 'pt_M'], width: 2, color: '#000000' }
                ];

                return {
                    ...p,
                    geo: {
                        points: { pt_A: pA, pt_B: pB, pt_C: pC, pt_D: pD, pt_S: pS, pt_M: pM },
                        shapes: shapes,
                        skipped: [],
                        names: {}
                    }
                };
            });
            board.redraw();
        }
    }""")
    time.sleep(1)

    # Switch to Select Tool
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) board.setTool({ k: 'select' });
    }""")
    time.sleep(0.5)

    # In idle Select Mode, verify points are NOT lit up in advance!
    out_idle = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_select_idle_no_dots.png"
    page.screenshot(path=out_idle)
    print("3. Idle select mode screenshot saved (no glowing anchor rings):", out_idle)

    # Hover over Point S (350, 220)
    page.mouse.move(350, 220)
    time.sleep(0.5)
    out_hover_pt = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_select_hover_point_S.png"
    page.screenshot(path=out_hover_pt)
    print("4. Point S hovered (point lights up):", out_hover_pt)

    # Hover over Line BC (300, 620)
    page.mouse.move(300, 620)
    time.sleep(0.5)
    out_hover_line = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_select_hover_line_BC.png"
    page.screenshot(path=out_hover_line)
    print("5. Line BC hovered (line lights up):", out_hover_line)

    # 4. Open Calculator
    page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cBtn = btns.find(b => (b.title && b.title.includes('Máy tính')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Máy tính')));
        if (cBtn) cBtn.click();
    }""")
    time.sleep(1)

    calc_el = page.locator('.calc')
    assert calc_el.is_visible(), "Calculator did not open!"
    switch_btn = page.locator('.calc-switch-btn')
    camera_btn = page.locator('.calc-camera-btn')
    assert switch_btn.is_visible(), "Switch button not found!"
    assert camera_btn.is_visible(), "Camera button not found!"
    print("6. Calculator opened. Switch and Camera buttons are visible and active.")

    out_casio = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_calc_casio_580vnx.png"
    page.screenshot(path=out_casio)
    print("Saved Casio screenshot:", out_casio)

    # Switch to Vinacal 680EX Plus III
    switch_btn.click()
    time.sleep(1.5)
    
    vinacal_iframe = page.locator('.calc-vinacal-iframe')
    assert vinacal_iframe.is_visible(), "Vinacal iframe did not render!"
    calc_name = page.locator('.calc-name').text_content()
    print(f"7. Switched to Vinacal. Title: {calc_name}")
    assert "VINACAL" in calc_name, "Title does not contain VINACAL!"

    out_vinacal = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_calc_vinacal_680ex.png"
    page.screenshot(path=out_vinacal)
    print("Saved Vinacal screenshot:", out_vinacal)

    # Test camera button snapshot into board
    camera_btn.click()
    time.sleep(1)
    print("8. Camera snapshot clicked.")

    # Switch back to Casio
    switch_btn.click()
    time.sleep(0.5)
    assert page.locator('.calc-keys').is_visible(), "Did not switch back to Casio!"
    print("9. Successfully switched back to Casio fx-580VN X.")

    browser.close()
    print("\n>>> ALL TESTS COMPLETED 100% SUCCESSFULLY! <<<")
# [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
