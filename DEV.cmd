@echo off
setlocal
pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tooling\windows-toolchain\dev.ps1" %*
exit /b %ERRORLEVEL%
