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

TAG = "v0.0.2.9"

TITLE = "MinNote v0.0.2.9 - Tích hợp toàn diện NoteRenderer v0.8.0 & khôi phục máy tính Casio"
BODY = """## MinNote v0.0.2.9 - Kết Hợp Đột Phá: Lõi NoteRenderer v0.8.0 & Khôi Phục Máy Tính Casio

Bản cập nhật chính thức tích hợp 100% tính năng mới nhất từ NoteRenderer v0.8.0 mà không làm mất đi bất kỳ tính năng giảng dạy quen thuộc nào:

### 🌟 Điểm Nổi Bật v0.0.2.9:
1. **Tính Năng Mới Từ Lõi NoteRenderer v0.8.0:**
   - **Đồng hồ đếm ngược (Countdown Timer)**: Hỗ trợ thuyết trình lớp học, toàn màn hình máy chiếu, âm thanh báo hết giờ.
   - **Gọi tên ngẫu nhiên (Random Student Picker)**: Quản lý danh sách lớp, dán trực tiếp từ Excel/Word, quay số chọn học sinh trả lời bài.
   - **Thanh công cụ nhanh (Favorites)**: Ghim các công cụ hay dùng lên thanh trên cùng.
   - Nâng cấp độ mượt nét vẽ, chống trễ bút (low-latency ink trail).

2. **Khôi Phục Trọn Vẹn Máy Tính Khoa Học Casio:**
   - Tích hợp máy tính khoa học Casio FX 580 tự do nổi trên bảng vẽ.
   - Đầy đủ hàm lượng giác, vi tích phân, logarit, phân số, ma trận, phương trình, số phức.
   - Hỗ trợ màn hình LCD phụ tách rời phục vụ chiếu đề và bài giải.

3. **Bố Cục Thanh Công Cụ Cân Xứng 2 - 3 Hàng:**
   - Phân loại trực quan: Hàng 1 (Hệ thống & MinNote Tools), Hàng 2 (Toán & Viết vẽ), Hàng 3 (Khoa học Lí - Hóa - Sinh).
   - Tự động co gọn 2 hàng khi chỉ chọn môn Toán.
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

