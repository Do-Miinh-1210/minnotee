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
 * MinNote v0.0.9.11 — AI Dựng Hình Từng Nét, Tự Động Kiểm Chứng/Sửa Lỗi Hình Học & Nạp/Lưu Chuẩn JSON
 * - Nút #tb-btn-ai-geo cạnh Sơ Đồ Tư Duy + nút ✨ AI Dựng hình trên thanh chọn ảnh/đề bài
 * - Bộ kiểm chứng & tự sửa lỗi hình học AI (validateAndHealAiGeoPlan): chống tứ giác tự cắt (bow-tie),
 *   chống giao điểm song song / chéo nhau 3D, chống bẫy giả trung điểm 0.5, lật đỉnh S bị ngược trục Y,
 *   sắp xếp topo phá vòng lặp phụ thuộc, tính an toàn biểu thức toán ("sqrt(3)/2") không dùng trình thực thi động.
 * - Tab 3 "📦 Nạp / Lưu JSON": Prompt dựng hình chi tiết 20 công cụ cho AI ngoài & luồng nạp/lưu chuẩn mn-geo-motion/2.0 gọn sạch.
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
          let k = Number.isFinite(Number(d.k)) ? Number(d.k) : 0.5;
          if (d.seg) k = Math.min(1, Math.max(0, k));
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
            // Match live kernel Hg({x, y}) = {x: y, y: -x} in Canvas (+y DOWN) space (= +90° CCW in Math +y UP space)
            if (d.perp) { const tmp = dx; dx = dy; dy = -tmp; }
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
        } else if (d.t === 'rot') {
          const c = evalPt(d.c), p = evalPt(d.p);
          if (c && p) {
            const rad = ((Number(d.ang) || 0) * Math.PI) / 180;
            const k = Number.isFinite(Number(d.k)) ? Number(d.k) : 1;
            const dx = p.x - c.x, dy = p.y - c.y;
            const cs = Math.cos(rad), sn = Math.sin(rad);
            res = { x: c.x + (dx * cs - dy * sn) * k, y: c.y + (dx * sn + dy * cs) * k };
          }
        } else if (d.t === 'bis') {
          const a = evalPt(d.a), o = evalPt(d.o), b = evalPt(d.b);
          if (a && o && b) {
            const d1 = Math.hypot(a.x - o.x, a.y - o.y), d2 = Math.hypot(b.x - o.x, b.y - o.y);
            if (d1 > 1e-9 && d2 > 1e-9) {
              let lx = (a.x - o.x) / d1 + (b.x - o.x) / d2;
              let ly = (a.y - o.y) / d1 + (b.y - o.y) / d2;
              const m = Math.hypot(lx, ly);
              if (m < 1e-9) { lx = (a.y - o.y) / d1; ly = -(a.x - o.x) / d1; }
              else { lx /= m; ly /= m; }
              res = { x: o.x + lx * d1, y: o.y + ly * d1 };
            }
          }
        } else if (d.t === 'ctan' && Array.isArray(d.c1) && Array.isArray(d.c2)) {
          const p1 = evalPt(d.c1[0]), p2 = evalPt(d.c1[1]), p3 = evalPt(d.c2[0]), p4 = evalPt(d.c2[1]);
          if (p1 && p2 && p3 && p4) {
            const r1 = Math.hypot(p2.x - p1.x, p2.y - p1.y), r2 = Math.hypot(p4.x - p3.x, p4.y - p3.y);
            const dx = p3.x - p1.x, dy = p3.y - p1.y, dist = Math.hypot(dx, dy);
            if (dist > 1e-9) {
              const l = (d.inner ? -(r1 + r2) : (r2 - r1)) / dist;
              if (Math.abs(l) <= 1) {
                const ux = dx / dist, uy = dy / dist;
                const h = Math.sqrt(Math.max(0, 1 - l * l)) * (d.which ? -1 : 1);
                const nx = ux * l + uy * h, ny = uy * l - ux * h;
                const t1 = { x: p1.x - nx * r1, y: p1.y - ny * r1 };
                const t2 = d.inner ? { x: p3.x + nx * r2, y: p3.y + ny * r2 } : { x: p3.x - nx * r2, y: p3.y - ny * r2 };
                res = d.on === 2 ? t2 : t1;
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
  const getRigidity = () => {
    if (root && root.MinNoteGeoRigidity) return root.MinNoteGeoRigidity;
    try {
      return typeof require === 'function' ? require('./minnote-geo-rigidity.js') : null;
    } catch (err) {
      return null;
    }
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

  // Shared "cha–con" rigidity rules (v0.0.9.14) — injected into every prompt sent to external AIs.
  const RIGIDITY_RULES_PROMPT = `LUẬT CHA–CON: KHÓA BẤT BIẾN HÌNH HỌC (BẮT BUỘC — MinNote thực thi đúng như vậy khi kéo thả)
A. Ba loại đối tượng:
   • CHA (kéo được): chỉ "point_free" / "points" / đỉnh gốc do macro tạo. Số cha = đúng số bậc tự do của hình:
     tam giác thường 3 | tam giác đều 2 | hình bình hành, hình thoi* 3 | hình chữ nhật 2 (+ chiều cao trượt) | hình vuông 2 |
     hình thang 3 (+ đáy nhỏ trượt) | hình lập phương 2 (A, B) | hộp chữ nhật / lăng trụ đứng: đáy + chiều cao trượt | chóp: đáy + S.
   • CON KHÓA (KHÔNG kéo được, chỉ đổi khi cha đổi): point_sum, midpoint, rotate, foot_perp, line_parallel, line_perp,
     intersection_ll/lc/cc, tangent_point, angle_bisector, circumcircle/incircle/orthocenter/centroid.
     → Song song, vuông góc, bằng nhau, góc quay đã tạo thì KHÔNG BAO GIỜ bị kéo lệch.
   • CON TRƯỢT (chỉ 1 bậc tự do, vẫn giữ tính chất): point_on_segment / point_on_line / point_on_circle = "điểm bất kỳ / di động"
     trượt trên đường của nó; line_parallel / line_perp + "drag": true = trượt dọc phương đã khóa (vẫn luôn // hoặc ⊥).
     Đề cho tỉ số cố định (AM = 2MD, SN = SD/3) ⇒ point_on_segment + "ratio" đúng + "lock": true (đóng đinh, không trượt).
B. CẤM dùng "point_free"/"points" cho điểm CON, kể cả khi đã tính đúng tọa độ (đỉnh C hình bình hành, đỉnh thứ 4 hình vuông,
   A'/B'/C'/D' lăng trụ, trung điểm, giao điểm…). Tọa độ đúng chỉ đúng ở khung đầu — kéo cha là méo hình.
C. Tính chất → công cụ khóa:
   • AB // = DC (hình bình hành, tịnh tiến, cạnh bên lăng trụ) → point_sum (C = B + D − A; B' = B + A' − A).
   • d qua M // AB (độ dài tự do) → line_parallel {through:M, line:"A-B"} (+ "drag":true nếu độ dài là tham số đề không cho).
   • d qua M ⊥ AB → line_perp; chân đường vuông góc → foot_perp.
   • Cạnh bằng nhau + góc cố định (tam giác đều 60°, vuông cân / hình vuông 90°) → rotate {center, point, angleDeg, k:1}.
   • Vị tự / đồng dạng → rotate với k ≠ 1 (angleDeg 0 hoặc 180).
D. HÌNH KHÔNG GIAN (phép chiếu song song chuẩn SGK):
   • Bảo toàn: song song, tỉ số 2 đoạn cùng phương, trung điểm, thẳng hàng. KHÔNG bảo toàn góc vuông & độ dài, TRỪ mặt chính diện.
   • 2 đường song song trong không gian ⇒ song song trên hình vẽ: dựng bằng point_sum (song song & bằng nhau) hoặc line_parallel.
   • Giao tuyến của 2 mặt chứa 2 đường song song ⇒ line_parallel. Thiết diện song song với một mặt ⇒ mỗi cạnh dựng bằng
     line_parallel + intersection_ll ĐỒNG PHẲNG; TUYỆT ĐỐI không chấm tay đỉnh thiết diện.
   • HÌNH LẬP PHƯƠNG: BẮT BUỘC {"op":"cube","name":"ABCD.A'B'C'D'","edge":3.2,"depthAngle":40|135,"depthRatio":0.5}.
     Mặt trước ABB'A' là HÌNH VUÔNG thật (A' = quay B quanh A 90°), các mặt còn lại là hình bình hành, 3 họ cạnh luôn // và bằng nhau.
     depthAngle < 90 ⇒ đỉnh khuất D; depthAngle > 90 ⇒ đỉnh khuất C (MinNote tự xét 3 cạnh nét đứt). Cha duy nhất: A, B.
   • Hộp chữ nhật / lăng trụ đứng: {"op":"prism",...,"upright":true} ⇒ AA' khóa ⊥ đáy (chỉ trượt chiều cao).
E. HÌNH PHẲNG VẼ RIÊNG (mặt trải phẳng, thiết diện vẽ thật cạnh khối): là hình 2D độc lập, góc vuông/độ dài thật:
   • id KHÁC id của khối (A1, B1, …) với "label":"A'" …; 2 cha đặt "flat": true, các điểm con kế thừa tự động.
   • Hình vuông: 2 cha + rotate 90° + point_sum; điểm trên cạnh lấy đúng ratio như trên khối + "lock": true khi đề cho tỉ số.
F. HÌNH PHẲNG 2D: tam giác đều → "equilateral_triangle"; hình vuông → "square_2d"; hình chữ nhật → 2 cha + line_perp("drag":true) + point_sum;
   hình bình hành → 3 cha + point_sum; hình thoi → 2 cha A, B + D = rotate(B quanh A, góc A, k:1) + point_sum;
   hình thang (AB // CD) → A, B, D cha + C = line_parallel {through:"D", line:"A-B", drag:true};
   tam giác vuông tại A → A, B cha + C = line_perp {through:"A", line:"A-B", drag:true};
   tam giác cân tại A → B, C cha + H = midpoint BC + A = line_perp {through:"H", line:"B-C", drag:true}.`;

  const AI_GEO_SYSTEM_PROMPT = `Bạn là chuyên gia Toán Hình học & Kỹ sư Dựng hình Tham số của MinNote.
Nhiệm vụ: Đọc đề bài (văn bản hoặc ảnh: đề tự luận/trắc nghiệm, bảng Đúng-Sai 4 ý, hoặc ảnh hình vẽ SGK/vẽ tay) -> tự kiểm chứng hình học ngầm theo 5 cổng -> xuất DUY NHẤT 1 đối tượng JSON dựng hình TỪNG NÉT SIÊU GỌN chuẩn xác.

ƯU TIÊN SỐ 1 — DÙNG BỘ LỆNH GỘP MACRO & CÚ PHÁP RÚT GỌN (TIẾT KIỆM 70% CODE, PHẢN HỒI NHANH GẤP 3 LẦN):
- BỎ QUA "label" khi trùng với "id" (MinNote tự động gán label = id cho mọi điểm không bắt đầu bằng "__"). Bỏ qua "dashed": false (mặc định là nét liền).
- VIẾT GỌN CẶP & BỘ BA ĐIỂM BẰNG CHUỖI: dùng "A-C" thay cho ["A","C"] (vd l1:"A-C", l2:"B-D"), "S-A-B" cho right_angle/angle_mark/angle_bisector, và bán kính số trực tiếp "r": 2.2 cho circle.
- DÙNG 1 LỆNH MACRO CHO KHỐI 3D & ĐƯỜNG TRÒN / TAM GIÁC ĐẶC BIỆT (thay vì viết rời 12–15 lệnh):
  + Chóp 3D: {"op":"pyramid","name":"S.ABCD","baseType":"quad"|"parallelogram"|"rect"|"square"|"rhombus"|"trapezoid"|"triangle","altitude":"free"|"SA"|"SB"|"face_SAB"|"center","height":3.8,"diagonals":true} (tự dựng chuẩn đỉnh, tự khóa hình bình hành/hình thang, tự phân loại nét liền/khuất và tự gắn góc vuông đường cao!).
  + Lăng trụ / Hình hộp: {"op":"prism","name":"ABC.A'B'C'","baseType":"triangle"|"parallelogram","upright":true,"height":3.5} (hoặc "ABCD.A'B'C'D'"; upright:true ⇒ AA' khóa ⊥ đáy).
  + Hình lập phương (BẮT BUỘC): {"op":"cube","name":"ABCD.A'B'C'D'","edge":3.2,"depthAngle":40,"depthRatio":0.5} (cha A, B; mặt trước là hình vuông thật).
  + Gộp nhiều điểm tự do: {"op":"points","pts":{"A":[-2.8,0.2],"B":[-1.7,-1.8],"C":[1.7,-2.2]}}
  + Nối gộp hàng loạt đoạn thẳng: {"op":"segments","solid":["B-M","M-N","M-I"],"dashed":["A-C","B-D","S-O"],"aux":true}
  + Macro hình phẳng 2D khóa động 100%:
    • Hai tiếp tuyến từ điểm ngoài: {"op":"tangents_from_point","p":"A","center":"O","rim":"R","pts":["B","C"],"drawRadii":true}
    • Đường tròn ngoại tiếp / nội tiếp: {"op":"circumcircle","center":"O","pts":["A","B","C"]} | {"op":"incircle","center":"I","foot":"D","pts":["A","B","C"]}
    • Trực tâm / Trọng tâm: {"op":"orthocenter","id":"H","pts":["A","B","C"],"drawAltitudes":true} | {"op":"centroid","id":"G","pts":["A","B","C"],"drawMedians":true}
    • Tam giác đều / Hình vuông động: {"op":"equilateral_triangle","pts":["A","B","C"]} | {"op":"square_2d","pts":["A","B","C","D"]}

${RIGIDITY_RULES_PROMPT}

5 CỔNG TỰ KIỂM CHỨNG HÌNH HỌC BẮT BUỘC TRƯỚC KHI XUẤT JSON:
1. ĐỒ THỊ PHỤ THUỘC ĐIỂM (DAG - cấm điểm rời rạc & cấm bẫy giả trung điểm):
   - Chỉ ĐỈNH CHA mới dùng "point_free" / "points" (xem LUẬT CHA–CON). Mọi điểm sinh ra từ tính chất hình học BẮT BUỘC khóa bằng công cụ động ("midpoint", "point_on_segment", "foot_perp", "rotate", "angle_bisector", "intersection_ll", "intersection_lc", "intersection_cc", "tangent_point", "line_parallel", "line_perp", "point_sum").
   - Điểm thuộc đoạn tổng quát (KHÔNG phải trung điểm): dùng "point_on_segment" với ratio thuộc [0.08..0.92] và BẮT BUỘC ratio != 0.5 (chọn 0.36 hoặc 0.64 để tránh sinh đường song song giả do định lý Thales!).
   - Điểm được định nghĩa TRƯỚC khi bất kỳ lệnh nào khác tham chiếu tới id của nó.
2. HỆ TRỤC (+x sang phải, +y HƯỚNG LÊN) & CHỐNG TỨ GIÁC ĐÁY TỰ CẮT:
   - Ưu tiên dùng {"op":"pyramid",...} hoặc {"op":"prism",...} để tự động đảm bảo đáy lồi chuẩn, đúng nét khuất và không có ảo giác thẳng hàng 3D.
   - Nếu tự đặt tọa độ lẻ: đáy ABCD đi đúng vòng lồi A -> B -> C -> D; đỉnh S nằm phía trên đáy (y ≈ 3.4..4.0).
3. CHỐNG GIAO ĐIỂM GIẢ 2 ĐƯỜNG CHÉO NHAU TRONG 3D (ANTI-SKEW) & CHỐNG SUY BIẾN SONG SONG:
   - "intersection_ll" (l1, l2) CHỈ DÙNG khi l1 và l2 ĐỒNG PHẲNG và không song song! CẤM lấy giao 2 đường chéo nhau (như SA với BC, AM với BD).
   - Nếu 2 đường song song (vd MN // CD), CẤM dùng "intersection_ll" -> phải dùng "line_parallel" (id:"x", through:"A", line:"C-D", asLine:true, noDot:true, aux:true, effect:"glow").
4. PHÉP QUAY, PHÂN GIÁC, TIẾP TUYẾN & KHỐI TRÒN XOAY CHUẨN ĐỘNG:
   - Tam giác đều / góc quay cố định: dùng "rotate" (center, point, angleDeg ngược chiều kim đồng hồ trong hệ +y hướng lên, k) hoặc "equilateral_triangle" / "square_2d".
   - Phân giác trong góc AOB cắt cạnh AB tại D: dùng {"op":"angle_bisector","id":"D","pts":"A-O-B","onOpposite":true}.
   - Tiếp tuyến từ A ngoài (O): dùng "tangents_from_point" hoặc "tangent_point" (tuyệt đối cấm ước lượng góc thủ công!).
   - Khối tròn xoay 3D: dùng "cone" (apex, center, rim, r, h), "cylinder" (center, rim, topCenter, r, h), "sphere" (center, r), "frustumCone".
5. QUY TẮC NÉT KHUẤT 3D & HIỆU ỨNG CHUYỂN ĐỘNG SƯ PHẠM:
   - Mọi điểm sinh ra (M, N, O, K, I, H...) PHẢI được nối đầy đủ bằng "segments", "segment" hoặc "connect_polygon".
   - Cạnh khuất đáy, đường chéo đáy, đường cao trong khối, nét xuyên lòng khối / mặt sau -> "dashed": true; cạnh bao ngoài & mặt trước -> nét liền.
   - KHÔNG tự ý thêm "color" hay "width" (trừ khi đề bài yêu cầu màu riêng -> kèm "explicitColor": true). Trả về DUY NHẤT 1 JSON hợp lệ, không bọc giải thích ngoài JSON.

TÓM TẮT SCHEMA "ops" (trong {"schema":"mn-geo-motion/2.0","title":"...","is3D":true,"ops":[...],"motion":{"preset":"domiinh","loop":true,"handPen":true}}):
- Macro gộp:
  • {"op":"pyramid","name":"S.ABCD","baseType":"quad"|"parallelogram"|"rect"|"square"|"rhombus"|"trapezoid"|"triangle","altitude":"free"|"SA"|"face_SAB"|"center","height":3.8,"step":"Dựng hình chóp S.ABCD"}
  • {"op":"prism","name":"ABC.A'B'C'","baseType":"triangle"|"parallelogram","upright":true,"height":3.5,"step":"Dựng lăng trụ"}
  • {"op":"points","pts":{"A":[-2.8,0.2],"B":[-1.7,-1.8],"C":[1.7,-2.2]}}
  • {"op":"segments","solid":["B-M","M-N"],"dashed":["A-C","B-D","S-O"],"aux":true,"step":"Nối các đoạn phụ"}
  • {"op":"tangents_from_point","p":"A","center":"O","r":2.2,"pts":["B","C"],"drawRadii":true,"step":"Kẻ hai tiếp tuyến AB, AC"}
  • {"op":"circumcircle","center":"O","pts":["A","B","C"]} | {"op":"incircle","center":"I","foot":"D","pts":["A","B","C"]}
  • {"op":"orthocenter","id":"H","pts":["A","B","C"],"drawAltitudes":true} | {"op":"centroid","id":"G","pts":["A","B","C"]}
  • {"op":"equilateral_triangle","pts":["A","B","C"]} | {"op":"square_2d","pts":["A","B","C","D"]}
- Lệnh đơn chuẩn:
  • {"op":"point_free","id":"A","x":-2.8,"y":0.2} | {"op":"point_sum","id":"C","a":"B","b":"D","c":"A"}
  • {"op":"midpoint","id":"M","s":"S-C","effect":"pop","step":"Trung điểm M của SC"}
  • {"op":"point_on_segment","id":"N","s":"S-D","ratio":0.38,"step":"Điểm N thuộc đoạn SD"} | {"op":"point_on_line","id":"E","s":"C-D","ratio":1.4}
  • {"op":"rotate","id":"C","center":"A","point":"B","angleDeg":60,"k":1,"step":"Quay B quanh A góc 60°"}
  • {"op":"angle_bisector","id":"D","pts":"B-A-C","onOpposite":true,"step":"Phân giác trong AD"}
  • {"op":"foot_perp","id":"H","p":"A","line":"S-B","dashed":false,"markRightAngle":true,"aux":true,"step":"Hạ AH ⊥ SB"}
  • {"op":"line_parallel","id":"x","through":"A","line":"C-D","k":1.2,"asLine":true,"noDot":true,"aux":true,"effect":"glow","step":"Giao tuyến Ax // CD"}
  • {"op":"line_perp","id":"d","through":"A","line":"O-A","k":1.2,"asLine":true,"noDot":true,"aux":true}
  • {"op":"intersection_ll","id":"O","l1":"A-C","l2":"B-D","drawExtensions":true,"effect":"pop","step":"O = AC ∩ BD"}
  • {"op":"intersection_lc","id":"K","line":"A-O","circle":"O-R","which":0} | {"op":"intersection_cc","id":"B","c1":"M-O","c2":"O-R","which":0}
  • {"op":"tangent_point","id":"B","p":"A","center":"O","rim":"R","which":0} | {"op":"common_tangent","id":"T1","c1":"O1-R1","c2":"O2-R2","inner":false,"which":0,"on":1}
  • {"op":"circle","center":"O","r":2.2} | {"op":"point_on_circle","id":"D","center":"O","rim":"R","angleDeg":125}
  • {"op":"arc","pts":["O","A","B"],"cw":false} | {"op":"arc3","pts":["A","B","C"]} | {"op":"sector","pts":["O","A","B"],"fill":"rgba(15,23,42,0.06)"}
  • {"op":"spline","pts":["A","B","C","D"],"closed":false} | {"op":"bezier","pts":["P0","C1","C2","P3"]} | {"op":"spiral","center":"O","rim":"A","spiralKind":"golden"|"archimedean","turns":2.5} | {"op":"fibonacci","steps":7,"showSquares":true}
  • {"op":"cone","apex":"S","center":"O","rim":"A","r":2.2,"h":3.8} | {"op":"cylinder","center":"O","rim":"A","topCenter":"O'","r":2.0,"h":3.4} | {"op":"sphere","center":"O","r":2.4} | {"op":"frustumCone","pts":["O","A","O'","A'"]}
  • {"op":"segment"|"line"|"ray","s":"S-O","dashed":true,"aux":true}
  • {"op":"connect_polygon","pts":["A","B","M","I"],"dashedEdges":["A-I"],"fill":"rgba(15,23,42,0.06)","effect":"fade","step":"Thiết diện ABMI"}
  • {"op":"polygon_fill","pts":["A","M","N"],"fill":"rgba(15,23,42,0.06)"}
  • {"op":"right_angle","pts":"O-B-A"} | {"op":"angle_mark","pts":"B-A-C","n":1} | {"op":"tick_mark","s":"A-B","n":1}`;

  function presetDefaultEffect(preset) {
    if (preset === 'manim') return 'glow';
    if (preset === '3d_standard') return 'draw';
    return 'chalk';
  }

  function buildDetailedExternalPrompt(problemText, motionOpts = {}) {
    const preset = ['domiinh', 'manim', '3d_standard'].includes(motionOpts.preset)
      ? motionOpts.preset
      : 'domiinh';
    const defFx = motionOpts.defaultEffect || presetDefaultEffect(preset);
    const loopVal = motionOpts.loop !== false;
    const handPenVal = motionOpts.handPen !== false;
    const followCamVal = motionOpts.followCamera === true;
    const orbit3dVal = motionOpts.orbit3d !== undefined ? !!motionOpts.orbit3d : (preset === '3d_standard');
    const prob = String(problemText || '').trim() || '[DÁN ĐỀ BÀI TOÁN HÌNH HỌC 2D/3D HOẶC ĐÍNH KÈM ẢNH ĐỀ BÀI VÀO ĐÂY]';

    return `Bạn là Kỹ sư Dựng hình Tham số Động chuẩn MinNote (schema "mn-geo-motion/2.0" — v0.0.9.14, luật CHA–CON).
Nhiệm vụ của bạn: Đọc kỹ đề bài Toán Hình học (2D hoặc 3D, văn bản hoặc ảnh đề bài) ở cuối tài liệu này và xuất DUY NHẤT 1 khối mã JSON hợp lệ, gọn sạch để nạp trực tiếp vào bảng vẽ tương tác MinNote.

================================================================================
PHẦN 1 — NGUYÊN LÝ HẠT NHÂN HÌNH HỌC THAM SỐ ĐỘNG MINNOTE ("mn-geo-motion/2.0")
================================================================================
1. Hệ trục tọa độ Đề-các chuẩn Toán học:
   - Trục +x hướng sang PHẢI, trục +y HƯỚNG LÊN TRÊN (tuyệt đối không dùng hệ tọa độ màn hình +y hướng xuống).
   - Vùng tọa độ chuẩn đẹp trên bảng: x, y ∈ [-4.5, 4.5].
   - Mọi tham số tọa độ/tỉ lệ (x, y, ratio, k, angleDeg, r, h) ghi bằng số thập phân tường minh (ví dụ: -2.8, 0.38, 2.2) hoặc biểu thức số học sạch trong chuỗi (ví dụ: "sqrt(3)/2").
2. Nguyên tắc Khóa Ràng Buộc Động (DAG như Geometer's Sketchpad / GeoGebra):
   - CHỈ các đỉnh tự do ban đầu mới dùng "point_free" / "points" (hoặc sinh tự động qua macro "pyramid", "prism").
   - MỌI điểm sinh ra từ giả thiết hình học (đỉnh thứ 4 hình bình hành, trung điểm, điểm chia tỉ lệ, chân đường cao, điểm quay, chân phân giác, giao điểm, tiếp điểm, tâm ngoại/nội tiếp) BẮT BUỘC dùng đúng công cụ ràng buộc động để khi kéo thả đỉnh tự do trên bảng MinNote, hình biến đổi mượt mà KHÔNG BAO GIỜ vỡ tính chất vuông góc, song song, phân giác hay tiếp xúc!
   - Thứ tự khai báo (DAG): Điểm gốc phải được khai báo TRƯỚC khi lệnh khác tham chiếu tới "id" của điểm đó. Không để điểm sinh ra bị trơ trọi.

================================================================================
PHẦN 1B — ${RIGIDITY_RULES_PROMPT}

================================================================================
PHẦN 2 — TỪ ĐIỂN ĐẦY ĐỦ CÔNG CỤ DỰNG HÌNH ĐỘNG TRONG APP MINNOTE ("ops")
================================================================================
Mỗi phần tử trong mảng "ops" là 1 lệnh dựng hình chuẩn:

1. point_free — Điểm gốc tự do ban đầu (tự gán label = id nếu lược bỏ "label"):
   {"op":"point_free","id":"A","x":-2.8,"y":0.2,"step":"Đặt đỉnh A"}

2. point_sum — Quy tắc véc-tơ hình bình hành (C = B + D - A, tức véc-tơ AC = AB + AD):
   {"op":"point_sum","id":"C","a":"B","b":"D","c":"A","step":"Dựng đỉnh C = B + D - A"}

3. midpoint — Trung điểm chính xác của đoạn thẳng AB:
   {"op":"midpoint","id":"M","s":"S-C","effect":"pop","step":"Lấy M là trung điểm SC"}

4. point_on_segment — Điểm chia tỉ lệ khóa chặt trong đoạn thẳng AB (ratio ∈ [0.08, 0.92]):
   {"op":"point_on_segment","id":"N","s":"S-D","ratio":0.38,"effect":"pop","step":"Lấy điểm N thuộc đoạn SD"}
   (Đề cho tỉ số cố định ⇒ ratio đúng + "lock": true; không có lock ⇒ điểm trượt được trên đoạn.)
   (LƯU Ý SỐNG CÒN: Nếu đề chỉ nói "lấy điểm M thuộc đoạn..." mà KHÔNG nói trung điểm, BẮT BUỘC chọn ratio lệch như 0.36, 0.38 hoặc 0.64; CẤM lấy ratio = 0.5 để tránh bẫy sinh đường song song giả!).

5. point_on_line — Điểm nằm trên đường thẳng kéo dài ngoài đoạn AB (ratio < 0 hoặc ratio > 1):
   {"op":"point_on_line","id":"E","s":"A-B","ratio":1.45,"step":"Lấy điểm E trên tia kéo dài AB"}

6. point_on_circle — Điểm khóa trên đường tròn (tâm center, mốc rim hoặc bán kính số r):
   {"op":"point_on_circle","id":"D","center":"O","rim":"R","angleDeg":125,"step":"Lấy điểm D trên (O)"}

7. rotate — Phép quay / vị tự quay động quanh tâm center góc angleDeg (ngược chiều kim đồng hồ trong hệ +y hướng lên, tỉ số k mặc định 1):
   {"op":"rotate","id":"C","center":"A","point":"B","angleDeg":60,"k":1,"step":"Quay B quanh A góc 60° được C"}

8. angle_bisector — Tia phân giác hoặc chân đường phân giác trong của góc AOB (đỉnh góc tại o):
   {"op":"angle_bisector","id":"D","pts":"B-A-C","onOpposite":true,"step":"Dựng đường phân giác trong AD của tam giác ABC"}
   (Khi "onOpposite":true, D được khóa chính xác là giao điểm tia phân giác góc BAC với cạnh đối diện BC, bảo toàn DB/DC = AB/AC!).

9. foot_perp — Hạ đường cao / hình chiếu vuông góc chuẩn 90° từ điểm p xuống đường thẳng ab:
   {"op":"foot_perp","id":"H","p":"A","line":"S-B","drawDropSegment":true,"dashed":false,"markRightAngle":true,"aux":true,"step":"Hạ AH ⊥ SB tại H"}

10. line_parallel & line_perp — Dựng đường thẳng qua điểm through song song hoặc vuông góc với đường thẳng ab:
    {"op":"line_parallel","id":"x","through":"S","line":"A-B","k":1.2,"asLine":true,"bothSides":true,"noDot":true,"aux":true,"effect":"glow","step":"Giao tuyến Sx // AB"}
    {"op":"line_perp","id":"d","through":"A","line":"O-A","k":1.2,"asLine":true,"noDot":true,"aux":true,"step":"Đường thẳng d ⊥ OA tại A"}
    (Mặc định điểm sinh ra bị KHÓA. Đỉnh hình có độ dài tự do — đáy nhỏ hình thang, cạnh góc vuông — thêm "drag": true để trượt dọc phương, vẫn luôn // hoặc ⊥.)

11. intersection_ll — Giao điểm của 2 đường thẳng ĐỒNG PHẲNG và không song song:
    {"op":"intersection_ll","id":"O","l1":"A-C","l2":"B-D","drawExtensions":true,"effect":"pop","step":"Gọi O = AC ∩ BD"}
    (TUYỆT ĐỐI CẤM lấy giao 2 đường chéo nhau trong 3D như SA và BC, hay AM và BD!).

12. intersection_lc & intersection_cc — Giao điểm đường thẳng - đường tròn & giao 2 đường tròn (which: 0 hoặc 1):
    {"op":"intersection_lc","id":"K","line":"A-D","circle":"O-R","which":0,"effect":"pop","step":"Giao điểm K của AD và (O)"}
    {"op":"intersection_cc","id":"B","c1":"M-O","c2":"O-R","which":0,"effect":"pop","step":"Giao điểm B của hai đường tròn"}

13. tangent_point & common_tangent — Tiếp điểm từ điểm ngoài p tới (O) & tiếp điểm chung của 2 đường tròn:
    {"op":"tangent_point","id":"B","p":"A","center":"O","rim":"R","which":0,"effect":"pop","step":"Tiếp điểm B từ A tới (O)"}
    {"op":"common_tangent","id":"T1","c1":"O1-R1","c2":"O2-R2","inner":false,"which":0,"on":1,"step":"Tiếp điểm chung ngoài T1"}

14. segment, line, ray — Nối đoạn thẳng, đường thẳng hoặc tia:
    {"op":"segment","s":"A-D","dashed":true,"effect":"chalk","step":"Nối cạnh khuất AD"}
    {"op":"ray","s":"S-x","aux":true,"effect":"glow","step":"Tia giao tuyến Sx"}

15. circle, arc, arc3, sector — Đường tròn (hỗ trợ bán kính số "r"), cung tròn & hình quạt:
    {"op":"circle","center":"O","r":2.2,"step":"Vẽ đường tròn (O; 2.2)"}
    {"op":"arc","pts":["O","A","B"],"step":"Cung tròn AB tâm O"}
    {"op":"sector","pts":["O","A","B"],"fill":"rgba(37, 99, 235, 0.08)","step":"Hình quạt OAB"}

16. cone, cylinder, sphere, frustumCone — Khối tròn xoay 3D chuẩn SGK:
    {"op":"cone","apex":"S","center":"O","rim":"A","r":2.2,"h":3.8,"step":"Dựng hình nón đỉnh S tâm đáy O"}
    {"op":"cylinder","center":"O","rim":"A","topCenter":"O'","r":2.0,"h":3.4,"step":"Dựng hình trụ OO'"}
    {"op":"sphere","center":"O","r":2.4,"step":"Dựng mặt cầu tâm O"}
    {"op":"frustumCone","pts":["O","A","O'","A'"],"step":"Dựng hình nón cụt"}

17. connect_polygon & polygon_fill — Nối đa giác / thiết diện (kèm cạnh khuất & tô miền) hoặc chỉ tô miền:
    {"op":"connect_polygon","pts":["A","B","M","I"],"dashedEdges":["A-I"],"fill":"rgba(37, 99, 235, 0.08)","effect":"fade","step":"Thiết diện ABMI"}
    {"op":"polygon_fill","pts":["A","B","M","N"],"fill":"rgba(37, 99, 235, 0.08)","effect":"fade","step":"Tô miền (ABMN)"}

18. right_angle, angle_mark, tick_mark — Kí hiệu góc vuông (đỉnh vuông ở giữa!), góc bằng nhau & đoạn bằng nhau:
    {"op":"right_angle","pts":"S-A-B","step":"Kí hiệu góc vuông SAB tại A"}
    {"op":"angle_mark","pts":"S-C-A","n":1,"step":"Đánh dấu góc SCA"}
    {"op":"tick_mark","s":"S-M","n":1,"step":"Đánh dấu đoạn SM"}

================================================================================
PHẦN 2B — BỘ LỆNH GỘP SIÊU GỌN TIẾT KIỆM 70% CODE CHO AI (KHUYÊN DÙNG!)
================================================================================
Hãy ưu tiên dùng các lệnh Macro gộp và quy ước rút gọn sau để JSON ngắn gọn chỉ còn 6–14 dòng, không bao giờ nhầm nét đứt/liền hay vỡ đáy 3D:

• Quy ước rút gọn tự động trên MỌI lệnh:
  - Không cần viết "label" khi trùng với "id" (ví dụ viết {"op":"midpoint","id":"M","s":"S-C"} tự có nhãn "M").
  - Viết chuỗi "A-C" thay cho ["A","C"], "S-A-B" thay cho "a":"S","v":"A","b":"B", và bán kính số "r": 2.2 trên circle / tangents_from_point.
  - Không cần viết "dashed": false cho nét liền (chỉ ghi "dashed": true cho nét đứt).

• 1. pyramid — Dựng trọn gói Hình chóp 3D chuẩn SGK trong 1 dòng duy nhất:
  {"op":"pyramid","name":"S.ABCD","baseType":"quad"|"parallelogram"|"rect"|"square"|"rhombus"|"trapezoid"|"triangle","altitude":"free"|"SA"|"SB"|"face_SAB"|"center","height":3.8,"diagonals":false,"step":"Dựng hình chóp S.ABCD"}
  (Tự động đặt tọa độ chống suy biến, khóa hình bình hành/hình thang, nối toàn bộ cạnh đáy + cạnh bên đúng nét liền/đứt chuẩn SGK và gắn sẵn kí hiệu góc vuông cho đường cao SA, SH hoặc SO!).

• 2. prism — Dựng trọn gói Lăng trụ đứng / Lăng trụ xiên / Hình hộp trong 1 dòng:
  {"op":"prism","name":"ABC.A'B'C'","baseType":"triangle"|"parallelogram","upright":true,"height":3.5,"step":"Dựng lăng trụ đứng ABC.A'B'C'"}
  (Hỗ trợ cả "ABC.A'B'C'" và "ABCD.A'B'C'D'"; tự khóa các đỉnh đáy trên bằng point_sum theo véc-tơ AA'; upright:true ⇒ AA' ⊥ đáy, chỉ trượt chiều cao).

• 2b. cube — Hình lập phương CỨNG (BẮT BUỘC cho mọi bài lập phương):
  {"op":"cube","name":"ABCD.A'B'C'D'","edge":3.2,"depthAngle":40,"depthRatio":0.5,"step":"Dựng hình lập phương"}
  (Cha: A, B. A' = quay B quanh A 90° ⇒ ABB'A' luôn là hình vuông; D theo hướng chiều sâu depthAngle (40 = lệch phải, khuất D; 135 = lệch trái, khuất C); C, B', C', D' = tổng véc-tơ ⇒ 12 cạnh luôn đúng 3 họ song song bằng nhau, kéo A/B chỉ xoay-co giãn cả khối.)

• 3. points & segments — Khai báo gộp nhiều điểm gốc & nối gộp hàng loạt nét liền/nét đứt:
  {"op":"points","pts":{"A":[-2.8,0.2],"B":[-1.7,-1.8],"C":[1.7,-2.2]}}
  {"op":"segments","solid":["B-M","M-N","M-I"],"dashed":["A-C","B-D","S-O"],"aux":true,"effect":"draw","step":"Nối các đường phụ"}

• 4. Bộ Macro Hình phẳng 2D Khóa Động 100%:
  - Hai tiếp tuyến từ điểm ngoài A tới (O):
    {"op":"tangents_from_point","p":"A","center":"O","r":2.2,"pts":["B","C"],"drawRadii":true,"step":"Kẻ hai tiếp tuyến AB, AC tới (O)"}
  - Đường tròn ngoại tiếp & nội tiếp tam giác ABC:
    {"op":"circumcircle","center":"O","pts":["A","B","C"],"step":"Đường tròn ngoại tiếp (O) của tam giác ABC"}
    {"op":"incircle","center":"I","foot":"D","pts":["A","B","C"],"step":"Đường tròn nội tiếp (I) của tam giác ABC"}
  - Trực tâm H (kèm đường cao) & Trọng tâm G:
    {"op":"orthocenter","id":"H","pts":["A","B","C"],"drawAltitudes":true,"step":"Trực tâm H của tam giác ABC"}
    {"op":"centroid","id":"G","pts":["A","B","C"],"drawMedians":true,"step":"Trọng tâm G của tam giác ABC"}
  - Tam giác đều & Hình vuông khóa phép quay động:
    {"op":"equilateral_triangle","pts":["A","B","C"],"step":"Dựng tam giác đều ABC"}
    {"op":"square_2d","pts":["A","B","C","D"],"step":"Dựng hình vuông ABCD"}

================================================================================
PHẦN 3 — QUY TẮC VÀNG CHO CÁC DẠNG HÌNH HỌC PHỔ BIẾN
================================================================================
• Hình chóp S.ABCD & Thiết diện (giao tuyến, giao điểm đường - mặt):
  - Khởi tạo ngay bằng 1 lệnh {"op":"pyramid","name":"S.ABCD","baseType":"quad","altitude":"free"} (hoặc "baseType":"parallelogram","altitude":"SA" nếu đáy là hình bình hành/chữ nhật/vuông và SA ⊥ đáy; "altitude":"face_SAB" nếu mặt bên cân ⊥ đáy; "altitude":"center" nếu chóp đều).
  - Đoạn phụ nằm trên các mặt trước nhìn thấy -> đưa vào "solid" của "segments"; đoạn nằm trên mặt đáy, mặt sau hoặc xuyên trong lòng khối (AC, BD, SO, AM, AI) -> đưa vào "dashed" của "segments".
  - Muốn tìm giao điểm của đường d với mặt (P): chọn mặt phụ chứa d cắt (P) theo giao tuyến Δ đồng phẳng rồi mới gọi intersection_ll(d, Δ). Nếu 2 đường song song (như MN // CD), dùng line_parallel thay vì intersection_ll!

• Đường tròn (O; R), Tiếp tuyến, Nội tiếp / Ngoại tiếp 2D ("is3D": false):
  - Dùng {"op":"circle","center":"O","r":2.2} (tự đặt tâm O(0,0) nếu chưa khai báo) kết hợp "tangents_from_point", "point_on_circle" (chọn các góc lệch nhau như 112, 210, 330 để tam giác nhọn tổng quát), "circumcircle", "incircle", "orthocenter".

• Hình lập phương / hộp & thiết diện (vd mặt phẳng (DKF) với K, F là trung điểm A'B', B'C'):
  - {"op":"cube","name":"ABCD.A'B'C'D'","depthAngle":135} → K, F = midpoint → trong mặt (A'B'C'D'): P = KF ∩ D'A', Q = KF ∩ D'C' (intersection_ll, drawExtensions)
    → trong (ADD'A'): I = DP ∩ AA'; trong (CDD'C'): N = DQ ∩ CC' → connect_polygon ["D","I","K","F","N"] (cạnh nằm trên mặt khuất vào "dashedEdges").
  - Vẽ thêm mặt A'B'C'D' dạng thật bên cạnh: id A1, B1 ("label":"A'","B'", "flat":true) + rotate 90° + point_sum + midpoint K1, F1 ("label":"K","F").

• Hình phẳng 2D có tính chất (vuông, chữ nhật, thoi, thang, tam giác vuông/cân/đều): chỉ khai báo đúng số CHA ở mục F của LUẬT CHA–CON, mọi đỉnh còn lại dựng bằng rotate / point_sum / line_parallel / line_perp. Kéo thử trong đầu: dời 1 cha bất kỳ, tính chất phải còn nguyên.

================================================================================
PHẦN 4 — HIỆU ỨNG DIỄN HOẠT TỪNG NÉT TRONG MINNOTE
================================================================================
- Thuộc tính "effect" trên từng lệnh trong "ops":
  + "chalk" : Nét phấn bảng tự nhiên (dùng cho các cạnh chính).
  + "draw"  : Nét bút mực mượt (dùng cho đường phụ, đường chéo, đường cao).
  + "pop"   : Nảy điểm nổi bật (dùng cho trung điểm, giao điểm, tiếp điểm quan trọng).
  + "glow"  : Phát sáng nhấn mạnh (dùng cho giao tuyến, tia phụ kết luận).
  + "pulse" : Nhịp sáng nhấn kết quả cuối cùng.
  + "fade"  : Hiện êm dịu (dùng cho miền tô thiết diện và kí hiệu góc vuông).
- Luôn ghi mô tả ngắn gọn, sư phạm vào trường "step" để thanh Diễn Hoạt thuyết minh từng bước.

================================================================================
PHẦN 5 — KHUNG JSON MẪU CHUẨN GỌN SẠCH DUY NHẤT CẦN XUẤT
================================================================================
CHỈ TRẢ VỀ ĐÚNG 1 KHỐI JSON HỢP LỆ ĐẶT TRONG CODE BLOCK \`\`\`json ... \`\`\` THEO CẤU TRÚC MẪU GỌN SẠCH DƯỚI ĐÂY (không giải thích bên ngoài khối mã, không xuất văn bản thô bị chèn ký tự escape Markdown như \\ cuối dòng hay &#x20;, không dùng dấu phẩy thừa cuối mảng, không để bình luận // trong JSON):

\`\`\`json
{
  "schema": "mn-geo-motion/2.0",
  "title": "Hình chóp S.ABCD, giao tuyến SO và thiết diện (ABM)",
  "is3D": true,
  "ops": [
    {"op": "pyramid", "name": "S.ABCD", "baseType": "quad", "altitude": "free", "diagonals": true, "effect": "${defFx}", "step": "Dựng hình chóp tứ giác lồi S.ABCD và tâm O = AC ∩ BD"},
    {"op": "segment", "s": "S-O", "dashed": true, "aux": true, "effect": "glow", "step": "Nối giao tuyến SO = (SAC) ∩ (SBD)"},
    {"op": "midpoint", "id": "M", "s": "S-C", "effect": "pop", "step": "Lấy M là trung điểm SC"},
    {"op": "segment", "s": "A-M", "dashed": true, "aux": true, "effect": "draw", "step": "Nối AM trong mặt phẳng (SAC)"},
    {"op": "intersection_ll", "id": "K", "l1": "A-M", "l2": "S-O", "effect": "pop", "step": "Gọi K = AM ∩ SO trong (SAC)"},
    {"op": "intersection_ll", "id": "I", "l1": "B-K", "l2": "S-D", "drawExtensions": true, "effect": "pulse", "step": "Trong (SBD), kéo dài BK cắt SD tại I"},
    {"op": "connect_polygon", "pts": ["A", "B", "M", "I"], "dashedEdges": ["A-I"], "fill": "rgba(15, 23, 42, 0.06)", "effect": "fade", "step": "Khép kín thiết diện ABMI"}
  ],
  "motion": {
    "preset": "${preset}",
    "defaultEffect": "${defFx}",
    "loop": ${loopVal},
    "handPen": ${handPenVal},
    "followCamera": ${followCamVal},
    "orbit3d": ${orbit3dVal}
  }
}
\`\`\`

ĐỀ BÀI CẦN DỰNG:
${prob}`;
  }

  function buildCompactExternalPrompt(problemText, motionOpts = {}) {
    return buildDetailedExternalPrompt(problemText, motionOpts);
  }

  function isPastedPromptText(rawText) {
    const s = String(rawText || '').trim();
    if (!s) return false;
    if (/^(?:\{|\[|```(?:json|javascript|js|jsonc)?\b)/i.test(s)) return false;
    return /Bạn là Kỹ sư Dựng hình|TỪ ĐIỂN[\s\S]{0,60}CÔNG CỤ DỰNG HÌNH|ĐỀ BÀI CẦN DỰNG/i.test(s);
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
    let src = String(rawText || '');
    if (!src.trim()) return { cleaned: '', fixes };

    // 0A. Strip BOM & invisible zero-width characters; normalize NBSP to regular ASCII space
    const beforeZeroWidth = src;
    src = src
      .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
      .replace(/[\u00A0\u2007\u202F]/g, ' ')
      .trim();
    if (src !== beforeZeroWidth.trim()) {
      fixes.push('Đã loại bỏ ký tự trắng ẩn (BOM / NBSP / zero-width).');
    }

    // 0B. Unwrap JSON-stringified or outer-quoted JSON blocks (e.g. "{\\n...\\n}" or "\"{\\\"schema\\\":...}\"")
    if (src.length >= 2 && src.startsWith('"') && src.endsWith('"')) {
      try {
        const unwrapped = JSON.parse(src);
        if (typeof unwrapped === 'string' && (unwrapped.includes('{') || unwrapped.includes('['))) {
          src = unwrapped.trim();
          fixes.push('Đã giải mã chuỗi JSON bị bọc 2 lớp dấu ngoặc kép.');
        }
      } catch {
        if (/^"\s*(?:```(?:json|jsonc|javascript|js)?\s*)?[\{\[]/i.test(src) && /[\}\]]\s*(?:```)?\s*"$/i.test(src)) {
          src = src.slice(1, -1).trim();
          fixes.push('Đã gỡ cặp dấu ngoặc kép thừa bọc ngoài khối JSON.');
        }
      }
    }

    // 0C. Decode HTML entities produced when copying from Markdown/rich-text AI chat UIs (&#x20;, &nbsp;, &apos;, &amp;, structural &quot;, etc.)
    const hasHtmlEntities = /&(?:#x?[0-9a-f]+|nbsp|quot|apos|lt|gt|amp);/i.test(src);
    if (hasHtmlEntities) {
      const decodeStructuralQuotes = /(?:^|[\{\[,:\s])(?:&quot;|&#34;|&#x22;)\s*[^&"<>]{1,64}\s*(?:&quot;|&#34;|&#x22;)\s*:/i.test(src);
      const beforeEntities = src;
      src = src.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(nbsp|quot|apos|lt|gt|amp));/gi, (m, hex, dec, named) => {
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
      if (src !== beforeEntities) {
        fixes.push('Đã giải mã ký tự HTML bị dính khi sao chép (&#x20;, &nbsp;, ...).');
      }
    }

    // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
    const fenceMatch = /```(?:json|javascript|js|jsonc)?\s*([\s\S]*?)```/i.exec(src);
    if (fenceMatch && fenceMatch[1] && (fenceMatch[1].includes('{') || fenceMatch[1].includes('['))) {
      src = fenceMatch[1].trim();
      fixes.push('Đã bóc tách khối mã Markdown ```json.');
    } else if (/^```/i.test(src) || /```$/.test(src)) {
      src = src.replace(/^```(?:json|javascript|js|jsonc)?\s*/i, '').replace(/```\s*$/i, '').trim();
      fixes.push('Đã xóa dấu rào Markdown ``` thừa.');
    }

    // 1B. Recover globally backslash-escaped JSON quotes (e.g. {\"schema\": \"mn-geo-motion/2.0\"})
    if (!/(?:^|[^\\])"\s*:/.test(src) && /\\"\s*:/.test(src)) {
      src = src.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      fixes.push('Đã gỡ ký tự thoát \\" thừa quanh khóa JSON.');
    }

    // 1C. Strip Markdown hard line breaks (`\` before newline) & invalid Markdown punctuation escapes (`\_`, `\'`, `\[`, `\{`, etc.)
    const hasMdLineBreakOrEsc = /\\[ \t]*(?:\r?\n|$)|\\[_'*[\]{}()\-+#!~|:]/.test(src);
    if (hasMdLineBreakOrEsc) {
      let unescaped = '';
      let inStrMd = false;
      let changedMd = false;
      for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (!inStrMd) {
          if (ch === '"') {
            inStrMd = true;
            unescaped += ch;
            continue;
          }
          if (ch === '\\') {
            // Markdown hard line break outside strings: `\` + optional spaces + newline (or EOF)
            let j = i + 1;
            while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
            if (j >= src.length || src[j] === '\n' || src[j] === '\r') {
              changedMd = true;
              i = j - 1; // let loop consume the newline cleanly
              continue;
            }
            // Markdown-escaped structural punctuation outside strings (e.g. `\{`, `\[`, `\]`, `\}`, `\,`, `\_`)
            const nx = src[i + 1];
            if (nx && /[{}\[\],:_*+\-.()#!~|'`"]/.test(nx)) {
              changedMd = true;
              continue; // drop stray backslash
            }
          }
          unescaped += ch;
        } else {
          if (ch === '"') {
            inStrMd = false;
            unescaped += ch;
            continue;
          }
          if (ch === '\\') {
            const nx = src[i + 1];
            // Valid JSON escape sequence -> preserve intact
            if (nx && (nx === '"' || nx === '\\' || nx === '/' || nx === 'b' || nx === 'f' || nx === 'n' || nx === 'r' || nx === 't')) {
              unescaped += ch + nx;
              i++;
              continue;
            }
            if (nx === 'u' && /^[0-9a-fA-F]{4}/.test(src.slice(i + 2, i + 6))) {
              unescaped += src.slice(i, i + 6);
              i += 5;
              continue;
            }
            // Markdown hard-wrapped line break inside a string literal -> collapse to single space
            let j = i + 1;
            while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
            if (src[j] === '\r' || src[j] === '\n') {
              changedMd = true;
              if (src[j] === '\r' && src[j + 1] === '\n') j += 2;
              else j += 1;
              while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
              unescaped += ' ';
              i = j - 1;
              continue;
            }
            // Invalid JSON escape caused by Markdown escaping (`\_`, `\'`, `\*`, `\[`, `\]`, `\{`, `\}`, etc.)
            if (nx && /[_'*[\]{}()\-+.!#~|:,><=`]/.test(nx)) {
              changedMd = true;
              unescaped += nx;
              i++;
              continue;
            }
          }
          unescaped += ch;
        }
      }
      if (changedMd) {
        src = unescaped.trim();
        fixes.push('Đã gỡ dấu \\ ngắt dòng / ký tự thoát Markdown thừa trong JSON.');
      }
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
    'tangent_point',
    'rotate',
    'angle_bisector',
    'common_tangent'
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
    free: 'point_free',
    pt: 'point_free',
    free_point: 'point_free',
    point: 'point_free',
    pts: 'points',
    sum: 'point_sum',
    sum_point: 'point_sum',
    parallelogram_point: 'point_sum',
    vector_sum: 'point_sum',
    mid: 'midpoint',
    mid_point: 'midpoint',
    on: 'point_on_segment',
    on_segment: 'point_on_segment',
    segment_point: 'point_on_segment',
    ratio_point: 'point_on_segment',
    on_line: 'point_on_line',
    line_point: 'point_on_line',
    on_circle: 'point_on_circle',
    foot: 'foot_perp',
    perp_foot: 'foot_perp',
    projection: 'foot_perp',
    par: 'line_parallel',
    parallel: 'line_parallel',
    parallel_line: 'line_parallel',
    perp: 'line_perp',
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
    tan: 'tangent_point',
    tangent: 'tangent_point',
    tangent_from_point: 'tangent_point',
    tangents: 'tangents_from_point',
    two_tangents: 'tangents_from_point',
    tangent_pair: 'tangents_from_point',
    ctan: 'common_tangent',
    common_tan: 'common_tangent',
    rot: 'rotate',
    point_rot: 'rotate',
    rotation: 'rotate',
    bis: 'angle_bisector',
    bisector: 'angle_bisector',
    seg: 'segment',
    segs: 'segments',
    poly: 'connect_polygon',
    polygon: 'connect_polygon',
    sec: 'section',
    fill: 'polygon_fill',
    fill_polygon: 'polygon_fill',
    right: 'right_angle',
    perp_mark: 'right_angle',
    ang: 'angle_mark',
    angle: 'angle_mark',
    tick: 'tick_mark',
    equilateral: 'equilateral_triangle',
    square: 'square_2d',
    frustum_cone: 'frustumCone',
    frustumcone: 'frustumCone'
  };

  function cleanRef(v) {
    return v == null ? '' : String(v).trim();
  }

  function isNumericRadiusVal(val) {
    if (typeof val === 'number') return Number.isFinite(val) && val > 0;
    if (typeof val !== 'string') return false;
    const s = val.trim();
    if (!s || /^[A-Za-z_][A-Za-z0-9_']*$/.test(s)) return false;
    const parsed = parseMathNumber(s, NaN);
    return Number.isFinite(parsed) && parsed > 0;
  }

  function parsePairRef(val) {
    if (Array.isArray(val) && val.length >= 2) {
      const a = cleanRef(val[0]), b = cleanRef(val[1]);
      return (a && b) ? [a, b] : null;
    }
    if (typeof val !== 'string') return null;
    const s = val.trim();
    if (!s) return null;
    if (s.includes('-')) {
      const parts = s.split(/\s*-\s*/).map(cleanRef).filter(Boolean);
      if (parts.length >= 2) return [parts[0], parts[1]];
    }
    const toks = s.match(/[A-Za-zΔδαβγ](?:'+|′+|_\{\d+\}|_\d+|\d+)?/g);
    if (toks && toks.length === 2 && toks.join('') === s.replace(/\s+/g, '')) {
      return [toks[0], toks[1]];
    }
    return null;
  }

  function parseTripleRef(val) {
    if (Array.isArray(val) && val.length >= 3) {
      const a = cleanRef(val[0]), b = cleanRef(val[1]), c = cleanRef(val[2]);
      return (a && b && c) ? [a, b, c] : null;
    }
    if (typeof val !== 'string') return null;
    const s = val.trim();
    if (!s) return null;
    if (s.includes('-')) {
      const parts = s.split(/\s*-\s*/).map(cleanRef).filter(Boolean);
      if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
    }
    const toks = s.match(/[A-Za-zΔδαβγ](?:'+|′+|_\{\d+\}|_\d+|\d+)?/g);
    if (toks && toks.length === 3 && toks.join('') === s.replace(/\s+/g, '')) {
      return [toks[0], toks[1], toks[2]];
    }
    return null;
  }

  function parseVertexList(val) {
    if (Array.isArray(val)) return val.map(cleanRef).filter(Boolean);
    if (typeof val !== 'string') return [];
    const s = val.trim();
    if (!s) return [];
    if (s.includes('-') || s.includes(',')) {
      return s.split(/\s*[-,]\s*/).map(cleanRef).filter(Boolean);
    }
    const toks = s.match(/[A-Za-zΔδαβγ](?:'+|′+|_\{\d+\}|_\d+|\d+)?/g);
    return toks && toks.length ? toks : [s];
  }

  function isPlainOptsObj(v) {
    return !!(v && typeof v === 'object' && !Array.isArray(v));
  }

  function convertTupleToOpObject(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return null;
    const headRaw = String(arr[0] || '').trim();
    if (!headRaw) return null;
    const head = headRaw.toLowerCase();

    if (head === 'pyramid' || head === 'chop') {
      if (isPlainOptsObj(arr[1])) return { op: 'pyramid', ...arr[1] };
      const out = { op: 'pyramid', name: String(arr[1] || 'S.ABCD').trim() };
      const altSet = new Set(['free', 'sa', 'sb', 'sc', 'sd', 'center', 'regular', 'o', 'g']);
      for (let i = 2; i < arr.length; i++) {
        const arg = arr[i];
        if (isPlainOptsObj(arg)) Object.assign(out, arg);
        else if (typeof arg === 'number') out.height = arg;
        else if (typeof arg === 'string') {
          const al = arg.trim().toLowerCase();
          if (altSet.has(al) || /^face_/i.test(al)) out.altitude = arg.trim();
          else if (!out.baseType) out.baseType = arg.trim();
          else out.altitude = arg.trim();
        }
      }
      return out;
    }

    if (head === 'cube' || head === 'lap_phuong') {
      if (isPlainOptsObj(arr[1])) return { op: 'cube', ...arr[1] };
      const out = { op: 'cube', name: String(arr[1] || "ABCD.A'B'C'D'").trim() };
      for (let i = 2; i < arr.length; i++) {
        if (isPlainOptsObj(arr[i])) Object.assign(out, arr[i]);
        else if (typeof arr[i] === 'number') out.edge = arr[i];
      }
      return out;
    }

    if (head === 'prism' || head === 'lang_tru') {
      if (isPlainOptsObj(arr[1])) return { op: 'prism', ...arr[1] };
      const out = { op: 'prism', name: String(arr[1] || "ABC.A'B'C'").trim() };
      for (let i = 2; i < arr.length; i++) {
        const arg = arr[i];
        if (isPlainOptsObj(arg)) Object.assign(out, arg);
        else if (typeof arg === 'boolean') out.upright = arg;
        else if (typeof arg === 'number') out.height = arg;
        else if (typeof arg === 'string') {
          const al = arg.trim().toLowerCase();
          if (al === 'upright' || al === 'right' || al === 'standing') out.upright = true;
          else if (al === 'oblique' || al === 'slanted' || al === 'skew') out.upright = false;
          else out.baseType = arg.trim();
        }
      }
      return out;
    }

    if (head === 'pts' || head === 'points') {
      return { op: 'points', pts: arr[1] || {}, ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) };
    }

    if (head === 'free' || head === 'point_free' || head === 'pt') {
      if (Array.isArray(arr[2])) {
        return { op: 'point_free', id: cleanRef(arr[1]), x: arr[2][0], y: arr[2][1], ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
      }
      return { op: 'point_free', id: cleanRef(arr[1]), x: arr[2], y: arr[3], ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) };
    }

    if (head === 'sum' || head === 'point_sum') {
      if (typeof arr[3] === 'string' && typeof arr[4] === 'string') {
        return { op: 'point_sum', id: cleanRef(arr[1]), a: cleanRef(arr[2]), b: cleanRef(arr[3]), c: cleanRef(arr[4]), ...(isPlainOptsObj(arr[5]) ? arr[5] : {}) };
      }
      const tr = parseTripleRef(arr[2]);
      if (tr) {
        return { op: 'point_sum', id: cleanRef(arr[1]), a: tr[0], b: tr[1], c: tr[2], ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
      }
      return null;
    }

    if (head === 'mid' || head === 'midpoint') {
      if (typeof arr[3] === 'string' && !isPlainOptsObj(arr[3])) {
        return { op: 'midpoint', id: cleanRef(arr[1]), a: cleanRef(arr[2]), b: cleanRef(arr[3]), ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) };
      }
      const pr = parsePairRef(arr[2]);
      return pr ? { op: 'midpoint', id: cleanRef(arr[1]), a: pr[0], b: pr[1], ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) } : null;
    }

    if (head === 'on' || head === 'point_on_segment' || head === 'on_line' || head === 'point_on_line') {
      const targetOp = (head === 'on_line' || head === 'point_on_line') ? 'point_on_line' : 'point_on_segment';
      if (typeof arr[3] === 'string' && !Number.isFinite(parseMathNumber(arr[3], NaN))) {
        const ratioVal = (arr[4] !== undefined && !isPlainOptsObj(arr[4])) ? arr[4] : undefined;
        const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : {});
        return { op: targetOp, id: cleanRef(arr[1]), a: cleanRef(arr[2]), b: cleanRef(arr[3]), ...(ratioVal !== undefined ? { ratio: ratioVal } : {}), ...extra };
      }
      const pr = parsePairRef(arr[2]);
      if (!pr) return null;
      const ratioVal = (arr[3] !== undefined && !isPlainOptsObj(arr[3])) ? arr[3] : undefined;
      const extra = isPlainOptsObj(arr[3]) ? arr[3] : (isPlainOptsObj(arr[4]) ? arr[4] : {});
      return { op: targetOp, id: cleanRef(arr[1]), a: pr[0], b: pr[1], ...(ratioVal !== undefined ? { ratio: ratioVal } : {}), ...extra };
    }

    if (head === 'rot' || head === 'rotate' || head === 'point_rot' || head === 'rotation') {
      if (typeof arr[3] === 'number' || (typeof arr[3] === 'string' && isNumericRadiusVal(arr[3])) || arr[3] === undefined || isPlainOptsObj(arr[3])) {
        const pr = parsePairRef(arr[2]);
        if (pr) {
          const ang = (arr[3] !== undefined && !isPlainOptsObj(arr[3])) ? arr[3] : 60;
          const extra = isPlainOptsObj(arr[3]) ? arr[3] : (isPlainOptsObj(arr[4]) ? arr[4] : {});
          return { op: 'rotate', id: cleanRef(arr[1]), center: pr[0], point: pr[1], angleDeg: ang, ...extra };
        }
      }
      const ang = (arr[4] !== undefined && !isPlainOptsObj(arr[4])) ? arr[4] : 60;
      const kVal = (typeof arr[5] === 'number') ? arr[5] : undefined;
      const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : (isPlainOptsObj(arr[6]) ? arr[6] : {}));
      return { op: 'rotate', id: cleanRef(arr[1]), center: cleanRef(arr[2]), point: cleanRef(arr[3]), angleDeg: ang, ...(kVal !== undefined ? { k: kVal } : {}), ...extra };
    }

    if (head === 'bis' || head === 'angle_bisector' || head === 'bisector') {
      if (typeof arr[3] === 'string' && typeof arr[4] === 'string') {
        const extra = typeof arr[5] === 'boolean' ? { onOpposite: arr[5], ...(isPlainOptsObj(arr[6]) ? arr[6] : {}) } : (isPlainOptsObj(arr[5]) ? arr[5] : {});
        return { op: 'angle_bisector', id: cleanRef(arr[1]), a: cleanRef(arr[2]), o: cleanRef(arr[3]), b: cleanRef(arr[4]), ...extra };
      }
      const tr = parseTripleRef(arr[2]);
      if (!tr) return null;
      const extra = typeof arr[3] === 'boolean' ? { onOpposite: arr[3], ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) } : (isPlainOptsObj(arr[3]) ? arr[3] : {});
      return { op: 'angle_bisector', id: cleanRef(arr[1]), a: tr[0], o: tr[1], b: tr[2], ...extra };
    }

    if (head === 'foot' || head === 'foot_perp') {
      if (typeof arr[4] === 'string' && !isPlainOptsObj(arr[4])) {
        return { op: 'foot_perp', id: cleanRef(arr[1]), p: cleanRef(arr[2]), a: cleanRef(arr[3]), b: cleanRef(arr[4]), ...(isPlainOptsObj(arr[5]) ? arr[5] : {}) };
      }
      const pr = parsePairRef(arr[3]);
      return pr ? { op: 'foot_perp', id: cleanRef(arr[1]), p: cleanRef(arr[2]), a: pr[0], b: pr[1], ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) } : null;
    }

    if (head === 'par' || head === 'line_parallel' || head === 'perp' || head === 'line_perp') {
      const targetOp = (head === 'perp' || head === 'line_perp') ? 'line_perp' : 'line_parallel';
      const idStr = cleanRef(arr[1]);
      const isLineLbl = /^[a-zΔδαβγ][0-9']*$/.test(idStr);
      let aSym = '', bSym = '', extra = {};
      if (typeof arr[4] === 'string' && !isPlainOptsObj(arr[4])) {
        aSym = cleanRef(arr[3]); bSym = cleanRef(arr[4]);
        extra = isPlainOptsObj(arr[5]) ? arr[5] : {};
      } else {
        const pr = parsePairRef(arr[3]);
        if (!pr) return null;
        aSym = pr[0]; bSym = pr[1];
        extra = isPlainOptsObj(arr[4]) ? arr[4] : {};
      }
      return {
        op: targetOp,
        id: idStr,
        through: cleanRef(arr[2]),
        a: aSym,
        b: bSym,
        ...(isLineLbl && extra.asLine === undefined && extra.drawSegment !== false ? { asLine: true, noDot: true, aux: true } : {}),
        ...extra
      };
    }

    if (head === 'inter' || head === 'inter_ll' || head === 'intersection_ll') {
      return { op: 'intersection_ll', id: cleanRef(arr[1]), l1: arr[2], l2: arr[3], ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) };
    }

    if (head === 'inter_lc' || head === 'intersection_lc') {
      const whichVal = (typeof arr[4] === 'number') ? arr[4] : undefined;
      const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : {});
      return { op: 'intersection_lc', id: cleanRef(arr[1]), line: arr[2], circle: arr[3], ...(whichVal !== undefined ? { which: whichVal } : {}), ...extra };
    }

    if (head === 'inter_cc' || head === 'intersection_cc') {
      const whichVal = (typeof arr[4] === 'number') ? arr[4] : undefined;
      const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : {});
      return { op: 'intersection_cc', id: cleanRef(arr[1]), c1: arr[2], c2: arr[3], ...(whichVal !== undefined ? { which: whichVal } : {}), ...extra };
    }

    if (head === 'tan' || head === 'tangent_point' || head === 'tangents_from_point') {
      const isPair = Array.isArray(arr[1]) || (typeof arr[1] === 'string' && arr[1].includes('-'));
      if (isPair || head === 'tangents_from_point') {
        const pairPts = parseVertexList(arr[1]);
        const extP = cleanRef(arr[2]);
        if (typeof arr[4] === 'string' || typeof arr[4] === 'number') {
          const extra = isPlainOptsObj(arr[5]) ? arr[5] : {};
          if (isNumericRadiusVal(arr[4])) {
            return { op: 'tangents_from_point', pts: pairPts, p: extP, center: cleanRef(arr[3]), r: arr[4], ...extra };
          }
          return { op: 'tangents_from_point', pts: pairPts, p: extP, center: cleanRef(arr[3]), rim: cleanRef(arr[4]), ...extra };
        }
        const extra = isPlainOptsObj(arr[4]) ? arr[4] : {};
        const cPair = parsePairRef(arr[3]);
        if (cPair) {
          return { op: 'tangents_from_point', pts: pairPts, p: extP, center: cPair[0], rim: cPair[1], ...extra };
        }
        return { op: 'tangents_from_point', pts: pairPts, p: extP, circle: arr[3], ...extra };
      }
      // Single tangent_point
      const idStr = cleanRef(arr[1]);
      const extP = cleanRef(arr[2]);
      const cPair = parsePairRef(arr[3]);
      if (cPair) {
        const whichVal = typeof arr[4] === 'number' ? arr[4] : undefined;
        const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : {});
        return { op: 'tangent_point', id: idStr, p: extP, center: cPair[0], rim: cPair[1], ...(whichVal !== undefined ? { which: whichVal } : {}), ...extra };
      }
      const whichVal = typeof arr[5] === 'number' ? arr[5] : undefined;
      const extra = isPlainOptsObj(arr[5]) ? arr[5] : (isPlainOptsObj(arr[6]) ? arr[6] : {});
      if (isNumericRadiusVal(arr[4])) {
        return { op: 'tangent_point', id: idStr, p: extP, center: cleanRef(arr[3]), r: arr[4], ...(whichVal !== undefined ? { which: whichVal } : {}), ...extra };
      }
      return { op: 'tangent_point', id: idStr, p: extP, center: cleanRef(arr[3]), rim: cleanRef(arr[4]), ...(whichVal !== undefined ? { which: whichVal } : {}), ...extra };
    }

    if (head === 'ctan' || head === 'common_tangent') {
      return { op: 'common_tangent', id: cleanRef(arr[1]), c1: arr[2], c2: arr[3], ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) };
    }

    if (head === 'segs' || head === 'segments') {
      const solid = Array.isArray(arr[1]) ? arr[1] : [];
      const dashed = Array.isArray(arr[2]) ? arr[2] : [];
      const extra = isPlainOptsObj(arr[2]) ? arr[2] : (isPlainOptsObj(arr[3]) ? arr[3] : {});
      return { op: 'segments', solid, dashed, ...extra };
    }

    if (head === 'seg' || head === 'segment' || head === 'line' || head === 'ray') {
      const targetOp = head === 'seg' ? 'segment' : head;
      const pr = parsePairRef(arr[1]);
      if (pr && (arr.length === 2 || typeof arr[2] === 'boolean' || isPlainOptsObj(arr[2]))) {
        const dashFlag = typeof arr[2] === 'boolean' ? arr[2] : undefined;
        const extra = isPlainOptsObj(arr[2]) ? arr[2] : (isPlainOptsObj(arr[3]) ? arr[3] : {});
        return { op: targetOp, a: pr[0], b: pr[1], ...(dashFlag !== undefined ? { dashed: dashFlag } : {}), ...extra };
      }
      const dashFlag = typeof arr[3] === 'boolean' ? arr[3] : undefined;
      const extra = isPlainOptsObj(arr[3]) ? arr[3] : (isPlainOptsObj(arr[4]) ? arr[4] : {});
      return { op: targetOp, a: cleanRef(arr[1]), b: cleanRef(arr[2]), ...(dashFlag !== undefined ? { dashed: dashFlag } : {}), ...extra };
    }

    if (head === 'sec' || head === 'section' || head === 'poly' || head === 'connect_polygon') {
      const isSec = head === 'sec' || head === 'section';
      const ptsList = parseVertexList(arr[1]);
      const dashedList = Array.isArray(arr[2]) ? arr[2] : undefined;
      const extra = isPlainOptsObj(arr[2]) ? arr[2] : (isPlainOptsObj(arr[3]) ? arr[3] : {});
      return {
        op: 'connect_polygon',
        pts: ptsList,
        ...(dashedList ? { dashedEdges: dashedList } : {}),
        ...(isSec && !extra.fill ? { fill: 'rgba(15, 23, 42, 0.06)', effect: extra.effect || 'fade' } : {}),
        ...extra
      };
    }

    if (head === 'fill' || head === 'polygon_fill') {
      const ptsList = parseVertexList(arr[1]);
      const extra = typeof arr[2] === 'string'
        ? { fill: arr[2], ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) }
        : (isPlainOptsObj(arr[2]) ? arr[2] : {});
      return { op: 'polygon_fill', pts: ptsList, fill: extra.fill || 'rgba(15, 23, 42, 0.06)', ...extra };
    }

    if (head === 'circle') {
      if (arr[2] === undefined || isPlainOptsObj(arr[2])) {
        const pr = parsePairRef(arr[1]);
        if (pr) return { op: 'circle', center: pr[0], rim: pr[1], ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) };
      }
      if (isNumericRadiusVal(arr[2])) {
        return { op: 'circle', center: cleanRef(arr[1]), r: arr[2], ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
      }
      return { op: 'circle', center: cleanRef(arr[1]), rim: cleanRef(arr[2]), ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
    }

    if (head === 'on_circle' || head === 'point_on_circle') {
      const pr = parsePairRef(arr[2]);
      if (pr) {
        const ang = (arr[3] !== undefined && !isPlainOptsObj(arr[3])) ? arr[3] : 60;
        const extra = isPlainOptsObj(arr[3]) ? arr[3] : (isPlainOptsObj(arr[4]) ? arr[4] : {});
        return { op: 'point_on_circle', id: cleanRef(arr[1]), center: pr[0], rim: pr[1], angleDeg: ang, ...extra };
      }
      const ang = (arr[4] !== undefined && !isPlainOptsObj(arr[4])) ? arr[4] : 60;
      const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : {});
      if (isNumericRadiusVal(arr[3])) {
        return { op: 'point_on_circle', id: cleanRef(arr[1]), center: cleanRef(arr[2]), r: arr[3], angleDeg: ang, ...extra };
      }
      return { op: 'point_on_circle', id: cleanRef(arr[1]), center: cleanRef(arr[2]), rim: cleanRef(arr[3]), angleDeg: ang, ...extra };
    }

    if (head === 'circumcircle' || head === 'incircle') {
      return { op: head, center: cleanRef(arr[1]), pts: parseVertexList(arr[2]), ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
    }

    if (head === 'orthocenter' || head === 'centroid') {
      return { op: head, id: cleanRef(arr[1]), pts: parseVertexList(arr[2]), ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
    }

    if (head === 'equilateral_triangle' || head === 'equilateral') {
      return { op: 'equilateral_triangle', pts: parseVertexList(arr[1]), ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) };
    }

    if (head === 'square_2d' || head === 'square') {
      return { op: 'square_2d', pts: parseVertexList(arr[1]), ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) };
    }

    if (head === 'right' || head === 'right_angle') {
      if (typeof arr[2] === 'string' && typeof arr[3] === 'string') {
        return { op: 'right_angle', a: cleanRef(arr[1]), v: cleanRef(arr[2]), b: cleanRef(arr[3]), aux: true, ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) };
      }
      const tr = parseTripleRef(arr[1]);
      return tr ? { op: 'right_angle', a: tr[0], v: tr[1], b: tr[2], aux: true, ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) } : null;
    }

    if (head === 'ang' || head === 'angle_mark') {
      if (typeof arr[2] === 'string' && typeof arr[3] === 'string') {
        const nVal = typeof arr[4] === 'number' ? arr[4] : 1;
        const extra = isPlainOptsObj(arr[4]) ? arr[4] : (isPlainOptsObj(arr[5]) ? arr[5] : {});
        return { op: 'angle_mark', a: cleanRef(arr[1]), v: cleanRef(arr[2]), b: cleanRef(arr[3]), n: nVal, aux: true, ...extra };
      }
      const tr = parseTripleRef(arr[1]);
      if (!tr) return null;
      const nVal = typeof arr[2] === 'number' ? arr[2] : 1;
      const extra = isPlainOptsObj(arr[2]) ? arr[2] : (isPlainOptsObj(arr[3]) ? arr[3] : {});
      return { op: 'angle_mark', a: tr[0], v: tr[1], b: tr[2], n: nVal, aux: true, ...extra };
    }

    if (head === 'tick' || head === 'tick_mark') {
      if (typeof arr[2] === 'string' && !isPlainOptsObj(arr[2])) {
        const nVal = typeof arr[3] === 'number' ? arr[3] : 1;
        const extra = isPlainOptsObj(arr[3]) ? arr[3] : (isPlainOptsObj(arr[4]) ? arr[4] : {});
        return { op: 'tick_mark', a: cleanRef(arr[1]), b: cleanRef(arr[2]), n: nVal, aux: true, ...extra };
      }
      const pr = parsePairRef(arr[1]);
      if (!pr) return null;
      const nVal = typeof arr[2] === 'number' ? arr[2] : 1;
      const extra = isPlainOptsObj(arr[2]) ? arr[2] : (isPlainOptsObj(arr[3]) ? arr[3] : {});
      return { op: 'tick_mark', a: pr[0], b: pr[1], n: nVal, aux: true, ...extra };
    }

    if (head === 'arc' || head === 'arc3' || head === 'sector') {
      if (isPlainOptsObj(arr[1])) return { op: head, ...arr[1] };
      const tr = parseTripleRef(arr[1]);
      if (tr) return { op: head, pts: tr, ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) };
      return { op: head, pts: [cleanRef(arr[1]), cleanRef(arr[2]), cleanRef(arr[3])], ...(isPlainOptsObj(arr[4]) ? arr[4] : {}) };
    }

    if (head === 'cone' || head === 'cylinder' || head === 'sphere' || head === 'frustumcone' || head === 'frustum_cone') {
      const canonical = (head === 'frustumcone' || head === 'frustum_cone') ? 'frustumCone' : head;
      if (isPlainOptsObj(arr[1])) return { op: canonical, ...arr[1] };
      if (Array.isArray(arr[1])) return { op: canonical, pts: arr[1].map(cleanRef), ...(isPlainOptsObj(arr[2]) ? arr[2] : {}) };
      if (canonical === 'sphere' && isNumericRadiusVal(arr[2])) {
        return { op: 'sphere', center: cleanRef(arr[1]), r: arr[2], ...(isPlainOptsObj(arr[3]) ? arr[3] : {}) };
      }
      return { op: canonical, pts: arr.slice(1).filter(x => typeof x === 'string').map(cleanRef), ...(isPlainOptsObj(arr[arr.length - 1]) ? arr[arr.length - 1] : {}) };
    }

    return null;
  }

  // ==========================================================================
  // PASS 0: COMPACT SHORTHAND, TUPLE DSL & HIGH-LEVEL MACRO EXPANDER
  // ==========================================================================
  function expandCompactAiGeoMacros(parsedPlan, outFixes) {
    const fixes = Array.isArray(outFixes) ? outFixes : [];
    let raw = parsedPlan;
    if (typeof raw === 'string') {
      raw = extractJsonObject(raw, fixes);
    }
    if (Array.isArray(raw)) {
      raw = { ops: raw };
    }
    if (!raw || typeof raw !== 'object') return raw;

    const plan = JSON.parse(JSON.stringify(raw));
    if (plan.t !== undefined && plan.title === undefined) {
      plan.title = String(plan.t);
      delete plan.t;
    }
    if (plan.m !== undefined && plan.motion === undefined) {
      plan.motion = typeof plan.m === 'string' ? { preset: plan.m } : plan.m;
      delete plan.m;
    }
    if (plan.o !== undefined && plan.ops === undefined && Array.isArray(plan.o)) {
      plan.ops = plan.o;
      delete plan.o;
    }

    const srcOps = Array.isArray(plan.ops)
      ? plan.ops
      : (Array.isArray(plan.constructions)
        ? plan.constructions
        : (Array.isArray(plan.steps) && plan.steps.some(s => s && (s.op || Array.isArray(s))) ? plan.steps : null));

    if (!srcOps || !srcOps.length) return plan;

    const outOps = [];
    const declaredPts = new Map(); // id -> op object in outOps
    const rimCache = new Map(); // "O::2.2" -> hidden rim point id
    let expandedMacroCount = 0;

    const emitOp = (opObj) => {
      if (!opObj || typeof opObj !== 'object') return;
      if (opObj.fx !== undefined && opObj.effect === undefined) {
        opObj.effect = opObj.fx;
        delete opObj.fx;
      }
      if (POINT_PRODUCING_OPS.has(opObj.op)) {
        const pid = cleanRef(opObj.id || opObj.label);
        if (pid) {
          opObj.id = pid;
          if (pid.startsWith('__')) {
            if (opObj.label === undefined) opObj.label = '';
            if (opObj.show === undefined) opObj.show = false;
            if (opObj.noDot === undefined) opObj.noDot = true;
          } else if (opObj.label === undefined) {
            opObj.label = pid;
          }
          declaredPts.set(pid, opObj);
        }
      }
      outOps.push(opObj);
    };

    const emitSegmentsBatch = (solidList, dashedList, sharedProps = {}) => {
      const pushSegItem = (item, defaultDashed) => {
        if (isPlainOptsObj(item)) {
          const pr = (item.a && item.b) ? [cleanRef(item.a), cleanRef(item.b)] : parsePairRef(item.s || item.seg || item.edge);
          if (pr) emitOp({ op: 'segment', ...sharedProps, ...item, a: pr[0], b: pr[1], dashed: item.dashed !== undefined ? !!item.dashed : defaultDashed });
          return;
        }
        const pr = parsePairRef(item);
        if (pr) emitOp({ op: 'segment', a: pr[0], b: pr[1], dashed: defaultDashed, ...sharedProps });
      };
      if (Array.isArray(solidList)) solidList.forEach(s => pushSegItem(s, false));
      if (Array.isArray(dashedList)) dashedList.forEach(s => pushSegItem(s, true));
    };

    const emitPointIfMissing = (id, x, y, extra = {}) => {
      const sym = cleanRef(id);
      if (!sym || declaredPts.has(sym)) return;
      emitOp({
        op: 'point_free',
        id: sym,
        label: sym.startsWith('__') ? '' : sym,
        x: Number(Number(x).toFixed(4)),
        y: Number(Number(y).toFixed(4)),
        ...extra
      });
    };

    const ensureRimForNumericRadius = (centerSym, rawR) => {
      const cSym = cleanRef(centerSym || 'O');
      const rVal = parseMathNumber(rawR, NaN);
      if (!cSym || !Number.isFinite(rVal) || rVal <= 0) return '';
      const rKey = `${cSym}::${rVal.toFixed(6)}`;
      if (rimCache.has(rKey)) return rimCache.get(rKey);

      const rSlug = String(Number(rVal.toFixed(4))).replace(/[^0-9a-zA-Z]/g, '_');
      const rimId = `__rim_${cSym}_${rSlug}`;
      if (!declaredPts.has(cSym)) {
        emitPointIfMissing(cSym, 0, 0, { step: `Đặt tâm ${cSym}` });
      }
      const cOp = declaredPts.get(cSym);
      if (cOp && cOp.op === 'point_free') {
        const cx = parseMathNumber(cOp.x ?? 0, 0);
        const cy = parseMathNumber(cOp.y ?? 0, 0);
        emitOp({
          op: 'point_free',
          id: rimId,
          label: '',
          x: Number((cx + rVal).toFixed(6)),
          y: Number(cy.toFixed(6)),
          show: false,
          noDot: true
        });
      } else {
        const u0Id = '__unit_o';
        const uxId = `__unit_x_${rSlug}`;
        emitPointIfMissing(u0Id, 0, 0, { label: '', show: false, noDot: true });
        emitPointIfMissing(uxId, rVal, 0, { label: '', show: false, noDot: true });
        emitOp({
          op: 'point_sum',
          id: rimId,
          label: '',
          a: cSym,
          b: uxId,
          c: u0Id,
          show: false,
          noDot: true
        });
      }
      rimCache.set(rKey, rimId);
      return rimId;
    };

    const normalizeCirclePairSlot = (slotVal) => {
      if (!slotVal) return slotVal;
      if (Array.isArray(slotVal) && slotVal.length >= 2) {
        if (isNumericRadiusVal(slotVal[1])) {
          return [cleanRef(slotVal[0]), ensureRimForNumericRadius(slotVal[0], slotVal[1])];
        }
        return [cleanRef(slotVal[0]), cleanRef(slotVal[1])];
      }
      if (isPlainOptsObj(slotVal) && (slotVal.center || slotVal.o)) {
        const cSym = cleanRef(slotVal.center || slotVal.o);
        if (slotVal.rim === undefined && isNumericRadiusVal(slotVal.r ?? slotVal.radius)) {
          return [cSym, ensureRimForNumericRadius(cSym, slotVal.r ?? slotVal.radius)];
        }
        return [cSym, cleanRef(slotVal.rim || slotVal.r)];
      }
      if (typeof slotVal === 'string') {
        const s = slotVal.trim();
        const dashIdx = s.indexOf('-');
        if (dashIdx > 0) {
          const left = cleanRef(s.slice(0, dashIdx));
          const right = cleanRef(s.slice(dashIdx + 1));
          if (left && isNumericRadiusVal(right)) {
            return [left, ensureRimForNumericRadius(left, right)];
          }
        }
        const pr = parsePairRef(s);
        if (pr) return pr;
      }
      return slotVal;
    };

    for (const rawItem of srcOps) {
      let op = null;
      if (Array.isArray(rawItem)) {
        op = convertTupleToOpObject(rawItem);
        if (op) expandedMacroCount++;
      } else if (rawItem && typeof rawItem === 'object') {
        op = { ...rawItem };
      }
      if (!op) continue;

      if (op.fx !== undefined && op.effect === undefined) {
        op.effect = op.fx;
        delete op.fx;
      }

      const rawOpName = String(op.op || op.type || '').trim();
      if (!rawOpName) continue;
      const low = rawOpName.toLowerCase();

      if (low === 'tan' && (Array.isArray(op.pts) || Array.isArray(op.ids) || (typeof op.pts === 'string' && op.pts.length >= 2))) {
        op.op = 'tangents_from_point';
      } else if (low === 'inter' || low === 'intersection') {
        op.op = ((op.c1 && op.c2) || (op.circle1 && op.circle2))
          ? 'intersection_cc'
          : ((op.circle || op.c2) ? 'intersection_lc' : 'intersection_ll');
      } else if (OP_NAME_ALIASES[low]) {
        if (low === 'point' && op.x === undefined && op.y === undefined) continue;
        op.op = OP_NAME_ALIASES[low];
      } else {
        op.op = low;
      }

      // 1. Batch `points`
      if (op.op === 'points') {
        expandedMacroCount++;
        const ptsSrc = op.pts || op.points || {};
        if (Array.isArray(ptsSrc)) {
          for (const entry of ptsSrc) {
            if (Array.isArray(entry) && entry.length >= 3) {
              emitOp({ op: 'point_free', id: cleanRef(entry[0]), x: entry[1], y: entry[2], ...(isPlainOptsObj(entry[3]) ? entry[3] : {}) });
            } else if (isPlainOptsObj(entry) && (entry.id || entry.label)) {
              emitOp({ op: 'point_free', ...entry });
            }
          }
        } else if (isPlainOptsObj(ptsSrc)) {
          for (const [k, v] of Object.entries(ptsSrc)) {
            if (Array.isArray(v) && v.length >= 2) {
              emitOp({ op: 'point_free', id: cleanRef(k), x: v[0], y: v[1], ...(isPlainOptsObj(v[2]) ? v[2] : {}) });
            } else if (isPlainOptsObj(v)) {
              emitOp({ op: 'point_free', id: cleanRef(k), ...v });
            }
          }
        }
        continue;
      }

      // 2. Batch `segments`
      if (op.op === 'segments') {
        expandedMacroCount++;
        const shared = {};
        for (const k of ['aux', 'effect', 'easing', 'durationMul', 'delayMs', 'pauseAfter', 'color', 'width', 'explicitColor', 'explicitWidth', 'arrow', 'rev', 'step']) {
          if (op[k] !== undefined) shared[k] = op[k];
        }
        emitSegmentsBatch(op.solid, op.dashed, shared);
        if (Array.isArray(op.edges)) {
          const defDash = !!(op.dashedFlag || op.dashed === true);
          emitSegmentsBatch(defDash ? [] : op.edges, defDash ? op.edges : [], shared);
        }
        continue;
      }

      // 3. High-Level 3D `pyramid` Macro
      if (op.op === 'pyramid') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = true;
        let apex = cleanRef(op.apex || 'S');
        let base = Array.isArray(op.base) ? parseVertexList(op.base) : (typeof op.base === 'string' ? parseVertexList(op.base) : []);
        if (op.name && typeof op.name === 'string') {
          const dotIdx = op.name.indexOf('.');
          if (dotIdx > 0) {
            apex = cleanRef(op.name.slice(0, dotIdx)) || apex;
            const parsedB = parseVertexList(op.name.slice(dotIdx + 1));
            if (parsedB.length >= 3) base = parsedB;
          } else {
            const parsedAll = parseVertexList(op.name);
            if (parsedAll.length >= 4) { apex = parsedAll[0]; base = parsedAll.slice(1); }
          }
        }
        const bTypeRaw = String(op.baseType || op.base_type || '').trim().toLowerCase();
        if (!base.length) {
          base = (bTypeRaw === 'triangle' || bTypeRaw === 'tam_giac') ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
        }
        const altRaw = String(op.altitude || op.alt || 'free').trim();
        const altLow = altRaw.toLowerCase();
        const hasExplicitH = op.height !== undefined || op.h !== undefined;
        const h = hasExplicitH ? parseMathNumber(op.height ?? op.h, 3.8) : 3.8;
        const mainFx = op.effect || undefined;
        const fxProp = mainFx ? { effect: mainFx } : {};

        if (base.length === 3) {
          const [b0, b1, b2] = base;
          emitPointIfMissing(b0, -2.6, 0.2);
          emitPointIfMissing(b1, -0.5, -1.8);
          emitPointIfMissing(b2, 2.8, 0.1);
          emitOp({ op: 'connect_polygon', pts: [b0, b1, b2], dashedEdges: [`${b0}-${b2}`], ...fxProp, step: `Dựng đáy tam giác ${b0}${b1}${b2}` });

          if (altLow === 'sa' || altLow === (`s${b0}`).toLowerCase() || altLow === b0.toLowerCase()) {
            emitPointIfMissing(apex, -2.6, hasExplicitH ? Number((0.2 + h).toFixed(4)) : 3.8);
            emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`], [], fxProp);
            emitOp({ op: 'right_angle', a: apex, v: b0, b: b1, aux: true, step: `Góc vuông ${apex}${b0} ⊥ đáy` });
            emitOp({ op: 'right_angle', a: apex, v: b0, b: b2, aux: true });
          } else if (altLow === 'sb' || altLow === (`s${b1}`).toLowerCase() || altLow === b1.toLowerCase()) {
            emitPointIfMissing(apex, -0.5, Number((-1.8 + h).toFixed(4)));
            emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`], [], fxProp);
            emitOp({ op: 'right_angle', a: apex, v: b1, b: b0, aux: true });
            emitOp({ op: 'right_angle', a: apex, v: b1, b: b2, aux: true });
          } else if (/^face_/i.test(altLow) || altLow === 'face') {
            const footId = cleanRef(op.footId || op.foot || 'H');
            emitOp({ op: 'midpoint', id: footId, a: b0, b: b1, step: `Trung điểm ${footId} của ${b0}${b1}` });
            emitPointIfMissing(apex, -1.55, Number((-0.8 + h).toFixed(4)));
            emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`], [], fxProp);
            emitOp({ op: 'segment', a: apex, b: footId, dashed: false, aux: true, step: `Đường cao ${apex}${footId} ⊥ (${b0}${b1}${b2})` });
            emitOp({ op: 'right_angle', a: apex, v: footId, b: b0, aux: true });
          } else if (altLow === 'center' || altLow === 'regular' || altLow === 'o' || altLow === 'g') {
            const gId = cleanRef(op.centerId || op.footId || 'O');
            const mBc = `__mid_${b1}_${b2}_${gId}`;
            const mAc = `__mid_${b0}_${b2}_${gId}`;
            emitOp({ op: 'midpoint', id: mBc, label: '', a: b1, b: b2, show: false, noDot: true });
            emitOp({ op: 'midpoint', id: mAc, label: '', a: b0, b: b2, show: false, noDot: true });
            emitOp({ op: 'intersection_ll', id: gId, l1: [b0, mBc], l2: [b1, mAc], noAutoConnect: true, step: `Trọng tâm ${gId} của đáy ${b0}${b1}${b2}` });
            emitPointIfMissing(apex, -0.1, Number((-0.5 + (hasExplicitH ? h : 3.9)).toFixed(4)));
            emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`], [], fxProp);
            emitOp({ op: 'segment', a: apex, b: gId, dashed: true, aux: true, step: `Đường cao ${apex}${gId}` });
          } else {
            emitPointIfMissing(apex, 0.2, h);
            emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`], [], fxProp);
          }
        } else {
          const [b0, b1, b2, b3] = base;
          const isPara = ['parallelogram', 'rect', 'rectangle', 'square', 'rhombus', 'hbh'].includes(bTypeRaw);
          const isTrap = bTypeRaw === 'trapezoid' || bTypeRaw === 'hinh_thang' || bTypeRaw === 'hinhthang';

          if (isPara) {
            emitPointIfMissing(b0, -2.2, 0);
            emitPointIfMissing(b1, -3.6, -1.8);
            emitPointIfMissing(b3, 2.6, 0);
            if (!declaredPts.has(b2)) {
              emitOp({ op: 'point_sum', id: b2, a: b1, b: b3, c: b0, step: `Dựng đỉnh ${b2} = ${b1} + ${b3} - ${b0}` });
            }
            emitOp({ op: 'connect_polygon', pts: [b0, b1, b2, b3], dashedEdges: [`${b0}-${b1}`, `${b0}-${b3}`], ...fxProp, step: `Dựng đáy ${b0}${b1}${b2}${b3}` });

            if (altLow === 'sa' || altLow === (`s${b0}`).toLowerCase() || altLow === b0.toLowerCase()) {
              emitPointIfMissing(apex, -2.2, h);
              emitSegmentsBatch([`${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [`${apex}-${b0}`], fxProp);
              emitOp({ op: 'right_angle', a: apex, v: b0, b: b1, aux: true, step: `Góc vuông ${apex}${b0} ⊥ đáy` });
              emitOp({ op: 'right_angle', a: apex, v: b0, b: b3, aux: true });
            } else if (altLow === 'sb' || altLow === (`s${b1}`).toLowerCase() || altLow === b1.toLowerCase()) {
              emitPointIfMissing(apex, -3.6, Number((-1.8 + h).toFixed(4)));
              emitSegmentsBatch([`${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [`${apex}-${b0}`], fxProp);
              emitOp({ op: 'right_angle', a: apex, v: b1, b: b0, aux: true });
              emitOp({ op: 'right_angle', a: apex, v: b1, b: b2, aux: true });
            } else if (/^face_/i.test(altLow) || altLow === 'face') {
              const footId = cleanRef(op.footId || op.foot || 'H');
              emitOp({ op: 'midpoint', id: footId, a: b0, b: b1, step: `Trung điểm ${footId} của ${b0}${b1}` });
              emitPointIfMissing(apex, -2.9, hasExplicitH ? Number((-0.9 + h).toFixed(4)) : 2.9);
              emitSegmentsBatch([`${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [`${apex}-${b0}`], fxProp);
              emitOp({ op: 'segment', a: apex, b: footId, dashed: true, aux: true, step: `Đường cao ${apex}${footId} ⊥ (${b0}${b1}${b2}${b3})` });
              emitOp({ op: 'right_angle', a: apex, v: footId, b: b0, aux: true });
            } else if (altLow === 'center' || altLow === 'regular' || altLow === 'o') {
              const oId = cleanRef(op.centerId || op.footId || 'O');
              emitSegmentsBatch([], [`${b0}-${b2}`, `${b1}-${b3}`], { aux: true });
              emitOp({ op: 'intersection_ll', id: oId, l1: [b0, b2], l2: [b1, b3], step: `Tâm đáy ${oId} = ${b0}${b2} ∩ ${b1}${b3}` });
              emitPointIfMissing(apex, -0.5, hasExplicitH ? Number((-0.9 + h).toFixed(4)) : 3.3);
              emitSegmentsBatch([`${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [`${apex}-${b0}`], fxProp);
              emitOp({ op: 'segment', a: apex, b: oId, dashed: true, aux: true, step: `Đường cao ${apex}${oId}` });
              emitOp({ op: 'right_angle', a: apex, v: oId, b: b3, aux: true });
            } else {
              emitPointIfMissing(apex, -0.8, h);
              emitSegmentsBatch([`${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [`${apex}-${b0}`], fxProp);
            }
          } else if (isTrap) {
            const parSpec = String(op.parallel || '').replace(/\s+/g, '').toUpperCase();
            const isABparCD = parSpec === `${b0}${b1}//${b2}${b3}` || parSpec === `${b0}${b1}//${b3}${b2}`;
            if (isABparCD) {
              emitPointIfMissing(b0, -3.0, 0.3);
              emitPointIfMissing(b1, 3.0, 0.3);
              emitPointIfMissing(b3, -1.5, -1.8);
              if (!declaredPts.has(b2)) {
                emitOp({ op: 'line_parallel', id: b2, through: b3, a: b0, b: b1, k: 0.52, drawSegment: false, drag: true, step: `Đỉnh ${b2} sao cho ${b2}${b3} // ${b0}${b1}` });
              }
              emitOp({ op: 'connect_polygon', pts: [b0, b1, b2, b3], dashedEdges: [`${b0}-${b1}`], ...fxProp, step: `Dựng đáy hình thang ${b0}${b1}${b2}${b3}` });
            } else {
              emitPointIfMissing(b0, -3.0, 0.3);
              emitPointIfMissing(b1, -1.6, -1.8);
              emitPointIfMissing(b3, 3.0, 0.3);
              if (!declaredPts.has(b2)) {
                emitOp({ op: 'line_parallel', id: b2, through: b1, a: b0, b: b3, k: 0.52, drawSegment: false, drag: true, step: `Đỉnh ${b2} sao cho ${b1}${b2} // ${b0}${b3}` });
              }
              emitOp({ op: 'connect_polygon', pts: [b0, b1, b2, b3], dashedEdges: [`${b0}-${b3}`], ...fxProp, step: `Dựng đáy hình thang ${b0}${b1}${b2}${b3}` });
            }

            if (altLow === 'sa' || altLow === (`s${b0}`).toLowerCase() || altLow === b0.toLowerCase()) {
              emitPointIfMissing(apex, -3.0, h);
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
              emitOp({ op: 'right_angle', a: apex, v: b0, b: b1, aux: true, step: `Góc vuông ${apex}${b0} ⊥ đáy` });
              emitOp({ op: 'right_angle', a: apex, v: b0, b: b3, aux: true });
            } else if (/^face_/i.test(altLow) || altLow === 'face') {
              const footId = cleanRef(op.footId || op.foot || 'H');
              emitOp({ op: 'midpoint', id: footId, a: b0, b: b1 });
              emitPointIfMissing(apex, -2.3, Number((-0.75 + h).toFixed(4)));
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
              emitOp({ op: 'segment', a: apex, b: footId, dashed: isABparCD, aux: true });
              emitOp({ op: 'right_angle', a: apex, v: footId, b: b0, aux: true });
            } else if (altLow === 'center' || altLow === 'o') {
              const oId = cleanRef(op.centerId || op.footId || 'O');
              emitSegmentsBatch([], [`${b0}-${b2}`, `${b1}-${b3}`], { aux: true });
              emitOp({ op: 'intersection_ll', id: oId, l1: [b0, b2], l2: [b1, b3] });
              emitPointIfMissing(apex, -0.05, h);
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
              emitOp({ op: 'segment', a: apex, b: oId, dashed: true, aux: true });
              emitOp({ op: 'right_angle', a: apex, v: oId, b: b3, aux: true });
            } else {
              emitPointIfMissing(apex, 0.3, h);
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
            }
          } else {
            // General convex quad S.ABCD
            emitPointIfMissing(b0, -2.8, 0.2);
            emitPointIfMissing(b1, -1.7, -1.8);
            emitPointIfMissing(b2, 1.7, -2.2);
            emitPointIfMissing(b3, 3.2, 0.5);
            emitOp({ op: 'connect_polygon', pts: [b0, b1, b2, b3], dashedEdges: [`${b0}-${b3}`], ...fxProp, step: `Dựng đáy tứ giác lồi ${b0}${b1}${b2}${b3}` });

            if (altLow === 'sa' || altLow === (`s${b0}`).toLowerCase() || altLow === b0.toLowerCase()) {
              emitPointIfMissing(apex, -2.8, h);
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
              emitOp({ op: 'right_angle', a: apex, v: b0, b: b1, aux: true, step: `Góc vuông ${apex}${b0} ⊥ đáy` });
              emitOp({ op: 'right_angle', a: apex, v: b0, b: b3, aux: true });
            } else if (/^face_/i.test(altLow) || altLow === 'face') {
              const footId = cleanRef(op.footId || op.foot || 'H');
              emitOp({ op: 'midpoint', id: footId, a: b0, b: b1 });
              emitPointIfMissing(apex, -2.25, Number((-0.8 + h).toFixed(4)));
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
              emitOp({ op: 'segment', a: apex, b: footId, dashed: false, aux: true });
              emitOp({ op: 'right_angle', a: apex, v: footId, b: b0, aux: true });
            } else if (altLow === 'center' || altLow === 'o') {
              const oId = cleanRef(op.centerId || op.footId || 'O');
              emitSegmentsBatch([], [`${b0}-${b2}`, `${b1}-${b3}`], { aux: true });
              emitOp({ op: 'intersection_ll', id: oId, l1: [b0, b2], l2: [b1, b3] });
              emitPointIfMissing(apex, -0.17, hasExplicitH ? Number((-0.77 + h).toFixed(4)) : 3.8);
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
              emitOp({ op: 'segment', a: apex, b: oId, dashed: true, aux: true });
              emitOp({ op: 'right_angle', a: apex, v: oId, b: b3, aux: true });
            } else {
              emitPointIfMissing(apex, 0.8, h);
              emitSegmentsBatch([`${apex}-${b0}`, `${apex}-${b1}`, `${apex}-${b2}`, `${apex}-${b3}`], [], fxProp);
            }
          }

          if (op.diagonals && altLow !== 'center' && altLow !== 'regular' && altLow !== 'o') {
            const oId = cleanRef(op.centerId || 'O');
            emitSegmentsBatch([], [`${b0}-${b2}`, `${b1}-${b3}`], { aux: true });
            emitOp({ op: 'intersection_ll', id: oId, l1: [b0, b2], l2: [b1, b3], effect: 'pop', step: `Giao điểm ${oId} = ${b0}${b2} ∩ ${b1}${b3}` });
          }
        }
        continue;
      }

      // 3b. Rigid cube macro (cha = A, B; A' quay 90°, C/B'/C'/D' tổng véc-tơ ⇒ không thể kéo méo)
      const cubeBaseRaw = String(op.baseType || op.base_type || '').trim().toLowerCase();
      if (op.op === 'cube' || op.op === 'lap_phuong' || (op.op === 'prism' && (cubeBaseRaw === 'cube' || cubeBaseRaw === 'lap_phuong'))) {
        const RG = getRigidity();
        if (RG) {
          expandedMacroCount++;
          if (plan.is3D === undefined) plan.is3D = true;
          for (const subOp of RG.buildCubeOps(op)) {
            const sid = subOp.id;
            if (sid && declaredPts.has(sid)) {
              if (subOp.op === 'point_free') continue; // keep AI-placed parent vertices
              const prev = declaredPts.get(sid);
              const pIdx = outOps.indexOf(prev);
              if (pIdx >= 0) outOps.splice(pIdx, 1);
              declaredPts.delete(sid);
              fixes.push(`Đã thay khai báo rời của "${sid}" bằng ràng buộc hình lập phương (con, không kéo được).`);
            }
            emitOp(subOp);
          }
          continue;
        }
      }

      // 4. High-Level 3D `prism` Macro
      if (op.op === 'prism') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = true;
        let botPts = Array.isArray(op.base) ? parseVertexList(op.base) : (typeof op.base === 'string' ? parseVertexList(op.base) : []);
        let topPts = Array.isArray(op.top) ? parseVertexList(op.top) : (typeof op.top === 'string' ? parseVertexList(op.top) : []);
        if (op.name && typeof op.name === 'string') {
          const dotIdx = op.name.indexOf('.');
          if (dotIdx > 0) {
            const bParsed = parseVertexList(op.name.slice(0, dotIdx));
            const tParsed = parseVertexList(op.name.slice(dotIdx + 1));
            if (bParsed.length >= 3 && tParsed.length === bParsed.length) {
              botPts = bParsed;
              topPts = tParsed;
            }
          }
        }
        const bTypeRaw = String(op.baseType || op.base_type || '').trim().toLowerCase();
        const is4Gon = botPts.length === 4 || (!botPts.length && ['parallelogram', 'box', 'rect', 'rectangle', 'square', 'rhombus', 'quad'].includes(bTypeRaw));
        if (!botPts.length) botPts = is4Gon ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
        if (topPts.length !== botPts.length) topPts = botPts.map(v => `${v}'`);

        const upright = op.oblique === true ? false : (op.upright !== undefined ? !!op.upright : true);
        const h = (op.height !== undefined || op.h !== undefined) ? parseMathNumber(op.height ?? op.h, 3.5) : 3.5;
        const dx = upright ? 0 : (op.dx !== undefined ? parseMathNumber(op.dx, 0.75) : 0.75);
        const mainFx = op.effect || undefined;
        const fxProp = mainFx ? { effect: mainFx } : {};
        // Lăng trụ đứng: cạnh bên AA' khóa ⊥ cạnh đáy trước (chỉ trượt theo chiều cao, drag:true).
        // Lăng trụ xiên: A' là cha tự do (hướng cạnh bên là tham số thật của hình).
        const emitPrismApex = (t0Id, baseId, frontId, bx, by, frontLen) => {
          if (declaredPts.has(t0Id)) return;
          if (!upright) {
            emitPointIfMissing(t0Id, Number((bx + dx).toFixed(4)), Number((by + h).toFixed(4)));
            return;
          }
          emitOp({ op: 'line_perp', id: t0Id, through: baseId, a: baseId, b: frontId, k: Number((h / frontLen).toFixed(4)), drawSegment: false, drag: true, step: `Cạnh bên ${baseId}${t0Id} ⊥ đáy (lăng trụ đứng)` });
        };

        if (botPts.length === 3) {
          const [b0, b1, b2] = botPts;
          const [t0, t1, t2] = topPts;
          emitPointIfMissing(b0, -2.6, -1.2);
          emitPointIfMissing(b1, -0.6, -2.6);
          emitPointIfMissing(b2, 2.4, -1.2);
          emitOp({ op: 'connect_polygon', pts: [b0, b1, b2], dashedEdges: [`${b0}-${b2}`], ...fxProp, step: `Dựng đáy dưới ${b0}${b1}${b2}` });
          emitPrismApex(t0, b0, b2, -2.6, -1.2, 5.0);
          if (!declaredPts.has(t1)) emitOp({ op: 'point_sum', id: t1, a: b1, b: t0, c: b0 });
          if (!declaredPts.has(t2)) emitOp({ op: 'point_sum', id: t2, a: b2, b: t0, c: b0 });
          emitOp({ op: 'connect_polygon', pts: [t0, t1, t2], dashedEdges: [], ...fxProp, step: `Dựng đáy trên ${t0}${t1}${t2}` });
          emitSegmentsBatch([`${b0}-${t0}`, `${b1}-${t1}`, `${b2}-${t2}`], [], fxProp);
          if (upright) {
            emitOp({ op: 'right_angle', a: t0, v: b0, b: b1, aux: true });
          }
        } else {
          const [b0, b1, b2, b3] = botPts;
          const [t0, t1, t2, t3] = topPts;
          emitPointIfMissing(b0, -2.2, -1.0);
          emitPointIfMissing(b1, -3.6, -2.5);
          emitPointIfMissing(b3, 2.4, -1.0);
          if (!declaredPts.has(b2)) emitOp({ op: 'point_sum', id: b2, a: b1, b: b3, c: b0 });
          emitOp({ op: 'connect_polygon', pts: [b0, b1, b2, b3], dashedEdges: [`${b0}-${b1}`, `${b0}-${b3}`], ...fxProp, step: `Dựng đáy dưới ${b0}${b1}${b2}${b3}` });
          emitPrismApex(t0, b0, b3, -2.2, -1.0, 4.6);
          if (!declaredPts.has(t1)) emitOp({ op: 'point_sum', id: t1, a: b1, b: t0, c: b0 });
          if (!declaredPts.has(t2)) emitOp({ op: 'point_sum', id: t2, a: b2, b: t0, c: b0 });
          if (!declaredPts.has(t3)) emitOp({ op: 'point_sum', id: t3, a: b3, b: t0, c: b0 });
          emitOp({ op: 'connect_polygon', pts: [t0, t1, t2, t3], dashedEdges: [], ...fxProp, step: `Dựng đáy trên ${t0}${t1}${t2}${t3}` });
          emitSegmentsBatch([`${b1}-${t1}`, `${b2}-${t2}`, `${b3}-${t3}`], [`${b0}-${t0}`], fxProp);
          if (upright) {
            emitOp({ op: 'right_angle', a: t0, v: b0, b: b1, aux: true });
            emitOp({ op: 'right_angle', a: t0, v: b0, b: b3, aux: true });
          }
        }
        continue;
      }

      // 5. 2D Dynamic Macros
      if (op.op === 'equilateral_triangle') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = false;
        const [pA, pB, pC] = parseVertexList(op.pts || ['A', 'B', 'C']);
        if (pA && pB && pC) {
          emitPointIfMissing(pA, -2.0, -1.2);
          emitPointIfMissing(pB, 2.0, -1.2);
          emitOp({ op: 'rotate', id: pC, center: pA, point: pB, angleDeg: op.clockwise ? -60 : 60, k: 1, step: op.step || `Đỉnh ${pC} của tam giác đều ${pA}${pB}${pC}` });
          if (op.drawPolygon !== false) {
            emitOp({ op: 'connect_polygon', pts: [pA, pB, pC], ...(op.fill ? { fill: op.fill } : {}), step: `Nối tam giác đều ${pA}${pB}${pC}` });
          }
        }
        continue;
      }

      if (op.op === 'fibonacci') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = false;
        const nSteps = Math.max(3, Math.min(10, Math.round(parseMathNumber(op.steps ?? op.n, 7))));
        const showSq = op.showSquares !== false;
        const F = [1, 1];
        while (F.length < nSteps) F.push(F[F.length - 1] + F[F.length - 2]);
        let minX = 0, minY = 0, maxX = 1, maxY = 1;
        const rawSq = [{ x0: 0, y0: 0, x1: 1, y1: 1, dir: 0, size: 1 }];
        for (let k = 1; k < nSteps; k++) {
          const sz = F[k], dir = k % 4;
          let x0, y0, x1, y1;
          if (dir === 0) { x0 = minX - sz; y0 = minY; x1 = minX; y1 = minY + sz; minX -= sz; }
          else if (dir === 1) { x0 = minX; y0 = minY - sz; x1 = minX + sz; y1 = minY; minY -= sz; }
          else if (dir === 2) { x0 = maxX; y0 = minY; x1 = maxX + sz; y1 = minY + sz; maxX += sz; }
          else { x0 = minX; y0 = maxY; x1 = minX + sz; y1 = maxY + sz; maxY += sz; }
          rawSq.push({ x0, y0, x1, y1, dir, size: sz });
        }
        const rotSteps = (4 - ((nSteps - 1) % 4)) % 4;
        const rotPt = (x, y) => {
          let rx = x, ry = y;
          for (let i = 0; i < rotSteps; i++) { const nx = -ry, ny = rx; rx = nx; ry = ny; }
          return [rx, ry];
        };
        const sqs = rawSq.map((q) => {
          const { x0, y0, x1, y1, dir, size } = q;
          let center, start, end;
          if (dir === 0) { center = [x1, y0]; start = [x1, y1]; end = [x0, y0]; }
          else if (dir === 1) { center = [x1, y1]; start = [x0, y1]; end = [x1, y0]; }
          else if (dir === 2) { center = [x0, y1]; start = [x0, y0]; end = [x1, y1]; }
          else { center = [x0, y0]; start = [x1, y0]; end = [x0, y1]; }
          return {
            size,
            corners: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([px, py]) => rotPt(px, py)),
            center: rotPt(center[0], center[1]),
            start: rotPt(start[0], start[1]),
            end: rotPt(end[0], end[1])
          };
        });
        let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
        for (const sq of sqs) for (const [px, py] of sq.corners) {
          if (px < gx0) gx0 = px; if (py < gy0) gy0 = py;
          if (px > gx1) gx1 = px; if (py > gy1) gy1 = py;
        }
        const W = Math.max(1, gx1 - gx0), H = Math.max(1, gy1 - gy0);
        const spanW = Math.max(1.5, parseMathNumber(op.scale, 1) * 6.4);
        const unit = spanW / W;
        const cx0 = parseMathNumber(op.x, 0) - spanW * 0.5;
        const cy0 = parseMathNumber(op.y, 0) - (H * unit) * 0.5;
        const pfx = cleanRef(op.id || 'F');
        const pA = pfx + 'A', pB = pfx + 'B';
        emitPointIfMissing(pA, cx0, cy0);
        emitPointIfMissing(pB, cx0 + spanW, cy0);
        const gridMap = new Map([['0,0', pA], [W + ',0', pB]]);
        const ensureGridPt = (gx, gy) => {
          const sx = gx - gx0, sy = gy - gy0;
          const ky = sx + ',' + sy;
          if (gridMap.has(ky)) return gridMap.get(ky);
          const pid = '__' + pfx + '_' + sx + '_' + sy;
          if (sy === 0) {
            emitOp({ op: 'point_on_segment', id: pid, label: '', a: pA, b: pB, ratio: sx / W, lock: true, show: false, noDot: true });
          } else if (sx === 0) {
            emitOp({ op: 'point_perp', id: pid, label: '', through: pA, a: pA, b: pB, k: sy / W, show: false, noDot: true });
          } else {
            const baseId = ensureGridPt(gx, gy0);
            emitOp({ op: 'point_perp', id: pid, label: '', through: baseId, a: pA, b: pB, k: sy / W, show: false, noDot: true });
          }
          gridMap.set(ky, pid);
          return pid;
        };
        if (showSq) {
          sqs.forEach((sq, idx) => {
            const cIds = sq.corners.map(([px, py]) => ensureGridPt(px, py));
            emitOp({ op: 'connect_polygon', pts: cIds, step: 'Hình vuông Fibonacci F' + (idx + 1) + ' = ' + sq.size });
          });
        }
        sqs.forEach((sq, idx) => {
          const cId = ensureGridPt(sq.center[0], sq.center[1]);
          const sId = ensureGridPt(sq.start[0], sq.start[1]);
          const eId = ensureGridPt(sq.end[0], sq.end[1]);
          emitOp({ op: 'arc', pts: [cId, sId, eId], step: 'Cung xoắn ốc Fibonacci bậc ' + (idx + 1) + ' (R = ' + sq.size + ')' });
        });
        continue;
      }

      if (op.op === 'square_2d') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = false;
        const [pA, pB, pC, pD] = parseVertexList(op.pts || ['A', 'B', 'C', 'D']);
        if (pA && pB && pC && pD) {
          emitPointIfMissing(pA, -1.8, -1.8);
          emitPointIfMissing(pB, 1.8, -1.8);
          emitOp({ op: 'rotate', id: pD, center: pA, point: pB, angleDeg: op.clockwise ? -90 : 90, k: 1, step: `Đỉnh ${pD} quay 90° từ ${pB} quanh ${pA}` });
          emitOp({ op: 'point_sum', id: pC, a: pB, b: pD, c: pA, step: `Đỉnh ${pC} của hình vuông ${pA}${pB}${pC}${pD}` });
          if (op.drawPolygon !== false) {
            emitOp({ op: 'connect_polygon', pts: [pA, pB, pC, pD], ...(op.fill ? { fill: op.fill } : {}), step: op.step || `Nối hình vuông ${pA}${pB}${pC}${pD}` });
          }
          if (op.markRightAngle !== false) {
            emitOp({ op: 'right_angle', a: pD, v: pA, b: pB, aux: true });
          }
        }
        continue;
      }

      if (op.op === 'centroid') {
        expandedMacroCount++;
        const gId = cleanRef(op.id || op.center || op.label || 'G');
        const [pA, pB, pC] = parseVertexList(op.pts || ['A', 'B', 'C']);
        if (gId && pA && pB && pC) {
          emitPointIfMissing(pA, -2.4, -1.4);
          emitPointIfMissing(pB, 2.6, -1.4);
          emitPointIfMissing(pC, -0.4, 2.4);
          const mBC = cleanRef(op.midBC || `__mid_${pB}_${pC}_${gId}`);
          const mAC = cleanRef(op.midAC || `__mid_${pA}_${pC}_${gId}`);
          emitOp({ op: 'midpoint', id: mBC, label: op.midBC ? op.midBC : '', a: pB, b: pC, show: !!op.midBC, noDot: !op.midBC });
          emitOp({ op: 'midpoint', id: mAC, label: op.midAC ? op.midAC : '', a: pA, b: pC, show: !!op.midAC, noDot: !op.midAC });
          if (op.drawMedians) {
            const mAB = cleanRef(op.midAB || `__mid_${pA}_${pB}_${gId}`);
            emitOp({ op: 'midpoint', id: mAB, label: op.midAB ? op.midAB : '', a: pA, b: pB, show: !!op.midAB, noDot: !op.midAB });
            emitSegmentsBatch(op.dashed ? [] : [`${pA}-${mBC}`, `${pB}-${mAC}`, `${pC}-${mAB}`], op.dashed ? [`${pA}-${mBC}`, `${pB}-${mAC}`, `${pC}-${mAB}`] : [], { aux: true });
          }
          emitOp({
            op: 'intersection_ll',
            id: gId,
            label: op.label !== undefined ? op.label : gId,
            l1: [pA, mBC],
            l2: [pB, mAC],
            noAutoConnect: !op.drawMedians,
            effect: op.effect || 'pop',
            step: op.step || `Trọng tâm ${gId} của tam giác ${pA}${pB}${pC}`
          });
        }
        continue;
      }

      if (op.op === 'orthocenter') {
        expandedMacroCount++;
        const hId = cleanRef(op.id || op.center || op.label || 'H');
        const [pA, pB, pC] = parseVertexList(op.pts || ['A', 'B', 'C']);
        if (hId && pA && pB && pC) {
          emitPointIfMissing(pA, -2.4, -1.5);
          emitPointIfMissing(pB, 2.6, -1.5);
          emitPointIfMissing(pC, -0.6, 2.5);
          const drawAlt = op.drawAltitudes !== false;
          const fA = cleanRef(op.footA || `__foot_${pA}_${hId}`);
          const fB = cleanRef(op.footB || `__foot_${pB}_${hId}`);
          emitOp({ op: 'foot_perp', id: fA, label: op.footA ? op.footA : '', p: pA, a: pB, b: pC, show: !!op.footA, noDot: !op.footA, drawDropSegment: drawAlt, markRightAngle: drawAlt, aux: true, ...(op.dashed !== undefined ? { dashed: !!op.dashed } : {}) });
          emitOp({ op: 'foot_perp', id: fB, label: op.footB ? op.footB : '', p: pB, a: pA, b: pC, show: !!op.footB, noDot: !op.footB, drawDropSegment: drawAlt, markRightAngle: drawAlt, aux: true, ...(op.dashed !== undefined ? { dashed: !!op.dashed } : {}) });
          emitOp({
            op: 'intersection_ll',
            id: hId,
            label: op.label !== undefined ? op.label : hId,
            l1: [pA, fA],
            l2: [pB, fB],
            drawExtensions: drawAlt,
            noAutoConnect: !drawAlt,
            effect: op.effect || 'pop',
            step: op.step || `Trực tâm ${hId} của tam giác ${pA}${pB}${pC}`
          });
        }
        continue;
      }

      if (op.op === 'circumcircle') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = false;
        const oId = cleanRef(op.center || op.id || op.o || 'O');
        const [pA, pB, pC] = parseVertexList(op.pts || ['A', 'B', 'C']);
        if (oId && pA && pB && pC) {
          emitPointIfMissing(pA, -2.3, -1.4);
          emitPointIfMissing(pB, 2.5, -1.4);
          emitPointIfMissing(pC, -0.5, 2.3);
          const mAB = `__cmid_${pA}${pB}_${oId}`;
          const mBC = `__cmid_${pB}${pC}_${oId}`;
          const pAB = `__cperp_${pA}${pB}_${oId}`;
          const pBC = `__cperp_${pB}${pC}_${oId}`;
          emitOp({ op: 'midpoint', id: mAB, label: '', a: pA, b: pB, show: false, noDot: true });
          emitOp({ op: 'midpoint', id: mBC, label: '', a: pB, b: pC, show: false, noDot: true });
          emitOp({ op: 'line_perp', id: pAB, label: '', through: mAB, a: pA, b: pB, k: 1, drawSegment: false, show: false, noDot: true });
          emitOp({ op: 'line_perp', id: pBC, label: '', through: mBC, a: pB, b: pC, k: 1, drawSegment: false, show: false, noDot: true });
          const showCenter = op.drawCenter !== false && op.showCenter !== false && op.show !== false;
          emitOp({
            op: 'intersection_ll',
            id: oId,
            label: showCenter ? (op.label !== undefined ? op.label : oId) : '',
            l1: [mAB, pAB],
            l2: [mBC, pBC],
            show: showCenter,
            noDot: !showCenter,
            noAutoConnect: true,
            effect: op.effect || 'pop',
            step: `Tâm đường tròn ngoại tiếp ${oId}`
          });
          if (op.drawCircle !== false) {
            emitOp({ op: 'circle', center: oId, rim: pA, dashed: !!op.dashed, step: op.step || `Đường tròn ngoại tiếp (${oId}) qua ${pA}, ${pB}, ${pC}` });
          }
        }
        continue;
      }

      if (op.op === 'incircle') {
        expandedMacroCount++;
        if (plan.is3D === undefined) plan.is3D = false;
        const iId = cleanRef(op.center || op.id || op.o || 'I');
        const footId = cleanRef(op.foot || op.rim || `__ifoot_${iId}`);
        const [pA, pB, pC] = parseVertexList(op.pts || ['A', 'B', 'C']);
        if (iId && pA && pB && pC) {
          emitPointIfMissing(pA, -2.4, -1.5);
          emitPointIfMissing(pB, 2.6, -1.5);
          emitPointIfMissing(pC, -0.4, 2.3);
          const bA = `__ibis_${pA}_${iId}`;
          const bB = `__ibis_${pB}_${iId}`;
          emitOp({ op: 'angle_bisector', id: bA, label: '', a: pB, o: pA, b: pC, show: false, noDot: true });
          emitOp({ op: 'angle_bisector', id: bB, label: '', a: pA, o: pB, b: pC, show: false, noDot: true });
          const showCenter = op.drawCenter !== false && op.showCenter !== false && op.show !== false;
          emitOp({
            op: 'intersection_ll',
            id: iId,
            label: showCenter ? (op.label !== undefined ? op.label : iId) : '',
            l1: [pA, bA],
            l2: [pB, bB],
            show: showCenter,
            noDot: !showCenter,
            noAutoConnect: true,
            effect: op.effect || 'pop',
            step: `Tâm đường tròn nội tiếp ${iId}`
          });
          emitOp({
            op: 'foot_perp',
            id: footId,
            label: op.showFoot ? footId : '',
            p: iId,
            a: pB,
            b: pC,
            drawDropSegment: !!op.drawRadius,
            markRightAngle: !!op.drawRadius,
            show: !!op.showFoot,
            noDot: !op.showFoot
          });
          if (op.drawCircle !== false) {
            emitOp({ op: 'circle', center: iId, rim: footId, dashed: !!op.dashed, step: op.step || `Đường tròn nội tiếp (${iId})` });
          }
        }
        continue;
      }

      if (op.op === 'tangents_from_point') {
        expandedMacroCount++;
        const extSym = cleanRef(op.p || op.from || op.a);
        let oSym = cleanRef(op.center || op.o);
        let rSym = '';
        if (op.circle !== undefined) {
          const cNorm = normalizeCirclePairSlot(op.circle);
          if (Array.isArray(cNorm) && cNorm.length >= 2) {
            oSym = cNorm[0]; rSym = cNorm[1];
          }
        } else if (op.rim === undefined && isNumericRadiusVal(op.r ?? op.radius)) {
          rSym = ensureRimForNumericRadius(oSym, op.r ?? op.radius);
        } else {
          rSym = cleanRef(op.rim || op.r);
        }
        const pairIds = (op.pts ? parseVertexList(op.pts) : (op.ids ? parseVertexList(op.ids) : []));
        const t1 = pairIds[0] || cleanRef(op.id1 || op.b || 'B');
        const t2 = pairIds[1] || cleanRef(op.id2 || op.c || 'C');
        if (extSym && oSym && rSym && t1 && t2) {
          emitOp({ op: 'tangent_point', id: t1, p: extSym, center: oSym, rim: rSym, which: 0, effect: op.effect || 'pop', step: op.step || `Tiếp điểm ${t1} từ ${extSym} tới (${oSym})` });
          emitOp({ op: 'tangent_point', id: t2, p: extSym, center: oSym, rim: rSym, which: 1, effect: op.effect || 'pop', step: `Tiếp điểm ${t2} từ ${extSym} tới (${oSym})` });
          const legacyNoPts = !op.pts && Array.isArray(op.ids);
          const drawTan = legacyNoPts ? !!(op.drawSegments || op.drawTangents) : (op.drawSegments !== false && op.drawTangents !== false && !op.pointsOnly);
          const drawRad = legacyNoPts ? !!op.drawRadii : (op.drawRadii !== false && !op.pointsOnly);
          const markRA = legacyNoPts ? !!(op.markRightAngles || op.drawRadii) : (op.markRightAngles !== false && drawRad);
          if (drawTan) {
            emitOp({ op: 'segment', a: extSym, b: t1, dashed: false, step: `Tiếp tuyến ${extSym}${t1}` });
            emitOp({ op: 'segment', a: extSym, b: t2, dashed: false, step: `Tiếp tuyến ${extSym}${t2}` });
          }
          if (drawRad) {
            emitOp({ op: 'segment', a: oSym, b: t1, dashed: false, aux: true, step: `Bán kính ${oSym}${t1}` });
            emitOp({ op: 'segment', a: oSym, b: t2, dashed: false, aux: true, step: `Bán kính ${oSym}${t2}` });
          }
          if (markRA) {
            emitOp({ op: 'right_angle', a: oSym, v: t1, b: extSym, aux: true });
            emitOp({ op: 'right_angle', a: oSym, v: t2, b: extSym, aux: true });
          }
        }
        continue;
      }

      // 6. 3D Revolution Solids Auto-Point Synthesis (`cone`, `cylinder`, `sphere`, `frustumCone`)
      if (op.op === 'cone' || op.op === 'cylinder' || op.op === 'sphere' || op.op === 'frustumCone') {
        if (plan.is3D === undefined) plan.is3D = true;
        if (op.op === 'cone') {
          const pArr = Array.isArray(op.pts) && op.pts.length >= 3 ? op.pts.map(cleanRef) : [cleanRef(op.center || op.o || 'O'), cleanRef(op.rim || op.a || 'A'), cleanRef(op.apex || op.s || op.top || 'S')];
          const [oSym, rSym, sSym] = pArr;
          const rVal = isNumericRadiusVal(op.r ?? op.radius) ? parseMathNumber(op.r ?? op.radius, 2.2) : 2.2;
          const hVal = (op.h !== undefined || op.height !== undefined) ? parseMathNumber(op.h ?? op.height, 3.8) : 3.8;
          emitPointIfMissing(oSym, 0, -1.2);
          const oDecl = declaredPts.get(oSym);
          const ox = (oDecl && oDecl.op === 'point_free') ? parseMathNumber(oDecl.x ?? 0, 0) : 0;
          const oy = (oDecl && oDecl.op === 'point_free') ? parseMathNumber(oDecl.y ?? -1.2, -1.2) : -1.2;
          emitPointIfMissing(rSym, ox + rVal, oy);
          emitPointIfMissing(sSym, ox, oy + hVal);
          op.pts = [oSym, rSym, sSym];
          delete op.r; delete op.radius; delete op.h; delete op.height;
        } else if (op.op === 'cylinder') {
          const pArr = Array.isArray(op.pts) && op.pts.length >= 3 ? op.pts.map(cleanRef) : [cleanRef(op.center || op.o || 'O'), cleanRef(op.rim || op.a || 'A'), cleanRef(op.topCenter || op.top || op.o2 || "O'")];
          const [oSym, rSym, topSym] = pArr;
          const rVal = isNumericRadiusVal(op.r ?? op.radius) ? parseMathNumber(op.r ?? op.radius, 2.0) : 2.0;
          const hVal = (op.h !== undefined || op.height !== undefined) ? parseMathNumber(op.h ?? op.height, 3.4) : 3.4;
          emitPointIfMissing(oSym, 0, -1.4);
          const oDecl = declaredPts.get(oSym);
          const ox = (oDecl && oDecl.op === 'point_free') ? parseMathNumber(oDecl.x ?? 0, 0) : 0;
          const oy = (oDecl && oDecl.op === 'point_free') ? parseMathNumber(oDecl.y ?? -1.4, -1.4) : -1.4;
          emitPointIfMissing(rSym, ox + rVal, oy);
          emitPointIfMissing(topSym, ox, oy + hVal);
          op.pts = [oSym, rSym, topSym];
          delete op.r; delete op.radius; delete op.h; delete op.height;
        } else if (op.op === 'sphere') {
          const hasExplicitRim = !!(Array.isArray(op.pts) && op.pts[1]) || !!(op.rim || op.a);
          const oSym = (Array.isArray(op.pts) && op.pts[0]) ? cleanRef(op.pts[0]) : cleanRef(op.center || op.o || 'O');
          const rSym = (Array.isArray(op.pts) && op.pts[1]) ? cleanRef(op.pts[1]) : cleanRef(op.rim || op.a || `__rim_sph_${oSym}`);
          const rVal = isNumericRadiusVal(op.r ?? op.radius) ? parseMathNumber(op.r ?? op.radius, 2.4) : 2.4;
          emitPointIfMissing(oSym, 0, 0);
          const oDecl = declaredPts.get(oSym);
          const ox = (oDecl && oDecl.op === 'point_free') ? parseMathNumber(oDecl.x ?? 0, 0) : 0;
          const oy = (oDecl && oDecl.op === 'point_free') ? parseMathNumber(oDecl.y ?? 0, 0) : 0;
          emitPointIfMissing(rSym, ox + rVal, oy, hasExplicitRim ? {} : { label: '', show: false, noDot: true });
          op.pts = [oSym, rSym];
          delete op.r; delete op.radius;
        } else if (op.op === 'frustumCone') {
          const pArr = Array.isArray(op.pts) && op.pts.length >= 4
            ? op.pts.map(cleanRef)
            : [cleanRef(op.o1 || op.center || 'O'), cleanRef(op.r1Pt || op.a || 'A'), cleanRef(op.o2 || op.topCenter || "O'"), cleanRef(op.r2Pt || op.b || "A'")];
          const [o1, r1p, o2, r2p] = pArr;
          const R1 = isNumericRadiusVal(op.r1 ?? op.R) ? parseMathNumber(op.r1 ?? op.R, 2.4) : 2.4;
          const R2 = isNumericRadiusVal(op.r2 ?? op.r) ? parseMathNumber(op.r2 ?? op.r, 1.3) : 1.3;
          const hVal = (op.h !== undefined || op.height !== undefined) ? parseMathNumber(op.h ?? op.height, 3.2) : 3.2;
          emitPointIfMissing(o1, 0, -1.4);
          emitPointIfMissing(r1p, R1, -1.4);
          emitPointIfMissing(o2, 0, -1.4 + hVal);
          emitPointIfMissing(r2p, R2, -1.4 + hVal);
          op.pts = [o1, r1p, o2, r2p];
          delete op.r1; delete op.r2; delete op.R; delete op.r; delete op.h; delete op.height;
        }
        emitOp(op);
        continue;
      }

      // 7. Universal Pair / Triple String & Numeric Circle Radius Normalization on Standard Ops
      if (['midpoint', 'point_on_segment', 'point_on_line', 'segment', 'line', 'ray', 'tick_mark'].includes(op.op)) {
        if (op.a === undefined || op.b === undefined) {
          const pr = parsePairRef(op.s || op.seg || op.ab || op.edge || op.pts);
          if (pr) {
            op.a = pr[0]; op.b = pr[1];
            delete op.s; delete op.seg; delete op.ab; delete op.edge; delete op.pts;
          }
        }
      } else if (op.op === 'foot_perp') {
        if (op.a === undefined || op.b === undefined) {
          const pr = parsePairRef(op.line || op.s || op.seg || op.ab || op.to);
          if (pr) {
            op.a = pr[0]; op.b = pr[1];
            delete op.line; delete op.s; delete op.seg; delete op.ab; delete op.to;
          }
        }
      } else if (op.op === 'line_parallel' || op.op === 'line_perp' || op.op === 'point_parallel' || op.op === 'point_perp') {
        if (op.a === undefined || op.b === undefined) {
          const pr = parsePairRef(op.line || op.s || op.seg || op.ab || op.to);
          if (pr) {
            op.a = pr[0]; op.b = pr[1];
            delete op.line; delete op.s; delete op.seg; delete op.ab; delete op.to;
          }
        }
      } else if (op.op === 'intersection_ll') {
        const p1 = parsePairRef(op.l1);
        const p2 = parsePairRef(op.l2);
        if (p1) op.l1 = p1;
        if (p2) op.l2 = p2;
      } else if (op.op === 'intersection_lc') {
        const pl = parsePairRef(op.line || op.l1);
        if (pl) { op.line = pl; if (op.l1 !== undefined && !Array.isArray(op.l1)) delete op.l1; }
        if (op.circle !== undefined || op.l2 !== undefined) {
          op.circle = normalizeCirclePairSlot(op.circle !== undefined ? op.circle : op.l2);
        } else if ((op.center || op.o) && isNumericRadiusVal(op.r ?? op.radius)) {
          const cSym = cleanRef(op.center || op.o);
          op.circle = [cSym, ensureRimForNumericRadius(cSym, op.r ?? op.radius)];
          delete op.r; delete op.radius;
        }
      } else if (op.op === 'intersection_cc' || op.op === 'common_tangent') {
        const rawC1 = op.c1 ?? op.circle1 ?? op.l1;
        const rawC2 = op.c2 ?? op.circle2 ?? op.l2;
        if (rawC1 !== undefined) op.c1 = normalizeCirclePairSlot(rawC1);
        if (rawC2 !== undefined) op.c2 = normalizeCirclePairSlot(rawC2);
      } else if (op.op === 'circle' || op.op === 'point_on_circle' || op.op === 'tangent_point') {
        const cSym = cleanRef(op.center || op.o);
        if (op.rim === undefined && isNumericRadiusVal(op.r ?? op.radius)) {
          op.center = cSym || 'O';
          op.rim = ensureRimForNumericRadius(op.center, op.r ?? op.radius);
          delete op.r; delete op.radius;
        } else if (!cSym && op.circle !== undefined) {
          const cNorm = normalizeCirclePairSlot(op.circle);
          if (Array.isArray(cNorm) && cNorm.length >= 2) {
            op.center = cNorm[0]; op.rim = cNorm[1];
            delete op.circle;
          }
        }
      } else if (op.op === 'right_angle' || op.op === 'angle_mark') {
        const tr = parseTripleRef(op.pts || op.ang);
        if (tr) {
          op.a = tr[0]; op.v = tr[1]; op.b = tr[2];
          delete op.pts; delete op.ang;
        }
      } else if (op.op === 'angle_bisector') {
        const tr = parseTripleRef(op.pts || op.ang);
        if (tr) {
          op.a = tr[0]; op.o = tr[1]; op.b = tr[2];
          delete op.pts; delete op.ang;
        } else if (op.o === undefined) {
          if (op.v !== undefined || op.vertex !== undefined) {
            op.o = cleanRef(op.v !== undefined ? op.v : op.vertex);
            delete op.v; delete op.vertex;
          } else if (op.c !== undefined) {
            op.o = cleanRef(op.b);
            op.b = cleanRef(op.c);
            delete op.c;
          }
        }
      } else if (op.op === 'connect_polygon' || op.op === 'section' || op.op === 'polygon_fill' || op.op === 'plane') {
        if (typeof op.pts === 'string') {
          op.pts = parseVertexList(op.pts);
        }
        if (op.op === 'section' && !op.fill) {
          op.fill = 'rgba(15, 23, 42, 0.06)';
        }
      } else if (op.op === 'arc' || op.op === 'arc3' || op.op === 'sector' || op.op === 'spline' || op.op === 'bezier' || op.op === 'spiral') {
        if (typeof op.pts === 'string') {
          op.pts = parseVertexList(op.pts);
        }
        if (op.op === 'spiral' && !Array.isArray(op.pts)) {
          const cSym = cleanRef(op.center || op.o);
          let rSym = cleanRef(op.rim || op.a);
          if (!rSym && cSym && isNumericRadiusVal(op.r ?? op.radius)) {
            rSym = ensureRimForNumericRadius(cSym, op.r ?? op.radius);
          }
          if (cSym && rSym) op.pts = [cSym, rSym];
        }
      }

      emitOp(op);
    }

    if (expandedMacroCount > 0) {
      fixes.push(`Đã bung ${expandedMacroCount} lệnh gộp/rút gọn thành ${outOps.length} thao tác dựng hình chuẩn.`);
    }
    plan.ops = outOps;
    return plan;
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
      case 'rotate':
        push(op.center || op.c || op.o); push(op.point || op.p || op.from);
        break;
      case 'angle_bisector':
        push(op.a); push(op.o || op.v || op.vertex); push(op.b);
        break;
      case 'common_tangent': {
        const c1 = Array.isArray(op.c1) ? op.c1 : [];
        const c2 = Array.isArray(op.c2) ? op.c2 : [];
        push(c1[0]); push(c1[1]); push(c2[0]); push(c2[1]);
        break;
      }
      case 'arc':
      case 'sector':
        if (Array.isArray(op.pts) && op.pts.length >= 3) {
          push(op.pts[0]); push(op.pts[1]); push(op.pts[2]);
        } else {
          push(op.center || op.o); push(op.start || op.a || op.from); push(op.end || op.b || op.to);
        }
        break;
      case 'arc3':
      case 'spline':
      case 'bezier':
      case 'spiral':
      case 'cone':
      case 'cylinder':
      case 'sphere':
      case 'frustumCone':
        if (Array.isArray(op.pts)) op.pts.forEach(push);
        else if (op.op === 'spiral') { push(op.center || op.o); push(op.rim || op.a || op.r); }
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
      case 'plane':
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
          let k = Number.isFinite(Number(op.ratio ?? op.k)) ? Number(op.ratio ?? op.k) : (op.op === 'point_on_line' ? 1.3 : 0.38);
          if (op.op !== 'point_on_line') k = Math.min(1, Math.max(0, k));
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
        case 'rotate': {
          const c = get(op.center || op.c || op.o);
          const p = get(op.point || op.p || op.from);
          if (c && p) {
            const deg = Number.isFinite(Number(op.angleDeg ?? op.ang ?? op.angle)) ? Number(op.angleDeg ?? op.ang ?? op.angle) : 60;
            const k = Number.isFinite(Number(op.k)) ? Number(op.k) : 1;
            const rad = (deg * Math.PI) / 180;
            const dx = p.x - c.x, dy = p.y - c.y;
            const cs = Math.cos(rad), sn = Math.sin(rad);
            pt = {
              x: c.x + (dx * cs - dy * sn) * k,
              y: c.y + (dx * sn + dy * cs) * k
            };
          }
          break;
        }
        case 'angle_bisector': {
          const a = get(op.a), o = get(op.o || op.v || op.vertex), b = get(op.b);
          if (a && o && b) {
            const d1 = dist2D(a, o), d2 = dist2D(b, o);
            if (d1 > 1e-9 && d2 > 1e-9) {
              let lx = (a.x - o.x) / d1 + (b.x - o.x) / d2;
              let ly = (a.y - o.y) / d1 + (b.y - o.y) / d2;
              const m = Math.hypot(lx, ly);
              if (m < 1e-9) { lx = -(a.y - o.y) / d1; ly = (a.x - o.x) / d1; }
              else { lx /= m; ly /= m; }
              const bDir = { x: o.x + lx * d1, y: o.y + ly * d1 };
              if (op.onOpposite || op.intersectOpposite) {
                const dx1 = bDir.x - o.x, dy1 = bDir.y - o.y;
                const dx2 = b.x - a.x, dy2 = b.y - a.y;
                const det = dx1 * dy2 - dy1 * dx2;
                if (Math.abs(det) > 1e-9) {
                  const t = ((a.x - o.x) * dy2 - (a.y - o.y) * dx2) / det;
                  pt = { x: o.x + t * dx1, y: o.y + t * dy1 };
                } else {
                  pt = bDir;
                }
              } else {
                pt = bDir;
              }
            }
          }
          break;
        }
        case 'common_tangent': {
          const c1 = Array.isArray(op.c1) ? op.c1 : [];
          const c2 = Array.isArray(op.c2) ? op.c2 : [];
          const p1 = get(c1[0]), p2 = get(c1[1]), p3 = get(c2[0]), p4 = get(c2[1]);
          if (p1 && p2 && p3 && p4) {
            const r1 = dist2D(p1, p2), r2 = dist2D(p3, p4);
            const dx = p3.x - p1.x, dy = p3.y - p1.y, dist = Math.hypot(dx, dy);
            if (dist > 1e-9) {
              const l = (op.inner ? -(r1 + r2) : (r2 - r1)) / dist;
              if (Math.abs(l) <= 1) {
                const ux = dx / dist, uy = dy / dist;
                const boardWhich = !(Number(op.which) || 0);
                const h = Math.sqrt(Math.max(0, 1 - l * l)) * (boardWhich ? -1 : 1);
                const nx = ux * l - uy * h, ny = uy * l + ux * h;
                const t1 = { x: p1.x - nx * r1, y: p1.y - ny * r1 };
                const t2 = op.inner ? { x: p3.x + nx * r2, y: p3.y + ny * r2 } : { x: p3.x - nx * r2, y: p3.y - ny * r2 };
                pt = op.on === 2 ? t2 : t1;
              }
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
        out.push({ op: d.seg ? 'point_on_segment' : 'point_on_line', id: sym, label: p.label || sym, a: symOf(d.a), b: symOf(d.b), ratio: Number(d.k ?? 0.38), show: p.show !== false, ...(d.lock ? { lock: true } : {}) });
      } else if (d.t === 'foot') {
        out.push({ op: 'foot_perp', id: sym, label: p.label || sym, p: symOf(d.p), a: symOf(d.a), b: symOf(d.b), drawDropSegment: false, markRightAngle: false, show: p.show !== false });
      } else if (d.t === 'vec') {
        out.push({ op: d.perp ? 'line_perp' : 'line_parallel', id: sym, label: p.label || sym, through: symOf(d.o), a: symOf(d.a), b: symOf(d.b), k: Number(d.k ?? 1), drawSegment: false, show: p.show !== false, noDot: !!p.noDot, ...(d.drag ? { drag: true } : {}) });
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
        const rawDeg = (((-Number(d.k || 0) * 360) % 360) + 360) % 360;
        const deg = Number(rawDeg.toFixed(4));
        out.push({ op: 'point_on_circle', id: sym, label: p.label !== undefined ? p.label : sym, center: symOf(d.pts[0]), rim: symOf(d.pts[1]), angleDeg: deg, show: p.show !== false, ...(d.lock ? { lock: true } : {}) });
      } else if (d.t === 'rot') {
        const isMathDef = geoBlock.defCoordSpace === 'math_y_up';
        const deg = Number(((isMathDef ? 1 : -1) * (Number(d.ang) || 0)).toFixed(4));
        out.push({ op: 'rotate', id: sym, label: p.label !== undefined ? p.label : sym, center: symOf(d.c), point: symOf(d.p), angleDeg: deg, k: Number.isFinite(Number(d.k)) ? Number(d.k) : 1, show: p.show !== false, ...(p.noDot ? { noDot: true } : {}) });
      } else if (d.t === 'bis') {
        out.push({ op: 'angle_bisector', id: sym, label: p.label !== undefined ? p.label : sym, a: symOf(d.a), o: symOf(d.o), b: symOf(d.b), show: p.show !== false, ...(p.noDot ? { noDot: true } : {}) });
      } else if (d.t === 'ctan' && Array.isArray(d.c1) && Array.isArray(d.c2)) {
        const isMathDef = geoBlock.defCoordSpace === 'math_y_up';
        const whichMath = isMathDef ? (d.which ? 1 : 0) : (d.which ? 0 : 1);
        out.push({ op: 'common_tangent', id: sym, label: p.label !== undefined ? p.label : sym, c1: [symOf(d.c1[0]), symOf(d.c1[1])], c2: [symOf(d.c2[0]), symOf(d.c2[1])], inner: !!d.inner, which: whichMath, on: d.on === 2 ? 2 : 1, show: p.show !== false, ...(p.noDot ? { noDot: true } : {}) });
      }
    }

    for (const sh of (Array.isArray(geoBlock.shapes) ? geoBlock.shapes : [])) {
      if (!sh || sh.hidden || !Array.isArray(sh.pts)) continue;
      const sPts = sh.pts.map(symOf);
      const shName = (sh.kind === 'segment' || sh.kind === 'line' || sh.kind === 'ray' || sh.kind === 'plane') && sh.name != null
        ? String(sh.name).trim()
        : '';
      const shNameAt = shName && sh.nameAt && Number.isFinite(Number(sh.nameAt.x)) && Number.isFinite(Number(sh.nameAt.y))
        ? { x: Number(sh.nameAt.x), y: Number(sh.nameAt.y) }
        : null;
      if (sh.kind === 'segment' && sPts.length >= 2) {
        out.push({ op: 'segment', a: sPts[0], b: sPts[1], dashed: !!sh.dashed, aux: !!sh.aux, ...(shName ? { name: shName } : {}), ...(shNameAt ? { nameAt: shNameAt } : {}) });
      } else if ((sh.kind === 'line' || sh.kind === 'ray') && sPts.length >= 2) {
        out.push({ op: sh.kind, a: sPts[0], b: sPts[1], dashed: !!sh.dashed, aux: !!sh.aux, ...(shName ? { name: shName } : {}), ...(shNameAt ? { nameAt: shNameAt } : {}) });
      } else if (sh.kind === 'plane' && sPts.length >= 3) {
        out.push({ op: 'plane', pts: sPts, ...(sh.dashed ? { dashed: true } : {}), ...(shName ? { name: shName } : {}), ...(shNameAt ? { nameAt: shNameAt } : {}), ...(sh.aux ? { aux: true } : {}) });
      } else if (sh.kind === 'circle' && sPts.length >= 2) {
        out.push({ op: 'circle', center: sPts[0], rim: sPts[1], dashed: !!sh.dashed, aux: !!sh.aux });
      } else if ((sh.kind === 'arc' || sh.kind === 'arc3' || sh.kind === 'sector') && sPts.length >= 3) {
        out.push({ op: sh.kind, pts: sPts.slice(0, 3), dashed: !!sh.dashed, ...(sh.fill ? { fill: sh.fill } : {}), aux: !!sh.aux });
      } else if ((sh.kind === 'cone' || sh.kind === 'cylinder') && sPts.length >= 3) {
        out.push({ op: sh.kind, pts: sPts.slice(0, 3), ...(sh.fill ? { fill: sh.fill } : {}) });
      } else if (sh.kind === 'sphere' && sPts.length >= 2) {
        out.push({ op: 'sphere', pts: sPts.slice(0, 2), ...(sh.fill ? { fill: sh.fill } : {}) });
      } else if (sh.kind === 'frustumCone' && sPts.length >= 4) {
        out.push({ op: 'frustumCone', pts: sPts.slice(0, 4), ...(sh.fill ? { fill: sh.fill } : {}) });
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

    // PASS 0: Expand Compact Shorthands, Array-Tuples & High-Level Geometry Macros
    const plan = expandCompactAiGeoMacros(rawPlan, fixes);
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

      // Expand tangents_from_point into two true dynamic Thales tangent_point ops (+ optional segments/right_angles)
      if (op.op === 'tangents_from_point') {
        const extSym = cleanRef(op.p || op.from || op.a);
        const oSym = cleanRef(op.center || op.o);
        const rSym = cleanRef(op.rim || op.r);
        const pairIds = Array.isArray(op.ids) && op.ids.length >= 2
          ? [cleanRef(op.ids[0]), cleanRef(op.ids[1])]
          : [cleanRef(op.id1 || op.b || 'T1'), cleanRef(op.id2 || op.c || 'T2')];
        if (extSym && oSym && rSym && pairIds[0] && pairIds[1]) {
          ops.push({
            op: 'tangent_point',
            id: pairIds[0],
            label: pairIds[0],
            p: extSym,
            center: oSym,
            rim: rSym,
            which: 1,
            side: 'upper',
            effect: op.effect || 'pop',
            step: op.step || `Tiếp điểm ${pairIds[0]} từ ${extSym} tới (${oSym})`
          });
          ops.push({
            op: 'tangent_point',
            id: pairIds[1],
            label: pairIds[1],
            p: extSym,
            center: oSym,
            rim: rSym,
            which: 0,
            side: 'lower',
            effect: op.effect || 'pop',
            step: `Tiếp điểm ${pairIds[1]} từ ${extSym} tới (${oSym})`
          });
          if (op.drawSegments || op.drawTangents) {
            ops.push({ op: 'segment', a: extSym, b: pairIds[0], dashed: false, step: `Tiếp tuyến ${extSym}${pairIds[0]}` });
            ops.push({ op: 'segment', a: extSym, b: pairIds[1], dashed: false, step: `Tiếp tuyến ${extSym}${pairIds[1]}` });
          }
          if (op.markRightAngles) {
            ops.push({ op: 'right_angle', a: oSym, v: pairIds[0], b: extSym, aux: true, step: `Góc vuông tại ${pairIds[0]}` });
            ops.push({ op: 'right_angle', a: oSym, v: pairIds[1], b: extSym, aux: true, step: `Góc vuông tại ${pairIds[1]}` });
          }
          fixes.push(`Đã tách tangents_from_point thành 2 tiếp điểm động Thales (${pairIds[0]}, ${pairIds[1]}).`);
        }
        continue;
      }

      // Evaluate math expressions in numeric fields safely
      const evalNumField = (field, fallbackVal) => {
        if (op[field] === undefined || op[field] === null || op[field] === '') return;
        const wasStr = typeof op[field] === 'string';
        const val = parseMathNumber(op[field], NaN);
        if (Number.isFinite(val)) {
          const rounded = Math.abs(val) < 1e-12 ? 0 : Number(val.toFixed(9));
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
      evalNumField('ang');
      evalNumField('angle');
      evalNumField('which');
      evalNumField('on');
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
      op.ratio = Number(clamped.toFixed(8));
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
    // PASS 3R: Rigidity healer — point_free whose coordinates already satisfy a property
    // (prism translation, parallelogram, square, rectangle, trapezoid, cube) ⇒ constraint child.
    // ------------------------------------------------------------------------
    {
      const RG = getRigidity();
      if (RG) {
        const rigIs3D = typeof plan.is3D === 'boolean'
          ? plan.is3D
          : /hình\s*chóp|tứ\s*diện|lăng\s*trụ|hình\s*hộp|lập\s*phương|thiết\s*diện|giao\s*tuyến|S\.[A-Z]{3,4}|[A-Z]{3,4}\.[A-Z]'/i.test(allContextText);
        const rig = RG.rigidifyFreeVertices(ops, allContextText, rigIs3D);
        ops = rig.ops;
        rig.fixes.forEach(f => fixes.push(f));
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
      A: [-2.8, 0.2], B: [-1.7, -1.8], C: [1.7, -2.2], D: [3.2, 0.5],
      S: [0.8, 3.8], O: [0, 0], R: [2.4, 0]
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
      const hasCircleOp = ops.some(o => o.op === 'circle' || o.op === 'point_on_circle' || o.op === 'intersection_lc' || o.op === 'intersection_cc' || o.op === 'tangent_point' || o.op === 'common_tangent' || o.op === 'arc' || o.op === 'arc3' || o.op === 'sector');
      const hasRevSolidOp = ops.some(o => o.op === 'cone' || o.op === 'cylinder' || o.op === 'sphere' || o.op === 'frustumCone');
      const has3DKeyword = /hình\s*chóp|tứ\s*diện|lăng\s*trụ|hình\s*hộp|hình\s*nón|hình\s*trụ|mặt\s*cầu|mặt\s*phẳng|giao\s*tuyến|thiết\s*diện|S\.[A-Z]{3,4}/i.test(allContextText);
      const hasApexS = ops.some(o => getOpProducedId(o) === 'S') && ops.some(o => o.dashed === true);
      is3D = hasRevSolidOp || has3DKeyword || hasApexS || (!hasCircleOp && ops.some(o => o.dashed === true && o.op === 'segment' && !o.aux));
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
      const keepVerticalSA = /SA\s*(?:⊥|\\perp|vuông)/i.test(allContextText);
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
    const emittedCircleRoots = new Map(); // canonical circle-pair or line-circle key -> Array<{id, x, y}>

    const evalBothCircleRootsMath = (candOp, cMap) => {
      if (!candOp) return null;
      if (candOp.op === 'intersection_lc') {
        const ln = Array.isArray(candOp.line) ? candOp.line : candOp.l1;
        const cir = Array.isArray(candOp.circle) ? candOp.circle : candOp.l2;
        const a = cMap.get(cleanRef(ln && ln[0])), b = cMap.get(cleanRef(ln && ln[1]));
        const c = cMap.get(cleanRef(cir && cir[0])), rPt = cMap.get(cleanRef(cir && cir[1]));
        if (!a || !b || !c || !rPt) return null;
        const rad = dist2D(c, rPt);
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= 1e-10 || rad <= 1e-8) return null;
        const fx = a.x - c.x, fy = a.y - c.y;
        const B = 2 * (fx * dx + fy * dy);
        const C = fx * fx + fy * fy - rad * rad;
        const disc = B * B - 4 * d2 * C;
        if (disc < -1e-5) return null;
        const s = Math.sqrt(Math.max(0, disc));
        const t0 = (-B - s) / (2 * d2), t1 = (-B + s) / (2 * d2);
        return [
          { x: a.x + t0 * dx, y: a.y + t0 * dy },
          { x: a.x + t1 * dx, y: a.y + t1 * dy }
        ];
      }
      if (candOp.op === 'intersection_cc' || candOp.op === 'tangent_point') {
        let p1, p2, p3, p4;
        if (candOp.op === 'tangent_point') {
          const ext = cMap.get(cleanRef(candOp.p || candOp.from || candOp.a));
          const o = cMap.get(cleanRef(candOp.center || candOp.o));
          const r = cMap.get(cleanRef(candOp.rim || candOp.r));
          if (ext && o && r) {
            p1 = { x: (ext.x + o.x) * 0.5, y: (ext.y + o.y) * 0.5 };
            p2 = o; p3 = o; p4 = r;
          }
        } else {
          const c1 = Array.isArray(candOp.c1) ? candOp.c1 : (Array.isArray(candOp.circle1) ? candOp.circle1 : candOp.l1);
          const c2 = Array.isArray(candOp.c2) ? candOp.c2 : (Array.isArray(candOp.circle2) ? candOp.circle2 : candOp.l2);
          p1 = cMap.get(cleanRef(c1 && c1[0])); p2 = cMap.get(cleanRef(c1 && c1[1]));
          p3 = cMap.get(cleanRef(c2 && c2[0])); p4 = cMap.get(cleanRef(c2 && c2[1]));
        }
        if (!p1 || !p2 || !p3 || !p4) return null;
        const r1 = dist2D(p1, p2), r2 = dist2D(p3, p4);
        const dx = p3.x - p1.x, dyS = (-p3.y) - (-p1.y);
        const d = Math.hypot(dx, dyS);
        if (d <= 1e-8 || d > r1 + r2 + 1e-4 || d < Math.abs(r1 - r2) - 1e-4) return null;
        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
        const xm = p1.x + (a * dx) / d;
        const ymS = (-p1.y) + (a * dyS) / d;
        return [
          { x: xm + (h * dyS) / d, y: -(ymS - (h * dx) / d) },
          { x: xm - (h * dyS) / d, y: -(ymS + (h * dx) / d) }
        ];
      }
      return null;
    };

    const healedOpsPass9 = [];
    const obsoleteHelperIds = new Set();
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

      // 9A: Thales Tangent Upgrades & Circle Root Disambiguation (intersection_lc / intersection_cc / tangent_point)
      if (op.op === 'intersection_lc') {
        const ln = Array.isArray(op.line) ? op.line : op.l1;
        const cir = Array.isArray(op.circle) ? op.circle : op.l2;
        const mSym = cleanRef(ln && ln[0]);
        const l1Sym = cleanRef(ln && ln[1]);
        const cCenterSym = cleanRef(cir && cir[0]);
        const cRimSym = cleanRef(cir && cir[1]);
        const mOp = ptOpById.get(mSym);
        const qOp = ptOpById.get(l1Sym);
        const stepTxt = String(op.step || op.note || '');
        // Case 9A-1: [M, O] (Thales circle center + rim) mistakenly passed as line
        if (mOp && mOp.op === 'midpoint' && l1Sym === cCenterSym && /tiếp\s*điểm|tiếp\s*tuyến|thales|tangent/i.test(stepTxt) && cir) {
          op.op = 'intersection_cc';
          op.c1 = [ln[0], ln[1]];
          op.c2 = [cir[0], cir[1]];
          delete op.line; delete op.circle;
          simCoords = simulatePlanCoords([...healedOpsPass9, ...ops.slice(idx)]);
          fixes.push(`Đã nâng cấp tiếp điểm "${op.id}" sang giao 2 đường tròn Thales (intersection_cc).`);
        } else if (
          // Case 9A-2: Static polar chord (H0 = point_on_segment(O, P, ratio), Q0 = line_perp(H0, O, P)) -> upgrade to drag-invariant Thales intersection_cc!
          mOp && (mOp.op === 'point_on_segment' || mOp.op === 'point_on_line') && mOp.show === false &&
          qOp && (qOp.op === 'line_perp' || qOp.op === 'point_perp') && qOp.show === false &&
          cCenterSym && cRimSym
        ) {
          const segEnds = [cleanRef(mOp.a), cleanRef(mOp.b)];
          const extSym = segEnds[0] === cCenterSym ? segEnds[1] : (segEnds[1] === cCenterSym ? segEnds[0] : '');
          const cO = simCoords.get(cCenterSym), cR = simCoords.get(cRimSym), cExt = simCoords.get(extSym);
          const origTarget = simCoords.get(getOpProducedId(op));
          if (extSym && cO && cR && cExt && origTarget) {
            const rad = dist2D(cO, cR), dOA = dist2D(cO, cExt);
            const hRatio = Number(mOp.ratio ?? mOp.k ?? 0);
            const projDist = cleanRef(mOp.a) === cCenterSym ? hRatio * dOA : (1 - hRatio) * dOA;
            if (dOA > rad + 1e-4 && Math.abs(projDist * dOA - rad * rad) <= 0.08 * rad * rad) {
              let thalesMidId = '';
              for (const prev of healedOpsPass9) {
                if (prev && prev.op === 'midpoint') {
                  const pa = cleanRef(prev.a), pb = cleanRef(prev.b);
                  if ((pa === cCenterSym && pb === extSym) || (pa === extSym && pb === cCenterSym)) {
                    thalesMidId = getOpProducedId(prev);
                    break;
                  }
                }
              }
              if (!thalesMidId) {
                thalesMidId = `__thales_${cCenterSym}_${extSym}`;
                const midOp = { op: 'midpoint', id: thalesMidId, label: '', a: cCenterSym, b: extSym, show: false, noDot: true };
                healedOpsPass9.push(midOp);
                ptOpById.set(thalesMidId, midOp);
              }
              op.op = 'intersection_cc';
              op.c1 = [thalesMidId, cCenterSym];
              op.c2 = [cCenterSym, cRimSym];
              delete op.line; delete op.circle;
              simCoords = simulatePlanCoords([...healedOpsPass9, ...ops.slice(idx)]);
              const rootsAfter = evalBothCircleRootsMath(op, simCoords);
              if (rootsAfter) {
                op.which = dist2D(rootsAfter[1], origTarget) < dist2D(rootsAfter[0], origTarget) ? 1 : 0;
              }
              simCoords = simulatePlanCoords([...healedOpsPass9, ...ops.slice(idx)]);
              obsoleteHelperIds.add(mSym);
              obsoleteHelperIds.add(l1Sym);
              fixes.push(`Đã nâng cấp tiếp điểm "${op.id}" từ dây cung tĩnh (${mSym}${l1Sym}) sang giao 2 đường tròn Thales động (bất biến khi kéo thả).`);
            }
          }
        }
      }

      if (op.op === 'intersection_lc' || op.op === 'intersection_cc' || op.op === 'tangent_point') {
        const pid = getOpProducedId(op);
        const roots = evalBothCircleRootsMath(op, simCoords);
        if (roots && dist2D(roots[0], roots[1]) > 1e-4) {
          let w = Number(op.which) ? 1 : 0;
          const sideStr = String(op.side || '').trim().toLowerCase();
          if (sideStr === 'upper' || sideStr === 'top') {
            w = roots[1].y >= roots[0].y ? 1 : 0;
          } else if (sideStr === 'lower' || sideStr === 'bottom') {
            w = roots[1].y <= roots[0].y ? 1 : 0;
          } else if (sideStr === 'right') {
            w = roots[1].x >= roots[0].x ? 1 : 0;
          } else if (sideStr === 'left') {
            w = roots[1].x <= roots[0].x ? 1 : 0;
          }
          if (op.side !== undefined) delete op.side;

          // Build canonical key & collect known points on circle / already-emitted sibling roots to avoid collapsing 2 intersections onto 1 point
          let groupKey = '';
          const avoidCoords = [];
          const explicitExclude = cleanRef(op.exclude || op.otherThan);
          if (explicitExclude && simCoords.has(explicitExclude)) {
            avoidCoords.push(simCoords.get(explicitExclude));
          }
          if (op.exclude !== undefined) delete op.exclude;
          if (op.otherThan !== undefined) delete op.otherThan;

          if (op.op === 'intersection_lc') {
            const ln = (Array.isArray(op.line) ? op.line : op.l1).map(cleanRef);
            const cir = (Array.isArray(op.circle) ? op.circle : op.l2).map(cleanRef);
            const lKey = ln[0] < ln[1] ? `${ln[0]}|${ln[1]}` : `${ln[1]}|${ln[0]}`;
            groupKey = `lc:${lKey}@${cir[0]}|${cir[1]}`;
            const cO = simCoords.get(cir[0]), cR = simCoords.get(cir[1]);
            const rad = (cO && cR) ? dist2D(cO, cR) : 0;
            // If secant/diameter passes through a known point on the circle (e.g. B on (O)), avoid returning B itself unless B is explicitly requested
            for (const endSym of ln) {
              if (!endSym || endSym === pid) continue;
              const cEnd = simCoords.get(endSym);
              if (cEnd && cO && rad > 1e-6 && Math.abs(dist2D(cEnd, cO) - rad) <= Math.max(1e-3, rad * 0.005)) {
                avoidCoords.push(cEnd);
              }
            }
          } else if (op.op === 'tangent_point') {
            const extSym = cleanRef(op.p || op.from || op.a);
            const oSym = cleanRef(op.center || op.o);
            const rSym = cleanRef(op.rim || op.r);
            groupKey = `tan:${extSym}@${oSym}|${rSym}`;
          } else {
            const c1 = (Array.isArray(op.c1) ? op.c1 : (Array.isArray(op.circle1) ? op.circle1 : op.l1)).map(cleanRef);
            const c2 = (Array.isArray(op.c2) ? op.c2 : (Array.isArray(op.circle2) ? op.circle2 : op.l2)).map(cleanRef);
            const k1 = `${c1[0]}|${c1[1]}`, k2 = `${c2[0]}|${c2[1]}`;
            groupKey = `cc:${k1 < k2 ? k1 + '::' + k2 : k2 + '::' + k1}`;
            // If both circles share a rim reference point (e.g. [O1, A] and [O2, A]), avoid returning A itself when a distinct 2nd intersection exists
            const cO1 = simCoords.get(c1[0]), cR1 = simCoords.get(c1[1]);
            const cO2 = simCoords.get(c2[0]), cR2 = simCoords.get(c2[1]);
            const rad1 = (cO1 && cR1) ? dist2D(cO1, cR1) : 0;
            const rad2 = (cO2 && cR2) ? dist2D(cO2, cR2) : 0;
            // Exclude circle centers (e.g. in Thales [M, O] ∩ [O, R], O is rim of c1 AND center of c2, not on c2!)
            if (cR1 && cO2 && rad2 > 1e-6 && c1[1] !== pid && Math.abs(dist2D(cR1, cO2) - rad2) <= Math.max(1e-3, rad2 * 0.005)) {
              avoidCoords.push(cR1);
            }
            if (cR2 && cO1 && rad1 > 1e-6 && c2[1] !== pid && Math.abs(dist2D(cR2, cO1) - rad1) <= Math.max(1e-3, rad1 * 0.005)) {
              avoidCoords.push(cR2);
            }
          }

          const prevSiblings = groupKey ? (emittedCircleRoots.get(groupKey) || []) : [];
          for (const sib of prevSiblings) avoidCoords.push(sib);

          const chosen = roots[w];
          const alt = roots[1 - w];
          const hitsAvoid = avoidCoords.some(ac => ac && dist2D(chosen, ac) <= 1e-3);
          const altClear = avoidCoords.every(ac => !ac || dist2D(alt, ac) > 1e-2);
          if (hitsAvoid && altClear) {
            w = 1 - w;
            fixes.push(`Đã tự động chuyển nhánh nghiệm which=${w} cho điểm "${pid}" để chọn nghiệm giao phân biệt.`);
          }
          op.which = w;
          if (groupKey && pid) {
            if (!emittedCircleRoots.has(groupKey)) emittedCircleRoots.set(groupKey, []);
            emittedCircleRoots.get(groupKey).push({ id: pid, x: roots[w].x, y: roots[w].y });
          }
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
    if (obsoleteHelperIds.size) {
      const stillReferenced = new Set();
      for (const op of healedOpsPass9) {
        const pid = getOpProducedId(op);
        if (pid && obsoleteHelperIds.has(pid)) continue;
        for (const d of getOpDependencies(op)) stillReferenced.add(d);
      }
      ops = healedOpsPass9.filter(op => {
        const pid = getOpProducedId(op);
        return !(pid && obsoleteHelperIds.has(pid) && !stillReferenced.has(pid));
      });
    } else {
      ops = healedOpsPass9;
    }

    // ------------------------------------------------------------------------
    // PASS 9.5: Post-Eval 3D Projection Illusion Guard (Anti False-Collinearity)
    // Ensures non-collinear 3D segments meeting at a vertex (e.g. BM & MN at M)
    // do not project within < 12° of 180° (dot < -0.978) looking like one line.
    // ------------------------------------------------------------------------
    if (is3D) {
      const curPtOpMap = new Map();
      for (const op of ops) {
        const pid = getOpProducedId(op);
        if (pid) curPtOpMap.set(pid, op);
      }
      const sFreeOp = curPtOpMap.get('S');
      if (sFreeOp && sFreeOp.op === 'point_free') {
        // 1. Build exact symbolic collinearity line sets
        const lineSets = [];
        const addCollinearTriple = (x, y, z) => {
          const pts3 = [cleanRef(x), cleanRef(y), cleanRef(z)].filter(Boolean);
          if (new Set(pts3).size < 2) return;
          lineSets.push(new Set(pts3));
        };
        for (const op of ops) {
          const pid = getOpProducedId(op);
          if (!pid) continue;
          if (op.op === 'midpoint' || op.op === 'point_on_segment' || op.op === 'ratio_point' || op.op === 'point_on_line' || op.op === 'foot_perp') {
            addCollinearTriple(op.a, op.b, pid);
          } else if (op.op === 'intersection_ll' && Array.isArray(op.l1) && Array.isArray(op.l2)) {
            addCollinearTriple(op.l1[0], op.l1[1], pid);
            addCollinearTriple(op.l2[0], op.l2[1], pid);
          }
        }
        let merged = true;
        while (merged) {
          merged = false;
          for (let i = 0; i < lineSets.length && !merged; i++) {
            for (let j = i + 1; j < lineSets.length; j++) {
              let shared = 0;
              for (const v of lineSets[j]) {
                if (lineSets[i].has(v) && ++shared >= 2) break;
              }
              if (shared >= 2) {
                for (const v of lineSets[j]) lineSets[i].add(v);
                lineSets.splice(j, 1);
                merged = true;
                break;
              }
            }
          }
        }

        // 2. Collect drawn undirected adjacency among symbolic points
        const segAdj = new Map();
        const addDrawnEdge = (u, v) => {
          const a = cleanRef(u), b = cleanRef(v);
          if (!a || !b || a === b) return;
          if (!segAdj.has(a)) segAdj.set(a, new Set());
          if (!segAdj.has(b)) segAdj.set(b, new Set());
          segAdj.get(a).add(b);
          segAdj.get(b).add(a);
        };
        for (const op of ops) {
          if (op.op === 'segment' || op.op === 'line' || op.op === 'ray') {
            addDrawnEdge(op.a, op.b);
          } else if ((op.op === 'polygon_base' || op.op === 'connect_polygon' || op.op === 'section') && Array.isArray(op.pts)) {
            for (let i = 0; i < op.pts.length; i++) {
              addDrawnEdge(op.pts[i], op.pts[(i + 1) % op.pts.length]);
            }
          } else if (op.op === 'foot_perp' && op.drawDropSegment !== false) {
            addDrawnEdge(op.p, getOpProducedId(op));
          } else if ((op.op === 'line_parallel' || op.op === 'line_perp') && op.drawSegment !== false) {
            addDrawnEdge(op.through || op.o || op.p, getOpProducedId(op));
          }
        }

        const evalProjMetrics = () => {
          const c2 = simulatePlanCoords(ops);
          const { map3: m3 } = build3DLiftedCoords(ops, c2);
          if (quadIds && quadIds.length === 4) {
            const qPts = quadIds.map(id => c2.get(id));
            if (qPts.some(p => !p) || !isQuadStrictlyConvex(qPts[0], qPts[1], qPts[2], qPts[3])) {
              return { ok: false, worstDot: -1, minDist: 0 };
            }
            // Ensure apex S stays well above base and front faces stay positive if standard view
            const sc = c2.get('S');
            if (!sc) return { ok: false, worstDot: -1, minDist: 0 };
            const maxBaseY = Math.max(...qPts.map(p => p.y));
            if (sc.y <= maxBaseY + 1.2) return { ok: false, worstDot: -1, minDist: 0 };
          }
          // Minimum pairwise separation among shown named points
          const namedIds = [...curPtOpMap.keys()].filter(id => {
            const o = curPtOpMap.get(id);
            return o && o.show !== false && !o.noDot && /^[A-Z]/.test(id) && c2.has(id);
          });
          let minDist = Infinity;
          for (let i = 0; i < namedIds.length; i++) {
            for (let j = i + 1; j < namedIds.length; j++) {
              const d = dist2D(c2.get(namedIds[i]), c2.get(namedIds[j]));
              if (d < minDist) minDist = d;
            }
          }
          let worstDot = 1.0; // most negative dot (closest to -1 = 180°)
          let worstTriple = '';
          for (const [mId, nbrSet] of segAdj.entries()) {
            const cm = c2.get(mId);
            if (!cm || nbrSet.size < 2) continue;
            const nbrs = [...nbrSet];
            for (let i = 0; i < nbrs.length; i++) {
              for (let j = i + 1; j < nbrs.length; j++) {
                const u = nbrs[i], v = nbrs[j];
                if (lineSets.some(ls => ls.has(u) && ls.has( mId ) && ls.has(v))) continue;
                const u3 = m3.get(u), m3p = m3.get(mId), v3 = m3.get(v);
                if (u3 && m3p && v3) {
                  const ux3 = u3.x - m3p.x, uy3 = u3.y - m3p.y, uz3 = u3.z - m3p.z;
                  const vx3 = v3.x - m3p.x, vy3 = v3.y - m3p.y, vz3 = v3.z - m3p.z;
                  const l3 = Math.hypot(ux3, uy3, uz3) * Math.hypot(vx3, vy3, vz3);
                  if (l3 > 1e-6) {
                    const cx3 = uy3 * vz3 - uz3 * vy3, cy3 = uz3 * vx3 - ux3 * vz3, cz3 = ux3 * vy3 - uy3 * vx3;
                    if (Math.hypot(cx3, cy3, cz3) / l3 < 0.035) continue;
                  }
                }
                const cu = c2.get(u), cv = c2.get(v);
                if (!cu || !cv) continue;
                const ux = cu.x - cm.x, uy = cu.y - cm.y;
                const vx = cv.x - cm.x, vy = cv.y - cm.y;
                const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
                if (lu < 1e-6 || lv < 1e-6) continue;
                const dot = (ux * vx + uy * vy) / (lu * lv);
                if (dot < worstDot) {
                  worstDot = dot;
                  worstTriple = `${u}-${mId}-${v}`;
                }
              }
            }
          }
          return { ok: true, worstDot, minDist, worstTriple };
        };

        const keepVerticalSA = /SA\s*(?:⊥|\\perp|vuông)/i.test(allContextText);
        const initM = evalProjMetrics();
        if (initM.ok && initM.worstDot < -0.978) {
          const snapFree = () => {
            const snap = new Map();
            for (const [id, o] of curPtOpMap.entries()) {
              if (o.op === 'point_free') snap.set(id, { x: o.x, y: o.y });
            }
            return snap;
          };
          const restoreFree = (snap) => {
            for (const [id, xy] of snap.entries()) {
              const o = curPtOpMap.get(id);
              if (o && o.op === 'point_free') { o.x = xy.x; o.y = xy.y; }
            }
          };
          const origSnap = snapFree();
          let bestSnap = null;
          let bestScore = -Infinity;

          const tryCandidate = () => {
            const m = evalProjMetrics();
            if (!m.ok || m.minDist < 0.36) return false;
            // Target >= 15° away from 180° (cos(165°) = -0.9659)
            const score = Math.min(m.worstDot, -0.92) * 100 + Math.min(m.minDist, 0.9) * 8;
            if (m.worstDot >= -0.966 && score > bestScore) {
              bestScore = score;
              bestSnap = snapFree();
              return m.worstDot >= -0.955 && m.minDist >= 0.50;
            }
            return false;
          };

          // Tier 1: Nudge free apex S alone
          const sNudges = keepVerticalSA
            ? [[0, 0.55], [0, -0.45], [0, 0.85]]
            : [[-0.55, 0], [0.55, 0], [0.95, 0], [-0.95, 0], [1.2, 0.1], [-1.2, 0.1], [0.75, 0.25], [-0.75, 0.25]];
          for (const [dx, dy] of sNudges) {
            restoreFree(origSnap);
            sFreeOp.x = Number((origSnap.get('S').x + dx).toFixed(4));
            sFreeOp.y = Number((origSnap.get('S').y + dy).toFixed(4));
            if (tryCandidate()) break;
          }

          // Tier 2: If steep base edge (e.g. CD) still locks BM // MN, apply gentle perspective-preserving base+apex shift on free ABCD
          if (!bestSnap && !keepVerticalSA && quadIds && quadIds.length === 4 && quadIds.every(id => curPtOpMap.get(id) && curPtOpMap.get(id).op === 'point_free')) {
            const [qA, qB, qC, qD] = quadIds;
            const comboShifts = [
              { S: [1.2, 0], A: [0, 0.2], B: [-0.4, 0.2], C: [-0.2, -0.5], D: [0, 0.3] },
              { S: [-0.7, 0], A: [0, 0.2], B: [0.5, -0.1], C: [0, 0], D: [0.1, -0.4] },
              { S: [1.0, 0.1], A: [0, 0.2], B: [-0.3, 0.1], C: [-0.2, -0.4], D: [0.1, 0.3] }
            ];
            for (const sh of comboShifts) {
              restoreFree(origSnap);
              for (const [k, id] of [['S', 'S'], ['A', qA], ['B', qB], ['C', qC], ['D', qD]]) {
                const d = sh[k];
                const baseXY = origSnap.get(id);
                if (d && baseXY) {
                  curPtOpMap.get(id).x = Number((baseXY.x + d[0]).toFixed(4));
                  curPtOpMap.get(id).y = Number((baseXY.y + d[1]).toFixed(4));
                }
              }
              if (tryCandidate()) break;
            }
          }

          if (bestSnap) {
            restoreFree(bestSnap);
            simCoords = simulatePlanCoords(ops);
            fixes.push(`Đã tinh chỉnh góc chiếu 3D để xóa ảo giác thẳng hàng trên hình chiếu phẳng (${initM.worstTriple}).`);
          } else {
            restoreFree(origSnap);
          }
        }
      }
    }

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
      } else if (op.op === 'angle_bisector' && (((op.onOpposite || op.intersectOpposite) && op.drawSegment !== false) || op.drawRay || op.asRay || op.drawSegment)) {
        referencedInShapes.add(op.id);
        referencedInShapes.add(cleanRef(op.o || op.v || op.vertex));
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

    const flatPtIds = new Set();
    let curOpFlat = false;
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
      // Flat sub-figure (e.g. a cube face redrawn in true shape beside the solid): op.flat === true,
      // or every parent is flat. Flat points never join the 3D skeleton / hidden-line classifier.
      const defRefs = ['a', 'b', 'c', 'p', 'o'].map(k => def && def[k]).filter(v => typeof v === 'string')
        .concat(...['l1', 'l2', 'pts'].map(k => (def && Array.isArray(def[k]) ? def[k] : [])));
      const parentsFlat = defRefs.length > 0 && defRefs.every(rid => flatPtIds.has(rid));
      if (curOpFlat || parentsFlat) {
        flatPtIds.add(id);
        Object.defineProperty(pt, '_flat', { value: true, enumerable: false, configurable: true });
      }
      pts.push(pt);
      if (sym) symToPt.set(String(sym).trim(), pt);
      return pt;
    };
    const isFlatSeg = (uId, vId) => flatPtIds.has(uId) && flatPtIds.has(vId);
    // 3D skeleton vertex: free / sum, plus named vertices locked by rotate / parallel-perpendicular (cube A', D; prism A').
    const isSkeletonVertex = (p) => !!(p && p.show && !p._flat && p.def &&
      (p.def.t === 'free' || p.def.t === 'sum' || ((p.def.t === 'rot' || p.def.t === 'vec') && !p.noDot)));

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
      const hasStrokeDash = kind === 'segment' || kind === 'line' || kind === 'ray' || kind === 'circle' || kind === 'arc' || kind === 'arc3' || kind === 'sector' || kind === 'spline' || kind === 'bezier' || kind === 'spiral';
      const cleanName = opts.name != null ? String(opts.name).trim() : '';
      const validNameAt = opts.nameAt && Number.isFinite(Number(opts.nameAt.x)) && Number.isFinite(Number(opts.nameAt.y))
        ? { x: Number(opts.nameAt.x), y: Number(opts.nameAt.y) }
        : null;
      const sh = {
        id: genId(),
        kind,
        pts: ptIds,
        color: useCustomCol ? opts.color : appStyle.color,
        width: opts.width === 0 ? 0 : (useCustomW ? opts.width : appStyle.width),
        ...(hasStrokeDash ? { dashed: !!opts.dashed } : (opts.dashed ? { dashed: true } : {})),
        ...(cleanName ? { name: cleanName } : {}),
        ...(validNameAt ? { nameAt: validNameAt } : {}),
        ...(opts.aux ? { aux: true } : {}),
        ...(opts.fill ? { fill: opts.fill } : {}),
        ...(Array.isArray(opts.gaps) && opts.gaps.length ? { gaps: opts.gaps } : (kind === 'polygon' && opts.width === 0 && opts.fill ? { gaps: ptIds.map((_, idx) => idx) } : {})),
        ...(opts.arrow ? { arrow: true } : {}),
        ...(opts.plain ? { plain: true } : {}),
        ...(opts.cw ? { cw: true } : {}),
        ...(opts.closed ? { closed: true } : {}),
        ...(opts.spiralKind ? { spiralKind: opts.spiralKind } : {}),
        ...(Number.isFinite(opts.turns) ? { turns: opts.turns } : {}),
        ...(Number.isFinite(opts.n) ? { n: opts.n } : {})
      };
      if (opts.explicitDashed !== undefined) {
        Object.defineProperty(sh, '_explicitDashed', { value: !!opts.explicitDashed, enumerable: false, configurable: true });
      }
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
        .filter(isSkeletonVertex)
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

    const isSegmentOnHullBoundary = (cu, cv, hullCoords) => {
      if (!cu || !cv || hullCoords.length < 3) return false;
      for (let i = 0; i < hullCoords.length; i++) {
        const a = hullCoords[i], b = hullCoords[(i + 1) % hullCoords.length];
        const prU = pointSegProj(cu, a, b);
        const prV = pointSegProj(cv, a, b);
        if (!prU || !prV) continue;
        const tol = Math.max(0.03, prU.len * 0.015);
        if (prU.perp <= tol && prV.perp <= tol && prU.k >= -0.02 && prU.k <= 1.02 && prV.k >= -0.02 && prV.k <= 1.02) {
          return true;
        }
      }
      return false;
    };

    // True 3D Polyhedral Face Visibility Classifier:
    // Reconstructs polyhedron base + lateral (+ top prism) faces and propagates face membership
    // through mid / on / foot / inter / vec / sum so front-face chords (SB, SC, BM, MN, MI) are SOLID
    // while back-face / base / interior chords (AD, AC, BD, SO, AM, BK, BI, AI) are DASHED!
    const build3DFaceVisibilityModel = (coordsMap) => {
      if (!planIs3D) return { valid: false };
      const skelPts = pts.filter(p =>
        isSkeletonVertex(p) && !p.noDot && coordsMap.get(p.id)
      );
      if (skelPts.length < 4) return { valid: false };

      const intersectSets = (sA, sB) => {
        const out = new Set();
        if (!sA || !sB) return out;
        for (const x of sA) if (sB.has(x)) out.add(x);
        return out;
      };
      const unionSets = (sA, sB) => {
        const out = new Set(sA || []);
        if (sB) for (const x of sB) out.add(x);
        return out;
      };

      const orderCycle = (cyclePts) => {
        if (cyclePts.length <= 2) return cyclePts.slice();
        const idSet = new Set(cyclePts.map(p => p.id));
        const adj = new Map(cyclePts.map(p => [p.id, []]));
        for (const sh of shapes) {
          if (!sh || sh.hidden || sh.kind !== 'segment' || !Array.isArray(sh.pts) || sh.pts.length < 2) continue;
          const [u, v] = sh.pts;
          if (idSet.has(u) && idSet.has(v) && u !== v) {
            if (!adj.get(u).includes(v)) adj.get(u).push(v);
            if (!adj.get(v).includes(u)) adj.get(v).push(u);
          }
        }
        // Walk cycle if base edges already form a clean simple cycle/path of all vertices
        if ([...adj.values()].every(nb => nb.length >= 1 && nb.length <= 2)) {
          const start = cyclePts.find(p => adj.get(p.id).length === 1) || cyclePts[0];
          const visited = [start];
          const seen = new Set([start.id]);
          while (visited.length < cyclePts.length) {
            const cur = visited[visited.length - 1];
            const nxtId = (adj.get(cur.id) || []).find(nid => !seen.has(nid));
            if (!nxtId) break;
            seen.add(nxtId);
            visited.push(cyclePts.find(p => p.id === nxtId));
          }
          if (visited.length === cyclePts.length) return visited;
        }
        // Radial fallback around 2D centroid
        let cx = 0, cy = 0;
        for (const p of cyclePts) {
          const c = coordsMap.get(p.id);
          cx += c.x; cy += c.y;
        }
        cx /= cyclePts.length; cy /= cyclePts.length;
        return cyclePts.slice().sort((u, v) => {
          const cu = coordsMap.get(u.id), cv = coordsMap.get(v.id);
          return Math.atan2(cu.y - cy, cu.x - cx) - Math.atan2(cv.y - cy, cv.x - cx);
        });
      };

      const faceVisible = new Map();
      const facesOfPoint = new Map();
      const skeletonEdgeKeys = new Set();
      const markSkelEdge = (a, b) => skeletonEdgeKeys.add(a < b ? `${a}|${b}` : `${b}|${a}`);
      const seedFace = (pid, fid) => {
        if (!facesOfPoint.has(pid)) facesOfPoint.set(pid, new Set());
        facesOfPoint.get(pid).add(fid);
      };

      // Check Prism (e.g. ABC.A'B'C' or ABCD.A'B'C'D' or A1B1C1D1) vs Pyramid (S.ABCD / S.ABC)
      const byLabel = new Map(skelPts.filter(p => p.label).map(p => [p.label, p]));
      const prismPairs = [];
      for (const p of skelPts) {
        const m = /^([A-Z])(?:'|′|1)$/.exec(p.label || '');
        if (m && byLabel.has(m[1])) {
          prismPairs.push({ base: byLabel.get(m[1]), top: p });
        }
      }

      if (prismPairs.length >= 3 && prismPairs.length * 2 === skelPts.length) {
        const orderedBase = orderCycle(prismPairs.map(x => x.base));
        const topMap = new Map(prismPairs.map(x => [x.base.id, x.top]));
        const orderedTop = orderedBase.map(b => topMap.get(b.id));
        const m = orderedBase.length;
        const hullIds = computeSkeletonHullIds(coordsMap);
        const hullCoords = hullIds.map(id => coordsMap.get(id)).filter(Boolean);

        let anyExplicitBaseDash = false;
        for (let i = 0; i < m; i++) {
          const eB = findEdge(orderedBase[i].id, orderedBase[(i + 1) % m].id);
          if (eB && eB._explicitDashed && eB.dashed) anyExplicitBaseDash = true;
        }
        faceVisible.set('base', false);
        faceVisible.set('top', true);

        for (let i = 0; i < m; i++) {
          const b0 = orderedBase[i], b1 = orderedBase[(i + 1) % m];
          const t0 = orderedTop[i], t1 = orderedTop[(i + 1) % m];
          const fId = `lat_${i}`;
          markSkelEdge(b0.id, b1.id);
          markSkelEdge(t0.id, t1.id);
          markSkelEdge(b0.id, t0.id);
          seedFace(b0.id, 'base'); seedFace(t0.id, 'top');
          seedFace(b0.id, fId); seedFace(b1.id, fId);
          seedFace(t0.id, fId); seedFace(t1.id, fId);

          const eB = findEdge(b0.id, b1.id);
          if (anyExplicitBaseDash && eB && eB._explicitDashed !== undefined) {
            faceVisible.set(fId, !eB.dashed);
          } else {
            faceVisible.set(fId, isSegmentOnHullBoundary(coordsMap.get(b0.id), coordsMap.get(b1.id), hullCoords));
          }
        }
      } else {
        // Pyramid / Tetrahedron: in Canvas (+y DOWN), highest vertex on screen has MINIMUM c.y!
        let apex = skelPts.find(p => p.label === 'S') || null;
        if (!apex) {
          apex = skelPts.reduce((best, p) => (coordsMap.get(p.id).y < coordsMap.get(best.id).y ? p : best), skelPts[0]);
        }
        const basePts = orderCycle(skelPts.filter(p => p.id !== apex.id));
        const m = basePts.length;
        if (m < 3) return { valid: false };

        let sigma = 0;
        for (let i = 0; i < m; i++) {
          const c0 = coordsMap.get(basePts[i].id), c1 = coordsMap.get(basePts[(i + 1) % m].id);
          sigma += (c0.x * c1.y - c1.x * c0.y);
        }
        if (Math.abs(sigma) < 1e-8) return { valid: false };

        let anyExplicitBaseDash = false;
        for (let i = 0; i < m; i++) {
          const eB = findEdge(basePts[i].id, basePts[(i + 1) % m].id);
          if (eB && eB._explicitDashed && eB.dashed) anyExplicitBaseDash = true;
        }
        faceVisible.set('base', false);

        const cs = coordsMap.get(apex.id);
        for (let i = 0; i < m; i++) {
          const v0 = basePts[i], v1 = basePts[(i + 1) % m];
          const fId = `lat_${i}`;
          markSkelEdge(v0.id, v1.id);
          markSkelEdge(apex.id, v0.id);
          seedFace(v0.id, 'base');
          seedFace(v0.id, fId);
          seedFace(v1.id, fId);
          seedFace(apex.id, fId);

          const eB = findEdge(v0.id, v1.id);
          if (anyExplicitBaseDash && eB && eB._explicitDashed !== undefined) {
            faceVisible.set(fId, !eB.dashed);
          } else {
            const c0 = coordsMap.get(v0.id), c1 = coordsMap.get(v1.id);
            const crossLat = (c0.x - cs.x) * (c1.y - cs.y) - (c0.y - cs.y) * (c1.x - cs.x);
            faceVisible.set(fId, sigma * crossLat > 1e-6);
          }
        }
      }

      // Propagate face membership through DAG definitions in multi-pass topological order
      const getFaces = (id) => facesOfPoint.get(id) || new Set();
      for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        for (const pt of pts) {
          if (!pt || !pt.def || facesOfPoint.has(pt.id)) continue;
          const d = pt.def;
          let nextSet = null;
          if (d.t === 'mid' || d.t === 'on') {
            if (d.a && d.b && (facesOfPoint.has(d.a) || facesOfPoint.has(d.b))) {
              nextSet = intersectSets(getFaces(d.a), getFaces(d.b));
            }
          } else if (d.t === 'foot') {
            if (d.a && d.b && (facesOfPoint.has(d.a) || facesOfPoint.has(d.b))) {
              nextSet = intersectSets(getFaces(d.a), getFaces(d.b));
            }
          } else if (d.t === 'inter' && !d.c1 && !d.c2 && Array.isArray(d.l1) && Array.isArray(d.l2)) {
            const f1 = intersectSets(getFaces(d.l1[0]), getFaces(d.l1[1]));
            const f2 = intersectSets(getFaces(d.l2[0]), getFaces(d.l2[1]));
            nextSet = unionSets(f1, f2);
          } else if (d.t === 'vec' && !d.perp && d.o && d.a && d.b) {
            nextSet = intersectSets(getFaces(d.o), intersectSets(getFaces(d.a), getFaces(d.b)));
          } else if (d.t === 'sum' && d.a && d.b && d.c) {
            nextSet = intersectSets(getFaces(d.a), intersectSets(getFaces(d.b), getFaces(d.c)));
          }
          if (nextSet) {
            facesOfPoint.set(pt.id, nextSet);
            changed = true;
          }
        }
        if (!changed) break;
      }

      return { valid: true, faceVisible, facesOfPoint, skeletonEdgeKeys, intersectSets };
    };

    const classify3DSegmentDashed = (uId, vId, coordsMap, visModelArg) => {
      if (!planIs3D || isFlatSeg(uId, vId)) return false;
      const cu = coordsMap.get(uId), cv = coordsMap.get(vId);
      if (!cu || !cv) return false;
      const hullIds = computeSkeletonHullIds(coordsMap);
      const hullCoords = hullIds.map(id => coordsMap.get(id)).filter(Boolean);
      if (hullCoords.length < 3) return false;

      // 1. Lies on 2D outer silhouette boundary of polyhedron -> SOLID (dashed: false)
      if (isSegmentOnHullBoundary(cu, cv, hullCoords)) return false;

      // 2. Extends outside the polyhedron silhouette (e.g. Ax outside ABCD) -> SOLID (dashed: false)
      const midC = { x: (cu.x + cv.x) * 0.5, y: (cu.y + cv.y) * 0.5 };
      if (!pointInHull(midC, hullCoords)) return false;

      // 3. Inside silhouette: check True 3D Face Membership!
      const vm = visModelArg || build3DFaceVisibilityModel(coordsMap);
      if (vm && vm.valid) {
        const fU = vm.facesOfPoint.get(uId) || new Set();
        const fV = vm.facesOfPoint.get(vId) || new Set();
        for (const fId of fU) {
          if (fV.has(fId) && vm.faceVisible.get(fId) === true) {
            return false; // Shares at least one VISIBLE FRONT FACE (e.g. SB, SC, BM on SBC; MN, MI on SCD) -> SOLID!
          }
        }
        return true; // Shares only hidden back/base face (AD, AI, AC, BD) or strictly 3D interior (SO, AM, BK, BI) -> DASHED!
      }
      return true;
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
          const nextCur = evalCurrentCoords();
          const vm = build3DFaceVisibilityModel(nextCur);
          const dash1 = classify3DSegmentDashed(pStart.id, pCross.id, nextCur, vm);
          const dash2 = classify3DSegmentDashed(pCross.id, pEnd.id, nextCur, vm);
          const sh1 = addShapeRec('segment', [pStart.id, pCross.id], { ...styleOpts, dashed: dash1 });
          rawSteps.push(makeStepForShape(sh1.id, descLabel || `Kẻ qua ${pStart.label}`, false, motionMeta));
          const sh2 = addShapeRec('segment', [pCross.id, pEnd.id], { ...styleOpts, dashed: dash2 });
          rawSteps.push(makeStepForShape(sh2.id, `${descLabel || 'Kéo dài'} (ra ngoài khối)`, false, motionMeta));
          return sh2;
        }
      }

      const hasExp = explicitDashed !== undefined;
      const finalDashed = hasExp
        ? !!explicitDashed
        : (planIs3D ? classify3DSegmentDashed(pStart.id, pEnd.id, cur) : false);
      const sh = addShapeRec('segment', [pStart.id, pEnd.id], { ...styleOpts, dashed: finalDashed, explicitDashed: hasExp ? finalDashed : undefined });
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
      curOpFlat = op.flat === true || op.sub2d === true;
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
            const pt = registerPoint(op.id || op.label, { t: 'on', a: a.id, b: b.id, k, seg: true, ...(op.lock === true ? { lock: true } : {}) }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
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
            const pt = registerPoint(op.id || op.label, { t: 'on', a: a.id, b: b.id, k, seg, ...(op.lock === true ? { lock: true } : {}) }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
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
              const hasExpDash = op.dashed !== undefined;
              const dropDash = hasExpDash ? !!op.dashed : (planIs3D ? classify3DSegmentDashed(p.id, pt.id, evalCurrentCoords()) : false);
              const sh = addShapeRec('segment', [p.id, pt.id], { dashed: dropDash, explicitDashed: hasExpDash ? dropDash : undefined, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
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
              // Match kernel Hg({x, y}) = {x: y, y: -x} in Canvas (+y DOWN) space
              const rawDir = isPerp ? { x: cb.y - ca.y, y: -(cb.x - ca.x) } : { x: cb.x - ca.x, y: cb.y - ca.y };
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

            const pt = registerPoint(op.id || op.label, { t: 'vec', o: through.id, a: a.id, b: b.id, k, perp: isPerp, ...(op.drag === true ? { drag: true } : {}) }, lblStr, op.show !== false, isLineStyle ? { noDot: true } : { noDot: op.noDot });
            const lineStyleOpts = { color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: op.aux !== undefined ? !!op.aux : isLineStyle };
            if (oppK !== null && op.drawSegment !== false) {
              const pOpp = registerPoint('', { t: 'vec', o: through.id, a: a.id, b: b.id, k: oppK, perp: isPerp }, '', false);
              emitSilhouetteSegment(through, pOpp, lineStyleOpts, stepLabel || `Kéo dài ${through.label}${lblStr}`, op.dashed, mMeta);
            }
            if (op.drawSegment !== false) {
              const explicitD = op.dashed !== undefined ? !!op.dashed : (isLineStyle ? undefined : false);
              const extraNameOpts = {
                ...(op.name != null && String(op.name).trim() ? { name: String(op.name).trim() } : {}),
                ...(op.nameAt && Number.isFinite(Number(op.nameAt.x)) && Number.isFinite(Number(op.nameAt.y)) ? { nameAt: { x: Number(op.nameAt.x), y: Number(op.nameAt.y) } } : {})
              };
              if (op.kind === 'line' || op.kind === 'ray') {
                const sh = addShapeRec(op.kind, [through.id, pt.id], { ...lineStyleOpts, ...extraNameOpts, dashed: !!explicitD });
                const stS = makeStepForShape(sh.id, stepLabel || (isPerp ? `Kẻ đường vuông góc từ ${through.label}` : `Kẻ ${through.label}${lblStr} // ${a.label}${b.label}`), !!op.tempHide, mMeta);
                rawSteps.push(stS);
                recordSymStep(cleanRef(op.id || op.label), stS);
              } else {
                emitSilhouetteSegment(through, pt, { ...lineStyleOpts, ...extraNameOpts }, stepLabel || (isPerp ? `Kẻ đường vuông góc từ ${through.label}` : `Kẻ ${through.label}${lblStr} // ${a.label}${b.label}`), explicitD, mMeta);
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
            const pt = registerPoint(op.id || op.label, { t: 'path', kind: 'circle', on: 'circle', pts: [o.id, r.id], k: norm, ...(op.lock === true ? { lock: true } : {}) }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
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
            if (op.noAutoConnect) {
              Object.defineProperty(pt, '_noAutoConnect', { value: true, enumerable: false, configurable: true });
            }
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
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [a1.id, a2.id], c1: false, l2: [o.id, r.id], c2: true, which: Number(op.which) ? 1 : 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            // Runtime secant-endpoint & sibling collision guard
            const curAfter = evalCurrentCoords();
            const cNew = curAfter.get(pt.id);
            const cO = curAfter.get(o.id), cR = curAfter.get(r.id);
            const rad = (cO && cR) ? dist2D(cO, cR) : 0;
            if (cNew && rad > 1e-6) {
              const hitsKnownEnd = [a1, a2].some(ep => ep.id !== pt.id && curAfter.get(ep.id) && Math.abs(dist2D(curAfter.get(ep.id), cO) - rad) <= rad * 0.005 && dist2D(cNew, curAfter.get(ep.id)) < 1e-4);
              const hitsSibling = pts.some(other =>
                other && other.id !== pt.id && other.def && other.def.t === 'inter' && !other.def.c1 && other.def.c2 &&
                other.def.l2[0] === o.id && other.def.l2[1] === r.id &&
                ((other.def.l1[0] === a1.id && other.def.l1[1] === a2.id) || (other.def.l1[0] === a2.id && other.def.l1[1] === a1.id)) &&
                curAfter.get(other.id) && dist2D(cNew, curAfter.get(other.id)) < 1e-4
              );
              if (hitsKnownEnd || hitsSibling) {
                const origW = pt.def.which;
                pt.def.which = 1 - origW;
                const altC = evalCurrentCoords().get(pt.id);
                if (!altC || dist2D(altC, cNew) < 1e-4) pt.def.which = origW;
              }
            }
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
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [o1.id, r1.id], c1: true, l2: [o2.id, r2.id], c2: true, which: Number(op.which) ? 1 : 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            const curAfter = evalCurrentCoords();
            const cNew = curAfter.get(pt.id);
            if (cNew) {
              const hitsSibling = pts.some(other =>
                other && other.id !== pt.id && other.def && other.def.t === 'inter' && other.def.c1 && other.def.c2 &&
                ((other.def.l1[0] === o1.id && other.def.l1[1] === r1.id && other.def.l2[0] === o2.id && other.def.l2[1] === r2.id) ||
                 (other.def.l1[0] === o2.id && other.def.l1[1] === r2.id && other.def.l2[0] === o1.id && other.def.l2[1] === r1.id)) &&
                curAfter.get(other.id) && dist2D(cNew, curAfter.get(other.id)) < 1e-4
              );
              if (hitsSibling) {
                const origW = pt.def.which;
                pt.def.which = 1 - origW;
                const altC = evalCurrentCoords().get(pt.id);
                if (!altC || dist2D(altC, cNew) < 1e-4) pt.def.which = origW;
              }
            }
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
            // Reuse existing dynamic midpoint(O, P) if already defined in plan, else synthesize hidden Thales center
            let midPt = pts.find(cand =>
              cand && cand.def && cand.def.t === 'mid' &&
              ((cand.def.a === o.id && cand.def.b === ext.id) || (cand.def.a === ext.id && cand.def.b === o.id))
            ) || null;
            if (!midPt) {
              const thalesMidKey = `__thales_${ext.id}_${o.id}`;
              midPt = symToPt.get(thalesMidKey) || registerPoint(thalesMidKey, { t: 'mid', a: o.id, b: ext.id }, '', false, { noDot: true });
            }
            const pt = registerPoint(op.id || op.label, { t: 'inter', l1: [midPt.id, o.id], c1: true, l2: [o.id, r.id], c2: true, which: Number(op.which) ? 1 : 0 }, op.label ?? op.id, op.show !== false, { noDot: op.noDot });
            // Runtime sibling collision guard: never allow two tangent points from ext to (o, r) to pick the same branch
            const curAfter = evalCurrentCoords();
            const cNew = curAfter.get(pt.id);
            if (cNew) {
              const collided = pts.some(other =>
                other && other.id !== pt.id && other.def && other.def.t === 'inter' && other.def.c1 && other.def.c2 &&
                curAfter.get(other.id) && dist2D(cNew, curAfter.get(other.id)) < 1e-4 &&
                ((other.def.l1[0] === midPt.id && other.def.l2[0] === o.id) || (other.def.l2[0] === midPt.id && other.def.l1[0] === o.id))
              );
              if (collided) pt.def.which = 1 - pt.def.which;
            }
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
            const shapeName = op.name != null ? String(op.name).trim() : (op.label != null ? String(op.label).trim() : '');
            const shapeNameAt = op.nameAt && Number.isFinite(Number(op.nameAt.x)) && Number.isFinite(Number(op.nameAt.y))
              ? { x: Number(op.nameAt.x), y: Number(op.nameAt.y) }
              : undefined;
            const existing = op.op === 'segment' ? findEdge(a.id, b.id) : null;
            if (existing) {
              if (shapeName && !existing.name) {
                existing.name = shapeName;
                if (shapeNameAt) existing.nameAt = shapeNameAt;
              }
              break;
            }
            const hasExpDash = op.dashed !== undefined;
            const segDash = hasExpDash
              ? !!op.dashed
              : (op.op === 'segment' && planIs3D ? classify3DSegmentDashed(a.id, b.id, evalCurrentCoords()) : false);
            const sh = addShapeRec(op.op, [a.id, b.id], {
              dashed: segDash,
              explicitDashed: hasExpDash ? segDash : undefined,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux,
              arrow: !!op.arrow,
              name: shapeName || undefined,
              nameAt: shapeNameAt
            });
            const kindTxt = op.op === 'line' ? 'Đường thẳng' : (op.op === 'ray' ? 'Tia' : (segDash ? 'Nét đứt' : 'Đoạn'));
            const st = makeStepForShape(sh.id, stepLabel || `${kindTxt} ${shapeName || (a.label + b.label)}`, !!op.tempHide, mMeta);
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
          const hasNonEmptyDashList = Array.isArray(op.dashedEdges) && op.dashedEdges.length > 0;
          const isEdgeDashed = (la, lb) => dashedSet.has(`${la}-${lb}`) || dashedSet.has(`${lb}-${la}`) || dashedSet.has(`${la}${lb}`) || dashedSet.has(`${lb}${la}`);
          const curCoords = planIs3D ? evalCurrentCoords() : null;
          const visModel = curCoords ? build3DFaceVisibilityModel(curCoords) : null;
          const edgeMotion = { ...mMeta };
          if (edgeMotion.effect === 'fade' && op.fill) {
            // Keep edges drawn cleanly while fill uses fade
            edgeMotion.effect = defaultFx || 'draw';
          }
          for (let i = 0; i < ids.length; i++) {
            const pA = ids[i], pB = ids[(i + 1) % ids.length];
            if (findEdge(pA.id, pB.id)) continue;
            let edgeDashed = isEdgeDashed(pA.label, pB.label);
            let expEdge = hasNonEmptyDashList;
            if (!hasNonEmptyDashList && planIs3D && curCoords) {
              edgeDashed = classify3DSegmentDashed(pA.id, pB.id, curCoords, visModel);
              expEdge = false;
            }
            const sh = addShapeRec('segment', [pA.id, pB.id], { dashed: edgeDashed, explicitDashed: expEdge ? edgeDashed : undefined, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth, aux: !!op.aux });
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
        case 'plane': {
          const ids = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          if (ids.length >= 3) {
            const shapeName = op.name != null ? String(op.name).trim() : (op.label != null ? String(op.label).trim() : '');
            const shapeNameAt = op.nameAt && Number.isFinite(Number(op.nameAt.x)) && Number.isFinite(Number(op.nameAt.y))
              ? { x: Number(op.nameAt.x), y: Number(op.nameAt.y) }
              : undefined;
            const sh = addShapeRec('plane', ids.map(x => x.id), {
              dashed: !!op.dashed,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux,
              name: shapeName || undefined,
              nameAt: shapeNameAt
            });
            const pMeta = { ...mMeta, effect: op.effect || 'fade' };
            const st = makeStepForShape(sh.id, stepLabel || `Mặt phẳng (${shapeName || 'P'})`, !!op.tempHide, pMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `plane_${shapeName || ids.map(x => x.label).join('')}`), st);
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
        case 'rotate': {
          const cPt = resolvePt(op.center || op.c || op.o);
          const pPt = resolvePt(op.point || op.p || op.from);
          if (cPt && pPt) {
            const deg = Number.isFinite(Number(op.angleDeg ?? op.ang ?? op.angle)) ? Number(op.angleDeg ?? op.ang ?? op.angle) : 60;
            const k = Number.isFinite(Number(op.k)) ? Number(op.k) : 1;
            // Negate angleDeg in Canvas (+y DOWN) so +angleDeg rotates CCW in Math (+y UP)!
            const pt = registerPoint(
              op.id || op.label,
              { t: 'rot', c: cPt.id, p: pPt.id, ang: -deg, k },
              op.label ?? op.id,
              op.show !== false,
              { noDot: op.noDot }
            );
            if (hasExplicitOpMotion) customMotionPtIds.add(pt.id);
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Quay ${pPt.label} quanh ${cPt.label} góc ${deg}° được ${pt.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'angle_bisector': {
          const aPt = resolvePt(op.a);
          const oPt = resolvePt(op.o || op.v || op.vertex);
          const bPt = resolvePt(op.b);
          if (aPt && oPt && bPt) {
            const isOnOpp = !!(op.onOpposite || op.intersectOpposite);
            let pt;
            if (isOnOpp) {
              const helperKey = `__bis_${oPt.id}_${cleanRef(op.id || op.label)}`;
              const helperPt = symToPt.get(helperKey) || registerPoint(helperKey, { t: 'bis', a: aPt.id, o: oPt.id, b: bPt.id }, '', false, { noDot: true });
              pt = registerPoint(
                op.id || op.label,
                { t: 'inter', l1: [oPt.id, helperPt.id], c1: false, l2: [aPt.id, bPt.id], c2: false, which: 0 },
                op.label ?? op.id,
                op.show !== false,
                { noDot: op.noDot }
              );
              if (op.drawSegment === false) {
                Object.defineProperty(pt, '_noAutoConnect', { value: true, enumerable: false, configurable: true });
              } else if (!findEdge(oPt.id, pt.id)) {
                const hasExpDash = op.dashed !== undefined;
                const segDash = hasExpDash ? !!op.dashed : (planIs3D ? classify3DSegmentDashed(oPt.id, pt.id, evalCurrentCoords()) : false);
                const sh = addShapeRec('segment', [oPt.id, pt.id], { dashed: segDash, explicitDashed: hasExpDash ? segDash : undefined, aux: op.aux !== undefined ? !!op.aux : true, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth });
                const stS = makeStepForShape(sh.id, stepLabel || `Đường phân giác ${oPt.label}${pt.label}`, !!op.tempHide, mMeta);
                rawSteps.push(stS);
                recordSymStep(cleanRef(op.id || op.label), stS);
              }
            } else {
              pt = registerPoint(
                op.id || op.label,
                { t: 'bis', a: aPt.id, o: oPt.id, b: bPt.id },
                op.label ?? op.id,
                op.show !== false,
                { noDot: op.noDot }
              );
              if (op.drawRay || op.asRay) {
                const sh = addShapeRec('ray', [oPt.id, pt.id], { dashed: !!op.dashed, aux: op.aux !== undefined ? !!op.aux : true, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth });
                const stR = makeStepForShape(sh.id, stepLabel || `Tia phân giác góc ${aPt.label}${oPt.label}${bPt.label}`, !!op.tempHide, mMeta);
                rawSteps.push(stR);
                recordSymStep(cleanRef(op.id || op.label), stR);
              } else if (op.drawSegment && !findEdge(oPt.id, pt.id)) {
                const sh = addShapeRec('segment', [oPt.id, pt.id], { dashed: !!op.dashed, aux: op.aux !== undefined ? !!op.aux : true, color: op.color, width: op.width, explicitColor: !!op.explicitColor, explicitWidth: !!op.explicitWidth });
                const stS = makeStepForShape(sh.id, stepLabel || `Đoạn phân giác ${oPt.label}${pt.label}`, !!op.tempHide, mMeta);
                rawSteps.push(stS);
                recordSymStep(cleanRef(op.id || op.label), stS);
              }
            }
            if (op.show !== false && pt) {
              const stP = makeStepForPt(pt.id, stepLabel || `Điểm phân giác ${pt.label}`, mMeta);
              rawSteps.push(stP);
              recordSymStep(cleanRef(op.id || op.label), stP);
            }
          }
          break;
        }
        case 'common_tangent': {
          const c1 = Array.isArray(op.c1) ? op.c1 : [];
          const c2 = Array.isArray(op.c2) ? op.c2 : [];
          const o1 = resolvePt(c1[0]), r1 = resolvePt(c1[1]);
          const o2 = resolvePt(c2[0]), r2 = resolvePt(c2[1]);
          if (o1 && r1 && o2 && r2) {
            const pt = registerPoint(
              op.id || op.label,
              {
                t: 'ctan',
                c1: [o1.id, r1.id],
                c2: [o2.id, r2.id],
                inner: !!op.inner,
                which: !(Number(op.which) || 0),
                on: op.on === 2 ? 2 : 1
              },
              op.label ?? op.id,
              op.show !== false,
              { noDot: op.noDot }
            );
            if (op.show !== false) {
              const st = makeStepForPt(pt.id, stepLabel || `Tiếp điểm chung ${pt.label}`, mMeta);
              rawSteps.push(st);
              recordSymStep(cleanRef(op.id || op.label), st);
            }
          }
          break;
        }
        case 'arc':
        case 'sector': {
          const pArr = Array.isArray(op.pts) && op.pts.length >= 3
            ? [op.pts[0], op.pts[1], op.pts[2]]
            : [op.center || op.o, op.start || op.a || op.from, op.end || op.b || op.to];
          const o = resolvePt(pArr[0]), s = resolvePt(pArr[1]), e = resolvePt(pArr[2]);
          if (o && s && e) {
            const fillVal = op.op === 'sector'
              ? ((op.explicitColor && op.fill) ? op.fill : (op.fill || 'rgba(15, 23, 42, 0.06)'))
              : undefined;
            const sh = addShapeRec(op.op, [o.id, s.id, e.id], {
              dashed: !!op.dashed,
              cw: !!op.cw,
              fill: fillVal,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux,
              arrow: !!op.arrow
            });
            const st = makeStepForShape(sh.id, stepLabel || (op.op === 'sector' ? `Hình quạt ${s.label}${o.label}${e.label}` : `Cung ${s.label}${e.label}`), !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `${op.op}_${o.label}_${s.label}_${e.label}`), st);
          }
          break;
        }
        case 'spline': {
          const resolved = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          if (resolved.length >= 2) {
            const sh = addShapeRec('spline', resolved.map(p => p.id), {
              closed: !!op.closed,
              dashed: !!op.dashed,
              fill: op.closed ? op.fill : undefined,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux
            });
            const st = makeStepForShape(sh.id, stepLabel || ('Đường cong trơn ' + resolved.slice(0, 5).map(p => p.label).join('')), !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || ('spline_' + resolved[0].label)), st);
          }
          break;
        }
        case 'bezier': {
          const resolved = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          if (resolved.length >= 3) {
            const sh = addShapeRec('bezier', resolved.map(p => p.id), {
              dashed: !!op.dashed,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux
            });
            const st = makeStepForShape(sh.id, stepLabel || ('Đường cong Bézier ' + resolved.slice(0, 4).map(p => p.label).join('')), !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || ('bezier_' + resolved[0].label)), st);
          }
          break;
        }
        case 'spiral': {
          const pArr = Array.isArray(op.pts) && op.pts.length >= 2 ? op.pts.slice(0, 2) : [op.center || op.o, op.rim || op.a || op.r];
          const o = resolvePt(pArr[0]), a = resolvePt(pArr[1]);
          if (o && a) {
            const sk = op.spiralKind || 'golden';
            const turns = Math.max(0.25, Math.min(10, Number(op.turns) || (sk === 'archimedean' ? 3 : 2.5)));
            const sh = addShapeRec('spiral', [o.id, a.id], {
              spiralKind: sk,
              turns,
              cw: !!op.cw,
              dashed: !!op.dashed,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux
            });
            const st = makeStepForShape(sh.id, stepLabel || (sk === 'archimedean' ? ('Xoắn ốc Archimede (' + o.label + ')') : ('Xoắn ốc vàng (' + o.label + ')')), !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || ('spiral_' + o.label)), st);
          }
          break;
        }
        case 'arc3': {
          const pArr = Array.isArray(op.pts) && op.pts.length >= 3 ? op.pts : [op.a, op.b, op.c];
          const p1 = resolvePt(pArr[0]), p2 = resolvePt(pArr[1]), p3 = resolvePt(pArr[2]);
          if (p1 && p2 && p3) {
            const sh = addShapeRec('arc3', [p1.id, p2.id, p3.id], {
              dashed: !!op.dashed,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth,
              aux: !!op.aux
            });
            const st = makeStepForShape(sh.id, stepLabel || `Cung qua ${p1.label}, ${p2.label}, ${p3.label}`, !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `arc3_${p1.label}${p2.label}${p3.label}`), st);
          }
          break;
        }
        case 'cone':
        case 'cylinder':
        case 'sphere':
        case 'frustumCone':
        case 'frustumcone':
        case 'frustum_cone': {
          const kindName = (op.op === 'frustumcone' || op.op === 'frustum_cone') ? 'frustumCone' : op.op;
          const minPts = kindName === 'sphere' ? 2 : (kindName === 'frustumCone' ? 4 : 3);
          const resolved = (Array.isArray(op.pts) ? op.pts : []).map(sym => resolvePt(sym)).filter(Boolean);
          if (resolved.length >= minPts) {
            const sh = addShapeRec(kindName, resolved.slice(0, minPts).map(p => p.id), {
              fill: op.fill,
              color: op.color,
              width: op.width,
              explicitColor: !!op.explicitColor,
              explicitWidth: !!op.explicitWidth
            });
            const kindVi = kindName === 'cone' ? 'Hình nón' : (kindName === 'cylinder' ? 'Hình trụ' : (kindName === 'sphere' ? 'Mặt cầu' : 'Hình nón cụt'));
            const st = makeStepForShape(sh.id, stepLabel || `Dựng ${kindVi}`, !!op.tempHide, mMeta);
            rawSteps.push(st);
            recordSymStep(cleanRef(op.id || `${kindName}_${resolved[0].label}`), st);
          }
          break;
        }
      }
    }

    if (!pts.length) {
      throw new Error('Không dựng được điểm nào từ dữ liệu AI.');
    }

    // Post-compile Connectivity & True 3D Visibility Healer
    const healCoords = evalCurrentCoords();
    const healHullIds = planIs3D ? computeSkeletonHullIds(healCoords) : [];
    const healHullCoords = healHullIds.map(id => healCoords.get(id)).filter(Boolean);
    const healVisModel = planIs3D ? build3DFaceVisibilityModel(healCoords) : null;
    const ptObjMap = Object.fromEntries(pts.map(p => [p.id, p]));

    const insertStepNearPoint = (ptId, stepObj) => {
      const idx = rawSteps.findIndex(st => st.kind === 'point' && st.refId === ptId);
      if (idx >= 0) rawSteps.splice(idx, 0, stepObj);
      else rawSteps.push(stepObj);
    };

    const connectLineToPointIfMissing = (pt, aId, bId) => {
      if (pt._noAutoConnect) return;
      const paObj = ptObjMap[aId], pbObj = ptObjMap[bId];
      if ((!paObj || !paObj.show) && (!pbObj || !pbObj.show)) return;
      if (isLineCoveredByShapes(pt.id, aId, bId, healCoords)) return;
      const ca = healCoords.get(aId), cb = healCoords.get(bId), cp = healCoords.get(pt.id);
      if (!ca || !cb || !cp) return;
      const proj = pointSegProj(cp, ca, cb);
      const abDrawn = !!findEdge(aId, bId);
      let anchorId;
      if (paObj && paObj.show && (!pbObj || !pbObj.show)) anchorId = aId;
      else if (pbObj && pbObj.show && (!paObj || !paObj.show)) anchorId = bId;
      else if (!abDrawn && proj && proj.k > 1.02) anchorId = aId;
      else if (!abDrawn && proj && proj.k < -0.02) anchorId = bId;
      else anchorId = dist2D(ca, cp) <= dist2D(cb, cp) ? aId : bId;
      if (anchorId === pt.id || findEdge(anchorId, pt.id)) return;
      const existingLine = findEdge(aId, bId);
      const segDashed = planIs3D
        ? classify3DSegmentDashed(anchorId, pt.id, healCoords, healVisModel)
        : !!(existingLine ? existingLine.dashed : true);
      const anchorPt = ptObjMap[anchorId];
      const sh = addShapeRec('segment', [anchorId, pt.id], { dashed: segDashed, aux: true });
      insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Nối ${anchorPt ? anchorPt.label : ''}${pt.label}`, false, defaultFx ? { effect: defaultFx } : null));
    };

    for (const pt of pts) {
      if (!pt || !pt.show || !pt.def) continue;
      if (pt.def.t === 'inter' && !pt.def.c1 && !pt.def.c2 && Array.isArray(pt.def.l1) && Array.isArray(pt.def.l2)) {
        connectLineToPointIfMissing(pt, pt.def.l1[0], pt.def.l1[1]);
        connectLineToPointIfMissing(pt, pt.def.l2[0], pt.def.l2[1]);
      } else if (pt.def.t === 'foot' && pt.def.p && pt.def.a && pt.def.b) {
        if (!findEdge(pt.def.p, pt.id)) {
          const dropDash = planIs3D ? classify3DSegmentDashed(pt.def.p, pt.id, healCoords, healVisModel) : false;
          const sh = addShapeRec('segment', [pt.def.p, pt.id], { dashed: dropDash, aux: true });
          insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Hạ ${ptObjMap[pt.def.p]?.label || ''}${pt.label} vuông góc`, false, defaultFx ? { effect: defaultFx } : null));
        }
        connectLineToPointIfMissing(pt, pt.def.a, pt.def.b);
      } else if ((pt.def.t === 'mid' || (pt.def.t === 'on' && pt.def.seg)) && pt.def.a && pt.def.b) {
        if (!isLineCoveredByShapes(pt.id, pt.def.a, pt.def.b, healCoords) && !findEdge(pt.def.a, pt.def.b)) {
          const segDash = planIs3D ? classify3DSegmentDashed(pt.def.a, pt.def.b, healCoords, healVisModel) : false;
          const sh = addShapeRec('segment', [pt.def.a, pt.def.b], { dashed: segDash });
          insertStepNearPoint(pt.id, makeStepForShape(sh.id, `Nối ${ptObjMap[pt.def.a]?.label || ''}${ptObjMap[pt.def.b]?.label || ''}`, false, defaultFx ? { effect: defaultFx } : null));
        }
      } else if (pt.def.t === 'on' && !pt.def.seg && pt.def.a && pt.def.b) {
        connectLineToPointIfMissing(pt, pt.def.a, pt.def.b);
      }
    }

    // Heal blatantly wrong 3D dashed/solid flags on non-skeleton chords (e.g. front-face BM/MN/MI or interior/back AC/BD/SO/AM/BK/AI)
    if (planIs3D && healVisModel && healVisModel.valid && healHullCoords.length >= 3) {
      for (const sh of shapes) {
        if (!sh || sh.hidden || sh.kind !== 'segment' || !Array.isArray(sh.pts) || sh.pts.length < 2) continue;
        const [u, v] = sh.pts;
        const eKey = u < v ? `${u}|${v}` : `${v}|${u}`;
        const cu = healCoords.get(u), cv = healCoords.get(v);
        if (!cu || !cv || isFlatSeg(u, v)) continue;
        if (isSegmentOnHullBoundary(cu, cv, healHullCoords)) {
          sh.dashed = false;
          continue;
        }
        if (healVisModel.skeletonEdgeKeys.has(eKey) && sh._explicitDashed !== undefined) {
          continue; // Respect explicit view-defining base/lateral skeleton edges
        }
        const midC = { x: (cu.x + cv.x) * 0.5, y: (cu.y + cv.y) * 0.5 };
        if (pointInHull(midC, healHullCoords)) {
          sh.dashed = classify3DSegmentDashed(u, v, healCoords, healVisModel);
        }
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
    const expandBox = (bx, by) => {
      if (!Number.isFinite(bx) || !Number.isFinite(by)) return;
      if (bx < x0) x0 = bx;
      if (bx > x1) x1 = bx;
      if (by < y0) y0 = by;
      if (by > y1) y1 = by;
    };
    for (const p of pts) {
      if (!p.show) continue;
      const c = coords.get(p.id);
      if (!c) continue;
      expandBox(c.x, c.y);
    }
    for (const sh of shapes) {
      if (!sh || sh.hidden || !Array.isArray(sh.pts) || sh.pts.length < 2) continue;
      if (sh.kind === 'circle' || sh.kind === 'sphere' || sh.kind === 'cone' || sh.kind === 'cylinder' || sh.kind === 'frustumCone') {
        const co = coords.get(sh.pts[0]), cr = coords.get(sh.pts[1]);
        if (co && cr) {
          const rad = dist2D(co, cr);
          const ry = (sh.kind === 'circle' || sh.kind === 'sphere') ? rad : rad * 0.35;
          expandBox(co.x - rad, co.y - ry);
          expandBox(co.x + rad, co.y + ry);
        }
        if (sh.kind === 'frustumCone' && sh.pts.length >= 4) {
          const co2 = coords.get(sh.pts[2]), cr2 = coords.get(sh.pts[3]);
          if (co2 && cr2) {
            const rad2 = dist2D(co2, cr2);
            expandBox(co2.x - rad2, co2.y - rad2 * 0.35);
            expandBox(co2.x + rad2, co2.y + rad2 * 0.35);
          }
        }
      }
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
    const preset = modalState.motionPreset || 'domiinh';
    const derivedFx = presetDefaultEffect(preset);
    if (!rootEl) {
      return {
        preset,
        defaultEffect: derivedFx,
        handPen: true,
        followCamera: false,
        orbit3d: preset === '3d_standard',
        loop: true
      };
    }
    const fxSel = rootEl.querySelector('#mn-ag-default-effect');
    const handChk = rootEl.querySelector('#mn-ag-opt-handpen');
    const camChk = rootEl.querySelector('#mn-ag-opt-camera');
    const orbChk = rootEl.querySelector('#mn-ag-opt-orbit3d');
    const loopChk = rootEl.querySelector('#mn-ag-opt-loop');
    return {
      preset,
      defaultEffect: (fxSel && fxSel.value) || derivedFx,
      handPen: handChk ? !!handChk.checked : true,
      followCamera: camChk ? !!camChk.checked : false,
      orbit3d: orbChk ? !!orbChk.checked : (preset === '3d_standard'),
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
              <div class="mn-ag-sub">Dựng hình ràng buộc động · Nạp TikZ · Nhập &amp; lưu chuẩn JSON</div>
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
          <button type="button" class="mn-ag-tab" id="mn-ag-tab-json" data-ag-tab="json">📦 Nạp / Lưu JSON</button>
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

          <!-- TAB 3: NẠP / LƯU JSON CHUẨN DUY NHẤT (mn-geo-motion/2.0) -->
          <div id="mn-ag-pane-json" style="display:none;flex-direction:column;gap:9px;">
            <div class="mn-ag-prompt-helper-card">
              <div class="mn-ag-helper-caption">Bước 1 (nếu tạo từ AI ngoài): Chép Prompt dựng hình chi tiết rồi dán kết quả JSON vào ô dưới</div>
              <div class="mn-ag-export-grid">
                <button type="button" class="mn-ag-export-btn accent" id="mn-ag-copy-prompt" title="Chép Prompt hướng dẫn đầy đủ 20 công cụ dựng hình MinNote để dán vào ChatGPT, Claude, Gemini, DeepSeek">📋 Chép Prompt Dựng Hình Chi Tiết</button>
                <button type="button" class="mn-ag-export-btn" id="mn-ag-toggle-prompt-view" aria-expanded="false" title="Xem trực tiếp nội dung Prompt hướng dẫn ngay trong hộp thoại">👁 Xem nội dung Prompt</button>
              </div>
              <div id="mn-ag-prompt-preview-box" style="display:none;">
                <textarea id="mn-ag-prompt-preview-ta" class="mn-ag-textarea mono" readonly spellcheck="false"></textarea>
              </div>
            </div>

            <div class="mn-ag-json-toolbar">
              <div class="mn-ag-json-toolbar-left">
                <input type="file" id="mn-ag-json-file" accept=".json,.betatikz.json,application/json,text/plain" style="display:none;" />
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-btn-load-json" title="Chọn tệp .json từ máy">📂 Mở tệp .json</button>
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-btn-save-json" title="Lưu hình học trên bảng hiện tại ra tệp .json chuẩn mn-geo-motion/2.0">💾 Lưu bảng ra .json</button>
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-export-full" title="Xuất hình học trên bảng hiện tại ra chuẩn JSON mn-geo-motion/2.0 và chép vào Clipboard">📋 Chép JSON từ bảng</button>
              </div>
              <div class="mn-ag-json-toolbar-right">
                <button type="button" class="mn-ag-mini-btn" id="mn-ag-btn-clear-json" title="Xóa nội dung ô JSON">⌫ Xóa</button>
              </div>
            </div>

            <textarea id="mn-ag-json-input" class="mn-ag-textarea json-io" spellcheck="false" placeholder="Dán khối JSON từ AI hoặc kéo thả tệp .json vào đây..."></textarea>

            <div class="mn-ag-stats" id="mn-ag-json-stats">
              <span class="mn-ag-stat-pill">Tự động kiểm chứng &amp; sửa lỗi ràng buộc chuẩn mn-geo-motion/2.0</span>
            </div>

            <div class="mn-ag-motion-box compact" id="mn-ag-motion-controls">
              <div class="mn-ag-motion-inline-left">
                <span class="mn-ag-motion-lbl">Phong cách:</span>
                <div class="mn-ag-preset-group" id="mn-ag-motion-presets">
                  <button type="button" class="mn-ag-preset-chip active" data-ag-preset="domiinh">✨ Đỗ Miinh</button>
                  <button type="button" class="mn-ag-preset-chip" data-ag-preset="manim">🎬 Manim</button>
                  <button type="button" class="mn-ag-preset-chip" data-ag-preset="3d_standard">🧊 3D Chuẩn</button>
                </div>
              </div>
              <label class="mn-ag-check">
                <input type="checkbox" id="mn-ag-json-animate" checked />
                <span>Diễn hoạt từng nét</span>
              </label>
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
          <button type="button" class="mn-ag-btn primary" id="mn-ag-run-json">🚀 Dựng Hình Lên Bảng</button>
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

    const refreshPromptPreviewIfOpen = () => {
      const prevBox = bd.querySelector('#mn-ag-prompt-preview-box');
      const prevTa = bd.querySelector('#mn-ag-prompt-preview-ta');
      if (!prevBox || !prevTa || prevBox.style.display === 'none') return;
      const promptTa = bd.querySelector('#mn-ag-prompt');
      const probTxt = promptTa ? promptTa.value : '';
      prevTa.value = buildDetailedExternalPrompt(probTxt, getModalMotionControls(bd));
    };

    const promptMainTa = bd.querySelector('#mn-ag-prompt');
    if (promptMainTa) {
      promptMainTa.addEventListener('input', refreshPromptPreviewIfOpen);
    }

    bd.querySelectorAll('[data-ag-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.agPreset || 'domiinh';
        modalState.motionPreset = p;
        modalState.defaultEffect = presetDefaultEffect(p);
        bd.querySelectorAll('[data-ag-preset]').forEach(x => x.classList.toggle('active', x === btn));
        refreshPromptPreviewIfOpen();
        if ((jsonTa.value || '').trim()) updateJsonPreviewStats();
      });
    });

    // Step 1: External AI Prompt Copy & Inline Read-Only Preview
    bd.querySelector('#mn-ag-copy-prompt').addEventListener('click', async () => {
      setError('');
      const promptTa = bd.querySelector('#mn-ag-prompt');
      const probTxt = promptTa ? promptTa.value : '';
      const mCtrl = getModalMotionControls(bd);
      const readyPrompt = buildDetailedExternalPrompt(probTxt, mCtrl);
      refreshPromptPreviewIfOpen();
      await copyTextSafe(readyPrompt);
      showAppToast('📋 Đã chép Prompt Dựng Hình Chi Tiết! Hãy dán vào ChatGPT/Claude/Gemini/DeepSeek rồi dán khối JSON trả về vào ô dưới.', 'success');
    });

    const togglePromptBtn = bd.querySelector('#mn-ag-toggle-prompt-view');
    const promptPreviewBox = bd.querySelector('#mn-ag-prompt-preview-box');
    const promptPreviewTa = bd.querySelector('#mn-ag-prompt-preview-ta');
    if (togglePromptBtn && promptPreviewBox && promptPreviewTa) {
      togglePromptBtn.addEventListener('click', () => {
        setError('');
        const isHidden = promptPreviewBox.style.display === 'none';
        if (isHidden) {
          const promptTa = bd.querySelector('#mn-ag-prompt');
          const probTxt = promptTa ? promptTa.value : '';
          promptPreviewTa.value = buildDetailedExternalPrompt(probTxt, getModalMotionControls(bd));
          promptPreviewBox.style.display = 'flex';
          togglePromptBtn.setAttribute('aria-expanded', 'true');
          togglePromptBtn.classList.add('active');
          togglePromptBtn.textContent = '🙈 Ẩn nội dung Prompt';
        } else {
          promptPreviewBox.style.display = 'none';
          togglePromptBtn.setAttribute('aria-expanded', 'false');
          togglePromptBtn.classList.remove('active');
          togglePromptBtn.textContent = '👁 Xem nội dung Prompt';
        }
      });
    }

    // Step 2: Canonical Board JSON Copy & Save (.json)
    bd.querySelector('#mn-ag-export-full').addEventListener('click', async () => {
      await handleExportMotionJson(bd, false);
    });

    bd.querySelector('#mn-ag-btn-save-json').addEventListener('click', async () => {
      await handleExportMotionJson(bd, true);
    });

    // Primary Run Buttons across 3 Tabs
    const shouldAnimateJson = () => {
      const animChk = bd.querySelector('#mn-ag-json-animate');
      return animChk ? !!animChk.checked : true;
    };
    bd.querySelector('#mn-ag-run-ai').addEventListener('click', runAiConstruction);
    bd.querySelector('#mn-ag-run-tikz').addEventListener('click', () => runTikzImport(true));
    bd.querySelector('#mn-ag-insert-tikz-now').addEventListener('click', () => runTikzImport(false));
    bd.querySelector('#mn-ag-run-json').addEventListener('click', () => runJsonImport(shouldAnimateJson()));
    bd.querySelector('#mn-ag-insert-json-now').addEventListener('click', () => runJsonImport(false));

    return bd;
  }

  function exportBoardCanonicalJsonObject(bd) {
    const mCtrl = getModalMotionControls(bd);
    if (hasWindow && window.MinNoteMotionBridge && typeof window.MinNoteMotionBridge.exportMotionJson === 'function') {
      const exported = window.MinNoteMotionBridge.exportMotionJson({
        mode: 'full',
        includeExports: false,
        preset: mCtrl.preset,
        defaultEffect: mCtrl.defaultEffect,
        handPen: mCtrl.handPen,
        followCamera: mCtrl.followCamera,
        orbit3d: mCtrl.orbit3d,
        loop: mCtrl.loop
      });
      if (exported && typeof exported === 'object') {
        const cleanObj = { ...exported };
        delete cleanObj.exports;
        return cleanObj;
      }
      if (typeof exported === 'string' && exported.trim()) {
        const parsed = JSON.parse(exported);
        if (parsed && typeof parsed === 'object') delete parsed.exports;
        return parsed;
      }
    }

    // Clean local fallback reading current board geometry
    const b = getBoard();
    const pageIdx = b && typeof b.currentPage === 'function' ? b.currentPage() : 0;
    const pg = b && b.doc && Array.isArray(b.doc.pages) ? b.doc.pages[pageIdx] : null;
    if (!pg || !pg.geo || !Object.keys(pg.geo.points || {}).length) {
      return null;
    }
    const ops = convertGeometryBlockToOps({
      points: Object.values(pg.geo.points || {}),
      shapes: pg.geo.shapes || []
    });
    return {
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

  async function saveJsonFileToDisk(jsonText, titleHint) {
    const slug = String(titleHint || 'hinh_minnote')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'hinh_minnote';
    const fileName = `${slug}.json`;

    if (hasWindow && window.MinNoteMeaSync && typeof window.MinNoteMeaSync.isDesktopBridge === 'function' && window.MinNoteMeaSync.isDesktopBridge()) {
      try {
        const res = await window.MinNoteMeaSync.request('SAVE_MEDIA_FILE', {
          fileName,
          ext: '.json',
          textData: jsonText
        });
        if (res) {
          if (!res.cancelled) {
            showAppToast(`💾 Đã lưu tệp "${res.fileName || fileName}" và chép vào Clipboard!`, 'success');
          }
          return res;
        }
      } catch {}
    }

    if (hasDoc) {
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showAppToast(`💾 Đã lưu tệp "${fileName}" và chép vào Clipboard!`, 'success');
    }
    return { fileName };
  }

  async function handleExportMotionJson(bd, saveToDisk = false) {
    setError('');
    const jsonTa = bd.querySelector('#mn-ag-json-input');

    try {
      let exported = exportBoardCanonicalJsonObject(bd);
      if (!exported && saveToDisk && jsonTa) {
        const curRaw = (jsonTa.value || '').trim();
        if (curRaw && !isPastedPromptText(curRaw)) {
          const healed = validateAndHealAiGeoPlan(curRaw, getModalMotionControls(bd));
          const cleanCopy = { ...healed };
          delete cleanCopy.healReport;
          if (!cleanCopy.schema) cleanCopy.schema = 'mn-geo-motion/2.0';
          exported = cleanCopy;
        }
      }

      if (!exported) {
        throw new Error('Trên trang hiện tại chưa có đối tượng hình học nào để xuất ra JSON.');
      }

      const jsonText = JSON.stringify(exported, null, 2);
      if (jsonTa) {
        jsonTa.value = jsonText;
        updateJsonPreviewStats();
      }
      await copyTextSafe(jsonText);

      if (saveToDisk) {
        const titleHint = (exported.meta && exported.meta.title) || exported.title || 'hinh_minnote';
        await saveJsonFileToDisk(jsonText, titleHint);
      } else {
        showAppToast('📋 Đã chép JSON chuẩn (mn-geo-motion/2.0) từ bảng vào Clipboard!', 'success');
      }
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
      statsEl.innerHTML = '<span class="mn-ag-stat-pill">Tự động kiểm chứng &amp; sửa lỗi ràng buộc chuẩn mn-geo-motion/2.0</span>';
      return;
    }

    if (isPastedPromptText(raw)) {
      statsEl.innerHTML = '<span class="mn-ag-stat-pill info">ℹ Đây là nội dung Prompt mẫu — hãy dán vào ChatGPT/Claude/Gemini rồi chép khối JSON kết quả dán lại vào ô này.</span>';
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
      const schemaTag = (parsed && parsed.schema) ? String(parsed.schema) : 'mn-geo-motion/2.0';
      const pills = [
        `<span class="mn-ag-stat-pill ok">✓ ${schemaTag}</span>`,
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
      setError('Vui lòng dán khối JSON dựng hình hoặc chọn tệp .json trước khi dựng lên bảng.');
      return;
    }
    if (isPastedPromptText(raw)) {
      setError('Ô nhập đang chứa nội dung Prompt hướng dẫn. Hãy gửi Prompt này cho AI (ChatGPT/Claude/Gemini) rồi dán kết quả JSON trả về vào đây.');
      updateJsonPreviewStats();
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
          launchReplay: !!animate,
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
        ? 'Hãy dựng thêm các điểm, giao tuyến, giao điểm, góc vuông chính phục vụ các câu hỏi / mệnh đề a, b, c, d (nếu đề bài hoặc bảng Đúng/Sai có). Ưu tiên tối đa lệnh gộp gọn ("pyramid", "prism", "segments", "tangents_from_point", "circumcircle", "incircle", cặp "A-C", bỏ "label" trùng "id") để mảng "ops" chỉ khoảng 8–18 lệnh gọn sạch.'
        : 'Chỉ dựng các yếu tố trong giả thiết chính của đề bài (chưa cần dựng nét phụ của các câu hỏi a, b, c, d). Ưu tiên dùng lệnh gộp ("pyramid", "prism", "segments", cặp "A-C", bỏ "label" trùng "id") để JSON ngắn gọn nhất.',
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
    buildDetailedExternalPrompt,
    buildCompactExternalPrompt,
    parseMathNumber,
    sanitizeLlmJsonText,
    extractJsonObject,
    expandCompactAiGeoMacros,
    simulatePlanCoords,
    convertGeometryBlockToOps,
    validateAndHealAiGeoPlan,
    buildDetailedExternalPrompt,
    getSystemPrompt: () => AI_GEO_SYSTEM_PROMPT,
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
        else if (modalState.tab === 'json') {
          const bd = document.getElementById('mn-ai-geo-backdrop');
          const animChk = bd && bd.querySelector('#mn-ag-json-animate');
          runJsonImport(animChk ? !!animChk.checked : true);
        }
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
