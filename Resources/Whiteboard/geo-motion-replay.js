(() => {
  'use strict';

  const getBoard = () => window.__minnoteBoard || null;

  function makeDraggable(panel, handle, opts = {}) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, moved = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, select')) return;
      dragging = true;
      moved = false;
      const r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) {
        moved = true;
        panel.classList.add('moved');
        panel.style.left = ox + 'px';
        panel.style.top = oy + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
      const pw = Math.min(panel.offsetWidth || 120, window.innerWidth - 24);
      const nx = Math.max(8, Math.min(window.innerWidth - Math.min(120, pw), ox + dx));
      const ny = Math.max(40, Math.min(window.innerHeight - 44, oy + dy));
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    });
    const end = () => {
      if (dragging && moved && typeof opts.onDragEnd === 'function') opts.onDragEnd();
      dragging = false;
      setTimeout(() => { moved = false; }, 60);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    return () => moved;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================================
   * 1. POINT MOTION (CHUYỂN ĐỘNG ĐIỂM) UI CONTROLLER
   * ============================================================================ */
  let motionPanel = null;
  let motionMinimized = false;

  function ensureMotionPanel() {
    if (motionPanel) return motionPanel;
    const el = document.createElement('div');
    el.id = 'mn-motion-panel';
    el.innerHTML = `
      <div class="mn-mp-head">
        <div class="mn-mp-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" opacity=".25" fill="currentColor"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
          <span id="mn-mp-title-txt">Chuyển động điểm</span>
        </div>
        <div class="mn-mp-head-btns">
          <button class="mn-icon-btn" id="mn-mp-toggle-all" title="Phát / Tạm dừng tất cả">⏸</button>
          <button class="mn-icon-btn" id="mn-mp-minimize" title="Thu gọn / Mở rộng">─</button>
          <button class="mn-icon-btn danger" id="mn-mp-stop-all" title="Dừng tất cả & đóng">✕</button>
        </div>
      </div>
      <div class="mn-mp-body" id="mn-mp-body"></div>
    `;
    document.body.appendChild(el);
    makeDraggable(el, el.querySelector('.mn-mp-head'));

    el.querySelector('#mn-mp-toggle-all').addEventListener('click', () => {
      const b = getBoard();
      if (b) b.togglePointAnimPause();
    });
    el.querySelector('#mn-mp-minimize').addEventListener('click', () => {
      motionMinimized = !motionMinimized;
      renderMotionPanel();
    });
    el.querySelector('#mn-mp-stop-all').addEventListener('click', () => {
      const b = getBoard();
      if (b) b.stopAllPointAnims();
    });

    motionPanel = el;
    return el;
  }

  function renderMotionPanel() {
    const b = getBoard();
    if (!b || !b.ptAnims || b.ptAnims.size === 0) {
      if (motionPanel) motionPanel.classList.remove('open');
      return;
    }
    const panel = ensureMotionPanel();
    panel.classList.add('open');
    panel.classList.toggle('minimized', motionMinimized);

    const anims = [...b.ptAnims.values()];
    const anyRunning = anims.some(a => !a.paused);
    const toggleAllBtn = panel.querySelector('#mn-mp-toggle-all');
    toggleAllBtn.textContent = anyRunning ? '⏸' : '▶';
    toggleAllBtn.title = anyRunning ? 'Tạm dừng tất cả' : 'Tiếp tục tất cả';

    const minBtn = panel.querySelector('#mn-mp-minimize');
    if (minBtn) {
      minBtn.textContent = motionMinimized ? '▢' : '─';
      minBtn.title = motionMinimized ? 'Mở rộng bảng chuyển động' : 'Thu gọn';
    }
    const titleTxt = panel.querySelector('#mn-mp-title-txt');
    if (titleTxt) {
      titleTxt.textContent = motionMinimized ? `Chuyển động (${anims.length})` : 'Chuyển động điểm';
    }
    if (motionMinimized) return;

    const body = panel.querySelector('#mn-mp-body');
    body.innerHTML = '';

    for (const a of anims) {
      const pg = b.doc.pages[a.page];
      const pt = pg && pg.geo && pg.geo.points[a.id];
      const lbl = (pt && pt.label) || a.label || 'Điểm';
      const defType = pt && pt.def ? pt.def.t : '';
      const typeText = defType === 'on' ? 'Trên đoạn/đường' : defType === 'path' ? 'Trên đường cong' : defType === 'vec' ? 'Theo phương' : 'Tự do (quỹ đạo)';

      const card = document.createElement('div');
      card.className = 'mn-pt-card';
      card.innerHTML = `
        <div class="mn-pt-row">
          <div class="mn-pt-badge">
            <span class="mn-pt-dot ${a.paused ? 'paused' : ''}"></span>
            <span>Điểm <i>${escapeHtml(lbl)}</i></span>
            <span style="font-size:10.5px;font-weight:500;color:#64748b;">(${typeText})</span>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="mn-icon-btn ${a.mode === 'bounce' ? 'active' : ''}" data-act="mode" title="Chế độ: ${a.mode === 'bounce' ? 'Qua lại (↔)' : 'Vòng lặp (↻)'}">${a.mode === 'bounce' ? '↔' : '↻'}</button>
            <button class="mn-icon-btn ${a.paused ? 'primary' : ''}" data-act="pause" title="${a.paused ? 'Tiếp tục' : 'Tạm dừng'}">${a.paused ? '▶' : '⏸'}</button>
            <button class="mn-icon-btn danger" data-act="stop" title="Dừng điểm này">■</button>
          </div>
        </div>
        <div class="mn-speed-row">
          <span>Tốc độ</span>
          <input type="range" min="0.2" max="4" step="0.1" value="${a.speed}" data-act="speed" />
          <span class="mn-speed-val">${Number(a.speed).toFixed(1)}×</span>
        </div>
        <div class="mn-speed-presets">
          ${[0.5, 1, 1.5, 2, 3].map(v => `<button class="mn-chip ${Math.abs(a.speed - v) < 0.06 ? 'on' : ''}" data-preset="${v}">${v}×</button>`).join('')}
        </div>
      `;

      card.querySelector('[data-act="mode"]').addEventListener('click', () => {
        b.setPointAnimConfig(a.id, { mode: a.mode === 'bounce' ? 'loop' : 'bounce' });
      });
      card.querySelector('[data-act="pause"]').addEventListener('click', () => {
        b.togglePointAnimPause(a.id);
      });
      card.querySelector('[data-act="stop"]').addEventListener('click', () => {
        b.stopPointAnim(a.id);
      });
      const slider = card.querySelector('[data-act="speed"]');
      const valEl = card.querySelector('.mn-speed-val');
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value) || 1;
        valEl.textContent = v.toFixed(1) + '×';
        b.setPointAnimConfig(a.id, { speed: v });
      });
      card.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          b.setPointAnimConfig(a.id, { speed: parseFloat(btn.dataset.preset) });
        });
      });

      body.appendChild(card);
    }
  }

  window.MinNoteGeoMotion = {
    toggleFromSelection() {
      const b = getBoard();
      if (!b || !b.sel) return;
      const ids = b.selectionMovablePoints();
      if (!ids.length) return;
      const anyAnim = ids.some(id => b.ptAnims.has(id));
      if (anyAnim) {
        const anyRunning = ids.some(id => b.ptAnims.has(id) && !b.ptAnims.get(id).paused);
        for (const id of ids) {
          if (b.ptAnims.has(id)) b.setPointAnimConfig(id, { paused: anyRunning });
        }
      } else {
        b.startPointAnim(b.sel.page, ids, { speed: 1 });
      }
      renderMotionPanel();
    },
    start(pageIdx, ids, opts) {
      const b = getBoard();
      if (!b) return;
      b.startPointAnim(pageIdx, ids, opts);
      renderMotionPanel();
    },
    stopAll() {
      const b = getBoard();
      if (b) b.stopAllPointAnims();
      renderMotionPanel();
    }
  };

  /* ============================================================================
   * 2. CONSTRUCTION REPLAY & MULTI-SCRIPT STUDIO (DỰNG LẠI HÌNH THEO KỊCH BẢN)
   *    - Collapsible full drawer -> compact runner pill -> ultra-mini chip
   *    - Multiple concurrent scripts running simultaneously
   *    - Per-figure persistent saved scripts (survives editing/changing other shapes!)
   * ============================================================================ */
  let replayPanel = null;
  let replayPill = null;
  let effectPopover = null;
  let effectPopoverState = null; // { rawIdx, replayId }
  let replayViewMode = 'full'; // 'full' | 'pill' | 'mini'
  let stepsCollapsed = true;   // Mở gọn mặc định; bấm ☰ để mở danh sách bước khi cần sửa
  let presetsOpen = false;
  let savedShelfOpen = false;
  let savedFlashTimer = 0;
  const SPEED_CYCLE = [0.5, 1, 1.5, 2, 3];

  const FALLBACK_EFFECTS = [
    { id: 'draw',   icon: '✏', label: 'Vẽ nét', cat: 'stroke' },
    { id: 'glow',   icon: '✨', label: 'Phát sáng', cat: 'stroke' },
    { id: 'spring', icon: '⚡', label: 'Bật nảy', cat: 'transform' },
    { id: 'fade',   icon: '🌫', label: 'Hiện dần', cat: 'transform' },
    { id: 'zoom',   icon: '🔍', label: 'Phóng to', cat: 'transform' },
    { id: 'slide',  icon: '⬆', label: 'Trượt vào', cat: 'transform' },
    { id: 'wipe',   icon: '▬', label: 'Quét ngang', cat: 'transform' },
    { id: 'pulse',  icon: '◉', label: 'Nhịp nhấn', cat: 'emphasis' }
  ];
  const FALLBACK_EASINGS = [
    { id: 'easeInOut', label: 'Mượt đều' },
    { id: 'easeOut',   label: 'Nhanh→Chậm' },
    { id: 'spring',    label: 'Đàn hồi' },
    { id: 'linear',    label: 'Tuyến tính' }
  ];
  let effectPopoverCategory = 'fit';
  let effectPopoverPos = null;   // { left, top } remembered after user drags popover
  let effectPopoverPeek = false; // translucent see-through mode
  let lastRenderedStepSig = '';  // avoids innerHTML teardown during live playback!

  function getMotionFX() {
    return (typeof window !== 'undefined' && window.MinNoteMotionFX) ? window.MinNoteMotionFX : null;
  }

  function getEffectMeta(id) {
    const mfx = getMotionFX();
    if (mfx && mfx.EFFECT_MAP && mfx.EFFECT_MAP[id]) return mfx.EFFECT_MAP[id];
    return FALLBACK_EFFECTS.find(e => e.id === id) || FALLBACK_EFFECTS[0];
  }

  function getEasingCatalog() {
    const mfx = getMotionFX();
    return (mfx && Array.isArray(mfx.EASINGS) && mfx.EASINGS.length) ? mfx.EASINGS : FALLBACK_EASINGS;
  }

  function getStepTargetMeta(geo, pg, st) {
    const first = (st.items && st.items.length) ? st.items[0] : st;
    const isCueOnly = st.mode === 'cue';
    if (first.kind === 'point') {
      return { kind: 'point', isCueOnly };
    }
    if (first.kind === 'stroke') {
      return { kind: 'stroke', isCueOnly };
    }
    if (first.kind === 'item') {
      const obj = pg && Array.isArray(pg.items) ? pg.items.find(x => x.id === first.refId) : null;
      return { kind: 'item', itemType: obj ? obj.type : 'text', isCueOnly };
    }
    const sh = geo && Array.isArray(geo.shapes) ? geo.shapes.find(s => s.id === first.refId) : null;
    return {
      kind: 'shape',
      shapeKind: sh ? sh.kind : 'segment',
      isDashed: !!(sh && sh.dashed),
      is3D: !!(sh && (sh.look3 || sh.group || ['cone', 'cylinder', 'sphere'].includes(sh.kind))),
      isCueOnly
    };
  }

  function closeEffectPopover() {
    if (effectPopover) {
      effectPopover.classList.remove('open', 'mn-fx-previewing');
    }
    effectPopoverState = null;
  }

  function getFigureScreenRect(b, r) {
    try {
      if (!b || !r || !b.scroller) return null;
      const ctx = window.MinNoteGeoReplay && typeof window.MinNoteGeoReplay.getExportContext === 'function'
        ? window.MinNoteGeoReplay.getExportContext(r)
        : null;
      if (!ctx || !ctx.bounds) return null;
      const scRect = b.scroller.getBoundingClientRect();
      const z = b.zoom || 1;
      const topOff = typeof b.pageTop === 'function' ? b.pageTop(r.page, b.doc) : 0;
      const leftOff = typeof b.pageLeft === 'function' ? b.pageLeft(r.page, b.doc) : 0;
      const x0 = scRect.left + (leftOff + ctx.bounds.x0) * z - b.scroller.scrollLeft;
      const y0 = scRect.top + (topOff + ctx.bounds.y0) * z - b.scroller.scrollTop;
      const x1 = scRect.left + (leftOff + ctx.bounds.x1) * z - b.scroller.scrollLeft;
      const y1 = scRect.top + (topOff + ctx.bounds.y1) * z - b.scroller.scrollTop;
      if (!Number.isFinite(x0) || !Number.isFinite(y0)) return null;
      return { left: x0, top: y0, right: x1, bottom: y1 };
    } catch (_) {
      return null;
    }
  }

  function rectOverlapArea(a, b) {
    if (!a || !b) return 0;
    const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return ox * oy;
  }

  function updateEffectPopoverPreviewFade() {
    if (!effectPopover || !effectPopover.classList.contains('open')) return;
    const b = getBoard();
    const r = getFocusedReplay(b);
    const isPlaying = !!(r && r.playing);
    if (!isPlaying) {
      effectPopover.classList.remove('mn-fx-previewing');
      return;
    }
    const pr = effectPopover.getBoundingClientRect();
    const figR = getFigureScreenRect(b, r);
    const overlapsFig = figR ? rectOverlapArea(pr, figR) > 900 : false;
    effectPopover.classList.toggle('mn-fx-previewing', overlapsFig);
  }

  function ensureEffectPopover() {
    if (effectPopover) return effectPopover;
    const pop = document.createElement('div');
    pop.id = 'mn-rp-fx-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Tùy chỉnh hiệu ứng bước');
    document.body.appendChild(pop);

    // Allow panning/dragging canvas freely without closing popover; only close on a stationary click outside!
    let outDown = null;
    document.addEventListener('pointerdown', (e) => {
      outDown = null;
      if (!effectPopover || !effectPopover.classList.contains('open')) return;
      if (effectPopover.contains(e.target)) return;
      if (e.target.closest && (e.target.closest('[data-act="fx"]') || e.target.closest('#mn-replay-panel'))) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      outDown = { x: e.clientX, y: e.clientY, t: Date.now() };
    }, true);

    document.addEventListener('pointerup', (e) => {
      if (!outDown) return;
      const dist = Math.hypot(e.clientX - outDown.x, e.clientY - outDown.y);
      const elapsed = Date.now() - outDown.t;
      outDown = null;
      if (dist <= 6 && elapsed < 400 && effectPopover && effectPopover.classList.contains('open')) {
        if (!effectPopover.contains(e.target) && !(e.target.closest && e.target.closest('#mn-replay-panel'))) {
          closeEffectPopover();
        }
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && effectPopover && effectPopover.classList.contains('open')) {
        closeEffectPopover();
      }
    });

    effectPopover = pop;
    return pop;
  }

  function openEffectPopover(rawIdx, clientX, clientY, keepCategory = false) {
    const b = getBoard();
    const r = getFocusedReplay(b);
    if (!b || !r || !r.steps[rawIdx]) return;
    const pg = b.doc.pages[r.page];
    if (!pg || !pg.geo) return;

    const st = r.steps[rawIdx];
    const pop = ensureEffectPopover();
    effectPopoverState = { rawIdx, replayId: r.id };
    if (!keepCategory) {
      effectPopoverCategory = st.mode === 'cue' ? 'emphasis' : 'fit';
    }

    const first = (st.items && st.items.length) ? st.items[0] : st;
    const isShape = first.kind === 'shape';
    const sh = isShape ? pg.geo.shapes.find(s => s.id === first.refId) : null;
    const hasDir = (isShape && sh && ['segment', 'line', 'ray', 'extend', 'circle', 'polygon'].includes(sh.kind)) || first.kind === 'stroke' || first.kind === 'item';
    const isInterPt = first.kind === 'point' && pg.geo.points[first.refId] && pg.geo.points[first.refId].def && pg.geo.points[first.refId].def.t === 'inter';
    const isCueOnly = st.mode === 'cue';
    const labelText = stepDisplayLabel(pg.geo, st, pg);

    const mfx = getMotionFX();
    const targetMeta = getStepTargetMeta(pg.geo, pg, st);
    const categories = (mfx && Array.isArray(mfx.EFFECT_CATEGORIES)) ? mfx.EFFECT_CATEGORIES : [{ id: 'fit', label: 'Phù hợp' }];
    const activeCat = isCueOnly ? 'emphasis' : effectPopoverCategory;
    const fxList = (mfx && typeof mfx.getEffectsForStep === 'function')
      ? mfx.getEffectsForStep(targetMeta, activeCat)
      : FALLBACK_EFFECTS;
    const easings = getEasingCatalog();

    const curFx = st.effect || 'draw';
    const curEase = st.easing || 'easeInOut';
    const curDur = Math.max(0.5, Math.min(3.0, Number(st.durationMul) || 1));
    const curPause = Math.max(0, Math.min(3.0, Number(st.pauseAfter) || 0));

    const morphShapes = (isShape && curFx === 'morph_bezier')
      ? pg.geo.shapes.filter(s => s.id !== first.refId && s.kind !== 'solid' && s.kind !== 'flatLink' && !s.hidden && (!r.scopeShapes || r.scopeShapes.has(s.id)))
      : [];

    const activeIdx = (() => {
      let k = 0;
      for (let i = 0; i < r.steps.length; i++) {
        if (i === rawIdx) return r.steps[i].enabled === false ? -1 : k;
        if (r.steps[i].enabled !== false) k++;
      }
      return -1;
    })();

    pop.innerHTML = `
      <div class="mn-fx-head" title="Kéo thanh tiêu đề này để di chuyển khung hiệu ứng ra khỏi hình">
        <div class="mn-fx-title" title="${escapeHtml(labelText)} (Kéo để di chuyển)">
          <span class="mn-fx-grip" aria-hidden="true">⋮⋮</span>
          <span>✨ ${escapeHtml(labelText)}</span>
        </div>
        <div class="mn-fx-head-actions">
          <button type="button" class="mn-icon-btn${effectPopoverPeek ? ' active' : ''}" data-fx-peek title="Làm mờ khung để nhìn xuyên hình phía sau">👁</button>
          <button type="button" class="mn-icon-btn" data-fx-close title="Đóng">✕</button>
        </div>
      </div>
      <div class="mn-fx-sec">
        <div class="mn-fx-label">${isCueOnly ? 'Hiệu ứng nhấn mạnh (không vẽ lại)' : 'Chọn hiệu ứng theo đối tượng'}</div>
        ${!isCueOnly && categories.length > 1 ? `
        <div class="mn-fx-tabs">
          ${categories.map(cat => `<button type="button" class="mn-fx-tab${activeCat === cat.id ? ' on' : ''}" data-fx-cat="${cat.id}">${cat.label}</button>`).join('')}
        </div>` : ''}
        <div class="mn-fx-grid">
          ${fxList.map(ef => `<button type="button" class="mn-fx-pill${curFx === ef.id ? ' on' : ''}" data-fx-effect="${ef.id}" title="${escapeHtml(ef.label)}"><span>${ef.icon}</span><span>${escapeHtml(ef.label)}</span></button>`).join('')}
        </div>
        ${(isShape && curFx === 'morph_bezier' && !isCueOnly) ? `
        <div class="mn-fx-morph-row">
          <span>Biến hình từ:</span>
          <select class="mn-fx-select" data-fx-morph-from>
            <option value="">Vòng tròn tâm (tự động)</option>
            ${morphShapes.map(s2 => `<option value="${escapeHtml(s2.id)}"${st.morphFromId === s2.id ? ' selected' : ''}>${escapeHtml(describeShape(pg.geo, s2, false, false))}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      <div class="mn-fx-sec">
        <div class="mn-fx-label">Đường cong chuyển động (Easing)</div>
        <div class="mn-fx-ease-row">
          ${easings.map(ea => `<button type="button" class="mn-fx-chip${curEase === ea.id ? ' on' : ''}" data-fx-easing="${ea.id}">${escapeHtml(ea.label)}</button>`).join('')}
        </div>
      </div>
      <div class="mn-fx-sec mn-fx-sliders">
        <div class="mn-fx-slider-row">
          <span>Thời lượng</span>
          <input type="range" min="0.5" max="3.0" step="0.1" value="${curDur.toFixed(1)}" data-fx-dur />
          <span class="mn-fx-val" data-fx-dur-val>${curDur.toFixed(1)}×</span>
        </div>
        <div class="mn-fx-slider-row">
          <span>Nghỉ sau bước</span>
          <input type="range" min="0" max="3.0" step="0.1" value="${curPause.toFixed(1)}" data-fx-pause />
          <span class="mn-fx-val" data-fx-pause-val>${curPause.toFixed(1)}s</span>
        </div>
      </div>
      <div class="mn-fx-sec mn-fx-toggles">
        ${hasDir && !isCueOnly ? `<button type="button" class="mn-fx-chip${st.rev ? ' on' : ''}" data-fx-toggle="rev">⇄ Đảo chiều</button>` : ''}
        ${isShape && !isCueOnly ? `<button type="button" class="mn-fx-chip${st.tempHide ? ' on' : ''}" data-fx-toggle="tempHide">👻 Vẽ rồi ẩn</button>` : ''}
        ${isInterPt && !isCueOnly ? `<button type="button" class="mn-fx-chip${st.showGuides !== false ? ' on' : ''}" data-fx-toggle="showGuides">✛ 2 đường dẫn</button>` : ''}
        <button type="button" class="mn-fx-chip${isCueOnly ? ' on' : ''}" data-fx-toggle="cue" title="Bật nếu bước này chỉ dùng để làm nổi bật đối tượng sẵn có">✦ Chỉ nhấn mạnh</button>
      </div>
      <div class="mn-fx-foot">
        <button type="button" class="mn-fx-btn primary" data-fx-preview>▶ Thử</button>
        <button type="button" class="mn-fx-btn" data-fx-apply-all>Áp dụng cho tất cả bước</button>
      </div>
    `;

    pop.classList.add('open');
    pop.classList.toggle('mn-fx-peek', effectPopoverPeek);

    // Make the FX popover smoothly draggable by its header & persist position across clicks/tabs!
    const fxHead = pop.querySelector('.mn-fx-head');
    if (fxHead) {
      makeDraggable(pop, fxHead, {
        onDragEnd() {
          const rr = pop.getBoundingClientRect();
          effectPopoverPos = { left: Math.round(rr.left), top: Math.round(rr.top) };
        }
      });
    }

    // Smart placement: honor user's dragged position if set; otherwise choose side with LEAST overlap over the figure!
    const pw = pop.offsetWidth || 344;
    const ph = pop.offsetHeight || 420;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minTop = 52;
    const maxTop = Math.max(minTop, vh - ph - 16);
    let left, top;

    if (effectPopoverPos) {
      left = Math.max(10, Math.min(vw - pw - 10, effectPopoverPos.left));
      top = Math.max(minTop, Math.min(maxTop, effectPopoverPos.top));
    } else {
      const panelRect = (replayPanel && replayPanel.classList.contains('open')) ? replayPanel.getBoundingClientRect() : null;
      const figRect = getFigureScreenRect(b, r);
      const baseTop = Math.max(minTop, Math.min(maxTop, (clientY || 120) - 40));
      const candidates = [];
      // 1. Far-left side edge (keeps center figure completely unobstructed!)
      candidates.push({ left: 14, top: Math.max(minTop, Math.min(maxTop, 58)) });
      // 2. Right of replay panel (if room)
      if (panelRect && panelRect.right + 10 + pw <= vw - 10) {
        candidates.push({ left: panelRect.right + 10, top: baseTop });
      }
      // 3. Left of replay panel
      if (panelRect && panelRect.left - pw - 10 >= 10) {
        candidates.push({ left: panelRect.left - pw - 10, top: baseTop });
      }
      // 4. Far-right edge (if replay panel was dragged left)
      candidates.push({ left: Math.max(10, vw - pw - 14), top: Math.max(minTop, Math.min(maxTop, 58)) });

      let best = candidates[0];
      let bestPenalty = Infinity;
      for (const c of candidates) {
        const cr = { left: c.left, top: c.top, right: c.left + pw, bottom: c.top + ph };
        const figOv = rectOverlapArea(cr, figRect);
        const panOv = rectOverlapArea(cr, panelRect);
        const penalty = figOv * 2.5 + panOv * 1.4;
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          best = c;
        }
      }
      left = Math.max(10, Math.min(vw - pw - 10, best.left));
      top = Math.max(minTop, Math.min(maxTop, best.top));
    }
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';

    pop.querySelector('[data-fx-close]').addEventListener('click', closeEffectPopover);
    const peekBtn = pop.querySelector('[data-fx-peek]');
    if (peekBtn) {
      peekBtn.addEventListener('click', () => {
        effectPopoverPeek = !effectPopoverPeek;
        pop.classList.toggle('mn-fx-peek', effectPopoverPeek);
        peekBtn.classList.toggle('active', effectPopoverPeek);
      });
    }

    pop.querySelectorAll('[data-fx-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        effectPopoverCategory = btn.dataset.fxCat || 'fit';
        openEffectPopover(rawIdx, clientX, clientY, true);
      });
    });

    pop.querySelectorAll('[data-fx-effect]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextFx = btn.dataset.fxEffect;
        const needRefresh = (curFx === 'morph_bezier') !== (nextFx === 'morph_bezier');
        st.effect = nextFx;
        pop.querySelectorAll('[data-fx-effect]').forEach(x => x.classList.toggle('on', x === btn));
        b._replayHiddenCache = null;
        persistScript(b, false, r);
        renderReplayUI();
        if (needRefresh) openEffectPopover(rawIdx, clientX, clientY, true);
        if (activeIdx >= 0) window.MinNoteGeoReplay.playSingleStep(activeIdx);
      });
    });

    const morphSel = pop.querySelector('[data-fx-morph-from]');
    if (morphSel) {
      morphSel.addEventListener('change', () => {
        st.morphFromId = morphSel.value || undefined;
        persistScript(b, false, r);
        renderReplayUI();
        if (activeIdx >= 0) window.MinNoteGeoReplay.playSingleStep(activeIdx);
      });
    }

    pop.querySelectorAll('[data-fx-easing]').forEach(btn => {
      btn.addEventListener('click', () => {
        st.easing = btn.dataset.fxEasing;
        pop.querySelectorAll('[data-fx-easing]').forEach(x => x.classList.toggle('on', x === btn));
        persistScript(b, false, r);
        renderReplayUI();
        if (activeIdx >= 0) window.MinNoteGeoReplay.playSingleStep(activeIdx);
      });
    });

    const durInp = pop.querySelector('[data-fx-dur]');
    const durVal = pop.querySelector('[data-fx-dur-val]');
    durInp.addEventListener('input', () => {
      const v = Math.max(0.5, Math.min(3.0, parseFloat(durInp.value) || 1));
      st.durationMul = Number(v.toFixed(1));
      durVal.textContent = st.durationMul.toFixed(1) + '×';
      persistScript(b, false, r);
    });
    durInp.addEventListener('change', () => renderReplayUI());

    const pauseInp = pop.querySelector('[data-fx-pause]');
    const pauseVal = pop.querySelector('[data-fx-pause-val]');
    pauseInp.addEventListener('input', () => {
      const v = Math.max(0, Math.min(3.0, parseFloat(pauseInp.value) || 0));
      st.pauseAfter = Number(v.toFixed(1));
      pauseVal.textContent = st.pauseAfter.toFixed(1) + 's';
      persistScript(b, false, r);
    });
    pauseInp.addEventListener('change', () => renderReplayUI());

    pop.querySelectorAll('[data-fx-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.fxToggle;
        if (key === 'rev') st.rev = !st.rev;
        else if (key === 'tempHide') st.tempHide = !st.tempHide;
        else if (key === 'showGuides') st.showGuides = st.showGuides === false;
        else if (key === 'cue') {
          st.mode = st.mode === 'cue' ? undefined : 'cue';
          if (st.mode === 'cue' && !(mfx && mfx.OVERLAY_END_EFFECTS && mfx.OVERLAY_END_EFFECTS.has(st.effect))) {
            st.effect = 'mention_glow';
          }
          b._replayHiddenCache = null;
          persistScript(b, false, r);
          renderReplayUI();
          openEffectPopover(rawIdx, clientX, clientY, true);
          if (activeIdx >= 0) window.MinNoteGeoReplay.playSingleStep(activeIdx);
          return;
        }
        btn.classList.toggle('on', key === 'showGuides' ? st.showGuides !== false : !!st[key]);
        persistScript(b, false, r);
        renderReplayUI();
        if (activeIdx >= 0) window.MinNoteGeoReplay.playSingleStep(activeIdx);
      });
    });

    pop.querySelector('[data-fx-preview]').addEventListener('click', () => {
      if (activeIdx >= 0) window.MinNoteGeoReplay.playSingleStep(activeIdx);
    });

    pop.querySelector('[data-fx-apply-all]').addEventListener('click', () => {
      const fx = st.effect || 'draw';
      const ea = st.easing || 'easeInOut';
      const dm = Number(st.durationMul) || 1;
      const pa = Number(st.pauseAfter) || 0;
      for (const item of r.steps) {
        item.effect = fx;
        item.easing = ea;
        item.durationMul = dm;
        item.pauseAfter = pa;
      }
      b._replayHiddenCache = null;
      persistScript(b, true, r);
      renderReplayUI();
      closeEffectPopover();
    });
  }

  function getActiveReplays(b) {
    if (!b) return [];
    if (typeof b._getActiveReplays === 'function') return b._getActiveReplays();
    return (b.replay && b.replay.active) ? [b.replay] : [];
  }

  function getFocusedReplay(b) {
    const list = getActiveReplays(b);
    if (!list.length) return null;
    if (b.activeReplayId) {
      const found = list.find(r => r.id === b.activeReplayId);
      if (found) return found;
    }
    return list[0];
  }

  function ptName(geo, id) {
    const p = geo.points[id];
    return (p && p.label) ? p.label : '?';
  }

  function describeShape(geo, sh, rev, tempHide) {
    const names = sh.pts.map(id => ptName(geo, id));
    const tags = [];
    if (sh.dashed) tags.push('nét đứt');
    if (tempHide) tags.push('vẽ rồi ẩn');
    const tagStr = tags.length ? ` (${tags.join(', ')})` : '';
    switch (sh.kind) {
      case 'segment': {
        const a = rev ? names[1] : names[0];
        const b = rev ? names[0] : names[1];
        return (sh.arrow ? 'Vectơ ' : 'Đoạn thẳng ') + `${a} → ${b}${tagStr}`;
      }
      case 'line': {
        const a = rev ? names[1] : names[0];
        const b = rev ? names[0] : names[1];
        return `Đường thẳng ${a} → ${b}${tagStr}`;
      }
      case 'ray': {
        const a = rev ? names[1] : names[0];
        const b = rev ? names[0] : names[1];
        return `Tia ${a} → ${b}${tagStr}`;
      }
      case 'extend':
        return `Kéo dài ${names[1] || ''}${names[2] || ''} → ${names[0] || ''}${tagStr}`;
      case 'circle':
        return `Đường tròn (${names[0]}; ${names[0]}${names[1]})${tagStr}`;
      case 'polygon':
        return `Đa giác ${names.join('')}${sh.fill ? ' (tô màu)' : ''}${tempHide ? ' (vẽ rồi ẩn)' : ''}`;
      case 'right':
        return `Kí hiệu góc vuông ${names.join('')}`;
      case 'angle':
        return `Góc ${names.join('')}`;
      case 'tick':
        return `Kí hiệu bằng nhau ${names[0]}${names[1]}`;
      case 'plane':
        return `Mặt phẳng (${sh.name || 'P'})`;
      case 'cone': return `Hình nón (${names.join('')})`;
      case 'cylinder': return `Hình trụ (${names.join('')})`;
      case 'sphere': return `Hình cầu (${names[0]})`;
      case 'ellipse': return `Elip (${names[0]})`;
      case 'parabola': return `Parabol (${names[0]})`;
      case 'hyperbola': return `Hypebol (${names[0]})`;
      default:
        return `${sh.kind} ${names.join('')}${tagStr}`;
    }
  }

  function isReplayableItem(it) {
    if (!it || !it.id) return false;
    const K = window.__mnGeoKernel;
    if (K && typeof K.xr === 'function' && K.xr(it)) return false;
    return true;
  }

  function defaultItemEffect(it) {
    if (!it) return 'fade';
    if (it.type === 'text' || it.type === 'problem') return 'typewriter';
    if (it.type === 'graph' || it.type === 'oxyz') return 'graph_trace';
    if (it.type === 'vartable') return 'wipe';
    if (it.type === 'image') return 'zoom';
    return 'fade';
  }

  function describeItem(it) {
    if (!it) return 'Nội dung';
    switch (it.type) {
      case 'text': {
        const raw = String(it.text || '').replace(/\s+/g, ' ').trim();
        const short = raw.length > 26 ? raw.slice(0, 26) + '…' : raw;
        return short ? `Chữ/Toán: "${short}"` : 'Công thức / Văn bản';
      }
      case 'problem':
        return it.title ? `Bài toán: ${it.title}` : 'Khung bài toán';
      case 'graph':
        return 'Đồ thị hàm số';
      case 'vartable':
        return 'Bảng biến thiên';
      case 'oxyz':
        return 'Hệ trục Oxyz';
      case 'image':
        return 'Hình ảnh';
      default:
        return 'Mục bảng';
    }
  }

  function describeStroke(pg, sk) {
    if (!sk) return 'Nét viết tay';
    const list = (pg && Array.isArray(pg.strokes)) ? pg.strokes : [];
    const idx = list.findIndex(x => x.id === sk.id);
    const num = idx >= 0 ? ` #${idx + 1}` : '';
    return sk.kind === 'highlighter' ? `Nét tô sáng${num}` : `Nét viết tay${num}`;
  }

  function stepDisplayLabel(geo, step, pg) {
    const prefix = step.mode === 'cue'
      ? '✦ Nhấn mạnh: '
      : (step.effect === 'morph_bezier' ? '⟳ Biến hình: ' : '');

    if (step.items && step.items.length > 1) {
      if (step.customTitle) return prefix + step.customTitle;
      const first = step.items[0];
      let firstLbl = 'Nét';
      if (first.kind === 'shape') {
        const sh = geo.shapes.find(s => s.id === first.refId);
        firstLbl = sh ? describeShape(geo, sh, !!(first.rev ?? step.rev), !!step.tempHide) : 'Hình';
      } else if (first.kind === 'point') {
        firstLbl = `Điểm ${ptName(geo, first.refId)}`;
      } else if (first.kind === 'item') {
        const obj = pg && Array.isArray(pg.items) ? pg.items.find(x => x.id === first.refId) : null;
        firstLbl = describeItem(obj);
      } else if (first.kind === 'stroke') {
        const sk = pg && Array.isArray(pg.strokes) ? pg.strokes.find(x => x.id === first.refId) : null;
        firstLbl = describeStroke(pg, sk);
      }
      return `${prefix}Nhóm (${step.items.length} mục): ${firstLbl}…`;
    }
    const it = (step.items && step.items[0]) || step;
    if (it.kind === 'point') {
      const p = geo.points[it.refId];
      if (p && p.def && p.def.t === 'inter') {
        return `${prefix}Giao điểm ${ptName(geo, it.refId)}`;
      }
      return `${prefix}Điểm ${ptName(geo, it.refId)}`;
    }
    if (it.kind === 'item') {
      const obj = pg && Array.isArray(pg.items) ? pg.items.find(x => x.id === it.refId) : null;
      return prefix + describeItem(obj);
    }
    if (it.kind === 'stroke') {
      const sk = pg && Array.isArray(pg.strokes) ? pg.strokes.find(x => x.id === it.refId) : null;
      return prefix + describeStroke(pg, sk);
    }
    const sh = geo.shapes.find(s => s.id === it.refId);
    return prefix + (sh ? describeShape(geo, sh, !!(it.rev ?? step.rev), !!step.tempHide) : 'Đối tượng');
  }

  function parseNtTimestamp(id) {
    if (typeof id !== 'string' || id.length < 8) return null;
    const head = id.slice(0, 8);
    if (!/^[a-z0-9]{8}$/.test(head)) return null;
    const ms = parseInt(head, 36);
    return (ms > 1500000000000 && ms < 4000000000000) ? ms : null;
  }

  function extractSolidGroups(geo, scopeShapes, scopePoints) {
    const groups = new Set();
    if (!geo) return [];
    for (const sh of (geo.shapes || [])) {
      if (sh.group && (!scopeShapes || scopeShapes.has(sh.id))) groups.add(sh.group);
    }
    for (const pt of Object.values(geo.points || {})) {
      if (pt.group && (!scopePoints || scopePoints.has(pt.id))) groups.add(pt.group);
    }
    return [...groups].sort();
  }

  function buildFigureTitle(geo, scopeShapes, scopePoints, fallbackIndex, scopeItems, scopeStrokes) {
    if (!scopeShapes && !scopePoints && !scopeItems && !scopeStrokes) return 'Cả trang';
    const labels = [];
    const seen = new Set();
    const ptSet = scopePoints || new Set();
    for (const pid of ptSet) {
      const p = geo && geo.points && geo.points[pid];
      const lbl = p && p.label ? String(p.label).trim() : '';
      if (lbl && !seen.has(lbl)) {
        seen.add(lbl);
        labels.push(lbl);
      }
    }
    if (labels.length >= 2) {
      const hasS = labels.includes('S');
      const rest = labels.filter(l => l !== 'S').sort((a, b) => a.localeCompare(b));
      if (hasS && rest.length >= 2) {
        return `S.${rest.slice(0, 4).join('')}`;
      }
      return `Hình ${rest.slice(0, 5).join('')}`;
    }
    const geoCnt = (scopeShapes ? scopeShapes.size : 0) + ptSet.size;
    const boardCnt = (scopeItems ? scopeItems.size : 0) + (scopeStrokes ? scopeStrokes.size : 0);
    if (geoCnt === 0 && boardCnt > 0) {
      return `Bài giảng #${fallbackIndex || 1} (${boardCnt} mục)`;
    }
    const cnt = scopeShapes ? scopeShapes.size : ptSet.size;
    return `Hình #${fallbackIndex || 1} (${cnt} nét)`;
  }

  function buildBoardContentSteps(pg, scopeItems, scopeStrokes) {
    if (!pg) return [];
    const out = [];
    const items = (Array.isArray(pg.items) ? pg.items : [])
      .filter(it => isReplayableItem(it) && (!scopeItems || scopeItems.has(it.id)))
      .sort((a, b) => ((a.y || 0) - (b.y || 0)) || ((a.x || 0) - (b.x || 0)));
    for (const it of items) {
      out.push({
        id: 'st_i_' + it.id,
        kind: 'item',
        refId: it.id,
        effect: defaultItemEffect(it),
        easing: 'easeInOut',
        enabled: true
      });
    }
    const strokes = (Array.isArray(pg.strokes) ? pg.strokes : [])
      .filter(sk => sk && sk.id && (!scopeStrokes || scopeStrokes.has(sk.id)));
    for (const sk of strokes) {
      out.push({
        id: 'st_k_' + sk.id,
        kind: 'stroke',
        refId: sk.id,
        effect: 'draw',
        easing: 'easeInOut',
        enabled: true
      });
    }
    return out;
  }

  function buildDefaultSteps(geo, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes, opts = {}) {
    const shapes = geo.shapes.filter(s => s.kind !== 'solid' && s.kind !== 'flatLink' && !s.hidden && (!scopeShapes || scopeShapes.has(s.id)));
    const usedPtsByShape = new Set();
    for (const s of shapes) s.pts.forEach(id => usedPtsByShape.add(id));
    const solidGroups = new Set(geo.shapes.filter(s => s.kind === 'solid').map(s => s.group).filter(Boolean));

    const isStepPt = (pt) => {
      if (!pt || !pt.show || pt.hidden) return false;
      if (scopePoints && !scopePoints.has(pt.id)) return false;
      if (pt.def && pt.def.t === 'inter') return true;
      if (!usedPtsByShape.has(pt.id)) return true;
      if (pt.group && solidGroups.has(pt.group)) return false;
      return ['mid', 'on', 'foot', 'path', 'free'].includes(pt.def.t) && (!pt.group || !solidGroups.has(pt.group));
    };

    const entries = [];
    const ptEntries = Object.values(geo.points);
    ptEntries.forEach((pt, idx) => {
      if (!isStepPt(pt)) return;
      if (pt.def.t === 'free' && usedPtsByShape.has(pt.id)) return;
      entries.push({
        ts: parseNtTimestamp(pt.id),
        kindRank: 0,
        ord: idx,
        step: {
          id: 'st_p_' + pt.id,
          kind: 'point',
          refId: pt.id,
          rev: false,
          showGuides: !!(pt.def && pt.def.t === 'inter'),
          enabled: true
        }
      });
    });

    shapes.forEach((sh, idx) => {
      entries.push({
        ts: parseNtTimestamp(sh.id),
        kindRank: 1,
        ord: idx,
        step: {
          id: 'st_s_' + sh.id,
          kind: 'shape',
          refId: sh.id,
          rev: false,
          tempHide: false,
          enabled: true
        }
      });
    });

    const hasAnyTs = entries.some(e => e.ts !== null);
    if (hasAnyTs) {
      entries.sort((a, b) => {
        if (a.ts !== null && b.ts !== null && a.ts !== b.ts) return a.ts - b.ts;
        if (a.ts !== null && b.ts === null) return -1;
        if (a.ts === null && b.ts !== null) return 1;
        if (a.kindRank !== b.kindRank) return a.kindRank - b.kindRank;
        return a.ord - b.ord;
      });
    }

    const raw = entries.map(e => e.step);
    const byPtId = new Map();
    for (const st of raw) if (st.kind === 'point') byPtId.set(st.refId, st);

    const out = [];
    const emitted = new Set();
    const emitPtDeps = (pid, visiting = new Set()) => {
      const pst = byPtId.get(pid);
      if (!pst || emitted.has(pst.id) || visiting.has(pid)) return;
      visiting.add(pid);
      const pt = geo.points[pid];
      if (pt && pt.def) {
        const d = pt.def;
        const deps = [];
        if (d.a) deps.push(d.a);
        if (d.b) deps.push(d.b);
        if (d.p) deps.push(d.p);
        if (d.l1) deps.push(d.l1[0], d.l1[1]);
        if (d.l2) deps.push(d.l2[0], d.l2[1]);
        for (const dep of deps) emitPtDeps(dep, visiting);
      }
      emitted.add(pst.id);
      out.push(pst);
    };

    const shMap = new Map(shapes.map(s => [s.id, s]));
    for (const st of raw) {
      if (emitted.has(st.id)) continue;
      if (st.kind === 'point') {
        emitPtDeps(st.refId);
      } else if (st.kind === 'shape') {
        const sh = shMap.get(st.refId);
        if (sh) for (const pid of sh.pts) emitPtDeps(pid);
        emitted.add(st.id);
        out.push(st);
      }
    }

    const explicitBoard = !!(scopeItems && scopeItems.size) || !!(scopeStrokes && scopeStrokes.size);
    const hasBoardContent = pg && ((Array.isArray(pg.items) && pg.items.some(isReplayableItem)) || (Array.isArray(pg.strokes) && pg.strokes.length > 0));
    const shouldIncludeBoard = !!(opts && opts.includeBoardContent) || explicitBoard || (!out.length && hasBoardContent);
    if (shouldIncludeBoard && pg) {
      const boardSteps = buildBoardContentSteps(pg, scopeItems, scopeStrokes);
      out.push(...boardSteps);
    }
    return out;
  }

  /* ============================================================================
   * PER-FIGURE PERSISTENT SCRIPT STORAGE (Remembers each figure independently!)
   * ============================================================================ */
  function loadSavedScriptsMap(pg) {
    const b = getBoard();
    if (b && typeof b._readMergedScriptsForPage === 'function' && pg) {
      return b._readMergedScriptsForPage(pg).scripts;
    }
    const merged = {};
    const del = {};
    const addDel = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, ts] of Object.entries(obj)) {
        const n = Number(ts) || 0;
        if (n > (del[k] || 0)) del[k] = n;
      }
    };
    const addMap = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (!v || typeof v !== 'object' || !Array.isArray(v.steps) || !v.steps.length) continue;
        const cur = merged[k];
        const vTs = Number(v.updatedAt) || 0;
        const cTs = cur ? (Number(cur.updatedAt) || 0) : 0;
        if (!cur || vTs > cTs || (vTs === cTs && v.steps.length > cur.steps.length)) {
          merged[k] = v;
        }
      }
    };
    if (pg && pg.id) {
      try {
        const rawDel = localStorage.getItem('mn_geo_scripts_del_' + pg.id);
        if (rawDel) addDel(JSON.parse(rawDel));
      } catch {}
      try {
        const rawMap = localStorage.getItem('mn_geo_scripts_' + pg.id);
        if (rawMap) addMap(JSON.parse(rawMap));
      } catch {}
    }
    if (pg && pg.geo) {
      addDel(pg.geo._deletedScripts);
      addMap(pg.geo.scripts);
    }
    // Legacy single-script fallback
    if (!merged.all && !(del.all > 0)) {
      let legacy = (pg && pg.geo && Array.isArray(pg.geo.script) && pg.geo.script.length) ? pg.geo.script : null;
      if (!legacy && pg && pg.id) {
        try {
          const raw = localStorage.getItem('mn_geo_script_' + pg.id);
          if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p) && p.length) legacy = p;
          }
        } catch {}
      }
      if (legacy) {
        merged.all = { key: 'all', title: 'Cả trang', shapeIds: null, pointIds: null, solidGroups: [], steps: legacy, speed: 1, pauseBetween: false, updatedAt: 0 };
      }
    }
    for (const [k, dTs] of Object.entries(del)) {
      if (merged[k] && dTs > (Number(merged[k].updatedAt) || 0)) delete merged[k];
    }
    return merged;
  }

  function collectStepRefs(steps) {
    const shapes = new Set(), points = new Set(), items = new Set(), strokes = new Set();
    if (!Array.isArray(steps)) return { shapes, points, items, strokes };
    for (const st of steps) {
      if (!st) continue;
      const list = (st.items && st.items.length) ? st.items : [st];
      for (const it of list) {
        if (!it || !it.refId) continue;
        if (it.kind === 'shape') shapes.add(it.refId);
        else if (it.kind === 'point') points.add(it.refId);
        else if (it.kind === 'item') items.add(it.refId);
        else if (it.kind === 'stroke') strokes.add(it.refId);
      }
    }
    return { shapes, points, items, strokes };
  }

  function isScriptCustomized(r, pg) {
    if (!r || !Array.isArray(r.steps) || !r.steps.length) return false;
    for (const st of r.steps) {
      if (!st) continue;
      if (st.items && st.items.length > 1) return true;
      if (st.mode === 'cue' || st.tempHide || st.rev || st.includeHidden || st.enabled === false) return true;
      if (st.effect && st.effect !== 'draw') return true;
      if (st.easing && st.easing !== 'easeInOut') return true;
      if (Number(st.durationMul) && Math.abs(Number(st.durationMul) - 1) > 0.04) return true;
      if (Number(st.pauseAfter) > 0) return true;
      if (st.customTitle || st.morphFromId) return true;
    }
    if (pg && pg.geo) {
      const def = buildDefaultSteps(pg.geo, r.scopeShapes, r.scopePoints, pg, r.scopeItems, r.scopeStrokes);
      if (def.length !== r.steps.length) return true;
      for (let i = 0; i < def.length; i++) {
        if ((def[i].refId || '') !== (r.steps[i].refId || '') || (def[i].kind || '') !== (r.steps[i].kind || '')) return true;
      }
    }
    return false;
  }

  function computeOverlapScore(entry, scopeShapes, scopePoints, solidGroups, scopeItems, scopeStrokes) {
    if (!entry || entry.key === 'all') return 0;
    const eShapes = new Set(Array.isArray(entry.shapeIds) ? entry.shapeIds : []);
    const ePoints = new Set(Array.isArray(entry.pointIds) ? entry.pointIds : []);
    const eItems = new Set(Array.isArray(entry.itemIds) ? entry.itemIds : []);
    const eStrokes = new Set(Array.isArray(entry.strokeIds) ? entry.strokeIds : []);
    for (const st of (entry.steps || [])) {
      const items = (st.items && st.items.length) ? st.items : [st];
      for (const it of items) {
        if (it.kind === 'shape' && it.refId) eShapes.add(it.refId);
        if (it.kind === 'point' && it.refId) ePoints.add(it.refId);
        if (it.kind === 'item' && it.refId) eItems.add(it.refId);
        if (it.kind === 'stroke' && it.refId) eStrokes.add(it.refId);
      }
    }

    let inter = 0;
    const unionSet = new Set();
    if (scopeShapes) {
      for (const id of scopeShapes) { unionSet.add('s:' + id); if (eShapes.has(id)) inter++; }
      for (const id of eShapes) unionSet.add('s:' + id);
    }
    if (scopePoints) {
      for (const id of scopePoints) { unionSet.add('p:' + id); if (ePoints.has(id)) inter++; }
      for (const id of ePoints) unionSet.add('p:' + id);
    }
    if (scopeItems) {
      for (const id of scopeItems) { unionSet.add('i:' + id); if (eItems.has(id)) inter++; }
      for (const id of eItems) unionSet.add('i:' + id);
    }
    if (scopeStrokes) {
      for (const id of scopeStrokes) { unionSet.add('k:' + id); if (eStrokes.has(id)) inter++; }
      for (const id of eStrokes) unionSet.add('k:' + id);
    }
    let score = unionSet.size > 0 ? (inter / unionSet.size) : 0;

    if (solidGroups && solidGroups.length && Array.isArray(entry.solidGroups) && entry.solidGroups.length) {
      const sgSet = new Set(solidGroups);
      const sharedSolid = entry.solidGroups.some(g => sgSet.has(g));
      if (sharedSolid) score = Math.max(score, 0.72);
    }
    return score;
  }

  function findSavedScriptForScope(pg, scopeKey, scopeShapes, scopePoints, scopeItems, scopeStrokes) {
    const map = loadSavedScriptsMap(pg);
    if (map[scopeKey] && Array.isArray(map[scopeKey].steps) && map[scopeKey].steps.length) {
      return map[scopeKey];
    }
    if (scopeShapes || scopePoints || scopeItems || scopeStrokes) {
      const solidGroups = extractSolidGroups(pg.geo, scopeShapes, scopePoints);
      let best = null;
      let bestScore = 0.34;
      for (const entry of Object.values(map)) {
        if (!entry || entry.key === 'all' || !Array.isArray(entry.steps) || !entry.steps.length) continue;
        const sc = computeOverlapScore(entry, scopeShapes, scopePoints, solidGroups, scopeItems, scopeStrokes);
        if (sc > bestScore || (sc === bestScore && best && (entry.updatedAt || 0) > (best.updatedAt || 0))) {
          bestScore = sc;
          best = entry;
        }
      }
      if (best) return best;
    }
    if (scopeKey === 'all' && map.all && Array.isArray(map.all.steps) && map.all.steps.length) {
      return map.all;
    }
    return null;
  }

  function reconcileSavedScript(geo, saved, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes) {
    if (!Array.isArray(saved) || !saved.length) {
      return buildDefaultSteps(geo, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes);
    }
    // Check existence against ALL still-existing objects on the page (NEVER drop a saved step just because
    // a shape/point was temporarily hidden or omitted from a partial re-selection — only drop if deleted!)
    const existShIds = new Set((geo.shapes || []).filter(s => s.kind !== 'solid' && s.kind !== 'flatLink').map(s => s.id));
    const existPtIds = new Set(Object.keys(geo.points || {}));
    const existItemIds = new Set((pg && Array.isArray(pg.items) ? pg.items : []).filter(isReplayableItem).map(it => it.id));
    const existStrokeIds = new Set((pg && Array.isArray(pg.strokes) ? pg.strokes : []).filter(sk => sk && sk.id).map(sk => sk.id));

    const seenSh = new Set();
    const seenPt = new Set();
    const seenItem = new Set();
    const seenStroke = new Set();
    const out = [];
    let hadBoardRefs = false;

    for (const st of saved) {
      if (!st) continue;
      const isCue = st.mode === 'cue';
      if (st.items && st.items.length) {
        const items = st.items.filter(it => {
          if (!it || !it.refId) return false;
          if (it.kind === 'shape' && existShIds.has(it.refId)) {
            if (isCue) return true;
            if (!seenSh.has(it.refId)) { seenSh.add(it.refId); return true; }
          }
          if (it.kind === 'point' && existPtIds.has(it.refId)) {
            if (isCue) return true;
            if (!seenPt.has(it.refId)) { seenPt.add(it.refId); return true; }
          }
          if (it.kind === 'item' && existItemIds.has(it.refId)) {
            hadBoardRefs = true;
            if (isCue) return true;
            if (!seenItem.has(it.refId)) { seenItem.add(it.refId); return true; }
          }
          if (it.kind === 'stroke' && existStrokeIds.has(it.refId)) {
            hadBoardRefs = true;
            if (isCue) return true;
            if (!seenStroke.has(it.refId)) { seenStroke.add(it.refId); return true; }
          }
          return false;
        });
        if (items.length === 1) {
          out.push({ ...st, id: st.id || ('st_' + items[0].refId), kind: items[0].kind, refId: items[0].refId, items: undefined, rev: !!(items[0].rev ?? st.rev), enabled: st.enabled !== false });
        } else if (items.length > 1) {
          out.push({ ...st, items, enabled: st.enabled !== false });
        }
      } else if (st.kind === 'shape' && existShIds.has(st.refId) && (isCue || !seenSh.has(st.refId))) {
        if (!isCue) seenSh.add(st.refId);
        out.push({ ...st, enabled: st.enabled !== false });
      } else if (st.kind === 'point' && existPtIds.has(st.refId) && (isCue || !seenPt.has(st.refId))) {
        if (!isCue) seenPt.add(st.refId);
        out.push({ ...st, enabled: st.enabled !== false });
      } else if (st.kind === 'item' && existItemIds.has(st.refId) && (isCue || !seenItem.has(st.refId))) {
        hadBoardRefs = true;
        if (!isCue) seenItem.add(st.refId);
        out.push({ ...st, enabled: st.enabled !== false });
      } else if (st.kind === 'stroke' && existStrokeIds.has(st.refId) && (isCue || !seenStroke.has(st.refId))) {
        hadBoardRefs = true;
        if (!isCue) seenStroke.add(st.refId);
        out.push({ ...st, enabled: st.enabled !== false });
      }
    }

    const fresh = buildDefaultSteps(geo, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes, { includeBoardContent: hadBoardRefs });
    for (const st of fresh) {
      if (st.kind === 'shape' && !seenSh.has(st.refId)) out.push(st);
      else if (st.kind === 'point' && !seenPt.has(st.refId)) out.push(st);
      else if (st.kind === 'item' && !seenItem.has(st.refId)) out.push(st);
      else if (st.kind === 'stroke' && !seenStroke.has(st.refId)) out.push(st);
    }
    return out;
  }

  function buildSolidFirstPreset(geo, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes, opts) {
    const baseSteps = buildDefaultSteps(geo, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes, opts);
    const solidGroups = new Set(geo.shapes.filter(s => s.kind === 'solid').map(s => s.group).filter(Boolean));
    if (!solidGroups.size) return baseSteps;

    const shMap = new Map(geo.shapes.map(s => [s.id, s]));
    const solidByGroup = new Map();
    const rest = [];

    for (const st of baseSteps) {
      if (st.kind === 'shape') {
        const sh = shMap.get(st.refId);
        if (sh && sh.group && solidGroups.has(sh.group)) {
          if (!solidByGroup.has(sh.group)) solidByGroup.set(sh.group, []);
          solidByGroup.get(sh.group).push({ kind: 'shape', refId: sh.id, rev: false });
          continue;
        }
      }
      rest.push(st);
    }

    const out = [];
    let gIdx = 1;
    for (const [grp, items] of solidByGroup.entries()) {
      out.push({
        id: 'st_grp_solid_' + grp,
        kind: 'group',
        customTitle: solidByGroup.size > 1 ? `Khối 3D gốc #${gIdx++} (${items.length} cạnh)` : `Khối 3D gốc (${items.length} cạnh)`,
        items,
        enabled: true
      });
    }
    return [...out, ...rest];
  }

  function flashSavedBadge(count = 1) {
    if (!replayPanel) return;
    const btn = replayPanel.querySelector('#mn-rp-save');
    if (!btn) return;
    btn.classList.add('saved');
    btn.textContent = '✓';
    btn.title = count > 1 ? `Đã lưu ${count} kịch bản!` : 'Đã lưu kịch bản!';
    clearTimeout(savedFlashTimer);
    savedFlashTimer = setTimeout(() => {
      if (btn) {
        btn.classList.remove('saved');
        btn.textContent = '💾';
        btn.title = 'Lưu kịch bản riêng cho từng hình đang mở';
      }
    }, 1500);
  }

  function persistScript(b, showFeedback = false, targetReplay = null, extraMeta = null) {
    const r = targetReplay || getFocusedReplay(b);
    if (!b || !r) return false;
    const pg = b.doc.pages[r.page];
    if (!pg) return false;
    const key = r.scriptKey || r.scopeKey || 'all';
    // Ensure saved scope metadata ALWAYS includes every refId currently in r.steps so reopening NEVER truncates!
    let shapeIds = null, pointIds = null, itemIds = null, strokeIds = null;
    if (key !== 'all') {
      const refs = collectStepRefs(r.steps);
      const shSet = new Set(r.scopeShapes || []);
      const ptSet = new Set(r.scopePoints || []);
      for (const id of refs.shapes) shSet.add(id);
      for (const id of refs.points) ptSet.add(id);
      for (const sh of (pg.geo && pg.geo.shapes ? pg.geo.shapes : [])) {
        if (shSet.has(sh.id) && Array.isArray(sh.pts)) sh.pts.forEach(pid => ptSet.add(pid));
      }
      shapeIds = shSet.size ? [...shSet] : (r.scopeShapes ? [...r.scopeShapes] : null);
      pointIds = ptSet.size ? [...ptSet] : (r.scopePoints ? [...r.scopePoints] : null);
      const itSet = new Set(r.scopeItems || []);
      const skSet = new Set(r.scopeStrokes || []);
      for (const id of refs.items) itSet.add(id);
      for (const id of refs.strokes) skSet.add(id);
      itemIds = itSet.size ? [...itSet] : null;
      strokeIds = skSet.size ? [...skSet] : null;
      if (shapeIds && r.scopeShapes) shapeIds.forEach(id => r.scopeShapes.add(id));
      if (pointIds && r.scopePoints) pointIds.forEach(id => r.scopePoints.add(id));
    }
    const solidGroups = extractSolidGroups(pg.geo, r.scopeShapes, r.scopePoints);
    const meta = {
      key,
      title: r.title || buildFigureTitle(pg.geo, r.scopeShapes, r.scopePoints, 1, r.scopeItems, r.scopeStrokes),
      shapeIds,
      pointIds,
      itemIds,
      strokeIds,
      solidGroups,
      speed: r.speed || 1,
      pauseBetween: !!r.pauseBetween,
      followCamera: r.followCamera !== false,
      springCamera: r.springCamera !== false,
      autoOrbitAfter: !!r.autoOrbitAfter,
      stylePreset: r.stylePreset || '',
      ...(extraMeta || {})
    };
    const ok = b.saveBuildScript(r.page, r.steps, meta);
    if (ok && showFeedback) flashSavedBadge(1);
    return ok;
  }

  function flushNotebookAfterScriptSave(reason = 'replay_save') {
    try {
      if (window.__minnotePersistence && typeof window.__minnotePersistence.saveAllAndFlush === 'function') {
        window.__minnotePersistence.saveAllAndFlush(reason).catch(() => {});
        return;
      }
      if (window.__minnoteAppBridge && typeof window.__minnoteAppBridge.saveAllNow === 'function') {
        window.__minnoteAppBridge.saveAllNow(reason).catch(() => {});
      }
    } catch {}
  }

  function persistAllActiveScripts(b, showFeedback = true, flushNow = true) {
    const actives = getActiveReplays(b);
    if (!actives.length) return false;
    let savedCnt = 0;
    for (const item of actives) {
      if (persistScript(b, false, item)) savedCnt++;
    }
    if (savedCnt > 0) {
      if (flushNow) flushNotebookAfterScriptSave('replay_save');
      if (showFeedback) {
        flashSavedBadge(savedCnt);
        if (typeof window.showToast === 'function') {
          window.showToast(savedCnt > 1 ? `Đã lưu an toàn ${savedCnt} kịch bản hình!` : 'Đã lưu an toàn kịch bản dựng hình!', 'success');
        }
      }
    }
    return savedCnt > 0;
  }

  function ensureReplayUI() {
    if (!replayPanel) {
      const el = document.createElement('div');
      el.id = 'mn-replay-panel';
      el.innerHTML = `
        <div class="mn-rp-head">
          <div class="mn-rp-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor" fill-opacity=".22"/></svg>
            <span id="mn-rp-head-title">Kịch bản</span>
            <span class="mn-rp-count-badge" id="mn-rp-count-badge" style="display:none;"></span>
          </div>
          <div class="mn-mp-head-btns">
            <button class="mn-icon-btn" id="mn-rp-undo-script" title="Khôi phục bản lưu kịch bản trước đó" style="display:none;">↶</button>
            <button class="mn-icon-btn" id="mn-rp-save" title="Lưu kịch bản riêng cho từng hình đang mở">💾</button>
            <button class="mn-icon-btn" id="mn-rp-steps-toggle" title="Mở / Ẩn danh sách bước để sắp xếp">☰</button>
            <button class="mn-icon-btn" id="mn-rp-collapse" title="Thu gọn thành thanh nổi siêu gọn">─</button>
            <button class="mn-icon-btn danger" id="mn-rp-close" title="Đóng kịch bản">✕</button>
          </div>
        </div>
        <div class="mn-rp-tabs" id="mn-rp-tabs" style="display:none;"></div>
        <div class="mn-rp-saved-bar" id="mn-rp-saved-bar" style="display:none;"></div>
        <div class="mn-rp-controls">
          <div class="mn-rp-transport">
            <button class="mn-icon-btn" id="mn-rp-reset" title="Đưa về bước 0">↺</button>
            <button class="mn-icon-btn" id="mn-rp-prev" title="Bước trước">⏮</button>
            <button class="mn-icon-btn primary mn-play-btn" id="mn-rp-play" title="Phát / Tạm dừng">▶</button>
            <button class="mn-icon-btn" id="mn-rp-next" title="Bước tiếp">⏭</button>
            <button class="mn-icon-btn mn-rp-speed-btn" id="mn-rp-speed-cycle" title="Tốc độ vẽ (bấm để đổi: 0.5× → 1× → 1.5× → 2× → 3×)">1×</button>
            <button class="mn-icon-btn" id="mn-rp-pause-step" title="Tự dừng sau mỗi nét để giảng bài">⏸₁</button>
          </div>
          <div class="mn-rp-scrubber">
            <span id="mn-rp-step-count" style="font-weight:700;color:#2563eb;min-width:36px;font-variant-numeric:tabular-nums;">0/0</span>
            <input type="range" id="mn-rp-scrub" min="0" max="0" step="1" value="0" />
          </div>
          <div class="mn-rp-tools-bar">
            <button type="button" class="mn-rp-tool-btn active" id="mn-rp-follow" title="Camera lò xo giảm chấn tự động theo dõi nét vẽ">🎥 <span>Camera lò xo</span></button>
            <button type="button" class="mn-rp-tool-btn" id="mn-rp-hand" title="Bật / Tắt tay cầm bút khi dựng lại">✍ <span>Tay bút</span></button>
            <button type="button" class="mn-rp-tool-btn" id="mn-rp-orbit-now" title="Xoay tròn đều 360° khối 3D">↻ <span>360°</span></button>
            <button type="button" class="mn-rp-tool-btn" id="mn-rp-orbit-after" title="Tự xoay 360° sau khi dựng xong hình 3D">⟳ <span>Tự xoay</span></button>
            <button type="button" class="mn-rp-tool-btn primary-soft" id="mn-rp-export" title="Xuất GIF động hoặc Video (cắt gọn quanh hình)">🎬 <span>Xuất</span></button>
          </div>
        </div>
        <div class="mn-rp-presets-pop" id="mn-rp-presets-pop">
          <div class="mn-rp-preset-row">
            <button class="mn-chip" id="mn-rp-preset-orig" title="Khôi phục thứ tự gốc">Gốc</button>
            <button class="mn-chip" id="mn-rp-preset-solid" title="Gộp khối 3D gốc thành Bước 1">Khối→Nét</button>
            <button class="mn-chip" id="mn-rp-preset-hidden" title="Thêm các đường ẩn vào kịch bản">+Ẩn</button>
            <button class="mn-chip" id="mn-rp-preset-ungroup" title="Tách tất cả nhóm bước">Tách</button>
          </div>
          <div class="mn-rp-preset-row mn-rp-style-row" id="mn-rp-style-row">
            <button class="mn-chip mn-style-chip" data-style-preset="domiinh" title="Phong cách Đỗ Miinh: phấn bảng, hào quang điểm nhấn, camera lò xo">✨ Đỗ Miinh</button>
            <button class="mn-chip mn-style-chip" data-style-preset="manim" title="Phong cách Manim: tia Laser, Viền→Tô, Vòng Fourier & đồ thị">🎬 Manim</button>
            <button class="mn-chip mn-style-chip" data-style-preset="geo3d" title="Phong cách 3D: nâng khối, soi nét khuất & tự xoay 360°">🧊 3D Chuẩn</button>
            <button class="mn-chip" id="mn-rp-toggle-board" title="Đưa thêm Công thức, Văn bản, Đồ thị & Nét viết tay trên trang vào kịch bản">+ Công thức/Nét</button>
          </div>
        </div>
        <div class="mn-rp-list" id="mn-rp-list"></div>
      `;
      document.body.appendChild(el);
      makeDraggable(el, el.querySelector('.mn-rp-head'));

      el.querySelector('#mn-rp-undo-script').addEventListener('click', () => {
        window.MinNoteGeoReplay.undoScriptChange();
      });
      el.querySelector('#mn-rp-save').addEventListener('click', () => {
        const b = getBoard();
        persistAllActiveScripts(b, true, true);
        renderReplayUI();
      });
      el.querySelector('#mn-rp-close').addEventListener('click', () => window.MinNoteGeoReplay.close());
      el.querySelector('#mn-rp-collapse').addEventListener('click', () => {
        replayViewMode = 'pill';
        renderReplayUI();
      });
      el.querySelector('#mn-rp-reset').addEventListener('click', () => {
        const actives = getActiveReplays(getBoard());
        if (actives.length > 1) window.MinNoteGeoReplay.resetAll();
        else window.MinNoteGeoReplay.reset();
      });
      el.querySelector('#mn-rp-prev').addEventListener('click', () => window.MinNoteGeoReplay.prevStep());
      el.querySelector('#mn-rp-next').addEventListener('click', () => window.MinNoteGeoReplay.nextStep());
      el.querySelector('#mn-rp-play').addEventListener('click', () => {
        const actives = getActiveReplays(getBoard());
        if (actives.length > 1) window.MinNoteGeoReplay.togglePlayAll();
        else window.MinNoteGeoReplay.togglePlay();
      });

      el.querySelector('#mn-rp-scrub').addEventListener('input', (e) => {
        window.MinNoteGeoReplay.jumpTo(parseInt(e.target.value, 10) || 0, true);
      });
      el.querySelector('#mn-rp-pause-step').addEventListener('click', () => {
        const b = getBoard();
        const r = getFocusedReplay(b);
        if (r) {
          r.pauseBetween = !r.pauseBetween;
          persistScript(b, false, r);
          renderReplayUI();
        }
      });
      el.querySelector('#mn-rp-speed-cycle').addEventListener('click', () => {
        const b = getBoard();
        const r = getFocusedReplay(b);
        if (!r) return;
        const curIdx = SPEED_CYCLE.findIndex(v => Math.abs(v - (r.speed || 1)) < 0.08);
        const nextVal = SPEED_CYCLE[(curIdx + 1) % SPEED_CYCLE.length];
        window.MinNoteGeoReplay.setSpeed(nextVal);
      });
      el.querySelector('#mn-rp-steps-toggle').addEventListener('click', () => {
        stepsCollapsed = !stepsCollapsed;
        presetsOpen = !stepsCollapsed;
        renderReplayUI();
      });
      el.querySelector('#mn-rp-preset-orig').addEventListener('click', () => window.MinNoteGeoReplay.applyPreset('orig'));
      el.querySelector('#mn-rp-preset-solid').addEventListener('click', () => window.MinNoteGeoReplay.applyPreset('solidFirst'));
      el.querySelector('#mn-rp-preset-hidden').addEventListener('click', () => window.MinNoteGeoReplay.addHiddenLines());
      el.querySelector('#mn-rp-preset-ungroup').addEventListener('click', () => window.MinNoteGeoReplay.applyPreset('ungroup'));
      el.querySelectorAll('[data-style-preset]').forEach(btn => {
        btn.addEventListener('click', () => window.MinNoteGeoReplay.applyStylePreset(btn.dataset.stylePreset));
      });
      el.querySelector('#mn-rp-toggle-board').addEventListener('click', () => window.MinNoteGeoReplay.toggleIncludeBoardContent());

      el.querySelector('#mn-rp-follow').addEventListener('click', () => {
        window.MinNoteGeoReplay.toggleFollowCamera();
      });
      el.querySelector('#mn-rp-hand').addEventListener('click', () => {
        if (window.MinNoteHandCursor && typeof window.MinNoteHandCursor.toggleReplay === 'function') {
          window.MinNoteHandCursor.toggleReplay();
        }
        renderReplayUI();
      });
      el.querySelector('#mn-rp-orbit-now').addEventListener('click', () => {
        const b = getBoard();
        const r = getFocusedReplay(b);
        if (!b || !r || typeof b.toggleAutoOrbit !== 'function') return;
        if (b.isAutoOrbiting && b.isAutoOrbiting()) {
          b.stopAutoOrbit(true);
        } else {
          const found = typeof b.findOrbitSolid === 'function' ? b.findOrbitSolid(r.page, r.scopeShapes) : null;
          if (found) b.startAutoOrbit(found.page, found.id, 0.75);
        }
        renderReplayUI();
      });
      el.querySelector('#mn-rp-orbit-after').addEventListener('click', () => {
        window.MinNoteGeoReplay.toggleAutoOrbitAfter();
      });
      el.querySelector('#mn-rp-export').addEventListener('click', () => {
        const b = getBoard();
        const r = getFocusedReplay(b);
        if (window.MinNoteReplayExporter && typeof window.MinNoteReplayExporter.openModal === 'function') {
          window.MinNoteReplayExporter.openModal(r);
        }
      });

      replayPanel = el;
    }

    if (!replayPill) {
      const pill = document.createElement('div');
      pill.id = 'mn-replay-pill';
      document.body.appendChild(pill);
      const wasDragged = makeDraggable(pill, pill);

      pill.addEventListener('click', (e) => {
        if (wasDragged()) return;
        const figBtn = e.target.closest('[data-pill-fig]');
        if (figBtn) {
          e.stopPropagation();
          window.MinNoteGeoReplay.togglePlayScript(figBtn.getAttribute('data-pill-fig'));
          return;
        }
        const btn = e.target.closest('[data-pill-act]');
        if (!btn) {
          if (replayViewMode === 'mini') {
            replayViewMode = 'pill';
            renderReplayUI();
          }
          return;
        }
        e.stopPropagation();
        const act = btn.getAttribute('data-pill-act');
        if (act === 'reset') {
          const list = getActiveReplays(getBoard());
          if (list.length > 1) window.MinNoteGeoReplay.resetAll();
          else window.MinNoteGeoReplay.reset();
        } else if (act === 'prev') {
          window.MinNoteGeoReplay.prevStep();
        } else if (act === 'play') {
          const list = getActiveReplays(getBoard());
          if (list.length > 1) window.MinNoteGeoReplay.togglePlayAll();
          else window.MinNoteGeoReplay.togglePlay();
        } else if (act === 'next') {
          window.MinNoteGeoReplay.nextStep();
        } else if (act === 'mini') {
          replayViewMode = 'mini';
          renderReplayUI();
        } else if (act === 'unmini') {
          replayViewMode = 'pill';
          renderReplayUI();
        } else if (act === 'expand') {
          replayViewMode = 'full';
          renderReplayUI();
        } else if (act === 'close') {
          window.MinNoteGeoReplay.close();
        }
      });

      replayPill = pill;
    }
  }

  /* Pure Pointer-Events Drag-and-Drop Reorder */
  let suppressRowClickUntil = 0;

  function attachPointerReorder(listEl, row, rawIdx, b, r, labelText) {
    row.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('button')) return;

      const onHandle = !!e.target.closest('.mn-step-drag');
      const startX = e.clientX, startY = e.clientY;
      const rowRect = row.getBoundingClientRect();
      let started = false;
      let ghost = null;
      let dropIdx = rawIdx;

      const startDrag = (ev) => {
        started = true;
        row.classList.add('drag-source');
        ghost = document.createElement('div');
        ghost.className = 'mn-drag-ghost';
        ghost.style.width = rowRect.width + 'px';
        ghost.style.left = rowRect.left + 'px';
        ghost.style.top = (ev.clientY - rowRect.height / 2) + 'px';
        ghost.innerHTML = `<span style="color:#2563eb;">⋮⋮</span><span>${escapeHtml(labelText)}</span>`;
        document.body.appendChild(ghost);
      };

      const clearIndicators = () => {
        listEl.querySelectorAll('.mn-step-item').forEach(el => {
          el.classList.remove('drag-insert-before', 'drag-insert-after');
        });
      };

      const onMove = (ev) => {
        const dy = Math.abs(ev.clientY - startY);
        const dx = Math.abs(ev.clientX - startX);
        if (!started) {
          if (onHandle ? (dy > 3 || dx > 3) : dy > 7) startDrag(ev);
          else return;
        }
        ev.preventDefault();
        if (ghost) ghost.style.top = (ev.clientY - rowRect.height / 2) + 'px';

        const lRect = listEl.getBoundingClientRect();
        if (ev.clientY < lRect.top + 28) listEl.scrollTop -= 8;
        else if (ev.clientY > lRect.bottom - 28) listEl.scrollTop += 8;

        clearIndicators();
        const rows = [...listEl.querySelectorAll('.mn-step-item')];
        let target = rows.length - 1;
        let insertAfter = true;
        for (let k = 0; k < rows.length; k++) {
          const rr = rows[k].getBoundingClientRect();
          if (ev.clientY < rr.top + rr.height / 2) {
            target = k;
            insertAfter = false;
            break;
          }
        }
        const targetRow = rows[target];
        if (targetRow) {
          targetRow.classList.add(insertAfter ? 'drag-insert-after' : 'drag-insert-before');
        }
        dropIdx = insertAfter ? target + 1 : target;
      };

      const finish = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', finish, true);
        clearIndicators();
        row.classList.remove('drag-source');
        if (ghost) { ghost.remove(); ghost = null; }
        if (started) {
          suppressRowClickUntil = Date.now() + 250;
          let dest = dropIdx;
          if (dest > rawIdx) dest -= 1;
          dest = Math.max(0, Math.min(r.steps.length - 1, dest));
          if (dest !== rawIdx) {
            const [moved] = r.steps.splice(rawIdx, 1);
            r.steps.splice(dest, 0, moved);
            persistScript(b, false, r);
            b.redraw();
            renderReplayUI();
          }
        }
      };

      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', finish, true);
      window.addEventListener('pointercancel', finish, true);
    });
  }

  function renderReplayUI() {
    const b = getBoard();
    const actives = getActiveReplays(b);
    if (!actives.length) {
      if (replayPanel) replayPanel.classList.remove('open');
      if (replayPill) replayPill.classList.remove('open');
      return;
    }
    ensureReplayUI();

    const r = getFocusedReplay(b);
    if (!r) return;
    const pg = b.doc.pages[r.page];
    if (!pg) return;
    const geo = pg.geo;
    const activeSteps = r.steps.filter(s => s.enabled !== false);
    const total = activeSteps.length;
    const curDisplay = total === 0 ? 0 : Math.min(total, r.stepIdx + (r.stepProgress > 0 ? 1 : 0));
    const anyPlaying = actives.some(x => x.playing);
    const playingCount = actives.filter(x => x.playing).length;
    const isMulti = actives.length > 1;

    // Collapsed states: 'pill' or 'mini'
    if (replayViewMode === 'pill' || replayViewMode === 'mini') {
      replayPanel.classList.remove('open');
      replayPill.classList.add('open');
      replayPill.classList.toggle('mini', replayViewMode === 'mini');

      if (replayViewMode === 'mini') {
        const badgeTxt = isMulti ? `${playingCount}/${actives.length}` : `${curDisplay}/${total}`;
        replayPill.innerHTML = `
          <span class="mn-pill-grip" title="Kéo di chuyển">⋮⋮</span>
          <span class="mn-pill-mini-dot ${anyPlaying ? 'playing' : ''}"></span>
          <button class="mn-pill-btn primary" data-pill-act="play" title="${anyPlaying ? 'Tạm dừng' : 'Phát'}">${anyPlaying ? '⏸' : '▶'}</button>
          <span class="mn-pill-label" style="max-width:72px;">${escapeHtml(badgeTxt)}</span>
          <button class="mn-pill-btn" data-pill-act="unmini" title="Hiện thanh nút">⤢</button>
        `;
        return;
      }

      const figChipsHtml = isMulti
        ? actives.slice(0, 4).map((item, idx) => {
            const itTotal = item.steps.filter(s => s.enabled !== false).length;
            const itCur = itTotal ? Math.min(itTotal, item.stepIdx + (item.stepProgress > 0 ? 1 : 0)) : 0;
            const lbl = item.title || `H${idx + 1}`;
            return `<button type="button" class="mn-rp-pill-fig ${item.playing ? 'playing' : ''}" data-pill-fig="${escapeHtml(item.id)}" title="${escapeHtml(lbl)}: bấm để phát / dừng riêng">${item.playing ? '⏸' : '▶'} ${escapeHtml(lbl)} ${itCur}/${itTotal}</button>`;
          }).join('')
        : `<span class="mn-pill-label" style="min-width:34px;text-align:center;">${curDisplay}/${total}</span>`;

      replayPill.innerHTML = `
        <span class="mn-pill-grip" title="Kéo di chuyển">⋮⋮</span>
        <button class="mn-pill-btn" data-pill-act="reset" title="${isMulti ? 'Về bước 0 tất cả' : 'Về đầu'}">↺</button>
        ${!isMulti ? '<button class="mn-pill-btn" data-pill-act="prev" title="Bước trước">⏮</button>' : ''}
        <button class="mn-pill-btn primary" data-pill-act="play" title="${isMulti ? (anyPlaying ? 'Tạm dừng tất cả' : 'Phát tất cả') : (r.playing ? 'Tạm dừng' : 'Phát')}">${isMulti ? (anyPlaying ? '⏸' : '▶▶') : (r.playing ? '⏸' : '▶')}</button>
        ${!isMulti ? '<button class="mn-pill-btn" data-pill-act="next" title="Bước tiếp">⏭</button>' : ''}
        ${figChipsHtml}
        <button class="mn-pill-btn" data-pill-act="mini" title="Thu siêu nhỏ">─</button>
        <button class="mn-pill-btn" data-pill-act="expand" title="Mở bảng kịch bản">☰</button>
        <button class="mn-pill-btn" data-pill-act="close" title="Đóng">✕</button>
      `;
      return;
    }

    // Compact studio panel ('full')
    replayPill.classList.remove('open');
    replayPanel.classList.add('open');
    replayPanel.classList.toggle('steps-hidden', stepsCollapsed);

    const headTitle = replayPanel.querySelector('#mn-rp-head-title');
    if (headTitle) headTitle.textContent = isMulti ? 'Kịch bản' : (r.title && r.title !== 'Cả trang' ? r.title : 'Kịch bản');
    const undoScriptBtn = replayPanel.querySelector('#mn-rp-undo-script');
    if (undoScriptBtn) {
      const curKey = r.scriptKey || r.scopeKey || 'all';
      const backups = (typeof b.getScriptBackups === 'function') ? b.getScriptBackups(r.page, curKey) : [];
      const anyPageBackups = (!backups.length && typeof b.getScriptBackups === 'function') ? b.getScriptBackups(r.page) : backups;
      undoScriptBtn.style.display = anyPageBackups.length ? 'inline-flex' : 'none';
      if (backups.length) {
        undoScriptBtn.title = `Khôi phục phiên bản trước của "${r.title || 'kịch bản'}" (${backups[0].steps ? backups[0].steps.length : 0} bước)`;
      } else if (anyPageBackups.length) {
        undoScriptBtn.title = `Khôi phục kịch bản vừa sửa/xóa "${anyPageBackups[0].title || anyPageBackups[0].key}"`;
      }
    }
    const countBadge = replayPanel.querySelector('#mn-rp-count-badge');
    if (countBadge) {
      if (isMulti) {
        countBadge.style.display = 'inline-flex';
        countBadge.textContent = playingCount ? `${playingCount}/${actives.length}` : `${actives.length} hình`;
      } else {
        countBadge.style.display = 'none';
      }
    }

    // Saved scripts count on current page
    const savedMap = loadSavedScriptsMap(pg);
    const savedEntries = Object.values(savedMap).filter(e => e && e.key && Array.isArray(e.steps) && e.steps.length);

    // Only show figure tab strip if > 1 figure active OR saved scripts exist
    const tabsEl = replayPanel.querySelector('#mn-rp-tabs');
    if (tabsEl) {
      const showTabs = isMulti || savedEntries.length > 0;
      tabsEl.style.display = showTabs ? 'flex' : 'none';
      tabsEl.innerHTML = '';
      if (showTabs) {
        if (isMulti) {
          actives.forEach((item, idx) => {
            const tab = document.createElement('div');
            tab.className = 'mn-rp-tab' + (item.id === r.id ? ' active' : '');
            const itemTotal = item.steps.filter(s => s.enabled !== false).length;
            const itemCur = itemTotal ? Math.min(itemTotal, item.stepIdx + (item.stepProgress > 0 ? 1 : 0)) : 0;
            const lbl = item.title || `H${idx + 1}`;
            tab.innerHTML = `
              <button type="button" class="mn-rp-tab-play" title="${item.playing ? 'Tạm dừng' : 'Phát riêng'}">${item.playing ? '⏸' : '▶'}</button>
              <span title="${escapeHtml(lbl)} (Nhấp đúp đổi tên)">${escapeHtml(lbl)} <small style="opacity:.75">${itemCur}/${itemTotal}</small></span>
              <button type="button" class="mn-rp-tab-close" title="Đóng hình này">✕</button>
            `;
            tab.addEventListener('click', (e) => {
              if (e.target.closest('.mn-rp-tab-play')) {
                e.stopPropagation();
                window.MinNoteGeoReplay.togglePlayScript(item.id);
                return;
              }
              if (e.target.closest('.mn-rp-tab-close')) {
                e.stopPropagation();
                window.MinNoteGeoReplay.closeScript(item.id);
                return;
              }
              window.MinNoteGeoReplay.selectScript(item.id);
            });
            tab.addEventListener('dblclick', (e) => {
              if (e.target.closest('button')) return;
              e.stopPropagation();
              const nextName = window.prompt('Đặt tên cho kịch bản hình này:', item.title || lbl);
              if (nextName && nextName.trim()) {
                item.title = nextName.trim();
                persistScript(b, false, item);
                renderReplayUI();
              }
            });
            tabsEl.appendChild(tab);
          });
        }
        if (savedEntries.length > 0) {
          const savedToggle = document.createElement('button');
          savedToggle.type = 'button';
          savedToggle.className = 'mn-rp-saved-toggle' + (savedShelfOpen ? ' open' : '');
          savedToggle.title = 'Mở kịch bản đã lưu trên trang này';
          savedToggle.textContent = `📂 ${savedEntries.length}`;
          savedToggle.addEventListener('click', () => {
            savedShelfOpen = !savedShelfOpen;
            renderReplayUI();
          });
          tabsEl.appendChild(savedToggle);
        }
      }
    }

    // Expandable Saved Scripts shelf
    const savedBar = replayPanel.querySelector('#mn-rp-saved-bar');
    if (savedBar) {
      if (savedShelfOpen && savedEntries.length > 0) {
        savedBar.style.display = 'flex';
        savedBar.innerHTML = '';
        savedEntries.sort((a, b2) => (b2.updatedAt || 0) - (a.updatedAt || 0)).forEach(entry => {
          const isLoaded = actives.some(x => x.page === r.page && (x.scriptKey === entry.key || x.scopeKey === entry.key));
          const chip = document.createElement('div');
          chip.className = 'mn-rp-saved-chip' + (isLoaded ? ' loaded' : '');
          const name = entry.title || (entry.key === 'all' ? 'Cả trang' : 'Hình đã lưu');
          chip.title = isLoaded ? `Đang mở: ${name}` : `Mở song song "${name}"`;
          chip.innerHTML = `<span>${escapeHtml(name)}</span><button type="button" class="mn-rp-saved-del" title="Xóa">✕</button>`;
          chip.addEventListener('click', (e) => {
            if (e.target.closest('.mn-rp-saved-del')) {
              e.stopPropagation();
              const okDel = window.confirm(`Xóa kịch bản đã lưu "${name}"? (Vẫn có thể khôi phục bằng nút ↶)`);
              if (!okDel) return;
              if (typeof b.deleteBuildScript === 'function') b.deleteBuildScript(r.page, entry.key);
              renderReplayUI();
              return;
            }
            window.MinNoteGeoReplay.openSavedScript(entry.key, r.page);
          });
          savedBar.appendChild(chip);
        });
      } else {
        savedBar.style.display = 'none';
      }
    }

    // Compact unified icon transport bar
    const playBtn = replayPanel.querySelector('#mn-rp-play');
    const resetBtn = replayPanel.querySelector('#mn-rp-reset');
    if (isMulti) {
      playBtn.textContent = anyPlaying ? `⏸ ${playingCount}/${actives.length}` : `▶▶`;
      playBtn.title = anyPlaying ? 'Tạm dừng tất cả' : 'Phát tất cả cùng lúc';
      resetBtn.title = 'Đưa tất cả về bước 0';
    } else {
      playBtn.textContent = r.playing ? '⏸' : (r.stepIdx >= total - 1 && r.stepProgress >= 1 ? '↺' : '▶');
      playBtn.title = r.playing ? 'Tạm dừng' : 'Phát kịch bản';
      resetBtn.title = 'Về bước đầu (0)';
    }

    const speedBtn = replayPanel.querySelector('#mn-rp-speed-cycle');
    if (speedBtn) speedBtn.textContent = `${Number(r.speed || 1)}×`;
    const pauseStepBtn = replayPanel.querySelector('#mn-rp-pause-step');
    if (pauseStepBtn) pauseStepBtn.classList.toggle('active', !!r.pauseBetween);

    replayPanel.querySelector('#mn-rp-step-count').textContent = `${curDisplay}/${total}`;
    const scrub = replayPanel.querySelector('#mn-rp-scrub');
    scrub.max = String(total);
    scrub.value = String(curDisplay);

    const followBtn = replayPanel.querySelector('#mn-rp-follow');
    if (followBtn) followBtn.classList.toggle('active', r.followCamera !== false);
    const handBtn = replayPanel.querySelector('#mn-rp-hand');
    if (handBtn) {
      const handOn = !!(window.MinNoteHandCursor && typeof window.MinNoteHandCursor.isReplay === 'function' && window.MinNoteHandCursor.isReplay());
      handBtn.classList.toggle('active', handOn);
    }
    const has3D = !!(typeof b.findOrbitSolid === 'function' && b.findOrbitSolid(r.page, r.scopeShapes));
    const orbitNowBtn = replayPanel.querySelector('#mn-rp-orbit-now');
    if (orbitNowBtn) {
      const orbiting = !!(typeof b.isAutoOrbiting === 'function' && b.isAutoOrbiting());
      orbitNowBtn.classList.toggle('active', orbiting);
      orbitNowBtn.disabled = !has3D && !orbiting;
      orbitNowBtn.title = has3D ? (orbiting ? 'Dừng xoay 360°' : 'Xoay tròn đều 360° khối 3D') : 'Chưa có khối 3D trên trang để xoay';
    }
    const orbitAfterBtn = replayPanel.querySelector('#mn-rp-orbit-after');
    if (orbitAfterBtn) {
      orbitAfterBtn.classList.toggle('active', !!r.autoOrbitAfter);
      orbitAfterBtn.disabled = !has3D && !r.autoOrbitAfter;
      orbitAfterBtn.title = has3D ? 'Tự động xoay tròn 360° sau khi dựng xong hình 3D' : 'Chỉ dùng khi kịch bản có khối 3D';
    }

    const stepsToggle = replayPanel.querySelector('#mn-rp-steps-toggle');
    if (stepsToggle) {
      stepsToggle.classList.toggle('active', !stepsCollapsed);
      stepsToggle.title = stepsCollapsed ? `Mở danh sách ${total} bước để sắp xếp` : 'Ẩn danh sách bước';
    }
    const presetsPop = replayPanel.querySelector('#mn-rp-presets-pop');
    if (presetsPop) presetsPop.classList.toggle('open', !stepsCollapsed);

    replayPanel.querySelectorAll('[data-style-preset]').forEach(btn => {
      btn.classList.toggle('on', !!r.stylePreset && r.stylePreset === btn.dataset.stylePreset);
    });
    const toggleBoardBtn = replayPanel.querySelector('#mn-rp-toggle-board');
    if (toggleBoardBtn) {
      const boardItemsCount = (Array.isArray(pg.items) ? pg.items.filter(isReplayableItem).length : 0) + (Array.isArray(pg.strokes) ? pg.strokes.length : 0);
      const hasBoardSteps = r.steps.some(st => st.kind === 'item' || st.kind === 'stroke' || (st.items && st.items.some(it => it.kind === 'item' || it.kind === 'stroke')));
      toggleBoardBtn.classList.toggle('on', hasBoardSteps);
      toggleBoardBtn.disabled = !hasBoardSteps && boardItemsCount === 0;
      toggleBoardBtn.textContent = hasBoardSteps
        ? '✓ Công thức/Nét'
        : (boardItemsCount > 0 ? `+ Công thức/Nét (${boardItemsCount})` : '+ Công thức/Nét');
    }

    updateEffectPopoverPreviewFade();

    if (stepsCollapsed) {
      lastRenderedStepSig = '';
      return;
    }

    const listEl = replayPanel.querySelector('#mn-rp-list');
    if (!r.steps.length) {
      lastRenderedStepSig = '';
      listEl.innerHTML = '<div class="mn-rp-empty">Chưa có hình học hoặc nội dung nào để dựng lại.</div>';
      return;
    }

    // Zero-thrash fast path: if step structure/config is unchanged, ONLY toggle .current/.done classes (0 DOM rebuilds during 60fps playback!)
    const stepSig = r.id + '|' + r.page + '|' + r.steps.map(s =>
      `${s.id}:${s.enabled !== false ? 1 : 0}:${s.effect || ''}:${s.easing || ''}:${s.durationMul || 1}:${s.pauseAfter || 0}:${s.rev ? 1 : 0}:${s.tempHide ? 1 : 0}:${s.showGuides !== false ? 1 : 0}:${s.mode || ''}:${s.customTitle || ''}:${s.items ? s.items.length : 0}`
    ).join(',');
    if (lastRenderedStepSig === stepSig && listEl.children.length === r.steps.length) {
      let ap = 0;
      let curRowEl = null;
      for (let rawIdx = 0; rawIdx < r.steps.length; rawIdx++) {
        const st = r.steps[rawIdx];
        const row = listEl.children[rawIdx];
        if (!row) break;
        const isEnabled = st.enabled !== false;
        const myActiveIdx = isEnabled ? ap++ : -1;
        const isCurrent = isEnabled && myActiveIdx === r.stepIdx && (r.stepProgress > 0 || r.playing);
        const isDone = isEnabled && (myActiveIdx < r.stepIdx || (myActiveIdx === r.stepIdx && r.stepProgress >= 1));
        row.classList.toggle('current', isCurrent);
        row.classList.toggle('done', isDone);
        if (isCurrent) curRowEl = row;
      }
      if (curRowEl && r.playing) {
        const lr = listEl.getBoundingClientRect();
        const rr = curRowEl.getBoundingClientRect();
        if (rr.top < lr.top || rr.bottom > lr.bottom) {
          curRowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
      return;
    }

    lastRenderedStepSig = stepSig;
    const prevScroll = listEl.scrollTop;
    listEl.innerHTML = '';

    let activePos = 0;
    r.steps.forEach((st, rawIdx) => {
      const isEnabled = st.enabled !== false;
      const myActiveIdx = isEnabled ? activePos++ : -1;
      const isCurrent = isEnabled && myActiveIdx === r.stepIdx && (r.stepProgress > 0 || r.playing);
      const isDone = isEnabled && (myActiveIdx < r.stepIdx || (myActiveIdx === r.stepIdx && r.stepProgress >= 1));

      const row = document.createElement('div');
      row.className = `mn-step-item mn-rp-step compact${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}${!isEnabled ? ' disabled' : ''}`;
      row.dataset.idx = String(rawIdx);

      const first = (st.items && st.items.length) ? st.items[0] : st;
      const isShape = first.kind === 'shape';
      const sh = isShape ? geo.shapes.find(s => s.id === first.refId) : null;
      const hasDir = (isShape && sh && ['segment', 'line', 'ray', 'extend', 'circle', 'polygon'].includes(sh.kind)) || first.kind === 'stroke' || first.kind === 'item';
      const isInterPt = first.kind === 'point' && geo.points[first.refId] && geo.points[first.refId].def && geo.points[first.refId].def.t === 'inter';
      const isGroup = !!(st.items && st.items.length > 1);
      const isCue = st.mode === 'cue';
      const labelText = stepDisplayLabel(geo, st, pg);
      const fxId = st.effect || 'draw';
      const hasCustomFx = isCue || fxId !== 'draw' || (st.easing && st.easing !== 'easeInOut') || (Number(st.durationMul) && Math.abs(Number(st.durationMul) - 1) > 0.04) || (Number(st.pauseAfter) > 0);
      const fxMeta = getEffectMeta(fxId);
      const fxTagBits = [];
      if (fxId !== 'draw' || isCue) fxTagBits.push(`${fxMeta.icon} ${fxMeta.label}`);
      if (Number(st.durationMul) && Math.abs(Number(st.durationMul) - 1) > 0.04) fxTagBits.push(`${Number(st.durationMul).toFixed(1)}×`);
      if (Number(st.pauseAfter) > 0) fxTagBits.push(`+${Number(st.pauseAfter).toFixed(1)}s`);
      const cueBadgeHtml = isCue ? '<span class="mn-step-cue-badge">NHẤN MẠNH</span>' : '';
      const fxTagHtml = (fxTagBits.length || cueBadgeHtml) ? `<span class="mn-step-fx-tag">${cueBadgeHtml}${escapeHtml(fxTagBits.join(' · '))}</span>` : '';

      row.innerHTML = `
        <span class="mn-step-drag" title="Kéo để đổi thứ tự">⋮⋮</span>
        <span class="mn-step-num">${isEnabled ? myActiveIdx + 1 : '—'}</span>
        <div class="mn-step-info">
          <div class="mn-step-label" title="${escapeHtml(labelText)} (Chuột phải để chỉnh hiệu ứng)">${escapeHtml(labelText)}</div>
          ${fxTagHtml}
        </div>
        <div class="mn-step-actions">
          <button class="mn-mini-btn ${hasCustomFx ? 'on' : ''}" data-act="fx" title="Tùy chỉnh hiệu ứng bước (hoặc nhấp chuột phải)">✨</button>
          ${(!isCue && isEnabled) ? `<button class="mn-mini-btn" data-act="addcue" title="Chèn bước nhấn mạnh sau bước này">✦</button>` : ''}
          ${(isInterPt && !isCue) ? `<button class="mn-mini-btn ${st.showGuides !== false ? 'on' : ''}" data-act="guides" title="Vẽ 2 đường giao nhau rồi ẩn">✛</button>` : ''}
          ${(isShape && !isCue) ? `<button class="mn-mini-btn ${st.tempHide ? 'on' : ''}" data-act="temphide" title="Vẽ tạm rồi tự ẩn">👻</button>` : ''}
          ${(hasDir && !isCue) ? `<button class="mn-mini-btn ${st.rev ? 'on' : ''}" data-act="rev" title="Đảo chiều vẽ">⇄</button>` : ''}
          ${rawIdx > 0 ? `<button class="mn-mini-btn" data-act="merge" title="Gộp vẽ cùng bước trên">⊕</button>` : ''}
          ${isGroup ? `<button class="mn-mini-btn on" data-act="split" title="Tách nhóm">⊖</button>` : ''}
          <button class="mn-mini-btn ${isEnabled ? '' : 'on'}" data-act="toggle" title="${isEnabled ? 'Bỏ qua bước này' : 'Bật lại'}">${isEnabled ? '👁' : '✕'}</button>
        </div>
      `;

      attachPointerReorder(listEl, row, rawIdx, b, r, labelText);

      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEffectPopover(rawIdx, e.clientX, e.clientY);
      });

      row.addEventListener('click', (e) => {
        if (Date.now() < suppressRowClickUntil) return;
        const btn = e.target.closest('[data-act]');
        if (!btn) {
          if (isEnabled) window.MinNoteGeoReplay.jumpTo(myActiveIdx + 1, false);
          return;
        }
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'fx') {
          const br = btn.getBoundingClientRect();
          openEffectPopover(rawIdx, br.left, br.top + br.height / 2);
        } else if (act === 'addcue') {
          const cueStep = {
            id: 'st_cue_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 4),
            mode: 'cue',
            kind: st.kind || first.kind,
            refId: first.refId,
            items: (st.items && st.items.length > 1) ? st.items.map(it => ({ kind: it.kind, refId: it.refId })) : undefined,
            effect: 'mention_glow',
            easing: 'smoothstep',
            durationMul: 1,
            enabled: true
          };
          r.steps.splice(rawIdx + 1, 0, cueStep);
          b._replayHiddenCache = null;
          persistScript(b, false, r);
          b.redraw();
          renderReplayUI();
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx + 1);
        } else if (act === 'guides') {
          st.showGuides = st.showGuides === false;
          persistScript(b, false, r);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'temphide') {
          st.tempHide = !st.tempHide;
          persistScript(b, false, r);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'rev') {
          st.rev = !st.rev;
          persistScript(b, false, r);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'up' && rawIdx > 0) {
          [r.steps[rawIdx - 1], r.steps[rawIdx]] = [r.steps[rawIdx], r.steps[rawIdx - 1]];
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'down' && rawIdx < r.steps.length - 1) {
          [r.steps[rawIdx + 1], r.steps[rawIdx]] = [r.steps[rawIdx], r.steps[rawIdx + 1]];
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'toggle') {
          st.enabled = st.enabled === false;
          b._replayHiddenCache = null;
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'merge' && rawIdx > 0) {
          const prev = r.steps[rawIdx - 1];
          const pItems = prev.items && prev.items.length ? prev.items : [{ kind: prev.kind, refId: prev.refId, rev: !!prev.rev }];
          const cItems = st.items && st.items.length ? st.items : [{ kind: st.kind, refId: st.refId, rev: !!st.rev }];
          r.steps[rawIdx - 1] = {
            ...prev,
            id: prev.id,
            kind: 'group',
            items: [...pItems, ...cItems],
            enabled: prev.enabled !== false
          };
          r.steps.splice(rawIdx, 1);
          b._replayHiddenCache = null;
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'split' && isGroup) {
          const expanded = st.items.map((it, k) => ({
            ...st,
            id: `${st.id}_${k}`,
            kind: it.kind,
            refId: it.refId,
            items: undefined,
            customTitle: undefined,
            rev: !!(it.rev ?? st.rev),
            enabled: st.enabled !== false
          }));
          r.steps.splice(rawIdx, 1, ...expanded);
          b._replayHiddenCache = null;
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        }
      });

      listEl.appendChild(row);
    });
    listEl.scrollTop = prevScroll;
  }

  function commitReplayChange(b, r, focus = true) {
    if (!b || !r) return;
    if (typeof b.addOrUpdateReplay === 'function') b.addOrUpdateReplay(r, focus);
    else b.setReplay(r);
  }

  window.MinNoteGeoReplay = {
    open(selectionOnly = false) {
      const b = getBoard();
      if (!b) return;
      const pageIdx = b.sel ? b.sel.page : b.currentPage();
      const pg = b.doc.pages[pageIdx];
      if (!pg) return;

      let scopeShapes = null, scopePoints = null, scopeItems = null, scopeStrokes = null, scopeKey = 'all';
      if (selectionOnly && b.sel && b.sel.page === pageIdx && (b.sel.shapes.size || b.sel.points.size || b.sel.items.size || b.sel.strokes.size)) {
        scopeShapes = new Set(b.sel.shapes);
        scopePoints = new Set(b.sel.points);
        scopeItems = b.sel.items.size ? new Set(b.sel.items) : null;
        scopeStrokes = b.sel.strokes.size ? new Set(b.sel.strokes) : null;
        for (const sh of pg.geo.shapes) {
          if (scopeShapes.has(sh.id)) sh.pts.forEach(pid => scopePoints.add(pid));
        }
        scopeKey = 'sel_' + [...scopeShapes].sort().join(',') + '|' + [...scopePoints].sort().join(',');
        if (scopeItems || scopeStrokes) {
          scopeKey += '|I:' + (scopeItems ? [...scopeItems].sort().join(',') : '') + '|S:' + (scopeStrokes ? [...scopeStrokes].sort().join(',') : '');
        }
        b.sel = null;
        b.emit();
      }

      const existing = getActiveReplays(b);

      // If opening a specific figure/selection while other figures are already open -> ADD concurrently!
      if (scopeShapes || scopePoints || scopeItems || scopeStrokes) {
        const solidGroups = extractSolidGroups(pg.geo, scopeShapes, scopePoints);
        const already = existing.find(x =>
          x.page === pageIdx && (
            x.scopeKey === scopeKey ||
            (x.scopeShapes && computeOverlapScore({ key: x.scriptKey || x.scopeKey, shapeIds: [...x.scopeShapes], pointIds: x.scopePoints ? [...x.scopePoints] : [], itemIds: x.scopeItems ? [...x.scopeItems] : [], strokeIds: x.scopeStrokes ? [...x.scopeStrokes] : [], solidGroups: extractSolidGroups(pg.geo, x.scopeShapes, x.scopePoints), steps: x.steps }, scopeShapes, scopePoints, solidGroups, scopeItems, scopeStrokes) >= 0.8)
          )
        );
        if (already) {
          b.activeReplayId = already.id;
          b.replay = already;
          replayViewMode = 'full';
          b.redraw();
          renderReplayUI();
          return;
        }

        const matchedSaved = findSavedScriptForScope(pg, scopeKey, scopeShapes, scopePoints, scopeItems, scopeStrokes);
        if (matchedSaved) {
          // Union existing saved scope + step refs into current selection so a partial re-selection NEVER truncates saved steps!
          const validSh = new Set((pg.geo && pg.geo.shapes ? pg.geo.shapes : []).map(s => s.id));
          const validPt = new Set(Object.keys((pg.geo && pg.geo.points) || {}));
          const validIt = new Set((pg.items || []).filter(isReplayableItem).map(it => it.id));
          const validSk = new Set((pg.strokes || []).map(sk => sk.id));
          const savedRefs = collectStepRefs(matchedSaved.steps);
          if (!scopeShapes) scopeShapes = new Set();
          if (!scopePoints) scopePoints = new Set();
          for (const id of (matchedSaved.shapeIds || [])) if (validSh.has(id)) scopeShapes.add(id);
          for (const id of savedRefs.shapes) if (validSh.has(id)) scopeShapes.add(id);
          for (const id of (matchedSaved.pointIds || [])) if (validPt.has(id)) scopePoints.add(id);
          for (const id of savedRefs.points) if (validPt.has(id)) scopePoints.add(id);
          const mergedIt = new Set(scopeItems || []);
          for (const id of (matchedSaved.itemIds || [])) if (validIt.has(id)) mergedIt.add(id);
          for (const id of savedRefs.items) if (validIt.has(id)) mergedIt.add(id);
          scopeItems = mergedIt.size ? mergedIt : null;
          const mergedSk = new Set(scopeStrokes || []);
          for (const id of (matchedSaved.strokeIds || [])) if (validSk.has(id)) mergedSk.add(id);
          for (const id of savedRefs.strokes) if (validSk.has(id)) mergedSk.add(id);
          scopeStrokes = mergedSk.size ? mergedSk : null;
          for (const sh of (pg.geo && pg.geo.shapes ? pg.geo.shapes : [])) {
            if (scopeShapes.has(sh.id) && Array.isArray(sh.pts)) sh.pts.forEach(pid => scopePoints.add(pid));
          }
          scopeKey = 'sel_' + [...scopeShapes].sort().join(',') + '|' + [...scopePoints].sort().join(',');
          if (scopeItems || scopeStrokes) {
            scopeKey += '|I:' + (scopeItems ? [...scopeItems].sort().join(',') : '') + '|S:' + (scopeStrokes ? [...scopeStrokes].sort().join(',') : '');
          }
        }
        const steps = reconcileSavedScript(pg.geo, matchedSaved ? matchedSaved.steps : null, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes);
        const scriptKey = matchedSaved ? matchedSaved.key : scopeKey;
        const title = (matchedSaved && matchedSaved.title) || buildFigureTitle(pg.geo, scopeShapes, scopePoints, existing.length + 1, scopeItems, scopeStrokes);

        // Drop any whole-page 'all' replay if user now adds a scoped figure script
        const kept = existing.filter(x => !(x.page === pageIdx && x.scopeKey === 'all'));
        const session = {
          id: 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          title,
          scriptKey,
          active: true,
          page: pageIdx,
          playing: false,
          stepIdx: 0,
          stepProgress: 0,
          speed: (matchedSaved && typeof matchedSaved.speed === 'number') ? matchedSaved.speed : 1,
          pauseBetween: !!(matchedSaved && matchedSaved.pauseBetween),
          followCamera: matchedSaved && typeof matchedSaved.followCamera === 'boolean' ? matchedSaved.followCamera : true,
          springCamera: matchedSaved && typeof matchedSaved.springCamera === 'boolean' ? matchedSaved.springCamera : true,
          autoOrbitAfter: !!(matchedSaved && matchedSaved.autoOrbitAfter),
          stylePreset: (matchedSaved && matchedSaved.stylePreset) || '',
          scopeShapes,
          scopePoints,
          scopeItems,
          scopeStrokes,
          scopeKey,
          steps
        };
        replayViewMode = 'full';
        if (typeof b.setReplays === 'function') b.setReplays([...kept, session], session.id);
        else b.setReplay(session);
        renderReplayUI();
        return;
      }

      // Opening whole-page from menu: if scripts are already active on this page, just show the drawer!
      if (existing.some(x => x.page === pageIdx)) {
        replayViewMode = 'full';
        renderReplayUI();
        return;
      }

      // If page has saved figure scripts (e.g. "Hình A1B1D1E1F1") and no custom 'all' script, open the most recent saved script directly!
      const pageSavedMap = loadSavedScriptsMap(pg);
      const pageSavedList = Object.values(pageSavedMap).filter(e => e && e.key && Array.isArray(e.steps) && e.steps.length);
      if (pageSavedList.length > 1) savedShelfOpen = true;
      if (!pageSavedMap.all && pageSavedList.length > 0) {
        pageSavedList.sort((a, b2) => (b2.updatedAt || 0) - (a.updatedAt || 0));
        replayViewMode = 'full';
        this.openSavedScript(pageSavedList[0].key, pageIdx);
        return;
      }

      const matchedSaved = findSavedScriptForScope(pg, 'all', null, null, null, null);
      const steps = reconcileSavedScript(pg.geo, matchedSaved ? matchedSaved.steps : null, null, null, pg, null, null);
      const session = {
        id: 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        title: (matchedSaved && matchedSaved.title) || 'Cả trang',
        scriptKey: 'all',
        active: true,
        page: pageIdx,
        playing: false,
        stepIdx: 0,
        stepProgress: 0,
        speed: (matchedSaved && typeof matchedSaved.speed === 'number') ? matchedSaved.speed : 1,
        pauseBetween: !!(matchedSaved && matchedSaved.pauseBetween),
        followCamera: matchedSaved && typeof matchedSaved.followCamera === 'boolean' ? matchedSaved.followCamera : true,
        springCamera: matchedSaved && typeof matchedSaved.springCamera === 'boolean' ? matchedSaved.springCamera : true,
        autoOrbitAfter: !!(matchedSaved && matchedSaved.autoOrbitAfter),
        stylePreset: (matchedSaved && matchedSaved.stylePreset) || '',
        scopeShapes: null,
        scopePoints: null,
        scopeItems: null,
        scopeStrokes: null,
        scopeKey: 'all',
        steps
      };
      replayViewMode = 'full';
      if (typeof b.setReplays === 'function') b.setReplays([session], session.id);
      else b.setReplay(session);
      renderReplayUI();
    },

    openSavedScript(key, pageIdxArg) {
      const b = getBoard();
      if (!b || !key) return;
      const pageIdx = pageIdxArg !== undefined ? pageIdxArg : b.currentPage();
      const pg = b.doc.pages[pageIdx];
      if (!pg) return;
      const map = loadSavedScriptsMap(pg);
      const entry = map[key];
      if (!entry || !Array.isArray(entry.steps)) return;

      const existing = getActiveReplays(b);
      const already = existing.find(x => x.page === pageIdx && (x.scriptKey === key || x.scopeKey === key));
      if (already) {
        b.activeReplayId = already.id;
        b.replay = already;
        b.redraw();
        renderReplayUI();
        return;
      }

      let scopeShapes = null, scopePoints = null, scopeItems = null, scopeStrokes = null, scopeKey = 'all';
      if (key !== 'all') {
        const validSh = new Set(pg.geo.shapes.map(s => s.id));
        const validPt = new Set(Object.keys(pg.geo.points || {}));
        const validIt = new Set((pg.items || []).filter(isReplayableItem).map(it => it.id));
        const validSk = new Set((pg.strokes || []).map(sk => sk.id));
        const stepRefs = collectStepRefs(entry.steps);
        scopeShapes = new Set((entry.shapeIds || []).filter(id => validSh.has(id)));
        for (const id of stepRefs.shapes) if (validSh.has(id)) scopeShapes.add(id);
        scopePoints = new Set((entry.pointIds || []).filter(id => validPt.has(id)));
        for (const id of stepRefs.points) if (validPt.has(id)) scopePoints.add(id);
        const itSet = new Set((entry.itemIds || []).filter(id => validIt.has(id)));
        for (const id of stepRefs.items) if (validIt.has(id)) itSet.add(id);
        const skSet = new Set((entry.strokeIds || []).filter(id => validSk.has(id)));
        for (const id of stepRefs.strokes) if (validSk.has(id)) skSet.add(id);
        scopeItems = itSet.size ? itSet : null;
        scopeStrokes = skSet.size ? skSet : null;
        if (Array.isArray(entry.solidGroups) && entry.solidGroups.length) {
          const sgSet = new Set(entry.solidGroups);
          for (const sh of pg.geo.shapes) {
            if (sh.group && sgSet.has(sh.group)) scopeShapes.add(sh.id);
          }
          for (const pt of Object.values(pg.geo.points || {})) {
            if (pt.group && sgSet.has(pt.group)) scopePoints.add(pt.id);
          }
        }
        for (const sh of pg.geo.shapes) {
          if (scopeShapes.has(sh.id)) sh.pts.forEach(pid => scopePoints.add(pid));
        }
        scopeKey = 'sel_' + [...scopeShapes].sort().join(',') + '|' + [...scopePoints].sort().join(',');
        if (scopeItems || scopeStrokes) {
          scopeKey += '|I:' + (scopeItems ? [...scopeItems].sort().join(',') : '') + '|S:' + (scopeStrokes ? [...scopeStrokes].sort().join(',') : '');
        }
      }

      const steps = reconcileSavedScript(pg.geo, entry.steps, scopeShapes, scopePoints, pg, scopeItems, scopeStrokes);
      const kept = key === 'all' ? [] : existing.filter(x => !(x.page === pageIdx && x.scopeKey === 'all'));
      const session = {
        id: 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        title: entry.title || buildFigureTitle(pg.geo, scopeShapes, scopePoints, kept.length + 1, scopeItems, scopeStrokes),
        scriptKey: entry.key,
        active: true,
        page: pageIdx,
        playing: false,
        stepIdx: 0,
        stepProgress: 0,
        speed: typeof entry.speed === 'number' ? entry.speed : 1,
        pauseBetween: !!entry.pauseBetween,
        followCamera: typeof entry.followCamera === 'boolean' ? entry.followCamera : true,
        springCamera: typeof entry.springCamera === 'boolean' ? entry.springCamera : true,
        autoOrbitAfter: !!entry.autoOrbitAfter,
        stylePreset: entry.stylePreset || '',
        scopeShapes,
        scopePoints,
        scopeItems,
        scopeStrokes,
        scopeKey,
        steps
      };
      if (typeof b.setReplays === 'function') b.setReplays([...kept, session], session.id);
      else b.setReplay(session);
      renderReplayUI();
    },

    selectScript(id) {
      const b = getBoard();
      if (!b) return;
      const actives = getActiveReplays(b);
      const target = actives.find(x => x.id === id);
      if (!target) return;
      b.activeReplayId = target.id;
      b.replay = target;
      renderReplayUI();
    },

    togglePlayScript(id) {
      const b = getBoard();
      if (!b) return;
      const actives = getActiveReplays(b);
      const r = actives.find(x => x.id === id);
      if (!r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.playing) {
        r.playing = false;
      } else {
        r.stopAfterStep = false;
        if (r.stepIdx >= activeSteps.length - 1 && r.stepProgress >= 1) {
          r.stepIdx = 0; r.stepProgress = 0;
        } else if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
          r.stepIdx++; r.stepProgress = 0;
        }
        r.playing = true;
      }
      commitReplayChange(b, r, false);
    },

    closeScript(id) {
      const b = getBoard();
      if (!b) return;
      if (typeof b.stopReplay === 'function') b.stopReplay(id);
      renderReplayUI();
    },

    close() {
      closeEffectPopover();
      const b = getBoard();
      if (b) {
        if (typeof b.stopAutoOrbit === 'function') b.stopAutoOrbit(true);
        b.stopReplay();
      }
      replayViewMode = 'full';
      renderReplayUI();
    },

    collapse(mode = 'pill') {
      replayViewMode = mode;
      renderReplayUI();
    },

    save() {
      const b = getBoard();
      const ok = persistAllActiveScripts(b, true, true);
      renderReplayUI();
      return ok;
    },

    undoScriptChange() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r || typeof b.getScriptBackups !== 'function' || typeof b.restoreScriptBackup !== 'function') return false;
      const pg = b.doc.pages[r.page];
      if (!pg) return false;
      const curKey = r.scriptKey || r.scopeKey || 'all';
      const ownBackups = b.getScriptBackups(r.page, curKey);
      if (ownBackups.length) {
        const restored = b.restoreScriptBackup(r.page, curKey, 0);
        if (!restored) return false;
        r.steps = reconcileSavedScript(pg.geo, restored.steps, r.scopeShapes, r.scopePoints, pg, r.scopeItems, r.scopeStrokes);
        if (typeof restored.speed === 'number') r.speed = restored.speed;
        r.pauseBetween = !!restored.pauseBetween;
        if (typeof restored.followCamera === 'boolean') r.followCamera = restored.followCamera;
        if (typeof restored.springCamera === 'boolean') r.springCamera = restored.springCamera;
        r.autoOrbitAfter = !!restored.autoOrbitAfter;
        r.stylePreset = restored.stylePreset || '';
        r.stepIdx = 0;
        r.stepProgress = 0;
        r.playing = false;
        b._replayHiddenCache = null;
        commitReplayChange(b, r, true);
        if (typeof window.showToast === 'function') {
          window.showToast(`Đã khôi phục phiên bản trước (${r.steps.length} bước)!`, 'success');
        }
        return true;
      }
      // Fallback: restore most recently deleted/modified sibling script on this page
      const pageBackups = b.getScriptBackups(r.page);
      if (pageBackups.length) {
        const target = pageBackups[0];
        const restored = b.restoreScriptBackup(r.page, target.key, 0);
        if (restored) {
          this.openSavedScript(target.key, r.page);
          if (typeof window.showToast === 'function') {
            window.showToast(`Đã khôi phục kịch bản "${target.title || target.key}"!`, 'success');
          }
          return true;
        }
      }
      return false;
    },

    addHiddenLines() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const pg = b.doc.pages[r.page];
      if (!pg) return;
      const existing = new Set();
      for (const st of r.steps) {
        if (st.kind === 'shape') existing.add(st.refId);
        if (st.items) st.items.forEach(it => it.kind === 'shape' && existing.add(it.refId));
      }
      let added = 0;
      for (const sh of pg.geo.shapes) {
        if (sh.kind === 'solid' || sh.kind === 'flatLink' || !sh.hidden || existing.has(sh.id)) continue;
        if (r.scopeShapes && !r.scopeShapes.has(sh.id)) continue;
        r.steps.push({ id: 'st_h_' + sh.id, kind: 'shape', refId: sh.id, rev: false, tempHide: true, includeHidden: true, enabled: true });
        added++;
      }
      if (added > 0) {
        persistScript(b, true, r);
        b.redraw();
        renderReplayUI();
      }
    },

    reset() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.playing = false;
      r.stepIdx = 0;
      r.stepProgress = 0;
      commitReplayChange(b, r, true);
    },

    resetAll() {
      const b = getBoard();
      const actives = getActiveReplays(b);
      if (!b || !actives.length) return;
      for (const r of actives) {
        r.playing = false;
        r.stepIdx = 0;
        r.stepProgress = 0;
      }
      if (typeof b.setReplays === 'function') b.setReplays(actives, b.activeReplayId);
      else b.setReplay(actives[0]);
    },

    togglePlay() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.playing) {
        r.playing = false;
      } else {
        r.stopAfterStep = false;
        if (r.stepIdx >= activeSteps.length - 1 && r.stepProgress >= 1) {
          r.stepIdx = 0; r.stepProgress = 0;
        } else if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
          r.stepIdx++; r.stepProgress = 0;
        }
        r.playing = true;
      }
      commitReplayChange(b, r, true);
    },

    togglePlayAll() {
      const b = getBoard();
      const actives = getActiveReplays(b);
      if (!b || !actives.length) return;
      const anyPlaying = actives.some(r => r.playing);
      for (const r of actives) {
        const activeSteps = r.steps.filter(s => s.enabled !== false);
        if (!activeSteps.length) continue;
        if (anyPlaying) {
          r.playing = false;
        } else {
          r.stopAfterStep = false;
          if (r.stepIdx >= activeSteps.length - 1 && r.stepProgress >= 1) {
            r.stepIdx = 0; r.stepProgress = 0;
          } else if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
            r.stepIdx++; r.stepProgress = 0;
          }
          r.playing = true;
        }
      }
      if (typeof b.setReplays === 'function') b.setReplays(actives, b.activeReplayId);
      else b.setReplay(actives[0]);
    },

    nextStep() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
        r.stepIdx++;
      }
      r.stepProgress = 0;
      r.stopAfterStep = true;
      r.playing = true;
      commitReplayChange(b, r, true);
    },

    prevStep() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.playing = false;
      if (r.stepProgress > 0 && r.stepProgress < 1) {
        r.stepProgress = 0;
      } else if (r.stepIdx > 0) {
        r.stepIdx--;
        r.stepProgress = 1;
      } else {
        r.stepIdx = 0;
        r.stepProgress = 0;
      }
      commitReplayChange(b, r, true);
    },

    jumpTo(completedCount, instant = true) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      const n = Math.max(0, Math.min(activeSteps.length, completedCount));
      r.playing = false;
      if (n === 0) {
        r.stepIdx = 0; r.stepProgress = 0;
      } else if (instant) {
        r.stepIdx = n - 1; r.stepProgress = 1;
      } else {
        r.stepIdx = n - 1; r.stepProgress = 0; r.stopAfterStep = true; r.playing = true;
      }
      commitReplayChange(b, r, true);
    },

    playSingleStep(activeIdx) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.stepIdx = Math.max(0, activeIdx);
      r.stepProgress = 0;
      r.stopAfterStep = true;
      r.playing = true;
      commitReplayChange(b, r, true);
    },

    setSpeed(v) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.speed = Math.max(0.2, Math.min(4, Number(v) || 1));
      persistScript(b, false, r);
      renderReplayUI();
    },

    applyPreset(mode, force = false) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return false;
      const pg = b.doc.pages[r.page];
      if (!pg) return false;
      if ((mode === 'orig' || mode === 'solidFirst') && !force && isScriptCustomized(r, pg)) {
        const label = mode === 'orig' ? 'khôi phục thứ tự Gốc' : 'áp dụng mẫu Khối→Nét';
        if (!window.confirm(`Bạn có chắc muốn ${label}? Các thiết lập bước hiện tại sẽ được sao lưu (có thể bấm ↶ để hoàn tác).`)) {
          return false;
        }
      }
      const prevCopy = JSON.parse(JSON.stringify(r.steps));
      const curKey = r.scriptKey || r.scopeKey || 'all';
      if (typeof b._pushScriptBackup === 'function' && prevCopy.length) {
        b._pushScriptBackup(pg.id, curKey, {
          key: curKey,
          title: r.title || '',
          shapeIds: r.scopeShapes ? [...r.scopeShapes] : null,
          pointIds: r.scopePoints ? [...r.scopePoints] : null,
          itemIds: r.scopeItems ? [...r.scopeItems] : null,
          strokeIds: r.scopeStrokes ? [...r.scopeStrokes] : null,
          solidGroups: extractSolidGroups(pg.geo, r.scopeShapes, r.scopePoints),
          speed: r.speed || 1,
          pauseBetween: !!r.pauseBetween,
          followCamera: r.followCamera !== false,
          springCamera: r.springCamera !== false,
          autoOrbitAfter: !!r.autoOrbitAfter,
          stylePreset: r.stylePreset || '',
          steps: prevCopy,
          updatedAt: Date.now()
        }, 'preset_' + mode);
      }
      const hadBoard = r.steps.some(st => st.kind === 'item' || st.kind === 'stroke' || (st.items && st.items.some(it => it.kind === 'item' || it.kind === 'stroke')));
      if (mode === 'orig') {
        r.steps = buildDefaultSteps(pg.geo, r.scopeShapes, r.scopePoints, pg, r.scopeItems, r.scopeStrokes, { includeBoardContent: hadBoard });
        r.stylePreset = '';
      } else if (mode === 'solidFirst') {
        r.steps = buildSolidFirstPreset(pg.geo, r.scopeShapes, r.scopePoints, pg, r.scopeItems, r.scopeStrokes, { includeBoardContent: hadBoard });
      } else if (mode === 'ungroup') {
        const out = [];
        for (const st of r.steps) {
          if (st.items && st.items.length > 1) {
            st.items.forEach((it, k) => out.push({ ...st, id: `${st.id}_${k}`, kind: it.kind, refId: it.refId, items: undefined, customTitle: undefined, rev: !!(it.rev ?? st.rev), enabled: st.enabled !== false }));
          } else out.push(st);
        }
        r.steps = out;
      }
      r.stepIdx = 0;
      r.stepProgress = 0;
      r.playing = false;
      b._replayHiddenCache = null;
      persistScript(b, false, r, { _backupPrev: true, _backupReason: 'preset_' + mode });
      commitReplayChange(b, r, true);
      return true;
    },

    applyStylePreset(presetId) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      const mfx = getMotionFX();
      if (!b || !r || !mfx || typeof mfx.applyStylePresetToSteps !== 'function') return false;
      const pg = b.doc.pages[r.page];
      if (!pg) return false;
      const curKey = r.scriptKey || r.scopeKey || 'all';
      if (typeof b._pushScriptBackup === 'function' && Array.isArray(r.steps) && r.steps.length) {
        b._pushScriptBackup(pg.id, curKey, {
          key: curKey,
          title: r.title || '',
          shapeIds: r.scopeShapes ? [...r.scopeShapes] : null,
          pointIds: r.scopePoints ? [...r.scopePoints] : null,
          itemIds: r.scopeItems ? [...r.scopeItems] : null,
          strokeIds: r.scopeStrokes ? [...r.scopeStrokes] : null,
          solidGroups: extractSolidGroups(pg.geo, r.scopeShapes, r.scopePoints),
          speed: r.speed || 1,
          pauseBetween: !!r.pauseBetween,
          followCamera: r.followCamera !== false,
          springCamera: r.springCamera !== false,
          autoOrbitAfter: !!r.autoOrbitAfter,
          stylePreset: r.stylePreset || '',
          steps: JSON.parse(JSON.stringify(r.steps)),
          updatedAt: Date.now()
        }, 'style_' + presetId);
      }
      const res = mfx.applyStylePresetToSteps(presetId, r.steps, pg.geo, pg);
      r.steps = res.steps;
      if (res.replayMeta) {
        r.stylePreset = res.replayMeta.stylePreset || presetId;
        if (typeof res.replayMeta.followCamera === 'boolean') r.followCamera = res.replayMeta.followCamera;
        if (typeof res.replayMeta.springCamera === 'boolean') r.springCamera = res.replayMeta.springCamera;
        if (typeof res.replayMeta.autoOrbitAfter === 'boolean') r.autoOrbitAfter = res.replayMeta.autoOrbitAfter;
      }
      r.stepIdx = 0;
      r.stepProgress = 0;
      r.playing = false;
      b._replayHiddenCache = null;
      persistScript(b, true, r, { _backupPrev: true, _backupReason: 'style_' + presetId });
      commitReplayChange(b, r, true);
      return true;
    },

    toggleIncludeBoardContent() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return false;
      const pg = b.doc.pages[r.page];
      if (!pg) return false;

      const hasBoardSteps = r.steps.some(st => st.kind === 'item' || st.kind === 'stroke' || (st.items && st.items.some(it => it.kind === 'item' || it.kind === 'stroke')));
      if (hasBoardSteps) {
        const next = [];
        for (const st of r.steps) {
          if (st.kind === 'item' || st.kind === 'stroke') continue;
          if (st.items && st.items.length) {
            const kept = st.items.filter(it => it.kind !== 'item' && it.kind !== 'stroke');
            if (!kept.length) continue;
            if (kept.length === 1) next.push({ ...st, kind: kept[0].kind, refId: kept[0].refId, items: undefined, rev: !!kept[0].rev });
            else next.push({ ...st, items: kept });
          } else {
            next.push(st);
          }
        }
        r.steps = next;
        r.scopeItems = null;
        r.scopeStrokes = null;
      } else {
        const boardSteps = buildBoardContentSteps(pg, null, null);
        if (!boardSteps.length) return false;
        const existingItemIds = new Set();
        const existingStrokeIds = new Set();
        for (const st of r.steps) {
          if (st.kind === 'item') existingItemIds.add(st.refId);
          if (st.kind === 'stroke') existingStrokeIds.add(st.refId);
        }
        for (const st of boardSteps) {
          if (st.kind === 'item' && !existingItemIds.has(st.refId)) r.steps.push(st);
          else if (st.kind === 'stroke' && !existingStrokeIds.has(st.refId)) r.steps.push(st);
        }
      }
      const activeLen = r.steps.filter(s => s.enabled !== false).length;
      if (r.stepIdx >= activeLen) {
        r.stepIdx = Math.max(0, activeLen - 1);
        r.stepProgress = activeLen ? 1 : 0;
      }
      r.playing = false;
      b._replayHiddenCache = null;
      persistScript(b, false, r);
      commitReplayChange(b, r, true);
      return !hasBoardSteps;
    },

    toggleFollowCamera() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return false;
      r.followCamera = r.followCamera === false;
      persistScript(b, false, r);
      renderReplayUI();
      return r.followCamera;
    },

    toggleAutoOrbitAfter() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return false;
      r.autoOrbitAfter = !r.autoOrbitAfter;
      persistScript(b, false, r);
      renderReplayUI();
      return r.autoOrbitAfter;
    },

    openEffectMenu(rawIdx, clientX, clientY) {
      openEffectPopover(rawIdx, clientX, clientY);
    },

    getExportContext(replayArg) {
      const b = getBoard();
      if (!b) return null;
      let r = replayArg || getFocusedReplay(b);
      if (!r) {
        const pageIdx = b.currentPage();
        const pg0 = b.doc.pages[pageIdx];
        if (!pg0 || !pg0.geo) return null;
        const steps = buildDefaultSteps(pg0.geo, null, null, pg0, null, null);
        if (!steps.length) return null;
        r = {
          id: 'rp_export_tmp',
          title: 'Cả trang',
          scriptKey: 'all',
          active: true,
          page: pageIdx,
          playing: false,
          stepIdx: 0,
          stepProgress: 0,
          speed: 1,
          pauseBetween: false,
          followCamera: true,
          springCamera: true,
          autoOrbitAfter: false,
          scopeShapes: null,
          scopePoints: null,
          scopeKey: 'all',
          steps
        };
      }
      const pg = b.doc.pages[r.page];
      if (!pg || !pg.geo) return null;
      const geo = pg.geo;
      const K = window.__mnGeoKernel;
      const coords = K && typeof K.Tt === 'function' ? K.Tt(geo) : new Map();
      const activeSteps = (r.steps || []).filter(s => s.enabled !== false);

      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const addPt = (x, y, pad = 0) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x - pad < x0) x0 = x - pad;
        if (y - pad < y0) y0 = y - pad;
        if (x + pad > x1) x1 = x + pad;
        if (y + pad > y1) y1 = y + pad;
      };

      const shSet = r.scopeShapes || null;
      const ptSet = r.scopePoints || null;
      for (const sh of (geo.shapes || [])) {
        if (sh.hidden || sh.kind === 'solid' || sh.kind === 'flatLink') continue;
        if (shSet && !shSet.has(sh.id)) continue;
        const bb = K && typeof K._mnShapeBBox === 'function' ? K._mnShapeBBox(sh, coords) : null;
        if (bb) {
          addPt(bb.x0, bb.y0, 8);
          addPt(bb.x1, bb.y1, 8);
        } else {
          for (const pid of (sh.pts || [])) {
            const p = coords.get(pid);
            if (p) addPt(p.x, p.y, 8);
          }
        }
      }
      // Include bounding boxes of item/stroke steps if present
      const itemMap = new Map((pg.items || []).map(x => [x.id, x]));
      const strokeMap = new Map((pg.strokes || []).map(x => [x.id, x]));
      for (const st of activeSteps) {
        const its = (st.items && st.items.length) ? st.items : [st];
        for (const it of its) {
          if (it.kind === 'item') {
            const obj = itemMap.get(it.refId);
            if (obj) {
              const bb = K && typeof K.z2 === 'function' ? K.z2(obj) : { x0: obj.x, y0: obj.y, x1: obj.x + (obj.w || 60), y1: obj.y + (obj.h || 32) };
              addPt(bb.x0, bb.y0, 10);
              addPt(bb.x1, bb.y1, 10);
            }
          } else if (it.kind === 'stroke') {
            const sk = strokeMap.get(it.refId);
            if (sk && Array.isArray(sk.pts)) {
              for (let k = 0; k < sk.pts.length; k += 3) {
                addPt(sk.pts[k], sk.pts[k + 1], Math.max(8, sk.width || 4));
              }
            }
          }
        }
      }
      const opts = {
        names: b.doc.names !== false,
        labelSize: b.doc.labelSize,
        dots: b.doc.dots,
        labelColor: b.doc.labelColor,
        dotColor: b.doc.dotColor,
        dotSize: b.doc.dotSize
      };
      const lblPos = K && typeof K.xk === 'function' ? K.xk(geo, coords, opts) : null;
      const fsz = opts.labelSize || 20;
      for (const pt of Object.values(geo.points || {})) {
        if (!pt.show || pt.hidden) continue;
        if (ptSet && !ptSet.has(pt.id)) continue;
        const c = coords.get(pt.id);
        if (c) addPt(c.x, c.y, 12);
        const lp = lblPos && lblPos.get(pt.id);
        if (lp) addPt(lp.x, lp.y, Math.max(16, fsz * 0.95));
      }
      if (!Number.isFinite(x0)) {
        x0 = 0; y0 = 0; x1 = 400; y1 = 300;
      }
      const bounds = { x0, y0, x1, y1, width: Math.max(40, x1 - x0), height: Math.max(40, y1 - y0) };
      const solid = typeof b.findOrbitSolid === 'function' ? b.findOrbitSolid(r.page, r.scopeShapes) : null;
      return {
        board: b,
        replay: r,
        pageIdx: r.page,
        page: pg,
        geo,
        activeSteps,
        bounds,
        solidId: solid ? solid.id : null,
        has3D: !!solid
      };
    }
  };

  window.addEventListener('minnote:aux-update', () => {
    renderMotionPanel();
    renderReplayUI();
  });

  // ==================== SMART POSITION FOR .sheet-restore-pill (NEVER OVERLAP TOOLBARS) ====================
  function positionSheetRestorePill() {
    const pill = document.querySelector('.sheet-restore-pill');
    if (!pill) return;
    const bw = document.querySelector('.board-wrap');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = 14;
    let bottom = 10;
    if (bw) {
      const r = bw.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        left = Math.round(r.left + 12);
        bottom = Math.round(Math.max(10, vh - r.bottom + 10));
      }
    }
    const fl = document.querySelector('.float-layer .tools-bar.float');
    if (fl) {
      const fr = fl.getBoundingClientRect();
      if (fr.width > 0 && fr.height > 0) {
        const pillW = pill.offsetWidth || 86;
        const pillH = pill.offsetHeight || 28;
        const pillTop = vh - bottom - pillH;
        const pillBottom = vh - bottom;
        const overlapX = left < fr.right + 8 && (left + pillW) > fr.left - 8;
        const overlapY = pillTop < fr.bottom + 8 && pillBottom > fr.top - 8;
        if (overlapX && overlapY) {
          if (fl.classList.contains('side-bottom')) {
            bottom = Math.round(Math.max(bottom, vh - fr.top + 10));
          } else if (fl.classList.contains('side-left')) {
            left = Math.round(Math.max(left, fr.right + 12));
          }
        }
      }
    }
    left = Math.max(8, Math.min(vw - 100, left));
    bottom = Math.max(8, Math.min(vh - 44, bottom));
    const lVal = left + 'px';
    const bVal = bottom + 'px';
    if (pill.style.getPropertyValue('--sheet-pill-left') !== lVal) pill.style.setProperty('--sheet-pill-left', lVal);
    if (pill.style.getPropertyValue('--sheet-pill-bottom') !== bVal) pill.style.setProperty('--sheet-pill-bottom', bVal);
  }

  function startSheetPillObserver() {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        positionSheetRestorePill();
      });
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-ui'] });
    window.addEventListener('resize', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startSheetPillObserver);
  else startSheetPillObserver();
})();
