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
TAG = "v0.0.6.8"
TITLE = "MinNote v0.0.6.8 - Thiết Kế Lại Bảng Kịch Bản Đa Hình Gọn Gàng & Nút Thu Gọn Rõ Ràng 3 Cấp"
BODY = r"""## MinNote v0.0.6.8 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật **v0.0.6.8** thiết kế lại toàn bộ giao diện **Bảng Kịch Bản Dựng Hình** theo hướng tối giản, tích hợp chạy nhiều hình cùng lúc và bổ sung nút **Thu gọn** rõ ràng ở mọi trạng thái:

### 🌟 Điểm Mới Trong Bản v0.0.6.8:
1. **Nút Thu Gọn Rõ Ràng 3 Cấp**:
   - Nút **`▾ Thu gọn`** trên thanh tiêu đề bảng kịch bản, nút **`▴ Ẩn bước` / `▾ Hiện bước`** gập gọn bảng còn ~214px, và nút **`─ Thu gọn`** trên thanh chạy nổi thu về viên thuốc mini kéo thả tự do.
2. **Tích Hợp Chạy Nhiều Hình Gọn Gàng (Bỏ Toàn Bộ Nút Lặp)**:
   - Gộp điều khiển thành 1 thanh thống nhất **Phát/Dừng tất cả**, mỗi thẻ hình (`S.ABCD`, `S.MNP`…) có sẵn nút **`▶/⏸` riêng từng hình**, nhấp đúp đổi tên, nút **`📂 Đã lưu`** và **`Mẫu ▾`** gập gọn thông minh.
   - Bấm **`💾 Lưu`** lưu riêng cho tất cả hình đang mở.
3. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
