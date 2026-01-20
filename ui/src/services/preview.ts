import type { PreviewResponse } from '@/types/player';

import client from './api';

export interface GetPreviewParams {
  artist: string;
  track:  string;
}

export async function getPreview(params: GetPreviewParams): Promise<PreviewResponse> {
  const response = await client.get<PreviewResponse>('/preview', { params });

  return response.data;
}
