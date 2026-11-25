/**
 * MinNote Motion Bridge v2.0 — Universal JSON Motion Schema (`mn-geo-motion/2.0`),
 * Continuous `\t` in `[0,1]` Animated TikZ Generator, & Bidirectional BetaTikz (`tikzvid-project/1`) Bridge.
 *
 * Works in both Browser (`window.MinNoteMotionBridge`) and Node.js (`module.exports`) for automated testing.
 */
(function (root) {
  'use strict';

  const SCHEMA_VERSION = 'mn-geo-motion/2.0';
  const BETATIKZ_FORMAT = 'tikzvid-project/1';

  const CANONICAL_EFFECTS = new Set([
    'draw', 'chalk', 'glow', 'pop', 'pulse', 'fade', 'wipe', 'stamp'
  ]);

  const EFFECT_TO_CANONICAL = {
    draw: 'draw',
    chalk: 'chalk',
    chalk_dust: 'chalk',
    glow: 'glow',
    laser_scan: 'glow',
    mention_glow: 'glow',
    pop: 'pop',
    spring: 'pop',
    zoom: 'pop',
    target_reticle: 'pop',
    pulse: 'pulse',
    water_ripple: 'pulse',
    starburst: 'pulse',
    wiggle_alert: 'pulse',
    fade: 'fade',
    draw_then_fill: 'fade',
    slide: 'fade',
    xray_hidden: 'draw',
    extrude_rise: 'draw',
    fourier_epicycles: 'draw',
    morph_bezier: 'draw',
    center_out: 'draw',
    arrow_slide: 'draw',
    measure_brace: 'draw',
    wipe: 'wipe',
    typewriter: 'wipe',
    stamp: 'stamp',
    checkmark_stamp: 'stamp',
    chalk_box: 'stamp',
    double_underline: 'stamp',
    cross_strike: 'stamp'
  };

  const PRESET_TO_SCHEMA = {
    domiinh: 'domiinh',
    manim: 'manim',
    geo3d: '3d_standard',
    '3d': '3d_standard',
    '3d_standard': '3d_standard'
  };

  const PRESET_TO_REPLAY = {
    domiinh: 'domiinh',
    manim: 'manim',
    '3d_standard': 'geo3d',
    '3d': 'geo3d',
    geo3d: 'geo3d'
  };

  function getWin() {
    return typeof window !== 'undefined' ? window : null;
  }

  function getBoard() {
    const w = getWin();
    if (!w) return null;
    return w.__minnoteBoard || w.__meaBoard || (w.__meaBoardRef && w.__meaBoardRef.current) || null;
  }

  function getKernel() {
    const w = getWin();
    return w && w.__mnGeoKernel ? w.__mnGeoKernel : null;
  }

  function toast(msg, type) {
    const w = getWin();
    if (w && typeof w.showToast === 'function') {
      w.showToast(msg, type);
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

  function fmtNum(v, decimals) {
    if (!Number.isFinite(v)) return '0';
    const d = decimals != null ? decimals : 2;
    const rounded = Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(d));
    if (Object.is(rounded, -0)) return '0';
    return String(rounded).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  }

  function clamp(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return n < lo ? lo : n > hi ? hi : n;
  }

  function dist2(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  // ============================================================================
  // 1. SAFE MATH EXPRESSION & JSON SANITIZER (ZERO EVAL!)
  // ============================================================================
  function safeEvalMathNumber(val) {
    if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;
    if (typeof val !== 'string') return NaN;
    const s = val.trim();
    if (!s) return NaN;
    const direct = Number(s);
    if (Number.isFinite(direct)) return direct;

    let pos = 0;
    const len = s.length;
    const skipWs = () => { while (pos < len && /\s/.test(s[pos])) pos++; };

    function parseExpr() {
      let v = parseTerm();
      skipWs();
      while (pos < len && (s[pos] === '+' || s[pos] === '-')) {
        const op = s[pos++];
        const rhs = parseTerm();
        v = op === '+' ? v + rhs : v - rhs;
        skipWs();
      }
      return v;
    }

    function parseTerm() {
      let v = parseFactor();
      skipWs();
      while (pos < len && (s[pos] === '*' || s[pos] === '/')) {
        const op = s[pos++];
        const rhs = parseFactor();
        v = op === '*' ? v * rhs : (Math.abs(rhs) < 1e-12 ? NaN : v / rhs);
        skipWs();
      }
      return v;
    }

    function parseFactor() {
      skipWs();
      if (pos < len && (s[pos] === '+' || s[pos] === '-')) {
        const op = s[pos++];
        const v = parseFactor();
        return op === '-' ? -v : v;
      }
      if (pos < len && s[pos] === '(') {
        pos++;
        const v = parseExpr();
        skipWs();
        if (pos < len && s[pos] === ')') pos++;
        return v;
      }
      const identMatch = s.slice(pos).match(/^[a-zA-Z_]+/);
      if (identMatch) {
        const fn = identMatch[0].toLowerCase();
        pos += identMatch[0].length;
        skipWs();
        if (fn === 'pi') return Math.PI;
        if (fn === 'e') return Math.E;
        if (pos < len && s[pos] === '(') {
          pos++;
          const arg = parseExpr();
          skipWs();
          if (pos < len && s[pos] === ')') pos++;
          if (fn === 'sqrt') return arg >= 0 ? Math.sqrt(arg) : NaN;
          if (fn === 'sin') return Math.sin(arg * Math.PI / 180);
          if (fn === 'cos') return Math.cos(arg * Math.PI / 180);
          if (fn === 'tan') return Math.tan(arg * Math.PI / 180);
          if (fn === 'abs') return Math.abs(arg);
        }
        return NaN;
      }
      const numMatch = s.slice(pos).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if (numMatch) {
        pos += numMatch[0].length;
        return Number(numMatch[0]);
      }
      return NaN;
    }

    const out = parseExpr();
    skipWs();
    return pos === len && Number.isFinite(out) ? out : NaN;
  }

  function normalizeMarkdownEscapedJsonText(raw) {
    let text = String(raw || '')
      .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
      .replace(/[\u00A0\u2007\u202F]/g, ' ')
      .trim();
    if (!text) return '';

    // Unwrap outer matching quotes (either JSON-stringified JSON or plain quoted multiline block)
    if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
      try {
        const unwrapped = JSON.parse(text);
        if (typeof unwrapped === 'string' && (unwrapped.includes('{') || unwrapped.includes('['))) {
          text = unwrapped.trim();
        }
      } catch (_) {
        if (/^"\s*(?:```(?:json|jsonc|javascript|js)?\s*)?[\{\[]/i.test(text) && /[\}\]]\s*(?:```)?\s*"$/i.test(text)) {
          text = text.slice(1, -1).trim();
        }
      }
    }

    // Decode HTML entities copied from Markdown / rich-text UIs (&#x20;, &nbsp;, &apos;, structural &quot;, etc.)
    if (/&(?:#x?[0-9a-f]+|nbsp|quot|apos|lt|gt|amp);/i.test(text)) {
      const decodeStructuralQuotes = /(?:^|[\{\[,:\s])(?:&quot;|&#34;|&#x22;)\s*[^&"<>]{1,64}\s*(?:&quot;|&#34;|&#x22;)\s*:/i.test(text);
      text = text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(nbsp|quot|apos|lt|gt|amp));/gi, (m, hex, dec, named) => {
        if (named) {
          const k = named.toLowerCase();
          if (k === 'nbsp') return ' ';
          if (k === 'apos') return "'";
          if (k === 'lt') return '<';
          if (k === 'gt') return '>';
          if (k === 'amp') return '&';
          if (k === 'quot') return decodeStructuralQuotes ? '"' : m;
          return m;
        }
        const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
        if (code === 32 || code === 160) return ' ';
        if (code === 9) return '\t';
        if (code === 10) return '\n';
        if (code === 13) return '';
        if (code === 39) return "'";
        if (code === 60) return '<';
        if (code === 62) return '>';
        if (code === 38) return '&';
        if (code === 34) return decodeStructuralQuotes ? '"' : m;
        return m;
      });
    }

    // Strip markdown code fences
    const fenceMatch = /```(?:json|jsonc|javascript|js)?\s*([\s\S]*?)```/i.exec(text);
    if (fenceMatch && fenceMatch[1] && (fenceMatch[1].includes('{') || fenceMatch[1].includes('['))) {
      text = fenceMatch[1].trim();
    } else {
      text = text
        .replace(/^```(?:json|jsonc|javascript|js)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }

    // Recover globally backslash-escaped quotes ({\"schema\": ...})
    if (!/(?:^|[^\\])"\s*:/.test(text) && /\\"\s*:/.test(text)) {
      text = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    // Strip Markdown hard line breaks (`\` before newline) & invalid Markdown punctuation escapes
    if (/\\[ \t]*(?:\r?\n|$)|\\[_'*[\]{}()\-+#!~|:]/.test(text)) {
      let unesc = '';
      let inS = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (!inS) {
          if (ch === '"') { inS = true; unesc += ch; continue; }
          if (ch === '\\') {
            let j = i + 1;
            while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
            if (j >= text.length || text[j] === '\n' || text[j] === '\r') {
              i = j - 1;
              continue;
            }
            const nx = text[i + 1];
            if (nx && /[{}\[\],:_*+\-.()#!~|'`"]/.test(nx)) continue;
          }
          unesc += ch;
        } else {
          if (ch === '"') { inS = false; unesc += ch; continue; }
          if (ch === '\\') {
            const nx = text[i + 1];
            if (nx && (nx === '"' || nx === '\\' || nx === '/' || nx === 'b' || nx === 'f' || nx === 'n' || nx === 'r' || nx === 't')) {
              unesc += ch + nx; i++; continue;
            }
            if (nx === 'u' && /^[0-9a-fA-F]{4}/.test(text.slice(i + 2, i + 6))) {
              unesc += text.slice(i, i + 6); i += 5; continue;
            }
            let j = i + 1;
            while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
            if (text[j] === '\r' || text[j] === '\n') {
              if (text[j] === '\r' && text[j + 1] === '\n') j += 2;
              else j += 1;
              while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
              unesc += ' ';
              i = j - 1;
              continue;
            }
            if (nx && /[_'*[\]{}()\-+.!#~|:,><=`]/.test(nx)) {
              unesc += nx; i++; continue;
            }
          }
          unesc += ch;
        }
      }
      text = unesc.trim();
    }
    return text;
  }

  function stripJsonCommentsAndTrailingCommas(raw) {
    let text = normalizeMarkdownEscapedJsonText(raw);

    let out = '';
    let inStr = false;
    let esc = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const nx = text[i + 1];
      if (inStr) {
        out += ch;
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') {
        inStr = true;
        out += ch;
        continue;
      }
      if (ch === '/' && nx === '/') {
        while (i < text.length && text[i] !== '\n') i++;
        out += '\n';
        continue;
      }
      if (ch === '/' && nx === '*') {
        i += 2;
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i++;
        continue;
      }
      if (ch === '\u201c' || ch === '\u201d') {
        out += '"';
        continue;
      }
      out += ch;
    }
    return out.replace(/,\s*([}\]])/g, '$1').trim();
  }

  function cleanAndParseJson(input) {
    if (input && typeof input === 'object') {
      return JSON.parse(JSON.stringify(input));
    }
    if (typeof input !== 'string' || !input.trim()) {
      throw new Error('Dữ liệu JSON trống hoặc không hợp lệ.');
    }
    const cleaned = stripJsonCommentsAndTrailingCommas(input);
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first >= 0 && last > first) {
        const sliced = stripJsonCommentsAndTrailingCommas(cleaned.slice(first, last + 1));
        return JSON.parse(sliced);
      }
      throw new Error('Không phân tích được cú pháp JSON. Vui lòng kiểm tra dấu ngoặc hoặc dấu phẩy.');
    }
  }

  // ============================================================================
  // 2. RUNTIME EFFECT ALIAS BRIDGE FOR MINNOTE MOTION FX
  // ============================================================================
  function registerMotionFxShortAliases() {
    const w = getWin();
    if (!w || !w.MinNoteMotionFX || w.MinNoteMotionFX.__bridgeAliasesInstalled) return;
    const mfx = w.MinNoteMotionFX;
    mfx.__bridgeAliasesInstalled = true;

    const aliasMap = {
      chalk: 'chalk_dust',
      pop: 'spring',
      stamp: 'checkmark_stamp'
    };
    const aliasLabels = {
      chalk: { id: 'chalk', icon: '🖍', label: 'Phấn bảng', cat: 'stroke', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
      pop: { id: 'pop', icon: '⚡', label: 'Nảy điểm', cat: 'transform', targets: ['all'], isOverlayEnd: false, defaultDurMul: 1 },
      stamp: { id: 'stamp', icon: '✅', label: 'Đóng dấu', cat: 'emphasis', targets: ['all'], isOverlayEnd: true, defaultDurMul: 1 }
    };

    if (mfx.EFFECT_MAP) {
      for (const [shortId, meta] of Object.entries(aliasLabels)) {
        if (!mfx.EFFECT_MAP[shortId]) mfx.EFFECT_MAP[shortId] = meta;
      }
    }
    if (mfx.OVERLAY_END_EFFECTS && typeof mfx.OVERLAY_END_EFFECTS.add === 'function') {
      mfx.OVERLAY_END_EFFECTS.add('stamp');
    }
    if (typeof mfx.paintShapeFX === 'function') {
      const origPaintShape = mfx.paintShapeFX;
      mfx.paintShapeFX = function (ctx, sh, coords, prog, rev, fxOpts, helpers) {
        if (fxOpts && fxOpts.effect && aliasMap[fxOpts.effect]) {
          return origPaintShape.call(this, ctx, sh, coords, prog, rev, Object.assign({}, fxOpts, { effect: aliasMap[fxOpts.effect] }), helpers);
        }
        return origPaintShape.call(this, ctx, sh, coords, prog, rev, fxOpts, helpers);
      };
    }
    if (typeof mfx.paintPointFX === 'function') {
      const origPaintPt = mfx.paintPointFX;
      mfx.paintPointFX = function (ctx, pt, coord, prog, fxOpts, helpers) {
        if (fxOpts && fxOpts.effect && aliasMap[fxOpts.effect]) {
          return origPaintPt.call(this, ctx, pt, coord, prog, Object.assign({}, fxOpts, { effect: aliasMap[fxOpts.effect] }), helpers);
        }
        return origPaintPt.call(this, ctx, pt, coord, prog, fxOpts, helpers);
      };
    }
  }

  // ============================================================================
  // 3. STANDALONE GEOMETRY EVALUATOR & INTEGER NORMALIZER
  // ============================================================================
  function evalPointDef(def, getPt, geo) {
    if (!def || !def.t) return null;
    switch (def.t) {
      case 'free': {
        const x = safeEvalMathNumber(def.x);
        const y = safeEvalMathNumber(def.y);
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
      }
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
        const ang = (safeEvalMathNumber(def.ang) || 0) * Math.PI / 180;
        const k = def.k != null ? safeEvalMathNumber(def.k) : 1;
        const dx = p.x - c.x, dy = p.y - c.y;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        return { x: c.x + (dx * cs - dy * sn) * k, y: c.y + (dx * sn + dy * cs) * k };
      }
      case 'vec': {
        const o = getPt(def.o), a = getPt(def.a), b = getPt(def.b);
        if (!o || !a || !b) return null;
        let dx = b.x - a.x, dy = b.y - a.y;
        // Match MinNote Kernel Hg = e => ({ x: e.y, y: -e.x }) in Canvas Y-down
        if (def.perp) { const tmp = dx; dx = dy; dy = -tmp; }
        if (def.distVal != null) {
          const len = Math.hypot(dx, dy);
          if (len < 1e-12) return { x: o.x, y: o.y };
          const dPx = safeEvalMathNumber(def.distVal) * ((geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559);
          return { x: o.x + dx * dPx / len, y: o.y + dy * dPx / len };
        }
        const k = def.k != null ? safeEvalMathNumber(def.k) : 1;
        return { x: o.x + dx * (Number.isFinite(k) ? k : 1), y: o.y + dy * (Number.isFinite(k) ? k : 1) };
      }
      case 'on': {
        const a = getPt(def.a), b = getPt(def.b);
        if (!a || !b) return null;
        let k = def.k != null ? safeEvalMathNumber(def.k) : 0.5;
        if (!Number.isFinite(k)) k = 0.5;
        if (def.seg) k = clamp(k, 0, 1);
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
      case 'len': {
        const a = getPt(def.a);
        if (!a) return null;
        const val = def.val != null ? safeEvalMathNumber(def.val) : 2;
        const dPx = Math.max(1e-4, Number.isFinite(val) ? val : 2) * ((geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559);
        const ang = def.ang != null ? safeEvalMathNumber(def.ang) : 0;
        const rad = Number.isFinite(ang) ? ang : 0;
        return { x: a.x + dPx * Math.cos(rad), y: a.y + dPx * Math.sin(rad) };
      }
      case 'polar': {
        const o = getPt(def.o), r = getPt(def.ref);
        if (!o || !r) return null;
        const base = Math.atan2(r.y - o.y, r.x - o.x);
        const degRaw = def.fixedAng ? (def.angVal != null ? safeEvalMathNumber(def.angVal) : 60) : (def.curAngDeg != null ? safeEvalMathNumber(def.curAngDeg) : 60);
        const deg = Number.isFinite(degRaw) ? degRaw : 60;
        const rad = base - deg * Math.PI / 180;
        const cm = (geo && (geo.cmPx || geo.pxPerCm)) || 37.79527559;
        const dPx = def.fixedDist
          ? Math.max(1e-4, (def.distVal != null ? safeEvalMathNumber(def.distVal) : 2) * cm)
          : Math.max(4, def.curDistPx != null ? safeEvalMathNumber(def.curDistPx) : 120);
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
        const rawK = def.k != null ? safeEvalMathNumber(def.k) : 0;
        const ang = (def.angleDeg != null && def.k == null)
          ? (-safeEvalMathNumber(def.angleDeg) * Math.PI / 180)
          : (rawK * Math.PI * 2);
        if (kind === 'circle' && ps.length >= 2) {
          const r = dist2(ps[0], ps[1]);
          return { x: ps[0].x + r * Math.cos(ang), y: ps[0].y + r * Math.sin(ang) };
        }
        if (kind === 'ellipse' && ps.length >= 3) {
          const rx = dist2(ps[0], ps[1]), ry = dist2(ps[0], ps[2]);
          const rot = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
          const lx = rx * Math.cos(ang), ly = ry * Math.sin(ang);
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
        const vx = (safeEvalMathNumber(def.vx) || 0) * cm;
        const vy = (safeEvalMathNumber(def.vy) || 0) * cm;
        const vz = (safeEvalMathNumber(def.vz) || 0) * cm;
        if (Array.isArray(def.view) && def.view.length >= 6) {
          const m = def.view;
          return { x: o.x + m[0] * vx + m[1] * vy + m[2] * vz, y: o.y + m[3] * vx + m[4] * vy + m[5] * vz };
        }
        return { x: o.x + vx - 0.35 * vy, y: o.y - vz + 0.28 * vy };
      }
      default:
        return geo ? null : null;
    }
  }

  /**
   * Evaluates a board-convention (`board_y_down`) parametric `def` directly in `math_y_up` space
   * from normalized parent coordinates `getMathPt(id)`, preserving exact orientation under Y-reflection!
   */
  function evalBoardDefInMathSpace(def, getMathPt, cmInMath, inputIsAlreadyMathYUp) {
    if (!def || !def.t || def.t === 'free') return null;
    if (inputIsAlreadyMathYUp) {
      return evalPointDef(def, getMathPt, { cmPx: cmInMath });
    }
    switch (def.t) {
      case 'mid':
      case 'foot':
      case 'sum':
      case 'on':
        return evalPointDef(def, getMathPt, { cmPx: cmInMath });
      case 'rot': {
        const c = getMathPt(def.c), p = getMathPt(def.p);
        if (!c || !p) return null;
        const ang = -(safeEvalMathNumber(def.ang) || 0) * Math.PI / 180;
        const k = def.k != null ? safeEvalMathNumber(def.k) : 1;
        const dx = p.x - c.x, dy = p.y - c.y;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        return { x: c.x + (dx * cs - dy * sn) * k, y: c.y + (dx * sn + dy * cs) * k };
      }
      case 'vec': {
        const o = getMathPt(def.o), a = getMathPt(def.a), b = getMathPt(def.b);
        if (!o || !a || !b) return null;
        let dx = b.x - a.x, dy = b.y - a.y;
        // Canvas Hg(dx_c, dy_c) = (dy_c, -dx_c) -> under R_Y becomes (-dy_m, dx_m) (+90 deg CCW)
        if (def.perp) { const tmp = dx; dx = -dy; dy = tmp; }
        if (def.distVal != null) {
          const len = Math.hypot(dx, dy);
          if (len < 1e-12) return { x: o.x, y: o.y };
          const dCm = safeEvalMathNumber(def.distVal) * cmInMath;
          return { x: o.x + dx * dCm / len, y: o.y + dy * dCm / len };
        }
        const k = def.k != null ? safeEvalMathNumber(def.k) : 1;
        return { x: o.x + dx * (Number.isFinite(k) ? k : 1), y: o.y + dy * (Number.isFinite(k) ? k : 1) };
      }
      case 'len': {
        const a = getMathPt(def.a);
        if (!a) return null;
        const val = def.val != null ? safeEvalMathNumber(def.val) : 2;
        const dCm = Math.max(1e-4, Number.isFinite(val) ? val : 2) * cmInMath;
        const ang = -(safeEvalMathNumber(def.ang) || 0);
        return { x: a.x + dCm * Math.cos(ang), y: a.y + dCm * Math.sin(ang) };
      }
      case 'polar': {
        const o = getMathPt(def.o), r = getMathPt(def.ref);
        if (!o || !r) return null;
        const base = Math.atan2(r.y - o.y, r.x - o.x);
        const degRaw = def.fixedAng ? (def.angVal != null ? safeEvalMathNumber(def.angVal) : 60) : (def.curAngDeg != null ? safeEvalMathNumber(def.curAngDeg) : 60);
        const deg = Number.isFinite(degRaw) ? degRaw : 60;
        const rad = base + deg * Math.PI / 180;
        const dCm = def.fixedDist
          ? Math.max(1e-4, (def.distVal != null ? safeEvalMathNumber(def.distVal) : 2) * cmInMath)
          : Math.max(4, def.curDistPx != null ? safeEvalMathNumber(def.curDistPx) : 120) * (cmInMath / 37.79527559);
        return { x: o.x + dCm * Math.cos(rad), y: o.y + dCm * Math.sin(rad) };
      }
      case 'inter': {
        if (!def.l1 || !def.l2) return null;
        const p1 = getMathPt(def.l1[0]), p2 = getMathPt(def.l1[1]), p3 = getMathPt(def.l2[0]), p4 = getMathPt(def.l2[1]);
        if (!p1 || !p2 || !p3 || !p4) return null;
        if (!def.c1 && !def.c2) {
          return evalPointDef(def, getMathPt, { cmPx: cmInMath });
        }
        if (def.c1 && def.c2) {
          // Under R_Y, Canvas _Y swaps roots 0 <-> 1
          return evalPointDef(Object.assign({}, def, { which: def.which ? 0 : 1 }), getMathPt, { cmPx: cmInMath });
        }
        return evalPointDef(def, getMathPt, { cmPx: cmInMath });
      }
      case 'bis': {
        const a = getMathPt(def.a), o = getMathPt(def.o), b = getMathPt(def.b);
        if (!a || !o || !b) return null;
        const d1 = dist2(a, o), d2 = dist2(b, o);
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
        const ps = def.pts.map(getMathPt);
        if (ps.some((p) => !p)) return null;
        const kind = def.kind || def.on || 'circle';
        const rawK = def.k != null ? safeEvalMathNumber(def.k) : 0;
        const ang = (def.angleDeg != null && def.k == null)
          ? (safeEvalMathNumber(def.angleDeg) * Math.PI / 180)
          : (-rawK * Math.PI * 2);
        if (kind === 'circle' && ps.length >= 2) {
          const r = dist2(ps[0], ps[1]);
          return { x: ps[0].x + r * Math.cos(ang), y: ps[0].y + r * Math.sin(ang) };
        }
        if (kind === 'ellipse' && ps.length >= 3) {
          const rx = dist2(ps[0], ps[1]), ry = dist2(ps[0], ps[2]);
          const rot = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
          const lx = rx * Math.cos(ang), ly = ry * Math.sin(ang);
          return {
            x: ps[0].x + lx * Math.cos(rot) - ly * Math.sin(rot),
            y: ps[0].y + lx * Math.sin(rot) + ly * Math.cos(rot)
          };
        }
        return ps[0];
      }
      case 'ctan': {
        if (!def.c1 || !def.c2) return null;
        const p1 = getMathPt(def.c1[0]), p2 = getMathPt(def.c1[1]), p3 = getMathPt(def.c2[0]), p4 = getMathPt(def.c2[1]);
        if (!p1 || !p2 || !p3 || !p4) return null;
        const r1 = dist2(p1, p2), r2 = dist2(p3, p4);
        const dx = p3.x - p1.x, dy = p3.y - p1.y, d = Math.hypot(dx, dy);
        if (d < 1e-9) return null;
        const l = (def.inner ? -(r1 + r2) : (r2 - r1)) / d;
        if (Math.abs(l) > 1) return null;
        const ux = dx / d, uy = dy / d;
        const h = Math.sqrt(Math.max(0, 1 - l * l)) * (def.which ? -1 : 1);
        const nx = ux * l - uy * h, ny = uy * l + ux * h;
        const t1 = { x: p1.x - nx * r1, y: p1.y - ny * r1 };
        const t2 = def.inner ? { x: p3.x + nx * r2, y: p3.y + ny * r2 } : { x: p3.x - nx * r2, y: p3.y - ny * r2 };
        return def.on === 2 ? t2 : t1;
      }
      case 'p3d': {
        const o = getMathPt(def.o);
        if (!o) return null;
        const vx = (safeEvalMathNumber(def.vx) || 0) * cmInMath;
        const vy = (safeEvalMathNumber(def.vy) || 0) * cmInMath;
        const vz = (safeEvalMathNumber(def.vz) || 0) * cmInMath;
        if (Array.isArray(def.view) && def.view.length >= 6) {
          const m = def.view;
          return { x: o.x + m[0] * vx + m[1] * vy + m[2] * vz, y: o.y - (m[3] * vx + m[4] * vy + m[5] * vz) };
        }
        return { x: o.x + vx - 0.35 * vy, y: o.y + vz - 0.28 * vy };
      }
      default:
        return null;
    }
  }

  function evalGeoMap(geo) {
    const K = getKernel();
    if (K && typeof K.Tt === 'function' && geo && geo.points && !Array.isArray(geo.points)) {
      try {
        const res = K.Tt(geo);
        if (res && res.size > 0) return res;
      } catch (_) {}
    }
    const map = new Map();
    if (!geo || !geo.points) return map;
    const ptsObj = Array.isArray(geo.points)
      ? Object.fromEntries(geo.points.map((p) => [p.id, p]))
      : geo.points;
    const visiting = new Set();
    const getPt = (id) => {
      if (map.has(id)) return map.get(id);
      const pt = ptsObj[id];
      if (!pt || visiting.has(id)) return null;
      visiting.add(id);
      const res = evalPointDef(pt.def, getPt, geo);
      visiting.delete(id);
      const valid = res && Number.isFinite(res.x) && Number.isFinite(res.y) ? res : null;
      map.set(id, valid);
      return valid;
    };
    for (const id of Object.keys(ptsObj)) getPt(id);
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

  function sanitizeSymId(rawLabel, usedIds, ctr) {
    const clean = String(rawLabel || '').trim().replace(/^\$|\$$/g, '');
    if (/^[A-Za-z]'?$/.test(clean) && !usedIds.has(clean)) {
      usedIds.add(clean);
      return { sym: clean, tikzId: clean.replace(/'/g, 'p'), texLabel: clean };
    }
    const sub = clean.match(/^([A-Za-z])('?)_?\{?(\d+)\}?$/);
    if (sub) {
      let base = `${sub[1]}${sub[2] ? 'p' : ''}${sub[3]}`;
      while (usedIds.has(base)) base += 'x';
      usedIds.add(base);
      const tex = sub[2] ? `${sub[1]}'_{${sub[3]}}` : `${sub[1]}_{${sub[3]}}`;
      return { sym: base, tikzId: base, texLabel: tex };
    }
    const ascii = clean.replace(/[^A-Za-z0-9]/g, '');
    if (ascii && /^[A-Za-z]/.test(ascii) && ascii.length <= 8 && !usedIds.has(ascii)) {
      usedIds.add(ascii);
      return { sym: ascii, tikzId: ascii, texLabel: clean || ascii };
    }
    let fb = 'P' + (ctr.n++);
    while (usedIds.has(fb)) fb = 'P' + (ctr.n++);
    usedIds.add(fb);
    return { sym: fb, tikzId: fb, texLabel: clean || '' };
  }

  function formatShapeLabelTex(raw) {
    let s = String(raw == null ? '' : raw).trim().replace(/^\$+|\$+$/g, '').trim();
    if (!s) return '';
    const greekMap = {
      'α': '\\alpha',
      'β': '\\beta',
      'γ': '\\gamma',
      'δ': '\\delta',
      'ε': '\\varepsilon',
      'ζ': '\\zeta',
      'η': '\\eta',
      'θ': '\\theta',
      'λ': '\\lambda',
      'μ': '\\mu',
      'π': '\\pi',
      'ρ': '\\rho',
      'σ': '\\sigma',
      'τ': '\\tau',
      'φ': '\\varphi',
      'ψ': '\\psi',
      'ω': '\\omega',
      'Δ': '\\Delta',
      'Γ': '\\Gamma',
      'Λ': '\\Lambda',
      'Σ': '\\Sigma',
      'Φ': '\\Phi',
      'Ψ': '\\Psi',
      'Ω': '\\Omega'
    };
    s = s.replace(/[αβγδεζηθλμπρστφψωΔΓΛΣΦΨΩ]/g, (ch, offset, full) => {
      const cmd = greekMap[ch] || ch;
      const next = full[offset + 1] || '';
      return /[A-Za-z]/.test(next) ? cmd + ' ' : cmd;
    });
    const subMatch = s.match(/^(\\[A-Za-z]+|[A-Za-z])('*)_?\{?(\d+)\}?$/);
    if (subMatch) {
      const base = subMatch[1];
      const primes = subMatch[2] || '';
      const digits = subMatch[3];
      return digits.length === 1 ? `${base}${primes}_${digits}` : `${base}${primes}_{${digits}}`;
    }
    s = s.replace(/_([A-Za-z0-9]{2,})(?!\})/g, '_{$1}');
    return s;
  }

  function computeShapeLabelAngleDeg(pa, pb, nameAt) {
    let deg;
    if (nameAt && Number.isFinite(Number(nameAt.x)) && Number.isFinite(Number(nameAt.y)) && Math.hypot(Number(nameAt.x), Number(nameAt.y)) > 1e-3) {
      deg = Math.atan2(-Number(nameAt.y), Number(nameAt.x)) * 180 / Math.PI;
    } else if (pa && pb) {
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        deg = 90;
      } else {
        let nx = -dy / len;
        let ny = dx / len;
        if (!(ny > 0.15 || (Math.abs(ny) <= 0.15 && nx > 0))) {
          nx = -nx;
          ny = -ny;
        }
        deg = Math.atan2(ny, nx) * 180 / Math.PI;
      }
    } else {
      deg = 90;
    }
    deg = ((deg % 360) + 360) % 360;
    return (Math.round(deg / 15) * 15) % 360;
  }

  function buildDemoGeoModel() {
    const points = {
      A: { id: 'A', label: 'A', show: true, def: { t: 'free', x: 260, y: 360 } },
      D: { id: 'D', label: 'D', show: true, def: { t: 'free', x: 560, y: 350 } },
      B: { id: 'B', label: 'B', show: true, def: { t: 'free', x: 340, y: 460 } },
      C: { id: 'C', label: 'C', show: true, def: { t: 'free', x: 500, y: 445 } },
      S: { id: 'S', label: 'S', show: true, def: { t: 'free', x: 380, y: 170 } },
      O: { id: 'O', label: 'O', show: true, def: { t: 'inter', l1: ['A', 'C'], c1: false, l2: ['B', 'D'], c2: false, which: 0 } },
      M: { id: 'M', label: 'M', show: true, def: { t: 'mid', a: 'S', b: 'C' } },
      N: { id: 'N', label: 'N', show: true, def: { t: 'mid', a: 'S', b: 'D' } }
    };
    const shapes = [
      { id: 's_AB', kind: 'segment', pts: ['A', 'B'], dashed: false },
      { id: 's_BC', kind: 'segment', pts: ['B', 'C'], dashed: false },
      { id: 's_CD', kind: 'segment', pts: ['C', 'D'], dashed: false },
      { id: 's_AD', kind: 'segment', pts: ['A', 'D'], dashed: true },
      { id: 's_SA', kind: 'segment', pts: ['S', 'A'], dashed: false },
      { id: 's_SB', kind: 'segment', pts: ['S', 'B'], dashed: false },
      { id: 's_SC', kind: 'segment', pts: ['S', 'C'], dashed: false },
      { id: 's_SD', kind: 'segment', pts: ['S', 'D'], dashed: false },
      { id: 's_AC', kind: 'segment', pts: ['A', 'C'], dashed: true, aux: true },
      { id: 's_BD', kind: 'segment', pts: ['B', 'D'], dashed: true, aux: true },
      { id: 's_SO', kind: 'segment', pts: ['S', 'O'], dashed: true, aux: true },
      { id: 's_MN', kind: 'segment', pts: ['M', 'N'], dashed: false, aux: true },
      { id: 's_AM', kind: 'segment', pts: ['A', 'M'], dashed: true, aux: true },
      { id: 's_AN', kind: 'segment', pts: ['A', 'N'], dashed: true, aux: true },
      { id: 's_fill', kind: 'polygon', pts: ['A', 'M', 'N'], width: 0, fill: 'rgba(14, 165, 233, 0.14)', aux: true }
    ];
    const steps = [
      { id: 'st_base', kind: 'group', customTitle: 'Đặt các đỉnh đáy A, B, C, D', items: ['A', 'B', 'C', 'D'].map((k) => ({ kind: 'point', refId: k })), effect: 'pop', easing: 'easeOut', enabled: true },
      { id: 'st_AB', kind: 'shape', refId: 's_AB', effect: 'chalk', easing: 'easeInOut', enabled: true },
      { id: 'st_BC', kind: 'shape', refId: 's_BC', effect: 'chalk', easing: 'easeInOut', enabled: true },
      { id: 'st_CD', kind: 'shape', refId: 's_CD', effect: 'chalk', easing: 'easeInOut', enabled: true },
      { id: 'st_AD', kind: 'shape', refId: 's_AD', effect: 'draw', easing: 'easeInOut', enabled: true },
      { id: 'st_S', kind: 'point', refId: 'S', effect: 'pop', easing: 'spring', enabled: true },
      { id: 'st_lat', kind: 'group', customTitle: 'Nối các cạnh bên SA, SB, SC, SD', items: ['s_SA', 's_SB', 's_SC', 's_SD'].map((k) => ({ kind: 'shape', refId: k })), effect: 'chalk', easing: 'easeInOut', enabled: true },
      { id: 'st_diag', kind: 'group', customTitle: 'Hai đường chéo đáy AC, BD', items: ['s_AC', 's_BD'].map((k) => ({ kind: 'shape', refId: k })), effect: 'draw', easing: 'easeInOut', enabled: true },
      { id: 'st_O', kind: 'point', refId: 'O', effect: 'pulse', easing: 'spring', showGuides: true, enabled: true },
      { id: 'st_SO', kind: 'shape', refId: 's_SO', effect: 'glow', easing: 'easeOut', customTitle: 'Giao tuyến SO = (SAC) ∩ (SBD)', enabled: true },
      { id: 'st_MN', kind: 'group', customTitle: 'Trung điểm M, N & đoạn MN', items: [{ kind: 'point', refId: 'M' }, { kind: 'point', refId: 'N' }, { kind: 'shape', refId: 's_MN' }, { kind: 'shape', refId: 's_AM' }, { kind: 'shape', refId: 's_AN' }], effect: 'glow', easing: 'easeInOut', enabled: true },
      { id: 'st_fill', kind: 'shape', refId: 's_fill', effect: 'fade', easing: 'easeInOut', customTitle: 'Mặt phẳng thiết diện (AMN)', enabled: true }
    ];
    return {
      geo: { points, shapes },
      replay: { title: 'Hình chóp S.ABCD & Thiết diện (AMN)', stylePreset: 'domiinh', followCamera: true, autoOrbitAfter: false, steps },
      isDemoFallback: true
    };
  }

  // ============================================================================
  // 4. EXTRACT ACTIVE GEOMETRY & TIMELINE FROM BOARD OR OPTS
  // ============================================================================
  function resolveActiveSource(opts = {}) {
    if (opts.geo && opts.geo.points) {
      const ptsObj = Array.isArray(opts.geo.points)
        ? Object.fromEntries(opts.geo.points.map((p) => [p.id, p]))
        : opts.geo.points;
      const shapes = (opts.geo.shapes || []).filter((s) => s && !s.hidden && s.kind !== 'flatLink');
      return {
        geo: {
          points: ptsObj,
          shapes,
          _coordSpace: opts.geo._coordSpace,
          cmPx: opts.geo.cmPx || opts.geo.pxPerCm,
          params: opts.geo.params
        },
        replay: opts.replay || (Array.isArray(opts.steps) ? { steps: opts.steps, title: opts.title || 'Hình học MinNote' } : null),
        isDemoFallback: false
      };
    }

    const w = getWin();
    const b = getBoard();
    if (b && b.doc && Array.isArray(b.doc.pages)) {
      let replayCtx = null;
      if (w && w.MinNoteGeoReplay && typeof w.MinNoteGeoReplay.getExportContext === 'function') {
        try { replayCtx = w.MinNoteGeoReplay.getExportContext(opts.replay || null); } catch (_) {}
      }
      const pgIdx = replayCtx
        ? replayCtx.pageIdx
        : ((b.sel && Number.isInteger(b.sel.page)) ? b.sel.page : (typeof b.currentPage === 'function' ? b.currentPage() : 0));
      const pg = b.doc.pages[pgIdx];
      if (pg && pg.geo && pg.geo.points && Object.keys(pg.geo.points).length > 0) {
        const geo = pg.geo;
        let scopeShapes = replayCtx && replayCtx.replay && replayCtx.replay.scopeShapes ? replayCtx.replay.scopeShapes : null;
        let scopePoints = replayCtx && replayCtx.replay && replayCtx.replay.scopePoints ? replayCtx.replay.scopePoints : null;

        if (!scopeShapes && !scopePoints && b.sel && b.sel.page === pgIdx && ((b.sel.shapes && b.sel.shapes.size > 0) || (b.sel.points && b.sel.points.size > 0))) {
          scopeShapes = new Set(b.sel.shapes || []);
          scopePoints = new Set(b.sel.points || []);
          for (const sh of (geo.shapes || [])) {
            if (scopeShapes.has(sh.id) && Array.isArray(sh.pts)) sh.pts.forEach((pid) => scopePoints.add(pid));
          }
        }

        const shapes = (geo.shapes || []).filter((s) => {
          if (!s || s.hidden || s.kind === 'flatLink') return false;
          if (scopeShapes && scopeShapes.size > 0 && !scopeShapes.has(s.id)) return false;
          return true;
        });

        const ptSet = new Set(scopePoints && scopePoints.size > 0 ? [...scopePoints] : Object.keys(geo.points));
        shapes.forEach((s) => (s.pts || []).forEach((id) => ptSet.add(id)));
        let changed = true;
        while (changed) {
          changed = false;
          for (const pid of [...ptSet]) {
            const pt = geo.points[pid];
            if (!pt) continue;
            for (const dep of pointDeps(pt.def)) {
              if (geo.points[dep] && !ptSet.has(dep)) {
                ptSet.add(dep);
                changed = true;
              }
            }
          }
        }

        const points = {};
        for (const pid of ptSet) {
          if (geo.points[pid]) points[pid] = geo.points[pid];
        }
        const renderShapes = shapes.filter((s) => s.kind !== 'solid');
        if (Object.keys(points).length > 0 && (renderShapes.length > 0 || Object.values(points).some((p) => p.show))) {
          let activeReplay = (replayCtx && replayCtx.replay) || null;
          if ((!activeReplay || activeReplay.id === 'rp_export_tmp') && pg.id && typeof localStorage !== 'undefined') {
            try {
              const rawSaved = localStorage.getItem('mn_geo_scripts_' + pg.id);
              if (rawSaved) {
                const map = JSON.parse(rawSaved);
                const list = Object.values(map || {}).filter((e) => e && Array.isArray(e.steps) && e.steps.length);
                if (list.length) {
                  list.sort((a, b2) => (b2.updatedAt || 0) - (a.updatedAt || 0));
                  activeReplay = list[0];
                }
              }
            } catch (_) {}
          }
          return {
            geo: { points, shapes, _hasSolid: shapes.some((s) => s.kind === 'solid') },
            replay: activeReplay,
            page: pg,
            pageIdx: pgIdx,
            isDemoFallback: false
          };
        }
      }
    }

    if (opts.allowDemoFallback) {
      return buildDemoGeoModel();
    }
    return null;
  }

  function normalizeStepEffect(fx, preset, kind, isDashed, isAux) {
    const raw = String(fx || '').trim();
    if (raw && EFFECT_TO_CANONICAL[raw]) return EFFECT_TO_CANONICAL[raw];
    if (raw && CANONICAL_EFFECTS.has(raw)) return raw;
    const p = PRESET_TO_SCHEMA[preset] || 'domiinh';
    if (kind === 'point') return p === 'manim' ? 'pulse' : 'pop';
    if (p === 'domiinh') return isAux ? 'glow' : 'chalk';
    if (p === 'manim') return isAux ? 'glow' : 'draw';
    if (p === '3d_standard') return isDashed ? 'fade' : 'draw';
    return 'draw';
  }

  function normalizeStepEasing(easing) {
    const e = String(easing || '').trim();
    if (e === 'linear') return 'linear';
    if (e === 'easeOut' || e === 'ease_out' || e === 'easeout') return 'easeOut';
    if (e === 'spring' || e === 'pop' || e === 'bump') return 'spring';
    return 'easeInOut';
  }

  function buildNormalizedBridgeModel(opts = {}) {
    const src = resolveActiveSource(opts);
    if (!src) return null;

    const { geo, replay } = src;
    const rawCoordTag = opts.coordSpace || geo._coordSpace || 'board_y_down';
    const isInputMathYUp = rawCoordTag === 'math-y-up' || rawCoordTag === 'math_y_up';
    const STD_CM_PX = 37.79527559;
    const inputCm = (geo && (geo.cmPx || geo.pxPerCm)) || (isInputMathYUp ? 1 : STD_CM_PX);
    const liveCoords = evalGeoMap(inputCm === STD_CM_PX ? geo : Object.assign({}, geo, { cmPx: inputCm }));
    const allShapes = (geo.shapes || []).filter((s) => s && !s.hidden && s.kind !== 'flatLink');
    const renderShapes = allShapes.filter((s) => s.kind !== 'solid');

    // Collect valid points
    const validPtIds = Object.keys(geo.points || {}).filter((id) => liveCoords.get(id));
    if (!validPtIds.length) return null;

    // Topological sort of points
    const visited = new Set();
    const visiting = new Set();
    const topoPtIds = [];
    const visitPt = (id) => {
      if (visited.has(id) || visiting.has(id) || !geo.points[id] || !liveCoords.get(id)) return;
      visiting.add(id);
      for (const dep of pointDeps(geo.points[id].def)) visitPt(dep);
      visiting.delete(id);
      visited.add(id);
      topoPtIds.push(id);
    };
    validPtIds.forEach(visitPt);

    // Convert live coordinates to math Y-up
    const rawMath = new Map();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of topoPtIds) {
      const c = liveCoords.get(id);
      const mx = c.x;
      const my = isInputMathYUp ? c.y : -c.y;
      rawMath.set(id, { x: mx, y: my });
      if (mx < minX) minX = mx;
      if (mx > maxX) maxX = mx;
      if (my < minY) minY = my;
      if (my > maxY) maxY = my;
    }

    // Origin at bottom-leftmost primary point & scale dominant span to ~5.4 cm
    const primaryIds = topoPtIds.filter((id) => {
      const d = geo.points[id] && geo.points[id].def;
      return !d || d.t === 'free';
    });
    const anchorCands = primaryIds.length ? primaryIds : topoPtIds;
    let originId = anchorCands[0];
    let lowY = Infinity;
    for (const id of anchorCands) {
      const p = rawMath.get(id);
      if (p.y < lowY) lowY = p.y;
    }
    const spanRawX = Math.max(maxX - minX, 1e-6);
    const spanRawY = Math.max(maxY - minY, 1e-6);
    const spanRaw = Math.max(spanRawX, spanRawY, 1e-3);
    const bottomBand = anchorCands
      .filter((id) => rawMath.get(id).y <= lowY + 0.08 * spanRawY)
      .sort((a, b) => rawMath.get(a).x - rawMath.get(b).x);
    if (bottomBand.length) originId = bottomBand[0];
    const originRaw = rawMath.get(originId) || { x: 0, y: 0 };

    // Choose scale: if already in small math coords (~[1.5..11.5]), keep 1.0; else normalize to ~5.4 cm
    const scale = (spanRaw >= 1.5 && spanRaw <= 11.5) ? 1.0 : (5.4 / spanRaw);
    const cmPx = inputCm;
    const toStdCm = inputCm / STD_CM_PX;
    const toBoardPx = STD_CM_PX / inputCm;
    const round6 = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? (Math.abs(n) < 1e-11 ? 0 : Number(n.toFixed(8))) : 0;
    };

    const mathCoords = new Map();
    const intCoords = new Map();
    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
    const validSet = new Set(topoPtIds);

    for (const id of topoPtIds) {
      const pt = geo.points[id];
      const d = pt && pt.def;
      const deps = pointDeps(d);
      const isDerived = d && d.t && d.t !== 'free' && deps.length > 0 && deps.every((dep) => validSet.has(dep));
      let sx, sy;
      if (isDerived) {
        // Re-evaluate derived point directly from normalized parent mathCoords so incidence & orthogonality hold to < 1e-12!
        const ev = evalBoardDefInMathSpace(d, (depId) => mathCoords.get(depId), cmPx * scale, isInputMathYUp);
        if (ev && Number.isFinite(ev.x) && Number.isFinite(ev.y)) {
          sx = round6(ev.x);
          sy = round6(ev.y);
        }
      }
      if (sx === undefined || sy === undefined) {
        const p = rawMath.get(id);
        sx = round6((p.x - originRaw.x) * scale);
        sy = round6((p.y - originRaw.y) * scale);
      }
      const nx = id === originId ? 0 : Math.round(sx * 2) / 2;
      const ny = id === originId ? 0 : Math.round(sy * 2) / 2;
      mathCoords.set(id, { x: sx, y: sy });
      intCoords.set(id, { nx, ny });
      if (sx < bMinX) bMinX = sx;
      if (sx > bMaxX) bMaxX = sx;
      if (sy < bMinY) bMinY = sy;
      if (sy > bMaxY) bMaxY = sy;
    }

    // Expand bbox for circles & 3D revolution solids
    for (const sh of renderShapes) {
      const pIds = (sh.pts || []).filter((id) => mathCoords.has(id));
      if ((sh.kind === 'circle' || sh.kind === 'sphere' || sh.kind === 'cone' || sh.kind === 'cylinder' || sh.kind === 'frustumCone') && pIds.length >= 2) {
        const o = mathCoords.get(pIds[0]), rPt = mathCoords.get(pIds[1]);
        const r = dist2(o, rPt);
        bMinX = Math.min(bMinX, o.x - r);
        bMaxX = Math.max(bMaxX, o.x + r);
        bMinY = Math.min(bMinY, o.y - r);
        bMaxY = Math.max(bMaxY, o.y + r);
        if (sh.kind === 'cylinder' && pIds[2]) {
          const top = mathCoords.get(pIds[2]);
          bMinX = Math.min(bMinX, top.x - r);
          bMaxX = Math.max(bMaxX, top.x + r);
          bMinY = Math.min(bMinY, top.y - r * 0.35);
          bMaxY = Math.max(bMaxY, top.y + r * 0.35);
        } else if (sh.kind === 'frustumCone' && pIds[2] && pIds[3]) {
          const o2 = mathCoords.get(pIds[2]), r2Pt = mathCoords.get(pIds[3]);
          const r2 = dist2(o2, r2Pt);
          bMinX = Math.min(bMinX, o2.x - r2);
          bMaxX = Math.max(bMaxX, o2.x + r2);
          bMinY = Math.min(bMinY, o2.y - r2 * 0.35);
          bMaxY = Math.max(bMaxY, o2.y + r2 * 0.35);
        }
      }
    }
    if (!Number.isFinite(bMinX)) { bMinX = -2; bMaxX = 4; bMinY = -2; bMaxY = 4; }

    // Assign clean symbolic IDs for points (labeled first!)
    const usedSyms = new Set();
    const symCtr = { n: 1 };
    const idMap = new Map(); // origId -> { sym, tikzId, texLabel }
    const labelSorted = topoPtIds.slice().sort((a, b) => {
      const la = (geo.points[a] && geo.points[a].label) ? 0 : 1;
      const lb = (geo.points[b] && geo.points[b].label) ? 0 : 1;
      return la - lb;
    });
    for (const id of labelSorted) {
      idMap.set(id, sanitizeSymId(geo.points[id] && geo.points[id].label, usedSyms, symCtr));
    }
    const S = (id) => (idMap.get(id) ? idMap.get(id).sym : String(id));
    const T = (id) => (idMap.get(id) ? idMap.get(id).tikzId : String(id).replace(/[^A-Za-z0-9]/g, 'p'));

    // Assign clean symbolic IDs for shapes
    const usedShapeSyms = new Set();
    const shapeSymMap = new Map(); // origShapeId -> cleanShapeId
    renderShapes.forEach((sh, idx) => {
      const pSyms = (sh.pts || []).map(S).join('');
      const prefix = sh.kind === 'segment' ? 'seg' : (sh.kind === 'polygon' && sh.width === 0 ? 'fill' : sh.kind);
      let base = pSyms ? `${prefix}_${pSyms}` : `${prefix}_${idx + 1}`;
      base = base.replace(/[^A-Za-z0-9_']/g, '');
      let cand = base;
      let dup = 2;
      while (usedShapeSyms.has(cand)) cand = `${base}_${dup++}`;
      usedShapeSyms.add(cand);
      shapeSymMap.set(sh.id, cand);
    });

    // Detect 3D figure
    const hasDashed = renderShapes.some((s) => !!s.dashed);
    const hasApexS = topoPtIds.some((id) => idMap.get(id).sym === 'S' || idMap.get(id).sym === "A'");
    const is3D = !!(
      opts.is3D != null
        ? opts.is3D
        : (geo._hasSolid || allShapes.some((s) => s.kind === 'solid' || s.look3 || ['cone', 'cylinder', 'sphere', 'frustumCone'].includes(s.kind)) || (hasDashed && hasApexS))
    );

    // Build normalized points, shapes & ops while 100% preserving EVERY live parametric constraint (`def`) in `board_y_down`!
    const normPoints = [];
    const ops = [];

    for (const id of topoPtIds) {
      const pt = geo.points[id];
      const info = idMap.get(id);
      const mc = mathCoords.get(id);
      const ic = intCoords.get(id);
      const lc = liveCoords.get(id);
      const boardX = lc ? round6(lc.x * toBoardPx + (isInputMathYUp ? 440 : 0)) : round6(mc.x * 56 + 400);
      const boardY = lc ? round6((isInputMathYUp ? -lc.y : lc.y) * toBoardPx + (isInputMathYUp ? 350 : 0)) : round6(-mc.y * 56 + 360);
      const rawLabelStr = pt && pt.label ? String(pt.label).trim() : '';
      const hasVisibleLabel = pt.show !== false && !pt.hidden && !pt.noName && !!rawLabelStr;
      const cleanLabel = hasVisibleLabel ? (info.texLabel || rawLabelStr) : '';

      const d = pt.def || { t: 'free', x: boardX, y: boardY };
      let symDef;
      switch (d.t) {
        case 'mid':
          symDef = { t: 'mid', a: S(d.a), b: S(d.b) };
          ops.push({ op: 'midpoint', id: info.sym, label: cleanLabel, a: S(d.a), b: S(d.b), ...(pt.show === false ? { show: false } : {}) });
          break;
        case 'sum':
          symDef = { t: 'sum', a: S(d.a), b: S(d.b), c: S(d.c) };
          ops.push({ op: 'point_sum', id: info.sym, label: cleanLabel, a: S(d.a), b: S(d.b), c: S(d.c), ...(pt.show === false ? { show: false } : {}) });
          break;
        case 'on': {
          const kRaw = d.k != null ? safeEvalMathNumber(d.k) : 0.5;
          const kVal = round6(Number.isFinite(kRaw) ? kRaw : 0.5);
          symDef = { t: 'on', a: S(d.a), b: S(d.b), k: kVal, seg: !!d.seg };
          ops.push({
            op: d.seg ? 'point_on_segment' : 'point_on_line',
            id: info.sym,
            label: cleanLabel,
            a: S(d.a),
            b: S(d.b),
            ratio: kVal,
            ...(pt.show === false ? { show: false } : {})
          });
          break;
        }
        case 'foot':
          symDef = { t: 'foot', p: S(d.p), a: S(d.a), b: S(d.b) };
          ops.push({ op: 'foot_perp', id: info.sym, label: cleanLabel, p: S(d.p), a: S(d.a), b: S(d.b), drawDropSegment: false, markRightAngle: false, ...(pt.show === false ? { show: false } : {}) });
          break;
        case 'inter':
          if (Array.isArray(d.l1) && Array.isArray(d.l2)) {
            const whichBoard = isInputMathYUp && d.c1 && d.c2 ? (d.which ? 0 : 1) : (d.which || 0);
            symDef = {
              t: 'inter',
              l1: [S(d.l1[0]), S(d.l1[1])],
              c1: !!d.c1,
              l2: [S(d.l2[0]), S(d.l2[1])],
              c2: !!d.c2,
              which: whichBoard
            };
            if (!d.c1 && !d.c2) {
              ops.push({ op: 'intersection_ll', id: info.sym, label: cleanLabel, l1: [S(d.l1[0]), S(d.l1[1])], l2: [S(d.l2[0]), S(d.l2[1])], ...(pt.show === false ? { show: false } : {}) });
            } else if (d.c1 && d.c2) {
              ops.push({ op: 'intersection_cc', id: info.sym, label: cleanLabel, c1: [S(d.l1[0]), S(d.l1[1])], c2: [S(d.l2[0]), S(d.l2[1])], which: whichBoard, ...(pt.show === false ? { show: false } : {}) });
            } else {
              const ln = d.c1 ? d.l2 : d.l1;
              const cir = d.c1 ? d.l1 : d.l2;
              ops.push({ op: 'intersection_lc', id: info.sym, label: cleanLabel, line: [S(ln[0]), S(ln[1])], circle: [S(cir[0]), S(cir[1])], which: d.which || 0, ...(pt.show === false ? { show: false } : {}) });
            }
          } else {
            symDef = { t: 'free', x: boardX, y: boardY };
            ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
          }
          break;
        case 'vec': {
          const kVal = round6(d.k != null ? safeEvalMathNumber(d.k) : 1);
          const hasDist = d.distVal != null && Number.isFinite(safeEvalMathNumber(d.distVal));
          const distBoardCm = hasDist ? round6(safeEvalMathNumber(d.distVal) * toStdCm) : undefined;
          const distMath = hasDist ? round6(safeEvalMathNumber(d.distVal) * cmPx * scale) : undefined;
          const ma = mathCoords.get(d.a), mb = mathCoords.get(d.b);
          const abLenMath = ma && mb ? dist2(ma, mb) : 0;
          const kOp = hasDist && abLenMath > 1e-9 ? round6(distMath / abLenMath) : kVal;
          symDef = {
            t: 'vec',
            o: S(d.o),
            a: S(d.a),
            b: S(d.b),
            k: kVal,
            perp: !!d.perp,
            ...(hasDist ? { distVal: distBoardCm } : {})
          };
          ops.push({
            op: d.perp ? 'line_perp' : 'line_parallel',
            id: info.sym,
            label: cleanLabel,
            through: S(d.o),
            a: S(d.a),
            b: S(d.b),
            k: kOp,
            ...(hasDist ? { distVal: distMath } : {}),
            drawSegment: false,
            ...(pt.noDot ? { noDot: true } : {}),
            ...(pt.show === false ? { show: false } : {})
          });
          break;
        }
        case 'rot': {
          const angBoard = isInputMathYUp ? -(safeEvalMathNumber(d.ang) || 0) : (safeEvalMathNumber(d.ang) || 0);
          const kVal = round6(d.k != null ? safeEvalMathNumber(d.k) : 1);
          symDef = { t: 'rot', c: S(d.c), p: S(d.p), ang: round6(angBoard), k: kVal };
          ops.push({
            op: 'rotate',
            id: info.sym,
            label: cleanLabel,
            center: S(d.c),
            point: S(d.p),
            angleDeg: round6(-angBoard),
            k: kVal,
            ...(pt.noDot ? { noDot: true } : {}),
            ...(pt.show === false ? { show: false } : {})
          });
          break;
        }
        case 'polar': {
          symDef = {
            t: 'polar',
            o: S(d.o),
            ref: S(d.ref),
            ...(d.fixedAng != null ? { fixedAng: !!d.fixedAng } : {}),
            ...(d.angVal != null ? { angVal: round6(safeEvalMathNumber(d.angVal)) } : {}),
            ...(d.curAngDeg != null ? { curAngDeg: round6(safeEvalMathNumber(d.curAngDeg)) } : {}),
            ...(d.fixedDist != null ? { fixedDist: !!d.fixedDist } : {}),
            ...(d.distVal != null ? { distVal: round6(safeEvalMathNumber(d.distVal) * toStdCm) } : {}),
            ...(d.curDistPx != null ? { curDistPx: round6(safeEvalMathNumber(d.curDistPx) * toBoardPx) } : {})
          };
          ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
          break;
        }
        case 'len': {
          const angBoard = isInputMathYUp ? -(safeEvalMathNumber(d.ang) || 0) : (safeEvalMathNumber(d.ang) || 0);
          symDef = {
            t: 'len',
            a: S(d.a),
            val: round6((d.val != null ? safeEvalMathNumber(d.val) : 2) * toStdCm),
            ang: round6(angBoard),
            ...(d.lockedAng ? { lockedAng: true } : {})
          };
          ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
          break;
        }
        case 'bis':
          symDef = { t: 'bis', a: S(d.a), o: S(d.o), b: S(d.b) };
          ops.push({
            op: 'angle_bisector',
            id: info.sym,
            label: cleanLabel,
            a: S(d.a),
            o: S(d.o),
            b: S(d.b),
            drawSegment: false,
            ...(pt.noDot ? { noDot: true } : {}),
            ...(pt.show === false ? { show: false } : {})
          });
          break;
        case 'path':
          if (Array.isArray(d.pts) && d.pts.length >= 2) {
            const kind = d.kind || d.on || 'circle';
            const oMc = mathCoords.get(d.pts[0]);
            const deg = oMc ? round6(((Math.atan2(mc.y - oMc.y, mc.x - oMc.x) * 180 / Math.PI) + 360) % 360) : 60;
            const kBoard = d.k != null
              ? (isInputMathYUp ? round6((((1 - safeEvalMathNumber(d.k)) % 1) + 1) % 1) : round6(safeEvalMathNumber(d.k)))
              : round6((((-deg / 360) % 1) + 1) % 1);
            symDef = {
              t: 'path',
              kind,
              ...(d.on ? { on: d.on } : {}),
              pts: d.pts.map(S),
              k: kBoard,
              ...(kind === 'circle' ? { angleDeg: deg } : {}),
              ...(d.rot ? { rot: d.rot } : {})
            };
            if (kind === 'circle') {
              ops.push({ op: 'point_on_circle', id: info.sym, label: cleanLabel, center: S(d.pts[0]), rim: S(d.pts[1]), angleDeg: deg, ...(pt.show === false ? { show: false } : {}) });
            } else {
              ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
            }
          } else {
            symDef = { t: 'free', x: boardX, y: boardY };
            ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y });
          }
          break;
        case 'ctan':
          if (Array.isArray(d.c1) && Array.isArray(d.c2)) {
            const whichBoard = isInputMathYUp ? !d.which : !!d.which;
            symDef = {
              t: 'ctan',
              c1: d.c1.map(S),
              c2: d.c2.map(S),
              inner: !!d.inner,
              which: whichBoard,
              on: d.on || 1
            };
            ops.push({
              op: 'common_tangent',
              id: info.sym,
              label: cleanLabel,
              c1: d.c1.map(S),
              c2: d.c2.map(S),
              inner: !!d.inner,
              which: whichBoard ? 0 : 1,
              on: d.on || 1,
              ...(pt.noDot ? { noDot: true } : {}),
              ...(pt.show === false ? { show: false } : {})
            });
          } else {
            symDef = { t: 'free', x: boardX, y: boardY };
            ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
          }
          break;
        case 'p3d':
          symDef = {
            t: 'p3d',
            o: S(d.o),
            vx: round6((safeEvalMathNumber(d.vx) || 0) * toStdCm),
            vy: round6((safeEvalMathNumber(d.vy) || 0) * toStdCm),
            vz: round6((safeEvalMathNumber(d.vz) || 0) * toStdCm),
            ...(Array.isArray(d.view) ? { view: d.view.slice() } : {})
          };
          ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
          break;
        default:
          symDef = {
            t: 'free',
            x: boardX,
            y: boardY
          };
          ops.push({ op: 'point_free', id: info.sym, label: cleanLabel, x: mc.x, y: mc.y, ...(pt.show === false ? { show: false } : {}) });
          break;
      }

      normPoints.push({
        id: info.sym,
        tikzId: info.tikzId,
        origId: id,
        label: cleanLabel,
        show: pt.show !== false && !pt.hidden,
        noDot: !!pt.noDot,
        nx: ic.nx,
        ny: ic.ny,
        x: mc.x,
        y: mc.y,
        canvasX: boardX,
        canvasY: boardY,
        def: symDef
      });
    }

    const normShapes = [];
    for (const sh of renderShapes) {
      const shSym = shapeSymMap.get(sh.id);
      const pSyms = (sh.pts || []).filter((id) => idMap.has(id)).map(S);
      if (!pSyms.length) continue;
      const isNameable = sh.kind === 'line' || sh.kind === 'ray' || sh.kind === 'segment' || sh.kind === 'plane';
      const cleanName = isNameable && sh.name != null ? String(sh.name).trim() : '';
      const validNameAt = isNameable && sh.nameAt && Number.isFinite(Number(sh.nameAt.x)) && Number.isFinite(Number(sh.nameAt.y))
        ? { x: Number(sh.nameAt.x), y: Number(sh.nameAt.y) }
        : null;
      const rec = {
        id: shSym,
        origId: sh.id,
        kind: sh.kind,
        pts: pSyms,
        dashed: !!sh.dashed,
        ...(cleanName ? { name: cleanName } : {}),
        ...(validNameAt ? { nameAt: validNameAt } : {}),
        ...(sh.aux ? { aux: true } : {}),
        ...(sh.fill ? { fill: sh.fill } : {}),
        ...(sh.arrow ? { arrow: true } : {}),
        ...(sh.width === 0 ? { width: 0 } : {}),
        ...(Number.isFinite(sh.n) ? { n: sh.n } : {})
      };
      normShapes.push(rec);

      if (sh.kind === 'segment' && pSyms.length >= 2) {
        ops.push({
          op: 'segment',
          id: shSym,
          a: pSyms[0],
          b: pSyms[1],
          dashed: !!sh.dashed,
          ...(cleanName ? { name: cleanName } : {}),
          ...(validNameAt ? { nameAt: validNameAt } : {}),
          ...(sh.aux ? { aux: true } : {}),
          ...(sh.arrow ? { arrow: true } : {})
        });
      } else if ((sh.kind === 'line' || sh.kind === 'ray') && pSyms.length >= 2) {
        ops.push({
          op: sh.kind,
          id: shSym,
          a: pSyms[0],
          b: pSyms[1],
          dashed: !!sh.dashed,
          ...(cleanName ? { name: cleanName } : {}),
          ...(validNameAt ? { nameAt: validNameAt } : {}),
          ...(sh.aux ? { aux: true } : {})
        });
      } else if (sh.kind === 'plane' && pSyms.length >= 3) {
        ops.push({
          op: 'plane',
          id: shSym,
          pts: pSyms,
          ...(sh.dashed ? { dashed: true } : {}),
          ...(cleanName ? { name: cleanName } : {}),
          ...(validNameAt ? { nameAt: validNameAt } : {}),
          ...(sh.aux ? { aux: true } : {})
        });
      } else if (sh.kind === 'circle' && pSyms.length >= 2) {
        ops.push({ op: 'circle', id: shSym, center: pSyms[0], rim: pSyms[1], dashed: !!sh.dashed, ...(sh.aux ? { aux: true } : {}) });
      } else if ((sh.kind === 'arc' || sh.kind === 'sector' || sh.kind === 'arc3') && pSyms.length >= 3) {
        ops.push({ op: sh.kind, id: shSym, pts: pSyms, dashed: !!sh.dashed, ...(sh.fill ? { fill: sh.fill } : {}), ...(sh.aux ? { aux: true } : {}) });
      } else if ((sh.kind === 'cone' || sh.kind === 'cylinder') && pSyms.length >= 3) {
        ops.push({ op: sh.kind, id: shSym, pts: pSyms.slice(0, 3), ...(sh.dashed ? { dashed: true } : {}), ...(sh.aux ? { aux: true } : {}) });
      } else if (sh.kind === 'sphere' && pSyms.length >= 2) {
        ops.push({ op: 'sphere', id: shSym, pts: pSyms.slice(0, 2), ...(sh.dashed ? { dashed: true } : {}), ...(sh.aux ? { aux: true } : {}) });
      } else if (sh.kind === 'frustumCone' && pSyms.length >= 4) {
        ops.push({ op: 'frustumCone', id: shSym, pts: pSyms.slice(0, 4), ...(sh.dashed ? { dashed: true } : {}), ...(sh.aux ? { aux: true } : {}) });
      } else if (sh.kind === 'polygon' && pSyms.length >= 3) {
        if (sh.width === 0 && sh.fill) {
          ops.push({ op: 'polygon_fill', id: shSym, pts: pSyms, fill: sh.fill, ...(sh.aux ? { aux: true } : {}) });
        } else {
          ops.push({ op: 'connect_polygon', id: shSym, pts: pSyms, ...(sh.fill ? { fill: sh.fill } : {}), ...(sh.dashed ? { dashedEdges: pSyms.map((u, i) => `${u}-${pSyms[(i + 1) % pSyms.length]}`) } : {}) });
        }
      } else if (sh.kind === 'right' && pSyms.length >= 3) {
        ops.push({ op: 'right_angle', id: shSym, a: pSyms[0], v: pSyms[1], b: pSyms[2], aux: true });
      } else if (sh.kind === 'angle' && pSyms.length >= 3) {
        ops.push({ op: 'angle_mark', id: shSym, a: pSyms[0], v: pSyms[1], b: pSyms[2], n: sh.n || 1, aux: true });
      } else if (sh.kind === 'tick' && pSyms.length >= 2) {
        ops.push({ op: 'tick_mark', id: shSym, a: pSyms[0], b: pSyms[1], n: sh.n || 1, aux: true });
      }
    }

    // Build / normalize Motion Steps & Timeline
    const rawPreset = opts.preset || (replay && replay.stylePreset) || (is3D ? 'domiinh' : 'manim');
    const preset = PRESET_TO_SCHEMA[rawPreset] || 'domiinh';
    const fps = clamp(opts.fps || (replay && replay.fps) || 24, 12, 60);
    const durationSec = clamp(opts.durationSec || (replay && replay.durationSec) || 8, 2, 60);
    const holdEndSec = clamp(opts.holdEndSec != null ? opts.holdEndSec : (replay && replay.holdEndSec != null ? replay.holdEndSec : 1.0), 0, durationSec * 0.45);
    const loop = opts.loop != null ? !!opts.loop : (replay && replay.loop != null ? !!replay.loop : true);
    const w = getWin();
    const handPen = opts.handPen != null
      ? !!opts.handPen
      : (w && w.MinNoteHandCursor && typeof w.MinNoteHandCursor.isReplay === 'function' ? !!w.MinNoteHandCursor.isReplay() : true);
    const followCamera = opts.followCamera != null ? !!opts.followCamera : (replay ? replay.followCamera !== false : true);
    const orbit3d = opts.orbit3d != null ? !!opts.orbit3d : !!(replay && replay.autoOrbitAfter);

    const normShByOrig = new Map(normShapes.map((s) => [s.origId, s]));
    const normPtByOrig = new Map(normPoints.map((p) => [p.origId, p]));

    let rawSteps = (replay && Array.isArray(replay.steps) && replay.steps.length) ? replay.steps : null;
    if (!rawSteps) {
      // Auto-build clean pedagogical step sequence
      rawSteps = [];
      const basePts = normPoints.filter((p) => p.show && (p.def.t === 'free' || p.def.t === 'sum') && p.id !== 'S');
      if (basePts.length >= 2) {
        rawSteps.push({
          id: 'st_auto_base',
          kind: 'group',
          customTitle: `Đặt các đỉnh gốc ${basePts.map((p) => p.id).join(', ')}`,
          items: basePts.map((p) => ({ kind: 'point', refId: p.origId })),
          effect: 'pop',
          easing: 'easeOut',
          enabled: true
        });
      }
      const emittedPts = new Set(basePts.map((p) => p.origId));
      for (const sh of normShapes) {
        for (const pSym of sh.pts) {
          const np = normPoints.find((x) => x.id === pSym);
          if (np && np.show && !emittedPts.has(np.origId)) {
            emittedPts.add(np.origId);
            rawSteps.push({
              id: 'st_auto_p_' + np.id,
              kind: 'point',
              refId: np.origId,
              effect: np.def.t === 'inter' ? 'pulse' : 'pop',
              easing: 'spring',
              showGuides: np.def.t === 'inter',
              enabled: true
            });
          }
        }
        rawSteps.push({
          id: 'st_auto_s_' + sh.id,
          kind: 'shape',
          refId: sh.origId,
          effect: sh.width === 0 || sh.kind === 'right' || sh.kind === 'angle' ? 'fade' : normalizeStepEffect('', preset, 'shape', sh.dashed, sh.aux),
          easing: 'easeInOut',
          enabled: true
        });
      }
    }

    const mapRefItem = (it) => {
      if (!it || !it.refId) return null;
      if (it.kind === 'point') {
        const np = normPtByOrig.get(it.refId) || normPoints.find((p) => p.id === it.refId);
        return np ? { kind: 'point', refId: np.id } : null;
      }
      if (it.kind === 'shape') {
        const ns = normShByOrig.get(it.refId) || normShapes.find((s) => s.id === it.refId);
        return ns ? { kind: 'shape', refId: ns.id, ...(it.rev ? { rev: true } : {}) } : null;
      }
      return null;
    };

    const mappedSteps = [];
    rawSteps.forEach((st, idx) => {
      if (!st || st.enabled === false) return;
      let items = [];
      if (Array.isArray(st.items) && st.items.length) {
        items = st.items.map(mapRefItem).filter(Boolean);
      } else {
        const single = mapRefItem(st);
        if (single) items = [single];
      }
      if (!items.length) return;

      const first = items[0];
      const firstSh = first.kind === 'shape' ? normShapes.find((s) => s.id === first.refId) : null;
      const fx = opts.forcePreset
        ? normalizeStepEffect('', preset, first.kind, !!(firstSh && firstSh.dashed), !!(firstSh && firstSh.aux))
        : normalizeStepEffect(st.effect, preset, first.kind, !!(firstSh && firstSh.dashed), !!(firstSh && firstSh.aux));

      const durMul = clamp(Number(st.durationMul) || 1, 0.3, 4.0);
      const delayMs = Math.max(0, Math.round(Number(st.delayMs != null ? st.delayMs : ((Number(st.pauseAfter) || 0) * 1000)) || 0));

      mappedSteps.push({
        id: st.id && /^step_/.test(st.id) ? st.id : `step_${idx + 1}`,
        kind: items.length > 1 ? 'group' : first.kind,
        refId: items.length === 1 ? first.refId : undefined,
        items: items.length > 1 ? items : undefined,
        customTitle: st.customTitle || st.title || undefined,
        effect: fx,
        easing: normalizeStepEasing(st.easing),
        durationMul: Number(durMul.toFixed(2)),
        delayMs,
        rev: !!(st.rev || first.rev),
        tempHide: !!st.tempHide,
        showGuides: st.showGuides !== false,
        mode: st.mode === 'cue' ? 'cue' : undefined,
        enabled: true,
        _rawTRange: Array.isArray(st.tRange) && st.tRange.length === 2 ? st.tRange : null
      });
    });

    // Assign continuous [tStart, tEnd] intervals in [0.02, 1 - holdRatio]
    const holdRatio = durationSec > 0 ? clamp(holdEndSec / durationSec, 0.04, 0.38) : 0.12;
    const tAvailStart = 0.02;
    const tAvailEnd = Number((1.0 - holdRatio).toFixed(4));
    const totalWeight = mappedSteps.reduce((acc, s) => acc + s.durationMul + (s.delayMs / 1000) * 0.5, 0) || 1;
    let cursor = tAvailStart;

    mappedSteps.forEach((st) => {
      const span = ((tAvailEnd - tAvailStart) * st.durationMul) / totalWeight;
      const pauseSpan = ((tAvailEnd - tAvailStart) * ((st.delayMs / 1000) * 0.5)) / totalWeight;
      if (st._rawTRange) {
        st.tRange = [
          Number(clamp(st._rawTRange[0], 0, 0.98).toFixed(4)),
          Number(clamp(st._rawTRange[1], 0.02, 1.0).toFixed(4))
        ];
      } else {
        const t0 = Number(cursor.toFixed(4));
        const t1 = Number(Math.min(tAvailEnd, cursor + Math.max(0.025, span)).toFixed(4));
        st.tRange = [t0, Math.max(Number((t0 + 0.02).toFixed(4)), t1)];
      }
      delete st._rawTRange;
      cursor += span + pauseSpan;
    });

    const title = opts.title || (replay && replay.title && replay.title !== 'Cả trang' ? replay.title : (is3D ? 'Hình không gian 3D MinNote' : 'Hình học phẳng MinNote'));
    const minXPad = Number((bMinX - 0.95).toFixed(2));
    const minYPad = Number((bMinY - 0.85).toFixed(2));
    const maxXPad = Number((bMaxX + 1.05).toFixed(2));
    const maxYPad = Number((bMaxY + 0.95).toFixed(2));
    const bbox = {
      x0: minXPad,
      y0: minYPad,
      x1: maxXPad,
      y1: maxYPad,
      minX: minXPad,
      minY: minYPad,
      maxX: maxXPad,
      maxY: maxYPad,
      width: Number((maxXPad - minXPad).toFixed(2)),
      height: Number((maxYPad - minYPad).toFixed(2))
    };

    const cameraKeyframes = Array.isArray(opts.cameraKeyframes)
      ? opts.cameraKeyframes
      : (replay && Array.isArray(replay.cameraKeyframes) ? replay.cameraKeyframes : []);

    return {
      title,
      is3D,
      isDemoFallback: !!src.isDemoFallback,
      ops,
      points: normPoints,
      shapes: normShapes,
      bbox,
      idMap,
      T,
      motion: {
        preset,
        fps,
        durationSec,
        holdEndSec,
        holdRatio,
        loop,
        handPen,
        followCamera,
        orbit3d,
        cameraKeyframes,
        steps: mappedSteps
      },
      rawGeo: geo
    };
  }

  // ============================================================================
  // 5. CONTINUOUS `\t` IN `[0,1]` ANIMATED TIKZ & BETATIKZ GENERATOR
  // ============================================================================
  function computeLabelAngles(points, shapes) {
    const ptMap = new Map(points.map((p) => [p.id, p]));
    const rays = new Map();
    const addRay = (u, v) => {
      const pu = ptMap.get(u), pv = ptMap.get(v);
      if (!pu || !pv || dist2(pu, pv) < 1e-6) return;
      if (!rays.has(u)) rays.set(u, []);
      if (!rays.has(v)) rays.set(v, []);
      rays.get(u).push(Math.atan2(pv.y - pu.y, pv.x - pu.x));
      rays.get(v).push(Math.atan2(pu.y - pv.y, pu.x - pv.x));
    };
    for (const sh of shapes) {
      if (sh.kind === 'segment' || sh.kind === 'line' || sh.kind === 'ray') {
        if (sh.pts.length >= 2) addRay(sh.pts[0], sh.pts[1]);
      } else if (sh.kind === 'polygon' && sh.pts.length >= 3) {
        for (let i = 0; i < sh.pts.length; i++) addRay(sh.pts[i], sh.pts[(i + 1) % sh.pts.length]);
      }
    }
    const out = new Map();
    for (const p of points) {
      const rList = (rays.get(p.id) || []).slice().sort((a, b) => a - b);
      if (!rList.length) { out.set(p.id, 90); continue; }
      let bestGap = -1, bestMid = Math.PI / 4;
      for (let i = 0; i < rList.length; i++) {
        const cur = rList[i];
        const nxt = i + 1 < rList.length ? rList[i + 1] : rList[0] + Math.PI * 2;
        if (nxt - cur > bestGap) {
          bestGap = nxt - cur;
          bestMid = (cur + nxt) * 0.5;
        }
      }
      let deg = Math.round(((bestMid * 180 / Math.PI) % 360 + 360) % 360 / 15) * 15;
      out.set(p.id, deg % 360);
    }
    return out;
  }

  function exportBetaTikzAnimated(opts = {}) {
    const model = opts._prebuiltModel || buildNormalizedBridgeModel(opts);
    if (!model) {
      return {
        outTikz: '',
        animateInlineTex: '',
        betatikzProject: null,
        cliCommand: '',
        stats: { points: 0, shapes: 0, steps: 0 }
      };
    }

    const { points, shapes, bbox, motion } = model;
    const ptById = new Map(points.map((p) => [p.id, p]));
    const shById = new Map(shapes.map((s) => [s.id, s]));
    const tidOf = (sym) => {
      const p = ptById.get(sym);
      return p ? p.tikzId : String(sym).replace(/[^A-Za-z0-9]/g, 'p');
    };
    const lblAngles = computeLabelAngles(points, shapes);

    const easeFnName = (ea) => {
      if (ea === 'linear') return '';
      if (ea === 'easeOut') return 'easeout';
      if (ea === 'spring') return 'smootherstep';
      return 'smoothstep';
    };

    const lines = [];
    lines.push('\\begin{tikzpicture}[');
    lines.push('  x=1cm, y=1cm, >=Stealth, every node/.style={font=\\normalsize},');
    lines.push('  declare function={');
    lines.push('    clp(\\x,\\a,\\b)=max(0,min(1,(\\x-\\a)/max(0.0001,\\b-\\a)));');
    lines.push('    clamp(\\x,\\a,\\b)=max(0,min(1,(\\x-\\a)/max(0.0001,\\b-\\a)));');
    lines.push('    smoothstep(\\x)=\\x*\\x*(3-2*\\x);');
    lines.push('    smootherstep(\\x)=\\x*\\x*\\x*(\\x*(6*\\x-15)+10);');
    lines.push('    ease(\\x)=\\x*\\x*(3-2*\\x);');
    lines.push('    easein(\\x)=\\x*\\x*\\x;');
    lines.push('    easeout(\\x)=1-(1-\\x)*(1-\\x)*(1-\\x);');
    lines.push('    thereback(\\x)=4*\\x*(1-\\x);');
    lines.push('    bump(\\x)=(sin(\\x*180))^2;');
    lines.push('    appear(\\x,\\a,\\b)=smoothstep(clp(\\x,\\a,\\b));');
    lines.push('    lerp(\\a,\\b,\\p)=\\a+(\\b-\\a)*\\p;');
    lines.push('  }');
    lines.push(']');
    lines.push('  \\tikzset{layer/.style={}}');
    lines.push('  \\providecommand{\\t}{1.0}');
    lines.push('  \\pgfmathsetmacro{\\tval}{\\t}');
    lines.push(`  \\path (${fmtNum(bbox.minX, 2)}, ${fmtNum(bbox.minY, 2)}) rectangle (${fmtNum(bbox.maxX, 2)}, ${fmtNum(bbox.maxY, 2)});`);

    // Layer 0: Camera Rig
    const cxs = Number(((bbox.minX + bbox.maxX) * 0.5).toFixed(2));
    const cys = Number(((bbox.minY + bbox.maxY) * 0.5).toFixed(2));
    const holdT0 = fmtNum(1.0 - motion.holdRatio, 3);

    if (Array.isArray(motion.cameraKeyframes) && motion.cameraKeyframes.length >= 2) {
      const k0 = motion.cameraKeyframes[0];
      const k1 = motion.cameraKeyframes[motion.cameraKeyframes.length - 1];
      const t0 = fmtNum(k0.t != null ? k0.t : 0, 3);
      const t1 = fmtNum(k1.t != null ? k1.t : 0.85, 3);
      lines.push(`  \\pgfmathsetmacro{\\camP}{smoothstep(clp(\\tval, ${t0}, ${t1}))}`);
      lines.push(`  \\pgfmathsetmacro{\\camX}{lerp(${fmtNum(k0.shiftX || 0, 2)}, ${fmtNum(k1.shiftX || 0, 2)}, \\camP)}`);
      lines.push(`  \\pgfmathsetmacro{\\camY}{lerp(${fmtNum(k0.shiftY || 0, 2)}, ${fmtNum(k1.shiftY || 0, 2)}, \\camP)}`);
      lines.push(`  \\pgfmathsetmacro{\\camScale}{lerp(${fmtNum(k0.scale || 1, 2)}, ${fmtNum(k1.scale || 1, 2)}, \\camP)}`);
      lines.push('  \\begin{scope}[layer=camera, shift={(\\camX cm, \\camY cm)}, scale=\\camScale, transform shape]');
    } else if (motion.orbit3d && model.is3D) {
      lines.push(`  \\pgfmathsetmacro{\\camOrb}{0.06 * bump(clp(\\tval, ${holdT0}, 0.99))}`);
      lines.push('  \\begin{scope}[layer=camera, xscale={1.0 - \\camOrb}, transform shape]');
    } else if (motion.followCamera && motion.steps.length >= 2) {
      lines.push(`  \\pgfmathsetmacro{\\camBreath}{1.0 + 0.035 * thereback(clp(\\tval, 0.05, ${holdT0}))}`);
      lines.push(`  \\begin{scope}[layer=camera, scale around={\\camBreath:(${fmtNum(cxs, 2)},${fmtNum(cys, 2)})}, transform shape]`);
    } else {
      lines.push('  \\begin{scope}[layer=camera, transform shape]');
    }

    // Topological coordinates (symbolic calc/intersection where exact, else 8-decimal normalized math coords)
    for (const p of points) {
      const tid = p.tikzId;
      const d = p.def;
      let expr = `(${fmtNum(p.x, 8)},${fmtNum(p.y, 8)})`;
      if (d.t === 'mid' && ptById.has(d.a) && ptById.has(d.b)) {
        expr = `($(${tidOf(d.a)})!0.5!(${tidOf(d.b)})$)`;
      } else if (d.t === 'on' && ptById.has(d.a) && ptById.has(d.b)) {
        const kEff = d.seg ? clamp(d.k != null ? d.k : 0.5, 0, 1) : (d.k != null ? d.k : 0.5);
        expr = `($(${tidOf(d.a)})!${fmtNum(kEff, 6)}!(${tidOf(d.b)})$)`;
      } else if (d.t === 'sum' && ptById.has(d.a) && ptById.has(d.b) && ptById.has(d.c)) {
        expr = `($(${tidOf(d.a)})+(${tidOf(d.b)})-(${tidOf(d.c)})$)`;
      } else if (d.t === 'foot' && ptById.has(d.p) && ptById.has(d.a) && ptById.has(d.b)) {
        const pa = ptById.get(d.a), pb = ptById.get(d.b);
        if (dist2(pa, pb) > 1e-4) expr = `($(${tidOf(d.a)})!(${tidOf(d.p)})!(${tidOf(d.b)})$)`;
      } else if (d.t === 'rot' && ptById.has(d.c) && ptById.has(d.p)) {
        const deg = -(d.ang || 0);
        const kVal = d.k != null ? d.k : 1;
        expr = `($(${tidOf(d.c)})!${fmtNum(kVal, 6)}!${fmtNum(deg, 6)}:(${tidOf(d.p)})$)`;
      } else if (d.t === 'vec' && d.distVal == null && ptById.has(d.o) && ptById.has(d.a) && ptById.has(d.b)) {
        const kVal = d.k != null ? d.k : 1;
        if (!d.perp) {
          if (Math.abs(kVal - 1) < 1e-5) {
            expr = `($(${tidOf(d.o)})+(${tidOf(d.b)})-(${tidOf(d.a)})$)`;
          } else {
            const ks = fmtNum(kVal, 6);
            expr = `($(${tidOf(d.o)})+${ks}*(${tidOf(d.b)})-${ks}*(${tidOf(d.a)})$)`;
          }
        } else if (d.o === d.a) {
          expr = `($(${tidOf(d.a)})!${fmtNum(kVal, 6)}!90:(${tidOf(d.b)})$)`;
        }
      } else if (d.t === 'inter' && !d.c1 && !d.c2 && Array.isArray(d.l1) && Array.isArray(d.l2)) {
        const p1 = ptById.get(d.l1[0]), p2 = ptById.get(d.l1[1]), p3 = ptById.get(d.l2[0]), p4 = ptById.get(d.l2[1]);
        if (p1 && p2 && p3 && p4) {
          const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
          if (Math.abs(det) > 1e-4) {
            expr = `(intersection of ${tidOf(d.l1[0])}--${tidOf(d.l1[1])} and ${tidOf(d.l2[0])}--${tidOf(d.l2[1])})`;
          }
        }
      }
      lines.push(`    \\coordinate (${tid}) at ${expr};`);
    }

    // Step timing macros
    const ptBirthStep = new Map(); // ptSym -> { pMacro, opMacro, fx, t0, t1 }
    const fillCmds = [];
    const geomCmds = [];
    const markCmds = [];
    const ptCmds = [];

    motion.steps.forEach((st, idx) => {
      const k = idx + 1;
      const [t0, t1] = st.tRange || [0.05, 0.85];
      const t0s = fmtNum(t0, 3);
      const t1s = fmtNum(t1, 3);
      const tVisEnd = fmtNum(Math.min(t1, t0 + Math.max(0.015, (t1 - t0) * 0.25)), 3);
      const fn = easeFnName(st.easing);
      const pExpr = fn ? `${fn}(clp(\\tval, ${t0s}, ${t1s}))` : `clp(\\tval, ${t0s}, ${t1s})`;
      const pVar = `\\pS${toAlphaSuffix(k)}`;
      const opVar = `\\opS${toAlphaSuffix(k)}`;

      lines.push(`    \\pgfmathsetmacro{${pVar}}{${pExpr}}`);
      if (st.tempHide) {
        const tMid = fmtNum(t0 + (t1 - t0) * 0.68, 3);
        lines.push(`    \\pgfmathsetmacro{${opVar}}{appear(\\tval, ${t0s}, ${tVisEnd}) * (1.0 - appear(\\tval, ${tMid}, ${t1s}))}`);
      } else {
        lines.push(`    \\pgfmathsetmacro{${opVar}}{appear(\\tval, ${t0s}, ${tVisEnd})}`);
      }

      const items = st.items && st.items.length ? st.items : [{ kind: st.kind, refId: st.refId, rev: st.rev }];
      const fx = st.effect || 'draw';

      items.forEach((it, subIdx) => {
        if (it.kind === 'point') {
          if (!ptBirthStep.has(it.refId)) {
            ptBirthStep.set(it.refId, { pVar, opVar, fx, t0, t1 });
          }
          return;
        }
        if (it.kind !== 'shape') return;
        const sh = shById.get(it.refId);
        if (!sh || !sh.pts.length) return;

        // Register birth of incident points if not yet registered
        for (const pid of sh.pts) {
          if (!ptBirthStep.has(pid)) {
            ptBirthStep.set(pid, { pVar, opVar, fx: fx === 'pulse' ? 'pulse' : 'pop', t0, t1 });
          }
        }

        const isRev = !!(it.rev || st.rev);
        const curTag = `cur_${toAlphaSuffix(k)}_${subIdx + 1}`;
        const strokeCol = sh.aux ? 'blue!75!black' : 'black';
        const baseW = sh.dashed ? '0.45pt' : (sh.aux ? '0.65pt' : '0.7pt');
        const dashOpt = sh.dashed ? 'dashed, ' : '';
        const arrowOpt = sh.arrow ? (isRev ? 'Stealth-, ' : '-Stealth, ') : '';

        if (st.mode === 'cue') {
          if (sh.pts.length >= 2) {
            const u = tidOf(sh.pts[0]), v = tidOf(sh.pts[1]);
            geomCmds.push(`      \\draw[yellow!45!orange, line width=3.0pt, opacity={0.62*bump(${pVar})}] (${u}) -- (${v});`);
          }
          return;
        }

        switch (sh.kind) {
          case 'segment':
          case 'line':
          case 'ray': {
            if (sh.pts.length < 2) break;
            // Compute geometric locus endpoints first so `ray` never reverses its infinite direction
            const rawA = tidOf(sh.pts[0]);
            const rawB = tidOf(sh.pts[1]);
            let geomStart = rawA;
            let geomEnd = rawB;
            if (sh.kind === 'line') {
              geomStart = `s_${curTag}`;
              geomEnd = `e_${curTag}`;
              geomCmds.push(`      \\coordinate (${geomStart}) at ($(${rawA})!-0.22!(${rawB})$);`);
              geomCmds.push(`      \\coordinate (${geomEnd}) at ($(${rawA})!1.22!(${rawB})$);`);
            } else if (sh.kind === 'ray') {
              geomEnd = `e_${curTag}`;
              geomCmds.push(`      \\coordinate (${geomEnd}) at ($(${rawA})!1.22!(${rawB})$);`);
            }
            const startRef = isRev ? geomEnd : geomStart;
            const endRef = isRev ? geomStart : geomEnd;
            const progExpr = `($(${startRef})!${pVar}!(${endRef})$)`;

            if (fx === 'fade') {
              geomCmds.push(`      \\draw[${dashOpt}${arrowOpt}${strokeCol}, line width=${baseW}, opacity={${pVar}}] (${startRef}) -- (${endRef});`);
            } else {
              if (fx === 'glow' || fx === 'pulse') {
                const glowCol = fx === 'pulse' ? 'orange!85!red' : 'cyan!75!blue';
                geomCmds.push(`      \\draw[${glowCol}, line width=3.2pt, opacity={0.55*bump(${pVar})}] (${startRef}) -- ${progExpr};`);
              }
              geomCmds.push(`      \\draw[${dashOpt}${arrowOpt}${strokeCol}, line width=${baseW}, opacity={${opVar}}] (${startRef}) -- ${progExpr};`);
              if (fx === 'chalk') {
                geomCmds.push(`      \\fill[${strokeCol}, opacity={0.75*bump(${pVar})}] ${progExpr} circle (1.2pt);`);
              }
            }
            const shapeLbl = formatShapeLabelTex(sh.name || sh.label);
            if (shapeLbl) {
              const pa = ptById.get(sh.pts[0]);
              const pb = ptById.get(sh.pts[1]);
              const deg = computeShapeLabelAngleDeg(pa, pb, sh.nameAt);
              if (sh.kind === 'segment') {
                markCmds.push(`      \\path[opacity={${pVar}}] ($(${rawA})!0.5!(${rawB})$) node[shift={(${deg}:9pt)}]{$${shapeLbl}$};`);
              } else if (sh.kind === 'line') {
                const lStart = `($(${rawA})!-0.22!(${rawB})$)`;
                const lEnd = `($(${rawA})!1.22!(${rawB})$)`;
                const anchorExpr = (pa && pb && (pa.x > pb.x + 1e-4 || (Math.abs(pa.x - pb.x) <= 1e-4 && pa.y > pb.y))) ? lStart : lEnd;
                markCmds.push(`      \\path[opacity={${pVar}}] ${anchorExpr} node[shift={(${deg}:8pt)}]{$${shapeLbl}$};`);
              } else {
                const rEnd = `($(${rawA})!1.22!(${rawB})$)`;
                markCmds.push(`      \\path[opacity={${pVar}}] ${rEnd} node[shift={(${deg}:8pt)}]{$${shapeLbl}$};`);
              }
            }
            break;
          }
          case 'circle': {
            if (sh.pts.length < 2) break;
            const oP = ptById.get(sh.pts[0]), rP = ptById.get(sh.pts[1]);
            if (!oP || !rP) break;
            const R = fmtNum(Math.max(0.05, dist2(oP, rP)), 5);
            const oTid = tidOf(sh.pts[0]);
            const sweep = isRev ? `-360*${pVar}` : `360*${pVar}`;
            if (fx === 'glow' || fx === 'pulse') {
              geomCmds.push(`      \\draw[cyan!70!blue, line width=3.2pt, opacity={0.55*bump(${pVar})}] ($(${oTid})+(0:${R})$) arc (0:{${sweep}}:${R});`);
            }
            geomCmds.push(`      \\draw[${dashOpt}${strokeCol}, line width=${baseW}, opacity={${opVar}}] ($(${oTid})+(0:${R})$) arc (0:{${sweep}}:${R});`);
            break;
          }
          case 'arc':
          case 'sector': {
            if (sh.pts.length < 3) break;
            const oP = ptById.get(sh.pts[0]), p1 = ptById.get(sh.pts[1]), p2 = ptById.get(sh.pts[2]);
            if (!oP || !p1 || !p2) break;
            const R = fmtNum(Math.max(0.05, dist2(oP, p1)), 5);
            const oTid = tidOf(sh.pts[0]);
            // Math +y UP angles: MinNote canvas sweeps from p1 CCW in math coords to p2
            const a1 = Math.atan2(p1.y - oP.y, p1.x - oP.x) * 180 / Math.PI;
            const a2 = Math.atan2(p2.y - oP.y, p2.x - oP.x) * 180 / Math.PI;
            let diff = ((a2 - a1) % 360 + 360) % 360;
            if (diff < 1e-3) diff = 360;
            const endDeg = a1 + diff;
            const a1s = fmtNum(a1, 4);
            const endS = fmtNum(endDeg, 4);
            const diffS = fmtNum(diff, 4);
            const startAng = isRev ? endS : a1s;
            const dynEnd = isRev ? `{${endS}-${diffS}*${pVar}}` : `{${a1s}+${diffS}*${pVar}}`;
            if (sh.kind === 'sector') {
              fillCmds.push(`      \\fill[cyan!22!gray, opacity={0.28*${pVar}}] (${oTid}) -- ($(${oTid})+(${startAng}:${R})$) arc (${startAng}:${dynEnd}:${R}) -- cycle;`);
              geomCmds.push(`      \\draw[${dashOpt}${strokeCol}, line width=${baseW}, opacity={${opVar}}] (${oTid}) -- ($(${oTid})+(${startAng}:${R})$) arc (${startAng}:${dynEnd}:${R}) -- cycle;`);
            } else {
              geomCmds.push(`      \\draw[${dashOpt}${strokeCol}, line width=${baseW}, opacity={${opVar}}] ($(${oTid})+(${startAng}:${R})$) arc (${startAng}:${dynEnd}:${R});`);
            }
            break;
          }
          case 'arc3': {
            if (sh.pts.length < 3) break;
            const p1 = ptById.get(sh.pts[0]), p2 = ptById.get(sh.pts[1]), p3 = ptById.get(sh.pts[2]);
            if (!p1 || !p2 || !p3) break;
            const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
            if (Math.abs(d) > 1e-5) {
              const s1 = p1.x * p1.x + p1.y * p1.y, s2 = p2.x * p2.x + p2.y * p2.y, s3 = p3.x * p3.x + p3.y * p3.y;
              const cx = (s1 * (p2.y - p3.y) + s2 * (p3.y - p1.y) + s3 * (p1.y - p2.y)) / d;
              const cy = (s1 * (p3.x - p2.x) + s2 * (p1.x - p3.x) + s3 * (p2.x - p1.x)) / d;
              const r = fmtNum(Math.hypot(p1.x - cx, p1.y - cy), 5);
              const a1 = Math.atan2(p1.y - cy, p1.x - cx) * 180 / Math.PI;
              const norm = (a) => ((a - a1) % 360 + 360) % 360;
              const a2n = norm(Math.atan2(p2.y - cy, p2.x - cx) * 180 / Math.PI);
              const a3n = norm(Math.atan2(p3.y - cy, p3.x - cx) * 180 / Math.PI);
              const span = a2n <= a3n ? a3n : (a3n - 360);
              const startA = isRev ? fmtNum(a1 + span, 4) : fmtNum(a1, 4);
              const endExpr = isRev ? `{${fmtNum(a1 + span, 4)}-(${fmtNum(span, 4)})*${pVar}}` : `{${fmtNum(a1, 4)}+(${fmtNum(span, 4)})*${pVar}}`;
              geomCmds.push(`      \\draw[${dashOpt}${strokeCol}, line width=${baseW}, opacity={${opVar}}] (${fmtNum(cx, 5)},${fmtNum(cy, 5)}) ++(${startA}:${r}) arc (${startA}:${endExpr}:${r});`);
            }
            break;
          }
          case 'polygon':
          case 'plane': {
            if (sh.pts.length < 3) break;
            const cyc = sh.pts.map(tidOf).map((t) => `(${t})`).join(' -- ') + ' -- cycle';
            if (sh.fill || sh.kind === 'plane' || sh.width === 0) {
              fillCmds.push(`      \\fill[cyan!22!gray, opacity={0.28*${pVar}}] ${cyc};`);
            }
            if (sh.width !== 0) {
              for (let eIdx = 0; eIdx < sh.pts.length; eIdx++) {
                const rawU = tidOf(sh.pts[eIdx]);
                const rawV = tidOf(sh.pts[(eIdx + 1) % sh.pts.length]);
                const u = isRev ? rawV : rawU;
                const v = isRev ? rawU : rawV;
                geomCmds.push(`      \\draw[${dashOpt}${strokeCol}, line width=${baseW}, opacity={${opVar}}] (${u}) -- ($(${u})!${pVar}!(${v})$);`);
              }
            }
            if (sh.kind === 'plane') {
              const pname = formatShapeLabelTex(sh.name || sh.label || 'P') || 'P';
              markCmds.push(`      \\path[opacity={${pVar}}] (${tidOf(sh.pts[0])}) node[shift={(45:14pt)}]{$(${pname})$};`);
            }
            break;
          }
          case 'right': {
            if (sh.pts.length < 3) break;
            const pa = ptById.get(sh.pts[0]), pv = ptById.get(sh.pts[1]), pb = ptById.get(sh.pts[2]);
            if (pa && pv && pb && dist2(pa, pv) > 1e-4 && dist2(pb, pv) > 1e-4) {
              const cross = (pa.x - pv.x) * (pb.y - pv.y) - (pa.y - pv.y) * (pb.x - pv.x);
              const leg1 = cross >= 0 ? tidOf(sh.pts[0]) : tidOf(sh.pts[2]);
              const leg2 = cross >= 0 ? tidOf(sh.pts[2]) : tidOf(sh.pts[0]);
              markCmds.push(`      \\path[opacity={${pVar}}] pic[draw, line width=0.55pt, angle radius=6pt]{right angle=${leg1}--${tidOf(sh.pts[1])}--${leg2}};`);
            }
            break;
          }
          case 'angle': {
            if (sh.pts.length < 3) break;
            const pa = ptById.get(sh.pts[0]), pv = ptById.get(sh.pts[1]), pb = ptById.get(sh.pts[2]);
            if (pa && pv && pb && dist2(pa, pv) > 1e-4 && dist2(pb, pv) > 1e-4) {
              // Order legs in Math +y UP so TikZ `angle` pic ALWAYS sweeps the interior angle <= 180 deg CCW!
              const cross = (pa.x - pv.x) * (pb.y - pv.y) - (pa.y - pv.y) * (pb.x - pv.x);
              const leg1 = cross >= 0 ? tidOf(sh.pts[0]) : tidOf(sh.pts[2]);
              const leg2 = cross >= 0 ? tidOf(sh.pts[2]) : tidOf(sh.pts[0]);
              markCmds.push(`      \\path[opacity={${pVar}}] pic[draw, line width=0.55pt, angle radius=8pt]{angle=${leg1}--${tidOf(sh.pts[1])}--${leg2}};`);
            }
            break;
          }
          case 'tick': {
            if (sh.pts.length < 2) break;
            const u = tidOf(sh.pts[0]), v = tidOf(sh.pts[1]);
            markCmds.push(`      \\draw[line width=0.55pt, opacity={${pVar}}] ($(${u})!0.5!(${v})!3pt!90:(${v})$) -- ($(${u})!0.5!(${v})!3pt!-90:(${v})$);`);
            break;
          }
          case 'cone': {
            if (sh.pts.length < 3) break;
            const oP = ptById.get(sh.pts[0]), rP = ptById.get(sh.pts[1]), sP = ptById.get(sh.pts[2]);
            if (!oP || !rP || !sP) break;
            const rNum = Math.max(0.05, dist2(oP, rP));
            const R = fmtNum(rNum, 5);
            const B = fmtNum(Math.max(0.02, rNum * 0.32), 5);
            const oTid = tidOf(sh.pts[0]);
            const sTid = tidOf(sh.pts[2]);
            geomCmds.push(`      \\coordinate (cL_${curTag}) at ($(${oTid})+(180:${R})$);`);
            geomCmds.push(`      \\coordinate (cR_${curTag}) at ($(${oTid})+(0:${R})$);`);
            geomCmds.push(`      \\draw[dashed, ${strokeCol}, line width=0.5pt, opacity={${opVar}}] (cL_${curTag}) arc (180:{180-180*${pVar}}:${R} and ${B});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (cL_${curTag}) arc (180:{180+180*${pVar}}:${R} and ${B});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (${sTid}) -- ($(${sTid})!${pVar}!(cL_${curTag})$);`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (${sTid}) -- ($(${sTid})!${pVar}!(cR_${curTag})$);`);
            break;
          }
          case 'cylinder': {
            if (sh.pts.length < 3) break;
            const oP = ptById.get(sh.pts[0]), rP = ptById.get(sh.pts[1]), tP = ptById.get(sh.pts[2]);
            if (!oP || !rP || !tP) break;
            const rNum = Math.max(0.05, dist2(oP, rP));
            const R = fmtNum(rNum, 5);
            const B = fmtNum(Math.max(0.02, rNum * 0.32), 5);
            const oTid = tidOf(sh.pts[0]);
            const tTid = tidOf(sh.pts[2]);
            geomCmds.push(`      \\coordinate (bL_${curTag}) at ($(${oTid})+(180:${R})$);`);
            geomCmds.push(`      \\coordinate (bR_${curTag}) at ($(${oTid})+(0:${R})$);`);
            geomCmds.push(`      \\coordinate (tL_${curTag}) at ($(${tTid})+(180:${R})$);`);
            geomCmds.push(`      \\coordinate (tR_${curTag}) at ($(${tTid})+(0:${R})$);`);
            geomCmds.push(`      \\draw[dashed, ${strokeCol}, line width=0.5pt, opacity={${opVar}}] (bL_${curTag}) arc (180:{180-180*${pVar}}:${R} and ${B});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (bL_${curTag}) arc (180:{180+180*${pVar}}:${R} and ${B});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (tR_${curTag}) arc (0:{360*${pVar}}:${R} and ${B});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (bL_${curTag}) -- ($(bL_${curTag})!${pVar}!(tL_${curTag})$);`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (bR_${curTag}) -- ($(bR_${curTag})!${pVar}!(tR_${curTag})$);`);
            break;
          }
          case 'sphere': {
            if (sh.pts.length < 2) break;
            const oP = ptById.get(sh.pts[0]), rP = ptById.get(sh.pts[1]);
            if (!oP || !rP) break;
            const rNum = Math.max(0.05, dist2(oP, rP));
            const R = fmtNum(rNum, 5);
            const B = fmtNum(Math.max(0.02, rNum * 0.32), 5);
            const oTid = tidOf(sh.pts[0]);
            fillCmds.push(`      \\shade[ball color=cyan!15, opacity={0.28*${pVar}}] (${oTid}) circle[radius=${R}];`);
            geomCmds.push(`      \\coordinate (spL_${curTag}) at ($(${oTid})+(180:${R})$);`);
            geomCmds.push(`      \\coordinate (spR_${curTag}) at ($(${oTid})+(0:${R})$);`);
            geomCmds.push(`      \\draw[dashed, ${strokeCol}, line width=0.5pt, opacity={${opVar}}] (spL_${curTag}) arc (180:{180-180*${pVar}}:${R} and ${B});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=0.7pt, opacity={${opVar}}] (spR_${curTag}) arc (0:{360*${pVar}}:${R});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (spL_${curTag}) arc (180:{180+180*${pVar}}:${R} and ${B});`);
            break;
          }
          case 'frustumCone': {
            if (sh.pts.length < 4) break;
            const o1P = ptById.get(sh.pts[0]), r1P = ptById.get(sh.pts[1]);
            const o2P = ptById.get(sh.pts[2]), r2P = ptById.get(sh.pts[3]);
            if (!o1P || !r1P || !o2P || !r2P) break;
            const r1Num = Math.max(0.05, dist2(o1P, r1P));
            const r2Num = Math.max(0.04, dist2(o2P, r2P));
            const R1 = fmtNum(r1Num, 5), B1 = fmtNum(Math.max(0.02, r1Num * 0.32), 5);
            const R2 = fmtNum(r2Num, 5), B2 = fmtNum(Math.max(0.015, r2Num * 0.32), 5);
            const o1Tid = tidOf(sh.pts[0]), o2Tid = tidOf(sh.pts[2]);
            geomCmds.push(`      \\coordinate (fbL_${curTag}) at ($(${o1Tid})+(180:${R1})$);`);
            geomCmds.push(`      \\coordinate (fbR_${curTag}) at ($(${o1Tid})+(0:${R1})$);`);
            geomCmds.push(`      \\coordinate (ftL_${curTag}) at ($(${o2Tid})+(180:${R2})$);`);
            geomCmds.push(`      \\coordinate (ftR_${curTag}) at ($(${o2Tid})+(0:${R2})$);`);
            geomCmds.push(`      \\draw[dashed, ${strokeCol}, line width=0.5pt, opacity={${opVar}}] (fbL_${curTag}) arc (180:{180-180*${pVar}}:${R1} and ${B1});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (fbL_${curTag}) arc (180:{180+180*${pVar}}:${R1} and ${B1});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (ftR_${curTag}) arc (0:{360*${pVar}}:${R2} and ${B2});`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (fbL_${curTag}) -- ($(fbL_${curTag})!${pVar}!(ftL_${curTag})$);`);
            geomCmds.push(`      \\draw[${strokeCol}, line width=${baseW}, opacity={${opVar}}] (fbR_${curTag}) -- ($(fbR_${curTag})!${pVar}!(ftR_${curTag})$);`);
            break;
          }
          default:
            break;
        }
      });
    });

    // Points & labels with pop / pulse / hold emphasis
    const holdBumpVar = '\\pHoldBump';
    lines.push(`    \\pgfmathsetmacro{${holdBumpVar}}{bump(clp(\\tval, ${holdT0}, 0.97))}`);

    for (const p of points) {
      if (!p.show) continue;
      const birth = ptBirthStep.get(p.id);
      const pVar = birth ? birth.pVar : '1.0';
      const opVar = birth ? birth.opVar : '1.0';
      const fx = birth ? birth.fx : 'pop';
      const deg = lblAngles.get(p.id) || 90;
      const tid = p.tikzId;
      const isInter = p.def && p.def.t === 'inter';
      const scMacro = `\\scPt${tid.replace(/[^A-Za-z0-9]/g, '')}`;

      if (fx === 'pulse' || isInter) {
        lines.push(`    \\pgfmathsetmacro{${scMacro}}{1.0 + 0.24 * bump(${pVar}) + 0.18 * ${holdBumpVar}}`);
        ptCmds.push(`      \\fill[orange!85!red, opacity={0.42 * bump(${pVar}) + 0.35 * ${holdBumpVar}}] (${tid}) circle (3.2pt);`);
      } else if (fx === 'pop' || fx === 'stamp') {
        lines.push(`    \\pgfmathsetmacro{${scMacro}}{1.0 + 0.32 * bump(${pVar})}`);
      } else {
        lines.push(`    \\pgfmathsetmacro{${scMacro}}{1.0}`);
      }

      if (!p.noDot) {
        ptCmds.push(`      \\fill[black, opacity={${opVar}}] (${tid}) circle ({1.05 * ${scMacro} pt});`);
      }
      if (p.label) {
        ptCmds.push(`      \\path[opacity={${opVar}}] (${tid}) node[shift={(${deg}:9.5pt)}, scale={${scMacro}}]{$${p.label}$};`);
      }
    }

    lines.push('    % Layer 1 & 2: Fills & Progressive Geometry');
    lines.push('    \\begin{scope}[layer=geometry]');
    lines.push(...fillCmds);
    lines.push(...geomCmds);
    lines.push('    \\end{scope}');
    lines.push('    % Layer 4: Marks, Points & Labels');
    lines.push('    \\begin{scope}[layer=annotations]');
    lines.push(...markCmds);
    lines.push(...ptCmds);
    lines.push('    \\end{scope}');
    lines.push('  \\end{scope}');
    lines.push('\\end{tikzpicture}');

    const outTikz = lines.join('\n');

    // Build Standalone LaTeX animateinline document
    const totalFrames = Math.min(360, Math.max(12, Math.round(motion.fps * motion.durationSec)));
    const denom = Math.max(1, totalFrames - 1);
    const loopOpt = motion.loop ? ',loop' : '';
    const indentedOutTikz = outTikz.split('\n').map((l) => '  ' + l).join('\n');
    const paperW = fmtNum(Math.max(8, bbox.width + 1.2), 2);
    const paperH = fmtNum(Math.max(6, bbox.height + 1.2), 2);

    const animateInlineTex = [
      '\\documentclass{article}',
      `\\usepackage[paperwidth=${paperW}cm,paperheight=${paperH}cm,margin=0.25cm]{geometry}`,
      '\\pagestyle{empty}',
      '\\usepackage[T5]{fontenc}',
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage{amsmath,amssymb}',
      '\\usepackage{tikz}',
      '\\usepackage{animate}',
      '\\usetikzlibrary{angles,quotes,calc,arrows.meta,patterns}',
      '\\begin{document}',
      `\\noindent\\begin{animateinline}[controls${loopOpt},poster=last]{${motion.fps}}`,
      `\\multiframe{${totalFrames}}{i=0+1}{%`,
      `  \\pgfmathsetmacro{\\t}{\\i / ${denom}.0}%`,
      indentedOutTikz + '%',
      '}',
      '\\end{animateinline}',
      '\\end{document}'
    ].join('\n');

    // Build exact BetaTikz `tikzvid-project/1` project JSON
    const nowSec = Date.now() / 1000;
    const storyboardLines = motion.steps.map((st, i) => {
      const [t0, t1] = st.tRange || [0, 1];
      return `Bước ${i + 1} [${fmtNum(t0, 2)}..${fmtNum(t1, 2)}] (${st.effect}, ${st.easing}): ${st.customTitle || st.refId || 'Dựng nét'}`;
    });

    const betatikzProject = {
      format: BETATIKZ_FORMAT,
      exported: nowSec,
      project: {
        id: 1,
        name: model.title,
        created: nowSec,
        updated: nowSec
      },
      state: {
        tikz: animateInlineTex,
        out_tikz: outTikz,
        prompt: opts.prompt || `Diễn hoạt từng nét hình học: ${model.title}`,
        storyboard: storyboardLines.join('\n'),
        edit_prompt: '',
        style: opts.style || 'classic',
        t: '1.00'
      },
      revisions: [
        {
          id: 2,
          field: 'out_tikz',
          source: 'minnote_motion_bridge',
          note: `MinNote Continuous t in [0,1] (${motion.steps.length} bước, ${motion.preset})`,
          created: nowSec,
          content: outTikz
        },
        {
          id: 1,
          field: 'tikz',
          source: 'minnote_motion_bridge',
          note: `Standalone animateinline (${motion.fps} FPS, ${motion.durationSec}s)`,
          created: nowSec,
          content: animateInlineTex
        }
      ],
      jobs: []
    };

    const safeSlug = String(model.title || 'minnote_geo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'minnote_geo';
    const cliCommand = `python tikz2vid.py --project "${safeSlug}.betatikz.json" --fps ${motion.fps} --duration ${motion.durationSec} --hold-end ${motion.holdEndSec}${motion.loop ? ' --loop' : ''}`;

    return {
      outTikz,
      animateInlineTex,
      betatikzProject,
      cliCommand,
      bbox,
      timeline: motion.steps,
      isDemoFallback: model.isDemoFallback,
      stats: {
        points: points.length,
        shapes: shapes.length,
        steps: motion.steps.length,
        fps: motion.fps,
        durationSec: motion.durationSec,
        holdEndSec: motion.holdEndSec,
        loop: motion.loop,
        preset: motion.preset
      }
    };
  }

  function toAlphaSuffix(num) {
    let n = Math.max(1, num | 0);
    let s = '';
    while (n > 0) {
      n--;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }

  // ============================================================================
  // 6. `exportMotionJson(opts = {})` — FULL, COMPACT_LLM, BETATIKZ_PROJECT
  // ============================================================================
  function compactOp(op) {
    const out = {};
    for (const [k, v] of Object.entries(op)) {
      if (v === undefined || v === null || v === false || v === '') continue;
      if (k === 'id' && op.op === 'segment') continue;
      if (k === 'label' && v === op.id) continue;
      out[k] = v;
    }
    if (op.op === 'segment' && op.dashed) out.dashed = true;
    return out;
  }

  function compactStep(st) {
    const out = {
      kind: st.kind,
      ...(st.refId ? { refId: st.refId } : {}),
      ...(st.items ? { items: st.items } : {}),
      ...(st.customTitle ? { customTitle: st.customTitle } : {}),
      effect: st.effect || 'draw'
    };
    if (st.easing && st.easing !== 'easeInOut') out.easing = st.easing;
    if (st.durationMul && Math.abs(st.durationMul - 1) > 0.05) out.durationMul = st.durationMul;
    if (st.delayMs > 0) out.delayMs = st.delayMs;
    if (st.rev) out.rev = true;
    if (st.tempHide) out.tempHide = true;
    if (st.showGuides === false) out.showGuides = false;
    return out;
  }

  function exportMotionJson(opts = {}) {
    const mode = opts.mode || 'full';
    const model = buildNormalizedBridgeModel(opts);
    if (!model) {
      return null;
    }

    if (mode === 'betatikz_project') {
      return exportBetaTikzAnimated(Object.assign({}, opts, { _prebuiltModel: model })).betatikzProject;
    }

    if (mode === 'compact_llm') {
      return {
        schema: SCHEMA_VERSION,
        meta: {
          title: model.title,
          is3D: model.is3D
        },
        ops: model.ops.map(compactOp),
        motion: {
          preset: model.motion.preset,
          loop: model.motion.loop,
          handPen: model.motion.handPen,
          followCamera: model.motion.followCamera,
          orbit3d: model.motion.orbit3d,
          steps: model.motion.steps.map(compactStep)
        }
      };
    }

    // Default: 'full' or 'canonical' (`mn-geo-motion/2.0`)
    const omitExports = opts.includeExports === false || mode === 'canonical';
    let exportsPayload = undefined;

    if (!omitExports) {
      const betaAnim = exportBetaTikzAnimated(Object.assign({}, opts, { _prebuiltModel: model }));
      const w = getWin();
      let tikzExporter = (w && w.MinNoteTikzExport) || null;
      if (!tikzExporter && typeof require === 'function') {
        try { tikzExporter = require('./minnote-tikz-exporter.js'); } catch (_) {}
      }
      let tikzStatic = '';
      if (tikzExporter && typeof tikzExporter.generateTikz === 'function') {
        try {
          tikzStatic = tikzExporter.generateTikz(model.rawGeo).code || '';
        } catch (_) {}
      }
      if (!tikzStatic) {
        // Exact static TikZ fallback preserving symbolic/5-decimal precision
        const sLines = ['\\begin{tikzpicture}[every node/.style={font=\\normalsize}]'];
        const ptMap = new Map(model.points.map((x) => [x.id, x]));
        for (const p of model.points) {
          const d = p.def || {};
          let cExpr = `(${fmtNum(p.x, 5)},${fmtNum(p.y, 5)})`;
          if (d.t === 'mid' && ptMap.has(d.a) && ptMap.has(d.b)) {
            cExpr = `($(${ptMap.get(d.a).tikzId})!0.5!(${ptMap.get(d.b).tikzId})$)`;
          } else if (d.t === 'inter' && !d.c1 && !d.c2 && Array.isArray(d.l1) && Array.isArray(d.l2) && [...d.l1, ...d.l2].every((k) => ptMap.has(k))) {
            cExpr = `(intersection of ${ptMap.get(d.l1[0]).tikzId}--${ptMap.get(d.l1[1]).tikzId} and ${ptMap.get(d.l2[0]).tikzId}--${ptMap.get(d.l2[1]).tikzId})`;
          }
          sLines.push(`\\coordinate (${p.tikzId}) at ${cExpr};`);
        }
        for (const sh of model.shapes) {
          if (sh.kind === 'segment' && sh.pts.length >= 2) {
            const u = ptMap.get(sh.pts[0]), v = ptMap.get(sh.pts[1]);
            if (u && v) sLines.push(`\\draw[${sh.dashed ? 'dashed, line width=0.4pt' : 'line width=0.6pt'}] (${u.tikzId}) -- (${v.tikzId});`);
          } else if (sh.kind === 'circle' && sh.pts.length >= 2) {
            const u = ptMap.get(sh.pts[0]), v = ptMap.get(sh.pts[1]);
            if (u && v) sLines.push(`\\draw[${sh.dashed ? 'dashed, line width=0.4pt' : 'line width=0.6pt'}] (${u.tikzId}) circle[radius=${fmtNum(dist2(u, v), 5)}];`);
          }
        }
        sLines.push('\\end{tikzpicture}');
        tikzStatic = sLines.join('\n');
      }
      exportsPayload = {
        tikzStatic,
        tikzBetaAnimated: betaAnim.outTikz,
        betatikzProject: betaAnim.betatikzProject
      };
    }

    const outObj = {
      schema: SCHEMA_VERSION,
      meta: {
        title: model.title,
        is3D: model.is3D,
        createdAt: new Date().toISOString(),
        generator: 'MinNote Motion Bridge v2.0',
        coordSystem: 'cartesian-y-up',
        defCoordSpace: 'board_y_down'
      },
      ops: model.ops,
      geometry: {
        coordSpace: 'math_y_up',
        defCoordSpace: 'board_y_down',
        points: model.points.map((p) => ({
          id: p.id,
          label: p.label,
          nx: p.nx,
          ny: p.ny,
          x: p.x,
          y: p.y,
          show: p.show,
          ...(p.noDot ? { noDot: true } : {}),
          def: p.def
        })),
        shapes: model.shapes.map((s) => {
          const copy = Object.assign({}, s);
          delete copy.origId;
          return copy;
        }),
        bbox: model.bbox
      },
      motion: {
        preset: model.motion.preset,
        fps: model.motion.fps,
        durationSec: model.motion.durationSec,
        holdEndSec: model.motion.holdEndSec,
        loop: model.motion.loop,
        handPen: model.motion.handPen,
        followCamera: model.motion.followCamera,
        orbit3d: model.motion.orbit3d,
        cameraKeyframes: model.motion.cameraKeyframes,
        steps: model.motion.steps
      }
    };
    if (exportsPayload) {
      outObj.exports = exportsPayload;
    }
    return outObj;
  }

  // ============================================================================
  // 7. `importMotionJson(input, opts = {})` — 3-FORMAT BIDIRECTIONAL IMPORTER
  // ============================================================================
  function parseBetaTikzTimelineAndCleanTikz(rawTikz) {
    let src = String(rawTikz || '').trim();
    // If wrapped in \multiframe{N}{...}{ ... }, unwrap inner tikzpicture
    const tikzMatch = src.match(/\\begin\{tikzpicture\}[\s\S]*\\end\{tikzpicture\}/);
    if (tikzMatch) src = tikzMatch[0];

    // 1. Parse \pgfmathsetmacro{\var}{expr} for [t0, t1] intervals & effects
    const macroTimings = new Map(); // varName (without \) -> { t0, t1, effect, easing }
    const macroRe = /\\pgfmathsetmacro\{\\([A-Za-z0-9_]+)\}\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let m;
    while ((m = macroRe.exec(src)) !== null) {
      const name = m[1];
      const expr = m[2];
      const clpM = expr.match(/(?:clp|clamp|appear)\s*\(\s*\\tval\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
      if (clpM) {
        const t0 = parseFloat(clpM[1]);
        const t1 = parseFloat(clpM[2]);
        let effect = expr.includes('appear(') ? 'fade' : 'draw';
        let easing = 'easeInOut';
        if (expr.includes('bump(')) { effect = 'pulse'; easing = 'spring'; }
        else if (expr.includes('easeout(')) { easing = 'easeOut'; }
        else if (expr.includes('smootherstep(')) { easing = 'easeInOut'; }
        else if (!expr.includes('smoothstep(') && !expr.includes('appear(') && !expr.includes('ease(')) {
          easing = 'linear';
        }
        macroTimings.set(name, { t0, t1, effect, easing });
      }
    }

    // Detect glow / chalk / pop enhancements bound to step macros
    const glowVars = new Set();
    const chalkVars = new Set();
    const popPtMap = new Map(); // tikzPtId -> effect

    const lineArr = src.split('\n');
    const cursorMap = new Map(); // curTag -> { from, to, varName }
    const edgeTimingList = []; // { from, to, varName, rev, kind }

    // First pass: capture progressive cursor coordinates `\coordinate (cur_...) at ($(A)!\pVar!(B)$);`
    const curCoordRe = /^\\coordinate\s*\(\s*([^)]+)\s*\)\s*at\s*\(\$\(\s*([^)]+)\s*\)!\\([A-Za-z0-9_]+)!\(\s*([^)]+)\s*\)\$\)\s*;/;
    const curExprCoordRe = /^\\coordinate\s*\(\s*([^)]+)\s*\)\s*at\s*\(\$(\(\$\([^)]+\)![^!]+!\([^)]+\)\$\)|\(\s*[^)]+\s*\))!\\([A-Za-z0-9_]+)!(\(\$\([^)]+\)![^!]+!\([^)]+\)\$\)|\(\s*[^)]+\s*\))\$\)\s*;/;

    for (const rawLine of lineArr) {
      const ln = rawLine.trim();
      const cm1 = ln.match(curCoordRe);
      if (cm1) {
        cursorMap.set(cm1[1].trim(), { from: cm1[2].trim(), to: cm1[4].trim(), varName: cm1[3].trim(), toExpr: `(${cm1[4].trim()})` });
        continue;
      }
      const cm2 = ln.match(curExprCoordRe);
      if (cm2) {
        const extrId = (ex) => {
          const mm = ex.match(/\(\s*([A-Za-z0-9_']+)\s*\)/);
          return mm ? mm[1] : ex;
        };
        cursorMap.set(cm2[1].trim(), { from: extrId(cm2[2]), to: extrId(cm2[4]), varName: cm2[3].trim(), toExpr: cm2[4].trim() });
      }
      const glowM = ln.match(/bump\(\\([A-Za-z0-9_]+)\)/);
      if (glowM) {
        if (/line\s+width\s*=\s*[2-9]/.test(ln)) glowVars.add(glowM[1]);
        else if (/\\fill/.test(ln) && /circle\s*\(\s*1\.[0-5]pt/.test(ln)) chalkVars.add(glowM[1]);
      }
      const ptBumpM = ln.match(/\\pgfmathsetmacro\{\\scPt([A-Za-z0-9_]+)\}\{([^}]+)\}/);
      if (ptBumpM && ptBumpM[2].includes('bump(')) {
        popPtMap.set(ptBumpM[1], ptBumpM[2].includes('0.18') || ptBumpM[2].includes('HoldBump') ? 'pulse' : 'pop');
      }
    }

    // Second pass: clean TikZ lines for static geometric parser `K.uC` while recording shape -> macro timing!
    // First remove multi-line `\tikzset{...}` blocks and animation `declare function={...}` definitions cleanly
    const stripBalancedBlocks = (text, headRe) => {
      let out = '';
      let i = 0;
      while (i < text.length) {
        const rest = text.slice(i);
        const hm = headRe.exec(rest);
        if (!hm || hm.index !== 0) {
          out += text[i++];
          continue;
        }
        let j = i + hm[0].length - 1; // points to '{'
        let depth = 0;
        while (j < text.length) {
          if (text[j] === '\\' && j + 1 < text.length) { j += 2; continue; }
          if (text[j] === '{') depth++;
          else if (text[j] === '}') {
            depth--;
            if (depth === 0) { j++; break; }
          }
          j++;
        }
        i = j;
      }
      return out;
    };
    const preCleanedSrc = stripBalancedBlocks(
      stripBalancedBlocks(src, /^\\tikzset\s*\{/),
      /^declare\s+function\s*=\s*\{/
    );

    const cleanedLines = [];
    for (const rawLine of preCleanedSrc.split('\n')) {
      const ln = rawLine.trim();
      if (!ln) continue;
      if (/^\\providecommand\{\\t\}/.test(ln)) continue;
      if (/^\\pgfmathsetmacro/.test(ln)) continue;
      if (/^\\ifdim\b/.test(ln) || /^\\fi\b/.test(ln) || /^\\else\b/.test(ln)) continue;
      if (/^%\s*!TIKZVID/.test(ln)) continue;
      if (/^\\path\s*\([^)]+\)\s*rectangle\s*\([^)]+\)\s*;$/.test(ln)) continue;
      if (/^\\(?:begin|end)\{scope\}/.test(ln)) continue;
      if (curCoordRe.test(ln) || curExprCoordRe.test(ln)) continue;
      // Skip temporary bump glow halos & chalk dust dots & dynamic macro-opacity halos
      if (/opacity\s*=\s*\{[^}]*bump\(/.test(ln)) continue;
      if (/line\s+width\s*=\s*3\.[0-9]pt/.test(ln) && /opacity\s*=/.test(ln)) continue;

      let outLn = rawLine;
      // Rewrite inline progressive calc `($(A)!\pVar!(B)$)` -> `(B)` (only when factor is a \macro, NOT a number like 0.5!)
      outLn = outLn.replace(/\(\$\(\s*([A-Za-z0-9_']+)\s*\)!\\([A-Za-z0-9_]+)!\(\s*([A-Za-z0-9_']+)\s*\)\$\)/g, (full, fromId, vName, toId) => {
        edgeTimingList.push({ from: fromId.trim(), to: toId.trim(), varName: vName.trim() });
        return `(${toId.trim()})`;
      });

      // Rewrite `(A) -- (cur_X)` -> `(A) -- (B)`
      outLn = outLn.replace(/\(\s*([A-Za-z0-9_]+)\s*\)/g, (full, id) => {
        const hit = cursorMap.get(id);
        if (!hit) return full;
        edgeTimingList.push({ from: hit.from, to: hit.to, varName: hit.varName });
        return hit.toExpr;
      });

      // Rewrite progressive circle sweep `arc (0:{360*\pVar}:R)` -> `circle[radius=R]` when preceded by `($(O)+(0:R)$)`
      const cirSweepM = outLn.match(/^(\s*\\draw\[[^\]]*\])\s*\(\$\(\s*([^)]+)\s*\)\+\(0:([^)]+)\)\$\)\s*arc\s*\(0:\{[^}]*\\([A-Za-z0-9_]+)[^}]*\}:([^)]+)\)\s*;/);
      if (cirSweepM) {
        const [, drawHead, oId, rExpr, varName] = cirSweepM;
        edgeTimingList.push({ from: oId.trim(), to: '', varName: varName.trim(), kind: 'circle' });
        outLn = `${drawHead} (${oId.trim()}) circle[radius=${rExpr.trim()}];`;
      }

      // Record `\fill[...opacity={...\pVar}] (A) -- (M) -- (N) -- cycle;`
      const fillM = outLn.match(/\\fill\[[^\]]*\\([A-Za-z0-9_]+)[^\]]*\]([\s\S]*?)-- cycle;/);
      if (fillM) {
        const polyPts = [...fillM[2].matchAll(/\(\s*([A-Za-z0-9_']+)\s*\)/g)].map((x) => x[1]);
        if (polyPts.length >= 3) {
          edgeTimingList.push({ pts: polyPts, varName: fillM[1], kind: 'polygon' });
        }
      }

      // Clean dynamic opacity/scale macros in options so K.uC parses pure styles
      outLn = outLn
        .replace(/,\s*opacity\s*=\s*\{[^}]*\}/g, '')
        .replace(/opacity\s*=\s*\{[^}]*\}\s*,?\s*/g, '')
        .replace(/,\s*scale\s*=\s*\{[^}]*\}/g, '')
        .replace(/\{[0-9.]+\s*(?:pt\s*\+\s*[0-9.]+pt\s*\*\s*|\*\s*)\\[A-Za-z0-9_]+(?:\s*pt)?\}/g, '1.2pt');

      cleanedLines.push(outLn);
    }

    // Refine macro effects with detected glow / chalk
    for (const [vName, info] of macroTimings.entries()) {
      if (glowVars.has(vName)) info.effect = 'glow';
      else if (chalkVars.has(vName)) info.effect = 'chalk';
    }

    return {
      cleanedTikz: cleanedLines.join('\n'),
      macroTimings,
      edgeTimingList,
      popPtMap
    };
  }

  function parseSimpleTikzFallback(tikzCode) {
    // Pure JS fallback TikZ parser for Node.js environments when browser `K.uC` is absent
    const pts = [];
    const ptByName = new Map();
    const shapes = [];
    let idSeq = 1;
    const nextId = (prefix) => `${prefix}_${idSeq++}`;

    const coordRe = /\\coordinate\s*\(\s*([^)]+)\s*\)\s*at\s*(.+?);/g;
    let m;
    while ((m = coordRe.exec(tikzCode)) !== null) {
      const name = m[1].trim();
      const expr = m[2].trim();
      let def = { t: 'free', x: 0, y: 0 };
      const numM = expr.match(/^\(\s*([+-]?[0-9.]+)\s*,\s*([+-]?[0-9.]+)\s*\)$/);
      const lerpM = expr.match(/^\(\$\(\s*([^)]+)\s*\)!([+-]?[0-9.]+)!\(\s*([^)]+)\s*\)\$\)$/);
      const rotM = expr.match(/^\(\$\(\s*([^)]+)\s*\)!([+-]?[0-9.]+)!([+-]?[0-9.]+):\(\s*([^)]+)\s*\)\$\)$/);
      const sumM = expr.match(/^\(\$\(\s*([^)]+)\s*\)\+\(\s*([^)]+)\s*\)-\(\s*([^)]+)\s*\)\$\)$/);
      const interM = expr.match(/^\(intersection of\s+([A-Za-z0-9_']+)--([A-Za-z0-9_']+)\s+and\s+([A-Za-z0-9_']+)--([A-Za-z0-9_']+)\)$/);
      const footM = expr.match(/^\(\$\(\s*([^)]+)\s*\)!\(\s*([^)]+)\s*\)!\(\s*([^)]+)\s*\)\$\)$/);

      const linVecM = expr.match(/^\(\$\(\s*([^)]+)\s*\)\+([+-]?[0-9.]+)\*\(\s*([^)]+)\s*\)-([+-]?[0-9.]+)\*\(\s*([^)]+)\s*\)\$\)$/);
      if (numM) {
        def = { t: 'free', x: parseFloat(numM[1]), y: -parseFloat(numM[2]) };
      } else if (rotM && ptByName.has(rotM[1]) && ptByName.has(rotM[4])) {
        def = { t: 'rot', c: ptByName.get(rotM[1]).id, p: ptByName.get(rotM[4]).id, k: parseFloat(rotM[2]), ang: -parseFloat(rotM[3]) };
      } else if (linVecM && ptByName.has(linVecM[1]) && ptByName.has(linVecM[3]) && ptByName.has(linVecM[5])) {
        def = { t: 'vec', o: ptByName.get(linVecM[1]).id, a: ptByName.get(linVecM[5]).id, b: ptByName.get(linVecM[3]).id, k: parseFloat(linVecM[2]), perp: false };
      } else if (lerpM && ptByName.has(lerpM[1]) && ptByName.has(lerpM[3])) {
        const k = parseFloat(lerpM[2]);
        def = Math.abs(k - 0.5) < 1e-4
          ? { t: 'mid', a: ptByName.get(lerpM[1]).id, b: ptByName.get(lerpM[3]).id }
          : { t: 'on', a: ptByName.get(lerpM[1]).id, b: ptByName.get(lerpM[3]).id, k, seg: k >= 0 && k <= 1 };
      } else if (sumM && ptByName.has(sumM[1]) && ptByName.has(sumM[2]) && ptByName.has(sumM[3])) {
        def = { t: 'sum', a: ptByName.get(sumM[1]).id, b: ptByName.get(sumM[2]).id, c: ptByName.get(sumM[3]).id };
      } else if (interM && [interM[1], interM[2], interM[3], interM[4]].every((k) => ptByName.has(k))) {
        def = { t: 'inter', l1: [ptByName.get(interM[1]).id, ptByName.get(interM[2]).id], c1: false, l2: [ptByName.get(interM[3]).id, ptByName.get(interM[4]).id], c2: false, which: 0 };
      } else if (footM && [footM[1], footM[2], footM[3]].every((k) => ptByName.has(k))) {
        def = { t: 'foot', a: ptByName.get(footM[1]).id, p: ptByName.get(footM[2]).id, b: ptByName.get(footM[3]).id };
      }

      const pt = { id: nextId('pt'), label: name, show: true, def };
      pts.push(pt);
      ptByName.set(name, pt);
    }

    const curCoords = evalGeoMap({ points: pts, shapes: [] });

    // Parse `\draw[...] (A) -- (B);`, `\draw[...] (O) circle[radius=R];`, `\fill[...] ... -- cycle;`, and `pic{right angle=...}`
    for (const rawLn of tikzCode.split('\n')) {
      const ln = rawLn.trim();
      const cirM = ln.match(/^\\draw(\[[^\]]*\])?\s*\(\s*([A-Za-z0-9_']+)\s*\)\s*circle\s*(?:\[\s*radius\s*=\s*([0-9.]+)(?:cm)?\s*\]|\(\s*([0-9.]+)(?:cm)?\s*\))\s*;/);
      if (cirM && ptByName.has(cirM[2])) {
        const optsStr = cirM[1] || '';
        const oPt = ptByName.get(cirM[2]);
        const rVal = parseFloat(cirM[3] || cirM[4]);
        const oC = curCoords.get(oPt.id) || { x: 0, y: 0 };
        let rimPt = pts.find((p) => p.id !== oPt.id && curCoords.get(p.id) && Math.abs(dist2(oC, curCoords.get(p.id)) - rVal) < 1e-3);
        if (!rimPt) {
          rimPt = { id: nextId('pt'), label: '', show: false, noDot: true, noName: true, def: { t: 'free', x: oC.x + rVal, y: oC.y } };
          pts.push(rimPt);
          curCoords.set(rimPt.id, { x: oC.x + rVal, y: oC.y });
        }
        shapes.push({ id: nextId('sh'), kind: 'circle', pts: [oPt.id, rimPt.id], dashed: /dashed/.test(optsStr) });
        continue;
      }
      const rtPicM = ln.match(/pic(?:\[[^\]]*\])?\{(right\s+angle|angle)\s*=\s*([A-Za-z0-9_']+)--([A-Za-z0-9_']+)--([A-Za-z0-9_']+)\}/);
      if (rtPicM && ptByName.has(rtPicM[2]) && ptByName.has(rtPicM[3]) && ptByName.has(rtPicM[4])) {
        shapes.push({
          id: nextId('sh'),
          kind: /right/.test(rtPicM[1]) ? 'right' : 'angle',
          pts: [ptByName.get(rtPicM[2]).id, ptByName.get(rtPicM[3]).id, ptByName.get(rtPicM[4]).id],
          aux: true
        });
        continue;
      }
      const fillPolyM = ln.match(/^\\fill(\[[^\]]*\])?\s*(.+?)--\s*cycle\s*;/);
      if (fillPolyM) {
        const names = [...fillPolyM[2].matchAll(/\(\s*([A-Za-z0-9_']+)\s*\)/g)].map((x) => x[1]).filter((n) => ptByName.has(n));
        if (names.length >= 3) {
          shapes.push({
            id: nextId('sh'),
            kind: 'polygon',
            pts: names.map((n) => ptByName.get(n).id),
            width: 0,
            fill: 'rgba(14, 165, 233, 0.14)'
          });
        }
        continue;
      }
      const drawHeadM = ln.match(/^\\draw(\[[^\]]*\])?\s*(.+);$/);
      if (drawHeadM) {
        const optsStr = drawHeadM[1] || '';
        const body = drawHeadM[2];
        const chains = body.split(/(?<=\))\s+(?=\()/);
        for (const ch of chains) {
          const isCycle = /--\s*cycle\b/.test(ch);
          const names = [...ch.matchAll(/\(\s*([A-Za-z0-9_']+)\s*\)/g)].map((x) => x[1]).filter((n) => ptByName.has(n));
          for (let i = 0; i + 1 < names.length; i++) {
            shapes.push({
              id: nextId('sh'),
              kind: 'segment',
              pts: [ptByName.get(names[i]).id, ptByName.get(names[i + 1]).id],
              dashed: /dashed/.test(optsStr)
            });
          }
          if (isCycle && names.length >= 3) {
            shapes.push({
              id: nextId('sh'),
              kind: 'segment',
              pts: [ptByName.get(names[names.length - 1]).id, ptByName.get(names[0]).id],
              dashed: /dashed/.test(optsStr)
            });
          }
        }
      }
    }

    return { points: pts, shapes };
  }

  function compileOpsStandaloneFallback(plan) {
    const ops = Array.isArray(plan && plan.ops) ? plan.ops : [];
    const pts = [];
    const shapes = [];
    const symToPt = new Map();
    const opIdMap = new Map();
    let seq = 1;
    const mkId = (p) => `${p}_${seq++}`;

    const regPt = (sym, def, label, show = true, extra = {}) => {
      const pt = {
        id: mkId('pt'),
        label: show ? String(label != null ? label : (sym || '')) : '',
        show: show !== false,
        ...(extra.noDot ? { noDot: true } : {}),
        def
      };
      pts.push(pt);
      if (sym) symToPt.set(String(sym).trim(), pt);
      return pt;
    };
    const getP = (s) => (s ? symToPt.get(String(s).trim()) : null);

    for (const op of ops) {
      if (!op || !op.op) continue;
      switch (op.op) {
        case 'point_free': {
          const pt = regPt(op.id || op.label, { t: 'free', x: safeEvalMathNumber(op.x ?? 0) || 0, y: -(safeEvalMathNumber(op.y ?? 0) || 0) }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
          if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          break;
        }
        case 'point_sum': {
          const a = getP(op.a), b = getP(op.b), c = getP(op.c);
          if (a && b && c) {
            const pt = regPt(op.id || op.label, { t: 'sum', a: a.id, b: b.id, c: c.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'midpoint': {
          const a = getP(op.a), b = getP(op.b);
          if (a && b) {
            const pt = regPt(op.id || op.label, { t: 'mid', a: a.id, b: b.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'point_on_segment':
        case 'point_on_line': {
          const a = getP(op.a), b = getP(op.b);
          if (a && b) {
            const k = safeEvalMathNumber(op.ratio ?? op.k ?? 0.4);
            const pt = regPt(op.id || op.label, { t: 'on', a: a.id, b: b.id, k: Number.isFinite(k) ? k : 0.4, seg: op.op === 'point_on_segment' }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'intersection_ll': {
          const l1 = op.l1 || [], l2 = op.l2 || [];
          const a1 = getP(l1[0]), a2 = getP(l1[1]), b1 = getP(l2[0]), b2 = getP(l2[1]);
          if (a1 && a2 && b1 && b2) {
            const pt = regPt(op.id || op.label, { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [b1.id, b2.id], c2: false, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'intersection_lc': {
          const ln = op.line || op.l1 || [], cir = op.circle || op.l2 || [];
          const a1 = getP(ln[0]), a2 = getP(ln[1]), o = getP(cir[0]), r = getP(cir[1]);
          if (a1 && a2 && o && r) {
            const pt = regPt(op.id || op.label, { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [o.id, r.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'intersection_cc': {
          const c1 = op.c1 || op.circle1 || op.l1 || [];
          const c2 = op.c2 || op.circle2 || op.l2 || [];
          const o1 = getP(c1[0]), r1 = getP(c1[1]), o2 = getP(c2[0]), r2 = getP(c2[1]);
          if (o1 && r1 && o2 && r2) {
            const pt = regPt(op.id || op.label, { t: 'inter', l1: [o1.id, r1.id], c1: true, l2: [o2.id, r2.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'tangent_point': {
          const ext = getP(op.p || op.from || op.a), o = getP(op.center || op.o), r = getP(op.rim || op.r);
          if (ext && o && r) {
            const midKey = `__thales_${ext.id}_${o.id}`;
            const midPt = symToPt.get(midKey) || regPt(midKey, { t: 'mid', a: o.id, b: ext.id }, '', false, { noDot: true });
            const pt = regPt(op.id || op.label, { t: 'inter', l1: [midPt.id, o.id], c1: true, l2: [o.id, r.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'foot_perp': {
          const p = getP(op.p), a = getP(op.a), b = getP(op.b);
          if (p && a && b) {
            const pt = regPt(op.id || op.label, { t: 'foot', p: p.id, a: a.id, b: b.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
            if (op.drawDropSegment !== false) shapes.push({ id: mkId('sh'), kind: 'segment', pts: [p.id, pt.id], dashed: !!op.dashed, aux: true });
          }
          break;
        }
        case 'point_on_circle': {
          const o = getP(op.center || op.o), r = getP(op.rim || op.r);
          if (o && r) {
            const deg = safeEvalMathNumber(op.angleDeg ?? 60) || 60;
            const norm = (((-deg / 360) % 1) + 1) % 1;
            const pt = regPt(op.id || op.label, { t: 'path', kind: 'circle', pts: [o.id, r.id], k: norm }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'line_parallel':
        case 'line_perp': {
          const o = getP(op.through || op.o), a = getP(op.a), b = getP(op.b);
          if (o && a && b) {
            const distRaw = op.distVal != null ? safeEvalMathNumber(op.distVal) : NaN;
            const pt = regPt(
              op.id || op.label,
              {
                t: 'vec',
                o: o.id,
                a: a.id,
                b: b.id,
                k: safeEvalMathNumber(op.k ?? 1) || 1,
                perp: op.op === 'line_perp',
                ...(Number.isFinite(distRaw) ? { distVal: distRaw } : {})
              },
              op.label ?? op.id,
              op.show !== false,
              { noDot: op.noDot }
            );
            if (op.drawSegment !== false) {
              const rawName = op.name != null ? String(op.name).trim() : '';
              const validNameAt = op.nameAt && Number.isFinite(Number(op.nameAt.x)) && Number.isFinite(Number(op.nameAt.y))
                ? { x: Number(op.nameAt.x), y: Number(op.nameAt.y) }
                : null;
              const sh = {
                id: mkId('sh'),
                kind: op.asLine ? 'line' : 'segment',
                pts: [o.id, pt.id],
                dashed: !!op.dashed,
                ...(rawName ? { name: rawName } : {}),
                ...(validNameAt ? { nameAt: validNameAt } : {}),
                aux: true
              };
              shapes.push(sh);
              if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
            } else if (op.id) {
              opIdMap.set(op.id, { kind: 'point', id: pt.id });
            }
          }
          break;
        }
        case 'rotate':
        case 'point_rot':
        case 'rotation':
        case 'rot': {
          const c = getP(op.center || op.c || op.o), p = getP(op.point || op.p || op.from);
          if (c && p) {
            const deg = safeEvalMathNumber(op.angleDeg ?? op.ang ?? 60);
            const kVal = op.k != null ? safeEvalMathNumber(op.k) : 1;
            const pt = regPt(
              op.id || op.label,
              { t: 'rot', c: c.id, p: p.id, ang: -(Number.isFinite(deg) ? deg : 60), k: Number.isFinite(kVal) ? kVal : 1 },
              op.label ?? op.id,
              op.show !== false,
              { noDot: op.noDot }
            );
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'angle_bisector':
        case 'bisector':
        case 'bis': {
          const trip = typeof op.pts === 'string' ? op.pts.split('-').map((s) => s.trim()) : (Array.isArray(op.pts) ? op.pts : null);
          const a = getP(op.a ?? (trip && trip[0]));
          const o = getP(op.o ?? op.v ?? op.vertex ?? (trip && trip[1]));
          const b = getP(op.b ?? (trip && trip[2]));
          if (a && o && b) {
            const onOpp = !!(op.onOpposite || op.intersectOpposite);
            let pt;
            if (onOpp) {
              const helper = regPt(`__bis_${o.id}_${seq}`, { t: 'bis', a: a.id, o: o.id, b: b.id }, '', false, { noDot: true });
              pt = regPt(op.id || op.label, { t: 'inter', l1: [o.id, helper.id], c1: false, l2: [a.id, b.id], c2: false, which: 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            } else {
              pt = regPt(op.id || op.label, { t: 'bis', a: a.id, o: o.id, b: b.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            }
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
            if (op.drawRay || op.asRay) {
              shapes.push({ id: mkId('sh'), kind: 'ray', pts: [o.id, pt.id], dashed: !!op.dashed, aux: op.aux !== false });
            } else if (op.drawSegment || (onOpp && op.drawSegment !== false)) {
              shapes.push({ id: mkId('sh'), kind: 'segment', pts: [o.id, pt.id], dashed: !!op.dashed, aux: op.aux !== false });
            }
          }
          break;
        }
        case 'common_tangent':
        case 'ctan': {
          const c1 = typeof op.c1 === 'string' ? op.c1.split('-').map((s) => s.trim()) : (op.c1 || []);
          const c2 = typeof op.c2 === 'string' ? op.c2.split('-').map((s) => s.trim()) : (op.c2 || []);
          const o1 = getP(c1[0]), r1 = getP(c1[1]), o2 = getP(c2[0]), r2 = getP(c2[1]);
          if (o1 && r1 && o2 && r2) {
            const pt = regPt(
              op.id || op.label,
              { t: 'ctan', c1: [o1.id, r1.id], c2: [o2.id, r2.id], inner: !!op.inner, which: !(Number(op.which) || 0), on: op.on === 2 ? 2 : 1 },
              op.label ?? op.id,
              op.show !== false,
              { noDot: op.noDot }
            );
            if (op.id) opIdMap.set(op.id, { kind: 'point', id: pt.id });
          }
          break;
        }
        case 'segment':
        case 'line':
        case 'ray': {
          let aSym = op.a, bSym = op.b;
          if ((!aSym || !bSym) && typeof op.s === 'string' && op.s.includes('-')) {
            const pr = op.s.split('-').map((x) => x.trim());
            aSym = aSym || pr[0];
            bSym = bSym || pr[1];
          }
          const a = getP(aSym), b = getP(bSym);
          if (a && b) {
            const rawName = op.name != null ? String(op.name).trim() : (op.label != null ? String(op.label).trim() : '');
            const validNameAt = op.nameAt && Number.isFinite(Number(op.nameAt.x)) && Number.isFinite(Number(op.nameAt.y))
              ? { x: Number(op.nameAt.x), y: Number(op.nameAt.y) }
              : null;
            const sh = {
              id: mkId('sh'),
              kind: op.op,
              pts: [a.id, b.id],
              dashed: !!op.dashed,
              ...(rawName ? { name: rawName } : {}),
              ...(validNameAt ? { nameAt: validNameAt } : {}),
              ...(op.aux ? { aux: true } : {}),
              ...(op.arrow ? { arrow: true } : {})
            };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'plane': {
          const pList = (op.pts || []).map(getP).filter(Boolean);
          if (pList.length >= 3) {
            const rawName = op.name != null ? String(op.name).trim() : (op.label != null ? String(op.label).trim() : '');
            const validNameAt = op.nameAt && Number.isFinite(Number(op.nameAt.x)) && Number.isFinite(Number(op.nameAt.y))
              ? { x: Number(op.nameAt.x), y: Number(op.nameAt.y) }
              : null;
            const sh = {
              id: mkId('sh'),
              kind: 'plane',
              pts: pList.map((x) => x.id),
              ...(op.dashed ? { dashed: true } : {}),
              ...(rawName ? { name: rawName } : {}),
              ...(validNameAt ? { nameAt: validNameAt } : {}),
              ...(op.aux ? { aux: true } : {})
            };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'circle': {
          const o = getP(op.center || op.o), r = getP(op.rim || op.r);
          if (o && r) {
            const sh = { id: mkId('sh'), kind: 'circle', pts: [o.id, r.id], dashed: !!op.dashed, ...(op.aux ? { aux: true } : {}) };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'arc':
        case 'sector':
        case 'arc3': {
          const pList = (op.pts || [op.center || op.o || op.a, op.a || op.b, op.b || op.c]).map(getP).filter(Boolean);
          if (pList.length >= 3) {
            const sh = { id: mkId('sh'), kind: op.op, pts: pList.slice(0, 3).map((x) => x.id), dashed: !!op.dashed, ...(op.fill ? { fill: op.fill } : {}), ...(op.aux ? { aux: true } : {}) };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'cone':
        case 'cylinder': {
          const pList = (op.pts || [op.center || op.o, op.rim || op.r, op.apex || op.top || op.s]).map(getP).filter(Boolean);
          if (pList.length >= 3) {
            const sh = { id: mkId('sh'), kind: op.op, pts: pList.slice(0, 3).map((x) => x.id), dashed: !!op.dashed, ...(op.aux ? { aux: true } : {}) };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'sphere': {
          const pList = (op.pts || [op.center || op.o, op.rim || op.r]).map(getP).filter(Boolean);
          if (pList.length >= 2) {
            const sh = { id: mkId('sh'), kind: 'sphere', pts: pList.slice(0, 2).map((x) => x.id), dashed: !!op.dashed, ...(op.aux ? { aux: true } : {}) };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'frustumCone': {
          const pList = (op.pts || [op.o1, op.r1, op.o2, op.r2]).map(getP).filter(Boolean);
          if (pList.length >= 4) {
            const sh = { id: mkId('sh'), kind: 'frustumCone', pts: pList.slice(0, 4).map((x) => x.id), dashed: !!op.dashed, ...(op.aux ? { aux: true } : {}) };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'connect_polygon':
        case 'polygon_base':
        case 'section': {
          const pList = (op.pts || []).map(getP).filter(Boolean);
          const dashSet = new Set((op.dashedEdges || []).map((s) => String(s).replace(/\s+/g, '')));
          for (let i = 0; i < pList.length; i++) {
            const u = pList[i], v = pList[(i + 1) % pList.length];
            const isD = dashSet.has(`${u.label}-${v.label}`) || dashSet.has(`${v.label}-${u.label}`) || dashSet.has(`${u.label}${v.label}`);
            shapes.push({ id: mkId('sh'), kind: 'segment', pts: [u.id, v.id], dashed: isD });
          }
          if (op.fill && pList.length >= 3) {
            const sh = { id: mkId('sh'), kind: 'polygon', pts: pList.map((x) => x.id), width: 0, fill: op.fill, aux: true };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'polygon_fill': {
          const pList = (op.pts || []).map(getP).filter(Boolean);
          if (pList.length >= 3) {
            const sh = { id: mkId('sh'), kind: 'polygon', pts: pList.map((x) => x.id), width: 0, fill: op.fill || 'rgba(15, 23, 42, 0.06)', aux: true };
            shapes.push(sh);
            if (op.id) opIdMap.set(op.id, { kind: 'shape', id: sh.id });
          }
          break;
        }
        case 'right_angle': {
          const a = getP(op.a), v = getP(op.v || op.b), b = getP(op.v ? op.b : op.c);
          if (a && v && b) shapes.push({ id: mkId('sh'), kind: 'right', pts: [a.id, v.id, b.id], aux: true });
          break;
        }
        case 'angle_mark': {
          const a = getP(op.a), v = getP(op.v || op.b), b = getP(op.v ? op.b : op.c);
          if (a && v && b) shapes.push({ id: mkId('sh'), kind: 'angle', pts: [a.id, v.id, b.id], n: op.n || 1, aux: true });
          break;
        }
        case 'tick_mark': {
          const a = getP(op.a), b = getP(op.b);
          if (a && b) shapes.push({ id: mkId('sh'), kind: 'tick', pts: [a.id, b.id], n: op.n || 1, aux: true });
          break;
        }
        default:
          break;
      }
    }

    return {
      points: pts,
      shapes,
      steps: [],
      pageIdx: 0,
      title: (plan && (plan.meta?.title || plan.title)) || 'Hình AI dựng',
      opIdMap
    };
  }

  function resolveStepsAgainstBoardGeo(rawMotionSteps, dataOps, pointsList, shapesList, fallbackSteps, symIdToBoardId) {
    const ptById = new Map(pointsList.map((p) => [p.id, p]));
    const ptByLbl = new Map();
    for (const p of pointsList) {
      const clean = String(p.label || '').trim().replace(/^\$|\$$/g, '');
      if (clean && !ptByLbl.has(clean)) ptByLbl.set(clean, p);
    }
    if (symIdToBoardId) {
      for (const [sym, bid] of symIdToBoardId.entries()) {
        const pt = ptById.get(bid);
        if (pt && !ptByLbl.has(sym)) ptByLbl.set(sym, pt);
      }
    }

    const shById = new Map(shapesList.map((s) => [s.id, s]));
    const shByAlias = new Map(); // "SA", "seg_SA", "S-A", "fill_AMN", etc. -> { sh, rev }
    const addAlias = (key, sh, rev = false) => {
      if (key && !shByAlias.has(key)) shByAlias.set(key, { sh, rev });
    };

    if (symIdToBoardId) {
      for (const [sym, bid] of symIdToBoardId.entries()) {
        const sh = shById.get(bid);
        if (sh) addAlias(sym, sh, false);
      }
    }

    for (const sh of shapesList) {
      addAlias(sh.id, sh, false);
      const lbls = (sh.pts || []).map((pid) => {
        const p = ptById.get(pid);
        return p && p.label ? String(p.label).trim().replace(/^\$|\$$/g, '') : '';
      });
      if (lbls.every(Boolean) && lbls.length >= 2) {
        if ((sh.kind === 'segment' || sh.kind === 'line' || sh.kind === 'ray' || sh.kind === 'tick') && lbls.length === 2) {
          const [A, B] = lbls;
          addAlias(`${A}${B}`, sh, false);
          addAlias(`${B}${A}`, sh, true);
          addAlias(`${A}-${B}`, sh, false);
          addAlias(`${B}-${A}`, sh, true);
          addAlias(`${A}_${B}`, sh, false);
          addAlias(`${B}_${A}`, sh, true);
          addAlias(`seg_${A}${B}`, sh, false);
          addAlias(`seg_${B}${A}`, sh, true);
          addAlias(`seg_${A}_${B}`, sh, false);
          addAlias(`seg_${B}_${A}`, sh, true);
          addAlias(`${sh.kind}_${A}${B}`, sh, false);
          addAlias(`${sh.kind}_${B}${A}`, sh, true);
        } else if (sh.kind === 'circle' && lbls.length === 2) {
          const [O, R] = lbls;
          addAlias(`cir_${O}${R}`, sh, false);
          addAlias(`circle_${O}${R}`, sh, false);
          addAlias(`circle_${O}`, sh, false);
          addAlias(`(${O})`, sh, false);
        } else {
          const joined = lbls.join('');
          addAlias(joined, sh, false);
          addAlias(`poly_${joined}`, sh, false);
          addAlias(`fill_${joined}`, sh, false);
          addAlias(`section_${joined}`, sh, false);
          addAlias(`${sh.kind}_${joined}`, sh, false);
        }
      }
    }

    // Map op.id from `dataOps` to matched point or shape
    if (Array.isArray(dataOps)) {
      for (const op of dataOps) {
        if (!op || !op.id) continue;
        const oid = String(op.id).trim();
        if (op.a && op.b) {
          const hit = shByAlias.get(`${op.a}-${op.b}`) || shByAlias.get(`${op.a}${op.b}`);
          if (hit) addAlias(oid, hit.sh, hit.rev);
        } else if (Array.isArray(op.pts) && op.pts.length >= 3) {
          const hit = shByAlias.get(`fill_${op.pts.join('')}`) || shByAlias.get(op.pts.join(''));
          if (hit) addAlias(oid, hit.sh, false);
        } else if ((op.center || op.o) && (op.rim || op.r)) {
          const hit = shByAlias.get(`cir_${op.center || op.o}${op.rim || op.r}`);
          if (hit) addAlias(oid, hit.sh, false);
        }
      }
    }

    const resolveSingleRef = (token, preferredKind) => {
      if (!token) return null;
      if (typeof token === 'object') {
        const subRef = token.refId || token.target || token.id || (token.a && token.b ? `${token.a}-${token.b}` : '');
        const resolved = resolveSingleRef(subRef, token.kind || preferredKind);
        if (resolved && token.rev !== undefined) resolved.rev = !!token.rev;
        return resolved;
      }
      const key = String(token).trim();
      if (!key) return null;
      if (preferredKind === 'point') {
        if (ptById.has(key)) return { kind: 'point', refId: key };
        if (ptByLbl.has(key)) return { kind: 'point', refId: ptByLbl.get(key).id };
      }
      if (shById.has(key)) return { kind: 'shape', refId: key, rev: false };
      if (shByAlias.has(key)) {
        const h = shByAlias.get(key);
        return { kind: 'shape', refId: h.sh.id, rev: !!h.rev };
      }
      if (ptById.has(key)) return { kind: 'point', refId: key };
      if (ptByLbl.has(key)) return { kind: 'point', refId: ptByLbl.get(key).id };
      return null;
    };

    const outSteps = [];
    const coveredShapes = new Set();
    const coveredPoints = new Set();

    if (Array.isArray(rawMotionSteps) && rawMotionSteps.length > 0) {
      rawMotionSteps.forEach((ms, idx) => {
        if (!ms) return;
        const resolvedItems = [];
        const rawList = Array.isArray(ms.items) && ms.items.length
          ? ms.items
          : (Array.isArray(ms.targets) && ms.targets.length
            ? ms.targets
            : (Array.isArray(ms.refs) && ms.refs.length ? ms.refs : null));

        if (rawList) {
          for (const entry of rawList) {
            const r = resolveSingleRef(entry, typeof entry === 'object' ? entry.kind : undefined);
            if (r) resolvedItems.push(r);
          }
        } else {
          const directKey = ms.refId || ms.target || ms.opId || (ms.a && ms.b ? `${ms.a}-${ms.b}` : '') || (Array.isArray(ms.pts) ? ms.pts.join('') : '') || ms.id;
          const r = resolveSingleRef(directKey, ms.kind);
          if (r) {
            resolvedItems.push(r);
          } else if (Array.isArray(ms.pts) && ms.pts.length >= 2) {
            // Expand polygon edge/vertex list if given as `pts: ["A", "B", "C", "D"]`
            for (let i = 0; i < ms.pts.length; i++) {
              const segHit = resolveSingleRef(`${ms.pts[i]}-${ms.pts[(i + 1) % ms.pts.length]}`, 'shape');
              if (segHit) resolvedItems.push(segHit);
              else {
                const ptHit = resolveSingleRef(ms.pts[i], 'point');
                if (ptHit) resolvedItems.push(ptHit);
              }
            }
          }
        }

        if (!resolvedItems.length) return;
        for (const it of resolvedItems) {
          if (it.kind === 'shape') coveredShapes.add(it.refId);
          if (it.kind === 'point') coveredPoints.add(it.refId);
        }

        const fx = String(ms.effect || 'draw').trim() || 'draw';
        const durMul = clamp(Number(ms.durationMul) || 1, 0.3, 4.0);
        const delayMs = Math.max(0, Math.round(Number(ms.delayMs != null ? ms.delayMs : ((Number(ms.pauseAfter) || 0) * 1000)) || 0));
        const pauseAfter = ms.pauseAfter != null ? Number(ms.pauseAfter) : Number((delayMs / 1000).toFixed(2));
        const stepRec = {
          id: 'st_imp_' + idx + '_' + Math.random().toString(36).slice(2, 6),
          kind: resolvedItems.length > 1 ? 'group' : resolvedItems[0].kind,
          refId: resolvedItems.length === 1 ? resolvedItems[0].refId : undefined,
          items: resolvedItems.length > 1 ? resolvedItems : undefined,
          customTitle: ms.customTitle || ms.title || ms.step || ms.note || undefined,
          effect: fx,
          easing: ms.easing || 'easeInOut',
          durationMul: durMul,
          delayMs,
          ...(pauseAfter > 0 ? { pauseAfter } : {}),
          rev: ms.rev != null ? !!ms.rev : !!resolvedItems[0].rev,
          tempHide: !!ms.tempHide,
          showGuides: ms.showGuides !== false,
          ...(ms.mode === 'cue' ? { mode: 'cue' } : {}),
          ...(Array.isArray(ms.tRange) ? { tRange: ms.tRange } : {}),
          enabled: ms.enabled !== false
        };
        outSteps.push(stepRec);
      });
    }

    // Append any uncovered fallback / remaining shapes so nothing disappears in replay
    const baseFallback = Array.isArray(fallbackSteps) && fallbackSteps.length ? fallbackSteps : [];
    for (const fb of baseFallback) {
      const fbItems = fb.items && fb.items.length ? fb.items : [{ kind: fb.kind, refId: fb.refId, rev: fb.rev }];
      const kept = fbItems.filter((it) => {
        if (it.kind === 'shape') return shById.has(it.refId) && !coveredShapes.has(it.refId);
        if (it.kind === 'point') return ptById.has(it.refId) && !coveredPoints.has(it.refId);
        return false;
      });
      if (!kept.length) continue;
      kept.forEach((it) => (it.kind === 'shape' ? coveredShapes.add(it.refId) : coveredPoints.add(it.refId)));
      outSteps.push({
        ...fb,
        id: fb.id || ('st_fb_' + Math.random().toString(36).slice(2, 6)),
        kind: kept.length > 1 ? 'group' : kept[0].kind,
        refId: kept.length === 1 ? kept[0].refId : undefined,
        items: kept.length > 1 ? kept : undefined,
        effect: fb.effect || 'draw',
        easing: fb.easing || 'easeInOut',
        enabled: true
      });
    }

    for (const sh of shapesList) {
      if (sh.hidden || sh.kind === 'solid' || sh.kind === 'flatLink' || coveredShapes.has(sh.id)) continue;
      coveredShapes.add(sh.id);
      outSteps.push({
        id: 'st_rem_' + sh.id,
        kind: 'shape',
        refId: sh.id,
        effect: sh.width === 0 ? 'fade' : 'draw',
        easing: 'easeInOut',
        enabled: true
      });
    }

    return outSteps;
  }

  function placePointsOnBoard(pointsList, shapesList, board, isInputMathYUp, placeOpts) {
    const metricsInMathUnits = !!(isInputMathYUp || (placeOpts && placeOpts.metricsInMathUnits));
    const cmPx = 37.79527559;

    // Step 1: Convert `math_y_up` defs cleanly to `board_y_down` (preserving orientation of rot, len, inter_cc, ctan, path)
    const normalized = pointsList.map((p) => {
      if (!p.def || !p.def.t) return p;
      const d = p.def;
      if (!isInputMathYUp) {
        if (d.t === 'free') {
          return { ...p, def: { ...d, x: Number(d.x) || 0, y: Number(d.y) || 0 } };
        }
        return p;
      }
      switch (d.t) {
        case 'free':
          return { ...p, def: { ...d, x: Number(d.x) || 0, y: -(Number(d.y) || 0) } };
        case 'rot':
          return { ...p, def: { ...d, ang: -(Number(d.ang) || 0) } };
        case 'len':
          return { ...p, def: { ...d, ang: -(Number(d.ang) || 0) } };
        case 'inter':
          if (d.c1 && d.c2) {
            return { ...p, def: { ...d, which: d.which ? 0 : 1 } };
          }
          return p;
        case 'ctan':
          return { ...p, def: { ...d, which: !d.which } };
        case 'path':
          if (d.k != null && !d._kAlreadyBoard) {
            return { ...p, def: { ...d, k: (((1 - Number(d.k)) % 1) + 1) % 1 } };
          }
          return p;
        default:
          return p;
      }
    });

    const evalCmPx = metricsInMathUnits ? 1 : cmPx;
    const coords = evalGeoMap({ points: normalized, shapes: shapesList, cmPx: evalCmPx });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of normalized) {
      const c = coords.get(p.id);
      if (!c) continue;
      if (c.x < x0) x0 = c.x;
      if (c.x > x1) x1 = c.x;
      if (c.y < y0) y0 = c.y;
      if (c.y > y1) y1 = c.y;
    }
    for (const sh of (shapesList || [])) {
      if (sh && (sh.kind === 'circle' || sh.kind === 'sphere' || sh.kind === 'cone' || sh.kind === 'cylinder') && Array.isArray(sh.pts) && sh.pts.length >= 2) {
        const o = coords.get(sh.pts[0]), rPt = coords.get(sh.pts[1]);
        if (o && rPt) {
          const r = dist2(o, rPt);
          x0 = Math.min(x0, o.x - r); x1 = Math.max(x1, o.x + r);
          y0 = Math.min(y0, o.y - r); y1 = Math.max(y1, o.y + r);
        }
      }
    }
    if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = 4; y1 = 4; }

    const rawSpan = Math.max(x1 - x0, y1 - y0, 0.5);
    const scale = rawSpan < 45 ? clamp(330 / rawSpan, 24, 115) : 1.0;
    const cxRaw = (x0 + x1) * 0.5;
    const cyRaw = (y0 + y1) * 0.5;

    let pageIdx = board && typeof board.currentPage === 'function' ? board.currentPage() : 0;
    const vc = board && typeof board.viewCentre === 'function' ? board.viewCentre() : { index: pageIdx, x: 440, y: 350 };
    if (Number.isFinite(vc.index)) pageIdx = vc.index;
    const center = { x: vc.x || 440, y: vc.y || 350 };

    // unitScale is `scale / cmPx` ONLY when metric parameters were in math units (`1 unit = 1`),
    // and `scale` when metric parameters (`val`, `distVal`, `vx/vy/vz`) are already in `cm`!
    const unitScale = metricsInMathUnits ? (scale / cmPx) : scale;
    const placedPts = normalized.map((p) => {
      if (!p.def || !p.def.t) return p;
      const d = p.def;
      if (d.t === 'free') {
        return {
          ...p,
          def: {
            ...d,
            x: center.x + (d.x - cxRaw) * scale,
            y: center.y + (d.y - cyRaw) * scale
          }
        };
      }
      if (Math.abs(unitScale - 1) > 1e-9 || Math.abs(scale - 1) > 1e-6) {
        if (d.t === 'len' && d.val != null) {
          return { ...p, def: { ...d, val: Number(d.val) * unitScale } };
        }
        if (d.t === 'polar') {
          return {
            ...p,
            def: {
              ...d,
              ...(d.fixedDist && d.distVal != null ? { distVal: Number(d.distVal) * unitScale } : {}),
              ...(!d.fixedDist && d.curDistPx != null ? { curDistPx: Number(d.curDistPx) * scale } : {})
            }
          };
        }
        if (d.t === 'vec' && d.distVal != null) {
          return { ...p, def: { ...d, distVal: Number(d.distVal) * unitScale } };
        }
        if (d.t === 'p3d') {
          return {
            ...p,
            def: {
              ...d,
              vx: (Number(d.vx) || 0) * unitScale,
              vy: (Number(d.vy) || 0) * unitScale,
              vz: (Number(d.vz) || 0) * unitScale
            }
          };
        }
      }
      if (d._kAlreadyBoard) {
        const cleanDef = Object.assign({}, d);
        delete cleanDef._kAlreadyBoard;
        return { ...p, def: cleanDef };
      }
      return p;
    });

    return { points: placedPts, pageIdx };
  }

  function getAppGeoStyle(board) {
    const color = (board && board.shapeStyle && board.shapeStyle.color) || '#1a1a1a';
    const width = (board && board.shapeStyle && Number(board.shapeStyle.width) > 0) ? Number(board.shapeStyle.width) : 2.5;
    return { color, width };
  }

  function inspectMotionJson(input) {
    try {
      const res = importMotionJson(input, { dryRun: true });
      const effectsSet = new Set();
      for (const st of (res.steps || [])) {
        if (st.effect) effectsSet.add(st.effect);
      }
      const constrainedPts = (res.points || []).filter((p) => p.def && p.def.t !== 'free').length;
      return {
        ok: true,
        format: res.detectedFormat,
        title: res.title,
        pointsCount: (res.points || []).length,
        constrainedCount: constrainedPts,
        shapesCount: (res.shapes || []).length,
        dashedCount: (res.shapes || []).filter((s) => s.dashed).length,
        stepsCount: (res.steps || []).length,
        effects: [...effectsSet]
      };
    } catch (err) {
      return {
        ok: false,
        error: err && err.message ? err.message : String(err)
      };
    }
  }

  function importMotionJson(input, opts = {}) {
    registerMotionFxShortAliases();
    const data = cleanAndParseJson(input);
    const w = getWin();
    const b = opts.board !== undefined ? opts.board : getBoard();
    const K = getKernel();
    const mkId = () => (K && typeof K.nt === 'function') ? K.nt() : ('mn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
    const appStyle = getAppGeoStyle(b);

    let detectedFormat = 'mn-geo-motion/2.0';
    let pointsList = [];
    let shapesList = [];
    let finalSteps = [];
    let pageIdx = b && typeof b.currentPage === 'function' ? b.currentPage() : 0;
    let title = (data.meta && data.meta.title) || data.title || 'Hình chuyển động MinNote';
    const motionCfg = data.motion || {};

    // ------------------------------------------------------------------------
    // CASE (C): BetaTikz `"format": "tikzvid-project/1"`
    // ------------------------------------------------------------------------
    if (data.format === BETATIKZ_FORMAT || (data.state && (data.state.out_tikz || data.state.tikz))) {
      detectedFormat = BETATIKZ_FORMAT;
      title = (data.project && data.project.name) || title || 'Hình BetaTikz';
      const rawTikz = (data.state && (data.state.out_tikz || data.state.tikz)) || '';
      if (!rawTikz.trim()) {
        throw new Error('Gói dự án BetaTikz không chứa mã out_tikz hoặc tikz.');
      }

      const parsedAnim = parseBetaTikzTimelineAndCleanTikz(rawTikz);
      let fig = null;
      if (K && typeof K.uC === 'function') {
        try {
          fig = K.uC(parsedAnim.cleanedTikz, appStyle, mkId, () => '');
          const refiner = (w && w.MinNoteAiGeo && w.MinNoteAiGeo.refineTikzConstraints) || (w && w.__mnRefineTikzConstraints);
          if (typeof refiner === 'function') {
            fig = refiner(fig, mkId);
          }
        } catch (_) {
          fig = null;
        }
      }
      if (!fig || !fig.points || !fig.points.length) {
        fig = parseSimpleTikzFallback(parsedAnim.cleanedTikz);
      }
      if (!fig.points || !fig.points.length) {
        throw new Error('Không trích xuất được tọa độ hình học từ mã BetaTikz.');
      }

      if (K && typeof K.g9 === 'function' && typeof K.qh === 'function' && b) {
        const bounds = K.qh(fig);
        const span = bounds ? Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0, 0.5) : 5;
        const targetScale = clamp(320 / span, 22, 115);
        const vc = typeof b.viewCentre === 'function' ? b.viewCentre() : { index: pageIdx, x: 440, y: 350 };
        if (Number.isFinite(vc.index)) pageIdx = vc.index;
        const scaled = K.g9(fig, targetScale, { x: vc.x || 440, y: vc.y || 350 });
        pointsList = scaled.points;
        shapesList = scaled.shapes;
      } else {
        const placed = placePointsOnBoard(fig.points, fig.shapes, b, false, { metricsInMathUnits: true });
        pointsList = placed.points;
        shapesList = fig.shapes;
        pageIdx = placed.pageIdx;
      }

      pointsList = pointsList.map((p) => {
        const np = { ...p };
        if (np.show && !np.hidden && np.label && !np.noName) {
          delete np.noDot;
          delete np.color;
          delete np.size;
          np.named = true;
        }
        return np;
      });
      shapesList = shapesList.map((sh) => ({
        ...sh,
        color: appStyle.color,
        width: sh.width === 0 ? 0 : appStyle.width
      }));

      // Reconstruct timed steps from parsed macroTimings & edgeTimingList
      const reconstructedRawSteps = [];
      const macroSpans = [...parsedAnim.macroTimings.values()].map((x) => Math.max(0.02, x.t1 - x.t0));
      const avgSpan = macroSpans.length ? (macroSpans.reduce((a, b2) => a + b2, 0) / macroSpans.length) : 0.1;

      const byVar = new Map(); // varName -> { t0, t1, effect, easing, targets: [] }
      for (const et of parsedAnim.edgeTimingList) {
        const mt = parsedAnim.macroTimings.get(et.varName) || { t0: 0.1, t1: 0.2, effect: 'draw', easing: 'easeInOut' };
        if (!byVar.has(et.varName)) {
          byVar.set(et.varName, { ...mt, targets: [] });
        }
        if (et.kind === 'polygon' && Array.isArray(et.pts)) {
          byVar.get(et.varName).targets.push(`fill_${et.pts.join('')}`);
        } else if (et.kind === 'circle') {
          byVar.get(et.varName).targets.push(`circle_${et.from}`);
        } else if (et.from && et.to) {
          byVar.get(et.varName).targets.push(`${et.from}-${et.to}`);
        }
      }

      const sortedBuckets = [...byVar.values()].sort((a, b2) => a.t0 - b2.t0);
      sortedBuckets.forEach((bk, idx) => {
        reconstructedRawSteps.push({
          id: `st_bt_${idx + 1}`,
          targets: bk.targets,
          effect: bk.effect,
          easing: bk.easing,
          durationMul: Number(clamp((bk.t1 - bk.t0) / avgSpan, 0.5, 2.5).toFixed(2)),
          tRange: [bk.t0, bk.t1]
        });
      });

      const autoFallback = (w && w.MinNoteAiGeo && typeof w.MinNoteAiGeo.buildOrderedStepsForTikz === 'function')
        ? w.MinNoteAiGeo.buildOrderedStepsForTikz(pointsList, shapesList)
        : [];
      finalSteps = resolveStepsAgainstBoardGeo(reconstructedRawSteps, [], pointsList, shapesList, autoFallback, null);
    }
    // ------------------------------------------------------------------------
    // CASE (A): `mn-geo-motion/2.0` with explicit `geometry.points` & `geometry.shapes`
    // ------------------------------------------------------------------------
    else if (
      data.geometry &&
      data.geometry.points &&
      (Array.isArray(data.geometry.points) ? data.geometry.points.length > 0 : Object.keys(data.geometry.points).length > 0) &&
      Array.isArray(data.geometry.shapes) &&
      data.geometry.shapes.length > 0
    ) {
      detectedFormat = data.schema || SCHEMA_VERSION;
      const rawPts = Array.isArray(data.geometry.points)
        ? data.geometry.points
        : Object.entries(data.geometry.points).map(([k, v]) => ({ id: k, ...v }));
      const symMap = new Map(); // symId -> newBoardId
      for (const rp of rawPts) {
        symMap.set(String(rp.id || rp.label), mkId());
      }
      const mapPid = (s) => symMap.get(String(s)) || String(s);

      let synthesizedFromMathProps = 0;
      const convertedPts = rawPts.map((rp) => {
        const bid = symMap.get(String(rp.id || rp.label));
        const hadDef = !!(rp.def && rp.def.t);
        if (!hadDef) synthesizedFromMathProps++;
        const d = hadDef
          ? JSON.parse(JSON.stringify(rp.def))
          : { t: 'free', x: safeEvalMathNumber(rp.x ?? rp.nx ?? 0) || 0, y: safeEvalMathNumber(rp.y ?? rp.ny ?? 0) || 0 };
        if (d.a) d.a = mapPid(d.a);
        if (d.b) d.b = mapPid(d.b);
        if (d.c) d.c = mapPid(d.c);
        if (d.p) d.p = mapPid(d.p);
        if (d.o) d.o = mapPid(d.o);
        if (d.ref) d.ref = mapPid(d.ref);
        if (Array.isArray(d.l1)) d.l1 = d.l1.map(mapPid);
        if (Array.isArray(d.l2)) d.l2 = d.l2.map(mapPid);
        if (Array.isArray(d.c1)) d.c1 = d.c1.map(mapPid);
        if (Array.isArray(d.c2)) d.c2 = d.c2.map(mapPid);
        if (Array.isArray(d.pts)) d.pts = d.pts.map(mapPid);
        if (d.t === 'path' && d.angleDeg != null && d.k == null) {
          d.k = (((-Number(d.angleDeg) / 360) % 1) + 1) % 1;
          d._kAlreadyBoard = true;
        }
        const rawLbl = rp.label !== undefined ? String(rp.label) : String(rp.id || '');
        const hasLbl = rp.show !== false && !rp.noName && !!rawLbl.trim();
        return {
          id: bid,
          label: hasLbl ? rawLbl.replace(/^\$|\$$/g, '') : '',
          show: rp.show !== false,
          ...(rp.noDot ? { noDot: true } : {}),
          ...(hasLbl ? { named: true } : { noName: true }),
          def: d
        };
      });

      const shapeSymToBoard = new Map();
      const convertedShapes = data.geometry.shapes.map((rs) => {
        const sid = mkId();
        if (rs.id) shapeSymToBoard.set(String(rs.id), sid);
        const kind = rs.kind || 'segment';
        const isNameable = kind === 'line' || kind === 'ray' || kind === 'segment' || kind === 'plane';
        const rawName = isNameable
          ? (rs.name != null ? String(rs.name).trim() : (rs.label != null ? String(rs.label).trim() : ''))
          : '';
        const validNameAt = isNameable && rs.nameAt && Number.isFinite(Number(rs.nameAt.x)) && Number.isFinite(Number(rs.nameAt.y))
          ? { x: Number(rs.nameAt.x), y: Number(rs.nameAt.y) }
          : null;
        return {
          id: sid,
          kind,
          pts: (rs.pts || []).map(mapPid),
          color: rs.explicitColor && rs.color ? rs.color : appStyle.color,
          width: rs.width === 0 ? 0 : appStyle.width,
          ...(rawName ? { name: rawName } : {}),
          ...(validNameAt ? { nameAt: validNameAt } : {}),
          ...(rs.dashed ? { dashed: true } : {}),
          ...(rs.aux ? { aux: true } : {}),
          ...(rs.fill ? { fill: rs.fill } : {}),
          ...(rs.arrow ? { arrow: true } : {}),
          ...(Number.isFinite(rs.n) ? { n: rs.n } : {})
        };
      });

      // Deterministic coordinate-space resolution for `def`:
      // 1) Explicit `geometry.defCoordSpace` / `meta.defCoordSpace` (`board_y_down` vs `math_y_up`)
      // 2) Synthesized free points from `x,y` / `nx,ny` when `def` was omitted -> `math_y_up` (unless `coordSpace === 'board_y_down'`)
      // 3) Legacy untagged JSONs: correlation between `y/ny` (+up) and `def.y`, with magnitude fallback when collinear on horizontal line!
      const explicitDefSpace = (data.geometry && data.geometry.defCoordSpace) || (data.meta && data.meta.defCoordSpace) || '';
      const explicitCoordSpace = (data.geometry && data.geometry.coordSpace) || (data.meta && data.meta.coordSystem) || '';
      let isMathYUp = false;

      if (explicitDefSpace === 'board_y_down' || explicitDefSpace === 'canvas' || explicitCoordSpace === 'board_y_down' || explicitCoordSpace === 'canvas') {
        isMathYUp = false;
      } else if (explicitDefSpace === 'math_y_up' || explicitDefSpace === 'math-y-up') {
        isMathYUp = true;
      } else {
        const freeRawPts = rawPts.filter((rp) => rp.def && rp.def.t === 'free' && Number.isFinite(Number(rp.def.y)));
        if (freeRawPts.length === 0 && synthesizedFromMathProps > 0) {
          isMathYUp = true;
        } else {
          const withMathY = freeRawPts.filter((rp) => Number.isFinite(Number(rp.y ?? rp.ny)));
          let corr = 0;
          if (withMathY.length >= 2) {
            const p0 = withMathY[0];
            const my0 = Number(p0.y ?? p0.ny);
            for (let i = 1; i < withMathY.length; i++) {
              const myi = Number(withMathY[i].y ?? withMathY[i].ny);
              corr += (myi - my0) * (Number(withMathY[i].def.y) - Number(p0.def.y));
            }
          }
          if (Math.abs(corr) > 1e-6) {
            isMathYUp = corr > 0;
          } else if (freeRawPts.length > 0) {
            const maxCoord = Math.max(...freeRawPts.map((rp) => Math.max(Math.abs(Number(rp.def.x) || 0), Math.abs(Number(rp.def.y) || 0))));
            isMathYUp = maxCoord <= 45;
          }
        }
      }

      const placed = placePointsOnBoard(convertedPts, convertedShapes, b, isMathYUp);
      pointsList = placed.points;
      shapesList = convertedShapes;
      pageIdx = placed.pageIdx;

      const combinedMap = new Map([...symMap.entries(), ...shapeSymToBoard.entries()]);
      finalSteps = resolveStepsAgainstBoardGeo(motionCfg.steps || [], data.ops || [], pointsList, shapesList, [], combinedMap);
    }
    // ------------------------------------------------------------------------
    // CASE (B): `ops`-based AI JSON v1/v2 or `mn-geo-motion/2.0` with `ops`
    // ------------------------------------------------------------------------
    else if (Array.isArray(data.ops) || Array.isArray(data.constructions) || Array.isArray(data.steps)) {
      detectedFormat = data.schema || 'mn-ai-ops/1.0';
      let compiled = null;
      if (w && w.MinNoteAiGeo && typeof w.MinNoteAiGeo.compileAiGeoPlan === 'function' && K && typeof K.nt === 'function') {
        compiled = w.MinNoteAiGeo.compileAiGeoPlan(data, b, opts.anchorBox || null);
      } else {
        const fb = compileOpsStandaloneFallback(data);
        const placed = placePointsOnBoard(fb.points, fb.shapes, b, false, { metricsInMathUnits: true });
        compiled = {
          points: placed.points,
          shapes: fb.shapes.map((s) => ({ ...s, color: appStyle.color, width: s.width === 0 ? 0 : appStyle.width })),
          steps: fb.steps,
          pageIdx: placed.pageIdx,
          title: fb.title,
          opIdMap: fb.opIdMap
        };
      }
      pointsList = compiled.points;
      shapesList = compiled.shapes;
      pageIdx = Number.isFinite(compiled.pageIdx) ? compiled.pageIdx : pageIdx;
      if (compiled.title && (!data.meta || !data.meta.title)) title = compiled.title;

      const symLookup = new Map();
      if (compiled.opIdMap) {
        for (const [k, v] of compiled.opIdMap.entries()) symLookup.set(k, v.id);
      }
      finalSteps = resolveStepsAgainstBoardGeo(
        motionCfg.steps || [],
        data.ops || [],
        pointsList,
        shapesList,
        compiled.steps || [],
        symLookup
      );
    } else {
      throw new Error('Định dạng JSON không nhận diện được (cần mn-geo-motion/2.0, mảng ops, hoặc tikzvid-project/1).');
    }

    // Apply optional preset override (or JSON's preset when steps have only plain 'draw')
    const overridePreset = opts.presetOverride || '';
    const jsonPreset = motionCfg.preset || '';
    const effectivePreset = overridePreset || jsonPreset;
    const allPlainDraw = finalSteps.length > 0 && finalSteps.every((s) => !s.effect || s.effect === 'draw');

    if (overridePreset || (jsonPreset && allPlainDraw)) {
      const targetPreset = PRESET_TO_SCHEMA[effectivePreset] || 'domiinh';
      const shMap = new Map(shapesList.map((s) => [s.id, s]));
      finalSteps = finalSteps.map((st) => {
        const first = (st.items && st.items[0]) || st;
        const sh = first.kind === 'shape' ? shMap.get(first.refId) : null;
        return {
          ...st,
          effect: sh && sh.width === 0 ? 'fade' : normalizeStepEffect('', targetPreset, first.kind, !!(sh && sh.dashed), !!(sh && sh.aux))
        };
      });
    }

    const ptIds = pointsList.map((p) => p.id);
    const shIds = shapesList.map((s) => s.id);
    const handPen = opts.handPen != null ? !!opts.handPen : (motionCfg.handPen !== false);
    const followCamera = opts.followCamera != null ? !!opts.followCamera : (motionCfg.followCamera !== false);
    const orbit3d = opts.orbit3d != null ? !!opts.orbit3d : !!motionCfg.orbit3d;
    const loop = opts.loop != null ? !!opts.loop : (motionCfg.loop !== false);
    const autoPlay = opts.autoPlay != null ? !!opts.autoPlay : true;
    const speed = clamp(Number(opts.speed || motionCfg.speed || 1), 0.2, 4);
    const replayStylePreset = PRESET_TO_REPLAY[effectivePreset] || '';

    let session = null;

    // Commit to live MinNote Whiteboard & persist script + launch Replay!
    if (!opts.dryRun && b && typeof b.addGeo === 'function' && typeof b.commit === 'function') {
      b.commit(b.addGeo(pageIdx, pointsList, shapesList));

      const pg = b.doc && Array.isArray(b.doc.pages) ? b.doc.pages[pageIdx] : null;
      const scopeKey = 'sel_' + [...shIds].sort().join(',') + '|' + [...ptIds].sort().join(',');

      const persistToStorage = (stepsToSave, scriptKey) => {
        const keyToUse = scriptKey || scopeKey;
        const entry = {
          key: keyToUse,
          title,
          shapeIds: shIds,
          pointIds: ptIds,
          itemIds: null,
          strokeIds: null,
          solidGroups: [],
          speed,
          pauseBetween: false,
          followCamera,
          springCamera: true,
          autoOrbitAfter: orbit3d,
          loop,
          fps: motionCfg.fps || 24,
          durationSec: motionCfg.durationSec || 8,
          holdEndSec: motionCfg.holdEndSec != null ? motionCfg.holdEndSec : 1,
          stylePreset: replayStylePreset || effectivePreset || 'domiinh',
          steps: stepsToSave,
          updatedAt: Date.now()
        };
        if (typeof b.saveBuildScript === 'function') {
          try { b.saveBuildScript(pageIdx, stepsToSave, entry); } catch (_) {}
        }
        if (pg && pg.id && typeof localStorage !== 'undefined') {
          try {
            const storageKey = 'mn_geo_scripts_' + pg.id;
            const existingMap = JSON.parse(localStorage.getItem(storageKey) || '{}');
            existingMap[keyToUse] = entry;
            localStorage.setItem(storageKey, JSON.stringify(existingMap));
          } catch (_) {}
        }
      };

      persistToStorage(finalSteps, scopeKey);

      const shouldLaunchReplay = opts.launchReplay != null ? !!opts.launchReplay : true;
      if (shouldLaunchReplay && w && w.MinNoteGeoReplay && typeof w.MinNoteGeoReplay.launchConstructedFigure === 'function') {
        session = w.MinNoteGeoReplay.launchConstructedFigure({
          pageIdx,
          pointIds: ptIds,
          shapeIds: shIds,
          steps: finalSteps,
          title,
          speed,
          stylePreset: replayStylePreset,
          viewMode: opts.viewMode || 'full',
          autoPlay,
          handPen,
          followCamera
        });
        if (session) {
          session.autoOrbitAfter = orbit3d;
          session.loop = loop;
          if (replayStylePreset) session.stylePreset = replayStylePreset;
          persistToStorage(session.steps || finalSteps, session.scriptKey || scopeKey);
        }
      } else {
        if (typeof b.setTool === 'function') b.setTool({ k: 'select' });
        b.sel = { page: pageIdx, strokes: new Set(), items: new Set(), points: new Set(ptIds), shapes: new Set(shIds) };
        if (typeof b.redraw === 'function') b.redraw();
        if (typeof b.emit === 'function') b.emit();
      }
    }

    return {
      ok: true,
      detectedFormat,
      title,
      pageIdx,
      points: pointsList,
      shapes: shapesList,
      steps: session && Array.isArray(session.steps) ? session.steps : finalSteps,
      motion: {
        preset: PRESET_TO_SCHEMA[effectivePreset] || 'domiinh',
        handPen,
        followCamera,
        orbit3d,
        loop,
        speed
      },
      session
    };
  }

  // ============================================================================
  // 8. BUILT-IN QUICK SAMPLES & EXTERNAL LLM SYSTEM PROMPT SNIPPET
  // ============================================================================
  const QUICK_SAMPLES = {
    pyramid3d: {
      schema: SCHEMA_VERSION,
      meta: { title: 'Chóp S.ABCD & Thiết diện (AMN)', is3D: true, coordSystem: 'cartesian-y-up' },
      ops: [
        { op: 'point_free', id: 'A', label: 'A', x: -2.6, y: 0.0 },
        { op: 'point_free', id: 'D', label: 'D', x: 3.0, y: 0.2 },
        { op: 'point_free', id: 'B', label: 'B', x: -1.1, y: -1.9 },
        { op: 'point_free', id: 'C', label: 'C', x: 1.9, y: -1.7 },
        { op: 'point_free', id: 'S', label: 'S', x: -0.3, y: 3.8 },
        { op: 'connect_polygon', pts: ['A', 'B', 'C', 'D'], dashedEdges: ['A-D'] },
        { op: 'segment', a: 'S', b: 'A', dashed: false },
        { op: 'segment', a: 'S', b: 'B', dashed: false },
        { op: 'segment', a: 'S', b: 'C', dashed: false },
        { op: 'segment', a: 'S', b: 'D', dashed: false },
        { op: 'segment', a: 'A', b: 'C', dashed: true, aux: true },
        { op: 'segment', a: 'B', b: 'D', dashed: true, aux: true },
        { op: 'intersection_ll', id: 'O', label: 'O', l1: ['A', 'C'], l2: ['B', 'D'] },
        { op: 'segment', a: 'S', b: 'O', dashed: true, aux: true },
        { op: 'midpoint', id: 'M', label: 'M', a: 'S', b: 'C' },
        { op: 'midpoint', id: 'N', label: 'N', a: 'S', b: 'D' },
        { op: 'connect_polygon', pts: ['A', 'M', 'N'], dashedEdges: ['A-M', 'A-N'], fill: 'rgba(14, 165, 233, 0.14)' }
      ],
      motion: {
        preset: 'domiinh',
        fps: 24,
        durationSec: 8,
        holdEndSec: 1,
        loop: true,
        handPen: true,
        followCamera: true,
        orbit3d: false,
        steps: [
          { kind: 'group', targets: ['A', 'B', 'C', 'D'], customTitle: 'Đặt 4 đỉnh đáy A, B, C, D', effect: 'pop', easing: 'easeOut' },
          { kind: 'group', targets: ['A-B', 'B-C', 'C-D', 'A-D'], customTitle: 'Dựng tứ giác đáy ABCD (AD nét đứt)', effect: 'chalk', easing: 'easeInOut' },
          { kind: 'point', refId: 'S', customTitle: 'Đặt đỉnh chóp S', effect: 'pop', easing: 'spring' },
          { kind: 'group', targets: ['S-A', 'S-B', 'S-C', 'S-D'], customTitle: 'Nối các cạnh bên SA, SB, SC, SD', effect: 'chalk', easing: 'easeInOut' },
          { kind: 'group', targets: ['A-C', 'B-D'], customTitle: 'Kẻ hai đường chéo AC, BD', effect: 'draw', easing: 'easeInOut' },
          { kind: 'point', refId: 'O', customTitle: 'Giao điểm O = AC ∩ BD', effect: 'pulse', easing: 'spring' },
          { kind: 'shape', refId: 'S-O', customTitle: 'Giao tuyến SO = (SAC) ∩ (SBD)', effect: 'glow', easing: 'easeOut' },
          { kind: 'group', targets: ['M', 'N', 'M-N', 'A-M', 'A-N'], customTitle: 'Trung điểm M, N & mặt (AMN)', effect: 'glow', easing: 'easeInOut' },
          { kind: 'shape', refId: 'fill_AMN', customTitle: 'Tô thiết diện (AMN)', effect: 'fade', easing: 'easeInOut' }
        ]
      }
    },
    tangent2d: {
      schema: SCHEMA_VERSION,
      meta: { title: 'Đường tròn (O) & Hai tiếp tuyến AB, AC', is3D: false, coordSystem: 'cartesian-y-up' },
      ops: [
        { op: 'point_free', id: 'O', label: 'O', x: 0, y: 0 },
        { op: 'point_free', id: 'R', label: '', x: 0, y: 2.2, show: false },
        { op: 'circle', id: 'cir_O', center: 'O', rim: 'R' },
        { op: 'point_free', id: 'A', label: 'A', x: 5.0, y: 0 },
        { op: 'midpoint', id: 'M', label: 'M', a: 'O', b: 'A', show: false },
        { op: 'intersection_cc', id: 'B', label: 'B', c1: ['O', 'R'], c2: ['M', 'O'], which: 0 },
        { op: 'intersection_cc', id: 'C', label: 'C', c1: ['O', 'R'], c2: ['M', 'O'], which: 1 },
        { op: 'segment', a: 'A', b: 'B', dashed: false },
        { op: 'segment', a: 'A', b: 'C', dashed: false },
        { op: 'segment', a: 'O', b: 'B', dashed: true, aux: true },
        { op: 'segment', a: 'O', b: 'C', dashed: true, aux: true },
        { op: 'segment', a: 'O', b: 'A', dashed: true, aux: true },
        { op: 'segment', a: 'B', b: 'C', dashed: false, aux: true },
        { op: 'intersection_ll', id: 'H', label: 'H', l1: ['O', 'A'], l2: ['B', 'C'] },
        { op: 'right_angle', a: 'O', v: 'B', b: 'A' },
        { op: 'right_angle', a: 'O', v: 'C', b: 'A' },
        { op: 'right_angle', a: 'O', v: 'H', b: 'B' }
      ],
      motion: {
        preset: 'manim',
        fps: 30,
        durationSec: 7,
        holdEndSec: 1,
        loop: true,
        handPen: true,
        followCamera: true,
        orbit3d: false,
        steps: [
          { kind: 'point', refId: 'O', customTitle: 'Tâm O', effect: 'pop' },
          { kind: 'shape', refId: 'cir_O', customTitle: 'Vẽ đường tròn (O; R)', effect: 'draw' },
          { kind: 'point', refId: 'A', customTitle: 'Điểm A nằm ngoài (O)', effect: 'pop' },
          { kind: 'group', targets: ['B', 'C', 'A-B', 'A-C'], customTitle: 'Kẻ hai tiếp tuyến AB, AC', effect: 'glow' },
          { kind: 'group', targets: ['O-B', 'O-C', 'O-A', 'B-C'], customTitle: 'Nối bán kính OB, OC và dây BC', effect: 'draw' },
          { kind: 'point', refId: 'H', customTitle: 'Giao điểm vuông góc H = OA ∩ BC', effect: 'pulse' }
        ]
      }
    }
  };

  const COMPACT_LLM_PROMPT_HEADER =
    'Hãy phân tích/mở rộng JSON hình học chuyển động MinNote sau và trả về DUY NHẤT 1 JSON hợp lệ chuẩn "mn-geo-motion/2.0" ' +
    '(giữ đúng ràng buộc DAG: chỉ đỉnh gốc dùng point_free, trung điểm midpoint, giao điểm đồng phẳng intersection_ll, ' +
    'nét khuất 3D dashed:true, gán effect mỗi bước thuộc draw|chalk|glow|pop|pulse|fade|wipe|stamp):\n\n';

  // ============================================================================
  // 9. INTERACTIVE 3-TAB STUDIO MODAL (`openStudioModal(defaultTab)`)
  // ============================================================================
  let studioBackdrop = null;
  let studioState = {
    tab: 'betatikz',
    subView: 'out_tikz', // 'out_tikz' | 'animate' | 'cli'
    fps: 24,
    durationSec: 8,
    holdEndSec: 1.0,
    loop: true,
    preset: '', // '' = keep | 'domiinh' | 'manim' | '3d_standard'
    followCamera: true,
    orbit3d: false,
    jsonMode: 'full', // 'full' | 'compact_llm' | 'betatikz_project'
    lastAnimatedResult: null,
    lastExportedJsonStr: ''
  };

  async function saveTextOrDownload(text, fileName, ext, mime) {
    const w = getWin();
    if (w && w.MinNoteMeaSync && typeof w.MinNoteMeaSync.isDesktopBridge === 'function' && w.MinNoteMeaSync.isDesktopBridge()) {
      try {
        const res = await w.MinNoteMeaSync.request('SAVE_MEDIA_FILE', { fileName, ext, textData: text });
        if (res && !res.cancelled) toast(`💾 Đã lưu tệp ${res.fileName || fileName}!`, 'success');
        return res;
      } catch (_) {}
    }
    const blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast(`💾 Đã tải xuống ${fileName}!`, 'success');
    return { fileName };
  }

  async function copyToClipboard(text, okMsg) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || '📋 Đã sao chép vào bộ nhớ tạm!', 'success');
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(okMsg || '📋 Đã sao chép!', 'success');
    }
  }

  function ensureStudioModal() {
    if (studioBackdrop) return studioBackdrop;
    const el = document.createElement('div');
    el.id = 'mn-motion-bridge-backdrop';
    el.className = 'mn-v80-backdrop mn-mb-backdrop';
    el.innerHTML = `
      <div class="mn-v80-modal wide mn-mb-modal" id="mn-motion-bridge-modal" role="dialog" aria-modal="true" aria-label="Studio TikZ Chuyển Động, BetaTikz & JSON Đa Năng">
        <div class="mn-v80-head">
          <div class="mn-v80-title">
            <span>🎬 Cầu Nối TikZ Chuyển Động, BetaTikz Loop &amp; JSON Đa Năng</span>
            <span class="mn-v80-badge ok" id="mn-mb-head-badge">mn-geo-motion/2.0</span>
          </div>
          <button type="button" class="mn-v80-close" id="mn-mb-close" title="Đóng (Esc)">✕</button>
        </div>

        <div class="mn-mb-tabbar" id="mn-mb-tabs">
          <button type="button" class="mn-mb-tab-btn active" data-mb-tab="betatikz">🎬 TikZ Chuyển Động &amp; BetaTikz Loop</button>
          <button type="button" class="mn-mb-tab-btn" data-mb-tab="export_json">📤 Xuất JSON Đa Năng (AI / App khác)</button>
          <button type="button" class="mn-mb-tab-btn" data-mb-tab="import_json">📥 Nạp JSON &amp; Tạo Chuyển Động</button>
        </div>

        <div class="mn-v80-body">
          <div class="mn-mb-demo-notice" id="mn-mb-demo-notice" style="display:none;">
            <span>💡 Trang hiện tại chưa có hình — đang xem trước trên mẫu Chóp S.ABCD. Chuyển sang Tab 3 để nạp JSON hoặc vẽ hình trực tiếp!</span>
            <button type="button" class="mn-v80-btn sm primary" id="mn-mb-demo-apply">🚀 Chèn mẫu này vào bảng</button>
          </div>

          <!-- TAB 1: TIKZ CHUYỂN ĐỘNG & BETATIKZ LOOP -->
          <div class="mn-mb-pane active" data-mb-pane="betatikz">
            <div class="mn-mb-controls-bar">
              <div class="mn-mb-ctrl-group">
                <div class="mn-mb-ctrl-label"><span>Tốc độ khung hình (FPS)</span><span class="mn-mb-ctrl-val" id="mn-mb-fps-val">24 FPS</span></div>
                <select class="mn-v80-select" id="mn-mb-fps">
                  <option value="24" selected>24 FPS (Chuẩn Điện ảnh / Beamer)</option>
                  <option value="30">30 FPS (Mượt chuẩn Video)</option>
                  <option value="60">60 FPS (Siêu mượt BetaTikz 4K)</option>
                </select>
              </div>
              <div class="mn-mb-ctrl-group">
                <div class="mn-mb-ctrl-label"><span>Thời lượng video</span><span class="mn-mb-ctrl-val" id="mn-mb-dur-val">8s</span></div>
                <input type="range" id="mn-mb-duration" min="4" max="20" step="1" value="8" />
              </div>
              <div class="mn-mb-ctrl-group">
                <div class="mn-mb-ctrl-label"><span>Giữ khung cuối (Hold End)</span><span class="mn-mb-ctrl-val" id="mn-mb-hold-val">1.0s</span></div>
                <input type="range" id="mn-mb-hold" min="0" max="4" step="0.5" value="1" />
              </div>
              <div class="mn-mb-ctrl-group" style="justify-content:center;gap:7px;">
                <label class="mn-v80-toggle">
                  <input type="checkbox" id="mn-mb-loop" checked />
                  <span>🔁 Vòng lặp mượt (Seamless Loop)</span>
                </label>
                <label class="mn-v80-toggle">
                  <input type="checkbox" id="mn-mb-orbit3d" />
                  <span>↻ Nghiêng / Xoay nhẹ 3D cuối clip</span>
                </label>
              </div>
            </div>

            <div class="mn-mb-preset-row">
              <div class="mn-mb-chip-group" id="mn-mb-preset-group">
                <span style="font-size:12px;font-weight:700;color:var(--mn80-text-soft);">Phong cách hiệu ứng:</span>
                <button type="button" class="mn-mb-chip active" data-preset="">Giữ theo kịch bản</button>
                <button type="button" class="mn-mb-chip" data-preset="domiinh">✨ Đỗ Miinh</button>
                <button type="button" class="mn-mb-chip" data-preset="manim">🎬 Manim</button>
                <button type="button" class="mn-mb-chip" data-preset="3d_standard">🧊 3D Chuẩn</button>
              </div>
              <div class="mn-mb-chip-group" id="mn-mb-subview-group">
                <button type="button" class="mn-mb-chip active" data-subview="out_tikz" id="mn-mb-subtab-outtikz">out_tikz (\\t ∈ [0,1])</button>
                <button type="button" class="mn-mb-chip" data-subview="animate" id="mn-mb-subtab-animate">LaTeX animateinline</button>
                <button type="button" class="mn-mb-chip" data-subview="cli" id="mn-mb-subtab-cli">Lệnh CLI BetaTikz</button>
              </div>
            </div>

            <div class="mn-mb-timeline-card">
              <div class="mn-mb-timeline-head">
                <span id="mn-mb-tl-info">Trục thời gian liên tục \\t ∈ [0, 1]</span>
                <span id="mn-mb-tl-stats"></span>
              </div>
              <div class="mn-mb-timeline-track" id="mn-mb-timeline-bar"></div>
            </div>

            <textarea class="mn-mb-code-editor" id="mn-mb-tikz-output" spellcheck="false"></textarea>

            <div class="mn-mb-action-row">
              <button type="button" class="mn-v80-btn primary" id="mn-mb-btn-copy-outtikz">📋 Chép out_tikz (BetaTikz)</button>
              <button type="button" class="mn-v80-btn success" id="mn-mb-btn-save-betatikz">📦 Xuất .betatikz.json (Mở trong BetaTikz)</button>
              <button type="button" class="mn-v80-btn" id="mn-mb-btn-save-tex">📄 Lưu .tex (animateinline)</button>
              <button type="button" class="mn-v80-btn" id="mn-mb-btn-export-video">🎥 Xuất Video WebM/MP4 / GIF Vòng Lặp</button>
            </div>
          </div>

          <!-- TAB 2: XUẤT JSON ĐA NĂNG -->
          <div class="mn-mb-pane" data-mb-pane="export_json">
            <div class="mn-mb-preset-row">
              <div class="mn-mb-chip-group" id="mn-mb-json-mode">
                <button type="button" class="mn-mb-chip active" data-json-mode="full">Đầy đủ (mn-geo-motion/2.0)</button>
                <button type="button" class="mn-mb-chip" data-json-mode="compact_llm">Siêu gọn cho LLM (Tiết kiệm 65% token)</button>
                <button type="button" class="mn-mb-chip" data-json-mode="betatikz_project">Dự án BetaTikz (tikzvid-project/1)</button>
              </div>
            </div>

            <div class="mn-mb-summary-bar" id="mn-mb-json-stats"></div>

            <textarea class="mn-mb-code-editor" id="mn-mb-json-output" spellcheck="false" style="min-height:300px;"></textarea>

            <div class="mn-mb-action-row">
              <button type="button" class="mn-v80-btn primary" id="mn-mb-btn-copy-json">📋 Sao chép JSON</button>
              <button type="button" class="mn-v80-btn success" id="mn-mb-btn-save-json">💾 Lưu tệp .json</button>
              <button type="button" class="mn-v80-btn" id="mn-mb-btn-copy-ai-prompt">🤖 Chép kèm Prompt cho ChatGPT / Claude / Gemini</button>
            </div>
          </div>

          <!-- TAB 3: NẠP JSON & TẠO CHUYỂN ĐỘNG -->
          <div class="mn-mb-pane" data-mb-pane="import_json">
            <div class="mn-mb-preset-row">
              <div class="mn-mb-chip-group">
                <button type="button" class="mn-v80-btn sm" id="mn-mb-btn-pick-file">📂 Chọn tệp .json / .betatikz.json</button>
                <input type="file" id="mn-mb-file-input" accept=".json,.betatikz.json,application/json,text/plain" style="display:none;" />
                <button type="button" class="mn-mb-chip" data-load-sample="pyramid3d">Mẫu Chóp S.ABCD 3D</button>
                <button type="button" class="mn-mb-chip" data-load-sample="tangent2d">Mẫu Tiếp tuyến (O) 2D</button>
                <button type="button" class="mn-mb-chip" data-load-sample="betatikz">Mẫu gói BetaTikz</button>
              </div>
              <button type="button" class="mn-v80-btn sm danger" id="mn-mb-btn-clear-import">Xóa ô nhập</button>
            </div>

            <textarea class="mn-mb-code-editor" id="mn-mb-import-input" spellcheck="false" style="min-height:220px;" placeholder='Dán JSON chuẩn "mn-geo-motion/2.0", mảng "ops" từ ChatGPT/Claude/Gemini/DeepSeek, hoặc tệp dự án BetaTikz ("tikzvid-project/1") vào đây...'></textarea>

            <div class="mn-mb-summary-bar" id="mn-mb-import-summary">
              <span class="mn-mb-pill-stat">Sẵn sàng nhận diện tự động 3 định dạng: mn-geo-motion/2.0 • AI ops JSON • BetaTikz tikzvid-project/1</span>
            </div>

            <div class="mn-mb-controls-bar" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
              <div class="mn-mb-ctrl-group">
                <div class="mn-mb-ctrl-label"><span>Chế độ hiệu ứng khi nạp</span></div>
                <select class="mn-v80-select" id="mn-mb-import-fx-mode">
                  <option value="" selected>Giữ nguyên hiệu ứng trong JSON</option>
                  <option value="domiinh">✨ Áp phong cách Đỗ Miinh (Phấn &amp; Hào quang)</option>
                  <option value="manim">🎬 Áp phong cách Manim (Mượt &amp; Nhấn điểm)</option>
                  <option value="3d_standard">🧊 Áp phong cách 3D Chuẩn</option>
                </select>
              </div>
              <div class="mn-mb-ctrl-group" style="justify-content:center;gap:7px;">
                <label class="mn-v80-toggle">
                  <input type="checkbox" id="mn-mb-import-hand" checked />
                  <span>✍ Bật tay cầm bút khi dựng lại</span>
                </label>
                <label class="mn-v80-toggle">
                  <input type="checkbox" id="mn-mb-import-cam" checked />
                  <span>🎥 Bật Camera lò xo theo dõi nét</span>
                </label>
              </div>
              <div class="mn-mb-ctrl-group" style="justify-content:center;gap:7px;">
                <label class="mn-v80-toggle">
                  <input type="checkbox" id="mn-mb-import-autoplay" checked />
                  <span>▶ Tự phát chuyển động ngay sau khi nạp</span>
                </label>
              </div>
            </div>

            <div class="mn-mb-action-row" style="justify-content:flex-end;">
              <button type="button" class="mn-v80-btn primary" id="mn-mb-btn-run-import" style="height:38px;padding:0 18px;font-size:13.5px;">🚀 Nạp Hình &amp; Chạy Chuyển Động Ngay</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    studioBackdrop = el;

    const close = () => el.classList.remove('open');
    el.querySelector('#mn-mb-close').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    // Tab switching
    el.querySelectorAll('[data-mb-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setStudioTab(btn.dataset.mbTab);
      });
    });

    // Demo apply button
    el.querySelector('#mn-mb-demo-apply').addEventListener('click', () => {
      try {
        importMotionJson(QUICK_SAMPLES.pyramid3d, { autoPlay: true });
        refreshStudioContent();
        toast('✨ Đã chèn mẫu Chóp S.ABCD vào bảng và kích hoạt kịch bản!', 'success');
      } catch (err) {
        toast('Lỗi chèn mẫu: ' + (err.message || err), 'error');
      }
    });

    // Tab 1 controls
    const fpsSel = el.querySelector('#mn-mb-fps');
    const durInp = el.querySelector('#mn-mb-duration');
    const holdInp = el.querySelector('#mn-mb-hold');
    const loopChk = el.querySelector('#mn-mb-loop');
    const orbChk = el.querySelector('#mn-mb-orbit3d');

    fpsSel.addEventListener('change', () => {
      studioState.fps = parseInt(fpsSel.value, 10) || 24;
      el.querySelector('#mn-mb-fps-val').textContent = `${studioState.fps} FPS`;
      refreshTab1();
    });
    durInp.addEventListener('input', () => {
      studioState.durationSec = parseFloat(durInp.value) || 8;
      el.querySelector('#mn-mb-dur-val').textContent = `${studioState.durationSec}s`;
      refreshTab1();
    });
    holdInp.addEventListener('input', () => {
      studioState.holdEndSec = parseFloat(holdInp.value) || 0;
      el.querySelector('#mn-mb-hold-val').textContent = `${studioState.holdEndSec.toFixed(1)}s`;
      refreshTab1();
    });
    loopChk.addEventListener('change', () => {
      studioState.loop = !!loopChk.checked;
      refreshTab1();
    });
    orbChk.addEventListener('change', () => {
      studioState.orbit3d = !!orbChk.checked;
      refreshTab1();
    });

    el.querySelectorAll('#mn-mb-preset-group [data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        studioState.preset = btn.dataset.preset || '';
        el.querySelectorAll('#mn-mb-preset-group [data-preset]').forEach((x) => x.classList.toggle('active', x === btn));
        refreshTab1();
      });
    });

    el.querySelectorAll('#mn-mb-subview-group [data-subview]').forEach((btn) => {
      btn.addEventListener('click', () => {
        studioState.subView = btn.dataset.subview || 'out_tikz';
        el.querySelectorAll('#mn-mb-subview-group [data-subview]').forEach((x) => x.classList.toggle('active', x === btn));
        renderTab1CodeBox();
      });
    });

    el.querySelector('#mn-mb-btn-copy-outtikz').addEventListener('click', () => {
      const res = studioState.lastAnimatedResult;
      if (res && res.outTikz) {
        copyToClipboard(res.outTikz, '📋 Đã sao chép mã out_tikz chuẩn BetaTikz (\\t ∈ [0,1])!');
      }
    });

    el.querySelector('#mn-mb-btn-save-betatikz').addEventListener('click', () => {
      const res = studioState.lastAnimatedResult;
      if (!res || !res.betatikzProject) return;
      const jsonStr = JSON.stringify(res.betatikzProject, null, 2);
      const fname = `minnote_betatikz_${Date.now().toString(36)}.betatikz.json`;
      saveTextOrDownload(jsonStr, fname, '.json', 'application/json;charset=utf-8');
    });

    el.querySelector('#mn-mb-btn-save-tex').addEventListener('click', () => {
      const res = studioState.lastAnimatedResult;
      if (!res || !res.animateInlineTex) return;
      const fname = `minnote_animate_${Date.now().toString(36)}.tex`;
      saveTextOrDownload(res.animateInlineTex, fname, '.tex', 'text/plain;charset=utf-8');
    });

    el.querySelector('#mn-mb-btn-export-video').addEventListener('click', () => {
      const w = getWin();
      if (w && w.MinNoteReplayExporter && typeof w.MinNoteReplayExporter.openModal === 'function') {
        close();
        w.MinNoteReplayExporter.openModal(null);
      } else {
        toast('Mô-đun xuất Video/GIF chưa sẵn sàng.', 'warn');
      }
    });

    // Tab 2 controls
    el.querySelectorAll('#mn-mb-json-mode [data-json-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        studioState.jsonMode = btn.dataset.jsonMode || 'full';
        el.querySelectorAll('#mn-mb-json-mode [data-json-mode]').forEach((x) => x.classList.toggle('active', x === btn));
        refreshTab2();
      });
    });

    el.querySelector('#mn-mb-btn-copy-json').addEventListener('click', () => {
      const txt = el.querySelector('#mn-mb-json-output').value.trim();
      copyToClipboard(txt, '📋 Đã sao chép JSON chuyển động!');
    });

    el.querySelector('#mn-mb-btn-save-json').addEventListener('click', () => {
      const txt = el.querySelector('#mn-mb-json-output').value.trim();
      if (!txt) return;
      const extSuffix = studioState.jsonMode === 'betatikz_project' ? '.betatikz.json' : '.json';
      const fname = `minnote_motion_${studioState.jsonMode}_${Date.now().toString(36)}${extSuffix}`;
      saveTextOrDownload(txt, fname, '.json', 'application/json;charset=utf-8');
    });

    el.querySelector('#mn-mb-btn-copy-ai-prompt').addEventListener('click', () => {
      const compactObj = exportMotionJson({ mode: 'compact_llm', allowDemoFallback: true });
      const payload = COMPACT_LLM_PROMPT_HEADER + JSON.stringify(compactObj, null, 2);
      copyToClipboard(payload, '🤖 Đã chép JSON siêu gọn kèm Prompt hướng dẫn cho AI ngoài!');
    });

    // Tab 3 controls
    const impInput = el.querySelector('#mn-mb-import-input');
    const fileInp = el.querySelector('#mn-mb-file-input');

    const updateImportValidationBadge = () => {
      const sumEl = el.querySelector('#mn-mb-import-summary');
      const raw = impInput.value.trim();
      if (!raw) {
        sumEl.innerHTML = '<span class="mn-mb-pill-stat">Sẵn sàng nhận diện tự động 3 định dạng: mn-geo-motion/2.0 • AI ops JSON • BetaTikz tikzvid-project/1</span>';
        return;
      }
      const info = inspectMotionJson(raw);
      if (!info.ok) {
        sumEl.innerHTML = `<span class="mn-mb-pill-stat err">✕ Lỗi dữ liệu: ${escHtml(info.error)}</span>`;
        return;
      }
      const fxTxt = info.effects.length ? info.effects.join(', ') : 'draw';
      sumEl.innerHTML = [
        `<span class="mn-mb-pill-stat ok">✓ Định dạng: ${escHtml(info.format)}</span>`,
        `<span class="mn-mb-pill-stat">${info.pointsCount} điểm (${info.constrainedCount} khóa ràng buộc)</span>`,
        `<span class="mn-mb-pill-stat">${info.shapesCount} nét (${info.dashedCount} nét đứt)</span>`,
        `<span class="mn-mb-pill-stat ok">${info.stepsCount} bước • Hiệu ứng: ${escHtml(fxTxt)}</span>`
      ].join('');
    };

    impInput.addEventListener('input', updateImportValidationBadge);

    el.querySelector('#mn-mb-btn-pick-file').addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', () => {
      const f = fileInp.files && fileInp.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        impInput.value = String((ev.target && ev.target.result) || '');
        updateImportValidationBadge();
      };
      reader.readAsText(f, 'utf-8');
      fileInp.value = '';
    });

    impInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      impInput.classList.add('mn-mb-drop-active');
    });
    impInput.addEventListener('dragleave', () => impInput.classList.remove('mn-mb-drop-active'));
    impInput.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      impInput.classList.remove('mn-mb-drop-active');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        impInput.value = String((ev.target && ev.target.result) || '');
        updateImportValidationBadge();
      };
      reader.readAsText(f, 'utf-8');
    });

    el.querySelectorAll('[data-load-sample]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.loadSample;
        if (key === 'betatikz') {
          const bt = exportBetaTikzAnimated({ allowDemoFallback: true }).betatikzProject;
          impInput.value = JSON.stringify(bt, null, 2);
        } else if (QUICK_SAMPLES[key]) {
          impInput.value = JSON.stringify(QUICK_SAMPLES[key], null, 2);
        }
        updateImportValidationBadge();
      });
    });

    el.querySelector('#mn-mb-btn-clear-import').addEventListener('click', () => {
      impInput.value = '';
      updateImportValidationBadge();
    });

    el.querySelector('#mn-mb-btn-run-import').addEventListener('click', () => {
      const raw = impInput.value.trim();
      if (!raw) {
        toast('Vui lòng dán JSON hoặc chọn tệp .json trước khi nạp.', 'warn');
        return;
      }
      const presetOverride = el.querySelector('#mn-mb-import-fx-mode').value || '';
      const handPen = !!el.querySelector('#mn-mb-import-hand').checked;
      const followCamera = !!el.querySelector('#mn-mb-import-cam').checked;
      const autoPlay = !!el.querySelector('#mn-mb-import-autoplay').checked;

      try {
        const res = importMotionJson(raw, {
          presetOverride,
          handPen,
          followCamera,
          autoPlay,
          viewMode: 'full'
        });
        close();
        toast(`🚀 Đã nạp "${res.title}" (${res.points.length} điểm, ${res.steps.length} bước chuyển động)!`, 'success');
      } catch (err) {
        updateImportValidationBadge();
        toast('Lỗi nạp JSON: ' + (err.message || err), 'error');
      }
    });

    return el;
  }

  function renderTab1CodeBox() {
    if (!studioBackdrop || !studioState.lastAnimatedResult) return;
    const res = studioState.lastAnimatedResult;
    const ta = studioBackdrop.querySelector('#mn-mb-tikz-output');
    if (!ta) return;
    if (studioState.subView === 'animate') {
      ta.value = res.animateInlineTex || '';
    } else if (studioState.subView === 'cli') {
      ta.value = [
        '% 1. Lưu gói dự án bằng nút "📦 Xuất .betatikz.json" rồi mở trực tiếp trong giao diện BetaTikz',
        '% 2. Hoặc chạy render video MP4 vòng lặp trực tiếp qua CLI BetaTikz:',
        res.cliCommand,
        '',
        '% --- MÃ OUT_TIKZ LIÊN TỤC \\t IN [0, 1] ---',
        res.outTikz
      ].join('\n');
    } else {
      ta.value = res.outTikz || '';
    }
  }

  function refreshTab1() {
    if (!studioBackdrop) return;
    const res = exportBetaTikzAnimated({
      fps: studioState.fps,
      durationSec: studioState.durationSec,
      holdEndSec: studioState.holdEndSec,
      loop: studioState.loop,
      preset: studioState.preset || undefined,
      forcePreset: !!studioState.preset,
      orbit3d: studioState.orbit3d,
      followCamera: studioState.followCamera,
      allowDemoFallback: true
    });
    studioState.lastAnimatedResult = res;

    const demoNotice = studioBackdrop.querySelector('#mn-mb-demo-notice');
    if (demoNotice) {
      demoNotice.style.display = (res.isDemoFallback && studioState.tab !== 'import_json') ? 'flex' : 'none';
    }

    const tlBar = studioBackdrop.querySelector('#mn-mb-timeline-bar');
    const tlStats = studioBackdrop.querySelector('#mn-mb-tl-stats');
    if (tlBar) {
      const segs = (res.timeline || []).map((st, i) => {
        const [t0, t1] = st.tRange || [0, 0.1];
        const leftPct = (t0 * 100).toFixed(2);
        const widthPct = Math.max(1.2, (t1 - t0) * 100).toFixed(2);
        const fxCls = 'fx-' + (CANONICAL_EFFECTS.has(st.effect) ? st.effect : 'draw');
        return `<div class="mn-mb-tl-seg ${fxCls}" style="left:${leftPct}%;width:${widthPct}%;" title="Bước ${i + 1}: [${t0.toFixed(2)}..${t1.toFixed(2)}] • ${escHtml(st.effect)}">B${i + 1}</div>`;
      });
      if (studioState.holdEndSec > 0 && studioState.durationSec > 0) {
        const hRatio = clamp(studioState.holdEndSec / studioState.durationSec, 0.04, 0.38);
        const hLeft = ((1 - hRatio) * 100).toFixed(2);
        const hW = (hRatio * 100).toFixed(2);
        segs.push(`<div class="mn-mb-tl-seg fx-hold" style="left:${hLeft}%;width:${hW}%;" title="Giữ khung cuối (${studioState.holdEndSec}s)">Hold</div>`);
      }
      tlBar.innerHTML = segs.join('');
    }
    if (tlStats && res.stats) {
      const frames = Math.round(res.stats.fps * res.stats.durationSec);
      tlStats.textContent = `${res.stats.points} điểm • ${res.stats.shapes} nét • ${res.stats.steps} bước • ${frames} frames (${res.stats.fps} FPS)`;
    }
    renderTab1CodeBox();
  }

  function refreshTab2() {
    if (!studioBackdrop) return;
    const fullObj = exportMotionJson({
      mode: 'full',
      fps: studioState.fps,
      durationSec: studioState.durationSec,
      holdEndSec: studioState.holdEndSec,
      loop: studioState.loop,
      preset: studioState.preset || undefined,
      forcePreset: !!studioState.preset,
      orbit3d: studioState.orbit3d,
      allowDemoFallback: true
    });
    const targetObj = studioState.jsonMode === 'full'
      ? fullObj
      : exportMotionJson({
          mode: studioState.jsonMode,
          fps: studioState.fps,
          durationSec: studioState.durationSec,
          holdEndSec: studioState.holdEndSec,
          loop: studioState.loop,
          preset: studioState.preset || undefined,
          forcePreset: !!studioState.preset,
          orbit3d: studioState.orbit3d,
          allowDemoFallback: true
        });

    const fullStr = JSON.stringify(fullObj, null, 2);
    const outStr = studioState.jsonMode === 'compact_llm'
      ? JSON.stringify(targetObj, null, 2)
      : JSON.stringify(targetObj, null, 2);

    studioState.lastExportedJsonStr = outStr;
    const outTa = studioBackdrop.querySelector('#mn-mb-json-output');
    if (outTa) outTa.value = outStr;

    const statsBar = studioBackdrop.querySelector('#mn-mb-json-stats');
    if (statsBar) {
      const estTokens = Math.max(1, Math.round(outStr.length / 3.8));
      const savingsPct = fullStr.length > 0 ? Math.max(0, Math.round((1 - outStr.length / fullStr.length) * 100)) : 0;
      const fmtBadge = studioState.jsonMode === 'betatikz_project' ? BETATIKZ_FORMAT : SCHEMA_VERSION;
      statsBar.innerHTML = [
        `<span class="mn-mb-pill-stat ok">Chuẩn: ${escHtml(fmtBadge)}</span>`,
        `<span class="mn-mb-pill-stat">~${estTokens} tokens (${(outStr.length / 1024).toFixed(1)} KB)</span>`,
        studioState.jsonMode === 'compact_llm'
          ? `<span class="mn-mb-pill-stat ok">⚡ Tiết kiệm ${savingsPct}% dung lượng token cho AI ngoài</span>`
          : `<span class="mn-mb-pill-stat">Đầy đủ tọa độ tham số, kịch bản hiệu ứng &amp; mã TikZ</span>`
      ].join('');
    }
  }

  function refreshStudioContent() {
    refreshTab1();
    if (studioState.tab === 'export_json') refreshTab2();
    const demoNotice = studioBackdrop && studioBackdrop.querySelector('#mn-mb-demo-notice');
    if (demoNotice && studioState.tab === 'import_json') {
      demoNotice.style.display = 'none';
    }
  }

  function setStudioTab(tabId) {
    const normalized = (tabId === 'export_json' || tabId === 'json')
      ? 'export_json'
      : (tabId === 'import_json' || tabId === 'import' ? 'import_json' : 'betatikz');
    studioState.tab = normalized;
    const el = ensureStudioModal();
    el.querySelectorAll('[data-mb-tab]').forEach((b) => b.classList.toggle('active', b.dataset.mbTab === normalized));
    el.querySelectorAll('[data-mb-pane]').forEach((p) => p.classList.toggle('active', p.dataset.mbPane === normalized));
    refreshStudioContent();
  }

  function openStudioModal(defaultTab, opts) {
    registerMotionFxShortAliases();
    const w = getWin();
    const tabKey = String(defaultTab || 'betatikz').trim().toLowerCase();
    const isJsonRoute =
      tabKey === 'json' ||
      tabKey === 'export_json' ||
      tabKey === 'import_json' ||
      tabKey === 'import';

    if (isJsonRoute) {
      if (w && w.MinNoteAiGeo && typeof w.MinNoteAiGeo.open === 'function') {
        return w.MinNoteAiGeo.open(Object.assign({}, opts || {}, { tab: 'json' }));
      }
    } else {
      if (w && w.MinNoteTikzExport && typeof w.MinNoteTikzExport.openModal === 'function') {
        return w.MinNoteTikzExport.openModal(Object.assign({}, opts || {}, { mode: 'animated' }));
      }
    }

    const el = ensureStudioModal();
    setStudioTab(defaultTab || 'betatikz');
    el.classList.add('open');
    return el;
  }

  function closeStudioModal() {
    if (studioBackdrop) studioBackdrop.classList.remove('open');
  }

  function isStudioOpen() {
    return !!(studioBackdrop && studioBackdrop.classList.contains('open'));
  }

  // ============================================================================
  // 10. REPLAY PANEL QUICK PILLS INJECTION (MutationObserver — NO EDITS TO geo-motion-replay.js!)
  // ============================================================================
  function injectReplayPanelQuickPill() {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById('mn-replay-panel') || document.getElementById('mn-geo-replay-panel');
    if (!panel) return;
    const toolsBar = panel.querySelector('.mn-rp-tools-bar');
    if (!toolsBar) return;

    const legacyMixedBtn = toolsBar.querySelector('#mn-rp-motion-bridge');
    if (legacyMixedBtn) legacyMixedBtn.remove();

    if (!toolsBar.querySelector('#mn-rp-tikz-anim')) {
      const tikzBtn = document.createElement('button');
      tikzBtn.type = 'button';
      tikzBtn.id = 'mn-rp-tikz-anim';
      tikzBtn.className = 'mn-rp-tool-btn mn-rp-tikz-pill';
      tikzBtn.title = 'Xem & sao chép mã TikZ Chuyển Động / BetaTikz';
      tikzBtn.innerHTML = '📐 <span>TikZ Động</span>';
      tikzBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const w = getWin();
        if (w && w.MinNoteTikzExport && typeof w.MinNoteTikzExport.openModal === 'function') {
          w.MinNoteTikzExport.openModal({ mode: 'animated' });
        } else {
          openStudioModal('betatikz');
        }
      });
      toolsBar.appendChild(tikzBtn);
    }

    if (!toolsBar.querySelector('#mn-rp-json-io')) {
      const jsonBtn = document.createElement('button');
      jsonBtn.type = 'button';
      jsonBtn.id = 'mn-rp-json-io';
      jsonBtn.className = 'mn-rp-tool-btn mn-rp-json-pill';
      jsonBtn.title = 'Nạp hoặc lưu JSON hình học & chuyển động';
      jsonBtn.innerHTML = '📦 <span>JSON</span>';
      jsonBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const w = getWin();
        if (w && w.MinNoteAiGeo && typeof w.MinNoteAiGeo.open === 'function') {
          w.MinNoteAiGeo.open({ tab: 'json' });
        } else {
          openStudioModal('json');
        }
      });
      toolsBar.appendChild(jsonBtn);
    }
  }

  function initBrowserIntegrations() {
    const w = getWin();
    if (!w || typeof document === 'undefined') return;

    registerMotionFxShortAliases();

    const startObserver = () => {
      injectReplayPanelQuickPill();
      if (typeof MutationObserver !== 'undefined' && document.body) {
        const obs = new MutationObserver(() => {
          injectReplayPanelQuickPill();
          registerMotionFxShortAliases();
        });
        obs.observe(document.body, { childList: true, subtree: false });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    } else {
      startObserver();
    }

    w.addEventListener('minnote:aux-update', () => {
      injectReplayPanelQuickPill();
    });

    w.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        if (e.shiftKey) {
          if (w.MinNoteTikzExport && typeof w.MinNoteTikzExport.openModal === 'function') {
            const animAlreadyOpen =
              typeof w.MinNoteTikzExport.isOpen === 'function' &&
              w.MinNoteTikzExport.isOpen() &&
              typeof w.MinNoteTikzExport.getMode === 'function' &&
              w.MinNoteTikzExport.getMode() === 'animated';
            if (animAlreadyOpen && typeof w.MinNoteTikzExport.closeModal === 'function') {
              w.MinNoteTikzExport.closeModal();
            } else {
              w.MinNoteTikzExport.openModal({ mode: 'animated' });
            }
          } else if (isStudioOpen()) {
            closeStudioModal();
          } else {
            openStudioModal('betatikz');
          }
          return;
        }

        if (w.MinNoteAiGeo && typeof w.MinNoteAiGeo.open === 'function') {
          if (typeof w.MinNoteAiGeo.isOpen === 'function' && w.MinNoteAiGeo.isOpen() && typeof w.MinNoteAiGeo.close === 'function') {
            w.MinNoteAiGeo.close();
          } else {
            w.MinNoteAiGeo.open({ tab: 'json' });
          }
        } else if (isStudioOpen()) {
          closeStudioModal();
        } else {
          openStudioModal('json');
        }
        return;
      }
      if (e.key === 'Escape' && isStudioOpen()) {
        e.preventDefault();
        closeStudioModal();
      }
    });
  }

  initBrowserIntegrations();

  const api = {
    SCHEMA_VERSION,
    BETATIKZ_FORMAT,
    exportMotionJson,
    exportBetaTikzAnimated,
    importMotionJson,
    inspectMotionJson,
    openStudioModal,
    closeStudioModal,
    isStudioOpen,
    safeEvalMathNumber,
    cleanAndParseJson,
    parseBetaTikzTimelineAndCleanTikz,
    QUICK_SAMPLES
  };

  if (typeof window !== 'undefined') {
    window.MinNoteMotionBridge = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
