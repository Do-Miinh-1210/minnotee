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
TAG = "v0.0.6.3"
TITLE = "MinNote v0.0.6.3 - Sửa Sao Chép Hình Lấy Trọn Đầy Đủ Nhãn Điểm (Kể Cả Khi Tắt Tên Tự Động) & Nâng Nét 3× HiDPI"
BODY = """## MinNote v0.0.6.3 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.6.3 khắc phục lỗi bị cắt mất nhãn điểm (`S, B, C, D…`) ở các mép ảnh khi sao chép đối tượng hình học ra Zalo / Word / PowerPoint:

### 🌟 Điểm Mới Trong Bản v0.0.6.3:
1. **Sao Chép (`Ctrl+C`) Luôn Lấy Đầy Đủ Toàn Bộ Nhãn Điểm & Chấm Tròn**:
   - Bỏ điều kiện chỉ mở rộng khung ảnh khi bật tên tự động của sổ (`if (r.names)`): nay luôn tự động tính toán và mở rộng vùng ảnh sao chép cho **tất cả các nhãn điểm đang hiển thị** (bao gồm cả nhãn bật thủ công bằng **`Ctrl+K`** hay **Đặt tên điểm** khi sổ đang tắt tự đánh tên) cùng bán kính chấm tròn ở 4 biên.
   - Tự tính độ rộng theo số ký tự nhãn (`A`, `A'`, `M_1`…) và thêm lề trắng cân đối (`16px`) giúp không bao giờ bị cắt mất chữ ở mép ảnh.
2. **Nâng Độ Sắc Nét Ảnh Sao Chép Lên `3×` HiDPI**:
   - Tăng tỷ lệ kết xuất ảnh sao chép (`selectionImage`) từ `2×` lên `3×`, cho hình vẽ dán sang Zalo / Word / PowerPoint sắc nét rõ từng nét liền, nét đứt và ký hiệu điểm.
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
