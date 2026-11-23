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
TAG = "v0.0.7.2"
TITLE = "MinNote v0.0.7.2 - Chức Năng Tạo Quỹ Tích Hình Học Động (Locus & Trace Kiểu GSP5)"
BODY = r"""## MinNote v0.0.7.2 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật **v0.0.7.2** chính thức bổ sung **Chức năng Tạo Quỹ Tích Hình Học Động (Locus) & Vết Chuyển Động (Trace)** theo chuẩn **The Geometer's Sketchpad (GSP5)**, phục vụ công tác giảng dạy và giải bài toán quỹ tích toán học:

### 🌟 Điểm Mới Trong Bản v0.0.7.2:
1. **Công Cụ Quỹ Tích Trực Tiếp Trên Thanh Công Cụ Dựng Hình (`Alt+L`)**:
   - Thêm công cụ **Quỹ tích** vào nhóm **Dựng hình** trên thanh công cụ và nút **`Quỹ tích`** trực tiếp trên thanh chọn đối tượng (`.sel-bar`).
   - Hỗ trợ thao tác 2 lần bấm linh hoạt theo mọi thứ tự: bấm điểm cần tìm quỹ tích trước $\to$ điểm dẫn chuyển động sau, hoặc ngược lại.
2. **Quỹ Tích Điểm Động Liên Tục Theo Thời Gian Thực**:
   - Tự động dựng đường quỹ tích toán học mượt mà của điểm phụ thuộc khi điểm dẫn di chuyển trên đường tròn, đoạn thẳng, tia, đường thẳng hoặc đa giác.
   - Khi dời các điểm gốc hoặc co dãn hình, đường quỹ tích tự động co dãn, cập nhật tức thì.
   - Tích hợp bộ giải thuật thích ứng thông minh phát hiện tiệm cận và điểm gián đoạn vô cực (không bị nối vạch ngang màn hình).
3. **Tạo Họ Hình / Bao Hình (Shape Envelope)**:
   - Hỗ trợ chọn cả một đoạn thẳng, đường thẳng, tia, đường tròn hoặc đa giác kết hợp với điểm chuyển động để sinh ra **họ hình bao** (ví dụ: họ tiếp tuyến của đường tròn/parabol, họ đoạn thẳng đối xứng...).
4. **Kết Hợp 1-Click Với Tham Số KaTeX Trên Bảng**:
   - Khi chọn một tham số KaTeX (ví dụ $\alpha = 60^\circ$ hoặc $a = 2\text{ cm}$), chỉ cần bấm công cụ Quỹ tích $\to$ bấm 1 điểm phụ thuộc, MinNote sẽ tự dựng toàn bộ quỹ tích khi tham số biến thiên.
5. **Chế Độ Chạy Chuyển Động & Vết Điểm (Trace GSP5)**:
   - Nút chạy tự động (▶ / ⏸) cho điểm dẫn trượt mượt mà dọc quỹ đạo để minh họa trực quan sinh động trong giờ dạy học.
   - Chế độ **Vết chuyển động** cho phép ghi lại đường đi của bất kỳ điểm nào và nút **`💾 Lưu vết`** để chuyển thành nét vẽ vector cố định trên bảng.
6. **Bản Quyền Độc Quyền**: Duy nhất `admin_matrixexamAI` gói `ULTRA`.
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
