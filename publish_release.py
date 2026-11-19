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
TAG = "v0.0.5.0"
TITLE = "MinNote v0.0.5.0 - Bộ Icon Phím Tắt Thanh Công Cụ Thiết Kế Lại Đồng Bộ & Sắc Nét"
BODY = """## MinNote v0.0.5.0 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.0 vẽ lại toàn bộ 22 icon phím tắt trên thanh công cụ theo ngôn ngữ thiết kế Duotone hiện đại, sắc nét và đồng nhất:

### 🌟 Điểm Mới Trong Bản v0.0.5.0:
1. **Vẽ Lại Toàn Bộ 22 Icon Phím Tắt Thanh Công Cụ (Modern Duotone SVG Set)**:
   - Chuẩn hóa toàn bộ 22 nút: Nét đứt, Hình mẫu, Hình học phẳng, Đồ thị hàm số, Bảng biến thiên, Hệ trục Oxyz 3D, Sơ đồ cây xác suất, Đường tròn lượng giác, Biểu đồ thống kê & Boxplot, Công thức Σ, Khung đề bài, Nhãn dán ghi chú, Đồng hồ bấm giờ, Xúc xắc ngẫu nhiên, Trình duyệt web, Máy tính khoa học (Casio / Vinacal), Văn bản T, Tô miền, Thước kẻ, Chọn đối tượng (kèm mũi tên trỏ), Bàn tay di chuyển và Bật/Tắt vẽ tay.
   - Đồng bộ độ dày nét (`1.75px`), bo góc tinh tế và điểm nhấn phủ mờ Duotone (`currentColor` + `fillOpacity`) hiển thị sắc nét cả ở trạng thái thường lẫn trạng thái kích hoạt trên nền xanh ngọc.
2. **Kế thừa toàn diện các tính năng v0.0.4.9**:
   - Tách biệt chọn đoạn thẳng và điểm đầu mút; chọn nhiều đối tượng khác loại bằng `Shift/Ctrl + Click` không nền xanh mờ.
   - Phóng to / thu nhỏ mượt mà bằng 2 ngón trên bàn di chuột (Touchpad Pinch-to-Zoom).
   - Máy tính VINACAL 680EX PLUS III tràn viền & màn hình sát viền; 2 máy tính Casio/Vinacal offline.
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
