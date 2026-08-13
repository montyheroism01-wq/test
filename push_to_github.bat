@echo off
echo ========================================================
echo   STUDIEDX - BULK UPLOAD TO GITHUB
echo ========================================================
echo.

cd /d "C:\Users\123\Desktop\New folder (2)"

echo 1. Adding all 825 uploaded practice set files...
git add assets/upload/ assets/index.html assets/Physics.json assets/Chemistry.json

echo.
echo 2. Creating commit...
git commit -m "Bulk upload 825 practice sets across Botany, Zoology, Physics, and Chemistry"

echo.
echo 3. Pushing to GitHub...
git push

echo.
echo ========================================================
echo   SUCCESS! All 825 practice sets pushed to GitHub!
echo ========================================================
pause
