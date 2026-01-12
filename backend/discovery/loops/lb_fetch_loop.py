#!/usr/bin/env python3
"""Loop wrapper for lb-fetch service."""

import os
import time

from ..lb_fetch import main as run_lb_fetch
from ..shared import setup_logging


def main():
    log = setup_logging("lb-fetch-loop")
    interval = int(os.getenv("LB_FETCH_INTERVAL", 21600))
    log.info(f"Starting lb-fetch loop (interval: {interval}s)")

    while True:
        try:
            log.info("Running lb-fetch...")
            run_lb_fetch()
            log.info(f"lb-fetch complete, sleeping {interval}s")
        except Exception as e:
            log.error(f"lb-fetch failed: {e}")
        time.sleep(interval)


if __name__ == "__main__":
    main()
