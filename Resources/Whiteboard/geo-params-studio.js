/* MinNote GSP5 Parametric Geometry & Constraints Studio
 * Provides:
 * - GSP5-style "Tham số mới" (New Parameter) modal with None / Angle (°) / Distance (cm) units & formulas
 * - Floating collapsible Parameter & Constraints Studio (#mn-param-panel)
 * - True mathematical locking for lengths, radii, angles, ratios (dragging CANNOT break constraints)
 * - Live 2D & 3D Parametric Shape Builders (compatible with Xoay 3D, Tách mặt phẳng, Tách thiết diện, Tự động nét đứt)
 */
(function () {
  "use strict";
  if (window.MinNoteGeoParams) return;

  const STATE = {
    open: false,
    tab: "params", // "params" | "constraints" | "build"
    buildDim: "2d", // "2d" | "3d"
    buildKind2d: "segment",
    buildKind3d: "pyramid4",
    editingParamId: null,
    showLabels: true,
    rafId: null,
    lastAnimTs: 0,
    sliderUndoSaved: false,
    panelPos: null,
    selKey: "",
    builderVals: {
      a: "4",
      b: "3",
      c: "3.5",
      h: "5",
      r: "2.5",
      ang: "60",
      segAng: "0",
      lockSegAng: false,
      rightBase: true,
      autoCreateParams: true
    }
  };

  function getEditor() {
    return window.__noteRendererEditor || null;
  }

  function getKernel() {
    return window.__mnGeoKernel || null;
  }

  function currentPageIndex() {
    const ed = getEditor();
    if (!ed) return 0;
    if (ed.sel && typeof ed.sel.page === "number") return ed.sel.page;
    if (typeof ed.currentPage === "function") return ed.currentPage() || 0;
    return 0;
  }

  function getPage(idx) {
    const ed = getEditor();
    if (!ed || !ed.doc || !ed.doc.pages) return null;
    const pIdx = idx !== undefined ? idx : currentPageIndex();
    return ed.doc.pages[pIdx] || ed.doc.pages[0] || null;
  }

  function getParams(idx) {
    const pg = getPage(idx);
    if (!pg || !pg.geo) return [];
    return Array.isArray(pg.geo.params) ? pg.geo.params : [];
  }

  function getCmPx() {
    const ed = getEditor();
    if (ed && typeof ed.cm === "function") {
      const c = ed.cm();
      if (Number.isFinite(c) && c > 1) return c;
    }
    return 150 / 2.54;
  }

  function evalParamValue(geo, p) {
    const K = getKernel();
    if (!p) return 0;
    if (K && typeof K._mnGeoVal === "function") {
      return K._mnGeoVal(geo, p.id, p.expr, p.value);
    }
    return Number(p.value) || 0;
  }

  function evalExprOnGeo(geo, expr, fallback) {
    const K = getKernel();
    if (K && typeof K._mnGeoVal === "function") {
      return K._mnGeoVal(geo, null, expr, fallback);
    }
    const n = Number(String(expr || "").replace(",", "."));
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function fmtNum(v, digits = 2) {
    if (!Number.isFinite(v)) return "0";
    const r = Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits);
    return String(r).replace(".", ",");
  }

  function unitSuffix(unit) {
    if (unit === "dist") return " cm";
    if (unit === "angle") return "°";
    return "";
  }

  function unitLabel(unit) {
    if (unit === "dist") return "cm";
    if (unit === "angle") return "độ";
    return "số";
  }

  function makeId(prefix) {
    const K = getKernel();
    if (K && typeof K.nt === "function") return prefix ? `${prefix}_${K.nt()}` : K.nt();
    return (prefix || "p") + "_" + Math.random().toString(36).slice(2, 9);
  }

  function nextDefaultParamName(params) {
    const used = new Set(params.map(p => p.name));
    for (let i = 1; i < 100; i++) {
      const cand = `t[${i}]`;
      if (!used.has(cand)) return cand;
    }
    return `t[${params.length + 1}]`;
  }

  function showToast(msg) {
    const ed = getEditor();
    if (ed && ed.cb && typeof ed.cb.toast === "function") {
      ed.cb.toast(msg);
      return;
    }
    if (typeof window.showToast === "function") {
      window.showToast(msg);
    }
  }

  // Re-run 3D auto-dash for any solid on the page whose vertices updated
  function refreshSolidsOnGeo(geo) {
    const K = getKernel();
    if (!K || !geo || !Array.isArray(geo.shapes)) return geo;
    let out = geo;
    for (const sh of out.shapes) {
      if (sh.kind === "solid" && sh.solid && sh.solid.faces) {
        try {
          out = K.mee(out, sh);
        } catch (_) {}
      }
    }
    return out;
  }

  function mutateGeo(pageIdx, fn, opts = {}) {
    const ed = getEditor();
    if (!ed) return false;
    const pIdx = pageIdx !== undefined ? pageIdx : currentPageIndex();
    const cmPx = getCmPx();
    const nextDoc = ed.updatePage(pIdx, pg => {
      const baseGeo = { ...pg.geo, cmPx };
      let nextGeo = fn(baseGeo, pg);
      if (!nextGeo) return pg;
      nextGeo = { ...nextGeo, cmPx };
      if (opts.refreshSolids) nextGeo = refreshSolidsOnGeo(nextGeo);
      return { ...pg, geo: nextGeo };
    });
    if (opts.live) {
      ed.doc = nextDoc;
      if (ed.cache && ed.cache.clear) ed.cache.clear();
      ed.redraw();
      if (opts.emit) ed.emit();
    } else {
      ed.commit(nextDoc);
      ed.redraw();
      ed.emit();
    }
    return true;
  }

  function countParamBindings(geo, paramId) {
    if (!geo || !geo.points) return 0;
    let count = 0;
    const p = (geo.params || []).find(x => x.id === paramId);
    const name = p ? p.name : "";
    for (const pt of Object.values(geo.points)) {
      const d = pt && pt.def;
      if (!d) continue;
      if (
        d.paramId === paramId ||
        d.distParamId === paramId ||
        d.angParamId === paramId ||
        d.kParamId === paramId ||
        d.xParamId === paramId ||
        d.yParamId === paramId ||
        d.zParamId === paramId
      ) {
        count++;
        continue;
      }
      if (name) {
        const exprs = [d.expr, d.distExpr, d.angExpr, d.kExpr, d.vx, d.vy, d.vz].filter(Boolean);
        if (exprs.some(ex => String(ex).includes(name))) count++;
      }
    }
    return count;
  }

  // Cycle check: does `targetId` depend on `nodeId`?
  function dependsOn(geo, targetId, nodeId) {
    const K = getKernel();
    if (!K || !geo || !geo.points) return false;
    const seen = new Set();
    const stack = [targetId];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === nodeId) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const pt = geo.points[cur];
      if (!pt || !pt.def) continue;
      for (const dep of K.Om(pt.def)) {
        if (dep) stack.push(dep);
      }
    }
    return false;
  }

  function ptName(geo, id) {
    const pt = geo && geo.points && geo.points[id];
    return (pt && pt.label) || id.slice(0, 4);
  }

  // Detect what constraint targets are currently selected on the whiteboard
  function detectSelectionTargets() {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !ed.sel || !K) return { pageIdx: currentPageIndex(), length: null, angle: null, ratio: null };
    const pageIdx = ed.sel.page;
    const pg = getPage(pageIdx);
    if (!pg || !pg.geo) return { pageIdx, length: null, angle: null, ratio: null };
    const geo = pg.geo;
    const coords = K.Tt(geo);
    const cm = getCmPx();

    // 1. Length / Radius target
    let length = null;
    if (typeof ed.lengthTarget === "function") {
      const lt = ed.lengthTarget();
      if (lt) {
        const pFrom = coords.get(lt.from);
        const pTo = coords.get(lt.to);
        const curCm = pFrom && pTo ? K.Je(pFrom, pTo) / cm : 2;
        const ptTo = geo.points[lt.to];
        const d = ptTo && ptTo.def;
        length = {
          pageIdx,
          from: lt.from,
          to: lt.to,
          radius: !!lt.radius,
          locked: !!lt.locked,
          curCm,
          def: d,
          paramId: d ? (d.t === "len" ? d.paramId : d.distParamId) || "" : "",
          expr: d ? (d.t === "len" ? d.expr : d.distExpr) || "" : "",
          lockedAng: !!(d && d.t === "len" && (d.lockedAng || d.angParamId || d.angExpr)),
          label: `${lt.radius ? "Bán kính" : "Đoạn"} ${ptName(geo, lt.from)}${ptName(geo, lt.to)}`
        };
      }
    }

    // 2. Angle target (selected angle shape, OR 2 segments sharing a vertex, OR 3 selected points)
    let angle = null;
    const selShapes = geo.shapes.filter(s => ed.sel.shapes.has(s.id));
    const selAngleShape = selShapes.find(s => s.kind === "angle" || s.kind === "right");
    let tri = null; // [A, O, B]
    if (selAngleShape && selAngleShape.pts.length >= 3) {
      tri = [selAngleShape.pts[0], selAngleShape.pts[1], selAngleShape.pts[2]];
    } else {
      const segs = selShapes.filter(s => s.kind === "segment" && s.pts.length === 2);
      if (segs.length === 2) {
        const [a1, b1] = segs[0].pts;
        const [a2, b2] = segs[1].pts;
        if (a1 === a2) tri = [b1, a1, b2];
        else if (a1 === b2) tri = [b1, a1, a2];
        else if (b1 === a2) tri = [a1, b1, b2];
        else if (b1 === b2) tri = [a1, b1, a2];
      } else if (ed.sel.points.size === 3) {
        const arr = [...ed.sel.points];
        // Prefer a point that is polar-defined as B, or whose o is in arr
        const polarPt = arr.find(id => geo.points[id] && geo.points[id].def && geo.points[id].def.t === "polar" && arr.includes(geo.points[id].def.o) && arr.includes(geo.points[id].def.ref));
        if (polarPt) {
          const d = geo.points[polarPt].def;
          tri = [d.ref, d.o, polarPt];
        } else {
          // Check if any point is connected by segments to the other two
          let vertex = arr[1];
          for (const cand of arr) {
            const others = arr.filter(x => x !== cand);
            const hits = others.filter(o => geo.shapes.some(sh => sh.kind === "segment" && sh.pts.includes(cand) && sh.pts.includes(o)));
            if (hits.length === 2) { vertex = cand; break; }
          }
          const others = arr.filter(x => x !== vertex);
          tri = [others[0], vertex, others[1]];
        }
      }
    }

    if (tri) {
      let [A, O, B] = tri;
      // If A is polar around (O, B), flip so B is the constrained arm
      const pA = geo.points[A], pB = geo.points[B];
      if (pA && pA.def && pA.def.t === "polar" && pA.def.o === O && pA.def.ref === B) {
        [A, B] = [B, A];
      } else if (dependsOn(geo, O, B) || dependsOn(geo, A, B)) {
        if (!dependsOn(geo, O, A) && !dependsOn(geo, B, A)) {
          [A, B] = [B, A];
        }
      }
      const cA = coords.get(A), cO = coords.get(O), cB = coords.get(B);
      if (cA && cO && cB) {
        const base = Math.atan2(cA.y - cO.y, cA.x - cO.x);
        const cur = Math.atan2(cB.y - cO.y, cB.x - cO.x);
        let deg = ((base - cur) * 180 / Math.PI) % 360;
        if (deg < 0) deg += 360;
        const ptB = geo.points[B];
        const dB = ptB && ptB.def;
        const isPolar = !!(dB && dB.t === "polar" && dB.o === O && dB.ref === A);
        angle = {
          pageIdx,
          A, O, B,
          deg: isPolar && dB.fixedAng ? evalExprOnGeo(geo, dB.angParamId ? (getParams(pageIdx).find(p => p.id === dB.angParamId)?.name || dB.angVal) : (dB.angExpr || dB.angVal), deg) : deg,
          curDeg: deg,
          curDistCm: K.Je(cO, cB) / cm,
          locked: !!(isPolar && dB.fixedAng),
          fixedDist: !!(isPolar && dB.fixedDist),
          angParamId: isPolar ? (dB.angParamId || "") : "",
          angExpr: isPolar ? (dB.angExpr || "") : "",
          distParamId: isPolar ? (dB.distParamId || "") : "",
          distExpr: isPolar ? (dB.distExpr || "") : "",
          label: `∠${ptName(geo, A)}${ptName(geo, O)}${ptName(geo, B)}`
        };
      }
    }

    // 3. Ratio / Transform target (single selected point with def.t === 'on' | 'vec' | 'rot')
    let ratio = null;
    if (ed.sel.points.size === 1) {
      const id = [...ed.sel.points][0];
      const pt = geo.points[id];
      if (pt && pt.def && (pt.def.t === "on" || pt.def.t === "vec" || pt.def.t === "rot")) {
        ratio = {
          pageIdx,
          id,
          label: ptName(geo, id),
          def: pt.def
        };
      }
    }

    return { pageIdx, length, angle, ratio };
  }

  // ==================== CONSTRAINT ACTIONS ====================

  function applyLengthConstraint({ pageIdx, from, to, val, paramId, expr, lockedAng }) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return;
    if (dependsOn(pg.geo, from, to)) {
      showToast("Không thể khóa: điểm gốc phụ thuộc vào điểm cuối.");
      return;
    }
    const coords = K.Tt(pg.geo);
    const pFrom = coords.get(from), pTo = coords.get(to);
    if (!pFrom || !pTo) return;
    const ptTo = pg.geo.points[to];
    if (!ptTo) return;
    const cm = getCmPx();

    mutateGeo(pageIdx, geo => {
      let nextDef;
      if (ptTo.def && ptTo.def.t === "polar" && ptTo.def.o === from) {
        nextDef = {
          ...ptTo.def,
          fixedDist: true,
          distVal: paramId || expr ? undefined : Number(val),
          distParamId: paramId || undefined,
          distExpr: !paramId && expr ? String(expr).trim() : undefined
        };
      } else {
        const ang = Math.atan2(pTo.y - pFrom.y, pTo.x - pFrom.x);
        nextDef = {
          t: "len",
          a: from,
          ang,
          val: paramId || expr ? undefined : Number(val),
          paramId: paramId || undefined,
          expr: !paramId && expr ? String(expr).trim() : undefined,
          lockedAng: !!lockedAng
        };
      }
      return {
        ...geo,
        cmPx: cm,
        points: {
          ...geo.points,
          [to]: { ...geo.points[to], def: nextDef }
        }
      };
    }, { refreshSolids: true });

    showToast("Đã khóa cố định độ dài!");
    renderPanel();
  }

  function unlockPoint(pageIdx, pointId, mode = "all") {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return;
    const coords = K.Tt(pg.geo);
    const pos = coords.get(pointId);
    const pt = pg.geo.points[pointId];
    if (!pt || !pos) return;

    mutateGeo(pageIdx, geo => {
      let nd = { t: "free", x: pos.x, y: pos.y };
      if (mode === "angle" && pt.def.t === "polar" && pt.def.fixedDist) {
        const O = coords.get(pt.def.o);
        nd = {
          t: "len",
          a: pt.def.o,
          ang: O ? Math.atan2(pos.y - O.y, pos.x - O.x) : 0,
          val: pt.def.distVal,
          paramId: pt.def.distParamId,
          expr: pt.def.distExpr,
          lockedAng: false
        };
      } else if (mode === "dist" && pt.def.t === "polar" && pt.def.fixedAng) {
        const O = coords.get(pt.def.o);
        nd = {
          ...pt.def,
          fixedDist: false,
          distVal: undefined,
          distParamId: undefined,
          distExpr: undefined,
          curDistPx: O ? K.Je(O, pos) : 120
        };
      } else if (pt.def.t === "on" || pt.def.t === "vec" || pt.def.t === "rot") {
        nd = { ...pt.def };
        delete nd.kParamId; delete nd.kExpr; delete nd.angParamId; delete nd.angExpr; delete nd.distParamId; delete nd.distExpr; delete nd.distVal;
      }
      return {
        ...geo,
        points: { ...geo.points, [pointId]: { ...geo.points[pointId], def: nd } }
      };
    }, { refreshSolids: true });

    showToast("Đã mở khóa ràng buộc.");
    renderPanel();
  }

  function applyAngleConstraint({ pageIdx, A, O, B, angVal, angParamId, angExpr, lockDist, distVal, distParamId, distExpr, addMark }) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return;
    if (dependsOn(pg.geo, O, B) || dependsOn(pg.geo, A, B)) {
      showToast("Không thể khóa góc: điểm bị phụ thuộc vòng lặp.");
      return;
    }
    const coords = K.Tt(pg.geo);
    const cO = coords.get(O), cB = coords.get(B);
    if (!cO || !cB) return;
    const curDistPx = Math.max(20, K.Je(cO, cB));
    const ed = getEditor();

    mutateGeo(pageIdx, geo => {
      const nd = {
        t: "polar",
        o: O,
        ref: A,
        fixedAng: true,
        angVal: angParamId || angExpr ? undefined : Number(angVal),
        angParamId: angParamId || undefined,
        angExpr: !angParamId && angExpr ? String(angExpr).trim() : undefined,
        fixedDist: !!lockDist,
        distVal: lockDist && !distParamId && !distExpr ? Number(distVal) : undefined,
        distParamId: lockDist && distParamId ? distParamId : undefined,
        distExpr: lockDist && !distParamId && distExpr ? String(distExpr).trim() : undefined,
        curDistPx
      };
      let shapes = geo.shapes;
      if (addMark) {
        const hasMark = shapes.some(sh => (sh.kind === "angle" || sh.kind === "right") && sh.pts[1] === O && sh.pts.includes(A) && sh.pts.includes(B));
        if (!hasMark) {
          const degNow = K._mnGeoVal(geo, nd.angParamId, nd.angExpr, nd.angVal ?? 60);
          const isRight = Math.abs(Math.abs(degNow) - 90) < 0.05;
          shapes = [
            ...shapes,
            {
              id: makeId("sh"),
              kind: isRight ? "right" : "angle",
              pts: [A, O, B],
              color: (ed && ed.shapeStyle && ed.shapeStyle.color) || "#1a1a1a",
              width: (ed && ed.shapeStyle && ed.shapeStyle.width) || 2.2
            }
          ];
        }
      }
      return {
        ...geo,
        points: { ...geo.points, [B]: { ...geo.points[B], def: nd } },
        shapes
      };
    }, { refreshSolids: true });

    showToast("Đã khóa cố định góc!");
    renderPanel();
  }

  function applyRatioConstraint({ pageIdx, id, kVal, kParamId, kExpr }) {
    const pg = getPage(pageIdx);
    if (!pg || !pg.geo.points[id]) return;
    mutateGeo(pageIdx, geo => {
      const pt = geo.points[id];
      const nd = {
        ...pt.def,
        k: kParamId || kExpr ? pt.def.k : Number(kVal),
        kParamId: kParamId || undefined,
        kExpr: !kParamId && kExpr ? String(kExpr).trim() : undefined
      };
      return {
        ...geo,
        points: { ...geo.points, [id]: { ...pt, def: nd } }
      };
    }, { refreshSolids: true });
    showToast("Đã gắn tham số tỉ số k!");
    renderPanel();
  }

  // ==================== PARAMETER CRUD ====================

  function upsertParam(pageIdx, paramObj) {
    let savedId = paramObj.id || makeId("pm");
    mutateGeo(pageIdx, geo => {
      const list = Array.isArray(geo.params) ? geo.params.slice() : [];
      const idx = list.findIndex(x => x.id === savedId);
      const item = {
        id: savedId,
        name: String(paramObj.name || "t[1]").trim(),
        value: Number.isFinite(Number(paramObj.value)) ? Number(paramObj.value) : 1,
        unit: paramObj.unit || "none",
        min: Number.isFinite(Number(paramObj.min)) ? Number(paramObj.min) : (paramObj.unit === "angle" ? 5 : paramObj.unit === "dist" ? 0.5 : -5),
        max: Number.isFinite(Number(paramObj.max)) ? Number(paramObj.max) : (paramObj.unit === "angle" ? 175 : paramObj.unit === "dist" ? 12 : 5),
        step: Number.isFinite(Number(paramObj.step)) && Number(paramObj.step) > 0 ? Number(paramObj.step) : (paramObj.unit === "angle" ? 1 : 0.1),
        expr: paramObj.expr ? String(paramObj.expr).trim() : "",
        animating: !!paramObj.animating,
        animDir: paramObj.animDir || 1
      };
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      return { ...geo, params: list };
    }, { refreshSolids: true });
    renderPanel();
    updatePill();
    return savedId;
  }

  function updateParamValueLive(pageIdx, paramId, newVal, commit = false) {
    const ed = getEditor();
    if (!ed) return;
    if (!commit && !STATE.sliderUndoSaved) {
      if (Array.isArray(ed.undoStack)) {
        ed.undoStack.push(ed.doc);
        if (ed.undoStack.length > 60) ed.undoStack.shift();
        if (Array.isArray(ed.redoStack)) ed.redoStack = [];
      }
      STATE.sliderUndoSaved = true;
    }
    mutateGeo(pageIdx, geo => {
      const list = (geo.params || []).map(p => p.id === paramId ? { ...p, value: newVal } : p);
      return { ...geo, params: list };
    }, { live: !commit, emit: commit, refreshSolids: true });
    if (commit) STATE.sliderUndoSaved = false;
  }

  function deleteParam(pageIdx, paramId) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return;
    const p = (pg.geo.params || []).find(x => x.id === paramId);
    const valNow = p ? evalParamValue(pg.geo, p) : 1;

    mutateGeo(pageIdx, geo => {
      // Bake literal values into any points referencing this deleted param so figures don't jump/break
      const pts = { ...geo.points };
      for (const [id, pt] of Object.entries(pts)) {
        const d = pt.def;
        if (!d) continue;
        let nd = null;
        if (d.paramId === paramId) nd = { ...d, paramId: undefined, val: valNow };
        if (d.distParamId === paramId) nd = { ...(nd || d), distParamId: undefined, distVal: valNow };
        if (d.angParamId === paramId) nd = { ...(nd || d), angParamId: undefined, angVal: valNow };
        if (d.kParamId === paramId) nd = { ...(nd || d), kParamId: undefined, k: valNow };
        if (d.xParamId === paramId) nd = { ...(nd || d), xParamId: undefined, vx: valNow };
        if (d.yParamId === paramId) nd = { ...(nd || d), yParamId: undefined, vy: valNow };
        if (d.zParamId === paramId) nd = { ...(nd || d), zParamId: undefined, vz: valNow };
        if (nd) pts[id] = { ...pt, def: nd };
      }
      return {
        ...geo,
        points: pts,
        params: (geo.params || []).filter(x => x.id !== paramId)
      };
    }, { refreshSolids: true });
    renderPanel();
    updatePill();
  }

  // ==================== PARAMETER ANIMATION LOOP ====================

  function ensureAnimLoop() {
    const pg = getPage();
    const anyAnim = pg && pg.geo && Array.isArray(pg.geo.params) && pg.geo.params.some(p => p.animating && !p.expr);
    if (!anyAnim) {
      if (STATE.rafId) {
        cancelAnimationFrame(STATE.rafId);
        STATE.rafId = null;
      }
      updatePill();
      return;
    }
    if (STATE.rafId) return;
    STATE.lastAnimTs = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.06, Math.max(0.004, (now - STATE.lastAnimTs) / 1000));
      STATE.lastAnimTs = now;
      const pIdx = currentPageIndex();
      const page = getPage(pIdx);
      const list = page && page.geo && Array.isArray(page.geo.params) ? page.geo.params : [];
      const active = list.filter(p => p.animating && !p.expr);
      if (!active.length) {
        STATE.rafId = null;
        updatePill();
        return;
      }
      mutateGeo(pIdx, geo => {
        const nextList = (geo.params || []).map(p => {
          if (!p.animating || p.expr) return p;
          const span = Math.max(0.1, (p.max ?? 10) - (p.min ?? 0));
          let dir = p.animDir || 1;
          let nv = (Number(p.value) || 0) + dir * span * 0.22 * dt;
          if (nv >= p.max) { nv = p.max; dir = -1; }
          else if (nv <= p.min) { nv = p.min; dir = 1; }
          nv = Math.round(nv * 1000) / 1000;
          return { ...p, value: nv, animDir: dir };
        });
        return { ...geo, params: nextList };
      }, { live: true, refreshSolids: true });

      // Update live slider & number inputs in DOM without full rebuild
      const panel = document.getElementById("mn-param-panel");
      if (panel && panel.classList.contains("open") && STATE.tab === "params") {
        const curList = getParams(pIdx);
        for (const p of curList) {
          if (!p.animating) continue;
          const sl = panel.querySelector(`input.mnp-slider[data-pid="${p.id}"]`);
          const inp = panel.querySelector(`input.mnp-val-input[data-pid="${p.id}"]`);
          if (sl) sl.value = String(p.value);
          if (inp && document.activeElement !== inp) inp.value = fmtNum(p.value, p.unit === "angle" ? 1 : 2);
        }
      }
      STATE.rafId = requestAnimationFrame(tick);
    };
    STATE.rafId = requestAnimationFrame(tick);
    updatePill();
  }

  function toggleParamAnim(pageIdx, paramId) {
    mutateGeo(pageIdx, geo => {
      const list = (geo.params || []).map(p => p.id === paramId ? { ...p, animating: !p.animating } : p);
      return { ...geo, params: list };
    }, { live: true });
    ensureAnimLoop();
    renderPanel();
  }

  // ==================== 2D & 3D PARAMETRIC BUILDERS ====================

  function getViewportCenterOnPage(pageIdx) {
    const ed = getEditor();
    if (!ed || !ed.scroller) return { x: 420, y: 340 };
    const sc = ed.scroller;
    const z = ed.zoom || 1;
    const top = typeof ed.pageTop === "function" ? ed.pageTop(pageIdx) : 0;
    const cx = (sc.scrollLeft + sc.clientWidth * 0.5) / z;
    const cy = (sc.scrollTop + sc.clientHeight * 0.48) / z - top;
    return {
      x: Math.max(120, Math.min(1100, Number.isFinite(cx) ? cx : 420)),
      y: Math.max(120, Number.isFinite(cy) ? cy : 340)
    };
  }

  // Resolve a builder field (could be a number, existing param name, or expression; optionally auto-creates param)
  function resolveSpec(geo, paramsOut, rawStr, defaultName, unit, autoCreate) {
    const K = getKernel();
    const s = String(rawStr || "").trim();
    const existingByName = paramsOut.find(p => p.name === s);
    if (existingByName) {
      return { paramId: existingByName.id, expr: existingByName.name, val: evalParamValue(geo, existingByName) };
    }
    const numVal = Number(s.replace(",", "."));
    const isPlainNum = s !== "" && Number.isFinite(numVal);
    if (isPlainNum) {
      if (autoCreate) {
        // Find free name starting from defaultName
        let nm = defaultName;
        const used = new Set(paramsOut.map(p => p.name));
        if (used.has(nm)) {
          // If an existing param with same name has same unit, reuse? Better create unique name like a1, a2
          let k = 1;
          while (used.has(`${defaultName}${k}`)) k++;
          nm = `${defaultName}${k}`;
        }
        const pid = makeId("pm");
        const pObj = {
          id: pid,
          name: nm,
          value: numVal,
          unit,
          min: unit === "angle" ? 10 : Math.max(0.5, Math.round(numVal * 0.25 * 10) / 10),
          max: unit === "angle" ? 170 : Math.max(10, Math.round(numVal * 2.5 * 10) / 10),
          step: unit === "angle" ? 1 : 0.1,
          expr: "",
          animating: false,
          animDir: 1
        };
        paramsOut.push(pObj);
        return { paramId: pid, expr: nm, val: numVal };
      }
      return { paramId: undefined, expr: undefined, val: numVal };
    }
    // Expression referencing existing params (e.g. "a*sqrt(2)")
    const evaled = K ? K._mnEvalExpr(s, K._mnBuildParamEnv({ params: paramsOut })) : NaN;
    return {
      paramId: undefined,
      expr: s,
      val: Number.isFinite(evaled) ? evaled : (unit === "angle" ? 60 : 3)
    };
  }

  function buildParametric2D(kind) {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !K) return;
    const pageIdx = currentPageIndex();
    const pg = getPage(pageIdx);
    if (!pg) return;
    const cm = getCmPx();
    const center = getViewportCenterOnPage(pageIdx);
    const v = STATE.builderVals;
    const auto = !!v.autoCreateParams;
    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };
    const group = makeId("grp");

    const paramsOut = Array.isArray(pg.geo.params) ? pg.geo.params.slice() : [];
    const nameGen = K.yc(pg.geo);
    const newPts = [];
    const newShapes = [];

    const addPt = (def, preferredLabel, show = true) => {
      const id = makeId("pt");
      const label = preferredLabel === null ? "" : nameGen(preferredLabel);
      newPts.push({ id, def, label, show: show && preferredLabel !== null, group });
      return id;
    };
    const addSh = (skind, pts, extra = {}) => {
      const id = makeId("sh");
      newShapes.push({ id, kind: skind, pts, color: style.color, width: style.width, group, ...extra });
      return id;
    };

    const specA = resolveSpec(pg.geo, paramsOut, v.a, "a", "dist", auto);
    const specB = (kind !== "segment" && kind !== "circle") ? resolveSpec(pg.geo, paramsOut, v.b, "b", "dist", auto) : null;
    const specC = (kind === "tri_sss") ? resolveSpec(pg.geo, paramsOut, v.c, "c", "dist", auto) : null;
    const specR = (kind === "circle") ? resolveSpec(pg.geo, paramsOut, v.r, "r", "dist", auto) : null;
    const specAng = (kind === "angle" || kind === "tri_sas" || kind === "parallelogram")
      ? resolveSpec(pg.geo, paramsOut, v.ang, "α", "angle", auto)
      : null;

    const lenDef = (anchor, spec, angRad, lockedAng = false) => ({
      t: "len",
      a: anchor,
      ang: angRad,
      val: spec.paramId || spec.expr ? undefined : spec.val,
      paramId: spec.paramId,
      expr: !spec.paramId ? spec.expr : undefined,
      lockedAng
    });

    const polarDef = (O, Ref, angSpec, distSpec, fixedDist = true) => ({
      t: "polar",
      o: O,
      ref: Ref,
      fixedAng: true,
      angVal: angSpec.paramId || angSpec.expr ? undefined : angSpec.val,
      angParamId: angSpec.paramId,
      angExpr: !angSpec.paramId ? angSpec.expr : undefined,
      fixedDist,
      distVal: fixedDist && !distSpec.paramId && !distSpec.expr ? distSpec.val : undefined,
      distParamId: fixedDist ? distSpec.paramId : undefined,
      distExpr: fixedDist && !distSpec.paramId ? distSpec.expr : undefined,
      curDistPx: (distSpec ? distSpec.val : 3) * cm
    });

    if (kind === "segment") {
      const halfPx = (specA.val || 3) * cm * 0.5;
      const deg = Number(String(v.segAng || "0").replace(",", ".")) || 0;
      const rad = -deg * Math.PI / 180;
      const A = addPt({ t: "free", x: center.x - halfPx * Math.cos(rad), y: center.y - halfPx * Math.sin(rad) }, "A");
      const B = addPt(lenDef(A, specA, rad, !!v.lockSegAng), "B");
      addSh("segment", [A, B]);
    } else if (kind === "angle") {
      const O = addPt({ t: "free", x: center.x - (specA.val || 3) * cm * 0.45, y: center.y + 45 }, "O");
      const A = addPt(lenDef(O, specA, 0, false), "A");
      const B = addPt(polarDef(O, A, specAng, specB, true), "B");
      addSh("segment", [O, A]);
      addSh("segment", [O, B]);
      const isRight = Math.abs(Math.abs(specAng.val) - 90) < 0.05;
      addSh(isRight ? "right" : "angle", [A, O, B]);
    } else if (kind === "circle") {
      const O = addPt({ t: "free", x: center.x, y: center.y }, "O");
      const R = addPt(lenDef(O, specR, 0, false), "M");
      addSh("circle", [O, R]);
      addSh("segment", [O, R], { dashed: true, aux: true });
    } else if (kind === "tri_sas") {
      const A = addPt({ t: "free", x: center.x - (specA.val || 4) * cm * 0.5, y: center.y + 60 }, "A");
      const B = addPt(lenDef(A, specA, 0, false), "B");
      const C = addPt(polarDef(A, B, specAng, specB, true), "C");
      addSh("polygon", [A, B, C]);
      const isRight = Math.abs(Math.abs(specAng.val) - 90) < 0.05;
      addSh(isRight ? "right" : "angle", [B, A, C]);
    } else if (kind === "tri_sss") {
      if (specA.val + specB.val <= specC.val || specA.val + specC.val <= specB.val || specB.val + specC.val <= specA.val) {
        showToast("3 cạnh không thỏa bất đẳng thức tam giác (a + b > c)!");
        return;
      }
      const A = addPt({ t: "free", x: center.x - (specA.val || 4) * cm * 0.5, y: center.y + 60 }, "A");
      const B = addPt(lenDef(A, specA, 0, false), "B");
      const rA = addPt(lenDef(A, specB, -Math.PI / 3, true), null, false);
      const rB = addPt(lenDef(B, specC, -2 * Math.PI / 3, true), null, false);
      const C = addPt({ t: "inter", l1: [A, rA], c1: true, l2: [B, rB], c2: true, which: 0 }, "C");
      addSh("polygon", [A, B, C]);
    } else if (kind === "rect") {
      const A = addPt({ t: "free", x: center.x - (specA.val || 4) * cm * 0.5, y: center.y + (specB.val || 3) * cm * 0.5 }, "A");
      const B = addPt(lenDef(A, specA, 0, false), "B");
      const D = addPt(polarDef(A, B, { val: 90 }, specB, true), "D");
      const C = addPt({ t: "sum", a: B, b: D, c: A }, "C");
      addSh("polygon", [A, B, C, D]);
      addSh("right", [B, A, D], { aux: true });
    } else if (kind === "parallelogram") {
      const A = addPt({ t: "free", x: center.x - (specA.val || 4) * cm * 0.55, y: center.y + 60 }, "A");
      const B = addPt(lenDef(A, specA, 0, false), "B");
      const D = addPt(polarDef(A, B, specAng, specB, true), "D");
      const C = addPt({ t: "sum", a: B, b: D, c: A }, "C");
      addSh("polygon", [A, B, C, D]);
      addSh("angle", [B, A, D], { aux: true });
    }

    mutateGeo(pageIdx, geo => {
      const ptsMap = { ...geo.points };
      for (const p of newPts) ptsMap[p.id] = p;
      return {
        ...geo,
        cmPx: cm,
        params: paramsOut,
        points: ptsMap,
        shapes: [...geo.shapes, ...newShapes]
      };
    });

    ed.setTool({ k: "geo", t: "move" });
    ed.selectGeo(pageIdx, newPts.filter(p => p.show).map(p => p.id), newShapes.map(s => s.id));
    showToast("Đã dựng hình 2D chuẩn tham số!");
    renderPanel();
    updatePill();
  }

  function buildParametric3D(kind) {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !K) return;
    const pageIdx = currentPageIndex();
    const pg = getPage(pageIdx);
    if (!pg) return;
    const cm = getCmPx();
    const center = getViewportCenterOnPage(pageIdx);
    const v = STATE.builderVals;
    const auto = !!v.autoCreateParams;
    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };
    const group = makeId("grp");
    const solidId = makeId("sh");

    const paramsOut = Array.isArray(pg.geo.params) ? pg.geo.params.slice() : [];
    const nameGen = K.yc(pg.geo);
    const newPts = [];
    const newShapes = [];

    const specA = (kind !== "cone" && kind !== "cylinder") ? resolveSpec(pg.geo, paramsOut, v.a, "a", "dist", auto) : null;
    const specB = (kind === "pyramid4Right" || kind === "pyramid3" || kind === "box" || kind === "prism3")
      ? resolveSpec(pg.geo, paramsOut, v.b, "b", "dist", auto) : null;
    const specH = resolveSpec(pg.geo, paramsOut, v.h, "h", "dist", auto);
    const specR = (kind === "cone" || kind === "cylinder") ? resolveSpec(pg.geo, paramsOut, v.r, "r", "dist", auto) : null;
    const specAng = (kind === "pyramid3" || kind === "prism3")
      ? resolveSpec(pg.geo, paramsOut, v.ang, "α", "angle", auto) : null;

    const ex = (spec, fallback = "0") => spec ? (spec.expr || String(spec.val)) : fallback;
    const eA = ex(specA, "4");
    const eB = ex(specB, eA);
    const eH = ex(specH, "5");
    const eR = ex(specR, "2.5");
    const eAng = ex(specAng, "60");

    const isRound = kind === "cone" || kind === "cylinder";
    const viewMat = isRound ? K.NS : K.wr;

    // Anchor point O (placed so figure sits nicely centered in viewport)
    const anchorX = center.x - ((specA ? specA.val : (specR ? specR.val * 0.5 : 3)) * cm * 0.55);
    const anchorY = center.y + ((specH ? specH.val : 4) * cm * 0.45);
    const addAnchor = (label) => {
      const id = makeId("pt");
      newPts.push({ id, def: { t: "free", x: anchorX, y: anchorY }, z: 0, label: nameGen(label), show: true, group });
      return id;
    };
    const addP3 = (oId, vx, vy, vz, label, show = true) => {
      const id = makeId("pt");
      newPts.push({
        id,
        def: { t: "p3d", o: oId, solidId, vx: String(vx), vy: String(vy), vz: String(vz), view: viewMat },
        label: label === null ? "" : nameGen(label),
        show: show && label !== null,
        group
      });
      return id;
    };
    const addSeg = (p1, p2, dashed = false, aux = false) => {
      newShapes.push({
        id: makeId("sh"),
        kind: "segment",
        pts: [p1, p2],
        color: style.color,
        width: style.width,
        group,
        ...(dashed ? { dashed: true } : {}),
        ...(aux ? { aux: true } : {})
      });
    };

    let solidShape = null;

    if (kind === "pyramid4" || kind === "pyramid4Right") {
      // Base: B(0,0,0), C(a,0,0), D(a,b,0), A(0,b,0)
      const bExpr = kind === "pyramid4" ? eA : eB;
      const B = addAnchor("B");
      const C = addP3(B, eA, "0", "0", "C");
      const D = addP3(B, eA, bExpr, "0", "D");
      const A = addP3(B, "0", bExpr, "0", "A");
      const S = kind === "pyramid4"
        ? addP3(B, `(${eA})/2`, `(${bExpr})/2`, eH, "S")
        : addP3(B, "0", bExpr, eH, "S");

      addSeg(B, C); addSeg(C, D); addSeg(S, B); addSeg(S, C); addSeg(S, D);
      addSeg(A, B, true); addSeg(A, D, true); addSeg(S, A, true);

      if (kind === "pyramid4") {
        const O = makeId("pt");
        newPts.push({ id: O, def: { t: "mid", a: A, b: C }, label: nameGen("O"), show: true, group });
        addSeg(A, C, true, true);
        addSeg(B, D, true, true);
        addSeg(S, O, true, true);
      } else {
        newShapes.push({ id: makeId("sh"), kind: "right", pts: [S, A, B], color: style.color, width: style.width, group, aux: true });
      }
      solidShape = {
        id: solidId, kind: "solid", pts: [B, C, D, A, S],
        color: style.color, width: style.width, group,
        solid: { of: "pyramid4", view: viewMat, turn: K.Hd, faces: [[0,1,2,3],[4,0,1],[4,1,2],[4,2,3],[4,3,0]] }
      };
      newShapes.push(solidShape);
    } else if (kind === "pyramid3") {
      // Base triangle ABC: B(0,0,0), C(a,0,0), A(b*cos(α), b*sin(α), 0)
      const B = addAnchor("B");
      const C = addP3(B, eA, "0", "0", "C");
      const ax = `(${eB})*cos(${eAng})`;
      const ay = `(${eB})*sin(${eAng})`;
      const A = addP3(B, ax, ay, "0", "A");
      const S = v.rightBase
        ? addP3(B, ax, ay, eH, "S")
        : addP3(B, `((${eA})+(${ax}))/3`, `(${ay})/3`, eH, "S");

      addSeg(B, C); addSeg(B, A); addSeg(C, A, true);
      addSeg(S, B); addSeg(S, C); addSeg(S, A);
      if (v.rightBase) {
        newShapes.push({ id: makeId("sh"), kind: "right", pts: [S, A, B], color: style.color, width: style.width, group, aux: true });
      }
      solidShape = {
        id: solidId, kind: "solid", pts: [B, C, A, S],
        color: style.color, width: style.width, group,
        solid: { of: "pyramid3", view: viewMat, turn: K.Hd, faces: [[0,1,2],[3,0,1],[3,1,2],[3,2,0]] }
      };
      newShapes.push(solidShape);
    } else if (kind === "box") {
      const A = addAnchor("A");
      const B = addP3(A, eA, "0", "0", "B");
      const C = addP3(A, eA, eB, "0", "C");
      const D = addP3(A, "0", eB, "0", "D");
      const A1 = addP3(A, "0", "0", eH, "A'");
      const B1 = addP3(A, eA, "0", eH, "B'");
      const C1 = addP3(A, eA, eB, eH, "C'");
      const D1 = addP3(A, "0", eB, eH, "D'");

      addSeg(A, B); addSeg(B, C); addSeg(C, D, true); addSeg(D, A, true);
      addSeg(A1, B1); addSeg(B1, C1); addSeg(C1, D1); addSeg(D1, A1);
      addSeg(A, A1); addSeg(B, B1); addSeg(C, C1); addSeg(D, D1, true);

      solidShape = {
        id: solidId, kind: "solid", pts: [A, B, C, D, A1, B1, C1, D1],
        color: style.color, width: style.width, group,
        solid: { of: "box", view: viewMat, turn: K.Hd, faces: K.vM }
      };
      newShapes.push(solidShape);
    } else if (kind === "prism3") {
      const B = addAnchor("B");
      const C = addP3(B, eA, "0", "0", "C");
      const ax = `(${eB})*cos(${eAng})`;
      const ay = `(${eB})*sin(${eAng})`;
      const A = addP3(B, ax, ay, "0", "A");
      const B1 = addP3(B, "0", "0", eH, "B'");
      const C1 = addP3(B, eA, "0", eH, "C'");
      const A1 = addP3(B, ax, ay, eH, "A'");

      addSeg(B, C); addSeg(C, A, true); addSeg(A, B);
      addSeg(B1, C1); addSeg(C1, A1); addSeg(A1, B1);
      addSeg(B, B1); addSeg(C, C1); addSeg(A, A1, true);

      solidShape = {
        id: solidId, kind: "solid", pts: [B, C, A, B1, C1, A1],
        color: style.color, width: style.width, group,
        solid: { of: "prism3", view: viewMat, turn: K.Hd, faces: K.DN }
      };
      newShapes.push(solidShape);
    } else if (kind === "cone" || kind === "cylinder") {
      const O = addAnchor("O");
      const R = addP3(O, eR, "0", "0", "R");
      const Top = addP3(O, "0", "0", eH, kind === "cone" ? "S" : "O'");
      newShapes.push({ id: makeId("sh"), kind, pts: [O, R, Top], color: style.color, width: style.width, group });
      addSeg(O, R, true, true);
      addSeg(O, Top, true, true);
      solidShape = {
        id: solidId, kind: "solid", pts: [O, R, Top],
        color: style.color, width: style.width, group,
        solid: { of: kind, view: K.NS, turn: K.Hd }
      };
      newShapes.push(solidShape);
    }

    mutateGeo(pageIdx, geo => {
      const ptsMap = { ...geo.points };
      for (const p of newPts) ptsMap[p.id] = p;
      return {
        ...geo,
        cmPx: cm,
        params: paramsOut,
        points: ptsMap,
        shapes: [...geo.shapes, ...newShapes]
      };
    }, { refreshSolids: true });

    ed.setTool({ k: "geo", t: "move" });
    ed.selectGeo(pageIdx, newPts.filter(p => p.show).map(p => p.id), newShapes.map(s => s.id));
    showToast("Đã dựng hình 3D chuẩn tỉ lệ tham số! Bạn có thể kéo thanh trượt để đổi kích thước hoặc bấm Xoay 3D.");
    renderPanel();
    updatePill();
  }

  // ==================== ON-CANVAS OVERLAY LABELS ====================

  function drawOverlay(ctx, geo, coords) {
    if (!STATE.showLabels || !geo || !geo.points || !coords) return;
    const K = getKernel();
    if (!K) return;
    const params = Array.isArray(geo.params) ? geo.params : [];
    const paramById = new Map(params.map(p => [p.id, p]));
    const cm = K._mnGeoCm(geo);

    const drawTag = (x, y, text) => {
      ctx.save();
      ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      const tw = ctx.measureText(text).width;
      const padX = 6, h = 20, w = tw + padX * 2;
      const rx = x - w / 2, ry = y - h / 2;
      ctx.fillStyle = "rgba(240, 253, 250, 0.92)";
      ctx.strokeStyle = "rgba(13, 148, 136, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 6);
      else ctx.rect(rx, ry, w, h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f766e";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y + 0.5);
      ctx.restore();
    };

    for (const pt of Object.values(geo.points)) {
      if (!pt || pt.hidden || !pt.def) continue;
      const d = pt.def;
      if (d.t === "len") {
        const A = coords.get(d.a), B = coords.get(pt.id);
        if (!A || !B) continue;
        const val = K._mnGeoVal(geo, d.paramId, d.expr, d.val);
        const p = d.paramId ? paramById.get(d.paramId) : null;
        const label = p ? `${p.name} = ${fmtNum(val, 2)} cm` : (d.expr ? `${d.expr} = ${fmtNum(val, 2)} cm` : `${fmtNum(val, 2)} cm 🔒`);
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
        drawTag(mx - (dy / L) * 16, my + (dx / L) * 16, label);
      } else if (d.t === "polar") {
        const O = coords.get(d.o), R = coords.get(d.ref), B = coords.get(pt.id);
        if (!O || !R || !B) continue;
        if (d.fixedDist) {
          const val = K._mnGeoVal(geo, d.distParamId, d.distExpr, d.distVal);
          const p = d.distParamId ? paramById.get(d.distParamId) : null;
          const label = p ? `${p.name} = ${fmtNum(val, 2)} cm` : (d.distExpr ? `${d.distExpr} = ${fmtNum(val, 2)} cm` : `${fmtNum(val, 2)} cm 🔒`);
          const mx = (O.x + B.x) / 2, my = (O.y + B.y) / 2;
          const dx = B.x - O.x, dy = B.y - O.y, L = Math.hypot(dx, dy) || 1;
          drawTag(mx + (dy / L) * 16, my - (dx / L) * 16, label);
        }
        if (d.fixedAng) {
          const deg = K._mnGeoVal(geo, d.angParamId, d.angExpr, d.angVal);
          const p = d.angParamId ? paramById.get(d.angParamId) : null;
          if (p || d.angExpr || Math.abs(deg - 90) > 0.1) {
            const label = p ? `${p.name} = ${fmtNum(deg, 1)}°` : (d.angExpr ? `${d.angExpr} = ${fmtNum(deg, 1)}°` : `${fmtNum(deg, 1)}° 🔒`);
            const base = Math.atan2(R.y - O.y, R.x - O.x);
            const midRad = base - (deg * Math.PI / 180) * 0.5;
            const rOff = Math.min(48, Math.max(26, Math.min(K.Je(O, R), K.Je(O, B)) * 0.35));
            drawTag(O.x + rOff * Math.cos(midRad), O.y + rOff * Math.sin(midRad), label);
          }
        }
      }
    }
    void cm;
  }

  // ==================== UI DOM CONSTRUCTION ====================

  function ensureUI() {
    if (!document.getElementById("mn-param-pill")) {
      const pill = document.createElement("button");
      pill.id = "mn-param-pill";
      pill.type = "button";
      pill.title = "Mở bảng Tham số & Ràng buộc GSP5 (Alt+P)";
      pill.innerHTML = `<span class="mn-pill-dot"></span><span>Tham số (GSP5)</span><span class="mn-pill-badge">0</span>`;
      pill.addEventListener("click", () => togglePanel());
      document.body.appendChild(pill);
    }

    if (!document.getElementById("mn-param-panel")) {
      const panel = document.createElement("div");
      panel.id = "mn-param-panel";
      panel.addEventListener("pointerdown", e => e.stopPropagation());
      panel.innerHTML = `
        <div class="mnp-header" id="mnp-drag-handle">
          <div class="mnp-title-wrap">
            <span class="mnp-title-icon">t₁</span>
            <span class="mnp-title">Tham số GSP5</span>
          </div>
          <div class="mnp-head-actions">
            <button type="button" class="mnp-icon-btn primary" id="mnp-btn-new" title="Tạo tham số mới (GSP5)">+ Mới</button>
            <button type="button" class="mnp-icon-btn on" id="mnp-btn-labels" title="Bật/Tắt nhãn độ dài & góc trên hình">Nhãn</button>
            <button type="button" class="mnp-icon-btn" id="mnp-btn-collapse" title="Thu gọn thành thanh nhỏ">─</button>
            <button type="button" class="mnp-icon-btn" id="mnp-btn-close" title="Đóng bảng">✕</button>
          </div>
        </div>
        <div class="mnp-tabs">
          <button type="button" class="mnp-tab active" data-tab="params">Tham số <span class="mnp-tab-count" id="mnp-cnt-params">0</span></button>
          <button type="button" class="mnp-tab" data-tab="constraints">Ràng buộc <span class="mnp-tab-count" id="mnp-cnt-cons">0</span></button>
          <button type="button" class="mnp-tab" data-tab="build">Dựng 2D/3D</button>
        </div>
        <div class="mnp-body" id="mnp-body"></div>
      `;
      document.body.appendChild(panel);

      panel.querySelector("#mnp-btn-new").addEventListener("click", () => openParamModal(null));
      panel.querySelector("#mnp-btn-labels").addEventListener("click", () => {
        STATE.showLabels = !STATE.showLabels;
        panel.querySelector("#mnp-btn-labels").classList.toggle("on", STATE.showLabels);
        const ed = getEditor();
        if (ed) ed.redraw();
      });
      panel.querySelector("#mnp-btn-collapse").addEventListener("click", () => closePanel());
      panel.querySelector("#mnp-btn-close").addEventListener("click", () => closePanel());

      panel.querySelectorAll(".mnp-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          STATE.tab = btn.dataset.tab;
          renderPanel();
        });
      });

      // Drag panel by header
      const handle = panel.querySelector("#mnp-drag-handle");
      let drag = null;
      handle.addEventListener("pointerdown", e => {
        if (e.target.closest("button")) return;
        const r = panel.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener("pointermove", e => {
        if (!drag) return;
        const nx = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, e.clientX - drag.dx));
        const ny = Math.max(52, Math.min(window.innerHeight - 80, e.clientY - drag.dy));
        panel.style.left = `${nx}px`;
        panel.style.top = `${ny}px`;
        STATE.panelPos = { x: nx, y: ny };
      });
      handle.addEventListener("pointerup", () => { drag = null; });
    }

    if (!document.getElementById("mn-param-modal-backdrop")) {
      const bd = document.createElement("div");
      bd.id = "mn-param-modal-backdrop";
      bd.addEventListener("pointerdown", e => e.stopPropagation());
      bd.innerHTML = `
        <div class="mnp-modal" role="dialog" aria-modal="true">
          <div class="mnp-modal-head">
            <span id="mnp-modal-title">Tham số mới (GSP5)</span>
            <button type="button" class="mnp-icon-btn" id="mnp-modal-x">✕</button>
          </div>
          <div class="mnp-modal-body">
            <div class="mnp-gsp-eq">
              <div class="mnp-field">
                <label>Tên</label>
                <input type="text" class="mnp-input" id="mnp-m-name" placeholder="t[1]" autocomplete="off" spellcheck="false" />
              </div>
              <div class="mnp-gsp-eq-sign">=</div>
              <div class="mnp-field">
                <label>Giá trị / Công thức</label>
                <input type="text" class="mnp-input" id="mnp-m-val" placeholder="1,00 hoặc a*sqrt(2)" autocomplete="off" spellcheck="false" />
              </div>
            </div>
            <div class="mnp-chip-row" id="mnp-name-chips">
              ${["a", "b", "c", "h", "r", "α", "β", "k"].map(ch => `<button type="button" class="mnp-chip" data-nm="${ch}">${ch}</button>`).join("")}
            </div>
            <div class="mnp-preview-val" id="mnp-m-preview" style="display:none"></div>
            <fieldset class="mnp-unit-group">
              <legend>Đơn vị</legend>
              <div class="mnp-radio-row">
                <label class="mnp-radio"><input type="radio" name="mnp-unit" value="none" /> Không</label>
                <label class="mnp-radio"><input type="radio" name="mnp-unit" value="angle" /> Góc (°)</label>
                <label class="mnp-radio"><input type="radio" name="mnp-unit" value="dist" checked /> Khoảng cách (cm)</label>
              </div>
            </fieldset>
            <div class="mnp-row-3">
              <div class="mnp-field">
                <label>Tối thiểu</label>
                <input type="text" class="mnp-input" id="mnp-m-min" value="0.5" />
              </div>
              <div class="mnp-field">
                <label>Tối đa</label>
                <input type="text" class="mnp-input" id="mnp-m-max" value="12" />
              </div>
              <div class="mnp-field">
                <label>Bước</label>
                <input type="text" class="mnp-input" id="mnp-m-step" value="0.1" />
              </div>
            </div>
            <div class="mnp-hint">Mẹo: Có thể nhập biểu thức theo tham số khác như <b>a*sqrt(2)</b>, <b>a/2</b>, <b>180 - 2*α</b>, <b>a*sin(α)</b>.</div>
          </div>
          <div class="mnp-modal-foot">
            <button type="button" class="mnp-btn" id="mnp-modal-cancel">Hủy</button>
            <button type="button" class="mnp-btn primary" id="mnp-modal-ok">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(bd);

      bd.querySelector("#mnp-modal-x").addEventListener("click", closeParamModal);
      bd.querySelector("#mnp-modal-cancel").addEventListener("click", closeParamModal);
      bd.addEventListener("click", e => { if (e.target === bd) closeParamModal(); });

      bd.querySelectorAll("#mnp-name-chips .mnp-chip").forEach(ch => {
        ch.addEventListener("click", () => {
          const nm = ch.dataset.nm;
          const inp = bd.querySelector("#mnp-m-name");
          inp.value = nm;
          if (nm === "α" || nm === "β") setModalUnit("angle");
          else if (nm === "k") setModalUnit("none");
          else setModalUnit("dist");
          updateModalPreview();
        });
      });

      bd.querySelectorAll('input[name="mnp-unit"]').forEach(r => {
        r.addEventListener("change", () => {
          const u = r.value;
          if (!STATE.editingParamId) {
            if (u === "angle") {
              bd.querySelector("#mnp-m-min").value = "5";
              bd.querySelector("#mnp-m-max").value = "175";
              bd.querySelector("#mnp-m-step").value = "1";
              const vInp = bd.querySelector("#mnp-m-val");
              if (vInp.value === "1,00" || vInp.value === "3,00") vInp.value = "60";
            } else if (u === "dist") {
              bd.querySelector("#mnp-m-min").value = "0.5";
              bd.querySelector("#mnp-m-max").value = "12";
              bd.querySelector("#mnp-m-step").value = "0.1";
              const vInp = bd.querySelector("#mnp-m-val");
              if (vInp.value === "1,00" || vInp.value === "60") vInp.value = "3,00";
            } else {
              bd.querySelector("#mnp-m-min").value = "-5";
              bd.querySelector("#mnp-m-max").value = "5";
              bd.querySelector("#mnp-m-step").value = "0.1";
            }
          }
          updateModalPreview();
        });
      });

      bd.querySelector("#mnp-m-val").addEventListener("input", updateModalPreview);
      bd.querySelector("#mnp-modal-ok").addEventListener("click", submitParamModal);
      bd.addEventListener("keydown", e => {
        if (e.key === "Escape") closeParamModal();
        else if (e.key === "Enter") { e.preventDefault(); submitParamModal(); }
      });
    }
  }

  function setModalUnit(unit) {
    const bd = document.getElementById("mn-param-modal-backdrop");
    if (!bd) return;
    const rad = bd.querySelector(`input[name="mnp-unit"][value="${unit}"]`);
    if (rad) {
      rad.checked = true;
      rad.dispatchEvent(new Event("change"));
    }
  }

  function updateModalPreview() {
    const bd = document.getElementById("mn-param-modal-backdrop");
    if (!bd) return;
    const raw = bd.querySelector("#mnp-m-val").value.trim();
    const prev = bd.querySelector("#mnp-m-preview");
    const unit = bd.querySelector('input[name="mnp-unit"]:checked')?.value || "none";
    const num = Number(raw.replace(",", "."));
    if (!raw || Number.isFinite(num)) {
      prev.style.display = "none";
      return;
    }
    const pg = getPage();
    const val = evalExprOnGeo(pg ? pg.geo : { params: [] }, raw, NaN);
    prev.style.display = "block";
    if (Number.isFinite(val)) {
      prev.textContent = `Kết quả công thức ≈ ${fmtNum(val, 3)}${unitSuffix(unit)}`;
      prev.style.color = "#0f766e";
    } else {
      prev.textContent = "Biểu thức chưa hợp lệ hoặc tham số chưa tồn tại";
      prev.style.color = "#dc2626";
    }
  }

  function openParamModal(editId = null, presetUnit = null, presetVal = null) {
    ensureUI();
    const bd = document.getElementById("mn-param-modal-backdrop");
    const params = getParams();
    STATE.editingParamId = editId;
    const existing = editId ? params.find(p => p.id === editId) : null;

    bd.querySelector("#mnp-modal-title").textContent = existing ? `Sửa tham số ${existing.name}` : "Tham số mới (GSP5)";
    const nmInp = bd.querySelector("#mnp-m-name");
    const valInp = bd.querySelector("#mnp-m-val");

    if (existing) {
      nmInp.value = existing.name;
      valInp.value = existing.expr ? existing.expr : fmtNum(existing.value, existing.unit === "angle" ? 1 : 2);
      const rad = bd.querySelector(`input[name="mnp-unit"][value="${existing.unit || "none"}"]`);
      if (rad) rad.checked = true;
      bd.querySelector("#mnp-m-min").value = String(existing.min ?? 0);
      bd.querySelector("#mnp-m-max").value = String(existing.max ?? 10);
      bd.querySelector("#mnp-m-step").value = String(existing.step ?? 0.1);
    } else {
      nmInp.value = nextDefaultParamName(params);
      const u = presetUnit || "dist";
      const rad = bd.querySelector(`input[name="mnp-unit"][value="${u}"]`);
      if (rad) rad.checked = true;
      valInp.value = presetVal != null ? fmtNum(presetVal, u === "angle" ? 1 : 2) : (u === "angle" ? "60" : u === "dist" ? "3,00" : "1,00");
      bd.querySelector("#mnp-m-min").value = u === "angle" ? "5" : u === "dist" ? "0.5" : "-5";
      bd.querySelector("#mnp-m-max").value = u === "angle" ? "175" : u === "dist" ? "12" : "5";
      bd.querySelector("#mnp-m-step").value = u === "angle" ? "1" : "0.1";
    }
    updateModalPreview();
    bd.classList.add("open");
    setTimeout(() => { nmInp.focus(); nmInp.select(); }, 20);
  }

  function closeParamModal() {
    const bd = document.getElementById("mn-param-modal-backdrop");
    if (bd) bd.classList.remove("open");
    STATE.editingParamId = null;
  }

  function submitParamModal() {
    const bd = document.getElementById("mn-param-modal-backdrop");
    if (!bd) return;
    const name = bd.querySelector("#mnp-m-name").value.trim();
    const rawVal = bd.querySelector("#mnp-m-val").value.trim();
    const unit = bd.querySelector('input[name="mnp-unit"]:checked')?.value || "none";
    const min = Number(bd.querySelector("#mnp-m-min").value.replace(",", "."));
    const max = Number(bd.querySelector("#mnp-m-max").value.replace(",", "."));
    const step = Number(bd.querySelector("#mnp-m-step").value.replace(",", "."));

    if (!name || /[\s+\-*/^(),]/.test(name)) {
      showToast("Tên tham số không được chứa khoảng trắng hay dấu phép tính (+, -, *, /).");
      return;
    }

    const numVal = Number(rawVal.replace(",", "."));
    let value = numVal, expr = "";
    if (!Number.isFinite(numVal)) {
      const pg = getPage();
      const ev = evalExprOnGeo(pg ? pg.geo : { params: [] }, rawVal, NaN);
      if (!Number.isFinite(ev)) {
        showToast("Giá trị / công thức không hợp lệ!");
        return;
      }
      value = ev;
      expr = rawVal;
    }

    const pIdx = currentPageIndex();
    upsertParam(pIdx, {
      id: STATE.editingParamId || undefined,
      name,
      value,
      expr,
      unit,
      min: Number.isFinite(min) ? Math.min(min, value) : 0,
      max: Number.isFinite(max) ? Math.max(max, value) : Math.max(10, value * 2),
      step: Number.isFinite(step) && step > 0 ? step : 0.1
    });

    closeParamModal();
    if (!STATE.open) openPanel("params");
    showToast(`Đã lưu tham số ${name} = ${fmtNum(value, unit === "angle" ? 1 : 2)}${unitSuffix(unit)}`);
  }

  // ==================== RENDER PANEL TABS ====================

  function listAllConstraints(pageIdx) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !pg.geo || !K) return [];
    const geo = pg.geo;
    const params = Array.isArray(geo.params) ? geo.params : [];
    const pMap = new Map(params.map(p => [p.id, p]));
    const list = [];

    for (const pt of Object.values(geo.points)) {
      if (!pt || !pt.def) continue;
      const d = pt.def;
      if (d.t === "len") {
        const val = K._mnGeoVal(geo, d.paramId, d.expr, d.val);
        const pm = d.paramId ? pMap.get(d.paramId) : null;
        list.push({
          pointId: pt.id,
          kind: "len",
          title: `Đoạn ${ptName(geo, d.a)}${ptName(geo, pt.id)} = ${pm ? pm.name : (d.expr || fmtNum(val, 2) + " cm")}`,
          sub: `${fmtNum(val, 2)} cm • ${d.lockedAng ? "Khóa cứng cả hướng" : "Khóa độ dài (chỉ xoay được)"}`
        });
      } else if (d.t === "polar") {
        const parts = [];
        if (d.fixedAng) {
          const deg = K._mnGeoVal(geo, d.angParamId, d.angExpr, d.angVal);
          const pm = d.angParamId ? pMap.get(d.angParamId) : null;
          parts.push(`∠${ptName(geo, d.ref)}${ptName(geo, d.o)}${ptName(geo, pt.id)} = ${pm ? `${pm.name} (${fmtNum(deg, 1)}°)` : `${fmtNum(deg, 1)}°`}`);
        }
        if (d.fixedDist) {
          const dist = K._mnGeoVal(geo, d.distParamId, d.distExpr, d.distVal);
          const pm = d.distParamId ? pMap.get(d.distParamId) : null;
          parts.push(`${ptName(geo, d.o)}${ptName(geo, pt.id)} = ${pm ? `${pm.name} (${fmtNum(dist, 2)} cm)` : `${fmtNum(dist, 2)} cm`}`);
        }
        if (parts.length) {
          list.push({
            pointId: pt.id,
            kind: "polar",
            title: parts.join(" & "),
            sub: d.fixedAng && d.fixedDist ? "Khóa cứng góc & độ dài" : (d.fixedAng ? "Khóa góc (chỉ trượt dọc tia)" : "Khóa độ dài")
          });
        }
      } else if (d.t === "p3d" && pt.show) {
        list.push({
          pointId: pt.id,
          kind: "p3d",
          title: `Đỉnh 3D ${ptName(geo, pt.id)} (${d.vx}, ${d.vy}, ${d.vz})`,
          sub: `Khóa tỉ lệ 3D theo gốc ${ptName(geo, d.o)}`
        });
      } else if ((d.t === "on" || d.t === "vec" || d.t === "rot") && (d.kParamId || d.kExpr || d.angParamId || d.angExpr)) {
        const pm = pMap.get(d.kParamId || d.angParamId);
        list.push({
          pointId: pt.id,
          kind: d.t,
          title: `Điểm ${ptName(geo, pt.id)} theo ${pm ? pm.name : (d.kExpr || d.angExpr)}`,
          sub: `Ràng buộc ${d.t}`
        });
      }
    }
    return list;
  }

  function renderPanel() {
    const panel = document.getElementById("mn-param-panel");
    if (!panel) return;

    const pIdx = currentPageIndex();
    const pg = getPage(pIdx);
    const geo = pg ? pg.geo : { points: {}, shapes: [], params: [] };
    const params = Array.isArray(geo.params) ? geo.params : [];
    const cons = listAllConstraints(pIdx);

    panel.querySelector("#mnp-cnt-params").textContent = String(params.length);
    panel.querySelector("#mnp-cnt-cons").textContent = String(cons.length);
    panel.querySelectorAll(".mnp-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === STATE.tab));

    const body = panel.querySelector("#mnp-body");
    if (STATE.tab === "params") renderParamsTab(body, pIdx, geo, params);
    else if (STATE.tab === "constraints") renderConstraintsTab(body, pIdx, geo, params, cons);
    else renderBuildTab(body, pIdx, geo, params);
  }

  function renderParamsTab(body, pIdx, geo, params) {
    body.innerHTML = "";
    if (!params.length) {
      const empty = document.createElement("div");
      empty.className = "mnp-empty";
      empty.innerHTML = `
        <div><b>Chưa có tham số nào trên trang này.</b></div>
        <div style="margin-top:4px">Tạo tham số kiểu GSP5 để khóa cố định độ dài, góc hoặc tỉ lệ hình 2D/3D:</div>
        <div class="mnp-chip-row" style="justify-content:center;margin-top:10px">
          <button type="button" class="mnp-chip" data-preset="a">+ a = 4 cm</button>
          <button type="button" class="mnp-chip" data-preset="b">+ b = 3 cm</button>
          <button type="button" class="mnp-chip" data-preset="h">+ h = 5 cm</button>
          <button type="button" class="mnp-chip" data-preset="ang">+ α = 60°</button>
          <button type="button" class="mnp-chip" data-preset="k">+ k = 0,5</button>
        </div>
      `;
      empty.querySelectorAll("[data-preset]").forEach(btn => {
        btn.addEventListener("click", () => {
          const map = {
            a: { name: "a", value: 4, unit: "dist", min: 0.5, max: 12, step: 0.1 },
            b: { name: "b", value: 3, unit: "dist", min: 0.5, max: 12, step: 0.1 },
            h: { name: "h", value: 5, unit: "dist", min: 0.5, max: 14, step: 0.1 },
            ang: { name: "α", value: 60, unit: "angle", min: 5, max: 175, step: 1 },
            k: { name: "k", value: 0.5, unit: "none", min: 0, max: 3, step: 0.05 }
          };
          upsertParam(pIdx, map[btn.dataset.preset]);
        });
      });
      body.appendChild(empty);
      return;
    }

    for (const p of params) {
      const curVal = evalParamValue(geo, p);
      const bindCnt = countParamBindings(geo, p.id);
      const card = document.createElement("div");
      card.className = "mnp-card";
      const isFormula = !!(p.expr && p.expr.trim());

      card.innerHTML = `
        <div class="mnp-card-top">
          <div class="mnp-param-ident">
            <span class="mnp-param-name">${escapeHtml(p.name)}</span>
            <span class="mnp-unit-tag">${unitLabel(p.unit)}</span>
            ${bindCnt ? `<span class="mnp-bind-tag">🔒 ${bindCnt}</span>` : ""}
          </div>
          <div class="mnp-head-actions">
            ${!isFormula ? `<button type="button" class="mnp-icon-btn ${p.animating ? "on" : ""}" data-act="anim" title="Chạy tự động tham số (GSP5)">${p.animating ? "⏸" : "▶"}</button>` : ""}
            <button type="button" class="mnp-icon-btn" data-act="edit" title="Sửa tham số">✎</button>
            <button type="button" class="mnp-icon-btn" data-act="del" title="Xóa tham số">🗑</button>
          </div>
        </div>
        ${isFormula ? `
          <div class="mnp-expr-line">= ${escapeHtml(p.expr)}  ⇒  <b>${fmtNum(curVal, p.unit === "angle" ? 1 : 2)}${unitSuffix(p.unit)}</b></div>
        ` : `
          <div class="mnp-val-row">
            <button type="button" class="mnp-nudge" data-act="dec">−</button>
            <input type="text" class="mnp-val-input" data-pid="${p.id}" value="${fmtNum(curVal, p.unit === "angle" ? 1 : 2)}" />
            <span style="font-size:12px;color:#475569;min-width:22px">${unitSuffix(p.unit).trim()}</span>
            <button type="button" class="mnp-nudge" data-act="inc">+</button>
          </div>
          <div class="mnp-slider-row">
            <span class="mnp-slider-bound">${fmtNum(p.min, 1)}</span>
            <input type="range" class="mnp-slider" data-pid="${p.id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${curVal}" />
            <span class="mnp-slider-bound">${fmtNum(p.max, 1)}</span>
          </div>
        `}
      `;

      const animBtn = card.querySelector('[data-act="anim"]');
      if (animBtn) animBtn.addEventListener("click", () => toggleParamAnim(pIdx, p.id));
      card.querySelector('[data-act="edit"]').addEventListener("click", () => openParamModal(p.id));
      card.querySelector('[data-act="del"]').addEventListener("click", () => deleteParam(pIdx, p.id));

      if (!isFormula) {
        const valInp = card.querySelector(".mnp-val-input");
        const sl = card.querySelector(".mnp-slider");
        const commitVal = (nv) => {
          if (!Number.isFinite(nv)) return;
          if (p.unit === "dist" && nv <= 0.05) nv = 0.05;
          updateParamValueLive(pIdx, p.id, nv, true);
          renderPanel();
        };
        valInp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); valInp.blur(); } });
        valInp.addEventListener("blur", () => {
          const nv = Number(valInp.value.replace(",", "."));
          if (Number.isFinite(nv) && Math.abs(nv - curVal) > 1e-6) commitVal(nv);
        });
        card.querySelector('[data-act="dec"]').addEventListener("click", () => {
          const step = p.unit === "angle" ? 5 : (p.step || 0.5);
          commitVal(Math.round((curVal - step) * 1000) / 1000);
        });
        card.querySelector('[data-act="inc"]').addEventListener("click", () => {
          const step = p.unit === "angle" ? 5 : (p.step || 0.5);
          commitVal(Math.round((curVal + step) * 1000) / 1000);
        });
        sl.addEventListener("input", () => {
          const nv = Number(sl.value);
          valInp.value = fmtNum(nv, p.unit === "angle" ? 1 : 2);
          updateParamValueLive(pIdx, p.id, nv, false);
        });
        sl.addEventListener("change", () => {
          STATE.sliderUndoSaved = false;
          const ed = getEditor();
          if (ed) ed.emit();
        });
      }

      body.appendChild(card);
    }
  }

  function renderConstraintsTab(body, pIdx, geo, params, cons) {
    body.innerHTML = "";
    const targets = detectSelectionTargets();
    const distParams = params.filter(p => p.unit === "dist" || p.unit === "none");
    const angleParams = params.filter(p => p.unit === "angle" || p.unit === "none");
    const scalarParams = params.filter(p => p.unit === "none");

    // 1. Selected length/radius card
    if (targets.length) {
      const L = targets.length;
      const sec = document.createElement("div");
      sec.className = "mnp-section";
      sec.innerHTML = `
        <div class="mnp-section-title">
          <span>🔒 Khóa ${escapeHtml(L.label)}</span>
          <span style="font-weight:600;color:${L.locked ? "#0d9488" : "#64748b"}">${L.locked ? "Đang khóa" : "Tự do"}</span>
        </div>
        <div class="mnp-field">
          <label>Chọn tham số khoảng cách (GSP5)</label>
          <select class="mnp-select" id="mnp-cl-param">
            <option value="">-- Nhập số cố định / công thức bên dưới --</option>
            ${distParams.map(p => `<option value="${p.id}" ${L.paramId === p.id ? "selected" : ""}>${escapeHtml(p.name)} = ${fmtNum(evalParamValue(geo, p), 2)}${unitSuffix(p.unit)}</option>`).join("")}
          </select>
        </div>
        <div class="mnp-field">
          <label>Hoặc nhập số cố định (cm) / biểu thức</label>
          <input type="text" class="mnp-input" id="mnp-cl-val" value="${escapeHtml(L.expr || fmtNum(L.curCm, 2))}" placeholder="VD: 2 hoặc a*sqrt(2)" />
        </div>
        <label class="mnp-check">
          <input type="checkbox" id="mnp-cl-lockang" ${L.lockedAng ? "checked" : ""} />
          Khóa cứng luôn hướng/góc nghiêng (không xoay được)
        </label>
        <div class="mnp-btn-row">
          <button type="button" class="mnp-btn primary" id="mnp-cl-apply">🔒 ${L.locked ? "Cập nhật khóa" : "Khóa độ dài"}</button>
          ${L.locked ? `<button type="button" class="mnp-btn danger" id="mnp-cl-unlock">🔓 Mở khóa</button>` : ""}
        </div>
      `;
      sec.querySelector("#mnp-cl-apply").addEventListener("click", () => {
        const paramId = sec.querySelector("#mnp-cl-param").value;
        const raw = sec.querySelector("#mnp-cl-val").value.trim();
        const lockedAng = sec.querySelector("#mnp-cl-lockang").checked;
        let val = Number(raw.replace(",", "."));
        let expr = "";
        if (!paramId) {
          if (!Number.isFinite(val)) {
            const ev = evalExprOnGeo(geo, raw, NaN);
            if (!Number.isFinite(ev) || ev <= 0) { showToast("Giá trị độ dài không hợp lệ (> 0)!"); return; }
            val = ev; expr = raw;
          } else if (val <= 0) {
            showToast("Độ dài phải lớn hơn 0 cm!"); return;
          }
        }
        applyLengthConstraint({ pageIdx: L.pageIdx, from: L.from, to: L.to, val, paramId, expr, lockedAng });
      });
      const unBtn = sec.querySelector("#mnp-cl-unlock");
      if (unBtn) unBtn.addEventListener("click", () => unlockPoint(L.pageIdx, L.to, "dist"));
      body.appendChild(sec);
    }

    // 2. Selected angle card
    if (targets.angle) {
      const G = targets.angle;
      const sec = document.createElement("div");
      sec.className = "mnp-section";
      sec.innerHTML = `
        <div class="mnp-section-title">
          <span>📐 Khóa góc ${escapeHtml(G.label)}</span>
          <span style="font-weight:600;color:${G.locked ? "#0d9488" : "#64748b"}">${G.locked ? "Đang khóa" : "Tự do"}</span>
        </div>
        <div class="mnp-field">
          <label>Chọn tham số góc (GSP5)</label>
          <select class="mnp-select" id="mnp-ca-param">
            <option value="">-- Nhập số độ cố định / công thức bên dưới --</option>
            ${angleParams.map(p => `<option value="${p.id}" ${G.angParamId === p.id ? "selected" : ""}>${escapeHtml(p.name)} = ${fmtNum(evalParamValue(geo, p), 1)}°</option>`).join("")}
          </select>
        </div>
        <div class="mnp-field">
          <label>Hoặc số đo góc cố định (°)</label>
          <input type="text" class="mnp-input" id="mnp-ca-val" value="${escapeHtml(G.angExpr || fmtNum(G.deg, 1))}" placeholder="VD: 60, 90, 120 hoặc 180-2*α" />
        </div>
        <label class="mnp-check">
          <input type="checkbox" id="mnp-ca-lockd" ${G.fixedDist ? "checked" : ""} />
          Khóa luôn độ dài cạnh ${escapeHtml(ptName(geo, G.O) + ptName(geo, G.B))} (cm)
        </label>
        <div class="mnp-row-2" id="mnp-ca-dist-wrap" style="display:${G.fixedDist ? "grid" : "none"}">
          <select class="mnp-select" id="mnp-ca-dparam">
            <option value="">Số cố định</option>
            ${distParams.map(p => `<option value="${p.id}" ${G.distParamId === p.id ? "selected" : ""}>${escapeHtml(p.name)} (${fmtNum(evalParamValue(geo, p), 2)} cm)</option>`).join("")}
          </select>
          <input type="text" class="mnp-input" id="mnp-ca-dval" value="${escapeHtml(G.distExpr || fmtNum(G.curDistCm, 2))}" placeholder="cm" />
        </div>
        <label class="mnp-check">
          <input type="checkbox" id="mnp-ca-mark" checked />
          Tự động thêm kí hiệu góc
        </label>
        <div class="mnp-btn-row">
          <button type="button" class="mnp-btn primary" id="mnp-ca-apply">🔒 ${G.locked ? "Cập nhật khóa góc" : "Khóa cố định góc"}</button>
          ${G.locked ? `<button type="button" class="mnp-btn danger" id="mnp-ca-unlock">🔓 Mở khóa</button>` : ""}
        </div>
      `;
      const lockDChk = sec.querySelector("#mnp-ca-lockd");
      const distWrap = sec.querySelector("#mnp-ca-dist-wrap");
      lockDChk.addEventListener("change", () => { distWrap.style.display = lockDChk.checked ? "grid" : "none"; });

      sec.querySelector("#mnp-ca-apply").addEventListener("click", () => {
        const angParamId = sec.querySelector("#mnp-ca-param").value;
        const rawAng = sec.querySelector("#mnp-ca-val").value.trim();
        let angVal = Number(rawAng.replace(",", ".")), angExpr = "";
        if (!angParamId) {
          if (!Number.isFinite(angVal)) {
            const ev = evalExprOnGeo(geo, rawAng, NaN);
            if (!Number.isFinite(ev)) { showToast("Số đo góc không hợp lệ!"); return; }
            angVal = ev; angExpr = rawAng;
          }
        }
        const lockDist = lockDChk.checked;
        const distParamId = sec.querySelector("#mnp-ca-dparam").value;
        const rawDist = sec.querySelector("#mnp-ca-dval").value.trim();
        let distVal = Number(rawDist.replace(",", ".")), distExpr = "";
        if (lockDist && !distParamId && !Number.isFinite(distVal)) {
          const ev = evalExprOnGeo(geo, rawDist, NaN);
          if (!Number.isFinite(ev) || ev <= 0) { showToast("Độ dài cạnh không hợp lệ!"); return; }
          distVal = ev; distExpr = rawDist;
        }
        applyAngleConstraint({
          pageIdx: G.pageIdx, A: G.A, O: G.O, B: G.B,
          angVal, angParamId, angExpr,
          lockDist, distVal, distParamId, distExpr,
          addMark: sec.querySelector("#mnp-ca-mark").checked
        });
      });
      const unBtn = sec.querySelector("#mnp-ca-unlock");
      if (unBtn) unBtn.addEventListener("click", () => unlockPoint(G.pageIdx, G.B, "angle"));
      body.appendChild(sec);
    }

    // 3. Selected ratio point card
    if (targets.ratio) {
      const R = targets.ratio;
      const sec = document.createElement("div");
      sec.className = "mnp-section";
      sec.innerHTML = `
        <div class="mnp-section-title"><span>⚡ Ràng buộc tỉ số cho điểm ${escapeHtml(R.label)}</span></div>
        <div class="mnp-field">
          <label>Gắn tham số tỉ số k</label>
          <select class="mnp-select" id="mnp-cr-param">
            <option value="">-- Nhập số k bên dưới --</option>
            ${scalarParams.map(p => `<option value="${p.id}" ${R.def.kParamId === p.id ? "selected" : ""}>${escapeHtml(p.name)} = ${fmtNum(evalParamValue(geo, p), 2)}</option>`).join("")}
          </select>
        </div>
        <div class="mnp-field">
          <label>Giá trị k / công thức</label>
          <input type="text" class="mnp-input" id="mnp-cr-val" value="${escapeHtml(R.def.kExpr || fmtNum(R.def.k ?? 0.5, 2))}" />
        </div>
        <div class="mnp-btn-row">
          <button type="button" class="mnp-btn primary" id="mnp-cr-apply">🔒 Khóa tỉ số k</button>
          <button type="button" class="mnp-btn danger" id="mnp-cr-unlock">🔓 Mở khóa</button>
        </div>
      `;
      sec.querySelector("#mnp-cr-apply").addEventListener("click", () => {
        const kParamId = sec.querySelector("#mnp-cr-param").value;
        const raw = sec.querySelector("#mnp-cr-val").value.trim();
        let kVal = Number(raw.replace(",", ".")), kExpr = "";
        if (!kParamId && !Number.isFinite(kVal)) {
          const ev = evalExprOnGeo(geo, raw, NaN);
          if (!Number.isFinite(ev)) { showToast("Giá trị tỉ số k không hợp lệ!"); return; }
          kVal = ev; kExpr = raw;
        }
        applyRatioConstraint({ pageIdx: R.pageIdx, id: R.id, kVal, kParamId, kExpr });
      });
      sec.querySelector("#mnp-cr-unlock").addEventListener("click", () => unlockPoint(R.pageIdx, R.id, "all"));
      body.appendChild(sec);
    }

    if (!targets.length && !targets.angle && !targets.ratio) {
      const tip = document.createElement("div");
      tip.className = "mnp-empty";
      tip.innerHTML = `
        <b>Chọn hình trên bảng để khóa ràng buộc:</b><br/>
        • Chọn <b>1 đoạn thẳng</b> hoặc <b>đường tròn</b> → Khóa độ dài / bán kính<br/>
        • Chọn <b>2 đoạn chung đỉnh</b>, <b>3 điểm</b> hoặc <b>kí hiệu góc</b> → Khóa số đo góc<br/>
        • Hoặc chuyển sang tab <b>Dựng 2D/3D</b> để dựng ngay hình có sẵn ràng buộc chuẩn!
      `;
      body.appendChild(tip);
    }

    // 4. All active constraints on current page
    const listSec = document.createElement("div");
    listSec.className = "mnp-section";
    listSec.innerHTML = `<div class="mnp-section-title"><span>Danh sách đang khóa trên trang (${cons.length})</span></div>`;
    if (!cons.length) {
      const p = document.createElement("div");
      p.className = "mnp-hint";
      p.textContent = "Chưa có đối tượng nào bị khóa trên trang hiện tại.";
      listSec.appendChild(p);
    } else {
      for (const c of cons) {
        const row = document.createElement("div");
        row.className = "mnp-con-item";
        row.innerHTML = `
          <div class="mnp-con-info">
            <div class="mnp-con-main">🔒 ${escapeHtml(c.title)}</div>
            <div class="mnp-con-sub">${escapeHtml(c.sub)}</div>
          </div>
          <button type="button" class="mnp-icon-btn" title="Mở khóa ràng buộc này">🔓</button>
        `;
        row.querySelector(".mnp-con-info").addEventListener("click", () => {
          const ed = getEditor();
          if (ed) ed.selectGeo(pIdx, [c.pointId], []);
        });
        row.querySelector("button").addEventListener("click", () => unlockPoint(pIdx, c.pointId, "all"));
        listSec.appendChild(row);
      }
    }
    body.appendChild(listSec);
  }

  function renderBuildTab(body, pIdx, geo, params) {
    body.innerHTML = "";
    const v = STATE.builderVals;

    // 2D / 3D Switch
    const seg = document.createElement("div");
    seg.className = "mnp-seg";
    seg.innerHTML = `
      <button type="button" class="${STATE.buildDim === "2d" ? "active" : ""}" data-dim="2d">📐 Dựng 2D chuẩn</button>
      <button type="button" class="${STATE.buildDim === "3d" ? "active" : ""}" data-dim="3d">🧊 Dựng 3D tỉ lệ</button>
    `;
    seg.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => { STATE.buildDim = b.dataset.dim; renderPanel(); });
    });
    body.appendChild(seg);

    const shapes2d = [
      ["segment", "Đoạn thẳng (a)"],
      ["angle", "Góc cố định (α, a, b)"],
      ["circle", "Đường tròn (R)"],
      ["tri_sas", "Tam giác (a, b, α)"],
      ["tri_sss", "Tam giác 3 cạnh (a,b,c)"],
      ["rect", "Hình chữ nhật (a×b)"],
      ["parallelogram", "Hình bình hành (a,b,α)"]
    ];
    const shapes3d = [
      ["pyramid4", "Chóp đều S.ABCD (a, h)"],
      ["pyramid4Right", "Chóp HCN, SA⊥đáy"],
      ["pyramid3", "Chóp tam giác S.ABC"],
      ["box", "Hình hộp / Lập phương"],
      ["prism3", "Lăng trụ đứng tam giác"],
      ["cone", "Hình nón (r, h)"],
      ["cylinder", "Hình trụ (r, h)"]
    ];

    const list = STATE.buildDim === "2d" ? shapes2d : shapes3d;
    const curKind = STATE.buildDim === "2d" ? STATE.buildKind2d : STATE.buildKind3d;

    const grid = document.createElement("div");
    grid.className = "mnp-shape-grid";
    for (const [id, label] of list) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mnp-shape-btn" + (curKind === id ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        if (STATE.buildDim === "2d") STATE.buildKind2d = id;
        else STATE.buildKind3d = id;
        renderPanel();
      });
      grid.appendChild(b);
    }
    body.appendChild(grid);

    const form = document.createElement("div");
    form.className = "mnp-section";
    const distChips = params.filter(p => p.unit === "dist").map(p => p.name);
    const angChips = params.filter(p => p.unit === "angle").map(p => p.name);

    const makeField = (key, label, unit, chips) => {
      const wrap = document.createElement("div");
      wrap.className = "mnp-field";
      wrap.innerHTML = `
        <label><span>${label}</span><span style="color:#64748b;font-weight:500">${unit}</span></label>
        <input type="text" class="mnp-input" data-bkey="${key}" value="${escapeHtml(v[key])}" placeholder="Nhập số hoặc tên tham số" />
        ${chips.length ? `<div class="mnp-chip-row">${chips.map(c => `<button type="button" class="mnp-chip" data-fill="${c}">${escapeHtml(c)}</button>`).join("")}</div>` : ""}
      `;
      const inp = wrap.querySelector("input");
      inp.addEventListener("input", () => { v[key] = inp.value; });
      wrap.querySelectorAll("[data-fill]").forEach(c => {
        c.addEventListener("click", () => { inp.value = c.dataset.fill; v[key] = c.dataset.fill; });
      });
      return wrap;
    };

    const title = document.createElement("div");
    title.className = "mnp-section-title";
    title.textContent = "Thông số kích thước / tham số";
    form.appendChild(title);

    if (STATE.buildDim === "2d") {
      if (curKind === "segment") {
        form.appendChild(makeField("a", "Độ dài AB", "cm", distChips));
        form.appendChild(makeField("segAng", "Góc nghiêng ban đầu", "độ (°)", angChips));
        const chk = document.createElement("label");
        chk.className = "mnp-check";
        chk.innerHTML = `<input type="checkbox" ${v.lockSegAng ? "checked" : ""} /> Khóa cứng luôn phương (không xoay được)`;
        chk.querySelector("input").addEventListener("change", e => { v.lockSegAng = e.target.checked; });
        form.appendChild(chk);
      } else if (curKind === "circle") {
        form.appendChild(makeField("r", "Bán kính R", "cm", distChips));
      } else if (curKind === "angle") {
        form.appendChild(makeField("ang", "Số đo góc ∠AOB", "độ (°)", angChips));
        form.appendChild(makeField("a", "Độ dài cạnh OA", "cm", distChips));
        form.appendChild(makeField("b", "Độ dài cạnh OB", "cm", distChips));
      } else if (curKind === "tri_sas") {
        form.appendChild(makeField("a", "Cạnh AB", "cm", distChips));
        form.appendChild(makeField("b", "Cạnh AC", "cm", distChips));
        form.appendChild(makeField("ang", "Góc xen giữa ∠BAC", "độ (°)", angChips));
      } else if (curKind === "tri_sss") {
        form.appendChild(makeField("a", "Cạnh đáy AB", "cm", distChips));
        form.appendChild(makeField("b", "Cạnh AC", "cm", distChips));
        form.appendChild(makeField("c", "Cạnh BC", "cm", distChips));
      } else if (curKind === "rect") {
        form.appendChild(makeField("a", "Chiều dài AB", "cm", distChips));
        form.appendChild(makeField("b", "Chiều rộng AD", "cm", distChips));
      } else if (curKind === "parallelogram") {
        form.appendChild(makeField("a", "Cạnh đáy AB", "cm", distChips));
        form.appendChild(makeField("b", "Cạnh bên AD", "cm", distChips));
        form.appendChild(makeField("ang", "Góc ∠BAD", "độ (°)", angChips));
      }
    } else {
      if (curKind === "pyramid4") {
        form.appendChild(makeField("a", "Cạnh đáy vuông a", "cm", distChips));
        form.appendChild(makeField("h", "Chiều cao SO = h", "cm", distChips));
      } else if (curKind === "pyramid4Right" || curKind === "box") {
        form.appendChild(makeField("a", "Cạnh dài a", "cm", distChips));
        form.appendChild(makeField("b", "Cạnh rộng b", "cm", distChips));
        form.appendChild(makeField("h", curKind === "box" ? "Chiều cao AA' = h" : "Chiều cao SA = h", "cm", distChips));
      } else if (curKind === "pyramid3" || curKind === "prism3") {
        form.appendChild(makeField("a", "Cạnh đáy BC = a", "cm", distChips));
        form.appendChild(makeField("b", "Cạnh đáy BA = b", "cm", distChips));
        form.appendChild(makeField("ang", "Góc đáy ∠ABC = α", "độ (°)", angChips));
        form.appendChild(makeField("h", "Chiều cao h", "cm", distChips));
        if (curKind === "pyramid3") {
          const chk = document.createElement("label");
          chk.className = "mnp-check";
          chk.innerHTML = `<input type="checkbox" ${v.rightBase ? "checked" : ""} /> Cạnh bên SA vuông góc với đáy (ABC)`;
          chk.querySelector("input").addEventListener("change", e => { v.rightBase = e.target.checked; });
          form.appendChild(chk);
        }
      } else if (curKind === "cone" || curKind === "cylinder") {
        form.appendChild(makeField("r", "Bán kính đáy r", "cm", distChips));
        form.appendChild(makeField("h", "Chiều cao h", "cm", distChips));
      }
    }

    const autoChk = document.createElement("label");
    autoChk.className = "mnp-check";
    autoChk.innerHTML = `<input type="checkbox" ${v.autoCreateParams ? "checked" : ""} /> Tự tạo tham số GSP5 cho các số liệu này (để kéo thanh trượt đổi kích thước sau)`;
    autoChk.querySelector("input").addEventListener("change", e => { v.autoCreateParams = e.target.checked; });
    form.appendChild(autoChk);

    const buildBtn = document.createElement("button");
    buildBtn.type = "button";
    buildBtn.className = "mnp-btn primary";
    buildBtn.textContent = STATE.buildDim === "2d" ? "✨ Dựng hình 2D khóa chuẩn" : "🧊 Dựng hình 3D chuẩn tỉ lệ";
    buildBtn.addEventListener("click", () => {
      if (STATE.buildDim === "2d") buildParametric2D(curKind);
      else buildParametric3D(curKind);
    });
    form.appendChild(buildBtn);

    body.appendChild(form);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isLibraryOpen() {
    const lib = document.querySelector(".library");
    if (!lib) return false;
    const r = lib.getBoundingClientRect();
    return r.width > 100 && r.height > 100;
  }

  function updatePill() {
    const pill = document.getElementById("mn-param-pill");
    if (!pill) return;
    const params = getParams();
    const anyAnim = params.some(p => p.animating);
    const hide = STATE.open || isLibraryOpen();
    pill.style.display = hide ? "none" : "inline-flex";
    const badge = pill.querySelector(".mn-pill-badge");
    if (badge) badge.textContent = String(params.length);
    const dot = pill.querySelector(".mn-pill-dot");
    if (dot) dot.classList.toggle("anim", anyAnim);
  }

  function openPanel(tab) {
    ensureUI();
    if (tab) STATE.tab = tab;
    STATE.open = true;
    const panel = document.getElementById("mn-param-panel");
    if (panel) {
      if (!STATE.panelPos) {
        const sb = document.querySelector(".sel-bar");
        const topY = sb && sb.getBoundingClientRect().height > 0
          ? Math.max(96, Math.round(sb.getBoundingClientRect().bottom + 10))
          : 100;
        panel.style.top = `${topY}px`;
        panel.style.maxHeight = `calc(100vh - ${topY + 68}px)`;
      }
      panel.classList.add("open");
    }
    renderPanel();
    updatePill();
  }

  function closePanel() {
    STATE.open = false;
    const panel = document.getElementById("mn-param-panel");
    if (panel) panel.classList.remove("open");
    updatePill();
  }

  function togglePanel() {
    if (STATE.open) closePanel();
    else openPanel();
  }

  function openForSelection(hint) {
    ensureUI();
    const targets = detectSelectionTargets();
    if (hint === "length" || targets.length || targets.angle || targets.ratio) {
      openPanel("constraints");
    } else {
      openPanel("params");
    }
  }

  // Watch selection changes so Constraints tab refreshes live when user selects a segment/angle
  function startSelectionWatcher() {
    setInterval(() => {
      const ed = getEditor();
      if (!ed) return;
      ensureUI();
      updatePill();
      if (!STATE.open) return;
      const sel = ed.sel;
      const key = sel
        ? `${sel.page}|${[...sel.points].join(",")}|${[...sel.shapes].join(",")}|${getParams(sel.page).length}`
        : `none|${currentPageIndex()}|${getParams().length}`;
      if (key !== STATE.selKey) {
        STATE.selKey = key;
        if (STATE.tab === "constraints" || STATE.tab === "params") {
          // Avoid wiping active typing input
          const panel = document.getElementById("mn-param-panel");
          if (panel && !panel.contains(document.activeElement)) {
            renderPanel();
          }
        }
      }
    }, 280);
  }

  // Keyboard shortcut: Alt+P opens GSP5 New Parameter dialog (or toggles panel if Shift+Alt+P)
  window.addEventListener("keydown", e => {
    if (e.altKey && !e.ctrlKey && (e.key === "p" || e.key === "P")) {
      const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      if (e.shiftKey) togglePanel();
      else openParamModal(null);
    }
  });

  // Public API
  window.MinNoteGeoParams = {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    openForSelection,
    openNewParameter: (unit, val) => openParamModal(null, unit, val),
    drawOverlay,
    // Programmatic API (useful for testing & extensions)
    upsertParam,
    deleteParam,
    applyLengthConstraint,
    applyAngleConstraint,
    unlockPoint,
    buildParametric2D,
    buildParametric3D,
    getParams,
    listAllConstraints
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { ensureUI(); startSelectionWatcher(); });
  } else {
    ensureUI();
    startSelectionWatcher();
  }
})();
