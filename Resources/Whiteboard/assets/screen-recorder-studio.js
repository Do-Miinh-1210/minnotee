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
/* ============================================================================
   MinNote Pro Screen Recorder Studio (v0.0.7.3)
   - Native WPF C# screen + mic recorder (Windows Media Foundation H.264/AAC)
     -> ZERO browser getDisplayMedia -> ZERO "Sharing this tab" bar!
     -> Native capture-excluded overlay (WDA_EXCLUDEFROMCAPTURE = 0x11) so red
        border & floating pill NEVER appear inside recorded video!
   - Ultra-clean icon-only floating bar (zero text clutter, zero top tip banner)
   - Zero-jitter in-place DOM updates in Setup & Settings Modal (0 flash/flicker)
   - Clean browser getDisplayMedia fallback when running outside WPF Desktop
   ============================================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'minnote_recorder_studio_settings_v1';
  const MIN_BOX = 80;
  const CHUNK_BYTES = 1536000;

  const DEFAULT_SETTINGS = {
    folder: '',
    saveMode: 'panel', // 'panel' | 'auto'
    quality: 'ultra',  // 'ultra' | 'high' | 'standard'
    fps: 60,           // 60 | 30
    format: 'mp4',     // 'mp4' | 'webm'
    filePrefix: 'MinNote',
    mic: true,
    micDeviceId: '',
    showCursor: true
  };

  const QUALITY_PRESETS = {
    ultra: {
      id: 'ultra',
      label: 'Siêu nét',
      desc: 'Gốc 1:1 HiDPI • 24 Mbps',
      videoBps: 24000000,
      audioBps: 192000,
      scaleMode: 'native'
    },
    high: {
      id: 'high',
      label: 'Rất nét',
      desc: 'Full HD sắc nét • 16 Mbps',
      videoBps: 16000000,
      audioBps: 160000,
      scaleMode: 'high'
    },
    standard: {
      id: 'standard',
      label: 'Tiêu chuẩn',
      desc: 'Dung lượng nhẹ • 8 Mbps',
      videoBps: 8000000,
      audioBps: 128000,
      scaleMode: 'standard'
    }
  };

  const MP4_CODECS = [
    'video/mp4;codecs=avc1.640034,mp4a.40.2',
    'video/mp4;codecs=avc1.640032,mp4a.40.2',
    'video/mp4;codecs=avc1.64002a,mp4a.40.2',
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4'
  ];

  const WEBM_CODECS = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  // --------------------------------------------------------------------------
  // Crisp SVG Icons (Icon-Only UI)
  // --------------------------------------------------------------------------
  const SVG = {
    region:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="4 3"></rect>' +
        '<path d="M9 9h6v6H9z" fill="currentColor" opacity="0.2" stroke="none"></path>' +
      '</svg>',
    whole:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 9V6a2 2 0 0 1 2-2h3"></path>' +
        '<path d="M15 4h3a2 2 0 0 1 2 2v3"></path>' +
        '<path d="M20 15v3a2 2 0 0 1-2 2h-3"></path>' +
        '<path d="M9 20H6a2 2 0 0 1-2-2v-3"></path>' +
      '</svg>',
    micOn:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="9" y="2" width="6" height="12" rx="3"></rect>' +
        '<path d="M5 10a7 7 0 0 0 14 0"></path>' +
        '<line x1="12" y1="19" x2="12" y2="22"></line>' +
        '<line x1="8" y1="22" x2="16" y2="22"></line>' +
      '</svg>',
    micOff:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="2" y1="2" x2="22" y2="22"></line>' +
        '<path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path>' +
        '<path d="M5 10v2a7 7 0 0 0 12 5"></path>' +
        '<path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path>' +
        '<path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path>' +
        '<line x1="12" y1="19" x2="12" y2="22"></line>' +
      '</svg>',
    settings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="3"></circle>' +
        '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
      '</svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
      '</svg>',
    pause:
      '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<rect x="6" y="5" width="4" height="14" rx="1"></rect>' +
        '<rect x="14" y="5" width="4" height="14" rx="1"></rect>' +
      '</svg>',
    play:
      '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M7 5l12 7-12 7z"></path>' +
      '</svg>',
    stop:
      '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<rect x="6" y="6" width="12" height="12" rx="2"></rect>' +
      '</svg>',
    mini:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
        '<line x1="5" y1="12" x2="19" y2="12"></line>' +
      '</svg>',
    video:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="2" y="5" width="14" height="14" rx="2"></rect>' +
        '<path d="M16 10l6-3v10l-6-3z"></path>' +
      '</svg>'
  };

  // --------------------------------------------------------------------------
  // Native WPF WebView2 Bridge (REC_* & REC_NATIVE_*)
  // --------------------------------------------------------------------------
  const pendingRpc = new Map();
  const nativeEventListeners = new Set();
  let rpcSeq = 0;
  let rpcListenerAttached = false;
  let hostNativeRecorderAvailable = null; // null = unknown (defaults to isNativeHost())

  function isNativeHost() {
    return !!(window.__isMinNoteWebView2 && window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function');
  }

  function useNativeRecorder() {
    if (!isNativeHost()) return false;
    return hostNativeRecorderAvailable !== false;
  }

  function ensureRpcListener() {
    if (rpcListenerAttached || !isNativeHost()) return;
    rpcListenerAttached = true;
    window.chrome.webview.addEventListener('message', function (ev) {
      let msg = ev && ev.data;
      if (typeof msg === 'string') {
        try { msg = JSON.parse(msg); } catch (_) { return; }
      }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'REC_NATIVE_EVENT') {
        nativeEventListeners.forEach(function (fn) {
          try { fn(msg.event, msg.data); } catch (_) {}
        });
        return;
      }

      if (msg.type !== 'REC_RESULT' || !msg.id) return;
      const entry = pendingRpc.get(msg.id);
      if (!entry) return;
      pendingRpc.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.ok) {
        entry.resolve(msg.result);
      } else {
        entry.reject(new Error(msg.error || 'Lỗi thao tác lưu trữ video.'));
      }
    });
  }

  function callHost(type, payload, timeoutMs) {
    if (!isNativeHost()) {
      return Promise.reject(new Error('NOT_NATIVE_HOST'));
    }
    ensureRpcListener();
    return new Promise(function (resolve, reject) {
      const id = 'rec_' + (++rpcSeq) + '_' + Date.now();
      const timer = setTimeout(function () {
        if (pendingRpc.has(id)) {
          pendingRpc.delete(id);
          reject(new Error('Quá thời gian chờ phản hồi từ hệ thống lưu trữ.'));
        }
      }, timeoutMs || 60000);
      pendingRpc.set(id, { resolve, reject, timer });
      window.chrome.webview.postMessage(Object.assign({ type: type, id: id }, payload || {}));
    });
  }

  function loadLocalSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (_) {}
    return Object.assign({}, DEFAULT_SETTINGS);
  }

  function saveLocalSettings(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (_) {}
  }

  let cachedSettings = loadLocalSettings();
  let cachedVideos = [];

  async function syncSettingsFromHost() {
    if (!isNativeHost()) {
      return { settings: cachedSettings, videos: cachedVideos };
    }
    try {
      const res = await callHost('REC_GET_SETTINGS', {}, 15000);
      if (res && typeof res.nativeRecorder === 'boolean') {
        hostNativeRecorderAvailable = res.nativeRecorder;
      }
      if (res && res.settings) {
        cachedSettings = Object.assign({}, DEFAULT_SETTINGS, res.settings);
        saveLocalSettings(cachedSettings);
      }
      if (res && Array.isArray(res.videos)) {
        cachedVideos = res.videos;
      }
      return { settings: cachedSettings, videos: cachedVideos };
    } catch (_) {
      return { settings: cachedSettings, videos: cachedVideos };
    }
  }

  async function persistSettings(next) {
    cachedSettings = Object.assign({}, DEFAULT_SETTINGS, cachedSettings, next || {});
    saveLocalSettings(cachedSettings);
    if (isNativeHost()) {
      try {
        const res = await callHost('REC_SAVE_SETTINGS', { settings: cachedSettings }, 15000);
        if (res && res.settings) {
          cachedSettings = Object.assign({}, DEFAULT_SETTINGS, res.settings);
          saveLocalSettings(cachedSettings);
        }
        if (res && Array.isArray(res.videos)) {
          cachedVideos = res.videos;
        }
      } catch (err) {
        console.warn('[MinNoteRec] Save settings host error:', err);
      }
    }
    return cachedSettings;
  }

  function bytesToBase64(uint8) {
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < uint8.length; i += step) {
      binary += String.fromCharCode.apply(null, uint8.subarray(i, i + step));
    }
    return btoa(binary);
  }

  async function writeBlobNatively(blob, opts, onProgress) {
    const begin = await callHost('REC_FILE_BEGIN', {
      fullPath: opts.fullPath || '',
      folder: opts.folder || cachedSettings.folder || '',
      fileName: opts.fileName || '',
      ext: opts.ext || 'mp4'
    }, 20000);

    const sessionId = begin.sessionId;
    const total = blob.size;
    let offset = 0;
    try {
      while (offset < total) {
        const end = Math.min(total, offset + CHUNK_BYTES);
        const buf = await blob.slice(offset, end).arrayBuffer();
        const b64 = bytesToBase64(new Uint8Array(buf));
        await callHost('REC_FILE_CHUNK', { sessionId: sessionId, data: b64 }, 30000);
        offset = end;
        if (typeof onProgress === 'function') {
          onProgress(total > 0 ? Math.min(99, Math.round((offset / total) * 100)) : 100);
        }
      }
      const fin = await callHost('REC_FILE_END', { sessionId: sessionId }, 30000);
      if (fin && Array.isArray(fin.videos)) {
        cachedVideos = fin.videos;
      }
      if (typeof onProgress === 'function') onProgress(100);
      return fin;
    } catch (err) {
      try { await callHost('REC_FILE_ABORT', { sessionId: sessionId }, 10000); } catch (_) {}
      throw err;
    }
  }

  function fallbackBrowserSave(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function even(n) {
    return Math.max(2, Math.round(n / 2) * 2);
  }

  function clampRect(r) {
    const W = Math.max(MIN_BOX, window.innerWidth || 1280);
    const H = Math.max(MIN_BOX, window.innerHeight || 720);
    const w = Math.max(MIN_BOX, Math.min(Math.round(r.w || W), W));
    const h = Math.max(MIN_BOX, Math.min(Math.round(r.h || H), H));
    const x = Math.max(0, Math.min(Math.round(r.x || 0), W - w));
    const y = Math.max(0, Math.min(Math.round(r.y || 0), H - h));
    return { x: x, y: y, w: w, h: h };
  }

  function wholeWindowRect() {
    return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  }

  function rectsEqual(a, b) {
    return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2;
  }

  function safePageRect(pageRectFn) {
    let raw = null;
    try {
      if (typeof pageRectFn === 'function') raw = pageRectFn();
    } catch (_) {}
    if (!raw || !raw.w || !raw.h) {
      const scroller = document.querySelector('.board-scroller');
      if (scroller) {
        const br = scroller.getBoundingClientRect();
        raw = { x: br.left, y: br.top, w: scroller.clientWidth || br.width, h: scroller.clientHeight || br.height };
      }
    }
    if (!raw || !raw.w || !raw.h) return wholeWindowRect();
    const x0 = Math.max(0, Math.round(raw.x));
    const y0 = Math.max(0, Math.round(raw.y));
    const x1 = Math.min(window.innerWidth, Math.round(raw.x + raw.w));
    const y1 = Math.min(window.innerHeight, Math.round(raw.y + raw.h));
    return clampRect({ x: x0, y: y0, w: Math.max(MIN_BOX, x1 - x0), h: Math.max(MIN_BOX, y1 - y0) });
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatDateTime(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function buildSuggestedName(prefix, docName) {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    const ts = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds());
    let base = (prefix || 'MinNote').trim();
    if (base === '{title}') {
      base = (docName || 'MinNote').trim();
    }
    base = base.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_') || 'MinNote';
    return base + '_' + ts;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pickMimeType(format) {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const list = format === 'webm'
      ? WEBM_CODECS.concat(MP4_CODECS)
      : MP4_CODECS.concat(WEBM_CODECS);
    return list.find(function (m) { return MediaRecorder.isTypeSupported(m); }) || '';
  }

  // --------------------------------------------------------------------------
  // Web-only Fallback Cropping Pipeline (never used on WPF Desktop!)
  // --------------------------------------------------------------------------
  function computeExactCropBox(frameW, frameH, frameX, frameY, rect) {
    const winW = Math.max(1, window.innerWidth);
    const winH = Math.max(1, window.innerHeight);
    const sx = frameW / winW;
    const sy = frameH / winH;

    let cx, cy, cw, ch;
    if (Math.abs(sx - sy) / Math.max(sx, sy) > 0.015) {
      const scale = Math.min(sx, sy);
      const offX = (frameW - winW * scale) / 2;
      const offY = (frameH - winH * scale) / 2;
      cx = offX + rect.x * scale;
      cy = offY + rect.y * scale;
      cw = rect.w * scale;
      ch = rect.h * scale;
    } else {
      cx = rect.x * sx;
      cy = rect.y * sy;
      cw = rect.w * sx;
      ch = rect.h * sy;
    }

    const maxW = frameW - (frameW % 2);
    const maxH = frameH - (frameH % 2);
    const w = Math.max(2, Math.min(even(cw), maxW));
    const h = Math.max(2, Math.min(even(ch), maxH));
    const x = Math.max(0, Math.min(even(cx), maxW - w));
    const y = Math.max(0, Math.min(even(cy), maxH - h));
    return { x: frameX + x, y: frameY + y, width: w, height: h };
  }

  function createVideoFrameCropper(displayStream, rectRef) {
    const track = displayStream.getVideoTracks()[0];
    if (!window.MediaStreamTrackProcessor || !window.MediaStreamTrackGenerator || typeof VideoFrame === 'undefined' || !track) {
      return null;
    }
    const processor = new window.MediaStreamTrackProcessor({ track: track });
    const generator = new window.MediaStreamTrackGenerator({ kind: 'video' });
    const transformer = new TransformStream({
      transform: function (frame, controller) {
        try {
          const p = frame.visibleRect || { x: 0, y: 0, width: frame.displayWidth, height: frame.displayHeight };
          const box = computeExactCropBox(p.width, p.height, p.x, p.y, rectRef.current);
          controller.enqueue(new VideoFrame(frame, { visibleRect: box }));
        } catch (_) {
        } finally {
          frame.close();
        }
      }
    });
    processor.readable.pipeThrough(transformer).pipeTo(generator.writable).catch(function () {});
    return {
      stream: new MediaStream([generator]),
      stop: function () {
        try { generator.stop(); } catch (_) {}
      }
    };
  }

  async function createCanvasCropper(displayStream, rectRef, fps) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = displayStream;
    await video.play();

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const initW = video.videoWidth || Math.round(window.innerWidth * dpr);
    const initH = video.videoHeight || Math.round(window.innerHeight * dpr);
    const initBox = computeExactCropBox(initW, initH, 0, 0, rectRef.current);

    const canvas = document.createElement('canvas');
    canvas.width = initBox.width;
    canvas.height = initBox.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let active = true;
    function draw() {
      if (!active) return;
      const vw = video.videoWidth || initW;
      const vh = video.videoHeight || initH;
      const box = computeExactCropBox(vw, vh, 0, 0, rectRef.current);
      if (canvas.width !== box.width || canvas.height !== box.height) {
        canvas.width = box.width;
        canvas.height = box.height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
      if ('requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(draw);
      } else {
        requestAnimationFrame(draw);
      }
    }
    draw();
    return {
      stream: 'requestVideoFrameCallback' in video ? canvas.captureStream() : canvas.captureStream(fps || 60),
      stop: function () {
        active = false;
        try { video.pause(); video.srcObject = null; } catch (_) {}
      }
    };
  }

  // --------------------------------------------------------------------------
  // Auto-Save Floating Notification Card
  // --------------------------------------------------------------------------
  let activeToastCard = null;
  let activeToastTimer = null;

  function showSavedNotificationCard(info) {
    if (activeToastCard) {
      activeToastCard.remove();
      activeToastCard = null;
    }
    if (activeToastTimer) {
      clearTimeout(activeToastTimer);
      activeToastTimer = null;
    }

    const wrap = document.createElement('div');
    wrap.className = 'mnrec-root';
    wrap.innerHTML =
      '<div class="mnrec-toast-card">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;color:var(--mnrec-success);">' +
            '<span>●</span><span>Đã lưu video thành công</span>' +
          '</div>' +
          '<button class="mnrec-close-btn" data-act="close" title="Đóng">✕</button>' +
        '</div>' +
        '<div style="font-size:13px;font-weight:600;word-break:break-all;">' + escapeHtml(info.fileName) + '</div>' +
        '<div class="mnrec-hint">' +
          escapeHtml((info.resolution ? info.resolution + ' • ' : '') + formatBytes(info.sizeBytes) + (info.path ? ' • ' + info.path : '')) +
        '</div>' +
        '<div class="mnrec-row">' +
          (info.path && isNativeHost()
            ? '<button class="mnrec-btn primary sm" data-act="play">▶ Phát</button>' +
              '<button class="mnrec-btn sm" data-act="reveal">📁 Thư mục</button>'
            : '') +
          '<button class="mnrec-btn sm" data-act="settings">⚙ Cài đặt</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);
    activeToastCard = wrap;

    const dismiss = function () {
      if (activeToastTimer) clearTimeout(activeToastTimer);
      activeToastTimer = null;
      if (activeToastCard === wrap) activeToastCard = null;
      wrap.remove();
    };

    wrap.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'close') dismiss();
      else if (act === 'play' && info.path) callHost('REC_OPEN_FILE', { path: info.path }).catch(function () {});
      else if (act === 'reveal' && info.path) callHost('REC_REVEAL_FILE', { path: info.path }).catch(function () {});
      else if (act === 'settings') {
        dismiss();
        openSettingsModal('storage');
      }
    });

    const startTimer = function () {
      activeToastTimer = setTimeout(dismiss, 11000);
    };
    wrap.addEventListener('mouseenter', function () {
      if (activeToastTimer) clearTimeout(activeToastTimer);
    });
    wrap.addEventListener('mouseleave', startTimer);
    startTimer();
  }

  // --------------------------------------------------------------------------
  // Dedicated Storage & Quality Settings Modal (Zero-Jitter Shell + In-Place Patch)
  // --------------------------------------------------------------------------
  let settingsModalEl = null;

  async function openSettingsModal(initialTab, onChanged) {
    if (settingsModalEl) {
      settingsModalEl.remove();
      settingsModalEl = null;
    }

    let draft = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
    let videos = cachedVideos.slice();
    let activeTab = initialTab || 'storage';
    let audioDevices = [];
    let closed = false;

    // Build modal shell ONCE (prevents backdrop blur/animation replay & vertical jitter!)
    const root = document.createElement('div');
    root.className = 'mnrec-root';
    root.innerHTML =
      '<div class="mnrec-backdrop" data-act="backdrop">' +
        '<div class="mnrec-dialog settings-dialog" role="dialog" aria-modal="true">' +
          '<div class="mnrec-dialog-head">' +
            '<div class="mnrec-dialog-title">' +
              '<span class="mnrec-dialog-icon">' + SVG.video + '</span>' +
              '<span>Cài đặt Quay Màn Hình</span>' +
            '</div>' +
            '<button class="mnrec-close-btn" data-act="close" title="Đóng (Esc)">✕</button>' +
          '</div>' +
          '<div class="mnrec-tabs">' +
            '<button type="button" class="mnrec-tab" data-tab="storage">Lưu trữ</button>' +
            '<button type="button" class="mnrec-tab" data-tab="quality">Chất lượng &amp; Âm thanh</button>' +
            '<button type="button" class="mnrec-tab" data-tab="library"><span>Video đã lưu (<span data-vid-count>' + videos.length + '</span>)</span></button>' +
          '</div>' +
          '<div class="mnrec-dialog-body" id="mnrec-settings-body"></div>' +
          '<div class="mnrec-dialog-foot">' +
            '<span class="mnrec-hint">' + (useNativeRecorder() ? 'Quay trực tiếp H.264 • Ẩn khung &amp; thanh điều khiển khỏi video.' : 'Chế độ quay trình duyệt web.') + '</span>' +
            '<div class="mnrec-row">' +
              '<button class="mnrec-btn" data-act="close">Đóng</button>' +
              '<button class="mnrec-btn primary" data-act="save">Lưu cài đặt</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);
    settingsModalEl = root;

    const bodyEl = root.querySelector('#mnrec-settings-body');
    const vidCountEl = root.querySelector('[data-vid-count]');

    function closeModal() {
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      root.remove();
      if (settingsModalEl === root) settingsModalEl = null;
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeModal();
      }
    }
    document.addEventListener('keydown', onKey, true);

    function syncTabBar() {
      root.querySelectorAll('.mnrec-tab[data-tab]').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
      });
      if (vidCountEl) vidCountEl.textContent = String(videos.length);
    }

    function syncInPlaceSelections() {
      // Update all cards/switches in place with ZERO innerHTML rebuild -> 0ms flicker!
      bodyEl.querySelectorAll('.mnrec-card[data-set]').forEach(function (card) {
        const key = card.getAttribute('data-set');
        const val = card.getAttribute('data-val');
        const isOn = key === 'fps' ? (Number(draft[key]) === Number(val)) : (String(draft[key]) === String(val));
        card.classList.toggle('on', isOn);
        const selBadge = card.querySelector('[data-selected-badge]');
        if (selBadge) selBadge.style.display = isOn ? '' : 'none';
      });
      const micSwitch = bodyEl.querySelector('[data-switch="mic"]');
      if (micSwitch) micSwitch.classList.toggle('on', !!draft.mic);
      const curSwitch = bodyEl.querySelector('[data-switch="showCursor"]');
      if (curSwitch) curSwitch.classList.toggle('on', !!draft.showCursor);
      const prevEl = bodyEl.querySelector('[data-preview-file]');
      if (prevEl) {
        const fmt = useNativeRecorder() ? 'mp4' : draft.format;
        prevEl.textContent = 'Ví dụ: ' + buildSuggestedName(draft.filePrefix, '') + '.' + fmt;
      }
      const folderEl = bodyEl.querySelector('[data-folder-text]');
      if (folderEl) {
        const txt = draft.folder || (isNativeHost() ? 'Videos\\MinNote' : 'Trình duyệt web (Tải về mặc định)');
        folderEl.textContent = txt;
        folderEl.title = txt;
      }
    }

    function renderTabBody() {
      if (closed) return;
      syncTabBar();
      const fmt = useNativeRecorder() ? 'mp4' : draft.format;
      const previewFile = buildSuggestedName(draft.filePrefix, '') + '.' + fmt;

      if (activeTab === 'storage') {
        bodyEl.innerHTML =
          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Thư mục lưu video mặc định</span></div>' +
            '<div class="mnrec-folder-box">' +
              '<span class="mnrec-folder-path" data-folder-text title="' + escapeHtml(draft.folder || 'Videos\\MinNote') + '">' +
                escapeHtml(draft.folder || (isNativeHost() ? 'Videos\\MinNote' : 'Trình duyệt web (Tải về mặc định)')) +
              '</span>' +
              (isNativeHost()
                ? '<button class="mnrec-btn sm primary" data-act="choose-folder">Chọn...</button>' +
                  '<button class="mnrec-btn sm" data-act="open-folder">Mở</button>'
                : '') +
            '</div>' +
            '<div class="mnrec-hint">Video được lưu trực tiếp xuống ổ đĩa máy tính.</div>' +
          '</div>' +

          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Hành động sau khi dừng quay</span></div>' +
            '<div class="mnrec-cards cols-2">' +
              '<button type="button" class="mnrec-card' + (draft.saveMode === 'panel' ? ' on' : '') + '" data-set="saveMode" data-val="panel">' +
                '<div class="mnrec-card-title"><span>Xem trước &amp; lưu</span><span class="mnrec-badge-pill" data-selected-badge style="' + (draft.saveMode === 'panel' ? '' : 'display:none') + '">Đang chọn</span></div>' +
                '<div class="mnrec-card-sub">Xem lại ngay, đổi tên file, đổi thư mục hoặc hủy.</div>' +
              '</button>' +
              '<button type="button" class="mnrec-card' + (draft.saveMode === 'auto' ? ' on' : '') + '" data-set="saveMode" data-val="auto">' +
                '<div class="mnrec-card-title"><span>Tự động lưu ngay</span><span class="mnrec-badge-pill" data-selected-badge style="' + (draft.saveMode === 'auto' ? '' : 'display:none') + '">Đang chọn</span></div>' +
                '<div class="mnrec-card-sub">Lưu thẳng vào thư mục đã chọn khi bấm Dừng.</div>' +
              '</button>' +
            '</div>' +
          '</div>' +

          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Tiền tố tên tệp video</span><span class="mnrec-hint" data-preview-file>Ví dụ: ' + escapeHtml(previewFile) + '</span></div>' +
            '<input class="mnrec-input" id="mnrec-prefix-input" type="text" value="' + escapeHtml(draft.filePrefix) + '" placeholder="MinNote hoặc {title}" />' +
            '<div class="mnrec-hint">Gõ <code>{title}</code> để tự lấy tên sổ ghi chú hiện tại.</div>' +
          '</div>';

        const prefixInput = bodyEl.querySelector('#mnrec-prefix-input');
        if (prefixInput) {
          prefixInput.addEventListener('input', function () {
            draft.filePrefix = prefixInput.value;
            const prevEl = bodyEl.querySelector('[data-preview-file]');
            if (prevEl) prevEl.textContent = 'Ví dụ: ' + buildSuggestedName(draft.filePrefix, '') + '.' + fmt;
          });
        }
      } else if (activeTab === 'quality') {
        const nativeMode = useNativeRecorder();
        bodyEl.innerHTML =
          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Mức chất lượng hình ảnh</span></div>' +
            '<div class="mnrec-cards">' +
              ['ultra', 'high', 'standard'].map(function (key) {
                const p = QUALITY_PRESETS[key];
                const isOn = draft.quality === key;
                return '<button type="button" class="mnrec-card' + (isOn ? ' on' : '') + '" data-set="quality" data-val="' + key + '">' +
                  '<div class="mnrec-card-title"><span>' + p.label + '</span>' + (key === 'ultra' ? '<span class="mnrec-badge-pill">Khuyên dùng</span>' : '') + '</div>' +
                  '<div class="mnrec-card-sub">' + p.desc + '</div>' +
                '</button>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="mnrec-row" style="gap:14px;">' +
            '<div class="mnrec-section" style="flex:1;min-width:200px;">' +
              '<div class="mnrec-label"><span>Tốc độ khung hình (FPS)</span></div>' +
              '<div class="mnrec-cards cols-2">' +
                '<button type="button" class="mnrec-card' + (draft.fps === 60 ? ' on' : '') + '" data-set="fps" data-val="60">' +
                  '<div class="mnrec-card-title">60 FPS</div>' +
                  '<div class="mnrec-card-sub">Siêu mượt</div>' +
                '</button>' +
                '<button type="button" class="mnrec-card' + (draft.fps === 30 ? ' on' : '') + '" data-set="fps" data-val="30">' +
                  '<div class="mnrec-card-title">30 FPS</div>' +
                  '<div class="mnrec-card-sub">Nhẹ dung lượng</div>' +
                '</button>' +
              '</div>' +
            '</div>' +

            '<div class="mnrec-section" style="flex:1;min-width:200px;">' +
              '<div class="mnrec-label"><span>Định dạng đầu ra</span></div>' +
              (nativeMode
                ? '<div class="mnrec-cards" style="grid-template-columns:1fr;">' +
                    '<div class="mnrec-card on" style="cursor:default;">' +
                      '<div class="mnrec-card-title"><span>MP4 (H.264 phần cứng)</span><span class="mnrec-badge-pill">Mặc định</span></div>' +
                      '<div class="mnrec-card-sub">Tương thích PowerPoint, Zalo, YouTube</div>' +
                    '</div>' +
                  '</div>'
                : '<div class="mnrec-cards cols-2">' +
                    '<button type="button" class="mnrec-card' + (draft.format === 'mp4' ? ' on' : '') + '" data-set="format" data-val="mp4">' +
                      '<div class="mnrec-card-title">MP4 (H.264)</div>' +
                      '<div class="mnrec-card-sub">Phổ biến nhất</div>' +
                    '</button>' +
                    '<button type="button" class="mnrec-card' + (draft.format === 'webm' ? ' on' : '') + '" data-set="format" data-val="webm">' +
                      '<div class="mnrec-card-title">WebM (VP9)</div>' +
                      '<div class="mnrec-card-sub">Nén cao</div>' +
                    '</button>' +
                  '</div>') +
            '</div>' +
          '</div>' +

          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Âm thanh &amp; Con trỏ chuột</span></div>' +
            '<div class="mnrec-toggle-row">' +
              '<div><div style="font-size:12.5px;font-weight:600;">Thu tiếng từ micro (AAC 192 kbps)</div>' +
              '<div class="mnrec-hint">Ghi âm giọng giảng đồng bộ cùng hình ảnh.</div></div>' +
              '<label class="mnrec-switch' + (draft.mic ? ' on' : '') + '" data-switch="mic"><input type="checkbox" id="mnrec-opt-mic"' + (draft.mic ? ' checked' : '') + ' /><span class="mnrec-track"></span></label>' +
            '</div>' +
            (!nativeMode && audioDevices.length > 0
              ? '<div class="mnrec-row"><span style="font-size:12px;font-weight:600;min-width:100px;">Thiết bị micro:</span>' +
                '<select class="mnrec-select-box" id="mnrec-opt-micdev" style="flex:1;">' +
                  '<option value="">Mặc định của Windows</option>' +
                  audioDevices.map(function (d, idx) {
                    const lbl = d.label || ('Micro #' + (idx + 1));
                    return '<option value="' + escapeHtml(d.deviceId) + '"' + (draft.micDeviceId === d.deviceId ? ' selected' : '') + '>' + escapeHtml(lbl) + '</option>';
                  }).join('') +
                '</select></div>'
              : '') +
            '<div class="mnrec-toggle-row">' +
              '<div><div style="font-size:12.5px;font-weight:600;">Hiển thị con trỏ chuột trong video</div>' +
              '<div class="mnrec-hint">Hiển thị vị trí chỉ bút/chuột trên bảng viết.</div></div>' +
              '<label class="mnrec-switch' + (draft.showCursor ? ' on' : '') + '" data-switch="showCursor"><input type="checkbox" id="mnrec-opt-cursor"' + (draft.showCursor ? ' checked' : '') + ' /><span class="mnrec-track"></span></label>' +
            '</div>' +
          '</div>';

        const micChk = bodyEl.querySelector('#mnrec-opt-mic');
        if (micChk) {
          micChk.addEventListener('change', function () {
            draft.mic = !!micChk.checked;
            syncInPlaceSelections();
          });
        }
        const micDev = bodyEl.querySelector('#mnrec-opt-micdev');
        if (micDev) {
          micDev.addEventListener('change', function () {
            draft.micDeviceId = micDev.value;
          });
        }
        const curChk = bodyEl.querySelector('#mnrec-opt-cursor');
        if (curChk) {
          curChk.addEventListener('change', function () {
            draft.showCursor = !!curChk.checked;
            syncInPlaceSelections();
          });
        }
      } else {
        // Tab: library
        bodyEl.innerHTML =
          '<div class="mnrec-section">' +
            '<div class="mnrec-row" style="justify-content:space-between;">' +
              '<div class="mnrec-hint" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Thư mục: <b>' + escapeHtml(draft.folder || 'Chưa thiết lập') + '</b></div>' +
              '<div class="mnrec-row">' +
                '<button class="mnrec-btn sm" data-act="refresh-videos">↻ Làm mới</button>' +
                (isNativeHost() ? '<button class="mnrec-btn sm" data-act="open-folder">📁 Mở</button>' : '') +
              '</div>' +
            '</div>' +
            (videos.length === 0
              ? '<div class="mnrec-empty">Chưa có video nào trong thư mục lưu trữ này.</div>'
              : '<div class="mnrec-video-list">' +
                  videos.map(function (v) {
                    return '<div class="mnrec-video-item">' +
                      '<div class="mnrec-video-meta">' +
                        '<div class="mnrec-video-name" title="' + escapeHtml(v.path) + '">' + escapeHtml(v.name) + '</div>' +
                        '<div class="mnrec-video-sub">' + formatBytes(v.sizeBytes) + ' • ' + formatDateTime(v.modifiedMs) + ' • ' + escapeHtml((v.ext || 'mp4').toUpperCase()) + '</div>' +
                      '</div>' +
                      '<div class="mnrec-row" style="flex-wrap:nowrap;">' +
                        '<button class="mnrec-btn sm primary" data-act="play-video" data-path="' + escapeHtml(v.path) + '">▶</button>' +
                        '<button class="mnrec-btn sm" data-act="reveal-video" data-path="' + escapeHtml(v.path) + '" title="Hiển thị trong thư mục">📁</button>' +
                        '<button class="mnrec-btn sm danger-ghost" data-act="delete-video" data-path="' + escapeHtml(v.path) + '" title="Xóa video">✕</button>' +
                      '</div>' +
                    '</div>';
                  }).join('') +
                '</div>') +
          '</div>';
      }
    }

    root.addEventListener('click', async function (e) {
      if (e.target.getAttribute('data-act') === 'backdrop') {
        closeModal();
        return;
      }
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        const nextTab = tabBtn.getAttribute('data-tab');
        if (nextTab === activeTab) return;
        activeTab = nextTab;
        // Render immediately from cache for 0ms latency, then silently refresh library
        renderTabBody();
        if (activeTab === 'library' && isNativeHost()) {
          callHost('REC_LIST_VIDEOS', { folder: draft.folder }).then(function (r) {
            if (!closed && activeTab === 'library' && r && Array.isArray(r.videos)) {
              videos = r.videos;
              cachedVideos = r.videos;
              renderTabBody();
            }
          }).catch(function () {});
        }
        return;
      }
      const setBtn = e.target.closest('[data-set]');
      if (setBtn) {
        const key = setBtn.getAttribute('data-set');
        const val = setBtn.getAttribute('data-val');
        draft[key] = key === 'fps' ? Number(val) : val;
        // Pure in-place toggle -> ZERO DOM rebuild, ZERO jitter!
        syncInPlaceSelections();
        return;
      }
      const actBtn = e.target.closest('[data-act]');
      if (!actBtn) return;
      const act = actBtn.getAttribute('data-act');

      if (act === 'close') {
        closeModal();
      } else if (act === 'save') {
        const saved = await persistSettings(draft);
        if (typeof onChanged === 'function') onChanged(saved);
        if (typeof window.showToast === 'function') {
          window.showToast('Đã lưu cài đặt quay màn hình!', 'success');
        }
        closeModal();
      } else if (act === 'choose-folder' && isNativeHost()) {
        try {
          const r = await callHost('REC_CHOOSE_FOLDER', {}, 120000);
          if (r && r.folder) {
            draft.folder = r.folder;
            cachedSettings.folder = r.folder;
            saveLocalSettings(cachedSettings);
            if (Array.isArray(r.videos)) {
              videos = r.videos;
              cachedVideos = r.videos;
            }
            if (typeof onChanged === 'function') onChanged(cachedSettings);
            syncTabBar();
            syncInPlaceSelections();
          }
        } catch (err) {
          console.error('[MinNoteRec] choose folder err:', err);
        }
      } else if (act === 'open-folder' && isNativeHost()) {
        callHost('REC_OPEN_FOLDER', { folder: draft.folder }).catch(function () {});
      } else if (act === 'refresh-videos' && isNativeHost()) {
        try {
          const r = await callHost('REC_LIST_VIDEOS', { folder: draft.folder });
          if (r && Array.isArray(r.videos)) {
            videos = r.videos;
            cachedVideos = r.videos;
            renderTabBody();
          }
        } catch (_) {}
      } else if (act === 'play-video') {
        const p = actBtn.getAttribute('data-path');
        if (p) callHost('REC_OPEN_FILE', { path: p }).catch(function () {});
      } else if (act === 'reveal-video') {
        const p = actBtn.getAttribute('data-path');
        if (p) callHost('REC_REVEAL_FILE', { path: p }).catch(function () {});
      } else if (act === 'delete-video') {
        const p = actBtn.getAttribute('data-path');
        if (!p) return;
        try {
          const r = await callHost('REC_DELETE_VIDEO', { path: p });
          if (r && Array.isArray(r.videos)) {
            videos = r.videos;
            cachedVideos = r.videos;
            renderTabBody();
          }
        } catch (_) {}
      }
    });

    // Initial instant render from cache
    renderTabBody();

    // Background sync from host (only patch changed fields in place — zero flicker!)
    syncSettingsFromHost().then(function () {
      if (closed) return;
      draft = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
      videos = cachedVideos.slice();
      syncTabBar();
      if (activeTab === 'library') renderTabBody();
      else syncInPlaceSelections();
    });

    if (!useNativeRecorder()) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devs = await navigator.mediaDevices.enumerateDevices();
          audioDevices = devs.filter(function (d) { return d.kind === 'audioinput'; });
          if (!closed && activeTab === 'quality') renderTabBody();
        }
      } catch (_) {}
    }
  }

  // --------------------------------------------------------------------------
  // Post-Recording Preview & Save Modal (Supports Native Disk Temp + Web Blob)
  // --------------------------------------------------------------------------
  function openPostRecordSaveModal(opts) {
    // opts: { tempPath?, previewUrl?, blob?, sizeBytes?, ext, durationMs, suggestedName, docName, fps, expectedRes, notify, onDone }
    const isNativeFile = !!(opts.tempPath && isNativeHost());
    const blob = opts.blob || null;
    const ext = opts.ext || 'mp4';
    const previewUrl = opts.previewUrl || (blob ? URL.createObjectURL(blob) : '');
    const ownsObjectUrl = !opts.previewUrl && !!blob;
    const fileSizeBytes = opts.sizeBytes || (blob ? blob.size : 0);

    let fileName = opts.suggestedName || buildSuggestedName(cachedSettings.filePrefix, opts.docName);
    let folder = cachedSettings.folder || '';
    let saving = false;
    let progress = 0;
    let savedResult = null;
    let errorMsg = '';
    let videoRes = opts.expectedRes || '';

    const root = document.createElement('div');
    root.className = 'mnrec-root';
    root.innerHTML =
      '<div class="mnrec-backdrop">' +
        '<div class="mnrec-dialog save-dialog" role="dialog" aria-modal="true">' +
          '<div class="mnrec-dialog-head">' +
            '<div class="mnrec-dialog-title">' +
              '<span class="mnrec-dialog-icon">' + SVG.video + '</span>' +
              '<span>Xem Trước &amp; Lưu Video</span>' +
            '</div>' +
            '<button class="mnrec-close-btn" id="mnrec-save-close" data-act="discard" title="Đóng">✕</button>' +
          '</div>' +
          '<div class="mnrec-dialog-body">' +
            '<div class="mnrec-preview-wrap">' +
              '<video class="mnrec-preview-video" src="' + escapeHtml(previewUrl) + '" controls playsinline preload="metadata"></video>' +
            '</div>' +
            '<div class="mnrec-meta-chips">' +
              '<span class="mnrec-chip" data-res-chip>📐 ' + escapeHtml(videoRes || 'Đang đọc...') + '</span>' +
              '<span class="mnrec-chip">⏱ ' + formatTime(opts.durationMs || 0) + '</span>' +
              '<span class="mnrec-chip">🎞 ' + (opts.fps || cachedSettings.fps || 60) + ' FPS</span>' +
              '<span class="mnrec-chip">📦 ' + formatBytes(fileSizeBytes) + '</span>' +
              '<span class="mnrec-chip">' + escapeHtml(ext.toUpperCase()) + '</span>' +
            '</div>' +
            '<div id="mnrec-save-zone"></div>' +
          '</div>' +
          '<div class="mnrec-dialog-foot" id="mnrec-save-foot"></div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    const vid = root.querySelector('.mnrec-preview-video');
    const zoneEl = root.querySelector('#mnrec-save-zone');
    const footEl = root.querySelector('#mnrec-save-foot');
    const closeBtn = root.querySelector('#mnrec-save-close');

    if (vid) {
      vid.addEventListener('loadedmetadata', function () {
        if (vid.videoWidth && vid.videoHeight) {
          videoRes = vid.videoWidth + ' × ' + vid.videoHeight;
          const chip = root.querySelector('[data-res-chip]');
          if (chip) chip.textContent = '📐 ' + videoRes;
        }
      });
    }

    function releaseVideoAndClose(discardTemp) {
      document.removeEventListener('keydown', onKey, true);
      if (vid) {
        try {
          vid.pause();
          vid.removeAttribute('src');
          vid.load();
        } catch (_) {}
      }
      if (ownsObjectUrl && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (_) {}
      }
      if (isNativeFile && opts.tempPath && (discardTemp || savedResult)) {
        // Safely removes leftover temp copy if File.Move fell back to File.Copy
        callHost('REC_NATIVE_DISCARD', { tempPath: opts.tempPath }, 10000).catch(function () {});
      }
      root.remove();
      if (typeof opts.onDone === 'function') opts.onDone(savedResult);
    }

    function onKey(e) {
      if (e.key === 'Escape' && !saving) {
        e.stopPropagation();
        if (savedResult) releaseVideoAndClose(false);
      }
    }
    document.addEventListener('keydown', onKey, true);

    function renderActionZone() {
      if (closeBtn) {
        closeBtn.setAttribute('data-act', savedResult ? 'done' : 'discard');
        closeBtn.disabled = saving;
      }

      if (savedResult) {
        zoneEl.innerHTML =
          '<div class="mnrec-saved-banner">' +
            '<div style="font-size:13.5px;font-weight:700;color:var(--mnrec-success);">✓ Đã lưu video thành công!</div>' +
            '<div class="mnrec-folder-path" style="white-space:normal;word-break:break-all;">' + escapeHtml(savedResult.path || savedResult.fileName) + '</div>' +
            '<div class="mnrec-row">' +
              (savedResult.path && isNativeHost()
                ? '<button class="mnrec-btn primary sm" data-act="play">▶ Phát video</button>' +
                  '<button class="mnrec-btn sm" data-act="reveal">📁 Mở thư mục</button>'
                : '') +
            '</div>' +
          '</div>';
        footEl.innerHTML =
          '<button class="mnrec-btn" data-act="open-settings">⚙ Cài đặt</button>' +
          '<button class="mnrec-btn primary" data-act="done">Hoàn tất</button>';
        return;
      }

      let html =
        '<div class="mnrec-section">' +
          '<div class="mnrec-label"><span>Tên tệp video</span></div>' +
          '<div class="mnrec-row">' +
            '<input class="mnrec-input" id="mnrec-save-name" style="flex:1;" type="text" value="' + escapeHtml(fileName) + '" ' + (saving ? 'disabled' : '') + ' />' +
            '<span class="mnrec-chip">.' + escapeHtml(ext) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="mnrec-section" style="margin-top:10px;">' +
          '<div class="mnrec-label"><span>Thư mục lưu trữ</span></div>' +
          '<div class="mnrec-folder-box">' +
            '<span class="mnrec-folder-path" title="' + escapeHtml(folder) + '">' + escapeHtml(folder || 'Videos\\MinNote') + '</span>' +
            (isNativeHost()
              ? '<button class="mnrec-btn sm" data-act="change-folder" ' + (saving ? 'disabled' : '') + '>Đổi...</button>'
              : '') +
          '</div>' +
        '</div>';

      if (saving) {
        html +=
          '<div class="mnrec-section" style="margin-top:10px;">' +
            '<div class="mnrec-label"><span>Đang lưu video...</span><span data-pct>' + progress + '%</span></div>' +
            '<div class="mnrec-progress-bar"><div class="mnrec-progress-fill" style="width:' + progress + '%;"></div></div>' +
          '</div>';
      }
      if (errorMsg) {
        html += '<div style="color:var(--mnrec-danger);font-size:12px;font-weight:600;margin-top:8px;">⚠ ' + escapeHtml(errorMsg) + '</div>';
      }

      zoneEl.innerHTML = html;
      footEl.innerHTML =
        '<button class="mnrec-btn danger-ghost" data-act="discard" ' + (saving ? 'disabled' : '') + '>Hủy bỏ</button>' +
        '<div class="mnrec-row">' +
          (isNativeHost() ? '<button class="mnrec-btn" data-act="save-as" ' + (saving ? 'disabled' : '') + '>Lưu nơi khác...</button>' : '') +
          '<button class="mnrec-btn primary" data-act="save-now" ' + (saving ? 'disabled' : '') + '>' + (saving ? 'Đang lưu...' : 'Lưu video') + '</button>' +
        '</div>';

      const nameInput = zoneEl.querySelector('#mnrec-save-name');
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          fileName = nameInput.value;
        });
      }
    }

    async function doSave(explicitFullPath) {
      if (saving) return;
      saving = true;
      errorMsg = '';
      progress = 20;
      renderActionZone();
      try {
        if (isNativeFile) {
          const res = await callHost('REC_NATIVE_COMMIT', {
            tempPath: opts.tempPath,
            fullPath: explicitFullPath || '',
            folder: folder,
            fileName: fileName
          }, 30000);
          if (res && Array.isArray(res.videos)) cachedVideos = res.videos;
          savedResult = res;
          if (typeof opts.notify === 'function') {
            opts.notify('Đã lưu video: ' + (res.fileName || (fileName + '.' + ext)));
          }
        } else if (isNativeHost() && blob) {
          const res = await writeBlobNatively(blob, {
            fullPath: explicitFullPath || '',
            folder: folder,
            fileName: fileName,
            ext: ext
          }, function (pct) {
            progress = pct;
            const fill = zoneEl.querySelector('.mnrec-progress-fill');
            const pctTxt = zoneEl.querySelector('[data-pct]');
            if (fill) fill.style.width = pct + '%';
            if (pctTxt) pctTxt.textContent = pct + '%';
          });
          savedResult = res;
          if (typeof opts.notify === 'function') {
            opts.notify('Đã lưu video: ' + (res.fileName || (fileName + '.' + ext)));
          }
        } else if (blob) {
          const finalName = fileName.replace(/[\\/:*?"<>|]/g, '_') + '.' + ext;
          fallbackBrowserSave(blob, finalName);
          savedResult = { fileName: finalName, path: '', sizeBytes: blob.size };
        }
      } catch (err) {
        errorMsg = String((err && err.message) || err || 'Lỗi lưu video.');
      } finally {
        saving = false;
        renderActionZone();
      }
    }

    root.addEventListener('click', async function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn || saving) return;
      const act = btn.getAttribute('data-act');
      if (act === 'done') {
        releaseVideoAndClose(false);
      } else if (act === 'discard') {
        releaseVideoAndClose(true);
      } else if (act === 'save-now') {
        await doSave('');
      } else if (act === 'save-as' && isNativeHost()) {
        try {
          const picked = await callHost('REC_PICK_SAVE_PATH', { fileName: fileName, ext: ext }, 120000);
          if (picked && picked.path) {
            await doSave(picked.path);
          }
        } catch (err) {
          errorMsg = String((err && err.message) || err);
          renderActionZone();
        }
      } else if (act === 'change-folder' && isNativeHost()) {
        try {
          const r = await callHost('REC_CHOOSE_FOLDER', {}, 120000);
          if (r && r.folder) {
            folder = r.folder;
            cachedSettings.folder = r.folder;
            saveLocalSettings(cachedSettings);
            renderActionZone();
          }
        } catch (_) {}
      } else if (act === 'play' && savedResult && savedResult.path) {
        callHost('REC_OPEN_FILE', { path: savedResult.path }).catch(function () {});
      } else if (act === 'reveal' && savedResult && savedResult.path) {
        callHost('REC_REVEAL_FILE', { path: savedResult.path }).catch(function () {});
      } else if (act === 'open-settings') {
        openSettingsModal('storage');
      }
    });

    renderActionZone();
  }

  // --------------------------------------------------------------------------
  // Main Screen Recorder Controller (Zero-Jitter Setup + Native C# Capture)
  // --------------------------------------------------------------------------
  function mountRecorder(hostEl, props) {
    const onClose = props.onClose || function () {};
    const notify = props.notify || function (m) { if (window.showToast) window.showToast(m); };
    const remember = props.remember || function () {};
    const saved = props.saved || {};
    const stopRef = props.stopRef;
    const fixMp4 = props.fixMp4;
    const docName = props.name || '';

    let rect = clampRect(
      saved && saved.w
        ? { x: saved.x * window.innerWidth, y: saved.y * window.innerHeight, w: saved.w * window.innerWidth, h: saved.h * window.innerHeight }
        : safePageRect(props.pageRect)
    );
    const liveRectRef = { current: rect };

    let phase = 'select'; // 'select' | 'starting' | 'rec' | 'saving'
    let paused = false;
    let elapsedMs = 0;
    let micOn = cachedSettings.mic !== undefined ? !!cachedSettings.mic : (saved.mic !== undefined ? !!saved.mic : true);
    let minimized = !!saved.mini;
    let barPos = (saved.barX !== undefined && saved.barY !== undefined) ? { x: saved.barX, y: saved.barY } : null;

    let dragState = null;
    let barDragState = null;
    let activeRec = null;
    let cropTargetEl = null;
    let destroyed = false;
    let nativeEventUnsub = null;
    let setupDomBuilt = false;

    const root = document.createElement('div');
    root.className = 'mnrec-root';
    document.body.appendChild(root);

    // Sync settings from C# host quietly (only patches button state in place, ZERO DOM rebuild!)
    syncSettingsFromHost().then(function (res) {
      if (destroyed) return;
      if (res && res.settings && phase === 'select') {
        micOn = !!res.settings.mic;
        syncSetupUI();
      }
    });

    function syncStopRef() {
      if (!stopRef) return;
      if (phase === 'rec') {
        stopRef.current = function () { if (activeRec) activeRec.stop(); };
      } else if (phase === 'select') {
        stopRef.current = onClose;
      } else {
        stopRef.current = null;
      }
    }

    function onWindowResize() {
      if (destroyed) return;
      if (phase === 'select') {
        rect = clampRect(rect);
        liveRectRef.current = rect;
        syncSetupUI();
      } else if (phase === 'rec' && !useNativeRecorder()) {
        const clamped = clampRect(liveRectRef.current);
        liveRectRef.current = clamped;
        rect = clamped;
        updateCropTargetStyle(clamped);
        renderWebLive();
      }
    }
    window.addEventListener('resize', onWindowResize);

    function onKeyDown(e) {
      if (phase === 'select' && e.key === 'Escape' && !settingsModalEl) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);

    function ensureCropTarget(r) {
      if (!cropTargetEl) {
        cropTargetEl = document.createElement('div');
        cropTargetEl.className = 'mnrec-crop-target';
        document.body.appendChild(cropTargetEl);
      }
      updateCropTargetStyle(r);
      return cropTargetEl;
    }

    function updateCropTargetStyle(r) {
      if (!cropTargetEl) return;
      cropTargetEl.style.left = r.x + 'px';
      cropTargetEl.style.top = r.y + 'px';
      cropTargetEl.style.width = r.w + 'px';
      cropTargetEl.style.height = r.h + 'px';
    }

    function removeCropTarget() {
      if (cropTargetEl) {
        cropTargetEl.remove();
        cropTargetEl = null;
      }
    }

    function getBarAnchor(r) {
      const top = r.y >= 56
        ? r.y - 52
        : (r.y + r.h + 56 <= window.innerHeight ? r.y + r.h + 10 : r.y + 10);
      return { left: Math.round(window.innerWidth / 2), top: Math.round(top) };
    }

    // ------------------------------------------------------------------------
    // Persistent Zero-Jitter Icon-Only Setup Overlay
    // ------------------------------------------------------------------------
    function buildSetupDom() {
      setupDomBuilt = true;
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      root.innerHTML =
        '<div class="mnrec-select" id="mnrec-select-overlay">' +
          '<div class="mnrec-area" id="mnrec-area">' +
            '<span class="mnrec-size" id="mnrec-size"></span>' +
            handles.map(function (h) {
              return '<span class="mnrec-handle ' + h + '" data-handle="' + h + '"></span>';
            }).join('') +
          '</div>' +
          '<div class="mnrec-bar" id="mnrec-setup-bar">' +
            '<div class="mnrec-seg">' +
              '<button type="button" class="mnrec-ico-btn" data-act="preset-page" title="Vùng trang viết" aria-label="Vùng trang viết">' + SVG.region + '</button>' +
              '<button type="button" class="mnrec-ico-btn" data-act="preset-whole" title="Cả cửa sổ" aria-label="Cả cửa sổ">' + SVG.whole + '</button>' +
            '</div>' +
            '<span class="mnrec-sep"></span>' +
            '<button type="button" class="mnrec-ico-btn" id="mnrec-btn-mic" data-act="toggle-mic" title="Bật/tắt micro" aria-label="Micro">' + SVG.micOn + '</button>' +
            '<button type="button" class="mnrec-ico-btn" id="mnrec-btn-settings" data-act="open-settings" title="Cài đặt quay &amp; lưu trữ" aria-label="Cài đặt">' + SVG.settings + '</button>' +
            '<span class="mnrec-sep"></span>' +
            '<button type="button" class="mnrec-ico-btn cancel" data-act="cancel" title="Hủy (Esc)" aria-label="Hủy">' + SVG.close + '</button>' +
            '<button type="button" class="mnrec-btn-rec" data-act="start" title="Bắt đầu quay" aria-label="Bắt đầu quay"><span class="mnrec-rec-core"></span></button>' +
          '</div>' +
        '</div>';

      const overlay = root.querySelector('#mnrec-select-overlay');
      const bar = root.querySelector('#mnrec-setup-bar');
      if (bar) {
        bar.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      }

      if (overlay) {
        overlay.addEventListener('pointerdown', function (e) {
          if (phase !== 'select') return;
          if (e.target.closest('#mnrec-setup-bar')) return;
          e.preventDefault();
          e.stopPropagation();
          const hEl = e.target.closest('[data-handle]');
          const kind = hEl
            ? hEl.getAttribute('data-handle')
            : (e.target.closest('#mnrec-area') ? 'move' : 'new');
          try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
          dragState = {
            kind: kind,
            sx: e.clientX,
            sy: e.clientY,
            from: kind === 'new' ? { x: e.clientX, y: e.clientY, w: 0, h: 0 } : Object.assign({}, rect)
          };
        });

        overlay.addEventListener('pointermove', function (e) {
          if (!dragState || phase !== 'select') return;
          const dx = e.clientX - dragState.sx;
          const dy = e.clientY - dragState.sy;
          const f = dragState.from;

          if (dragState.kind === 'new') {
            rect = clampRect({
              x: Math.min(dragState.sx, e.clientX),
              y: Math.min(dragState.sy, e.clientY),
              w: Math.abs(dx),
              h: Math.abs(dy)
            });
          } else if (dragState.kind === 'move') {
            rect = clampRect({ x: f.x + dx, y: f.y + dy, w: f.w, h: f.h });
          } else {
            let x = f.x, y = f.y, w = f.w, h = f.h;
            if (dragState.kind.includes('w')) {
              x = Math.min(f.x + dx, f.x + f.w - MIN_BOX);
              w = f.x + f.w - x;
            }
            if (dragState.kind.includes('e')) {
              w = f.w + dx;
            }
            if (dragState.kind.includes('n')) {
              y = Math.min(f.y + dy, f.y + f.h - MIN_BOX);
              h = f.y + f.h - y;
            }
            if (dragState.kind.includes('s')) {
              h = f.h + dy;
            }
            rect = clampRect({ x: x, y: y, w: w, h: h });
          }
          liveRectRef.current = rect;
          syncSetupUI();
        });

        const endDrag = function () {
          if (!dragState) return;
          dragState = null;
          syncSetupUI();
        };
        overlay.addEventListener('pointerup', endDrag);
        overlay.addEventListener('pointercancel', endDrag);
      }

      syncSetupUI();
    }

    function syncSetupUI() {
      if (destroyed || phase !== 'select') return;
      if (!setupDomBuilt) {
        buildSetupDom();
        return;
      }
      const r = rect;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const pr = safePageRect(props.pageRect);
      const wr = wholeWindowRect();
      const isPage = rectsEqual(r, pr);
      const isWhole = rectsEqual(r, wr);
      const anchor = getBarAnchor(r);
      const preset = QUALITY_PRESETS[cachedSettings.quality] || QUALITY_PRESETS.ultra;
      const curFps = cachedSettings.fps === 30 ? 30 : 60;

      const areaEl = root.querySelector('#mnrec-area');
      const sizeEl = root.querySelector('#mnrec-size');
      const barEl = root.querySelector('#mnrec-setup-bar');
      const pageBtn = root.querySelector('[data-act="preset-page"]');
      const wholeBtn = root.querySelector('[data-act="preset-whole"]');
      const micBtn = root.querySelector('#mnrec-btn-mic');
      const setBtn = root.querySelector('#mnrec-btn-settings');

      if (areaEl) {
        areaEl.style.left = r.x + 'px';
        areaEl.style.top = r.y + 'px';
        areaEl.style.width = r.w + 'px';
        areaEl.style.height = r.h + 'px';
        areaEl.classList.toggle('edge-l', r.x < 8);
        areaEl.classList.toggle('edge-t', r.y < 8);
        areaEl.classList.toggle('edge-r', r.x + r.w > window.innerWidth - 8);
        areaEl.classList.toggle('edge-b', r.y + r.h > window.innerHeight - 8);
      }
      if (sizeEl) {
        sizeEl.textContent = even(r.w * dpr) + ' × ' + even(r.h * dpr);
      }
      if (barEl) {
        barEl.style.left = anchor.left + 'px';
        barEl.style.top = anchor.top + 'px';
      }
      if (pageBtn) pageBtn.classList.toggle('on', isPage);
      if (wholeBtn) wholeBtn.classList.toggle('on', isWhole);
      if (micBtn) {
        micBtn.classList.toggle('on', micOn);
        micBtn.classList.toggle('mic-off', !micOn);
        micBtn.innerHTML = micOn ? SVG.micOn : SVG.micOff;
        micBtn.title = micOn ? 'Micro: Đang bật (bấm để tắt)' : 'Micro: Đã tắt (bấm để bật)';
      }
      if (setBtn) {
        setBtn.title = 'Cài đặt quay & lưu trữ (' + preset.label + ' • ' + curFps + 'fps)';
      }
    }

    // ------------------------------------------------------------------------
    // Native C# Screen Recording Flow (ZERO Sharing Bar, Capture-Excluded UI!)
    // ------------------------------------------------------------------------
    async function startNativeRecording(lockedRect, settings) {
      let handledStop = false;

      function cleanupNativeListener() {
        if (nativeEventUnsub) {
          nativeEventUnsub();
          nativeEventUnsub = null;
        }
      }

      function handleNativeStopped(data) {
        if (handledStop) return;
        handledStop = true;
        cleanupNativeListener();
        activeRec = null;
        phase = 'saving';
        syncStopRef();

        if (!data || data.empty) {
          onClose();
          return;
        }

        const resStr = (data.width && data.height) ? (data.width + ' × ' + data.height) : '';
        if (data.saved) {
          if (Array.isArray(data.videos)) cachedVideos = data.videos;
          showSavedNotificationCard({
            fileName: data.fileName || 'MinNote.mp4',
            path: data.path || '',
            sizeBytes: data.sizeBytes || 0,
            resolution: resStr
          });
          onClose();
          return;
        }

        if (data.tempPath && data.previewUrl) {
          openPostRecordSaveModal({
            tempPath: data.tempPath,
            previewUrl: data.previewUrl,
            sizeBytes: data.sizeBytes || 0,
            ext: 'mp4',
            durationMs: data.durationMs || 0,
            suggestedName: data.suggestedName || buildSuggestedName(settings.filePrefix, docName),
            docName: docName,
            fps: data.fps || settings.fps || 60,
            expectedRes: resStr,
            notify: notify,
            onDone: function () {
              onClose();
            }
          });
          return;
        }

        onClose();
      }

      // Completely wipe setup overlay DOM so WebView2 canvas is 100% spotless on frame 0!
      setupDomBuilt = false;
      root.innerHTML = '';
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });

      ensureRpcListener();
      const onNativeEvent = function (evName, data) {
        if (destroyed) return;
        if (evName === 'paused' && data) {
          paused = !!data.paused;
        } else if (evName === 'stopped') {
          handleNativeStopped(data);
        } else if (evName === 'error') {
          cleanupNativeListener();
          activeRec = null;
          notify('Lỗi quay màn hình: ' + ((data && data.error) || 'Không xác định'));
          onClose();
        }
      };
      nativeEventListeners.add(onNativeEvent);
      nativeEventUnsub = function () { nativeEventListeners.delete(onNativeEvent); };

      try {
        await callHost('REC_NATIVE_START', {
          x: lockedRect.x,
          y: lockedRect.y,
          w: lockedRect.w,
          h: lockedRect.h,
          quality: settings.quality || 'ultra',
          fps: settings.fps === 30 ? 30 : 60,
          mic: !!micOn,
          showCursor: settings.showCursor !== false,
          docName: docName
        }, 20000);
      } catch (err) {
        cleanupNativeListener();
        phase = 'select';
        syncStopRef();
        buildSetupDom();
        notify('Không thể bắt đầu quay màn hình: ' + String((err && err.message) || err));
        return;
      }

      activeRec = {
        stop: function () {
          if (handledStop) return;
          callHost('REC_NATIVE_STOP', {}, 25000).then(function (data) {
            if (data && !data.alreadyStopping) {
              handleNativeStopped(data);
            }
          }).catch(function (err) {
            cleanupNativeListener();
            notify('Lỗi dừng quay: ' + String((err && err.message) || err));
            onClose();
          });
        },
        togglePause: function () {
          callHost('REC_NATIVE_PAUSE', {}, 10000).then(function (r) {
            if (r) paused = !!r.paused;
          }).catch(function () {});
        }
      };

      phase = 'rec';
      paused = false;
      elapsedMs = 0;
      syncStopRef();
    }

    // ------------------------------------------------------------------------
    // Web Browser Fallback Live Pill (Icon-Only)
    // ------------------------------------------------------------------------
    function renderWebLive() {
      if (destroyed) return;
      const r = rect;
      if (phase === 'starting') {
        setupDomBuilt = false;
        root.innerHTML = '';
        return;
      }
      if (phase !== 'rec' && phase !== 'saving') return;

      setupDomBuilt = false;
      const anchor = getBarAnchor(r);
      const barStyle = barPos
        ? 'left:' + Math.max(4, Math.min(Math.round(barPos.x * window.innerWidth), window.innerWidth - 160)) + 'px;top:' + Math.max(4, Math.min(Math.round(barPos.y * window.innerHeight), window.innerHeight - 44)) + 'px;'
        : 'left:' + anchor.left + 'px;top:' + anchor.top + 'px;';

      root.innerHTML =
        '<div class="mnrec-live">' +
          '<div class="mnrec-frame' + (paused ? ' paused' : '') + '" style="left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;"></div>' +
          '<div class="mnrec-bar live' + (minimized ? ' mini' : '') + (barPos ? ' moved' : '') + '" id="mnrec-live-bar" style="' + barStyle + '">' +
            (!minimized ? '<span style="opacity:0.5;font-size:11px;margin-right:1px;">⋮⋮</span>' : '') +
            '<span class="mnrec-dot' + (paused ? ' paused' : '') + '"></span>' +
            '<span class="mnrec-time">' + (phase === 'saving' ? '...' : formatTime(elapsedMs)) + '</span>' +
            (phase === 'rec' && !minimized
              ? '<button type="button" class="mnrec-live-ico" data-act="pause" title="' + (paused ? 'Tiếp tục quay' : 'Tạm dừng quay') + '">' + (paused ? SVG.play : SVG.pause) + '</button>' +
                '<button type="button" class="mnrec-live-ico stop" data-act="stop" title="Dừng quay">' + SVG.stop + '</button>' +
                '<button type="button" class="mnrec-live-ico ghost" data-act="mini" title="Thu gọn">' + SVG.mini + '</button>'
              : '') +
          '</div>' +
        '</div>';

      const bar = root.querySelector('#mnrec-live-bar');
      if (bar) {
        bar.addEventListener('pointerdown', function (e) {
          if (e.target.closest('button')) return;
          const br = bar.getBoundingClientRect();
          try { bar.setPointerCapture(e.pointerId); } catch (_) {}
          barDragState = { sx: e.clientX, sy: e.clientY, left: br.left, top: br.top, moved: false };
        });
        bar.addEventListener('pointermove', function (e) {
          if (!barDragState) return;
          const dx = e.clientX - barDragState.sx;
          const dy = e.clientY - barDragState.sy;
          if (!barDragState.moved && Math.hypot(dx, dy) < 5) return;
          barDragState.moved = true;
          const br = bar.getBoundingClientRect();
          const nx = Math.max(4, Math.min(barDragState.left + dx, window.innerWidth - br.width - 4));
          const ny = Math.max(4, Math.min(barDragState.top + dy, window.innerHeight - br.height - 4));
          barPos = { x: nx / window.innerWidth, y: ny / window.innerHeight };
          bar.classList.add('moved');
          bar.style.left = Math.round(nx) + 'px';
          bar.style.top = Math.round(ny) + 'px';
        });
        const endBarDrag = function () {
          if (!barDragState) return;
          const wasMoved = barDragState.moved;
          barDragState = null;
          if (wasMoved && barPos) {
            remember(Object.assign({}, saved, { barX: barPos.x, barY: barPos.y, mini: minimized }));
          } else if (!wasMoved && minimized) {
            minimized = false;
            remember(Object.assign({}, saved, { mini: false }));
            renderWebLive();
          }
        };
        bar.addEventListener('pointerup', endBarDrag);
        bar.addEventListener('pointercancel', endBarDrag);
      }
    }

    async function startWebFallbackRecording(lockedRect, settings) {
      const preset = QUALITY_PRESETS[settings.quality] || QUALITY_PRESETS.ultra;
      const targetFps = settings.fps === 30 ? 30 : 60;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const captureScale = preset.scaleMode === 'standard' ? 1 : (preset.scaleMode === 'high' ? Math.min(dpr, 1.5) : dpr);
      const idealW = even(Math.max(window.innerWidth * captureScale, 640));
      const idealH = even(Math.max(window.innerHeight * captureScale, 360));

      const targetEl = ensureCropTarget(lockedRect);
      renderWebLive();
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });

      const audioCtx = micOn ? new AudioContext() : null;
      let displayStream = null;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: idealW },
            height: { ideal: idealH },
            frameRate: { ideal: targetFps, max: targetFps },
            displaySurface: 'browser',
            cursor: settings.showCursor ? 'always' : 'never'
          },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'exclude'
        });
      } catch (_) {
        if (audioCtx) audioCtx.close().catch(function () {});
        removeCropTarget();
        phase = 'select';
        syncStopRef();
        buildSetupDom();
        notify('Không thể bắt đầu quay màn hình.');
        return;
      }

      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        try { videoTrack.contentHint = 'detail'; } catch (_) {}
      }

      let micStream = null;
      if (micOn) {
        try {
          const audioConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 };
          if (settings.micDeviceId) audioConstraints.deviceId = { ideal: settings.micDeviceId };
          micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        } catch (_) {
          notify('Không mở được micro: video sẽ không có tiếng.');
        }
      }

      let cropPipeline = null;
      let finalVideoStream = null;
      const wholeWin = rectsEqual(lockedRect, wholeWindowRect());

      if (wholeWin) {
        finalVideoStream = new MediaStream([videoTrack]);
      } else {
        let regionCropped = false;
        if (videoTrack && typeof window.CropTarget !== 'undefined' && typeof window.CropTarget.fromElement === 'function' && typeof videoTrack.cropTo === 'function') {
          try {
            const cropTarget = await window.CropTarget.fromElement(targetEl);
            await videoTrack.cropTo(cropTarget);
            regionCropped = true;
          } catch (_) {
            regionCropped = false;
          }
        }
        if (regionCropped) {
          finalVideoStream = new MediaStream([videoTrack]);
        } else {
          cropPipeline = createVideoFrameCropper(displayStream, liveRectRef)
            || await createCanvasCropper(displayStream, liveRectRef, targetFps);
          finalVideoStream = cropPipeline.stream;
        }
      }

      if (micStream && audioCtx) {
        try {
          await audioCtx.resume();
          const dest = audioCtx.createMediaStreamDestination();
          audioCtx.createMediaStreamSource(micStream).connect(dest);
          dest.stream.getAudioTracks().forEach(function (t) { finalVideoStream.addTrack(t); });
        } catch (_) {
          try { audioCtx.close(); } catch (__) {}
        }
      } else if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
      }

      const mimeType = pickMimeType(settings.format);
      const recOpts = { videoBitsPerSecond: preset.videoBps, audioBitsPerSecond: preset.audioBps };
      if (mimeType) recOpts.mimeType = mimeType;

      let recorder;
      try {
        recorder = new MediaRecorder(finalVideoStream, recOpts);
      } catch (_) {
        recorder = new MediaRecorder(finalVideoStream, mimeType ? { mimeType: mimeType } : {});
      }

      const chunks = [];
      recorder.ondataavailable = function (ev) {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      let startTick = Date.now();
      let accMs = 0;
      let cleanedUp = false;

      const timerId = window.setInterval(function () {
        elapsedMs = accMs + (recorder.state === 'recording' ? Date.now() - startTick : 0);
        const timeEl = root.querySelector('.mnrec-time');
        if (timeEl && phase === 'rec') timeEl.textContent = formatTime(elapsedMs);
      }, 200);

      function cleanupStreams() {
        if (cleanedUp) return;
        cleanedUp = true;
        window.clearInterval(timerId);
        if (cropPipeline) try { cropPipeline.stop(); } catch (_) {}
        try { displayStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
        if (micStream) try { micStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
        if (audioCtx) try { audioCtx.close(); } catch (_) {}
        removeCropTarget();
        activeRec = null;
      }

      recorder.onstop = async function () {
        const finalDuration = accMs + (paused ? 0 : Math.max(0, Date.now() - startTick));
        cleanupStreams();
        phase = 'saving';
        syncStopRef();
        renderWebLive();

        const isMp4 = mimeType.startsWith('video/mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        try {
          let outBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
          if (isMp4 && typeof fixMp4 === 'function' && outBlob.size > 0 && outBlob.size <= 350 * 1024 * 1024) {
            try {
              const fixedParts = fixMp4(new Uint8Array(await outBlob.arrayBuffer()));
              if (fixedParts) outBlob = new Blob(fixedParts, { type: outBlob.type });
            } catch (_) {}
          }

          const latestSettings = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
          const suggested = buildSuggestedName(latestSettings.filePrefix, docName);
          const expectedRes = even(lockedRect.w * dpr) + ' × ' + even(lockedRect.h * dpr);

          root.innerHTML = '';
          openPostRecordSaveModal({
            blob: outBlob,
            ext: ext,
            durationMs: finalDuration,
            suggestedName: suggested,
            docName: docName,
            fps: targetFps,
            expectedRes: expectedRes,
            notify: notify,
            onDone: function () { onClose(); }
          });
        } catch (saveErr) {
          notify('Lỗi lưu video: ' + String((saveErr && saveErr.message) || saveErr));
          onClose();
        }
      };

      if (videoTrack) {
        videoTrack.addEventListener('ended', function () {
          if (recorder.state !== 'inactive') recorder.stop();
        });
      }

      activeRec = {
        stop: function () {
          if (recorder.state !== 'inactive') recorder.stop();
        },
        togglePause: function () {
          if (recorder.state === 'recording') {
            recorder.pause();
            accMs += Date.now() - startTick;
            paused = true;
          } else if (recorder.state === 'paused') {
            recorder.resume();
            startTick = Date.now();
            paused = false;
          }
          renderWebLive();
        }
      };

      recorder.start(500);
      phase = 'rec';
      paused = false;
      elapsedMs = 0;
      syncStopRef();
      renderWebLive();
    }

    async function startRecording() {
      if (phase !== 'select') return;
      const lockedRect = clampRect({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      rect = lockedRect;
      liveRectRef.current = lockedRect;
      phase = 'starting';
      syncStopRef();

      remember(Object.assign({}, saved, {
        x: lockedRect.x / window.innerWidth,
        y: lockedRect.y / window.innerHeight,
        w: lockedRect.w / window.innerWidth,
        h: lockedRect.h / window.innerHeight,
        mic: micOn
      }));
      persistSettings({ mic: micOn });

      const settings = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
      if (useNativeRecorder()) {
        await startNativeRecording(lockedRect, settings);
      } else {
        await startWebFallbackRecording(lockedRect, settings);
      }
    }

    // Unified click delegation (ZERO innerHTML rebuild on setup clicks!)
    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'preset-page') {
        rect = safePageRect(props.pageRect);
        liveRectRef.current = rect;
        syncSetupUI();
      } else if (act === 'preset-whole') {
        rect = wholeWindowRect();
        liveRectRef.current = rect;
        syncSetupUI();
      } else if (act === 'toggle-mic') {
        micOn = !micOn;
        persistSettings({ mic: micOn });
        syncSetupUI();
      } else if (act === 'open-settings') {
        openSettingsModal('storage', function (updated) {
          if (updated) micOn = !!updated.mic;
          syncSetupUI();
        });
      } else if (act === 'cancel') {
        onClose();
      } else if (act === 'start') {
        startRecording();
      } else if (act === 'pause') {
        if (activeRec) activeRec.togglePause();
      } else if (act === 'stop') {
        if (activeRec) activeRec.stop();
      } else if (act === 'mini') {
        minimized = true;
        remember(Object.assign({}, saved, { mini: true }));
        renderWebLive();
      }
    });

    syncStopRef();
    buildSetupDom();

    return {
      unmount: function () {
        destroyed = true;
        window.removeEventListener('resize', onWindowResize);
        window.removeEventListener('keydown', onKeyDown);
        if (nativeEventUnsub) {
          nativeEventUnsub();
          nativeEventUnsub = null;
        }
        if (activeRec) {
          try { activeRec.stop(); } catch (_) {}
        }
        removeCropTarget();
        if (stopRef) stopRef.current = null;
        root.remove();
      }
    };
  }

  // --------------------------------------------------------------------------
  // Expose Public API & VideoFolder Adapter for MinNote main Settings modal
  // --------------------------------------------------------------------------
  window.__MinNoteRecStudio = {
    mount: mountRecorder,
    openSettings: openSettingsModal,
    isNativeHost: isNativeHost,
    getSettings: function () { return Object.assign({}, cachedSettings); },
    syncSettings: syncSettingsFromHost,
    videoFolderAdapter: {
      get: async function () {
        const res = await syncSettingsFromHost();
        return (res && res.settings && res.settings.folder) || '';
      },
      open: function () {
        if (isNativeHost()) {
          callHost('REC_OPEN_FOLDER', { folder: cachedSettings.folder }).catch(function () {});
        } else {
          openSettingsModal('storage');
        }
      },
      choose: async function () {
        if (!isNativeHost()) {
          openSettingsModal('storage');
          return null;
        }
        try {
          const r = await callHost('REC_CHOOSE_FOLDER', {}, 120000);
          if (r && r.folder) {
            cachedSettings.folder = r.folder;
            saveLocalSettings(cachedSettings);
            return r.folder;
          }
        } catch (_) {}
        return null;
      }
    },
    saveVideoDirect: async function (blob, ext, baseName) {
      if (isNativeHost()) {
        await syncSettingsFromHost();
        const res = await writeBlobNatively(blob, {
          folder: cachedSettings.folder,
          fileName: baseName || buildSuggestedName(cachedSettings.filePrefix, ''),
          ext: ext || 'mp4'
        });
        return (res && res.fileName) || ((baseName || 'video') + '.' + (ext || 'mp4'));
      }
      const fn = (baseName || 'video') + '.' + (ext || 'mp4');
      fallbackBrowserSave(blob, fn);
      return fn;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { syncSettingsFromHost(); });
  } else {
    syncSettingsFromHost();
  }
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
