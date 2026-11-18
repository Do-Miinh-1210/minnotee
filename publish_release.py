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
TAG = "v0.0.4.5"
TITLE = "MinNote v0.0.4.5 - Bắt Điểm Phát Sáng Khi Tô Miền Đa Giác & Miền Kín"
BODY = """## MinNote v0.0.4.5 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.5 bổ sung cơ chế phản hồi thị giác thông minh khi sử dụng công cụ Tô miền:

### 🌟 Điểm Mới Trong Bản v0.0.4.5:
1. **Phát Sáng Điểm Khi Rê Chuột Trong Công Cụ Tô Miền (Fill Tool Point Glow)**:
   - Khi chọn công cụ **Tô miền** (đặc biệt là chế độ **Tô miền đa giác** và **Tô miền kín**), khi rê chuột vào các đỉnh/điểm của hình (A, B, C, D, S, giao điểm...):
     - Điểm tự động **phát sáng viền kép xanh ngọc `#0d9488`**.
     - Con trỏ chuột chuyển ngay sang dạng **bàn tay (pointer)**.
     - Giúp người dùng nhận biết tức thì chuột đã đặt trúng đỉnh/điểm chính xác tuyệt đối trước khi click chọn mặt đa giác cần tô màu.
2. **Kế thừa toàn diện các tính năng v0.0.4.4**:
   - Bắt điểm & bắt đường phát sáng khi vẽ/dựng hình học.
   - Tùy chọn ẩn đối tượng độc lập (Ẩn đường / Ẩn điểm / Ẩn mặt / Ẩn tất cả) không lo ẩn dây chuyền.
   - Chọn nhiều đối tượng (Multi-select) bằng Shift/Ctrl + Click hoặc quét vùng.
   - 2 Máy tính Casio fx-580VN X & VINACAL 680EX PLUS III offline, chụp LCD vào bảng.
   - Thanh công cụ liền khối tràn viền tinh tế, loại bỏ viền đen.
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
