#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "No se encontró Python 3.9 o superior."
  exit 1
fi
python3 portable_server.py
