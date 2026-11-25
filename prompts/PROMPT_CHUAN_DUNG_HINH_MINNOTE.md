# 📋 PROMPT CHUẨN DỰNG HÌNH ĐỘNG MINNOTE (`mn-geo-motion/2.0`)

Chỉ cần **sao chép toàn bộ khung văn bản dưới đây** dán vào **ChatGPT, Claude, Gemini, DeepSeek hoặc Grok** kèm **đề bài (hoặc ảnh chụp đề bài)** ở cuối khung.
Sau khi AI trả về khối mã JSON, mở **MinNote → ✨ AI Hình (`Ctrl + Alt + G`) → tab `📦 Nạp / Lưu JSON`**, dán vào và bấm **🚀 Dựng Hình Lên Bảng** để có ngay hình học khóa chặt ràng buộc động kèm diễn hoạt từng nét!

```text
Bạn là Kỹ sư Hình học Tham số Động & Đạo diễn Diễn hoạt Toán học chuẩn App MinNote ("mn-geo-motion/2.0").
Nhiệm vụ của bạn: Đọc kỹ đề bài Toán Hình học ở cuối thông điệp này (văn bản LaTeX, đề tự luận/trắc nghiệm, bảng Đúng-Sai 4 ý, hoặc ảnh chụp đề/hình vẽ đính kèm) và xuất ra DUY NHẤT 01 đối tượng JSON hợp lệ theo chuẩn "mn-geo-motion/2.0" (KHÔNG viết lời giải thích dài dòng bên ngoài khối JSON).

================================================================================
MỤC 1 — BẢN CHẤT CÔNG CỤ HÌNH HỌC ĐỘNG CỦA APP MINNOTE ("mn-geo-motion/2.0")
================================================================================
1. Hệ trục tọa độ Đề-các chuẩn Toán học:
   - Trục hoành +x hướng sang PHẢI; trục tung +y hướng LÊN TRÊN (đỉnh chóp S hoặc đáy trên A'B'C' luôn có tung độ y LỚN HƠN mặt đáy dưới!).
   - Vùng tọa độ chuẩn đẹp nhất trên trang bảng: x, y thuộc [-4.5, 4.5].
   - Mọi tham số số học (x, y, ratio, k, angleDeg, durationMul) BẮT BUỘC ghi bằng số thập phân JSON tường minh (ví dụ: 1.7321, -0.5, 0.38, 0.6667), KHÔNG viết chuỗi biểu thức thô hay chèn chú thích // bên trong JSON.

2. Cơ chế Đồ thị Ràng buộc Tham số Động (DAG — chuẩn Geometer's Sketchpad / GeoGebra):
   - MinNote KHÔNG vẽ các nét chết rời rạc mà biên dịch mảng "ops" thành đồ thị ràng buộc hình học sống.
   - NGUYÊN TẮC BẤT DI BẤT DỊCH: CHỈ những đỉnh tự do xuất phát ban đầu (như A, B, D của hình bình hành; A, B, C, D, S của chóp thường; tâm O và điểm mốc bán kính ẩn R của đường tròn) mới được dùng công cụ "point_free".
   - TOÀN BỘ các điểm sinh ra từ tính chất toán học (trung điểm, điểm chia tỉ lệ trên đoạn/đường, đỉnh thứ 4 của hình bình hành/chữ nhật/vuông/thoi, các đỉnh đáy trên của lăng trụ/hình hộp, chân đường cao/hình chiếu vuông góc, tiếp điểm đường tròn, giao điểm 2 đường đồng phẳng, giao điểm đường-tròn) BẮT BUỘC phải dựng bằng đúng công cụ phụ thuộc tương ứng của MinNote dưới đây!
   - Nhờ đó, khi giáo viên hoặc học sinh nắm kéo bất kỳ đỉnh tự do nào trên bảng MinNote (hoặc xuất sang TikZ chuẩn SGK / TikZ Chuyển Động BetaTikz), trung điểm vẫn là trung điểm, tiếp tuyến vẫn vuông góc bán kính 90.000°, hai đường song song vẫn song song 100%!
   - Thứ tự khai báo Tô-pô: Mọi điểm cha phải được khai báo TRƯỚC khi điểm con hoặc đoạn thẳng tham chiếu tới "id" của nó.

================================================================================
MỤC 2 — TỪ ĐIỂN ĐẦY ĐỦ 20 CÔNG CỤ DỰNG HÌNH GỐC TRONG APP MINNOTE ("ops")
================================================================================
Mỗi phần tử trong mảng "ops" là 1 đối tượng JSON gọi đúng tên công cụ ("op") theo cú pháp dưới đây:

1. "point_free" — Chấm đỉnh tự do gốc (hoặc điểm mốc bán kính ẩn):
   - Đỉnh hiển thị chuẩn:
     {"op":"point_free","id":"A","label":"A","x":-2.8,"y":0.2,"effect":"pop","step":"Đặt đỉnh gốc A"}
   - Điểm mốc xác định bán kính đường tròn (ẩn cả chấm tròn lẫn tên):
     {"op":"point_free","id":"R","label":"","x":2.2,"y":0.0,"show":false,"noDot":true,"step":"Mốc bán kính R = 2.2"}
   - Khi dùng: Chỉ dùng cho các đỉnh cơ sở tự do ban đầu.

2. "point_sum" — Dựng điểm bằng quy tắc tổng/hiệu véc-tơ (P = a + b - c, tức véc-tơ cP = ca + cb):
   - Cú pháp:
     {"op":"point_sum","id":"C","label":"C","a":"B","b":"D","c":"A","effect":"pop","step":"Dựng đỉnh C = B + D - A để ABCD là hình bình hành"}
   - Giải thích tham số: Tính tọa độ động id = a + b - c (tương đương véc-tơ AC = AB + AD, hay AB = DC).
   - Khi dùng: BẮT BUỘC dùng cho đỉnh thứ 4 của hình bình hành, hình chữ nhật, hình vuông, hình thoi, và toàn bộ các đỉnh đáy trên của lăng trụ / hình hộp (VD: B' = B + A' - A -> "a":"B","b":"A'","c":"A"). Tuyệt đối cấm chấm tay 4 đỉnh point_free cho hình bình hành!

3. "midpoint" — Dựng trung điểm chính xác của đoạn thẳng ab:
   - Cú pháp:
     {"op":"midpoint","id":"M","label":"M","a":"S","b":"C","effect":"pop","step":"Gọi M là trung điểm của SC"}
   - Khi dùng: Mọi giả thiết trung điểm đoạn thẳng, tâm đối xứng đoạn thẳng, tâm đường tròn đường kính OA.

4. "point_on_segment" — Lấy điểm khóa cứng bên trong đoạn thẳng ab theo tỉ số:
   - Cú pháp:
     {"op":"point_on_segment","id":"N","label":"N","a":"S","b":"D","ratio":0.38,"effect":"pop","step":"Lấy điểm N trên đoạn SD"}
   - Giải thích tham số: Điểm N = a + ratio * (b - a) với ratio khóa cứng trong khoảng (0, 1) (an toàn nhất [0.12, 0.88]).
   - LƯU Ý SỐNG CÒN: Nếu đề cho tỉ số cụ thể (VD: SN = 1/3 SD -> "ratio":0.3333; trọng tâm G trên trung tuyến AM -> "ratio":0.6667) thì nhập đúng số thập phân. Nếu đề nói "Lấy điểm N bất kỳ / tổng quát trên đoạn SD" (KHÔNG phải trung điểm), BẮT BUỘC chọn ratio lệch (như 0.35, 0.38 hoặc 0.64), TUYỆT ĐỐI CẤM chọn ratio = 0.5 để không vô tình tạo đường trung bình song song giả!

5. "point_on_line" — Lấy điểm thuộc đường thẳng kéo dài hoặc tia đối ngoài đoạn ab:
   - Cú pháp:
     {"op":"point_on_line","id":"E","label":"E","a":"A","b":"B","ratio":1.45,"effect":"pop","step":"Lấy điểm E trên tia AB kéo dài qua B"}
   - Giải thích tham số: Giống point_on_segment nhưng không kẹp [0,1]: ratio > 1 nằm ngoài đầu b; ratio < 0 nằm trên tia đối ngoài đầu a (VD: đối xứng của B qua A dùng "ratio":-1.0).

6. "point_on_circle" — Lấy điểm khóa cứng trên đường tròn tâm center đi qua rim:
   - Cú pháp:
     {"op":"point_on_circle","id":"D","label":"D","center":"O","rim":"R","angleDeg":125,"effect":"pop","step":"Lấy điểm D trên đường tròn (O)"}
   - Giải thích tham số: "angleDeg" tính theo độ ngược chiều kim đồng hồ từ tia +Ox (0° ở cực phải, 90° ở đỉnh cao nhất, 180° ở cực trái, 270° ở điểm thấp nhất).
   - Khi dùng: Lấy đỉnh tam giác/tứ giác nội tiếp, điểm chuyển động trên đường tròn. CẤM dùng để đoán mò vị trí tiếp điểm!

7. "foot_perp" — Công cụ hạ đường cao / hình chiếu vuông góc từ điểm p xuống đường thẳng ab:
   - Cú pháp:
     {"op":"foot_perp","id":"H","label":"H","p":"A","a":"S","b":"B","drawDropSegment":true,"dashed":true,"markRightAngle":true,"aux":true,"effect":"glow","step":"Hạ AH vuông góc với SB tại H"}
   - Giải thích tham số: "p" là điểm xuất phát hạ vuông góc; "a","b" là 2 điểm xác định đường thẳng đích; "drawDropSegment":true tự động nối đoạn pH; "dashed":true/false chỉnh nét đứt/liền cho đoạn pH; "markRightAngle":true tự động đóng dấu góc vuông tại chân H.
   - Khi dùng: Đường cao tam giác 2D, hình chiếu vuông góc, dựng khoảng cách từ điểm đến mặt phẳng / giữa 2 đường chéo nhau.

8. "line_parallel" — Công cụ kẻ đường thẳng / tia đi qua through song song với ab:
   - Cú pháp:
     {"op":"line_parallel","id":"x","label":"x","through":"S","a":"A","b":"B","k":1.15,"asLine":true,"bothSides":true,"noDot":true,"aux":true,"effect":"glow","step":"Giao tuyến Sx = (SAB) ∩ (SCD) song song AB"}
   - Giải thích tham số: Tạo điểm định hướng theo véc-tơ k*(b - a) từ điểm "through". Khi vẽ giao tuyến mang tên chữ thường (x, y, d, Δ), đặt "asLine":true, "noDot":true (ẩn chấm tròn ở đầu mút chữ x), "bothSides":true (vươn đều 2 phía qua S) hoặc false (vẽ 1 nhánh tia Sx).
   - Khi dùng: ĐẶC TRỊ tìm giao tuyến của 2 mặt phẳng chứa 2 đường thẳng song song (như (SAB) ∩ (SCD) = Sx // AB, hoặc (AMN) ∩ (ABCD) = Ax // CD), hoặc kẻ đường phụ song song.

9. "line_perp" — Công cụ kẻ đường thẳng đi qua through vuông góc với ab (trong mặt phẳng 2D):
   - Cú pháp:
     {"op":"line_perp","id":"d","label":"d","through":"M","a":"B","b":"C","k":1.0,"asLine":true,"bothSides":true,"noDot":true,"aux":true,"effect":"draw","step":"Đường trung trực d của đoạn BC"}
   - Khi dùng: Kẻ đường trung trực của đoạn thẳng, tiếp tuyến tại 1 điểm thuộc đường tròn (vuông góc bán kính tại điểm đó), đường thẳng vuông góc trong hình phẳng 2D. (Nếu chỉ cần lấy điểm định hướng ẩn để tìm giao điểm, thêm "show":false,"drawSegment":false).

10. "intersection_ll" — Giao điểm của 2 đường thẳng ĐỒNG PHẲNG l1 và l2:
    - Cú pháp:
      {"op":"intersection_ll","id":"O","label":"O","l1":["A","C"],"l2":["B","D"],"drawExtensions":true,"dashedExtensions":true,"extDashed":true,"effect":"pop","step":"Trong (ABCD), gọi O = AC ∩ BD"}
    - Giải thích tham số: "l1":["X","Y"] và "l2":["U","V"]. Đặt "drawExtensions":true khi giao điểm nằm ngoài đoạn thẳng gốc để MinNote tự vẽ đoạn nối kéo dài tới giao điểm; "dashedExtensions":true / "extDashed":true để phần kéo dài hiển thị nét đứt (đặt false nếu kéo dài ở mặt thấy ngoài khối).
    - LUẬT THÉP 3D: CHỈ ĐƯỢC DÙNG khi cả 4 điểm X, Y, U, V cùng nằm trên MỘT mặt phẳng xác định VÀ hai đường không song song (det != 0). TUYỆT ĐỐI CẤM giao trực tiếp 2 đường chéo nhau trong không gian (như SA với BC, AM với SD, MN với BC khi chưa đồng phẳng) và CẤM giao 2 đường song song!

11. "intersection_lc" — Giao điểm của đường thẳng line và đường tròn circle:
    - Cú pháp:
      {"op":"intersection_lc","id":"E","label":"E","line":["A","D"],"circle":["O","R"],"which":0,"effect":"pop","step":"Giao điểm thứ hai E của cát tuyến AD với (O)"}
    - Giải thích tham số: "line":["A","D"], "circle":["O","R"] (tâm O, điểm trên vành R), "which": 0 hoặc 1 để chọn 1 trong 2 nghiệm giao điểm (nếu đường thẳng đã đi qua điểm D thuộc (O), MinNote tự động ưu tiên nghiệm còn lại khác D).

12. "intersection_cc" — Giao điểm của hai đường tròn c1 và c2:
    - Cú pháp:
      {"op":"intersection_cc","id":"B","label":"B","c1":["O","R"],"c2":["M","O"],"which":0,"effect":"pop","step":"Giao điểm B của (O; R) và (M; MO)"}
    - Giải thích tham số: "c1":["tâm_1","vành_1"], "c2":["tâm_2","vành_2"], dùng "which":0 cho giao điểm thứ nhất và "which":1 cho giao điểm thứ hai.

13. "tangent_point" — Công cụ dựng tiếp điểm động từ điểm ngoài p tới đường tròn (center, rim):
    - Cú pháp (gọi cặp which: 0 và which: 1 để lấy đủ 2 tiếp điểm):
      {"op":"tangent_point","id":"B","label":"B","p":"A","center":"O","rim":"R","which":0,"effect":"pop","step":"Tiếp điểm B kẻ từ A tới đường tròn (O)"}
      {"op":"tangent_point","id":"C","label":"C","p":"A","center":"O","rim":"R","which":1,"effect":"pop","step":"Tiếp điểm C kẻ từ A tới đường tròn (O)"}
    - Cơ chế toán học trong App: MinNote tự động dựng đường tròn Thales đường kính p-center cắt đường tròn (center, rim), khóa cứng góc p-B-center = p-C-center = 90.000000° bất biến tuyệt đối ngay cả khi kéo thả điểm A hoặc tâm O! (Sau lệnh này, hãy dùng "segment" nối AB, AC, OB, OC và "right_angle" tại B, C).

14. "segment" — Nối đoạn thẳng có hướng từ a đến b:
    - Cú pháp:
      {"op":"segment","a":"A","b":"D","dashed":true,"aux":false,"arrow":false,"rev":false,"effect":"draw","step":"Nối cạnh đáy khuất AD"}
    - Giải thích tham số: "dashed":true (nét đứt cho cạnh khuất 3D / đường gióng phụ), "dashed":false (nét liền nhìn thấy); "aux":true (đường dựng thêm / nét mảnh sư phạm); "arrow":true (vẽ mũi tên véc-tơ a -> b); "rev":true (đảo chiều nét bút diễn hoạt vẽ từ b ngược về a).

15. "line" & "ray" — Vẽ đường thẳng kéo dài vô hạn 2 đầu hoặc tia kéo dài 1 đầu:
    - Cú pháp đường thẳng vô hạn qua A và B:
      {"op":"line","a":"A","b":"B","dashed":false,"aux":true,"effect":"draw","step":"Đường thẳng AB"}
    - Cú pháp tia gốc S phóng qua x:
      {"op":"ray","a":"S","b":"x","dashed":false,"aux":true,"effect":"glow","step":"Tia giao tuyến Sx"}

16. "circle" — Vẽ đường tròn tâm center đi qua điểm vành rim:
    - Cú pháp:
      {"op":"circle","center":"O","rim":"R","dashed":false,"aux":false,"effect":"draw","durationMul":1.2,"step":"Vẽ đường tròn (O; R)"}
    - Ghi chú: Với đường tròn phụ (như đường tròn Thales đường kính OA hoặc đường tròn Ơ-le), đặt "dashed":true, "aux":true.

17. "connect_polygon" — Dựng đa giác đáy hoặc khép kín thiết diện kèm cạnh khuất & màu tô:
    - Cú pháp:
      {"op":"connect_polygon","pts":["A","B","M","I"],"dashedEdges":["A-I"],"fill":"rgba(240, 124, 0, 0.12)","explicitColor":true,"aux":true,"effect":"chalk","step":"Khép kín và tô thiết diện tứ giác ABMI"}
    - Giải thích tham số: Tự động nối vòng các cạnh theo thứ tự "pts" (chỉ những cạnh liệt kê trong "dashedEdges" như "A-I" mới vẽ nét đứt, các cạnh còn lại nét liền) và tô miền trong nếu có "fill" + "explicitColor":true.

18. "polygon_fill" — Tô miền màu bán trong suốt nhấn mạnh thiết diện / mặt phẳng:
    - Cú pháp:
      {"op":"polygon_fill","pts":["A","H","M"],"fill":"rgba(37, 99, 235, 0.10)","explicitColor":true,"aux":true,"effect":"fade","step":"Tô miền mặt phẳng (AHM)"}
    - Quy tắc sư phạm: LUÔN đặt "polygon_fill" SAU KHI đã vẽ xong các cạnh biên của đa giác đó để khi diễn hoạt nét vẽ hiện ra trước, màu tô phủ êm lên sau!

19. "right_angle" — Kí hiệu ô vuông góc vuông chuẩn SGK:
    - Cú pháp:
      {"op":"right_angle","a":"S","v":"A","b":"B","aux":true,"effect":"fade","step":"Kí hiệu SA vuông góc AB tại A"}
    - QUAN TRỌNG: Đỉnh góc vuông BẮT BUỘC phải đặt ở tham số giữa "v" (góc vuông tại V giữa hai tia VA và VB -> "a":"A_mút_1", "v":"Đỉnh_vuông", "b":"B_mút_2").

20. "angle_mark" & "tick_mark" — Kí hiệu góc bằng nhau (cung góc) & đoạn thẳng bằng nhau (vạch chắn):
    - Cung góc (1, 2 hoặc 3 cung):
      {"op":"angle_mark","a":"S","v":"C","b":"A","n":1,"aux":true,"effect":"fade","step":"Đánh dấu góc giữa SC và mặt đáy là góc SCA"}
    - Vạch bằng nhau trên đoạn thẳng (1, 2 hoặc 3 vạch):
      {"op":"tick_mark","a":"A","b":"B","n":1,"aux":true,"effect":"pulse","step":"Kí hiệu hai tiếp tuyến bằng nhau AB = AC"}

================================================================================
MỤC 3 — HƯỚNG DẪN DỰNG HÌNH CỤ THỂ TỪNG BƯỚC CHO 6 DẠNG TOÁN TRỌNG TÂM
================================================================================

--- DẠNG 1: CHÓP TỨ GIÁC LỒI THƯỜNG S.ABCD (GIAO TUYẾN, GIAO ĐIỂM ĐƯỜNG-MẶT, THIẾT DIỆN) ---
1. Bộ tọa độ gốc chuẩn chống trùng nét chiếu 2D (tứ giác lồi không có cặp cạnh đối song song):
   - A(-2.8, 0.2), B(-1.7, -1.8), C(1.7, -2.2), D(3.2, 0.5), đỉnh S(0.8, 3.8).
   - Đi đúng thứ tự vòng lồi A -> B -> C -> D (cấm tự cắt hình nơ!).
   - Bộ tọa độ này đảm bảo mọi đoạn nối mặt bên như BM (M trung điểm SC) và MN (N trung điểm SD) tạo góc lệch rõ ràng (< 165°, không bị ảo giác thẳng hàng trên mặt phẳng chiếu!).
2. Quy tắc xét Nét Liền / Nét Đứt tuyệt đối chính xác:
   - Mặt nhìn thấy phía trước gồm 3 mặt bên: (SAB), (SBC), (SCD) -> mọi cạnh và đoạn thẳng nằm trên 3 mặt này (AB, BC, CD, SA, SB, SC, SD, BM, MN, MI...) vẽ NÉT LIỀN ("dashed": false).
   - Mặt khuất phía sau (SAD) và mặt đáy dưới (ABCD) bị che -> cạnh AD, đoạn thiết diện AI trên (SAD), hai đường chéo AC, BD vẽ NÉT ĐỨT ("dashed": true).
   - Mọi đường xuyên qua lòng khối chóp (như giao tuyến SO, đường nối AM, BK, BI) BẮT BUỘC vẽ NÉT ĐỨT ("dashed": true).
3. Quy trình tìm giao điểm đường thẳng d = SD với mặt phẳng (ABM) (Phương pháp mặt phẳng phụ):
   - Bước 1: Chọn mặt phẳng phụ (SBD) chứa SD. Tìm giao tuyến của (SBD) và (ABM):
     + Trong (ABCD), gọi O = intersection_ll(["A","C"], ["B","D"]).
     + Giao tuyến (SAC) ∩ (SBD) = SO (nối segment S-O, dashed:true).
     + Trong (SAC), gọi K = intersection_ll(["A","M"], ["S","O"]) (nối AM, dashed:true).
     + Khi đó (ABM) ∩ (SBD) = đường thẳng BK.
   - Bước 2: Trong mặt phẳng đồng phẳng (SBD), lấy I = intersection_ll(["B","K"], ["S","D"]) và nối đoạn BI (dashed:true).
   - Bước 3: Khép kín thiết diện tứ giác ABMI: nối BM (dashed:false), MI (dashed:false), AI (dashed:true), rồi gọi polygon_fill(["A","B","M","I"]).
   - Bước 4: Nếu tìm giao tuyến của hai mặt phẳng chứa hai đường song song (VD: M, N là trung điểm SC, SD => MN // CD => tìm (AMN) ∩ (ABCD)): CẤM dùng intersection_ll giữa MN và CD; bắt buộc dùng "line_parallel" qua A song song CD!

--- DẠNG 2: CHÓP CÓ ĐÁY HÌNH BÌNH HÀNH / CHỮ NHẬT / VUÔNG / THOI & CÁC TRƯỜNG HỢP ĐƯỜNG CAO ---
1. Khóa đáy ABCD chuẩn góc nhìn nghiêng SGK:
   - Đặt 3 đỉnh point_free: A(-2.2, 0.0), B(-3.6, -1.8), D(2.6, 0.0).
   - Đỉnh thứ 4 BẮT BUỘC dùng: {"op":"point_sum","id":"C","label":"C","a":"B","b":"D","c":"A"} (tạo C(1.2, -1.8)).
   - Ở góc nhìn chuẩn này, đỉnh A nằm ở góc sau-trái bên trong bao lồi: cạnh AB, AD vẽ NÉT ĐỨT ("dashed":true); cạnh BC, CD vẽ NÉT LIỀN ("dashed":false).
2. Ba trường hợp đặt đỉnh S theo giả thiết đường cao:
   - TH1 — Cạnh bên SA ⊥ (ABCD): Đặt S(-2.2, 3.9) thẳng đứng phía trên A (cùng hoành độ x = -2.2). Cạnh SA bị che bởi khối chóp nên vẽ NÉT ĐỨT ("dashed":true); SB, SC, SD vẽ NÉT LIỀN ("dashed":false). Đóng dấu 2 góc vuông: right_angle(a:"S", v:"A", b:"B") và right_angle(a:"S", v:"A", b:"D").
   - TH2 — Mặt bên (SAB) ⊥ (ABCD) (tam giác SAB cân tại S hoặc có đường cao SH ⊥ AB): Dựng H = midpoint("A","B") (tọa độ H = (-2.9, -0.9); nếu tam giác SAB lệch thì dùng point_on_segment ratio:0.38). Đặt S(-2.9, 3.2) thẳng đứng trên H (cùng x với H). Nối SH ("dashed":true) và gắn right_angle(a:"S", v:"H", b:"A"). (Khi này S nhô sang trái nên SA nằm trên biên bao lồi ngoài -> SA, SB, SC, SD nét liền, chỉ AB, AD, SH nét đứt).
   - TH3 — Hình chóp tứ giác đều S.ABCD (đường cao SO ⊥ đáy): Nối AC, BD ("dashed":true), dựng tâm O = intersection_ll(["A","C"], ["B","D"]) (O ở (-0.5, -0.9)). Đặt S(-0.5, 3.8) thẳng đứng trên O. Nối đường cao SO ("dashed":true) và gắn right_angle(a:"S", v:"O", b:"A"), right_angle(a:"S", v:"O", b:"B").

--- DẠNG 3: LĂNG TRỤ TAM GIÁC, LĂNG TRỤ TỨ GIÁC, HÌNH HỘP CHỮ NHẬT / LẬP PHƯƠNG ---
1. Lăng trụ tam giác ABC.A'B'C':
   - Đáy dưới: A(-2.6, 0.0), B(-0.6, -1.7), C(2.5, 0.0) -> AB, BC nét liền ("dashed":false); AC ở mặt sau nét đứt ("dashed":true).
   - Đặt DUY NHẤT 1 đỉnh đáy trên bằng point_free:
     + Lăng trụ đứng (AA' ⊥ đáy): đặt A'(-2.6, 3.4) (cùng x với A, gắn right_angle tại A).
     + Lăng trụ xiên: đặt A'(-1.8, 3.4).
   - Khóa cứng 2 đỉnh đáy trên còn lại bằng point_sum theo phép tịnh tiến véc-tơ AA':
     + {"op":"point_sum","id":"B'","label":"B'","a":"B","b":"A'","c":"A"}
     + {"op":"point_sum","id":"C'","label":"C'","a":"C","b":"A'","c":"A"}
   - Nét vẽ: Đáy trên A'B', B'C', C'A' nhìn thấy hoàn toàn ("dashed":false); cả 3 cạnh bên AA', BB', CC' đều nằm ở rìa/mặt trước nên vẽ NÉT LIỀN ("dashed":false)!
2. Hình hộp / Hình hộp chữ nhật / Hình lập phương ABCD.A'B'C'D':
   - Đáy dưới: A(-2.0, 0.2), B(-3.4, -1.5), D(2.4, 0.2), và C = point_sum("B","D","A").
   - Đặt A'(-2.0, 3.5) (đứng) hoặc A'(-1.3, 3.5) (xiên). Khóa cứng cả 3 đỉnh trên:
     + B' = point_sum("B","A'","A"), C' = point_sum("C","A'","A"), D' = point_sum("D","A'","A").
   - Nét vẽ chuẩn SGK: Duy nhất đỉnh A bị khuất phía sau -> chỉ 3 cạnh xuất phát từ A là AB, AD, AA' vẽ NÉT ĐỨT ("dashed":true); 9 cạnh khung còn lại (BC, CD, BB', CC', DD', A'B', B'C', C'D', D'A') vẽ NÉT LIỀN ("dashed":false)!

--- DẠNG 4: GÓC ĐƯỜNG-MẶT, GÓC NHỊ DIỆN & KHOẢNG CÁCH (QUY TRÌNH 2 BƯỚC "foot_perp" CHUẨN SGK) ---
1. Góc giữa đường thẳng SC và mặt phẳng đáy (ABCD) (với SH ⊥ (ABCD) tại H):
   - Nối hình chiếu HC trên mặt đáy ("dashed":true), sau đó đánh dấu cung góc tại C bằng {"op":"angle_mark","a":"S","v":"C","b":"H","n":1,"aux":true}.
2. Góc phẳng nhị diện [S, BC, A] (với SA ⊥ đáy):
   - Từ chân đường cao A, dựng điểm E thuộc BC sao cho AE ⊥ BC (nếu ABCD là hình chữ nhật/vuông thì E trùng B, góc nhị diện chính là góc SBA! Nếu tam giác ABC cân tại A thì E = midpoint("B","C"); nếu thường thì dựng E = foot_perp(p:"A", a:"B", b:"C") hoặc point_on_segment + right_angle("A","E","B")).
   - Nối SE trên mặt (SBC) và đánh dấu {"op":"angle_mark","a":"S","v":"E","b":"A","n":1,"aux":true}.
3. Khoảng cách từ chân đường cao A đến mặt bên nghiêng (SBC) (Mô hình mẫu 2 bước vuông góc):
   - Bước 1: Dựng đường vuông góc từ A tới giao tuyến đáy BC tại E (như trên: nếu đáy vuông tại B thì E chính là B; nếu ABC cân tại A thì E = midpoint("B","C"); nối AE nét đứt + right_angle("A","E","B")). Nối đoạn SE ("dashed":false trên mặt SBC).
   - Bước 2: Trong tam giác vuông SAE, dùng "foot_perp" hạ AH ⊥ SE tại H:
     {"op":"foot_perp","id":"H","label":"H","p":"A","a":"S","b":"E","drawDropSegment":true,"dashed":true,"markRightAngle":true,"aux":true,"effect":"glow","durationMul":1.3,"step":"Hạ AH ⊥ SE tại H => AH = d(A, (SBC))"}
   - (Nếu tính khoảng cách từ điểm M bất kỳ đến (SBC) hoặc khoảng cách giữa 2 đường chéo nhau d1, d2: dựng mặt phẳng song song quy về chân đường cao A, sau đó thực hiện đúng mô hình 2 bước foot_perp ở trên!).

--- DẠNG 5: ĐƯỜNG TRÒN 2D (O; R) — TIẾP TUYẾN, CÁT TUYẾN, TỨ GIÁC NỘI TIẾP & HỆ THỨC LƯỢNG ---
1. Khởi tạo đường tròn chuẩn ("is3D": false):
   - Đặt tâm O(0.0, 0.0), điểm mốc bán kính ẩn R(2.2, 0.0) ("show":false,"noDot":true), vẽ circle("O","R").
2. Hai tiếp tuyến AB, AC kẻ từ điểm A ngoài đường tròn (bảo toàn góc vuông & OH·OA = R²):
   - Đặt A(-4.4, 0.0) (hoặc A(4.4, 0.0)).
   - Dựng 2 tiếp điểm động bằng "tangent_point":
     + {"op":"tangent_point","id":"B","label":"B","p":"A","center":"O","rim":"R","which":0,"effect":"pop","step":"Tiếp điểm B"}
     + {"op":"tangent_point","id":"C","label":"C","p":"A","center":"O","rim":"R","which":1,"effect":"pop","step":"Tiếp điểm C"}
     (Nếu đề bài có gọi tên trung điểm M của OA hoặc vẽ đường tròn đường kính OA: khai báo M = midpoint("O","A") và circle("M","O", dashed:true, aux:true) trước, lệnh tangent_point sẽ tự động dùng chung điểm M đó!).
   - Nối tiếp tuyến AB, AC ("effect":"glow"), bán kính OB, OC ("dashed":true,"aux":true), đoạn OA và dây cung BC.
   - Lấy giao điểm trực giao H = intersection_ll(["O","A"], ["B","C"]).
   - Đóng dấu 3 góc vuông chuẩn: right_angle("O","B","A"), right_angle("O","C","A"), right_angle("O","H","B") -> tự động thỏa mãn chính xác tuyệt đối AB = AC và OH·OA = R²!
3. Cát tuyến ADE & Tứ giác nội tiếp tổng quát:
   - Cát tuyến từ A cắt (O) tại D, E: lấy D = point_on_circle(center:"O", rim:"R", angleDeg:35) (chọn góc sao cho đường AD cắt đường tròn tại 2 điểm rõ nét và không đi qua O), rồi lấy giao điểm còn lại E = intersection_lc(line:["A","D"], circle:["O","R"], which:0).
   - Tam giác / Tứ giác nội tiếp tổng quát: dùng "point_on_circle" với các góc KHÔNG đối xứng qua trục (VD: Tam giác nhọn ABC nội tiếp dùng A:112°, B:210°, C:330°; Tứ giác ABCD nội tiếp dùng A:125°, B:205°, C:315°, D:42°) để tránh vô tình biến thành hình cân/hình thang cân đặc biệt!

--- DẠNG 6: TAM GIÁC PHẲNG 2D — TRỰC TÂM, TRỌNG TÂM & ĐƯỜNG TRÒN NGOẠI TIẾP ---
1. Tọa độ tam giác chuẩn ("is3D": false):
   - Tam giác nhọn tổng quát (AB < AC rõ rệt): A(-0.9, 3.0), B(-3.2, -1.8), C(3.0, -1.8).
   - Tam giác cân tại A: A(0.0, 3.2), B(-2.6, -1.8), C(2.6, -1.8) (kèm tick_mark trên AB, AC).
   - Tam giác vuông tại A: Cách 1 đặt A(-2.4, -1.6), B(-2.4, 2.2), C(2.8, -1.6) + right_angle("B","A","C"); Cách 2 (nếu cần đường cao AH xuống cạnh huyền BC nằm ngang) đặt B(-3.0, -1.0), C(3.0, -1.0), dựng trung điểm M = midpoint("B","C") rồi lấy A = point_on_circle(center:"M", rim:"C", angleDeg:122) -> góc BAC vuông 90.000° tuyệt đối!
2. Ba đường cao đồng quy tại Trực tâm H:
   - Hạ D = foot_perp(p:"A", a:"B", b:"C", drawDropSegment:true, markRightAngle:true, aux:true).
   - Hạ E = foot_perp(p:"B", a:"A", b:"C", drawDropSegment:true, markRightAngle:true, aux:true).
   - Hạ F = foot_perp(p:"C", a:"A", b:"B", drawDropSegment:true, markRightAngle:true, aux:true).
   - Lấy Trực tâm H = intersection_ll(l1:["A","D"], l2:["B","E"]) -> đường cao thứ ba CF tự khắc đồng quy qua H chính xác tới 10^-13!
3. Đường trung tuyến & Trọng tâm G:
   - Lấy trung điểm M = midpoint("B","C"), nối trung tuyến AM, dựng Trọng tâm G bằng {"op":"point_on_segment","id":"G","label":"G","a":"A","b":"M","ratio":0.666667,"effect":"pop"} (hoặc lấy giao điểm AM ∩ BN bằng intersection_ll).
4. Tâm đường tròn ngoại tiếp O của tam giác ABC bất kỳ:
   - Dựng 2 trung điểm ẩn hoặc hiện M1 = midpoint("B","C"), M2 = midpoint("A","C").
   - Dựng 2 điểm hướng trung trực ẩn: d1 = line_perp(through:"M1", a:"B", b:"C", show:false, noDot:true, drawSegment:false) và d2 = line_perp(through:"M2", a:"A", b:"C", show:false, noDot:true, drawSegment:false).
   - Lấy tâm ngoại tiếp O = intersection_ll(l1:["M1","d1"], l2:["M2","d2"]), sau đó vẽ circle(center:"O", rim:"A") -> đường tròn tự động đi khít qua cả 3 đỉnh A, B, C dù kéo thả bất kỳ đỉnh nào!

================================================================================
MỤC 4 — HỆ THỐNG HIỆU ỨNG CHUYỂN ĐỘNG TỪNG NÉT TRONG APP MINNOTE ("motion" & "effect")
================================================================================
Sắp xếp mảng "ops" theo đúng mạch giảng bài sư phạm của giáo viên trên bảng:
(1) Đỉnh & cạnh khung cơ sở -> (2) Đỉnh cao / đường tròn chính -> (3) Giả thiết trung điểm / đường chéo / chân vuông góc -> (4) Đường phụ tìm giao điểm / giao tuyến -> (5) Khép kín & tô miền thiết diện / đóng dấu góc vuông kết luận.

1. Gắn thuộc tính hiệu ứng ngay trên từng phần tử của "ops":
   - "effect":
     + "chalk" : Nét phấn viết bảng tự nhiên (dùng cho các cạnh thấy của hình chóp, lăng trụ, tam giác).
     + "draw"  : Nét bút mực mượt đều (dùng cho đường tròn, cạnh khuất nét đứt, đường gióng phụ).
     + "pop"   : Nảy điểm đàn hồi (dùng cho đỉnh gốc, trung điểm, tiếp điểm, giao điểm mới xuất hiện).
     + "glow"  : Vẽ nét kèm hào quang phát sáng (dùng nhấn mạnh giao tuyến hai mặt phẳng, tiếp tuyến đường tròn, đoạn khoảng cách vuông góc cần tìm).
     + "pulse" : Nhịp phóng nhẹ thu hút mắt nhìn (dùng cho giao điểm mục tiêu cuối câu hỏi hoặc vạch bằng nhau tick_mark).
     + "fade"  : Hiện dần êm ái (dùng cho miền tô thiết diện polygon_fill, kí hiệu góc vuông right_angle, cung góc angle_mark).
     + "wipe"  : Quét mở dần theo dải phẳng (dùng cho mảng mặt phẳng hoặc tia dài).
     + "stamp" : Đóng dấu dứt khoát (dùng cho điểm kết luận trọng tâm).
   - "rev": true/false — Đặt "rev": true khi muốn bút vẽ ngược chiều từ điểm b về điểm a (mặc định false vẽ từ a sang b).
   - "durationMul": Hệ số tốc độ của riêng bước đó (0.6..0.8 cho nét phụ nhanh; 1.0 chuẩn; 1.25..1.5 chậm rãi nhấn mạnh ở bước tìm giao tuyến / hạ đường cao then chốt).
   - "easing": "smootherstep" (mặc định mượt cho cạnh), "easeInOut", "easeOut", "spring" (hợp với "pop"), "bump" (hợp với "pulse").
   - "step": Câu thuyết minh ngắn gọn tiếng Việt (VD: "Trong (SAC), gọi K = AM ∩ SO") để thanh Diễn Hoạt của MinNote hiển thị từng bước.

2. Chọn 1 trong 3 Preset tổng thể trong đối tượng "motion":
   - "domiinh"     : Phong cách bài giảng phấn bảng sư phạm ấm áp kèm bàn tay cầm bút ("handPen": true) — khuyên dùng cho Hình không gian 3D & Hình SGK.
   - "manim"       : Phong cách hoạt họa toán học sắc nét kiểu 3Blue1Brown ("handPen": false) — khuyên dùng cho Đường tròn 2D, Tiếp tuyến & Hệ trục tọa độ.
   - "3d_standard" : Phong cách khối đa diện trực quan nhấn chiều sâu, hỗ trợ xoay quan sát ("orbit3d": true).

================================================================================
MỤC 5 — VÍ DỤ JSON MẪU HOÀN CHỈNH ("mn-geo-motion/2.0") & Ô ĐIỀN ĐỀ BÀI
================================================================================
Dưới đây là mẫu JSON hoàn chỉnh chuẩn 100% của bài toán: "Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật tâm O, SA ⊥ (ABCD). Gọi M là trung điểm SC, H là hình chiếu vuông góc của A lên SB. Dựng mặt phẳng (AHM) và tìm giao tuyến Sx của (SAB) và (SCD)".
Hãy xuất đầu ra của bạn theo ĐÚNG cấu trúc chuẩn này (chỉ trả về duy nhất 1 khối JSON, không thêm văn bản ngoài JSON):

{
  "schema": "mn-geo-motion/2.0",
  "title": "Chóp S.ABCD (SA ⊥ đáy) — Mặt phẳng (AHM) & Giao tuyến Sx // AB",
  "is3D": true,
  "meta": {
    "title": "Chóp S.ABCD (SA ⊥ đáy) — Mặt phẳng (AHM) & Giao tuyến Sx // AB",
    "problem": "Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật tâm O, SA vuông góc với đáy (ABCD). Gọi M là trung điểm của SC, H là hình chiếu vuông góc của A lên SB. Dựng mặt phẳng (AHM) và tìm giao tuyến Sx của (SAB) và (SCD).",
    "is3D": true,
    "spaceType": "solid_3d"
  },
  "checks": {
    "gate1_space": "Hình không gian 3D (solid_3d). Đáy hình chữ nhật ABCD biểu diễn bằng hình bình hành A(-2.2,0), B(-3.6,-1.8), D(2.6,0), C=B+D-A=(1.2,-1.8); S(-2.2,3.9) thẳng đứng trên A (+y hướng lên).",
    "gate2_dag_anchors": ["A", "B", "D", "S"],
    "gate3_coplanar_intersections": [
      "O = AC ∩ BD đồng phẳng trong (ABCD), det != 0",
      "AB // CD nên (SAB) ∩ (SCD) không dùng intersection_ll mà dùng line_parallel Sx // AB qua S"
    ],
    "gate4_dashed_edges": ["AB", "AD", "SA", "AC", "BD", "OM", "AH", "AM"],
    "gate5_motion_story": "Preset domiinh: dựng đáy ABCD -> dựng đường cao SA và các cạnh bên -> tâm O và đường trung bình OM -> hạ AH ⊥ SB và khép mặt (AHM) -> phát sáng giao tuyến Sx // AB."
  },
  "ops": [
    { "op": "point_free", "id": "A", "label": "A", "x": -2.2, "y": 0.0, "effect": "pop", "easing": "spring", "step": "Đặt đỉnh gốc A (chân đường cao)" },
    { "op": "point_free", "id": "B", "label": "B", "x": -3.6, "y": -1.8, "effect": "pop", "easing": "spring", "step": "Đặt đỉnh đáy B" },
    { "op": "point_free", "id": "D", "label": "D", "x": 2.6, "y": 0.0, "effect": "pop", "easing": "spring", "step": "Đặt đỉnh đáy D" },
    { "op": "point_sum", "id": "C", "label": "C", "a": "B", "b": "D", "c": "A", "effect": "pop", "easing": "spring", "step": "Khóa đỉnh C = B + D - A (đáy hình chữ nhật ABCD)" },
    { "op": "segment", "a": "A", "b": "B", "dashed": true, "effect": "draw", "step": "Vẽ cạnh đáy khuất AB" },
    { "op": "segment", "a": "A", "b": "D", "dashed": true, "effect": "draw", "step": "Vẽ cạnh đáy khuất AD" },
    { "op": "segment", "a": "B", "b": "C", "dashed": false, "effect": "chalk", "easing": "smootherstep", "step": "Vẽ cạnh đáy trước BC" },
    { "op": "segment", "a": "C", "b": "D", "dashed": false, "effect": "chalk", "easing": "smootherstep", "step": "Vẽ cạnh đáy phải CD" },
    { "op": "point_free", "id": "S", "label": "S", "x": -2.2, "y": 3.9, "effect": "pop", "easing": "spring", "step": "Đặt đỉnh S thẳng đứng phía trên A" },
    { "op": "segment", "a": "S", "b": "A", "dashed": true, "effect": "draw", "step": "Kẻ đường cao khuất SA ⊥ (ABCD)" },
    { "op": "segment", "a": "S", "b": "B", "dashed": false, "effect": "chalk", "easing": "smootherstep", "step": "Nối cạnh bên thấy SB" },
    { "op": "segment", "a": "S", "b": "C", "dashed": false, "effect": "chalk", "easing": "smootherstep", "step": "Nối cạnh bên thấy SC" },
    { "op": "segment", "a": "S", "b": "D", "dashed": false, "effect": "chalk", "easing": "smootherstep", "step": "Nối cạnh bên thấy SD" },
    { "op": "right_angle", "a": "S", "v": "A", "b": "B", "aux": true, "effect": "fade", "step": "Kí hiệu góc vuông SA ⊥ AB tại A" },
    { "op": "right_angle", "a": "S", "v": "A", "b": "D", "aux": true, "effect": "fade", "step": "Kí hiệu góc vuông SA ⊥ AD tại A" },
    { "op": "segment", "a": "A", "b": "C", "dashed": true, "aux": true, "effect": "draw", "step": "Kẻ đường chéo khuất AC" },
    { "op": "segment", "a": "B", "b": "D", "dashed": true, "aux": true, "effect": "draw", "step": "Kẻ đường chéo khuất BD" },
    { "op": "intersection_ll", "id": "O", "label": "O", "l1": ["A", "C"], "l2": ["B", "D"], "effect": "pop", "easing": "spring", "step": "Tâm đáy O = AC ∩ BD" },
    { "op": "midpoint", "id": "M", "label": "M", "a": "S", "b": "C", "effect": "pop", "easing": "spring", "step": "Gọi M là trung điểm của SC" },
    { "op": "segment", "a": "O", "b": "M", "dashed": true, "aux": true, "effect": "draw", "step": "Nối đường trung bình OM // SA" },
    { "op": "foot_perp", "id": "H", "label": "H", "p": "A", "a": "S", "b": "B", "drawDropSegment": true, "dashed": true, "markRightAngle": true, "aux": true, "effect": "glow", "durationMul": 1.3, "step": "Hạ hình chiếu vuông góc AH ⊥ SB tại H" },
    { "op": "segment", "a": "H", "b": "M", "dashed": false, "aux": true, "effect": "chalk", "step": "Nối đoạn HM trên mặt bên thấy (SBC)" },
    { "op": "segment", "a": "A", "b": "M", "dashed": true, "aux": true, "effect": "draw", "step": "Nối đoạn AM xuyên trong khối chóp" },
    { "op": "polygon_fill", "pts": ["A", "H", "M"], "fill": "rgba(37, 99, 235, 0.11)", "explicitColor": true, "aux": true, "effect": "fade", "durationMul": 1.2, "step": "Tô nhấn miền mặt phẳng (AHM)" },
    { "op": "line_parallel", "id": "x", "label": "x", "through": "S", "a": "A", "b": "B", "k": 1.15, "asLine": true, "bothSides": true, "noDot": true, "dashed": false, "aux": true, "effect": "glow", "durationMul": 1.4, "step": "Kẻ giao tuyến Sx = (SAB) ∩ (SCD) song song với AB và CD" }
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
