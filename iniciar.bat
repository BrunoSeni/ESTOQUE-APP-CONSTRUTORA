@echo off
REM Abre o app de estoque neste computador. Na primeira vez demora alguns minutos.
cd /d "%~dp0"
echo Preparando o app de estoque, aguarde...
call npm install || goto erro
call npm run build || goto erro
start "" http://localhost:3000
echo.
echo O app esta aberto neste computador em http://localhost:3000
echo Para abrir no celular (no mesmo Wi-Fi), digite no navegador do celular:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=*" %%b in ("%%a") do echo    http://%%b:3000
echo Se o Windows perguntar sobre o firewall, clique em Permitir.
echo Deixe esta janela aberta enquanto usa o app.
echo.
call npm start
goto fim
:erro
echo.
echo Algo deu errado. Confira se o Node.js esta instalado (https://nodejs.org).
pause
:fim
