# 03 — Chuyển Đổi Chuẩn `mn-geo-motion/2.0` (Hoặc TikZ Tĩnh) Sang Video Loop BetaTikz (`tikzvid-project/1`)

Tài liệu này định nghĩa bộ quy tắc kỹ thuật và Prompt chuyên dụng để biến **JSON dựng hình `mn-geo-motion/2.0`** của MinNote (hoặc mã TikZ tĩnh bất kỳ) thành:
1. **Mã TikZ Chuyển Động Liên Tục (`out_tikz`)** điều khiển bởi tham số thời gian thực $\t \in [0, 1]$ tương thích hoàn toàn với `tikz_engine.py`, `tikz_timeline.py` và `tikz_effects.py` của **BetaTikz (`Beta1Tikz`)**.
2. **Gói Dự Án Video Vòng Lặp Mượt (`tikzvid-project/1`)** mở trực tiếp trong BetaTikz để xuất MP4 1080p/4K 60fps hoặc nạp ngược lại vào MinNote không mất ràng buộc!

---

## 1. Kiến Trúc Kỹ Thuật Của Engine Liên Tục BetaTikz (`\t` $\in [0, 1]$)

Khác với cách ghép clip rời rạc dễ giật hình, BetaTikz biên dịch một hàm hình học liên tục duy nhất theo biến `\t` từ `0.00000` đến `1.00000`:

### 1.1. Ba nguyên tắc bất di bất dịch chống lỗi biên dịch & giật khung
1. **Khởi tạo biến thời gian an toàn**:
   Luôn có `\providecommand{\t}{1}` trước `\begin{tikzpicture}` và `\pgfmathsetmacro{\tval}{\t}` ngay dòng đầu bên trong `tikzpicture` (để khi xem trước tĩnh hoặc nạp lại vào MinNote, mặc định `\t = 1` vẫn vẽ trọn vẹn hình cuối!).
2. **Khung nhìn cố định chống nhảy hình (`Fixed Bounding Box`)**:
   Ngay ngoài `scope` camera, BẮT BUỘC đặt:
   ```latex
   \path (minX, minY) rectangle (maxX, maxY);
   ```
   (cộng biên an toàn `0.8cm – 1.2cm` quanh toàn bộ đỉnh và nhãn). Tuyệt đối không để bounding box tự co giãn theo các nét đang mọc dần vì `pdftoppm` sẽ scale từng trang khác nhau gây rung giật toàn video!
3. **Bảo vệ đoạn thẳng độ dài 0 trong PGF/TikZ**:
   Khi tiến trình `\p` còn bằng `0`, việc vẽ mũi tên `-Stealth` hoặc cung tròn bán kính `0` có thể gây sai số chia 0 trong TeX. Bọc các nét động bằng `\ifdim \p pt > 0.005pt ... \fi` hoặc `max(0.01, \ang)`.

### 1.2. Thư viện hàm Easing chuẩn (`EASING_LIB` trong `tikz_engine.py`)
Mọi tiến trình con trên đoạn thời gian $[a, b] \subset [0, 1]$ đều tính qua các hàm PGF sau:
- `clp(\tval, a, b)` $= \max(0, \min(1, \frac{\tval - a}{b - a}))$: Chuẩn hóa cửa sổ $[a, b]$ về $[0, 1]$.
- `appear(\tval, a, b)` $= \text{smoothstep}(\text{clp}(\tval, a, b))$: Hiện dần độ mờ `opacity` êm hai đầu.
- `smoothstep(u)` $= u^2(3 - 2u)$ ($C^1$ liên tục vận tốc).
- `smootherstep(u)` $= u^3(6u^2 - 15u + 10)$ ($C^2$ liên tục gia tốc — chuẩn phong cách Đỗ Miinh Math).
- `easeout(u)` $= 1 - (1 - u)^3$: Phóng nhanh rồi hãm êm khi chạm đích.
- `bump(u)` $= \sin^2(180^\circ \cdot u)$: Tăng mượt $0 \to 1 \to 0$ với đạo hàm bằng $0$ ở cả hai đầu (tuyệt vời cho hiệu ứng lóe sáng `glow` và phồng nhấn `pulse` mà không bị khựng).
- `lerp(A, B, p)` $= A + (B - A)\cdot p$: Nội suy tuyến tính cho Camera Pan/Zoom hoặc số đo chạy.

### 1.3. Ánh xạ 1-1 từ Hiệu ứng MinNote sang Lệnh TikZ Động (`out_tikz`)

