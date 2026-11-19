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
TAG = "v0.0.4.9"
TITLE = "MinNote v0.0.4.9 - Tách Biệt Chọn Điểm/Đoạn Thẳng & Chọn Nhiều Đối Tượng Không Nền Xanh Mờ"
BODY = """## MinNote v0.0.4.9 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.9 tách biệt hoàn toàn giữa các đối tượng khi chọn và loại bỏ nền xanh mờ khi chọn nhiều đối tượng:

### 🌟 Điểm Mới Trong Bản v0.0.4.9:
1. **Tách Biệt Độc Lập Giữa Đoạn Thẳng & Điểm Khi Chọn**:
   - Click trực tiếp vào đoạn thẳng, đường thẳng, tia, đường tròn hoặc cạnh đa giác chỉ chọn **duy nhất đường/cạnh đó**, không còn tự động kéo theo 2 điểm đầu mút vào vùng chọn.
   - Click vào điểm chỉ chọn đúng điểm đó; kéo đoạn thẳng vẫn tự động di chuyển mượt mà.
2. **Chọn Nhiều Đối Tượng Khác Nhau Cùng Lúc (`Shift / Ctrl + Click`)**:
   - Hỗ trợ giữ `Shift` hoặc `Ctrl` rồi bấm để chọn/bỏ chọn xen kẽ **nhiều đối tượng khác loại cùng lúc** (đoạn thẳng + điểm + mặt + nét bút vẽ tay + ảnh/văn bản), kể cả khi đối tượng nằm chồng bên trong khung của các đối tượng đã chọn trước đó.
   - Không còn tự kéo thêm các điểm hay cạnh lân cận không được bấm; bấm nhầm ra khoảng trắng khi đang giữ `Shift/Ctrl` không làm mất các đối tượng đã chọn.
   - Thanh công cụ chọn tự động cập nhật tức thì đầy đủ nút (`Ẩn đường`, `Ẩn điểm`, `Kiểu đường`, `Kiểu nét`, `Xóa`...) đúng theo các loại đối tượng đang chọn.
3. **Bỏ Hoàn Toàn Nền Xanh Mờ Phía Sau Vùng Chọn**:
   - Loại bỏ nền xanh mờ `rgba(0, 128, 255, 0.135)` trên tất cả khung chọn để nhìn xuyên suốt hình vẽ rõ ràng.
   - Khi chọn nhiều đối tượng bằng `Shift/Ctrl + Click`: chỉ phát sáng xanh ngọc `#0d9488` trực tiếp trên từng điểm, đoạn thẳng, nét bút hoặc viền từng đối tượng được chọn — không hiện khung bao lớn gây rối mắt.
4. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
