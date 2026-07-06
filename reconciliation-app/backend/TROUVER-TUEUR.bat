@echo off
REM Demande elevation UAC puis analyse le journal Securite pour trouver le tueur
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0find-killer.ps1\"\"'"
