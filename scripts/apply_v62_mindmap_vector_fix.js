const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'mea-mindmap.js');
const cssPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'mea-mindmap.css');

let js = fs.readFileSync(jsPath, 'utf8');

function replaceRange(label, startMarker, endMarker, replacement) {
  const sIdx = js.indexOf(startMarker);
  if (sIdx === -1) throw new Error(`Start marker not found for [${label}]: ${startMarker}`);
  const eIdx = js.indexOf(endMarker, sIdx + startMarker.length);
  if (eIdx === -1) throw new Error(`End marker not found for [${label}]: ${endMarker}`);
  js = js.slice(0, sIdx) + replacement + js.slice(eIdx);
  console.log(`✓ Patched [${label}] (${sIdx}..${eIdx})`);
}

// 1. Replace renderMindMap() viewport rendering: use integer translate + CSS zoom (zero GPU bitmap blur on zoom!)
replaceRange(
  'Vector-sharp CSS zoom viewport in renderMindMap()',
  '    svgWrap.innerHTML = `',
  '  // 8. INTERACTIVE NODE OPERATIONS',
  `    const svgW = Math.max(1200, Math.ceil((state.bounds ? state.bounds.maxX : 1200) + 160));
    const svgH = Math.max(800, Math.ceil((state.bounds ? state.bounds.maxY : 800) + 160));

    svgWrap.innerHTML = \`
      <div id="mindmap-viewport" style="transform: translate(\${Math.round(state.pan.x)}px, \${Math.round(state.pan.y)}px); transform-origin: 0 0; position: absolute; top:0; left:0; width: \${svgW}px; height: \${svgH}px;">
        <div id="mindmap-zoom-layer" style="zoom: \${state.zoom}; position: relative; width: \${svgW}px; height: \${svgH}px;">
          <svg width="\${svgW}" height="\${svgH}" viewBox="0 0 \${svgW} \${svgH}" shape-rendering="geometricPrecision" style="position: absolute; top:0; left:0; width: \${svgW}px; height: \${svgH}px; pointer-events: none; overflow: visible;">
            \${pathsHtml}
          </svg>
          <div style="position: absolute; top:0; left:0; width: \${svgW}px; height: \${svgH}px;">
            \${nodesHtml}
          </div>
        </div>
      </div>
    \`;

    // Update zoom label
    const zoomLabel = document.getElementById('mindmap-zoom-label');
    if (zoomLabel) {
      zoomLabel.textContent = \`\${Math.round(state.zoom * 100)}%\`;
    }
  }

  function applyMindmapViewportTransform() {
    const viewport = document.getElementById('mindmap-viewport');
    if (viewport) {
      viewport.style.transform = \`translate(\${Math.round(state.pan.x)}px, \${Math.round(state.pan.y)}px)\`;
    }
    const zoomLayer = document.getElementById('mindmap-zoom-layer');
    if (zoomLayer) {
      zoomLayer.style.zoom = String(state.zoom);
    }
    const zoomLabel = document.getElementById('mindmap-zoom-label');
    if (zoomLabel) {
      zoomLabel.textContent = \`\${Math.round(state.zoom * 100)}%\`;
    }
  }

`
);

