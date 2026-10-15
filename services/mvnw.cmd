@REM Maven Wrapper for SOMLITS services (Windows)
@echo off
if defined MAVEN_HOME (
  set MVN=%MAVEN_HOME%\bin\mvn.cmd
) else (
  where mvn >nul 2>nul
  if errorlevel 1 (
    echo ERROR: mvn not found. Install Maven 3.9+ and ensure it is on your PATH.
    exit /b 1
  )
  set MVN=mvn
)
%MVN% %*
