import os
import sys
import requests
import subprocess

def get_github_token():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token
    try:
        proc = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True)
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1]
    except Exception:
        pass
    return None

GITHUB_TOKEN = get_github_token()
if not GITHUB_TOKEN:
    print("GITHUB_TOKEN could not be found.")
    sys.exit(1)

REPO = "Do-Miinh-1210/minnotee"
TAG = "v0.0.2.4"
TITLE = "MinNote v0.0.2.4 - Nâng cấp hoàn thiện bảng vẽ, chèn hình 3D/Hóa học trực tiếp & sửa triệt để bàn phím ảo"
BODY = """## MinNote v0.0.2.4 - Bản Cập Nhật Hoàn Thiện

Bản cập nhật v0.0.2.4 tập trung xử lý toàn diện các vấn đề người dùng phản hồi:

### 🌟 Các Cải Tiến & Sửa Lỗi Chính:
1. **Sửa Triệt Để Bàn Phím Ảo Toán Học Nổi Lên Trên Dialog:**
   - Nâng cấp độ ưu tiên hiển thị (z-index: 2.000.000) cho toàn bộ bàn phím ảo MathLive (`.ML__keyboard`, `.MLK__backdrop`, `.MLK__plate`).
   - Bàn phím ảo luôn nổi hoàn toàn trên lớp màn mờ backdrop của hộp thoại "Sửa công thức", thao tác gõ số, ký hiệu và phím ma trận bấm nhạy 100%.

2. **Chèn Trực Tiếp Hình 3D & Công Thức Lên Mặt Bảng Viết:**
   - Cải tiến động cơ chèn hình ảnh `insertSvgOrImageToBoard` tích hợp trực tiếp vào NoteRenderer Whiteboard.
   - Khi bấm chèn khối hình 3D (Lập phương, Chóp, Nón, Trụ...) hoặc phương trình Hóa học, hình ảnh tự động xuất hiện ngay tại trung tâm màn hình bảng vẽ và bật công cụ chọn đối tượng để dễ dàng căn chỉnh kích thước.
   - Loại bỏ hoàn toàn lỗi mở cửa sổ popup `about:blank` "Ảnh Xuất MinNote".

3. **Giữ Nguyên 100% Bảng Biến Thiên Gốc Của App:**
   - Loại bỏ nút Bảng biến thiên thêm vào gây trùng lặp, trả lại toàn bộ không gian cho công cụ Bảng biến thiên chuẩn gốc của MinNote (`vartable` / `📈`).

4. **Ẩn Tab Word Terminal Nổi Ở Cạnh Trái:**
   - Ẩn hoàn toàn thanh tab dọc `#qwtTab` ở mép trái màn hình giúp bảng vẽ hoàn toàn thoáng đãng, không bị vướng mắt khi giảng dạy và ghi chép.
   - Người dùng sử dụng nút "Dán Word" trực tiếp trên thanh công cụ khi cần dán tài liệu Word và MathType.

5. **Hóa Học Thông Minh (Cân Bằng & Tính Khối Lượng Mol):**
   - Hỗ trợ nhập phương trình hóa học đầy đủ (ví dụ: `Al + HCl -> AlCl3 + H2`).
   - Tự động cân bằng phản ứng và hiển thị khối lượng mol phân tử (M) của tất cả các chất tham gia và sản phẩm.
   - Hỗ trợ tính khối lượng mol cho từng chất riêng lẻ (ví dụ: `Fe2(SO4)3`, `KMnO4`...).
"""

SETUP_EXE = r"M:\IT\Minnote\dist\installer\MinNote_Setup.exe"

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

# 1. Check if release already exists
r = requests.get(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}", headers=headers)
if r.status_code == 200:
    print(f"Release {TAG} already exists, deleting it to recreate...")
    release_id = r.json()["id"]
    requests.delete(f"https://api.github.com/repos/{REPO}/releases/{release_id}", headers=headers)

# 2. Create Release
payload = {
    "tag_name": TAG,
    "target_commitish": "main",
    "name": TITLE,
    "body": BODY,
    "draft": False,
    "prerelease": False
}
r = requests.post(f"https://api.github.com/repos/{REPO}/releases", headers=headers, json=payload)
if r.status_code not in (200, 201):
    print("Failed to create release:", r.status_code, r.text)
    sys.exit(1)

release_data = r.json()
upload_url = release_data["upload_url"].split("{")[0]
print(f"Created release: {release_data['html_url']}")

# 3. Upload Setup Asset
if os.path.exists(SETUP_EXE):
    size_mb = os.path.getsize(SETUP_EXE) / (1024 * 1024)
    print(f"Uploading {SETUP_EXE} ({size_mb:.2f} MB)...")
    headers["Content-Type"] = "application/octet-stream"
    with open(SETUP_EXE, "rb") as f:
        r = requests.post(
            f"{upload_url}?name=MinNote_Setup.exe",
            headers=headers,
            data=f
        )
    if r.status_code in (200, 201):
        print(f"Uploaded MinNote_Setup.exe successfully! Download URL: {r.json()['browser_download_url']}")
    else:
        print("Failed to upload asset:", r.status_code, r.text)
else:
    print(f"Asset file not found at {SETUP_EXE}")
