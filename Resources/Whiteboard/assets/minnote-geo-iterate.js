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
    advancedOpen: false,  // collapsible Advanced options (closed by default for ultra-clean UI!)
    selectedBadgeKey: null, // ONLY the clicked badge lights up & shows controls; others stay quiet!
    highlightedIterId: null,
    hoverShapeId: null,   // live Stage-1 hover highlight so picking objects is effortless!
    pickingBound: false,  // Stage-2 interactive boundary picker (point, segment, or polygon/circle)
    clipUserTouched: false,
    marquee: null,        // { page, x0, y0, x1, y1 } during Stage-1 box drag
    cfg: {
      method: 'map',      // 'map' | 'rotate' | 'dilate' | 'translate' | 'presets'
      depth: 5,
      angle: 60,
      ratio: 0.5,
      scopeShapeIds: [],  // empty = auto scope
      pairs: [],          // [[srcId, dstId], ...] (mirrors branches[0] for backward compatibility)
      branches: [[]],     // Multi-branch IFS rules: Array<Array<[srcId, dstId]>>
      activeBranch: 0,    // Branch index currently receiving canvas point picks
      leavesOnly: false,  // Emit shapes ONLY at final depth step === depth (e.g. Koch snowflake)
      replaceSource: false, // Hide scopeShapeIds when depth > 0 (restored at depth = 0 or delete)
      seedTuples: null,   // Optional multi-seed start tuples, e.g. 3 sides of Koch triangle
      stepFills: null,    // Optional per-step fill palette
      stepColors: null,   // Optional per-step stroke palette
      pendingSrc: null,   // half-picked pair in 'map' mode
      centerId: null,     // for 'rotate' | 'dilate'
      vecA: null,         // for 'translate'
      vecB: null,         // for 'translate'
      clipEnabled: false, // live boundary stop (never spills outside segment/rectangle/circle!)
      clipSeg: null,      // [boundA, boundB]
      clipShapeId: null,  // optional polygon/circle/region boundary id
      hideIterDots: true,
      showBadge: true,
      varName: '',
      theme: 'pink',      // 'pink' | 'blue' | 'violet' | 'emerald'
      depthParamId: '',   // '' = auto-create in geo.params, or existing paramId
      angleParamId: '',   // '' = manual, or existing paramId in geo.params
      ratioParamId: ''    // '' = manual, or existing paramId in geo.params
    }
  };

  const MAX_ITER_DEPTH = 40; // single-branch cap
  const MAX_IFS_SHAPES = 1800; // hard safety cap for multi-branch fractals
  const MAX_IFS_POINTS = 9500;
  const BRANCH_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#4f46e5'];

  function normalizeBranchesRaw(cfg) {
    if (cfg && Array.isArray(cfg.branches) && cfg.branches.length) {
      return cfg.branches.map(b => (Array.isArray(b) ? b.map(p => (Array.isArray(p) ? [p[0], p[1]] : null)).filter(Boolean) : []));
    }
    if (cfg && Array.isArray(cfg.pairs) && cfg.pairs.length) {
      return [cfg.pairs.map(p => [p[0], p[1]])];
    }
    return [[]];
  }

  function syncCfgBranches(cfg) {
    if (!cfg) return;
    if (!Array.isArray(cfg.branches) || !cfg.branches.length) {
      cfg.branches = [Array.isArray(cfg.pairs) ? cfg.pairs.map(p => [p[0], p[1]]) : []];
    }
    if (!Number.isInteger(cfg.activeBranch) || cfg.activeBranch < 0 || cfg.activeBranch >= cfg.branches.length) {
      cfg.activeBranch = 0;
    }
    cfg.pairs = (cfg.branches[0] || []).map(p => [p[0], p[1]]);
  }

  function extractValidBranches(geo, cfg) {
    const rawList = normalizeBranchesRaw(cfg);
    const out = [];
    for (const rawPairs of rawList) {
      const seenSrc = new Set();
      const pairs = [];
      let hasMoving = false;
      for (const pr of rawPairs) {
        if (!Array.isArray(pr) || pr.length < 2) continue;
        const [s, t] = pr;
        if (!s || !t || seenSrc.has(s) || !geo.points[s] || !geo.points[t]) continue;
        seenSrc.add(s);
        pairs.push([s, t]);
        if (s !== t) hasMoving = true;
      }
      if (pairs.length && hasMoving) out.push(pairs);
    }
    return out;
  }

  function maxSafeDepthForCfg(cfg, isBadge) {
    const baseCap = isBadge ? 20 : MAX_ITER_DEPTH;
    if (!cfg || cfg.method !== 'map') return baseCap;
    const rawBr = normalizeBranchesRaw(cfg).filter(b => b.length > 0);
    const B = rawBr.length;
    if (B <= 1) return baseCap;
    const seeds = (Array.isArray(cfg.seedTuples) && cfg.seedTuples.length) ? cfg.seedTuples.length : 1;
    const perUnit = cfg.seedTuples ? 1 : Math.max(1, (cfg.scopeShapeIds || []).length);
    let maxD = 1;
    let accum = 0;
    for (let d = 1; d <= 10; d++) {
      const lvl = seeds * perUnit * Math.pow(B, d);
      accum += lvl;
      const total = cfg.leavesOnly ? lvl : accum;
      if (total <= MAX_IFS_SHAPES && accum * 4 <= MAX_IFS_POINTS) maxD = d;
      else break;
    }
    return Math.max(1, maxD);
  }

  function estimateIfsCount(cfg, depth) {
    const rawBr = normalizeBranchesRaw(cfg).filter(b => b.length > 0);
    const B = rawBr.length;
    const d = Math.max(0, Math.round(Number(depth) || 0));
    if (B <= 1 || d <= 0) return 0;
    const seeds = (Array.isArray(cfg.seedTuples) && cfg.seedTuples.length) ? cfg.seedTuples.length : 1;
    const perUnit = cfg.seedTuples ? 1 : Math.max(1, (cfg.scopeShapeIds || []).length);
    if (cfg.leavesOnly) return Math.round(seeds * perUnit * Math.pow(B, d));
    let sum = 0;
    for (let k = 1; k <= d; k++) sum += seeds * perUnit * Math.pow(B, k);
    return Math.round(sum);
  }

  /**
   * Validate a typed ratio. Dilate k = 0 collapses every copy onto the centre and translate k = 0 stacks all
   * copies on the source, so both are refused (keeping the previous value) instead of being replaced silently.
   * @returns {{value:number, error:string}}
   */
  function normalizeIterRatio(method, raw, prev) {
    const n = Number(String(raw ?? '').trim().replace(',', '.'));
    if (!Number.isFinite(n)) return { value: prev, error: 'Tỉ số phải là một số.' };
    if (Math.abs(n) < 1e-9) {
      return { value: prev, error: method === 'translate' ? 'Hệ số bước phải khác 0.' : 'Tỉ số vị tự phải khác 0.' };
    }
    return { value: n, error: '' };
  }

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
    const n = Math.max(0, Math.min(MAX_ITER_DEPTH, Math.round(Number(cfg.depth) || 0)));
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
    const brs = normalizeBranchesRaw(cfg).filter(b => b.length > 0);
    if (brs.length >= 2) {
      return `\\{f_1,\\dots,f_{${brs.length}}\\}\;(${brs.length}\\text{ nhánh}),\\quad ${v} = ${n}`;
    }
    const pairs = brs[0] || [];
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
   * (supports single-branch GSP5 mappings AND multi-branch IFS fractal trees!).
   */
  function buildScopedIteration(geo, cfg, idGen) {
    const K = getKernel();
    if (!geo || !cfg || !K) return { points: [], shapes: [] };
    const safeMax = maxSafeDepthForCfg(cfg, false);
    const depth = Math.max(0, Math.min(safeMax, Math.round(Number(cfg.depth) || 0)));
    if (depth <= 0) return { points: [], shapes: [] };

    const iterId = cfg.id || ('iter_' + idGen());
    const hideDots = cfg.hideIterDots !== false;
    const leavesOnly = !!cfg.leavesOnly;
    // Copies made by ANY iteration (this one or another) are never sources: iterating another
    // iteration's copies multiplies them, and rebuilding that iteration would orphan our points.
    const allShapes = (geo.shapes || []).filter(sh =>
      sh && !sh.hidden && sh.kind !== 'solid' && sh.kind !== 'flatLink' && !sh._iterId
    );
    const scopeIds = Array.isArray(cfg.scopeShapeIds) ? cfg.scopeShapeIds.filter(Boolean) : [];
    const scopeSet = new Set(scopeIds);
    const scopedShapes = scopeSet.size ? allShapes.filter(sh => scopeSet.has(sh.id)) : [];

    const tagPt = (pt, step) => ({
      ...pt,
      _iterId: iterId,
      _iterStep: step,
      show: hideDots ? false : !!pt.show,
      label: '',
      noName: true,
      group: undefined,
      named: undefined
    });
    const tagSh = (sh, step) => {
      const out = { ...sh, _iterId: iterId, _iterStep: step, group: undefined };
      if (sh && sh.fill && Array.isArray(cfg.stepFills) && cfg.stepFills.length) {
        out.fill = cfg.stepFills[Math.min(step, cfg.stepFills.length - 1)];
      }
      if (Array.isArray(cfg.stepColors) && cfg.stepColors.length) {
        out.color = cfg.stepColors[Math.min(step, cfg.stepColors.length - 1)];
      }
      return out;
    };

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
        if (leavesOnly && step !== depth) continue;
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
          }, step));
        }
        for (const sh of targetShapes) {
          outShs.push(tagSh(remapShape(K, sh, pid => mp.has(pid) ? mp.get(pid) : pid, idGen(), false), step));
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
        if (leavesOnly && step !== depth) continue;
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
          }, step));
        }
        for (const sh of targetShapes) {
          outShs.push(tagSh(remapShape(K, sh, pid => mp.has(pid) ? mp.get(pid) : pid, idGen(), false), step));
        }
      }
      return { points: outPts, shapes: outShs };
    }

    // ------------------------------------------------------------------
    // METHOD 1: MAP — Single-Branch OR Multi-Branch IFS Fractal Engine
    // ------------------------------------------------------------------
    const validBranches = extractValidBranches(geo, cfg);
    if (!validBranches.length) return { points: [], shapes: [] };

    // ==================== MULTI-BRANCH IFS FRACTAL TREE ====================
    if (validBranches.length >= 2) {
      const srcIds = [];
      const srcSet = new Set();
      for (const br of validBranches) {
        for (const [s] of br) {
          if (!srcSet.has(s)) { srcSet.add(s); srcIds.push(s); }
        }
      }
      const branchDstTuples = validBranches.map(br => {
        const bMap = new Map(br);
        return srcIds.map(sid => (bMap.has(sid) ? bMap.get(sid) : sid));
      });

      // Forward reach from unified srcSet
      const fwd = new Set(srcSet);
      for (let changed = true; changed;) {
        changed = false;
        for (const pt of Object.values(geo.points)) {
          if (!pt || pt._iterId || fwd.has(pt.id) || !pt.def) continue;
          const deps = K.Om(pt.def);
          if (deps.length && deps.some(d => fwd.has(d))) {
            fwd.add(pt.id);
            changed = true;
          }
        }
      }

      const hasDepTarget = branchDstTuples.some(tup => tup.some((tid, k) => tid !== srcIds[k] && fwd.has(tid)));

      if (hasDepTarget) {
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
        if (!targetShapes.length) return { points: [], shapes: [] };

        const hasSeeds = Array.isArray(cfg.seedTuples) && cfg.seedTuples.length > 0;
        let templateShapes = targetShapes;
        if (hasSeeds) {
          const tplSet = Array.isArray(cfg.templateShapeIds) && cfg.templateShapeIds.length
            ? new Set(cfg.templateShapeIds)
            : null;
          const filtered = tplSet
            ? targetShapes.filter(sh => tplSet.has(sh.id))
            : targetShapes.filter(sh => {
                const sPts = [...collectShapePointIds(sh)];
                return sPts.length && sPts.every(pid => srcSet.has(pid));
              });
          if (filtered.length) templateShapes = filtered;
        }

        // Backward-prune points needed by templateShapes or any branch destination
        const needed = new Set();
        const stack = [];
        for (const tup of branchDstTuples) {
          for (const tid of tup) stack.push(tid);
        }
        for (const sh of templateShapes) {
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

        const usesSubPts = templateShapes.some(sh => [...collectShapePointIds(sh)].some(pid => needed.has(pid)));
        const identMp = new Map();
        for (const sid of srcIds) identMp.set(sid, sid);
        for (const pid of subPtsOrdered) identMp.set(pid, pid);

        const isIdentTuple = (tup) => tup.length === srcIds.length && tup.every((id, k) => id === srcIds[k]);
        const expandEntry = (entry, step) => {
          if (entry.mp) return entry.mp;
          if (isIdentTuple(entry.tuple)) {
            entry.mp = identMp;
            return identMp;
          }
          if (outPts.length + subPtsOrdered.length > MAX_IFS_POINTS) return null;
          const mp = new Map();
          const ms = new Map();
          srcIds.forEach((sid, k) => mp.set(sid, entry.tuple[k]));
          for (const pid of subPtsOrdered) mp.set(pid, idGen());
          for (const sh of templateShapes) ms.set(sh.id, idGen());
          for (const pid of subPtsOrdered) {
            const orig = geo.points[pid];
            const nid = mp.get(pid);
            outPts.push(tagPt({
              ...orig,
              id: nid,
              def: K._mnRemapDef(orig.def, mp, ms)
            }, step));
          }
          entry.mp = mp;
          entry.ms = ms;
          return mp;
        };

        let frontier = hasSeeds
          ? cfg.seedTuples
              .filter(t => Array.isArray(t) && t.length === srcIds.length && t.every(id => geo.points[id]))
              .map(t => ({ tuple: t.slice(), mp: null, ms: null }))
          : [{ tuple: srcIds.slice(), mp: identMp, ms: null }];

        if (!frontier.length) frontier = [{ tuple: srcIds.slice(), mp: identMp, ms: null }];

        let capped = false;
        for (let step = 1; step <= depth; step++) {
          const emitHere = !leavesOnly || step === depth;
          const nextFrontier = [];
          for (const parent of frontier) {
            const pMp = expandEntry(parent, step);
            if (!pMp) { capped = true; break; }
            for (const bDst of branchDstTuples) {
              const childTuple = bDst.map(tid => (pMp.has(tid) ? pMp.get(tid) : tid));
              const childEntry = { tuple: childTuple, mp: null, ms: null };
              if (emitHere) {
                if (outShs.length + templateShapes.length > MAX_IFS_SHAPES) { capped = true; break; }
                if (usesSubPts) {
                  const cMp = expandEntry(childEntry, step);
                  if (!cMp) { capped = true; break; }
                  for (const sh of templateShapes) {
                    const nid = (childEntry.ms && childEntry.ms.get(sh.id)) || idGen();
                    outShs.push(tagSh(remapShape(K, sh, pid => (cMp.has(pid) ? cMp.get(pid) : pid), nid, false), step));
                  }
                } else {
                  const cMp = new Map();
                  srcIds.forEach((sid, k) => cMp.set(sid, childTuple[k]));
                  for (const sh of templateShapes) {
                    outShs.push(tagSh(remapShape(K, sh, pid => (cMp.has(pid) ? cMp.get(pid) : pid), idGen(), false), step));
                  }
                }
              }
              if (step < depth) nextFrontier.push(childEntry);
            }
            if (capped) break;
          }
          frontier = nextFrontier;
          if (capped || !frontier.length) break;
        }
        return { points: outPts, shapes: outShs };
      }

      // Independent Multi-Branch IFS Fallback (free points with >= 2 pairs per branch)
      const targetShapes = scopedShapes.length
        ? scopedShapes
        : allShapes.filter(sh => [...collectShapePointIds(sh)].some(pid => srcSet.has(pid)));
      if (!targetShapes.length) return { points: [], shapes: [] };

      const coords = K.Tt(geo);
      const simSpecs = [];
      for (const br of validBranches) {
        if (br.length < 2) continue;
        const [a1Id, b1Id] = br[0];
        const [a2Id, b2Id] = br[1];
        const A1 = coords.get(a1Id), B1 = coords.get(b1Id), A2 = coords.get(a2Id), B2 = coords.get(b2Id);
        if (!A1 || !B1 || !A2 || !B2) continue;
        const dA = K.Je(A1, A2), dB = K.Je(B1, B2);
        if (dA <= 1e-6 || dB <= 1e-6) continue;
        const kSim = dB / dA;
        const dAngDeg = ((Math.atan2(B2.y - B1.y, B2.x - B1.x) - Math.atan2(A2.y - A1.y, A2.x - A1.x)) * 180) / Math.PI;
        simSpecs.push({ a1Id, b1Id, kSim, dAngDeg });
      }
      if (!simSpecs.length) return { points: [], shapes: [] };

      const trackedSet = new Set();
      for (const sh of targetShapes) {
        for (const pid of collectShapePointIds(sh)) if (geo.points[pid]) trackedSet.add(pid);
      }
      for (const sp of simSpecs) { trackedSet.add(sp.a1Id); trackedSet.add(sp.b1Id); }
      const trackedPts = [...trackedSet];

      let frontier = [new Map(trackedPts.map(id => [id, id]))];
      let capped = false;
      for (let step = 1; step <= depth; step++) {
        const emitHere = !leavesOnly || step === depth;
        const nextFrontier = [];
        for (const prevMap of frontier) {
          for (const sp of simSpecs) {
            if (outPts.length + trackedPts.length * 2 > MAX_IFS_POINTS || (emitHere && outShs.length + targetShapes.length > MAX_IFS_SHAPES)) {
              capped = true;
              break;
            }
            const curA1 = prevMap.get(sp.a1Id) || sp.a1Id;
            const curB1 = prevMap.get(sp.b1Id) || sp.b1Id;
            const nextMap = new Map();
            for (const pid of trackedPts) {
              const prevId = prevMap.get(pid) || pid;
              const rotId = idGen();
              const outId = idGen();
              outPts.push(tagPt({ id: rotId, def: { t: 'rot', c: curA1, p: prevId, ang: sp.dAngDeg, k: sp.kSim } }, step));
              outPts.push(tagPt({ id: outId, def: { t: 'sum', a: rotId, b: curB1, c: curA1 } }, step));
              nextMap.set(pid, outId);
            }
            if (emitHere) {
              for (const sh of targetShapes) {
                outShs.push(tagSh(remapShape(K, sh, pid => nextMap.get(pid) || pid, idGen(), false), step));
              }
            }
            if (step < depth) nextFrontier.push(nextMap);
          }
          if (capped) break;
        }
        frontier = nextFrontier;
        if (capped || !frontier.length) break;
      }
      return { points: outPts, shapes: outShs };
    }

    // ==================== SINGLE-BRANCH MAP (GSP5 BACKWARD-PRUNED) ====================
    const pairs = validBranches[0];
    const srcIds = pairs.map(p => p[0]);
    const dstIds = pairs.map(p => p[1]);
    const srcSet = new Set(srcIds);

    // 1. Forward reach from srcSet (excluding previously generated points of this iterId)
    const fwd = new Set(srcSet);
    for (let changed = true; changed;) {
      changed = false;
      for (const pt of Object.values(geo.points)) {
        if (!pt || pt._iterId || fwd.has(pt.id) || !pt.def) continue;
        const deps = K.Om(pt.def);
        if (deps.length && deps.some(d => fwd.has(d))) {
          fwd.add(pt.id);
          changed = true;
        }
      }
    }

    const hasDepTarget = dstIds.some((t, idx) => t !== srcIds[idx] && fwd.has(t));

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
          }, step));
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
            }, step));
            mp.set(tid, nid);
            nextImg[k] = nid;
          }
        });

        if (!leavesOnly || step === depth) {
          for (const sh of targetShapes) {
            const nid = ms.get(sh.id) || idGen();
            outShs.push(tagSh(remapShape(K, sh, pid => mp.has(pid) ? mp.get(pid) : pid, nid, false), step));
          }
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
              }, step));
              outPts.push(tagPt({
                id: outId,
                def: { t: 'sum', a: rotId, b: curB1, c: curA1 }
              }, step));
              nextMap.set(pid, outId);
            }
            if (!leavesOnly || step === depth) {
              for (const sh of targetShapes) {
                outShs.push(tagSh(remapShape(K, sh, pid => nextMap.get(pid) || pid, idGen(), false), step));
              }
            }
            // Advance anchor A1->B1 for next step
            const nextRotB = idGen(), nextB1 = idGen();
            outPts.push(tagPt({ id: nextRotB, def: { t: 'rot', c: curA1, p: curB1, ang: dAngDeg, k: kSim } }, step));
            outPts.push(tagPt({ id: nextB1, def: { t: 'sum', a: nextRotB, b: curB1, c: curA1 } }, step));
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
      if (leavesOnly && step !== depth) continue;
      const mp = new Map();
      for (const pid of basePts) {
        const nid = idGen();
        mp.set(pid, nid);
        outPts.push(tagPt({
          ...(geo.points[pid] || {}),
          id: nid,
          def: { t: 'vec', o: pid, a: s0, b: t0, k: step, perp: false }
        }, step));
      }
      for (const sh of targetShapes) {
        outShs.push(tagSh(remapShape(K, sh, pid => mp.get(pid) || pid, idGen(), false), step));
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
    const shapes = (geo.shapes || [])
      .filter(sh => sh && sh._iterId !== iterId)
      .map(sh => {
        if (sh && sh._iterHiddenBy === iterId) {
          const rest = { ...sh, hidden: false };
          delete rest._iterHiddenBy;
          return rest;
        }
        return sh;
      });
    return { ...geo, points, shapes };
  }

  function mergeIterResult(cleanGeo, iterDef, res) {
    const nextPoints = { ...cleanGeo.points };
    for (const pt of res.points) nextPoints[pt.id] = pt;
    const hideScope = !!(iterDef && iterDef.replaceSource && Number(iterDef.depth) > 0 && res.shapes.length > 0);
    const scopeSet = hideScope && Array.isArray(iterDef.scopeShapeIds) ? new Set(iterDef.scopeShapeIds) : null;
    const baseShapes = scopeSet
      ? (cleanGeo.shapes || []).map(sh => (sh && scopeSet.has(sh.id) ? { ...sh, hidden: true, _iterHiddenBy: iterDef.id } : sh))
      : (cleanGeo.shapes || []);
    return {
      ...cleanGeo,
      points: nextPoints,
      shapes: [...baseShapes, ...res.shapes]
    };
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
          const dCap = maxSafeDepthForCfg(nextIt, false);
          const newDepth = Math.max(0, Math.min(dCap, Math.round(evalLinkedParam(K, curGeo, it.depthParamId, it.depth))));
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
        curGeo = mergeIterResult(clean, nextIt, res);
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
      const dCap = maxSafeDepthForCfg(finalDef, false);
      finalDef.depth = Math.max(0, Math.min(dCap, Math.round(Number(finalDef.depth) || 0)));

      // Ensure real parameter in geo.params for depth (2-way unified!)
      if (!finalDef.depthParamId) {
        // Check if we already own a param for this iteration
        const owned = params.find(p => p && p._iterBadgeOwner === finalDef.id);
        if (owned) {
          finalDef.depthParamId = owned.id;
        } else {
          const pid = 'pm_' + K.nt();
          const defaultMax = Math.min(dCap, Math.max(finalDef.depth, dCap < 12 ? dCap : 12));
          params.push({
            id: pid,
            name: finalDef.varName || 't_1',
            value: finalDef.depth,
            unit: 'none',
            min: 0,
            max: defaultMax,
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
          if (finalDef.depth > (up.max ?? 12)) up.max = Math.min(dCap, finalDef.depth);
          if ((up.max ?? 12) > dCap) up.max = dCap;
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
        if (dp && dp.expr) finalDef.depth = Math.max(0, Math.min(dCap, Math.round(evalLinkedParam(K, cleanGeo, finalDef.depthParamId, finalDef.depth))));
        if (dp && dp.name) finalDef.varName = dp.name;
      }
      if (finalDef.angleParamId) {
        finalDef.angle = evalLinkedParam(K, cleanGeo, finalDef.angleParamId, finalDef.angle);
      }
      if (finalDef.ratioParamId) {
        finalDef.ratio = evalLinkedParam(K, cleanGeo, finalDef.ratioParamId, finalDef.ratio);
      }

      const res = buildScopedIteration(cleanGeo, finalDef, K.nt);
      const merged = mergeIterResult(cleanGeo, finalDef, res);
      const existingIters = Array.isArray(cleanGeo.iterations) ? cleanGeo.iterations : [];
      const found = existingIters.some(x => x && x.id === finalDef.id);
      const nextIters = found
        ? existingIters.map(x => (x && x.id === finalDef.id ? { ...finalDef } : x))
        : [...existingIters, { ...finalDef }];

      let nextGeo = {
        ...merged,
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
    const dCap = maxSafeDepthForCfg(nextDef, false);
    nextDef.depth = Math.max(0, Math.min(dCap, Math.round(Number(nextDef.depth) || 0)));
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

  function segIntersectsRect(a, b, rx0, ry0, rx1, ry1) {
    if (!a || !b) return false;
    const inR = (p) => p.x >= rx0 - 3 && p.x <= rx1 + 3 && p.y >= ry0 - 3 && p.y <= ry1 + 3;
    if (inR(a) || inR(b)) return true;
    // Liang-Barsky line-segment / AABB intersection
    const dx = b.x - a.x, dy = b.y - a.y;
    let t0 = 0, t1 = 1;
    const clip = (p, q) => {
      if (Math.abs(p) < 1e-9) return q >= 0;
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    };
    return clip(-dx, a.x - rx0) && clip(dx, rx1 - a.x) && clip(-dy, a.y - ry0) && clip(dy, ry1 - a.y) && t0 <= t1;
  }

  function shapesInRect(geo, coords, x0, y0, x1, y1) {
    const rx0 = Math.min(x0, x1), rx1 = Math.max(x0, x1);
    const ry0 = Math.min(y0, y1), ry1 = Math.max(y0, y1);
    const hit = [];
    for (const sh of (geo.shapes || [])) {
      if (!sh || sh.hidden || sh.kind === 'solid' || sh.kind === 'flatLink') continue;
      if (sh._iterId) continue; // iteration copies are never sources
      const ptIds = [...collectShapePointIds(sh)];
      const pts = ptIds.map(id => coords.get(id)).filter(Boolean);
      if (!pts.length) continue;
      let inside = false;
      if (sh.kind === 'circle' && pts.length >= 2) {
        const c = pts[0], r = Math.hypot(pts[1].x - c.x, pts[1].y - c.y);
        const cx = Math.max(rx0, Math.min(c.x, rx1));
        const cy = Math.max(ry0, Math.min(c.y, ry1));
        const dNear = Math.hypot(cx - c.x, cy - c.y);
        const dFar = Math.max(
          Math.hypot(rx0 - c.x, ry0 - c.y), Math.hypot(rx1 - c.x, ry0 - c.y),
          Math.hypot(rx0 - c.x, ry1 - c.y), Math.hypot(rx1 - c.x, ry1 - c.y)
        );
        // Crossing or enclosing the circle boundary
        inside = (dNear <= r + 4 && dFar >= r - 4) || (c.x >= rx0 && c.x <= rx1 && c.y >= ry0 && c.y <= ry1);
      } else if (sh.kind === 'segment' && pts.length >= 2) {
        inside = segIntersectsRect(pts[0], pts[1], rx0, ry0, rx1, ry1);
      } else if (sh.kind === 'polygon' && pts.length >= 3) {
        for (let k = 0; k < pts.length; k++) {
          if (segIntersectsRect(pts[k], pts[(k + 1) % pts.length], rx0, ry0, rx1, ry1)) { inside = true; break; }
        }
      } else {
        // Crossing-select: any vertex inside OR any consecutive edge crossing rect
        inside = pts.some(p => p.x >= rx0 - 4 && p.x <= rx1 + 4 && p.y >= ry0 - 4 && p.y <= ry1 + 4);
        if (!inside && pts.length >= 2) {
          for (let k = 0; k + 1 < pts.length; k++) {
            if (segIntersectsRect(pts[k], pts[k + 1], rx0, ry0, rx1, ry1)) { inside = true; break; }
          }
        }
      }
      if (inside) hit.push(sh.id);
    }
    return hit;
  }

  /**
   * Auto-detect if a translation vector A->P1 or mapping pair A->P1 runs along an existing
   * segment [u, v] (e.g. P1 placed on top edge of a rectangle at distance a = 1.5 cm).
   * Returning [startId, endId] automatically stops/hides iterations that step outside the segment!
   */
  function detectClipSegment(geo, cfg) {
    const K = getKernel();
    if (!geo || !cfg || !K) return null;
    let p0 = null, p1 = null;
    if (cfg.method === 'translate' && cfg.vecA && cfg.vecB && cfg.vecA !== cfg.vecB) {
      p0 = cfg.vecA; p1 = cfg.vecB;
    } else if (cfg.method === 'map' && Array.isArray(cfg.pairs) && cfg.pairs.length === 1) {
      p0 = cfg.pairs[0][0]; p1 = cfg.pairs[0][1];
    }
    if (!p0 || !p1 || p0 === p1) return null;
    const coords = K.Tt(geo);
    const c0 = coords.get(p0), c1 = coords.get(p1);
    if (!c0 || !c1 || Math.hypot(c1.x - c0.x, c1.y - c0.y) < 1e-3) return null;

    const pt1 = geo.points && geo.points[p1];
    // 1. Direct parametric constraint: p1 placed on segment (def.t === 'on' && def.seg)
    if (pt1 && pt1.def && pt1.def.t === 'on' && pt1.def.seg && pt1.def.a && pt1.def.b) {
      return [pt1.def.a, pt1.def.b];
    }
    // 2. Direct vector-distance constraint along a segment (e.g. a = 1.5 cm along AB)
    if (pt1 && pt1.def && pt1.def.t === 'vec' && !pt1.def.perp && pt1.def.a && pt1.def.b && pt1.def.a !== pt1.def.b) {
      const hasSeg = (geo.shapes || []).some(sh => sh && !sh.hidden && !sh._iterId && (
        (sh.kind === 'segment' && ((sh.pts[0] === pt1.def.a && sh.pts[1] === pt1.def.b) || (sh.pts[0] === pt1.def.b && sh.pts[1] === pt1.def.a))) ||
        (sh.kind === 'polygon' && sh.pts.includes(pt1.def.a) && sh.pts.includes(pt1.def.b))
      ));
      if (hasSeg) return [pt1.def.a, pt1.def.b];
    }
    // 3. Geometric collinearity scan over all visible segments & polygon edges
    const edges = [];
    for (const sh of (geo.shapes || [])) {
      if (!sh || sh.hidden || sh._iterId) continue;
      if (sh.kind === 'segment' && sh.pts && sh.pts.length >= 2) {
        edges.push([sh.pts[0], sh.pts[1]]);
      } else if (sh.kind === 'polygon' && Array.isArray(sh.pts) && sh.pts.length >= 3) {
        for (let k = 0; k < sh.pts.length; k++) edges.push([sh.pts[k], sh.pts[(k + 1) % sh.pts.length]]);
      }
    }
    let best = null, bestLen = 0;
    for (const [u, v] of edges) {
      if (u === p0 && v === p1 || u === p1 && v === p0) continue; // ignore the step segment itself
      const A = coords.get(u), B = coords.get(v);
      if (!A || !B) continue;
      const vx = B.x - A.x, vy = B.y - A.y, L = Math.hypot(vx, vy);
      if (L < 8) continue;
      const proj = (p) => ((p.x - A.x) * vx + (p.y - A.y) * vy) / (L * L);
      const perp = (p) => Math.abs((p.x - A.x) * vy - (p.y - A.y) * vx) / L;
      const t0 = proj(c0), t1 = proj(c1);
      if (perp(c0) <= 2.5 && perp(c1) <= 2.5 && t0 >= -0.02 && t0 <= 1.02 && t1 > 0.005 && t1 < 0.995 && Math.abs(t1 - t0) > 1e-3) {
        if (L > bestLen) {
          bestLen = L;
          best = t1 > t0 ? [u, v] : [v, u];
        }
      }
    }
    return best;
  }

  function autoUpdateClipBound(geo) {
    if (STATE.clipUserTouched) return;
    const det = detectClipSegment(geo, STATE.cfg);
    if (det) {
      STATE.cfg.clipSeg = det;
      STATE.cfg.clipShapeId = null;
      STATE.cfg.clipEnabled = true;
    } else if (!STATE.cfg.clipShapeId) {
      STATE.cfg.clipSeg = null;
      STATE.cfg.clipEnabled = false;
    }
  }

  /* ========================== Interactive Canvas Pointer Handler ========================== */

  function handlePointerDown(board, pageIdx, pt, ev) {
    const K = getKernel();
    if (!board || !K || !board.doc || !board.doc.pages[pageIdx]) return false;
    STATE.active = true;
    STATE.pageIdx = pageIdx;

    const pg = board.doc.pages[pageIdx];
    const coords = K.Tt(pg.geo);
    const tol = Math.max(14 / (board.zoom || 1), typeof board.tol === 'function' ? board.tol() : 12);

    // STAGE 1: Pick target shapes to iterate (single click toggle OR drag crossing marquee box!)
    if (STATE.stage === 1) {
      const availShapes = pg.geo.shapes.filter(s => s && !s.hidden && !s._iterId);
      const hitSh =
        (typeof K.$0 === 'function' ? K.$0(availShapes, coords, pt, tol, false) : null) ||
        (typeof K._mnFilledPolyAt === 'function' ? K._mnFilledPolyAt(availShapes, coords, pt, false) : null);

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

    // STAGE 2A: Interactive boundary pick mode (click end point, segment, or polygon/circle!)
    if (STATE.pickingBound) {
      const availShapes = pg.geo.shapes.filter(s => s && !s.hidden && !s._iterId);
      const nearPt = typeof board.pointNear === 'function' ? board.pointNear(pg, coords, pt, false) : null;
      const hitSh =
        (typeof K.$0 === 'function' ? K.$0(availShapes, coords, pt, tol, false) : null) ||
        (typeof K._mnFilledPolyAt === 'function' ? K._mnFilledPolyAt(availShapes, coords, pt, false) : null);

      const anchorA = STATE.cfg.method === 'translate'
        ? STATE.cfg.vecA
        : (STATE.cfg.pairs && STATE.cfg.pairs[0] ? STATE.cfg.pairs[0][0] : null);

      if (nearPt && anchorA && nearPt !== anchorA) {
        STATE.cfg.clipSeg = [anchorA, nearPt];
        STATE.cfg.clipShapeId = null;
        STATE.cfg.clipEnabled = true;
        STATE.clipUserTouched = true;
        STATE.pickingBound = false;
      } else if (hitSh) {
        if (hitSh.kind === 'segment' && hitSh.pts && hitSh.pts.length >= 2) {
          STATE.cfg.clipSeg = [hitSh.pts[0], hitSh.pts[1]];
          STATE.cfg.clipShapeId = null;
          STATE.cfg.clipEnabled = true;
          STATE.clipUserTouched = true;
          STATE.pickingBound = false;
        } else if (hitSh.kind === 'polygon' || hitSh.kind === 'circle' || hitSh.kind === 'region') {
          STATE.cfg.clipShapeId = hitSh.id;
          STATE.cfg.clipSeg = null;
          STATE.cfg.clipEnabled = true;
          STATE.clipUserTouched = true;
          STATE.pickingBound = false;
        }
      }
      board.redraw();
      renderDialog();
      if (STATE.editingIterId && !STATE.pickingBound) {
        rebuildIteration(STATE.pageIdx, STATE.editingIterId, {
          clipEnabled: STATE.cfg.clipEnabled,
          clipSeg: STATE.cfg.clipSeg,
          clipShapeId: STATE.cfg.clipShapeId
        });
      }
      return true;
    }

    // STAGE 2B: Pick points according to chosen iteration method
    const nearPt = typeof board.pointNear === 'function' ? board.pointNear(pg, coords, pt, false) : null;
    if (!nearPt) return true;

    if (STATE.cfg.method === 'rotate' || STATE.cfg.method === 'dilate') {
      STATE.cfg.centerId = nearPt;
    } else if (STATE.cfg.method === 'translate') {
      if (!STATE.cfg.vecA || (STATE.cfg.vecA && STATE.cfg.vecB)) {
        STATE.cfg.vecA = nearPt;
        STATE.cfg.vecB = null;
      } else if (nearPt !== STATE.cfg.vecA) {
        STATE.cfg.vecB = nearPt;
        autoUpdateClipBound(pg.geo);
      }
    } else if (STATE.cfg.method === 'map') {
      // method === 'map': pairs of Source -> Image on active branch (supports multi-branch IFS!)
      syncCfgBranches(STATE.cfg);
      const bIdx = STATE.cfg.activeBranch;
      const curPairs = STATE.cfg.branches[bIdx] || [];
      if (!STATE.cfg.pendingSrc) {
        STATE.cfg.pendingSrc = nearPt;
      } else if (nearPt !== STATE.cfg.pendingSrc) {
        const filtered = curPairs.filter(p => p[0] !== STATE.cfg.pendingSrc);
        filtered.push([STATE.cfg.pendingSrc, nearPt]);
        STATE.cfg.branches[bIdx] = filtered;
        STATE.cfg.seedTuples = null;
        syncCfgBranches(STATE.cfg);
        STATE.cfg.pendingSrc = null;
        if (STATE.cfg.branches.filter(b => b.length > 0).length <= 1) autoUpdateClipBound(pg.geo);
      } else {
        // Clicking the same point twice in multi-branch IFS locks it as a fixed corner P -> P (if not already present)
        const hasFixed = curPairs.some(p => p[0] === nearPt && p[1] === nearPt);
        if (STATE.cfg.branches.length >= 2 && !hasFixed) {
          const filtered = curPairs.filter(p => p[0] !== nearPt);
          filtered.push([nearPt, nearPt]);
          STATE.cfg.branches[bIdx] = filtered;
          STATE.cfg.seedTuples = null;
          syncCfgBranches(STATE.cfg);
        }
        STATE.cfg.pendingSrc = null;
      }
    } else {
      return true;
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

    // 2. Highlight Stage-1 hovered & selected scope shapes
    if (STATE.stage === 1 && STATE.hoverShapeId && !(STATE.cfg.scopeShapeIds || []).includes(STATE.hoverShapeId)) {
      const hsh = pg.geo.shapes.find(sh => sh && !sh.hidden && sh.id === STATE.hoverShapeId);
      if (hsh) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        const col = '#0ea5e9';
        const isF = isFillOnly(K, hsh);
        K.gd(ctx, {
          points: pg.geo.points,
          shapes: [isF ? { ...hsh, color: col, fill: col + '22', gaps: undefined, hiddenSides: undefined, width: 2.2 + 2 / s } : { ...hsh, color: col, width: (hsh.width || 2) + 3.2 / s }]
        }, coords, { hidePoints: true });
        ctx.restore();
      }
    }
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
        const brs = normalizeBranchesRaw(STATE.cfg);
        const multi = brs.length >= 2;
        brs.forEach((pairs, bIdx) => {
          const col = BRANCH_COLORS[bIdx % BRANCH_COLORS.length];
          ctx.save();
          if (multi && bIdx !== STATE.cfg.activeBranch) ctx.globalAlpha = 0.52;
          pairs.forEach(([sId, dId], idx) => {
            if (sId === dId) {
              drawDotRing(sId, col, multi ? `N${bIdx + 1} cố định` : 'Cố định');
            } else {
              drawDotRing(sId, col);
              drawDotRing(dId, multi ? col : '#ec4899');
              drawArrow(coords.get(sId), coords.get(dId), col, multi ? `N${bIdx + 1}·${idx + 1}` : `${idx + 1}`);
            }
          });
          ctx.restore();
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

      // Draw active clip boundary preview (emerald dashed stop-wall!)
      if (STATE.cfg.clipEnabled && Array.isArray(STATE.cfg.clipSeg) && STATE.cfg.clipSeg.length === 2) {
        const bA = coords.get(STATE.cfg.clipSeg[0]), bB = coords.get(STATE.cfg.clipSeg[1]);
        if (bA && bB) {
          ctx.save();
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 3 / s;
          ctx.globalAlpha = 0.65;
          ctx.setLineDash([7 / s, 5 / s]);
          ctx.beginPath();
          ctx.moveTo(bA.x, bA.y);
          ctx.lineTo(bB.x, bB.y);
          ctx.stroke();
          ctx.restore();
          drawDotRing(STATE.cfg.clipSeg[1], '#059669', 'Biên');
        }
      } else if (STATE.cfg.clipEnabled && STATE.cfg.clipShapeId) {
        const bsh = pg.geo.shapes.find(sh => sh && sh.id === STATE.cfg.clipShapeId);
        if (bsh) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          K.gd(ctx, { points: pg.geo.points, shapes: [{ ...bsh, color: '#059669', fill: undefined, width: (bsh.width || 2) + 2.4 / s, dashed: true }] }, coords, { hidePoints: true });
          ctx.restore();
        }
      }
    }
  }

  /* ========================== Can-Apply Readiness Check ========================== */

  function canConfirm() {
    const c = STATE.cfg;
    if (c.method === 'presets') return false;
    if (c.method === 'map') {
      const brs = normalizeBranchesRaw(c);
      return brs.some(br => br.some(p => Array.isArray(p) && p[0] && p[1] && p[0] !== p[1]));
    }
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

    syncCfgBranches(STATE.cfg);
    const nonEmptyBranches = STATE.cfg.branches.filter(b => b && b.length > 0).map(b => b.map(p => [p[0], p[1]]));
    const dCap = maxSafeDepthForCfg(STATE.cfg, false);

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
      depth: Math.max(0, Math.min(dCap, Math.round(Number(STATE.cfg.depth) || 0))),
      angle: Number(STATE.cfg.angle) || 0,
      ratio: Number.isFinite(Number(STATE.cfg.ratio)) ? Number(STATE.cfg.ratio) : (STATE.cfg.method === 'translate' ? 1 : 0.5),
      scopeShapeIds: (STATE.cfg.scopeShapeIds || []).slice(),
      pairs: (nonEmptyBranches[0] || []).map(p => [p[0], p[1]]),
      branches: nonEmptyBranches.length >= 2 ? nonEmptyBranches : undefined,
      leavesOnly: !!STATE.cfg.leavesOnly,
      replaceSource: !!STATE.cfg.replaceSource,
      seedTuples: Array.isArray(STATE.cfg.seedTuples) ? STATE.cfg.seedTuples.map(t => t.slice()) : undefined,
      stepFills: Array.isArray(STATE.cfg.stepFills) ? STATE.cfg.stepFills.slice() : undefined,
      stepColors: Array.isArray(STATE.cfg.stepColors) ? STATE.cfg.stepColors.slice() : undefined,
      centerId: STATE.cfg.centerId || null,
      vecA: STATE.cfg.vecA || null,
      vecB: STATE.cfg.vecB || null,
      clipEnabled: !!STATE.cfg.clipEnabled && !!(STATE.cfg.clipSeg || STATE.cfg.clipShapeId),
      clipSeg: Array.isArray(STATE.cfg.clipSeg) && STATE.cfg.clipSeg.length === 2 ? STATE.cfg.clipSeg.slice() : null,
      clipShapeId: STATE.cfg.clipShapeId || null,
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
    STATE.pickingBound = false;
    STATE.hoverShapeId = null;
    STATE.marquee = null;
    STATE.cfg.pendingSrc = null;
    renderStageBar();
    renderDialog();
    // Switch cleanly back to Select tool so the user can immediately drag points or tweak the live KaTeX badge!
    if (typeof board.setTool === 'function') board.setTool({ k: 'select' });
    scheduleSyncBadges();
    return true;
  }

  /* ========================== Toast Helper ========================== */

  let toastTimer = null;
  function showIterToast(msg) {
    let el = document.getElementById('mn-iter-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mn-iter-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3600);
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
    // Show top floating pill ONLY in Stage 1 (when dialog is hidden so canvas is unobstructed!).
    // In Stage 2, the compact dialog itself holds all controls — no duplicate double UI!
    if (!STATE.active || STATE.stage !== 1) {
      bar.classList.remove('open');
      return;
    }
    bar.classList.add('open');
    const scCount = (STATE.cfg.scopeShapeIds || []).length;

    bar.innerHTML = `
      <span class="mn-isb-hint">Bước 1: Bấm hoặc kéo khung chọn hình cần lặp</span>
      <span class="mn-isb-cnt">${scCount} hình</span>
      ${scCount > 0 ? '<button type="button" class="mn-isb-btn" data-act="clearScope">Bỏ chọn</button>' : ''}
      <button type="button" class="mn-isb-btn primary" data-act="stage2">${scCount > 0 ? 'Tiếp tục →' : 'Bỏ qua (Tự động) →'}</button>
      <button type="button" class="mn-isb-btn preset" data-act="openPresets" title="Dựng nhanh 10 bài toán Cấp số nhân & Fractal Toán 11">✨ Mẫu CSN 11</button>
      <button type="button" class="mn-isb-btn" data-act="close" title="Đóng (Esc)">✕</button>
    `;

    bar.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        const board = getBoard();
        if (act === 'stage2') {
          STATE.stage = 2;
          STATE.dialogOpen = true;
          if (STATE.cfg.method === 'presets') STATE.cfg.method = 'map';
          renderStageBar();
          renderDialog();
          board && board.redraw();
        } else if (act === 'openPresets') {
          STATE.stage = 2;
          STATE.dialogOpen = true;
          STATE.cfg.method = 'presets';
          renderStageBar();
          renderDialog();
          board && board.redraw();
        } else if (act === 'clearScope') {
          STATE.cfg.scopeShapeIds = [];
          renderStageBar();
          board && board.redraw();
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
    syncCfgBranches(c);
    const scCount = (c.scopeShapeIds || []).length;
    const ready = canConfirm();
    const isPresetsTab = c.method === 'presets';
    const dCap = maxSafeDepthForCfg(c, false);
    if (c.depth > dCap) c.depth = dCap;

    if (!c.varName) c.varName = nextVarName(geo, c.method === 'presets' ? 'map' : c.method);

    // Pick-status HTML per method
    let pickHtml = '';
    const isMultiIfs = c.method === 'map' && c.branches.length >= 2;
    if (c.method === 'map') {
      const bIdx = c.activeBranch;
      const curPairs = c.branches[bIdx] || [];
      const brPills = c.branches.map((br, i) => {
        const col = BRANCH_COLORS[i % BRANCH_COLORS.length];
        return `<span class="mn-idlg-br-pill ${i === bIdx ? 'active' : ''}" data-sel-branch="${i}">
          <span class="mn-idlg-br-dot" style="background:${col}"></span>
          <span>Nhánh ${i + 1}${br.length ? ` (${br.length})` : ''}</span>
          ${c.branches.length > 1 ? `<button type="button" class="mn-idlg-br-rm" data-rm-branch="${i}" title="Xóa nhánh này">×</button>` : ''}
        </span>`;
      }).join('');
      const addBrBtn = c.branches.length < 8
        ? `<button type="button" class="mn-idlg-br-add" data-act="addBranch" title="Thêm quy tắc ánh xạ để dựng Fractal nhiều nhánh (Sierpinski, Koch, Pythagoras)">+ Thêm nhánh</button>`
        : '';

      const chips = curPairs.map(([s, d], idx) =>
        `<span class="mn-idlg-chip">${escapeHtml(ptLabel(geo, s))} → ${escapeHtml(ptLabel(geo, d))}${s === d ? ' <small style="color:#6d28d9">(cố định)</small>' : ''}<button type="button" data-rm-pair="${idx}" title="Xóa cặp">×</button></span>`
      ).join('');
      const pending = c.pendingSrc
        ? `<span class="mn-idlg-chip" style="border-color:#f59e0b;background:#fffbeb">${escapeHtml(ptLabel(geo, c.pendingSrc))} → ? (bấm điểm ảnh)<button type="button" class="mn-idlg-fix-btn" data-act="fixPending" title="Giữ điểm này cố định (P → P)">Cố định</button></span>`
        : '';
      const hasAnyPair = c.branches.some(br => br.some(p => p[0] !== p[1]));
      pickHtml = `
        <div class="mn-idlg-pick-box ${hasAnyPair ? 'ready' : ''}">
          <div class="mn-idlg-branches-bar">${brPills}${addBrBtn}</div>
          <div><strong>${isMultiIfs ? `Nhánh ${bIdx + 1} — chọn cặp Nguồn → Ảnh trên bảng:` : 'Chọn cặp điểm Nguồn → Ảnh ngay trên bảng vẽ:'}</strong></div>
          <div class="mn-idlg-chips">${chips}${pending || (!chips ? '<span style="color:#64748b">Bấm điểm Nguồn rồi bấm điểm Ảnh (Fractal: bấm "+ Thêm nhánh")</span>' : '')}</div>
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
    } else if (c.method === 'translate') {
      pickHtml = `
        <div class="mn-idlg-pick-box ${(c.vecA && c.vecB) ? 'ready' : ''}">
          <div class="mn-idlg-row">
            <span><strong>Bấm 2 điểm vectơ tịnh tiến trên bảng:</strong></span>
            ${c.vecA ? `<span class="mn-idlg-chip">${escapeHtml(ptLabel(geo, c.vecA))} → ${c.vecB ? escapeHtml(ptLabel(geo, c.vecB)) : '?'}<button type="button" data-clear-vec="1">×</button></span>` : '<span style="color:#64748b">Chưa chọn</span>'}
          </div>
        </div>`;
    }

    // Method-specific essential numeric controls (NO cluttered dropdowns here — those live cleanly in Advanced!)
    const allParams = Array.isArray(geo.params) ? geo.params : [];
    const paramOpts = (selectedId, defaultLbl, unitFilter) => {
      const filtered = allParams.filter(p => p && (!unitFilter || p.unit === unitFilter || p.unit === 'none'));
      return `<option value="">${escapeHtml(defaultLbl)}</option>` +
        filtered.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)} = ${escapeHtml(fmtViNum(evalLinkedParam(getKernel(), geo, p.id, p.value), 2))}</option>`).join('');
    };

    let extraControls = '';
    if (isMultiIfs) {
      const nonEmptyB = c.branches.filter(b => b.length > 0).length;
      const est = estimateIfsCount(c, c.depth);
      extraControls += `
        <div class="mn-idlg-ifs-box">
          <div class="mn-idlg-ifs-meta">
            <span>Fractal IFS • ${Math.max(nonEmptyB, c.branches.length)} nhánh</span>
            <span>Tối đa n = ${dCap}${est > 0 ? ` (~${est} hình)` : ''}</span>
          </div>
          <label class="mn-idlg-check" title="Chỉ giữ các hình ở tầng lặp cuối cùng (ví dụ: Bông tuyết Von Koch)">
            <input type="checkbox" id="mn-iter-leaves-only" ${c.leavesOnly ? 'checked' : ''} />
            <span>Chỉ giữ tầng cuối (thay thế cạnh/mặt)</span>
          </label>
          <label class="mn-idlg-check" title="Ẩn tạm hình gốc khi n > 0 và tự hiện lại khi n = 0">
            <input type="checkbox" id="mn-iter-replace-src" ${c.replaceSource ? 'checked' : ''} />
            <span>Ẩn hình gốc khi n &gt; 0</span>
          </label>
        </div>
      `;
    } else if (c.method === 'rotate') {
      extraControls += `
        <div class="mn-idlg-row">
          <label><span class="mn-idlg-katex-inline" data-tex="\\alpha"></span> Góc quay (°)</label>
          <div class="mn-idlg-num-ctrl">
            <input type="text" id="mn-iter-angle-in" value="${escapeHtml(fmtViNum(c.angle, 1))}" />
          </div>
        </div>
        <div class="mn-idlg-presets">
          ${[45, 60, 90, 120].map(a => `<button type="button" class="mn-idlg-mini-btn" data-set-ang="${a}">${a}°</button>`).join('')}
          <button type="button" class="mn-idlg-mini-btn" data-set-ang="auto360" title="Chia đều 360°">360°/(n+1)</button>
        </div>
      `;
    } else if (c.method === 'dilate') {
      extraControls += `
        <div class="mn-idlg-row">
          <label><span class="mn-idlg-katex-inline" data-tex="k"></span> Tỉ số vị tự</label>
          <div class="mn-idlg-num-ctrl">
            <input type="text" id="mn-iter-ratio-in" value="${escapeHtml(fmtViNum(c.ratio, 2))}" />
          </div>
        </div>
        <div class="mn-idlg-presets">
          ${[0.5, 0.7, 0.8, 1.25].map(r => `<button type="button" class="mn-idlg-mini-btn" data-set-ratio="${r}">${fmtViNum(r, 2)}</button>`).join('')}
        </div>
      `;
    }

    const advBodyHtml = STATE.advancedOpen ? `
      <div class="mn-idlg-adv-body">
        <div class="mn-idlg-katex-preview"><div id="mn-idlg-formula"></div></div>
        ${c.method === 'dilate' ? `
          <div class="mn-idlg-row">
            <label><span class="mn-idlg-katex-inline" data-tex="\\alpha"></span> Góc xoắn (°)</label>
            <div class="mn-idlg-num-ctrl">
              <input type="text" id="mn-iter-angle-in" value="${escapeHtml(fmtViNum(c.angle, 1))}" />
            </div>
          </div>
        ` : ''}
        ${c.method === 'translate' ? `
          <div class="mn-idlg-row">
            <label><span class="mn-idlg-katex-inline" data-tex="k"></span> Hệ số bước</label>
            <div class="mn-idlg-num-ctrl">
              <input type="text" id="mn-iter-ratio-in" value="${escapeHtml(fmtViNum(c.ratio, 2))}" />
            </div>
          </div>
        ` : ''}
        <div class="mn-idlg-row">
          <label>Tên biến & màu</label>
          <div class="mn-idlg-num-ctrl">
            <input type="text" id="mn-iter-var-in" value="${escapeHtml(c.varName)}" style="width:54px" />
            <div class="mn-idlg-themes">
              <button type="button" class="mn-idlg-swatch ${c.theme === 'pink' ? 'on' : ''}" data-theme="pink" style="background:#f472b6"></button>
              <button type="button" class="mn-idlg-swatch ${c.theme === 'blue' ? 'on' : ''}" data-theme="blue" style="background:#3b82f6"></button>
              <button type="button" class="mn-idlg-swatch ${c.theme === 'violet' ? 'on' : ''}" data-theme="violet" style="background:#8b5cf6"></button>
              <button type="button" class="mn-idlg-swatch ${c.theme === 'emerald' ? 'on' : ''}" data-theme="emerald" style="background:#10b981"></button>
            </div>
          </div>
        </div>
        <div class="mn-idlg-row">
          <label>Gắn số lần lặp</label>
          <select class="mn-idlg-param-sel" id="mn-iter-depth-param">${paramOpts(c.depthParamId, 'Tự tạo (' + (c.varName || 't_1') + ')', 'none')}</select>
        </div>
        ${(c.method === 'rotate' || c.method === 'dilate') ? `
          <div class="mn-idlg-row">
            <label>Gắn góc α</label>
            <select class="mn-idlg-param-sel" id="mn-iter-ang-param">${paramOpts(c.angleParamId, 'Nhập tay', 'angle')}</select>
          </div>
        ` : ''}
        ${(c.method === 'dilate' || c.method === 'translate') ? `
          <div class="mn-idlg-row">
            <label>Gắn tỉ số k</label>
            <select class="mn-idlg-param-sel" id="mn-iter-rat-param">${paramOpts(c.ratioParamId, 'Nhập tay', 'none')}</select>
          </div>
        ` : ''}
        <label class="mn-idlg-check">
          <input type="checkbox" id="mn-iter-hide-dots" ${c.hideIterDots ? 'checked' : ''} />
          <span>Ẩn chấm đỏ ở các tầng lặp</span>
        </label>
        <label class="mn-idlg-check">
          <input type="checkbox" id="mn-iter-show-badge" ${c.showBadge ? 'checked' : ''} />
          <span>Hiện thẻ KaTeX trên bảng vẽ</span>
        </label>
      </div>
    ` : '';

    const presetsBodyHtml = isPresetsTab ? (() => {
      const renderCard = (p) => `
        <button type="button" class="mn-idlg-preset-card" data-spawn-preset="${escapeHtml(p.id)}">
          <span class="mn-idlg-preset-icon">${p.svg}</span>
          <span class="mn-idlg-preset-info">
            <span class="mn-idlg-preset-name">
              <span>${escapeHtml(p.name)}</span>
              <span class="mn-idlg-preset-tag ${p.group === 'csn' ? 'csn' : ''}">${escapeHtml(p.badge)}</span>
            </span>
            <span class="mn-idlg-preset-desc">
              <span class="mn-idlg-katex-inline" data-tex="${escapeHtml(p.tex)}"></span>
              <span>• ${escapeHtml(p.sub)}</span>
            </span>
          </span>
        </button>`;
      const ifsCards = CSN_PRESETS.filter(p => p.group === 'ifs').map(renderCard).join('');
      const csnCards = CSN_PRESETS.filter(p => p.group === 'csn').map(renderCard).join('');
      return `
        <div class="mn-idlg-presets-wrap">
          <div class="mn-idlg-preset-tip">Bấm 1 lần để dựng hình động 100% chuẩn SGK Toán 11 — kéo đỉnh để biến dạng hoặc bấm thẻ <strong>n</strong> để tăng/giảm bậc.</div>
          <div class="mn-idlg-preset-sec">Fractal nhiều nhánh (IFS)</div>
          <div class="mn-idlg-preset-grid">${ifsCards}</div>
          <div class="mn-idlg-preset-sec">Chuỗi Cấp số nhân (CSN) lùi vô hạn</div>
          <div class="mn-idlg-preset-grid">${csnCards}</div>
        </div>
      `;
    })() : '';

    const regularBodyHtml = isPresetsTab ? '' : `
        ${pickHtml}

        <div class="mn-idlg-row">
          <label><span class="mn-idlg-katex-inline" data-tex="${escapeHtml(texForVar(c.varName))}"></span> Số lần lặp</label>
          <div class="mn-idlg-num-ctrl">
            <button type="button" class="mn-idlg-mini-btn" data-step-depth="-1">−</button>
            <input type="number" id="mn-iter-depth-in" min="0" max="${dCap}" step="1" value="${c.depth}" />
            <button type="button" class="mn-idlg-mini-btn" data-step-depth="1">+</button>
          </div>
        </div>
        <input type="range" class="mn-idlg-slider" id="mn-iter-depth-rng" min="0" max="${dCap}" step="1" value="${c.depth}" />

        ${extraControls}

        ${!isMultiIfs ? (() => {
          const hasBound = !!(c.clipSeg || c.clipShapeId);
          const bLbl = Array.isArray(c.clipSeg) && c.clipSeg.length === 2
            ? `${ptLabel(geo, c.clipSeg[0])}${ptLabel(geo, c.clipSeg[1])}`
            : (c.clipShapeId ? 'Khung' : '');
          return `
            <div class="mn-idlg-bound-row ${c.clipEnabled && hasBound ? 'active' : ''}">
              <label class="mn-idlg-check" title="Tự ẩn các bước lặp vượt ra ngoài đoạn thẳng hoặc khung giới hạn khi thay đổi kích thước">
                <input type="checkbox" id="mn-iter-clip-on" ${c.clipEnabled && hasBound ? 'checked' : ''} ${hasBound ? '' : 'disabled'} />
                <span>Dừng trong biên</span>
              </label>
              ${hasBound ? `<span class="mn-idlg-bound-tag">${escapeHtml(bLbl)}</span>` : ''}
              <button type="button" class="mn-idlg-bound-btn ${STATE.pickingBound ? 'picking' : ''}" data-act="pickBound" title="Bấm chọn điểm đích, đoạn thẳng, hoặc đa giác/đường tròn làm biên giới hạn trên bảng vẽ">${STATE.pickingBound ? 'Bấm trên bảng…' : (hasBound ? 'Đổi' : 'Chọn biên')}</button>
            </div>
          `;
        })() : ''}

        <button type="button" class="mn-idlg-adv-toggle" data-act="toggleAdv">
          <span>${STATE.advancedOpen ? '▾' : '▸'} Tùy chọn nâng cao (Tham số, KaTeX)</span>
        </button>
        ${advBodyHtml}
    `;

    dlg.innerHTML = `
      <div class="mn-idlg-hdr" id="mn-idlg-drag">
        <div class="mn-idlg-title">
          <span>${STATE.editingIterId ? 'Sửa Phép lặp' : 'Phép lặp'}</span>
          ${!isPresetsTab ? `<button type="button" class="mn-idlg-scope-pill" data-act="backScope" title="Quay lại Bước 1 để chọn lại đối tượng lặp">${scCount > 0 ? `${scCount} hình` : 'Tự động'}</button>` : '<span class="mn-idlg-preset-tag">Toán 11</span>'}
        </div>
        <button type="button" class="mn-idlg-close" data-act="close" title="Đóng">×</button>
      </div>
      <div class="mn-idlg-body">
        <div class="mn-idlg-methods">
          <button type="button" class="mn-idlg-mbtn ${c.method === 'map' ? 'active' : ''}" data-method="map">Ánh xạ</button>
          <button type="button" class="mn-idlg-mbtn ${c.method === 'rotate' ? 'active' : ''}" data-method="rotate">Quay</button>
          <button type="button" class="mn-idlg-mbtn ${c.method === 'dilate' ? 'active' : ''}" data-method="dilate">Vị tự</button>
          <button type="button" class="mn-idlg-mbtn ${c.method === 'translate' ? 'active' : ''}" data-method="translate">Tịnh tiến</button>
          <button type="button" class="mn-idlg-mbtn ${c.method === 'presets' ? 'active' : ''}" data-method="presets">Mẫu CSN</button>
        </div>

        ${isPresetsTab ? presetsBodyHtml : regularBodyHtml}
      </div>
      <div class="mn-idlg-ftr">
        ${isPresetsTab ? `
          <button type="button" class="mn-isb-btn" data-act="backScope">← Tự dựng lặp</button>
          <button type="button" class="mn-isb-btn" data-act="close">Đóng</button>
        ` : `
          <button type="button" class="mn-isb-btn" data-act="backScope">← Chọn hình</button>
          <button type="button" class="mn-isb-btn primary" data-act="confirm" ${ready ? '' : 'disabled'}>
            ${STATE.editingIterId ? '✓ Cập nhật' : '✓ Dựng lặp'}
          </button>
        `}
      </div>
    `;

    // Render KaTeX formulas inside dialog
    const fEl = dlg.querySelector('#mn-idlg-formula');
    if (fEl) renderKatex(fEl, formulaLatexForCfg(geo, c));
    dlg.querySelectorAll('.mn-idlg-katex-inline').forEach(sp => renderKatex(sp, sp.dataset.tex));
    const advBtn = dlg.querySelector('[data-act="toggleAdv"]');
    if (advBtn) advBtn.onclick = () => { STATE.advancedOpen = !STATE.advancedOpen; renderDialog(); };

    // Preset spawn click handlers
    dlg.querySelectorAll('[data-spawn-preset]').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.spawnPreset;
        if (spawnCsnPreset(pid)) closeWorkflow(true);
      };
    });

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

    // Multi-branch controls
    dlg.querySelectorAll('[data-sel-branch]').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('[data-rm-branch]')) return;
        c.activeBranch = Number(el.dataset.selBranch) || 0;
        c.pendingSrc = null;
        renderDialog();
        board && board.redraw();
      };
    });
    dlg.querySelectorAll('[data-rm-branch]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.rmBranch);
        if (c.branches.length > 1) {
          c.branches.splice(idx, 1);
          c.activeBranch = Math.max(0, Math.min(c.activeBranch, c.branches.length - 1));
          c.seedTuples = null;
          syncCfgBranches(c);
          renderDialog();
          board && board.redraw();
        }
      };
    });
    const addBr = dlg.querySelector('[data-act="addBranch"]');
    if (addBr) {
      addBr.onclick = () => {
        if (c.branches.length < 8) {
          c.branches.push([]);
          c.activeBranch = c.branches.length - 1;
          c.pendingSrc = null;
          const cap = maxSafeDepthForCfg(c, false);
          if (c.depth > cap) c.depth = Math.min(cap, 4);
          syncCfgBranches(c);
          renderDialog();
          board && board.redraw();
        }
      };
    }
    const fixPend = dlg.querySelector('[data-act="fixPending"]');
    if (fixPend) {
      fixPend.onclick = () => {
        if (c.pendingSrc) {
          const bIdx = c.activeBranch;
          const filtered = (c.branches[bIdx] || []).filter(p => p[0] !== c.pendingSrc);
          filtered.push([c.pendingSrc, c.pendingSrc]);
          c.branches[bIdx] = filtered;
          c.pendingSrc = null;
          syncCfgBranches(c);
          renderDialog();
          board && board.redraw();
        }
      };
    }
    const leavesChk = dlg.querySelector('#mn-iter-leaves-only');
    if (leavesChk) {
      leavesChk.onchange = () => {
        c.leavesOnly = !!leavesChk.checked;
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { leavesOnly: c.leavesOnly });
        renderDialog();
      };
    }
    const repSrcChk = dlg.querySelector('#mn-iter-replace-src');
    if (repSrcChk) {
      repSrcChk.onchange = () => {
        c.replaceSource = !!repSrcChk.checked;
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { replaceSource: c.replaceSource });
        renderDialog();
      };
    }

    dlg.querySelectorAll('[data-rm-pair]').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.rmPair);
        const bIdx = c.activeBranch;
        c.branches[bIdx] = (c.branches[bIdx] || []).filter((_, i) => i !== idx);
        c.seedTuples = null;
        syncCfgBranches(c);
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
      const cap = maxSafeDepthForCfg(c, false);
      c.depth = Math.max(0, Math.min(cap, Math.round(Number(v) || 0)));
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
        const chk = normalizeIterRatio(c.method, ratIn.value, c.ratio);
        ratIn.title = chk.error;
        ratIn.style.borderColor = chk.error ? '#dc2626' : '';
        ratIn.style.outline = chk.error ? '2px solid rgba(220,38,38,.35)' : '';
        let errEl = ratIn.parentElement && ratIn.parentElement.querySelector('.mn-idlg-ratio-err');
        if (chk.error && !errEl && ratIn.parentElement) {
          errEl = document.createElement('div');
          errEl.className = 'mn-idlg-ratio-err';
          errEl.setAttribute('role', 'alert');
          errEl.style.cssText = 'color:#dc2626;font-size:11px;margin-top:3px;flex-basis:100%';
          ratIn.parentElement.appendChild(errEl);
        }
        if (errEl) errEl.textContent = chk.error;
        if (chk.error) {
          ratIn.value = fmtViNum(c.ratio, 2);
          return;
        }
        c.ratio = chk.value;
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
      c.depth = Math.max(0, Math.min(40, Math.round(evalLinkedParam(getKernel(), geo, p.id, p.value))));
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

    const clipChk = dlg.querySelector('#mn-iter-clip-on');
    if (clipChk) {
      clipChk.onchange = () => {
        c.clipEnabled = !!clipChk.checked;
        STATE.clipUserTouched = true;
        renderDialog();
        if (STATE.editingIterId) rebuildIteration(STATE.pageIdx, STATE.editingIterId, { clipEnabled: c.clipEnabled, clipSeg: c.clipSeg, clipShapeId: c.clipShapeId });
        board && board.redraw();
      };
    }
    const pickBBtn = dlg.querySelector('[data-act="pickBound"]');
    if (pickBBtn) {
      pickBBtn.onclick = () => {
        STATE.pickingBound = !STATE.pickingBound;
        renderDialog();
        board && board.redraw();
      };
    }

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
      // Live Stage-1 hover highlight so users immediately see which object will be selected!
      scrollerBound.addEventListener('pointermove', (me) => {
        if (!STATE.active || STATE.stage !== 1 || STATE.marquee) return;
        const b = getBoard(), K = getKernel();
        if (!b || !K || !b.doc || !b.doc.pages[STATE.pageIdx]) return;
        const ep = b.eventPoint(me);
        const dp = b.toDoc(ep.sx, ep.sy);
        const pt = b.toPage(dp, STATE.pageIdx);
        const pg = b.doc.pages[STATE.pageIdx];
        const coords = K.Tt(pg.geo);
        const tol = Math.max(14 / (b.zoom || 1), typeof b.tol === 'function' ? b.tol() : 12);
        const avail = pg.geo.shapes.filter(s => s && !s.hidden && !s._iterId);
        const hit = (typeof K.$0 === 'function' ? K.$0(avail, coords, pt, tol, false) : null) ||
          (typeof K._mnFilledPolyAt === 'function' ? K._mnFilledPolyAt(avail, coords, pt, false) : null);
        const nextId = hit ? hit.id : null;
        if (nextId !== STATE.hoverShapeId) {
          STATE.hoverShapeId = nextId;
          b.redraw();
        }
      }, { passive: true });
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
        const isSel = STATE.selectedBadgeKey === key || STATE.editingIterId === it.id;
        const showAng = it.method === 'rotate' || (it.method === 'dilate' && Math.abs(Number(it.angle) || 0) > 1e-4);
        const showRatio = it.method === 'dilate' || (it.method === 'translate' && Math.abs((Number(it.ratio) || 1) - 1) > 1e-4);
        const structSig = `${isSel ? 'S' : 'I'}|${it.varName}|${it.method}|${showAng ? 1 : 0}|${showRatio ? 1 : 0}|${it.depthParamId || ''}`;
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'mn-iter-badge';
          badge.dataset.key = key;
          badge.dataset.page = String(pIdx);
          badge.dataset.iterId = it.id;
          badge.addEventListener('pointerdown', e => e.stopPropagation());
          attachBadgeDrag(badge, pIdx, it.id, key);
          badge.addEventListener('mouseenter', () => {
            if (STATE.selectedBadgeKey === key) {
              STATE.highlightedIterId = it.id;
              ed.redraw();
            }
          });
          badge.addEventListener('mouseleave', () => {
            if (STATE.highlightedIterId === it.id && STATE.selectedBadgeKey !== key) {
              STATE.highlightedIterId = null;
              ed.redraw();
            }
          });
          layer.appendChild(badge);
        }

        badge.dataset.theme = it.theme || 'pink';
        badge.classList.toggle('selected', isSel);
        badge.style.left = `${Math.round(pos.sx - sr.left)}px`;
        badge.style.top = `${Math.round(pos.sy - sr.top)}px`;
        badge.style.transform = `scale(${Math.max(0.72, Math.min(1.35, pos.zoom))})`;

        // Rebuild DOM structure ONLY when switching Idle <-> Selected or structural change; update values in-place at 60fps!
        if (badge.dataset.structSig !== structSig) {
          badge.dataset.structSig = structSig;
          if (isSel) populateBadgeContent(badge, pIdx, it, isAnim);
          else populateBadgeIdle(badge, it, isAnim);
        } else {
          if (isSel) updateBadgeValuesInPlace(badge, it, isAnim);
          else updateBadgeIdleInPlace(badge, it, isAnim);
        }
      });
    });

    layer.querySelectorAll('.mn-iter-badge').forEach(el => {
      if (!keepKeys.has(el.dataset.key)) el.remove();
    });
  }

  function idleTexForIter(it) {
    const varTex = texForVar(it.varName || 'n_1');
    const parts = [`${varTex} = ${it.depth}`];
    if (it.method === 'rotate' || (it.method === 'dilate' && Math.abs(Number(it.angle) || 0) > 1e-4)) {
      parts.push(`\\alpha = ${fmtViNum(it.angle, 1).replace(',', '{,}')}^\\circ`);
    }
    if (it.method === 'dilate' || (it.method === 'translate' && Math.abs((Number(it.ratio) || 1) - 1) > 1e-4)) {
      parts.push(`k = ${fmtViNum(it.ratio, 2).replace(',', '{,}')}`);
    }
    return parts.join(',\\; ');
  }

  function populateBadgeIdle(badge, it, isAnim) {
    badge.title = 'Bấm vào để chỉnh số liệu phép lặp • Kéo để di chuyển';
    badge.innerHTML = `${isAnim ? '<span class="mn-iter-anim-dot"></span>' : ''}<span class="mn-iter-idle-math"></span>`;
    const sp = badge.querySelector('.mn-iter-idle-math');
    renderKatex(sp, idleTexForIter(it), `${it.varName || 't_1'} = ${it.depth}`);
  }

  function updateBadgeIdleInPlace(badge, it, isAnim) {
    const sp = badge.querySelector('.mn-iter-idle-math');
    if (sp) renderKatex(sp, idleTexForIter(it), `${it.varName || 't_1'} = ${it.depth}`);
    const dot = badge.querySelector('.mn-iter-anim-dot');
    if (isAnim && !dot) {
      const d = document.createElement('span');
      d.className = 'mn-iter-anim-dot';
      badge.insertBefore(d, badge.firstChild);
    } else if (!isAnim && dot) {
      dot.remove();
    }
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

    const liveCapInit = maxSafeDepthForCfg(it, true);
    let html = `
      <span class="mn-iter-chip-group">
        <span class="mn-iter-katex-lbl" data-tex="${escapeHtml(varTex)} ="></span>
        <span class="mn-iter-val-box">
          <button type="button" class="mn-iter-step-btn" data-bstep="-1" title="Giảm số lần lặp">−</button>
          <input type="text" class="mn-iter-val-input" data-bfield="depth" value="${escapeHtml(String(it.depth))}" title="Nhập số lần lặp (0–${liveCapInit}) — đồng bộ 2 chiều với bảng Tham số" />
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
        const cap = maxSafeDepthForCfg(live, true);
        const delta = Number(btn.dataset.bstep);
        rebuildIteration(pageIdx, live.id, { depth: Math.max(0, Math.min(cap, (Number(live.depth) || 0) + delta)) });
      };
    });

    // Direct editable inputs (Enter or blur applies immediately!)
    badge.querySelectorAll('input[data-bfield]').forEach(inp => {
      inp.addEventListener('pointerdown', e => e.stopPropagation());
      const commitVal = () => {
        const live = getLiveIt();
        const cap = maxSafeDepthForCfg(live, true);
        const field = inp.dataset.bfield;
        if (field === 'depth') {
          const v = Math.max(0, Math.min(cap, Math.round(parseViNum(inp.value, live.depth))));
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
        const cap = maxSafeDepthForCfg(live, true);
        if (e.key === 'Enter') {
          commitVal();
          inp.blur();
        } else if (e.key === 'ArrowUp' && inp.dataset.bfield === 'depth') {
          e.preventDefault();
          rebuildIteration(pageIdx, live.id, { depth: Math.min(cap, (Number(live.depth) || 0) + 1) });
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

  function attachBadgeDrag(badge, pageIdx, iterId, key) {
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
        if (Math.hypot(dx, dy) > 3) moved = true;
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
        } else {
          // Single click selects badge -> lights up & opens direct numeric controls!
          if (STATE.selectedBadgeKey !== key) {
            STATE.selectedBadgeKey = key;
            STATE.highlightedIterId = iterId;
            syncBadgesNow();
            ed.redraw();
          }
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

  /* ========================== 1-Click Toán 11 CSN & IFS Fractal Presets ========================== */

  const CSN_PRESETS = [
    {
      id: 'sierpinski_tri',
      group: 'ifs',
      name: 'Tam giác Sierpinski',
      badge: '3 nhánh',
      tex: 'q_S = \\tfrac{3}{4}',
      sub: 'SGK Toán 11',
      toast: 'Đã dựng Tam giác Sierpinski (3 nhánh, q_S = 3/4) — kéo A, B hoặc bấm thẻ n để đổi bậc!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><polygon points="18,4 4,31 32,31" fill="#dbeafe" stroke="#2563eb" stroke-width="1.6"/><polygon points="11,17.5 25,17.5 18,31" fill="#fff" stroke="#2563eb" stroke-width="1.2"/><polygon points="14.5,10.7 21.5,10.7 18,17.5" fill="#fff" stroke="#2563eb" stroke-width="0.9"/><polygon points="7.5,24.2 14.5,24.2 11,31" fill="#fff" stroke="#2563eb" stroke-width="0.9"/><polygon points="21.5,24.2 28.5,24.2 25,31" fill="#fff" stroke="#2563eb" stroke-width="0.9"/></svg>'
    },
    {
      id: 'sierpinski_carpet',
      group: 'ifs',
      name: 'Thảm Sierpinski (Chia 9 ô)',
      badge: '8 nhánh',
      tex: 'q_S = \\tfrac{8}{9}',
      sub: 'KNTT Toán 11',
      toast: 'Đã dựng Thảm Sierpinski (8 nhánh, q_S = 8/9) — kéo A, B hoặc bấm thẻ n (0–3)!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><rect x="4" y="4" width="28" height="28" fill="#ccfbf1" stroke="#0f766e" stroke-width="1.6"/><rect x="13.3" y="13.3" width="9.4" height="9.4" fill="#fff" stroke="#0f766e" stroke-width="1.1"/><rect x="7" y="7" width="3" height="3" fill="#fff"/><rect x="16.5" y="7" width="3" height="3" fill="#fff"/><rect x="26" y="7" width="3" height="3" fill="#fff"/><rect x="7" y="16.5" width="3" height="3" fill="#fff"/><rect x="26" y="16.5" width="3" height="3" fill="#fff"/><rect x="7" y="26" width="3" height="3" fill="#fff"/><rect x="16.5" y="26" width="3" height="3" fill="#fff"/><rect x="26" y="26" width="3" height="3" fill="#fff"/></svg>'
    },
    {
      id: 'koch_snowflake',
      group: 'ifs',
      name: 'Bông tuyết Von Koch',
      badge: '4 nhánh',
      tex: 'p_n = 3a(\\tfrac{4}{3})^n',
      sub: 'S = 8/5 S₀',
      toast: 'Đã dựng Bông tuyết Von Koch (4 nhánh × 3 cạnh) — bấm thẻ n (0–4) để xem tăng bậc!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><polygon points="18,3 22,11 31,11 26.5,18 31,25 22,25 18,33 14,25 5,25 9.5,18 5,11 14,11" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'pythagoras_tree',
      group: 'ifs',
      name: 'Cây Pythagoras (Nhị phân)',
      badge: '2 nhánh',
      tex: 'q_S = \\tfrac{1}{2}',
      sub: 'Định lý Pitago',
      toast: 'Đã dựng Cây Pythagoras (2 nhánh vuông) — kéo gốc A, B hoặc bấm thẻ n để cây mọc tán!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><rect x="13" y="22" width="10" height="10" fill="#fef3c7" stroke="#92400e" stroke-width="1.4"/><polygon points="13,22 6,15 13,8 20,15" fill="#dcfce7" stroke="#15803d" stroke-width="1.2"/><polygon points="23,22 30,15 23,8 16,15" fill="#d1fae5" stroke="#047857" stroke-width="1.2"/></svg>'
    },
    {
      id: 'semicircle_spiral',
      group: 'csn',
      name: 'Xoắn ốc nửa đường tròn CSN',
      badge: 'CSN',
      tex: 'R_{n+1} = q R_n',
      sub: 'Cung tiếp xúc',
      toast: 'Đã dựng Xoắn ốc nửa đường tròn CSN (q = 0,72) — kéo A_0, A_1 hoặc bấm thẻ n!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><line x1="4" y1="20" x2="32" y2="20" stroke="#94a3b8" stroke-dasharray="2 2"/><path d="M5,20 A13,13 0 0 1 31,20 A9.5,9.5 0 0 1 12,20 A6.5,6.5 0 0 1 25,20 A4,4 0 0 1 17,20" stroke="#db2777" stroke-width="1.8" stroke-linecap="round"/></svg>'
    },
    {
      id: 'nested_squares',
      group: 'csn',
      name: 'Hình vuông xoay lồng nhau',
      badge: 'CSN',
      tex: 'q_S = \\tfrac{1}{2}',
      sub: 'Trung điểm cạnh',
      toast: 'Đã dựng Hình vuông xoay lồng nhau (q_S = 1/2, S_∞ = 2S_1) — kéo A, B hoặc bấm thẻ n!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><rect x="5" y="5" width="26" height="26" fill="#eef2ff" stroke="#4f46e5" stroke-width="1.4"/><polygon points="18,5 31,18 18,31 5,18" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1.3"/><rect x="11.5" y="11.5" width="13" height="13" fill="#c7d2fe" stroke="#4f46e5" stroke-width="1.2"/><polygon points="18,11.5 24.5,18 18,24.5 11.5,18" fill="#fff" stroke="#4f46e5" stroke-width="1"/></svg>'
    },
    {
      id: 'tangent_circles_angle',
      group: 'csn',
      name: 'Chuỗi đường tròn trong góc',
      badge: 'CSN',
      tex: 'q = \\tfrac{1-\\sin\\alpha}{1+\\sin\\alpha}',
      sub: 'Tiếp xúc 2 tia',
      toast: 'Đã dựng Chuỗi đường tròn tiếp xúc trong góc nhọn — kéo tia OA, OB để đổi góc α trực tiếp!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><line x1="4" y1="18" x2="33" y2="7" stroke="#334155" stroke-width="1.5"/><line x1="4" y1="18" x2="33" y2="29" stroke="#334155" stroke-width="1.5"/><circle cx="25" cy="18" r="6.5" fill="#cffafe" stroke="#0891b2" stroke-width="1.4"/><circle cx="15" cy="18" r="3.6" fill="#cffafe" stroke="#0891b2" stroke-width="1.3"/><circle cx="9.6" cy="18" r="2" fill="#cffafe" stroke="#0891b2" stroke-width="1.1"/></svg>'
    },
    {
      id: 'zigzag_perp_angle',
      group: 'csn',
      name: 'Đường gấp khúc vuông góc',
      badge: 'CSN',
      tex: 'q = \\cos\\theta',
      sub: 'Chiếu vuông góc',
      toast: 'Đã dựng Đường gấp khúc vuông góc trong góc nhọn — kéo A, B để đổi góc θ và q = cos θ!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><line x1="4" y1="29" x2="32" y2="29" stroke="#334155" stroke-width="1.5"/><line x1="4" y1="29" x2="30" y2="7" stroke="#334155" stroke-width="1.5"/><polyline points="28,9 28,29 19,17 19,29 13,21 13,29" stroke="#e11d48" stroke-width="1.5" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'right_angle_spiral',
      group: 'csn',
      name: 'Xoắn ốc vuông góc CSN',
      badge: 'CSN',
      tex: 'A_nA_{n+1} = a q^n',
      sub: 'Quay 90° liên tiếp',
      toast: 'Đã dựng Xoắn ốc vuông góc CSN (q = 0,78) — kéo O, A_1 hoặc bấm thẻ n!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><polyline points="5,29 30,29 30,9 12,9 12,24 25,24 25,14 16,14 16,20" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'bouncing_ball',
      group: 'csn',
      name: 'Quả bóng nảy Parabol CSN',
      badge: 'CSN',
      tex: 'h_{n+1} = q h_n',
      sub: 'Tổng quãng đường',
      toast: 'Đã dựng Quả bóng nảy Parabol CSN (q = 0,72) — kéo A_0, A_1 hoặc bấm thẻ n!',
      svg: '<svg viewBox="0 0 36 36" fill="none"><line x1="3" y1="30" x2="33" y2="30" stroke="#334155" stroke-width="1.5"/><path d="M5,30 Q10.5,6 16,30 Q20,13 24,30 Q26.8,18 29.5,30 Q31.2,22 33,30" stroke="#ea580c" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>'
    }
  ];

  function spawnCsnPreset(presetId, opts) {
    const board = getBoard();
    const K = getKernel();
    const meta = CSN_PRESETS.find(p => p.id === presetId);
    if (!board || !K || !meta || !board.doc || !board.doc.pages) return false;

    const pIdx = (opts && Number.isInteger(opts.pageIdx))
      ? opts.pageIdx
      : (typeof board.currentPage === 'function' ? board.currentPage() : (STATE.pageIdx || 0));
    const pg0 = board.doc.pages[pIdx];
    if (!pg0) return false;

    const pgW = Number(pg0.w) || 794;
    const pgH = Number(pg0.h) || 1123;
    const sc = (opts && Number(opts.scale)) || 1;
    let cx = (opts && Number.isFinite(opts.cx)) ? opts.cx : (pgW * 0.5);
    let cy = (opts && Number.isFinite(opts.cy)) ? opts.cy : (pgH * 0.42);

    // If user viewport is scrolled, default cleanly inside the visible page center
    if (!(opts && (Number.isFinite(opts.cx) || Number.isFinite(opts.cy))) && board.scroller && typeof board.toDoc === 'function' && typeof board.toPage === 'function') {
      try {
        const sr = board.scroller.getBoundingClientRect();
        const midDoc = board.toDoc(sr.width * 0.5, sr.height * 0.48);
        const midPg = board.toPage(midDoc, pIdx);
        if (midPg && Number.isFinite(midPg.x) && Number.isFinite(midPg.y)) {
          cx = Math.max(240, Math.min(pgW - 240, midPg.x));
          cy = Math.max(230, Math.min(pgH - 230, midPg.y));
        }
      } catch (_) {}
    }

    let createdIterId = null;

    board.commit(board.updatePage(pIdx, pg => {
      const baseGeo = (opts && opts.clearPage)
        ? { points: {}, shapes: [], params: [], iterations: [] }
        : (pg.geo || { points: {}, shapes: [] });
      const points = { ...(baseGeo.points || {}) };
      const shapes = Array.isArray(baseGeo.shapes) ? baseGeo.shapes.slice() : [];
      const params = Array.isArray(baseGeo.params) ? baseGeo.params.slice() : [];
      const iterations = Array.isArray(baseGeo.iterations) ? baseGeo.iterations.slice() : [];

      const addPt = (def, label, show) => {
        const id = K.nt();
        points[id] = {
          id,
          def,
          label: label || '',
          show: !!show,
          noName: !show || !label
        };
        return id;
      };
      const addSh = (kind, pts, extra) => {
        const id = K.nt();
        shapes.push({
          id,
          kind,
          pts,
          color: '#1e293b',
          width: 2,
          ...(extra || {})
        });
        return id;
      };

      let iterCfg = null;
      let badgePos = { x: Math.max(28, cx - 220 * sc), y: Math.max(36, cy - 205 * sc) };

      if (presetId === 'sierpinski_tri') {
        const L = 340 * sc;
        const A = addPt({ t: 'free', x: cx - L / 2, y: cy + L * 0.36 }, 'A', true);
        const B = addPt({ t: 'free', x: cx + L / 2, y: cy + L * 0.36 }, 'B', true);
        const C = addPt({ t: 'rot', c: A, p: B, ang: -60, k: 1 }, 'C', true);
        const M1 = addPt({ t: 'mid', a: A, b: B }, 'M_1', false);
        const M2 = addPt({ t: 'mid', a: B, b: C }, 'M_2', false);
        const M3 = addPt({ t: 'mid', a: C, b: A }, 'M_3', false);
        addSh('polygon', [A, B, C], { color: '#1d4ed8', fill: 'rgba(37, 99, 235, 0.22)', width: 2 });
        const cut = addSh('polygon', [M1, M2, M3], { color: '#2563eb', fill: '#ffffff', width: 1.2 });
        badgePos = { x: Math.max(28, cx - L * 0.52), y: Math.max(36, cy - L * 0.56) };
        iterCfg = {
          method: 'map',
          depth: 4,
          scopeShapeIds: [cut],
          branches: [
            [[A, A], [B, M1], [C, M3]],
            [[A, M1], [B, B], [C, M2]],
            [[A, M3], [B, M2], [C, C]]
          ],
          theme: 'blue'
        };
      } else if (presetId === 'sierpinski_carpet') {
        const L = 300 * sc;
        const A = addPt({ t: 'free', x: cx - L / 2, y: cy - L / 2 }, 'A', true);
        const B = addPt({ t: 'free', x: cx + L / 2, y: cy - L / 2 }, 'B', true);
        const C = addPt({ t: 'rot', c: B, p: A, ang: -90, k: 1 }, 'C', true);
        const D = addPt({ t: 'sum', a: A, b: C, c: B }, 'D', true);
        const T1 = addPt({ t: 'on', a: A, b: B, k: 1 / 3 }, 'T_1', false);
        const T2 = addPt({ t: 'on', a: A, b: B, k: 2 / 3 }, 'T_2', false);
        const L1 = addPt({ t: 'on', a: A, b: D, k: 1 / 3 }, 'L_1', false);
        const L2 = addPt({ t: 'on', a: A, b: D, k: 2 / 3 }, 'L_2', false);
        const R1 = addPt({ t: 'on', a: B, b: C, k: 1 / 3 }, 'R_1', false);
        const R2 = addPt({ t: 'on', a: B, b: C, k: 2 / 3 }, 'R_2', false);
        const P11 = addPt({ t: 'on', a: L1, b: R1, k: 1 / 3 }, 'P_1', false);
        const P12 = addPt({ t: 'on', a: L1, b: R1, k: 2 / 3 }, 'P_2', false);
        const P21 = addPt({ t: 'on', a: L2, b: R2, k: 1 / 3 }, 'P_3', false);
        const P22 = addPt({ t: 'on', a: L2, b: R2, k: 2 / 3 }, 'P_4', false);
        addSh('polygon', [A, B, C, D], { color: '#0f766e', fill: 'rgba(13, 148, 136, 0.24)', width: 2 });
        const cut = addSh('polygon', [P11, P12, P22, P21], { color: '#0f766e', fill: '#ffffff', width: 1.1 });
        badgePos = { x: Math.max(28, cx - L * 0.5), y: Math.max(36, cy - L * 0.5 - 46) };
        iterCfg = {
          method: 'map',
          depth: 2,
          scopeShapeIds: [cut],
          branches: [
            [[A, A], [B, T1]],
            [[A, T1], [B, T2]],
            [[A, T2], [B, B]],
            [[A, L1], [B, P11]],
            [[A, P12], [B, R1]],
            [[A, L2], [B, P21]],
            [[A, P21], [B, P22]],
            [[A, P22], [B, R2]]
          ],
          theme: 'emerald'
        };
      } else if (presetId === 'koch_snowflake') {
        const L = 290 * sc;
        const A = addPt({ t: 'free', x: cx - L / 2, y: cy + L * 0.25 }, 'A', true);
        const B = addPt({ t: 'free', x: cx + L / 2, y: cy + L * 0.25 }, 'B', true);
        const C = addPt({ t: 'rot', c: A, p: B, ang: -60, k: 1 }, 'C', true);
        const P1 = addPt({ t: 'on', a: A, b: B, k: 1 / 3 }, 'P_1', false);
        const P2 = addPt({ t: 'on', a: A, b: B, k: 2 / 3 }, 'P_2', false);
        const Q = addPt({ t: 'rot', c: P1, p: P2, ang: 60, k: 1 }, 'Q', false);
        const segAB = addSh('segment', [A, B], { color: '#0284c7', width: 1.8 });
        const segBC = addSh('segment', [B, C], { color: '#0284c7', width: 1.8 });
        const segCA = addSh('segment', [C, A], { color: '#0284c7', width: 1.8 });
        badgePos = { x: Math.max(28, cx - L * 0.58), y: Math.max(36, cy - L * 0.65) };
        iterCfg = {
          method: 'map',
          depth: 3,
          leavesOnly: true,
          replaceSource: true,
          scopeShapeIds: [segAB, segBC, segCA],
          seedTuples: [[A, B], [B, C], [C, A]],
          branches: [
            [[A, A], [B, P1]],
            [[A, P1], [B, Q]],
            [[A, Q], [B, P2]],
            [[A, P2], [B, B]]
          ],
          theme: 'blue'
        };
      } else if (presetId === 'pythagoras_tree') {
        const L = 76 * sc;
        const A = addPt({ t: 'free', x: cx - L / 2, y: cy + 165 * sc }, 'A', true);
        const B = addPt({ t: 'free', x: cx + L / 2, y: cy + 165 * sc }, 'B', true);
        const D = addPt({ t: 'rot', c: A, p: B, ang: -90, k: 1 }, 'D', false);
        const C = addPt({ t: 'sum', a: B, b: D, c: A }, 'C', false);
        const E = addPt({ t: 'rot', c: D, p: C, ang: -45, k: Math.SQRT1_2 }, 'E', false);
        const trunk = addSh('polygon', [A, B, C, D], { color: '#92400e', fill: 'rgba(180, 83, 9, 0.24)', width: 1.5 });
        badgePos = { x: Math.max(28, cx - 220 * sc), y: Math.max(36, cy - 175 * sc) };
        iterCfg = {
          method: 'map',
          depth: 6,
          scopeShapeIds: [trunk],
          branches: [
            [[A, D], [B, E]],
            [[A, E], [B, C]]
          ],
          stepColors: ['#92400e', '#a16207', '#65a30d', '#16a34a', '#059669', '#0d9488', '#047857', '#065f46'],
          stepFills: [
            'rgba(180,83,9,0.24)',
            'rgba(161,98,7,0.22)',
            'rgba(101,163,13,0.22)',
            'rgba(22,163,74,0.22)',
            'rgba(5,150,105,0.24)',
            'rgba(13,148,136,0.24)',
            'rgba(16,185,129,0.26)',
            'rgba(4,120,87,0.28)'
          ],
          theme: 'emerald'
        };
      } else if (presetId === 'semicircle_spiral') {
        const R = 165 * sc;
        const P0 = addPt({ t: 'free', x: cx - R, y: cy + 25 * sc }, 'A_0', true);
        const P1 = addPt({ t: 'free', x: cx + R, y: cy + 25 * sc }, 'A_1', true);
        const O1 = addPt({ t: 'mid', a: P0, b: P1 }, '', false);
        const P2 = addPt({ t: 'on', a: P1, b: P0, k: 0.72 }, 'A_2', true);
        addSh('segment', [P0, P1], { color: '#94a3b8', width: 1.3, dashed: true });
        const arc1 = addSh('arc', [O1, P0, P1], { color: '#db2777', width: 2.3, cw: true });
        badgePos = { x: Math.max(28, cx - R), y: Math.max(36, cy - R - 26) };
        iterCfg = {
          method: 'map',
          depth: 7,
          scopeShapeIds: [arc1],
          pairs: [[P0, P1], [P1, P2]],
          theme: 'pink'
        };
      } else if (presetId === 'nested_squares') {
        const L = 290 * sc;
        const A = addPt({ t: 'free', x: cx - L / 2, y: cy - L / 2 }, 'A', true);
        const B = addPt({ t: 'free', x: cx + L / 2, y: cy - L / 2 }, 'B', true);
        const C = addPt({ t: 'rot', c: B, p: A, ang: -90, k: 1 }, 'C', true);
        const D = addPt({ t: 'sum', a: A, b: C, c: B }, 'D', true);
        const A1 = addPt({ t: 'mid', a: A, b: B }, 'A_1', false);
        const B1 = addPt({ t: 'mid', a: B, b: C }, 'B_1', false);
        const sq0 = addSh('polygon', [A, B, C, D], { color: '#4f46e5', fill: 'rgba(99, 102, 241, 0.11)', width: 1.8 });
        badgePos = { x: Math.max(28, cx - L * 0.5), y: Math.max(36, cy - L * 0.5 - 46) };
        iterCfg = {
          method: 'map',
          depth: 8,
          scopeShapeIds: [sq0],
          pairs: [[A, A1], [B, B1]],
          theme: 'violet'
        };
      } else if (presetId === 'tangent_circles_angle') {
        const O = addPt({ t: 'free', x: cx - 220 * sc, y: cy }, 'O', true);
        const A = addPt({ t: 'free', x: cx + 220 * sc, y: cy - 140 * sc }, 'A', true);
        const B = addPt({ t: 'free', x: cx + 220 * sc, y: cy + 140 * sc }, 'B', true);
        const Bbis = addPt({ t: 'bis', a: A, o: O, b: B }, '', false);
        const I1 = addPt({ t: 'on', a: O, b: Bbis, k: 0.78 }, 'I_1', true);
        const T1 = addPt({ t: 'foot', p: I1, a: O, b: A }, '', false);
        const K1 = addPt({ t: 'inter', l1: [O, I1], c1: false, l2: [I1, T1], c2: true, which: 0 }, '', false);
        const K1p = addPt({ t: 'rot', c: K1, p: I1, ang: 90, k: 1 }, '', false);
        const Q1 = addPt({ t: 'inter', l1: [K1, K1p], c1: false, l2: [O, A], c2: false, which: 0 }, '', false);
        const Q1b = addPt({ t: 'bis', a: O, o: Q1, b: K1 }, '', false);
        const I2 = addPt({ t: 'inter', l1: [O, I1], c1: false, l2: [Q1, Q1b], c2: false, which: 0 }, 'I_2', false);
        addSh('segment', [O, A], { color: '#334155', width: 2 });
        addSh('segment', [O, B], { color: '#334155', width: 2 });
        addSh('segment', [O, Bbis], { color: '#94a3b8', width: 1.2, dashed: true });
        const c1 = addSh('circle', [I1, T1], { color: '#0891b2', fill: 'rgba(6, 182, 212, 0.14)', width: 2 });
        badgePos = { x: Math.max(28, cx - 220 * sc), y: Math.max(36, cy - 165 * sc) };
        iterCfg = {
          method: 'map',
          depth: 6,
          scopeShapeIds: [c1],
          pairs: [[I1, I2]],
          theme: 'blue'
        };
      } else if (presetId === 'zigzag_perp_angle') {
        const O = addPt({ t: 'free', x: cx - 205 * sc, y: cy + 100 * sc }, 'O', true);
        const B = addPt({ t: 'free', x: cx + 215 * sc, y: cy + 100 * sc }, 'B', true);
        const A = addPt({ t: 'free', x: cx + 185 * sc, y: cy - 150 * sc }, 'A', true);
        const P1 = addPt({ t: 'foot', p: A, a: O, b: B }, 'A_1', true);
        const P2 = addPt({ t: 'foot', p: P1, a: O, b: A }, 'A_2', true);
        addSh('segment', [O, A], { color: '#334155', width: 2 });
        addSh('segment', [O, B], { color: '#334155', width: 2 });
        const s1 = addSh('segment', [A, P1], { color: '#e11d48', width: 2 });
        const s2 = addSh('segment', [P1, P2], { color: '#2563eb', width: 2 });
        const r1 = addSh('right', [A, P1, O], { color: '#e11d48', width: 1.3 });
        const r2 = addSh('right', [P1, P2, O], { color: '#2563eb', width: 1.3 });
        badgePos = { x: Math.max(28, cx - 205 * sc), y: Math.max(36, cy - 165 * sc) };
        iterCfg = {
          method: 'map',
          depth: 6,
          scopeShapeIds: [s1, s2, r1, r2],
          pairs: [[A, P2]],
          theme: 'pink'
        };
      } else if (presetId === 'right_angle_spiral') {
        const O = addPt({ t: 'free', x: cx - 115 * sc, y: cy + 105 * sc }, 'O', true);
        const A1 = addPt({ t: 'free', x: cx + 135 * sc, y: cy + 105 * sc }, 'A_1', true);
        const A2 = addPt({ t: 'rot', c: A1, p: O, ang: 90, k: 0.78 }, 'A_2', true);
        const seg0 = addSh('segment', [O, A1], { color: '#7c3aed', width: 2.3 });
        const ra0 = addSh('right', [O, A1, A2], { color: '#7c3aed', width: 1.3 });
        badgePos = { x: Math.max(28, cx - 140 * sc), y: Math.max(36, cy - 155 * sc) };
        iterCfg = {
          method: 'map',
          depth: 10,
          scopeShapeIds: [seg0, ra0],
          pairs: [[O, A1], [A1, A2]],
          theme: 'violet'
        };
      } else if (presetId === 'bouncing_ball') {
        const yFloor = cy + 115 * sc;
        const G0 = addPt({ t: 'free', x: cx - 255 * sc, y: yFloor }, '', false);
        const G1 = addPt({ t: 'free', x: cx + 255 * sc, y: yFloor }, '', false);
        const B0 = addPt({ t: 'free', x: cx - 235 * sc, y: yFloor }, 'A_0', true);
        const B1 = addPt({ t: 'free', x: cx - 105 * sc, y: yFloor }, 'A_1', true);
        const M1 = addPt({ t: 'mid', a: B0, b: B1 }, '', false);
        const V1 = addPt({ t: 'rot', c: M1, p: B1, ang: -90, k: 2.65 }, 'H_1', true);
        const B2 = addPt({ t: 'vec', o: B1, a: B0, b: B1, k: 0.72, perp: false }, 'A_2', true);
        addSh('segment', [G0, G1], { color: '#334155', width: 2.2 });
        const arch1 = addSh('parabola', [V1, M1, B1], { color: '#ea580c', width: 2.3 });
        const h1 = addSh('segment', [M1, V1], { color: '#94a3b8', width: 1.2, dashed: true });
        badgePos = { x: Math.max(28, cx - 245 * sc), y: Math.max(36, cy - 125 * sc) };
        iterCfg = {
          method: 'map',
          depth: 6,
          scopeShapeIds: [arch1, h1],
          pairs: [[B0, B1], [B1, B2]],
          theme: 'pink'
        };
      }

      if (!iterCfg) return pg;

      const iterId = 'iter_' + K.nt();
      createdIterId = iterId;
      const varName = nextVarName({ iterations }, 'map');
      const dCap = maxSafeDepthForCfg(iterCfg, false);
      const paramId = 'pm_' + K.nt();
      params.push({
        id: paramId,
        name: varName,
        value: iterCfg.depth,
        unit: 'none',
        min: 0,
        max: Math.min(dCap, Math.max(iterCfg.depth, dCap < 12 ? dCap : 12)),
        step: 1,
        expr: '',
        animating: false,
        animDir: 1,
        x: Math.round(badgePos.x),
        y: Math.round(badgePos.y),
        _iterBadgeOwner: iterId
      });

      const finalDef = {
        id: iterId,
        varName,
        method: iterCfg.method,
        depth: iterCfg.depth,
        angle: 0,
        ratio: 0.5,
        scopeShapeIds: iterCfg.scopeShapeIds.slice(),
        pairs: iterCfg.branches ? iterCfg.branches[0].map(p => [p[0], p[1]]) : iterCfg.pairs.map(p => [p[0], p[1]]),
        branches: iterCfg.branches ? iterCfg.branches.map(b => b.map(p => [p[0], p[1]])) : undefined,
        leavesOnly: !!iterCfg.leavesOnly,
        replaceSource: !!iterCfg.replaceSource,
        seedTuples: iterCfg.seedTuples ? iterCfg.seedTuples.map(t => t.slice()) : undefined,
        stepColors: iterCfg.stepColors ? iterCfg.stepColors.slice() : undefined,
        stepFills: iterCfg.stepFills ? iterCfg.stepFills.slice() : undefined,
        centerId: null,
        vecA: null,
        vecB: null,
        clipEnabled: false,
        clipSeg: null,
        clipShapeId: null,
        hideIterDots: true,
        showBadge: true,
        theme: iterCfg.theme || 'blue',
        depthParamId: paramId,
        angleParamId: null,
        ratioParamId: null,
        presetId,
        x: Math.round(badgePos.x),
        y: Math.round(badgePos.y)
      };

      const preGeo = { ...baseGeo, points, shapes, params, iterations };
      const res = buildScopedIteration(preGeo, finalDef, K.nt);
      const merged = mergeIterResult(preGeo, finalDef, res);
      return {
        ...pg,
        geo: {
          ...merged,
          params,
          iterations: [...iterations, finalDef]
        }
      };
    }));

    if (typeof board.setTool === 'function') board.setTool({ k: 'select' });
    board.redraw();
    board.emit();
    notifyParamsStudio();
    scheduleSyncBadges();
    if (!(opts && opts.silent)) showIterToast(meta.toast);
    return createdIterId || true;
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
    STATE.pickingBound = false;
    STATE.clipUserTouched = false;
    STATE.hoverShapeId = null;
    STATE.marquee = null;
    STATE.cfg = {
      method: 'map',
      depth: Number(board.geoIterDepth) || 5,
      angle: 60,
      ratio: 0.5,
      scopeShapeIds: Array.isArray(preselectedShapeIds) ? preselectedShapeIds.slice() : [],
      pairs: [],
      branches: [[]],
      activeBranch: 0,
      leavesOnly: false,
      replaceSource: false,
      seedTuples: null,
      stepFills: null,
      stepColors: null,
      pendingSrc: null,
      centerId: null,
      vecA: null,
      vecB: null,
      clipEnabled: false,
      clipSeg: null,
      clipShapeId: null,
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
    STATE.pickingBound = false;
    STATE.clipUserTouched = true;
    STATE.hoverShapeId = null;
    STATE.marquee = null;
    const loadedBranches = normalizeBranchesRaw(it);
    STATE.cfg = {
      method: it.method || 'map',
      depth: Number.isFinite(Number(it.depth)) ? Number(it.depth) : 5,
      angle: Number(it.angle) || 60,
      ratio: Number.isFinite(Number(it.ratio)) ? Number(it.ratio) : 0.5,
      scopeShapeIds: (it.scopeShapeIds || []).slice(),
      pairs: (loadedBranches[0] || []).map(p => [p[0], p[1]]),
      branches: loadedBranches,
      activeBranch: 0,
      leavesOnly: !!it.leavesOnly,
      replaceSource: !!it.replaceSource,
      seedTuples: Array.isArray(it.seedTuples) ? it.seedTuples.map(t => t.slice()) : null,
      stepFills: Array.isArray(it.stepFills) ? it.stepFills.slice() : null,
      stepColors: Array.isArray(it.stepColors) ? it.stepColors.slice() : null,
      pendingSrc: null,
      centerId: it.centerId || null,
      vecA: it.vecA || null,
      vecB: it.vecB || null,
      clipEnabled: !!it.clipEnabled,
      clipSeg: Array.isArray(it.clipSeg) && it.clipSeg.length === 2 ? it.clipSeg.slice() : null,
      clipShapeId: it.clipShapeId || null,
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
    STATE.pickingBound = false;
    STATE.hoverShapeId = null;
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
  // Click anywhere outside a selected KaTeX badge -> collapse it cleanly back to quiet idle state!
  root.addEventListener('pointerdown', (e) => {
    if (!STATE.selectedBadgeKey) return;
    if (e.target && e.target.closest && e.target.closest('.mn-iter-badge, #mn-iter-dialog')) return;
    STATE.selectedBadgeKey = null;
    STATE.highlightedIterId = null;
    syncBadgesNow();
    const ed = getBoard();
    if (ed) ed.redraw();
  }, true);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.selectedBadgeKey) {
      STATE.selectedBadgeKey = null;
      STATE.highlightedIterId = null;
      syncBadgesNow();
      const ed = getBoard();
      if (ed) ed.redraw();
    }
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
    CSN_PRESETS,
    spawnCsnPreset,
    maxSafeDepthForCfg,
    buildScopedIteration,
    formulaLatexForCfg,
    normalizeIterRatio,
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
