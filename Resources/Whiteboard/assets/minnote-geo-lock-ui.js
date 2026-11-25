/**
 * MinNote v0.0.9.14 — Ổ khóa di chuyển điểm (cha–con)
 *  - Chọn (click) điểm ⇒ thanh công cụ tạm hiện icon ổ khóa 🔒/🔓 (patch JSX trong index-CTbULhps.js → window.__mnMoveLock).
 *  - Rê chuột vào icon ⇒ hiện thông tin: cha hay con, phụ thuộc gì, có khóa/mở được không. Bấm icon ⇒ khóa / mở khóa.
 *  - Điểm con thuần (quay, tổng véc-tơ, trung điểm, giao điểm…) luôn khóa — icon mờ, chỉ hiện thông tin.
 * Lõi thuần (lockInfo, lockDef, unlockDef, planToggle, selectionSummary) test bằng Node: scripts/test_geo_rigidity.js.
 */
(function (root) {
  'use strict';

  // Def types whose motion can be switched on/off. Everything else (rot, sum, mid, inter, foot…) is a pure child.
  const TOGGLABLE = new Set(['free', 'on', 'path', 'onLocus', 'len', 'polar', 'vec']);
  const KIND_TEXT = {
    free: 'điểm cha (tự do)',
    on: 'điểm trên đường',
    path: 'điểm trên đường tròn / đường cong',
    onLocus: 'điểm trên quỹ tích',
    len: 'điểm cách đều (độ dài cố định)',
    polar: 'điểm theo góc / khoảng cách',
    sum: 'tổng véc-tơ (song song & bằng nhau)',
    mid: 'trung điểm',
    foot: 'chân đường vuông góc',
    inter: 'giao điểm',
    rot: 'phép quay',
    bis: 'phân giác',
    ctan: 'tiếp điểm chung',
    p3d: 'điểm 3D'
  };
  const REF_KEYS = ['a', 'b', 'c', 'p', 'o'];
  const MAX_INFO_LINES = 8;

  /** Draggable predicate equal to the patched kernel EN (used when the kernel is not reachable, e.g. Node tests). */
  function isMovable(pt) {
    const d = pt && pt.def;
    if (!d || d.lock || pt.lock) return false;
    if (d.t === 'free') return true;
    if (d.t === 'vec') return d.drag === true && !(d.kParamId || d.kExpr || d.distParamId || d.distExpr || d.distVal != null);
    if (d.t === 'on' || d.t === 'path' || d.t === 'onLocus') return !(d.kParamId || d.kExpr);
    if (d.t === 'len') return !d.lockedAng && !d.angParamId && !d.angExpr;
    if (d.t === 'polar') return !(d.fixedDist && d.fixedAng);
    return false;
  }

  function kindText(def) {
    if (!def) return 'điểm';
    if (def.t === 'vec') return def.perp ? 'đường vuông góc' : 'đường song song';
    return KIND_TEXT[def.t] || def.t;
  }

  function parentIds(def) {
    if (!def) return [];
    const ids = REF_KEYS.map(k => def[k]).filter(v => typeof v === 'string');
    for (const k of ['l1', 'l2', 'pts']) if (Array.isArray(def[k])) ids.push(...def[k].filter(v => typeof v === 'string'));
    return [...new Set(ids)];
  }

  /**
   * @param {object} pt   point {id, label, def}
   * @param {object} pts  all points of the page (id → point) for parent labels
   * @param {(pt:object)=>boolean} [movableFn] kernel EN
   * @returns {{movable:boolean, canToggle:boolean, isChild:boolean, kind:string, parents:string[], text:string}}
   */
  function lockInfo(pt, pts = {}, movableFn = isMovable) {
    const def = pt && pt.def;
    const movable = !!movableFn(pt);
    const canToggle = !!def && TOGGLABLE.has(def.t);
    const isChild = !!def && def.t !== 'free';
    const parents = parentIds(def).map(id => (pts[id] && pts[id].label) || '').filter(Boolean);
    const kind = kindText(def);
    const name = (pt && pt.label) || 'Điểm';
    const of = parents.length ? ` của ${parents.join(', ')}` : '';
    let text;
    if (movable) text = `🔓 ${name}: ${kind}${of} — kéo được`;
    else if (canToggle) text = `🔒 ${name}: ${kind}${of} — đang khóa`;
    else text = `🔒 ${name}: ${kind}${of} — đối tượng con, chỉ đổi khi cha đổi`;
    return { movable, canToggle, isChild, kind, parents, text };
  }

  /** @returns {object} new def that cannot be dragged */
  function lockDef(def) {
    const rest = { ...(def || {}) };
    delete rest.drag;
    return { ...rest, lock: true };
  }

  /** @returns {object} new def that can be dragged (vec slides along its locked direction) */
  function unlockDef(def) {
    const rest = { ...(def || {}) };
    delete rest.lock;
    return rest.t === 'vec' ? { ...rest, drag: true } : rest;
  }

  /**
   * Decide what a toggle on these points does: lock all if any togglable one is movable, else unlock all.
   * @returns {{action:'lock'|'unlock'|null, ids:string[]}}
   */
  function planToggle(ids, pts, movableFn = isMovable) {
    const togglable = ids.filter(id => pts[id] && pts[id].def && TOGGLABLE.has(pts[id].def.t));
    if (!togglable.length) return { action: null, ids: [] };
    const action = togglable.some(id => movableFn(pts[id])) ? 'lock' : 'unlock';
    return { action, ids: togglable };
  }

  function applyToggle(geo, plan) {
    if (!plan.action) return geo;
    const fn = plan.action === 'lock' ? lockDef : unlockDef;
    const set = new Set(plan.ids);
    const points = Object.fromEntries(Object.entries(geo.points).map(([id, p]) => [id, set.has(id) ? { ...p, def: fn(p.def) } : p]));
    return { ...geo, points };
  }

  /**
   * What the toolbar lock icon shows for the selected points.
   * Icon = current state (🔓 if any selected point is draggable, else 🔒); hint = what a click does.
   * @returns {{visible:boolean, canToggle:boolean, icon:string, hint:string, lines:string[]}}
   */
  function selectionSummary(ids, pts, movableFn = isMovable) {
    const sel = ids.filter(id => pts[id] && pts[id].def);
    if (!sel.length) return { visible: false, canToggle: false, icon: '', hint: '', lines: [] };
    const infos = sel.map(id => lockInfo(pts[id], pts, movableFn));
    const plan = planToggle(sel, pts, movableFn);
    const icon = infos.some(i => i.movable) ? '🔓' : '🔒';
    const hint = plan.action === 'lock' ? 'Bấm ổ khóa ⇒ KHÓA di chuyển'
      : (plan.action === 'unlock' ? 'Bấm ổ khóa ⇒ MỞ KHÓA di chuyển' : 'Đối tượng con: chỉ thay đổi khi kéo điểm cha');
    const lines = infos.slice(0, MAX_INFO_LINES).map(i => i.text);
    if (infos.length > MAX_INFO_LINES) lines.push(`… và ${infos.length - MAX_INFO_LINES} điểm khác`);
    return { visible: true, canToggle: !!plan.action, icon, hint, lines };
  }

  /* ------------------------------- Browser wiring ------------------------------- */

  const getBoard = () => root.__minnoteBoard || (root.__meaBoardRef && root.__meaBoardRef.current) || null;
  const getKernel = () => root.__mnGeoKernel || null;
  const movableOf = () => {
    const K = getKernel();
    return K && typeof K.EN === 'function' ? K.EN : isMovable;
  };

  function commitToggle(board, pageIdx, plan) {
    if (!plan.action) return false;
    board.commit(board.updatePage(pageIdx, pg => ({ ...pg, geo: applyToggle(pg.geo, plan) })));
    board.redraw();
    board.emit();
    return true;
  }

  const selectedIdsAndPts = (board) => {
    const sel = board && board.sel;
    if (!sel || !sel.points || !sel.points.size) return null;
    const page = board.doc.pages[sel.page];
    return page && page.geo ? { ids: [...sel.points], pts: page.geo.points, pageIdx: sel.page } : null;
  };
  const summaryOf = (board) => {
    const s = selectedIdsAndPts(board);
    return s ? selectionSummary(s.ids, s.pts, movableOf()) : selectionSummary([], {});
  };

  let infoEl = null;
  function ensureInfoEl() {
    if (infoEl || typeof document === 'undefined') return infoEl;
    infoEl = document.createElement('div');
    infoEl.id = 'mn-geo-lock-info';
    infoEl.setAttribute('role', 'tooltip');
    infoEl.style.cssText = [
      'position:fixed', 'z-index:99990', 'display:none', 'flex-direction:column', 'gap:3px', 'max-width:360px',
      'padding:8px 11px', 'border-radius:10px', 'font:500 12px/1.4 system-ui,sans-serif',
      'background:rgba(15,23,42,.94)', 'color:#f8fafc', 'box-shadow:0 6px 18px rgba(15,23,42,.28)',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(infoEl);
    // The toolbar button unmounts when the selection changes (no mouseleave) ⇒ hide on any outside press / scroll.
    const hideUnlessOnButton = (e) => {
      const t = e.target;
      if (!(t && t.closest && t.closest('.mn-move-lock-btn'))) infoEl.style.display = 'none';
    };
    document.addEventListener('pointerdown', hideUnlessOnButton, true);
    document.addEventListener('wheel', () => { infoEl.style.display = 'none'; }, { passive: true, capture: true });
    return infoEl;
  }

  function renderInfo(board, anchor) {
    const el = ensureInfoEl();
    if (!el || !anchor) return;
    const s = summaryOf(board);
    if (!s.visible) { el.style.display = 'none'; return; }
    el.replaceChildren(...[...s.lines, s.hint].map((txt, i, arr) => {
      const row = document.createElement('div');
      row.textContent = txt;
      if (i === arr.length - 1) row.style.cssText = 'margin-top:3px;opacity:.75;font-weight:600';
      return row;
    }));
    const r = anchor.getBoundingClientRect();
    el.style.display = 'flex';
    const w = el.offsetWidth;
    el.style.left = `${Math.max(6, Math.min(window.innerWidth - w - 6, Math.round(r.left + r.width / 2 - w / 2)))}px`;
    el.style.top = `${Math.round(r.bottom + 8)}px`;
  }

  // Toolbar API (called from the patched bundle JSX of the floating selection bar).
  const moveLockApi = {
    visible: (board) => summaryOf(board).visible,
    icon: (board) => summaryOf(board).icon,
    style: (board) => (summaryOf(board).canToggle ? { fontSize: '15px' } : { fontSize: '15px', opacity: 0.55, cursor: 'default' }),
    showInfo: (board, anchor) => renderInfo(board, anchor),
    hideInfo: () => { if (infoEl) infoEl.style.display = 'none'; },
    toggleSelection: (board, anchor) => {
      const b = board || getBoard();
      const s = selectedIdsAndPts(b);
      if (!s) return false;
      const done = commitToggle(b, s.pageIdx, planToggle(s.ids, s.pts, movableOf()));
      if (done && anchor) setTimeout(() => renderInfo(b, anchor), 0);
      return done;
    }
  };

  const api = { isMovable, lockInfo, lockDef, unlockDef, planToggle, applyToggle, selectionSummary, TOGGLABLE };
  root.MinNoteGeoLock = api;
  root.__mnMoveLock = moveLockApi;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
