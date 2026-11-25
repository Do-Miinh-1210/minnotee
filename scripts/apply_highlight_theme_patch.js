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
// Cho màu hiệu ứng chọn / rê chuột / phát lại dựng hình đi theo giao diện:
// thay màu xanh ngọc cố định bằng globalThis.__mnHi(alpha) (định nghĩa trong assets/ui-v2/ui-switch.js).
// Không có __mnHi thì vẫn dùng đúng màu cũ. Chạy lại nhiều lần vẫn an toàn.
const fs = require('fs');
const file = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let s = fs.readFileSync(file, 'utf8');
const H = (a, fallback) => `(globalThis.__mnHi?globalThis.__mnHi(${a}):${fallback})`;
const pairs = [
  // phát lại dựng hình: đầu bút
  ['e.fillStyle="rgba(13,148,136,0.28)",e.fill(),e.beginPath(),e.arc(p.x,p.y,2.8,0,Math.PI*2),e.fillStyle="#0d9488"',
   `e.fillStyle=${H('.28', '"rgba(13,148,136,0.28)"')},e.fill(),e.beginPath(),e.arc(p.x,p.y,2.8,0,Math.PI*2),e.fillStyle=${H('', '"#0d9488"')}`],
  // phát lại dựng hình: vòng sáng khi điểm xuất hiện
  ['ctx.strokeStyle="rgba(13,148,136,"+((1-ap)*.7)+")"',
   `ctx.strokeStyle=${H('(1-ap)*.7', '"rgba(13,148,136,"+((1-ap)*.7)+")"')}`],
  // điểm được chọn / rê chuột
  ['t.arc(T.x,T.y,this.dotR()*1.35+1/s,0,Math.PI*2),t.strokeStyle="#0d9488"',
   `t.arc(T.x,T.y,this.dotR()*1.35+1/s,0,Math.PI*2),t.strokeStyle=${H('', '"#0d9488"')}`],
  ['t.arc(T.x,T.y,Math.max(2,this.dotR()*.75),0,Math.PI*2),t.fillStyle="#0d9488",t.fill(),d!=null&&d.points.has(j)&&(t.fillStyle="rgba(13, 148, 136, 0.35)"',
   `t.arc(T.x,T.y,Math.max(2,this.dotR()*.75),0,Math.PI*2),t.fillStyle=${H('', '"#0d9488"')},t.fill(),d!=null&&d.points.has(j)&&(t.fillStyle=${H('.35', '"rgba(13, 148, 136, 0.35)"')}`],
  // đường / hình được chọn
  ['shapes:[{...j,color:"#0d9488",width:(j.width||2)+2.5}]',
   `shapes:[{...j,color:${H('', '"#0d9488"')},width:(j.width||2)+2.5}]`],
  // nét bút được chọn + khung chọn nhiều đối tượng
  ['Na(t,{...st,color:"#0d9488",width:(st.width||2)+4})',
   `Na(t,{...st,color:${H('', '"#0d9488"')},width:(st.width||2)+4})`],
  ['if(d.items.size&&d.multi){t.save(),t.strokeStyle="#0d9488"',
   `if(d.items.size&&d.multi){t.save(),t.strokeStyle=${H('', '"#0d9488"')}`],
];
let changed = 0;
for (const [a, b] of pairs) {
  if (s.includes(b)) continue;
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('Expected exactly 1 match, got ' + n + ' for: ' + a.slice(0, 80));
  s = s.replace(a, b); changed++;
}
fs.writeFileSync(file, s);
console.log('Applied ' + changed + ' change(s)');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
