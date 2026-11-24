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

  function triggerSectionEnter(el) {
    if (!el || !el.classList) return;
    el.classList.remove('mn-sec-enter');
    void el.offsetWidth;
    el.classList.add('mn-sec-enter');
  }
  window.triggerMinNoteSecEnter = triggerSectionEnter;

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
      const activePane = tab === 'editor'
        ? dlg.querySelector('.math-palette .palette')
        : dlg.querySelector('.mnm-extra-pane[data-pane="' + tab + '"]');
      if (activePane) triggerSectionEnter(activePane);
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
  const studioPopState = {
    shapes: { tab: 'all', lastSeen: 0 },
    geo: { tab: 'all', lastSeen: 0 }
  };

  function ensureClass(el, cls, want) {
    if (!el) return;
    const has = el.classList.contains(cls);
    if (want && !has) el.classList.add(cls);
    else if (!want && has) el.classList.remove(cls);
  }

  function ensureAttr(el, name, val) {
    if (!el) return;
    if (el.getAttribute(name) !== val) el.setAttribute(name, val);
  }

  function classifyStudioSections(menu) {
    const sections = Array.from(menu.querySelectorAll('.menu-section'));
    const filterItems = [{ id: 'all', label: 'Tất cả' }];
    let secIdx = 0;
    sections.forEach(function (sec) {
      const headingEl = sec.querySelector('.menu-heading');
      const hTxt = headingEl ? headingEl.textContent.trim() : '';
      const hasScriptBtn = (sec.textContent || '').includes('Kịch bản dựng hình');
      if (hasScriptBtn) {
        ensureAttr(sec, 'data-mn-sec', 'options');
      } else {
        const slug = 'sec-' + (++secIdx);
        ensureAttr(sec, 'data-mn-sec', slug);
        if (hTxt) {
          const nice = hTxt.charAt(0).toUpperCase() + hTxt.slice(1).toLowerCase();
          filterItems.push({ id: slug, label: nice });
        }
      }
    });
    return { sections: sections, filterItems: filterItems };
  }

  function applyStudioFilter(menu, target, shouldScrollTop) {
    if (!menu || !menu.isConnected) return;
    if (menu._mnSyncing) return;
    menu._mnSyncing = true;
    try {
      const popKey = menu.dataset.mnPopKind || (menu.classList.contains('by-section') || !!menu.querySelector('.menu-stack') ? 'geo' : 'shapes');
      const isGeo = popKey === 'geo';

      // Re-assert studio classes without no-op DOM writes
      ensureClass(menu, 'mn-studio-pop', true);
      ensureClass(menu, isGeo ? 'mn-geo-pop' : 'mn-shapes-pop', true);

      const info = classifyStudioSections(menu);
      const validIds = info.filterItems.map(function (f) { return f.id; });
      const activeId = validIds.indexOf(target) !== -1 ? target : 'all';

      if (menu.dataset.mnActiveTab !== activeId) {
        menu.dataset.mnActiveTab = activeId;
      }
      studioPopState[popKey] = { tab: activeId, lastSeen: Date.now() };
      ensureAttr(menu, 'data-mn-filtered', activeId === 'all' ? '0' : '1');

      const filterBar = menu.querySelector(':scope > .mn-pop-filter');
      if (filterBar) {
        filterBar.querySelectorAll('.mn-pop-ftab').forEach(function (b) {
          ensureClass(b, 'active', b.getAttribute('data-mn-f') === activeId);
        });
      }

      info.sections.forEach(function (sec) {
        const sid = sec.getAttribute('data-mn-sec');
        if (sid === 'options') {
          ensureClass(sec, 'mn-sec-hidden', false);
          return;
        }
        const hide = activeId !== 'all' && sid !== activeId;
        ensureClass(sec, 'mn-sec-hidden', hide);
        if (shouldScrollTop && !hide) {
          triggerSectionEnter(sec);
        }
      });

      if (shouldScrollTop) {
        menu.scrollTop = 0;
        clampStudioPopoverViewport(menu);
      }
    } finally {
      if (menu._mnPopObserver) {
        menu._mnPopObserver.takeRecords();
      }
      menu._mnSyncing = false;
    }
  }

  function computeSafePopoverBounds(menu) {
    const vh = window.innerHeight;
    let safeTop = 8;
    try {
      const bw = document.querySelector('.board-wrap');
      if (bw) {
        const bwr = bw.getBoundingClientRect();
        if (bwr.height > 40 && bwr.top > safeTop) safeTop = Math.ceil(bwr.top) + 6;
      }
      const headerEls = document.querySelectorAll('header.toolbar > .tb-group:first-child, header.toolbar > .tb-title, header.toolbar > .tb-palette, header.toolbar > .nb-tools-dock');
      headerEls.forEach(function (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top < 80 && r.bottom < vh * 0.4) {
          safeTop = Math.max(safeTop, Math.ceil(r.bottom) + 6);
        }
      });
    } catch (_) {}

    let safeBottom = vh - 10;
    try {
      const ownerBar = menu && menu.closest ? menu.closest('aside.tools-bar') : null;
      const bottomBars = document.querySelectorAll('aside.tools-bar.side-bottom, .sheet-bar');
      bottomBars.forEach(function (el) {
        if (el === ownerBar) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top > vh * 0.5) {
          safeBottom = Math.min(safeBottom, Math.floor(r.top) - 8);
        }
      });
    } catch (_) {}

    return { safeTop: Math.min(safeTop, Math.max(8, vh - 180)), safeBottom: Math.max(safeBottom, 180) };
  }

  function clampStudioPopoverViewport(menu) {
    if (!menu || !menu.isConnected) return;
    requestAnimationFrame(function () {
      if (!menu || !menu.isConnected) return;
      try {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const bounds = computeSafePopoverBounds(menu);
        const safeTop = bounds.safeTop;
        const safeBottom = bounds.safeBottom;

        // Vertical clamp: NEVER overlap the top bar or bottom bar!
        const hasBottom = !!(menu.style.bottom && menu.style.bottom !== 'auto');
        if (hasBottom) {
          const bVal = parseFloat(menu.style.bottom) || 0;
          const maxH = Math.max(150, Math.floor(vh - bVal - safeTop));
          menu.style.maxHeight = maxH + 'px';
          menu.style.top = 'auto';
        } else {
          const r0 = menu.getBoundingClientRect();
          let tVal = parseFloat(menu.style.top);
          if (!Number.isFinite(tVal)) tVal = r0.top;
          if (tVal < safeTop) tVal = safeTop;
          const availBelow = safeBottom - tVal;
          const maxH = Math.max(150, Math.floor(availBelow));
          menu.style.top = Math.round(tVal) + 'px';
          menu.style.maxHeight = maxH + 'px';
        }

        // Horizontal clamp inside viewport
        const r = menu.getBoundingClientRect();
        if (r.right > vw - 10) {
          menu.style.left = Math.max(10, Math.floor(vw - r.width - 10)) + 'px';
          menu.style.right = 'auto';
          menu.style.transform = '';
        }
        const r2 = menu.getBoundingClientRect();
        if (r2.left < 10) {
          menu.style.left = '10px';
          menu.style.right = 'auto';
          menu.style.transform = '';
        }
      } catch (_) {}
    });
  }

  function enhanceStudioPopover(menu) {
    if (!menu) return;
    const sections = Array.from(menu.querySelectorAll('.menu-section'));
    if (sections.length < 2) return;
    const txt = menu.textContent || '';
    const isShapesOrGeo = txt.includes('Kịch bản dựng hình') || txt.includes('Bắt điểm lưới');
    if (!isShapesOrGeo) return;

    const isGeo = menu.dataset.mnPopKind
      ? menu.dataset.mnPopKind === 'geo'
      : (menu.classList.contains('by-section') || !!menu.querySelector('.menu-stack'));
    const popKey = isGeo ? 'geo' : 'shapes';

    if (menu.dataset.mnPopReady === '1') {
      // Re-sync in case React re-rendered option pills / sections in-place
      studioPopState[popKey].lastSeen = Date.now();
      applyStudioFilter(menu, menu.dataset.mnActiveTab || studioPopState[popKey].tab || 'all', false);
      clampStudioPopoverViewport(menu);
      return;
    }

    const now = Date.now();
    const prev = studioPopState[popKey];
    const initialTab = (prev && prev.tab && prev.tab !== 'all' && (now - prev.lastSeen) < 600)
      ? prev.tab
      : 'all';

    menu.dataset.mnPopReady = '1';
    menu.dataset.mnPopKind = popKey;
    menu.dataset.mnActiveTab = initialTab;
    studioPopState[popKey] = { tab: initialTab, lastSeen: now };
    ensureClass(menu, 'mn-studio-pop', true);
    ensureClass(menu, isGeo ? 'mn-geo-pop' : 'mn-shapes-pop', true);

    const info = classifyStudioSections(menu);

    // Prepend compact non-destructive filter bar
    if (!menu.querySelector(':scope > .mn-pop-filter')) {
      const filterBar = document.createElement('div');
      filterBar.className = 'mn-pop-filter';
      filterBar.innerHTML =
        '<div class="mn-pop-filter-tabs">' +
          info.filterItems.map(function (f) {
            return '<button type="button" class="mn-pop-ftab' + (f.id === initialTab ? ' active' : '') + '" data-mn-f="' + f.id + '">' + f.label + '</button>';
          }).join('') +
        '</div>' +
        '<span class="mn-pop-brand">' + (isGeo ? 'MinNote Hình học' : 'MinNote Hình mẫu') + '</span>';

      filterBar.addEventListener('click', function (e) {
        e.stopPropagation();
        const btn = e.target.closest('[data-mn-f]');
        if (!btn) return;
        const target = btn.getAttribute('data-mn-f');
        applyStudioFilter(menu, target, true);
      });

      menu.insertBefore(filterBar, menu.firstChild);
    }

    // Persist active filter tab when user clicks option pills (Hiện chấm tròn, Bắt điểm lưới, Tự động nét liền / đứt)
    if (!menu._mnOptionListenerBound) {
      menu._mnOptionListenerBound = true;
      menu.addEventListener('click', function (e) {
        if (e.target.closest('.menu-section[data-mn-sec="options"]')) {
          const savedTab = menu.dataset.mnActiveTab || 'all';
          studioPopState[popKey] = { tab: savedTab, lastSeen: Date.now() };
          const restore = function () {
            if (menu.isConnected) {
              applyStudioFilter(menu, savedTab, false);
            }
          };
          requestAnimationFrame(restore);
          setTimeout(restore, 40);
        }
      }, true);
    }

    // Watch relevant class/child mutations via rAF (never microtask!) so React re-renders never wipe active filter tab
    if (!menu._mnPopObserver) {
      let pendingSync = false;
      const kindClass = isGeo ? 'mn-geo-pop' : 'mn-shapes-pop';
      const popObs = new MutationObserver(function (records) {
        if (!menu.isConnected) {
          popObs.disconnect();
          return;
        }
        if (menu._mnSyncing || pendingSync) return;

        let needsSync = !menu.classList.contains('mn-studio-pop') || !menu.classList.contains(kindClass);
        if (!needsSync && records) {
          const activeId = menu.dataset.mnActiveTab || 'all';
          for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            const tgt = rec.target;
            if (!tgt || (tgt.closest && tgt.closest('.mn-pop-filter'))) continue;
            if (rec.type === 'childList' && (tgt === menu || tgt.classList.contains('menu-stack'))) {
              needsSync = true;
              break;
            }
            if (rec.type === 'attributes' && tgt.classList && tgt.classList.contains('menu-section')) {
              const sid = tgt.getAttribute('data-mn-sec');
              const wantHidden = activeId !== 'all' && sid && sid !== 'options' && sid !== activeId;
              if (!sid || tgt.classList.contains('mn-sec-hidden') !== wantHidden) {
                needsSync = true;
                break;
              }
            }
          }
        }
        if (!needsSync) return;

        pendingSync = true;
        requestAnimationFrame(function () {
          pendingSync = false;
          if (!menu.isConnected) {
            popObs.disconnect();
            return;
          }
          applyStudioFilter(menu, menu.dataset.mnActiveTab || 'all', false);
        });
      });
      popObs.observe(menu, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
      menu._mnPopObserver = popObs;
    }

    applyStudioFilter(menu, initialTab, false);
    clampStudioPopoverViewport(menu);
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
    if (!menu) return;
    if (menu.classList.contains('mn-studio-pop') || menu.dataset.mnPopReady === '1') return;
    if (menu.dataset.mnOtherReady === '1') {
      if (menu.dataset.mnOtherClass && !menu.classList.contains(menu.dataset.mnOtherClass)) {
        menu.classList.add(menu.dataset.mnOtherClass);
      }
      return;
    }

    // Pen Picker Popover
    if (menu.querySelector('.pp-kinds')) {
      menu.dataset.mnOtherReady = '1';
      menu.dataset.mnOtherClass = 'mn-pen-pop';
      menu.classList.add('mn-pen-pop');
      return;
    }

    // Fill Popover
    if (menu.querySelector('.fill-opacity')) {
      menu.dataset.mnOtherReady = '1';
      menu.dataset.mnOtherClass = 'mn-fill-pop';
      menu.classList.add('mn-fill-pop');
      return;
    }

    const txt = menu.textContent || '';

    // Instruments Popover (Thước kẻ, Thước đo độ, Ê-ke, Compa, Cất dụng cụ)
    if (txt.includes('Thước đo độ') && txt.includes('Compa')) {
      menu.dataset.mnOtherReady = '1';
      menu.dataset.mnOtherClass = 'mn-inst-pop';
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
      menu.dataset.mnOtherClass = 'mn-main-menu';
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
  //    Includes 4th tab: 🔑 API Key & MEA (MatrixExamAI Pro Shared Sync)
  // --------------------------------------------------------------------------
  function mountMeaSettingsHost(meaSec) {
    if (!meaSec) return;
    if (window.MinNoteMeaSync && typeof window.MinNoteMeaSync.mountSettingsPanel === 'function') {
      if (meaSec.dataset.mnMeaMounted !== '1') {
        meaSec.dataset.mnMeaMounted = '1';
        try {
          window.MinNoteMeaSync.mountSettingsPanel(meaSec);
        } catch (err) {
          meaSec.dataset.mnMeaMounted = '0';
          console.warn('[MinNote Settings] mountSettingsPanel error:', err);
        }
      }
    } else if (!meaSec.innerHTML.trim()) {
      meaSec.innerHTML = '<div class="mn-set-mea-loading">Đang kết nối mô-đun đồng bộ MatrixExamAI Pro...</div>';
    }
  }

  function enhanceSettingsDialog(dlg) {
    if (!dlg) return;
    if (dlg.dataset.mnSetReady === '1') {
      const existingHost = dlg.querySelector('section[data-mn-mea-host="1"]');
      if (existingHost && existingHost.dataset.mnMeaMounted !== '1') {
        mountMeaSettingsHost(existingHost);
      }
      return;
    }
    const grid = dlg.querySelector('.settings-grid');
    const body = dlg.querySelector('.dialog-body');
    if (!grid || !body) return;

    const sections = Array.from(grid.querySelectorAll(':scope > section:not([data-mn-mea-host="1"])'));
    if (sections.length < 2) return;

    dlg.dataset.mnSetReady = '1';
    dlg.classList.add('mn-set-studio');

    // Mount 4th tab container for MatrixExamAI Pro API Key & Sync
    let meaSec = grid.querySelector(':scope > section[data-mn-mea-host="1"]');
    if (!meaSec) {
      meaSec = document.createElement('section');
      meaSec.className = 'mn-set-mea-section mn-set-hidden';
      meaSec.setAttribute('data-mn-mea-host', '1');
      grid.appendChild(meaSec);
    }

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
      '<button type="button" class="mn-set-nav-btn" data-mn-set-go="mea-sync">' +
        '<span>🔑</span><span>API Key &amp; MEA</span>' +
      '</button>' +
      '<div class="mn-set-nav-sep"></div>' +
      '<button type="button" class="mn-set-nav-btn" data-mn-set-go="all"><span>⊞</span><span>Xem tất cả</span></button>';

    function selectTab(id, animate) {
      dlg.setAttribute('data-mn-set-tab', id);
      nav.querySelectorAll('[data-mn-set-go]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-mn-set-go') === id);
      });
      sections.forEach(function (sec, idx) {
        const hide = id !== 'all' && String(idx) !== id;
        sec.classList.toggle('mn-set-hidden', hide);
        if (animate && !hide) triggerSectionEnter(sec);
      });
      const hideMea = id !== 'all' && id !== 'mea-sync';
      meaSec.classList.toggle('mn-set-hidden', hideMea);
      if (!hideMea) {
        mountMeaSettingsHost(meaSec);
        if (animate) triggerSectionEnter(meaSec);
      }
      grid.scrollTop = 0;
    }

    dlg._mnSelectSettingsTab = selectTab;

    nav.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-mn-set-go]');
      if (!btn) return;
      selectTab(btn.getAttribute('data-mn-set-go'), true);
    });

    body.insertBefore(nav, body.firstChild);
    mountMeaSettingsHost(meaSec);

    const requestedTab = window.__mnPendingSettingsTab || '0';
    window.__mnPendingSettingsTab = null;
    selectTab(requestedTab, false);
  }

  // Helper to jump directly to Settings -> API Key & MEA tab from other modules
  window.openMinNoteMeaSettings = function () {
    const openDlg = document.querySelector('.dialog.settings');
    if (openDlg) {
      enhanceSettingsDialog(openDlg);
      if (typeof openDlg._mnSelectSettingsTab === 'function') {
        openDlg._mnSelectSettingsTab('mea-sync', true);
      }
      return true;
    }
    window.__mnPendingSettingsTab = 'mea-sync';
    const settingsBtn = document.querySelector('header.toolbar .tb[title*="Cài đặt"], header.toolbar .tb[title*="Settings"], header.toolbar .tb[aria-label*="Cài đặt"], header.toolbar .tb[aria-label*="Settings"]');
    if (settingsBtn) {
      settingsBtn.click();
      return true;
    }
    return false;
  };

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

  function scheduleScan(records) {
    if (document.body && document.body.classList.contains('mn-animating')) {
      let relevant = false;
      if (Array.isArray(records)) {
        for (let i = 0; i < records.length && !relevant; i++) {
          const added = records[i].addedNodes;
          for (let j = 0; j < added.length; j++) {
            const n = added[j];
            if (n && n.nodeType === 1 && (n.classList.contains('dialog') || n.classList.contains('dropdown-menu') || n.classList.contains('selection-bar') || (n.querySelector && n.querySelector('.dialog, .dropdown-menu')))) {
              relevant = true;
              break;
            }
          }
        }
      }
      if (!relevant) return;
    }
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
