@echo off
echo Starting Stipple Photocopy Maker Build Process...
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js not found. Please install Node.js.
    pause
    exit /b 1
)

:: Install Dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [Error] npm install failed.
    pause
    exit /b 1
)

:: Production Build
echo Building production web bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [Error] Web build failed.
    pause
    exit /b 1
)

:: Windows Packaging
echo Packaging Windows .exe installer and portable executable...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo [Error] Packaging failed.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo  SUCCESS! .exe files have been created in the "release" folder:
echo     release/Stipple Photocopy Maker Setup 1.0.0.exe (Installer)
echo     release/Stipple Photocopy Maker 1.0.0.exe (Portable)
echo ====================================================
echo.
pause
