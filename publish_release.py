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
TAG = "v0.0.5.3"
TITLE = "MinNote v0.0.5.3 - Giao Điểm Vẽ 2 Đường Giao Rồi Ẩn, Kéo Thả & Lưu Kịch Bản Mượt, Nút Ẩn Thanh Sheet"
BODY = """## MinNote v0.0.5.3 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.5.3 hoàn thiện sâu trải nghiệm kịch bản dựng lại hình và giao diện bảng viết:

### 🌟 Điểm Mới Trong Bản v0.0.5.3:
1. **Dựng Giao Điểm Đúng Chuẩn Hình Học (Vẽ 2 Đường Giao → Hiện Giao Điểm → Ẩn 2 Đường Phụ)**:
   - Mọi bước **Giao điểm** trong kịch bản tự động trình diễn 3 pha: vẽ lần lượt 2 đường (hoặc đường tròn) giao nhau cắt tại giao điểm → làm nổi bật điểm giao → mờ dần và **ẩn 2 đường phụ** trước khi vẽ các đoạn thẳng nối tiếp theo.
   - Bổ sung nút **`✛`** bật/tắt đường phụ cho từng giao điểm, nút **`👻`** (Vẽ tạm rồi tự ẩn) cho bất kỳ nét vẽ nào, và nút **`+ Nét đã ẩn`** để đưa các đường phụ đã ẩn bằng `Ctrl+H` vào kịch bản trình chiếu.
2. **Kéo Thả Đổi Thứ Tự Cảnh Dựng Bằng Pointer Events (Siêu Mượt Trên WebView2 / Chuột / Bút / Cảm Ứng)**:
   - Thay thế hoàn toàn cơ chế HTML5 drag cũ bằng kéo thả Pointer Events trực tiếp trên tay nắm `⋮⋮` hoặc trên dòng kịch bản, có bóng mờ theo con trỏ, vạch xanh ngọc chỉ vị trí thả và tự cuộn danh sách.
3. **Lưu Kịch Bản Bền Vững (`💾 Lưu`)**:
   - Thêm nút **`💾 Lưu`** ngay trên tiêu đề bảng Kịch bản kèm phản hồi `✓ Đã lưu!`, đồng thời tự động lưu kịch bản vào dữ liệu trang sổ (`page.geo.script` + kích hoạt auto-save sổ) và sao lưu dự phòng vào `localStorage` để đóng/mở lại vẫn giữ nguyên thứ tự đã sắp xếp.
4. **Nút Ẩn / Hiện Thanh Sheet Ngay Trên Thanh Sheet**:
   - Thêm nút **`⌄ Ẩn sheet`** ngay cạnh `Sheet 1 | +` để ẩn thanh sheet giúp mở rộng tối đa diện tích bảng viết; khi ẩn sẽ có nút nhỏ **`⌃ Sheet`** gọn gàng ở góc dưới bên trái để mở lại chỉ với 1 bấm (tự động ghi nhớ trạng thái).
5. **Kế thừa toàn diện v0.0.5.2**: Chuyển động điểm có cài đặt tốc độ, tự động nét liền/đứt 3D, phím tắt `Ctrl+H` / `Ctrl+Shift+H` / `Ctrl+M`.
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
