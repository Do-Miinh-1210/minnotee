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
TAG = "v0.0.4.7"
TITLE = "MinNote v0.0.4.7 - Hỗ Trợ Phóng To / Thu Nhỏ Bằng Bàn Di Chuột (Touchpad Pinch-to-Zoom)"
BODY = """## MinNote v0.0.4.7 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.7 khôi phục hoàn toàn tính năng phóng to / thu nhỏ mượt mà bằng 2 ngón trên bàn di chuột (Touchpad):

### 🌟 Điểm Mới Trong Bản v0.0.4.7:
1. **Phóng To / Thu Nhỏ Bằng Bàn Di Chuột (Touchpad Pinch-to-Zoom)**:
   - Gỡ bỏ cờ `--disable-pinch` / `PinchToZoom` và bật `IsPinchZoomEnabled = true` trong WebView2 để Windows Precision Touchpad truyền cử chỉ chụm/mở 2 ngón (`ctrl + wheel`) trực tiếp vào bảng viết.
   - Chặn zoom trình duyệt ngoài vùng canvas (`e.preventDefault()` ở cấp `window` & `touch-action: pan-x pan-y`), đảm bảo chỉ phóng to/thu nhỏ trang viết mượt mà tại vị trí con trỏ mà không làm méo thanh công cụ.
2. **Kế thừa toàn diện các tính năng v0.0.4.6**:
   - Máy tính VINACAL 680EX PLUS III tràn viền liền khối & màn hình LCD sát viền.
   - Tô miền (Fill tool) bắt điểm phát sáng xanh ngọc `#0d9488` khi hover đỉnh đa giác.
   - Bắt điểm & bắt đường phát sáng khi vẽ/dựng hình học; tùy chọn ẩn độc lập (đường / điểm / mặt / tất cả) & chọn nhiều đối tượng.
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
