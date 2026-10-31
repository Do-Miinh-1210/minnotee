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
TAG = "v0.0.2.5"
TITLE = "MinNote v0.0.2.5 - Nâng cấp lõi NoteRenderer v0.7.2 (Bộ công thức Lí/Hóa/Sinh & tối ưu vẽ)"
BODY = """## MinNote v0.0.2.5 - Nâng Cấp Lõi NoteRenderer v0.7.2 Chính Thức

Bản phát hành chính thức nâng cấp toàn bộ động cơ vẽ NoteRenderer từ v0.6.3 lên **v0.7.2** mới nhất (30/10/2026):

### 🌟 Tính Năng & Nâng Cấp Mới:
1. **Bộ Công Thức Tính Toán Lí - Hóa - Sinh (FormulaSheet):**
   - Tích hợp sẵn toàn bộ công thức tính toán theo khối lớp và chương SGK Kết nối tri thức.
   - Cho phép tra cứu nhanh và chèn trực tiếp các công thức vào trang ghi chép chỉ với 1 click.

2. **Nâng Cấp Engine Vẽ & Font MathJax mhchem:**
   - Cập nhật thư viện ký hiệu hóa học chuyên sâu `@mathjax/mathjax-mhchem-font-extension`.
   - Cải tiến hiệu năng kết xuất vector SVG, nét bút mượt mà hơn.

3. **Kế Thừa Toàn Bộ Tính Năng Độc Quyền MinNote:**
   - Bàn phím ảo MathLive nổi ưu tiên (z-index 2.000.000) chống che phủ.
   - Chèn trực tiếp hình học không gian 3D, cân bằng Hóa học lên mặt bảng vẽ.
   - Quick Word Terminal biên dịch văn bản Word và MathType không nhảy dòng.
   - Sơ đồ tư duy Toán học (Mindmap Studio) và Kho đề thi HTML.
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
