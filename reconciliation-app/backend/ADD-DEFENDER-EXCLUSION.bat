@echo off
REM Demande elevation UAC puis ajoute les exclusions Windows Defender
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0add-defender-exclusion.ps1\"\"'"
