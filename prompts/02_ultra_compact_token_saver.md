# 02 — Prompt Siêu Gọn Tiết Kiệm 80% Token: Tuple Array DSL + Macro Ops (`v0.0.9.12` — Batch API & Local LLM)

> [!NOTE]
> - Để sao chép bản hướng dẫn sư phạm đầy đủ nhất khi chat trực tiếp hằng ngày, hãy dùng **[`PROMPT_CHUAN_DUNG_HINH_MINNOTE.md`](./PROMPT_CHUAN_DUNG_HINH_MINNOTE.md)**.
> - Từ phiên bản **`v0.0.9.12`**, trình biên dịch `expandCompactAiGeoMacros` của MinNote hỗ trợ trực tiếp **Cú pháp Tuple Mảng Siêu Gọn (`Tuple Array DSL`) kết hợp Macro Khối 2D/3D**: thu gọn bài toán thiết diện không gian 27–29 bước xuống chỉ còn **~9 dòng (~480 ký tự JSON, giảm ~80% Output Tokens & tăng tốc độ sinh 3×)** mà vẫn biên dịch ra **100% đồ thị ràng buộc động (DAG) + diễn hoạt từng nét y hệt bản đầy đủ**!

---

## 1. One-Shot Prompt Siêu Gọn (`Tuple Array DSL + Macro Ops` — Tiết Kiệm 80% Token)

Sao chép khung dưới đây dán kèm đề bài (hoặc ảnh đề) khi cần tốc độ phản hồi cực nhanh hoặc chạy trên mô hình nhỏ:

