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
TAG = "v0.0.6.5"
TITLE = "MinNote v0.0.6.5 - Sửa Lỗi Biên Dịch TikZ (TeX Live & MiKTeX), Dựng Hình Sửa Được & Ảnh Vector SVG Trong Suốt"
BODY = r"""## MinNote v0.0.6.5 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật **v0.0.6.5** khắc phục triệt để lỗi biên dịch mã **TikZ** trong app (cả chế độ **Hình sửa được** lẫn **Ảnh TeX** và hình/bảng trong **Đề bài LaTeX**):

### 🌟 Điểm Mới Trong Bản v0.0.6.5:
1. **Biên Dịch TikZ Trực Tiếp Trong App WPF (`TikzCompilerService`) & Electron**:
   - Bổ sung cầu nối WebView2 (`RENDER_TIKZ` / `TRACE_TIKZ`) và bật lại đầy đủ nút chuyển chế độ **Hình sửa được** / **Ảnh TeX** trên hộp thoại TikZ & Đề bài LaTeX.
   - Tự động phát hiện và tương thích hoàn toàn với cả **TeX Live** (bỏ cờ `-enable-installer` vốn chỉ dành cho MiKTeX gây lỗi trên TeX Live) lẫn **MiKTeX**.
2. **Xuất Ảnh TikZ Dạng Vector SVG Trong Suốt Siêu Nét (`latex` + `dvisvgm`)**:
   - Ưu tiên xuất ảnh **SVG vector trong suốt** (`--no-fonts --exact-bbox`), giữ sắc nét vô cực khi phóng to và không phụ thuộc font máy; tự động dự phòng `pdflatex` + Ghostscript (`pngalpha`) / `pdftoppm`.
3. **Dựng Hình Sửa Được Chuẩn Theo TeX (`traceTikz`)**:
   - Gắn hook PGF trích xuất chính xác toàn bộ tọa độ điểm (`\coordinate`, `name intersections`, `calc`, `\foreach`, `\tkzDefPoint`…), màu sắc và luồng nét vẽ để dựng hình hình học kéo điểm được ngay cả với hình không gian phức tạp.
4. **Tự Động Nhận Diện Gói & Cú Pháp Linh Hoạt**:
   - Hỗ trợ mã TikZ trần, file LaTeX đầy đủ, bảng `\begin{tabular}`, tiếng Việt UTF-8 (`T5`), `tkz-euclide`, `tkz-tab`, `pgfplots`, `tikz-3dplot`, `circuitikz`, `patterns.meta`, `\hoac`, `\heva`.
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
