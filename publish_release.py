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
TAG = "v0.0.4.3"
TITLE = "MinNote v0.0.4.3 - Loại Bỏ Viền Đen, Thanh Công Cụ Liền Khối Tràn Viền Tinh Tế"
BODY = """## MinNote v0.0.4.3 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.3 khắc phục triệt để viền đen xung quanh thanh công cụ:

### 🌟 Điểm Mới Trong Bản v0.0.4.3:
1. **Loại bỏ hoàn toàn viền đen xung quanh thanh công cụ**:
   - **Xóa bỏ các dải viền đen (Black Frame/Margins)**: Loại bỏ các khoảng hở màu đen thô ở mép trái, mép phải và đường viền đen nằm giữa thanh công cụ với giấy kẻ bảng viết.
   - **Thanh công cụ tràn viền (Edge-to-Edge Ribbon)**: Thanh công cụ trải rộng 100% chiều ngang cửa sổ với nền kính mờ nhẹ (`rgba(255, 255, 255, 0.98)` + `backdrop-filter: blur(12px)`), kết nối liền mạch trực tiếp với không gian bảng vẽ qua đường chỉ hairline mảnh `#cbd5e1`.
   - **Nền WebView2 & WPF đồng nhất**: Thiết lập nền `#FFFFFF` / `Transparent` cho khung chứa WebView2, không còn hiện tượng khoảng đen lộ ra ngoài.
2. **Kế thừa toàn diện các tính năng v0.0.4.2**:
   - Nhóm nút công cụ mở rộng phẳng, thanh lịch, chuẩn hệ thống MinNote.
   - 2 Máy tính chuyển đổi Casio fx-580VN X ⇄ VINACAL 680EX PLUS III offline & chụp LCD vào bảng.
   - Tương tác chọn đối tượng: Chỉ phát sáng khi rê chuột (hover), không hiện chấm sáng rảnh.
   - Nhập file Word (.docx, .doc) trực tiếp qua hộp thoại file & chuyển đổi nạp trang.
   - Đồng bộ Google Drive & Font chuẩn Hóa học MHChem.
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
