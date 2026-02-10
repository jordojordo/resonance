import fs from 'fs';

import {
  joinDownloadsPath,
  slskdDirectoryToRelativeDownloadPath,
  slskdPathBasename,
  toSafeRelativePath
} from '@server/utils/slskdPaths';

export function sanitizeUsernameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[/\\]/g, '-').trim();

  return sanitized.length ? sanitized : null;
}

export async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.promises.access(candidatePath, fs.constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the local download path for a completed task by trying
 * several candidate paths derived from slskd metadata.
 */
export async function resolveDownloadPath(params: {
  downloadsRoot:   string;
  downloadPath?:   string;
  slskdDirectory?: string;
  slskdUsername?:  string;
}): Promise<string | undefined> {
  const {
    downloadsRoot, downloadPath, slskdDirectory, slskdUsername 
  } = params;
  const directoryRel = slskdDirectoryToRelativeDownloadPath(slskdDirectory);
  const leaf = slskdPathBasename(slskdDirectory);
  const username = sanitizeUsernameSegment(slskdUsername);

  const candidates = new Set<string>();

  if (typeof downloadPath === 'string') {
    candidates.add(downloadPath);
  }

  if (username && directoryRel) {
    candidates.add(`${ username }/${ directoryRel }`);
  }

  if (username && leaf) {
    candidates.add(`${ username }/${ leaf }`);
  }

  if (directoryRel) {
    candidates.add(directoryRel);
  }

  if (leaf) {
    candidates.add(leaf);
  }

  for (const candidate of candidates) {
    const safeRel = toSafeRelativePath(candidate);

    if (!safeRel) {
      continue;
    }

    const absPath = joinDownloadsPath(downloadsRoot, safeRel);

    if (await pathExists(absPath)) {
      return safeRel;
    }
  }

  return undefined;
}
