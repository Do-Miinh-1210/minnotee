# Thư Viện Prompt & Chuẩn Giao Tiếp Hình Học Động MinNote (`mn-geo-motion/2.0` — `v0.0.9.12`)

> [!IMPORTANT]
> ### ⭐ TỆP QUAN TRỌNG NHẤT — SAO CHÉP 1 CHẠM DÙNG NGAY: [`PROMPT_CHUAN_DUNG_HINH_MINNOTE.md`](./PROMPT_CHUAN_DUNG_HINH_MINNOTE.md)
> Nếu bạn muốn nhờ **ChatGPT, Claude, Google Gemini, DeepSeek hoặc Grok** đọc đề bài (hoặc ảnh chụp đề bài) và dựng hình chuẩn xác lên bảng MinNote, **chỉ cần mở duy nhất tệp [`PROMPT_CHUAN_DUNG_HINH_MINNOTE.md`](./PROMPT_CHUAN_DUNG_HINH_MINNOTE.md)**!
> - Bao gồm trọn vẹn **24 công cụ dựng hình động nguyên tử (`ops`)** (bổ sung `rotate`, `angle_bisector`, `arc`/`sector`, khối tròn xoay 3D `cone`/`cylinder`/`sphere`/`frustumCone`), **Bộ Macro & Batch rút gọn 70% mã JSON** (`pyramid`, `prism`, `points`, `segments`, `tangents_from_point`, `circumcircle`, `incircle`, `orthocenter`, `centroid`, cặp chuỗi `"A-C"`, bán kính số `"r"`), **Hướng dẫn 6+ dạng toán** và **Ví dụ JSON mẫu 10 lệnh** trong **01 khung sao chép duy nhất**.
> - Nội dung này cũng được tích hợp sẵn ngay trong ứng dụng tại: **`✨ AI Hình` (`Ctrl + Alt + G`) → tab `📦 Nạp / Lưu JSON` → nút `📋 Chép Prompt Dựng Hình Chi Tiết`**.

---

## 1. Nâng Cấp Đột Phá Trong `v0.0.9.12`: Rút Gọn 65%–85% Code JSON & Mở Rộng Nhân Ràng Buộc Động

1. **Mở rộng công cụ ràng buộc động nguyên tử**:
   - `rotate` (phép quay / vị tự quay ngược chiều kim đồng hồ trong hệ `+y` hướng lên — khóa chặt tam giác đều $60^\circ$, hình vuông $90^\circ$), `angle_bisector` (tia phân giác & chân phân giác trong trên cạnh đối diện bảo toàn $DB/DC = AB/AC$), `arc` / `arc3` / `sector`, và các khối tròn xoay 3D (`cone`, `cylinder`, `sphere`, `frustumCone`).
2. **Hệ thống Macro 1 lệnh & Quy ước rút gọn tự động (Giảm 65%–75% dung lượng JSON)**:
   - Tự động gán `label = id`, viết gọn cặp điểm `"A-C"` thay cho `["A","C"]`, truyền trực tiếp bán kính số `"r": 2.2`.
   - Macro 3D & 2D chuẩn SGK: `pyramid` (1 dòng thay thế 12–15 dòng, tự khóa đáy + đường cao `SA`/`face_SAB`/`center` + nét đứt + góc vuông), `prism`, `points`, `segments`, `equilateral_triangle`, `square_2d`, `circumcircle`, `incircle`, `orthocenter`, `centroid`, `tangents_from_point`.
3. **Cú pháp Tuple Mảng Siêu Gọn (`Tuple Array DSL` trong [`02_ultra_compact_token_saver.md`](./02_ultra_compact_token_saver.md) — Giảm ~80%–85% Token)**:
   - Viết trực tiếp `["pyramid","S.ABCD","quad","free"]`, `["mid","M","S-C"]`, `["inter","O","A-C","B-D"]`, `["segs",["M-N"],["A-C","B-D","S-O"]]`, `["sec",["A","B","M","I"],["A-I"]]` — thu gọn bài toán thiết diện 27–29 bước xuống chỉ còn **~9 dòng (~480 ký tự)**!
4. **Phân tách rõ ràng giữa JSON & TikZ**:
   - **Luồng JSON Hình Học Động**: Cửa sổ **`✨ AI Hình` (`Ctrl + Alt + G`) → tab `📦 Nạp / Lưu JSON`** (chép Prompt, nạp/lưu 01 chuẩn JSON duy nhất `mn-geo-motion/2.0` và dựng hình kèm diễn hoạt).
   - **Luồng Mã TikZ Tĩnh & TikZ Chuyển Động**: Cửa sổ **`📐 Xuất TikZ`** với 2 tab trực tiếp (**`📐 TikZ Tĩnh (Chuẩn SGK)`** kiểm định lưới chống méo song song giả & **`🎬 TikZ Chuyển Động (BetaTikz)`** xuất `out_tikz` `\t ∈ [0, 1]`, `animateinline`, `.betatikz.json`).

---

## 2. Kiến Trúc Tổng Thể & Luồng Dữ Liệu Hai Chiều

