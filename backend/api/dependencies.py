"""FastAPI dependencies."""
from functools import lru_cache

from api.services.queue_manager import QueueManager


@lru_cache
def get_queue_manager() -> QueueManager:
    """Get cached QueueManager instance."""
    return QueueManager()
