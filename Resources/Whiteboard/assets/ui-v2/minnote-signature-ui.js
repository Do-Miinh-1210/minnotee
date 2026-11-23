/* ============================================================================
   MinNote Signature Studio UI Enhancer (v0.0.7.3)
   Non-destructive DOM enhancement layer (zero React reconciliation conflicts):
   1. Formula Editor (.formula-dialog) -> authentic MinMath Add-in workflow
      (Tabs: Trình soạn thảo / Công thức mẫu / Phím tắt, collapsible LaTeX,
      Thu gọn lại compact toggle, live category heading, Xoá & Chép LaTeX)
   2. Shapes & Geometry Popovers -> MinNote Visual Tile Studio with top
      switch strip + section filter pills + viewport clamping
   3. Floating Selection Dock -> semantic role styling (Feature pills,
      group dividers, Rose danger Delete button)
   ============================================================================ */
(function () {
  'use strict';

  const COMMON_FORMULAS = [
    { latex: '\\Delta = b^{2} - 4ac', label: 'Biệt thức Δ' },
    { latex: 'x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}', label: 'Nghiệm phương trình bậc 2' },
    { latex: 'x_1 + x_2 = -\\frac{b}{a},\\; x_1 x_2 = \\frac{c}{a}', label: 'Định lí Vi-ét' },
    { latex: '\\left(a+b\\right)^{2} = a^{2} + 2ab + b^{2}', label: 'Bình phương một tổng' },
    { latex: 'a^{2} - b^{2} = \\left(a-b\\right)\\left(a+b\\right)', label: 'Hiệu hai bình phương' },
    { latex: '\\left(a+b\\right)^{3} = a^{3} + 3a^{2}b + 3ab^{2} + b^{3}', label: 'Lập phương một tổng' },
    { latex: '\\sin^{2}x + \\cos^{2}x = 1', label: 'Hệ thức lượng giác cơ bản' },
    { latex: '\\sin 2x = 2\\sin x\\cos x', label: 'Công thức nhân đôi sin' },
    { latex: '\\cos 2x = \\cos^{2}x - \\sin^{2}x', label: 'Công thức nhân đôi cos' },
    { latex: 'a^{2} = b^{2} + c^{2} - 2bc\\cos A', label: 'Định lí côsin' },
    { latex: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R', label: 'Định lí sin' },
    { latex: 'S = \\frac{1}{2}ab\\sin C', label: 'Diện tích tam giác' },
    { latex: '\\log_{a}(bc) = \\log_{a}b + \\log_{a}c', label: 'Logarit của tích' },
    { latex: '\\lim_{x \\to x_0} f(x)', label: 'Giới hạn hàm số' },
    { latex: '\\int_{a}^{b} f(x)\\,dx', label: 'Tích phân xác định' },
    { latex: '\\begin{cases} ax + by = c \\\\ a\'x + b\'y = c\' \\end{cases}', label: 'Hệ phương trình 2 ẩn' },
    { latex: 'd(M,(P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2+B^2+C^2}}', label: 'Khoảng cách Oxyz' },
    { latex: 'C_{n}^{k} = \\frac{n!}{k!(n-k)!}', label: 'Tổ hợp chập k của n' }
  ];

  const SHORTCUT_GROUPS = [
    {
      title: 'Cấu trúc cơ bản',
      items: [
        { name: 'Phân số', key: '/', latex: '\\frac{#0}{#?}' },
        { name: 'Số mũ', key: '^', latex: '^{#0}' },
        { name: 'Chỉ số dưới', key: '_', latex: '_{#0}' },
        { name: 'Căn bậc 2', key: 'sqrt', latex: '\\sqrt{#0}' },
        { name: 'Căn bậc n', key: '\\nthroot', latex: '\\sqrt[#?]{#0}' },
        { name: 'Giá trị tuyệt đối', key: '|x|', latex: '\\left|#0\\right|' },
        { name: 'Ngoặc tròn co giãn', key: '(', latex: '\\left(#0\\right)' }
      ]
    },
    {
      title: 'Giải tích & Đại số',
      items: [
        { name: 'Tích phân xác định', key: '\\int', latex: '\\int_{#?}^{#?} #0\\,dx' },
        { name: 'Tổng sigma', key: '\\sum', latex: '\\sum_{#?}^{#?} #0' },
        { name: 'Giới hạn lim', key: '\\lim', latex: '\\lim_{x \\to #?} #0' },
        { name: 'Logarit cơ số a', key: '\\log', latex: '\\log_{#?}#0' },
        { name: 'Hệ phương trình', key: 'cases', latex: '\\begin{cases} #0 \\\\ #? \\end{cases}' },
        { name: 'Vô cực ∞', key: 'inf', latex: '\\infty' },
        { name: 'Cộng trừ ±', key: '+-', latex: '\\pm' }
      ]
    },
    {
      title: 'Hình học & Quan hệ',
      items: [
        { name: 'Vectơ AB', key: '\\vec', latex: '\\overrightarrow{AB}' },
        { name: 'Góc ABC', key: '\\widehat', latex: '\\widehat{ABC}' },
        { name: 'Vuông góc ⊥', key: '\\perp', latex: '\\perp' },
        { name: 'Song song //', key: '\\parallel', latex: '\\parallel' },
        { name: 'Suy ra ⇒', key: '=>', latex: '\\Rightarrow' },
        { name: 'Tương đương ⇔', key: '<=>', latex: '\\Leftrightarrow' },
        { name: 'Nhỏ hơn hoặc bằng ≤', key: '<=', latex: '\\le' }
      ]
    }
  ];

  function renderKatexSafe(tex) {
    try {
      if (window.katex && typeof window.katex.renderToString === 'function') {
        return window.katex.renderToString(tex, { throwOnError: false, displayMode: false });
      }
    } catch (_) {}
    return tex;
  }

  function setNativeTextareaValue(ta, value) {
    if (!ta) return;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (proto && typeof proto.set === 'function') {
      proto.set.call(ta, value);
    } else {
      ta.value = value;
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insertIntoFormulaDialog(dlg, latex) {
    const mf = dlg.querySelector('math-field.formula-field');
    const ta = dlg.querySelector('textarea.latex');
    if (mf) {
      try {
        mf.focus();
        if (typeof mf.executeCommand === 'function') {
          mf.executeCommand(['insert', latex, { insertionMode: 'replaceSelection', selectionMode: 'placeholder' }]);
        } else {
          mf.value = (mf.value || '') + latex;
        }
        mf.dispatchEvent(new Event('input', { bubbles: true }));
        if (ta && typeof mf.value === 'string') {
          setNativeTextareaValue(ta, mf.value);
        }
        return;
      } catch (_) {}
    }
    if (ta) {
      setNativeTextareaValue(ta, (ta.value || '') + latex);
    }
  }

  // --------------------------------------------------------------------------
  // 1. Formula Editor (.formula-dialog) -> Authentic MinMath Add-in Experience
  // --------------------------------------------------------------------------
  function syncFormulaCategoryHeading(dlg) {
    const itemsEl = dlg.querySelector('.palette-items');
    if (!itemsEl) return;
    const search = dlg.querySelector('.palette-search');
    const q = search ? search.value.trim() : '';
    if (q) {
      itemsEl.setAttribute('data-mnm-cat', 'Kết quả tìm kiếm: "' + q + '"');
      return;
    }
    const activeCat = dlg.querySelector('.palette-category.active');
    if (activeCat) {
      // Strip icon span text cleanly
      const clone = activeCat.cloneNode(true);
      const ic = clone.querySelector('.palette-category-icon');
      if (ic) ic.remove();
      const name = (clone.textContent || '').trim();
      if (name) itemsEl.setAttribute('data-mnm-cat', name);
    }
  }

  function enhanceFormulaDialog(dlg) {
    if (!dlg || dlg.dataset.mnmReady === '1') {
      if (dlg) syncFormulaCategoryHeading(dlg);
      return;
    }
    dlg.dataset.mnmReady = '1';
    dlg.classList.add('mnm-enhanced');
    dlg.setAttribute('data-mnm-tab', 'editor');

    // A. Build MinMath Top Header Bar inside .dialog-head
    const head = dlg.querySelector('.dialog-head');
    const closeBtn = head ? head.querySelector('.dialog-close') : null;
    if (head && !head.querySelector('.mnm-head-bar')) {
      const bar = document.createElement('div');
      bar.className = 'mnm-head-bar';
      bar.innerHTML =
        '<div class="mnm-head-tabs" role="tablist">' +
          '<button type="button" class="mnm-head-tab active" data-mnm-tab-btn="editor">Trình soạn thảo</button>' +
          '<button type="button" class="mnm-head-tab" data-mnm-tab-btn="common">Công thức mẫu</button>' +
          '<button type="button" class="mnm-head-tab" data-mnm-tab-btn="keys">Phím tắt</button>' +
        '</div>' +
        '<span class="mnm-head-hint">gõ nhanh: &ldquo;/&rdquo; phân số, &ldquo;^&rdquo; mũ, &ldquo;_&rdquo; chỉ số, &ldquo;sqrt&rdquo; căn</span>' +
        '<button type="button" class="mnm-collapse-btn" data-mnm-compact-btn title="Thu gọn bảng ký hiệu để nhập nhanh">' +
          '<span data-mnm-compact-txt>↙ Thu gọn lại</span>' +
        '</button>';

      if (closeBtn) head.insertBefore(bar, closeBtn);
      else head.appendChild(bar);

      bar.addEventListener('mousedown', function (e) {
        if (e.target.closest('button')) e.preventDefault();
      });
      bar.addEventListener('click', function (e) {
        const tabBtn = e.target.closest('[data-mnm-tab-btn]');
        if (tabBtn) {
          const tab = tabBtn.getAttribute('data-mnm-tab-btn');
          setActiveTab(tab);
          return;
        }
        if (e.target.closest('[data-mnm-compact-btn]')) {
          const compact = dlg.classList.toggle('mnm-compact');
          const txt = bar.querySelector('[data-mnm-compact-txt]');
          if (txt) txt.textContent = compact ? '↗ Mở rộng' : '↙ Thu gọn lại';
        }
      });
    }

    function setActiveTab(tab) {
      if (dlg.classList.contains('mnm-compact')) {
        dlg.classList.remove('mnm-compact');
        const txt = dlg.querySelector('[data-mnm-compact-txt]');
        if (txt) txt.textContent = '↙ Thu gọn lại';
      }
      dlg.setAttribute('data-mnm-tab', tab);
      dlg.querySelectorAll('[data-mnm-tab-btn]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-mnm-tab-btn') === tab);
      });
    }

    // B. Enhance Left Palette Nav (Search placeholder + Pinned Common Formulas button)
    const nav = dlg.querySelector('.palette-nav');
    const search = dlg.querySelector('.palette-search');
    if (search) {
      search.placeholder = 'Tìm ký hiệu: phân số, vectơ, tích phân...';
      search.addEventListener('input', function () {
        setTimeout(function () { syncFormulaCategoryHeading(dlg); }, 0);
      });
    }
    if (nav && !nav.querySelector('.mnm-common-pin')) {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'mnm-common-pin';
      pin.innerHTML = '<span class="palette-category-icon">Δ=</span><span>Công thức thường dùng</span>';
      pin.addEventListener('mousedown', function (e) { e.preventDefault(); });
      pin.addEventListener('click', function () { setActiveTab('common'); });
      const cats = nav.querySelector('.palette-categories');
      if (cats) nav.insertBefore(pin, cats);
      else nav.appendChild(pin);
    }

    const catsWrap = dlg.querySelector('.palette-categories');
    if (catsWrap) {
      catsWrap.addEventListener('click', function () {
        setTimeout(function () { syncFormulaCategoryHeading(dlg); }, 0);
      });
    }

    // C. Inject Common Formulas & Shortcuts Tab Panes inside .math-palette (siblings of .palette)
    const mathPal = dlg.querySelector('.math-palette');
    const quickBar = mathPal ? mathPal.querySelector('.palette-quick') : null;
    if (mathPal && !mathPal.querySelector('.mnm-extra-pane')) {
      const commonPane = document.createElement('div');
      commonPane.className = 'mnm-extra-pane';
      commonPane.setAttribute('data-pane', 'common');
      commonPane.innerHTML =
        '<div style="font-size:13.5px;font-weight:700;margin:0 0 8px 2px;">Công thức thường dùng</div>' +
        '<div class="mnm-common-grid">' +
          COMMON_FORMULAS.map(function (f, i) {
            return '<button type="button" class="mnm-common-card" data-common-idx="' + i + '" title="' + f.label + '">' +
              '<span class="mnm-common-math">' + renderKatexSafe(f.latex) + '</span>' +
              '<span class="mnm-common-lbl">' + f.label + '</span>' +
            '</button>';
          }).join('') +
        '</div>';
      commonPane.addEventListener('mousedown', function (e) { e.preventDefault(); });
      commonPane.addEventListener('click', function (e) {
        const card = e.target.closest('[data-common-idx]');
        if (!card) return;
        const item = COMMON_FORMULAS[Number(card.getAttribute('data-common-idx'))];
        if (item) insertIntoFormulaDialog(dlg, item.latex);
      });

      const keysPane = document.createElement('div');
      keysPane.className = 'mnm-extra-pane';
      keysPane.setAttribute('data-pane', 'keys');
      keysPane.innerHTML =
        '<div class="mnm-keys-cols">' +
          SHORTCUT_GROUPS.map(function (grp, gi) {
            return '<div class="mnm-keys-group">' +
              '<h4>' + grp.title + '</h4>' +
              grp.items.map(function (it, ii) {
                return '<button type="button" class="mnm-key-row" data-kgrp="' + gi + '" data-kidx="' + ii + '">' +
                  '<span>' + it.name + '</span><kbd>' + it.key + '</kbd>' +
                '</button>';
              }).join('') +
            '</div>';
          }).join('') +
        '</div>';
      keysPane.addEventListener('mousedown', function (e) { e.preventDefault(); });
      keysPane.addEventListener('click', function (e) {
        const row = e.target.closest('[data-kgrp]');
        if (!row) return;
        const g = SHORTCUT_GROUPS[Number(row.getAttribute('data-kgrp'))];
        const it = g && g.items[Number(row.getAttribute('data-kidx'))];
        if (it) insertIntoFormulaDialog(dlg, it.latex);
      });

      if (quickBar) {
        mathPal.insertBefore(commonPane, quickBar);
        mathPal.insertBefore(keysPane, quickBar);
      } else {
        mathPal.appendChild(commonPane);
        mathPal.appendChild(keysPane);
      }
    }

    // D. Inject MinMath Utility Row (LaTeX drawer toggle, Xoá, Chép LaTeX) right above .row
    const body = dlg.querySelector('.dialog-body');
    const optRow = body ? body.querySelector('.row') : null;
    if (body && optRow && !body.querySelector('.mnm-util-bar')) {
      const util = document.createElement('div');
      util.className = 'mnm-util-bar';
      util.innerHTML =
        '<button type="button" class="mnm-util-link" data-mnm-act="latex">LaTeX</button>' +
        '<button type="button" class="mnm-util-link" data-mnm-act="clear">Xoá</button>' +
        '<button type="button" class="mnm-util-link" data-mnm-act="copy">Chép LaTeX</button>' +
        '<span class="mnm-util-status" data-mnm-status></span>';

      body.insertBefore(util, optRow);

      util.addEventListener('mousedown', function (e) {
        if (e.target.closest('button')) e.preventDefault();
      });
      util.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mnm-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-mnm-act');
        const statusEl = util.querySelector('[data-mnm-status]');
        const mf = dlg.querySelector('math-field.formula-field');
        const ta = dlg.querySelector('textarea.latex');

        if (act === 'latex') {
          const open = dlg.classList.toggle('mnm-latex-open');
          btn.classList.toggle('on', open);
          if (open && ta) ta.focus();
        } else if (act === 'clear') {
          if (mf) {
            try { mf.value = ''; mf.dispatchEvent(new Event('input', { bubbles: true })); mf.focus(); } catch (_) {}
          }
          if (ta) setNativeTextareaValue(ta, '');
        } else if (act === 'copy') {
          const val = (mf && mf.value) || (ta && ta.value) || '';
          if (val && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(val).catch(function () {});
          }
          if (statusEl) {
            statusEl.textContent = val ? 'Đã chép LaTeX ✓' : 'Chưa có công thức';
            setTimeout(function () { statusEl.textContent = ''; }, 1800);
          }
        }
      });
    }

    syncFormulaCategoryHeading(dlg);
  }

  // --------------------------------------------------------------------------
  // 2. Shapes & Geometry Studio Popovers (.dropdown-menu.columns)
  // --------------------------------------------------------------------------
  function enhanceStudioPopover(menu) {
    if (!menu || menu.dataset.mnPopReady === '1') return;
    // Detect Shapes or Geo popover by presence of "Kịch bản dựng hình" or .menu-section
    const sections = Array.from(menu.querySelectorAll('.menu-section'));
    if (sections.length < 2) return;
    const txt = menu.textContent || '';
    const isShapesOrGeo = txt.includes('Kịch bản dựng hình') || txt.includes('Bắt điểm lưới');
    if (!isShapesOrGeo) return;

    menu.dataset.mnPopReady = '1';
    const isGeo = menu.classList.contains('by-section') || !!menu.querySelector('.menu-stack');
    menu.classList.add('mn-studio-pop', isGeo ? 'mn-geo-pop' : 'mn-shapes-pop');

    // Classify sections non-destructively via data-mn-sec
    const filterItems = [{ id: 'all', label: 'Tất cả' }];
    let secIdx = 0;
    sections.forEach(function (sec) {
      const headingEl = sec.querySelector('.menu-heading');
      const hTxt = headingEl ? headingEl.textContent.trim() : '';
      const hasScriptBtn = (sec.textContent || '').includes('Kịch bản dựng hình');
      if (hasScriptBtn) {
        sec.setAttribute('data-mn-sec', 'options');
        // Cleanly shorten verbose "▶ Kịch bản dựng hình" only via tooltip? Keep text clear and concise.
      } else {
        const slug = 'sec-' + (++secIdx);
        sec.setAttribute('data-mn-sec', slug);
        if (hTxt) {
          // Title-case compact chip label
          const nice = hTxt.charAt(0).toUpperCase() + hTxt.slice(1).toLowerCase();
          filterItems.push({ id: slug, label: nice });
        }
      }
    });

    // Prepend compact non-destructive filter bar
    const filterBar = document.createElement('div');
    filterBar.className = 'mn-pop-filter';
    filterBar.innerHTML =
      '<div class="mn-pop-filter-tabs">' +
        filterItems.map(function (f, idx) {
          return '<button type="button" class="mn-pop-ftab' + (idx === 0 ? ' active' : '') + '" data-mn-f="' + f.id + '">' + f.label + '</button>';
        }).join('') +
      '</div>' +
      '<span class="mn-pop-brand">' + (isGeo ? 'MinNote Hình học' : 'MinNote Hình mẫu') + '</span>';

    filterBar.addEventListener('click', function (e) {
      e.stopPropagation();
      const btn = e.target.closest('[data-mn-f]');
      if (!btn) return;
      const target = btn.getAttribute('data-mn-f');
      filterBar.querySelectorAll('.mn-pop-ftab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      menu.setAttribute('data-mn-filtered', target === 'all' ? '0' : '1');
      sections.forEach(function (sec) {
        const sid = sec.getAttribute('data-mn-sec');
        if (sid === 'options') return;
        sec.classList.toggle('mn-sec-hidden', target !== 'all' && sid !== target);
      });
    });

    menu.insertBefore(filterBar, menu.firstChild);

    // Clamp popover cleanly inside viewport horizontally after layout
    requestAnimationFrame(function () {
      try {
        const r = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        if (r.right > vw - 10) {
          menu.style.left = Math.max(10, vw - r.width - 10) + 'px';
          menu.style.right = 'auto';
        }
        if (r.left < 10) {
          menu.style.left = '10px';
          menu.style.right = 'auto';
        }
      } catch (_) {}
    });
  }

  // --------------------------------------------------------------------------
  // 3. Selection Context Bar (.selection-bar) Semantic Styling
  // --------------------------------------------------------------------------
  function enhanceSelectionBar(bar) {
    if (!bar) return;
    const btns = Array.from(bar.querySelectorAll(':scope > button, :scope > span > button'));
    let markedClipGroup = false;
    btns.forEach(function (b) {
      const t = (b.textContent || '').trim().toLowerCase();
      if (!t) return;
      if (t === 'xóa' || t === 'xoá' || t === 'delete') {
        b.setAttribute('data-mn-role', 'danger');
      } else if (
        t.includes('dựng lại hình') ||
        t === 'tham số' ||
        t === 'quỹ tích' ||
        t === 'đo & dựng' ||
        t === 'chuyển động' ||
        t === 'đang chạy'
      ) {
        b.setAttribute('data-mn-role', 'feature');
      } else {
        b.removeAttribute('data-mn-role');
      }

      if (!markedClipGroup && (t === 'sao chép' || t === 'copy' || t === 'emf')) {
        b.setAttribute('data-mn-group-start', '1');
        markedClipGroup = true;
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. Pen, Fill, Instruments & Main Command Menu Popovers
  // --------------------------------------------------------------------------
  function enhanceOtherPopovers(menu) {
    if (!menu || menu.dataset.mnOtherReady === '1') return;
    if (menu.classList.contains('mn-studio-pop')) return;

    // Pen Picker Popover
    if (menu.querySelector('.pp-kinds')) {
      menu.dataset.mnOtherReady = '1';
      menu.classList.add('mn-pen-pop');
      return;
    }

    // Fill Popover
    if (menu.querySelector('.fill-opacity')) {
      menu.dataset.mnOtherReady = '1';
      menu.classList.add('mn-fill-pop');
      return;
    }

    const txt = menu.textContent || '';

    // Instruments Popover (Thước kẻ, Thước đo độ, Ê-ke, Compa, Cất dụng cụ)
    if (txt.includes('Thước đo độ') && txt.includes('Compa')) {
      menu.dataset.mnOtherReady = '1';
      menu.classList.add('mn-inst-pop');
      menu.querySelectorAll('button').forEach(function (b) {
        const bt = (b.textContent || '').trim();
        if (bt.includes('Cất dụng cụ') || bt.toLowerCase().includes('hide instrument')) {
          b.setAttribute('data-mn-inst-hide', '1');
        }
      });
      return;
    }

    // Main App Command Menu
    if (menu.querySelector('.zoom-input') && (txt.includes('Thư viện') || txt.includes('Sổ mới') || txt.includes('Library'))) {
      menu.dataset.mnOtherReady = '1';
      menu.classList.add('mn-main-menu');
      if (!menu.querySelector('.mn-menu-brand-head')) {
        const head = document.createElement('div');
        head.className = 'mn-menu-brand-head';
        head.innerHTML =
          '<span class="mn-menu-brand-name">MinNote Studio</span>' +
          '<span class="mn-menu-brand-tag">Đỗ Miinh Math</span>';
        head.addEventListener('click', function (e) { e.stopPropagation(); });
        menu.insertBefore(head, menu.firstChild);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. Settings Modal (.dialog.settings) -> Left-Sidebar Navigation Studio!
  // --------------------------------------------------------------------------
  function enhanceSettingsDialog(dlg) {
    if (!dlg || dlg.dataset.mnSetReady === '1') return;
    const grid = dlg.querySelector('.settings-grid');
    const body = dlg.querySelector('.dialog-body');
    if (!grid || !body) return;

    const sections = Array.from(grid.querySelectorAll(':scope > section'));
    if (sections.length < 2) return;

    dlg.dataset.mnSetReady = '1';
    dlg.classList.add('mn-set-studio');

    const NAV_META = [
      { id: '0', icon: '📄', fallback: 'Trang giấy & Khổ' },
      { id: '1', icon: '📐', fallback: 'Hình vẽ & Đường nét' },
      { id: '2', icon: '🎛', fallback: 'Môn dạy & Con trỏ' }
    ];

    const nav = document.createElement('aside');
    nav.className = 'mn-set-nav';
    nav.innerHTML =
      '<div class="mn-set-nav-title">Danh mục cài đặt</div>' +
      sections.map(function (sec, idx) {
        const meta = NAV_META[idx] || { id: String(idx), icon: '⚙', fallback: 'Mục ' + (idx + 1) };
        const h4 = sec.querySelector('h4');
        const label = idx === 0
          ? 'Trang giấy & Khổ'
          : (idx === 1 ? 'Hình vẽ & Nét mặc định' : (idx === 2 ? 'Môn dạy & Con trỏ' : (h4 ? h4.textContent.trim() : meta.fallback)));
        return '<button type="button" class="mn-set-nav-btn' + (idx === 0 ? ' active' : '') + '" data-mn-set-go="' + idx + '">' +
          '<span>' + meta.icon + '</span><span>' + label + '</span>' +
        '</button>';
      }).join('') +
      '<div class="mn-set-nav-sep"></div>' +
      '<button type="button" class="mn-set-nav-btn" data-mn-set-go="all"><span>⊞</span><span>Xem tất cả</span></button>';

    function selectTab(id) {
      dlg.setAttribute('data-mn-set-tab', id);
      nav.querySelectorAll('[data-mn-set-go]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-mn-set-go') === id);
      });
      sections.forEach(function (sec, idx) {
        sec.classList.toggle('mn-set-hidden', id !== 'all' && String(idx) !== id);
      });
      grid.scrollTop = 0;
    }

    nav.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-mn-set-go]');
      if (!btn) return;
      selectTab(btn.getAttribute('data-mn-set-go'));
    });

    body.insertBefore(nav, body.firstChild);
    selectTab('0');
  }

  // --------------------------------------------------------------------------
  // Lightweight MutationObserver (batched via microtask/rAF)
  // --------------------------------------------------------------------------
  let scheduled = false;
  function scan() {
    scheduled = false;
    const fd = document.querySelector('.dialog.formula-dialog');
    if (fd) enhanceFormulaDialog(fd);

    const sd = document.querySelector('.dialog.settings');
    if (sd) enhanceSettingsDialog(sd);

    document.querySelectorAll('.dropdown-menu.columns').forEach(enhanceStudioPopover);
    document.querySelectorAll('.dropdown-menu').forEach(enhanceOtherPopovers);
    document.querySelectorAll('.selection-bar').forEach(enhanceSelectionBar);
  }

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }

  function init() {
    scan();
    const obs = new MutationObserver(scheduleScan);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
