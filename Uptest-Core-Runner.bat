@echo off
setlocal enabledelayedexpansion

REM ---------------------------------------------------------------
REM Uptest-Core-Runner.bat
REM Runner par defaut pour enlever l'erreur "Runner non configure".
REM Recoit le CSV referentiel temporaire en argument.
REM Le chemin Excel temporaire est fourni via la variable env UPTEST_EXCEL_TEMP.
REM ---------------------------------------------------------------

set "INPUT_REF_CSV=%~1"
set "INPUT_XLSX=%UPTEST_EXCEL_TEMP%"
set "SCRIPT_DIR=%~dp0"
set "REAL_RUNNER=%SCRIPT_DIR%Uptest-Core-RealRunner.bat"

if "%INPUT_REF_CSV%"=="" (
  echo [Uptest-Core-Runner] ERROR: Aucun CSV referentiel en argument.
  exit /b 1
)

if not exist "%INPUT_REF_CSV%" (
  echo [Uptest-Core-Runner] ERROR: CSV referentiel introuvable: "%INPUT_REF_CSV%"
  exit /b 1
)

echo [Uptest-Core-Runner] START - ref csv: "%INPUT_REF_CSV%"

if "%INPUT_XLSX%"=="" (
  echo [Uptest-Core-Runner] ERROR: UPTEST_EXCEL_TEMP non fourni.
  exit /b 1
)
if not exist "%INPUT_XLSX%" (
  echo [Uptest-Core-Runner] ERROR: Fichier Excel temporaire introuvable: "%INPUT_XLSX%"
  exit /b 1
)

if exist "%REAL_RUNNER%" (
  echo [Uptest-Core-Runner] INFO: Runner reel detecte: "%REAL_RUNNER%"
  call "%REAL_RUNNER%" "%INPUT_REF_CSV%" "%INPUT_XLSX%"
  set "RC=!ERRORLEVEL!"
  exit /b !RC!
)

echo [Uptest-Core-Runner] ERROR: Aucun runner reel configure.
echo [Uptest-Core-Runner] ACTION: Creez "%REAL_RUNNER%" qui execute votre robot.
echo [Uptest-Core-Runner] ACTION: Signature attendue: Uptest-Core-RealRunner.bat ^<ref_csv^> ^<excel_temp^>
exit /b 1

