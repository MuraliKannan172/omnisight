@echo off
setlocal
cd /d "%~dp0"
title OmniSight Launcher

echo ==================================================
echo   OmniSight - Local Ollama Edition
echo ==================================================
echo.

REM --- Ensure Python is available ---
where python >nul 2>nul
if errorlevel 1 (
  echo [error] Python was not found on PATH. Install Python 3.10+ and retry.
  pause
  exit /b 1
)

REM --- Backend first-run setup ---
if not exist "backend\venv\Scripts\python.exe" (
  echo [setup] Creating Python virtual environment...
  python -m venv backend\venv
  echo [setup] Installing backend dependencies...
  call "backend\venv\Scripts\activate.bat"
  python -m pip install -r backend\requirements.txt
  call "backend\venv\Scripts\deactivate.bat"
  echo.
)

REM --- Frontend first-run setup ---
if not exist "frontend\node_modules" (
  echo [setup] Installing frontend dependencies - first run may take a minute...
  pushd frontend
  call npm install
  popd
  echo.
)

REM --- Warn if the ports are already taken (common cause of "not working") ---
set "PORT_BUSY="
netstat -ano | findstr "LISTENING" | findstr /c:":8000 " >nul && set "PORT_BUSY=8000"
netstat -ano | findstr "LISTENING" | findstr /c:":5173 " >nul && set "PORT_BUSY=%PORT_BUSY% 5173"
if defined PORT_BUSY (
  echo [warn] These ports are already in use:%PORT_BUSY%
  echo [warn] A previous OmniSight session is probably still running.
  echo [warn] Close those terminal windows ^(or reboot^) and run this again.
  echo.
  choice /m "Continue launching anyway"
  if errorlevel 2 exit /b 1
  echo.
)

echo [info] Make sure Ollama is running:  ollama serve
echo [run]  Backend  -^> http://localhost:8000
echo [run]  Frontend -^> http://localhost:5173
echo.

REM --- Launch backend and frontend in their own windows ---
start "OmniSight Backend" /D "%~dp0backend" cmd /k "call venv\Scripts\activate.bat && uvicorn app:app --port 8000"
start "OmniSight Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

REM --- Open the app once the dev server has had a moment to boot ---
timeout /t 7 /nobreak >nul
start "" http://localhost:5173

echo.
echo Two terminal windows opened (Backend + Frontend).
echo Close those windows to stop the app.
echo.
pause
