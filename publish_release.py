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
TAG = "v0.0.5.6"
TITLE = "MinNote v0.0.5.6 - Giao Diện Mới Atelier"
BODY = """## MinNote v0.0.5.6 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.6 thay toàn bộ giao diện bằng thiết kế mới **Atelier**. Mọi tính năng giữ nguyên; giao diện cũ vẫn dùng được.

### Điểm mới trong bản v0.0.5.6
1. **Bố cục mới**:
   - Công cụ vẽ chuyển thành thanh dọc màu tối bên trái, nút to hơn (40px), hợp bút cảm ứng và bảng tương tác.
   - Màn hình thấp (1366×768, 1440×900) tự chuyển thanh công cụ sang 3 cột để hiện đủ công cụ, không phải cuộn.
   - Trang viết nổi như tờ giấy trên mặt bàn; danh sách trang chuyển sang bên phải.
   - Menu của công cụ mở bên phải thanh công cụ, ngang hàng với nút.
2. **Bộ icon mới**: thay toàn bộ 193 icon bằng icon khối đặc, dễ nhìn ở cỡ nhỏ. Icon toán học (đường tròn lượng giác, Oxyz, bảng biến thiên, thước đo độ, ê-ke, parabol...) được vẽ riêng.
3. **Màu và chữ mới**: màu nhấn tím iris và vàng hổ phách; font Be Vietnam Pro cho tiếng Việt. Có cả chế độ sáng và tối.
4. **Hiệu ứng chọn gọn hơn**: viền sáng của đường được chọn mảnh hơn, vòng tròn quanh điểm nhỏ lại vừa với điểm và theo màu giao diện.
5. **Khung cửa sổ** (thanh tiêu đề, màn chờ, hộp kích hoạt) dùng bảng màu mới.
6. **Về giao diện cũ**: bấm **Ctrl + Alt + U** để đổi qua lại; app nhớ lựa chọn cho lần mở sau.
7. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
