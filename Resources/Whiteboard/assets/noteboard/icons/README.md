# Biểu tượng NoteBoard Ink

Chữ **N** viết một nét bằng ngòi bút dẹt: nét lên thanh, nét kéo xuống đậm, nét lên thứ hai thon dần. Chữ trắng nằm trên nền ô vuông bo góc kiểu Windows 11, màu xanh ngọc NoteBoard (gradient `#25ab9a` → `#168b82` → `#0d5d57`) có lớp bóng nhẹ phía trên. Một chấm mực màu san hô `#f08a6d` nằm ở đầu ngòi. Thiết kế riêng của NoteBoard, không dùng logo hay màu thương hiệu của hãng khác.

Xem nhanh: `preview.png` (các cỡ trên nền sáng và tối).

## Danh sách file

| File | Dùng cho |
|---|---|
| `noteboard-icon.svg` | Bản gốc vector, cỡ từ 64 px trở lên |
| `noteboard-icon-small.svg` | Bản nét dày cho cỡ 16–48 px (favicon, thanh tác vụ) |
| `noteboard-maskable.svg` | Bản tràn nền, chữ thu 80% để nằm trong vùng an toàn khi hệ điều hành cắt tròn/bo góc |
| `noteboard-mono.svg` | Chỉ có chữ trắng, nền trong suốt (ô màu, biểu tượng một màu) |
| `icon-16/24/32/48.png` | Vẽ từ bản small |
| `icon-64/128/180/192/256/512/1024.png` | Vẽ từ bản gốc (180 dùng cho `apple-touch-icon`) |
| `maskable-192.png`, `maskable-512.png` | Biểu tượng `purpose: "maskable"` trong manifest |
| `mono-512.png` | Biểu tượng `purpose: "monochrome"` |
| `../favicon.ico` | Favicon 16/32/48 ở thư mục gốc |
| `favicon-snippet.html` | Hai thẻ `<link rel="icon">` nhúng PNG 32 và 48 px dạng data URI (~6 KB) |
| `source/make_icon.py` | Script sinh lại các SVG (`python source/make_icon.py .`) |

Sinh PNG từ SVG: dựng ảnh mỗi SVG bằng trình duyệt (Playwright + Edge) đúng kích thước, nền trong suốt. Riêng bản maskable có nền đầy đủ.

## Gắn vào trinh-chieu.html (chưa làm)

`trinh-chieu.html` chạy được như một file đơn, kể cả khi không có mạng. Vì vậy favicon nên nhúng thẳng vào file: chép hai dòng trong `favicon-snippet.html` vào `<head>`, ngay sau thẻ `<title>`. Nếu chấp nhận phụ thuộc thư mục `icons/` nằm cạnh file thì có thể dùng dạng ngắn hơn:

```html
<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="icons/icon-48.png">
<link rel="apple-touch-icon" href="icons/icon-180.png">
```

Có thể thay luôn ô logo ở thanh tiêu đề (`.brandmark`, hiện là hình cây bút) bằng `icons/icon-64.png` hoặc data URI của nó, để biểu tượng thống nhất.

## Dùng trong manifest PWA

```json
"icons": [
  { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
  { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
  { "src": "icons/mono-512.png", "sizes": "512x512", "type": "image/png", "purpose": "monochrome" }
]
```

Khi đóng gói cho Microsoft Store bằng PWABuilder, dùng `icon-1024.png` (hoặc `icon-512.png`) làm ảnh nguồn. PWABuilder tự sinh các cỡ ô gạch và logo Windows từ ảnh này.
