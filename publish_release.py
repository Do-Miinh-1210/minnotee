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
TAG = "v0.0.7.1"
TITLE = "MinNote v0.0.7.1 - Tham Số KaTeX Trực Tiếp Trên Bảng & Tự Vẽ Theo Tham Số Kiểu GSP5"
BODY = r"""## MinNote v0.0.7.1 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật **v0.0.7.1** tinh gọn hoàn toàn giao diện **Tham số GSP5** theo đúng quy trình vẽ hình tự nhiên trên bảng viết:

### 🌟 Điểm Mới Trong Bản v0.0.7.1:
1. **Đưa Nút Tham Số Vào Thanh Công Cụ & Bỏ Nút Hờ Góc Trái**:
   - Xóa hoàn toàn nút hờ ở góc dưới bên trái (trên nút `^ Sheet`).
   - Thêm nút **`Tham số hình học (GSP5)`** (`t=`) trực tiếp vào thanh công cụ ngay cạnh mục **Dựng hình** (hiển thị gọn trên thanh công cụ dưới).
2. **Tham Số Hiển Thị Dạng Công Thức KaTeX Sạch Đẹp Ngay Trên Bảng**:
   - Khi tạo tham số (`a = 2 cm`, `α = 60°`, `k = 0,5`…), chỉ hiển thị công thức **KaTeX** tinh gọn ngay trên trang viết, không bung bảng nổi che màn hình.
   - **Kéo thả** tự do đến bất kỳ vị trí nào trên bảng, **nháy 1 lần** để chọn tham số (hỗ trợ phím `+`/`-` tăng giảm nhanh), và **nháy đúp** vào công thức để mở bảng chỉnh sửa đầy đủ.
3. **Chọn Tham Số + Công Cụ Vẽ → Tự Động Vẽ Khóa Cứng Kiểu GSP5**:
   - Chọn `a = 2 cm` + **Đường tròn** → bấm 1 điểm tâm `O` (hoặc chọn sẵn `O`) → tự vẽ đường tròn `(O; R = a)` khóa cứng bán kính.
   - Chọn `a = 2 cm` + **Đoạn thẳng / Hình vuông / Tam giác đều / Khối 3D** → tự dựng đúng kích thước `a` đã khóa.
   - Chọn `α = 60°` + **Góc / Phép quay** (hoặc `k` + **Phép vị tự**) → tự dựng góc và phép biến hình liên kết sống với tham số.
4. **Cố Định Vị Trí Dưới `.selection-bar`**:
   - Đồng bộ lại vị trí nút **✦ AI Toán học**, công thức KaTeX mặc định và bảng tham số đầy đủ để không bao giờ che thanh chọn `.selection-bar`.
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
