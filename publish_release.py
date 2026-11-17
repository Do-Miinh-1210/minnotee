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
TAG = "v0.0.3.9"
TITLE = "MinNote v0.0.3.9 (Core v1.0.7) - Đồng bộ Word trực tiếp, Google Drive, Font Hóa Học MHChem"
BODY = """## MinNote v0.0.3.9 (Core v1.0.7)

Bản cập nhật chính thức nâng cấp lõi NoteRenderer v1.0.7 với đầy đủ các tính năng giảng dạy nâng cao:

### 🌟 Điểm Mới Trong Bản v0.0.3.9:
1. **Nhập file Word (.docx, .doc) trực tiếp**:
   - Tự động chuyển đổi file Word từ ổ cứng thành PDF qua Microsoft Word COM hoặc LibreOffice để nạp nguyên vẹn vào bảng viết.
   - Thêm nút "Nhập Word" trên thanh công cụ và hỗ trợ kéo thả trực tiếp file .docx vào bảng.
2. **Đồng bộ Google Drive**:
   - Đăng nhập tài khoản Google Drive qua OAuth2 loopback, mã hóa lưu trữ token an toàn với Electron safeStorage.
   - Đồng bộ và sao lưu ghi chú, bài giảng trên mây.
3. **Font hóa học MHChem chuyên dụng**:
   - Tích hợp MathJax v4 + @mathjax/mathjax-mhchem-font-extension v4.1.3.
   - Hiển thị công thức phản ứng hóa học `\\ce{...}` chuẩn xác, độ nét cao.
4. **Đồ họa TikZ / TikZ-3D & Typst / CeTZ**:
   - Tích hợp trình biên dịch TeX Live và Typst vẽ hình học 2D/3D chuyên nghiệp.
5. **Sửa lỗi phím bấm Casio FX 580**:
   - Khắc phục lỗi phím điều hướng mũi tên và bàn phím bấm bị nhận diện 2 lần.
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
