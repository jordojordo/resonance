#!/usr/bin/env python3
"""Loop wrapper for slskd-downloader service."""

import os
import time

from ..slskd_downloader import main as run_slskd_downloader
from ..shared import setup_logging


def main():
    log = setup_logging("downloader-loop")
    interval = int(os.getenv("SLSKD_INTERVAL", 3600))  # Default: 1 hour
    initial_delay = int(os.getenv("SLSKD_INITIAL_DELAY", 60))  # Default: 1 minute

    log.info(f"Starting slskd-downloader loop (interval: {interval}s, initial_delay: {initial_delay}s)")

    # Initial delay to let other services start
    if initial_delay > 0:
        log.info(f"Waiting {initial_delay}s before first run...")
        time.sleep(initial_delay)

    while True:
        try:
            log.info("Running slskd-downloader...")
            run_slskd_downloader()
            log.info(f"slskd-downloader complete, sleeping {interval}s")
        except Exception as e:
            log.error(f"slskd-downloader failed: {e}")
        time.sleep(interval)


if __name__ == "__main__":
    main()
