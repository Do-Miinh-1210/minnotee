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
TAG = "v0.0.5.1"
TITLE = "MinNote v0.0.5.1 - Tự Động Cập Nhật Nét Liền / Nét Đứt Hình Không Gian 3D Theo Thời Gian Thực"
BODY = """## MinNote v0.0.5.1 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.1 bổ sung tính năng tự động hóa nét liền / nét đứt theo không gian 3D khi kéo di chuyển đỉnh hoặc điểm trên hình khối:

### 🌟 Điểm Mới Trong Bản v0.0.5.1:
1. **Tự Động Cập Nhật Nét Liền / Nét Đứt Theo Không Gian 3D (Real-time Auto Hidden-Line)**:
   - Khi kéo đỉnh (ví dụ kéo đỉnh `S` sang trái/phải hoặc kéo xuống dưới mặt đáy `ABCD`) hoặc di chuyển điểm thuộc hình khối 3D, toàn bộ các cạnh, đường chéo, đoạn thẳng dựng thêm (`MN`, `NC`, `MC`, `MB`...), đường thẳng và tia (`line`, `ray`, `extend`) tự động tính lại mặt nhìn thấy / mặt khuất và chuyển đổi nét liền ↔ nét đứt ngay trong lúc kéo theo thời gian thực.
   - Áp dụng cho mọi khối 3D dựng sẵn (hình chóp, lăng trụ, hình hộp, lập phương, bát diện, hình chóp cụt, nón, trụ, cầu...) và các hình 2D đã chuyển sang 3D (`Chuyển thành 3D`).
   - Hỗ trợ cả kéo đơn điểm, gộp điểm và biến dạng nhóm đỉnh (kéo một phần đỉnh của khối), đồng thời giữ nguyên kiểu nét thủ công khi chỉ di chuyển tịnh tiến cả khối hình hoặc khi người dùng chủ động bấm nút đổi nét đứt/liền.
2. **Tùy Chọn Bật / Tắt Trong Menu Dựng Hình Động (`HÌNH VẼ`)**:
   - Thêm mục `✓ Tự động nét liền / đứt` ngay dưới `Bắt điểm lưới` (mặc định bật và tự động lưu cấu hình) để giáo viên có thể tắt tạm thời khi muốn giữ nguyên nét đứt thủ công trong lúc kéo điểm.
3. **Kế thừa toàn diện các tính năng v0.0.5.0**:
   - Bộ 22 icon phím tắt Duotone thiết kế lại đồng bộ và sắc nét.
   - Tách biệt chọn đoạn thẳng và điểm đầu mút; chọn nhiều đối tượng bằng `Shift/Ctrl + Click` không nền xanh mờ.
   - Touchpad Pinch-to-Zoom mượt mà; máy tính Casio FX-580VN X & VINACAL 680EX PLUS III tràn viền offline.
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
