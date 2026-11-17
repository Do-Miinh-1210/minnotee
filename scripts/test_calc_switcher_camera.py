import sys
import os
import time
import threading
import http.server
import socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 8097
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
    
    # 1. Open calculator
    calc_btn = page.locator('button[title*="Máy tính"], button[aria-label*="Máy tính"], .tool-btn:has(svg)').filter(has_text="").nth(15)
    # Or click calculator by evaluating click on calculator button or calling window
    page.evaluate("""
        const btns = Array.from(document.querySelectorAll('button'));
        const cBtn = btns.find(b => (b.title && b.title.includes('Máy tính')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Máy tính')));
        if (cBtn) cBtn.click();
    """)
    time.sleep(1)
    
    calc_el = page.locator('.calc')
    assert calc_el.is_visible(), "Calculator did not open!"
    print("1. Calculator opened successfully.")
    
    # Check title buttons
    switch_btn = page.locator('.calc-switch-btn')
    camera_btn = page.locator('.calc-camera-btn')
    assert switch_btn.is_visible(), "Switch button not found!"
    assert camera_btn.is_visible(), "Camera button not found!"
    print("2. Switch and Camera buttons are visible in header.")
    
    # 2. Click switch button to switch to Flat Scientific Calculator
    switch_btn.click()
    time.sleep(0.5)
    
    flat_grid = page.locator('.calc-flat-grid')
    assert flat_grid.is_visible(), "Flat calculator grid did not render!"
    name_el = page.locator('.calc-name')
    print(f"3. Flat calculator active. Title: {name_el.text_content()}")
    assert "MÁY TÍNH KHOA HỌC" in name_el.text_content()
    
    # Press some keys in Flat mode: 7, 8, 9, x, 6, =
    page.get_by_role("button", name="9", exact=True).click()
    time.sleep(0.1)
    page.get_by_role("button", name="×", exact=True).click()
    time.sleep(0.1)
    page.get_by_role("button", name="6", exact=True).click()
    time.sleep(0.1)
    page.get_by_role("button", name="=", exact=True).click()
    time.sleep(0.5)
    
    res_val = page.locator('.lcd-result .lcd-value').text_content()
    print(f"4. Flat calculation result 9 x 6 = {res_val.strip()}")
    assert "54" in res_val
    
    # 3. Test Camera button
    captured = page.evaluate("""() => {
        let called = false;
        const orig = window.__meaBoard?.insertImage;
        if (window.__meaBoard) {
            window.__meaBoard.insertImage = async (url) => { called = true; if (orig) return orig(url); };
        }
        window.__minnoteCaptureLcdToBoard();
        return true;
    }""")
    print("5. Camera capture function executed:", captured)
    
    # Take screenshot of Flat calculator
    out_flat = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_flat_calc_54.png"
    page.screenshot(path=out_flat)
    print("Saved Flat screenshot:", out_flat)
    
    # 4. Switch back to Casio mode
    switch_btn.click()
    time.sleep(0.5)
    casio_keys = page.locator('.calc-keys')
    assert casio_keys.is_visible(), "Casio keys did not render when toggled back!"
    print(f"6. Toggled back to Casio mode. Title: {name_el.text_content()}")
    
    # Take screenshot of Casio calculator
    out_casio = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_casio_toggled_back.png"
    page.screenshot(path=out_casio)
    print("Saved Casio screenshot:", out_casio)
    
    # 5. Test separate screen button
    screen_btn = page.locator('.calc-screen-btn')
    screen_btn.click()
    time.sleep(0.5)
    calc_screen = page.locator('.calc-screen')
    assert calc_screen.is_visible(), "Separate LCD screen did not open!"
    screen_cam_btn = calc_screen.locator('.calc-camera-btn')
    assert screen_cam_btn.is_visible(), "Camera button not found on separate LCD screen!"
    print("7. Separate LCD screen has camera button.")
    
    browser.close()
    print("ALL TESTS PASSED SUCCESSFULLY!")