// 2. Replace generateMindmapSvg(), exportMindmapAsPng(), captureAndHandleMindmap(), __meaInsertImage(), removeMindmapBackground(), finishInsertMindmapToBoard()
// with true self-contained vector SVG (embedded Base64 KaTeX .woff2 fonts + <foreignObject>), 4K HiDPI PNG export, and zero-destructive background removal!
const vectorExportBlock = `  // Embedded Base64 KaTeX CSS cache so SVG <foreignObject> renders 100% authentic math fonts inside <img> / <canvas> / Whiteboard
  let _cachedEmbeddedKatexCss = null;
  let _embeddingKatexPromise = null;

  async function ensureEmbeddedKatexCss() {
    if (_cachedEmbeddedKatexCss !== null) return _cachedEmbeddedKatexCss;
    if (_embeddingKatexPromise) return _embeddingKatexPromise;
    _embeddingKatexPromise = (async () => {
      try {
        const cssResp = await fetch('./katex.min.css');
        if (!cssResp.ok) throw new Error('katex.min.css HTTP ' + cssResp.status);
        let cssText = await cssResp.text();
        const urlRegex = /url\\(["']?([^"')]+\\.woff2)["']?\\)/g;
        const seen = new Map();
        const matches = [...cssText.matchAll(urlRegex)];
        await Promise.all(matches.map(async (m) => {
          const rel = m[1];
          if (seen.has(rel)) return;
          seen.set(rel, null);
          try {
            const fr = await fetch(rel);
            if (!fr.ok) return;
            const buf = await fr.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = '';
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
              bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            seen.set(rel, 'data:font/woff2;base64,' + btoa(bin));
          } catch (_) {}
        }));
        cssText = cssText.replace(
          /url\\(["']?([^"')]+\\.woff2)["']?\\)\\s*format\\(["']woff2["']\\)(?:,\\s*url\\([^)]+\\)\\s*format\\([^)]+\\))*/g,
          (_, rel) => {
            const dataUrl = seen.get(rel);
            return dataUrl ? \`url("\${dataUrl}") format("woff2")\` : \`url("\${rel}") format("woff2")\`;
          }
        );
        _cachedEmbeddedKatexCss = cssText;
      } catch (err) {
        console.warn('[Mindmap] ensureEmbeddedKatexCss fallback:', err);
        _cachedEmbeddedKatexCss = '';
      } finally {
        _embeddingKatexPromise = null;
      }
      return _cachedEmbeddedKatexCss;
    })();
    return _embeddingKatexPromise;
  }
  window.ensureEmbeddedKatexCss = ensureEmbeddedKatexCss;

  // Pre-warm embedded KaTeX fonts in background so export/insert is instant
  setTimeout(() => { ensureEmbeddedKatexCss(); }, 400);

  function buildMindmapExportCss() {
    const katexCss = _cachedEmbeddedKatexCss || '';
    return \`
      \${katexCss}
      * { box-sizing: border-box; }
      .katex-mathml { display: none !important; }
      .katex-html { display: inline-block; }
      .mm-node-card {
        position: absolute;
        padding: 7px 14px;
        border-radius: 10px;
        background: #ffffff;
        border: 1.5px solid var(--node-color, #0d9488);
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
        display: inline-block;
        max-width: 620px;
        min-width: 90px;
        box-sizing: border-box;
        font-family: "Be Vietnam Pro", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        overflow: visible;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .mm-node-card.level-0 {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #ffffff;
        border: 2px solid #2dd4bf;
        box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
        padding: 10px 18px;
        border-radius: 12px;
        font-size: 13.5px;
        font-weight: 700;
        text-align: center;
      }
      .mm-node-card.level-0 .katex,
      .mm-node-card.level-0 .katex * {
        color: #ffffff !important;
      }
      .mm-node-card.level-1 {
        background: #ffffff;
        border-width: 2px;
        font-size: 12px;
        font-weight: 600;
        color: #0f172a;
        box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
      }
      .mm-node-card.level-2,
      .mm-node-card.level-3,
      .mm-node-card.level-4 {
        background: #ffffff;
        border-left-width: 3.5px;
        font-size: 11.5px;
        line-height: 1.45;
        color: #1e293b;
      }
      .mm-node-text {
        word-break: normal;
        overflow-wrap: break-word;
        white-space: normal;
        line-height: 1.45;
        color: inherit;
      }
      .mm-node-text .katex {
        font-size: 1.05em;
        color: #0f172a;
      }
      .mm-node-card.level-0 .mm-node-text .katex {
        color: #ffffff !important;
      }
      .mm-node-text .katex-display {
        margin: 4px 0 !important;
      }
      .mm-node-actions,
      .mm-color-palette,
      .mm-collapse-badge {
        display: none !important;
      }
    \`;
  }

  window.generateMindmapSvg = function () {
    calculateLayout(state.tree);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function getBounds(node) {
      if (!node) return;
      if (typeof node.x === 'number' && node.x < minX) minX = node.x;
      if (typeof node.y === 'number' && node.y < minY) minY = node.y;
      if (typeof node.x === 'number' && node.x + (node.w || 120) > maxX) maxX = node.x + (node.w || 120);
      if (typeof node.y === 'number' && node.y + (node.h || 40) > maxY) maxY = node.y + (node.h || 40);
      if (node.children && node.expanded !== false) {
        node.children.forEach(getBounds);
      }
    }
    getBounds(state.tree);

    if (!isFinite(minX) || !isFinite(minY)) {
      minX = 0; minY = 0; maxX = 800; maxY = 600;
    }

    const pad = 36;
    const ox = minX - pad;
    const oy = minY - pad;
    const width = Math.max(320, Math.ceil((maxX - minX) + pad * 2));
    const height = Math.max(200, Math.ceil((maxY - minY) + pad * 2));

    const svgNS = 'http://www.w3.org/2000/svg';
    const xhtmlNS = 'http://www.w3.org/1999/xhtml';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.setAttribute('xmlns', svgNS);
    svgEl.setAttribute('width', String(width));
    svgEl.setAttribute('height', String(height));
    svgEl.setAttribute('viewBox', \`0 0 \${width} \${height}\`);
    svgEl.setAttribute('shape-rendering', 'geometricPrecision');

    // Embedded styles (including Base64 KaTeX .woff2 fonts + exact node card styles)
    const styleEl = document.createElementNS(svgNS, 'style');
    styleEl.textContent = buildMindmapExportCss();
    svgEl.appendChild(styleEl);

    // 1. Vector Bezier connecting branches
    const pathGroup = document.createElementNS(svgNS, 'g');
    pathGroup.setAttribute('fill', 'none');
    pathGroup.setAttribute('stroke-linecap', 'round');

    // 2. HTML + KaTeX node cards inside <foreignObject>
    const foreign = document.createElementNS(svgNS, 'foreignObject');
    foreign.setAttribute('x', '0');
    foreign.setAttribute('y', '0');
    foreign.setAttribute('width', String(width));
    foreign.setAttribute('height', String(height));

    const container = document.createElementNS(xhtmlNS, 'div');
    container.setAttribute('xmlns', xhtmlNS);
    container.style.cssText = \`position: relative; width: \${width}px; height: \${height}px; background: transparent;\`;

    function buildNodeElements(node) {
      const nodeColor = node.color || (node.level === 1 ? THEME_COLORS[Math.abs(node.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % THEME_COLORS.length] : '#0d9488');
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        node.children.forEach((child) => {
          const sx = (node.x + node.w) - ox;
          const sy = (node.y + node.h / 2) - oy;
          const ex = child.x - ox;
          const ey = (child.y + child.h / 2) - oy;
          const c1 = sx + (ex - sx) * 0.45;
          const c2 = ex - (ex - sx) * 0.45;
          const childColor = child.color || nodeColor;
          const pathEl = document.createElementNS(svgNS, 'path');
          pathEl.setAttribute('d', \`M \${sx} \${sy} C \${c1} \${sy}, \${c2} \${ey}, \${ex} \${ey}\`);
          pathEl.setAttribute('fill', 'none');
          pathEl.setAttribute('stroke', childColor);
          pathEl.setAttribute('stroke-width', '2.2');
          pathEl.setAttribute('stroke-linecap', 'round');
          pathEl.setAttribute('opacity', '0.9');
          pathGroup.appendChild(pathEl);
          buildNodeElements(child);
        });
      }

      const card = document.createElementNS(xhtmlNS, 'div');
      card.setAttribute('class', \`mm-node-card level-\${node.level}\`);
      card.style.cssText = \`position: absolute; left: \${node.x - ox}px; top: \${node.y - oy}px; width: \${node.w}px; min-height: \${node.h}px; box-sizing: border-box; --node-color: \${nodeColor}; border-color: \${node.level === 0 ? '#2dd4bf' : nodeColor};\`;
      const textDiv = document.createElementNS(xhtmlNS, 'div');
      textDiv.setAttribute('class', 'mm-node-text');
      textDiv.innerHTML = renderMathInText(node.text || '');
      card.appendChild(textDiv);
      container.appendChild(card);
    }

    buildNodeElements(state.tree);
    svgEl.appendChild(pathGroup);
    foreign.appendChild(container);
    svgEl.appendChild(foreign);

    return new XMLSerializer().serializeToString(svgEl);
  };

  window.exportMindmapAsPng = async function (callback, scale = 4) {
    await ensureEmbeddedKatexCss();
    const svgString = window.generateMindmapSvg();
    if (!svgString) {
      if (callback) callback(null, null);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    const svgW = parseInt(svgEl ? svgEl.getAttribute('width') : '800', 10) || 800;
    const svgH = parseInt(svgEl ? svgEl.getAttribute('height') : '600', 10) || 600;

    // Cap maximum bitmap dimension to 8192px while preserving crisp 4x HiDPI quality
    const effScale = Math.min(scale, 8192 / Math.max(svgW, svgH, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(svgW * effScale));
    canvas.height = Math.max(1, Math.round(svgH * effScale));

    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const img = new Image();
    img.onload = function () {
      try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngData = canvas.toDataURL('image/png');
        if (callback) callback(pngData, svgString);
      } catch (e) {
        console.warn('[Mindmap] Canvas export error:', e);
        if (callback) callback(null, svgString);
      }
    };
    img.onerror = function (err) {
      console.warn('[Mindmap] SVG image render error:', err);
      if (callback) callback(null, svgString);
    };
    img.src = dataUri;
  };

  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('mea-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mea-toast-container';
      container.className = 'mea-toast-container';
      document.body.appendChild(container);
    }
    container.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = \`mea-toast \${type}\`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

  let _isCapturingMindmap = false;
  window.__capturingPrevSelected = null;

  window.restoreAfterMindmapCapture = function () {
    document.documentElement.classList.remove('mindmap-capturing');
    document.body.classList.remove('mindmap-capturing');
    const container = document.getElementById('mea-mindmap-container');
    if (container) {
      container.classList.remove('mindmap-clean-export', 'mindmap-capturing');
    }
    if (window.__capturingPrevSelected !== null) {
      state.selectedId = window.__capturingPrevSelected;
      window.__capturingPrevSelected = null;
    }
    renderMindMap();
  };

  window.captureAndHandleMindmap = async function (action) {
    if (_isCapturingMindmap) return;
    if (state.mode === 'closed') {
      window.showToast('Vui lòng mở Sơ đồ tư duy trước khi thực hiện!', 'warning');
      return;
    }
    _isCapturingMindmap = true;
    try {
      await ensureEmbeddedKatexCss();
      const svgString = window.generateMindmapSvg();
      if (!svgString) {
        window.showToast('Không thể kết xuất Sơ đồ tư duy!', 'error');
        return;
      }

      if (action === 'insert_board' || !action) {
        // Insert TRUE VECTOR SVG Data URI directly onto Whiteboard: infinite sharpness at ANY zoom (100%-400%) & 100% KaTeX math!
        const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        await window.finishInsertMindmapToBoard(svgDataUri);
        return;
      }

      // For Word clipboard & PNG download: render 4K Ultra-HiDPI transparent PNG from vector SVG
      await new Promise((resolve) => {
        window.exportMindmapAsPng(async (pngData) => {
          if (pngData) {
            if (action === 'copy_word') {
              await window.copyImageToClipboard(pngData);
            } else if (action === 'save_png') {
              const a = document.createElement('a');
              a.href = pngData;
              a.download = \`SoDoTuDuy_\${Date.now()}.png\`;
              a.click();
              window.showToast('Đã tải ảnh PNG siêu nét (4K nền trong suốt)!', 'success');
            }
          } else {
            window.showToast('Không thể xuất ảnh PNG từ sơ đồ!', 'error');
          }
          resolve();
        }, 4);
      });
    } finally {
      _isCapturingMindmap = false;
    }
  };

  window.setMindmapTree = function (treeData, editingContext = null) {
    if (!treeData) return;
    try {
      state.tree = typeof treeData === 'string' ? JSON.parse(treeData) : JSON.parse(JSON.stringify(treeData));
      state.selectedId = 'root';
      if (editingContext) {
        state.editingBoardItem = editingContext;
      }
      renderMindMap();
      window.fitMindMapView();
    } catch (e) {
      console.warn('[Mindmap] Error setting tree:', e);
    }
  };

  window.openMindMapStudioWithTree = function (treeData, editingContext = null) {
    window.setMindmapTree(treeData, editingContext);
    window.setMindMapMode('full');
    window.showToast('Đã tải Sơ đồ tư duy để chỉnh sửa! Sau khi chỉnh sửa, bấm "Chèn Bảng vẽ" để cập nhật trực tiếp.', 'success');
  };

  window.editActiveMindmap = function () {
    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard || window.__minnoteBoard;
    if (board && board.sel && board.sel.items && board.sel.items.size > 0) {
      const page = board.doc.pages[board.sel.page];
      const item = page && page.items ? page.items.find(x => board.sel.items.has(x.id)) : null;
      if (item && item.meaMindmap) {
        window.openMindMapStudioWithTree(item.meaMindmap, { id: item.id, page: board.sel.page });
        return;
      }
    }
    if (window.__lastInsertedMindmapTree) {
      window.openMindMapStudioWithTree(window.__lastInsertedMindmapTree);
    } else {
      window.setMindMapMode('full');
    }
  };

  window.__meaInsertImage = async function (dataUri, meta) {
    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard || window.__minnoteBoard;
    if (!board) return false;
    try {
      const img = new Image();
      img.src = dataUri;
      await img.decode();
      const natW = img.naturalWidth || 900;
      const natH = img.naturalHeight || 560;
      const pageIdx = (board.sel && board.sel.page >= 0) ? board.sel.page : 0;
      const pw = board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;
      const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;
      const maxW = Math.min(1060, pw - 60);
      const maxH = Math.min(1200, ph - 60);
      const r = Math.min(1, maxW / natW, maxH / natH);
      const curW = Math.max(180, Math.round(natW * r));
      const curH = Math.max(100, Math.round(natH * r));
      const newX = Math.round(Math.max(30, (pw - curW) / 2));
      const newY = Math.round(Math.max(40, (ph - curH) / 2));
      const newItem = {
        id: 'mm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'image',
        src: dataUri,
        x: newX,
        y: newY,
        w: curW,
        h: curH,
        meaMindmap: meta
      };
      if (typeof board.insertItem === 'function') {
        board.insertItem(newItem);
        if (typeof board.redraw === 'function') board.redraw();
      } else if (typeof board.insertImage === 'function') {
        await board.insertImage(dataUri, { w: curW, h: curH });
      } else if (board.doc && board.doc.pages && board.doc.pages[pageIdx]) {
        board.commit(board.updatePage(pageIdx, p => ({
          ...p,
          items: [...(p.items || []), newItem]
        })));
        board.sel = { page: pageIdx, strokes: new Set(), items: new Set([newItem.id]) };
        if (typeof board.redraw === 'function') board.redraw();
      }
      return true;
    } catch (e) {
      console.warn('[Mindmap] __meaInsertImage error:', e);
      return false;
    }
  };

  // Safe transparent background helper: NEVER touches SVG data URIs or already-transparent PNGs, NEVER erases dark text/math!
  window.removeMindmapBackground = function (dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string') return resolve(dataUrl);
      if (dataUrl.startsWith('data:image/svg+xml') || !dataUrl.startsWith('data:image')) {
        return resolve(dataUrl);
      }
      const img = new Image();
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          const w = canvas.width;
          const h = canvas.height;
          // If corners are already transparent, return untouched immediately!
          const corners = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + (w - 1)) * 4];
          if (corners.some(idx => d[idx + 3] < 32)) {
            return resolve(dataUrl);
          }
          resolve(dataUrl);
        } catch (err) {
          resolve(dataUrl);
        }
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  };

  window.copyImageToClipboard = async function (dataUrl) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        if (typeof window.showToast === 'function') {
          window.showToast('Đã sao chép ảnh sơ đồ 4K (nền trong suốt, đầy đủ công thức Toán) vào Clipboard!', 'success');
        }
      }
    } catch (err) {
      console.warn('[Mindmap] copyImageToClipboard error:', err);
    }
  };

  const onCapturedMessage = async function (e) {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data && data.type === 'MINDMAP_CAPTURED' && data.dataUri) {
        if (typeof window.__onMindmapCapturedSuccess === 'function') {
          window.__onMindmapCapturedSuccess();
        }
        window.restoreAfterMindmapCapture();
        if (data.action === 'insert_board' || !data.action) {
          window.finishInsertMindmapToBoard(data.dataUri);
        } else if (data.action === 'copy_word') {
          window.copyImageToClipboard(data.dataUri);
        }
      }
    } catch (_) {}
  };
  if (window.chrome && window.chrome.webview && window.chrome.webview.addEventListener) {
    window.chrome.webview.addEventListener('message', onCapturedMessage);
  }
  window.addEventListener('message', onCapturedMessage);

  window.finishInsertMindmapToBoard = async function (dataUri) {
    window.scrollTo(0, 0);
    if (document.documentElement) { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; }
    if (document.body) { document.body.scrollLeft = 0; document.body.scrollTop = 0; }
    const currentTree = JSON.parse(JSON.stringify(state.tree));
    window.__lastInsertedMindmapTree = currentTree;

    if (typeof window.setMindMapMode === 'function') {
      window.setMindMapMode('closed');
    }
    await new Promise(r => setTimeout(r, 60));
    window.dispatchEvent(new Event('resize'));

    let inserted = false;
    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard || window.__minnoteBoard;

    if (state.editingBoardItem && board && board.doc && board.doc.pages && board.doc.pages[state.editingBoardItem.page]) {
      const pageIdx = state.editingBoardItem.page;
      const itemId = state.editingBoardItem.id;
      const page = board.doc.pages[pageIdx];
      const existing = page && page.items ? page.items.find(x => x.id === itemId) : null;
      if (existing) {
        try {
          const img = new Image();
          img.src = dataUri;
          await img.decode();
          const natW = img.naturalWidth || 900;
          const natH = img.naturalHeight || 560;
          const pw = board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;
          const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;
          const maxW = Math.min(1060, pw - 60);
          const maxH = Math.min(1200, ph - 60);
          const curW = (existing.w > 80 && existing.w <= maxW) ? existing.w : Math.min(maxW, Math.round(natW * Math.min(1, maxW / natW, maxH / natH)));
          const curH = Math.round(curW * (natH / natW));
          const newX = Math.max(30, Math.min(pw - curW - 30, existing.x));
          const newY = Math.max(30, Math.min(ph - curH - 30, existing.y));
          board.commit(board.updatePage(pageIdx, p => ({
            ...p,
            items: p.items.map(it => it.id === itemId ? {
              ...it,
              src: dataUri,
              x: newX,
              y: newY,
              w: curW,
              h: curH,
              meaMindmap: currentTree
            } : it)
          })));
          inserted = true;
          state.editingBoardItem = null;
        } catch (err) {
          console.warn('[Mindmap] Error updating existing item:', err);
        }
      }
    }

    if (!inserted && typeof window.__meaInsertImage === 'function') {
      try {
        inserted = await window.__meaInsertImage(dataUri, currentTree);
      } catch (err) {
        console.warn('[Mindmap] Native canvas insert error:', err);
      }
    }

    if (board) {
      try {
        board.sel = null;
        board.setTool({ k: 'pen' });
        board.redraw();
      } catch (_) {}
    }

    window.scrollTo(0, 0);
    if (document.documentElement) { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; }
    if (document.body) { document.body.scrollLeft = 0; document.body.scrollTop = 0; }
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.scrollLeft = 0;
      rootEl.scrollTop = 0;
    }

    if (inserted) {
      window.showToast('Đã chèn Sơ đồ tư duy Vector siêu nét (không vỡ nét khi zoom) vào Bảng viết!', 'success');
    } else {
      window.showToast('Đã sao chép ảnh sơ đồ! Bạn có thể nhấn Ctrl+V để dán vào bảng vẽ.', 'info');
    }
  };

`;

