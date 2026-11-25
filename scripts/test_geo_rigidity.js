// Assertion tests: geometric rigidity (cha → con) — run: node scripts/test_geo_rigidity.js
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets');
const R = require(path.join(ASSETS, 'minnote-geo-rigidity.js'));
const G = require(path.join(ASSETS, 'minnote-ai-geo.js'));

const EPS = 1e-6;
const rot = (u, deg) => {
  const r = deg * Math.PI / 180;
  return { x: u.x * Math.cos(r) - u.y * Math.sin(r), y: u.x * Math.sin(r) + u.y * Math.cos(r) };
};
const pairOf = (o) => (o.a && o.b ? [o.a, o.b] : String(o.line || o.s || '').split('-'));

/** Evaluate canonical ops (math +y up) with optional overrides of free points (simulated drag). */
function evalOps(ops, drag = {}) {
  const byId = new Map(ops.filter(o => o.id).map(o => [o.id, o]));
  const memo = new Map();
  const P = (id) => {
    if (memo.has(id)) return memo.get(id);
    const o = byId.get(id);
    assert.ok(o, `missing point ${id}`);
    let c;
    if (o.op === 'point_free') c = drag[id] || { x: +o.x, y: +o.y };
    else if (o.op === 'midpoint') { const [a, b] = pairOf(o).map(P); c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    else if (o.op === 'point_sum') { const a = P(o.a), b = P(o.b), cc = P(o.c); c = { x: a.x + b.x - cc.x, y: a.y + b.y - cc.y }; }
    else if (o.op === 'rotate') { const ce = P(o.center), p = P(o.point), w = rot({ x: p.x - ce.x, y: p.y - ce.y }, +o.angleDeg); c = { x: ce.x + w.x * (o.k ?? 1), y: ce.y + w.y * (o.k ?? 1) }; }
    else if (o.op === 'line_parallel' || o.op === 'line_perp') {
      const [a, b] = pairOf(o).map(P), t = P(o.through);
      const d = o.op === 'line_perp' ? rot({ x: b.x - a.x, y: b.y - a.y }, 90) : { x: b.x - a.x, y: b.y - a.y };
      c = { x: t.x + d.x * o.k, y: t.y + d.y * o.k };
    } else throw new Error(`unsupported ${o.op}`);
    memo.set(id, c);
    return c;
  };
  return P;
}
const v = (P, a, b) => ({ x: P(b).x - P(a).x, y: P(b).y - P(a).y });
const len = (u) => Math.hypot(u.x, u.y);
const dot = (u, w) => u.x * w.x + u.y * w.y;
const cross = (u, w) => u.x * w.y - u.y * w.x;
const isPar = (u, w) => Math.abs(cross(u, w)) < EPS * Math.max(1, len(u) * len(w));
const sameVec = (u, w) => Math.abs(u.x - w.x) < EPS && Math.abs(u.y - w.y) < EPS;
const freeIds = (ops) => ops.filter(o => o.op === 'point_free').map(o => o.id).sort();

function assertCube(P) {
  const ab = v(P, 'A', 'B'), aa = v(P, 'A', "A'");
  assert.ok(Math.abs(dot(ab, aa)) < EPS, "AB ⊥ AA'");
  assert.ok(Math.abs(len(ab) - len(aa)) < EPS, "|AB| = |AA'| (mặt trước là hình vuông)");
  for (const X of ['B', 'C', 'D']) assert.ok(sameVec(v(P, X, `${X}'`), aa), `${X}${X}' // = AA'`);
  assert.ok(sameVec(v(P, 'B', 'C'), v(P, 'A', 'D')), 'BC // = AD');
  assert.ok(isPar(v(P, "A'", "B'"), ab) && isPar(v(P, "D'", "C'"), ab), "A'B' // D'C' // AB");
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const DRAGS = [{}, { B: { x: 2.7, y: -0.4 } }, { A: { x: -3, y: -3 }, B: { x: 0.5, y: -1.2 } }];

test('cube macro: only A, B are parents; every drag keeps cube invariants', () => {
  const ops = R.buildCubeOps({ name: "ABCD.A'B'C'D'" });
  assert.deepStrictEqual(freeIds(ops), ['A', 'B']);
  for (const d of DRAGS) assertCube(evalOps(ops, d));
});

test('cube macro: hidden vertex D (depth up-right), C (depth up-left)', () => {
  const dashedOf = (ops) => ops.filter(o => o.op === 'segment' && o.dashed).map(o => `${o.a}${o.b}`).sort();
  assert.deepStrictEqual(dashedOf(R.buildCubeOps({ depthAngle: 40 })), ['CD', 'DA', "DD'"].sort());
  assert.deepStrictEqual(dashedOf(R.buildCubeOps({ depthAngle: 135 })), ['BC', "CC'", 'CD'].sort());
  assert.strictEqual(R.buildCubeOps({}).filter(o => o.op === 'segment').length, 12);
});

test('healer: 8 free cube points + "lập phương" ⇒ rigid cube', () => {
  const pts = { A: [-2, -2], B: [1, -2], D: [-0.8, -0.9], C: [2.2, -0.9], "A'": [-2, 1], "B'": [1, 1], "C'": [2.2, 2.1], "D'": [-0.8, 2.1] };
  const ops = Object.entries(pts).map(([id, [x, y]]) => ({ op: 'point_free', id, x, y }));
  const out = R.rigidifyFreeVertices(ops, "Cho hình lập phương ABCD.A'B'C'D'", true);
  assert.ok(!freeIds(out.ops).includes("A'") && !freeIds(out.ops).includes("C'"), 'primes locked');
  assert.ok(freeIds(out.ops).length <= 3, `parents only: ${freeIds(out.ops)}`);
  for (const d of DRAGS) assertCube(evalOps(out.ops, d));
});

test('healer 2D: free square ABCD ⇒ A, B parents, stays square under drag', () => {
  const sq = { A: [0, 0], B: [2, 0], C: [2, 2], D: [0, 2] };
  const ops = Object.entries(sq).map(([id, [x, y]]) => ({ op: 'point_free', id, x, y }));
  const out = R.rigidifyFreeVertices(ops, 'Cho hình vuông ABCD', false);
  assert.deepStrictEqual(freeIds(out.ops), ['A', 'B']);
  for (const d of DRAGS) {
    const P = evalOps(out.ops, d);
    const ab = v(P, 'A', 'B'), bc = v(P, 'B', 'C'), ad = v(P, 'A', 'D');
    assert.ok(Math.abs(dot(ab, bc)) < EPS && Math.abs(len(ab) - len(bc)) < EPS && sameVec(ad, bc), 'square kept');
  }
});

test('healer 2D: rectangle keeps right angles, height stays draggable (drag:true)', () => {
  const ops = [['A', 0, 0], ['B', 3, 0], ['C', 3, 1.5], ['D', 0, 1.5]].map(([id, x, y]) => ({ op: 'point_free', id, x, y }));
  const out = R.rigidifyFreeVertices(ops, 'hình chữ nhật ABCD', false);
  assert.deepStrictEqual(freeIds(out.ops), ['A', 'B']);
  assert.strictEqual(out.ops.find(o => o.id === 'C').drag, true);
  const P = evalOps(out.ops, { B: { x: 2, y: 1 } });
  assert.ok(Math.abs(dot(v(P, 'A', 'B'), v(P, 'B', 'C'))) < EPS && sameVec(v(P, 'A', 'D'), v(P, 'B', 'C')));
});

test('healer 2D: trapezoid AB // CD survives dragging A', () => {
  const ops = [['A', -2, 0], ['B', 3, 0], ['C', 2, 2], ['D', -1, 2]].map(([id, x, y]) => ({ op: 'point_free', id, x, y }));
  const out = R.rigidifyFreeVertices(ops, 'hình thang ABCD', false);
  assert.strictEqual(out.ops.find(o => o.id === 'D').op, 'line_parallel');
  const P = evalOps(out.ops, { A: { x: -2.5, y: -0.6 } });
  assert.ok(isPar(v(P, 'A', 'B'), v(P, 'D', 'C')));
});

test('healer: no false positive on a generic quadrilateral', () => {
  const ops = [['A', -2, 0], ['B', 3, 0.4], ['C', 2, 2], ['D', -1, 2.6]].map(([id, x, y]) => ({ op: 'point_free', id, x, y }));
  const out = R.rigidifyFreeVertices([...ops, { op: 'connect_polygon', pts: ['A', 'B', 'C', 'D'] }], 'tứ giác ABCD', false);
  assert.deepStrictEqual(freeIds(out.ops), ['A', 'B', 'C', 'D']);
  assert.strictEqual(out.fixes.length, 0);
});

test('integration: {"op":"cube"} through validateAndHealAiGeoPlan stays rigid', () => {
  const plan = G.validateAndHealAiGeoPlan({ schema: 'mn-geo-motion/2.0', is3D: true, ops: [{ op: 'cube', name: "ABCD.A'B'C'D'" }] });
  assert.deepStrictEqual(freeIds(plan.ops), ['A', 'B']);
  for (const d of DRAGS) assertCube(evalOps(plan.ops, d));
});

test('integration: tuple DSL ["cube", name, edge, opts] expands to the rigid cube', () => {
  const plan = G.validateAndHealAiGeoPlan({ is3D: true, ops: [['cube', "ABCD.A'B'C'D'", 3.2, { depthAngle: 135 }]] });
  assert.deepStrictEqual(freeIds(plan.ops), ['A', 'B']);
  assertCube(evalOps(plan.ops, { B: { x: 1, y: -1 } }));
});

test('integration: prism baseType "cube" is routed to the cube macro', () => {
  const plan = G.validateAndHealAiGeoPlan({ is3D: true, ops: [{ op: 'prism', name: "ABCD.A'B'C'D'", baseType: 'cube' }] });
  assert.deepStrictEqual(freeIds(plan.ops), ['A', 'B']);
});

test("integration: upright box prism — AA' ⊥ AD locked, height draggable", () => {
  const plan = G.validateAndHealAiGeoPlan({ is3D: true, ops: [{ op: 'prism', name: "ABCD.A'B'C'D'", baseType: 'rect', upright: true }] });
  const a1 = plan.ops.find(o => o.id === "A'");
  assert.strictEqual(a1.op, 'line_perp');
  assert.strictEqual(a1.drag, true);
});

test('integration: explicit free points + "hình vuông" title are healed', () => {
  const plan = G.validateAndHealAiGeoPlan({
    title: 'Hình vuông ABCD', is3D: false,
    ops: [{ op: 'points', pts: { A: [0, 0], B: [2, 0], C: [2, 2], D: [0, 2] } }, { op: 'connect_polygon', pts: ['A', 'B', 'C', 'D'] }]
  });
  assert.deepStrictEqual(freeIds(plan.ops), ['A', 'B']);
});

test('kernel patch: parallel/perpendicular children are not draggable unless drag:true', () => {
  const src = fs.readFileSync(path.join(ASSETS, 'index-CTbULhps.js'), 'utf8');
  const m = src.match(/const EN=e=>\{[^]*?return!1\};/);
  assert.ok(m, 'EN predicate found');
  const EN = new Function(`${m[0]}; return EN;`)();
  assert.strictEqual(EN({ def: { t: 'free', x: 0, y: 0 } }), true);
  assert.strictEqual(EN({ def: { t: 'vec', o: 'a', a: 'a', b: 'b', k: 1 } }), false, 'vec locked by default');
  assert.strictEqual(EN({ def: { t: 'vec', o: 'a', a: 'a', b: 'b', k: 1, drag: true } }), true, 'vec drag:true slides');
  assert.strictEqual(EN({ def: { t: 'on', a: 'a', b: 'b', k: 0.3 } }), true, 'glider stays draggable');
  assert.strictEqual(EN({ def: { t: 'on', a: 'a', b: 'b', k: 0.3, lock: true } }), false, 'lock:true pins glider');
  assert.strictEqual(EN({ def: { t: 'rot', c: 'a', p: 'b', ang: 90 } }), false);
});

const EXAMPLE = path.join(__dirname, '..', 'prompts', 'examples', 'cube_section_DKF_unfolded.json');
const compileSig = (plan) => {
  const c = G.compileAiGeoPlan(JSON.parse(JSON.stringify(plan)), null, null);
  const byId = Object.fromEntries(Object.values(c.points).map(q => [q.id, q]));
  const nm = (id) => (byId[id] && byId[id].label) || id;
  return { c, segs: c.shapes.filter(s => s.kind === 'segment').map(s => ({ name: s.pts.map(nm).join(''), dashed: !!s.dashed, ids: s.pts })) };
};

test('example cube_section_DKF_unfolded: parents A,B,A1,B1; only edges through C are dashed', () => {
  const plan = JSON.parse(fs.readFileSync(EXAMPLE, 'utf8'));
  assert.deepStrictEqual(freeIds(G.validateAndHealAiGeoPlan(plan).ops), ['A', 'A1', 'B', 'B1']);
  const { c, segs } = compileSig(plan);
  const cubeEdges = new Set(['AB', 'BC', 'CD', 'DA', "A'B'", "B'C'", "C'D'", "D'A'", "AA'", "BB'", "CC'", "DD'"]);
  const dashedCube = segs.filter(s => cubeEdges.has(s.name) && s.dashed).map(s => s.name).sort();
  assert.deepStrictEqual(dashedCube, ['BC', "CC'", 'CD']);
  // flat sub-figure = free A1/B1 (labels A', B' on free points) + everything depending only on them
  const pts = Object.values(c.points);
  const flatIds = new Set(pts.filter(q => q.def.t === 'free' && ["A'", "B'"].includes(q.label)).map(q => q.id));
  const refs = (d) => ['a', 'b', 'c', 'p', 'o'].map(k => d[k]).filter(x => typeof x === 'string');
  for (let grow = true; grow;) {
    grow = false;
    for (const q of pts) {
      const r = refs(q.def);
      if (!flatIds.has(q.id) && r.length && r.every(id => flatIds.has(id))) { flatIds.add(q.id); grow = true; }
    }
  }
  const flatSegs = segs.filter(s => s.ids.every(id => flatIds.has(id)));
  assert.ok(flatSegs.length >= 6, `unfolded square + KF + A'C' present (${flatSegs.length})`);
  assert.ok(flatSegs.every(s => !s.dashed), 'unfolded (flat) figure is never dashed');
});

test('2D prompt recipes: right / isosceles triangle, rhombus keep their property under drag', () => {
  const rt = G.validateAndHealAiGeoPlan({ is3D: false, ops: [
    { op: 'points', pts: { A: [0, 0], B: [3, 0] } },
    { op: 'line_perp', id: 'C', through: 'A', line: 'A-B', k: 0.7, drag: true, drawSegment: false }] });
  let P = evalOps(rt.ops, { B: { x: 2, y: 1.5 } });
  assert.ok(Math.abs(dot(v(P, 'A', 'B'), v(P, 'A', 'C'))) < EPS, 'right angle at A');
  const iso = G.validateAndHealAiGeoPlan({ is3D: false, ops: [
    { op: 'points', pts: { B: [-2, 0], C: [2, 0] } }, { op: 'midpoint', id: 'H', s: 'B-C' },
    { op: 'line_perp', id: 'A', through: 'H', line: 'B-C', k: 0.8, drag: true, drawSegment: false }] });
  P = evalOps(iso.ops, { C: { x: 3, y: 1 } });
  assert.ok(Math.abs(len(v(P, 'A', 'B')) - len(v(P, 'A', 'C'))) < EPS, 'AB = AC');
  const rh = G.validateAndHealAiGeoPlan({ is3D: false, ops: [
    { op: 'points', pts: { A: [0, 0], B: [3, 0] } },
    { op: 'rotate', id: 'D', center: 'A', point: 'B', angleDeg: 65, k: 1 },
    { op: 'point_sum', id: 'C', a: 'B', b: 'D', c: 'A' }] });
  P = evalOps(rh.ops, { B: { x: 2, y: 2 } });
  assert.ok(Math.abs(len(v(P, 'A', 'B')) - len(v(P, 'A', 'D'))) < EPS && sameVec(v(P, 'B', 'C'), v(P, 'A', 'D')), 'rhombus kept');
});

test('prompts sent to external AIs carry the cha–con rules and the cube macro', () => {
  for (const txt of [G.buildDetailedExternalPrompt('đề'), G.getSystemPrompt()]) {
    assert.ok(txt.includes('LUẬT CHA–CON'), 'rules block');
    assert.ok(txt.includes('"op":"cube"'), 'cube macro');
    assert.ok(txt.includes('"drag":true') || txt.includes('"drag": true'), 'drag flag');
    assert.ok(txt.includes('"lock": true'), 'lock flag');
  }
  const md = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'PROMPT_CHUAN_DUNG_HINH_MINNOTE.md'), 'utf8');
  assert.ok(md.includes('LUẬT CHA–CON') && md.includes('"op":"cube"'), 'markdown master prompt updated');
});

