#!/usr/bin/env node
/*
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược, giải biên dịch hoặc dùng AI/LLM trích xuất, tái tạo, huấn luyện
 * trên mã nguồn này khi chưa có văn bản chấp thuận của Đỗ Miinh Math.
 * Copying, redistribution, reverse engineering, decompilation or AI/LLM extraction, reconstruction or training
 * on this source without written permission from Đỗ Miinh Math is prohibited.
 */
// Assertion tests for Phép lặp (minnote-geo-iterate.js) — run: node scripts/test_geo_iterate.js
'use strict';
const assert = require('assert');
const path = require('path');

// The module is a browser IIFE: stub the few globals it touches at load time.
globalThis.addEventListener = () => {};
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = () => 0;
globalThis.__mnGeoKernel = {}; // translate/rotate paths only need a truthy kernel (shape remap has a fallback)
require(path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'minnote-geo-iterate.js'));
globalThis.setInterval = realSetInterval;
const IT = globalThis.MinNoteGeoIterate;

let seq = 0;
const idGen = () => `g${++seq}`;
const P = (id, def) => ({ id, label: id, def, show: true });

/** Page with a triangle, a segment UV and 1 copy left by ANOTHER iteration ("old"). */
function pageWithForeignCopies() {
  return {
    points: {
      A: P('A', { t: 'free', x: 0, y: 0 }), B: P('B', { t: 'free', x: 10, y: 0 }),
      C: P('C', { t: 'free', x: 10, y: 10 }), U: P('U', { t: 'free', x: 50, y: 0 }), V: P('V', { t: 'free', x: 60, y: 0 }),
      x1: { ...P('x1', { t: 'vec', o: 'A', a: 'U', b: 'V', k: 1 }), _iterId: 'old', _iterStep: 1 },
      x2: { ...P('x2', { t: 'vec', o: 'B', a: 'U', b: 'V', k: 1 }), _iterId: 'old', _iterStep: 1 }
    },
    shapes: [
      { id: 'tri', kind: 'polygon', pts: ['A', 'B', 'C'] },
      { id: 'uv', kind: 'segment', pts: ['U', 'V'] },
      { id: 'oldcopy', kind: 'segment', pts: ['x1', 'x2'], _iterId: 'old', _iterStep: 1 }
    ],
    iterations: [{ id: 'old' }]
  };
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('auto scope (no shapes picked) never copies another iteration\'s copies', () => {
  const geo = pageWithForeignCopies();
  const res = IT.buildScopedIteration(geo, { id: 'new', method: 'translate', depth: 3, vecA: 'U', vecB: 'V', ratio: 1, scopeShapeIds: [] }, idGen);
  assert.strictEqual(res.shapes.length, 2 * 3, `expected tri + uv per step, got ${res.shapes.length}`);
  const usesForeign = res.points.some(p => ['x1', 'x2'].includes(p.def && p.def.o));
  assert.ok(!usesForeign, 'no new point is built on top of a foreign iteration point');
});

test('rotate auto scope also skips foreign copies', () => {
  const geo = pageWithForeignCopies();
  const res = IT.buildScopedIteration(geo, { id: 'new', method: 'rotate', depth: 2, angle: 30, centerId: 'A', scopeShapeIds: [] }, idGen);
  assert.strictEqual(res.shapes.length, 2 * 2);
});

test('a foreign copy picked explicitly in step 1 is ignored too (rebuilding the other iteration would orphan it)', () => {
  const geo = pageWithForeignCopies();
  const res = IT.buildScopedIteration(geo, { id: 'new', method: 'translate', depth: 2, vecA: 'U', vecB: 'V', ratio: 1, scopeShapeIds: ['oldcopy', 'tri'] }, idGen);
  assert.strictEqual(res.shapes.length, 1 * 2, 'only tri is iterated');
});

test('own previous copies are still excluded when editing (no self-feedback)', () => {
  const geo = pageWithForeignCopies();
  const res = IT.buildScopedIteration(geo, { id: 'old', method: 'translate', depth: 1, vecA: 'U', vecB: 'V', ratio: 1, scopeShapeIds: [] }, idGen);
  assert.strictEqual(res.shapes.length, 2);
});

test('formula shows the real depth up to 40 (not capped at 20)', () => {
  const geo = pageWithForeignCopies();
  const tex = IT.formulaLatexForCfg(geo, { method: 'translate', depth: 30, vecA: 'U', vecB: 'V', ratio: 1, varName: 'n_1' });
  assert.ok(/n_1=30/.test(tex), tex);
  assert.ok(/=40/.test(IT.formulaLatexForCfg(geo, { method: 'rotate', depth: 99, angle: 30, centerId: 'A', varName: 't_1' })), 'clamped to the engine max 40');
});

test('dilate ratio 0 is rejected with a message, never silently replaced', () => {
  assert.deepStrictEqual(IT.normalizeIterRatio('dilate', '0', 0.7), { value: 0.7, error: 'Tỉ số vị tự phải khác 0.' });
  assert.deepStrictEqual(IT.normalizeIterRatio('dilate', '0,8', 0.7), { value: 0.8, error: '' });
  assert.deepStrictEqual(IT.normalizeIterRatio('dilate', '-1,5', 0.7), { value: -1.5, error: '' });
  assert.strictEqual(IT.normalizeIterRatio('dilate', 'abc', 0.7).error, 'Tỉ số phải là một số.');
  assert.deepStrictEqual(IT.normalizeIterRatio('translate', '0', 1), { value: 1, error: 'Hệ số bước phải khác 0.' });
});

let failed = 0;
for (const t of tests) {
  try { t.fn(); console.log(`PASS  ${t.name}`); } catch (e) { failed++; console.log(`FAIL  ${t.name}\n      ${e.message}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
