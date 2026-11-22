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
TAG = "v0.0.6.0"
TITLE = "MinNote v0.0.6.0 - Sửa Triệt Để Lỗi Menu Thả Xuống Hiển Thị Chậm & Kéo Giãn Tràn Khung Ở Thanh Công Cụ Dưới/Trái/Phải"
BODY = """## MinNote v0.0.6.0 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.6.0 khắc phục triệt để lỗi menu thả xuống (`Chế độ viết`, `Tẩy`, `Hình vẽ`...) bị hiển thị chậm 1 nhịp và bị kéo giãn tràn dọc khắp màn hình khi đặt thanh công cụ ở vị trí **Dưới / Trái / Phải**:

### 🌟 Điểm Mới Trong Bản v0.0.6.0:
1. **Định Vị Menu Thả Xuống Đồng Bộ Tức Thì (`0ms`, Không Giật/Trễ)**:
   - Gỡ bỏ bộ `MutationObserver` bất đồng bộ trong `ui-switch.js` (vốn gán chồng `top !important` lên `bottom` khiến menu bị kéo giãn cao suốt màn hình hoặc nhảy vị trí sau 1 khung hình).
   - Tính toán vị trí trực tiếp trong `useLayoutEffect` đồng bộ của hộp menu (`si()`) theo đúng mép ngoài của thanh công cụ (`aside.tools-bar`), đảm bảo menu hiện ra tức thì ngay khung hình đầu tiên với chiều cao gọn tự nhiên (`156px`).
2. **Không Tràn / Đè Lên Thanh Công Cụ Ở Mọi Vị Trí**:
   - **Vị trí `Dưới`**: Menu mở gọn ngay phía trên thanh công cụ dưới (`cách 8px`), tách riêng hàng thanh Sheet bên dưới để không chồng lên nhau.
   - **Vị trí `Trái / Phải`**: Menu mở sát mép ngoài của cột công cụ 2 cột (`cách 8px`), không đè lên cột nút thứ 2; thu gọn nút `25px` để hiện đủ toàn bộ công cụ và bảng màu với khoảng trống thoáng ở đáy.
   - **Vị trí `Trên`**: Menu mở ngay dưới thanh công cụ ngang trên cùng.
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