const L = require(path.join(ASSETS, 'minnote-geo-lock-ui.js'));

test('lock UI: free point lock/unlock round-trip, child stays locked', () => {
  const pts = {
    a: { id: 'a', label: 'A', def: { t: 'free', x: 0, y: 0 } },
    b: { id: 'b', label: 'B', def: { t: 'free', x: 1, y: 0 } },
    r: { id: 'r', label: "A'", def: { t: 'rot', c: 'a', p: 'b', ang: -90, k: 1 } },
    v: { id: 'v', label: 'C', def: { t: 'vec', o: 'a', a: 'a', b: 'b', k: 1 } }
  };
  assert.strictEqual(L.lockInfo(pts.a, pts).movable, true);
  const locked = L.applyToggle({ points: pts }, L.planToggle(['a'], pts));
  assert.strictEqual(L.isMovable(locked.points.a), false, 'A locked');
  assert.strictEqual(pts.a.def.lock, undefined, 'immutable: original untouched');
  const unlocked = L.applyToggle(locked, L.planToggle(['a'], locked.points));
  assert.strictEqual(L.isMovable(unlocked.points.a), true, 'A unlocked again');
  const info = L.lockInfo(pts.r, pts);
  assert.ok(!info.movable && !info.canToggle && /phép quay của A, B/.test(info.text), info.text);
  assert.deepStrictEqual(L.planToggle(['r'], pts), { action: null, ids: [] }, 'rot child cannot be unlocked');
});

