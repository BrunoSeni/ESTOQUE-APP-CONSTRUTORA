@echo off
REM Atualiza o app para a versao mais nova e abre em seguida.
REM Os cadastros e lancamentos (pasta "dados") continuam como estao.
cd /d "%~dp0"
REM Tudo entre parenteses e lido de uma vez, porque este arquivo tambem e trocado na atualizacao.
(
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0atualizar.ps1"
  if errorlevel 1 (
    echo.
    pause
    exit /b 1
  )
  call "%~dp0iniciar.bat"
  exit /b
)
