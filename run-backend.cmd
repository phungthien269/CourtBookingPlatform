@echo off
setlocal

cd /d "D:\BookingPlatform\backend"
if errorlevel 1 (
  echo Failed to change directory to backend.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing backend dependencies...
  call npm install
  if errorlevel 1 (
    echo Backend dependency install failed.
    pause
    exit /b 1
  )
)

call npx tsx watch src/index.ts
echo.
echo Backend process ended.
pause
