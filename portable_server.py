#!/usr/bin/env python3
"""Servidor local portable para Library Omega.

Ejecuta el build frontend sin instalar Node.js. Las funciones que requieren
backend, OAuth o base de datos siguen necesitando el despliegue online.
"""
from __future__ import annotations

import os
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "public"
STATIC_ROOT = DIST if DIST.exists() else ROOT / "client"
PORT = int(os.environ.get("OMEGA_PORT", "8765"))


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        requested = Path(self.translate_path(self.path))
        if not requested.exists() or requested.is_dir():
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, format: str, *args: object) -> None:
        print(f"[Library Omega] {format % args}")


def main() -> None:
    handler = partial(SpaHandler, directory=str(STATIC_ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    url = f"http://127.0.0.1:{PORT}/"
    print(f"Library Omega portable ejecutándose en {url}")
    print("Presiona Ctrl+C para cerrar el servidor.")
    if os.environ.get("OMEGA_NO_BROWSER") != "1":
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando Library Omega...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
