/* ============================================================================
   MinNote Pro Screen Recorder Studio (v0.0.6.6)
   Fixes:
   1. Pixel-exact camera/crop frame alignment (0px shift between setup & live;
      W3C Region Capture CropTarget.fromElement + letterbox-aware VideoFrame/Canvas fallback)
   2. High-clarity video output (native HiDPI resolution, 60 FPS, 24 Mbps Ultra default,
      H.264 High Profile L5.2 / VP9, videoTrack.contentHint = 'detail', 192 kbps audio)
   3. Persistent Storage & Recording Settings (folder, quality, FPS, format, mic, cursor,
      save mode, filename prefix, recent saved videos)
   4. Native Post-Record Preview & Save modal + Auto-Save card (ZERO browser download UI!)
   5. Works seamlessly with WebView2 --auto-accept-this-tab-capture (skips browser tab prompt)
   ============================================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'minnote_recorder_studio_settings_v1';
  const MIN_BOX = 80;
  const CHUNK_BYTES = 1536000; // 1.5 MB (divisible by 3 for zero base64 padding overhead)

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
  // Native WPF WebView2 Bridge (REC_*)
  // --------------------------------------------------------------------------
  const pendingRpc = new Map();
  let rpcSeq = 0;
  let rpcListenerAttached = false;

  function isNativeHost() {
    return !!(window.__isMinNoteWebView2 && window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function');
  }

  function ensureRpcListener() {
    if (rpcListenerAttached || !isNativeHost()) return;
    rpcListenerAttached = true;
    window.chrome.webview.addEventListener('message', function (ev) {
      let msg = ev && ev.data;
      if (typeof msg === 'string') {
        try { msg = JSON.parse(msg); } catch (_) { return; }
      }
      if (!msg || msg.type !== 'REC_RESULT' || !msg.id) return;
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

  // Fallback download ONLY when running outside WPF WebView2 (plain web browser)
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
    // Strictly intersect with viewport so frame never overflows over bottom/top toolbars
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
  // Exact Zero-Shift Video Cropping Pipeline
  // --------------------------------------------------------------------------
  function computeExactCropBox(frameW, frameH, frameX, frameY, rect) {
    const winW = Math.max(1, window.innerWidth);
    const winH = Math.max(1, window.innerHeight);
    const sx = frameW / winW;
    const sy = frameH / winH;

    let cx, cy, cw, ch;
    // Detect aspect-ratio letterboxing or pillarboxing from Chromium tab capture
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
          // Skip malformed frame cleanly
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
  // Auto-Save Floating Notification Card (replaces Edge browser Downloads UI)
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
            ? '<button class="mnrec-btn primary sm" data-act="play">▶ Phát video</button>' +
              '<button class="mnrec-btn sm" data-act="reveal">📁 Mở thư mục</button>'
            : '') +
          '<button class="mnrec-btn sm" data-act="settings">⚙ Cài đặt lưu trữ</button>' +
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
  // Dedicated Storage & Quality Settings Modal
  // --------------------------------------------------------------------------
  let settingsModalEl = null;

  async function openSettingsModal(initialTab, onChanged) {
    if (settingsModalEl) {
      settingsModalEl.remove();
      settingsModalEl = null;
    }

    await syncSettingsFromHost();
    let draft = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
    let videos = cachedVideos.slice();
    let activeTab = initialTab || 'storage';
    let audioDevices = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        audioDevices = devs.filter(function (d) { return d.kind === 'audioinput'; });
      }
    } catch (_) {}

    const root = document.createElement('div');
    root.className = 'mnrec-root';
    document.body.appendChild(root);
    settingsModalEl = root;

    function closeModal() {
      document.removeEventListener('keydown', onKey);
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

    function render() {
      const previewFile = buildSuggestedName(draft.filePrefix, '') + '.' + draft.format;
      let tabHtml = '';

      if (activeTab === 'storage') {
        tabHtml =
          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Thư mục lưu video mặc định</span></div>' +
            '<div class="mnrec-folder-box">' +
              '<span class="mnrec-folder-path" title="' + escapeHtml(draft.folder || 'Thư mục Videos\\MinNote') + '">' +
                escapeHtml(draft.folder || (isNativeHost() ? 'Đang tải đường dẫn...' : 'Trình duyệt web (Tải về mặc định)')) +
              '</span>' +
              (isNativeHost()
                ? '<button class="mnrec-btn sm primary" data-act="choose-folder">Chọn thư mục...</button>' +
                  '<button class="mnrec-btn sm" data-act="open-folder">Mở thư mục</button>'
                : '') +
            '</div>' +
            '<div class="mnrec-hint">Video quay xong được lưu trực tiếp vào ổ đĩa máy tính, không hiện thanh tải xuống kiểu trình duyệt web.</div>' +
          '</div>' +

          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Hành động sau khi dừng quay</span></div>' +
            '<div class="mnrec-cards cols-2">' +
              '<button type="button" class="mnrec-card' + (draft.saveMode === 'panel' ? ' on' : '') + '" data-set="saveMode" data-val="panel">' +
                '<div class="mnrec-card-title"><span>Mở bảng xem trước &amp; lưu</span>' + (draft.saveMode === 'panel' ? '<span class="mnrec-badge-pill">Đang chọn</span>' : '') + '</div>' +
                '<div class="mnrec-card-sub">Xem lại ngay video vừa quay, đổi tên file, đổi thư mục hoặc hủy nếu chưa ưng ý.</div>' +
              '</button>' +
              '<button type="button" class="mnrec-card' + (draft.saveMode === 'auto' ? ' on' : '') + '" data-set="saveMode" data-val="auto">' +
                '<div class="mnrec-card-title"><span>Tự động lưu ngay</span>' + (draft.saveMode === 'auto' ? '<span class="mnrec-badge-pill">Đang chọn</span>' : '') + '</div>' +
                '<div class="mnrec-card-sub">Lưu thẳng vào thư mục đã chọn ngay khi bấm Dừng và hiện thẻ mở nhanh.</div>' +
              '</button>' +
            '</div>' +
          '</div>' +

          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Tiền tố tên tệp video</span><span class="mnrec-hint">Ví dụ: ' + escapeHtml(previewFile) + '</span></div>' +
            '<input class="mnrec-input" id="mnrec-prefix-input" type="text" value="' + escapeHtml(draft.filePrefix) + '" placeholder="MinNote hoặc {title}" />' +
            '<div class="mnrec-hint">Mẹo: Gõ <code>{title}</code> để tự lấy tên sổ ghi chú hiện tại làm tên video.</div>' +
          '</div>';
      } else if (activeTab === 'quality') {
        tabHtml =
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
            '<div class="mnrec-hint">Chế độ <b>Siêu nét</b> bật độ phân giải thực HiDPI, ưu tiên độ sắc nét chữ &amp; đường kẻ hình học (contentHint: detail) và bitrate 24 Mbps.</div>' +
          '</div>' +

          '<div class="mnrec-row" style="gap:16px;">' +
            '<div class="mnrec-section" style="flex:1;min-width:210px;">' +
              '<div class="mnrec-label"><span>Tốc độ khung hình (FPS)</span></div>' +
              '<div class="mnrec-cards cols-2">' +
                '<button type="button" class="mnrec-card' + (draft.fps === 60 ? ' on' : '') + '" data-set="fps" data-val="60">' +
                  '<div class="mnrec-card-title">60 FPS</div>' +
                  '<div class="mnrec-card-sub">Siêu mượt cho chuyển động điểm</div>' +
                '</button>' +
                '<button type="button" class="mnrec-card' + (draft.fps === 30 ? ' on' : '') + '" data-set="fps" data-val="30">' +
                  '<div class="mnrec-card-title">30 FPS</div>' +
                  '<div class="mnrec-card-sub">Tiết kiệm dung lượng</div>' +
                '</button>' +
              '</div>' +
            '</div>' +

            '<div class="mnrec-section" style="flex:1;min-width:210px;">' +
              '<div class="mnrec-label"><span>Định dạng đầu ra</span></div>' +
              '<div class="mnrec-cards cols-2">' +
                '<button type="button" class="mnrec-card' + (draft.format === 'mp4' ? ' on' : '') + '" data-set="format" data-val="mp4">' +
                  '<div class="mnrec-card-title">MP4 (H.264)</div>' +
                  '<div class="mnrec-card-sub">Chuẩn phổ biến nhất</div>' +
                '</button>' +
                '<button type="button" class="mnrec-card' + (draft.format === 'webm' ? ' on' : '') + '" data-set="format" data-val="webm">' +
                  '<div class="mnrec-card-title">WebM (VP9)</div>' +
                  '<div class="mnrec-card-sub">Nén cao, nhẹ hơn</div>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Âm thanh &amp; Con trỏ chuột</span></div>' +
            '<div class="mnrec-toggle-row">' +
              '<div><div style="font-size:13px;font-weight:600;">Thu tiếng từ micro (192 kbps + lọc nhiễu)</div>' +
              '<div class="mnrec-hint">Tự động khử tiếng vọng và lọc tạp âm khi giảng bài.</div></div>' +
              '<label class="mnrec-switch' + (draft.mic ? ' on' : '') + '"><input type="checkbox" id="mnrec-opt-mic"' + (draft.mic ? ' checked' : '') + ' /><span class="mnrec-track"></span></label>' +
            '</div>' +
            (audioDevices.length > 0
              ? '<div class="mnrec-row"><span style="font-size:12.5px;font-weight:600;min-width:110px;">Thiết bị micro:</span>' +
                '<select class="mnrec-select-box" id="mnrec-opt-micdev" style="flex:1;">' +
                  '<option value="">Mặc định của Windows</option>' +
                  audioDevices.map(function (d, idx) {
                    const lbl = d.label || ('Micro #' + (idx + 1));
                    return '<option value="' + escapeHtml(d.deviceId) + '"' + (draft.micDeviceId === d.deviceId ? ' selected' : '') + '>' + escapeHtml(lbl) + '</option>';
                  }).join('') +
                '</select></div>'
              : '') +
            '<div class="mnrec-toggle-row">' +
              '<div><div style="font-size:13px;font-weight:600;">Hiển thị con trỏ chuột trong video</div>' +
              '<div class="mnrec-hint">Giúp học sinh theo dõi vị trí chỉ bút/chuột trên bảng.</div></div>' +
              '<label class="mnrec-switch' + (draft.showCursor ? ' on' : '') + '"><input type="checkbox" id="mnrec-opt-cursor"' + (draft.showCursor ? ' checked' : '') + ' /><span class="mnrec-track"></span></label>' +
            '</div>' +
          '</div>';
      } else {
        // Tab: library
        tabHtml =
          '<div class="mnrec-section">' +
            '<div class="mnrec-row" style="justify-content:space-between;">' +
              '<div class="mnrec-hint" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Thư mục: <b>' + escapeHtml(draft.folder || 'Chưa thiết lập') + '</b></div>' +
              '<div class="mnrec-row">' +
                '<button class="mnrec-btn sm" data-act="refresh-videos">↻ Làm mới</button>' +
                (isNativeHost() ? '<button class="mnrec-btn sm" data-act="open-folder">📁 Mở thư mục</button>' : '') +
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
                        '<button class="mnrec-btn sm primary" data-act="play-video" data-path="' + escapeHtml(v.path) + '">▶ Phát</button>' +
                        '<button class="mnrec-btn sm" data-act="reveal-video" data-path="' + escapeHtml(v.path) + '" title="Hiển thị trong thư mục">📁</button>' +
                        '<button class="mnrec-btn sm danger-ghost" data-act="delete-video" data-path="' + escapeHtml(v.path) + '" title="Xóa video">✕</button>' +
                      '</div>' +
                    '</div>';
                  }).join('') +
                '</div>') +
          '</div>';
      }

      root.innerHTML =
        '<div class="mnrec-backdrop" data-act="backdrop">' +
          '<div class="mnrec-dialog" role="dialog" aria-modal="true">' +
            '<div class="mnrec-dialog-head">' +
              '<div class="mnrec-dialog-title">' +
                '<span class="mnrec-dialog-icon">🎬</span>' +
                '<span>Cài đặt Quay Màn Hình &amp; Lưu Trữ</span>' +
              '</div>' +
              '<button class="mnrec-close-btn" data-act="close" title="Đóng (Esc)">✕</button>' +
            '</div>' +
            '<div class="mnrec-tabs">' +
              '<button type="button" class="mnrec-tab' + (activeTab === 'storage' ? ' active' : '') + '" data-tab="storage">💾 Lưu trữ</button>' +
              '<button type="button" class="mnrec-tab' + (activeTab === 'quality' ? ' active' : '') + '" data-tab="quality">✨ Chất lượng &amp; Âm thanh</button>' +
              '<button type="button" class="mnrec-tab' + (activeTab === 'library' ? ' active' : '') + '" data-tab="library">🎞 Video đã lưu (' + videos.length + ')</button>' +
            '</div>' +
            '<div class="mnrec-dialog-body">' + tabHtml + '</div>' +
            '<div class="mnrec-dialog-foot">' +
              '<span class="mnrec-hint">Tự động bỏ qua xác nhận tab trình duyệt trên MinNote Desktop.</span>' +
              '<div class="mnrec-row">' +
                '<button class="mnrec-btn" data-act="close">Đóng</button>' +
                '<button class="mnrec-btn primary" data-act="save">Lưu cài đặt</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      const prefixInput = root.querySelector('#mnrec-prefix-input');
      if (prefixInput) {
        prefixInput.addEventListener('input', function () {
          draft.filePrefix = prefixInput.value;
        });
      }
      const micChk = root.querySelector('#mnrec-opt-mic');
      if (micChk) {
        micChk.addEventListener('change', function () {
          draft.mic = !!micChk.checked;
          render();
        });
      }
      const micDev = root.querySelector('#mnrec-opt-micdev');
      if (micDev) {
        micDev.addEventListener('change', function () {
          draft.micDeviceId = micDev.value;
        });
      }
      const curChk = root.querySelector('#mnrec-opt-cursor');
      if (curChk) {
        curChk.addEventListener('change', function () {
          draft.showCursor = !!curChk.checked;
          render();
        });
      }
    }

    root.addEventListener('click', async function (e) {
      if (e.target.getAttribute('data-act') === 'backdrop') {
        closeModal();
        return;
      }
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        activeTab = tabBtn.getAttribute('data-tab');
        if (activeTab === 'library' && isNativeHost()) {
          try {
            const r = await callHost('REC_LIST_VIDEOS', { folder: draft.folder });
            if (r && Array.isArray(r.videos)) videos = r.videos;
          } catch (_) {}
        }
        render();
        return;
      }
      const setBtn = e.target.closest('[data-set]');
      if (setBtn) {
        const key = setBtn.getAttribute('data-set');
        const val = setBtn.getAttribute('data-val');
        draft[key] = key === 'fps' ? Number(val) : val;
        render();
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
          window.showToast('Đã lưu cài đặt quay màn hình & lưu trữ!', 'success');
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
            render();
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
            render();
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
            render();
          }
        } catch (_) {}
      }
    });

    render();
  }

  // --------------------------------------------------------------------------
  // Dedicated Post-Recording Preview & Save Modal (replaces browser downloads)
  // --------------------------------------------------------------------------
  function openPostRecordSaveModal(opts) {
    // opts: { blob, ext, durationMs, suggestedName, fps, notify, onDone }
    const blob = opts.blob;
    const ext = opts.ext || 'mp4';
    const previewUrl = URL.createObjectURL(blob);

    let fileName = opts.suggestedName || buildSuggestedName(cachedSettings.filePrefix, opts.docName);
    let folder = cachedSettings.folder || '';
    let saving = false;
    let progress = 0;
    let savedResult = null;
    let errorMsg = '';
    let videoRes = opts.expectedRes || '';

    const root = document.createElement('div');
    root.className = 'mnrec-root';
    document.body.appendChild(root);

    function finishAndClose() {
      document.removeEventListener('keydown', onKey, true);
      URL.revokeObjectURL(previewUrl);
      root.remove();
      if (typeof opts.onDone === 'function') opts.onDone(savedResult);
    }

    function onKey(e) {
      if (e.key === 'Escape' && !saving) {
        e.stopPropagation();
        if (savedResult) finishAndClose();
      }
    }
    document.addEventListener('keydown', onKey, true);

    async function doSave(explicitFullPath) {
      if (saving) return;
      saving = true;
      errorMsg = '';
      progress = 2;
      render();
      try {
        if (isNativeHost()) {
          const res = await writeBlobNatively(blob, {
            fullPath: explicitFullPath || '',
            folder: folder,
            fileName: fileName,
            ext: ext
          }, function (pct) {
            progress = pct;
            const fill = root.querySelector('.mnrec-progress-fill');
            const pctTxt = root.querySelector('[data-pct]');
            if (fill) fill.style.width = pct + '%';
            if (pctTxt) pctTxt.textContent = pct + '%';
          });
          savedResult = res;
          if (typeof opts.notify === 'function') {
            opts.notify('Đã lưu video: ' + (res.fileName || (fileName + '.' + ext)));
          }
        } else {
          const finalName = fileName.replace(/[\\/:*?"<>|]/g, '_') + '.' + ext;
          fallbackBrowserSave(blob, finalName);
          savedResult = { fileName: finalName, path: '', sizeBytes: blob.size };
        }
      } catch (err) {
        errorMsg = String((err && err.message) || err || 'Lỗi lưu video.');
      } finally {
        saving = false;
        render();
      }
    }

    function render() {
      const sizeStr = formatBytes(blob.size);
      const durStr = formatTime(opts.durationMs || 0);

      let bodyHtml =
        '<div class="mnrec-preview-wrap">' +
          '<video class="mnrec-preview-video" src="' + previewUrl + '" controls playsinline preload="metadata"></video>' +
        '</div>' +
        '<div class="mnrec-meta-chips">' +
          '<span class="mnrec-chip" data-res-chip>📐 ' + escapeHtml(videoRes || 'Đang đọc...') + '</span>' +
          '<span class="mnrec-chip">⏱ ' + durStr + '</span>' +
          '<span class="mnrec-chip">🎞 ' + (opts.fps || cachedSettings.fps || 60) + ' FPS</span>' +
          '<span class="mnrec-chip">📦 ' + sizeStr + '</span>' +
          '<span class="mnrec-chip">' + escapeHtml(ext.toUpperCase()) + '</span>' +
        '</div>';

      if (savedResult) {
        bodyHtml +=
          '<div class="mnrec-saved-banner">' +
            '<div style="font-size:14px;font-weight:700;color:var(--mnrec-success);">✓ Đã lưu video thành công!</div>' +
            '<div class="mnrec-folder-path" style="white-space:normal;word-break:break-all;">' + escapeHtml(savedResult.path || savedResult.fileName) + '</div>' +
            '<div class="mnrec-row">' +
              (savedResult.path && isNativeHost()
                ? '<button class="mnrec-btn primary" data-act="play">▶ Phát video ngay</button>' +
                  '<button class="mnrec-btn" data-act="reveal">📁 Mở thư mục chứa file</button>'
                : '') +
            '</div>' +
          '</div>';
      } else {
        bodyHtml +=
          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Tên tệp video</span></div>' +
            '<div class="mnrec-row">' +
              '<input class="mnrec-input" id="mnrec-save-name" style="flex:1;" type="text" value="' + escapeHtml(fileName) + '" ' + (saving ? 'disabled' : '') + ' />' +
              '<span class="mnrec-chip">.' + escapeHtml(ext) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="mnrec-section">' +
            '<div class="mnrec-label"><span>Thư mục lưu trữ</span></div>' +
            '<div class="mnrec-folder-box">' +
              '<span class="mnrec-folder-path" title="' + escapeHtml(folder) + '">' + escapeHtml(folder || 'Thư mục Videos\\MinNote') + '</span>' +
              (isNativeHost()
                ? '<button class="mnrec-btn sm" data-act="change-folder" ' + (saving ? 'disabled' : '') + '>Đổi thư mục...</button>'
                : '') +
            '</div>' +
          '</div>';

        if (saving) {
          bodyHtml +=
            '<div class="mnrec-section">' +
              '<div class="mnrec-label"><span>Đang ghi video xuống ổ đĩa...</span><span data-pct>' + progress + '%</span></div>' +
              '<div class="mnrec-progress-bar"><div class="mnrec-progress-fill" style="width:' + progress + '%;"></div></div>' +
            '</div>';
        }
        if (errorMsg) {
          bodyHtml += '<div style="color:var(--mnrec-danger);font-size:12.5px;font-weight:600;">⚠ ' + escapeHtml(errorMsg) + '</div>';
        }
      }

      const footHtml = savedResult
        ? '<button class="mnrec-btn" data-act="open-settings">⚙ Cài đặt lưu trữ</button>' +
          '<button class="mnrec-btn primary" data-act="done">Hoàn tất</button>'
        : '<button class="mnrec-btn danger-ghost" data-act="discard" ' + (saving ? 'disabled' : '') + '>🗑 Hủy bản quay</button>' +
          '<div class="mnrec-row">' +
            (isNativeHost() ? '<button class="mnrec-btn" data-act="save-as" ' + (saving ? 'disabled' : '') + '>Lưu nơi khác...</button>' : '') +
            '<button class="mnrec-btn primary" data-act="save-now" ' + (saving ? 'disabled' : '') + '>' + (saving ? 'Đang lưu...' : '💾 Lưu video') + '</button>' +
          '</div>';

      root.innerHTML =
        '<div class="mnrec-backdrop">' +
          '<div class="mnrec-dialog save-dialog" role="dialog" aria-modal="true">' +
            '<div class="mnrec-dialog-head">' +
              '<div class="mnrec-dialog-title">' +
                '<span class="mnrec-dialog-icon">🎥</span>' +
                '<span>Xem Trước &amp; Lưu Video Quay Màn Hình</span>' +
              '</div>' +
              '<button class="mnrec-close-btn" data-act="' + (savedResult ? 'done' : 'discard') + '" ' + (saving ? 'disabled' : '') + ' title="Đóng">✕</button>' +
            '</div>' +
            '<div class="mnrec-dialog-body">' + bodyHtml + '</div>' +
            '<div class="mnrec-dialog-foot">' + footHtml + '</div>' +
          '</div>' +
        '</div>';

      const vid = root.querySelector('.mnrec-preview-video');
      if (vid) {
        vid.addEventListener('loadedmetadata', function () {
          if (vid.videoWidth && vid.videoHeight) {
            videoRes = vid.videoWidth + ' × ' + vid.videoHeight;
            const chip = root.querySelector('[data-res-chip]');
            if (chip) chip.textContent = '📐 ' + videoRes;
          }
        });
      }

      const nameInput = root.querySelector('#mnrec-save-name');
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          fileName = nameInput.value;
        });
      }
    }

    root.addEventListener('click', async function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn || saving) return;
      const act = btn.getAttribute('data-act');
      if (act === 'done' || act === 'discard') {
        finishAndClose();
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
          render();
        }
      } else if (act === 'change-folder' && isNativeHost()) {
        try {
          const r = await callHost('REC_CHOOSE_FOLDER', {}, 120000);
          if (r && r.folder) {
            folder = r.folder;
            cachedSettings.folder = r.folder;
            saveLocalSettings(cachedSettings);
            render();
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

    render();
  }

  // --------------------------------------------------------------------------
  // Main Screen Recorder Controller (mounted inside jne React wrapper)
  // --------------------------------------------------------------------------
  function mountRecorder(hostEl, props) {
    const onClose = props.onClose || function () {};
    const notify = props.notify || function (m) { if (window.showToast) window.showToast(m); };
    const remember = props.remember || function () {};
    const saved = props.saved || {};
    const stopRef = props.stopRef;
    const fixMp4 = props.fixMp4;
    const docName = props.name || '';

    // Initialize rect from saved fractions or exact board-scroller area
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

    const root = document.createElement('div');
    root.className = 'mnrec-root';
    hostEl.appendChild(root);

    // Sync settings from C# host asynchronously
    syncSettingsFromHost().then(function (res) {
      if (destroyed) return;
      if (res && res.settings && phase === 'select') {
        micOn = !!res.settings.mic;
        render();
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
        render();
      } else if (phase === 'rec') {
        // Keep live frame clamped inside viewport
        const clamped = clampRect(liveRectRef.current);
        liveRectRef.current = clamped;
        rect = clamped;
        updateCropTargetStyle(clamped);
        render();
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
      const top = r.y >= 64
        ? r.y - 58
        : (r.y + r.h + 64 <= window.innerHeight ? r.y + r.h + 10 : r.y + 10);
      return { left: Math.round(window.innerWidth / 2), top: Math.round(top) };
    }

    async function startRecording() {
      if (phase !== 'select') return;

      // 1. Freeze exact rect IMMEDIATELY so pointer events cannot shift it!
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

      // Remove setup dim overlay BEFORE display capture begins so frame 0 is crystal clear!
      const targetEl = ensureCropTarget(lockedRect);
      render();
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });

      const settings = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
      const preset = QUALITY_PRESETS[settings.quality] || QUALITY_PRESETS.ultra;
      const targetFps = settings.fps === 30 ? 30 : 60;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const captureScale = preset.scaleMode === 'standard'
        ? 1
        : (preset.scaleMode === 'high' ? Math.min(dpr, 1.5) : dpr);
      const idealW = even(Math.max(window.innerWidth * captureScale, 640));
      const idealH = even(Math.max(window.innerHeight * captureScale, 360));

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
      } catch (err) {
        if (audioCtx) audioCtx.close().catch(function () {});
        removeCropTarget();
        phase = 'select';
        syncStopRef();
        render();
        notify('Không thể bắt đầu quay màn hình.');
        return;
      }

      // Hint encoder to preserve sharp math lines, grid, and small labels
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        try { videoTrack.contentHint = 'detail'; } catch (_) {}
      }

      // Optional microphone stream
      let micStream = null;
      if (micOn) {
        try {
          const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
          };
          if (settings.micDeviceId) {
            audioConstraints.deviceId = { ideal: settings.micDeviceId };
          }
          micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        } catch (_) {
          notify('Không mở được micro: video sẽ không có tiếng.');
        }
      }

      // 2. Exact zero-shift cropping:
      //    Priority 1: W3C Region Capture (CropTarget.fromElement) -> compositor-level native pixel crop
      //    Priority 2: Letterbox-aware VideoFrame / Canvas crop fallback
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
            // Wait until compositor delivers the cropped frame resolution so frame 0 has no avc1 resolution switch
            const expW = even(lockedRect.w * captureScale);
            const expH = even(lockedRect.h * captureScale);
            const deadline = Date.now() + 450;
            while (Date.now() < deadline) {
              const st = typeof videoTrack.getSettings === 'function' ? videoTrack.getSettings() : null;
              if (st && st.width && st.height && Math.abs(st.width - expW) <= 24 && Math.abs(st.height - expH) <= 24) {
                break;
              }
              await new Promise(function (r) { setTimeout(r, 35); });
            }
            await new Promise(function (r) { setTimeout(r, 50); });
          } catch (cropErr) {
            console.warn('[MinNoteRec] Region Capture fallback:', cropErr);
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

      // Attach audio track
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

      // 3. Configure MediaRecorder with high-clarity codec & bitrate
      const mimeType = pickMimeType(settings.format);
      const recOpts = {
        videoBitsPerSecond: preset.videoBps,
        audioBitsPerSecond: preset.audioBps
      };
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
        if (cropPipeline) {
          try { cropPipeline.stop(); } catch (_) {}
        }
        try {
          displayStream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_) {}
        if (micStream) {
          try { micStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
        }
        if (audioCtx) {
          try { audioCtx.close(); } catch (_) {}
        }
        removeCropTarget();
        activeRec = null;
      }

      recorder.onstop = async function () {
        const finalDuration = accMs + (paused ? 0 : Math.max(0, Date.now() - startTick));
        cleanupStreams();
        phase = 'saving';
        syncStopRef();
        render();

        const isMp4 = mimeType.startsWith('video/mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        try {
          let outBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
          // Run MinNote's MP4 moov/faststart fixer for instant seeking & duration metadata
          if (isMp4 && typeof fixMp4 === 'function' && outBlob.size > 0 && outBlob.size <= 350 * 1024 * 1024) {
            try {
              const fixedParts = fixMp4(new Uint8Array(await outBlob.arrayBuffer()));
              if (fixedParts) {
                outBlob = new Blob(fixedParts, { type: outBlob.type });
              }
            } catch (mp4Err) {
              console.warn('[MinNoteRec] MP4 faststart skip:', mp4Err);
            }
          }

          const latestSettings = Object.assign({}, DEFAULT_SETTINGS, cachedSettings);
          const suggested = buildSuggestedName(latestSettings.filePrefix, docName);
          const expectedRes = even(lockedRect.w * dpr) + ' × ' + even(lockedRect.h * dpr);

          if (latestSettings.saveMode === 'auto' && isNativeHost()) {
            const res = await writeBlobNatively(outBlob, {
              folder: latestSettings.folder,
              fileName: suggested,
              ext: ext
            });
            showSavedNotificationCard({
              fileName: res.fileName || (suggested + '.' + ext),
              path: res.path || '',
              sizeBytes: res.sizeBytes || outBlob.size,
              resolution: expectedRes
            });
            onClose();
          } else {
            // Close live overlay cleanly, then present dedicated Preview & Save modal
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
              onDone: function () {
                onClose();
              }
            });
          }
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
          render();
        }
      };

      recorder.start(500);
      phase = 'rec';
      paused = false;
      elapsedMs = 0;
      syncStopRef();
      render();
    }

    // ------------------------------------------------------------------------
    // Render setup overlay / live overlay
    // ------------------------------------------------------------------------
    function render() {
      if (destroyed) return;
      const r = rect;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      if (phase === 'starting') {
        // Completely clear dim mask & setup handles so first captured frame is 100% clean
        root.innerHTML =
          '<div class="mnrec-live">' +
            '<div class="mnrec-frame" style="left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;"></div>' +
          '</div>';
        return;
      }

      if (phase === 'rec' || phase === 'saving') {
        const anchor = getBarAnchor(r);
        const barStyle = barPos
          ? 'left:' + Math.max(4, Math.min(Math.round(barPos.x * window.innerWidth), window.innerWidth - 180)) + 'px;top:' + Math.max(4, Math.min(Math.round(barPos.y * window.innerHeight), window.innerHeight - 48)) + 'px;'
          : 'left:' + anchor.left + 'px;top:' + anchor.top + 'px;';

        root.innerHTML =
          '<div class="mnrec-live">' +
            '<div class="mnrec-frame' + (paused ? ' paused' : '') + '" style="left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;"></div>' +
            '<div class="mnrec-bar live' + (minimized ? ' mini' : '') + (barPos ? ' moved' : '') + '" id="mnrec-live-bar" style="' + barStyle + '">' +
              (!minimized ? '<span style="opacity:0.55;margin-right:2px;font-size:12px;">⋮⋮</span>' : '') +
              '<span class="mnrec-dot' + (paused ? ' paused' : '') + '"></span>' +
              '<span class="mnrec-time">' + (phase === 'saving' ? 'Đang xử lý...' : formatTime(elapsedMs)) + '</span>' +
              (phase === 'rec' && !minimized
                ? '<button type="button" class="mnrec-live-ghost" data-act="pause">' + (paused ? '▶ Quay tiếp' : '⏸ Tạm dừng') + '</button>' +
                  '<button type="button" class="mnrec-live-stop" data-act="stop"><span class="mnrec-square"></span> Dừng</button>' +
                  '<button type="button" class="mnrec-live-ghost mnrec-live-small" data-act="mini" title="Thu nhỏ thanh quay">—</button>'
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
              render();
            }
          };
          bar.addEventListener('pointerup', endBarDrag);
          bar.addEventListener('pointercancel', endBarDrag);
        }
        return;
      }

      // Setup phase ('select')
      const pr = safePageRect(props.pageRect);
      const wr = wholeWindowRect();
      const isPage = rectsEqual(r, pr);
      const isWhole = rectsEqual(r, wr);
      const anchor = getBarAnchor(r);
      const preset = QUALITY_PRESETS[cachedSettings.quality] || QUALITY_PRESETS.ultra;
      const curFps = cachedSettings.fps === 30 ? 30 : 60;
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

      const edgeCls =
        (r.x < 8 ? ' edge-l' : '') +
        (r.y < 8 ? ' edge-t' : '') +
        (r.x + r.w > window.innerWidth - 8 ? ' edge-r' : '') +
        (r.y + r.h > window.innerHeight - 8 ? ' edge-b' : '');

      root.innerHTML =
        '<div class="mnrec-select" id="mnrec-select-overlay">' +
          '<div class="mnrec-area' + edgeCls + '" id="mnrec-area" style="left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;">' +
            '<span class="mnrec-tip">Kéo để chọn vùng quay • Kéo khung để dời • Kéo góc để đổi cỡ</span>' +
            '<span class="mnrec-size">' + even(r.w * dpr) + ' × ' + even(r.h * dpr) + ' px</span>' +
            handles.map(function (h) {
              return '<span class="mnrec-handle ' + h + '" data-handle="' + h + '"></span>';
            }).join('') +
          '</div>' +
          '<div class="mnrec-bar" id="mnrec-setup-bar" style="left:' + anchor.left + 'px;top:' + anchor.top + 'px;">' +
            '<div class="mnrec-seg">' +
              '<button type="button" class="' + (isPage ? 'on' : '') + '" data-act="preset-page">Vùng trang viết</button>' +
              '<button type="button" class="' + (isWhole ? 'on' : '') + '" data-act="preset-whole">Cả cửa sổ</button>' +
            '</div>' +
            '<label class="mnrec-switch' + (micOn ? ' on' : '') + '" data-act="toggle-mic-wrap">' +
              '<input type="checkbox" id="mnrec-bar-mic"' + (micOn ? ' checked' : '') + ' />' +
              '<span class="mnrec-track"></span>' +
              '<span>Micro</span>' +
            '</label>' +
            '<button type="button" class="mnrec-btn-settings" data-act="open-settings" title="Cài đặt thư mục lưu trữ, chất lượng video, FPS và danh sách video đã lưu">' +
              '<span>⚙ Cài đặt &amp; Lưu trữ</span>' +
              '<span class="mnrec-badge-pill">' + preset.label + ' • ' + curFps + 'fps</span>' +
            '</button>' +
            '<span class="mnrec-sep"></span>' +
            '<button type="button" class="mnrec-btn-ghost" data-act="cancel">Hủy</button>' +
            '<button type="button" class="mnrec-btn-start" data-act="start"><span class="mnrec-dot white"></span> Bắt đầu quay</button>' +
          '</div>' +
        '</div>';

      const overlay = root.querySelector('#mnrec-select-overlay');
      const bar = root.querySelector('#mnrec-setup-bar');
      if (bar) {
        bar.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      }
      const barMic = root.querySelector('#mnrec-bar-mic');
      if (barMic) {
        barMic.addEventListener('change', function () {
          micOn = !!barMic.checked;
          persistSettings({ mic: micOn });
          render();
        });
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

          // Update geometry smoothly without rebuilding DOM on every mousemove
          const areaEl = root.querySelector('#mnrec-area');
          const sizeEl = root.querySelector('.mnrec-size');
          const sbar = root.querySelector('#mnrec-setup-bar');
          if (areaEl) {
            areaEl.style.left = rect.x + 'px';
            areaEl.style.top = rect.y + 'px';
            areaEl.style.width = rect.w + 'px';
            areaEl.style.height = rect.h + 'px';
            areaEl.classList.toggle('edge-l', rect.x < 8);
            areaEl.classList.toggle('edge-t', rect.y < 8);
            areaEl.classList.toggle('edge-r', rect.x + rect.w > window.innerWidth - 8);
            areaEl.classList.toggle('edge-b', rect.y + rect.h > window.innerHeight - 8);
          }
          if (sizeEl) {
            sizeEl.textContent = even(rect.w * dpr) + ' × ' + even(rect.h * dpr) + ' px';
          }
          if (sbar) {
            const a = getBarAnchor(rect);
            sbar.style.left = a.left + 'px';
            sbar.style.top = a.top + 'px';
          }
        });

        const endDrag = function () {
          if (!dragState) return;
          dragState = null;
          render();
        };
        overlay.addEventListener('pointerup', endDrag);
        overlay.addEventListener('pointercancel', endDrag);
      }
    }

    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'preset-page') {
        rect = safePageRect(props.pageRect);
        liveRectRef.current = rect;
        render();
      } else if (act === 'preset-whole') {
        rect = wholeWindowRect();
        liveRectRef.current = rect;
        render();
      } else if (act === 'open-settings') {
        openSettingsModal('storage', function (updated) {
          if (updated) micOn = !!updated.mic;
          render();
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
        render();
      }
    });

    syncStopRef();
    render();

    return {
      unmount: function () {
        destroyed = true;
        window.removeEventListener('resize', onWindowResize);
        window.removeEventListener('keydown', onKeyDown);
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

  // Pre-sync settings quietly once WebView2 is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { syncSettingsFromHost(); });
  } else {
    syncSettingsFromHost();
  }
})();
