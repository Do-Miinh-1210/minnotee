/**
 * MinNote v0.0.8.0 — Integer-Normalized TikZ Exporter (DoMinhMath / MatrixExamAI Pro v5 Standard)
 *
 * Implements:
 *   1. Optimal Integer Grid Normalization (Z^2 / optional clean 0.5 grid for 3D skew)
 *      with alignment snapping, non-degeneracy checks, and aspect ratio preservation (< 6%)
 *   2. Symbolic TikZ calc / intersection reconstruction for derived points
 *      (mid, foot, on, sum, rot, vec, line-line inter) in topological order
 *   3. Exact 5-Layer DoMinhMath rendering order (fills -> dashed -> solid -> angles/ticks -> points/labels)
 *      including 3D solids & revolution solids (cone, cylinder, sphere, frustumCone, truncCylinder, cap)
 *   4. Smart angular-gap label placement via exact 2-var `\foreach \p/\g`
 *   5. 12-Rule Preflight Validator (`validateTikz`)
 *   6. Rich Studio Modal (Copy, Save .tex, Compile Preview, AI Optimize MEA v5, Push to MEA Figure Bank)
 */
(function (root) {
  'use strict';

  function getBoard() {
    if (typeof window === 'undefined') return null;
    return window.__minnoteBoard || window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || null;
  }

  function toast(msg) {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(msg);
    }
  }

  function escHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  // ============================================================================
  // 1. STANDALONE GEOMETRY EVALUATOR (Works in both Browser & Node.js)
  // ============================================================================
  function dist2(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function evalDef(def, getPt, geo) {
    if (!def || !def.t) return null;
    switch (def.t) {
      case 'free':
        return Number.isFinite(def.x) && Number.isFinite(def.y) ? { x: def.x, y: def.y } : null;
      case 'mid': {
        const a = getPt(def.a), b = getPt(def.b);
        return a && b ? { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 } : null;
      }
      case 'foot': {
        const p = getPt(def.p), a = getPt(def.a), b = getPt(def.b);
        if (!p || !a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1e-12) return { x: a.x, y: a.y };
        const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2;
        return { x: a.x + dx * t, y: a.y + dy * t };
      }
      case 'sum': {
        const a = getPt(def.a), b = getPt(def.b), c = getPt(def.c);
        return a && b && c ? { x: a.x + b.x - c.x, y: a.y + b.y - c.y } : null;
      }
      case 'rot': {
        const c = getPt(def.c), p = getPt(def.p);
        if (!c || !p) return null;
        const ang = (def.ang || 0) * Math.PI / 180;
        const k = def.k != null ? def.k : 1;
        const dx = p.x - c.x, dy = p.y - c.y;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        return { x: c.x + (dx * cs - dy * sn) * k, y: c.y + (dx * sn + dy * cs) * k };
      }
      case 'vec': {
        const o = getPt(def.o), a = getPt(def.a), b = getPt(def.b);
        if (!o || !a || !b) return null;
        let dx = b.x - a.x, dy = b.y - a.y;
        if (def.perp) { const t = dx; dx = dy; dy = -t; }
        if (def.distVal != null) {
          const len = Math.hypot(dx, dy);
          if (len < 1e-12) return { x: o.x, y: o.y };
          const dPx = def.distVal * ((geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559);
          return { x: o.x + dx * dPx / len, y: o.y + dy * dPx / len };
        }
        const k = def.k != null ? def.k : 1;
        return { x: o.x + dx * k, y: o.y + dy * k };
      }
      case 'on': {
        const a = getPt(def.a), b = getPt(def.b);
        if (!a || !b) return null;
        let k = def.k != null ? def.k : 0.5;
        if (def.seg) k = Math.max(0, Math.min(1, k));
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
      case 'len': {
        const a = getPt(def.a);
        if (!a) return null;
        const dPx = Math.max(1e-3, (def.val != null ? def.val : 2) * ((geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559));
        const ang = def.ang || 0;
        return { x: a.x + dPx * Math.cos(ang), y: a.y + dPx * Math.sin(ang) };
      }
      case 'polar': {
        const o = getPt(def.o), r = getPt(def.ref);
        if (!o || !r) return null;
        const base = Math.atan2(r.y - o.y, r.x - o.x);
        const deg = def.fixedAng ? (def.angVal != null ? def.angVal : 60) : (def.curAngDeg != null ? def.curAngDeg : 60);
        const rad = base - deg * Math.PI / 180;
        const dPx = def.fixedDist ? Math.max(1e-3, (def.distVal != null ? def.distVal : 2) * ((geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559)) : Math.max(4, def.curDistPx || 120);
        return { x: o.x + dPx * Math.cos(rad), y: o.y + dPx * Math.sin(rad) };
      }
      case 'inter': {
        if (!def.l1 || !def.l2) return null;
        const p1 = getPt(def.l1[0]), p2 = getPt(def.l1[1]), p3 = getPt(def.l2[0]), p4 = getPt(def.l2[1]);
        if (!p1 || !p2 || !p3 || !p4) return null;
        if (!def.c1 && !def.c2) {
          const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
          const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
          const det = d1x * d2y - d1y * d2x;
          if (Math.abs(det) < 1e-9) return null;
          const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / det;
          return { x: p1.x + d1x * t, y: p1.y + d1y * t };
        }
        const pts = [];
        if (def.c1 && def.c2) {
          const r1 = dist2(p1, p2), r2 = dist2(p3, p4);
          const dx = p3.x - p1.x, dy = p3.y - p1.y, d = Math.hypot(dx, dy);
          if (d > 1e-9 && d <= r1 + r2 + 1e-6 && d >= Math.abs(r1 - r2) - 1e-6) {
            const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
            const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
            const xm = p1.x + a * dx / d, ym = p1.y + a * dy / d;
            pts.push({ x: xm + h * dy / d, y: ym - h * dx / d });
            pts.push({ x: xm - h * dy / d, y: ym + h * dx / d });
          }
        } else {
          const c = def.c1 ? p1 : p3;
          const r = def.c1 ? dist2(p1, p2) : dist2(p3, p4);
          const a = def.c1 ? p3 : p1;
          const b = def.c1 ? p4 : p2;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 > 1e-9) {
            const fx = a.x - c.x, fy = a.y - c.y;
            const B = 2 * (fx * dx + fy * dy);
            const C = fx * fx + fy * fy - r * r;
            const disc = B * B - 4 * d2 * C;
            if (disc >= -1e-6) {
              const s = Math.sqrt(Math.max(0, disc));
              const t1 = (-B - s) / (2 * d2);
              const t2 = (-B + s) / (2 * d2);
              pts.push({ x: a.x + dx * t1, y: a.y + dy * t1 });
              pts.push({ x: a.x + dx * t2, y: a.y + dy * t2 });
            }
          }
        }
        return pts[Math.min(def.which || 0, Math.max(0, pts.length - 1))] || null;
      }
      case 'bis': {
        const a = getPt(def.a), o = getPt(def.o), b = getPt(def.b);
        if (!a || !o || !b) return null;
        const d1 = dist2(a, o), d2 = dist2(b, o);
        if (d1 < 1e-9 || d2 < 1e-9) return null;
        let lx = (a.x - o.x) / d1 + (b.x - o.x) / d2;
        let ly = (a.y - o.y) / d1 + (b.y - o.y) / d2;
        const m = Math.hypot(lx, ly);
        if (m < 1e-9) { lx = (a.y - o.y) / d1; ly = -(a.x - o.x) / d1; }
        else { lx /= m; ly /= m; }
        return { x: o.x + lx * d1, y: o.y + ly * d1 };
      }
      case 'path': {
        if (!Array.isArray(def.pts) || !def.pts.length) return null;
        const ps = def.pts.map(getPt);
        if (ps.some((p) => !p)) return null;
        const kind = def.kind || def.on || 'circle';
        const k = def.k != null ? def.k : 0;
        const rad = (def.angleDeg != null && def.k == null) ? (-def.angleDeg * Math.PI / 180) : (k * Math.PI * 2);
        if (kind === 'circle' && ps.length >= 2) {
          const r = dist2(ps[0], ps[1]);
          return { x: ps[0].x + r * Math.cos(rad), y: ps[0].y + r * Math.sin(rad) };
        }
        if (kind === 'ellipse' && ps.length >= 3) {
          const rx = dist2(ps[0], ps[1]), ry = dist2(ps[0], ps[2]);
          const rot = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
          const lx = rx * Math.cos(rad), ly = ry * Math.sin(rad);
          return {
            x: ps[0].x + lx * Math.cos(rot) - ly * Math.sin(rot),
            y: ps[0].y + lx * Math.sin(rot) + ly * Math.cos(rot)
          };
        }
        return ps[0];
      }
      case 'ctan': {
        if (!def.c1 || !def.c2) return null;
        const p1 = getPt(def.c1[0]), p2 = getPt(def.c1[1]), p3 = getPt(def.c2[0]), p4 = getPt(def.c2[1]);
        if (!p1 || !p2 || !p3 || !p4) return null;
        const r1 = dist2(p1, p2), r2 = dist2(p3, p4);
        const dx = p3.x - p1.x, dy = p3.y - p1.y, d = Math.hypot(dx, dy);
        if (d < 1e-9) return null;
        const l = (def.inner ? -(r1 + r2) : (r2 - r1)) / d;
        if (Math.abs(l) > 1) return null;
        const ux = dx / d, uy = dy / d;
        const h = Math.sqrt(Math.max(0, 1 - l * l)) * (def.which ? -1 : 1);
        const nx = ux * l + uy * h, ny = uy * l - ux * h;
        const t1 = { x: p1.x - nx * r1, y: p1.y - ny * r1 };
        const t2 = def.inner ? { x: p3.x + nx * r2, y: p3.y + ny * r2 } : { x: p3.x - nx * r2, y: p3.y - ny * r2 };
        return def.on === 2 ? t2 : t1;
      }
      case 'p3d': {
        const o = getPt(def.o);
        if (!o) return null;
        const cm = (geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559;
        const x = (def.vx || 0) * cm, y = (def.vy || 0) * cm, z = (def.vz || 0) * cm;
        return { x: o.x + x - 0.35 * y, y: o.y - z + 0.28 * y };
      }
      default:
        return null;
    }
  }

  function evalGeo(geo) {
    if (typeof window !== 'undefined' && window.__mnGeoKernel && typeof window.__mnGeoKernel.Tt === 'function' && geo && geo.points && !Array.isArray(geo.points)) {
      try {
        const kMap = window.__mnGeoKernel.Tt(geo);
        if (kMap && kMap.size > 0) return kMap;
      } catch (_) {}
    }
    const map = new Map();
    if (!geo || !geo.points) return map;
    const visiting = new Set();
    const getPt = (id) => {
      if (map.has(id)) return map.get(id);
      const pt = geo.points[id];
      if (!pt || visiting.has(id)) return null;
      visiting.add(id);
      const res = evalDef(pt.def, getPt, geo);
      visiting.delete(id);
      const valid = res && Number.isFinite(res.x) && Number.isFinite(res.y) ? res : null;
      map.set(id, valid);
      return valid;
    };
    for (const id of Object.keys(geo.points)) getPt(id);
    return map;
  }

  function pointDeps(def) {
    if (!def) return [];
    switch (def.t) {
      case 'mid': return [def.a, def.b];
      case 'foot': return [def.p, def.a, def.b];
      case 'rot': return [def.c, def.p];
      case 'sum': return [def.a, def.b, def.c];
      case 'vec': return [def.o, def.a, def.b];
      case 'on': return [def.a, def.b];
      case 'len': return [def.a];
      case 'polar': return [def.o, def.ref];
      case 'p3d': return [def.o];
      case 'inter': return [...(def.l1 || []), ...(def.l2 || [])];
      case 'bis': return [def.a, def.o, def.b];
      case 'path': return Array.isArray(def.pts) ? def.pts : [];
      case 'ctan': return [...(def.c1 || []), ...(def.c2 || [])];
      default: return [];
    }
  }

  // ============================================================================
  // 2. NUMBER & IDENTIFIER FORMATTING HELPERS
  // ============================================================================
  function fmtNum(v, decimals) {
    if (!Number.isFinite(v)) return '0';
    const d = decimals != null ? decimals : 2;
    const rounded = Math.abs(v) < 1e-6 ? 0 : Number(v.toFixed(d));
    if (Object.is(rounded, -0)) return '0';
    return String(rounded).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  }

  function snapCleanFraction(k) {
    const table = [
      [0.5, '0.5'],
      [1 / 3, '1/3'],
      [2 / 3, '2/3'],
      [0.25, '0.25'],
      [0.75, '0.75'],
      [0.2, '0.2'],
      [0.4, '0.4'],
      [0.6, '0.6'],
      [0.8, '0.8'],
      [1 / 6, '1/6'],
      [5 / 6, '5/6'],
      [-0.5, '-0.5'],
      [-1, '-1'],
      [1.5, '1.5'],
      [2, '2']
    ];
    for (const [val, repr] of table) {
      if (Math.abs(k - val) <= 1e-4) return repr;
    }
    return fmtNum(k, 5);
  }

  function snapCleanDeg(deg) {
    let d = ((deg % 360) + 540) % 360 - 180; // (-180, 180]
    if (d <= -180) d += 360;
    const specials = [-150, -135, -120, -90, -60, -45, -30, 0, 30, 45, 60, 90, 120, 135, 150, 180];
    for (const sp of specials) {
      if (Math.abs(d - sp) <= 1e-3) return sp;
    }
    return Math.abs(d - Math.round(d)) <= 1e-3 ? Math.round(d) : Number(fmtNum(d, 4));
  }

  function sanitizeTikzPointIdentity(rawLabel, usedIds, fallbackCounter) {
    const cleanRaw = String(rawLabel || '').trim();
    // Standard single uppercase/lowercase letter or with single prime (A, B, S, O, A', O')
    if (/^[A-Za-z]'?$/.test(cleanRaw) && !usedIds.has(cleanRaw)) {
      usedIds.add(cleanRaw);
      return { tid: cleanRaw, texLabel: cleanRaw, simpleForEach: true };
    }
    // Letter + subscript like A_1 or A1 or A'_1
    const subMatch = cleanRaw.match(/^([A-Za-z])('?)_?\{?(\d+)\}?$/);
    if (subMatch) {
      const base = subMatch[1];
      const prime = subMatch[2] || '';
      const num = subMatch[3];
      let tid = base + (prime ? 'p' : '') + num;
      while (usedIds.has(tid)) tid += 'x';
      usedIds.add(tid);
      const texLabel = prime ? `${base}'_{${num}}` : `${base}_{${num}}`;
      return { tid, texLabel, simpleForEach: false };
    }
    // Letter + double prime A''
    const dpMatch = cleanRaw.match(/^([A-Za-z])''$/);
    if (dpMatch) {
      let tid = dpMatch[1] + 'pp';
      while (usedIds.has(tid)) tid += 'x';
      usedIds.add(tid);
      return { tid, texLabel: `${dpMatch[1]}''`, simpleForEach: false };
    }
    // Clean ASCII word
    const ascii = cleanRaw.replace(/[^A-Za-z0-9]/g, '');
    if (ascii && /^[A-Za-z]/.test(ascii) && ascii.length <= 6 && !usedIds.has(ascii)) {
      usedIds.add(ascii);
      return { tid: ascii, texLabel: cleanRaw || ascii, simpleForEach: ascii === cleanRaw };
    }
    // Fallback auto-id (hidden or unlabeled anchor point)
    let tid = 'P' + (fallbackCounter.n++);
    while (usedIds.has(tid)) tid = 'P' + (fallbackCounter.n++);
    usedIds.add(tid);
    return { tid, texLabel: cleanRaw || '', simpleForEach: false };
  }

  // ============================================================================
  // 3. OPTIMAL INTEGER GRID NORMALIZATION ENGINE
  // ============================================================================
  function isRevolutionKind(kind) {
    return ['cone', 'cylinder', 'sphere', 'frustumCone', 'truncCylinder', 'cap'].includes(kind);
  }

  function canExportSymbolically(pt, exportedSet, shapes) {
    if (!pt || !pt.def) return false;
    const d = pt.def;
    // Revolution solid control vertices should stay primary so their r, h, b variables stay crisp!
    const isRevControl = shapes.some((sh) => isRevolutionKind(sh.kind) && Array.isArray(sh.pts) && sh.pts.includes(pt.id));
    if (isRevControl && d.t !== 'mid' && d.t !== 'sum') return false;

    const deps = pointDeps(d);
    if (!deps.length || !deps.every((id) => exportedSet.has(id))) return false;

    switch (d.t) {
      case 'mid':
      case 'foot':
      case 'sum':
      case 'on':
      case 'rot':
        return true;
      case 'vec':
        return !d.distVal && !d.distParamId && !d.distExpr;
      case 'inter':
        return !d.c1 && !d.c2 && Array.isArray(d.l1) && Array.isArray(d.l2) && d.l1.length === 2 && d.l2.length === 2;
      default:
        return false;
    }
  }

  function optimizePrimaryGrid(primaryIds, rawMathMap, originId, opts) {
    const strictInteger = !!opts.strictInteger;
    const allowHalf = !strictInteger && opts.allowHalf !== false;
    const originRaw = rawMathMap.get(originId) || { x: 0, y: 0 };

    // Shift to origin (0, 0)
    const shifted = new Map();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of primaryIds) {
      const p = rawMathMap.get(id);
      if (!p) continue;
      const sp = { x: p.x - originRaw.x, y: p.y - originRaw.y };
      shifted.set(id, sp);
      if (sp.x < minX) minX = sp.x;
      if (sp.x > maxX) maxX = sp.x;
      if (sp.y < minY) minY = sp.y;
      if (sp.y > maxY) maxY = sp.y;
    }

    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    const span = Math.max(spanX, spanY, 1);

    // Pre-snap horizontal and vertical alignments within 3% tolerance
    const alignTol = 0.03 * span;
    const aligned = new Map();
    for (const [id, p] of shifted.entries()) {
      aligned.set(id, { x: p.x, y: p.y });
    }
    // Snap near-zero axes to exact 0 first
    for (const [id, p] of aligned.entries()) {
      if (id === originId) { p.x = 0; p.y = 0; continue; }
      if (Math.abs(p.x) < alignTol) p.x = 0;
      if (Math.abs(p.y) < alignTol) p.y = 0;
    }
    // Cluster remaining near-equal x / y values
    const clusterAxis = (axis) => {
      const entries = [...aligned.entries()].filter(([id]) => id !== originId).sort((a, b) => a[1][axis] - b[1][axis]);
      let i = 0;
      while (i < entries.length) {
        let j = i + 1;
        while (j < entries.length && Math.abs(entries[j][1][axis] - entries[i][1][axis]) < alignTol) j++;
        if (j - i > 1) {
          const vals = entries.slice(i, j).map((e) => e[1][axis]);
          const hasZero = vals.some((v) => v === 0);
          const avg = hasZero ? 0 : vals.reduce((s, v) => s + v, 0) / vals.length;
          for (let k = i; k < j; k++) entries[k][1][axis] = avg;
        }
        i = j;
      }
    };
    clusterAxis('x');
    clusterAxis('y');

    // Edge case: only 1 primary point
    if (primaryIds.length <= 1) {
      const out = new Map();
      if (primaryIds.length === 1) out.set(primaryIds[0], { x: 0, y: 0 });
      return { coords: out, scale: 1 / 56, gridStep: 1, error: 0, aspectErr: 0 };
    }

    // Build candidate scales s (cm / px)
    const candSet = new Set();
    const minWidthCm = (opts.targetWidthRange && opts.targetWidthRange[0]) || 3.5;
    const maxWidthCm = (opts.targetWidthRange && opts.targetWidthRange[1]) || (strictInteger ? 9.5 : 9.0);
    const idealSpan = opts.idealSpan || 5.2;
    const addScale = (s) => {
      if (!Number.isFinite(s) || s <= 0) return;
      const w = spanX * s;
      const h = spanY * s;
      const dom = Math.max(w, h);
      if (dom >= Math.max(2.0, minWidthCm - 0.5) && dom <= maxWidthCm + 0.6) {
        candSet.add(Number(s.toFixed(6)));
      }
    };

    // 1) Uniform sweep over [3.5..9.0] cm dominant span
    for (let target = minWidthCm; target <= maxWidthCm; target += 0.1) {
      addScale(target / span);
      if (spanX > 0.2 * span) addScale(target / spanX);
    }
    // 2) Exact pairwise edge-length integer ratios k / dist(Pi, Pj)
    const idList = [...aligned.keys()];
    for (let i = 0; i < idList.length; i++) {
      const pi = aligned.get(idList[i]);
      for (let j = i + 1; j < idList.length; j++) {
        const pj = aligned.get(idList[j]);
        const d = Math.hypot(pj.x - pi.x, pj.y - pi.y);
        if (d > 0.12 * span) {
          for (let k = 1; k <= 8; k++) addScale(k / d);
        }
      }
      if (Math.abs(pi.x) > 0.1 * span) {
        for (let k = 1; k <= 8; k++) addScale(k / Math.abs(pi.x));
      }
      if (Math.abs(pi.y) > 0.1 * span) {
        for (let k = 1; k <= 8; k++) addScale(k / Math.abs(pi.y));
      }
    }

    const candidates = [...candSet];
    const rawAspect = spanY > 1e-4 ? spanX / spanY : 1;

    function evaluateStep(step) {
      let best = null;
      for (const s of candidates) {
        const qMap = new Map();
        const seen = new Set();
        let degenerate = false;
        let sqErrSum = 0;
        let qMinX = Infinity, qMaxX = -Infinity, qMinY = Infinity, qMaxY = -Infinity;

        for (const id of idList) {
          const p = aligned.get(id);
          const sx = p.x * s;
          const sy = p.y * s;
          const qx = id === originId ? 0 : Math.round(sx / step) * step;
          const qy = id === originId ? 0 : Math.round(sy / step) * step;
          const key = `${qx.toFixed(2)},${qy.toFixed(2)}`;
          if (seen.has(key)) { degenerate = true; break; }
          seen.add(key);
          qMap.set(id, { x: qx, y: qy });
          const dx = qx - sx, dy = qy - sy;
          sqErrSum += dx * dx + dy * dy;
          if (qx < qMinX) qMinX = qx;
          if (qx > qMaxX) qMaxX = qx;
          if (qy < qMinY) qMinY = qy;
          if (qy > qMaxY) qMaxY = qy;
        }
        if (degenerate) continue;
        if (typeof opts.isValidSnap === 'function' && !opts.isValidSnap(qMap, s)) continue;

        const qW = qMaxX - qMinX;
        const qH = qMaxY - qMinY;
        const qDom = Math.max(qW, qH);
        if (qDom < 2.5 || qDom > 10.2) continue;

        // Check aspect ratio preservation (only meaningful when figure is 2D, not 1D segment)
        let aspectErr = 0;
        if (spanX > 0.15 * span && spanY > 0.15 * span) {
          if (qH < 1e-4 || qW < 1e-4) continue;
          const qAspect = qW / qH;
          aspectErr = Math.abs(qAspect - rawAspect) / rawAspect;
        }

        const normScale = Math.max(1e-4, s * span);
        const rmsErr = Math.sqrt(sqErrSum / idList.length) / normScale;

        // Mild preference for compact textbook width ~4..7 cm (or ~2.5..4cm radius for revolution solids)
        const idealPenalty = Math.abs(qDom - idealSpan) * 0.0025;
        const score = rmsErr + aspectErr * 0.45 + idealPenalty;

        if (!best || score < best.score) {
          best = { coords: qMap, scale: s, gridStep: step, error: rmsErr, aspectErr, score };
        }
      }
      return best;
    }

    const bestInt = evaluateStep(1);
    if (bestInt && (!allowHalf || (bestInt.aspectErr <= 0.06 && bestInt.error <= 0.048))) {
      return bestInt;
    }
    if (allowHalf) {
      const bestHalf = evaluateStep(0.5);
      if (bestHalf && (!bestInt || bestHalf.score + 0.012 < bestInt.score || bestInt.aspectErr > 0.06)) {
        return bestHalf;
      }
    }
    if (bestInt) return bestInt;

    // Ultimate safe fallback (rounded to 0.5 at 5cm width)
    const s = 5.0 / span;
    const out = new Map();
    for (const id of idList) {
      const p = aligned.get(id);
      out.set(id, {
        x: id === originId ? 0 : Math.round(p.x * s * 2) / 2,
        y: id === originId ? 0 : Math.round(p.y * s * 2) / 2
      });
    }
    return { coords: out, scale: s, gridStep: 0.5, error: 0.05, aspectErr: 0.05 };
  }

  // ============================================================================
  // 4. TARGET GEOMETRY EXTRACTION & TOPOLOGICAL ORDERING
  // ============================================================================
  function extractTargetGeo(geoArg) {
    if (geoArg && geoArg.points && Array.isArray(geoArg.shapes)) {
      return {
        points: geoArg.points,
        shapes: geoArg.shapes.filter((s) => s && !s.hidden && s.kind !== 'flatLink')
      };
    }
    const b = getBoard();
    if (!b || !b.doc || !b.doc.pages) return null;
    const pgIdx = (b.sel && Number.isInteger(b.sel.page))
      ? b.sel.page
      : (typeof b.currentPage === 'function' ? b.currentPage() : 0);
    const pg = b.doc.pages[pgIdx];
    if (!pg || !pg.geo) return null;
    const geo = pg.geo;

    const hasSelShapes = b.sel && b.sel.shapes && b.sel.shapes.size > 0;
    const hasSelPts = b.sel && b.sel.points && b.sel.points.size > 0;
    if (!hasSelShapes && !hasSelPts) {
      return {
        points: geo.points || {},
        shapes: (geo.shapes || []).filter((s) => s && !s.hidden && s.kind !== 'flatLink')
      };
    }

    const ptIds = new Set(hasSelPts ? [...b.sel.points] : []);
    const shapes = (geo.shapes || []).filter((s) => {
      if (!s || s.hidden || s.kind === 'flatLink') return false;
      if (hasSelShapes && b.sel.shapes.has(s.id)) return true;
      if (hasSelPts && Array.isArray(s.pts) && s.pts.every((id) => ptIds.has(id))) return true;
      return false;
    });
    shapes.forEach((s) => (s.pts || []).forEach((id) => ptIds.add(id)));

    // Expand parent deps
    let changed = true;
    while (changed) {
      changed = false;
      for (const pid of [...ptIds]) {
        const pt = geo.points[pid];
        if (!pt) continue;
        for (const dep of pointDeps(pt.def)) {
          if (geo.points[dep] && !ptIds.has(dep)) {
            ptIds.add(dep);
            changed = true;
          }
        }
      }
    }
    const points = {};
    for (const pid of ptIds) {
      if (geo.points[pid]) points[pid] = geo.points[pid];
    }
    return { points, shapes };
  }

  function topoSortPoints(pointIds, pointsObj, derivedSet) {
    const visited = new Set();
    const temp = new Set();
    const order = [];
    const visit = (id) => {
      if (visited.has(id) || temp.has(id)) return;
      temp.add(id);
      if (derivedSet.has(id)) {
        const pt = pointsObj[id];
        for (const dep of pointDeps(pt && pt.def)) {
          if (pointsObj[dep]) visit(dep);
        }
      }
      temp.delete(id);
      visited.add(id);
      order.push(id);
    };
    for (const id of pointIds) visit(id);
    return order;
  }

  // ============================================================================
  // 5. MAIN GENERATOR: generateTikz(geoArg, opts)
  // ============================================================================
  function generateTikz(geoArg, opts) {
    const o = Object.assign({
      strictInteger: false,
      allowHalf: true,
      useForeach: true,
      showDots: true,
      hatchFills: false
    }, opts || {});

    const target = extractTargetGeo(geoArg);
    if (!target || !target.points || Object.keys(target.points).length === 0) {
      return {
        code: '',
        stats: { points: 0, shapes: 0, gridStep: 1 },
        validation: validateTikz('')
      };
    }

    const shapes = target.shapes.filter((s) => s && !s.hidden && s.kind !== 'flatLink');
    const renderShapes = shapes.filter((s) => s.kind !== 'solid');
    const liveCoords = evalGeo(target);

    // Collect active points (used by shapes OR shown visibly)
    const activePtSet = new Set();
    for (const sh of renderShapes) {
      for (const pid of (sh.pts || [])) {
        if (target.points[pid] && liveCoords.get(pid)) activePtSet.add(pid);
      }
    }
    for (const pt of Object.values(target.points)) {
      if (pt && pt.show && !pt.hidden && liveCoords.get(pt.id)) activePtSet.add(pt.id);
    }
    // Pull in transitive deps for ALL derived points so every constraint can be re-evaluated after snapping free points
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const pid of [...activePtSet]) {
        const pt = target.points[pid];
        if (!pt || !pt.def || pt.def.t === 'free') continue;
        const deps = pointDeps(pt.def);
        if (deps.length && deps.every((d) => target.points[d] && liveCoords.get(d))) {
          for (const d of deps) {
            if (!activePtSet.has(d)) { activePtSet.add(d); expanded = true; }
          }
        }
      }
    }

    const activeIds = [...activePtSet];
    if (!activeIds.length) {
      return {
        code: '',
        stats: { points: 0, shapes: 0, gridStep: 1 },
        validation: validateTikz('')
      };
    }

    // Flip Y axis: mathY = -canvasY
    const rawMathMap = new Map();
    for (const id of activeIds) {
      const c = liveCoords.get(id);
      rawMathMap.set(id, { x: c.x, y: -c.y });
    }

    // Separate true free degrees of freedom (`primaryIds`) from constrained/derived points (`derivedSet`)
    // NEVER snap derived points (mid, foot, sum, on, rot, vec, inter ll/lc/cc, bis, path, ctan, polar, len, p3d) independently!
    const derivedSet = new Set();
    const symbolicSet = new Set();
    for (const id of activeIds) {
      const pt = target.points[id];
      const d = pt && pt.def;
      if (d && d.t && d.t !== 'free') {
        const isRevCtrl = renderShapes.some((sh) => isRevolutionKind(sh.kind) && Array.isArray(sh.pts) && sh.pts.includes(id));
        const deps = pointDeps(d);
        if (!(isRevCtrl && d.t !== 'mid' && d.t !== 'sum') && deps.length > 0 && deps.every((dep) => activePtSet.has(dep))) {
          derivedSet.add(id);
          if (canExportSymbolically(pt, activePtSet, renderShapes)) {
            symbolicSet.add(id);
          }
        }
      }
    }

    // Break any cycle in derivedSet safely before topological evaluation
    const checkVisited = new Set();
    const checkStack = new Set();
    const breakCycles = (id) => {
      if (checkVisited.has(id)) return;
      if (checkStack.has(id)) {
        derivedSet.delete(id);
        symbolicSet.delete(id);
        return;
      }
      checkStack.add(id);
      if (derivedSet.has(id)) {
        for (const dep of pointDeps(target.points[id] && target.points[id].def)) {
          if (activePtSet.has(dep)) breakCycles(dep);
        }
      }
      checkStack.delete(id);
      checkVisited.add(id);
    };
    for (const id of activeIds) breakCycles(id);

    const primaryIds = activeIds.filter((id) => !derivedSet.has(id));
    if (primaryIds.length === 0) {
      derivedSet.delete(activeIds[0]);
      symbolicSet.delete(activeIds[0]);
      primaryIds.push(activeIds[0]);
    }

    const sortedIds = topoSortPoints(activeIds, target.points, derivedSet);
    const cmPx = (target && (target.cmPx || target.pxPerCm)) || 37.79527559;

    function evalDerivedInMathSpace(id, coordLookup, scaleFactor) {
      const pt = target.points[id];
      const d = pt && pt.def;
      if (!d) return null;
      const g = (k) => coordLookup.get(k);
      switch (d.t) {
        case 'mid': {
          const a = g(d.a), b = g(d.b);
          return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
        }
        case 'foot': {
          const p = g(d.p), a = g(d.a), b = g(d.b);
          if (!p || !a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 1e-9) return null;
          const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2;
          return { x: a.x + dx * t, y: a.y + dy * t };
        }
        case 'sum': {
          const a = g(d.a), b = g(d.b), c = g(d.c);
          return a && b && c ? { x: a.x + b.x - c.x, y: a.y + b.y - c.y } : null;
        }
        case 'on': {
          const a = g(d.a), b = g(d.b);
          if (!a || !b) return null;
          let k = d.k != null ? d.k : 0.5;
          if (d.seg) k = Math.max(0, Math.min(1, k));
          return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        }
        case 'rot': {
          const c = g(d.c), p = g(d.p);
          if (!c || !p) return null;
          const deg = snapCleanDeg(-(d.ang || 0));
          const rad = deg * Math.PI / 180;
          const k = d.k != null ? d.k : 1;
          const dx = p.x - c.x, dy = p.y - c.y;
          return { x: c.x + (dx * Math.cos(rad) - dy * Math.sin(rad)) * k, y: c.y + (dx * Math.sin(rad) + dy * Math.cos(rad)) * k };
        }
        case 'vec': {
          const vo = g(d.o), a = g(d.a), b = g(d.b);
          if (!vo || !a || !b) return null;
          let dx = b.x - a.x, dy = b.y - a.y;
          if (d.perp) {
            // Kernel Hg in Canvas Y-down is (dy_c, -dx_c) -> in Math Y-up is (-dy_m, dx_m), i.e., +90 deg CCW
            const t = dx; dx = -dy; dy = t;
          }
          if (d.distVal != null) {
            const len = Math.hypot(dx, dy);
            if (len < 1e-9) return { x: vo.x, y: vo.y };
            const dCm = d.distVal * cmPx * scaleFactor;
            return { x: vo.x + dx * dCm / len, y: vo.y + dy * dCm / len };
          }
          const k = d.k != null ? d.k : 1;
          return { x: vo.x + dx * k, y: vo.y + dy * k };
        }
        case 'len': {
          const a = g(d.a);
          if (!a) return null;
          const dCm = Math.max(1e-4, (d.val != null ? d.val : 2) * cmPx * scaleFactor);
          const ang = -(d.ang || 0);
          return { x: a.x + dCm * Math.cos(ang), y: a.y + dCm * Math.sin(ang) };
        }
        case 'polar': {
          const po = g(d.o), pr = g(d.ref);
          if (!po || !pr) return null;
          const base = Math.atan2(pr.y - po.y, pr.x - po.x);
          const deg = d.fixedAng ? (d.angVal != null ? d.angVal : 60) : (d.curAngDeg != null ? d.curAngDeg : 60);
          const rad = base + deg * Math.PI / 180;
          const dCm = (d.fixedDist ? Math.max(1e-4, (d.distVal != null ? d.distVal : 2) * cmPx) : Math.max(4, d.curDistPx || 120)) * scaleFactor;
          return { x: po.x + dCm * Math.cos(rad), y: po.y + dCm * Math.sin(rad) };
        }
        case 'inter': {
          if (!d.l1 || !d.l2) return null;
          const p1 = g(d.l1[0]), p2 = g(d.l1[1]), p3 = g(d.l2[0]), p4 = g(d.l2[1]);
          if (!p1 || !p2 || !p3 || !p4) return null;
          if (!d.c1 && !d.c2) {
            const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
            const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
            const det = d1x * d2y - d1y * d2x;
            if (Math.abs(det) < 1e-6) return null;
            const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / det;
            return { x: p1.x + d1x * t, y: p1.y + d1y * t };
          }
          const pts = [];
          if (d.c1 && d.c2) {
            const r1 = dist2(p1, p2), r2 = dist2(p3, p4);
            const dx = p3.x - p1.x, dy = p3.y - p1.y, dist = Math.hypot(dx, dy);
            if (dist > 1e-7 && dist <= r1 + r2 + 1e-5 && dist >= Math.abs(r1 - r2) - 1e-5) {
              const a = (r1 * r1 - r2 * r2 + dist * dist) / (2 * dist);
              const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
              const xm = p1.x + a * dx / dist, ym = p1.y + a * dy / dist;
              // Exact R_Y image of Canvas _Y roots (which=0 -> -h*dy, +h*dx; which=1 -> +h*dy, -h*dx)
              pts.push({ x: xm - h * dy / dist, y: ym + h * dx / dist });
              pts.push({ x: xm + h * dy / dist, y: ym - h * dx / dist });
            }
          } else {
            const c = d.c1 ? p1 : p3;
            const r = d.c1 ? dist2(p1, p2) : dist2(p3, p4);
            const la = d.c1 ? p3 : p1;
            const lb = d.c1 ? p4 : p2;
            const dx = lb.x - la.x, dy = lb.y - la.y, d2 = dx * dx + dy * dy;
            if (d2 > 1e-9) {
              const fx = la.x - c.x, fy = la.y - c.y;
              const B = 2 * (fx * dx + fy * dy);
              const C = fx * fx + fy * fy - r * r;
              const disc = B * B - 4 * d2 * C;
              if (disc >= -1e-5) {
                const s = Math.sqrt(Math.max(0, disc));
                const t1 = (-B - s) / (2 * d2);
                const t2 = (-B + s) / (2 * d2);
                pts.push({ x: la.x + dx * t1, y: la.y + dy * t1 });
                pts.push({ x: la.x + dx * t2, y: la.y + dy * t2 });
              }
            }
          }
          return pts[Math.min(d.which || 0, Math.max(0, pts.length - 1))] || null;
        }
        case 'bis': {
          const a = g(d.a), bo = g(d.o), b = g(d.b);
          if (!a || !bo || !b) return null;
          const d1 = dist2(a, bo), d2 = dist2(b, bo);
          if (d1 < 1e-9 || d2 < 1e-9) return null;
          let lx = (a.x - bo.x) / d1 + (b.x - bo.x) / d2;
          let ly = (a.y - bo.y) / d1 + (b.y - bo.y) / d2;
          const m = Math.hypot(lx, ly);
          if (m < 1e-9) { lx = -(a.y - bo.y) / d1; ly = (a.x - bo.x) / d1; }
          else { lx /= m; ly /= m; }
          return { x: bo.x + lx * d1, y: bo.y + ly * d1 };
        }
        case 'path': {
          if (!Array.isArray(d.pts) || !d.pts.length) return null;
          const ps = d.pts.map(g);
          if (ps.some((p) => !p)) return null;
          const kind = d.kind || d.on || 'circle';
          const k = d.k != null ? d.k : 0;
          const rad = (d.angleDeg != null && d.k == null) ? (d.angleDeg * Math.PI / 180) : (-k * Math.PI * 2);
          if (kind === 'circle' && ps.length >= 2) {
            const r = dist2(ps[0], ps[1]);
            return { x: ps[0].x + r * Math.cos(rad), y: ps[0].y + r * Math.sin(rad) };
          }
          if (kind === 'ellipse' && ps.length >= 3) {
            const rx = dist2(ps[0], ps[1]), ry = dist2(ps[0], ps[2]);
            const rot = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
            const lx = rx * Math.cos(rad), ly = ry * Math.sin(rad);
            return {
              x: ps[0].x + lx * Math.cos(rot) - ly * Math.sin(rot),
              y: ps[0].y + lx * Math.sin(rot) + ly * Math.cos(rot)
            };
          }
          return ps[0];
        }
        case 'ctan': {
          if (!d.c1 || !d.c2) return null;
          const p1 = g(d.c1[0]), p2 = g(d.c1[1]), p3 = g(d.c2[0]), p4 = g(d.c2[1]);
          if (!p1 || !p2 || !p3 || !p4) return null;
          const r1 = dist2(p1, p2), r2 = dist2(p3, p4);
          const dx = p3.x - p1.x, dy = p3.y - p1.y, dist = Math.hypot(dx, dy);
          if (dist < 1e-9) return null;
          const l = (d.inner ? -(r1 + r2) : (r2 - r1)) / dist;
          if (Math.abs(l) > 1) return null;
          const ux = dx / dist, uy = dy / dist;
          const h = Math.sqrt(Math.max(0, 1 - l * l)) * (d.which ? -1 : 1);
          const nx = ux * l - uy * h, ny = uy * l + ux * h;
          const t1 = { x: p1.x - nx * r1, y: p1.y - ny * r1 };
          const t2 = d.inner ? { x: p3.x + nx * r2, y: p3.y + ny * r2 } : { x: p3.x - nx * r2, y: p3.y - ny * r2 };
          return d.on === 2 ? t2 : t1;
        }
        case 'p3d': {
          const po = g(d.o);
          if (!po) return null;
          const sCm = cmPx * scaleFactor;
          const x = (d.vx || 0) * sCm, y = (d.vy || 0) * sCm, z = (d.vz || 0) * sCm;
          return { x: po.x + x - 0.35 * y, y: po.y + z - 0.28 * y };
        }
        default:
          return null;
      }
    }

    // Pick canonical origin (0, 0)
    let originId = primaryIds[0];
    const revShape = renderShapes.find((sh) => isRevolutionKind(sh.kind) && sh.pts && primaryIds.includes(sh.pts[0]));
    const conicShape = renderShapes.find((sh) => ['circle', 'ellipse', 'annulus', 'hyperbola'].includes(sh.kind) && sh.pts && primaryIds.includes(sh.pts[0]));
    if (revShape) {
      originId = revShape.pts[0];
    } else if (conicShape && primaryIds.length <= 4) {
      originId = conicShape.pts[0];
    } else {
      // Bottom-leftmost primary point (preferring labeled vertices like A or O)
      let minY = Infinity;
      for (const id of primaryIds) {
        const p = rawMathMap.get(id);
        if (p.y < minY) minY = p.y;
      }
      const ys = primaryIds.map((id) => rawMathMap.get(id).y);
      const ySpan = Math.max(...ys) - Math.min(...ys) || 1;
      const bottomBand = primaryIds.filter((id) => rawMathMap.get(id).y <= minY + 0.06 * ySpan);
      bottomBand.sort((a, b) => rawMathMap.get(a).x - rawMathMap.get(b).x);
      originId = bottomBand[0] || primaryIds[0];
    }

    // Validate candidate primary grid snap so circle intersections / tangents never vanish!
    const isValidSnap = (qMap, sFactor) => {
      if (!derivedSet.size) return true;
      const simMap = new Map(qMap);
      for (const id of sortedIds) {
        if (!derivedSet.has(id)) continue;
        const ev = evalDerivedInMathSpace(id, simMap, sFactor);
        if (!ev || !Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return false;
        simMap.set(id, ev);
      }
      // Ensure distinct derived intersections (e.g. two tangent points B, C) do not collapse into one point
      const visIds = sortedIds.filter((id) => target.points[id] && target.points[id].show);
      for (let i = 0; i < visIds.length; i++) {
        for (let j = i + 1; j < visIds.length; j++) {
          const rA = rawMathMap.get(visIds[i]), rB = rawMathMap.get(visIds[j]);
          const sA = simMap.get(visIds[i]), sB = simMap.get(visIds[j]);
          if (rA && rB && sA && sB && dist2(rA, rB) * sFactor > 0.25 && dist2(sA, sB) < 0.08) {
            return false;
          }
        }
      }
      return true;
    };

    // Run Optimal Integer Grid Normalization on FREE primary points only
    const gridOpts = revShape
      ? Object.assign({}, o, { targetWidthRange: [2.2, 4.5], idealSpan: 3.0, isValidSnap })
      : Object.assign({}, o, { isValidSnap });
    const grid = optimizePrimaryGrid(primaryIds, rawMathMap, originId, gridOpts);

    // Evaluate final TikZ coordinates for ALL points (snapped primary + exact re-evaluated derived!)
    const tikzCoords = new Map(grid.coords);
    const resolvedSymbolic = new Set();

    for (const id of sortedIds) {
      if (!derivedSet.has(id)) continue;
      const ev = evalDerivedInMathSpace(id, tikzCoords, grid.scale);
      if (ev && Number.isFinite(ev.x) && Number.isFinite(ev.y)) {
        tikzCoords.set(id, ev);
        if (symbolicSet.has(id)) resolvedSymbolic.add(id);
      } else {
        // Safe non-NaN fallback scaled from rawMathMap without destructive grid rounding
        const raw = rawMathMap.get(id);
        const origRaw = rawMathMap.get(originId);
        tikzCoords.set(id, {
          x: Number(((raw.x - origRaw.x) * grid.scale).toFixed(5)),
          y: Number(((raw.y - origRaw.y) * grid.scale).toFixed(5))
        });
      }
    }

    // Assign clean unique TikZ IDs & labels
    const usedIds = new Set();
    const autoCtr = { n: 1 };
    const idInfo = new Map();
    // Process labeled points first so single letters get priority
    const labelFirst = sortedIds.slice().sort((a, b) => {
      const la = (target.points[a] && target.points[a].label) ? 0 : 1;
      const lb = (target.points[b] && target.points[b].label) ? 0 : 1;
      return la - lb;
    });
    for (const id of labelFirst) {
      const pt = target.points[id];
      idInfo.set(id, sanitizeTikzPointIdentity(pt && pt.label, usedIds, autoCtr));
    }

    // Build `declare function={...}` variables for clean DoMinhMath style (Rules 4.2 & 4.3)
    const declVars = []; // [{ name, val }]
    const declMap = new Map(); // name -> val
    const addDecl = (name, val) => {
      const vStr = fmtNum(val, 5);
      if (declMap.has(name)) {
        if (declMap.get(name) === vStr) return name;
        return null;
      }
      declMap.set(name, vStr);
      declVars.push({ name, val: vStr });
      return name;
    };

    const primaryExpr = new Map(); // ptId -> TikZ coord expr string
    const primaryOrder = sortedIds.filter((id) => !derivedSet.has(id));
    const nonSymbolicDerivedOrder = sortedIds.filter((id) => derivedSet.has(id) && !resolvedSymbolic.has(id));

    // Check if there is a revolution solid for canonical variable names (r, h, b, R)
    const revRadiusVar = new Map(); // shape.id -> { rVar, bVar, r2Var, b2Var, hVar }
    for (const sh of renderShapes) {
      if (!isRevolutionKind(sh.kind) || !sh.pts || sh.pts.length < 2) continue;
      const oPt = tikzCoords.get(sh.pts[0]);
      const rPt = tikzCoords.get(sh.pts[1]);
      if (!oPt || !rPt) continue;
      const rVal = Math.max(0.5, Number(dist2(oPt, rPt).toFixed(2)));
      const bVal = Number((rVal * 0.32).toFixed(2));
      const rName = sh.kind === 'sphere' || sh.kind === 'frustumCone'
        ? (addDecl('R', rVal) || addDecl('rA', rVal))
        : (addDecl('r', rVal) || addDecl('rA', rVal));
      const bName = sh.kind === 'frustumCone'
        ? (addDecl('bA', bVal) || addDecl('b', bVal))
        : (addDecl('b', bVal) || addDecl('bA', bVal));

      let r2Name = null, b2Name = null, hName = null;
      if (sh.pts[2]) {
        const topPt = tikzCoords.get(sh.pts[2]);
        if (topPt && Math.abs(topPt.x - oPt.x) < 1e-4 && topPt.y > oPt.y) {
          hName = addDecl('h', topPt.y - oPt.y) || addDecl('hA', topPt.y - oPt.y);
        }
      }
      if (sh.kind === 'frustumCone' && sh.pts[2] && sh.pts[3]) {
        const o2 = tikzCoords.get(sh.pts[2]), r2 = tikzCoords.get(sh.pts[3]);
        if (o2 && r2) {
          const r2Val = Math.max(0.3, Number(dist2(o2, r2).toFixed(2)));
          const b2Val = Number((r2Val * 0.32).toFixed(2));
          r2Name = addDecl('r', r2Val) || addDecl('rB', r2Val);
          b2Name = addDecl('bB', b2Val);
        }
      }
      revRadiusVar.set(sh.id, { rName, bName, r2Name, b2Name, hName, rVal, bVal });
    }

    // Assign clean named variables & polar coordinates for primary points on axes
    const usedPosXNames = ['a', 'b', 'c', 'd'];
    const usedPosYNames = ['h', 'k', 'c'];
    let skewAssigned = false;

    for (const id of primaryOrder) {
      const p = tikzCoords.get(id);
      if (!p) continue;
      const x = Number(fmtNum(p.x, 2));
      const y = Number(fmtNum(p.y, 2));

      if (x === 0 && y === 0) {
        primaryExpr.set(id, '(0,0)');
        continue;
      }

      // Check if matches an existing declared variable on an axis
      const findVarWithVal = (val, preferredList) => {
        const s = fmtNum(val, 2);
        for (const pref of preferredList) {
          if (declMap.get(pref) === s) return pref;
        }
        for (const [k, v] of declMap.entries()) {
          if (v === s && /^[a-zA-Z]$/.test(k)) return k;
        }
        return null;
      };

      if (y === 0 && x > 0) {
        let vName = findVarWithVal(x, ['r', 'R', 'a', 'b']);
        if (!vName) {
          for (const cand of usedPosXNames) {
            if (!declMap.has(cand)) { vName = addDecl(cand, x); break; }
          }
        }
        primaryExpr.set(id, vName ? `(0:${vName})` : `(0:${fmtNum(x, 2)})`);
      } else if (y === 0 && x < 0) {
        const ax = Math.abs(x);
        const vName = findVarWithVal(ax, ['r', 'R', 'a', 'b']);
        primaryExpr.set(id, vName ? `(180:${vName})` : `(180:${fmtNum(ax, 2)})`);
      } else if (x === 0 && y > 0) {
        let vName = findVarWithVal(y, ['h', 'c', 'b']);
        if (!vName) {
          for (const cand of usedPosYNames) {
            if (!declMap.has(cand)) { vName = addDecl(cand, y); break; }
          }
        }
        primaryExpr.set(id, vName ? `(90:${vName})` : `(90:${fmtNum(y, 2)})`);
      } else if (x === 0 && y < 0) {
        const ay = Math.abs(y);
        const vName = findVarWithVal(ay, ['h', 'R', 'r']);
        primaryExpr.set(id, vName ? `(-90:${vName})` : `(0,${fmtNum(y, 2)})`);
      } else if (!skewAssigned && shapes.some((s) => s.kind === 'solid') && x !== 0 && y !== 0) {
        // First off-axis 3D base vertex -> dx, dy (matches Sample 2 of tikz-domiinhmath.md!)
        const dxVar = addDecl('dx', x);
        const dyVar = addDecl('dy', y);
        if (dxVar && dyVar) {
          skewAssigned = true;
          primaryExpr.set(id, `({${dxVar}},{${dyVar}})`);
        } else {
          primaryExpr.set(id, `(${fmtNum(x, 2)},${fmtNum(y, 2)})`);
        }
      } else {
        primaryExpr.set(id, `(${fmtNum(x, 5)},${fmtNum(y, 5)})`);
      }
    }
    for (const id of nonSymbolicDerivedOrder) {
      const p = tikzCoords.get(id);
      if (!p) continue;
      primaryExpr.set(id, `(${fmtNum(p.x, 5)},${fmtNum(p.y, 5)})`);
    }

    // Build symbolic TikZ expression for each derived point
    const T = (id) => idInfo.get(id).tid;
    const isOriginCoord = (id) => {
      const c = tikzCoords.get(id);
      return c && Math.abs(c.x) < 1e-6 && Math.abs(c.y) < 1e-6;
    };

    function buildSymbolicExpr(id) {
      const d = target.points[id].def;
      switch (d.t) {
        case 'mid':
          return `($(${T(d.a)})!0.5!(${T(d.b)})$)`;
        case 'foot':
          return `($(${T(d.a)})!(${T(d.p)})!(${T(d.b)})$)`;
        case 'on': {
          let k = d.k != null ? d.k : 0.5;
          if (d.seg) k = Math.max(0, Math.min(1, k));
          return `($(${T(d.a)})!${snapCleanFraction(k)}!(${T(d.b)})$)`;
        }
        case 'sum': {
          if (isOriginCoord(d.c)) {
            return `($(${T(d.a)})+(${T(d.b)})$)`;
          }
          return `($(${T(d.a)})+(${T(d.b)})-(${T(d.c)})$)`;
        }
        case 'rot': {
          const deg = snapCleanDeg(-(d.ang || 0));
          const k = d.k != null ? d.k : 1;
          if (Math.abs(k - 1) < 1e-4 && (deg === 180 || deg === -180)) {
            return `($(${T(d.c)})!-1!(${T(d.p)})$)`;
          }
          return `($(${T(d.c)})!${fmtNum(k, 5)}!${deg}:(${T(d.p)})$)`;
        }
        case 'vec': {
          const k = d.k != null ? d.k : 1;
          if (!d.perp) {
            if (Math.abs(k - 1) < 1e-4) {
              return isOriginCoord(d.a)
                ? `($(${T(d.o)})+(${T(d.b)})$)`
                : `($(${T(d.o)})+(${T(d.b)})-(${T(d.a)})$)`;
            }
            if (Math.abs(k + 1) < 1e-4) {
              return `($(${T(d.o)})+(${T(d.a)})-(${T(d.b)})$)`;
            }
            const ks = fmtNum(k, 5);
            return `($(${T(d.o)})+${ks}*(${T(d.b)})-${ks}*(${T(d.a)})$)`;
          }
          // Perpendicular vector from o along +90 deg CCW of (a->b) in Math Y-up
          if (d.o === d.a) {
            return `($(${T(d.a)})!${fmtNum(k, 5)}!90:(${T(d.b)})$)`;
          }
          const c = tikzCoords.get(id);
          return `(${fmtNum(c.x, 5)},${fmtNum(c.y, 5)})`;
        }
        case 'inter':
          return `(intersection of ${T(d.l1[0])}--${T(d.l1[1])} and ${T(d.l2[0])}--${T(d.l2[1])})`;
        default: {
          const c = tikzCoords.get(id);
          return `(${fmtNum(c.x, 5)},${fmtNum(c.y, 5)})`;
        }
      }
    }

    // Determine whether curve mode needs `line join=round` (Rule 4.5: ONLY for graphs/curves, NEVER geometry!)
    const hasSmoothCurve = renderShapes.some((s) => s.kind === 'parabola' || s.kind === 'hyperbola');

    // ============================================================================
    // Assemble 5-Layer Output (Rule 7) — ZERO blank lines inside tikzpicture!
    // ============================================================================
    const lines = [];
    const headerOpts = [];
    if (hasSmoothCurve) headerOpts.push('line join=round');
    headerOpts.push('every node/.style={font=\\normalsize}');
    if (declVars.length) {
      headerOpts.push(`declare function={${declVars.map((v) => `${v.name}=${v.val};`).join(' ')}}`);
    }
    lines.push(`\\begin{tikzpicture}[${headerOpts.join(', ')}]`);

    // Coordinates (topological order!)
    for (const id of sortedIds) {
      const tid = T(id);
      const expr = resolvedSymbolic.has(id) ? buildSymbolicExpr(id) : primaryExpr.get(id);
      if (expr) {
        lines.push(`\\coordinate (${tid}) at ${expr};`);
      }
    }

    // Track incident rays at each point for optimal label angle placement
    const incidentAngles = new Map();
    const addIncidentEdge = (id1, id2) => {
      const p1 = tikzCoords.get(id1), p2 = tikzCoords.get(id2);
      if (!p1 || !p2) return;
      if (dist2(p1, p2) < 1e-6) return;
      const a12 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const a21 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
      if (!incidentAngles.has(id1)) incidentAngles.set(id1, []);
      if (!incidentAngles.has(id2)) incidentAngles.set(id2, []);
      incidentAngles.get(id1).push(a12);
      incidentAngles.get(id2).push(a21);
    };

    // Edge deduplication for clean output (solid cleanly supersedes any duplicate dashed edge)
    const drawnDashedEdges = new Map(); // ek -> index in layer2Dashed
    const drawnSolidEdges = new Set();
    const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const removeSupersededDashed = (ek) => {
      if (drawnDashedEdges.has(ek)) {
        const idx = drawnDashedEdges.get(ek);
        if (idx >= 0 && idx < layer2Dashed.length) layer2Dashed[idx] = '';
        drawnDashedEdges.delete(ek);
      }
    };

    const layer1Fills = [];
    const layer2Dashed = [];
    const layer3Solid = [];
    const layer4Marks = [];
    const angleMarkCounts = new Map();
    const incMark = (id) => angleMarkCounts.set(id, (angleMarkCounts.get(id) || 0) + 1);

    // Helper for radius expression
    const radiusExprBetween = (id1, id2, shId) => {
      const rv = shId ? revRadiusVar.get(shId) : null;
      if (rv && rv.rName) return rv.rName;
      const p1 = tikzCoords.get(id1), p2 = tikzCoords.get(id2);
      const r = dist2(p1, p2);
      for (const [k, v] of declMap.entries()) {
        if (Math.abs(Number(v) - r) < 1e-5) return k;
      }
      return fmtNum(r, 5);
    };

    const fillStyleStr = () => o.hatchFills
      ? 'pattern={Lines[angle=45, distance=4pt, line width=0.3pt]}, pattern color=gray!70'
      : 'gray!20';

    for (const sh of renderShapes) {
      const pIds = (sh.pts || []).filter((pid) => tikzCoords.has(pid));
      if (!pIds.length) continue;

      switch (sh.kind) {
        case 'segment': {
          if (pIds.length < 2) break;
          const [a, b] = pIds;
          addIncidentEdge(a, b);
          const ek = edgeKey(a, b);
          if (sh.arrow) {
            const style = sh.dashed ? 'dashed, -Stealth, line width=0.4pt' : '-Stealth, line width=0.6pt';
            (sh.dashed ? layer2Dashed : layer3Solid).push(`\\draw[${style}] (${T(a)}) -- (${T(b)});`);
          } else if (sh.dashed) {
            if (!drawnDashedEdges.has(ek) && !drawnSolidEdges.has(ek)) {
              drawnDashedEdges.set(ek, layer2Dashed.length);
              layer2Dashed.push(`\\draw[dashed, line width=0.4pt] (${T(a)}) -- (${T(b)});`);
            }
          } else {
            if (!drawnSolidEdges.has(ek)) {
              removeSupersededDashed(ek);
              drawnSolidEdges.add(ek);
              layer3Solid.push(`\\draw[line width=0.6pt] (${T(a)}) -- (${T(b)});`);
            }
          }
          break;
        }

        case 'line':
        case 'ray': {
          if (pIds.length < 2) break;
          const [a, b] = pIds;
          addIncidentEdge(a, b);
          const startExpr = sh.kind === 'line' ? `($(${T(a)})!-0.25!(${T(b)})$)` : `(${T(a)})`;
          const endExpr = `($(${T(a)})!1.25!(${T(b)})$)`;
          if (sh.dashed) {
            layer2Dashed.push(`\\draw[dashed, line width=0.4pt] ${startExpr} -- ${endExpr};`);
          } else {
            layer3Solid.push(`\\draw[line width=0.6pt] ${startExpr} -- ${endExpr};`);
          }
          break;
        }

        case 'extend': {
          if (pIds.length < 3) break;
          const [extPt, c1, c2] = pIds;
          const pe = tikzCoords.get(extPt), p1 = tikzCoords.get(c1), p2 = tikzCoords.get(c2);
          const dx = p2.x - p1.x, dy = p2.y - p1.y, d2 = dx * dx + dy * dy;
          const t = d2 ? ((pe.x - p1.x) * dx + (pe.y - p1.y) * dy) / d2 : 0;
          const anchor = t < 0 ? c1 : c2;
          addIncidentEdge(anchor, extPt);
          const lineCmd = sh.dashed
            ? `\\draw[dashed, line width=0.4pt] (${T(anchor)}) -- (${T(extPt)});`
            : `\\draw[line width=0.6pt] (${T(anchor)}) -- (${T(extPt)});`;
          (sh.dashed ? layer2Dashed : layer3Solid).push(lineCmd);
          break;
        }

        case 'polygon': {
          if (pIds.length < 3) break;
          const polyPath = pIds.map((id) => `(${T(id)})`).join(' -- ') + ' -- cycle';
          if (sh.fill) {
            layer1Fills.push(`\\fill[${fillStyleStr()}] ${polyPath};`);
          }
          const hiddenSet = new Set([...(sh.gaps || []), ...(sh.hiddenSides || [])]);
          for (let i = 0; i < pIds.length; i++) {
            const u = pIds[i], v = pIds[(i + 1) % pIds.length];
            addIncidentEdge(u, v);
          }
          if (sh.width === 0) break;
          if (hiddenSet.size === 0) {
            if (sh.dashed) {
              const startIdx = layer2Dashed.length;
              layer2Dashed.push(`\\draw[dashed, line width=0.4pt] ${polyPath};`);
              for (let i = 0; i < pIds.length; i++) {
                const ek = edgeKey(pIds[i], pIds[(i + 1) % pIds.length]);
                if (!drawnDashedEdges.has(ek)) drawnDashedEdges.set(ek, -1);
              }
            } else {
              for (let i = 0; i < pIds.length; i++) {
                const ek = edgeKey(pIds[i], pIds[(i + 1) % pIds.length]);
                removeSupersededDashed(ek);
                drawnSolidEdges.add(ek);
              }
              layer3Solid.push(`\\draw[line width=0.6pt] ${polyPath};`);
            }
          } else {
            for (let i = 0; i < pIds.length; i++) {
              const u = pIds[i], v = pIds[(i + 1) % pIds.length];
              const ek = edgeKey(u, v);
              if ((sh.gaps || []).includes(i)) continue;
              const isHid = sh.dashed || (sh.hiddenSides || []).includes(i);
              if (isHid) {
                if (!drawnDashedEdges.has(ek) && !drawnSolidEdges.has(ek)) {
                  drawnDashedEdges.set(ek, layer2Dashed.length);
                  layer2Dashed.push(`\\draw[dashed, line width=0.4pt] (${T(u)}) -- (${T(v)});`);
                }
              } else if (!drawnSolidEdges.has(ek)) {
                removeSupersededDashed(ek);
                drawnSolidEdges.add(ek);
                layer3Solid.push(`\\draw[line width=0.6pt] (${T(u)}) -- (${T(v)});`);
              }
            }
          }
          break;
        }

        case 'plane': {
          if (pIds.length < 3) break;
          const polyPath = pIds.map((id) => `(${T(id)})`).join(' -- ') + ' -- cycle';
          layer1Fills.push(`\\fill[gray!12] ${polyPath};`);
          if (sh.dashed) {
            layer2Dashed.push(`\\draw[dashed, line width=0.4pt] ${polyPath};`);
          } else {
            layer3Solid.push(`\\draw[line width=0.5pt] ${polyPath};`);
          }
          const pname = sh.name || 'P';
          const anchor = pIds[0];
          layer4Marks.push(`\\path (${T(anchor)}) node[shift={(45:14pt)}]{$(${pname})$};`);
          break;
        }

        case 'circle': {
          if (pIds.length < 2) break;
          const rExpr = radiusExprBetween(pIds[0], pIds[1]);
          if (sh.fill) {
            layer1Fills.push(`\\fill[${fillStyleStr()}] (${T(pIds[0])}) circle[radius=${rExpr}];`);
          }
          const cmd = sh.dashed
            ? `\\draw[dashed, line width=0.4pt] (${T(pIds[0])}) circle[radius=${rExpr}];`
            : `\\draw[line width=0.6pt] (${T(pIds[0])}) circle[radius=${rExpr}];`;
          (sh.dashed ? layer2Dashed : layer3Solid).push(cmd);
          break;
        }

        case 'annulus': {
          if (pIds.length < 3) break;
          const rOut = radiusExprBetween(pIds[0], pIds[1]);
          const rIn = radiusExprBetween(pIds[0], pIds[2]);
          layer1Fills.push(`\\fill[${fillStyleStr()}, even odd rule] (${T(pIds[0])}) circle[radius=${rOut}] (${T(pIds[0])}) circle[radius=${rIn}];`);
          layer3Solid.push(`\\draw[line width=0.6pt] (${T(pIds[0])}) circle[radius=${rOut}];`);
          layer3Solid.push(`\\draw[line width=0.6pt] (${T(pIds[0])}) circle[radius=${rIn}];`);
          break;
        }

        case 'arc':
        case 'sector': {
          if (pIds.length < 3) break;
          const oPt = tikzCoords.get(pIds[0]), p1 = tikzCoords.get(pIds[1]), p2 = tikzCoords.get(pIds[2]);
          const r = dist2(oPt, p1);
          const a1 = Math.atan2(p1.y - oPt.y, p1.x - oPt.x) * 180 / Math.PI;
          let a2 = Math.atan2(p2.y - oPt.y, p2.x - oPt.x) * 180 / Math.PI;
          let diff = ((a2 - a1) % 360 + 360) % 360;
          if (diff < 1e-3) diff = 360;
          const endDeg = a1 + diff;
          const rExpr = radiusExprBetween(pIds[0], pIds[1]);
          if (sh.kind === 'sector') {
            layer1Fills.push(`\\fill[${fillStyleStr()}] (${T(pIds[0])}) -- (${T(pIds[1])}) arc[start angle=${fmtNum(a1, 1)}, end angle=${fmtNum(endDeg, 1)}, radius=${rExpr}] -- cycle;`);
            const sStyle = sh.dashed ? 'dashed, line width=0.4pt' : 'line width=0.6pt';
            (sh.dashed ? layer2Dashed : layer3Solid).push(`\\draw[${sStyle}] (${T(pIds[0])}) -- (${T(pIds[1])}) arc[start angle=${fmtNum(a1, 1)}, end angle=${fmtNum(endDeg, 1)}, radius=${rExpr}] -- cycle;`);
          } else {
            const style = sh.dashed ? 'dashed, line width=0.4pt' : 'line width=0.6pt';
            (sh.dashed ? layer2Dashed : layer3Solid).push(
              `\\draw[${style}] (${T(pIds[0])}) ++(${fmtNum(a1, 1)}:${rExpr}) arc[start angle=${fmtNum(a1, 1)}, end angle=${fmtNum(endDeg, 1)}, radius=${rExpr}];`
            );
          }
          break;
        }

        case 'arc3': {
          if (pIds.length < 3) break;
          const [p1, p2, p3] = pIds.map((id) => tikzCoords.get(id));
          const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
          if (Math.abs(d) > 1e-5) {
            const s1 = p1.x * p1.x + p1.y * p1.y;
            const s2 = p2.x * p2.x + p2.y * p2.y;
            const s3 = p3.x * p3.x + p3.y * p3.y;
            const cx = (s1 * (p2.y - p3.y) + s2 * (p3.y - p1.y) + s3 * (p1.y - p2.y)) / d;
            const cy = (s1 * (p3.x - p2.x) + s2 * (p1.x - p3.x) + s3 * (p2.x - p1.x)) / d;
            const r = Math.hypot(p1.x - cx, p1.y - cy);
            const a1 = Math.atan2(p1.y - cy, p1.x - cx) * 180 / Math.PI;
            const norm = (a) => ((a - a1) % 360 + 360) % 360;
            const a2n = norm(Math.atan2(p2.y - cy, p2.x - cx) * 180 / Math.PI);
            const a3n = norm(Math.atan2(p3.y - cy, p3.x - cx) * 180 / Math.PI);
            const span = a2n <= a3n ? a3n : (a3n - 360);
            const aStyle = sh.dashed ? 'dashed, line width=0.4pt' : 'line width=0.6pt';
            (sh.dashed ? layer2Dashed : layer3Solid).push(`\\draw[${aStyle}] (${fmtNum(cx, 2)},${fmtNum(cy, 2)}) ++(${fmtNum(a1, 1)}:${fmtNum(r, 2)}) arc[start angle=${fmtNum(a1, 1)}, end angle=${fmtNum(a1 + span, 1)}, radius=${fmtNum(r, 2)}];`);
          }
          break;
        }

        case 'ellipse': {
          if (pIds.length < 3) break;
          const oPt = tikzCoords.get(pIds[0]), aPt = tikzCoords.get(pIds[1]), bPt = tikzCoords.get(pIds[2]);
          const rx = fmtNum(dist2(oPt, aPt), 2);
          const ry = fmtNum(dist2(oPt, bPt), 2);
          const rotDeg = Math.round(Math.atan2(aPt.y - oPt.y, aPt.x - oPt.x) * 180 / Math.PI);
          const rotOpt = Math.abs(rotDeg) > 1 ? `, rotate around={${rotDeg}:(${T(pIds[0])})}` : '';
          const style = sh.dashed ? `dashed, line width=0.4pt${rotOpt}` : `line width=0.6pt${rotOpt}`;
          (sh.dashed ? layer2Dashed : layer3Solid).push(`\\draw[${style}] (${T(pIds[0])}) ellipse (${rx} and ${ry});`);
          break;
        }

        case 'parabola': {
          if (pIds.length < 3) break;
          // Exact single cubic Bezier for quadratic parabola P(t) = N + (O-N)t^2 + (S-O)t on [-1, 1] (Rule 5.5!)
          const [n, oPt, s] = pIds.map((id) => tikzCoords.get(id));
          const pStart = { x: 2 * oPt.x - s.x, y: 2 * oPt.y - s.y };
          const pEnd = { x: s.x, y: s.y };
          const qCtrl = { x: 2 * n.x - oPt.x, y: 2 * n.y - oPt.y };
          // Degree elevate quadratic (pStart, qCtrl, pEnd) to cubic Bezier
          const c1 = { x: pStart.x + (2 / 3) * (qCtrl.x - pStart.x), y: pStart.y + (2 / 3) * (qCtrl.y - pStart.y) };
          const c2 = { x: pEnd.x + (2 / 3) * (qCtrl.x - pEnd.x), y: pEnd.y + (2 / 3) * (qCtrl.y - pEnd.y) };
          const pStyle = sh.dashed ? 'dashed, line width=0.4pt' : 'line width=0.6pt';
          (sh.dashed ? layer2Dashed : layer3Solid).push(
            `\\draw[${pStyle}] (${fmtNum(pStart.x, 2)},${fmtNum(pStart.y, 2)}) .. controls (${fmtNum(c1.x, 2)},${fmtNum(c1.y, 2)}) and (${fmtNum(c2.x, 2)},${fmtNum(c2.y, 2)}) .. (${fmtNum(pEnd.x, 2)},${fmtNum(pEnd.y, 2)});`
          );
          break;
        }

        case 'hyperbola': {
          if (pIds.length < 3) break;
          const oPt = tikzCoords.get(pIds[0]), aPt = tikzCoords.get(pIds[1]), bPt = tikzCoords.get(pIds[2]);
          const a = fmtNum(Math.max(0.2, dist2(oPt, aPt)), 2);
          const b = fmtNum(Math.max(0.2, dist2(oPt, bPt)), 2);
          const cx = fmtNum(oPt.x, 2), cy = fmtNum(oPt.y, 2);
          layer2Dashed.push(`\\draw[dashed, line width=0.4pt] (${fmtNum(oPt.x - 2.2 * Number(a), 2)},${fmtNum(oPt.y - 2.2 * Number(b), 2)}) -- (${fmtNum(oPt.x + 2.2 * Number(a), 2)},${fmtNum(oPt.y + 2.2 * Number(b), 2)});`);
          layer2Dashed.push(`\\draw[dashed, line width=0.4pt] (${fmtNum(oPt.x - 2.2 * Number(a), 2)},${fmtNum(oPt.y + 2.2 * Number(b), 2)}) -- (${fmtNum(oPt.x + 2.2 * Number(a), 2)},${fmtNum(oPt.y - 2.2 * Number(b), 2)});`);
          layer3Solid.push(`\\draw[line width=0.6pt, smooth, samples=80, domain=-1.4:1.4] plot ({${cx}+${a}*cosh(\\x)},{${cy}+${b}*sinh(\\x)});`);
          layer3Solid.push(`\\draw[line width=0.6pt, smooth, samples=80, domain=-1.4:1.4] plot ({${cx}-${a}*cosh(\\x)},{${cy}+${b}*sinh(\\x)});`);
          break;
        }

        case 'cone': {
          if (pIds.length < 3) break;
          const [oId, rId, sId] = pIds;
          const rv = revRadiusVar.get(sh.id) || {};
          const r = rv.rName || radiusExprBetween(oId, rId);
          const b = rv.bName || fmtNum(dist2(tikzCoords.get(oId), tikzCoords.get(rId)) * 0.32, 2);
          const leftPt = isOriginCoord(oId) ? `(180:${r})` : `($(${T(oId)})+(180:${r})$)`;
          const rightPt = isOriginCoord(oId) ? `(0:${r})` : `($(${T(oId)})+(0:${r})$)`;
          // Rule 4.10 & 4.11: Back half-ellipse dashed 0.5pt, front half-ellipse solid 0.6pt, generatrices solid 0.6pt
          layer2Dashed.push(`\\draw[dashed, line width=0.5pt] ${leftPt} arc (180:0:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${leftPt} arc (180:360:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${leftPt} -- (${T(sId)}) -- ${rightPt};`);
          addIncidentEdge(oId, sId);
          addIncidentEdge(oId, rId);
          break;
        }

        case 'cylinder': {
          if (pIds.length < 3) break;
          const [oId, rId, topId] = pIds;
          const rv = revRadiusVar.get(sh.id) || {};
          const r = rv.rName || radiusExprBetween(oId, rId);
          const b = rv.bName || fmtNum(dist2(tikzCoords.get(oId), tikzCoords.get(rId)) * 0.32, 2);
          const botL = isOriginCoord(oId) ? `(180:${r})` : `($(${T(oId)})+(180:${r})$)`;
          const botR = isOriginCoord(oId) ? `(0:${r})` : `($(${T(oId)})+(0:${r})$)`;
          const topL = `($(${T(topId)})+(180:${r})$)`;
          const topR = `($(${T(topId)})+(0:${r})$)`;
          layer2Dashed.push(`\\draw[dashed, line width=0.5pt] ${botL} arc (180:0:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${botL} arc (180:360:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] (${T(topId)}) ellipse (${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${botL} -- ${topL} ${botR} -- ${topR};`);
          addIncidentEdge(oId, topId);
          addIncidentEdge(oId, rId);
          break;
        }

        case 'sphere': {
          if (pIds.length < 2) break;
          const [oId, rId] = pIds;
          const rv = revRadiusVar.get(sh.id) || {};
          const R = rv.rName || radiusExprBetween(oId, rId);
          const b = rv.bName || fmtNum(dist2(tikzCoords.get(oId), tikzCoords.get(rId)) * 0.32, 2);
          const leftPt = isOriginCoord(oId) ? `(180:${R})` : `($(${T(oId)})+(180:${R})$)`;
          layer1Fills.push(`\\shade[ball color=cyan!15, opacity=0.3] (${T(oId)}) circle[radius=${R}];`);
          layer2Dashed.push(`\\draw[dashed, line width=0.5pt] ${leftPt} arc (180:0:${R} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.7pt] (${T(oId)}) circle[radius=${R}];`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${leftPt} arc (180:360:${R} and ${b});`);
          addIncidentEdge(oId, rId);
          break;
        }

        case 'frustumCone': {
          if (pIds.length < 4) break;
          const [o1, r1, o2, r2] = pIds;
          const rv = revRadiusVar.get(sh.id) || {};
          const R = rv.rName || radiusExprBetween(o1, r1);
          const b1 = rv.bName || fmtNum(dist2(tikzCoords.get(o1), tikzCoords.get(r1)) * 0.32, 2);
          const r = rv.r2Name || radiusExprBetween(o2, r2);
          const b2 = rv.b2Name || fmtNum(dist2(tikzCoords.get(o2), tikzCoords.get(r2)) * 0.32, 2);
          const botL = isOriginCoord(o1) ? `(180:${R})` : `($(${T(o1)})+(180:${R})$)`;
          const botR = isOriginCoord(o1) ? `(0:${R})` : `($(${T(o1)})+(0:${R})$)`;
          const topL = `($(${T(o2)})+(180:${r})$)`;
          const topR = `($(${T(o2)})+(0:${r})$)`;
          layer2Dashed.push(`\\draw[dashed, line width=0.5pt] ${botL} arc (180:0:${R} and ${b1});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${botL} arc (180:360:${R} and ${b1});`);
          layer3Solid.push(`\\draw[line width=0.6pt] (${T(o2)}) ellipse (${r} and ${b2});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${botL} -- ${topL} ${botR} -- ${topR};`);
          break;
        }

        case 'truncCylinder': {
          if (pIds.length < 3) break;
          const [oId, rId, topId] = pIds;
          const rv = revRadiusVar.get(sh.id) || {};
          const r = rv.rName || radiusExprBetween(oId, rId);
          const b = rv.bName || fmtNum(dist2(tikzCoords.get(oId), tikzCoords.get(rId)) * 0.32, 2);
          const botL = isOriginCoord(oId) ? `(180:${r})` : `($(${T(oId)})+(180:${r})$)`;
          const botR = isOriginCoord(oId) ? `(0:${r})` : `($(${T(oId)})+(0:${r})$)`;
          const topL = `($(${T(topId)})+(180:${r})$)`;
          const topR = `($(${T(topId)})+(0:${r})$)`;
          layer2Dashed.push(`\\draw[dashed, line width=0.5pt] ${botL} arc (180:0:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${botL} arc (180:360:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] (${T(topId)}) ellipse (${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${botL} -- ${topL} ${botR} -- ${topR};`);
          addIncidentEdge(oId, topId);
          addIncidentEdge(oId, rId);
          break;
        }

        case 'cap': {
          if (pIds.length < 3) break;
          const [oId, rId, tId] = pIds;
          const rv = revRadiusVar.get(sh.id) || {};
          const r = rv.rName || radiusExprBetween(oId, rId);
          const b = rv.bName || fmtNum(dist2(tikzCoords.get(oId), tikzCoords.get(rId)) * 0.32, 2);
          const h = fmtNum(dist2(tikzCoords.get(oId), tikzCoords.get(tId)), 2);
          const leftPt = isOriginCoord(oId) ? `(180:${r})` : `($(${T(oId)})+(180:${r})$)`;
          layer2Dashed.push(`\\draw[dashed, line width=0.5pt] ${leftPt} arc (180:0:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${leftPt} arc (180:360:${r} and ${b});`);
          layer3Solid.push(`\\draw[line width=0.6pt] ${leftPt} arc (180:0:${r} and ${h});`);
          break;
        }

        case 'right': {
          if (pIds.length < 3) break;
          const [a, v, b] = pIds;
          incMark(v);
          layer4Marks.push(`\\path pic[draw, line width=0.6pt, angle radius=6pt]{right angle=${T(a)}--${T(v)}--${T(b)}};`);
          break;
        }

        case 'angle': {
          if (pIds.length < 3) break;
          const [a, v, b] = pIds;
          const pa = tikzCoords.get(a), pv = tikzCoords.get(v), pb = tikzCoords.get(b);
          const cross = (pa.x - pv.x) * (pb.y - pv.y) - (pa.y - pv.y) * (pb.x - pv.x);
          // TikZ angle pic sweeps CCW from first leg to second leg -> order so interior angle <= 180°
          const leg1 = cross >= 0 ? T(a) : T(b);
          const leg2 = cross >= 0 ? T(b) : T(a);
          incMark(v);
          const lblPart = sh.plain ? '' : `, "${sh.label ? `$${sh.label}$` : '$\\alpha$'}", angle eccentricity=1.6`;
          layer4Marks.push(`\\path pic[draw, line width=0.6pt, angle radius=8pt${lblPart}]{angle=${leg1}--${T(v)}--${leg2}};`);
          break;
        }

        case 'tick': {
          if (pIds.length < 2) break;
          const [a, b] = pIds;
          const n = Math.max(1, Math.min(3, sh.n || 1));
          for (let k = 0; k < n; k++) {
            const shiftFrac = 0.5 + (k - (n - 1) / 2) * 0.04;
            const sf = fmtNum(shiftFrac, 2);
            layer4Marks.push(`\\draw[line width=0.6pt] ($(${T(a)})!${sf}!(${T(b)})!3pt!90:(${T(b)})$) -- ($(${T(a)})!${sf}!(${T(b)})!3pt!-90:(${T(b)})$);`);
          }
          break;
        }

        default:
          break;
      }
    }

    lines.push(...layer1Fills);
    lines.push(...layer2Dashed.filter(Boolean));
    lines.push(...layer3Solid);
    lines.push(...layer4Marks);

    // Layer 5 — Points & Smart Non-Overlapping Labels (Rule 4.6)
    function computeBestLabelAngleDeg(ptId) {
      const rays = (incidentAngles.get(ptId) || []).slice().sort((a, b) => a - b);
      if (!rays.length) return 90;
      let bestGap = -1;
      let bestMid = Math.PI / 4;
      for (let i = 0; i < rays.length; i++) {
        const cur = rays[i];
        const next = i + 1 < rays.length ? rays[i + 1] : rays[0] + Math.PI * 2;
        const gap = next - cur;
        if (gap > bestGap) {
          bestGap = gap;
          bestMid = (cur + next) * 0.5;
        }
      }
      let deg = ((bestMid * 180 / Math.PI) % 360 + 360) % 360;
      // Snap to clean 45° cardinal/diagonal if within 12°, else nearest 15°
      const near45 = Math.round(deg / 45) * 45;
      if (Math.abs(deg - near45) <= 12) {
        deg = near45 % 360;
      } else {
        deg = (Math.round(deg / 15) * 15) % 360;
      }
      return deg;
    }

    const simpleEntries = [];
    const customEntries = [];
    for (const id of sortedIds) {
      const pt = target.points[id];
      if (!pt || !pt.show || pt.hidden) continue;
      const info = idInfo.get(id);
      if (!info || !info.texLabel) continue;
      const deg = computeBestLabelAngleDeg(id);
      const radiusPt = (angleMarkCounts.get(id) || 0) >= 2 ? 14 : 9;
      if (info.simpleForEach && radiusPt === 9 && o.useForeach) {
        simpleEntries.push(`${info.tid}/${deg}`);
      } else {
        customEntries.push({ tid: info.tid, texLabel: info.texLabel, deg, radiusPt });
      }
    }

    const dotCmd = o.showDots ? '\\draw[line width=0.6pt] (\\p) circle (0.4pt);' : '';
    if (simpleEntries.length) {
      lines.push(`\\foreach \\p/\\g in {${simpleEntries.join(', ')}}{`);
      if (dotCmd) lines.push(dotCmd);
      lines.push('\\path (\\p) node[shift={(\\g:9pt)}]{$\\p$};}');
    }
    for (const ce of customEntries) {
      if (o.showDots) lines.push(`\\draw[line width=0.6pt] (${ce.tid}) circle (0.4pt);`);
      lines.push(`\\path (${ce.tid}) node[shift={(${ce.deg}:${ce.radiusPt}pt)}]{$${ce.texLabel}$};`);
    }

    lines.push('\\end{tikzpicture}');

    // Ensure zero empty lines inside tikzpicture (Rule T08)
    const code = lines.filter((l) => l.trim().length > 0).join('\n');
    const validation = validateTikz(code);

    return {
      code,
      stats: {
        points: sortedIds.length,
        primaryPoints: primaryOrder.length,
        symbolicPoints: resolvedSymbolic.size,
        shapes: renderShapes.length,
        gridStep: grid.gridStep,
        rmsError: Number((grid.error || 0).toFixed(4)),
        aspectError: Number((grid.aspectErr || 0).toFixed(4))
      },
      validation
    };
  }

  // ============================================================================
  // 6. 12-RULE PREFLIGHT VALIDATOR (DoMinhMath / MEA v5 Invariants)
  // ============================================================================
  function validateTikz(code) {
    const src = String(code || '').trim();
    const errors = [];
    const warnings = [];
    const checks = [];

    const record = (id, label, passed, severity, detail) => {
      checks.push({ id, label, passed, severity, detail });
      if (!passed) {
        if (severity === 'warn') warnings.push(`[${id}] ${detail}`);
        else errors.push(`[${id}] ${detail}`);
      }
    };

    if (!src) {
      record('R01', 'Mã TikZ không rỗng', false, 'err', 'Chưa có mã TikZ để kiểm tra.');
      return { ok: false, errors, warnings, checks, passedCount: 0, totalCount: 12 };
    }

    // Rule 1: Pure tikzpicture / circuitikz (NO preamble!)
    const hasPreamble = /\\(documentclass|usepackage|usetikzlibrary|begin\{document\}|end\{document\})/.test(src);
    record('R01', 'Mã thuần không preamble (T01)', !hasPreamble, 'err',
      hasPreamble ? 'Phát hiện \\documentclass / \\usepackage / \\begin{document} — phải chỉ xuất môi trường tikzpicture thuần.' : 'Đạt');

    // Rule 2: Proper begin/end envelope
    const properEnv = /^\\begin\{(tikzpicture|circuitikz)\}[\s\S]*\\end\{\1\}$/.test(src);
    record('R02', 'Mở/đóng đúng môi trường tikzpicture (T06)', properEnv, 'err',
      properEnv ? 'Đạt' : 'Mã phải bắt đầu bằng \\begin{tikzpicture} và kết thúc bằng \\end{tikzpicture}.');

    // Rule 3: Balanced environments
    const envStack = [];
    let envOk = true;
    const envRe = /\\(begin|end)\{([a-zA-Z0-9*]+)\}/g;
    let m;
    while ((m = envRe.exec(src)) !== null) {
      if (m[1] === 'begin') envStack.push(m[2]);
      else {
        const top = envStack.pop();
        if (top !== m[2]) { envOk = false; break; }
      }
    }
    if (envStack.length !== 0) envOk = false;
    record('R03', 'Môi trường \\begin/\\end cân bằng (T06)', envOk, 'err',
      envOk ? 'Đạt' : 'Môi trường lồng nhau mở/đóng không khớp.');

    // Rule 4: Balanced braces {}, brackets [], parens ()
    let b1 = 0, b2 = 0, b3 = 0, balOk = true;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '\\' && i + 1 < src.length) { i++; continue; }
      if (ch === '{') b1++; else if (ch === '}') b1--;
      else if (ch === '[') b2++; else if (ch === ']') b2--;
      else if (ch === '(') b3++; else if (ch === ')') b3--;
      if (b1 < 0 || b2 < 0 || b3 < 0) { balOk = false; break; }
    }
    if (b1 !== 0 || b2 !== 0 || b3 !== 0) balOk = false;
    record('R04', 'Dấu ngoặc {}, [], () cân bằng (T07)', balOk, 'err',
      balOk ? 'Đạt' : `Ngoặc mất cân bằng ({}:${b1}, []:${b2}, ():${b3}).`);

    // Rule 5: No blank lines inside tikzpicture (T08)
    const hasBlankLine = /\n[ \t]*\n/.test(src);
    record('R05', 'Không có dòng trống trong tikzpicture (T08)', !hasBlankLine, 'err',
      hasBlankLine ? 'Có dòng trống bên trong tikzpicture (dễ gây lỗi Paragraph ended).' : 'Đạt');

    // Rule 6: No line cap=round (Rule 4.4)
    const hasLineCapRound = /line\s+cap\s*=\s*round/.test(src);
    record('R06', 'Cấm line cap=round (Quy tắc 4.4)', !hasLineCapRound, 'err',
      hasLineCapRound ? 'Phát hiện line cap=round — bị cấm theo chuẩn DoMinhMath.' : 'Đạt');

    // Rule 7: Font \normalsize & no forbidden size commands (Rule 4.1, T16)
    const hasNormFont = /every\s+node\/\.style\s*=\s*\{[^}]*font\s*=\s*\\normalsize/.test(src);
    const hasBadFont = /\\(Large|LARGE|huge|Huge|large|small|tiny|footnotesize|scriptsize|bf\b|textbf)/.test(src);
    record('R07', 'Font chuẩn \\normalsize (Quy tắc 4.1)', hasNormFont && !hasBadFont, hasBadFont ? 'err' : 'warn',
      hasBadFont ? 'Chứa lệnh cỡ chữ bị cấm (\\Large/\\small/\\tiny/\\textbf).' : (!hasNormFont ? 'Nên đặt every node/.style={font=\\normalsize}.' : 'Đạt'));

    // Rule 8: No comma decimals in coordinates/dimensions (T12)
    const hasCommaDec = /(?:scale\s*=|line\s+width\s*=|radius\s*=|circle\s*\()\s*-?\d+,\d+/.test(src) ||
      /\d+,\d+\s*(?:cm|pt|mm)\b/.test(src);
    record('R08', 'Số thập phân dùng dấu chấm (T12)', !hasCommaDec, 'err',
      hasCommaDec ? 'Phát hiện số thập phân dùng dấu phẩy trong mã TikZ.' : 'Đạt');

    // Rule 9: No raw (x,y) coordinates in right angle / angle pics (Rule 4.10, T14)
    const hasRawAngleCoord = /(?:right\s+angle|angle)\s*=\s*[^}]*\(\s*-?\d/.test(src);
    record('R09', 'Góc/góc vuông chỉ dùng TÊN đỉnh (T14)', !hasRawAngleCoord, 'err',
      hasRawAngleCoord ? 'Phát hiện tọa độ số (x,y) trong right angle/angle — phải dùng tên \\coordinate.' : 'Đạt');

    // Rule 10: No unsupported libraries / forbidden legacy commands (Rules 2, T02, T18, T19)
    const hasForbidden = /\\tkzTabVar\b|pattern\s*=\s*north\s+(?:west|east)\s+lines|\bhobby\b|\bdrop\s+shadow\b/.test(src);
    record('R10', 'Chỉ dùng thư viện chuẩn MEA v5 (T02/T19)', !hasForbidden, 'err',
      hasForbidden ? 'Chứa lệnh/pattern cũ không được hỗ trợ trong MEA v5.' : 'Đạt');

    // Rule 11: Drawing commands properly terminated with semicolon (T05)
    const cmdLines = src.split('\n').map((l) => l.trim()).filter((l) => /^\\(coordinate|draw|fill|path|shade|clip)\b/.test(l));
    let missingSemi = false;
    for (const cl of cmdLines) {
      if (!cl.endsWith(';') && !cl.endsWith('}') && !cl.endsWith('{')) {
        // Multi-line statements allowed if full text ends before next backslash command; check simple single-line case
        missingSemi = true;
        break;
      }
    }
    record('R11', 'Lệnh vẽ kết thúc đúng dấu ";" (T05)', !missingSemi, 'err',
      missingSemi ? 'Có lệnh \\coordinate/\\draw/\\fill/\\path thiếu dấu ";" cuối dòng.' : 'Đạt');

    // Rule 12: No % comments inside declare function & no above/below in \foreach labels (4.2, 4.6)
    const declMatch = src.match(/declare\s+function\s*=\s*\{([^}]*)\}/);
    const declHasComment = !!(declMatch && declMatch[1].includes('%'));
    const foreachBadDir = /\\foreach[\s\S]*?node\s*\[\s*(?:above|below|left|right)\b/.test(src);
    record('R12', 'Chuẩn declare function & \\foreach góc (4.2/4.6)', !declHasComment && !foreachBadDir, 'warn',
      declHasComment ? 'Có comment % trong declare function.' : (foreachBadDir ? 'Nên dùng shift={(\\g:9pt)} trong \\foreach thay cho above/below.' : 'Đạt'));

    const passedCount = checks.filter((c) => c.passed).length;
    return {
      ok: errors.length === 0,
      errors,
      warnings,
      checks,
      passedCount,
      totalCount: checks.length
    };
  }

  // ============================================================================
  // 7. STUDIO MODAL UI (Live Editor + Preflight + Compile Preview + AI + MEA Push)
  // ============================================================================
  let modalBackdrop = null;
  let lastRenderedPng = '';

  const DOMIINH_AI_SYSTEM_PROMPT =
    'Bạn là chuyên gia TikZ Toán học phong cách Thầy Đỗ Minh (MatrixExamAI Pro v5). ' +
    'Hãy tối ưu mã TikZ sau sao cho tọa độ gọn đẹp (số nguyên hoặc .5 sạch), dùng declare function={...}, ' +
    'every node/.style={font=\\normalsize}, không dùng line cap=round, không dòng trống, không preamble, ' +
    'cạnh khuất dashed line width=0.4pt, cạnh thấy line width=0.6pt, điểm circle (0.4pt) và nhãn \\foreach \\p/\\g dùng shift={(\\g:9pt)}. ' +
    'CHỈ trả về đúng một khối \\begin{tikzpicture}...\\end{tikzpicture}, không giải thích thêm.';

  function extractTikzBlock(text) {
    const raw = String(text || '').trim();
    const m = raw.match(/\\begin\{(tikzpicture|circuitikz)\}[\s\S]*?\\end\{\1\}/);
    return m ? m[0].trim() : raw.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim();
  }

  function ensureModal() {
    if (modalBackdrop) return modalBackdrop;
    const el = document.createElement('div');
    el.id = 'mn-tikz-export-backdrop';
    el.className = 'mn-v80-backdrop';
    el.innerHTML = `
      <div class="mn-v80-modal wide" role="dialog" aria-modal="true" aria-label="Xuất mã TikZ chuẩn số nguyên DoMinhMath">
        <div class="mn-v80-head">
          <div class="mn-v80-title">
            <span>📐 Xuất mã TikZ Chuẩn Số Nguyên (DoMinhMath / MEA v5)</span>
            <span class="mn-v80-badge ok" id="mn-tikz-pf-badge">Preflight</span>
          </div>
          <button type="button" class="mn-v80-close" id="mn-tikz-close" title="Đóng">✕</button>
        </div>
        <div class="mn-v80-body">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
              <label class="mn-v80-toggle">
                <input type="checkbox" id="mn-tikz-opt-strict" />
                <span>Số nguyên nghiêm ngặt (Z²)</span>
              </label>
              <label class="mn-v80-toggle">
                <input type="checkbox" id="mn-tikz-opt-foreach" checked />
                <span>Gộp \\foreach</span>
              </label>
              <label class="mn-v80-toggle">
                <input type="checkbox" id="mn-tikz-opt-dots" checked />
                <span>Hiện chấm điểm (0.4pt)</span>
              </label>
              <label class="mn-v80-toggle">
                <input type="checkbox" id="mn-tikz-opt-hatch" />
                <span>Tô gạch chéo thiết diện</span>
              </label>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button type="button" class="mn-v80-btn sm primary" id="mn-tikz-open-betatikz" title="Mở Studio TikZ Chuyển Động, xuất dự án BetaTikz (.betatikz.json) &amp; JSON (Ctrl+Alt+J)">🎬 TikZ Chuyển Động / BetaTikz &amp; JSON</button>
              <button type="button" class="mn-v80-btn sm" id="mn-tikz-open-json" title="Xuất chuẩn JSON Đa Năng mn-geo-motion/2.0 cho các mô hình AI hoặc ứng dụng khác">📤 Xuất JSON</button>
              <button type="button" class="mn-v80-btn sm" id="mn-tikz-regen">🔄 Tạo lại từ bảng vẽ</button>
            </div>
          </div>

          <div class="mn-tikz-split">
            <div style="display:flex;flex-direction:column;gap:8px;">
              <textarea id="mn-tikz-code" class="mn-tikz-editor" spellcheck="false" placeholder="% Mã TikZ sẽ xuất hiện ở đây..."></textarea>
              <div id="mn-tikz-stats" style="font-size:11.5px;color:var(--mn80-text-muted);"></div>
            </div>

            <div class="mn-tikz-preview-pane">
              <div class="mn-tikz-preview-stage empty" id="mn-tikz-preview-stage">
                <div style="max-width:300px;line-height:1.55;">Nhấn <b>"▶ Biên dịch xem thử"</b> để xem ảnh kết quả biên dịch bằng LaTeX/TikZ.</div>
              </div>
              <div class="mn-tikz-diag-list" id="mn-tikz-diag-list"></div>
            </div>
          </div>
        </div>
        <div class="mn-v80-foot">
          <div class="mn-v80-foot-group">
            <button type="button" class="mn-v80-btn" id="mn-tikz-copy">📋 Sao chép</button>
            <button type="button" class="mn-v80-btn" id="mn-tikz-save">💾 Lưu .tex</button>
            <button type="button" class="mn-v80-btn" id="mn-tikz-compile">▶ Biên dịch xem thử</button>
          </div>
          <div class="mn-v80-foot-group">
            <button type="button" class="mn-v80-btn" id="mn-tikz-ai">✨ AI tối ưu chuẩn MEA v5</button>
            <button type="button" class="mn-v80-btn primary" id="mn-tikz-push">📤 Đẩy sang Kho hình MatrixExamAI Pro</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    modalBackdrop = el;

    const codeArea = el.querySelector('#mn-tikz-code');
    const pfBadge = el.querySelector('#mn-tikz-pf-badge');
    const diagList = el.querySelector('#mn-tikz-diag-list');
    const statsEl = el.querySelector('#mn-tikz-stats');
    const stageEl = el.querySelector('#mn-tikz-preview-stage');

    const close = () => el.classList.remove('open');
    el.querySelector('#mn-tikz-close').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    const readOpts = () => ({
      strictInteger: !!el.querySelector('#mn-tikz-opt-strict').checked,
      allowHalf: !el.querySelector('#mn-tikz-opt-strict').checked,
      useForeach: !!el.querySelector('#mn-tikz-opt-foreach').checked,
      showDots: !!el.querySelector('#mn-tikz-opt-dots').checked,
      hatchFills: !!el.querySelector('#mn-tikz-opt-hatch').checked
    });

    const renderValidation = (val) => {
      if (!val) return;
      if (val.ok && val.warnings.length === 0) {
        pfBadge.className = 'mn-v80-badge ok';
        pfBadge.textContent = `✓ ${val.passedCount}/${val.totalCount} Chuẩn MEA v5`;
      } else if (val.ok) {
        pfBadge.className = 'mn-v80-badge warn';
        pfBadge.textContent = `⚠ ${val.passedCount}/${val.totalCount} (${val.warnings.length} cảnh báo)`;
      } else {
        pfBadge.className = 'mn-v80-badge danger';
        pfBadge.textContent = `✕ ${val.errors.length} lỗi Preflight`;
      }
      diagList.innerHTML = val.checks.map((c) => {
        const cls = c.passed ? 'ok' : (c.severity === 'warn' ? 'warn' : 'err');
        const ic = c.passed ? '✓' : (c.severity === 'warn' ? '⚠' : '✕');
        return `<div class="mn-tikz-diag-item ${cls}">${ic} <b>${escHtml(c.id)}</b> ${escHtml(c.label)}${c.passed ? '' : ' — ' + escHtml(c.detail)}</div>`;
      }).join('');
    };

    const regenerate = () => {
      lastRenderedPng = '';
      const res = generateTikz(null, readOpts());
      if (!res.code) {
        codeArea.value = '% Chưa có đối tượng hình học nào trên trang hiện tại để xuất mã TikZ.';
        statsEl.textContent = 'Hãy vẽ hình bằng công cụ Hình học MinNote (hoặc chọn một hình) rồi mở lại cửa sổ này.';
        renderValidation(validateTikz(''));
        return;
      }
      codeArea.value = res.code;
      const st = res.stats;
      statsEl.textContent =
        `Điểm: ${st.points} (${st.primaryPoints} gốc + ${st.symbolicPoints} tính bằng calc) • ` +
        `Hình: ${st.shapes} • Lưới: ${st.gridStep === 1 ? 'Số nguyên Z²' : 'Nửa nguyên (.5)'} • ` +
        `Sai số chuẩn hóa: ${(st.rmsError * 100).toFixed(1)}%`;
      renderValidation(res.validation);
    };

    codeArea.addEventListener('input', () => {
      renderValidation(validateTikz(codeArea.value));
    });

    ['#mn-tikz-opt-strict', '#mn-tikz-opt-foreach', '#mn-tikz-opt-dots', '#mn-tikz-opt-hatch'].forEach((id) => {
      el.querySelector(id).addEventListener('change', regenerate);
    });
    el.querySelector('#mn-tikz-regen').addEventListener('click', regenerate);
    el.querySelector('#mn-tikz-open-betatikz').addEventListener('click', () => {
      if (window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.openStudioModal === 'function') {
        close();
        window.MinNoteMotionBridge.openStudioModal('betatikz');
      } else {
        toast('Chưa nạp mô-đun MinNoteMotionBridge.');
      }
    });
    el.querySelector('#mn-tikz-open-json').addEventListener('click', () => {
      if (window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.openStudioModal === 'function') {
        close();
        window.MinNoteMotionBridge.openStudioModal('export_json');
      } else {
        toast('Chưa nạp mô-đun MinNoteMotionBridge.');
      }
    });

    el.querySelector('#mn-tikz-copy').addEventListener('click', async () => {
      const txt = codeArea.value.trim();
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        toast('📋 Đã sao chép mã TikZ chuẩn DoMinhMath!');
      } catch (_) {
        codeArea.select();
        document.execCommand('copy');
        toast('📋 Đã sao chép mã TikZ!');
      }
    });

    el.querySelector('#mn-tikz-save').addEventListener('click', async () => {
      const txt = codeArea.value.trim();
      if (!txt) return;
      const fileName = `minnote_figure_${Date.now().toString(36)}.tex`;
      if (window.MinNoteMeaSync && window.MinNoteMeaSync.isDesktopBridge()) {
        try {
          const res = await window.MinNoteMeaSync.request('SAVE_MEDIA_FILE', {
            fileName,
            ext: '.tex',
            textData: txt
          });
          if (res && !res.cancelled) toast('💾 Đã lưu tệp ' + (res.fileName || fileName));
        } catch (err) {
          toast('Lỗi lưu .tex: ' + (err.message || err));
        }
      } else {
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    });

    el.querySelector('#mn-tikz-compile').addEventListener('click', async () => {
      const txt = codeArea.value.trim();
      if (!txt) return;
      if (!window.noteRenderer || typeof window.noteRenderer.renderTikz !== 'function') {
        stageEl.className = 'mn-tikz-preview-stage empty';
        stageEl.innerHTML = '<div style="max-width:300px;line-height:1.55;">Trình biên dịch TeX/TikZ trực tiếp chỉ khả dụng trên ứng dụng MinNote Windows có cài TeX Live / MiKTeX.</div>';
        return;
      }
      const btn = el.querySelector('#mn-tikz-compile');
      btn.disabled = true;
      btn.textContent = '⏳ Đang biên dịch...';
      stageEl.className = 'mn-tikz-preview-stage empty';
      stageEl.innerHTML = '<div>Đang biên dịch bằng pdflatex...</div>';
      try {
        const res = await window.noteRenderer.renderTikz(txt);
        if (res && res.src) {
          lastRenderedPng = res.src;
          stageEl.className = 'mn-tikz-preview-stage';
          stageEl.innerHTML = `<img src="${res.src}" alt="TikZ Preview" />`;
          toast('✓ Biên dịch xem trước TikZ thành công!');
        } else {
          stageEl.innerHTML = '<div>Không nhận được ảnh biên dịch từ pdflatex.</div>';
        }
      } catch (err) {
        stageEl.className = 'mn-tikz-preview-stage empty';
        stageEl.innerHTML = `<div style="max-width:320px;line-height:1.5;color:var(--mn80-danger);">Lỗi biên dịch TikZ: ${escHtml(err.message || err)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '▶ Biên dịch xem thử';
      }
    });

    el.querySelector('#mn-tikz-ai').addEventListener('click', async () => {
      const txt = codeArea.value.trim();
      if (!txt) return;
      if (!window.MinNoteMeaSync || typeof window.MinNoteMeaSync.executeAiPrompt !== 'function') {
        toast('Chưa kết nối mô-đun AI MatrixExamAI Pro.');
        return;
      }
      const btn = el.querySelector('#mn-tikz-ai');
      btn.disabled = true;
      btn.textContent = '✨ AI đang tối ưu...';
      try {
        const res = await window.MinNoteMeaSync.executeAiPrompt(
          'Hãy tối ưu mã TikZ sau giữ nguyên chính xác hình học và nhãn điểm:\n\n' + txt,
          DOMIINH_AI_SYSTEM_PROMPT,
          { timeoutMs: 180000 }
        );
        const cleaned = extractTikzBlock(res && res.content);
        if (cleaned && cleaned.includes('\\begin{tikzpicture}')) {
          codeArea.value = cleaned;
          renderValidation(validateTikz(cleaned));
          toast(`✨ AI (${res.provider || 'MEA'}) đã tối ưu mã TikZ chuẩn DoMinhMath!`);
        } else {
          toast('AI không trả về khối tikzpicture hợp lệ.');
        }
      } catch (err) {
        toast('Lỗi AI tối ưu TikZ: ' + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = '✨ AI tối ưu chuẩn MEA v5';
      }
    });

    el.querySelector('#mn-tikz-push').addEventListener('click', async () => {
      const txt = codeArea.value.trim();
      if (!txt || !txt.includes('\\begin{tikzpicture}')) {
        toast('Cần mã TikZ hợp lệ trước khi đẩy sang MatrixExamAI Pro.');
        return;
      }
      if (!window.MinNoteMeaSync || typeof window.MinNoteMeaSync.pushCurrentFigure !== 'function') {
        toast('Chưa nạp mô-đun đồng bộ MatrixExamAI Pro.');
        return;
      }
      const btn = el.querySelector('#mn-tikz-push');
      btn.disabled = true;
      btn.textContent = '⏳ Đang đẩy sang MEA...';
      try {
        await window.MinNoteMeaSync.pushCurrentFigure({
          tikzCode: txt,
          pngDataUrl: lastRenderedPng || undefined,
          tags: ['MinNote', 'TikZ']
        });
      } catch (err) {
        toast('Lỗi đẩy sang Kho hình MEA: ' + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = '📤 Đẩy sang Kho hình MatrixExamAI Pro';
      }
    });

    el._regenerate = regenerate;
    return el;
  }

  function openModal() {
    const el = ensureModal();
    el.classList.add('open');
    if (typeof el._regenerate === 'function') el._regenerate();
  }

  const api = {
    openModal,
    generateTikz,
    validateTikz,
    evalGeo
  };

  if (typeof window !== 'undefined') {
    window.MinNoteTikzExport = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
