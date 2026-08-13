@echo off
echo Starting local server for NEET Practice App...
echo.
echo Please do not close this window while using the app!
echo.
start http://localhost:8000/Neethome.html
python -m http.server 8000
