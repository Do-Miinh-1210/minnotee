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
import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

PORT = 8148
DIRECTORY = os.path.abspath("Resources/Whiteboard")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        pass

def start_server():
    httpd = HTTPServer(('127.0.0.1', PORT), Handler)
    httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1)

out_dir = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 850})
    page.goto(f"http://127.0.0.1:{PORT}/index.html")
    time.sleep(2)

    btn = page.locator('text="Sổ mới"')
    if btn.is_visible():
        btn.click()
        time.sleep(1)

    page.wait_for_function("() => !!(window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard()))", timeout=15000)

    # 1. Open calculator (default Casio 580)
    page.evaluate("() => { if (typeof window.toggleCasioCalculator === 'function') window.toggleCasioCalculator(true); }")
    time.sleep(0.5)

    calc = page.locator('.calc')
    assert calc.is_visible(), "Calculator dialog is not visible!"
    page.screenshot(path=os.path.join(out_dir, "verify_casio580_clean.png"))
    print("Screenshot saved: verify_casio580_clean.png")

    # 2. Switch to Vinacal 680EX PLUS III
    page.click('.calc-switch-btn')
    time.sleep(1.5)

    # Verify .calc-vinacal-model class
    has_class = page.evaluate("() => document.querySelector('.calc').classList.contains('calc-vinacal-model')")
    print("Has .calc-vinacal-model class:", has_class)
    assert has_class, "Expected .calc-vinacal-model class on .calc!"

    # Verify iframe styles
    frame_metrics = page.evaluate("""() => {
        const ifr = document.querySelector('.calc-vinacal-iframe');
        if (!ifr || !ifr.contentWindow) return null;
        const doc = ifr.contentWindow.document;
        const stage = doc.getElementById('stage');
        const lcdFrame = doc.querySelector('.lcd-frame');
        const shell = doc.querySelector('.shell');
        return {
            stagePadding: stage ? window.getComputedStyle(stage).padding : null,
            lcdFrameLeft: lcdFrame ? window.getComputedStyle(lcdFrame).left : null,
            lcdFrameWidth: lcdFrame ? window.getComputedStyle(lcdFrame).width : null,
            shellBorderRadius: shell ? window.getComputedStyle(shell).borderRadius : null
        };
    }""")
    print("Vinacal frame metrics:", frame_metrics)

    # 3. Take screenshot of Vinacal edge-to-edge
    page.screenshot(path=os.path.join(out_dir, "verify_vinacal_edge_to_edge_clean.png"))
    print("Screenshot saved: verify_vinacal_edge_to_edge_clean.png")

    # 4. Perform calculation on Vinacal: 9 x 6 = 54
    frame_elem = page.frame_locator('.calc-vinacal-iframe')
    frame_elem.locator('button[data-id="k9"]').click()
    frame_elem.locator('button[data-id="mul"]').click()
    frame_elem.locator('button[data-id="k6"]').click()
    frame_elem.locator('button[data-id="equals"]').click()
    time.sleep(0.5)

    lcd_text = frame_elem.locator('#lcd').inner_text()
    print("Vinacal LCD calculation result:", repr(lcd_text))
    assert "54" in lcd_text, f"Expected 54 in LCD, got {lcd_text}"

    # Take screenshot of calculation result
    calc.screenshot(path=os.path.join(out_dir, "verify_vinacal_calculation_54.png"))
    print("Screenshot saved: verify_vinacal_calculation_54.png")

    # 5. Switch back to Casio 580
    page.click('.calc-switch-btn')
    time.sleep(1)
    has_class_after = page.evaluate("() => document.querySelector('.calc').classList.contains('calc-vinacal-model')")
    print("Has .calc-vinacal-model after switching back:", has_class_after)
    assert not has_class_after, "Expected NO .calc-vinacal-model class on Casio 580!"

    calc.screenshot(path=os.path.join(out_dir, "verify_casio580_after_switch_back.png"))
    print("Screenshot saved: verify_casio580_after_switch_back.png")

    browser.close()
    print("ALL VERIFICATIONS PASSED SUCCESSFULLY!")
# [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
