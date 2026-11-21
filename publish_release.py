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
TAG = "v0.0.5.5"
TITLE = "MinNote v0.0.5.5 - Tùy Chọn Đồng Bộ Trực Tiếp Khi Tách Mặt Phẳng 3D"
BODY = """## MinNote v0.0.5.5 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.5 bổ sung tính năng **Đồng bộ (Live Sync)** cho công cụ **Tách mặt phẳng**, cho phép linh hoạt lựa chọn giữ nguyên mẫu độc lập hoặc tự động biến đổi theo hình không gian 3D chính:

### 🌟 Điểm Mới Trong Bản v0.0.5.5:
1. **Tích Chọn `☐ Đồng bộ` Ngay Trong Tách Mặt Phẳng**:
   - Hiển thị ô tích chọn **`Đồng bộ`** ngay trên thanh chọn điểm khi **Tách mặt phẳng** (và ngay bên cạnh nút **Tách mặt phẳng** khi chọn trực tiếp một mặt phẳng tô màu).
   - **Không tích chọn (mặc định)**: Hình 2D tách ra là bản độc lập, giữ nguyên kích thước và hình dạng ban đầu ngay cả khi hình 3D chính thay đổi.
   - **Tích chọn `☑ Đồng bộ`**: Mặt phẳng 2D tách ra tự động thay đổi hình dạng và tỷ lệ thực theo thời gian thực khi kéo đỉnh, xoay 3D, chạy **Chuyển động điểm**, hoặc vẽ thêm/xóa bớt điểm và đoạn thẳng nằm trên mặt phẳng đó ở hình 3D chính.
2. **Bật/Tắt Đồng Bộ Linh Hoạt Bất Cứ Lúc Nào**:
   - Khi bấm chọn lại mặt phẳng đã tách, thanh công cụ nổi hiển thị nút tích **`☑ Đồng bộ`** cho phép bật lại đồng bộ (hình lập tức cập nhật theo trạng thái mới nhất của hình 3D chính) hoặc bỏ tích để đóng băng nguyên mẫu.
   - Tự do kéo di chuyển vị trí mặt phẳng đã tách trên trang viết mà không bị giật về chỗ cũ khi đồng bộ.
3. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
