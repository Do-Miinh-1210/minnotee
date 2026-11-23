/* MinNote Parametric Geometry & Constraints Studio
 * - Native bottom-toolbar button (no corner pill!)
 * - Parameters appear directly on the whiteboard as clean KaTeX math formulas (e.g. a = 2 cm, α = 60°)
 * - Single-click KaTeX formula to select/arm -> combine with Circle / Segment / Angle / Rotate / Dilate / Translate to construct automatically!
 * - Double-click KaTeX formula to open the full Parametric Studio panel (sliders, formulas, animation, constraints, 2D/3D builders)
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
    focusedParamId: null,
    selectedParamIds: [], // active KaTeX param IDs (at most 1 per unit: dist / angle / none)
    showLabels: false, // keep board ultra-clean by default; user can toggle "Nhãn" in panel
    rafId: null,
    lastAnimTs: 0,
    sliderUndoSaved: false,
    panelPos: null,
    selKey: "",
    katexKey: "",
    hoverHighlight: null,
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

  function isLibraryOpen() {
    const lib = document.querySelector(".library");
    if (!lib) return false;
    const r = lib.getBoundingClientRect();
    return r.width > 100 && r.height > 100;
  }

  // Convert parameter to authentic LaTeX string for KaTeX (e.g. a = 2 cm, \alpha = 60^\circ, t_{1} = 1,5)
  function paramNameToLatex(name) {
    const greek = {
      "α": "\\alpha", "β": "\\beta", "γ": "\\gamma", "δ": "\\delta",
      "θ": "\\theta", "φ": "\\varphi", "λ": "\\lambda", "π": "\\pi", "ω": "\\omega"
    };
    let s = String(name || "a").trim();
    if (greek[s]) return greek[s];
    // Convert t[1] -> t_{1}, a1 -> a_{1}
    const mBracket = /^([A-Za-z\\]+)\[([^\]]+)\]$/.exec(s);
    if (mBracket) return `${mBracket[1]}_{${mBracket[2]}}`;
    const mSub = /^([A-Za-z])(\d+)$/.exec(s);
    if (mSub) return `${mSub[1]}_{${mSub[2]}}`;
    return s;
  }

  function paramToLatex(geo, p) {
    const nm = paramNameToLatex(p.name);
    const val = evalParamValue(geo, p);
    const valStr = fmtNum(val, p.unit === "angle" ? 1 : 2).replace(",", "{,}");
    const unitTex = p.unit === "dist" ? "\\,\\text{cm}" : (p.unit === "angle" ? "^\\circ" : "");
    if (p.expr && p.expr.trim()) {
      const exprTex = String(p.expr)
        .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}")
        .replace(/\*/g, "\\cdot ")
        .replace(/α/g, "\\alpha")
        .replace(/β/g, "\\beta");
      return `${nm} = ${exprTex} \\approx ${valStr}${unitTex}`;
    }
    return `${nm} = ${valStr}${unitTex}`;
  }

  function paramPlainText(geo, p) {
    const val = evalParamValue(geo, p);
    return `${p.name} = ${fmtNum(val, p.unit === "angle" ? 1 : 2)}${unitSuffix(p.unit)}`;
  }

  // Active selected parameters on current page
  function getSelectedParams(pageIdx) {
    const params = getParams(pageIdx);
    const idSet = new Set(STATE.selectedParamIds);
    return params.filter(p => idSet.has(p.id));
  }

  function getActiveParamByUnit(pageIdx, unit) {
    const sel = getSelectedParams(pageIdx);
    return sel.find(p => p.unit === unit) || null;
  }

  function selectParam(pageIdx, paramId, toggle = true) {
    const params = getParams(pageIdx);
    const target = params.find(p => p.id === paramId);
    if (!target) return;
    const idx = STATE.selectedParamIds.indexOf(paramId);
    if (idx >= 0) {
      if (toggle) STATE.selectedParamIds.splice(idx, 1);
    } else {
      // Smart per-unit selection: keep 1 active param per unit (so a=2cm and α=60° can be selected together!)
      STATE.selectedParamIds = STATE.selectedParamIds.filter(id => {
        const other = params.find(p => p.id === id);
        return other && other.unit !== target.unit;
      });
      STATE.selectedParamIds.push(paramId);
    }
    syncArmedBar();
    renderCanvasChips(true);
  }

  function clearSelectedParams() {
    STATE.selectedParamIds = [];
    syncArmedBar();
    renderCanvasChips(true);
  }

  // Re-run 3D auto-dash for any solid on the page whose vertices updated
  function refreshSolidsOnGeo(geo) {
    const K = getKernel();
    if (!K || !geo || !Array.isArray(geo.shapes)) return geo;
    let out = geo;
    for (const sh of out.shapes) {
      if (sh.kind === "solid" && sh.solid && sh.solid.faces) {
        try { out = K.mee(out, sh); } catch (_) {}
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
    renderCanvasChips(true);
    syncArmedBar();
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
        d.paramId === paramId || d.distParamId === paramId || d.angParamId === paramId ||
        d.kParamId === paramId || d.xParamId === paramId || d.yParamId === paramId || d.zParamId === paramId
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

  function isPointUsedByShapesOrDeps(geo, ptId) {
    const K = getKernel();
    if (!geo) return false;
    if (geo.shapes.some(sh => sh.pts && sh.pts.includes(ptId))) return true;
    for (const other of Object.values(geo.points)) {
      if (other.id === ptId || !other.def) continue;
      if (K && K.Om(other.def).includes(ptId)) return true;
    }
    return false;
  }

  // ==================== DYNAMIC LOCUS (QUỸ TÍCH) ENGINE ====================

  function resolveDriver(geo, ptId) {
    const K = getKernel();
    if (!geo || !geo.points || !ptId) return null;
    if (K && typeof K._mnResolveDriver === "function") return K._mnResolveDriver(geo, ptId);
    const pt = geo.points[ptId];
    if (!pt || !pt.def) return null;
    const d = pt.def;
    if (d.t === "path" || d.t === "on" || d.t === "onLocus" || d.t === "vec" || (d.t === "len" && !d.lockedAng) || (d.t === "polar" && (!!d.fixedDist !== !!d.fixedAng))) {
      return { kind: d.kind || d.t, pts: d.pts || [d.a, d.b].filter(Boolean) };
    }
    return null;
  }

  function isDriverPoint(geo, ptId) {
    return !!resolveDriver(geo, ptId);
  }

  function describeDriverPoint(geo, ptId) {
    const pt = geo && geo.points && geo.points[ptId];
    if (!pt || !pt.def) return ptName(geo, ptId);
    const nm = ptName(geo, ptId);
    const d = pt.def;
    if (d.t === "path") {
      const map = { circle: "đường tròn", ellipse: "elip", parabola: "parabol", hyperbola: "hypebol", polygon: "đa giác" };
      if (d.kind === "circle" && d.pts && d.pts[0]) return `${nm} ∈ (${ptName(geo, d.pts[0])})`;
      return `${nm} ∈ ${map[d.kind] || "đường cong"}`;
    }
    if (d.t === "onLocus") return `${nm} ∈ quỹ tích`;
    if (d.t === "on") {
      const segName = `${ptName(geo, d.a)}${ptName(geo, d.b)}`;
      return d.seg ? `${nm} ∈ đoạn ${segName}` : `${nm} ∈ đường ${segName}`;
    }
    if (d.t === "vec") return `${nm} trượt theo ${ptName(geo, d.a)}${ptName(geo, d.b)}`;
    if (d.t === "len") return `${nm} quay quanh ${ptName(geo, d.a)}`;
    if (d.t === "polar") return d.fixedDist ? `${nm} quay quanh ${ptName(geo, d.o)}` : `${nm} trượt tia ${ptName(geo, d.o)}`;
    const drv = resolveDriver(geo, ptId);
    if (drv) {
      if (drv.kind === "circle" && drv.pts && drv.pts[0]) return `${nm} ∈ (${ptName(geo, drv.pts[0])})`;
      if ((drv.kind === "segment" || drv.kind === "line" || drv.kind === "ray") && drv.pts && drv.pts.length >= 2) {
        return `${nm} ∈ ${drv.kind === "segment" ? "đoạn" : drv.kind === "ray" ? "tia" : "đường"} ${ptName(geo, drv.pts[0])}${ptName(geo, drv.pts[1])}`;
      }
      if (drv.kind === "polygon") return `${nm} ∈ đa giác`;
    }
    return nm;
  }

  function pointDependsOnParam(geo, ptId, paramId) {
    const K = getKernel();
    if (!geo || !geo.points || !paramId || !K) return false;
    const pList = Array.isArray(geo.params) ? geo.params : [];
    const pm = pList.find(x => x && x.id === paramId);
    if (!pm) return false;
    const pIds = new Set([pm.id]);
    const pNames = new Set([pm.name]);
    let ch = true;
    while (ch) {
      ch = false;
      for (const x of pList) {
        if (!x || pIds.has(x.id) || !x.expr) continue;
        for (const nm of pNames) {
          if (String(x.expr).includes(nm)) { pIds.add(x.id); pNames.add(x.name); ch = true; break; }
        }
      }
    }
    const direct = (id) => {
      const d = geo.points[id] && geo.points[id].def;
      if (!d) return false;
      if (pIds.has(d.paramId) || pIds.has(d.distParamId) || pIds.has(d.angParamId) || pIds.has(d.kParamId) || pIds.has(d.xParamId) || pIds.has(d.yParamId) || pIds.has(d.zParamId)) return true;
      const exs = [d.expr, d.distExpr, d.angExpr, d.kExpr, d.vx, d.vy, d.vz].filter(Boolean);
      if (exs.length) {
        for (const nm of pNames) if (exs.some(s => String(s).includes(nm))) return true;
      }
      return false;
    };
    const seen = new Set();
    const stack = [ptId];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur)) continue;
      seen.add(cur);
      if (direct(cur)) return true;
      const pt = geo.points[cur];
      if (pt && pt.def) {
        for (const dep of K.Om(pt.def)) if (dep) stack.push(dep);
      }
    }
    return false;
  }

  function listValidDriversForPoints(geo, tracedIds) {
    const out = [];
    if (!geo || !geo.points || !tracedIds.length) return out;
    const K = getKernel();
    if (!K) return out;
    const tracedSet = new Set(tracedIds);
    const anc = new Set();
    const stack = [...tracedIds];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || anc.has(cur)) continue;
      anc.add(cur);
      const pt = geo.points[cur];
      if (pt && pt.def) {
        for (const dep of K.Om(pt.def)) if (dep) stack.push(dep);
      }
    }
    for (const id of anc) {
      if (tracedSet.has(id)) continue;
      const pt = geo.points[id];
      if (!pt || !pt.show || pt.hidden) continue;
      const drv = resolveDriver(geo, id);
      if (drv) {
        out.push({
          key: `pt:${id}`,
          type: "point",
          id,
          shortName: ptName(geo, id),
          label: `Theo điểm ${describeDriverPoint(geo, id)}`,
          drv
        });
      }
    }
    const pList = Array.isArray(geo.params) ? geo.params : [];
    for (const pm of pList) {
      if (!pm || (pm.expr && pm.expr.trim())) continue;
      if (tracedIds.some(tid => pointDependsOnParam(geo, tid, pm.id))) {
        out.push({
          key: `pm:${pm.id}`,
          type: "param",
          id: pm.id,
          shortName: pm.name,
          label: `Theo tham số ${pm.name} ∈ [${fmtNum(pm.min ?? 0, pm.unit === "angle" ? 0 : 1)}; ${fmtNum(pm.max ?? 10, pm.unit === "angle" ? 0 : 1)}]${unitSuffix(pm.unit)}`
        });
      }
    }
    return out;
  }

  function describeShapeShort(geo, sh) {
    if (!sh) return "Hình";
    const names = (sh.pts || []).map(id => ptName(geo, id)).join("");
    const kindMap = {
      segment: "Đoạn", line: "Đường thẳng", ray: "Tia",
      circle: "Đường tròn", polygon: "Đa giác"
    };
    if (sh.kind === "circle" && sh.pts && sh.pts[0]) return `Đường tròn (${ptName(geo, sh.pts[0])})`;
    return `${kindMap[sh.kind] || sh.kind} ${names}`;
  }

  function describeLocus(geo, sh) {
    const L = sh && sh.locus;
    if (!L) return { title: "Quỹ tích", sub: "" };
    const mode = L.mode === "shape" ? "shape" : "point";
    const dType = L.driverType === "param" ? "param" : "point";
    const pts = Array.isArray(sh.pts) ? sh.pts : [];
    let targetLabel = "";
    let driverLabel = "";
    if (mode === "point") {
      targetLabel = `Quỹ tích điểm ${ptName(geo, pts[0] || "")}`;
    } else {
      const sPts = dType === "point" ? pts.slice(0, -1) : pts;
      targetLabel = `Họ ${describeShapeShort(geo, { kind: L.shapeKind, pts: sPts })}`;
    }
    if (dType === "point") {
      const dId = pts[pts.length - 1];
      driverLabel = `khi ${describeDriverPoint(geo, dId)}`;
    } else {
      const pm = (geo.params || []).find(p => p.id === L.paramId);
      driverLabel = pm ? `theo tham số ${pm.name}` : "theo tham số";
    }
    return { title: targetLabel, sub: driverLabel };
  }

  function createPointLocus(pageIdx, tracedId, driverType, driverId, opts = {}) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    const ed = getEditor();
    if (!pg || !K || !ed) return false;
    const geo = pg.geo;
    if (!geo.points[tracedId]) { showToast("Không tìm thấy điểm cần vẽ quỹ tích."); return false; }

    if (driverType === "point") {
      if (tracedId === driverId) { showToast("Điểm quỹ tích và điểm chuyển động phải khác nhau."); return false; }
      if (!isDriverPoint(geo, driverId)) {
        showToast(`Điểm ${ptName(geo, driverId)} chưa nằm trên đường dẫn (đường tròn, đoạn thẳng, đường thẳng...).`);
        return false;
      }
      if (!dependsOn(geo, tracedId, driverId)) {
        showToast(`Điểm ${ptName(geo, tracedId)} không phụ thuộc vào điểm ${ptName(geo, driverId)}.`);
        return false;
      }
    } else {
      if (!pointDependsOnParam(geo, tracedId, driverId)) {
        showToast(`Điểm ${ptName(geo, tracedId)} không phụ thuộc vào tham số đã chọn.`);
        return false;
      }
    }

    // Avoid creating duplicate identical locus
    const existing = (geo.shapes || []).find(s =>
      s.kind === "locus" &&
      s.locus &&
      s.locus.mode === "point" &&
      s.locus.driverType === driverType &&
      s.pts &&
      s.pts[0] === tracedId &&
      (driverType === "point" ? s.pts[1] === driverId : s.locus.paramId === driverId)
    );
    if (existing) {
      ed.selectGeo(pageIdx, [], [existing.id]);
      const desc = describeLocus(geo, existing);
      showToast(`${desc.title} ${desc.sub} đã có sẵn trên bảng!`);
      return true;
    }

    const style = ed.shapeStyle || { color: "#e11d48", width: 2.4 };
    const defaultCol = (!style.color || style.color === "#1a1a1a" || style.color === "#000000") ? "#e11d48" : style.color;
    const color = opts.color || defaultCol;
    const width = Number(opts.width) || style.width || 2.4;
    const dashed = opts.dashed !== undefined ? !!opts.dashed : !!ed.dashed;
    const samples = Math.max(24, Math.min(720, Number(opts.samples) || 240));
    const min = opts.min !== undefined && opts.min !== "" && Number.isFinite(Number(String(opts.min).replace(",", ".")))
      ? Number(String(opts.min).replace(",", ".")) : undefined;
    const max = opts.max !== undefined && opts.max !== "" && Number.isFinite(Number(String(opts.max).replace(",", ".")))
      ? Number(String(opts.max).replace(",", ".")) : undefined;

    const shId = makeId("loc");
    const sh = {
      id: shId,
      kind: "locus",
      pts: driverType === "point" ? [tracedId, driverId] : [tracedId],
      color,
      width,
      ...(dashed ? { dashed: true } : {}),
      locus: {
        mode: "point",
        driverType,
        ...(driverType === "param" ? { paramId: driverId } : {}),
        samples,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {})
      }
    };

    const strokes = K._mnLocusStrokes ? K._mnLocusStrokes(geo, sh, K.Tt(geo)) : [];
    if (!strokes.length) {
      showToast("Không tạo được quỹ tích cho cặp đối tượng này (vùng xác định rỗng).");
      return false;
    }

    mutateGeo(pageIdx, g => ({
      ...g,
      shapes: [...g.shapes, sh]
    }));
    ed.selectGeo(pageIdx, [], [shId]);
    const desc = describeLocus(getPage(pageIdx).geo, sh);
    showToast(`Đã dựng ${desc.title} ${desc.sub}`);
    return true;
  }

  function createShapeLocus(pageIdx, shapeObj, driverType, driverId, opts = {}) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    const ed = getEditor();
    if (!pg || !K || !ed || !shapeObj) return false;
    const geo = pg.geo;
    if (!["segment", "line", "ray", "circle", "polygon"].includes(shapeObj.kind)) {
      showToast("Hỗ trợ tạo họ hình quỹ tích cho đoạn thẳng, đường thẳng, tia, đường tròn và đa giác.");
      return false;
    }

    if (driverType === "point") {
      if (!isDriverPoint(geo, driverId)) {
        showToast(`Điểm ${ptName(geo, driverId)} cần nằm trên một đường dẫn.`);
        return false;
      }
      if (!shapeObj.pts.some(pid => dependsOn(geo, pid, driverId))) {
        showToast(`${describeShapeShort(geo, shapeObj)} không phụ thuộc vào điểm ${ptName(geo, driverId)}.`);
        return false;
      }
    } else {
      if (!shapeObj.pts.some(pid => pointDependsOnParam(geo, pid, driverId))) {
        showToast(`${describeShapeShort(geo, shapeObj)} không phụ thuộc vào tham số đã chọn.`);
        return false;
      }
    }

    const color = opts.color || "#7c3aed";
    const width = Number(opts.width) || 2.0;
    const dashed = opts.dashed !== undefined ? !!opts.dashed : !!ed.dashed;
    const samples = Math.max(6, Math.min(120, Number(opts.samples) || 28));
    const min = opts.min !== undefined && opts.min !== "" && Number.isFinite(Number(String(opts.min).replace(",", ".")))
      ? Number(String(opts.min).replace(",", ".")) : undefined;
    const max = opts.max !== undefined && opts.max !== "" && Number.isFinite(Number(String(opts.max).replace(",", ".")))
      ? Number(String(opts.max).replace(",", ".")) : undefined;

    const shId = makeId("loc");
    const sh = {
      id: shId,
      kind: "locus",
      pts: driverType === "point" ? [...shapeObj.pts, driverId] : [...shapeObj.pts],
      color,
      width,
      ...(dashed ? { dashed: true } : {}),
      locus: {
        mode: "shape",
        shapeKind: shapeObj.kind,
        driverType,
        ...(driverType === "param" ? { paramId: driverId } : {}),
        samples,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {})
      }
    };

    mutateGeo(pageIdx, g => ({
      ...g,
      shapes: [...g.shapes, sh]
    }));
    ed.selectGeo(pageIdx, [], [shId]);
    const desc = describeLocus(getPage(pageIdx).geo, sh);
    showToast(`Đã dựng ${desc.title} ${desc.sub}`);
    return true;
  }

  function updateLocusShape(pageIdx, locusId, patchShape, patchLocus) {
    mutateGeo(pageIdx, geo => ({
      ...geo,
      shapes: geo.shapes.map(sh => sh.id === locusId ? {
        ...sh,
        ...(patchShape || {}),
        locus: { ...(sh.locus || {}), ...(patchLocus || {}) }
      } : sh)
    }));
  }

  function deleteLocusShape(pageIdx, locusId) {
    const K = getKernel();
    mutateGeo(pageIdx, geo => K && K.c5 ? K.c5(geo, [], [locusId]) : ({
      ...geo,
      shapes: geo.shapes.filter(sh => sh.id !== locusId)
    }));
  }

  // ==================== CONTEXT-ONLY SELECTION BAR INTEGRATION ====================

  function getSelectedLocusShape(pageIdx) {
    const ed = getEditor();
    const pIdx = pageIdx !== undefined ? pageIdx : currentPageIndex();
    const pg = getPage(pIdx);
    if (!ed || !ed.sel || ed.sel.page !== pIdx || !pg || !pg.geo) return null;
    if (ed.sel.shapes.size !== 1 || ed.sel.points.size > 0) return null;
    const [shId] = ed.sel.shapes;
    return (pg.geo.shapes || []).find(s => s.id === shId && s.kind === "locus") || null;
  }

  function matchDriverOnShape(geo, drivers, sh) {
    if (!sh || !Array.isArray(drivers)) return null;
    const ptDrvs = drivers.filter(d => d.type === "point");
    const onSh = ptDrvs.find(d =>
      (sh.pts && sh.pts.includes(d.id)) ||
      (d.drv && (d.drv.shapeId === sh.id || (d.drv.pts && sh.pts && d.drv.pts.every(p => sh.pts.includes(p)))))
    );
    if (onSh) return onSh;
    if (!sh.pts.some(pid => ptDrvs.some(d => d.id === pid)) && ptDrvs.length === 1) return ptDrvs[0];
    return null;
  }

  function resolveSelectionLocusAction(pageIdx) {
    const ed = getEditor();
    const pIdx = pageIdx !== undefined ? pageIdx : currentPageIndex();
    const pg = getPage(pIdx);
    if (!ed || !ed.sel || ed.sel.page !== pIdx || !pg || !pg.geo) return null;
    const geo = pg.geo;

    // 1. Existing locus curve selected -> adjust resolution inline
    const selLoc = getSelectedLocusShape(pIdx);
    if (selLoc) {
      return { kind: "editLocus", pageIdx: pIdx, locus: selLoc };
    }

    const carried = ed.sel.carried || new Set();
    const explicitPts = [...ed.sel.points].filter(id => !carried.has(id) && geo.points[id]);
    const selShapes = (geo.shapes || []).filter(s => ed.sel.shapes.has(s.id) && ["segment", "line", "ray", "circle", "polygon"].includes(s.kind));
    const activeParams = getSelectedParams(pIdx).filter(p => !p.expr);

    // 2. Two explicit points selected (traced point + driver point, in either order)
    if (explicitPts.length === 2 && selShapes.length === 0) {
      const [a, b] = explicitPts;
      if (dependsOn(geo, a, b) && isDriverPoint(geo, b)) {
        return { kind: "createPoint", pageIdx: pIdx, tracedId: a, drivers: [{ type: "point", id: b, shortName: ptName(geo, b), label: `Theo điểm ${describeDriverPoint(geo, b)}` }] };
      }
      if (dependsOn(geo, b, a) && isDriverPoint(geo, a)) {
        return { kind: "createPoint", pageIdx: pIdx, tracedId: b, drivers: [{ type: "point", id: a, shortName: ptName(geo, a), label: `Theo điểm ${describeDriverPoint(geo, a)}` }] };
      }
      return null;
    }

    // 3. 1 explicit point + 1 curve selected (either point + path of driver, OR driver point + dependent shape)
    if (explicitPts.length === 1 && selShapes.length === 1) {
      const ptId = explicitPts[0], sh = selShapes[0];
      const ptDrivers = listValidDriversForPoints(geo, [ptId]);
      const matchDrv = matchDriverOnShape(geo, ptDrivers, sh);
      if (matchDrv && !sh.pts.some(pid => dependsOn(geo, pid, ptId))) {
        return { kind: "createPoint", pageIdx: pIdx, tracedId: ptId, drivers: [matchDrv] };
      }
      if (isDriverPoint(geo, ptId) && sh.pts.some(pid => dependsOn(geo, pid, ptId))) {
        return { kind: "createShape", pageIdx: pIdx, shape: sh, drivers: [{ type: "point", id: ptId, shortName: ptName(geo, ptId), label: `Theo điểm ${describeDriverPoint(geo, ptId)}` }] };
      }
      return null;
    }

    // 4. 1 explicit dependent point selected (and no unrelated shapes)
    if (explicitPts.length === 1 && selShapes.length === 0) {
      const ptId = explicitPts[0];
      if (activeParams.length) {
        const pm = activeParams.find(p => pointDependsOnParam(geo, ptId, p.id));
        if (pm) {
          return { kind: "createPoint", pageIdx: pIdx, tracedId: ptId, drivers: [{ type: "param", id: pm.id, shortName: pm.name, label: `Theo tham số ${pm.name}` }] };
        }
      }
      const drivers = listValidDriversForPoints(geo, [ptId]);
      if (drivers.length > 0) {
        return { kind: "createPoint", pageIdx: pIdx, tracedId: ptId, drivers };
      }
      return null;
    }

    // 5. 1 shape selected ONLY when a KaTeX parameter chip is actively armed and drives this shape
    if (selShapes.length === 1 && explicitPts.length === 0 && activeParams.length > 0) {
      const sh = selShapes[0];
      const pm = activeParams.find(p => sh.pts.some(pid => pointDependsOnParam(geo, pid, p.id)));
      if (pm) {
        return { kind: "createShape", pageIdx: pIdx, shape: sh, drivers: [{ type: "param", id: pm.id, shortName: pm.name, label: `Theo tham số ${pm.name}` }] };
      }
    }

    return null;
  }

  function canShowLocusInSelBar() {
    return !!resolveSelectionLocusAction();
  }

  function getLocusSelBarLabel() {
    const act = resolveSelectionLocusAction();
    if (!act) return "Quỹ tích";
    if (act.kind === "editLocus") {
      const L = act.locus.locus || {};
      if (L.mode === "shape") return `Số hình: ${L.samples || 28}`;
      const s = Number(L.samples) || 240;
      return `Độ mịn: ${s >= 400 ? "Cao" : s <= 140 ? "Nhanh" : "Chuẩn"}`;
    }
    return "Quỹ tích";
  }

  function getLocusSelBarTitle() {
    const act = resolveSelectionLocusAction();
    if (!act) return "Dựng quỹ tích hình học động";
    if (act.kind === "editLocus") {
      const pg = getPage(act.pageIdx);
      const desc = pg ? describeLocus(pg.geo, act.locus) : { title: "Quỹ tích", sub: "" };
      return `${desc.title} ${desc.sub} — Bấm để đổi độ mịn`;
    }
    const pg = getPage(act.pageIdx);
    const geo = pg && pg.geo;
    if (act.kind === "createPoint" && geo) {
      if (act.drivers.length === 1) {
        return `Dựng ngay quỹ tích điểm ${ptName(geo, act.tracedId)} (${act.drivers[0].label.toLowerCase()})`;
      }
      return `Chọn biến dẫn để dựng quỹ tích điểm ${ptName(geo, act.tracedId)}`;
    }
    return "Dựng quỹ tích hình học động";
  }

  function setHoverHighlight(h) {
    const prev = STATE.hoverHighlight;
    STATE.hoverHighlight = h || null;
    if (prev !== STATE.hoverHighlight) {
      const ed = getEditor();
      if (ed) ed.redraw();
    }
  }

  function closeLocusQuickPop() {
    const pop = document.getElementById("mn-locus-quick-pop");
    if (pop) pop.classList.remove("open");
    if (STATE.hoverHighlight && STATE.hoverHighlight.kind === "locusDriver") {
      setHoverHighlight(null);
    }
  }

  function showLocusDriverPopover(anchorEl, act) {
    let pop = document.getElementById("mn-locus-quick-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "mn-locus-quick-pop";
      pop.addEventListener("pointerdown", e => e.stopPropagation());
      document.body.appendChild(pop);
      window.addEventListener("pointerdown", () => closeLocusQuickPop());
    }
    const pg = getPage(act.pageIdx);
    const geo = pg && pg.geo;
    const tName = geo && act.kind === "createPoint" ? ptName(geo, act.tracedId) : "";
    pop.innerHTML = `<div class="mn-lqp-title">Quỹ tích điểm ${escapeHtml(tName)}</div>`;
    for (const d of act.drivers) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mn-lqp-item";
      btn.textContent = d.label;
      const onEnter = () => {
        setHoverHighlight({ kind: "locusDriver", pageIdx: act.pageIdx, act, driver: d });
      };
      const onLeave = () => {
        if (STATE.hoverHighlight && STATE.hoverHighlight.driver === d) {
          setHoverHighlight(null);
        }
      };
      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("focus", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      btn.addEventListener("blur", onLeave);
      btn.addEventListener("click", () => {
        closeLocusQuickPop();
        if (act.kind === "createPoint") createPointLocus(act.pageIdx, act.tracedId, d.type, d.id);
        else if (act.kind === "createShape") createShapeLocus(act.pageIdx, act.shape, d.type, d.id);
      });
      pop.appendChild(btn);
    }
    const rect = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { left: window.innerWidth / 2 - 100, bottom: 92 };
    pop.style.left = `${Math.max(12, Math.min(window.innerWidth - 260, Math.round(rect.left)))}px`;
    pop.style.top = `${Math.round(rect.bottom + 6)}px`;
    pop.classList.add("open");
  }

  function onLocusSelectionClick(ev) {
    closeLocusQuickPop();
    const act = resolveSelectionLocusAction();
    if (!act) {
      const ed = getEditor();
      if (ed && typeof ed.setTool === "function") {
        ed.setTool({ k: "geo", t: "locus" });
        showToast("Đã bật công cụ Quỹ tích — bấm điểm cần tìm quỹ tích rồi bấm điểm chuyển động.");
      }
      return;
    }

    if (act.kind === "editLocus") {
      const L = act.locus.locus || {};
      if (L.mode === "shape") {
        const steps = [16, 28, 48];
        const cur = Number(L.samples) || 28;
        const next = steps[(steps.indexOf(cur) + 1) % steps.length] || 28;
        updateLocusShape(act.pageIdx, act.locus.id, null, { samples: next });
        showToast(`Đã đổi mật độ họ hình quỹ tích: ${next} đường`);
      } else {
        const steps = [240, 480, 120];
        const cur = Number(L.samples) || 240;
        const next = steps[(steps.indexOf(cur) + 1) % steps.length] || 240;
        updateLocusShape(act.pageIdx, act.locus.id, null, { samples: next });
        showToast(`Đã đổi độ mịn quỹ tích: ${next >= 400 ? "Cao (480 mẫu)" : next <= 140 ? "Nhanh (120 mẫu)" : "Chuẩn (240 mẫu)"}`);
      }
      return;
    }

    if (act.drivers.length === 1) {
      const d = act.drivers[0];
      if (act.kind === "createPoint") createPointLocus(act.pageIdx, act.tracedId, d.type, d.id);
      else if (act.kind === "createShape") createShapeLocus(act.pageIdx, act.shape, d.type, d.id);
      return;
    }

    showLocusDriverPopover(ev && ev.currentTarget, act);
  }

  // ==================== DIRECT TOOL INTEGRATION ====================

  // Build Circle (centerId, radius = distParam)
  function constructCircleByParam(ed, pageIdx, centerId, distParam) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return false;
    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };
    const rId = makeId("pt");
    const cId = makeId("sh");
    const rPt = {
      id: rId,
      def: { t: "len", a: centerId, ang: 0, paramId: distParam.id, lockedAng: false },
      label: "",
      show: false
    };
    const circ = {
      id: cId,
      kind: "circle",
      pts: [centerId, rId],
      color: style.color,
      width: style.width,
      ...(ed.dashed ? { dashed: true } : {})
    };
    ed.picks = null;
    mutateGeo(pageIdx, geo => ({
      ...geo,
      points: { ...geo.points, [rId]: rPt },
      shapes: [...geo.shapes, circ]
    }));
    showToast(`Đã vẽ đường tròn tâm ${ptName(getPage(pageIdx).geo, centerId)}, bán kính ${paramPlainText(getPage(pageIdx).geo, distParam)}`);
    if (STATE.open) renderPanel();
    return true;
  }

  // Build Angle ∠AOB = angParam (and optionally OB = distParam)
  function constructAngleByParam(ed, pageIdx, A, O, angParam, distParam) {
    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return false;
    const coords = K.Tt(pg.geo);
    const cA = coords.get(A), cO = coords.get(O);
    if (!cA || !cO) return false;
    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };
    const cm = getCmPx();
    const nameGen = K.yc(pg.geo);
    const bId = makeId("pt");
    const curDistPx = Math.max(40, K.Je(cO, cA));
    const bPt = {
      id: bId,
      def: {
        t: "polar",
        o: O,
        ref: A,
        fixedAng: true,
        angParamId: angParam.id,
        fixedDist: !!distParam,
        distParamId: distParam ? distParam.id : undefined,
        curDistPx
      },
      label: nameGen(),
      show: true
    };
    const degNow = evalParamValue(pg.geo, angParam);
    const isRight = Math.abs(Math.abs(degNow) - 90) < 0.05;
    const newShapes = [];
    const hasOA = pg.geo.shapes.some(sh => sh.kind === "segment" && sh.pts.includes(O) && sh.pts.includes(A));
    if (!hasOA) {
      newShapes.push({ id: makeId("sh"), kind: "segment", pts: [O, A], color: style.color, width: style.width });
    }
    newShapes.push({ id: makeId("sh"), kind: "segment", pts: [O, bId], color: style.color, width: style.width, ...(ed.dashed ? { dashed: true } : {}) });
    newShapes.push({ id: makeId("sh"), kind: isRight ? "right" : "angle", pts: [A, O, bId], color: style.color, width: style.width });

    ed.picks = null;
    mutateGeo(pageIdx, geo => ({
      ...geo,
      cmPx: cm,
      points: { ...geo.points, [bId]: bPt },
      shapes: [...geo.shapes, ...newShapes]
    }));
    showToast(`Đã dựng góc ∠${ptName(getPage(pageIdx).geo, A)}${ptName(getPage(pageIdx).geo, O)}${bPt.label} = ${paramPlainText(getPage(pageIdx).geo, angParam)}`);
    if (STATE.open) renderPanel();
    return true;
  }

  // Hook 1: geoPick(editor, pageIdx, pick) — intercepts Dựng hình tools for Locus & active KaTeX parameter chips
  function handleGeoPick(ed, pageIdx, pick) {
    const tool = ed.tool && ed.tool.k === "geo" ? ed.tool.t : null;
    if (!tool) return false;

    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return false;
    const geo = pg.geo;

    // 0. Native Quỹ tích (Locus) tool — works with active KaTeX param (1-click) AND with 2 clicks (point/shape + driver point or driver path)!
    if (tool === "locus") {
      const armedParam = getSelectedParams(pageIdx).find(p => !p.expr);
      if (armedParam) {
        if (pick.kind === "point" && pointDependsOnParam(geo, pick.id, armedParam.id)) {
          ed.picks = null;
          return createPointLocus(pageIdx, pick.id, "param", armedParam.id);
        }
        if (pick.kind === "curve" && pick.c && pick.c.shape && pick.c.shape.pts.some(pid => pointDependsOnParam(geo, pid, armedParam.id))) {
          ed.picks = null;
          return createShapeLocus(pageIdx, pick.c.shape, "param", armedParam.id);
        }
      }

      if (!ed.picks || ed.picks.page !== pageIdx) ed.picks = { page: pageIdx, list: [] };
      const list = ed.picks.list;

      if (list.length === 0) {
        if (pick.kind === "point") {
          const drivers = listValidDriversForPoints(geo, [pick.id]);
          const asDriver = isDriverPoint(geo, pick.id);
          if (!drivers.length && !asDriver) {
            showToast(`Điểm ${ptName(geo, pick.id)} là điểm tự do chưa phụ thuộc vào điểm chuyển động nào.`);
            return true;
          }
          list.push(pick);
          ed.sel = { page: pageIdx, strokes: new Set(), items: new Set(), points: new Set([pick.id]), shapes: new Set() };
          ed.redraw();
          ed.emit();
          if (drivers.length === 1) {
            showToast(`Đã chọn điểm ${ptName(geo, pick.id)} — bấm điểm dẫn ${drivers[0].shortName} (hoặc đường chứa ${drivers[0].shortName}, hoặc bấm lại ${ptName(geo, pick.id)}) để tạo quỹ tích`);
          } else if (drivers.length > 1) {
            showToast(`Đã chọn điểm ${ptName(geo, pick.id)} — bấm tiếp điểm chuyển động dẫn (${drivers.map(d => d.shortName).join(", ")})`);
          } else {
            showToast(`Đã chọn điểm dẫn ${ptName(geo, pick.id)} — bấm tiếp điểm (hoặc đường) phụ thuộc cần tìm quỹ tích`);
          }
          return true;
        }
        if (pick.kind === "curve" && pick.c && pick.c.shape) {
          list.push(pick);
          ed.sel = { page: pageIdx, strokes: new Set(), items: new Set(), points: new Set(), shapes: new Set([pick.c.shape.id]) };
          ed.redraw();
          ed.emit();
          showToast(`Đã chọn ${describeShapeShort(geo, pick.c.shape)} — bấm tiếp điểm phụ thuộc hoặc điểm dẫn`);
          return true;
        }
        return true;
      }

      const first = list[0];
      ed.picks = null;

      // Two points (traced + driver in either order, OR clicking the traced point twice when it has 1 unique driver, OR traced + anchor of driver's path!)
      if (first.kind === "point" && pick.kind === "point") {
        const a = first.id, b = pick.id;
        if (a === b) {
          const drivers = listValidDriversForPoints(geo, [a]);
          if (drivers.length === 1) {
            createPointLocus(pageIdx, a, drivers[0].type, drivers[0].id);
            return true;
          }
          showToast("Hãy bấm tiếp điểm chuyển động dẫn để hoàn tất tạo quỹ tích.");
          return true;
        }
        if (dependsOn(geo, a, b) && isDriverPoint(geo, b)) {
          createPointLocus(pageIdx, a, "point", b);
          return true;
        }
        if (dependsOn(geo, b, a) && isDriverPoint(geo, a)) {
          createPointLocus(pageIdx, b, "point", a);
          return true;
        }
        // Fallback: user clicked traced point A and anchor point B of M's path (e.g. center O of circle (O) that M moves on)
        const drvForA = listValidDriversForPoints(geo, [a]).filter(d => d.type === "point" && (dependsOn(geo, d.id, b) || (d.drv && d.drv.pts && d.drv.pts.includes(b))));
        if (drvForA.length === 1) {
          createPointLocus(pageIdx, a, "point", drvForA[0].id);
          return true;
        }
        const drvForB = listValidDriversForPoints(geo, [b]).filter(d => d.type === "point" && (dependsOn(geo, d.id, a) || (d.drv && d.drv.pts && d.drv.pts.includes(a))));
        if (drvForB.length === 1) {
          createPointLocus(pageIdx, b, "point", drvForB[0].id);
          return true;
        }
        if (dependsOn(geo, a, b) && !isDriverPoint(geo, b)) {
          showToast(`Điểm ${ptName(geo, b)} chưa nằm trên đường dẫn (đường tròn, đoạn thẳng, đường thẳng...).`);
        } else if (dependsOn(geo, b, a) && !isDriverPoint(geo, a)) {
          showToast(`Điểm ${ptName(geo, a)} chưa nằm trên đường dẫn (đường tròn, đoạn thẳng, đường thẳng...).`);
        } else {
          showToast(`Hai điểm ${ptName(geo, a)} và ${ptName(geo, b)} không phụ thuộc vào nhau.`);
        }
        ed.redraw();
        return true;
      }

      // Point + Curve (either order):
      // 1) If Point P depends on a driver M that moves on Curve C -> create Point Locus of P driven by M!
      // 2) Else if Curve C depends on driver Point M -> create Shape Envelope of C driven by M!
      const curvePick = first.kind === "curve" ? first : (pick.kind === "curve" ? pick : null);
      const ptPick = first.kind === "point" ? first : (pick.kind === "point" ? pick : null);
      if (curvePick && ptPick && curvePick.c && curvePick.c.shape) {
        const sh = curvePick.c.shape, ptId = ptPick.id;
        const ptDrivers = listValidDriversForPoints(geo, [ptId]);
        const matchDrv = matchDriverOnShape(geo, ptDrivers, sh);
        if (matchDrv && !sh.pts.some(pid => dependsOn(geo, pid, ptId))) {
          createPointLocus(pageIdx, ptId, matchDrv.type, matchDrv.id);
          return true;
        }
        if (isDriverPoint(geo, ptId) && sh.pts.some(pid => dependsOn(geo, pid, ptId))) {
          createShapeLocus(pageIdx, sh, "point", ptId);
          return true;
        }
        showToast(`Không tìm thấy quan hệ phụ thuộc giữa điểm ${ptName(geo, ptId)} và ${describeShapeShort(geo, sh)}.`);
        ed.redraw();
        return true;
      }

      showToast("Hãy bấm điểm cần tìm quỹ tích rồi bấm điểm chuyển động.");
      ed.redraw();
      return true;
    }

    const distP = getActiveParamByUnit(pageIdx, "dist");
    const angP = getActiveParamByUnit(pageIdx, "angle");
    const numP = getActiveParamByUnit(pageIdx, "none");
    if (!distP && !angP && !numP) return false;

    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };

    // 1. Circle / CircleRadius + active distance param a -> 1 click center O!
    if ((tool === "circle" || tool === "circleRadius") && distP && pick.kind === "point") {
      return constructCircleByParam(ed, pageIdx, pick.id, distP);
    }

    // 2. Segment + active distance param a -> 2 clicks (A, then direction B) -> locks AB = a!
    if (tool === "segment" && distP && pick.kind === "point") {
      if (!ed.picks || ed.picks.page !== pageIdx) ed.picks = { page: pageIdx, list: [] };
      const list = ed.picks.list;
      if (list.length === 0) {
        list.push(pick);
        ed.sel = { page: pageIdx, strokes: new Set(), items: new Set(), points: new Set([pick.id]), shapes: new Set() };
        ed.redraw();
        ed.emit();
        showToast(`Đã chọn gốc ${ptName(geo, pick.id)} — bấm hướng tiếp theo để vẽ đoạn = ${paramPlainText(geo, distP)}`);
        return true;
      }
      const A = list[0].id;
      const B = pick.id;
      if (A === B) return true;
      const coords = K.Tt(geo);
      const cA = coords.get(A), cB = coords.get(B);
      if (!cA || !cB) return false;
      const ang = Math.atan2(cB.y - cA.y, cB.x - cA.x);
      const ptB = geo.points[B];
      const canReuseB = ptB && ptB.def && ptB.def.t === "free" && !isPointUsedByShapesOrDeps(geo, B) && !dependsOn(geo, A, B);
      const targetId = canReuseB ? B : makeId("pt");
      const nameGen = K.yc(geo);
      const lockedDef = {
        t: "len",
        a: A,
        ang,
        paramId: distP.id,
        angParamId: angP ? angP.id : undefined,
        lockedAng: !!angP
      };
      const newPt = canReuseB
        ? { ...ptB, def: lockedDef }
        : { id: targetId, def: lockedDef, label: nameGen(), show: true };
      const seg = {
        id: makeId("sh"),
        kind: "segment",
        pts: [A, targetId],
        color: style.color,
        width: style.width,
        ...(ed.dashed ? { dashed: true } : {})
      };
      ed.picks = null;
      mutateGeo(pageIdx, g => ({
        ...g,
        points: { ...g.points, [targetId]: newPt },
        shapes: [...g.shapes, seg]
      }));
      ed.selectGeo(pageIdx, [A, targetId], [seg.id]);
      showToast(`Đã vẽ đoạn ${ptName(getPage(pageIdx).geo, A)}${newPt.label} = ${paramPlainText(getPage(pageIdx).geo, distP)} (đã khóa)`);
      return true;
    }

    // 3. Angle / AngleMark + active angle param α -> 1 click on segment OA, OR 2 clicks (A, then vertex O)!
    if ((tool === "angle" || tool === "angleMark") && angP) {
      if (pick.kind === "curve" && pick.c && pick.c.kind === "line") {
        // Segment clicked: anchor vertex at first endpoint, ray ref at second endpoint
        return constructAngleByParam(ed, pageIdx, pick.c.b, pick.c.a, angP, distP);
      }
      if (pick.kind === "point") {
        if (!ed.picks || ed.picks.page !== pageIdx) ed.picks = { page: pageIdx, list: [] };
        const list = ed.picks.list;
        if (list.length === 0) {
          list.push(pick);
          ed.sel = { page: pageIdx, strokes: new Set(), items: new Set(), points: new Set([pick.id]), shapes: new Set() };
          ed.redraw();
          ed.emit();
          showToast(`Đã chọn điểm cạnh ${ptName(geo, pick.id)} — bấm tiếp ĐỈNH GÓC để dựng góc ${paramPlainText(geo, angP)}`);
          return true;
        }
        const A = list[0].id;
        const O = pick.id;
        if (A === O) return true;
        return constructAngleByParam(ed, pageIdx, A, O, angP, distP);
      }
    }

    // 4. Rotate + active angle param α -> binds angParamId = α.id!
    if (tool === "rotate" && angP && K.BN) {
      if (!ed.picks || ed.picks.page !== pageIdx) ed.picks = { page: pageIdx, list: [] };
      const list = ed.picks.list;
      if (list.length === 0) {
        list.push(pick);
        ed.redraw();
        showToast(`Đã chọn đối tượng — bấm TÂM QUAY để quay góc ${paramPlainText(geo, angP)}`);
        return true;
      }
      if (pick.kind !== "point") return true;
      const obj = list[0];
      const deg = evalParamValue(geo, angP);
      const res = obj.kind === "point"
        ? K.BN(geo, [obj.id], [], { t: "rotate", o: pick.id, deg }, () => makeId("pt"))
        : K.BN(geo, obj.c.shape.pts, [obj.c.shape], { t: "rotate", o: pick.id, deg }, () => makeId("pt"));
      const boundPts = res.points.map(pt => pt.def && pt.def.t === "rot" ? { ...pt, def: { ...pt.def, angParamId: angP.id } } : pt);
      ed.picks = null;
      mutateGeo(pageIdx, g => {
        const pm = { ...g.points };
        for (const p of boundPts) pm[p.id] = p;
        return { ...g, points: pm, shapes: [...g.shapes, ...res.shapes] };
      });
      showToast(`Đã quay theo tham số ${paramPlainText(geo, angP)} (tự cập nhật khi đổi góc)`);
      return true;
    }

    // 5. Dilate + active scalar param k -> binds kParamId = k.id!
    if (tool === "dilate" && numP && K.BN) {
      if (!ed.picks || ed.picks.page !== pageIdx) ed.picks = { page: pageIdx, list: [] };
      const list = ed.picks.list;
      if (list.length === 0) {
        list.push(pick);
        ed.redraw();
        showToast(`Đã chọn đối tượng — bấm TÂM VỊ TỰ với tỉ số ${paramPlainText(geo, numP)}`);
        return true;
      }
      if (pick.kind !== "point") return true;
      const obj = list[0];
      const kVal = evalParamValue(geo, numP);
      const res = obj.kind === "point"
        ? K.BN(geo, [obj.id], [], { t: "dilate", o: pick.id, k: kVal }, () => makeId("pt"))
        : K.BN(geo, obj.c.shape.pts, [obj.c.shape], { t: "dilate", o: pick.id, k: kVal }, () => makeId("pt"));
      const boundPts = res.points.map(pt => pt.def && pt.def.t === "rot" ? { ...pt, def: { ...pt.def, kParamId: numP.id } } : pt);
      ed.picks = null;
      mutateGeo(pageIdx, g => {
        const pm = { ...g.points };
        for (const p of boundPts) pm[p.id] = p;
        return { ...g, points: pm, shapes: [...g.shapes, ...res.shapes] };
      });
      showToast(`Đã vị tự theo tham số ${paramPlainText(geo, numP)}`);
      return true;
    }

    // 6. Translate + active dist param a (or scalar k)
    if (tool === "translate" && (distP || numP) && K.BN) {
      if (!ed.picks || ed.picks.page !== pageIdx) ed.picks = { page: pageIdx, list: [] };
      const list = ed.picks.list;
      if (list.length < 2) {
        list.push(pick);
        ed.redraw();
        return true;
      }
      if (pick.kind !== "point") return true;
      const obj = list[0];
      const fromPt = list[1].id;
      const toPt = pick.id;
      const kVal = numP ? evalParamValue(geo, numP) : 1;
      const res = obj.kind === "point"
        ? K.BN(geo, [obj.id], [], { t: "translate", from: fromPt, to: toPt, k: kVal }, () => makeId("pt"))
        : K.BN(geo, obj.c.shape.pts, [obj.c.shape], { t: "translate", from: fromPt, to: toPt, k: kVal }, () => makeId("pt"));
      const boundPts = res.points.map(pt => {
        if (distP) {
          const origId = pt.def.o || pt.def.a;
          return { ...pt, def: { t: "vec", o: origId, a: fromPt, b: toPt, k: 1, perp: false, distParamId: distP.id } };
        }
        if (numP && pt.def.t === "vec") return { ...pt, def: { ...pt.def, kParamId: numP.id } };
        return pt;
      });
      ed.picks = null;
      mutateGeo(pageIdx, g => {
        const pm = { ...g.points };
        for (const p of boundPts) pm[p.id] = p;
        return { ...g, points: pm, shapes: [...g.shapes, ...res.shapes] };
      });
      showToast(`Đã tịnh tiến theo tham số ${paramPlainText(geo, distP || numP)}`);
      return true;
    }

    return false;
  }

  // Hook 2: handleShapeCreate — intercepts Hình (shape) tools when user has selected a KaTeX parameter chip!
  function handleShapeCreate(ed, dragObj, fromPt, toPt, ends, extraPts) {
    const pageIdx = dragObj.page;
    const distP = getActiveParamByUnit(pageIdx, "dist");
    const angP = getActiveParamByUnit(pageIdx, "angle");
    if (!distP) return false;

    const kind = dragObj.t;
    const supported = ["circle", "segment", "square", "equilateral", "cube", "pyramid4", "cone", "cylinder"];
    if (!supported.includes(kind)) return false;

    const pg = getPage(pageIdx);
    const K = getKernel();
    if (!pg || !K) return false;
    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };
    const nameGen = K.yc(pg.geo);
    const group = makeId("grp");
    const pts = [...(extraPts || [])];
    const shapes = [];

    const mkPt = (def, pref, show = true) => {
      const id = makeId("pt");
      pts.push({ id, def, label: pref === null ? "" : nameGen(pref), show: show && pref !== null, group });
      return id;
    };

    if (kind === "circle") {
      const O = (ends && ends.a) || mkPt({ t: "free", x: fromPt.x, y: fromPt.y }, "O");
      const R = mkPt({ t: "len", a: O, ang: 0, paramId: distP.id, lockedAng: false }, null, false);
      shapes.push({ id: makeId("sh"), kind: "circle", pts: [O, R], color: style.color, width: style.width, group, ...(ed.dashed ? { dashed: true } : {}) });
    } else if (kind === "segment") {
      const A = (ends && ends.a) || mkPt({ t: "free", x: fromPt.x, y: fromPt.y }, "A");
      const ang = K.Je(fromPt, toPt) > 4 ? Math.atan2(toPt.y - fromPt.y, toPt.x - fromPt.x) : 0;
      const B = mkPt({ t: "len", a: A, ang, paramId: distP.id, angParamId: angP ? angP.id : undefined, lockedAng: !!angP }, "B");
      shapes.push({ id: makeId("sh"), kind: "segment", pts: [A, B], color: style.color, width: style.width, group, ...(ed.dashed ? { dashed: true } : {}) });
    } else if (kind === "square") {
      const A = mkPt({ t: "free", x: fromPt.x, y: fromPt.y }, "A");
      const B = mkPt({ t: "len", a: A, ang: 0, paramId: distP.id, lockedAng: false }, "B");
      const D = mkPt({ t: "rot", c: A, p: B, ang: -90, k: 1 }, "D");
      const C = mkPt({ t: "sum", a: B, b: D, c: A }, "C");
      shapes.push({ id: makeId("sh"), kind: "polygon", pts: [A, B, C, D], color: style.color, width: style.width, group });
    } else if (kind === "equilateral") {
      const A = mkPt({ t: "free", x: fromPt.x, y: fromPt.y }, "A");
      const B = mkPt({ t: "len", a: A, ang: 0, paramId: distP.id, lockedAng: false }, "B");
      const C = mkPt({ t: "rot", c: A, p: B, ang: -60, k: 1 }, "C");
      shapes.push({ id: makeId("sh"), kind: "polygon", pts: [A, B, C], color: style.color, width: style.width, group });
    } else if (kind === "cube" || kind === "pyramid4" || kind === "cone" || kind === "cylinder") {
      const prevA = STATE.builderVals.a, prevB = STATE.builderVals.b, prevH = STATE.builderVals.h, prevR = STATE.builderVals.r, prevAuto = STATE.builderVals.autoCreateParams;
      STATE.builderVals.a = distP.name;
      STATE.builderVals.b = distP.name;
      STATE.builderVals.r = distP.name;
      const hOther = getParams(pageIdx).find(p => p.unit === "dist" && p.id !== distP.id && (p.name === "h" || p.name.startsWith("h")));
      STATE.builderVals.h = kind === "cube" ? distP.name : (hOther ? hOther.name : `${distP.name}*1.3`);
      STATE.builderVals.autoCreateParams = false;
      buildParametric3D(kind === "cube" ? "box" : kind, fromPt);
      STATE.builderVals.a = prevA; STATE.builderVals.b = prevB; STATE.builderVals.h = prevH; STATE.builderVals.r = prevR; STATE.builderVals.autoCreateParams = prevAuto;
      return true;
    }

    mutateGeo(pageIdx, g => {
      const pm = { ...g.points };
      for (const p of pts) pm[p.id] = p;
      return { ...g, points: pm, shapes: [...g.shapes, ...shapes] };
    });
    showToast(`Đã vẽ theo tham số ${paramPlainText(getPage(pageIdx).geo, distP)} (đã khóa cố định)`);
    return true;
  }

  // Hook 3: onToolChange — instant-construct when user ALREADY selected point O + param a=2cm and clicks Circle tool, OR selected 2 points and clicks Locus tool!
  function onToolChange(ed, tool) {
    if (!ed || !tool) return;
    const pageIdx = currentPageIndex();

    if (tool.k === "geo" && tool.t === "locus") {
      const pg = getPage(pageIdx);
      const geo = pg && pg.geo;
      const armedParam = getSelectedParams(pageIdx).find(p => !p.expr);
      if (geo && STATE._lastSel && STATE._lastSel.page === pageIdx) {
        const pts = STATE._lastSel.points || [];
        const shs = STATE._lastSel.shapes || [];
        if (pts.length === 2 && shs.length === 0) {
          const [a, b] = pts;
          if (dependsOn(geo, a, b) && isDriverPoint(geo, b)) {
            STATE._lastSel = null;
            createPointLocus(pageIdx, a, "point", b);
            return;
          }
          if (dependsOn(geo, b, a) && isDriverPoint(geo, a)) {
            STATE._lastSel = null;
            createPointLocus(pageIdx, b, "point", a);
            return;
          }
        }
        if (pts.length === 1 && armedParam && pointDependsOnParam(geo, pts[0], armedParam.id)) {
          STATE._lastSel = null;
          createPointLocus(pageIdx, pts[0], "param", armedParam.id);
          return;
        }
      }
      if (armedParam && geo) {
        showToast(`Công cụ Quỹ tích (${paramPlainText(geo, armedParam)}) — bấm 1 điểm phụ thuộc vào ${armedParam.name}, hoặc bấm 2 điểm (điểm quỹ tích → điểm dẫn)`);
      } else {
        showToast("Công cụ Quỹ tích — bấm điểm cần vẽ quỹ tích rồi bấm điểm chuyển động (trên đường tròn / đoạn thẳng / đường thẳng)");
      }
      return;
    }

    const distP = getActiveParamByUnit(pageIdx, "dist");
    const angP = getActiveParamByUnit(pageIdx, "angle");
    if (!distP && !angP) return;

    // Note: setTool clears ed.sel for non-select tools, so we track lastSelPoints/lastSelShapes!
    if ((tool.k === "geo" && (tool.t === "circle" || tool.t === "circleRadius")) && distP) {
      if (STATE._lastSel && STATE._lastSel.page === pageIdx && STATE._lastSel.points.length === 1 && STATE._lastSel.shapes.length === 0) {
        const centerId = STATE._lastSel.points[0];
        STATE._lastSel = null;
        if (getPage(pageIdx)?.geo?.points?.[centerId]) {
          constructCircleByParam(ed, pageIdx, centerId, distP);
          return;
        }
      }
      showToast(`Đang dùng ${paramPlainText(getPage(pageIdx).geo, distP)} — bấm 1 điểm tâm O để vẽ ngay đường tròn R = ${distP.name}`);
    } else if ((tool.k === "geo" && tool.t === "segment") && distP) {
      showToast(`Đang dùng ${paramPlainText(getPage(pageIdx).geo, distP)} — bấm điểm gốc rồi bấm hướng để vẽ đoạn dài ${distP.name}`);
    } else if ((tool.k === "geo" && (tool.t === "angle" || tool.t === "angleMark")) && angP) {
      if (STATE._lastSel && STATE._lastSel.page === pageIdx && STATE._lastSel.shapes.length === 1) {
        const shId = STATE._lastSel.shapes[0];
        const sh = getPage(pageIdx)?.geo?.shapes?.find(s => s.id === shId && s.kind === "segment");
        if (sh) {
          STATE._lastSel = null;
          constructAngleByParam(ed, pageIdx, sh.pts[1], sh.pts[0], angP, distP);
          return;
        }
      }
      showToast(`Đang dùng ${paramPlainText(getPage(pageIdx).geo, angP)} — bấm 1 đoạn thẳng hoặc 2 điểm (cạnh → đỉnh) để dựng góc ${angP.name}`);
    }
  }

  // ==================== SELECTION TARGET DETECTION (FOR CONSTRAINTS TAB) ====================

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

    let length = null;
    if (typeof ed.lengthTarget === "function") {
      const lt = ed.lengthTarget();
      if (lt) {
        const pFrom = coords.get(lt.from), pTo = coords.get(lt.to);
        const curCm = pFrom && pTo ? K.Je(pFrom, pTo) / cm : 2;
        const ptTo = geo.points[lt.to], d = ptTo && ptTo.def;
        length = {
          pageIdx, from: lt.from, to: lt.to, radius: !!lt.radius, locked: !!lt.locked, curCm, def: d,
          paramId: d ? (d.t === "len" ? d.paramId : d.distParamId) || "" : "",
          expr: d ? (d.t === "len" ? d.expr : d.distExpr) || "" : "",
          lockedAng: !!(d && d.t === "len" && (d.lockedAng || d.angParamId || d.angExpr)),
          label: `${lt.radius ? "Bán kính" : "Đoạn"} ${ptName(geo, lt.from)}${ptName(geo, lt.to)}`
        };
      }
    }

    let angle = null;
    const selShapes = geo.shapes.filter(s => ed.sel.shapes.has(s.id));
    const selAngleShape = selShapes.find(s => s.kind === "angle" || s.kind === "right");
    let tri = null;
    if (selAngleShape && selAngleShape.pts.length >= 3) {
      tri = [selAngleShape.pts[0], selAngleShape.pts[1], selAngleShape.pts[2]];
    } else {
      const segs = selShapes.filter(s => s.kind === "segment" && s.pts.length === 2);
      if (segs.length === 2) {
        const [a1, b1] = segs[0].pts, [a2, b2] = segs[1].pts;
        if (a1 === a2) tri = [b1, a1, b2];
        else if (a1 === b2) tri = [b1, a1, a2];
        else if (b1 === a2) tri = [a1, b1, b2];
        else if (b1 === b2) tri = [a1, b1, a2];
      } else if (ed.sel.points.size === 3) {
        const arr = [...ed.sel.points];
        const polarPt = arr.find(id => geo.points[id]?.def?.t === "polar" && arr.includes(geo.points[id].def.o) && arr.includes(geo.points[id].def.ref));
        if (polarPt) {
          const d = geo.points[polarPt].def;
          tri = [d.ref, d.o, polarPt];
        } else {
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
      const pA = geo.points[A];
      if (pA && pA.def && pA.def.t === "polar" && pA.def.o === O && pA.def.ref === B) {
        [A, B] = [B, A];
      } else if (dependsOn(geo, O, B) || dependsOn(geo, A, B)) {
        if (!dependsOn(geo, O, A) && !dependsOn(geo, B, A)) [A, B] = [B, A];
      }
      const cA = coords.get(A), cO = coords.get(O), cB = coords.get(B);
      if (cA && cO && cB) {
        const base = Math.atan2(cA.y - cO.y, cA.x - cO.x);
        const cur = Math.atan2(cB.y - cO.y, cB.x - cO.x);
        let deg = ((base - cur) * 180 / Math.PI) % 360;
        if (deg < 0) deg += 360;
        const ptB = geo.points[B], dB = ptB && ptB.def;
        const isPolar = !!(dB && dB.t === "polar" && dB.o === O && dB.ref === A);
        angle = {
          pageIdx, A, O, B,
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

    let ratio = null;
    if (ed.sel.points.size === 1) {
      const id = [...ed.sel.points][0];
      const pt = geo.points[id];
      if (pt && pt.def && (pt.def.t === "on" || pt.def.t === "vec" || pt.def.t === "rot")) {
        ratio = { pageIdx, id, label: ptName(geo, id), def: pt.def };
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
          t: "len", a: from, ang,
          val: paramId || expr ? undefined : Number(val),
          paramId: paramId || undefined,
          expr: !paramId && expr ? String(expr).trim() : undefined,
          lockedAng: !!lockedAng
        };
      }
      return {
        ...geo, cmPx: cm,
        points: { ...geo.points, [to]: { ...geo.points[to], def: nextDef } }
      };
    }, { refreshSolids: true });

    showToast("Đã khóa cố định độ dài!");
    if (STATE.open) renderPanel();
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
          t: "len", a: pt.def.o,
          ang: O ? Math.atan2(pos.y - O.y, pos.x - O.x) : 0,
          val: pt.def.distVal, paramId: pt.def.distParamId, expr: pt.def.distExpr, lockedAng: false
        };
      } else if (mode === "dist" && pt.def.t === "polar" && pt.def.fixedAng) {
        const O = coords.get(pt.def.o);
        nd = {
          ...pt.def, fixedDist: false, distVal: undefined, distParamId: undefined, distExpr: undefined,
          curDistPx: O ? K.Je(O, pos) : 120
        };
      } else if (pt.def.t === "on" || pt.def.t === "vec" || pt.def.t === "rot") {
        nd = { ...pt.def };
        delete nd.kParamId; delete nd.kExpr; delete nd.angParamId; delete nd.angExpr; delete nd.distParamId; delete nd.distExpr; delete nd.distVal;
      }
      return { ...geo, points: { ...geo.points, [pointId]: { ...geo.points[pointId], def: nd } } };
    }, { refreshSolids: true });

    showToast("Đã mở khóa ràng buộc.");
    if (STATE.open) renderPanel();
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
        t: "polar", o: O, ref: A, fixedAng: true,
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
          shapes = [...shapes, {
            id: makeId("sh"), kind: isRight ? "right" : "angle", pts: [A, O, B],
            color: (ed && ed.shapeStyle && ed.shapeStyle.color) || "#1a1a1a",
            width: (ed && ed.shapeStyle && ed.shapeStyle.width) || 2.2
          }];
        }
      }
      return { ...geo, points: { ...geo.points, [B]: { ...geo.points[B], def: nd } }, shapes };
    }, { refreshSolids: true });

    showToast("Đã khóa cố định góc!");
    if (STATE.open) renderPanel();
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
      return { ...geo, points: { ...geo.points, [id]: { ...pt, def: nd } } };
    }, { refreshSolids: true });
    showToast("Đã gắn tham số tỉ số k!");
    if (STATE.open) renderPanel();
  }

  // ==================== PARAMETER CRUD ====================

  function defaultParamPos(pageIdx, count) {
    const ed = getEditor();
    if (!ed || !ed.scroller) return { x: 48, y: 92 + count * 46 };
    const z = ed.zoom || 1;
    const top = typeof ed.pageTop === "function" ? ed.pageTop(pageIdx) : 0;
    const visX = Math.max(36, ed.scroller.scrollLeft / z + 36);
    const visY = Math.max(92, (ed.scroller.scrollTop / z - top) + 92);
    return { x: Math.round(visX), y: Math.round(visY + count * 46) };
  }

  function upsertParam(pageIdx, paramObj) {
    let savedId = paramObj.id || makeId("pm");
    mutateGeo(pageIdx, geo => {
      const list = Array.isArray(geo.params) ? geo.params.slice() : [];
      const idx = list.findIndex(x => x.id === savedId);
      const prev = idx >= 0 ? list[idx] : null;
      const defPos = defaultParamPos(pageIdx, list.length);
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
        animDir: paramObj.animDir || 1,
        x: Number.isFinite(paramObj.x) ? paramObj.x : (prev && Number.isFinite(prev.x) ? prev.x : defPos.x),
        y: Number.isFinite(paramObj.y) ? paramObj.y : (prev && Number.isFinite(prev.y) ? prev.y : defPos.y)
      };
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      return { ...geo, params: list };
    }, { refreshSolids: true });
    if (STATE.open) renderPanel();
    return savedId;
  }

  function updateParamPosition(pageIdx, paramId, x, y, commit = false) {
    mutateGeo(pageIdx, geo => {
      const list = (geo.params || []).map(p => p.id === paramId ? { ...p, x, y } : p);
      return { ...geo, params: list };
    }, { live: !commit, emit: commit });
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
    STATE.selectedParamIds = STATE.selectedParamIds.filter(id => id !== paramId);

    mutateGeo(pageIdx, geo => {
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
      return { ...geo, points: pts, params: (geo.params || []).filter(x => x.id !== paramId) };
    }, { refreshSolids: true });
    if (STATE.open) renderPanel();
  }

  // ==================== PARAMETER ANIMATION LOOP ====================

  function ensureAnimLoop() {
    const pg = getPage();
    const anyParamAnim = pg && pg.geo && Array.isArray(pg.geo.params) && pg.geo.params.some(p => p.animating && !p.expr);
    if (!anyParamAnim) {
      if (STATE.rafId) { cancelAnimationFrame(STATE.rafId); STATE.rafId = null; }
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
      const activeParams = list.filter(p => p.animating && !p.expr);

      if (!activeParams.length) { STATE.rafId = null; return; }

      mutateGeo(pIdx, geo => {
        const nextParams = (geo.params || []).map(p => {
          if (!p.animating || p.expr) return p;
          const span = Math.max(0.1, (p.max ?? 10) - (p.min ?? 0));
          let dir = p.animDir || 1;
          let nv = (Number(p.value) || 0) + dir * span * 0.22 * dt;
          if (nv >= p.max) { nv = p.max; dir = -1; }
          else if (nv <= p.min) { nv = p.min; dir = 1; }
          nv = Math.round(nv * 1000) / 1000;
          return { ...p, value: nv, animDir: dir };
        });
        return { ...geo, params: nextParams };
      }, { live: true, refreshSolids: true });

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
  }

  function toggleParamAnim(pageIdx, paramId) {
    mutateGeo(pageIdx, geo => {
      const list = (geo.params || []).map(p => p.id === paramId ? { ...p, animating: !p.animating } : p);
      return { ...geo, params: list };
    }, { live: true });
    ensureAnimLoop();
    if (STATE.open) renderPanel();
  }

  // ==================== ON-CANVAS KATEX CHIPS LAYER ====================

  function pageToScreen(pageIdx, x, y) {
    const ed = getEditor();
    if (!ed || !ed.scroller) return null;
    const sr = ed.scroller.getBoundingClientRect();
    const z = ed.zoom || 1;
    const topOff = typeof ed.pageTop === "function" ? ed.pageTop(pageIdx) : (pageIdx * 1150);
    return {
      sx: sr.left + x * z - ed.scroller.scrollLeft,
      sy: sr.top + (y + topOff) * z - ed.scroller.scrollTop,
      zoom: z,
      scrollerRect: sr
    };
  }

  function renderLatexInto(el, geo, p) {
    const tex = paramToLatex(geo, p);
    if (el.dataset.tex === tex && el.dataset.katexDone === "1") return;
    el.dataset.tex = tex;
    const katexApi = window.katex;
    if (katexApi && typeof katexApi.render === "function") {
      try {
        katexApi.render(tex, el, { throwOnError: false, displayMode: false });
        el.dataset.katexDone = "1";
        return;
      } catch (_) {}
    }
    el.innerHTML = `<span class="mn-kp-fallback">${escapeHtml(paramPlainText(geo, p))}</span>`;
    el.dataset.katexDone = "0";
  }

  function renderCanvasChips(force = false) {
    const layer = document.getElementById("mn-param-canvas-layer");
    const ed = getEditor();
    if (!layer || !ed || !ed.doc || !ed.doc.pages) return;

    if (isLibraryOpen()) {
      layer.style.display = "none";
      return;
    }
    layer.style.display = "block";

    const selSet = new Set(STATE.selectedParamIds);
    const keepKeys = new Set();

    ed.doc.pages.forEach((pg, pIdx) => {
      const params = pg && pg.geo && Array.isArray(pg.geo.params) ? pg.geo.params : [];
      params.forEach((p, idx) => {
        const key = `${pIdx}:${p.id}`;
        const px = Number.isFinite(p.x) ? p.x : 48;
        const py = Number.isFinite(p.y) ? p.y : (44 + idx * 44);
        const pos = pageToScreen(pIdx, px, py);
        if (!pos) return;
        const sr = pos.scrollerRect;
        // Skip chips outside visible viewport vertically
        if (pos.sy < sr.top - 50 || pos.sy > sr.bottom + 20 || pos.sx < sr.left - 240 || pos.sx > sr.right + 40) {
          return;
        }
        keepKeys.add(key);

        let chip = layer.querySelector(`.mn-katex-param[data-key="${key}"]`);
        if (!chip) {
          chip = document.createElement("div");
          chip.className = "mn-katex-param";
          chip.dataset.key = key;
          chip.dataset.page = String(pIdx);
          chip.dataset.pid = p.id;
          chip.title = "Nháy để chọn tham số (kết hợp Đường tròn / Đoạn thẳng / Góc...) • Nháy đúp để mở bảng chỉnh sửa • Kéo để di chuyển";
          chip.innerHTML = `<span class="mn-kp-anim-dot"></span><span class="mn-kp-math"></span>`;
          attachChipInteractions(chip, pIdx, p.id);
          layer.appendChild(chip);
        }

        chip.style.left = `${Math.round(pos.sx)}px`;
        chip.style.top = `${Math.round(pos.sy)}px`;
        chip.style.transform = `scale(${Math.max(0.7, Math.min(1.5, pos.zoom))})`;
        chip.classList.toggle("selected", selSet.has(p.id));
        chip.classList.toggle("animating", !!p.animating);

        const mathSpan = chip.querySelector(".mn-kp-math");
        renderLatexInto(mathSpan, pg.geo, p);
      });
    });

    // Remove chips that no longer exist or scrolled offscreen
    layer.querySelectorAll(".mn-katex-param").forEach(el => {
      if (!keepKeys.has(el.dataset.key)) el.remove();
    });
    void force;
  }

  function attachChipInteractions(chip, pageIdx, paramId) {
    let dragState = null;

    chip.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const pg = getPage(pageIdx);
      const p = pg && pg.geo && (pg.geo.params || []).find(x => x.id === paramId);
      if (!p) return;
      const ed = getEditor();
      dragState = {
        sx: e.clientX, sy: e.clientY,
        origX: Number.isFinite(p.x) ? p.x : 48,
        origY: Number.isFinite(p.y) ? p.y : 44,
        zoom: (ed && ed.zoom) || 1,
        moved: false
      };
      chip.setPointerCapture(e.pointerId);
    });

    chip.addEventListener("pointermove", e => {
      if (!dragState) return;
      const dx = e.clientX - dragState.sx;
      const dy = e.clientY - dragState.sy;
      if (!dragState.moved && Math.hypot(dx, dy) < 5) return;
      dragState.moved = true;
      chip.classList.add("dragging");
      const nx = Math.max(8, Math.round(dragState.origX + dx / dragState.zoom));
      const ny = Math.max(8, Math.round(dragState.origY + dy / dragState.zoom));
      updateParamPosition(pageIdx, paramId, nx, ny, false);
    });

    chip.addEventListener("pointerup", e => {
      if (!dragState) return;
      const wasMoved = dragState.moved;
      const dx = e.clientX - dragState.sx;
      const dy = e.clientY - dragState.sy;
      const nx = Math.max(8, Math.round(dragState.origX + dx / dragState.zoom));
      const ny = Math.max(8, Math.round(dragState.origY + dy / dragState.zoom));
      chip.classList.remove("dragging");
      dragState = null;
      if (wasMoved) {
        updateParamPosition(pageIdx, paramId, nx, ny, true);
      } else {
        selectParam(pageIdx, paramId, true);
      }
    });

    chip.addEventListener("dblclick", e => {
      e.stopPropagation();
      e.preventDefault();
      // Keep this parameter selected & open full studio focused on it!
      if (!STATE.selectedParamIds.includes(paramId)) {
        selectParam(pageIdx, paramId, false);
      }
      STATE.focusedParamId = paramId;
      openPanel("params");
    });
  }

  function syncArmedBar() {
    const bar = document.getElementById("mn-param-armed-bar");
    if (!bar) return;
    const pIdx = currentPageIndex();
    const pg = getPage(pIdx);
    const selParams = getSelectedParams(pIdx);
    if (!selParams.length || isLibraryOpen()) {
      bar.classList.remove("open");
      return;
    }
    const geo = pg ? pg.geo : { params: [] };
    const badges = selParams.map(p => `<span class="mnp-armed-badge">${escapeHtml(paramPlainText(geo, p))}</span>`).join("");

    const hasDist = selParams.some(p => p.unit === "dist");
    const hasAng = selParams.some(p => p.unit === "angle");
    const hasNum = selParams.some(p => p.unit === "none");

    let hint = "Bấm công cụ ";
    const tools = [];
    if (hasDist) tools.push("Đường tròn", "Đoạn thẳng", "Hình vuông");
    if (hasAng) tools.push("Góc", "Phép quay");
    if (hasNum) tools.push("Phép vị tự");
    hint += tools.join(" / ") + " để dựng ngay • Nháy đúp để sửa";

    const targets = detectSelectionTargets();
    const canQuickBindLen = hasDist && targets.length;
    const canQuickBindAng = hasAng && targets.angle;

    // Detect if a selected point depends on one of the armed parameters -> quick Locus button!
    const ed = getEditor();
    let quickLocus = null;
    if (ed && ed.sel && ed.sel.page === pIdx && ed.sel.points.size === 1) {
      const ptId = [...ed.sel.points][0];
      const drvParam = selParams.find(p => !p.expr && pointDependsOnParam(geo, ptId, p.id));
      if (drvParam) quickLocus = { ptId, param: drvParam, ptLabel: ptName(geo, ptId) };
    }

    bar.innerHTML = `
      ${badges}
      <span class="mnp-armed-hint">${escapeHtml(hint)}</span>
      ${canQuickBindLen ? `<button type="button" class="mnp-armed-btn primary" id="mnp-armed-bind-len">🔒 Gắn vào ${escapeHtml(targets.length.label)}</button>` : ""}
      ${canQuickBindAng ? `<button type="button" class="mnp-armed-btn primary" id="mnp-armed-bind-ang">🔒 Gắn vào ${escapeHtml(targets.angle.label)}</button>` : ""}
      ${quickLocus ? `<button type="button" class="mnp-armed-btn primary" id="mnp-armed-locus">➰ Quỹ tích ${escapeHtml(quickLocus.ptLabel)} theo ${escapeHtml(quickLocus.param.name)}</button>` : ""}
      <button type="button" class="mnp-armed-btn" id="mnp-armed-edit" title="Mở bảng tham số đầy đủ">Bảng đầy đủ</button>
      <button type="button" class="mnp-armed-btn" id="mnp-armed-clear" title="Bỏ chọn tham số">✕</button>
    `;

    const bindLenBtn = bar.querySelector("#mnp-armed-bind-len");
    if (bindLenBtn) {
      bindLenBtn.addEventListener("click", () => {
        const dp = getActiveParamByUnit(pIdx, "dist");
        if (dp && targets.length) {
          applyLengthConstraint({ pageIdx: targets.length.pageIdx, from: targets.length.from, to: targets.length.to, paramId: dp.id, lockedAng: false });
        }
      });
    }
    const bindAngBtn = bar.querySelector("#mnp-armed-bind-ang");
    if (bindAngBtn) {
      bindAngBtn.addEventListener("click", () => {
        const ap = getActiveParamByUnit(pIdx, "angle");
        const dp = getActiveParamByUnit(pIdx, "dist");
        if (ap && targets.angle) {
          applyAngleConstraint({
            pageIdx: targets.angle.pageIdx, A: targets.angle.A, O: targets.angle.O, B: targets.angle.B,
            angParamId: ap.id, lockDist: !!dp, distParamId: dp ? dp.id : "", addMark: true
          });
        }
      });
    }
    const armedLocusBtn = bar.querySelector("#mnp-armed-locus");
    if (armedLocusBtn && quickLocus) {
      armedLocusBtn.addEventListener("click", () => {
        createPointLocus(pIdx, quickLocus.ptId, "param", quickLocus.param.id);
      });
    }
    bar.querySelector("#mnp-armed-edit").addEventListener("click", () => openPanel("params"));
    bar.querySelector("#mnp-armed-clear").addEventListener("click", () => clearSelectedParams());
    bar.classList.add("open");
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
      y: Math.max(120, Math.min(1100, Number.isFinite(cy) ? cy : 340))
    };
  }

  function resolveSpec(geo, paramsOut, rawStr, defaultName, unit, autoCreate, pageIdx) {
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
        let nm = defaultName;
        const used = new Set(paramsOut.map(p => p.name));
        if (used.has(nm)) {
          let k = 1;
          while (used.has(`${defaultName}${k}`)) k++;
          nm = `${defaultName}${k}`;
        }
        const pid = makeId("pm");
        const pos = defaultParamPos(pageIdx, paramsOut.length);
        paramsOut.push({
          id: pid, name: nm, value: numVal, unit,
          min: unit === "angle" ? 10 : Math.max(0.5, Math.round(numVal * 0.25 * 10) / 10),
          max: unit === "angle" ? 170 : Math.max(10, Math.round(numVal * 2.5 * 10) / 10),
          step: unit === "angle" ? 1 : 0.1,
          expr: "", animating: false, animDir: 1, x: pos.x, y: pos.y
        });
        return { paramId: pid, expr: nm, val: numVal };
      }
      return { paramId: undefined, expr: undefined, val: numVal };
    }
    const evaled = K ? K._mnEvalExpr(s, K._mnBuildParamEnv({ params: paramsOut })) : NaN;
    return { paramId: undefined, expr: s, val: Number.isFinite(evaled) ? evaled : (unit === "angle" ? 60 : 3) };
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
    const newPts = [], newShapes = [];

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

    const specA = resolveSpec(pg.geo, paramsOut, v.a, "a", "dist", auto, pageIdx);
    const specB = (kind !== "segment" && kind !== "circle") ? resolveSpec(pg.geo, paramsOut, v.b, "b", "dist", auto, pageIdx) : null;
    const specC = (kind === "tri_sss") ? resolveSpec(pg.geo, paramsOut, v.c, "c", "dist", auto, pageIdx) : null;
    const specR = (kind === "circle") ? resolveSpec(pg.geo, paramsOut, v.r, "r", "dist", auto, pageIdx) : null;
    const specAng = (kind === "angle" || kind === "tri_sas" || kind === "parallelogram")
      ? resolveSpec(pg.geo, paramsOut, v.ang, "α", "angle", auto, pageIdx) : null;

    const lenDef = (anchor, spec, angRad, lockedAng = false) => ({
      t: "len", a: anchor, ang: angRad,
      val: spec.paramId || spec.expr ? undefined : spec.val,
      paramId: spec.paramId, expr: !spec.paramId ? spec.expr : undefined, lockedAng
    });

    const polarDef = (O, Ref, angSpec, distSpec, fixedDist = true) => ({
      t: "polar", o: O, ref: Ref, fixedAng: true,
      angVal: angSpec.paramId || angSpec.expr ? undefined : angSpec.val,
      angParamId: angSpec.paramId, angExpr: !angSpec.paramId ? angSpec.expr : undefined,
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
      addSh("segment", [O, A]); addSh("segment", [O, B]);
      addSh(Math.abs(Math.abs(specAng.val) - 90) < 0.05 ? "right" : "angle", [A, O, B]);
    } else if (kind === "circle") {
      const O = addPt({ t: "free", x: center.x, y: center.y }, "O");
      const R = addPt(lenDef(O, specR, 0, false), null, false);
      addSh("circle", [O, R]);
    } else if (kind === "tri_sas") {
      const A = addPt({ t: "free", x: center.x - (specA.val || 4) * cm * 0.5, y: center.y + 60 }, "A");
      const B = addPt(lenDef(A, specA, 0, false), "B");
      const C = addPt(polarDef(A, B, specAng, specB, true), "C");
      addSh("polygon", [A, B, C]);
      addSh(Math.abs(Math.abs(specAng.val) - 90) < 0.05 ? "right" : "angle", [B, A, C]);
    } else if (kind === "tri_sss") {
      if (specA.val + specB.val <= specC.val || specA.val + specC.val <= specB.val || specB.val + specC.val <= specA.val) {
        showToast("3 cạnh không thỏa bất đẳng thức tam giác (a + b > c)!"); return;
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
      addSh("polygon", [A, B, C, D]); addSh("right", [B, A, D], { aux: true });
    } else if (kind === "parallelogram") {
      const A = addPt({ t: "free", x: center.x - (specA.val || 4) * cm * 0.55, y: center.y + 60 }, "A");
      const B = addPt(lenDef(A, specA, 0, false), "B");
      const D = addPt(polarDef(A, B, specAng, specB, true), "D");
      const C = addPt({ t: "sum", a: B, b: D, c: A }, "C");
      addSh("polygon", [A, B, C, D]); addSh("angle", [B, A, D], { aux: true });
    }

    mutateGeo(pageIdx, geo => {
      const ptsMap = { ...geo.points };
      for (const p of newPts) ptsMap[p.id] = p;
      return { ...geo, cmPx: cm, params: paramsOut, points: ptsMap, shapes: [...geo.shapes, ...newShapes] };
    });

    ed.setTool({ k: "geo", t: "move" });
    ed.selectGeo(pageIdx, newPts.filter(p => p.show).map(p => p.id), newShapes.map(s => s.id));
    showToast("Đã dựng hình 2D chuẩn tham số!");
    if (STATE.open) renderPanel();
  }

  function buildParametric3D(kind, anchorOverride) {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !K) return;
    const pageIdx = currentPageIndex();
    const pg = getPage(pageIdx);
    if (!pg) return;
    const cm = getCmPx();
    const center = anchorOverride || getViewportCenterOnPage(pageIdx);
    const v = STATE.builderVals;
    const auto = !!v.autoCreateParams;
    const style = ed.shapeStyle || { color: "#1a1a1a", width: 2.4 };
    const group = makeId("grp");
    const solidId = makeId("sh");

    const paramsOut = Array.isArray(pg.geo.params) ? pg.geo.params.slice() : [];
    const nameGen = K.yc(pg.geo);
    const newPts = [], newShapes = [];

    const specA = (kind !== "cone" && kind !== "cylinder") ? resolveSpec(pg.geo, paramsOut, v.a, "a", "dist", auto, pageIdx) : null;
    const specB = (kind === "pyramid4Right" || kind === "pyramid3" || kind === "box" || kind === "prism3")
      ? resolveSpec(pg.geo, paramsOut, v.b, "b", "dist", auto, pageIdx) : null;
    const specH = resolveSpec(pg.geo, paramsOut, v.h, "h", "dist", auto, pageIdx);
    const specR = (kind === "cone" || kind === "cylinder") ? resolveSpec(pg.geo, paramsOut, v.r, "r", "dist", auto, pageIdx) : null;
    const specAng = (kind === "pyramid3" || kind === "prism3")
      ? resolveSpec(pg.geo, paramsOut, v.ang, "α", "angle", auto, pageIdx) : null;

    const ex = (spec, fallback = "0") => spec ? (spec.expr || String(spec.val)) : fallback;
    const eA = ex(specA, "4"), eB = ex(specB, eA), eH = ex(specH, "5"), eR = ex(specR, "2.5"), eAng = ex(specAng, "60");
    const isRound = kind === "cone" || kind === "cylinder";
    const viewMat = isRound ? K.NS : K.wr;

    const anchorX = anchorOverride ? anchorOverride.x : (center.x - ((specA ? specA.val : (specR ? specR.val * 0.5 : 3)) * cm * 0.55));
    const anchorY = anchorOverride ? anchorOverride.y : (center.y + ((specH ? specH.val : 4) * cm * 0.45));
    const addAnchor = (label) => {
      const id = makeId("pt");
      newPts.push({ id, def: { t: "free", x: anchorX, y: anchorY }, z: 0, label: nameGen(label), show: true, group });
      return id;
    };
    const addP3 = (oId, vx, vy, vz, label, show = true) => {
      const id = makeId("pt");
      newPts.push({
        id, def: { t: "p3d", o: oId, solidId, vx: String(vx), vy: String(vy), vz: String(vz), view: viewMat },
        label: label === null ? "" : nameGen(label), show: show && label !== null, group
      });
      return id;
    };
    const addSeg = (p1, p2, dashed = false, aux = false) => {
      newShapes.push({
        id: makeId("sh"), kind: "segment", pts: [p1, p2], color: style.color, width: style.width, group,
        ...(dashed ? { dashed: true } : {}), ...(aux ? { aux: true } : {})
      });
    };

    if (kind === "pyramid4" || kind === "pyramid4Right") {
      const bExpr = kind === "pyramid4" ? eA : eB;
      const B = addAnchor("B"), C = addP3(B, eA, "0", "0", "C"), D = addP3(B, eA, bExpr, "0", "D"), A = addP3(B, "0", bExpr, "0", "A");
      const S = kind === "pyramid4" ? addP3(B, `(${eA})/2`, `(${bExpr})/2`, eH, "S") : addP3(B, "0", bExpr, eH, "S");
      addSeg(B, C); addSeg(C, D); addSeg(S, B); addSeg(S, C); addSeg(S, D);
      addSeg(A, B, true); addSeg(A, D, true); addSeg(S, A, true);
      if (kind === "pyramid4") {
        const O = makeId("pt");
        newPts.push({ id: O, def: { t: "mid", a: A, b: C }, label: nameGen("O"), show: true, group });
        addSeg(A, C, true, true); addSeg(B, D, true, true); addSeg(S, O, true, true);
      } else {
        newShapes.push({ id: makeId("sh"), kind: "right", pts: [S, A, B], color: style.color, width: style.width, group, aux: true });
      }
      newShapes.push({
        id: solidId, kind: "solid", pts: [B, C, D, A, S], color: style.color, width: style.width, group,
        solid: { of: "pyramid4", view: viewMat, turn: K.Hd, faces: [[0,1,2,3],[4,0,1],[4,1,2],[4,2,3],[4,3,0]] }
      });
    } else if (kind === "pyramid3") {
      const B = addAnchor("B"), C = addP3(B, eA, "0", "0", "C");
      const ax = `(${eB})*cos(${eAng})`, ay = `(${eB})*sin(${eAng})`;
      const A = addP3(B, ax, ay, "0", "A");
      const S = v.rightBase ? addP3(B, ax, ay, eH, "S") : addP3(B, `((${eA})+(${ax}))/3`, `(${ay})/3`, eH, "S");
      addSeg(B, C); addSeg(B, A); addSeg(C, A, true); addSeg(S, B); addSeg(S, C); addSeg(S, A);
      if (v.rightBase) newShapes.push({ id: makeId("sh"), kind: "right", pts: [S, A, B], color: style.color, width: style.width, group, aux: true });
      newShapes.push({
        id: solidId, kind: "solid", pts: [B, C, A, S], color: style.color, width: style.width, group,
        solid: { of: "pyramid3", view: viewMat, turn: K.Hd, faces: [[0,1,2],[3,0,1],[3,1,2],[3,2,0]] }
      });
    } else if (kind === "box") {
      const A = addAnchor("A"), B = addP3(A, eA, "0", "0", "B"), C = addP3(A, eA, eB, "0", "C"), D = addP3(A, "0", eB, "0", "D");
      const A1 = addP3(A, "0", "0", eH, "A'"), B1 = addP3(A, eA, "0", eH, "B'"), C1 = addP3(A, eA, eB, eH, "C'"), D1 = addP3(A, "0", eB, eH, "D'");
      addSeg(A, B); addSeg(B, C); addSeg(C, D, true); addSeg(D, A, true);
      addSeg(A1, B1); addSeg(B1, C1); addSeg(C1, D1); addSeg(D1, A1);
      addSeg(A, A1); addSeg(B, B1); addSeg(C, C1); addSeg(D, D1, true);
      newShapes.push({
        id: solidId, kind: "solid", pts: [A, B, C, D, A1, B1, C1, D1], color: style.color, width: style.width, group,
        solid: { of: "box", view: viewMat, turn: K.Hd, faces: K.vM }
      });
    } else if (kind === "prism3") {
      const B = addAnchor("B"), C = addP3(B, eA, "0", "0", "C");
      const ax = `(${eB})*cos(${eAng})`, ay = `(${eB})*sin(${eAng})`;
      const A = addP3(B, ax, ay, "0", "A");
      const B1 = addP3(B, "0", "0", eH, "B'"), C1 = addP3(B, eA, "0", eH, "C'"), A1 = addP3(B, ax, ay, eH, "A'");
      addSeg(B, C); addSeg(C, A, true); addSeg(A, B);
      addSeg(B1, C1); addSeg(C1, A1); addSeg(A1, B1);
      addSeg(B, B1); addSeg(C, C1); addSeg(A, A1, true);
      newShapes.push({
        id: solidId, kind: "solid", pts: [B, C, A, B1, C1, A1], color: style.color, width: style.width, group,
        solid: { of: "prism3", view: viewMat, turn: K.Hd, faces: K.DN }
      });
    } else if (kind === "cone" || kind === "cylinder") {
      const O = addAnchor("O"), R = addP3(O, eR, "0", "0", "R"), Top = addP3(O, "0", "0", eH, kind === "cone" ? "S" : "O'");
      newShapes.push({ id: makeId("sh"), kind, pts: [O, R, Top], color: style.color, width: style.width, group });
      addSeg(O, R, true, true); addSeg(O, Top, true, true);
      newShapes.push({
        id: solidId, kind: "solid", pts: [O, R, Top], color: style.color, width: style.width, group,
        solid: { of: kind, view: K.NS, turn: K.Hd }
      });
    }

    mutateGeo(pageIdx, geo => {
      const ptsMap = { ...geo.points };
      for (const p of newPts) ptsMap[p.id] = p;
      return { ...geo, cmPx: cm, params: paramsOut, points: ptsMap, shapes: [...geo.shapes, ...newShapes] };
    }, { refreshSolids: true });

    ed.setTool({ k: "geo", t: "move" });
    ed.selectGeo(pageIdx, newPts.filter(p => p.show).map(p => p.id), newShapes.map(s => s.id));
    showToast("Đã dựng hình 3D chuẩn tỉ lệ tham số!");
    if (STATE.open) renderPanel();
  }

  // ==================== LIVE LOCUS PREVIEW & HOVER HIGHLIGHT OVERLAY (UN-CACHED 60FPS PASS) ====================

  function drawInteractiveOverlay(ctx, geo, coords, pageIdx) {
    if (!geo || !geo.points || !coords) return;
    const K = getKernel();
    const ed = getEditor();
    const hiColor = (typeof globalThis.__mnHi === "function") ? globalThis.__mnHi() : "#2563eb";
    const hiSoft = (typeof globalThis.__mnHi === "function") ? globalThis.__mnHi(0.24) : "rgba(37, 99, 235, 0.24)";
    const hiMid = (typeof globalThis.__mnHi === "function") ? globalThis.__mnHi(0.55) : "rgba(37, 99, 235, 0.55)";

    const drawPillBadge = (x, y, text, bg, border, fg) => {
      ctx.save();
      ctx.setLineDash([]);
      ctx.font = "600 11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      const tw = ctx.measureText(text).width;
      const bw = tw + 12, bh = 20;
      const bx = x - bw / 2, by = y - bh - 12;
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 6);
      else ctx.rect(bx, by, bw, bh);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, by + bh / 2 + 0.5);
      ctx.restore();
    };

    const drawGlowPoint = (pos, color, soft, badgeText, badgeBg, badgeBorder, badgeFg) => {
      if (!pos) return;
      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = soft;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
      if (badgeText) {
        drawPillBadge(pos.x, pos.y, badgeText, badgeBg || "rgba(239, 246, 255, 0.96)", badgeBorder || color, badgeFg || color);
      }
    };

    const drawGlowDriverPath = (drvInfo) => {
      if (!drvInfo) return;
      const drawStrokeGlow = (drawFn) => {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([]);
        ctx.strokeStyle = hiSoft;
        ctx.lineWidth = 10;
        drawFn();
        ctx.stroke();
        ctx.strokeStyle = hiColor;
        ctx.globalAlpha = 0.92;
        ctx.lineWidth = 3.2;
        drawFn();
        ctx.stroke();
        ctx.restore();
      };

      const kind = drvInfo.kind;
      const pts = Array.isArray(drvInfo.pts) ? drvInfo.pts : [];
      if (kind === "circle" && pts.length >= 2) {
        const pO = coords.get(pts[0]), pR = coords.get(pts[1]);
        if (pO && pR) {
          const r = Math.hypot(pR.x - pO.x, pR.y - pO.y);
          if (r > 1) drawStrokeGlow(() => { ctx.beginPath(); ctx.arc(pO.x, pO.y, r, 0, Math.PI * 2); });
        }
      } else if ((kind === "segment" || kind === "line" || kind === "ray" || kind === "vec") && pts.length >= 2) {
        const pA = coords.get(pts[0]), pB = coords.get(pts[1]);
        if (pA && pB) {
          const dx = pB.x - pA.x, dy = pB.y - pA.y, L = Math.hypot(dx, dy);
          if (L > 1e-4) {
            const ux = dx / L, uy = dy / L;
            const ext = kind === "segment" ? 0 : 280;
            const x0 = kind === "line" || kind === "vec" ? pA.x - ux * ext : pA.x;
            const y0 = kind === "line" || kind === "vec" ? pA.y - uy * ext : pA.y;
            const x1 = kind === "segment" ? pB.x : pB.x + ux * ext;
            const y1 = kind === "segment" ? pB.y : pB.y + uy * ext;
            drawStrokeGlow(() => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); });
          }
        }
      } else if (kind === "polygon" && pts.length >= 3) {
        const pArr = pts.map(id => coords.get(id)).filter(Boolean);
        if (pArr.length >= 3) {
          drawStrokeGlow(() => {
            ctx.beginPath();
            pArr.forEach((p, idx) => idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.closePath();
          });
        }
      } else if (kind === "locus" && drvInfo.locusId && K && typeof K._mnLocusStrokes === "function") {
        const sh = (geo.shapes || []).find(s => s.id === drvInfo.locusId);
        if (sh) {
          const stList = K._mnLocusStrokes(geo, sh, coords);
          if (stList && stList.length) {
            drawStrokeGlow(() => {
              ctx.beginPath();
              for (const st of stList) {
                if (!st.pts || st.pts.length < 2) continue;
                st.pts.forEach((p, idx) => idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
                if (st.closed) ctx.closePath();
              }
            });
          }
        }
      }
    };

    const drawPreviewLocus = (tracedId, driverObj, strong) => {
      if (!K || typeof K._mnLocusStrokes !== "function" || !tracedId || !driverObj) return;
      const previewShape = {
        id: `_prev_${tracedId}_${driverObj.id}`,
        kind: "locus",
        pts: driverObj.type === "point" ? [tracedId, driverObj.id] : [tracedId],
        locus: {
          mode: "point",
          driverType: driverObj.type,
          ...(driverObj.type === "param" ? { paramId: driverObj.id } : {}),
          samples: 140
        }
      };
      const strokes = K._mnLocusStrokes(geo, previewShape, coords);
      if (!strokes || !strokes.length) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (strong) {
        ctx.strokeStyle = "rgba(225, 29, 72, 0.22)";
        ctx.lineWidth = 7;
        ctx.setLineDash([]);
        for (const st of strokes) {
          if (!st.pts || st.pts.length < 2) continue;
          ctx.beginPath();
          st.pts.forEach((p, idx) => idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          if (st.closed) ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = strong ? 2.6 : 1.9;
      ctx.globalAlpha = strong ? 0.85 : 0.45;
      ctx.setLineDash([7, 5]);
      for (const st of strokes) {
        if (!st.pts || st.pts.length < 2) continue;
        ctx.beginPath();
        st.pts.forEach((p, idx) => idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        if (st.closed) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    };

    // 0. Hover highlight from Locus Driver Popover or Constraints list
    const hh = STATE.hoverHighlight;
    if (hh && (pageIdx === undefined || pageIdx === hh.pageIdx)) {
      if (hh.kind === "locusDriver" && hh.act && hh.driver) {
        const d = hh.driver;
        if (d.type === "point") {
          const drvInfo = d.drv || resolveDriver(geo, d.id);
          drawGlowDriverPath(drvInfo);
          drawGlowPoint(
            coords.get(d.id),
            hiColor,
            hiSoft,
            `Điểm dẫn ${d.shortName}`,
            "rgba(239, 246, 255, 0.96)",
            hiColor,
            "#1d4ed8"
          );
        }
        if (hh.act.kind === "createPoint" && hh.act.tracedId) {
          drawPreviewLocus(hh.act.tracedId, d, true);
          drawGlowPoint(
            coords.get(hh.act.tracedId),
            "#e11d48",
            "rgba(225, 29, 72, 0.22)",
            `Điểm ${ptName(geo, hh.act.tracedId)}`,
            "rgba(255, 241, 242, 0.96)",
            "#e11d48",
            "#be123c"
          );
        }
      } else if (hh.kind === "point" && hh.pointId) {
        const pos = coords.get(hh.pointId);
        if (pos) {
          drawGlowPoint(pos, hiColor, hiSoft, ptName(geo, hh.pointId), "rgba(239, 246, 255, 0.96)", hiColor, "#1d4ed8");
        }
      }
    }

    // 1. Live locus preview & driver highlight when user is actively using the Quỹ tích (locus) tool
    if (ed && ed.tool && ed.tool.k === "geo" && ed.tool.t === "locus" && K && typeof K._mnLocusStrokes === "function") {
      const pickedPtId = ed.picks && ed.picks.page === pageIdx && Array.isArray(ed.picks.list) && ed.picks.list.length === 1 && ed.picks.list[0].kind === "point"
        ? ed.picks.list[0].id
        : null;
      const hoverPtId = ed.hover && ed.hover.page === pageIdx && ed.hover.point ? ed.hover.point : null;
      const hoverShId = ed.hover && ed.hover.page === pageIdx && ed.hover.shape ? ed.hover.shape : null;
      const candId = pickedPtId || hoverPtId;
      if (candId && geo.points[candId]) {
        const drivers = listValidDriversForPoints(geo, [candId]);
        if (drivers.length > 0) {
          let activeDrv = drivers[0];
          if (pickedPtId) {
            const byPt = hoverPtId && drivers.find(d => d.type === "point" && d.id === hoverPtId);
            const hoverSh = !byPt && hoverShId ? (geo.shapes || []).find(s => s.id === hoverShId) : null;
            const bySh = hoverSh ? matchDriverOnShape(geo, drivers, hoverSh) : null;
            if (byPt) activeDrv = byPt;
            else if (bySh) activeDrv = bySh;
          }

          drawPreviewLocus(candId, activeDrv, !!pickedPtId);

          if (pickedPtId && activeDrv.type === "point") {
            drawGlowDriverPath(activeDrv.drv || resolveDriver(geo, activeDrv.id));
          }

          for (const d of drivers) {
            if (d.type !== "point") continue;
            const dPos = coords.get(d.id);
            if (!dPos) continue;
            const isActive = d === activeDrv;
            if (isActive && pickedPtId) {
              drawGlowPoint(dPos, hiColor, hiSoft, `Điểm dẫn ${d.shortName}`, "rgba(239, 246, 255, 0.96)", hiColor, "#1d4ed8");
            } else {
              ctx.save();
              ctx.strokeStyle = isActive ? hiColor : hiMid;
              ctx.lineWidth = isActive ? 2.2 : 1.7;
              ctx.setLineDash([3.5, 2.5]);
              ctx.beginPath();
              ctx.arc(dPos.x, dPos.y, 11, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
              if (pickedPtId) {
                drawPillBadge(dPos.x, dPos.y, `Điểm dẫn ${d.shortName}`, "rgba(248, 250, 252, 0.94)", hiMid, "#1e40af");
              }
            }
          }
        }
      }
    }
  }

  function drawOverlay(ctx, geo, coords) {
    if (!geo || !geo.points || !coords) return;
    if (!STATE.showLabels) return;
    const K = getKernel();
    if (!K) return;
    const params = Array.isArray(geo.params) ? geo.params : [];
    const paramById = new Map(params.map(p => [p.id, p]));

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
      if (d.t === "len" && pt.show) {
        const A = coords.get(d.a), B = coords.get(pt.id);
        if (!A || !B) continue;
        const val = K._mnGeoVal(geo, d.paramId, d.expr, d.val);
        const p = d.paramId ? paramById.get(d.paramId) : null;
        const label = p ? `${p.name} = ${fmtNum(val, 2)} cm` : (d.expr ? `${d.expr} = ${fmtNum(val, 2)} cm` : `${fmtNum(val, 2)} cm 🔒`);
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
        drawTag(mx - (dy / L) * 16, my + (dx / L) * 16, label);
      } else if (d.t === "polar" && pt.show) {
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
  }

  // ==================== UI DOM CONSTRUCTION (NO CORNER PILL!) ====================

  function ensureUI() {
    if (!document.getElementById("mn-param-canvas-layer")) {
      const layer = document.createElement("div");
      layer.id = "mn-param-canvas-layer";
      document.body.appendChild(layer);
    }

    if (!document.getElementById("mn-param-armed-bar")) {
      const bar = document.createElement("div");
      bar.id = "mn-param-armed-bar";
      bar.addEventListener("pointerdown", e => e.stopPropagation());
      document.body.appendChild(bar);
    }

    if (!document.getElementById("mn-param-panel")) {
      const panel = document.createElement("div");
      panel.id = "mn-param-panel";
      panel.addEventListener("pointerdown", e => e.stopPropagation());
      panel.innerHTML = `
        <div class="mnp-header" id="mnp-drag-handle">
          <div class="mnp-title-wrap">
            <span class="mnp-title-icon">t₁</span>
            <span class="mnp-title">Tham số</span>
          </div>
          <div class="mnp-head-actions">
            <button type="button" class="mnp-icon-btn primary" id="mnp-btn-new" title="Tạo tham số mới">+ Mới</button>
            <button type="button" class="mnp-icon-btn" id="mnp-btn-labels" title="Bật/Tắt nhãn độ dài & góc trên cạnh">Nhãn</button>
            <button type="button" class="mnp-icon-btn" id="mnp-btn-close" title="Đóng bảng (tham số vẫn hiện dạng KaTeX trên bảng)">✕</button>
          </div>
        </div>
        <div class="mnp-tabs">
          <button type="button" class="mnp-tab active" data-tab="params">Tham số <span class="mnp-tab-count" id="mnp-cnt-params">0</span></button>
          <button type="button" class="mnp-tab" data-tab="constraints">Ràng buộc <span class="mnp-tab-count" id="mnp-cnt-cons">0</span></button>
          <button type="button" class="mnp-tab" data-tab="build">2D/3D</button>
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
      panel.querySelector("#mnp-btn-close").addEventListener("click", () => closePanel());

      panel.querySelectorAll(".mnp-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          STATE.tab = btn.dataset.tab;
          renderPanel();
        });
      });

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
            <span id="mnp-modal-title">Tham số mới</span>
            <button type="button" class="mnp-icon-btn" id="mnp-modal-x">✕</button>
          </div>
          <div class="mnp-modal-body">
            <div class="mnp-gsp-eq">
              <div class="mnp-field">
                <label>Tên</label>
                <input type="text" class="mnp-input" id="mnp-m-name" placeholder="a" autocomplete="off" spellcheck="false" />
              </div>
              <div class="mnp-gsp-eq-sign">=</div>
              <div class="mnp-field">
                <label>Giá trị / Công thức</label>
                <input type="text" class="mnp-input" id="mnp-m-val" placeholder="2,00 hoặc a*sqrt(2)" autocomplete="off" spellcheck="false" />
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
            <div class="mnp-hint">Sau khi bấm <b>OK</b>, tham số hiện gọn dạng công thức KaTeX ngay trên bảng. <b>Bấm 1 lần</b> để chọn kết hợp công cụ vẽ • <b>Nháy đúp</b> để mở bảng đầy đủ.</div>
          </div>
          <div class="mnp-modal-foot">
            <button type="button" class="mnp-btn" id="mnp-modal-full" title="Mở bảng quản lý tham số & dựng 2D/3D đầy đủ">Bảng đầy đủ</button>
            <div class="mnp-modal-foot-right">
              <button type="button" class="mnp-btn" id="mnp-modal-cancel">Hủy</button>
              <button type="button" class="mnp-btn primary" id="mnp-modal-ok">OK</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(bd);

      bd.querySelector("#mnp-modal-x").addEventListener("click", closeParamModal);
      bd.querySelector("#mnp-modal-cancel").addEventListener("click", closeParamModal);
      bd.querySelector("#mnp-modal-full").addEventListener("click", () => { closeParamModal(); openPanel("params"); });
      bd.addEventListener("click", e => { if (e.target === bd) closeParamModal(); });

      bd.querySelectorAll("#mnp-name-chips .mnp-chip").forEach(ch => {
        ch.addEventListener("click", () => {
          const nm = ch.dataset.nm;
          bd.querySelector("#mnp-m-name").value = nm;
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
              if (vInp.value === "1,00" || vInp.value === "2,00" || vInp.value === "3,00") vInp.value = "60";
            } else if (u === "dist") {
              bd.querySelector("#mnp-m-min").value = "0.5";
              bd.querySelector("#mnp-m-max").value = "12";
              bd.querySelector("#mnp-m-step").value = "0.1";
              const vInp = bd.querySelector("#mnp-m-val");
              if (vInp.value === "1,00" || vInp.value === "60") vInp.value = "2,00";
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
    if (rad) { rad.checked = true; rad.dispatchEvent(new Event("change")); }
  }

  function updateModalPreview() {
    const bd = document.getElementById("mn-param-modal-backdrop");
    if (!bd) return;
    const raw = bd.querySelector("#mnp-m-val").value.trim();
    const prev = bd.querySelector("#mnp-m-preview");
    const unit = bd.querySelector('input[name="mnp-unit"]:checked')?.value || "none";
    const num = Number(raw.replace(",", "."));
    if (!raw || Number.isFinite(num)) { prev.style.display = "none"; return; }
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

    bd.querySelector("#mnp-modal-title").textContent = existing ? `Sửa tham số ${existing.name}` : "Tham số mới";
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
      const used = new Set(params.map(p => p.name));
      nmInp.value = !used.has("a") ? "a" : nextDefaultParamName(params);
      const u = presetUnit || "dist";
      const rad = bd.querySelector(`input[name="mnp-unit"][value="${u}"]`);
      if (rad) rad.checked = true;
      valInp.value = presetVal != null ? fmtNum(presetVal, u === "angle" ? 1 : 2) : (u === "angle" ? "60" : u === "dist" ? "2,00" : "1,00");
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
      if (!Number.isFinite(ev)) { showToast("Giá trị / công thức không hợp lệ!"); return; }
      value = ev; expr = rawVal;
    }

    const pIdx = currentPageIndex();
    const isEdit = !!STATE.editingParamId;
    const savedId = upsertParam(pIdx, {
      id: STATE.editingParamId || undefined,
      name, value, expr, unit,
      min: Number.isFinite(min) ? Math.min(min, value) : 0,
      max: Number.isFinite(max) ? Math.max(max, value) : Math.max(10, value * 2),
      step: Number.isFinite(step) && step > 0 ? step : 0.1
    });

    closeParamModal();
    // Auto-select the newly created KaTeX parameter chip on canvas WITHOUT opening the full floating panel!
    if (!isEdit) {
      selectParam(pIdx, savedId, false);
      showToast(`Đã tạo ${name} = ${fmtNum(value, unit === "angle" ? 1 : 2)}${unitSuffix(unit)} trên bảng! Nháy đúp để sửa hoặc bấm công cụ vẽ để dùng ngay.`);
    } else {
      showToast(`Đã cập nhật tham số ${name} = ${fmtNum(value, unit === "angle" ? 1 : 2)}${unitSuffix(unit)}`);
    }
  }

  // ==================== RENDER FULL STUDIO PANEL TABS ====================

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
        const circ = geo.shapes.find(s => s.kind === "circle" && s.pts[0] === d.a && s.pts[1] === pt.id);
        list.push({
          pointId: pt.id, kind: "len",
          title: `${circ ? `Đường tròn (${ptName(geo, d.a)}) R` : `Đoạn ${ptName(geo, d.a)}${ptName(geo, pt.id)}`} = ${pm ? pm.name : (d.expr || fmtNum(val, 2) + " cm")}`,
          sub: `${fmtNum(val, 2)} cm • ${d.lockedAng ? "Khóa cứng cả hướng" : "Khóa cố định độ dài"}`
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
            pointId: pt.id, kind: "polar", title: parts.join(" & "),
            sub: d.fixedAng && d.fixedDist ? "Khóa cứng góc & độ dài" : (d.fixedAng ? "Khóa góc (chỉ trượt dọc tia)" : "Khóa độ dài")
          });
        }
      } else if (d.t === "p3d" && pt.show) {
        list.push({
          pointId: pt.id, kind: "p3d",
          title: `Đỉnh 3D ${ptName(geo, pt.id)} (${d.vx}, ${d.vy}, ${d.vz})`,
          sub: `Khóa tỉ lệ 3D theo gốc ${ptName(geo, d.o)}`
        });
      } else if ((d.t === "on" || d.t === "vec" || d.t === "rot") && (d.kParamId || d.kExpr || d.angParamId || d.angExpr || d.distParamId)) {
        const pm = pMap.get(d.kParamId || d.angParamId || d.distParamId);
        list.push({
          pointId: pt.id, kind: d.t,
          title: `Điểm ${ptName(geo, pt.id)} theo ${pm ? pm.name : (d.kExpr || d.angExpr || d.distExpr)}`,
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
    panel.querySelector("#mnp-btn-labels").classList.toggle("on", STATE.showLabels);
    if (STATE.tab === "locus") STATE.tab = "params";
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
        <div style="margin-top:4px">Bấm <b>+ Mới</b> để tạo tham số mới (hiện dạng KaTeX trên bảng):</div>
        <div class="mnp-chip-row" style="justify-content:center;margin-top:10px">
          <button type="button" class="mnp-chip" data-preset="a">+ a = 2 cm</button>
          <button type="button" class="mnp-chip" data-preset="b">+ b = 3 cm</button>
          <button type="button" class="mnp-chip" data-preset="h">+ h = 5 cm</button>
          <button type="button" class="mnp-chip" data-preset="ang">+ α = 60°</button>
          <button type="button" class="mnp-chip" data-preset="k">+ k = 0,5</button>
        </div>
      `;
      empty.querySelectorAll("[data-preset]").forEach(btn => {
        btn.addEventListener("click", () => {
          const map = {
            a: { name: "a", value: 2, unit: "dist", min: 0.5, max: 12, step: 0.1 },
            b: { name: "b", value: 3, unit: "dist", min: 0.5, max: 12, step: 0.1 },
            h: { name: "h", value: 5, unit: "dist", min: 0.5, max: 14, step: 0.1 },
            ang: { name: "α", value: 60, unit: "angle", min: 5, max: 175, step: 1 },
            k: { name: "k", value: 0.5, unit: "none", min: 0, max: 3, step: 0.05 }
          };
          const pid = upsertParam(pIdx, map[btn.dataset.preset]);
          selectParam(pIdx, pid, false);
        });
      });
      body.appendChild(empty);
      return;
    }

    for (const p of params) {
      const curVal = evalParamValue(geo, p);
      const bindCnt = countParamBindings(geo, p.id);
      const card = document.createElement("div");
      card.className = "mnp-card" + (STATE.focusedParamId === p.id ? " focus-highlight" : "");
      const isFormula = !!(p.expr && p.expr.trim());
      const isArmed = STATE.selectedParamIds.includes(p.id);

      card.innerHTML = `
        <div class="mnp-card-top">
          <div class="mnp-param-ident">
            <span class="mnp-param-name">${escapeHtml(p.name)}</span>
            <span class="mnp-unit-tag">${unitLabel(p.unit)}</span>
            ${bindCnt ? `<span class="mnp-bind-tag">🔒 ${bindCnt}</span>` : ""}
          </div>
          <div class="mnp-head-actions">
            <button type="button" class="mnp-icon-btn ${isArmed ? "on" : ""}" data-act="arm" title="Chọn tham số này để kết hợp công cụ vẽ">${isArmed ? "✓ Chọn" : "Chọn"}</button>
            ${!isFormula ? `<button type="button" class="mnp-icon-btn ${p.animating ? "on" : ""}" data-act="anim" title="Chạy tự động tham số">${p.animating ? "⏸" : "▶"}</button>` : ""}
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

      card.querySelector('[data-act="arm"]').addEventListener("click", () => { selectParam(pIdx, p.id, true); renderPanel(); });
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
          <label>Chọn tham số khoảng cách</label>
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
        let val = Number(raw.replace(",", ".")), expr = "";
        if (!paramId) {
          if (!Number.isFinite(val)) {
            const ev = evalExprOnGeo(geo, raw, NaN);
            if (!Number.isFinite(ev) || ev <= 0) { showToast("Giá trị độ dài không hợp lệ (> 0)!"); return; }
            val = ev; expr = raw;
          } else if (val <= 0) { showToast("Độ dài phải lớn hơn 0 cm!"); return; }
        }
        applyLengthConstraint({ pageIdx: L.pageIdx, from: L.from, to: L.to, val, paramId, expr, lockedAng });
      });
      const unBtn = sec.querySelector("#mnp-cl-unlock");
      if (unBtn) unBtn.addEventListener("click", () => unlockPoint(L.pageIdx, L.to, "dist"));
      body.appendChild(sec);
    }

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
          <label>Chọn tham số góc</label>
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
        if (!angParamId && !Number.isFinite(angVal)) {
          const ev = evalExprOnGeo(geo, rawAng, NaN);
          if (!Number.isFinite(ev)) { showToast("Số đo góc không hợp lệ!"); return; }
          angVal = ev; angExpr = rawAng;
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
          angVal, angParamId, angExpr, lockDist, distVal, distParamId, distExpr,
          addMark: sec.querySelector("#mnp-ca-mark").checked
        });
      });
      const unBtn = sec.querySelector("#mnp-ca-unlock");
      if (unBtn) unBtn.addEventListener("click", () => unlockPoint(G.pageIdx, G.B, "angle"));
      body.appendChild(sec);
    }

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
        <b>Cách dùng nhanh:</b><br/>
        • Bấm chọn <b>a = 2 cm</b> trên bảng + chọn công cụ <b>Đường tròn / Đoạn thẳng</b> → tự vẽ khóa cứng!<br/>
        • Hoặc chọn 1 đoạn thẳng / 2 đoạn chung đỉnh trên bảng để khóa độ dài / góc ngay tại đây.
      `;
      body.appendChild(tip);
    }

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
        row.addEventListener("mouseenter", () => {
          setHoverHighlight({ kind: "point", pageIdx: pIdx, pointId: c.pointId, label: c.title });
        });
        row.addEventListener("mouseleave", () => {
          if (STATE.hoverHighlight && STATE.hoverHighlight.pointId === c.pointId) setHoverHighlight(null);
        });
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
    autoChk.innerHTML = `<input type="checkbox" ${v.autoCreateParams ? "checked" : ""} /> Tự tạo tham số KaTeX trên bảng cho các số liệu này`;
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

  function openPanel(tab) {
    ensureUI();
    if (tab) STATE.tab = tab;
    STATE.open = true;
    const panel = document.getElementById("mn-param-panel");
    if (panel) {
      if (!STATE.panelPos) {
        const sb = document.querySelector(".selection-bar, .sel-bar");
        const topY = sb && sb.getBoundingClientRect().height > 0
          ? Math.max(100, Math.round(sb.getBoundingClientRect().bottom + 10))
          : 100;
        panel.style.top = `${topY}px`;
        panel.style.maxHeight = `calc(100vh - ${topY + 68}px)`;
      }
      panel.classList.add("open");
    }
    renderPanel();
  }

  function closePanel() {
    STATE.open = false;
    STATE.focusedParamId = null;
    const panel = document.getElementById("mn-param-panel");
    if (panel) panel.classList.remove("open");
  }

  function togglePanel() {
    if (STATE.open) closePanel();
    else openPanel();
  }

  function onToolbarClick() {
    // Bottom toolbar button opens "Tham số mới" dialog directly!
    openParamModal(null);
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

  // Keep KaTeX canvas chips synced with scroll, zoom, selection, and document updates
  function startSyncWatcher() {
    let scrollerBound = null;
    const syncPos = () => renderCanvasChips(false);

    window.addEventListener("resize", syncPos, { passive: true });

    setInterval(() => {
      const ed = getEditor();
      if (!ed) return;
      ensureUI();

      // Bind scroller scroll listener once
      if (ed.scroller && scrollerBound !== ed.scroller) {
        scrollerBound = ed.scroller;
        scrollerBound.addEventListener("scroll", syncPos, { passive: true });
      }

      // Snapshot current selection (so if user selects point O + a=2cm and then clicks Circle tool, onToolChange still knows O!)
      if (ed.sel && (ed.sel.points.size > 0 || ed.sel.shapes.size > 0)) {
        STATE._lastSel = {
          page: ed.sel.page,
          points: [...ed.sel.points],
          shapes: [...ed.sel.shapes]
        };
      }

      // Drop selectedParamIds that no longer exist on current page
      const curParams = getParams();
      const validIds = new Set(curParams.map(p => p.id));
      const beforeLen = STATE.selectedParamIds.length;
      STATE.selectedParamIds = STATE.selectedParamIds.filter(id => validIds.has(id));
      if (STATE.selectedParamIds.length !== beforeLen) syncArmedBar();

      renderCanvasChips(false);

      const sel = ed.sel;
      const pgNow = getPage();
      const locusCount = pgNow && pgNow.geo && Array.isArray(pgNow.geo.shapes) ? pgNow.geo.shapes.filter(s => s.kind === "locus").length : 0;
      const key = sel
        ? `${sel.page}|${[...sel.points].join(",")}|${[...sel.shapes].join(",")}|${curParams.length}|${locusCount}|${STATE.selectedParamIds.join(",")}`
        : `none|${currentPageIndex()}|${curParams.length}|${locusCount}|${STATE.selectedParamIds.join(",")}`;
      if (key !== STATE.selKey) {
        STATE.selKey = key;
        syncArmedBar();
        if (STATE.open && (STATE.tab === "constraints" || STATE.tab === "params" || STATE.tab === "locus")) {
          const panel = document.getElementById("mn-param-panel");
          if (panel && !panel.contains(document.activeElement)) {
            renderPanel();
          }
        }
      }
    }, 180);
  }

  // Keyboard shortcuts:
  // - Alt+P: open New Parameter dialog
  // - Alt+L: create Locus for current selection or open Quỹ tích tab
  // - + / - while a KaTeX parameter chip is selected: nudge value live (just like GSP5!)
  // - Escape: deselect active parameter chip
  window.addEventListener("keydown", e => {
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.altKey && !e.ctrlKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      if (e.shiftKey) togglePanel();
      else openParamModal(null);
      return;
    }

    if (e.altKey && !e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      onLocusSelectionClick();
      return;
    }

    if (STATE.selectedParamIds.length > 0 && !e.ctrlKey && !e.altKey) {
      if (e.key === "Escape") {
        clearSelectedParams();
        return;
      }
      if (e.key === "+" || e.key === "=" || e.key === "-") {
        const pIdx = currentPageIndex();
        const p = getSelectedParams(pIdx)[0];
        if (p && !p.expr) {
          e.preventDefault();
          const step = p.unit === "angle" ? 5 : (p.step || 0.5);
          const dir = e.key === "-" ? -1 : 1;
          let nv = Math.round(((Number(p.value) || 0) + dir * step) * 1000) / 1000;
          if (p.unit === "dist" && nv <= 0.05) nv = 0.05;
          updateParamValueLive(pIdx, p.id, nv, true);
          if (STATE.open) renderPanel();
        }
      }
    }
  });

  window.MinNoteGeoParams = {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    onToolbarClick,
    openForSelection,
    canShowLocusInSelBar,
    getLocusSelBarLabel,
    getLocusSelBarTitle,
    onLocusSelectionClick,
    openNewParameter: (unit, val) => openParamModal(null, unit, val),
    drawOverlay,
    drawInteractiveOverlay,
    // Direct tool hooks called by index-CTbULhps.js
    handleGeoPick,
    handleShapeCreate,
    onToolChange,
    // Programmatic API
    upsertParam,
    deleteParam,
    selectParam,
    clearSelectedParams,
    getSelectedParams,
    applyLengthConstraint,
    applyAngleConstraint,
    unlockPoint,
    buildParametric2D,
    buildParametric3D,
    getParams,
    listAllConstraints,
    // Locus API
    createPointLocus,
    createShapeLocus,
    updateLocusShape,
    deleteLocusShape
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { ensureUI(); startSyncWatcher(); });
  } else {
    ensureUI();
    startSyncWatcher();
  }
})();
