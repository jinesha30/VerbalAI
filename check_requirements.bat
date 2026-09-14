@echo off
echo ========================================
echo Checking System Requirements
echo ========================================
echo.

echo [1] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
) else (
    echo [OK] Node.js is installed
)
echo.

echo [2] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo [ERROR] Python is NOT installed!
) else (
    echo [OK] Python is installed
)
echo.

echo [3] Checking MongoDB...
mongod --version
if %errorlevel% neq 0 (
    echo [ERROR] MongoDB is NOT installed!
) else (
    echo [OK] MongoDB is installed
)
echo.

echo [4] Checking FFmpeg...
ffmpeg -version
if %errorlevel% neq 0 (
    echo [ERROR] FFmpeg is NOT installed!
) else (
    echo [OK] FFmpeg is installed
)
echo.

echo [5] Checking if MongoDB service is running...
sc query MongoDB
echo.

echo ========================================
echo Check Complete
echo ========================================
pause
