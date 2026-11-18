import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

PORT = 8137
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
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(f"http://127.0.0.1:{PORT}/index.html")
    time.sleep(2)

    # If library screen is open, close it or click "Sổ mới"
    btn = page.locator('text="Sổ mới"')
    if btn.is_visible():
        btn.click()
        time.sleep(1)

    page.wait_for_function("() => !!(window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard()))", timeout=15000)

    # 1. Populate board with pyramid/triangle
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            board.commit(board.updatePage(0, p => {
                const pA = { id: 'pt_A', label: 'A', def: { t: 'free', x: 300, y: 500 }, show: true };
                const pB = { id: 'pt_B', label: 'B', def: { t: 'free', x: 200, y: 650 }, show: true };
                const pC = { id: 'pt_C', label: 'C', def: { t: 'free', x: 600, y: 650 }, show: true };
                const pD = { id: 'pt_D', label: 'D', def: { t: 'free', x: 700, y: 500 }, show: true };
                const pS = { id: 'pt_S', label: 'S', def: { t: 'free', x: 450, y: 220 }, show: true };

                const shapes = [
                    { id: 'sh_AB', kind: 'segment', pts: ['pt_A', 'pt_B'], width: 2, color: '#000000', dashed: true },
                    { id: 'sh_BC', kind: 'segment', pts: ['pt_B', 'pt_C'], width: 2, color: '#000000' },
                    { id: 'sh_CD', kind: 'segment', pts: ['pt_C', 'pt_D'], width: 2, color: '#000000' },
                    { id: 'sh_DA', kind: 'segment', pts: ['pt_D', 'pt_A'], width: 2, color: '#000000', dashed: true },
                    { id: 'sh_SA', kind: 'segment', pts: ['pt_S', 'pt_A'], width: 2, color: '#000000', dashed: true },
                    { id: 'sh_SB', kind: 'segment', pts: ['pt_S', 'pt_B'], width: 2, color: '#000000' },
                    { id: 'sh_SC', kind: 'segment', pts: ['pt_S', 'pt_C'], width: 2, color: '#000000' },
                    { id: 'sh_SD', kind: 'segment', pts: ['pt_S', 'pt_D'], width: 2, color: '#000000' }
                ];

                return {
                    ...p,
                    geo: {
                        points: { pt_A: pA, pt_B: pB, pt_C: pC, pt_D: pD, pt_S: pS },
                        shapes: shapes,
                        skipped: [],
                        names: {}
                    }
                };
            }));
            board.redraw();
        }
    }""")
    time.sleep(0.5)

    # 2. Switch to fill tool (Tô miền) in 'plane' mode (Tô miền đa giác)
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        board.setTool({ k: 'fill' });
        board.setFillMode('plane');
        board.redraw();
    }""")
    time.sleep(0.5)

    # 3. Hover near point S (450, 220)
    hover_res = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        board.hoverAt({ x: 450, y: 220 });
        return {
            tool: board.tool,
            fillMode: board.fillMode,
            hover: board.hover,
            cursor: board.scroller.style.cursor
        };
    }""")
    print("Hover result near point S:", hover_res)
    assert hover_res["hover"] and hover_res["hover"]["point"] == "pt_S", f"Expected pt_S, got {hover_res['hover']}"
    assert hover_res["cursor"] == "pointer", f"Expected pointer cursor, got {hover_res['cursor']}"

    # Take screenshot of hover over point S in fill tool
    page.screenshot(path=os.path.join(out_dir, "verify_fill_hover_point_S.png"))
    print("Screenshot saved: verify_fill_hover_point_S.png")

    # 4. Pick S, then hover C
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        board.tapAt(0, { x: 450, y: 220 }); // Click S
        board.hoverAt({ x: 600, y: 650 }); // Hover C
    }""")
    time.sleep(0.3)

    pick_res = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        return {
            planePick: board.planePick,
            hover: board.hover
        };
    }""")
    print("Plane pick after clicking S and hovering C:", pick_res)
    assert pick_res["planePick"] and pick_res["planePick"]["ids"] == ["pt_S"], f"Expected ['pt_S'], got {pick_res['planePick']}"
    assert pick_res["hover"] and pick_res["hover"]["point"] == "pt_C", f"Expected hover pt_C, got {pick_res['hover']}"

    page.screenshot(path=os.path.join(out_dir, "verify_fill_plane_pick_S_hover_C.png"))
    print("Screenshot saved: verify_fill_plane_pick_S_hover_C.png")

    # Click C, Click B, Click S to complete face SBC
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        board.tapAt(0, { x: 600, y: 650 }); // Click C
        board.tapAt(0, { x: 200, y: 650 }); // Click B
        board.tapAt(0, { x: 450, y: 220 }); // Click S (close)
    }""")
    time.sleep(0.5)

    final_shapes = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        return board.doc.pages[0].geo.shapes.map(s => ({ id: s.id, kind: s.kind, pts: s.pts, fill: s.fill }));
    }""")
    print("Final shapes in geo:", final_shapes)
    poly = [s for s in final_shapes if s["kind"] == "polygon"]
    assert len(poly) > 0, "Expected polygon face created!"

    page.screenshot(path=os.path.join(out_dir, "verify_fill_face_SBC_completed.png"))
    print("Screenshot saved: verify_fill_face_SBC_completed.png")

    browser.close()
    print("ALL TESTS PASSED!")
