@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo No se encontro Python 3.9 o superior.
  pause
  exit /b 1
)
python INICIAR_LIBRARY_OMEGA.py
if errorlevel 1 (
  echo El lanzador grafico no pudo abrirse. Iniciando la version directa...
  python portable_server.py
)
