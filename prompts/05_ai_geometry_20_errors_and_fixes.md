# 05 — Cẩm Nang Kỹ Thuật: 20 Lỗi Kinh Điển Của AI Khi Dựng Hình Toán Học & Cách Khắc Phục Chuẩn `mn-geo-motion/2.0`

Tài liệu này tổng hợp **20 lỗi hình học, đại số và diễn hoạt kinh điển nhất** mà các mô hình ngôn ngữ lớn (ChatGPT, Claude, Gemini, DeepSeek, Grok, Local LLM) thường mắc phải khi đọc đề Toán và sinh cấu trúc dựng hình. Mỗi lỗi đều được phân tích rõ **Triệu chứng**, **Nguyên nhân toán học**, **Ví dụ SAI**, và **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`** (đồng bộ với bộ tự chữa lỗi `validateAndHealAiGeoPlan` của MinNote).

---

## Nhóm I: Ràng Buộc Điểm & Tọa Độ Cơ Sở (Lỗi 01 – 05)

### Lỗi 01: Tứ giác đáy tự cắt kiểu "hình nơ" (`Bow-tie / Crossed Quadrilateral ABCD`)
- **Triệu chứng lỗi**: Đáy hình chóp $S.ABCD$ hoặc hình bình hành $ABCD$ bị vặn chéo thành hai tam giác đối đỉnh như chiếc nơ; hai cạnh bên $BC$ và $AD$ cắt nhau ngay giữa đáy.
- **Nguyên nhân toán học**: AI liệt kê 4 đỉnh tự do `A, B, C, D` theo thứ tự trái–phải trên mặt phẳng thay vì thứ tự đi vòng khép kín cùng chiều (hoặc ngược chiều) kim đồng hồ quanh tâm đa giác, hoặc áp sai công thức vectơ đỉnh thứ 4 ($C = A + B - D$ thay vì $C = B + D - A$ vì $\overrightarrow{AB} = \overrightarrow{DC} \iff C - D = B - A \iff C = B + D - A$).
- **Ví dụ SAI**:
  ```json
  [
    { "op": "point_free", "id": "A", "x": -2.2, "y": 0.0 },
    { "op": "point_free", "id": "B", "x": 2.6, "y": 0.0 },
    { "op": "point_free", "id": "C", "x": -3.6, "y": -1.8 },
    { "op": "point_free", "id": "D", "x": 1.2, "y": -1.8 },
    { "op": "connect_polygon", "pts": ["A", "B", "C", "D"] }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  [
    { "op": "point_free", "id": "A", "label": "A", "x": -2.2, "y": 0.0, "effect": "pop" },
    { "op": "point_free", "id": "D", "label": "D", "x": 2.6, "y": 0.0, "effect": "pop" },
    { "op": "point_free", "id": "B", "label": "B", "x": -3.6, "y": -1.8, "effect": "pop" },
    { "op": "point_sum", "id": "C", "label": "C", "a": "B", "b": "D", "c": "A", "effect": "pop", "step": "Dựng đỉnh C = B + D - A để ABCD là hình bình hành lồi" }
  ]
  ```

---

### Lỗi 02: Gán tọa độ chết `point_free` cho điểm dẫn xuất (trung điểm, giao điểm)
- **Triệu chứng lỗi**: Hình lúc mới chèn nhìn có vẻ đúng, nhưng ngay khi giáo viên nắm kéo đỉnh chóp $S$ hoặc đỉnh $A$ trên bảng MinNote để đổi góc nhìn, trung điểm $M$ và tâm $O$ đứng trơ tại chỗ làm đứt rời các cạnh!
- **Nguyên nhân toán học**: AI tự nhẩm trung bình cộng tọa độ ở nháp rồi xuất `"op": "point_free"` thay vì khai báo quan hệ phụ thuộc trên đồ thị có hướng không chu trình (DAG).
- **Ví dụ SAI**:
  ```json
  [
    { "op": "point_free", "id": "S", "x": -0.4, "y": 3.8 },
    { "op": "point_free", "id": "C", "x": 1.9, "y": -1.7 },
    { "op": "point_free", "id": "M", "x": 0.75, "y": 1.05, "step": "Trung điểm M của SC" }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  [
    { "op": "point_free", "id": "S", "label": "S", "x": -0.4, "y": 3.8, "effect": "pop" },
    { "op": "point_free", "id": "C", "label": "C", "x": 1.9, "y": -1.7, "effect": "pop" },
    { "op": "midpoint", "id": "M", "label": "M", "a": "S", "b": "C", "effect": "pop", "step": "Trung điểm M khóa cứng trên đoạn SC" }
  ]
  ```

---

### Lỗi 03: Bẫy "trung điểm giả" (`ratio: 0.5`) khi lấy điểm bất kỳ trên đoạn thẳng
- **Triệu chứng lỗi**: Đề bài ghi *"Lấy điểm $M$ bất kỳ trên cạnh $SC$, tìm giao điểm của $MN$ với mặt đáy (với $N$ là trung điểm $SD$)"*, nhưng trên hình vẽ $MN$ lại nằm ngang song song hệt với $CD$ nên không tài nào cắt được $CD$!
- **Nguyên nhân toán học**: Theo thói quen xác suất, khi chọn số trong khoảng $(0, 1)$, các LLM rất hay chọn `0.5`. Khi $M$ có `ratio: 0.5` và $N$ là trung điểm $SD$, định lý Thales biến $MN$ thành đường trung bình song song $CD$ ($\det = 0$), phá hỏng bài toán tìm giao điểm!
- **Ví dụ SAI**:
  ```json
  { "op": "point_on_segment", "id": "M", "label": "M", "a": "S", "b": "C", "ratio": 0.5, "step": "Lấy điểm M thuộc đoạn SC" }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  { "op": "point_on_segment", "id": "M", "label": "M", "a": "S", "b": "C", "ratio": 0.38, "effect": "pop", "step": "Lấy điểm M tổng quát trên SC (ratio != 0.5 để tránh song song giả)" }
  ```

---

### Lỗi 04: Phụ thuộc vòng (`Cyclic Dependency`) hoặc gọi điểm chưa khai báo (`Forward Reference`)
- **Triệu chứng lỗi**: Một số điểm không xuất hiện trên bảng hoặc bị rơi về gốc tọa độ `(0, 0)`.
- **Nguyên nhân toán học**: AI khai báo `O = intersection_ll(AC, BD)` ở đầu mảng `ops` trước khi khai báo đỉnh `C, D`, hoặc định nghĩa vòng quanh: `M` phụ thuộc `K`, nhưng `K` lại là giao của `AM` và `SO`.
- **Ví dụ SAI**:
  ```json
  [
    { "op": "intersection_ll", "id": "K", "l1": ["A", "M"], "l2": ["S", "O"] },
    { "op": "midpoint", "id": "M", "a": "S", "b": "C" }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  [
    { "op": "midpoint", "id": "M", "label": "M", "a": "S", "b": "C", "effect": "pop" },
    { "op": "segment", "a": "A", "b": "M", "dashed": true, "aux": true, "effect": "draw" },
    { "op": "intersection_ll", "id": "K", "label": "K", "l1": ["A", "M"], "l2": ["S", "O"], "effect": "pop" }
  ]
  ```

---

### Lỗi 05: Lật ngược đỉnh chóp `S` xuống dưới đáy hoặc 3 đỉnh chiếu thẳng hàng
- **Triệu chứng lỗi**: Hình chóp $S.ABCD$ bị chổng ngược đỉnh $S$ cắm xuống đất, hoặc mặt bên $(SAB)$ bị bẹp dí thành một vạch thẳng đứng duy nhất.
- **Nguyên nhân toán học**: AI nhầm hệ trục HTML5 Canvas (`+y` hướng xuống) với hệ trục Toán học của `ops` (`+y` hướng **lên trên**), nên đặt `S(0, -3.8)` dưới đáy `y = 0`; hoặc đặt `A(-2, 0), B(0, 0), C(2, 0)` cùng tung độ `y = 0` làm mặt đáy suy biến thành đoạn thẳng!
- **Ví dụ SAI**:
  ```json
  [
    { "op": "point_free", "id": "A", "x": -2.5, "y": 0.0 },
    { "op": "point_free", "id": "B", "x": 0.0, "y": 0.0 },
    { "op": "point_free", "id": "C", "x": 2.5, "y": 0.0 },
    { "op": "point_free", "id": "S", "x": 0.0, "y": -3.8 }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  [
    { "op": "point_free", "id": "A", "label": "A", "x": -2.6, "y": 0.0, "effect": "pop" },
    { "op": "point_free", "id": "B", "label": "B", "x": -0.5, "y": -1.9, "effect": "pop" },
    { "op": "point_free", "id": "C", "label": "C", "x": 2.8, "y": 0.0, "effect": "pop" },
    { "op": "point_free", "id": "S", "label": "S", "x": -0.3, "y": 3.7, "effect": "pop", "step": "Đỉnh S đặt dương (+y lên trên), đáy ABC mở góc rõ nét" }
  ]
  ```

---

## Nhóm II: Hình Học Không Gian 3D & Nét Khuất (Lỗi 06 – 10)

### Lỗi 06: Giao điểm giả của hai đường thẳng chéo nhau trong 3D (`Skew-Line False Intersection`)
- **Triệu chứng lỗi**: Để tìm giao điểm $I = SD \cap (ABM)$, AI cho luôn `I = intersection_ll(["A", "M"], ["S", "D"])`! Trên mặt giấy 2D hai vạch mực `AM` và `SD` có cắt nhau, nhưng trong không gian 3D chúng **chéo nhau** (không đồng phẳng), dẫn đến hình vẽ sai hoàn toàn bản chất toán học!
- **Nguyên nhân toán học**: Phép chiếu song song từ $\mathbb{R}^3 \to \mathbb{R}^2$ làm mất chiều sâu $z$. Hai đường thẳng chỉ cắt nhau thật trong 3D khi và chỉ khi 4 điểm xác định chúng cùng thuộc một mặt phẳng đã biết.
- **Ví dụ SAI**:
  ```json
  { "op": "intersection_ll", "id": "I", "label": "I", "l1": ["A", "M"], "l2": ["S", "D"], "step": "AM cắt SD tại I" }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`** *(Qua mặt phẳng phụ `(SAC)` và `(SBD)`)*:
  ```json
  [
    { "op": "intersection_ll", "id": "O", "label": "O", "l1": ["A", "C"], "l2": ["B", "D"], "effect": "pop", "step": "Trong (ABCD): O = AC ∩ BD" },
    { "op": "segment", "a": "S", "b": "O", "dashed": true, "aux": true, "effect": "glow", "step": "Giao tuyến (SAC) ∩ (SBD) = SO" },
    { "op": "intersection_ll", "id": "K", "label": "K", "l1": ["A", "M"], "l2": ["S", "O"], "effect": "pop", "step": "Trong (SAC): K = AM ∩ SO" },
    { "op": "intersection_ll", "id": "I", "label": "I", "l1": ["B", "K"], "l2": ["S", "D"], "drawExtensions": true, "effect": "pulse", "step": "Trong (SBD): BK kéo dài cắt SD tại I" }
  ]
  ```

---

### Lỗi 07: Gọi `intersection_ll` trên hai đường song song (`det = 0` — Giao tuyến song song)
- **Triệu chứng lỗi**: Điểm giao bay vọt cách tâm hình `10.000px` làm toàn bộ hình thu bé bằng hạt cát hoặc trả về `NaN`.
- **Nguyên nhân toán học**: Với $M, N$ lần lượt là trung điểm $SC, SD$ thì $MN \parallel CD$. Hai mặt phẳng $(AMN)$ và $(ABCD)$ có điểm chung $A$ và chứa hai đường thẳng song song $MN \parallel CD$, nên giao tuyến của chúng là đường thẳng $Ax \parallel CD$, **không phải** nối $MN$ cắt $CD$!
- **Ví dụ SAI**:
  ```json
  { "op": "intersection_ll", "id": "E", "label": "E", "l1": ["M", "N"], "l2": ["C", "D"], "step": "MN cắt CD tại E" }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  {
    "op": "line_parallel",
    "id": "x",
    "label": "x",
    "through": "A",
    "a": "C",
    "b": "D",
    "k": 1.0,
    "asLine": true,
    "noDot": true,
    "aux": true,
    "effect": "glow",
    "step": "Giao tuyến Ax = (AMN) ∩ (ABCD) song song với CD và MN"
  }
  ```

---

### Lỗi 08: Vẽ nét liền (`dashed: false`) cho cạnh khuất đáy, đường chéo đáy và đường cao trong khối
- **Triệu chứng lỗi**: Toàn bộ hình chóp vẽ bằng nét liền đặc quánh, người học không phân biệt được mặt nào ở trước, mặt nào ở sau, vi phạm quy tắc trình bày bài thi THPT.
- **Nguyên nhân toán học**: AI bỏ quên cờ `"dashed": true` trên các đoạn thẳng nằm bên trong miền đa giác bao lồi ngoài của khối đa diện hoặc nằm trên mặt đáy bị che bởi các mặt bên phía trước.
- **Ví dụ SAI**:
  ```json
  [
    { "op": "segment", "a": "A", "b": "D", "dashed": false },
    { "op": "segment", "a": "A", "b": "C", "dashed": false },
    { "op": "segment", "a": "S", "b": "O", "dashed": false }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  [
    { "op": "segment", "a": "A", "b": "D", "dashed": true, "effect": "draw", "step": "Cạnh đáy sau AD bị che khuất" },
    { "op": "segment", "a": "A", "b": "C", "dashed": true, "aux": true, "effect": "draw", "step": "Đường chéo đáy AC nét đứt" },
    { "op": "segment", "a": "S", "b": "O", "dashed": true, "aux": true, "effect": "glow", "step": "Đường nối xuyên trong lòng khối chóp SO nét đứt" }
  ]
  ```

---

### Lỗi 09: Dùng một lệnh vẽ viền liền đồng loạt cho thiết diện đi qua cả mặt thấy lẫn mặt khuất
- **Triệu chứng lỗi**: Thiết diện tứ giác $ABMI$ được vẽ cả 4 cạnh nét liền, trong khi cạnh $AI$ nằm trên mặt bên phía sau $(SAD)$ lẽ ra phải là nét đứt!
- **Nguyên nhân toán học**: Mỗi cạnh của đa giác thiết diện mang tính chất thấy/khuất của **mặt bên chứa cạnh đó**. Trong góc nhìn chuẩn của chóp $S.ABCD$, các mặt $(SAB), (SBC), (SCD)$ hướng về phía người quan sát (`dashed: false`), còn mặt lưng $(SAD)$ chứa cạnh đáy khuất $AD$ nằm phía sau (`dashed: true`).
- **Ví dụ SAI**:
  ```json
  { "op": "connect_polygon", "pts": ["A", "B", "M", "I"], "dashedEdges": [] }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  {
    "op": "connect_polygon",
    "pts": ["A", "B", "M", "I"],
    "dashedEdges": ["A-I"],
    "fill": "rgba(240, 124, 0, 0.12)",
    "explicitColor": true,
    "effect": "chalk",
    "step": "Khép kín thiết diện ABMI (cạnh AI thuộc mặt sau SAD vẽ nét đứt)"
  }
  ```

---

### Lỗi 10: Bỏ lửng điểm giao tuyến / chân đường cao trơ trọi giữa không trung
- **Triệu chứng lỗi**: Chấm điểm `I` hoặc `E` hiện lên cùng chữ cái nhưng không có bất kỳ tia kéo dài nào đi qua nó, khiến học sinh không hiểu điểm đó từ đâu sinh ra.
- **Nguyên nhân toán học**: Khi giao điểm nằm trên phần kéo dài của đoạn thẳng (ví dụ $E = AB \cap CD$ ngoài tứ giác, hoặc $I = BK \cap SD$ trên tia $BK$ kéo dài qua $K$), chỉ tạo điểm `intersection_ll` mà không bật `drawExtensions: true` hoặc không kẻ đoạn nối `BI` sẽ để lại khoảng trống đứt đoạn.
- **Ví dụ SAI**:
  ```json
  { "op": "intersection_ll", "id": "E", "label": "E", "l1": ["A", "B"], "l2": ["C", "D"], "drawExtensions": false }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  {
    "op": "intersection_ll",
    "id": "E",
    "label": "E",
    "l1": ["A", "B"],
    "l2": ["C", "D"],
    "drawExtensions": true,
    "extDashed": false,
    "effect": "pop",
    "step": "Trong (ABCD), kéo dài AB và CD cắt nhau tại E"
  }
  ```

---

## Nhóm III: Đường Tròn, Tiếp Tuyến & Góc Vuông (Lỗi 11 – 14)

### Lỗi 11: Đoán góc `point_on_circle` khi kẻ tiếp tuyến từ điểm ngoài đường tròn
- **Triệu chứng lỗi**: Đoạn thẳng "tiếp tuyến" $AB$ đâm xuyên qua đường tròn $(O)$ như cát tuyến, hoặc góc $\widehat{OBA}$ lệch thành $78^\circ$ thay vì $90^\circ$!
- **Nguyên nhân toán học**: Với tâm $O(0, 0)$, bán kính $R$ và điểm ngoài $A(d, 0)$ ($d > R$), tiếp điểm thực sự thỏa mãn $\cos(\widehat{BOA}) = \frac{R}{d}$ (tức hình chiếu của $B$ lên $OA$ có tỉ số $\frac{OH_0}{OA} = \frac{R^2}{d^2}$ và $B$ thuộc đường tròn Thales đường kính $OA$). Nếu AI gán bừa `angleDeg: 60` khi $d = 5, R = 2$ ($\arccos(0.4) \approx 66.42^\circ \neq 60^\circ$), tiếp tuyến sẽ cắt toạc đường tròn!
- **Ví dụ SAI**:
  ```json
  [
    { "op": "point_free", "id": "O", "x": 0, "y": 0 },
    { "op": "point_free", "id": "P_R", "x": 0, "y": 2, "show": false },
    { "op": "point_free", "id": "A", "x": 5, "y": 0 },
    { "op": "point_on_circle", "id": "B", "center": "O", "rim": "P_R", "angleDeg": 60 }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`** *(Đúng tuyệt đối $90.0000^\circ$ cho mọi $R, OA$)*:
  ```json
  [
    { "op": "point_free", "id": "O", "label": "O", "x": 0.0, "y": 0.0, "effect": "pop" },
    { "op": "point_free", "id": "P_R", "label": "", "x": 0.0, "y": 2.0, "show": false },
    { "op": "circle", "center": "O", "rim": "P_R", "effect": "draw" },
    { "op": "point_free", "id": "A", "label": "A", "x": 5.0, "y": 0.0, "effect": "pop" },
    { "op": "midpoint", "id": "M", "label": "M", "a": "O", "b": "A", "effect": "pop" },
    { "op": "circle", "center": "M", "rim": "O", "dashed": true, "aux": true, "effect": "draw", "step": "Đường tròn Thales đường kính OA" },
    { "op": "point_on_segment", "id": "H0", "label": "", "a": "O", "b": "A", "ratio": 0.16, "show": false, "step": "ratio = (R/OA)^2 = 4/25 = 0.16" },
    { "op": "line_perp", "id": "Q0", "label": "", "through": "H0", "a": "O", "b": "A", "drawSegment": false, "show": false },
    { "op": "intersection_lc", "id": "B", "label": "B", "line": ["H0", "Q0"], "circle": ["O", "P_R"], "which": 1, "effect": "pop" },
    { "op": "intersection_lc", "id": "C", "label": "C", "line": ["H0", "Q0"], "circle": ["O", "P_R"], "which": 0, "effect": "pop" }
  ]
  ```

---

### Lỗi 12: Quên đổi nhánh nghiệm `which: 0 | 1` trong `intersection_lc` làm hai giao điểm trùng nhau
- **Triệu chứng lỗi**: Cát tuyến hoặc dây cung cắt đường tròn tại $B$ và $C$, nhưng trên hình điểm $B$ và $C$ đè khít lên nhau ở cùng một phía, tiếp tuyến thứ hai biến mất.
- **Nguyên nhân toán học**: Phương trình bậc hai giao của đường thẳng và đường tròn có 2 nghiệm phân biệt ứng với `which: 0` và `which: 1`. Nếu bỏ trống `which` ở cả hai lệnh, mặc định cả hai đều lấy `which: 0`!
- **Ví dụ SAI**:
  ```json
  [
    { "op": "intersection_lc", "id": "B", "line": ["H0", "Q0"], "circle": ["O", "P_R"] },
    { "op": "intersection_lc", "id": "C", "line": ["H0", "Q0"], "circle": ["O", "P_R"] }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  [
    { "op": "intersection_lc", "id": "B", "label": "B", "line": ["H0", "Q0"], "circle": ["O", "P_R"], "which": 0, "effect": "pop" },
    { "op": "intersection_lc", "id": "C", "label": "C", "line": ["H0", "Q0"], "circle": ["O", "P_R"], "which": 1, "effect": "pop" }
  ]
  ```

---

### Lỗi 13: Đặt sai thứ tự đỉnh góc vuông trong `right_angle`
- **Triệu chứng lỗi**: Ô vuông kí hiệu góc vuông nhảy sang đứng ở đỉnh nhọn $A$ hoặc $O$ thay vì nằm ở chân đường vuông góc $H$!
- **Nguyên nhân toán học**: Trong câu nói tiếng Việt *"Góc vuông tại $H$ giữa $HA$ và $HB$"*, chữ $H$ đứng đầu câu nên AI hay viết nhầm `{"a": "H", "v": "A", "b": "B"}`, trong khi chuẩn hình học quy định tham số giữa `v` mới là **đỉnh góc vuông** ($\widehat{AHB}$).
- **Ví dụ SAI**:
  ```json
  { "op": "right_angle", "a": "H", "v": "A", "b": "B" }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  { "op": "right_angle", "a": "A", "v": "H", "b": "B", "aux": true, "effect": "fade", "step": "Kí hiệu góc vuông tại đỉnh v = H" }
  ```

---

### Lỗi 14: Tự nhẩm chân đường cao bằng `point_on_segment` thay vì dùng `foot_perp`
- **Triệu chứng lỗi**: Trong hình phẳng 2D, đường cao $AH$ nhìn bằng mắt thường bị nghiêng xiên so với cạnh đáy $BC$, ô kí hiệu góc vuông bị méo thành hình thoi nhọn.
- **Nguyên nhân toán học**: Hình chiếu vuông góc của $A$ lên $BC$ có hệ số chiếu $k = \frac{\overrightarrow{BA} \cdot \overrightarrow{BC}}{\|\overrightarrow{BC}\|^2}$ phụ thuộc chính xác vào tọa độ của $A, B, C$. Chỉ có toán tử `foot_perp` mới bảo đảm $\overrightarrow{AH} \cdot \overrightarrow{BC} = 0$ trong mọi trường hợp!
- **Ví dụ SAI**:
  ```json
  [
    { "op": "point_on_segment", "id": "H", "a": "B", "b": "C", "ratio": 0.4 },
    { "op": "segment", "a": "A", "b": "H" }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  {
    "op": "foot_perp",
    "id": "H",
    "label": "H",
    "p": "A",
    "a": "B",
    "b": "C",
    "drawDropSegment": true,
    "markRightAngle": true,
    "aux": true,
    "effect": "draw",
    "step": "Hạ đường cao AH vuông góc chính xác với BC tại H"
  }
  ```

---

## Nhóm IV: Cú Pháp JSON & Biểu Thức Số Học LLM (Lỗi 15 – 17)

### Lỗi 15: Viết chuỗi biểu thức căn thức / phân số trong trường số JSON
- **Triệu chứng lỗi**: `JSON.parse` thành công nhưng `Number("sqrt(3)/2")` trong JavaScript trả về `NaN`, làm toàn bộ hình biến mất, hoặc bị từ chối bởi trình kiểm định JSON Schema!
- **Nguyên nhân toán học**: Chuẩn RFC 8259 (JSON) không hỗ trợ biểu thức toán học hay phân số như Python/TikZ (`sqrt(3)`, `3/2`, `-pi/4`).
- **Ví dụ SAI**:
  ```json
  { "op": "point_free", "id": "B", "x": "1/2", "y": "sqrt(3)/2" }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  { "op": "point_free", "id": "B", "label": "B", "x": 0.5, "y": 0.866, "effect": "pop" }
  ```

---

### Lỗi 16: Chèn comment `//`, dấu phẩy thừa cuối mảng (`Trailing Comma`) hoặc ngoặc kép cong
- **Triệu chứng lỗi**: Lỗi cú pháp `SyntaxError: Unexpected token / in JSON` khi tích hợp qua pipeline tự động.
- **Nguyên nhân toán học**: Các LLM quen viết JavaScript/TypeScript nên chèn `// Bước 1: dựng đáy` ngay giữa mảng JSON hoặc để lại dấu `,` sau phần tử cuối cùng.
- **Ví dụ SAI**:
  ```json
  {
    "schema": "mn-geo-motion/2.0",
    "ops": [
      // Dựng tâm O
      { "op": "point_free", "id": "O", "x": 0, "y": 0 },
    ]
  }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`** *(Đưa mọi ghi chú vào trường `"step"` hợp chuẩn)*:
  ```json
  {
    "schema": "mn-geo-motion/2.0",
    "ops": [
      { "op": "point_free", "id": "O", "label": "O", "x": 0.0, "y": 0.0, "step": "Dựng tâm O" }
    ]
  }
  ```

---

### Lỗi 17: Trùng lặp định danh `id` hoặc làm lộ dấu chấm to trên tên đường thẳng giao tuyến
- **Triệu chứng lỗi**: Đặt hai điểm cùng `"id": "M"` khiến điểm sau ghi đè điểm trước; hoặc kẻ giao tuyến $Ax$ bằng `line_parallel` nhưng quên `"noDot": true` làm xuất hiện một cục chấm tròn đen to đùng ngay bên cạnh chữ thường $x$!
- **Nguyên nhân toán học**: Trong kí hiệu hình học Việt Nam, chữ in hoa ($A, B, M, I$) là **điểm** (có dấu chấm tròn), còn chữ thường ($x, y, d, \Delta$) là **tên đường thẳng / tia** (chỉ ghi nhãn ở đầu mút, tuyệt đối không chấm điểm tròn).
- **Ví dụ SAI**:
  ```json
  { "op": "line_parallel", "id": "x", "label": "x", "through": "A", "a": "C", "b": "D", "noDot": false }
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`**:
  ```json
  {
    "op": "line_parallel",
    "id": "x",
    "label": "x",
    "through": "A",
    "a": "C",
    "b": "D",
    "asLine": true,
    "noDot": true,
    "aux": true,
    "effect": "glow",
    "step": "Kẻ tia giao tuyến Ax // CD (ẩn dấu chấm đầu mút x)"
  }
  ```

---

## Nhóm V: Sư Phạm, Kịch Bản Hiệu Ứng & Xuất Video BetaTikz (Lỗi 18 – 20)

### Lỗi 18: Đảo ngược trình tự sư phạm (Tô mặt thiết diện trước khi dựng cạnh và giao điểm)
- **Triệu chứng lỗi**: Khi bấm Phát kịch bản trên MinNote, ngay giây đầu tiên một mảng màu cam lơ lửng hiện ra giữa trang trắng trong khi hình chóp $S.ABCD$ còn chưa được vẽ!
- **Nguyên nhân toán học**: Trong mã TikZ tĩnh, người ta thường đặt lệnh `\fill` lên dòng đầu tiên để màu nền nằm dưới nét mực đen. Khi dịch sang JSON chuyển động mà giữ nguyên thứ tự dòng lệnh TikZ tĩnh, bước tô màu sẽ chạy ở bước #1 thay vì bước kết thúc!
- **Ví dụ SAI**:
  ```json
  [
    { "op": "polygon_fill", "pts": ["A", "B", "M", "I"], "fill": "rgba(240,124,0,0.12)" },
    { "op": "segment", "a": "A", "b": "B" }
  ]
  ```
- **Ví dụ ĐÚNG chuẩn `mn-geo-motion/2.0`** *(Luôn dựng khung gốc $\to$ tìm giao điểm $\to$ viền thiết diện $\to$ tô miền `polygon_fill` cuối cùng)*:
  ```json
  [
    { "op": "segment", "a": "B", "b": "M", "dashed": false, "aux": true, "effect": "chalk" },
    { "op": "segment", "a": "M", "b": "I", "dashed": false, "aux": true, "effect": "chalk" },
    { "op": "segment", "a": "A", "b": "I", "dashed": true, "aux": true, "effect": "draw" },
    { "op": "polygon_fill", "pts": ["A", "B", "M", "I"], "fill": "rgba(240,124,0,0.12)", "explicitColor": true, "effect": "fade", "step": "Tô miền thiết diện sau khi đã khép kín các cạnh" }
  ]
  ```

---

### Lỗi 19: Thiếu `Fixed Bounding Box` trong `out_tikz` khiến video BetaTikz rung giật điên đảo
- **Triệu chứng lỗi**: Khi xuất sang BetaTikz để render MP4, ở giây thứ 1 cạnh đáy $AB$ phóng khổng lồ chiếm hết màn hình; sang giây thứ 2 khi đỉnh $S$ hiện ra, toàn bộ đáy đột ngột giật thu nhỏ lại và nhảy lệch tâm!
- **Nguyên nhân toán học**: Lớp `\documentclass[tikz,border=10pt]{standalone}` của LaTeX cắt sát khung trang PDF theo những đối tượng được vẽ ở thời điểm $\t$ đó. Không có lệnh khóa khung `\path (minX, minY) rectangle (maxX, maxY);` đặt ngoài `scope` camera, mỗi frame PDF có kích thước khác nhau!
- **Ví dụ SAI (`out_tikz`)**:
  ```latex
  \begin{tikzpicture}
    \pgfmathsetmacro{\tval}{\t}
    \draw (0,0) -- ({3*\tval}, 0);
  \end{tikzpicture}
  ```
- **Ví dụ ĐÚNG chuẩn BetaTikz (`out_tikz`)**:
  ```latex
  \providecommand{\t}{1}
  \begin{tikzpicture}
    \pgfmathsetmacro{\tval}{\t}
    % BẮT BUỘC khóa cứng khung nhìn ngoài cùng trước mọi nét vẽ động:
    \path (-4.4, -2.6) rectangle (4.8, 4.5);
    \pgfmathsetmacro{\p}{smootherstep(clp(\tval, 0.05, 0.45))}
    \ifdim \p pt > 0.005pt
      \draw[thick] (0,0) -- ({3*\p}, 0);
    \fi
  \end{tikzpicture}
  ```

---

### Lỗi 20: Ghi đè biến thời gian `\t` bằng `variable=\t` hoặc lỗi chia 0 ở $\t = 0$ trong BetaTikz
- **Triệu chứng lỗi**: `pdflatex` báo lỗi `! Dimension too large` hoặc `! Package PGF Math Error` ngay tại frame `TIKZVID-T=0.00000`, hoặc mọi chuyển động phía sau đồ thị hàm số bị đông cứng ở giá trị cuối miền vẽ!
- **Nguyên nhân toán học**: Engine BetaTikz truyền thời gian toàn cục qua macro `\edef\t{\tikzvidT}`. Nếu trong thân hình viết `\draw[domain=0:360, variable=\t] plot ...`, PGF sẽ dùng chính `\t` làm biến chạy tích phân/đồ thị, phá hủy giá trị thời gian thực của các lệnh phía dưới! Đồng thời `domain=0:0` với `smooth` tại $\t=0$ sinh suy biến đạo hàm nội suy bậc ba.
- **Ví dụ SAI (`out_tikz`)**:
  ```latex
  \pgfmathsetmacro{\ang}{360 * clp(\tval, 0.2, 0.8)}
  \draw[smooth, domain=0:\ang, variable=\t] plot ({cos(\t)}, {sin(\t)});
  ```
- **Ví dụ ĐÚNG chuẩn BetaTikz (`out_tikz`)** *(Luôn dùng `variable=\u` hoặc `\x` và chặn ngưỡng `max(0.05, ...)`)*:
  ```latex
  \pgfmathsetmacro{\ang}{max(0.05, 360 * smoothstep(clp(\tval, 0.2, 0.8)))}
  \ifdim \tval pt > 0.201pt
    \draw[smooth, domain=0:\ang, samples=60, variable=\u] plot ({cos(\u)}, {sin(\u)});
  \fi
  ```

---

## Tổng Kết Cơ Chế Bảo Vệ Kép (2-Layer Defense) Của MinNote

1. **Lớp 1 — Khóa từ trong trứng nước bằng Prompt (`01` & `02`) + JSON Schema (`mn-geo-motion-v2.schema.json`)**:
   Chặn đứng lỗi từ phía LLM nhờ 5 cổng kiểm định toán học trước khi sinh `ops`.
2. **Lớp 2 — Tự động chữa lành tại trình biên dịch (`MinNoteAiGeo.validateAndHealAiGeoPlan`)**:
   Tự động gỡ rào markdown/dấu phẩy thừa, tính biểu thức căn thức an toàn không dùng `eval`, đảo lại tứ giác tự cắt thành lồi, chặn giao điểm song song `|det| < 1e-5`, cảnh báo đường chéo nhau 3D, dịch `ratio = 0.5` giả thành `0.38`, sắp xếp tô-pô DAG và lật đỉnh `S` lên trên đáy nếu AI nhầm dấu trục tung!
