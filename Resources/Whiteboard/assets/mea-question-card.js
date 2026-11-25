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
 * MinNote • Interactive Question Card Engine (Thẻ Câu Hỏi & Kho NHCH)
 * Tác giả: Đỗ Miinh Math (MatrixExamAI Pro / MinNote C99 Core)
 * Chức năng:
 *  - Quản lý Kho Đề Thi & Ngân Hàng Câu Hỏi Toán học (NHCH)
 *  - Thẻ câu hỏi tương tác trên Canvas: chọn đáp án, hiện lời giải, kéo thả, thu phóng
 *  - Chế độ vẽ đè: Bút, phấn, tẩy vẽ xuyên qua thẻ tự nhiên khi không dùng công cụ Chọn
 *  - Tùy chỉnh màu sắc tùy ý (6 theme: Slate Teal, Chalkboard, Midnight, Glass, Light, Wood)
 *  - Nháy đúp (double click) mở modal chỉnh sửa nội dung tức thì với preview KaTeX
 *  - Tối ưu GPU Hardware Acceleration (translate3d, 120 FPS, không giật lag)
 */

(function () {
  'use strict';

  // 1. STATE TOÀN CỤC CHO THẺ CÂU HỎI TRÊN CÁC TRANG
  window.__meaQuestionCards = window.__meaQuestionCards || {};
  window.__meaActiveQbTab = window.__meaActiveQbTab || 'mea_live'; // 'mea_live' | 'exams' | 'html_lessons' | 'storage' | 'settings'
  window.__meaActiveExam = window.__meaActiveExam || null;
  window.__meaExamQuestionFilter = window.__meaExamQuestionFilter || '';

  // Cài đặt mặc định của Question Card Engine
  function getQcSettings() {
    try {
      const raw = localStorage.getItem('mea_qc_settings');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      position: 'bottom_screen', // 'bottom_screen' (mặc định) | 'bottom_page' | 'top'
      theme: 'dark-teal',
      fontSize: 16,
      autoHideWhenDrawing: true,
      wideLayout: true
    };
  }

  function saveQcSettings(settings) {
    try {
      localStorage.setItem('mea_qc_settings', JSON.stringify(settings));
    } catch (_) {}
  }

  // Hộp thoại xác nhận In-App chuẩn MinNote (Không block dispatcher, chống treo/deadlock)
  if (typeof window.meaConfirm !== 'function') {
  window.meaConfirm = function ({ title = 'Xác nhận', message = 'Bạn có chắc chắn?', confirmText = 'Xác nhận', cancelText = 'Hủy bỏ', isDanger = true }) {
    return new Promise(resolve => {
      let modal = document.getElementById('mea-confirm-modal-overlay');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mea-confirm-modal-overlay';
        modal.className = 'mea-confirm-modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="mea-confirm-dialog ${isDanger ? 'danger' : 'info'}">
          <div class="mea-confirm-header">
            <div class="mea-confirm-icon-box ${isDanger ? 'danger' : 'info'}">
              ${isDanger ? '🗑️' : 'ℹ️'}
            </div>
            <div class="mea-confirm-title">${title}</div>
          </div>
          <div class="mea-confirm-message">${message}</div>
          <div class="mea-confirm-actions">
            <button class="mea-confirm-btn cancel" id="mea-confirm-btn-cancel">${cancelText}</button>
            <button class="mea-confirm-btn ${isDanger ? 'danger' : 'primary'}" id="mea-confirm-btn-ok">${confirmText}</button>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      function cleanup(res) {
        modal.style.display = 'none';
        window.removeEventListener('keydown', handleKey);
        resolve(res);
      }

      function handleKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          cleanup(true);
        }
      }

      const btnCancel = document.getElementById('mea-confirm-btn-cancel');
      const btnOk = document.getElementById('mea-confirm-btn-ok');
      if (btnCancel) btnCancel.onclick = () => cleanup(false);
      if (btnOk) btnOk.onclick = () => cleanup(true);
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(false);
      };

      window.addEventListener('keydown', handleKey);
      if (btnOk) btnOk.focus();
    });
  };
  }

  if (typeof window.meaAlert !== 'function') {
  window.meaAlert = function (message, title = 'Thông báo') {
    return new Promise(resolve => {
      let modal = document.getElementById('mea-confirm-modal-overlay');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mea-confirm-modal-overlay';
        modal.className = 'mea-confirm-modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="mea-confirm-dialog info">
          <div class="mea-confirm-header">
            <div class="mea-confirm-icon-box info">ℹ️</div>
            <div class="mea-confirm-title">${title}</div>
          </div>
          <div class="mea-confirm-message">${message}</div>
          <div class="mea-confirm-actions">
            <button class="mea-confirm-btn primary" id="mea-confirm-btn-ok">Đã hiểu</button>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      function cleanup() {
        modal.style.display = 'none';
        window.removeEventListener('keydown', handleKey);
        resolve();
      }

      function handleKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          cleanup();
        }
      }

      const btnOk = document.getElementById('mea-confirm-btn-ok');
      if (btnOk) btnOk.onclick = () => cleanup();
      modal.onclick = (e) => {
        if (e.target === modal) cleanup();
      };

      window.addEventListener('keydown', handleKey);
      if (btnOk) btnOk.focus();
    });
  };
  }


  // Lấy tham chiếu Board từ NoteRenderer Core
  function getBoard() {
    return window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current);
  }

  // Kiểm tra công cụ hiện tại có phải công cụ Chọn (Select tool) hay không
  function isSelectionToolActive() {
    try {
      const board = getBoard();
      if (board && board.tool) {
        const k = board.tool.k;
        return k === 'select' || (k === 'geo' && board.tool.t === 'move');
      }
      const selectBtn = document.querySelector('.tb[title*="Chọn"], .tb[title*="Select"], .tb[data-tool="select"]');
      if (selectBtn && (selectBtn.classList.contains('active') || selectBtn.classList.contains('on'))) return true;
    } catch (_) {}
    return false;
  }
  window.isSelectionToolActive = isSelectionToolActive;

  // 2. KATEX MATH RENDERING HELPER (OFFLINE LOCAL)
  function renderMath(text) {
    if (text === null || text === undefined) return '';
    text = String(text);
    if (!text) return '';
    if (typeof katex === 'undefined') return text.replace(/\r?\n/g, '<br>');

    const tokens = [];
    let tokIdx = 0;
    const holdMath = function (tex, displayMode, rawFallback) {
      const key = '\u0000MEAKM' + (tokIdx++) + '\u0000';
      try {
        tokens.push({
          key: key,
          html: katex.renderToString(tex.trim(), { displayMode: !!displayMode, throwOnError: false })
        });
      } catch (e) {
        tokens.push({ key: key, html: rawFallback });
      }
      return key;
    };

    // Display math: $$...$$ hoặc \[...\]
    let res = text.replace(/\$\$([\s\S]*?)\$\$/g, function (m, tex) {
      return holdMath(tex, true, m);
    });
    res = res.replace(/\\\[([\s\S]*?)\\\]/g, function (m, tex) {
      return holdMath(tex, true, m);
    });
    // Inline math: $...$ hoặc \(...\)
    res = res.replace(/\$([^\$\n\r]+?)\$/g, function (m, tex) {
      return holdMath(tex, false, m);
    });
    res = res.replace(/\\\(([\s\S]*?)\\\)/g, function (m, tex) {
      return holdMath(tex, false, m);
    });

    // Replace line breaks ONLY outside KaTeX HTML/SVG markup so <svg><path d="..."></path></svg> stays valid
    res = res.replace(/\r?\n/g, '<br>');
    for (let i = 0; i < tokens.length; i++) {
      res = res.split(tokens[i].key).join(tokens[i].html);
    }
    return res;
  }

  // 3. KHỞI TẠO VÀ GẮN LAYER THẺ CÂU HỎI TRỰC TIẾP VÀO BOARD HOST
  function ensureQuestionCardsLayer() {
    let layer = document.getElementById('mea-question-cards-layer');
    const board = getBoard();
    const targetParent = (board && board.host) || document.querySelector('.board-wrap') || document.getElementById('root') || document.body;

    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'mea-question-cards-layer';
      layer.className = 'mea-question-cards-layer';
      targetParent.appendChild(layer);
    } else if (board && board.host && layer.parentElement !== board.host) {
      board.host.appendChild(layer);
    }
    return layer;
  }

  // Tính toán tọa độ màn hình chính xác tuyệt đối (Pixel Perfect)
  function getCardScreenRect(board, pageIdx, card) {
    if (board && typeof board.screenRect === 'function') {
      return board.screenRect(pageIdx, card);
    }
    const zoom = (board && board.zoom) || 1;
    const pageTop = (board && typeof board.pageTop === 'function') ? board.pageTop(pageIdx) : (pageIdx * 1754);
    const scrollLeft = (board && board.scroller) ? board.scroller.scrollLeft : 0;
    const scrollTop = (board && board.scroller) ? board.scroller.scrollTop : 0;
    const offsetX = (board && board.offsetX) || 0;
    return {
      left: card.x * zoom + offsetX - scrollLeft,
      top: (pageTop + card.y) * zoom - scrollTop,
      zoom: zoom
    };
  }

  // 4. CẬP NHẬT TỌA ĐỘ VÀ ZOOM CHO CÁC THẺ (TỐI ƯU GPU TRANSLATE3D + RAF)
  let isCardUpdatePending = false;
  function scheduleUpdateAllCards() {
    if (isCardUpdatePending) return;
    isCardUpdatePending = true;
    requestAnimationFrame(() => {
      isCardUpdatePending = false;
      updateAllCardPositions();
    });
  }

  function updateAllCardPositions() {
    if (typeof window.updateAllMindmapCardPositions === 'function') {
      window.updateAllMindmapCardPositions();
    }
    const board = getBoard();
    if (!board) return;

    const layer = ensureQuestionCardsLayer();
    const vh = window.innerHeight;
    const settings = getQcSettings();
    const isSelecting = isSelectionToolActive();

    // Đồng bộ class trên layer
    if (settings.autoHideWhenDrawing) {
      if (isSelecting) {
        layer.classList.add('select-mode-active');
        layer.classList.remove('drawing-mode-active');
      } else {
        layer.classList.add('drawing-mode-active');
        layer.classList.remove('select-mode-active');
      }
    } else {
      layer.classList.add('select-mode-active');
      layer.classList.remove('drawing-mode-active');
    }

    for (const pageIdxStr in window.__meaQuestionCards) {
      const pageIdx = parseInt(pageIdxStr, 10);
      const cardState = window.__meaQuestionCards[pageIdx];
      if (!cardState) continue;

      let cardEl = document.getElementById(`mea-qc-card-${pageIdx}`);
      if (!cardEl) {
        cardEl = renderCardElement(pageIdx, cardState);
        layer.appendChild(cardEl);
      }

      // Trạng thái vẽ đè vs chọn
      if (settings.autoHideWhenDrawing && !isSelecting) {
        cardEl.classList.add('drawing-mode');
        cardEl.classList.remove('select-mode');
      } else {
        cardEl.classList.remove('drawing-mode');
        cardEl.classList.add('select-mode');
      }

      // Lấy tọa độ màn hình thực tế từ engine MinNote
      const rect = getCardScreenRect(board, pageIdx, {
        x: cardState.x,
        y: cardState.y,
        w: cardState.w,
        h: cardState.h
      });

      const cardH = cardEl.offsetHeight || cardState.h;
      const zoom = rect.zoom || board.zoom || 1;

      // Không ẩn oan uổng thẻ khi cuộn: chỉ ẩn khi thẻ nằm hoàn toàn ngoài biên 2500px
      if (rect.top + (cardH * zoom) < -2500 || rect.top > vh + 2500) {
        cardEl.style.display = 'none';
      } else {
        cardEl.style.display = 'flex';
        cardEl.style.left = '0px';
        cardEl.style.top = '0px';
        cardEl.style.width = `${Math.round(cardState.w)}px`;
        // GPU Hardware-accelerated translate3d: mượt mà, không giật lag
        cardEl.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0) scale(${zoom})`;
        cardEl.style.transformOrigin = '0 0';
        cardEl.style.willChange = 'transform';
      }
    }
  }

  // 5. RENDER NỘI DUNG 1 THẺ CÂU HỎI TƯƠNG TÁC
  function renderCardElement(pageIdx, card) {
    const q = card.question;
    const el = document.createElement('div');
    el.id = `mea-qc-card-${pageIdx}`;
    
    // Cài đặt theme
    const themeCls = 'theme-' + (card.theme || getQcSettings().theme || 'dark-teal');
    el.className = `mea-qc-card ${themeCls}`;
    if (card.w > 700) el.classList.add('wide-layout');
    el.style.setProperty('--qc-font-size', `${card.fontSize || 16}px`);

    // Normalize fields from both local question bank & MatrixExamAI Pro sync
    const qCode = q.code || q.title || ('Câu ' + (pageIdx + 1));
    const qCorrect = String(q.correctAnswer || q.answer || '').trim().toUpperCase();
    const qExplanation = q.explanation || q.solution || '';

    // Build extra resolved images gallery only if not already embedded in q.content
    let extraImagesHtml = '';
    if (Array.isArray(q.resolvedImages) && q.resolvedImages.length > 0 && !/<img\b/i.test(String(q.content || ''))) {
      const imgTags = q.resolvedImages
        .map((it) => {
          const src = typeof it === 'string' ? it : (it && (it.dataUrl || it.url || it.src || ''));
          return src ? `<img src="${src}" alt="Hình minh họa câu hỏi" />` : '';
        })
        .filter(Boolean)
        .join('');
      if (imgTags) {
        extraImagesHtml = `<div class="mea-qc-resolved-imgs">${imgTags}</div>`;
      }
    }

    // Render Options HTML
    let optionsHtml = '';
    if (q.options && typeof q.options === 'object') {
      let entries = [];
      if (Array.isArray(q.options)) {
        entries = q.options.map((val, idx) => [String.fromCharCode(65 + idx), val]);
      } else {
        entries = Object.entries(q.options).sort((a, b) => a[0].localeCompare(b[0]));
      }
      const correctAns = qCorrect;
      for (const [k, optVal] of entries) {
        const kUpper = String(k).toUpperCase();
        const isSel = String(card.userSelected || '').toUpperCase() === kUpper;
        let stateCls = isSel ? 'selected' : '';
        if (card.isRevealed) {
          const isCorrectKey = correctAns === kUpper;
          if (isCorrectKey) {
            stateCls += ' is-correct';
          } else if (isSel) {
            stateCls += ' is-wrong';
          }
        }

        optionsHtml += `
          <div class="mea-qc-option ${stateCls}" data-key="${kUpper}" onclick="window.selectQcOption(${pageIdx}, '${kUpper}')">
            <span class="mea-qc-opt-key">${kUpper}</span>
            <div class="mea-qc-opt-text">${renderMath(optVal)}</div>
          </div>
        `;
      }
    }

    // Render Status Badge
    let badgeHtml = '';
    if (card.isRevealed) {
      const correctKey = qCorrect;
      if (!card.userSelected) {
        badgeHtml = `<span class="mea-qc-result-badge info">Đáp án: ${correctKey || '—'}</span>`;
      } else if (card.userSelected.toUpperCase() === correctKey) {
        badgeHtml = `<span class="mea-qc-result-badge correct">✓ Chính xác! Đáp án đúng: ${correctKey}</span>`;
      } else {
        badgeHtml = `<span class="mea-qc-result-badge wrong">✗ Bạn chọn ${card.userSelected}. Đáp án đúng: ${correctKey || '—'}</span>`;
      }
    }

    el.innerHTML = `
      <!-- Header -->
      <div class="mea-qc-header" onpointerdown="window.startDragQc(event, ${pageIdx})">
        <div class="mea-qc-drag-indicator">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
          </svg>
          <span class="mea-qc-badge-num">${qCode}</span>
          ${q.level ? `<span class="mea-qc-badge-level">${q.level}</span>` : ''}
          ${q.topic ? `<span class="mea-qc-badge-topic" title="${q.topic}">${q.topic}</span>` : ''}
        </div>

        <div class="mea-qc-header-actions" onpointerdown="event.stopPropagation()">
          <button class="mea-qc-tool-btn" onclick="window.openEditQuestionModal(${pageIdx})" title="Chỉnh sửa nội dung câu hỏi (Nháy đúp vào thẻ)">✏️</button>
          <button class="mea-qc-tool-btn" onclick="window.cycleCardTheme(${pageIdx})" title="Đổi màu sắc thẻ câu hỏi (Slate / Bảng phấn / Đen OLED / Kính / Giấy / Gỗ)">🎨</button>
          <button class="mea-qc-tool-btn" onclick="window.changeQcFontSize(${pageIdx}, -1)" title="Giảm cỡ chữ (A-)">A-</button>
          <span class="mea-qc-font-indicator">${card.fontSize || 16}</span>
          <button class="mea-qc-tool-btn" onclick="window.changeQcFontSize(${pageIdx}, 1)" title="Tăng cỡ chữ (A+)">A+</button>
          <button class="mea-qc-tool-btn" onclick="window.toggleCollapseQc(${pageIdx})" title="Thu gọn / Mở rộng">${card.isCollapsed ? '□' : '_'}</button>
          <button class="mea-qc-tool-btn danger" onclick="window.removeQcCard(${pageIdx})" title="Gỡ thẻ câu hỏi khỏi trang này">✕</button>
        </div>
      </div>

      <!-- Body -->
      <div class="mea-qc-body" style="${card.isCollapsed ? 'display:none;' : ''}">
        <div class="mea-qc-content">
          ${renderMath(q.content)}
          ${extraImagesHtml}
        </div>

        ${optionsHtml ? `<div class="mea-qc-options-grid">${optionsHtml}</div>` : ''}
      </div>

      <!-- Explanation Box -->
      <div class="mea-qc-explanation ${card.isRevealed ? 'visible' : ''}">
        <div class="mea-qc-explanation-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Hướng Dẫn Giải Chi Tiết
        </div>
        <div class="mea-qc-explanation-text">
          ${renderMath(qExplanation || 'Chưa có lời giải chi tiết cho câu hỏi này.')}
        </div>
      </div>

      <!-- Footer -->
      <div class="mea-qc-footer" style="${card.isCollapsed ? 'display:none;' : ''}">
        <button class="mea-qc-btn-reveal ${card.isRevealed ? 'active' : ''}" onclick="window.toggleQcReveal(${pageIdx})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${card.isRevealed 
              ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
              : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
            }
          </svg>
          ${card.isRevealed ? 'Ẩn Đáp án & Lời giải' : 'Hiện Đáp án & Lời giải'}
        </button>

        ${badgeHtml}
      </div>

      <!-- Resizer Handle -->
      <div class="mea-qc-resizer" onpointerdown="window.startResizeQc(event, ${pageIdx})"></div>
    `;

    // Nháy đúp (double-click) để mở Modal chỉnh sửa câu hỏi tức thì
    el.addEventListener('dblclick', function (e) {
      if (e.target.closest('.mea-qc-tool-btn') || e.target.closest('.mea-qc-btn-reveal') || e.target.closest('.mea-qc-option')) return;
      e.preventDefault();
      e.stopPropagation();
      window.openEditQuestionModal(pageIdx);
    });

    return el;
  }

  // 6. ĐỔI CHẾ ĐỘ MÀU SẮC THẺ (CYCLE THEME)
  const THEME_LIST = ['dark-teal', 'chalkboard', 'midnight', 'glass', 'light', 'wood'];
  window.cycleCardTheme = function (pageIdx) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    let curIdx = THEME_LIST.indexOf(card.theme || 'dark-teal');
    let nextIdx = (curIdx + 1) % THEME_LIST.length;
    card.theme = THEME_LIST[nextIdx];

    const el = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (el) {
      THEME_LIST.forEach(t => el.classList.remove('theme-' + t));
      el.classList.add('theme-' + card.theme);
    }
  };

  // 7. CHỌN PHƯƠNG ÁN TRẢ LỜI
  window.selectQcOption = function (pageIdx, key) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    card.userSelected = (card.userSelected === key) ? null : key;
    const el = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (el) {
      const newEl = renderCardElement(pageIdx, card);
      el.replaceWith(newEl);
      scheduleUpdateAllCards();
    }
  };

  // 8. BẬT / TẮT HIỆN ĐÁP ÁN & LỜI GIẢI
  window.toggleQcReveal = function (pageIdx) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    card.isRevealed = !card.isRevealed;
    const el = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (el) {
      const newEl = renderCardElement(pageIdx, card);
      el.replaceWith(newEl);
      scheduleUpdateAllCards();
    }
  };

  // 9. THU GỌN / MỞ RỘNG THẺ
  window.toggleCollapseQc = function (pageIdx) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    card.isCollapsed = !card.isCollapsed;
    const el = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (el) {
      const newEl = renderCardElement(pageIdx, card);
      el.replaceWith(newEl);
      scheduleUpdateAllCards();
    }
  };

  // 10. TĂNG / GIẢM CỠ CHỮ
  window.changeQcFontSize = function (pageIdx, delta) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    card.fontSize = Math.max(12, Math.min(36, (card.fontSize || 16) + delta));
    const el = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (el) {
      el.style.setProperty('--qc-font-size', `${card.fontSize}px`);
      const ind = el.querySelector('.mea-qc-font-indicator');
      if (ind) ind.textContent = card.fontSize;
    }
  };

  // 11. XÓA THẺ CÂU HỎI
  window.removeQcCard = async function (pageIdx) {
    const ok = await window.meaConfirm({
      title: 'Gỡ Thẻ Câu Hỏi',
      message: 'Bạn có chắc muốn gỡ thẻ câu hỏi này khỏi trang bảng viết?',
      confirmText: 'Gỡ thẻ',
      cancelText: 'Giữ lại',
      isDanger: true
    });
    if (ok) {
      delete window.__meaQuestionCards[pageIdx];
      const el = document.getElementById(`mea-qc-card-${pageIdx}`);
      if (el) el.remove();
    }
  };

  // 12. KÉO THẢ DI CHUYỂN THẺ (SMOOTH DRAG 120 FPS)
  window.startDragQc = function (e, pageIdx) {
    if (e.button !== 0) return;
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    const board = getBoard();
    const zoom = (board && board.zoom) || 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = card.x;
    const initY = card.y;

    const cardEl = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (cardEl) {
      cardEl.classList.add('is-dragging');
      if (e.target.setPointerCapture) {
        try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }

    function onPointerMove(moveEvent) {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      card.x = initX + dx;
      card.y = initY + dy;
      scheduleUpdateAllCards();
    }

    function onPointerUp(upEvent) {
      if (cardEl) {
        cardEl.classList.remove('is-dragging');
        if (e.target.releasePointerCapture) {
          try { e.target.releasePointerCapture(upEvent.pointerId); } catch (_) {}
        }
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 13. RESIZE CHIỀU RỘNG THẺ
  window.startResizeQc = function (e, pageIdx) {
    if (e.button !== 0) return;
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    e.stopPropagation();
    const board = getBoard();
    const zoom = (board && board.zoom) || 1;
    const startX = e.clientX;
    const initW = card.w;
    const cardEl = document.getElementById(`mea-qc-card-${pageIdx}`);

    function onPointerMove(moveEvent) {
      const dw = (moveEvent.clientX - startX) / zoom;
      card.w = Math.max(340, Math.min(1600, initW + dw));
      if (cardEl) {
        cardEl.style.width = `${Math.round(card.w)}px`;
        if (card.w > 700) {
          cardEl.classList.add('wide-layout');
        } else {
          cardEl.classList.remove('wide-layout');
        }
      }
    }

    function onPointerUp() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      scheduleUpdateAllCards();
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 14. TÍNH TOÁN VỊ TRÍ CHÈN CÂU HỎI THEO CÀI ĐẶT
  function computeCardCoordinates(board, settings, cardH = 280) {
    const pw = board && board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;
    const ph = board && board.doc ? (board.doc.landscape ? 1240 : 1754) : 1754;

    const isWide = settings.wideLayout !== false;
    let w = isWide ? Math.round(pw - 120) : Math.min(860, pw - 120);
    let x = Math.round(Math.max(40, (pw - w) / 2));

    let y = 460; // Mặc định 'bottom_screen': Nửa dưới màn hình hiện tại (chừa 0..440 cho máy tính & viết bảng)
    if (settings.position === 'top') {
      y = 50;
    } else if (settings.position === 'bottom_page') {
      y = Math.round(Math.max(100, ph - cardH - 60)); // Đáy trang A4 (~1414px)
    }

    return { x, y, w, h: cardH };
  }

  // 15. CHÈN 1 CÂU HỎI VÀO TRANG CỤ THỂ
  window.insertQuestionToPage = function (q, targetPageIndex, isNewPage = false) {
    const board = getBoard();
    if (!board) {
      showToast('Chưa khởi tạo bảng viết MinNote!');
      return false;
    }

    let finalPageIdx = targetPageIndex;

    if (isNewPage) {
      if (typeof board.addPage === 'function') {
        board.addPage();
        finalPageIdx = board.doc ? (board.doc.pages.length - 1) : (targetPageIndex + 1);
      }
    }

    const settings = getQcSettings();
    const coords = computeCardCoordinates(board, settings, 280);

    window.__meaQuestionCards[finalPageIdx] = {
      id: 'qc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      pageIndex: finalPageIdx,
      question: q,
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      theme: settings.theme || 'dark-teal',
      fontSize: settings.fontSize || 16,
      isCollapsed: false,
      userSelected: null,
      isRevealed: false
    };

    if (typeof board.goToPage === 'function') {
      board.goToPage(finalPageIdx);
    }

    // Nếu chọn vị trí đáy trang giấy (bottom_page), tự động cuộn xuống để người dùng thấy ngay câu hỏi
    if (settings.position === 'bottom_page' && board.scroller) {
      const pageTop = (typeof board.pageTop === 'function') ? board.pageTop(finalPageIdx) : (finalPageIdx * 1754);
      board.scroller.scrollTop = (pageTop + (coords.y - 100)) * (board.zoom || 1);
    }

    scheduleUpdateAllCards();
    return true;
  };

  // 16. CHÈN TOÀN BỘ ĐỀ (MỖI CÂU 1 TRANG)
  window.insertEntireExamToPages = function (exam) {
    const board = getBoard();
    if (!board || !board.doc || !board.doc.pages) {
      showToast('Đang kết nối không gian bảng viết MinNote...');
      return;
    }

    if (!exam || !exam.questions || exam.questions.length === 0) {
      showToast('Đề thi này không có câu hỏi nào để chèn!');
      return;
    }

    const settings = getQcSettings();
    const totalQ = exam.questions.length;

    // Đảm bảo có đủ số lượng trang tương ứng
    while (board.doc.pages.length < totalQ) {
      if (typeof board.addPage === 'function') {
        board.addPage();
      } else {
        break;
      }
    }

    exam.questions.forEach((q, idx) => {
      const coords = computeCardCoordinates(board, settings, 280);
      window.__meaQuestionCards[idx] = {
        id: 'qc_' + Date.now() + '_' + idx,
        pageIndex: idx,
        question: q,
        x: coords.x,
        y: coords.y,
        w: coords.w,
        h: coords.h,
        theme: settings.theme || 'dark-teal',
        fontSize: settings.fontSize || 16,
        isCollapsed: false,
        userSelected: null,
        isRevealed: false
      };
    });

    if (typeof board.goToPage === 'function') {
      board.goToPage(0);
    }

    scheduleUpdateAllCards();
    window.closeQuestionBankModal();

    // Thông báo toast thành công
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: #2563eb;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.38);
      z-index: 100000;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: meaFadeIn 0.2s ease-out;
    `;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Đã thêm thành công ${totalQ} câu hỏi vào ${totalQ} trang MinNote!
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  // 17. GIAO DIỆN MODAL KHO ĐỀ & NGÂN HÀNG CÂU HỎI (ATELIER STUDIO SHELL)
  function escHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function formatModalQtype(qtype) {
    const map = {
      MultipleChoice4: 'Trắc nghiệm',
      TrueFalse4: 'Đúng / Sai',
      ShortAnswer: 'Trả lời ngắn',
      Essay: 'Tự luận',
      TN: 'Trắc nghiệm',
      DS: 'Đúng / Sai',
      TLN: 'Trả lời ngắn',
      TL: 'Tự luận'
    };
    const raw = String(qtype || '').trim();
    return map[raw] || raw;
  }

  function getModalLevelClass(level) {
    const s = String(level || '').trim().toLowerCase();
    if (s === 'nhận biết' || s === 'nb') return 'nb';
    if (s === 'thông hiểu' || s === 'th') return 'th';
    if (s === 'vận dụng' || s === 'vd') return 'vd';
    if (s === 'vận dụng cao' || s === 'vdc') return 'vdc';
    return 'neutral';
  }

  function renderQuestionWithInlineImgs(rawText, inlineImages) {
    const raw = String(rawText || '');
    if (!raw) return '';
    if (!inlineImages || typeof inlineImages !== 'object') {
      return renderMath(raw);
    }
    const parts = raw.split(/(\[HINH_ANH:\s*[^\]]+\])/gi);
    return parts.map(function (part) {
      const m = /^\[HINH_ANH:\s*([^\]]+)\]$/i.exec(part);
      if (m) {
        const fname = m[1].trim();
        const dataUrl = inlineImages[fname] || inlineImages[m[1]];
        if (dataUrl) {
          return `<span class="mn-qb-inline-img-wrap"><img class="mn-qb-inline-img" src="${escHtml(dataUrl)}" alt="${escHtml(fname)}" /></span>`;
        }
        return `<span class="mn-qb-missing-img">[Hình: ${escHtml(fname)}]</span>`;
      }
      return renderMath(part);
    }).join('');
  }

  const QB_ICONS = {
    book: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    db: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
    layers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    sliders: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    codeFile: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>',
    refresh: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',
    cog: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.79 1.02 1.44 1.09H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    plus: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    upload: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  function updateMeaSyncBadgesInDom(detail) {
    window.__meaLastBankMeta = detail || window.__meaLastBankMeta;
    const info = window.__meaLastBankMeta;
    if (!info) return;
    const total = Number(info.total || 0);
    const sourcesCount = Array.isArray(info.sources) ? info.sources.length : 0;

    const railCount = document.getElementById('mea-qb-rail-mea-count');
    if (railCount) railCount.textContent = String(total);

    const statusPill = document.getElementById('mea-qb-live-status-pill');
    if (statusPill) {
      const srcNote = sourcesCount > 1 ? `${sourcesCount} kho SQLite` : 'MatrixExamAI Pro';
      statusPill.innerHTML = `<span class="mea-qb-status-dot"></span><span>${total} câu • ${escHtml(srcNote)}</span>`;
      statusPill.classList.add('connected');
    }
  }

  if (!window.__meaBankLoadedListenerAttached) {
    window.__meaBankLoadedListenerAttached = true;
    window.addEventListener('minnote:mea-bank-loaded', function (e) {
      updateMeaSyncBadgesInDom(e && e.detail);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      const overlay = document.getElementById('mea-qb-modal-overlay');
      if (!overlay || overlay.style.display !== 'flex') return;
      const editOv = document.getElementById('mea-qc-edit-overlay');
      const confOv = document.getElementById('mea-confirm-modal-overlay');
      const pasteOv = document.getElementById('mea-paste-html-overlay');
      const presOv = document.getElementById('mea-presentation-overlay');
      const htmlPresOv = document.getElementById('mea-html-presentation-overlay');
      if ((editOv && editOv.style.display === 'flex') ||
          (confOv && confOv.style.display === 'flex') ||
          (pasteOv && pasteOv.style.display === 'flex') ||
          (presOv && presOv.style.display === 'flex') ||
          (htmlPresOv && htmlPresOv.style.display === 'flex')) {
        return;
      }
      window.closeQuestionBankModal();
    });
  }

  window.openQuestionBankModal = function () {
    let overlay = document.getElementById('mea-qb-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mea-qb-modal-overlay';
      overlay.className = 'mea-qb-modal-overlay';
      overlay.onclick = function (e) {
        if (e.target === overlay) window.closeQuestionBankModal();
      };
      document.body.appendChild(overlay);
    }

    if (!window.__meaActiveExam && window.__meaExamsList.length > 0) {
      window.__meaActiveExam = window.__meaExamsList[0];
    }

    renderQuestionBankModalContent(overlay);
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';

    // Silently sync grouped topic exams from SQLite on first open in MinNote Desktop
    if (!window.__meaLegacySyncRequested &&
        window.MinNoteMeaSync &&
        typeof window.MinNoteMeaSync.isDesktopBridge === 'function' &&
        window.MinNoteMeaSync.isDesktopBridge() &&
        window.chrome &&
        window.chrome.webview) {
      window.__meaLegacySyncRequested = true;
      window.__meaSuppressNextLegacyToast = true;
      try { window.chrome.webview.postMessage({ type: 'GET_QUESTION_BANK_DATA' }); } catch (_) {}
    }
  };

  window.closeQuestionBankModal = function () {
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
    }
  };

  window.toggleQuestionBankModal = function () {
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay && overlay.style.display === 'flex') {
      window.closeQuestionBankModal();
    } else {
      window.openQuestionBankModal();
    }
  };

  function buildExamQuestionsHtml(activeExam, query) {
    const qList = (activeExam && Array.isArray(activeExam.questions)) ? activeExam.questions : [];
    const kw = String(query || '').trim().toLowerCase();
    const matched = [];
    qList.forEach(function (q, idx) {
      if (!kw) {
        matched.push({ q: q, idx: idx });
        return;
      }
      const haystack = [q.code, q.title, q.topic, q.level, q.content, q.explanation].join(' ').toLowerCase();
      if (haystack.includes(kw)) matched.push({ q: q, idx: idx });
    });

    if (matched.length === 0) {
      return `
        <div class="mn-qb-empty-state">
          ${QB_ICONS.book}
          <div class="mn-qb-empty-title">${kw ? 'Không có câu hỏi khớp từ khóa' : 'Chưa có câu hỏi trong đề này'}</div>
          <div class="mn-qb-empty-sub">${kw ? 'Thử xóa từ khóa lọc ở thanh trên.' : 'Chọn đề khác ở thanh bên trái hoặc bấm "+ Nạp" để thêm.'}</div>
        </div>
      `;
    }

    return matched.map(function (entry) {
      const q = entry.q;
      const idx = entry.idx;
      const inlineImgs = (q.inlineImages && typeof q.inlineImages === 'object') ? q.inlineImages : null;
      const qCorrect = String(q.correctAnswer || q.answer || '').trim();
      const qCorrectUpper = qCorrect.toUpperCase();
      const qtypeNorm = String(q.qtype || q.type || '').trim();
      const isTf = qtypeNorm === 'TrueFalse4' || qtypeNorm === 'DS';
      let optsHtml = '';
      if (q.options && typeof q.options === 'object') {
        const keys = Object.keys(q.options).sort(function (a, b) {
          return a.localeCompare(b, undefined, { numeric: true });
        });
        if (keys.length > 0) {
          optsHtml = '<div class="mn-qb-opts-grid">' + keys.map(function (k) {
            const isCorrect = !isTf && qCorrectUpper && qCorrectUpper === k.toUpperCase();
            return `
              <div class="mn-qb-opt-pill ${isCorrect ? 'is-correct' : ''}">
                <span class="mn-qb-opt-key">${escHtml(k)}</span>
                <div class="mn-qb-opt-val">${renderQuestionWithInlineImgs(q.options[k], inlineImgs)}</div>
              </div>
            `;
          }).join('') + '</div>';
        }
      }

      const levelCls = getModalLevelClass(q.level);
      const qtypeLabel = formatModalQtype(qtypeNorm);
      const explText = q.explanation || q.solution || '';
      const hasDrawer = !!(qCorrect || explText);

      return `
        <article class="mn-qb-card">
          <div class="mn-qb-card-head">
            <div class="mn-qb-badges">
              <span class="mn-qb-code-pill">${escHtml(q.code || q.title || ('Câu ' + (idx + 1)))}</span>
              ${q.grade ? `<span class="mn-qb-chip">Lớp ${escHtml(q.grade)}</span>` : ''}
              ${q.level ? `<span class="mn-qb-level-pill level-${levelCls}">${escHtml(q.level)}</span>` : ''}
              ${qtypeLabel ? `<span class="mn-qb-chip muted">${escHtml(qtypeLabel)}</span>` : ''}
              ${q.topic ? `<span class="mn-qb-topic-pill" title="${escHtml(q.topic)}">${escHtml(q.topic)}</span>` : ''}
            </div>
            <div class="mn-qb-card-actions">
              <button type="button" class="mn-qb-act-btn" onclick="window.startExamPresentation('${escHtml(activeExam ? activeExam.id : '')}', ${idx})" title="Trình chiếu câu hỏi này">Chiếu câu</button>
              <button type="button" class="mn-qb-act-btn primary" onclick="window.insertSingleQuestionFromBank(${idx}, false)">Chèn thẻ</button>
              <button type="button" class="mn-qb-act-btn" onclick="window.insertSingleQuestionFromBank(${idx}, true)">+ Trang mới</button>
            </div>
          </div>
          <div class="mn-qb-card-content">${renderQuestionWithInlineImgs(q.content, inlineImgs)}</div>
          ${optsHtml}
          ${hasDrawer ? `
            <details class="mn-qb-solution">
              <summary>
                <span>Đáp án &amp; Hướng dẫn giải</span>
                ${qCorrect ? `<span class="mn-qb-ans-pill">Đáp án: <strong>${escHtml(qCorrect)}</strong></span>` : ''}
              </summary>
              ${explText ? `<div class="mn-qb-solution-body">${renderQuestionWithInlineImgs(explText, inlineImgs)}</div>` : `<div class="mn-qb-solution-body">Đáp án: <strong>${escHtml(qCorrect)}</strong></div>`}
            </details>
          ` : ''}
        </article>
      `;
    }).join('');
  }

  // Render nội dung Modal Kho Đề & Ngân Hàng Câu Hỏi theo phong cách MinNote Atelier
  function renderQuestionBankModalContent(overlay) {
    const activeExam = window.__meaActiveExam || (window.__meaExamsList.length > 0 ? window.__meaExamsList[0] : null);
    const activeTab = window.__meaActiveQbTab || 'mea_live';
    const isMeaLiveTab = activeTab === 'mea_live';
    const isExamsTab = activeTab === 'exams';
    const isHtmlLessonsTab = activeTab === 'html_lessons';
    const isStorageTab = activeTab === 'storage';
    const isSettingsTab = activeTab === 'settings';
    const settings = getQcSettings();
    const htmlList = window.__meaHtmlLessons || [];
    const examsList = window.__meaExamsList || [];

    const bankMeta = window.__meaLastBankMeta;
    const meaCountText = bankMeta && bankMeta.total != null ? String(bankMeta.total) : '…';
    const statusPillHtml = bankMeta && bankMeta.total != null
      ? `<span class="mea-qb-status-dot"></span><span>${bankMeta.total} câu • ${bankMeta.sources && bankMeta.sources.length > 1 ? bankMeta.sources.length + ' kho SQLite' : 'MatrixExamAI Pro'}</span>`
      : `<span class="mea-qb-status-dot"></span><span>MatrixExamAI Pro</span>`;

    // Left rail exam sub-list (shown cleanly inside the rail when 'exams' is active)
    let examItemsHtml = '';
    examsList.forEach(function (ex) {
      const isActive = activeExam && activeExam.id === ex.id;
      const qCount = ex.questions ? ex.questions.length : 0;
      examItemsHtml += `
        <button type="button" class="mea-qb-exam-item ${isActive ? 'active' : ''}" onclick="window.selectActiveExam('${escHtml(ex.id)}')" title="${escHtml(ex.title)}">
          <div class="mea-qb-exam-name">${escHtml(ex.title)}</div>
          <div class="mea-qb-exam-meta">
            <span>${qCount} câu</span>
            <span>${ex.grade ? ('Lớp ' + escHtml(ex.grade)) : escHtml(ex.subject || 'Toán')}</span>
          </div>
        </button>
      `;
    });

    // Main workspace panel
    let mainContentHtml = '';

    if (isMeaLiveTab) {
      mainContentHtml = `<div id="mea-qb-live-sync-host" class="mea-qb-live-sync-host"></div>`;
    } else if (isHtmlLessonsTab) {
      const cardsHtml = htmlList.map(function (les) {
        const isActive = window.__meaActiveHtmlLesson && window.__meaActiveHtmlLesson.id === les.id;
        const kbSize = les.size ? (les.size / 1024).toFixed(1) : (les.htmlContent ? (les.htmlContent.length / 1024).toFixed(1) : '0');
        return `
          <article class="mea-qb-storage-card ${isActive ? 'active' : ''}">
            <div class="mea-qb-storage-card-head">
              <div class="mea-qb-storage-card-title">${escHtml(les.title)}</div>
              <span class="mn-qb-chip">${kbSize} KB</span>
            </div>
            <div class="mea-qb-storage-desc">${escHtml(les.description || 'Tài liệu bài giảng HTML5 tương tác + KaTeX.')}</div>
            <div class="mea-qb-storage-card-meta">
              <span>${escHtml(les.author || 'Thầy Đỗ Minh Math')}</span>
              <span>HTML5 + KaTeX</span>
            </div>
            <div class="mea-qb-storage-card-actions">
              <button type="button" class="mea-qb-btn primary sm" onclick="window.startFullHtmlPresentation('${escHtml(les.id)}')">
                ${QB_ICONS.play}
                <span>Trình chiếu (F5)</span>
              </button>
              <button type="button" class="mea-qb-btn sm" onclick="window.downloadHtmlLessonFile('${escHtml(les.id)}')" title="Tải file HTML về máy">
                ${QB_ICONS.download}
                <span>Tải HTML</span>
              </button>
              <button type="button" class="mea-qb-icon-btn danger" onclick="window.deleteHtmlLessonFromStorage('${escHtml(les.id)}')" title="Xóa bài giảng này khỏi kho">
                ${QB_ICONS.trash}
              </button>
            </div>
          </article>
        `;
      }).join('');

      mainContentHtml = `
        <div class="mea-qb-workspace-bar">
          <div class="mea-qb-ws-title-wrap">
            <h3 class="mea-qb-ws-title">Bài Giảng HTML Tương Tác</h3>
            <span class="mn-qb-chip">${htmlList.length} bài giảng</span>
          </div>
          <div class="mea-qb-ws-actions">
            <button type="button" class="mea-qb-btn sm" onclick="window.restoreDefaultHtmlLessons()">
              ${QB_ICONS.refresh}
              <span>Khôi phục mẫu</span>
            </button>
            <button type="button" class="mea-qb-btn sm" onclick="window.promptOpenHtmlFile()">
              ${QB_ICONS.upload}
              <span>Mở file HTML</span>
            </button>
            <button type="button" class="mea-qb-btn primary sm" onclick="window.openPasteHtmlModal()">
              ${QB_ICONS.codeFile}
              <span>Dán mã HTML (Ctrl+Shift+V)</span>
            </button>
          </div>
        </div>
        <div class="mea-qb-scroll-body">
          <div class="mea-html-dropband">
            <div class="mea-html-dropband-info">
              <div class="mea-html-dropband-title">Nạp &amp; trình chiếu bài giảng HTML toàn màn hình</div>
              <div class="mea-html-dropband-sub">Hỗ trợ sẵn KaTeX, Tailwind và bút chú thích trực tiếp khi giảng dạy. Dán mã nguồn hoặc mở tệp HTML từ máy để lưu vào kho.</div>
            </div>
            <div class="mea-html-dropband-btns">
              <button type="button" class="mea-qb-btn primary sm" onclick="window.openPasteHtmlModal()">Dán mã HTML</button>
              <button type="button" class="mea-qb-btn sm" onclick="window.promptOpenHtmlFile()">Chọn tệp HTML (F5)</button>
            </div>
          </div>
          <div class="mea-qb-storage-grid">
            ${cardsHtml || '<div class="mn-qb-empty-state"><div class="mn-qb-empty-title">Chưa có bài giảng HTML</div><div class="mn-qb-empty-sub">Mở tệp từ máy hoặc dán mã HTML để thêm bài giảng mới.</div></div>'}
          </div>
        </div>
      `;
    } else if (isStorageTab) {
      const cardsHtml = examsList.map(function (ex) {
        const isActive = activeExam && activeExam.id === ex.id;
        const qCount = ex.questions ? ex.questions.length : 0;
        return `
          <article class="mea-qb-storage-card ${isActive ? 'active' : ''}">
            <div class="mea-qb-storage-card-head">
              <div class="mea-qb-storage-card-title">${escHtml(ex.title)}</div>
              <span class="mn-qb-code-pill">${qCount} câu</span>
            </div>
            <div class="mea-qb-storage-card-meta">
              <span>${escHtml(ex.subject || 'Toán học')}</span>
              ${ex.grade ? `<span>Lớp ${escHtml(ex.grade)}</span>` : ''}
              ${ex.source ? `<span>${escHtml(ex.source)}</span>` : ''}
            </div>
            <div class="mea-qb-storage-card-actions">
              <button type="button" class="mea-qb-btn primary sm" onclick="window.selectActiveExam('${escHtml(ex.id)}'); window.switchQbTab('exams');">
                <span>Mở đề</span>
              </button>
              <button type="button" class="mea-qb-btn sm" onclick="window.startExamPresentation('${escHtml(ex.id)}', 0)" title="Trình chiếu Slide (F5)">
                ${QB_ICONS.play}
                <span>Chiếu</span>
              </button>
              <button type="button" class="mea-qb-btn sm" onclick="window.exportStandaloneHtmlPresentation('${escHtml(ex.id)}')" title="Xuất file HTML Slide độc lập">
                <span>HTML</span>
              </button>
              <button type="button" class="mea-qb-btn sm" onclick="window.exportExamAsJson('${escHtml(ex.id)}')" title="Xuất file JSON">
                <span>JSON</span>
              </button>
              <button type="button" class="mea-qb-icon-btn danger" onclick="window.deleteExamFromStorage('${escHtml(ex.id)}')" title="Xóa đề khỏi kho">
                ${QB_ICONS.trash}
              </button>
            </div>
          </article>
        `;
      }).join('');

      mainContentHtml = `
        <div class="mea-qb-workspace-bar">
          <div class="mea-qb-ws-title-wrap">
            <h3 class="mea-qb-ws-title">Kho Lưu Trữ Đề Thi</h3>
            <span class="mn-qb-chip">${examsList.length} bộ đề</span>
          </div>
          <div class="mea-qb-ws-actions">
            <button type="button" class="mea-qb-btn sm" onclick="window.syncSqliteExamsNow()">
              ${QB_ICONS.refresh}
              <span>Đồng bộ SQLite</span>
            </button>
            <button type="button" class="mea-qb-btn sm" onclick="window.restoreDefaultExams()">
              <span>Khôi phục đề mẫu</span>
            </button>
            ${activeExam ? `<button type="button" class="mea-qb-btn sm" onclick="window.saveActiveExamToStorage()">Lưu đề đang chọn</button>` : ''}
            <button type="button" class="mea-qb-btn primary sm" onclick="window.importExamFilePrompt()">
              ${QB_ICONS.plus}
              <span>Nạp file JSON</span>
            </button>
          </div>
        </div>
        <div class="mea-qb-scroll-body">
          <div class="mea-qb-storage-grid">${cardsHtml}</div>
        </div>
      `;
    } else if (isSettingsTab) {
      mainContentHtml = `
        <div class="mea-qb-workspace-bar">
          <div class="mea-qb-ws-title-wrap">
            <h3 class="mea-qb-ws-title">Cài Đặt Thẻ Câu Hỏi Trên Bảng</h3>
            <span class="mn-qb-chip muted">Áp dụng khi chèn thẻ câu hỏi</span>
          </div>
          <div class="mea-qb-ws-actions">
            <button type="button" class="mea-qb-btn primary sm" onclick="window.saveAndApplySettings()">
              ${QB_ICONS.check}
              <span>Lưu &amp; Áp dụng ngay</span>
            </button>
          </div>
        </div>
        <div class="mea-qb-scroll-body">
          <div class="mea-qb-settings-panel">
            <section class="mea-qb-settings-group">
              <div class="mea-qb-settings-group-title">1. Vị trí mặc định khi chèn câu hỏi</div>
              <label class="mea-qb-radio-label">
                <input type="radio" name="qc_pos" value="bottom_screen" ${settings.position === 'bottom_screen' ? 'checked' : ''} onchange="window.updateTempSetting('position', 'bottom_screen')">
                <div>
                  <strong>Nửa dưới màn hình (Khuyên dùng)</strong>
                  <div class="mea-qb-radio-desc">Hiển thị ngay tầm mắt (y = 460px), nhường 60% không gian phía trên cho máy tính Casio và vùng viết lời giải.</div>
                </div>
              </label>
              <label class="mea-qb-radio-label">
                <input type="radio" name="qc_pos" value="bottom_page" ${settings.position === 'bottom_page' ? 'checked' : ''} onchange="window.updateTempSetting('position', 'bottom_page')">
                <div>
                  <strong>Đáy trang giấy A4</strong>
                  <div class="mea-qb-radio-desc">Đặt thẻ ở sát chân trang (y = 1414px) và tự động cuộn bảng tới vị trí thẻ.</div>
                </div>
              </label>
              <label class="mea-qb-radio-label">
                <input type="radio" name="qc_pos" value="top" ${settings.position === 'top' ? 'checked' : ''} onchange="window.updateTempSetting('position', 'top')">
                <div>
                  <strong>Đỉnh trang giấy</strong>
                  <div class="mea-qb-radio-desc">Đặt thẻ ở đầu trang (y = 50px), toàn bộ phần giấy bên dưới dành để trình bày lời giải.</div>
                </div>
              </label>
            </section>

            <section class="mea-qb-settings-group">
              <div class="mea-qb-settings-group-title">2. Giao diện thẻ câu hỏi mặc định</div>
              <div class="mea-theme-palette-grid">
                ${[
                  { id: 'dark-teal', name: 'Cobalt Slate', color: '#2563eb' },
                  { id: 'chalkboard', name: 'Bảng Phấn Xanh', color: '#059669' },
                  { id: 'midnight', name: 'Đen OLED', color: '#1e293b' },
                  { id: 'glass', name: 'Kính Mờ', color: '#0ea5e9' },
                  { id: 'light', name: 'Giấy Sáng', color: '#94a3b8' },
                  { id: 'wood', name: 'Bảng Gỗ', color: '#d97706' }
                ].map(function (t) {
                  return `
                    <button type="button" class="mea-theme-btn ${settings.theme === t.id ? 'active' : ''}" onclick="window.updateTempSetting('theme', '${t.id}')">
                      <span class="mea-theme-swatch" style="background:${t.color};"></span>
                      <span>${t.name}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </section>

            <section class="mea-qb-settings-group">
              <div class="mea-qb-settings-group-title">3. Tương tác bảng viết &amp; bút vẽ</div>
              <label class="mea-qb-radio-label">
                <input type="checkbox" ${settings.autoHideWhenDrawing !== false ? 'checked' : ''} onchange="window.updateTempSetting('autoHideWhenDrawing', this.checked)">
                <div>
                  <strong>Tự động ẩn nút điều khiển và cho phép viết bút đè lên thẻ</strong>
                  <div class="mea-qb-radio-desc">Khi chọn Bút, Phấn, Dạ quang hoặc Tẩy, nét vẽ đi xuyên qua thẻ mượt mà; chọn lại công cụ Chọn để kéo thả.</div>
                </div>
              </label>
              <label class="mea-qb-radio-label">
                <input type="checkbox" ${settings.wideLayout !== false ? 'checked' : ''} onchange="window.updateTempSetting('wideLayout', this.checked)">
                <div>
                  <strong>Trải rộng chân trang (~92% bề ngang)</strong>
                  <div class="mea-qb-radio-desc">Xếp 4 đáp án theo hàng ngang để tiết kiệm chiều cao cho vùng nháp bài.</div>
                </div>
              </label>
            </section>
          </div>
        </div>
      `;
    } else {
      // TAB ĐỀ THI & CÂU HỎI THEO CHUYÊN ĐỀ / BỘ ĐỀ
      const totalInExam = activeExam && activeExam.questions ? activeExam.questions.length : 0;
      const questionsHtml = buildExamQuestionsHtml(activeExam, window.__meaExamQuestionFilter || '');
      mainContentHtml = `
        <div class="mea-qb-workspace-bar">
          <div class="mea-qb-ws-title-wrap">
            <h3 class="mea-qb-ws-title" title="${escHtml(activeExam ? activeExam.title : 'Chưa chọn đề')}">${escHtml(activeExam ? activeExam.title : 'Đề thi & Câu hỏi')}</h3>
            <span class="mn-qb-code-pill">${totalInExam} câu</span>
            ${activeExam && activeExam.grade ? `<span class="mn-qb-chip">Lớp ${escHtml(activeExam.grade)}</span>` : ''}
          </div>
          <div class="mea-qb-ws-actions">
            <div class="mn-qb-search-wrap compact">
              ${QB_ICONS.search}
              <input type="search" id="mea-qb-exam-qsearch" class="mn-qb-input" value="${escHtml(window.__meaExamQuestionFilter || '')}" placeholder="Lọc câu trong đề..." />
            </div>
            ${totalInExam > 0 ? `
              <button type="button" class="mea-qb-btn sm" onclick="window.exportStandaloneHtmlPresentation('${escHtml(activeExam.id)}')" title="Xuất HTML Slide độc lập">
                ${QB_ICONS.download}
                <span>Xuất HTML</span>
              </button>
              <button type="button" class="mea-qb-btn sm" onclick="window.startExamPresentation('${escHtml(activeExam.id)}', 0)" title="Trình chiếu Slide toàn màn hình (F5)">
                ${QB_ICONS.play}
                <span>Chiếu Slide</span>
              </button>
              <button type="button" class="mea-qb-btn primary sm" onclick="window.insertAllQuestionsFromActiveExam()">
                ${QB_ICONS.check}
                <span>Chèn toàn bộ</span>
              </button>
            ` : ''}
          </div>
        </div>
        <div class="mea-qb-scroll-body" id="mea-qb-exam-qlist">
          <div class="mea-qb-exam-cards-stack">${questionsHtml}</div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="mea-qb-modal-card" role="dialog" aria-modal="true" aria-label="Kho Đề Thi và Ngân Hàng Câu Hỏi">
        <header class="mea-qb-modal-header">
          <div class="mea-qb-header-left">
            <div class="mea-qb-brand-icon">${QB_ICONS.book}</div>
            <div class="mea-qb-header-titles">
              <div class="mea-qb-modal-title">Kho Đề &amp; Ngân Hàng Câu Hỏi</div>
            </div>
            <button type="button" id="mea-qb-live-status-pill" class="mea-qb-status-pill ${bankMeta ? 'connected' : ''}" onclick="window.refreshAllQuestionBankSources()" title="Nhấn để đồng bộ lại từ MatrixExamAI Pro">
              ${statusPillHtml}
            </button>
          </div>

          <div class="mea-qb-header-actions">
            <button type="button" class="mea-qb-btn sm" onclick="window.promptOpenHtmlFile()" title="Mở tệp HTML từ máy tính để trình chiếu (F5)">
              ${QB_ICONS.codeFile}
              <span>Chiếu HTML (F5)</span>
            </button>
            ${activeExam && activeExam.questions && activeExam.questions.length > 0 ? `
              <button type="button" class="mea-qb-btn primary sm" onclick="window.startExamPresentation('${escHtml(activeExam.id)}', 0)" title="Trình chiếu Slide đề đang chọn">
                ${QB_ICONS.play}
                <span>Chiếu Slide</span>
              </button>
            ` : ''}
            <button type="button" class="mea-qb-icon-btn" onclick="window.refreshAllQuestionBankSources()" title="Đồng bộ lại câu hỏi mới nhất">
              ${QB_ICONS.refresh}
            </button>
            <button type="button" class="mea-qb-icon-btn" onclick="if(typeof window.openMinNoteMeaSettings==='function'){window.closeQuestionBankModal();window.openMinNoteMeaSettings();}" title="Cài đặt AI &amp; MatrixExamAI Pro">
              ${QB_ICONS.cog}
            </button>
            <button type="button" class="mea-qb-close-btn" onclick="window.closeQuestionBankModal()" title="Đóng cửa sổ (Esc)">
              ${QB_ICONS.close}
            </button>
          </div>
        </header>

        <div class="mea-qb-modal-body">
          <aside class="mea-qb-rail">
            <nav class="mea-qb-nav" aria-label="Phân mục Kho Đề">
              <button type="button" class="mea-qb-nav-item ${isMeaLiveTab ? 'active' : ''}" onclick="window.switchQbTab('mea_live')">
                <span class="mea-qb-nav-ico">${QB_ICONS.db}</span>
                <span class="mea-qb-nav-label">Ngân hàng MEA Pro</span>
                <span class="mea-qb-nav-badge" id="mea-qb-rail-mea-count">${escHtml(meaCountText)}</span>
              </button>
              <button type="button" class="mea-qb-nav-item ${isExamsTab ? 'active' : ''}" onclick="window.switchQbTab('exams')">
                <span class="mea-qb-nav-ico">${QB_ICONS.layers}</span>
                <span class="mea-qb-nav-label">Đề thi &amp; Chuyên đề</span>
                <span class="mea-qb-nav-badge" id="mea-qb-rail-exams-count">${examsList.length}</span>
              </button>
              <button type="button" class="mea-qb-nav-item ${isHtmlLessonsTab ? 'active' : ''}" onclick="window.switchQbTab('html_lessons')">
                <span class="mea-qb-nav-ico">${QB_ICONS.globe}</span>
                <span class="mea-qb-nav-label">Bài giảng HTML</span>
                <span class="mea-qb-nav-badge" id="mea-qb-rail-html-count">${htmlList.length}</span>
              </button>
              <button type="button" class="mea-qb-nav-item ${isStorageTab ? 'active' : ''}" onclick="window.switchQbTab('storage')">
                <span class="mea-qb-nav-ico">${QB_ICONS.folder}</span>
                <span class="mea-qb-nav-label">Kho lưu trữ đề</span>
                <span class="mea-qb-nav-badge" id="mea-qb-rail-storage-count">${examsList.length}</span>
              </button>
              <button type="button" class="mea-qb-nav-item ${isSettingsTab ? 'active' : ''}" onclick="window.switchQbTab('settings')">
                <span class="mea-qb-nav-ico">${QB_ICONS.sliders}</span>
                <span class="mea-qb-nav-label">Cài đặt thẻ</span>
              </button>
            </nav>

            ${isExamsTab ? `
              <div class="mea-qb-rail-exams">
                <div class="mea-qb-sidebar-header">
                  <span class="mea-qb-sidebar-title">CHUYÊN ĐỀ / BỘ ĐỀ (${examsList.length})</span>
                  <button type="button" class="mea-qb-btn-import" onclick="window.importExamFilePrompt()" title="Nhập tệp đề JSON">
                    ${QB_ICONS.plus}
                    <span>Nạp</span>
                  </button>
                </div>
                <div class="mea-qb-exam-list">${examItemsHtml}</div>
              </div>
            ` : ''}
          </aside>

          <main class="mea-qb-main mn-sec-enter">
            ${mainContentHtml}
          </main>
        </div>
      </div>
    `;

    if (isMeaLiveTab) {
      window.refreshMeaLiveQuestionBank();
    } else if (isExamsTab) {
      const exSearch = document.getElementById('mea-qb-exam-qsearch');
      const exStackWrap = overlay.querySelector('.mea-qb-exam-cards-stack');
      if (exSearch && exStackWrap) {
        exSearch.addEventListener('input', function () {
          window.__meaExamQuestionFilter = exSearch.value || '';
          exStackWrap.innerHTML = buildExamQuestionsHtml(activeExam, window.__meaExamQuestionFilter);
        });
      }
    }
  }
  window.__meaRenderQbModal = renderQuestionBankModalContent;

  window.syncSqliteExamsNow = function () {
    if (window.chrome && window.chrome.webview) {
      window.__meaSuppressNextLegacyToast = false;
      try { window.chrome.webview.postMessage({ type: 'GET_QUESTION_BANK_DATA' }); } catch (_) {}
      showToast('Đang đồng bộ chuyên đề từ SQLite MatrixExamAI Pro...');
    } else {
      showToast('Đồng bộ SQLite hoạt động trực tiếp trên MinNote Desktop.');
    }
  };

  window.refreshAllQuestionBankSources = function () {
    if (window.__meaActiveQbTab === 'mea_live') {
      window.refreshMeaLiveQuestionBank();
    }
    if (window.chrome && window.chrome.webview &&
        window.MinNoteMeaSync && typeof window.MinNoteMeaSync.isDesktopBridge === 'function' &&
        window.MinNoteMeaSync.isDesktopBridge()) {
      window.__meaSuppressNextLegacyToast = window.__meaActiveQbTab === 'mea_live';
      try { window.chrome.webview.postMessage({ type: 'GET_QUESTION_BANK_DATA' }); } catch (_) {}
    }
  };

  // Mount & làm mới Ngân hàng câu hỏi trực tiếp từ MatrixExamAI Pro
  window.refreshMeaLiveQuestionBank = function () {
    const host = document.getElementById('mea-qb-live-sync-host');
    if (!host) return;
    if (window.MinNoteMeaSync && typeof window.MinNoteMeaSync.openBankIntoModal === 'function') {
      window.MinNoteMeaSync.openBankIntoModal(host);
    } else {
      host.innerHTML = '<div class="mn-qb-empty-state"><div class="mn-qb-empty-title">Đang khởi tạo cầu đồng bộ MatrixExamAI Pro...</div><div class="mn-qb-empty-sub">Vui lòng đợi giây lát hoặc nhấn biểu tượng làm mới ở góc trên phải.</div></div>';
    }
  };

  // Chuyển tab giữa Ngân hàng MEA, Đề thi, HTML, Kho Lưu & Cài đặt
  window.switchQbTab = function (tabName) {
    window.__meaActiveQbTab = tabName;
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay) {
      renderQuestionBankModalContent(overlay);
      const mainPane = overlay.querySelector('.mea-qb-main');
      if (mainPane && typeof window.triggerMinNoteSecEnter === 'function') {
        window.triggerMinNoteSecEnter(mainPane);
      }
    }
  };

  // Chọn đề thi đang duyệt
  window.selectActiveExam = function (examId) {
    const found = window.__meaExamsList.find(e => e.id === examId);
    if (found) {
      window.__meaActiveExam = found;
      window.__meaExamQuestionFilter = '';
      window.__meaActiveQbTab = 'exams';
      const overlay = document.getElementById('mea-qb-modal-overlay');
      if (overlay) renderQuestionBankModalContent(overlay);
    }
  };

  // Cập nhật cài đặt tạm thời
  window.updateTempSetting = function (key, val) {
    const settings = getQcSettings();
    settings[key] = val;
    saveQcSettings(settings);
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay) renderQuestionBankModalContent(overlay);
  };

  // Lưu và áp dụng cài đặt ngay cho các thẻ trên bảng
  window.saveAndApplySettings = function () {
    const settings = getQcSettings();
    const board = getBoard();
    if (board) {
      const coords = computeCardCoordinates(board, settings, 280);
      for (const pageIdx in window.__meaQuestionCards) {
        const card = window.__meaQuestionCards[pageIdx];
        if (card) {
          card.theme = settings.theme;
          card.fontSize = settings.fontSize;
          if (settings.position === 'bottom_screen' || settings.position === 'bottom_page') {
            card.x = coords.x;
            card.y = coords.y;
            card.w = coords.w;
          }
          const el = document.getElementById(`mea-qc-card-${pageIdx}`);
          if (el) {
            const newEl = renderCardElement(pageIdx, card);
            el.replaceWith(newEl);
          }
        }
      }
      scheduleUpdateAllCards();
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Đã lưu và áp dụng cài đặt thẻ câu hỏi!');
    }
    window.closeQuestionBankModal();
  };

  // Chèn 1 câu hỏi từ Kho Đề
  window.insertSingleQuestionFromBank = function (qIdx, isNewPage) {
    if (!window.__meaActiveExam || !window.__meaActiveExam.questions) return;
    const rawQ = window.__meaActiveExam.questions[qIdx];
    if (!rawQ) return;

    const q = (window.MinNoteMeaSync && typeof window.MinNoteMeaSync.normalizeMeaQuestionForCard === 'function')
      ? window.MinNoteMeaSync.normalizeMeaQuestionForCard(rawQ)
      : rawQ;

    const board = getBoard();
    const curPage = board && typeof board.currentPage === 'function' ? board.currentPage() : 0;
    window.insertQuestionToPage(q, curPage, isNewPage);
    window.closeQuestionBankModal();
  };

  // Chèn toàn bộ đề đang chọn
  window.insertAllQuestionsFromActiveExam = function () {
    if (!window.__meaActiveExam) return;
    window.insertEntireExamToPages(window.__meaActiveExam);
  };

  // 18. MODAL CHỈNH SỬA CÂU HỎI (EDIT QUESTION MODAL)
  window.openEditQuestionModal = function (pageIdx) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card || !card.question) return;

    const q = card.question;
    let editOverlay = document.getElementById('mea-qc-edit-overlay');
    if (!editOverlay) {
      editOverlay = document.createElement('div');
      editOverlay.id = 'mea-qc-edit-overlay';
      editOverlay.className = 'mea-qc-edit-overlay';
      document.body.appendChild(editOverlay);
    }
    editOverlay.style.display = 'flex';

    const opts = q.options || { A: '', B: '', C: '', D: '' };
    const qCode = q.code || q.title || ('Câu ' + (pageIdx + 1));
    const correctVal = String(q.correctAnswer || q.answer || 'A').trim().toUpperCase();
    const qExp = q.explanation || q.solution || '';

    editOverlay.innerHTML = `
      <div class="mea-qc-edit-card">
        <div class="mea-qc-edit-header">
          <div class="mea-qc-edit-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Chỉnh Sửa Câu Hỏi (Trang ${pageIdx + 1})
          </div>
          <button class="mea-qb-close-btn" onclick="document.getElementById('mea-qc-edit-overlay').style.display='none'">✕</button>
        </div>

        <div class="mea-qc-edit-body">
          <div class="mea-qc-edit-row">
            <div class="mea-qc-edit-field" style="max-width:140px;">
              <span class="mea-qc-edit-label">Mã Câu / Số hiệu</span>
              <input type="text" id="mea-edit-code" class="mea-qc-edit-input" value="${qCode}">
            </div>
            <div class="mea-qc-edit-field" style="max-width:140px;">
              <span class="mea-qc-edit-label">Mức độ</span>
              <select id="mea-edit-level" class="mea-qc-edit-select">
                <option value="Nhận biết" ${q.level === 'Nhận biết' ? 'selected' : ''}>Nhận biết</option>
                <option value="Thông hiểu" ${q.level === 'Thông hiểu' ? 'selected' : ''}>Thông hiểu</option>
                <option value="Vận dụng" ${q.level === 'Vận dụng' ? 'selected' : ''}>Vận dụng</option>
                <option value="Vận dụng cao" ${q.level === 'Vận dụng cao' ? 'selected' : ''}>Vận dụng cao</option>
              </select>
            </div>
            <div class="mea-qc-edit-field">
              <span class="mea-qc-edit-label">Chuyên đề</span>
              <input type="text" id="mea-edit-topic" class="mea-qc-edit-input" value="${q.topic || 'Toán học'}">
            </div>
            <div class="mea-qc-edit-field" style="max-width:120px;">
              <span class="mea-qc-edit-label">Đáp án đúng</span>
              <select id="mea-edit-correct" class="mea-qc-edit-select">
                <option value="A" ${correctVal === 'A' ? 'selected' : ''}>Phương án A</option>
                <option value="B" ${correctVal === 'B' ? 'selected' : ''}>Phương án B</option>
                <option value="C" ${correctVal === 'C' ? 'selected' : ''}>Phương án C</option>
                <option value="D" ${correctVal === 'D' ? 'selected' : ''}>Phương án D</option>
              </select>
            </div>
          </div>

          <div class="mea-qc-edit-field">
            <span class="mea-qc-edit-label">Nội dung đề bài (Hỗ trợ công thức LaTeX: $...$ hoặc $$...$$)</span>
            <textarea id="mea-edit-content" class="mea-qc-edit-textarea" rows="4">${q.content || ''}</textarea>
            <div id="mea-preview-content" class="mea-qc-edit-preview-box">${renderMath(q.content || '')}</div>
          </div>

          <div class="mea-qc-edit-options-grid">
            <div class="mea-qc-edit-opt-item">
              <span class="mea-qc-edit-opt-tag">A</span>
              <input type="text" id="mea-edit-opt-A" class="mea-qc-edit-input" value="${opts.A || ''}" placeholder="Phương án A">
            </div>
            <div class="mea-qc-edit-opt-item">
              <span class="mea-qc-edit-opt-tag">B</span>
              <input type="text" id="mea-edit-opt-B" class="mea-qc-edit-input" value="${opts.B || ''}" placeholder="Phương án B">
            </div>
            <div class="mea-qc-edit-opt-item">
              <span class="mea-qc-edit-opt-tag">C</span>
              <input type="text" id="mea-edit-opt-C" class="mea-qc-edit-input" value="${opts.C || ''}" placeholder="Phương án C">
            </div>
            <div class="mea-qc-edit-opt-item">
              <span class="mea-qc-edit-opt-tag">D</span>
              <input type="text" id="mea-edit-opt-D" class="mea-qc-edit-input" value="${opts.D || ''}" placeholder="Phương án D">
            </div>
          </div>

          <div class="mea-qc-edit-field">
            <span class="mea-qc-edit-label">Hướng dẫn giải chi tiết (KaTeX)</span>
            <textarea id="mea-edit-explanation" class="mea-qc-edit-textarea" rows="3">${qExp}</textarea>
          </div>
        </div>

        <div class="mea-qc-edit-footer">
          <button class="mea-qb-tab-btn" onclick="document.getElementById('mea-qc-edit-overlay').style.display='none'">Hủy</button>
          <button class="mea-qb-btn-add-all" onclick="window.saveEditedQuestion(${pageIdx})">Lưu Thay Đổi & Áp Dụng</button>
        </div>
      </div>
    `;

    // Live preview khi gõ KaTeX
    const contentTextarea = document.getElementById('mea-edit-content');
    const previewBox = document.getElementById('mea-preview-content');
    if (contentTextarea && previewBox) {
      contentTextarea.addEventListener('input', function () {
        previewBox.innerHTML = renderMath(contentTextarea.value);
      });
    }

    editOverlay.style.display = 'flex';
  };

  window.saveEditedQuestion = function (pageIdx) {
    const card = window.__meaQuestionCards[pageIdx];
    if (!card) return;

    const code = document.getElementById('mea-edit-code').value.trim();
    const level = document.getElementById('mea-edit-level').value;
    const topic = document.getElementById('mea-edit-topic').value.trim();
    const correct = document.getElementById('mea-edit-correct').value;
    const content = document.getElementById('mea-edit-content').value.trim();
    const optA = document.getElementById('mea-edit-opt-A').value.trim();
    const optB = document.getElementById('mea-edit-opt-B').value.trim();
    const optC = document.getElementById('mea-edit-opt-C').value.trim();
    const optD = document.getElementById('mea-edit-opt-D').value.trim();
    const explanation = document.getElementById('mea-edit-explanation').value.trim();

    const finalCode = code || ('Câu ' + (pageIdx + 1));
    card.question = {
      ...card.question,
      code: finalCode,
      title: finalCode,
      level: level,
      topic: topic,
      correctAnswer: correct,
      answer: correct,
      content: content,
      options: { A: optA, B: optB, C: optC, D: optD },
      explanation: explanation,
      solution: explanation
    };

    const el = document.getElementById(`mea-qc-card-${pageIdx}`);
    if (el) {
      const newEl = renderCardElement(pageIdx, card);
      el.replaceWith(newEl);
      scheduleUpdateAllCards();
    }

    const editOverlay = document.getElementById('mea-qc-edit-overlay');
    if (editOverlay) editOverlay.style.display = 'none';
  };

  // 19. NẠP TỆP ĐỀ THI TỪ FILE NGOÀI (PROMPT IMPORT)
  window.importExamFilePrompt = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const data = JSON.parse(evt.target.result);
          if (Array.isArray(data)) {
            data.forEach(ex => window.__meaExamsList.push(ex));
          } else if (data.questions) {
            window.__meaExamsList.push(data);
          }
          window.openQuestionBankModal();
          showToast('Đã nạp đề thi thành công!');
        } catch (err) {
          showToast('Không thể đọc file JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };


  // 21. NHẬN DỮ LIỆU ĐỀ THI TỪ C# SQLITE MATRIXEXAMAI
  window.receiveQuestionBankData = function (exams) {
    if (!Array.isArray(exams) || exams.length === 0) return;
    // Remove previous SQLite-grouped items so stale/renamed topics don't accumulate in localStorage
    const customAndDefaults = getStoredExamsList().filter(function (e) {
      return !e || !String(e.id || '').startsWith('exam_sqlite_');
    });
    const list = exams.concat(customAndDefaults);
    saveStoredExamsList(list);
    window.__meaExamsList = list;
    if (!window.__meaActiveExam || String(window.__meaActiveExam.id || '').startsWith('exam_sqlite_')) {
      const prevId = window.__meaActiveExam && window.__meaActiveExam.id;
      window.__meaActiveExam = list.find(function (e) { return e.id === prevId; }) || list[0] || null;
    }

    const examsCountEl = document.getElementById('mea-qb-rail-exams-count');
    if (examsCountEl) examsCountEl.textContent = String(list.length);
    const storageCountEl = document.getElementById('mea-qb-rail-storage-count');
    if (storageCountEl) storageCountEl.textContent = String(list.length);

    const overlay = document.getElementById('mea-qb-modal-overlay');
    const tab = window.__meaActiveQbTab;
    if (overlay && overlay.style.display === 'flex' && (tab === 'exams' || tab === 'storage')) {
      renderQuestionBankModalContent(overlay);
    }

    if (window.__meaSuppressNextLegacyToast) {
      window.__meaSuppressNextLegacyToast = false;
    } else {
      showToast(`Đã đồng bộ ${exams.length} chuyên đề từ MatrixExamAI SQLite!`);
    }
  };

  // 20. ĐỒNG BỘ TOÀN DIỆN VỚI BOARD MINNOTE (POLLING + EVENT HOOKS)
  function setupBoardSync() {
    const board = getBoard();
    if (!board) {
      setTimeout(setupBoardSync, 200);
      return;
    }

    if (board.__meaSyncAttached) return;
    board.__meaSyncAttached = true;

    // Đưa layer thẻ câu hỏi trực tiếp vào board.host
    ensureQuestionCardsLayer();

    if (board.scroller) {
      board.scroller.addEventListener('scroll', scheduleUpdateAllCards, { passive: true });
      board.scroller.addEventListener('wheel', scheduleUpdateAllCards, { passive: true });
      // pointermove layout thrashing removed
    }

    window.addEventListener('resize', scheduleUpdateAllCards, { passive: true });
    document.addEventListener('pointerup', scheduleUpdateAllCards, { passive: true });

    // Hook các hàm cốt lõi của NoteRenderer để cập nhật tức thì 0ms
    const hookMethods = ['setTool', 'setZoom', 'goToPage', 'addPage', 'layout'];
    hookMethods.forEach(method => {
      if (typeof board[method] === 'function') {
        const orig = board[method];
        board[method] = function () {
          const res = orig.apply(this, arguments);
          scheduleUpdateAllCards();
          return res;
        };
      }
    });

    // Polling định kỳ 100ms giữ thẻ luôn dính chặt vào canvas không bị trôi
    setInterval(scheduleUpdateAllCards, 100);

    // Kích hoạt cập nhật lần đầu
    scheduleUpdateAllCards();
  }

  // Phím tắt bàn phím Ctrl + Q mở nhanh Kho Đề (được điều phối tập trung tại index.html)

  // 21. BỘ DỮ LIỆU ĐỀ THI MẪU TOÁN HỌC CHẤT LƯỢNG CAO (LOCAL QUESTION BANK)
  window.__meaDefaultExamsList = [
    {
      id: 'exam_thpt_01',
      title: 'Đề 01 • Khảo Sát Sự Biến Thiên & Đồ Thị Hàm Số (Toán 12)',
      subject: 'Toán học',
      grade: '12',
      questions: [
        {
          code: 'Câu 1',
          level: 'Nhận biết',
          topic: 'Tính đơn điệu của hàm số',
          content: 'Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Hàm số đã cho đồng biến trên khoảng nào dưới đây?',
          options: {
            A: '$(-\\infty; -1)$',
            B: '$(-1; 3)$',
            C: '$(3; +\\infty)$',
            D: '$(0; 2)$'
          },
          correctAnswer: 'A',
          explanation: 'Dựa vào bảng biến thiên, đạo hàm $f\'(x) > 0$ trên các khoảng $(-\\infty; -1)$ và $(2; 3)$. Do đó hàm số đồng biến trên khoảng $(-\\infty; -1)$. Chọn A.'
        },
        {
          code: 'Câu 2',
          level: 'Thông hiểu',
          topic: 'Cực trị của hàm số',
          content: 'Tìm giá trị cực đại $y_{\\text{CĐ}}$ của hàm số $y = x^3 - 3x + 2$.',
          options: {
            A: '$y_{\\text{CĐ}} = 4$',
            B: '$y_{\\text{CĐ}} = 0$',
            C: '$y_{\\text{CĐ}} = -1$',
            D: '$y_{\\text{CĐ}} = 2$'
          },
          correctAnswer: 'A',
          explanation: 'Ta có $y\' = 3x^2 - 3 = 3(x-1)(x+1)$. Cho $y\' = 0 \\Leftrightarrow x = \\pm 1$. Bảng xét dấu: tại $x = -1$ đạo hàm đổi dấu từ dương sang âm nên là điểm cực đại. Khi đó $y_{\\text{CĐ}} = (-1)^3 - 3(-1) + 2 = 4$. Chọn A.'
        },
        {
          code: 'Câu 3',
          level: 'Thông hiểu',
          topic: 'Đường tiệm cận',
          content: 'Đường tiệm cận đứng của đồ thị hàm số $y = \\dfrac{2x - 1}{x + 2}$ là đường thẳng:',
          options: {
            A: '$x = -2$',
            B: '$x = 2$',
            C: '$y = 2$',
            D: '$y = -2$'
          },
          correctAnswer: 'A',
          explanation: 'Tập xác định $D = \\mathbb{R} \\setminus \\{-2\\}$. Ta có $\\lim_{x \\to -2^+} \\dfrac{2x-1}{x+2} = -\\infty$. Do đó đường thẳng $x = -2$ là tiệm cận đứng. Chọn A.'
        },
        {
          code: 'Câu 4',
          level: 'Vận dụng',
          topic: 'Giá trị lớn nhất & nhỏ nhất',
          content: 'Tìm tất cả các giá trị thực của tham số $m$ để giá trị nhỏ nhất của hàm số $f(x) = x^4 - 2x^2 + m$ trên đoạn $[0; 2]$ bằng $5$.',
          options: {
            A: '$m = 6$',
            B: '$m = 5$',
            C: '$m = 4$',
            D: '$m = 7$'
          },
          correctAnswer: 'A',
          explanation: 'Đạo hàm $f\'(x) = 4x^3 - 4x = 4x(x^2 - 1)$. Trên $[0; 2]$, $f\'(x) = 0 \\Leftrightarrow x = 0$ hoặc $x = 1$. Ta có $f(0) = m$, $f(1) = m - 1$, $f(2) = 8 + m$. Do đó $\\min_{[0; 2]} f(x) = f(1) = m - 1$. Theo bài ra $m - 1 = 5 \\Leftrightarrow m = 6$. Chọn A.'
        },
        {
          code: 'Câu 5',
          level: 'Vận dụng cao',
          topic: 'Tương giao đồ thị hàm số',
          content: 'Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có đồ thị như hình vẽ. Có bao nhiêu giá trị nguyên của $m \\in [-10; 10]$ để phương trình $f(|x|) = m$ có đúng $4$ nghiệm thực phân biệt?',
          options: {
            A: '$5$',
            B: '$3$',
            C: '$7$',
            D: '$4$'
          },
          correctAnswer: 'B',
          explanation: 'Đồ thị hàm số $y = f(|x|)$ nhận trục tung làm trục đối xứng. Phương trình có 4 nghiệm phân biệt khi đường thẳng $y = m$ cắt phần đồ thị với $x > 0$ tại 2 điểm phân biệt và không đi qua điểm có hoành độ 0. Suy ra $m \\in \\{1, 2, 3\\}$. Có 3 giá trị nguyên. Chọn B.'
        }
      ]
    },
    {
      id: 'exam_thpt_02',
      title: 'Đề 02 • Hình Học Không Gian & Phương Pháp Tọa Độ Oxyz',
      subject: 'Hình học',
      grade: '12',
      questions: [
        {
          code: 'Câu 1',
          level: 'Nhận biết',
          topic: 'Tọa độ vectơ trong không gian',
          content: 'Trong không gian $Oxyz$, cho hai vectơ $\\vec{u} = (1; -2; 3)$ và $\\vec{v} = (5; 4; -1)$. Tọa độ của vectơ $\\vec{u} + \\vec{v}$ là:',
          options: {
            A: '$(6; 2; 2)$',
            B: '$(-4; -6; 4)$',
            C: '$(6; -6; 2)$',
            D: '$(4; 6; -2)$'
          },
          correctAnswer: 'A',
          explanation: '$\\vec{u} + \\vec{v} = (1+5; -2+4; 3-1) = (6; 2; 2)$. Chọn A.'
        },
        {
          code: 'Câu 2',
          level: 'Thông hiểu',
          topic: 'Phương trình mặt cầu',
          content: 'Trong không gian $Oxyz$, mặt cầu $(S): x^2 + y^2 + z^2 - 2x + 4y - 6z - 2 = 0$ có bán kính $R$ bằng:',
          options: {
            A: '$R = 4$',
            B: '$R = \\sqrt{12}$',
            C: '$R = 16$',
            D: '$R = 2$'
          },
          correctAnswer: 'A',
          explanation: 'Tâm $I(1; -2; 3)$ và $d = -2$. Bán kính $R = \\sqrt{a^2 + b^2 + c^2 - d} = \\sqrt{1^2 + (-2)^2 + 3^2 - (-2)} = \\sqrt{1 + 4 + 9 + 2} = \\sqrt{16} = 4$. Chọn A.'
        },
        {
          code: 'Câu 3',
          level: 'Vận dụng',
          topic: 'Phương trình mặt phẳng',
          content: 'Viết phương trình mặt phẳng $(P)$ đi qua điểm $M(1; 2; -3)$ và vuông góc với đường thẳng $d: \\dfrac{x-1}{2} = \\dfrac{y+1}{-1} = \\dfrac{z}{3}$.',
          options: {
            A: '$2x - y + 3z + 9 = 0$',
            B: '$2x - y + 3z - 9 = 0$',
            C: '$x - 2y + 3z + 12 = 0$',
            D: '$2x + y + 3z + 5 = 0$'
          },
          correctAnswer: 'A',
          explanation: 'Vectơ chỉ phương của $d$ là $\\vec{u} = (2; -1; 3)$. Do $(P) \\perp d$ nên $(P)$ nhận $\\vec{n} = (2; -1; 3)$ làm VTPT. Phương trình: $2(x-1) - 1(y-2) + 3(z+3) = 0 \\Leftrightarrow 2x - y + 3z + 9 = 0$. Chọn A.'
        }
      ]
    },
    {
      id: 'exam_thpt_03',
      title: 'Đề 03 • Nguyên Hàm, Tích Phân & Ứng Dụng',
      subject: 'Giải tích',
      grade: '12',
      questions: [
        {
          code: 'Câu 1',
          level: 'Nhận biết',
          topic: 'Bảng nguyên hàm cơ bản',
          content: 'Họ nguyên hàm của hàm số $f(x) = e^{2x} + \\cos x$ là:',
          options: {
            A: '$\\dfrac{1}{2}e^{2x} + \\sin x + C$',
            B: '$2e^{2x} - \\sin x + C$',
            C: '$\\dfrac{1}{2}e^{2x} - \\sin x + C$',
            D: '$e^{2x} + \\sin x + C$'
          },
          correctAnswer: 'A',
          explanation: '$\\int (e^{2x} + \\cos x)dx = \\dfrac{1}{2}e^{2x} + \\sin x + C$. Chọn A.'
        },
        {
          code: 'Câu 2',
          level: 'Thông hiểu',
          topic: 'Tích phân đổi biến số',
          content: 'Tính tích phân $I = \\int_{0}^{1} x(x^2 + 1)^3 dx$.',
          options: {
            A: '$I = \\dfrac{15}{8}$',
            B: '$I = \\dfrac{15}{4}$',
            C: '$I = \\dfrac{7}{8}$',
            D: '$I = \\dfrac{1}{4}$'
          },
          correctAnswer: 'A',
          explanation: 'Đặt $t = x^2 + 1 \\Rightarrow dt = 2x dx \\Rightarrow x dx = \\dfrac{dt}{2}$. Đổi cận: $x=0 \\Rightarrow t=1$; $x=1 \\Rightarrow t=2$. Ta có $I = \\int_{1}^{2} \\dfrac{t^3}{2} dt = \\left[ \\dfrac{t^4}{8} \\right]_{1}^{2} = \\dfrac{16 - 1}{8} = \\dfrac{15}{8}$. Chọn A.'
        }
      ]
    }
  ];

  // ==========================================================================
  // 22. HỆ THỐNG QUẢN LÝ LƯU TRỮ ĐỀ THI & SLIDE (STORAGE MANAGER)
  // ==========================================================================
  const STORAGE_KEY_EXAMS = 'mea_saved_exams_v1';

  function getStoredExamsList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EXAMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    const list = JSON.parse(JSON.stringify(window.__meaDefaultExamsList || []));
    saveStoredExamsList(list);
    return list;
  }

  function saveStoredExamsList(list) {
    try {
      localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(list));
    } catch (_) {}
  }

  // Khởi tạo danh sách đề thi từ LocalStorage
  window.__meaExamsList = getStoredExamsList();

  // Lưu đề thi đang chọn vào Kho Lưu Trữ
  window.saveActiveExamToStorage = function () {
    if (!window.__meaActiveExam) return;
    const exam = window.__meaActiveExam;
    const list = getStoredExamsList();
    const idx = list.findIndex(e => e.id === exam.id);
    if (idx >= 0) {
      list[idx] = exam;
    } else {
      list.push(exam);
    }
    saveStoredExamsList(list);
    window.__meaExamsList = list;
    showToast(`Đã lưu "${exam.title}" vào Kho Lưu Trữ thành công!`);
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay) renderQuestionBankModalContent(overlay);
  };

  // Xóa đề thi khỏi Kho Lưu Trữ
  window.deleteExamFromStorage = async function (examId) {
    const target = (window.__meaExamsList || []).find(e => e.id === examId);
    const examTitle = target ? target.title : 'đề thi này';
    const ok = await window.meaConfirm({
      title: 'Xóa Đề Thi Khỏi Kho',
      message: `Bạn có chắc chắn muốn xóa "${examTitle}" khỏi Kho Lưu Trữ?`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
      isDanger: true
    });
    if (!ok) return;
    let list = getStoredExamsList();
    list = list.filter(e => e.id !== examId);
    if (list.length === 0) {
      list = JSON.parse(JSON.stringify(window.__meaDefaultExamsList || []));
    }
    saveStoredExamsList(list);
    window.__meaExamsList = list;
    if (window.__meaActiveExam && window.__meaActiveExam.id === examId) {
      window.__meaActiveExam = list[0] || null;
    }
    showToast('Đã xóa đề thi khỏi Kho Lưu Trữ!');
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay) renderQuestionBankModalContent(overlay);
  };

  // Khôi phục đề mẫu gốc
  window.restoreDefaultExams = async function () {
    const ok = await window.meaConfirm({
      title: 'Khôi Phục Đề Mẫu Gốc',
      message: 'Khôi phục danh sách các đề thi mẫu toán học mặc định của Thầy Đỗ Miinh Math?',
      confirmText: 'Khôi phục',
      cancelText: 'Hủy bỏ',
      isDanger: false
    });
    if (!ok) return;
    const list = JSON.parse(JSON.stringify(window.__meaDefaultExamsList || []));
    saveStoredExamsList(list);
    window.__meaExamsList = list;
    window.__meaActiveExam = list[0] || null;
    showToast('Đã khôi phục các đề thi mẫu gốc!');
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay) renderQuestionBankModalContent(overlay);
  };

  // Xuất đề thi dạng JSON
  window.exportExamAsJson = function (examId) {
    const ex = window.__meaExamsList.find(e => e.id === examId) || window.__meaActiveExam;
    if (!ex) return;
    const jsonStr = JSON.stringify(ex, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(ex.title || 'de_thi').replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Đã tải file JSON cho "${ex.title}"!`);
  };

  // Xuất file HTML Trình Chiếu Độc Lập (Standalone HTML Slide)
  window.exportStandaloneHtmlPresentation = function (examId) {
    const ex = window.__meaExamsList.find(e => e.id === examId) || window.__meaActiveExam;
    if (!ex || !ex.questions || ex.questions.length === 0) {
      showToast('Đề thi chưa có câu hỏi nào để xuất slide trình chiếu!');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ex.title} - Trình Chiếu Slide HTML</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      background: radial-gradient(circle at 50% 20%, #151d30 0%, #090d16 85%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px;
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
    }
    .badge-code {
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: #fff;
      font-weight: 800;
      font-size: 14px;
      padding: 5px 14px;
      border-radius: 8px;
    }
    .title { font-size: 15px; font-weight: 600; color: #cbd5e1; }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 30px 60px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      overflow-y: auto;
    }
    .q-text {
      font-size: 26px;
      line-height: 1.6;
      padding: 24px 32px;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.7);
      border-radius: 16px;
      width: 100%;
      margin-bottom: 24px;
      user-select: text;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      width: 100%;
    }
    .opt-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 22px;
      background: rgba(30, 41, 59, 0.5);
      border: 1.5px solid rgba(51, 65, 85, 0.8);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: text;
    }
    .opt-card:hover { border-color: #38bdf8; transform: translateY(-2px); }
    .opt-card.selected { border-color: #38bdf8; background: rgba(14, 165, 233, 0.15); }
    .opt-card.is-correct { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.2) !important; }
    .opt-card.is-wrong { border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.2) !important; }
    .opt-key {
      width: 38px; height: 38px; border-radius: 10px;
      background: rgba(15, 23, 42, 0.8); border: 1.5px solid #475569;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 800; color: #38bdf8; flex-shrink: 0;
    }
    .opt-card.is-correct .opt-key { background: #10b981; border-color: #10b981; color: #fff; }
    .opt-card.is-wrong .opt-key { background: #ef4444; border-color: #ef4444; color: #fff; }
    .opt-val { font-size: 20px; line-height: 1.5; color: #f1f5f9; flex: 1; }
    .explanation-box {
      background: rgba(13, 148, 136, 0.15);
      border: 1.5px solid rgba(45, 212, 191, 0.5);
      border-radius: 14px;
      padding: 20px 28px;
      font-size: 18px;
      line-height: 1.6;
      color: #ccfbf1;
      margin-top: 20px;
      width: 100%;
      user-select: text;
    }
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 30px;
      background: rgba(15, 23, 42, 0.85);
      border-top: 1px solid rgba(51, 65, 85, 0.6);
      position: relative;
    }
    button {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 9px 18px;
      border-radius: 9px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    button:hover:not(:disabled) { background: #0d9488; color: #fff; transform: translateY(-2px); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    .progress-bar {
      position: absolute; bottom: 0; left: 0; height: 4px;
      background: linear-gradient(90deg, #0d9488, #2dd4bf);
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <header>
    <div style="display:flex;align-items:center;gap:12px;">
      <span class="badge-code" id="slide-code">Câu 1</span>
      <span class="title" id="exam-title">${ex.title}</span>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="toggleAnswer()">👁️ Lời Giải (E)</button>
      <button onclick="toggleFullscreen()">⛶ Toàn Màn Hình (F11)</button>
    </div>
  </header>
  <main>
    <div class="q-text" id="q-content"></div>
    <div class="options-grid" id="options-grid"></div>
    <div class="explanation-box" id="explanation-box" style="display:none;"></div>
  </main>
  <footer>
    <button onclick="prevSlide()" id="btn-prev">◀ Câu Trước (←)</button>
    <div style="font-size:14px;color:#94a3b8;" id="slide-counter">1 / ${ex.questions.length}</div>
    <button onclick="nextSlide()" id="btn-next">Câu Sau ▶ (→)</button>
    <div class="progress-bar" id="progress-bar"></div>
  </footer>
  <script>
    const exam = ${JSON.stringify(ex)};
    let curIdx = 0;
    let showAns = false;
    let selectedOption = null;

    function renderMath(text) {
      if (!text || typeof katex === 'undefined') return text || '';
      let res = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, t) => katex.renderToString(t.trim(), { displayMode: true, throwOnError: false }));
      res = res.replace(/\\\[([\s\S]*?)\\\]/g, (_, t) => katex.renderToString(t.trim(), { displayMode: true, throwOnError: false }));
      res = res.replace(/\$([^\$\n\r]+?)\$/g, (_, t) => katex.renderToString(t.trim(), { displayMode: false, throwOnError: false }));
      res = res.replace(/\\\(([\s\S]*?)\\\)/g, (_, t) => katex.renderToString(t.trim(), { displayMode: false, throwOnError: false }));
      return res.replace(/\n/g, '<br>');
    }

    function renderSlide() {
      const q = exam.questions[curIdx];
      document.getElementById('slide-code').innerText = q.code || ('Câu ' + (curIdx + 1));
      document.getElementById('slide-counter').innerText = (curIdx + 1) + ' / ' + exam.questions.length;
      document.getElementById('progress-bar').style.width = (((curIdx + 1) / exam.questions.length) * 100) + '%';
      document.getElementById('btn-prev').disabled = curIdx === 0;
      document.getElementById('btn-next').disabled = curIdx === exam.questions.length - 1;

      document.getElementById('q-content').innerHTML = renderMath(q.content);

      const grid = document.getElementById('options-grid');
      grid.innerHTML = '';
      if (q.options) {
        Object.keys(q.options).sort().forEach(k => {
          const card = document.createElement('div');
          card.className = 'opt-card';
          if (selectedOption === k) card.classList.add('selected');
          if (showAns && (q.correctAnswer || '').toUpperCase() === k.toUpperCase()) card.classList.add('is-correct');
          if (showAns && selectedOption === k && (q.correctAnswer || '').toUpperCase() !== k.toUpperCase()) card.classList.add('is-wrong');
          card.onclick = () => { selectedOption = k; renderSlide(); };
          card.innerHTML = '<div class="opt-key">' + k + '</div><div class="opt-val">' + renderMath(q.options[k]) + '</div>';
          grid.appendChild(card);
        });
      }

      const exp = document.getElementById('explanation-box');
      if (showAns && q.explanation) {
        exp.style.display = 'block';
        exp.innerHTML = '<strong>💡 LỜI GIẢI CHI TIẾT:</strong><br><br>' + renderMath(q.explanation);
      } else {
        exp.style.display = 'none';
      }
    }

    function nextSlide() { if (curIdx < exam.questions.length - 1) { curIdx++; showAns = false; selectedOption = null; renderSlide(); } }
    function prevSlide() { if (curIdx > 0) { curIdx--; showAns = false; selectedOption = null; renderSlide(); } }
    function toggleAnswer() { showAns = !showAns; renderSlide(); }
    function toggleFullscreen() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
      else document.exitFullscreen().catch(()=>{});
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') { e.preventDefault(); prevSlide(); }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); toggleAnswer(); }
      else if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
      else if (['1','2','3','4'].includes(e.key)) { const keys = ['A','B','C','D']; selectedOption = keys[parseInt(e.key,10)-1]; renderSlide(); }
      else if (['a','b','c','d','A','B','C','D'].includes(e.key)) { selectedOption = e.key.toUpperCase(); renderSlide(); }
    });

    renderSlide();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(ex.title || 'de_thi').replace(/[^a-zA-Z0-9-_]/g, '_')}_TrinhChieu.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Đã xuất file Slide HTML độc lập cho "${ex.title}"!`);
  };

  // ==========================================================================
  // 23. ĐỘNG CƠ TRÌNH CHIẾU SLIDE HTML TRÊN BẢNG VIẾT (PRESENTATION ENGINE)
  // ==========================================================================
  window.__meaPresentation = {
    active: false,
    exam: null,
    currentIdx: 0,
    showAnswer: false,
    selectedOption: null
  };

  window.startExamPresentation = function (examId, startIndex) {
    let exam = null;
    if (examId) {
      exam = window.__meaExamsList.find(e => e.id === examId);
    }
    if (!exam) {
      exam = window.__meaActiveExam || (window.__meaExamsList.length > 0 ? window.__meaExamsList[0] : null);
    }

    if (!exam || !exam.questions || exam.questions.length === 0) {
      showToast('Đề thi này chưa có câu hỏi nào để trình chiếu!');
      return;
    }

    window.__meaPresentation.active = true;
    window.__meaPresentation.exam = exam;
    window.__meaPresentation.currentIdx = typeof startIndex === 'number' ? startIndex : 0;
    window.__meaPresentation.showAnswer = false;
    window.__meaPresentation.selectedOption = null;

    let overlay = document.getElementById('mea-presentation-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mea-presentation-overlay';
      overlay.className = 'mea-present-overlay';
      document.body.appendChild(overlay);
    }

    renderPresentationSlideContent(overlay);
    overlay.style.display = 'flex';
    if (window.closeQuestionBankModal) window.closeQuestionBankModal();
  };

  window.closeExamPresentation = function () {
    window.__meaPresentation.active = false;
    const overlay = document.getElementById('mea-presentation-overlay');
    if (overlay) overlay.style.display = 'none';
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (window.__isHostFullScreen && window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({ type: 'TOGGLE_FULLSCREEN', timestamp: Date.now() });
    }
  };

  window.presentationNextSlide = function () {
    const p = window.__meaPresentation;
    if (!p.active || !p.exam) return;
    if (p.currentIdx < p.exam.questions.length - 1) {
      p.currentIdx++;
      p.showAnswer = false;
      p.selectedOption = null;
      const overlay = document.getElementById('mea-presentation-overlay');
      if (overlay) renderPresentationSlideContent(overlay);
    }
  };

  window.presentationPrevSlide = function () {
    const p = window.__meaPresentation;
    if (!p.active || !p.exam) return;
    if (p.currentIdx > 0) {
      p.currentIdx--;
      p.showAnswer = false;
      p.selectedOption = null;
      const overlay = document.getElementById('mea-presentation-overlay');
      if (overlay) renderPresentationSlideContent(overlay);
    }
  };

  window.presentationJumpTo = function (idx) {
    const p = window.__meaPresentation;
    if (!p.active || !p.exam) return;
    if (idx >= 0 && idx < p.exam.questions.length) {
      p.currentIdx = idx;
      p.showAnswer = false;
      p.selectedOption = null;
      const overlay = document.getElementById('mea-presentation-overlay');
      if (overlay) renderPresentationSlideContent(overlay);
    }
  };

  window.presentationToggleAnswer = function () {
    const p = window.__meaPresentation;
    if (!p.active) return;
    p.showAnswer = !p.showAnswer;
    const overlay = document.getElementById('mea-presentation-overlay');
    if (overlay) renderPresentationSlideContent(overlay);
  };

  window.presentationSelectOption = function (optKey) {
    const p = window.__meaPresentation;
    if (!p.active) return;
    p.selectedOption = optKey;
    const overlay = document.getElementById('mea-presentation-overlay');
    if (overlay) renderPresentationSlideContent(overlay);
  };

  window.presentationInsertToWhiteboard = function () {
    const p = window.__meaPresentation;
    if (!p.active || !p.exam || !p.exam.questions) return;
    const q = p.exam.questions[p.currentIdx];
    if (!q) return;

    const board = getBoard();
    const curPage = board && typeof board.currentPage === 'function' ? board.currentPage() : 0;
    window.insertQuestionToPage(q, curPage, false);
    window.closeExamPresentation();
    showToast(`Đã đưa ${q.code || 'câu hỏi'} vào trang bảng viết hiện tại!`);
  };


  // Điều khiển Toàn Màn Hình xuyên suốt Host WPF và WebView2
  window.toggleHostFullscreen = function () {
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({ type: 'TOGGLE_FULLSCREEN', timestamp: Date.now() });
    } else if (typeof handleToggleFullScreen === 'function') {
      handleToggleFullScreen();
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  window.presentationToggleFullscreen = window.toggleHostFullscreen;
  window.toggleHtmlPresentationFullscreen = window.toggleHostFullscreen;

  window.onHostFullScreenChanged = function (isFs) {
    window.__isHostFullScreen = !!isFs;
    const btnHtml = document.getElementById('btn-html-fullscreen');
    if (btnHtml) {
      btnHtml.innerHTML = isFs ? '⛶ Thu Nhỏ (F11)' : '⛶ Toàn Màn Hình';
      btnHtml.title = isFs ? 'Thoát toàn màn hình (F11)' : 'Toàn màn hình (F11)';
    }
    const btnExam = document.getElementById('btn-exam-fullscreen');
    if (btnExam) {
      btnExam.innerHTML = isFs ? '⛶ Thu Nhỏ (F11)' : '⛶ Toàn Màn Hình';
      btnExam.title = isFs ? 'Thoát toàn màn hình (F11)' : 'Bật/Tắt Toàn Màn Hình (F11)';
    }
  };


  // Render nội dung Slide Trình Chiếu
  function renderPresentationSlideContent(overlay) {
    const p = window.__meaPresentation;
    const exam = p.exam;
    if (!exam || !exam.questions || exam.questions.length === 0) return;

    const q = exam.questions[p.currentIdx];
    const total = exam.questions.length;
    const progressPct = ((p.currentIdx + 1) / total) * 100;

    // Render Options
    let optsHtml = '';
    if (q.options) {
      const keys = Object.keys(q.options).sort();
      optsHtml = keys.map(k => {
        const isSelected = p.selectedOption === k;
        const isCorrect = (q.correctAnswer || '').trim().toUpperCase() === k.toUpperCase();
        let stateClass = '';
        if (isSelected) stateClass += ' selected';
        if (p.showAnswer && isCorrect) stateClass += ' is-correct';
        if (p.showAnswer && isSelected && !isCorrect) stateClass += ' is-wrong';

        return `
          <div class="mea-present-opt-card ${stateClass}" onclick="window.presentationSelectOption('${k}')">
            <div class="mea-present-opt-key">${k}</div>
            <div class="mea-present-opt-val">${renderMath(q.options[k])}</div>
          </div>
        `;
      }).join('');
    }

    // Explanation Box
    let expHtml = '';
    if (p.showAnswer) {
      expHtml = `
        <div class="mea-present-explanation-box">
          <div style="font-weight:700;margin-bottom:8px;color:#2dd4bf;display:flex;align-items:center;gap:6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            LỜI GIẢI CHI TIẾT • ĐÁP ÁN ĐÚNG: ${q.correctAnswer || 'Chưa cập nhật'}
          </div>
          <div>${renderMath(q.explanation || 'Chưa có lời giải chi tiết cho câu hỏi này.')}</div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="mea-present-header">
        <div class="mea-present-title-group">
          <span class="mea-present-badge-code">${q.code || ('Câu ' + (p.currentIdx + 1))}</span>
          <span class="mea-present-exam-name">${exam.title}</span>
          ${q.level ? `<span class="mea-present-meta-badge">${q.level}</span>` : ''}
          ${q.topic ? `<span class="mea-present-meta-badge">${q.topic}</span>` : ''}
        </div>

        <div class="mea-present-header-actions">
          <button class="mea-present-btn ${p.showAnswer ? 'primary' : ''}" onclick="window.presentationToggleAnswer()" title="Hiện/ẩn đáp án và lời giải chi tiết (Phím E)">
            👁️ ${p.showAnswer ? 'Ẩn Lời Giải' : 'Hiện Lời Giải (E)'}
          </button>
          <button class="mea-present-btn" onclick="window.presentationInsertToWhiteboard()" title="Chép câu hỏi này vào trang bảng viết để đặt bút giải trực tiếp (Phím W)">
            📝 Chép Ra Bảng (W)
          </button>
          <button class="mea-present-btn close" onclick="window.closeExamPresentation()" title="Thoát chế độ trình chiếu (Esc)">
            ✕ Thoát (Esc)
          </button>
        </div>
      </div>

      <div class="mea-present-body">
        <div class="mea-present-q-card">
          <div class="mea-present-q-text">
            ${renderMath(q.content)}
          </div>

          ${optsHtml ? `<div class="mea-present-options-grid">${optsHtml}</div>` : ''}

          ${expHtml}
        </div>
      </div>

      <div class="mea-present-dock">
        <div class="mea-present-dock-left">
          <button class="mea-present-nav-btn" onclick="window.presentationPrevSlide()" ${p.currentIdx === 0 ? 'disabled' : ''} title="Câu trước (Phím ← hoặc PageUp)">
            ◀ Câu Trước (←)
          </button>
        </div>

        <div class="mea-present-dock-center">
          <span style="font-size:15px;font-weight:700;color:#f1f5f9;">
            Câu ${p.currentIdx + 1} / ${total}
          </span>
          <select style="background:#1e293b;border:1px solid #334155;color:#f8fafc;padding:5px 10px;border-radius:6px;outline:none;" onchange="window.presentationJumpTo(parseInt(this.value, 10))">
            ${exam.questions.map((_, i) => `<option value="${i}" ${i === p.currentIdx ? 'selected' : ''}>Câu ${i + 1}</option>`).join('')}
          </select>
        </div>

        <div class="mea-present-dock-right">
          <button class="mea-present-nav-btn" onclick="window.presentationNextSlide()" ${p.currentIdx === total - 1 ? 'disabled' : ''} title="Câu sau (Phím → hoặc Phím Cách)">
            Câu Sau ▶ (→)
          </button>
        </div>

        <div class="mea-present-progress-bar" style="width: ${progressPct}%;"></div>
      </div>
    `;
  }

  // Bắt sự kiện bàn phím cho Trình Chiếu Slide (Clicker, Mũi tên, Phím tắt)
  document.addEventListener('keydown', function (e) {
    if (!window.__meaPresentation || !window.__meaPresentation.active) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      window.presentationNextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
      e.preventDefault();
      window.presentationPrevSlide();
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      window.presentationToggleAnswer();
    } else if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      window.presentationInsertToWhiteboard();
    } else if (e.key === 'Escape') {
      if (document.getElementById('mea-html-presentation-overlay')?.style.display === 'flex') {
        e.preventDefault();
        window.closeFullHtmlPresentation();
        return;
      }
      e.preventDefault();
      window.closeExamPresentation();
    } else if (e.key === 'F11') {
      e.preventDefault();
      window.presentationToggleFullscreen();
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const keys = ['A', 'B', 'C', 'D'];
      window.presentationSelectOption(keys[parseInt(e.key, 10) - 1]);
    } else if (['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key)) {
      window.presentationSelectOption(e.key.toUpperCase());
    }
  });

  // Khởi động đồng bộ khi trang tải xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBoardSync);
  } else {
    setupBoardSync();
  }


})();


  // ==========================================
  // 24. HỆ THỐNG TRÌNH CHIẾU BÀI GIẢNG HTML TOÀN DIỆN
  // ==========================================
  const STORAGE_KEY_HTML_LESSONS = 'mea_stored_html_lessons';
  window.__meaHtmlLessons = [];
  window.__meaActiveHtmlLesson = null;
  window.__meaHtmlAnnotation = {
    active: false,
    color: '#ef4444',
    lineWidth: 3,
    isDrawing: false,
    mode: 'pen' // 'pen', 'highlighter', 'pointer'
  };

  function getStoredHtmlLessons() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HTML_LESSONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function saveStoredHtmlLessons(list) {
    try {
      localStorage.setItem(STORAGE_KEY_HTML_LESSONS, JSON.stringify(list));
    } catch (err) {
      console.warn('saveStoredHtmlLessons error:', err);
    }
  }

  // Khởi tạo bài giảng mẫu (Chương III - Thầy Đỗ Minh Math)
  function initDefaultHtmlLessons() {
    window.__meaHtmlLessons = getStoredHtmlLessons();
    if (window.__meaHtmlLessons.length === 0 || (window.__meaHtmlLessons.length === 1 && window.__meaHtmlLessons[0].id === 'lesson_math11_chuong3')) {
      fetch('./assets/default-lesson-chuong3.html')
        .then(res => res.text())
        .then(text => {
          if (text && text.length > 100) {
            const defLesson = {
              id: 'lesson_math11_chuong3',
              title: 'Toán 11 • Chương III: Mẫu Số Liệu Ghép Nhóm - Thầy Đỗ Minh Math',
              description: 'Hệ thống bài học theo các bước hành động: Kỹ thuật ghép nhóm, Số trung bình, Trung vị & Tứ phân vị, Mốt, Luyện tập trắc nghiệm SGK tự chấm điểm tương tác.',
              author: 'Thầy Đỗ Minh Math',
              size: text.length,
              createdAt: Date.now(),
              htmlContent: text
            };
            window.__meaHtmlLessons = [defLesson];
            window.__meaActiveHtmlLesson = defLesson;
            saveStoredHtmlLessons(window.__meaHtmlLessons);
            const overlay = document.getElementById('mea-qb-modal-overlay');
            if (overlay && window.__meaActiveQbTab === 'html_lessons' && typeof window.__meaRenderQbModal === 'function') {
              window.__meaRenderQbModal(overlay);
            }
          }
        })
        .catch(err => console.warn('Cannot fetch default-lesson-chuong3.html:', err));
    } else if (!window.__meaActiveHtmlLesson && window.__meaHtmlLessons.length > 0) {
      window.__meaActiveHtmlLesson = window.__meaHtmlLessons[0];
    }
  }

  // Bắt đầu trình chiếu toàn màn hình bài giảng HTML
  window.startFullHtmlPresentation = function (lessonIdOrContent, optionalTitle) {
    let lesson = null;
    if (lessonIdOrContent && typeof lessonIdOrContent === 'string') {
      if (lessonIdOrContent.includes('<!DOCTYPE') || lessonIdOrContent.includes('<html') || lessonIdOrContent.includes('<body')) {
        lesson = {
          id: 'lesson_custom_' + Date.now(),
          title: optionalTitle || 'Tài Liệu Bài Giảng HTML',
          description: 'Bài giảng HTML mở từ tệp ngoài',
          author: 'Người dùng',
          size: lessonIdOrContent.length,
          createdAt: Date.now(),
          htmlContent: lessonIdOrContent
        };
        // Thêm vào danh sách và lưu
        window.__meaHtmlLessons.unshift(lesson);
        saveStoredHtmlLessons(window.__meaHtmlLessons);
      } else {
        lesson = window.__meaHtmlLessons.find(l => l.id === lessonIdOrContent);
      }
    }

    if (!lesson) {
      lesson = window.__meaActiveHtmlLesson || (window.__meaHtmlLessons.length > 0 ? window.__meaHtmlLessons[0] : null);
    }

    if (!lesson || !lesson.htmlContent) {
      fetch('./assets/default-lesson-chuong3.html')
        .then(res => res.text())
        .then(text => {
          if (text) {
            const defLesson = {
              id: 'lesson_math11_chuong3',
              title: 'Toán 11 • Chương III: Mẫu Số Liệu Ghép Nhóm - Thầy Đỗ Minh Math',
              description: 'Hệ thống bài học theo các bước hành động',
              author: 'Thầy Đỗ Minh Math',
              size: text.length,
              createdAt: Date.now(),
              htmlContent: text
            };
            window.__meaHtmlLessons = [defLesson];
            window.__meaActiveHtmlLesson = defLesson;
            saveStoredHtmlLessons(window.__meaHtmlLessons);
            window.startFullHtmlPresentation(defLesson.id);
          }
        });
      return;
    }

    window.__meaActiveHtmlLesson = lesson;

    let overlay = document.getElementById('mea-html-presentation-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mea-html-presentation-overlay';
      overlay.className = 'mea-html-present-overlay';
      document.body.appendChild(overlay);
    }

    renderHtmlPresentationViewer(overlay, lesson);
    overlay.style.display = 'flex';
    if (window.closeQuestionBankModal) window.closeQuestionBankModal();
    if (window.closeExamPresentation) window.closeExamPresentation();
  };

  // Render Viewer Trình Chiếu HTML
  function renderHtmlPresentationViewer(overlay, lesson) {
    const list = window.__meaHtmlLessons || [];
    let optionsHtml = list.map(l => `<option value="${l.id}" ${l.id === lesson.id ? 'selected' : ''}>${l.title}</option>`).join('');

    overlay.innerHTML = `
      <!-- Top Dock -->
      <div class="mea-html-present-dock">
        <div class="mea-html-present-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span title="${lesson.title}">${lesson.title}</span>
        </div>

        <div class="mea-html-present-actions">
          <select class="mea-html-lesson-select" onchange="window.selectAndPresentHtmlLesson(this.value)" title="Chuyển nhanh sang bài giảng khác trong kho">
            ${optionsHtml}
          </select>
          <button class="mea-present-btn primary" onclick="window.promptOpenHtmlFile()" title="Mở file HTML từ máy tính để chiếu">
            📂 Mở File HTML
          </button>
          <button class="mea-present-btn" onclick="window.saveActiveHtmlToStorage()" title="Lưu bài giảng này vào Kho Lưu Trữ">
            💾 Lưu Vào Kho
          </button>
          <button class="mea-present-btn" id="btn-toggle-anno" onclick="window.toggleHtmlAnnotationOverlay()" title="Bật/Tắt bút vẽ chú thích trực tiếp lên trang bài giảng">
            🖊️ Chú Thích
          </button>
          <button class="mea-present-btn close" onclick="window.closeFullHtmlPresentation()" title="Đóng trình chiếu (Esc)">
            ✕ Thoát (Esc)
          </button>
        </div>
      </div>

      <!-- Viewport -->
      <div class="mea-html-viewport-wrapper">
        <iframe id="mea-html-iframe" class="mea-html-iframe"></iframe>
        <canvas id="mea-html-annotation-canvas" class="mea-html-annotation-canvas" style="display:none;"></canvas>

        <!-- Floating Annotation Palette (Khi bật chú thích) -->
        <div id="mea-html-anno-toolbar" class="mea-html-annotation-toolbar" style="display:none;">
          <button class="mea-anno-tool-btn active" id="btn-anno-red" onclick="window.setAnnoColor('#ef4444', 3, 'pen')">🔴 Bút Đỏ</button>
          <button class="mea-anno-tool-btn" id="btn-anno-yellow" onclick="window.setAnnoColor('rgba(250, 204, 21, 0.45)', 16, 'highlighter')">🟡 Dạ Quang</button>
          <button class="mea-anno-tool-btn" id="btn-anno-blue" onclick="window.setAnnoColor('#0284c7', 3, 'pen')">🔵 Bút Xanh</button>
          <button class="mea-anno-tool-btn" onclick="window.clearAnnoCanvas()">🧽 Xóa Nét</button>
          <button class="mea-anno-tool-btn" id="btn-anno-pointer" onclick="window.toggleAnnoPointerMode()">👆 Chuột/Cuộn</button>
          <button class="mea-anno-tool-btn close" onclick="window.toggleHtmlAnnotationOverlay()" style="color:#f87171;">✕ Xong</button>
        </div>
      </div>
    `;

    const iframe = document.getElementById('mea-html-iframe');
    if (iframe) {
      iframe.srcdoc = lesson.htmlContent;
    }
  }

  // Đóng trình chiếu HTML
  window.closeFullHtmlPresentation = function () {
    const overlay = document.getElementById('mea-html-presentation-overlay');
    if (overlay) overlay.style.display = 'none';
    if (window.__meaHtmlAnnotation) window.__meaHtmlAnnotation.active = false;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (window.__isHostFullScreen && window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({ type: 'TOGGLE_FULLSCREEN', timestamp: Date.now() });
    }
  };

  // Chọn và đổi bài giảng trong viewer
  window.selectAndPresentHtmlLesson = function (lessonId) {
    const found = window.__meaHtmlLessons.find(l => l.id === lessonId);
    if (found) {
      window.startFullHtmlPresentation(found.id);
    }
  };

  // Mở file HTML từ máy tính
  window.promptOpenHtmlFile = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm';
    input.onchange = function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const text = ev.target.result;
        if (!text) return;
        const cleanName = file.name.replace(/\.html?$/i, '');
        const newLesson = {
          id: 'lesson_' + Date.now(),
          title: cleanName,
          description: 'Bài giảng HTML nạp từ ' + file.name,
          author: 'Tệp nội bộ',
          size: text.length,
          createdAt: Date.now(),
          htmlContent: text
        };

        window.__meaHtmlLessons.unshift(newLesson);
        window.__meaActiveHtmlLesson = newLesson;
        saveStoredHtmlLessons(window.__meaHtmlLessons);

        // Khởi chạy trình chiếu ngay
        window.startFullHtmlPresentation(newLesson.id);
        showToast(`Đã nạp và trình chiếu bài giảng "${cleanName}"!`);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Dán mã HTML trực tiếp
  
  // ==========================================
  // MODAL DÁN & LƯU BÀI GIẢNG HTML CHUYÊN NGHIỆP
  // ==========================================
  window.openPasteHtmlModal = function (initialCode = '') {
    let overlay = document.getElementById('mea-paste-html-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mea-paste-html-modal-overlay';
      overlay.className = 'mea-qb-modal-overlay';
      overlay.style.zIndex = '100005';
      overlay.onclick = function (e) {
        if (e.target === overlay) window.closePasteHtmlModal();
      };
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="mea-qb-modal-card mea-paste-modal-card">
        <!-- Header -->
        <div class="mea-qb-modal-header">
          <div class="mea-qb-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Dán &amp; Lưu Bài Giảng HTML (MinNote Studio)
          </div>
          <button class="mea-qb-close-btn" onclick="window.closePasteHtmlModal()" title="Đóng">✕</button>
        </div>

        <!-- Body -->
        <div class="mea-paste-body">
          <!-- Ô tiêu đề bài giảng -->
          <div>
            <label class="mea-paste-label">
              Tiêu Đề Bài Giảng:
            </label>
            <input type="text" id="mea-paste-title-input" class="mea-paste-input" placeholder="Nhập tên bài giảng (tự động nhận diện từ thẻ &lt;title&gt; nếu để trống)..." />
          </div>

          <!-- Khu vực Textarea Dán Mã -->
          <div style="flex:1;display:flex;flex-direction:column;min-height:280px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label class="mea-paste-label" style="margin-bottom:0;">
                Mã Nguồn HTML (Hỗ trợ Tailwind CSS, KaTeX, JavaScript, Form trắc nghiệm):
              </label>
              <div style="display:flex;gap:8px;align-items:center;">
                <span id="mea-paste-size-indicator" class="mea-qb-accent-strong" style="font-size:12px;">0 KB</span>
                <button type="button" class="mea-present-btn" onclick="window.pasteFromClipboardToEditor()" style="padding:4px 12px;font-size:12px;border-radius:6px;display:flex;align-items:center;gap:4px;">
                  📋 Dán Từ Clipboard
                </button>
                <button type="button" class="mea-present-btn close" onclick="document.getElementById('mea-paste-textarea').value=''; window.updatePasteModalStats();" style="padding:4px 10px;font-size:12px;border-radius:6px;">
                  🧹 Xóa Trắng
                </button>
              </div>
            </div>

            <textarea id="mea-paste-textarea" class="mea-paste-textarea" placeholder="Dán toàn bộ mã &lt;!DOCTYPE html&gt; vào đây (Bấm Ctrl+V)..." oninput="window.updatePasteModalStats()"></textarea>
          </div>
        </div>

        <!-- Footer Hành Động -->
        <div class="mea-qb-modal-footer">
          <div style="font-size:12px;">
            💡 Phím tắt: <strong>Ctrl + Enter</strong> để Lưu &amp; Chiếu Ngay
          </div>
          <div style="display:flex;gap:10px;">
            <button class="mea-present-btn" onclick="window.closePasteHtmlModal()" style="padding:8px 16px;border-radius:8px;">
              Hủy Bỏ
            </button>
            <button class="mea-present-btn" onclick="window.savePastedHtmlLesson(false)" style="background:#0284c7;color:#fff;border-color:#0284c7;border-radius:8px;padding:8px 18px;font-weight:700;">
              💾 Chỉ Lưu Vào Kho
            </button>
            <button class="mea-present-btn primary" onclick="window.savePastedHtmlLesson(true)" style="background:#2563eb;color:#fff;border-radius:8px;padding:8px 22px;font-weight:700;border:none;box-shadow:0 4px 14px rgba(37,99,235,0.36);">
              ▶ Lưu &amp; Trình Chiếu Ngay (F5)
            </button>
          </div>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
    const textarea = document.getElementById('mea-paste-textarea');
    if (initialCode) {
      textarea.value = initialCode;
      window.updatePasteModalStats();
    } else {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
          if (text && (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<div') || text.includes('<main'))) {
            textarea.value = text;
            window.updatePasteModalStats();
          }
        }).catch(() => {});
      }
    }
    textarea.focus();

    textarea.onkeydown = function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.savePastedHtmlLesson(true);
      }
    };
  };

  window.closePasteHtmlModal = function () {
    const overlay = document.getElementById('mea-paste-html-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.pasteFromClipboardToEditor = function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        if (text) {
          const textarea = document.getElementById('mea-paste-textarea');
          textarea.value = text;
          window.updatePasteModalStats();
          if (typeof showToast === 'function') showToast('Đã dán nội dung từ Clipboard!');
        }
      }).catch(() => {
        if (typeof showToast === 'function') showToast('Vui lòng bấm Ctrl+V vào ô mã');
      });
    }
  };

  window.updatePasteModalStats = function () {
    const textarea = document.getElementById('mea-paste-textarea');
    const titleInput = document.getElementById('mea-paste-title-input');
    const indicator = document.getElementById('mea-paste-size-indicator');
    if (!textarea) return;
    const text = textarea.value;
    const kb = (text.length / 1024).toFixed(1);
    if (indicator) indicator.innerText = `${text.length.toLocaleString()} ký tự (${kb} KB)`;

    if (titleInput && (!titleInput.value || titleInput.value.trim() === '')) {
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match && match[1]) {
        titleInput.value = match[1].trim();
      }
    }
  };

  window.savePastedHtmlLesson = function (shouldPresent = true) {
    const textarea = document.getElementById('mea-paste-textarea');
    const titleInput = document.getElementById('mea-paste-title-input');
    if (!textarea) return;
    const code = textarea.value.trim();
    if (!code || code.length < 15) {
      if (window.meaAlert) window.meaAlert('Vui lòng dán mã HTML vào ô nội dung trước khi lưu!'); else showToast('Vui lòng dán mã HTML vào ô nội dung trước khi lưu!');
      return;
    }

    let title = titleInput ? titleInput.value.trim() : '';
    if (!title) {
      const match = code.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = match && match[1] ? match[1].trim() : ('Bài Giảng ' + new Date().toLocaleDateString('vi-VN'));
    }

    const newLesson = {
      id: 'lesson_' + Date.now(),
      title: title,
      description: 'Bài giảng HTML dán trực tiếp (' + (code.length / 1024).toFixed(1) + ' KB)',
      author: 'Thầy Đỗ Minh Math',
      size: code.length,
      createdAt: Date.now(),
      htmlContent: code
    };

    window.__meaHtmlLessons = window.__meaHtmlLessons || [];
    window.__meaHtmlLessons.unshift(newLesson);
    window.__meaActiveHtmlLesson = newLesson;
    if (typeof saveStoredHtmlLessons === 'function') {
      saveStoredHtmlLessons(window.__meaHtmlLessons);
    }

    window.closePasteHtmlModal();

    const qbOverlay = document.getElementById('mea-qb-modal-overlay');
    if (qbOverlay && qbOverlay.style.display === 'flex') {
      window.switchQbTab('html_lessons');
    }

    if (shouldPresent && typeof window.startFullHtmlPresentation === 'function') {
      window.startFullHtmlPresentation(newLesson.id);
      if (typeof showToast === 'function') showToast(`Đã lưu & mở trình chiếu: "${title}"!`);
    } else {
      if (typeof showToast === 'function') showToast(`Đã lưu thành công bài giảng: "${title}" vào kho!`);
    }
  };

  window.promptPasteHtmlCode = function (initialCode = '') {
    window.openPasteHtmlModal(initialCode);
  };

  window.downloadHtmlLessonFile = function (lessonId) {
    const les = window.__meaHtmlLessons.find(l => l.id === lessonId) || window.__meaActiveHtmlLesson;
    if (!les || !les.htmlContent) return;
    const blob = new Blob([les.htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (les.title || 'bai-giang').replace(/[^a-zA-Z0-9_-]/g, '_') + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    showToast(`Đã tải file "${les.title}.html" về máy tính!`);
  };

  // Lưu bài giảng hiện tại vào kho lưu trữ
  window.saveActiveHtmlToStorage = function () {
    if (!window.__meaActiveHtmlLesson) return;
    const les = window.__meaActiveHtmlLesson;
    const idx = window.__meaHtmlLessons.findIndex(l => l.id === les.id);
    if (idx >= 0) {
      window.__meaHtmlLessons[idx] = les;
    } else {
      window.__meaHtmlLessons.unshift(les);
    }
    saveStoredHtmlLessons(window.__meaHtmlLessons);
    showToast(`Đã lưu "${les.title}" vào Kho Lưu Trữ thành công!`);
  };

  // Xóa bài giảng khỏi kho
  window.deleteHtmlLessonFromStorage = async function (lessonId) {
    const target = (window.__meaHtmlLessons || []).find(l => l.id === lessonId);
    const lesTitle = target ? target.title : 'bài giảng này';
    const ok = await window.meaConfirm({
      title: 'Xóa Bài Giảng HTML',
      message: `Bạn có chắc chắn muốn xóa bài giảng "${lesTitle}" khỏi Kho Lưu Trữ?`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
      isDanger: true
    });
    if (!ok) return;
    window.__meaHtmlLessons = window.__meaHtmlLessons.filter(l => l.id !== lessonId);
    if (window.__meaHtmlLessons.length === 0) {
      window.restoreDefaultHtmlLessons();
      return;
    }
    saveStoredHtmlLessons(window.__meaHtmlLessons);
    if (window.__meaActiveHtmlLesson && window.__meaActiveHtmlLesson.id === lessonId) {
      window.__meaActiveHtmlLesson = window.__meaHtmlLessons[0] || null;
    }
    showToast('Đã xóa bài giảng khỏi Kho Lưu Trữ!');
    const overlay = document.getElementById('mea-qb-modal-overlay');
    if (overlay && typeof window.__meaRenderQbModal === 'function') window.__meaRenderQbModal(overlay);
  };

  // Khôi phục bài giảng mẫu
  window.restoreDefaultHtmlLessons = function () {
    fetch('./assets/default-lesson-chuong3.html')
      .then(res => res.text())
      .then(text => {
        const defLesson = {
          id: 'lesson_math11_chuong3',
          title: 'Toán 11 • Chương III: Mẫu Số Liệu Ghép Nhóm - Thầy Đỗ Minh Math',
          description: 'Hệ thống bài học theo các bước hành động: Kỹ thuật ghép nhóm, Số trung bình, Trung vị & Tứ phân vị, Mốt, Luyện tập trắc nghiệm SGK tự chấm điểm tương tác.',
          author: 'Thầy Đỗ Minh Math',
          size: text.length,
          createdAt: Date.now(),
          htmlContent: text
        };
        window.__meaHtmlLessons = [defLesson];
        window.__meaActiveHtmlLesson = defLesson;
        saveStoredHtmlLessons(window.__meaHtmlLessons);
        showToast('Đã khôi phục bài giảng mẫu của Thầy Đỗ Minh Math!');
        const overlay = document.getElementById('mea-qb-modal-overlay');
        if (overlay && typeof window.__meaRenderQbModal === 'function') window.__meaRenderQbModal(overlay);
      });
  };

  // Toàn màn hình
  window.toggleHtmlPresentationFullscreen = window.toggleHostFullscreen;

  // Bật/tắt chế độ bút vẽ chú thích trên bài giảng HTML
  window.toggleHtmlAnnotationOverlay = function () {
    const canvas = document.getElementById('mea-html-annotation-canvas');
    const toolbar = document.getElementById('mea-html-anno-toolbar');
    const btn = document.getElementById('btn-toggle-anno');
    if (!canvas || !toolbar) return;

    window.__meaHtmlAnnotation.active = !window.__meaHtmlAnnotation.active;
    if (window.__meaHtmlAnnotation.active) {
      canvas.style.display = 'block';
      toolbar.style.display = 'flex';
      canvas.style.pointerEvents = 'auto';
      if (btn) {
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
      }
      initAnnotationCanvas(canvas);
      showToast('Đã bật Bút Chú Thích! Bạn có thể vẽ, khoanh tròn trực tiếp lên bài giảng.');
    } else {
      canvas.style.display = 'none';
      toolbar.style.display = 'none';
      canvas.style.pointerEvents = 'none';
      if (btn) {
        btn.style.background = '';
        btn.style.color = '';
      }
    }
  };

  function initAnnotationCanvas(canvas) {
    if (canvas.__initialized) return;
    canvas.__initialized = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    const anno = window.__meaHtmlAnnotation;

    canvas.addEventListener('pointerdown', (e) => {
      if (anno.mode === 'pointer') return;
      anno.isDrawing = true;
      ctx.beginPath();
      ctx.strokeStyle = anno.color;
      ctx.lineWidth = anno.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!anno.isDrawing || anno.mode === 'pointer') return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });

    canvas.addEventListener('pointerup', () => { anno.isDrawing = false; });
    canvas.addEventListener('pointercancel', () => { anno.isDrawing = false; });
  }

  window.setAnnoColor = function (color, width, mode) {
    const anno = window.__meaHtmlAnnotation;
    anno.color = color;
    anno.lineWidth = width;
    anno.mode = mode;

    const canvas = document.getElementById('mea-html-annotation-canvas');
    if (canvas) canvas.style.pointerEvents = 'auto';

    document.querySelectorAll('.mea-anno-tool-btn').forEach(b => b.classList.remove('active'));
    if (color === '#ef4444') document.getElementById('btn-anno-red')?.classList.add('active');
    else if (color === '#0284c7') document.getElementById('btn-anno-blue')?.classList.add('active');
    else if (mode === 'highlighter') document.getElementById('btn-anno-yellow')?.classList.add('active');
  };

  window.clearAnnoCanvas = function () {
    const canvas = document.getElementById('mea-html-annotation-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  window.toggleAnnoPointerMode = function () {
    const anno = window.__meaHtmlAnnotation;
    const canvas = document.getElementById('mea-html-annotation-canvas');
    const btn = document.getElementById('btn-anno-pointer');
    if (anno.mode === 'pointer') {
      anno.mode = 'pen';
      if (canvas) canvas.style.pointerEvents = 'auto';
      if (btn) btn.classList.remove('active');
    } else {
      anno.mode = 'pointer';
      if (canvas) canvas.style.pointerEvents = 'none';
      if (btn) btn.classList.add('active');
      showToast('Chế độ Chuột: Bây giờ bạn có thể cuộn trang và nhấn trắc nghiệm.');
    }
  };

  // Khởi tạo danh sách bài giảng mẫu lúc mở app
  initDefaultHtmlLessons();


  // Khởi tạo Floating Button Nạp & Chiếu HTML trên Canvas
  function initFloatingHtmlButton() {
    // Đã ẩn nút nổi ở dưới theo yêu cầu người dùng
    const existing = document.getElementById('mea-floating-html-btn');
    if (existing) existing.remove();

    // Vẫn duy trì phím tắt Ctrl + Shift + V toàn window trong Whiteboard
    window.addEventListener('keydown', function(e) {
      if (e.key === 'V' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        if (typeof window.openPasteHtmlModal === 'function') window.openPasteHtmlModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingHtmlButton);
  } else {
    initFloatingHtmlButton();
  }

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
