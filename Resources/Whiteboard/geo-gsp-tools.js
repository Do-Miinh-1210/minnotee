/* MinNote Dynamic Geometry Pro Tools
 * Inspired by classic dynamic geometry workflows:
 *  1. Live On-Canvas Measurements (Length, Distance, Angle, Radius, Circumference, Area, Perimeter, Ratio)
 *  2. Live Dynamic Expression Calculator (combines live measurements & parameters in real time)
 *  3. Split Point from Path & Merge Point to Path / Merge 2 Points
 *  4. Select Parents & Select Children (dependency graph traversal)
 *  5. Instant Erase Traces (Ctrl+B)
 */
(function () {
  "use strict";
  if (window.MinNoteGeoTools) return;

  const STATE = {
    popOpen: false,
    calcOpen: false,
    editingMeasId: null,
    editingPageIdx: 0,
    lastRenderSig: ""
  };

  const getEditor = () => window.__noteRendererEditor || null;
  const getKernel = () => window.__mnGeoKernel || null;

  function pageIdxNow() {
    const ed = getEditor();
    if (!ed) return 0;
    if (ed.sel && typeof ed.sel.page === "number") return ed.sel.page;
    return typeof ed.currentPage === "function" ? (ed.currentPage() || 0) : 0;
  }

  function getPage(idx) {
    const ed = getEditor();
    if (!ed || !ed.doc || !ed.doc.pages) return null;
    const p = idx !== undefined ? idx : pageIdxNow();
    return ed.doc.pages[p] || ed.doc.pages[0] || null;
  }

  function getCmPx(geo) {
    if (geo && Number.isFinite(geo.cmPx) && geo.cmPx > 1) return geo.cmPx;
    const ed = getEditor();
    if (ed && typeof ed.cm === "function") {
      const c = ed.cm();
      if (Number.isFinite(c) && c > 1) return c;
    }
    return 150 / 2.54;
  }

  function toast(msg) {
    const ed = getEditor();
    if (ed && ed.cb && typeof ed.cb.toast === "function") return ed.cb.toast(msg);
    if (typeof window.showToast === "function") window.showToast(msg);
  }

  function fmt(v, d = 2) {
    if (!Number.isFinite(v)) return "—";
    const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    return String(Object.is(r, -0) ? 0 : r).replace(".", ",");
  }

  function fmtTex(v, d = 2) {
    return fmt(v, d).replace(",", "{,}");
  }

  function ptName(geo, id) {
    const p = geo && geo.points && geo.points[id];
    return (p && p.label) ? String(p.label) : String(id || "?").slice(0, 3);
  }

  function ptTex(geo, id) {
    const raw = ptName(geo, id);
    const m = /^([A-Za-z])(\d+)$/.exec(raw);
    return m ? `${m[1]}_{${m[2]}}` : raw;
  }

  function isLibraryOpen() {
    const lib = document.querySelector(".library");
    if (!lib) return false;
    const r = lib.getBoundingClientRect();
    return r.width > 100 && r.height > 100;
  }

  function makeMeasId(list) {
    const used = new Set((list || []).map(m => m.varName));
    for (let i = 1; i < 999; i++) {
      if (!used.has(`m${i}`)) return { id: "ms_" + Math.random().toString(36).slice(2, 9), varName: `m${i}` };
    }
    return { id: "ms_" + Date.now(), varName: "m" + ((list || []).length + 1) };
  }

  function mutateGeo(pIdx, fn, live = false) {
    const ed = getEditor();
    if (!ed) return false;
    const nextDoc = ed.updatePage(pIdx, pg => {
      const nextGeo = fn({ ...pg.geo, cmPx: getCmPx(pg.geo) }, pg);
      return nextGeo ? { ...pg, geo: nextGeo } : pg;
    });
    if (live) {
      ed.doc = nextDoc;
      if (ed.cache && ed.cache.clear) ed.cache.clear();
      ed.redraw();
    } else {
      ed.commit(nextDoc);
      ed.redraw();
      ed.emit();
    }
    renderMeasurements(true);
    return true;
  }

  // ==================== GEOMETRY MEASUREMENT EVALUATION ====================

  function distPx(a, b) {
    return (a && b) ? Math.hypot(b.x - a.x, b.y - a.y) : NaN;
  }

  function circleRadiusPx(sh, coords) {
    if (!sh || !Array.isArray(sh.pts)) return NaN;
    if (sh.pts.length >= 2) {
      const p0 = coords.get(sh.pts[0]), p1 = coords.get(sh.pts[1]);
      if (sh.kind === "circle" && sh.pts.length >= 3) {
        const p2 = coords.get(sh.pts[2]);
        if (sh.pts.length === 3 && p1 && p2) return distPx(p1, p2);
      }
      return distPx(p0, p1);
    }
    return NaN;
  }

  function polygonMetrics(pts, coords, cm) {
    const arr = pts.map(id => coords.get(id)).filter(Boolean);
    if (arr.length < 3) return { perim: NaN, area: NaN };
    let perim = 0, area2 = 0;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i], b = arr[(i + 1) % arr.length];
      perim += Math.hypot(b.x - a.x, b.y - a.y);
      area2 += a.x * b.y - b.x * a.y;
    }
    return { perim: perim / cm, area: Math.abs(area2) / (2 * cm * cm) };
  }

  function evalMeasurement(geo, coords, m, env) {
    const K = getKernel();
    const cm = getCmPx(geo);
    const shById = id => (geo.shapes || []).find(s => s.id === id);

    if (m.kind === "dist") {
      const a = coords.get(m.pts[0]), b = coords.get(m.pts[1]);
      const val = distPx(a, b) / cm;
      const lbl = m.label || `${ptTex(geo, m.pts[0])}${ptTex(geo, m.pts[1])}`;
      return { val, tex: `${lbl} = ${fmtTex(val, 2)}\\,\\text{cm}`, plain: `${m.varName} = ${fmt(val, 2)} cm` };
    }
    if (m.kind === "ratio") {
      const d1 = distPx(coords.get(m.pts[0]), coords.get(m.pts[1]));
      const d2 = distPx(coords.get(m.pts[2]), coords.get(m.pts[3]));
      const val = (d2 > 1e-6) ? (d1 / d2) : NaN;
      const n1 = `${ptTex(geo, m.pts[0])}${ptTex(geo, m.pts[1])}`;
      const n2 = `${ptTex(geo, m.pts[2])}${ptTex(geo, m.pts[3])}`;
      const lbl = m.label || `\\dfrac{${n1}}{${n2}}`;
      return { val, tex: `${lbl} = ${fmtTex(val, 2)}`, plain: `${m.varName} = ${fmt(val, 2)}` };
    }
    if (m.kind === "angle") {
      const A = coords.get(m.pts[0]), B = coords.get(m.pts[1]), C = coords.get(m.pts[2]);
      let val = NaN;
      if (A && B && C) {
        const u1x = A.x - B.x, u1y = A.y - B.y, u2x = C.x - B.x, u2y = C.y - B.y;
        const l1 = Math.hypot(u1x, u1y), l2 = Math.hypot(u2x, u2y);
        if (l1 > 1e-6 && l2 > 1e-6) {
          const cs = Math.max(-1, Math.min(1, (u1x * u2x + u1y * u2y) / (l1 * l2)));
          val = Math.acos(cs) * 180 / Math.PI;
        }
      }
      const lbl = m.label || `\\widehat{${ptTex(geo, m.pts[0])}${ptTex(geo, m.pts[1])}${ptTex(geo, m.pts[2])}}`;
      return { val, tex: `${lbl} = ${fmtTex(val, 1)}^\\circ`, plain: `${m.varName} = ${fmt(val, 1)}°` };
    }
    if (m.kind === "circR" || m.kind === "circC" || m.kind === "circS") {
      const sh = shById(m.shapeId);
      const rPx = sh ? circleRadiusPx(sh, coords) : (m.pts && m.pts.length >= 2 ? distPx(coords.get(m.pts[0]), coords.get(m.pts[1])) : NaN);
      const r = rPx / cm;
      const oTex = sh && sh.pts[0] ? ptTex(geo, sh.pts[0]) : "O";
      if (m.kind === "circR") {
        const lbl = m.label || `R_{(${oTex})}`;
        return { val: r, tex: `${lbl} = ${fmtTex(r, 2)}\\,\\text{cm}`, plain: `${m.varName} = ${fmt(r, 2)} cm` };
      }
      if (m.kind === "circC") {
        const val = 2 * Math.PI * r;
        const lbl = m.label || `C_{(${oTex})}`;
        return { val, tex: `${lbl} = ${fmtTex(val, 2)}\\,\\text{cm}`, plain: `${m.varName} = ${fmt(val, 2)} cm` };
      }
      const val = Math.PI * r * r;
      const lbl = m.label || `S_{(${oTex})}`;
      return { val, tex: `${lbl} = ${fmtTex(val, 2)}\\,\\text{cm}^2`, plain: `${m.varName} = ${fmt(val, 2)} cm²` };
    }
    if (m.kind === "polyP" || m.kind === "polyS") {
      const sh = m.shapeId ? shById(m.shapeId) : null;
      const pts = (sh && Array.isArray(sh.pts) && sh.pts.length >= 3) ? sh.pts : (m.pts || []);
      const met = polygonMetrics(pts, coords, cm);
      const pName = pts.slice(0, 5).map(id => ptTex(geo, id)).join("");
      if (m.kind === "polyP") {
        const lbl = m.label || `P_{${pName}}`;
        return { val: met.perim, tex: `${lbl} = ${fmtTex(met.perim, 2)}\\,\\text{cm}`, plain: `${m.varName} = ${fmt(met.perim, 2)} cm` };
      }
      const lbl = m.label || `S_{${pName}}`;
      return { val: met.area, tex: `${lbl} = ${fmtTex(met.area, 2)}\\,\\text{cm}^2`, plain: `${m.varName} = ${fmt(met.area, 2)} cm²` };
    }
    if (m.kind === "calc") {
      let val = NaN;
      if (K && typeof K._mnEvalExpr === "function") {
        const res = K._mnEvalExpr(m.expr || "0", env);
        if (Number.isFinite(res)) val = res;
      }
      const niceExpr = String(m.expr || "0")
        .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}")
        .replace(/\*/g, "\\cdot ")
        .replace(/\bpi\b/gi, "\\pi")
        .replace(/\bm(\d+)\b/g, "m_{$1}");
      const lhs = m.label ? `${m.label} = ` : `${niceExpr} = `;
      return { val, tex: `${lhs}${fmtTex(val, 2)}`, plain: `${m.varName} = ${fmt(val, 2)}` };
    }
    return { val: NaN, tex: "—", plain: "—" };
  }

  function evaluateAllMeasurements(geo, coords) {
    const K = getKernel();
    const env = (K && typeof K._mnBuildParamEnv === "function") ? { ...K._mnBuildParamEnv(geo) } : {};
    const list = Array.isArray(geo.measurements) ? geo.measurements : [];
    const results = new Map();
    for (const m of list) {
      const r = evalMeasurement(geo, coords, m, env);
      results.set(m.id, r);
      if (m.varName && Number.isFinite(r.val)) env[m.varName] = r.val;
    }
    return { results, env };
  }

  // ==================== DEPENDENCY GRAPH (PARENTS / CHILDREN) & SPLIT / MERGE ====================

  function pointParents(geo, ptId) {
    const K = getKernel();
    const pt = geo && geo.points && geo.points[ptId];
    if (!pt || !pt.def) return [];
    const arr = (K && typeof K.Om === "function") ? K.Om(pt.def) : [];
    return arr.filter(id => id && id !== ptId && geo.points[id]);
  }

  function dependsOn(geo, candidateId, ancestorId) {
    if (candidateId === ancestorId) return true;
    const seen = new Set();
    const stack = [candidateId];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const p of pointParents(geo, cur)) {
        if (p === ancestorId) return true;
        stack.push(p);
      }
    }
    return false;
  }

  function selectParents() {
    const ed = getEditor();
    if (!ed || !ed.sel) return;
    const pg = getPage(ed.sel.page);
    if (!pg || !pg.geo) return;
    const geo = pg.geo;
    const parentPts = new Set();
    for (const pid of ed.sel.points) {
      for (const par of pointParents(geo, pid)) parentPts.add(par);
    }
    for (const sid of ed.sel.shapes) {
      const sh = (geo.shapes || []).find(s => s.id === sid);
      if (sh && Array.isArray(sh.pts)) {
        for (const pid of sh.pts) if (geo.points[pid]) parentPts.add(pid);
      }
    }
    if (!parentPts.size) return toast("Đối tượng đang chọn là đối tượng gốc (không có đối tượng cha).");
    ed.sel = { page: ed.sel.page, strokes: new Set(), items: new Set(), points: parentPts, shapes: new Set() };
    if (typeof ed.pruneSelection === "function") ed.pruneSelection();
    ed.redraw();
    ed.emit();
    toast(`Đã chọn ${parentPts.size} đối tượng cha.`);
  }

  function selectChildren() {
    const ed = getEditor();
    if (!ed || !ed.sel) return;
    const pg = getPage(ed.sel.page);
    if (!pg || !pg.geo) return;
    const geo = pg.geo;
    const seedPts = new Set(ed.sel.points);
    for (const sid of ed.sel.shapes) {
      const sh = (geo.shapes || []).find(s => s.id === sid);
      if (sh && Array.isArray(sh.pts)) sh.pts.forEach(p => seedPts.add(p));
    }
    const childPts = new Set();
    const allIds = Object.keys(geo.points || {});
    let changed = true;
    while (changed) {
      changed = false;
      for (const pid of allIds) {
        if (childPts.has(pid) || seedPts.has(pid)) continue;
        const pars = pointParents(geo, pid);
        if (pars.some(p => seedPts.has(p) || childPts.has(p))) {
          childPts.add(pid);
          changed = true;
        }
      }
    }
    const childShapes = new Set();
    const activePts = new Set([...seedPts, ...childPts]);
    for (const sh of (geo.shapes || [])) {
      if (ed.sel.shapes.has(sh.id)) continue;
      if (Array.isArray(sh.pts) && sh.pts.some(p => activePts.has(p))) {
        childShapes.add(sh.id);
      }
    }
    if (!childPts.size && !childShapes.size) return toast("Không có đối tượng con phụ thuộc nào.");
    ed.sel = { page: ed.sel.page, strokes: new Set(), items: new Set(), points: childPts, shapes: childShapes };
    if (typeof ed.pruneSelection === "function") ed.pruneSelection();
    ed.redraw();
    ed.emit();
    toast(`Đã chọn ${childPts.size} điểm và ${childShapes.size} hình phụ thuộc.`);
  }

  function splitSelectedPoint() {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !ed.sel || !K) return;
    const pIdx = ed.sel.page;
    const pg = getPage(pIdx);
    if (!pg || !pg.geo) return;
    const pid = [...ed.sel.points][0];
    const pt = pid && pg.geo.points[pid];
    if (!pt || !pt.def || pt.def.t === "free") return;
    const coords = K.Tt(pg.geo);
    const pos = coords.get(pid);
    if (!pos) return;
    mutateGeo(pIdx, geo => ({
      ...geo,
      points: { ...geo.points, [pid]: { ...geo.points[pid], def: { t: "free", x: pos.x, y: pos.y } } }
    }));
    toast(`Đã tách điểm ${ptName(pg.geo, pid)} thành điểm tự do.`);
  }

  function mergePointToPath() {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !ed.sel || !K) return;
    const pIdx = ed.sel.page;
    const pg = getPage(pIdx);
    if (!pg || !pg.geo) return;
    const geo = pg.geo;
    const pid = [...ed.sel.points][0];
    const sid = [...ed.sel.shapes][0];
    const pt = geo.points[pid];
    const sh = (geo.shapes || []).find(s => s.id === sid);
    if (!pt || !sh) return;
    if ((sh.pts || []).some(p => dependsOn(geo, p, pid))) {
      return toast("Không thể ghép: đường đích đang phụ thuộc vào chính điểm này.");
    }
    const coords = K.Tt(geo);
    const pos = coords.get(pid);
    if (!pos) return;

    let newDef = null;
    if (sh.kind === "segment" || sh.kind === "line" || sh.kind === "ray") {
      const A = coords.get(sh.pts[0]), B = coords.get(sh.pts[1]);
      if (A && B) {
        const dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy;
        let k = d2 > 1e-9 ? ((pos.x - A.x) * dx + (pos.y - A.y) * dy) / d2 : 0.5;
        if (sh.kind === "segment") k = Math.max(0, Math.min(1, k));
        else if (sh.kind === "ray") k = Math.max(0, k);
        newDef = { t: "on", a: sh.pts[0], b: sh.pts[1], k, seg: sh.kind === "segment" };
      }
    } else if (sh.kind === "locus" && typeof K._mnLocusStrokes === "function") {
      const stList = K._mnLocusStrokes(geo, sh, coords) || [];
      let bestK = 0.5, bestD = Infinity;
      const flat = stList.flatMap(st => st.pts || []);
      flat.forEach((p, idx) => {
        const d = Math.hypot(p.x - pos.x, p.y - pos.y);
        if (d < bestD) { bestD = d; bestK = flat.length > 1 ? idx / (flat.length - 1) : 0.5; }
      });
      newDef = { t: "onLocus", locusId: sh.id, k: bestK, deps: sh.pts ? [...sh.pts] : [] };
    } else if (typeof K.LY === "function" && typeof K.NY === "function" && K.NY(sh.kind)) {
      newDef = K.LY(sh, coords, pos);
    } else if (sh.kind === "circle" && sh.pts.length >= 2) {
      const O = coords.get(sh.pts[0]);
      if (O) {
        let ang = Math.atan2(pos.y - O.y, pos.x - O.x) / (2 * Math.PI);
        if (ang < 0) ang += 1;
        newDef = { t: "path", kind: "circle", pts: [...sh.pts], k: ang };
      }
    } else if (sh.kind === "polygon" && sh.pts.length >= 3) {
      // Snap to nearest polygon edge perimeter fraction
      const arr = sh.pts.map(id => coords.get(id)).filter(Boolean);
      if (arr.length >= 3) {
        let total = 0, bestD = Infinity, bestL = 0;
        const lens = arr.map((a, i) => Math.hypot(arr[(i + 1) % arr.length].x - a.x, arr[(i + 1) % arr.length].y - a.y));
        total = lens.reduce((a, b) => a + b, 0);
        let acc = 0;
        for (let i = 0; i < arr.length; i++) {
          const a = arr[i], b = arr[(i + 1) % arr.length];
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          const t = d2 > 1e-9 ? Math.max(0, Math.min(1, ((pos.x - a.x) * dx + (pos.y - a.y) * dy) / d2)) : 0;
          const dist = Math.hypot(pos.x - (a.x + dx * t), pos.y - (a.y + dy * t));
          if (dist < bestD) { bestD = dist; bestL = acc + t * lens[i]; }
          acc += lens[i];
        }
        newDef = { t: "path", kind: "polygon", pts: [...sh.pts], k: total > 1e-6 ? bestL / total : 0 };
      }
    }

    if (!newDef) return toast("Loại hình này chưa hỗ trợ ghép điểm trực tiếp.");
    mutateGeo(pIdx, g => ({
      ...g,
      points: { ...g.points, [pid]: { ...g.points[pid], def: newDef } }
    }));
    toast(`Đã ghép điểm ${ptName(geo, pid)} lên đường đã chọn.`);
  }

  function replacePointRefInDef(def, dropId, keepId) {
    if (!def || typeof def !== "object") return def;
    const out = { ...def };
    for (const k of ["a", "b", "c", "o", "p", "ref"]) {
      if (out[k] === dropId) out[k] = keepId;
    }
    for (const k of ["l1", "l2", "c1", "c2", "pts", "deps"]) {
      if (Array.isArray(out[k])) out[k] = out[k].map(x => x === dropId ? keepId : x);
    }
    return out;
  }

  function mergeTwoPoints() {
    const ed = getEditor();
    if (!ed || !ed.sel) return;
    const pIdx = ed.sel.page;
    const pg = getPage(pIdx);
    if (!pg || !pg.geo) return;
    const geo = pg.geo;
    const arr = [...ed.sel.points];
    if (arr.length !== 2) return;
    let [keepId, dropId] = arr;
    const aDepB = dependsOn(geo, keepId, dropId);
    const bDepA = dependsOn(geo, dropId, keepId);
    if (aDepB && bDepA) return toast("Không thể ghép 2 điểm phụ thuộc vòng lẫn nhau.");
    if (aDepB) [keepId, dropId] = [dropId, keepId];

    const keepNm = ptName(geo, keepId), dropNm = ptName(geo, dropId);
    mutateGeo(pIdx, g => {
      const nextPts = {};
      for (const [id, pt] of Object.entries(g.points)) {
        if (id === dropId) continue;
        nextPts[id] = { ...pt, def: replacePointRefInDef(pt.def, dropId, keepId) };
      }
      const nextShapes = (g.shapes || []).map(sh => ({
        ...sh,
        pts: Array.isArray(sh.pts) ? sh.pts.map(x => x === dropId ? keepId : x) : sh.pts
      }));
      const nextMeas = (g.measurements || []).map(m => ({
        ...m,
        pts: Array.isArray(m.pts) ? m.pts.map(x => x === dropId ? keepId : x) : m.pts
      }));
      return { ...g, points: nextPts, shapes: nextShapes, measurements: nextMeas };
    });
    ed.sel = { page: pIdx, strokes: new Set(), items: new Set(), points: new Set([keepId]), shapes: new Set() };
    ed.redraw();
    ed.emit();
    toast(`Đã ghép điểm ${dropNm} vào điểm ${keepNm}.`);
  }

  function eraseTracesNow() {
    const ed = getEditor();
    if (!ed || typeof ed.clearTraces !== "function") return;
    if (typeof ed.hasTraces === "function" && !ed.hasTraces()) {
      return toast("Hiện chưa có vết điểm nào trên bảng.");
    }
    ed.clearTraces();
    toast("Đã xóa toàn bộ vết trên trang.");
  }

  // ==================== CONTEXTUAL ACTIONS FOR CURRENT SELECTION ====================

  function buildSelectionActions() {
    const ed = getEditor();
    if (!ed || !ed.sel) return null;
    const pIdx = ed.sel.page;
    const pg = getPage(pIdx);
    if (!pg || !pg.geo) return null;
    const geo = pg.geo;
    const selPts = [...ed.sel.points].filter(id => geo.points[id]);
    const selShapes = [...ed.sel.shapes].map(id => (geo.shapes || []).find(s => s.id === id)).filter(Boolean);
    if (!selPts.length && !selShapes.length) return null;

    const K = getKernel();
    const coords = K ? K.Tt(geo) : new Map();
    const cm = getCmPx(geo);

    const measure = [];
    const edit = [];
    const graph = [];

    // 1. Measurements
    if (selPts.length === 2 && selShapes.length === 0) {
      const d = distPx(coords.get(selPts[0]), coords.get(selPts[1])) / cm;
      measure.push({
        label: `Khoảng cách ${ptName(geo, selPts[0])}${ptName(geo, selPts[1])}`,
        hint: `${fmt(d, 2)} cm`,
        run: () => addMeasurement(pIdx, { kind: "dist", pts: selPts })
      });
    }
    if (selShapes.length === 1 && selShapes[0].kind === "segment" && selShapes[0].pts.length >= 2) {
      const pts = selShapes[0].pts.slice(0, 2);
      const d = distPx(coords.get(pts[0]), coords.get(pts[1])) / cm;
      measure.push({
        label: `Độ dài đoạn ${ptName(geo, pts[0])}${ptName(geo, pts[1])}`,
        hint: `${fmt(d, 2)} cm`,
        run: () => addMeasurement(pIdx, { kind: "dist", pts })
      });
    }
    if (selShapes.length === 2 && selShapes.every(s => s.kind === "segment" && s.pts.length >= 2)) {
      const p1 = selShapes[0].pts.slice(0, 2), p2 = selShapes[1].pts.slice(0, 2);
      const d1 = distPx(coords.get(p1[0]), coords.get(p1[1]));
      const d2 = distPx(coords.get(p2[0]), coords.get(p2[1]));
      measure.push({
        label: `Tỉ số ${ptName(geo, p1[0])}${ptName(geo, p1[1])} / ${ptName(geo, p2[0])}${ptName(geo, p2[1])}`,
        hint: fmt(d2 > 1e-6 ? d1 / d2 : NaN, 2),
        run: () => addMeasurement(pIdx, { kind: "ratio", pts: [...p1, ...p2] })
      });
    }
    if (selPts.length === 3 && selShapes.length === 0) {
      const [A, B, C] = selPts;
      measure.push({
        label: `Số đo góc ∠${ptName(geo, A)}${ptName(geo, B)}${ptName(geo, C)}`,
        hint: "độ",
        run: () => addMeasurement(pIdx, { kind: "angle", pts: selPts })
      });
      const met = polygonMetrics(selPts, coords, cm);
      measure.push({
        label: `Chu vi △${ptName(geo, A)}${ptName(geo, B)}${ptName(geo, C)}`,
        hint: `${fmt(met.perim, 2)} cm`,
        run: () => addMeasurement(pIdx, { kind: "polyP", pts: selPts })
      });
      measure.push({
        label: `Diện tích △${ptName(geo, A)}${ptName(geo, B)}${ptName(geo, C)}`,
        hint: `${fmt(met.area, 2)} cm²`,
        run: () => addMeasurement(pIdx, { kind: "polyS", pts: selPts })
      });
    }
    if (selShapes.length === 1 && selShapes[0].kind === "circle") {
      const sh = selShapes[0];
      const r = circleRadiusPx(sh, coords) / cm;
      measure.push({ label: "Bán kính đường tròn (R)", hint: `${fmt(r, 2)} cm`, run: () => addMeasurement(pIdx, { kind: "circR", shapeId: sh.id, pts: sh.pts.slice(0, 2) }) });
      measure.push({ label: "Chu vi đường tròn (C)", hint: `${fmt(2 * Math.PI * r, 2)} cm`, run: () => addMeasurement(pIdx, { kind: "circC", shapeId: sh.id, pts: sh.pts.slice(0, 2) }) });
      measure.push({ label: "Diện tích hình tròn (S)", hint: `${fmt(Math.PI * r * r, 2)} cm²`, run: () => addMeasurement(pIdx, { kind: "circS", shapeId: sh.id, pts: sh.pts.slice(0, 2) }) });
    }
    if (selShapes.length === 1 && selShapes[0].kind === "polygon" && selShapes[0].pts.length >= 3) {
      const sh = selShapes[0];
      const met = polygonMetrics(sh.pts, coords, cm);
      measure.push({ label: "Chu vi đa giác (P)", hint: `${fmt(met.perim, 2)} cm`, run: () => addMeasurement(pIdx, { kind: "polyP", shapeId: sh.id, pts: [...sh.pts] }) });
      measure.push({ label: "Diện tích đa giác (S)", hint: `${fmt(met.area, 2)} cm²`, run: () => addMeasurement(pIdx, { kind: "polyS", shapeId: sh.id, pts: [...sh.pts] }) });
    }
    if ((geo.measurements && geo.measurements.length > 0) || (geo.params && geo.params.length > 0) || measure.length > 0) {
      measure.push({ label: "Tính toán biểu thức động…", hint: "f(m)", run: () => openCalcModal(pIdx, null) });
    }

    // 2. Split / Merge Point
    if (selPts.length === 1 && selShapes.length === 0) {
      const pt = geo.points[selPts[0]];
      if (pt && pt.def && pt.def.t !== "free") {
        edit.push({ label: `Tách điểm ${ptName(geo, selPts[0])} khỏi đường`, hint: "Tự do", run: splitSelectedPoint });
      }
    }
    if (selPts.length === 1 && selShapes.length === 1) {
      const sh = selShapes[0];
      const isPathable = ["segment", "line", "ray", "circle", "polygon", "locus"].includes(sh.kind) || (K && typeof K.NY === "function" && K.NY(sh.kind));
      if (isPathable) {
        edit.push({ label: `Ghép điểm ${ptName(geo, selPts[0])} vào đường`, hint: "Ràng buộc", run: mergePointToPath });
      }
    }
    if (selPts.length === 2 && selShapes.length === 0) {
      edit.push({ label: `Ghép 2 điểm ${ptName(geo, selPts[0])} & ${ptName(geo, selPts[1])}`, hint: "Gộp 1", run: mergeTwoPoints });
    }

    // 3. Dependency Graph & Traces
    graph.push({ label: "Chọn cha (đối tượng gốc)", hint: "Parents", run: selectParents });
    graph.push({ label: "Chọn con (phụ thuộc)", hint: "Children", run: selectChildren });
    if (typeof ed.hasTraces === "function" && ed.hasTraces()) {
      graph.push({ label: "Xóa toàn bộ vết", hint: "Ctrl+B", run: eraseTracesNow });
    }

    return { pIdx, measure, edit, graph };
  }

  function getPageBounds(pIdx) {
    const ed = getEditor();
    const K = getKernel();
    const pg = getPage(pIdx);
    const doc = ed && ed.doc;
    let pageW = 1240;
    let pageH = 1754;
    if (K && typeof K.Kt === "function" && doc) {
      const w = K.Kt(doc);
      if (Number.isFinite(w) && w > 100) pageW = w;
    } else if (doc && Number.isFinite(doc.width) && doc.width > 100) {
      pageW = doc.width;
    }
    if (ed && typeof ed.phOf === "function") {
      const h = ed.phOf(pIdx);
      if (Number.isFinite(h) && h > 100) pageH = h;
    } else if (pg && Number.isFinite(pg.height) && pg.height > 100) {
      pageH = pg.height;
    }
    return { pageW, pageH };
  }

  function computeMeasuredBBox(pg, spec, coords) {
    const K = getKernel();
    const geo = pg && pg.geo;
    if (!geo || !coords) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const addPt = p => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    };
    const addShape = sh => {
      if (!sh || !Array.isArray(sh.pts)) return;
      const pts = sh.pts.map(id => coords.get(id)).filter(Boolean);
      if ((sh.kind === "circle" || sh.kind === "sphere") && pts.length >= 2) {
        const r = distPx(pts[0], pts[1]);
        if (Number.isFinite(r) && r > 0) {
          addPt({ x: pts[0].x - r, y: pts[0].y - r });
          addPt({ x: pts[0].x + r, y: pts[0].y + r });
          return;
        }
      }
      if (K && typeof K.pI === "function" && pts.length === sh.pts.length) {
        const polys = K.pI(sh, pts, geo);
        if (Array.isArray(polys) && polys.length) {
          for (const poly of polys) for (const p of poly) addPt(p);
          return;
        }
      }
      for (const p of pts) addPt(p);
    };

    if (spec && spec.shapeId) {
      const sh = (geo.shapes || []).find(s => s.id === spec.shapeId);
      if (sh) addShape(sh);
    }
    if (spec && Array.isArray(spec.pts) && spec.pts.length) {
      for (const pid of spec.pts) addPt(coords.get(pid));
    }
    if (!Number.isFinite(minX)) {
      const ed = getEditor();
      if (ed && ed.sel && ed.sel.page !== undefined) {
        for (const pid of (ed.sel.points || [])) addPt(coords.get(pid));
        for (const sid of (ed.sel.shapes || [])) {
          const sh = (geo.shapes || []).find(s => s.id === sid);
          if (sh) addShape(sh);
        }
      }
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }

  function addMeasurement(pIdx, spec) {
    const pg = getPage(pIdx);
    if (!pg || !pg.geo) return;
    const K = getKernel();
    const list = Array.isArray(pg.geo.measurements) ? pg.geo.measurements : [];
    const { id, varName } = makeMeasId(list);
    const { pageW, pageH } = getPageBounds(pIdx);
    const maxXClamp = Math.max(24, pageW - 190);
    const maxYClamp = Math.max(60, pageH - 48);
    const clampX = v => Math.round(Math.max(24, Math.min(maxXClamp, v)));
    const clampY = v => Math.round(Math.max(60, Math.min(maxYClamp, v)));

    const coords = K ? K.Tt(pg.geo) : null;
    const bbox = computeMeasuredBBox(pg, spec, coords);
    let x, y;
    if (bbox) {
      const preferRight = bbox.maxX + 18 <= maxXClamp;
      if (preferRight) {
        x = clampX(bbox.maxX + 18);
        y = clampY(Math.max(bbox.minY, (bbox.minY + bbox.maxY) * 0.5 - 18));
      } else {
        x = clampX((bbox.minX + bbox.maxX) * 0.5 - 80);
        y = bbox.maxY + 18 <= maxYClamp ? clampY(bbox.maxY + 18) : clampY(bbox.minY - 46);
      }
    } else if (list.length > 0 && Number.isFinite(list[list.length - 1].x) && Number.isFinite(list[list.length - 1].y)) {
      x = clampX(list[list.length - 1].x);
      y = clampY(list[list.length - 1].y + 42);
    } else {
      x = clampX(48);
      y = clampY(136 + (pg.geo.params || []).length * 42);
    }

    const existing = [
      ...list.map(m => ({ x: m.x, y: m.y })),
      ...(pg.geo.params || []).map(p => ({ x: p.x, y: p.y }))
    ].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

    const startY = y;
    for (let tries = 0; tries < 18; tries++) {
      const collides = existing.some(o => Math.abs(o.x - x) < 165 && Math.abs(o.y - y) < 38);
      if (!collides) break;
      y += 42;
      if (y > maxYClamp) {
        y = startY;
        x = clampX(x > 220 ? x - 175 : x + 175);
      }
    }
    x = clampX(x);
    y = clampY(y);

    mutateGeo(pIdx, g => ({
      ...g,
      measurements: [...(g.measurements || []), { id, varName, x, y, ...spec }]
    }));
    toast(`Đã ghim phép đo động ${varName} lên bảng.`);
  }

  function deleteMeasurement(pIdx, id) {
    mutateGeo(pIdx, g => ({
      ...g,
      measurements: (g.measurements || []).filter(m => m.id !== id)
    }));
  }

  // ==================== ON-CANVAS LIVE KATEX MEASUREMENT CARDS ====================

  function pageToScreen(pIdx, x, y) {
    const ed = getEditor();
    if (!ed || !ed.scroller) return null;
    const sr = ed.scroller.getBoundingClientRect();
    const z = ed.zoom || 1;
    const ox = Number.isFinite(ed.offsetX) ? ed.offsetX : 0;
    const topOff = typeof ed.pageTop === "function" ? ed.pageTop(pIdx) : (pIdx * 1150);
    return {
      sx: sr.left + ox + x * z - ed.scroller.scrollLeft,
      sy: sr.top + (y + topOff) * z - ed.scroller.scrollTop,
      zoom: z,
      sr
    };
  }

  function renderTexInto(el, tex, plain) {
    if (el.dataset.tex === tex) return;
    el.dataset.tex = tex;
    if (window.katex && typeof window.katex.render === "function") {
      try {
        window.katex.render(tex, el, { throwOnError: false, displayMode: false });
        return;
      } catch (_) {}
    }
    el.textContent = plain;
  }

  function ensureLayer() {
    let layer = document.getElementById("mn-meas-canvas-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "mn-meas-canvas-layer";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function renderMeasurements(force = false) {
    const ed = getEditor();
    const K = getKernel();
    if (!ed || !K || !ed.doc || !ed.doc.pages || !ed.scroller) return;
    const layer = ensureLayer();
    if (isLibraryOpen()) {
      layer.style.display = "none";
      return;
    }
    const sr0 = ed.scroller.getBoundingClientRect();
    layer.style.display = "block";
    layer.style.left = `${sr0.left}px`;
    layer.style.top = `${sr0.top}px`;
    layer.style.width = `${Math.max(0, sr0.width)}px`;
    layer.style.height = `${Math.max(0, sr0.height)}px`;

    const keep = new Set();
    const pages = ed.view && ed.view.pages ? ed.view.pages : ed.doc.pages;

    pages.forEach((pg, pIdx) => {
      const list = pg && pg.geo && Array.isArray(pg.geo.measurements) ? pg.geo.measurements : [];
      if (!list.length) return;
      const coords = K.Tt(pg.geo);
      const { results } = evaluateAllMeasurements(pg.geo, coords);

      list.forEach((m, idx) => {
        const key = `${pIdx}:${m.id}`;
        const px = Number.isFinite(m.x) ? m.x : 48;
        const py = Number.isFinite(m.y) ? m.y : (44 + idx * 42);
        const pos = pageToScreen(pIdx, px, py);
        if (!pos) return;
        const { sr } = pos;
        if (pos.sy < sr.top || pos.sy > sr.bottom || pos.sx < sr.left || pos.sx > sr.right) return;
        keep.add(key);

        let card = layer.querySelector(`.mn-meas-card[data-key="${key}"]`);
        if (!card) {
          card = document.createElement("div");
          card.className = "mn-meas-card";
          card.dataset.key = key;
          card.title = "Kéo để di chuyển • Nháy đúp để sửa tên/công thức";
          card.innerHTML = `<span class="mn-meas-tag"></span><span class="mn-meas-math"></span><button type="button" class="mn-meas-del" title="Xóa phép đo">×</button>`;
          attachCardEvents(card, pIdx, m.id, m.varName);
          layer.appendChild(card);
        }
        card.style.left = `${Math.round(pos.sx - sr.left)}px`;
        card.style.top = `${Math.round(pos.sy - sr.top)}px`;
        card.style.transform = `scale(${Math.max(0.7, Math.min(1.5, pos.zoom))})`;
        card.classList.toggle("calc-pickable", STATE.calcOpen);
        card.querySelector(".mn-meas-tag").textContent = m.varName || "m";

        const res = results.get(m.id) || { tex: "—", plain: "—" };
        renderTexInto(card.querySelector(".mn-meas-math"), res.tex, res.plain);
      });
    });

    layer.querySelectorAll(".mn-meas-card").forEach(el => {
      if (!keep.has(el.dataset.key)) el.remove();
    });
    void force;
  }

  function attachCardEvents(card, pIdx, measId, varName) {
    let drag = null;
    card.querySelector(".mn-meas-del").addEventListener("click", e => {
      e.stopPropagation();
      deleteMeasurement(pIdx, measId);
    });
    card.addEventListener("pointerdown", e => {
      if (e.button !== 0 || e.target.closest(".mn-meas-del")) return;
      e.stopPropagation();
      if (STATE.calcOpen) {
        insertCalcToken(varName);
        return;
      }
      const pg = getPage(pIdx);
      const m = pg && pg.geo && (pg.geo.measurements || []).find(x => x.id === measId);
      if (!m) return;
      const ed = getEditor();
      drag = { sx: e.clientX, sy: e.clientY, ox: Number.isFinite(m.x) ? m.x : 48, oy: Number.isFinite(m.y) ? m.y : 44, z: (ed && ed.zoom) || 1, moved: false };
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      card.classList.add("dragging");
      const nx = Math.max(8, Math.round(drag.ox + dx / drag.z));
      const ny = Math.max(8, Math.round(drag.oy + dy / drag.z));
      mutateGeo(pIdx, g => ({ ...g, measurements: (g.measurements || []).map(x => x.id === measId ? { ...x, x: nx, y: ny } : x) }), true);
    });
    card.addEventListener("pointerup", e => {
      if (!drag) return;
      const moved = drag.moved;
      const nx = Math.max(8, Math.round(drag.ox + (e.clientX - drag.sx) / drag.z));
      const ny = Math.max(8, Math.round(drag.oy + (e.clientY - drag.sy) / drag.z));
      card.classList.remove("dragging");
      drag = null;
      if (moved) {
        mutateGeo(pIdx, g => ({ ...g, measurements: (g.measurements || []).map(x => x.id === measId ? { ...x, x: nx, y: ny } : x) }), false);
      }
    });
    card.addEventListener("dblclick", e => {
      e.stopPropagation();
      openCalcModal(pIdx, measId);
    });
  }

  // ==================== POPOVER & EXPRESSION CALCULATOR MODAL ====================

  function ensurePop() {
    let pop = document.getElementById("mn-gsp-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "mn-gsp-pop";
      document.body.appendChild(pop);
      document.addEventListener("pointerdown", e => {
        if (STATE.popOpen && !e.target.closest("#mn-gsp-pop") && !e.target.closest('[data-mn-gsp-trigger="1"]')) {
          closePop();
        }
      });
    }
    return pop;
  }

  function closePop() {
    STATE.popOpen = false;
    const pop = document.getElementById("mn-gsp-pop");
    if (pop) pop.classList.remove("open");
  }

  function togglePopover(evt) {
    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
    const pop = ensurePop();
    if (STATE.popOpen) return closePop();
    const data = buildSelectionActions();
    if (!data) return;

    pop.innerHTML = "";
    const addSection = (title, items) => {
      if (!items.length) return;
      if (pop.childElementCount > 0) {
        const sep = document.createElement("div");
        sep.className = "mn-gsp-sep";
        pop.appendChild(sep);
      }
      const h = document.createElement("div");
      h.className = "mn-gsp-sec";
      h.textContent = title;
      pop.appendChild(h);
      for (const it of items) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mn-gsp-item";
        b.innerHTML = `<span>${it.label}</span><small>${it.hint || ""}</small>`;
        b.addEventListener("click", e => {
          e.stopPropagation();
          closePop();
          it.run();
        });
        pop.appendChild(b);
      }
    };

    addSection("Đo đạc động", data.measure);
    addSection("Tách / Ghép điểm", data.edit);
    addSection("Quan hệ & Vết", data.graph);

    const trigger = evt && evt.currentTarget ? evt.currentTarget : document.querySelector('[data-mn-gsp-trigger="1"]');
    pop.classList.add("open");
    STATE.popOpen = true;

    if (trigger) {
      const r = trigger.getBoundingClientRect();
      const pw = pop.offsetWidth || 250, ph = pop.offsetHeight || 220;
      const left = Math.max(10, Math.min(window.innerWidth - pw - 10, r.left));
      const top = (r.bottom + ph + 12 <= window.innerHeight) ? (r.bottom + 6) : Math.max(10, r.top - ph - 6);
      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
    }
  }

  function ensureCalcModal() {
    let bd = document.getElementById("mn-calc-backdrop");
    if (!bd) {
      bd = document.createElement("div");
      bd.id = "mn-calc-backdrop";
      bd.innerHTML = `
        <div class="mn-calc-box" role="dialog" aria-modal="true">
          <div class="mn-calc-head">
            <span id="mn-calc-title">Tính toán biểu thức động</span>
            <button type="button" id="mn-calc-x" style="border:0;background:none;font-size:18px;cursor:pointer;color:inherit">×</button>
          </div>
          <div class="mn-calc-body">
            <div>
              <div class="mn-calc-label">Nhãn hiển thị (tùy chọn)</div>
              <input class="mn-calc-input" id="mn-calc-lbl" placeholder="VD: AB^2 + AC^2 (để trống sẽ hiện tự động)" />
            </div>
            <div id="mn-calc-expr-wrap">
              <div class="mn-calc-label">Biểu thức tính động</div>
              <input class="mn-calc-input" id="mn-calc-expr" placeholder="VD: m1^2 + m2^2 hoặc m1 / m2" />
            </div>
            <div id="mn-calc-chips-wrap">
              <div class="mn-calc-label">Bấm để chèn giá trị đo / hàm toán</div>
              <div class="mn-calc-chips" id="mn-calc-chips"></div>
            </div>
            <div class="mn-calc-preview">
              <span style="font-size:11.5px;color:#64748b;font-weight:600">Kết quả trực tiếp:</span>
              <span id="mn-calc-res" style="font-weight:700;color:#2563eb"></span>
            </div>
          </div>
          <div class="mn-calc-foot">
            <button type="button" class="mn-calc-btn" id="mn-calc-cancel">Hủy</button>
            <button type="button" class="mn-calc-btn primary" id="mn-calc-ok">Ghim lên bảng</button>
          </div>
        </div>`;
      document.body.appendChild(bd);
      bd.addEventListener("click", e => { if (e.target === bd) closeCalcModal(); });
      bd.querySelector("#mn-calc-x").addEventListener("click", closeCalcModal);
      bd.querySelector("#mn-calc-cancel").addEventListener("click", closeCalcModal);
      bd.querySelector("#mn-calc-expr").addEventListener("input", updateCalcPreview);
      bd.querySelector("#mn-calc-lbl").addEventListener("input", updateCalcPreview);
      bd.querySelector("#mn-calc-ok").addEventListener("click", commitCalcModal);
    }
    return bd;
  }

  function insertCalcToken(tok) {
    const inp = document.getElementById("mn-calc-expr");
    if (!inp) return;
    const s = inp.selectionStart ?? inp.value.length;
    const e = inp.selectionEnd ?? inp.value.length;
    inp.value = inp.value.slice(0, s) + tok + inp.value.slice(e);
    inp.focus();
    inp.setSelectionRange(s + tok.length, s + tok.length);
    updateCalcPreview();
  }

  function updateCalcPreview() {
    const pg = getPage(STATE.editingPageIdx);
    const K = getKernel();
    const resEl = document.getElementById("mn-calc-res");
    if (!pg || !pg.geo || !K || !resEl) return;
    const coords = K.Tt(pg.geo);
    const { env } = evaluateAllMeasurements(pg.geo, coords);
    const expr = (document.getElementById("mn-calc-expr").value || "").trim();
    const m = STATE.editingMeasId && (pg.geo.measurements || []).find(x => x.id === STATE.editingMeasId);
    if (m && m.kind !== "calc") {
      const r = evalMeasurement(pg.geo, coords, { ...m, label: document.getElementById("mn-calc-lbl").value.trim() }, env);
      resEl.textContent = r.plain;
      return;
    }
    const v = expr && typeof K._mnEvalExpr === "function" ? K._mnEvalExpr(expr, env) : NaN;
    resEl.textContent = Number.isFinite(v) ? fmt(v, 3) : "Chưa hợp lệ";
  }

  function openCalcModal(pIdx, measId) {
    const bd = ensureCalcModal();
    STATE.editingPageIdx = pIdx;
    STATE.editingMeasId = measId || null;
    STATE.calcOpen = true;

    const pg = getPage(pIdx);
    const geo = pg && pg.geo ? pg.geo : { measurements: [], params: [] };
    const existing = measId ? (geo.measurements || []).find(x => x.id === measId) : null;
    const isCalc = !existing || existing.kind === "calc";

    bd.querySelector("#mn-calc-title").textContent = existing ? `Sửa phép đo ${existing.varName}` : "Tính toán biểu thức động";
    bd.querySelector("#mn-calc-lbl").value = existing ? (existing.label || "") : "";
    bd.querySelector("#mn-calc-expr").value = existing && existing.expr ? existing.expr : "";
    bd.querySelector("#mn-calc-expr-wrap").style.display = isCalc ? "" : "none";
    bd.querySelector("#mn-calc-chips-wrap").style.display = isCalc ? "" : "none";
    bd.querySelector("#mn-calc-ok").textContent = existing ? "Lưu thay đổi" : "Ghim lên bảng";

    const chips = bd.querySelector("#mn-calc-chips");
    chips.innerHTML = "";
    if (isCalc) {
      const tokens = [
        ...(geo.measurements || []).filter(m => m.id !== measId).map(m => ({ t: m.varName, lbl: m.varName })),
        ...(geo.params || []).map(p => ({ t: p.name, lbl: p.name })),
        ...["+", "-", "*", "/", "^2", "sqrt(", "sin(", "cos(", "abs(", "pi"].map(t => ({ t, lbl: t }))
      ];
      for (const tk of tokens) {
        const c = document.createElement("button");
        c.type = "button";
        c.className = "mn-calc-chip";
        c.textContent = tk.lbl;
        c.addEventListener("click", () => insertCalcToken(tk.t));
        chips.appendChild(c);
      }
    }

    bd.classList.add("open");
    renderMeasurements(true);
    updateCalcPreview();
    setTimeout(() => (isCalc ? bd.querySelector("#mn-calc-expr") : bd.querySelector("#mn-calc-lbl")).focus(), 30);
  }

  function closeCalcModal() {
    STATE.calcOpen = false;
    STATE.editingMeasId = null;
    const bd = document.getElementById("mn-calc-backdrop");
    if (bd) bd.classList.remove("open");
    renderMeasurements(true);
  }

  function commitCalcModal() {
    const pIdx = STATE.editingPageIdx;
    const lbl = document.getElementById("mn-calc-lbl").value.trim();
    const expr = document.getElementById("mn-calc-expr").value.trim();
    if (STATE.editingMeasId) {
      const id = STATE.editingMeasId;
      mutateGeo(pIdx, g => ({
        ...g,
        measurements: (g.measurements || []).map(m => m.id === id ? { ...m, label: lbl, ...(m.kind === "calc" ? { expr: expr || m.expr } : {}) } : m)
      }));
    } else {
      if (!expr) return toast("Hãy nhập biểu thức cần tính.");
      addMeasurement(pIdx, { kind: "calc", expr, label: lbl });
    }
    closeCalcModal();
  }

  // ==================== RUNTIME LOOP & SHORTCUTS ====================

  function canShowInSelBar() {
    const ed = getEditor();
    return !!(ed && ed.sel && (ed.sel.points.size > 0 || ed.sel.shapes.size > 0));
  }

  let rafScheduled = false;
  function scheduleSync() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      renderMeasurements(false);
    });
  }

  function init() {
    let scroller = null;
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "b" || e.key === "B")) {
        const tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
        const ed = getEditor();
        if (ed && typeof ed.hasTraces === "function" && ed.hasTraces()) {
          e.preventDefault();
          eraseTracesNow();
        }
      }
      if (e.key === "Escape") {
        if (STATE.popOpen) closePop();
        if (STATE.calcOpen) closeCalcModal();
      }
    });

    // Lightweight 60fps sync ONLY when measurements exist on the active doc
    const tick = () => {
      const ed = getEditor();
      if (ed) {
        if (ed.scroller && scroller !== ed.scroller) {
          scroller = ed.scroller;
          scroller.addEventListener("scroll", scheduleSync, { passive: true });
        }
        const pages = ed.view && ed.view.pages ? ed.view.pages : (ed.doc && ed.doc.pages);
        const hasMeas = Array.isArray(pages) && pages.some(pg => pg && pg.geo && pg.geo.measurements && pg.geo.measurements.length > 0);
        if (hasMeas) {
          renderMeasurements(false);
        } else {
          const layer = document.getElementById("mn-meas-canvas-layer");
          if (layer && layer.childElementCount > 0) layer.innerHTML = "";
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.MinNoteGeoTools = {
    canShowInSelBar,
    togglePopover,
    openCalcModal,
    addMeasurement,
    selectParents,
    selectChildren,
    splitSelectedPoint,
    mergePointToPath,
    mergeTwoPoints,
    eraseTracesNow,
    renderMeasurements,
    pageToScreen
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
