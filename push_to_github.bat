@echo off
title STUDIEDX GITHUB BULK UPLOADER
color 0A
echo ========================================================
echo   STUDIEDX - BULK UPLOADING PRACTICE SETS TO GITHUB
echo ========================================================
echo.
cd /d "C:\Users\123\Desktop\New folder (2)"

echo 1. Adding all files to git staging...
"C:\Program Files\Git\cmd\git.exe" add assets/ upload/ index.html Physics.json Chemistry.json push_to_github.bat

echo.
echo 2. Committing changes...
"C:\Program Files\Git\cmd\git.exe" commit -m "Bulk upload practice sets"

echo.
echo 3. Pushing directly to main branch...
"C:\Program Files\Git\cmd\git.exe" push origin master:main
"C:\Program Files\Git\cmd\git.exe" push origin master

echo.
echo ========================================================
echo   SUCCESS! Pushed directly to main branch on GitHub!
echo ========================================================
pause