| Hiệu ứng MinNote (`effect`) | Kỹ thuật biểu diễn chuẩn trong BetaTikz (`out_tikz`) |
| :--- | :--- |
| `draw` / `chalk` (Đoạn thẳng $A \to B$) | `\pgfmathsetmacro{\p}{smootherstep(clp(\tval, t0, t1))}` + `\ifdim \p pt > 0.005pt \draw[...] (A) -- ($(A)!\p!(B)$); \fi` (nếu `rev: true` đổi thành `(B) -- ($(B)!\p!(A)$)`). |
| `draw` (Đường tròn tâm $O$ qua $R$) | `\pgfmathsetmacro{\ang}{360 * smootherstep(clp(\tval, t0, t1))}` + `\ifdim \ang pt > 0.5pt \draw[...] ([shift=(0:\r)]O) arc (0:\ang:\r); \fi`. |
| `pop` / `stamp` (Điểm & Nhãn) | `\pgfmathsetmacro{\opP}{appear(\tval, t0, t1)}` + `\pgfmathsetmacro{\bP}{bump(clp(\tval, t0, t1+0.05))}` -> bán kính chấm `{1.5pt + 0.7pt*\bP}`, nhãn `opacity=\opP`. |
| `glow` (Giao tuyến / Tiếp tuyến) | Vẽ lớp hào quang nền `\draw[color!35, line width=3.4pt, opacity={0.55*bump(clp(\tval, t0, t1+0.08))}] (A)--($(A)!\p!(B)$);` nằm ngay dưới nét chính. |
| `pulse` (Nhấn mạnh kết luận) | `\pgfmathsetmacro{\sc}{1.0 + 0.18 * bump(clp(\tval, t0, t1))}` cho điểm/hình; với khung chữ dùng đổi độ pha màu `text=vidhighlight!\hl!vidfg` để chữ không bị rung baseline. |
| `fade` (Miền tô `polygon_fill` / Góc vuông) | `\fill[color, opacity={0.14 * appear(\tval, t0, t1)}] (A)--(B)--(M)--(I)--cycle;` và `pic[draw, opacity={appear(\tval, t0, t1)}]{right angle=O--B--A}`. |

### 1.4. Phân tầng 5 Lớp (`5-Layer Hierarchy` của `tikz_timeline.py`) & Đóng Vòng Lặp (`Loop`)
1. **Layer 0 (`layer=camera`)**: Chứa biến dịch chuyển `shift={(\camX cm, \camY cm)}`, `scale=\camScale`, `rotate=\camRot`. Để đóng vòng lặp mượt (`Seamless Loop`), tại $\tval = 0$ và $\tval = 1$, trạng thái camera phải trở về `(0, 0), scale = 1.0, rotate = 0`.
2. **Layer 1 (`layer=ambient`)**: Lưới tọa độ mờ, miền tô đa giác/thiết diện bán trong suốt.
3. **Layer 2 (`layer=geometry`)**: Các cạnh thấy, cạnh đứt, đường tròn, đường dựng hình học.
4. **Layer 3 (`layer=graphs`)**: Đồ thị hàm số quét miền `domain`, quỹ đạo điểm động.
5. **Layer 4 (`layer=annotations`)**: Chấm điểm `\fill`, nhãn đỉnh `$A, B, S$`, thẻ tóm tắt công thức.
6. **Cửa sổ Giữ Cuối & Kết Vòng Lặp (`[0.90, 1.00]`)**: Hoàn tất mọi nét vẽ chậm nhất ở `t = 0.90`; dành `[0.90, 1.00]` để giữ nguyên toàn cảnh kết hợp 1 nhịp `bump` nhẹ ở kết luận (kèm `hold_end: 1.2` giây trong `RenderSettings` của BetaTikz).

---

## 2. Prompt Chuyên Dụng: Chuyển JSON `mn-geo-motion/2.0` (Hoặc TikZ Tĩnh) Sang BetaTikz Loop

Sao chép khối dưới đây để yêu cầu ChatGPT / Claude / Gemini / DeepSeek sinh mã `out_tikz` hoặc trọn gói `.betatikz.json`:

