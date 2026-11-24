/**
 * MinNote v0.0.8.0 — Tight-Cropped Construction Replay Exporter (Animated GIF89a & WebM/MP4 Video)
 * - Strict tight auto-crop around constructed geometry shapes, curves, points & labels (zero UI chrome!)
 * - Deterministic offscreen frame renderer respecting step effects, easing, durationMul, rev, tempHide, showGuides
 * - Optional realistic Hand-Pen Cursor (window.MinNoteHandCursor.paintReplayTip)
 * - Optional 360° 3D Auto-Orbit finale frames when 3D solid is present
 * - Self-contained fast Median-Cut + RGB555 LUT + LZW GIF89a encoder (Netscape 2.0 infinite loop)
 * - MediaRecorder WebM/MP4 export with progress bar & cancel support
 * - Saves cleanly via C# SAVE_MEDIA_FILE or browser download fallback
 */
(function () {
  'use strict';

  function getBoard() {
    return window.__minnoteBoard || window.__meaBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || null;
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }

  // ============================================================================
  // 1. STANDALONE GEOMETRY EVALUATOR & STRICT TIGHT BOUNDING BOX
  // ============================================================================
  const ELLIPSE_RATIO = 0.3;

  function dist2d(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function evalPointDef(def, getPt, geo) {
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
        if (def.perp) { const tmp = dx; dx = -dy; dy = tmp; }
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
        const cm = (geo && geo.pxPerCm) || 56;
        const dPx = Math.max(1e-3, (def.val != null ? def.val : 2) * cm);
        const ang = def.ang || 0;
        return { x: a.x + dPx * Math.cos(ang), y: a.y + dPx * Math.sin(ang) };
      }
      case 'polar': {
        const o = getPt(def.o), r = getPt(def.ref);
        if (!o || !r) return null;
        const base = Math.atan2(r.y - o.y, r.x - o.x);
        const deg = def.fixedAng ? (def.angVal != null ? def.angVal : 60) : (def.curAngDeg != null ? def.curAngDeg : 60);
        const rad = base - deg * Math.PI / 180;
        const cm = (geo && geo.pxPerCm) || 56;
        const dPx = def.fixedDist ? Math.max(1e-3, (def.distVal != null ? def.distVal : 2) * cm) : Math.max(4, def.curDistPx || 120);
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
        // Line-circle or circle-circle
        const pts = [];
        if (def.c1 && def.c2) {
          const r1 = dist2d(p1, p2), r2 = dist2d(p3, p4);
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
          const r = def.c1 ? dist2d(p1, p2) : dist2d(p3, p4);
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
        const d1 = dist2d(a, o), d2 = dist2d(b, o);
        if (d1 < 1e-9 || d2 < 1e-9) return null;
        let lx = (a.x - o.x) / d1 + (b.x - o.x) / d2;
        let ly = (a.y - o.y) / d1 + (b.y - o.y) / d2;
        const m = Math.hypot(lx, ly);
        if (m < 1e-9) { lx = -(a.y - o.y) / d1; ly = (a.x - o.x) / d1; }
        else { lx /= m; ly /= m; }
        return { x: o.x + lx * d1, y: o.y + ly * d1 };
      }
      case 'path': {
        if (!Array.isArray(def.pts) || !def.pts.length) return null;
        const ps = def.pts.map(getPt);
        if (ps.some((p) => !p)) return null;
        const k = def.k != null ? def.k : 0;
        if (def.on === 'circle' && ps.length >= 2) {
          const r = dist2d(ps[0], ps[1]);
          return { x: ps[0].x + r * Math.cos(k), y: ps[0].y + r * Math.sin(k) };
        }
        if (def.on === 'ellipse' && ps.length >= 3) {
          const rx = dist2d(ps[0], ps[1]), ry = dist2d(ps[0], ps[2]);
          const rot = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
          const lx = rx * Math.cos(k), ly = ry * Math.sin(k);
          return {
            x: ps[0].x + lx * Math.cos(rot) - ly * Math.sin(rot),
            y: ps[0].y + lx * Math.sin(rot) + ly * Math.cos(rot)
          };
        }
        return ps[0];
      }
      default:
        return null;
    }
  }

  function evalGeoCoords(geo, board) {
    if (board && typeof board.evalGeo === 'function') {
      try {
        const res = board.evalGeo(geo);
        if (res && typeof res.get === 'function') return res;
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
      const res = evalPointDef(pt.def, getPt, geo);
      visiting.delete(id);
      const valid = res && Number.isFinite(res.x) && Number.isFinite(res.y) ? res : null;
      map.set(id, valid);
      return valid;
    };
    for (const id of Object.keys(geo.points)) getPt(id);
    return map;
  }

  function expandBBoxWithShape(box, sh, coords) {
    if (!sh || sh.hidden || sh.kind === 'solid' || sh.kind === 'flatLink') return;
    const pts = (sh.pts || []).map((id) => coords.get(id)).filter(Boolean);
    if (!pts.length) return;
    const include = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x < box.minX) box.minX = x;
      if (x > box.maxX) box.maxX = x;
      if (y < box.minY) box.minY = y;
      if (y > box.maxY) box.maxY = y;
    };
    for (const p of pts) include(p.x, p.y);

    if (sh.kind === 'circle' && pts.length >= 2) {
      const r = dist2d(pts[0], pts[1]);
      include(pts[0].x - r, pts[0].y - r);
      include(pts[0].x + r, pts[0].y + r);
    } else if (sh.kind === 'annulus' && pts.length >= 2) {
      const r = dist2d(pts[0], pts[1]);
      include(pts[0].x - r, pts[0].y - r);
      include(pts[0].x + r, pts[0].y + r);
    } else if ((sh.kind === 'sphere' || sh.kind === 'cone' || sh.kind === 'cylinder' || sh.kind === 'cap') && pts.length >= 2) {
      const r = dist2d(pts[0], pts[1]);
      const b = r * ELLIPSE_RATIO;
      include(pts[0].x - r, pts[0].y - (sh.kind === 'sphere' ? r : b));
      include(pts[0].x + r, pts[0].y + (sh.kind === 'sphere' ? r : b));
      if (pts[2]) {
        if (sh.kind === 'cylinder') {
          include(pts[2].x - r, pts[2].y - b);
          include(pts[2].x + r, pts[2].y + b);
        } else {
          include(pts[2].x, pts[2].y);
        }
      }
    } else if (sh.kind === 'frustumCone' && pts.length >= 4) {
      const r1 = dist2d(pts[0], pts[1]);
      const r2 = dist2d(pts[2], pts[3]);
      include(pts[0].x - r1, pts[0].y - r1 * ELLIPSE_RATIO);
      include(pts[0].x + r1, pts[0].y + r1 * ELLIPSE_RATIO);
      include(pts[2].x - r2, pts[2].y - r2 * ELLIPSE_RATIO);
      include(pts[2].x + r2, pts[2].y + r2 * ELLIPSE_RATIO);
    } else if (sh.kind === 'ellipse' && pts.length >= 3) {
      const rx = dist2d(pts[0], pts[1]), ry = dist2d(pts[0], pts[2]);
      const rm = Math.max(rx, ry);
      include(pts[0].x - rm, pts[0].y - rm);
      include(pts[0].x + rm, pts[0].y + rm);
    } else if (sh.kind === 'parabola' && pts.length >= 3) {
      const [n, o, s] = pts;
      for (let i = 0; i <= 16; i++) {
        const t = -1 + i / 8;
        include(n.x + (o.x - n.x) * t * t + (s.x - o.x) * t, n.y + (o.y - n.y) * t * t + (s.y - o.y) * t);
      }
    } else if ((sh.kind === 'arc' || sh.kind === 'sector') && pts.length >= 3) {
      const r = dist2d(pts[0], pts[1]);
      const a0 = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      let span = (a0 - Math.atan2(pts[2].y - pts[0].y, pts[2].x - pts[0].x)) % (2 * Math.PI);
      if (span < 0) span += 2 * Math.PI;
      if (span < 1e-6) span = 2 * Math.PI;
      for (let i = 0; i <= 24; i++) {
        const a = a0 - span * (i / 24);
        include(pts[0].x + r * Math.cos(a), pts[0].y + r * Math.sin(a));
      }
    }
  }

  function computeTightBBox(geo, coords, scopeShapes, scopePoints, labelMargin) {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const margin = Number.isFinite(labelMargin) ? labelMargin : 30;

    for (const sh of (geo.shapes || [])) {
      if (scopeShapes && !scopeShapes.has(sh.id)) continue;
      expandBBoxWithShape(box, sh, coords);
    }
    for (const pt of Object.values(geo.points || {})) {
      if (!pt || pt.hidden || !pt.show) continue;
      if (scopePoints && !scopePoints.has(pt.id)) continue;
      const c = coords.get(pt.id);
      if (!c) continue;
      const pad = pt.label ? margin : 10;
      if (c.x - pad < box.minX) box.minX = c.x - pad;
      if (c.x + pad > box.maxX) box.maxX = c.x + pad;
      if (c.y - pad < box.minY) box.minY = c.y - pad;
      if (c.y + pad > box.maxY) box.maxY = c.y + pad;
    }

    if (!Number.isFinite(box.minX)) {
      return { minX: 100, minY: 100, maxX: 500, maxY: 400, w: 400, h: 300 };
    }
    return {
      minX: box.minX,
      minY: box.minY,
      maxX: box.maxX,
      maxY: box.maxY,
      w: Math.max(40, box.maxX - box.minX),
      h: Math.max(40, box.maxY - box.minY)
    };
  }

  // ============================================================================
  // 2. FALLBACK DETERMINISTIC STEP FRAME RENDERER (with 8 effects & tip tracking)
  // ============================================================================
  function applyEasing(t, easing) {
    const x = Math.max(0, Math.min(1, t));
    switch (easing) {
      case 'linear': return x;
      case 'easeOut': return 1 - Math.pow(1 - x, 3);
      case 'spring': {
        if (x <= 0 || x >= 1) return x;
        return 1 - Math.exp(-6.5 * x) * Math.cos(11 * x);
      }
      case 'easeInOut':
      default:
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }
  }

  function shapePolyline(sh, coords) {
    const pts = (sh.pts || []).map((id) => coords.get(id)).filter(Boolean);
    if (!pts.length) return [];
    switch (sh.kind) {
      case 'segment':
      case 'line':
      case 'ray':
        return pts.length >= 2 ? [{ pts: [pts[0], pts[1]], dashed: !!sh.dashed }] : [];
      case 'polygon':
      case 'plane':
        return pts.length >= 3 ? [{ pts: [...pts, pts[0]], closed: true, dashed: !!sh.dashed, fill: sh.fill }] : [];
      case 'circle': {
        if (pts.length < 2) return [];
        const r = dist2d(pts[0], pts[1]);
        const arr = [];
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          arr.push({ x: pts[0].x + r * Math.cos(a), y: pts[0].y + r * Math.sin(a) });
        }
        return [{ pts: arr, closed: true, dashed: !!sh.dashed }];
      }
      case 'cone':
      case 'cylinder':
      case 'sphere': {
        if (pts.length < 2) return [];
        const [o, rp, top] = pts;
        const r = dist2d(o, rp);
        const b = r * ELLIPSE_RATIO;
        const mkArc = (a0, a1, cy, rx, ry, n) => {
          const a = [];
          for (let i = 0; i <= n; i++) {
            const t = a0 + (a1 - a0) * (i / n);
            a.push({ x: o.x + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
          }
          return a;
        };
        if (sh.kind === 'sphere') {
          return [
            { pts: mkArc(0, Math.PI * 2, o.y, r, r, 72), closed: true },
            { pts: mkArc(0, Math.PI, o.y, r, b, 36) },
            { pts: mkArc(Math.PI, Math.PI * 2, o.y, r, b, 36), dashed: true }
          ];
        }
        const out = [
          { pts: mkArc(0, Math.PI, o.y, r, b, 36) },
          { pts: mkArc(Math.PI, Math.PI * 2, o.y, r, b, 36), dashed: true }
        ];
        if (top) {
          if (sh.kind === 'cone') {
            out.push({ pts: [{ x: o.x - r, y: o.y }, top, { x: o.x + r, y: o.y }] });
          } else {
            out.push({ pts: [{ x: o.x - r, y: o.y }, { x: top.x - r, y: top.y }] });
            out.push({ pts: [{ x: o.x + r, y: o.y }, { x: top.x + r, y: top.y }] });
            out.push({ pts: mkArc(0, Math.PI * 2, top.y, r, b, 48), closed: true });
          }
        }
        return out;
      }
      default:
        return pts.length >= 2 ? [{ pts, dashed: !!sh.dashed }] : [];
    }
  }

  function strokePolylinePartial(ctx, pts, frac, rev, color, width, dashed, glow) {
    if (!pts || pts.length < 2 || frac <= 0) return null;
    const seq = rev ? pts.slice().reverse() : pts;
    const segLens = [];
    let total = 0;
    for (let i = 1; i < seq.length; i++) {
      const l = dist2d(seq[i - 1], seq[i]);
      segLens.push(l);
      total += l;
    }
    if (total < 1e-6) return seq[0];
    const target = total * Math.min(1, frac);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dashed ? [9, 7] : []);
    ctx.beginPath();
    ctx.moveTo(seq[0].x, seq[0].y);

    let acc = 0;
    let tip = seq[seq.length - 1];
    let dx = 1, dy = 0;
    for (let i = 0; i < segLens.length; i++) {
      const l = segLens[i];
      if (acc + l >= target) {
        const u = l > 1e-6 ? (target - acc) / l : 1;
        const p0 = seq[i], p1 = seq[i + 1];
        tip = { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u };
        dx = p1.x - p0.x;
        dy = p1.y - p0.y;
        ctx.lineTo(tip.x, tip.y);
        break;
      }
      acc += l;
      ctx.lineTo(seq[i + 1].x, seq[i + 1].y);
    }
    ctx.stroke();

    if (glow && frac < 0.999) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, Math.max(4, width * 2.2), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.36)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, Math.max(2, width), 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }
    ctx.restore();
    return { x: tip.x, y: tip.y, dx, dy };
  }

  function renderFallbackReplayFrame(ctx, geo, coords, replay, stepIdx, stepProgress, bgMode) {
    const isDark = bgMode === 'dark';
    const defaultStroke = isDark ? '#e2e8f0' : '#0f172a';
    const shMap = new Map((geo.shapes || []).map((s) => [s.id, s]));
    const activeSteps = (replay && Array.isArray(replay.steps) ? replay.steps : []).filter((s) => s.enabled !== false);
    const donePts = new Set();
    const animPts = new Map();
    let liveTip = null;

    const markPts = (sh, prog) => {
      for (const pid of (sh.pts || [])) {
        if (prog >= 1) donePts.add(pid);
        else animPts.set(pid, Math.max(animPts.get(pid) || 0, prog));
      }
    };

    for (let i = 0; i < activeSteps.length; i++) {
      if (i > stepIdx) break;
      const st = activeSteps[i];
      const rawP = i < stepIdx ? 1 : Math.max(0, Math.min(1, stepProgress));
      const eff = st.effect || 'draw';
      const prog = i < stepIdx ? 1 : applyEasing(rawP, st.easing || 'easeInOut');
      const items = st.items && st.items.length ? st.items : [{ kind: st.kind, refId: st.refId, rev: !!st.rev }];

      for (const it of items) {
        if (it.kind === 'shape') {
          const sh = shMap.get(it.refId);
          if (!sh || (sh.hidden && !st.tempHide && !st.includeHidden)) continue;
          let drawProg = prog;
          let alphaMul = 1;
          if (st.tempHide) {
            if (i < stepIdx) continue;
            drawProg = Math.min(1, rawP / 0.72);
            alphaMul = rawP < 0.72 ? 1 : Math.max(0, 1 - (rawP - 0.72) / 0.28);
          }
          if (drawProg <= 0 || alphaMul <= 0) continue;

          const strokes = shapePolyline(sh, coords);
          const color = (sh.color && !(isDark && (sh.color === '#000000' || sh.color === '#1a1a1a' || sh.color === '#111827')))
            ? sh.color
            : defaultStroke;
          const width = sh.width || 2.4;

          ctx.save();
          ctx.globalAlpha *= (eff === 'fade' ? drawProg : 1) * alphaMul;
          if (eff === 'slide' && i === stepIdx && drawProg < 1) {
            ctx.translate(0, (1 - drawProg) * 24);
          }
          const frac = (eff === 'fade' || eff === 'zoom' || eff === 'slide') ? 1 : drawProg;
          for (const stLine of strokes) {
            if (stLine.fill && frac >= 0.85) {
              ctx.save();
              ctx.fillStyle = stLine.fill;
              ctx.beginPath();
              stLine.pts.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            const t = strokePolylinePartial(ctx, stLine.pts, frac, !!(it.rev ?? st.rev), color, width, !!stLine.dashed, eff === 'glow');
            if (i === stepIdx && t && rawP < 0.995) {
              liveTip = { x: t.x, y: t.y, dx: t.dx, dy: t.dy, active: true, drawing: true };
            }
          }
          ctx.restore();
          markPts(sh, drawProg);
        } else if (it.kind === 'point') {
          const pt = geo.points[it.refId];
          if (!pt) continue;
          if (i < stepIdx) {
            donePts.add(it.refId);
          } else if (rawP > 0) {
            animPts.set(it.refId, Math.max(animPts.get(it.refId) || 0, prog));
            const c = coords.get(it.refId);
            if (c && rawP < 0.995) {
              liveTip = { x: c.x, y: c.y, dx: 0, dy: 0, active: true, drawing: true };
            }
          }
        }
      }
    }

    // Draw visible points & labels
    ctx.save();
    ctx.font = "italic 23px 'Times New Roman', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pt of Object.values(geo.points || {})) {
      if (!pt || !pt.show || pt.hidden) continue;
      if (replay && replay.scopePoints && !replay.scopePoints.has(pt.id)) continue;
      const ap = donePts.has(pt.id) ? 1 : (animPts.get(pt.id) || 0);
      if (ap <= 0) continue;
      const c = coords.get(pt.id);
      if (!c) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, ap * 1.2);
      if (!pt.noDot) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, (pt.size || 4.8) * Math.min(1, 0.35 + 0.65 * ap), 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#60a5fa' : '#1d4ed8';
        ctx.fill();
      }
      if (pt.label) {
        const lx = c.x + (pt.labelAt ? pt.labelAt.x : 14);
        const ly = c.y + (pt.labelAt ? pt.labelAt.y : -16);
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(pt.label, lx, ly);
      }
      ctx.restore();
    }
    ctx.restore();

    return liveTip;
  }

  function paintExportBackground(ctx, w, h, bgMode, scale) {
    if (bgMode === 'dark') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === 'grid') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const step = Math.max(16, Math.round(32 * (scale || 1)));
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = step; x < w; x += step) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
      }
      for (let y = step; y < h; y += step) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ============================================================================
  // 3. SELF-CONTAINED FAST ANIMATED GIF89a ENCODER (Median-Cut + RGB555 LUT + LZW)
  // ============================================================================
  function buildMedianCutPalette(samplesRgb, maxColors) {
    // Seed key UI/diagram colors so clean lines, white/dark bg & accents stay exact
    const fixed = [
      [255, 255, 255],
      [15, 23, 42],
      [0, 0, 0],
      [37, 99, 235],
      [13, 148, 136],
      [220, 38, 38],
      [248, 250, 252],
      [148, 163, 184]
    ];
    const targetBuckets = Math.max(16, maxColors - fixed.length);

    if (!samplesRgb || samplesRgb.length < 3) {
      const pal = new Uint8Array(256 * 3);
      for (let i = 0; i < 256; i++) {
        const r = ((i >> 5) & 7) * 36;
        const g = ((i >> 2) & 7) * 36;
        const b = (i & 3) * 85;
        pal[i * 3] = r; pal[i * 3 + 1] = g; pal[i * 3 + 2] = b;
      }
      return pal;
    }

    const count = Math.floor(samplesRgb.length / 3);
    const indices = new Uint32Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;

    function boxStats(start, end) {
      let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
      for (let i = start; i < end; i++) {
        const idx = indices[i] * 3;
        const r = samplesRgb[idx], g = samplesRgb[idx + 1], b = samplesRgb[idx + 2];
        if (r < rMin) rMin = r; if (r > rMax) rMax = r;
        if (g < gMin) gMin = g; if (g > gMax) gMax = g;
        if (b < bMin) bMin = b; if (b > bMax) bMax = b;
      }
      const dr = rMax - rMin, dg = gMax - gMin, db = bMax - bMin;
      const ch = (dg >= dr && dg >= db) ? 1 : (dr >= db ? 0 : 2);
      const range = Math.max(dr, dg, db);
      return { start, end, ch, range };
    }

    const boxes = [boxStats(0, count)];
    while (boxes.length < targetBuckets) {
      let bestIdx = -1;
      let bestScore = -1;
      for (let i = 0; i < boxes.length; i++) {
        const bx = boxes[i];
        if (bx.end - bx.start < 2 || bx.range === 0) continue;
        const score = bx.range * Math.sqrt(bx.end - bx.start);
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
      if (bestIdx < 0) break;
      const bx = boxes.splice(bestIdx, 1)[0];
      const ch = bx.ch;
      // Counting sort by selected channel (O(n)!)
      const hist = new Uint32Array(256);
      for (let i = bx.start; i < bx.end; i++) hist[samplesRgb[indices[i] * 3 + ch]]++;
      const half = (bx.end - bx.start) >> 1;
      let acc = 0, splitVal = 0;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= half) { splitVal = v; break; }
      }
      // Partition in-place around splitVal
      let l = bx.start, r = bx.end - 1;
      while (l <= r) {
        while (l <= r && samplesRgb[indices[l] * 3 + ch] <= splitVal) l++;
        while (l <= r && samplesRgb[indices[r] * 3 + ch] > splitVal) r--;
        if (l < r) {
          const tmp = indices[l]; indices[l] = indices[r]; indices[r] = tmp;
          l++; r--;
        }
      }
      let mid = l;
      if (mid <= bx.start || mid >= bx.end) mid = bx.start + half;
      boxes.push(boxStats(bx.start, mid));
      boxes.push(boxStats(mid, bx.end));
    }

    const pal = new Uint8Array(256 * 3);
    let p = 0;
    for (const c of fixed) {
      pal[p * 3] = c[0]; pal[p * 3 + 1] = c[1]; pal[p * 3 + 2] = c[2];
      p++;
    }
    for (const bx of boxes) {
      if (p >= 256) break;
      let sr = 0, sg = 0, sb = 0;
      const n = Math.max(1, bx.end - bx.start);
      for (let i = bx.start; i < bx.end; i++) {
        const idx = indices[i] * 3;
        sr += samplesRgb[idx]; sg += samplesRgb[idx + 1]; sb += samplesRgb[idx + 2];
      }
      pal[p * 3] = Math.round(sr / n);
      pal[p * 3 + 1] = Math.round(sg / n);
      pal[p * 3 + 2] = Math.round(sb / n);
      p++;
    }
    return pal;
  }

  function buildRgb555Lut(palette) {
    const lut = new Uint8Array(32768);
    for (let r5 = 0; r5 < 32; r5++) {
      const r = (r5 << 3) | (r5 >> 2);
      for (let g5 = 0; g5 < 32; g5++) {
        const g = (g5 << 3) | (g5 >> 2);
        for (let b5 = 0; b5 < 32; b5++) {
          const b = (b5 << 3) | (b5 >> 2);
          let best = 0;
          let bestD = 1e9;
          for (let i = 0; i < 256; i++) {
            const dr = r - palette[i * 3];
            const dg = g - palette[i * 3 + 1];
            const db = b - palette[i * 3 + 2];
            const d = dr * dr * 2 + dg * dg * 4 + db * db;
            if (d < bestD) { bestD = d; best = i; if (d === 0) break; }
          }
          lut[(r5 << 10) | (g5 << 5) | b5] = best;
        }
      }
    }
    return lut;
  }

  function mapRgbaToIndices(rgba, lut) {
    const n = rgba.length >> 2;
    const out = new Uint8Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const key = ((rgba[j] & 0xF8) << 7) | ((rgba[j + 1] & 0xF8) << 2) | (rgba[j + 2] >> 3);
      out[i] = lut[key];
    }
    return out;
  }

  function lzwEncodeGif(indices) {
    const MIN_CODE_SIZE = 8;
    const CLEAR = 256;
    const EOI = 257;
    const MAX_CODE = 4096;
    const HASH_SIZE = 5003;

    const hashKeys = new Int32Array(HASH_SIZE);
    const hashVals = new Int16Array(HASH_SIZE);
    hashKeys.fill(-1);

    const out = [MIN_CODE_SIZE];
    const subBlock = new Uint8Array(256);
    let subLen = 0;
    let bitBuf = 0;
    let bitCount = 0;

    const flushSubBlock = () => {
      if (subLen > 0) {
        out.push(subLen);
        for (let i = 0; i < subLen; i++) out.push(subBlock[i]);
        subLen = 0;
      }
    };

    const emitCode = (code, bits) => {
      bitBuf |= (code << bitCount);
      bitCount += bits;
      while (bitCount >= 8) {
        subBlock[subLen++] = bitBuf & 0xFF;
        if (subLen === 255) flushSubBlock();
        bitBuf >>= 8;
        bitCount -= 8;
      }
    };

    let nextCode = 258;
    let codeSize = 9;
    let codeLimit = 512;

    emitCode(CLEAR, codeSize);

    if (indices.length > 0) {
      let prefix = indices[0];
      for (let i = 1; i < indices.length; i++) {
        const suffix = indices[i];
        const key = (prefix << 8) | suffix;
        let slot = ((prefix << 5) ^ suffix) % HASH_SIZE;
        let found = -1;
        while (hashKeys[slot] !== -1) {
          if (hashKeys[slot] === key) { found = hashVals[slot]; break; }
          slot++;
          if (slot >= HASH_SIZE) slot = 0;
        }
        if (found !== -1) {
          prefix = found;
        } else {
          emitCode(prefix, codeSize);
          if (nextCode < MAX_CODE) {
            hashKeys[slot] = key;
            hashVals[slot] = nextCode++;
            if (nextCode > codeLimit && codeSize < 12) {
              codeSize++;
              codeLimit <<= 1;
            }
          } else {
            emitCode(CLEAR, codeSize);
            hashKeys.fill(-1);
            nextCode = 258;
            codeSize = 9;
            codeLimit = 512;
          }
          prefix = suffix;
        }
      }
      emitCode(prefix, codeSize);
    }

    emitCode(EOI, codeSize);
    if (bitCount > 0) {
      subBlock[subLen++] = bitBuf & 0xFF;
    }
    flushSubBlock();
    out.push(0x00); // Block terminator
    return new Uint8Array(out);
  }

  function encodeGif89a(width, height, rgbaFrames, opts) {
    const fps = Math.max(4, Math.min(50, (opts && opts.fps) || 20));
    const delayCs = Math.max(2, Math.round(100 / fps));
    const loop = opts ? opts.loop !== false : true;

    // Sample pixels from up to 6 evenly spaced frames for adaptive palette
    const sampleStep = Math.max(1, Math.floor((width * height) / 4500));
    const sampleIndices = [];
    const pickCount = Math.min(6, rgbaFrames.length);
    for (let k = 0; k < pickCount; k++) {
      const fi = Math.min(rgbaFrames.length - 1, Math.round((k / Math.max(1, pickCount - 1)) * (rgbaFrames.length - 1)));
      const rgba = rgbaFrames[fi];
      for (let p = 0; p < rgba.length; p += sampleStep * 4) {
        sampleIndices.push(rgba[p], rgba[p + 1], rgba[p + 2]);
      }
    }

    const palette = buildMedianCutPalette(new Uint8Array(sampleIndices), 256);
    const lut = buildRgb555Lut(palette);

    const chunks = [];
    const pushBytes = (arr) => chunks.push(arr instanceof Uint8Array ? arr : new Uint8Array(arr));

    // Header + Logical Screen Descriptor
    pushBytes([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      width & 0xFF, (width >> 8) & 0xFF,
      height & 0xFF, (height >> 8) & 0xFF,
      0xF7, // Global Color Table (256 colors, 8-bit)
      0x00, // Background color index
      0x00  // Pixel aspect ratio
    ]);
    pushBytes(palette);

    // Netscape 2.0 Application Extension (infinite loop)
    if (loop) {
      pushBytes([
        0x21, 0xFF, 0x0B,
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30,
        0x03, 0x01, 0x00, 0x00, 0x00
      ]);
    }

    const lastDelayCs = Math.min(200, Math.max(delayCs, 110)); // Hold final frame ~1.1s so viewer reads finished figure

    for (let fi = 0; fi < rgbaFrames.length; fi++) {
      const d = fi === rgbaFrames.length - 1 ? lastDelayCs : delayCs;
      // Graphic Control Extension
      pushBytes([
        0x21, 0xF9, 0x04,
        0x04, // disposal = 1 (do not dispose), no transparency
        d & 0xFF, (d >> 8) & 0xFF,
        0x00, 0x00
      ]);
      // Image Descriptor
      pushBytes([
        0x2C,
        0x00, 0x00, 0x00, 0x00,
        width & 0xFF, (width >> 8) & 0xFF,
        height & 0xFF, (height >> 8) & 0xFF,
        0x00
      ]);
      const indexed = mapRgbaToIndices(rgbaFrames[fi], lut);
      pushBytes(lzwEncodeGif(indexed));
    }

    pushBytes([0x3B]); // Trailer

    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const out = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  // ============================================================================
  // 4. REPLAY EXPORT PIPELINE (GIF & WebM/MP4)
  // ============================================================================
  function buildDefaultStepsFromGeo(geo) {
    const shapes = (geo.shapes || []).filter((s) => s.kind !== 'solid' && s.kind !== 'flatLink' && !s.hidden);
    return shapes.map((sh) => ({
      id: 'exp_' + sh.id,
      kind: 'shape',
      refId: sh.id,
      rev: false,
      enabled: true,
      effect: 'draw',
      easing: 'easeInOut',
      durationMul: 1
    }));
  }

  function resolveExportContext(replayArg) {
    const board = getBoard();
    if (window.MinNoteGeoReplay && typeof window.MinNoteGeoReplay.getExportContext === 'function') {
      try {
        const ctx = window.MinNoteGeoReplay.getExportContext(replayArg);
        if (ctx && ctx.geo && ctx.replay) return Object.assign({ board }, ctx);
      } catch (_) {}
    }

    if (!board || !board.doc || !board.doc.pages) return null;
    const activeReplays = typeof board._getActiveReplays === 'function' ? board._getActiveReplays() : [];
    const replay = replayArg || activeReplays[0] || (board.replay && board.replay.active ? board.replay : null);
    const pageIdx = replay && Number.isInteger(replay.page)
      ? replay.page
      : (typeof board.currentPage === 'function' ? board.currentPage() : 0);
    const pg = board.doc.pages[pageIdx];
    if (!pg || !pg.geo) return null;

    const geo = pg.geo;
    const effectiveReplay = replay || {
      id: 'auto_page',
      page: pageIdx,
      title: 'Dựng hình trang ' + (pageIdx + 1),
      speed: 1,
      steps: buildDefaultStepsFromGeo(geo)
    };
    return { board, pageIdx, pg, geo, replay: effectiveReplay };
  }

  function buildFrameSchedule(replay, fps, includeOrbit360) {
    const activeSteps = (replay.steps || []).filter((s) => s.enabled !== false);
    const speed = Math.max(0.25, replay.speed || 1);
    const frames = [];

    for (let si = 0; si < activeSteps.length; si++) {
      const st = activeSteps[si];
      const durSec = Math.max(0.28, (0.72 * (st.durationMul || 1)) / speed);
      const stepFrames = Math.max(4, Math.round(durSec * fps));
      for (let f = 1; f <= stepFrames; f++) {
        frames.push({ kind: 'step', stepIdx: si, progress: f / stepFrames });
      }
      const pauseSec = Math.max(0, st.pauseAfter || 0);
      const pauseFrames = Math.round(pauseSec * fps);
      for (let p = 0; p < pauseFrames; p++) {
        frames.push({ kind: 'step', stepIdx: si, progress: 1, lifted: true });
      }
    }

    // Hold final constructed frame briefly
    const holdFrames = Math.max(3, Math.round(0.4 * fps));
    const lastIdx = Math.max(0, activeSteps.length - 1);
    for (let h = 0; h < holdFrames; h++) {
      frames.push({ kind: 'step', stepIdx: lastIdx, progress: 1, lifted: true });
    }

    // Optional 360-degree 3D orbit frames at the end
    if (includeOrbit360) {
      const orbitFrames = Math.max(24, Math.round(3.2 * fps));
      for (let k = 1; k <= orbitFrames; k++) {
        frames.push({ kind: 'orbit', angle: (k / orbitFrames) * Math.PI * 2, stepIdx: lastIdx, progress: 1 });
      }
    }

    return frames;
  }

  function computeCanvasDims(bbox, opts) {
    const padding = Number.isFinite(opts.padding) ? opts.padding : 36;
    const srcW = bbox.w + padding * 2;
    const srcH = bbox.h + padding * 2;
    const maxDim = opts.quality === '1080p' ? 1280 : (opts.quality === '720p' ? 880 : 960);
    const baseScale = opts.quality === '1080p' ? 2.0 : 1.5;
    const scale = Math.min(baseScale, maxDim / Math.max(srcW, srcH));
    // Ensure even dimensions for H.264/VP9 video encoders
    const outW = Math.max(160, Math.round((srcW * scale) / 2) * 2);
    const outH = Math.max(120, Math.round((srcH * scale) / 2) * 2);
    return {
      outW,
      outH,
      scale,
      offsetX: -bbox.minX + padding,
      offsetY: -bbox.minY + padding
    };
  }

  function drawSingleExportFrame(canvas, ctx, context, frameSpec, dims, opts) {
    const { board, geo, replay } = context;
    const { outW, outH, scale, offsetX, offsetY } = dims;
    const bgMode = opts.background || 'white';
    const showHand = !!opts.showHand;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paintExportBackground(ctx, outW, outH, bgMode, scale);

    ctx.scale(scale, scale);
    ctx.translate(offsetX, offsetY);

    let tip = null;
    if (board && typeof board.renderReplayExportFrame === 'function') {
      const res = board.renderReplayExportFrame(ctx, replay, frameSpec.stepIdx, frameSpec.progress, {
        bgMode,
        orbitAngle: frameSpec.kind === 'orbit' ? frameSpec.angle : 0,
        showHand: false // We paint calibrated hand right after so sizing is exact!
      });
      if (res && res.tip) tip = res.tip;
      else if (board._replayTip && board._replayTip.active) tip = Object.assign({}, board._replayTip);
    } else {
      const coords = evalGeoCoords(geo, board);
      tip = renderFallbackReplayFrame(ctx, geo, coords, replay, frameSpec.stepIdx, frameSpec.progress, bgMode);
    }

    if (showHand && tip && frameSpec.kind === 'step' && window.MinNoteHandCursor && typeof window.MinNoteHandCursor.paintReplayTip === 'function') {
      const tipCopy = Object.assign({}, tip, {
        active: true,
        drawing: !frameSpec.lifted && tip.drawing !== false
      });
      const handTargetH = Math.max(96, Math.min(185, (outH / scale) * 0.42));
      window.MinNoteHandCursor.paintReplayTip(ctx, tipCopy, null, {
        forceShow: true,
        targetHeight: handTargetH,
        isDark: bgMode === 'dark'
      });
    }

    ctx.restore();
  }

  function uint8ToBase64(bytes) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  async function saveExportedBytes(bytes, fileName, ext, mime) {
    if (window.MinNoteMeaSync && window.MinNoteMeaSync.isDesktopBridge()) {
      const base64Data = uint8ToBase64(bytes);
      const res = await window.MinNoteMeaSync.request('SAVE_MEDIA_FILE', {
        fileName,
        ext,
        base64Data
      }, 60000);
      if (res && !res.cancelled) {
        toast(`✓ Đã lưu tệp ${res.fileName || fileName}!`);
      }
      return res;
    }
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`✓ Đã tải xuống ${fileName}!`);
    return { path: fileName, sizeBytes: bytes.length };
  }

  async function exportGif(replayArg, opts, onProgress, cancelSignal) {
    const o = Object.assign({
      background: 'white',
      quality: '720p',
      fps: 20,
      padding: 36,
      showHand: true,
      orbit360: false,
      loop: true
    }, opts || {});

    const ctxObj = resolveExportContext(replayArg);
    if (!ctxObj) throw new Error('Không tìm thấy hình học hoặc kịch bản dựng hình để xuất GIF.');

    if (o.showHand && window.MinNoteHandCursor && typeof window.MinNoteHandCursor.ensureLoaded === 'function') {
      await window.MinNoteHandCursor.ensureLoaded();
      if (typeof window.MinNoteHandCursor.resetReplaySmoothing === 'function') {
        window.MinNoteHandCursor.resetReplaySmoothing();
      }
    }

    const hasSolid = (ctxObj.geo.shapes || []).some((s) => s.kind === 'solid');
    const coords = evalGeoCoords(ctxObj.geo, ctxObj.board);
    const bbox = computeTightBBox(ctxObj.geo, coords, ctxObj.replay.scopeShapes, ctxObj.replay.scopePoints, 32);
    const dims = computeCanvasDims(bbox, o);
    const schedule = buildFrameSchedule(ctxObj.replay, o.fps, o.orbit360 && hasSolid);

    const canvas = document.createElement('canvas');
    canvas.width = dims.outW;
    canvas.height = dims.outH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const rgbaFrames = [];
    for (let i = 0; i < schedule.length; i++) {
      if (cancelSignal && cancelSignal.cancelled) throw new Error('Đã hủy xuất GIF.');
      drawSingleExportFrame(canvas, ctx, ctxObj, schedule[i], dims, o);
      const imgData = ctx.getImageData(0, 0, dims.outW, dims.outH);
      rgbaFrames.push(new Uint8Array(imgData.data));
      if (onProgress) onProgress(Math.round(((i + 1) / schedule.length) * 75), `Đang vẽ khung ${i + 1}/${schedule.length}...`, canvas);
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    if (cancelSignal && cancelSignal.cancelled) throw new Error('Đã hủy xuất GIF.');
    if (onProgress) onProgress(82, 'Đang nén ảnh động GIF89a (256 màu LZW)...', canvas);
    await new Promise((r) => setTimeout(r, 10));

    const gifBytes = encodeGif89a(dims.outW, dims.outH, rgbaFrames, { fps: o.fps, loop: o.loop });
    if (onProgress) onProgress(96, 'Đang lưu tệp .gif...', canvas);

    const safeTitle = String(ctxObj.replay.title || 'minnote-replay').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 36) || 'minnote-replay';
    const fileName = `${safeTitle}_${Date.now().toString(36)}.gif`;
    const saveRes = await saveExportedBytes(gifBytes, fileName, '.gif', 'image/gif');
    if (onProgress) onProgress(100, `Hoàn tất! (${(gifBytes.length / 1024).toFixed(1)} KB)`, canvas);
    return { bytes: gifBytes, width: dims.outW, height: dims.outH, frames: rgbaFrames.length, fileName, saveRes };
  }

  async function exportVideo(replayArg, opts, onProgress, cancelSignal) {
    const o = Object.assign({
      background: 'white',
      quality: '720p',
      fps: 24,
      padding: 36,
      showHand: true,
      orbit360: false
    }, opts || {});

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Trình duyệt không hỗ trợ MediaRecorder — hãy chọn xuất GIF động.');
    }

    const ctxObj = resolveExportContext(replayArg);
    if (!ctxObj) throw new Error('Không tìm thấy hình học hoặc kịch bản dựng hình để xuất Video.');

    if (o.showHand && window.MinNoteHandCursor && typeof window.MinNoteHandCursor.ensureLoaded === 'function') {
      await window.MinNoteHandCursor.ensureLoaded();
      if (typeof window.MinNoteHandCursor.resetReplaySmoothing === 'function') {
        window.MinNoteHandCursor.resetReplaySmoothing();
      }
    }

    const hasSolid = (ctxObj.geo.shapes || []).some((s) => s.kind === 'solid');
    const coords = evalGeoCoords(ctxObj.geo, ctxObj.board);
    const bbox = computeTightBBox(ctxObj.geo, coords, ctxObj.replay.scopeShapes, ctxObj.replay.scopePoints, 32);
    const dims = computeCanvasDims(bbox, o);
    const schedule = buildFrameSchedule(ctxObj.replay, o.fps, o.orbit360 && hasSolid);

    const canvas = document.createElement('canvas');
    canvas.width = dims.outW;
    canvas.height = dims.outH;
    const ctx = canvas.getContext('2d');

    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
    const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';

    const stream = canvas.captureStream(o.fps);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: o.quality === '1080p' ? 4500000 : 2600000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    const stopPromise = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.start(100);

    const frameMs = 1000 / o.fps;
    for (let i = 0; i < schedule.length; i++) {
      if (cancelSignal && cancelSignal.cancelled) {
        try { recorder.stop(); } catch (_) {}
        throw new Error('Đã hủy xuất Video.');
      }
      const t0 = performance.now();
      drawSingleExportFrame(canvas, ctx, ctxObj, schedule[i], dims, o);
      if (onProgress) onProgress(Math.round(((i + 1) / schedule.length) * 92), `Đang ghi video ${i + 1}/${schedule.length} khung...`, canvas);
      const elapsed = performance.now() - t0;
      const wait = Math.max(4, frameMs - elapsed);
      await new Promise((r) => setTimeout(r, wait));
    }

    recorder.stop();
    await stopPromise;
    stream.getTracks().forEach((tr) => tr.stop());

    const blob = new Blob(chunks, { type: mimeType });
    const buf = new Uint8Array(await blob.arrayBuffer());
    const safeTitle = String(ctxObj.replay.title || 'minnote-replay').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 36) || 'minnote-replay';
    const fileName = `${safeTitle}_${Date.now().toString(36)}${ext}`;
    const saveRes = await saveExportedBytes(buf, fileName, ext, mimeType);
    if (onProgress) onProgress(100, `Hoàn tất video ${ext.toUpperCase()} (${(buf.length / 1024).toFixed(1)} KB)`, canvas);
    return { bytes: buf, width: dims.outW, height: dims.outH, mimeType, fileName, saveRes };
  }

  function captureCurrentGeoPng(opts) {
    const ctxObj = resolveExportContext(null);
    if (!ctxObj) return '';
    const o = Object.assign({ background: 'white', quality: '720p', padding: 32, showHand: false }, opts || {});
    const coords = evalGeoCoords(ctxObj.geo, ctxObj.board);
    const bbox = computeTightBBox(ctxObj.geo, coords, null, null, 30);
    const dims = computeCanvasDims(bbox, o);
    const canvas = document.createElement('canvas');
    canvas.width = dims.outW;
    canvas.height = dims.outH;
    const ctx = canvas.getContext('2d');
    const lastIdx = Math.max(0, (ctxObj.replay.steps || []).filter((s) => s.enabled !== false).length - 1);
    drawSingleExportFrame(canvas, ctx, ctxObj, { kind: 'step', stepIdx: lastIdx, progress: 1, lifted: true }, dims, o);
    return canvas.toDataURL('image/png');
  }

  // ============================================================================
  // 5. STUDIO EXPORT MODAL (Light / Dark)
  // ============================================================================
  let modalBackdrop = null;
  let activeCancel = null;
  let activeReplayArg = null;

  function ensureModal() {
    if (modalBackdrop) return modalBackdrop;
    const el = document.createElement('div');
    el.id = 'mn-replay-export-backdrop';
    el.className = 'mn-v80-backdrop';
    el.innerHTML = `
      <div class="mn-v80-modal" role="dialog" aria-modal="true" aria-label="Xuất GIF / Video Dựng hình">
        <div class="mn-v80-head">
          <div class="mn-v80-title">
            <span>🎬 Xuất GIF / Video Dựng hình (Auto-Crop Sát Hình)</span>
            <span class="mn-v80-badge">Không dính thanh công cụ</span>
          </div>
          <button type="button" class="mn-v80-close" id="mn-rpexp-close" title="Đóng">✕</button>
        </div>
        <div class="mn-v80-body">
          <div class="mn-rpexp-preview-box" id="mn-rpexp-preview">
            <span style="font-size:12px;color:var(--mn80-text-muted);">Xem trước vùng cắt sát hình vẽ</span>
          </div>

          <div class="mn-rpexp-grid">
            <div class="mn-v80-field">
              <div class="mn-v80-label">Định dạng xuất</div>
              <div class="mn-v80-pill-row" id="mn-rpexp-fmt">
                <button type="button" class="mn-v80-pill active" data-val="gif">🖼 GIF động (.gif)</button>
                <button type="button" class="mn-v80-pill" data-val="video">🎥 Video (.webm / .mp4)</button>
              </div>
            </div>

            <div class="mn-v80-field">
              <div class="mn-v80-label">Nền khung hình</div>
              <div class="mn-v80-pill-row" id="mn-rpexp-bg">
                <button type="button" class="mn-v80-pill active" data-val="white">Trắng sạch</button>
                <button type="button" class="mn-v80-pill" data-val="dark">Nền tối Slate</button>
                <button type="button" class="mn-v80-pill" data-val="grid">Giữ ô ly giấy</button>
              </div>
            </div>

            <div class="mn-v80-field">
              <div class="mn-v80-label">Chất lượng / Độ phân giải</div>
              <div class="mn-v80-pill-row" id="mn-rpexp-qual">
                <button type="button" class="mn-v80-pill active" data-val="720p">720p (1.5×)</button>
                <button type="button" class="mn-v80-pill" data-val="1080p">1080p (2× nét)</button>
              </div>
            </div>

            <div class="mn-v80-field">
              <div class="mn-v80-label">Tốc độ khung hình (FPS) &amp; Lề cắt</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <select id="mn-rpexp-fps" class="mn-v80-select" style="flex:1;">
                  <option value="15">15 FPS (Nhẹ nhất)</option>
                  <option value="24" selected>24 FPS (Mượt chuẩn)</option>
                  <option value="30">30 FPS (Siêu mượt)</option>
                </select>
                <input type="number" id="mn-rpexp-pad" class="mn-v80-input" value="36" min="12" max="120" step="4" style="width:88px;" title="Lề cắt (px)" />
              </div>
            </div>
          </div>

          <div class="mn-v80-card" style="display:flex;flex-direction:column;gap:8px;">
            <label class="mn-v80-toggle">
              <input type="checkbox" id="mn-rpexp-hand" checked />
              <span>✍ Hiện tay cầm bút đang viết dọc theo từng nét dựng</span>
            </label>
            <label class="mn-v80-toggle">
              <input type="checkbox" id="mn-rpexp-orbit" />
              <span>↻ Xoay tròn 360° cuối clip (khi có hình không gian 3D)</span>
            </label>
            <label class="mn-v80-toggle">
              <input type="checkbox" id="mn-rpexp-loop" checked />
              <span>🔁 Lặp lại vô hạn (GIF Loop cho PowerPoint / Zalo / Word)</span>
            </label>
          </div>

          <div class="mn-rpexp-progress-wrap" id="mn-rpexp-prog-wrap" style="display:none;">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;">
              <span id="mn-rpexp-status">Đang chuẩn bị...</span>
              <span id="mn-rpexp-pct">0%</span>
            </div>
            <div class="mn-rpexp-bar-track"><div class="mn-rpexp-bar-fill" id="mn-rpexp-bar"></div></div>
          </div>
        </div>
        <div class="mn-v80-foot">
          <span id="mn-rpexp-dims-info" style="font-size:11.5px;color:var(--mn80-text-muted);"></span>
          <div class="mn-v80-foot-group">
            <button type="button" class="mn-v80-btn danger" id="mn-rpexp-cancel-run" style="display:none;">⏹ Hủy xuất</button>
            <button type="button" class="mn-v80-btn" id="mn-rpexp-close-btn">Đóng</button>
            <button type="button" class="mn-v80-btn primary" id="mn-rpexp-start">🎬 Bắt đầu Xuất</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    modalBackdrop = el;

    const readOpts = () => {
      const fmt = el.querySelector('#mn-rpexp-fmt .mn-v80-pill.active')?.dataset.val || 'gif';
      const background = el.querySelector('#mn-rpexp-bg .mn-v80-pill.active')?.dataset.val || 'white';
      const quality = el.querySelector('#mn-rpexp-qual .mn-v80-pill.active')?.dataset.val || '720p';
      const fps = parseInt(el.querySelector('#mn-rpexp-fps').value, 10) || 24;
      const padding = parseInt(el.querySelector('#mn-rpexp-pad').value, 10) || 36;
      const showHand = !!el.querySelector('#mn-rpexp-hand').checked;
      const orbit360 = !!el.querySelector('#mn-rpexp-orbit').checked;
      const loop = !!el.querySelector('#mn-rpexp-loop').checked;
      return { fmt, background, quality, fps, padding, showHand, orbit360, loop };
    };

    const refreshPreview = () => {
      const box = el.querySelector('#mn-rpexp-preview');
      const info = el.querySelector('#mn-rpexp-dims-info');
      const ctxObj = resolveExportContext(activeReplayArg);
      if (!ctxObj) {
        box.innerHTML = '<span style="font-size:12px;color:var(--mn80-danger);">Trang hiện tại chưa có hình học nào để xuất!</span>';
        info.textContent = '';
        return;
      }
      const o = readOpts();
      const coords = evalGeoCoords(ctxObj.geo, ctxObj.board);
      const bbox = computeTightBBox(ctxObj.geo, coords, ctxObj.replay.scopeShapes, ctxObj.replay.scopePoints, 32);
      const dims = computeCanvasDims(bbox, o);
      const c = document.createElement('canvas');
      c.width = dims.outW;
      c.height = dims.outH;
      const c2 = c.getContext('2d');
      const activeSteps = (ctxObj.replay.steps || []).filter((s) => s.enabled !== false);
      drawSingleExportFrame(c, c2, ctxObj, { kind: 'step', stepIdx: Math.max(0, activeSteps.length - 1), progress: 1, lifted: false }, dims, Object.assign({}, o, { showHand: false }));
      box.innerHTML = '';
      box.appendChild(c);
      info.textContent = `Khung cắt sát hình: ${dims.outW}×${dims.outH}px • ${activeSteps.length} bước dựng`;
    };

    ['#mn-rpexp-fmt', '#mn-rpexp-bg', '#mn-rpexp-qual'].forEach((sel) => {
      const grp = el.querySelector(sel);
      grp.querySelectorAll('.mn-v80-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          grp.querySelectorAll('.mn-v80-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          refreshPreview();
        });
      });
    });
    el.querySelector('#mn-rpexp-pad').addEventListener('change', refreshPreview);

    const close = () => {
      if (activeCancel) activeCancel.cancelled = true;
      el.classList.remove('open');
    };
    el.querySelector('#mn-rpexp-close').addEventListener('click', close);
    el.querySelector('#mn-rpexp-close-btn').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    const cancelRunBtn = el.querySelector('#mn-rpexp-cancel-run');
    cancelRunBtn.addEventListener('click', () => {
      if (activeCancel) activeCancel.cancelled = true;
    });

    const startBtn = el.querySelector('#mn-rpexp-start');
    startBtn.addEventListener('click', async () => {
      const o = readOpts();
      const progWrap = el.querySelector('#mn-rpexp-prog-wrap');
      const statusEl = el.querySelector('#mn-rpexp-status');
      const pctEl = el.querySelector('#mn-rpexp-pct');
      const barEl = el.querySelector('#mn-rpexp-bar');
      const previewBox = el.querySelector('#mn-rpexp-preview');

      activeCancel = { cancelled: false };
      startBtn.disabled = true;
      cancelRunBtn.style.display = 'inline-flex';
      progWrap.style.display = 'flex';
      barEl.style.width = '2%';
      pctEl.textContent = '0%';
      statusEl.textContent = 'Đang khởi tạo...';

      const onProgress = (pct, msg, liveCanvas) => {
        barEl.style.width = Math.max(2, Math.min(100, pct)) + '%';
        pctEl.textContent = pct + '%';
        statusEl.textContent = msg || '';
        if (liveCanvas && previewBox) {
          if (previewBox.firstChild !== liveCanvas) {
            previewBox.innerHTML = '';
            previewBox.appendChild(liveCanvas);
          }
        }
      };

      try {
        if (o.fmt === 'video') {
          await exportVideo(activeReplayArg, o, onProgress, activeCancel);
        } else {
          await exportGif(activeReplayArg, o, onProgress, activeCancel);
        }
      } catch (err) {
        statusEl.textContent = '✕ ' + (err.message || err);
        toast(err.message || String(err));
      } finally {
        activeCancel = null;
        startBtn.disabled = false;
        cancelRunBtn.style.display = 'none';
      }
    });

    el._refreshPreview = refreshPreview;
    return el;
  }

  function openModal(replayArg) {
    activeReplayArg = replayArg || null;
    const el = ensureModal();
    el.classList.add('open');
    if (typeof el._refreshPreview === 'function') el._refreshPreview();
  }

  window.MinNoteReplayExporter = {
    openModal,
    exportGif,
    exportVideo,
    captureCurrentGeoPng,
    encodeGif89a,
    computeTightBBox
  };
})();
