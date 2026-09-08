@echo off
title Launch Currency Converter Full-Stack
echo ===================================================
echo Launching Currency Converter Application
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ===================================================

start "Currency Converter Backend" cmd /k "cd /d ""%~dp0backend"" && py -3.10 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak >nul
start "Currency Converter Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo Started both servers in dedicated windows!
