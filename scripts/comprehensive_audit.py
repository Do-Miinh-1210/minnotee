import asyncio, os, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def audit():
    results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            channel='msedge',
            headless=True,
            args=['--allow-file-access-from-files', '--disable-web-security']
        )
        page = await browser.new_page(viewport={'width': 1366, 'height': 768})
        
        errors = []
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda err: errors.append(str(err)))

        html_path = os.path.abspath('Resources/Whiteboard/index.html').replace('\\', '/')
        await page.goto(f'file:///{html_path}')
        await page.wait_for_timeout(2500)

        # 0. Open notebook
        new_note = await page.query_selector('text="Sổ mới"')
        if new_note:
            await new_note.click()
            await page.wait_for_timeout(1500)

        # 1. Whiteboard Core & Tools Dock
        dock = await page.query_selector('#nb-tools-dock')
        results['dock_loaded'] = dock is not None
        print(f"1. Tools Dock loaded: {results['dock_loaded']}")

        # 2. Pen drawing test
        draw_res = await page.evaluate('''() => {
            const board = window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current);
            if (!board) return { ok: false, reason: 'no board' };
            const p0 = board.doc && board.doc.pages && board.doc.pages[0];
            const initialStrokes = (p0 && p0.strokes) ? p0.strokes.length : 0;
            return { ok: true, initialStrokes: initialStrokes };
        }''')
        results['whiteboard_draw'] = draw_res
        print(f"2. Whiteboard engine ready: {draw_res}")

        # 3. Image insertion tool
        has_img_btn = await page.query_selector('#tb-btn-insert-image')
        has_picker_fn = await page.evaluate("typeof window.openImagePickerToBoard === 'function'")
        results['image_insertion_ready'] = (has_img_btn is not None) and has_picker_fn
        print(f"3. Image insertion tool ready: {results['image_insertion_ready']}")

        # 4. Mindmap studio & transparent high-res export
        mindmap_res = await page.evaluate('''async () => {
            if (typeof window.openMindMapStudio === 'function') window.openMindMapStudio();
            else if (typeof window.toggleMindMapStudio === 'function') window.toggleMindMapStudio();
            
            // Test vector SVG generation (must NOT contain foreignObject to avoid tainted canvas)
            const svgStr = window.generateMindmapSvg ? window.generateMindmapSvg(true) : null;
            const hasSvg = !!svgStr && svgStr.includes('<svg') && !svgStr.includes('<foreignObject');
            
            // Test transparent PNG generation
            let pngDataUri = null;
            if (window.exportMindmapAsPng) {
                await new Promise(r => {
                    window.exportMindmapAsPng((data) => {
                        pngDataUri = data;
                        r();
                    }, 2);
                });
            }
            
            if (typeof window.setMindMapMode === 'function') window.setMindMapMode('closed');
            else if (typeof window.toggleMindMapStudio === 'function') window.toggleMindMapStudio();
            return {
                hasSvgWithoutForeignObject: hasSvg,
                hasPngDataUri: !!pngDataUri && pngDataUri.startsWith('data:image/png'),
                dataLen: pngDataUri ? pngDataUri.length : 0
            };
        }''')
        results['mindmap_export'] = mindmap_res
        print(f"4. Mindmap HiDPI transparent export: {mindmap_res}")
        await page.wait_for_timeout(1000)

        # 5. Casio FX 580 Calculator (Click button or invoke, check docking and live calculation)
        await page.evaluate('''() => {
            if (typeof window.openCasioCalculator === 'function') window.openCasioCalculator();
            else if (typeof window.toggleCasioCalculator === 'function') window.toggleCasioCalculator();
            else {
                const b = document.querySelector('button[title*="Casio"]');
                if (b) b.click();
            }
        }''')
        await page.wait_for_timeout(1000)

        calc_box = await page.evaluate('''() => {
            const calc = document.querySelector('.calc');
            if (!calc) return null;
            const r = calc.getBoundingClientRect();
            return {
                top: r.top,
                bottom: r.bottom,
                height: r.height,
                windowH: window.innerHeight,
                marginFromBottom: window.innerHeight - r.bottom
            };
        }''')
        
        # Click 8 * 7 =
        await page.click('.calc button:has-text("8")')
        await page.click('.calc button:has-text("×")')
        await page.click('.calc button:has-text("7")')
        await page.click('.calc button:has-text("=")')
        await page.wait_for_timeout(400)
        lcd_text = await page.evaluate('document.querySelector(".calc-lcd").innerText')

        calc_ok = calc_box is not None and calc_box['top'] <= 50 and '56' in lcd_text
        results['casio_calculator'] = {
            'ok': calc_ok,
            'box': calc_box,
            'calculationResult': lcd_text.replace('\n', ' ')
        }
        print(f"5. Casio calculator docked & functional: {results['casio_calculator']}")

        # Close calculator to keep board clean
        await page.click('.calc-close')
        await page.wait_for_timeout(300)

        # 6. Question Bank Modal (Open, Close, Click unblocked)
        await page.evaluate('''() => {
            if (typeof window.toggleQuestionBankModal === 'function') window.toggleQuestionBankModal();
            else {
                const b = document.getElementById('tb-btn-questionbank');
                if (b) b.click();
            }
        }''')
        await page.wait_for_timeout(500)
        qb_open = await page.evaluate('document.getElementById("mea-qb-modal-overlay").style.display')
        
        await page.evaluate('window.closeQuestionBankModal()')
        await page.wait_for_timeout(300)
        qb_close = await page.evaluate('''() => {
            const el = document.getElementById("mea-qb-modal-overlay");
            return {
                display: el.style.display,
                pointerEvents: el.style.pointerEvents
            };
        }''')
        results['question_bank'] = {
            'openDisplay': qb_open,
            'closeDisplay': qb_close['display'],
            'pointerEvents': qb_close['pointerEvents'],
            'unblocked': qb_close['display'] == 'none' and qb_close['pointerEvents'] == 'none'
        }
        print(f"6. Question Bank modal lifecycle: {results['question_bank']}")

        # 7. Countdown timer & Random student picker
        timer_btn = await page.query_selector('button[title="Đồng hồ đếm ngược"]')
        picker_btn = await page.query_selector('button[title="Gọi tên học sinh ngẫu nhiên"]')
        has_quick_word = await page.evaluate('typeof window.openNBWordTerminalModal === "function" || !!window.NBQuickWordTerminal')
        results['widgets'] = {
            'hasTimer': timer_btn is not None,
            'hasPicker': picker_btn is not None,
            'hasQuickWord': has_quick_word
        }
        print(f"7. Aux tools (Timer, Picker, Quick Word): {results['widgets']}")

        # 8. Error log check
        real_errors = [e for e in errors if 'font' not in e.lower() and 'favicon' not in e.lower()]
        results['real_errors'] = real_errors
        print(f"8. Real JS runtime errors: {real_errors}")

        # Overall assessment
        all_passed = (
            results['dock_loaded'] and
            results['whiteboard_draw']['ok'] and
            results['image_insertion_ready'] and
            results['mindmap_export']['hasSvgWithoutForeignObject'] and
            results['mindmap_export']['hasPngDataUri'] and
            results['casio_calculator']['ok'] and
            results['question_bank']['unblocked'] and
            results['widgets']['hasTimer'] and
            results['widgets']['hasPicker'] and
            results['widgets']['hasQuickWord'] and
            len(real_errors) == 0
        )
        print(f"\n==========================================")
        print(f"OVERALL AUDIT PASSED: {all_passed}")
        print(f"==========================================")
        
        await browser.close()
        return all_passed

if __name__ == '__main__':
    ok = asyncio.run(audit())
    sys.exit(0 if ok else 1)
