#!/bin/bash
echo "==================================================="
echo "          NOT DEFTERİ PRO BAŞLATILIYOR"
echo "==================================================="

if ! command -v node &> /dev/null
then
    echo "[!] Bilgisayarınızda Node.js kurulu değil."
    echo "Lütfen https://nodejs.org adresinden Node.js kurun."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[i] Gerekli paketler yükleniyor..."
    npm install
fi

echo "[✓] Uygulama başlatılıyor..."
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null
npm run dev
