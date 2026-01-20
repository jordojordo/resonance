import {
  describe, it, expect, beforeEach, afterEach, vi 
} from 'vitest';
import nock from 'nock';

// Mock the config module before importing AlbumTrackSelector
vi.mock('@server/config/settings', () => ({
  getConfig: () => ({
    preview: {
      enabled: true,
      spotify: {
        enabled:       false,
        client_id:     '',
        client_secret: '',
      },
    },
  }),
  getDataPath: () => '/tmp',
}));

// Mock the logger to avoid file system operations
vi.mock('@server/config/logger', () => ({
  default: {
    debug: vi.fn(),
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
  },
}));

import { AlbumTrackSelector } from './AlbumTrackSelector';

describe('AlbumTrackSelector', () => {
  let selector: AlbumTrackSelector;

  beforeEach(() => {
    nock.cleanAll();
    selector = new AlbumTrackSelector();
  });

  afterEach(() => {
    nock.cleanAll();
    selector.clearCache();
  });

  describe('selectTrack', () => {
    it('uses sourceTrack when provided', async() => {
      const result = await selector.selectTrack({
        artist:      'Dream Theater',
        album:       'Images and Words',
        sourceTrack: 'Pull Me Under',
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Pull Me Under');
      expect(result!.artist).toBe('Dream Theater');
      expect(result!.previewUrl).toBeNull();
      expect(result!.source).toBe('musicbrainz');
    });

    it('selects track from Deezer when sourceTrack not provided', async() => {
      // Mock Deezer album search
      nock('https://api.deezer.com')
        .get('/search/album')
        .query({ q: 'artist:"Dream Theater" album:"Images and Words"' })
        .reply(200, {
          data:  [{
            id: 12345, title: 'Images and Words', artist: { id: 1, name: 'Dream Theater' } 
          }],
          total: 1,
        });

      // Mock Deezer album tracks
      nock('https://api.deezer.com')
        .get('/album/12345/tracks')
        .reply(200, {
          data: [
            {
              id: 1, title: 'Pull Me Under', preview: 'https://deezer.com/preview/1', artist: { id: 1, name: 'Dream Theater' }, duration: 300, track_position: 1 
            },
            {
              id: 2, title: 'Another Day', preview: 'https://deezer.com/preview/2', artist: { id: 1, name: 'Dream Theater' }, duration: 240, track_position: 2 
            },
          ],
          total: 2,
        });

      const result = await selector.selectTrack({
        artist: 'Dream Theater',
        album:  'Images and Words',
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Pull Me Under');
      expect(result!.artist).toBe('Dream Theater');
      expect(result!.previewUrl).toBe('https://deezer.com/preview/1');
      expect(result!.source).toBe('deezer');
    });

    it('falls back to MusicBrainz when Deezer fails', async() => {
      // Mock Deezer album search - not found
      nock('https://api.deezer.com')
        .get('/search/album')
        .query({ q: 'artist:"Obscure Artist" album:"Rare Album"' })
        .reply(200, { data: [], total: 0 });

      nock('https://api.deezer.com')
        .get('/search/album')
        .query({ q: 'Obscure Artist Rare Album' })
        .reply(200, { data: [], total: 0 });

      // Mock MusicBrainz release lookup
      nock('https://musicbrainz.org')
        .get('/ws/2/release')
        .query({
          'release-group': 'abc123-mbid',
          'limit':         1,
          'fmt':           'json',
        })
        .reply(200, { releases: [{ id: 'release-id' }] });

      nock('https://musicbrainz.org')
        .get('/ws/2/release/release-id')
        .query({ inc: 'recordings', fmt: 'json' })
        .reply(200, {
          media: [{
            tracks: [
              { title: 'Hidden Gem', position: 1 },
              { title: 'Another Track', position: 2 },
            ],
          }],
        });

      const result = await selector.selectTrack({
        artist: 'Obscure Artist',
        album:  'Rare Album',
        mbid:   'abc123-mbid',
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Hidden Gem');
      expect(result!.source).toBe('musicbrainz');
      expect(result!.previewUrl).toBeNull();
    });

    it('returns null when no track is found', async() => {
      // Mock Deezer album search - not found
      nock('https://api.deezer.com')
        .get('/search/album')
        .query({ q: 'artist:"Unknown Artist" album:"Unknown Album"' })
        .reply(200, { data: [], total: 0 });

      nock('https://api.deezer.com')
        .get('/search/album')
        .query({ q: 'Unknown Artist Unknown Album' })
        .reply(200, { data: [], total: 0 });

      const result = await selector.selectTrack({
        artist: 'Unknown Artist',
        album:  'Unknown Album',
      });

      expect(result).toBeNull();
    });

    it('caches results', async() => {
      // Mock Deezer album search
      const deezerScope = nock('https://api.deezer.com')
        .get('/search/album')
        .query({ q: 'artist:"Cached Artist" album:"Cached Album"' })
        .reply(200, {
          data:  [{
            id: 99999, title: 'Cached Album', artist: { id: 1, name: 'Cached Artist' } 
          }],
          total: 1,
        });

      // Mock Deezer album tracks
      const tracksScope = nock('https://api.deezer.com')
        .get('/album/99999/tracks')
        .reply(200, {
          data: [
            {
              id: 1, title: 'Cached Track', preview: 'https://deezer.com/cached', artist: { id: 1, name: 'Cached Artist' }, duration: 200, track_position: 1 
            },
          ],
          total: 1,
        });

      // First call
      const result1 = await selector.selectTrack({
        artist: 'Cached Artist',
        album:  'Cached Album',
      });

      // Second call (should be cached)
      const result2 = await selector.selectTrack({
        artist: 'Cached Artist',
        album:  'Cached Album',
      });

      expect(result1).toEqual(result2);
      expect(deezerScope.isDone()).toBe(true);
      expect(tracksScope.isDone()).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('clears the cache', async() => {
      // First call with sourceTrack
      await selector.selectTrack({
        artist:      'Test',
        album:       'Test Album',
        sourceTrack: 'Track 1',
      });

      selector.clearCache();

      // After clearing, new call should work
      const result = await selector.selectTrack({
        artist:      'Test',
        album:       'Test Album',
        sourceTrack: 'Track 2',
      });

      expect(result!.title).toBe('Track 2');
    });
  });
});