test('lock UI: parallel/perpendicular child unlock ⇒ drag:true (slides), lock ⇒ removes drag', () => {
  const pts = { v: { id: 'v', label: 'C', def: { t: 'vec', o: 'a', a: 'a', b: 'b', k: 1, perp: true } } };
  assert.strictEqual(L.lockInfo(pts.v, pts).text.includes('đường vuông góc'), true);
  const p1 = L.planToggle(['v'], pts);
  assert.strictEqual(p1.action, 'unlock');
  const g1 = L.applyToggle({ points: pts }, p1);
  assert.strictEqual(g1.points.v.def.drag, true);
  assert.strictEqual(L.isMovable(g1.points.v), true);
  const g2 = L.applyToggle(g1, L.planToggle(['v'], g1.points));
  assert.strictEqual(g2.points.v.def.drag, undefined);
  assert.strictEqual(L.isMovable(g2.points.v), false);
});

test('lock UI: fallback isMovable matches patched kernel EN', () => {
  const src = fs.readFileSync(path.join(ASSETS, 'index-CTbULhps.js'), 'utf8');
  const EN = new Function(`${src.match(/const EN=e=>\{[^]*?return!1\};/)[0]}; return EN;`)();
  const defs = [{ t: 'free' }, { t: 'free', lock: true }, { t: 'vec' }, { t: 'vec', drag: true }, { t: 'on', k: 0.3 }, { t: 'on', lock: true },
    { t: 'path' }, { t: 'rot' }, { t: 'sum' }, { t: 'mid' }, { t: 'len' }, { t: 'polar', fixedDist: true, fixedAng: true }];
  for (const def of defs) assert.strictEqual(L.isMovable({ def }), EN({ def }), JSON.stringify(def));
});

