#!/usr/bin/env python3
"""Download albums from wishlist using slskd API."""

import json
import time

import slskd_api

from .shared import (
    load_config,
    get_data_path,
    setup_logging,
)

log = setup_logging("slskd-downloader")


def load_downloaded() -> set:
    """Load set of already-downloaded items."""
    downloaded_path = get_data_path("downloaded.json")
    if downloaded_path.exists():
        try:
            return set(json.load(open(downloaded_path)))
        except json.JSONDecodeError:
            return set()
    return set()


def save_downloaded(downloaded: set):
    """Save set of downloaded items."""
    downloaded_path = get_data_path("downloaded.json")
    downloaded_path.parent.mkdir(parents=True, exist_ok=True)
    with open(downloaded_path, 'w') as f:
        json.dump(list(downloaded), f, indent=2)


def parse_wishlist() -> list[dict]:
    """Parse wishlist.txt into list of items."""
    wishlist_path = get_data_path("wishlist.txt")
    if not wishlist_path.exists():
        return []

    items = []
    with open(wishlist_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            # Check for a: prefix (album mode)
            is_album = False
            if line.startswith('a:'):
                is_album = True
                line = line[2:]

            # Remove quotes
            if line.startswith('"') and line.endswith('"'):
                line = line[1:-1]

            # Unescape quotes
            line = line.replace('\\"', '"')

            # Parse "Artist - Title"
            if ' - ' in line:
                artist, title = line.split(' - ', 1)
                items.append({
                    'artist': artist.strip(),
                    'title': title.strip(),
                    'is_album': is_album,
                    'raw': line
                })

    return items


def search_album(slskd: slskd_api.SlskdClient, artist: str, album: str,
                 timeout: int = 15000, min_files: int = 3) -> dict | None:
    """
    Search for an album and return the best matching folder.
    Returns dict with 'username', 'directory', 'files' or None.
    """
    query = f"{artist} {album}"
    log.info(f"Searching: {query}")

    try:
        # Start search
        search = slskd.searches.search_text(
            searchText=query,
            searchTimeout=timeout,
            filterResponses=True,
            minimumResponseFileCount=min_files
        )
        search_id = search.get('id')

        if not search_id:
            log.error("No search ID returned")
            return None

        # Wait for search to complete
        time.sleep(timeout / 1000 + 2)

        # Get results
        state = slskd.searches.state(search_id)
        if state.get('state') != 'Completed':
            # Wait a bit more
            time.sleep(5)

        responses = slskd.searches.search_responses(search_id)

        if not responses:
            log.warning(f"No results for: {query}")
            return None

        # Find best album folder
        best_match = None
        best_score = 0

        for response in responses:
            username = response.get('username', '')
            files = response.get('files', [])

            if not files:
                continue

            # Group files by directory
            directories = {}
            for f in files:
                filepath = f.get('filename', '')
                if '\\' in filepath:
                    dir_path = '\\'.join(filepath.split('\\')[:-1])
                else:
                    dir_path = '/'.join(filepath.split('/')[:-1])

                if dir_path not in directories:
                    directories[dir_path] = []
                directories[dir_path].append(f)

            # Score each directory
            for dir_path, dir_files in directories.items():
                # Filter to audio files
                audio_files = [f for f in dir_files if any(
                    f.get('filename', '').lower().endswith(ext)
                    for ext in ['.mp3', '.flac', '.m4a', '.ogg', '.wav']
                )]

                if len(audio_files) < min_files:
                    continue

                # Calculate score
                score = 0

                # More files is better (likely complete album)
                score += len(audio_files) * 10

                # Prefer FLAC
                flac_count = sum(1 for f in audio_files if f.get('filename', '').lower().endswith('.flac'))
                score += flac_count * 5

                # Check if artist/album in path
                dir_lower = dir_path.lower()
                if artist.lower() in dir_lower:
                    score += 50
                if album.lower() in dir_lower:
                    score += 50

                # Prefer faster users (check upload speed if available)
                upload_speed = response.get('uploadSpeed', 0)
                if upload_speed > 1000000:  # > 1MB/s
                    score += 20

                # Prefer users with free slots
                if response.get('hasFreeUploadSlot', False):
                    score += 30

                if score > best_score:
                    best_score = score
                    best_match = {
                        'username': username,
                        'directory': dir_path,
                        'files': audio_files,
                        'all_files': dir_files,  # Include cover art etc
                        'score': score
                    }

        # Clean up search
        try:
            slskd.searches.delete(search_id)
        except Exception:
            pass

        if best_match:
            log.info(f"  Found: {best_match['username']} - {len(best_match['files'])} tracks (score: {best_score})")

        return best_match

    except Exception as e:
        log.error(f"Search failed: {e}")
        return None


def download_folder(slskd: slskd_api.SlskdClient, username: str, files: list) -> bool:
    """
    Queue download for all files in a folder.
    Returns True if downloads were queued successfully.
    """
    try:
        # slskd expects a specific format for the files list
        download_files = []
        for f in files:
            download_files.append({
                'filename': f.get('filename'),
                'size': f.get('size', 0)
            })

        slskd.transfers.enqueue(username=username, files=download_files)
        log.info(f"  Queued {len(download_files)} files from {username}")
        return True

    except Exception as e:
        log.error(f"Failed to queue downloads: {e}")
        return False


def main():
    config = load_config()
    downloaded = load_downloaded()

    slskd_config = config.get('slskd', {})
    host = slskd_config.get('host', 'http://slskd:5030')
    api_key = slskd_config.get('api_key')
    url_base = slskd_config.get('url_base', '/')

    if not api_key:
        log.error("Missing slskd.api_key in config")
        return

    search_timeout = slskd_config.get('search_timeout', 15000)
    min_album_tracks = slskd_config.get('min_album_tracks', 3)

    # Connect to slskd
    try:
        slskd = slskd_api.SlskdClient(host, api_key, url_base)
        state = slskd.application.state()
        if not state.get('server', {}).get('isConnected'):
            log.warning("slskd is not connected to Soulseek - downloads may fail")
    except Exception as e:
        log.error(f"Failed to connect to slskd: {e}")
        return

    # Parse wishlist
    items = parse_wishlist()
    if not items:
        log.info("Wishlist is empty")
        return

    log.info(f"Processing {len(items)} wishlist items")

    queued_count = 0

    for item in items:
        key = item['raw']

        if key in downloaded:
            continue

        if item['is_album']:
            # Album search
            result = search_album(
                slskd,
                item['artist'],
                item['title'],
                timeout=search_timeout,
                min_files=min_album_tracks
            )

            if result:
                # Download all files (audio + artwork)
                if download_folder(slskd, result['username'], result['all_files']):
                    downloaded.add(key)
                    save_downloaded(downloaded)
                    queued_count += 1
            else:
                log.warning(f"  No suitable results for album: {item['artist']} - {item['title']}")

        else:
            # Single track search (simpler)
            query = f"{item['artist']} {item['title']}"
            log.info(f"Searching track: {query}")

            try:
                search = slskd.searches.search_text(
                    searchText=query,
                    searchTimeout=search_timeout,
                    filterResponses=True
                )
                search_id = search.get('id')

                time.sleep(search_timeout / 1000 + 2)
                responses = slskd.searches.search_responses(search_id)

                if responses:
                    # Get first good result
                    for response in responses:
                        files = response.get('files', [])
                        audio_files = [f for f in files if any(
                            f.get('filename', '').lower().endswith(ext)
                            for ext in ['.mp3', '.flac', '.m4a', '.ogg']
                        )]

                        if audio_files:
                            # Download first matching file
                            if download_folder(slskd, response['username'], [audio_files[0]]):
                                downloaded.add(key)
                                save_downloaded(downloaded)
                                queued_count += 1
                            break

                try:
                    slskd.searches.delete(search_id)
                except Exception:
                    pass

            except Exception as e:
                log.error(f"Track search failed: {e}")

        # Rate limit between searches
        time.sleep(2)

    if queued_count > 0:
        log.info(f"Queued {queued_count} downloads")
    else:
        log.info("No new downloads queued")


if __name__ == "__main__":
    main()
