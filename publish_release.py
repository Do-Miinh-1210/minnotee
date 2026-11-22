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
TAG = "v0.0.6.4"
TITLE = "MinNote v0.0.6.4 - Xuất & Sao Chép Ảnh Vector EMF Không Nền (Inkscape/MinInk) Cho Word/PowerPoint & PNG Tách Nền"
BODY = """## MinNote v0.0.6.4 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.6.4 tích hợp **hệ thống xuất & sao chép ảnh vector EMF trong suốt (không nền)** theo chuẩn công cụ `Inkscape / MinInk` của `MEA_v5.0` — dán vào **Word / PowerPoint** siêu nét vô cực không còn khung trắng, và dán sang **Zalo / trình duyệt** ra ảnh PNG 3× tách nền:

### 🌟 Điểm Mới Trong Bản v0.0.6.4:
1. **Sao Chép Vector EMF Không Nền (`Ctrl+C` & Nút `EMF`)**:
   - Bỏ nền trắng cứng (`#fff`) khi sao chép đối tượng được chọn, ghi trực tiếp toàn bộ lệnh vẽ Canvas2D + `Path2D` (hình không gian 3D, nét đứt, mặt cắt trong suốt, chấm điểm, nhãn chữ nghiêng `Times New Roman`, nét bút tay...) thành SVG trong suốt và chuyển sang **vector EMF** qua `Inkscape / MinInk` (`--export-type=emf --export-text-to-path --export-dpi=600`).
   - Sử dụng tiến trình nền **`inkscape.com --shell` (warm process)** giúp tốc độ chuyển đổi EMF chỉ còn **~5 – 15 ms**.
   - Ghi đồng thời **`CF_ENHMETAFILE` (ID 14)** + **`PNG` 32-bit Alpha** bằng Win32 Clipboard nguyên bản (Word/PowerPoint dán vector EMF không nền; Zalo/Chrome dán ảnh PNG 3× tách nền; `Ctrl+V` trong MinNote vẫn giữ nguyên hình học chỉnh sửa được).
   - Bổ sung nút **`EMF`** chuyên biệt ngay cạnh nút `Sao chép` trên thanh chọn đối tượng (ghi thuần `CF_ENHMETAFILE` ép Word/PowerPoint dán vector 100%).
2. **Xuất File Vector `.emf` Không Nền**:
   - Bổ sung mục **`Xuất EMF (không nền)...`** trong menu **Xuất file** (xuất vùng đang chọn hoặc toàn bộ trang hiện tại ra file `.emf`).
3. **Tự Động Dò & Tải MinInk (Dùng Chung Với `MEA_v5.0`)**:
   - Tự phát hiện `Inkscape` có sẵn trên máy hoặc `MinInk` tại `%LocalAppData%\\MatrixExamAI\\tools\\minink`; nếu máy chưa cài sẽ tự tải nền có xác thực SHA-256 ghim cứng.
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
