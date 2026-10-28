@echo off
REM Abre o app de estoque neste computador. Na primeira vez demora alguns minutos.
cd /d "%~dp0"
echo Preparando o app de estoque, aguarde...
call npm install || goto erro
call npm run build || goto erro
start "" http://localhost:3000
call npm start
goto fim
:erro
echo.
echo Algo deu errado. Confira se o Node.js esta instalado (https://nodejs.org).
pause
:fim
