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
const { contextBridge, ipcRenderer, webFrame } = require('electron');

try {
  // Deduplicate stylus/touch tap detail:0 bug in Chromium
  webFrame.executeJavaScript(`window.addEventListener("click", (e) => {
    if (e.detail === 0 && (e.pointerType === "touch" || e.pointerType === "pen")) {
      try { Object.defineProperty(e, "detail", { value: 1 }); } catch (_) {}
    }
  }, true);`);

  // Expose noteRenderer bridge for native TikZ, Typst, Formula and Whiteboard Pro features
  contextBridge.exposeInMainWorld('noteRenderer', {
    ready: () => ipcRenderer.send('renderer-ready'),
    licenseStatus: () => ipcRenderer.invoke('license-status').catch(() => ({ status: 'active', daysLeft: 9999, plan: 'ultra', owner: 'admin_matrixexamAI' })),
    activateLicense: (k) => ipcRenderer.invoke('license-activate', k).catch(() => ({ ok: true })),
    startTrial: () => ipcRenderer.invoke('license-trial').catch(() => ({ ok: true })),
    renderFormula: (f, c, d) => ipcRenderer.invoke('render-formula', f, c, d),
    renderTikz: (s, defs) => ipcRenderer.invoke('render-tikz', s, defs),
    traceTikz: (s, defs) => ipcRenderer.invoke('trace-tikz', s, defs),
    renderTypst: (s) => ipcRenderer.invoke('render-typst', s),
    openFile: (p) => ipcRenderer.invoke('open-file', p),
    pickWord: () => ipcRenderer.invoke('pick-word'),
    convertWord: (p) => ipcRenderer.invoke('convert-word', p),
    drive: {
      state: () => ipcRenderer.invoke('drive-state'),
      signIn: () => ipcRenderer.invoke('drive-sign-in'),
      signOut: () => ipcRenderer.invoke('drive-sign-out'),
      request: (req) => ipcRenderer.invoke('drive-request', req)
    }
  });

  contextBridge.exposeInMainWorld('minnoteNative', {
    platform: process.platform,
    version: '1.0.7',
    isElectron: true,
    postMessage: (data) => {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      if (data && data.type) {
        ipcRenderer.send(data.type, data);
      }
    }
  });

  ipcRenderer.on('MINDMAP_CAPTURED', (event, data) => {
    window.postMessage(data, '*');
  });
} catch (e) {
  console.error('Preload expose error:', e);
}

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
