@echo off
title SOFO Beta Launcher
echo ============================================
echo   SOFO Beta - menyalakan DB + API server
echo ============================================

rem --- 1. Pastikan Docker Desktop jalan ---
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
echo [1/4] Menyalakan Docker Desktop (tunggu 30-60 detik)...
start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
:waitdocker
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker
:docker_ok
echo [1/4] Docker OK.

rem --- 2. Hidupkan database ---
docker start sofo-db >nul 2>&1
echo [2/4] Database sofo-db hidup.

rem --- 3. Jalankan API di window terpisah (kalau belum jalan) ---
netstat -ano | findstr ":4001" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto api_running
echo [3/4] Menjalankan API server di window baru...
start "SOFO API Server" /D "%~dp0apps\api" cmd /k node dist\main.js
goto waitapi
:api_running
echo [3/4] API sudah jalan di port 4001.

rem --- 4. Tunggu health OK ---
:waitapi
echo [4/4] Menunggu server siap...
set TRIES=0
:waitloop
timeout /t 3 /nobreak >nul
curl -s -m 3 http://localhost:4001/api/v1/health | findstr /c:"ok" >nul 2>&1
if not errorlevel 1 goto ready
set /a TRIES+=1
if %TRIES% LSS 20 goto waitloop
echo GAGAL: server tidak naik setelah 60 detik. Cek window "SOFO API Server".
pause
exit /b 1

:ready
echo.
echo ============================================
echo   SIAP! Server beta hidup:
echo     http://192.168.68.107:4001
echo.
echo   Tester: WiFi sama dengan laptop ini,
echo   unduh APK dari:
echo     github.com/Roschak/SoFo/releases
echo.
echo   Biarkan window "SOFO API Server" terbuka
echo   selama sesi beta. (Catatan: kalau IP WiFi
echo   berubah, edit IP di file ini.)
echo ============================================
pause