```mermaid
flowchart TD
    subgraph INPUT["1. Nguồn Đầu Vào Toán Học"]
        P1["📄 Đề bài văn bản / LaTeX"]
        P2["🖼️ Ảnh chụp đề thi / Bảng Đúng-Sai"]
        P3["📐 Mã TikZ tĩnh / tkz-euclide / Manim"]
    end

    subgraph AI_HUB["2. AI Ngoài + Bộ Prompt v0.0.9.12"]
        MST["⭐ PROMPT_CHUAN_DUNG_HINH_MINNOTE.md\n(24 công cụ + Macro gọn 70% | Tuple DSL gọn 80%)"]
        LLM["🤖 ChatGPT · Claude · Gemini · DeepSeek · Grok"]
        MST --> LLM
    end

    subgraph JSON_IO["3. AI Hình -> Tab 📦 Nạp / Lưu JSON"]
        J2["📦 Chuẩn JSON duy nhất: mn-geo-motion/2.0\n(Canonical Ops · Macro Ops · Tuple Array DSL)"]
        EXP["⚡ expandCompactAiGeoMacros() + validateAndHealAiGeoPlan()\n(Bung Macro/Tuple · Khóa DAG · Tự sửa nét khuất)"]
        J2 --> EXP
    end

    subgraph BOARD["4. Bảng Hình Học Động MinNote"]
        KRN["⚙️ Nhân Ràng Buộc Kéo Thả Bất Biến\n(sum · mid · foot · rotate · bisector · tangent · inter)"]
        RPL["🎬 Diễn Hoạt Từng Nét\n(domiinh · manim · 3d_standard | chalk · glow · pop · pulse · fade)"]
        KRN <--> RPL
    end

    subgraph TIKZ_WIN["5. Cửa Sổ Xuất TikZ (2 Tab Trực Tiếp)"]
        TKZ_S["📐 Tab 1: TikZ Tĩnh (Chuẩn SGK - Bảo toàn tính chất hình học)"]
        TKZ_A["🎬 Tab 2: TikZ Chuyển Động (BetaTikz)\nout_tikz \\t in [0,1] · animateinline · .betatikz.json"]
    end

    P1 & P2 -->|"Sao chép 1 chạm"| MST
    P3 -->|"Prompt 04 (Dịch ngược ràng buộc)"| LLM
    LLM -->|"JSON gọn sạch (-70%..-85% tokens)"| J2
    EXP -->|"Dựng Hình Lên Bảng"| KRN
    KRN <-->|"Lưu / Chép JSON từ bảng"| J2
    KRN --> TKZ_S
    RPL --> TKZ_A
```

---

## 3. Danh Mục Đầy Đủ Các Tài Liệu Trong `prompts/`

| Tệp tài liệu | Vai trò chính | Đối tượng sử dụng | Khi nào nên mở? |
| :--- | :--- | :--- | :--- |
| ⭐ **[`PROMPT_CHUAN_DUNG_HINH_MINNOTE.md`](./PROMPT_CHUAN_DUNG_HINH_MINNOTE.md)** | **#1 Flagship Master Prompt (1 khung copy duy nhất)**: 24 công cụ nguyên tử + Bộ Macro gộp rút gọn 70% code + 6+ dạng toán + mẫu JSON 10 lệnh | Giáo viên, Học sinh & Mọi mô hình AI ngoài | **Mặc định dùng cho 95% nhu cầu hằng ngày**: chỉ cần copy toàn bộ khung, dán đề/ảnh đề ở cuối là dựng chuẩn ngay! |
| [`01_problem_to_minnote_motion_json.md`](./01_problem_to_minnote_motion_json.md) | **System Prompt + User Prompt tách rời** theo chuẩn Khóa Suy Luận 5 Cổng (`checks`) + 24 công cụ + Macro gộp `v0.0.9.12` | Nhà phát triển ứng dụng, System Prompt cố định (Custom GPTs / Gems / Claude Projects) | Khi cài đặt cố định vào ô `System Instructions` của Custom GPT, Gemini Gem, Claude Project hoặc gọi qua SDK. |
| ⚡ [`02_ultra_compact_token_saver.md`](./02_ultra_compact_token_saver.md) | **Prompt Siêu Gọn `Tuple Array DSL + Macro Ops` (tiết kiệm ~80%–85% token, rút 29 bước còn ~9 dòng / ~480 ký tự)** | Batch API ngân hàng câu hỏi lớn, Local LLM (`Qwen`, `Llama`), Prompt Caching | Khi xử lý hàng trăm/nghìn câu hỏi qua API cần tối ưu cực đại chi phí token & tốc độ sinh phản hồi. |
| [`03_json_to_betatikz_video_loop.md`](./03_json_to_betatikz_video_loop.md) | **Chuyển JSON `mn-geo-motion/2.0` / TikZ tĩnh sang Video Loop BetaTikz (`tikzvid-project/1`)** | Người làm video bài giảng Toán MP4 60fps bằng BetaTikz / Beamer | Khi muốn nhờ AI đạo diễn thêm chuyển động camera 5 tầng, công thức chạy theo biến thời gian $\t \in [0, 1]$ nâng cao. |
| [`04_tikz_to_minnote_motion_json.md`](./04_tikz_to_minnote_motion_json.md) | **Dịch ngược mã TikZ / `tkz-euclide` / Manim sang JSON ràng buộc động `mn-geo-motion/2.0`** | Giáo viên có sẵn kho đề LaTeX/TikZ tĩnh | Khi muốn biến hình TikZ tọa độ chết thành hình động trên MinNote (kéo thả đỉnh không gãy hình + có hiệu ứng từng nét). |
| [`05_ai_geometry_20_errors_and_fixes.md`](./05_ai_geometry_20_errors_and_fixes.md) | **Cẩm nang 20 Lỗi Kinh Điển của AI khi dựng hình Toán & cách khắc phục** | Giáo viên, Kỹ sư Prompt & Kiểm thử QA | Tài liệu tra cứu chuyên sâu về nguyên nhân toán học và mẫu sửa chuẩn cho 20 lỗi hình học 2D/3D phổ biến của LLM. |
| [`schemas/mn-geo-motion-v2.schema.json`](./schemas/mn-geo-motion-v2.schema.json) | **JSON Schema Draft 2020-12 chính thức (`v0.0.9.12`)** hỗ trợ Canonical Ops, Macro Ops, cặp `"A-C"`, bán kính số `"r"` & mảng Tuple | OpenAI / Gemini Structured Outputs, `agy --json-schema`, CI/CD | Ép API của các hãng AI trả về 100% đúng kiểu dữ liệu JSON Schema, không bao giờ sai trường hay thừa văn bản. |