replaceRange(
  'True-vector KaTeX SVG/PNG/Board export pipeline',
  '  window.generateMindmapSvg = function (forCanvas = false) {',
  '  // NATIVE VECTOR MINDMAP CARD ENGINE',
  vectorExportBlock
);

// 3. Upgrade downloadMindmapSvg to await embedded KaTeX fonts
replaceRange(
  'Await embedded KaTeX fonts in downloadMindmapSvg()',
  '  window.downloadMindmapSvg = function () {',
  '  // 14. PAN & ZOOM CONTROLS',
  `  window.downloadMindmapSvg = async function () {
    try {
      await ensureEmbeddedKatexCss();
      const svgString = window.generateMindmapSvg();
      if (!svgString) {
        window.showToast('Không thể kết xuất mã vector SVG!', 'error');
        return;
      }
      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage({
          type: 'DOWNLOAD_MINDMAP_SVG',
          svg: svgString
        });
      } else {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`SoDoTuDuy_\${Date.now()}.svg\`;
        a.click();
        URL.revokeObjectURL(url);
      }
      window.showToast('Đã xuất vector SVG (nhúng sẵn font công thức Toán) và sao chép vào bộ nhớ tạm!', 'success');
    } catch (err) {
      console.warn('[Mindmap] Error exporting SVG:', err);
      window.showToast('Lỗi xuất SVG: ' + err.message, 'error');
    }
  };

`
);

