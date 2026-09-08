@echo off
title Currency Converter Backend
echo ===================================================
echo Starting FastAPI Currency Converter Backend
echo Local API: http://127.0.0.1:8000
echo API Docs:  http://127.0.0.1:8000/docs
echo ===================================================
cd /d "%~dp0backend"
py -3.10 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
