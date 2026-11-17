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
TAG = "v0.0.4.1"
TITLE = "MinNote v0.0.4.1 - 2 Máy Tính Casio & Vinacal, Nhập Word, Drive, Hover Sáng Điểm/Đường"
BODY = """## MinNote v0.0.4.1 (Bản Quyền Độc Quyền: admin_matrixexamAI - Gói ULTRA)

Bản cập nhật v0.0.4.1 hoàn thiện toàn diện các tính năng 1-4 và trải nghiệm tương tác hình học:

### 🌟 Điểm Mới Trong Bản v0.0.4.1:
1. **Chế độ Chọn đối tượng (Selection Tool)**:
   - **Không sáng sẵn điểm**: Khi ở chế độ Chọn, các điểm dựng hình và đối tượng không còn hiện chấm sáng tròn to mặc định, giúp bảng vẽ luôn thông thoáng, sạch sẽ.
   - **Rê chuột (Hover) sáng nổi bật**: Khi rê chuột vào bất kỳ đường thẳng hoặc điểm nào, đối tượng đó sẽ tự động phát sáng nổi bật (glow teal `#0d9488`). Khi chuột rời đi, đối tượng trở lại bình thường.
2. **Hệ thống 2 Máy tính (Casio fx-580VN X ⇄ Vinacal 680EX Plus III)**:
   - Nút `⇄` chuyển đổi tức thì giữa **Casio fx-580VN X** và **VINACAL 680EX PLUS III** chuẩn giao diện thi cử.
   - Nút `📷` chụp màn hình máy tính (LCD) độ nét cao và chèn trực tiếp vào trang bảng đang viết.
3. **Nhập file Word (.docx, .doc) trực tiếp**:
   - Tích hợp cầu nối WebView2 WPF mở trực tiếp hộp thoại chọn file Word trên máy tính.
   - Tự động chuyển đổi tài liệu Word sang PDF qua Word COM / LibreOffice và nạp nguyên vẹn các trang vào bảng viết.
4. **Đồng bộ Google Drive**:
   - Thêm nút `[☁️ Drive]` trên thanh công cụ điều hướng.
   - Quản lý trạng thái sao lưu bảng viết, đồng bộ ghi chú lên đám mây và khôi phục nhanh chóng.
5. **Công thức hóa học MHChem chuyên dụng**:
   - Nạp MathJax TeX + SVG với gói mở rộng `mhchem`, hiển thị hoàn hảo mọi công thức phản ứng `\\ce{...}`.
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
