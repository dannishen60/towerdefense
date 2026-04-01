"""
Tower Defense — static game + FastAPI for AI Builders Space (single port, honors PORT).
"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
# Prefer Docker layout: ./static/…; otherwise serve from repo root for local dev.
if (ROOT / "static" / "index.html").is_file():
    STATIC_DIR = ROOT / "static"
else:
    STATIC_DIR = ROOT

app = FastAPI()
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="site")
