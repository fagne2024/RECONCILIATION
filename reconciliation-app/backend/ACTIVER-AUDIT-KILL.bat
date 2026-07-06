@echo off
REM Demande elevation UAC puis active l'audit Windows (creation + terminaison process)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0enable-kill-audit.ps1\"\"'"
