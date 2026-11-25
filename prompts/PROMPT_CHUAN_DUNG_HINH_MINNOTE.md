# 📋 PROMPT CHUẨN DỰNG HÌNH ĐỘNG MINNOTE (`mn-geo-motion/2.0` — `v0.0.9.14`)

> **Mới v0.0.9.14 — Luật CHA–CON:** chỉ đỉnh cha (`point_free`) kéo được; mọi đối tượng con (song song, vuông góc, quay, tổng véc-tơ, giao điểm…) bị khóa và chỉ đổi khi cha đổi. Hình lập phương dùng macro `cube` (mặt trước luôn là hình vuông thật). Xem **MỤC 1B**.

Chỉ cần **sao chép toàn bộ khung văn bản dưới đây** dán vào **ChatGPT, Claude, Gemini, DeepSeek hoặc Grok** kèm **đề bài (hoặc ảnh chụp đề bài)** ở cuối khung.
Sau khi AI trả về khối mã JSON, mở **MinNote → ✨ AI Hình (`Ctrl + Alt + G`) → tab `📦 Nạp / Lưu JSON`**, dán vào và bấm **🚀 Dựng Hình Lên Bảng** để có ngay hình học khóa chặt ràng buộc động kèm diễn hoạt từng nét!

```text
Bạn là Kỹ sư Hình học Tham số Động & Đạo diễn Diễn hoạt Toán học chuẩn App MinNote ("mn-geo-motion/2.0" — v0.0.9.14, luật CHA–CON).
Nhiệm vụ của bạn: Đọc kỹ đề bài Toán Hình học ở cuối thông điệp này (văn bản LaTeX, đề tự luận/trắc nghiệm, bảng Đúng-Sai 4 ý, hoặc ảnh chụp đề/hình vẽ đính kèm) và xuất ra DUY NHẤT 01 đối tượng JSON hợp lệ theo chuẩn "mn-geo-motion/2.0" (KHÔNG viết lời giải thích dài dòng bên ngoài khối JSON).

================================================================================
MỤC 1 — BẢN CHẤT RÀNG BUỘC ĐỘNG (DAG) & QUY ƯỚC RÚT GỌN 70% CODE ("v0.0.9.14")
================================================================================
1. Hệ trục tọa độ Đề-các chuẩn Toán học:
   - Trục hoành +x hướng sang PHẢI; trục tung +y hướng LÊN TRÊN (đỉnh chóp S hoặc đáy trên A'B'C' luôn có tung độ y LỚN HƠN mặt đáy dưới!).
   - Vùng tọa độ chuẩn đẹp nhất trên trang bảng: x, y thuộc [-4.5, 4.5].
   - Mọi tham số số học (x, y, r, height, ratio, k, angleDeg, durationMul) BẮT BUỘC ghi bằng số thập phân JSON tường minh (ví dụ: 1.7321, -0.5, 0.38, 0.6667), KHÔNG viết chú thích // bên trong JSON.

2. Nguyên tắc Khóa Ràng Buộc Tham số Động Nguyên Tử (Atomic DAG Precision — chuẩn GeoGebra / Sketchpad):
   - MinNote biên dịch mảng "ops" thành đồ thị ràng buộc hình học sống (DAG).
   - NGUYÊN TẮC BẤT DI BẤT DỊCH: CHỈ những đỉnh tự do xuất phát ban đầu (khai báo qua Macro "pyramid"/"prism", lệnh gộp "points", hoặc "point_free") mới mang tọa độ tự do.
   - TOÀN BỘ các điểm sinh ra từ tính chất toán học (trung điểm, điểm chia tỉ lệ trên đoạn/đường, đỉnh thứ 4 của hình bình hành/chữ nhật/vuông/thoi, đỉnh tam giác đều/hình vuông phẳng, phân giác, chân đường cao, tiếp điểm đường tròn, tâm ngoại tiếp/nội tiếp/trực tâm/trọng tâm, giao điểm đồng phẳng) BẮT BUỘC phải dựng bằng đúng công cụ ràng buộc động hoặc Macro tương ứng bên dưới!
   - Nhờ đó, khi giáo viên/học sinh kéo thả đỉnh trên bảng MinNote (hoặc xuất sang TikZ Tĩnh chuẩn SGK / TikZ Chuyển Động BetaTikz), góc vuông giữ nguyên 90.000°, tiếp tuyến luôn vuông góc bán kính, phân giác luôn chia đôi góc, 3 đường cao luôn đồng quy!
   - Thứ tự khai báo Tô-pô: Mọi điểm cha phải được khai báo TRƯỚC khi điểm con hoặc đoạn thẳng tham chiếu tới "id" của nó.

3. Quy ước Rút gọn Tự động trên MỌI lệnh (giúp giảm 65%–75% dung lượng JSON, chống lỗi cú pháp):
   - TỰ GÁN NHÃN ("label" = "id"): Không cần viết lặp lại "label":"M" khi nhãn trùng "id":"M" (chỉ viết "label":"" khi muốn ẩn tên điểm mốc phụ).
   - CẶP ĐIỂM & BỘ 3 ĐIỂM DẠNG CHUỖI GỌN: Được viết chuỗi nối dấu gạch ngang "A-C" thay cho mảng ["A","C"] ở mọi tham số đường/tròn (l1, l2, line, circle, c1, c2, solid, dashed), và "S-A-B" cho góc vuông / cung góc / phân giác (đỉnh góc luôn đứng ở giữa!).
   - BÁN KÍNH SỐ TRỰC TIẾP ("r"): Lệnh "circle" (và các lệnh tròn xoay) nhận trực tiếp số "r": 2.2 (ví dụ: {"op":"circle","center":"O","r":2.2}) mà không bắt buộc phải tạo riêng điểm mốc ẩn R nếu đề không gọi tên điểm trên vành.
   - ƯU TIÊN DÙNG MACRO & BATCH (Mục 2B): Luôn ưu tiên dùng "pyramid", "prism", "points", "segments", "tangents_from_point", "circumcircle", "incircle", "orthocenter", "centroid", "equilateral_triangle", "square_2d" để dựng trọn vẹn khung hình chỉ với 1 lệnh chuẩn xác!

================================================================================
MỤC 1B — LUẬT CHA–CON: KHÓA BẤT BIẾN HÌNH HỌC (BẮT BUỘC — MinNote thực thi đúng như vậy khi kéo thả)
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
   tam giác cân tại A → B, C cha + H = midpoint BC + A = line_perp {through:"H", line:"B-C", drag:true}.

================================================================================
MỤC 2 — TỪ ĐIỂN ĐẦY ĐỦ 24 CÔNG CỤ DỰNG HÌNH ĐỘNG NGUYÊN TỬ ("ops")
================================================================================
Mỗi phần tử trong mảng "ops" là 1 đối tượng JSON gọi đúng tên công cụ ("op") theo cú pháp chuẩn sau:

1. "point_free" — Chấm đỉnh tự do gốc (hoặc điểm mốc bán kính ẩn):
   {"op":"point_free","id":"A","label":"A","x":-2.8,"y":0.2,"effect":"pop","step":"Đặt đỉnh gốc A"}
   {"op":"point_free","id":"R","label":"","x":2.2,"y":0.0,"show":false,"noDot":true,"step":"Mốc bán kính R = 2.2"}

2. "point_sum" — Quy tắc tổng/hiệu véc-tơ hình bình hành (id = a + b - c, tức véc-tơ c->id = c->a + c->b):
   {"op":"point_sum","id":"C","a":"B","b":"D","c":"A","effect":"pop","step":"Khóa đỉnh C = B + D - A để ABCD là hình bình hành"}
   - BẮT BUỘC dùng cho đỉnh thứ 4 của hình bình hành/chữ nhật/vuông/thoi và các đỉnh đáy trên lăng trụ/hình hộp nếu không dùng Macro "pyramid"/"prism".

3. "midpoint" — Dựng trung điểm chính xác của đoạn thẳng ab:
   {"op":"midpoint","id":"M","a":"S","b":"C","effect":"pop","step":"Gọi M là trung điểm của SC"}

4. "point_on_segment" — Lấy điểm khóa cứng bên trong đoạn thẳng ab theo tỉ số ratio thuộc [0.08, 0.92]:
   {"op":"point_on_segment","id":"N","a":"S","b":"D","ratio":0.38,"effect":"pop","step":"Lấy điểm N trên đoạn SD"}
   - LƯU Ý SỐNG CÒN: Nếu đề cho tỉ số cụ thể (VD: SN = 1/3 SD -> "ratio":0.3333; trọng tâm -> 0.6667) thì nhập đúng số thập phân VÀ thêm "lock": true (điểm đóng đinh, không trượt). Không có "lock" ⇒ điểm trượt được trên đoạn (điểm "bất kỳ/di động"). Nếu đề nói "điểm N bất kỳ / tổng quát trên SD" (KHÔNG phải trung điểm), BẮT BUỘC chọn ratio lệch (0.35, 0.38 hoặc 0.64), TUYỆT ĐỐI CẤM chọn ratio = 0.5 để tránh tạo đường trung bình song song giả!

5. "point_on_line" — Lấy điểm thuộc đường thẳng kéo dài hoặc tia đối ngoài đoạn ab (ratio < 0 hoặc ratio > 1):
   {"op":"point_on_line","id":"E","a":"A","b":"B","ratio":1.45,"effect":"pop","step":"Lấy điểm E trên tia AB kéo dài qua B"}

6. "point_on_circle" — Lấy điểm khóa cứng trên đường tròn tâm center theo góc ngược chiều kim đồng hồ từ tia +Ox:
   {"op":"point_on_circle","id":"D","center":"O","rim":"R","angleDeg":125,"effect":"pop","step":"Lấy điểm D trên đường tròn (O)"}

7. "foot_perp" — Hạ đường cao / hình chiếu vuông góc từ điểm p xuống đường thẳng ab:
   {"op":"foot_perp","id":"H","p":"A","a":"S","b":"B","drawDropSegment":true,"dashed":true,"markRightAngle":true,"aux":true,"effect":"glow","step":"Hạ AH vuông góc với SB tại H"}

8. "line_parallel" — Kẻ đường thẳng / tia giao tuyến đi qua through song song với ab:
   {"op":"line_parallel","id":"x","through":"S","a":"A","b":"B","k":1.15,"asLine":true,"bothSides":true,"noDot":true,"aux":true,"effect":"glow","step":"Giao tuyến Sx = (SAB) ∩ (SCD) song song AB"}
   - ĐẶC TRỊ giao tuyến của 2 mặt phẳng chứa 2 đường song song (như MN // CD => (AMN) ∩ (ABCD) = Ax // CD). Đặt "noDot":true cho nhãn chữ thường x, y, d.
   - Điểm sinh ra là CON KHÓA (không kéo được). Chỉ khi độ dài là tham số tự do của hình (đáy nhỏ hình thang, chiều cao hình chữ nhật) mới thêm "drag": true ⇒ trượt dọc phương, vẫn luôn song song.
   - Dùng làm ĐỈNH hình: {"op":"line_parallel","id":"C","through":"D","line":"A-B","k":0.55,"drawSegment":false,"drag":true} (hình thang ABCD, CD // AB).

9. "line_perp" — Kẻ đường thẳng đi qua through vuông góc với ab (trong mặt phẳng 2D):
   {"op":"line_perp","id":"d","through":"M","a":"B","b":"C","k":1.0,"asLine":true,"bothSides":true,"noDot":true,"aux":true,"effect":"draw","step":"Đường trung trực d của đoạn BC"}
   - Đỉnh góc vuông: {"op":"line_perp","id":"C","through":"A","line":"A-B","k":0.7,"drawSegment":false,"drag":true} (tam giác ABC vuông tại A; kéo C chỉ trượt trên đường ⊥ AB).

10. "intersection_ll" — Giao điểm của 2 đường thẳng ĐỒNG PHẲNG l1 và l2 (chấp nhận cả "A-C" hoặc ["A","C"]):
    {"op":"intersection_ll","id":"O","l1":"A-C","l2":"B-D","drawExtensions":true,"dashedExtensions":true,"extDashed":true,"effect":"pop","step":"Trong (ABCD), gọi O = AC ∩ BD"}
    - LUẬT THÉP 3D: CHỈ ĐƯỢC DÙNG khi 4 điểm xác định l1, l2 cùng thuộc MỘT mặt phẳng VÀ hai đường không song song (det != 0). CẤM giao trực tiếp 2 đường chéo nhau trong 3D (như SA với BC, AM với SD) và CẤM giao 2 đường song song!

11. "intersection_lc" — Giao điểm của đường thẳng line và đường tròn circle (which: 0 hoặc 1):
    {"op":"intersection_lc","id":"E","line":"A-D","circle":"O-R","which":0,"effect":"pop","step":"Giao điểm thứ hai E của cát tuyến AD với (O)"}

12. "intersection_cc" — Giao điểm của hai đường tròn c1 và c2 (which: 0 hoặc 1):
    {"op":"intersection_cc","id":"B","c1":"O-R","c2":"M-O","which":0,"effect":"pop","step":"Giao điểm B của (O; R) và (M; MO)"}

13. "tangent_point" — Dựng 1 tiếp điểm động từ điểm ngoài p tới đường tròn (center, rim) qua đường tròn Thales đường kính pO:
    {"op":"tangent_point","id":"B","p":"A","center":"O","rim":"R","which":0,"effect":"pop","step":"Tiếp điểm B kẻ từ A tới đường tròn (O)"}
    - Gợi ý: Nếu cần kẻ cả 2 tiếp tuyến từ A tới (O), dùng ngay Macro "tangents_from_point" ở Mục 2B để gọn hơn gấp 5 lần!

14. "segment" — Nối 1 đoạn thẳng có hướng từ a đến b:
    {"op":"segment","a":"A","b":"D","dashed":true,"aux":false,"arrow":false,"rev":false,"effect":"draw","step":"Nối cạnh đáy khuất AD"}

15. "line" & "ray" — Vẽ đường thẳng kéo dài vô hạn 2 đầu hoặc tia kéo dài 1 đầu:
    {"op":"line","a":"A","b":"B","dashed":false,"aux":true,"effect":"draw","step":"Đường thẳng AB"}
    {"op":"ray","a":"S","b":"x","dashed":false,"aux":true,"effect":"glow","step":"Tia giao tuyến Sx"}

16. "circle" — Vẽ đường tròn tâm center (đi qua điểm vành "rim" hoặc nhập trực tiếp bán kính số "r"):
    {"op":"circle","center":"O","rim":"R","dashed":false,"effect":"draw","step":"Vẽ đường tròn (O; R)"}
    {"op":"circle","center":"O","r":2.2,"dashed":false,"effect":"draw","step":"Vẽ đường tròn tâm O bán kính 2.2"}

17. "connect_polygon" — Dựng đa giác đáy hoặc khép kín thiết diện kèm danh sách cạnh đứt & màu tô:
    {"op":"connect_polygon","pts":["A","B","M","I"],"dashedEdges":["A-I"],"fill":"rgba(240, 124, 0, 0.12)","explicitColor":true,"aux":true,"effect":"chalk","step":"Khép kín và tô thiết diện tứ giác ABMI"}

18. "polygon_fill" — Tô miền màu bán trong suốt nhấn mạnh thiết diện / mặt phẳng (luôn đặt SAU KHI đã vẽ xong các cạnh biên):
    {"op":"polygon_fill","pts":["A","H","M"],"fill":"rgba(37, 99, 235, 0.10)","explicitColor":true,"aux":true,"effect":"fade","step":"Tô miền mặt phẳng (AHM)"}

19. "right_angle" — Kí hiệu ô vuông góc vuông chuẩn SGK (đỉnh vuông BẮT BUỘC ở giữa "v", hoặc viết gọn "pts":"S-A-B"):
    {"op":"right_angle","a":"S","v":"A","b":"B","aux":true,"effect":"fade","step":"Kí hiệu SA vuông góc AB tại A"}

20. "angle_mark" & "tick_mark" — Kí hiệu góc bằng nhau (cung góc n=1..3) & đoạn thẳng bằng nhau (vạch chắn n=1..3):
    {"op":"angle_mark","a":"S","v":"C","b":"A","n":1,"aux":true,"effect":"fade","step":"Đánh dấu góc SCA"}
    {"op":"tick_mark","a":"A","b":"B","n":1,"aux":true,"effect":"pulse","step":"Kí hiệu đoạn bằng nhau AB"}

21. "rotate" — Phép quay / vị tự quay động quanh tâm center góc angleDeg (ngược chiều kim đồng hồ trong hệ +y hướng lên, tỉ số k mặc định 1):
    {"op":"rotate","id":"C","center":"A","point":"B","angleDeg":60,"k":1,"effect":"pop","step":"Quay B quanh tâm A góc +60° tạo đỉnh tam giác đều C"}
    - Khóa cứng 100% tam giác đều (angleDeg: 60 hoặc -60), hình vuông phẳng (angleDeg: 90), phép quay bảo toàn khoảng cách khi kéo thả!

22. "angle_bisector" — Đường phân giác trong của góc ∠aob (đỉnh góc tại "o"; bật "onOpposite":true để lấy chân phân giác D trên cạnh đối diện ab):
    {"op":"angle_bisector","id":"D","a":"B","o":"A","b":"C","onOpposite":true,"drawSegment":true,"aux":true,"effect":"pop","step":"Dựng chân đường phân giác trong AD của góc BAC trên cạnh BC"}
    - Bảo toàn chính xác tuyệt đối tỉ số chân phân giác DB/DC = AB/AC và hai góc bằng nhau ∠BAD = ∠CAD khi kéo thả! (Nếu chỉ vẽ tia phân giác không cắt cạnh đối, đặt "onOpposite":false, "drawRay":true).

23. "arc", "arc3" & "sector" — Cung tròn tâm O từ A đến B, cung tròn qua 3 điểm & hình quạt tròn tô màu:
    {"op":"arc","pts":["O","A","B"],"dashed":false,"effect":"draw","step":"Vẽ cung tròn AB tâm O"}
    {"op":"arc3","pts":["A","M","B"],"dashed":false,"effect":"draw","step":"Vẽ cung tròn đi qua 3 điểm A, M, B"}
    {"op":"sector","pts":["O","A","B"],"fill":"rgba(37, 99, 235, 0.12)","explicitColor":true,"effect":"fade","step":"Tô hình quạt tròn OAB"}

24. "cone", "cylinder", "sphere" & "frustumCone" — Các khối tròn xoay 3D chuẩn SGK (tự vẽ elip đáy nét liền nửa trước + nét đứt nửa khuất sau + đường sinh bao ngoài):
    {"op":"cone","apex":"S","center":"O","rim":"A","r":2.2,"h":3.8,"effect":"chalk","step":"Dựng hình nón đỉnh S, tâm đáy O bán kính OA = 2.2"}
    {"op":"cylinder","pts":["O","A","O'"],"effect":"chalk","step":"Dựng hình trụ tâm đáy dưới O, bán kính OA, tâm đáy trên O'"}
    {"op":"sphere","pts":["O","A"],"effect":"draw","step":"Dựng mặt cầu tâm O bán kính OA"}
    {"op":"frustumCone","pts":["O","A","O'","A'"],"effect":"chalk","step":"Dựng hình nón cụt hai đáy (O; OA) và (O'; O'A')"}

================================================================================
MỤC 2B — BỘ MACRO & BATCH RÚT GỌN 70% CODE CHO AI (KHUYÊN DÙNG MẶC ĐỊNH!)
================================================================================
Thay vì viết 12–20 lệnh rời rạc cho phần khung cơ bản dễ nhầm nét đứt hoặc ngược đỉnh, HÃY ƯU TIÊN dùng các lệnh Macro 1 dòng dưới đây (MinNote tự động bung thành đồ thị ràng buộc động DAG + phân loại nét liền/đứt + gắn góc vuông chuẩn 100%):

25. "pyramid" — Dựng trọn gói Hình chóp 3D chỉ bằng 1 dòng (thay thế 12–15 lệnh lẻ!):
    {"op":"pyramid","name":"S.ABCD","baseType":"parallelogram","altitude":"SA","height":3.8,"effect":"chalk","step":"Dựng hình chóp S.ABCD đáy hình bình hành, SA vuông góc đáy"}
    - Tham số "name": "S.ABCD" (chóp tứ giác) hoặc "S.ABC" (chóp tam giác / tứ diện).
    - Tham số "baseType": "quad" (tứ giác lồi thường không có cạnh đối song song) | "parallelogram" | "rect" | "square" | "rhombus" | "trapezoid" (hình thang đáy lớn AD // BC) | "triangle" (tam giác).
    - Tham số "altitude":
      + "free"     : Chóp xiên tổng quát (đỉnh S lệch tự nhiên chống trùng nét chiếu).
      + "SA"       : Cạnh bên SA ⊥ mặt đáy (tự đặt S thẳng đứng trên A, tự xét nét đứt/liền cho SA và tự đóng dấu góc vuông tại A!).
      + "face_SAB" : Mặt bên (SAB) cân tại S và vuông góc với đáy (tự lấy trung điểm H của AB, dựng đường cao SH ⊥ AB nét đứt + góc vuông tại H!).
      + "center"   : Hình chóp đều S.ABCD hoặc S.ABC (tự dựng tâm đáy O/G, đặt S thẳng đứng trên tâm và nối đường cao nét đứt + góc vuông!).

26. "prism" — Dựng trọn gói Lăng trụ tam giác / Lăng trụ tứ giác / Hình hộp chữ nhật / Lập phương chỉ bằng 1 dòng:
    {"op":"prism","name":"ABC.A'B'C'","baseType":"triangle","upright":true,"height":3.5,"effect":"chalk","step":"Dựng lăng trụ đứng ABC.A'B'C'"}
    - Hỗ trợ cả "ABC.A'B'C'" ("baseType":"triangle") và "ABCD.A'B'C'D'" ("baseType":"parallelogram"); đặt "upright":true cho lăng trụ đứng/hình hộp chữ nhật (A' khóa ⊥ đáy, chỉ trượt chiều cao + góc vuông tại A) hoặc "upright":false cho lăng trụ xiên (A' là cha tự do); tự khóa B', C', D' bằng point_sum theo véc-tơ AA' và xét chuẩn nét khuất!

26b. "cube" — Hình lập phương CỨNG (BẮT BUỘC cho mọi bài lập phương, KHÔNG dùng prism/points):
    {"op":"cube","name":"ABCD.A'B'C'D'","edge":3.2,"depthAngle":40,"depthRatio":0.5,"effect":"chalk","step":"Dựng hình lập phương ABCD.A'B'C'D'"}
    - Cha duy nhất: A, B. A' = quay B quanh A 90° ⇒ mặt trước ABB'A' luôn là HÌNH VUÔNG thật; D = hướng chiều sâu (depthAngle, depthRatio — khóa); C, B', C', D' = tổng véc-tơ ⇒ 3 họ cạnh luôn song song & bằng nhau.
    - "depthAngle": 40 (lệch phải, đỉnh khuất D: AD, DC, DD' nét đứt) | 135 (lệch trái, đỉnh khuất C: BC, CD, CC' nét đứt). "x","y" = vị trí đỉnh A. "depthDrag": true nếu muốn D là cha thứ 3 (đổi góc nhìn).

27. "points" — Khai báo gộp toàn bộ các đỉnh tự do trong 1 dòng duy nhất:
    {"op":"points","pts":{"A":[-2.8,0.2],"B":[-1.7,-1.8],"C":[1.7,-2.2],"D":[3.2,0.5],"S":[0.8,3.8]},"effect":"pop","step":"Đặt các đỉnh gốc"}

28. "segments" — Nối gộp hàng loạt đoạn thẳng nét liền ("solid") và nét đứt ("dashed") trong 1 dòng:
    {"op":"segments","solid":["B-M","M-N","M-I"],"dashed":["A-C","B-D","S-O","A-M"],"aux":true,"effect":"draw","step":"Nối các đường chéo đáy, giao tuyến và cạnh phụ"}

29. Bộ 7 Macro Hình Phẳng 2D Khóa Động Tuyệt Đối (1 dòng = đủ dựng hình ngầm + đường chính):
    - Tam giác đều (khóa bằng phép quay 60°):
      {"op":"equilateral_triangle","pts":["A","B","C"],"effect":"chalk","step":"Dựng tam giác đều ABC"}
    - Hình vuông phẳng (khóa bằng phép quay 90° + point_sum + góc vuông):
      {"op":"square_2d","pts":["A","B","C","D"],"effect":"chalk","step":"Dựng hình vuông ABCD"}
    - Đường tròn ngoại tiếp tam giác (tự dựng giao 2 trung trực ẩn lấy tâm O + vẽ đường tròn đi khít qua A, B, C):
      {"op":"circumcircle","center":"O","pts":["A","B","C"],"drawCircle":true,"drawCenter":true,"effect":"draw","step":"Đường tròn ngoại tiếp (O) của tam giác ABC"}
    - Đường tròn nội tiếp tam giác (tự dựng giao 2 phân giác trong lấy tâm I + hạ tiếp điểm D lên BC + vẽ đường tròn tiếp xúc 3 cạnh):
      {"op":"incircle","center":"I","foot":"D","pts":["A","B","C"],"drawCircle":true,"effect":"draw","step":"Đường tròn nội tiếp (I) của tam giác ABC"}
    - Trực tâm H (tự hạ các đường cao foot_perp + lấy giao điểm đồng quy H):
      {"op":"orthocenter","id":"H","pts":["A","B","C"],"drawAltitudes":true,"effect":"pop","step":"Dựng ba đường cao đồng quy tại trực tâm H"}
    - Trọng tâm G (tự lấy trung điểm cạnh + chia tỉ lệ trung tuyến 2/3):
      {"op":"centroid","id":"G","pts":["A","B","C"],"drawMedians":true,"effect":"pop","step":"Dựng trọng tâm G của tam giác ABC"}
    - Hai tiếp tuyến kẻ từ điểm ngoài p tới đường tròn (center, rim) (tự dựng 2 tiếp điểm Thales B, C + nối AB, AC, bán kính OB, OC + gắn 2 góc vuông tại B, C):
      {"op":"tangents_from_point","p":"A","center":"O","rim":"R","pts":["B","C"],"drawRadii":true,"effect":"glow","step":"Kẻ hai tiếp tuyến AB, AC từ A tới đường tròn (O)"}

================================================================================
MỤC 3 — HƯỚNG DẪN DỰNG HÌNH CỤ THỂ TỪNG BƯỚC CHO 6+ DẠNG TOÁN TRỌNG TÂM
================================================================================

--- DẠNG 1: CHÓP TỨ GIÁC LỒI THƯỜNG S.ABCD (GIAO TUYẾN, GIAO ĐIỂM ĐƯỜNG-MẶT, THIẾT DIỆN) ---
1. Dựng nhanh bằng Macro (1 dòng thay cho 9 dòng):
   - Gọi ngay {"op":"pyramid","name":"S.ABCD","baseType":"quad","altitude":"free","height":3.8} -> tự động đặt bộ tọa độ chuẩn chống trùng ảnh chiếu A(-2.8, 0.2), B(-1.7, -1.8), C(1.7, -2.2), D(3.2, 0.5), S(0.8, 3.8) (chỉ cạnh đáy sau AD nét đứt; AB, BC, CD, SA, SB, SC, SD nét liền; góc chiếu BMN < 165°).
2. Quy tắc xét Nét Liền / Nét Đứt tuyệt đối chính xác:
   - Mặt nhìn thấy phía trước gồm 3 mặt bên: (SAB), (SBC), (SCD) -> mọi đoạn nằm trên 3 mặt này (BM, MN, MI...) vẽ NÉT LIỀN (đưa vào mảng "solid" của "segments").
   - Mặt khuất phía sau (SAD), mặt đáy dưới (ABCD) và mọi đường xuyên qua lòng khối chóp (AC, BD, SO, AM, BK, BI, cạnh thiết diện AI trên mặt SAD) BẮT BUỘC vẽ NÉT ĐỨT (đưa vào mảng "dashed" của "segments" hoặc "dashedEdges":["A-I"]).
3. Quy trình chuẩn tìm giao điểm I = SD ∩ (ABM) & thiết diện ABMI:
   - Bước 1: Kẻ đường chéo đáy AC, BD nét đứt -> gọi O = intersection_ll(l1:"A-C", l2:"B-D") -> nối giao tuyến SO = (SAC) ∩ (SBD) nét đứt.
   - Bước 2: Trong (SAC), nối AM nét đứt cắt SO tại K = intersection_ll(l1:"A-M", l2:"S-O").
   - Bước 3: Trong (SBD), kéo dài BK cắt SD tại I = intersection_ll(l1:"B-K", l2:"S-D", drawExtensions:true, dashedExtensions:true).
   - Bước 4: Khép kín & tô thiết diện bằng 1 lệnh connect_polygon(pts:["A","B","M","I"], dashedEdges:["A-I"], fill:"rgba(240, 124, 0, 0.12)", explicitColor:true).
   - Bước 5: Nếu tìm giao tuyến 2 mặt chứa 2 đường song song (như MN // CD => (AMN) ∩ (ABCD)): CẤM dùng intersection_ll giữa MN và CD; bắt buộc dùng "line_parallel" qua A song song CD!

--- DẠNG 2: CHÓP CÓ ĐÁY HÌNH BÌNH HÀNH / CHỮ NHẬT / VUÔNG / THOI & CÁC TRƯỜNG HỢP ĐƯỜNG CAO ---
1. Dựng nhanh chuẩn SGK bằng 1 lệnh "pyramid":
   - TH1 (SA ⊥ đáy): {"op":"pyramid","name":"S.ABCD","baseType":"rect","altitude":"SA","height":3.8} -> tự khóa C = B + D - A, đặt S thẳng đứng trên A, vẽ AB, AD, SA nét đứt và đóng dấu 2 góc vuông tại A!
   - TH2 ((SAB) cân tại S và ⊥ đáy): {"op":"pyramid","name":"S.ABCD","baseType":"square","altitude":"face_SAB","height":3.8} -> tự dựng trung điểm H của AB, đường cao SH ⊥ AB nét đứt và góc vuông tại H!
   - TH3 (Chóp tứ giác đều S.ABCD): {"op":"pyramid","name":"S.ABCD","baseType":"square","altitude":"center","height":3.8} -> tự dựng hai đường chéo AC, BD nét đứt, tâm O = AC ∩ BD, đường cao SO ⊥ đáy nét đứt và góc vuông tại O!
2. Nếu dựng nguyên tử thủ công: đặt A(-2.2, 0.0), B(-3.6, -1.8), D(2.6, 0.0) và BẮT BUỘC khóa C bằng point_sum(a:"B", b:"D", c:"A"); tuyệt đối cấm chấm tay 4 đỉnh point_free cho đáy hình bình hành!

--- DẠNG 3: LĂNG TRỤ TAM GIÁC, LĂNG TRỤ TỨ GIÁC, HÌNH HỘP CHỮ NHẬT / LẬP PHƯƠNG ---
1. Dựng nhanh bằng 1 lệnh "prism":
   - Lăng trụ đứng tam giác: {"op":"prism","name":"ABC.A'B'C'","baseType":"triangle","upright":true,"height":3.5} (AC nét đứt; đáy trên và 3 cạnh bên AA', BB', CC' nét liền).
   - Hình hộp đứng: {"op":"prism","name":"ABCD.A'B'C'D'","baseType":"parallelogram","upright":true,"height":3.5} (chỉ 3 cạnh xuất phát từ góc khuất sau A là AB, AD, AA' nét đứt; 9 cạnh khung còn lại nét liền!).
   - Hình lập phương: LUÔN {"op":"cube","name":"ABCD.A'B'C'D'","depthAngle":40} (KHÔNG dùng prism/points — prism không bảo đảm các cạnh bằng nhau).
2. Nếu dựng nguyên tử: chỉ đặt 1 đỉnh đáy trên A' (lăng trụ xiên) bằng point_free, toàn bộ B', C', D' BẮT BUỘC dùng point_sum theo véc-tơ AA'; lăng trụ đứng: A' = line_perp {through:"A", line:"A-D", "drag":true}.
3. Thiết diện của hình lập phương (VD mặt phẳng (DKF), K, F trung điểm A'B', B'C'):
   - K, F = midpoint → trong (A'B'C'D'): P = intersection_ll(K-F, D'-A'), Q = intersection_ll(K-F, D'-C') (drawExtensions) → trong (ADD'A'): I = intersection_ll(D-P, A-A') → trong (CDD'C'): N = intersection_ll(D-Q, C-C') → connect_polygon D-I-K-F-N (cạnh nằm trên mặt khuất vào "dashedEdges").
   - Mặt phẳng song song với một mặt/đường đã có: mỗi cạnh thiết diện dựng bằng line_parallel + intersection_ll ĐỒNG PHẲNG, không bao giờ chấm tay.
4. Vẽ riêng một mặt dạng thật (VD hình vuông A'B'C'D' bên cạnh khối): id mới A1, B1 với "label":"A'","B'" và "flat": true; D1 = rotate(B1 quanh A1, 90°), C1 = point_sum(B1, D1, A1); K1, F1 = midpoint ("label":"K","F"). Mẫu đầy đủ: prompts/examples/cube_section_DKF_unfolded.json.

--- DẠNG 4: GÓC ĐƯỜNG-MẶT, GÓC NHỊ DIỆN & KHOẢNG CÁCH (QUY TRÌNH 2 BƯỚC "foot_perp" CHUẨN SGK) ---
1. Góc giữa đường thẳng SC và mặt đáy (ABCD) (khi SH ⊥ đáy tại H): nối hình chiếu HC nét đứt, đánh dấu angle_mark(a:"S", v:"C", b:"H", n:1).
2. Khoảng cách từ chân đường cao A đến mặt bên nghiêng (SBC) (Mô hình mẫu 2 bước vuông góc):
   - Bước 1: Dựng đường vuông góc từ A tới cạnh đáy BC tại E (trùng B nếu góc ABC = 90°; trung điểm BC nếu tam giác ABC cân tại A; hoặc foot_perp(p:"A", a:"B", b:"C")), nối SE nét liền trên mặt (SBC).
   - Bước 2: Trong tam giác vuông SAE, gọi {"op":"foot_perp","id":"H","p":"A","a":"S","b":"E","drawDropSegment":true,"dashed":true,"markRightAngle":true,"aux":true,"effect":"glow"} => AH = d(A, (SBC)).

--- DẠNG 5: ĐƯỜNG TRÒN 2D (O; R) — TIẾP TUYẾN, CÁT TUYẾN, CUNG QUẠT & TỨ GIÁC NỘI TIẾP ---
1. Khởi tạo đường tròn ("is3D": false):
   - Đặt O(0,0), mốc R(2.2,0) (show:false, noDot:true, label:""), vẽ circle(center:"O", rim:"R") (hoặc dùng trực tiếp circle(center:"O", r:2.2)).
2. Hai tiếp tuyến AB, AC từ điểm ngoài A(-4.4, 0) (rút gọn còn 3 lệnh!):
   - Gọi {"op":"tangents_from_point","p":"A","center":"O","rim":"R","pts":["B","C"],"drawRadii":true} -> khóa cứng góc OBA = OCA = 90.000° bằng đường tròn Thales đường kính OA!
   - Nối OA và BC bằng {"op":"segments","solid":["O-A","B-C"],"aux":true}, lấy H = intersection_ll(l1:"O-A", l2:"B-C") và gắn right_angle tại H -> thỏa mãn chính xác OH·OA = R²!
3. Cát tuyến ADE & Tứ giác nội tiếp tổng quát:
   - Cát tuyến từ A: lấy D = point_on_circle(center:"O", rim:"R", angleDeg:35), giao điểm thứ hai E = intersection_lc(line:"A-D", circle:"O-R", which:0).
   - Đa giác nội tiếp tổng quát: chọn angleDeg không đối xứng (VD: 112°, 210°, 330°) để tránh cân/vuông giả.

--- DẠNG 6: TAM GIÁC PHẲNG 2D, ĐA GIÁC ĐỀU, PHÂN GIÁC & CÁC TÂM ĐẶC BIỆT ---
1. Tam giác nhọn lệch chuẩn ("is3D": false): dùng {"op":"points","pts":{"A":[-0.9,3.0],"B":[-3.2,-1.8],"C":[3.0,-1.8]}} + connect_polygon(["A","B","C"]).
   - Tam giác đặc biệt — chỉ khai báo đúng số cha, phần còn lại khóa (xem MỤC 1B-F):
     + Vuông tại A: A, B cha + {"op":"line_perp","id":"C","through":"A","line":"A-B","k":0.7,"drawSegment":false,"drag":true}.
     + Cân tại A: B, C cha + {"op":"midpoint","id":"H","s":"B-C","show":false} + {"op":"line_perp","id":"A","through":"H","line":"B-C","k":0.8,"drawSegment":false,"drag":true}.
     + Đều: {"op":"equilateral_triangle","pts":["A","B","C"]}.
   - Tứ giác đặc biệt: hình vuông "square_2d"; hình chữ nhật A, B cha + D = line_perp(through A, line A-B, drag) + C = point_sum(B, D, A); hình thoi A, B cha + D = rotate(B quanh A, góc A) + C = point_sum; hình thang A, B, D cha + C = line_parallel(through D, line A-B, drag).
2. Dùng ngay Macro 1 dòng cho các yếu tố cổ điển:
   - Tam giác đều / Hình vuông: "equilateral_triangle" / "square_2d" (hoặc dùng "rotate" góc 60°, 90°).
   - Trực tâm H, Trọng tâm G, Đường tròn ngoại tiếp (O), Đường tròn nội tiếp (I): gọi trực tiếp "orthocenter", "centroid", "circumcircle", "incircle".
   - Đường phân giác trong AD cắt BC tại D: gọi {"op":"angle_bisector","id":"D","a":"B","o":"A","b":"C","onOpposite":true,"drawSegment":true}.
3. Khối tròn xoay 3D ("spaceType": "revolution_3d", "is3D": true):
   - Dùng "cone", "cylinder", "sphere", "frustumCone" để dựng hình nón, hình trụ, mặt cầu, nón cụt kèm thiết diện qua trục hoặc thiết diện song song đáy.

================================================================================
MỤC 4 — HỆ THỐNG HIỆU ỨNG CHUYỂN ĐỘNG TỪNG NÉT ("motion" & "effect")
================================================================================
1. Gắn thuộc tính diễn hoạt trên từng lệnh của "ops":
   - "effect": "chalk" (nét phấn viết bảng cho cạnh chính), "draw" (nét mực mượt cho đường tròn/nét đứt), "pop" (nảy điểm mới), "glow" (phát sáng nhấn giao tuyến/tiếp tuyến/khoảng cách), "pulse" (nhịp nhấn kết luận), "fade" (hiện êm miền tô/góc vuông), "wipe", "stamp".
   - Tùy chọn thêm: "rev": true (vẽ ngược từ b về a), "durationMul": 0.6..1.5, "easing": "smootherstep"|"easeInOut"|"spring"|"bump", và lời dẫn ngắn gọn "step".
2. Chọn Preset trong "motion":
   - "domiinh" (bài giảng phấn bảng kèm bàn tay cầm bút "handPen": true — khuyên dùng cho 3D & SGK), "manim" (hoạt họa sắc nét 2D/đường tròn), hoặc "3d_standard" (khối đa diện trực quan).

================================================================================
MỤC 5 — VÍ DỤ JSON MẪU CHUẨN RÚT GỌN MACRO (10 LỆNH THAY CHO 29 LỆNH!) & Ô ĐỀ BÀI
================================================================================
Dưới đây là mẫu JSON hoàn chỉnh chuẩn "mn-geo-motion/2.0" giải trọn vẹn bài toán 3 câu (Chóp tứ giác lồi S.ABCD, giao tuyến SO = (SAC) ∩ (SBD), giao điểm I = SD ∩ (ABM), thiết diện ABMI và giao tuyến Ax = (AMN) ∩ (ABCD) // CD) chỉ với ĐÚNG 10 LỆNH "ops" nhờ hệ thống Macro & Batch (ngắn hơn >70% nhưng vẫn khóa chặt 100% ràng buộc động!).
Hãy xuất đầu ra của bạn theo ĐÚNG chuẩn này (chỉ trả về duy nhất 1 khối JSON, không thêm văn bản ngoài JSON):

{
  "schema": "mn-geo-motion/2.0",
  "title": "Chóp S.ABCD — Thiết diện (ABMI) & Giao tuyến Ax // CD",
  "is3D": true,
  "meta": {
    "title": "Chóp S.ABCD — Thiết diện (ABMI) & Giao tuyến Ax // CD",
    "problem": "Cho hình chóp S.ABCD có đáy ABCD là tứ giác lồi, AC cắt BD tại O. Gọi M, N lần lượt là trung điểm của SC và SD. a) Tìm giao tuyến của (SAC) và (SBD). b) Tìm giao điểm I của SD với (ABM) và dựng thiết diện ABMI. c) Tìm giao tuyến của (AMN) và (ABCD).",
    "is3D": true,
    "spaceType": "solid_3d"
  },
  "checks": {
    "gate1_space": "Hình không gian 3D (solid_3d). Dùng Macro pyramid quad tạo đáy tứ giác lồi tổng quát ABCD không có cặp cạnh đối song song và đỉnh S phía trên đáy (+y hướng lên).",
    "gate2_dag_anchors": ["A", "B", "C", "D", "S"],
    "gate3_coplanar_intersections": [
      "O = AC ∩ BD đồng phẳng trong (ABCD), det != 0",
      "K = AM ∩ SO đồng phẳng trong (SAC), det != 0",
      "I = BK ∩ SD đồng phẳng trong (SBD), det != 0",
      "MN // CD (đường trung bình tam giác SCD) -> cấm dùng intersection_ll, dùng line_parallel Ax // CD"
    ],
    "gate4_dashed_edges": ["AD", "AC", "BD", "SO", "AM", "BK", "AI"],
    "gate5_motion_story": "Preset domiinh: dựng khung chóp S.ABCD -> kẻ đường chéo tìm giao tuyến SO -> trung điểm M, N và giao điểm K, I -> tô thiết diện ABMI -> phát sáng giao tuyến Ax // CD."
  },
  "ops": [
    { "op": "pyramid", "name": "S.ABCD", "baseType": "quad", "altitude": "free", "height": 3.8, "effect": "chalk", "step": "Dựng hình chóp tứ giác lồi S.ABCD (cạnh đáy sau AD nét đứt)" },
    { "op": "segments", "dashed": ["A-C", "B-D"], "aux": true, "effect": "draw", "step": "Kẻ hai đường chéo khuất AC và BD trong đáy" },
    { "op": "intersection_ll", "id": "O", "l1": "A-C", "l2": "B-D", "effect": "pop", "easing": "spring", "step": "Trong (ABCD), gọi O = AC ∩ BD" },
    { "op": "midpoint", "id": "M", "a": "S", "b": "C", "effect": "pop", "easing": "spring", "step": "Lấy M là trung điểm của SC" },
    { "op": "midpoint", "id": "N", "a": "S", "b": "D", "effect": "pop", "easing": "spring", "step": "Lấy N là trung điểm của SD" },
    { "op": "segments", "solid": ["M-N"], "dashed": ["S-O", "A-M"], "aux": true, "effect": "draw", "step": "Câu a) Nối giao tuyến SO = (SAC) ∩ (SBD), đoạn AM và đường trung bình MN" },
    { "op": "intersection_ll", "id": "K", "l1": "A-M", "l2": "S-O", "effect": "pop", "easing": "spring", "step": "Trong (SAC), gọi K = AM ∩ SO" },
    { "op": "intersection_ll", "id": "I", "l1": "B-K", "l2": "S-D", "drawExtensions": true, "dashedExtensions": true, "effect": "pulse", "durationMul": 1.3, "step": "Câu b) Trong (SBD), kéo dài BK cắt SD tại I = SD ∩ (ABM)" },
    { "op": "connect_polygon", "pts": ["A", "B", "M", "I"], "dashedEdges": ["A-I"], "fill": "rgba(240, 124, 0, 0.12)", "explicitColor": true, "aux": true, "effect": "fade", "durationMul": 1.2, "step": "Khép kín và tô miền thiết diện tứ giác ABMI" },
    { "op": "line_parallel", "id": "x", "through": "A", "a": "C", "b": "D", "k": 0.95, "asLine": true, "bothSides": false, "noDot": true, "aux": true, "effect": "glow", "durationMul": 1.4, "step": "Câu c) Dựng giao tuyến Ax = (AMN) ∩ (ABCD) song song với CD" }
  ],
  "motion": {
    "preset": "domiinh",
    "fps": 24,
    "durationSec": 10,
    "holdEndSec": 1.5,
    "loop": true,
    "handPen": true,
    "followCamera": true,
    "orbit3d": false
  }
}

================================================================================
ĐỀ BÀI TOÁN CẦN DỰNG HÌNH TRÊN MINNOTE:
================================================================================
"""
[DÁN VĂN BẢN ĐỀ BÀI HOẶC ĐÍNH KÈM ẢNH CHỤP ĐỀ BÀI VÀO ĐÂY]
"""
```
