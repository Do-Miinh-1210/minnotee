# 02 — Prompt Siêu Gọn Tiết Kiệm Token (~410 Tokens — Batch API & Local LLM)

Phiên bản này nén toàn bộ **luật khóa ràng buộc DAG, chống tứ giác tự cắt, chống giao điểm chéo 3D, chuẩn nét khuất và kịch bản hiệu ứng `mn-geo-motion/2.0`** xuống chỉ còn **~410 tokens** (tiết kiệm gần **70% chi phí token** so với bản đầy đủ).

Phù hợp nhất cho:
- Gọi **Batch API** hàng trăm/nghìn câu hỏi trong ngân hàng đề thi.
- Các mô hình tốc độ cao / chi phí thấp (`gemini-flash`, `gpt-4o-mini`, `deepseek-chat`, `qwen-2.5/3-coder`, `llama-3.3`).
- Nút **📋 Chép Prompt Mẫu Chuẩn** để dán nhanh vào cửa sổ chat AI bên ngoài kèm đề bài.

---

## 1. One-Shot Copy-Paste Prompt (~410 Tokens)

Chỉ cần sao chép khung dưới đây, thay dòng cuối bằng đề bài (hoặc dán kèm ảnh đề) rồi gửi:

```text
Xuất DUY NHẤT 1 JSON hợp lệ chuẩn "mn-geo-motion/2.0" (không markdown giải thích) để dựng hình Toán từng nét trên MinNote.

LUẬT CỐT LÕI:
1. Tọa độ (+x phải, +y LÊN TRÊN), CHỈ dùng số thực JSON (cấm chuỗi "sqrt(3)/2"):
   - Chóp tứ giác thường S.ABCD: A(-2.8,0), B(-1.3,-2), C(1.9,-1.7), D(3.2,0.2), S(-0.4,3.8); AD dashed:true.
   - Đáy hình bình hành/chữ nhật/vuông ABCD: A(-2.2,0), D(2.6,0), B(-3.6,-1.8), C dùng point_sum(a:"B",b:"D",c:"A"); AB, AD dashed:true. Nếu SA⊥đáy: S(-2.2,3.9). Lăng trụ: B',C',D' dùng point_sum theo AA'.
   - Chóp S.ABC: A(-2.6,0), B(-0.5,-1.9), C(2.8,0), S(-0.3,3.7); AC dashed:true.
2. Ràng buộc DAG (chỉ đỉnh gốc dùng point_free):
   - Trung điểm: midpoint(a,b). Điểm thuộc đoạn (không phải trung điểm): point_on_segment(a,b,ratio) với ratio∈[0.15,0.85] và ratio!=0.5 (vd 0.38). Ngoài đoạn: point_on_line.
   - Chân vuông góc: foot_perp(p,a,b,drawDropSegment:true,markRightAngle:true). Góc vuông: right_angle(a,v,b) với v là đỉnh vuông.
   - Tiếp điểm B,C từ A ngoài (O;P_R): M=midpoint(O,A), vẽ circle(M,O,dashed:true,aux:true), lấy H0=point_on_segment(O,A,ratio:(R/OA)^2,show:false), Q0=line_perp(through:H0,a:O,b:A,drawSegment:false,show:false), lấy B,C bằng intersection_lc(line:[H0,Q0],circle:[O,P_R],which:0|1).
3. Chống sai 3D: Mọi intersection_ll(l1,l2) PHẢI đồng phẳng và KHÔNG song song (det!=0). Nếu 2 đường song song (vd MN//CD), CẤM intersection_ll -> dùng line_parallel(id:"x",label:"x",through,a,b,asLine:true,noDot:true,aux:true).
4. Nét khuất 3D: Cạnh bao ngoài & mặt trước dashed:false; cạnh khuất đáy, đường chéo đáy, đường cao/nét xuyên trong khối, thiết diện mặt sau dashed:true. Nối đủ đoạn thẳng tới mọi điểm dẫn xuất.
5. Hiệu ứng: Gán effect trên ops ("chalk"|"draw" cho cạnh, "pop" cho đỉnh/giao điểm, "glow" cho giao tuyến/tiếp tuyến, "pulse" cho kết luận, "fade" cho polygon_fill/right_angle).

CẤU TRÚC JSON:
{"schema":"mn-geo-motion/2.0","title":"...","is3D":true,"meta":{"title":"...","is3D":true},"ops":[...],"motion":{"preset":"domiinh","fps":24,"durationSec":9,"loop":true,"handPen":true,"followCamera":true,"orbit3d":false}}

ĐỀ BÀI:
[DÁN ĐỀ BÀI HOẶC ẢNH ĐỀ TẠI ĐÂY]
```

