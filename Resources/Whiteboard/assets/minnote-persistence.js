/* ============================================================================
   MinNote Persistence Bridge & Honest Google Drive Backup Studio
   - Đồng bộ gương (mirror) IndexedDB -> NTFS (%LocalAppData%\MinNote\Notebooks)
   - Khôi phục tự động toàn bộ Sổ & Sheet khi mất điện, tắt ngang hoặc cập nhật app
   - Giao thức trao đổi hai chiều với WPF MainWindow khi Thoát / Lưu ngay / Cập nhật
   - Kết nối Google Drive OAuth 2.0 thật & Đồng bộ thư mục Drive/OneDrive trên máy
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
      if ((msg.type === 'PERSIST_RESULT' || msg.type === 'DRIVE_RESULT') && msg.id) {
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

  function formatSize(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatUtcLocal(iso) {
    if (!iso) return 'Chưa có';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('vi-VN');
    } catch (_) {
      return String(iso);
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
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

  // ============================================================================
  // 2. GOOGLE DRIVE OAUTH THẬT BRIDGE (KHÔNG GIẢ LẬP TÀI KHOẢN)
  // ============================================================================
  window.__minnoteDriveBridge = {
    async state() {
      if (!hasWebViewHost()) return 'unconfigured';
      try {
        const res = await callHost('DRIVE_GET_STATE', {}, 4000);
        if (!res || res.unsupported || !res.configured) return 'unconfigured';
        return res.signedIn ? 'signedIn' : 'signedOut';
      } catch (_) {
        return 'unconfigured';
      }
    },
    async signIn() {
      if (!hasWebViewHost()) return false;
      const res = await callHost('DRIVE_SIGN_IN', {}, 190000);
      return !!(res && res.signedIn);
    },
    async signOut() {
      if (!hasWebViewHost()) return false;
      await callHost('DRIVE_SIGN_OUT', {}, 10000);
      return true;
    },
    async request(opts) {
      if (!hasWebViewHost()) throw new Error('drive:signedOut');
      const res = await callHost('DRIVE_API_REQUEST', {
        method: opts && opts.method ? opts.method : 'GET',
        url: opts && opts.url ? opts.url : '',
        type: opts && opts.type ? opts.type : null,
        body: opts && opts.body !== undefined ? opts.body : null,
        binary: !!(opts && opts.binary)
      }, 60000);
      return res;
    }
  };

  // ============================================================================
  // 3. MODAL TRUNG TÂM LƯU TRỮ & GOOGLE DRIVE TRUNG THỰC (openGoogleDriveModal)
  // ============================================================================
  window.openGoogleDriveModal = async function () {
    const old = document.getElementById('modal-google-drive');
    if (old) old.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'modal-google-drive';
    backdrop.className = 'mn-drive-backdrop';
    backdrop.innerHTML = `
      <div class="mn-drive-modal" role="dialog" aria-modal="true" aria-label="Lưu trữ & Đồng bộ Google Drive">
        <div class="mn-drive-head">
          <div class="mn-drive-title-wrap">
            <div class="mn-drive-title-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
            </div>
            <div>
              <h3 class="mn-drive-title">Lưu trữ an toàn &amp; Google Drive</h3>
              <p class="mn-drive-sub">Minh bạch nơi lưu sổ, từng sheet và tài khoản kết nối thật</p>
            </div>
          </div>
          <button type="button" class="mn-drive-close" id="mn-drive-close" title="Đóng">✕</button>
        </div>
        <div class="mn-drive-body" id="mn-drive-body">
          <div class="mn-drive-meta">Đang kiểm tra trạng thái lưu trữ trên máy và tài khoản Google Drive...</div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const closeModal = () => {
      if (backdrop.parentNode) backdrop.remove();
    };
    backdrop.querySelector('#mn-drive-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
    });

    const bodyEl = backdrop.querySelector('#mn-drive-body');
    let feedbackMsg = '';
    let feedbackIsErr = false;
    let oauthPanelOpen = false;
    let busy = false;

    function setFeedback(msg, isErr) {
      feedbackMsg = msg || '';
      feedbackIsErr = !!isErr;
    }

    async function renderModal() {
      let data = null;
      const bridgeState = window.__minnoteAppBridge && typeof window.__minnoteAppBridge.getState === 'function'
        ? window.__minnoteAppBridge.getState()
        : { sheetCount: 1, tabCount: 1, activeTabName: '', isDirty: false };

      if (hasWebViewHost()) {
        try {
          data = await persistenceApi.getStatus();
        } catch (err) {
          setFeedback('Không đọc được trạng thái lưu trữ: ' + err.message, true);
        }
      }

      if (!backdrop.parentNode) return;

      const backup = (data && data.backup) || {};
      const drive = (data && data.drive) || { configured: false, signedIn: false, email: '', folderName: 'MinNote' };
      const isHost = !!(data && !data.unsupported && backup.notebooksDir);

      const localDir = backup.notebooksDir || 'IndexedDB nội bộ (phiên bản Web/Trình duyệt)';
      const nbCount = backup.notebookCount ?? 0;
      const nbSize = formatSize(backup.totalSizeBytes || 0);
      const lastSaved = formatUtcLocal(backup.lastSavedUtc);
      const confirmExit = backup.confirmExitWhenSaved !== false;
      const detectedClouds = Array.isArray(backup.detectedCloudFolders) ? backup.detectedCloudFolders : [];
      const syncFolder = backup.syncFolderPath || '';
      const syncTarget = backup.syncTargetDir || '';
      const syncCount = backup.syncFolderFileCount || 0;
      const syncLast = formatUtcLocal(backup.lastFolderSyncUtc);

      const driveStateBadge = drive.signedIn
        ? `<span class="mn-drive-pill is-on">Đã kết nối Google Drive</span>`
        : `<span class="mn-drive-pill is-off">Chưa đăng nhập tài khoản Google</span>`;

      const detectedChipsHtml = detectedClouds.map((c, idx) =>
        `<button type="button" class="mn-drive-chip" data-detect-idx="${idx}" title="${escapeHtml(c.path)}">${escapeHtml(c.label)}</button>`
      ).join('');

      bodyEl.innerHTML = `
        ${feedbackMsg ? `<div class="mn-drive-status-msg${feedbackIsErr ? ' is-error' : ''}">${escapeHtml(feedbackMsg)}</div>` : ''}

        <!-- 1. LƯU CỤC BỘ TRÊN Ổ ĐĨA NTFS -->
        <div class="mn-drive-card">
          <div class="mn-drive-card-top">
            <div class="mn-drive-card-title">1. Lưu tự động trên máy (chống mất điện &amp; giữ Sheet khi cập nhật)</div>
            <span class="mn-drive-pill is-on">Đang bật (1.5–5s)</span>
          </div>
          <div class="mn-drive-meta">
            Mọi sổ <code>.nrn</code> (bao gồm tất cả <b>${bridgeState.sheetCount} sheet</b> đang mở trên "${escapeHtml(bridgeState.activeTabName || 'Sổ hiện tại')}") được tự động lưu đồng thời vào IndexedDB và ổ đĩa tại:
          </div>
          <div class="mn-drive-path">${escapeHtml(localDir)}</div>
          <div class="mn-drive-meta">
            • Số sổ đã sao lưu trên ổ đĩa: <b>${nbCount}</b> (${nbSize}) &nbsp;•&nbsp; Lưu gần nhất: <b>${escapeHtml(lastSaved)}</b>
          </div>
          <label class="mn-drive-check">
            <input type="checkbox" id="mn-chk-confirm-exit" ${confirmExit ? 'checked' : ''} ${!isHost ? 'disabled' : ''} />
            <span>Hỏi xác nhận lưu khi thoát ứng dụng (giúp phát hiện và bỏ qua thao tác lỡ tay)</span>
          </label>
          <div class="mn-drive-row">
            <button type="button" class="mn-drive-btn primary" id="mn-btn-save-now-local">💾 Lưu ngay tất cả Sheet</button>
            ${isHost ? `<button type="button" class="mn-drive-btn" id="mn-btn-open-local">📂 Mở thư mục lưu</button>` : ''}
          </div>
        </div>

        <!-- 2. ĐỒNG BỘ THƯ MỤC GOOGLE DRIVE / ONEDRIVE TRÊN MÁY -->
        <div class="mn-drive-card">
          <div class="mn-drive-card-top">
            <div class="mn-drive-card-title">2. Đồng bộ qua thư mục Google Drive / OneDrive trên Windows</div>
            <span class="mn-drive-pill ${syncFolder ? 'is-on' : 'is-off'}">${syncFolder ? 'Đã chọn thư mục' : 'Chưa chọn'}</span>
          </div>
          <div class="mn-drive-meta">
            Chọn trực tiếp thư mục Google Drive for Desktop (vd: <code>G:\\My Drive</code>) hoặc OneDrive để tự động nhân bản tệp <code>.nrn</code> lên đám mây theo thời gian thực.
          </div>
          ${detectedChipsHtml ? `<div class="mn-drive-row"><span class="mn-drive-meta">Gợi ý tìm thấy trên máy:</span>${detectedChipsHtml}</div>` : ''}
          <div class="mn-drive-path">${syncFolder ? escapeHtml(syncTarget || (syncFolder + '\\MinNote_Backup')) : 'Chưa chọn thư mục đồng bộ ngoài'}</div>
          ${syncFolder ? `<div class="mn-drive-meta">• Tệp đã sao lưu tại thư mục này: <b>${syncCount}</b> &nbsp;•&nbsp; Gần nhất: <b>${escapeHtml(syncLast)}</b></div>` : ''}
          <div class="mn-drive-row">
            <button type="button" class="mn-drive-btn" id="mn-btn-pick-sync" ${!isHost ? 'disabled' : ''}>📁 Chọn thư mục...</button>
            ${syncFolder ? `
              <button type="button" class="mn-drive-btn primary" id="mn-btn-sync-folder-now">☁️ Sao lưu ra thư mục ngay</button>
              <button type="button" class="mn-drive-btn" id="mn-btn-restore-folder">🔄 Khôi phục từ thư mục</button>
              <button type="button" class="mn-drive-btn" id="mn-btn-open-sync">📂 Mở</button>
              <button type="button" class="mn-drive-btn danger" id="mn-btn-clear-sync">Gỡ</button>
            ` : ''}
          </div>
        </div>

        <!-- 3. TÀI KHOẢN GOOGLE DRIVE TRỰC TIẾP (OAUTH 2.0) -->
        <div class="mn-drive-card">
          <div class="mn-drive-card-top">
            <div class="mn-drive-card-title">3. Tài khoản Google Drive trực tiếp (API OAuth 2.0)</div>
            ${driveStateBadge}
          </div>
          ${drive.signedIn ? `
            <div class="mn-drive-meta">
              • Tài khoản đang kết nối: <b>${escapeHtml(drive.email || '(Không rõ email)')}</b>${drive.displayName ? ` (${escapeHtml(drive.displayName)})` : ''}<br/>
              • Thư mục lưu trên Google Drive: <b>Google Drive / ${escapeHtml(drive.folderName || 'MinNote')}</b><br/>
              • Lần đồng bộ trực tiếp gần nhất: <b>${escapeHtml(formatUtcLocal(drive.lastSyncUtc))}</b>
            </div>
            <div class="mn-drive-row">
              <button type="button" class="mn-drive-btn primary" id="mn-btn-gdrive-backup">☁️ Sao lưu lên Google Drive</button>
              <button type="button" class="mn-drive-btn" id="mn-btn-gdrive-restore">🔄 Khôi phục từ Google Drive</button>
              <button type="button" class="mn-drive-btn" id="mn-btn-gdrive-web">🌐 Mở trên Drive</button>
              <button type="button" class="mn-drive-btn danger" id="mn-btn-gdrive-signout">Đăng xuất</button>
            </div>
          ` : `
            <div class="mn-drive-meta">
              Hiện tại <b>chưa có tài khoản Google nào đăng nhập</b> nên dữ liệu chỉ đang lưu cục bộ trên máy (và thư mục đồng bộ mục 2 nếu bạn đã chọn).
              ${drive.configured
                ? `<br/>Client ID đang cấu hình: <code>${escapeHtml(drive.clientIdPreview || '')}</code>.`
                : `<br/>Để đăng nhập trực tiếp qua Google (mục 3), bạn có thể dùng Google Drive for Desktop ở <b>mục 2</b> ngay lập tức, hoặc nhập <b>Google Cloud Desktop OAuth Client ID</b> ở dưới.`
              }
            </div>
            <div class="mn-drive-row">
              ${drive.configured ? `<button type="button" class="mn-drive-btn primary" id="mn-btn-gdrive-signin">Đăng nhập bằng Google</button>` : ''}
              <button type="button" class="mn-drive-btn" id="mn-btn-toggle-oauth">⚙️ ${drive.configured ? 'Đổi cấu hình OAuth Google Cloud' : 'Cấu hình OAuth Google Cloud'}</button>
            </div>
            <div class="mn-drive-oauth-box" id="mn-oauth-box" style="display:${oauthPanelOpen ? 'flex' : 'none'};">
              <div class="mn-drive-meta">
                Tạo <b>OAuth 2.0 Client ID</b> loại <b>Desktop app</b> tại Google Cloud Console (bật Google Drive API, scope <code>drive.file</code>) rồi dán vào đây:
              </div>
              <input type="text" class="mn-drive-input" id="mn-oauth-cid" placeholder="Client ID (ví dụ: 123456-abc.apps.googleusercontent.com)" />
              <input type="password" class="mn-drive-input" id="mn-oauth-sec" placeholder="Client Secret (nếu có trong tệp JSON Desktop của Google)" />
              <div class="mn-drive-row">
                <button type="button" class="mn-drive-btn primary" id="mn-btn-save-oauth">Lưu cấu hình OAuth</button>
              </div>
            </div>
          `}
        </div>
      `;

      // Bind handlers
      const bindBusy = (btn, fn) => {
        if (!btn) return;
        btn.addEventListener('click', async () => {
          if (busy) return;
          busy = true;
          btn.disabled = true;
          try {
            await fn();
          } catch (err) {
            setFeedback(err && err.message ? err.message : String(err), true);
          } finally {
            busy = false;
            await renderModal();
          }
        });
      };

      const chkExit = bodyEl.querySelector('#mn-chk-confirm-exit');
      if (chkExit) {
        chkExit.addEventListener('change', async () => {
          try {
            await persistenceApi.setConfirmExitSetting(chkExit.checked);
            setFeedback(chkExit.checked
              ? 'Đã bật hỏi xác nhận mỗi khi thoát để bảo vệ thao tác lỡ tay.'
              : 'Đã tắt hỏi xác nhận khi mọi thay đổi đã tự động lưu xong.', false);
          } catch (err) {
            setFeedback(err.message, true);
          }
        });
      }

      bindBusy(bodyEl.querySelector('#mn-btn-save-now-local'), async () => {
        const info = await persistenceApi.saveAllAndFlush('drive_modal_manual');
        setFeedback(`Đã lưu an toàn "${info.activeTabName || 'Sổ hiện tại'}" (${info.sheetCount} sheet) ra ổ đĩa.`, false);
        if (window.showToast) window.showToast('Đã lưu tất cả sổ và sheet ra ổ đĩa!', 'success');
      });

      const btnOpenLocal = bodyEl.querySelector('#mn-btn-open-local');
      if (btnOpenLocal) btnOpenLocal.addEventListener('click', () => persistenceApi.openFolder('local'));

      bodyEl.querySelectorAll('[data-detect-idx]').forEach(chip => {
        chip.addEventListener('click', async () => {
          const idx = Number(chip.getAttribute('data-detect-idx'));
          const chosen = detectedClouds[idx];
          if (!chosen) return;
          try {
            await persistenceApi.setSyncFolder(chosen.path);
            await persistenceApi.saveAllAndFlush('sync_folder_pick');
            const sr = await persistenceApi.syncToFolderNow(chosen.path);
            setFeedback(`Đã chọn "${chosen.path}" và sao lưu ${sr.syncedCount} sổ vào "${sr.targetDir}".`, false);
          } catch (err) {
            setFeedback(err.message, true);
          }
          await renderModal();
        });
      });

      bindBusy(bodyEl.querySelector('#mn-btn-pick-sync'), async () => {
        const res = await persistenceApi.chooseSyncFolder();
        if (res && !res.cancelled && res.folder) {
          await persistenceApi.saveAllAndFlush('sync_folder_pick');
          const sr = await persistenceApi.syncToFolderNow(res.folder);
          setFeedback(`Đã đồng bộ ${sr.syncedCount} sổ vào "${sr.targetDir}".`, false);
        }
      });

      bindBusy(bodyEl.querySelector('#mn-btn-sync-folder-now'), async () => {
        await persistenceApi.saveAllAndFlush('sync_folder_now');
        const sr = await persistenceApi.syncToFolderNow();
        setFeedback(`Đã sao lưu ${sr.syncedCount} sổ (.nrn) ra "${sr.targetDir}".`, false);
      });

      bindBusy(bodyEl.querySelector('#mn-btn-restore-folder'), async () => {
        const rr = await persistenceApi.restoreFromFolder();
        const cnt = (rr && rr.restoredCount) || 0;
        setFeedback(`Đã khôi phục ${cnt} sổ từ "${rr.sourceDir || syncFolder}" vào thư viện MinNote.`, false);
        if (window.showToast) window.showToast(`Đã khôi phục ${cnt} sổ từ thư mục đồng bộ!`, 'success');
      });

      const btnOpenSync = bodyEl.querySelector('#mn-btn-open-sync');
      if (btnOpenSync) btnOpenSync.addEventListener('click', () => persistenceApi.openFolder('sync'));

      bindBusy(bodyEl.querySelector('#mn-btn-clear-sync'), async () => {
        await persistenceApi.setSyncFolder('');
        setFeedback('Đã gỡ liên kết thư mục đồng bộ ngoài (dữ liệu đã lưu vẫn được giữ nguyên).', false);
      });

      const btnToggleOAuth = bodyEl.querySelector('#mn-btn-toggle-oauth');
      if (btnToggleOAuth) {
        btnToggleOAuth.addEventListener('click', () => {
          oauthPanelOpen = !oauthPanelOpen;
          const box = bodyEl.querySelector('#mn-oauth-box');
          if (box) box.style.display = oauthPanelOpen ? 'flex' : 'none';
        });
      }

      bindBusy(bodyEl.querySelector('#mn-btn-save-oauth'), async () => {
        const cid = (bodyEl.querySelector('#mn-oauth-cid') || {}).value || '';
        const sec = (bodyEl.querySelector('#mn-oauth-sec') || {}).value || '';
        if (!cid.trim()) throw new Error('Vui lòng nhập Google OAuth Client ID.');
        await callHost('DRIVE_SAVE_CONFIG', { clientId: cid.trim(), clientSecret: sec.trim() }, 5000);
        oauthPanelOpen = false;
        setFeedback('Đã lưu cấu hình Google Cloud OAuth. Bạn có thể bấm "Đăng nhập bằng Google" ngay bây giờ.', false);
      });

      bindBusy(bodyEl.querySelector('#mn-btn-gdrive-signin'), async () => {
        setFeedback('Đang mở trình duyệt để đăng nhập Google thật...', false);
        const st = await callHost('DRIVE_SIGN_IN', {}, 190000);
        setFeedback(`Đã kết nối Google Drive bằng tài khoản ${st.email || 'Google'}.`, false);
      });

      bindBusy(bodyEl.querySelector('#mn-btn-gdrive-signout'), async () => {
        await callHost('DRIVE_SIGN_OUT', {}, 10000);
        setFeedback('Đã đăng xuất Google Drive. Dữ liệu trên máy và trên Drive vẫn được giữ nguyên.', false);
      });

      bindBusy(bodyEl.querySelector('#mn-btn-gdrive-backup'), async () => {
        await persistenceApi.saveAllAndFlush('gdrive_backup');
        const br = await callHost('DRIVE_BACKUP_NOW', {}, 120000);
        setFeedback(`Đã tải lên ${br.totalFiles} sổ (.nrn) vào thư mục "Google Drive / MinNote" (${br.email}).`, false);
        if (window.showToast) window.showToast(`Sao lưu thành công ${br.totalFiles} sổ lên Google Drive!`, 'success');
      });

      bindBusy(bodyEl.querySelector('#mn-btn-gdrive-restore'), async () => {
        const rr = await callHost('DRIVE_RESTORE_NOW', {}, 120000);
        const cnt = await importFilesIntoIndexedDb(rr.files || [], rr.session);
        setFeedback(`Đã tải về và khôi phục ${cnt} sổ từ Google Drive (${rr.email}).`, false);
        if (window.showToast) window.showToast(`Đã khôi phục ${cnt} sổ từ Google Drive!`, 'success');
      });

      const btnOpenWeb = bodyEl.querySelector('#mn-btn-gdrive-web');
      if (btnOpenWeb) {
        btnOpenWeb.addEventListener('click', () => {
          callHost('DRIVE_OPEN_WEB_FOLDER', {}, 5000).catch(() => {});
        });
      }
    }

    await renderModal();
  };
})();
