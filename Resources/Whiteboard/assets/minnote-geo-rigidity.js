/**
 * MinNote v0.0.9.14 — Geometric Rigidity (Khóa bất biến hình học cha → con)
 *
 * Quy ước: chỉ ĐỐI TƯỢNG CHA (point_free) được kéo. Mọi đối tượng CON sinh từ tính chất
 * (song song, vuông góc, quay, tổng véc-tơ, trung điểm, giao điểm…) bị khóa — chỉ đổi khi cha đổi.
 *
 *  - buildCubeOps(op)                 : macro `cube` → hình lập phương cứng (mặt trước là hình vuông thật,
 *                                       3 họ cạnh song song bằng nhau, nét khuất tự xác định).
 *  - rigidifyFreeVertices(ops, t, 3D) : healer — điểm AI khai báo `point_free` nhưng tọa độ đã thỏa tính chất
 *                                       (tịnh tiến lăng trụ, hình bình hành, vuông, chữ nhật, thang)
 *                                       được chuyển thành ràng buộc động ⇒ kéo cha không làm méo hình.
 * Thuần hàm, không phụ thuộc DOM → test bằng Node: `node scripts/test_geo_rigidity.js`.
 */
(function (root) {
  'use strict';

  const ANG_TOL_DEG = 1.5;
  const LEN_TOL = 0.03;
  const POS_TOL = 0.04;
  const QUAD_OPS = new Set(['connect_polygon', 'polygon_base', 'polygon_fill']);
  const VERTEX_RE = /[A-Z][0-9]*'*/g;
  const QUAD_KIND_RE = /(hình vuông|hinh vuong|square|hình chữ nhật|hinh chu nhat|rectangle|hình bình hành|hinh binh hanh|parallelogram|hình thoi|hinh thoi|rhombus|hình thang|hinh thang|trapezoid)\s*((?:[A-Z][0-9]*'*){4})(?![A-Za-z0-9'])/gi;
  const SOLID_NAME_RE = /((?:[A-Z][0-9]*){4})\.((?:[A-Z][0-9]*'){4})/g;

  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  const fmt = (v) => Number(Number(v).toFixed(4));
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const scale = (a, k) => ({ x: a.x * k, y: a.y * k });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const len = (a) => Math.hypot(a.x, a.y);
  const rotCCW = (u, deg) => {
    const r = deg * Math.PI / 180;
    return { x: u.x * Math.cos(r) - u.y * Math.sin(r), y: u.x * Math.sin(r) + u.y * Math.cos(r) };
  };
  const near = (a, b, tol) => len(sub(a, b)) <= tol;
  const angleBetweenDeg = (u, v) => {
    const c = dot(u, v) / ((len(u) * len(v)) || 1);
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  };

  function parseVertices(val) {
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    return String(val || '').match(VERTEX_RE) || [];
  }

  function parseSolidName(name, fallbackBot) {
    const raw = String(name || '').replace(/\s+/g, '');
    const dotIdx = raw.indexOf('.');
    if (dotIdx > 0) {
      const bot = parseVertices(raw.slice(0, dotIdx));
      const top = parseVertices(raw.slice(dotIdx + 1));
      if (bot.length === 4 && top.length === 4) return { bot, top };
    }
    return { bot: fallbackBot, top: fallbackBot.map(v => `${v}'`) };
  }

  /**
   * Macro hình lập phương ABCD.A'B'C'D' (phép chiếu song song chuẩn SGK).
   * Cha: A, B. A' = quay B quanh A 90° ⇒ mặt trước ABB'A' là HÌNH VUÔNG thật.
   * D = quay B quanh A góc depthAngle, tỉ số depthRatio (khóa; depthDrag:true ⇒ D là cha thứ 3).
   * C, B', C', D' = tổng véc-tơ ⇒ mọi cạnh cùng họ luôn song song & bằng nhau.
   * @param {object} op {name, edge, x, y, depthAngle, depthRatio, depthDrag, effect, step}
   * @returns {object[]} canonical ops
   */
  function buildCubeOps(op) {
    const { bot, top } = parseSolidName(op.name, ['A', 'B', 'C', 'D']);
    const [A, B, C, D] = bot;
    const [A1, B1, C1, D1] = top;
    const edge = Math.max(0.8, num(op.edge ?? op.size, 3.2));
    let ang = num(op.depthAngle ?? op.angle, 40);
    if (ang < 15 || ang > 165 || Math.abs(ang - 90) < 12) ang = 40;
    const ratio = Math.min(0.75, Math.max(0.3, num(op.depthRatio ?? op.ratio, 0.5)));
    const ax = num(op.x, ang < 90 ? -2.2 : -0.9);
    const ay = num(op.y, -2.1);
    const fx = op.effect ? { effect: op.effect } : {};
    const hidden = ang < 90 ? D : C;
    const dep = scale(rotCCW({ x: edge, y: 0 }, ang), ratio);
    const depthOp = op.depthDrag === true
      ? { op: 'point_free', id: D, x: fmt(ax + dep.x), y: fmt(ay + dep.y), step: `Đỉnh ${D} (hướng chiều sâu — kéo được)` }
      : { op: 'rotate', id: D, center: A, point: B, angleDeg: fmt(ang), k: fmt(ratio), step: `Đỉnh ${D}: chiều sâu ${fmt(ang)}°, tỉ lệ ${fmt(ratio)} (khóa)` };
    const ops = [
      { op: 'point_free', id: A, x: fmt(ax), y: fmt(ay), step: `Đặt đỉnh ${A}` },
      { op: 'point_free', id: B, x: fmt(ax + edge), y: fmt(ay), step: `Đặt đỉnh ${B} (cạnh cha ${A}${B})` },
      { op: 'rotate', id: A1, center: A, point: B, angleDeg: 90, k: 1, step: `${A1} = quay ${B} quanh ${A} 90° ⇒ ${A}${B}${B1}${A1} là hình vuông` },
      depthOp,
      { op: 'point_sum', id: C, a: B, b: D, c: A, step: `${C} = ${B} + ${D} − ${A}` },
      { op: 'point_sum', id: B1, a: B, b: A1, c: A, step: `${B}${B1} // = ${A}${A1}` },
      { op: 'point_sum', id: C1, a: C, b: A1, c: A, step: `${C}${C1} // = ${A}${A1}` },
      { op: 'point_sum', id: D1, a: D, b: A1, c: A, step: `${D}${D1} // = ${A}${A1}` }
    ];
    const edges = [[A, B], [B, C], [C, D], [D, A], [A1, B1], [B1, C1], [C1, D1], [D1, A1], [A, A1], [B, B1], [C, C1], [D, D1]];
    const visible = edges.filter(e => !e.includes(hidden));
    const back = edges.filter(e => e.includes(hidden));
    visible.forEach(([a, b], i) => ops.push({
      op: 'segment', a, b, dashed: false, ...fx,
      ...(i === 0 ? { step: op.step || `Dựng hình lập phương ${bot.join('')}.${top.join('')}` } : {})
    }));
    back.forEach(([a, b]) => ops.push({ op: 'segment', a, b, dashed: true, ...fx, step: `Cạnh khuất ${a}${b}` }));
    return ops;
  }

  /* ---------------- Healer ---------------- */

  function refsOf(o) {
    if (!o) return [];
    const pair = (v) => (Array.isArray(v) ? v.map(String) : parseVertices(v));
    switch (o.op) {
      case 'point_sum': return [o.a, o.b, o.c];
      case 'rotate': return [o.center ?? o.o, o.point ?? o.p];
      case 'line_parallel':
      case 'line_perp': {
        const ab = o.a && o.b ? [o.a, o.b] : pair(o.line || o.s);
        return [o.through ?? o.o ?? o.p, ...ab];
      }
      default:
        return ['a', 'b', 'p', 'center', 'point', 'through'].map(k => o[k]).filter(v => typeof v === 'string');
    }
  }

  function makeResolver(ops) {
    const byId = new Map();
    ops.forEach((o, i) => { if (o && o.id !== undefined) byId.set(String(o.id), i); });
    const cache = new Map();
    const opOf = (id) => {
      const i = byId.get(id);
      return i === undefined ? null : ops[i];
    };
    const coord = (id, guard = new Set()) => {
      if (cache.has(id)) return cache.get(id);
      const o = opOf(id);
      if (!o || guard.has(id)) return null;
      guard.add(id);
      const r = refsOf(o).map(x => (typeof x === 'string' ? coord(x, guard) : null));
      let c = null;
      if (o.op === 'point_free') c = { x: num(o.x, NaN), y: num(o.y, NaN) };
      else if (o.op === 'point_sum' && r.every(Boolean)) c = add(r[0], sub(r[1], r[2]));
      else if (o.op === 'rotate' && r.every(Boolean)) c = add(r[0], scale(rotCCW(sub(r[1], r[0]), num(o.angleDeg, 0)), num(o.k, 1)));
      else if ((o.op === 'line_parallel' || o.op === 'line_perp') && r.length === 3 && r.every(Boolean)) {
        const d = o.op === 'line_perp' ? rotCCW(sub(r[2], r[1]), 90) : sub(r[2], r[1]);
        c = add(r[0], scale(d, num(o.k, 1)));
      }
      if (c && !(Number.isFinite(c.x) && Number.isFinite(c.y))) c = null;
      cache.set(id, c);
      return c;
    };
    const dependsOn = (id, target, seen = new Set()) => {
      if (id === target) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return refsOf(opOf(id)).some(x => typeof x === 'string' && dependsOn(x, target, seen));
    };
    const isFree = (id) => {
      const o = opOf(id);
      return !!o && o.op === 'point_free';
    };
    return { coord, dependsOn, isFree, byId };
  }

  function figureScale(ops) {
    const pts = ops.filter(o => o && o.op === 'point_free').map(o => ({ x: num(o.x, 0), y: num(o.y, 0) }));
    if (pts.length < 2) return 1;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return Math.max(1, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
  }

  function collectQuads(ops, ctx) {
    const quads = [];
    const seen = new Set();
    const push = (pts, kind) => {
      if (pts.length !== 4) return;
      const key = pts.join('|');
      if (seen.has(key)) return;
      seen.add(key);
      quads.push({ pts, kind });
    };
    for (const m of ctx.matchAll(QUAD_KIND_RE)) {
      const k = m[1].toLowerCase();
      const kind = /vuông|vuong|square/.test(k) ? 'square'
        : (/chữ nhật|chu nhat|rectangle/.test(k) ? 'rect'
          : (/thang|trapezoid/.test(k) ? 'trapezoid' : 'parallelogram'));
      push(parseVertices(m[2]), kind);
    }
    for (const m of ctx.matchAll(SOLID_NAME_RE)) push(parseVertices(m[1]), 'parallelogram');
    for (const o of ops) {
      if (o && QUAD_OPS.has(o.op)) push(parseVertices(o.pts), 'polygon');
    }
    return quads;
  }

  /** Replace the op producing a point by a constraint op, keeping its presentation fields (immutable). */
  function demote(ops, idx, constraint) {
    const old = ops[idx];
    const keep = {};
    for (const k of ['label', 'show', 'noDot', 'step', 'effect', 'easing', 'durationMul', 'delayMs']) {
      if (old[k] !== undefined) keep[k] = old[k];
    }
    return ops.map((o, i) => (i === idx ? { ...keep, ...constraint, id: old.id } : o));
  }

  /** R1 — prism/box translation: X' free ≈ X + (A' − A) ⇒ X' = X + A' − A. */
  function rigidifyPrimeTranslation(inputOps, tol, fixes) {
    let ops = inputOps;
    const R = makeResolver(ops);
    const pairs = [...R.byId.keys()]
      .filter(id => /'$/.test(id) && R.isFree(id) && R.byId.has(id.slice(0, -1)))
      .map(id => ({ base: id.slice(0, -1), prime: id }))
      .sort((p, q) => R.byId.get(p.prime) - R.byId.get(q.prime));
    if (pairs.length < 2) return { ops, anchor: null };
    const anchor = pairs[0];
    const ca = R.coord(anchor.base), cap = R.coord(anchor.prime);
    if (!ca || !cap) return { ops, anchor: null };
    const v = sub(cap, ca);
    for (const p of pairs.slice(1)) {
      const cb = R.coord(p.base), cbp = R.coord(p.prime);
      if (cb && cbp && near(cbp, add(cb, v), tol) && !R.dependsOn(p.base, p.prime)) {
        ops = demote(ops, R.byId.get(p.prime), { op: 'point_sum', a: p.base, b: anchor.prime, c: anchor.base });
        fixes.push(`Khóa ${p.prime} = ${p.base} + ${anchor.prime} − ${anchor.base} (cạnh bên // = ${anchor.base}${anchor.prime}).`);
      }
    }
    return { ops, anchor };
  }

  /** Lateral edge A→A' ⊥ base edge A→Y: cube ⇒ rotate 90° (square face), box/upright prism ⇒ line_perp. */
  function rigidifyLateralEdge(ops, anchor, isCube, fixes) {
    const R = makeResolver(ops);
    if (!anchor || !R.isFree(anchor.prime)) return ops;
    const ca = R.coord(anchor.base), cap = R.coord(anchor.prime);
    if (!ca || !cap) return ops;
    const up = sub(cap, ca);
    const neighbours = [...R.byId.keys()].filter(id => id !== anchor.base && !/'$/.test(id) && R.byId.has(`${id}'`));
    for (const y of neighbours) {
      const cy = R.coord(y);
      if (!cy || R.dependsOn(y, anchor.prime)) continue;
      const u = sub(cy, ca);
      if (Math.abs(angleBetweenDeg(u, up) - 90) > ANG_TOL_DEG) continue;
      const turn = dot(up, rotCCW(u, 90)) > 0 ? 90 : -90;
      if (isCube) {
        if (Math.abs(len(up) / len(u) - 1) > LEN_TOL) continue;
        fixes.push(`Khóa ${anchor.prime} = quay ${y} quanh ${anchor.base} ${turn}° (mặt bên là hình vuông).`);
        return demote(ops, R.byId.get(anchor.prime), { op: 'rotate', center: anchor.base, point: y, angleDeg: turn, k: 1 });
      }
      const k = fmt(dot(up, rotCCW(u, 90)) / dot(u, u));
      fixes.push(`Khóa ${anchor.base}${anchor.prime} ⊥ ${anchor.base}${y} (chỉ trượt theo phương vuông góc).`);
      return demote(ops, R.byId.get(anchor.prime), { op: 'line_perp', through: anchor.base, a: anchor.base, b: y, k, drawSegment: false, drag: true });
    }
    return ops;
  }

  /**
   * Try to lock vertex P = n[i] of quad n (cyclic). prev = n[i−1], next = n[i+1], opp = n[i+2].
   * prev's two neighbours are P and opp ⇒ right angle tests are made at prev.
   */
  function lockQuadVertex(ops, quad, i, is3D, tol, fixes) {
    const n = quad.pts;
    const P = n[i], prev = n[(i + 3) % 4], next = n[(i + 1) % 4], opp = n[(i + 2) % 4];
    const R = makeResolver(ops);
    // Each constraint may only reference points that do not (transitively) depend on P — no cycles.
    const usable = (ids) => ids.every(id => R.coord(id) && !R.dependsOn(id, P));
    const cP = R.coord(P);
    if (!R.isFree(P) || !cP || !usable([prev, opp])) return ops;
    const cPrev = R.coord(prev), cOpp = R.coord(opp);
    const nextOk = usable([next]);
    const cNext = nextOk ? R.coord(next) : null;
    const name = n.join('');
    if (nextOk && quad.kind !== 'trapezoid' && near(cP, add(cPrev, sub(cNext, cOpp)), tol)) {
      fixes.push(`Khóa ${P} = ${prev} + ${next} − ${opp} (hình bình hành ${name}).`);
      return demote(ops, R.byId.get(P), { op: 'point_sum', a: prev, b: next, c: opp });
    }
    if (is3D) return ops; // ảnh song song của góc vuông không còn vuông ⇒ trong 3D chỉ khóa song song
    const e1 = sub(cP, cPrev), e0 = sub(cOpp, cPrev);
    if ((quad.kind === 'square' || quad.kind === 'rect') && Math.abs(angleBetweenDeg(e1, e0) - 90) <= ANG_TOL_DEG) {
      const turn = dot(e1, rotCCW(e0, 90)) > 0 ? 90 : -90;
      if (quad.kind === 'square' && Math.abs(len(e1) / len(e0) - 1) <= LEN_TOL) {
        fixes.push(`Khóa ${P} = quay ${opp} quanh ${prev} ${turn}° (hình vuông ${name}).`);
        return demote(ops, R.byId.get(P), { op: 'rotate', center: prev, point: opp, angleDeg: turn, k: 1 });
      }
      if (quad.kind === 'rect') {
        const k = fmt(dot(e1, rotCCW(e0, 90)) / dot(e0, e0));
        fixes.push(`Khóa ${prev}${P} ⊥ ${prev}${opp} (hình chữ nhật ${name}).`);
        return demote(ops, R.byId.get(P), { op: 'line_perp', through: prev, a: prev, b: opp, k, drawSegment: false, drag: true });
      }
    }
    if (quad.kind === 'trapezoid' && nextOk) {
      const side = sub(cP, cPrev), base = sub(cNext, cOpp);
      const a = angleBetweenDeg(side, base);
      if (a <= ANG_TOL_DEG || a >= 180 - ANG_TOL_DEG) {
        fixes.push(`Khóa ${prev}${P} // ${opp}${next} (hình thang ${name}).`);
        return demote(ops, R.byId.get(P), { op: 'line_parallel', through: prev, a: opp, b: next, k: fmt(dot(side, base) / dot(base, base)), drawSegment: false, drag: true });
      }
    }
    return ops;
  }

  /**
   * @param {object[]} inputOps canonical ops (after macro expansion & alias normalization)
   * @param {string} contextText title + problem + step texts
   * @param {boolean} is3D
   * @returns {{ops: object[], fixes: string[]}}
   */
  function rigidifyFreeVertices(inputOps, contextText = '', is3D = false) {
    const fixes = [];
    const ctx = String(contextText || '');
    let ops = Array.isArray(inputOps) ? inputOps.slice() : [];
    const tol = POS_TOL * figureScale(ops);
    const isCube = /lập phương|lap phuong|\bcube\b/i.test(ctx);
    const isUpright = isCube || /hộp chữ nhật|hop chu nhat|lăng trụ đứng|lang tru dung|cuboid/i.test(ctx);

    const r1 = rigidifyPrimeTranslation(ops, tol, fixes);
    ops = r1.ops;
    if (isUpright) ops = rigidifyLateralEdge(ops, r1.anchor, isCube, fixes);

    // Last vertices become children first (D, C), so the first-named vertices stay the parents.
    for (const quad of collectQuads(ops, ctx)) {
      for (let i = 3; i >= 0; i--) ops = lockQuadVertex(ops, quad, i, is3D, tol, fixes);
    }
    return { ops, fixes };
  }

  const api = { buildCubeOps, rigidifyFreeVertices, parseVertices };
  if (root && typeof root === 'object') root.MinNoteGeoRigidity = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