---

## 4. Bộ Ví Dụ Chuẩn Vàng (`examples/`)

1. [`examples/01_chop_tu_giac_giao_tuyen_3d.json`](./examples/01_chop_tu_giac_giao_tuyen_3d.json)
   - **Nội dung**: Hình chóp tứ giác lồi $S.ABCD$, tìm giao tuyến $SO = (SAC) \cap (SBD)$, giao điểm $I = SD \cap (ABM)$, dựng thiết diện $ABMI$ và giao tuyến song song $Ax = (AMN) \cap (ABCD) \parallel CD$ (phong cách `domiinh`).
2. [`examples/02_duong_tron_tiep_tuyen_2d.json`](./examples/02_duong_tron_tiep_tuyen_2d.json)
   - **Nội dung**: Đường tròn $(O; R)$ và hai tiếp tuyến $AB, AC$ kẻ từ điểm ngoài $A$ qua đường tròn Thales đường kính $OA$ ($\widehat{OBA} = \widehat{OCA} = 90.000^\circ$ bất biến khi kéo thả), dây cung $BC \perp OA$ tại $H$ (phong cách `manim`).
3. [`examples/03_betatikz_chop_video_loop.betatikz.json`](./examples/03_betatikz_chop_video_loop.betatikz.json)
   - **Nội dung**: Gói dự án video vòng lặp chuẩn `"format": "tikzvid-project/1"` mở trực tiếp trong **BetaTikz** để xuất MP4 1080p/4K, đồng thời nạp ngược được vào tab **`📦 Nạp / Lưu JSON`** của MinNote.

---

## 5. Hướng Dẫn Thao Tác Nhanh 3 Bước

1. **Bước 1 — Tạo JSON từ Đề bài / Ảnh đề**:
   - Mở [`PROMPT_CHUAN_DUNG_HINH_MINNOTE.md`](./PROMPT_CHUAN_DUNG_HINH_MINNOTE.md) (hoặc bấm **`📋 Chép Prompt Dựng Hình Chi Tiết`** trong **`✨ AI Hình → 📦 Nạp / Lưu JSON`**; nếu chạy Batch API dùng [`02_ultra_compact_token_saver.md`](./02_ultra_compact_token_saver.md)).
   - Dán vào ChatGPT / Claude / Gemini / DeepSeek kèm nội dung đề bài hoặc ảnh chụp đề bài.
2. **Bước 2 — Dựng Hình & Diễn Hoạt Trên Bảng MinNote**:
   - Sao chép khối JSON kết quả → Dán vào ô JSON trong tab **`📦 Nạp / Lưu JSON`** → Chọn phong cách (`✨ Đỗ Miinh`, `🎬 Manim`, hoặc `🧊 3D Chuẩn`) → Bấm **`🚀 Dựng Hình Lên Bảng`**.
3. **Bước 3 — Xuất Mã TikZ Tĩnh hoặc TikZ Chuyển Động (Khi cần chèn LaTeX / Làm Video)**:
   - Bấm nút **`📐 Xuất TikZ`** trên thanh công cụ:
     - Giữ ở tab **`📐 TikZ Tĩnh (Chuẩn SGK)`** để chép mã TikZ chèn vào đề thi Word/LaTeX.
     - Chuyển sang tab **`🎬 TikZ Chuyển Động (BetaTikz)`** để xem ngay mã TikZ động `\t ∈ [0, 1]`, sao chép vào BetaTikz hoặc bấm **`📦 Lưu gói .betatikz.json`**.
