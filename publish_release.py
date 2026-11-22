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
TAG = "v0.0.5.7"
TITLE = "MinNote v0.0.5.7 - Đồng Bộ Sáng/Tối Toàn Bộ Thanh Công Cụ & Sửa Nút Ẩn/Hiện Sheet Không Che Nút"
BODY = """## MinNote v0.0.5.7 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.7 khắc phục triệt để lỗi thanh công cụ nhảy giao diện lệch sáng/tối và lỗi nút hiện lại thanh Sheet che nút công cụ phía sau:

### 🌟 Điểm Mới Trong Bản v0.0.5.7:
1. **Đồng Bộ Giao Diện Sáng / Tối Cho Toàn Bộ Thanh Công Cụ**:
   - **Chế độ Sáng**: Thanh công cụ dọc, thanh trên, bảng màu, tiêu đề thư viện và thanh công cụ ở mọi vị trí (**Trên / Trái / Phải / Dưới / Nổi**) đồng nhất tông sáng ấm Atelier, icon đậm rõ nét — không còn lệch nền đen/trắng hay mất màu icon.
   - **Chế độ Tối**: Toàn bộ thanh công cụ, thanh rời (`aside.tools-bar`), bảng màu (có viền tương phản rõ cho chấm mực đen) và nút Sheet đồng bộ hoàn toàn nền tối Obsidian.
   - Khi chuyển vị trí thanh công cụ sang **Trái / Phải / Dưới**, bật chế độ **Nổi** hoặc ẩn thanh công cụ: tự động thu gọn cột rail bên trái về `0px` và ẩn logo `M` thừa, không còn nhảy giao diện hay để lại khoảng trống đen góc trên trái.
   - Menu thả xuống mở từ thanh công cụ ở cạnh phải hoặc cạnh dưới tự động định vị sang trái / phía trên để không bị tràn khỏi màn hình.
2. **Nút Hiện Lại Thanh Sheet (`^ Sheet`) Không Còn Che Nút Phía Sau**:
   - Tự động căn vị trí nút `^ Sheet` nằm gọn trong góc dưới bên trái vùng trang viết (`.board-wrap`), tự né thanh công cụ dọc bên trái, thanh công cụ bên dưới và thanh công cụ nổi ở mọi bố cục và kích thước màn hình.
   - Đồng bộ màu sắc sáng/tối của nút `^ Sheet` theo giao diện Atelier.
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
