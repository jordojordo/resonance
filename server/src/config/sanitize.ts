import type { Config } from '@server/config/schemas';

import { getNestedValue, setNestedValue } from '@server/utils/objects';

/**
 * Secret fields that should be sanitized in API responses.
 * Format: 'section.field' or 'section.nested.field'
 */
const SECRET_PATHS: string[] = [
  'listenbrainz.token',
  'slskd.api_key',
  'catalog_discovery.subsonic.password',
  'catalog_discovery.navidrome.password', // deprecated, kept for back-compat
  'catalog_discovery.lastfm.api_key',
  'preview.spotify.client_id',
  'preview.spotify.client_secret',
  'ui.auth.password',
  'ui.auth.api_key',
];

/**
 * Replace secret values at the given paths with `{ configured: boolean }`.
 */
function redactSecrets(obj: Record<string, unknown>, paths: string[]): void {
  for (const secretPath of paths) {
    const parts = secretPath.split('.');
    const value = getNestedValue(obj, parts);

    if (value !== undefined) {
      setNestedValue(obj, parts, { configured: Boolean(value) });
    }
  }
}

/**
 * Sanitize config for API response by replacing secret values with { configured: boolean }
 */
export function sanitizeConfigForApi(config: Config): Record<string, unknown> {
  const sanitized = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  redactSecrets(sanitized, SECRET_PATHS);

  return sanitized;
}

/**
 * Sanitize a single section for API response
 */
export function sanitizeSectionForApi(
  section: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const sanitized = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const sectionPrefix = `${ section }.`;
  const relativePaths = SECRET_PATHS
    .filter((p) => p.startsWith(sectionPrefix))
    .map((p) => p.slice(sectionPrefix.length));

  redactSecrets(sanitized, relativePaths);

  return sanitized;
}
