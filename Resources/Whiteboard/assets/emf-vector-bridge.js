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
/* MinNote EMF Vector Bridge (PA2 - Inkscape/MinInk SVG -> EMF)
 * Records HTML5 Canvas2D draw calls (including Path2D) into a pure, transparent SVG
 * for ultra-fast Inkscape/MinInk --export-type=emf --export-text-to-path conversion.
 */
(function () {
  'use strict';

  function fmt(n) {
    if (!Number.isFinite(n)) return '0';
    const r = Math.round(n * 1000) / 1000;
    return Object.is(r, -0) ? '0' : String(r);
  }

  function escXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ---- Shared SVG Path Builder (used by BOTH Path2D wrapper and SvgCanvasRecorder) ----
  function createPathOps(parts) {
    let curX = 0, curY = 0, startX = 0, startY = 0, hasSub = false;

    function pushMove(x, y) {
      parts.push(`M${fmt(x)} ${fmt(y)}`);
      curX = startX = x;
      curY = startY = y;
      hasSub = true;
    }

    function pushLine(x, y) {
      if (!hasSub) pushMove(x, y);
      else {
        parts.push(`L${fmt(x)} ${fmt(y)}`);
        curX = x;
        curY = y;
      }
    }

    function pushEllipse(cx, cy, rx, ry, rot, startA, endA, ccw) {
      rx = Math.abs(rx);
      ry = Math.abs(ry);
      if (rx < 1e-6 && ry < 1e-6) return;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const pt = (a) => {
        const lx = rx * Math.cos(a), ly = ry * Math.sin(a);
        return [cx + lx * cosR - ly * sinR, cy + lx * sinR + ly * cosR];
      };
      const rotDeg = (rot * 180) / Math.PI;
      const sweep = ccw ? 0 : 1;

      let delta = endA - startA;
      if (!ccw) {
        if (delta >= Math.PI * 2 - 1e-6) {
          delta = Math.PI * 2;
        } else {
          while (delta < 0) delta += Math.PI * 2;
          delta = delta % (Math.PI * 2);
          if (delta === 0 && endA !== startA) delta = Math.PI * 2;
        }
      } else {
        if (delta <= -(Math.PI * 2 - 1e-6)) {
          delta = -Math.PI * 2;
        } else {
          while (delta > 0) delta -= Math.PI * 2;
          delta = -((-delta) % (Math.PI * 2));
          if (delta === 0 && endA !== startA) delta = -Math.PI * 2;
        }
      }

      const [sx, sy] = pt(startA);
      if (!hasSub) pushMove(sx, sy);
      else pushLine(sx, sy);

      if (Math.abs(delta) >= Math.PI * 2 - 1e-4) {
        const midA = startA + (ccw ? -Math.PI : Math.PI);
        const [mx, my] = pt(midA);
        parts.push(`A${fmt(rx)} ${fmt(ry)} ${fmt(rotDeg)} 0 ${sweep} ${fmt(mx)} ${fmt(my)}`);
        parts.push(`A${fmt(rx)} ${fmt(ry)} ${fmt(rotDeg)} 0 ${sweep} ${fmt(sx)} ${fmt(sy)}`);
        curX = sx;
        curY = sy;
      } else if (Math.abs(delta) > 1e-6) {
        const [ex, ey] = pt(startA + delta);
        const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
        parts.push(`A${fmt(rx)} ${fmt(ry)} ${fmt(rotDeg)} ${largeArc} ${sweep} ${fmt(ex)} ${fmt(ey)}`);
        curX = ex;
        curY = ey;
      }
    }

    function pushArcTo(x1, y1, x2, y2, r) {
      if (r < 0) return;
      if (!hasSub) {
        pushMove(x1, y1);
        return;
      }
      const x0 = curX, y0 = curY;
      const dx1 = x0 - x1, dy1 = y0 - y1;
      const dx2 = x2 - x1, dy2 = y2 - y1;
      const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
      if (l1 < 1e-6 || l2 < 1e-6 || r < 1e-6) {
        pushLine(x1, y1);
        return;
      }
      const ux1 = dx1 / l1, uy1 = dy1 / l1;
      const ux2 = dx2 / l2, uy2 = dy2 / l2;
      const cross = ux1 * uy2 - uy1 * ux2;
      if (Math.abs(cross) < 1e-6) {
        pushLine(x1, y1);
        return;
      }
      const dot = Math.max(-1, Math.min(1, ux1 * ux2 + uy1 * uy2));
      const angle = Math.acos(dot);
      const tanDist = r / Math.tan(angle / 2);
      const t1x = x1 + ux1 * tanDist, t1y = y1 + uy1 * tanDist;
      const t2x = x1 + ux2 * tanDist, t2y = y1 + uy2 * tanDist;
      pushLine(t1x, t1y);
      const sweep = cross < 0 ? 1 : 0;
      parts.push(`A${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(t2x)} ${fmt(t2y)}`);
      curX = t2x;
      curY = t2y;
    }

    function pushRect(x, y, w, h) {
      parts.push(`M${fmt(x)} ${fmt(y)}H${fmt(x + w)}V${fmt(y + h)}H${fmt(x)}Z`);
      curX = startX = x;
      curY = startY = y;
      hasSub = true;
    }

    function pushRoundRect(x, y, w, h, radii) {
      let r = 0;
      if (typeof radii === 'number') r = radii;
      else if (Array.isArray(radii) && radii.length) r = typeof radii[0] === 'number' ? radii[0] : (radii[0]?.x || 0);
      r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      if (r < 1e-4) {
        pushRect(x, y, w, h);
        return;
      }
      pushMove(x + r, y);
      pushLine(x + w - r, y);
      parts.push(`A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + w)} ${fmt(y + r)}`);
      pushLine(x + w, y + h - r);
      parts.push(`A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + w - r)} ${fmt(y + h)}`);
      pushLine(x + r, y + h);
      parts.push(`A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y + h - r)}`);
      pushLine(x, y + r);
      parts.push(`A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + r)} ${fmt(y)}`);
      parts.push('Z');
      curX = startX = x + r;
      curY = startY = y;
    }

    return {
      moveTo: pushMove,
      lineTo: pushLine,
      bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        if (!hasSub) pushMove(cp1x, cp1y);
        parts.push(`C${fmt(cp1x)} ${fmt(cp1y)} ${fmt(cp2x)} ${fmt(cp2y)} ${fmt(x)} ${fmt(y)}`);
        curX = x;
        curY = y;
      },
      quadraticCurveTo(cpx, cpy, x, y) {
        if (!hasSub) pushMove(cpx, cpy);
        parts.push(`Q${fmt(cpx)} ${fmt(cpy)} ${fmt(x)} ${fmt(y)}`);
        curX = x;
        curY = y;
      },
      arc(x, y, r, startA, endA, ccw) {
        pushEllipse(x, y, r, r, 0, startA, endA, !!ccw);
      },
      arcTo: pushArcTo,
      ellipse: pushEllipse,
      rect: pushRect,
      roundRect: pushRoundRect,
      closePath() {
        if (hasSub) {
          parts.push('Z');
          curX = startX;
          curY = startY;
        }
      },
      reset() {
        parts.length = 0;
        curX = curY = startX = startY = 0;
        hasSub = false;
      }
    };
  }

  // ---- Wrap native Path2D BEFORE whiteboard engine loads so pen/fountain/emoji paths keep SVG data ----
  const path2dStore = new WeakMap();
  if (typeof window.Path2D === 'function' && !window.Path2D.__minnoteWrapped) {
    const NativePath2D = window.Path2D;
    function TrackedPath2D(arg) {
      const inst = arg !== undefined ? new NativePath2D(arg) : new NativePath2D();
      const parts = [];
      if (typeof arg === 'string' && arg.trim()) {
        parts.push(arg.trim());
      } else if (arg && path2dStore.has(arg)) {
        const src = path2dStore.get(arg);
        if (src && src.parts.length) parts.push(...src.parts);
      }
      const ops = createPathOps(parts);
      path2dStore.set(inst, { parts, ops });
      return inst;
    }
    TrackedPath2D.prototype = NativePath2D.prototype;
    TrackedPath2D.__minnoteWrapped = true;

    ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'closePath'].forEach((m) => {
      const orig = NativePath2D.prototype[m];
      if (typeof orig !== 'function') return;
      NativePath2D.prototype[m] = function (...args) {
        const rec = path2dStore.get(this);
        if (rec && rec.ops[m]) {
          try { rec.ops[m](...args); } catch (_) {}
        }
        return orig.apply(this, args);
      };
    });

    const origAddPath = NativePath2D.prototype.addPath;
    if (typeof origAddPath === 'function') {
      NativePath2D.prototype.addPath = function (other, transform) {
        const rec = path2dStore.get(this);
        const otherRec = other && path2dStore.get(other);
        if (rec && otherRec && otherRec.parts.length) {
          rec.parts.push(otherRec.parts.join(' '));
        }
        return origAddPath.apply(this, arguments);
      };
    }

    window.Path2D = TrackedPath2D;
  }

  // ---- Color Parser: splits CSS color + alpha cleanly for Inkscape EMF ----
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });

  function parsePaint(style, globalAlpha, defs) {
    const ga = Number.isFinite(globalAlpha) ? Math.max(0, Math.min(1, globalAlpha)) : 1;
    if (!style || style === 'none' || style === 'transparent') {
      return { paint: 'none', opacity: 0 };
    }
    if (style && style.__svgGradId) {
      return { paint: `url(#${style.__svgGradId})`, opacity: ga };
    }
    if (typeof style !== 'string') {
      return { paint: '#000000', opacity: ga };
    }
    const s = style.trim();
    // Fast path #rgb / #rrggbb
    if (/^#[0-9a-fA-F]{6}$/.test(s)) {
      return { paint: s, opacity: ga };
    }
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return { paint: `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`, opacity: ga };
    }
    if (/^#[0-9a-fA-F]{8}$/.test(s)) {
      const a = parseInt(s.slice(7, 9), 16) / 255;
      return { paint: s.slice(0, 7), opacity: ga * a };
    }
    const rgbaM = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (rgbaM) {
      const r = Math.round(Number(rgbaM[1]));
      const g = Math.round(Number(rgbaM[2]));
      const b = Math.round(Number(rgbaM[3]));
      const a = rgbaM[4] !== undefined ? Number(rgbaM[4]) : 1;
      return { paint: `rgb(${r},${g},${b})`, opacity: ga * a };
    }
    // Generic CSS color normalization via 1x1 canvas
    try {
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = '#000000';
      colorCtx.fillStyle = s;
      colorCtx.fillRect(0, 0, 1, 1);
      const d = colorCtx.getImageData(0, 0, 1, 1).data;
      return { paint: `rgb(${d[0]},${d[1]},${d[2]})`, opacity: ga * (d[3] / 255) };
    } catch (_) {
      return { paint: s, opacity: ga };
    }
  }

  // ---- Parse CSS canvas font string for Inkscape SVG <text> ----
  function parseCanvasFont(fontStr) {
    let style = 'normal';
    let weight = 'normal';
    let size = 16;
    let family = 'Times New Roman, serif';
    if (typeof fontStr === 'string' && fontStr.trim()) {
      const s = fontStr.trim();
      if (/\bitalic\b/i.test(s)) style = 'italic';
      else if (/\boblique\b/i.test(s)) style = 'oblique';

      const wMatch = s.match(/\b(bold|bolder|lighter|[1-9]00)\b/i);
      if (wMatch) weight = wMatch[1];

      const szMatch = s.match(/([\d.]+)(px|pt)\b/i);
      if (szMatch) {
        size = parseFloat(szMatch[1]);
        if (szMatch[2].toLowerCase() === 'pt') size *= 96 / 72;
        const afterSize = s.slice(szMatch.index + szMatch[0].length).replace(/^\s*\/\s*[\d.\w%]+\s*/, '').trim();
        if (afterSize) {
          family = /KaTeX_/i.test(afterSize) ? 'Cambria Math, Times New Roman, serif' : afterSize;
        }
      }
    }
    return { style, weight, size, family };
  }

  // ---- 2D Affine Matrix helpers [a, b, c, d, e, f] ----
  function mulMat(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
  }

  function isIdentity(m) {
    return Math.abs(m[0] - 1) < 1e-5 && Math.abs(m[1]) < 1e-5 &&
      Math.abs(m[2]) < 1e-5 && Math.abs(m[3] - 1) < 1e-5 &&
      Math.abs(m[4]) < 1e-5 && Math.abs(m[5]) < 1e-5;
  }

  function matAttr(m) {
    if (isIdentity(m)) return '';
    return ` transform="matrix(${fmt(m[0])} ${fmt(m[1])} ${fmt(m[2])} ${fmt(m[3])} ${fmt(m[4])} ${fmt(m[5])})"`;
  }

  // ---- Transparent SVG Canvas2D Recorder ----
  function createSvgCanvasRecorder(width, height) {
    const W = Math.max(1, Math.ceil(width));
    const H = Math.max(1, Math.ceil(height));

    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = W;
    measureCanvas.height = H;
    const measureCtx = measureCanvas.getContext('2d');

    const defs = [];
    const elements = [];
    let defCounter = 0;

    const pathParts = [];
    const pathOps = createPathOps(pathParts);

    function defaultState() {
      return {
        mat: [1, 0, 0, 1, 0, 0],
        strokeStyle: '#000000',
        fillStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        lineDash: [],
        lineDashOffset: 0,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        clipId: null,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        shadowColor: 'rgba(0,0,0,0)',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0
      };
    }

    let st = defaultState();
    const stack = [];

    function cloneState(s) {
      return {
        ...s,
        mat: s.mat.slice(),
        lineDash: s.lineDash.slice()
      };
    }

    function wrapClip(elStr) {
      if (!st.clipId) return elStr;
      return `<g clip-path="url(#${st.clipId})">${elStr}</g>`;
    }

    function getPathString(pathArg) {
      if (pathArg && path2dStore.has(pathArg)) {
        return path2dStore.get(pathArg).parts.join(' ');
      }
      return pathParts.join(' ');
    }

    function buildStrokeAttrs() {
      const p = parsePaint(st.strokeStyle, st.globalAlpha, defs);
      if (p.paint === 'none' || p.opacity <= 0.001) return null;
      let attrs = ` fill="none" stroke="${escXml(p.paint)}" stroke-width="${fmt(st.lineWidth)}"`;
      if (p.opacity < 0.999) attrs += ` stroke-opacity="${fmt(p.opacity)}"`;
      if (st.lineCap && st.lineCap !== 'butt') attrs += ` stroke-linecap="${escXml(st.lineCap)}"`;
      if (st.lineJoin && st.lineJoin !== 'miter') attrs += ` stroke-linejoin="${escXml(st.lineJoin)}"`;
      if (st.miterLimit !== 10) attrs += ` stroke-miterlimit="${fmt(st.miterLimit)}"`;
      if (st.lineDash && st.lineDash.length) {
        attrs += ` stroke-dasharray="${st.lineDash.map(fmt).join(' ')}"`;
        if (st.lineDashOffset) attrs += ` stroke-dashoffset="${fmt(st.lineDashOffset)}"`;
      }
      return attrs;
    }

    function buildFillAttrs(rule) {
      const p = parsePaint(st.fillStyle, st.globalAlpha, defs);
      if (p.paint === 'none' || p.opacity <= 0.001) return null;
      let attrs = ` fill="${escXml(p.paint)}" stroke="none"`;
      if (p.opacity < 0.999) attrs += ` fill-opacity="${fmt(p.opacity)}"`;
      if (rule === 'evenodd') attrs += ` fill-rule="evenodd"`;
      return attrs;
    }

    function makeGradient(kind, coords) {
      const id = `g${++defCounter}`;
      const stops = [];
      const gradObj = {
        __svgGradId: id,
        addColorStop(offset, color) {
          stops.push({ offset, color });
          syncGradDef();
        }
      };
      const defIndex = defs.length;
      defs.push('');
      function syncGradDef() {
        const stopXml = stops.map((sp) => {
          const parsed = parsePaint(sp.color, 1, defs);
          const op = parsed.opacity < 0.999 ? ` stop-opacity="${fmt(parsed.opacity)}"` : '';
          return `<stop offset="${fmt(sp.offset * 100)}%" stop-color="${escXml(parsed.paint)}"${op}/>`;
        }).join('');
        if (kind === 'linear') {
          defs[defIndex] = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fmt(coords[0])}" y1="${fmt(coords[1])}" x2="${fmt(coords[2])}" y2="${fmt(coords[3])}">${stopXml}</linearGradient>`;
        } else {
          defs[defIndex] = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" fx="${fmt(coords[0])}" fy="${fmt(coords[1])}" cx="${fmt(coords[3])}" cy="${fmt(coords[4])}" r="${fmt(coords[5])}">${stopXml}</radialGradient>`;
        }
      }
      syncGradDef();
      return gradObj;
    }

    function imageToDataUrl(img, sx, sy, sw, sh) {
      try {
        const iw = img.naturalWidth || img.videoWidth || img.width || 0;
        const ih = img.naturalHeight || img.videoHeight || img.height || 0;
        if (!iw || !ih) return null;
        // Fast path: full uncropped HTMLImageElement with existing data URI
        if (sx === 0 && sy === 0 && sw === iw && sh === ih && typeof img.src === 'string' && img.src.startsWith('data:image/png;base64,')) {
          return img.src;
        }
        const tc = document.createElement('canvas');
        tc.width = Math.max(1, Math.round(sw));
        tc.height = Math.max(1, Math.round(sh));
        const tctx = tc.getContext('2d');
        tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tc.width, tc.height);
        return tc.toDataURL('image/png');
      } catch (_) {
        return null;
      }
    }

    const ctx = {
      canvas: { width: W, height: H },

      // State stack
      save() {
        stack.push(cloneState(st));
        measureCtx.save();
      },
      restore() {
        if (stack.length) st = stack.pop();
        measureCtx.restore();
      },

      // Transforms
      translate(x, y) {
        st.mat = mulMat(st.mat, [1, 0, 0, 1, x, y]);
      },
      scale(x, y) {
        st.mat = mulMat(st.mat, [x, 0, 0, y === undefined ? x : y, 0, 0]);
      },
      rotate(a) {
        const c = Math.cos(a), s = Math.sin(a);
        st.mat = mulMat(st.mat, [c, s, -s, c, 0, 0]);
      },
      transform(a, b, c, d, e, f) {
        st.mat = mulMat(st.mat, [a, b, c, d, e, f]);
      },
      setTransform(a, b, c, d, e, f) {
        if (a && typeof a === 'object') {
          st.mat = [a.a ?? 1, a.b ?? 0, a.c ?? 0, a.d ?? 1, a.e ?? 0, a.f ?? 0];
        } else {
          st.mat = [a, b, c, d, e, f];
        }
      },
      resetTransform() {
        st.mat = [1, 0, 0, 1, 0, 0];
      },
      getTransform() {
        return typeof DOMMatrix === 'function'
          ? new DOMMatrix(st.mat)
          : { a: st.mat[0], b: st.mat[1], c: st.mat[2], d: st.mat[3], e: st.mat[4], f: st.mat[5] };
      },

      // Line dash
      setLineDash(arr) {
        st.lineDash = Array.isArray(arr) ? arr.slice() : [];
      },
      getLineDash() {
        return st.lineDash.slice();
      },

      // Path building
      beginPath() { pathOps.reset(); },
      closePath() { pathOps.closePath(); },
      moveTo(x, y) { pathOps.moveTo(x, y); },
      lineTo(x, y) { pathOps.lineTo(x, y); },
      bezierCurveTo(a, b, c, d, e, f) { pathOps.bezierCurveTo(a, b, c, d, e, f); },
      quadraticCurveTo(a, b, c, d) { pathOps.quadraticCurveTo(a, b, c, d); },
      arc(x, y, r, s, e, ccw) { pathOps.arc(x, y, r, s, e, ccw); },
      arcTo(x1, y1, x2, y2, r) { pathOps.arcTo(x1, y1, x2, y2, r); },
      ellipse(x, y, rx, ry, rot, s, e, ccw) { pathOps.ellipse(x, y, rx, ry, rot, s, e, ccw); },
      rect(x, y, w, h) { pathOps.rect(x, y, w, h); },
      roundRect(x, y, w, h, r) { pathOps.roundRect(x, y, w, h, r); },

      // Drawing paths
      stroke(pathArg) {
        const d = getPathString(pathArg);
        if (!d) return;
        const attrs = buildStrokeAttrs();
        if (!attrs) return;
        elements.push(wrapClip(`<path d="${d}"${attrs}${matAttr(st.mat)}/>`));
      },
      fill(arg1, arg2) {
        let pathArg = null, rule = 'nonzero';
        if (typeof arg1 === 'string') {
          rule = arg1;
        } else if (arg1) {
          pathArg = arg1;
          if (typeof arg2 === 'string') rule = arg2;
        }
        const d = getPathString(pathArg);
        if (!d) return;
        const attrs = buildFillAttrs(rule);
        if (!attrs) return;
        elements.push(wrapClip(`<path d="${d}"${attrs}${matAttr(st.mat)}/>`));
      },
      clip(arg1, arg2) {
        let pathArg = null, rule = 'nonzero';
        if (typeof arg1 === 'string') rule = arg1;
        else if (arg1) {
          pathArg = arg1;
          if (typeof arg2 === 'string') rule = arg2;
        }
        const d = getPathString(pathArg);
        if (!d) return;
        const id = `cp${++defCounter}`;
        const prevClip = st.clipId ? ` clip-path="url(#${st.clipId})"` : '';
        const ruleAttr = rule === 'evenodd' ? ' clip-rule="evenodd"' : '';
        defs.push(`<clipPath id="${id}"${prevClip}><path d="${d}"${ruleAttr}${matAttr(st.mat)}/></clipPath>`);
        st.clipId = id;
      },

      // Rectangles
      fillRect(x, y, w, h) {
        const attrs = buildFillAttrs('nonzero');
        if (!attrs) return;
        elements.push(wrapClip(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"${attrs}${matAttr(st.mat)}/>`));
      },
      strokeRect(x, y, w, h) {
        const attrs = buildStrokeAttrs();
        if (!attrs) return;
        elements.push(wrapClip(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"${attrs}${matAttr(st.mat)}/>`));
      },
      clearRect() { /* transparent background */ },

      // Text
      measureText(text) {
        measureCtx.font = st.font;
        return measureCtx.measureText(text);
      },
      fillText(text, x, y) {
        if (text === null || text === undefined || String(text) === '') return;
        const attrs = buildFillAttrs('nonzero');
        if (!attrs) return;
        const f = parseCanvasFont(st.font);
        let anchor = 'start';
        if (st.textAlign === 'center') anchor = 'middle';
        else if (st.textAlign === 'right' || st.textAlign === 'end') anchor = 'end';

        // Exact baseline adjustment so Inkscape --export-text-to-path places italic math labels pixel-accurately!
        let yAdj = y;
        if (st.textBaseline === 'middle') yAdj = y + f.size * 0.34;
        else if (st.textBaseline === 'top' || st.textBaseline === 'hanging') yAdj = y + f.size * 0.82;
        else if (st.textBaseline === 'bottom' || st.textBaseline === 'ideographic') yAdj = y - f.size * 0.18;

        const styleAttr = f.style !== 'normal' ? ` font-style="${escXml(f.style)}"` : '';
        const weightAttr = f.weight !== 'normal' ? ` font-weight="${escXml(f.weight)}"` : '';
        elements.push(wrapClip(
          `<text x="${fmt(x)}" y="${fmt(yAdj)}" font-family="${escXml(f.family)}" font-size="${fmt(f.size)}"${styleAttr}${weightAttr} text-anchor="${anchor}"${attrs}${matAttr(st.mat)} xml:space="preserve">${escXml(String(text))}</text>`
        ));
      },
      strokeText(text, x, y) {
        if (text === null || text === undefined || String(text) === '') return;
        const attrs = buildStrokeAttrs();
        if (!attrs) return;
        const f = parseCanvasFont(st.font);
        let anchor = 'start';
        if (st.textAlign === 'center') anchor = 'middle';
        else if (st.textAlign === 'right' || st.textAlign === 'end') anchor = 'end';
        let yAdj = y;
        if (st.textBaseline === 'middle') yAdj = y + f.size * 0.34;
        else if (st.textBaseline === 'top' || st.textBaseline === 'hanging') yAdj = y + f.size * 0.82;
        else if (st.textBaseline === 'bottom' || st.textBaseline === 'ideographic') yAdj = y - f.size * 0.18;

        const styleAttr = f.style !== 'normal' ? ` font-style="${escXml(f.style)}"` : '';
        const weightAttr = f.weight !== 'normal' ? ` font-weight="${escXml(f.weight)}"` : '';
        elements.push(wrapClip(
          `<text x="${fmt(x)}" y="${fmt(yAdj)}" font-family="${escXml(f.family)}" font-size="${fmt(f.size)}"${styleAttr}${weightAttr} text-anchor="${anchor}"${attrs}${matAttr(st.mat)} xml:space="preserve">${escXml(String(text))}</text>`
        ));
      },

      // Embedded images (formulas, PDF crops, highlighter overlay)
      drawImage(img, ...args) {
        if (!img) return;
        const iw = img.naturalWidth || img.videoWidth || img.width || 0;
        const ih = img.naturalHeight || img.videoHeight || img.height || 0;
        if (!iw || !ih) return;
        let sx = 0, sy = 0, sw = iw, sh = ih, dx = 0, dy = 0, dw = iw, dh = ih;
        if (args.length === 2) {
          [dx, dy] = args;
        } else if (args.length === 4) {
          [dx, dy, dw, dh] = args;
        } else if (args.length >= 8) {
          [sx, sy, sw, sh, dx, dy, dw, dh] = args;
        }
        const dataUrl = imageToDataUrl(img, sx, sy, sw, sh);
        if (!dataUrl) return;
        const opAttr = st.globalAlpha < 0.999 ? ` opacity="${fmt(st.globalAlpha)}"` : '';
        elements.push(wrapClip(
          `<image x="${fmt(dx)}" y="${fmt(dy)}" width="${fmt(dw)}" height="${fmt(dh)}" xlink:href="${dataUrl}" href="${dataUrl}" preserveAspectRatio="none"${opAttr}${matAttr(st.mat)}/>`
        ));
      },

      createLinearGradient(x0, y0, x1, y1) {
        return makeGradient('linear', [x0, y0, x1, y1]);
      },
      createRadialGradient(x0, y0, r0, x1, y1, r1) {
        return makeGradient('radial', [x0, y0, r0, x1, y1, r1]);
      },
      createPattern() { return null; },

      toSvgString() {
        const defsBlock = defs.length ? `<defs>${defs.join('')}</defs>` : '';
        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defsBlock}${elements.join('')}</svg>`;
      }
    };

    // Define stateful style getters/setters
    const props = [
      'strokeStyle', 'fillStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
      'lineDashOffset', 'globalAlpha', 'globalCompositeOperation',
      'font', 'textAlign', 'textBaseline',
      'imageSmoothingEnabled', 'imageSmoothingQuality',
      'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'
    ];
    props.forEach((p) => {
      Object.defineProperty(ctx, p, {
        get() { return st[p]; },
        set(v) {
          st[p] = v;
          if (p === 'font') measureCtx.font = v;
        },
        enumerable: true
      });
    });

    return ctx;
  }

  // ---- WebView2 EMF Bridge API ----
  window.__MinNoteEmf = {
    createRecorder: createSvgCanvasRecorder,
    lastSelectionSvg: null,
    lastSelectionPng: null,

    copySelectionToClipboard(pngDataUrl, svgString, emfOnly) {
      const hasWebView = !!(window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function');
      if (!hasWebView) return false;
      const pngBase64 = (typeof pngDataUrl === 'string' && pngDataUrl.includes(','))
        ? pngDataUrl.slice(pngDataUrl.indexOf(',') + 1)
        : '';
      window.chrome.webview.postMessage({
        type: 'COPY_EMF_SELECTION',
        svg: svgString || '',
        pngBase64: pngBase64,
        emfOnly: !!emfOnly
      });
      return true;
    },

    saveEmfFile(svgString, fileName) {
      if (!svgString) return false;
      const hasWebView = !!(window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function');
      if (hasWebView) {
        window.chrome.webview.postMessage({
          type: 'SAVE_EMF_FILE',
          svg: svgString,
          fileName: fileName || 'MinNote_HinhVe.emf'
        });
        return true;
      }
      // Browser fallback: download SVG
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (fileName || 'MinNote_HinhVe').replace(/\.emf$/i, '') + '.svg';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    }
  };
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
