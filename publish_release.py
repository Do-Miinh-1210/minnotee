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
TAG = "v0.0.2.2"
TITLE = "MinNote v0.0.2.2 - Tích hợp toàn diện NoteBoard 2.5.21 (Bảng biến thiên, 3D, Hóa học & MathType)"
BODY = """## MinNote v0.0.2.2 - Bản Nâng Cấp Đột Phá NoteBoard 2.5.21

Bản phát hành chính thức tích hợp toàn diện các động cơ tính toán và dựng hình chuyên sâu của NoteBoard 2.5.21:

### 🌟 Tính Năng Mới
1. **Bảng Biến Thiên Toán Học Tự Động (Ctrl + B):**
   - Động cơ giải tích đại số ký hiệu chuẩn SGK Việt Nam (đa thức, phân thức hữu tỉ, căn thức, hàm lượng giác).
   - Tự động xác định tập xác định, nghiệm đạo hàm f'(x)=0, dấu đạo hàm, tiệm cận đứng, tiệm cận ngang và mũi tên biến thiên.
   - Xuất SVG vector siêu nét chèn trực tiếp lên bảng viết MinNote.

2. **Hình Học Không Gian 3D Native (Ctrl + 3):**
   - Hỗ trợ đầy đủ 9 khối hình học: Lập phương, Hộp chữ nhật, Chóp tứ giác, Chóp tam giác, Lăng trụ tam giác, Lăng trụ lục giác, Hình nón, Hình trụ, Mặt cầu.
   - Tự động nhận diện và vẽ nét khuất (nét đứt) chính xác theo góc nhìn.
   - Xoay 3D trực quan kéo thả chuột tự do góc Yaw/Pitch.
   - Chèn ảnh chất lượng cao vào bảng với 1 click.

3. **Cân Bằng Phản Ứng Hóa Học & Khối Lượng Mol (Ctrl + H):**
   - Tự động cân bằng hệ số tối giản cho mọi phương trình hóa học phức tạp.
   - Tính khối lượng mol phân tử (M) theo chuẩn quốc tế IUPAC.

4. **Quick Word Terminal & Chống Lỗi Font MathType (Ctrl + Shift + W):**
   - Khắc phục triệt để lỗi nhảy dòng lung tung khi copy-paste từ Microsoft Word.
   - Chuẩn hóa kích thước công thức MathType (.eq-img) và KaTeX (.katex).
   - Tự động nhận diện đáp án trắc nghiệm A, B, C, D và dàn trang lưới 4 cột / 2 cột.

5. **Sửa Triệt Để Lỗi Bàn Phím Ảo Toán Học (MathLive Keyboard):**
   - Nâng cấp z-index bàn phím ảo lên mức cao nhất (2.000.000), không bị che phủ dưới lớp màn mờ backdrop của bảng Chèn công thức.
   - Tự động đẩy hộp thoại lên cao khi bàn phím mở ra, các phím số và công thức toán học bấm nhạy 100%.

6. **Bộ Cài Đặt Tự Động Gỡ Bản Cũ:**
   - Cài đặt đè hoặc nâng cấp mượt mà, giữ nguyên dữ liệu bảng viết cá nhân.
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
