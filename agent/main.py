#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

from tonypi_agent.server import Agent, AgentServer


def main() -> None:
    parser = argparse.ArgumentParser(description="TonyPi action editor agent")
    parser.add_argument("--root", default="../TonyPi", help="TonyPi 根目录")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--token", default="")
    parser.add_argument("--hardware", choices=["mock", "serial"], default="mock")
    parser.add_argument("--device", default="/dev/ttyAMA0")
    args = parser.parse_args()

    agent = Agent(args.root, args.token, args.hardware, args.device)
    with AgentServer((args.bind, args.port), agent) as server:
        print(f"TonyPi agent listening on {args.bind}:{args.port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
