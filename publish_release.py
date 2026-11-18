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
TAG = "v0.0.4.4"
TITLE = "MinNote v0.0.4.4 - Bắt Điểm/Đường Phát Sáng Khi Dựng Hình & Tùy Chọn Ẩn Độc Lập"
BODY = """## MinNote v0.0.4.4 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.4 mang đến trải nghiệm vẽ hình và quản lý đối tượng hình học trực quan, chính xác:

### 🌟 Điểm Mới Trong Bản v0.0.4.4:
1. **Bắt Điểm & Bắt Đường Khi Vẽ/Dựng Hình (Glow Highlight Feedback)**:
   - Khi chọn bất kỳ tính năng vẽ/dựng hình nào trong menu Hình học (Điểm, Đoạn thẳng, Đường thẳng, Giao điểm, Trung điểm, Song song, Vuông góc, Tiếp tuyến...), khi rê chuột vào điểm hoặc đoạn thẳng/đường thẳng có sẵn:
     - **Điểm phát sáng nhẹ** viền kép xanh ngọc `#0d9488` báo hiệu trúng điểm.
     - **Đoạn thẳng / Đường thẳng phát sáng nhẹ** viền glow xanh ngọc `#0d9488` (alpha 60%, độ dày +4px) và con trỏ chuột đổi sang pointer, giúp người dùng nhận biết ngay lập tức chuột đã đặt trúng đối tượng cần tương tác.
2. **Ẩn Đối Tượng Tùy Chọn Độc Lập (Không Bị Ẩn Theo Dây Chuyền)**:
   - Sửa lỗi khi ẩn đường thẳng làm ẩn luôn các điểm đầu mút của đường.
   - Bổ sung các tùy chọn phân loại ẩn trực tiếp trên thanh công cụ:
     - **Ẩn đường**: Chỉ ẩn đoạn thẳng/đường thẳng đã chọn, toàn bộ điểm và tên đỉnh giữ nguyên vẹn trên bảng.
     - **Ẩn điểm**: Chỉ ẩn các điểm được chọn, giữ nguyên đường.
     - **Ẩn mặt**: Chỉ ẩn các mặt/mặt phẳng/đa giác được chọn.
     - **Ẩn tất cả**: Ẩn đồng loạt toàn bộ đối tượng chọn.
3. **Chọn Nhiều Đối Tượng (Multi-Select)**:
   - Hỗ trợ giữ phím `Shift` hoặc `Ctrl` khi click để chọn nhiều đường, điểm, mặt cùng lúc hoặc dùng khoanh vùng chọn để ẩn hàng loạt một cách nhanh chóng.
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
