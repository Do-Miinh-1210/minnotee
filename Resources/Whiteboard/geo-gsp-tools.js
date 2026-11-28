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
    calcPickMode: true,
    calcPos: null,
    calcUnit: "",
    calcRefs: {},
    calcPendingPt: null,
    calcActiveMenu: null,
    calcHover: null,
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
      const localEnv = { ...env };
      if (m.refs && typeof m.refs === "object") {
        for (const [tok, ref] of Object.entries(m.refs)) {
          const rv = evalRefSpec(geo, coords, ref);
          if (Number.isFinite(rv)) localEnv[tok] = rv;
        }
      }
      let val = NaN;
      if (K && typeof K._mnEvalExpr === "function") {
        const res = K._mnEvalExpr(m.expr || "0", localEnv);
        if (Number.isFinite(res)) val = res;
      }
      const niceExpr = exprToTex(m.expr || "0");
      const lhs = m.label ? `${m.label} = ` : `${niceExpr} = `;
      const uTex = unitTex(m.unit);
      const uPlain = unitPlain(m.unit);
      const dec = m.unit === "deg" ? 1 : 2;
      return { val, tex: `${lhs}${fmtTex(val, dec)}${uTex}`, plain: `${m.varName} = ${fmt(val, dec)}${uPlain}` };
    }
    return { val: NaN, tex: "—", plain: "—" };
  }

  function unitTex(u) {
    if (u === "cm") return "\\,\\text{cm}";
    if (u === "cm2") return "\\,\\text{cm}^2";
    if (u === "deg") return "^\\circ";
    if (u === "rad") return "\\,\\text{rad}";
    return "";
  }

  function unitPlain(u) {
    if (u === "cm") return " cm";
    if (u === "cm2") return " cm²";
    if (u === "deg") return "°";
    if (u === "rad") return " rad";
    return "";
  }

  function evalRefSpec(geo, coords, ref) {
    if (!ref || !geo || !coords) return NaN;
    const cm = getCmPx(geo);
    const shById = id => (geo.shapes || []).find(s => s.id === id);
    if (ref.kind === "dist" && Array.isArray(ref.pts) && ref.pts.length >= 2) {
      return distPx(coords.get(ref.pts[0]), coords.get(ref.pts[1])) / cm;
    }
    if (ref.kind === "angle" && Array.isArray(ref.pts) && ref.pts.length >= 3) {
      const A = coords.get(ref.pts[0]), B = coords.get(ref.pts[1]), C = coords.get(ref.pts[2]);
      if (!A || !B || !C) return NaN;
      const u1x = A.x - B.x, u1y = A.y - B.y, u2x = C.x - B.x, u2y = C.y - B.y;
      const l1 = Math.hypot(u1x, u1y), l2 = Math.hypot(u2x, u2y);
      if (l1 <= 1e-6 || l2 <= 1e-6) return NaN;
      return Math.acos(Math.max(-1, Math.min(1, (u1x * u2x + u1y * u2y) / (l1 * l2)))) * 180 / Math.PI;
    }
    if (ref.kind === "circR" || ref.kind === "circC" || ref.kind === "circS") {
      const sh = ref.shapeId ? shById(ref.shapeId) : null;
      const rPx = sh ? circleRadiusPx(sh, coords) : (Array.isArray(ref.pts) && ref.pts.length >= 2 ? distPx(coords.get(ref.pts[0]), coords.get(ref.pts[1])) : NaN);
      const r = rPx / cm;
      if (!Number.isFinite(r)) return NaN;
      return ref.kind === "circR" ? r : (ref.kind === "circC" ? 2 * Math.PI * r : Math.PI * r * r);
    }
    if (ref.kind === "polyP" || ref.kind === "polyS") {
      const sh = ref.shapeId ? shById(ref.shapeId) : null;
      const pts = (sh && Array.isArray(sh.pts) && sh.pts.length >= 3) ? sh.pts : (ref.pts || []);
      const met = polygonMetrics(pts, coords, cm);
      return ref.kind === "polyP" ? met.perim : met.area;
    }
    return NaN;
  }

  function replaceBalancedFn(str, fnName, wrap) {
    let out = str;
    let guard = 0;
    while (guard++ < 24) {
      const re = new RegExp(`\\b${fnName}\\(`, "i");
      const m = re.exec(out);
      if (!m) break;
      const start = m.index;
      let i = start + m[0].length, depth = 1;
      while (i < out.length && depth > 0) {
        if (out[i] === "(") depth++;
        else if (out[i] === ")") depth--;
        i++;
      }
      if (depth !== 0) break;
      const inner = out.slice(start + m[0].length, i - 1);
      out = out.slice(0, start) + wrap(inner) + out.slice(i);
    }
    return out;
  }

  function exprToTex(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    s = replaceBalancedFn(s, "sqrt", inner => `\\sqrt{${inner}}`);
    s = replaceBalancedFn(s, "abs", inner => `\\left|${inner}\\right|`);
    s = s
      .replace(/(\d+),(\d+)/g, "$1{,}$2")
      .replace(/\^\(([^()]+)\)/g, "^{$1}")
      .replace(/\^([0-9A-Za-z]+)/g, "^{$1}")
      .replace(/\*/g, " \\cdot ")
      .replace(/×/g, " \\cdot ")
      .replace(/÷/g, " \\div ")
      .replace(/−/g, " - ")
      .replace(/\b(sin|cos|tan|ln|log)\b/gi, (_, fn) => `\\${fn.toLowerCase()}`)
      .replace(/\b(arcsin|arccos|arctan)\b/gi, (_, fn) => `\\operatorname{${fn.toLowerCase()}}`)
      .replace(/\b(asin|acos|atan)\b/gi, (_, fn) => `\\${fn.slice(1).toLowerCase()}^{-1}`)
      .replace(/\b(sgn|round|trunc|floor|ceil)\b/gi, (_, fn) => `\\operatorname{${fn.toLowerCase()}}`)
      .replace(/\bpi\b/gi, "\\pi")
      .replace(/π/g, "\\pi")
      .replace(/α/g, "\\alpha").replace(/β/g, "\\beta").replace(/γ/g, "\\gamma").replace(/θ/g, "\\theta")
      .replace(/\b([RCSPM])_([A-Za-z0-9]+)\b/g, "$1_{$2}")
      .replace(/\bm(\d+)\b/g, "m_{$1}");
    return s;
  }

  function collectGeoEntities(geo, coords) {
    const segments = [];
    const circles = [];
    const polygons = [];
    if (!geo || !coords) return { segments, circles, polygons };
    const cm = getCmPx(geo);
    const seenEdge = new Set();

    const addEdge = (idA, idB, shapeId) => {
      if (!idA || !idB || idA === idB) return;
      const pA = coords.get(idA), pB = coords.get(idB);
      if (!pA || !pB) return;
      const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
      if (seenEdge.has(key)) return;
      seenEdge.add(key);
      const nA = ptName(geo, idA).replace(/\s+/g, "");
      const nB = ptName(geo, idB).replace(/\s+/g, "");
      const tok = `${nA}${nB}`;
      const val = distPx(pA, pB) / cm;
      segments.push({ tok, altTok: `${nB}${nA}`, pts: [idA, idB], pA, pB, val, shapeId });
    };

    for (const sh of (geo.shapes || [])) {
      if (!sh || !Array.isArray(sh.pts)) continue;
      if (sh.kind === "segment" && sh.pts.length >= 2) {
        addEdge(sh.pts[0], sh.pts[1], sh.id);
      } else if (sh.kind === "polygon" && sh.pts.length >= 3) {
        for (let i = 0; i < sh.pts.length; i++) {
          addEdge(sh.pts[i], sh.pts[(i + 1) % sh.pts.length], sh.id);
        }
        const ptsCoords = sh.pts.map(id => coords.get(id)).filter(Boolean);
        if (ptsCoords.length >= 3) {
          const met = polygonMetrics(sh.pts, coords, cm);
          const nm = sh.pts.slice(0, 5).map(id => ptName(geo, id).replace(/\s+/g, "")).join("");
          polygons.push({ shapeId: sh.id, pts: [...sh.pts], ptsCoords, nm, area: met.area, perim: met.perim });
        }
      } else if (sh.kind === "circle" && sh.pts.length >= 2) {
        const cPt = coords.get(sh.pts[0]);
        const rPx = circleRadiusPx(sh, coords);
        if (cPt && Number.isFinite(rPx) && rPx > 1) {
          const oNm = ptName(geo, sh.pts[0]).replace(/\s+/g, "");
          circles.push({ shapeId: sh.id, pts: sh.pts.slice(0, 2), center: cPt, rPx, rCm: rPx / cm, oNm });
        }
      }
    }
    return { segments, circles, polygons };
  }

  function evaluateAllMeasurements(geo, coords) {
    const K = getKernel();
    const env = (K && typeof K._mnBuildParamEnv === "function") ? { ...K._mnBuildParamEnv(geo) } : {};
    // Populate implicit live geometric values (segments AB, circles R_O, polygons S_ABC)
    // so manually typed or directly picked geometric tokens always stay live!
    const ents = collectGeoEntities(geo, coords);
    for (const seg of ents.segments) {
      if (Number.isFinite(seg.val)) {
        if (!Object.prototype.hasOwnProperty.call(env, seg.tok)) env[seg.tok] = seg.val;
        if (!Object.prototype.hasOwnProperty.call(env, seg.altTok)) env[seg.altTok] = seg.val;
      }
    }
    for (const c of ents.circles) {
      if (Number.isFinite(c.rCm)) {
        const rk = `R_${c.oNm}`, ck = `C_${c.oNm}`, sk = `S_${c.oNm}`;
        if (!Object.prototype.hasOwnProperty.call(env, rk)) env[rk] = c.rCm;
        if (!Object.prototype.hasOwnProperty.call(env, ck)) env[ck] = 2 * Math.PI * c.rCm;
        if (!Object.prototype.hasOwnProperty.call(env, sk)) env[sk] = Math.PI * c.rCm * c.rCm;
      }
    }
    for (const pl of ents.polygons) {
      if (Number.isFinite(pl.area) && !Object.prototype.hasOwnProperty.call(env, `S_${pl.nm}`)) env[`S_${pl.nm}`] = pl.area;
      if (Number.isFinite(pl.perim) && !Object.prototype.hasOwnProperty.call(env, `P_${pl.nm}`)) env[`P_${pl.nm}`] = pl.perim;
    }

    const list = Array.isArray(geo.measurements) ? geo.measurements : [];
    const results = new Map();
    for (const m of list) {
      const r = evalMeasurement(geo, coords, m, env);
      results.set(m.id, r);
      if (m.varName && Number.isFinite(r.val)) env[m.varName] = r.val;
    }
    return { results, env, ents };
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
      const nextMeas = (g.measurements || []).map(m => {
        const nextRefs = m.refs && typeof m.refs === "object"
          ? Object.fromEntries(Object.entries(m.refs).map(([k, r]) => [k, r && Array.isArray(r.pts) ? { ...r, pts: r.pts.map(x => x === dropId ? keepId : x) } : r]))
          : m.refs;
        return {
          ...m,
          pts: Array.isArray(m.pts) ? m.pts.map(x => x === dropId ? keepId : x) : m.pts,
          ...(nextRefs ? { refs: nextRefs } : {})
        };
      });
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
    measure.push({ label: "Tính toán biểu thức động…", hint: "f(x)", run: () => openCalcModal(pIdx, null) });

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

  function screenToPage(pIdx, clientX, clientY) {
    const ed = getEditor();
    if (!ed || !ed.scroller) return null;
    const sr = ed.scroller.getBoundingClientRect();
    const z = ed.zoom || 1;
    const ox = Number.isFinite(ed.offsetX) ? ed.offsetX : 0;
    const topOff = typeof ed.pageTop === "function" ? ed.pageTop(pIdx) : (pIdx * 1150);
    return {
      x: (clientX - sr.left + ed.scroller.scrollLeft - ox) / z,
      y: (clientY - sr.top + ed.scroller.scrollTop) / z - topOff,
      zoom: z,
      sr
    };
  }

  function pointSegDist(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= 1e-9) return { d: Math.hypot(px - a.x, py - a.y), t: 0 };
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / d2));
    return { d: Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t)), t };
  }

  function pointInPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
    }
    return inside;
  }

  function hitTestGeometry(pIdx, clientX, clientY) {
    const pg = getPage(pIdx);
    const K = getKernel();
    if (!pg || !pg.geo || !K) return null;
    const pt = screenToPage(pIdx, clientX, clientY);
    if (!pt) return null;
    const { x, y, zoom } = pt;
    const tol = Math.max(10, 14 / zoom);
    const geo = pg.geo;
    const coords = K.Tt(geo);
    const ents = collectGeoEntities(geo, coords);

    // If user already picked first endpoint for a 2-point distance, prioritize points!
    const findPoint = (maxR) => {
      let best = null, bestD = maxR;
      for (const [id, p] of coords.entries()) {
        if (!geo.points || !geo.points[id]) continue;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bestD) { bestD = d; best = { kind: "point", id, p, label: ptName(geo, id) }; }
      }
      return best;
    };

    if (STATE.calcPendingPt) {
      const hp = findPoint(tol * 1.15);
      if (hp && hp.id !== STATE.calcPendingPt.id) return hp;
    }

    // 1. Segments & Polygon edges (click anywhere along the edge to pick its length!)
    let bestSeg = null, bestSegD = tol;
    for (const seg of ents.segments) {
      const { d, t } = pointSegDist(x, y, seg.pA, seg.pB);
      // Slight preference away from endpoints so vertices remain clickable if desired
      const effD = (t < 0.08 || t > 0.92) ? d + 3 / zoom : d;
      if (d <= tol && effD < bestSegD) {
        bestSegD = effD;
        bestSeg = {
          kind: "segment",
          tok: seg.tok,
          val: seg.val,
          pA: seg.pA,
          pB: seg.pB,
          ref: { kind: "dist", pts: seg.pts },
          tip: `${seg.tok} = ${fmt(seg.val, 2)} cm`
        };
      }
    }
    if (bestSeg) return bestSeg;

    // 2. Circle circumference -> radius R_(O)
    let bestCirc = null, bestCircD = tol;
    for (const c of ents.circles) {
      const d = Math.abs(Math.hypot(x - c.center.x, y - c.center.y) - c.rPx);
      if (d < bestCircD) {
        bestCircD = d;
        bestCirc = {
          kind: "circle",
          tok: `R_${c.oNm}`,
          val: c.rCm,
          center: c.center,
          rPx: c.rPx,
          ref: { kind: "circR", shapeId: c.shapeId, pts: c.pts },
          tip: `R_${c.oNm} = ${fmt(c.rCm, 2)} cm`
        };
      }
    }
    if (bestCirc) return bestCirc;

    // 3. Points (click 2 points to insert their distance AB)
    const hp = findPoint(tol);
    if (hp) return hp;

    // 4. Polygon interior -> area S_ABC
    let bestPoly = null, bestArea = Infinity;
    for (const pl of ents.polygons) {
      if (pointInPoly(x, y, pl.ptsCoords) && pl.area < bestArea) {
        bestArea = pl.area;
        bestPoly = {
          kind: "polygon",
          tok: `S_${pl.nm}`,
          val: pl.area,
          ptsCoords: pl.ptsCoords,
          ref: { kind: "polyS", shapeId: pl.shapeId, pts: pl.pts },
          tip: `S_${pl.nm} = ${fmt(pl.area, 2)} cm²`
        };
      }
    }
    return bestPoly;
  }

  function ensureHoverLayer() {
    let el = document.getElementById("mn-calc-hover-layer");
    if (!el) {
      el = document.createElement("div");
      el.id = "mn-calc-hover-layer";
      el.innerHTML = `<svg id="mn-calc-hover-svg"></svg><div id="mn-calc-hover-tip"></div>`;
      document.body.appendChild(el);
    }
    return el;
  }

  function clearCalcHover() {
    STATE.calcHover = null;
    const el = document.getElementById("mn-calc-hover-layer");
    if (el) el.classList.remove("active");
  }

  function renderCalcHover(pIdx, hit, flashSuccess = false) {
    const ed = getEditor();
    const el = ensureHoverLayer();
    if (!ed || !ed.scroller || (!hit && !STATE.calcPendingPt)) {
      el.classList.remove("active");
      return;
    }
    const sr = ed.scroller.getBoundingClientRect();
    el.style.left = `${sr.left}px`;
    el.style.top = `${sr.top}px`;
    el.style.width = `${Math.max(0, sr.width)}px`;
    el.style.height = `${Math.max(0, sr.height)}px`;
    el.classList.add("active");

    const svg = el.querySelector("#mn-calc-hover-svg");
    const tip = el.querySelector("#mn-calc-hover-tip");
    const toLocal = (p) => {
      const sc = pageToScreen(pIdx, p.x, p.y);
      return sc ? { x: sc.sx - sr.left, y: sc.sy - sr.top, z: sc.zoom } : null;
    };
    const stroke = flashSuccess ? "#10b981" : "#2563eb";
    const fillSoft = flashSuccess ? "rgba(16,185,129,0.16)" : "rgba(37,99,235,0.14)";
    let shapesHtml = "";
    let tipText = "";
    let tipX = 0, tipY = 0;

    if (STATE.calcPendingPt) {
      const pg = getPage(pIdx), K = getKernel();
      const c1 = pg && pg.geo && K ? K.Tt(pg.geo).get(STATE.calcPendingPt.id) : null;
      const l1 = c1 ? toLocal(c1) : null;
      if (l1) {
        shapesHtml += `<circle cx="${l1.x.toFixed(1)}" cy="${l1.y.toFixed(1)}" r="8" fill="rgba(37,99,235,0.22)" stroke="#2563eb" stroke-width="2.4"/>`;
        if (hit && hit.kind === "point" && hit.id !== STATE.calcPendingPt.id) {
          const l2 = toLocal(hit.p);
          if (l2) {
            const cm = getCmPx(pg.geo);
            const dVal = distPx(c1, hit.p) / cm;
            shapesHtml += `<line x1="${l1.x.toFixed(1)}" y1="${l1.y.toFixed(1)}" x2="${l2.x.toFixed(1)}" y2="${l2.y.toFixed(1)}" stroke="${stroke}" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round"/>`;
            shapesHtml += `<circle cx="${l2.x.toFixed(1)}" cy="${l2.y.toFixed(1)}" r="7" fill="${stroke}" stroke="#fff" stroke-width="2"/>`;
            tipX = (l1.x + l2.x) / 2;
            tipY = (l1.y + l2.y) / 2 - 18;
            tipText = `${STATE.calcPendingPt.label}${hit.label} = ${fmt(dVal, 2)} cm`;
          }
        }
      }
    }

    if (hit && hit.kind === "segment") {
      const a = toLocal(hit.pA), b = toLocal(hit.pB);
      if (a && b) {
        shapesHtml += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${stroke}" stroke-width="5" stroke-opacity="0.32" stroke-linecap="round"/>`;
        shapesHtml += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${stroke}" stroke-width="2.6" stroke-linecap="round"/>`;
        shapesHtml += `<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="4.5" fill="${stroke}" stroke="#fff" stroke-width="1.5"/>`;
        shapesHtml += `<circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="4.5" fill="${stroke}" stroke="#fff" stroke-width="1.5"/>`;
        tipX = (a.x + b.x) / 2;
        tipY = (a.y + b.y) / 2 - 18;
        tipText = hit.tip;
      }
    } else if (hit && hit.kind === "circle") {
      const c = toLocal(hit.center);
      if (c) {
        const rr = hit.rPx * c.z;
        shapesHtml += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${rr.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="3" stroke-dasharray="7 4"/>`;
        tipX = c.x;
        tipY = c.y - rr - 16;
        tipText = hit.tip;
      }
    } else if (hit && hit.kind === "polygon") {
      const pts = hit.ptsCoords.map(toLocal).filter(Boolean);
      if (pts.length >= 3) {
        const ptsStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        shapesHtml += `<polygon points="${ptsStr}" fill="${fillSoft}" stroke="${stroke}" stroke-width="2.4"/>`;
        tipX = pts.reduce((a, p) => a + p.x, 0) / pts.length;
        tipY = pts.reduce((a, p) => a + p.y, 0) / pts.length - 10;
        tipText = hit.tip;
      }
    } else if (hit && hit.kind === "point" && !tipText) {
      const lp = toLocal(hit.p);
      if (lp) {
        shapesHtml += `<circle cx="${lp.x.toFixed(1)}" cy="${lp.y.toFixed(1)}" r="7.5" fill="${fillSoft}" stroke="${stroke}" stroke-width="2.4"/>`;
        tipX = lp.x;
        tipY = lp.y - 20;
        tipText = `Điểm ${hit.label} (chọn 2 điểm để đo)`;
      }
    }

    svg.innerHTML = shapesHtml;
    if (tipText) {
      tip.textContent = tipText;
      tip.classList.toggle("ok", flashSuccess);
      tip.style.left = `${Math.round(Math.max(48, Math.min(sr.width - 48, tipX)))}px`;
      tip.style.top = `${Math.round(Math.max(22, Math.min(sr.height - 24, tipY)))}px`;
      tip.style.display = "block";
    } else {
      tip.style.display = "none";
    }
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
        e.preventDefault();
        insertCalcToken(varName, { flashEl: card });
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

  // ==================== FLOATING MODELESS GSP DYNAMIC CALCULATOR ====================

  const CALC_FUNC_GROUPS = [
    {
      title: "Lượng giác (Độ)",
      items: [
        { lbl: "sin", tok: "sin(", sym: "sin(x)" },
        { lbl: "cos", tok: "cos(", sym: "cos(x)" },
        { lbl: "tan", tok: "tan(", sym: "tan(x)" },
        { lbl: "Arcsin", tok: "asin(", sym: "sin⁻¹(x)" },
        { lbl: "Arccos", tok: "acos(", sym: "cos⁻¹(x)" },
        { lbl: "Arctan", tok: "atan(", sym: "tan⁻¹(x)" }
      ]
    },
    {
      title: "Đại số & Logarit",
      items: [
        { lbl: "abs", tok: "abs(", sym: "|x|" },
        { lbl: "sqrt", tok: "sqrt(", sym: "√x" },
        { lbl: "ln", tok: "ln(", sym: "ln(x)" },
        { lbl: "log", tok: "log(", sym: "log₁₀(x)" },
        { lbl: "exp", tok: "exp(", sym: "eˣ" },
        { lbl: "x²", tok: "^2", isOp: true, sym: "Bình phương" }
      ]
    },
    {
      title: "Dấu & Làm tròn",
      items: [
        { lbl: "sgn", tok: "sgn(", sym: "Dấu (-1, 0, 1)" },
        { lbl: "round", tok: "round(", sym: "Làm tròn" },
        { lbl: "trunc", tok: "trunc(", sym: "Phần nguyên" },
        { lbl: "floor", tok: "floor(", sym: "Làm tròn xuống" },
        { lbl: "ceil", tok: "ceil(", sym: "Làm tròn lên" }
      ]
    }
  ];

  const CALC_UNITS = [
    { id: "", lbl: "Không đơn vị", short: "Đơn vị" },
    { id: "cm", lbl: "cm (Độ dài)", short: "Đơn vị: cm" },
    { id: "cm2", lbl: "cm² (Diện tích)", short: "Đơn vị: cm²" },
    { id: "deg", lbl: "Độ (°)", short: "Đơn vị: °" },
    { id: "rad", lbl: "Radian (rad)", short: "Đơn vị: rad" }
  ];

  function closeCalcMenu() {
    STATE.calcActiveMenu = null;
    const pop = document.getElementById("mn-calc-menu-pop");
    if (pop) pop.classList.remove("open");
    document.querySelectorAll("#mn-calc-window .mn-calc-mbtn.open").forEach(b => b.classList.remove("open"));
  }

  function ensureCalcMenuPop() {
    let pop = document.getElementById("mn-calc-menu-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "mn-calc-menu-pop";
      document.body.appendChild(pop);
      pop.addEventListener("pointerdown", e => e.stopPropagation());
    }
    return pop;
  }

  function openCalcMenu(kind, anchorBtn) {
    const pop = ensureCalcMenuPop();
    if (STATE.calcActiveMenu === kind) {
      closeCalcMenu();
      return;
    }
    closeCalcMenu();
    STATE.calcActiveMenu = kind;
    anchorBtn.classList.add("open");
    pop.innerHTML = "";
    pop.className = `open kind-${kind}`;

    if (kind === "values") {
      const pg = getPage(STATE.editingPageIdx);
      const K = getKernel();
      const geo = pg && pg.geo ? pg.geo : { measurements: [], params: [], shapes: [], points: {} };
      const coords = K ? K.Tt(geo) : new Map();
      const { results, ents } = evaluateAllMeasurements(geo, coords);

      const addGroup = (title, rows) => {
        if (!rows.length) return;
        const h = document.createElement("div");
        h.className = "mn-cm-sec";
        h.textContent = title;
        pop.appendChild(h);
        for (const r of rows) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mn-cm-row";
          btn.innerHTML = `<span class="mn-cm-main">${r.label}</span><small>${r.val}</small>`;
          btn.addEventListener("click", e => {
            e.stopPropagation();
            insertCalcToken(r.tok, r.ref ? { ref: r.ref } : {});
            closeCalcMenu();
          });
          pop.appendChild(btn);
        }
      };

      const measRows = (geo.measurements || [])
        .filter(m => m.id !== STATE.editingMeasId)
        .map(m => {
          const ev = results.get(m.id);
          return {
            tok: m.varName,
            label: `<b>${m.varName}</b>${m.label ? ` · ${m.label}` : ""}`,
            val: ev && Number.isFinite(ev.val) ? fmt(ev.val, 2) : "—"
          };
        });
      const paramRows = (geo.params || []).map(p => ({
        tok: p.name,
        label: `<b>${p.name}</b> (tham số)`,
        val: `${fmt(Number(p.value), 2)}${p.unit === "angle" ? "°" : p.unit === "dist" ? " cm" : ""}`
      }));
      const segRows = (ents.segments || []).slice(0, 18).map(seg => ({
        tok: seg.tok,
        label: `Đoạn <b>${seg.tok}</b>`,
        val: `${fmt(seg.val, 2)} cm`,
        ref: { kind: "dist", pts: seg.pts }
      }));
      const circRows = (ents.circles || []).slice(0, 8).flatMap(c => [
        { tok: `R_${c.oNm}`, label: `Bán kính <b>R_(${c.oNm})</b>`, val: `${fmt(c.rCm, 2)} cm`, ref: { kind: "circR", shapeId: c.shapeId, pts: c.pts } },
        { tok: `C_${c.oNm}`, label: `Chu vi <b>C_(${c.oNm})</b>`, val: `${fmt(2 * Math.PI * c.rCm, 2)} cm`, ref: { kind: "circC", shapeId: c.shapeId, pts: c.pts } }
      ]);
      const polyRows = (ents.polygons || []).slice(0, 8).map(pl => ({
        tok: `S_${pl.nm}`,
        label: `Diện tích <b>S_${pl.nm}</b>`,
        val: `${fmt(pl.area, 2)} cm²`,
        ref: { kind: "polyS", shapeId: pl.shapeId, pts: pl.pts }
      }));
      const constRows = [
        { tok: "pi", label: "<b>π</b> (Hằng số Pi)", val: "3,1416…" },
        { tok: "e", label: "<b>e</b> (Số Euler)", val: "2,7183…" }
      ];

      addGroup("Số đo trên bảng", measRows);
      addGroup("Tham số KaTeX", paramRows);
      addGroup("Đoạn thẳng trên hình", segRows);
      addGroup("Đường tròn & Đa giác", [...circRows, ...polyRows]);
      addGroup("Hằng số toán học", constRows);
    } else if (kind === "funcs") {
      for (const grp of CALC_FUNC_GROUPS) {
        const h = document.createElement("div");
        h.className = "mn-cm-sec";
        h.textContent = grp.title;
        pop.appendChild(h);
        for (const fn of grp.items) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mn-cm-row";
          btn.innerHTML = `<span class="mn-cm-main"><b>${fn.lbl}</b></span><small>${fn.sym}</small>`;
          btn.addEventListener("click", e => {
            e.stopPropagation();
            insertCalcToken(fn.tok, { isOp: !!fn.isOp });
            closeCalcMenu();
          });
          pop.appendChild(btn);
        }
      }
    } else if (kind === "units") {
      for (const u of CALC_UNITS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `mn-cm-row${STATE.calcUnit === u.id ? " on" : ""}`;
        btn.innerHTML = `<span class="mn-cm-main">${u.lbl}</span><small>${STATE.calcUnit === u.id ? "✓" : ""}</small>`;
        btn.addEventListener("click", e => {
          e.stopPropagation();
          STATE.calcUnit = u.id;
          syncUnitBtn();
          updateCalcPreview();
          closeCalcMenu();
        });
        pop.appendChild(btn);
      }
    }

    const r = anchorBtn.getBoundingClientRect();
    const pw = pop.offsetWidth || 210, ph = pop.offsetHeight || 220;
    let left = r.right + 6;
    if (left + pw > window.innerWidth - 10) left = Math.max(10, r.left - pw - 6);
    if (left < 10) left = Math.max(10, window.innerWidth - pw - 10);
    const top = Math.max(10, Math.min(window.innerHeight - ph - 10, r.top));
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  }

  function syncUnitBtn() {
    const btn = document.getElementById("mn-calc-menu-units");
    if (!btn) return;
    const found = CALC_UNITS.find(u => u.id === STATE.calcUnit) || CALC_UNITS[0];
    btn.querySelector("span").textContent = found.short;
  }

  function syncPickToggleUI() {
    const win = document.getElementById("mn-calc-window");
    const btn = document.getElementById("mn-calc-pick-toggle");
    const hint = document.getElementById("mn-calc-pick-hint");
    const picking = STATE.calcOpen && STATE.calcPickMode;
    document.body.classList.toggle("mn-calc-picking", picking);
    if (btn) {
      btn.classList.toggle("on", STATE.calcPickMode);
      btn.setAttribute("aria-pressed", String(STATE.calcPickMode));
      btn.title = STATE.calcPickMode
        ? "Đang bật chọn trực tiếp trên hình (bấm để tạm tắt nếu muốn kéo điểm)"
        : "Đang tắt chọn trên hình (bấm để bật chọn đoạn thẳng / số liệu trực tiếp)";
    }
    if (hint) {
      if (STATE.calcPendingPt) {
        hint.textContent = `Đã chọn điểm ${STATE.calcPendingPt.label} — bấm điểm thứ 2 để lấy khoảng cách`;
        hint.classList.add("pending");
      } else {
        hint.textContent = STATE.calcPickMode
          ? "Bấm trực tiếp đoạn thẳng, số đo hoặc tham số trên bảng để chèn"
          : "Chế độ chọn trên bảng đang tạm tắt — bạn có thể kéo hình thử trực tiếp";
        hint.classList.remove("pending");
      }
    }
    if (win) win.classList.toggle("is-picking", picking);
    if (!picking) {
      STATE.calcPendingPt = null;
      clearCalcHover();
    }
  }

  function ensureCalcModal() {
    let win = document.getElementById("mn-calc-window");
    if (!win) {
      win = document.createElement("div");
      win.id = "mn-calc-window";
      win.setAttribute("role", "dialog");
      win.setAttribute("aria-label", "Máy tính biểu thức động");
      win.innerHTML = `
        <div class="mn-calc-head" id="mn-calc-drag-head">
          <div class="mn-calc-head-l">
            <span class="mn-calc-badge">f(x)</span>
            <span id="mn-calc-title">Máy tính biểu thức động</span>
          </div>
          <div class="mn-calc-head-r">
            <button type="button" class="mn-calc-pick-pill on" id="mn-calc-pick-toggle" aria-pressed="true">
              <span class="mn-calc-pick-dot"></span><span>Chọn trên hình</span>
            </button>
            <button type="button" class="mn-calc-x" id="mn-calc-x" title="Đóng">×</button>
          </div>
        </div>
        <div class="mn-calc-body">
          <div class="mn-calc-screen" id="mn-calc-screen">
            <div class="mn-calc-katex" id="mn-calc-katex"></div>
            <div class="mn-calc-res-row">
              <span class="mn-calc-res-lbl">Kết quả</span>
              <span class="mn-calc-res-val" id="mn-calc-res">—</span>
            </div>
          </div>

          <div class="mn-calc-pick-bar" id="mn-calc-pick-hint">Bấm trực tiếp đoạn thẳng, số đo hoặc tham số trên bảng để chèn</div>

          <div class="mn-calc-expr-row" id="mn-calc-expr-wrap">
            <input class="mn-calc-input" id="mn-calc-expr" autocomplete="off" spellcheck="false" placeholder="VD: AB^2 + AC^2 hoặc m1 / a" />
            <button type="button" class="mn-calc-lbl-tog" id="mn-calc-lbl-tog" title="Đặt nhãn hiển thị tùy chọn">Nhãn</button>
          </div>

          <div class="mn-calc-lbl-wrap" id="mn-calc-lbl-wrap">
            <input class="mn-calc-input mn-calc-lbl-inp" id="mn-calc-lbl" placeholder="Nhãn hiển thị (tùy chọn, VD: Chu vi)" />
          </div>

          <div class="mn-calc-deck" id="mn-calc-deck">
            <div class="mn-calc-pad" id="mn-calc-pad">
              <button type="button" class="mn-ck" data-k="7">7</button>
              <button type="button" class="mn-ck" data-k="8">8</button>
              <button type="button" class="mn-ck" data-k="9">9</button>
              <button type="button" class="mn-ck op" data-op="+">+</button>
              <button type="button" class="mn-ck op" data-op="^">^</button>

              <button type="button" class="mn-ck" data-k="4">4</button>
              <button type="button" class="mn-ck" data-k="5">5</button>
              <button type="button" class="mn-ck" data-k="6">6</button>
              <button type="button" class="mn-ck op" data-op="-">−</button>
              <button type="button" class="mn-ck op" data-k="(">(</button>

              <button type="button" class="mn-ck" data-k="1">1</button>
              <button type="button" class="mn-ck" data-k="2">2</button>
              <button type="button" class="mn-ck" data-k="3">3</button>
              <button type="button" class="mn-ck op" data-op="*">×</button>
              <button type="button" class="mn-ck op" data-k=")">)</button>

              <button type="button" class="mn-ck wide" data-k="0">0</button>
              <button type="button" class="mn-ck" data-k=",">,</button>
              <button type="button" class="mn-ck op" data-op="/">÷</button>
              <button type="button" class="mn-ck del" id="mn-calc-bs" title="Xóa lùi">⌫</button>
            </div>
            <div class="mn-calc-menus">
              <button type="button" class="mn-calc-mbtn" id="mn-calc-menu-values"><span>Giá trị</span><b>▾</b></button>
              <button type="button" class="mn-calc-mbtn" id="mn-calc-menu-funcs"><span>Hàm số</span><b>▾</b></button>
              <button type="button" class="mn-calc-mbtn" id="mn-calc-menu-units"><span>Đơn vị</span><b>▾</b></button>
              <button type="button" class="mn-calc-mbtn clear" id="mn-calc-clear" title="Xóa toàn bộ biểu thức">Xoá (C)</button>
            </div>
          </div>
        </div>
        <div class="mn-calc-foot">
          <span class="mn-calc-drag-tip">Kéo thanh tiêu đề để di chuyển</span>
          <div class="mn-calc-foot-btns">
            <button type="button" class="mn-calc-btn" id="mn-calc-cancel">Hủy</button>
            <button type="button" class="mn-calc-btn primary" id="mn-calc-ok">Ghim lên bảng</button>
          </div>
        </div>`;
      document.body.appendChild(win);

      // Stop pointer events inside calculator from bubbling to canvas
      win.addEventListener("pointerdown", e => {
        e.stopPropagation();
        if (!e.target.closest(".mn-calc-mbtn")) closeCalcMenu();
      });

      // Smooth draggable title bar (like GSP / MinNote Timer)
      const head = win.querySelector("#mn-calc-drag-head");
      let drag = null;
      head.addEventListener("pointerdown", e => {
        if (e.button !== 0 || e.target.closest("button")) return;
        const r = win.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, pid: e.pointerId };
        head.setPointerCapture(e.pointerId);
        win.classList.add("dragging");
      });
      head.addEventListener("pointermove", e => {
        if (!drag || e.pointerId !== drag.pid) return;
        const w = win.offsetWidth || 344;
        const nx = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - drag.dx));
        const ny = Math.max(8, Math.min(window.innerHeight - 44, e.clientY - drag.dy));
        STATE.calcPos = { x: Math.round(nx), y: Math.round(ny) };
        win.style.left = `${STATE.calcPos.x}px`;
        win.style.top = `${STATE.calcPos.y}px`;
      });
      const endDrag = () => {
        if (!drag) return;
        drag = null;
        win.classList.remove("dragging");
      };
      head.addEventListener("pointerup", endDrag);
      head.addEventListener("pointercancel", endDrag);

      // Controls
      win.querySelector("#mn-calc-x").addEventListener("click", closeCalcModal);
      win.querySelector("#mn-calc-cancel").addEventListener("click", closeCalcModal);
      win.querySelector("#mn-calc-ok").addEventListener("click", commitCalcModal);
      win.querySelector("#mn-calc-pick-toggle").addEventListener("click", () => {
        STATE.calcPickMode = !STATE.calcPickMode;
        syncPickToggleUI();
      });
      win.querySelector("#mn-calc-lbl-tog").addEventListener("click", () => {
        const wrap = win.querySelector("#mn-calc-lbl-wrap");
        const on = wrap.classList.toggle("show");
        win.querySelector("#mn-calc-lbl-tog").classList.toggle("on", on);
        if (on) win.querySelector("#mn-calc-lbl").focus();
      });

      const exprInp = win.querySelector("#mn-calc-expr");
      exprInp.addEventListener("input", updateCalcPreview);
      exprInp.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); commitCalcModal(); }
      });
      win.querySelector("#mn-calc-lbl").addEventListener("input", updateCalcPreview);
      win.querySelector("#mn-calc-lbl").addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); commitCalcModal(); }
      });

      // Keypad buttons (keep input focus intact!)
      win.querySelector("#mn-calc-pad").addEventListener("mousedown", e => {
        if (e.target.closest("button")) e.preventDefault();
      });
      win.querySelector("#mn-calc-pad").addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.id === "mn-calc-bs") {
          backspaceCalcExpr();
          return;
        }
        const op = btn.getAttribute("data-op");
        if (op) {
          insertCalcToken(op, { isOp: true });
          return;
        }
        const k = btn.getAttribute("data-k");
        if (k) insertCalcToken(k, { isRawKey: true });
      });

      // Right-column GSP pop-up menus & Clear
      win.querySelector("#mn-calc-menu-values").addEventListener("click", e => openCalcMenu("values", e.currentTarget));
      win.querySelector("#mn-calc-menu-funcs").addEventListener("click", e => openCalcMenu("funcs", e.currentTarget));
      win.querySelector("#mn-calc-menu-units").addEventListener("click", e => openCalcMenu("units", e.currentTarget));
      win.querySelector("#mn-calc-clear").addEventListener("click", () => {
        exprInp.value = "";
        STATE.calcRefs = {};
        STATE.calcPendingPt = null;
        syncPickToggleUI();
        updateCalcPreview();
        exprInp.focus();
      });
    }
    return win;
  }

  function backspaceCalcExpr() {
    const inp = document.getElementById("mn-calc-expr");
    if (!inp) return;
    const val = inp.value;
    const s = inp.selectionStart ?? val.length;
    const e = inp.selectionEnd ?? val.length;
    if (s !== e) {
      inp.value = val.slice(0, s) + val.slice(e);
      inp.focus();
      inp.setSelectionRange(s, s);
      updateCalcPreview();
      return;
    }
    if (s <= 0) return;
    const before = val.slice(0, s);
    // Smart delete multi-char tokens (functions, spaced ops, or variable names)
    const m = /(?:[a-z]+\($|\s[+\-*/]\s$|[A-Za-zÀ-ỹα-ωΑ-Ω_][A-Za-z0-9À-ỹα-ωΑ-Ω_]*$|\s+$)/i.exec(before);
    const cut = m ? m[0].length : 1;
    inp.value = val.slice(0, s - cut) + val.slice(e);
    inp.focus();
    inp.setSelectionRange(s - cut, s - cut);
    updateCalcPreview();
  }

  function insertCalcToken(tok, opts = {}) {
    const inp = document.getElementById("mn-calc-expr");
    if (!inp) return;
    if (opts && opts.ref) {
      STATE.calcRefs[tok] = opts.ref;
    }
    if (opts && opts.flashEl) {
      opts.flashEl.classList.remove("calc-picked-flash");
      void opts.flashEl.offsetWidth;
      opts.flashEl.classList.add("calc-picked-flash");
      setTimeout(() => opts.flashEl && opts.flashEl.classList.remove("calc-picked-flash"), 520);
    }

    const val = inp.value;
    const s = inp.selectionStart ?? val.length;
    const e = inp.selectionEnd ?? val.length;
    const before = val.slice(0, s);
    let insertStr = String(tok);

    if (opts.isOp) {
      if (tok === "^" || tok === "^2" || tok === "^3") {
        insertStr = tok;
      } else if (tok === "-" && (!before.trim() || /[+\-*/^(,]\s*$/.test(before))) {
        insertStr = "-";
      } else {
        const spL = before.length && !/\s$/.test(before) ? " " : "";
        insertStr = `${spL}${tok} `;
      }
    } else if (!opts.isRawKey) {
      // Variable, measurement, segment, parameter, or function:
      // Insert implicit multiplication " * " if immediately after a value or ")"
      const trimmedBefore = before.trimEnd();
      if (trimmedBefore && /[0-9A-Za-zÀ-ỹα-ωΑ-Ω_π)]$/.test(trimmedBefore)) {
        const spL = before.length && !/\s$/.test(before) ? " " : "";
        insertStr = `${spL}* ${tok}`;
      }
    }

    inp.value = before + insertStr + val.slice(e);
    inp.focus();
    const pos = s + insertStr.length;
    inp.setSelectionRange(pos, pos);
    updateCalcPreview();
  }

  function updateCalcPreview() {
    const pg = getPage(STATE.editingPageIdx);
    const K = getKernel();
    const resEl = document.getElementById("mn-calc-res");
    const katexEl = document.getElementById("mn-calc-katex");
    const okBtn = document.getElementById("mn-calc-ok");
    if (!pg || !pg.geo || !K || !resEl) return;

    const coords = K.Tt(pg.geo);
    const { env } = evaluateAllMeasurements(pg.geo, coords);
    const expr = (document.getElementById("mn-calc-expr").value || "").trim();
    const lbl = (document.getElementById("mn-calc-lbl").value || "").trim();
    const m = STATE.editingMeasId && (pg.geo.measurements || []).find(x => x.id === STATE.editingMeasId);

    if (m && m.kind !== "calc") {
      const r = evalMeasurement(pg.geo, coords, { ...m, label: lbl }, env);
      resEl.textContent = r.plain;
      resEl.classList.remove("invalid");
      if (katexEl) renderTexInto(katexEl, r.tex, r.plain);
      if (okBtn) okBtn.disabled = false;
      return;
    }

    const evalEnv = { ...env };
    for (const [tok, ref] of Object.entries(STATE.calcRefs || {})) {
      const rv = evalRefSpec(pg.geo, coords, ref);
      if (Number.isFinite(rv)) evalEnv[tok] = rv;
    }

    const v = expr && typeof K._mnEvalExpr === "function" ? K._mnEvalExpr(expr, evalEnv) : NaN;
    const valid = Number.isFinite(v);
    const dec = STATE.calcUnit === "deg" ? 1 : 3;
    const resText = valid ? `${fmt(v, dec)}${unitPlain(STATE.calcUnit)}` : (expr ? "Chưa hợp lệ" : "—");
    if (resEl.textContent !== resText) resEl.textContent = resText;
    resEl.classList.toggle("invalid", !!expr && !valid);
    if (okBtn && okBtn.disabled !== !valid) okBtn.disabled = !valid;

    if (katexEl) {
      if (!expr) {
        if (katexEl.dataset.tex !== "__empty__") {
          katexEl.dataset.tex = "__empty__";
          katexEl.innerHTML = `<span class="mn-calc-placeholder">Nhập công thức hoặc bấm chọn đối tượng trên bảng…</span>`;
        }
      } else {
        const texLhs = lbl ? `${lbl} = ` : "";
        const texBody = exprToTex(expr);
        renderTexInto(katexEl, `${texLhs}${texBody}`, expr);
      }
    }
  }

  function openCalcModal(pIdx, measId) {
    const win = ensureCalcModal();
    STATE.editingPageIdx = pIdx;
    STATE.editingMeasId = measId || null;
    STATE.calcOpen = true;
    STATE.calcPickMode = true;
    STATE.calcPendingPt = null;

    const pg = getPage(pIdx);
    const geo = pg && pg.geo ? pg.geo : { measurements: [], params: [] };
    const existing = measId ? (geo.measurements || []).find(x => x.id === measId) : null;
    const isCalc = !existing || existing.kind === "calc";

    STATE.calcUnit = existing && existing.unit ? existing.unit : "";
    STATE.calcRefs = existing && existing.refs ? { ...existing.refs } : {};

    win.querySelector("#mn-calc-title").textContent = existing ? `Sửa phép đo ${existing.varName}` : "Máy tính biểu thức động";
    win.querySelector("#mn-calc-lbl").value = existing ? (existing.label || "") : "";
    win.querySelector("#mn-calc-expr").value = existing && existing.expr ? existing.expr : "";
    win.querySelector("#mn-calc-expr-wrap").style.display = isCalc ? "" : "none";
    win.querySelector("#mn-calc-deck").style.display = isCalc ? "" : "none";
    win.querySelector("#mn-calc-pick-toggle").style.display = isCalc ? "" : "none";
    win.querySelector("#mn-calc-pick-hint").style.display = isCalc ? "" : "none";
    win.querySelector("#mn-calc-ok").textContent = existing ? "Lưu thay đổi" : "Ghim lên bảng";

    const lblWrap = win.querySelector("#mn-calc-lbl-wrap");
    const showLbl = !isCalc || !!(existing && existing.label);
    lblWrap.classList.toggle("show", showLbl);
    win.querySelector("#mn-calc-lbl-tog").classList.toggle("on", showLbl);

    syncUnitBtn();
    win.classList.add("open");

    // Position smartly on right side (or restore last dragged position) so sketch stays fully visible!
    const w = win.offsetWidth || 344;
    const h = win.offsetHeight || 360;
    if (!STATE.calcPos) {
      const defX = Math.max(12, window.innerWidth - w - 22);
      const defY = Math.max(64, Math.min(window.innerHeight - h - 76, 92));
      STATE.calcPos = { x: Math.round(defX), y: Math.round(defY) };
    } else {
      STATE.calcPos.x = Math.max(8, Math.min(window.innerWidth - w - 8, STATE.calcPos.x));
      STATE.calcPos.y = Math.max(8, Math.min(window.innerHeight - 44, STATE.calcPos.y));
    }
    win.style.left = `${STATE.calcPos.x}px`;
    win.style.top = `${STATE.calcPos.y}px`;

    syncPickToggleUI();
    renderMeasurements(true);
    if (window.MinNoteGeoParams && typeof window.MinNoteGeoParams.renderCanvasChips === "function") {
      window.MinNoteGeoParams.renderCanvasChips(true);
    }
    updateCalcPreview();
    setTimeout(() => (isCalc ? win.querySelector("#mn-calc-expr") : win.querySelector("#mn-calc-lbl")).focus(), 30);
  }

  function closeCalcModal() {
    STATE.calcOpen = false;
    STATE.editingMeasId = null;
    STATE.calcPendingPt = null;
    closeCalcMenu();
    clearCalcHover();
    document.body.classList.remove("mn-calc-picking");
    const win = document.getElementById("mn-calc-window");
    if (win) win.classList.remove("open");
    renderMeasurements(true);
    if (window.MinNoteGeoParams && typeof window.MinNoteGeoParams.renderCanvasChips === "function") {
      window.MinNoteGeoParams.renderCanvasChips(true);
    }
  }

  function commitCalcModal() {
    const pIdx = STATE.editingPageIdx;
    const lbl = document.getElementById("mn-calc-lbl").value.trim();
    const expr = document.getElementById("mn-calc-expr").value.trim();
    const refsCopy = Object.keys(STATE.calcRefs || {}).length ? { ...STATE.calcRefs } : undefined;
    const unit = STATE.calcUnit || "";
    if (STATE.editingMeasId) {
      const id = STATE.editingMeasId;
      mutateGeo(pIdx, g => ({
        ...g,
        measurements: (g.measurements || []).map(m => m.id === id
          ? { ...m, label: lbl, ...(m.kind === "calc" ? { expr: expr || m.expr, unit, ...(refsCopy ? { refs: refsCopy } : {}) } : {}) }
          : m)
      }));
    } else {
      if (!expr) return toast("Hãy nhập biểu thức hoặc bấm chọn đối tượng trên bảng.");
      addMeasurement(pIdx, { kind: "calc", expr, label: lbl, unit, ...(refsCopy ? { refs: refsCopy } : {}) });
    }
    closeCalcModal();
  }

  function isCanvasPickTarget(el) {
    if (!el || !el.closest) return false;
    if (el.closest("#mn-calc-window, #mn-calc-menu-pop, #mn-gsp-pop, .mn-meas-card, .mn-katex-param, .dialog, .dropdown-menu, .selection-bar, header.toolbar, aside.tools-bar, .class-panel, #mn-param-panel, #mn-param-modal-backdrop")) {
      return false;
    }
    return true;
  }

  function handleCanvasPickDown(e) {
    if (!STATE.calcOpen || !STATE.calcPickMode || e.button !== 0) return;
    if (!isCanvasPickTarget(e.target)) return;
    const ed = getEditor();
    if (!ed || !ed.scroller) return;
    const sr = ed.scroller.getBoundingClientRect();
    if (e.clientX < sr.left || e.clientX > sr.right || e.clientY < sr.top || e.clientY > sr.bottom) return;

    closeCalcMenu();
    const hit = hitTestGeometry(STATE.editingPageIdx, e.clientX, e.clientY);
    if (!hit) {
      if (STATE.calcPendingPt) {
        STATE.calcPendingPt = null;
        syncPickToggleUI();
        clearCalcHover();
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (hit.kind === "point") {
      if (!STATE.calcPendingPt) {
        STATE.calcPendingPt = { id: hit.id, label: hit.label };
        syncPickToggleUI();
        renderCalcHover(STATE.editingPageIdx, hit, false);
        return;
      }
      if (STATE.calcPendingPt.id === hit.id) {
        STATE.calcPendingPt = null;
        syncPickToggleUI();
        clearCalcHover();
        return;
      }
      const p1 = STATE.calcPendingPt;
      const tok = `${p1.label.replace(/\s+/g, "")}${hit.label.replace(/\s+/g, "")}`;
      insertCalcToken(tok, { ref: { kind: "dist", pts: [p1.id, hit.id] } });
      renderCalcHover(STATE.editingPageIdx, hit, true);
      STATE.calcPendingPt = null;
      syncPickToggleUI();
      setTimeout(() => { if (STATE.calcOpen) clearCalcHover(); }, 340);
      return;
    }

    STATE.calcPendingPt = null;
    syncPickToggleUI();
    insertCalcToken(hit.tok, { ref: hit.ref });
    renderCalcHover(STATE.editingPageIdx, hit, true);
    setTimeout(() => { if (STATE.calcOpen && STATE.calcHover === hit) renderCalcHover(STATE.editingPageIdx, hit, false); }, 340);
  }

  function handleCanvasPickMove(e) {
    if (!STATE.calcOpen || !STATE.calcPickMode) return;
    if (!isCanvasPickTarget(e.target)) {
      if (!STATE.calcPendingPt) clearCalcHover();
      return;
    }
    const ed = getEditor();
    if (!ed || !ed.scroller) return;
    const sr = ed.scroller.getBoundingClientRect();
    if (e.clientX < sr.left || e.clientX > sr.right || e.clientY < sr.top || e.clientY > sr.bottom) {
      if (!STATE.calcPendingPt) clearCalcHover();
      return;
    }
    const hit = hitTestGeometry(STATE.editingPageIdx, e.clientX, e.clientY);
    STATE.calcHover = hit;
    renderCalcHover(STATE.editingPageIdx, hit, false);
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
    window.addEventListener("pointerdown", handleCanvasPickDown, true);
    window.addEventListener("pointermove", handleCanvasPickMove, { passive: true });
    window.addEventListener("pointerdown", e => {
      if (STATE.calcActiveMenu && !e.target.closest("#mn-calc-menu-pop") && !e.target.closest(".mn-calc-mbtn")) {
        closeCalcMenu();
      }
    });
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
        if (STATE.calcActiveMenu) { closeCalcMenu(); return; }
        if (STATE.calcPendingPt) { STATE.calcPendingPt = null; syncPickToggleUI(); clearCalcHover(); return; }
        if (STATE.popOpen) closePop();
        if (STATE.calcOpen) closeCalcModal();
      }
    });

    // Lightweight 60fps sync ONLY when measurements exist or floating calculator is live
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
        if (STATE.calcOpen) updateCalcPreview();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.MinNoteGeoTools = {
    canShowInSelBar,
    togglePopover,
    openCalcModal,
    closeCalcModal,
    isCalcOpen: () => STATE.calcOpen,
    insertToken: insertCalcToken,
    addMeasurement,
    selectParents,
    selectChildren,
    splitSelectedPoint,
    mergePointToPath,
    mergeTwoPoints,
    eraseTracesNow,
    renderMeasurements,
    pageToScreen,
    screenToPage
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
