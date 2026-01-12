#!/usr/bin/env python3
"""Fetch ListenBrainz recommendations and write to wishlist or pending queue."""

import json
import requests
import time
from datetime import datetime, timezone

from .shared import (
    load_config,
    get_data_path,
    load_queue,
    add_pending,
    get_rejected_mbids,
    locked_queue,
    append_to_wishlist,
    process_approved_to_wishlist,
    setup_logging,
)

log = setup_logging("lb-fetch")

MB_USER_AGENT = "lb-fetch/1.0 (music-discovery-stack)"


def load_processed() -> set:
    """Load set of already-processed MBIDs."""
    processed_path = get_data_path("processed.json")
    if processed_path.exists():
        try:
            return set(json.load(open(processed_path)))
        except json.JSONDecodeError:
            log.warning("Corrupted processed.json, starting fresh")
            return set()
    return set()


def save_processed(processed: set):
    """Save set of processed MBIDs."""
    processed_path = get_data_path("processed.json")
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    with open(processed_path, 'w') as f:
        json.dump(list(processed), f, indent=2)


def get_cover_art_url(release_group_mbid: str) -> str | None:
    """Get cover art URL from Cover Art Archive."""
    if not release_group_mbid:
        return None
    return f"https://coverartarchive.org/release-group/{release_group_mbid}/front-250"


def fetch_recommendations(username: str, token: str, count: int = 100) -> list:
    """Fetch recording (track) recommendations from ListenBrainz."""
    url = f"https://api.listenbrainz.org/1/cf/recommendation/user/{username}/recording"
    headers = {"Authorization": f"Token {token}"}

    try:
        resp = requests.get(url, headers=headers, params={"count": count}, timeout=30)
        if resp.status_code == 204:
            log.warning("No recommendations yet - need more listening history")
            return []
        resp.raise_for_status()
        return resp.json().get("payload", {}).get("mbids", [])
    except Exception as e:
        log.error(f"Failed to fetch recommendations: {e}")
        return []


