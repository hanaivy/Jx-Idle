@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===================================================
echo   DANG PUSH CODE LEN GITHUB: https://github.com/hanaivy/Jx-Idle
echo   Neu co trinh duyet mo ra, vui long dang nhap GitHub
echo ===================================================
echo.
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo.
pause
