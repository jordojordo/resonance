"""Wishlist operations for Resonance discovery backend."""

import fcntl
import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, TextIO

from .config import get_data_path

log = logging.getLogger(__name__)


def _get_wishlist_path() -> Path:
    """Get the path to the wishlist file."""
    return get_data_path("wishlist.txt")


@contextmanager
def locked_wishlist(mode: str = 'r') -> Generator[TextIO, None, None]:
    """
    Context manager for thread-safe wishlist access with file locking.

    Args:
        mode: 'r' for read-only, 'a' for append, 'w' for write

    Yields:
        File handle for the wishlist file.

    Example:
        with locked_wishlist('a') as f:
            f.write('a:"Artist - Album"\\n')
    """
    wishlist_path = _get_wishlist_path()

    # Ensure parent directory exists
    wishlist_path.parent.mkdir(parents=True, exist_ok=True)

    # Create file if it doesn't exist (for read mode)
    if mode == 'r' and not wishlist_path.exists():
        wishlist_path.touch()

    # Map mode to file open mode
    file_mode = mode
    if mode == 'a':
        file_mode = 'a'
    elif mode == 'w':
        file_mode = 'w'
    else:
        file_mode = 'r'

    try:
        with open(wishlist_path, file_mode) as f:
            # Acquire exclusive lock for write/append, shared for read
            lock_type = fcntl.LOCK_EX if mode in ('a', 'w') else fcntl.LOCK_SH
            fcntl.flock(f.fileno(), lock_type)

            try:
                yield f
            finally:
                # Release lock
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    except FileNotFoundError:
        log.warning("Wishlist file not found")
        # For read mode, yield a dummy that returns empty
        if mode == 'r':
            # Create the file and yield empty handle
            wishlist_path.touch()
            with open(wishlist_path, 'r') as f:
                yield f


def _escape_quotes(text: str) -> str:
    """Escape double quotes in text for wishlist format."""
    return text.replace('"', '\\"')


def append_to_wishlist(artist: str, title: str, is_album: bool = True) -> None:
    """
    Append an entry to the wishlist file.

    Format:
    - Albums: a:"Artist - Album"
    - Tracks: "Artist - Track"

    Args:
        artist: Artist name
        title: Album or track title
        is_album: True for albums (adds 'a:' prefix), False for tracks
    """
    artist_escaped = _escape_quotes(artist)
    title_escaped = _escape_quotes(title)

    prefix = 'a:' if is_album else ''
    line = f'{prefix}"{artist_escaped} - {title_escaped}"\n'

    with locked_wishlist('a') as f:
        f.write(line)


def process_approved_to_wishlist(approved_items: list[dict]) -> int:
    """
    Process approved items and add them to the wishlist.

    Handles both album and track entries:
    - Albums have 'album' key -> writes as a:"Artist - Album"
    - Tracks have 'title' key -> writes as "Artist - Track"

    Args:
        approved_items: List of approved item dictionaries with 'artist'
                        and either 'album' or 'title' keys

    Returns:
        Number of items added to wishlist
    """
    if not approved_items:
        return 0

    count = 0

    with locked_wishlist('a') as f:
        for item in approved_items:
            artist = item.get("artist", "")

            # Determine if album or track
            if "album" in item:
                title = item["album"]
                is_album = True
            else:
                title = item.get("title", "")
                is_album = False

            if not artist or not title:
                log.warning(f"Skipping item with missing artist or title: {item}")
                continue

            artist_escaped = _escape_quotes(artist)
            title_escaped = _escape_quotes(title)

            prefix = 'a:' if is_album else ''
            line = f'{prefix}"{artist_escaped} - {title_escaped}"\n'

            f.write(line)
            count += 1
            log.info(f"Added to wishlist: {artist} - {title}")

    return count
