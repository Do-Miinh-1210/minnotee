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
 * MinNote — Người que đính kèm "chuyển động điểm" khi dựng lại (Construction Replay).
 * TỆP SINH TỰ ĐỘNG từ dự án "MÔ HÌNH NGƯỜI QUE" (node build.js) — sửa ở src/, không sửa tay tại đây.
 * API: window.MinNoteStickFigure.paintReplayTip(ctx, tip, board, opts) — cùng hợp đồng MinNoteHandCursor.
 */
(function (win) {
  'use strict';
  const scope = {};
  // globalThis / module bị che trong phạm vi này: các mô-đun UMD gắn vào scope thay vì window.
  (function (globalThis, module) {
/* ---- engine.js ---- */
/*
 * Stick Figure Motion Engine — bộ máy chuyển động người que dùng chung cho 50 động tác.
 * Quy ước góc (toạ độ màn hình, y hướng xuống): 0° phải · 90° xuống · 180° trái · 270° lên.
 * Góc là góc tuyệt đối của từng xương; "l"/"r" = bên trái/phải màn hình.
 * Mỗi khung hình tính lại toàn bộ khung xương từ hông (FK) → không bao giờ đứt khớp.
 * Chạy được cả trong trình duyệt (window.SM) lẫn Node (module.exports).
 */
(function (root) {
  'use strict';

  const DEG = Math.PI / 180;

  const BONES = Object.freeze({
    torso: 48, shoulderAt: 42, neck: 7, headR: 12,
    upperArm: 24, foreArm: 22, thigh: 28, shin: 28,
  });

  const ANGLE_FIELDS = Object.freeze(['torso', 'neck', 'lUA', 'lFA', 'rUA', 'rFA', 'lTh', 'lSh', 'rTh', 'rSh']);

  const LIMBS = Object.freeze({
    lH: { upper: 'lUA', lower: 'lFA', a: 'upperArm', b: 'foreArm', joint: 'lElbow', end: 'lHand', from: 'shoulder' },
    rH: { upper: 'rUA', lower: 'rFA', a: 'upperArm', b: 'foreArm', joint: 'rElbow', end: 'rHand', from: 'shoulder' },
    lF: { upper: 'lTh', lower: 'lSh', a: 'thigh', b: 'shin', joint: 'lKnee', end: 'lFoot', from: 'hip' },
    rF: { upper: 'rTh', lower: 'rSh', a: 'thigh', b: 'shin', joint: 'rKnee', end: 'rFoot', from: 'hip' },
  });

  const DEFAULT_POSE = Object.freeze({
    hx: 0, hy: -54, lift: 0,
    torso: 270, neck: 270,
    lUA: 105, lFA: 98, rUA: 75, rFA: 82,
    lTh: 98, lSh: 95, rTh: 82, rSh: 85,
    lHand: '', rHand: '',
  });

  const CATEGORIES = Object.freeze(['basic', 'gesture', 'emotion', 'object', 'advanced', 'demo']);
  const INTERPS = Object.freeze(['ease', 'spline', 'linear']);
  const GROUNDS = Object.freeze(['auto', 'manual']);
  const CONTACT_JOINTS = Object.freeze(['lFoot', 'rFoot', 'lKnee', 'rKnee', 'lHand', 'rHand', 'lElbow', 'rElbow', 'hip']);
  const MAX_DURATION = 60000;

  // ---------- toán học nhỏ ----------
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const lerp = (a, b, u) => a + (b - a) * u;
  const along = (p, angle, len) => ({ x: p.x + Math.cos(angle * DEG) * len, y: p.y + Math.sin(angle * DEG) * len });

  /**
   * IK giải tích 2 xương. bend = +1/-1 chọn hướng gập khớp giữa.
   * Mục tiêu ngoài tầm với → chi duỗi thẳng về phía mục tiêu (không kéo dài xương).
   * @returns {{upper:number, lower:number}} góc độ (deg)
   */
  function solveTwoBone(origin, target, a, b, bend) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const base = Math.atan2(dy, dx) / DEG;
    const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) / DEG;
    const upper = base - bend * alpha;
    const mid = along(origin, upper, a);
    const lower = Math.atan2(target.y - mid.y, target.x - mid.x) / DEG;
    return { upper, lower };
  }

  // ---------- kiểm tra dữ liệu ----------
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

  function validateMotion(def) {
    const errors = [];
    if (!def || typeof def !== 'object') return ['Động tác phải là một object JSON.'];
    const tag = typeof def.id === 'string' && def.id ? def.id : '(không có id)';
    if (typeof def.id !== 'string' || !def.id.trim()) errors.push('Thiếu "id" dạng chuỗi.');
    if (!def.name || typeof def.name.vi !== 'string' || typeof def.name.en !== 'string') errors.push(`${tag}: cần "name": {"vi": "...", "en": "..."}.`);
    if (!isNum(def.duration) || def.duration <= 0 || def.duration > MAX_DURATION) errors.push(`${tag}: "duration" phải trong khoảng 1–${MAX_DURATION} ms.`);
    if (def.category !== undefined && !CATEGORIES.includes(def.category)) errors.push(`${tag}: "category" phải là một trong ${CATEGORIES.join(', ')}.`);
    if (def.interp !== undefined && !INTERPS.includes(def.interp)) errors.push(`${tag}: "interp" phải là ${INTERPS.join(' | ')}.`);
    if (def.ground !== undefined && !GROUNDS.includes(def.ground)) errors.push(`${tag}: "ground" phải là auto | manual.`);
    const ik = def.ik || {};
    Object.entries(ik).forEach(([k, v]) => {
      if (!LIMBS[k] || (v !== 1 && v !== -1)) errors.push(`${tag}: "ik.${k}" không hợp lệ (dùng lH/rH/lF/rF = 1 hoặc -1).`);
    });
    if (Object.keys(ik).length && def.ground !== 'manual') errors.push(`${tag}: IK chỉ dùng với "ground": "manual".`);
    if (def.period && def.interp === 'spline') errors.push(`${tag}: "period" không dùng chung với "interp": "spline".`);
    ['secondary', 'breath'].forEach((k) => {
      if (def[k] !== undefined && (!isNum(def[k]) || def[k] < 0 || def[k] > 3)) errors.push(`${tag}: "${k}" phải là số trong khoảng 0–3.`);
    });
    if (!Array.isArray(def.keyframes) || def.keyframes.length < 2) {
      errors.push(`${tag}: cần ít nhất 2 keyframe.`);
      return errors;
    }
    def.keyframes.forEach((kf, i) => {
      if (!kf || !isNum(kf.time) || kf.time < 0 || (isNum(def.duration) && kf.time > def.duration)) {
        errors.push(`${tag}: keyframe ${i} có "time" ngoài khoảng 0–duration.`);
        return;
      }
      Object.entries(kf).forEach(([key, v]) => {
        if (key === 'time' || key === 'ease') return;
        if (key === 'lHand' || key === 'rHand') { if (typeof v !== 'string') errors.push(`${tag}: keyframe ${i} "${key}" phải là chuỗi.`); return; }
        if (!isNum(v)) errors.push(`${tag}: keyframe ${i} "${key}" phải là số.`);
      });
    });
    return errors;
  }

  // ---------- chuẩn hoá ----------
  /** Gộp keyframe kiểu "chỉ ghi thay đổi" thành tư thế đầy đủ, tự khép vòng lặp. */
  function normalizeMotion(def) {
    const errors = validateMotion(def);
    if (errors.length) throw new Error(errors.join('\n'));
    const ik = Object.freeze({ ...(def.ik || {}) });
    let prev = { ...DEFAULT_POSE, ...(def.base || {}) };
    const sorted = [...def.keyframes].sort((a, b) => a.time - b.time);
    const resolved = sorted.map((kf) => {
      const { time, ease, ...fields } = kf;
      const pose = Object.freeze({ ...prev, ...fields });
      prev = pose;
      return Object.freeze({ time, ease: ease || null, pose });
    });
    const missing = Object.keys(ik).flatMap((k) => (isNum(resolved[0].pose[`${k}x`]) && isNum(resolved[0].pose[`${k}y`]) ? [] : [k]));
    if (missing.length) throw new Error(`${def.id}: keyframe đầu thiếu toạ độ IK cho ${missing.join(', ')}.`);
    const withStart = resolved[0].time > 0 ? [Object.freeze({ time: 0, ease: null, pose: resolved[0].pose }), ...resolved] : resolved;
    const last = withStart[withStart.length - 1];
    const closed = def.loop !== false && !def.period && last.time < def.duration
      ? [...withStart, Object.freeze({ time: def.duration, ease: null, pose: withStart[0].pose })]
      : last.time < def.duration
        ? [...withStart, Object.freeze({ time: def.duration, ease: null, pose: last.pose })]
        : withStart;
    const loop = def.loop !== false;
    const interp = def.interp || 'ease';
    const linear = Object.freeze([...(def.linear || [])]);
    const seam = seamOffsets(closed);
    const tangents = computeTangents(closed, interp, loop && !def.period && closed.length > 2, linear, seam);
    return Object.freeze({
      id: def.id,
      name: Object.freeze({ vi: def.name.vi, en: def.name.en }),
      category: def.category || 'advanced',
      desc: def.desc || '',
      duration: def.duration,
      loop,
      speed: isNum(def.speed) ? def.speed : 1,
      interp,
      secondary: isNum(def.secondary) ? def.secondary : 1,
      breath: isNum(def.breath) ? def.breath : 1,
      tangents,
      seam,
      ground: def.ground || 'auto',
      floor: def.floor !== false,
      camera: def.camera || 'fixed',
      period: def.period ? Object.freeze({ x: def.period.x || 0, y: def.period.y || 0 }) : null,
      linear,
      ik,
      props: Object.freeze((def.props || []).map((p) => Object.freeze({ ...p }))),
      keyframes: Object.freeze(closed),
    });
  }

  // ---------- nội suy ----------
  function findSegment(kfs, t) {
    let i = 0;
    while (i < kfs.length - 2 && kfs[i + 1].time <= t) i += 1;
    return i;
  }

  /**
   * Độ dốc (đơn vị/ms) tại mỗi keyframe cho nội suy Hermite C1 — chuyển động chảy qua keyframe,
   * không khựng lại ở từng mốc.
   *  - 'ease'  : Fritsch–Butland đơn điệu → không vượt quá keyframe, đoạn giữ (2 giá trị bằng nhau) đứng yên tuyệt đối,
   *              đỉnh dao động có vận tốc 0.
   *  - 'spline': sai phân trung tâm (Catmull-Rom không đều) → mượt hơn, cho phép vượt nhẹ.
   * Vòng lặp không có period: tiếp tuyến khép vòng qua điểm nối. Còn lại: đầu/cuối vận tốc 0.
   */
  /** Chênh lệch cuối − đầu của mỗi trường số (vd. 360° khi tay quay trọn vòng, hoặc period khi leo cầu thang). */
  function seamOffsets(kfs) {
    const first = kfs[0].pose;
    const last = kfs[kfs.length - 1].pose;
    const out = {};
    Object.keys(first).forEach((f) => { if (typeof first[f] === 'number') out[f] = last[f] - first[f]; });
    return Object.freeze(out);
  }

  function computeTangents(kfs, mode, wrap, linear, seam) {
    const n = kfs.length;
    const D = kfs[n - 1].time;
    return Object.freeze(kfs.map((k, i) => {
      const out = {};
      Object.keys(k.pose).forEach((f) => {
        const v = k.pose[f];
        if (typeof v !== 'number' || linear.includes(f)) return;
        const prev = i > 0 ? { t: kfs[i - 1].time, v: kfs[i - 1].pose[f] } : (wrap ? { t: kfs[n - 2].time - D, v: kfs[n - 2].pose[f] - seam[f] } : null);
        const next = i < n - 1 ? { t: kfs[i + 1].time, v: kfs[i + 1].pose[f] } : (wrap ? { t: D + kfs[1].time, v: kfs[1].pose[f] + seam[f] } : null);
        const h0 = prev ? k.time - prev.t : 0;
        const h1 = next ? next.t - k.time : 0;
        if (!prev || !next || h0 <= 0 || h1 <= 0) { out[f] = 0; return; }
        const d0 = (v - prev.v) / h0;
        const d1 = (next.v - v) / h1;
        if (mode === 'spline') out[f] = (next.v - prev.v) / (h0 + h1);
        else out[f] = d0 * d1 <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
      });
      return Object.freeze(out);
    }));
  }

  function hermite(va, vb, ma, mb, span, u) {
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * va + (u3 - 2 * u2 + u) * span * ma + (-2 * u3 + 3 * u2) * vb + (u3 - u2) * span * mb;
  }

  function interpolatePose(m, t) {
    const kfs = m.keyframes;
    const i = findSegment(kfs, t);
    const a = kfs[i];
    const b = kfs[i + 1];
    const span = b.time - a.time;
    const u = span > 0 ? clamp((t - a.time) / span, 0, 1) : 1;
    const linearSeg = a.ease === 'linear' || m.interp === 'linear';
    const ta = m.tangents[i];
    const tb = m.tangents[i + 1];
    const pose = {};
    Object.keys(a.pose).forEach((key) => {
      const va = a.pose[key];
      const vb = b.pose[key];
      if (typeof va !== 'number' || typeof vb !== 'number') {
        pose[key] = u < 1 ? va : vb;
      } else if (linearSeg || m.linear.includes(key)) {
        pose[key] = lerp(va, vb, u);
      } else {
        pose[key] = hermite(va, vb, ta[key] || 0, tb[key] || 0, span, u);
      }
    });
    return pose;
  }

  // ---------- lớp chuyển động phụ (overlap / follow-through) ----------
  /*
   * Mỗi xương con được lọc qua đáp ứng xung của lò xo tắt dần (FIR, tính lại từ lịch sử tư thế):
   * xương ở xa thân (cẳng tay, cẳng chân, đầu) trễ nhịp hơn và văng quá đà rồi tự ổn định.
   * Hoàn toàn tất định theo thời gian → tua, đổi tốc độ, lặp vẫn chính xác; tổng trọng số = 1 nên tư thế giữ không bị lệch.
   */
  const KERNEL_STEP = 16;
  function springKernel(freq, zeta, spanMs) {
    const w = 2 * Math.PI * freq;
    const wd = w * Math.sqrt(1 - zeta * zeta);
    const raw = [];
    for (let tau = 0; tau <= spanMs; tau += KERNEL_STEP) {
      const s = tau / 1000;
      raw.push(Math.exp(-zeta * w * s) * Math.sin(wd * s + 0.35));
    }
    const sum = raw.reduce((acc, v) => acc + v, 0);
    return Object.freeze(raw.map((v) => v / sum));
  }
  const OVERLAP_TIERS = Object.freeze([
    { fields: ['torso'], kernel: springKernel(5.5, 0.7, 240), gain: 0.35 },
    { fields: ['lUA', 'rUA', 'lTh', 'rTh'], kernel: springKernel(4.2, 0.6, 288), gain: 0.55 },
    { fields: ['lFA', 'rFA', 'lSh', 'rSh', 'neck'], kernel: springKernel(3.1, 0.42, 352), gain: 0.9 },
  ]);
  const HISTORY = Math.max(...OVERLAP_TIERS.map((tier) => tier.kernel.length));
  const OVERLAP_FIELDS = Object.freeze(OVERLAP_TIERS.flatMap((tier) => tier.fields));
  const MAX_GAIN = 1.4;

  function wrapTime(m, t, looping) {
    const D = m.duration;
    return looping ? ((t % D) + D) % D : clamp(t, 0, D);
  }

  function applyOverlap(m, t, looping, base, amount) {
    const ikDriven = new Set(Object.keys(m.ik).flatMap((k) => [LIMBS[k].upper, LIMBS[k].lower]));
    const history = [base];
    for (let i = 1; i < HISTORY; i += 1) {
      const back = t - i * KERNEL_STEP;
      const p = interpolatePose(m, wrapTime(m, back, looping));
      // Lùi qua điểm nối vòng lặp: trừ chênh lệch cuối − đầu để chuỗi giá trị liên tục.
      if (looping && back < 0) OVERLAP_FIELDS.forEach((f) => { p[f] -= m.seam[f] || 0; });
      history.push(p);
    }
    const pose = { ...base };
    OVERLAP_TIERS.forEach((tier) => {
      const g = Math.min(MAX_GAIN, tier.gain * amount);
      tier.fields.forEach((f) => {
        if (ikDriven.has(f)) return;
        const filtered = tier.kernel.reduce((acc, w, i) => acc + w * history[i][f], 0);
        pose[f] = base[f] + g * (filtered - base[f]);
      });
    });
    return pose;
  }

  /** Nhịp thở: số chu kỳ nguyên trong một vòng lặp để điểm nối không giật; tắt dần với động tác nhanh. */
  function applyBreath(m, t, pose, amount) {
    const D = m.duration;
    const cycles = Math.max(1, Math.round(D / 3400));
    const ph = (2 * Math.PI * cycles * t) / D;
    const k = amount * clamp((D - 800) / 1200, 0, 1);
    if (k <= 0) return pose;
    return {
      ...pose,
      torso: pose.torso + 0.7 * k * Math.sin(ph),
      neck: pose.neck + 1.3 * k * Math.sin(ph - 0.9),
      lUA: pose.lUA + 1.6 * k * Math.sin(ph - 0.4),
      rUA: pose.rUA - 1.6 * k * Math.sin(ph - 0.4),
    };
  }

  const DEFAULT_LIFE = Object.freeze({ secondary: 1, breath: 1 });

  function samplePose(m, timeMs, looping, life) {
    const t = wrapTime(m, timeMs, looping);
    const base = interpolatePose(m, t);
    const sec = (isNum(life.secondary) ? life.secondary : 1) * m.secondary;
    const overlapped = sec > 0 ? applyOverlap(m, t, looping, base, sec) : base;
    const br = (isNum(life.breath) ? life.breath : 1) * m.breath;
    return br > 0 ? applyBreath(m, t, overlapped, br) : overlapped;
  }

  // ---------- khung xương ----------
  function solveSkeleton(m, pose) {
    const manual = m.ground === 'manual';
    const angles = {};
    ANGLE_FIELDS.forEach((f) => { angles[f] = pose[f]; });
    const hip = { x: pose.hx, y: manual ? pose.hy : 0 };
    const J = {
      hip,
      neck: along(hip, angles.torso, BONES.torso),
      shoulder: along(hip, angles.torso, BONES.shoulderAt),
    };
    J.head = along(J.neck, angles.neck, BONES.neck + BONES.headR);
    Object.entries(LIMBS).forEach(([key, L]) => {
      const origin = J[L.from];
      if (manual && m.ik[key]) {
        const s = solveTwoBone(origin, { x: pose[`${key}x`], y: pose[`${key}y`] }, BONES[L.a], BONES[L.b], m.ik[key]);
        angles[L.upper] = s.upper;
        angles[L.lower] = s.lower;
      }
      J[L.joint] = along(origin, angles[L.upper], BONES[L.a]);
      J[L.end] = along(J[L.joint], angles[L.lower], BONES[L.b]);
    });
    const shiftY = manual ? 0 : -(Math.max(...Object.values(J).map((p) => p.y), J.head.y + BONES.headR)) - pose.lift;
    const joints = {};
    Object.entries(J).forEach(([k, p]) => { joints[k] = { x: p.x, y: p.y + shiftY }; });
    joints.handsMid = { x: (joints.lHand.x + joints.rHand.x) / 2, y: (joints.lHand.y + joints.rHand.y) / 2 };
    return { joints, angles };
  }

  // ---------- đạo cụ & hiệu ứng ----------
  const PROP_NUMERIC = ['x', 'y', 'opacity', 'rot', 'shift', 'scale'];

  function resolvePropKey(prop, key, joints) {
    const anchor = key.attach && joints[key.attach] ? joints[key.attach] : { x: 0, y: 0 };
    return {
      x: anchor.x + (key.x || 0),
      y: anchor.y + (key.y || 0),
      opacity: isNum(key.opacity) ? key.opacity : (isNum(prop.opacity) ? prop.opacity : 1),
      rot: isNum(key.rot) ? key.rot : (prop.rot || 0),
      shift: isNum(key.shift) ? key.shift : (prop.shift || 0),
      scale: isNum(key.scale) ? key.scale : (prop.scale || 1),
    };
  }

  function resolveProp(prop, t, joints) {
    const { keys, ...rest } = prop;
    const list = keys && keys.length ? keys : [prop];
    let state;
    if (list.length === 1 || t <= list[0].time) {
      state = resolvePropKey(prop, list[0], joints);
    } else if (t >= list[list.length - 1].time) {
      state = resolvePropKey(prop, list[list.length - 1], joints);
    } else {
      let i = 0;
      while (list[i + 1].time < t) i += 1;
      const a = resolvePropKey(prop, list[i], joints);
      const b = resolvePropKey(prop, list[i + 1], joints);
      const span = list[i + 1].time - list[i].time;
      const u = span > 0 ? (t - list[i].time) / span : 1;
      state = {};
      PROP_NUMERIC.forEach((f) => { state[f] = lerp(a[f], b[f], u); });
    }
    const pulse = prop.pulse ? 0.55 + 0.45 * Math.sin((t / prop.pulse) * Math.PI * 2) : 1;
    return { ...rest, ...state, opacity: clamp(state.opacity * pulse, 0, 1) };
  }

  // ---------- lấy mẫu khung hình ----------
  /**
   * @param {object} m động tác đã chuẩn hoá
   * @param {number} timeMs
   * @param {boolean} [loop] ghi đè chế độ lặp
   * @param {{secondary?:number, breath?:number}} [life] độ mạnh lớp chuyển động phụ / nhịp thở (0 = tắt)
   */
  function sampleFrame(m, timeMs, loop, life) {
    const looping = loop === undefined ? m.loop : loop;
    const t = wrapTime(m, timeMs, looping);
    const pose = samplePose(m, timeMs, looping, life || DEFAULT_LIFE);
    const { joints, angles } = solveSkeleton(m, pose);
    const first = m.keyframes[0].pose;
    const camera = m.camera === 'follow' ? { x: pose.hx - first.hx, y: pose.hy - first.hy } : { x: 0, y: 0 };
    const props = m.props.map((p) => resolveProp(p, t, joints));
    const contacts = m.floor ? CONTACT_JOINTS.filter((k) => Math.abs(joints[k].y) < 0.8) : [];
    return { time: t, pose, joints, angles, camera, props, contacts };
  }

  // ---------- JSON ----------
  function exportMotion(m) {
    const out = {
      id: m.id, name: { ...m.name }, category: m.category, desc: m.desc,
      duration: m.duration, loop: m.loop, speed: m.speed, interp: m.interp,
      ground: m.ground, floor: m.floor, camera: m.camera,
      keyframes: m.keyframes.map((k) => ({ time: k.time, ...(k.ease ? { ease: k.ease } : {}), ...k.pose })),
    };
    if (m.secondary !== 1) out.secondary = m.secondary;
    if (m.breath !== 1) out.breath = m.breath;
    if (m.period) out.period = { ...m.period };
    if (m.linear.length) out.linear = [...m.linear];
    if (Object.keys(m.ik).length) out.ik = { ...m.ik };
    if (m.props.length) out.props = m.props.map((p) => JSON.parse(JSON.stringify(p)));
    return out;
  }

  function importMotions(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return { motions: [], errors: [`JSON không đọc được: ${err.message}`] };
    }
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.motions) ? data.motions : [data]);
    return list.reduce((acc, def) => {
      try {
        return { motions: [...acc.motions, normalizeMotion(def)], errors: acc.errors };
      } catch (err) {
        return { motions: acc.motions, errors: [...acc.errors, err.message] };
      }
    }, { motions: [], errors: [] });
  }

  // ---------- trình phát (giữ trạng thái phát, không đổi dữ liệu động tác) ----------
  class Player {
    constructor(motion) {
      this.speed = 1;
      this.playing = false;
      this.time = 0;
      this.setMotion(motion);
    }

    setMotion(motion, keepTime) {
      this.motion = motion;
      this.loop = motion.loop;
      this.time = keepTime ? clamp(this.time, 0, motion.duration) : 0;
    }

    play() {
      if (!this.loop && this.time >= this.motion.duration) this.time = 0;
      this.playing = true;
    }

    pause() { this.playing = false; }

    stop() { this.playing = false; this.time = 0; }

    replay() { this.time = 0; this.playing = true; }

    seek(ms) { this.time = clamp(ms, 0, this.motion.duration); }

    setSpeed(s) { this.speed = s; }

    setLoop(on) { this.loop = on; }

    tick(dtMs) {
      if (!this.playing) return;
      const D = this.motion.duration;
      const next = this.time + dtMs * this.speed * this.motion.speed;
      if (this.loop) {
        this.time = next % D;
      } else if (next >= D) {
        this.time = D;
        this.playing = false;
      } else {
        this.time = next;
      }
    }

    frame(life) { return sampleFrame(this.motion, this.time, this.loop, life); }
  }

  const SM = {
    BONES, DEFAULT_POSE, ANGLE_FIELDS, LIMBS, CATEGORIES,
    solveTwoBone, validateMotion, normalizeMotion, sampleFrame, solveSkeleton,
    exportMotion, importMotions, Player,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SM;
  else root.SM = SM;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- render.js ---- */
/*
 * Canvas renderer cho người que + đạo cụ. Không giữ trạng thái; mọi thứ đến từ frame của engine.
 * view = { cx, cy, scale, width, height } (px): cx/cy = vị trí gốc thế giới (x=0, sàn y=0) trên canvas.
 * style = { ink, accent, paper, faint } (màu CSS).
 */
(function (root) {
  'use strict';

  const SM = root.SM;
  const B = SM.BONES;
  const DEG = Math.PI / 180;
  const FX = new Set(['glyph', 'waves', 'anger', 'shake', 'tear', 'arc', 'spark', 'speed', 'motion', 'stroke']);
  const BACK = new Set(['wall', 'stairs', 'ladder', 'board', 'stroke']);

  function visibleBounds(view, cam) {
    return {
      x0: cam.x - view.cx / view.scale - 20,
      x1: cam.x + (view.width - view.cx) / view.scale + 20,
      y0: cam.y - view.cy / view.scale - 20,
      y1: cam.y + (view.height - view.cy) / view.scale + 20,
    };
  }

  function line(ctx, a, b) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }

  // ---------- người que ----------
  function drawHand(ctx, p, angle, kind) {
    if (!kind) return;
    const tip = (a, len) => ({ x: p.x + Math.cos(a * DEG) * len, y: p.y + Math.sin(a * DEG) * len });
    ctx.beginPath();
    if (kind === 'open') {
      [-28, 0, 28].forEach((d) => line(ctx, p, tip(angle + d, 4.5)));
    } else if (kind === 'point') {
      line(ctx, p, tip(angle, 8));
    } else if (kind === 'v') {
      line(ctx, p, tip(270 - 16, 8));
      line(ctx, p, tip(270 + 16, 8));
    } else if (kind === 'thumb') {
      line(ctx, p, tip(270, 7));
    }
    ctx.stroke();
    if (kind === 'fist' || kind === 'thumb') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFigure(ctx, frame, color, paper, width) {
    const J = frame.joints;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const headBottom = {
      x: J.head.x - Math.cos(frame.angles.neck * DEG) * B.headR,
      y: J.head.y - Math.sin(frame.angles.neck * DEG) * B.headR,
    };
    // Hai hông / hai vai riêng (khi nhân vật quay vào bảng) — thiếu thì dùng một điểm chung như cũ.
    const lHip = J.lHip || J.hip;
    const rHip = J.rHip || J.hip;
    const lSh = J.lShoulder || J.shoulder;
    const rSh = J.rShoulder || J.shoulder;
    ctx.beginPath();
    ctx.moveTo(J.lFoot.x, J.lFoot.y); ctx.lineTo(J.lKnee.x, J.lKnee.y); ctx.lineTo(lHip.x, lHip.y);
    ctx.lineTo(rHip.x, rHip.y); ctx.lineTo(J.rKnee.x, J.rKnee.y); ctx.lineTo(J.rFoot.x, J.rFoot.y);
    line(ctx, J.hip, J.neck);
    line(ctx, J.neck, headBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(J.head.x, J.head.y, B.headR, 0, Math.PI * 2);
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(J.lHand.x, J.lHand.y); ctx.lineTo(J.lElbow.x, J.lElbow.y); ctx.lineTo(lSh.x, lSh.y);
    ctx.lineTo(rSh.x, rSh.y); ctx.lineTo(J.rElbow.x, J.rElbow.y); ctx.lineTo(J.rHand.x, J.rHand.y);
    ctx.stroke();
    ctx.lineWidth = width * 0.7;
    drawHand(ctx, J.lHand, frame.angles.lFA, frame.pose.lHand);
    drawHand(ctx, J.rHand, frame.angles.rFA, frame.pose.rHand);
  }

  // ---------- đạo cụ ----------
  const PROP_DRAW = {
    wall(ctx, p, s, bounds) {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      line(ctx, { x: p.x, y: 0 }, { x: p.x, y: Math.min(-175, bounds.y0) });
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha *= 0.45;
      ctx.beginPath();
      for (let y = -170; y < 0; y += 12) line(ctx, { x: p.x, y }, { x: p.x + 7 * p.side, y: y + 7 });
      ctx.stroke();
    },
    stairs(ctx, p, s, bounds) {
      const { w, h, dir } = p;
      const k0 = Math.floor(bounds.x0 / w) - 1;
      const k1 = Math.ceil(bounds.x1 / w) + 1;
      const top = (k) => -dir * k * h;
      ctx.beginPath();
      ctx.moveTo(k0 * w, top(k0));
      for (let k = k0; k <= k1; k += 1) {
        ctx.lineTo((k + 1) * w, top(k));
        ctx.lineTo((k + 1) * w, top(k + 1));
      }
      const bottom = bounds.y1 + 40;
      ctx.lineTo((k1 + 1) * w, bottom);
      ctx.lineTo(k0 * w, bottom);
      ctx.closePath();
      ctx.fillStyle = s.faint;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.stroke();
    },
    ladder(ctx, p, s, bounds) {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      line(ctx, { x: p.x, y: bounds.y0 }, { x: p.x, y: bounds.y1 });
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      const k0 = Math.floor(bounds.y0 / p.spacing);
      const k1 = Math.ceil(bounds.y1 / p.spacing);
      for (let k = k0; k <= k1; k += 1) line(ctx, { x: p.x - 7, y: k * p.spacing }, { x: p.x, y: k * p.spacing });
      ctx.stroke();
    },
    board(ctx, p, s) {
      ctx.fillStyle = s.paper;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.rect(p.x, p.y, p.w, p.h);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      line(ctx, { x: p.x + 10, y: p.y + p.h + 3 }, { x: p.x + p.w - 10, y: p.y + p.h + 3 });
      ctx.stroke();
    },
    stroke(ctx, p) {
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      line(ctx, { x: p.x0, y: p.y0 }, { x: p.x, y: p.y });
      ctx.stroke();
    },
    pen(ctx, p, s) {
      // Viên phấn: từ nắm tay (x, y) chĩa tới đầu phấn (x + dx, y + dy) — đúng điểm nét mực kết thúc.
      const tip = { x: p.x + (p.dx || 0), y: p.y + (p.dy || 0) };
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      line(ctx, p, tip);
      ctx.stroke();
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
      ctx.fill();
    },
    box(ctx, p, s) {
      ctx.lineWidth = 2.4;
      ctx.fillStyle = s.paper;
      ctx.beginPath();
      ctx.rect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      line(ctx, { x: p.x - p.w / 2, y: p.y - p.h / 2 + 5 }, { x: p.x + p.w / 2, y: p.y - p.h / 2 + 5 });
      ctx.stroke();
    },
    ball(ctx, p, s) {
      ctx.lineWidth = 2.2;
      ctx.fillStyle = s.paper;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
    megaphone(ctx, p, s) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * DEG);
      ctx.lineWidth = 2;
      ctx.fillStyle = s.paper;
      ctx.beginPath();
      ctx.moveTo(-3, -2.5); ctx.lineTo(4, -3); ctx.lineTo(22, -10); ctx.lineTo(22, 10); ctx.lineTo(4, 3); ctx.lineTo(-3, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    rope(ctx, p, s, bounds) {
      const x0 = p.x - 24;
      const x1 = Math.min(p.x + p.len, bounds.x1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      line(ctx, { x: x0, y: p.y }, { x: x1, y: p.y });
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const sp = p.spacing;
      for (let x = Math.ceil((x0 + p.shift) / sp) * sp - p.shift; x < x1; x += sp) {
        if (x > p.x + 14) line(ctx, { x: x - 2, y: p.y - 3 }, { x: x + 2, y: p.y + 3 });
      }
      ctx.stroke();
    },
    glyph(ctx, p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.font = `700 ${p.size || 16}px "Bricolage Grotesque", "Be Vietnam Pro", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    },
    waves(ctx, p) {
      const dir = p.dir || 1;
      ctx.lineWidth = 1.8;
      [5, 10, 15].forEach((r) => {
        ctx.beginPath();
        const c = dir > 0 ? 0 : Math.PI;
        ctx.arc(p.x - dir * 4, p.y, r * p.scale, c - 0.6, c + 0.6);
        ctx.stroke();
      });
    },
    motion(ctx, p) {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, Math.PI * 0.7, Math.PI * 1.3);
      ctx.arc(p.x, p.y, 11, Math.PI * 1.3, Math.PI * 0.7, true);
      ctx.stroke();
    },
    anger(ctx, p) {
      ctx.lineWidth = 1.8;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(p.x + sx * 5, p.y + sy * 5, 3.5, Math.atan2(-sy, -sx) - 0.9, Math.atan2(-sy, -sx) + 0.9);
        ctx.stroke();
      });
    },
    shake(ctx, p) {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 8);
      [-4, 0, 4, 8].forEach((dy, i) => ctx.lineTo(p.x + (i % 2 ? 3 : -3), p.y + dy));
      ctx.stroke();
    },
    tear(ctx, p) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 4);
      ctx.quadraticCurveTo(p.x + 3, p.y + 1, p.x, p.y + 2.5);
      ctx.quadraticCurveTo(p.x - 3, p.y + 1, p.x, p.y - 4);
      ctx.fill();
    },
    arc(ctx, p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, p.squash || 1);
      ctx.rotate(p.rot * DEG);
      ctx.lineWidth = 1.8;
      const a0 = p.from * DEG;
      const a1 = p.to * DEG;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, a0, a1);
      ctx.stroke();
      const tip = p.flip ? a0 : a1;
      const tx = Math.cos(tip) * p.r;
      const ty = Math.sin(tip) * p.r;
      const tangent = tip + (p.flip ? -Math.PI / 2 : Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(tangent + 2.6) * 5, ty + Math.sin(tangent + 2.6) * 5);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx + Math.cos(tangent - 2.6) * 5, ty + Math.sin(tangent - 2.6) * 5);
      ctx.stroke();
      ctx.restore();
    },
    spark(ctx, p) {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      [200, 240, 270, 300, 340].forEach((a) => line(ctx,
        { x: p.x + Math.cos(a * DEG) * 7, y: p.y + Math.sin(a * DEG) * 7 },
        { x: p.x + Math.cos(a * DEG) * 13, y: p.y + Math.sin(a * DEG) * 13 }));
      ctx.stroke();
    },
    speed(ctx, p) {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      [[0, 18], [9, 12], [18, 16]].forEach(([dy, len]) => line(ctx, { x: p.x, y: p.y + dy }, { x: p.x - len, y: p.y + dy }));
      ctx.stroke();
    },
  };

  function drawProps(ctx, props, style, bounds, layer) {
    props.forEach((p) => {
      if (p.opacity <= 0.01 || BACK.has(p.type) !== (layer === 'back')) return;
      const draw = PROP_DRAW[p.type];
      if (!draw) return;
      const color = FX.has(p.type) ? style.accent : style.ink;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      draw(ctx, p, style, bounds);
      ctx.restore();
    });
  }

  // ---------- nền ----------
  function drawFloor(ctx, bounds, style) {
    ctx.save();
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    line(ctx, { x: bounds.x0, y: 0 }, { x: bounds.x1, y: 0 });
    ctx.stroke();
    ctx.restore();
  }

  function drawJoints(ctx, frame, style) {
    ctx.save();
    ctx.fillStyle = style.accent;
    ['hip', 'neck', 'shoulder', 'lElbow', 'rElbow', 'lHand', 'rHand', 'lKnee', 'rKnee', 'lFoot', 'rFoot'].forEach((k) => {
      ctx.beginPath();
      ctx.arc(frame.joints[k].x, frame.joints[k].y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawContacts(ctx, frame, style) {
    ctx.save();
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    frame.contacts.forEach((k) => line(ctx, { x: frame.joints[k].x - 5, y: 3.5 }, { x: frame.joints[k].x + 5, y: 3.5 }));
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Vẽ một khung hình. opts: { lineWidth, joints, contacts, ghosts: frame[] }
   */
  function drawFrame(ctx, m, frame, view, style, opts) {
    const o = opts || {};
    const cam = frame.camera;
    const bounds = visibleBounds(view, cam);
    ctx.save();
    ctx.translate(view.cx, view.cy);
    ctx.scale(view.scale, view.scale);
    ctx.translate(-cam.x, -cam.y);
    if (m.floor) drawFloor(ctx, bounds, style);
    drawProps(ctx, frame.props, style, bounds, 'back');
    (o.ghosts || []).forEach((g) => {
      ctx.save();
      ctx.globalAlpha = 0.22;
      drawFigure(ctx, g, style.accent, style.paper, o.lineWidth || 3.2);
      ctx.restore();
    });
    drawFigure(ctx, frame, style.ink, style.paper, o.lineWidth || 3.2);
    drawProps(ctx, frame.props, style, bounds, 'front');
    if (o.contacts) drawContacts(ctx, frame, style);
    if (o.joints) drawJoints(ctx, frame, style);
    ctx.restore();
  }

  /** Lưới giấy vẽ hoạt hình, cuộn theo camera để thấy chuyển động khi camera bám theo. */
  function drawPaper(ctx, view, cam, style) {
    const step = 10 * view.scale;
    if (step < 5) return;
    const ox = (view.cx - cam.x * view.scale) % step;
    const oy = (view.cy - cam.y * view.scale) % step;
    ctx.save();
    ctx.strokeStyle = style.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < view.width; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, view.height); }
    for (let y = oy; y < view.height; y += step) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(view.width, Math.round(y) + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  root.SMRender = { drawFrame, drawPaper };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- minnote/stick-follower.js ---- */
/*
 * MinNoteStickFigure — người que đính kèm "chuyển động điểm" của MinNote.
 *
 * Cùng hợp đồng với MinNoteHandCursor.paintReplayTip(ctx, tip, board, opts):
 *   tip = { x, y, dx, dy, active, drawing } — đầu nét MinNote đang vẽ, toạ độ bảng (px).
 *   opts.bounds = { x0, y0, x1, y1 } (tuỳ chọn) — khung bao của hình đang dựng (MinNote có _mnShapeBBox).
 * Người que KHÔNG vẽ nét; chỉ cầm phấn sao cho đầu phấn luôn nằm đúng tại tip.
 *
 * Logic chuyển động người — theo ảnh mẫu "Người que đang vẽ đường tròn":
 *   1. Luôn đứng nghiêng, mặt hướng về phía hình; đứng vẽ chân chữ A, tay dài ~1/2 chiều cao.
 *   2. Pha cầm bút: cầm bút trước bụng → đưa lên điểm đầu → vẽ → dừng bút một nhịp → hạ tay.
 *   3. Tay làm việc trong tầm thoải mái phía trước vai; ra ngoài tầm → bước (dáng đi con lắc ngược,
 *      tay tự do đánh ngược pha chân), không vươn tay quá sức, không vắt chéo qua người.
 *   4. Phấn cao → vươn thẳng tay lên; phấn thấp → nghiêng người tới (≤ 30°, chỉ khi tay còn ở phía trước)
 *      rồi khuỵu gối.
 *   5. Có khung bao hình → đặt sàn, chọn cỡ người (hình tròn ~2/3 người), đứng ở mép gần của hình.
 */
(function (root) {
  'use strict';

  const SM = (typeof module !== 'undefined' && module.exports) ? require('../engine.js') : root.SM;
  const B = SM.BONES;
  const DEG = Math.PI / 180;

  const FIG_H = 140;                         // chiều cao người que (đơn vị khung xương)
  const DEFAULT_HEIGHT_PX = 150;             // cỡ hiển thị mặc định ở zoom 1
  // Tay theo tỉ lệ người (vai → nắm tay ≈ 0.36 chiều cao), hơi dài hơn thư viện vì tính cả nắm tay cầm bút.
  const UPPER_ARM = 27;
  const FORE_ARM = 24;
  const ARM = UPPER_ARM + FORE_ARM;
  const REACH = ARM - 1;                     // giới hạn cứng (khuỷu không bao giờ duỗi khoá)
  const COMFORT_REACH = 0.9 * ARM;           // tầm làm việc thoải mái (ảnh mẫu: tay vươn gần thẳng khi vẽ cung trên)
  const MIN_WORK = 20;                       // tay không co sát vai hơn mức này (khuỷu sẽ quay gắt)
  const CHALK = { dx: 5, dy: -8 };           // viên phấn nhô khỏi nắm tay (mirror theo tay vẽ)
  const SH_HALF = 7;                         // nửa bề rộng vai khi quay vào bảng
  const HIP_HALF = 5;
  const FOOT_HALF = 13;                      // ảnh mẫu: đứng chân chữ A khá rộng
  const ZONE = { lo: 6, hi: 43 };            // side·(tay − vai vẽ) ngang: ảnh mẫu — tay từ trên đầu tới vươn hẳn ra trước
  const UP = 38;                             // tay cao hơn vai tối đa (thoải mái)
  const DOWN = 34;                           // tay thấp hơn vai tối đa trước khi phải khuỵu
  const CROUCH_MAX = 30;
  const TIPTOE_MAX = 2;                        // phải ≤ LEG_MAX − LEG_DROP, nếu không kiễng sẽ nhấc cả sàn
  const LEG_DROP = 53;                         // hông cao hơn sàn khi đứng: chân chữ A gần thẳng như ảnh mẫu
  const LEG_MIN = 18;
  const LEG_MAX = B.thigh + B.shin - 0.5;
  const SPRING_HZ = 1.8;
  const CROUCH_HZ = 4;
  const LEAD_S = 0.25;
  const LEAN_MAX = 18;                       // nghiêng sườn khi vươn (nhìn từ sau)
  const LEAN_RATE = 120;
  const PITCH_MAX = 30;                      // ảnh mẫu: đáy hình = khuỵu gối + nghiêng người vừa phải (không gập gãy)
  const PITCH_HZ = 2.6;                      // lò xo gập hông
  const PITCH_MAX_RATE = 210;                // độ/giây — người không gập hông nhanh hơn thế
  const HINGE_DROP = B.shoulderAt * (1 - Math.cos(PITCH_MAX * DEG)); // vai hạ được nhờ gập hông
  // Dải cao dùng để chọn cỡ người: chỉ tính ~40% độ khuỵu → hình cao thì người lớn hơn chút,
  // thay vì luôn phải vừa xổm hết cỡ vừa cúi hết cỡ ở đáy hình.
  const FIT_BAND = UP + TIPTOE_MAX + DOWN + HINGE_DROP + 0.4 * CROUCH_MAX;
  const FREE_ARM_RATE = 200;                 // độ/giây — tay tự do đổi góc tối đa
  const ARM_SWING = 1.1;                     // độ đánh tay / đơn vị chân cùng bên lệch khỏi hông
  const LEG_STANCE = LEG_MAX - 0.5;          // chân trụ khi đi: gần thẳng (hông nảy qua chân trụ)
  const VAULT_HZ = 20;
  const STEP_TRIGGER = 12;
  const STEP_MS = 260;
  const STEP_LIFT = 7;
  const STEP_BOB = 2.5;
  const LIFT_OFF = { x: 3, y: -7 };          // nhấc phấn khỏi bảng khi drawing === false
  const TELEPORT_PX = 64;                    // tip nhảy xa hơn → nét mới, đặt lại tư thế
  const FIT_W = 66;                          // bề ngang hình "khối" (tròn, cung) vẽ gần như tại chỗ
  // Pha cầm bút (ảnh mẫu): cầm bút trước bụng → đưa lên điểm đầu → vẽ → dừng bút → hạ tay.
  const REST_HAND = { x: 20, y: 24 };        // tay nghỉ so với vai vẽ: cẳng tay ngang trước bụng, bút dựng
  const RAISE_MS = 420;
  const HOLD_MS = 350;                       // vẽ xong giữ bút một nhịp (nghỉ ngắn giữa hai nét thì không hạ tay)
  const LOWER_MS = 550;

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const along = (p, a, len) => ({ x: p.x + Math.cos(a * DEG) * len, y: p.y + Math.sin(a * DEG) * len });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleDiff = (a, b) => ((a - b + 540) % 360) - 180;

  function spring(pos, vel, target, hz, dtS) {
    const w = 2 * Math.PI * hz;
    const v = vel + (w * w * (target - pos) - 2 * w * vel) * dtS;
    return { pos: pos + v * dtS, vel: v };
  }

  /** Chân 2.5D: gối lệch khỏi đường hông–bàn chân theo hệ số kneeX ∈ [−1, 1]; phần còn lại là chiều sâu. */
  function solveLeg(hip, foot, kneeX) {
    const L = B.thigh;
    const raw = dist(hip, foot);
    const d = clamp(raw, 1e-3, 2 * L - 1e-4);
    const ux = (foot.x - hip.x) / (raw || 1);
    const uy = (foot.y - hip.y) / (raw || 1);
    const end = { x: hip.x + ux * d, y: hip.y + uy * d };
    const h = Math.sqrt(L * L - (d / 2) * (d / 2));
    const n = { x: -uy, y: ux };
    const c = clamp(kneeX, -1, 1) * (n.x < 0 ? -1 : 1);
    const knee = { x: hip.x + ux * d / 2 + n.x * h * c, y: hip.y + uy * d / 2 + n.y * h * c };
    return { knee, foot: end, depth: h * Math.sqrt(1 - c * c) };
  }

  function createFollower(options) {
    const opts = options || {};
    const baseScale = (Number.isFinite(opts.targetHeight) ? opts.targetHeight : DEFAULT_HEIGHT_PX) / FIG_H;
    const maxScaleMul = opts.fixedScale ? 1 : (Number.isFinite(opts.maxScaleMul) ? Math.max(1, opts.maxScaleMul) : 1.32);
    let st = null;

    function init(tip, bounds) {
      const dx = tip.dx || 0;
      const dy = tip.dy || 0;
      const side = dx < 0 && Math.abs(dx) >= 0.35 * Math.abs(dy) ? -1 : 1;
      const hasB = bounds && [bounds.x0, bounds.y0, bounds.x1, bounds.y1].every(Number.isFinite);
      const bw = hasB ? bounds.x1 - bounds.x0 : 0;
      const bh = hasB ? bounds.y1 - bounds.y0 : 0;
      // Hình cao → người đủ cao để với; hình "khối" (tròn/cung) → người tương xứng để vẽ gần như tại chỗ.
      // Giới hạn tỷ lệ phóng (maxScaleMul) để không biến thành người khổng lồ trên hình lớn hay giật cỡ giữa các bước.
      const rawScale = hasB ? Math.max(baseScale, bh / FIT_BAND, Math.min(bw, bh) / FIT_W) : baseScale;
      const scale = Math.min(rawScale, baseScale * maxScaleMul);
      const t = { x: tip.x / scale, y: tip.y / scale };
      let ground;
      if (hasB) {
        // Độ cao vai khi đứng: ưu tiên hình ngang ngực; đủ thấp để với đáy hình chỉ bằng gập hông;
        // nếu hình cao hơn tầm với tại chỗ, đặt mặt sàn bám theo độ cao điểm bắt đầu nét để không nhảy khung.
        const y0 = bounds.y0 / scale - CHALK.dy;
        const y1 = bounds.y1 / scale - CHALK.dy;
        const noCrouch = y1 - DOWN - HINGE_DROP;
        const topLimit = y0 + UP + TIPTOE_MAX;
        const a0y = t.y - CHALK.dy;
        const shoulderStand = noCrouch > topLimit
          ? clamp(a0y, topLimit, noCrouch)
          : clamp((y0 + y1) / 2 - 5, noCrouch, topLimit);
        ground = shoulderStand + B.shoulderAt + LEG_DROP;
      } else {
        ground = t.y + 38 + LEG_DROP;
      }
      const a = { x: t.x - side * CHALK.dx, y: t.y - CHALK.dy };
      const hipX = a.x - side * (ZONE.lo + ZONE.hi) / 2;
      st = {
        side, scale, ground,
        hip: { x: hipX, y: ground - LEG_DROP },
        velX: 0, tipVx: 0, tipVy: 0,
        crouch: 0, crouchVel: 0,
        facing: side, lean: 0,
        reach: tip.drawing === false ? 0 : 1,  // 0 = tay nghỉ cầm bút, 1 = đầu bút ở tip
        hasDrawn: tip.drawing !== false, idleMs: 0,
        lookAt: hasB ? { x: (bounds.x0 + bounds.x1) / 2 / scale, y: (bounds.y0 + bounds.y1) / 2 / scale } : null,
        feet: {
          l: { x: hipX - FOOT_HALF, planted: true, swing: null, lift: 0 },
          r: { x: hipX + FOOT_HALF, planted: true, swing: null, lift: 0 },
        },
        lastPx: { x: tip.x, y: tip.y },
        last: t,
        handMaxY: hasB ? bounds.y1 / scale - CHALK.dy : Infinity,
      };
      // Xuất hiện sẵn ở tư thế ổn định cho điểm đầu nét (không "giật vào chỗ" ở khung đầu).
      const v0 = verticalFor(a);
      st.crouch = v0.crouch;
      st.pitch = v0.pitch;
      st.hip.y = st.ground - LEG_DROP + st.crouch;
      st.lean = leanFor(a);
      // Đứng sao cho tay ở giữa vùng làm việc trước VAI VẼ (đã tính cúi/nghiêng), chân đặt dưới hông.
      // Ảnh mẫu: đứng ở mép gần của hình, cả hình nằm phía trước mặt; điểm đầu vẫn trong tầm thoải mái.
      let shoulderX = a.x - side * (ZONE.lo + ZONE.hi) / 2;
      if (hasB) {
        const near = (side > 0 ? bounds.x0 : bounds.x1) / scale - side * 4;
        const dyS = a.y - (st.hip.y - B.shoulderAt);
        const reachable = a.x - side * Math.min(ZONE.hi, Math.sqrt(Math.max(0, COMFORT_REACH ** 2 - dyS ** 2)));
        // …nhưng không đứng sát tới mức tay co dính vai (sẽ bị đẩy lùi ngay khung đầu).
        const roomy = a.x - side * Math.max(ZONE.lo, Math.sqrt(Math.max(0, (MIN_WORK + 8) ** 2 - dyS ** 2)));
        shoulderX = side > 0 ? Math.min(Math.max(near, reachable), roomy) : Math.max(Math.min(near, reachable), roomy);
      }
      st.hip.x = shoulderX - shoulderShift();
      st.feet.l.x = st.hip.x - FOOT_HALF;
      st.feet.r.x = st.hip.x + FOOT_HALF;
    }

    /**
     * Tư thế dọc cho điểm cần với: cao quá → kiễng; thấp quá → GẬP HÔNG trước (vai hạ 42·(1−cos p)),
     * chỉ phần còn thiếu mới khuỵu gối.
     */
    function verticalFor(aim) {
      const up = st.ground - LEG_DROP - B.shoulderAt - aim.y; // dương: tay cao hơn vai
      if (up > UP) return { crouch: -Math.min(TIPTOE_MAX, up - UP), pitch: 0 };
      // Nghiêng tới làm vai đổ ra trước 42·sin p: chỉ nghiêng khi tay còn đủ xa phía trước
      // (vai không vượt qua tay). Tay sát người → khuỵu gối thay vì cúi (ảnh mẫu khung "dưới đáy").
      const off = st.side * (aim.x - st.hip.x);
      const pMax = Math.min(PITCH_MAX, Math.asin(clamp((off - 15) / B.shoulderAt, 0, 1)) / DEG);
      // Tay ra xa phía trước-dưới quá tầm thoải mái → nghiêng người tới đón (như người thật với ra trước).
      const reachPitch = () => {
        for (let p = 0; p <= pMax; p += 1) {
          const sx = st.hip.x + st.side * B.shoulderAt * Math.sin(p * DEG);
          const sy = st.ground - LEG_DROP - B.shoulderAt * Math.cos(p * DEG);
          if (Math.hypot(aim.x - sx, aim.y - sy) <= COMFORT_REACH - 1) return p;
        }
        return pMax;
      };
      if (up >= -DOWN) return { crouch: 0, pitch: up < 0 ? reachPitch() : 0 };
      const need = -DOWN - up;
      const hinge = Math.min(need, B.shoulderAt * (1 - Math.cos(pMax * DEG)));
      const p = Math.max(Math.acos(1 - hinge / B.shoulderAt) / DEG, reachPitch());
      return { crouch: clamp(need - B.shoulderAt * (1 - Math.cos(p * DEG)), 0, CROUCH_MAX), pitch: p };
    }


    function leanFor(a) {
      const off = st.side * (a.x - drawShoulderOf(torso(0)).x); // tay so với vai khi chưa nghiêng
      const want = clamp((off - ZONE.hi) * 0.6, -6, LEAN_MAX);   // chỉ nghiêng khi tay vượt mép vùng
      return dist(drawShoulderOf(torso(want)), a) > COMFORT_REACH ? LEAN_MAX : want;
    }

    /** Vai vẽ lệch bao nhiêu so với hông theo phương ngang (cúi/nghiêng làm vai đổ ra trước). */
    function shoulderShift() {
      return drawShoulderOf(torso(st.lean)).x - st.hip.x;
    }

    /**
     * Đứng sao cho TAY ở phía trước VAI VẼ một khoảng thoải mái (tính cả phần vai đổ ra khi cúi):
     * cúi càng sâu thì chân càng lùi ra, không chồm lên trên bàn tay.
     */
    function planHorizontal(a, t, dtS) {
      const side = st.side;
      if (dtS > 0) st.tipVx += ((t.x - st.last.x) / dtS - st.tipVx) * clamp(dtS * 12, 0, 1);
      // Độ lệch vai làm mượt: cắt vòng phản hồi vai ↔ kế hoạch bước ↔ vận tốc ↔ góc người.
      st.shiftS = Number.isFinite(st.shiftS) ? st.shiftS + (shoulderShift() - st.shiftS) * clamp(dtS * 6, 0, 1) : shoulderShift();
      const sh = st.shiftS;
      const off = side * (a.x - (st.hip.x + sh));
      // Tầm thoải mái là hình tròn quanh vai: tay càng cao/thấp so với vai thì khoảng ngang cho phép càng hẹp.
      const dy = a.y - drawShoulderOf(torso(st.lean)).y;
      const hi = clamp(Math.sqrt(Math.max(0, (COMFORT_REACH - 1) ** 2 - dy * dy)), ZONE.lo, ZONE.hi);
      const keep = clamp(off, ZONE.lo, hi);
      const lead = keep !== off ? st.tipVx * LEAD_S : 0;
      // Tay đang co về gần vai → lùi dần từ sớm (mềm), để ràng buộc cứng MIN_WORK hầu như không phải can thiệp.
      const S = drawShoulderOf(torso(st.lean));
      const soft = MIN_WORK + 8;
      const backOff = Math.max(0, soft - dist(S, a));
      const s = spring(st.hip.x, st.velX, a.x - side * keep - sh + lead - side * backOff, SPRING_HZ, dtS);
      st.hip.x = s.pos;
      st.velX = s.vel;
    }

    /**
     * Pha cầm bút như ảnh mẫu. Trước nét đầu: từ tay nghỉ đưa bút lên điểm đầu.
     * Vẽ xong: giữ bút một nhịp (HOLD_MS) rồi hạ tay về tư thế nghỉ. Nghỉ ngắn giữa hai nét: giữ bút.
     */
    function planReach(drawing, dtMs) {
      if (drawing) {
        st.hasDrawn = true;
        st.idleMs = 0;
        st.reach = Math.min(1, st.reach + dtMs / (RAISE_MS / 2));
        return;
      }
      st.idleMs += dtMs;
      if (!st.hasDrawn) st.reach = Math.min(1, st.reach + dtMs / RAISE_MS);
      else if (st.idleMs > HOLD_MS) st.reach = Math.max(0, st.reach - dtMs / LOWER_MS);
    }

    function planVertical(a, t, dtS) {
      if (dtS > 0) st.tipVy += ((t.y - st.last.y) / dtS - st.tipVy) * clamp(dtS * 12, 0, 1);
      // Nếu nét vượt khỏi tầm với dọc tại chỗ (hình cao hơn tầm đứng), trượt mặt sàn theo nét
      // để dáng người vẫn đứng thẳng/nghiêng nhẹ tự nhiên (không xổm bẹt) và giữ khung bao sát hình.
      const shStand = st.ground - LEG_DROP - B.shoulderAt;
      const hiReach = UP + TIPTOE_MAX;
      const loReach = DOWN + HINGE_DROP + 6;
      if (a.y > shStand + loReach) {
        const wantG = a.y - (DOWN + HINGE_DROP) + LEG_DROP + B.shoulderAt;
        st.ground = Math.max(st.ground + (wantG - st.ground) * clamp(dtS * 18, 0, 1), a.y - loReach + LEG_DROP + B.shoulderAt);
      } else if (a.y < shStand - hiReach) {
        const wantG = a.y + UP + LEG_DROP + B.shoulderAt;
        st.ground = Math.min(st.ground + (wantG - st.ground) * clamp(dtS * 18, 0, 1), a.y + hiReach + LEG_DROP + B.shoulderAt);
      }
      // Chỉ đón trước khi nét đi xuống (khuỵu/gập kịp); đi lên thì đứng dậy theo nét.
      // Dự đoán không vượt quá đáy hình (nếu biết khung bao) — không khuỵu cho chỗ nét không bao giờ tới.
      const aimY = Math.min(a.y + Math.max(0, st.tipVy) * LEAD_S, st.handMaxY);
      const v = verticalFor({ x: a.x, y: Math.max(a.y, aimY) });
      const sp = spring(st.pitch, st.pitchVel || 0, v.pitch, PITCH_HZ, dtS);
      const maxTurn = PITCH_MAX_RATE * dtS;
      const next = clamp(clamp(sp.pos, st.pitch - maxTurn, st.pitch + maxTurn), 0, PITCH_MAX);
      st.pitchVel = dtS > 0 ? (next - st.pitch) / dtS : 0;
      st.pitch = next;
      const want = v.crouch;
      const s = spring(st.crouch, st.crouchVel, want, CROUCH_HZ, dtS);
      st.crouch = clamp(s.pos, -TIPTOE_MAX, CROUCH_MAX);
      st.crouchVel = s.vel;
    }

    /** Bàn chân hiển thị được (không xa hông quá độ dài chân) — dùng làm điểm nhấc khi bắt đầu bước. */
    function reachableFootX(k) {
      const f = st.feet[k];
      const hipK = st.hip.x + (k === 'l' ? -1 : 1) * HIP_HALF * (1 - Math.abs(st.facing));
      const dy = st.ground - (f.lift || 0) - st.hip.y;
      const maxDx = Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - dy * dy));
      return clamp(f.x, hipK - maxDx, hipK + maxDx);
    }

    function stepFeet(dtMs) {
      // Vận tốc cho bước chân: lọc nhanh (bỏ rung do các ràng buộc cứng, không làm chậm nhịp bước).
      st.footV = (st.footV || 0) + (st.velX - (st.footV || 0)) * clamp(dtMs / 1000 * 14, 0, 1);
      const speed = Math.abs(st.footV);
      const squat = clamp(st.crouch / CROUCH_MAX, 0, 1);
      // Đi nhanh → bước nhanh (tới mức chạy); xổm sâu → nhích ít bước, chậm hơn.
      const stepMs = clamp(STEP_MS - speed * 0.4, 120, STEP_MS) + squat * 120;
      const trigger = STEP_TRIGGER + squat * 6;
      // Đứng: chân chữ A trước/sau; đi: hai chân lướt qua nhau. Đổi dáng từ từ (chân vung không bị kéo giật).
      st.walkS = (st.walkS || 0) + ((st.walk || 0) - (st.walkS || 0)) * clamp(dtMs / 1000 * 3, 0, 1);
      const spread = FOOT_HALF * (1 - st.walkS);
      // Tầm chân ngang ở độ cao hông hiện tại (kiễng → hông cao → với ngang được ít hơn).
      // Tính theo độ cao hông khi đứng (chưa cộng phần nảy khi đi) — tránh vòng phản hồi nảy ↔ sải chân.
      const reachX = Math.sqrt(Math.max(1, LEG_MAX * LEG_MAX - (LEG_DROP - st.crouch) ** 2));
      const leadCap = Math.min(18, 0.75 * reachX);
      const lead = clamp(st.footV * 0.18, -leadCap, leadCap);
      // Sải chân: chân trụ đi từ +lead (vừa đáp) tới −lead (sau hông) rồi mới nhấc → không bước lê.
      const strideTrigger = Math.max(trigger, 1.8 * Math.abs(lead));
      const moveDir = Math.abs(st.footV) > 20 ? Math.sign(st.footV) : 0;
      // Chỗ đặt chân mong muốn (đã gồm đón trước). Điều kiện bước đo tới đúng chỗ này,
      // nên vừa đáp xuống thì không tự "cần bước" lại ngay.
      const nominal = { l: st.hip.x - spread + lead, r: st.hip.x + spread + lead };
      let bob = 0;
      let busy = false;
      ['l', 'r'].forEach((k) => {
        const f = st.feet[k];
        if (!f.swing) return;
        f.swing.t += dtMs;
        const u = clamp(f.swing.t / f.swing.ms, 0, 1);
        // Pha vung tính SO VỚI HÔNG (khung chậu mang chân theo): từ sau hông ra trước hông,
        // nên chân vung không bao giờ tụt lại sau thân dù thân chạy nhanh.
        const toRel = clamp(nominal[k] - st.hip.x, -0.8 * reachX, 0.8 * reachX); // đáp trong tầm chân
        f.x = st.hip.x + f.swing.fromRel + (toRel - f.swing.fromRel) * (0.5 - 0.5 * Math.cos(Math.PI * u));
        f.lift = STEP_LIFT * Math.sin(Math.PI * u) ** 2; // chạm đất êm (vận tốc nhấc = 0 ở hai đầu)
        bob = Math.max(bob, STEP_BOB * Math.sin(Math.PI * u));
        if (u < 0.6) busy = true; // chân kia được nhấc khi chân này sắp chạm đất (nhịp chạy)
        if (u >= 1) { f.swing = null; f.planted = true; f.lift = 0; }
      });
      // Chân trụ sắp bị thân kéo quá 75% tầm chân → buộc nhấc ngay (cho phép pha bay khi chạy).
      // Đo theo độ cao hông khi đứng (phần nảy khi đi đã tự nhường chân trụ).
      const overstretched = ['l', 'r'].filter((k) => !st.feet[k].swing && Math.abs(st.feet[k].x - st.hip.x) > 0.9 * reachX
        && (!moveDir || moveDir * (st.feet[k].x - st.hip.x) < 0));
      if (!busy || overstretched.length) {
        const cand = ['l', 'r']
          .filter((k) => !st.feet[k].swing && (!busy || overstretched.includes(k)))
          // Đang đi: chân còn ở trước hông thì chưa nhấc (trừ khi bị kéo căng).
          .filter((k) => overstretched.includes(k) || !moveDir || moveDir * (reachableFootX(k) - st.hip.x) <= 0)
          .map((k) => ({ k, e: Math.abs(st.feet[k].x - nominal[k]) }))
          .sort((p, q) => q.e - p.e)[0];
        if (cand && (cand.e > strideTrigger || overstretched.includes(cand.k))) {
          const f = st.feet[cand.k];
          f.x = reachableFootX(cand.k); // nhấc từ đúng chỗ đang hiển thị
          f.planted = false;
          f.swing = { fromRel: f.x - st.hip.x, t: 0, ms: stepMs };
        }
      }
      return bob;
    }

    /**
     * Đi: hông nảy qua chân trụ như con lắc ngược — chân trụ gần thẳng, hông cao nhất khi chân trụ
     * ngay dưới hông. Đứng vẽ: gối chùng nhẹ (LEG_DROP). Hông không bao giờ cao quá tầm chân trụ.
     */
    function planVault(dtS) {
      const squat = clamp(st.crouch / CROUCH_MAX, 0, 1);
      st.walk = clamp((Math.abs(st.footV || 0) - 15) / 60, 0, 1) * (1 - squat);
      // Mọi chân (cả chân đang vung, cộng độ nhấc) phải với tới: chân vung sắp chạm đất kéo hông
      // hạ dần xuống trước → lúc đổi chân trụ hông không bị giật.
      const reach = (k, len) => {
        const fo = st.feet[k];
        const hipK = st.hip.x + (k === 'l' ? -1 : 1) * HIP_HALF * (1 - Math.abs(st.facing));
        return Math.sqrt(Math.max(0, len * len - (fo.x - hipK) ** 2)) + (fo.lift || 0);
      };
      const toVault = (h) => st.walk * clamp(h - LEG_DROP, -2, LEG_STANCE - LEG_DROP);
      const target = toVault(Math.min(reach('l', LEG_STANCE), reach('r', LEG_STANCE)));
      // Ràng buộc cứng dùng độ dài chân tối đa: chừa khoảng đệm cho bộ lọc, chân trụ vẫn luôn với tới đất.
      const hard = Math.min(...['l', 'r'].filter((k) => !st.feet[k].swing)
        .map((k) => clamp(reach(k, LEG_MAX - 0.05) - LEG_DROP, -2, Infinity)), Infinity);
      const cur = Number.isFinite(st.vault) ? st.vault : target;
      // Lọc mượt cả lên lẫn xuống; riêng chân đang trụ là ràng buộc cứng (không để chân trụ bị kéo).
      st.vault = Math.min(hard, cur + (target - cur) * clamp(dtS * VAULT_HZ, 0, 1));
      return st.vault;
    }

    /**
     * Thân 3D chiếu xuống 2D. Gập hông góc p về hướng cúi; hướng cúi xoay theo góc người
     * (quay vào bảng → cúi vào bảng = thu ngắn; quay nghiêng → cúi về phía chỗ vẽ, thấy rõ).
     * Vai luôn hạ đúng 42·(1 − cos p) ở mọi góc người. Nghiêng sườn chỉ thấy khi quay lưng vào bảng.
     */
    function torso(lean) {
      const f = st.facing;
      const p = (st.pitch || 0) * DEG;
      const yaw = Math.abs(f) * Math.PI / 2;
      const vx = st.side * Math.sin(p) * Math.sin(yaw);
      const vy = -Math.cos(p);
      const k = Math.hypot(vx, vy);                       // độ dài chiếu (≤ 1)
      const ang = Math.atan2(vy, vx) / DEG + st.side * lean * (1 - Math.abs(f)); // đứng thẳng lưng, không gù
      const neck = along(st.hip, ang, B.torso * k);
      const shoulder = along(st.hip, ang, B.shoulderAt * k);
      const spread = SH_HALF * (1 - Math.abs(f));
      const px = Math.cos((ang + 90) * DEG) * spread;
      const py = Math.sin((ang + 90) * DEG) * spread;
      return {
        ang, neck, shoulder, k,
        depthTorso: B.torso * Math.sqrt(Math.max(0, 1 - k * k)),
        lShoulder: { x: shoulder.x - px, y: shoulder.y - py },
        rShoulder: { x: shoulder.x + px, y: shoulder.y + py },
      };
    }
    const drawShoulderOf = (T) => (st.side > 0 ? T.rShoulder : T.lShoulder);

    /** Nghiêng sườn vừa phải khi vươn; phương án cuối: dời hông (giữ tay trước vai, trong tầm). */
    function placeTorso(a, dtMs) {
      const side = st.side;
      const want = leanFor(a);
      const maxStep = LEAN_RATE * dtMs / 1000;
      st.lean += clamp(want - st.lean, -maxStep, maxStep);
      let T = torso(st.lean);
      let S = drawShoulderOf(T);
      const across = side * (a.x - S.x);
      if (across < -2) st.hip.x += side * (across + 2);           // không vắt chéo qua người
      T = torso(st.lean);
      S = drawShoulderOf(T);
      if (dist(S, a) < MIN_WORK) {                                 // tay co sát vai → lùi ra cho tay có chỗ
        const dyS = a.y - S.y;
        const needDx = Math.sqrt(Math.max(0, MIN_WORK * MIN_WORK - dyS * dyS));
        st.hip.x -= side * (needDx - side * (a.x - S.x));
      }
      T = torso(st.lean);
      S = drawShoulderOf(T);
      const d = dist(S, a);
      if (d > REACH) {                                          // bất khả kháng: dời hông
        const k = 1 - REACH / d;
        st.hip.x += (a.x - S.x) * k;
        st.hip.y += (a.y - S.y) * k;
        st.ground = clamp(st.ground, st.hip.y + LEG_DROP - CROUCH_MAX, st.hip.y + LEG_MAX);
      }
      return torso(st.lean);
    }

    function buildFrame(T, a, t) {
      const side = st.side;
      const f = st.facing;
      const J = { hip: { ...st.hip }, neck: T.neck, shoulder: T.shoulder, lShoulder: T.lShoulder, rShoulder: T.rShoulder };
      const angles = { torso: T.ang };
      const r = st.reach;
      const e = r < 0.5 ? 2 * r * r : 1 - (2 - 2 * r) ** 2 / 2;
      const lerp = (p, q) => ({ x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e });
      const lookP = lerp(st.lookAt || t, t);           // hạ bút xong thì ngắm lại cả hình
      const look = Math.atan2(lookP.y - J.neck.y, lookP.x - J.neck.x) / DEG;
      // Cổ dựng theo thân, chỉ gật/ngẩng nhẹ về phía bút (≤ 8°) — không chúi đầu.
      const tilt = clamp(angleDiff(look, T.ang) * 0.25, -8, 8);
      st.neckTilt = Number.isFinite(st.neckTilt) ? st.neckTilt + (tilt - st.neckTilt) * clamp(st.dtS * 6, 0, 1) : tilt;
      angles.neck = T.ang + st.neckTilt;
      J.head = along(J.neck, angles.neck, (B.neck + B.headR) * T.k);

      const draw = side > 0 ? { s: 'rShoulder', up: 'rUA', lo: 'rFA', el: 'rElbow', hand: 'rHand' } : { s: 'lShoulder', up: 'lUA', lo: 'lFA', el: 'lElbow', hand: 'lHand' };
      const free = side > 0 ? { s: 'lShoulder', up: 'lUA', lo: 'lFA', el: 'lElbow', hand: 'lHand' } : { s: 'rShoulder', up: 'rUA', lo: 'rFA', el: 'rElbow', hand: 'rHand' };
      const S = J[draw.s];
      const handAim = lerp({ x: S.x + side * REST_HAND.x, y: S.y + REST_HAND.y }, a);
      const arm = SM.solveTwoBone(S, handAim, UPPER_ARM, FORE_ARM, -side); // khuỷu hướng xuống
      angles[draw.up] = arm.upper;
      angles[draw.lo] = arm.lower;
      // Tay tự do: đánh NGƯỢC PHA với chân cùng bên (chân ra trước → tay ra sau), khuỷu chỉ gập về trước mặt.
      const freeFoot = side > 0 ? 'l' : 'r';
      const footRel = reachableFootX(freeFoot) - st.hip.x;
      const swing = clamp(footRel * ARM_SWING, -32, 32) * (st.walk || 0) * Math.abs(f);
      const wantUp = 90 - side * 8 * (1 - Math.abs(f)) + swing;
      const wantFlex = -12 * f - (1 - Math.abs(f)) * side * 6;
      const maxTurn = FREE_ARM_RATE * st.dtS;
      // Lò xo (có quán tính, không bẻ góc) + giới hạn tốc độ.
      if (!Number.isFinite(st.freeUp)) { st.freeUp = wantUp; st.freeUpVel = 0; }
      const fs = spring(st.freeUp, st.freeUpVel, wantUp, 4, st.dtS);
      st.freeUpVel = clamp(fs.vel, -FREE_ARM_RATE, FREE_ARM_RATE);
      st.freeUp += st.freeUpVel * st.dtS;
      st.freeFlex = Number.isFinite(st.freeFlex) ? st.freeFlex + clamp(wantFlex - st.freeFlex, -maxTurn, maxTurn) : wantFlex;
      angles[free.up] = st.freeUp;
      angles[free.lo] = st.freeUp + st.freeFlex;
      [draw, free].forEach((q) => {
        J[q.el] = along(J[q.s], angles[q.up], UPPER_ARM);
        J[q.hand] = along(J[q.el], angles[q.lo], FORE_ARM);
      });

      const spread = HIP_HALF * (1 - Math.abs(f));
      J.lHip = { x: st.hip.x - spread, y: st.hip.y };
      J.rHip = { x: st.hip.x + spread, y: st.hip.y };
      const depth = { torso: T.depthTorso };
      const feet = {};
      ['l', 'r'].forEach((k) => {
        const fo = st.feet[k];
        // Chỉ phần HIỂN THỊ được chặn trong tầm chân (đứng trên sàn, không lơ lửng theo đường chéo);
        // trạng thái chân trụ giữ nguyên — lúc nhấc bước sẽ đi tiếp từ đúng chỗ đang hiển thị.
        const target = { x: reachableFootX(k), y: st.ground - fo.lift };
        // profile: gối về hướng mặt; quay vào bảng: gối hơi mở ra hai bên (phần còn lại gập vào bảng).
        const kneeX = f + (1 - Math.abs(f)) * 0.3 * (k === 'l' ? -1 : 1);
        const leg = solveLeg(J[`${k}Hip`], target, kneeX);
        J[`${k}Knee`] = leg.knee;
        J[`${k}Foot`] = leg.foot;
        depth[`${k}Knee`] = leg.depth;
        feet[`${k}Foot`] = { x: fo.x, y: target.y, planted: fo.planted };
      });
      J.handsMid = { x: (J.lHand.x + J.rHand.x) / 2, y: (J.lHand.y + J.rHand.y) / 2 };

      const chalk = { dx: side * CHALK.dx, dy: CHALK.dy };
      const hand = J[draw.hand];
      const scale = st.scale;
      return {
        joints: J, angles, depth, feet, side, scale,
        facing: f,
        crouch: st.crouch,
        pitch: st.pitch || 0,
        drawHand: draw.hand,
        pose: { [draw.hand]: 'fist', [free.hand]: '' },
        chalk: { x: hand.x, y: hand.y, dx: chalk.dx, dy: chalk.dy },
        chalkTipPx: { x: (hand.x + chalk.dx) * scale, y: (hand.y + chalk.dy) * scale },
        camera: { x: 0, y: 0 }, props: [], contacts: [],
      };
    }

    /**
     * Tiến một khung. tip theo px. stepOpts.bounds = khung bao hình (px), dùng khi bắt đầu nét mới.
     * Trả về khung xương theo đơn vị khung xương (nhân scale ra px).
     */
    function step(tip, dtMs, stepOpts) {
      const bounds = stepOpts && stepOpts.bounds;
      if (!st || Math.hypot(tip.x - st.lastPx.x, tip.y - st.lastPx.y) > TELEPORT_PX) init(tip, bounds);
      const t = { x: tip.x / st.scale, y: tip.y / st.scale };
      const dt = clamp(Number.isFinite(dtMs) ? dtMs : 1000 / 60, 0, 50);
      const dtS = dt / 1000;
      st.dtS = dtS;
      const side = st.side;
      const point = tip.drawing === false ? { x: t.x + side * LIFT_OFF.x, y: t.y + LIFT_OFF.y } : t;
      const a = { x: point.x - side * CHALK.dx, y: point.y - CHALK.dy };

      planHorizontal(a, t, dtS);
      planReach(tip.drawing !== false, dt);
      planVertical(a, t, dtS);
      const bob = stepFeet(dt);
      const vault = planVault(dtS);
      // Hông không bao giờ cao quá tầm chân đang trụ (kiễng + nảy cộng lại) → chân trụ không bị kéo trượt.
      const plantedMax = Math.min(...['l', 'r'].filter((k) => !st.feet[k].swing)
        .map((k) => Math.sqrt(Math.max(0, (LEG_MAX - 0.05) ** 2 - (st.feet[k].x - st.hip.x) ** 2))), LEG_MAX - 0.3);
      st.hip.y = st.ground - Math.min(plantedMax, LEG_DROP - st.crouch + vault + bob * (1 - st.walk));
      const T = placeTorso(a, dt);
      st.last = t;
      st.lastPx = { x: tip.x, y: tip.y };
      return buildFrame(T, a, t);
    }

    return { step, reset() { st = null; }, get scale() { return st ? st.scale : baseScale; } };
  }

  // ---------- adapter vẽ trực tiếp lên canvas MinNote ----------
  let shared = null;
  let sharedKey = null;
  let lastNow = null;

  /**
   * Cùng chữ ký với MinNoteHandCursor.paintReplayTip — ctx đã ở hệ toạ độ bảng.
   * opts: { targetHeight, isDark, alpha, dtMs, bounds, fixedScale, maxScaleMul }
   */
  function paintReplayTip(ctx, tip, board, opts) {
    if (!ctx || !tip || !tip.active || !Number.isFinite(tip.x) || !Number.isFinite(tip.y)) return null;
    const o = opts || {};
    const zoom = board && Number.isFinite(board.zoom) && board.zoom > 0 ? board.zoom : 1;
    const targetHeight = Number.isFinite(o.targetHeight) ? o.targetHeight : DEFAULT_HEIGHT_PX / clamp(zoom, 0.45, 2.6);
    const key = `${Math.round(targetHeight * 10)}_${o.fixedScale ? 1 : 0}_${Number.isFinite(o.maxScaleMul) ? o.maxScaleMul : ''}`;
    if (!shared || sharedKey !== key) {
      shared = createFollower({ targetHeight, fixedScale: !!o.fixedScale, maxScaleMul: o.maxScaleMul });
      sharedKey = key;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Number.isFinite(o.dtMs) ? o.dtMs : (lastNow === null ? 1000 / 60 : now - lastNow);
    lastNow = now;
    const frame = shared.step(tip, dt, { bounds: o.bounds });
    const R = root.SMRender;
    if (!R) return frame;
    const dark = typeof o.isDark === 'boolean' ? o.isDark
      : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    const style = dark
      ? { ink: '#e8edf4', accent: '#73a7ff', paper: 'rgba(0,0,0,0)', faint: '#1b2b45', grid: '#1c2530' }
      : { ink: '#1a1a1a', accent: '#2563c9', paper: 'rgba(0,0,0,0)', faint: '#dce8fb', grid: '#e5ebf3' };
    const fr = { ...frame, props: [{ type: 'pen', ...frame.chalk, opacity: 1, rot: 0, scale: 1 }] };
    ctx.save();
    if (Number.isFinite(o.alpha)) ctx.globalAlpha *= o.alpha;
    R.drawFrame(ctx, { floor: false }, fr, { cx: 0, cy: 0, scale: frame.scale, width: 1e5, height: 1e5 }, style, { lineWidth: 3 });
    ctx.restore();
    return frame;
  }

  function resetReplaySmoothing() { shared = null; sharedKey = null; lastNow = null; }

  const api = { createFollower, paintReplayTip, resetReplaySmoothing, REACH, COMFORT_REACH, FIG_H, UPPER_ARM, FORE_ARM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MinNoteStickFigure = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

  })(scope, undefined);
  win.MinNoteStickFigure = scope.MinNoteStickFigure;
})(typeof window !== 'undefined' ? window : globalThis);
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
