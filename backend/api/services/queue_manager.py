"""Queue management service wrapping shared queue module."""
from typing import Literal

from api.models.queue import QueueItem
from discovery.shared import load_queue, approve_items, reject_items
from discovery.shared import process_approved_to_wishlist


class QueueManager:
    """Service for managing the pending queue."""

    def get_pending(
        self,
        source: str = "all",
        sort: str = "added_at",
        order: str = "desc",
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[QueueItem], int]:
        """Get paginated pending items with filtering and sorting."""
        queue = load_queue()
        items = queue.get("pending", [])

        # Filter by source
        if source != "all":
            items = [i for i in items if i.get("source") == source]

        # Sort
        reverse = order == "desc"
        if sort == "score":
            items.sort(key=lambda x: x.get("score") or 0, reverse=reverse)
        elif sort == "artist":
            items.sort(key=lambda x: x.get("artist", "").lower(), reverse=reverse)
        elif sort == "year":
            items.sort(key=lambda x: x.get("year") or 0, reverse=reverse)
        else:  # added_at
            items.sort(key=lambda x: x.get("added_at", ""), reverse=reverse)

        total = len(items)
        items = items[offset:offset + limit]

        return [QueueItem(**i) for i in items], total

    def approve(self, mbids: list[str]) -> int:
        """Approve items by MBID and move to wishlist."""
        # Get items before approving
        queue = load_queue()
        to_approve = [i for i in queue["pending"] if i.get("mbid") in mbids]

        count = approve_items(mbids)
        if count > 0:
            process_approved_to_wishlist(to_approve)

        return count

    def approve_all(self) -> int:
        """Approve all pending items."""
        queue = load_queue()
        mbids = [i.get("mbid") for i in queue["pending"] if i.get("mbid")]
        return self.approve(mbids)

    def reject(self, mbids: list[str]) -> int:
        """Reject items by MBID."""
        return reject_items(mbids)

    def get_stats(self) -> dict:
        """Get queue statistics."""
        queue = load_queue()
        return {
            "pending": len(queue.get("pending", [])),
            "approved": len(queue.get("approved", [])),
            "rejected": len(queue.get("rejected", []))
        }
