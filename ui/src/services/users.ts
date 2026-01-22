import type {
  SlskdUser,
  UserStats,
  UserFilters,
  UserExport,
  UserImport,
  UserImportResponse,
  UpdateUserRequest,
  BulkUpdateRequest,
  PaginatedResponse,
} from '@/types';

import client from './api';

export async function getUsers(filters: UserFilters): Promise<PaginatedResponse<SlskdUser>> {
  const params: Record<string, string | number> = {
    limit:  filters.limit,
    offset: filters.offset,
  };

  if (filters.status) {
    params.status = filters.status;
  }

  if (filters.search) {
    params.search = filters.search;
  }

  const response = await client.get<PaginatedResponse<SlskdUser>>('/users', { params });

  return response.data;
}

export async function getStats(): Promise<UserStats> {
  const response = await client.get<UserStats>('/users/stats');

  return response.data;
}

export async function getUser(id: string): Promise<SlskdUser> {
  const response = await client.get<SlskdUser>(`/users/${ id }`);

  return response.data;
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<SlskdUser> {
  const response = await client.put<SlskdUser>(`/users/${ id }`, data);

  return response.data;
}

export async function bulkUpdate(data: BulkUpdateRequest): Promise<{ count: number }> {
  const response = await client.put<{ count: number }>('/users/bulk', data);

  return response.data;
}

export async function deleteUsers(ids: string[]): Promise<{ count: number }> {
  const response = await client.delete<{ count: number }>('/users', { data: { ids } });

  return response.data;
}

export async function exportUsers(): Promise<UserExport> {
  const response = await client.post<UserExport>('/users/export');

  return response.data;
}

export async function importUsers(data: UserImport): Promise<UserImportResponse> {
  const response = await client.post<UserImportResponse>('/users/import', data);

  return response.data;
}
