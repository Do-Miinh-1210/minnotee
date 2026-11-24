(function () {
  'use strict';

  const nativeAlert = typeof window.alert === 'function' ? window.alert.bind(window) : null;
  if (nativeAlert && !window.__nativeAlert) {
    window.__nativeAlert = nativeAlert;
  }

  let overlayEl = null;
  let activeOpen = false;
  let queue = Promise.resolve();

  const ICON_SVGS = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    prompt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>'
  };

  function detectConfirmMeta(message) {
    const s = String(message || '');
    if (/(?:xóa|xoá|delete|đăng xuất|sign out|bỏ thay đổi|discard|làm mới|kết thúc)/i.test(s)) {
      const isDelete = /(?:xóa|xoá|delete)/i.test(s);
      return {
        tone: 'danger',
        title: isDelete ? 'Xác nhận xóa' : 'Xác nhận thao tác',
        confirmText: isDelete ? 'Xóa' : 'Xác nhận'
      };
    }
    if (/(?:khôi phục|thay thế|áp dụng mẫu|replace)/i.test(s)) {
      return {
        tone: 'warning',
        title: 'Xác nhận thay đổi',
        confirmText: 'Tiếp tục'
      };
    }
    return {
      tone: 'info',
      title: 'Xác nhận thao tác',
      confirmText: 'Xác nhận'
    };
  }

  function detectAlertMeta(message) {
    const s = String(message || '');
    if (/(?:lỗi|không thể|thất bại|không hợp lệ|không gửi được|bị khóa)/i.test(s)) {
      return { tone: 'danger', title: 'Thông báo lỗi' };
    }
    if (/(?:vui lòng|chưa |hết giờ|yêu cầu|chưa sẵn sàng|chưa nạp)/i.test(s)) {
      return { tone: 'warning', title: 'Lưu ý' };
    }
    if (/(?:thành công|đã lưu|đã sao chép|đã xóa|đã xoá|đã phát|đã xuất)/i.test(s)) {
      return { tone: 'success', title: 'Hoàn tất' };
    }
    return { tone: 'info', title: 'Thông báo' };
  }

  function ensureOverlay() {
    if (overlayEl && overlayEl.isConnected) return overlayEl;
    const existing = document.getElementById('mn-dialog-overlay');
    if (existing) {
      overlayEl = existing;
      return overlayEl;
    }
    overlayEl = document.createElement('div');
    overlayEl.id = 'mn-dialog-overlay';
    overlayEl.className = 'mn-dlg-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    const host = document.body || document.documentElement;
    host.appendChild(overlayEl);
    return overlayEl;
  }

  function waitForDomReady() {
    if (document.body) return Promise.resolve();
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  function showModal(spec) {
    return waitForDomReady().then(() => new Promise((resolve) => {
      const overlay = ensureOverlay();
      overlay.innerHTML = '';

      const tone = ICON_SVGS[spec.tone] ? spec.tone : 'info';
      const card = document.createElement('div');
      card.className = 'mn-dlg-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');

      const titleId = 'mn-dlg-title-' + Date.now();
      card.setAttribute('aria-labelledby', titleId);

      // Header
      const header = document.createElement('div');
      header.className = 'mn-dlg-header';

      const iconEl = document.createElement('div');
      iconEl.className = 'mn-dlg-icon ' + tone;
      iconEl.innerHTML = ICON_SVGS[tone] || ICON_SVGS.info;

      const titlesWrap = document.createElement('div');
      titlesWrap.className = 'mn-dlg-titles';

      const titleEl = document.createElement('div');
      titleEl.id = titleId;
      titleEl.className = 'mn-dlg-title';
      titleEl.textContent = spec.title || 'MinNote';
      titlesWrap.appendChild(titleEl);

      if (spec.subtitle) {
        const subEl = document.createElement('div');
        subEl.className = 'mn-dlg-subtitle';
        subEl.textContent = spec.subtitle;
        titlesWrap.appendChild(subEl);
      }

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'mn-dlg-close';
      closeBtn.setAttribute('aria-label', 'Đóng hộp thoại');
      closeBtn.textContent = '✕';

      header.appendChild(iconEl);
      header.appendChild(titlesWrap);
      header.appendChild(closeBtn);
      card.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = 'mn-dlg-body';

      const msgEl = document.createElement('div');
      msgEl.className = 'mn-dlg-msg';
      msgEl.textContent = String(spec.message ?? '');
      body.appendChild(msgEl);

      let inputEl = null;
      if (spec.mode === 'prompt') {
        inputEl = document.createElement('input');
        inputEl.type = spec.inputType || 'text';
        inputEl.className = 'mn-dlg-input';
        inputEl.value = spec.defaultValue != null ? String(spec.defaultValue) : '';
        if (spec.placeholder) inputEl.placeholder = String(spec.placeholder);
        body.appendChild(inputEl);
      }
      card.appendChild(body);

      // Footer
      const footer = document.createElement('div');
      footer.className = 'mn-dlg-footer';

      let cancelBtn = null;
      if (spec.mode !== 'alert') {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'mn-dlg-btn secondary';
        cancelBtn.textContent = spec.cancelText || 'Hủy';
        footer.appendChild(cancelBtn);
      }

      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      const okVariant = tone === 'danger' ? 'danger' : (tone === 'warning' ? 'warning' : 'primary');
      okBtn.className = 'mn-dlg-btn ' + okVariant;
      okBtn.textContent = spec.confirmText || (spec.mode === 'alert' ? 'Đã hiểu' : 'Xác nhận');
      footer.appendChild(okBtn);
      card.appendChild(footer);

      overlay.appendChild(card);
      overlay.style.display = 'flex';
      overlay.setAttribute('aria-hidden', 'false');
      activeOpen = true;

      let finished = false;
      function finish(val) {
        if (finished) return;
        finished = true;
        activeOpen = false;
        window.removeEventListener('keydown', onKeyDown, true);
        overlay.removeEventListener('pointerdown', onOverlayPointerDown);
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '';
        resolve(val);
      }

      function cancelValue() {
        if (spec.mode === 'prompt') return null;
        if (spec.mode === 'confirm') return false;
        return undefined;
      }

      function acceptValue() {
        if (spec.mode === 'prompt') return inputEl ? inputEl.value : '';
        if (spec.mode === 'confirm') return true;
        return undefined;
      }

      function onKeyDown(e) {
        if (!activeOpen) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          finish(cancelValue());
          return;
        }
        if (e.key === 'Enter') {
          const active = document.activeElement;
          if (cancelBtn && active === cancelBtn) {
            e.preventDefault();
            e.stopPropagation();
            finish(cancelValue());
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          finish(acceptValue());
          return;
        }
        e.stopPropagation();
      }

      function onOverlayPointerDown(e) {
        if (e.target === overlay) {
          e.stopPropagation();
          finish(cancelValue());
        }
      }

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        finish(cancelValue());
      });
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          finish(cancelValue());
        });
      }
      okBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        finish(acceptValue());
      });

      window.addEventListener('keydown', onKeyDown, true);
      overlay.addEventListener('pointerdown', onOverlayPointerDown);

      requestAnimationFrame(() => {
        try {
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          } else if (tone === 'danger' && cancelBtn) {
            cancelBtn.focus();
          } else {
            okBtn.focus();
          }
        } catch (_) {}
      });
    }));
  }

  function enqueue(spec) {
    const run = () => showModal(spec);
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  function alertDialog(arg, titleArg) {
    if (arg && typeof arg === 'object') {
      const meta = detectAlertMeta(arg.message);
      return enqueue({
        mode: 'alert',
        title: arg.title || meta.title,
        subtitle: arg.subtitle || 'MinNote',
        message: arg.message || '',
        confirmText: arg.confirmText || 'Đã hiểu',
        tone: arg.tone || (arg.isDanger ? 'danger' : meta.tone)
      });
    }
    const msg = String(arg ?? '');
    const meta = detectAlertMeta(msg);
    return enqueue({
      mode: 'alert',
      title: typeof titleArg === 'string' && titleArg.trim() ? titleArg.trim() : meta.title,
      subtitle: 'MinNote',
      message: msg,
      confirmText: 'Đã hiểu',
      tone: meta.tone
    });
  }

  function confirmDialog(arg) {
    if (arg && typeof arg === 'object') {
      const meta = detectConfirmMeta(arg.message);
      const tone = arg.tone || (arg.isDanger === true ? 'danger' : (arg.isDanger === false ? 'info' : meta.tone));
      return enqueue({
        mode: 'confirm',
        title: arg.title || meta.title,
        subtitle: arg.subtitle || 'MinNote',
        message: arg.message || 'Bạn có chắc chắn muốn thực hiện thao tác này?',
        confirmText: arg.confirmText || meta.confirmText,
        cancelText: arg.cancelText || 'Hủy',
        tone
      });
    }
    const msg = String(arg ?? '');
    const meta = detectConfirmMeta(msg);
    return enqueue({
      mode: 'confirm',
      title: meta.title,
      subtitle: 'MinNote',
      message: msg,
      confirmText: meta.confirmText,
      cancelText: 'Hủy',
      tone: meta.tone
    });
  }

  function promptDialog(arg, defaultValueArg) {
    if (arg && typeof arg === 'object') {
      return enqueue({
        mode: 'prompt',
        title: arg.title || 'Nhập thông tin',
        subtitle: arg.subtitle || 'MinNote',
        message: arg.message || '',
        defaultValue: arg.defaultValue != null ? arg.defaultValue : '',
        placeholder: arg.placeholder || '',
        inputType: arg.inputType || 'text',
        confirmText: arg.confirmText || 'Lưu',
        cancelText: arg.cancelText || 'Hủy',
        tone: arg.tone || 'prompt'
      });
    }
    return enqueue({
      mode: 'prompt',
      title: 'Nhập thông tin',
      subtitle: 'MinNote',
      message: String(arg ?? ''),
      defaultValue: defaultValueArg != null ? String(defaultValueArg) : '',
      confirmText: 'Lưu',
      cancelText: 'Hủy',
      tone: 'prompt'
    });
  }

  window.MinNoteDialog = {
    alert: alertDialog,
    confirm: confirmDialog,
    prompt: promptDialog,
    isOpen: () => activeOpen
  };

  window.meaConfirm = (arg) => confirmDialog(arg);
  window.meaAlert = (message, title) => alertDialog(message, title);
  window.meaPrompt = (arg, defaultValue) => promptDialog(arg, defaultValue);

  // Replace browser native alert() with non-blocking MinNote in-app dialog
  window.alert = (message) => {
    alertDialog(String(message ?? ''));
  };
})();
