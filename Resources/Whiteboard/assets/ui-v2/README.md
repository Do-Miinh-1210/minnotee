# MinNote UI v2 — "Atelier" (bản thử nghiệm)

Giao diện mới dạng tuỳ chọn. Giao diện cũ vẫn là mặc định.

## Bật / tắt
- Trong app: `Ctrl + Alt + U` (nhớ lựa chọn bằng localStorage)
- Bản web: thêm `?ui=v2` (bật) hoặc `?ui=v1` (tắt) vào địa chỉ

## Thành phần
- `ui-switch.js` — đặt `data-ui="v2"` lên `<html>` trước khi app render
- `minnote-ui-v2.css` — toàn bộ quy tắc, đều nằm dưới `html[data-ui="v2"]`
- `fonts/` — Be Vietnam Pro 400–700 (SIL OFL, xem `OFL-BeVietnamPro.txt`)
- `icons-v2.js` — bộ 193 icon khối đặc + 8 icon nhóm "Chèn" (tự sinh, đừng sửa tay)
- `LICENSE-Phosphor.txt` — giấy phép MIT của Phosphor Icons

## Bộ icon
- Phong cách khối đặc. Icon chung lấy từ Phosphor Icons "fill"; icon toán học
  (đường tròn lượng giác, Oxyz, bảng biến thiên, thước đo độ, ê-ke, parabol, lưới hình
  hộp…), kiểu nét, độ dày và cỡ tẩy được vẽ riêng theo cùng phong cách.
- Bundle có một móc nhỏ: `oe=(globalThis.__mnIconsV2||(x=>x))({...},h)`
  (vá bằng `scripts/apply_icons_v2_hook.js`). Mỗi icon render cả bản cũ (`.mn-ic1`) và bản
  mới (`.mn-ic2`); CSS chọn bản hiện ra theo `html[data-ui]`, nên Ctrl+Alt+U đổi icon ngay.
- Dựng lại: `npm pack @phosphor-icons/core && tar xzf phosphor-icons-core-*.tgz`
  rồi `node scripts/build_icons_v2.js package/assets/fill`.
- Nếu bundle `index-*.js` được build lại thì phải chạy lại `scripts/apply_icons_v2_hook.js`.

## Bố cục
- Công cụ vẽ (`.tb-group.tools`) → rail dọc tối bên trái, 2 cột, nút 40px
- Thanh trên mỏng: nhóm file · tên sổ/trang/zoom · bảng màu · nhóm "Chèn"
- Trang (`.board-wrap`) bo góc, nổi trên nền "mặt bàn" ấm
- Danh sách trang (`.pages-panel`) chuyển sang phải dạng filmstrip
- Thanh sheet thành chip

## Giới hạn đã biết
- Menu thả xuống mở từ rail vẫn mở xuống dưới (vị trí do JS tính)
- Chưa phủ: Kho Đề, Sơ đồ, 3D, máy tính Casio/Vinacal, Quick Word
- Khung WPF (`MainWindow.xaml`) và bản Electron (`app.asar`) chưa đổi
- Chưa kiểm tra với tuỳ chọn thanh công cụ trái/phải và chế độ trình chiếu