---

## 2. Bản Tối Giản Cho System + User Tách Rời (Dùng Trong Code API)

Khi gọi API lặp lại nhiều lần (OpenAI / Gemini / DeepSeek / Anthropic Prompt Caching), đặt phần tĩnh vào `system` để hưởng **90% giảm giá Cached Input Tokens**:

### `system` (Cached)
```text
Sinh DUY NHẤT 1 JSON "mn-geo-motion/2.0". Trục +x phải, +y lên; chỉ dùng số JSON thuần.
- Đỉnh gốc: point_free. Đỉnh thứ 4 HBH/lăng trụ: point_sum(a,b,c => a+b-c). Chóp tứ giác lồi: A(-2.8,0), B(-1.3,-2), C(1.9,-1.7), D(3.2,0.2), S(-0.4,3.8) (AD dashed:true). Chóp HBH: A(-2.2,0), D(2.6,0), B(-3.6,-1.8), C=point_sum(B,D,A) (AB,AD dashed:true).
- Điểm dẫn xuất: midpoint(a,b); point_on_segment(a,b,ratio!=0.5 trong 0.15..0.85); point_on_line(a,b,ratio); foot_perp(p,a,b,drawDropSegment,markRightAngle); intersection_ll(l1,l2) CHỈ khi đồng phẳng & không song song; nếu song song dùng line_parallel(through,a,b,asLine:true,noDot:true); tiếp điểm từ A ngoài (O;P_R) dùng H0=point_on_segment(O,A,ratio=(R/OA)^2,show:false) + Q0=line_perp(H0,O,A,show:false,drawSegment:false) + intersection_lc([H0,Q0],[O,P_R],which:0|1).
- Hình: segment(a,b,dashed,aux), circle(center,rim,dashed), right_angle(a,v,b), angle_mark(a,v,b,n), tick_mark(a,b,n), polygon_fill(pts,fill,explicitColor:true).
- Nét 3D: bao ngoài/mặt trước dashed:false; đáy sau/chéo đáy/xuyên khối/mặt sau dashed:true.
- Hiệu ứng op.effect: "chalk"|"draw"|"pop"|"glow"|"pulse"|"fade"; motion:{preset:"domiinh"|"manim"|"3d_standard",loop:true,handPen:true,followCamera:true}.
```

### `user` (Mỗi câu hỏi chỉ tốn ~40–90 tokens)
```text
Đề: Cho hình chóp S.ABCD đáy hình bình hành tâm O, SA ⊥ (ABCD). Gọi M là trung điểm SC, H là hình chiếu vuông góc của A lên SB. Dựng hình và kí hiệu vuông góc.
```

---

## 3. So Sánh Hiệu Quả Token

| Phiên bản Prompt | Input Tokens (xấp xỉ) | Output Tokens trung bình | Tổng chi phí / 1.000 câu (Flash/Mini) | Độ an toàn ràng buộc |
| :--- | :---: | :---: | :---: | :---: |
| Bản đầy đủ `01` (5-Gate + `checks`) | ~1.350 | ~750 | ~$0.45 | Tuyệt đối (bài Olympic / 3D phức tạp) |
| **Bản siêu gọn `02` (One-Shot)** | **~410** | **~480** | **~$0.18** | Rất cao + được hậu kiểm bởi `validateAndHealAiGeoPlan` |
| **Bản API Cached `02`** | **~35 mới + 320 cached** | **~450** | **~$0.11** | Tối ưu nhất cho sản xuất hàng loạt |
