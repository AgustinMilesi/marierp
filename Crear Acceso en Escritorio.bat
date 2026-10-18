@echo off
chcp 65001 >nul
title Configurar Acceso Directo - Lo de Mari

echo =======================================================
echo     LO DE MARI - SISTEMA DE GESTION Y PUNTO DE VENTA
echo =======================================================
echo.
echo Creando acceso directo en el Escritorio con icono oficial...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut(\"$desktop\Lo de Mari - Sistema.lnk\"); $s.TargetPath = \"$PSScriptRoot\index.html\"; $s.WorkingDirectory = \"$PSScriptRoot\"; if (Test-Path \"$PSScriptRoot\logo.ico\") { $s.IconLocation = \"$PSScriptRoot\logo.ico,0\" }; $s.Description = \"Sistema Lo de Mari - Almacén y Verdulería\"; $s.Save()"

echo.
echo =======================================================
echo   [LISTO] Acceso directo creado en el Escritorio!
echo   Ya podés abrir el sistema directamente desde allí.
echo =======================================================
echo.
pause
