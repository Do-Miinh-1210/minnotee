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
TAG = "v0.0.1.0"
TITLE = "MinNote v0.0.1.0 — Nâng cấp lõi NoteRenderer 0.6.3 chính thức"
BODY = """## MinNote v0.0.1.0 — Bản Cập Nhật Lớn

### 1. Nâng cấp lõi NoteRenderer v0.6.3 chính thức:
- **Tối ưu tốc độ vẽ:** Cải tiến hiệu năng render vector trên canvas lớn, loại bỏ hoàn toàn hiện tượng giật lag khi quét màn hình.
- **Hỗ trợ công thức nâng cao:** Bổ sung font extension MathJax MhChem hỗ trợ biểu diễn phương trình Hóa học và Toán học mở rộng.
- **Phân tích gói đề Toán (ex_test):** Nhận diện tự động câu hỏi trắc nghiệm 4 lựa chọn (\\choice), đúng/sai (\\choiceTF), câu hỏi trả lời ngắn (\\shortans), đáp án đúng (\\True, \\dung), tách lời giải (\\loigiai), vẽ hình TikZ và bảng số liệu.
- **Tăng tốc xử lý tài liệu PDF:** Cập nhật engine PDF worker mới cho phép tải và import tài liệu mượt mà hơn.

### 2. Tính năng mới & Tiện ích MinNote:
- **Hiển thị huy hiệu phiên bản:** Gắn badge phiên bản trực quan (v0.0.1.0) trên thanh tiêu đề góc trái, tiêu đề cửa sổ và tooltip nút Cập nhật.
- **Máy tính Casio lớp trên cùng:** Đưa máy tính Casio fx-580VN X và màn hình LCD phụ lên lớp z-index cao nhất (10005 - 10020), không còn bị thanh công cụ hay nét vẽ che khuất.
- **Tự động cập nhật không giới hạn:** Chuyển sang cơ chế Web Redirect trực tiếp từ GitHub Releases, xóa bỏ triệt để lỗi giới hạn 60 lượt/giờ của GitHub API.
- **Đồng bộ Sơ đồ tư duy & Kho đề thi:** Bố trí kho đề thi và bài giảng ở thanh dưới, bổ sung nút chỉnh sửa trực tiếp khi chọn sơ đồ tư duy.
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
