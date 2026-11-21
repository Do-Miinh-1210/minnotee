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
TAG = "v0.0.5.2"
TITLE = "MinNote v0.0.5.2 - Chuyển Động Điểm, Dựng Lại Hình Theo Kịch Bản & Phím Tắt Ctrl+H / Ctrl+Shift+H / Ctrl+M"
BODY = """## MinNote v0.0.5.2 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.2 bổ sung bộ công cụ trình diễn hình học động chuyên nghiệp và bộ phím tắt dựng hình nhanh:

### 🌟 Điểm Mới Trong Bản v0.0.5.2:
1. **Chuyển Động Điểm Có Cài Đặt Tốc Độ (Point Animation)**:
   - Chọn bất kỳ điểm di chuyển được (điểm trên đoạn/đường thẳng, trên đường tròn/đường cong, điểm theo phương vectơ hoặc điểm tự do) → bấm nút **Chuyển động** trên thanh nổi (ngay cạnh `Hiện vết`).
   - Hỗ trợ chạy đồng thời nhiều điểm, tùy chỉnh **tốc độ mượt (`0.2× – 4.0×` và các mức nhanh `0.5×, 1×, 1.5×, 2×, 3×`)**, chuyển chế độ **Qua lại (`↔`) / Vòng lặp (`↻`)**, tạm dừng / tiếp tục từng điểm hoặc toàn bộ ngay trên bảng điều khiển nổi góc dưới-phải.
   - Tích hợp trọn vẹn với **Hiện vết (quỹ tích)** và **Tự động nét liền/đứt 3D** theo thời gian thực trong lúc điểm chuyển động.
2. **Dựng Lại Hình Theo Kịch Bản Thứ Tự Vẽ (Construction Replay & Script Editor)**:
   - Mở từ menu **Dựng hình động → `▶ Kịch bản dựng hình`** hoặc bấm **Dựng lại hình** trên thanh nổi khi đang chọn hình.
   - Trình diễn vẽ lại từng nét hình từ đầu với hiệu ứng nét chạy mượt (ví dụ đoạn thẳng `AB` kéo nét dần từ `A → B` kèm đầu bút phát sáng, đường tròn quét compa `0 → 360°`, đa giác nối từng cạnh và phủ màu...).
   - **Bảng Kịch Bản Thứ Tự linh hoạt**: kéo thả hoặc bấm `↑ / ↓` đổi thứ tự vẽ, bấm `⇄` đảo chiều vẽ (`A → B` ↔ `B → A`), gộp nhóm vẽ đồng thời (`⊕`) / tách nhóm (`⊖`), bật/bỏ qua bước (`👁`), preset **Thứ tự gốc** & **Khối gốc → Nét thêm**, chế độ **Dừng sau mỗi bước** để giảng bài từng bước và nút **Thu gọn** thành thanh trình chiếu nhỏ gọn ở cuối màn hình.
   - Tự động lưu kịch bản thứ tự ngay trên trang sổ.
3. **Bộ Phím Tắt Hình Học Nhanh**:
   - **`Ctrl + H`**: Ẩn đối tượng đang chọn (điểm, đoạn, đường, mặt, hình — giữ tách biệt điểm đầu mút khi ẩn đoạn thẳng).
   - **`Ctrl + Shift + H`**: Hiện lại các đối tượng đang bị ẩn trên trang hiện tại.
   - **`Ctrl + M`**: Dựng trung điểm ngay lập tức nếu đang chọn sẵn 2 điểm hoặc 1 đoạn thẳng; nếu chưa chọn sẽ bật ngay công cụ **Trung điểm** (hiển thị nhãn `Ctrl+M` trong menu Dựng hình động).
   - Phím tắt `Sơ đồ tư duy` và `Cân bằng Hóa học` được chuyển sang `Ctrl + Alt + M` và `Ctrl + Alt + H` để tránh trùng lặp.
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
