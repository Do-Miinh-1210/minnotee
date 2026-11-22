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
TAG = "v0.0.6.2"
TITLE = "MinNote v0.0.6.2 - Nâng Cấp Sơ Đồ Tư Duy Chuẩn Vector Siêu Nét, Nhúng Trọn Bộ Font KaTeX Không Vỡ Nét Khi Zoom & Chèn Bảng Vẽ"
BODY = """## MinNote v0.0.6.2 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.6.2 làm lại toàn bộ hệ thống hiển thị zoom và kết xuất của **Sơ đồ tư duy Toán học**, khắc phục triệt để tình trạng vỡ nét khi phóng to và mất công thức toán học khi chèn vào bảng vẽ:

### 🌟 Điểm Mới Trong Bản v0.0.6.2:
1. **Phóng To Sơ Đồ Tư Duy Không Vỡ Nét (Tới 400%)**:
   - Chuyển cơ chế thu phóng trong Studio Sơ đồ tư duy từ `transform: scale()` trên lớp bitmap GPU `4000×4000` sang cơ chế `CSS zoom` vector thuần kết hợp dịch chuyển nguyên pixel, giúp mọi chữ viết, đường cong Bezier và công thức KaTeX luôn sắc nét tuyệt đối ở mọi mức zoom (`20% – 400%`).
2. **Nhúng Trọn Bộ 20 Font KaTeX (`.woff2`) Vào Vector SVG — Không Bao Giờ Mất Công Thức Toán**:
   - Gỡ bỏ cơ chế trích xuất văn bản thô (`mm-native-fallback`) và bộ lọc tách nền ăn mất nét chữ tối (`removeMindmapBackground`) trước đây.
   - `generateMindmapSvg()` tự động nhúng trọn bộ 20 font KaTeX dưới dạng Base64 vào `<svg><style>` cùng DOM KaTeX nguyên bản, giữ vẹn nguyên 100% mọi công thức phức tạp: giới hạn, phân số, căn thức, tích phân, vectơ, hệ phương trình, ký hiệu tập số.
3. **Chèn Bảng Vẽ Dạng Vector SVG Thuần & Xuất Ảnh 4K Siêu Nét**:
   - Nút **`Chèn Bảng vẽ`** chèn trực tiếp vector SVG nền trong suốt (nhúng sẵn font KaTeX) vào bảng viết — phóng to trên bảng viết lên `200% – 400%` hoặc kéo to nhỏ vẫn **giữ nét chân thực, không bao giờ vỡ hạt**.
   - Xuất **Word** và tải **PNG** dùng độ phân giải siêu nét **4K (`scale = 4×`, nền trong suốt)** từ cùng nguồn vector chuẩn KaTeX.
4. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
