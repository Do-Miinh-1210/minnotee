/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
/**

 * MinNote - NoteBoard 2.5.21 Math, 3D Spatial & Science Integration Bridge

 * Connects NoteBoard symbolic math, orthographic 3D geometry, and chemical balancer

 * directly into MinNote Whiteboard engine.

 */

(() => {

  'use strict';



  function getBoard() {

    return window.__meaBoard || 

           (window.__meaBoardRef && window.__meaBoardRef.current) || 

           (typeof window.getBoard === 'function' ? window.getBoard() : null);

  }



  function notify(msg) {

    if (typeof window.showToast === 'function') {

      window.showToast(msg);

    } else {

      console.log('[MinNote Toast]', msg);

    }

  }



  // 1. Helper: Insert item into MinNote Whiteboard Canvas

  window.insertSvgOrImageToBoard = async function(dataUri, w = 480, h = 320) {
    try {
      const board = getBoard();
      if (!board) {
        if (window.MinNoteDialog) window.MinNoteDialog.alert('Bảng viết MinNote chưa sẵn sàng! Vui lòng chờ vài giây để bảng tải xong.', 'Lưu ý');
        return false;
      }

      const pw = (board.doc && board.doc.landscape) ? 1754 : 1240;
      const targetW = Math.max(100, Math.min(pw - 60, Math.round(w)));
      const targetH = Math.max(60, Math.round(h));

      // 1. Native NoteRenderer Item insertion (auto-centers in viewport, commits, and selects)
      if (typeof board.insertItem === 'function') {
        const id = 'nb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        board.insertItem({
          id,
          type: 'image',
          x: 0,
          y: 0,
          w: targetW,
          h: targetH,
          src: dataUri
        });
        if (typeof board.redraw === 'function') board.redraw();
        notify('✨ Đã chèn đối tượng vào bảng viết thành công!');
        return true;
      }

      // 2. Native NoteRenderer Image insertion
      if (typeof board.insertImage === 'function') {
        await board.insertImage(dataUri, { w: targetW, h: targetH });
        if (typeof board.redraw === 'function') board.redraw();
        notify('✨ Đã chèn đối tượng vào bảng viết thành công!');
        return true;
      }

      // 3. Fallback direct page commit
      const pageIdx = (board.sel && board.sel.page >= 0) ? board.sel.page : 
                      (typeof board.currentPage === 'function' ? board.currentPage() : 0);
      const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;
      const newX = Math.round(Math.max(30, (pw - targetW) / 2));
      const newY = Math.round(Math.max(30, (ph - targetH) / 2));

      const newItem = {
        id: 'nb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        type: 'image',
        src: dataUri,
        x: newX,
        y: newY,
        w: targetW,
        h: targetH
      };

      if (board.doc && board.doc.pages && board.doc.pages[pageIdx]) {
        board.commit(board.updatePage(pageIdx, p => ({
          ...p,
          items: [...(p.items || []), newItem]
        })));
        if (typeof board.redraw === 'function') board.redraw();
        notify('✨ Đã chèn đối tượng vào bảng viết thành công!');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[MinNote NoteBoard Bridge] Error inserting item to board:', err);
      if (window.MinNoteDialog) window.MinNoteDialog.alert('Lỗi khi chèn vào bảng: ' + err.message, 'Thông báo lỗi');
      return false;
    }
  };

  let varDialog = null;

  window.openNBVariationModal = function(defaultExpr) {

    if (!window.NBVariation) {

      if (window.MinNoteDialog) window.MinNoteDialog.alert('Chưa nạp module NoteBoard Variation. Hãy kiểm tra file assets/noteboard/math/variation.js.', 'Lưu ý');

      return;

    }

    if (varDialog) {

      varDialog.remove();

      varDialog = null;

    }



    const d = document.createElement('dialog');

    varDialog = d;

    d.className = 'nb-modal-dialog';

    d.id = 'minnoteVariationDialog';

    d.setAttribute('aria-label', 'Bảng biến thiên Toán học');

    

    d.innerHTML = `

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">

        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0d9488;display:flex;align-items:center;gap:8px;">

          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 6 5-10"/></svg>

          Xuất Bảng Biến Thiên Tự Động (Chuẩn SGK Việt Nam)

        </h3>

        <button id="varCloseX" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>

      </div>



      <div style="display:flex;flex-direction:column;gap:12px;">

        <label style="font-weight:600;color:#334155;">

          Nhập hàm số theo x:

          <input id="varExprInput" type="text" spellcheck="false" 

            placeholder="Ví dụ: y = x^3 - 3*x hoặc y = (2x+1)/(x-1) hoặc y = sqrt(x^2 - 4)" 

            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px 14px;font:15px Consolas,monospace;border:1.5px solid #cbd5e1;border-radius:8px;outline:none;" />

        </label>



        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">

          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#475569;">

            Cận trái:

            <input id="varLoInput" type="text" placeholder="-∞" style="width:90px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:Consolas,monospace;" />

          </label>

          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#475569;">

            Cận phải:

            <input id="varHiInput" type="text" placeholder="+∞" style="width:90px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:Consolas,monospace;" />

          </label>

          <button id="varPreviewBtn" style="padding:8px 18px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-left:auto;">

            Xem Trước

          </button>

        </div>



        <div style="font-size:12px;color:#64748b;line-height:1.4;">

          * Hỗ trợ đa thức mọi bậc, phân thức hữu tỉ, căn thức sqrt(f(x)), ln, log, exp, sin, cos, tan. Tự động tìm tập xác định, nghiệm f'(x)=0, dấu đạo hàm, tiệm cận đứng, ngang và chiều mũi tên biến thiên.

        </div>



        <div id="varError" style="color:#ef4444;font-size:13px;font-weight:600;min-height:20px;white-space:pre-wrap;"></div>



        <!-- Preview Box -->

        <div id="varPreviewBox" style="min-height:180px;max-height:360px;overflow:auto;display:flex;align-items:center;justify-content:center;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:10px;padding:12px;">

          <span style="color:#94a3b8;font-style:italic;">Bấm "Xem Trước" để dựng bảng biến thiên SVG vector...</span>

        </div>



        <!-- Action Buttons -->

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">

          <button id="varDownloadSvg" disabled style="padding:9px 16px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;cursor:pointer;">

            Tải SVG

          </button>

          <button id="varInsertBtn" disabled style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(13,148,136,0.3);">

            Chèn Vào Bảng MinNote

          </button>

        </div>

      </div>

    `;



    document.body.appendChild(d);

    d.showModal();



    const exprInput = d.querySelector('#varExprInput');

    const loInput = d.querySelector('#varLoInput');

    const hiInput = d.querySelector('#varHiInput');

    const previewBtn = d.querySelector('#varPreviewBtn');

    const previewBox = d.querySelector('#varPreviewBox');

    const errBox = d.querySelector('#varError');

    const insertBtn = d.querySelector('#varInsertBtn');

    const dlBtn = d.querySelector('#varDownloadSvg');

    const closeX = d.querySelector('#varCloseX');



    exprInput.value = (typeof defaultExpr === 'string' && defaultExpr.trim()) ? defaultExpr.trim() : 'y = x^3 - 3*x';



    let currentSvg = '';

    let currentModel = null;



    function renderVariation() {

      errBox.textContent = '';

      const text = exprInput.value.trim();

      if (!text) {

        errBox.textContent = 'Vui lòng nhập hàm số.';

        return;

      }

      try {

        currentModel = window.NBVariation.analyze(text, {

          lo: loInput.value.trim(),

          hi: hiInput.value.trim()

        });

        currentSvg = window.NBVariation.svg(currentModel);

        previewBox.innerHTML = currentSvg;

        const svgEl = previewBox.querySelector('svg');

        if (svgEl) {

          svgEl.style.cssText = 'max-width:100%;height:auto;max-height:320px;display:block;margin:auto;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.06));';

        }

        insertBtn.disabled = false;

        dlBtn.disabled = false;

      } catch (e) {

        currentSvg = '';

        currentModel = null;

        insertBtn.disabled = true;

        dlBtn.disabled = true;

        previewBox.innerHTML = '<span style="color:#ef4444;">Lỗi tính toán: ' + (e.message || String(e)) + '</span>';

        errBox.textContent = e.message || String(e);

      }

    }



    previewBtn.onclick = renderVariation;

    exprInput.onkeydown = (e) => {

      if (e.key === 'Enter') {

        e.preventDefault();

        renderVariation();

      }

    };



    closeX.onclick = () => d.close();

    d.addEventListener('close', () => d.remove());



    insertBtn.onclick = () => {

      if (!currentSvg) return;

      const svgEl = previewBox.querySelector('svg');

      let w = 580, h = 260;

      if (svgEl) {

        w = svgEl.viewBox?.baseVal?.width || svgEl.width?.baseVal?.value || 580;

        h = svgEl.viewBox?.baseVal?.height || svgEl.height?.baseVal?.value || 260;

      }

      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(currentSvg);

      window.insertSvgOrImageToBoard(dataUri, w, h);

      d.close();

    };



    dlBtn.onclick = () => {

      if (!currentSvg) return;

      const blob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' });

      const a = document.createElement('a');

      a.href = URL.createObjectURL(blob);

      a.download = 'bang-bien-thien.svg';

      a.click();

    };



    setTimeout(renderVariation, 60);

  };



  /* ==========================================================================

   * 4. CÂN BẰNG PHẢN ỨNG HÓA HỌC & TÍNH KHỐI LƯỢNG MOL (CHEM UNITS MODAL)

   * ========================================================================== */

  let chemDialog = null;

  window.openNBChemModal = function() {

    if (!window.NBChemUnits) {

      if (window.MinNoteDialog) window.MinNoteDialog.alert('Chưa nạp module NoteBoard ChemUnits. Hãy kiểm tra file assets/noteboard/math/chem-units.js.', 'Lưu ý');

      return;

    }

    if (chemDialog) {

      chemDialog.remove();

      chemDialog = null;

    }



    const d = document.createElement('dialog');

    chemDialog = d;

    d.className = 'nb-modal-dialog';

    d.id = 'minnoteChemDialog';

    d.setAttribute('aria-label', 'Cân bằng Hóa học');



    d.innerHTML = `

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">

        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0d9488;display:flex;align-items:center;gap:8px;">

          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>

          Cân Bằng Phản Ứng Hóa Học &amp; Tính Khối Lượng Mol

        </h3>

        <button id="chemCloseX" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>

      </div>



      <div style="display:flex;flex-direction:column;gap:14px;">

        <label style="font-weight:600;color:#334155;">

          Nhập phương trình hoặc công thức chất:

          <input id="chemInput" type="text" spellcheck="false" 

            placeholder="Ví dụ: Al + HCl -> AlCl3 + H2 hoặc KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O hoặc Fe2(SO4)3" 

            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px 14px;font:15px Consolas,monospace;border:1.5px solid #cbd5e1;border-radius:8px;outline:none;" />

        </label>



        <div style="display:flex;gap:10px;">

          <button id="chemBalanceBtn" style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;">

            Cân Bằng Phản Ứng

          </button>

          <button id="chemMassBtn" style="padding:9px 18px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;cursor:pointer;">

            Tính Khối Lượng Mol (M)

          </button>

        </div>



        <div id="chemResultBox" style="min-height:120px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;flex-direction:column;justify-content:center;gap:8px;">

          <span style="color:#94a3b8;font-style:italic;">Nhập phương trình và bấm "Cân Bằng Phản Ứng" hoặc "Tính Khối Lượng Mol"...</span>

        </div>



        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px;">

          <button id="chemInsertBtn" disabled style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(13,148,136,0.3);">

            Chèn Vào Bảng MinNote

          </button>

        </div>

      </div>

    `;



    document.body.appendChild(d);

    d.showModal();



    const input = d.querySelector('#chemInput');

    const balanceBtn = d.querySelector('#chemBalanceBtn');

    const massBtn = d.querySelector('#chemMassBtn');

    const resultBox = d.querySelector('#chemResultBox');

    const insertBtn = d.querySelector('#chemInsertBtn');

    const closeX = d.querySelector('#chemCloseX');



    input.value = 'Al + HCl -> AlCl3 + H2';



    let lastResultText = '';



    function doBalance() {
      const text = input.value.trim();
      if (!text) return;
      try {
        const balanced = window.NBChemUnits.balance(text);
        if (balanced && balanced.text) {
          lastResultText = balanced.text;
          const massList = (balanced.masses || []).map(m => `M(${m.formula}) = ${m.M}`).join(' • ');
          resultBox.innerHTML = `
            <div style="font-size:20px;font-weight:700;color:#0d9488;margin-bottom:6px;">
              ${balanced.text}
            </div>
            ${massList ? `<div style="font-size:13px;color:#0f766e;font-weight:600;margin-bottom:4px;">${massList} (g/mol)</div>` : ''}
            <div style="font-size:12px;color:#64748b;">
              Phương trình đã được cân bằng chính xác với hệ số nguyên tối giản.
            </div>
          `;
          insertBtn.disabled = false;
        } else {
          // If single molecule entered, do molar mass
          const mass = window.NBChemUnits.molarMass(text);
          if (mass) {
            doMolarMass();
            return;
          }
          resultBox.innerHTML = '<span style="color:#ef4444;">Không thể cân bằng phương trình này. Hãy kiểm tra các chất tham gia và sản phẩm.</span>';
          insertBtn.disabled = true;
        }
      } catch (err) {
        resultBox.innerHTML = '<span style="color:#ef4444;">Lỗi: ' + (err.message || String(err)) + '</span>';
        insertBtn.disabled = true;
      }
    }

    function doMolarMass() {
      const text = input.value.trim();
      if (!text) return;
      try {
        if (/->|<=>|=|\+/.test(text)) {
          const formulas = text.split(/->|<=>|=|\+/).map(s => s.trim().replace(/^\d+/, '').trim()).filter(Boolean);
          const results = [];
          for (const f of formulas) {
            const m = window.NBChemUnits.molarMass(f);
            if (m) results.push({ f, m });
          }
          if (results.length > 0) {
            lastResultText = results.map(r => `M(${r.f}) = ${r.m} g/mol`).join('   ');
            resultBox.innerHTML = `
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                ${results.map(r => `<span style="display:inline-block;background:#ccfbf1;color:#0f766e;padding:4px 10px;border-radius:6px;font-weight:700;font-size:15px;">M(${r.f}) = ${r.m} g/mol</span>`).join('')}
              </div>
              <div style="font-size:12px;color:#64748b;">Khối lượng mol của các chất theo IUPAC.</div>
            `;
            insertBtn.disabled = false;
            return;
          }
        }
        const mass = window.NBChemUnits.molarMass(text);
        if (mass) {
          lastResultText = `M(${text}) = ${mass} g/mol`;
          resultBox.innerHTML = `
            <div style="font-size:20px;font-weight:700;color:#0d9488;margin-bottom:6px;">
              M(${text}) = ${mass} g/mol
            </div>
            <div style="font-size:13px;color:#64748b;">
              Khối lượng phân tử / mol nguyên tử theo chuẩn quốc tế IUPAC.
            </div>
          `;
          insertBtn.disabled = false;
        } else {
          resultBox.innerHTML = '<span style="color:#ef4444;">Không tìm thấy công thức phân tử hợp lệ. Ví dụ: Al, HCl, AlCl3, Fe2(SO4)3...</span>';
          insertBtn.disabled = true;
        }
      } catch (err) {
        resultBox.innerHTML = '<span style="color:#ef4444;">Lỗi: ' + (err.message || String(err)) + '</span>';
        insertBtn.disabled = true;
      }
    }

    balanceBtn.onclick = doBalance;

    massBtn.onclick = doMolarMass;

    input.onkeydown = (e) => {

      if (e.key === 'Enter') {

        e.preventDefault();

        doBalance();

      }

    };



    insertBtn.onclick = () => {

      if (!lastResultText) return;

      const svg = `

        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="100" viewBox="0 0 600 100">

          <rect width="100%" height="100%" fill="#ffffff" rx="10" stroke="#0d9488" stroke-width="2"/>

          <text x="30" y="58" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="bold" fill="#0d9488">

            ${lastResultText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}

          </text>

        </svg>

      `;

      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

      window.insertSvgOrImageToBoard(dataUri, 480, 90);

      d.close();

    };



    closeX.onclick = () => d.close();

    d.addEventListener('close', () => d.remove());



    setTimeout(doBalance, 50);

  };



  window.addWritingPage = function() {

    const board = getBoard();

    if (board && typeof board.addPage === 'function') {

      board.addPage();

    }

  };



  // Cân bằng các hàng công cụ (Row 1: Quản trị + Màu + Dock; Row 2: Viết & Toán; Row 3: Lí - Hóa - Sinh)
  function balanceToolbarRows() {
    const tb = document.querySelector('header.toolbar');
    if (!tb) return;

    const tbTitle = tb.querySelector('.tb-title');
    if (!tbTitle) return;

    // 1. Đưa bảng màu lên Hàng 1 cạnh tb-title
    const colorPal = tb.querySelector('.tb-group.tools .tb-palette[aria-label*="Màu"], .tb-group.tools .tb-palette[aria-label*="Color" i]');
    if (colorPal && colorPal.parentNode !== tb) {
      tbTitle.parentNode.insertBefore(colorPal, tbTitle.nextSibling);
    }

    // 2. Đưa MinNote Quick Dock lên Hàng 1 ngay sau bảng màu
    const dock = document.getElementById('nb-tools-dock');
    const toolsGroup = tb.querySelector('.tb-group.tools');
    if (dock && toolsGroup && dock.nextSibling !== toolsGroup) {
      tb.insertBefore(dock, toolsGroup);
    }

    // 3. Phân loại các công cụ bên trong toolsGroup thành Hàng 2 (Toán & Viết) và Hàng 3 (Khoa học Lí - Hóa - Sinh)
    if (toolsGroup) {
      const scienceKeywords = [
        'hóa học', 'tuần hoàn', 'thí nghiệm', 'mạch điện', 'sơ đồ lực', 'quang hình',
        'vật lí', 'sinh học', 'sóng', 'đường sức', 'hằng số', 'công thức lí', 'cấu tạo',
        'thức ăn', 'dna', 'phân', 'phả hệ', 'sơ đồ lai', 'nguyên tử', 'lab', 'cốc',
        'dụng cụ thí nghiệm', 'sơ đồ hóa học'
      ];

      let hasScience = false;
      const children = Array.from(toolsGroup.children);
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.classList.contains('tb-row-break')) continue;
        const title = (child.getAttribute('title') || (child.querySelector('button') && child.querySelector('button').getAttribute('title')) || '').toLowerCase();
        const isScience = scienceKeywords.some(kw => title.includes(kw));
        if (isScience) {
          if (!child.classList.contains('tool-science')) {
            child.classList.add('tool-science');
            child.classList.remove('tool-math-draw');
          }
          hasScience = true;
        } else {
          if (!child.classList.contains('tool-math-draw')) {
            child.classList.add('tool-math-draw');
            child.classList.remove('tool-science');
          }
        }
      }

      let br = toolsGroup.querySelector('.tb-row-break');
      if (hasScience) {
        if (!br) {
          br = document.createElement('div');
          br.className = 'tb-row-break';
          toolsGroup.appendChild(br);
        }
        br.style.display = 'block';
      } else if (br) {
        br.style.display = 'none';
      }
    }
  }

  let tbBalanceRaf = 0;
  const tbObserver = new MutationObserver(() => {
    if (document.body && document.body.classList.contains('mn-animating')) return;
    if (tbBalanceRaf) return;
    tbBalanceRaf = requestAnimationFrame(() => {
      tbBalanceRaf = 0;
      balanceToolbarRows();
    });
  });

  const setupToolbarLayout = () => {
    balanceToolbarRows();
    tbObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToolbarLayout);
  } else {
    setupToolbarLayout();
  }

  // Nâng cao z-index và container cho MathLive Virtual Keyboard

  const setupMathVirtualKeyboard = () => {

    if (window.mathVirtualKeyboard) {

      try {

        window.mathVirtualKeyboard.container = document.body;

      } catch (e) {}

    }

  };

  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', setupMathVirtualKeyboard);

  } else {

    setupMathVirtualKeyboard();

  }



  console.log('[MinNote] NoteBoard 2.5.21 Math, 3D Spatial & Science Bridge initialized.');

})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
