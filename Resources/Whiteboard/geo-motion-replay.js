(() => {
  'use strict';

  const getBoard = () => window.__minnoteBoard || null;

  function makeDraggable(panel, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, select')) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = Math.max(8, Math.min(window.innerWidth - 120, ox + e.clientX - sx));
      const ny = Math.max(48, Math.min(window.innerHeight - 60, oy + e.clientY - sy));
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    });
    const end = () => { dragging = false; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================================
   * 1. POINT MOTION (CHUYỂN ĐỘNG ĐIỂM) UI CONTROLLER
   * ============================================================================ */
  let motionPanel = null;

  function ensureMotionPanel() {
    if (motionPanel) return motionPanel;
    const el = document.createElement('div');
    el.id = 'mn-motion-panel';
    el.innerHTML = `
      <div class="mn-mp-head">
        <div class="mn-mp-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" opacity=".25" fill="currentColor"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
          <span>Chuyển động điểm</span>
        </div>
        <div class="mn-mp-head-btns">
          <button class="mn-icon-btn" id="mn-mp-toggle-all" title="Phát / Tạm dừng tất cả">⏸</button>
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

    const anims = [...b.ptAnims.values()];
    const anyRunning = anims.some(a => !a.paused);
    const toggleAllBtn = panel.querySelector('#mn-mp-toggle-all');
    toggleAllBtn.textContent = anyRunning ? '⏸' : '▶';
    toggleAllBtn.title = anyRunning ? 'Tạm dừng tất cả' : 'Tiếp tục tất cả';

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
   * 2. CONSTRUCTION REPLAY & SCRIPT EDITOR (DỰNG LẠI HÌNH THEO KỊCH BẢN)
   * ============================================================================ */
  let replayPanel = null;
  let replayPill = null;
  let replayCollapsed = false;
  let savedFlashTimer = 0;

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

  function stepSubtitle(geo, step) {
    if (step.items && step.items.length > 1) {
      const preview = step.items.slice(0, 4).map(it => {
        if (it.kind === 'point') return ptName(geo, it.refId);
        const sh = geo.shapes.find(s => s.id === it.refId);
        return sh ? sh.pts.map(id => ptName(geo, id)).join('') : '';
      }).filter(Boolean).join(', ');
      return `Vẽ đồng thời: ${preview}${step.items.length > 4 ? '…' : ''}`;
    }
    const it = (step.items && step.items[0]) || step;
    if (it.kind === 'point') {
      const p = geo.points[it.refId];
      if (!p) return '';
      const t = p.def.t;
      if (t === 'inter') {
        const l1 = `${ptName(geo, p.def.l1[0])}${ptName(geo, p.def.l1[1])}`;
        const l2 = `${ptName(geo, p.def.l2[0])}${ptName(geo, p.def.l2[1])}`;
        return step.showGuides !== false
          ? `Vẽ ${l1} ∩ ${l2} → hiện ${ptName(geo, p.id)} → ẩn 2 đường`
          : `Giao điểm ${l1} ∩ ${l2} (không vẽ đường phụ)`;
      }
      if (t === 'mid') return `Trung điểm ${ptName(geo, p.def.a)}${ptName(geo, p.def.b)}`;
      if (t === 'on') return `Điểm trên ${ptName(geo, p.def.a)}${ptName(geo, p.def.b)}`;
      if (t === 'foot') return `Chân đường vuông góc`;
      return 'Điểm dựng';
    }
    const sh = geo.shapes.find(s => s.id === it.refId);
    if (!sh) return '';
    if (sh.kind === 'segment' || sh.kind === 'line' || sh.kind === 'ray') {
      const rev = !!(it.rev ?? step.rev);
      const a = ptName(geo, rev ? sh.pts[1] : sh.pts[0]);
      const b = ptName(geo, rev ? sh.pts[0] : sh.pts[1]);
      return `Chiều vẽ: ${a} ⟶ ${b}${step.tempHide ? ' • Tự ẩn sau khi vẽ' : ''}`;
    }
    return (sh.dashed ? 'Nét đứt' : 'Nét liền') + (step.tempHide ? ' • Tự ẩn sau khi vẽ' : '');
  }

  function parseNtTimestamp(id) {
    if (typeof id !== 'string' || id.length < 8) return null;
    // nt() starts with 8-char base36 Date.now() timestamp (e.g. "m..." for 2024..2035 -> ~1.7e12..2.1e12 ms)
    const head = id.slice(0, 8);
    if (!/^[a-z0-9]{8}$/.test(head)) return null;
    const ms = parseInt(head, 36);
    return (ms > 1500000000000 && ms < 4000000000000) ? ms : null;
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

    // Build unified chronological timeline using exact creation timestamp from nt() IDs + insertion order
    const entries = [];
    const ptEntries = Object.values(geo.points);
    ptEntries.forEach((pt, idx) => {
      if (!isStepPt(pt)) return;
      // Don't clutter with free points that are just immediate endpoints of a 2D segment drawn in the same action (<25ms)
      if (pt.def.t === 'free' && usedPtsByShape.has(pt.id)) return;
      entries.push({
        ts: parseNtTimestamp(pt.id),
        kindRank: 0, // at identical ms, point precedes shape
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

    // Sort strictly by creation timestamp when both have nt() timestamps; otherwise preserve logical order
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

    // Light dependency pass: ensure any prerequisite point step appears before the first shape or derived point that uses it
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

  function loadSavedScript(pg) {
    if (pg && pg.geo && Array.isArray(pg.geo.script) && pg.geo.script.length) {
      return pg.geo.script;
    }
    if (pg && pg.id) {
      try {
        const raw = localStorage.getItem('mn_geo_script_' + pg.id);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) return parsed;
        }
      } catch {}
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

  function flashSavedBadge() {
    if (!replayPanel) return;
    const btn = replayPanel.querySelector('#mn-rp-save');
    if (!btn) return;
    btn.classList.add('saved');
    btn.textContent = '✓ Đã lưu!';
    clearTimeout(savedFlashTimer);
    savedFlashTimer = setTimeout(() => {
      if (btn) {
        btn.classList.remove('saved');
        btn.textContent = '💾 Lưu';
      }
    }, 1800);
  }

  function persistScript(b, showFeedback = false) {
    if (!b || !b.replay) return false;
    const ok = b.saveBuildScript(b.replay.page, b.replay.steps);
    if (ok && showFeedback) flashSavedBadge();
    return ok;
  }

  function ensureReplayUI() {
    if (!replayPanel) {
      const el = document.createElement('div');
      el.id = 'mn-replay-panel';
      el.innerHTML = `
        <div class="mn-rp-head">
          <div class="mn-rp-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor" fill-opacity=".22"/></svg>
            <span>Kịch bản dựng lại hình</span>
          </div>
          <div class="mn-mp-head-btns">
            <button class="mn-save-btn" id="mn-rp-save" title="Lưu thứ tự và cài đặt kịch bản vào trang hiện tại">💾 Lưu</button>
            <button class="mn-icon-btn" id="mn-rp-collapse" title="Thu gọn thành thanh trình chiếu">▁</button>
            <button class="mn-icon-btn danger" id="mn-rp-close" title="Thoát chế độ dựng lại hình">✕</button>
          </div>
        </div>
        <div class="mn-rp-controls">
          <div class="mn-rp-transport">
            <button class="mn-icon-btn" id="mn-rp-reset" title="Về bước đầu tiên (0)">↺</button>
            <button class="mn-icon-btn" id="mn-rp-prev" title="Bước trước">⏮</button>
            <button class="mn-icon-btn primary mn-play-btn" id="mn-rp-play">▶ Phát kịch bản</button>
            <button class="mn-icon-btn" id="mn-rp-next" title="Bước tiếp theo">⏭</button>
          </div>
          <div class="mn-rp-scrubber">
            <span id="mn-rp-step-count" style="font-weight:700;color:#0f766e;min-width:64px;">Bước 0/0</span>
            <input type="range" id="mn-rp-scrub" min="0" max="0" step="1" value="0" />
          </div>
          <div class="mn-speed-row">
            <span>Tốc độ vẽ</span>
            <input type="range" id="mn-rp-speed" min="0.4" max="3" step="0.1" value="1" />
            <span class="mn-speed-val" id="mn-rp-speed-val">1.0×</span>
          </div>
          <div class="mn-rp-meta">
            <label class="mn-rp-check" title="Tự động dừng sau mỗi nét để giáo viên giảng bài rồi bấm ⏭ vẽ tiếp">
              <input type="checkbox" id="mn-rp-pause-between" />
              <span>Dừng sau mỗi bước</span>
            </label>
            <div class="mn-speed-presets" style="gap:3px;">
              ${[0.5, 1, 1.5, 2, 3].map(v => `<button class="mn-chip" data-rp-speed="${v}">${v}×</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="mn-rp-presets">
          <button class="mn-chip" id="mn-rp-preset-orig" title="Khôi phục đúng thứ tự vẽ hình từ ban đầu">Thứ tự gốc</button>
          <button class="mn-chip" id="mn-rp-preset-solid" title="Gộp khung khối 3D gốc thành Bước 1, tách các đường dựng thêm thành các bước tiếp theo">Khối gốc → Nét thêm</button>
          <button class="mn-chip" id="mn-rp-preset-hidden" title="Thêm các đường phụ đã ẩn (Ctrl+H) vào kịch bản ở chế độ vẽ tạm rồi tự ẩn">+ Nét đã ẩn</button>
          <button class="mn-chip" id="mn-rp-preset-ungroup" title="Tách toàn bộ các nhóm bước thành từng nét riêng lẻ">Tách nhóm</button>
        </div>
        <div class="mn-rp-list" id="mn-rp-list"></div>
        <div class="mn-rp-foot">
          <span>Kéo thả ⋮⋮ hoặc ↑↓ đổi thứ tự • ⇄ đảo chiều • 👻 vẽ rồi ẩn</span>
        </div>
      `;
      document.body.appendChild(el);
      makeDraggable(el, el.querySelector('.mn-rp-head'));

      el.querySelector('#mn-rp-save').addEventListener('click', () => {
        const b = getBoard();
        persistScript(b, true);
      });
      el.querySelector('#mn-rp-close').addEventListener('click', () => window.MinNoteGeoReplay.close());
      el.querySelector('#mn-rp-collapse').addEventListener('click', () => {
        replayCollapsed = true;
        renderReplayUI();
      });
      el.querySelector('#mn-rp-reset').addEventListener('click', () => window.MinNoteGeoReplay.reset());
      el.querySelector('#mn-rp-prev').addEventListener('click', () => window.MinNoteGeoReplay.prevStep());
      el.querySelector('#mn-rp-next').addEventListener('click', () => window.MinNoteGeoReplay.nextStep());
      el.querySelector('#mn-rp-play').addEventListener('click', () => window.MinNoteGeoReplay.togglePlay());

      el.querySelector('#mn-rp-scrub').addEventListener('input', (e) => {
        window.MinNoteGeoReplay.jumpTo(parseInt(e.target.value, 10) || 0, true);
      });
      el.querySelector('#mn-rp-speed').addEventListener('input', (e) => {
        window.MinNoteGeoReplay.setSpeed(parseFloat(e.target.value) || 1);
      });
      el.querySelector('#mn-rp-pause-between').addEventListener('change', (e) => {
        const b = getBoard();
        if (b && b.replay) { b.replay.pauseBetween = !!e.target.checked; renderReplayUI(); }
      });
      el.querySelectorAll('[data-rp-speed]').forEach(btn => {
        btn.addEventListener('click', () => window.MinNoteGeoReplay.setSpeed(parseFloat(btn.dataset.rpSpeed)));
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
      pill.innerHTML = `
        <button class="mn-pill-btn" id="mn-pill-reset" title="Từ đầu">↺</button>
        <button class="mn-pill-btn" id="mn-pill-prev" title="Bước trước">⏮</button>
        <button class="mn-pill-btn primary" id="mn-pill-play" title="Phát / Tạm dừng">▶</button>
        <button class="mn-pill-btn" id="mn-pill-next" title="Bước tiếp">⏭</button>
        <span class="mn-pill-label" id="mn-pill-label">Bước 0/0</span>
        <button class="mn-pill-btn" id="mn-pill-expand" title="Mở bảng kịch bản">Kịch bản</button>
        <button class="mn-pill-btn" id="mn-pill-close" title="Thoát dựng lại hình">✕</button>
      `;
      document.body.appendChild(pill);
      pill.querySelector('#mn-pill-reset').addEventListener('click', () => window.MinNoteGeoReplay.reset());
      pill.querySelector('#mn-pill-prev').addEventListener('click', () => window.MinNoteGeoReplay.prevStep());
      pill.querySelector('#mn-pill-play').addEventListener('click', () => window.MinNoteGeoReplay.togglePlay());
      pill.querySelector('#mn-pill-next').addEventListener('click', () => window.MinNoteGeoReplay.nextStep());
      pill.querySelector('#mn-pill-expand').addEventListener('click', () => { replayCollapsed = false; renderReplayUI(); });
      pill.querySelector('#mn-pill-close').addEventListener('click', () => window.MinNoteGeoReplay.close());
      replayPill = pill;
    }
  }

  /* Pure Pointer-Events Drag-and-Drop Reorder (100% WebView2 / Mouse / Touchpad / Stylus reliable!) */
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
        ghost.innerHTML = `<span style="color:#0d9488;">⋮⋮</span><span>${escapeHtml(labelText)}</span>`;
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

        // Auto-scroll list when dragging near top or bottom
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
            persistScript(b, false);
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
    const r = b && b.replay;
    if (!r || !r.active) {
      if (replayPanel) replayPanel.classList.remove('open');
      if (replayPill) replayPill.classList.remove('open');
      return;
    }
    ensureReplayUI();

    const pg = b.doc.pages[r.page];
    if (!pg) return;
    const geo = pg.geo;
    const activeSteps = r.steps.filter(s => s.enabled !== false);
    const total = activeSteps.length;
    const curDisplay = total === 0 ? 0 : Math.min(total, r.stepIdx + (r.stepProgress > 0 ? 1 : 0));

    if (replayCollapsed) {
      replayPanel.classList.remove('open');
      replayPill.classList.add('open');
      replayPill.querySelector('#mn-pill-play').textContent = r.playing ? '⏸' : '▶';
      const curSt = activeSteps[Math.min(r.stepIdx, Math.max(0, total - 1))];
      replayPill.querySelector('#mn-pill-label').textContent = total
        ? `Bước ${curDisplay}/${total}${curSt ? ' • ' + stepDisplayLabel(geo, curSt) : ''}`
        : 'Chưa có nét hình học';
      return;
    }

    replayPill.classList.remove('open');
    replayPanel.classList.add('open');

    const playBtn = replayPanel.querySelector('#mn-rp-play');
    playBtn.textContent = r.playing ? '⏸ Tạm dừng' : (r.stepIdx >= total - 1 && r.stepProgress >= 1 ? '↺ Phát lại' : '▶ Phát kịch bản');

    replayPanel.querySelector('#mn-rp-step-count').textContent = `Bước ${curDisplay}/${total}`;
    const scrub = replayPanel.querySelector('#mn-rp-scrub');
    scrub.max = String(total);
    scrub.value = String(curDisplay);

    const spEl = replayPanel.querySelector('#mn-rp-speed');
    spEl.value = String(r.speed);
    replayPanel.querySelector('#mn-rp-speed-val').textContent = Number(r.speed).toFixed(1) + '×';
    replayPanel.querySelector('#mn-rp-pause-between').checked = !!r.pauseBetween;
    replayPanel.querySelectorAll('[data-rp-speed]').forEach(btn => {
      btn.classList.toggle('on', Math.abs(r.speed - parseFloat(btn.dataset.rpSpeed)) < 0.06);
    });

    const listEl = replayPanel.querySelector('#mn-rp-list');
    const prevScroll = listEl.scrollTop;
    listEl.innerHTML = '';
    if (!r.steps.length) {
      listEl.innerHTML = '<div class="mn-rp-empty">Trang này chưa có hình học nào để dựng lại.<br/>Hãy vẽ hình (đoạn thẳng, hình chóp, đường tròn…) rồi mở lại bảng kịch bản!</div>';
      return;
    }

    let activePos = 0;
    r.steps.forEach((st, rawIdx) => {
      const isEnabled = st.enabled !== false;
      const myActiveIdx = isEnabled ? activePos++ : -1;
      const isCurrent = isEnabled && myActiveIdx === r.stepIdx && (r.stepProgress > 0 || r.playing);
      const isDone = isEnabled && (myActiveIdx < r.stepIdx || (myActiveIdx === r.stepIdx && r.stepProgress >= 1));

      const row = document.createElement('div');
      row.className = `mn-step-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}${!isEnabled ? ' disabled' : ''}`;
      row.dataset.idx = String(rawIdx);

      const isShape = st.kind === 'shape';
      const sh = isShape ? geo.shapes.find(s => s.id === st.refId) : null;
      const hasDir = isShape && sh && ['segment', 'line', 'ray', 'extend', 'circle', 'polygon'].includes(sh.kind);
      const isInterPt = st.kind === 'point' && geo.points[st.refId] && geo.points[st.refId].def && geo.points[st.refId].def.t === 'inter';
      const isGroup = !!(st.items && st.items.length > 1);
      const labelText = stepDisplayLabel(geo, st);

      row.innerHTML = `
        <span class="mn-step-drag" title="Kéo thả để đổi thứ tự">⋮⋮</span>
        <span class="mn-step-num">${isEnabled ? myActiveIdx + 1 : '—'}</span>
        <div class="mn-step-info">
          <div class="mn-step-label">${escapeHtml(labelText)}</div>
          <div class="mn-step-sub">${escapeHtml(stepSubtitle(geo, st))}</div>
        </div>
        <div class="mn-step-actions">
          ${isInterPt ? `<button class="mn-mini-btn ${st.showGuides !== false ? 'on' : ''}" data-act="guides" title="${st.showGuides !== false ? 'Đang bật: vẽ 2 đường giao nhau rồi tự ẩn' : 'Đang tắt: chỉ hiện điểm giao'}">✛</button>` : ''}
          ${isShape ? `<button class="mn-mini-btn ${st.tempHide ? 'on' : ''}" data-act="temphide" title="${st.tempHide ? 'Vẽ tạm rồi tự ẩn (bấm để giữ nét lại)' : 'Chế độ vẽ tạm rồi tự ẩn sau khi vẽ xong'}">👻</button>` : ''}
          ${hasDir ? `<button class="mn-mini-btn ${st.rev ? 'on' : ''}" data-act="rev" title="Đảo chiều vẽ (A → B thành B → A)">⇄</button>` : ''}
          ${rawIdx > 0 ? `<button class="mn-mini-btn" data-act="merge" title="Gộp vẽ đồng thời với bước phía trên">⊕</button>` : ''}
          ${isGroup ? `<button class="mn-mini-btn" data-act="split" title="Tách nhóm thành các bước riêng">⊖</button>` : ''}
          <button class="mn-mini-btn" data-act="up" title="Đưa lên trước" ${rawIdx === 0 ? 'disabled style="opacity:.3"' : ''}>↑</button>
          <button class="mn-mini-btn" data-act="down" title="Đưa xuống sau" ${rawIdx === r.steps.length - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
          <button class="mn-mini-btn ${isEnabled ? '' : 'on'}" data-act="toggle" title="${isEnabled ? 'Bỏ qua bước này' : 'Bật lại bước này'}">${isEnabled ? '👁' : '✕'}</button>
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
          persistScript(b, false);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'temphide') {
          st.tempHide = !st.tempHide;
          persistScript(b, false);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'rev') {
          st.rev = !st.rev;
          persistScript(b, false);
          if (isEnabled) window.MinNoteGeoReplay.playSingleStep(myActiveIdx);
          else renderReplayUI();
        } else if (act === 'up' && rawIdx > 0) {
          [r.steps[rawIdx - 1], r.steps[rawIdx]] = [r.steps[rawIdx], r.steps[rawIdx - 1]];
          persistScript(b, false); b.redraw(); renderReplayUI();
        } else if (act === 'down' && rawIdx < r.steps.length - 1) {
          [r.steps[rawIdx + 1], r.steps[rawIdx]] = [r.steps[rawIdx], r.steps[rawIdx + 1]];
          persistScript(b, false); b.redraw(); renderReplayUI();
        } else if (act === 'toggle') {
          st.enabled = st.enabled === false;
          persistScript(b, false); b.redraw(); renderReplayUI();
        } else if (act === 'merge' && rawIdx > 0) {
          const prev = r.steps[rawIdx - 1];
          const pItems = prev.items && prev.items.length ? prev.items : [{ kind: prev.kind, refId: prev.refId, rev: !!prev.rev }];
          const cItems = st.items && st.items.length ? st.items : [{ kind: st.kind, refId: st.refId, rev: !!st.rev }];
          r.steps[rawIdx - 1] = { id: prev.id, kind: 'group', items: [...pItems, ...cItems], enabled: prev.enabled !== false };
          r.steps.splice(rawIdx, 1);
          persistScript(b, false); b.redraw(); renderReplayUI();
        } else if (act === 'split' && isGroup) {
          const expanded = st.items.map((it, k) => ({ id: `${st.id}_${k}`, kind: it.kind, refId: it.refId, rev: !!it.rev, enabled: true }));
          r.steps.splice(rawIdx, 1, ...expanded);
          persistScript(b, false); b.redraw(); renderReplayUI();
        }
      });

      listEl.appendChild(row);
    });
    listEl.scrollTop = prevScroll;
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

      const saved = loadSavedScript(pg);
      const steps = reconcileSavedScript(pg.geo, saved, scopeShapes, scopePoints);

      replayCollapsed = false;
      b.setReplay({
        active: true,
        page: pageIdx,
        playing: false,
        stepIdx: 0,
        stepProgress: 0,
        speed: 1,
        pauseBetween: false,
        scopeShapes,
        scopePoints,
        scopeKey,
        steps
      });
      renderReplayUI();
    },
    close() {
      const b = getBoard();
      if (b) b.stopReplay();
      renderReplayUI();
    },
    save() {
      const b = getBoard();
      return persistScript(b, true);
    },
    addHiddenLines() {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
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
        r.steps.push({ id: 'st_h_' + sh.id, kind: 'shape', refId: sh.id, rev: false, tempHide: true, includeHidden: true, enabled: true });
        added++;
      }
      if (added > 0) {
        persistScript(b, true);
        b.redraw();
        renderReplayUI();
      }
    },
    reset() {
      const b = getBoard();
      if (!b || !b.replay) return;
      b.replay.playing = false;
      b.replay.stepIdx = 0;
      b.replay.stepProgress = 0;
      b.setReplay(b.replay);
    },
    togglePlay() {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
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
      b.setReplay(r);
    },
    nextStep() {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
      const activeSteps = r.steps.filter(s => s.enabled !== false);
      if (!activeSteps.length) return;
      if (r.stepProgress >= 1 && r.stepIdx < activeSteps.length - 1) {
        r.stepIdx++;
      }
      r.stepProgress = 0;
      r.stopAfterStep = true;
      r.playing = true;
      b.setReplay(r);
    },
    prevStep() {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
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
      b.setReplay(r);
    },
    jumpTo(completedCount, instant = true) {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
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
      b.setReplay(r);
    },
    playSingleStep(activeIdx) {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
      r.stepIdx = Math.max(0, activeIdx);
      r.stepProgress = 0;
      r.stopAfterStep = true;
      r.playing = true;
      b.setReplay(r);
    },
    setSpeed(v) {
      const b = getBoard();
      if (!b || !b.replay) return;
      b.replay.speed = Math.max(0.2, Math.min(4, Number(v) || 1));
      renderReplayUI();
    },
    applyPreset(mode) {
      const b = getBoard();
      if (!b || !b.replay) return;
      const r = b.replay;
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
      persistScript(b, false);
      b.setReplay(r);
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
    // Also ensure we never overlap a floating toolbar inside .float-layer
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
