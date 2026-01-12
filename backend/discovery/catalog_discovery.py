#!/usr/bin/env python3
"""Discover new music based on existing library catalog via Last.fm similar artists."""

import hashlib
import json
import requests
import time
from collections import defaultdict
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

log = setup_logging("catalog-discovery")

# API settings
MB_USER_AGENT = "catalog-discovery/1.0 (music-discovery-stack)"
LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/"


def load_json_file(filename: str, default=None):
    """Load a JSON file, returning default if not exists or corrupted."""
    if default is None:
        default = {}
    path = get_data_path(filename)
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except json.JSONDecodeError:
            log.warning(f"Corrupted {filename}, starting fresh")
            return default
    return default


def save_json_file(filename: str, data):
    """Save data to JSON file."""
    path = get_data_path(filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)


def load_catalog_artists() -> dict:
    """Load cached library artists. Returns {name_lower: {"name": str, "id": str}}"""
    return load_json_file("catalog_artists.json", {})


def save_catalog_artists(artists: dict):
    """Save library artists cache."""
    save_json_file("catalog_artists.json", artists)


def load_discovered() -> set:
    """Load set of already-discovered artist names (lowercase)."""
    data = load_json_file("catalog_discovered.json", [])
    return set(data)


def save_discovered(discovered: set):
    """Save discovered artists set."""
    save_json_file("catalog_discovered.json", list(discovered))


def md5_hash(text: str) -> str:
    """Generate MD5 hash (used for Subsonic API auth)."""
    return hashlib.md5(text.encode()).hexdigest()


def fetch_navidrome_artists(config: dict) -> dict:
    """
    Fetch all artists from Navidrome via Subsonic API.
    Returns {name_lower: {"name": str, "id": str}}
    """
    nav_config = config.get("navidrome", {})
    host = nav_config.get("host", "").rstrip("/")
    username = nav_config.get("username", "")
    password = nav_config.get("password", "")

    if not all([host, username, password]):
        log.error("Missing Navidrome configuration (host, username, or password)")
        return {}

    # Subsonic API uses salt + token auth or plain password
    # Using token method: token = md5(password + salt)
    salt = "catalogdisc"
    token = md5_hash(password + salt)

    params = {
        "u": username,
        "t": token,
        "s": salt,
        "v": "1.16.1",
        "c": "catalog-discovery",
        "f": "json"
    }

    url = f"{host}/rest/getArtists"

    try:
        log.info(f"Fetching artists from Navidrome at {host}...")
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # Check for Subsonic error
        subsonic_resp = data.get("subsonic-response", {})
        if subsonic_resp.get("status") != "ok":
            error = subsonic_resp.get("error", {})
            log.error(f"Subsonic API error: {error.get('message', 'Unknown error')}")
            return {}

        # Parse artist index
        artists = {}
        artist_index = subsonic_resp.get("artists", {}).get("index", [])

        for index_entry in artist_index:
            for artist in index_entry.get("artist", []):
                name = artist.get("name", "")
                artist_id = artist.get("id", "")
                if name:
                    artists[name.lower()] = {
                        "name": name,
                        "id": artist_id
                    }

        log.info(f"Found {len(artists)} artists in library")
        return artists

    except requests.exceptions.RequestException as e:
        log.error(f"Failed to fetch artists from Navidrome: {e}")
        return {}


