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
TAG = "v0.0.5.4"
TITLE = "MinNote v0.0.5.4 - Sửa Trắng Màn Hình Công Cụ Trên Thanh, Đồng Bộ Giao Diện Tối, Định Dạng Đường Mặc Định & Tách Hình Dịu Màu"
BODY = """## MinNote v0.0.5.4 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.4 sửa triệt để lỗi trắng màn hình, hoàn thiện giao diện Tối, chuẩn hóa thứ tự kịch bản và bổ sung định dạng đường mặc định:

### 🌟 Điểm Mới Trong Bản v0.0.5.4:
1. **Sửa Lỗi Trắng Màn Hình Khi Mở `Thanh công cụ → Công cụ trên thanh...`**:
   - Bổ sung đầy đủ icon & nhãn cho nút **Máy tính** (`calc`) trong danh sách tùy chỉnh thanh công cụ và cơ chế chống lỗi khi thiếu icon, đảm bảo hộp thoại mở mượt 100% không bao giờ crash.
2. **Tương Thích Hoàn Toàn Giao Diện Tối (`html.dark`)**:
   - Thiết kế lại trọn bộ bảng màu tối Obsidian Slate & Emerald Teal cho thanh công cụ, menu thả xuống, danh sách trang, thư viện sổ, thanh sheet, bảng Cài đặt, bảng Chuyển động điểm và bảng Kịch bản dựng hình — chữ rõ nét, không còn tình trạng nền trắng hoặc chữ tối trên nền tối.
3. **Kịch Bản Dựng Lại Hình Theo Đúng Thứ Tự Vẽ Ban Đầu**:
   - Đọc trực tiếp dấu thời gian khởi tạo từ mã đối tượng (`nt()`) để sắp xếp chính xác từng điểm, giao điểm và đường theo đúng trình tự thời gian người dùng đã vẽ từ đầu đến cuối.
4. **Định Dạng Đường & Điểm Mặc Định Rõ Ràng Trong `Cài đặt → HÌNH VẼ`**:
   - Bổ sung mục **Định dạng đường mặc định** ngay trong hộp thoại Cài đặt: chỉnh độ dày nét (`1.0 – 6.0 px`) có xem trước trực tiếp, chọn màu đường mặc định và kiểu nét mặc định (**Nét liền / Nét đứt**), tự động lưu và áp dụng ngay khi vẽ.
   - Tăng độ rõ mặc định cho chấm tròn điểm (`5.5 px`) và nét đường mặc định (`2.5 px`).
5. **Làm Dịu Màu Khi Tách Thiết Diện / Trải Hình 3D**:
   - Giảm độ đậm màu phủ mặt cắt khi tách thiết diện (`0.80 → 0.32`, mặt bên `0.16 → 0.09`), trải hình (`0.55 → 0.26`) và tách mặt phẳng (`0.25 → 0.16`) giúp màu vừa mắt, dễ nhìn rõ các cạnh khuất và nhãn điểm.
6. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
