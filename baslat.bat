@echo off
setlocal
cd /d "%~dp0"
title Not Defteri Pro

echo ===================================================
echo           NOT DEFTERI PRO BASLATILIYOR
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Bilgisayarinizda Node.js bulunamadi!
    echo Lutfen https://nodejs.org adresinden Node.js kurun.
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [BILGI] Ilk calistirma algilandi, paketler yukleniyor...
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] Paketler yuklenirken bir sorun olustu.
        pause
        exit /b 1
    )
)

echo [OK] Sunucu baslatiliyor ve masaustu penceresi hazirlaniyor...
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start "" msedge --app=http://localhost:3000 --window-size=1200,800 2>nul || start "" chrome --app=http://localhost:3000 --window-size=1200,800 2>nul || start "" http://localhost:3000"

call npm run dev
pause
