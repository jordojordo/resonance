from typing import Literal

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_queue_manager
from api.models.queue import ApproveRequest, QueueItem, RejectRequest
from api.models.responses import ActionResponse, PaginatedResponse
from api.services.queue_manager import QueueManager

router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/pending", response_model=PaginatedResponse[QueueItem])
async def get_pending(
    source: Literal["all", "listenbrainz", "catalog"] = "all",
    sort: str = "added_at",
    order: Literal["asc", "desc"] = "desc",
    limit: int = 50,
    offset: int = 0,
    queue_manager: QueueManager = Depends(get_queue_manager),
) -> PaginatedResponse[QueueItem]:
    """Get paginated list of pending queue items."""
    items, total = queue_manager.get_pending(
        source=source,
        sort=sort,
        order=order,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/approve", response_model=ActionResponse)
async def approve_items(
    request: ApproveRequest,
    queue_manager: QueueManager = Depends(get_queue_manager),
) -> ActionResponse:
    """Approve pending items by MBIDs or approve all."""
    if request.all:
        count = queue_manager.approve_all()
        return ActionResponse(
            success=True,
            count=count,
            message=f"Approved all {count} pending items",
        )

    if not request.mbids:
        raise HTTPException(
            status_code=400,
            detail="Either 'mbids' or 'all=true' must be provided",
        )

    count = queue_manager.approve(request.mbids)
    return ActionResponse(
        success=True,
        count=count,
        message=f"Approved {count} items",
    )


@router.post("/reject", response_model=ActionResponse)
async def reject_items(
    request: RejectRequest,
    queue_manager: QueueManager = Depends(get_queue_manager),
) -> ActionResponse:
    """Reject pending items by MBIDs."""
    count = queue_manager.reject(request.mbids)
    return ActionResponse(
        success=True,
        count=count,
        message=f"Rejected {count} items",
    )