def resolve_recording(mbid: str) -> dict | None:
    """Resolve a recording MBID to artist + title."""
    url = f"https://musicbrainz.org/ws/2/recording/{mbid}"
    headers = {"User-Agent": MB_USER_AGENT}

    try:
        resp = requests.get(url, headers=headers, params={"inc": "artists", "fmt": "json"}, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        artists = []
        for credit in data.get("artist-credit", []):
            if "artist" in credit:
                artists.append(credit["artist"]["name"])

        artist = " & ".join(artists)
        title = data.get("title")

        if artist and title:
            return {"artist": artist, "title": title, "mbid": mbid}
    except Exception as e:
        log.error(f"Failed to resolve recording {mbid}: {e}")

    return None


def resolve_recording_to_album(mbid: str) -> dict | None:
    """Resolve a recording MBID to its parent album (release-group)."""
    url = f"https://musicbrainz.org/ws/2/recording/{mbid}"
    headers = {"User-Agent": MB_USER_AGENT}

    try:
        # Get recording with releases included
        resp = requests.get(
            url,
            headers=headers,
            params={"inc": "artists+releases+release-groups", "fmt": "json"},
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()

        # Get artist
        artists = []
        for credit in data.get("artist-credit", []):
            if "artist" in credit:
                artists.append(credit["artist"]["name"])
        artist = " & ".join(artists)

        if not artist:
            return None

        # Get track title for reference
        track_title = data.get("title", "")

        # Get release-group from first release
        releases = data.get("releases", [])
        if not releases:
            log.debug(f"Recording {mbid} has no releases")
            return None

        # Prefer official albums over singles/EPs/compilations
        album_release = None
        for release in releases:
            rg = release.get("release-group", {})
            primary_type = rg.get("primary-type", "")
            if primary_type == "Album":
                album_release = release
                break

        # Fall back to first release if no album found
        if not album_release:
            album_release = releases[0]

        rg = album_release.get("release-group", {})
        rg_mbid = rg.get("id")
        album_title = rg.get("title") or album_release.get("title")

        # Extract year from first-release-date
        year = None
        release_date = rg.get("first-release-date", "") or album_release.get("date", "")
        if release_date and len(release_date) >= 4:
            try:
                year = int(release_date[:4])
            except ValueError:
                pass

        if rg_mbid and album_title:
            return {
                "artist": artist,
                "title": album_title,
                "mbid": rg_mbid,  # Use release-group MBID for dedup
                "recording_mbid": mbid,
                "track_title": track_title,
                "year": year
            }
    except Exception as e:
        log.error(f"Failed to resolve recording {mbid} to album: {e}")

    return None


def process_approved_queue() -> int:
    """
    Process any approved entries in the pending queue.
    Moves them to wishlist.txt and clears from approved list.
    """
    with locked_queue('w') as queue:
        approved = queue.get("approved", [])
        if not approved:
            return 0

        log.info(f"Processing {len(approved)} approved items from queue...")
        count = process_approved_to_wishlist(approved)

        # Clear approved list after processing
        queue["approved"] = []

    return count


def main():
    config = load_config()
    processed = load_processed()

    lb = config.get("listenbrainz", {})
    username = lb.get("username")
    token = lb.get("token")

    if not username or not token:
        log.error("Missing listenbrainz username or token in config")
        return

    mode = config.get("mode", "track").lower()
    if mode not in ("track", "album"):
        log.error(f"Invalid mode '{mode}' - must be 'track' or 'album'")
        return

    min_score = config.get("min_score", 0)
    fetch_count = config.get("fetch_count", 100)

    # Check for approval mode (auto or manual)
    # First check listenbrainz-specific setting, then fall back to global
    approval_mode = lb.get("approval_mode", config.get("approval_mode", "auto")).lower()
    if approval_mode not in ("auto", "manual"):
        log.warning(f"Invalid approval_mode '{approval_mode}', defaulting to 'auto'")
        approval_mode = "auto"

    log.info(f"Fetching recommendations for {username} (mode: {mode}, approval: {approval_mode})...")

    # Load and process any previously approved items first
    rejected_mbids = get_rejected_mbids()
    approved_count = process_approved_queue()
    if approved_count > 0:
        log.info(f"Processed {approved_count} approved items")

    recs = fetch_recommendations(username, token, fetch_count)
    log.info(f"Got {len(recs)} track recommendations")

    added_count = 0
    seen_albums = set()  # For album mode deduplication within this run

    # Load current queue to get pending entries
    queue = load_queue()
    pending_entries = queue.get("pending", [])
    pending_mbids = {e.get("mbid") for e in pending_entries}

    for rec in recs:
        mbid = rec.get("recording_mbid")
        if not mbid:
            continue

        score = rec.get("score", 0)
        if score < min_score:
            continue

        try:
            if mode == "track":
                # Track mode: check if we've processed this recording
                if mbid in processed:
                    continue

                time.sleep(1)  # MusicBrainz rate limit

                item = resolve_recording(mbid)
                if item:
                    if approval_mode == "auto":
                        append_to_wishlist(item["artist"], item["title"], is_album=False)
                        log.info(f"  + {item['artist']} - {item['title']}")
                    else:
                        # Manual mode: add to pending queue
                        entry = {
                            "artist": item["artist"],
                            "title": item["title"],
                            "mbid": item["mbid"],
                            "type": "track",
                            "added_at": datetime.now(timezone.utc).isoformat(),
                            "score": round(score, 2) if score else None,
                            "source": "listenbrainz"
                        }
                        add_pending(entry)
                        log.info(f"  ? {item['artist']} - {item['title']} (pending approval)")

                    processed.add(mbid)
                    save_processed(processed)  # Save immediately
                    added_count += 1

            else:
                # Album mode: resolve to album, deduplicate
                time.sleep(1)  # MusicBrainz rate limit

                item = resolve_recording_to_album(mbid)
                if item:
                    album_mbid = item["mbid"]

                    # Skip if we've already seen this album in this run
                    if album_mbid in seen_albums:
                        continue
                    seen_albums.add(album_mbid)

                    # Skip if we've processed this album before
                    if album_mbid in processed:
                        continue

                    # Skip if rejected
                    if album_mbid in rejected_mbids:
                        continue

                    # Skip if already in pending queue
                    if album_mbid in pending_mbids:
                        continue

                    if approval_mode == "auto":
                        append_to_wishlist(item["artist"], item["title"], is_album=True)
                        log.info(f"  + {item['artist']} - {item['title']}")
                    else:
                        # Manual mode: add to pending queue
                        entry = {
                            "artist": item["artist"],
                            "album": item["title"],
                            "mbid": album_mbid,
                            "type": "album",
                            "added_at": datetime.now(timezone.utc).isoformat(),
                            "score": round(score, 2) if score else None,
                            "source": "listenbrainz",
                            "source_track": item.get("track_title"),
                            "cover_url": get_cover_art_url(album_mbid),
                            "year": item.get("year")
                        }
                        add_pending(entry)
                        pending_mbids.add(album_mbid)  # Track locally too
                        log.info(f"  ? {item['artist']} - {item['title']} (pending approval)")

                    processed.add(album_mbid)
                    save_processed(processed)  # Save immediately
                    added_count += 1

        except Exception as e:
            log.error(f"Error processing {mbid}: {e}")
            continue  # Don't let one failure stop the whole run

    if added_count > 0:
        item_type = "albums" if mode == "album" else "tracks"
        destination = "pending queue" if approval_mode == "manual" else "wishlist"
        log.info(f"Added {added_count} {item_type} to {destination}")
    else:
        log.info(f"No new {'albums' if mode == 'album' else 'tracks'}")


if __name__ == "__main__":
    main()
