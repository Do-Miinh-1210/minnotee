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
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(vid, 0, 0, cw, ch);

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
        if (Number.isFinite(vid.duration) && vid.duration > 0.35 && vid.currentTime < 0.1) {
          try {
            const seekFallback = setTimeout(() => { if (!settled) drawFrame(); }, 700);
            vid.addEventListener('seeked', () => {
              clearTimeout(seekFallback);
              drawFrame();
            }, { once: true });
            vid.currentTime = 0.2;
            return;
          } catch (_) {}
        }
        drawFrame();
      }, { once: true });

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
    ensureOverlayLoop();
    syncOverlays();
    toast('🎬 Đã chèn video "' + title + '" vào bảng vẽ!');
    return item;
  }

  // ============================================================================
  // 4. SYNCED OVERLAY LAYER (#mn-video-overlay-layer, 60fps rAF) + DRAG / RESIZE
  // ============================================================================
  const mountedBoxes = new Map(); // itemId -> { el, wrapEl, mediaEl, dragSurface, isIframeKind, kind, url }
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

  function findVideoItemRecord(board, itemId) {
    if (!board || !board.doc || !Array.isArray(board.doc.pages)) return null;
    for (let pageIdx = 0; pageIdx < board.doc.pages.length; pageIdx++) {
      const pg = board.doc.pages[pageIdx];
      if (!pg || !Array.isArray(pg.items)) continue;
      for (let i = 0; i < pg.items.length; i++) {
        if (pg.items[i] && pg.items[i].id === itemId) {
          return { pageIdx, item: pg.items[i] };
        }
      }
    }
    return null;
  }

  function selectVideoItem(board, pageIdx, itemId) {
    if (!board) return;
    board.sel = {
      page: pageIdx,
      strokes: new Set(),
      items: new Set([itemId]),
      points: new Set(),
      shapes: new Set()
    };
    if (typeof board.redraw === 'function') board.redraw();
    if (typeof board.emit === 'function') board.emit();
  }

  function commitVideoItemRect(board, pageIdx, itemId, origRect, nextRect) {
    if (!board || typeof board.updatePage !== 'function' || typeof board.commit !== 'function') return;
    const found = findVideoItemRecord(board, itemId);
    if (found && found.item) {
      // Restore original geometry on existing reference so undoStack preserves pre-drag snapshot cleanly
      found.item.x = origRect.x;
      found.item.y = origRect.y;
      found.item.w = origRect.w;
      found.item.h = origRect.h;
    }
    board.commit(board.updatePage(pageIdx, (pg) => ({
      ...pg,
      items: (pg.items || []).map((it) => (it && it.id === itemId
        ? Object.assign({}, it, {
            x: nextRect.x,
            y: nextRect.y,
            w: nextRect.w,
            h: nextRect.h
          })
        : it))
    })));
    selectVideoItem(board, pageIdx, itemId);
    syncOverlays();
  }

  function attachVideoDragBehavior(box, dragSurface, mediaEl, itemId) {
    let dragState = null;

    dragSurface.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const board = getBoard();
      if (!board || isDrawToolActive(board)) return;
      const found = findVideoItemRecord(board, itemId);
      if (!found) return;

      e.preventDefault();
      e.stopPropagation();

      const it = found.item;
      dragState = {
        pointerId: e.pointerId,
        pageIdx: found.pageIdx,
        startClientX: e.clientX,
        startClientY: e.clientY,
        orig: { x: it.x, y: it.y, w: it.w, h: it.h },
        moved: false
      };

      try { dragSurface.setPointerCapture(e.pointerId); } catch (_) {}
      selectVideoItem(board, found.pageIdx, itemId);
    });

    dragSurface.addEventListener('pointermove', (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const board = getBoard();
      if (!board) return;
      const found = findVideoItemRecord(board, itemId);
      if (!found) return;

      const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
      if (!dragState.moved && dist < 3) return;
      if (!dragState.moved) {
        dragState.moved = true;
        dragSurface.classList.add('dragging');
      }

      const zoom = board.zoom || 1;
      found.item.x = dragState.orig.x + (e.clientX - dragState.startClientX) / zoom;
      found.item.y = dragState.orig.y + (e.clientY - dragState.startClientY) / zoom;
      if (typeof board.redraw === 'function') board.redraw();
      syncOverlays();
    });

    const finishDrag = (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const st = dragState;
      dragState = null;
      dragSurface.classList.remove('dragging');
      try {
        if (dragSurface.hasPointerCapture(e.pointerId)) {
          dragSurface.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const board = getBoard();
      if (!board) return;
      if (st.moved) {
        const zoom = board.zoom || 1;
        const nextX = st.orig.x + (e.clientX - st.startClientX) / zoom;
        const nextY = st.orig.y + (e.clientY - st.startClientY) / zoom;
        commitVideoItemRect(board, st.pageIdx, itemId, st.orig, {
          x: nextX,
          y: nextY,
          w: st.orig.w,
          h: st.orig.h
        });
      }
    };

    dragSurface.addEventListener('pointerup', finishDrag);
    dragSurface.addEventListener('pointercancel', finishDrag);

    dragSurface.addEventListener('dblclick', (e) => {
      const board = getBoard();
      if (!board || isDrawToolActive(board)) return;
      if (mediaEl && mediaEl.tagName === 'VIDEO') {
        e.preventDefault();
        e.stopPropagation();
        if (mediaEl.paused) {
          mediaEl.play().catch(() => {});
        } else {
          mediaEl.pause();
        }
      }
    });
  }

  function attachVideoResizeBehavior(handleEl, corner, itemId) {
    let resizeState = null;

    handleEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const board = getBoard();
      if (!board || isDrawToolActive(board)) return;
      const found = findVideoItemRecord(board, itemId);
      if (!found) return;

      e.preventDefault();
      e.stopPropagation();

      const it = found.item;
      const aspect = it.w > 0 && it.h > 0 ? it.w / it.h : (16 / 9);
      resizeState = {
        pointerId: e.pointerId,
        pageIdx: found.pageIdx,
        startClientX: e.clientX,
        startClientY: e.clientY,
        aspect,
        orig: { x: it.x, y: it.y, w: it.w, h: it.h },
        moved: false
      };

      try { handleEl.setPointerCapture(e.pointerId); } catch (_) {}
      selectVideoItem(board, found.pageIdx, itemId);
    });

    const computeNextRect = (st, clientX, clientY, zoom) => {
      const dx = (clientX - st.startClientX) / zoom;
      const dy = (clientY - st.startClientY) / zoom;
      const o = st.orig;
      const aspect = st.aspect;

      let candW = o.w;
      if (corner === 'se') {
        candW = Math.abs(dx) >= Math.abs(dy * aspect) ? o.w + dx : o.w + dy * aspect;
      } else if (corner === 'nw') {
        candW = Math.abs(dx) >= Math.abs(dy * aspect) ? o.w - dx : o.w - dy * aspect;
      } else if (corner === 'ne') {
        candW = Math.abs(dx) >= Math.abs(dy * aspect) ? o.w + dx : o.w - dy * aspect;
      } else if (corner === 'sw') {
        candW = Math.abs(dx) >= Math.abs(dy * aspect) ? o.w - dx : o.w + dy * aspect;
      }

      let newW = Math.max(140, Math.round(candW));
      let newH = Math.round(newW / aspect);
      if (newH < 80) {
        newH = 80;
        newW = Math.round(newH * aspect);
      }

      let newX = o.x;
      let newY = o.y;
      if (corner === 'nw') {
        newX = o.x + (o.w - newW);
        newY = o.y + (o.h - newH);
      } else if (corner === 'ne') {
        newY = o.y + (o.h - newH);
      } else if (corner === 'sw') {
        newX = o.x + (o.w - newW);
      }

      return { x: newX, y: newY, w: newW, h: newH };
    };

    handleEl.addEventListener('pointermove', (e) => {
      if (!resizeState || e.pointerId !== resizeState.pointerId) return;
      const board = getBoard();
      if (!board) return;
      const found = findVideoItemRecord(board, itemId);
      if (!found) return;

      const dist = Math.hypot(e.clientX - resizeState.startClientX, e.clientY - resizeState.startClientY);
      if (!resizeState.moved && dist < 2) return;
      resizeState.moved = true;

      const next = computeNextRect(resizeState, e.clientX, e.clientY, board.zoom || 1);
      found.item.x = next.x;
      found.item.y = next.y;
      found.item.w = next.w;
      found.item.h = next.h;
      if (typeof board.redraw === 'function') board.redraw();
      syncOverlays();
    });

    const finishResize = (e) => {
      if (!resizeState || e.pointerId !== resizeState.pointerId) return;
      const st = resizeState;
      resizeState = null;
      try {
        if (handleEl.hasPointerCapture(e.pointerId)) {
          handleEl.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const board = getBoard();
      if (!board || !st.moved) return;
      const next = computeNextRect(st, e.clientX, e.clientY, board.zoom || 1);
      commitVideoItemRect(board, st.pageIdx, itemId, st.orig, next);
    };

    handleEl.addEventListener('pointerup', finishResize);
    handleEl.addEventListener('pointercancel', finishResize);
  }

  function createOverlayBox(item) {
    const v = item.video || {};
    const box = document.createElement('div');
    box.className = 'mn-vid-box';
    box.dataset.vidItemId = item.id;
    const isIframeKind = v.kind === 'youtube' || v.kind === 'vimeo' || v.kind === 'iframe';
    box.dataset.kind = isIframeKind ? 'iframe' : 'video';

    const wrapEl = document.createElement('div');
    wrapEl.className = 'mn-vid-media-wrap';

    let mediaEl;
    if (isIframeKind) {
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
      mediaEl.preload = v.kind === 'local' ? 'auto' : 'metadata';
      if (item.src) mediaEl.poster = item.src;
    }

    const dragSurface = document.createElement('div');
    dragSurface.className = 'mn-vid-drag-surface';
    dragSurface.title = isIframeKind ? 'Kéo thanh này để di chuyển video' : 'Kéo để di chuyển video • Nháy đúp để Phát/Dừng';
    attachVideoDragBehavior(box, dragSurface, mediaEl, item.id);

    wrapEl.appendChild(mediaEl);
    wrapEl.appendChild(dragSurface);
    box.appendChild(wrapEl);

    ['nw', 'ne', 'sw', 'se'].forEach((corner) => {
      const handle = document.createElement('div');
      handle.className = `mn-vid-handle ${corner}`;
      handle.title = 'Kéo để đổi kích thước video';
      attachVideoResizeBehavior(handle, corner, item.id);
      box.appendChild(handle);
    });

    return {
      el: box,
      wrapEl,
      mediaEl,
      dragSurface,
      isIframeKind,
      kind: v.kind,
      url: v.embedUrl || v.url || ''
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

        if (!rec.isIframeKind && rec.dragSurface) {
          rec.dragSurface.style.bottom = Math.min(52, Math.max(24, Math.round(item.h * 0.32))) + 'px';
        }

        const rotRad = Number.isFinite(item.rot) ? item.rot : 0;
        const rotPart = Math.abs(rotRad) > 1e-4 ? ` rotate(${rotRad.toFixed(4)}rad)` : '';
        rec.el.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${zoom.toFixed(4)})${rotPart}`;

        // Interactive when NOT using a drawing tool; passthrough while annotating over video
        const interactive = !drawToolOn;
        const isSelected = interactive && !!(board.sel && board.sel.page === pageIdx && board.sel.items && board.sel.items.has(item.id));

        rec.el.classList.toggle('interactive', interactive);
        rec.el.classList.toggle('draw-passthrough', !interactive);
        rec.el.classList.toggle('selected', isSelected);
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
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
