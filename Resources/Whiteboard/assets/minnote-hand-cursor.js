/**
 * MinNote v0.0.8.0 — Realistic Hand Holding Stylus Pen Cursor & Replay Painter
 * - Live hardware-accelerated hand-pen overlay while writing/drawing on .board-scroller
 * - Calibrated 2D Canvas painter for Construction Replay & Cropped GIF/Video Export
 * - Exact nib calibration for hand-pen-cursor.png (290x330, nib at (1, 20) -> (0.00345, 0.06061))
 */
(function () {
  'use strict';

  const STORAGE_LIVE_KEY = 'minnote_hand_cursor_live';
  const STORAGE_REPLAY_KEY = 'minnote_hand_cursor_replay';
  const PNG_SRC = './assets/hand-pen-cursor.png';

  // Exact calibrated metal nib coordinates on hand-pen-cursor.png (290x330)
  const NIB_NX = 0.00345;
  const NIB_NY = 0.06061;
  const DEFAULT_ASPECT = 290 / 330;

  // Clean inline SVG fallback (stylus + stylized hand) used immediately before PNG finishes loading
  const FALLBACK_SVG =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="290" height="330" viewBox="0 0 290 330">' +
        '<defs>' +
          '<linearGradient id="penBody" x1="0" y1="0" x2="1" y2="0.4">' +
            '<stop offset="0%" stop-color="#38bdf8"/>' +
            '<stop offset="50%" stop-color="#0d9488"/>' +
            '<stop offset="100%" stop-color="#0f766e"/>' +
          '</linearGradient>' +
          '<linearGradient id="nib" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#334155"/>' +
            '<stop offset="55%" stop-color="#e2e8f0"/>' +
            '<stop offset="100%" stop-color="#64748b"/>' +
          '</linearGradient>' +
          '<linearGradient id="skin" x1="0" y1="0" x2="0.7" y2="1">' +
            '<stop offset="0%" stop-color="#f5c6a5"/>' +
            '<stop offset="65%" stop-color="#e2a37c"/>' +
            '<stop offset="100%" stop-color="#c9855e"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<g>' +
          '<polygon points="1,20 26,20 21,34" fill="url(#nib)"/>' +
          '<path d="M23,20 L256,112 C263,115 266,122 263,129 C260,136 252,139 245,136 L19,35 Z" fill="url(#penBody)" stroke="#0f172a" stroke-opacity="0.22" stroke-width="1.2"/>' +
          '<ellipse cx="255" cy="126" rx="5.5" ry="9" transform="rotate(22 255 126)" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>' +
          '<path d="M55,28 C82,10 132,4 166,14 C198,24 232,62 246,84 C254,98 250,115 239,122 L222,115 C224,96 205,74 182,66 C158,58 134,58 118,52 C92,42 66,42 55,28 Z" fill="url(#skin)"/>' +
          '<path d="M46,56 C58,41 82,42 98,58 L138,108 C156,128 184,122 212,128 C236,133 246,162 241,202 C238,228 242,262 252,292 L176,308 C166,272 150,248 128,220 C100,185 74,132 54,96 C44,78 40,64 46,56 Z" fill="url(#skin)" stroke="#8b5a3c" stroke-opacity="0.25" stroke-width="1.2"/>' +
          '<path d="M148,295 L268,266 L286,329 L160,329 Z" fill="#1e3a5f"/>' +
        '</g>' +
      '</svg>'
    );

  let handImg = null;
  let imgReady = false;
  let imgFailed = false;
  let fallbackImg = null;
  let loadPromise = null;

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
          if (liveImgEl) liveImgEl.src = handImg.src;
          resolve(handImg);
        };
        handImg.onerror = () => {
          imgFailed = true;
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
    try {
      localStorage.setItem(key, val ? '1' : '0');
    } catch (_) {}
  }

  let liveEnabled = readBool(STORAGE_LIVE_KEY, false);
  let replayEnabled = readBool(STORAGE_REPLAY_KEY, true);

  // Live floating overlay state
  let liveWrap = null;
  let liveImgEl = null;
  let liveVisible = false;
  let liveDown = false;
  let targetX = -999;
  let targetY = -999;
  let curX = -999;
  let curY = -999;
  let prevX = -999;
  let prevY = -999;
  let smoothTilt = 0;
  let smoothLift = 1; // 0 = pressed drawing, 1 = hovering lifted
  let liveRaf = 0;
  let listenersBound = false;

  // Replay canvas painter smoothing state
  let replaySmoothTilt = 0;
  let replaySmoothLift = 0;
  let lastTipX = null;
  let lastTipY = null;

  const LIVE_DISPLAY_HEIGHT = 215;

  const UI_OBSTRUCTION_SELECTOR = [
    '.toolbar',
    '.topbar',
    '.top-bar',
    '.bottom-bar',
    '.dock',
    '#nb-tools-dock',
    '.dropdown-menu',
    '.popover',
    '.selection-bar',
    '.dialog',
    '.modal',
    '.mm-modal-overlay',
    '.mn-v80-modal',
    '.mn-v80-backdrop',
    '#mn-replay-panel',
    '#mn-replay-pill',
    '#mn-motion-panel',
    '#mea-mindmap-container',
    '.mea-qb-overlay',
    '.mea-confirm-modal-overlay',
    '.mnrec-bar',
    '.show-bar',
    '.geo-amount',
    '.turn-bar',
    '.class-panel',
    'button',
    'input',
    'textarea',
    'select'
  ].join(',');

  function isOverDrawableBoard(target, clientX, clientY) {
    if (!target || typeof target.closest !== 'function') return false;
    if (target.closest(UI_OBSTRUCTION_SELECTOR)) return false;
    const scroller = target.closest('.board-scroller');
    if (!scroller) return false;
    // Also double-check no floating modal is open over the board
    const openModal = document.querySelector(
      '.mn-v80-backdrop.open, .mm-modal-overlay[style*="flex"], .mea-qb-overlay[style*="flex"], .dialog'
    );
    if (openModal && openModal.offsetParent !== null) {
      const r = openModal.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return false;
      }
    }
    return true;
  }

  function ensureLiveOverlay() {
    if (liveWrap) return liveWrap;
    ensureImages();
    const wrap = document.createElement('div');
    wrap.id = 'mn-live-hand-cursor';
    wrap.className = 'mn-live-hand-cursor';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText =
      'position:fixed;left:0;top:0;pointer-events:none;z-index:9990;opacity:0;' +
      'will-change:transform,opacity;transform-origin:0 0;transition:opacity 0.14s ease;';

    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = imgReady && handImg ? handImg.src : FALLBACK_SVG;
    img.style.cssText =
      'display:block;height:' + LIVE_DISPLAY_HEIGHT + 'px;width:auto;user-select:none;' +
      'pointer-events:none;filter:drop-shadow(0 10px 16px rgba(15,23,42,0.22));';

    wrap.appendChild(img);
    document.body.appendChild(wrap);
    liveWrap = wrap;
    liveImgEl = img;
    return wrap;
  }

  function setBoardCursorHidden(hidden) {
    const scroller = document.querySelector('.board-scroller');
    if (scroller) {
      scroller.classList.toggle('mn-hand-cursor-active', !!hidden);
    }
  }

  function updateToolbarButtons() {
    const liveBtns = document.querySelectorAll('#tb-btn-hand-cursor, [data-mn-hand-live]');
    liveBtns.forEach((btn) => {
      btn.classList.toggle('active', liveEnabled);
      btn.classList.toggle('on', liveEnabled);
      btn.setAttribute('aria-pressed', liveEnabled ? 'true' : 'false');
    });
    const replayBtns = document.querySelectorAll('[data-mn-hand-replay], #mn-rp-hand-btn');
    replayBtns.forEach((btn) => {
      btn.classList.toggle('active', replayEnabled);
      btn.classList.toggle('on', replayEnabled);
      btn.setAttribute('aria-pressed', replayEnabled ? 'true' : 'false');
    });
  }

  function stepLiveOverlay() {
    if (!liveEnabled || !liveVisible) {
      liveRaf = 0;
      if (liveWrap) liveWrap.style.opacity = '0';
      return;
    }
    const wrap = ensureLiveOverlay();

    // Smooth positional follow (snappy 0.55 blend for zero lag yet silky motion)
    if (curX < -500) {
      curX = targetX;
      curY = targetY;
      prevX = targetX;
      prevY = targetY;
    } else {
      curX += (targetX - curX) * 0.58;
      curY += (targetY - curY) * 0.58;
    }

    const vx = curX - prevX;
    const vy = curY - prevY;
    prevX = curX;
    prevY = curY;

    // Velocity-based subtle natural wrist tilt (-8deg..+8deg)
    const desiredTilt = Math.max(-8, Math.min(8, vx * 0.35 + vy * 0.08));
    smoothTilt += (desiredTilt - smoothTilt) * 0.18;

    // Smooth press-down vs hover-lift animation
    const desiredLift = liveDown ? 0 : 1;
    smoothLift += (desiredLift - smoothLift) * 0.28;

    const aspect = (imgReady && handImg && handImg.naturalHeight)
      ? handImg.naturalWidth / handImg.naturalHeight
      : DEFAULT_ASPECT;
    const drawH = LIVE_DISPLAY_HEIGHT;
    const drawW = drawH * aspect;
    const nibPxX = NIB_NX * drawW;
    const nibPxY = NIB_NY * drawH;

    // Lift offset: when hovering (not pressing), hover slightly up-right (+6px, -7px) with gentle tilt
    const liftDx = smoothLift * 6;
    const liftDy = smoothLift * -7;
    const liftAngle = smoothLift * -3.2;
    const pressScale = 1 - (1 - smoothLift) * 0.025;
    const angleDeg = smoothTilt + liftAngle;

    const tx = curX + liftDx;
    const ty = curY + liftDy;

    wrap.style.opacity = '1';
    wrap.style.transform =
      `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) ` +
      `rotate(${angleDeg.toFixed(2)}deg) ` +
      `scale(${pressScale.toFixed(4)}) ` +
      `translate3d(${(-nibPxX).toFixed(1)}px, ${(-nibPxY).toFixed(1)}px, 0)`;

    if (liveImgEl) {
      const shadowY = Math.round(6 + smoothLift * 10);
      const shadowBlur = Math.round(9 + smoothLift * 11);
      const isDark = document.documentElement.classList.contains('dark');
      const alpha = isDark ? (0.45 - smoothLift * 0.12) : (0.26 - smoothLift * 0.08);
      liveImgEl.style.filter = `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(15,23,42,${alpha.toFixed(2)}))`;
    }

    liveRaf = requestAnimationFrame(stepLiveOverlay);
  }

  function startLiveLoop() {
    if (!liveRaf && liveEnabled && liveVisible) {
      liveRaf = requestAnimationFrame(stepLiveOverlay);
    }
  }

  function onPointerMove(e) {
    if (!liveEnabled) return;
    if (!isOverDrawableBoard(e.target, e.clientX, e.clientY)) {
      if (liveVisible) {
        liveVisible = false;
        if (liveWrap) liveWrap.style.opacity = '0';
        setBoardCursorHidden(false);
      }
      return;
    }
    targetX = e.clientX;
    targetY = e.clientY;
    if (!liveVisible) {
      liveVisible = true;
      curX = targetX;
      curY = targetY;
      prevX = targetX;
      prevY = targetY;
      setBoardCursorHidden(true);
      startLiveLoop();
    }
  }

  function onPointerDown(e) {
    if (!liveEnabled) return;
    if (isOverDrawableBoard(e.target, e.clientX, e.clientY)) {
      liveDown = true;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!liveVisible) {
        liveVisible = true;
        curX = targetX;
        curY = targetY;
        setBoardCursorHidden(true);
        startLiveLoop();
      }
    }
  }

  function onPointerUp() {
    liveDown = false;
  }

  function onWindowLeave() {
    liveVisible = false;
    liveDown = false;
    if (liveWrap) liveWrap.style.opacity = '0';
    setBoardCursorHidden(false);
  }

  function bindLiveListeners() {
    if (listenersBound || typeof window === 'undefined') return;
    listenersBound = true;
    window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true, capture: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true, capture: true });
    document.addEventListener('mouseleave', onWindowLeave, { passive: true });
    window.addEventListener('blur', onWindowLeave, { passive: true });
  }

  function setLive(enabled) {
    liveEnabled = !!enabled;
    writeBool(STORAGE_LIVE_KEY, liveEnabled);
    if (liveEnabled) {
      ensureImages();
      ensureLiveOverlay();
      bindLiveListeners();
    } else {
      liveVisible = false;
      liveDown = false;
      if (liveWrap) liveWrap.style.opacity = '0';
      setBoardCursorHidden(false);
      if (liveRaf) {
        cancelAnimationFrame(liveRaf);
        liveRaf = 0;
      }
    }
    updateToolbarButtons();
    if (typeof window.showToast === 'function') {
      window.showToast(liveEnabled ? '✍ Đã bật Tay cầm bút đang viết' : 'Đã tắt Tay cầm bút');
    }
    return liveEnabled;
  }

  function toggleLive() {
    return setLive(!liveEnabled);
  }

  function isLive() {
    return liveEnabled;
  }

  function setReplay(enabled) {
    replayEnabled = !!enabled;
    writeBool(STORAGE_REPLAY_KEY, replayEnabled);
    updateToolbarButtons();
    const b = window.__minnoteBoard || (window.__meaBoardRef && window.__meaBoardRef.current);
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
   * Paint calibrated hand-pen cursor directly onto any 2D Canvas.
   * Works identically on live board `paintOverlay` (doc coords with board.zoom)
   * AND offscreen GIF/Video export canvases (`opts.forceShow`, `opts.targetHeight`).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x: number, y: number, dx?: number, dy?: number, active?: boolean, drawing?: boolean }} tip
   * @param {object} [board]
   * @param {{ forceShow?: boolean, targetHeight?: number, alpha?: number, isDark?: boolean }} [opts]
   */
  function paintReplayTip(ctx, tip, board, opts) {
    if (!ctx || !tip || !tip.active) return;
    if (!Number.isFinite(tip.x) || !Number.isFinite(tip.y)) return;
    const forceShow = !!(opts && opts.forceShow);
    if (!forceShow && !replayEnabled) return;

    const img = getDrawableImage();
    if (!img || (!img.complete && !imgReady) || !img.naturalWidth) return;

    const zoom = (board && Number.isFinite(board.zoom) && board.zoom > 0) ? board.zoom : 1;
    const invZoom = (opts && Number.isFinite(opts.targetHeight)) ? 1 : (1 / Math.max(0.35, Math.min(3.0, zoom)));

    const drawH = (opts && Number.isFinite(opts.targetHeight))
      ? opts.targetHeight
      : 195 * invZoom;
    const aspect = img.naturalHeight > 0 ? (img.naturalWidth / img.naturalHeight) : DEFAULT_ASPECT;
    const drawW = drawH * aspect;

    // Velocity/direction tilt calculation
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
      ? Math.max(-0.13, Math.min(0.13, (dx / Math.max(8, speed)) * 0.11 + (dy / Math.max(8, speed)) * 0.03))
      : 0;
    replaySmoothTilt += (targetTiltRad - replaySmoothTilt) * 0.25;

    const isDrawing = tip.drawing !== false;
    const targetLift = isDrawing ? 0 : 1;
    replaySmoothLift += (targetLift - replaySmoothLift) * 0.3;

    const liftDx = replaySmoothLift * drawH * 0.032;
    const liftDy = -replaySmoothLift * drawH * 0.042;
    const liftAngleRad = -replaySmoothLift * 0.065;
    const angle = replaySmoothTilt + liftAngleRad;
    const scale = 1 - (1 - replaySmoothLift) * 0.02;

    const nibX = NIB_NX * drawW;
    const nibY = NIB_NY * drawH;

    ctx.save();
    if (opts && Number.isFinite(opts.alpha)) {
      ctx.globalAlpha *= opts.alpha;
    }

    // Subtle ink-contact glow ring right beneath metal nib while actively drawing
    if (isDrawing) {
      const dotR = Math.max(2, drawH * 0.015);
      ctx.save();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, dotR * 1.9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.18)';
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(tip.x + liftDx, tip.y + liftDy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // Natural soft shadow underneath hand
    const isDark = (opts && typeof opts.isDark === 'boolean')
      ? opts.isDark
      : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = drawH * (0.045 + replaySmoothLift * 0.04);
    ctx.shadowOffsetX = drawH * 0.012;
    ctx.shadowOffsetY = drawH * (0.025 + replaySmoothLift * 0.035);

    ctx.drawImage(img, -nibX, -nibY, drawW, drawH);
    ctx.restore();
  }

  function resetReplaySmoothing() {
    replaySmoothTilt = 0;
    replaySmoothLift = 0;
    lastTipX = null;
    lastTipY = null;
  }

  // Initialize safely on DOM ready
  function init() {
    ensureImages();
    if (liveEnabled) {
      ensureLiveOverlay();
      bindLiveListeners();
    }
    updateToolbarButtons();
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
    paintReplayTip,
    resetReplaySmoothing,
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
