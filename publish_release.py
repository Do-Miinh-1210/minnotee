import json
import os
import sys
import shutil
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

REPO = "Do-Miinh-1210/minnotee"
TAG = "v0.0.0.1"
TITLE = "MinNote v0.0.0.1 — Bảng Viết Kỹ Thuật Số & Sơ Đồ Tư Duy"
BODY = """## MinNote v0.0.0.1

### Tính năng mới & Cải tiến:
- **Đồng bộ bảng giá Admin:** Chuẩn hóa gói MinNote 299k/năm, MatrixExamAI Pro 899k, BASIC 399k, ULTRA 1.499k.
- **Mã VietQR tinh giản:** Cắt gọt chi tiết thừa, hiển thị mã QR thuần túy (qr_only) rõ ràng, quét tự động kèm Mã máy.
- **Quy chuẩn phiên bản:** Bản vá nhỏ tăng +0.0.0.1, tính năng mới tăng +0.0.1.0.
- **Trình cài đặt tự động ổ C:** Đóng gói Inno Setup tự gỡ phiên bản cũ và cài vào C:\\Program Files\\MinNote.
"""

def get_github_token():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token
    try:
        proc = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True)
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""

def main():
    token = get_github_token()
    if not token:
        print("[!] Không tìm thấy GitHub Token qua git credential helper.")
        return

    headers = {
        "User-Agent": "MinNote-Release-Script",
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    # 1. Kiểm tra Repo
    check_url = f"https://api.github.com/repos/{REPO}"
    req = urllib.request.Request(check_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            repo_info = json.loads(resp.read().decode())
            print(f"[+] Tìm thấy repository: {repo_info.get('full_name')}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"[!] Repository '{REPO}' chưa tồn tại trên GitHub!")
            print(f"    Vui lòng truy cập https://github.com/new và tạo repo với tên 'Minnote'.")
            print(f"    Sau đó chạy lại lệnh: python publish_release.py")
            return
        else:
            print(f"[!] Lỗi kiểm tra repo: {e}")
            return

    # 2. Tạo Release
    release_url = f"https://api.github.com/repos/{REPO}/releases"
    payload = json.dumps({
        "tag_name": TAG,
        "name": TITLE,
        "body": BODY,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")

    req_rel = urllib.request.Request(release_url, data=payload, headers={**headers, "Content-Type": "application/json"})
    upload_url_tpl = None
    try:
        with urllib.request.urlopen(req_rel) as resp:
            rel = json.loads(resp.read().decode())
            upload_url_tpl = rel.get("upload_url")
            print(f"[+] Đã tạo Release: {rel.get('html_url')}")
    except urllib.error.HTTPError as e:
        if e.code == 422: # Release or tag already exists
            print(f"[*] Release {TAG} đã tồn tại, lấy thông tin...")
            get_tag_url = f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}"
            req_tag = urllib.request.Request(get_tag_url, headers=headers)
            with urllib.request.urlopen(req_tag) as resp:
                rel = json.loads(resp.read().decode())
                upload_url_tpl = rel.get("upload_url")
        else:
            print(f"[!] Lỗi tạo Release: {e}")
            return

    if not upload_url_tpl:
        print("[!] Không tìm thấy upload_url.")
        return

    upload_url_base = upload_url_tpl.split("{")[0]

    # 3. Upload file Setup
    setup_file = Path("M:/IT/Minnote/dist/installer/MinNote_Setup.exe")
    if setup_file.exists():
        print(f"[+] Đang tải lên {setup_file.name} ({setup_file.stat().st_size / (1024*1024):.1f} MB)...")
        upload_url = f"{upload_url_base}?name={setup_file.name}"
        with open(setup_file, "rb") as f:
            data = f.read()
        req_up = urllib.request.Request(upload_url, data=data, headers={
            **headers,
            "Content-Type": "application/octet-stream",
            "Content-Length": str(len(data))
        })
        try:
            with urllib.request.urlopen(req_up) as resp:
                print(f"[+] Tải lên thành công: {setup_file.name}")
        except Exception as ex:
            print(f"[!] Lỗi upload asset: {ex}")
    else:
        print(f"[!] Không tìm thấy file bộ cài: {setup_file}")

if __name__ == "__main__":
    main()
