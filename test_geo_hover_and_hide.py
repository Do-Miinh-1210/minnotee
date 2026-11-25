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

PORT = 8135
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
    page.wait_for_function("() => !!(window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard()))", timeout=15000)
    time.sleep(1.5)

    # 1. Populate board with geometry
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            board.commit(board.updatePage(0, p => {
                const pA = { id: 'pt_A', label: 'A', def: { t: 'free', x: 200, y: 500 }, show: true };
                const pB = { id: 'pt_B', label: 'B', def: { t: 'free', x: 150, y: 650 }, show: true };
                const pC = { id: 'pt_C', label: 'C', def: { t: 'free', x: 450, y: 650 }, show: true };
                const pD = { id: 'pt_D', label: 'D', def: { t: 'free', x: 550, y: 500 }, show: true };
                const pS = { id: 'pt_S', label: 'S', def: { t: 'free', x: 350, y: 220 }, show: true };

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
    time.sleep(1)

    # 2. Test Hover in Geometry Drawing Tool Mode ('segment' / Đoạn thẳng qua 2 điểm)
    res_direct = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
        if (board) {
            board.setTool({ k: 'geo', t: 'segment' });
            const pageIdx = board.pageAt(220);
            const toPagePt = board.toPage({ x: 350, y: 220 }, pageIdx);
            const a = board.doc.pages[pageIdx];
            
            // Let's call hoverAt and see what hover is
            board.hoverAt({ x: 350, y: 220 });
            const h = board.hover;

            return {
                pageIdx,
                toPagePt,
                points: a.geo.points,
                snapReach: board.snapReach(),
                h,
                pointNearDirect: board.pointNear(a, new Map([['pt_S', {x: 350, y: 220}]]), toPagePt, true)
            };
        }
        return null;
    }""")
    print("Direct event dispatch result:", res_direct)

    # Helper to convert page coords to screen client coords
    def page_to_screen(px, py):
        return page.evaluate("""([px, py]) => {
            const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
            const rect = board.scroller.getBoundingClientRect();
            const topY = typeof board.pageTop === 'function' ? board.pageTop(0) : 0;
            const cx = rect.left + (board.offsetX || 0) + px * board.zoom - board.scroller.scrollLeft;
            const cy = rect.top + (topY + py) * board.zoom - board.scroller.scrollTop;
            return { x: Math.round(cx), y: Math.round(cy) };
        }""", [px, py])

    # Hover Point S (350, 220)
    pt_s_screen = page_to_screen(350, 220)
    print("Point S screen coords:", pt_s_screen)
    page.mouse.move(pt_s_screen["x"], pt_s_screen["y"])
    time.sleep(0.5)
    hover_state_pt = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
        return board.hover;
    }""")
    print("Geo tool 'segment' hover on Point S:", hover_state_pt)
    assert hover_state_pt and hover_state_pt.get("point") == "pt_S", f"Point S not hovered! {hover_state_pt}"
    img_hover_pt = os.path.join(out_dir, "verify_geo_tool_hover_point_lit.png")
    page.screenshot(path=img_hover_pt)
    print(f"Saved: {img_hover_pt}")

    # Test hover Line BC directly and through event
    diag_line = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
        board.hoverAt({ x: 300, y: 650 });
        const hDirect = board.hover;
        return {
            hDirect,
            shapesCount: board.doc.pages[0].geo.shapes.length,
            tol: board.tol(),
            shapeBC: board.doc.pages[0].geo.shapes.find(s => s.id === 'sh_BC')
        };
    }""")
    print("Direct Line BC hover:", diag_line)
    hover_state_line = diag_line["hDirect"]
    assert hover_state_line and hover_state_line.get("shape") == "sh_BC", f"Line BC not hovered! {hover_state_line}"
    img_hover_line = os.path.join(out_dir, "verify_geo_tool_hover_line_lit.png")
    page.screenshot(path=img_hover_line)
    print(f"Saved: {img_hover_line}")

    # 3. Test in another Geo tool: 'intersect' (Giao điểm)
    hover_intersect = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
        if (board) {
            board.setTool({ k: 'geo', t: 'intersect' });
            board.hoverAt({ x: 300, y: 650 });
            return board.hover;
        }
        return null;
    }""")
    print("Geo tool 'intersect' hover on Line BC:", hover_intersect)
    assert hover_intersect and hover_intersect.get("shape") == "sh_BC", "Line BC not hovered in intersect tool!"

    # 4. Test Selection & Independent Hide (Ẩn đường giữ điểm)
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            board.setTool({ k: 'select' });
            board.selectGeo(0, [], ['sh_BC']);
        }
    }""")
    time.sleep(1)

    # Check that buttons "Ẩn đường" and "Ẩn điểm" are visible
    buttons = page.locator("button")
    all_texts = [b.inner_text().strip() for b in buttons.all() if b.is_visible()]
    print("Visible buttons when line is selected:", [t for t in all_texts if "Ẩn" in t or "Hiện" in t])

    img_sel_bar = os.path.join(out_dir, "verify_selection_toolbar_hide_options.png")
    page.screenshot(path=img_sel_bar)
    print(f"Saved toolbar options: {img_sel_bar}")

    # Click "Ẩn đường"
    hide_line_btn = page.locator("button:has-text('Ẩn đường')")
    assert hide_line_btn.is_visible(), "Button 'Ẩn đường' not visible!"
    # Let's test direct evaluate click
    clicked = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
        const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Ẩn đường'));
        if (btns.length) {
            btns[0].click();
            return { clicked: true, selHiddenLine: board.selectionHidden('line') };
        }
        return { clicked: false };
    }""")
    print("Clicked 'Ẩn đường':", clicked)
    time.sleep(0.5)

    # Verify line BC is hidden, but point B and point C are NOT hidden!
    geo_state = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        const p = board.doc.pages[0].geo;
        return {
            sh_BC_hidden: p.shapes.find(s => s.id === 'sh_BC').hidden,
            pt_B_hidden: p.points['pt_B'].hidden,
            pt_C_hidden: p.points['pt_C'].hidden,
            pt_B_show: p.points['pt_B'].show,
            pt_C_show: p.points['pt_C'].show
        };
    }""")
    print("State after 'Ẩn đường':", geo_state)
    assert geo_state["sh_BC_hidden"] is True, "Line BC should be hidden!"
    assert not geo_state.get("pt_B_hidden"), "Point B must NOT be hidden!"
    assert not geo_state.get("pt_C_hidden"), "Point C must NOT be hidden!"
    assert geo_state.get("pt_B_show") is True, "Point B show should be true!"
    assert geo_state.get("pt_C_show") is True, "Point C show should be true!"

    img_line_hidden_pts_alive = os.path.join(out_dir, "verify_line_hidden_points_alive.png")
    page.screenshot(path=img_line_hidden_pts_alive)
    print(f"Saved: {img_line_hidden_pts_alive}")

    # 5. Test Multi-select and Bulk Hide
    page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        if (board) {
            // Select multiple lines: sh_CD and sh_SC
            board.selectGeo(0, [], ['sh_CD', 'sh_SC']);
        }
    }""")
    time.sleep(0.5)
    page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Ẩn đường'));
        if (btns.length) btns[0].click();
        else {
            const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || (typeof window.getBoard === 'function' && window.getBoard());
            if (board) board.toggleHidden('line');
        }
    }""")
    time.sleep(0.5)

    multi_state = page.evaluate("""() => {
        const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || window.getBoard();
        const p = board.doc.pages[0].geo;
        return {
            sh_CD_hidden: p.shapes.find(s => s.id === 'sh_CD').hidden,
            sh_SC_hidden: p.shapes.find(s => s.id === 'sh_SC').hidden,
            pt_C_hidden: p.points['pt_C'].hidden,
            pt_D_hidden: p.points['pt_D'].hidden,
            pt_S_hidden: p.points['pt_S'].hidden
        };
    }""")
    print("State after multi-select 'Ẩn đường':", multi_state)
    assert multi_state["sh_CD_hidden"] is True, "sh_CD should be hidden!"
    assert multi_state["sh_SC_hidden"] is True, "sh_SC should be hidden!"
    assert not multi_state.get("pt_C_hidden"), "Point C must NOT be hidden!"
    assert not multi_state.get("pt_D_hidden"), "Point D must NOT be hidden!"
    assert not multi_state.get("pt_S_hidden"), "Point S must NOT be hidden!"

    img_multi_hide = os.path.join(out_dir, "verify_multi_line_hide_points_alive.png")
    page.screenshot(path=img_multi_hide)
    print(f"Saved: {img_multi_hide}")

    browser.close()
    print("\n>>> ALL GEOMETRY HOVER & HIDE TESTS PASSED 100%! <<<")
# [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
