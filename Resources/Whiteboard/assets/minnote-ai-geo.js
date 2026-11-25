/**
 * MinNote v0.0.9.5 — AI Dựng Hình Từng Nét, Tự Động Kiểm Chứng/Sửa Lỗi Hình Học & Cầu Nối JSON Chuyển Động
 * - Nút #tb-btn-ai-geo cạnh Sơ Đồ Tư Duy + nút ✨ AI Dựng hình trên thanh chọn ảnh/đề bài
 * - Bộ kiểm chứng & tự sửa lỗi hình học AI (validateAndHealAiGeoPlan): chống tứ giác tự cắt (bow-tie),
 *   chống giao điểm song song / chéo nhau 3D, chống bẫy giả trung điểm 0.5, lật đỉnh S bị ngược trục Y,
 *   sắp xếp topo phá vòng lặp phụ thuộc, tính an toàn biểu thức toán ("sqrt(3)/2") không dùng trình thực thi động.
 * - Tab 3 "🔄 JSON & Chuyển Động": nạp/xuất mn-geo-motion/2.0, AI ops JSON, BetaTikz tikzvid-project/1 & điều khiển hiệu ứng.
 */
(function (root) {
  'use strict';

  const hasWindow = typeof window !== 'undefined';
  const hasDoc = typeof document !== 'undefined';

  let _fbSeq = 0;
  const fallbackKernel = {
    nt: () => 'g_' + Date.now().toString(36) + '_' + (++_fbSeq).toString(36),
    Tt: (geo) => {
      const ptsObj = (geo && geo.points) || {};
      const map = new Map();
      const visiting = new Set();
      const evalPt = (id) => {
        if (map.has(id)) return map.get(id);
        const pt = ptsObj[id];
        if (!pt || !pt.def || visiting.has(id)) return null;
        visiting.add(id);
        const d = pt.def;
        let res = null;
        if (d.t === 'free' && Number.isFinite(d.x) && Number.isFinite(d.y)) {
          res = { x: d.x, y: d.y };
        } else if (d.t === 'sum') {
          const a = evalPt(d.a), b = evalPt(d.b), c = evalPt(d.c);
          if (a && b && c) res = { x: a.x + b.x - c.x, y: a.y + b.y - c.y };
        } else if (d.t === 'mid') {
          const a = evalPt(d.a), b = evalPt(d.b);
          if (a && b) res = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
        } else if (d.t === 'on') {
          const a = evalPt(d.a), b = evalPt(d.b);
          const k = Number.isFinite(Number(d.k)) ? Number(d.k) : 0.5;
          if (a && b) res = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        } else if (d.t === 'foot') {
          const p = evalPt(d.p), a = evalPt(d.a), b = evalPt(d.b);
          if (p && a && b) {
            const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
            const t = l2 > 1e-12 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
            res = { x: a.x + dx * t, y: a.y + dy * t };
          }
        } else if (d.t === 'vec') {
          const o = evalPt(d.o), a = evalPt(d.a), b = evalPt(d.b);
          if (o && a && b) {
            let dx = b.x - a.x, dy = b.y - a.y;
            if (d.perp) { const tmp = dx; dx = -dy; dy = tmp; }
            const k = Number.isFinite(Number(d.k)) ? Number(d.k) : 1;
            res = { x: o.x + dx * k, y: o.y + dy * k };
          }
        } else if (d.t === 'path' && Array.isArray(d.pts) && d.pts.length >= 2) {
          const o = evalPt(d.pts[0]), rPt = evalPt(d.pts[1]);
          if (o && rPt) {
            const rad = Math.hypot(rPt.x - o.x, rPt.y - o.y);
            const ang = Number(d.k || 0) * Math.PI * 2;
            res = { x: o.x + rad * Math.cos(ang), y: o.y + rad * Math.sin(ang) };
          }
        } else if (d.t === 'inter' && Array.isArray(d.l1) && Array.isArray(d.l2)) {
          const p1 = evalPt(d.l1[0]), p2 = evalPt(d.l1[1]), p3 = evalPt(d.l2[0]), p4 = evalPt(d.l2[1]);
          if (p1 && p2 && p3 && p4) {
            if (!d.c1 && !d.c2) {
              const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y, dx2 = p4.x - p3.x, dy2 = p4.y - p3.y;
              const det = dx1 * dy2 - dy1 * dx2;
              if (Math.abs(det) > 1e-9) {
                const t = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / det;
                res = { x: p1.x + dx1 * t, y: p1.y + dy1 * t };
              }
            } else if (d.c1 && d.c2) {
              const r1 = Math.hypot(p2.x - p1.x, p2.y - p1.y), r2 = Math.hypot(p4.x - p3.x, p4.y - p3.y);
              const dx = p3.x - p1.x, dy = p3.y - p1.y, dist = Math.hypot(dx, dy);
              if (dist > 1e-9 && dist <= r1 + r2 + 1e-5 && dist >= Math.abs(r1 - r2) - 1e-5) {
                const a = (r1 * r1 - r2 * r2 + dist * dist) / (2 * dist);
                const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
                const xm = p1.x + (a * dx) / dist, ym = p1.y + (a * dy) / dist;
                res = (d.which ? 1 : 0) === 0
                  ? { x: xm + (h * dy) / dist, y: ym - (h * dx) / dist }
                  : { x: xm - (h * dy) / dist, y: ym + (h * dx) / dist };
              }
            } else {
              const c = d.c1 ? p1 : p3, rPt = d.c1 ? p2 : p4, a = d.c1 ? p3 : p1, b = d.c1 ? p4 : p2;
              const rad = Math.hypot(rPt.x - c.x, rPt.y - c.y);
              const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
              if (l2 > 1e-9) {
                const fx = a.x - c.x, fy = a.y - c.y;
                const B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - rad * rad;
                const disc = B * B - 4 * l2 * C;
                if (disc >= -1e-5) {
                  const s = Math.sqrt(Math.max(0, disc));
                  const t = (d.which ? 1 : 0) === 1 ? (-B + s) / (2 * l2) : (-B - s) / (2 * l2);
                  res = { x: a.x + dx * t, y: a.y + dy * t };
                }
              }
            }
          }
        }
        visiting.delete(id);
        if (res && Number.isFinite(res.x) && Number.isFinite(res.y)) map.set(id, res);
        return map.get(id) || null;
      };
      for (const k of Object.keys(ptsObj)) evalPt(k);
      return map;
    }
  };

  const getBoard = () => {
    const w = typeof window !== 'undefined' ? window : globalThis;
    if (!w) return null;
    return w.__minnoteBoard || (w.__meaBoardRef && w.__meaBoardRef.current) || null;
  };
  const getKernel = () => {
    const w = typeof window !== 'undefined' ? window : globalThis;
    return (w && w.__mnGeoKernel) || fallbackKernel;
  };

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
Nhiệm vụ: Đọc đề bài (văn bản hoặc ảnh: đề tự luận/trắc nghiệm, bảng Đúng-Sai 4 ý, hoặc ảnh hình vẽ SGK/vẽ tay) -> tự kiểm chứng hình học ngầm theo 5 cổng -> xuất DUY NHẤT 1 đối tượng JSON dựng hình TỪNG NÉT chuẩn xác.

5 CỔNG TỰ KIỂM CHỨNG HÌNH HỌC BẮT BUỘC TRƯỚC KHI XUẤT JSON:
1. ĐỒ THỊ PHỤ THUỘC ĐIỂM (DAG - cấm điểm rời rạc & cấm bẫy giả trung điểm):
   - Chỉ ĐỈNH GỐC tự do dùng "point_free" (A, B, C, D, S hoặc tâm O, điểm R đường tròn). Mọi số x, y, ratio, k, angleDeg phải ghi số thập phân tường minh (vd 0.866 thay vì biểu thức chữ).
   - Trung điểm thật dùng "midpoint" (a, b).
   - Điểm thuộc đoạn tổng quát (KHÔNG phải trung điểm): dùng "point_on_segment" với ratio thuộc [0.08..0.92] và BẮT BUỘC ratio != 0.5 (chọn 0.36 hoặc 0.64 để tránh sinh đường song song giả do định lý Thales!).
   - Điểm trên phần kéo dài: "point_on_line" (ratio < 0 hoặc > 1).
   - Hình chiếu vuông góc từ P lên AB: "foot_perp" (p, a, b).
   - Điểm được định nghĩa TRƯỚC khi bất kỳ lệnh nào khác tham chiếu tới id của nó.
2. CHỐNG TỨ GIÁC ĐÁY TỰ CẮT (ANTI-BOWTIE ABCD) & HỆ TRỤC (+x phải, +y HƯỚNG LÊN):
   - Đáy tứ giác ABCD BẮT BUỘC đi đúng vòng lồi khép kín A -> B -> C -> D -> A (CẤM chéo hình nơ AB cắt CD hoặc BC cắt DA).
   - Chóp đáy HÌNH BÌNH HÀNH / CHỮ NHẬT / VUÔNG / THOI ABCD: đặt A(-2.2, 0.0), B(-3.6, -1.8), D(2.6, 0.0), và BẮT BUỘC C dùng "point_sum" (a:"B", b:"D", c:"A" => C = B + D - A); chỉ AB, AD "dashed": true. Nếu SA ⊥ (ABCD): S(-2.2, 4.0).
   - Chóp TỨ GIÁC LỒI THƯỜNG S.ABCD (hai cặp cạnh đối KHÔNG song song): A(-2.8, 0.0), B(-1.2, -2.0), C(1.9, -1.7), D(3.2, 0.2), S(-0.4, 3.8); chỉ AD "dashed": true.
   - Chóp tam giác S.ABC: A(-2.5, 0.0), B(-0.6, -1.8), C(2.8, 0.0), S(-0.2, 3.6); chỉ AC "dashed": true.
   - Đỉnh chóp S BẮT BUỘC nằm phía trên đáy (y > 0, thường y từ 3.4 đến 4.2) và lệch khỏi các cạnh đáy để không mặt bên nào bị suy biến thành đoạn thẳng.
   - Lăng trụ / Hình hộp: dựng đáy dưới trước, đặt A' bằng "point_free" ở phía trên, các đỉnh B', C', D' dùng "point_sum" theo véc-tơ AA'.
3. CHỐNG GIAO ĐIỂM GIẢ 2 ĐƯỜNG CHÉO NHAU TRONG 3D (ANTI-SKEW) & CHỐNG SUY BIẾN SONG SONG:
   - Lệnh "intersection_ll" (l1, l2) CHỈ ĐƯỢC DÙNG khi l1 và l2 cùng thuộc một mặt phẳng (đồng phẳng) VÀ không song song!
   - CẤM lấy "intersection_ll" của 2 đường chéo nhau trong không gian (vd SA với BC, SB với CD, AM với BD). Muốn tìm giao điểm đường thẳng d với mặt phẳng (P), phải tìm đường phụ Δ nằm trong (P) đồng phẳng với d rồi mới lấy d ∩ Δ.
   - Nếu 2 đường song song (vd MN // CD khi M, N là trung điểm SC, SD), TUYỆT ĐỐI CẤM dùng "intersection_ll" -> phải dùng "line_parallel" (through:"A", a:"C", b:"D", asLine:true, noDot:true, aux:true, label:"x").
4. TIẾP TUYẾN ĐƯỜNG TRÒN TỪ ĐIỂM NGOÀI (ĐƯỜNG TRÒN ĐƯỜNG KÍNH THALES):
   - Khi kẻ tiếp tuyến AB, AC từ điểm A nằm ngoài đường tròn (O; R): CẤM ước lượng góc thủ công! BẮT BUỘC lấy trung điểm M = midpoint(O, A), sau đó tìm tiếp điểm B, C chính xác bằng "intersection_cc" giữa đường tròn Thales ["M","O"] và đường tròn ["O","R"] (which: 0 và which: 1), rồi gắn "right_angle" tại đỉnh v:"B" (a:"O", v:"B", b:"A") và v:"C".
5. QUY TẮC NÉT KHUẤT 3D & HIỆU ỨNG CHUYỂN ĐỘNG SƯ PHẠM:
   - Mọi điểm sinh ra (M, N, O, K, I, H...) PHẢI được nối đầy đủ bằng "segment" hoặc "connect_polygon", không để điểm trơ trọi.
   - Cạnh khuất đáy, đường chéo đáy, đường cao trong khối, nét xuyên lòng khối / mặt sau -> "dashed": true; cạnh bao ngoài & mặt trước -> "dashed": false.
   - Trong hình phẳng 2D ("is3D": false): "right_angle" đặt đúng đỉnh góc vuông ở tham số giữa "v".
   - Có thể gắn thêm "motion": {"preset":"domiinh"|"manim"|"3d_standard","loop":true,"handPen":true,"followCamera":true} và trên từng op có thể gắn "effect" ("chalk"|"draw"|"glow"|"pop"|"pulse"|"fade"), "easing" ("easeInOut"|"easeOut"|"spring"|"linear"), "durationMul".
   - KHÔNG tự ý thêm "color" hay "width" (trừ khi đề bài yêu cầu màu riêng -> kèm "explicitColor": true). Trả về DUY NHẤT 1 JSON hợp lệ, không bọc giải thích ngoài JSON.

SCHEMA "ops" (Và cấu trúc JSON tổng thể {"schema":"mn-geo-motion/2.0","title":"...","is3D":true,"ops":[...],"motion":{...}}):
- {"op":"point_free","id":"A","label":"A","x":-2.8,"y":0,"step":"Chấm đỉnh A"}
- {"op":"point_sum","id":"C","label":"C","a":"B","b":"D","c":"A","step":"Dựng đỉnh C = B + D - A"}
- {"op":"midpoint","id":"M","label":"M","a":"S","b":"C","effect":"pop","step":"Trung điểm M của SC"}
- {"op":"point_on_segment","id":"N","label":"N","a":"S","b":"D","ratio":0.38,"step":"Điểm N trên đoạn SD"}
- {"op":"point_on_line","id":"E","label":"E","a":"C","b":"D","ratio":1.4,"step":"Điểm E trên CD kéo dài"}
- {"op":"intersection_ll","id":"O","label":"O","l1":["A","C"],"l2":["B","D"],"drawExtensions":true,"effect":"pop","step":"Giao điểm O = AC ∩ BD"}
- {"op":"intersection_lc","id":"K","label":"K","line":["A","O"],"circle":["O","R"],"which":0,"step":"Giao điểm đường và đường tròn"}
- {"op":"intersection_cc","id":"B","label":"B","c1":["M","O"],"c2":["O","R"],"which":0,"effect":"pop","step":"Tiếp điểm B qua đường tròn Thales đường kính OA"}
- {"op":"foot_perp","id":"H","label":"H","p":"A","a":"S","b":"B","drawDropSegment":true,"dashed":false,"markRightAngle":true,"aux":true,"step":"Hạ AH ⊥ SB"}
- {"op":"circle","center":"O","rim":"R","dashed":false,"step":"Đường tròn (O)"}
- {"op":"point_on_circle","id":"D","label":"D","center":"O","rim":"R","angleDeg":125,"step":"Điểm D trên (O)"}
- {"op":"line_parallel","id":"x","label":"x","through":"A","a":"C","b":"D","k":1.2,"asLine":true,"bothSides":false,"noDot":true,"aux":true,"effect":"glow","step":"Giao tuyến Ax // CD"}
- {"op":"line_perp","id":"q","label":"q","through":"A","a":"O","b":"A","k":1.2,"asLine":true,"noDot":true,"aux":true,"step":"Đường thẳng vuông góc"}
- {"op":"segment","a":"A","b":"D","dashed":true,"effect":"chalk","step":"Cạnh khuất AD"}
- {"op":"connect_polygon","pts":["A","B","M","I"],"dashedEdges":["A-I"],"fill":"rgba(15, 23, 42, 0.06)","effect":"fade","step":"Thiết diện ABMI"}
- {"op":"line"|"ray","a":"S","b":"O","dashed":true,"aux":true,"step":"Đường phụ SO"}
- {"op":"right_angle","a":"O","v":"B","b":"A","aux":true,"step":"Góc vuông tại B"}
- {"op":"angle_mark","a":"B","v":"A","b":"C","n":1,"aux":true,"step":"Kí hiệu góc"}
- {"op":"polygon_fill","pts":["A","M","N"],"fill":"rgba(15, 23, 42, 0.06)","effect":"fade","step":"Tô mặt (AMN)"}`;

  function buildCompactExternalPrompt(problemText, motionOpts = {}) {
    const preset = motionOpts.preset || 'domiinh';
    const defFx = motionOpts.defaultEffect || 'chalk';
    const prob = String(problemText || '').trim() || '[DÁN ĐỀ BÀI TOÁN HÌNH HỌC 2D/3D HOẶC ĐÍNH KÈM ẢNH ĐỀ BÀI VÀO ĐÂY]';
    return `Bạn là Kỹ sư Dựng hình Tham số chuẩn MinNote (mn-geo-motion/2.0). Hãy đọc đề bài dưới đây và xuất DUY NHẤT 1 JSON hợp lệ (không giải thích ngoài JSON):
{"schema":"mn-geo-motion/2.0","title":"Tên hình","is3D":true|false,"ops":[...],"motion":{"preset":"${preset}","defaultEffect":"${defFx}","loop":${motionOpts.loop !== false},"handPen":${motionOpts.handPen !== false},"followCamera":${motionOpts.followCamera !== false},"orbit3d":${!!motionOpts.orbit3d}}}

QUY TẮC KHÓA CHẶT CHỐNG SAI HÌNH:
1. Chỉ đỉnh gốc dùng {"op":"point_free","id":"A","x":-2.2,"y":0} (trục +x sang phải, +y HƯỚNG LÊN, số thập phân tường minh).
2. Đáy ABCD lồi đúng vòng A->B->C->D (cấm tự cắt hình nơ!):
   - Hình bình hành/chữ nhật/vuông/thoi: A(-2.2,0), B(-3.6,-1.8), D(2.6,0), C={"op":"point_sum","id":"C","a":"B","b":"D","c":"A"} (AB, AD dashed:true).
   - Tứ giác lồi thường: A(-2.8,0), B(-1.2,-2.0), C(1.9,-1.7), D(3.2,0.2) (AD dashed:true). Đỉnh chóp S đặt phía trên đáy (y ≈ 3.8).
3. Trung điểm: {"op":"midpoint","id":"M","a":"S","b":"C"}. Điểm thuộc đoạn tổng quát: {"op":"point_on_segment","id":"N","a":"S","b":"D","ratio":0.38} (ratio != 0.5!).
4. Giao 2 đường ĐỒNG PHẲNG: {"op":"intersection_ll","id":"O","l1":["A","C"],"l2":["B","D"],"drawExtensions":true}. CẤM giao 2 đường chéo nhau 3D hoặc 2 đường song song! Nếu song song dùng {"op":"line_parallel","id":"x","label":"x","through":"A","a":"C","b":"D","asLine":true,"noDot":true,"aux":true}.
5. Tiếp tuyến từ A ngoài đường tròn (O;R): lấy M=midpoint(O,A), tiếp điểm B,C={"op":"intersection_cc","id":"B","c1":["M","O"],"c2":["O","R"],"which":0|1}, góc vuông {"op":"right_angle","a":"O","v":"B","b":"A"}.
6. Hạ vuông góc: {"op":"foot_perp","id":"H","p":"A","a":"S","b":"B","drawDropSegment":true,"markRightAngle":true}. Nối cạnh: {"op":"segment","a":"S","b":"A","dashed":false,"effect":"${defFx}","step":"..."}. Thiết diện: {"op":"connect_polygon","pts":[...],"dashedEdges":["A-I"],"fill":"rgba(15,23,42,0.06)","effect":"fade"}.
7. Gắn "effect" hợp lý trên từng op: "${defFx}" cho nét vẽ, "pop" cho giao điểm/trung điểm quan trọng, "glow" hoặc "pulse" cho giao tuyến kết luận, "fade" cho tô mặt.

ĐỀ BÀI CẦN DỰNG:
${prob}`;
  }

  // ==========================================================================
  // 0. SAFE RECURSIVE-DESCENT MATH EXPRESSION PARSER & LLM JSON SANITIZER
  //    (100% Pure Arithmetic Parser — Zero dynamic code execution!)
  // ==========================================================================
  function parseMathNumber(rawVal, fallback = NaN) {
    if (typeof rawVal === 'number') {
      return Number.isFinite(rawVal) ? rawVal : fallback;
    }
    if (typeof rawVal !== 'string') return fallback;
    let s = rawVal.trim();
    if (!s) return fallback;

    // Fast path for plain finite numbers
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) {
      const direct = Number(s);
      return Number.isFinite(direct) ? direct : fallback;
    }

    // Normalize LaTeX / Unicode math tokens safely (\sqrt BEFORE \frac so nested \frac{\sqrt{3}}{2} works!)
    s = s
      .replace(/[−–—]/g, '-')
      .replace(/[×⋅·]/g, '*')
      .replace(/÷/g, '/')
      .replace(/\\pi\b|π/gi, 'pi')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)')
      .replace(/√\s*\(([^()]+)\)/g, 'sqrt($1)')
      .replace(/√\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
      .replace(/\^\s*\{([^{}]+)\}/g, '^($1)')
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))')
      .replace(/\\(?:left|right|,|;|!|\s)/g, '')
      .replace(/\s+/g, '');

    // Insert implicit multiplication: 2sqrt(3) -> 2*sqrt(3), 2pi -> 2*pi, )2 -> )*2, )( -> )*(
    s = s
      .replace(/(\d|\))(?=[a-zA-Z(])/g, '$1*')
      .replace(/(\))(?=\d)/g, '$1*');

    // Tokenize
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if ('+-*/^(),'.includes(ch)) {
        tokens.push({ t: ch });
        i++;
      } else if ((ch >= '0' && ch <= '9') || ch === '.') {
        let j = i;
        while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++;
        if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
          j++;
          if (j < s.length && (s[j] === '+' || s[j] === '-')) j++;
          while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
        }
        const num = Number(s.slice(i, j));
        if (!Number.isFinite(num)) return fallback;
        tokens.push({ t: 'num', v: num });
        i = j;
      } else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        let j = i;
        while (j < s.length && ((s[j] >= 'a' && s[j] <= 'z') || (s[j] >= 'A' && s[j] <= 'Z') || (s[j] >= '0' && s[j] <= '9'))) j++;
        tokens.push({ t: 'id', name: s.slice(i, j).toLowerCase() });
        i = j;
      } else {
        return fallback;
      }
    }

    let pos = 0;
    const peek = () => tokens[pos] || null;
    const next = () => tokens[pos++] || null;

    const CONSTS = {
      pi: Math.PI,
      tau: Math.PI * 2,
      e: Math.E,
      phi: (1 + Math.sqrt(5)) / 2
    };

    const FUNCS = {
      sqrt: (a) => (a >= 0 ? Math.sqrt(a) : NaN),
      cbrt: (a) => Math.cbrt(a),
      abs: (a) => Math.abs(a),
      sin: (a) => Math.sin(a),
      cos: (a) => Math.cos(a),
      tan: (a) => Math.tan(a),
      sind: (a) => Math.sin((a * Math.PI) / 180),
      cosd: (a) => Math.cos((a * Math.PI) / 180),
      tand: (a) => Math.tan((a * Math.PI) / 180),
      asin: (a) => Math.asin(a),
      acos: (a) => Math.acos(a),
      atan: (a) => Math.atan(a),
      atan2: (a, b) => Math.atan2(a, b),
      pow: (a, b) => Math.pow(a, b),
      min: (a, b) => Math.min(a, b),
      max: (a, b) => Math.max(a, b),
      deg: (a) => (a * 180) / Math.PI,
      rad: (a) => (a * Math.PI) / 180
    };

    function parseExpr() {
      let left = parseTerm();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        const op = next().t;
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseTerm() {
      let left = parsePower();
      while (peek() && (peek().t === '*' || peek().t === '/')) {
        const op = next().t;
        const right = parsePower();
        if (op === '/') {
          if (Math.abs(right) < 1e-15) return NaN;
          left = left / right;
        } else {
          left = left * right;
        }
      }
      return left;
    }

    function parsePower() {
      const base = parseUnary();
      if (peek() && peek().t === '^') {
        next();
        const exp = parsePower();
        return Math.pow(base, exp);
      }
      return base;
    }

    function parseUnary() {
      const tok = peek();
      if (!tok) return NaN;
      if (tok.t === '+') { next(); return parseUnary(); }
      if (tok.t === '-') { next(); return -parseUnary(); }
      return parsePrimary();
    }

    function parsePrimary() {
      const tok = next();
      if (!tok) return NaN;
      if (tok.t === 'num') return tok.v;
      if (tok.t === '(') {
        const val = parseExpr();
        if (!peek() || peek().t !== ')') return NaN;
        next();
        return val;
      }
      if (tok.t === 'id') {
        if (peek() && peek().t === '(') {
          next();
          const args = [];
          if (!peek() || peek().t !== ')') {
            args.push(parseExpr());
            while (peek() && peek().t === ',') {
              next();
              args.push(parseExpr());
            }
          }
          if (!peek() || peek().t !== ')') return NaN;
          next();
          const fn = FUNCS[tok.name];
          if (!fn || !args.length) return NaN;
          return fn(args[0], args[1]);
        }
        if (Object.prototype.hasOwnProperty.call(CONSTS, tok.name)) {
          return CONSTS[tok.name];
        }
      }
      return NaN;
    }

    const result = parseExpr();
    if (pos !== tokens.length || !Number.isFinite(result)) return fallback;
    return result;
  }

  function sanitizeLlmJsonText(rawText) {
    const fixes = [];
    let src = String(rawText || '').trim();
    if (!src) return { cleaned: '', fixes };

    // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
    const fenceMatch = /```(?:json|javascript|js|jsonc)?\s*([\s\S]*?)```/i.exec(src);
    if (fenceMatch && fenceMatch[1] && (fenceMatch[1].includes('{') || fenceMatch[1].includes('['))) {
      src = fenceMatch[1].trim();
      fixes.push('Đã bóc tách khối mã Markdown ```json.');
    } else if (/^```/i.test(src) || /```$/.test(src)) {
      src = src.replace(/^```(?:json|javascript|js|jsonc)?\s*/i, '').replace(/```\s*$/i, '').trim();
      fixes.push('Đã xóa dấu rào Markdown ``` thừa.');
    }

    // 2. Replace smart quotes used outside standard ASCII double-quoted strings
    if (/[\u201C\u201D\u2018\u2019]/.test(src)) {
      src = src.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      fixes.push('Đã chuẩn hóa dấu ngoặc kép thông minh (smart quotes).');
    }

    // 3. Strip // line comments and /* */ block comments safely outside string literals
    let noComments = '';
    let inStr = false;
    let escaped = false;
    let strippedComment = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      const nx = src[i + 1];
      if (inStr) {
        noComments += ch;
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inStr = false;
        }
        continue;
      }
      if (ch === '"') {
        inStr = true;
        noComments += ch;
      } else if (ch === '/' && nx === '/') {
        strippedComment = true;
        i += 2;
        while (i < src.length && src[i] !== '\n' && src[i] !== '\r') i++;
        if (i < src.length) noComments += src[i];
      } else if (ch === '/' && nx === '*') {
        strippedComment = true;
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i++; // skip '/'
      } else {
        noComments += ch;
      }
    }
    if (strippedComment) fixes.push('Đã xóa chú thích JS (//, /* */) trong JSON.');
    src = noComments.trim();

    // 4. Quote unquoted math expressions in JSON numeric value positions (e.g. "x": sqrt(3)/2, "y": -3/2)
    const beforeQuoteMath = src;
    src = src.replace(
      /(:\s*)(-?(?:sqrt|sin|cos|tan|pi|\d+\s*[*\/^]\s*)(?:[a-zA-Z0-9_().+\-*\/^\s]*))(?=\s*[,}\]])/gi,
      (full, prefix, expr) => {
        const trimmed = expr.trim();
        if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return full;
        if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') return full;
        return `${prefix}"${trimmed.replace(/"/g, '')}"`;
      }
    );
    if (src !== beforeQuoteMath) {
      fixes.push('Đã bọc chuỗi biểu thức toán học trần trong JSON để phân tích an toàn.');
    }

    // 5. Strip trailing commas before } or ] outside strings
    const stripTrailingCommasOutsideStrings = (input) => {
      let out = '';
      let inside = false;
      let esc = false;
      let changed = false;
      for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if (inside) {
          out += c;
          if (esc) esc = false;
          else if (c === '\\') esc = true;
          else if (c === '"') inside = false;
          continue;
        }
        if (c === '"') {
          inside = true;
          out += c;
          continue;
        }
        if (c === ',') {
          let j = i + 1;
          while (j < input.length && /\s/.test(input[j])) j++;
          if (j < input.length && (input[j] === '}' || input[j] === ']')) {
            changed = true;
            continue;
          }
        }
        out += c;
      }
      return { out, changed };
    };

    let pass = stripTrailingCommasOutsideStrings(src);
    if (pass.changed) {
      fixes.push('Đã xóa dấu phẩy thừa (trailing comma) cuối mảng/đối tượng.');
      src = pass.out;
    }

    return { cleaned: src, fixes };
  }

  function extractJsonObject(rawText, outFixes) {
    const text = String(rawText || '').trim();
    if (!text) throw new Error('AI không trả về dữ liệu.');

    const { cleaned, fixes } = sanitizeLlmJsonText(text);
    if (Array.isArray(outFixes) && fixes.length) outFixes.push(...fixes);

    const tryParse = (candidate) => {
      try {
        return JSON.parse(candidate);
      } catch {
        const noTrail = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(noTrail);
      }
    };

    try {
      return tryParse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBrace >= 0 && lastBrace > firstBrace && (firstBracket < 0 || firstBrace < firstBracket)) {
        return tryParse(cleaned.slice(firstBrace, lastBrace + 1));
      }
      if (firstBracket >= 0 && lastBracket > firstBracket) {
        return tryParse(cleaned.slice(firstBracket, lastBracket + 1));
      }
      throw new Error('Không phân tích được JSON cấu trúc dựng hình từ dữ liệu đầu vào.');
    }
  }

  // ==========================================================================
  // 1. TIKZ & GENERAL GEOMETRY CONSTRAINT REFINER (__mnRefineTikzConstraints)
  // ==========================================================================
  function dist2D(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function pointSegProj(p, a, b) {
    if (!p || !a || !b) return null;
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

    const adjDirs = new Map();
    const rawSegKeys = new Set();
    const carriers = [];
    const carrierKeys = new Set();
    const linesAndRays = [];
    const circles = [];
    const rightAngles = [];

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
          const dot = d1.ux * d2.ux + d1.uy * d2.uy;
          if (dot > -0.996) continue;
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

    const remFree = ptList.filter(p => p.def && p.def.t === 'free' && coords.get(p.id));
    for (const pt of remFree) {
      const pc = coords.get(pt.id);
      if (!pc) continue;
      const deg = dirBuckets(pt.id);

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

    for (const pt of ptList) {
      const t = pt.def && pt.def.t;
      if (t === 'free') stats.free++;
      else if (t === 'mid') stats.mid++;
      else if (t === 'on') { if (pt.def.seg) stats.onSeg++; else stats.onLine++; }
      else if (t === 'inter') stats.inter++;
      else if (t === 'foot') stats.foot++;
      else if (t === 'path' || t === 'rot') stats.circle++;
    }

    const verifyMap = Object.fromEntries(ptList.map(p => [p.id, p]));
    const postCoords = K.Tt({ points: verifyMap, shapes });
    for (const pt of ptList) {
      if (!postCoords.get(pt.id) && coords.get(pt.id)) {
        const orig = coords.get(pt.id);
        pt.def = { t: 'free', x: orig.x, y: orig.y };
      }
    }

    void idGen;
    if (isArrayPts) {
      return { ...fig, points: ptList, shapes, constraintStats: stats };
    }
    return { ...fig, points: Object.fromEntries(ptList.map(p => [p.id, p])), shapes, constraintStats: stats };
  }

  if (hasWindow) {
    window.__mnRefineTikzConstraints = refineTikzConstraints;
  }

  // ==========================================================================
  // 2. AI GEOMETRY VALIDATOR & AUTO-HEALER (validateAndHealAiGeoPlan)
  // ==========================================================================
  const POINT_PRODUCING_OPS = new Set([
    'point_free',
    'point_sum',
    'midpoint',
    'point_on_segment',
    'ratio_point',
    'point_on_line',
    'foot_perp',
    'line_parallel',
    'point_parallel',
    'line_perp',
    'point_perp',
    'point_on_circle',
    'intersection_ll',
    'intersection_lc',
    'intersection_cc',
    'tangent_point'
  ]);

  const VALID_STEP_EFFECTS = new Set([
    'draw', 'chalk', 'chalk_dust', 'glow', 'pop', 'pulse', 'fade', 'wipe', 'stamp',
    'spring', 'zoom', 'slide', 'laser_scan', 'center_out', 'draw_then_fill',
    'arrow_slide', 'measure_brace', 'fourier_epicycles', 'morph_bezier',
    'mirror_flip', 'extrude_rise', 'xray_hidden', 'typewriter', 'graph_trace',
    'mention_glow', 'chalk_box', 'double_underline', 'target_reticle',
    'water_ripple', 'starburst', 'checkmark_stamp', 'cross_strike', 'wiggle_alert'
  ]);

  const VALID_STEP_EASINGS = new Set([
    'linear', 'easeOut', 'easeIn', 'easeInOut', 'spring',
    'smoothstep', 'smootherstep', 'bump', 'thereback'
  ]);

  const OP_NAME_ALIASES = {
    free_point: 'point_free',
    point: 'point_free',
    sum_point: 'point_sum',
    parallelogram_point: 'point_sum',
    vector_sum: 'point_sum',
    mid: 'midpoint',
    mid_point: 'midpoint',
    on_segment: 'point_on_segment',
    segment_point: 'point_on_segment',
    ratio_point: 'point_on_segment',
    on_line: 'point_on_line',
    line_point: 'point_on_line',
    foot: 'foot_perp',
    perp_foot: 'foot_perp',
    projection: 'foot_perp',
    parallel: 'line_parallel',
    parallel_line: 'line_parallel',
    perpendicular: 'line_perp',
    perp_line: 'line_perp',
    inter_ll: 'intersection_ll',
    intersect_ll: 'intersection_ll',
    line_intersection: 'intersection_ll',
    inter_lc: 'intersection_lc',
    intersect_lc: 'intersection_lc',
    inter_cc: 'intersection_cc',
    intersect_cc: 'intersection_cc',
    circle_intersection: 'intersection_cc',
    polygon: 'connect_polygon',
    fill_polygon: 'polygon_fill',
    right: 'right_angle',
    perp_mark: 'right_angle',
    angle: 'angle_mark',
    tick: 'tick_mark'
  };

  function cleanRef(v) {
    return v == null ? '' : String(v).trim();
  }

  function normalizeOpMotionProps(op) {
    if (!op || typeof op !== 'object') return;
    if (op.effect !== undefined) {
      const fx = String(op.effect || '').trim();
      if (VALID_STEP_EFFECTS.has(fx)) op.effect = fx;
      else delete op.effect;
    }
    if (op.easing !== undefined) {
      const ez = String(op.easing || '').trim();
      if (VALID_STEP_EASINGS.has(ez)) op.easing = ez;
      else delete op.easing;
    }
    if (op.durationMul !== undefined) {
      const dm = parseMathNumber(op.durationMul, NaN);
      if (Number.isFinite(dm)) op.durationMul = Math.max(0.2, Math.min(5, Number(dm.toFixed(2))));
      else delete op.durationMul;
    }
    if (op.delayMs !== undefined) {
      const dl = parseMathNumber(op.delayMs, NaN);
      if (Number.isFinite(dl) && dl >= 0) op.delayMs = Math.round(dl);
      else delete op.delayMs;
    }
    if (op.pauseAfter !== undefined) {
      const pa = parseMathNumber(op.pauseAfter, NaN);
      if (Number.isFinite(pa) && pa >= 0) op.pauseAfter = Math.max(0, Math.min(5, Number(pa.toFixed(2))));
      else delete op.pauseAfter;
    }
    if (op.rev !== undefined) op.rev = !!op.rev;
    if (op.tempHide !== undefined) op.tempHide = !!op.tempHide;
    if (op.showGuides !== undefined) op.showGuides = !!op.showGuides;
    if (Array.isArray(op.tRange) && op.tRange.length >= 2) {
      const t0 = parseMathNumber(op.tRange[0], NaN);
      const t1 = parseMathNumber(op.tRange[1], NaN);
      if (Number.isFinite(t0) && Number.isFinite(t1)) {
        const lo = Math.max(0, Math.min(1, Math.min(t0, t1)));
        const hi = Math.max(lo, Math.min(1, Math.max(t0, t1)));
        op.tRange = [Number(lo.toFixed(4)), Number(hi.toFixed(4))];
      } else {
        delete op.tRange;
      }
    }
  }

  function extractMotionMetaFromOp(op, defaultEffect) {
    const m = {};
    if (!op || typeof op !== 'object') return m;
    if (op.effect && VALID_STEP_EFFECTS.has(op.effect)) m.effect = op.effect;
    else if (defaultEffect && VALID_STEP_EFFECTS.has(defaultEffect)) m.effect = defaultEffect;
    if (op.easing && VALID_STEP_EASINGS.has(op.easing)) m.easing = op.easing;
    if (Number.isFinite(op.durationMul)) m.durationMul = op.durationMul;
    if (Number.isFinite(op.delayMs)) m.delayMs = op.delayMs;
    if (Number.isFinite(op.pauseAfter)) m.pauseAfter = op.pauseAfter;
    if (typeof op.rev === 'boolean') m.rev = op.rev;
    if (typeof op.tempHide === 'boolean') m.tempHide = op.tempHide;
    if (typeof op.showGuides === 'boolean') m.showGuides = op.showGuides;
    if (Array.isArray(op.tRange) && op.tRange.length >= 2) m.tRange = op.tRange.slice(0, 2);
    return m;
  }

  function getOpProducedId(op) {
    if (!op || !POINT_PRODUCING_OPS.has(op.op)) return '';
    return cleanRef(op.id || op.label);
  }

  function getOpDependencies(op) {
    if (!op || !op.op) return [];
    const deps = [];
    const push = (v) => {
      const k = cleanRef(v);
      if (k) deps.push(k);
    };
    switch (op.op) {
      case 'point_free':
        break;
      case 'point_sum':
        push(op.a); push(op.b); push(op.c);
        break;
      case 'midpoint':
      case 'point_on_segment':
      case 'ratio_point':
      case 'point_on_line':
      case 'segment':
      case 'line':
      case 'ray':
      case 'tick_mark':
        push(op.a); push(op.b);
        break;
      case 'foot_perp':
        push(op.p); push(op.a); push(op.b);
        break;
      case 'line_parallel':
      case 'point_parallel':
      case 'line_perp':
      case 'point_perp':
        push(op.through || op.o || op.p); push(op.a); push(op.b);
        break;
      case 'circle':
      case 'point_on_circle':
        push(op.center || op.o); push(op.rim || op.r);
        break;
      case 'tangent_point':
        push(op.p || op.from || op.a); push(op.center || op.o); push(op.rim || op.r);
        break;
      case 'intersection_ll': {
        const l1 = Array.isArray(op.l1) ? op.l1 : [op.a1, op.b1];
        const l2 = Array.isArray(op.l2) ? op.l2 : [op.a2, op.b2];
        if (l1) { push(l1[0]); push(l1[1]); }
        if (l2) { push(l2[0]); push(l2[1]); }
        break;
      }
      case 'intersection_lc': {
        const c1 = op.c1 || op.circle1;
        const c2 = op.c2 || op.circle2;
        if (Array.isArray(c1) && Array.isArray(c2)) {
          push(c1[0]); push(c1[1]); push(c2[0]); push(c2[1]);
        } else {
          const ln = Array.isArray(op.line) ? op.line : op.l1;
          const cir = Array.isArray(op.circle) ? op.circle : op.l2;
          if (ln) { push(ln[0]); push(ln[1]); }
          if (cir) { push(cir[0]); push(cir[1]); }
        }
        break;
      }
      case 'intersection_cc': {
        const c1 = Array.isArray(op.c1) ? op.c1 : (Array.isArray(op.circle1) ? op.circle1 : op.l1);
        const c2 = Array.isArray(op.c2) ? op.c2 : (Array.isArray(op.circle2) ? op.circle2 : op.l2);
        if (c1) { push(c1[0]); push(c1[1]); }
        if (c2) { push(c2[0]); push(c2[1]); }
        break;
      }
      case 'polygon_base':
      case 'connect_polygon':
      case 'section':
      case 'polygon_fill':
        if (Array.isArray(op.pts)) op.pts.forEach(push);
        break;
      case 'right_angle':
        if (Array.isArray(op.pts) && op.pts.length >= 3) {
          push(op.pts[0]); push(op.pts[1]); push(op.pts[2]);
        } else {
          push(op.a);
          push(op.v || op.vertex || op.b);
          push((op.v || op.vertex) ? (op.b || op.c) : op.c);
        }
        break;
      case 'angle_mark':
        push(op.a); push(op.v || op.vertex || op.b); push((op.v || op.vertex) ? (op.b || op.c) : op.c);
        break;
    }
    return deps;
  }

  // Pure 2D Math-Space Coordinate Simulator (+x right, +y UP)
  function simulatePlanCoords(ops) {
    const coords = new Map();
    const get = (sym) => {
      const k = cleanRef(sym);
      return k && coords.has(k) ? coords.get(k) : null;
    };

    for (const op of ops) {
      if (!op || !op.op) continue;
      const pid = getOpProducedId(op);
      if (!pid) continue;

      let pt = null;
      switch (op.op) {
        case 'point_free': {
          const x = Number(op.x ?? 0);
          const y = Number(op.y ?? 0);
          if (Number.isFinite(x) && Number.isFinite(y)) pt = { x, y };
          break;
        }
        case 'point_sum': {
          const a = get(op.a), b = get(op.b), c = get(op.c);
          if (a && b && c) pt = { x: a.x + b.x - c.x, y: a.y + b.y - c.y };
          break;
        }
        case 'midpoint': {
          const a = get(op.a), b = get(op.b);
          if (a && b) pt = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
          break;
        }
        case 'point_on_segment':
        case 'ratio_point':
        case 'point_on_line': {
          const a = get(op.a), b = get(op.b);
          const k = Number.isFinite(Number(op.ratio ?? op.k)) ? Number(op.ratio ?? op.k) : (op.op === 'point_on_line' ? 1.3 : 0.38);
          if (a && b) pt = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
          break;
        }
        case 'foot_perp': {
          const p = get(op.p), a = get(op.a), b = get(op.b);
          if (p && a && b) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 1e-10) {
              const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2;
              pt = { x: a.x + t * dx, y: a.y + t * dy };
            } else {
              pt = { x: a.x, y: a.y };
            }
          }
          break;
        }
        case 'line_parallel':
        case 'point_parallel':
        case 'line_perp':
        case 'point_perp': {
          const o = get(op.through || op.o || op.p);
          const a = get(op.a), b = get(op.b);
          const isPerp = op.op === 'line_perp' || op.op === 'point_perp' || !!op.perp;
          const k = Number.isFinite(Number(op.k)) ? Number(op.k) : 1;
          if (o && a && b) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const vx = isPerp ? -dy : dx;
            const vy = isPerp ? dx : dy;
            pt = { x: o.x + k * vx, y: o.y + k * vy };
          }
          break;
        }
        case 'point_on_circle': {
          const o = get(op.center || op.o), r = get(op.rim || op.r);
          if (o && r) {
            const rad = dist2D(o, r);
            const deg = Number.isFinite(Number(op.angleDeg ?? op.angle)) ? Number(op.angleDeg ?? op.angle) : 60;
            const th = (deg * Math.PI) / 180;
            pt = { x: o.x + rad * Math.cos(th), y: o.y + rad * Math.sin(th) };
          }
          break;
        }
        case 'intersection_ll': {
          const l1 = Array.isArray(op.l1) ? op.l1 : [op.a1, op.b1];
          const l2 = Array.isArray(op.l2) ? op.l2 : [op.a2, op.b2];
          const a1 = get(l1 && l1[0]), a2 = get(l1 && l1[1]);
          const b1 = get(l2 && l2[0]), b2 = get(l2 && l2[1]);
          if (a1 && a2 && b1 && b2) {
            const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
            const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
            const det = dx1 * dy2 - dy1 * dx2;
            if (Math.abs(det) >= 1e-5) {
              const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / det;
              pt = { x: a1.x + t * dx1, y: a1.y + t * dy1 };
            }
          }
          break;
        }
        case 'intersection_lc': {
          const ln = Array.isArray(op.line) ? op.line : op.l1;
          const cir = Array.isArray(op.circle) ? op.circle : op.l2;
          const a = get(ln && ln[0]), b = get(ln && ln[1]);
          const c = get(cir && cir[0]), rPt = get(cir && cir[1]);
          if (a && b && c && rPt) {
            const rad = dist2D(c, rPt);
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 1e-10 && rad > 1e-8) {
              const fx = a.x - c.x, fy = a.y - c.y;
              const B = 2 * (fx * dx + fy * dy);
              const C = fx * fx + fy * fy - rad * rad;
              const disc = B * B - 4 * d2 * C;
              if (disc >= -1e-5) {
                const s = Math.sqrt(Math.max(0, disc));
                const t1 = (-B - s) / (2 * d2);
                const t2 = (-B + s) / (2 * d2);
                const which = Number(op.which) ? 1 : 0;
                const t = which === 1 ? t2 : t1;
                pt = { x: a.x + t * dx, y: a.y + t * dy };
              }
            }
          }
          break;
        }
        case 'intersection_cc':
        case 'tangent_point': {
          let p1, p2, p3, p4;
          if (op.op === 'tangent_point') {
            const ext = get(op.p || op.from || op.a);
            const o = get(op.center || op.o);
            const r = get(op.rim || op.r);
            if (ext && o && r) {
              p1 = { x: (ext.x + o.x) * 0.5, y: (ext.y + o.y) * 0.5 };
              p2 = o;
              p3 = o;
              p4 = r;
            }
          } else {
            const c1 = Array.isArray(op.c1) ? op.c1 : (Array.isArray(op.circle1) ? op.circle1 : op.l1);
            const c2 = Array.isArray(op.c2) ? op.c2 : (Array.isArray(op.circle2) ? op.circle2 : op.l2);
            p1 = get(c1 && c1[0]); p2 = get(c1 && c1[1]);
            p3 = get(c2 && c2[0]); p4 = get(c2 && c2[1]);
          }
          if (p1 && p2 && p3 && p4) {
            // Match screen-space y-flipped convention (y_scr = -y_math) of Kernel K.Tt
            const r1 = dist2D(p1, p2), r2 = dist2D(p3, p4);
            const dx = p3.x - p1.x, dyS = (-p3.y) - (-p1.y);
            const d = Math.hypot(dx, dyS);
            if (d > 1e-8 && d <= r1 + r2 + 1e-4 && d >= Math.abs(r1 - r2) - 1e-4) {
              const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
              const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
              const xm = p1.x + (a * dx) / d;
              const ymS = (-p1.y) + (a * dyS) / d;
              const which = Number(op.which) ? 1 : 0;
              const px = which === 0 ? xm + (h * dyS) / d : xm - (h * dyS) / d;
              const pyS = which === 0 ? ymS - (h * dx) / d : ymS + (h * dx) / d;
              pt = { x: px, y: -pyS };
            }
          }
          break;
        }
      }

      if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
        coords.set(pid, pt);
      }
    }
    return coords;
  }

  function isQuadStrictlyConvex(p0, p1, p2, p3, eps = 1e-4) {
    if (!p0 || !p1 || !p2 || !p3) return false;
    const pts = [p0, p1, p2, p3];
    let pos = 0, neg = 0;
    for (let i = 0; i < 4; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 4];
      const c = pts[(i + 2) % 4];
      const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (cr > eps) pos++;
      else if (cr < -eps) neg++;
      else return false;
    }
    return pos === 4 || neg === 4;
  }

  function angleDegAtVertex(v, a, b) {
    if (!v || !a || !b) return NaN;
    const dx1 = a.x - v.x, dy1 = a.y - v.y;
    const dx2 = b.x - v.x, dy2 = b.y - v.y;
    const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
    if (l1 < 1e-7 || l2 < 1e-7) return NaN;
    const cosT = Math.max(-1, Math.min(1, (dx1 * dx2 + dy1 * dy2) / (l1 * l2)));
    return (Math.acos(cosT) * 180) / Math.PI;
  }

  // Lift 3D synthetic pyramid/prism vertices into R^3 to detect true skew lines
  function build3DLiftedCoords(ops, coords2D) {
    const map3 = new Map();
    const ptDefs = ops.filter(op => op && POINT_PRODUCING_OPS.has(op.op));
    const freeOrSumIds = ptDefs
      .filter(op => op.op === 'point_free' || op.op === 'point_sum')
      .map(op => getOpProducedId(op))
      .filter(Boolean);

    // Identify apex 'S' or top-prism vertices (A', B', C', D', A1, B1, C1, D1)
    const elevatedIds = new Set();
    for (const id of freeOrSumIds) {
      if (id === 'S' || /['1]$/.test(id)) elevatedIds.add(id);
    }
    if (!elevatedIds.size && freeOrSumIds.length >= 4) {
      // Pick highest-y free vertex as elevated apex
      let bestId = '';
      let bestY = -Infinity;
      for (const id of freeOrSumIds) {
        const c = coords2D.get(id);
        if (c && c.y > bestY) { bestY = c.y; bestId = id; }
      }
      if (bestId) elevatedIds.add(bestId);
    }

    const get3 = (sym) => {
      const k = cleanRef(sym);
      return k && map3.has(k) ? map3.get(k) : null;
    };

    for (const op of ops) {
      if (!op || !POINT_PRODUCING_OPS.has(op.op)) continue;
      const pid = getOpProducedId(op);
      const c2 = coords2D.get(pid);
      if (!pid || !c2) continue;

      if (op.op === 'point_free') {
        const z = elevatedIds.has(pid) ? 4.0 : 0.0;
        map3.set(pid, { x: c2.x, y: c2.y, z });
      } else if (op.op === 'point_sum') {
        const a = get3(op.a), b = get3(op.b), c = get3(op.c);
        if (a && b && c) {
          map3.set(pid, { x: a.x + b.x - c.x, y: a.y + b.y - c.y, z: a.z + b.z - c.z });
        } else {
          map3.set(pid, { x: c2.x, y: c2.y, z: elevatedIds.has(pid) ? 4.0 : 0.0 });
        }
      } else if (op.op === 'midpoint') {
        const a = get3(op.a), b = get3(op.b);
        if (a && b) map3.set(pid, { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5, z: (a.z + b.z) * 0.5 });
      } else if (op.op === 'point_on_segment' || op.op === 'ratio_point' || op.op === 'point_on_line') {
        const a = get3(op.a), b = get3(op.b);
        const k = Number.isFinite(Number(op.ratio ?? op.k)) ? Number(op.ratio ?? op.k) : 0.38;
        if (a && b) map3.set(pid, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
      } else if (op.op === 'foot_perp') {
        const a = get3(op.a), b = get3(op.b);
        const a2 = coords2D.get(cleanRef(op.a)), b2 = coords2D.get(cleanRef(op.b));
        if (a && b && a2 && b2) {
          const dx = b2.x - a2.x, dy = b2.y - a2.y;
          const d2 = dx * dx + dy * dy;
          const t = d2 > 1e-10 ? ((c2.x - a2.x) * dx + (c2.y - a2.y) * dy) / d2 : 0.5;
          map3.set(pid, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
        }
      } else if (op.op === 'line_parallel' || op.op === 'point_parallel') {
        const o = get3(op.through || op.o || op.p);
        const a = get3(op.a), b = get3(op.b);
        const k = Number.isFinite(Number(op.k)) ? Number(op.k) : 1;
        if (o && a && b) {
          map3.set(pid, { x: o.x + k * (b.x - a.x), y: o.y + k * (b.y - a.y), z: o.z + k * (b.z - a.z) });
        }
      } else if (op.op === 'intersection_ll') {
        const l1 = Array.isArray(op.l1) ? op.l1 : [op.a1, op.b1];
        const l2 = Array.isArray(op.l2) ? op.l2 : [op.a2, op.b2];
        const u1 = get3(l1 && l1[0]), u2 = get3(l1 && l1[1]);
        const v1 = get3(l2 && l2[0]), v2 = get3(l2 && l2[1]);
        if (u1 && u2 && v1 && v2) {
          const d1x = u2.x - u1.x, d1y = u2.y - u1.y;
          const d2x = v2.x - v1.x, d2y = v2.y - v1.y;
          const det = d1x * d2y - d1y * d2x;
          if (Math.abs(det) >= 1e-5) {
            const t = ((v1.x - u1.x) * d2y - (v1.y - u1.y) * d2x) / det;
            map3.set(pid, {
              x: u1.x + t * (u2.x - u1.x),
              y: u1.y + t * (u2.y - u1.y),
              z: u1.z + t * (u2.z - u1.z)
            });
          }
        }
      }
    }
    return { map3, elevatedIds };
  }

  function computeSkewDistance3D(u1, u2, v1, v2) {
    if (!u1 || !u2 || !v1 || !v2) return 0;
    const d1 = { x: u2.x - u1.x, y: u2.y - u1.y, z: u2.z - u1.z };
    const d2 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const nx = d1.y * d2.z - d1.z * d2.y;
    const ny = d1.z * d2.x - d1.x * d2.z;
    const nz = d1.x * d2.y - d1.y * d2.x;
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-7) return 0;
    const wx = v1.x - u1.x, wy = v1.y - u1.y, wz = v1.z - u1.z;
    return Math.abs(wx * nx + wy * ny + wz * nz) / nLen;
  }

  function convertGeometryBlockToOps(geoBlock) {
    const out = [];
    if (!geoBlock || typeof geoBlock !== 'object') return out;
    const ptsList = Array.isArray(geoBlock.points)
      ? geoBlock.points
      : (geoBlock.points && typeof geoBlock.points === 'object' ? Object.values(geoBlock.points) : []);
    const idToSym = new Map();
    for (const p of ptsList) {
      if (!p) continue;
      const sym = cleanRef(p.label || p.id);
      if (p.id && sym) idToSym.set(p.id, sym);
    }
    const symOf = (id) => idToSym.get(id) || cleanRef(id);

    for (const p of ptsList) {
      if (!p || !p.def) continue;
      const sym = symOf(p.id || p.label);
      if (!sym) continue;
      const d = p.def;
      if (d.t === 'free') {
        const rawX = Number.isFinite(Number(p.nx)) ? Number(p.nx) : Number(d.x ?? 0);
        const rawY = Number.isFinite(Number(p.ny)) ? Number(p.ny) : -Number(d.y ?? 0);
        out.push({ op: 'point_free', id: sym, label: p.label || sym, x: rawX, y: rawY, show: p.show !== false });
      } else if (d.t === 'sum') {
        out.push({ op: 'point_sum', id: sym, label: p.label || sym, a: symOf(d.a), b: symOf(d.b), c: symOf(d.c), show: p.show !== false });
      } else if (d.t === 'mid') {
        out.push({ op: 'midpoint', id: sym, label: p.label || sym, a: symOf(d.a), b: symOf(d.b), show: p.show !== false });
      } else if (d.t === 'on') {
        out.push({ op: d.seg ? 'point_on_segment' : 'point_on_line', id: sym, label: p.label || sym, a: symOf(d.a), b: symOf(d.b), ratio: Number(d.k ?? 0.38), show: p.show !== false });
      } else if (d.t === 'foot') {
        out.push({ op: 'foot_perp', id: sym, label: p.label || sym, p: symOf(d.p), a: symOf(d.a), b: symOf(d.b), drawDropSegment: false, markRightAngle: false, show: p.show !== false });
      } else if (d.t === 'vec') {
        out.push({ op: d.perp ? 'line_perp' : 'line_parallel', id: sym, label: p.label || sym, through: symOf(d.o), a: symOf(d.a), b: symOf(d.b), k: Number(d.k ?? 1), drawSegment: false, show: p.show !== false, noDot: !!p.noDot });
      } else if (d.t === 'inter' && Array.isArray(d.l1) && Array.isArray(d.l2)) {
        if (d.c1 && d.c2) {
          out.push({ op: 'intersection_cc', id: sym, label: p.label || sym, c1: [symOf(d.l1[0]), symOf(d.l1[1])], c2: [symOf(d.l2[0]), symOf(d.l2[1])], which: Number(d.which) || 0, show: p.show !== false });
        } else if (!d.c1 && d.c2) {
          out.push({ op: 'intersection_lc', id: sym, label: p.label || sym, line: [symOf(d.l1[0]), symOf(d.l1[1])], circle: [symOf(d.l2[0]), symOf(d.l2[1])], which: Number(d.which) || 0, show: p.show !== false });
        } else if (d.c1 && !d.c2) {
          out.push({ op: 'intersection_lc', id: sym, label: p.label || sym, line: [symOf(d.l2[0]), symOf(d.l2[1])], circle: [symOf(d.l1[0]), symOf(d.l1[1])], which: Number(d.which) || 0, show: p.show !== false });
        } else {
          out.push({ op: 'intersection_ll', id: sym, label: p.label || sym, l1: [symOf(d.l1[0]), symOf(d.l1[1])], l2: [symOf(d.l2[0]), symOf(d.l2[1])], which: Number(d.which) || 0, show: p.show !== false });
        }
      } else if (d.t === 'path' && Array.isArray(d.pts) && d.pts.length >= 2) {
        const deg = -Number(d.k || 0) * 360;
        out.push({ op: 'point_on_circle', id: sym, label: p.label || sym, center: symOf(d.pts[0]), rim: symOf(d.pts[1]), angleDeg: deg, show: p.show !== false });
      }
    }

    for (const sh of (Array.isArray(geoBlock.shapes) ? geoBlock.shapes : [])) {
      if (!sh || sh.hidden || !Array.isArray(sh.pts)) continue;
      const sPts = sh.pts.map(symOf);
      if (sh.kind === 'segment' && sPts.length >= 2) {
        out.push({ op: 'segment', a: sPts[0], b: sPts[1], dashed: !!sh.dashed, aux: !!sh.aux });
      } else if ((sh.kind === 'line' || sh.kind === 'ray') && sPts.length >= 2) {
        out.push({ op: sh.kind, a: sPts[0], b: sPts[1], dashed: !!sh.dashed, aux: !!sh.aux });
      } else if (sh.kind === 'circle' && sPts.length >= 2) {
        out.push({ op: 'circle', center: sPts[0], rim: sPts[1], dashed: !!sh.dashed, aux: !!sh.aux });
      } else if (sh.kind === 'polygon' && sPts.length >= 3) {
        if (sh.width === 0 && sh.fill) out.push({ op: 'polygon_fill', pts: sPts, fill: sh.fill });
        else out.push({ op: 'connect_polygon', pts: sPts, fill: sh.fill || undefined });
      } else if (sh.kind === 'right' && sPts.length >= 3) {
        out.push({ op: 'right_angle', a: sPts[0], v: sPts[1], b: sPts[2], aux: true });
      } else if (sh.kind === 'angle' && sPts.length >= 3) {
        out.push({ op: 'angle_mark', a: sPts[0], v: sPts[1], b: sPts[2], n: sh.n || 1, aux: true });
      } else if (sh.kind === 'tick' && sPts.length >= 2) {
        out.push({ op: 'tick_mark', a: sPts[0], b: sPts[1], n: sh.n || 1, aux: true });
      }
    }
    return out;
  }

  function validateAndHealAiGeoPlan(planInput, opts = {}) {
    const fixes = [];
    const warnings = [];

    let rawPlan = planInput;
    if (typeof rawPlan === 'string') {
      rawPlan = extractJsonObject(rawPlan, fixes);
    }
    if (Array.isArray(rawPlan)) {
      rawPlan = { ops: rawPlan };
    }
    if (!rawPlan || typeof rawPlan !== 'object') {
      throw new Error('Kịch bản hình học không hợp lệ (cần đối tượng JSON hoặc chuỗi JSON).');
    }

    // Fast Idempotency / Clone
    const plan = JSON.parse(JSON.stringify(rawPlan));
    let rawOps = Array.isArray(plan.ops)
      ? plan.ops
      : (Array.isArray(plan.constructions)
        ? plan.constructions
        : (Array.isArray(plan.steps) && plan.steps.some(s => s && s.op)
          ? plan.steps
          : (plan.geometry ? convertGeometryBlockToOps(plan.geometry) : [])));

    if (!rawOps.length) {
      throw new Error('Kịch bản AI không chứa thao tác dựng hình (ops) nào.');
    }

    const planTitle = String(plan.title || (plan.meta && plan.meta.title) || '').trim();
    const allContextText = [
      planTitle,
      String((plan.meta && plan.meta.problem) || ''),
      ...rawOps.map(o => String((o && (o.step || o.note)) || ''))
    ].join(' ');

    // ------------------------------------------------------------------------
    // PASS 1: Op Alias Normalization & Safe Math Expression Evaluation
    // ------------------------------------------------------------------------
    let ops = [];
    for (const item of rawOps) {
      if (!item || typeof item !== 'object') continue;
      const op = { ...item };
      const rawName = String(op.op || op.type || '').trim();
      if (!rawName) continue;
      const lower = rawName.toLowerCase();
      if (OP_NAME_ALIASES[lower]) {
        if (lower === 'point' && op.x === undefined && op.y === undefined) {
          continue;
        }
        op.op = OP_NAME_ALIASES[lower];
      } else if (lower === 'intersection') {
        op.op = (op.c1 && op.c2) || (op.circle1 && op.circle2)
          ? 'intersection_cc'
          : ((op.circle || op.c2) ? 'intersection_lc' : 'intersection_ll');
      } else {
        op.op = lower;
      }

      // Evaluate math expressions in numeric fields safely
      const evalNumField = (field, fallbackVal) => {
        if (op[field] === undefined || op[field] === null || op[field] === '') return;
        const wasStr = typeof op[field] === 'string';
        const val = parseMathNumber(op[field], NaN);
        if (Number.isFinite(val)) {
          const rounded = Math.abs(val) < 1e-12 ? 0 : Number(val.toFixed(6));
          if (wasStr && !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(String(op[field]).trim())) {
            fixes.push(`Đã tính giá trị biểu thức số "${op[field]}" -> ${rounded} cho trường "${field}".`);
          }
          op[field] = rounded;
        } else if (fallbackVal !== undefined) {
          warnings.push(`Giá trị "${op[field]}" ở trường "${field}" không hợp lệ; đã đặt mặc định ${fallbackVal}.`);
          fixes.push(`Đã thay giá trị lỗi ở "${field}" bằng ${fallbackVal}.`);
          op[field] = fallbackVal;
        } else {
          delete op[field];
        }
      };

      if (op.op === 'point_free') {
        // Handle accidental 3D Cartesian (x, y, z) projection if AI emitted z
        if (op.z !== undefined) {
          const x3 = parseMathNumber(op.x ?? 0, 0);
          const y3 = parseMathNumber(op.y ?? 0, 0);
          const z3 = parseMathNumber(op.z ?? 0, 0);
          op.x = Number((y3 - 0.45 * x3).toFixed(4));
          op.y = Number((z3 - 0.38 * x3).toFixed(4));
          delete op.z;
          fixes.push(`Đã chiếu tọa độ không gian (x,y,z) của đỉnh ${op.id || op.label || ''} về mặt phẳng biểu diễn 2D.`);
        } else {
          evalNumField('x', 0);
          evalNumField('y', 0);
        }
      }
      evalNumField('ratio');
      evalNumField('k');
      evalNumField('angleDeg');
      evalNumField('angle');
      evalNumField('which');
      evalNumField('n');
      evalNumField('width');

      normalizeOpMotionProps(op);

      if (POINT_PRODUCING_OPS.has(op.op)) {
        const idStr = cleanRef(op.id || op.label);
        if (!idStr && op.op !== 'line_parallel' && op.op !== 'line_perp') {
          warnings.push(`Bỏ qua thao tác "${op.op}" thiếu định danh điểm (id).`);
          continue;
        }
        if (idStr) {
          op.id = idStr;
          if (op.label === undefined) op.label = idStr;
          else op.label = String(op.label).trim();
        }
      }

      // Normalize intersection_lc -> intersection_cc if 2 circles were supplied
      if (op.op === 'intersection_lc' && ((Array.isArray(op.c1) && Array.isArray(op.c2)) || (Array.isArray(op.circle1) && Array.isArray(op.circle2)))) {
        op.op = 'intersection_cc';
        op.c1 = op.c1 || op.circle1;
        op.c2 = op.c2 || op.circle2;
        fixes.push(`Đã chuyển giao điểm ${op.id || ''} từ intersection_lc sang intersection_cc (giao 2 đường tròn).`);
      }

      ops.push(op);
    }

    // ------------------------------------------------------------------------
    // PASS 2: Duplicate Point IDs / Labels Deduplication & Upgrade
    // ------------------------------------------------------------------------
    const seenPointIdx = new Map(); // id -> index in dedupedOps
    const dedupedOps = [];
    for (const op of ops) {
      const pid = getOpProducedId(op);
      if (!pid) {
        dedupedOps.push(op);
        continue;
      }
      if (!seenPointIdx.has(pid)) {
        seenPointIdx.set(pid, dedupedOps.length);
        dedupedOps.push(op);
        continue;
      }
      const prevIdx = seenPointIdx.get(pid);
      const prevOp = dedupedOps[prevIdx];
      // Case A: Previous was point_free, new one is a true geometric constraint -> upgrade!
      if (prevOp.op === 'point_free' && op.op !== 'point_free') {
        const deps = getOpDependencies(op);
        if (!deps.includes(pid)) {
          dedupedOps[prevIdx] = op;
          fixes.push(`Đã nâng cấp điểm trùng "${pid}" từ tọa độ tự do sang ràng buộc "${op.op}".`);
          continue;
        }
      }
      // Case B: Previous is already constrained and new is point_free or identical -> drop duplicate
      if (op.op === 'point_free' || JSON.stringify({ ...prevOp, step: '' }) === JSON.stringify({ ...op, step: '' })) {
        fixes.push(`Đã loại bỏ khai báo điểm trùng lặp "${pid}".`);
        continue;
      }
      // Case C: Distinct auxiliary point colliding on ID -> disambiguate ID
      let suffix = 2;
      while (seenPointIdx.has(`${pid}_${suffix}`)) suffix++;
      const nextId = `${pid}_${suffix}`;
      op.id = nextId;
      if (op.label === pid) op.label = `${pid}'`;
      seenPointIdx.set(nextId, dedupedOps.length);
      dedupedOps.push(op);
      fixes.push(`Đã đổi mã điểm trùng "${pid}" thành "${nextId}" (${op.label}).`);
    }
    ops = dedupedOps;

    // ------------------------------------------------------------------------
    // PASS 3: Fake-Midpoint Trap (ratio === 0.5) & Segment Ratio Clamping [0.08, 0.92]
    // ------------------------------------------------------------------------
    const usedRatiosByAnchor = new Map(); // anchorPt -> Set of ratios
    for (const op of ops) {
      if (op.op !== 'point_on_segment' && op.op !== 'ratio_point') continue;
      op.op = 'point_on_segment';
      const stepTxt = String(op.step || op.note || '');
      const saysMidpoint = /trung\s*điểm|midpoint|chính\s*giữa/i.test(stepTxt);
      let r = Number.isFinite(op.ratio) ? op.ratio : (Number.isFinite(op.k) ? op.k : 0.38);

      if (saysMidpoint && Math.abs(r - 0.5) < 0.08) {
        op.op = 'midpoint';
        delete op.ratio;
        delete op.k;
        fixes.push(`Đã chuẩn hóa điểm "${op.id}" thành "midpoint" theo mô tả trung điểm.`);
        continue;
      }

      const aKey = cleanRef(op.a), bKey = cleanRef(op.b);
      if (!saysMidpoint && Math.abs(r - 0.5) < 0.025) {
        const usedA = usedRatiosByAnchor.get(aKey) || new Set();
        const usedB = usedRatiosByAnchor.get(bKey) || new Set();
        const cand = (usedA.has(0.38) || usedB.has(0.38)) ? 0.62 : 0.38;
        r = cand;
        fixes.push(`Đã dịch tỷ số điểm tổng quát "${op.id}" trên ${aKey}${bKey} từ 0.5 sang ${cand} (tránh bẫy giả trung điểm gây song song giả).`);
      }

      const clamped = Math.min(0.92, Math.max(0.08, r));
      if (Math.abs(clamped - r) > 1e-6) {
        fixes.push(`Đã kẹp tỷ số point_on_segment của "${op.id}" từ ${r} vào khoảng an toàn [0.08, 0.92] -> ${clamped}.`);
      }
      op.ratio = Number(clamped.toFixed(4));
      if (op.k !== undefined) delete op.k;

      if (aKey) {
        if (!usedRatiosByAnchor.has(aKey)) usedRatiosByAnchor.set(aKey, new Set());
        usedRatiosByAnchor.get(aKey).add(op.ratio);
      }
      if (bKey) {
        if (!usedRatiosByAnchor.has(bKey)) usedRatiosByAnchor.set(bKey, new Set());
        usedRatiosByAnchor.get(bKey).add(op.ratio);
      }
    }

    // ------------------------------------------------------------------------
    // PASS 4: Topological Sort & Cyclic Point Dependency Breaker (A -> B -> A)
    // ------------------------------------------------------------------------
    const producerByPt = new Map();
    ops.forEach((op, idx) => {
      const pid = getOpProducedId(op);
      if (pid) producerByPt.set(pid, idx);
    });

    // Synthesize missing fundamental anchor vertices if referenced but never declared
    const missingAnchors = [];
    const fallbackAnchorCoords = {
      A: [-2.5, 0], B: [-1.2, -1.9], C: [2.0, -1.7], D: [2.8, 0.1],
      S: [-0.3, 3.7], O: [0, 0], R: [2.4, 0]
    };
    const seenMissing = new Set();
    for (const op of ops) {
      for (const dep of getOpDependencies(op)) {
        if (!producerByPt.has(dep) && !seenMissing.has(dep) && Object.prototype.hasOwnProperty.call(fallbackAnchorCoords, dep)) {
          seenMissing.add(dep);
          const [fx, fy] = fallbackAnchorCoords[dep];
          missingAnchors.push({ op: 'point_free', id: dep, label: dep, x: fx, y: fy, step: `Khởi tạo đỉnh gốc ${dep}` });
          fixes.push(`Đã tự động bổ sung đỉnh gốc thiếu "${dep}" (${fx}, ${fy}).`);
        }
      }
    }
    if (missingAnchors.length) {
      ops = [...missingAnchors, ...ops];
      producerByPt.clear();
      ops.forEach((op, idx) => {
        const pid = getOpProducedId(op);
        if (pid) producerByPt.set(pid, idx);
      });
    }

    const nOps = ops.length;
    const adj = Array.from({ length: nOps }, () => new Set());
    const inDeg = new Array(nOps).fill(0);
    let hadForwardRef = false;

    for (let i = 0; i < nOps; i++) {
      const ownId = getOpProducedId(ops[i]);
      for (const dep of getOpDependencies(ops[i])) {
        if (dep === ownId) {
          // Direct self-loop A -> A
          ops[i] = {
            op: 'point_free',
            id: ownId,
            label: ops[i].label || ownId,
            x: Number.isFinite(ops[i].x) ? ops[i].x : (i * 0.7 - 1.5),
            y: Number.isFinite(ops[i].y) ? ops[i].y : ((i % 2) * 1.4 - 0.5),
            show: ops[i].show !== false,
            step: ops[i].step
          };
          fixes.push(`Đã phá tự phụ thuộc vòng lặp (${ownId} -> ${ownId}).`);
          warnings.push(`Phát hiện điểm "${ownId}" tự phụ thuộc chính nó; đã chuyển về điểm gốc tự do.`);
          break;
        }
        const prodIdx = producerByPt.get(dep);
        if (prodIdx !== undefined && prodIdx !== i) {
          if (prodIdx > i) hadForwardRef = true;
          if (!adj[prodIdx].has(i)) {
            adj[prodIdx].add(i);
            inDeg[i]++;
          }
        }
      }
    }

    const sortedOps = [];
    const emitted = new Array(nOps).fill(false);
    let emittedCount = 0;

    while (emittedCount < nOps) {
      // Pick earliest ready op to preserve original pedagogical order whenever valid
      let pick = -1;
      for (let i = 0; i < nOps; i++) {
        if (!emitted[i] && inDeg[i] === 0) {
          pick = i;
          break;
        }
      }
      if (pick === -1) {
        // Cycle detected! Pick the earliest un-emitted point-producing op and break its incoming dependencies
        pick = ops.findIndex((o, idx) => !emitted[idx] && POINT_PRODUCING_OPS.has(o.op));
        if (pick === -1) pick = emitted.findIndex(v => !v);
        const brokenOp = ops[pick];
        const brokenId = getOpProducedId(brokenOp) || `#${pick}`;
        if (POINT_PRODUCING_OPS.has(brokenOp.op)) {
          ops[pick] = {
            op: 'point_free',
            id: brokenId,
            label: brokenOp.label || brokenId,
            x: Number.isFinite(brokenOp.x) ? brokenOp.x : Number((-1.8 + (emittedCount % 5) * 1.1).toFixed(2)),
            y: Number.isFinite(brokenOp.y) ? brokenOp.y : Number(((emittedCount % 3) * 1.1 - 1.0).toFixed(2)),
            show: brokenOp.show !== false,
            step: brokenOp.step || `Điểm ${brokenId}`
          };
        }
        inDeg[pick] = 0;
        fixes.push(`Đã phá vòng lặp phụ thuộc điểm tại "${brokenId}" và sắp xếp lại thứ tự dựng.`);
        warnings.push(`Phát hiện chu trình phụ thuộc điểm qua "${brokenId}"; đã chuyển "${brokenId}" thành điểm tự do an toàn.`);
      }

      emitted[pick] = true;
      emittedCount++;
      sortedOps.push(ops[pick]);
      for (const nxt of adj[pick]) {
        inDeg[nxt] = Math.max(0, inDeg[nxt] - 1);
      }
    }
    if (hadForwardRef) {
      fixes.push('Đã sắp xếp topo các lệnh ops để định nghĩa điểm luôn đứng trước đường/hình tham chiếu.');
    }
    ops = sortedOps;

    // ------------------------------------------------------------------------
    // PASS 5: Detect 2D vs 3D Mode Accurately
    // ------------------------------------------------------------------------
    let is3D;
    if (typeof plan.is3D === 'boolean') {
      is3D = plan.is3D;
    } else if (plan.meta && typeof plan.meta.is3D === 'boolean') {
      is3D = plan.meta.is3D;
    } else {
      const hasCircleOp = ops.some(o => o.op === 'circle' || o.op === 'point_on_circle' || o.op === 'intersection_lc' || o.op === 'intersection_cc' || o.op === 'tangent_point');
      const has3DKeyword = /hình\s*chóp|tứ\s*diện|lăng\s*trụ|hình\s*hộp|mặt\s*phẳng|giao\s*tuyến|thiết\s*diện|S\.[A-Z]{3,4}/i.test(allContextText);
      const hasApexS = ops.some(o => getOpProducedId(o) === 'S') && ops.some(o => o.dashed === true);
      is3D = has3DKeyword || hasApexS || (!hasCircleOp && ops.some(o => o.dashed === true && o.op === 'segment' && !o.aux));
    }
    plan.is3D = is3D;

    const ptOpById = new Map();
    for (const op of ops) {
      const pid = getOpProducedId(op);
      if (pid) ptOpById.set(pid, op);
    }

    // ------------------------------------------------------------------------
    // PASS 6: Inverted 3D Y-Axis Healer (Apex S Placed Below Base ABCD/ABC)
    // ------------------------------------------------------------------------
    let simCoords = simulatePlanCoords(ops);
    if (is3D && ptOpById.has('S')) {
      const sOp = ptOpById.get('S');
      const sCoord = simCoords.get('S');
      const baseIds = [...ptOpById.keys()].filter(id => id !== 'S' && !/['1]$/.test(id) && (ptOpById.get(id).op === 'point_free' || ptOpById.get(id).op === 'point_sum'));
      const baseCoords = baseIds.map(id => simCoords.get(id)).filter(Boolean);

      if (sOp && sOp.op === 'point_free' && sCoord && baseCoords.length >= 3) {
        const ys = baseCoords.map(c => c.y);
        const xs = baseCoords.map(c => c.x);
        const maxBaseY = Math.max(...ys);
        const minBaseY = Math.min(...ys);
        const avgBaseY = ys.reduce((a, b) => a + b, 0) / ys.length;
        const baseSpanX = Math.max(2.0, Math.max(...xs) - Math.min(...xs));

        if (sCoord.y <= maxBaseY + 0.12 * baseSpanX) {
          // Check if entire figure was written in inverted screen coordinates (+y downward: S.y < minBaseY && front B.y > back A.y)
          const aC = simCoords.get('A'), bC = simCoords.get('B');
          if (sCoord.y < minBaseY && aC && bC && bC.y > aC.y + 0.3) {
            for (const id of ['S', ...baseIds]) {
              const pOp = ptOpById.get(id);
              if (pOp && pOp.op === 'point_free' && Number.isFinite(pOp.y)) {
                pOp.y = Number((-pOp.y).toFixed(4));
              }
            }
            fixes.push('Đã đảo trục Y toàn bộ các đỉnh gốc (chuyển từ tọa độ màn hình +y hướng xuống sang tọa độ toán +y hướng lên).');
          } else {
            const targetH = Math.max(Math.abs(sCoord.y - avgBaseY), 0.72 * baseSpanX, 3.2);
            sOp.y = Number((maxBaseY + targetH).toFixed(4));
            fixes.push(`Đã tự động lật đỉnh chóp S lên phía trên mặt đáy (S.y = ${sOp.y}).`);
          }
          simCoords = simulatePlanCoords(ops);
        }
      }
    }

    // ------------------------------------------------------------------------
    // PASS 7: Anti-Bowtie Self-Intersecting 4-Vertex Quadrilateral Base Healer
    // ------------------------------------------------------------------------
    const detectBaseQuadOrder = () => {
      // 1. Explicit 4-vertex polygon_base or connect_polygon of free/sum base vertices
      for (const op of ops) {
        if ((op.op === 'polygon_base' || op.op === 'connect_polygon') && Array.isArray(op.pts) && op.pts.length === 4) {
          const ids = op.pts.map(cleanRef);
          if (ids.every(id => ptOpById.has(id) && id !== 'S' && (ptOpById.get(id).op === 'point_free' || ptOpById.get(id).op === 'point_sum'))) {
            return ids;
          }
        }
      }
      // 2. Standard A, B, C, D base vertices
      const std = ['A', 'B', 'C', 'D'];
      if (std.every(id => ptOpById.has(id) && (ptOpById.get(id).op === 'point_free' || ptOpById.get(id).op === 'point_sum'))) {
        // Verify they don't form a triangle + center by checking either is3D or segment cycle
        const segSet = new Set();
        for (const op of ops) {
          if (op.op === 'segment') {
            const a = cleanRef(op.a), b = cleanRef(op.b);
            segSet.add(`${a}|${b}`); segSet.add(`${b}|${a}`);
          }
        }
        const cycleEdges = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']].filter(([u, v]) => segSet.has(`${u}|${v}`)).length;
        if (cycleEdges >= 3 || /ABCD/.test(allContextText)) return std;
      }
      return null;
    };

    const quadIds = detectBaseQuadOrder();
    const wantsParallelogram = /bình\s*hành|chữ\s*nhật|hình\s*vuông|hình\s*thoi|hình\s*hộp|parallelogram|rectangle|rhombus|square/i.test(allContextText);
    let convexBase = true;

    if (quadIds && quadIds.length === 4) {
      const [q0, q1, q2, q3] = quadIds;
      const op0 = ptOpById.get(q0), op1 = ptOpById.get(q1), op2 = ptOpById.get(q2), op3 = ptOpById.get(q3);

      // Heal wrong point_sum argument order on 3rd or 4th parallelogram vertex first!
      // For convex cycle [q0, q1, q2, q3] (A, B, C, D): q2 = q1 + q3 - q0 (C = B + D - A), q3 = q0 + q2 - q1 (D = A + C - B)
      if (op2 && op2.op === 'point_sum') {
        const sumSet = new Set([cleanRef(op2.a), cleanRef(op2.b), cleanRef(op2.c)]);
        if (sumSet.has(q0) && sumSet.has(q1) && sumSet.has(q3) && cleanRef(op2.c) !== q0) {
          op2.a = q1; op2.b = q3; op2.c = q0;
          simCoords = simulatePlanCoords(ops);
          fixes.push(`Đã sửa công thức point_sum của đỉnh "${q2}" thành ${q1} + ${q3} - ${q0} (chống chéo hình nơ hình bình hành).`);
        }
      } else if (op3 && op3.op === 'point_sum') {
        const sumSet = new Set([cleanRef(op3.a), cleanRef(op3.b), cleanRef(op3.c)]);
        if (sumSet.has(q0) && sumSet.has(q1) && sumSet.has(q2) && cleanRef(op3.c) !== q1) {
          op3.a = q0; op3.b = q2; op3.c = q1;
          simCoords = simulatePlanCoords(ops);
          fixes.push(`Đã sửa công thức point_sum của đỉnh "${q3}" thành ${q0} + ${q2} - ${q1} (chống chéo hình nơ hình bình hành).`);
        }
      }

      let p0 = simCoords.get(q0), p1 = simCoords.get(q1), p2 = simCoords.get(q2), p3 = simCoords.get(q3);
      if (p0 && p1 && p2 && p3 && !isQuadStrictlyConvex(p0, p1, p2, p3)) {
        // Case 1: Parallelogram/rectangle/rhombus/square requested and q0, q1, q3 (or q0, q1, q2) are free
        if (wantsParallelogram && op0.op === 'point_free' && op1.op === 'point_free' && op2.op === 'point_free' && op3.op === 'point_free') {
          // If swapping C <-> D yields a clean convex parallelogram, swap C <-> D and lock C = point_sum(B, D, A)
          if (isQuadStrictlyConvex(p0, p1, p3, p2)) {
            const tx = op2.x, ty = op2.y;
            op2.x = op3.x; op2.y = op3.y;
            op3.x = tx; op3.y = ty;
          }
          // Ensure non-collinear (q0, q1, q3) before locking C = point_sum(q1, q3, q0)
          const c0 = simCoords.get(q0), c1 = simCoords.get(q1);
          const dAfter = { x: op3.x, y: op3.y };
          const crossABD = (c1.x - c0.x) * (dAfter.y - c0.y) - (c1.y - c0.y) * (dAfter.x - c0.x);
          if (Math.abs(crossABD) > 1e-3) {
            const idx2 = ops.indexOf(op2);
            const idx3 = ops.indexOf(op3);
            if (idx3 > idx2) {
              // Ensure q3 precedes q2 so q2 can safely depend on q3!
              ops.splice(idx3, 1);
              ops.splice(idx2, 0, op3);
            }
            delete op2.x; delete op2.y;
            op2.op = 'point_sum';
            op2.a = q1; op2.b = q3; op2.c = q0;
            simCoords = simulatePlanCoords(ops);
            fixes.push(`Đã hoán vị & khóa đỉnh "${q2}" = point_sum(${q1}, ${q3}, ${q0}) để đáy ${quadIds.join('')} là hình bình hành lồi chuẩn.`);
          }
        }

        // Re-check convexity for general free quadrilaterals
        p0 = simCoords.get(q0); p1 = simCoords.get(q1); p2 = simCoords.get(q2); p3 = simCoords.get(q3);
        if (p0 && p1 && p2 && p3 && !isQuadStrictlyConvex(p0, p1, p2, p3)) {
          if (op2.op === 'point_free' && op3.op === 'point_free' && isQuadStrictlyConvex(p0, p1, p3, p2)) {
            const tx = op2.x, ty = op2.y;
            op2.x = op3.x; op2.y = op3.y;
            op3.x = tx; op3.y = ty;
            simCoords = simulatePlanCoords(ops);
            fixes.push(`Đã hoán đổi tọa độ 2 đỉnh ${q2} <-> ${q3} để gỡ tự cắt (bow-tie) cho tứ giác ${quadIds.join('')}.`);
          } else if (op1.op === 'point_free' && op2.op === 'point_free' && isQuadStrictlyConvex(p0, p2, p1, p3)) {
            const tx = op1.x, ty = op1.y;
            op1.x = op2.x; op1.y = op2.y;
            op2.x = tx; op2.y = ty;
            simCoords = simulatePlanCoords(ops);
            fixes.push(`Đã hoán đổi tọa độ 2 đỉnh ${q1} <-> ${q2} để gỡ tự cắt (bow-tie) cho tứ giác ${quadIds.join('')}.`);
          } else if ([op0, op1, op2, op3].every(o => o.op === 'point_free')) {
            // Radial sort around centroid + convexify any reflex vertex
            const cx = (p0.x + p1.x + p2.x + p3.x) * 0.25;
            const cy = (p0.y + p1.y + p2.y + p3.y) * 0.25;
            const pool = [
              { x: p0.x, y: p0.y },
              { x: p1.x, y: p1.y },
              { x: p2.x, y: p2.y },
              { x: p3.x, y: p3.y }
            ];
            const baseAng = Math.atan2(p0.y - cy, p0.x - cx);
            // Sort clockwise in math coords (matching A top-left -> B bottom-left -> C bottom-right -> D top-right or CCW)
            pool.sort((u, v) => {
              const au = ((baseAng - Math.atan2(u.y - cy, u.x - cx)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              const av = ((baseAng - Math.atan2(v.y - cy, v.x - cx)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              return au - av;
            });
            if (!isQuadStrictlyConvex(pool[0], pool[1], pool[2], pool[3])) {
              // Fallback clean perspective convex quad template preserving scale
              pool[0] = { x: -2.6, y: 0.0 };
              pool[1] = { x: -1.3, y: -1.9 };
              pool[2] = { x: 1.9, y: -1.7 };
              pool[3] = { x: 3.0, y: 0.1 };
            }
            [op0, op1, op2, op3].forEach((o, k) => {
              o.x = Number(pool[k].x.toFixed(4));
              o.y = Number(pool[k].y.toFixed(4));
            });
            simCoords = simulatePlanCoords(ops);
            fixes.push(`Đã sắp xếp lồi hóa 4 đỉnh đáy ${quadIds.join('')} chống suy biến/tự cắt.`);
          }
        }
      }
      p0 = simCoords.get(q0); p1 = simCoords.get(q1); p2 = simCoords.get(q2); p3 = simCoords.get(q3);
      convexBase = !!(p0 && p1 && p2 && p3 && isQuadStrictlyConvex(p0, p1, p2, p3));
    }

    // ------------------------------------------------------------------------
    // PASS 8: Collinear / Degenerate Free Vertices & Collapsed 3D Face Nudge
    // ------------------------------------------------------------------------
    const computeCoordSpan = (cMap) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of cMap.values()) {
        if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
        if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x;
        if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y;
      }
      return Number.isFinite(x0) ? Math.max(2.0, Math.hypot(x1 - x0, y1 - y0)) : 4.0;
    };

    let figSpan = computeCoordSpan(simCoords);
    const baseVertexIds = [...ptOpById.keys()].filter(id => id !== 'S' && !/['1]$/.test(id) && (ptOpById.get(id).op === 'point_free' || ptOpById.get(id).op === 'point_sum'));

    // 8A: Coincident free points
    const freeOps = ops.filter(o => o.op === 'point_free');
    for (let i = 0; i < freeOps.length; i++) {
      for (let j = i + 1; j < freeOps.length; j++) {
        const ci = simCoords.get(freeOps[i].id), cj = simCoords.get(freeOps[j].id);
        if (ci && cj && dist2D(ci, cj) < 0.05 * figSpan) {
          freeOps[j].x = Number((freeOps[j].x + 0.65).toFixed(4));
          freeOps[j].y = Number((freeOps[j].y - 0.42).toFixed(4));
          simCoords = simulatePlanCoords(ops);
          fixes.push(`Đã tách nhẹ đỉnh tự do "${freeOps[j].id}" bị trùng vị trí với "${freeOps[i].id}".`);
        }
      }
    }

    // 8B: 3 Base vertices nearly collinear (collapsed base face in 3D or degenerate triangle)
    if (baseVertexIds.length === 3) {
      const [b0, b1, b2] = baseVertexIds;
      const c0 = simCoords.get(b0), c1 = simCoords.get(b1), c2 = simCoords.get(b2);
      const pr = pointSegProj(c1, c0, c2);
      const opMid = ptOpById.get(b1);
      if (pr && pr.perp < 0.12 * figSpan && opMid && opMid.op === 'point_free' && is3D) {
        const nx = pr.uy, ny = -pr.ux;
        const dir = ny < 0 ? 1 : -1;
        opMid.x = Number((opMid.x + dir * nx * 0.22 * figSpan).toFixed(4));
        opMid.y = Number((opMid.y + dir * ny * 0.22 * figSpan).toFixed(4));
        simCoords = simulatePlanCoords(ops);
        fixes.push(`Đã dịch nhẹ đỉnh đáy "${b1}" để mặt đáy 3D mở thoáng (perpDist >= 0.12 * span).`);
      }
    }

    // 8C: Apex S projecting nearly collinearly onto a lateral edge or base edge
    if (is3D && ptOpById.has('S') && ptOpById.get('S').op === 'point_free' && baseVertexIds.length >= 3) {
      const sOp = ptOpById.get('S');
      const keepVerticalSA = /SA\s*(?:⊥|\\perp|vuông\s*góc)/i.test(allContextText);
      const isApexCollapsed = () => {
        const sc = simCoords.get('S');
        if (!sc) return false;
        // Check against base edges
        for (let i = 0; i < baseVertexIds.length; i++) {
          const u = simCoords.get(baseVertexIds[i]);
          const v = simCoords.get(baseVertexIds[(i + 1) % baseVertexIds.length]);
          const pr = pointSegProj(sc, u, v);
          if (pr && pr.perp < 0.12 * figSpan) return true;
        }
        // Check if any two lateral rays from S coincide (S, bi, bj collinear!)
        for (let i = 0; i < baseVertexIds.length; i++) {
          for (let j = i + 1; j < baseVertexIds.length; j++) {
            const bi = simCoords.get(baseVertexIds[i]);
            const bj = simCoords.get(baseVertexIds[j]);
            const pr1 = pointSegProj(bi, sc, bj);
            const pr2 = pointSegProj(bj, sc, bi);
            if ((pr1 && pr1.perp < 0.055 * figSpan) || (pr2 && pr2.perp < 0.055 * figSpan)) return true;
          }
        }
        return false;
      };

      if (isApexCollapsed()) {
        const origX = sOp.x, origY = sOp.y;
        const nudges = keepVerticalSA
          ? [[0, 0.55], [0, -0.45], [0.35, 0.45]]
          : [[0.48, 0.25], [-0.48, 0.25], [0.72, 0.4], [-0.72, 0.4], [0.35, 0.65]];
        let healedS = false;
        for (const [dx, dy] of nudges) {
          sOp.x = Number((origX + dx).toFixed(4));
          sOp.y = Number((origY + dy).toFixed(4));
          simCoords = simulatePlanCoords(ops);
          if (!isApexCollapsed()) {
            healedS = true;
            fixes.push(`Đã tinh chỉnh góc nhìn đỉnh S (${sOp.x}, ${sOp.y}) để tách rõ các mặt bên bị trùng khuất.`);
            break;
          }
        }
        if (!healedS) {
          sOp.x = origX; sOp.y = origY;
          simCoords = simulatePlanCoords(ops);
        }
      }
    }

    // ------------------------------------------------------------------------
    // PASS 9: Parallel / Runaway intersection_ll, 3D Skew Guard, Thales & right_angle
    // ------------------------------------------------------------------------
    figSpan = computeCoordSpan(simCoords);
    const { map3 } = is3D ? build3DLiftedCoords(ops, simCoords) : { map3: new Map() };
    const droppedPointIds = new Set();
    const skippedSegmentPairs = new Set();

    const healedOpsPass9 = [];
    for (let idx = 0; idx < ops.length; idx++) {
      const op = ops[idx];
      if (!op || !op.op) continue;

      // Skip ops that depend on an already dropped invalid point
      const deps = getOpDependencies(op);
      if (deps.some(d => droppedPointIds.has(d))) {
        const pid = getOpProducedId(op);
        if (pid) droppedPointIds.add(pid);
        fixes.push(`Đã bỏ qua thao tác "${op.op}" phụ thuộc vào điểm không hợp lệ (${deps.filter(d => droppedPointIds.has(d)).join(', ')}).`);
        continue;
      }

      // Skip redundant segment if converted to line_parallel
      if (op.op === 'segment' || op.op === 'line' || op.op === 'ray') {
        const k1 = `${cleanRef(op.a)}|${cleanRef(op.b)}`;
        const k2 = `${cleanRef(op.b)}|${cleanRef(op.a)}`;
        if (skippedSegmentPairs.has(k1) || skippedSegmentPairs.has(k2)) {
          continue;
        }
      }

      // 9A: Thales Tangent Upgrade on intersection_lc when [M, O] (Thales circle center + rim) was mistakenly passed as line
      if (op.op === 'intersection_lc') {
        const ln = Array.isArray(op.line) ? op.line : op.l1;
        const cir = Array.isArray(op.circle) ? op.circle : op.l2;
        const mSym = cleanRef(ln && ln[0]);
        const l1Sym = cleanRef(ln && ln[1]);
        const cCenterSym = cleanRef(cir && cir[0]);
        const mOp = ptOpById.get(mSym);
        const stepTxt = String(op.step || op.note || '');
        if (mOp && mOp.op === 'midpoint' && l1Sym === cCenterSym && /tiếp\s*điểm|tiếp\s*tuyến|thales|tangent/i.test(stepTxt) && cir) {
          op.op = 'intersection_cc';
          op.c1 = [ln[0], ln[1]];
          op.c2 = [cir[0], cir[1]];
          delete op.line; delete op.circle;
          simCoords = simulatePlanCoords(ops);
          fixes.push(`Đã nâng cấp tiếp điểm "${op.id}" sang giao 2 đường tròn Thales (intersection_cc).`);
        }
      }

      // 9B: Parallel / Near-Parallel & 3D Skew Guard on intersection_ll
      if (op.op === 'intersection_ll') {
        const l1 = Array.isArray(op.l1) ? op.l1.map(cleanRef) : [cleanRef(op.a1), cleanRef(op.b1)];
        const l2 = Array.isArray(op.l2) ? op.l2.map(cleanRef) : [cleanRef(op.a2), cleanRef(op.b2)];
        op.l1 = l1;
        op.l2 = l2;
        const a1 = simCoords.get(l1[0]), a2 = simCoords.get(l1[1]);
        const b1 = simCoords.get(l2[0]), b2 = simCoords.get(l2[1]);
        const pid = getOpProducedId(op);

        if (!a1 || !a2 || !b1 || !b2) {
          if (pid) droppedPointIds.add(pid);
          warnings.push(`Bỏ qua giao điểm "${pid}" vì thiếu tọa độ đường tạo.`);
          continue;
        }

        const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
        const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
        const len1 = Math.hypot(dx1, dy1), len2 = Math.hypot(dx2, dy2);
        const det = dx1 * dy2 - dy1 * dx2;
        const sinTheta = (len1 > 1e-7 && len2 > 1e-7) ? Math.abs(det) / (len1 * len2) : 0;

        let isRunaway = false;
        if (Math.abs(det) >= 1e-5) {
          const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / det;
          const ix = a1.x + t * dx1, iy = a1.y + t * dy1;
          // Compute center of existing coords
          let sx = 0, sy = 0, cnt = 0;
          for (const v of simCoords.values()) { sx += v.x; sy += v.y; cnt++; }
          const cx = cnt ? sx / cnt : 0, cy = cnt ? sy / cnt : 0;
          if (Math.hypot(ix - cx, iy - cy) > Math.max(18, figSpan * 4.5)) {
            isRunaway = true;
          }
        }

        if (Math.abs(det) < 1e-5 || sinTheta < 1e-4 || isRunaway) {
          // Check if a subsequent segment/line/ray connects an existing point P to pid (e.g. giao tuyến AE when MN // CD)
          let anchorThrough = '';
          for (let k = idx + 1; k < ops.length; k++) {
            const fut = ops[k];
            if (fut && (fut.op === 'segment' || fut.op === 'line' || fut.op === 'ray')) {
              const fa = cleanRef(fut.a), fb = cleanRef(fut.b);
              if (fa === pid && fb && fb !== pid && !l1.includes(fb) && !l2.includes(fb) && simCoords.has(fb)) {
                anchorThrough = fb;
                skippedSegmentPairs.add(`${fa}|${fb}`);
                break;
              }
              if (fb === pid && fa && fa !== pid && !l1.includes(fa) && !l2.includes(fa) && simCoords.has(fa)) {
                anchorThrough = fa;
                skippedSegmentPairs.add(`${fa}|${fb}`);
                break;
              }
            }
          }

          if (anchorThrough && pid) {
            const converted = {
              op: 'line_parallel',
              id: pid,
              label: /^[A-Z]/.test(op.label || '') ? 'x' : (op.label || 'x'),
              through: anchorThrough,
              a: l2[0],
              b: l2[1],
              k: 1.2,
              asLine: true,
              noDot: true,
              aux: true,
              effect: op.effect || 'glow',
              step: `Giao tuyến qua ${anchorThrough} song song ${l2[0]}${l2[1]}`
            };
            healedOpsPass9.push(converted);
            fixes.push(`Hai đường ${l1.join('')} và ${l2.join('')} song song (|det| < 1e-5): đã chuyển giao điểm vô cực "${pid}" thành giao tuyến song song qua ${anchorThrough} // ${l2.join('')}.`);
            warnings.push(`Hai đường ${l1.join('')} và ${l2.join('')} song song nên không cắt nhau; đã tự chuyển sang dựng giao tuyến song song.`);
          } else {
            if (pid) droppedPointIds.add(pid);
            fixes.push(`Đã chặn giao điểm suy biến/song song "${pid}" của ${l1.join('')} và ${l2.join('')} (chống NaN / điểm bay xa vô cực).`);
            warnings.push(`Hai đường ${l1.join('')} và ${l2.join('')} song song hoặc gần song song (|det| = ${Math.abs(det).toExponential(2)}); đã bỏ qua điểm "${pid}".`);
          }
          continue;
        }

        // 3D Skew-line false intersection check
        if (is3D && map3.size >= 4) {
          const u1 = map3.get(l1[0]), u2 = map3.get(l1[1]);
          const v1 = map3.get(l2[0]), v2 = map3.get(l2[1]);
          // Share an endpoint? Not skew
          const sharesEndpoint = l1[0] === l2[0] || l1[0] === l2[1] || l1[1] === l2[0] || l1[1] === l2[1];
          if (!sharesEndpoint && u1 && u2 && v1 && v2) {
            const skewD = computeSkewDistance3D(u1, u2, v1, v2);
            if (skewD > 0.08 * Math.max(2.0, figSpan * 0.5)) {
              warnings.push(`Cảnh báo không gian 3D: Hai đường thẳng ${l1.join('')} và ${l2.join('')} chéo nhau (không đồng phẳng, độ lệch 3D = ${skewD.toFixed(2)}), giao điểm "${pid}" là giao điểm giả trên hình chiếu!`);
              // Check if any downstream op references pid
              const usedDownstream = ops.slice(idx + 1).some(fut => getOpDependencies(fut).includes(pid));
              if (!usedDownstream) {
                droppedPointIds.add(pid);
                fixes.push(`Đã loại bỏ nhãn giao điểm giả "${pid}" của hai đường chéo nhau ${l1.join('')} và ${l2.join('')} trong 3D.`);
                continue;
              } else {
                op.noDot = true;
                op.show = false;
                fixes.push(`Đã ẩn nhãn giao điểm giả "${pid}" của hai đường chéo nhau ${l1.join('')} và ${l2.join('')}.`);
              }
            }
          }
        }
      }

      // 9C: Wrong right_angle vertex order healer
      if (op.op === 'right_angle') {
        let pA, pV, pB;
        if (Array.isArray(op.pts) && op.pts.length >= 3) {
          pA = cleanRef(op.pts[0]); pV = cleanRef(op.pts[1]); pB = cleanRef(op.pts[2]);
          delete op.pts;
        } else if (op.v !== undefined || op.vertex !== undefined) {
          pA = cleanRef(op.a);
          pV = cleanRef(op.v !== undefined ? op.v : op.vertex);
          pB = cleanRef(op.b !== undefined ? op.b : op.c);
          delete op.vertex; delete op.c;
        } else {
          pA = cleanRef(op.a); pV = cleanRef(op.b); pB = cleanRef(op.c);
          delete op.c;
        }

        // Check if pA or pB is a known foot_perp point on the line of the other two (works in BOTH 2D & 3D!)
        const isFootOf = (candId, o1, o2) => {
          const fOp = ptOpById.get(candId);
          if (!fOp || fOp.op !== 'foot_perp') return false;
          const all3 = new Set([cleanRef(fOp.p), cleanRef(fOp.a), cleanRef(fOp.b)]);
          return all3.has(o1) && (all3.has(o2) || true) && (cleanRef(fOp.p) === o1 || cleanRef(fOp.p) === o2);
        };

        if (!isFootOf(pV, pA, pB)) {
          if (isFootOf(pA, pV, pB)) {
            const tmp = pV; pV = pA; pA = tmp;
            fixes.push(`Đã tự đảo đỉnh góc vuông về chân đường vuông góc "${pV}" (${pA}-${pV}-${pB}).`);
          } else if (isFootOf(pB, pA, pV)) {
            const tmp = pV; pV = pB; pB = tmp;
            fixes.push(`Đã tự đảo đỉnh góc vuông về chân đường vuông góc "${pV}" (${pA}-${pV}-${pB}).`);
          } else if (!is3D) {
            // In 2D Euclidean plans, verify angle is ~90 deg at middle vertex v
            const cA = simCoords.get(pA), cV = simCoords.get(pV), cB = simCoords.get(pB);
            const angV = angleDegAtVertex(cV, cA, cB);
            const angA = angleDegAtVertex(cA, pV ? cV : null, cB);
            const angB = angleDegAtVertex(cB, cA, cV);
            if (Number.isFinite(angV) && Math.abs(angV - 90) > 16) {
              if (Number.isFinite(angA) && Math.abs(angA - 90) <= 14 && Math.abs(angA - 90) <= Math.abs(angB - 90)) {
                const tmp = pV; pV = pA; pA = tmp;
                fixes.push(`Đã đảo đỉnh giữa của right_angle sang "${pV}" (góc phẳng tại ${pV} ≈ ${angA.toFixed(1)}°).`);
              } else if (Number.isFinite(angB) && Math.abs(angB - 90) <= 14) {
                const tmp = pV; pV = pB; pB = tmp;
                fixes.push(`Đã đảo đỉnh giữa của right_angle sang "${pV}" (góc phẳng tại ${pV} ≈ ${angB.toFixed(1)}°).`);
              }
            }
          }
        }

        op.a = pA; op.v = pV; op.b = pB;
      }

      healedOpsPass9.push(op);
    }
    ops = healedOpsPass9;

    // ------------------------------------------------------------------------
    // PASS 10: Disconnected Auxiliary Free Points Check & Final NaN Verification
    // ------------------------------------------------------------------------
    const referencedInShapes = new Set();
    for (const op of ops) {
      if (!POINT_PRODUCING_OPS.has(op.op)) {
        for (const d of getOpDependencies(op)) referencedInShapes.add(d);
      } else if (op.op === 'foot_perp' && op.drawDropSegment !== false) {
        referencedInShapes.add(op.id);
        referencedInShapes.add(cleanRef(op.p));
      } else if ((op.op === 'line_parallel' || op.op === 'line_perp') && op.drawSegment !== false) {
        referencedInShapes.add(op.id);
        referencedInShapes.add(cleanRef(op.through || op.o || op.p));
      }
    }
    const referencedByOtherPts = new Set();
    for (const op of ops) {
      if (POINT_PRODUCING_OPS.has(op.op)) {
        for (const d of getOpDependencies(op)) referencedByOtherPts.add(d);
      }
    }
    for (const op of ops) {
      const pid = getOpProducedId(op);
      if (pid && op.show !== false && !referencedInShapes.has(pid) && !referencedByOtherPts.has(pid)) {
        warnings.push(`Điểm "${pid}" chưa được nối vào bất kỳ cạnh hay đường phụ nào.`);
      }
    }

    const finalSim = simulatePlanCoords(ops);
    const coordsOut = {};
    for (const op of ops) {
      const pid = getOpProducedId(op);
      if (!pid) continue;
      let c = finalSim.get(pid);
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) {
        // Guaranteed 0-NaN fallback: convert broken derived op into safe point_free
        const safeX = Number(((Object.keys(coordsOut).length % 4) * 0.9 - 1.2).toFixed(3));
        const safeY = Number(((Object.keys(coordsOut).length % 3) * 0.8 - 0.6).toFixed(3));
        const idx = ops.indexOf(op);
        if (idx >= 0) {
          ops[idx] = { op: 'point_free', id: pid, label: op.label || pid, x: safeX, y: safeY, show: false };
        }
        c = { x: safeX, y: safeY };
        fixes.push(`Đã thay điểm suy biến "${pid}" bằng tọa độ hữu hạn an toàn chống NaN.`);
        warnings.push(`Điểm "${pid}" không có nghiệm giao hình học thực; đã ẩn an toàn.`);
      }
      coordsOut[pid] = { x: Number(c.x.toFixed(6)), y: Number(c.y.toFixed(6)) };
    }

    // Normalize plan.motion metadata
    const rawMotion = (plan.motion && typeof plan.motion === 'object') ? plan.motion : {};
    const rawPreset = String(rawMotion.preset || opts.preset || '').trim();
    const normPreset = rawPreset === 'geo3d' ? '3d_standard' : rawPreset;
    const normalizedMotion = {
      ...rawMotion,
      preset: ['domiinh', 'manim', '3d_standard'].includes(normPreset) ? normPreset : (rawPreset || ''),
      defaultEffect: VALID_STEP_EFFECTS.has(String(rawMotion.defaultEffect || opts.defaultEffect || ''))
        ? String(rawMotion.defaultEffect || opts.defaultEffect)
        : (rawMotion.defaultEffect || undefined),
      fps: Number.isFinite(Number(rawMotion.fps)) ? Math.max(12, Math.min(60, Number(rawMotion.fps))) : 24,
      durationSec: Number.isFinite(Number(rawMotion.durationSec)) ? Math.max(2, Math.min(60, Number(rawMotion.durationSec))) : 8,
      holdEndSec: Number.isFinite(Number(rawMotion.holdEndSec)) ? Math.max(0, Math.min(10, Number(rawMotion.holdEndSec))) : 1,
      loop: rawMotion.loop !== undefined ? !!rawMotion.loop : true,
      handPen: rawMotion.handPen !== undefined ? !!rawMotion.handPen : true,
      followCamera: rawMotion.followCamera !== undefined ? !!rawMotion.followCamera : true,
      orbit3d: !!(rawMotion.orbit3d ?? rawMotion.autoOrbitAfter ?? (normPreset === '3d_standard' && is3D)),
      speed: Number.isFinite(Number(rawMotion.speed)) ? Math.max(0.2, Math.min(4, Number(rawMotion.speed))) : 1,
      cameraKeyframes: Array.isArray(rawMotion.cameraKeyframes) ? rawMotion.cameraKeyframes : []
    };

    const healReport = {
      ok: true,
      fixedCount: fixes.length,
      fixes,
      warnings,
      convexBase,
      coords: coordsOut,
      stats: {
        totalOps: ops.length,
        pointCount: Object.keys(coordsOut).length,
        is3D
      }
    };

    const result = {
      ...plan,
      title: planTitle || 'Hình AI dựng',
      is3D,
      ops,
      motion: normalizedMotion,
      healReport
    };

    // Non-enumerable convenience aliases so both result.ops and result.plan.ops work without breaking JSON.stringify
    Object.defineProperty(result, 'plan', { value: result, enumerable: false, configurable: true });
    Object.defineProperty(result, 'warnings', { value: warnings, enumerable: false, configurable: true });
    Object.defineProperty(result, 'fixes', { value: fixes, enumerable: false, configurable: true });

    return result;
  }

  // ==========================================================================
  // 3. PARAMETRIC GEOMETRY COMPILER (compileAiGeoPlan)
  // ==========================================================================
  function applyMotionMetaToStep(stepObj, motionMeta) {
    if (!stepObj || !motionMeta) return stepObj;
    if (motionMeta.effect) stepObj.effect = motionMeta.effect;
    if (motionMeta.easing) stepObj.easing = motionMeta.easing;
    if (Number.isFinite(motionMeta.durationMul)) stepObj.durationMul = motionMeta.durationMul;
    if (Number.isFinite(motionMeta.delayMs)) stepObj.delayMs = motionMeta.delayMs;
    if (Number.isFinite(motionMeta.pauseAfter)) stepObj.pauseAfter = motionMeta.pauseAfter;
    if (typeof motionMeta.rev === 'boolean') stepObj.rev = motionMeta.rev;
    if (typeof motionMeta.tempHide === 'boolean') stepObj.tempHide = motionMeta.tempHide;
    if (typeof motionMeta.showGuides === 'boolean') stepObj.showGuides = motionMeta.showGuides;
    if (Array.isArray(motionMeta.tRange)) stepObj.tRange = motionMeta.tRange.slice(0, 2);
    return stepObj;
  }

  function makeStepForPt(pid, title, motionMeta) {
    const st = {
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
    return applyMotionMetaToStep(st, motionMeta);
  }

  function makeStepForShape(shid, title, tempHide = false, motionMeta = null) {
    const st = {
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
    return applyMotionMetaToStep(st, motionMeta);
  }

  function getAppGeoStyle(board) {
    let color = (board && board.shapeStyle && board.shapeStyle.color) || '';
    let width = (board && board.shapeStyle && Number.isFinite(Number(board.shapeStyle.width))) ? Number(board.shapeStyle.width) : 0;
    try {
      if (hasWindow) {
        const gd = window.__mnGeoDefaults;
        if (gd) {
          if (!color && gd.lineColor) color = gd.lineColor;
          if (!(width > 0) && Number(gd.lineWidth) > 0) width = Number(gd.lineWidth);
        }
        if (typeof localStorage !== 'undefined' && (!color || !(width > 0))) {
          const pr = JSON.parse(localStorage.getItem('prefs') || '{}');
          if (!color && pr.geoLineColor) color = pr.geoLineColor;
          if (!(width > 0) && Number(pr.geoLineWidth) > 0) width = Number(pr.geoLineWidth);
        }
      }
    } catch {}
    return {
      color: color || '#1a1a1a',
      width: (width > 0 && Number.isFinite(width)) ? width : 2.5
    };
  }

  function compileAiGeoPlan(rawPlanInput, board, anchorBox) {
    const K = getKernel();
    if (!K || typeof K.nt !== 'function' || typeof K.Tt !== 'function') {
      throw new Error('Nhân hình học MinNote chưa sẵn sàng.');
    }

    // Automatically run Pre-Compile Validator & Auto-Healer
    const plan = validateAndHealAiGeoPlan(rawPlanInput);
    const ops = plan.ops;
    if (!ops.length) {
      throw new Error('Kịch bản AI không chứa thao tác dựng hình nào.');
    }

    const genId = () => K.nt();
    const appStyle = getAppGeoStyle(board);
    const symToPt = new Map();
    const pts = [];
    const shapes = [];
    const shapeByEdgeKey = new Map();
    const rawSteps = [];
    const stepBySym = new Map(); // symbolic op id / edge key -> generated step(s)

    const defaultFx = plan.motion && plan.motion.defaultEffect ? plan.motion.defaultEffect : undefined;

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
    const findEdge = (idA, idB) => shapeByEdgeKey.get(idA < idB ? idA + '|' + idB : idB + '|' + idA) || null;
    const planIs3D = plan && typeof plan.is3D === 'boolean' ? plan.is3D : true;

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
          if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
          if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x;
          if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
        }
        const span = Math.max(2, Math.hypot(x1 - x0, y1 - y0));
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        return Math.hypot(ix - cx, iy - cy) <= span * 3.0;
      };
      if (checkOk()) return;

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

    const emitSilhouetteSegment = (pStart, pEnd, styleOpts, descLabel, explicitDashed, motionMeta) => {
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
          rawSteps.push(makeStepForShape(sh1.id, descLabel || `Kẻ qua ${pStart.label}`, false, motionMeta));
          const sh2 = addShapeRec('segment', [pCross.id, pEnd.id], { ...styleOpts, dashed: mid2Inside });
          rawSteps.push(makeStepForShape(sh2.id, `${descLabel || 'Kéo dài'} (ra ngoài khối)`, false, motionMeta));
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
      rawSteps.push(makeStepForShape(sh.id, descLabel, false, motionMeta));
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

    const recordSymStep = (symKey, st) => {
      if (!symKey || !st) return;
      if (!stepBySym.has(symKey)) stepBySym.set(symKey, []);
      stepBySym.get(symKey).push(st);
    };

    // Track base points and build step-by-step operations
    const customMotionPtIds = new Set();

    for (const op of ops) {
      if (!op || !op.op) continue;
      const stepLabel = op.step || op.note || '';
      const mMeta = extractMotionMetaFromOp(op, defaultFx);
      const hasExplicitOpMotion = !!(op.effect || op.easing || op.durationMul !== undefined || op.delayMs !== undefined || op.tRange);

      switch (op.op) {
        case 'point_free': {
          const x = Number(op.x ?? 0), y = Number(op.y ?? 0);
          const pt = registerPoint(op.id || op.label, { t: 'free', x, y: -y }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
          if (hasExplicitOpMotion) customMotionPtIds.add(pt.id);
          if (op.show !== false) {
            const st = makeStepForPt(pt.id, stepLabel || `Chấm điểm ${pt.label}`, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || op.label), st);
          }
          break;
        }
        case 'point_sum': {
          const a = resolvePt(op.a), b = resolvePt(op.b), c = resolvePt(op.c);
          if (a && b && c) {
            const pt = registerPoint(op.id || op.label, { t: 'sum', a: a.id, b: b.id, c: c.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (hasExplicitOpMotion) customMotionPtIds.add(pt.id);
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Dựng điểm ${pt.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'midpoint': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            const pt = registerPoint(op.id || op.label, { t: 'mid', a: a.id, b: b.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Trung điểm ${pt.label} của ${a.label}${b.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'point_on_segment':
        case 'ratio_point': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            let k = Number(op.ratio ?? op.k ?? 0.38);
            if (!Number.isFinite(k)) k = 0.38;
            k = Math.min(0.92, Math.max(0.08, k));
            const pt = registerPoint(op.id || op.label, { t: 'on', a: a.id, b: b.id, k, seg: true }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Điểm ${pt.label} trên đoạn ${a.label}${b.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'point_on_line': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            let k = Number(op.ratio ?? op.k ?? 1.3);
            if (!Number.isFinite(k)) k = 1.3;
            const seg = k >= 0 && k <= 1;
            const pt = registerPoint(op.id || op.label, { t: 'on', a: a.id, b: b.id, k, seg }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Điểm ${pt.label} trên đường ${a.label}${b.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'foot_perp': {
          const p = resolvePt(op.p), a = resolvePt(op.a), b = resolvePt(op.b);
          if (p && a && b) {
            const pt = registerPoint(op.id || op.label, { t: 'foot', p: p.id, a: a.id, b: b.id }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.drawDropSegment !== false) {
              const sh = addShapeRec('segment', [p.id, pt.id], { dashed: !!op.dashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
              const stS = makeStepForShape(sh.id, stepLabel || `Kẻ ${p.label}${pt.label} ⊥ ${a.label}${b.label}`, !!op.tempHide, mMeta);
              rawSteps.push(stS);
              recordSymStep(cleanRef(op.id || op.label), stS);
            }
            if (op.show !== false) {
              const stP = makeStepForPt(pt.id, `Chân đường vuông góc ${pt.label}`, mMeta);
              rawSteps.push(stP);
              recordSymStep(cleanRef(op.id || op.label), stP);
            }
            if (op.markRightAngle !== false) {
              const rPt = dist2D(evalCurrentCoords().get(pt.id) || { x: 0, y: 0 }, evalCurrentCoords().get(b.id) || { x: 1, y: 0 }) > 1e-4 ? b : a;
              const rSh = addShapeRec('right', [p.id, pt.id, rPt.id], { dashed: false, aux: true });
              rawSteps.push(makeStepForShape(rSh.id, `Kí hiệu góc vuông tại ${pt.label}`, false, { effect: 'fade' }));
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

            const pt = registerPoint(op.id || op.label, { t: 'vec', o: through.id, a: a.id, b: b.id, k, perp: isPerp }, lblStr, op.show !== false, isLineStyle ? { noDot: true } : { noDot: op.noDot });
            const lineStyleOpts = { color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: op.aux !== undefined ? !!op.aux : isLineStyle };
            if (oppK !== null && op.drawSegment !== false) {
              const pOpp = registerPoint('', { t: 'vec', o: through.id, a: a.id, b: b.id, k: oppK, perp: isPerp }, '', false);
              emitSilhouetteSegment(through, pOpp, lineStyleOpts, stepLabel || `Kéo dài ${through.label}${lblStr}`, op.dashed, mMeta);
            }
            if (op.drawSegment !== false) {
              const explicitD = op.dashed !== undefined ? !!op.dashed : (isLineStyle ? undefined : false);
              if (op.kind === 'line' || op.kind === 'ray') {
                const sh = addShapeRec(op.kind, [through.id, pt.id], { ...lineStyleOpts, dashed: !!explicitD });
                const stS = makeStepForShape(sh.id, stepLabel || (isPerp ? `Kẻ đường vuông góc từ ${through.label}` : `Kẻ ${through.label}${lblStr} // ${a.label}${b.label}`), !!op.tempHide, mMeta);
                rawSteps.push(stS);
                recordSymStep(cleanRef(op.id || op.label), stS);
              } else {
                emitSilhouetteSegment(through, pt, lineStyleOpts, stepLabel || (isPerp ? `Kẻ đường vuông góc từ ${through.label}` : `Kẻ ${through.label}${lblStr} // ${a.label}${b.label}`), explicitD, mMeta);
              }
            }
            if (op.show !== false) {
              const stP = makeStepForPt(pt.id, isLineStyle ? `Đặt tên đường ${lblStr}` : (stepLabel || `Dựng điểm ${pt.label}`), mMeta);
              rawSteps.push(stP);
              recordSymStep(cleanRef(op.id || op.label), stP);
            }
          }
          break;
        }
        case 'circle': {
          const o = resolvePt(op.center || op.o);
          const r = resolvePt(op.rim || op.r);
          if (o && r) {
            const sh = addShapeRec('circle', [o.id, r.id], { dashed: !!op.dashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
            const st = makeStepForShape(sh.id, stepLabel || `Vẽ đường tròn (${o.label})`, !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `circle_${o.label}`), st);
          }
          break;
        }
        case 'point_on_circle': {
          const o = resolvePt(op.center || op.o);
          const r = resolvePt(op.rim || op.r);
          if (o && r) {
            const deg = Number(op.angleDeg ?? op.angle ?? 60);
            const norm = (((-deg / 360) % 1) + 1) % 1;
            const pt = registerPoint(op.id || op.label, { t: 'path', kind: 'circle', on: 'circle', pts: [o.id, r.id], k: norm }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Lấy điểm ${pt.label} trên đường tròn (${o.label})`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'intersection_ll': {
          const l1 = Array.isArray(op.l1) ? op.l1 : [op.a1, op.b1];
          const l2 = Array.isArray(op.l2) ? op.l2 : [op.a2, op.b2];
          const a1 = resolvePt(l1[0]), a2 = resolvePt(l1[1]), b1 = resolvePt(l2[0]), b2 = resolvePt(l2[1]);
          if (a1 && a2 && b1 && b2) {
            ensureFiniteIntersection([a1.id, a2.id], [b1.id, b2.id]);
            const pt = registerPoint(
              op.id || op.label,
              { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [b1.id, b2.id], c2: false, which: Number(op.which) || 0 },
              op.label ?? op.id,
              op.show !== false,
              { noDot: op.noDot }
            );
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
                  rawSteps.push(makeStepForShape(extSh.id, `Kéo dài ${pA.label}${pB.label} cắt tại ${pt.label}`, false, mMeta));
                }
              };
              maybeExtend(a1, a2, cur.get(a1.id), cur.get(a2.id));
              maybeExtend(b1, b2, cur.get(b1.id), cur.get(b2.id));
            }
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Giao điểm ${pt.label} = ${a1.label}${a2.label} ∩ ${b1.label}${b2.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
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
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [o.id, r.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Giao điểm ${pt.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'intersection_cc': {
          const c1 = Array.isArray(op.c1) ? op.c1 : (Array.isArray(op.circle1) ? op.circle1 : op.l1);
          const c2 = Array.isArray(op.c2) ? op.c2 : (Array.isArray(op.circle2) ? op.circle2 : op.l2);
          const o1 = resolvePt(c1 && c1[0]), r1 = resolvePt(c1 && c1[1]);
          const o2 = resolvePt(c2 && c2[0]), r2 = resolvePt(c2 && c2[1]);
          if (o1 && r1 && o2 && r2) {
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [o1.id, r1.id], c1: true, l2: [o2.id, r2.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Giao điểm ${pt.label} của hai đường tròn`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'tangent_point': {
          const ext = resolvePt(op.p || op.from || op.a);
          const o = resolvePt(op.center || op.o);
          const r = resolvePt(op.rim || op.r);
          if (ext && o && r) {
            const thalesMidKey = `__thales_${ext.id}_${o.id}`;
            const midPt = symToPt.get(thalesMidKey) || registerPoint(thalesMidKey, { t: 'mid', a: o.id, b: ext.id }, '', false, { noDot: true });
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [midPt.id, o.id], c1: true, l2: [o.id, r.id], c2: true, which: Number(op.which) || 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Tiếp điểm ${pt.label} từ ${ext.label} tới (${o.label})`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
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
            const st = makeStepForShape(sh.id, stepLabel || `${kindTxt} ${a.label}${b.label}`, !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `${cleanRef(op.a)}-${cleanRef(op.b)}`), st);
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
          const edgeMotion = { ...mMeta };
          if (edgeMotion.effect === 'fade' && op.fill) {
            // Keep edges drawn cleanly while fill uses fade
            edgeMotion.effect = defaultFx || 'draw';
          }
          for (let i = 0; i < ids.length; i++) {
            const pA = ids[i], pB = ids[(i + 1) % ids.length];
            if (findEdge(pA.id, pB.id)) continue;
            let edgeDashed = isEdgeDashed(pA.label, pB.label);
            if (!hasExplicitDashList && planIs3D && curCoords && hullCoords.length >= 3) {
              const ca = curCoords.get(pA.id), cb = curCoords.get(pB.id);
              if (ca && cb) edgeDashed = pointInHull({ x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 }, hullCoords);
            }
            const sh = addShapeRec('segment', [pA.id, pB.id], { dashed: edgeDashed, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
            const stE = makeStepForShape(sh.id, `Cạnh ${pA.label}${pB.label}`, !!op.tempHide, edgeMotion);
            rawSteps.push(stE);
          }
          if (op.fill && ids.length >= 3) {
            const fillVal = op.explicitColor ? op.fill : 'rgba(15, 23, 42, 0.05)';
            const shF = addShapeRec('polygon', ids.map(x => x.id), { width: 0, fill: fillVal, color: op.color, explicitColor: !!op.explicitColor, aux: op.op !== 'polygon_base' });
            const fillMeta = { ...mMeta, effect: op.effect || 'fade' };
            const stF = makeStepForShape(shF.id, stepLabel || `Tô nhạt (${ids.map(x => x.label).join('')})`, !!op.tempHide, fillMeta);
            rawSteps.push(stF);
            recordSymStep(cleanRef(op.id || ids.map(x => x.label).join('')), stF);
          }
          break;
        }
        case 'polygon_fill': {
          const ids = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          if (ids.length >= 3) {
            const fillVal = (op.explicitColor && op.fill) ? op.fill : 'rgba(15, 23, 42, 0.06)';
            const sh = addShapeRec('polygon', ids.map(x => x.id), { width: 0, fill: fillVal, color: op.color, explicitColor: !!op.explicitColor, aux: !!op.aux });
            const fillMeta = { ...mMeta, effect: op.effect || 'fade' };
            const st = makeStepForShape(sh.id, stepLabel || `Tô mặt (${ids.map(x => x.label).join('')})`, !!op.tempHide, fillMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || ids.map(x => x.label).join('')), st);
          }
          break;
        }
        case 'right_angle': {
          const a = resolvePt(op.a);
          const v = resolvePt(op.v || op.vertex || op.b);
          const b = resolvePt(op.v || op.vertex ? op.b : op.c);
          if (a && v && b) {
            const sh = addShapeRec('right', [a.id, v.id, b.id], { dashed: false, aux: true });
            const raMeta = { ...mMeta, effect: op.effect || 'fade' };
            const st = makeStepForShape(sh.id, stepLabel || `Kí hiệu góc vuông ${v.label}`, !!op.tempHide, raMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `right_${v.label}`), st);
          }
          break;
        }
        case 'angle_mark': {
          const a = resolvePt(op.a), v = resolvePt(op.v || op.vertex || op.b), b = resolvePt((op.v || op.vertex) ? op.b : op.c);
          if (a && v && b) {
            const sh = addShapeRec('angle', [a.id, v.id, b.id], { dashed: false, plain: true, n: Math.max(1, Math.min(3, Number(op.n) || 1)), aux: true });
            const amMeta = { ...mMeta, effect: op.effect || 'fade' };
            const st = makeStepForShape(sh.id, stepLabel || `Kí hiệu góc ${a.label}${v.label}${b.label}`, !!op.tempHide, amMeta);
            rawSteps.push(st);
          }
          break;
        }
        case 'tick_mark': {
          const a = resolvePt(op.a), b = resolvePt(op.b);
          if (a && b) {
            const sh = addShapeRec('tick', [a.id, b.id], { dashed: false, n: Math.max(1, Math.min(3, Number(op.n) || 1)), aux: true });
            const tmMeta = { ...mMeta, effect: op.effect || 'fade' };
            rawSteps.push(makeStepForShape(sh.id, stepLabel || `Kí hiệu bằng nhau ${a.label}${b.label}`, !!op.tempHide, tmMeta));
          }
          break;
        }
      }
    }

    if (!pts.length) {
      throw new Error('Không dựng được điểm nào từ dữ liệu AI.');
    }

    // Post-compile Connectivity Healer: ensure no derived point (inter, foot, mid/on-segment/on-line) floats disconnected
    const healCoords = evalCurrentCoords();
    const healHullIds = planIs3D ? computeSkeletonHullIds(healCoords) : [];
    const healHullCoords = healHullIds.map(id => healCoords.get(id)).filter(Boolean);
    const ptObjMap = Object.fromEntries(pts.map(p => [p.id, p]));

    const insertStepNearPoint = (ptId, stepObj) => {
      const idx = rawSteps.findIndex(st => st.kind === 'point' && st.refId === ptId);
      if (idx >= 0) rawSteps.splice(idx, 0, stepObj);
      else rawSteps.push(stepObj);
    };

    function opExtDashed(existingLine) {
      if (!planIs3D) return true;
      return !!(existingLine && existingLine.dashed);
    }

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
      insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Nối ${anchorPt ? anchorPt.label : ''}${pt.label}`, false, defaultFx ? { effect: defaultFx } : null));
    };

    for (const pt of pts) {
      if (!pt || !pt.show || !pt.def) continue;
      if (pt.def.t === 'inter' && !pt.def.c1 && !pt.def.c2 && Array.isArray(pt.def.l1) && Array.isArray(pt.def.l2)) {
        connectLineToPointIfMissing(pt, pt.def.l1[0], pt.def.l1[1]);
        connectLineToPointIfMissing(pt, pt.def.l2[0], pt.def.l2[1]);
      } else if (pt.def.t === 'foot' && pt.def.p && pt.def.a && pt.def.b) {
        if (!findEdge(pt.def.p, pt.id)) {
          const sh = addShapeRec('segment', [pt.def.p, pt.id], { dashed: false, aux: true });
          insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Hạ ${ptObjMap[pt.def.p]?.label || ''}${pt.label} vuông góc`, false, defaultFx ? { effect: defaultFx } : null));
        }
        connectLineToPointIfMissing(pt, pt.def.a, pt.def.b);
      } else if ((pt.def.t === 'mid' || (pt.def.t === 'on' && pt.def.seg)) && pt.def.a && pt.def.b) {
        if (!isLineCoveredByShapes(pt.id, pt.def.a, pt.def.b, healCoords) && !findEdge(pt.def.a, pt.def.b)) {
          const ca = healCoords.get(pt.def.a), cb = healCoords.get(pt.def.b);
          const midC = ca && cb ? { x: (ca.x + cb.x) / 2, y: (ca.y + cb.x * 0 + cb.y) / 2 } : null;
          const insideHull = midC && planIs3D && healHullCoords.length >= 3 && pointInHull(midC, healHullCoords);
          const sh = addShapeRec('segment', [pt.def.a, pt.def.b], { dashed: insideHull });
          insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Nối ${ptObjMap[pt.def.a]?.label || ''}${ptObjMap[pt.def.b]?.label || ''}`, false, defaultFx ? { effect: defaultFx } : null));
        }
      } else if (pt.def.t === 'on' && !pt.def.seg && pt.def.a && pt.def.b) {
        connectLineToPointIfMissing(pt, pt.def.a, pt.def.b);
      }
    }

    // Apply optional plan.motion.steps overrides (by symbolic target/refId/opId or step index)
    if (plan.motion && Array.isArray(plan.motion.steps) && plan.motion.steps.length) {
      plan.motion.steps.forEach((ms, mIdx) => {
        if (!ms || typeof ms !== 'object') return;
        const mCopy = { ...ms };
        normalizeOpMotionProps(mCopy);
        const meta = extractMotionMetaFromOp(mCopy);
        const key = cleanRef(ms.target || ms.opId || ms.symId || ms.ref || ms.refId);
        const strippedKey = key.replace(/^(?:pt|sh)_/, '');
        const edgeDashKey = strippedKey.length === 2 ? `${strippedKey[0]}-${strippedKey[1]}` : '';
        const matchedList = stepBySym.get(key) || stepBySym.get(strippedKey) || (edgeDashKey ? stepBySym.get(edgeDashKey) : null);
        if (matchedList) {
          for (const st of matchedList) {
            applyMotionMetaToStep(st, meta);
            if (ms.title || ms.customTitle) st.customTitle = String(ms.title || ms.customTitle);
          }
        } else if (rawSteps[mIdx] && !key) {
          applyMotionMetaToStep(rawSteps[mIdx], meta);
          if (ms.title || ms.customTitle) rawSteps[mIdx].customTitle = String(ms.title || ms.customTitle);
        }
      });
    }

    // Compact consecutive initial free/sum vertices WITHOUT custom individual motion overrides into 1 neat base step
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
        const firstBuf = ptBuf[0];
        groupedSteps.push({
          id: 'st_ai_grp_' + Math.random().toString(36).slice(2, 6),
          kind: 'group',
          customTitle: names ? `Đặt các đỉnh gốc ${names}` : `Đặt ${ptBuf.length} đỉnh gốc`,
          items: ptBuf.map(st => ({ kind: 'point', refId: st.refId, rev: false })),
          effect: firstBuf.effect || defaultFx || 'draw',
          easing: firstBuf.easing || 'easeInOut',
          ...(Number.isFinite(firstBuf.durationMul) ? { durationMul: firstBuf.durationMul } : {}),
          ...(Number.isFinite(firstBuf.delayMs) ? { delayMs: firstBuf.delayMs } : {}),
          enabled: true
        });
      }
      ptBuf = [];
    };
    const freeIds = new Set(pts.filter(p => p.def && (p.def.t === 'free' || p.def.t === 'sum') && !customMotionPtIds.has(p.id)).map(p => p.id));
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

    // Post-compile NaN & Infinity coordinate guard on placed points
    const verifyCoords = K.Tt({ points: Object.fromEntries(placed.points.map(p => [p.id, p])), shapes });
    const safePlacedPoints = placed.points.map((p, idx) => {
      const c = verifyCoords.get(p.id);
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) {
        return {
          ...p,
          show: false,
          noDot: true,
          def: {
            t: 'free',
            x: (placed.center ? placed.center.x : 420) + (idx % 5) * 12,
            y: (placed.center ? placed.center.y : 360) + (idx % 3) * 12
          }
        };
      }
      return p;
    });

    const compiledMotion = {
      ...(plan.motion || {}),
      steps: groupedSteps.map(st => ({ ...st }))
    };

    return {
      points: safePlacedPoints,
      shapes,
      steps: groupedSteps,
      motion: compiledMotion,
      healReport: plan.healReport,
      is3D: planIs3D,
      pageIdx: placed.pageIdx,
      title: plan.title || 'Hình AI dựng'
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

    const solidMain = shapes.filter(s => !s.hidden && !s.dashed && ['polygon', 'segment', 'circle', 'arc'].includes(s.kind) && s.width !== 0);
    const dashedMain = shapes.filter(s => !s.hidden && s.dashed && ['polygon', 'segment', 'circle', 'arc'].includes(s.kind) && s.width !== 0);
    const auxRest = shapes.filter(s => !s.hidden && !solidMain.includes(s) && !dashedMain.includes(s) && s.kind !== 'solid' && s.kind !== 'flatLink');

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
  // 4. SELECTION HELPER & CLIPBOARD UTILITIES
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
    if (!src || !hasDoc) return null;
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
        const maxDim = 1200;
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
        const useJpeg = (w * h) > 320000;
        const mime = useJpeg ? 'image/jpeg' : 'image/png';
        const dataUrl = useJpeg ? canvas.toDataURL('image/jpeg', 0.88) : canvas.toDataURL('image/png');
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

  async function copyTextSafe(text) {
    const str = String(text || '');
    if (!str) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(str);
        return true;
      }
    } catch {}
    if (!hasDoc) return false;
    try {
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  function showAppToast(msg, tone = 'success') {
    if (hasWindow && typeof window.showToast === 'function') {
      window.showToast(msg, tone);
    }
  }

  // ==========================================================================
  // 5. MODAL UI & 3-TAB STUDIO (AI DỰNG HÌNH · NẠP TIKZ · JSON & CHUYỂN ĐỘNG)
  // ==========================================================================
  let modalState = {
    open: false,
    tab: 'ai', // 'ai' | 'tikz' | 'json'
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
    autoSwitchedFromModel: '',
    aiCfg: null,
    motionPreset: 'domiinh',
    defaultEffect: 'chalk'
  };

  function getModalMotionControls(bd) {
    const rootEl = bd || (hasDoc ? document.getElementById('mn-ai-geo-backdrop') : null);
    if (!rootEl) {
      return {
        preset: modalState.motionPreset || 'domiinh',
        defaultEffect: modalState.defaultEffect || 'chalk',
        handPen: true,
        followCamera: true,
        orbit3d: false,
        loop: true
      };
    }
    const fxSel = rootEl.querySelector('#mn-ag-default-effect');
    const handChk = rootEl.querySelector('#mn-ag-opt-handpen');
    const camChk = rootEl.querySelector('#mn-ag-opt-camera');
    const orbChk = rootEl.querySelector('#mn-ag-opt-orbit3d');
    const loopChk = rootEl.querySelector('#mn-ag-opt-loop');
    return {
      preset: modalState.motionPreset || 'domiinh',
      defaultEffect: (fxSel && fxSel.value) || modalState.defaultEffect || 'chalk',
      handPen: handChk ? !!handChk.checked : true,
      followCamera: camChk ? !!camChk.checked : true,
      orbit3d: orbChk ? !!orbChk.checked : false,
      loop: loopChk ? !!loopChk.checked : true
    };
  }

  function ensureModal() {
    if (!hasDoc) return null;
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
              <div class="mn-ag-sub">Kiểm chứng ràng buộc tự động · nét liền/đứt chuẩn · JSON &amp; chuyển động BetaTikz</div>
            </div>
          </div>
          <div class="mn-ag-head-actions">
            <button type="button" class="mn-ag-key-btn" id="mn-ag-open-keys" title="Cấu hình API Key & Model AI">🔑 API Key</button>
            <button type="button" class="mn-ag-close" id="mn-ag-close" title="Đóng (Esc)">✕</button>
          </div>
        </div>

        <div class="mn-ag-tabs">
          <button type="button" class="mn-ag-tab active" id="mn-ag-tab-ai" data-ag-tab="ai">✨ AI Dựng từ Đề / Ảnh</button>
          <button type="button" class="mn-ag-tab" id="mn-ag-tab-tikz" data-ag-tab="tikz">📐 Nạp TikZ Chuẩn</button>
          <button type="button" class="mn-ag-tab" id="mn-ag-tab-json" data-ag-tab="json">🔄 JSON &amp; Chuyển Động</button>
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
              <div class="mn-ag-stage" data-stage="2"><span>○</span> 2. Kiểm chứng &amp; tự sửa lỗi ràng buộc điểm - giao tuyến - nét khuất</div>
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

          <!-- TAB 3: JSON & CHUYỂN ĐỘNG (MINNOTE ⇄ EXTERNAL AI ⇄ BETATIKZ) -->
          <div id="mn-ag-pane-json" style="display:none;flex-direction:column;gap:9px;">
            <div class="mn-ag-json-toolbar">
              <div class="mn-ag-json-toolbar-left">
                <input type="file" id="mn-ag-json-file" accept=".json,.betatikz.json,application/json,text/plain" style="display:none;" />
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-btn-load-json" title="Chọn tệp .json hoặc .betatikz.json từ máy">📂 Mở tệp .json / .betatikz.json</button>
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-btn-heal-json" title="Kiểm chứng & tự sửa lỗi JSON hình học ngay trong ô">🩺 Tự kiểm &amp; Sửa lỗi</button>
              </div>
              <div class="mn-ag-json-toolbar-right">
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-btn-clear-json" title="Xóa nội dung ô JSON">⌫ Xóa</button>
              </div>
            </div>

            <textarea id="mn-ag-json-input" class="mn-ag-textarea json-io" spellcheck="false" placeholder="Dán JSON dựng hình (chuẩn mn-geo-motion/2.0, AI ops JSON từ ChatGPT/Claude/Gemini/DeepSeek, hoặc dự án BetaTikz tikzvid-project/1)... Kéo thả tệp .json vào đây cũng được!"></textarea>

            <div class="mn-ag-stats" id="mn-ag-json-stats">
              <span class="mn-ag-stat-pill">Hỗ trợ mn-geo-motion/2.0 · AI ops JSON · BetaTikz tikzvid-project/1</span>
            </div>

            <div class="mn-ag-motion-box" id="mn-ag-motion-controls">
              <div class="mn-ag-motion-row">
                <span class="mn-ag-motion-lbl">Phong cách (Preset):</span>
                <div class="mn-ag-preset-group" id="mn-ag-motion-presets">
                  <button type="button" class="mn-ag-preset-chip active" data-ag-preset="domiinh">✨ Đỗ Miinh</button>
                  <button type="button" class="mn-ag-preset-chip" data-ag-preset="manim">🎬 Manim</button>
                  <button type="button" class="mn-ag-preset-chip" data-ag-preset="3d_standard">🧊 3D Chuẩn</button>
                </div>
              </div>

              <div class="mn-ag-motion-row">
                <label class="mn-ag-motion-lbl" for="mn-ag-default-effect">Hiệu ứng bước mặc định:</label>
                <select id="mn-ag-default-effect" class="mn-ag-fx-select">
                  <option value="chalk" selected>🖍 Phấn bảng</option>
                  <option value="draw">✏ Vẽ nét</option>
                  <option value="glow">✨ Phát sáng</option>
                  <option value="pop">⚡ Nảy điểm</option>
                </select>
              </div>

              <div class="mn-ag-options">
                <label class="mn-ag-check">
                  <input type="checkbox" id="mn-ag-opt-handpen" checked />
                  <span>Tay cầm bút</span>
                </label>
                <label class="mn-ag-check">
                  <input type="checkbox" id="mn-ag-opt-camera" checked />
                  <span>Camera lò xo</span>
                </label>
                <label class="mn-ag-check">
                  <input type="checkbox" id="mn-ag-opt-orbit3d" />
                  <span>Tự xoay 3D 360°</span>
                </label>
                <label class="mn-ag-check">
                  <input type="checkbox" id="mn-ag-opt-loop" checked />
                  <span>Vòng lặp Video (Loop)</span>
                </label>
              </div>
            </div>

            <div class="mn-ag-export-grid">
              <button type="button" class="mn-ag-export-btn accent" id="mn-ag-export-full" title="Xuất hình & kịch bản trên bảng ra chuẩn mn-geo-motion/2.0 đầy đủ">📤 Xuất JSON Chuẩn (mn-geo-motion/2.0)</button>
              <button type="button" class="mn-ag-export-btn" id="mn-ag-export-compact" title="Chép JSON siêu gọn tiết kiệm token để gửi cho AI khác phân tích/mở rộng">🤖 Chép JSON Gọn cho AI khác</button>
              <button type="button" class="mn-ag-export-btn accent" id="mn-ag-export-betatikz" title="Mở Studio TikZ Chuyển Động / Xuất dự án Video Loop cho BetaTikz">🎬 Xuất TikZ Chuyển Động / BetaTikz</button>
              <button type="button" class="mn-ag-export-btn" id="mn-ag-copy-prompt" title="Chép Prompt chuẩn khóa 5 cổng để dán vào ChatGPT, Claude, Gemini, DeepSeek rồi lấy JSON dán ngược vào đây">📋 Chép Prompt Mẫu Chuẩn</button>
            </div>
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
        <div class="mn-ag-foot" id="mn-ag-foot-json" style="display:none;">
          <button type="button" class="mn-ag-btn" id="mn-ag-insert-json-now">Chèn tĩnh</button>
          <button type="button" class="mn-ag-btn primary" id="mn-ag-run-json">🚀 Nạp JSON &amp; Chạy Chuyển Động</button>
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

    // Wire common modal actions
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
        modalState.autoSwitchedFromModel = '';
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

    // Image Dropzone click / file input / drag-drop
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

    // Paste image inside AI tab without leaking to board paste handler
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

    // Wire Tab 3: JSON & Motion controls
    const jsonFileInp = bd.querySelector('#mn-ag-json-file');
    const jsonTa = bd.querySelector('#mn-ag-json-input');
    let jsonTimer = 0;

    const loadJsonFileObj = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const txt = String((ev.target && ev.target.result) || '');
        jsonTa.value = txt;
        setError('');
        updateJsonPreviewStats();
        showAppToast(`📂 Đã nạp tệp "${file.name}"`, 'success');
      };
      reader.readAsText(file, 'utf-8');
    };

    bd.querySelector('#mn-ag-btn-load-json').addEventListener('click', () => jsonFileInp.click());
    jsonFileInp.addEventListener('change', () => {
      const f = jsonFileInp.files && jsonFileInp.files[0];
      if (f) loadJsonFileObj(f);
      jsonFileInp.value = '';
    });

    jsonTa.addEventListener('dragover', (e) => {
      e.preventDefault();
      jsonTa.classList.add('dragover');
    });
    jsonTa.addEventListener('dragleave', () => jsonTa.classList.remove('dragover'));
    jsonTa.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) {
        e.preventDefault();
        e.stopPropagation();
        jsonTa.classList.remove('dragover');
        loadJsonFileObj(f);
      }
    });

    jsonTa.addEventListener('input', () => {
      clearTimeout(jsonTimer);
      jsonTimer = setTimeout(updateJsonPreviewStats, 180);
    });

    bd.querySelector('#mn-ag-btn-clear-json').addEventListener('click', () => {
      jsonTa.value = '';
      setError('');
      updateJsonPreviewStats();
      jsonTa.focus();
    });

    bd.querySelector('#mn-ag-btn-heal-json').addEventListener('click', () => {
      const raw = (jsonTa.value || '').trim();
      if (!raw) {
        setError('Vui lòng dán JSON dựng hình trước khi kiểm chứng & sửa lỗi.');
        return;
      }
      try {
        setError('');
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.format === 'tikzvid-project/1') {
          jsonTa.value = JSON.stringify(parsed, null, 2);
          updateJsonPreviewStats();
          showAppToast('✅ Tệp dự án BetaTikz (tikzvid-project/1) hợp lệ!', 'success');
          return;
        }
        const healed = validateAndHealAiGeoPlan(raw, getModalMotionControls(bd));
        const cleanCopy = { ...healed };
        delete cleanCopy.healReport;
        jsonTa.value = JSON.stringify(cleanCopy, null, 2);
        updateJsonPreviewStats(healed.healReport);
        showAppToast(
          healed.healReport.fixedCount > 0
            ? `🩺 Đã tự động sửa ${healed.healReport.fixedCount} lỗi hình học / cú pháp!`
            : '✅ Kịch bản JSON đạt chuẩn hình học 100%!',
          'success'
        );
      } catch (err) {
        setError((err && err.message) ? err.message : 'Không thể phân tích JSON.');
      }
    });

    bd.querySelectorAll('[data-ag-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.agPreset || 'domiinh';
        modalState.motionPreset = p;
        bd.querySelectorAll('[data-ag-preset]').forEach(x => x.classList.toggle('active', x === btn));
        const fxSel = bd.querySelector('#mn-ag-default-effect');
        const orbChk = bd.querySelector('#mn-ag-opt-orbit3d');
        if (fxSel) {
          if (p === 'domiinh') fxSel.value = 'chalk';
          else if (p === 'manim') fxSel.value = 'glow';
          else if (p === '3d_standard') fxSel.value = 'draw';
          modalState.defaultEffect = fxSel.value;
        }
        if (orbChk && p === '3d_standard') {
          orbChk.checked = true;
        }
      });
    });

    const fxSelectEl = bd.querySelector('#mn-ag-default-effect');
    if (fxSelectEl) {
      fxSelectEl.addEventListener('change', () => {
        modalState.defaultEffect = fxSelectEl.value || 'chalk';
      });
    }

    // Export & Interop Buttons inside Tab 3
    bd.querySelector('#mn-ag-export-full').addEventListener('click', async () => {
      await handleExportMotionJson(bd, 'full');
    });

    bd.querySelector('#mn-ag-export-compact').addEventListener('click', async () => {
      await handleExportMotionJson(bd, 'compact_llm');
    });

    bd.querySelector('#mn-ag-export-betatikz').addEventListener('click', async () => {
      setError('');
      const mCtrl = getModalMotionControls(bd);
      if (window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.openStudioModal === 'function') {
        closeModal();
        window.MinNoteMotionBridge.openStudioModal('betatikz', mCtrl);
        return;
      }
      if (window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.exportBetaTikzAnimated === 'function') {
        try {
          const res = window.MinNoteMotionBridge.exportBetaTikzAnimated({
            preset: mCtrl.preset,
            loop: mCtrl.loop,
            fps: 24,
            durationSec: 8
          });
          const tikzOut = (res && (res.outTikz || res.animateInlineTex)) || '';
          if (tikzOut) {
            await copyTextSafe(tikzOut);
            showAppToast('🎬 Đã chép mã TikZ Chuyển Động (BetaTikz) vào Clipboard!', 'success');
            return;
          }
        } catch (err) {
          setError((err && err.message) ? err.message : 'Không xuất được TikZ chuyển động.');
          return;
        }
      }
      setError('Bộ xuất TikZ Chuyển Động / BetaTikz (MinNoteMotionBridge) chưa sẵn sàng hoặc chưa có hình trên bảng.');
    });

    bd.querySelector('#mn-ag-copy-prompt').addEventListener('click', async () => {
      setError('');
      const promptTa = bd.querySelector('#mn-ag-prompt');
      const probTxt = promptTa ? promptTa.value : '';
      const mCtrl = getModalMotionControls(bd);
      const readyPrompt = buildCompactExternalPrompt(probTxt, mCtrl);
      await copyTextSafe(readyPrompt);
      showAppToast('📋 Đã chép Prompt Mẫu Chuẩn! Hãy dán vào ChatGPT/Claude/Gemini/DeepSeek rồi dán JSON trả về vào đây.', 'success');
    });

    // Primary Run Buttons across 3 Tabs
    bd.querySelector('#mn-ag-run-ai').addEventListener('click', runAiConstruction);
    bd.querySelector('#mn-ag-run-tikz').addEventListener('click', () => runTikzImport(true));
    bd.querySelector('#mn-ag-insert-tikz-now').addEventListener('click', () => runTikzImport(false));
    bd.querySelector('#mn-ag-run-json').addEventListener('click', () => runJsonImport(true));
    bd.querySelector('#mn-ag-insert-json-now').addEventListener('click', () => runJsonImport(false));

    return bd;
  }

  async function handleExportMotionJson(bd, mode) {
    setError('');
    const mCtrl = getModalMotionControls(bd);
    const jsonTa = bd.querySelector('#mn-ag-json-input');

    try {
      let exported = null;
      if (window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.exportMotionJson === 'function') {
        exported = window.MinNoteMotionBridge.exportMotionJson({
          mode,
          preset: mCtrl.preset,
          defaultEffect: mCtrl.defaultEffect,
          handPen: mCtrl.handPen,
          followCamera: mCtrl.followCamera,
          orbit3d: mCtrl.orbit3d,
          loop: mCtrl.loop
        });
      } else {
        // Clean local fallback reading current board geometry
        const b = getBoard();
        const pageIdx = b && typeof b.currentPage === 'function' ? b.currentPage() : 0;
        const pg = b && b.doc && Array.isArray(b.doc.pages) ? b.doc.pages[pageIdx] : null;
        if (!pg || !pg.geo || !Object.keys(pg.geo.points || {}).length) {
          throw new Error('Trên trang hiện tại chưa có hình học nào để xuất JSON.');
        }
        const ops = convertGeometryBlockToOps({
          points: Object.values(pg.geo.points || {}),
          shapes: pg.geo.shapes || []
        });
        exported = mode === 'compact_llm'
          ? {
              schema: 'mn-geo-motion/2.0',
              meta: { title: 'Hình từ MinNote' },
              ops,
              motion: {
                preset: mCtrl.preset,
                defaultEffect: mCtrl.defaultEffect,
                loop: mCtrl.loop,
                handPen: mCtrl.handPen,
                followCamera: mCtrl.followCamera,
                orbit3d: mCtrl.orbit3d
              }
            }
          : {
              schema: 'mn-geo-motion/2.0',
              meta: { title: 'Hình từ MinNote', exportedAt: new Date().toISOString() },
              ops,
              geometry: {
                points: Object.values(pg.geo.points || {}),
                shapes: pg.geo.shapes || []
              },
              motion: {
                preset: mCtrl.preset,
                defaultEffect: mCtrl.defaultEffect,
                fps: 24,
                durationSec: 8,
                holdEndSec: 1,
                loop: mCtrl.loop,
                handPen: mCtrl.handPen,
                followCamera: mCtrl.followCamera,
                orbit3d: mCtrl.orbit3d,
                steps: []
              }
            };
      }

      if (!exported) {
        throw new Error('Chưa có đối tượng hình học nào trên trang để xuất JSON.');
      }
      const jsonText = typeof exported === 'string'
        ? exported
        : JSON.stringify(exported, null, mode === 'compact_llm' ? 0 : 2);
      if (jsonTa) {
        jsonTa.value = typeof exported === 'string' ? exported : JSON.stringify(exported, null, 2);
        updateJsonPreviewStats();
      }
      await copyTextSafe(jsonText);
      showAppToast(
        mode === 'compact_llm'
          ? '🤖 Đã chép JSON Gọn cho AI khác vào Clipboard!'
          : '📤 Đã xuất & chép JSON Chuẩn (mn-geo-motion/2.0) vào Clipboard!',
        'success'
      );
    } catch (err) {
      setError((err && err.message) ? err.message : 'Không thể xuất JSON hình học.');
    }
  }

  function updateJsonPreviewStats(precomputedReport) {
    const bd = ensureModal();
    if (!bd) return;
    const raw = (bd.querySelector('#mn-ag-json-input').value || '').trim();
    const statsEl = bd.querySelector('#mn-ag-json-stats');
    if (!statsEl) return;

    if (!raw) {
      statsEl.innerHTML = '<span class="mn-ag-stat-pill">Hỗ trợ mn-geo-motion/2.0 · AI ops JSON · BetaTikz tikzvid-project/1</span>';
      return;
    }

    try {
      const parsed = extractJsonObject(raw);
      if (parsed && parsed.format === 'tikzvid-project/1') {
        const revCnt = Array.isArray(parsed.revisions) ? parsed.revisions.length : 0;
        const hasOut = !!(parsed.state && (parsed.state.out_tikz || parsed.state.tikz));
        statsEl.innerHTML = [
          '<span class="mn-ag-stat-pill ok">Dự án BetaTikz (tikzvid-project/1)</span>',
          `<span class="mn-ag-stat-pill">${hasOut ? 'Có mã out_tikz chuyển động' : 'Tĩnh'}</span>`,
          revCnt ? `<span class="mn-ag-stat-pill">${revCnt} phiên bản</span>` : ''
        ].filter(Boolean).join('');
        return;
      }

      const rep = precomputedReport || validateAndHealAiGeoPlan(raw, getModalMotionControls(bd)).healReport;
      const schemaTag = (parsed && parsed.schema) ? String(parsed.schema) : 'AI ops JSON';
      const pills = [
        `<span class="mn-ag-stat-pill ok">${schemaTag}</span>`,
        `<span class="mn-ag-stat-pill">${rep.stats.pointCount} điểm · ${rep.stats.totalOps} lệnh (${rep.stats.is3D ? '3D' : '2D'})</span>`
      ];
      if (rep.fixedCount > 0) {
        pills.push(`<span class="mn-ag-stat-pill ok" title="${rep.fixes.join(' | ').replace(/"/g, '&quot;')}">🩺 Tự sửa ${rep.fixedCount} chi tiết</span>`);
      }
      if (rep.warnings && rep.warnings.length > 0) {
        pills.push(`<span class="mn-ag-stat-pill warn" title="${rep.warnings.join(' | ').replace(/"/g, '&quot;')}">⚠ ${rep.warnings.length} lưu ý</span>`);
      }
      statsEl.innerHTML = pills.join('');
    } catch (err) {
      const msg = String(err && err.message ? err.message : err).slice(0, 56);
      statsEl.innerHTML = `<span class="mn-ag-stat-pill warn">JSON chưa hợp lệ: ${msg}</span>`;
    }
  }

  async function runJsonImport(animate = true) {
    const bd = ensureModal();
    const b = getBoard();
    if (!bd || !b) return;
    const raw = (bd.querySelector('#mn-ag-json-input').value || '').trim();
    if (!raw) {
      setError('Vui lòng dán JSON dựng hình hoặc chọn tệp .json / .betatikz.json trước khi nạp.');
      return;
    }

    const mCtrl = getModalMotionControls(bd);
    setError('');
    setBusy(true);

    try {
      const parsed = extractJsonObject(raw);
      const isBetaTikz = !!(parsed && parsed.format === 'tikzvid-project/1');
      const hasDirectGeometry = !!(parsed && parsed.geometry && parsed.geometry.points && (Array.isArray(parsed.geometry.points) ? parsed.geometry.points.length : Object.keys(parsed.geometry.points).length));

      let payloadToImport = parsed;
      let healedPlan = null;
      if (!isBetaTikz && !hasDirectGeometry) {
        healedPlan = validateAndHealAiGeoPlan(raw, mCtrl);
        healedPlan.motion = {
          ...(healedPlan.motion || {}),
          preset: (parsed.motion && parsed.motion.preset) || mCtrl.preset,
          defaultEffect: (parsed.motion && parsed.motion.defaultEffect) || mCtrl.defaultEffect,
          handPen: mCtrl.handPen,
          followCamera: mCtrl.followCamera,
          orbit3d: mCtrl.orbit3d,
          loop: mCtrl.loop
        };
        const cleanPlan = { ...healedPlan };
        delete cleanPlan.healReport;
        payloadToImport = cleanPlan;
      }

      // Primary path: delegate to MinNoteMotionBridge.importMotionJson when loaded
      if (window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.importMotionJson === 'function') {
        const bridgeRes = await window.MinNoteMotionBridge.importMotionJson(payloadToImport, {
          preset: mCtrl.preset,
          defaultEffect: mCtrl.defaultEffect,
          handPen: mCtrl.handPen,
          followCamera: mCtrl.followCamera,
          orbit3d: mCtrl.orbit3d,
          loop: mCtrl.loop,
          autoPlay: !!animate,
          anchorBox: modalState.anchorBox || undefined
        });
        if (bridgeRes) {
          closeModal();
          showAppToast(
            animate
              ? '🚀 Đã nạp JSON & khởi chạy kịch bản chuyển động!'
              : '✅ Đã chèn hình từ JSON lên bảng!',
            'success'
          );
          return;
        }
      }

      // Built-in fallback path (compileAiGeoPlan or BetaTikz TikZ extractor)
      if (isBetaTikz) {
        const tikzSrc = (parsed.state && (parsed.state.out_tikz || parsed.state.tikz)) || '';
        if (!tikzSrc.trim()) throw new Error('Tệp BetaTikz không chứa mã TikZ hợp lệ.');
        const tikzTa = bd.querySelector('#mn-ag-tikz-input');
        if (tikzTa) tikzTa.value = tikzSrc;
        await runTikzImport(animate);
        return;
      }

      const compiled = compileAiGeoPlan(healedPlan || payloadToImport, b, modalState.anchorBox);
      b.commit(b.addGeo(compiled.pageIdx, compiled.points, compiled.shapes));

      const ptIds = compiled.points.map(p => p.id);
      const shIds = compiled.shapes.map(s => s.id);
      const replayStylePreset = mCtrl.preset === '3d_standard' ? 'geo3d' : mCtrl.preset;

      closeModal();

      if (animate && window.MinNoteGeoReplay && typeof window.MinNoteGeoReplay.launchConstructedFigure === 'function') {
        const session = window.MinNoteGeoReplay.launchConstructedFigure({
          pageIdx: compiled.pageIdx,
          pointIds: ptIds,
          shapeIds: shIds,
          steps: compiled.steps,
          title: compiled.title,
          speed: (compiled.motion && compiled.motion.speed) || 1,
          stylePreset: replayStylePreset,
          viewMode: 'pill',
          autoPlay: true,
          handPen: mCtrl.handPen,
          followCamera: mCtrl.followCamera
        });
        if (session && mCtrl.orbit3d) {
          session.autoOrbitAfter = true;
        }
      } else {
        b.setTool({ k: 'select' });
        b.sel = { page: compiled.pageIdx, strokes: new Set(), items: new Set(), points: new Set(ptIds), shapes: new Set(shIds) };
        b.redraw();
        b.emit();
      }

      showAppToast(
        animate
          ? `🚀 Đang chạy "${compiled.title}" (${compiled.steps.length} bước)`
          : `✅ Đã chèn hình "${compiled.title}"`,
        'success'
      );
    } catch (err) {
      setError((err && err.message) ? err.message : 'Lỗi nạp dữ liệu JSON dựng hình.');
    } finally {
      setBusy(false);
    }
  }

  function setError(msg) {
    const bd = ensureModal();
    if (!bd) return;
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
    if (!bd) return;
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

  function isHeavyAntigravityModelForImage(mod) {
    const m = String(mod || '').trim();
    return /(?:^|-)(?:high|xhigh)$/i.test(m) || /orchestrator|^gpt-oss|^claude-opus/i.test(m);
  }

  function autoSwitchAntigravityModelForImage() {
    if (modalState.selectedProvider !== 'Antigravity' || !modalState.imgBase64) return false;
    const cur = modalState.selectedModel || '';
    if (!isHeavyAntigravityModelForImage(cur)) return false;

    const targetFastModel = 'gemini-3.8-flash-low';
    modalState.autoSwitchedFromModel = cur;
    modalState.selectedModel = targetFastModel;

    const bd = hasDoc ? document.getElementById('mn-ai-geo-backdrop') : null;
    const modSel = bd && bd.querySelector('#mn-ag-model-select');
    if (modSel) {
      const hasOpt = Array.from(modSel.options).some(o => o.value === targetFastModel);
      if (!hasOpt) {
        const opt = document.createElement('option');
        opt.value = targetFastModel;
        opt.textContent = targetFastModel;
        modSel.insertBefore(opt, modSel.firstChild);
      }
      modSel.value = targetFastModel;
    }

    if (hasWindow && window.MinNoteMeaSync && typeof window.MinNoteMeaSync.request === 'function') {
      window.MinNoteMeaSync.request('MEA_SAVE_AI_CONFIG', {
        provider: 'Antigravity',
        model: targetFastModel,
        keyEdited: false,
        clearKey: false
      }, 10000).catch(() => {});
    }
    updateModalSpeedHint();
    return true;
  }

  function updateModalSpeedHint() {
    const bd = hasDoc ? document.getElementById('mn-ai-geo-backdrop') : null;
    const hintEl = bd && bd.querySelector('#mn-ag-model-hint');
    if (!hintEl) return;
    const prov = modalState.selectedProvider || '';
    const mod = modalState.selectedModel || '';
    if (prov === 'Antigravity' && modalState.autoSwitchedFromModel && mod === 'gemini-3.8-flash-low') {
      hintEl.textContent = `⚡ Đã tự động chuyển từ ${modalState.autoSwitchedFromModel} sang gemini-3.8-flash-low để đọc ảnh đề bài siêu tốc (~40 giây, chống treo timeout 4m0s).`;
      hintEl.style.display = 'block';
    } else if (prov === 'Antigravity' && isHeavyAntigravityModelForImage(mod)) {
      hintEl.textContent = `⚡ Đã bật chế độ Tăng tốc Đọc ảnh cho ${mod}: tự động định tuyến sang gemini-3.8-flash-low khi có ảnh để dựng hình trong ~40 giây (không bị timeout).`;
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
    const bd = hasDoc ? document.getElementById('mn-ai-geo-backdrop') : null;
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
    if (!autoSwitchAntigravityModelForImage()) {
      updateModalSpeedHint();
    }
  }

  async function syncModalAiSelector() {
    if (!hasWindow || !window.MinNoteMeaSync || typeof window.MinNoteMeaSync.request !== 'function') return;
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
    if (!bd) return;
    const runBtn = bd.querySelector('#mn-ag-run-ai');
    const tikzBtn = bd.querySelector('#mn-ag-run-tikz');
    const jsonBtn = bd.querySelector('#mn-ag-run-json');
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
    if (jsonBtn) jsonBtn.disabled = isBusy;
    if (modSel) modSel.disabled = isBusy;
  }

  function setTab(tabName) {
    modalState.tab = (tabName === 'tikz' || tabName === 'json') ? tabName : 'ai';
    const bd = ensureModal();
    if (!bd) return;
    bd.querySelectorAll('[data-ag-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.agTab === modalState.tab);
    });
    bd.querySelector('#mn-ag-pane-ai').style.display = modalState.tab === 'ai' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-pane-tikz').style.display = modalState.tab === 'tikz' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-pane-json').style.display = modalState.tab === 'json' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-foot-ai').style.display = modalState.tab === 'ai' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-foot-tikz').style.display = modalState.tab === 'tikz' ? 'flex' : 'none';
    bd.querySelector('#mn-ag-foot-json').style.display = modalState.tab === 'json' ? 'flex' : 'none';
    setError('');
    if (modalState.tab === 'tikz') updateTikzPreviewStats();
    else if (modalState.tab === 'json') updateJsonPreviewStats();
  }

  function attachImageData(dataUrl, base64, mime, badgeText) {
    modalState.imgDataUrl = dataUrl;
    modalState.imgBase64 = base64;
    modalState.imgMime = mime || 'image/png';
    modalState.imgSourceLabel = badgeText || 'Ảnh sẵn sàng';
    const bd = ensureModal();
    if (!bd) return;
    const dz = bd.querySelector('#mn-ag-dropzone');
    dz.classList.add('has-img');
    bd.querySelector('#mn-ag-thumb').src = dataUrl;
    bd.querySelector('#mn-ag-img-badge').textContent = modalState.imgSourceLabel;
    autoSwitchAntigravityModelForImage();
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
    modalState.autoSwitchedFromModel = '';
    const bd = ensureModal();
    if (!bd) return;
    bd.querySelector('#mn-ag-dropzone').classList.remove('has-img');
    bd.querySelector('#mn-ag-thumb').removeAttribute('src');
    updateModalSpeedHint();
  }

  function updateTikzPreviewStats() {
    const bd = ensureModal();
    if (!bd) return;
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
    if (!bd || !b) return;
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

      const rawContent = aiRes && (aiRes.content || aiRes.text || aiRes);
      const healedPlan = validateAndHealAiGeoPlan(rawContent);
      const compiled = compileAiGeoPlan(healedPlan, b, modalState.anchorBox);

      // Populate JSON tab with healed plan so user can inspect / export right away
      const jsonTa = bd.querySelector('#mn-ag-json-input');
      if (jsonTa) {
        const cleanOut = { ...healedPlan };
        delete cleanOut.healReport;
        jsonTa.value = JSON.stringify(cleanOut, null, 2);
      }

      setStage(3);
      b.commit(b.addGeo(compiled.pageIdx, compiled.points, compiled.shapes));

      const ptIds = compiled.points.map(p => p.id);
      const shIds = compiled.shapes.map(s => s.id);
      const m = compiled.motion || {};
      const stylePreset = m.preset === '3d_standard' ? 'geo3d' : (m.preset || '');

      closeModal();

      if (wantAnimate && window.MinNoteGeoReplay && typeof window.MinNoteGeoReplay.launchConstructedFigure === 'function') {
        window.MinNoteGeoReplay.launchConstructedFigure({
          pageIdx: compiled.pageIdx,
          pointIds: ptIds,
          shapeIds: shIds,
          steps: compiled.steps,
          title: compiled.title,
          speed: m.speed || 1,
          stylePreset,
          viewMode: 'pill',
          autoPlay: true,
          handPen: m.handPen !== false,
          followCamera: false
        });
      } else {
        b.setTool({ k: 'select' });
        b.sel = { page: compiled.pageIdx, strokes: new Set(), items: new Set(), points: new Set(ptIds), shapes: new Set(shIds) };
        b.redraw();
        b.emit();
      }

      const healSuffix = compiled.healReport && compiled.healReport.fixedCount > 0
        ? ` · Tự sửa ${compiled.healReport.fixedCount} chi tiết`
        : '';
      showAppToast(
        wantAnimate
          ? `✨ AI đang dựng từng nét "${compiled.title}" (${compiled.steps.length} bước${healSuffix})`
          : `✨ Đã chèn hình "${compiled.title}"${healSuffix}`,
        'success'
      );
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
    if (!bd || !b || !K || typeof K.uC !== 'function') {
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
    const bd = hasDoc ? document.getElementById('mn-ai-geo-backdrop') : null;
    if (bd) bd.classList.remove('open');
  }

  async function openModal(opts = {}) {
    const bd = ensureModal();
    if (!bd) return;
    modalState.open = true;
    modalState.anchorBox = opts.anchorBox || null;
    setError('');
    setStage(0);

    if (opts.tab) setTab(opts.tab);
    else setTab('ai');

    const promptTa = bd.querySelector('#mn-ag-prompt');
    const tikzTa = bd.querySelector('#mn-ag-tikz-input');
    const jsonTa = bd.querySelector('#mn-ag-json-input');

    if (opts.clearImage) clearAttachedImage();
    if (opts.prompt !== undefined && promptTa) promptTa.value = opts.prompt;
    if (opts.tikz !== undefined && tikzTa) {
      tikzTa.value = opts.tikz;
      updateTikzPreviewStats();
    }
    if (opts.json !== undefined && jsonTa) {
      jsonTa.value = typeof opts.json === 'string' ? opts.json : JSON.stringify(opts.json, null, 2);
      updateJsonPreviewStats();
    }
    if (opts.imageSrc) {
      try {
        const parsed = await dataUrlFromImageSrc(opts.imageSrc);
        if (parsed) {
          const resSuffix = (parsed.width && normalizedWidthOk(parsed)) ? ` (${parsed.width}×${parsed.height})` : '';
          attachImageData(parsed.dataUrl, parsed.base64, parsed.mimeType, (opts.imageSourceLabel || 'Ảnh từ mục đang chọn') + resSuffix);
        }
      } catch {}
    }

    syncModalAiSelector();
    bd.classList.add('open');
    setTimeout(() => {
      if (modalState.tab === 'tikz' && tikzTa) tikzTa.focus();
      else if (modalState.tab === 'json' && jsonTa) jsonTa.focus();
      else if (promptTa) promptTa.focus();
    }, 30);
  }

  function normalizedWidthOk(p) {
    return !!(p && p.width && p.height);
  }

  const api = {
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
    AI_GEO_SYSTEM_PROMPT,
    buildCompactExternalPrompt,
    parseMathNumber,
    sanitizeLlmJsonText,
    extractJsonObject,
    validateAndHealAiGeoPlan,
    refineTikzConstraints,
    compileAiGeoPlan,
    buildOrderedStepsForTikz
  };

  if (root && typeof root === 'object') {
    root.MinNoteAiGeo = api;
  }
  if (hasWindow) {
    window.MinNoteAiGeo = api;
    window.toggleAiGeoStudio = function (opts) {
      if (modalState.open) closeModal();
      else openModal(opts || {});
    };
  }

  if (hasWindow && hasDoc) {
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
        else if (modalState.tab === 'tikz') runTikzImport(true);
        else if (modalState.tab === 'json') runJsonImport(true);
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
