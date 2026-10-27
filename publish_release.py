import os, sys, requests, glob

def get_github_token():
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    # Try git config
    try:
        import subprocess
        res = subprocess.run(["git", "config", "--get", "github.token"], capture_output=True, text=True)
        token = res.stdout.strip()
        if token:
            return token
    except Exception:
        pass
    token_file = os.path.expanduser("~/.github_token")
    if os.path.exists(token_file):
        with open(token_file, "r") as f:
            return f.read().strip()
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

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

def create_or_get_release():
    url = f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}"
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        print(f"Release {TAG} already exists. Deleting it to re-create clean release...")
        rel_id = r.json()["id"]
        requests.delete(f"https://api.github.com/repos/{REPO}/releases/{rel_id}", headers=headers)

    create_url = f"https://api.github.com/repos/{REPO}/releases"
    payload = {
        "tag_name": TAG,
        "target_commitish": "main",
        "name": TITLE,
        "body": BODY,
        "draft": False,
        "prerelease": False
    }
    r = requests.post(create_url, headers=headers, json=payload)
    if r.status_code not in (200, 201):
        print(f"Failed to create release: {r.status_code} {r.text}")
        sys.exit(1)
    print(f"Release {TAG} created successfully.")
    return r.json()

def upload_asset(upload_url_template, file_path):
    filename = os.path.basename(file_path)
    upload_url = upload_url_template.split("{")[0] + f"?name={filename}"
    print(f"Uploading {filename} ({os.path.getsize(file_path) / 1024 / 1024:.2f} MB)...")
    with open(file_path, "rb") as f:
        headers_upload = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Content-Type": "application/octet-stream"
        }
        r = requests.post(upload_url, headers=headers_upload, data=f)
        if r.status_code in (200, 201):
            print(f"Uploaded {filename} successfully.")
        else:
            print(f"Failed to upload {filename}: {r.status_code} {r.text}")

if __name__ == "__main__":
    rel = create_or_get_release()
    upload_url = rel.get("upload_url")
    installer = r"M:\IT\Minnote\dist\installer\MinNote_Setup.exe"
    if os.path.exists(installer):
        upload_asset(upload_url, installer)
    else:
        print(f"Installer not found at {installer}")
