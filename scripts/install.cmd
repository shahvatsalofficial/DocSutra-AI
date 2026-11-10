@echo off
node "%~dp0..\packages\cli\index.mjs" install-skills %*
exit /b %ERRORLEVEL%
