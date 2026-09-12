# Library Omega portable para pendrive

Esta carpeta permite abrir la interfaz de Library Omega desde un pendrive usando únicamente **Python 3.9 o superior**. No requiere Node.js ni una instalación de dependencias.

## Windows

Conecta el pendrive y haz doble clic en:

```text
INICIAR_LIBRARY_OMEGA.bat
```

El doble clic funciona como el botón **INICIAR LIBRARY OMEGA**: inicia el servidor y abre la biblioteca en el navegador automáticamente. El archivo `.bat` usa `INICIAR_LIBRARY_OMEGA.py`, que no depende de Tkinter ni de librerías externas. La ventana de Python debe permanecer abierta mientras uses la biblioteca; ciérrala para detener el servidor.

## macOS o Linux

Abre una terminal dentro de esta carpeta y ejecuta:

```bash
chmod +x iniciar_library_omega.sh
./iniciar_library_omega.sh
```

También puedes iniciar directamente:

```bash
python3 portable_server.py
```

El servidor abrirá `http://127.0.0.1:8765/` en el navegador. Para cerrarlo, vuelve a la ventana de Python y presiona `Ctrl+C`.

## Qué funciona localmente

La versión portable incluye la interfaz, el logo local gatito + Ω, el lector frontend, el tema, la navegación y la persistencia local del navegador cuando la aplicación puede trabajar sin servicios remotos.

## Qué necesita internet y Vercel/Manus

El inicio con Google/Manus, la sincronización multiusuario, los libros almacenados en la nube, el historial de accesos, las reseñas privadas y las operaciones protegidas requieren el backend online, la base de datos y las variables OAuth. Para esas funciones usa el paquete `LibraryOmega-Vercel-listo.zip` y configura las variables indicadas en `README-VERCEL.md`.

> El servidor Python no reemplaza el backend Express/tRPC. Su función es servir el build frontend localmente desde el pendrive; no guarda credenciales ni crea una base de datos local.

## Problemas frecuentes

Si Python no está instalado, instala Python desde [python.org](https://www.python.org/downloads/) y asegúrate de activar la opción para añadirlo al PATH en Windows. Si el puerto 8765 está ocupado, inicia con otro puerto:

```bash
OMEGA_PORT=8766 python3 portable_server.py
```

En Windows PowerShell:

```powershell
$env:OMEGA_PORT=8766; python portable_server.py
```
