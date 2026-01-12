from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class QueueItem(BaseModel):
    artist: str
    album: str | None = None
    title: str | None = None
    mbid: str
    type: Literal["album", "track"] = "album"
    added_at: datetime
    score: float | None = None
    source: Literal["listenbrainz", "catalog"]
    similar_to: list[str] | None = None
    source_track: str | None = None
    cover_url: str | None = None
    year: int | None = None


class ApproveRequest(BaseModel):
    mbids: list[str] | None = None
    all: bool = False


class RejectRequest(BaseModel):
    mbids: list[str]
