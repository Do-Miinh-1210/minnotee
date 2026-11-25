# 04 — Dịch Ngược Mã TikZ / `tkz-euclide` / BetaTikz / Manim Sang Chuẩn `mn-geo-motion/2.0`

Trong các kho tài liệu LaTeX và đề thi THPT hiện có, phần lớn hình vẽ TikZ đang ở dạng **tọa độ số cứng rời rạc** (ví dụ `\coordinate (M) at (0.75, 1.05);` thay vì trung điểm thật của $SC$). Khi nạp trực tiếp hình tọa độ chết, nếu giáo viên nắm kéo đỉnh $S$, điểm $M$ sẽ đứng yên làm gãy toàn bộ hình!

Tài liệu này cung cấp **Prompt Dịch Ngược & Nâng Cấp Ràng Buộc (Constraint Decompiler Prompt)** giúp AI đọc mã TikZ tĩnh, `tkz-euclide`, mã động `out_tikz` của BetaTikz hoặc script Python `Manim` để tái thiết lập **đồ thị ràng buộc hình học thật (`mn-geo-motion/2.0`)** kèm kịch bản diễn hoạt từng nét cho MinNote.

---

## 1. Quy Tắc Nâng Cấp "Tọa Độ Chết" Thành "Ràng Buộc Sống"

Khi đọc mã nguồn đầu vào, AI phải thực hiện **5 phép suy diễn nâng cấp ràng buộc**:

| Dấu hiệu trong mã TikZ / `tkz-euclide` / Manim | CẤM dịch thô sang | BẮT BUỘC nâng cấp thành `ops` chuẩn |
| :--- | :--- | :--- |
| `\coordinate (M) at ($(S)!0.5!(C)$);` hoặc `\tkzDefMidPoint(S,C)\tkzGetPoint{M}` hoặc tọa độ số $M = \frac{S+C}{2}$ (sai số $< 0.02$) | `point_free` tại `(0.75, 1.05)` | `{"op": "midpoint", "id": "M", "a": "S", "b": "C"}` |
| `\coordinate (N) at ($(S)!0.35!(D)$);` hoặc điểm $N$ nằm thẳng hàng giữa $S, D$ và có cạnh $SD$ đi qua | `point_free` rời rạc | `{"op": "point_on_segment", "id": "N", "a": "S", "b": "D", "ratio": 0.35}` |
| `\coordinate (C) at ($(B)+(D)-(A)$);` hoặc 4 đỉnh đáy thỏa $\vec{AB} = \vec{DC}$ | 4 lệnh `point_free` độc lập | `{"op": "point_sum", "id": "C", "a": "B", "b": "D", "c": "A"}` |
| `\tkzInterLL(A,C)(B,D)\tkzGetPoint{O}` hoặc `(intersection of A--C and B--D)` hoặc $O$ nằm đồng thời trên cả hai đoạn $AC$ và $BD$ | `point_free` tại giao điểm xấp xỉ | `{"op": "intersection_ll", "id": "O", "l1": ["A", "C"], "l2": ["B", "D"]}` |
| `\tkzDefPointBy[projection=onto S--B](A)` hoặc `($(S)!(A)!(B)$)` hoặc có `right angle=A--H--B` với $H \in SB$ | `point_free` + vẽ ô vuông rời | `{"op": "foot_perp", "id": "H", "p": "A", "a": "S", "b": "B", "markRightAngle": true}` |
| Mã BetaTikz có `\pgfmathsetmacro{\pSO}{smoothstep(clp(\tval, 0.42, 0.52))}` hoặc `bump(...)` | Bỏ mất thông tin thời gian & hiệu ứng | Giữ nguyên `"tRange": [0.42, 0.52]` và ánh xạ `bump` $\to$ `"glow"` / `"pulse"`, `appear` trên `fill` $\to$ `"fade"`. |

---

## 2. System + User Prompt Dịch Ngược Chuẩn

Sao chép khối dưới đây khi muốn chuyển mã LaTeX/TikZ hoặc Manim sang JSON `mn-geo-motion/2.0`:

