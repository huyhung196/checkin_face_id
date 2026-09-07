import os
import sys

# Đảm bảo Windows Terminal hỗ trợ UTF-8 đầy đủ không bao giờ bị lỗi charmap
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        pass

import re
import time
import signal
import subprocess
import threading
import webbrowser
import urllib.request

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# ANSI Color codes for Windows console
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
ORANGE = "\033[38;5;208m"
BLUE = "\033[94m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

if os.name == 'nt':
    os.system('color')

def print_header():
    print(f"\n{ORANGE}{BOLD}======================================================================{RESET}")
    print(f"{ORANGE}{BOLD}   >>> FACE ID AI CHECK-IN & GPS - CLOUDFLARE HOSTING SERVER          {RESET}")
    print(f"{ORANGE}{BOLD}======================================================================{RESET}")
    print(f"  {BOLD}* Local URL     :{RESET} {GREEN}http://localhost:8000{RESET}")
    print(f"  {BOLD}* Cloudflare WAN:{RESET} {YELLOW}Dang khoi tao duong truyen HTTPS bao mat...{RESET}")
    print(f"{ORANGE}{BOLD}======================================================================{RESET}\n")

def stream_logs(pipe, prefix=""):
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            line_str = line.strip()
            if line_str:
                if "ERROR" in line_str or "Error" in line_str or "500" in line_str:
                    print(f"{RED}{prefix} {line_str}{RESET}")
                elif "WARNING" in line_str or "Warn" in line_str:
                    print(f"{YELLOW}{prefix} {line_str}{RESET}")
                elif "200 OK" in line_str or "success" in line_str:
                    print(f"{GREEN}{prefix} {line_str}{RESET}")
                elif "POST" in line_str or "GET" in line_str or "DELETE" in line_str:
                    print(f"{CYAN}{prefix} {line_str}{RESET}")
                else:
                    print(f"{prefix} {line_str}")
    except Exception:
        pass

def wait_for_cloudflare_dns(url, max_retries=15):
    """Chờ cho đến khi Cloudflare DNS cập nhật xong trên toàn cầu"""
    print(f"{YELLOW}[*] Dang ket noi mang Cloudflare toan cau cho link: {CYAN}{url}{RESET}")
    print(f"{YELLOW}    (Vui long doi 4-6 giay de DNS Cloudflare cap nhat xong)...{RESET}")
    
    for attempt in range(1, max_retries + 1):
        time.sleep(1)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            res = urllib.request.urlopen(req, timeout=4)
            if res.status == 200:
                return True
        except Exception:
            pass
    return False