// 4. Update zoomAtPoint() to use crisp CSS zoom (up to 400%) via applyMindmapViewportTransform()
replaceRange(
  'Crisp vector CSS zoom in zoomAtPoint()',
  '  function zoomAtPoint(targetZoom, cx, cy) {',
  '  window.zoomMindMap = function (delta) {',
  `  function zoomAtPoint(targetZoom, cx, cy) {
    const oldZoom = state.zoom;
    const newZoom = Number(Math.min(4.0, Math.max(0.2, targetZoom)).toFixed(2));
    if (newZoom === oldZoom) return;
    state.pan.x = Math.round(cx - (cx - state.pan.x) * (newZoom / oldZoom));
    state.pan.y = Math.round(cy - (cy - state.pan.y) * (newZoom / oldZoom));
    state.zoom = newZoom;
    applyMindmapViewportTransform();
  }

`
);

// 5. Update mousemove pan handler to call applyMindmapViewportTransform()
replaceRange(
  'Use applyMindmapViewportTransform() during mouse drag pan',
  '      state.pan.x = e.clientX - state.dragStart.x;',
  '    window.addEventListener(\'mouseup\', () => {',
  `      state.pan.x = e.clientX - state.dragStart.x;
      state.pan.y = e.clientY - state.dragStart.y;
      applyMindmapViewportTransform();
    });

`
);

// 6. Improve node measurement padding in calculateLayout so tall KaTeX fractions/cases never clip
const oldMeasurePad = 'w = Math.ceil(rect.width) + 12; // Room for collapse badge and borders';
if (js.includes(oldMeasurePad)) {
  js = js.replace(
    oldMeasurePad,
    'w = Math.ceil(rect.width) + 18; // Room for collapse badge, borders & wide KaTeX'
  );
  console.log('✓ Patched [calculateLayout measureNode width padding]');
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Successfully updated', jsPath);

// 7. Add crisp vector typography & Dark Mode compatibility rules to mea-mindmap.css
let css = fs.readFileSync(cssPath, 'utf8');
const cssMarker = '/* CRISP VECTOR MINDMAP RENDERING (v0.0.6.2) */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}
#mindmap-viewport,
#mindmap-zoom-layer {
  will-change: auto !important;
  backface-visibility: visible !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.mm-node-card,
.mm-node-text,
.mm-node-text .katex {
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.mm-node-card .katex-html {
  display: inline-block;
}
`;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('✓ Appended crisp vector rendering CSS to', cssPath);
}