```text
Bạn là Kỹ sư Dịch ngược Ràng buộc Hình học (Geometry Constraint Decompiler) của MinNote.
Nhiệm vụ: Phân tích đoạn mã nguồn hình học đầu vào (TikZ tĩnh, tkz-euclide, BetaTikz out_tikz, hoặc Python Manim) và chuyển đổi thành DUY NHẤT 1 đối tượng JSON chuẩn "mn-geo-motion/2.0" có đầy đủ ràng buộc động và kịch bản hiệu ứng.

QUY TRÌNH XỬ LÝ 4 BƯỚC BẮT BUỘC:
1. Chuẩn hóa hệ tọa độ gốc:
   - Giữ hệ trục toán học (+x sang phải, +y hướng LÊN TRÊN). Nếu mã TikZ dùng tọa độ 3D dạng "(x, y, z)" hoặc "tdplot_main_coords", hãy chiếu sang tọa độ phẳng 2D chuẩn cavalier/orthographic: X_2d = x - 0.5*y, Y_2d = z - 0.35*y (đảm bảo đỉnh cao S hoặc A' có Y_2d lớn hơn đáy) và đặt "is3D": true.
   - Đánh giá mọi biểu thức lượng giác/căn thức trong TikZ (như "{2*cos(60)}", "{sqrt(3)}") ra số thập phân JSON chính xác tới 4 chữ số (VD: 1.0, 1.7321).
2. Khôi phục tối đa ràng buộc hình học (CẤM dùng point_free cho điểm phụ thuộc!):
   - Kiểm tra từng điểm P:
     * Nếu P = B + D - A (đỉnh thứ 4 hình bình hành / đỉnh lăng trụ): đổi sang "point_sum".
     * Nếu P nằm chính giữa đoạn AB (|P - (A+B)/2| < 0.02): đổi sang "midpoint".
     * Nếu P là chân đường vuông góc từ Q xuống AB (có kí hiệu góc vuông tại P hoặc biểu thức chiếu $(A)!(Q)!(B)$): đổi sang "foot_perp".
     * Nếu P là giao điểm của 2 đường thẳng đã vẽ AC và BD: đổi sang "intersection_ll".
     * Nếu P là giao của đường thẳng và đường tròn: đổi sang "intersection_lc".
     * Nếu P nằm bên trong đoạn thẳng AB với tỉ lệ k in (0.05, 0.95): đổi sang "point_on_segment" với "ratio": k.
   - Sắp xếp mảng "ops" theo đúng thứ tự phụ thuộc tô-pô (mọi điểm cha được tạo trước điểm con, điểm tạo trước đoạn nối).
3. Chuyển đổi thuộc tính nét & kí hiệu:
   - Các lệnh \draw[dashed], [densely dashed], [dotted], [vid construct] -> "dashed": true.
   - Các lệnh \draw (A)--(B)--(C)--cycle có xen lẫn nét đứt và nét liền -> tách thành từng lệnh "segment" riêng biệt đúng trạng thái "dashed" của từng cạnh!
   - Các lệnh \fill[color, opacity=...] (A)--(B)--(C)--cycle -> "polygon_fill" với màu "rgba(r, g, b, alpha)" và "explicitColor": true.
   - Các lệnh \tkzMarkRightAngle(A,H,B) hoặc pic{right angle=A--H--B} -> {"op":"right_angle","a":"A","v":"H","b":"B","aux":true} (chú ý đỉnh vuông H nằm ở "v").
   - Các lệnh \tkzMarkSegments / kí hiệu bằng nhau -> "tick_mark"; cung góc -> "angle_mark".
4. Khôi phục hoặc tổng hợp kịch bản chuyển động ("motion"):
   - Nếu mã nguồn là BetaTikz (có \tval, clp, appear, smoothstep, bump) hoặc Manim (Create, FadeIn, Indicate, Flash): giữ nguyên thứ tự xuất hiện, khoảng "tRange": [t0, t1], và ánh xạ sang effect tương ứng ("chalk"/"draw", "fade", "glow", "pulse", "pop").
   - Nếu mã nguồn là TikZ tĩnh (thường viết lệnh \fill và \draw[dashed] ở đầu để xếp lớp vẽ): HÃY SẮP XẾP LẠI thứ tự sư phạm tự nhiên (Đỉnh/cạnh khung chính -> Nét khuất đáy -> Điểm dẫn xuất/trung điểm -> Đường phụ/giao điểm -> Tô thiết diện & kí hiệu góc vuông cuối cùng!) và gán preset phù hợp ("domiinh" cho 3D, "manim" cho 2D).

Chỉ xuất DUY NHẤT 1 khối JSON hợp lệ chuẩn "mn-geo-motion/2.0", không giải thích ngoài JSON.

MÃ NGUỒN ĐẦU VÀO:
"""
{{DAN_MA_TIKZ_TKZ_EUCLIDE_HOAC_MANIM_O_DAY}}
"""
```

---

## 3. Ví Dụ Minh Họa Dịch Ngược Nhanh

