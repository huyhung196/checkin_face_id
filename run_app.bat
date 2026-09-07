@echo off
title Face ID AI Check-in & Cloudflare Host Server
color 0b
cd /d "%~dp0"

if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" run_server.py
) else if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" run_server.py
) else (
    python run_server.py
)

pause
