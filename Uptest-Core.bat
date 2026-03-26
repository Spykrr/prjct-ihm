@echo off
setlocal enabledelayedexpansion

REM -----------------------------------------------------------------
REM Uptest-Core.bat
REM Runner placeholder for Electron "Exécuter" integration.
REM Receives the temporary referentiel CSV path as first argument.
REM -----------------------------------------------------------------

set "INPUT_REF_CSV=%~1"

if "%INPUT_REF_CSV%"=="" (
  echo [Uptest-Core] ERROR: Aucun CSV referentiel en argument.
  exit /b 1
)

if not exist "%INPUT_REF_CSV%" (
  echo [Uptest-Core] ERROR: Fichier introuvable: "%INPUT_REF_CSV%"
  exit /b 1
)

echo [Uptest-Core] START - ref csv: "%INPUT_REF_CSV%"
if not "%UPTEST_EXCEL_TEMP%"=="" (
  echo [Uptest-Core] INFO: excel temp: "%UPTEST_EXCEL_TEMP%"
)

set "SCRIPT_DIR=%~dp0"
set "REAL_RUNNER=%SCRIPT_DIR%Uptest-Core-Runner.bat"

REM Lance le runner reel s'il existe
if exist "%REAL_RUNNER%" (
  echo [Uptest-Core] INFO: Runner detecte: "%REAL_RUNNER%"
  call "%REAL_RUNNER%" "%INPUT_REF_CSV%"
  set "RC=!ERRORLEVEL!"
  if not "!RC!"=="0" (
    echo [Uptest-Core] ERROR: Runner termine avec code !RC!.
    exit /b !RC!
  )
  echo [Uptest-Core] END
  exit /b 0
)

echo [Uptest-Core] ERROR: Runner non configure.
echo [Uptest-Core] ACTION: Creez "Uptest-Core-Runner.bat" dans "%SCRIPT_DIR%" puis relancez.
exit /b 1