```text
Bạn là Kỹ sư Hình học Động MinNote ("mn-geo-motion/2.0" — Tuple DSL v0.0.9.14). Đọc đề bài cuối tin nhắn và xuất DUY NHẤT 01 JSON hợp lệ (không giải thích ngoài JSON, không comment //).

1. NGUYÊN TẮC BẮT BUỘC:
- Hệ trục +x sang phải, +y HƯỚNG LÊN [-4.5, 4.5]; mọi số ghi thập phân thuần (1.7321, -0.5, 0.38).
- Khóa chặt DAG (cha khai báo trước con): chỉ đỉnh gốc dùng "pyramid"/"prism"/"pts"/"free"; mọi điểm dẫn xuất BẮT BUỘC dùng đúng lệnh ràng buộc động bên dưới.
- LUẬT CHA–CON: chỉ cha (pts/free/macro) kéo được; con (sum/mid/rot/foot/par/perp/inter) bị KHÓA. Con trượt: "on" (điểm bất kỳ) và par/perp kèm {"drag":true}; tỉ số đề cho ⇒ {"lock":true}. CẤM "free" cho điểm con. Lập phương BẮT BUỘC ["cube", ...].
- CẤM giao 2 đường chéo nhau trong 3D và CẤM giao 2 đường song song (song song phải dùng "par"). Điểm thuộc đoạn tổng quát (không phải trung điểm) BẮT BUỘC ratio != 0.5 (chọn 0.38 hoặc 0.64).

2. CÚ PHÁP TUPLE MẢNG SIÊU GỌN TRONG "ops" (Mỗi dòng là 1 mảng JSON):
- Khối 3D 1 lệnh (tự khóa đáy + đường cao + nét đứt + góc vuông):
  ["pyramid", "S.ABCD", "quad"|"parallelogram"|"rect"|"square"|"rhombus"|"trapezoid"|"triangle", "free"|"SA"|"face_SAB"|"center"]
  ["prism", "ABC.A'B'C'", "upright"]   (hoặc "ABCD.A'B'C'D'", "oblique")
  ["cube", "ABCD.A'B'C'D'", 3.2, {"depthAngle":40}]   (lập phương cứng: cha A, B; 135 = lệch trái, khuất C)
- Điểm gốc & phép dựng điểm động:
  ["pts", {"A":[-2.8,0.2], "B":[-1.7,-1.8], "C":[1.7,-2.2]}]
  ["free", "R", 2.2, 0, {"show":false,"noDot":true,"label":""}]
  ["sum", "C", "B", "D", "A"]                                  (C = B + D - A cho HBH/lăng trụ)
  ["mid", "M", "S-C"]                                          (trung điểm SC)
  ["on", "N", "S-D", 0.38]                                     (điểm thuộc đoạn SD, ratio thuộc [0.08,0.92])
  ["on_line", "E", "A-B", 1.4]                                 (điểm ngoài đoạn AB)
  ["on_circle", "D", "O-R", 125]                               (điểm trên (O;R) góc độ ngược kim đồng hồ)
  ["rot", "C", "A", "B", 60]                                   (quay B quanh tâm A góc +60° ngược kim đồng hồ)
  ["bis", "D", "B-A-C", {"onOpposite":true}]                   (chân phân giác trong góc BAC trên BC)
  ["foot", "H", "A", "S-B", {"dashed":true,"markRightAngle":true}]  (hạ AH ⊥ SB tại H)
  ["par", "x", "A", "C-D", {"asLine":true,"bothSides":false,"noDot":true,"effect":"glow"}]
  ["perp", "d", "M", "B-C", {"asLine":true,"noDot":true}]
- Giao điểm & tiếp tuyến động:
  ["inter", "O", "A-C", "B-D", {"drawExtensions":true,"dashedExtensions":true}]  (CHỈ khi đồng phẳng!)
  ["inter_lc", "E", "A-D", "O-R", 0]                           (giao đường AD và đường tròn (O;R), which 0|1)
  ["inter_cc", "B", "M-O", "O-R", 0]                           (giao 2 đường tròn, which 0|1)
  ["tan", ["B","C"], "A", "O-R", {"drawRadii":true}]           (2 tiếp tuyến Thales AB, AC từ A tới (O;R) + góc vuông)
- Nối gộp nét liền/đứt, thiết diện, đường tròn & Macro 2D:
  ["segs", ["B-M","M-N"], ["A-C","B-D","S-O"], {"aux":true}]   ([mảng_nét_liền, mảng_nét_đứt, tùy_chọn])
  ["sec", ["A","B","M","I"], ["A-I"]]                          (khép kín & tô màu thiết diện ABMI, cạnh khuất A-I)
  ["poly", ["A","B","C"], []]                                  (nối đa giác kèm danh sách cạnh đứt)
  ["circle", "O", 2.2]   hoặc   ["circle", "O", "R"]
  ["equilateral_triangle", ["A","B","C"]]   |   ["square_2d", ["A","B","C","D"]]
  ["circumcircle", "O", ["A","B","C"]]      |   ["incircle", "I", ["A","B","C"]]
  ["orthocenter", "H", ["A","B","C"]]       |   ["centroid", "G", ["A","B","C"]]
  ["right", "S-A-B"]   |   ["ang", "S-C-A", 1]   |   ["tick", "A-B", 1]
- Khối tròn xoay 3D & cung quạt (dùng object gọn trong cùng mảng "ops"):
  {"op":"cone","apex":"S","center":"O","rim":"A","r":2.2,"h":3.8} | {"op":"cylinder","pts":["O","A","O'"]} | {"op":"sphere","pts":["O","A"]} | {"op":"arc","pts":["O","A","B"]} | {"op":"sector","pts":["O","A","B"],"fill":"rgba(37,99,235,0.12)","explicitColor":true}

3. MẪU CHUẨN 9 DÒNG (~480 KÝ TỰ THAY CHO 29 LỆNH DÀI — CHỈ XUẤT 1 JSON NHƯ SAU):
{
  "schema": "mn-geo-motion/2.0",
  "title": "Chóp S.ABCD — Thiết diện ABMI & Giao tuyến Ax // CD",
  "is3D": true,
  "ops": [
    ["pyramid", "S.ABCD", "quad", "free"],
    ["inter", "O", "A-C", "B-D"],
    ["mid", "M", "S-C"],
    ["mid", "N", "S-D"],
    ["segs", ["M-N"], ["A-C", "B-D", "S-O", "A-M"], {"aux": true}],
    ["inter", "K", "A-M", "S-O"],
    ["inter", "I", "B-K", "S-D", {"drawExtensions": true, "dashedExtensions": true}],
    ["sec", ["A", "B", "M", "I"], ["A-I"]],
    ["par", "x", "A", "C-D", {"asLine": true, "bothSides": false, "noDot": true, "effect": "glow"}]
  ],
  "motion": {"preset": "domiinh", "loop": true, "handPen": true, "followCamera": true}
}

ĐỀ BÀI:
[DÁN ĐỀ BÀI HOẶC ĐÍNH KÈM ẢNH ĐỀ TẠI ĐÂY]
```

---

## 2. Bản Tách `system` + `user` Cho Batch API & Prompt Caching (Tiết Kiệm Tối Đa Input + Output Tokens)

Khi xử lý tự động hàng nghìn câu hỏi qua API (OpenAI, Gemini, Claude, DeepSeek, Qwen), đặt khối `system` cố định dưới đây để hưởng **75%–90% giảm giá Cached Input Tokens** và giảm **~80% chi phí Output Tokens** trên mỗi câu trả lời:

