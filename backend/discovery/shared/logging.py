"""Unified logging setup for Resonance discovery backend."""

import logging
import os
from typing import Optional


def setup_logging(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Set up and return a configured logger.

    Configures logging with a consistent format across all discovery modules.
    Uses LOG_LEVEL environment variable if level is not specified.

    Args:
        name: Logger name (typically __name__ of the calling module)
        level: Optional log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL).
               Defaults to LOG_LEVEL env var or INFO.

    Returns:
        Configured logger instance

    Example:
        from shared.logging import setup_logging
        log = setup_logging(__name__)
        log.info("Starting discovery process")
    """
    # Determine log level
    if level is None:
        level = os.environ.get("LOG_LEVEL", "INFO")

    # Convert string to logging level
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    # Configure the root logger if not already configured
    if not logging.root.handlers:
        logging.basicConfig(
            level=numeric_level,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    # Get or create logger
    logger = logging.getLogger(name)
    logger.setLevel(numeric_level)

    # If this specific logger has no handlers and root has handlers,
    # it will propagate to root. If we want a separate handler:
    if not logger.handlers and not logger.parent:
        handler = logging.StreamHandler()
        handler.setLevel(numeric_level)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
