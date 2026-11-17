import sys
import os
import time
import threading
import http.server
import socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

PORT = 8101
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

    # Click "Sổ mới" if in library
    new_doc_btn = page.locator('text="Sổ mới"').first
    if new_doc_btn.is_visible():
        new_doc_btn.click()
        time.sleep(1.5)

    # 1. Select the Segment tool (Line / Đoạn thẳng)
    # In whiteboard: set tool to line/segment
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            board.setTool({ k: 'shape', t: 'segment' });
        }
    }""")
    time.sleep(0.5)

    # Draw a line from (300, 350) to (600, 350)
    page.mouse.move(300, 350)
    page.mouse.down()
    page.mouse.move(600, 350, steps=10)
    page.mouse.up()
    time.sleep(0.5)

    # Also draw a slant line from (450, 200) to (600, 350)
    page.mouse.move(450, 200)
    page.mouse.down()
    page.mouse.move(600, 350, steps=10)
    page.mouse.up()
    time.sleep(0.5)

    # 2. Switch to Select tool
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            board.setTool({ k: 'select' });
        }
    }""")
    time.sleep(0.5)

    # Move mouse away to (100, 100) (idle)
    page.mouse.move(100, 100)
    time.sleep(0.5)

    # Screenshot 1: Idle in Select Mode -> Points and lines are NOT lit up in advance!
    out_idle = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_select_mode_idle_no_glowing_points.png"
    page.screenshot(path=out_idle)
    print("1. Idle Select Mode saved (points NOT pre-lit):", out_idle)

    # Screenshot 2: Hover over the horizontal line (450, 350)
    page.mouse.move(450, 350)
    time.sleep(0.5)
    out_line_hover = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_select_mode_hover_line_lit.png"
    page.screenshot(path=out_line_hover)
    print("2. Hover Line saved (line lights up):", out_line_hover)

    # Screenshot 3: Hover over Point (300, 350)
    page.mouse.move(300, 350)
    time.sleep(0.5)
    out_pt_hover = r"C:\Users\domin\.gemini\antigravity\brain\24a90667-6c5b-4b34-b3aa-b62c9c0e3536\verify_select_mode_hover_point_lit.png"
    page.screenshot(path=out_pt_hover)
    print("3. Hover Point saved (point lights up):", out_pt_hover)

    browser.close()
    print("Interaction test completed successfully!")