def get_similar_artists(artist_name: str, api_key: str, limit: int = 10) -> list:
    """
    Query Last.fm for similar artists.
    Returns list of {"name": str, "match": float, "mbid": str|None}
    """
    params = {
        "method": "artist.getsimilar",
        "artist": artist_name,
        "api_key": api_key,
        "limit": limit,
        "format": "json"
    }

    try:
        resp = requests.get(LASTFM_API_BASE, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        # Check for Last.fm error
        if "error" in data:
            log.debug(f"Last.fm error for '{artist_name}': {data.get('message', 'Unknown')}")
            return []

        similar = []
        for artist in data.get("similarartists", {}).get("artist", []):
            similar.append({
                "name": artist.get("name", ""),
                "match": float(artist.get("match", 0)),
                "mbid": artist.get("mbid") or None
            })

        return similar

    except requests.exceptions.RequestException as e:
        log.debug(f"Failed to get similar artists for '{artist_name}': {e}")
        return []
    except (ValueError, KeyError) as e:
        log.debug(f"Failed to parse Last.fm response for '{artist_name}': {e}")
        return []


def fetch_artist_albums(artist_name: str, mbid: str = None, limit: int = 3) -> list:
    """
    Fetch studio albums for an artist from MusicBrainz.
    Returns list of {"title": str, "mbid": str, "year": int|None}
    """
    headers = {"User-Agent": MB_USER_AGENT}

    # If we have MBID, use it; otherwise search by name
    if mbid:
        url = "https://musicbrainz.org/ws/2/release-group"
        params = {
            "artist": mbid,
            "type": "album",
            "fmt": "json",
            "limit": 100  # Get more, we'll filter
        }
    else:
        # Search by artist name
        url = "https://musicbrainz.org/ws/2/release-group"
        params = {
            "query": f'artist:"{artist_name}" AND primarytype:album',
            "fmt": "json",
            "limit": 100
        }

    try:
        time.sleep(1)  # MusicBrainz rate limit
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        albums = []
        release_groups = data.get("release-groups", [])

        for rg in release_groups:
            # Filter for primary type "Album" only (no singles, EPs, compilations)
            primary_type = rg.get("primary-type", "")
            secondary_types = rg.get("secondary-types", [])

            # Skip if not an album or if it's a compilation/live/remix
            if primary_type != "Album":
                continue
            if any(t in secondary_types for t in ["Compilation", "Live", "Remix", "Soundtrack"]):
                continue

            # Extract year from first-release-date
            year = None
            release_date = rg.get("first-release-date", "")
            if release_date and len(release_date) >= 4:
                try:
                    year = int(release_date[:4])
                except ValueError:
                    pass

            albums.append({
                "title": rg.get("title", ""),
                "mbid": rg.get("id", ""),
                "year": year
            })

        # Sort by year (newest first), then limit
        albums.sort(key=lambda x: x.get("year") or 0, reverse=True)
        return albums[:limit]

    except requests.exceptions.RequestException as e:
        log.debug(f"Failed to fetch albums for '{artist_name}': {e}")
        return []


def get_cover_art_url(release_group_mbid: str) -> str | None:
    """Get cover art URL from Cover Art Archive."""
    if not release_group_mbid:
        return None
    return f"https://coverartarchive.org/release-group/{release_group_mbid}/front-250"


def process_approved_queue() -> int:
    """
    Process any approved entries in the pending queue.
    Moves them to wishlist.txt and clears from approved list.
    """
    with locked_queue('w') as queue:
        approved = queue.get("approved", [])
        if not approved:
            return 0

        log.info(f"Processing {len(approved)} approved albums...")
        count = process_approved_to_wishlist(approved)

        # Clear approved list after processing
        queue["approved"] = []

    return count


def main():
    config = load_config()

    # Check if catalog discovery is enabled
    catalog_config = config.get("catalog_discovery", {})
    if not catalog_config.get("enabled", False):
        log.info("Catalog discovery is disabled in config")
        return

    # Load settings with defaults
    lastfm_key = catalog_config.get("lastfm", {}).get("api_key", "")
    if not lastfm_key:
        log.error("Missing Last.fm API key in config")
        return

    max_artists = catalog_config.get("max_artists_per_run", 10)
    min_similarity = catalog_config.get("min_similarity", 0.3)
    similar_limit = catalog_config.get("similar_artist_limit", 10)
    albums_per_artist = catalog_config.get("albums_per_artist", 3)
    mode = catalog_config.get("mode", "manual")

    log.info(f"Starting catalog discovery (mode: {mode}, max_artists: {max_artists})")

    # Step 1: Get library artists from Navidrome
    library_artists = fetch_navidrome_artists(catalog_config)
    if not library_artists:
        log.warning("No library artists found or Navidrome unreachable")
        return

    # Cache the library artists
    save_catalog_artists(library_artists)

    # Load state
    discovered = load_discovered()
    rejected_mbids = get_rejected_mbids()

    # Process any previously approved items first
    approved_count = process_approved_queue()
    if approved_count > 0:
        log.info(f"Processed {approved_count} approved items")

    # Step 2: Build similarity graph
    log.info("Querying Last.fm for similar artists...")
    similarity_scores = defaultdict(float)
    similar_to_map = defaultdict(list)  # Track which library artists each is similar to

    # Sample library artists if there are too many (avoid API abuse)
    library_list = list(library_artists.values())
    if len(library_list) > 100:
        import random
        random.shuffle(library_list)
        library_list = library_list[:100]
        log.info(f"Sampling 100 of {len(library_artists)} library artists")

    for i, artist_info in enumerate(library_list):
        artist_name = artist_info["name"]

        # Rate limit Last.fm (be nice)
        if i > 0:
            time.sleep(0.25)

        similar = get_similar_artists(artist_name, lastfm_key, limit=similar_limit)

        for s in similar:
            sim_name = s["name"]
            sim_match = s["match"]

            # Skip if below threshold
            if sim_match < min_similarity:
                continue

            # Skip if already in library
            if sim_name.lower() in library_artists:
                continue

            # Aggregate score
            similarity_scores[sim_name.lower()] += sim_match
            similar_to_map[sim_name.lower()].append(artist_name)

    log.info(f"Found {len(similarity_scores)} potential new artists")

    # Step 3: Rank and filter
    ranked = sorted(
        similarity_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    # Filter out already discovered
    new_artists = [
        (name_lower, score)
        for name_lower, score in ranked
        if name_lower not in discovered
    ]

    # Take top N
    discoveries = new_artists[:max_artists]

    if not discoveries:
        log.info("No new artists to discover this run")
        return

    log.info(f"Discovering {len(discoveries)} new artists...")

    # Step 4: Fetch albums and output
    added_count = 0

    for name_lower, score in discoveries:
        # Get proper-cased name from similar_to_map values
        # (We need to query Last.fm again or track it - let's use the key with title case as fallback)
        artist_name = name_lower.title()

        # Actually, let's get the proper name from the Last.fm data
        # We'll do a quick lookup
        similar_info = get_similar_artists(similar_to_map[name_lower][0], lastfm_key, limit=50)
        for s in similar_info:
            if s["name"].lower() == name_lower:
                artist_name = s["name"]
                artist_mbid = s.get("mbid")
                break
        else:
            artist_mbid = None

        time.sleep(0.5)  # Rate limit

        # Get albums
        albums = fetch_artist_albums(artist_name, artist_mbid, limit=albums_per_artist)

        if not albums:
            log.debug(f"No albums found for {artist_name}")
            discovered.add(name_lower)
            save_discovered(discovered)
            continue

        similar_to_list = similar_to_map.get(name_lower, [])[:5]  # Top 5 similar library artists

        for album in albums:
            album_mbid = album.get("mbid", "")

            # Skip if rejected
            if album_mbid in rejected_mbids:
                continue

            album_title = album.get("title", "")

            if mode == "auto":
                # Direct to wishlist
                append_to_wishlist(artist_name, album_title, is_album=True)
                log.info(f"  + {artist_name} - {album_title} (score: {score:.2f})")
                added_count += 1
            else:
                # Add to pending queue
                entry = {
                    "artist": artist_name,
                    "album": album_title,
                    "mbid": album_mbid,
                    "type": "album",
                    "added_at": datetime.now(timezone.utc).isoformat(),
                    "score": round(score, 2),
                    "similar_to": similar_to_list,
                    "source": "catalog",
                    "cover_url": get_cover_art_url(album_mbid),
                    "year": album.get("year")
                }
                add_pending(entry)
                log.info(f"  ? {artist_name} - {album_title} (pending approval, score: {score:.2f})")
                added_count += 1

        # Mark artist as discovered
        discovered.add(name_lower)
        save_discovered(discovered)

    log.info(f"Catalog discovery complete: {added_count} albums {'queued for approval' if mode == 'manual' else 'added to wishlist'}")


if __name__ == "__main__":
    main()