### Đầu vào (`tkz-euclide` tĩnh có tọa độ & lệnh lộn xộn)
```latex
\begin{tikzpicture}
  \tkzDefPoint(0,0){A}
  \tkzDefPoint(4,0){C}
  \tkzDefPoint(1.2,-1.6){B}
  \tkzDefPoint(0,3.2){S}
  \tkzDefMidPoint(B,C)\tkzGetPoint{M}
  \tkzDefPointBy[projection=onto S--M](A)\tkzGetPoint{H}
  \tkzDrawSegments[dashed](A,C A,M A,H)
  \tkzDrawSegments(S,A S,B S,C A,B B,C S,M)
  \tkzMarkRightAngles(S,A,B S,A,C A,H,M)
  \tkzDrawPoints(S,A,B,C,M,H)
  \tkzLabelPoints[below](A,B,C,M)
  \tkzLabelPoints[above](S)
  \tkzLabelPoints[right](H)
\end{tikzpicture}
```

### Đầu ra JSON `mn-geo-motion/2.0` (Đã khóa ràng buộc & sắp lại thứ tự giảng bài)
```json
{
  "schema": "mn-geo-motion/2.0",
  "title": "Chóp S.ABC có SA vuông góc đáy & Khoảng cách AH tới (SBC)",
  "is3D": true,
  "meta": {
    "title": "Chóp S.ABC có SA vuông góc đáy & Khoảng cách AH tới (SBC)",
    "is3D": true,
    "spaceType": "solid_3d"
  },
  "ops": [
    { "op": "point_free", "id": "A", "label": "A", "x": 0.0, "y": 0.0, "effect": "pop", "step": "Đặt đỉnh góc vuông A" },
    { "op": "point_free", "id": "B", "label": "B", "x": 1.2, "y": -1.6, "effect": "pop", "step": "Đặt đỉnh đáy B" },
    { "op": "point_free", "id": "C", "label": "C", "x": 4.0, "y": 0.0, "effect": "pop", "step": "Đặt đỉnh đáy C" },
    { "op": "segment", "a": "A", "b": "B", "dashed": false, "effect": "chalk", "step": "Cạnh đáy trước AB" },
    { "op": "segment", "a": "B", "b": "C", "dashed": false, "effect": "chalk", "step": "Cạnh đáy trước BC" },
    { "op": "segment", "a": "A", "b": "C", "dashed": true, "effect": "draw", "step": "Cạnh đáy khuất AC" },
    { "op": "point_free", "id": "S", "label": "S", "x": 0.0, "y": 3.2, "effect": "pop", "step": "Đỉnh S trên đường vuông góc tại A" },
    { "op": "segment", "a": "S", "b": "A", "dashed": false, "effect": "chalk", "step": "Đường cao SA ⊥ (ABC)" },
    { "op": "segment", "a": "S", "b": "B", "dashed": false, "effect": "chalk", "step": "Cạnh bên SB" },
    { "op": "segment", "a": "S", "b": "C", "dashed": false, "effect": "chalk", "step": "Cạnh bên SC" },
    { "op": "right_angle", "a": "S", "v": "A", "b": "B", "aux": true, "effect": "fade", "step": "Góc vuông SA ⊥ AB" },
    { "op": "right_angle", "a": "S", "v": "A", "b": "C", "aux": true, "effect": "fade", "step": "Góc vuông SA ⊥ AC" },
    { "op": "midpoint", "id": "M", "label": "M", "a": "B", "b": "C", "effect": "pop", "step": "Gọi M là trung điểm BC" },
    { "op": "segment", "a": "A", "b": "M", "dashed": true, "aux": true, "effect": "draw", "step": "Kẻ trung tuyến đáy AM (nét đứt)" },
    { "op": "segment", "a": "S", "b": "M", "dashed": false, "aux": true, "effect": "chalk", "step": "Nối SM trên mặt bên (SBC)" },
    { "op": "foot_perp", "id": "H", "label": "H", "p": "A", "a": "S", "b": "M", "drawDropSegment": true, "dashed": true, "markRightAngle": true, "aux": true, "effect": "glow", "durationMul": 1.3, "step": "Hạ AH ⊥ SM tại H (khoảng cách từ A đến (SBC))" }
  ],
  "motion": {
    "preset": "domiinh",
    "fps": 24,
    "durationSec": 8.5,
    "loop": true,
    "handPen": true,
    "followCamera": true,
    "orbit3d": false
  }
}
```

> [!TIP]
> Với các đoạn mã TikZ đơn giản không cần đổi thứ tự sư phạm bằng AI, bạn cũng có thể dán thẳng vào **Tab 2 (`📐 Nạp TikZ Chuẩn`)** của hộp thoại MinNote AI Dựng Hình: hàm nội bộ `window.__mnRefineTikzConstraints` sẽ tự động quét hình học phẳng và khóa điểm vào đoạn/trung điểm/giao điểm ngay lập tức hoàn toàn offline!