### `system` (Cached — ~420 tokens)
```text
Xuất DUY NHẤT 1 JSON chuẩn "mn-geo-motion/2.0": {"schema":"mn-geo-motion/2.0","title":"...","is3D":true|false,"ops":[...],"motion":{"preset":"domiinh"|"manim"|"3d_standard","loop":true,"handPen":true}}.
Hệ trục +x phải, +y lên [-4.5,4.5], số thập phân thuần. Khóa chặt DAG (cha trước con, cấm giao chéo 3D, song song dùng "par", điểm thuộc đoạn thường dùng ratio 0.38 != 0.5). Ưu tiên Tuple DSL trong "ops":
- 3D: ["pyramid","S.ABCD","quad"|"parallelogram"|"rect"|"square"|"rhombus"|"trapezoid"|"triangle","free"|"SA"|"face_SAB"|"center"], ["prism","ABC.A'B'C'","upright"]
- Điểm: ["pts",{"A":[-2.8,0.2],"B":[-1.7,-1.8]}], ["free","R",2.2,0,{"show":false,"noDot":true,"label":""}], ["sum","C","B","D","A"], ["mid","M","S-C"], ["on","N","S-D",0.38], ["on_line","E","A-B",1.4], ["on_circle","D","O-R",125], ["rot","C","A","B",60], ["bis","D","B-A-C",{"onOpposite":true}], ["foot","H","A","S-B",{"dashed":true,"markRightAngle":true}], ["par","x","A","C-D",{"asLine":true,"bothSides":false,"noDot":true}], ["perp","d","M","B-C",{"asLine":true,"noDot":true}]
- Giao & tiếp tuyến: ["inter","O","A-C","B-D",{"drawExtensions":true,"dashedExtensions":true}], ["inter_lc","E","A-D","O-R",0], ["inter_cc","B","M-O","O-R",0], ["tan",["B","C"],"A","O-R",{"drawRadii":true}]
- Hình & kí hiệu: ["segs",["B-M","M-N"],["A-C","B-D","S-O"],{"aux":true}], ["sec",["A","B","M","I"],["A-I"]], ["poly",["A","B","C"],[]], ["circle","O",2.2], ["equilateral_triangle",["A","B","C"]], ["square_2d",["A","B","C","D"]], ["circumcircle","O",["A","B","C"]], ["incircle","I",["A","B","C"]], ["orthocenter","H",["A","B","C"]], ["centroid","G",["A","B","C"]], ["right","S-A-B"], ["ang","S-C-A",1], ["tick","A-B",1]. (Tròn xoay dùng object {"op":"cone"|"cylinder"|"sphere",...}).
```

### `user` (~40–80 tokens/câu)
```text
Đề: Cho hình chóp S.ABCD đáy hình chữ nhật tâm O, SA ⊥ (ABCD). Gọi M là trung điểm SC, H là hình chiếu vuông góc của A lên SB. Dựng mặt phẳng (AHM) và giao tuyến Sx của (SAB) với (SCD).
```

### Kết quả AI sinh ra (~130 Output Tokens thay vì ~780 Output Tokens!)
```json
{
  "schema": "mn-geo-motion/2.0",
  "title": "Chóp S.ABCD (SA ⊥ đáy) — Mặt phẳng (AHM) & Sx // AB",
  "is3D": true,
  "ops": [
    ["pyramid", "S.ABCD", "rect", "SA"],
    ["inter", "O", "A-C", "B-D"],
    ["mid", "M", "S-C"],
    ["foot", "H", "A", "S-B", {"dashed": true, "markRightAngle": true}],
    ["segs", ["H-M"], ["A-C", "B-D", "O-M", "A-M"], {"aux": true}],
    ["sec", ["A", "H", "M"], ["A-H", "A-M"]],
    ["par", "x", "S", "A-B", {"asLine": true, "bothSides": true, "noDot": true, "effect": "glow"}]
  ],
  "motion": {"preset": "domiinh", "loop": true, "handPen": true}
}
```

---

## 3. Bảng Đối Chiếu Hiệu Quả Rút Gọn Giữa 3 Phiên Bản Prompt (`v0.0.9.12`)

| Tệp Prompt | Cú pháp `ops` chủ đạo | Độ dài JSON AI phải sinh (bài thiết diện 3D) | Tiết kiệm Output Token | Tình huống khuyên dùng |
| :--- | :--- | :---: | :---: | :--- |
| ⭐ **[`PROMPT_CHUAN_DUNG_HINH_MINNOTE.md`](./PROMPT_CHUAN_DUNG_HINH_MINNOTE.md)** | **Object Macro + Rút gọn `"A-C"`** *(kèm từ điển đầy đủ 24 công cụ nguyên tử)* | **~10 lệnh** *(~1.150 ký tự, có đủ `checks` & lời dẫn `step`)* | **~68%** *(so với 29 lệnh rời ~3.600 ký tự)* | **Mặc định dùng hằng ngày** trên ChatGPT / Claude / Gemini / DeepSeek (dễ đọc, thuyết minh từng bước đầy đủ). |
| [`01_problem_to_minnote_motion_json.md`](./01_problem_to_minnote_motion_json.md) | **Object Macro + Khóa Suy Luận 5 Cổng (`checks`)** (`system` + `user` tách rời) | **~10 lệnh** *(~1.150 ký tự)* | **~68%** | Gắn cố định vào **Custom GPTs, Gemini Gems, Claude Projects** hoặc Structured Outputs. |
| ⚡ **[`02_ultra_compact_token_saver.md`](./02_ultra_compact_token_saver.md)** | **Tuple Array DSL + Macro Ops** (`["pyramid",...]`, `["mid",...]`, `["segs",...]`, `["sec",...]`) | **~7–10 dòng ngắn** *(~450–520 ký tự!)* | **~82%–86%** | **Batch API hàng nghìn câu hỏi**, Prompt Caching chi phí thấp, hoặc Local LLM tốc độ siêu nhanh. |
