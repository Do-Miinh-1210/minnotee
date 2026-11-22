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
TAG = "v0.0.6.7"
TITLE = "MinNote v0.0.6.7 - Khóa Khung Camera 0px Khi Quay, Thu Gọn Thanh Kịch Bản, Chạy Song Song Nhiều Kịch Bản & Nhớ Kịch Bản Riêng Theo Từng Hình"
BODY = r"""## MinNote v0.0.6.7 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật **v0.0.6.7** khắc phục triệt để độ lệch khung quay trên WebView2 và nâng cấp mạnh hệ thống **Kịch bản dựng hình**:

### 🌟 Điểm Mới Trong Bản v0.0.6.7:
1. **Khung Camera Cố Định Tuyệt Đối (0 px Nhảy Xuống Khi Bắt Đầu Quay)**:
   - Khởi tạo trước luồng quay tab ngầm ngay khi mở chọn khung trên WPF WebView2 để thanh trạng thái `44px` ổn định sẵn trước khi căn khung (`dIh = 0, dx = 0, dy = 0`).
2. **Nút Thu Gọn 3 Cấp Cho Thanh Chạy Kịch Bản & Chuyển Động Điểm**:
   - Thanh chạy kịch bản nổi kéo thả tự do được và có nút **`─` Thu gọn tối đa** thành viên thuốc mini; bảng **Chuyển động điểm** cũng có nút **`─` Thu gọn**.
3. **Chạy Song Song Nhiều Kịch Bản Cùng Lúc**:
   - Hỗ trợ mở nhiều tab kịch bản hình độc lập và chạy đồng thời trên cùng vòng lặp 60 FPS, kèm nút **▶▶ Phát tất cả / ⏸ Dừng tất cả / ↺ Reset tất cả**.
4. **Nhớ Kịch Bản Riêng Theo Từng Hình**:
   - Lưu kịch bản riêng cho từng hình (`pg.geo.scripts`), tự khôi phục đúng kịch bản của hình cũ dù đã đổi/sửa hình khác, kèm dải **📂 Đã lưu** mở nhanh bằng 1 click.
5. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
