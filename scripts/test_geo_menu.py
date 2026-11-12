import sys
import http.server
import socketserver
import threading
import time
from playwright.sync_api import sync_playwright

PORT = 8097
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='Resources/Whiteboard', **kwargs)
    def log_message(self, *args):
        pass

try:
    threading.Thread(target=lambda: socketserver.TCPServer(('', PORT), Handler).serve_forever(), daemon=True).start()
except Exception:
    pass
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Test with height 600
    page = browser.new_page(viewport={'width': 1280, 'height': 600})
    page.goto(f'http://localhost:{PORT}/index.html')
    time.sleep(2)

    btn = page.locator("button[title='Dựng hình động']").first
    btn.click()
    time.sleep(0.3)
    btn.click()
    time.sleep(0.5)

    menu_info = page.evaluate("""() => {
        const m = document.querySelector('.dropdown-menu');
        if (!m) return null;
        const rect = m.getBoundingClientRect();
        const items = Array.from(m.querySelectorAll('button')).map(b => ({
            text: b.innerText.trim(),
            rect: { top: b.getBoundingClientRect().top, bottom: b.getBoundingClientRect().bottom, height: b.getBoundingClientRect().height }
        }));
        const homothety = items.find(x => x.text.includes('vị tự'));
        return {
            menuRect: { top: rect.top, bottom: rect.bottom, height: rect.height },
            windowH: window.innerHeight,
            itemsCount: items.length,
            homothety: homothety
        };
    }""")
    print('Menu info:', menu_info)
    assert menu_info is not None, 'Menu did not open'
    assert menu_info['menuRect']['bottom'] <= menu_info['windowH'], f"Menu overflowed bottom: {menu_info['menuRect']['bottom']} > {menu_info['windowH']}"
    assert menu_info['homothety']['rect']['bottom'] <= menu_info['windowH'], f"Homothety cut off: {menu_info['homothety']['rect']['bottom']}"
    page.screenshot(path='C:/Users/domin/.gemini/antigravity/brain/24a90667-6c5b-4b34-b3aa-b62c9c0e3536/test_geo_menu_before.png')
    browser.close()
