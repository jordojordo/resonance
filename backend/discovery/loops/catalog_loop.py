#!/usr/bin/env python3
"""Loop wrapper for catalog-discovery service."""

import os
import time

from ..catalog_discovery import main as run_catalog_discovery
from ..shared import setup_logging


def main():
    log = setup_logging("catalog-loop")
    interval = int(os.getenv("CATALOG_INTERVAL", 604800))  # Default: 1 week
    initial_delay = int(os.getenv("CATALOG_INITIAL_DELAY", 120))  # Default: 2 minutes

    log.info(f"Starting catalog-discovery loop (interval: {interval}s, initial_delay: {initial_delay}s)")

    # Initial delay to let other services start
    if initial_delay > 0:
        log.info(f"Waiting {initial_delay}s before first run...")
        time.sleep(initial_delay)

    while True:
        try:
            log.info("Running catalog-discovery...")
            run_catalog_discovery()
            log.info(f"catalog-discovery complete, sleeping {interval}s")
        except Exception as e:
            log.error(f"catalog-discovery failed: {e}")
        time.sleep(interval)


if __name__ == "__main__":
    main()
