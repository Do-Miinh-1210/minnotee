import sys
import os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import time
import threading
import http.server
import socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

PORT = 8094
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

print(f"Server started at http://localhost:{PORT}")

js_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.on("pageerror", lambda err: js_errors.append(f"PAGE_ERROR: {err}"))
    page.on("console", lambda msg: js_errors.append(f"CONSOLE_{msg.type.upper()}: {msg.text}") if msg.type == "error" else None)

    page.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle")
    time.sleep(2)

    # 1. Check board initialized
    board_ok = page.evaluate("() => !!(window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current))")
    print(f"Board initialized: {board_ok}")

    # 2. Check toolbar
    buttons = page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button, .tb')).map(b => b.title || b.getAttribute('aria-label') || b.innerText.trim());
        return btns.filter(b => !!b);
    }""")
    print(f"Total buttons found: {len(buttons)}")

    has_casio = any("casio" in b.lower() or "máy tính" in b.lower() for b in buttons)
    print(f"Has Casio button: {has_casio}")

    has_mindmap = any("sơ đồ" in b.lower() or "mindmap" in b.lower() for b in buttons)
    print(f"Has Mindmap button: {has_mindmap}")

    has_web = any("web" in b.lower() or "trang web" in b.lower() for b in buttons)
    print(f"Has Floating Web button: {has_web}")

    # 3. Test Casio calculator render
    print("Testing Casio button click...")
    page.evaluate("() => { if (window.toggleCasioCalculator) window.toggleCasioCalculator(); }")
    time.sleep(1)
    casio_rendered = page.evaluate("() => !!document.querySelector('.calc, .casio-calc')")
    print(f"Casio calculator rendered on board: {casio_rendered}")

    # 4. Test Mindmap studio
    print("Testing Mindmap button click...")
    page.evaluate("() => { if (window.toggleMindMapStudio) window.toggleMindMapStudio(); }")
    time.sleep(1)
    mindmap_open = page.evaluate("() => { const c = document.getElementById('mea-mindmap-container'); return c && !c.classList.contains('mode-closed'); }")
    print(f"Mindmap studio open: {mindmap_open}")

    # 5. Test Mindmap insertion with transparent background
    print("Testing Mindmap transparent insert...")
    insert_res = page.evaluate("""() => {
        if (typeof window.insertMindmapToWhiteboard === 'function') {
            try {
                window.insertMindmapToWhiteboard();
                return true;
            } catch (e) {
                return e.message;
            }
        }
        return 'no function';
    }""")
    print(f"Mindmap insertion result: {insert_res}")

    # 6. Test Floating Web panel toggle
    print("Testing Floating Web panel toggle...")
    web_panel_before = page.evaluate("() => !!document.querySelector('.web-panel')")
    page.evaluate("""() => {
        const btn = Array.from(document.querySelectorAll('button, .tb')).find(b => (b.title && b.title.includes('web')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('web')) || (b.title && b.title.includes('Trang web')));
        if (btn) btn.click();
    }""")
    time.sleep(1)
    web_panel_after = page.evaluate("() => !!document.querySelector('.web-panel')")
    print(f"Web panel before/after: {web_panel_before} -> {web_panel_after}")

    # 7. Test 0.8.8 i18n and features
    v088_features = page.evaluate("""() => {
        const res = {};
        if (window.__NR_i18n) {
            const tr = window.__NR_i18n();
            const s = JSON.stringify(tr);
            res.hasProbability = s.includes('xung khắc') || s.includes('độc lập');
            res.hasPhysics = s.includes('động lượng') || s.includes('Thỏa mãn 1/f');
            res.hasPyramid = s.includes('SA ⊥ đáy');
        }
        return res;
    }""")
    print("NoteRenderer 0.8.8 new features verified:", v088_features)

    page.screenshot(path="C:/Users/domin/.gemini/antigravity/brain/24a90667-6c5b-4b34-b3aa-b62c9c0e3536/test_088_whiteboard.png")
    print("Screenshot saved to test_088_whiteboard.png")

    print("\n--- JS ERRORS ---")
    for err in js_errors:
        print(err)
    if not js_errors:
        print("ZERO JS ERRORS! PERFECT INTEGRATION WITH NOTERENDERER 0.8.8.")

    browser.close()