```text
Bạn là Kỹ sư Diễn hoạt Toán học BetaTikz & MinNote.
Nhiệm vụ: Chuyển đổi dữ liệu hình học đầu vào (JSON "mn-geo-motion/2.0" hoặc mã TikZ tĩnh) thành gói dự án video vòng lặp chuẩn "tikzvid-project/1" (hoặc mã "out_tikz" theo yêu cầu).

QUY TẮC KỸ THUẬT BẮT BUỘC:
1. Dòng đầu của "out_tikz" ghi màu nền "% !TIKZVID background=#F8FAFC" (hoặc #0F172A nếu nền tối), theo sau là "\providecommand{\t}{1}".
2. Ngay đầu "\begin{tikzpicture}[line join=round, line cap=round, >=Stealth, font=\small]":
   - Khai báo "\tikzset{layer/.style={}, declare function={clp(\x,\a,\b)=max(0,min(1,(\x-\a)/(\b-\a))); smoothstep(\x)=\x*\x*(3-2*\x); smootherstep(\x)=\x*\x*\x*(\x*(6*\x-15)+10); easeout(\x)=1-(1-\x)*(1-\x)*(1-\x); bump(\x)=sin(\x*180)^2; appear(\x,\a,\b)=smoothstep(clp(\x,\a,\b)); lerp(\a,\b,\p)=\a+(\b-\a)*\p;}}"
   - Gán "\pgfmathsetmacro{\tval}{\t}"
   - Đặt khung nhìn cố định chống giật khung "\path (minX, minY) rectangle (maxX, maxY);" (dư lề >= 0.9cm quanh mọi điểm và nhãn) Ở NGOÀI scope camera!
3. BẢO TOÀN RÀNG BUỘC KHI KHAI BÁO TỌA ĐỘ (để MinNote nạp ngược được):
   - Đỉnh tự do dùng "\coordinate (A) at (x, y);"
   - Trung điểm dùng "\coordinate (M) at ($(S)!0.5!(C)$);"
   - Điểm tỉ lệ trên đoạn dùng "\coordinate (N) at ($(S)!0.38!(D)$);"
   - Đỉnh hình bình hành dùng "\coordinate (C) at ($(B)+(D)-(A)$);"
   - Giao điểm 2 đường dùng "\coordinate (O) at (intersection of A--C and B--D);"
   - Chân vuông góc dùng "\coordinate (H) at ($(A)!(P)!(B)$);"
   - KHÔNG đặt tên biến macro trùng tên lệnh PGF có sẵn (không dùng \fi, \in, \to, \or, \ln, \sin, \cos làm tên biến \pgfmathsetmacro; khi vẽ plot dùng variable=\u thay vì variable=\t để không ghi đè biến thời gian \t!).
4. TỔ CHỨC 5 TẦNG SCOPE & CHIA MỐC THỜI GIAN HỢP LÝ:
   - Chia các bước từ t = 0.02 đến t = 0.90 theo trình tự sư phạm; khoảng [0.90, 1.00] giữ nguyên toàn bộ hình hoàn chỉnh và nhấn bump() nhẹ vào kết luận để tạo vòng lặp mượt.
   - Tổ chức đúng 5 tầng: Layer 0 (scope[layer=camera]) bọc ngoài Layer 1 (ambient: miền tô fill) -> Layer 2 (geometry: nét đứt/liền vẽ dần bằng $(A)!\p!(B)$ được bọc \ifdim \p pt > 0.005pt ... \fi) -> Layer 3 (graphs) -> Layer 4 (annotations: điểm \fill và node nhãn hiện dần bằng appear(\tval, a, b)).
5. ĐỊNH DẠNG ĐẦU RA:
   Trả về JSON hợp lệ với "format": "tikzvid-project/1" gồm:
   - "project": {"id": 1, "name": "..."}
   - "state": {"tikz": "<bản animateinline hoàn chỉnh>", "out_tikz": "<bản liên tục \\tval>", "prompt": "...", "storyboard": "...", "edit_prompt": "", "style": "domiinh", "t": "1.00"}
   - "revisions": []
   - "jobs": []

DỮ LIỆU ĐẦU VÀO:
"""
{{DAN_JSON_MN_GEO_MOTION_HOAC_MA_TIKZ_TINH_O_DAY}}
"""
```

---

## 3. Lệnh Render Video Nhanh Từ Gói Xuất Ra

Sau khi xuất tệp `.betatikz.json` từ MinNote hoặc từ Prompt trên (ví dụ [`examples/03_betatikz_chop_video_loop.betatikz.json`](./examples/03_betatikz_chop_video_loop.betatikz.json)), bạn có thể:
1. **Cách giao diện đồ họa**: Mở ứng dụng **Beta1Tikz**, chọn **Nhập dự án (`.json`)**, chọn độ phân giải `1080p` / `4K`, FPS `30` hoặc `60` và bấm **Render MP4**.
2. **Cách dòng lệnh Python (nếu dùng engine Beta1Tikz trực tiếp)**:
   ```powershell
   python -c "import json, pathlib, tikz_engine as E; d=json.loads(pathlib.Path('examples/03_betatikz_chop_video_loop.betatikz.json').read_text('utf-8')); E.render_video(d['state']['out_tikz'], pathlib.Path('chop_loop.mp4'), E.RenderSettings(resolution='1080p', aspect='16:9', fps=30, duration=8.0, hold_end=1.2, supersample=1.5))"
   ```
