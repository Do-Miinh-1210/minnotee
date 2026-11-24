/**
 * MinNote v0.0.8.0 — Interactive Video Embed Engine (Local MP4/WebM & YouTube/Vimeo/URL)
 * - Stores videos as native `type: "image"` items with poster PNG + `item.video` metadata
 *   (so select, drag, resize, rotate, undo, delete, and .nrn persistence work automatically!)
 * - Mounts synced GPU-accelerated `#mn-video-overlay-layer` aligned via translate3d + scale(zoom)
 * - Smart pointer pass-through: interactive controls in Select mode or Play toggle;
 *   pointer-events: none while using pen/highlighter/eraser so teachers annotate right OVER video!
 */
(function () {
  'use strict';

  function getBoard() {
    return window.__minnoteBoard || window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || null;
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function isDrawToolActive(board) {
    if (!board || !board.tool) return false;
    const k = board.tool.k;
    if (k === 'select' || k === 'hand' || k === 'pointer') return false;
    if (k === 'geo' && board.tool.t === 'move') return false;
    return true;
  }

  // ============================================================================
  // 1. URL PARSER (YouTube / Shorts / Vimeo / Direct MP4-WebM)
  // ============================================================================
  function parseVideoUrl(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!url) return null;

    // YouTube: watch?v=, youtu.be/, shorts/, embed/
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
    );
    if (ytMatch) {
      const vid = ytMatch[1];
      return {
        kind: 'youtube',
        videoId: vid,
        url,
        embedUrl: `https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1`,
        platformLabel: 'YouTube',
        defaultTitle: `Video YouTube (${vid})`
      };
    }

    // Vimeo: vimeo.com/123456789
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/i);
    if (vimeoMatch) {
      const vid = vimeoMatch[1];
      return {
        kind: 'vimeo',
        videoId: vid,
        url,
        embedUrl: `https://player.vimeo.com/video/${vid}`,
        platformLabel: 'Vimeo',
        defaultTitle: `Video Vimeo (${vid})`
      };
    }

    // Direct video URL or minnote-media.local / blob:
    if (/^(https?:|blob:|file:)/i.test(url)) {
      const isDirect = /\.(mp4|webm|mov|mkv|m4v|ogv|ogg)(\?.*)?$/i.test(url) ||
        url.startsWith('blob:') ||
        url.includes('minnote-media.local');
      if (isDirect) {
        const cleanName = decodeURIComponent(url.split('?')[0].split('/').pop() || 'Video');
        return {
          kind: 'direct',
          url,
          embedUrl: url,
          platformLabel: 'Video',
          defaultTitle: cleanName
        };
      }
      // Generic embeddable URL fallback
      return {
        kind: 'iframe',
        url,
        embedUrl: url,
        platformLabel: 'Web Video',
        defaultTitle: url.replace(/^https?:\/\//i, '').slice(0, 42)
      };
    }

    return null;
  }

  // ============================================================================
  // 2. CRISP POSTER PNG GENERATORS (First-frame capture + Branded fallback)
  // ============================================================================
  function createBrandedPosterPng(title, subtitle, platform) {
    const w = 640;
    const h = 360;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Deep Cobalt / Slate studio gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (platform === 'YouTube') {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.55, '#0f172a');
      grad.addColorStop(1, '#3b0764');
    } else if (platform === 'Vimeo') {
      grad.addColorStop(0, '#0c4a6e');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.6, '#1e293b');
      grad.addColorStop(1, '#1d4ed8');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle geometric grid texture
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 32; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 32; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Platform pill top-left
    const pillLabel = (platform || 'MINNOTE VIDEO').toUpperCase();
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    const pw = ctx.measureText(pillLabel).width + 26;
    ctx.fillStyle = platform === 'YouTube' ? 'rgba(220, 38, 38, 0.92)' : 'rgba(37, 99, 235, 0.92)';
    roundRect(ctx, 22, 20, pw, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillLabel, 35, 34);

    // Center crisp Play button circle
    const cx = w / 2;
    const cy = h / 2 - 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 17);
    ctx.lineTo(cx + 20, cy);
    ctx.lineTo(cx - 12, cy + 17);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Bottom bar with title + subtitle
    const barGrad = ctx.createLinearGradient(0, h - 98, 0, h);
    barGrad.addColorStop(0, 'rgba(2, 6, 23, 0)');
    barGrad.addColorStop(1, 'rgba(2, 6, 23, 0.88)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, h - 98, w, 98);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(truncateText(ctx, title || 'Video bài giảng', w - 48), 24, h - 42);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(truncateText(ctx, subtitle || 'Nhấn phát hoặc vẽ chú thích trực tiếp lên video', w - 48), 24, h - 18);

    return canvas.toDataURL('image/png');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function truncateText(ctx, text, maxW) {
    let s = String(text || '');
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 3 && ctx.measureText(s + '…').width > maxW) {
      s = s.slice(0, -1);
    }
    return s + '…';
  }

  function captureVideoFirstFrame(videoUrl, title) {
    return new Promise((resolve) => {
      const fallback = () => resolve({
        poster: createBrandedPosterPng(title || 'Video cục bộ', videoUrl, 'Video'),
        width: 640,
        height: 360
      });
      if (!videoUrl || typeof document === 'undefined') return fallback();

      const vid = document.createElement('video');
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'auto';
      if (!videoUrl.startsWith('blob:')) {
        vid.crossOrigin = 'anonymous';
      }

      let settled = false;
      const done = (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        vid.pause();
        vid.removeAttribute('src');
        try { vid.load(); } catch (_) {}
        resolve(res);
      };

      const timer = setTimeout(() => done({
        poster: createBrandedPosterPng(title || 'Video cục bộ', 'Sẵn sàng phát trên bảng MinNote', 'Video'),
        width: 640,
        height: 360
      }), 4500);

      const drawFrame = () => {
        try {
          const vw = vid.videoWidth || 640;
          const vh = vid.videoHeight || 360;
          const maxW = 720;
          const scale = Math.min(1, maxW / vw);
          const cw = Math.max(160, Math.round(vw * scale));
          const ch = Math.max(90, Math.round(vh * scale));
          const c = document.createElement('canvas');
          c.width = cw;
          c.height = ch;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(vid, 0, 0, cw, ch);

          // Crisp translucent play emblem on poster
          ctx.beginPath();
          ctx.arc(cw / 2, ch / 2, Math.min(cw, ch) * 0.11, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.56)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.stroke();

          const r = Math.min(cw, ch) * 0.045;
          ctx.beginPath();
          ctx.moveTo(cw / 2 - r * 0.6, ch / 2 - r);
          ctx.lineTo(cw / 2 + r * 1.15, ch / 2);
          ctx.lineTo(cw / 2 - r * 0.6, ch / 2 + r);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          const poster = c.toDataURL('image/png');
          done({ poster, width: vw, height: vh });
        } catch (_) {
          done({
            poster: createBrandedPosterPng(title || 'Video cục bộ', 'Sẵn sàng phát trên bảng MinNote', 'Video'),
            width: vid.videoWidth || 640,
            height: vid.videoHeight || 360
          });
        }
      };

      vid.addEventListener('loadeddata', () => {
        if (vid.duration && vid.duration > 0.35 && vid.currentTime < 0.1) {
          try { vid.currentTime = 0.2; return; } catch (_) {}
        }
        drawFrame();
      }, { once: true });

      vid.addEventListener('seeked', drawFrame, { once: true });
      vid.addEventListener('error', () => fallback(), { once: true });
      vid.src = videoUrl;
    });
  }

  // ============================================================================
  // 3. INSERT VIDEO ITEM INTO WHITEBOARD
  // ============================================================================
  async function insertVideoItem(spec) {
    const board = getBoard();
    if (!board || typeof board.insertItem !== 'function') {
      toast('Bảng vẽ MinNote chưa sẵn sàng để chèn video.');
      return null;
    }

    const kind = spec.kind || 'local';
    const url = spec.url || spec.embedUrl || '';
    const embedUrl = spec.embedUrl || url;
    const title = spec.title || 'Video bài giảng';
    let poster = spec.poster || '';
    let natW = spec.width || 640;
    let natH = spec.height || 360;

    if (!poster) {
      if (kind === 'local' || kind === 'direct') {
        const cap = await captureVideoFirstFrame(url, title);
        poster = cap.poster;
        natW = cap.width || 640;
        natH = cap.height || 360;
      } else {
        const label = kind === 'youtube' ? 'YouTube' : (kind === 'vimeo' ? 'Vimeo' : 'Video');
        poster = createBrandedPosterPng(title, url, label);
      }
    }

    const aspect = natW > 0 && natH > 0 ? natW / natH : (16 / 9);
    const w = 480;
    const h = Math.round(w / aspect);
    const id = 'vid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

    const item = {
      id,
      type: 'image',
      x: 0,
      y: 0,
      w,
      h,
      src: poster,
      video: {
        kind,
        url,
        embedUrl,
        title,
        localPath: spec.localPath || '',
        muted: !!spec.muted,
        loop: !!spec.loop
      }
    };

    board.insertItem(item);
    // Activate overlay immediately so teacher sees the live video player ready
    overlayForceActive.set(id, true);
    ensureOverlayLoop();
    syncOverlays();
    toast('🎬 Đã chèn video "' + title + '" vào bảng vẽ!');
    return item;
  }

  // ============================================================================
  // 4. SYNCED OVERLAY LAYER (#mn-video-overlay-layer, 60fps rAF)
  // ============================================================================
  const mountedBoxes = new Map(); // itemId -> { el, mediaEl, kind, url, drawLocked, badgePlayBtn, badgeDrawBtn }
  const overlayForceActive = new Map(); // itemId -> boolean (user clicked play badge)
  const overlayDrawLock = new Map(); // itemId -> boolean (user manually enabled annotate-over-video)
  let overlayLayer = null;
  let overlayRaf = 0;

  function ensureOverlayLayer(board) {
    const parent = (board && board.host) || document.querySelector('.board-wrap') || document.getElementById('root') || document.body;
    if (!overlayLayer) {
      overlayLayer = document.getElementById('mn-video-overlay-layer');
      if (!overlayLayer) {
        overlayLayer = document.createElement('div');
        overlayLayer.id = 'mn-video-overlay-layer';
      }
    }
    if (parent && overlayLayer.parentElement !== parent) {
      parent.appendChild(overlayLayer);
    }
    return overlayLayer;
  }

  function createOverlayBox(item) {
    const v = item.video || {};
    const box = document.createElement('div');
    box.className = 'mn-vid-box';
    box.dataset.vidItemId = item.id;

    let mediaEl;
    if (v.kind === 'youtube' || v.kind === 'vimeo' || v.kind === 'iframe') {
      mediaEl = document.createElement('iframe');
      mediaEl.src = v.embedUrl || v.url || '';
      mediaEl.title = v.title || 'MinNote Video';
      mediaEl.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      mediaEl.allowFullscreen = true;
      mediaEl.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    } else {
      mediaEl = document.createElement('video');
      mediaEl.src = v.url || v.embedUrl || '';
      mediaEl.controls = true;
      mediaEl.playsInline = true;
      mediaEl.muted = !!v.muted;
      mediaEl.loop = !!v.loop;
      mediaEl.preload = 'metadata';
      if (item.src) mediaEl.poster = item.src;
    }
    box.appendChild(mediaEl);

    const badgeBar = document.createElement('div');
    badgeBar.className = 'mn-vid-badge-bar';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'mn-vid-mini-btn';
    playBtn.title = 'Phát / Tạm dừng hoặc tương tác với video';
    playBtn.textContent = v.kind === 'local' || v.kind === 'direct' ? '▶ Phát' : '▶ Tương tác';

    const drawBtn = document.createElement('button');
    drawBtn.type = 'button';
    drawBtn.className = 'mn-vid-mini-btn';
    drawBtn.title = 'Cho phép vẽ bút / highlight trực tiếp lên trên video';
    drawBtn.textContent = '✏ Vẽ đè';

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overlayDrawLock.set(item.id, false);
      overlayForceActive.set(item.id, true);
      if (mediaEl.tagName === 'VIDEO') {
        if (mediaEl.paused) {
          mediaEl.play().catch(() => {});
        } else {
          mediaEl.pause();
        }
      }
      syncOverlays();
    });

    drawBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = !overlayDrawLock.get(item.id);
      overlayDrawLock.set(item.id, next);
      if (next) overlayForceActive.set(item.id, false);
      syncOverlays();
    });

    if (mediaEl.tagName === 'VIDEO') {
      mediaEl.addEventListener('play', () => { playBtn.textContent = '⏸ Dừng'; });
      mediaEl.addEventListener('pause', () => { playBtn.textContent = '▶ Phát'; });
    }

    badgeBar.appendChild(playBtn);
    badgeBar.appendChild(drawBtn);
    box.appendChild(badgeBar);

    return {
      el: box,
      mediaEl,
      kind: v.kind,
      url: v.embedUrl || v.url || '',
      badgePlayBtn: playBtn,
      badgeDrawBtn: drawBtn
    };
  }

  function syncOverlays() {
    const board = getBoard();
    if (!board || !board.doc || !Array.isArray(board.doc.pages)) return;

    const seenIds = new Set();
    const zoom = board.zoom || 1;
    const scroller = board.scroller;
    const vw = scroller ? scroller.clientWidth : window.innerWidth;
    const vh = scroller ? scroller.clientHeight : window.innerHeight;
    const drawToolOn = isDrawToolActive(board);

    let videoCount = 0;

    for (let pageIdx = 0; pageIdx < board.doc.pages.length; pageIdx++) {
      const pg = board.doc.pages[pageIdx];
      if (!pg || !Array.isArray(pg.items)) continue;
      for (const item of pg.items) {
        if (!item || !item.video) continue;
        videoCount++;
        seenIds.add(item.id);

        const layer = ensureOverlayLayer(board);
        let rec = mountedBoxes.get(item.id);
        const curUrl = item.video.embedUrl || item.video.url || '';
        if (!rec || rec.kind !== item.video.kind || rec.url !== curUrl) {
          if (rec && rec.el.parentElement) rec.el.remove();
          rec = createOverlayBox(item);
          mountedBoxes.set(item.id, rec);
          layer.appendChild(rec.el);
        }

        // Compute pixel-perfect screen coordinates via board.screenRect
        let left, top;
        if (typeof board.screenRect === 'function') {
          const sr = board.screenRect(pageIdx, item);
          left = sr.left;
          top = sr.top;
        } else {
          const pTop = typeof board.pageTop === 'function' ? board.pageTop(pageIdx) : pageIdx * 1754;
          const scrollLeft = scroller ? scroller.scrollLeft : 0;
          const scrollTop = scroller ? scroller.scrollTop : 0;
          const offsetX = board.offsetX || 0;
          left = item.x * zoom + offsetX - scrollLeft;
          top = (pTop + item.y) * zoom - scrollTop;
        }

        const sw = item.w * zoom;
        const sh = item.h * zoom;
        const visible = left + sw > -40 && left < vw + 40 && top + sh > -40 && top < vh + 40;

        if (!visible) {
          rec.el.style.display = 'none';
          continue;
        }
        rec.el.style.display = 'block';
        rec.el.style.width = item.w + 'px';
        rec.el.style.height = item.h + 'px';

        const rotRad = Number.isFinite(item.rot) ? item.rot : 0;
        const rotPart = Math.abs(rotRad) > 1e-4 ? ` rotate(${rotRad.toFixed(4)}rad)` : '';
        rec.el.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${zoom.toFixed(4)})${rotPart}`;

        // Pointer mode: interactive in select mode (unless manually draw-locked), passthrough while drawing!
        const manualDrawLock = !!overlayDrawLock.get(item.id);
        const forceInteractive = !!overlayForceActive.get(item.id) && !drawToolOn;
        const interactive = !manualDrawLock && (!drawToolOn || forceInteractive);

        rec.el.classList.toggle('interactive', interactive);
        rec.el.classList.toggle('draw-passthrough', !interactive);
        rec.badgeDrawBtn.classList.toggle('active', manualDrawLock || drawToolOn);
        rec.badgePlayBtn.classList.toggle('active', interactive);
      }
    }

    // Cleanup removed/undone video items
    for (const [id, rec] of mountedBoxes.entries()) {
      if (!seenIds.has(id)) {
        if (rec.mediaEl && rec.mediaEl.tagName === 'VIDEO') {
          try { rec.mediaEl.pause(); } catch (_) {}
        }
        if (rec.el && rec.el.parentElement) rec.el.remove();
        mountedBoxes.delete(id);
        overlayForceActive.delete(id);
        overlayDrawLock.delete(id);
      }
    }

    return videoCount;
  }

  let idleTickCounter = 0;
  function overlayLoopStep() {
    const count = syncOverlays();
    if (count > 0) {
      idleTickCounter = 0;
      overlayRaf = requestAnimationFrame(overlayLoopStep);
    } else {
      // Check lazily every ~500ms if a saved .nrn document with videos gets opened
      overlayRaf = 0;
      idleTickCounter++;
      setTimeout(() => {
        if (!overlayRaf) ensureOverlayLoop();
      }, idleTickCounter < 8 ? 350 : 900);
    }
  }

  function ensureOverlayLoop() {
    if (!overlayRaf && typeof requestAnimationFrame === 'function') {
      overlayRaf = requestAnimationFrame(overlayLoopStep);
    }
  }

  // ============================================================================
  // 5. INSERT VIDEO MODAL (2 Tabs: Local Video + YouTube / URL)
  // ============================================================================
  let modalBackdrop = null;
  let modalState = {
    tab: 'local', // 'local' | 'url'
    localSpec: null,
    urlSpec: null,
    muted: false,
    loop: false
  };

  function ensureInsertModal() {
    if (modalBackdrop) return modalBackdrop;
    const el = document.createElement('div');
    el.id = 'mn-video-modal-backdrop';
    el.className = 'mn-v80-backdrop';
    el.innerHTML = `
      <div class="mn-v80-modal narrow" role="dialog" aria-modal="true" aria-label="Chèn Video vào bảng vẽ">
        <div class="mn-v80-head">
          <div class="mn-v80-title">
            <span>🎬 Chèn Video vào Bảng vẽ</span>
            <span class="mn-v80-badge">Vẽ chú thích trực tiếp</span>
          </div>
          <button type="button" class="mn-v80-close" id="mn-vid-close" title="Đóng">✕</button>
        </div>
        <div class="mn-v80-body">
          <div class="mn-v80-tabs" role="tablist">
            <button type="button" class="mn-v80-tab active" data-tab="local">📁 Video từ máy (.mp4, .webm)</button>
            <button type="button" class="mn-v80-tab" data-tab="url">🔗 Link YouTube / Video URL</button>
          </div>

          <div id="mn-vid-pane-local" style="display:flex;flex-direction:column;gap:11px;">
            <div class="mn-vid-dropzone" id="mn-vid-dropzone">
              <div style="font-size:28px;margin-bottom:6px;">🎞️</div>
              <div style="font-weight:700;color:var(--mn80-text);font-size:13.5px;">Chọn tệp Video từ máy tính hoặc kéo thả vào đây</div>
              <div style="font-size:11.5px;margin-top:4px;">Hỗ trợ MP4, WebM, MOV, MKV • Tự động trích xuất ảnh đại diện (poster)</div>
              <button type="button" class="mn-v80-btn primary" id="mn-vid-pick-btn" style="margin-top:11px;">📂 Chọn tệp Video...</button>
              <input type="file" id="mn-vid-file-input" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*" style="display:none;" />
            </div>
            <div id="mn-vid-local-preview" style="display:none;"></div>
          </div>

          <div id="mn-vid-pane-url" style="display:none;flex-direction:column;gap:11px;">
            <div class="mn-v80-field">
              <label class="mn-v80-label" for="mn-vid-url-input">Đường dẫn YouTube, Vimeo hoặc link MP4/WebM trực tiếp</label>
              <input type="url" id="mn-vid-url-input" class="mn-v80-input" placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/... hoặc .mp4" />
            </div>
            <div class="mn-v80-field">
              <label class="mn-v80-label" for="mn-vid-title-input">Tiêu đề hiển thị (tùy chọn)</label>
              <input type="text" id="mn-vid-title-input" class="mn-v80-input" placeholder="Ví dụ: Bài giảng Hình học không gian lớp 11" />
            </div>
            <div id="mn-vid-url-preview" style="display:none;"></div>
          </div>

          <div style="display:flex;gap:16px;flex-wrap:wrap;padding-top:4px;">
            <label class="mn-v80-toggle">
              <input type="checkbox" id="mn-vid-opt-loop" />
              <span>Lặp lại liên tục (Loop)</span>
            </label>
            <label class="mn-v80-toggle">
              <input type="checkbox" id="mn-vid-opt-muted" />
              <span>Tắt tiếng khi bắt đầu (Muted)</span>
            </label>
          </div>
        </div>
        <div class="mn-v80-foot">
          <span style="font-size:11.5px;color:var(--mn80-text-muted);">Chuyển sang Bút/Highlight để viết chú thích ngay lên trên video.</span>
          <div class="mn-v80-foot-group">
            <button type="button" class="mn-v80-btn" id="mn-vid-cancel">Hủy</button>
            <button type="button" class="mn-v80-btn primary" id="mn-vid-insert" disabled>✓ Chèn Video vào bảng</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    modalBackdrop = el;

    const close = () => el.classList.remove('open');
    el.querySelector('#mn-vid-close').addEventListener('click', close);
    el.querySelector('#mn-vid-cancel').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    const paneLocal = el.querySelector('#mn-vid-pane-local');
    const paneUrl = el.querySelector('#mn-vid-pane-url');
    const insertBtn = el.querySelector('#mn-vid-insert');
    const urlInput = el.querySelector('#mn-vid-url-input');
    const titleInput = el.querySelector('#mn-vid-title-input');
    const localPreview = el.querySelector('#mn-vid-local-preview');
    const urlPreview = el.querySelector('#mn-vid-url-preview');
    const fileInput = el.querySelector('#mn-vid-file-input');
    const dropzone = el.querySelector('#mn-vid-dropzone');

    const updateInsertButton = () => {
      const ready = modalState.tab === 'local' ? !!modalState.localSpec : !!modalState.urlSpec;
      insertBtn.disabled = !ready;
    };

    const setTab = (tab) => {
      modalState.tab = tab;
      el.querySelectorAll('.mn-v80-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
      paneLocal.style.display = tab === 'local' ? 'flex' : 'none';
      paneUrl.style.display = tab === 'url' ? 'flex' : 'none';
      updateInsertButton();
    };

    el.querySelectorAll('.mn-v80-tab').forEach((b) => {
      b.addEventListener('click', () => setTab(b.dataset.tab));
    });

    async function handleLocalSource(url, fileName, localPath, sizeBytes) {
      localPreview.style.display = 'block';
      localPreview.innerHTML = '<div class="mn-v80-card" style="font-size:12px;">⏳ Đang tạo ảnh xem trước (first-frame poster)...</div>';
      const cap = await captureVideoFirstFrame(url, fileName);
      modalState.localSpec = {
        kind: 'local',
        url,
        embedUrl: url,
        title: fileName || 'Video cục bộ',
        localPath: localPath || '',
        poster: cap.poster,
        width: cap.width,
        height: cap.height
      };
      const mbStr = sizeBytes ? ` • ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : '';
      localPreview.innerHTML = `
        <div class="mn-vid-preview-card">
          <img src="${cap.poster}" alt="Poster" />
          <div style="min-width:0;flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--mn80-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(fileName || 'Video')}</div>
            <div style="font-size:11.5px;color:var(--mn80-text-muted);margin-top:3px;">${cap.width}×${cap.height}${mbStr}</div>
            <div class="mn-v80-badge ok" style="margin-top:6px;">✓ Sẵn sàng chèn</div>
          </div>
        </div>
      `;
      updateInsertButton();
    }

    el.querySelector('#mn-vid-pick-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.MinNoteMeaSync && window.MinNoteMeaSync.isDesktopBridge()) {
        try {
          const res = await window.MinNoteMeaSync.request('PICK_VIDEO', {}, 120000);
          if (res && !res.cancelled && res.url) {
            await handleLocalSource(res.url, res.fileName, res.localPath, res.sizeBytes);
          }
        } catch (err) {
          toast('Không thể mở hộp thoại chọn video: ' + (err.message || err));
        }
      } else {
        fileInput.value = '';
        fileInput.click();
      }
    });

    dropzone.addEventListener('click', () => el.querySelector('#mn-vid-pick-btn').click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        const blobUrl = URL.createObjectURL(file);
        await handleLocalSource(blobUrl, file.name, '', file.size);
      }
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      await handleLocalSource(blobUrl, file.name, '', file.size);
    });

    const refreshUrlPreview = () => {
      const parsed = parseVideoUrl(urlInput.value);
      if (!parsed) {
        modalState.urlSpec = null;
        urlPreview.style.display = urlInput.value.trim() ? 'block' : 'none';
        if (urlInput.value.trim()) {
          urlPreview.innerHTML = '<div style="font-size:12px;color:var(--mn80-danger);">URL chưa hợp lệ. Hãy nhập link YouTube (youtube.com / youtu.be), Vimeo, hoặc link .mp4/.webm.</div>';
        }
        updateInsertButton();
        return;
      }
      const title = (titleInput.value || '').trim() || parsed.defaultTitle;
      const poster = createBrandedPosterPng(title, parsed.url, parsed.platformLabel);
      modalState.urlSpec = {
        kind: parsed.kind,
        url: parsed.url,
        embedUrl: parsed.embedUrl,
        title,
        poster,
        width: 640,
        height: 360
      };
      urlPreview.style.display = 'block';
      urlPreview.innerHTML = `
        <div class="mn-vid-preview-card">
          <img src="${poster}" alt="Poster" />
          <div style="min-width:0;flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--mn80-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(title)}</div>
            <div style="font-size:11px;color:var(--mn80-text-muted);margin-top:3px;word-break:break-all;">${esc(parsed.embedUrl)}</div>
            <span class="mn-v80-badge ok" style="margin-top:6px;">✓ ${esc(parsed.platformLabel)}</span>
          </div>
        </div>
      `;
      updateInsertButton();
    };

    urlInput.addEventListener('input', refreshUrlPreview);
    titleInput.addEventListener('input', refreshUrlPreview);

    el.querySelector('#mn-vid-opt-loop').addEventListener('change', (e) => { modalState.loop = e.target.checked; });
    el.querySelector('#mn-vid-opt-muted').addEventListener('change', (e) => { modalState.muted = e.target.checked; });

    insertBtn.addEventListener('click', async () => {
      const spec = modalState.tab === 'local' ? modalState.localSpec : modalState.urlSpec;
      if (!spec) return;
      insertBtn.disabled = true;
      await insertVideoItem(Object.assign({}, spec, {
        muted: modalState.muted,
        loop: modalState.loop
      }));
      modalState.localSpec = null;
      modalState.urlSpec = null;
      urlInput.value = '';
      titleInput.value = '';
      localPreview.style.display = 'none';
      urlPreview.style.display = 'none';
      close();
    });

    return el;
  }

  function openInsertModal() {
    const el = ensureInsertModal();
    el.classList.add('open');
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureOverlayLoop, { once: true });
    } else {
      ensureOverlayLoop();
    }
  }

  window.MinNoteVideo = {
    openInsertModal,
    insertVideoItem,
    syncOverlays,
    parseVideoUrl
  };
})();
