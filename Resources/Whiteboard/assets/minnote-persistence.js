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
   MinNote Local Persistence Bridge
   - Đồng bộ gương (mirror) IndexedDB -> NTFS (%LocalAppData%\MinNote\Notebooks)
   - Khôi phục tự động toàn bộ Sổ & Sheet khi mất điện, tắt ngang hoặc cập nhật app
   - Giao thức trao đổi hai chiều với WPF MainWindow khi Thoát / Lưu ngay / Cập nhật
   - Đồng bộ thư mục sao lưu cục bộ / OneDrive trên máy
   ============================================================================ */
(function () {
  'use strict';

  const pendingHostCalls = new Map();
  const pendingMirrors = new Set();
  const dirtyWaiters = [];
  let seq = 0;
  let idbStoreRef = null;
  let pendingInitialMirror = [];
  let sessionSaveTimer = 0;
  let listenerInstalled = false;

  function hasWebViewHost() {
    return !!(
      window.__isMinNoteWebView2 &&
      window.chrome &&
      window.chrome.webview &&
      typeof window.chrome.webview.postMessage === 'function'
    );
  }

  function ensureMessageListener() {
    if (listenerInstalled) return;
    listenerInstalled = true;
    const wv = window.chrome && window.chrome.webview;
    if (!wv || typeof wv.addEventListener !== 'function') return;

    wv.addEventListener('message', function (ev) {
      let msg = ev && ev.data;
      if (typeof msg === 'string') {
        try { msg = JSON.parse(msg); } catch (_) { return; }
      }
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'PERSIST_RESULT' && msg.id) {
        const entry = pendingHostCalls.get(msg.id);
        if (!entry) return;
        pendingHostCalls.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.ok) {
          entry.resolve(msg.result || {});
        } else {
          entry.reject(new Error(msg.error || 'Lỗi giao tiếp với MinNote Host.'));
        }
      }
    });
  }

  function callHost(type, payload, timeoutMs) {
    if (!hasWebViewHost()) {
      return Promise.resolve({ unsupported: true });
    }
    ensureMessageListener();
    return new Promise(function (resolve, reject) {
      const id = 'p_' + (++seq) + '_' + Date.now();
      const ms = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 8000;
      const timer = setTimeout(function () {
        if (pendingHostCalls.has(id)) {
          pendingHostCalls.delete(id);
          reject(new Error('Hết thời gian chờ phản hồi từ ứng dụng MinNote (' + type + ').'));
        }
      }, ms);
      pendingHostCalls.set(id, { resolve, reject, timer });
      try {
        window.chrome.webview.postMessage(Object.assign({ type: type, id: id }, payload || {}));
      } catch (err) {
        pendingHostCalls.delete(id);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  function trackMirror(promise) {
    pendingMirrors.add(promise);
    const done = () => pendingMirrors.delete(promise);
    promise.then(done, done);
    return promise;
  }

  async function flushPendingMirrors(maxWaitMs) {
    if (!pendingMirrors.size) return;
    const waitAll = Promise.allSettled(Array.from(pendingMirrors));
    if (!maxWaitMs) {
      await waitAll;
      return;
    }
    await Promise.race([
      waitAll,
      new Promise(r => setTimeout(r, maxWaitMs))
    ]);
  }

  function bytesToBase64(bytes) {
    if (!bytes || !bytes.length) return '';
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const chunks = [];
    const step = 0x8000;
    for (let i = 0; i < u8.length; i += step) {
      const sub = u8.subarray(i, Math.min(i + step, u8.length));
      let str = '';
      for (let j = 0; j < sub.length; j++) {
        str += String.fromCharCode(sub[j]);
      }
      chunks.push(str);
    }
    return btoa(chunks.join(''));
  }

  function base64ToBytes(b64) {
    if (!b64) return new Uint8Array(0);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }

  function mergePlacesJson(diskPlacesJson, preferDisk) {
    if (!diskPlacesJson) return;
    try {
      const diskObj = JSON.parse(diskPlacesJson);
      if (!diskObj || typeof diskObj !== 'object' || Array.isArray(diskObj)) return;
      let curObj = {};
      try {
        curObj = JSON.parse(localStorage.getItem('places') || '{}') || {};
        if (typeof curObj !== 'object' || Array.isArray(curObj)) curObj = {};
      } catch (_) {
        curObj = {};
      }
      const merged = preferDisk
        ? Object.assign({}, curObj, diskObj)
        : Object.assign({}, diskObj, curObj);
      localStorage.setItem('places', JSON.stringify(merged));
    } catch (_) {}
  }

  function collectGeoScriptsJson() {
    try {
      const out = {};
      let totalLen = 0;
      const MAX_TOTAL = 2 * 1024 * 1024;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !(k.startsWith('mn_geo_scripts_') || k.startsWith('mn_geo_script_'))) continue;
        const v = localStorage.getItem(k);
        if (!v || v === '{}' || v === '[]') continue;
        if (totalLen + v.length > MAX_TOTAL) continue;
        out[k] = v;
        totalLen += v.length;
      }
      return Object.keys(out).length ? JSON.stringify(out) : '';
    } catch (_) {
      return '';
    }
  }

  function mergeGeoScriptsJson(diskGeoScriptsJson) {
    if (!diskGeoScriptsJson) return;
    try {
      const diskBundle = JSON.parse(diskGeoScriptsJson);
      if (!diskBundle || typeof diskBundle !== 'object' || Array.isArray(diskBundle)) return;
      for (const [lsKey, rawVal] of Object.entries(diskBundle)) {
        if (!lsKey || typeof rawVal !== 'string' || !rawVal) continue;
        if (!(lsKey.startsWith('mn_geo_scripts_') || lsKey.startsWith('mn_geo_script_'))) continue;
        const curRaw = localStorage.getItem(lsKey);
        if (!curRaw) {
          localStorage.setItem(lsKey, rawVal);
          continue;
        }
        // Merge per-script maps by newest updatedAt so neither disk nor localStorage loses any script
        if (lsKey.startsWith('mn_geo_scripts_') && !lsKey.startsWith('mn_geo_scripts_bak_') && !lsKey.startsWith('mn_geo_scripts_del_')) {
          try {
            const diskMap = JSON.parse(rawVal);
            const curMap = JSON.parse(curRaw);
            if (diskMap && typeof diskMap === 'object' && curMap && typeof curMap === 'object') {
              const merged = Object.assign({}, curMap);
              let changed = false;
              for (const [sk, entry] of Object.entries(diskMap)) {
                if (!entry || typeof entry !== 'object' || !Array.isArray(entry.steps) || !entry.steps.length) continue;
                const curEntry = merged[sk];
                if (!curEntry || !Array.isArray(curEntry.steps) || !curEntry.steps.length || ((entry.updatedAt || 0) > (curEntry.updatedAt || 0))) {
                  merged[sk] = entry;
                  changed = true;
                }
              }
              if (changed) localStorage.setItem(lsKey, JSON.stringify(merged));
            }
          } catch (_) {}
        } else if (lsKey.startsWith('mn_geo_scripts_del_')) {
          try {
            const diskDel = JSON.parse(rawVal);
            const curDel = JSON.parse(curRaw);
            if (diskDel && typeof diskDel === 'object' && curDel && typeof curDel === 'object') {
              const merged = Object.assign({}, curDel);
              let changed = false;
              for (const [sk, ts] of Object.entries(diskDel)) {
                if ((Number(ts) || 0) > (Number(merged[sk]) || 0)) {
                  merged[sk] = Number(ts) || 0;
                  changed = true;
                }
              }
              if (changed) localStorage.setItem(lsKey, JSON.stringify(merged));
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  function safeParseTabs(json) {
    try {
      const obj = JSON.parse(json || 'null');
      if (obj && typeof obj === 'object' && Array.isArray(obj.tabs)) {
        return obj;
      }
    } catch (_) {}
    return null;
  }

  async function importFilesIntoIndexedDb(files, sessionObj) {
    const mc = idbStoreRef || window.__minnoteIdbStore;
    if (!mc || !Array.isArray(files) || !files.length) return 0;

    let count = 0;
    for (const f of files) {
      if (!f || !f.name || !f.base64) continue;
      const dir = String(f.dir || '');
      if (dir && typeof mc._rawMakeDir === 'function') {
        await mc._rawMakeDir(dir).catch(() => {});
      }
      const bytes = base64ToBytes(f.base64);
      if (typeof mc._rawWrite === 'function') {
        await mc._rawWrite(dir, f.name, bytes, Number(f.modifiedMs) || Date.now());
      } else {
        await mc.write(dir, f.name, bytes);
      }
      count++;
    }

    if (sessionObj && sessionObj.geoScriptsJson) {
      mergeGeoScriptsJson(sessionObj.geoScriptsJson);
    }
    if (sessionObj && sessionObj.tabsJson) {
      const curTabs = safeParseTabs(localStorage.getItem('tabs'));
      const diskTabs = safeParseTabs(sessionObj.tabsJson);
      if (diskTabs && diskTabs.tabs.length > 0 && (!curTabs || curTabs.tabs.length === 0)) {
        localStorage.setItem('tabs', sessionObj.tabsJson);
        mergePlacesJson(sessionObj.placesJson, true);
      }
    }

    if (window.__minnoteAppBridge && typeof window.__minnoteAppBridge.reloadAfterExternalRestore === 'function') {
      await window.__minnoteAppBridge.reloadAfterExternalRestore().catch(() => {});
    }
    return count;
  }

  const persistenceApi = {
    async hydrateBeforeMount(mc) {
      if (mc) idbStoreRef = mc;
      if (!hasWebViewHost()) return;

      let res;
      try {
        res = await callHost('PERSIST_HYDRATE', {}, 2500);
      } catch (err) {
        console.warn('[MinNotePersist] Hydrate skipped:', err && err.message);
        return;
      }
      if (!res || res.unsupported) return;

      try {
        const curIdb = await mc.list();
        const idbMap = new Map();
        for (const f of (curIdb.files || [])) {
          idbMap.set(`${f.dir}/${f.name}`, Number(f.modified) || 0);
        }

        // 1. Tạo lại thư mục nếu thiếu trong IndexedDB
        const dirSet = new Set(curIdb.dirs || []);
        for (const d of (res.dirs || [])) {
          if (d && !dirSet.has(d)) {
            if (typeof mc._rawMakeDir === 'function') {
              await mc._rawMakeDir(d).catch(() => {});
            }
          }
        }

        // 2. Đồng bộ file .nrn từ ổ đĩa NTFS -> IndexedDB nếu thiếu hoặc mới hơn trên đĩa
        const diskKeys = new Set();
        let recoveredFiles = 0;
        for (const f of (res.files || [])) {
          if (!f || !f.name) continue;
          const dir = String(f.dir || '');
          const key = `${dir}/${f.name}`;
          diskKeys.add(key);
          if (!f.base64) continue;

          const idbMtime = idbMap.get(key);
          const diskMtime = Number(f.modifiedMs) || 0;
          if (idbMtime === undefined || diskMtime > idbMtime + 1500) {
            if (dir && typeof mc._rawMakeDir === 'function') {
              await mc._rawMakeDir(dir).catch(() => {});
            }
            const bytes = base64ToBytes(f.base64);
            if (typeof mc._rawWrite === 'function') {
              await mc._rawWrite(dir, f.name, bytes, diskMtime || Date.now());
            } else {
              await mc.write(dir, f.name, bytes);
            }
            recoveredFiles++;
          }
        }

        // 3. Hàng đợi đẩy ngược các file cũ chỉ có trong IndexedDB -> ổ đĩa NTFS
        pendingInitialMirror = (curIdb.files || [])
          .filter(f => !diskKeys.has(`${f.dir}/${f.name}`))
          .map(f => ({ dir: f.dir, name: f.name, modified: f.modified }));

        // 4. Khôi phục danh sách tab & sheet đang mở (tabs + places) và toàn bộ kịch bản hình (mn_geo_scripts_*) nếu bị mất hoặc sau cập nhật/tắt ngang
        const recovery = res.recovery || {};
        const session = res.session || null;
        if (session && session.geoScriptsJson) {
          mergeGeoScriptsJson(session.geoScriptsJson);
        }
        if (session && session.tabsJson) {
          const curTabs = safeParseTabs(localStorage.getItem('tabs'));
          const diskTabs = safeParseTabs(session.tabsJson);
          const hasLocalTabs = !!(curTabs && curTabs.tabs.length > 0);
          const localSavedMs = Number(localStorage.getItem('mn_session_saved_ms') || '0') || 0;
          const diskSavedMs = Number(session.savedAtMs || '0') || 0;
          const shouldRestoreSession =
            !!(diskTabs && diskTabs.tabs.length > 0) &&
            (
              !hasLocalTabs ||
              !!recovery.pendingUpdateRestore ||
              (!recovery.previousCleanExit && (diskSavedMs + 2000 >= localSavedMs || localSavedMs === 0)) ||
              diskSavedMs > localSavedMs + 1000
            );

          if (shouldRestoreSession) {
            localStorage.setItem('tabs', session.tabsJson);
            mergePlacesJson(session.placesJson, true);
            if (diskSavedMs > 0) {
              localStorage.setItem('mn_session_saved_ms', String(diskSavedMs));
            }
          } else {
            mergePlacesJson(session.placesJson, false);
          }

          if (hasLocalTabs || (diskTabs && diskTabs.tabs.length > 0)) {
            const sc = Math.max(1, Number(session.sheetCount) || 1);
            if (recovery.pendingUpdateRestore) {
              window.__minnoteRestoreNotice =
                `Đã cập nhật MinNote và giữ nguyên ${sc} sheet đang làm việc của bạn!`;
            } else if (!recovery.previousCleanExit || recoveredFiles > 0 || !hasLocalTabs) {
              window.__minnoteRestoreNotice =
                `Đã tự động khôi phục phiên làm việc trước (${sc} sheet).`;
            }
          }
        }
      } catch (err) {
        console.error('[MinNotePersist] Hydrate failed:', err);
      }
    },

    runBackgroundInitialMirror(mc) {
      if (mc) idbStoreRef = mc;
      if (!hasWebViewHost() || !pendingInitialMirror.length) return;
      const items = pendingInitialMirror.splice(0, pendingInitialMirror.length);
      setTimeout(async () => {
        for (const item of items) {
          try {
            const bytes = await mc.read(item.dir, item.name);
            if (bytes && bytes.length) {
              await persistenceApi.onLibraryWrite(item.dir, item.name, bytes, item.modified);
            }
          } catch (_) {}
        }
      }, 1200);
    },

    onLibraryWrite(dir, name, bytes, modifiedMs) {
      if (!hasWebViewHost()) return Promise.resolve();
      const b64 = bytesToBase64(bytes);
      return trackMirror(
        callHost('PERSIST_MIRROR_WRITE', {
          dir: String(dir || ''),
          name: String(name || ''),
          base64: b64,
          modifiedMs: Number(modifiedMs) || Date.now()
        }, 12000).catch(() => {})
      );
    },

    onLibraryRemove(dir, name) {
      if (!hasWebViewHost()) return Promise.resolve();
      return trackMirror(
        callHost('PERSIST_MIRROR_REMOVE', {
          dir: String(dir || ''),
          name: String(name || '')
        }, 6000).catch(() => {})
      );
    },

    onLibraryMakeDir(dir) {
      if (!hasWebViewHost()) return Promise.resolve();
      return trackMirror(
        callHost('PERSIST_MIRROR_MAKEDIR', { dir: String(dir || '') }, 6000).catch(() => {})
      );
    },

    onLibraryRemoveDir(dir) {
      if (!hasWebViewHost()) return Promise.resolve();
      return trackMirror(
        callHost('PERSIST_MIRROR_REMOVEDIR', { dir: String(dir || '') }, 6000).catch(() => {})
      );
    },

    onLibraryMoveFile(oldDir, oldName, newDir, newName) {
      if (!hasWebViewHost()) return Promise.resolve();
      return trackMirror(
        callHost('PERSIST_MIRROR_MOVE', {
          oldDir: String(oldDir || ''),
          oldName: String(oldName || ''),
          newDir: String(newDir || ''),
          newName: String(newName || '')
        }, 8000).catch(() => {})
      );
    },

    onLibraryMoveDir(oldDir, newDir) {
      if (!hasWebViewHost()) return Promise.resolve();
      return trackMirror(
        callHost('PERSIST_MIRROR_MOVEDIR', {
          oldDir: String(oldDir || ''),
          newDir: String(newDir || '')
        }, 8000).catch(() => {})
      );
    },

    onDirtyChange(dirty) {
      if (!hasWebViewHost()) return;
      const bridge = window.__minnoteAppBridge;
      const st = bridge && typeof bridge.getState === 'function' ? bridge.getState() : null;
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 8);
      window.chrome.webview.postMessage({
        type: 'PERSIST_DIRTY_STATE',
        dirty: !!dirty,
        sheetCount: st ? st.sheetCount : 1,
        savedAtDisplay: !dirty ? hhmm : ''
      });
    },

    scheduleSessionSave(reason) {
      clearTimeout(sessionSaveTimer);
      sessionSaveTimer = setTimeout(() => {
        persistenceApi.onSessionSaved(reason || 'auto_session');
      }, 600);
    },

    onSessionSaved(reason, overrideMeta) {
      const tabsJson = localStorage.getItem('tabs') || '';
      const placesJson = localStorage.getItem('places') || '{}';
      const geoScriptsJson = collectGeoScriptsJson();
      const nowMs = Date.now();
      try { localStorage.setItem('mn_session_saved_ms', String(nowMs)); } catch (_) {}

      if (!hasWebViewHost()) return Promise.resolve();
      const bridge = window.__minnoteAppBridge;
      const st = overrideMeta || (bridge && typeof bridge.getState === 'function' ? bridge.getState() : null);
      return trackMirror(
        callHost('PERSIST_SAVE_SESSION', {
          tabsJson,
          placesJson,
          geoScriptsJson,
          tabCount: st ? (st.tabCount || 1) : 1,
          sheetCount: st ? (st.sheetCount || 1) : 1,
          activeTabName: st ? (st.activeTabName || '') : '',
          reason: reason || 'save'
        }, 5000).catch(() => {})
      );
    },

    registerSaveHandler(fn) {
      dirtyWaiters.push(fn);
      return () => {
        const idx = dirtyWaiters.indexOf(fn);
        if (idx >= 0) dirtyWaiters.splice(idx, 1);
      };
    },

    notifyCloseReady() {},

    async saveAllAndFlush(reason) {
      let info = { ok: true, tabCount: 1, sheetCount: 1, activeTabName: '' };
      if (window.__minnoteAppBridge && typeof window.__minnoteAppBridge.saveAllNow === 'function') {
        info = await window.__minnoteAppBridge.saveAllNow(reason || 'manual');
      } else if (dirtyWaiters.length) {
        await Promise.allSettled(dirtyWaiters.map(fn => fn()));
      }
      await persistenceApi.onSessionSaved(reason || 'manual', info);
      await flushPendingMirrors(4000);
      return info;
    },

    async handleHostCommand(cmd) {
      if (!cmd || !cmd.reqId) return;
      const reply = (obj) => {
        if (hasWebViewHost()) {
          window.chrome.webview.postMessage(Object.assign({
            type: 'PERSIST_HOST_REPLY',
            reqId: cmd.reqId
          }, obj || {}));
        }
      };

      try {
        if (cmd.cmd === 'getExitStatus') {
          const bridge = window.__minnoteAppBridge;
          const st = bridge && typeof bridge.getState === 'function'
            ? bridge.getState()
            : { isDirty: false, hasContent: false, activeTabName: '', tabCount: 1, sheetCount: 1 };
          reply(Object.assign({ ok: true }, st));
          return;
        }

        if (cmd.cmd === 'saveAllNow') {
          const info = await persistenceApi.saveAllAndFlush(cmd.reason || 'host_save');
          reply(Object.assign({ ok: true }, info));
          return;
        }

        reply({ ok: false, error: 'Unknown host command' });
      } catch (err) {
        reply({ ok: false, error: String((err && err.message) || err) });
      }
    },

    getStatus() {
      return callHost('PERSIST_GET_STATUS', {}, 6000);
    },

    openFolder(which) {
      return callHost('PERSIST_OPEN_FOLDER', { which: which || 'local' }, 5000);
    },

    chooseSyncFolder() {
      return callHost('PERSIST_CHOOSE_SYNC_FOLDER', {}, 60000);
    },

    setSyncFolder(folder) {
      return callHost('PERSIST_SET_SYNC_FOLDER', { folder: folder || '' }, 5000);
    },

    syncToFolderNow(folder) {
      return callHost('PERSIST_SYNC_FOLDER_NOW', { folder: folder || '' }, 20000);
    },

    async restoreFromFolder(folder) {
      const res = await callHost('PERSIST_RESTORE_FROM_FOLDER', { folder: folder || '' }, 30000);
      if (res && !res.unsupported && Array.isArray(res.files)) {
        await importFilesIntoIndexedDb(res.files, res.session);
      }
      return res;
    },

    setConfirmExitSetting(confirmExitWhenSaved) {
      return callHost('PERSIST_SET_SETTINGS', { confirmExitWhenSaved: !!confirmExitWhenSaved }, 5000);
    }
  };

  window.__minnotePersistence = persistenceApi;

  // Fallback lưu lại phiên khi đóng tab/trình duyệt web thường
  window.addEventListener('pagehide', function () {
    const bridge = window.__minnoteAppBridge;
    if (bridge && typeof bridge.syncSessionStorageNow === 'function') {
      bridge.syncSessionStorageNow();
    }
  });
  window.addEventListener('beforeunload', function () {
    const bridge = window.__minnoteAppBridge;
    if (bridge && typeof bridge.syncSessionStorageNow === 'function') {
      bridge.syncSessionStorageNow();
    }
  });
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
