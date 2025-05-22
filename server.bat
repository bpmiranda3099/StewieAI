@echo off
echo on
cd /d %~dp0
start /B python -m http.server
timeout /t 2
start "" "http://localhost:8000"

:loop
for /f "delims=" %%A in ('xcopy /w /l "%~f0" "%~f0" 2^>nul') do (
    if /i "%%A"=="E" (
        taskkill /f /im python.exe
        exit
    )
)
goto loop
