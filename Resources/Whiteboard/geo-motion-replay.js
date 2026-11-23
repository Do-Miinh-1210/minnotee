(() => {
  'use strict';

  const getBoard = () => window.__minnoteBoard || null;

  function makeDraggable(panel, handle, opts = {}) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, moved = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, select')) return;
      dragging = true;
      moved = false;
      const r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) {
        moved = true;
        panel.classList.add('moved');
        panel.style.left = ox + 'px';
        panel.style.top = oy + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
      const pw = Math.min(panel.offsetWidth || 120, window.innerWidth - 24);
      const nx = Math.max(8, Math.min(window.innerWidth - Math.min(120, pw), ox + dx));
      const ny = Math.max(40, Math.min(window.innerHeight - 44, oy + dy));
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    });
    const end = () => {
      if (dragging && moved && typeof opts.onDragEnd === 'function') opts.onDragEnd();
      dragging = false;
      setTimeout(() => { moved = false; }, 60);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    return () => moved;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================================
   * 1. POINT MOTION (CHUYỂN ĐỘNG ĐIỂM) UI CONTROLLER
   * ============================================================================ */
  let motionPanel = null;
  let motionMinimized = false;

  function ensureMotionPanel() {
    if (motionPanel) return motionPanel;
    const el = document.createElement('div');
    el.id = 'mn-motion-panel';
    el.innerHTML = `
      <div class="mn-mp-head">
        <div class="mn-mp-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" opacity=".25" fill="currentColor"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
          <span id="mn-mp-title-txt">Chuyển động điểm</span>
        </div>
        <div class="mn-mp-head-btns">
          <button class="mn-icon-btn" id="mn-mp-toggle-all" title="Phát / Tạm dừng tất cả">⏸</button>
          <button class="mn-icon-btn" id="mn-mp-minimize" title="Thu gọn / Mở rộng">─</button>
          <button class="mn-icon-btn danger" id="mn-mp-stop-all" title="Dừng tất cả & đóng">✕</button>
        </div>
      </div>
      <div class="mn-mp-body" id="mn-mp-body"></div>
    `;
    document.body.appendChild(el);
    makeDraggable(el, el.querySelector('.mn-mp-head'));

    el.querySelector('#mn-mp-toggle-all').addEventListener('click', () => {
      const b = getBoard();
      if (b) b.togglePointAnimPause();
    });
    el.querySelector('#mn-mp-minimize').addEventListener('click', () => {
      motionMinimized = !motionMinimized;
      renderMotionPanel();
    });
    el.querySelector('#mn-mp-stop-all').addEventListener('click', () => {
      const b = getBoard();
      if (b) b.stopAllPointAnims();
    });

    motionPanel = el;
    return el;
  }

  function renderMotionPanel() {
    const b = getBoard();
    if (!b || !b.ptAnims || b.ptAnims.size === 0) {
      if (motionPanel) motionPanel.classList.remove('open');
      return;
    }
    const panel = ensureMotionPanel();
    panel.classList.add('open');
    panel.classList.toggle('minimized', motionMinimized);

    const anims = [...b.ptAnims.values()];
    const anyRunning = anims.some(a => !a.paused);
    const toggleAllBtn = panel.querySelector('#mn-mp-toggle-all');
    toggleAllBtn.textContent = anyRunning ? '⏸' : '▶';
    toggleAllBtn.title = anyRunning ? 'Tạm dừng tất cả' : 'Tiếp tục tất cả';

    const minBtn = panel.querySelector('#mn-mp-minimize');
    if (minBtn) {
      minBtn.textContent = motionMinimized ? '▢' : '─';
      minBtn.title = motionMinimized ? 'Mở rộng bảng chuyển động' : 'Thu gọn';
    }
    const titleTxt = panel.querySelector('#mn-mp-title-txt');
    if (titleTxt) {
      titleTxt.textContent = motionMinimized ? `Chuyển động (${anims.length})` : 'Chuyển động điểm';
    }
    if (motionMinimized) return;

    const body = panel.querySelector('#mn-mp-body');
    body.innerHTML = '';

    for (const a of anims) {
      const pg = b.doc.pages[a.page];
      const pt = pg && pg.geo && pg.geo.points[a.id];
      const lbl = (pt && pt.label) || a.label || 'Điểm';
      const defType = pt && pt.def ? pt.def.t : '';
      const typeText = defType === 'on' ? 'Trên đoạn/đường' : defType === 'path' ? 'Trên đường cong' : defType === 'vec' ? 'Theo phương' : 'Tự do (quỹ đạo)';

      const card = document.createElement('div');
      card.className = 'mn-pt-card';
      card.innerHTML = `
        <div class="mn-pt-row">
          <div class="mn-pt-badge">
            <span class="mn-pt-dot ${a.paused ? 'paused' : ''}"></span>
            <span>Điểm <i>${escapeHtml(lbl)}</i></span>
            <span style="font-size:10.5px;font-weight:500;color:#64748b;">(${typeText})</span>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="mn-icon-btn ${a.mode === 'bounce' ? 'active' : ''}" data-act="mode" title="Chế độ: ${a.mode === 'bounce' ? 'Qua lại (↔)' : 'Vòng lặp (↻)'}">${a.mode === 'bounce' ? '↔' : '↻'}</button>
            <button class="mn-icon-btn ${a.paused ? 'primary' : ''}" data-act="pause" title="${a.paused ? 'Tiếp tục' : 'Tạm dừng'}">${a.paused ? '▶' : '⏸'}</button>
            <button class="mn-icon-btn danger" data-act="stop" title="Dừng điểm này">■</button>
          </div>
        </div>
        <div class="mn-speed-row">
          <span>Tốc độ</span>
          <input type="range" min="0.2" max="4" step="0.1" value="${a.speed}" data-act="speed" />
          <span class="mn-speed-val">${Number(a.speed).toFixed(1)}×</span>
        </div>
        <div class="mn-speed-presets">
          ${[0.5, 1, 1.5, 2, 3].map(v => `<button class="mn-chip ${Math.abs(a.speed - v) < 0.06 ? 'on' : ''}" data-preset="${v}">${v}×</button>`).join('')}
        </div>
      `;

      card.querySelector('[data-act="mode"]').addEventListener('click', () => {
        b.setPointAnimConfig(a.id, { mode: a.mode === 'bounce' ? 'loop' : 'bounce' });
      });
      card.querySelector('[data-act="pause"]').addEventListener('click', () => {
        b.togglePointAnimPause(a.id);
      });
      card.querySelector('[data-act="stop"]').addEventListener('click', () => {
        b.stopPointAnim(a.id);
      });
      const slider = card.querySelector('[data-act="speed"]');
      const valEl = card.querySelector('.mn-speed-val');
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value) || 1;
        valEl.textContent = v.toFixed(1) + '×';
        b.setPointAnimConfig(a.id, { speed: v });
      });
      card.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          b.setPointAnimConfig(a.id, { speed: parseFloat(btn.dataset.preset) });
        });
      });

      body.appendChild(card);
    }
  }

  window.MinNoteGeoMotion = {
    toggleFromSelection() {
      const b = getBoard();
      if (!b || !b.sel) return;
      const ids = b.selectionMovablePoints();
      if (!ids.length) return;
      const anyAnim = ids.some(id => b.ptAnims.has(id));
      if (anyAnim) {
        const anyRunning = ids.some(id => b.ptAnims.has(id) && !b.ptAnims.get(id).paused);
        for (const id of ids) {
          if (b.ptAnims.has(id)) b.setPointAnimConfig(id, { paused: anyRunning });
        }
      } else {
        b.startPointAnim(b.sel.page, ids, { speed: 1 });
      }
      renderMotionPanel();
    },
    start(pageIdx, ids, opts) {
      const b = getBoard();
      if (!b) return;
      b.startPointAnim(pageIdx, ids, opts);
      renderMotionPanel();
    },
    stopAll() {
      const b = getBoard();
      if (b) b.stopAllPointAnims();
      renderMotionPanel();
    }
  };

  /* ============================================================================
   * 2. CONSTRUCTION REPLAY & MULTI-SCRIPT STUDIO (DỰNG LẠI HÌNH THEO KỊCH BẢN)
   *    - Collapsible full drawer -> compact runner pill -> ultra-mini chip
   *    - Multiple concurrent scripts running simultaneously
   *    - Per-figure persistent saved scripts (survives editing/changing other shapes!)
   * ============================================================================ */
  let replayPanel = null;
  let replayPill = null;
  let replayViewMode = 'full'; // 'full' | 'pill' | 'mini'
  let stepsCollapsed = true;   // Mở gọn mặc định; bấm ☰ để mở danh sách bước khi cần sửa
  let presetsOpen = false;
  let savedShelfOpen = false;
  let savedFlashTimer = 0;
  const SPEED_CYCLE = [0.5, 1, 1.5, 2, 3];

  function getActiveReplays(b) {
    if (!b) return [];
    if (typeof b._getActiveReplays === 'function') return b._getActiveReplays();
    return (b.replay && b.replay.active) ? [b.replay] : [];
  }

  function getFocusedReplay(b) {
    const list = getActiveReplays(b);
    if (!list.length) return null;
    if (b.activeReplayId) {
      const found = list.find(r => r.id === b.activeReplayId);
      if (found) return found;
    }
    return list[0];
  }

  function ptName(geo, id) {
    const p = geo.points[id];
    return (p && p.label) ? p.label : '?';
  }

  function describeShape(geo, sh, rev, tempHide) {
    const names = sh.pts.map(id => ptName(geo, id));
    const tags = [];
    if (sh.dashed) tags.push('nét đứt');
    if (tempHide) tags.push('vẽ rồi ẩn');
    const tagStr = tags.length ? ` (${tags.join(', ')})` : '';
    switch (sh.kind) {
      case 'segment': {
        const a = rev ? names[1] : names[0];
        const b = rev ? names[0] : names[1];
        return (sh.arrow ? 'Vectơ ' : 'Đoạn thẳng ') + `${a} → ${b}${tagStr}`;
      }
      case 'line': {
        const a = rev ? names[1] : names[0];
        const b = rev ? names[0] : names[1];
        return `Đường thẳng ${a} → ${b}${tagStr}`;
      }
      case 'ray': {
        const a = rev ? names[1] : names[0];
        const b = rev ? names[0] : names[1];
        return `Tia ${a} → ${b}${tagStr}`;
      }
      case 'extend':
        return `Kéo dài ${names[1] || ''}${names[2] || ''} → ${names[0] || ''}${tagStr}`;
      case 'circle':
        return `Đường tròn (${names[0]}; ${names[0]}${names[1]})${tagStr}`;
      case 'polygon':
        return `Đa giác ${names.join('')}${sh.fill ? ' (tô màu)' : ''}${tempHide ? ' (vẽ rồi ẩn)' : ''}`;
      case 'right':
        return `Kí hiệu góc vuông ${names.join('')}`;
      case 'angle':
        return `Góc ${names.join('')}`;
      case 'tick':
        return `Kí hiệu bằng nhau ${names[0]}${names[1]}`;
      case 'plane':
        return `Mặt phẳng (${sh.name || 'P'})`;
      case 'cone': return `Hình nón (${names.join('')})`;
      case 'cylinder': return `Hình trụ (${names.join('')})`;
      case 'sphere': return `Hình cầu (${names[0]})`;
      case 'ellipse': return `Elip (${names[0]})`;
      case 'parabola': return `Parabol (${names[0]})`;
      case 'hyperbola': return `Hypebol (${names[0]})`;
      default:
        return `${sh.kind} ${names.join('')}${tagStr}`;
    }
  }

  function stepDisplayLabel(geo, step) {
    if (step.items && step.items.length > 1) {
      if (step.customTitle) return step.customTitle;
      const first = step.items[0];
      const sh = first.kind === 'shape' ? geo.shapes.find(s => s.id === first.refId) : null;
      const firstLbl = sh ? describeShape(geo, sh, !!(first.rev ?? step.rev), !!step.tempHide) : (first.kind === 'point' ? `Điểm ${ptName(geo, first.refId)}` : 'Nét');
      return `Nhóm (${step.items.length} nét): ${firstLbl}…`;
    }
    const it = (step.items && step.items[0]) || step;
    if (it.kind === 'point') {
      const p = geo.points[it.refId];
      if (p && p.def && p.def.t === 'inter') {
        return `Giao điểm ${ptName(geo, it.refId)}`;
      }
      return `Điểm ${ptName(geo, it.refId)}`;
    }
    const sh = geo.shapes.find(s => s.id === it.refId);
    return sh ? describeShape(geo, sh, !!(it.rev ?? step.rev), !!step.tempHide) : 'Đối tượng';
  }

  function parseNtTimestamp(id) {
    if (typeof id !== 'string' || id.length < 8) return null;
    const head = id.slice(0, 8);
    if (!/^[a-z0-9]{8}$/.test(head)) return null;
    const ms = parseInt(head, 36);
    return (ms > 1500000000000 && ms < 4000000000000) ? ms : null;
  }

  function extractSolidGroups(geo, scopeShapes, scopePoints) {
    const groups = new Set();
    if (!geo) return [];
    for (const sh of (geo.shapes || [])) {
      if (sh.group && (!scopeShapes || scopeShapes.has(sh.id))) groups.add(sh.group);
    }
    for (const pt of Object.values(geo.points || {})) {
      if (pt.group && (!scopePoints || scopePoints.has(pt.id))) groups.add(pt.group);
    }
    return [...groups].sort();
  }

  function buildFigureTitle(geo, scopeShapes, scopePoints, fallbackIndex) {
    if (!scopeShapes && !scopePoints) return 'Cả trang';
    const labels = [];
    const seen = new Set();
    const ptSet = scopePoints || new Set();
    for (const pid of ptSet) {
      const p = geo && geo.points && geo.points[pid];
      const lbl = p && p.label ? String(p.label).trim() : '';
      if (lbl && !seen.has(lbl)) {
        seen.add(lbl);
        labels.push(lbl);
      }
    }
    if (labels.length >= 2) {
      const hasS = labels.includes('S');
      const rest = labels.filter(l => l !== 'S').sort((a, b) => a.localeCompare(b));
      if (hasS && rest.length >= 2) {
        return `S.${rest.slice(0, 4).join('')}`;
      }
      return `Hình ${rest.slice(0, 5).join('')}`;
    }
    const cnt = scopeShapes ? scopeShapes.size : ptSet.size;
    return `Hình #${fallbackIndex || 1} (${cnt} nét)`;
  }

  function buildDefaultSteps(geo, scopeShapes, scopePoints) {
    const shapes = geo.shapes.filter(s => s.kind !== 'solid' && s.kind !== 'flatLink' && !s.hidden && (!scopeShapes || scopeShapes.has(s.id)));
    const usedPtsByShape = new Set();
    for (const s of shapes) s.pts.forEach(id => usedPtsByShape.add(id));
    const solidGroups = new Set(geo.shapes.filter(s => s.kind === 'solid').map(s => s.group).filter(Boolean));

    const isStepPt = (pt) => {
      if (!pt || !pt.show || pt.hidden) return false;
      if (scopePoints && !scopePoints.has(pt.id)) return false;
      if (pt.def && pt.def.t === 'inter') return true;
      if (!usedPtsByShape.has(pt.id)) return true;
      if (pt.group && solidGroups.has(pt.group)) return false;
      return ['mid', 'on', 'foot', 'path', 'free'].includes(pt.def.t) && (!pt.group || !solidGroups.has(pt.group));
    };

    const entries = [];
    const ptEntries = Object.values(geo.points);
    ptEntries.forEach((pt, idx) => {
      if (!isStepPt(pt)) return;
      if (pt.def.t === 'free' && usedPtsByShape.has(pt.id)) return;
      entries.push({
        ts: parseNtTimestamp(pt.id),
        kindRank: 0,
        ord: idx,
        step: {
          id: 'st_p_' + pt.id,
          kind: 'point',
          refId: pt.id,
          rev: false,
          showGuides: !!(pt.def && pt.def.t === 'inter'),
          enabled: true
        }
      });
    });

    shapes.forEach((sh, idx) => {
      entries.push({
        ts: parseNtTimestamp(sh.id),
        kindRank: 1,
        ord: idx,
        step: {
          id: 'st_s_' + sh.id,
          kind: 'shape',
          refId: sh.id,
          rev: false,
          tempHide: false,
          enabled: true
        }
      });
    });

    const hasAnyTs = entries.some(e => e.ts !== null);
    if (hasAnyTs) {
      entries.sort((a, b) => {
        if (a.ts !== null && b.ts !== null && a.ts !== b.ts) return a.ts - b.ts;
        if (a.ts !== null && b.ts === null) return -1;
        if (a.ts === null && b.ts !== null) return 1;
        if (a.kindRank !== b.kindRank) return a.kindRank - b.kindRank;
        return a.ord - b.ord;
      });
    }

    const raw = entries.map(e => e.step);
    const byPtId = new Map();
    for (const st of raw) if (st.kind === 'point') byPtId.set(st.refId, st);

    const out = [];
    const emitted = new Set();
    const emitPtDeps = (pid, visiting = new Set()) => {
      const pst = byPtId.get(pid);
      if (!pst || emitted.has(pst.id) || visiting.has(pid)) return;
      visiting.add(pid);
      const pt = geo.points[pid];
      if (pt && pt.def) {
        const d = pt.def;
        const deps = [];
        if (d.a) deps.push(d.a);
        if (d.b) deps.push(d.b);
        if (d.p) deps.push(d.p);
        if (d.l1) deps.push(d.l1[0], d.l1[1]);
        if (d.l2) deps.push(d.l2[0], d.l2[1]);
        for (const dep of deps) emitPtDeps(dep, visiting);
      }
      emitted.add(pst.id);
      out.push(pst);
    };

    const shMap = new Map(shapes.map(s => [s.id, s]));
    for (const st of raw) {
      if (emitted.has(st.id)) continue;
      if (st.kind === 'point') {
        emitPtDeps(st.refId);
      } else if (st.kind === 'shape') {
        const sh = shMap.get(st.refId);
        if (sh) for (const pid of sh.pts) emitPtDeps(pid);
        emitted.add(st.id);
        out.push(st);
      }
    }
    return out;
  }

  /* ============================================================================
   * PER-FIGURE PERSISTENT SCRIPT STORAGE (Remembers each figure independently!)
   * ============================================================================ */
  function loadSavedScriptsMap(pg) {
    const merged = {};
    if (pg && pg.id) {
      try {
        const rawMap = localStorage.getItem('mn_geo_scripts_' + pg.id);
        if (rawMap) {
          const parsed = JSON.parse(rawMap);
          if (parsed && typeof parsed === 'object') Object.assign(merged, parsed);
        }
      } catch {}
    }
    if (pg && pg.geo && pg.geo.scripts && typeof pg.geo.scripts === 'object') {
      for (const [k, v] of Object.entries(pg.geo.scripts)) {
        if (!merged[k] || ((v && v.updatedAt) || 0) >= ((merged[k] && merged[k].updatedAt) || 0)) {
          merged[k] = v;
        }
      }
    }
    // Legacy single-script fallback
    if (!merged.all) {
      let legacy = (pg && pg.geo && Array.isArray(pg.geo.script) && pg.geo.script.length) ? pg.geo.script : null;
      if (!legacy && pg && pg.id) {
        try {
          const raw = localStorage.getItem('mn_geo_script_' + pg.id);
          if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p) && p.length) legacy = p;
          }
        } catch {}
      }
      if (legacy) {
        merged.all = { key: 'all', title: 'Cả trang', shapeIds: null, pointIds: null, solidGroups: [], steps: legacy, speed: 1, pauseBetween: false, updatedAt: 0 };
      }
    }
    return merged;
  }

  function computeOverlapScore(entry, scopeShapes, scopePoints, solidGroups) {
    if (!entry || entry.key === 'all') return 0;
    const eShapes = new Set(Array.isArray(entry.shapeIds) ? entry.shapeIds : []);
    const ePoints = new Set(Array.isArray(entry.pointIds) ? entry.pointIds : []);
    // Also collect refs directly from saved steps in case shapeIds was partial
    for (const st of (entry.steps || [])) {
      const items = (st.items && st.items.length) ? st.items : [st];
      for (const it of items) {
        if (it.kind === 'shape' && it.refId) eShapes.add(it.refId);
        if (it.kind === 'point' && it.refId) ePoints.add(it.refId);
      }
    }

    let inter = 0;
    let unionSet = new Set();
    if (scopeShapes) {
      for (const id of scopeShapes) { unionSet.add('s:' + id); if (eShapes.has(id)) inter++; }
      for (const id of eShapes) unionSet.add('s:' + id);
    }
    if (scopePoints) {
      for (const id of scopePoints) { unionSet.add('p:' + id); if (ePoints.has(id)) inter++; }
      for (const id of ePoints) unionSet.add('p:' + id);
    }
    let score = unionSet.size > 0 ? (inter / unionSet.size) : 0;

    // Bonus if they share the exact same 3D solid group (survives adding/removing edges on the same 3D solid!)
    if (solidGroups && solidGroups.length && Array.isArray(entry.solidGroups) && entry.solidGroups.length) {
      const sgSet = new Set(solidGroups);
      const sharedSolid = entry.solidGroups.some(g => sgSet.has(g));
      if (sharedSolid) score = Math.max(score, 0.72);
    }
    return score;
  }

  function findSavedScriptForScope(pg, scopeKey, scopeShapes, scopePoints) {
    const map = loadSavedScriptsMap(pg);
    // 1. Exact key match
    if (map[scopeKey] && Array.isArray(map[scopeKey].steps) && map[scopeKey].steps.length) {
      return map[scopeKey];
    }
    // 2. For specific figure selection, find best overlapping figure script (even if strokes were added/edited or other shapes changed!)
    if (scopeShapes || scopePoints) {
      const solidGroups = extractSolidGroups(pg.geo, scopeShapes, scopePoints);
      let best = null;
      let bestScore = 0.34; // threshold: >= 35% shared geometry or shared 3D solid
      for (const entry of Object.values(map)) {
        if (!entry || entry.key === 'all' || !Array.isArray(entry.steps) || !entry.steps.length) continue;
        const sc = computeOverlapScore(entry, scopeShapes, scopePoints, solidGroups);
        if (sc > bestScore || (sc === bestScore && best && (entry.updatedAt || 0) > (best.updatedAt || 0))) {
          bestScore = sc;
          best = entry;
        }
      }
      if (best) return best;
    }
    // 3. Whole-page fallback
    if (scopeKey === 'all' && map.all && Array.isArray(map.all.steps) && map.all.steps.length) {
      return map.all;
    }
    return null;
  }

  function reconcileSavedScript(geo, saved, scopeShapes, scopePoints) {
    if (!Array.isArray(saved) || !saved.length) return buildDefaultSteps(geo, scopeShapes, scopePoints);
    const allShIds = new Set(geo.shapes.filter(s => s.kind !== 'solid' && s.kind !== 'flatLink' && (!scopeShapes || scopeShapes.has(s.id))).map(s => s.id));
    const visShIds = new Set(geo.shapes.filter(s => s.kind !== 'solid' && s.kind !== 'flatLink' && !s.hidden && (!scopeShapes || scopeShapes.has(s.id))).map(s => s.id));
    const ptIds = new Set(Object.values(geo.points).filter(p => p.show && !p.hidden && (!scopePoints || scopePoints.has(p.id))).map(p => p.id));

    const seenSh = new Set();
    const seenPt = new Set();
    const out = [];

    for (const st of saved) {
      if (st.items && st.items.length) {
        const items = st.items.filter(it => {
          const validSh = (st.tempHide || st.includeHidden) ? allShIds.has(it.refId) : visShIds.has(it.refId);
          if (it.kind === 'shape' && validSh && !seenSh.has(it.refId)) { seenSh.add(it.refId); return true; }
          if (it.kind === 'point' && ptIds.has(it.refId) && !seenPt.has(it.refId)) { seenPt.add(it.refId); return true; }
          return false;
        });
        if (items.length === 1) {
          out.push({ ...st, id: st.id || ('st_' + items[0].refId), kind: items[0].kind, refId: items[0].refId, items: undefined, rev: !!(items[0].rev ?? st.rev), enabled: st.enabled !== false });
        } else if (items.length > 1) {
          out.push({ ...st, items, enabled: st.enabled !== false });
        }
      } else if (st.kind === 'shape') {
        const validSh = (st.tempHide || st.includeHidden) ? allShIds.has(st.refId) : visShIds.has(st.refId);
        if (validSh && !seenSh.has(st.refId)) {
          seenSh.add(st.refId);
          out.push({ ...st, enabled: st.enabled !== false });
        }
      } else if (st.kind === 'point' && ptIds.has(st.refId) && !seenPt.has(st.refId)) {
        seenPt.add(st.refId);
        out.push({ ...st, enabled: st.enabled !== false });
      }
    }

    const fresh = buildDefaultSteps(geo, scopeShapes, scopePoints);
    for (const st of fresh) {
      if (st.kind === 'shape' && !seenSh.has(st.refId)) out.push(st);
      else if (st.kind === 'point' && !seenPt.has(st.refId)) out.push(st);
    }
    return out;
  }

  function buildSolidFirstPreset(geo, scopeShapes, scopePoints) {
    const baseSteps = buildDefaultSteps(geo, scopeShapes, scopePoints);
    const solidGroups = new Set(geo.shapes.filter(s => s.kind === 'solid').map(s => s.group).filter(Boolean));
    if (!solidGroups.size) return baseSteps;

    const shMap = new Map(geo.shapes.map(s => [s.id, s]));
    const solidByGroup = new Map();
    const rest = [];

    for (const st of baseSteps) {
      if (st.kind === 'shape') {
        const sh = shMap.get(st.refId);
        if (sh && sh.group && solidGroups.has(sh.group)) {
          if (!solidByGroup.has(sh.group)) solidByGroup.set(sh.group, []);
          solidByGroup.get(sh.group).push({ kind: 'shape', refId: sh.id, rev: false });
          continue;
        }
      }
      rest.push(st);
    }

    const out = [];
    let gIdx = 1;
    for (const [grp, items] of solidByGroup.entries()) {
      out.push({
        id: 'st_grp_solid_' + grp,
        kind: 'group',
        customTitle: solidByGroup.size > 1 ? `Khối 3D gốc #${gIdx++} (${items.length} cạnh)` : `Khối 3D gốc (${items.length} cạnh)`,
        items,
        enabled: true
      });
    }
    return [...out, ...rest];
  }

  function flashSavedBadge(count = 1) {
    if (!replayPanel) return;
    const btn = replayPanel.querySelector('#mn-rp-save');
    if (!btn) return;
    btn.classList.add('saved');
    btn.textContent = '✓';
    btn.title = count > 1 ? `Đã lưu ${count} kịch bản!` : 'Đã lưu kịch bản!';
    clearTimeout(savedFlashTimer);
    savedFlashTimer = setTimeout(() => {
      if (btn) {
        btn.classList.remove('saved');
        btn.textContent = '💾';
        btn.title = 'Lưu kịch bản riêng cho từng hình đang mở';
      }
    }, 1500);
  }

  function persistScript(b, showFeedback = false, targetReplay = null) {
    const r = targetReplay || getFocusedReplay(b);
    if (!b || !r) return false;
    const pg = b.doc.pages[r.page];
    if (!pg) return false;
    const key = r.scriptKey || r.scopeKey || 'all';
    const solidGroups = extractSolidGroups(pg.geo, r.scopeShapes, r.scopePoints);
    const meta = {
      key,
      title: r.title || buildFigureTitle(pg.geo, r.scopeShapes, r.scopePoints, 1),
      shapeIds: r.scopeShapes ? [...r.scopeShapes] : null,
      pointIds: r.scopePoints ? [...r.scopePoints] : null,
      solidGroups,
      speed: r.speed || 1,
      pauseBetween: !!r.pauseBetween
    };
    const ok = b.saveBuildScript(r.page, r.steps, meta);
    if (ok && showFeedback) flashSavedBadge(1);
    return ok;
  }

  function persistAllActiveScripts(b, showFeedback = true) {
    const actives = getActiveReplays(b);
    if (!actives.length) return false;
    let savedCnt = 0;
    for (const item of actives) {
      if (persistScript(b, false, item)) savedCnt++;
    }
    if (savedCnt > 0 && showFeedback) flashSavedBadge(savedCnt);
    return savedCnt > 0;
  }

  function ensureReplayUI() {
    if (!replayPanel) {
      const el = document.createElement('div');
      el.id = 'mn-replay-panel';
      el.innerHTML = `
        <div class="mn-rp-head">
          <div class="mn-rp-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor" fill-opacity=".22"/></svg>
            <span id="mn-rp-head-title">Kịch bản</span>
            <span class="mn-rp-count-badge" id="mn-rp-count-badge" style="display:none;"></span>
          </div>
          <div class="mn-mp-head-btns">
            <button class="mn-icon-btn" id="mn-rp-save" title="Lưu kịch bản riêng cho từng hình đang mở">💾</button>
            <button class="mn-icon-btn" id="mn-rp-steps-toggle" title="Mở / Ẩn danh sách bước để sắp xếp">☰</button>
            <button class="mn-icon-btn" id="mn-rp-collapse" title="Thu gọn thành thanh nổi siêu gọn">─</button>
            <button class="mn-icon-btn danger" id="mn-rp-close" title="Đóng kịch bản">✕</button>
          </div>
        </div>
        <div class="mn-rp-tabs" id="mn-rp-tabs" style="display:none;"></div>
        <div class="mn-rp-saved-bar" id="mn-rp-saved-bar" style="display:none;"></div>
        <div class="mn-rp-controls">
          <div class="mn-rp-transport">
            <button class="mn-icon-btn" id="mn-rp-reset" title="Đưa về bước 0">↺</button>
            <button class="mn-icon-btn" id="mn-rp-prev" title="Bước trước">⏮</button>
            <button class="mn-icon-btn primary mn-play-btn" id="mn-rp-play" title="Phát / Tạm dừng">▶</button>
            <button class="mn-icon-btn" id="mn-rp-next" title="Bước tiếp">⏭</button>
            <button class="mn-icon-btn mn-rp-speed-btn" id="mn-rp-speed-cycle" title="Tốc độ vẽ (bấm để đổi: 0.5× → 1× → 1.5× → 2× → 3×)">1×</button>
            <button class="mn-icon-btn" id="mn-rp-pause-step" title="Tự dừng sau mỗi nét để giảng bài">⏸₁</button>
          </div>
          <div class="mn-rp-scrubber">
            <span id="mn-rp-step-count" style="font-weight:700;color:#2563eb;min-width:36px;font-variant-numeric:tabular-nums;">0/0</span>
            <input type="range" id="mn-rp-scrub" min="0" max="0" step="1" value="0" />
          </div>
        </div>
        <div class="mn-rp-presets-pop" id="mn-rp-presets-pop">
          <button class="mn-chip" id="mn-rp-preset-orig" title="Khôi phục thứ tự gốc">Gốc</button>
          <button class="mn-chip" id="mn-rp-preset-solid" title="Gộp khối 3D gốc thành Bước 1">Khối→Nét</button>
          <button class="mn-chip" id="mn-rp-preset-hidden" title="Thêm các đường ẩn vào kịch bản">+Ẩn</button>
          <button class="mn-chip" id="mn-rp-preset-ungroup" title="Tách tất cả nhóm bước">Tách</button>
        </div>
        <div class="mn-rp-list" id="mn-rp-list"></div>
      `;
      document.body.appendChild(el);
      makeDraggable(el, el.querySelector('.mn-rp-head'));

      el.querySelector('#mn-rp-save').addEventListener('click', () => {
        const b = getBoard();
        persistAllActiveScripts(b, true);
        renderReplayUI();
      });
      el.querySelector('#mn-rp-close').addEventListener('click', () => window.MinNoteGeoReplay.close());
      el.querySelector('#mn-rp-collapse').addEventListener('click', () => {
        replayViewMode = 'pill';
        renderReplayUI();
      });
      el.querySelector('#mn-rp-reset').addEventListener('click', () => {
        const actives = getActiveReplays(getBoard());
        if (actives.length > 1) window.MinNoteGeoReplay.resetAll();
        else window.MinNoteGeoReplay.reset();
      });
      el.querySelector('#mn-rp-prev').addEventListener('click', () => window.MinNoteGeoReplay.prevStep());
      el.querySelector('#mn-rp-next').addEventListener('click', () => window.MinNoteGeoReplay.nextStep());
      el.querySelector('#mn-rp-play').addEventListener('click', () => {
        const actives = getActiveReplays(getBoard());
        if (actives.length > 1) window.MinNoteGeoReplay.togglePlayAll();
        else window.MinNoteGeoReplay.togglePlay();
      });

      el.querySelector('#mn-rp-scrub').addEventListener('input', (e) => {
        window.MinNoteGeoReplay.jumpTo(parseInt(e.target.value, 10) || 0, true);
      });
      el.querySelector('#mn-rp-pause-step').addEventListener('click', () => {
        const b = getBoard();
        const r = getFocusedReplay(b);
        if (r) {
          r.pauseBetween = !r.pauseBetween;
          persistScript(b, false, r);
          renderReplayUI();
        }
      });
      el.querySelector('#mn-rp-speed-cycle').addEventListener('click', () => {
        const b = getBoard();
        const r = getFocusedReplay(b);
        if (!r) return;
        const curIdx = SPEED_CYCLE.findIndex(v => Math.abs(v - (r.speed || 1)) < 0.08);
        const nextVal = SPEED_CYCLE[(curIdx + 1) % SPEED_CYCLE.length];
        window.MinNoteGeoReplay.setSpeed(nextVal);
      });
      el.querySelector('#mn-rp-steps-toggle').addEventListener('click', () => {
        stepsCollapsed = !stepsCollapsed;
        presetsOpen = !stepsCollapsed;
        renderReplayUI();
      });
      el.querySelector('#mn-rp-preset-orig').addEventListener('click', () => window.MinNoteGeoReplay.applyPreset('orig'));
      el.querySelector('#mn-rp-preset-solid').addEventListener('click', () => window.MinNoteGeoReplay.applyPreset('solidFirst'));
      el.querySelector('#mn-rp-preset-hidden').addEventListener('click', () => window.MinNoteGeoReplay.addHiddenLines());
      el.querySelector('#mn-rp-preset-ungroup').addEventListener('click', () => window.MinNoteGeoReplay.applyPreset('ungroup'));

      replayPanel = el;
    }

    if (!replayPill) {
      const pill = document.createElement('div');
      pill.id = 'mn-replay-pill';
      document.body.appendChild(pill);
      const wasDragged = makeDraggable(pill, pill);

      pill.addEventListener('click', (e) => {
        if (wasDragged()) return;
        const figBtn = e.target.closest('[data-pill-fig]');
        if (figBtn) {
          e.stopPropagation();
          window.MinNoteGeoReplay.togglePlayScript(figBtn.getAttribute('data-pill-fig'));
          return;
        }
        const btn = e.target.closest('[data-pill-act]');
        if (!btn) {
          if (replayViewMode === 'mini') {
            replayViewMode = 'pill';
            renderReplayUI();
          }
          return;
        }
        e.stopPropagation();
        const act = btn.getAttribute('data-pill-act');
        if (act === 'reset') {
          const list = getActiveReplays(getBoard());
          if (list.length > 1) window.MinNoteGeoReplay.resetAll();
          else window.MinNoteGeoReplay.reset();
        } else if (act === 'prev') {
          window.MinNoteGeoReplay.prevStep();
        } else if (act === 'play') {
          const list = getActiveReplays(getBoard());
          if (list.length > 1) window.MinNoteGeoReplay.togglePlayAll();
          else window.MinNoteGeoReplay.togglePlay();
        } else if (act === 'next') {
          window.MinNoteGeoReplay.nextStep();
        } else if (act === 'mini') {
          replayViewMode = 'mini';
          renderReplayUI();
        } else if (act === 'unmini') {
          replayViewMode = 'pill';
          renderReplayUI();
        } else if (act === 'expand') {
          replayViewMode = 'full';
          renderReplayUI();
        } else if (act === 'close') {
          window.MinNoteGeoReplay.close();
        }
      });

      replayPill = pill;
    }
  }

  /* Pure Pointer-Events Drag-and-Drop Reorder */
  let suppressRowClickUntil = 0;

  function attachPointerReorder(listEl, row, rawIdx, b, r, labelText) {
    row.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('button')) return;

      const onHandle = !!e.target.closest('.mn-step-drag');
      const startX = e.clientX, startY = e.clientY;
      const rowRect = row.getBoundingClientRect();
      let started = false;
      let ghost = null;
      let dropIdx = rawIdx;

      const startDrag = (ev) => {
        started = true;
        row.classList.add('drag-source');
        ghost = document.createElement('div');
        ghost.className = 'mn-drag-ghost';
        ghost.style.width = rowRect.width + 'px';
        ghost.style.left = rowRect.left + 'px';
        ghost.style.top = (ev.clientY - rowRect.height / 2) + 'px';
        ghost.innerHTML = `<span style="color:#2563eb;">⋮⋮</span><span>${escapeHtml(labelText)}</span>`;
        document.body.appendChild(ghost);
      };

      const clearIndicators = () => {
        listEl.querySelectorAll('.mn-step-item').forEach(el => {
          el.classList.remove('drag-insert-before', 'drag-insert-after');
        });
      };

      const onMove = (ev) => {
        const dy = Math.abs(ev.clientY - startY);
        const dx = Math.abs(ev.clientX - startX);
        if (!started) {
          if (onHandle ? (dy > 3 || dx > 3) : dy > 7) startDrag(ev);
          else return;
        }
        ev.preventDefault();
        if (ghost) ghost.style.top = (ev.clientY - rowRect.height / 2) + 'px';

        const lRect = listEl.getBoundingClientRect();
        if (ev.clientY < lRect.top + 28) listEl.scrollTop -= 8;
        else if (ev.clientY > lRect.bottom - 28) listEl.scrollTop += 8;

        clearIndicators();
        const rows = [...listEl.querySelectorAll('.mn-step-item')];
        let target = rows.length - 1;
        let insertAfter = true;
        for (let k = 0; k < rows.length; k++) {
          const rr = rows[k].getBoundingClientRect();
          if (ev.clientY < rr.top + rr.height / 2) {
            target = k;
            insertAfter = false;
            break;
          }
        }
        const targetRow = rows[target];
        if (targetRow) {
          targetRow.classList.add(insertAfter ? 'drag-insert-after' : 'drag-insert-before');
        }
        dropIdx = insertAfter ? target + 1 : target;
      };

      const finish = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', finish, true);
        clearIndicators();
        row.classList.remove('drag-source');
        if (ghost) { ghost.remove(); ghost = null; }
        if (started) {
          suppressRowClickUntil = Date.now() + 250;
          let dest = dropIdx;
          if (dest > rawIdx) dest -= 1;
          dest = Math.max(0, Math.min(r.steps.length - 1, dest));
          if (dest !== rawIdx) {
            const [moved] = r.steps.splice(rawIdx, 1);
            r.steps.splice(dest, 0, moved);
            persistScript(b, false, r);
            b.redraw();
            renderReplayUI();
          }
        }
      };

      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', finish, true);
      window.addEventListener('pointercancel', finish, true);
    });
  }

  function renderReplayUI() {
    const b = getBoard();
    const actives = getActiveReplays(b);
    if (!actives.length) {
      if (replayPanel) replayPanel.classList.remove('open');
      if (replayPill) replayPill.classList.remove('open');
      return;
    }
    ensureReplayUI();

    const r = getFocusedReplay(b);
    if (!r) return;
    const pg = b.doc.pages[r.page];
    if (!pg) return;
    const geo = pg.geo;
    const activeSteps = r.steps.filter(s => s.enabled !== false);
    const total = activeSteps.length;
    const curDisplay = total === 0 ? 0 : Math.min(total, r.stepIdx + (r.stepProgress > 0 ? 1 : 0));
    const anyPlaying = actives.some(x => x.playing);
    const playingCount = actives.filter(x => x.playing).length;
    const isMulti = actives.length > 1;

    // Collapsed states: 'pill' or 'mini'
    if (replayViewMode === 'pill' || replayViewMode === 'mini') {
      replayPanel.classList.remove('open');
      replayPill.classList.add('open');
      replayPill.classList.toggle('mini', replayViewMode === 'mini');

      if (replayViewMode === 'mini') {
        const badgeTxt = isMulti ? `${playingCount}/${actives.length}` : `${curDisplay}/${total}`;
        replayPill.innerHTML = `
          <span class="mn-pill-grip" title="Kéo di chuyển">⋮⋮</span>
          <span class="mn-pill-mini-dot ${anyPlaying ? 'playing' : ''}"></span>
          <button class="mn-pill-btn primary" data-pill-act="play" title="${anyPlaying ? 'Tạm dừng' : 'Phát'}">${anyPlaying ? '⏸' : '▶'}</button>
          <span class="mn-pill-label" style="max-width:72px;">${escapeHtml(badgeTxt)}</span>
          <button class="mn-pill-btn" data-pill-act="unmini" title="Hiện thanh nút">⤢</button>
        `;
        return;
      }

      const figChipsHtml = isMulti
        ? actives.slice(0, 4).map((item, idx) => {
            const itTotal = item.steps.filter(s => s.enabled !== false).length;
            const itCur = itTotal ? Math.min(itTotal, item.stepIdx + (item.stepProgress > 0 ? 1 : 0)) : 0;
            const lbl = item.title || `H${idx + 1}`;
            return `<button type="button" class="mn-rp-pill-fig ${item.playing ? 'playing' : ''}" data-pill-fig="${escapeHtml(item.id)}" title="${escapeHtml(lbl)}: bấm để phát / dừng riêng">${item.playing ? '⏸' : '▶'} ${escapeHtml(lbl)} ${itCur}/${itTotal}</button>`;
          }).join('')
        : `<span class="mn-pill-label" style="min-width:34px;text-align:center;">${curDisplay}/${total}</span>`;

      replayPill.innerHTML = `
        <span class="mn-pill-grip" title="Kéo di chuyển">⋮⋮</span>
        <button class="mn-pill-btn" data-pill-act="reset" title="${isMulti ? 'Về bước 0 tất cả' : 'Về đầu'}">↺</button>
        ${!isMulti ? '<button class="mn-pill-btn" data-pill-act="prev" title="Bước trước">⏮</button>' : ''}
        <button class="mn-pill-btn primary" data-pill-act="play" title="${isMulti ? (anyPlaying ? 'Tạm dừng tất cả' : 'Phát tất cả') : (r.playing ? 'Tạm dừng' : 'Phát')}">${isMulti ? (anyPlaying ? '⏸' : '▶▶') : (r.playing ? '⏸' : '▶')}</button>
        ${!isMulti ? '<button class="mn-pill-btn" data-pill-act="next" title="Bước tiếp">⏭</button>' : ''}
        ${figChipsHtml}
        <button class="mn-pill-btn" data-pill-act="mini" title="Thu siêu nhỏ">─</button>
        <button class="mn-pill-btn" data-pill-act="expand" title="Mở bảng kịch bản">☰</button>
        <button class="mn-pill-btn" data-pill-act="close" title="Đóng">✕</button>
      `;
      return;
    }

    // Compact studio panel ('full')
    replayPill.classList.remove('open');
    replayPanel.classList.add('open');
    replayPanel.classList.toggle('steps-hidden', stepsCollapsed);

    const headTitle = replayPanel.querySelector('#mn-rp-head-title');
    if (headTitle) headTitle.textContent = isMulti ? 'Kịch bản' : (r.title && r.title !== 'Cả trang' ? r.title : 'Kịch bản');
    const countBadge = replayPanel.querySelector('#mn-rp-count-badge');
    if (countBadge) {
      if (isMulti) {
        countBadge.style.display = 'inline-flex';
        countBadge.textContent = playingCount ? `${playingCount}/${actives.length}` : `${actives.length} hình`;
      } else {
        countBadge.style.display = 'none';
      }
    }

    // Saved scripts count on current page
    const savedMap = loadSavedScriptsMap(pg);
    const savedEntries = Object.values(savedMap).filter(e => e && e.key && Array.isArray(e.steps) && e.steps.length);

    // Only show figure tab strip if > 1 figure active OR saved scripts exist
    const tabsEl = replayPanel.querySelector('#mn-rp-tabs');
    if (tabsEl) {
      const showTabs = isMulti || savedEntries.length > 0;
      tabsEl.style.display = showTabs ? 'flex' : 'none';
      tabsEl.innerHTML = '';
      if (showTabs) {
        if (isMulti) {
          actives.forEach((item, idx) => {
            const tab = document.createElement('div');
            tab.className = 'mn-rp-tab' + (item.id === r.id ? ' active' : '');
            const itemTotal = item.steps.filter(s => s.enabled !== false).length;
            const itemCur = itemTotal ? Math.min(itemTotal, item.stepIdx + (item.stepProgress > 0 ? 1 : 0)) : 0;
            const lbl = item.title || `H${idx + 1}`;
            tab.innerHTML = `
              <button type="button" class="mn-rp-tab-play" title="${item.playing ? 'Tạm dừng' : 'Phát riêng'}">${item.playing ? '⏸' : '▶'}</button>
              <span title="${escapeHtml(lbl)} (Nhấp đúp đổi tên)">${escapeHtml(lbl)} <small style="opacity:.75">${itemCur}/${itemTotal}</small></span>
              <button type="button" class="mn-rp-tab-close" title="Đóng hình này">✕</button>
            `;
            tab.addEventListener('click', (e) => {
              if (e.target.closest('.mn-rp-tab-play')) {
                e.stopPropagation();
                window.MinNoteGeoReplay.togglePlayScript(item.id);
                return;
              }
              if (e.target.closest('.mn-rp-tab-close')) {
                e.stopPropagation();
                window.MinNoteGeoReplay.closeScript(item.id);
                return;
              }
              window.MinNoteGeoReplay.selectScript(item.id);
            });
            tab.addEventListener('dblclick', (e) => {
              if (e.target.closest('button')) return;
              e.stopPropagation();
              const nextName = window.prompt('Đặt tên cho kịch bản hình này:', item.title || lbl);
              if (nextName && nextName.trim()) {
                item.title = nextName.trim();
                persistScript(b, false, item);
                renderReplayUI();
              }
            });
            tabsEl.appendChild(tab);
          });
        }
        if (savedEntries.length > 0) {
          const savedToggle = document.createElement('button');
          savedToggle.type = 'button';
          savedToggle.className = 'mn-rp-saved-toggle' + (savedShelfOpen ? ' open' : '');
          savedToggle.title = 'Mở kịch bản đã lưu trên trang này';
          savedToggle.textContent = `📂 ${savedEntries.length}`;
          savedToggle.addEventListener('click', () => {
            savedShelfOpen = !savedShelfOpen;
            renderReplayUI();
          });
          tabsEl.appendChild(savedToggle);
        }
      }
    }

    // Expandable Saved Scripts shelf
    const savedBar = replayPanel.querySelector('#mn-rp-saved-bar');
    if (savedBar) {
      if (savedShelfOpen && savedEntries.length > 0) {
        savedBar.style.display = 'flex';
        savedBar.innerHTML = '';
        savedEntries.sort((a, b2) => (b2.updatedAt || 0) - (a.updatedAt || 0)).forEach(entry => {
          const isLoaded = actives.some(x => x.page === r.page && (x.scriptKey === entry.key || x.scopeKey === entry.key));
          const chip = document.createElement('div');
          chip.className = 'mn-rp-saved-chip' + (isLoaded ? ' loaded' : '');
          const name = entry.title || (entry.key === 'all' ? 'Cả trang' : 'Hình đã lưu');
          chip.title = isLoaded ? `Đang mở: ${name}` : `Mở song song "${name}"`;
          chip.innerHTML = `<span>${escapeHtml(name)}</span><button type="button" class="mn-rp-saved-del" title="Xóa">✕</button>`;
          chip.addEventListener('click', (e) => {
            if (e.target.closest('.mn-rp-saved-del')) {
              e.stopPropagation();
              if (typeof b.deleteBuildScript === 'function') b.deleteBuildScript(r.page, entry.key);
              renderReplayUI();
              return;
            }
            window.MinNoteGeoReplay.openSavedScript(entry.key, r.page);
          });
          savedBar.appendChild(chip);
        });
      } else {
        savedBar.style.display = 'none';
      }
    }

    // Compact unified icon transport bar
    const playBtn = replayPanel.querySelector('#mn-rp-play');
    const resetBtn = replayPanel.querySelector('#mn-rp-reset');
    if (isMulti) {
      playBtn.textContent = anyPlaying ? `⏸ ${playingCount}/${actives.length}` : `▶▶`;
      playBtn.title = anyPlaying ? 'Tạm dừng tất cả' : 'Phát tất cả cùng lúc';
      resetBtn.title = 'Đưa tất cả về bước 0';
    } else {
      playBtn.textContent = r.playing ? '⏸' : (r.stepIdx >= total - 1 && r.stepProgress >= 1 ? '↺' : '▶');
      playBtn.title = r.playing ? 'Tạm dừng' : 'Phát kịch bản';
      resetBtn.title = 'Về bước đầu (0)';
    }

    const speedBtn = replayPanel.querySelector('#mn-rp-speed-cycle');
    if (speedBtn) speedBtn.textContent = `${Number(r.speed || 1)}×`;
    const pauseStepBtn = replayPanel.querySelector('#mn-rp-pause-step');
    if (pauseStepBtn) pauseStepBtn.classList.toggle('active', !!r.pauseBetween);

    replayPanel.querySelector('#mn-rp-step-count').textContent = `${curDisplay}/${total}`;
    const scrub = replayPanel.querySelector('#mn-rp-scrub');
    scrub.max = String(total);
    scrub.value = String(curDisplay);

    const stepsToggle = replayPanel.querySelector('#mn-rp-steps-toggle');
    if (stepsToggle) {
      stepsToggle.classList.toggle('active', !stepsCollapsed);
      stepsToggle.title = stepsCollapsed ? `Mở danh sách ${total} bước để sắp xếp` : 'Ẩn danh sách bước';
    }
    const presetsPop = replayPanel.querySelector('#mn-rp-presets-pop');
    if (presetsPop) presetsPop.classList.toggle('open', !stepsCollapsed);

    if (stepsCollapsed) return;

    const listEl = replayPanel.querySelector('#mn-rp-list');
    const prevScroll = listEl.scrollTop;
    listEl.innerHTML = '';
    if (!r.steps.length) {
      listEl.innerHTML = '<div class="mn-rp-empty">Chưa có hình học nào để dựng lại.</div>';
      return;
    }

    let activePos = 0;
    r.steps.forEach((st, rawIdx) => {
      const isEnabled = st.enabled !== false;
      const myActiveIdx = isEnabled ? activePos++ : -1;
      const isCurrent = isEnabled && myActiveIdx === r.stepIdx && (r.stepProgress > 0 || r.playing);
      const isDone = isEnabled && (myActiveIdx < r.stepIdx || (myActiveIdx === r.stepIdx && r.stepProgress >= 1));

      const row = document.createElement('div');
      row.className = `mn-step-item compact${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}${!isEnabled ? ' disabled' : ''}`;
      row.dataset.idx = String(rawIdx);

      const isShape = st.kind === 'shape';
      const sh = isShape ? geo.shapes.find(s => s.id === st.refId) : null;
      const hasDir = isShape && sh && ['segment', 'line', 'ray', 'extend', 'circle', 'polygon'].includes(sh.kind);
      const isInterPt = st.kind === 'point' && geo.points[st.refId] && geo.points[st.refId].def && geo.points[st.refId].def.t === 'inter';
      const isGroup = !!(st.items && st.items.length > 1);
      const labelText = stepDisplayLabel(geo, st);

      row.innerHTML = `
        <span class="mn-step-drag" title="Kéo để đổi thứ tự">⋮⋮</span>
        <span class="mn-step-num">${isEnabled ? myActiveIdx + 1 : '—'}</span>
        <div class="mn-step-info">
          <div class="mn-step-label" title="${escapeHtml(labelText)}">${escapeHtml(labelText)}</div>
        </div>
        <div class="mn-step-actions">
          ${isInterPt ? `<button class="mn-mini-btn ${st.showGuides !== false ? 'on' : ''}" data-act="guides" title="Vẽ 2 đường giao nhau rồi ẩn">✛</button>` : ''}
          ${isShape ? `<button class="mn-mini-btn ${st.tempHide ? 'on' : ''}" data-act="temphide" title="Vẽ tạm rồi tự ẩn">👻</button>` : ''}
          ${hasDir ? `<button class="mn-mini-btn ${st.rev ? 'on' : ''}" data-act="rev" title="Đảo chiều vẽ">⇄</button>` : ''}
          ${rawIdx > 0 ? `<button class="mn-mini-btn" data-act="merge" title="Gộp vẽ cùng bước trên">⊕</button>` : ''}
          ${isGroup ? `<button class="mn-mini-btn on" data-act="split" title="Tách nhóm">⊖</button>` : ''}
          <button class="mn-mini-btn ${isEnabled ? '' : 'on'}" data-act="toggle" title="${isEnabled ? 'Bỏ qua bước này' : 'Bật lại'}">${isEnabled ? '👁' : '✕'}</button>
        </div>
      `;

      attachPointerReorder(listEl, row, rawIdx, b, r, labelText);

      row.addEventListener('click', (e) => {
        if (Date.now() < suppressRowClickUntil) return;
        const btn = e.target.closest('[data-act]');
        if (!btn) {
          if (isEnabled) window.MinNoteGeoReplay.jumpTo(myActiveIdx + 1, false);
          return;
        }
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'guides') {
          st.showGuides = st.showGuides === false;
          persistScript(b, false, r);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'temphide') {
          st.tempHide = !st.tempHide;
          persistScript(b, false, r);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'rev') {
          st.rev = !st.rev;
          persistScript(b, false, r);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'up' && rawIdx > 0) {
          [r.steps[rawIdx - 1], r.steps[rawIdx]] = [r.steps[rawIdx], r.steps[rawIdx - 1]];
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'down' && rawIdx < r.steps.length - 1) {
          [r.steps[rawIdx + 1], r.steps[rawIdx]] = [r.steps[rawIdx], r.steps[rawIdx + 1]];
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'toggle') {
          st.enabled = st.enabled === false;
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'merge' && rawIdx > 0) {
          const prev = r.steps[rawIdx - 1];
          const pItems = prev.items && prev.items.length ? prev.items : [{ kind: prev.kind, refId: prev.refId, rev: !!prev.rev }];
          const cItems = st.items && st.items.length ? st.items : [{ kind: st.kind, refId: st.refId, rev: !!st.rev }];
          r.steps[rawIdx - 1] = { id: prev.id, kind: 'group', items: [...pItems, ...cItems], enabled: prev.enabled !== false };
          r.steps.splice(rawIdx, 1);
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        } else if (act === 'split' && isGroup) {
          const expanded = st.items.map((it, k) => ({ id: `${st.id}_${k}`, kind: it.kind, refId: it.refId, rev: !!it.rev, enabled: true }));
          r.steps.splice(rawIdx, 1, ...expanded);
          persistScript(b, false, r); b.redraw(); renderReplayUI();
        }
      });

      listEl.appendChild(row);
    });
    listEl.scrollTop = prevScroll;
  }

  function commitReplayChange(b, r, focus = true) {
    if (!b || !r) return;
    if (typeof b.addOrUpdateReplay === 'function') b.addOrUpdateReplay(r, focus);
    else b.setReplay(r);
  }

  window.MinNoteGeoReplay = {
    open(selectionOnly = false) {
      const b = getBoard();
      if (!b) return;
      const pageIdx = b.sel ? b.sel.page : b.currentPage();
      const pg = b.doc.pages[pageIdx];
      if (!pg) return;

      let scopeShapes = null, scopePoints = null, scopeKey = 'all';
      if (selectionOnly && b.sel && b.sel.page === pageIdx && (b.sel.shapes.size || b.sel.points.size)) {
        scopeShapes = new Set(b.sel.shapes);
        scopePoints = new Set(b.sel.points);
        for (const sh of pg.geo.shapes) {
          if (scopeShapes.has(sh.id)) sh.pts.forEach(pid => scopePoints.add(pid));
        }
        scopeKey = 'sel_' + [...scopeShapes].sort().join(',') + '|' + [...scopePoints].sort().join(',');
        b.sel = null;
        b.emit();
      }

      const existing = getActiveReplays(b);

      // If opening a specific figure while other figures are already open -> ADD concurrently!
      if (scopeShapes || scopePoints) {
        const solidGroups = extractSolidGroups(pg.geo, scopeShapes, scopePoints);
        // Check if this exact/overlapping figure is already open in active tabs
        const already = existing.find(x =>
          x.page === pageIdx && (
            x.scopeKey === scopeKey ||
            (x.scopeShapes && computeOverlapScore({ key: x.scriptKey || x.scopeKey, shapeIds: [...x.scopeShapes], pointIds: x.scopePoints ? [...x.scopePoints] : [], solidGroups: extractSolidGroups(pg.geo, x.scopeShapes, x.scopePoints), steps: x.steps }, scopeShapes, scopePoints, solidGroups) >= 0.8)
          )
        );
        if (already) {
          b.activeReplayId = already.id;
          b.replay = already;
          replayViewMode = 'full';
          b.redraw();
          renderReplayUI();
          return;
        }

        const matchedSaved = findSavedScriptForScope(pg, scopeKey, scopeShapes, scopePoints);
        const steps = reconcileSavedScript(pg.geo, matchedSaved ? matchedSaved.steps : null, scopeShapes, scopePoints);
        const scriptKey = matchedSaved ? matchedSaved.key : scopeKey;
        const title = (matchedSaved && matchedSaved.title) || buildFigureTitle(pg.geo, scopeShapes, scopePoints, existing.length + 1);

        // Drop any whole-page 'all' replay if user now adds a scoped figure script
        const kept = existing.filter(x => !(x.page === pageIdx && x.scopeKey === 'all'));
        const session = {
          id: 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          title,
          scriptKey,
          active: true,
          page: pageIdx,
          playing: false,
          stepIdx: 0,
          stepProgress: 0,
          speed: (matchedSaved && typeof matchedSaved.speed === 'number') ? matchedSaved.speed : 1,
          pauseBetween: !!(matchedSaved && matchedSaved.pauseBetween),
          scopeShapes,
          scopePoints,
          scopeKey,
          steps
        };
        replayViewMode = 'full';
        if (typeof b.setReplays === 'function') b.setReplays([...kept, session], session.id);
        else b.setReplay(session);
        renderReplayUI();
        return;
      }

      // Opening whole-page from menu: if scripts are already active on this page, just show the drawer!
      if (existing.some(x => x.page === pageIdx)) {
        replayViewMode = 'full';
        renderReplayUI();
        return;
      }

      const matchedSaved = findSavedScriptForScope(pg, 'all', null, null);
      const steps = reconcileSavedScript(pg.geo, matchedSaved ? matchedSaved.steps : null, null, null);
      const session = {
        id: 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        title: (matchedSaved && matchedSaved.title) || 'Cả trang',
        scriptKey: 'all',
        active: true,
        page: pageIdx,
        playing: false,
        stepIdx: 0,
        stepProgress: 0,
        speed: (matchedSaved && typeof matchedSaved.speed === 'number') ? matchedSaved.speed : 1,
        pauseBetween: !!(matchedSaved && matchedSaved.pauseBetween),
        scopeShapes: null,
        scopePoints: null,
        scopeKey: 'all',
        steps
      };
      replayViewMode = 'full';
      if (typeof b.setReplays === 'function') b.setReplays([session], session.id);
      else b.setReplay(session);
      renderReplayUI();
    },

    openSavedScript(key, pageIdxArg) {
      const b = getBoard();
      if (!b || !key) return;
      const pageIdx = pageIdxArg !== undefined ? pageIdxArg : b.currentPage();
      const pg = b.doc.pages[pageIdx];
      if (!pg) return;
      const map = loadSavedScriptsMap(pg);
      const entry = map[key];
      if (!entry || !Array.isArray(entry.steps)) return;

      const existing = getActiveReplays(b);
      const already = existing.find(x => x.page === pageIdx && (x.scriptKey === key || x.scopeKey === key));
      if (already) {
        b.activeReplayId = already.id;
        b.replay = already;
        b.redraw();
        renderReplayUI();
        return;
      }

      let scopeShapes = null, scopePoints = null, scopeKey = 'all';
      if (key !== 'all') {
        const validSh = new Set(pg.geo.shapes.map(s => s.id));
        const validPt = new Set(Object.keys(pg.geo.points || {}));
        scopeShapes = new Set((entry.shapeIds || []).filter(id => validSh.has(id)));
        scopePoints = new Set((entry.pointIds || []).filter(id => validPt.has(id)));
        // Also include shapes belonging to the same 3D solidGroup if present
        if (Array.isArray(entry.solidGroups) && entry.solidGroups.length) {
          const sgSet = new Set(entry.solidGroups);
          for (const sh of pg.geo.shapes) {
            if (sh.group && sgSet.has(sh.group)) scopeShapes.add(sh.id);
          }
          for (const pt of Object.values(pg.geo.points || {})) {
            if (pt.group && sgSet.has(pt.group)) scopePoints.add(pt.id);
          }
        }
        for (const sh of pg.geo.shapes) {
          if (scopeShapes.has(sh.id)) sh.pts.forEach(pid => scopePoints.add(pid));
        }
        scopeKey = 'sel_' + [...scopeShapes].sort().join(',') + '|' + [...scopePoints].sort().join(',');
      }

      const steps = reconcileSavedScript(pg.geo, entry.steps, scopeShapes, scopePoints);
      const kept = key === 'all' ? [] : existing.filter(x => !(x.page === pageIdx && x.scopeKey === 'all'));
      const session = {
        id: 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        title: entry.title || buildFigureTitle(pg.geo, scopeShapes, scopePoints, kept.length + 1),
        scriptKey: entry.key,
        active: true,
        page: pageIdx,
        playing: false,
        stepIdx: 0,
        stepProgress: 0,
        speed: typeof entry.speed === 'number' ? entry.speed : 1,
        pauseBetween: !!entry.pauseBetween,
        scopeShapes,
        scopePoints,
        scopeKey,
        steps
      };
      if (typeof b.setReplays === 'function') b.setReplays([...kept, session], session.id);
      else b.setReplay(session);
      renderReplayUI();
    },

    selectScript(id) {
      const b = getBoard();
      if (!b) return;
      const actives = getActiveReplays(b);
      const target = actives.find(x => x.id === id);
      if (!target) return;
      b.activeReplayId = target.id;
      b.replay = target;
      renderReplayUI();
    },

    togglePlayScript(id) {
      const b = getBoard();
      if (!b) return;
      const actives = getActiveReplays(b);
      const r = actives.find(x => x.id === id);
      if (!r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.playing) {
        r.playing = false;
      } else {
        r.stopAfterStep = false;
        if (r.stepIdx >= activeSteps.length - 1 && r.stepProgress >= 1) {
          r.stepIdx = 0; r.stepProgress = 0;
        } else if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
          r.stepIdx++; r.stepProgress = 0;
        }
        r.playing = true;
      }
      commitReplayChange(b, r, false);
    },

    closeScript(id) {
      const b = getBoard();
      if (!b) return;
      if (typeof b.stopReplay === 'function') b.stopReplay(id);
      renderReplayUI();
    },

    close() {
      const b = getBoard();
      if (b) b.stopReplay();
      replayViewMode = 'full';
      renderReplayUI();
    },

    collapse(mode = 'pill') {
      replayViewMode = mode;
      renderReplayUI();
    },

    save() {
      const b = getBoard();
      const ok = persistAllActiveScripts(b, true);
      renderReplayUI();
      return ok;
    },

    addHiddenLines() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const pg = b.doc.pages[r.page];
      if (!pg) return;
      const existing = new Set();
      for (const st of r.steps) {
        if (st.kind === 'shape') existing.add(st.refId);
        if (st.items) st.items.forEach(it => it.kind === 'shape' && existing.add(it.refId));
      }
      let added = 0;
      for (const sh of pg.geo.shapes) {
        if (sh.kind === 'solid' || sh.kind === 'flatLink' || !sh.hidden || existing.has(sh.id)) continue;
        if (r.scopeShapes && !r.scopeShapes.has(sh.id)) continue;
        r.steps.push({ id: 'st_h_' + sh.id, kind: 'shape', refId: sh.id, rev: false, tempHide: true, includeHidden: true, enabled: true });
        added++;
      }
      if (added > 0) {
        persistScript(b, true, r);
        b.redraw();
        renderReplayUI();
      }
    },

    reset() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.playing = false;
      r.stepIdx = 0;
      r.stepProgress = 0;
      commitReplayChange(b, r, true);
    },

    resetAll() {
      const b = getBoard();
      const actives = getActiveReplays(b);
      if (!b || !actives.length) return;
      for (const r of actives) {
        r.playing = false;
        r.stepIdx = 0;
        r.stepProgress = 0;
      }
      if (typeof b.setReplays === 'function') b.setReplays(actives, b.activeReplayId);
      else b.setReplay(actives[0]);
    },

    togglePlay() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.playing) {
        r.playing = false;
      } else {
        r.stopAfterStep = false;
        if (r.stepIdx >= activeSteps.length - 1 && r.stepProgress >= 1) {
          r.stepIdx = 0; r.stepProgress = 0;
        } else if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
          r.stepIdx++; r.stepProgress = 0;
        }
        r.playing = true;
      }
      commitReplayChange(b, r, true);
    },

    togglePlayAll() {
      const b = getBoard();
      const actives = getActiveReplays(b);
      if (!b || !actives.length) return;
      const anyPlaying = actives.some(r => r.playing);
      for (const r of actives) {
        const activeSteps = r.steps.filter(s => s.enabled !== false);
        if (!activeSteps.length) continue;
        if (anyPlaying) {
          r.playing = false;
        } else {
          r.stopAfterStep = false;
          if (r.stepIdx >= activeSteps.length - 1 && r.stepProgress >= 1) {
            r.stepIdx = 0; r.stepProgress = 0;
          } else if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
            r.stepIdx++; r.stepProgress = 0;
          }
          r.playing = true;
        }
      }
      if (typeof b.setReplays === 'function') b.setReplays(actives, b.activeReplayId);
      else b.setReplay(actives[0]);
    },

    nextStep() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
        r.stepIdx++;
      }
      r.stepProgress = 0;
      r.stopAfterStep = true;
      r.playing = true;
      commitReplayChange(b, r, true);
    },

    prevStep() {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.playing = false;
      if (r.stepProgress > 0 && r.stepProgress < 1) {
        r.stepProgress = 0;
      } else if (r.stepIdx > 0) {
        r.stepIdx--;
        r.stepProgress = 1;
      } else {
        r.stepIdx = 0;
        r.stepProgress = 0;
      }
      commitReplayChange(b, r, true);
    },

    jumpTo(completedCount, instant = true) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      const n = Math.max(0, Math.min(activeSteps.length, completedCount));
      r.playing = false;
      if (n === 0) {
        r.stepIdx = 0; r.stepProgress = 0;
      } else if (instant) {
        r.stepIdx = n - 1; r.stepProgress = 1;
      } else {
        r.stepIdx = n - 1; r.stepProgress = 0; r.stopAfterStep = true; r.playing = true;
      }
      commitReplayChange(b, r, true);
    },

    playSingleStep(activeIdx) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.stepIdx = Math.max(0, activeIdx);
      r.stepProgress = 0;
      r.stopAfterStep = true;
      r.playing = true;
      commitReplayChange(b, r, true);
    },

    setSpeed(v) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      r.speed = Math.max(0.2, Math.min(4, Number(v) || 1));
      persistScript(b, false, r);
      renderReplayUI();
    },

    applyPreset(mode) {
      const b = getBoard();
      const r = getFocusedReplay(b);
      if (!b || !r) return;
      const pg = b.doc.pages[r.page];
      if (!pg) return;
      if (mode === 'orig') {
        r.steps = buildDefaultSteps(pg.geo, r.scopeShapes, r.scopePoints);
      } else if (mode === 'solidFirst') {
        r.steps = buildSolidFirstPreset(pg.geo, r.scopeShapes, r.scopePoints);
      } else if (mode === 'ungroup') {
        const out = [];
        for (const st of r.steps) {
          if (st.items && st.items.length > 1) {
            st.items.forEach((it, k) => out.push({ id: `${st.id}_${k}`, kind: it.kind, refId: it.refId, rev: !!it.rev, enabled: st.enabled !== false }));
          } else out.push(st);
        }
        r.steps = out;
      }
      r.stepIdx = 0;
      r.stepProgress = 0;
      r.playing = false;
      persistScript(b, false, r);
      commitReplayChange(b, r, true);
    }
  };

  window.addEventListener('minnote:aux-update', () => {
    renderMotionPanel();
    renderReplayUI();
  });

  // ==================== SMART POSITION FOR .sheet-restore-pill (NEVER OVERLAP TOOLBARS) ====================
  function positionSheetRestorePill() {
    const pill = document.querySelector('.sheet-restore-pill');
    if (!pill) return;
    const bw = document.querySelector('.board-wrap');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = 14;
    let bottom = 10;
    if (bw) {
      const r = bw.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        left = Math.round(r.left + 12);
        bottom = Math.round(Math.max(10, vh - r.bottom + 10));
      }
    }
    const fl = document.querySelector('.float-layer .tools-bar.float');
    if (fl) {
      const fr = fl.getBoundingClientRect();
      if (fr.width > 0 && fr.height > 0) {
        const pillW = pill.offsetWidth || 86;
        const pillH = pill.offsetHeight || 28;
        const pillTop = vh - bottom - pillH;
        const pillBottom = vh - bottom;
        const overlapX = left < fr.right + 8 && (left + pillW) > fr.left - 8;
        const overlapY = pillTop < fr.bottom + 8 && pillBottom > fr.top - 8;
        if (overlapX && overlapY) {
          if (fl.classList.contains('side-bottom')) {
            bottom = Math.round(Math.max(bottom, vh - fr.top + 10));
          } else if (fl.classList.contains('side-left')) {
            left = Math.round(Math.max(left, fr.right + 12));
          }
        }
      }
    }
    left = Math.max(8, Math.min(vw - 100, left));
    bottom = Math.max(8, Math.min(vh - 44, bottom));
    const lVal = left + 'px';
    const bVal = bottom + 'px';
    if (pill.style.getPropertyValue('--sheet-pill-left') !== lVal) pill.style.setProperty('--sheet-pill-left', lVal);
    if (pill.style.getPropertyValue('--sheet-pill-bottom') !== bVal) pill.style.setProperty('--sheet-pill-bottom', bVal);
  }

  function startSheetPillObserver() {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        positionSheetRestorePill();
      });
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-ui'] });
    window.addEventListener('resize', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startSheetPillObserver);
  else startSheetPillObserver();
})();
