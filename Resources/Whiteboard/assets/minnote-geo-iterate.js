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
/**
 * MinNote 2-Stage Scoped Parametric Iteration + Live KaTeX Parameter Cards
 * ------------------------------------------------------------------------
 * Stage 1: Select exact target shapes (click shapes or marquee-box select) — prevents
 *          unwanted spillover ("nhảy hết") into adjacent parts of a complex figure (e.g., hexagon).
 * Stage 2: Choose iteration method & parameters in a live KaTeX configuration dialog:
 *          - map       : Point-to-point mapping (GSP5 Backward-Pruned Subgraph + similarity fallback)
 *          - rotate    : Rotary iteration Q_(O, m*alpha)
 *          - dilate    : Spiral / Homothety iteration S_(O, k^m, m*alpha)
 *          - translate : Vector array iteration T_(m*k*AB)
 * Output : Commits tagged parametric shapes/points (_iterId) + stores live recipe in
 *          page.geo.iterations + renders draggable live KaTeX badges (e.g. t_1 = [ 5 ])
 *          right on the canvas that dynamically rebuild the iterated shapes whenever edited!
 */
(function (root) {
  'use strict';
  if (root.MinNoteGeoIterate) return;

  const getBoard = () =>
    root.__minnoteBoard ||
    root.__noteRendererEditor ||
    (root.__meaBoardRef && root.__meaBoardRef.current) ||
    null;

  const getKernel = () => root.__mnGeoKernel || null;

  const STATE = {
    active: false,        // true while tool is geo/iterate OR dialog is open
    stage: 1,             // 1 = pick scope shapes, 2 = pick method & mapping/center/vector
    pageIdx: 0,
    editingIterId: null,  // non-null when editing an existing live iteration badge
    dialogOpen: false,
    highlightedIterId: null,
    marquee: null,        // { page, x0, y0, x1, y1 } during Stage-1 box drag
    cfg: {
      method: 'map',      // 'map' | 'rotate' | 'dilate' | 'translate'
      depth: 5,
      angle: 60,
      ratio: 0.5,
      scopeShapeIds: [],  // empty = auto scope
      pairs: [],          // [[srcId, dstId], ...]
      pendingSrc: null,   // half-picked pair in 'map' mode
      centerId: null,     // for 'rotate' | 'dilate'
      vecA: null,         // for 'translate'
      vecB: null,         // for 'translate'
      hideIterDots: true,
      showBadge: true,
      varName: '',
      theme: 'pink',      // 'pink' | 'blue' | 'violet' | 'emerald'
      depthParamId: '',   // '' = auto-create in geo.params, or existing paramId
      angleParamId: '',   // '' = manual, or existing paramId in geo.params
      ratioParamId: ''    // '' = manual, or existing paramId in geo.params
    }
  };

  let scrollerBound = null;
  let dialogPos = null;
  let syncScheduled = false;

  /* ========================== Formatting & KaTeX Helpers ========================== */

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtViNum(v, decimals) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    if (decimals === 0) return String(Math.round(n));
    const p = Math.pow(10, decimals);
    const r = Math.round(n * p) / p;
    return String(r).replace('.', ',');
  }

  function parseViNum(str, fallback) {
    const n = Number(String(str ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  }

  function renderKatex(el, tex, fallbackText) {
    if (!el) return;
    if (el.dataset.tex === tex && el.dataset.kd === '1') return;
    el.dataset.tex = tex;
    const k = root.katex;
    if (k && typeof k.render === 'function') {
      try {
        k.render(tex, el, { throwOnError: false, displayMode: false });
        el.dataset.kd = '1';
        return;
      } catch (_) {}
    }
    el.textContent = fallbackText || tex;
    el.dataset.kd = '0';
  }

  function ptLabel(geo, pid) {
    const p = geo && geo.points && geo.points[pid];
    return (p && p.label) ? p.label : (pid ? pid.slice(0, 4) : '?');
  }

  function nextVarName(geo, method) {
    const list = (geo && Array.isArray(geo.iterations)) ? geo.iterations : [];
    const used = new Set(list.map(x => String(x && x.varName || '').trim()));
    const base = method === 'rotate' ? 't' : 'n';
    for (let i = 1; i < 99; i++) {
      const cand = `${base}_${i}`;
      if (!used.has(cand)) return cand;
    }
    return `t_${list.length + 1}`;
  }

  function texForVar(varName) {
    const clean = String(varName || 'n_1').trim();
    if (!clean) return 'n_1';
    if (/^[a-zA-Z\\]+(_\{?[0-9a-zA-Z]+\}?)?$/.test(clean)) return clean;
    return `\\text{${clean.replace(/[{}\\]/g, '')}}`;
  }

  function formulaLatexForCfg(geo, cfg) {
    const v = texForVar(cfg.varName || 'n_1');
    const n = Math.max(0, Math.min(20, Math.round(Number(cfg.depth) || 0)));
    if (cfg.method === 'rotate') {
      const cLbl = cfg.centerId ? ptLabel(geo, cfg.centerId) : 'O';
      const ang = fmtViNum(cfg.angle ?? 60, 2);
      return `\\mathcal{Q}_{(${cLbl},\\; m\\cdot ${ang}^\\circ)},\\quad m=1\\ldots ${v}\\;(${v}=${n})`;
    }
    if (cfg.method === 'dilate') {
      const cLbl = cfg.centerId ? ptLabel(geo, cfg.centerId) : 'O';
      const kStr = fmtViNum(cfg.ratio ?? 0.5, 3);
      const aNum = Number(cfg.angle) || 0;
      if (Math.abs(aNum) > 1e-4) {
        const ang = fmtViNum(aNum, 2);
        return `\\mathcal{S}_{(${cLbl},\\; (${kStr})^m,\\; m\\cdot ${ang}^\\circ)},\\quad ${v}=${n}`;
      }
      return `\\mathcal{V}_{(${cLbl},\\; (${kStr})^m)},\\quad m=1\\ldots ${v}\\;(${v}=${n})`;
    }
    if (cfg.method === 'translate') {
      const aLbl = cfg.vecA ? ptLabel(geo, cfg.vecA) : 'A';
      const bLbl = cfg.vecB ? ptLabel(geo, cfg.vecB) : 'B';
      const kNum = Number(cfg.ratio ?? 1);
      const kPre = Math.abs(kNum - 1) < 1e-4 ? '' : `${fmtViNum(kNum, 2)}\\cdot `;
      return `\\mathcal{T}_{m\\cdot ${kPre}\\overrightarrow{${aLbl}${bLbl}}},\\quad ${v}=${n}`;
    }
    // method === 'map'
    const pairs = Array.isArray(cfg.pairs) ? cfg.pairs : [];
    if (!pairs.length) return `P_i \\mapsto P'_i,\\quad ${v} = ${n}`;
    const maps = pairs.slice(0, 4).map(([s, d]) => `${ptLabel(geo, s)}\\mapsto ${ptLabel(geo, d)}`).join(',\\; ');
    const more = pairs.length > 4 ? ',\\; \\ldots' : '';
    return `${maps}${more}\\quad (${v}=${n})`;
  }

  /* ========================== Core Scoped Iteration Engine ========================== */

  function remapShape(K, sh, mapFn, newId, flipOrient) {
    if (K && typeof K._mnRemapShape === 'function') {
      return K._mnRemapShape(sh, mapFn, newId, undefined, !!flipOrient);
    }
    return { ...sh, id: newId, pts: (sh.pts || []).map(mapFn), group: undefined };
  }

  function isFillOnly(K, sh) {
    if (K && typeof K._mnIsFillOnlyPoly === 'function') return K._mnIsFillOnlyPoly(sh);
    return !!(sh && (sh.kind === 'region' || (sh.kind === 'polygon' && sh.fill && (sh.width === 0 || (sh.gaps && sh.gaps.length >= sh.pts.length)))));
  }

  function collectShapePointIds(sh) {
    const out = new Set();
    if (!sh) return out;
    if (Array.isArray(sh.pts)) sh.pts.forEach(id => id && out.add(id));
    if (sh.kind === 'region') {
      const addLp = lp => {
        if (!lp) return;
        if (lp.t === 'circle') { if (lp.c) out.add(lp.c); if (lp.r) out.add(lp.r); }
        else if (Array.isArray(lp.pts)) lp.pts.forEach(id => id && out.add(id));
      };
      if (sh.mode === 'diff') {
        addLp(sh.outer);
        (sh.holes || []).forEach(addLp);
      } else if (Array.isArray(sh.edges)) {
        sh.edges.forEach(ed => {
          if (ed.a) out.add(ed.a);
          if (ed.b) out.add(ed.b);
          if (ed.c) out.add(ed.c);
          if (ed.r) out.add(ed.r);
        });
      }
    }
    return out;
  }

  /**
   * Build parametric iterated points & shapes strictly scoped to cfg.scopeShapeIds
   * (zero unwanted spillover into unrelated parts of the figure!).
   */
  function buildScopedIteration(geo, cfg, idGen) {
    const K = getKernel();
    if (!geo || !cfg || !K) return { points: [], shapes: [] };
    const depth = Math.max(0, Math.min(20, Math.round(Number(cfg.depth) || 0)));
    if (depth <= 0) return { points: [], shapes: [] };

    const iterId = cfg.id || ('iter_' + idGen());
    const hideDots = cfg.hideIterDots !== false;
    const allShapes = (geo.shapes || []).filter(sh =>
      sh && !sh.hidden && sh.kind !== 'solid' && sh.kind !== 'flatLink' && sh._iterId !== iterId
    );
    const scopeIds = Array.isArray(cfg.scopeShapeIds) ? cfg.scopeShapeIds.filter(Boolean) : [];
    const scopeSet = new Set(scopeIds);
    const scopedShapes = scopeSet.size ? allShapes.filter(sh => scopeSet.has(sh.id)) : [];

    const tagPt = (pt) => ({
      ...pt,
      _iterId: iterId,
      show: hideDots ? false : !!pt.show,
      label: '',
      noName: true,
      group: undefined,
      named: undefined
    });
    const tagSh = (sh) => ({ ...sh, _iterId: iterId, group: undefined });

    const outPts = [];
    const outShs = [];

    // ------------------------------------------------------------------
    // METHOD 2: ROTATE — Q_(O, m * alpha)
    // METHOD 3: DILATE / SPIRAL — S_(O, k^m, m * alpha)
    // ------------------------------------------------------------------
    if (cfg.method === 'rotate' || cfg.method === 'dilate') {
      const cId = cfg.centerId;
      if (!cId || !geo.points[cId]) return { points: [], shapes: [] };
      const targetShapes = scopedShapes.length ? scopedShapes : allShapes;
      if (!targetShapes.length) return { points: [], shapes: [] };

      const basePtSet = new Set();
      for (const sh of targetShapes) {
        for (const pid of collectShapePointIds(sh)) {
          if (pid !== cId && geo.points[pid]) basePtSet.add(pid);
        }
      }
      const basePts = [...basePtSet];
      const alphaDeg = Number(cfg.angle) || 0;
      const kBase = cfg.method === 'dilate' ? (Number(cfg.ratio) || 0.5) : 1;

      for (let step = 1; step <= depth; step++) {
        const mp = new Map();
        mp.set(cId, cId);
        const stepAng = -(step * alphaDeg);
        const stepK = cfg.method === 'dilate' ? Math.pow(kBase, step) : 1;
        for (const pid of basePts) {
          const orig = geo.points[pid];
          const nid = idGen();
          mp.set(pid, nid);
          outPts.push(tagPt({
            ...orig,
            id: nid,
            def: { t: 'rot', c: cId, p: pid, ang: stepAng, k: stepK }
          }));
        }
        for (const sh of targetShapes) {
          outShs.push(tagSh(remapShape(K, sh, pid => mp.has(pid) ? mp.get(pid) : pid, idGen(), false)));
        }
      }
      return { points: outPts, shapes: outShs };
    }

    // ------------------------------------------------------------------
    // METHOD 4: TRANSLATE — T_(m * k * vec(AB))
    // ------------------------------------------------------------------
    if (cfg.method === 'translate') {
      const aId = cfg.vecA, bId = cfg.vecB;
      if (!aId || !bId || aId === bId || !geo.points[aId] || !geo.points[bId]) return { points: [], shapes: [] };
      const targetShapes = scopedShapes.length ? scopedShapes : allShapes;
      if (!targetShapes.length) return { points: [], shapes: [] };

      const basePtSet = new Set();
      for (const sh of targetShapes) {
        for (const pid of collectShapePointIds(sh)) {
          if (geo.points[pid]) basePtSet.add(pid);
        }
      }
      const basePts = [...basePtSet];
      const kBase = Number.isFinite(Number(cfg.ratio)) ? Number(cfg.ratio) : 1;

      for (let step = 1; step <= depth; step++) {
        const mp = new Map();
        const kStep = step * kBase;
        for (const pid of basePts) {
          const orig = geo.points[pid];
          const nid = idGen();
          mp.set(pid, nid);
          outPts.push(tagPt({
            ...orig,
            id: nid,
            def: { t: 'vec', o: pid, a: aId, b: bId, k: kStep, perp: false }
          }));
        }
        for (const sh of targetShapes) {
          outShs.push(tagSh(remapShape(K, sh, pid => mp.has(pid) ? mp.get(pid) : pid, idGen(), false)));
        }
      }
      return { points: outPts, shapes: outShs };
    }

    // ------------------------------------------------------------------
    // METHOD 1: MAP — Backward-Pruned Scoped Parametric Mapping (GSP5)
    // ------------------------------------------------------------------
    const rawPairs = Array.isArray(cfg.pairs) ? cfg.pairs : [];
    const seenSrc = new Set();
    const pairs = [];
    for (const pr of rawPairs) {
      if (!Array.isArray(pr) || pr.length < 2) continue;
      const [s, t] = pr;
      if (!s || !t || s === t || seenSrc.has(s) || !geo.points[s] || !geo.points[t]) continue;
      seenSrc.add(s);
      pairs.push([s, t]);
    }
    if (!pairs.length) return { points: [], shapes: [] };

    const srcIds = pairs.map(p => p[0]);
    const dstIds = pairs.map(p => p[1]);
    const srcSet = new Set(srcIds);

    // 1. Forward reach from srcSet (excluding previously generated points of this iterId)
    const fwd = new Set(srcSet);
    for (let changed = true; changed;) {
      changed = false;
      for (const pt of Object.values(geo.points)) {
        if (!pt || pt._iterId === iterId || fwd.has(pt.id) || !pt.def) continue;
        const deps = K.Om(pt.def);
        if (deps.length && deps.some(d => fwd.has(d))) {
          fwd.add(pt.id);
          changed = true;
        }
      }
    }

    const hasDepTarget = dstIds.some(t => fwd.has(t));

    if (hasDepTarget) {
      // Determine shapes to clone
      let targetShapes;
      if (scopedShapes.length) {
        targetShapes = scopedShapes;
      } else {
        const subAll = new Set([...fwd].filter(id => !srcSet.has(id)));
        targetShapes = allShapes.filter(sh => {
          const sPts = [...collectShapePointIds(sh)];
          return sPts.length && (
            sPts.some(pid => subAll.has(pid)) ||
            (isFillOnly(K, sh) && sPts.every(pid => srcSet.has(pid)))
          );
        });
        if (!targetShapes.length) {
          targetShapes = allShapes.filter(sh => {
            const sPts = [...collectShapePointIds(sh)];
            return sPts.length && sPts.every(pid => srcSet.has(pid));
          });
        }
      }

      // KEY FIX FOR HEXAGON SPILLOVER:
      // Backward-prune from (targetShapes ∪ dstIds) inside fwd!
      // Only points actually needed to compute targetShapes or next dstIds are cloned!
      const needed = new Set();
      const stack = [...dstIds];
      for (const sh of targetShapes) {
        for (const pid of collectShapePointIds(sh)) stack.push(pid);
      }
      while (stack.length) {
        const pid = stack.pop();
        if (!pid || needed.has(pid) || srcSet.has(pid) || !fwd.has(pid)) continue;
        needed.add(pid);
        const pt = geo.points[pid];
        if (pt && pt.def) {
          for (const d of K.Om(pt.def)) {
            if (fwd.has(d) && !srcSet.has(d) && !needed.has(d)) stack.push(d);
          }
        }
      }

      // Topological sort of needed points
      const subPtsOrdered = [];
      const vis = new Set();
      const visit = (id) => {
        if (vis.has(id) || !needed.has(id)) return;
        vis.add(id);
        const pt = geo.points[id];
        if (pt && pt.def) {
          for (const d of K.Om(pt.def)) if (needed.has(d)) visit(d);
        }
        subPtsOrdered.push(id);
      };
      for (const id of needed) visit(id);

      let curImg = dstIds.slice();
      for (let step = 1; step <= depth; step++) {
        const mp = new Map();
        const ms = new Map();
        srcIds.forEach((sid, k) => mp.set(sid, curImg[k]));
        for (const pid of subPtsOrdered) mp.set(pid, idGen());
        for (const sh of targetShapes) ms.set(sh.id, idGen());

        for (const pid of subPtsOrdered) {
          const orig = geo.points[pid];
          const nid = mp.get(pid);
          outPts.push(tagPt({
            ...orig,
            id: nid,
            def: K._mnRemapDef(orig.def, mp, ms)
          }));
        }

        const nextImg = curImg.slice();
        dstIds.forEach((tid, k) => {
          if (mp.has(tid)) {
            nextImg[k] = mp.get(tid);
          } else {
            const nid = idGen();
            const orig = geo.points[tid] || { show: false };
            outPts.push(tagPt({
              ...orig,
              id: nid,
              def: { t: 'sum', a: curImg[k], b: tid, c: srcIds[k] }
            }));
            mp.set(tid, nid);
            nextImg[k] = nid;
          }
        });

        for (const sh of targetShapes) {
          const nid = ms.get(sh.id) || idGen();
          outShs.push(tagSh(remapShape(K, sh, pid => mp.has(pid) ? mp.get(pid) : pid, nid, false)));
        }
        curImg = nextImg;
      }
      return { points: outPts, shapes: outShs };
    }

    // Independent fallback (e.g., free points A -> B, or 2-pair direct similarity A1->B1, A2->B2!)
    const targetShapes = scopedShapes.length
      ? scopedShapes
      : allShapes.filter(sh => [...collectShapePointIds(sh)].some(pid => srcSet.has(pid)));
    if (!targetShapes.length) return { points: [], shapes: [] };

    const basePtSet = new Set();
    for (const sh of targetShapes) {
      for (const pid of collectShapePointIds(sh)) {
        if (geo.points[pid]) basePtSet.add(pid);
      }
    }
    const basePts = [...basePtSet];
    const [s0, t0] = pairs[0];

    if (pairs.length >= 2) {
      // Exact direct similarity determined by A1->B1 and A2->B2!
      const coords = K.Tt(geo);
      const A1 = coords.get(pairs[0][0]), B1 = coords.get(pairs[0][1]);
      const A2 = coords.get(pairs[1][0]), B2 = coords.get(pairs[1][1]);
      if (A1 && B1 && A2 && B2) {
        const dA = K.Je(A1, A2), dB = K.Je(B1, B2);
        if (dA > 1e-6 && dB > 1e-6) {
          const kSim = dB / dA;
          const angA = Math.atan2(A2.y - A1.y, A2.x - A1.x);
          const angB = Math.atan2(B2.y - B1.y, B2.x - B1.x);
          const dAngDeg = ((angB - angA) * 180) / Math.PI;
          let prevMap = new Map();
          basePts.forEach(pid => prevMap.set(pid, pid));
          let curA1 = pairs[0][0], curB1 = pairs[0][1];
          for (let step = 1; step <= depth; step++) {
            const nextMap = new Map();
            for (const pid of basePts) {
              const prevId = prevMap.get(pid);
              const rotId = idGen();
              const outId = idGen();
              outPts.push(tagPt({
                id: rotId,
                def: { t: 'rot', c: curA1, p: prevId, ang: dAngDeg, k: kSim }
              }));
              outPts.push(tagPt({
                id: outId,
                def: { t: 'sum', a: rotId, b: curB1, c: curA1 }
              }));
              nextMap.set(pid, outId);
            }
            for (const sh of targetShapes) {
              outShs.push(tagSh(remapShape(K, sh, pid => nextMap.get(pid) || pid, idGen(), false)));
            }
            // Advance anchor A1->B1 for next step
            const nextRotB = idGen(), nextB1 = idGen();
            outPts.push(tagPt({ id: nextRotB, def: { t: 'rot', c: curA1, p: curB1, ang: dAngDeg, k: kSim } }));
            outPts.push(tagPt({ id: nextB1, def: { t: 'sum', a: nextRotB, b: curB1, c: curA1 } }));
            curA1 = curB1;
            curB1 = nextB1;
            prevMap = nextMap;
          }
          return { points: outPts, shapes: outShs };
        }
      }
    }

    // Single pair A -> B translation array on targetShapes
    for (let step = 1; step <= depth; step++) {
      const mp = new Map();
      for (const pid of basePts) {
        const nid = idGen();
        mp.set(pid, nid);
        outPts.push(tagPt({
          ...(geo.points[pid] || {}),
          id: nid,
          def: { t: 'vec', o: pid, a: s0, b: t0, k: step, perp: false }
        }));
      }
      for (const sh of targetShapes) {
        outShs.push(tagSh(remapShape(K, sh, pid => mp.get(pid) || pid, idGen(), false)));
      }
    }
    return { points: outPts, shapes: outShs };
  }

  /* ========================== Persistence, 2-Way geo.params Sync & Live Rebuild ========================== */

  function stripIterFromGeo(geo, iterId) {
    if (!geo || !iterId) return geo;
    const points = {};
    for (const [k, v] of Object.entries(geo.points || {})) {
      if (v && v._iterId === iterId) continue;
      points[k] = v;
    }
    const shapes = (geo.shapes || []).filter(sh => sh && sh._iterId !== iterId);
    return { ...geo, points, shapes };
  }

  function evalLinkedParam(K, geo, paramId, fallback) {
    if (!paramId || !geo || !Array.isArray(geo.params)) return fallback;
    const p = geo.params.find(x => x && x.id === paramId);
    if (!p) return fallback;
    if (K && typeof K._mnGeoVal === 'function') {
      const v = K._mnGeoVal(geo, paramId, null, fallback);
      if (Number.isFinite(v)) return v;
    }
    const nv = Number(p.value);
    return Number.isFinite(nv) ? nv : fallback;
  }

  /**
   * Synchronize all iterations on `geo` from `geo.params` (called automatically by
   * MinNoteGeoParams.mutateGeo on slider drags, expression updates, and ▶ animations!).
   */
  function syncGeoFromParams(geo) {
    const K = getKernel();
    if (!geo || !K || !Array.isArray(geo.iterations) || !geo.iterations.length) return geo;
    const params = Array.isArray(geo.params) ? geo.params : [];
    let curGeo = geo;
    let anyRebuilt = false;
    const nextIters = [];

    for (const it of geo.iterations) {
      if (!it) continue;
      let nextIt = it;
      let needRebuild = false;

      if (it.depthParamId) {
        const dp = params.find(x => x && x.id === it.depthParamId);
        if (dp) {
          const newDepth = Math.max(0, Math.min(20, Math.round(evalLinkedParam(K, curGeo, it.depthParamId, it.depth))));
          if (newDepth !== it.depth) { nextIt = { ...nextIt, depth: newDepth }; needRebuild = true; }
          if (dp.name && dp.name !== nextIt.varName) nextIt = { ...nextIt, varName: dp.name };
        }
      }
      if (it.angleParamId) {
        const newAng = evalLinkedParam(K, curGeo, it.angleParamId, it.angle);
        if (Math.abs(newAng - (Number(nextIt.angle) || 0)) > 1e-4) {
          nextIt = { ...nextIt, angle: newAng };
          needRebuild = true;
        }
      }
      if (it.ratioParamId) {
        const newRat = evalLinkedParam(K, curGeo, it.ratioParamId, it.ratio);
        if (Math.abs(newRat) > 1e-4 && Math.abs(newRat - (Number(nextIt.ratio) || 1)) > 1e-4) {
          nextIt = { ...nextIt, ratio: newRat };
          needRebuild = true;
        }
      }

      if (needRebuild) {
        const clean = stripIterFromGeo(curGeo, nextIt.id);
        const res = buildScopedIteration(clean, nextIt, K.nt);
        const nextPoints = { ...clean.points };
        for (const pt of res.points) nextPoints[pt.id] = pt;
        curGeo = {
          ...clean,
          points: nextPoints,
          shapes: [...clean.shapes, ...res.shapes]
        };
        anyRebuilt = true;
      }
      nextIters.push(nextIt);
    }

    if (!anyRebuilt && nextIters.every((x, idx) => x === geo.iterations[idx])) return geo;
    return { ...curGeo, iterations: nextIters };
  }

  function notifyParamsStudio() {
    if (root.MinNoteGeoParams && typeof root.MinNoteGeoParams.syncUI === 'function') {
      try { root.MinNoteGeoParams.syncUI(); } catch (_) {}
    }
  }

  function applyIterationToPage(pageIdx, iterDef) {
    const board = getBoard();
    const K = getKernel();
    if (!board || !K || !board.doc || !board.doc.pages[pageIdx]) return false;

    board.commit(board.updatePage(pageIdx, pg => {
      let cleanGeo = stripIterFromGeo(pg.geo, iterDef.id);
      let params = Array.isArray(cleanGeo.params) ? cleanGeo.params.slice() : [];
      const finalDef = { ...iterDef };

      // Ensure real parameter in geo.params for depth (2-way unified!)
      if (!finalDef.depthParamId) {
        // Check if we already own a param for this iteration
        const owned = params.find(p => p && p._iterBadgeOwner === finalDef.id);
        if (owned) {
          finalDef.depthParamId = owned.id;
        } else {
          const pid = 'pm_' + K.nt();
          params.push({
            id: pid,
            name: finalDef.varName || 't_1',
            value: finalDef.depth,
            unit: 'none',
            min: 0,
            max: Math.max(10, finalDef.depth, 12),
            step: 1,
            expr: '',
            animating: false,
            animDir: 1,
            x: finalDef.x,
            y: finalDef.y,
            _iterBadgeOwner: finalDef.id
          });
          finalDef.depthParamId = pid;
        }
      }

      // Sync depth param name & value (if not formula-driven)
      params = params.map(p => {
        if (!p || p.id !== finalDef.depthParamId) return p;
        const up = { ...p };
        if (p._iterBadgeOwner === finalDef.id && finalDef.varName) up.name = finalDef.varName;
        if (!p.expr) {
          up.value = finalDef.depth;
          if (finalDef.depth > (up.max ?? 12)) up.max = Math.min(20, finalDef.depth);
        }
        return up;
      });

      // Sync angle / ratio params if explicitly bound and non-formula
      if (finalDef.angleParamId) {
        params = params.map(p => (p && p.id === finalDef.angleParamId && !p.expr ? { ...p, value: finalDef.angle } : p));
      }
      if (finalDef.ratioParamId) {
        params = params.map(p => (p && p.id === finalDef.ratioParamId && !p.expr ? { ...p, value: finalDef.ratio } : p));
      }

      cleanGeo = { ...cleanGeo, params };
      // Re-evaluate if any linked param is formula-driven (e.g. alpha = 360 / (t_1 + 1))
      if (finalDef.depthParamId) {
        const dp = params.find(p => p && p.id === finalDef.depthParamId);
        if (dp && dp.expr) finalDef.depth = Math.max(0, Math.min(20, Math.round(evalLinkedParam(K, cleanGeo, finalDef.depthParamId, finalDef.depth))));
        if (dp && dp.name) finalDef.varName = dp.name;
      }
      if (finalDef.angleParamId) {
        finalDef.angle = evalLinkedParam(K, cleanGeo, finalDef.angleParamId, finalDef.angle);
      }
      if (finalDef.ratioParamId) {
        finalDef.ratio = evalLinkedParam(K, cleanGeo, finalDef.ratioParamId, finalDef.ratio);
      }

      const res = buildScopedIteration(cleanGeo, finalDef, K.nt);
      const nextPoints = { ...cleanGeo.points };
      for (const pt of res.points) nextPoints[pt.id] = pt;
      const nextShapes = [...cleanGeo.shapes, ...res.shapes];
      const existingIters = Array.isArray(cleanGeo.iterations) ? cleanGeo.iterations : [];
      const found = existingIters.some(x => x && x.id === finalDef.id);
      const nextIters = found
        ? existingIters.map(x => (x && x.id === finalDef.id ? { ...finalDef } : x))
        : [...existingIters, { ...finalDef }];

      let nextGeo = {
        ...cleanGeo,
        points: nextPoints,
        shapes: nextShapes,
        params,
        iterations: nextIters
      };
      // Propagate to any other iterations whose formula params depend on this param!
      nextGeo = syncGeoFromParams(nextGeo);
      return { ...pg, geo: nextGeo };
    }));
    board.redraw();
    board.emit();
    notifyParamsStudio();
    scheduleSyncBadges();
    return true;
  }

  function rebuildIteration(pageIdx, iterId, patch) {
    const board = getBoard();
    if (!board || !board.doc || !board.doc.pages[pageIdx]) return false;
    const pg = board.doc.pages[pageIdx];
    const list = (pg.geo && Array.isArray(pg.geo.iterations)) ? pg.geo.iterations : [];
    const cur = list.find(x => x && x.id === iterId);
    if (!cur) return false;
    const nextDef = { ...cur, ...patch };
    nextDef.depth = Math.max(0, Math.min(20, Math.round(Number(nextDef.depth) || 0)));
    return applyIterationToPage(pageIdx, nextDef);
  }

  function deleteIteration(pageIdx, iterId) {
    const board = getBoard();
    if (!board || !board.doc || !board.doc.pages[pageIdx]) return false;
    board.commit(board.updatePage(pageIdx, pg => {
      const cleanGeo = stripIterFromGeo(pg.geo, iterId);
      const nextIters = (cleanGeo.iterations || []).filter(x => x && x.id !== iterId);
      // Remove auto-created param owned solely by this iteration; keep shared user params intact
      const nextParams = Array.isArray(cleanGeo.params)
        ? cleanGeo.params.filter(p => !(p && p._iterBadgeOwner === iterId))
        : cleanGeo.params;
      return { ...pg, geo: { ...cleanGeo, ...(nextParams ? { params: nextParams } : {}), iterations: nextIters } };
    }));
    if (STATE.editingIterId === iterId) {
      STATE.editingIterId = null;
      STATE.dialogOpen = false;
    }
    if (STATE.highlightedIterId === iterId) STATE.highlightedIterId = null;
    board.redraw();
    board.emit();
    notifyParamsStudio();
    renderDialog();
    scheduleSyncBadges();
    return true;
  }

  function updateBadgePos(pageIdx, iterId, x, y) {
    const board = getBoard();
    if (!board || !board.doc || !board.doc.pages[pageIdx]) return;
    board.commit(board.updatePage(pageIdx, pg => {
      const iters = Array.isArray(pg.geo && pg.geo.iterations) ? pg.geo.iterations : [];
      const params = Array.isArray(pg.geo && pg.geo.params)
        ? pg.geo.params.map(p => (p && p._iterBadgeOwner === iterId ? { ...p, x, y } : p))
        : (pg.geo && pg.geo.params);
      return {
        ...pg,
        geo: {
          ...pg.geo,
          ...(params ? { params } : {}),
          iterations: iters.map(it => (it && it.id === iterId ? { ...it, x, y } : it))
        }
      };
    }));
    scheduleSyncBadges();
  }

  /* ========================== Coordinate & Hit Helpers ========================== */

  function pageToScreen(pageIdx, x, y) {
    const ed = getBoard();
    if (!ed || !ed.scroller) return null;
    const sr = ed.scroller.getBoundingClientRect();
    const z = ed.zoom || 1;
    const ox = Number.isFinite(ed.offsetX) ? ed.offsetX : 0;
    const topOff = typeof ed.pageTop === 'function' ? ed.pageTop(pageIdx) : (pageIdx * 1150);
    return {
      sx: sr.left + ox + x * z - ed.scroller.scrollLeft,
      sy: sr.top + (y + topOff) * z - ed.scroller.scrollTop,
      zoom: z,
      scrollerRect: sr
    };
  }

  function defaultBadgePos(board, pageIdx, scopeShapeIds) {
    const pg = board && board.doc && board.doc.pages[pageIdx];
    const K = getKernel();
    const existing = (pg && pg.geo && Array.isArray(pg.geo.iterations)) ? pg.geo.iterations.length : 0;
    if (pg && pg.geo && K) {
      const coords = K.Tt(pg.geo);
      let minX = Infinity, minY = Infinity, maxX = -Infinity;
      const shapes = scopeShapeIds && scopeShapeIds.length
        ? pg.geo.shapes.filter(s => scopeShapeIds.includes(s.id))
        : pg.geo.shapes;
      for (const sh of shapes) {
        for (const pid of collectShapePointIds(sh)) {
          const p = coords.get(pid);
          if (p) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
          }
        }
      }
      if (Number.isFinite(minX) && Number.isFinite(minY)) {
        return { x: Math.max(24, minX), y: Math.max(48, minY - 48 - existing * 38) };
      }
    }
    return { x: 64, y: 80 + existing * 44 };
  }

  function shapesInRect(geo, coords, x0, y0, x1, y1) {
    const rx0 = Math.min(x0, x1), rx1 = Math.max(x0, x1);
    const ry0 = Math.min(y0, y1), ry1 = Math.max(y0, y1);
    const hit = [];
    for (const sh of (geo.shapes || [])) {
      if (!sh || sh.hidden || sh.kind === 'solid' || sh.kind === 'flatLink') continue;
      if (STATE.editingIterId && sh._iterId === STATE.editingIterId) continue;
      const ptIds = [...collectShapePointIds(sh)];
      const pts = ptIds.map(id => coords.get(id)).filter(Boolean);
      if (!pts.length) continue;
      // Include if ALL vertices lie inside rect OR centroid lies inside rect (for circles, check center + rim or center inside!)
      let inside = false;
      if (sh.kind === 'circle' && pts.length >= 2) {
        const c = pts[0], r = Math.hypot(pts[1].x - c.x, pts[1].y - c.y);
        inside = (c.x - r >= rx0 - 8 && c.x + r <= rx1 + 8 && c.y - r >= ry0 - 8 && c.y + r <= ry1 + 8) ||
          (c.x >= rx0 && c.x <= rx1 && c.y >= ry0 && c.y <= ry1 && r * 2 <= Math.max(rx1 - rx0, ry1 - ry0) * 1.15);
      } else {
        inside = pts.every(p => p.x >= rx0 - 4 && p.x <= rx1 + 4 && p.y >= ry0 - 4 && p.y <= ry1 + 4);
      }
      if (inside) hit.push(sh.id);
    }
    return hit;
  }

  /* ========================== Interactive Canvas Pointer Handler ========================== */

  function handlePointerDown(board, pageIdx, pt, ev) {
    const K = getKernel();
    if (!board || !K || !board.doc || !board.doc.pages[pageIdx]) return false;
    STATE.active = true;
    STATE.pageIdx = pageIdx;

    const pg = board.doc.pages[pageIdx];
    const coords = K.Tt(pg.geo);
    const tol = Math.max(10 / (board.zoom || 1), typeof board.tol === 'function' ? board.tol() : 10);

    // STAGE 1: Pick target shapes to iterate (single click toggle OR drag marquee box!)
    if (STATE.stage === 1) {
      const hitSh =
        (typeof K.$0 === 'function' ? K.$0(pg.geo.shapes.filter(s => !STATE.editingIterId || s._iterId !== STATE.editingIterId), coords, pt, tol, board.revealHidden()) : null) ||
        (typeof K._mnFilledPolyAt === 'function' ? K._mnFilledPolyAt(pg.geo.shapes.filter(s => !STATE.editingIterId || s._iterId !== STATE.editingIterId), coords, pt, board.revealHidden()) : null);

      const startClient = ev ? { x: ev.clientX, y: ev.clientY } : null;
      let dragged = false;

      if (ev && startClient) {
        const onMove = (me) => {
          const dist = Math.hypot(me.clientX - startClient.x, me.clientY - startClient.y);
          if (!dragged && dist < 6) return;
          dragged = true;
          const ep = board.eventPoint(me);
          const dp = board.toDoc(ep.sx, ep.sy);
          const pCur = board.toPage(dp, pageIdx);
          STATE.marquee = { page: pageIdx, x0: pt.x, y0: pt.y, x1: pCur.x, y1: pCur.y };
          board.redraw();
        };
        const onUp = (ue) => {
          root.removeEventListener('pointermove', onMove, true);
          root.removeEventListener('pointerup', onUp, true);
          if (dragged && STATE.marquee) {
            const mq = STATE.marquee;
            STATE.marquee = null;
            const found = shapesInRect(pg.geo, coords, mq.x0, mq.y0, mq.x1, mq.y1);
            if (found.length) {
              const keep = (ue && (ue.shiftKey || ue.ctrlKey)) ? new Set(STATE.cfg.scopeShapeIds) : new Set();
              found.forEach(id => keep.add(id));
              STATE.cfg.scopeShapeIds = [...keep];
            }
          } else if (hitSh) {
            const set = new Set(STATE.cfg.scopeShapeIds);
            if (set.has(hitSh.id)) set.delete(hitSh.id);
            else set.add(hitSh.id);
            STATE.cfg.scopeShapeIds = [...set];
          }
          board.redraw();
          renderStageBar();
          if (STATE.dialogOpen) renderDialog();
        };
        root.addEventListener('pointermove', onMove, true);
        root.addEventListener('pointerup', onUp, true);
        return true;
      }

      if (hitSh) {
        const set = new Set(STATE.cfg.scopeShapeIds);
        if (set.has(hitSh.id)) set.delete(hitSh.id);
        else set.add(hitSh.id);
        STATE.cfg.scopeShapeIds = [...set];
        board.redraw();
        renderStageBar();
        if (STATE.dialogOpen) renderDialog();
      }
      return true;
    }

    // STAGE 2: Pick points according to chosen iteration method
    const nearPt = typeof board.pointNear === 'function' ? board.pointNear(pg, coords, pt, true) : null;
    if (!nearPt) return true;

    if (STATE.cfg.method === 'rotate' || STATE.cfg.method === 'dilate') {
      STATE.cfg.centerId = nearPt;
    } else if (STATE.cfg.method === 'translate') {
      if (!STATE.cfg.vecA || (STATE.cfg.vecA && STATE.cfg.vecB)) {
        STATE.cfg.vecA = nearPt;
        STATE.cfg.vecB = null;
      } else if (nearPt !== STATE.cfg.vecA) {
        STATE.cfg.vecB = nearPt;
      }
    } else {
      // method === 'map': pairs of Source -> Image
      if (!STATE.cfg.pendingSrc) {
        STATE.cfg.pendingSrc = nearPt;
      } else if (nearPt !== STATE.cfg.pendingSrc) {
        const filtered = (STATE.cfg.pairs || []).filter(p => p[0] !== STATE.cfg.pendingSrc);
        filtered.push([STATE.cfg.pendingSrc, nearPt]);
        STATE.cfg.pairs = filtered;
        STATE.cfg.pendingSrc = null;
      } else {
        STATE.cfg.pendingSrc = null;
      }
    }

    board.redraw();
    renderStageBar();
    renderDialog();
    return true;
  }

  /* ========================== Canvas Overlay Paint ========================== */

  function paintOverlay(ctx, pageIdx, zoom, board) {
    const K = getKernel();
    if (!K || !board || !board.view || !board.view.pages[pageIdx]) return;
    const pg = board.view.pages[pageIdx];
    const coords = K.Tt(pg.geo);
    const s = zoom || 1;

    // 1. Highlight shapes of actively hovered/focused KaTeX badge
    if (STATE.highlightedIterId) {
      const it = (pg.geo.iterations || []).find(x => x && x.id === STATE.highlightedIterId);
      if (it) {
        const scopeSet = new Set(it.scopeShapeIds || []);
        const hiShapes = pg.geo.shapes.filter(sh => sh && !sh.hidden && (sh._iterId === it.id || scopeSet.has(sh.id)));
        for (const sh of hiShapes) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          const col = sh._iterId === it.id ? '#ec4899' : '#2563eb';
          const isF = isFillOnly(K, sh);
          K.gd(ctx, {
            points: pg.geo.points,
            shapes: [isF ? { ...sh, color: col, fill: col + '22', gaps: undefined, hiddenSides: undefined, width: 2.2 + 2 / s } : { ...sh, color: col, width: (sh.width || 2) + 2.6 / s }]
          }, coords, { hidePoints: true });
          ctx.restore();
        }
      }
    }

    if (!STATE.active || STATE.pageIdx !== pageIdx) return;

    // 2. Highlight Stage-1 selected scope shapes
    if (STATE.cfg.scopeShapeIds && STATE.cfg.scopeShapeIds.length) {
      const scopeSet = new Set(STATE.cfg.scopeShapeIds);
      const picked = pg.geo.shapes.filter(sh => sh && !sh.hidden && scopeSet.has(sh.id));
      for (const sh of picked) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        const col = '#7c3aed';
        const isF = isFillOnly(K, sh);
        K.gd(ctx, {
          points: pg.geo.points,
          shapes: [isF ? { ...sh, color: col, fill: col + '28', gaps: undefined, hiddenSides: undefined, width: 2.4 + 2.2 / s } : { ...sh, color: col, width: (sh.width || 2) + 3.2 / s }]
        }, coords, { hidePoints: true });
        ctx.restore();
      }
    }

    // 3. Draw Stage-1 marquee box while dragging
    if (STATE.marquee && STATE.marquee.page === pageIdx) {
      const m = STATE.marquee;
      const x = Math.min(m.x0, m.x1), y = Math.min(m.y0, m.y1);
      const w = Math.abs(m.x1 - m.x0), h = Math.abs(m.y1 - m.y0);
      ctx.save();
      ctx.fillStyle = 'rgba(124, 58, 237, 0.10)';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.6 / s;
      ctx.setLineDash([6 / s, 4 / s]);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    // 4. Draw Stage-2 mapping arrows / center ring / vector arrow
    if (STATE.stage === 2) {
      const drawDotRing = (pid, color, lbl) => {
        const p = coords.get(pid);
        if (!p) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(6 / s, (board.dotR ? board.dotR() : 4) + 3 / s), 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4 / s;
        ctx.stroke();
        if (lbl) {
          ctx.font = `700 ${11 / s}px "Segoe UI", sans-serif`;
          ctx.fillStyle = color;
          ctx.fillText(lbl, p.x + 8 / s, p.y - 8 / s);
        }
        ctx.restore();
      };
      const drawArrow = (pA, pB, color, tag) => {
        if (!pA || !pB) return;
        const dx = pB.x - pA.x, dy = pB.y - pA.y, L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L, aw = 10 / s;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.2 / s;
        ctx.setLineDash([6 / s, 4 / s]);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pB.x, pB.y);
        ctx.lineTo(pB.x - ux * aw - uy * aw * 0.48, pB.y - uy * aw + ux * aw * 0.48);
        ctx.lineTo(pB.x - ux * aw + uy * aw * 0.48, pB.y - uy * aw - ux * aw * 0.48);
        ctx.closePath();
        ctx.fill();
        if (tag) {
          ctx.font = `700 ${11 / s}px "Segoe UI", sans-serif`;
          ctx.fillText(tag, (pA.x + pB.x) / 2 + 5 / s, (pA.y + pB.y) / 2 - 5 / s);
        }
        ctx.restore();
      };

      if (STATE.cfg.method === 'map') {
        (STATE.cfg.pairs || []).forEach(([sId, dId], idx) => {
          drawDotRing(sId, '#2563eb');
          drawDotRing(dId, '#ec4899');
          drawArrow(coords.get(sId), coords.get(dId), '#2563eb', `${idx + 1}`);
        });
        if (STATE.cfg.pendingSrc) {
          drawDotRing(STATE.cfg.pendingSrc, '#f59e0b', 'Nguồn');
        }
      } else if (STATE.cfg.method === 'rotate' || STATE.cfg.method === 'dilate') {
        if (STATE.cfg.centerId) {
          drawDotRing(STATE.cfg.centerId, '#db2777', STATE.cfg.method === 'rotate' ? 'Tâm quay' : 'Tâm vị tự');
        }
      } else if (STATE.cfg.method === 'translate') {
        if (STATE.cfg.vecA) drawDotRing(STATE.cfg.vecA, '#059669', 'Đầu');
        if (STATE.cfg.vecB) {
          drawDotRing(STATE.cfg.vecB, '#059669', 'Cuối');
          drawArrow(coords.get(STATE.cfg.vecA), coords.get(STATE.cfg.vecB), '#059669', 'v');
        }
      }
    }
  }

  /* ========================== Can-Apply Readiness Check ========================== */

  function canConfirm() {
    const c = STATE.cfg;
    if (c.method === 'map') return Array.isArray(c.pairs) && c.pairs.length >= 1;
    if (c.method === 'rotate' || c.method === 'dilate') return !!c.centerId;
    if (c.method === 'translate') return !!(c.vecA && c.vecB && c.vecA !== c.vecB);
    return false;
  }

  function confirmFromDialog() {
    const board = getBoard();
    const K = getKernel();
    if (!board || !K || !canConfirm()) return false;
    const pIdx = STATE.pageIdx;
    const pg = board.doc.pages[pIdx];
    if (!pg || !pg.geo) return false;

    const existingList = Array.isArray(pg.geo.iterations) ? pg.geo.iterations : [];
    const existing = STATE.editingIterId ? existingList.find(x => x && x.id === STATE.editingIterId) : null;
    const id = existing ? existing.id : ('iter_' + K.nt());
    const pos = existing ? { x: existing.x, y: existing.y } : defaultBadgePos(board, pIdx, STATE.cfg.scopeShapeIds);
    const varName = (STATE.cfg.varName && STATE.cfg.varName.trim())
      ? STATE.cfg.varName.trim()
      : (existing ? existing.varName : nextVarName(pg.geo, STATE.cfg.method));

    const iterDef = {
      id,
      varName,
      method: STATE.cfg.method,
      depth: Math.max(0, Math.min(20, Math.round(Number(STATE.cfg.depth) || 0))),
      angle: Number(STATE.cfg.angle) || 0,
      ratio: Number.isFinite(Number(STATE.cfg.ratio)) ? Number(STATE.cfg.ratio) : (STATE.cfg.method === 'translate' ? 1 : 0.5),
      scopeShapeIds: (STATE.cfg.scopeShapeIds || []).slice(),
      pairs: (STATE.cfg.pairs || []).map(p => [p[0], p[1]]),
      centerId: STATE.cfg.centerId || null,
      vecA: STATE.cfg.vecA || null,
      vecB: STATE.cfg.vecB || null,
      hideIterDots: STATE.cfg.hideIterDots !== false,
      showBadge: STATE.cfg.showBadge !== false,
      theme: STATE.cfg.theme || 'pink',
      depthParamId: STATE.cfg.depthParamId || (existing ? (existing.depthParamId || null) : null),
      angleParamId: STATE.cfg.angleParamId || null,
      ratioParamId: STATE.cfg.ratioParamId || null,
      x: pos.x,
      y: pos.y
    };

    applyIterationToPage(pIdx, iterDef);
    STATE.editingIterId = null;
    STATE.dialogOpen = false;
    STATE.active = false;
    STATE.marquee = null;
    STATE.cfg.pendingSrc = null;
    renderStageBar();
    renderDialog();
    // Switch cleanly back to Select tool so the user can immediately drag points or tweak the live KaTeX badge!
    if (typeof board.setTool === 'function') board.setTool({ k: 'select' });
    scheduleSyncBadges();
    return true;
  }

  /* ========================== DOM: Top 2-Stage Bar ========================== */

  function ensureStageBar() {
    let el = document.getElementById('mn-iter-stage-bar');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'mn-iter-stage-bar';
    el.addEventListener('pointerdown', e => e.stopPropagation());
    document.body.appendChild(el);
    return el;
  }

  function renderStageBar() {
    const bar = ensureStageBar();
    if (!STATE.active) {
      bar.classList.remove('open');
      return;
    }
    bar.classList.add('open');
    const scCount = (STATE.cfg.scopeShapeIds || []).length;
    const isS1 = STATE.stage === 1;
    const isS2 = STATE.stage === 2;
    const ready = canConfirm();

    const scopeLabel = scCount > 0 ? `Chọn đối tượng (${scCount})` : 'Chọn đối tượng (kéo khung / bấm)';
    const methodNames = { map: 'Ánh xạ điểm', rotate: 'Lặp Quay', dilate: 'Vị tự / Xoắn ốc', translate: 'Tịnh tiến' };
    const mName = methodNames[STATE.cfg.method] || 'Phương thức';

    bar.innerHTML = `
      <button type="button" class="mn-isb-step ${isS1 ? 'active' : 'done'}" data-act="stage1">
        <span class="mn-isb-num">1</span> ${escapeHtml(scopeLabel)}
      </button>
      <span class="mn-isb-sep">→</span>
      <button type="button" class="mn-isb-step ${isS2 ? 'active' : ''}" data-act="stage2">
        <span class="mn-isb-num">2</span> ${escapeHtml(mName)}
      </button>
      ${isS1 ? `
        ${scCount > 0 ? '<button type="button" class="mn-isb-btn" data-act="clearScope">Bỏ chọn</button>' : ''}
        <button type="button" class="mn-isb-btn primary" data-act="stage2">Tiếp tục →</button>
      ` : `
        <button type="button" class="mn-isb-btn" data-act="toggleDlg">${STATE.dialogOpen ? 'Ẩn hộp thoại' : 'Hộp thoại KaTeX'}</button>
        <button type="button" class="mn-isb-btn primary" data-act="confirm" ${ready ? '' : 'disabled'}>✓ Dựng lặp (${STATE.cfg.depth})</button>
      `}
      <button type="button" class="mn-isb-btn" data-act="close" title="Đóng (Esc)">✕</button>
    `;

    bar.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        const board = getBoard();
        if (act === 'stage1') {
          STATE.stage = 1;
          STATE.dialogOpen = false;
          renderStageBar();
          renderDialog();
          board && board.redraw();
        } else if (act === 'stage2') {
          STATE.stage = 2;
          STATE.dialogOpen = true;
          renderStageBar();
          renderDialog();
          board && board.redraw();
        } else if (act === 'clearScope') {
          STATE.cfg.scopeShapeIds = [];
          renderStageBar();
          if (STATE.dialogOpen) renderDialog();
          board && board.redraw();
        } else if (act === 'toggleDlg') {
          STATE.dialogOpen = !STATE.dialogOpen;
          renderStageBar();
          renderDialog();
        } else if (act === 'confirm') {
          confirmFromDialog();
        } else if (act === 'close') {
          closeWorkflow(true);
        }
      };
    });
  }

  /* ========================== DOM: Floating KaTeX Iteration Dialog ========================== */

  function ensureDialog() {
    let el = document.getElementById('mn-iter-dialog');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'mn-iter-dialog';
    el.addEventListener('pointerdown', e => e.stopPropagation());
    document.body.appendChild(el);
    return el;
  }

  function renderDialog() {
    const dlg = ensureDialog();
    if (!STATE.active || !STATE.dialogOpen) {
      dlg.classList.remove('open');
      return;
    }
    dlg.classList.add('open');
    if (dialogPos) {
      dlg.style.left = `${dialogPos.left}px`;
      dlg.style.top = `${dialogPos.top}px`;
      dlg.style.right = 'auto';
    }

    const board = getBoard();
    const pg = board && board.doc && board.doc.pages[STATE.pageIdx];
    const geo = (pg && pg.geo) || { points: {}, shapes: [], iterations: [] };
    const c = STATE.cfg;
    const scCount = (c.scopeShapeIds || []).length;
    const ready = canConfirm();

    if (!c.varName) c.varName = nextVarName(geo, c.method);

    // Pick-status HTML per method
    let pickHtml = '';
    if (c.method === 'map') {
      const chips = (c.pairs || []).map(([s, d], idx) =>
        `<span class="mn-idlg-chip">${escapeHtml(ptLabel(geo, s))} → ${escapeHtml(ptLabel(geo, d))}<button type="button" data-rm-pair="${idx}" title="Xóa cặp">×</button></span>`
      ).join('');
      const pending = c.pendingSrc
        ? `<span class="mn-idlg-chip" style="border-color:#f59e0b;background:#fffbeb">${escapeHtml(ptLabel(geo, c.pendingSrc))} → ? (bấm điểm ảnh)</span>`
        : '';
      pickHtml = `
        <div class="mn-idlg-pick-box ${(c.pairs || []).length ? 'ready' : ''}">
          <div><strong>Chọn cặp điểm Nguồn → Ảnh ngay trên bảng vẽ:</strong></div>
          <div class="mn-idlg-chips">${chips}${pending || (!chips ? '<span style="color:#64748b">Chưa chọn cặp nào — bấm điểm Nguồn rồi bấm điểm Ảnh</span>' : '')}</div>
        </div>`;
    } else if (c.method === 'rotate' || c.method === 'dilate') {
      const label = c.method === 'rotate' ? 'tâm quay' : 'tâm vị tự';
      pickHtml = `
        <div class="mn-idlg-pick-box ${c.centerId ? 'ready' : ''}">
          <div class="mn-idlg-row">
            <span><strong>Bấm chọn ${label} trên bảng vẽ:</strong></span>
            ${c.centerId ? `<span class="mn-idlg-chip">${escapeHtml(ptLabel(geo, c.centerId))}<button type="button" data-clear-center="1">×</button></span>` : '<span style="color:#64748b">Chưa chọn</span>'}
          </div>
        </div>`;
    } else {
      pickHtml = `
        <div class="mn-idlg-pick-box ${(c.vecA && c.vecB) ? 'ready' : ''}">
          <div class="mn-idlg-row">
            <span><strong>Bấm 2 điểm vectơ tịnh tiến trên bảng:</strong></span>
            ${c.vecA ? `<span class="mn-idlg-chip">${escapeHtml(ptLabel(geo, c.vecA))} → ${c.vecB ? escapeHtml(ptLabel(geo, c.vecB)) : '?'}<button type="button" data-clear-vec="1">×</button></span>` : '<span style="color:#64748b">Chưa chọn</span>'}
          </div>
        </div>`;
    }

    // Method-specific numeric controls + optional binding to geo.params
    const allParams = Array.isArray(geo.params) ? geo.params : [];
    const paramOpts = (selectedId, defaultLbl, unitFilter) => {
      const filtered = allParams.filter(p => p && (!unitFilter || p.unit === unitFilter || p.unit === 'none'));
      return `<option value="">${escapeHtml(defaultLbl)}</option>` +
        filtered.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? 'selected' : ''}>🔗 ${escapeHtml(p.name)} = ${escapeHtml(fmtViNum(evalLinkedParam(getKernel(), geo, p.id, p.value), 2))}</option>`).join('');
    };

    let extraControls = '';
    if (c.method === 'rotate' || c.method === 'dilate') {
      extraControls += `
        <div class="mn-idlg-row">
          <label><span class="mn-idlg-katex-inline" data-tex="\\alpha"></span> Góc quay (°)</label>
          <div class="mn-idlg-num-ctrl">
            <input type="text" id="mn-iter-angle-in" value="${escapeHtml(fmtViNum(c.angle, 2))}" />
            <select class="mn-idlg-param-sel" id="mn-iter-ang-param" title="Gắn góc quay với 1 tham số trong bảng Tham số">${paramOpts(c.angleParamId, 'Nhập tay', 'angle')}</select>
          </div>
        </div>
        <div class="mn-idlg-presets">
          ${[30, 45, 60, 90, 120, 180].map(a => `<button type="button" class="mn-idlg-mini-btn" data-set-ang="${a}">${a}°</button>`).join('')}
          <button type="button" class="mn-idlg-mini-btn" data-set-ang="auto360" title="Chia đều 360° theo (n+1) phần">360°/(n+1)</button>
        </div>
      `;
    }
    if (c.method === 'dilate' || c.method === 'translate') {
      const lbl = c.method === 'dilate' ? 'Tỉ số vị tự' : 'Hệ số bước';
      const presets = c.method === 'dilate' ? [0.5, 0.618, 0.7, 0.8, 1.25] : [0.5, 1, 1.5, 2];
      extraControls += `
        <div class="mn-idlg-row">
          <label><span class="mn-idlg-katex-inline" data-tex="k"></span> ${lbl}</label>
          <div class="mn-idlg-num-ctrl">
            <input type="text" id="mn-iter-ratio-in" value="${escapeHtml(fmtViNum(c.ratio, 3))}" />
            <select class="mn-idlg-param-sel" id="mn-iter-rat-param" title="Gắn tỉ số với 1 tham số trong bảng Tham số">${paramOpts(c.ratioParamId, 'Nhập tay', 'none')}</select>
          </div>
        </div>
        <div class="mn-idlg-presets">
          ${presets.map(r => `<button type="button" class="mn-idlg-mini-btn" data-set-ratio="${r}">${fmtViNum(r, 3)}</button>`).join('')}
        </div>
      `;
    }

    const scopeNote = scCount > 0
      ? `Đang khóa phạm vi đúng <strong>${scCount} đối tượng</strong> đã chọn (không loang sang phần khác).`
      : `Chế độ <strong>Tự động</strong> theo đối tượng liên quan. Khuyên chọn ở Bước 1 để giới hạn khung hình.`;

    dlg.innerHTML = `
      <div class="mn-idlg-hdr" id="mn-idlg-drag">
        <div class="mn-idlg-title">
          <span>${STATE.editingIterId ? 'Chỉnh sửa Phép lặp (KaTeX)' : 'Phép lặp Hình học (KaTeX)'}</span>
        </div>
        <button type="button" class="mn-idlg-close" data-act="close" title="Đóng">×</button>
      </div>
      <div class="mn-idlg-body">
        <div class="mn-idlg-katex-preview">
          <div id="mn-idlg-formula"></div>
          <div class="mn-idlg-katex-sub">${scopeNote}</div>
        </div>

        <div>
          <div class="mn-idlg-sec-lbl">
            <span>Phương thức lặp</span>
            <button type="button" class="mn-idlg-mini-btn" data-act="backScope">① Sửa đối tượng (${scCount || 'Tự động'})</button>
          </div>
          <div class="mn-idlg-methods">
            <button type="button" class="mn-idlg-mbtn ${c.method === 'map' ? 'active' : ''}" data-method="map">
              <strong>Ánh xạ điểm</strong>
              <span>P → P' (lồng nhau, fractal)</span>
            </button>
            <button type="button" class="mn-idlg-mbtn ${c.method === 'rotate' ? 'active' : ''}" data-method="rotate">
              <strong>Lặp Quay quanh tâm</strong>
              <span>Quay góc α (lục giác, hoa văn)</span>
            </button>
            <button type="button" class="mn-idlg-mbtn ${c.method === 'dilate' ? 'active' : ''}" data-method="dilate">
              <strong>Vị tự / Xoắn ốc</strong>
              <span>Co giãn tỉ số k + xoay góc α</span>
            </button>
            <button type="button" class="mn-idlg-mbtn ${c.method === 'translate' ? 'active' : ''}" data-method="translate">
              <strong>Lặp Tịnh tiến</strong>
              <span>Dãy hình theo vectơ AB</span>
            </button>
          </div>
        </div>

        ${pickHtml}

        <div class="mn-idlg-row">
          <label><span class="mn-idlg-katex-inline" data-tex="${escapeHtml(texForVar(c.varName))}"></span> Số lần lặp (0–20)</label>
          <div class="mn-idlg-num-ctrl">
            <button type="button" class="mn-idlg-mini-btn" data-step-depth="-1">−</button>
            <input type="number" id="mn-iter-depth-in" min="0" max="20" step="1" value="${c.depth}" />
            <button type="button" class="mn-idlg-mini-btn" data-step-depth="1">+</button>
          </div>
        </div>
        <input type="range" class="mn-idlg-slider" id="mn-iter-depth-rng" min="0" max="20" step="1" value="${c.depth}" />
        <div class="mn-idlg-row">
          <label>Đồng bộ bảng Tham số</label>
          <select class="mn-idlg-param-sel" id="mn-iter-depth-param" style="max-width:190px" title="Gắn số lần lặp với hệ thống Tham số (để kéo trượt, biểu thức & chạy hoạt ảnh ▶)">
            ${paramOpts(c.depthParamId, '✦ Tự tạo tham số mới (' + (c.varName || 't_1') + ')', 'none')}
          </select>
        </div>

        ${extraControls}

        <div class="mn-idlg-row">
          <label>Tên biến KaTeX & Màu thẻ</label>
          <div class="mn-idlg-num-ctrl">
            <input type="text" id="mn-iter-var-in" value="${escapeHtml(c.varName)}" title="Ví dụ: t_1, n_1, k_1" style="width:68px" />
            <div class="mn-idlg-themes">
              <button type="button" class="mn-idlg-swatch ${c.theme === 'pink' ? 'on' : ''}" data-theme="pink" style="background:#f472b6" title="Hồng toán học"></button>
              <button type="button" class="mn-idlg-swatch ${c.theme === 'blue' ? 'on' : ''}" data-theme="blue" style="background:#3b82f6" title="Xanh dương"></button>
              <button type="button" class="mn-idlg-swatch ${c.theme === 'violet' ? 'on' : ''}" data-theme="violet" style="background:#8b5cf6" title="Tím"></button>
              <button type="button" class="mn-idlg-swatch ${c.theme === 'emerald' ? 'on' : ''}" data-theme="emerald" style="background:#10b981" title="Xanh ngọc"></button>
            </div>
          </div>
        </div>

        <div class="mn-idlg-checks">
          <label class="mn-idlg-check">
            <input type="checkbox" id="mn-iter-hide-dots" ${c.hideIterDots ? 'checked' : ''} />
            <span>Ẩn chấm đỏ ở các tầng lặp (giữ hình sạch, dễ tô màu)</span>
          </label>
          <label class="mn-idlg-check">
            <input type="checkbox" id="mn-iter-show-badge" ${c.showBadge ? 'checked' : ''} />
            <span>Xuất thẻ tham số KaTeX sống trên bảng vẽ để chỉnh trực tiếp</span>
          </label>
        </div>
      </div>
      <div class="mn-idlg-ftr">
        <button type="button" class="mn-isb-btn" data-act="backScope">← Bước 1</button>
        <button type="button" class="mn-isb-btn primary" data-act="confirm" ${ready ? '' : 'disabled'}>
          ${STATE.editingIterId ? '✓ Cập nhật phép lặp' : '✓ Xác nhận dựng lặp'}
        </button>
      </div>
    `;

    // Render KaTeX formulas inside dialog
    renderKatex(dlg.querySelector('#mn-idlg-formula'), formulaLatexForCfg(geo, c));
    dlg.querySelectorAll('.mn-idlg-katex-inline').forEach(sp => renderKatex(sp, sp.dataset.tex));

    // Bind drag on header
    const hdr = dlg.querySelector('#mn-idlg-drag');
    if (hdr) {
      hdr.onpointerdown = (e) => {
        if (e.target.closest('button')) return;
        const r = dlg.getBoundingClientRect();
        const ox = e.clientX - r.left, oy = e.clientY - r.top;
        const mv = (me) => {
          dialogPos = {
            left: Math.max(8, Math.min(root.innerWidth - r.width - 8, me.clientX - ox)),
            top: Math.max(8, Math.min(root.innerHeight - 60, me.clientY - oy))
          };
          dlg.style.left = `${dialogPos.left}px`;
          dlg.style.top = `${dialogPos.top}px`;
          dlg.style.right = 'auto';
        };
        const up = () => {
          root.removeEventListener('pointermove', mv, true);
          root.removeEventListener('pointerup', up, true);
        };
        root.addEventListener('pointermove', mv, true);
        root.addEventListener('pointerup', up, true);
      };
    }

    // Bind actions
    dlg.querySelectorAll('[data-method]').forEach(btn => {
      btn.onclick = () => {
        const m = btn.dataset.method;
        c.method = m;
        if (m === 'rotate' && !Number(c.angle)) c.angle = 60;
        if (m === 'dilate' && (!Number(c.ratio) || Number(c.ratio) === 1)) { c.ratio = 0.5; c.angle = 0; }
        if (m === 'translate') c.ratio = 1;
        renderStageBar();
        renderDialog();
        board && board.redraw();
      };
    });

    dlg.querySelectorAll('[data-rm-pair]').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.rmPair);
        c.pairs = (c.pairs || []).filter((_, i) => i !== idx);
        renderStageBar();
        renderDialog();
        board && board.redraw();
      };
    });

    const clrC = dlg.querySelector('[data-clear-center]');
    if (clrC) clrC.onclick = () => { c.centerId = null; renderStageBar(); renderDialog(); board && board.redraw(); };
    const clrV = dlg.querySelector('[data-clear-vec]');
    if (clrV) clrV.onclick = () => { c.vecA = null; c.vecB = null; renderStageBar(); renderDialog(); board && board.redraw(); };

    const updateDepth = (v) => {
      c.depth = Math.max(0, Math.min(20, Math.round(Number(v) || 0)));
      const numIn = dlg.querySelector('#mn-iter-depth-in');
      const rngIn = dlg.querySelector('#mn-iter-depth-rng');
      if (numIn && document.activeElement !== numIn) numIn.value = String(c.depth);
      if (rngIn) rngIn.value = String(c.depth);
      renderKatex(dlg.querySelector('#mn-idlg-formula'), formulaLatexForCfg(geo, c));
      renderStageBar();
      // If editing an existing live iteration, preview live immediately!
      if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { depth: c.depth });
    };

    const depthIn = dlg.querySelector('#mn-iter-depth-in');
    const depthRng = dlg.querySelector('#mn-iter-depth-rng');
    if (depthIn) depthIn.oninput = () => updateDepth(depthIn.value);
    if (depthRng) depthRng.oninput = () => updateDepth(depthRng.value);
    dlg.querySelectorAll('[data-step-depth]').forEach(b => {
      b.onclick = () => updateDepth(c.depth + Number(b.dataset.stepDepth));
    });

    const angIn = dlg.querySelector('#mn-iter-angle-in');
    if (angIn) {
      angIn.onchange = () => {
        c.angle = parseViNum(angIn.value, c.angle);
        renderKatex(dlg.querySelector('#mn-idlg-formula'), formulaLatexForCfg(geo, c));
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { angle: c.angle });
      };
    }
    dlg.querySelectorAll('[data-set-ang]').forEach(b => {
      b.onclick = () => {
        c.angle = b.dataset.setAng === 'auto360'
          ? Math.round((360 / Math.max(2, c.depth + 1)) * 100) / 100
          : Number(b.dataset.setAng);
        renderDialog();
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { angle: c.angle });
      };
    });

    const ratIn = dlg.querySelector('#mn-iter-ratio-in');
    if (ratIn) {
      ratIn.onchange = () => {
        c.ratio = parseViNum(ratIn.value, c.ratio);
        renderKatex(dlg.querySelector('#mn-idlg-formula'), formulaLatexForCfg(geo, c));
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { ratio: c.ratio });
      };
    }
    dlg.querySelectorAll('[data-set-ratio]').forEach(b => {
      b.onclick = () => {
        c.ratio = Number(b.dataset.setRatio);
        renderDialog();
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { ratio: c.ratio });
      };
    });

    const varIn = dlg.querySelector('#mn-iter-var-in');
    if (varIn) {
      varIn.oninput = () => {
        c.varName = varIn.value;
        renderKatex(dlg.querySelector('#mn-idlg-formula'), formulaLatexForCfg(geo, c));
      };
    }

    const bindParamSel = (id, key, onPick) => {
      const sel = dlg.querySelector(id);
      if (!sel) return;
      sel.onchange = () => {
        c[key] = sel.value || '';
        if (c[key]) {
          const p = (geo.params || []).find(x => x && x.id === c[key]);
          if (p) onPick(p);
        }
        renderDialog();
      };
    };
    bindParamSel('#mn-iter-depth-param', 'depthParamId', (p) => {
      c.depth = Math.max(0, Math.min(20, Math.round(evalLinkedParam(getKernel(), geo, p.id, p.value))));
      if (p.name) c.varName = p.name;
    });
    bindParamSel('#mn-iter-ang-param', 'angleParamId', (p) => {
      c.angle = evalLinkedParam(getKernel(), geo, p.id, p.value);
    });
    bindParamSel('#mn-iter-rat-param', 'ratioParamId', (p) => {
      c.ratio = evalLinkedParam(getKernel(), geo, p.id, p.value);
    });

    dlg.querySelectorAll('[data-theme]').forEach(b => {
      b.onclick = () => {
        c.theme = b.dataset.theme;
        renderDialog();
      };
    });

    const hideChk = dlg.querySelector('#mn-iter-hide-dots');
    if (hideChk) hideChk.onchange = () => { c.hideIterDots = !!hideChk.checked; };
    const badgeChk = dlg.querySelector('#mn-iter-show-badge');
    if (badgeChk) badgeChk.onchange = () => { c.showBadge = !!badgeChk.checked; };

    dlg.querySelectorAll('[data-act="backScope"]').forEach(b => {
      b.onclick = () => {
        STATE.stage = 1;
        STATE.dialogOpen = false;
        renderStageBar();
        renderDialog();
        board && board.redraw();
      };
    });
    dlg.querySelectorAll('[data-act="confirm"]').forEach(b => { b.onclick = () => confirmFromDialog(); });
    dlg.querySelectorAll('[data-act="close"]').forEach(b => { b.onclick = () => closeWorkflow(true); });
  }

  /* ========================== DOM: Live Draggable On-Canvas KaTeX Badges ========================== */

  function ensureCanvasLayer() {
    let layer = document.getElementById('mn-iter-canvas-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'mn-iter-canvas-layer';
      document.body.appendChild(layer);
    }
    return layer;
  }

  function isLibraryOpen() {
    const lib = document.querySelector('.library');
    return !!(lib && lib.offsetParent !== null);
  }

  function bindScroller(ed) {
    if (ed && ed.scroller && scrollerBound !== ed.scroller) {
      scrollerBound = ed.scroller;
      scrollerBound.addEventListener('scroll', scheduleSyncBadges, { passive: true });
    }
  }

  function syncBadgesNow() {
    syncScheduled = false;
    const ed = getBoard();
    const layer = ensureCanvasLayer();
    if (!ed || !ed.doc || !ed.doc.pages || !ed.scroller || isLibraryOpen()) {
      layer.style.display = 'none';
      return;
    }
    bindScroller(ed);

    const sr0 = ed.scroller.getBoundingClientRect();
    layer.style.display = 'block';
    layer.style.left = `${sr0.left}px`;
    layer.style.top = `${sr0.top}px`;
    layer.style.width = `${Math.max(0, sr0.width)}px`;
    layer.style.height = `${Math.max(0, sr0.height)}px`;

    const keepKeys = new Set();
    const pages = ed.view && ed.view.pages ? ed.view.pages : ed.doc.pages;

    pages.forEach((pg, pIdx) => {
      const iters = (pg && pg.geo && Array.isArray(pg.geo.iterations)) ? pg.geo.iterations : [];
      iters.forEach((it, idx) => {
        if (!it || it.showBadge === false) return;
        const key = `${pIdx}:${it.id}`;
        const px = Number.isFinite(it.x) ? it.x : 64;
        const py = Number.isFinite(it.y) ? it.y : (80 + idx * 44);
        const pos = pageToScreen(pIdx, px, py);
        if (!pos) return;
        const sr = pos.scrollerRect;
        if (pos.sy < sr.top - 50 || pos.sy > sr.bottom + 50 || pos.sx < sr.left - 220 || pos.sx > sr.right + 50) {
          return;
        }
        keepKeys.add(key);

        let badge = layer.querySelector(`.mn-iter-badge[data-key="${key}"]`);
        const linkedParam = (it.depthParamId && Array.isArray(pg.geo.params))
          ? pg.geo.params.find(p => p && p.id === it.depthParamId)
          : null;
        const isAnim = !!(linkedParam && linkedParam.animating);
        const showAng = it.method === 'rotate' || (it.method === 'dilate' && Math.abs(Number(it.angle) || 0) > 1e-4);
        const showRatio = it.method === 'dilate' || (it.method === 'translate' && Math.abs((Number(it.ratio) || 1) - 1) > 1e-4);
        const structSig = `${it.varName}|${it.method}|${showAng ? 1 : 0}|${showRatio ? 1 : 0}|${it.depthParamId || ''}`;
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'mn-iter-badge';
          badge.dataset.key = key;
          badge.dataset.page = String(pIdx);
          badge.dataset.iterId = it.id;
          badge.addEventListener('pointerdown', e => e.stopPropagation());
          attachBadgeDrag(badge, pIdx, it.id);
          badge.addEventListener('mouseenter', () => {
            STATE.highlightedIterId = it.id;
            ed.redraw();
          });
          badge.addEventListener('mouseleave', () => {
            if (STATE.highlightedIterId === it.id) {
              STATE.highlightedIterId = null;
              ed.redraw();
            }
          });
          layer.appendChild(badge);
        }

        badge.dataset.theme = it.theme || 'pink';
        badge.classList.toggle('active', STATE.highlightedIterId === it.id || STATE.editingIterId === it.id);
        badge.style.left = `${Math.round(pos.sx - sr.left)}px`;
        badge.style.top = `${Math.round(pos.sy - sr.top)}px`;
        badge.style.transform = `scale(${Math.max(0.72, Math.min(1.35, pos.zoom))})`;

        // Rebuild DOM structure ONLY when structural signature changes; update values in-place at 60fps!
        if (badge.dataset.structSig !== structSig) {
          badge.dataset.structSig = structSig;
          populateBadgeContent(badge, pIdx, it, isAnim);
        } else {
          updateBadgeValuesInPlace(badge, it, isAnim);
        }
      });
    });

    layer.querySelectorAll('.mn-iter-badge').forEach(el => {
      if (!keepKeys.has(el.dataset.key)) el.remove();
    });
  }

  function updateBadgeValuesInPlace(badge, it, isAnim) {
    const dIn = badge.querySelector('input[data-bfield="depth"]');
    if (dIn && document.activeElement !== dIn) dIn.value = String(it.depth);
    const aIn = badge.querySelector('input[data-bfield="angle"]');
    if (aIn && document.activeElement !== aIn) aIn.value = fmtViNum(it.angle, 1);
    const rIn = badge.querySelector('input[data-bfield="ratio"]');
    if (rIn && document.activeElement !== rIn) rIn.value = fmtViNum(it.ratio, 2);
    const pBtn = badge.querySelector('[data-bact="play"]');
    if (pBtn) {
      pBtn.classList.toggle('on', !!isAnim);
      pBtn.textContent = isAnim ? '⏸' : '▶';
      pBtn.title = isAnim ? 'Dừng hoạt ảnh tham số' : 'Chạy hoạt ảnh tăng/giảm số lần lặp (đồng bộ bảng Tham số)';
    }
  }

  function populateBadgeContent(badge, pageIdx, it, isAnim) {
    const varTex = texForVar(it.varName || 'n_1');
    const showAng = it.method === 'rotate' || (it.method === 'dilate' && Math.abs(Number(it.angle) || 0) > 1e-4);
    const showRatio = it.method === 'dilate' || (it.method === 'translate' && Math.abs((Number(it.ratio) || 1) - 1) > 1e-4);

    let html = `
      <span class="mn-iter-chip-group">
        <span class="mn-iter-katex-lbl" data-tex="${escapeHtml(varTex)} ="></span>
        <span class="mn-iter-val-box">
          <button type="button" class="mn-iter-step-btn" data-bstep="-1" title="Giảm số lần lặp">−</button>
          <input type="text" class="mn-iter-val-input" data-bfield="depth" value="${escapeHtml(String(it.depth))}" title="Nhập số lần lặp (0–20) — đồng bộ 2 chiều với bảng Tham số" />
          <button type="button" class="mn-iter-step-btn" data-bstep="1" title="Tăng số lần lặp">+</button>
        </span>
      </span>
    `;

    if (showAng) {
      html += `
        <span class="mn-iter-chip-sep"></span>
        <span class="mn-iter-chip-group">
          <span class="mn-iter-katex-lbl" data-tex="\\alpha ="></span>
          <span class="mn-iter-val-box">
            <input type="text" class="mn-iter-val-input wide" data-bfield="angle" value="${escapeHtml(fmtViNum(it.angle, 1))}" title="Góc quay (độ)" />
            <span class="mn-iter-unit">°</span>
          </span>
        </span>
      `;
    }

    if (showRatio) {
      html += `
        <span class="mn-iter-chip-sep"></span>
        <span class="mn-iter-chip-group">
          <span class="mn-iter-katex-lbl" data-tex="k ="></span>
          <span class="mn-iter-val-box">
            <input type="text" class="mn-iter-val-input wide" data-bfield="ratio" value="${escapeHtml(fmtViNum(it.ratio, 2))}" title="Tỉ số" />
          </span>
        </span>
      `;
    }

    html += `
      <span class="mn-iter-badge-acts">
        ${it.depthParamId ? `<button type="button" class="mn-iter-act-btn play ${isAnim ? 'on' : ''}" data-bact="play" title="${isAnim ? 'Dừng hoạt ảnh tham số' : 'Chạy hoạt ảnh tăng/giảm số lần lặp (đồng bộ bảng Tham số)'}">${isAnim ? '⏸' : '▶'}</button>` : ''}
        <button type="button" class="mn-iter-act-btn" data-bact="edit" title="Mở hộp thoại KaTeX chỉnh phương thức, gắn Tham số & đối tượng lặp">⚙</button>
        <button type="button" class="mn-iter-act-btn del" data-bact="del" title="Xóa chuỗi lặp & thẻ tham số">×</button>
      </span>
    `;

    badge.innerHTML = html;
    badge.querySelectorAll('.mn-iter-katex-lbl').forEach(sp => renderKatex(sp, sp.dataset.tex));

    // Stepper buttons (read live iteration state from board so in-place updates never use stale closure!)
    const getLiveIt = () => {
      const ed = getBoard();
      const pg = ed && ed.doc && ed.doc.pages[pageIdx];
      return (pg && pg.geo && pg.geo.iterations || []).find(x => x && x.id === it.id) || it;
    };
    badge.querySelectorAll('[data-bstep]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const live = getLiveIt();
        const delta = Number(btn.dataset.bstep);
        rebuildIteration(pageIdx, live.id, { depth: Math.max(0, Math.min(20, (Number(live.depth) || 0) + delta)) });
      };
    });

    // Direct editable inputs (Enter or blur applies immediately!)
    badge.querySelectorAll('input[data-bfield]').forEach(inp => {
      inp.addEventListener('pointerdown', e => e.stopPropagation());
      const commitVal = () => {
        const live = getLiveIt();
        const field = inp.dataset.bfield;
        if (field === 'depth') {
          const v = Math.max(0, Math.min(20, Math.round(parseViNum(inp.value, live.depth))));
          rebuildIteration(pageIdx, live.id, { depth: v });
        } else if (field === 'angle') {
          const v = parseViNum(inp.value, live.angle);
          rebuildIteration(pageIdx, live.id, { angle: v });
        } else if (field === 'ratio') {
          const v = parseViNum(inp.value, live.ratio);
          if (Math.abs(v) > 1e-4) rebuildIteration(pageIdx, live.id, { ratio: v });
        }
      };
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        const live = getLiveIt();
        if (e.key === 'Enter') {
          commitVal();
          inp.blur();
        } else if (e.key === 'ArrowUp' && inp.dataset.bfield === 'depth') {
          e.preventDefault();
          rebuildIteration(pageIdx, live.id, { depth: Math.min(20, (Number(live.depth) || 0) + 1) });
        } else if (e.key === 'ArrowDown' && inp.dataset.bfield === 'depth') {
          e.preventDefault();
          rebuildIteration(pageIdx, live.id, { depth: Math.max(0, (Number(live.depth) || 0) - 1) });
        }
      });
      inp.addEventListener('change', commitVal);
    });

    // Play/Pause animation button (drives MinNoteGeoParams animation loop!)
    const playBtn = badge.querySelector('[data-bact="play"]');
    if (playBtn) {
      playBtn.onclick = (e) => {
        e.stopPropagation();
        const live = getLiveIt();
        if (live.depthParamId && root.MinNoteGeoParams && typeof root.MinNoteGeoParams.toggleParamAnim === 'function') {
          root.MinNoteGeoParams.toggleParamAnim(pageIdx, live.depthParamId);
        }
      };
    }
    // Edit & Delete buttons
    const editBtn = badge.querySelector('[data-bact="edit"]');
    if (editBtn) editBtn.onclick = (e) => { e.stopPropagation(); openEditIteration(pageIdx, it.id); };
    const delBtn = badge.querySelector('[data-bact="del"]');
    if (delBtn) delBtn.onclick = (e) => { e.stopPropagation(); deleteIteration(pageIdx, it.id); };
  }

  function attachBadgeDrag(badge, pageIdx, iterId) {
    badge.addEventListener('pointerdown', (e) => {
      if (e.target.closest('input, button')) return;
      e.preventDefault();
      e.stopPropagation();
      const ed = getBoard();
      if (!ed || !ed.doc || !ed.doc.pages[pageIdx]) return;
      const pg = ed.doc.pages[pageIdx];
      const it = (pg.geo && pg.geo.iterations || []).find(x => x && x.id === iterId);
      if (!it) return;
      const startX = e.clientX, startY = e.clientY;
      const origX = Number.isFinite(it.x) ? it.x : 64;
      const origY = Number.isFinite(it.y) ? it.y : 80;
      const z = ed.zoom || 1;
      let moved = false;
      badge.classList.add('dragging');
      const mv = (me) => {
        const dx = (me.clientX - startX) / z;
        const dy = (me.clientY - startY) / z;
        if (Math.hypot(dx, dy) > 2) moved = true;
        if (!moved) return;
        const pos = pageToScreen(pageIdx, origX + dx, origY + dy);
        if (pos) {
          badge.style.left = `${Math.round(pos.sx - pos.scrollerRect.left)}px`;
          badge.style.top = `${Math.round(pos.sy - pos.scrollerRect.top)}px`;
        }
      };
      const up = (ue) => {
        root.removeEventListener('pointermove', mv, true);
        root.removeEventListener('pointerup', up, true);
        badge.classList.remove('dragging');
        if (moved) {
          const dx = (ue.clientX - startX) / z;
          const dy = (ue.clientY - startY) / z;
          updateBadgePos(pageIdx, iterId, Math.round(origX + dx), Math.round(origY + dy));
        }
      };
      root.addEventListener('pointermove', mv, true);
      root.addEventListener('pointerup', up, true);
    });
  }

  function scheduleSyncBadges() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(syncBadgesNow);
  }

  /* ========================== Workflow Entry Points ========================== */

  function openNewWorkflow(preselectedShapeIds, jumpStage2) {
    const board = getBoard();
    if (!board) return;
    const pIdx = typeof board.currentPage === 'function' ? board.currentPage() : 0;
    const pg = board.doc && board.doc.pages[pIdx];
    STATE.active = true;
    STATE.pageIdx = pIdx;
    STATE.editingIterId = null;
    STATE.marquee = null;
    STATE.cfg = {
      method: 'map',
      depth: Number(board.geoIterDepth) || 5,
      angle: 60,
      ratio: 0.5,
      scopeShapeIds: Array.isArray(preselectedShapeIds) ? preselectedShapeIds.slice() : [],
      pairs: [],
      pendingSrc: null,
      centerId: null,
      vecA: null,
      vecB: null,
      hideIterDots: true,
      showBadge: true,
      varName: nextVarName(pg && pg.geo, 'map'),
      theme: 'pink',
      depthParamId: '',
      angleParamId: '',
      ratioParamId: ''
    };
    STATE.stage = jumpStage2 ? 2 : 1;
    STATE.dialogOpen = !!jumpStage2;
    renderStageBar();
    renderDialog();
    board.redraw();
  }

  function startFromSelection() {
    const board = getBoard();
    if (!board || !board.sel) return;
    const shapeIds = [...board.sel.shapes];
    const pIdx = board.sel.page;
    board.clearSelection();
    if (typeof board.setTool === 'function') board.setTool({ k: 'geo', t: 'iterate' });
    STATE.pageIdx = pIdx;
    openNewWorkflow(shapeIds, shapeIds.length > 0);
  }

  function openEditIteration(pageIdx, iterId) {
    const board = getBoard();
    if (!board || !board.doc || !board.doc.pages[pageIdx]) return;
    const pg = board.doc.pages[pageIdx];
    const it = (pg.geo && pg.geo.iterations || []).find(x => x && x.id === iterId);
    if (!it) return;
    if (typeof board.setTool === 'function') board.setTool({ k: 'geo', t: 'iterate' });
    STATE.active = true;
    STATE.pageIdx = pageIdx;
    STATE.editingIterId = iterId;
    STATE.stage = 2;
    STATE.dialogOpen = true;
    STATE.marquee = null;
    STATE.cfg = {
      method: it.method || 'map',
      depth: Number.isFinite(Number(it.depth)) ? Number(it.depth) : 5,
      angle: Number(it.angle) || 60,
      ratio: Number.isFinite(Number(it.ratio)) ? Number(it.ratio) : 0.5,
      scopeShapeIds: (it.scopeShapeIds || []).slice(),
      pairs: (it.pairs || []).map(p => [p[0], p[1]]),
      pendingSrc: null,
      centerId: it.centerId || null,
      vecA: it.vecA || null,
      vecB: it.vecB || null,
      hideIterDots: it.hideIterDots !== false,
      showBadge: it.showBadge !== false,
      varName: it.varName || 'n_1',
      theme: it.theme || 'pink',
      depthParamId: it.depthParamId || '',
      angleParamId: it.angleParamId || '',
      ratioParamId: it.ratioParamId || ''
    };
    renderStageBar();
    renderDialog();
    board.redraw();
  }

  function closeWorkflow(switchToSelect) {
    STATE.active = false;
    STATE.dialogOpen = false;
    STATE.editingIterId = null;
    STATE.marquee = null;
    STATE.cfg.pendingSrc = null;
    renderStageBar();
    renderDialog();
    const board = getBoard();
    if (switchToSelect && board && board.tool && board.tool.k === 'geo' && board.tool.t === 'iterate') {
      board.setTool({ k: 'select' });
    } else if (board) {
      board.redraw();
    }
  }

  function onToolChange(tool, board) {
    if (tool && tool.k === 'geo' && tool.t === 'iterate') {
      // Carry over currently selected geo shapes automatically if any!
      if (!STATE.active) {
        const preShapes = (board && board.sel && board.sel.shapes && board.sel.shapes.size)
          ? [...board.sel.shapes]
          : [];
        openNewWorkflow(preShapes, preShapes.length > 0);
      }
    } else if (STATE.active) {
      closeWorkflow(false);
    }
    scheduleSyncBadges();
  }

  function onCancel() {
    if (STATE.active) closeWorkflow(false);
  }

  /* ========================== Global Listeners ========================== */

  root.addEventListener('minnote:aux-update', scheduleSyncBadges);
  root.addEventListener('resize', scheduleSyncBadges);
  root.addEventListener('keydown', (e) => {
    if (!STATE.active) return;
    if (e.key === 'Escape') {
      closeWorkflow(true);
      return;
    }
    if (e.key === 'Enter' && STATE.stage === 2 && canConfirm()) {
      const tg = e.target;
      if (!(tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable))) {
        e.preventDefault();
        e.stopPropagation();
        confirmFromDialog();
      }
    }
  });

  // Periodic lightweight attach once board mounts
  const initTick = setInterval(() => {
    const ed = getBoard();
    if (ed && ed.scroller) {
      bindScroller(ed);
      scheduleSyncBadges();
      clearInterval(initTick);
    }
  }, 400);

  root.MinNoteGeoIterate = {
    STATE,
    buildScopedIteration,
    syncGeoFromParams,
    applyIterationToPage,
    rebuildIteration,
    deleteIteration,
    openNewWorkflow,
    startFromSelection,
    openEditIteration,
    closeWorkflow,
    confirmFromDialog,
    handlePointerDown,
    paintOverlay,
    onToolChange,
    onCancel,
    syncBadges: syncBadgesNow
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
