@echo off
chcp 65001 >nul
setlocal
title Plataforma de Aulas - Menu do Servidor
cd /d "%~dp0"
set "PASTA=%~dp0plataforma"
set "PORTA=3000"
set "URL=http://localhost:%PORTA%"
set "JANELA=Plataforma - servidor"

rem Permite usar sem menu:  "Menu do Servidor.bat" iniciar | parar | reiniciar | status
if not "%~1"=="" (
  call :%~1
  exit /b
)

:menu
cls
echo ==================================================
echo        PLATAFORMA DE AULAS - Menu do Servidor
echo ==================================================
call :status
echo.
echo   1. Iniciar servidor
echo   2. Parar servidor
echo   3. Reiniciar servidor
echo   4. Abrir no navegador
echo   5. Instalar / atualizar dependências (npm install)
echo   6. Verificar erros (build de produção)
echo   0. Sair
echo.
set "op="
set /p "op=Escolha uma opção e tecle Enter: "
if "%op%"=="1" call :iniciar & pause & goto menu
if "%op%"=="2" call :parar & pause & goto menu
if "%op%"=="3" call :reiniciar & pause & goto menu
if "%op%"=="4" start "" "%URL%" & goto menu
if "%op%"=="5" call :instalar & pause & goto menu
if "%op%"=="6" call :build & pause & goto menu
if "%op%"=="0" exit /b
goto menu


rem ---------- funções ----------

:rodando
rem errorlevel 0 = servidor rodando na porta
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PORTA% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %errorlevel%

:status
call :rodando
if %errorlevel%==0 (
  echo   Status: [RODANDO]  %URL%
) else (
  echo   Status: [PARADO]
)
exit /b

:iniciar
call :rodando
if %errorlevel%==0 (
  echo O servidor já está rodando em %URL%
  exit /b
)
if not exist "%PASTA%\node_modules" call :instalar
if not exist "%PASTA%\.env.local" (
  echo.
  echo ATENÇÃO: falta o arquivo plataforma\.env.local com as chaves do Supabase.
  echo Copie o .env.example para .env.local e preencha. Veja o README.
  exit /b
)
echo Iniciando o servidor...
start "%JANELA%" /min /D "%PASTA%" cmd /k npm run dev
rem espera até 60s a porta abrir
for /l %%i in (1,1,30) do (
  call :rodando && goto :iniciado
  ping -n 3 127.0.0.1 >nul
)
echo Não iniciou em 60 segundos. Veja a janela "%JANELA%" na barra de tarefas.
exit /b
:iniciado
echo Servidor rodando em %URL%
echo (a janela "%JANELA%" fica minimizada na barra de tarefas - não feche)
exit /b

:parar
call :rodando
if not %errorlevel%==0 (
  echo O servidor já está parado.
  exit /b
)
echo Parando o servidor...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %PORTA% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { taskkill /PID $_ /T /F | Out-Null }"
taskkill /FI "WINDOWTITLE eq %JANELA%*" /T /F >nul 2>&1
ping -n 2 127.0.0.1 >nul
call :rodando
if %errorlevel%==0 (
  echo Não consegui parar. Feche a janela "%JANELA%" manualmente.
) else (
  echo Servidor parado.
)
exit /b

:reiniciar
call :parar
ping -n 2 127.0.0.1 >nul
call :iniciar
exit /b

:instalar
echo Instalando dependências (pode levar alguns minutos)...
pushd "%PASTA%"
call npm install
popd
exit /b

:build
call :rodando
if %errorlevel%==0 (
  echo Pare o servidor antes de verificar - opção 2.
  exit /b
)
pushd "%PASTA%"
call npm run build
popd
exit /b
