@echo off
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = Get-NetTCPConnection -State Listen -LocalPort 8504 -ErrorAction SilentlyContinue; if (-not $listener) { Start-Process -FilePath '%~dp0venv\Scripts\python.exe' -ArgumentList '-m uvicorn api:app --host 127.0.0.1 --port 8504' -WorkingDirectory '%~dp0' }; Start-Process 'http://127.0.0.1:8504'"