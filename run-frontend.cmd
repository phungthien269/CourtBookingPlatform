@echo off
setlocal

cd /d "D:\BookingPlatform\frontend"
if errorlevel 1 (
  echo Failed to change directory to frontend.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 (
    echo Frontend dependency install failed.
    pause
    exit /b 1
  )
)

call npx vite
echo.
echo Frontend process ended.
pause
