"""Thread-safe queue operations for Resonance discovery backend."""

import fcntl
import json
import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from .config import get_data_path

log = logging.getLogger(__name__)

# Default queue structure
DEFAULT_QUEUE = {
    "pending": [],
    "approved": [],
    "rejected": []
}


def _get_queue_path() -> Path:
    """Get the path to the pending queue file."""
    return get_data_path("pending_queue.json")


@contextmanager
def locked_queue(mode: str = 'r') -> Generator[dict, None, None]:
    """
    Context manager for thread-safe queue access with file locking.

    Args:
        mode: 'r' for read-only, 'w' for read-write

    Yields:
        Queue dictionary. Modifications are saved on exit if mode is 'w'.

    Example:
        with locked_queue('w') as queue:
            queue['pending'].append(new_entry)
    """
    queue_path = _get_queue_path()

    # Ensure parent directory exists
    queue_path.parent.mkdir(parents=True, exist_ok=True)

    # Create file if it doesn't exist
    if not queue_path.exists():
        queue_path.write_text(json.dumps(DEFAULT_QUEUE, indent=2))

    # Open with appropriate flags
    file_mode = 'r+' if mode == 'w' else 'r'

    try:
        with open(queue_path, file_mode) as f:
            # Acquire lock (exclusive for write, shared for read)
            lock_type = fcntl.LOCK_EX if mode == 'w' else fcntl.LOCK_SH
            fcntl.flock(f.fileno(), lock_type)

            try:
                content = f.read()
                if content.strip():
                    queue = json.loads(content)
                else:
                    queue = DEFAULT_QUEUE.copy()
            except json.JSONDecodeError:
                log.warning("Corrupted pending_queue.json, using empty queue")
                queue = DEFAULT_QUEUE.copy()

            # Ensure all required keys exist
            for key in DEFAULT_QUEUE:
                if key not in queue:
                    queue[key] = [] if key != "rejected" else []

            yield queue

            # Write back if in write mode
            if mode == 'w':
                f.seek(0)
                f.truncate()
                json.dump(queue, f, indent=2)

            # Release lock
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    except FileNotFoundError:
        # File was deleted between check and open, return empty queue
        log.warning("Queue file not found, returning empty queue")
        queue = DEFAULT_QUEUE.copy()
        yield queue

        if mode == 'w':
            queue_path.write_text(json.dumps(queue, indent=2))


def load_queue() -> dict:
    """
    Load the queue in read-only mode.

    Returns:
        Queue dictionary with 'pending', 'approved', and 'rejected' lists.
    """
    with locked_queue('r') as queue:
        # Return a copy to prevent accidental modifications
        return {
            "pending": list(queue.get("pending", [])),
            "approved": list(queue.get("approved", [])),
            "rejected": list(queue.get("rejected", []))
        }


def add_pending(entry: dict) -> None:
    """
    Add an entry to the pending queue.

    Args:
        entry: Dictionary with item details (artist, album/title, mbid, etc.)
    """
    with locked_queue('w') as queue:
        queue["pending"].append(entry)


def approve_items(mbids: list[str]) -> int:
    """
    Move items from pending to approved by their MBIDs.

    Args:
        mbids: List of MusicBrainz IDs to approve

    Returns:
        Number of items approved
    """
    mbid_set = set(mbids)
    approved_count = 0

    with locked_queue('w') as queue:
        pending = queue.get("pending", [])
        approved = queue.get("approved", [])

        new_pending = []
        for item in pending:
            if item.get("mbid") in mbid_set:
                approved.append(item)
                approved_count += 1
            else:
                new_pending.append(item)

        queue["pending"] = new_pending
        queue["approved"] = approved

    return approved_count


def reject_items(mbids: list[str]) -> int:
    """
    Move items from pending to rejected by their MBIDs.

    Rejected items are stored as a list of MBIDs only (not full entries)
    to prevent re-discovery.

    Args:
        mbids: List of MusicBrainz IDs to reject

    Returns:
        Number of items rejected
    """
    mbid_set = set(mbids)
    rejected_count = 0

    with locked_queue('w') as queue:
        pending = queue.get("pending", [])
        rejected = set(queue.get("rejected", []))

        new_pending = []
        for item in pending:
            item_mbid = item.get("mbid")
            if item_mbid in mbid_set:
                rejected.add(item_mbid)
                rejected_count += 1
            else:
                new_pending.append(item)

        queue["pending"] = new_pending
        queue["rejected"] = list(rejected)

    return rejected_count


def get_rejected_mbids() -> set[str]:
    """
    Get the set of rejected MBIDs.

    Returns:
        Set of rejected MusicBrainz IDs
    """
    with locked_queue('r') as queue:
        return set(queue.get("rejected", []))
