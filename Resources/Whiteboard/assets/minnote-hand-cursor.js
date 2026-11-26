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
 * MinNote v0.0.8.7 — Always-Visible Compact Hand-Holding-Pen Cursor & Replay Painter
 * - Integrated directly with MinNote's native `Con trỏ chuột` (vH = ["pen", "handPen", "hand", "system", "dot"])
 *   and `Cỡ con trỏ` (Nhỏ / Vừa / To / Rất to -> 64 / 76 / 88 / 100 CSS px).
 * - Uses DPI-aware `image-set()` capped strictly at <= 124x124 physical pixels so Windows Chromium/WebView2
 *   NEVER rejects the custom cursor at 100%, 125%, 150%, 175% or 200% scaling!
 * - Always visible across ALL board tools (pen, geo, select, pan, text, space, highlighter, shape, laser, eraser),
 *   when hovering points/shapes, when idle (never hidden by .no-pointer), AND when hovering/drawing with a stylus!
 * - Zero-shadowBlur pre-baked offscreen sprite for 60fps stylus & Construction Replay / GIF-Video export.
 */
(function () {
  'use strict';

  const STORAGE_REPLAY_KEY = 'minnote_hand_cursor_replay';
  const STORAGE_PREV_CURSOR_KEY = 'minnote_hand_prev_cursor';
  const STORAGE_DEFAULT_V87_KEY = 'minnote_hand_default_v87';
  // Kiểu hình đính kèm đầu nét khi dựng lại: 'hand' (tay cầm bút, mặc định) | 'stick' (người que — minnote-stick-figure.js).
  const STORAGE_REPLAY_FIGURE_KEY = 'minnote_replay_figure';
  const STICK_IDLE_MS = 1300; // hết nét: người que còn ~1.3 s để dừng bút, thu tay, hạ tay
  const PNG_SRC = './assets/hand-pen-cursor.png';

  // Exact calibrated metal nib coordinates on hand-pen-cursor.png (290x330)
  const NIB_NX = 0.00345;
  const NIB_NY = 0.06061;
  const DEFAULT_ASPECT = 290 / 330;

  // Compact CSS cursor heights for MinNote's cursorScale [1, 1.5, 2, 3]
  function heightForScale(scale) {
    const s = Number(scale);
    if (!Number.isFinite(s) || s <= 1.15) return 64;   // Nhỏ
    if (s <= 1.75) return 76;                           // Vừa
    if (s <= 2.4) return 88;                            // To
    return 100;                                         // Rất to
  }

  function makeFallbackSvg(w, h) {
    return (
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 290 330">` +
          '<defs>' +
            '<linearGradient id="p" x1="0" y1="0" x2="1" y2="0.4">' +
              '<stop offset="0%" stop-color="#38bdf8"/><stop offset="50%" stop-color="#0d9488"/><stop offset="100%" stop-color="#0f766e"/>' +
            '</linearGradient>' +
            '<linearGradient id="k" x1="0" y1="0" x2="0.7" y2="1">' +
              '<stop offset="0%" stop-color="#f5c6a5"/><stop offset="100%" stop-color="#c9855e"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<polygon points="1,20 26,20 21,34" fill="#64748b"/>' +
          '<path d="M23,20 L256,112 C263,115 266,122 263,129 C260,136 252,139 245,136 L19,35 Z" fill="url(#p)"/>' +
          '<path d="M55,28 C82,10 132,4 166,14 C198,24 232,62 246,84 C254,98 250,115 239,122 L222,115 C224,96 205,74 182,66 C158,58 134,58 118,52 Z" fill="url(#k)"/>' +
          '<path d="M46,56 C58,41 82,42 98,58 L138,108 C156,128 184,122 212,128 C236,133 246,162 241,202 L252,292 L176,308 L128,220 L54,96 Z" fill="url(#k)"/>' +
        '</svg>'
      )
    );
  }

  const FALLBACK_SVG = makeFallbackSvg(64 * DEFAULT_ASPECT, 64);

  let handImg = null;
  let imgReady = false;
  let fallbackImg = null;
  let loadPromise = null;
  const cursorCache = new Map(); // heightPx -> { css, url, w, h, hotX, hotY }
  const replayShadowCache = new Map(); // 'light'|'dark' -> { canvas, padX, padY, srcW, srcH }

  function ensureImages() {
    if (!fallbackImg && typeof Image !== 'undefined') {
      fallbackImg = new Image();
      fallbackImg.src = FALLBACK_SVG;
    }
    if (!handImg && typeof Image !== 'undefined') {
      handImg = new Image();
      loadPromise = new Promise((resolve) => {
        handImg.onload = () => {
          imgReady = true;
          cursorCache.clear();
          replayShadowCache.clear();
          refreshBoardCursorVar();
          resolve(handImg);
        };
        handImg.onerror = () => {
          resolve(fallbackImg);
        };
      });
      handImg.src = PNG_SRC;
    }
    return loadPromise || Promise.resolve(fallbackImg);
  }

  function getShadowedReplaySprite(img, isDark) {
    if (typeof document === 'undefined' || !img || !img.naturalWidth || !img.naturalHeight) return null;
    const key = (img === handImg ? 'png_' : 'svg_') + (isDark ? 'd' : 'l');
    if (replayShadowCache.has(key)) return replayShadowCache.get(key);
    try {
      const targetH = 196;
      const aspect = img.naturalWidth / img.naturalHeight;
      const srcW = Math.max(64, Math.round(targetH * aspect));
      const srcH = targetH;
      const pad = 16;
      const cv = document.createElement('canvas');
      cv.width = srcW + pad * 2;
      cv.height = srcH + pad * 2;
      const c = cv.getContext('2d');
      if (!c) return null;
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.shadowColor = isDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(15, 23, 42, 0.18)';
      c.shadowBlur = targetH * 0.04;
      c.shadowOffsetX = targetH * 0.01;
      c.shadowOffsetY = targetH * 0.022;
      c.drawImage(img, pad, pad, srcW, srcH);
      const entry = { canvas: cv, pad, srcW, srcH, totalW: cv.width, totalH: cv.height };
      replayShadowCache.set(key, entry);
      return entry;
    } catch (_) {
      return null;
    }
  }

  function getDrawableImage() {
    ensureImages();
    if (imgReady && handImg && handImg.naturalWidth > 0) return handImg;
    if (fallbackImg && fallbackImg.complete && fallbackImg.naturalWidth > 0) return fallbackImg;
    return handImg || fallbackImg;
  }

  function buildScaledCursorEntry(scale) {
    const dpr = Math.max(1, Math.min(3, (typeof window !== 'undefined' && Number(window.devicePixelRatio)) || 1));
    const dprKey = Math.round(dpr * 100);
    const cssH = heightForScale(scale);
    const cacheKey = (imgReady ? 'png_' : 'svg_') + cssH + '_d' + dprKey;
    if (cursorCache.has(cacheKey)) return cursorCache.get(cacheKey);

    const img = getDrawableImage();
    const aspect = (img && img.naturalHeight > 0) ? (img.naturalWidth / img.naturalHeight) : DEFAULT_ASPECT;

    // Guarantee physical bitmap <= 124x124 so Windows Chromium/WebView2 NEVER rejects custom cursor at 125%/150%/200% DPI!
    const physH = Math.min(124, Math.max(48, Math.round(cssH * dpr)));
    const physW = Math.min(124, Math.max(40, Math.round(physH * aspect)));
    const effH = physH / dpr;
    const effW = physW / dpr;
    const hotX = Math.max(0, Math.min(Math.max(1, Math.floor(effW)) - 1, Math.round(NIB_NX * effW)));
    const hotY = Math.max(0, Math.min(Math.max(1, Math.floor(effH)) - 1, Math.round(NIB_NY * effH)));

    let url = makeFallbackSvg(effW, effH);
    let isPng = false;
    if (imgReady && handImg && handImg.naturalWidth > 0 && typeof document !== 'undefined') {
      try {
        const cv = document.createElement('canvas');
        cv.width = physW;
        cv.height = physH;
        const c = cv.getContext('2d');
        if (c) {
          c.imageSmoothingEnabled = true;
          c.imageSmoothingQuality = 'high';
          c.clearRect(0, 0, physW, physH);
          c.drawImage(handImg, 0, 0, physW, physH);
          url = cv.toDataURL('image/png');
          isPng = true;
        }
      } catch (_) {
        url = makeFallbackSvg(effW, effH);
      }
    }

    const dprStr = Number(dpr.toFixed(2));
    const css = (isPng && dpr > 1.01)
      ? `image-set(url("${url}") ${dprStr}x) ${hotX} ${hotY}, default`
      : `url("${url}") ${hotX} ${hotY}, default`;

    const entry = {
      url,
      w: Math.round(effW),
      h: Math.round(effH),
      physW,
      physH,
      dpr,
      hotX,
      hotY,
      css
    };
    cursorCache.set(cacheKey, entry);
    return entry;
  }

  function getNativeCursorCss(scale) {
    ensureImages();
    return buildScaledCursorEntry(scale).css;
  }

  function getTabletCursorInfo(scale) {
    ensureImages();
    return buildScaledCursorEntry(scale);
  }

  function getCurrentCursorScale() {
    try {
      const b = window.__minnoteBoard || window.__noteRendererEditor || (window.__meaBoardRef && window.__meaBoardRef.current);
      if (b && Number.isFinite(b.cursorScale) && b.cursorScale > 0) return b.cursorScale;
      const prefs = JSON.parse(localStorage.getItem('prefs') || '{}');
      if (prefs && Number.isFinite(prefs.cursorScale)) return prefs.cursorScale;
    } catch (_) {}
    return 1;
  }

  function refreshBoardCursorVar() {
    if (typeof document === 'undefined') return;
    const boardEl = document.querySelector('main.board');
    if (boardEl && boardEl.dataset.cursor === 'handPen') {
      boardEl.style.setProperty('--board-cursor', getNativeCursorCss(getCurrentCursorScale()));
      const sc = boardEl.querySelector('.board-scroller');
      if (sc) {
        if (sc.style.cursor) sc.style.cursor = '';
        if (sc.classList.contains('no-pointer')) sc.classList.remove('no-pointer');
      }
    }
    updateToolbarButtons();
  }

  function readBool(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      return v === '1' || v === 'true';
    } catch (_) {
      return fallback;
    }
  }

  function writeBool(key, val) {
    try { localStorage.setItem(key, val ? '1' : '0'); } catch (_) {}
  }

  let replayEnabled = readBool(STORAGE_REPLAY_KEY, true);

  function readFigure() {
    try { return localStorage.getItem(STORAGE_REPLAY_FIGURE_KEY) === 'stick' ? 'stick' : 'hand'; } catch (_) { return 'hand'; }
  }
  let replayFigure = readFigure();
  let lastStickTip = null;   // tip người que vừa vẽ (để còn hiện khi hết nét)
  let stickIdleSince = null;

  function stickApi() {
    const S = typeof window !== 'undefined' ? window.MinNoteStickFigure : null;
    return S && typeof S.paintReplayTip === 'function' ? S : null;
  }

  // Replay canvas painter smoothing state
  let replaySmoothTilt = 0;
  let lastTipX = null;
  let lastTipY = null;

  function isLive() {
    if (typeof window.__mnGetBoardCursor === 'function') {
      return window.__mnGetBoardCursor() === 'handPen';
    }
    if (typeof document !== 'undefined') {
      const boardEl = document.querySelector('main.board');
      if (boardEl && boardEl.dataset.cursor) return boardEl.dataset.cursor === 'handPen';
    }
    try { return localStorage.getItem('cursor') === 'handPen'; } catch (_) { return false; }
  }

  function updateToolbarButtons() {
    if (typeof document === 'undefined') return;
    const active = isLive();
    document.querySelectorAll('#tb-btn-hand-cursor, [data-mn-hand-live]').forEach((btn) => {
      btn.classList.toggle('active', active);
      btn.classList.toggle('on', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const handOn = replayEnabled && replayFigure === 'hand';
    const stickOn = replayEnabled && replayFigure === 'stick';
    document.querySelectorAll('[data-mn-hand-replay], #mn-rp-hand, #mn-rp-hand-btn').forEach((btn) => {
      btn.classList.toggle('active', handOn);
      btn.classList.toggle('on', handOn);
      btn.setAttribute('aria-pressed', handOn ? 'true' : 'false');
    });
    document.querySelectorAll('[data-mn-stick-replay], #mn-rp-figure').forEach((btn) => {
      btn.classList.toggle('active', stickOn);
      btn.classList.toggle('on', stickOn);
      btn.setAttribute('aria-pressed', stickOn ? 'true' : 'false');
    });
  }

  function setLive(enabled) {
    ensureImages();
    const want = !!enabled;
    const cur = (typeof window.__mnGetBoardCursor === 'function')
      ? window.__mnGetBoardCursor()
      : (localStorage.getItem('cursor') || 'pen');

    let nextCursor = 'pen';
    if (want) {
      if (cur && cur !== 'handPen') {
        try { localStorage.setItem(STORAGE_PREV_CURSOR_KEY, cur); } catch (_) {}
      }
      nextCursor = 'handPen';
    } else {
      let prev = 'pen';
      try {
        const saved = localStorage.getItem(STORAGE_PREV_CURSOR_KEY);
        if (saved && saved !== 'handPen') prev = saved;
      } catch (_) {}
      nextCursor = prev;
    }

    if (typeof window.__mnSetBoardCursor === 'function') {
      window.__mnSetBoardCursor(nextCursor);
    } else {
      try { localStorage.setItem('cursor', nextCursor); } catch (_) {}
      const boardEl = document.querySelector('main.board');
      if (boardEl) {
        boardEl.dataset.cursor = nextCursor;
        if (nextCursor === 'handPen') {
          boardEl.style.setProperty('--board-cursor', getNativeCursorCss(getCurrentCursorScale()));
        }
      }
    }

    // Remove any legacy floating sticker element if present from earlier version
    const stale = document.getElementById('mn-live-hand-cursor');
    if (stale) stale.remove();

    setTimeout(() => {
      refreshBoardCursorVar();
      updateToolbarButtons();
    }, 0);

    if (typeof window.showToast === 'function') {
      window.showToast(want ? '✍ Con trỏ chuột: Tay cầm bút (chỉnh cỡ trong Cài đặt)' : 'Đã chuyển về con trỏ bút mặc định');
    }
    return want;
  }

  function toggleLive() {
    return setLive(!isLive());
  }

  function setReplay(enabled) {
    replayEnabled = !!enabled;
    writeBool(STORAGE_REPLAY_KEY, replayEnabled);
    lastStickTip = null; // bắt đầu / tắt dựng lại: người que không đứng lại ở chỗ của lần trước
    stickIdleSince = null;
    updateToolbarButtons();
    const b = window.__minnoteBoard || window.__noteRendererEditor || (window.__meaBoardRef && window.__meaBoardRef.current);
    if (b && typeof b.redraw === 'function') b.redraw();
    return replayEnabled;
  }

  function toggleReplay() {
    return setReplay(!replayEnabled);
  }

  function isReplay() {
    return replayEnabled;
  }

  /** Chọn hình đính kèm khi dựng lại ('hand' | 'stick') và bật hiển thị. */
  function setReplayFigure(style) {
    replayFigure = style === 'stick' ? 'stick' : 'hand';
    try { localStorage.setItem(STORAGE_REPLAY_FIGURE_KEY, replayFigure); } catch (_) {}
    resetReplaySmoothing();
    return setReplay(true) && replayFigure;
  }

  function getReplayFigure() {
    return replayFigure;
  }

  function getNativeTipMetrics(scale) {
    const img = getDrawableImage();
    const h = heightForScale(scale);
    const aspect = (img && img.naturalHeight > 0) ? (img.naturalWidth / img.naturalHeight) : DEFAULT_ASPECT;
    const w = h * aspect;
    return { w, h, nibX: NIB_NX * w, nibY: NIB_NY * h };
  }

  /**
   * Paint compact hand-pen right at native canvas cursor origin (0, 0) for stylus hover/draw (`paintPenTip`).
   */
  function paintNativeTip(ctx, scale) {
    const img = getDrawableImage();
    if (!ctx || !img || (!img.complete && !imgReady) || !img.naturalWidth) return;
    const { w, h, nibX, nibY } = getNativeTipMetrics(scale);
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const sprite = getShadowedReplaySprite(img, isDark);
    if (sprite) {
      const sx = w / sprite.srcW;
      const sy = h / sprite.srcH;
      const padW = sprite.pad * sx;
      const padH = sprite.pad * sy;
      ctx.drawImage(sprite.canvas, -nibX - padW, -nibY - padH, w + padW * 2, h + padH * 2);
    } else {
      ctx.drawImage(img, -nibX, -nibY, w, h);
    }
  }

  /**
   * Paint compact calibrated hand-pen cursor directly onto any 2D Canvas for Replay & GIF/Video export.
   * Metal nib sits at exact (tip.x, tip.y) with 0px gap while drawing!
   */
  function paintReplayTip(ctx, tip, board, opts) {
    if (!ctx || !tip || !tip.active) return;
    if (!Number.isFinite(tip.x) || !Number.isFinite(tip.y)) return;
    const forceShow = !!(opts && opts.forceShow);
    if (!forceShow && !replayEnabled) return;

    // Người que: dựng lại trên bảng theo lựa chọn; khi xuất (forceShow) chỉ khi gọi rõ opts.figure = 'stick'.
    const wantStick = (opts && opts.figure) ? opts.figure === 'stick' : (!forceShow && replayFigure === 'stick');
    const S = wantStick ? stickApi() : null;
    if (S) {
      lastStickTip = Object.assign({}, tip);
      stickIdleSince = null;
      S.paintReplayTip(ctx, tip, board, Object.assign({}, opts, { bounds: (opts && opts.bounds) || tip.bounds }));
      return;
    }

    const img = getDrawableImage();
    if (!img || (!img.complete && !imgReady) || !img.naturalWidth) return;

    const zoom = (board && Number.isFinite(board.zoom) && board.zoom > 0) ? board.zoom : 1;
    const invZoom = (opts && Number.isFinite(opts.targetHeight)) ? 1 : (1 / Math.max(0.45, Math.min(2.6, zoom)));

    const drawH = (opts && Number.isFinite(opts.targetHeight))
      ? opts.targetHeight
      : 104 * invZoom;
    const aspect = img.naturalHeight > 0 ? (img.naturalWidth / img.naturalHeight) : DEFAULT_ASPECT;
    const drawW = drawH * aspect;

    let dx = Number.isFinite(tip.dx) ? tip.dx : 0;
    let dy = Number.isFinite(tip.dy) ? tip.dy : 0;
    if (dx === 0 && dy === 0 && lastTipX !== null && lastTipY !== null) {
      dx = tip.x - lastTipX;
      dy = tip.y - lastTipY;
    }
    lastTipX = tip.x;
    lastTipY = tip.y;

    const speed = Math.hypot(dx, dy);
    const targetTiltRad = speed > 0.15
      ? Math.max(-0.09, Math.min(0.09, (dx / Math.max(10, speed)) * 0.075))
      : 0;
    replaySmoothTilt += (targetTiltRad - replaySmoothTilt) * 0.25;

    const isDrawing = tip.drawing !== false;
    const liftDx = isDrawing ? 0 : drawH * 0.025;
    const liftDy = isDrawing ? 0 : -drawH * 0.032;

    const nibX = NIB_NX * drawW;
    const nibY = NIB_NY * drawH;

    ctx.save();
    if (opts && Number.isFinite(opts.alpha)) {
      ctx.globalAlpha *= opts.alpha;
    }

    ctx.translate(tip.x + liftDx, tip.y + liftDy);
    ctx.rotate(replaySmoothTilt);

    const isDark = (opts && typeof opts.isDark === 'boolean')
      ? opts.isDark
      : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    // Zero-shadowBlur 60fps fast path: draw pre-baked shadowed offscreen sprite!
    const sprite = getShadowedReplaySprite(img, isDark);
    if (sprite) {
      const sx = drawW / sprite.srcW;
      const sy = drawH / sprite.srcH;
      const padW = sprite.pad * sx;
      const padH = sprite.pad * sy;
      ctx.drawImage(sprite.canvas, -nibX - padW, -nibY - padH, drawW + padW * 2, drawH + padH * 2);
    } else {
      ctx.drawImage(img, -nibX, -nibY, drawW, drawH);
    }
    ctx.restore();
  }

  /**
   * Gọi mỗi khung dựng lại khi KHÔNG có nét đang vẽ (giữa các bước / đã vẽ xong).
   * Người que vẫn đứng đó, dừng bút một nhịp rồi hạ tay; trả về true khi còn đang chuyển động
   * (khi đó tự xin vẽ lại khung sau để động tác hạ tay chạy hết).
   */
  function paintReplayIdle(ctx, tip, board, opts) {
    const o = opts || {};
    // Xuất GIF/Video gọi rõ opts.figure = 'stick' (+ dtMs theo FPS) — không phụ thuộc trạng thái trên bảng.
    const exporting = o.figure === 'stick';
    if (!ctx || !lastStickTip) return false;
    if (!exporting && (!replayEnabled || replayFigure !== 'stick')) return false;
    const S = stickApi();
    if (!S) return false;
    if (tip && Number.isFinite(tip.pageIdx) && Number.isFinite(lastStickTip.pageIdx) && tip.pageIdx !== lastStickTip.pageIdx) return false;
    let idleMs;
    if (Number.isFinite(o.dtMs)) {
      stickIdleSince = (stickIdleSince === null ? 0 : stickIdleSince) + o.dtMs; // đếm theo nhịp khung xuất
      idleMs = stickIdleSince;
    } else {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (stickIdleSince === null) stickIdleSince = now;
      idleMs = now - stickIdleSince;
    }
    S.paintReplayTip(ctx, Object.assign({}, lastStickTip, { active: true, drawing: false }), board,
      Object.assign({}, o, { bounds: lastStickTip.bounds }));
    const moving = idleMs < STICK_IDLE_MS;
    if (moving && !exporting && board && typeof board.redraw === 'function' && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { try { board.redraw(); } catch (_) {} });
    }
    return moving;
  }

  function resetReplaySmoothing() {
    replaySmoothTilt = 0;
    lastTipX = null;
    lastTipY = null;
    lastStickTip = null;
    stickIdleSince = null;
    const S = stickApi();
    if (S && typeof S.resetReplaySmoothing === 'function') S.resetReplaySmoothing();
  }

  function applyDefaultHandMigration() {
    try {
      if (localStorage.getItem(STORAGE_DEFAULT_V87_KEY) === '1') return;
      localStorage.setItem(STORAGE_DEFAULT_V87_KEY, '1');
      localStorage.setItem('cursor', 'handPen');
      if (localStorage.getItem(STORAGE_REPLAY_KEY) === null) {
        localStorage.setItem(STORAGE_REPLAY_KEY, '1');
      }
      if (typeof window.__mnSetBoardCursor === 'function') {
        window.__mnSetBoardCursor('handPen');
      } else {
        const boardEl = document.querySelector('main.board');
        if (boardEl) boardEl.dataset.cursor = 'handPen';
      }
    } catch (_) {}
  }

  function init() {
    ensureImages();
    applyDefaultHandMigration();
    updateToolbarButtons();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        refreshBoardCursorVar();
      }, { passive: true });
    }
    // Observe main.board[data-cursor] attribute changes so toolbar toggle & cursor CSS always stay synced!
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      const bindObs = () => {
        const boardEl = document.querySelector('main.board');
        if (!boardEl) {
          setTimeout(bindObs, 200);
          return;
        }
        // Re-sync default handPen once React board bridge has mounted
        if (localStorage.getItem('cursor') === 'handPen' && boardEl.dataset.cursor !== 'handPen' && typeof window.__mnSetBoardCursor === 'function') {
          window.__mnSetBoardCursor('handPen');
        }
        refreshBoardCursorVar();
        const obs = new MutationObserver(() => {
          refreshBoardCursorVar();
          updateToolbarButtons();
        });
        obs.observe(boardEl, { attributes: true, attributeFilter: ['data-cursor'] });
      };
      bindObs();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }

  window.MinNoteHandCursor = {
    toggleLive,
    setLive,
    isLive,
    toggleReplay,
    setReplay,
    isReplay,
    setReplayFigure,
    getReplayFigure,
    paintReplayIdle,
    getNativeCursorCss,
    getNativeTipMetrics,
    getTabletCursorInfo,
    paintNativeTip,
    paintReplayTip,
    resetReplaySmoothing,
    refreshBoardCursorVar,
    ensureLoaded: ensureImages,
    getCalibration: () => ({
      src: PNG_SRC,
      nibNormX: NIB_NX,
      nibNormY: NIB_NY,
      aspect: DEFAULT_ASPECT,
      loaded: imgReady
    })
  };
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
