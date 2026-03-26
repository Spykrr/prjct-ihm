@echo off
setlocal enabledelayedexpansion

REM -----------------------------------------------------------------
REM Uptest-Core-RealRunner.bat
REM Signature attendue:
REM   %1 = chemin CSV referentiel temporaire
REM   %2 = chemin Excel temporaire
REM Remplacez ce squelette par la vraie commande de votre robot.
REM -----------------------------------------------------------------

set "REF_CSV=%~1"
set "EXCEL_TEMP=%~2"
set "SCRIPT_DIR=%~dp0"
set "PY_RUNNER=%SCRIPT_DIR%robot\runner.py"

if "%REF_CSV%"=="" (
  echo [Uptest-Core-RealRunner] ERROR: argument ref_csv manquant.
  exit /b 1
)
if "%EXCEL_TEMP%"=="" (
  echo [Uptest-Core-RealRunner] ERROR: argument excel_temp manquant.
  exit /b 1
)

REM =======================
REM Runner Python local (a completer par votre logique robot)
REM =======================

if not exist "%PY_RUNNER%" (
  echo [Uptest-Core-RealRunner] ERROR: runner Python introuvable: "%PY_RUNNER%"
  exit /b 1
)

set "PY_CMD="
where py >nul 2>nul
if "!ERRORLEVEL!"=="0" set "PY_CMD=py -3"
if "!PY_CMD!"=="" (
  where python >nul 2>nul
  if "!ERRORLEVEL!"=="0" set "PY_CMD=python"
)
if "!PY_CMD!"=="" (
  echo [Uptest-Core-RealRunner] ERROR: Python introuvable - ni "py" ni "python".
  exit /b 1
)

echo [Uptest-Core-RealRunner] INFO: REF_CSV=%REF_CSV%
echo [Uptest-Core-RealRunner] INFO: EXCEL_TEMP=%EXCEL_TEMP%
echo [Uptest-Core-RealRunner] INFO: PY_RUNNER=%PY_RUNNER%

call !PY_CMD! "%PY_RUNNER%" --ref-csv "%REF_CSV%" --excel "%EXCEL_TEMP%"
set "RC=!ERRORLEVEL!"
if not "!RC!"=="0" (
  echo [Uptest-Core-RealRunner] ERROR: runner Python termine avec code !RC!.
  exit /b !RC!
)

echo [Uptest-Core-RealRunner] OK
exit /b 0

