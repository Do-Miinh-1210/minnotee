/**
 * MinNote v0.0.9.2 — AI Dựng Hình Từng Nét & Nạp TikZ Chuẩn Ràng Buộc
 * - Nút #tb-btn-ai-geo cạnh Sơ Đồ Tư Duy + nút ✨ AI Dựng hình trên thanh chọn ảnh/đề bài
 * - Phân tích đề/ảnh (hoặc chỉ dán ảnh) -> JSON cấu trúc hình học ràng buộc chặt -> Dựng từng nét trực tiếp
 * - Bộ chuẩn hóa ràng buộc TikZ (__mnRefineTikzConstraints): khóa điểm trong đoạn (seg: true), trung điểm, chân đường vuông góc, giao điểm, điểm trên đường tròn.
 */
(() => {
  'use strict';

  const getBoard = () => window.__minnoteBoard || (window.__meaBoardRef && window.__meaBoardRef.current) || null;
  const getKernel = () => window.__mnGeoKernel || null;

  const SAMPLE_PROMPTS = [
    {
      label: 'Chóp tứ giác & giao tuyến',
      text: 'Cho hình chóp S.ABCD có đáy ABCD là tứ giác lồi, AC cắt BD tại O. Gọi M, N lần lượt là trung điểm của SC và SD.\na) Tìm giao tuyến của (SAC) và (SBD).\nb) Tìm giao điểm I của SD với mặt phẳng (ABM).\nc) Tìm giao tuyến của (AMN) và (ABCD).'
    },
    {
      label: 'Chóp SA ⊥ đáy (ABCD)',
      text: 'Cho hình chóp S.ABCD có đáy ABCD là hình bình hành tâm O, SA vuông góc với đáy (ABCD). Gọi M là trung điểm của SC, H là hình chiếu vuông góc của A lên SB. Chứng minh và dựng hình.'
    },
    {
      label: 'Đường tròn & tiếp tuyến',
      text: 'Cho đường tròn (O; R), điểm A nằm ngoài đường tròn. Kẻ hai tiếp tuyến AB, AC tới đường tròn (O) với B, C là các tiếp điểm. Gọi H là giao điểm của OA và BC. Dựng hình và kí hiệu các góc vuông.'
    }
  ];

  const AI_GEO_SYSTEM_PROMPT = `Bạn là chuyên gia Toán Hình học & Kỹ sư Dựng hình Tham số của MinNote.
Nhiệm vụ: Đọc đề bài (văn bản hoặc ảnh: đề tự luận/trắc nghiệm, bảng Đúng-Sai 4 ý, hoặc ảnh hình vẽ SGK/vẽ tay) -> xuất DUY NHẤT 1 JSON "ops" dựng hình logic TỪNG NÉT.

QUY TẮC BẮT BUỘC:
1. RÀNG BUỘC ĐIỂM (cấm điểm rời rạc):
   - Chỉ ĐỈNH GỐC tự do dùng "point_free" (A, B, C, D, S hoặc tâm O, điểm R đường tròn).
   - Hình bình hành ABCD: đỉnh thứ 4 dùng "point_sum" (a:"B", b:"D", c:"A" => C = B + D - A).
   - Trung điểm: "midpoint" (a, b).
   - Điểm thuộc đoạn AB (không trôi ra ngoài đoạn): "point_on_segment" với ratio in (0.08..0.92).
   - Điểm trên phần kéo dài: "point_on_line" (ratio < 0 hoặc > 1).
   - Giao 2 đường thẳng: "intersection_ll" (l1, l2). Nếu 2 đường song song (vd MN // CD khi M, N là trung điểm SC, SD), CẤM dùng "intersection_ll", phải dùng "line_parallel"!
   - Giao đường & tròn: "intersection_lc" (line, circle, which: 0|1).
   - Hình chiếu vuông góc từ P lên AB: "foot_perp" (p, a, b).
   - Song song / vuông góc: "line_parallel" / "line_perp" (kèm "asLine": true, "noDot": true nếu là tên đường thẳng x, d).
   - Điểm trên (O, R): "point_on_circle" (center, rim, angleDeg).
2. TỌA ĐỘ (+x phải, +y LÊN TRÊN):
   - Chóp TỨ GIÁC LỒI THƯỜNG S.ABCD (hai cặp cạnh đối KHÔNG song song):
     A(-2.8, 0.0), D(3.2, 0.2), B(-1.2, -2.0), C(1.9, -1.7), S(-0.4, 3.8); chỉ AD "dashed": true.
   - Chóp đáy HÌNH BÌNH HÀNH / CHỮ NHẬT / VUÔNG / THOI ABCD:
     A(-2.2, 0.0), D(2.6, 0.0), B(-3.6, -1.8), C = point_sum(B, D, A); chỉ AB, AD "dashed": true. Nếu SA ⊥ (ABCD): S(-2.2, 4.0) (SA "dashed": true nếu bên trong).
   - Chóp tam giác S.ABC: A(-2.5, 0.0), C(2.8, 0.0), B(-0.6, -1.8), S(-0.2, 3.6); chỉ AC "dashed": true.
   - Lăng trụ / Hình hộp: dựng đáy dưới trước, đặt A' bằng "point_free", các đỉnh B', C', D' dùng "point_sum" theo AA'.
3. NỐI ĐỦ NÉT MẶT PHẲNG / THIẾT DIỆN & NÉT LIỀN / ĐỨT:
   - Mọi điểm sinh ra (M, N, O, K, I, H...) PHẢI được nối đầy đủ bằng "segment" hoặc "connect_polygon", không để điểm trơ trọi.
   - Nét khuất đáy, đường chéo đáy, đường cao trong khối, nét xuyên lòng chóp / mặt sau -> "dashed": true; cạnh bao ngoài & mặt trước -> "dashed": false.
   - Đường thẳng giao tuyến song song (Ax // CD): "line_parallel" với "asLine": true, "noDot": true, "label": "x", "aux": true.
4. STYLE & ĐẦU RA GỌN NHANH:
   - KHÔNG tự ý thêm "color" hay "width" (trừ khi đề bài yêu cầu màu riêng -> kèm "explicitColor": true). Gắn "aux": true cho đường chéo/đường cao/nét phụ/kí hiệu góc vuông.
   - Thứ tự ops: (1) Đỉnh gốc -> (2) Cạnh đáy -> (3) Đỉnh S & cạnh bên -> (4) Trung điểm / đường chéo giả thiết -> (5) Nét phụ gợi ý các câu hỏi.
   - Trả về DUY NHẤT 1 JSON súc tích, không viết lời giải thích ngoài JSON.

SCHEMA "ops":
- {"op":"point_free","id":"A","label":"A","x":-2.8,"y":0,"step":"Chấm đỉnh A"}
- {"op":"point_sum","id":"C","label":"C","a":"B","b":"D","c":"A","step":"Dựng đỉnh C"}
- {"op":"midpoint","id":"M","label":"M","a":"S","b":"C","step":"Trung điểm M của SC"}
- {"op":"point_on_segment","id":"N","label":"N","a":"S","b":"D","ratio":0.35,"step":"Điểm N trên đoạn SD"}
- {"op":"point_on_line","id":"E","label":"E","a":"C","b":"D","ratio":1.4,"step":"Điểm E trên CD kéo dài"}
- {"op":"intersection_ll","id":"O","label":"O","l1":["A","C"],"l2":["B","D"],"drawExtensions":true,"step":"Giao điểm O = AC ∩ BD"}
- {"op":"intersection_lc","id":"K","label":"K","line":["A","O"],"circle":["O","B"],"which":0,"step":"Giao điểm với đường tròn"}
- {"op":"foot_perp","id":"H","label":"H","p":"A","a":"S","b":"B","drawDropSegment":true,"dashed":false,"markRightAngle":true,"aux":true,"step":"Hạ AH ⊥ SB"}
- {"op":"circle","center":"O","rim":"R","dashed":false,"step":"Đường tròn (O)"}
- {"op":"point_on_circle","id":"B","label":"B","center":"O","rim":"R","angleDeg":125,"step":"Điểm B trên (O)"}
- {"op":"line_parallel","id":"x","label":"x","through":"A","a":"C","b":"D","k":1.2,"asLine":true,"bothSides":false,"noDot":true,"aux":true,"step":"Giao tuyến Ax // CD"}
- {"op":"line_perp","id":"q","label":"q","through":"A","a":"O","b":"A","k":1.2,"asLine":true,"noDot":true,"aux":true,"step":"Đường thẳng vuông góc"}
- {"op":"segment","a":"A","b":"D","dashed":true,"step":"Cạnh khuất AD"}
- {"op":"connect_polygon","pts":["A","B","M","I"],"dashedEdges":["A-I"],"fill":"rgba(15, 23, 42, 0.06)","step":"Thiết diện ABMI"}
- {"op":"line"|"ray","a":"S","b":"O","dashed":true,"aux":true,"step":"Đường phụ SO"}
- {"op":"right_angle","a":"S","v":"A","b":"B","aux":true,"step":"Góc vuông tại A"}
- {"op":"angle_mark","a":"B","v":"A","b":"C","n":1,"aux":true,"step":"Kí hiệu góc"}
- {"op":"polygon_fill","pts":["A","M","N"],"fill":"rgba(15, 23, 42, 0.06)","step":"Tô mặt (AMN)"}`;

  // ==========================================================================
  // 1. TIKZ & GENERAL GEOMETRY CONSTRAINT REFINER (__mnRefineTikzConstraints)
  // ==========================================================================
  function dist2D(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function pointSegProj(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return null;
    const L = Math.sqrt(l2);
    const k = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    const perp = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L;
    return { k, perp, len: L, ux: dx / L, uy: dy / L };
  }

  function refineTikzConstraints(fig, idGen) {
    const K = getKernel();
    if (!fig || !fig.points || !Array.isArray(fig.shapes) || !K || typeof K.Tt !== 'function') {
      return fig;
    }

    const isArrayPts = Array.isArray(fig.points);
    const ptList = isArrayPts
      ? fig.points.map(p => ({ ...p, def: p.def ? { ...p.def } : { t: 'free', x: 0, y: 0 } }))
      : Object.values(fig.points).map(p => ({ ...p, def: p.def ? { ...p.def } : { t: 'free', x: 0, y: 0 } }));

    const ptMap = Object.fromEntries(ptList.map(p => [p.id, p]));
    const ptOrder = new Map(ptList.map((p, idx) => [p.id, idx]));
    const shapes = fig.shapes.map(s => ({ ...s }));
    const coords = K.Tt({ points: ptMap, shapes });

    // Compute figure span for scale-invariant tolerance
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of coords.values()) {
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
      if (c.x < x0) x0 = c.x;
      if (c.y < y0) y0 = c.y;
      if (c.x > x1) x1 = c.x;
      if (c.y > y1) y1 = c.y;
    }
    if (!Number.isFinite(x0)) return fig;
    const span = Math.max(1e-3, Math.hypot(x1 - x0, y1 - y0));
    const tol = Math.max(1e-3, span * 0.0085);

    // Collect drawn segments, lines, rays, circles, right marks
    const adjDirs = new Map(); // id -> [{to, ux, uy}]
    const rawSegKeys = new Set();
    const carriers = []; // { a, b, ux, uy, len }
    const carrierKeys = new Set();
    const linesAndRays = []; // { a, b, kind, ux, uy, len }
    const circles = []; // { sh, o, rPt, radius }
    const rightAngles = []; // [a, v, b]

    const addAdj = (u, v) => {
      const pu = coords.get(u), pv = coords.get(v);
      if (!pu || !pv || u === v) return;
      const len = dist2D(pu, pv);
      if (len < 1e-6) return;
      const ux = (pv.x - pu.x) / len, uy = (pv.y - pu.y) / len;
      if (!adjDirs.has(u)) adjDirs.set(u, []);
      if (!adjDirs.has(v)) adjDirs.set(v, []);
      adjDirs.get(u).push({ to: v, ux, uy });
      adjDirs.get(v).push({ to: u, ux: -ux, uy: -uy });
    };

    const addCarrier = (a, b) => {
      if (!a || !b || a === b) return;
      const key = a < b ? a + '|' + b : b + '|' + a;
      if (carrierKeys.has(key)) return;
      const pa = coords.get(a), pb = coords.get(b);
      if (!pa || !pb) return;
      const len = dist2D(pa, pb);
      if (len < 1e-6) return;
      carrierKeys.add(key);
      carriers.push({ a, b, ux: (pb.x - pa.x) / len, uy: (pb.y - pa.y) / len, len });
    };

    for (const sh of shapes) {
      if (!sh || sh.hidden) continue;
      if (sh.kind === 'segment' && Array.isArray(sh.pts) && sh.pts.length >= 2) {
        const [a, b] = sh.pts;
        rawSegKeys.add(a < b ? a + '|' + b : b + '|' + a);
        addAdj(a, b);
        addCarrier(a, b);
      } else if (sh.kind === 'polygon' && Array.isArray(sh.pts) && sh.pts.length >= 3 && sh.width !== 0) {
        const gaps = new Set(sh.gaps || []);
        for (let i = 0; i < sh.pts.length; i++) {
          if (gaps.has(i)) continue;
          const a = sh.pts[i], b = sh.pts[(i + 1) % sh.pts.length];
          rawSegKeys.add(a < b ? a + '|' + b : b + '|' + a);
          addAdj(a, b);
          addCarrier(a, b);
        }
      } else if ((sh.kind === 'line' || sh.kind === 'ray') && Array.isArray(sh.pts) && sh.pts.length >= 2) {
        const [a, b] = sh.pts;
        const pa = coords.get(a), pb = coords.get(b);
        if (pa && pb) {
          const len = dist2D(pa, pb);
          if (len > 1e-6) {
            linesAndRays.push({ a, b, kind: sh.kind, ux: (pb.x - pa.x) / len, uy: (pb.y - pa.y) / len, len });
          }
        }
      } else if (sh.kind === 'circle' && Array.isArray(sh.pts) && sh.pts.length >= 2) {
        const [o, rPt] = sh.pts;
        const po = coords.get(o), pr = coords.get(rPt);
        if (po && pr) {
          const radius = dist2D(po, pr);
          if (radius > 1e-6) circles.push({ sh, o, rPt, radius });
        }
      } else if (sh.kind === 'right' && Array.isArray(sh.pts) && sh.pts.length >= 3) {
        rightAngles.push(sh.pts);
      }
    }

    // Walk collinear chains so split segments (S--M + M--C) form full carrier (S, C)
    const dirBuckets = (id) => {
      const dirs = adjDirs.get(id) || [];
      const uniq = [];
      for (const d of dirs) {
        if (!uniq.some(u => Math.abs(u.ux * d.uy - u.uy * d.ux) < 0.035)) {
          uniq.push(d);
        }
      }
      return uniq.length;
    };

    for (const [midId, edges] of adjDirs.entries()) {
      if (edges.length < 2) continue;
      for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const d1 = edges[i], d2 = edges[j];
          // Nearly opposite directions along the same line
          const dot = d1.ux * d2.ux + d1.uy * d2.uy;
          if (dot > -0.996) continue;
          // Extend outward along d1 and d2 through strictly degree-2 collinear continuations
          const extendEnd = (startId, prevId, ux, uy) => {
            let cur = startId, prev = prevId, guard = 0;
            while (guard++ < 16) {
              const nextEdges = adjDirs.get(cur) || [];
              const cont = nextEdges.find(e => e.to !== prev && (e.ux * ux + e.uy * uy) > 0.996);
              if (!cont) break;
              prev = cur;
              cur = cont.to;
            }
            return cur;
          };
          const end1 = extendEnd(d1.to, midId, d1.ux, d1.uy);
          const end2 = extendEnd(d2.to, midId, d2.ux, d2.uy);
          addCarrier(end1, end2);
        }
      }
    }

    const canDependOn = (targetId, depIds) => {
      if (!depIds || !depIds.length) return false;
      for (const d of depIds) {
        if (!d || d === targetId || !ptMap[d]) return false;
      }
      if (typeof K.Om !== 'function') return true;
      const visited = new Set();
      const stack = [...depIds];
      while (stack.length) {
        const cur = stack.pop();
        if (cur === targetId) return false;
        if (visited.has(cur)) continue;
        visited.add(cur);
        const p = ptMap[cur];
        if (!p || !p.def) continue;
        for (const dep of (K.Om(p.def) || [])) {
          if (dep === targetId) return false;
          if (!visited.has(dep)) stack.push(dep);
        }
      }
      return true;
    };

    const stats = { free: 0, mid: 0, onSeg: 0, onLine: 0, inter: 0, foot: 0, circle: 0, upgraded: 0 };

    // First, clamp existing 'on' constraints whose k in [0,1] and carrier segment exists
    for (const pt of ptList) {
      if (pt.def && pt.def.t === 'on' && !pt.def.seg) {
        const kk = Number(pt.def.k);
        const key = pt.def.a < pt.def.b ? pt.def.a + '|' + pt.def.b : pt.def.b + '|' + pt.def.a;
        if (Number.isFinite(kk) && kk >= 0 && kk <= 1 && (rawSegKeys.has(key) || carrierKeys.has(key))) {
          pt.def = { ...pt.def, k: Math.min(1, Math.max(0, kk)), seg: true };
          stats.upgraded++;
        }
      }
    }

    const isEndpointAnchorScore = (id) => {
      const p = ptMap[id];
      const deg = dirBuckets(id);
      return (deg >= 2 ? 100 : 0) + (p && p.def && p.def.t === 'free' ? 20 : 0) - (ptOrder.get(id) || 0) * 0.01;
    };

    // Pass 1: Interior of finite segment carriers (foot, interior inter, mid, on with seg:true)
    // Prefer upgrading points with lower independent direction count first so true base corners stay anchors.
    const freePts = ptList
      .filter(p => p.def && p.def.t === 'free' && coords.get(p.id))
      .sort((a, b) => dirBuckets(a.id) - dirBuckets(b.id));

    for (const pt of freePts) {
      const pc = coords.get(pt.id);
      if (!pc) continue;

      const interiorHits = [];
      for (const c of carriers) {
        if (c.a === pt.id || c.b === pt.id) continue;
        const proj = pointSegProj(pc, coords.get(c.a), coords.get(c.b));
        if (!proj) continue;
        if (proj.k >= 0.015 && proj.k <= 0.985 && proj.perp <= tol) {
          interiorHits.push({ carrier: c, ...proj });
        }
      }

      if (interiorHits.length) {
        // 1A: Check right-angle foot [X, pt.id, Y]
        let upgradedFoot = false;
        for (const ra of rightAngles) {
          if (ra[1] !== pt.id) continue;
          const legOther = [ra[0], ra[2]];
          for (const h of interiorHits) {
            const pX = legOther.find(id => {
              if (id === h.carrier.a || id === h.carrier.b) return false;
              const pr = pointSegProj(coords.get(id), coords.get(h.carrier.a), coords.get(h.carrier.b));
              return !pr || pr.perp > tol;
            });
            const pLegOnLine = legOther.find(id => id !== pX);
            if (!pX || !pLegOnLine) continue;
            const cX = coords.get(pX);
            if (!cX) continue;
            const dx = cX.x - pc.x, dy = cX.y - pc.y;
            const dLen = Math.hypot(dx, dy);
            if (dLen > 1e-6 && Math.abs((dx * h.ux + dy * h.uy) / dLen) < 0.03 && canDependOn(pt.id, [pX, h.carrier.a, h.carrier.b])) {
              pt.def = { t: 'foot', p: pX, a: h.carrier.a, b: h.carrier.b };
              stats.upgraded++;
              upgradedFoot = true;
              break;
            }
          }
          if (upgradedFoot) break;
        }
        if (upgradedFoot) continue;

        // 1B: Check intersection of TWO non-parallel interior carriers
        interiorHits.sort((u, v) => (v.len - u.len) || (u.perp - v.perp));
        let upgradedInter = false;
        if (interiorHits.length >= 2) {
          for (let i = 0; i < interiorHits.length && !upgradedInter; i++) {
            for (let j = i + 1; j < interiorHits.length; j++) {
              const h1 = interiorHits[i], h2 = interiorHits[j];
              const sinT = Math.abs(h1.ux * h2.uy - h1.uy * h2.ux);
              if (sinT < 0.08) continue;
              const deps = [h1.carrier.a, h1.carrier.b, h2.carrier.a, h2.carrier.b];
              if (canDependOn(pt.id, deps)) {
                pt.def = { t: 'inter', l1: [h1.carrier.a, h1.carrier.b], c1: false, l2: [h2.carrier.a, h2.carrier.b], c2: false, which: 0 };
                stats.upgraded++;
                upgradedInter = true;
                break;
              }
            }
          }
        }
        if (upgradedInter) continue;

        // 1C: Point lies cleanly inside a segment carrier -> mid or strictly clamped on(seg: true)
        interiorHits.sort((u, v) => {
          const sa = isEndpointAnchorScore(u.carrier.a) + isEndpointAnchorScore(u.carrier.b);
          const sb = isEndpointAnchorScore(v.carrier.a) + isEndpointAnchorScore(v.carrier.b);
          if (Math.abs(sb - sa) > 10) return sb - sa;
          return (v.len - u.len) || (u.perp - v.perp);
        });
        for (const h of interiorHits) {
          if (!canDependOn(pt.id, [h.carrier.a, h.carrier.b])) continue;
          if (Math.abs(h.k - 0.5) <= 0.012) {
            pt.def = { t: 'mid', a: h.carrier.a, b: h.carrier.b };
          } else {
            pt.def = { t: 'on', a: h.carrier.a, b: h.carrier.b, k: Math.min(1, Math.max(0, h.k)), seg: true };
          }
          stats.upgraded++;
          break;
        }
      }
    }

    // Pass 2: Remaining free points -> intersections of extended lines, points on infinite lines/rays, or circle points
    const remFree = ptList.filter(p => p.def && p.def.t === 'free' && coords.get(p.id));
    for (const pt of remFree) {
      const pc = coords.get(pt.id);
      if (!pc) continue;
      const deg = dirBuckets(pt.id);

      // Exterior intersection (like E = MN ∩ CD): typically at the tip of 1..2 directions (deg <= 2)
      if (deg <= 2) {
        const lineHits = [];
        for (const c of carriers) {
          if (c.a === pt.id || c.b === pt.id) continue;
          const proj = pointSegProj(pc, coords.get(c.a), coords.get(c.b));
          if (proj && proj.perp <= tol) {
            lineHits.push({ a: c.a, b: c.b, ux: c.ux, uy: c.uy, len: c.len, k: proj.k, isSeg: false });
          }
        }
        for (const lr of linesAndRays) {
          if (lr.a === pt.id || lr.b === pt.id) continue;
          const proj = pointSegProj(pc, coords.get(lr.a), coords.get(lr.b));
          if (proj && proj.perp <= tol) {
            lineHits.push({ a: lr.a, b: lr.b, ux: lr.ux, uy: lr.uy, len: lr.len, k: proj.k, isSeg: false });
          }
        }

        let matchedExtInter = false;
        if (lineHits.length >= 2) {
          // Prefer distinct lines whose endpoints have valid order / don't cycle
          for (let i = 0; i < lineHits.length && !matchedExtInter; i++) {
            for (let j = i + 1; j < lineHits.length; j++) {
              const h1 = lineHits[i], h2 = lineHits[j];
              if (Math.abs(h1.ux * h2.uy - h1.uy * h2.ux) < 0.08) continue;
              if (canDependOn(pt.id, [h1.a, h1.b, h2.a, h2.b])) {
                pt.def = { t: 'inter', l1: [h1.a, h1.b], c1: false, l2: [h2.a, h2.b], c2: false, which: 0 };
                stats.upgraded++;
                matchedExtInter = true;
                break;
              }
            }
          }
        }
        if (matchedExtInter) continue;

        // Point lying explicitly on a drawn line or ray (outside segment)
        const lrHit = linesAndRays
          .map(lr => ({ lr, proj: (lr.a !== pt.id && lr.b !== pt.id) ? pointSegProj(pc, coords.get(lr.a), coords.get(lr.b)) : null }))
          .filter(x => x.proj && x.proj.perp <= tol && (x.lr.kind === 'line' || x.proj.k >= -1e-4) && canDependOn(pt.id, [x.lr.a, x.lr.b]))
          .sort((u, v) => u.proj.perp - v.proj.perp)[0];
        if (lrHit) {
          pt.def = { t: 'on', a: lrHit.lr.a, b: lrHit.lr.b, k: lrHit.proj.k, seg: false };
          stats.upgraded++;
          continue;
        }
      }

      // Pass 3: Point lying on a drawn circle perimeter
      for (const cir of circles) {
        if (pt.id === cir.o || pt.id === cir.rPt) continue;
        const po = coords.get(cir.o);
        if (!po) continue;
        const d = dist2D(pc, po);
        if (Math.abs(d - cir.radius) <= tol && canDependOn(pt.id, [cir.o, cir.rPt])) {
          if (typeof K.LY === 'function') {
            const pathDef = K.LY(cir.sh, coords, pc);
            if (pathDef) {
              pt.def = pathDef;
              stats.upgraded++;
              break;
            }
          }
        }
      }
    }

    // Tally final constraint summary
    for (const pt of ptList) {
      const t = pt.def && pt.def.t;
      if (t === 'free') stats.free++;
      else if (t === 'mid') stats.mid++;
      else if (t === 'on') { if (pt.def.seg) stats.onSeg++; else stats.onLine++; }
      else if (t === 'inter') stats.inter++;
      else if (t === 'foot') stats.foot++;
      else if (t === 'path' || t === 'rot') stats.circle++;
    }

    // Verify zero broken points; if any became null, safely revert to free coordinate
    const verifyMap = Object.fromEntries(ptList.map(p => [p.id, p]));
    const postCoords = K.Tt({ points: verifyMap, shapes });
    for (const pt of ptList) {
      if (!postCoords.get(pt.id) && coords.get(pt.id)) {
        const orig = coords.get(pt.id);
        pt.def = { t: 'free', x: orig.x, y: orig.y };
      }
    }

    if (isArrayPts) {
      return { ...fig, points: ptList, shapes, constraintStats: stats };
    }
    return { ...fig, points: Object.fromEntries(ptList.map(p => [p.id, p])), shapes, constraintStats: stats };
  }

  window.__mnRefineTikzConstraints = refineTikzConstraints;

  // ==========================================================================
  // 2. STRUCTURED AI JSON PARSER & PARAMETRIC GEOMETRY COMPILER
  // ==========================================================================
  function extractJsonObject(rawText) {
    const text = String(rawText || '').trim();
    if (!text) throw new Error('AI không trả về dữ liệu.');
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const tryParse = (candidate) => {
      try {
        return JSON.parse(candidate);
      } catch {
        // Remove trailing commas before } or ]
        const noTrail = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(noTrail);
      }
    };

    try {
      return tryParse(cleaned);
    } catch {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first >= 0 && last > first) {
        return tryParse(cleaned.slice(first, last + 1));
      }
      throw new Error('Không phân tích được JSON cấu trúc dựng hình từ phản hồi AI.');
    }
  }

  function makeStepForPt(pid, title) {
    return {
      id: 'st_ai_p_' + pid + '_' + Math.random().toString(36).slice(2, 5),
      kind: 'point',
      refId: pid,
      rev: false,
      showGuides: true,
      effect: 'draw',
      easing: 'easeInOut',
      customTitle: title || undefined,
      enabled: true
    };
  }

  function makeStepForShape(shid, title, tempHide = false) {
    return {
      id: 'st_ai_s_' + shid + '_' + Math.random().toString(36).slice(2, 5),
      kind: 'shape',
      refId: shid,
      rev: false,
      tempHide: !!tempHide,
      effect: 'draw',
      easing: 'easeInOut',
      customTitle: title || undefined,
      enabled: true
    };
  }

  function getAppGeoStyle(board) {
    let color = (board && board.shapeStyle && board.shapeStyle.color) || '';
    let width = (board && board.shapeStyle && Number.isFinite(Number(board.shapeStyle.width))) ? Number(board.shapeStyle.width) : 0;
    try {
      const gd = window.__mnGeoDefaults;
      if (gd) {
        if (!color && gd.lineColor) color = gd.lineColor;
        if (!(width > 0) && Number(gd.lineWidth) > 0) width = Number(gd.lineWidth);
      }
      if (!color || !(width > 0)) {
        const pr = JSON.parse(localStorage.getItem('prefs') || '{}');
        if (!color && pr.geoLineColor) color = pr.geoLineColor;
        if (!(width > 0) && Number(pr.geoLineWidth) > 0) width = Number(pr.geoLineWidth);
      }
    } catch {}
    return {
      color: color || '#1a1a1a',
      width: (width > 0 && Number.isFinite(width)) ? width : 2.5
    };
  }

  function compileAiGeoPlan(plan, board, anchorBox) {
    const K = getKernel();
    if (!K || typeof K.nt !== 'function' || typeof K.Tt !== 'function') {
      throw new Error('Nhân hình học MinNote chưa sẵn sàng.');
    }
    const genId = () => K.nt();
    const ops = Array.isArray(plan && plan.ops) ? plan.ops
      : (Array.isArray(plan && plan.constructions) ? plan.constructions : (Array.isArray(plan && plan.steps) ? plan.steps : []));
    if (!ops.length) {
      throw new Error('Kịch bản AI không chứa thao tác dựng hình nào.');
    }

    const appStyle = getAppGeoStyle(board);
    const symToPt = new Map(); // symbolic name (e.g. "A", "S", "M'") -> internal pt object
    const pts = [];
    const shapes = [];
    const shapeByEdgeKey = new Map();
    const rawSteps = [];

    const registerPoint = (sym, def, label, show = true, extra = {}) => {
      const id = genId();
      const lbl = label !== undefined ? String(label) : String(sym || '');
      const hasName = !!(show && lbl);
      const isNoDot = extra.noDot !== undefined ? !!extra.noDot : !show;
      const pt = {
        id,
        def,
        label: hasName ? lbl : '',
        show: !!show,
        ...(isNoDot ? { noDot: true } : {}),
        ...(hasName ? { named: true } : { noName: true })
      };
      pts.push(pt);
      if (sym) symToPt.set(String(sym).trim(), pt);
      return pt;
    };

    const resolvePt = (sym, fallbackPt) => {
      if (!sym) return null;
      const key = String(sym).trim();
      if (symToPt.has(key)) return symToPt.get(key);
      if (fallbackPt && typeof fallbackPt === 'object' && Number.isFinite(fallbackPt.x) && Number.isFinite(fallbackPt.y)) {
        return registerPoint(key, { t: 'free', x: Number(fallbackPt.x), y: -Number(fallbackPt.y) }, key, true);
      }
      return null;
    };

    const addShapeRec = (kind, ptIds, opts = {}) => {
      const useCustomCol = !!(opts.explicitColor && opts.color);
      const useCustomW = !!(opts.explicitWidth && Number.isFinite(opts.width));
      const sh = {
        id: genId(),
        kind,
        pts: ptIds,
        color: useCustomCol ? opts.color : appStyle.color,
        width: opts.width === 0 ? 0 : (useCustomW ? opts.width : appStyle.width),
        ...(opts.dashed ? { dashed: true } : {}),
        ...(opts.aux ? { aux: true } : {}),
        ...(opts.fill ? { fill: opts.fill } : {}),
        ...(opts.arrow ? { arrow: true } : {}),
        ...(opts.plain ? { plain: true } : {}),
        ...(Number.isFinite(opts.n) ? { n: opts.n } : {})
      };
      shapes.push(sh);
      if (kind === 'segment' && ptIds.length >= 2) {
        const k = ptIds[0] < ptIds[1] ? ptIds[0] + '|' + ptIds[1] : ptIds[1] + '|' + ptIds[0];
        shapeByEdgeKey.set(k, sh);
      }
      return sh;
    };

    const evalCurrentCoords = () => K.Tt({ points: Object.fromEntries(pts.map(p => [p.id, p])), shapes });

    const ensureFiniteIntersection = (l1Ids, l2Ids) => {
      const checkOk = () => {
        const c = evalCurrentCoords();
        const a1 = c.get(l1Ids[0]), a2 = c.get(l1Ids[1]), b1 = c.get(l2Ids[0]), b2 = c.get(l2Ids[1]);
        if (!a1 || !a2 || !b1 || !b2) return false;
        const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
        const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) < 1e-4) return false;
        const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / cross;
        const ix = a1.x + t * dx1, iy = a1.y + t * dy1;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const v of c.values()) {
          if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x;
          if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
        }
        const span = Math.max(2, Math.hypot(x1 - x0, y1 - y0));
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        return Math.hypot(ix - cx, iy - cy) <= span * 3.0;
      };
      if (checkOk()) return;

      // Try nudging one involved free ancestor vertex slightly so parallel accidental picks intersect cleanly
      const freeCands = pts.filter(p => p.def && p.def.t === 'free');
      const pivot = [...freeCands].reverse().find(p => l2Ids.includes(p.id) || l1Ids.includes(p.id)) || freeCands[freeCands.length - 1];
      if (!pivot) return;
      const origX = pivot.def.x, origY = pivot.def.y;
      const offsets = [[0.45, -0.25], [-0.45, 0.25], [0.6, 0.3], [-0.6, -0.35], [0.9, -0.5]];
      for (const [ox, oy] of offsets) {
        pivot.def.x = origX + ox;
        pivot.def.y = origY + oy;
        if (checkOk()) return;
      }
      pivot.def.x = origX;
      pivot.def.y = origY;
    };

    const findEdge = (idA, idB) => shapeByEdgeKey.get(idA < idB ? idA + '|' + idB : idB + '|' + idA) || null;
    const is3D = !!(plan && plan.is3D !== false && pts.length >= 0);
    const planIs3D = plan && typeof plan.is3D === 'boolean' ? plan.is3D : true;

    const segCrossParams = (p1, p2, q1, q2) => {
      const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y;
      const dx2 = q2.x - q1.x, dy2 = q2.y - q1.y;
      const cross = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(cross) < 1e-9) return null;
      const t = ((q1.x - p1.x) * dy2 - (q1.y - p1.y) * dx2) / cross;
      const u = ((q1.x - p1.x) * dy1 - (q1.y - p1.y) * dx1) / cross;
      return { t, u };
    };

    const computeSkeletonHullIds = (coordsMap) => {
      const cands = pts
        .filter(p => p.show && p.def && (p.def.t === 'free' || p.def.t === 'sum'))
        .map(p => ({ id: p.id, c: coordsMap.get(p.id) }))
        .filter(x => x.c && Number.isFinite(x.c.x) && Number.isFinite(x.c.y));
      if (cands.length < 3) return [];
      const sorted = cands.slice().sort((a, b) => (a.c.x - b.c.x) || (a.c.y - b.c.y));
      const cross = (o, a, b) => (a.c.x - o.c.x) * (b.c.y - o.c.y) - (a.c.y - o.c.y) * (b.c.x - o.c.x);
      const lower = [];
      for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) lower.pop();
        lower.push(p);
      }
      const upper = [];
      for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9) upper.pop();
        upper.push(p);
      }
      upper.pop();
      lower.pop();
      return [...lower, ...upper].map(x => x.id);
    };

    const pointInHull = (ptCoord, hullCoords) => {
      if (!ptCoord || hullCoords.length < 3) return false;
      // Exclude points lying right on the boundary polygon
      for (let i = 0; i < hullCoords.length; i++) {
        const a = hullCoords[i], b = hullCoords[(i + 1) % hullCoords.length];
        const pr = pointSegProj(ptCoord, a, b);
        if (pr && pr.k >= -0.02 && pr.k <= 1.02 && pr.perp <= Math.max(0.03, pr.len * 0.015)) {
          return false;
        }
      }
      let inside = false;
      for (let i = 0, j = hullCoords.length - 1; i < hullCoords.length; j = i++) {
        const xi = hullCoords[i].x, yi = hullCoords[i].y;
        const xj = hullCoords[j].x, yj = hullCoords[j].y;
        if (((yi > ptCoord.y) !== (yj > ptCoord.y)) && (ptCoord.x < (xj - xi) * (ptCoord.y - yi) / ((yj - yi) || 1e-12) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    };

    const emitSilhouetteSegment = (pStart, pEnd, styleOpts, descLabel, explicitDashed) => {
      const existingDirect = findEdge(pStart.id, pEnd.id);
      if (existingDirect) return existingDirect;

      const cur = evalCurrentCoords();
      const cs = cur.get(pStart.id), ce = cur.get(pEnd.id);
      const hullIds = planIs3D ? computeSkeletonHullIds(cur) : [];
      const hullCoords = hullIds.map(id => cur.get(id)).filter(Boolean);

      if (planIs3D && cs && ce && hullIds.length >= 3) {
        const crossings = [];
        for (let i = 0; i < hullIds.length; i++) {
          const haId = hullIds[i], hbId = hullIds[(i + 1) % hullIds.length];
          const ha = cur.get(haId), hb = cur.get(hbId);
          if (!ha || !hb) continue;
          const hit = segCrossParams(cs, ce, ha, hb);
          if (hit && hit.t > 0.045 && hit.t < 0.955 && hit.u >= -0.01 && hit.u <= 1.01) {
            if (!crossings.some(x => Math.abs(x.t - hit.t) < 0.04)) {
              crossings.push({ t: hit.t, hA: haId, hB: hbId });
            }
          }
        }
        crossings.sort((x, y) => x.t - y.t);

        if (crossings.length === 1) {
          const cr = crossings[0];
          const pCross = registerPoint('', {
            t: 'inter',
            l1: [pStart.id, pEnd.id],
            c1: false,
            l2: [cr.hA, cr.hB],
            c2: false,
            which: 0
          }, '', false);
          const cc = evalCurrentCoords().get(pCross.id) || { x: cs.x + cr.t * (ce.x - cs.x), y: cs.y + cr.t * (ce.y - cs.y) };
          const mid1Inside = pointInHull({ x: (cs.x + cc.x) / 2, y: (cs.y + cc.y) / 2 }, hullCoords);
          const mid2Inside = pointInHull({ x: (cc.x + ce.x) / 2, y: (cc.y + ce.y) / 2 }, hullCoords);
          const sh1 = addShapeRec('segment', [pStart.id, pCross.id], { ...styleOpts, dashed: mid1Inside });
          rawSteps.push(makeStepForShape(sh1.id, descLabel || `Kẻ qua ${pStart.label}`));
          const sh2 = addShapeRec('segment', [pCross.id, pEnd.id], { ...styleOpts, dashed: mid2Inside });
          rawSteps.push(makeStepForShape(sh2.id, `${descLabel || 'Kéo dài'} (ra ngoài khối)`));
          return sh2;
        }
      }

      let finalDashed = explicitDashed;
      if (finalDashed === undefined) {
        if (planIs3D && cs && ce && hullCoords.length >= 3) {
          finalDashed = pointInHull({ x: (cs.x + ce.x) / 2, y: (cs.y + ce.y) / 2 }, hullCoords);
        } else {
          finalDashed = false;
        }
      }
      const sh = addShapeRec('segment', [pStart.id, pEnd.id], { ...styleOpts, dashed: !!finalDashed });
      rawSteps.push(makeStepForShape(sh.id, descLabel));
      return sh;
    };

    const isLineCoveredByShapes = (targetId, aId, bId, coordsMap) => {
      const ca = coordsMap.get(aId), cb = coordsMap.get(bId), ct = coordsMap.get(targetId);
      if (!ca || !cb || !ct) return true;
      const lineLen = dist2D(ca, cb);
      if (lineLen < 1e-6) return true;
      const tol = Math.max(0.02, lineLen * 0.015);

      for (const sh of shapes) {
        if (sh.hidden) continue;
        if (sh.kind === 'segment' && Array.isArray(sh.pts) && sh.pts.length >= 2) {
          const [u, v] = sh.pts;
          if ((u === aId && v === bId) || (u === bId && v === aId)) {
            const p = pointSegProj(ct, ca, cb);
            if (p && p.perp <= tol && p.k >= -0.02 && p.k <= 1.02) return true;
          }
          if (u === targetId || v === targetId) {
            const other = u === targetId ? v : u;
            const co = coordsMap.get(other);
            if (co) {
              const pr = pointSegProj(co, ca, cb);
              if (pr && pr.perp <= tol) return true;
            }
          }
          const cu = coordsMap.get(u), cv = coordsMap.get(v);
          if (cu && cv) {
            const prU = pointSegProj(cu, ca, cb);
            const prV = pointSegProj(cv, ca, cb);
            const prT = pointSegProj(ct, cu, cv);
            if (prU && prV && prT && prU.perp <= tol && prV.perp <= tol && prT.perp <= tol && prT.k >= -0.02 && prT.k <= 1.02) {
              return true;
            }
          }
        } else if ((sh.kind === 'line' || sh.kind === 'ray') && Array.isArray(sh.pts) && sh.pts.length >= 2) {
          const [u, v] = sh.pts;
          const cu = coordsMap.get(u), cv = coordsMap.get(v);
          if (cu && cv) {
            const prU = pointSegProj(cu, ca, cb);
            const prV = pointSegProj(cv, ca, cb);
            if (prU && prV && prU.perp <= tol && prV.perp <= tol) return true;
          }
        }
      }
      return false;
    };

    // Track base points and build step-by-step operations
    for (const op of ops) {
      if (!op || !op.op) continue;
      const stepLabel = op.step || op.note || '';
      switch (op.op) {
        case 'point_free': {
          const x = Number(op.x ?? 0), y = Number(op.y ?? 0);
          const pt = registerPoint(op.id || op.label, { t: 'free', x, y: -y }, op.label ?? op.id, op.show !== false);
          if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Chấm điểm ${pt.label}`));
          break;
        }
        case 'point_sum': {
          const a = resolvePt(op.a), b = resolvePt(op.b), c = resolvePt(op.c);
          if (a && b && c) {
            const pt = registerPoint(op.id || op.label, { t: 'sum', a: a.id, b: b.id, c: c.id }, op.label ?? op.id, op.show !== false);
            if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Dựng điểm ${pt.label}`));
          }
          break;
        }
        case 'midpoint': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            const pt = registerPoint(op.id || op.label, { t: 'mid', a: a.id, b: b.id }, op.label ?? op.id, op.show !== false);
            if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Trung điểm ${pt.label} của ${a.label}${b.label}`));
          }
          break;
        }
        case 'point_on_segment':
        case 'ratio_point': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            let k = Number(op.ratio ?? op.k ?? 0.5);
            if (!Number.isFinite(k)) k = 0.5;
            k = Math.min(0.96, Math.max(0.04, k)); // Clamped inside segment [0, 1]
            const def = Math.abs(k - 0.5) < 1e-4 ? { t: 'mid', a: a.id, b: b.id } : { t: 'on', a: a.id, b: b.id, k, seg: true };
            const pt = registerPoint(op.id || op.label, def, op.label ?? op.id, op.show !== false);
            if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Điểm ${pt.label} trên đoạn ${a.label}${b.label}`));
          }
          break;
        }
        case 'point_on_line': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            let k = Number(op.ratio ?? op.k ?? 1.3);
            if (!Number.isFinite(k)) k = 1.3;
            const seg = k >= 0 && k <= 1;
            const pt = registerPoint(op.id || op.label, { t: 'on', a: a.id, b: b.id, k, seg }, op.label ?? op.id, op.show !== false);
            if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Điểm ${pt.label} trên đường ${a.label}${b.label}`));
          }
          break;
        }
        case 'foot_perp': {
          const p = resolvePt(op.p), a = resolvePt(op.a), b = resolvePt(op.b);
          if (p && a && b) {
            const pt = registerPoint(op.id || op.label, { t: 'foot', p: p.id, a: a.id, b: b.id }, op.label ?? op.id, op.show !== false);
            if (op.drawDropSegment !== false) {
              const sh = addShapeRec('segment', [p.id, pt.id], { dashed: !!op.dashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
              rawSteps.push(makeStepForShape(sh.id, stepLabel || `Kẻ ${p.label}${pt.label} ⊥ ${a.label}${b.label}`, !!op.tempHide));
            }
            if (op.show !== false) {
              rawSteps.push(makeStepForPt(pt.id, `Chân đường vuông góc ${pt.label}`));
            }
            if (op.markRightAngle !== false) {
              const rPt = dist2D(evalCurrentCoords().get(pt.id) || { x: 0, y: 0 }, evalCurrentCoords().get(b.id) || { x: 1, y: 0 }) > 1e-4 ? b : a;
              const rSh = addShapeRec('right', [p.id, pt.id, rPt.id], { dashed: false, aux: true });
              rawSteps.push(makeStepForShape(rSh.id, `Kí hiệu góc vuông tại ${pt.label}`));
            }
          }
          break;
        }
        case 'line_parallel':
        case 'point_parallel':
        case 'line_perp':
        case 'point_perp': {
          const through = resolvePt(op.through || op.o || op.p);
          const a = resolvePt(op.a), b = resolvePt(op.b);
          const isPerp = op.op === 'line_perp' || op.op === 'point_perp' || !!op.perp;
          if (through && a && b) {
            let k = Number.isFinite(Number(op.k)) ? Number(op.k) : 1;
            const lblStr = String(op.label ?? op.id ?? '').trim();
            const isLineStyle = !!(op.asLine || op.noDot || (lblStr && /^[a-zΔδαβγ][0-9']*$/.test(lblStr)));

            // If styled as an infinite/extending line (e.g. giao tuyến Ax), ensure tip extends outside convex hull
            const cur = evalCurrentCoords();
            const co = cur.get(through.id), ca = cur.get(a.id), cb = cur.get(b.id);
            const hullIds = planIs3D ? computeSkeletonHullIds(cur) : [];
            const hullCoords = hullIds.map(id => cur.get(id)).filter(Boolean);
            let oppK = null;

            if (isLineStyle && co && ca && cb) {
              const rawDir = isPerp ? { x: -(cb.y - ca.y), y: cb.x - ca.x } : { x: cb.x - ca.x, y: cb.y - ca.y };
              const dLen = Math.hypot(rawDir.x, rawDir.y);
              if (dLen > 1e-6) {
                const hullSpan = hullCoords.length >= 2
                  ? Math.max(...hullCoords.map(h => Math.hypot(h.x - co.x, h.y - co.y)), dLen)
                  : dLen * 1.5;
                const findMaxExit = (sgn) => {
                  const tipFar = { x: co.x + sgn * rawDir.x, y: co.y + sgn * rawDir.y };
                  let maxT = 0;
                  for (let i = 0; i < hullCoords.length; i++) {
                    const hit = segCrossParams(co, tipFar, hullCoords[i], hullCoords[(i + 1) % hullCoords.length]);
                    if (hit && hit.t > 0.04 && hit.u >= -0.02 && hit.u <= 1.02 && hit.t > maxT) maxT = hit.t;
                  }
                  return maxT;
                };

                let sgn = k < 0 ? -1 : 1;
                let exitPos = findMaxExit(sgn);
                let exitNeg = findMaxExit(-sgn);
                if (!op.keepDirection && op.bothSides !== true && !pointInHull(co, hullCoords) && exitPos > 0.04 && exitNeg < 0.04) {
                  sgn = -sgn;
                  const tmpE = exitPos; exitPos = exitNeg; exitNeg = tmpE;
                }
                const minWing = Math.max(Math.abs(k), 0.42 * hullSpan / dLen);

                // Ensure labeled tip exits clearly past hull when intersecting or inside hull
                if (op.asLine !== false && (pointInHull({ x: co.x + sgn * Math.abs(k) * rawDir.x, y: co.y + sgn * Math.abs(k) * rawDir.y }, hullCoords) || exitPos > Math.abs(k) * 0.92)) {
                  k = sgn * Math.max(minWing, exitPos > 0 ? exitPos + 0.36 * hullSpan / dLen : minWing);
                } else if (op.asLine !== false && exitPos < 0.04) {
                  k = sgn * Math.max(Math.abs(k), 0.48 * hullSpan / dLen);
                } else {
                  k = sgn * Math.abs(k);
                }

                if (op.bothSides === true || (op.bothSides !== false && op.asLine && pointInHull(co, hullCoords))) {
                  oppK = -sgn * Math.max(0.32 * hullSpan / dLen, exitNeg > 0 ? exitNeg + 0.3 * hullSpan / dLen : 0.32 * hullSpan / dLen);
                }
              }
            }

            const pt = registerPoint(op.id || op.label, { t: 'vec', o: through.id, a: a.id, b: b.id, k, perp: isPerp }, lblStr, op.show !== false, isLineStyle ? { noDot: true } : {});
            const lineStyleOpts = { color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: op.aux !== undefined ? !!op.aux : isLineStyle };
            if (oppK !== null && op.drawSegment !== false) {
              const pOpp = registerPoint('', { t: 'vec', o: through.id, a: a.id, b: b.id, k: oppK, perp: isPerp }, '', false);
              emitSilhouetteSegment(through, pOpp, lineStyleOpts, stepLabel || `Kéo dài ${through.label}${lblStr}`, op.dashed);
            }
            if (op.drawSegment !== false) {
              const explicitD = op.dashed !== undefined ? !!op.dashed : (isLineStyle ? undefined : false);
              if (op.kind === 'line' || op.kind === 'ray') {
                const sh = addShapeRec(op.kind, [through.id, pt.id], { ...lineStyleOpts, dashed: !!explicitD });
                rawSteps.push(makeStepForShape(sh.id, stepLabel || (isPerp ? `Kẻ đường vuông góc từ ${through.label}` : `Kẻ ${through.label}${lblStr} // ${a.label}${b.label}`)));
              } else {
                emitSilhouetteSegment(through, pt, lineStyleOpts, stepLabel || (isPerp ? `Kẻ đường vuông góc từ ${through.label}` : `Kẻ ${through.label}${lblStr} // ${a.label}${b.label}`), explicitD);
              }
            }
            if (op.show !== false) {
              rawSteps.push(makeStepForPt(pt.id, isLineStyle ? `Đặt tên đường ${lblStr}` : (stepLabel || `Dựng điểm ${pt.label}`)));
            }
          }
          break;
        }
        case 'circle': {
          const o = resolvePt(op.center || op.o);
          const r = resolvePt(op.rim || op.r);
          if (o && r) {
            const sh = addShapeRec('circle', [o.id, r.id], { dashed: !!op.dashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `Vẽ đường tròn (${o.label})`));
          }
          break;
        }
        case 'point_on_circle': {
          const o = resolvePt(op.center || op.o);
          const r = resolvePt(op.rim || op.r);
          if (o && r) {
            const deg = Number(op.angleDeg ?? op.angle ?? 60);
            const norm = (((-deg / 360) % 1) + 1) % 1;
            const pt = registerPoint(op.id || op.label, { t: 'path', kind: 'circle', pts: [o.id, r.id], k: norm }, op.label ?? op.id, op.show !== false);
            if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Lấy điểm ${pt.label} trên đường tròn (${o.label})`));
          }
          break;
        }
        case 'intersection_ll': {
          const l1 = Array.isArray(op.l1) ? op.l1 : [op.a1, op.b1];
          const l2 = Array.isArray(op.l2) ? op.l2 : [op.a2, op.b2];
          const a1 = resolvePt(l1[0]), a2 = resolvePt(l1[1]), b1 = resolvePt(l2[0]), b2 = resolvePt(l2[1]);
          if (a1 && a2 && b1 && b2) {
            ensureFiniteIntersection([a1.id, a2.id], [b1.id, b2.id]);
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [b1.id, b2.id], c2: false, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false);
            if (op.drawExtensions) {
              const cur = evalCurrentCoords();
              const ci = cur.get(pt.id);
              const maybeExtend = (pA, pB, pAC, pBC) => {
                if (!ci || !pAC || !pBC) return;
                const proj = pointSegProj(ci, pAC, pBC);
                if (!proj) return;
                if (proj.k < -0.02 || proj.k > 1.02) {
                  const anchor = proj.k < 0 ? pA : pB;
                  const extSh = addShapeRec('segment', [anchor.id, pt.id], { dashed: op.extDashed !== false, color: op.extColor || op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: op.aux !== false });
                  rawSteps.push(makeStepForShape(extSh.id, `Kéo dài ${pA.label}${pB.label} cắt tại ${pt.label}`));
                }
              };
              maybeExtend(a1, a2, cur.get(a1.id), cur.get(a2.id));
              maybeExtend(b1, b2, cur.get(b1.id), cur.get(b2.id));
            }
            if (op.show !== false) {
              rawSteps.push(makeStepForPt(pt.id, stepLabel || `Giao điểm ${pt.label} = ${a1.label}${a2.label} ∩ ${b1.label}${b2.label}`));
            }
          }
          break;
        }
        case 'intersection_lc': {
          const ln = Array.isArray(op.line) ? op.line : op.l1;
          const cir = Array.isArray(op.circle) ? op.circle : op.l2;
          const a1 = resolvePt(ln && ln[0]), a2 = resolvePt(ln && ln[1]);
          const o = resolvePt(cir && cir[0]), r = resolvePt(cir && cir[1]);
          if (a1 && a2 && o && r) {
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [o.id, r.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false);
            if (op.show !== false) rawSteps.push(makeStepForPt(pt.id, stepLabel || `Giao điểm ${pt.label}`));
          }
          break;
        }
        case 'segment':
        case 'line':
        case 'ray': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            const existing = op.op === 'segment' ? findEdge(a.id, b.id) : null;
            if (existing) break;
            const sh = addShapeRec(op.op, [a.id, b.id], { dashed: !!op.dashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux, arrow: !!op.arrow });
            const kindTxt = op.op === 'line' ? 'Đường thẳng' : (op.op === 'ray' ? 'Tia' : (op.dashed ? 'Nét đứt' : 'Đoạn'));
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `${kindTxt} ${a.label}${b.label}`, !!op.tempHide));
          }
          break;
        }
        case 'polygon_base':
        case 'connect_polygon':
        case 'section': {
          const ids = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          const dashedSet = new Set((Array.isArray(op.dashedEdges) ? op.dashedEdges : []).map(s => String(s).replace(/\s+/g, '')));
          const hasExplicitDashList = Array.isArray(op.dashedEdges);
          const isEdgeDashed = (la, lb) => dashedSet.has(`${la}-${lb}`) || dashedSet.has(`${lb}-${la}`) || dashedSet.has(`${la}${lb}`) || dashedSet.has(`${lb}${la}`);
          const curCoords = planIs3D ? evalCurrentCoords() : null;
          const hullIds = curCoords ? computeSkeletonHullIds(curCoords) : [];
          const hullCoords = hullIds.map(id => curCoords.get(id)).filter(Boolean);
          for (let i = 0; i < ids.length; i++) {
            const pA = ids[i], pB = ids[(i + 1) % ids.length];
            if (findEdge(pA.id, pB.id)) continue;
            let edgeDashed = isEdgeDashed(pA.label, pB.label);
            if (!hasExplicitDashList && planIs3D && curCoords && hullCoords.length >= 3) {
              const ca = curCoords.get(pA.id), cb = curCoords.get(pB.id);
              if (ca && cb) edgeDashed = pointInHull({ x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 }, hullCoords);
            }
            const sh = addShapeRec('segment', [pA.id, pB.id], { dashed: edgeDashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
            rawSteps.push(makeStepForShape(sh.id, `Cạnh ${pA.label}${pB.label}`));
          }
          if (op.fill && ids.length >= 3) {
            const fillVal = op.explicitColor ? op.fill : 'rgba(15, 23, 42, 0.05)';
            const shF = addShapeRec('polygon', ids.map(x => x.id), { width: 0, fill: fillVal, color: op.color, explicitColor: !!op.explicitColor, aux: op.op !== 'polygon_base' });
            rawSteps.push(makeStepForShape(shF.id, stepLabel || `Tô nhạt (${ids.map(x => x.label).join('')})`));
          }
          break;
        }
        case 'polygon_fill': {
          const ids = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          if (ids.length >= 3) {
            const fillVal = (op.explicitColor && op.fill) ? op.fill : 'rgba(15, 23, 42, 0.06)';
            const sh = addShapeRec('polygon', ids.map(x => x.id), { width: 0, fill: fillVal, color: op.color, explicitColor: !!op.explicitColor, aux: !!op.aux });
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `Tô mặt (${ids.map(x => x.label).join('')})`));
          }
          break;
        }
        case 'right_angle': {
          const a = resolvePt(op.a);
          const v = resolvePt(op.v || op.vertex || op.b);
          const b = resolvePt(op.v || op.vertex ? op.b : op.c);
          if (a && v && b) {
            const sh = addShapeRec('right', [a.id, v.id, b.id], { dashed: false, aux: true });
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `Kí hiệu góc vuông ${v.label}`));
          }
          break;
        }
        case 'angle_mark': {
          const a = resolvePt(op.a), v = resolvePt(op.v), b = resolvePt(op.b);
          if (a && v && b) {
            const sh = addShapeRec('angle', [a.id, v.id, b.id], { dashed: false, plain: true, n: Math.max(1, Math.min(3, Number(op.n) || 1)), aux: true });
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `Kí hiệu góc ${a.label}${v.label}${b.label}`));
          }
          break;
        }
        case 'tick_mark': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            const sh = addShapeRec('tick', [a.id, b.id], { dashed: false, n: Math.max(1, Math.min(3, Number(op.n) || 1)), aux: true });
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `Kí hiệu bằng nhau ${a.label}${b.label}`));
          }
          break;
        }
      }
    }

    if (!pts.length) {
      throw new Error('Không dựng được điểm nào từ dữ liệu AI.');
    }

    // Post-compile Connectivity Healer: ensure no derived point (inter, foot, mid/on-segment) floats disconnected
    const healCoords = evalCurrentCoords();
    const healHullIds = planIs3D ? computeSkeletonHullIds(healCoords) : [];
    const healHullCoords = healHullIds.map(id => healCoords.get(id)).filter(Boolean);
    const ptObjMap = Object.fromEntries(pts.map(p => [p.id, p]));

    const insertStepNearPoint = (ptId, stepObj) => {
      const idx = rawSteps.findIndex(st => st.kind === 'point' && st.refId === ptId);
      if (idx >= 0) rawSteps.splice(idx, 0, stepObj);
      else rawSteps.push(stepObj);
    };

    const connectLineToPointIfMissing = (pt, aId, bId) => {
      if (isLineCoveredByShapes(pt.id, aId, bId, healCoords)) return;
      const ca = healCoords.get(aId), cb = healCoords.get(bId), cp = healCoords.get(pt.id);
      if (!ca || !cb || !cp) return;
      const proj = pointSegProj(cp, ca, cb);
      const abDrawn = !!findEdge(aId, bId);
      let anchorId;
      if (!abDrawn && proj && proj.k > 1.02) anchorId = aId;
      else if (!abDrawn && proj && proj.k < -0.02) anchorId = bId;
      else anchorId = dist2D(ca, cp) <= dist2D(cb, cp) ? aId : bId;
      if (anchorId === pt.id || findEdge(anchorId, pt.id)) return;
      const can = healCoords.get(anchorId);
      const midCoord = { x: (can.x + cp.x) / 2, y: (can.y + cp.y) / 2 };
      const insideHull = planIs3D && healHullCoords.length >= 3 && pointInHull(midCoord, healHullCoords);
      const existingLine = findEdge(aId, bId);
      const anchorPt = ptObjMap[anchorId];
      const sh = addShapeRec('segment', [anchorId, pt.id], { dashed: insideHull || !!opExtDashed(existingLine), aux: true });
      insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Nối ${anchorPt ? anchorPt.label : ''}${pt.label}`));
    };

    function opExtDashed(existingLine) {
      if (!planIs3D) return true;
      return !!(existingLine && existingLine.dashed);
    }

    for (const pt of pts) {
      if (!pt || !pt.show || !pt.def) continue;
      if (pt.def.t === 'inter' && !pt.def.c1 && !pt.def.c2 && Array.isArray(pt.def.l1) && Array.isArray(pt.def.l2)) {
        connectLineToPointIfMissing(pt, pt.def.l1[0], pt.def.l1[1]);
        connectLineToPointIfMissing(pt, pt.def.l2[0], pt.def.l2[1]);
      } else if (pt.def.t === 'foot' && pt.def.p && pt.def.a && pt.def.b) {
        if (!findEdge(pt.def.p, pt.id)) {
          const sh = addShapeRec('segment', [pt.def.p, pt.id], { dashed: false, aux: true });
          insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Hạ ${ptObjMap[pt.def.p]?.label || ''}${pt.label} vuông góc`));
        }
        connectLineToPointIfMissing(pt, pt.def.a, pt.def.b);
      } else if ((pt.def.t === 'mid' || (pt.def.t === 'on' && pt.def.seg)) && pt.def.a && pt.def.b) {
        if (!isLineCoveredByShapes(pt.id, pt.def.a, pt.def.b, healCoords) && !findEdge(pt.def.a, pt.def.b)) {
          const ca = healCoords.get(pt.def.a), cb = healCoords.get(pt.def.b);
          const midC = ca && cb ? { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 } : null;
          const insideHull = midC && planIs3D && healHullCoords.length >= 3 && pointInHull(midC, healHullCoords);
          const sh = addShapeRec('segment', [pt.def.a, pt.def.b], { dashed: insideHull });
          insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Nối ${ptObjMap[pt.def.a]?.label || ''}${ptObjMap[pt.def.b]?.label || ''}`));
        }
      }
    }

    void is3D;

    // Group initial consecutive base point_free/point_sum steps together ONLY if they immediately lead into polygon/segment drawing so replay feels natural & brisk, OR keep clear individual strokes!
    // Compact consecutive initial free vertices (>=2) into 1 neat step "Dựng các đỉnh đáy", while keeping derived points (mid, inter, foot, on_segment) individual so every derivation stands out!
    const groupedSteps = [];
    let ptBuf = [];
    const flushPtBuf = () => {
      if (!ptBuf.length) return;
      if (ptBuf.length === 1) {
        groupedSteps.push(ptBuf[0]);
      } else {
        const names = ptBuf.map(st => {
          const p = pts.find(x => x.id === st.refId);
          return p && p.label ? p.label : '';
        }).filter(Boolean).join(', ');
        groupedSteps.push({
          id: 'st_ai_grp_' + Math.random().toString(36).slice(2, 6),
          kind: 'group',
          customTitle: names ? `Đặt các đỉnh gốc ${names}` : `Đặt ${ptBuf.length} đỉnh gốc`,
          items: ptBuf.map(st => ({ kind: 'point', refId: st.refId, rev: false })),
          effect: 'draw',
          easing: 'easeInOut',
          enabled: true
        });
      }
      ptBuf = [];
    };
    const freeIds = new Set(pts.filter(p => p.def && (p.def.t === 'free' || p.def.t === 'sum')).map(p => p.id));
    for (const st of rawSteps) {
      if (st.kind === 'point' && freeIds.has(st.refId)) {
        ptBuf.push(st);
      } else {
        flushPtBuf();
        groupedSteps.push(st);
      }
    }
    flushPtBuf();

    // Scale & place nicely on target page
    const placed = scaleAndPlaceFigure(pts, shapes, board, anchorBox);
    return {
      points: placed.points,
      shapes,
      steps: groupedSteps,
      pageIdx: placed.pageIdx,
      title: (plan && plan.title) || 'Hình AI dựng'
    };
  }

  function scaleAndPlaceFigure(pts, shapes, board, anchorBox) {
    const K = getKernel();
    const ptMap = Object.fromEntries(pts.map(p => [p.id, p]));
    const coords = K.Tt({ points: ptMap, shapes });

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      if (!p.show) continue;
      const c = coords.get(p.id);
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
      if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x;
      if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y;
    }
    if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = 4; y1 = 4; }

    const rawW = Math.max(0.5, x1 - x0);
    const rawH = Math.max(0.5, y1 - y0);
    const targetSpan = 330;
    const scale = Math.max(24, Math.min(115, targetSpan / Math.max(rawW, rawH)));
    const figW = rawW * scale;
    const figH = rawH * scale;
    const cxRaw = (x0 + x1) / 2;
    const cyRaw = (y0 + y1) / 2;

    let pageIdx = board && typeof board.currentPage === 'function' ? board.currentPage() : 0;
    let center = board && typeof board.viewCentre === 'function' ? board.viewCentre() : { index: pageIdx, x: 420, y: 360 };
    if (anchorBox && Number.isFinite(anchorBox.pageIdx)) {
      pageIdx = anchorBox.pageIdx;
      const pageW = K && typeof K.Kt === 'function' && board && board.doc ? K.Kt(board.doc) : 1120;
      const rightX = anchorBox.x + anchorBox.w + 56 + figW / 2;
      if (rightX + figW / 2 <= pageW - 24) {
        center = { x: rightX, y: Math.max(80 + figH / 2, anchorBox.y + anchorBox.h / 2) };
      } else {
        center = { x: Math.max(80 + figW / 2, Math.min(pageW - figW / 2 - 24, anchorBox.x + anchorBox.w / 2)), y: anchorBox.y + anchorBox.h + 44 + figH / 2 };
      }
    }

    const scaledPts = pts.map(p => {
      if (p.def && p.def.t === 'free') {
        return {
          ...p,
          def: {
            ...p.def,
            x: center.x + (p.def.x - cxRaw) * scale,
            y: center.y + (p.def.y - cyRaw) * scale
          }
        };
      }
      return p;
    });

    return { points: scaledPts, pageIdx, center, figW, figH };
  }

  function buildOrderedStepsForTikz(pts, shapes) {
    const K = getKernel();
    const steps = [];
    const addedPts = new Set();
    const ptMap = Object.fromEntries(pts.map(p => [p.id, p]));
    const freeOrSum = new Set(pts.filter(p => !p.def || p.def.t === 'free' || p.def.t === 'sum').map(p => p.id));

    const emitDeps = (pid, visiting = new Set()) => {
      if (!pid || addedPts.has(pid) || visiting.has(pid)) return;
      visiting.add(pid);
      const pt = ptMap[pid];
      if (!pt) return;
      if (K && typeof K.Om === 'function' && pt.def) {
        for (const dep of (K.Om(pt.def) || [])) emitDeps(dep, visiting);
      }
      addedPts.add(pid);
      if (pt.show && !pt.hidden && !freeOrSum.has(pid)) {
        steps.push(makeStepForPt(pid, pt.label ? `Dựng điểm ${pt.label}` : undefined));
      }
    };

    // 1. Primary visible solid shapes (polygon, segment, circle, arc)
    const solidMain = shapes.filter(s => !s.hidden && !s.dashed && ['polygon', 'segment', 'circle', 'arc'].includes(s.kind) && s.width !== 0);
    // 2. Dashed hidden edges
    const dashedMain = shapes.filter(s => !s.hidden && s.dashed && ['polygon', 'segment', 'circle', 'arc'].includes(s.kind) && s.width !== 0);
    // 3. Lines, rays, ticks, angles, right angles, filled regions
    const auxRest = shapes.filter(s => !s.hidden && !solidMain.includes(s) && !dashedMain.includes(s) && s.kind !== 'solid' && s.kind !== 'flatLink');

    // Collect base vertices first in 1 group step if any appear in shapes
    const firstBasePts = pts.filter(p => p.show && !p.hidden && freeOrSum.has(p.id));
    if (firstBasePts.length >= 2) {
      firstBasePts.forEach(p => addedPts.add(p.id));
      steps.push({
        id: 'st_tkz_base_' + Math.random().toString(36).slice(2, 6),
        kind: 'group',
        customTitle: `Đặt các đỉnh ${firstBasePts.map(x => x.label).filter(Boolean).join(', ')}`,
        items: firstBasePts.map(x => ({ kind: 'point', refId: x.id, rev: false })),
        effect: 'draw',
        easing: 'easeInOut',
        enabled: true
      });
    }

    for (const sh of solidMain) {
      for (const pid of (sh.pts || [])) emitDeps(pid);
      steps.push(makeStepForShape(sh.id));
    }
    for (const sh of dashedMain) {
      for (const pid of (sh.pts || [])) emitDeps(pid);
      steps.push(makeStepForShape(sh.id));
    }
    for (const pt of pts) emitDeps(pt.id);
    for (const sh of auxRest) {
      for (const pid of (sh.pts || [])) emitDeps(pid);
      steps.push(makeStepForShape(sh.id));
    }
    return steps;
  }

  // ==========================================================================
  // 3. SELECTION HELPER (IMAGE / PROBLEM / TEXT EXTRACTION)
  // ==========================================================================
  function getSelectedSourceCandidate(boardArg) {
    const b = boardArg || getBoard();
    if (!b || !b.sel || !b.doc || !Array.isArray(b.doc.pages)) return null;
    const pg = b.doc.pages[b.sel.page];
    if (!pg || !Array.isArray(pg.items) || !b.sel.items || b.sel.items.size !== 1) return null;
    const itemId = [...b.sel.items][0];
    const it = pg.items.find(x => x.id === itemId);
    if (!it) return null;
    if (it.type !== 'image' && it.type !== 'problem' && it.type !== 'text') return null;
    return { pageIdx: b.sel.page, item: it };
  }

  async function normalizeImageToDataUrl(src) {
    if (!src) return null;
    try {
      const img = new Image();
      if (!/^data:/i.test(src)) img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = src;
      });
      const nw = img.naturalWidth || img.width || 0;
      const nh = img.naturalHeight || img.height || 0;
      if (nw > 0 && nh > 0) {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const useJpeg = (w * h) > 490000;
        const mime = useJpeg ? 'image/jpeg' : 'image/png';
        const dataUrl = useJpeg ? canvas.toDataURL('image/jpeg', 0.90) : canvas.toDataURL('image/png');
        return {
          dataUrl,
          base64: dataUrl.replace(/^data:[^;]+;base64,/i, ''),
          mimeType: mime,
          width: w,
          height: h
        };
      }
    } catch {}
    if (/^data:([^;]+);base64,(.+)$/i.test(src)) {
      const m = /^data:([^;]+);base64,(.+)$/i.exec(src);
      return m ? { dataUrl: src, base64: m[2], mimeType: m[1] } : null;
    }
    return null;
  }

  async function dataUrlFromImageSrc(src) {
    return normalizeImageToDataUrl(src);
  }

  // ==========================================================================
  // 4. MODAL UI & LIVE STEP-BY-STEP LAUNCHER
  // ==========================================================================
  let modalState = {
    open: false,
    tab: 'ai', // 'ai' | 'tikz'
    busy: false,
    busyTimer: 0,
    busyStartedAt: 0,
    imgDataUrl: '',
    imgBase64: '',
    imgMime: 'image/png',
    imgSourceLabel: '',
    anchorBox: null,
    selectedProvider: '',
    selectedModel: '',
    aiCfg: null
  };

  function ensureModal() {
    let bd = document.getElementById('mn-ai-geo-backdrop');
    if (bd) return bd;

    bd = document.createElement('div');
    bd.id = 'mn-ai-geo-backdrop';
    bd.innerHTML = `
      <div id="mn-ai-geo-modal" role="dialog" aria-modal="true" aria-labelledby="mn-ag-heading">
        <div class="mn-ag-head">
          <div class="mn-ag-title-wrap">
            <div class="mn-ag-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3l1.5 3.6L17 8.1l-3.5 1.5L12 13.2l-1.5-3.6L7 8.1l3.5-1.5L12 3z" fill="currentColor" fill-opacity="0.24"/>
                <polygon points="12 14 20 21 4 21 12 14"/>
              </svg>
            </div>
            <div>
              <div class="mn-ag-title" id="mn-ag-heading">AI Dựng Hình Từng Nét</div>
              <div class="mn-ag-sub">Dựng cấu trúc ràng buộc điểm · nét liền/đứt chuẩn · phát từng bước</div>
            </div>
          </div>
          <div class="mn-ag-head-actions">
            <button type="button" class="mn-ag-key-btn" id="mn-ag-open-keys" title="Cấu hình API Key & Model AI">🔑 API Key</button>
            <button type="button" class="mn-ag-close" id="mn-ag-close" title="Đóng (Esc)">✕</button>
          </div>
        </div>

        <div class="mn-ag-tabs">
          <button type="button" class="mn-ag-tab active" data-ag-tab="ai">✨ AI Dựng từ Đề / Ảnh</button>
          <button type="button" class="mn-ag-tab" data-ag-tab="tikz">📐 Nạp TikZ Chuẩn</button>
        </div>

        <div class="mn-ag-body">
          <!-- TAB 1: AI GENERATOR -->
          <div id="mn-ag-pane-ai" style="display:flex;flex-direction:column;gap:10px;">
            <div class="mn-ag-model-bar" id="mn-ag-model-bar">
              <span class="mn-ag-provider-pill" id="mn-ag-provider-badge">AI</span>
              <select class="mn-ag-model-select" id="mn-ag-model-select" title="Chọn nhanh model AI để dựng hình"></select>
            </div>
            <div class="mn-ag-model-hint" id="mn-ag-model-hint" style="display:none;"></div>

            <div class="mn-ag-dropzone" id="mn-ag-dropzone" tabindex="0">
              <input type="file" id="mn-ag-file" accept="image/*" style="display:none;" />
              <div class="mn-ag-drop-empty">
                <span style="font-weight:600;color:#2563eb;">📋 Dán ảnh đề bài (Ctrl + V), kéo thả hoặc bấm chọn ảnh</span>
                <small>Hỗ trợ chỉ dán ảnh đề (không cần gõ lại chữ) hoặc kèm ghi chú bên dưới</small>
              </div>
              <div class="mn-ag-img-preview">
                <img class="mn-ag-img-thumb" id="mn-ag-thumb" alt="Ảnh đề bài" />
                <div class="mn-ag-img-meta">
                  <span class="mn-ag-img-badge" id="mn-ag-img-badge">Ảnh sẵn sàng</span>
                  <div class="mn-ag-img-hint">AI sẽ đọc trực tiếp đề trong ảnh và dựng từng nét</div>
                </div>
                <button type="button" class="mn-ag-clear-img" id="mn-ag-clear-img">✕ Bỏ ảnh</button>
              </div>
            </div>

            <textarea id="mn-ag-prompt" class="mn-ag-textarea" placeholder="Nhập đề bài Hình học 2D/3D hoặc yêu cầu dựng hình (không bắt buộc nếu đã dán ảnh)..."></textarea>

            <div class="mn-ag-presets" id="mn-ag-samples"></div>

            <div class="mn-ag-options">
              <label class="mn-ag-check">
                <input type="checkbox" id="mn-ag-opt-animate" checked />
                <span>Dựng từng nét trực quan ngay khi xong</span>
              </label>
              <label class="mn-ag-check">
                <input type="checkbox" id="mn-ag-opt-aux" checked />
                <span>Kèm nét phụ gợi ý câu a, b, c</span>
              </label>
            </div>

            <div class="mn-ag-progress" id="mn-ag-progress">
              <div class="mn-ag-stage" data-stage="1"><span>○</span> 1. Đọc đề bài &amp; phân tích giả thiết hình học</div>
              <div class="mn-ag-stage" data-stage="2"><span>○</span> 2. Xác lập ràng buộc điểm - đoạn - giao điểm &amp; nét khuất</div>
              <div class="mn-ag-stage" data-stage="3"><span>○</span> 3. Khởi tạo hình lên bảng &amp; vẽ từng nét trực tiếp</div>
            </div>
          </div>

          <!-- TAB 2: TIKZ CONSTRAINT LOADER -->
          <div id="mn-ag-pane-tikz" style="display:none;flex-direction:column;gap:10px;">
            <textarea id="mn-ag-tikz-input" class="mn-ag-textarea mono" spellcheck="false" placeholder="Dán mã TikZ / tkz-euclide (\\begin{tikzpicture}...\\end{tikzpicture})..."></textarea>
            <div class="mn-ag-stats" id="mn-ag-tikz-stats">
              <span class="mn-ag-stat-pill">Dán mã TikZ để kiểm tra nhận diện ràng buộc tự động</span>
            </div>
            <label class="mn-ag-check">
              <input type="checkbox" id="mn-ag-tikz-trace" checked />
              <span>Dùng trình biên dịch LaTeX để đối chiếu tọa độ chuẩn xác nhất (nếu máy có MiKTeX/TeX Live)</span>
            </label>
          </div>

          <div class="mn-ag-error" id="mn-ag-error"></div>
        </div>

        <div class="mn-ag-foot" id="mn-ag-foot-ai">
          <button type="button" class="mn-ag-btn" id="mn-ag-cancel">Hủy</button>
          <button type="button" class="mn-ag-btn primary" id="mn-ag-run-ai">✨ Tư duy &amp; Dựng từng nét</button>
        </div>
        <div class="mn-ag-foot" id="mn-ag-foot-tikz" style="display:none;">
          <button type="button" class="mn-ag-btn" id="mn-ag-insert-tikz-now">Chèn ngay</button>
          <button type="button" class="mn-ag-btn primary" id="mn-ag-run-tikz">🎬 Dựng từng nét lên bảng</button>
        </div>
      </div>
    `;
    document.body.appendChild(bd);

    // Build sample prompt chips
    const samplesWrap = bd.querySelector('#mn-ag-samples');
    SAMPLE_PROMPTS.forEach(sp => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mn-ag-chip';
      btn.textContent = sp.label;
      btn.addEventListener('click', () => {
        const ta = bd.querySelector('#mn-ag-prompt');
        if (ta) { ta.value = sp.text; ta.focus(); }
      });
      samplesWrap.appendChild(btn);
    });

    // Wire events
    bd.querySelector('#mn-ag-close').addEventListener('click', closeModal);
    bd.querySelector('#mn-ag-cancel').addEventListener('click', closeModal);
    bd.addEventListener('mousedown', (e) => {
      if (e.target === bd && !modalState.busy) closeModal();
    });

    bd.querySelector('#mn-ag-open-keys').addEventListener('click', () => {
      closeModal();
      if (typeof window.openMinNoteMeaSettings === 'function' && window.openMinNoteMeaSettings()) {
        return;
      }
      if (window.MinNoteMeaSync && typeof window.MinNoteMeaSync.openSettingsModal === 'function' && window.MinNoteMeaSync.openSettingsModal()) {
        return;
      }
      if (typeof window.toggleQuestionBankModal === 'function') {
        window.toggleQuestionBankModal();
      }
    });

    const modSel = bd.querySelector('#mn-ag-model-select');
    if (modSel) {
      modSel.addEventListener('change', async () => {
        const nextModel = modSel.value;
        if (!nextModel) return;
        modalState.selectedModel = nextModel;
        updateModalSpeedHint();
        if (window.MinNoteMeaSync && typeof window.MinNoteMeaSync.request === 'function' && modalState.selectedProvider) {
          try {
            await window.MinNoteMeaSync.request('MEA_SAVE_AI_CONFIG', {
              provider: modalState.selectedProvider,
              model: nextModel,
              keyEdited: false,
              clearKey: false
            }, 10000);
          } catch {}
        }
      });
    }

    bd.querySelectorAll('[data-ag-tab]').forEach(btn => {
      btn.addEventListener('click', () => setTab(btn.dataset.agTab));
    });

    // Dropzone click / file input / drag-drop
    const dz = bd.querySelector('#mn-ag-dropzone');
    const fileInp = bd.querySelector('#mn-ag-file');
    dz.addEventListener('click', (e) => {
      if (e.target.closest('#mn-ag-clear-img')) return;
      fileInp.click();
    });
    fileInp.addEventListener('change', () => {
      const f = fileInp.files && fileInp.files[0];
      if (f) attachImageFile(f, 'Ảnh đã chọn');
      fileInp.value = '';
    });
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.remove('dragover');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) attachImageFile(f, 'Ảnh kéo thả');
    });
    bd.querySelector('#mn-ag-clear-img').addEventListener('click', (e) => {
      e.stopPropagation();
      clearAttachedImage();
    });

    // Paste image inside modal without leaking to board paste handler
    window.addEventListener('paste', (e) => {
      if (!modalState.open || modalState.tab !== 'ai') return;
      if (e.clipboardData && e.clipboardData.items) {
        for (const item of e.clipboardData.items) {
          if (item.type && item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              e.preventDefault();
              e.stopPropagation();
              if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
              attachImageFile(blob, 'Ảnh từ Clipboard');
              break;
            }
          }
        }
      }
    }, true);

    // Live TikZ stats updater
    let tikzTimer = 0;
    const tikzTa = bd.querySelector('#mn-ag-tikz-input');
    tikzTa.addEventListener('input', () => {
      clearTimeout(tikzTimer);
      tikzTimer = setTimeout(updateTikzPreviewStats, 180);
    });

    bd.querySelector('#mn-ag-run-ai').addEventListener('click', runAiConstruction);
    bd.querySelector('#mn-ag-run-tikz').addEventListener('click', () => runTikzImport(true));
    bd.querySelector('#mn-ag-insert-tikz-now').addEventListener('click', () => runTikzImport(false));

    return bd;
  }

  function setError(msg) {
    const bd = ensureModal();
    const errEl = bd.querySelector('#mn-ag-error');
    if (!errEl) return;
    if (!msg) {
      errEl.textContent = '';
      errEl.classList.remove('open');
    } else {
      errEl.textContent = String(msg);
      errEl.classList.add('open');
    }
  }

  function setStage(stageNum) {
    const bd = ensureModal();
    const box = bd.querySelector('#mn-ag-progress');
    if (!stageNum) {
      box.classList.remove('open');
      return;
    }
    box.classList.add('open');
    box.querySelectorAll('.mn-ag-stage').forEach(el => {
      const n = Number(el.dataset.stage || 0);
      const iconSpan = el.querySelector('span');
      el.classList.remove('active', 'done');
      if (n < stageNum) {
        el.classList.add('done');
        if (iconSpan) iconSpan.textContent = '✓';
      } else if (n === stageNum) {
        el.classList.add('active');
        if (iconSpan) iconSpan.textContent = '◉';
      } else {
        if (iconSpan) iconSpan.textContent = '○';
      }
    });
  }

  function updateModalSpeedHint() {
    const bd = document.getElementById('mn-ai-geo-backdrop');
    const hintEl = bd && bd.querySelector('#mn-ag-model-hint');
    if (!hintEl) return;
    const prov = modalState.selectedProvider || '';
    const mod = modalState.selectedModel || '';
    if (prov === 'Antigravity' && (/(?:^|-)(?:high|xhigh)$/i.test(mod) || /orchestrator/i.test(mod))) {
      hintEl.textContent = `⚡ Đã bật chế độ Tăng tốc Đọc ảnh cho ${mod}: tự động tối ưu luồng suy luận cùng dòng model để dựng hình trong ~45–60 giây (không bị timeout).`;
      hintEl.style.display = 'block';
    } else if (prov === 'DeepSeek') {
      hintEl.textContent = '💡 DeepSeek API chỉ đọc đề bằng chữ; để dựng hình từ ảnh, hãy chọn Antigravity, Google Gemini, OpenAI hoặc 9Router.';
      hintEl.style.display = 'block';
    } else {
      hintEl.textContent = '';
      hintEl.style.display = 'none';
    }
  }

  function applyModalModelConfig(cfg) {
    const bd = document.getElementById('mn-ai-geo-backdrop');
    if (!bd || !cfg) return;
    modalState.aiCfg = cfg;
    const prov = cfg.provider || 'Google Gemini';
    modalState.selectedProvider = prov;
    const badge = bd.querySelector('#mn-ag-provider-badge');
    const modSel = bd.querySelector('#mn-ag-model-select');
    if (badge) badge.textContent = prov;
    const map = cfg.modelsByProvider || {};
    const list = Array.isArray(map[prov]) ? map[prov].slice() : [];
    const curModel = modalState.selectedModel && list.includes(modalState.selectedModel)
      ? modalState.selectedModel
      : (cfg.model || list[0] || '');
    if (curModel && !list.includes(curModel)) list.unshift(curModel);
    modalState.selectedModel = curModel;
    if (modSel) {
      modSel.innerHTML = '';
      list.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === curModel) opt.selected = true;
        modSel.appendChild(opt);
      });
    }
    updateModalSpeedHint();
  }

  async function syncModalAiSelector() {
    if (!window.MinNoteMeaSync || typeof window.MinNoteMeaSync.request !== 'function') return;
    try {
      const cfg = await window.MinNoteMeaSync.request('MEA_GET_AI_CONFIG', {}, 10000);
      if (!modalState.open || !cfg) return;
      modalState.selectedModel = cfg.model || '';
      applyModalModelConfig(cfg);
      const prov = cfg.provider || '';
      const shouldRefreshLive = ((prov === 'Antigravity' && cfg.antigravityInstalled) || prov === '9Router') &&
        window.MinNoteMeaSync.isDesktopBridge && window.MinNoteMeaSync.isDesktopBridge();
      if (shouldRefreshLive) {
        const ref = await window.MinNoteMeaSync.request('MEA_REFRESH_MODELS', { provider: prov }, 20000);
        if (modalState.open && ref && Array.isArray(ref.models) && ref.models.length && modalState.selectedProvider === prov) {
          cfg.modelsByProvider = cfg.modelsByProvider || {};
          cfg.modelsByProvider[prov] = ref.models;
          applyModalModelConfig(cfg);
        }
      }
    } catch {}
  }

  function clearBusyTimer() {
    if (modalState.busyTimer) {
      clearInterval(modalState.busyTimer);
      modalState.busyTimer = 0;
    }
  }

  function setBusy(isBusy) {
    modalState.busy = !!isBusy;
    const bd = ensureModal();
    const runBtn = bd.querySelector('#mn-ag-run-ai');
    const tikzBtn = bd.querySelector('#mn-ag-run-tikz');
    const modSel = bd.querySelector('#mn-ag-model-select');
    clearBusyTimer();
    if (isBusy) {
      modalState.busyStartedAt = Date.now();
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = '⏳ AI đang phân tích & dựng... (0s)';
      }
      modalState.busyTimer = setInterval(() => {
        if (!modalState.busy) { clearBusyTimer(); return; }
        const sec = Math.max(1, Math.floor((Date.now() - modalState.busyStartedAt) / 1000));
        const rb = document.querySelector('#mn-ag-run-ai');
        if (rb) rb.textContent = `⏳ AI đang phân tích & dựng... (${sec}s)`;
      }, 1000);
    } else if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = '✨ Tư duy & Dựng từng nét';
    }
    if (tikzBtn) tikzBtn.disabled = isBusy;
    if (modSel) modSel.disabled = isBusy;
  }

  function setTab(tabName) {
    modalState.tab = tabName === 'tikz' ? 'tikz' : 'ai';
    const bd = ensureModal();
    bd.querySelectorAll('[data-ag-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.agTab === modalState.tab);
    });
    bd.querySelector('#mn-ag-pane-ai').style.display = modalState.tab === 'ai' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-pane-tikz').style.display = modalState.tab === 'tikz' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-foot-ai').style.display = modalState.tab === 'ai' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-foot-tikz').style.display = modalState.tab === 'tikz' ? 'flex' : 'none';
    setError('');
    if (modalState.tab === 'tikz') updateTikzPreviewStats();
  }

  function attachImageData(dataUrl, base64, mime, badgeText) {
    modalState.imgDataUrl = dataUrl;
    modalState.imgBase64 = base64;
    modalState.imgMime = mime || 'image/png';
    modalState.imgSourceLabel = badgeText || 'Ảnh sẵn sàng';
    const bd = ensureModal();
    const dz = bd.querySelector('#mn-ag-dropzone');
    dz.classList.add('has-img');
    bd.querySelector('#mn-ag-thumb').src = dataUrl;
    bd.querySelector('#mn-ag-img-badge').textContent = modalState.imgSourceLabel;
  }

  function attachImageFile(file, badgeText) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = String((ev.target && ev.target.result) || '');
      const normalized = await normalizeImageToDataUrl(dataUrl);
      if (normalized) {
        const resSuffix = (normalized.width && normalized.height) ? ` (${normalized.width}×${normalized.height})` : '';
        attachImageData(normalized.dataUrl, normalized.base64, normalized.mimeType, (badgeText || 'Ảnh sẵn sàng') + resSuffix);
      } else {
        const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
        if (m) attachImageData(dataUrl, m[2], m[1], badgeText);
      }
    };
    reader.readAsDataURL(file);
  }

  function clearAttachedImage() {
    modalState.imgDataUrl = '';
    modalState.imgBase64 = '';
    modalState.imgMime = 'image/png';
    modalState.imgSourceLabel = '';
    const bd = ensureModal();
    bd.querySelector('#mn-ag-dropzone').classList.remove('has-img');
    bd.querySelector('#mn-ag-thumb').removeAttribute('src');
  }

  function updateTikzPreviewStats() {
    const bd = ensureModal();
    const code = (bd.querySelector('#mn-ag-tikz-input').value || '').trim();
    const statsEl = bd.querySelector('#mn-ag-tikz-stats');
    if (!code) {
      statsEl.innerHTML = '<span class="mn-ag-stat-pill">Dán mã TikZ để kiểm tra nhận diện ràng buộc tự động</span>';
      return;
    }
    const K = getKernel();
    const b = getBoard();
    if (!K || typeof K.uC !== 'function') {
      statsEl.innerHTML = '<span class="mn-ag-stat-pill">Sẽ chuẩn hóa ràng buộc khi nạp vào bảng</span>';
      return;
    }
    try {
      const raw = K.uC(code, (b && b.shapeStyle) || { color: '#0f172a', width: 2.2 }, () => K.nt(), () => '');
      const fig = refineTikzConstraints(raw, () => K.nt());
      const st = fig.constraintStats || {};
      const dashCnt = (fig.shapes || []).filter(s => s.dashed).length;
      const pills = [
        `<span class="mn-ag-stat-pill">${st.free || 0} đỉnh gốc</span>`,
        `<span class="mn-ag-stat-pill ok">${(st.mid || 0) + (st.onSeg || 0)} điểm khóa trong đoạn [0..1]</span>`,
        `<span class="mn-ag-stat-pill ok">${(st.inter || 0) + (st.foot || 0)} giao điểm / vuông góc</span>`,
        `<span class="mn-ag-stat-pill">${dashCnt} nét đứt / ${(fig.shapes || []).length - dashCnt} nét liền</span>`
      ];
      statsEl.innerHTML = pills.join('');
    } catch (err) {
      statsEl.innerHTML = `<span class="mn-ag-stat-pill">Chưa đọc đủ cú pháp (${String(err && err.message ? err.message : err).slice(0, 48)})</span>`;
    }
  }

  async function runAiConstruction() {
    const bd = ensureModal();
    const b = getBoard();
    if (!b) return;
    const promptInput = (bd.querySelector('#mn-ag-prompt').value || '').trim();
    const hasImg = !!modalState.imgBase64;
    if (!hasImg && !promptInput) {
      setError('Vui lòng nhập đề bài hoặc dán ảnh đề bài (Ctrl + V) trước khi dựng hình.');
      return;
    }
    if (!window.MinNoteMeaSync || typeof window.MinNoteMeaSync.executeAiPrompt !== 'function') {
      setError('Chưa kết nối được bộ thực thi AI (MinNoteMeaSync).');
      return;
    }

    const wantAnimate = !!bd.querySelector('#mn-ag-opt-animate').checked;
    const wantAux = !!bd.querySelector('#mn-ag-opt-aux').checked;

    const userPrompt = [
      promptInput
        ? `Đề bài / Yêu cầu dựng hình:\n${promptInput}`
        : 'Hãy đọc kỹ đề bài Toán Hình học trong ảnh đính kèm (kể cả đề tự luận, trắc nghiệm hoặc bảng Đúng/Sai 4 mệnh đề) và dựng hình chính xác toàn bộ giả thiết.',
      wantAux
        ? 'Hãy dựng thêm các điểm, giao tuyến, giao điểm, góc vuông chính phục vụ các câu hỏi / mệnh đề a, b, c, d (nếu đề bài hoặc bảng Đúng/Sai có). Giữ tổng số lệnh "ops" gọn gàng khoảng 20–35 bước cốt lõi.'
        : 'Chỉ dựng các yếu tố trong giả thiết chính của đề bài (chưa cần dựng nét phụ của các câu hỏi a, b, c, d).',
      'Trả về DUY NHẤT 1 đối tượng JSON gọn sạch theo schema quy định (không viết giải thích ngoài JSON).'
    ].join('\n\n');

    setError('');
    setBusy(true);
    setStage(1);
    const stageTimer = setTimeout(() => { if (modalState.busy) setStage(2); }, 900);

    try {
      const aiRes = await window.MinNoteMeaSync.executeAiPrompt(userPrompt, AI_GEO_SYSTEM_PROMPT, {
        provider: modalState.selectedProvider || undefined,
        model: modalState.selectedModel || undefined,
        imageBase64: hasImg ? modalState.imgBase64 : undefined,
        imageMimeType: hasImg ? modalState.imgMime : undefined,
        timeoutMs: 260000
      });
      clearTimeout(stageTimer);
      setStage(2);

      const plan = extractJsonObject(aiRes && (aiRes.content || aiRes.text || aiRes));
      const compiled = compileAiGeoPlan(plan, b, modalState.anchorBox);

      setStage(3);
      b.commit(b.addGeo(compiled.pageIdx, compiled.points, compiled.shapes));

      const ptIds = compiled.points.map(p => p.id);
      const shIds = compiled.shapes.map(s => s.id);
      const anchor = modalState.anchorBox;

      closeModal();

      if (wantAnimate && window.MinNoteGeoReplay && typeof window.MinNoteGeoReplay.launchConstructedFigure === 'function') {
        window.MinNoteGeoReplay.launchConstructedFigure({
          pageIdx: compiled.pageIdx,
          pointIds: ptIds,
          shapeIds: shIds,
          steps: compiled.steps,
          title: compiled.title,
          speed: 1,
          viewMode: 'pill',
          autoPlay: true,
          handPen: true,
          followCamera: false
        });
      } else {
        b.setTool({ k: 'select' });
        b.sel = { page: compiled.pageIdx, strokes: new Set(), items: new Set(), points: new Set(ptIds), shapes: new Set(shIds) };
        b.redraw();
        b.emit();
      }

      if (typeof window.showToast === 'function') {
        window.showToast(
          wantAnimate
            ? `✨ AI đang dựng từng nét "${compiled.title}" (${compiled.steps.length} bước)`
            : `✨ Đã chèn hình "${compiled.title}"`,
          'success'
        );
      }
      void anchor;
    } catch (err) {
      clearTimeout(stageTimer);
      setStage(0);
      setError((err && err.message) ? err.message : 'AI dựng hình thất bại. Kiểm tra lại API Key hoặc thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function runTikzImport(animate) {
    const bd = ensureModal();
    const b = getBoard();
    const K = getKernel();
    if (!b || !K || typeof K.uC !== 'function') {
      setError('Không tìm thấy bộ phân tích TikZ.');
      return;
    }
    const code = (bd.querySelector('#mn-ag-tikz-input').value || '').trim();
    if (!code) {
      setError('Vui lòng dán mã TikZ trước khi nạp vào bảng.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const appStyle = getAppGeoStyle(b);
      const style = { color: appStyle.color, width: appStyle.width };
      const mkId = () => K.nt();
      let fig = K.uC(code, style, mkId, () => '');

      const useTrace = !!bd.querySelector('#mn-ag-tikz-trace').checked;
      if (useTrace && typeof window.__mnTraceTikz === 'function' && typeof K.lE === 'function' && typeof K.Toe === 'function' && typeof K.xoe === 'function') {
        try {
          const tracedRaw = await K.lE(window.__mnTraceTikz, code);
          if (typeof tracedRaw === 'string' && tracedRaw.trim()) {
            const traced = K.Toe(fig, K.xoe(tracedRaw), style, mkId, () => '');
            if (traced && traced.points && traced.points.length) fig = traced;
          }
        } catch {
          // Graceful fallback to direct parser uC
        }
      }

      fig = refineTikzConstraints(fig, mkId);
      const bounds = K.qh ? K.qh(fig) : null;
      if (!bounds) {
        throw new Error('Không nhận diện được đoạn thẳng hay hình vẽ hợp lệ từ mã TikZ.');
      }

      const rawSpan = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0, 0.5);
      const targetScale = Math.max(22, Math.min(115, 320 / rawSpan));
      const vc = typeof b.viewCentre === 'function' ? b.viewCentre() : { index: b.currentPage(), x: 420, y: 340 };
      let pageIdx = Number.isFinite(vc.index) ? vc.index : b.currentPage();
      let center = { x: vc.x || 420, y: vc.y || 340 };
      const anchor = modalState.anchorBox;
      if (anchor && Number.isFinite(anchor.pageIdx)) {
        pageIdx = anchor.pageIdx;
        const pageW = K.Kt && b.doc ? K.Kt(b.doc) : 1120;
        const figW = (bounds.x1 - bounds.x0) * targetScale;
        const figH = (bounds.y1 - bounds.y0) * targetScale;
        if (anchor.x + anchor.w + 56 + figW <= pageW - 24) {
          center = { x: anchor.x + anchor.w + 56 + figW / 2, y: Math.max(80 + figH / 2, anchor.y + anchor.h / 2) };
        } else {
          center = { x: Math.max(80 + figW / 2, Math.min(pageW - figW / 2 - 24, anchor.x + anchor.w / 2)), y: anchor.y + anchor.h + 44 + figH / 2 };
        }
      }

      let pointsList = fig.points;
      let shapesList = fig.shapes;
      if (typeof K.g9 === 'function') {
        const scaled = K.g9(fig, targetScale, center);
        pointsList = scaled.points;
        shapesList = scaled.shapes;
      } else {
        const placed = scaleAndPlaceFigure(fig.points, fig.shapes, b, anchor);
        pointsList = placed.points;
        pageIdx = placed.pageIdx;
      }

      const nameGen = typeof K.yc === 'function' ? K.yc(b.doc.pages[pageIdx].geo) : (() => '');
      pointsList = pointsList.map(p => {
        const np = (p.show && !p.label) ? { ...p, label: nameGen() } : { ...p };
        // Normalize visible named TikZ vertices so native app dotColor / dotSize / labelSize render uniformly
        if (np.show && !np.hidden && np.label && !np.noName) {
          delete np.noDot;
          delete np.color;
          delete np.size;
          np.named = true;
        }
        return np;
      });
      const defaultBlacks = new Set(['', '#000', '#000000', '#0f172a', '#1a1a1a', '#111827']);
      shapesList = shapesList.map(sh => {
        const colLow = String(sh.color || '').trim().toLowerCase();
        return {
          ...sh,
          color: defaultBlacks.has(colLow) ? appStyle.color : sh.color,
          width: sh.width === 0 ? 0 : appStyle.width
        };
      });

      if (b.autoDash3d !== false && typeof K._mnAutoLiftTikz3d === 'function') {
        const tmp = { points: Object.fromEntries(pointsList.map(p => [p.id, p])), shapes: shapesList };
        const lifted = K._mnAutoLiftTikz3d(tmp, mkId);
        if (lifted) {
          pointsList = Object.values(lifted.points);
          shapesList = lifted.shapes;
        }
      }

      b.commit(b.addGeo(pageIdx, pointsList, shapesList));
      const ptIds = pointsList.map(p => p.id);
      const shIds = shapesList.map(s => s.id);
      const orderedSteps = buildOrderedStepsForTikz(pointsList, shapesList);

      closeModal();

      if (animate && window.MinNoteGeoReplay && typeof window.MinNoteGeoReplay.launchConstructedFigure === 'function') {
        window.MinNoteGeoReplay.launchConstructedFigure({
          pageIdx,
          pointIds: ptIds,
          shapeIds: shIds,
          steps: orderedSteps,
          title: 'Hình TikZ dựng từng nét',
          speed: 1,
          viewMode: 'pill',
          autoPlay: true,
          handPen: true,
          followCamera: false
        });
      } else {
        b.setTool({ k: 'select' });
        b.sel = { page: pageIdx, strokes: new Set(), items: new Set(), points: new Set(pointsList.filter(p => p.show).map(p => p.id)), shapes: new Set(shIds) };
        b.redraw();
        b.emit();
      }
    } catch (err) {
      setError((err && err.message) ? err.message : 'Lỗi nạp hình TikZ.');
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    modalState.open = false;
    setBusy(false);
    setStage(0);
    setError('');
    const bd = document.getElementById('mn-ai-geo-backdrop');
    if (bd) bd.classList.remove('open');
  }

  async function openModal(opts = {}) {
    const bd = ensureModal();
    modalState.open = true;
    modalState.anchorBox = opts.anchorBox || null;
    setError('');
    setStage(0);

    if (opts.tab) setTab(opts.tab);
    else setTab('ai');

    const promptTa = bd.querySelector('#mn-ag-prompt');
    const tikzTa = bd.querySelector('#mn-ag-tikz-input');

    if (opts.clearImage) clearAttachedImage();
    if (opts.prompt !== undefined && promptTa) promptTa.value = opts.prompt;
    if (opts.tikz !== undefined && tikzTa) {
      tikzTa.value = opts.tikz;
      updateTikzPreviewStats();
    }
    if (opts.imageSrc) {
      try {
        const parsed = await dataUrlFromImageSrc(opts.imageSrc);
        if (parsed) {
          const resSuffix = (parsed.width && parsed.height) ? ` (${parsed.width}×${parsed.height})` : '';
          attachImageData(parsed.dataUrl, parsed.base64, parsed.mimeType, (opts.imageSourceLabel || 'Ảnh từ mục đang chọn') + resSuffix);
        }
      } catch {
        // Non-fatal if image fails cross-origin fetch
      }
    }

    syncModalAiSelector();
    bd.classList.add('open');
    setTimeout(() => {
      if (modalState.tab === 'tikz' && tikzTa) tikzTa.focus();
      else if (promptTa) promptTa.focus();
    }, 30);
  }

  window.MinNoteAiGeo = {
    isOpen: () => !!modalState.open,
    open: (opts) => openModal(opts || {}),
    close: closeModal,
    canShowInSelBar: (boardArg) => !!getSelectedSourceCandidate(boardArg),
    async openFromSelection(boardArg) {
      const cand = getSelectedSourceCandidate(boardArg);
      if (!cand) return openModal({});
      const it = cand.item;
      const anchorBox = {
        pageIdx: cand.pageIdx,
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        w: Number(it.w) || 420,
        h: Number(it.h) || 180
      };
      if (it.type === 'image') {
        const hasTikz = !!(it.tikz && String(it.tikz).trim());
        return openModal({
          tab: hasTikz ? 'tikz' : 'ai',
          tikz: hasTikz ? it.tikz : undefined,
          imageSrc: it.src,
          imageSourceLabel: 'Ảnh đề đang chọn trên bảng',
          prompt: '',
          anchorBox
        });
      }
      if (it.type === 'problem') {
        const firstFigTikz = Array.isArray(it.figs) ? (it.figs.find(f => f && f.tikz) || {}).tikz : '';
        const firstFigSrc = Array.isArray(it.figs) ? (it.figs.find(f => f && f.src) || {}).src : '';
        return openModal({
          tab: 'ai',
          prompt: it.tex || it.title || '',
          tikz: firstFigTikz || undefined,
          imageSrc: firstFigSrc || undefined,
          imageSourceLabel: firstFigSrc ? 'Hình kèm theo khung đề' : '',
          clearImage: !firstFigSrc,
          anchorBox
        });
      }
      return openModal({
        tab: 'ai',
        prompt: it.text || '',
        clearImage: true,
        anchorBox
      });
    },
    refineTikzConstraints,
    compileAiGeoPlan,
    buildOrderedStepsForTikz
  };

  window.toggleAiGeoStudio = function(opts) {
    if (modalState.open) closeModal();
    else openModal(opts || {});
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      window.toggleAiGeoStudio();
      return;
    }
    if (!modalState.open) return;
    if (e.key === 'Escape' && !modalState.busy) {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Enter' && e.ctrlKey && !modalState.busy) {
      e.preventDefault();
      if (modalState.tab === 'ai') runAiConstruction();
      else runTikzImport(true);
    }
  });
})();
