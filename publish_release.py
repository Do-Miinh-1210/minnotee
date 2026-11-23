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
TAG = "v0.0.7.0"
TITLE = "MinNote v0.0.7.0 - Bộ Tham Số & Ràng Buộc Hình Học Kiểu GSP5 (2D/3D Chuẩn Tỉ Lệ) & Hạ Nút AI Toán Học"
BODY = r"""## MinNote v0.0.7.0 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật lớn **v0.0.7.0** ra mắt **Bộ Tham Số & Ràng Buộc Hình Học Kiểu GSP5** giúp cố định tuyệt đối độ dài, góc, tỉ lệ cho cả hình **2D** và **3D**, đồng thời tinh chỉnh vị trí nút nổi **AI Toán học**:

### 🌟 Điểm Mới Trong Bản v0.0.7.0:
1. **Hệ Thống Tham Số Kiểu GSP5 (`Tham số GSP5` / `Alt+P`)**:
   - Hộp thoại **Tham số mới (GSP5)** hỗ trợ đầy đủ 3 đơn vị **Không (tỉ số)**, **Góc (°)**, **Khoảng cách (cm)**, nút chọn tên nhanh (`a, b, c, h, r, α, β, k`) và **nhập công thức liên kết** (VD: `a*sqrt(2)`, `180 - 2*α`, `a*sin(α)`).
   - Kéo thanh trượt, nhập số trực tiếp hoặc bấm **`▶`** chạy hoạt hình tham số để hình 2D/3D biến đổi mượt mà theo thời gian thực.
2. **Khóa Cứng Độ Dài, Bán Kính & Số Đo Góc (Không Thể Kéo Lệch)**:
   - Ngay trên thanh công cụ chọn (`.sel-bar`) cạnh ô **`Độ dài [ ... ] cm`** có nút **`🔒 / 🔓`** khóa cứng độ dài và nút **`fx`** gắn tham số trực tiếp.
   - Đoạn thẳng đã khóa `2 cm` sẽ **tuyệt đối không thể kéo giãn thành 3 cm** (mặc định chỉ xoay quanh gốc hoặc khóa cứng cả phương); góc đã khóa `60°` chỉ cho trượt đúng dọc tia `60°`.
3. **Dựng Hình 2D & 3D Chuẩn Tỉ Lệ Theo Tham Số**:
   - Dựng nhanh **2D**: Đoạn thẳng cố định, Góc chuẩn, Đường tròn bán kính chuẩn, Tam giác (c-g-c & 3 cạnh c-c-c), Hình chữ nhật/vuông, Hình bình hành/thoi.
   - Dựng nhanh **3D chuẩn tỉ lệ**: Chóp tứ giác đều `S.ABCD`, Chóp HCN `SA ⊥ đáy`, Chóp tam giác `S.ABC`, Hình hộp/Lập phương, Lăng trụ đứng tam giác, Hình nón, Hình trụ — đổi tham số co giãn đúng tỉ lệ 3D, tự cập nhật nét đứt và giữ nguyên ràng buộc ngay cả sau khi **Xoay 3D**, **Tách mặt phẳng**, **Tách thiết diện**.
4. **Sửa Vị Trí Nút Nổi `✦ AI Toán học`**:
   - Hạ nút nổi xuống dưới khung chọn (luôn nằm dưới thanh công cụ `.sel-bar` và trên thanh bút ở đáy), không còn che khuất các nút công cụ hình học.
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