def copy_to_clipboard(text):
    """Copy URL vào clipboard Windows để tiện paste trên điện thoại/máy khác"""
    try:
        cmd = f'Set-Clipboard -Value "{text}"'
        subprocess.run(['powershell', '-Command', cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass

def main():
    print_header()

    # 0. Tự động build Frontend nếu chưa có bản build dist
    dist_index = os.path.join(ROOT_DIR, "frontend", "dist", "index.html")
    if not os.path.exists(dist_index):
        print(f"{YELLOW}[0/3] Dang kiem tra va build Giao dien Frontend (dist)...{RESET}")
        frontend_dir = os.path.join(ROOT_DIR, "frontend")
        try:
            node_modules_dir = os.path.join(frontend_dir, "node_modules")
            if not os.path.exists(node_modules_dir):
                print(f"{YELLOW}   -> Dang cai dat npm packages cho Frontend...{RESET}")
                subprocess.run("npm install", cwd=frontend_dir, shell=True, check=True)
            print(f"{YELLOW}   -> Dang biet dich Frontend sang production build (vite build)...{RESET}")
            subprocess.run("npm run build", cwd=frontend_dir, shell=True, check=True)
            print(f"{GREEN}   -> Build Frontend thanh cong!{RESET}\n")
        except Exception as e:
            print(f"{RED}   -> Warning: Khong the build Frontend tu dong ({e}){RESET}\n")

    # 1. Khởi động FastAPI Backend (Ưu tiên dùng môi trường venv nếu có)
    python_bin = sys.executable
    venv_python = os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")
    dot_venv_python = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_python):
        python_bin = venv_python
    elif os.path.exists(dot_venv_python):
        python_bin = dot_venv_python

    print(f"{YELLOW}[1/3] Dang khoi dong Backend FastAPI tren cong 8000 ({python_bin})...{RESET}")

    backend_cmd = [
        python_bin, "-m", "uvicorn", "main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000", 
        "--log-level", "info"
    ]
    
    server_process = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding='utf-8',
        errors='replace'
    )

    # 2. Khởi động Cloudflared Tunnel (nếu có)
    print(f"{YELLOW}[2/3] Dang ket noi Cloudflare Tunnel...{RESET}")
    
    # Tìm executable cloudflared trong hệ thống
    cloudflared_bin = "cloudflared"
    pf_path = r"C:\Program Files\cloudflared\cloudflared.exe"
    pf86_path = r"C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if os.path.exists(pf_path):
        cloudflared_bin = pf_path
    elif os.path.exists(pf86_path):
        cloudflared_bin = pf86_path

    cloudflared_cmd = [cloudflared_bin, "tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8000"]
    cloudflared_process = None

    try:
        cloudflared_process = subprocess.Popen(
            cloudflared_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            encoding='utf-8',
            errors='replace'
        )

        public_url = None
        url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

        def monitor_cloudflared(pipe):
            nonlocal public_url
            for line in iter(pipe.readline, ''):
                if not line:
                    break
                line_str = line.strip()
                match = url_pattern.search(line_str)
                if match and not public_url:
                    public_url = match.group(0)
                    threading.Thread(target=on_url_detected, args=(public_url,), daemon=True).start()

        def on_url_detected(url):
            copy_to_clipboard(url)

            print(f"\n{GREEN}{BOLD}======================================================================{RESET}")
            print(f"{GREEN}{BOLD}   [OK] CLOUDFLARE PUBLIC HTTPS URL DA DUOC TAO THANH CONG!          {RESET}")
            print(f"{GREEN}{BOLD}======================================================================{RESET}")
            print(f"  >> Link mo tren DIEN THOAI / MAY KHAC (Copy gui zalo/mess):")
            print(f"     {CYAN}{BOLD}{url}{RESET}")
            print(f"  >> Link mo tren MAY TINH NAY (Local):")
            print(f"     {GREEN}{BOLD}http://localhost:8000{RESET}")
            print(f"  {YELLOW}(Da tu dong copy link Cloudflare HTTPS vao Clipboard){RESET}")
            print(f"{GREEN}{BOLD}======================================================================{RESET}")
            print(f"{BLUE}--- LIVE LOGS DANG GHI TRUC TIEP DUOI DAY (Nhan Ctrl+C de dung): ---{RESET}\n")

            # Mở localhost:8000 trên máy tính này để truy cập tức thì 100% không bị chờ DNS nhà mạng
            try:
                webbrowser.open("http://localhost:8000")
            except:
                pass

        t_cf_err = threading.Thread(target=monitor_cloudflared, args=(cloudflared_process.stderr,), daemon=True)
        t_cf_out = threading.Thread(target=monitor_cloudflared, args=(cloudflared_process.stdout,), daemon=True)
        t_cf_err.start()
        t_cf_out.start()

    except Exception:
        print(f"{YELLOW}[!] May chua cai đat hoac chua co tool 'cloudflared'.{RESET}")
        print(f"{GREEN}[3/3] Dang chay che do Local Server: http://localhost:8000{RESET}")
        print(f"{BLUE}--- LIVE LOGS DANG GHI TRUC TIEP DUOI DAY (Nhan Ctrl+C de dung): ---{RESET}\n")
        try:
            webbrowser.open("http://localhost:8000")
        except:
            pass

    # Luồng hiển thị log của server
    t_server = threading.Thread(target=stream_logs, args=(server_process.stdout, f"{BLUE}[API]{RESET}"), daemon=True)
    t_server.start()

    # Xử lý đóng an toàn khi bấm Ctrl+C
    def cleanup(signum=None, frame=None):
        print(f"\n{YELLOW}Dang dung may chu va Cloudflare tunnel...{RESET}")
        if cloudflared_process:
            try:
                cloudflared_process.terminate()
                cloudflared_process.kill()
            except:
                pass
        try:
            server_process.terminate()
            server_process.kill()
        except:
            pass
        print(f"{GREEN}Da tat toan bo dich vu an toan.{RESET}")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        while True:
            time.sleep(1)
            if server_process.poll() is not None:
                print(f"{RED}Server API da dung (Code: {server_process.poll()}){RESET}")
                break
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
