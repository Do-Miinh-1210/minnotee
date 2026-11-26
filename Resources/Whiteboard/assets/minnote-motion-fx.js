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
 * MinNoteMotionFX — Pure JS / Canvas 2D Motion & Visual Effects Core (Offline, 60fps)
 * Ported architectural & math primitives from Beta1Tikz directly inside MinNote:
 *  - Smooth easing curves (9 curves including smoothstep, smootherstep, bump, thereback)
 *  - Geometric morphing (de Casteljau cubic Bezier prefix & homologous polygon alignment)
 *  - Fourier epicycles contour reconstruction & tracer
 *  - 3D Möller-Trumbore ray-triangle occlusion helper
 *  - Critically damped spring camera controller (w = 2*pi*0.9, zeta = 0.95)
 *  - 30+ curated effects across Stroke, Transform, and Emphasis categories
 *  - Unified shape, point, item (LaTeX/text/graph/table/problem/image), stroke & cue-only renderers
 *  - 3 one-click Style Presets (Đỗ Miinh, Manim, 3D Chuẩn)
 */
(function (root) {
  'use strict';

  // ============================================================================
  // 1. DETERMINISTIC PRNG & MATH HELPERS
  // ============================================================================
  function clamp01(v) {
    const x = Number(v);
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpPt(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function hashStr(str) {
    const s = String(str || 'mn');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // 2. EASING CURVES (9 SMOOTH CURVES FROM tikz_timeline.py + tikz_motion.py)
  // ============================================================================
  const EASINGS = [
    { id: 'easeInOut',    label: 'Mượt đều' },
    { id: 'easeOut',      label: 'Nhanh→Chậm' },
    { id: 'easeIn',       label: 'Chậm→Nhanh' },
    { id: 'smoothstep',   label: 'Mịn bậc 3' },
    { id: 'smootherstep', label: 'Siêu mịn' },
    { id: 'spring',       label: 'Đàn hồi' },
    { id: 'bump',         label: 'Lóe nhấn' },
    { id: 'thereback',    label: 'Đi rồi về' },
    { id: 'linear',       label: 'Tuyến tính' }
  ];

  function smoothstep(u) {
    const x = clamp01(u);
    return x * x * (3 - 2 * x);
  }

  function smootherstep(u) {
    const x = clamp01(u);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function evalEase(t, easing) {
    const u = clamp01(t);
    switch (easing) {
      case 'linear':
        return u;
      case 'easeIn':
        return u * u * u;
      case 'easeOut':
        return 1 - Math.pow(1 - u, 3);
      case 'smoothstep':
        return smoothstep(u);
      case 'smootherstep':
        return smootherstep(u);
      case 'spring':
        if (u <= 0) return 0;
        if (u >= 1) return 1;
        return Math.min(1.18, 1 - Math.exp(-6.2 * u) * Math.cos(10.5 * u));
      case 'bump': {
        const s = Math.sin(Math.PI * u);
        return s * s;
      }
      case 'thereback':
        return u < 0.5 ? smoothstep(u * 2) : smoothstep((1 - u) * 2);
      case 'easeInOut':
      default:
        return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    }
  }

  // ============================================================================
  // 3. GEOMETRY MORPHING PRIMITIVES (PORTED FROM tikz_morph.py)
  // ============================================================================
  function splitCubicBezierPrefix(p0, c1, c2, p3, tau) {
    const t = clamp01(tau);
    if (t <= 0) return { p0: { ...p0 }, c1: { ...p0 }, c2: { ...p0 }, p3: { ...p0 } };
    if (t >= 1) return { p0: { ...p0 }, c1: { ...c1 }, c2: { ...c2 }, p3: { ...p3 } };
    const q0 = lerpPt(p0, c1, t);
    const q1 = lerpPt(c1, c2, t);
    const q2 = lerpPt(c2, p3, t);
    const r0 = lerpPt(q0, q1, t);
    const r1 = lerpPt(q1, q2, t);
    const b = lerpPt(r0, r1, t);
    return { p0: { ...p0 }, c1: q0, c2: r0, p3: b };
  }

  function resamplePolyline(pts, count, closed = false) {
    const nOut = Math.max(2, count | 0);
    if (!Array.isArray(pts) || !pts.length) return [];
    if (pts.length === 1) {
      return Array.from({ length: nOut }, () => ({ x: pts[0].x, y: pts[0].y }));
    }
    const seq = closed ? [...pts, pts[0]] : pts;
    const cum = [0];
    let total = 0;
    for (let i = 1; i < seq.length; i++) {
      const dx = seq[i].x - seq[i - 1].x;
      const dy = seq[i].y - seq[i - 1].y;
      total += Math.hypot(dx, dy);
      cum.push(total);
    }
    if (total < 1e-6) {
      return Array.from({ length: nOut }, () => ({ x: pts[0].x, y: pts[0].y }));
    }
    const out = [];
    const denom = closed ? nOut : Math.max(1, nOut - 1);
    let segIdx = 0;
    for (let i = 0; i < nOut; i++) {
      const d = (i / denom) * total;
      while (segIdx < cum.length - 2 && cum[segIdx + 1] < d) segIdx++;
      const d0 = cum[segIdx];
      const d1 = cum[segIdx + 1];
      const span = Math.max(1e-9, d1 - d0);
      const frac = Math.max(0, Math.min(1, (d - d0) / span));
      out.push(lerpPt(seq[segIdx], seq[segIdx + 1], frac));
    }
    return out;
  }

  function alignPolygons(polyA, polyB, closed = true) {
    if (!Array.isArray(polyA) || !polyA.length || !Array.isArray(polyB) || !polyB.length) {
      return [polyA || [], polyB || []];
    }
    const n = Math.min(120, Math.max(polyA.length, polyB.length, 24));
    const a = resamplePolyline(polyA, n, closed);
    const bFwd = resamplePolyline(polyB, n, closed);
    const bRev = [...bFwd].reverse();

    if (!closed) {
      let costFwd = 0, costRev = 0;
      for (let i = 0; i < n; i++) {
        costFwd += (a[i].x - bFwd[i].x) ** 2 + (a[i].y - bFwd[i].y) ** 2;
        costRev += (a[i].x - bRev[i].x) ** 2 + (a[i].y - bRev[i].y) ** 2;
      }
      return [a, costRev < costFwd ? bRev : bFwd];
    }

    let bestCost = Infinity;
    let bestAligned = bFwd;
    for (const candidate of [bFwd, bRev]) {
      for (let shift = 0; shift < n; shift++) {
        let cost = 0;
        for (let i = 0; i < n; i++) {
          const bp = candidate[(i + shift) % n];
          const dx = a[i].x - bp.x;
          const dy = a[i].y - bp.y;
          cost += dx * dx + dy * dy;
          if (cost >= bestCost) break;
        }
        if (cost < bestCost) {
          bestCost = cost;
          bestAligned = Array.from({ length: n }, (_, i) => candidate[(i + shift) % n]);
        }
      }
    }
    return [a, bestAligned];
  }

  function interpolatePolygons(polyA, polyB, t, closed = true) {
    const [a, b] = alignPolygons(polyA, polyB, closed);
    if (!a.length || !b.length) return [];
    const u = Number.isFinite(t) ? t : 0;
    const out = new Array(a.length);
    for (let i = 0; i < a.length; i++) {
      out[i] = lerpPt(a[i], b[i], u);
    }
    return out;
  }

  // ============================================================================
  // 4. FOURIER EPICYCLES CONTOUR RECONSTRUCTION (PORTED FROM studio_core.js)
  // ============================================================================
  const _fourierCache = new Map();

  function _fourierKey(pts, maxTerms, closed) {
    const head = pts.slice(0, 6).map(p => Math.round(p.x * 10) + ',' + Math.round(p.y * 10)).join(';');
    const tail = pts.slice(-3).map(p => Math.round(p.x * 10) + ',' + Math.round(p.y * 10)).join(';');
    return `${pts.length}|${maxTerms}|${closed ? 1 : 0}|${head}|${tail}`;
  }

  function computeFourierEpicycles(pts, maxTerms = 14, opts = {}) {
    if (!Array.isArray(pts) || pts.length < 2) return [];
    const closed = opts.closed !== undefined
      ? !!opts.closed
      : (pts.length >= 3);
    const key = _fourierKey(pts, maxTerms, closed);
    const cached = _fourierCache.get(key);
    if (cached) return cached;

    const N = 64;
    let sourcePts = pts;
    if (!closed) {
      // Back-and-forth fold keeps periodicity C0-continuous (no chord jump at wrap)
      sourcePts = pts.length === 2
        ? [pts[0], lerpPt(pts[0], pts[1], 0.5), pts[1], lerpPt(pts[0], pts[1], 0.5)]
        : [...pts, ...pts.slice(1, -1).reverse()];
    }
    const samples = resamplePolyline(sourcePts, N, true);
    const coeffs = [];
    const half = Math.floor(N / 2);

    for (let k = -half + 1; k <= half; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < N; n++) {
        const phi = (-2 * Math.PI * k * n) / N;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const x = samples[n].x;
        const y = samples[n].y;
        re += x * c - y * s;
        im += x * s + y * c;
      }
      re /= N;
      im /= N;
      const amp = Math.hypot(re, im);
      coeffs.push({ freq: k, re, im, amp, phase: Math.atan2(im, re) });
    }

    const dc = coeffs.find(c => c.freq === 0) || { freq: 0, re: samples[0].x, im: samples[0].y, amp: 0, phase: 0 };
    const osc = coeffs
      .filter(c => c.freq !== 0 && c.amp > 1e-4)
      .sort((a, b) => b.amp - a.amp)
      .slice(0, Math.max(1, maxTerms | 0));

    const result = [dc, ...osc];
    if (_fourierCache.size > 160) _fourierCache.clear();
    _fourierCache.set(key, result);
    return result;
  }

  function evalEpicycles(terms, t) {
    if (!Array.isArray(terms) || !terms.length) return [];
    let x = 0;
    let y = 0;
    const chain = [];
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      const ang = 2 * Math.PI * term.freq * t;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const dx = term.re * c - term.im * s;
      const dy = term.re * s + term.im * c;
      const nx = x + dx;
      const ny = y + dy;
      chain.push({
        x,
        y,
        r: term.amp,
        freq: term.freq,
        nextX: nx,
        nextY: ny
      });
      x = nx;
      y = ny;
    }
    return chain;
  }

  // ============================================================================
  // 5. 3D MÖLLER-TRUMBORE RAY-TRIANGLE OCCLUSION (PORTED FROM lesson3d_core.js)
  // ============================================================================
  function _sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function _dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function _cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function rayTriangleIntersect(orig, dir, v0, v1, v2) {
    const edge1 = _sub3(v1, v0);
    const edge2 = _sub3(v2, v0);
    const h = _cross3(dir, edge2);
    const a = _dot3(edge1, h);
    if (Math.abs(a) < 1e-8) return null;
    const f = 1 / a;
    const s = _sub3(orig, v0);
    const u = f * _dot3(s, h);
    if (u < -1e-6 || u > 1 + 1e-6) return null;
    const q = _cross3(s, edge1);
    const v = f * _dot3(dir, q);
    if (v < -1e-6 || u + v > 1 + 1e-6) return null;
    const t = f * _dot3(edge2, q);
    return t > 1e-6 ? t : null;
  }

  function visibilityRuns3D(a, b, eye, faces, samples = 48) {
    if (!Array.isArray(faces) || !faces.length) {
      return [{ from: 0, to: 1, hidden: false }];
    }
    const tris = [];
    for (const f of faces) {
      if (!Array.isArray(f) || f.length < 3) continue;
      for (let j = 1; j < f.length - 1; j++) {
        tris.push([f[0], f[j], f[j + 1]]);
      }
    }
    if (!tris.length) return [{ from: 0, to: 1, hidden: false }];

    const n = Math.max(4, samples | 0);
    const runs = [];
    for (let k = 0; k < n; k++) {
      const u0 = k / n;
      const u1 = (k + 1) / n;
      const um = (u0 + u1) * 0.5;
      const p = [lerp(a[0], b[0], um), lerp(a[1], b[1], um), lerp(a[2], b[2], um)];
      const rawDir = _sub3(p, eye);
      const dist = Math.hypot(rawDir[0], rawDir[1], rawDir[2]);
      let isHidden = false;
      if (dist > 1e-8) {
        const dir = [rawDir[0] / dist, rawDir[1] / dist, rawDir[2] / dist];
        for (let ti = 0; ti < tris.length; ti++) {
          const hitT = rayTriangleIntersect(eye, dir, tris[ti][0], tris[ti][1], tris[ti][2]);
          if (hitT !== null && hitT > 1e-4 && hitT < dist - 1e-3) {
            isHidden = true;
            break;
          }
        }
      }
      const last = runs[runs.length - 1];
      if (last && last.hidden === isHidden) {
        last.to = u1;
      } else {
        runs.push({ from: u0, to: u1, hidden: isHidden });
      }
    }
    return runs;
  }

  // ============================================================================
  // 6. CRITICALLY DAMPED SPRING CAMERA (w = 2*pi*0.9, zeta = 0.95)
  // ============================================================================
  function stepSpringCamera(state, targetX, targetY, dt, opts = {}) {
    const s = state || { x: targetX, y: targetY, vx: 0, vy: 0 };
    if (!Number.isFinite(s.x)) s.x = targetX;
    if (!Number.isFinite(s.y)) s.y = targetY;
    if (!Number.isFinite(s.vx)) s.vx = 0;
    if (!Number.isFinite(s.vy)) s.vy = 0;

    const freq = Number(opts.freq) > 0 ? Number(opts.freq) : 0.9;
    const zeta = Number(opts.zeta) > 0 ? Number(opts.zeta) : 0.95;
    const w = 2 * Math.PI * freq;
    const totalDt = Math.min(0.1, Math.max(0.0001, Number(dt) || 1 / 60));
    const subSteps = Math.max(1, Math.ceil(totalDt * 120));
    const h = totalDt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      const ax = w * w * (targetX - s.x) - 2 * zeta * w * s.vx;
      const ay = w * w * (targetY - s.y) - 2 * zeta * w * s.vy;
      s.vx += ax * h;
      s.vy += ay * h;
      s.x += s.vx * h;
      s.y += s.vy * h;
    }

    const dist = Math.hypot(targetX - s.x, targetY - s.y);
    const vel = Math.hypot(s.vx, s.vy);
    const settled = dist < 0.5 && vel < 2;
    return { x: s.x, y: s.y, vx: s.vx, vy: s.vy, settled };
  }

  // ============================================================================
  // 7. CURATED EFFECT CATALOG (30 EFFECTS ACROSS STROKE / TRANSFORM / EMPHASIS)
  // ============================================================================
  const EFFECT_CATEGORIES = [
    { id: 'fit',      label: 'Phù hợp' },
    { id: 'stroke',   label: 'Đường nét' },
    { id: 'transform',label: 'Biến đổi' },
    { id: 'emphasis', label: 'Nhấn mạnh' }
  ];

  const LEGACY_EFFECTS = new Set(['draw', 'glow', 'spring', 'fade', 'zoom', 'slide', 'wipe', 'pulse']);

  const EFFECTS = [
    // --- Stroke ---
    { id: 'draw',           icon: '✏',  label: 'Vẽ nét',       cat: 'stroke',    targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'glow',           icon: '✨', label: 'Phát sáng',    cat: 'stroke',    targets: ['shape', 'point', 'stroke'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'laser_scan',     icon: '⚡', label: 'Tia Laser',    cat: 'stroke',    targets: ['shape', 'point', 'stroke', 'line', 'segment', 'poly', 'circle', 'curve', '3d'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'center_out',     icon: '↔',  label: 'Mở từ tâm',    cat: 'stroke',    targets: ['line', 'segment', 'circle', 'poly', 'curve', 'stroke'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'draw_then_fill', icon: '🎨', label: 'Viền → Tô',    cat: 'stroke',    targets: ['poly', 'circle', 'item', 'text', 'table'], isOverlayEnd: false, defaultDurMul: 1.2 },
    { id: 'arrow_slide',    icon: '➤',  label: 'Mũi tên trượt', cat: 'stroke',   targets: ['line', 'segment', 'curve', 'stroke'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'measure_brace',  icon: '📏', label: 'Gợn đo nét',   cat: 'stroke',    targets: ['segment', 'poly'], isOverlayEnd: false, defaultDurMul: 1.1 },
    { id: 'chalk_dust',     icon: '🖍', label: 'Phấn bảng',    cat: 'stroke',    targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },

    // --- Transform ---
    { id: 'fourier_epicycles', icon: '🌀', label: 'Vòng Fourier', cat: 'transform', targets: ['circle', 'poly', 'curve', 'stroke'], isOverlayEnd: false, defaultDurMul: 1.6 },
    { id: 'morph_bezier',      icon: '⟳',  label: 'Morph A → B',  cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1.35 },
    { id: 'spring',            icon: '🪀', label: 'Bật nảy',      cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'fade',              icon: '🌫', label: 'Hiện dần',     cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'zoom',              icon: '🔍', label: 'Phóng to',     cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'slide',             icon: '⬆',  label: 'Trượt vào',    cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'wipe',              icon: '▬',  label: 'Quét ngang',   cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'mirror_flip',       icon: '🪞', label: 'Lật gương',    cat: 'transform', targets: ['poly', 'circle', 'curve', 'item', 'text', 'image', 'table', 'stroke'], isOverlayEnd: false, defaultDurMul: 1 },
    { id: 'extrude_rise',      icon: '🧊', label: 'Nâng khối 3D', cat: 'transform', targets: ['3d', 'poly', 'segment', 'circle'], isOverlayEnd: false, defaultDurMul: 1.2 },
    { id: 'xray_hidden',       icon: '👁', label: 'Soi nét khuất',cat: 'transform', targets: ['dashed', '3d', 'line', 'segment'], isOverlayEnd: false, defaultDurMul: 1.1 },
    { id: 'typewriter',        icon: '⌨', label: 'Gõ từng nét',  cat: 'transform', targets: ['text', 'problem', 'table'], isOverlayEnd: false, defaultDurMul: 1.2 },
    { id: 'graph_trace',       icon: '📈', label: 'Điểm chạy đồ thị', cat: 'transform', targets: ['graph', 'oxyz', 'curve'], isOverlayEnd: false, defaultDurMul: 1.2 },

    // --- Emphasis ---
    { id: 'pulse',            icon: '◉', label: 'Nhịp nhấn',     cat: 'emphasis', targets: ['all'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'mention_glow',     icon: '🌟', label: 'Hào quang vàng',cat: 'emphasis', targets: ['all'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'chalk_box',        icon: '⬜', label: 'Khoanh phấn',   cat: 'emphasis', targets: ['text', 'problem', 'table', 'graph', 'poly', 'circle', 'segment', 'point', 'stroke', 'image'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'double_underline', icon: '‗', label: 'Gạch dưới đôi', cat: 'emphasis', targets: ['text', 'problem', 'segment', 'line', 'table', 'stroke'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'target_reticle',   icon: '🎯', label: 'Hồng tâm ngắm', cat: 'emphasis', targets: ['point', 'segment', 'circle', 'poly', 'graph', 'stroke', 'item'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'water_ripple',     icon: '💧', label: 'Sóng lan tỏa',  cat: 'emphasis', targets: ['point', 'circle', 'poly', 'segment', 'item', 'stroke'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'starburst',        icon: '🎆', label: 'Pháo sao',      cat: 'emphasis', targets: ['point', 'poly', 'circle', 'text', 'problem', 'stroke'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'checkmark_stamp',  icon: '✅', label: 'Dấu tích ✓',    cat: 'emphasis', targets: ['all'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'cross_strike',     icon: '❌', label: 'Gạch loại ✗',   cat: 'emphasis', targets: ['all'], isOverlayEnd: true, defaultDurMul: 1 },
    { id: 'wiggle_alert',     icon: '〰', label: 'Lắc chú ý',     cat: 'emphasis', targets: ['all'], isOverlayEnd: true, defaultDurMul: 1 }
  ];

  const EFFECT_MAP = Object.fromEntries(EFFECTS.map(e => [e.id, e]));
  const OVERLAY_END_EFFECTS = new Set(EFFECTS.filter(e => e.isOverlayEnd).map(e => e.id));

  function _deriveTags(meta = {}) {
    if (meta.isCueOnly) return new Set(['emphasis']);
    const tags = new Set(['all']);
    const kind = meta.kind || 'shape';
    if (kind === 'point') {
      tags.add('point');
    } else if (kind === 'stroke') {
      tags.add('stroke');
    } else if (kind === 'item') {
      tags.add('item');
      const it = meta.itemType || 'text';
      if (it === 'text' || it === 'problem') tags.add(it);
      else if (it === 'graph') tags.add('graph');
      else if (it === 'oxyz') { tags.add('oxyz'); tags.add('3d'); tags.add('graph'); }
      else if (it === 'vartable') tags.add('table');
      else if (it === 'image') tags.add('image');
    } else {
      tags.add('shape');
      const sk = meta.shapeKind || 'segment';
      if (sk === 'segment' || sk === 'tick' || sk === 'angle' || sk === 'right') tags.add('segment');
      else if (sk === 'line' || sk === 'ray' || sk === 'extend') tags.add('line');
      else if (sk === 'circle') tags.add('circle');
      else if (sk === 'polygon' || sk === 'plane' || sk === 'annulus' || sk === 'region') tags.add('poly');
      else if (sk === 'locus' || sk === 'ellipse' || sk === 'hyperbola' || sk === 'parabola' || sk === 'arc' || sk === 'sector') tags.add('curve');
      else if (sk === 'cone' || sk === 'cylinder' || sk === 'sphere') { tags.add('3d'); tags.add('circle'); }
      if (meta.isDashed) tags.add('dashed');
      if (meta.is3D) tags.add('3d');
    }
    return tags;
  }

  function _effectMatchesTags(ef, tags, isCueOnly) {
    if (isCueOnly) return ef.cat === 'emphasis';
    return ef.targets.some(t => tags.has(t));
  }

  // Priority ranking for 'fit' tab per target type so teachers immediately see top choices without scrolling
  const FIT_ORDER = {
    point: ['mention_glow', 'target_reticle', 'water_ripple', 'spring', 'starburst', 'glow', 'chalk_dust', 'draw'],
    dashed: ['xray_hidden', 'laser_scan', 'draw', 'morph_bezier', 'chalk_dust', 'center_out', 'mention_glow', 'fade'],
    '3d': ['extrude_rise', 'xray_hidden', 'morph_bezier', 'laser_scan', 'draw', 'glow', 'mention_glow', 'fourier_epicycles'],
    circle: ['draw', 'morph_bezier', 'fourier_epicycles', 'center_out', 'draw_then_fill', 'laser_scan', 'water_ripple', 'glow'],
    poly: ['draw_then_fill', 'morph_bezier', 'laser_scan', 'chalk_dust', 'fourier_epicycles', 'extrude_rise', 'chalk_box', 'draw'],
    curve: ['fourier_epicycles', 'morph_bezier', 'graph_trace', 'laser_scan', 'draw', 'glow', 'arrow_slide', 'chalk_dust'],
    text: ['typewriter', 'morph_bezier', 'chalk_box', 'double_underline', 'fade', 'wipe', 'slide', 'mention_glow'],
    problem: ['typewriter', 'morph_bezier', 'chalk_box', 'fade', 'slide', 'zoom', 'mention_glow', 'checkmark_stamp'],
    graph: ['graph_trace', 'morph_bezier', 'wipe', 'draw_then_fill', 'laser_scan', 'chalk_box', 'zoom', 'fade'],
    table: ['wipe', 'morph_bezier', 'draw_then_fill', 'typewriter', 'chalk_box', 'fade', 'slide'],
    image: ['zoom', 'morph_bezier', 'fade', 'wipe', 'mirror_flip', 'chalk_box', 'spring'],
    stroke: ['draw', 'morph_bezier', 'laser_scan', 'chalk_dust', 'fourier_epicycles', 'glow', 'arrow_slide', 'mention_glow'],
    cue: ['mention_glow', 'target_reticle', 'chalk_box', 'water_ripple', 'starburst', 'double_underline', 'checkmark_stamp', 'cross_strike', 'wiggle_alert', 'pulse'],
    default: ['draw', 'morph_bezier', 'laser_scan', 'chalk_dust', 'glow', 'center_out', 'arrow_slide', 'mention_glow']
  };

  function getEffectsForStep(meta = {}, category = 'fit') {
    const isCueOnly = !!meta.isCueOnly;
    if (isCueOnly) {
      return EFFECTS.filter(ef => ef.cat === 'emphasis');
    }
    const tags = _deriveTags(meta);
    if (category && category !== 'fit') {
      return EFFECTS.filter(ef => ef.cat === category && _effectMatchesTags(ef, tags, false));
    }

    let orderKey = 'default';
    if (tags.has('point')) orderKey = 'point';
    else if (tags.has('dashed')) orderKey = 'dashed';
    else if (tags.has('3d')) orderKey = '3d';
    else if (tags.has('graph') || tags.has('oxyz')) orderKey = 'graph';
    else if (tags.has('text')) orderKey = 'text';
    else if (tags.has('problem')) orderKey = 'problem';
    else if (tags.has('table')) orderKey = 'table';
    else if (tags.has('image')) orderKey = 'image';
    else if (tags.has('stroke')) orderKey = 'stroke';
    else if (tags.has('poly')) orderKey = 'poly';
    else if (tags.has('circle')) orderKey = 'circle';
    else if (tags.has('curve')) orderKey = 'curve';

    const preferredIds = FIT_ORDER[orderKey] || FIT_ORDER.default;
    const seen = new Set();
    const out = [];
    for (const id of preferredIds) {
      const ef = EFFECT_MAP[id];
      if (ef && !seen.has(id)) {
        seen.add(id);
        out.push(ef);
      }
    }
    for (const ef of EFFECTS) {
      if (!seen.has(ef.id) && _effectMatchesTags(ef, tags, false)) {
        seen.add(ef.id);
        out.push(ef);
      }
      if (out.length >= 12) break;
    }
    return out;
  }

  // ============================================================================
  // 8. 3 ONE-CLICK STYLE PRESETS (ĐỖ MIINH / MANIM / 3D CHUẨN)
  // ============================================================================
  const STYLE_PRESETS = [
    { id: 'domiinh', icon: '✨', label: 'Đỗ Miinh', title: 'Phong cách Đỗ Miinh Math: phấn mịn, hào quang điểm nhấn, camera lò xo' },
    { id: 'manim',   icon: '🎬', label: 'Manim',    title: 'Phong cách Manim: tia Laser, Viền→Tô, Vòng Fourier & đồ thị tiếp tuyến' },
    { id: 'geo3d',   icon: '🧊', label: '3D Chuẩn', title: 'Phong cách Hình 3D: nâng khối, soi nét khuất X-ray & tự xoay 360°' }
  ];

  function applyStylePresetToSteps(presetId, steps, geo, page) {
    if (!Array.isArray(steps)) return { steps: [], replayMeta: {} };
    const shMap = new Map((geo && geo.shapes ? geo.shapes : []).map(s => [s.id, s]));
    const itemMap = new Map((page && page.items ? page.items : []).map(it => [it.id, it]));
    const pts = (geo && geo.points) || {};
    const has3D = !!(geo && Array.isArray(geo.shapes) && geo.shapes.some(s => s.kind === 'solid' || s.look3 || s.kind === 'cone' || s.kind === 'cylinder' || s.kind === 'sphere'));

    const pickTargetFx = (kind, refId, existingFx, mode) => {
      if (mode === 'cue') {
        if (presetId === 'manim') return kind === 'item' ? 'chalk_box' : 'target_reticle';
        return 'mention_glow';
      }
      if (kind === 'point') {
        if (presetId === 'manim') return 'target_reticle';
        const pt = pts[refId];
        if (presetId === 'geo3d' && pt && pt.def && pt.def.t === 'inter') return 'mention_glow';
        return 'mention_glow';
      }
      if (kind === 'stroke') {
        return presetId === 'manim' ? 'laser_scan' : 'chalk_dust';
      }
      if (kind === 'item') {
        const it = itemMap.get(refId);
        const itType = it ? it.type : 'text';
        if (itType === 'graph' || itType === 'oxyz') return 'graph_trace';
        if (itType === 'vartable') return presetId === 'manim' ? 'draw_then_fill' : 'wipe';
        if (itType === 'image') return 'zoom';
        return presetId === 'manim' ? 'chalk_box' : 'typewriter';
      }
      const sh = shMap.get(refId);
      if (!sh) return existingFx || 'draw';
      const isFilledPoly = (sh.kind === 'polygon' && !!sh.fill) || sh.kind === 'plane' || sh.kind === 'annulus';
      const isCircleOrCurve = sh.kind === 'circle' || sh.kind === 'ellipse' || sh.kind === 'locus';
      const isSolidEdge = !!(sh.dashed || sh.look3);

      if (presetId === 'domiinh') {
        if (isFilledPoly) return 'draw_then_fill';
        if (isCircleOrCurve && sh.kind === 'locus') return 'glow';
        return 'chalk_dust';
      }
      if (presetId === 'manim') {
        if (isFilledPoly) return 'draw_then_fill';
        if (isCircleOrCurve) return 'fourier_epicycles';
        return 'laser_scan';
      }
      if (presetId === 'geo3d') {
        if (sh.kind === 'polygon' && sh.fill) return 'draw_then_fill';
        if (isSolidEdge) return 'xray_hidden';
        if (sh.look3 || sh.kind === 'cone' || sh.kind === 'cylinder' || sh.kind === 'sphere') return 'extrude_rise';
        return 'laser_scan';
      }
      return existingFx || 'draw';
    };

    const nextSteps = steps.map((st) => {
      const copy = { ...st };
      const easing = presetId === 'domiinh'
        ? 'smootherstep'
        : presetId === 'geo3d'
          ? 'smoothstep'
          : 'easeInOut';
      copy.easing = easing;

      if (copy.items && copy.items.length > 1) {
        if (presetId === 'geo3d' && copy.items.some(it => {
          const sh = it.kind === 'shape' ? shMap.get(it.refId) : null;
          return sh && sh.group;
        })) {
          copy.effect = 'extrude_rise';
        } else {
          const first = copy.items[0];
          copy.effect = pickTargetFx(first.kind, first.refId, copy.effect, copy.mode);
        }
      } else {
        const it = (copy.items && copy.items[0]) || copy;
        copy.effect = pickTargetFx(it.kind, it.refId, copy.effect, copy.mode);
      }
      return copy;
    });

    const replayMeta = {
      stylePreset: presetId,
      followCamera: true,
      springCamera: true
    };
    if (presetId === 'geo3d' && has3D) {
      replayMeta.autoOrbitAfter = true;
    }
    return { steps: nextSteps, replayMeta };
  }

  // ============================================================================
  // 9. GEOMETRY POLYLINE EXTRACTION & SHARED CANVAS HELPERS
  // ============================================================================
  function _rotatePt(p, c, ang) {
    const cs = Math.cos(ang);
    const sn = Math.sin(ang);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
  }

  function _sampleCircle(O, R, rev, segs = 72) {
    const r = Math.hypot(R.x - O.x, R.y - O.y);
    const a0 = Math.atan2(R.y - O.y, R.x - O.x);
    const dir = rev ? -1 : 1;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = a0 + dir * Math.PI * 2 * (i / segs);
      pts.push({ x: O.x + r * Math.cos(a), y: O.y + r * Math.sin(a) });
    }
    return pts;
  }

  function _bboxFromPolylines(polylines) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const pl of (polylines || [])) {
      for (const p of (pl.pts || [])) {
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        if (p.x < x0) x0 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.x > x1) x1 = p.x;
        if (p.y > y1) y1 = p.y;
      }
    }
    if (!Number.isFinite(x0)) return null;
    return {
      x0, y0, x1, y1,
      cx: (x0 + x1) * 0.5,
      cy: (y0 + y1) * 0.5,
      w: Math.max(1, x1 - x0),
      h: Math.max(1, y1 - y0)
    };
  }

  function _bboxFromItem(item, bboxFn) {
    if (!item) return null;
    try {
      if (typeof bboxFn === 'function') {
        const b = bboxFn(item);
        if (b && Number.isFinite(b.x0) && Number.isFinite(b.x1)) {
          return {
            x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1,
            cx: (b.x0 + b.x1) * 0.5, cy: (b.y0 + b.y1) * 0.5,
            w: Math.max(4, b.x1 - b.x0), h: Math.max(4, b.y1 - b.y0)
          };
        }
      }
    } catch (_) {}
    const x0 = Number(item.x) || 0;
    const y0 = Number(item.y) || 0;
    const w = Math.max(8, Number(item.w) || 60);
    const h = Math.max(8, Number(item.h) || 32);
    return { x0, y0, x1: x0 + w, y1: y0 + h, cx: x0 + w * 0.5, cy: y0 + h * 0.5, w, h };
  }

  function _bboxFromStroke(stroke) {
    if (!stroke || !Array.isArray(stroke.pts) || stroke.pts.length < 2) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < stroke.pts.length; i += 3) {
      const x = stroke.pts[i];
      const y = stroke.pts[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    if (!Number.isFinite(x0)) return null;
    const pad = Math.max(2, (stroke.width || 3) * 0.6);
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    return { x0, y0, x1, y1, cx: (x0 + x1) * 0.5, cy: (y0 + y1) * 0.5, w: Math.max(4, x1 - x0), h: Math.max(4, y1 - y0) };
  }

  function extractShapePolylines(sh, coords, helpers, opts = {}) {
    if (!sh || !coords || sh.kind === 'solid' || sh.kind === 'flatLink') return [];
    const maxExt = opts.maxExt || 1200;
    if (sh.kind === 'region') {
      const sampleLoop = (lp) => {
        if (!lp) return [];
        if (lp.t === 'circle') {
          const O = coords.get(lp.c), R = coords.get(lp.r);
          return (O && R) ? _sampleCircle(O, R, false, 72) : [];
        }
        const pts = (lp.pts || []).map(id => coords.get(id)).filter(Boolean);
        return pts.length >= 3 ? pts : [];
      };
      if (sh.mode === 'diff' && sh.outer) {
        const pts = sampleLoop(sh.outer);
        return pts.length >= 2 ? [{ pts, closed: true, dashed: !!sh.dashed }] : [];
      }
      if (Array.isArray(sh.edges) && sh.edges.length) {
        const pts = [];
        for (const ed of sh.edges) {
          if (ed.t === 'circle') {
            const O = coords.get(ed.c), R = coords.get(ed.r);
            if (O && R) return [{ pts: _sampleCircle(O, R, false, 72), closed: true, dashed: !!sh.dashed }];
          } else if (ed.t === 'arc') {
            const O = coords.get(ed.c), R = coords.get(ed.r), A = coords.get(ed.a), B = coords.get(ed.b);
            if (O && R && A && B) {
              const rad = Math.hypot(R.x - O.x, R.y - O.y);
              if (rad > 1e-4) {
                const a0 = Math.atan2(A.y - O.y, A.x - O.x);
                const a1 = Math.atan2(B.y - O.y, B.x - O.x);
                let sweep = ed.ccw ? (a0 - a1) : (a1 - a0);
                while (sweep <= 1e-6) sweep += Math.PI * 2;
                while (sweep > Math.PI * 2 + 1e-6) sweep -= Math.PI * 2;
                const steps = Math.max(6, Math.ceil((sweep / (Math.PI * 2)) * 64));
                const dir = ed.ccw ? -1 : 1;
                for (let k = 0; k < steps; k++) {
                  const ang = a0 + dir * sweep * (k / steps);
                  pts.push({ x: O.x + rad * Math.cos(ang), y: O.y + rad * Math.sin(ang) });
                }
              }
            }
          } else {
            const A = coords.get(ed.a);
            if (A) pts.push({ x: A.x, y: A.y });
          }
        }
        return pts.length >= 2 ? [{ pts, closed: true, dashed: !!sh.dashed }] : [];
      }
      return [];
    }
    if (sh.kind === 'locus') {
      const ls = helpers && typeof helpers._mnLocusStrokes === 'function'
        ? helpers._mnLocusStrokes(coords._geo, sh, coords)
        : [];
      return (ls || []).map(l => ({ pts: l.pts || [], closed: !!l.closed, dashed: !!sh.dashed, envelope: !!l.envelope }));
    }
    const rawPts = (sh.pts || []).map(id => coords.get(id));
    if (rawPts.some(p => !p)) return [];
    let s = rawPts;
    if (sh.rot && !sh.look3 && s.length) {
      const anchor = s[0];
      s = s.map(p => _rotatePt(p, anchor, -sh.rot));
    }

    let out = null;
    const complex = sh.look3
      ? (helpers && helpers.D7 ? helpers.D7(sh, s[0]) : null)
      : (helpers && helpers._mnShapeStrokes ? helpers._mnShapeStrokes(sh, s, coords._geo) : null);

    if (complex && complex.length && sh.kind !== 'polygon' && sh.kind !== 'circle' && sh.kind !== 'segment' && sh.kind !== 'line' && sh.kind !== 'ray') {
      out = complex
        .filter(c => !c.shade && !c.text && c.pts && c.pts.length >= 2)
        .map(c => ({ pts: c.pts, closed: !!c.closed, dashed: !!(c.dashed || sh.dashed) }));
    } else if (sh.kind === 'plane' && complex && complex.length) {
      out = complex
        .filter(c => !c.shade && !c.text && c.pts && c.pts.length >= 2)
        .map(c => ({ pts: c.pts, closed: !!c.closed, dashed: !!(c.dashed || sh.dashed) }));
    } else {
      switch (sh.kind) {
        case 'segment':
          out = [{ pts: [s[0], s[1]], closed: false, dashed: !!sh.dashed }];
          break;
        case 'line':
        case 'ray': {
          const z = helpers && helpers.z7 ? helpers.z7(sh, s[0], s[1]) : null;
          if (z) {
            out = [{ pts: [z[0], z[1]], closed: false, dashed: !!sh.dashed }];
          } else {
            const dx = s[1].x - s[0].x;
            const dy = s[1].y - s[0].y;
            const len = Math.hypot(dx, dy) || 1;
            const extLen = Math.min(maxExt, (helpers && helpers.eL) || maxExt);
            const vx = (dx / len) * extLen;
            const vy = (dy / len) * extLen;
            const a = sh.kind === 'line' ? { x: s[0].x - vx, y: s[0].y - vy } : s[0];
            const b = { x: s[0].x + vx, y: s[0].y + vy };
            out = [{ pts: [a, b], closed: false, dashed: !!sh.dashed }];
          }
          break;
        }
        case 'extend': {
          const [l, c, u] = s;
          const vx = u.x - c.x, vy = u.y - c.y;
          const d2 = vx * vx + vy * vy;
          const m = d2 ? ((l.x - c.x) * vx + (l.y - c.y) * vy) / d2 : 0;
          const e0 = m < 0 ? c : m > 1 ? u : null;
          out = e0 ? [{ pts: [e0, l], closed: false, dashed: !!sh.dashed }] : [];
          break;
        }
        case 'circle':
          out = [{ pts: _sampleCircle(s[0], s[1], false, 72), closed: true, dashed: !!sh.dashed }];
          break;
        case 'polygon': {
          const skip = new Set([...(sh.gaps || []), ...(sh.hiddenSides || [])]);
          if (skip.size === 0) {
            out = [{ pts: s.slice(), closed: true, dashed: !!sh.dashed }];
          } else {
            out = [];
            for (let k = 0; k < s.length; k++) {
              if (!skip.has(k)) {
                out.push({ pts: [s[k], s[(k + 1) % s.length]], closed: false, dashed: !!sh.dashed });
              }
            }
          }
          break;
        }
        default:
          if (s.length >= 2) {
            out = [{ pts: s.slice(), closed: false, dashed: !!sh.dashed }];
          } else {
            out = [];
          }
          break;
      }
    }

    if (out && out.length && sh.rot && !sh.look3 && rawPts.length) {
      const anchor = rawPts[0];
      out = out.map(pl => ({
        ...pl,
        pts: pl.pts.map(p => _rotatePt(p, anchor, sh.rot))
      }));
    }
    return out || [];
  }

  function _extractSegments(polylines, rev) {
    const list = rev
      ? [...polylines].reverse().map(x => ({ ...x, pts: [...x.pts].reverse() }))
      : polylines;
    const segs = [];
    let total = 0;
    for (const l of list) {
      const pts = l.closed && l.pts.length > 1 ? [...l.pts, l.pts[0]] : l.pts;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const d = Math.hypot(dx, dy);
        if (d > 1e-6) {
          segs.push({ a: pts[i - 1], b: pts[i], dx, dy, d, ux: dx / d, uy: dy / d, dashed: !!l.dashed });
          total += d;
        }
      }
    }
    return { segs, total };
  }

  function _drawArrowHead(ctx, x, y, dx, dy, size, color) {
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dx * size - dy * size * 0.44, y - dy * size + dx * size * 0.44);
    ctx.lineTo(x - dx * size * 0.72, y - dy * size * 0.72);
    ctx.lineTo(x - dx * size + dy * size * 0.44, y - dy * size - dx * size * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function _drawRoundedRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, rad);
    } else {
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    }
  }

  // Shared non-destructive overlay decorations (used for both entrance end & cue-only mode)
  function paintOverlayDecoration(ctx, bb, center, phase, fx, opts = {}) {
    if (!bb && !center) return;
    const cx = center ? center.x : bb.cx;
    const cy = center ? center.y : bb.cy;
    const box = bb || { x0: cx - 14, y0: cy - 14, x1: cx + 14, y1: cy + 14, cx, cy, w: 28, h: 28 };
    const u = clamp01(phase);
    const alpha = clamp01(evalEase(u, 'bump'));
    if (alpha <= 0.01 && u < 0.99) return;
    const pad = opts.pad != null ? opts.pad : 8;
    const x0 = box.x0 - pad;
    const y0 = box.y0 - pad;
    const w = box.w + pad * 2;
    const h = box.h + pad * 2;

    switch (fx) {
      case 'mention_glow': {
        if (alpha <= 0.01) return;
        ctx.save();
        const r = Math.min(14, Math.min(w, h) * 0.25);
        _drawRoundedRect(ctx, x0, y0, w, h, r);
        ctx.fillStyle = `rgba(254, 240, 138, ${(alpha * 0.22).toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.28).toFixed(3)})`;
        ctx.lineWidth = 10 + 3 * alpha;
        ctx.stroke();
        ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.95).toFixed(3)})`;
        ctx.lineWidth = 3.0 + 1.8 * alpha;
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'chalk_box': {
        const drawT = clamp01(u / 0.58);
        const fadeOut = u > 0.82 ? clamp01(1 - (u - 0.82) / 0.18) : 1;
        const a = opts.persistAtEnd ? 1 : fadeOut;
        if (a <= 0.01) return;
        const corners = [
          { x: x0, y: y0 },
          { x: x0 + w, y: y0 },
          { x: x0 + w, y: y0 + h },
          { x: x0, y: y0 + h }
        ];
        ctx.save();
        ctx.strokeStyle = `rgba(234, 179, 8, ${(0.95 * a).toFixed(3)})`;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const { segs, total } = _extractSegments([{ pts: corners, closed: true }], false);
        let rem = total * drawT;
        ctx.beginPath();
        let moved = false;
        for (const sg of segs) {
          if (rem <= 0) break;
          const f = Math.min(1, rem / sg.d);
          const end = f >= 1 ? sg.b : lerpPt(sg.a, sg.b, f);
          if (!moved) { ctx.moveTo(sg.a.x, sg.a.y); moved = true; }
          ctx.lineTo(end.x, end.y);
          rem -= sg.d;
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'double_underline': {
        const drawT = clamp01(u / 0.55);
        const fadeOut = u > 0.82 ? clamp01(1 - (u - 0.82) / 0.18) : 1;
        const a = opts.persistAtEnd ? 1 : fadeOut;
        if (a <= 0.01) return;
        const uy1 = box.y1 + 5;
        const uy2 = box.y1 + 10;
        const len = Math.max(20, box.w);
        const curW = len * drawT;
        ctx.save();
        ctx.strokeStyle = `rgba(37, 99, 235, ${(0.92 * a).toFixed(3)})`;
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(box.x0, uy1);
        ctx.lineTo(box.x0 + curW, uy1);
        ctx.stroke();
        const t2 = clamp01((u - 0.14) / 0.46);
        if (t2 > 0) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${(0.88 * a).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(box.x0 + 4, uy2);
          ctx.lineTo(box.x0 + 4 + (len - 4) * t2, uy2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'target_reticle': {
        if (alpha <= 0.01) return;
        const baseR = Math.max(18, Math.min(44, Math.hypot(box.w, box.h) * 0.42));
        const r = baseR * (1.45 - 0.52 * smoothstep(u));
        const rot = u * Math.PI * 0.75;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.strokeStyle = `rgba(239, 68, 68, ${(alpha * 0.94).toFixed(3)})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(249, 115, 22, ${(alpha * 0.75).toFixed(3)})`;
        ctx.stroke();
        const tick = Math.max(7, r * 0.38);
        for (const a of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
          const cs = Math.cos(a), sn = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(cs * (r - tick * 0.4), sn * (r - tick * 0.4));
          ctx.lineTo(cs * (r + tick), sn * (r + tick));
          ctx.strokeStyle = `rgba(239, 68, 68, ${(alpha * 0.95).toFixed(3)})`;
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'water_ripple': {
        ctx.save();
        const maxR = Math.max(26, Math.min(72, Math.max(box.w, box.h) * 0.7 + 22));
        for (let i = 0; i < 3; i++) {
          const ph = u - i * 0.22;
          if (ph <= 0 || ph >= 1) continue;
          const r = 6 + maxR * easeOutCubic(ph);
          const a = (1 - ph) * 0.78;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = i % 2 === 0
            ? `rgba(14, 165, 233, ${a.toFixed(3)})`
            : `rgba(37, 99, 235, ${(a * 0.85).toFixed(3)})`;
          ctx.lineWidth = 2.5 * (1 - ph * 0.55);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'starburst': {
        const seed = hashStr(Math.round(cx) + '_' + Math.round(cy));
        const rng = mulberry32(seed);
        const rays = 10;
        const maxDist = Math.max(22, Math.min(58, Math.max(box.w, box.h) * 0.55 + 16));
        const fade = clamp01(Math.sin(Math.PI * u));
        if (fade <= 0.01) return;
        ctx.save();
        for (let i = 0; i < rays; i++) {
          const ang = (Math.PI * 2 * i) / rays + (rng() - 0.5) * 0.35;
          const dist = maxDist * (0.35 + 0.65 * easeOutCubic(u)) * (0.75 + rng() * 0.4);
          const px = cx + Math.cos(ang) * dist;
          const py = cy + Math.sin(ang) * dist;
          const sz = (3.2 + rng() * 2.5) * fade;
          ctx.fillStyle = i % 2 === 0
            ? `rgba(245, 158, 11, ${fade.toFixed(3)})`
            : `rgba(56, 189, 248, ${fade.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(px, py - sz);
          ctx.lineTo(px + sz * 0.35, py - sz * 0.35);
          ctx.lineTo(px + sz, py);
          ctx.lineTo(px + sz * 0.35, py + sz * 0.35);
          ctx.lineTo(px, py + sz);
          ctx.lineTo(px - sz * 0.35, py + sz * 0.35);
          ctx.lineTo(px - sz, py);
          ctx.lineTo(px - sz * 0.35, py - sz * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'checkmark_stamp': {
        const sc = 0.6 + 0.45 * evalEase(clamp01(u / 0.5), 'spring');
        const fadeOut = u > 0.82 ? clamp01(1 - (u - 0.82) / 0.18) : 1;
        const a = (opts.persistAtEnd ? 1 : fadeOut) * Math.min(1, u * 3);
        if (a <= 0.01) return;
        const bx = box.x1 + 10;
        const by = box.y0 - 4;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(sc, sc);
        ctx.globalAlpha *= a;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#16a34a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-5, 0.5);
        ctx.lineTo(-1.5, 4);
        ctx.lineTo(5.5, -4);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'cross_strike': {
        const a = clamp01(Math.sin(Math.PI * u));
        if (a <= 0.01) return;
        const tDraw = clamp01(u / 0.55);
        ctx.save();
        ctx.strokeStyle = `rgba(220, 38, 38, ${(0.9 * a).toFixed(3)})`;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        const sx0 = box.x0 - 4, sy0 = box.y0 - 4, sx1 = box.x1 + 4, sy1 = box.y1 + 4;
        const d1 = lerpPt({ x: sx0, y: sy0 }, { x: sx1, y: sy1 }, Math.min(1, tDraw * 2));
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(d1.x, d1.y);
        ctx.stroke();
        if (tDraw > 0.5) {
          const f2 = (tDraw - 0.5) * 2;
          const d2 = lerpPt({ x: sx1, y: sy0 }, { x: sx0, y: sy1 }, f2);
          ctx.beginPath();
          ctx.moveTo(sx1, sy0);
          ctx.lineTo(d2.x, d2.y);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }

  function easeOutCubic(x) {
    const u = clamp01(x);
    return 1 - Math.pow(1 - u, 3);
  }

  // ============================================================================
  // 10. SHAPE FX RENDERER (paintShapeFX)
  // ============================================================================
  function _paintPolylinesComplete(ctx, polylines, fillStyle, fillAlpha) {
    for (const pl of polylines) {
      if (!pl.pts || pl.pts.length < 2) continue;
      ctx.save();
      if (pl.dashed) ctx.setLineDash([9, 7]);
      if (pl.envelope) {
        ctx.globalAlpha *= 0.42;
        ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.65);
      }
      ctx.beginPath();
      pl.pts.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (pl.closed) ctx.closePath();
      if (fillStyle && pl.closed && fillAlpha > 0) {
        ctx.save();
        ctx.fillStyle = fillStyle;
        ctx.globalAlpha *= fillAlpha;
        ctx.fill();
        ctx.restore();
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function paintShapeFX(ctx, sh, coords, prog, rev, fxOpts, helpers) {
    const fx = (fxOpts && fxOpts.effect) || 'draw';
    if (!ctx || !sh || !coords || LEGACY_EFFECTS.has(fx)) {
      return { handled: false, tip: null };
    }
    const rawP = (fxOpts && typeof fxOpts.rawP === 'number') ? fxOpts.rawP : clamp01(prog);
    if (sh.kind === 'solid' || sh.kind === 'flatLink') return { handled: true, tip: null };
    if (rawP <= 0) return { handled: true, tip: null };

    const teeFn = helpers && helpers.tee;
    const drawPartialFn = helpers && helpers._drawPolylinesPartial;
    const drawTipFn = helpers && helpers._drawTip;
    let _cachedPolylines = null;
    const getPolylines = () => {
      if (_cachedPolylines === null) _cachedPolylines = extractShapePolylines(sh, coords, helpers);
      return _cachedPolylines;
    };
    const bb = (helpers && helpers._mnShapeBBox ? helpers._mnShapeBBox(sh, coords) : null)
      || _bboxFromPolylines(getPolylines());
    const color = sh.color || '#1a1a1a';
    const lineW = sh.width || 2.5;
    const defaultTip = bb ? { x: bb.cx, y: bb.cy, dx: 1, dy: 0 } : null;

    // 1) Emphasis-end effects: draw shape first (0..0.55) then decorate smoothly with bump()
    if (OVERLAY_END_EFFECTS.has(fx)) {
      const revealP = clamp01(rawP / 0.56);
      const easeRev = evalEase(revealP, 'easeOut');
      const polylines = revealP < 0.999 ? getPolylines() : [];
      let tip = defaultTip;

      ctx.save();
      if (fx === 'wiggle_alert' && bb && rawP < 0.995) {
        const amp = Math.sin(rawP * Math.PI * 6) * 0.065 * evalEase(rawP, 'bump');
        ctx.translate(bb.cx, bb.cy);
        ctx.rotate(amp);
        ctx.translate(-bb.cx, -bb.cy);
      }
      if (revealP >= 0.999 && teeFn) {
        teeFn(ctx, sh, coords);
      } else if (polylines.length && drawPartialFn) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        tip = drawPartialFn(ctx, polylines, easeRev, !!rev) || defaultTip;
      } else if (teeFn) {
        ctx.globalAlpha *= easeRev;
        teeFn(ctx, sh, coords);
      }
      ctx.restore();

      const ovPhase = clamp01((rawP - 0.30) / 0.70);
      if (ovPhase > 0 && rawP < 0.998) {
        paintOverlayDecoration(ctx, bb, bb ? { x: bb.cx, y: bb.cy } : null, ovPhase, fx);
      }
      return { handled: true, tip };
    }

    // 2) Full shape reached for non-overlay effects
    if (rawP >= 0.999 && teeFn) {
      teeFn(ctx, sh, coords);
      return { handled: true, tip: defaultTip };
    }

    const polylines = getPolylines();

    // 3) LASER SCAN: zero-shadowBlur 60fps cyan-white neon glow sweep + bright laser bead at head
    if (fx === 'laser_scan') {
      if (!polylines.length || !drawPartialFn) {
        if (teeFn) { ctx.save(); ctx.globalAlpha *= clamp01(prog); teeFn(ctx, sh, coords); ctx.restore(); }
        return { handled: true, tip: defaultTip };
      }
      const laserFade = rawP < 0.78 ? 1 : clamp01(1 - smoothstep((rawP - 0.78) / 0.22));
      const drawT = clamp01(prog);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (laserFade > 0.02) {
        // Fast crisp additive neon halo (0 Gaussian blur passes!)
        ctx.strokeStyle = `rgba(6, 182, 212, ${(0.24 * laserFade).toFixed(3)})`;
        ctx.lineWidth = lineW + 7;
        drawPartialFn(ctx, polylines, drawT, !!rev);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      const tip = drawPartialFn(ctx, polylines, drawT, !!rev);
      if (tip && laserFade > 0.02) {
        // Luminous white-cyan laser flare at tip (layered radial rings, zero shadowBlur!)
        ctx.globalAlpha *= laserFade;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 13.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.30)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4.3, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.restore();
      return { handled: true, tip: tip || defaultTip };
    }

    // 4) CENTER OUT: expands symmetrically from the middle of each path outward
    if (fx === 'center_out') {
      if (!polylines.length) {
        if (teeFn) { ctx.save(); ctx.globalAlpha *= clamp01(prog); teeFn(ctx, sh, coords); ctx.restore(); }
        return { handled: true, tip: defaultTip };
      }
      const t = clamp01(prog);
      const { segs, total } = _extractSegments(polylines, !!rev);
      let tip = defaultTip;
      if (total > 1e-6) {
        const midDist = total * 0.5;
        const leftTarget = midDist * (1 - t);
        const rightTarget = midDist + (total - midDist) * t;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let acc = 0;
        for (const sg of segs) {
          const s0 = acc;
          const s1 = acc + sg.d;
          acc = s1;
          const o0 = Math.max(s0, leftTarget);
          const o1 = Math.min(s1, rightTarget);
          if (o1 <= o0) continue;
          const f0 = (o0 - s0) / sg.d;
          const f1 = (o1 - s0) / sg.d;
          const pa = lerpPt(sg.a, sg.b, f0);
          const pb = lerpPt(sg.a, sg.b, f1);
          ctx.save();
          if (sg.dashed) ctx.setLineDash([9, 7]);
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
          ctx.restore();
          tip = { x: pb.x, y: pb.y, dx: sg.ux, dy: sg.uy };
        }
        if (drawTipFn && tip) drawTipFn(ctx, tip, false);
        ctx.restore();
      }
      return { handled: true, tip };
    }

    // 5) DRAW THEN FILL: draws outline 0..0.68 then smoothly fills polygon/plane 0.58..1.0
    if (fx === 'draw_then_fill') {
      const outlineP = clamp01(rawP / 0.68);
      const fillP = clamp01((rawP - 0.58) / 0.42);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let tip = defaultTip;
      if (outlineP >= 0.999) {
        _paintPolylinesComplete(ctx, polylines, null, 0);
      } else if (drawPartialFn && polylines.length) {
        tip = drawPartialFn(ctx, polylines, evalEase(outlineP, 'easeOut'), !!rev) || defaultTip;
      }
      if (fillP > 0 && (sh.fill || sh.kind === 'polygon' || sh.kind === 'plane' || sh.kind === 'circle')) {
        const pts = sh.pts.map(id => coords.get(id)).filter(Boolean);
        if (pts.length >= 2) {
          ctx.save();
          ctx.beginPath();
          if (sh.kind === 'circle' && pts.length >= 2) {
            ctx.arc(pts[0].x, pts[0].y, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), 0, Math.PI * 2);
          } else {
            pts.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.closePath();
          }
          ctx.fillStyle = sh.fill || color;
          ctx.globalAlpha = (sh.fill ? 1 : (sh.kind === 'plane' ? 0.12 : 0.14)) * fillP;
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
      return { handled: true, tip };
    }

    // 6) ARROW SLIDE: traces path with moving vector arrowhead at drawing tip
    if (fx === 'arrow_slide') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let tip = defaultTip;
      if (drawPartialFn && polylines.length) {
        tip = drawPartialFn(ctx, polylines, clamp01(prog), !!rev) || defaultTip;
      }
      if (tip) {
        _drawArrowHead(ctx, tip.x, tip.y, tip.dx || 1, tip.dy || 0, Math.max(10, 8 + lineW * 2), color);
      }
      ctx.restore();
      return { handled: true, tip };
    }

    // 7) MEASURE BRACE: draws path then adds temporary dimension ticks / brace that fades cleanly
    if (fx === 'measure_brace') {
      const drawP = clamp01(rawP / 0.65);
      const bracePhase = clamp01((rawP - 0.35) / 0.65);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let tip = defaultTip;
      if (drawP >= 0.999 && teeFn) {
        teeFn(ctx, sh, coords);
      } else if (drawPartialFn && polylines.length) {
        tip = drawPartialFn(ctx, polylines, evalEase(drawP, 'easeOut'), !!rev) || defaultTip;
      }
      if (bracePhase > 0 && polylines.length) {
        const bAlpha = evalEase(bracePhase, 'bump');
        const firstSegPts = polylines[0].pts;
        if (firstSegPts && firstSegPts.length >= 2) {
          const p0 = firstSegPts[0];
          const p1 = firstSegPts[firstSegPts.length - 1];
          const dx = p1.x - p0.x, dy = p1.y - p0.y;
          const len = Math.hypot(dx, dy);
          if (len > 12) {
            const nx = -dy / len, ny = dx / len;
            const off = 14;
            const a0 = { x: p0.x + nx * off, y: p0.y + ny * off };
            const b0 = { x: p1.x + nx * off, y: p1.y + ny * off };
            ctx.save();
            ctx.strokeStyle = `rgba(37, 99, 235, ${(0.82 * bAlpha).toFixed(3)})`;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y); ctx.lineTo(a0.x, a0.y);
            ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y);
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(b0.x, b0.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      ctx.restore();
      return { handled: true, tip };
    }

    // 8) CHALK DUST: textured chalkboard stroke + deterministic chalk dust specks trailing the tip
    if (fx === 'chalk_dust') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let tip = defaultTip;
      if (drawPartialFn && polylines.length) {
        tip = drawPartialFn(ctx, polylines, clamp01(prog), !!rev) || defaultTip;
      }
      if (tip) {
        const seed = hashStr((sh.id || '') + Math.round(rawP * 18));
        const rng = mulberry32(seed);
        for (let i = 0; i < 8; i++) {
          const a = rng() * Math.PI * 2;
          const r = 2 + rng() * 11;
          const px = tip.x + Math.cos(a) * r - (tip.dx || 0) * rng() * 8;
          const py = tip.y + Math.sin(a) * r - (tip.dy || 0) * rng() * 8;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.18 + rng() * 0.35;
          ctx.beginPath();
          ctx.arc(px, py, 0.8 + rng() * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      return { handled: true, tip };
    }

    // 9) FOURIER EPICYCLES: rotating harmonic circles + vector chain + luminous contour reveal
    if (fx === 'fourier_epicycles') {
      if (!polylines.length) {
        if (teeFn) teeFn(ctx, sh, coords);
        return { handled: true, tip: defaultTip };
      }
      const contour = polylines[0].pts || [];
      const isClosed = !!polylines[0].closed;
      const terms = computeFourierEpicycles(contour, 14, { closed: isClosed });
      if (!terms.length) {
        if (drawPartialFn) return { handled: true, tip: drawPartialFn(ctx, polylines, clamp01(prog), !!rev) || defaultTip };
        return { handled: false, tip: null };
      }
      const traceT = clamp01(prog);
      const tracePhaseMax = isClosed ? traceT : traceT * 0.5;
      const epAlpha = rawP < 0.82 ? 1 : clamp01(1 - (rawP - 0.82) / 0.18);

      // Draw traced curve so far
      const tracePts = [];
      const steps = Math.max(8, Math.round(80 * traceT));
      for (let i = 0; i <= steps; i++) {
        const ph = (i / steps) * tracePhaseMax;
        const ch = evalEpicycles(terms, ph);
        if (ch.length) {
          const last = ch[ch.length - 1];
          tracePts.push({ x: last.nextX, y: last.nextY });
        }
      }

      ctx.save();
      if (tracePts.length >= 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        tracePts.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (epAlpha > 0.03) {
          ctx.strokeStyle = `rgba(245, 158, 11, ${(0.24 * epAlpha).toFixed(3)})`;
          ctx.lineWidth = lineW + 5.5;
          ctx.stroke();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.stroke();
      }
      // Paint remaining secondary polylines softly after 70%
      if (polylines.length > 1 && rawP > 0.65 && drawPartialFn) {
        drawPartialFn(ctx, polylines.slice(1), clamp01((rawP - 0.65) / 0.35), !!rev);
      }

      // Draw rotating epicycle rings + spokes at current phase
      const chain = evalEpicycles(terms, tracePhaseMax);
      let headTip = defaultTip;
      if (chain.length && epAlpha > 0.02) {
        ctx.shadowBlur = 0;
        for (let i = 1; i < chain.length; i++) {
          const c = chain[i];
          if (c.r < 1.2) continue;
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(37, 99, 235, ${(0.26 * epAlpha).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.nextX, c.nextY);
          ctx.strokeStyle = `rgba(56, 189, 248, ${(0.72 * epAlpha).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        const tipPt = chain[chain.length - 1];
        headTip = { x: tipPt.nextX, y: tipPt.nextY, dx: 1, dy: 0 };
        if (tracePts.length >= 2) {
          const prev = tracePts[tracePts.length - 2];
          const L = Math.hypot(headTip.x - prev.x, headTip.y - prev.y) || 1;
          headTip.dx = (headTip.x - prev.x) / L;
          headTip.dy = (headTip.y - prev.y) / L;
        }
        ctx.beginPath();
        ctx.arc(headTip.x, headTip.y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
      }
      ctx.restore();
      return { handled: true, tip: headTip };
    }

    // 10) MORPH BEZIER: morph from source shape (or centered seed circle) into target shape
    if (fx === 'morph_bezier') {
      const targetPoly = polylines.length ? polylines[0].pts : null;
      const isClosed = !!(polylines.length && polylines[0].closed);
      if (!targetPoly || targetPoly.length < 2 || !bb) {
        if (teeFn) { ctx.save(); ctx.globalAlpha *= clamp01(prog); teeFn(ctx, sh, coords); ctx.restore(); }
        return { handled: true, tip: defaultTip };
      }
      let fromPoly = null;
      if (fxOpts && fxOpts.morphFromShape) {
        const fromPls = extractShapePolylines(fxOpts.morphFromShape, coords, helpers);
        if (fromPls.length && fromPls[0].pts && fromPls[0].pts.length >= 2) {
          fromPoly = fromPls[0].pts;
        }
      }
      if (!fromPoly) {
        const seedR = Math.max(12, Math.min(bb.w, bb.h) * 0.24);
        fromPoly = isClosed
          ? Array.from({ length: 24 }, (_, idx) => {
              const a = (Math.PI * 2 * idx) / 24;
              return { x: bb.cx + seedR * Math.cos(a), y: bb.cy + seedR * Math.sin(a) };
            })
          : [
              { x: bb.cx - seedR, y: bb.cy },
              { x: bb.cx, y: bb.cy },
              { x: bb.cx + seedR, y: bb.cy }
            ];
      }
      const morphed = interpolatePolygons(fromPoly, targetPoly, clamp01(prog), isClosed);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const morphGlow = evalEase(rawP, 'bump');
      if (morphed.length >= 2) {
        ctx.beginPath();
        morphed.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (isClosed) ctx.closePath();
        if (sh.fill && prog > 0.45) {
          ctx.save();
          ctx.fillStyle = sh.fill;
          ctx.globalAlpha = clamp01((prog - 0.45) / 0.55);
          ctx.fill();
          ctx.restore();
        }
        if (morphGlow > 0.03) {
          ctx.save();
          ctx.strokeStyle = `rgba(245, 158, 11, ${(0.26 * morphGlow).toFixed(3)})`;
          ctx.lineWidth = lineW + 6;
          ctx.stroke();
          ctx.restore();
        }
        ctx.stroke();
      }
      ctx.restore();
      return { handled: true, tip: defaultTip };
    }

    // 11) MIRROR FLIP: 3D-like horizontal scale cosine flip around center
    if (fx === 'mirror_flip' && bb) {
      const t = clamp01(prog);
      const sx = Math.max(0.04, Math.abs(Math.cos((1 - t) * Math.PI * 0.5)));
      ctx.save();
      ctx.globalAlpha *= Math.min(1, 0.2 + 0.8 * t);
      ctx.translate(bb.cx, bb.cy);
      ctx.scale(sx, 1);
      ctx.translate(-bb.cx, -bb.cy);
      if (teeFn) teeFn(ctx, sh, coords);
      else _paintPolylinesComplete(ctx, polylines);
      ctx.restore();
      return { handled: true, tip: defaultTip };
    }

    // 12) EXTRUDE RISE: lifts geometry from baseline + fades subtle vertical guide rails
    if (fx === 'extrude_rise' && bb) {
      const t = clamp01(prog);
      const dropY = 38 * (1 - t);
      const guideAlpha = clamp01(Math.sin(Math.PI * rawP)) * 0.55;
      ctx.save();
      if (guideAlpha > 0.02) {
        ctx.strokeStyle = 'rgba(37, 99, 235, ' + guideAlpha.toFixed(3) + ')';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 4]);
        for (const gx of [bb.x0, bb.x1]) {
          ctx.beginPath();
          ctx.moveTo(gx, bb.y1);
          ctx.lineTo(gx, bb.y0 + dropY);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      ctx.globalAlpha *= Math.min(1, 0.15 + 0.85 * t);
      ctx.translate(0, dropY);
      if (teeFn) teeFn(ctx, sh, coords);
      else _paintPolylinesComplete(ctx, polylines);
      ctx.restore();
      return { handled: true, tip: { x: bb.cx, y: bb.cy + dropY, dx: 0, dy: -1 } };
    }

    // 13) XRAY HIDDEN: zero-shadowBlur 60fps amber scanner sweep illuminating dashed/hidden edges
    if (fx === 'xray_hidden') {
      const xrayGlow = evalEase(rawP, 'bump');
      const drawT = clamp01(prog);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let tip = defaultTip;
      if (drawPartialFn && polylines.length) {
        if (xrayGlow > 0.03) {
          ctx.strokeStyle = `rgba(245, 158, 11, ${(0.28 * xrayGlow).toFixed(3)})`;
          ctx.lineWidth = lineW + 6.5;
          drawPartialFn(ctx, polylines, drawT, !!rev);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        tip = drawPartialFn(ctx, polylines, drawT, !!rev) || defaultTip;
      } else if (teeFn) {
        ctx.globalAlpha *= drawT;
        teeFn(ctx, sh, coords);
      }
      if (tip && rawP < 0.96) {
        const ringAlpha = rawP < 0.80 ? 1 : clamp01(1 - (rawP - 0.80) / 0.16);
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 10.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${(0.16 * ringAlpha).toFixed(3)})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${(0.88 * ringAlpha).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      return { handled: true, tip };
    }

    // 14) TYPEWRITER / GRAPH TRACE fallback on shapes (e.g. locus / curves)
    if (fx === 'typewriter' || fx === 'graph_trace') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let tip = defaultTip;
      if (drawPartialFn && polylines.length) {
        tip = drawPartialFn(ctx, polylines, clamp01(prog), !!rev) || defaultTip;
        if (fx === 'graph_trace' && tip) {
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.32)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
      } else if (teeFn) {
        ctx.globalAlpha *= clamp01(prog);
        teeFn(ctx, sh, coords);
      }
      ctx.restore();
      return { handled: true, tip };
    }

    return { handled: false, tip: null };
  }

  // ============================================================================
  // 11. POINT FX DECORATOR (paintPointFX)
  // ============================================================================
  function paintPointFX(ctx, pt, c, ap, isDone, fx, opts = {}) {
    if (!ctx || !pt || !c || isDone || ap >= 0.995 || ap <= 0) return false;
    if (!fx || fx === 'draw' || fx === 'fade' || fx === 'zoom' || fx === 'spring' || fx === 'slide' || fx === 'glow' || fx === 'pulse') {
      return false;
    }
    const r = (pt.size || 5.5) + 12;
    const bb = {
      x0: c.x - r,
      y0: c.y - r,
      x1: c.x + r,
      y1: c.y + r,
      cx: c.x,
      cy: c.y,
      w: r * 2,
      h: r * 2
    };
    if (OVERLAY_END_EFFECTS.has(fx)) {
      paintOverlayDecoration(ctx, bb, c, ap, fx, { pad: 2 });
      return true;
    }
    if (fx === 'laser_scan' || fx === 'chalk_dust') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * (1.2 - 0.5 * ap), 0, Math.PI * 2);
      ctx.strokeStyle = fx === 'laser_scan' ? `rgba(6, 182, 212, ${(1 - ap).toFixed(3)})` : `rgba(148, 163, 184, ${(1 - ap).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return true;
    }
    return false;
  }

  // ============================================================================
  // 12. ITEM (TEXT / LATEX / GRAPH / TABLE / PROBLEM / IMAGE) RENDERER
  // ============================================================================
  function paintItemFX(ctx, item, prog, rawP, fx, rev, paintItemFn, bboxFn) {
    if (!ctx || !item || typeof paintItemFn !== 'function') return null;
    const p = clamp01(rawP);
    if (p <= 0) return null;
    const bb = _bboxFromItem(item, bboxFn);
    const tip = { x: bb.cx, y: bb.cy, dx: 1, dy: 0 };

    if (p >= 0.999 && !OVERLAY_END_EFFECTS.has(fx)) {
      paintItemFn(ctx, item);
      return tip;
    }

    // Emphasis-end effects: fast reveal (0..0.48) then crisp emphasis overlay
    if (OVERLAY_END_EFFECTS.has(fx)) {
      const revealP = clamp01(p / 0.45);
      ctx.save();
      if (fx === 'wiggle_alert' && p < 0.995) {
        const ang = Math.sin(p * Math.PI * 6) * 0.035 * evalEase(p, 'bump');
        ctx.translate(bb.cx, bb.cy);
        ctx.rotate(ang);
        ctx.translate(-bb.cx, -bb.cy);
      }
      ctx.globalAlpha *= evalEase(revealP, 'easeOut');
      paintItemFn(ctx, item);
      ctx.restore();
      if (p < 0.998) {
        paintOverlayDecoration(ctx, bb, { x: bb.cx, y: bb.cy }, clamp01((p - 0.25) / 0.75), fx);
      }
      return tip;
    }

    const e = clamp01(prog);
    // TYPEWRITER: multi-band row sweep across text/problem box so multi-line blocks type out naturally
    if (fx === 'typewriter') {
      const pad = 8;
      const lineEst = Math.max(24, (Number(item.size) || 18) * 1.45);
      const bands = item.type === 'text' || item.type === 'problem'
        ? Math.max(1, Math.min(8, Math.round(bb.h / lineEst)))
        : 1;
      const bandH = (bb.h + pad * 2) / bands;
      const xLeft = bb.x0 - pad;
      const fullW = bb.w + pad * 2;
      let caret = tip;

      for (let b = 0; b < bands; b++) {
        const bStart = b / bands;
        const bEnd = (b + 1) / bands;
        const bt = clamp01((e - bStart) / (bEnd - bStart));
        if (bt <= 0) continue;
        const by = bb.y0 - pad + b * bandH;
        const bw = fullW * bt;
        ctx.save();
        ctx.beginPath();
        ctx.rect(xLeft, by, bw, bandH + 1);
        ctx.clip();
        paintItemFn(ctx, item);
        ctx.restore();
        if (bt > 0 && bt < 0.99) {
          const cxBar = xLeft + bw;
          ctx.save();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cxBar, by + 3);
          ctx.lineTo(cxBar, by + bandH - 3);
          ctx.stroke();
          ctx.restore();
          caret = { x: cxBar, y: by + bandH * 0.5, dx: 1, dy: 0 };
        }
      }
      return caret;
    }

    // GRAPH TRACE: sweeps graph left-to-right with luminous tracer dot on sweep front
    if (fx === 'graph_trace') {
      const pad = 10;
      const fullW = bb.w + pad * 2;
      const sweepX = rev ? bb.x1 + pad - fullW * e : bb.x0 - pad + fullW * e;
      const rx = rev ? sweepX : bb.x0 - pad;
      const rw = fullW * e;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, bb.y0 - pad, rw, bb.h + pad * 2);
      ctx.clip();
      paintItemFn(ctx, item);
      ctx.restore();
      if (e > 0.02 && e < 0.98) {
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sweepX, bb.y0);
        ctx.lineTo(sweepX, bb.y1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(sweepX, bb.cy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.restore();
      }
      return { x: sweepX, y: bb.cy, dx: rev ? -1 : 1, dy: 0 };
    }

    // WIPE / LASER SCAN / DRAW THEN FILL / CHALK DUST on items -> clip sweep
    if (fx === 'wipe' || fx === 'laser_scan' || fx === 'draw_then_fill' || fx === 'chalk_dust' || fx === 'draw') {
      const pad = 10;
      const fullW = bb.w + pad * 2;
      const rx = rev ? bb.x1 + pad - fullW * e : bb.x0 - pad;
      const edgeX = rev ? rx : rx + fullW * e;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, bb.y0 - pad, fullW * e, bb.h + pad * 2);
      ctx.clip();
      paintItemFn(ctx, item);
      ctx.restore();
      if (e > 0.02 && e < 0.98) {
        ctx.save();
        ctx.strokeStyle = fx === 'laser_scan' ? '#06b6d4' : '#38bdf8';
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = fx === 'laser_scan' ? 2.4 : 1.6;
        ctx.beginPath();
        ctx.moveTo(edgeX, bb.y0);
        ctx.lineTo(edgeX, bb.y1);
        ctx.stroke();
        ctx.restore();
      }
      return { x: edgeX, y: bb.cy, dx: rev ? -1 : 1, dy: 0 };
    }

    // TRANSFORM EFFECTS: zoom, spring, slide, mirror_flip, center_out, fade
    ctx.save();
    if (fx === 'zoom') {
      const sc = Math.max(0.12, 0.15 + 0.85 * Math.min(1.15, e));
      ctx.globalAlpha *= Math.min(1, 0.2 + 0.8 * p);
      ctx.translate(bb.cx, bb.cy);
      ctx.scale(sc, sc);
      ctx.translate(-bb.cx, -bb.cy);
    } else if (fx === 'spring') {
      const sc = Math.max(0.08, 1 + 0.2 * Math.sin(p * Math.PI * 2.5) * Math.exp(-3.1 * p) - Math.exp(-6.5 * p));
      ctx.globalAlpha *= Math.min(1, p * 2.6);
      ctx.translate(bb.cx, bb.cy);
      ctx.scale(sc, sc);
      ctx.translate(-bb.cx, -bb.cy);
    } else if (fx === 'slide' || fx === 'extrude_rise') {
      const dir = rev ? -1 : 1;
      const offY = dir * 28 * (1 - e);
      ctx.globalAlpha *= Math.min(1, p * 1.35);
      ctx.translate(0, offY);
    } else if (fx === 'mirror_flip') {
      const sx = Math.max(0.05, Math.abs(Math.cos((1 - e) * Math.PI * 0.5)));
      ctx.globalAlpha *= Math.min(1, 0.25 + 0.75 * e);
      ctx.translate(bb.cx, bb.cy);
      ctx.scale(sx, 1);
      ctx.translate(-bb.cx, -bb.cy);
    } else if (fx === 'center_out') {
      const halfW = (bb.w * 0.5 + 8) * e;
      ctx.beginPath();
      ctx.rect(bb.cx - halfW, bb.y0 - 8, halfW * 2, bb.h + 16);
      ctx.clip();
    } else {
      ctx.globalAlpha *= e;
    }
    paintItemFn(ctx, item);
    ctx.restore();
    return tip;
  }

  // ============================================================================
  // 13. FREEHAND / PEN / HIGHLIGHTER STROKE RENDERER
  // ============================================================================
  function paintStrokeFX(ctx, stroke, prog, rawP, fx, rev, paintStrokeFn) {
    if (!ctx || !stroke || typeof paintStrokeFn !== 'function') return null;
    const p = clamp01(rawP);
    if (p <= 0) return null;
    const bb = _bboxFromStroke(stroke) || { x0: 0, y0: 0, x1: 20, y1: 20, cx: 10, cy: 10, w: 20, h: 20 };
    const tip = { x: bb.cx, y: bb.cy, dx: 1, dy: 0 };

    if (p >= 0.999 && !OVERLAY_END_EFFECTS.has(fx)) {
      paintStrokeFn(ctx, stroke);
      return tip;
    }

    if (OVERLAY_END_EFFECTS.has(fx)) {
      const revealP = clamp01(p / 0.55);
      const ptsCount = Math.floor((stroke.pts ? stroke.pts.length : 0) / 3);
      ctx.save();
      if (fx === 'wiggle_alert' && p < 0.995) {
        const ang = Math.sin(p * Math.PI * 6) * 0.05 * evalEase(p, 'bump');
        ctx.translate(bb.cx, bb.cy);
        ctx.rotate(ang);
        ctx.translate(-bb.cx, -bb.cy);
      }
      if (revealP >= 0.999 || ptsCount < 2) {
        paintStrokeFn(ctx, stroke);
      } else {
        const endCount = Math.max(2, Math.ceil(ptsCount * evalEase(revealP, 'easeOut')));
        const sub = rev
          ? { ...stroke, pts: stroke.pts.slice((ptsCount - endCount) * 3) }
          : { ...stroke, pts: stroke.pts.slice(0, endCount * 3) };
        paintStrokeFn(ctx, sub);
      }
      ctx.restore();
      if (p < 0.998) {
        paintOverlayDecoration(ctx, bb, { x: bb.cx, y: bb.cy }, clamp01((p - 0.30) / 0.70), fx);
      }
      return tip;
    }

    // Transform whole stroke effects
    if (fx === 'fade' || fx === 'zoom' || fx === 'spring' || fx === 'slide' || fx === 'wipe' || fx === 'mirror_flip' || fx === 'extrude_rise') {
      const e = clamp01(prog);
      ctx.save();
      if (fx === 'fade') ctx.globalAlpha *= e;
      else if (fx === 'zoom') {
        const sc = Math.max(0.12, 0.15 + 0.85 * Math.min(1.15, e));
        ctx.globalAlpha *= Math.min(1, 0.22 + 0.78 * p);
        ctx.translate(bb.cx, bb.cy); ctx.scale(sc, sc); ctx.translate(-bb.cx, -bb.cy);
      } else if (fx === 'spring') {
        const sc = Math.max(0.08, 1 + 0.2 * Math.sin(p * Math.PI * 2.5) * Math.exp(-3.1 * p) - Math.exp(-6.5 * p));
        ctx.globalAlpha *= Math.min(1, p * 2.6);
        ctx.translate(bb.cx, bb.cy); ctx.scale(sc, sc); ctx.translate(-bb.cx, -bb.cy);
      } else if (fx === 'slide' || fx === 'extrude_rise') {
        const offY = (rev ? -1 : 1) * 26 * (1 - e);
        ctx.globalAlpha *= Math.min(1, p * 1.35);
        ctx.translate(0, offY);
      } else if (fx === 'mirror_flip') {
        const sx = Math.max(0.05, Math.abs(Math.cos((1 - e) * Math.PI * 0.5)));
        ctx.translate(bb.cx, bb.cy); ctx.scale(sx, 1); ctx.translate(-bb.cx, -bb.cy);
      } else if (fx === 'wipe') {
        const pad = 10;
        const wTot = bb.w + pad * 2;
        const rx = rev ? bb.x1 + pad - wTot * e : bb.x0 - pad;
        ctx.beginPath(); ctx.rect(rx, bb.y0 - pad, wTot * e, bb.h + pad * 2); ctx.clip();
      }
      paintStrokeFn(ctx, stroke);
      ctx.restore();
      return tip;
    }

    // Fourier epicycles tracing freehand stroke contour
    if (fx === 'fourier_epicycles') {
      const rawArrF = Array.isArray(stroke.pts) ? stroke.pts : [];
      const sPts = [];
      for (let i = 0; i < rawArrF.length; i += 3) {
        sPts.push({ x: rawArrF[i], y: rawArrF[i + 1] });
      }
      if (sPts.length >= 2) {
        const terms = computeFourierEpicycles(sPts, 14, { closed: false });
        if (terms.length) {
          const traceT = clamp01(prog);
          const phaseMax = traceT * 0.5;
          const epAlpha = p < 0.82 ? 1 : clamp01(1 - (p - 0.82) / 0.18);
          const tracePts = [];
          const steps = Math.max(8, Math.round(72 * traceT));
          for (let i = 0; i <= steps; i++) {
            const ch = evalEpicycles(terms, (i / steps) * phaseMax);
            if (ch.length) {
              const last = ch[ch.length - 1];
              tracePts.push({ x: last.nextX, y: last.nextY });
            }
          }
          ctx.save();
          if (tracePts.length >= 2) {
            ctx.strokeStyle = stroke.color || '#1e293b';
            ctx.lineWidth = stroke.width || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
            ctx.shadowBlur = 10 * epAlpha;
            ctx.beginPath();
            tracePts.forEach((pt, idx) => (idx ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
            ctx.stroke();
          }
          const chain = evalEpicycles(terms, phaseMax);
          let headTip = tip;
          if (chain.length && epAlpha > 0.02) {
            ctx.shadowBlur = 0;
            for (let i = 1; i < chain.length; i++) {
              const c = chain[i];
              if (c.r < 1.2) continue;
              ctx.beginPath();
              ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(37, 99, 235, ${(0.25 * epAlpha).toFixed(3)})`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(c.x, c.y);
              ctx.lineTo(c.nextX, c.nextY);
              ctx.strokeStyle = `rgba(56, 189, 248, ${(0.72 * epAlpha).toFixed(3)})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            const last = chain[chain.length - 1];
            headTip = { x: last.nextX, y: last.nextY, dx: 1, dy: 0 };
            if (tracePts.length >= 2) {
              const prev = tracePts[tracePts.length - 2];
              const L = Math.hypot(headTip.x - prev.x, headTip.y - prev.y) || 1;
              headTip.dx = (headTip.x - prev.x) / L;
              headTip.dy = (headTip.y - prev.y) / L;
            }
            ctx.beginPath();
            ctx.arc(headTip.x, headTip.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
          }
          ctx.restore();
          return headTip;
        }
      }
    }

    // Progressive slice drawing on stroke.pts ([x, y, pressure, ...])
    const rawArr = Array.isArray(stroke.pts) ? stroke.pts : [];
    const nPts = Math.floor(rawArr.length / 3);
    if (nPts < 2) {
      paintStrokeFn(ctx, stroke);
      return tip;
    }
    const e = clamp01(prog);
    let subPts;
    let tipIdx;
    if (fx === 'center_out') {
      const mid = Math.floor(nPts / 2);
      const span = Math.max(1, Math.ceil((nPts / 2) * e));
      const i0 = Math.max(0, mid - span);
      const i1 = Math.min(nPts, mid + span + 1);
      subPts = rawArr.slice(i0 * 3, i1 * 3);
      tipIdx = (i1 - 1) * 3;
    } else if (rev) {
      const take = Math.max(2, Math.ceil(nPts * e));
      const i0 = nPts - take;
      subPts = rawArr.slice(i0 * 3);
      tipIdx = i0 * 3;
    } else {
      const take = Math.max(2, Math.ceil(nPts * e));
      subPts = rawArr.slice(0, take * 3);
      tipIdx = (take - 1) * 3;
    }

    const activeTip = {
      x: rawArr[tipIdx] || bb.cx,
      y: rawArr[tipIdx + 1] || bb.cy,
      dx: 1,
      dy: 0
    };
    const prevIdx = rev ? Math.min(nPts - 1, tipIdx / 3 + 1) * 3 : Math.max(0, tipIdx / 3 - 1) * 3;
    const dx = activeTip.x - (rawArr[prevIdx] ?? activeTip.x);
    const dy = activeTip.y - (rawArr[prevIdx + 1] ?? activeTip.y);
    const segLen = Math.hypot(dx, dy);
    if (segLen > 1e-4) {
      activeTip.dx = dx / segLen;
      activeTip.dy = dy / segLen;
    }

    ctx.save();
    if (fx === 'glow' || fx === 'laser_scan') {
      const haloStroke = {
        ...stroke,
        pts: subPts,
        color: fx === 'laser_scan' ? 'rgba(6, 182, 212, 0.24)' : 'rgba(56, 189, 248, 0.26)',
        width: (stroke.width || 3) + 6
      };
      paintStrokeFn(ctx, haloStroke);
    }
    paintStrokeFn(ctx, { ...stroke, pts: subPts });
    if (fx === 'arrow_slide') {
      _drawArrowHead(ctx, activeTip.x, activeTip.y, activeTip.dx, activeTip.dy, Math.max(10, 6 + (stroke.width || 3) * 1.8), stroke.color || '#2563eb');
    } else if (fx === 'laser_scan') {
      ctx.beginPath();
      ctx.arc(activeTip.x, activeTip.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
    } else if (fx === 'chalk_dust') {
      const rng = mulberry32(hashStr((stroke.id || '') + Math.round(p * 16)));
      for (let i = 0; i < 6; i++) {
        const a = rng() * Math.PI * 2;
        const r = 2 + rng() * 9;
        ctx.fillStyle = stroke.color || '#334155';
        ctx.globalAlpha = 0.2 + rng() * 0.3;
        ctx.beginPath();
        ctx.arc(activeTip.x + Math.cos(a) * r, activeTip.y + Math.sin(a) * r, 0.8 + rng() * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return activeTip;
  }

  // ============================================================================
  // 14. PURE NON-DESTRUCTIVE CUE-ONLY OVERLAY (mode === 'cue')
  // ============================================================================
  function paintCueOnlyFX(ctx, bb, center, rawP, fx) {
    if (!ctx) return;
    const p = clamp01(rawP);
    if (p <= 0 || p >= 0.998) return;
    const chosen = OVERLAY_END_EFFECTS.has(fx) ? fx : 'mention_glow';
    paintOverlayDecoration(ctx, bb, center, p, chosen, { pad: 8, persistAtEnd: false });
  }

  // ============================================================================
  // 15. UNIVERSAL MORPH A → B (GEOMETRY, MULTI-SEGMENT GROUPS, REGIONS, STROKES, ITEMS)
  // ============================================================================
  function _parseCssRgba(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim();
    if (!s || s === 'none' || s === 'transparent') return [0, 0, 0, 0];
    if (s[0] === '#') {
      const hex = s.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return [r, g, b, Number.isFinite(a) ? a : 1];
      } else if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return [r, g, b, Number.isFinite(a) ? a : 1];
      }
      return null;
    }
    const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(s);
    if (m) {
      return [
        Math.max(0, Math.min(255, Number(m[1]) || 0)),
        Math.max(0, Math.min(255, Number(m[2]) || 0)),
        Math.max(0, Math.min(255, Number(m[3]) || 0)),
        m[4] !== undefined ? clamp01(Number(m[4])) : 1
      ];
    }
    return null;
  }

  function _lerpCssRgba(colA, colB, t, fallback = '#1e293b') {
    const u = clamp01(t);
    const a = _parseCssRgba(colA);
    const b = _parseCssRgba(colB);
    if (!a && !b) return fallback;
    if (!a && b) return `rgba(${Math.round(b[0])}, ${Math.round(b[1])}, ${Math.round(b[2])}, ${(b[3] * u).toFixed(3)})`;
    if (a && !b) return `rgba(${Math.round(a[0])}, ${Math.round(a[1])}, ${Math.round(a[2])}, ${(a[3] * (1 - u)).toFixed(3)})`;
    const r = Math.round(lerp(a[0], b[0], u));
    const g = Math.round(lerp(a[1], b[1], u));
    const bl = Math.round(lerp(a[2], b[2], u));
    const al = lerp(a[3], b[3], u);
    return `rgba(${r}, ${g}, ${bl}, ${clamp01(al).toFixed(3)})`;
  }

  function _stitchOpenContours(contours) {
    const closedList = [];
    const openList = [];
    for (const c of contours) {
      if (!c || !Array.isArray(c.pts) || c.pts.length < 2) continue;
      if (c.closed) closedList.push(c);
      else openList.push({ ...c, pts: c.pts.slice() });
    }
    const EPS = 2.8;
    const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= EPS;
    const used = new Array(openList.length).fill(false);
    const stitched = [];
    for (let i = 0; i < openList.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const base = { ...openList[i], pts: openList[i].pts.slice() };
      let extended = true;
      while (extended) {
        extended = false;
        const head = base.pts[0];
        const tail = base.pts[base.pts.length - 1];
        for (let j = 0; j < openList.length; j++) {
          if (used[j]) continue;
          const cand = openList[j];
          if (cand.strokeColor !== base.strokeColor || !!cand.dashed !== !!base.dashed) continue;
          const cHead = cand.pts[0];
          const cTail = cand.pts[cand.pts.length - 1];
          if (near(tail, cHead)) {
            base.pts.push(...cand.pts.slice(1));
            used[j] = true; extended = true; break;
          } else if (near(tail, cTail)) {
            base.pts.push(...cand.pts.slice(0, -1).reverse());
            used[j] = true; extended = true; break;
          } else if (near(head, cTail)) {
            base.pts = [...cand.pts.slice(0, -1), ...base.pts];
            used[j] = true; extended = true; break;
          } else if (near(head, cHead)) {
            base.pts = [...cand.pts.slice(1).reverse(), ...base.pts];
            used[j] = true; extended = true; break;
          }
        }
      }
      if (base.pts.length >= 4 && near(base.pts[0], base.pts[base.pts.length - 1])) {
        base.pts.pop();
        base.closed = true;
      }
      stitched.push(base);
    }
    return [...closedList, ...stitched];
  }

  function _contourCentroid(pts) {
    if (!pts || !pts.length) return { x: 0, y: 0 };
    let sx = 0, sy = 0;
    for (const p of pts) { sx += p.x; sy += p.y; }
    return { x: sx / pts.length, y: sy / pts.length };
  }

  function _extractBundleContours(bundle, coords, helpers) {
    const raw = [];
    for (const sh of (bundle.shapes || [])) {
      const pls = extractShapePolylines(sh, coords, helpers);
      const fillCol = sh.fill || (sh.kind === 'plane' ? _lerpCssRgba(null, sh.color || '#2563eb', 0.10) : (sh.kind === 'annulus' ? _lerpCssRgba(null, sh.color || '#2563eb', 0.18) : null));
      const strokeW = (sh.kind === 'region' && !(sh.width > 0)) ? 0 : (sh.width ?? 2);
      for (const pl of pls) {
        if (!pl.pts || pl.pts.length < 2) continue;
        raw.push({
          pts: pl.pts,
          closed: !!pl.closed,
          dashed: !!(pl.dashed || sh.dashed),
          strokeColor: sh.color || '#1e293b',
          lineWidth: strokeW,
          fillColor: pl.closed ? fillCol : null
        });
      }
    }
    for (const sk of (bundle.strokes || [])) {
      if (!sk || !Array.isArray(sk.pts) || sk.pts.length < 6) continue;
      const pts = [];
      for (let i = 0; i < sk.pts.length; i += 3) {
        const x = sk.pts[i], y = sk.pts[i + 1];
        if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
      }
      if (pts.length >= 2) {
        const closed = pts.length >= 6 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 12;
        raw.push({
          pts: closed ? pts.slice(0, -1) : pts,
          closed,
          dashed: false,
          strokeColor: sk.color || '#1e293b',
          lineWidth: sk.width || 3,
          fillColor: null
        });
      }
    }
    return _stitchOpenContours(raw);
  }

  function _bundleBBox(bundle, contours, helpers) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (b) => {
      if (!b) return;
      if (Number.isFinite(b.x0) && b.x0 < x0) x0 = b.x0;
      if (Number.isFinite(b.y0) && b.y0 < y0) y0 = b.y0;
      if (Number.isFinite(b.x1) && b.x1 > x1) x1 = b.x1;
      if (Number.isFinite(b.y1) && b.y1 > y1) y1 = b.y1;
    };
    grow(_bboxFromPolylines(contours));
    for (const it of (bundle.items || [])) grow(_bboxFromItem(it, helpers && helpers.bboxItem));
    for (const sk of (bundle.strokes || [])) grow(_bboxFromStroke(sk));
    if (!Number.isFinite(x0)) return null;
    return {
      x0, y0, x1, y1,
      cx: (x0 + x1) * 0.5, cy: (y0 + y1) * 0.5,
      w: Math.max(6, x1 - x0), h: Math.max(6, y1 - y0)
    };
  }

  function _pairContours(srcList, dstList) {
    if (!srcList.length || !dstList.length) return [];
    const pairs = [];
    const nA = srcList.length, nB = dstList.length;
    if (nA === nB) {
      const usedB = new Array(nB).fill(false);
      for (let i = 0; i < nA; i++) {
        const cA = _contourCentroid(srcList[i].pts);
        let bestJ = -1, bestD = Infinity;
        for (let j = 0; j < nB; j++) {
          if (usedB[j]) continue;
          const cB = _contourCentroid(dstList[j].pts);
          const d = (cA.x - cB.x) ** 2 + (cA.y - cB.y) ** 2;
          if (d < bestD) { bestD = d; bestJ = j; }
        }
        usedB[bestJ] = true;
        pairs.push([srcList[i], dstList[bestJ]]);
      }
      return pairs;
    }
    const maxN = Math.max(nA, nB);
    for (let i = 0; i < maxN; i++) {
      const a = srcList[Math.min(nA - 1, Math.floor((i * nA) / maxN))];
      const b = dstList[Math.min(nB - 1, Math.floor((i * nB) / maxN))];
      pairs.push([a, b]);
    }
    return pairs;
  }

  function _paintBundleRaw(ctx, bundle, coords, helpers) {
    for (const sh of (bundle.shapes || [])) {
      if (helpers && typeof helpers.tee === 'function') helpers.tee(ctx, sh, coords);
    }
    for (const sk of (bundle.strokes || [])) {
      if (helpers && typeof helpers.paintStroke === 'function') helpers.paintStroke(ctx, sk);
    }
    for (const it of (bundle.items || [])) {
      if (helpers && typeof helpers.paintItem === 'function') helpers.paintItem(ctx, it);
    }
  }

  function paintMorphBetween(ctx, srcBundle, dstBundle, prog, rawP, coords, helpers, opts = {}) {
    if (!ctx || !srcBundle || !dstBundle) return null;
    const u = clamp01(prog);
    const pRaw = clamp01(rawP);
    const hasItems = (srcBundle.items && srcBundle.items.length > 0) || (dstBundle.items && dstBundle.items.length > 0);
    const srcContours = hasItems ? [] : _extractBundleContours(srcBundle, coords, helpers);
    const dstContours = hasItems ? [] : _extractBundleContours(dstBundle, coords, helpers);
    const bbA = _bundleBBox(srcBundle, srcContours, helpers);
    const bbB = _bundleBBox(dstBundle, dstContours, helpers);
    if (!bbA && !bbB) return null;

    const cxA = bbA ? bbA.cx : bbB.cx;
    const cyA = bbA ? bbA.cy : bbB.cy;
    const cxB = bbB ? bbB.cx : bbA.cx;
    const cyB = bbB ? bbB.cy : bbA.cy;
    const dx = cxB - cxA;
    const dy = cyB - cyA;
    const dLen = Math.hypot(dx, dy) || 1;
    const tip = {
      x: lerp(cxA, cxB, u),
      y: lerp(cyA, cyB, u),
      dx: dx / dLen,
      dy: dy / dLen
    };
    const glow = evalEase(pRaw, 'bump');

    // Mode 1: Pure Vector Contour Morph (Geometry shapes, multi-segment groups, regions, pen strokes)
    if (!hasItems && srcContours.length && dstContours.length) {
      const pairs = _pairContours(srcContours, dstContours);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [cA, cB] of pairs) {
        const bothClosed = !!(cA.closed && cB.closed);
        let ptsA = cA.pts;
        let ptsB = cB.pts;
        if (!bothClosed) {
          if (cA.closed && ptsA.length >= 2) ptsA = [...ptsA, ptsA[0]];
          if (cB.closed && ptsB.length >= 2) ptsB = [...ptsB, ptsB[0]];
        }
        if (opts.rev) ptsB = [...ptsB].reverse();
        const morphed = interpolatePolygons(ptsA, ptsB, u, bothClosed);
        if (morphed.length < 2) continue;

        ctx.beginPath();
        morphed.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (bothClosed) ctx.closePath();

        // Smooth RGBA fill cross-interpolation
        if (cA.fillColor || cB.fillColor) {
          const fillStr = _lerpCssRgba(cA.fillColor, cB.fillColor, u, null);
          if (fillStr) {
            ctx.save();
            ctx.fillStyle = fillStr;
            ctx.fill();
            ctx.restore();
          }
        }

        const lw = lerp(cA.lineWidth ?? 2, cB.lineWidth ?? 2, u);
        if (lw > 0.08) {
          const strokeStr = _lerpCssRgba(cA.strokeColor, cB.strokeColor, u, cB.strokeColor || '#1e293b');
          const dashed = u < 0.5 ? cA.dashed : cB.dashed;
          ctx.setLineDash(dashed ? [9, 7] : []);
          if (glow > 0.03) {
            ctx.save();
            ctx.strokeStyle = `rgba(99, 102, 241, ${(0.22 * glow).toFixed(3)})`;
            ctx.lineWidth = lw + 5.5;
            ctx.stroke();
            ctx.restore();
          }
          ctx.strokeStyle = strokeStr;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      }
      ctx.restore();
      return tip;
    }

    // Mode 2: Magic Move Morph for Items (KaTeX formulas, text, images, graphs, tables) & Cross-type pairs
    const boxA = bbA || bbB;
    const boxB = bbB || bbA;
    const mW = Math.max(6, lerp(boxA.w, boxB.w, u));
    const mH = Math.max(6, lerp(boxA.h, boxB.h, u));
    const mCx = lerp(boxA.cx, boxB.cx, u);
    const mCy = lerp(boxA.cy, boxB.cy, u);
    const alphaB = clamp01(smootherstep(u));
    const alphaA = clamp01(1 - alphaB);

    ctx.save();
    if (glow > 0.04) {
      ctx.save();
      _drawRoundedRect(ctx, mCx - mW * 0.5 - 6, mCy - mH * 0.5 - 6, mW + 12, mH + 12, 10);
      ctx.strokeStyle = `rgba(99, 102, 241, ${(0.28 * glow).toFixed(3)})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }
    if (alphaA > 0.015) {
      const sxA = Math.max(0.18, Math.min(4.5, mW / Math.max(6, boxA.w)));
      const syA = Math.max(0.18, Math.min(4.5, mH / Math.max(6, boxA.h)));
      ctx.save();
      ctx.globalAlpha *= alphaA;
      ctx.translate(mCx, mCy);
      ctx.scale(sxA, syA);
      ctx.translate(-boxA.cx, -boxA.cy);
      _paintBundleRaw(ctx, srcBundle, coords, helpers);
      ctx.restore();
    }
    if (alphaB > 0.015) {
      const sxB = Math.max(0.18, Math.min(4.5, mW / Math.max(6, boxB.w)));
      const syB = Math.max(0.18, Math.min(4.5, mH / Math.max(6, boxB.h)));
      ctx.save();
      ctx.globalAlpha *= alphaB;
      ctx.translate(mCx, mCy);
      ctx.scale(sxB, syB);
      ctx.translate(-boxB.cx, -boxB.cy);
      _paintBundleRaw(ctx, dstBundle, coords, helpers);
      ctx.restore();
    }
    ctx.restore();
    return tip;
  }

  // ============================================================================
  // EXPORT PUBLIC API (Browser global + Node CommonJS for unit tests)
  // ============================================================================
  const api = {
    clamp01,
    lerp,
    lerpPt,
    mulberry32,
    hashStr,
    EASINGS,
    evalEase,
    splitCubicBezierPrefix,
    resamplePolyline,
    alignPolygons,
    interpolatePolygons,
    computeFourierEpicycles,
    evalEpicycles,
    rayTriangleIntersect,
    visibilityRuns3D,
    stepSpringCamera,
    EFFECT_CATEGORIES,
    EFFECTS,
    EFFECT_MAP,
    LEGACY_EFFECTS,
    OVERLAY_END_EFFECTS,
    getEffectsForStep,
    STYLE_PRESETS,
    applyStylePresetToSteps,
    extractShapePolylines,
    paintShapeFX,
    paintPointFX,
    paintItemFX,
    paintStrokeFX,
    paintCueOnlyFX,
    paintMorphBetween
  };

  if (root && typeof root === 'object') {
    root.MinNoteMotionFX = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
