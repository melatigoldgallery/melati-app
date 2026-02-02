@echo off
echo ========================================
echo  Melati Print Service Installer
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this installer as Administrator!
    echo.
    echo Right-click install.bat and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

echo Installing dependencies...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo Installing Windows Service...
node install-service.js
if %errorLevel% neq 0 (
    echo ERROR: Failed to install service!
    pause
    exit /b 1
)
echo.

echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo The Melati Print Service is now running.
echo It will automatically start when Windows boots.
echo.
echo Service URL: http://localhost:3000
echo.
echo To configure printers:
echo   1. Open http://localhost:3000/api/printers
echo   2. Edit config/printers.json
echo.
echo To manage the service:
echo   1. Press Win+R
echo   2. Type: services.msc
echo   3. Find "Melati Print Service"
echo.
pause
