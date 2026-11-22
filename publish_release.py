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
TAG = "v0.0.6.6"
TITLE = "MinNote v0.0.6.6 - Nâng Cấp Quay Màn Hình Siêu Nét 60fps, Khung Chính Xác 1:1, Cài Đặt Lưu Trữ & Bỏ Qua Hộp Thoại Xác Nhận"
BODY = r"""## MinNote v0.0.6.6 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật **v0.0.6.6** nâng cấp toàn diện hệ thống **Quay Màn Hình** trong MinNote theo chuẩn ứng dụng desktop chuyên nghiệp:

### 🌟 Điểm Mới Trong Bản v0.0.6.6:
1. **Khung Camera Chính Xác Tuyệt Đối 1:1 (Hết Lệch Khung Sau Setup)**:
   - Khóa tọa độ khung ngay khi bấm **Bắt đầu quay**, đồng bộ 0 px giữa khung chọn vùng và khung viền đỏ khi đang quay.
   - Cắt video chuẩn từng điểm ảnh gốc bằng **Region Capture (`CropTarget.fromElement`)** kết hợp bộ dự phòng tự bù tỷ lệ & viền đen.
2. **Chất Lượng Video Đầu Ra Siêu Nét (HiDPI 1:1 • 60 FPS • 24 Mbps)**:
   - Mặc định chế độ **Siêu nét** (24 Mbps, H.264 High Profile, 60 FPS, âm thanh 192 kbps lọc ồn) kèm `contentHint = 'detail'` giữ sắc nét từng đường hình học & công thức toán.
3. **Bảng Cài Đặt Quay Màn Hình & Lưu Trữ Chuyên Biệt (3 Tab)**:
   - Chọn/mở thư mục lưu mặc định (`Videos\MinNote`), đặt tiền tố tên tệp, chọn chế độ **Xem trước & lưu** hoặc **Tự động lưu**, chỉnh chất lượng/FPS/định dạng/micro và quản lý danh sách video đã lưu.
4. **Loại Bỏ Hộp Thoại Tải Xuống Kiểu Trình Duyệt Web**:
   - Chặn hoàn toàn popup **"Nội dung tải xuống"** của WebView2, thay bằng **Bảng Xem Trước & Lưu Video** ghi trực tiếp xuống ổ đĩa qua `VideoRecorderService`.
5. **Bỏ Qua Xác Nhận Tab Trình Duyệt Khi Bắt Đầu Quay**:
   - Tự động chấp nhận quay tab hiện tại (`--auto-accept-this-tab-capture`) và tự cấp quyền Micro cho ứng dụng.
6. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
