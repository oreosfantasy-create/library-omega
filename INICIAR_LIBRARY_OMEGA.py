#!/usr/bin/env python3
"""Iniciador de un clic para Library Omega portable.

No requiere Tkinter ni dependencias externas: inicia el servidor y abre el
navegador predeterminado. En Windows se ejecuta haciendo doble clic en el BAT.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = os.environ.get("OMEGA_PORT", "8765")


def main() -> None:
    env = os.environ.copy()
    env["OMEGA_NO_BROWSER"] = "1"
    process = subprocess.Popen([sys.executable, str(ROOT / "portable_server.py")], cwd=ROOT, env=env)
    time.sleep(0.8)
    webbrowser.open(f"http://127.0.0.1:{PORT}/")
    print("Library Omega se abrió en el navegador.")
    print("Cierra esta ventana para detener la biblioteca.")
    try:
        process.wait()
    except KeyboardInterrupt:
        process.terminate()
        process.wait()


if __name__ == "__main__":
    main()
