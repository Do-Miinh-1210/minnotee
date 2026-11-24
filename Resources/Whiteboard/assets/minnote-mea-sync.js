/**
 * MinNote v0.0.8.0 — MatrixExamAI Pro Two-Way Sync Bridge, AI Settings Tab,
 * Figure Sync Gallery & Live Question Bank Integration
 *
 * Exposes window.MinNoteMeaSync:
 *   - isDesktopBridge()
 *   - request(type, payload, timeoutMs)
 *   - onSyncEvent(handler)
 *   - executeAiPrompt(prompt, systemPrompt, opts)
 *   - mountSettingsPanel(containerEl)
 *   - openFigureSyncModal()
 *   - pushCurrentFigure(opts)
 *   - queryQuestionBank(filter)
 *   - openBankIntoModal(containerEl, opts)
 *   - insertMeaQuestionToBoard(q, mode)
 */
(function () {
  'use strict';

  const BROWSER_CFG_KEY = 'minnote_mea_browser_config_v1';
  const BROWSER_FIGS_KEY = 'minnote_mea_browser_figures_v1';

  const DEFAULT_PROVIDERS = [
    'Google Gemini',
    'Antigravity',
    '9Router',
    'Anthropic Claude',
    'DeepSeek',
    'OpenAI GPT'
  ];

  const DEFAULT_MODELS_BY_PROVIDER = {
    'Google Gemini': [
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro-preview'
    ],
    'Antigravity': [
      'gemini-3.8-flash-medium',
      'gemini-3.8-flash-high',
      'gemini-3.8-flash-low',
      'gemini-4-neon-high',
      'claude-sonnet-5-5-medium'
    ],
    '9Router': [
      'ag/gemini-3.8-flash',
      'ag/gemini-3.8-flash-high',
      'ag/gemini-3.7-flash-high',
      'ag/claude-sonnet-5-5',
      'gemini-3.8-flash'
    ],
    'Anthropic Claude': [
      'claude-sonnet-5',
      'claude-sonnet-4-6',
      'claude-opus-5'
    ],
    'DeepSeek': [
      'deepseek-v4.1-flash',
      'deepseek-reasoner',
      'deepseek-chat'
    ],
    'OpenAI GPT': [
      'gpt-4.5',
      'gpt-4o',
      'gpt-4o-mini'
    ]
  };

  const DEFAULT_KEY_URLS = {
    'Google Gemini': 'https://aistudio.google.com/apikey',
    'Antigravity': 'https://antigravity.google/',
    '9Router': 'http://localhost:20128/',
    'Anthropic Claude': 'https://console.anthropic.com/settings/keys',
    'DeepSeek': 'https://platform.deepseek.com/api_keys',
    'OpenAI GPT': 'https://platform.openai.com/api-keys'
  };

  function getBoard() {
    return window.__minnoteBoard || window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || null;
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else {
      console.info('[MinNoteMeaSync]', msg);
    }
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

  function splitKeys(raw) {
    if (!raw) return [];
    const seen = new Set();
    const out = [];
    for (const line of String(raw).split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      for (const tok of trimmed.split(/[,;]+/)) {
        const k = tok.trim();
        if (k && !seen.has(k)) {
          seen.add(k);
          out.push(k);
        }
      }
    }
    return out;
  }

  function maskKeyText(raw) {
    const keys = splitKeys(raw);
    return keys
      .map((k) => (k.length <= 8 ? '••••••••' : k.slice(0, 4) + '••••••••' + k.slice(-4)))
      .join('\n');
  }

  function isDesktopBridge() {
    return !!(
      window.__isMinNoteWebView2 &&
      window.chrome &&
      window.chrome.webview &&
      typeof window.chrome.webview.postMessage === 'function'
    );
  }

  // ============================================================================
  // 1. IPC BRIDGE + LIVE SYNC EVENT DISPATCHER
  // ============================================================================
  const pendingRequests = new Map();
  const syncListeners = new Set();
  let reqSeq = 0;
  let webviewListenerBound = false;

  function ensureWebViewListener() {
    if (webviewListenerBound) return;
    if (!window.chrome || !window.chrome.webview || typeof window.chrome.webview.addEventListener !== 'function') {
      return;
    }
    webviewListenerBound = true;
    window.chrome.webview.addEventListener('message', (ev) => {
      let msg = ev && ev.data;
      if (typeof msg === 'string') {
        try { msg = JSON.parse(msg); } catch (_) { return; }
      }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'MEA_SYNC_RESULT' && msg.id) {
        const entry = pendingRequests.get(msg.id);
        if (!entry) return;
        pendingRequests.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.ok) {
          entry.resolve(msg.data);
        } else {
          entry.reject(new Error(msg.error || 'Lỗi đồng bộ MatrixExamAI Pro.'));
        }
        return;
      }

      if (msg.type === 'MEA_SYNC_EVENT') {
        const detail = { event: msg.event || 'unknown', summary: msg.summary || null };
        syncListeners.forEach((fn) => {
          try { fn(detail); } catch (e) { console.error('[MinNoteMeaSync] listener error:', e); }
        });
        try {
          window.dispatchEvent(new CustomEvent('minnote:mea-sync', { detail }));
        } catch (_) {}
        handleLiveSyncEvent(detail);
      }
    });
  }

  function onSyncEvent(fn) {
    if (typeof fn !== 'function') return () => {};
    syncListeners.add(fn);
    return () => syncListeners.delete(fn);
  }

  // Browser fallback state helpers
  function loadBrowserConfig() {
    try {
      const raw = localStorage.getItem(BROWSER_CFG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    const legacyGem = (() => {
      try { return localStorage.getItem('note_gemini_api_key') || ''; } catch (_) { return ''; }
    })();
    return {
      provider: 'Google Gemini',
      model: 'gemini-2.5-flash',
      keyRotation: true,
      keysByProvider: legacyGem ? { 'Google Gemini': legacyGem } : {}
    };
  }

  function saveBrowserConfig(cfg) {
    try {
      localStorage.setItem(BROWSER_CFG_KEY, JSON.stringify(cfg));
      const gem = cfg.keysByProvider && cfg.keysByProvider['Google Gemini'];
      if (gem) {
        const first = splitKeys(gem)[0] || '';
        if (first) localStorage.setItem('note_gemini_api_key', first);
      }
    } catch (_) {}
  }

  function loadBrowserFigures() {
    try {
      const raw = localStorage.getItem(BROWSER_FIGS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (_) {}
    return [];
  }

  function saveBrowserFigures(arr) {
    try {
      localStorage.setItem(BROWSER_FIGS_KEY, JSON.stringify(arr.slice(0, 60)));
    } catch (_) {}
  }

  function buildBrowserConfigPayload(cfg) {
    const maskedKeysByProvider = {};
    const keyCountsByProvider = {};
    const hasKeyByProvider = {};
    for (const p of DEFAULT_PROVIDERS) {
      const raw = (cfg.keysByProvider && cfg.keysByProvider[p]) || '';
      const list = splitKeys(raw);
      maskedKeysByProvider[p] = maskKeyText(raw);
      keyCountsByProvider[p] = list.length;
      hasKeyByProvider[p] = list.length > 0;
    }
    const figs = loadBrowserFigures();
    return {
      provider: cfg.provider || 'Google Gemini',
      model: cfg.model || (DEFAULT_MODELS_BY_PROVIDER[cfg.provider || 'Google Gemini'] || [])[0] || 'gemini-2.5-flash',
      providers: DEFAULT_PROVIDERS.slice(),
      modelsByProvider: JSON.parse(JSON.stringify(DEFAULT_MODELS_BY_PROVIDER)),
      providerKeyUrls: Object.assign({}, DEFAULT_KEY_URLS),
      keyRotation: cfg.keyRotation !== false,
      maskedKeysByProvider,
      keyCountsByProvider,
      hasKeyByProvider,
      antigravityInstalled: false,
      browserFallback: true,
      syncStatus: {
        configPath: '(Chế độ trình duyệt — lưu cục bộ localStorage)',
        configExists: true,
        questionBankPath: '(Kết nối SQLite tự động khi chạy MinNote.exe)',
        questionBankExists: false,
        questionBankSchema: 'browser',
        questionCount: 0,
        figuresDir: '(Bộ nhớ cục bộ trình duyệt)',
        figuresExists: true,
        figureCount: figs.length
      }
    };
  }

  async function browserFallbackRequest(type, payload) {
    const p = payload || {};
    switch (type) {
      case 'MEA_GET_AI_CONFIG':
        return buildBrowserConfigPayload(loadBrowserConfig());

      case 'MEA_REVEAL_API_KEY': {
        const cfg = loadBrowserConfig();
        const prov = p.provider || cfg.provider || 'Google Gemini';
        const raw = (cfg.keysByProvider && cfg.keysByProvider[prov]) || '';
        return { provider: prov, rawKeys: raw, keyCount: splitKeys(raw).length, masked: maskKeyText(raw) };
      }

      case 'MEA_SAVE_AI_CONFIG': {
        const cfg = loadBrowserConfig();
        const prov = p.provider || cfg.provider || 'Google Gemini';
        cfg.provider = prov;
        if (p.model) cfg.model = p.model;
        if (typeof p.keyRotation === 'boolean') cfg.keyRotation = p.keyRotation;
        cfg.keysByProvider = cfg.keysByProvider || {};
        if (p.clearKey) {
          cfg.keysByProvider[prov] = '';
        } else if (p.keyEdited && typeof p.rawKeys === 'string') {
          cfg.keysByProvider[prov] = p.rawKeys;
        }
        if (p.keysByProvider && typeof p.keysByProvider === 'object') {
          Object.assign(cfg.keysByProvider, p.keysByProvider);
        }
        saveBrowserConfig(cfg);
        return buildBrowserConfigPayload(cfg);
      }

      case 'MEA_REFRESH_MODELS': {
        const prov = p.provider || '9Router';
        if (prov === '9Router') {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3000);
            const res = await fetch('http://localhost:20128/v1/models', { signal: ctrl.signal });
            clearTimeout(timer);
            if (res.ok) {
              const json = await res.json();
              const models = Array.isArray(json.data) ? json.data.map((m) => m.id).filter(Boolean) : [];
              if (models.length) return { provider: prov, models, live: true };
            }
          } catch (_) {}
        }
        return {
          provider: prov,
          models: (DEFAULT_MODELS_BY_PROVIDER[prov] || []).slice(),
          live: false,
          note: 'Đang dùng danh sách model mặc định.'
        };
      }

      case 'MEA_TEST_AI_KEY': {
        const t0 = performance.now();
        try {
          const out = await browserExecuteAi('1+1=? Trả lời ngắn gọn đúng một số.', '', {
            provider: p.provider,
            model: p.model,
            rawKeys: p.rawKeys
          });
          return {
            ok: true,
            reply: out.content,
            latencyMs: Math.round(performance.now() - t0),
            provider: out.provider,
            model: out.model
          };
        } catch (err) {
          return {
            ok: false,
            error: err.message || String(err),
            latencyMs: Math.round(performance.now() - t0),
            provider: p.provider || loadBrowserConfig().provider,
            model: p.model || loadBrowserConfig().model
          };
        }
      }

      case 'MEA_AI_EXECUTE':
        return await browserExecuteAi(p.prompt, p.systemPrompt, p);

      case 'MEA_QB_LIST':
        return {
          dbPath: '(Chế độ trình duyệt)',
          schema: 'browser',
          total: 0,
          filteredTotal: 0,
          facets: { grades: [], topics: [], levels: [], qtypes: [] },
          questions: []
        };

      case 'MEA_FIG_LIST': {
        let figs = loadBrowserFigures();
        if (p.keyword) {
          const kw = String(p.keyword).toLowerCase();
          figs = figs.filter((f) =>
            (f.title || '').toLowerCase().includes(kw) ||
            (f.description || '').toLowerCase().includes(kw) ||
            (Array.isArray(f.tags) && f.tags.join(' ').toLowerCase().includes(kw))
          );
        }
        if (p.source && p.source !== 'all') {
          figs = figs.filter((f) => (f.source || 'minnote') === p.source);
        }
        return { figuresDir: '(Bộ nhớ trình duyệt)', total: figs.length, figures: figs };
      }

      case 'MEA_FIG_PUSH': {
        const figs = loadBrowserFigures();
        let figId = p.figureId;
        if (!figId) {
          let n = 1;
          while (figs.some((f) => f.id === String(n).padStart(3, '0'))) n++;
          figId = String(n).padStart(3, '0');
        }
        const entry = {
          id: figId,
          title: p.title || 'Hình vẽ MinNote ' + figId,
          description: p.description || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          createdAt: new Date().toISOString(),
          source: p.source || 'minnote',
          texFilename: `figure_${figId}.tex`,
          pngFilename: `figure_${figId}.png`,
          charCount: String(p.tikzCode || '').length,
          hasPng: !!p.pngDataUrl,
          hasMnoteJson: !!p.mnoteJson,
          pngDataUrl: p.pngDataUrl || '',
          tikzCode: p.tikzCode || '',
          mnoteJson: p.mnoteJson || null
        };
        const idx = figs.findIndex((f) => f.id === figId);
        if (idx >= 0) figs.splice(idx, 1);
        figs.unshift(entry);
        saveBrowserFigures(figs);
        return { figure: entry, updated: idx >= 0, figuresDir: '(Bộ nhớ trình duyệt)' };
      }

      case 'MEA_FIG_LOAD': {
        const figs = loadBrowserFigures();
        const found = figs.find((f) => f.id === p.figureId);
        if (!found) throw new Error('Không tìm thấy hình #' + p.figureId);
        return found;
      }

      case 'MEA_FIG_DELETE': {
        const figs = loadBrowserFigures().filter((f) => f.id !== p.figureId);
        saveBrowserFigures(figs);
        return { deleted: true, figureId: p.figureId };
      }

      default:
        throw new Error('Lệnh ' + type + ' chỉ hỗ trợ trên ứng dụng MinNote Desktop.');
    }
  }

  async function browserExecuteAi(prompt, systemPrompt, opts) {
    const cfg = loadBrowserConfig();
    const provider = (opts && opts.provider) || cfg.provider || 'Google Gemini';
    const model = (opts && opts.model) || cfg.model || (DEFAULT_MODELS_BY_PROVIDER[provider] || [])[0] || 'gemini-2.5-flash';
    const rawKeys = (opts && typeof opts.rawKeys === 'string' && opts.rawKeys.trim())
      ? opts.rawKeys
      : ((cfg.keysByProvider && cfg.keysByProvider[provider]) || '');
    const keys = splitKeys(rawKeys);
    const t0 = performance.now();

    if (provider === '9Router') {
      const headers = { 'Content-Type': 'application/json' };
      if (keys[0]) headers.Authorization = 'Bearer ' + keys[0];
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: String(prompt || '') });
      const res = await fetch('http://localhost:20128/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, temperature: 0.25 })
      });
      if (!res.ok) throw new Error('9Router HTTP ' + res.status);
      const data = await res.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
      return { content, provider, model, latencyMs: Math.round(performance.now() - t0) };
    }

    if (provider === 'Google Gemini') {
      const apiKey = keys[0];
      if (!apiKey) throw new Error('Chưa nhập API Key Google Gemini.');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = {
        contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }]
      };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: String(systemPrompt) }] };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
      const data = await res.json();
      const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const content = Array.isArray(parts) ? parts.map((x) => x.text || '').join('') : '';
      return { content, provider, model, latencyMs: Math.round(performance.now() - t0) };
    }

    if (provider === 'OpenAI GPT' || provider === 'DeepSeek') {
      const apiKey = keys[0];
      if (!apiKey) throw new Error('Chưa nhập API Key ' + provider + '.');
      const endpoint = provider === 'DeepSeek'
        ? 'https://api.deepseek.com/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: String(prompt || '') });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify({ model, messages, temperature: 0.25 })
      });
      if (!res.ok) throw new Error(provider + ' HTTP ' + res.status);
      const data = await res.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
      return { content, provider, model, latencyMs: Math.round(performance.now() - t0) };
    }

    throw new Error('Nhà cung cấp ' + provider + ' cần chạy trên ứng dụng MinNote Windows để đồng bộ với MatrixExamAI Pro.');
  }

  function request(type, payload, timeoutMs) {
    ensureWebViewListener();
    if (!isDesktopBridge()) {
      return browserFallbackRequest(type, payload);
    }
    return new Promise((resolve, reject) => {
      const id = 'mea_' + (++reqSeq) + '_' + Date.now();
      const ms = Number.isFinite(timeoutMs) ? timeoutMs : 35000;
      const timer = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Yêu cầu ' + type + ' quá thời gian chờ.'));
        }
      }, ms);
      pendingRequests.set(id, { resolve, reject, timer });
      try {
        window.chrome.webview.postMessage(Object.assign({}, payload || {}, { type, id }));
      } catch (err) {
        clearTimeout(timer);
        pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  async function executeAiPrompt(prompt, systemPrompt, opts) {
    const o = opts || {};
    const data = await request(
      'MEA_AI_EXECUTE',
      {
        prompt: String(prompt || ''),
        systemPrompt: systemPrompt ? String(systemPrompt) : '',
        provider: o.provider || undefined,
        model: o.model || undefined,
        rawKeys: o.rawKeys || undefined,
        imageBase64: o.imageBase64 || undefined,
        imageMimeType: o.imageMimeType || undefined
      },
      o.timeoutMs || 90000
    );
    const content = data && typeof data.content === 'string' ? data.content : String(data || '');
    return {
      ok: true,
      content,
      text: content,
      provider: (data && data.provider) || o.provider || '',
      model: (data && data.model) || o.model || '',
      latencyMs: (data && data.latencyMs) || 0
    };
  }

  // ============================================================================
  // 2. SETTINGS PANEL (4th Tab: 🔑 API Key & MEA) — MatrixExamAI Pro Identical
  // ============================================================================
  let activeSettingsHost = null;
  let activeSettingsState = null;

  async function mountSettingsPanel(containerEl) {
    if (!containerEl) return;
    activeSettingsHost = containerEl;
    containerEl.innerHTML =
      '<div class="mn-mea-settings"><div class="mn-v80-card" style="text-align:center;padding:24px;">Đang nạp cấu hình API Key &amp; trạng thái đồng bộ MatrixExamAI Pro...</div></div>';

    let cfg;
    try {
      cfg = await request('MEA_GET_AI_CONFIG', {});
    } catch (err) {
      cfg = buildBrowserConfigPayload(loadBrowserConfig());
    }

    const state = {
      cfg,
      provider: cfg.provider || 'Google Gemini',
      model: cfg.model || '',
      keyRotation: cfg.keyRotation !== false,
      keyVisible: false,
      keyEdited: false,
      clearKey: false,
      rawKeysBuffer: '',
      revealedProviders: new Set()
    };
    activeSettingsState = state;
    renderSettingsPanel(containerEl, state);
  }

  function renderSettingsPanel(host, state) {
    const cfg = state.cfg || {};
    const providers = Array.isArray(cfg.providers) && cfg.providers.length ? cfg.providers : DEFAULT_PROVIDERS;
    const modelsMap = cfg.modelsByProvider || DEFAULT_MODELS_BY_PROVIDER;
    const models = (modelsMap[state.provider] || DEFAULT_MODELS_BY_PROVIDER[state.provider] || []).slice();
    if (state.model && !models.includes(state.model)) models.unshift(state.model);
    if (!state.model && models.length) state.model = models[0];

    const keyUrls = cfg.providerKeyUrls || DEFAULT_KEY_URLS;
    const keyUrl = keyUrls[state.provider] || DEFAULT_KEY_URLS[state.provider] || '';
    const keyCount = state.keyEdited
      ? splitKeys(state.rawKeysBuffer).length
      : ((cfg.keyCountsByProvider && cfg.keyCountsByProvider[state.provider]) || 0);
    const maskedVal = (cfg.maskedKeysByProvider && cfg.maskedKeysByProvider[state.provider]) || '';
    const textareaVal = state.keyEdited
      ? state.rawKeysBuffer
      : (state.keyVisible && state.revealedProviders.has(state.provider) ? state.rawKeysBuffer : maskedVal);
    const showRefreshModel = state.provider === '9Router' || state.provider === 'Antigravity';
    const st = cfg.syncStatus || {};

    host.innerHTML = `
      <div class="mn-mea-settings">
        <div class="mn-mea-header-card">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--mn80-text);">Đồng bộ Song Song với MatrixExamAI Pro</div>
            <div style="font-size:11.5px;color:var(--mn80-text-soft);margin-top:2px;">
              Dùng chung API Key mã hóa DPAPI, Ngân hàng Câu hỏi (SQLite) &amp; Kho hình TikZ hai chiều.
            </div>
          </div>
          <span class="mn-v80-badge ${st.configExists ? 'ok' : 'warn'}">
            ${cfg.browserFallback ? '🌐 Trình duyệt' : (st.configExists ? '● Đã liên kết MEA' : '○ Chưa tìm thấy MEA')}
          </span>
        </div>

        <div class="mn-mea-section-box">
          <div class="mn-mea-section-title">
            <span>🤖 Nhà cung cấp &amp; Model AI</span>
            ${state.provider === 'Antigravity' ? `<span class="mn-v80-badge ${cfg.antigravityInstalled ? 'ok' : 'warn'}">${cfg.antigravityInstalled ? 'agy CLI sẵn sàng' : 'Chưa cài agy CLI'}</span>` : ''}
          </div>
          <div class="mn-mea-row-2">
            <div class="mn-v80-field">
              <label class="mn-v80-label" for="mn-mea-provider">Nhà cung cấp AI</label>
              <select class="mn-v80-select" id="mn-mea-provider">
                ${providers.map((p) => {
                  const hasK = cfg.hasKeyByProvider && cfg.hasKeyByProvider[p];
                  return `<option value="${esc(p)}" ${p === state.provider ? 'selected' : ''}>${esc(p)}${hasK ? ' ✓' : ''}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="mn-v80-field">
              <label class="mn-v80-label" for="mn-mea-model">
                <span>Model AI</span>
                ${showRefreshModel ? '<button type="button" class="mn-v80-btn sm" id="mn-mea-refresh-models" style="height:22px;font-size:11px;padding:0 7px;">🔄 Làm mới model</button>' : ''}
              </label>
              <select class="mn-v80-select" id="mn-mea-model">
                ${models.map((m) => `<option value="${esc(m)}" ${m === state.model ? 'selected' : ''}>${esc(m)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="mn-mea-section-box">
          <div class="mn-mea-section-title">
            <span>🔑 API Key (${esc(state.provider)})</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="mn-v80-badge ${keyCount > 0 ? 'ok' : ''}" id="mn-mea-key-count">${keyCount} key</span>
              ${keyUrl ? `<a href="${esc(keyUrl)}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--mn80-accent);text-decoration:none;font-weight:600;">Lấy key ↗</a>` : ''}
            </div>
          </div>

          <textarea
            id="mn-mea-key-input"
            class="mn-mea-key-area ${state.keyVisible ? '' : 'masked'}"
            spellcheck="false"
            placeholder="Dán một hoặc nhiều API Key (mỗi dòng 1 key, hỗ trợ dấu phẩy / chú thích #)..."
          >${esc(textareaVal)}</textarea>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="mn-v80-btn sm" id="mn-mea-toggle-eye">${state.keyVisible ? '🙈 Ẩn key' : '👁 Hiện key'}</button>
              <button type="button" class="mn-v80-btn sm" id="mn-mea-load-txt">📂 Nạp .txt</button>
              <button type="button" class="mn-v80-btn sm" id="mn-mea-save-txt">💾 Lưu api.txt</button>
              <button type="button" class="mn-v80-btn sm danger" id="mn-mea-clear-key">🗑 Xóa</button>
            </div>
          </div>

          <label class="mn-v80-toggle">
            <input type="checkbox" id="mn-mea-rotation" ${state.keyRotation ? 'checked' : ''} />
            <span>Xoay vòng tự động nhiều API Key khi gặp lỗi giới hạn (HTTP 429)</span>
          </label>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;">
            <button type="button" class="mn-v80-btn" id="mn-mea-test-btn">⚡ Kiểm tra kết nối</button>
            <button type="button" class="mn-v80-btn primary" id="mn-mea-save-btn">💾 Lưu &amp; Đồng bộ với MatrixExamAI Pro</button>
          </div>
          <div id="mn-mea-test-out" style="display:none;"></div>
        </div>

        <div class="mn-mea-section-box">
          <div class="mn-mea-section-title">
            <span>📡 Trạng thái Đồng bộ Trực tiếp</span>
            <button type="button" class="mn-v80-btn sm" id="mn-mea-reload-status">🔄 Kiểm tra lại</button>
          </div>
          <div class="mn-mea-status-grid">
            <div class="mn-mea-stat-tile">
              <div style="font-size:11.5px;font-weight:700;color:var(--mn80-text-soft);">📚 Ngân hàng câu hỏi</div>
              <div class="mn-mea-stat-val">${Number(st.questionCount || 0).toLocaleString('vi-VN')} câu</div>
              <div class="mn-mea-stat-path">${esc(st.questionBankPath || 'Chưa phát hiện')}</div>
            </div>
            <div class="mn-mea-stat-tile">
              <div style="font-size:11.5px;font-weight:700;color:var(--mn80-text-soft);">📐 Kho hình TikZ</div>
              <div class="mn-mea-stat-val">${Number(st.figureCount || 0).toLocaleString('vi-VN')} hình</div>
              <div class="mn-mea-stat-path">${esc(st.figuresDir || 'Chưa phát hiện')}</div>
            </div>
          </div>
          <div class="mn-mea-stat-path" style="margin-top:2px;">Config: ${esc(st.configPath || '')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
            <button type="button" class="mn-v80-btn sm" id="mn-mea-open-qb">📚 Mở Kho Đề MEA</button>
            <button type="button" class="mn-v80-btn sm" id="mn-mea-open-figs">📐 Mở Kho hình MEA</button>
          </div>
        </div>
      </div>
    `;

    const provSel = host.querySelector('#mn-mea-provider');
    const modSel = host.querySelector('#mn-mea-model');
    const keyInput = host.querySelector('#mn-mea-key-input');
    const keyCountEl = host.querySelector('#mn-mea-key-count');
    const rotChk = host.querySelector('#mn-mea-rotation');
    const testOut = host.querySelector('#mn-mea-test-out');

    provSel.addEventListener('change', () => {
      state.provider = provSel.value;
      const list = (modelsMap[state.provider] || DEFAULT_MODELS_BY_PROVIDER[state.provider] || []);
      state.model = list[0] || '';
      state.keyVisible = false;
      state.keyEdited = false;
      state.clearKey = false;
      state.rawKeysBuffer = '';
      renderSettingsPanel(host, state);
    });

    modSel.addEventListener('change', () => {
      state.model = modSel.value;
    });

    keyInput.addEventListener('input', () => {
      state.keyEdited = true;
      state.clearKey = false;
      state.rawKeysBuffer = keyInput.value;
      const cnt = splitKeys(keyInput.value).length;
      if (keyCountEl) {
        keyCountEl.textContent = cnt + ' key';
        keyCountEl.className = 'mn-v80-badge ' + (cnt > 0 ? 'ok' : '');
      }
    });

    rotChk.addEventListener('change', () => {
      state.keyRotation = rotChk.checked;
    });

    const refreshBtn = host.querySelector('#mn-mea-refresh-models');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Đang nạp...';
        try {
          const res = await request('MEA_REFRESH_MODELS', { provider: state.provider });
          if (res && Array.isArray(res.models) && res.models.length) {
            state.cfg.modelsByProvider = state.cfg.modelsByProvider || {};
            state.cfg.modelsByProvider[state.provider] = res.models;
            if (!res.models.includes(state.model)) state.model = res.models[0];
            toast(`Đã cập nhật ${res.models.length} model cho ${state.provider}`);
          }
          renderSettingsPanel(host, state);
        } catch (err) {
          toast('Không thể làm mới model: ' + (err.message || err));
          refreshBtn.disabled = false;
          refreshBtn.textContent = '🔄 Làm mới model';
        }
      });
    }

    host.querySelector('#mn-mea-toggle-eye').addEventListener('click', async () => {
      if (!state.keyVisible && !state.keyEdited && !state.revealedProviders.has(state.provider)) {
        try {
          const rev = await request('MEA_REVEAL_API_KEY', { provider: state.provider });
          state.rawKeysBuffer = (rev && rev.rawKeys) || '';
          state.revealedProviders.add(state.provider);
        } catch (err) {
          toast('Không thể giải mã API Key: ' + (err.message || err));
          return;
        }
      }
      state.keyVisible = !state.keyVisible;
      renderSettingsPanel(host, state);
    });

    host.querySelector('#mn-mea-load-txt').addEventListener('click', async () => {
      if (isDesktopBridge()) {
        try {
          const res = await request('MEA_PICK_KEY_FILE', {});
          if (res && !res.cancelled && typeof res.rawKeys === 'string') {
            state.rawKeysBuffer = res.rawKeys;
            state.keyEdited = true;
            state.clearKey = false;
            state.keyVisible = true;
            renderSettingsPanel(host, state);
            toast(`Đã nạp ${res.keyCount || splitKeys(res.rawKeys).length} API key từ tệp.`);
          }
        } catch (err) {
          toast('Lỗi nạp tệp key: ' + (err.message || err));
        }
      } else {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.txt';
        inp.onchange = async () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          const txt = await f.text();
          state.rawKeysBuffer = txt;
          state.keyEdited = true;
          state.clearKey = false;
          state.keyVisible = true;
          renderSettingsPanel(host, state);
          toast(`Đã nạp ${splitKeys(txt).length} key từ ${f.name}`);
        };
        inp.click();
      }
    });

    host.querySelector('#mn-mea-save-txt').addEventListener('click', async () => {
      let rawToSave = state.keyEdited ? state.rawKeysBuffer : '';
      if (!state.keyEdited) {
        try {
          const rev = await request('MEA_REVEAL_API_KEY', { provider: state.provider });
          rawToSave = (rev && rev.rawKeys) || '';
        } catch (_) {}
      }
      if (isDesktopBridge()) {
        try {
          const res = await request('MEA_SAVE_KEY_FILE', { provider: state.provider, rawKeys: rawToSave });
          if (res && !res.cancelled) toast('Đã lưu danh sách key ra tệp ' + (res.fileName || 'api.txt'));
        } catch (err) {
          toast('Lỗi lưu api.txt: ' + (err.message || err));
        }
      } else {
        const blob = new Blob([rawToSave], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'api.txt';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      }
    });

    host.querySelector('#mn-mea-clear-key').addEventListener('click', () => {
      state.rawKeysBuffer = '';
      state.keyEdited = true;
      state.clearKey = true;
      renderSettingsPanel(host, state);
    });

    host.querySelector('#mn-mea-test-btn').addEventListener('click', async () => {
      const btn = host.querySelector('#mn-mea-test-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Đang kiểm tra...';
      testOut.style.display = 'block';
      testOut.className = 'mn-mea-test-result';
      testOut.textContent = 'Đang gửi yêu cầu kiểm tra kết nối tới ' + state.provider + ' (' + state.model + ')...';
      try {
        const res = await request('MEA_TEST_AI_KEY', {
          provider: state.provider,
          model: state.model,
          rawKeys: state.keyEdited ? state.rawKeysBuffer : undefined
        }, 45000);
        if (res && res.ok) {
          testOut.className = 'mn-mea-test-result ok';
          testOut.innerHTML = `<b>✓ Kết nối thành công!</b> (${res.latencyMs || 0} ms) — <b>${esc(res.provider || state.provider)}</b> / <code>${esc(res.model || state.model)}</code><br>Phản hồi: "${esc(res.reply || '')}"`;
        } else {
          testOut.className = 'mn-mea-test-result err';
          testOut.innerHTML = `<b>✕ Kiểm tra thất bại</b> (${(res && res.latencyMs) || 0} ms): ${esc((res && res.error) || 'Không nhận được phản hồi hợp lệ.')}`;
        }
      } catch (err) {
        testOut.className = 'mn-mea-test-result err';
        testOut.textContent = '✕ Lỗi kiểm tra kết nối: ' + (err.message || err);
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Kiểm tra kết nối';
      }
    });

    host.querySelector('#mn-mea-save-btn').addEventListener('click', async () => {
      const btn = host.querySelector('#mn-mea-save-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Đang lưu...';
      try {
        const updated = await request('MEA_SAVE_AI_CONFIG', {
          provider: state.provider,
          model: state.model,
          rawKeys: state.keyEdited ? state.rawKeysBuffer : undefined,
          keyEdited: state.keyEdited,
          clearKey: state.clearKey,
          keyRotation: state.keyRotation
        });
        state.cfg = updated || state.cfg;
        state.keyEdited = false;
        state.clearKey = false;
        state.revealedProviders.delete(state.provider);
        toast('✓ Đã lưu & đồng bộ cấu hình AI với MatrixExamAI Pro!');
        renderSettingsPanel(host, state);
      } catch (err) {
        toast('Lỗi lưu cấu hình: ' + (err.message || err));
        btn.disabled = false;
        btn.textContent = '💾 Lưu & Đồng bộ với MatrixExamAI Pro';
      }
    });

    host.querySelector('#mn-mea-reload-status').addEventListener('click', () => {
      mountSettingsPanel(host);
    });

    host.querySelector('#mn-mea-open-qb').addEventListener('click', () => {
      if (typeof window.openQuestionBankModal === 'function') {
        window.openQuestionBankModal();
      } else {
        openStandaloneQbModal();
      }
    });

    host.querySelector('#mn-mea-open-figs').addEventListener('click', () => {
      openFigureSyncModal();
    });
  }

  // ============================================================================
  // 3. FIGURE BANK TWO-WAY SYNC GALLERY MODAL
  // ============================================================================
  let figBackdrop = null;
  let figSearchText = '';
  let figSourceFilter = 'all';

  function ensureFigureModal() {
    if (figBackdrop) return figBackdrop;
    const el = document.createElement('div');
    el.id = 'mn-mea-fig-backdrop';
    el.className = 'mn-v80-backdrop';
    el.innerHTML = `
      <div class="mn-v80-modal wide" role="dialog" aria-modal="true" aria-label="Kho hình đồng bộ MatrixExamAI Pro">
        <div class="mn-v80-head">
          <div class="mn-v80-title">
            <span>📐 Kho hình đồng bộ song song MatrixExamAI Pro</span>
            <span class="mn-v80-badge" id="mn-fig-count-badge">0 hình</span>
          </div>
          <button type="button" class="mn-v80-close" id="mn-fig-close" title="Đóng">✕</button>
        </div>
        <div class="mn-v80-body">
          <div class="mn-fig-toolbar">
            <input type="search" id="mn-fig-search" class="mn-v80-input" style="flex:1 1 220px;" placeholder="Tìm kiếm hình vẽ theo tên, thẻ, mô tả..." />
            <select id="mn-fig-source" class="mn-v80-select" style="width:auto;min-width:140px;">
              <option value="all">Tất cả nguồn</option>
              <option value="minnote">Từ MinNote</option>
              <option value="mea">Từ MatrixExamAI</option>
            </select>
            <button type="button" class="mn-v80-btn" id="mn-fig-refresh">🔄 Làm mới</button>
            <button type="button" class="mn-v80-btn primary" id="mn-fig-push-cur">⬆ Đẩy hình hiện tại sang MEA</button>
          </div>
          <div id="mn-fig-push-bar" class="mn-v80-card" style="display:none;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <strong style="font-size:13px;">Đẩy hình vẽ từ bảng MinNote sang Kho hình MatrixExamAI Pro</strong>
              <button type="button" class="mn-v80-btn sm" id="mn-fig-push-cancel">Hủy</button>
            </div>
            <div class="mn-mea-row-2">
              <input type="text" id="mn-fig-push-title" class="mn-v80-input" placeholder="Tên hình (VD: Hình chóp S.ABCD vuông góc đáy)" />
              <input type="text" id="mn-fig-push-tags" class="mn-v80-input" placeholder="Thẻ cách nhau dấu phẩy (VD: HHKG, chóp, 11)" />
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:9px;gap:8px;">
              <button type="button" class="mn-v80-btn primary" id="mn-fig-push-confirm">✓ Xuất TikZ + PNG &amp; Đẩy ngay</button>
            </div>
          </div>
          <div id="mn-fig-dir-note" style="font-size:11.5px;color:var(--mn80-text-muted);font-family:Consolas,monospace;"></div>
          <div class="mn-fig-grid" id="mn-fig-grid"></div>
        </div>
        <div class="mn-v80-foot">
          <span style="font-size:11.5px;color:var(--mn80-text-muted);">Mọi hình đẩy lên được lưu đồng bộ kèm mã TikZ (.tex), ảnh (.png) &amp; hình động (.mnote.json).</span>
          <button type="button" class="mn-v80-btn" id="mn-fig-done">Đóng</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    figBackdrop = el;

    const close = () => el.classList.remove('open');
    el.querySelector('#mn-fig-close').addEventListener('click', close);
    el.querySelector('#mn-fig-done').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    el.querySelector('#mn-fig-search').addEventListener('input', (e) => {
      figSearchText = e.target.value || '';
      refreshFigureGallery();
    });
    el.querySelector('#mn-fig-source').addEventListener('change', (e) => {
      figSourceFilter = e.target.value || 'all';
      refreshFigureGallery();
    });
    el.querySelector('#mn-fig-refresh').addEventListener('click', () => refreshFigureGallery());

    const pushBar = el.querySelector('#mn-fig-push-bar');
    el.querySelector('#mn-fig-push-cur').addEventListener('click', () => {
      pushBar.style.display = pushBar.style.display === 'none' ? 'block' : 'none';
      const titleInp = el.querySelector('#mn-fig-push-title');
      if (pushBar.style.display === 'block' && titleInp && !titleInp.value.trim()) {
        titleInp.value = suggestCurrentFigureTitle();
        titleInp.focus();
      }
    });
    el.querySelector('#mn-fig-push-cancel').addEventListener('click', () => {
      pushBar.style.display = 'none';
    });
    el.querySelector('#mn-fig-push-confirm').addEventListener('click', async () => {
      const btn = el.querySelector('#mn-fig-push-confirm');
      const title = (el.querySelector('#mn-fig-push-title').value || '').trim() || suggestCurrentFigureTitle();
      const tags = (el.querySelector('#mn-fig-push-tags').value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      btn.disabled = true;
      btn.textContent = '⏳ Đang xuất & đẩy...';
      try {
        await pushCurrentFigure({ title, tags });
        pushBar.style.display = 'none';
        el.querySelector('#mn-fig-push-title').value = '';
        await refreshFigureGallery();
      } catch (err) {
        toast('Lỗi đẩy hình sang MEA: ' + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = '✓ Xuất TikZ + PNG & Đẩy ngay';
      }
    });

    return el;
  }

  function suggestCurrentFigureTitle() {
    const b = getBoard();
    if (!b || !b.doc || !b.doc.pages) return 'Hình vẽ MinNote';
    const pgIdx = typeof b.currentPage === 'function' ? b.currentPage() : 0;
    const pg = b.doc.pages[pgIdx];
    const geo = pg && pg.geo;
    if (!geo || !geo.points) return 'Hình vẽ MinNote';
    const labels = Object.values(geo.points)
      .filter((p) => p && p.show && !p.hidden && p.label)
      .map((p) => String(p.label).trim())
      .filter(Boolean);
    const uniq = [...new Set(labels)];
    if (uniq.length >= 2) {
      if (uniq.includes('S')) {
        return 'Hình chóp S.' + uniq.filter((x) => x !== 'S').slice(0, 4).join('');
      }
      return 'Hình học ' + uniq.slice(0, 5).join('');
    }
    return 'Hình vẽ MinNote';
  }

  function extractCurrentGeoSubset() {
    const b = getBoard();
    if (!b || !b.doc || !b.doc.pages) return null;
    const pgIdx = (b.sel && Number.isInteger(b.sel.page)) ? b.sel.page : (typeof b.currentPage === 'function' ? b.currentPage() : 0);
    const pg = b.doc.pages[pgIdx];
    if (!pg || !pg.geo) return null;
    const geo = pg.geo;
    const hasSelShapes = b.sel && b.sel.shapes && b.sel.shapes.size > 0;
    const hasSelPts = b.sel && b.sel.points && b.sel.points.size > 0;

    if (!hasSelShapes && !hasSelPts) {
      return {
        pageIdx: pgIdx,
        points: JSON.parse(JSON.stringify(geo.points || {})),
        shapes: JSON.parse(JSON.stringify((geo.shapes || []).filter((s) => !s.hidden)))
      };
    }

    const ptIds = new Set(hasSelPts ? [...b.sel.points] : []);
    const shapes = (geo.shapes || []).filter((s) => {
      if (s.hidden) return false;
      if (hasSelShapes && b.sel.shapes.has(s.id)) return true;
      if (hasSelPts && s.pts && s.pts.every((pid) => ptIds.has(pid))) return true;
      return false;
    });
    shapes.forEach((s) => (s.pts || []).forEach((pid) => ptIds.add(pid)));

    // Expand point dependencies so mnote.json is self-contained
    const collectDeps = (def) => {
      if (!def) return [];
      const arr = [];
      for (const k of ['a', 'b', 'c', 'p', 'o', 'ref']) if (typeof def[k] === 'string') arr.push(def[k]);
      for (const k of ['l1', 'l2', 'c1', 'c2', 'pts', 'deps']) if (Array.isArray(def[k])) arr.push(...def[k]);
      return arr;
    };
    let changed = true;
    while (changed) {
      changed = false;
      for (const pid of [...ptIds]) {
        const pt = geo.points[pid];
        if (!pt) continue;
        for (const dep of collectDeps(pt.def)) {
          if (geo.points[dep] && !ptIds.has(dep)) {
            ptIds.add(dep);
            changed = true;
          }
        }
      }
    }
    const points = {};
    for (const pid of ptIds) {
      if (geo.points[pid]) points[pid] = JSON.parse(JSON.stringify(geo.points[pid]));
    }
    return { pageIdx: pgIdx, points, shapes };
  }

  async function captureFigurePngDataUrl(tikzCode) {
    // 1. Prefer high-DPI pdflatex compiled PNG if native renderer is available
    if (tikzCode && window.noteRenderer && typeof window.noteRenderer.renderTikz === 'function') {
      try {
        const res = await window.noteRenderer.renderTikz(tikzCode);
        if (res && res.src) return res.src;
      } catch (_) {}
    }
    // 2. Fallback: capture active canvas crop via ReplayExporter or board canvas
    if (window.MinNoteReplayExporter && typeof window.MinNoteReplayExporter.captureCurrentGeoPng === 'function') {
      try {
        const png = window.MinNoteReplayExporter.captureCurrentGeoPng();
        if (png) return png;
      } catch (_) {}
    }
    const b = getBoard();
    if (b && b.canvas) {
      try { return b.canvas.toDataURL('image/png'); } catch (_) {}
    }
    return '';
  }

  async function pushCurrentFigure(opts) {
    const o = opts || {};
    let tikzCode = o.tikzCode || '';
    if (!tikzCode && window.MinNoteTikzExport && typeof window.MinNoteTikzExport.generateTikz === 'function') {
      const gen = window.MinNoteTikzExport.generateTikz(null, {});
      tikzCode = typeof gen === 'string' ? gen : (gen && gen.code) || '';
    }
    if (!tikzCode.trim()) {
      throw new Error('Không có hình học trên trang hiện tại để xuất mã TikZ.');
    }
    const pngDataUrl = o.pngDataUrl || (await captureFigurePngDataUrl(tikzCode));
    const subset = extractCurrentGeoSubset();
    const mnoteJson = subset ? JSON.stringify({ version: '0.0.8.0', geo: { points: subset.points, shapes: subset.shapes } }) : undefined;

    const res = await request('MEA_FIG_PUSH', {
      figureId: o.figureId || undefined,
      title: o.title || suggestCurrentFigureTitle(),
      description: o.description || 'Xuất trực tiếp từ MinNote v0.0.8.0',
      tags: Array.isArray(o.tags) ? o.tags : ['MinNote'],
      tikzCode,
      pngDataUrl,
      mnoteJson,
      source: 'minnote'
    });
    toast('✓ Đã đẩy hình "' + (o.title || 'MinNote') + '" sang Kho hình MatrixExamAI Pro!');
    return res;
  }

  async function refreshFigureGallery() {
    if (!figBackdrop) return;
    const grid = figBackdrop.querySelector('#mn-fig-grid');
    const badge = figBackdrop.querySelector('#mn-fig-count-badge');
    const dirNote = figBackdrop.querySelector('#mn-fig-dir-note');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--mn80-text-muted);">Đang tải Kho hình MatrixExamAI Pro...</div>';

    try {
      const res = await request('MEA_FIG_LIST', {
        keyword: figSearchText.trim() || undefined,
        source: figSourceFilter === 'all' ? undefined : figSourceFilter,
        limit: 80,
        includePreview: true
      });
      const list = (res && Array.isArray(res.figures)) ? res.figures : [];
      if (badge) badge.textContent = `${list.length} hình`;
      if (dirNote) dirNote.textContent = res && res.figuresDir ? `Thư mục đồng bộ: ${res.figuresDir}` : '';

      if (!list.length) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:36px 18px;color:var(--mn80-text-muted);">
            <div style="font-size:28px;margin-bottom:8px;">📐</div>
            <div style="font-weight:700;color:var(--mn80-text);">Chưa có hình vẽ nào khớp bộ lọc</div>
            <div style="font-size:12px;margin-top:4px;">Nhấn "⬆ Đẩy hình hiện tại sang MEA" để lưu hình vẽ từ MinNote sang MatrixExamAI Pro!</div>
          </div>`;
        return;
      }

      grid.innerHTML = '';
      for (const fig of list) {
        const card = document.createElement('div');
        card.className = 'mn-fig-card';
        const tags = Array.isArray(fig.tags) ? fig.tags.slice(0, 4) : [];
        const srcLbl = fig.source === 'minnote' ? 'MinNote' : 'MEA Pro';
        card.innerHTML = `
          <div class="mn-fig-thumb">
            <span class="mn-fig-source-tag">${esc(srcLbl)}${fig.hasMnoteJson ? ' • Động' : ''}</span>
            ${fig.pngDataUrl
              ? `<img src="${fig.pngDataUrl}" alt="${esc(fig.title || fig.id)}" loading="lazy" />`
              : `<div class="mn-fig-thumb-empty">${esc((fig.tikzCode || '').slice(0, 260))}</div>`
            }
          </div>
          <div class="mn-fig-meta">
            <div class="mn-fig-title" title="${esc(fig.title || fig.id)}">#${esc(fig.id)} • ${esc(fig.title || 'Hình TikZ')}</div>
            <div class="mn-fig-tags">
              ${tags.map((t) => `<span class="mn-fig-tag">${esc(t)}</span>`).join('')}
            </div>
          </div>
          <div class="mn-fig-actions">
            <button type="button" class="mn-v80-btn primary" data-act="insert-img" title="Chèn ảnh vào bảng">⬇ Chèn ảnh</button>
            <button type="button" class="mn-v80-btn" data-act="insert-dyn" title="Dựng lại thành hình học động có thể kéo thả">✏ Hình động</button>
            <button type="button" class="mn-v80-btn danger" data-act="delete" style="flex:0 0 30px;" title="Xóa hình khỏi kho">🗑</button>
          </div>
        `;

        card.querySelector('[data-act="insert-img"]').addEventListener('click', () => insertFigureToBoard(fig, 'image'));
        card.querySelector('[data-act="insert-dyn"]').addEventListener('click', () => insertFigureToBoard(fig, 'dynamic'));
        card.querySelector('[data-act="delete"]').addEventListener('click', async () => {
          const ok = typeof window.meaConfirm === 'function'
            ? await window.meaConfirm({
                title: 'Xóa hình khỏi Kho đồng bộ',
                message: `Bạn có chắc muốn xóa hình #${fig.id} (${fig.title || 'Không tên'}) khỏi Kho hình MatrixExamAI Pro?`,
                confirmText: 'Xóa hình',
                isDanger: true
              })
            : window.confirm(`Xóa hình #${fig.id}?`);
          if (!ok) return;
          try {
            await request('MEA_FIG_DELETE', { figureId: fig.id });
            toast(`Đã xóa hình #${fig.id}`);
            refreshFigureGallery();
          } catch (err) {
            toast('Lỗi xóa hình: ' + (err.message || err));
          }
        });
        grid.appendChild(card);
      }
    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:24px;color:var(--mn80-danger);text-align:center;">Lỗi tải kho hình: ${esc(err.message || err)}</div>`;
    }
  }

  function insertMnoteGeoJsonToBoard(mnoteJsonStr) {
    const b = getBoard();
    if (!b || !b.doc) return false;
    let parsed;
    try { parsed = typeof mnoteJsonStr === 'string' ? JSON.parse(mnoteJsonStr) : mnoteJsonStr; } catch (_) { return false; }
    const g = (parsed && parsed.geo) || parsed;
    if (!g || !g.points || !Array.isArray(g.shapes)) return false;

    const pgIdx = typeof b.currentPage === 'function' ? b.currentPage() : 0;
    const prefix = 'mea_' + Date.now().toString(36) + '_';
    const idMap = new Map();
    const remap = (id) => (typeof id === 'string' && idMap.has(id) ? idMap.get(id) : id);

    const rawPts = Object.values(g.points);
    for (const pt of rawPts) idMap.set(pt.id, prefix + pt.id);

    // Compute centroid of free points and recenter onto view center
    const freePts = rawPts.filter((p) => p && p.def && p.def.t === 'free');
    let dx = 0, dy = 0;
    if (freePts.length && typeof b.viewCentre === 'function') {
      const cx = freePts.reduce((s, p) => s + p.def.x, 0) / freePts.length;
      const cy = freePts.reduce((s, p) => s + p.def.y, 0) / freePts.length;
      const vc = b.viewCentre();
      if (vc && Number.isFinite(vc.x) && Number.isFinite(vc.y)) {
        dx = vc.x - cx;
        dy = vc.y - cy;
      }
    }

    const newPts = rawPts.map((pt) => {
      const clone = JSON.parse(JSON.stringify(pt));
      clone.id = remap(pt.id);
      if (clone.group) clone.group = prefix + clone.group;
      const d = clone.def;
      if (d) {
        if (d.t === 'free') { d.x += dx; d.y += dy; }
        for (const k of ['a', 'b', 'c', 'p', 'o', 'ref']) if (typeof d[k] === 'string') d[k] = remap(d[k]);
        for (const k of ['l1', 'l2', 'c1', 'c2', 'pts', 'deps']) if (Array.isArray(d[k])) d[k] = d[k].map(remap);
        if (d.solidId) d.solidId = prefix + d.solidId;
      }
      return clone;
    });

    const newShapes = g.shapes.map((sh) => {
      const clone = JSON.parse(JSON.stringify(sh));
      clone.id = prefix + sh.id;
      if (clone.group) clone.group = prefix + clone.group;
      if (Array.isArray(clone.pts)) clone.pts = clone.pts.map(remap);
      return clone;
    });

    if (typeof b.addGeo === 'function' && typeof b.commit === 'function') {
      b.commit(b.addGeo(pgIdx, newPts, newShapes));
      if (typeof b.redraw === 'function') b.redraw();
      return true;
    }
    return false;
  }

  async function insertFigureToBoard(fig, mode) {
    const b = getBoard();
    if (!b) {
      toast('Bảng vẽ MinNote chưa sẵn sàng.');
      return;
    }

    let full = fig;
    if ((!full.tikzCode || (mode === 'dynamic' && full.hasMnoteJson && !full.mnoteJson)) && fig.id) {
      try {
        full = await request('MEA_FIG_LOAD', { figureId: fig.id });
      } catch (_) {}
    }

    if (mode === 'dynamic') {
      if (full.mnoteJson && insertMnoteGeoJsonToBoard(full.mnoteJson)) {
        toast('✓ Đã khôi phục hình học động #' + fig.id + ' lên bảng!');
        if (figBackdrop) figBackdrop.classList.remove('open');
        return;
      }
      if (full.tikzCode && window.noteRenderer && typeof window.noteRenderer.traceTikz === 'function' && typeof b.insertFigure === 'function') {
        try {
          toast('⏳ Đang dựng lại hình học động từ mã TikZ...');
          const traced = await window.noteRenderer.traceTikz(full.tikzCode);
          if (traced) {
            b.insertFigure(traced);
            toast('✓ Đã dựng hình học động từ TikZ #' + fig.id + '!');
            if (figBackdrop) figBackdrop.classList.remove('open');
            return;
          }
        } catch (err) {
          toast('Không dựng được hình động từ TikZ, chuyển sang chèn ảnh: ' + (err.message || err));
        }
      }
    }

    // Image insert path (either existing pngDataUrl or live compile via renderTikz)
    let src = full.pngDataUrl || '';
    let w = 360, h = 280;
    if (!src && full.tikzCode && window.noteRenderer && typeof window.noteRenderer.renderTikz === 'function') {
      try {
        const rendered = await window.noteRenderer.renderTikz(full.tikzCode);
        if (rendered && rendered.src) {
          src = rendered.src;
          if (rendered.w && rendered.h) {
            const scale = Math.min(440 / rendered.w, 360 / rendered.h, 1.5);
            w = Math.round(rendered.w * scale);
            h = Math.round(rendered.h * scale);
          }
        }
      } catch (err) {
        toast('Không biên dịch được TikZ: ' + (err.message || err));
        return;
      }
    } else if (src) {
      await new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          const scale = Math.min(440 / (im.naturalWidth || 360), 360 / (im.naturalHeight || 280), 1);
          w = Math.max(120, Math.round((im.naturalWidth || 360) * scale));
          h = Math.max(90, Math.round((im.naturalHeight || 280) * scale));
          resolve();
        };
        im.onerror = resolve;
        im.src = src;
      });
    }

    if (!src) {
      toast('Hình này chưa có ảnh PNG và không có trình biên dịch TikZ khả dụng.');
      return;
    }

    if (typeof b.insertItem === 'function') {
      b.insertItem({
        id: 'fig_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        type: 'image',
        x: 0,
        y: 0,
        w,
        h,
        src,
        tikz: full.tikzCode || undefined
      });
      toast('✓ Đã chèn hình #' + fig.id + ' vào bảng vẽ!');
      if (figBackdrop) figBackdrop.classList.remove('open');
    }
  }

  function openFigureSyncModal() {
    const el = ensureFigureModal();
    el.classList.add('open');
    refreshFigureGallery();
  }

  // ============================================================================
  // 4. LIVE QUESTION BANK QUERY, EMBEDDED BROWSER & 1-CLICK INSERT
  // ============================================================================
  async function queryQuestionBank(filter) {
    const f = filter || {};
    return await request('MEA_QB_LIST', {
      keyword: f.keyword || undefined,
      grade: f.grade || undefined,
      topic: f.topic || undefined,
      level: f.level || undefined,
      qtype: f.qtype || undefined,
      limit: f.limit || 40,
      offset: f.offset || 0
    });
  }

  function renderMathLite(text) {
    let s = String(text || '');
    if (typeof window.katex !== 'undefined') {
      s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
        try { return window.katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }); } catch (_) { return _; }
      });
      s = s.replace(/\$([^\$\n\r]+?)\$/g, (_, tex) => {
        try { return window.katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }); } catch (_) { return _; }
      });
    } else {
      s = esc(s);
    }
    return s.replace(/\n/g, '<br>');
  }

  function normalizeMeaQuestionForCard(q) {
    const opts = {};
    if (Array.isArray(q.options)) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      q.options.forEach((v, idx) => {
        if (typeof v === 'object' && v !== null) {
          opts[v.key || letters[idx] || String(idx + 1)] = v.text || v.content || '';
        } else {
          opts[letters[idx] || String(idx + 1)] = String(v || '');
        }
      });
    } else if (q.options && typeof q.options === 'object') {
      Object.assign(opts, q.options);
    }

    let content = String(q.content || q.question || '');
    // Replace inline [HINH_ANH: ...] with resolved base64 img if present
    if (q.inlineImages && typeof q.inlineImages === 'object') {
      content = content.replace(/\[HINH_ANH:\s*([^\]]+)\]/gi, (m, fname) => {
        const dataUrl = q.inlineImages[fname.trim()] || q.inlineImages[fname];
        return dataUrl ? `\n<img src="${dataUrl}" style="max-width:100%;max-height:220px;border-radius:6px;margin:6px 0;" />\n` : m;
      });
    }

    const answerVal = String(q.correctAnswer || q.answer || '').trim();
    const explVal = String(q.explanation || q.solution || '').trim();
    const codeVal = q.code ? String(q.code).trim() : '';

    return {
      id: q.id || ('mea_q_' + Date.now()),
      code: codeVal || (q.topic ? `Câu • ${q.topic}` : 'Câu MEA'),
      title: codeVal ? `Câu ${codeVal}` : (q.topic ? `Câu hỏi • ${q.topic}` : 'Câu hỏi MEA'),
      topic: q.topic || '',
      grade: q.grade || '',
      level: q.level || '',
      type: q.qtype || 'TN',
      qtype: q.qtype || 'TN',
      content,
      options: opts,
      correctAnswer: answerVal,
      answer: answerVal,
      explanation: explVal,
      solution: explVal,
      tikzCode: q.tikzCode || '',
      resolvedImages: Array.isArray(q.resolvedImages) ? q.resolvedImages : []
    };
  }

  async function insertMeaQuestionToBoard(q, mode) {
    if (!q) return false;
    const cardQ = normalizeMeaQuestionForCard(q);
    const b = getBoard();
    const curPage = (b && typeof b.currentPage === 'function') ? b.currentPage() : 0;

    if (mode !== 'canvas' && typeof window.insertQuestionToPage === 'function') {
      const isNewPage = mode === 'new_page';
      window.insertQuestionToPage(cardQ, curPage, isNewPage);
      if (typeof window.closeQuestionBankModal === 'function') {
        window.closeQuestionBankModal();
      }
      if (standaloneQbBackdrop && standaloneQbBackdrop.classList.contains('open')) {
        standaloneQbBackdrop.classList.remove('open');
      }
      // If question also carries TikZ figure and user requested canvas+tikz or card+tikz, insert figure too
      if (cardQ.tikzCode && (mode === 'card_with_figure' || mode === 'latex')) {
        await insertFigureToBoard({ id: 'q_' + cardQ.id, title: cardQ.title, tikzCode: cardQ.tikzCode }, 'image');
      }
      toast('✓ Đã chèn câu hỏi từ MatrixExamAI Pro vào bảng!');
      return true;
    }

    // Direct canvas mode: render card image / text item + TikZ figure
    if (b && typeof b.insertItem === 'function') {
      const lines = [cardQ.content];
      for (const [k, v] of Object.entries(cardQ.options || {})) {
        lines.push(`${k}. ${v}`);
      }
      b.insertItem({
        id: 'meaq_' + Date.now().toString(36),
        type: 'text',
        x: 60,
        y: 80,
        w: 620,
        h: 220,
        text: lines.join('\n')
      });
      if (cardQ.tikzCode) {
        await insertFigureToBoard({ id: 'q_' + cardQ.id, title: cardQ.title, tikzCode: cardQ.tikzCode }, 'image');
      } else if (cardQ.resolvedImages && cardQ.resolvedImages[0]) {
        b.insertItem({
          id: 'meaqi_' + Date.now().toString(36),
          type: 'image',
          x: 0,
          y: 0,
          w: 320,
          h: 220,
          src: cardQ.resolvedImages[0]
        });
      }
      toast('✓ Đã chèn nội dung & hình vẽ câu hỏi lên bảng!');
      return true;
    }
    return false;
  }

  let activeBankHost = null;
  let activeBankFilter = { keyword: '', grade: '', level: '', qtype: '', offset: 0 };
  const BANK_PAGE_SIZE = 24;
  let isLoadingBank = false;
  let lastBankSyncRefreshAt = 0;

  async function openBankIntoModal(containerEl) {
    if (!containerEl) return;
    activeBankHost = containerEl;
    containerEl.innerHTML = `
      <div class="mn-qb-mea-panel">
        <div class="mn-qb-mea-filters">
          <input type="search" id="mn-qb-kw" class="mn-v80-input" value="${esc(activeBankFilter.keyword)}" placeholder="Tìm nội dung, mã câu, chủ đề..." />
          <select id="mn-qb-grade" class="mn-v80-select"><option value="">Tất cả lớp</option></select>
          <select id="mn-qb-level" class="mn-v80-select"><option value="">Mọi mức độ</option></select>
          <select id="mn-qb-type" class="mn-v80-select"><option value="">Mọi loại câu</option></select>
          <button type="button" class="mn-v80-btn primary" id="mn-qb-search-btn">🔍 Lọc</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div id="mn-qb-meta" style="font-size:11.5px;color:var(--mn80-text-muted);">Đang đồng bộ từ SQLite MatrixExamAI Pro...</div>
          <div id="mn-qb-pager" style="display:flex;align-items:center;gap:6px;"></div>
        </div>
        <div class="mn-qb-mea-list" id="mn-qb-list"></div>
      </div>
    `;

    const load = async () => {
      if (isLoadingBank) return;
      const listEl = containerEl.querySelector('#mn-qb-list');
      const metaEl = containerEl.querySelector('#mn-qb-meta');
      const pagerEl = containerEl.querySelector('#mn-qb-pager');
      if (!listEl) return;
      isLoadingBank = true;
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--mn80-text-muted);">Đang tải danh sách câu hỏi...</div>';
      try {
        const res = await queryQuestionBank({
          keyword: activeBankFilter.keyword,
          grade: activeBankFilter.grade ? Number(activeBankFilter.grade) : undefined,
          level: activeBankFilter.level,
          qtype: activeBankFilter.qtype,
          limit: BANK_PAGE_SIZE,
          offset: activeBankFilter.offset || 0
        });

        const fillSelect = (sel, values, placeholder, curVal, prefix) => {
          if (!sel || !Array.isArray(values)) return;
          const curStr = String(curVal || '');
          sel.innerHTML = `<option value="">${placeholder}</option>` +
            values.map((v) => {
              const sVal = String(v);
              const lbl = prefix ? `${prefix}${sVal}` : sVal;
              return `<option value="${esc(sVal)}" ${sVal === curStr ? 'selected' : ''}>${esc(lbl)}</option>`;
            }).join('');
        };
        if (res && res.facets) {
          fillSelect(containerEl.querySelector('#mn-qb-grade'), res.facets.grades, 'Tất cả lớp', activeBankFilter.grade, 'Lớp ');
          fillSelect(containerEl.querySelector('#mn-qb-level'), res.facets.levels, 'Mọi mức độ', activeBankFilter.level, '');
          fillSelect(containerEl.querySelector('#mn-qb-type'), res.facets.qtypes, 'Mọi loại câu', activeBankFilter.qtype, '');
        }

        const qs = (res && Array.isArray(res.questions)) ? res.questions : [];
        const filteredTotal = Number(res && res.filteredTotal != null ? res.filteredTotal : qs.length);
        const curOffset = activeBankFilter.offset || 0;
        const fromIdx = filteredTotal > 0 ? (curOffset + 1) : 0;
        const toIdx = curOffset + qs.length;

        if (metaEl) {
          metaEl.textContent = `Hiển thị ${fromIdx}–${toIdx} / ${filteredTotal} câu (Tổng kho: ${res.total ?? 0} câu)`;
        }

        if (pagerEl) {
          const totalPages = Math.max(1, Math.ceil(filteredTotal / BANK_PAGE_SIZE));
          const curPage = Math.floor(curOffset / BANK_PAGE_SIZE) + 1;
          pagerEl.innerHTML = totalPages > 1
            ? `<button type="button" class="mn-v80-btn sm" id="mn-qb-prev" ${curPage <= 1 ? 'disabled' : ''}>← Trước</button>` +
              `<span style="font-size:11.5px;color:var(--mn80-text-muted);">${curPage}/${totalPages}</span>` +
              `<button type="button" class="mn-v80-btn sm" id="mn-qb-next" ${curPage >= totalPages ? 'disabled' : ''}>Sau →</button>`
            : '';
          const prevBtn = pagerEl.querySelector('#mn-qb-prev');
          const nextBtn = pagerEl.querySelector('#mn-qb-next');
          if (prevBtn) prevBtn.addEventListener('click', () => { activeBankFilter.offset = Math.max(0, curOffset - BANK_PAGE_SIZE); load(); });
          if (nextBtn) nextBtn.addEventListener('click', () => { if (curOffset + BANK_PAGE_SIZE < filteredTotal) { activeBankFilter.offset = curOffset + BANK_PAGE_SIZE; load(); } });
        }

        if (!qs.length) {
          listEl.innerHTML = '<div style="text-align:center;padding:28px;color:var(--mn80-text-muted);">Không tìm thấy câu hỏi nào trong Ngân hàng câu hỏi MatrixExamAI Pro.</div>';
          return;
        }

        const frag = document.createDocumentFragment();
        for (const q of qs) {
          const item = document.createElement('div');
          item.className = 'mn-qb-mea-item';
          const norm = normalizeMeaQuestionForCard(q);
          const optEntries = Object.entries(norm.options || {});
          item.innerHTML = `
            <div class="mn-qb-mea-head">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <span class="mn-v80-badge">${esc(q.code || ('#' + q.id))}</span>
                ${q.grade ? `<span class="mn-fig-tag">Lớp ${esc(q.grade)}</span>` : ''}
                ${q.level ? `<span class="mn-fig-tag">${esc(q.level)}</span>` : ''}
                ${q.qtype ? `<span class="mn-fig-tag">${esc(q.qtype)}</span>` : ''}
                ${q.tikzCode ? `<span class="mn-v80-badge ok">📐 Có TikZ</span>` : ''}
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="mn-v80-btn sm primary" data-ins="card">📋 Chèn Thẻ Câu Hỏi</button>
                ${q.tikzCode ? '<button type="button" class="mn-v80-btn sm" data-ins="card_with_figure">📐 + Hình TikZ</button>' : ''}
                <button type="button" class="mn-v80-btn sm" data-ins="new_page">➕ Trang mới</button>
              </div>
            </div>
            <div class="mn-qb-mea-content">${renderMathLite(norm.content)}</div>
            ${optEntries.length ? `<div class="mn-qb-mea-opts">${optEntries.map(([k, v]) => `<div><b>${esc(k)}.</b> ${renderMathLite(v)}</div>`).join('')}</div>` : ''}
          `;
          item.querySelectorAll('[data-ins]').forEach((btn) => {
            btn.addEventListener('click', () => insertMeaQuestionToBoard(q, btn.dataset.ins));
          });
          frag.appendChild(item);
        }
        listEl.innerHTML = '';
        listEl.appendChild(frag);
      } catch (err) {
        listEl.innerHTML = `<div style="padding:20px;color:var(--mn80-danger);">Lỗi kết nối NHCH MatrixExamAI Pro: ${esc(err.message || err)}</div>`;
      } finally {
        isLoadingBank = false;
      }
    };

    const syncFiltersAndLoad = () => {
      activeBankFilter.keyword = (containerEl.querySelector('#mn-qb-kw').value || '').trim();
      activeBankFilter.grade = containerEl.querySelector('#mn-qb-grade').value || '';
      activeBankFilter.level = containerEl.querySelector('#mn-qb-level').value || '';
      activeBankFilter.qtype = containerEl.querySelector('#mn-qb-type').value || '';
      activeBankFilter.offset = 0;
      load();
    };

    containerEl.querySelector('#mn-qb-search-btn').addEventListener('click', syncFiltersAndLoad);
    containerEl.querySelector('#mn-qb-kw').addEventListener('keydown', (e) => { if (e.key === 'Enter') syncFiltersAndLoad(); });
    containerEl.querySelector('#mn-qb-grade').addEventListener('change', syncFiltersAndLoad);
    containerEl.querySelector('#mn-qb-level').addEventListener('change', syncFiltersAndLoad);
    containerEl.querySelector('#mn-qb-type').addEventListener('change', syncFiltersAndLoad);

    await load();
  }

  let standaloneQbBackdrop = null;
  function openStandaloneQbModal() {
    if (!standaloneQbBackdrop) {
      const el = document.createElement('div');
      el.className = 'mn-v80-backdrop';
      el.innerHTML = `
        <div class="mn-v80-modal wide" role="dialog" aria-modal="true">
          <div class="mn-v80-head">
            <div class="mn-v80-title">📚 Ngân hàng Câu hỏi MatrixExamAI Pro</div>
            <button type="button" class="mn-v80-close">✕</button>
          </div>
          <div class="mn-v80-body" id="mn-standalone-qb-host"></div>
        </div>
      `;
      el.querySelector('.mn-v80-close').addEventListener('click', () => el.classList.remove('open'));
      el.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('open'); });
      document.body.appendChild(el);
      standaloneQbBackdrop = el;
    }
    standaloneQbBackdrop.classList.add('open');
    openBankIntoModal(standaloneQbBackdrop.querySelector('#mn-standalone-qb-host'));
  }

  function handleLiveSyncEvent(detail) {
    const ev = detail && detail.event;
    const now = Date.now();
    if (ev === 'figures_changed') {
      if (figBackdrop && figBackdrop.classList.contains('open')) {
        refreshFigureGallery();
      }
    } else if (ev === 'config_changed') {
      if (activeSettingsHost && activeSettingsHost.isConnected && activeSettingsHost.offsetParent !== null && activeSettingsState && !activeSettingsState.keyEdited) {
        mountSettingsPanel(activeSettingsHost);
      }
    } else if (ev === 'question_bank_changed') {
      if (activeBankHost && activeBankHost.isConnected && activeBankHost.offsetParent !== null && !isLoadingBank && (now - lastBankSyncRefreshAt) > 3000) {
        lastBankSyncRefreshAt = now;
        openBankIntoModal(activeBankHost);
      }
    }
  }

  ensureWebViewListener();

  window.MinNoteMeaSync = {
    isDesktopBridge,
    request,
    onSyncEvent,
    executeAiPrompt,
    mountSettingsPanel,
    openFigureSyncModal,
    pushCurrentFigure,
    queryQuestionBank,
    openBankIntoModal,
    insertMeaQuestionToBoard,
    DEFAULT_PROVIDERS,
    DEFAULT_MODELS_BY_PROVIDER
  };
})();
