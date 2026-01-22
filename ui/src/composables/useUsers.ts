import type { SlskdUserStatus, UserFilters, UserImport } from '@/types';

import { computed } from 'vue';
import { useUsersStore } from '@/stores/users';

export function useUsers() {
  const store = useUsersStore();

  const users = computed(() => store.users);
  const total = computed(() => store.total);
  const stats = computed(() => store.stats);
  const loading = computed(() => store.loading);
  const error = computed(() => store.error);
  const filters = computed(() => store.filters);
  const hasMore = computed(() => store.hasMore);

  async function fetchUsers(append = false) {
    return store.fetchUsers(append);
  }

  async function fetchStats() {
    return store.fetchStats();
  }

  async function updateUserStatus(id: string, status: SlskdUserStatus, notes?: string) {
    return store.updateUserStatus(id, status, notes);
  }

  async function bulkUpdateStatus(ids: string[], status: SlskdUserStatus) {
    return store.bulkUpdateStatus(ids, status);
  }

  async function deleteUsers(ids: string[]) {
    return store.deleteUserRecords(ids);
  }

  async function exportUsers() {
    return store.exportUserLists();
  }

  async function importUsers(data: UserImport) {
    return store.importUserLists(data);
  }

  function setFilters(newFilters: Partial<UserFilters>) {
    store.setFilters(newFilters);
  }

  function setStatusFilter(status?: SlskdUserStatus) {
    store.setStatusFilter(status);
  }

  function setSearchFilter(search?: string) {
    store.setSearchFilter(search);
  }

  function loadMore() {
    return store.loadMore();
  }

  function reset() {
    store.reset();
  }

  return {
    users,
    total,
    stats,
    loading,
    error,
    filters,
    hasMore,

    fetchUsers,
    fetchStats,
    updateUserStatus,
    bulkUpdateStatus,
    deleteUsers,
    exportUsers,
    importUsers,
    setFilters,
    setStatusFilter,
    setSearchFilter,
    loadMore,
    reset,
  };
}
