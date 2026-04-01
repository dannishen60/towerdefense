#!/usr/bin/env python3
"""
Trigger a deployment on AI Builders Space (ai-builders.space).

Requires:
  - .env with AI_BUILDER_TOKEN (see .env.example)
  - deploy-config.json (copy from deploy-config.example.json)

API: https://space.ai-builders.com/backend/v1/deployments
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BACKEND = "https://space.ai-builders.com/backend"


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def main() -> int:
    root = Path(__file__).resolve().parent
    load_dotenv(root / ".env")
    token = os.environ.get("AI_BUILDER_TOKEN", "").strip()
    if not token:
        print("Set AI_BUILDER_TOKEN in .env (see .env.example).", file=sys.stderr)
        return 1

    cfg_path = root / "deploy-config.json"
    if not cfg_path.is_file():
        print(
            "Copy deploy-config.example.json to deploy-config.json and fill repo_url, branch, service_name.",
            file=sys.stderr,
        )
        return 1

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    required = ("repo_url", "service_name", "branch")
    for k in required:
        if k not in cfg or not str(cfg[k]).strip():
            print(f"Missing or empty {k} in deploy-config.json", file=sys.stderr)
            return 1

    body: dict = {
        "repo_url": cfg["repo_url"].strip(),
        "service_name": cfg["service_name"].strip(),
        "branch": cfg["branch"].strip(),
        "port": int(cfg.get("port", 8000)),
    }
    if isinstance(cfg.get("env_vars"), dict):
        body["env_vars"] = cfg["env_vars"]
    if cfg.get("streaming_log_timeout_seconds") is not None:
        body["streaming_log_timeout_seconds"] = cfg["streaming_log_timeout_seconds"]

    payload = json.dumps(body).encode("utf-8")
    req = Request(
        f"{BACKEND}/v1/deployments",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=120) as resp:
            out = resp.read().decode("utf-8")
    except HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}: {err}", file=sys.stderr)
        return 1
    except URLError as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return 1

    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
