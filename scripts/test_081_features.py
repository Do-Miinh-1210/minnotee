import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import time
import threading
import http.server
import socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

PORT = 8093
DIRECTORY = str(Path("Resources/Whiteboard").resolve())

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle")
    time.sleep(2)

    # 1. Test 3D Spatial shapes in 0.8.1
    # Check if new pyramid shapes are present in editor or translations
    i18n_test = page.evaluate("""() => {
        const board = window.__meaBoard;
        const res = {};
        if (window.__NR_i18n) {
            const tr = window.__NR_i18n();
            res.hasPyramidTriangle = JSON.stringify(tr).includes('SA ⊥ đáy');
            res.hasFillClosed = JSON.stringify(tr).includes('Tô miền kín');
            res.hasWebPanel = JSON.stringify(tr).includes('Trang web nổi');
        }
        return res;
    }""")
    print("0.8.1 Features Verification:", i18n_test)

    # 2. Check font loading
    font_test = page.evaluate("""() => {
        return {
            stixMath: document.fonts.check('16px STIX Two Math'),
            stixText: document.fonts.check('16px STIX Two Text'),
            axMath: document.fonts.check('16px AxMath')
        };
    }""")
    print("Font availability check:", font_test)

    # 3. Test Web panel open and navigation
    web_panel_info = page.evaluate("""() => {
        const wp = document.querySelector('.web-panel');
        if (!wp) return null;
        const address = wp.querySelector('.web-address');
        const frame = wp.querySelector('iframe, webview');
        return {
            hasAddressInput: !!address,
            hasFrame: !!frame,
            frameTag: frame ? frame.tagName : null
        };
    }""")
    print("Web panel element details:", web_panel_info)

    browser.close()
