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
TAG = "v0.0.4.6"
TITLE = "MinNote v0.0.4.6 - Máy Tính Vinacal 680EX Tràn Viền Liền Khối & Màn Hình Sát Viền"
BODY = """## MinNote v0.0.4.6 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.6 tinh chỉnh toàn diện giao diện máy tính VINACAL 680EX PLUS III:

### 🌟 Điểm Mới Trong Bản v0.0.4.6:
1. **Màn Hình Máy Tính VINACAL Sát Viền & Thân Máy Tràn Viền (Edge-to-Edge)**:
   - **Màn hình LCD sát viền**: Màn hình LCD của Vinacal được mở rộng tối đa ra hai bên (căn lề chỉ ~7.6px tương đương Casio fx-580VN X), loại bỏ khoảng thụt vào sâu gây hẹp màn hình.
   - **Thân máy tràn viền không khoảng hở**: Xóa bỏ hoàn toàn khoảng viền xám đen thụt vào xung quanh thân máy, thân máy trắng mở rộng 100% liền khối với khung cửa sổ MinNote.
   - **Tỷ lệ hiển thị tối ưu**: Chiều cao cửa sổ máy tính tự động mở rộng bao quát toàn bộ cụm phím số và phím chức năng mà không bị cắt khuất hay cuộn trang.
2. **Kế thừa toàn diện các tính năng v0.0.4.5**:
   - Tô miền (Fill tool) bắt điểm phát sáng xanh ngọc `#0d9488` và con trỏ pointer khi hover đỉnh đa giác.
   - Bắt điểm & bắt đường phát sáng khi vẽ/dựng hình học.
   - Tùy chọn ẩn đối tượng độc lập (Ẩn đường / Ẩn điểm / Ẩn mặt / Ẩn tất cả).
   - Chọn nhiều đối tượng (Multi-select) bằng Shift/Ctrl + Click hoặc quét vùng.
   - 2 Máy tính Casio fx-580VN X & VINACAL 680EX PLUS III offline, chụp LCD vào bảng.
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
