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
TAG = "v0.0.5.8"
TITLE = "MinNote v0.0.5.8 - Lưu Mặc Định Đường & Điểm, Giao Diện Thanh Công Cụ Siêu Gọn Ưu Tiên Màn Hình & Phím Tắt Ctrl+K Tự Đánh Nhãn"
BODY = """## MinNote v0.0.5.8 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.8 sửa triệt để lỗi lưu mặc định nét đường/điểm, thu gọn toàn bộ thanh công cụ để tối đa không gian màn hình viết và bổ sung phím tắt nhanh `Ctrl+K`:

### 🌟 Điểm Mới Trong Bản v0.0.5.8:
1. **Lưu Bền Vững Định Dạng Mặc Định Đường & Điểm**:
   - Đọc và lưu đầy đủ **Độ dày nét đường**, **Màu đường mặc định**, **Nét liền/đứt mặc định**, cùng **Cỡ chấm tròn điểm**, **Màu chấm tròn**, **Cỡ chữ & màu tên điểm** vào bộ nhớ cài đặt (`prefs`) khi bấm **Áp dụng**.
   - Tự động khôi phục đúng các thông số đã lưu sau khi khởi động lại ứng dụng, khi mở sổ mới/sổ cũ chưa thiết lập riêng, và không còn bị ghi đè mất độ dày/màu đường mặc định khi đổi nét bút vẽ tay.
2. **Thanh Công Cụ Siêu Gọn — Ưu Tiên Tối Đa Không Gian Màn Hình**:
   - Thu gọn thanh tiêu đề cửa sổ (`40px → 30px`), thanh trên (`56px → 40px`), thanh công cụ dọc bên trái (`140px → 96px` trên màn hình 1366×768 và `104px → 70px` màn hình cao — hiện đủ 100% công cụ không phải cuộn), thanh danh sách trang (`140px → 88px`), thanh Sheet (`46px → 30px`), thanh chọn nổi và giảm đệm viền quanh trang giấy.
3. **Phím Tắt `Ctrl+K` — Hiện & Tự Đánh Nhãn Đối Tượng Đang Chọn**:
   - Chọn một hoặc nhiều **điểm**, **đoạn thẳng**, **đa giác** hay **hình khối** rồi nhấn **`Ctrl+K`**: lập tức hiện tên nhãn và tự động đánh chữ cái (`A, B, C, D…`, tự tránh trùng nhãn trên trang) cho các điểm chưa có tên.
   - Nhấn **`Ctrl+K`** lần nữa khi tất cả đối tượng đang chọn đã hiện nhãn sẽ ẩn gọn nhãn trở lại; hỗ trợ đầy đủ `Ctrl+Z` / `Ctrl+Y`.
4. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
"""

SETUP_EXE = r"M:\IT\Minnote\dist\installer\MinNote_Setup.exe"

# Không tạo bản phát hành khi chưa có bộ cài: app của người dùng sẽ thấy bản mới mà không có gì để tải.
if not os.path.exists(SETUP_EXE):
    print(f"Asset file not found at {SETUP_EXE}. Build the installer first; no release was created.")
    sys.exit(1)

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
