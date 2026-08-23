@echo off
:: Aurelinx OS Certificate Installer
:: Double-click to automatically trust Aurelinx OS on Windows
echo ========================================================
echo Installing Aurelinx OS Digital Certificate...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-aurelinx-cert.ps1"
