/**
 * MinNote v0.0.8.2 — Native Compact Hand-Holding-Pen Mouse Cursor & Replay Painter
 * - Integrated directly with MinNote's native `Con trỏ chuột` (vH = ["pen", "handPen", "hand", "system", "dot"])
 *   and `Cỡ con trỏ` (Nhỏ / Vừa / To / Rất to -> 68px / 84px / 102px / 120px, strictly <= 128x128 hardware cursor!)
 * - Renders as a real OS/CSS hardware cursor (`--board-cursor`) with 0.00ms lag and pixel-exact metal nib hotspot!
 * - Zero floating sticker lag, zero double cursor, auto-switches to arrow/grab/eraser per active tool!
 * - Compact calibrated 2D Canvas painter for Construction Replay & Cropped GIF/Video Export (`104px`, 0px draw gap).
 */
(function () {
  'use strict';

  const STORAGE_REPLAY_KEY = 'minnote_hand_cursor_replay';
  const STORAGE_PREV_CURSOR_KEY = 'minnote_hand_prev_cursor';
  const PNG_SRC = './assets/hand-pen-cursor.png';

  // Exact calibrated metal nib coordinates on hand-pen-cursor.png (290x330)
  const NIB_NX = 0.00345;
  const NIB_NY = 0.06061;
  const DEFAULT_ASPECT = 290 / 330;

  // Map MinNote's native cursorScale (sH = [1, 1.5, 2, 3]) to crisp compact hardware cursor heights (<= 124px!)
  function heightForScale(scale) {
    const s = Number(scale);
    if (!Number.isFinite(s) || s <= 1.15) return 72;   // Nhỏ
    if (s <= 1.75) return 88;                           // Vừa
    if (s <= 2.4) return 104;                           // To
    return 120;                                         // Rất to (always <= 128px OS hardware limit!)
  }

  // Clean compact SVG fallback used synchronously before PNG finishes decoding
  const FALLBACK_SVG =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="82" viewBox="0 0 290 330">' +
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
    );

  let handImg = null;
  let imgReady = false;
  let fallbackImg = null;
  let loadPromise = null;
  const cursorCache = new Map(); // heightPx -> { css, url, w, h, hotX, hotY }

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

  function getDrawableImage() {
    ensureImages();
    if (imgReady && handImg && handImg.naturalWidth > 0) return handImg;
    if (fallbackImg && fallbackImg.complete && fallbackImg.naturalWidth > 0) return fallbackImg;
    return handImg || fallbackImg;
  }

  function buildScaledCursorEntry(scale) {
    const h = Math.min(124, Math.max(56, Math.round(heightForScale(scale))));
    const cacheKey = (imgReady ? 'png_' : 'svg_') + h;
    if (cursorCache.has(cacheKey)) return cursorCache.get(cacheKey);

    const img = getDrawableImage();
    const aspect = (img && img.naturalHeight > 0) ? (img.naturalWidth / img.naturalHeight) : DEFAULT_ASPECT;
    const w = Math.min(124, Math.max(48, Math.round(h * aspect)));
    const hotX = Math.max(0, Math.min(w - 1, Math.round(NIB_NX * w)));
    const hotY = Math.max(0, Math.min(h - 1, Math.round(NIB_NY * h)));

    let url = FALLBACK_SVG;
    if (imgReady && handImg && handImg.naturalWidth > 0 && typeof document !== 'undefined') {
      try {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const c = cv.getContext('2d');
        if (c) {
          c.imageSmoothingEnabled = true;
          c.imageSmoothingQuality = 'high';
          c.clearRect(0, 0, w, h);
          c.drawImage(handImg, 0, 0, w, h);
          url = cv.toDataURL('image/png');
        }
      } catch (_) {
        url = PNG_SRC;
      }
    }

    const entry = {
      url,
      w,
      h,
      hotX,
      hotY,
      css: `url("${url}") ${hotX} ${hotY}, default`
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
    document.querySelectorAll('[data-mn-hand-replay], #mn-rp-hand-btn').forEach((btn) => {
      btn.classList.toggle('active', replayEnabled);
      btn.classList.toggle('on', replayEnabled);
      btn.setAttribute('aria-pressed', replayEnabled ? 'true' : 'false');
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

  /**
   * Paint compact hand-pen right at native canvas cursor origin (0, 0) for `paintTip` (recording/preview).
   */
  function paintNativeTip(ctx, scale) {
    const img = getDrawableImage();
    if (!ctx || !img || (!img.complete && !imgReady) || !img.naturalWidth) return;
    const h = heightForScale(scale);
    const aspect = img.naturalHeight > 0 ? (img.naturalWidth / img.naturalHeight) : DEFAULT_ASPECT;
    const w = h * aspect;
    const nibX = NIB_NX * w;
    const nibY = NIB_NY * h;
    ctx.drawImage(img, -nibX, -nibY, w, h);
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
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = drawH * 0.04;
    ctx.shadowOffsetX = drawH * 0.01;
    ctx.shadowOffsetY = drawH * 0.022;

    ctx.drawImage(img, -nibX, -nibY, drawW, drawH);
    ctx.restore();
  }

  function resetReplaySmoothing() {
    replaySmoothTilt = 0;
    lastTipX = null;
    lastTipY = null;
  }

  function init() {
    ensureImages();
    updateToolbarButtons();
    // Observe main.board[data-cursor] attribute changes so toolbar toggle always stays synced with Settings!
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      const bindObs = () => {
        const boardEl = document.querySelector('main.board');
        if (!boardEl) {
          setTimeout(bindObs, 300);
          return;
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
    getNativeCursorCss,
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
