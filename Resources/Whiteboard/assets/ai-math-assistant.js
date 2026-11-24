// AI Math Assistant for NoteRenderer v3
// Nhận diện nét chữ viết tay tự động -> Chuyển thành Đồ thị hàm số hoặc Công thức toán LaTeX

(function () {
  console.log("AI Math Assistant v3 loaded.");

  // Tạo UI container
  const container = document.createElement("div");
  container.id = "ai-math-container";
  container.innerHTML = `
    <style>
      #ai-math-btn {
        position: fixed;
        display: none;
        align-items: center;
        gap: 6px;
        padding: 6px 13px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12.5px;
        font-weight: 600;
        border-radius: 20px;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2);
        cursor: pointer;
        z-index: 880;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        user-select: none;
      }
      #ai-math-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
      }
      #ai-math-btn svg {
        width: 15px;
        height: 15px;
        fill: currentColor;
      }
      #ai-math-menu {
        position: fixed;
        display: none;
        flex-direction: column;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 14px 32px rgba(15, 23, 42, 0.2);
        padding: 6px;
        width: 272px;
        z-index: 100000;
        font-family: system-ui, -apple-system, sans-serif;
        user-select: none;
        animation: aiPop 0.16s cubic-bezier(0.22, 1, 0.36, 1);
      }
      html.dark #ai-math-menu {
        background: #111827;
        border-color: #334155;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.65);
      }
      @keyframes aiPop {
        from { opacity: 0; transform: translate3d(0, 6px, 0) scale(0.96); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }
      .ai-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        color: #1e293b;
        font-weight: 500;
        transition: background 0.14s ease, color 0.14s ease;
      }
      .ai-menu-item:hover {
        background: #eff6ff;
        color: #1d4ed8;
      }
      html.dark .ai-menu-item {
        color: #e2e8f0;
      }
      html.dark .ai-menu-item:hover {
        background: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
      }
      .ai-menu-item svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .ai-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 6px;
      }
      html.dark .ai-divider {
        background: #1f2937;
      }
      #ai-math-modal {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.52);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100001;
        backdrop-filter: blur(4px);
      }
      html.dark #ai-math-modal {
        background: rgba(2, 6, 23, 0.72);
      }
      .ai-modal-card {
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #cbd5e1;
        width: 460px;
        max-width: 92vw;
        border-radius: 16px;
        padding: 22px;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.28);
        font-family: system-ui, -apple-system, sans-serif;
        animation: aiPop 0.18s cubic-bezier(0.22, 1, 0.36, 1);
      }
      html.dark .ai-modal-card {
        background: #0f172a;
        color: #f1f5f9;
        border-color: #334155;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.72);
      }
      .ai-modal-title {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      html.dark .ai-modal-title {
        color: #f8fafc;
      }
      .ai-modal-close {
        cursor: pointer;
        font-size: 20px;
        color: #64748b;
        border: none;
        background: transparent;
        border-radius: 6px;
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .ai-modal-close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
      html.dark .ai-modal-close {
        color: #94a3b8;
      }
      html.dark .ai-modal-close:hover {
        background: #1e293b;
        color: #ffffff;
      }
      .ai-preview-box {
        background: #ffffff;
        border: 1.5px dashed #cbd5e1;
        border-radius: 10px;
        padding: 10px;
        text-align: center;
        margin-bottom: 14px;
        min-height: 80px;
        max-height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      html.dark .ai-preview-box {
        background: #f8fafc;
        border-color: #475569;
      }
      .ai-preview-box img {
        max-height: 110px;
        max-width: 100%;
        object-fit: contain;
      }
      .ai-field-label {
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      html.dark .ai-field-label {
        color: #cbd5e1;
      }
      .ai-status-badge {
        font-size: 11px;
        font-weight: 600;
        color: #2563eb;
      }
      html.dark .ai-status-badge {
        color: #60a5fa;
      }
      .ai-input-group {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .ai-input {
        flex: 1;
        padding: 9px 12px;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 8px;
        font-size: 15px;
        font-family: monospace;
        font-weight: 600;
        color: #0f172a;
        outline: none;
        transition: border 0.15s ease, box-shadow 0.15s ease;
      }
      .ai-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
      }
      html.dark .ai-input {
        background: #162033;
        border-color: #334155;
        color: #f8fafc;
      }
      html.dark .ai-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
      }
      .ai-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
      }
      .ai-sug-item {
        font-size: 12px;
        padding: 4px 9px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        color: #334155;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.14s ease;
      }
      .ai-sug-item:hover {
        background: #dbeafe;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
      html.dark .ai-sug-item {
        background: #1e293b;
        border-color: #334155;
        color: #cbd5e1;
      }
      html.dark .ai-sug-item:hover {
        background: rgba(59, 130, 246, 0.24);
        border-color: #3b82f6;
        color: #93c5fd;
      }
      .ai-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .ai-btn-secondary {
        padding: 8px 14px;
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: background 0.14s ease;
      }
      .ai-btn-secondary:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      html.dark .ai-btn-secondary {
        background: #1e293b;
        color: #cbd5e1;
        border-color: #334155;
      }
      html.dark .ai-btn-secondary:hover {
        background: #334155;
        color: #ffffff;
      }
      .ai-btn-primary {
        padding: 9px 18px;
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: background 0.15s ease;
      }
      .ai-btn-primary:hover {
        background: #1d4ed8;
      }
    </style>

    <div id="ai-math-btn">
      <svg viewBox="0 0 24 24"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>
      <span>AI Toán học</span>
    </div>

    <div id="ai-math-menu">
      <div class="ai-menu-item" id="opt-graph">
        <svg fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v18h18M18 9l-5 5-4-4-6 6"/></svg>
        <span>Biến thành đồ thị hàm số</span>
      </div>
      <div class="ai-menu-item" id="opt-formula">
        <svg fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19h4l4-14h4M14 11h6"/></svg>
        <span>Biến thành công thức toán (LaTeX)</span>
      </div>
      <div class="ai-divider"></div>
      <div class="ai-menu-item" id="opt-config-gemini">
        <svg fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        <span>Cài đặt AI / MatrixExamAI Pro...</span>
      </div>
    </div>

    <div id="ai-math-modal">
      <div class="ai-modal-card">
        <div class="ai-modal-title">
          <span id="modal-title-text">Biến nét vẽ thành Đồ thị hàm số</span>
          <button class="ai-modal-close" id="modal-close-btn">&times;</button>
        </div>
        
        <div class="ai-field-label">
          <span>Nét chữ viết tay đã khoanh vùng:</span>
          <span class="ai-status-badge" id="ai-status-text">Đang nhận diện...</span>
        </div>
        <div class="ai-preview-box">
          <img id="stroke-preview-img" src="" alt="Chữ viết tay" />
        </div>

        <div class="ai-field-label">
          <span id="input-label-text">Biểu thức hàm số y = f(x):</span>
        </div>
        <div class="ai-input-group">
          <input type="text" id="fn-input" class="ai-input" placeholder="ví dụ: 4x^2 - 3" value="" />
        </div>

        <div class="ai-field-label">
          <span>Gợi ý nhận diện / Chọn nhanh:</span>
        </div>
        <div class="ai-suggestions" id="ai-suggestions-box"></div>

        <div class="ai-actions">
          <button class="ai-btn-secondary" id="modal-cancel-btn">Hủy</button>
          <button class="ai-btn-primary" id="modal-confirm-btn">⚡ Vẽ đồ thị ngay</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById("ai-math-btn");
  const menu = document.getElementById("ai-math-menu");
  const modal = document.getElementById("ai-math-modal");
  const previewImg = document.getElementById("stroke-preview-img");
  const fnInput = document.getElementById("fn-input");
  const confirmBtn = document.getElementById("modal-confirm-btn");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const modalTitle = document.getElementById("modal-title-text");
  const statusText = document.getElementById("ai-status-text");
  const inputLabel = document.getElementById("input-label-text");
  const suggestionsBox = document.getElementById("ai-suggestions-box");

  let lastSelectedBox = null;
  let targetMode = "graph"; // "graph" | "formula"

  // 1. Trích xuất ảnh và vector nét vẽ tay từ editor
  function captureSelectedStrokes(editor) {
    if (!editor || !editor.sel || !editor.sel.strokes || editor.sel.strokes.size === 0) return null;
    const box = editor.selectionBox();
    if (!box) return null;

    const page = editor.doc.pages[editor.sel.page];
    if (!page) return null;

    const selectedStrokes = page.strokes.filter((s) => editor.sel.strokes.has(s.id));
    if (selectedStrokes.length === 0) return null;

    const pad = 16;
    const w = Math.max(20, Math.ceil(box.x1 - box.x0 + pad * 2));
    const h = Math.max(20, Math.ceil(box.y1 - box.y0 + pad * 2));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Nền trắng
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    ctx.translate(-box.x0 + pad, -box.y0 + pad);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const ink = [];

    // Duyệt qua từng nét vẽ
    for (const stroke of selectedStrokes) {
      if (!stroke.pts || stroke.pts.length < 2) continue;
      ctx.strokeStyle = stroke.color || "#000000";
      ctx.lineWidth = Math.max(2.5, stroke.width || 3.5);
      ctx.beginPath();

      const xs = [];
      const ys = [];
      const ts = [];

      // NoteRenderer lưu stroke.pts dưới dạng mảng số phẳng: [x, y, p, x, y, p, ...]
      const isFlat = typeof stroke.pts[0] === "number";
      const step = isFlat ? 3 : 1;

      for (let i = 0; i < stroke.pts.length; i += step) {
        const px = isFlat ? stroke.pts[i] : stroke.pts[i].x;
        const py = isFlat ? stroke.pts[i + 1] : stroke.pts[i].y;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }

        xs.push(Math.round(px - box.x0));
        ys.push(Math.round(py - box.y0));
        ts.push(i * 10);
      }
      ctx.stroke();

      if (xs.length > 0) {
        ink.push([xs, ys, ts]);
      }
    }

    return {
      dataUrl: canvas.toDataURL("image/png"),
      ink: ink,
      width: w,
      height: h
    };
  }

  // 2. Hàm chuẩn hóa biểu thức toán học
  function cleanMathFormula(rawText, mode) {
    if (!rawText) return mode === "formula" ? "2x + 3 = 5" : "4x^2 - 3";
    let text = rawText.trim();

    // Bỏ ký tự markdown bao quanh
    text = text.replace(/[$`]/g, "");

    // Chuẩn hóa số mũ Unicode: x² -> x^2, x³ -> x^3, x⁴ -> x^4
    text = text.replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁴/g, "^4").replace(/⁵/g, "^5");

    // Chuẩn hóa dạng x2, x3 đứng sau biến x: 4x2 -> 4x^2
    text = text.replace(/([a-zA-Z])([2-9])(?![0-9])/g, "$1^$2");

    // Thay thế dấu nhân / trừ đặc biệt
    text = text.replace(/[×]/g, "*").replace(/[−–]/g, "-");

    if (mode === "graph") {
      // Cho đồ thị: Bỏ tiền tố y = hoặc f(x) =
      text = text.replace(/^(?:y|f\(x\))\s*=\s*/i, "");
    }

    return text.trim();
  }

  // 3. Nhận diện chữ viết tay (ưu tiên MatrixExamAI Pro Sync -> Gemini 2.5 Flash -> Google IME)
  async function recognizeHandwriting(captured, mode) {
    if (!captured) return mode === "formula" ? "2x + 3 = 5" : "4x^2 - 3";

    const isDark = document.documentElement.classList.contains("dark");
    const okColor = isDark ? "#34d399" : "#059669";

    statusText.innerText = "Đang nhận diện nét chữ...";
    statusText.style.color = "";

    const ocrPrompt =
      "This image shows a handwritten math formula, equation, or function. Extract the exact math formula. Return ONLY the formula string (e.g. '2x + 3 = 5' or 'y = 4x^2 - 3'). No explanation, no markdown.";
    const ocrSystem =
      "You are a precise mathematical handwriting OCR engine. Return ONLY the exact single-line math formula or expression with no commentary and no markdown fences.";
    const base64 = captured.dataUrl ? captured.dataUrl.replace(/^data:image\/\w+;base64,/, "") : "";

    // Cách 0 (Ưu tiên): Dùng khóa AI & model đồng bộ từ MatrixExamAI Pro
    if (base64 && window.MinNoteMeaSync && typeof window.MinNoteMeaSync.executeAiPrompt === "function") {
      try {
        const syncRes = await window.MinNoteMeaSync.executeAiPrompt(ocrPrompt, ocrSystem, {
          imageBase64: base64,
          imageMimeType: "image/png",
          timeoutMs: 120000
        });
        const cand = (syncRes && (syncRes.content || syncRes.text) || "").trim();
        if (cand) {
          const prov = (syncRes && syncRes.provider) ? syncRes.provider : "MEA Pro";
          statusText.innerText = `✓ Nhận diện AI (${prov})`;
          statusText.style.color = okColor;
          return cleanMathFormula(cand, mode);
        }
      } catch (err) {
        console.warn("MinNoteMeaSync OCR failed, falling back:", err);
      }
    }

    // Cách A (Dự phòng): Nếu có Gemini API Key lưu cục bộ trong localStorage
    const geminiKey = localStorage.getItem("note_gemini_api_key");
    if (base64 && geminiKey && geminiKey.trim()) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey.trim())}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: ocrPrompt },
                { inline_data: { mime_type: "image/png", data: base64 } }
              ]
            }]
          })
        });
        const data = await res.json();
        const cand = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (cand) {
          statusText.innerText = "✓ Nhận diện bằng Gemini 2.5 Flash";
          statusText.style.color = okColor;
          return cleanMathFormula(cand, mode);
        }
      } catch (err) {
        console.warn("Gemini recognition failed, falling back to Google IME:", err);
      }
    }

    // Cách B: Nhận diện tự động bằng Google Handwriting IME (qua Electron IPC hoặc direct fetch)
    if (captured.ink && captured.ink.length > 0) {
      try {
        const payload = {
          options: "enable_pre_space",
          requests: [{
            writing_guide: {
              writing_area_width: captured.width,
              writing_area_height: captured.height
            },
            language: "en",
            ink: captured.ink
          }]
        };

        let data = null;
        if (window.noteRenderer && typeof window.noteRenderer.recognizeHandwriting === "function") {
          data = await window.noteRenderer.recognizeHandwriting(payload);
        } else {
          const res = await fetch("https://www.google.com/inputtools/request?ime=handwriting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          data = await res.json();
        }

        if (data && data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.length > 0) {
          const candidates = data[1][0][1];
          console.log("Handwriting candidates:", candidates);

          // Cập nhật các gợi ý
          updateSuggestions(candidates, mode);

          statusText.innerText = "✓ Đã nhận diện thành công";
          statusText.style.color = okColor;
          return cleanMathFormula(candidates[0], mode);
        }
      } catch (err) {
        console.warn("Handwriting IME error:", err);
      }
    }

    statusText.innerText = "Gợi ý mặc định";
    statusText.style.color = "";
    return mode === "formula" ? "2x + 3 = 5" : "4x^2 - 3";
  }

  function updateSuggestions(candidates, mode) {
    suggestionsBox.innerHTML = "";
    const unique = [...new Set(candidates.map((c) => cleanMathFormula(c, mode)))].slice(0, 5);
    for (const expr of unique) {
      const span = document.createElement("span");
      span.className = "ai-sug-item";
      span.innerText = expr;
      span.addEventListener("click", () => {
        fnInput.value = expr;
      });
      suggestionsBox.appendChild(span);
    }
  }

  // 4. Cập nhật vị trí nút nổi (đặt phía dưới vùng chọn, tuyệt đối không che thanh công cụ)
  function updateFloatingButton() {
    const editor = window.__noteRendererEditor;
    if (!editor || !editor.sel || !editor.sel.strokes || editor.sel.strokes.size === 0) {
      btn.style.display = "none";
      menu.style.display = "none";
      return;
    }

    const box = editor.selectionBox();
    if (!box || !editor.scroller) {
      btn.style.display = "none";
      return;
    }

    lastSelectedBox = box;

    const scrollerRect = editor.scroller.getBoundingClientRect();
    const pageIndex = editor.sel.page;
    const pageOffset = (typeof editor.pageTop === "function")
      ? editor.pageTop(pageIndex)
      : (pageIndex * 1150);

    const docMidX = (box.x0 + box.x1) / 2;
    const docBotY = box.y1 + pageOffset;

    const screenX = scrollerRect.left + docMidX * editor.zoom - editor.scroller.scrollLeft;
    const screenBotY = scrollerRect.top + docBotY * editor.zoom - editor.scroller.scrollTop;

    // Tính biên trên an toàn: luôn nằm DƯỚI thanh công cụ chọn (.selection-bar) và thanh trên (.toolbar)
    let minTop = scrollerRect.top + 8;
    const selBar = document.querySelector(".selection-bar, .sel-bar");
    if (selBar) {
      const sr = selBar.getBoundingClientRect();
      if (sr.width > 0 && sr.height > 0) {
        minTop = Math.max(minTop, sr.bottom + 10);
      }
    }

    // Tính biên dưới an toàn: luôn nằm TRÊN thanh công cụ dưới / thanh sheet
    const btnH = btn.offsetHeight || 34;
    const btnW = btn.offsetWidth || 122;
    let maxTop = Math.min(window.innerHeight, scrollerRect.bottom) - btnH - 10;
    const bottomBars = document.querySelectorAll("aside.tools-bar.side-bottom, .sheet-bar");
    for (const bar of bottomBars) {
      const br = bar.getBoundingClientRect();
      if (br.width > 0 && br.height > 0 && br.top > window.innerHeight * 0.5) {
        maxTop = Math.min(maxTop, br.top - btnH - 10);
      }
    }
    if (maxTop < minTop) maxTop = minTop;

    // Ưu tiên hạ nút xuống NGAY DƯỚI khung chọn (không bao giờ đè lên .sel-bar ở trên)
    const desiredTop = screenBotY + 12;
    const finalTop = Math.max(minTop, Math.min(maxTop, desiredTop));
    const finalLeft = Math.max(10, Math.min(window.innerWidth - btnW - 10, screenX - btnW / 2));

    btn.style.left = `${Math.round(finalLeft)}px`;
    btn.style.top = `${Math.round(finalTop)}px`;
    btn.style.display = "flex";
  }

  setInterval(updateFloatingButton, 200);

  // Mở menu (tự mở lên trên nếu nút nằm gần đáy màn hình)
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = btn.getBoundingClientRect();
    menu.style.display = "flex";
    const menuH = menu.offsetHeight || 140;
    const menuW = menu.offsetWidth || 260;
    const left = Math.max(10, Math.min(window.innerWidth - menuW - 10, rect.left));
    const top = (rect.bottom + 6 + menuH <= window.innerHeight - 10)
      ? rect.bottom + 6
      : Math.max(10, rect.top - menuH - 6);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  });

  window.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.style.display = "none";
    }
  });

  // Mở modal và bắt đầu nhận diện
  async function openModal(mode) {
    menu.style.display = "none";
    targetMode = mode;

    if (mode === "graph") {
      modalTitle.innerText = "Biến nét vẽ thành Đồ thị hàm số";
      inputLabel.innerText = "Biểu thức hàm số y = f(x):";
      confirmBtn.innerText = "⚡ Vẽ đồ thị ngay";
    } else {
      modalTitle.innerText = "Biến nét vẽ thành Công thức toán (LaTeX)";
      inputLabel.innerText = "Công thức toán học:";
      confirmBtn.innerText = "⚡ Chèn công thức";
    }

    const editor = window.__noteRendererEditor;
    const captured = captureSelectedStrokes(editor);
    if (captured && captured.dataUrl) {
      previewImg.src = captured.dataUrl;
      previewImg.style.display = "block";
    } else {
      previewImg.style.display = "none";
    }

    fnInput.value = "Đang nhận diện...";
    modal.style.display = "flex";

    // Thực hiện nhận diện tự động đúng mode
    const recognized = await recognizeHandwriting(captured, mode);
    fnInput.value = recognized;

    fnInput.focus();
    fnInput.select();
  }

  document.getElementById("opt-graph").addEventListener("click", () => openModal("graph"));
  document.getElementById("opt-formula").addEventListener("click", () => openModal("formula"));

  // Cấu hình AI Key (Ưu tiên mở Cài đặt -> API Key & MEA đồng bộ với MatrixExamAI Pro)
  document.getElementById("opt-config-gemini").addEventListener("click", async () => {
    menu.style.display = "none";
    if (typeof window.openMinNoteMeaSettings === "function" && window.openMinNoteMeaSettings()) {
      return;
    }
    const current = localStorage.getItem("note_gemini_api_key") || "";
    const key = window.MinNoteDialog
      ? await window.MinNoteDialog.prompt({
          title: "Cấu hình Gemini API Key",
          message: "Nhập Google Gemini API Key dự phòng để nhận diện chữ viết tay toán học (ưu tiên cấu hình chung tại Cài đặt → API Key & MEA):",
          defaultValue: current,
          placeholder: "AIza...",
          confirmText: "Lưu API Key",
          cancelText: "Hủy"
        })
      : null;
    if (key !== null) {
      localStorage.setItem("note_gemini_api_key", key.trim());
      const msg = key.trim() ? "Đã lưu Gemini API Key thành công!" : "Đã xóa API Key.";
      if (window.MinNoteDialog) window.MinNoteDialog.alert(msg, "Cấu hình API Key");
    }
  });

  function closeModal() {
    modal.style.display = "none";
  }
  cancelBtn.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);

  // 5. Thực hiện chèn Đồ thị hoặc Công thức
  confirmBtn.addEventListener("click", async () => {
    const editor = window.__noteRendererEditor;
    if (!editor || !lastSelectedBox) {
      closeModal();
      return;
    }

    const rawVal = fnInput.value.trim() || (targetMode === "formula" ? "2x + 3 = 5" : "4x^2 - 3");
    const box = lastSelectedBox;

    // 1. Xóa nét chữ viết tay cũ
    if (editor.deleteSelection) {
      editor.deleteSelection();
    }

    // 2. Chèn Item
    if (targetMode === "graph") {
      const cleanExpr = cleanMathFormula(rawVal, "graph");
      const w = Math.max(340, Math.min(520, box.x1 - box.x0 + 60));
      const h = Math.max(240, Math.min(380, box.y1 - box.y0 + 60));

      const graphItem = {
        id: "g_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        type: "graph",
        x: box.x0,
        y: box.y0,
        w: w,
        h: h,
        xmin: -10,
        xmax: 10,
        ymin: -7,
        ymax: 7,
        stepX: 2,
        stepY: 2,
        grid: true,
        fns: [{ expr: cleanExpr, color: "#c00000" }]
      };
      editor.insertItem(graphItem);
    } else {
      // Chèn công thức toán
      const latex = rawVal;
      try {
        let svgRes = null;
        if (typeof window.__noteRendererRenderFormula === "function") {
          svgRes = await window.__noteRendererRenderFormula(latex, "#000000", true);
        } else if (window.noteRenderer && typeof window.noteRenderer.renderFormula === "function") {
          const rawSvg = await window.noteRenderer.renderFormula(latex, "#000000", true);
          if (rawSvg) svgRes = { svg: rawSvg, width: 4, height: 1.5 };
        }

        if (svgRes && svgRes.svg) {
          const formulaItem = {
            id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            type: "formula",
            x: box.x0,
            y: box.y0,
            w: Math.max(80, svgRes.width * 46),
            h: Math.max(30, svgRes.height * 46),
            latex: latex,
            color: "#000000",
            display: true,
            size: 46,
            svg: svgRes.svg
          };
          editor.insertItem(formulaItem);
        } else {
          if (window.MinNoteDialog) window.MinNoteDialog.alert("Không thể dựng ảnh công thức toán. Vui lòng kiểm tra lại biểu thức LaTeX.", "Lưu ý");
        }
      } catch (err) {
        console.error("Formula insertion error:", err);
        if (window.MinNoteDialog) window.MinNoteDialog.alert("Lỗi khi chèn công thức: " + err.message, "Thông báo lỗi");
      }
    }

    closeModal();
    btn.style.display = "none";
  });
})();
