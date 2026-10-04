@echo off
rem Vo Lam Idle offline - double-click to start, then open http://localhost:8080/
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"

set PY=
rem Check common Windows install path first to avoid WindowsApps shim
if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set PY="%LOCALAPPDATA%\Python\bin\python.exe"
)

rem Check Local Programs
if "%PY%"=="" (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
        if exist "%%D\python.exe" set PY="%%D\python.exe"
    )
)

rem Check python command
if "%PY%"=="" (
    python -c "exit(0)" >nul 2>nul && set PY=python
)

rem Check py launcher
if "%PY%"=="" (
    py -3 -c "exit(0)" >nul 2>nul && set PY=py -3
)

rem Check python3
if "%PY%"=="" (
    python3 -c "exit(0)" >nul 2>nul && set PY=python3
)

if "%PY%"=="" (
    echo [ERROR] Khong tim thay Python!
    echo Vui long cai dat Python tai https://www.python.org/
    pause
    exit /b 1
)

start "" http://localhost:8080/
%PY% server.py %*
pause
