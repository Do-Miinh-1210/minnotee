import os
import re
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = "Do-Miinh-1210/minnotee"
TAG = "v0.0.8.4"
NOTES_PATH = os.path.join(BASE_DIR, "release_notes", f"{TAG}.md")
SETUP_EXE = os.path.join(BASE_DIR, "dist", "installer", "MinNote_Setup.exe")

raw_notes = open(NOTES_PATH, "r", encoding="utf-8").read()
lines = raw_notes.splitlines()
title_match = re.match(r"<!--\s*title:\s*(.+?)\s*-->", lines[0]) if lines else None
if title_match:
    TITLE = title_match.group(1).strip()
    BODY = "\n".join(lines[1:]).lstrip("\r\n")
else:
    TITLE = f"MinNote {TAG} - Đồng Bộ 2 Chiều MatrixExamAI Pro, Xuất TikZ Chuẩn Số Nguyên, Diễn Hoạt 3D 360°, Xuất GIF/Video, Tay Cầm Bút & Video Trên Bảng"
    BODY = raw_notes

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
    "prerelease": False,
    "make_latest": "true"
}

r = requests.post(f"https://api.github.com/repos/{REPO}/releases", headers=headers, json=payload)
if r.status_code not in (200, 201):
    print("Failed to create release:", r.status_code, r.text)
    sys.exit(1)

release_data = r.json()
upload_url = release_data["upload_url"].split("{")[0]
print(f"Created release: {release_data['html_url']}")

# 3. Upload Setup Asset
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
    sys.exit(1)