test('kernel patch: selection bar carries the icon-only lock with hover info (old text button removed)', () => {
  const src = fs.readFileSync(path.join(ASSETS, 'index-CTbULhps.js'), 'utf8');
  assert.strictEqual(src.split('window.__mnMoveLock.toggleSelection(J,e.currentTarget)').length - 1, 1);
  assert.ok(src.includes('onMouseEnter:e=>window.__mnMoveLock.showInfo(J,e.currentTarget)'));
  assert.ok(!src.includes('__MN_MOVE_LOCK_BTN_V9914__'), 'old button gone');
});

test('lock UI: toolbar summary — icon state, click hint, child-only selection is info-only', () => {
  const pts = {
    a: { id: 'a', label: 'A', def: { t: 'free', x: 0, y: 0 } },
    b: { id: 'b', label: 'B', def: { t: 'free', x: 1, y: 0 } },
    r: { id: 'r', label: "A'", def: { t: 'rot', c: 'a', p: 'b', ang: -90, k: 1 } }
  };
  const parent = L.selectionSummary(['a'], pts);
  assert.deepStrictEqual([parent.visible, parent.canToggle, parent.icon], [true, true, '🔓']);
  assert.ok(/KHÓA/.test(parent.hint) && /A: điểm cha/.test(parent.lines[0]));
  const child = L.selectionSummary(['r'], pts);
  assert.deepStrictEqual([child.visible, child.canToggle, child.icon], [true, false, '🔒']);
  assert.ok(/phép quay của A, B/.test(child.lines[0]) && /cha/.test(child.hint));
  assert.strictEqual(L.selectionSummary([], pts).visible, false);
});

let failed = 0;
for (const t of tests) {
  try { t.fn(); console.log(`PASS  ${t.name}`); } catch (e) { failed++; console.log(`FAIL  ${t.name}\n      ${e.message}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
