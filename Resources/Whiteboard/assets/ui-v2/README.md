# MinNote UI v2 — "Atelier" (bản thử nghiệm)

Giao diện mới dạng tuỳ chọn. Giao diện cũ vẫn là mặc định.

## Bật / tắt
- Trong app: `Ctrl + Alt + U` (nhớ lựa chọn bằng localStorage)
- Bản web: thêm `?ui=v2` (bật) hoặc `?ui=v1` (tắt) vào địa chỉ

## Thành phần
- `ui-switch.js` — đặt `data-ui="v2"` lên `<html>` trước khi app render
- `minnote-ui-v2.css` — toàn bộ quy tắc, đều nằm dưới `html[data-ui="v2"]`
- `fonts/` — Be Vietnam Pro 400–700 (SIL OFL, xem `OFL-BeVietnamPro.txt`)

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
