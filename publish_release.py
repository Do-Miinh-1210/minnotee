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
TAG = "v0.0.4.2"
TITLE = "MinNote v0.0.4.2 - Thiết Kế Thanh Công Cụ Liền Mạch, Tinh Tế & Đồng Bộ Hệ Thống"
BODY = """## MinNote v0.0.4.2 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.2 tập trung hoàn thiện thẩm mỹ giao diện và độ liền mạch của thanh công cụ:

### 🌟 Điểm Mới Trong Bản v0.0.4.2:
1. **Thiết kế Thanh công cụ Đồng nhất & Liền khối**:
   - **Loại bỏ hoàn toàn khung viền xanh nổi cộm**: Nhóm công cụ mở rộng `[Kho Đề, Sơ Đồ, 3D, Hóa | Dán Word, Nhập Word, Drive, Ảnh]` được tích hợp đồng nhất vào hệ thống `.tb-group` chuẩn của MinNote (nền `#f8fafc`, viền mềm `#e2e8f0`, đổ bóng lõm tinh tế).
   - **Chuẩn hóa nút phẳng (Flat Toolbar Button)**: Bỏ viền trắng riêng của từng nút, chữ màu slate trung tính `#334155` trọng lượng 500 thanh lịch, icon 15px thanh thoát.
   - **Hiệu ứng Hover mượt mà**: Nút chuyển nền xám sáng mềm `#e2e8f0` khi rê chuột, icon giữ nguyên tỉ lệ chuẩn không bị phóng to lệch lạc.
   - **Vạch phân cách tinh tế**: Bổ sung đường chia hairline giữa nhóm công cụ học tập (Kho Đề, Sơ Đồ, 3D, Hóa) và nhóm dữ liệu/tài liệu (Dán Word, Nhập Word, Drive, Ảnh) tạo nhịp điệu thị giác hài hòa như hàng công cụ vẽ.
2. **Kế thừa đầy đủ các tính năng bản v0.0.4.1**:
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
