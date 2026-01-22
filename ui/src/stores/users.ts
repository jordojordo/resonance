import type {
  SlskdUser,
  SlskdUserStatus,
  UserStats,
  UserFilters,
  UserExport,
  UserImport,
} from '@/types';

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import * as usersApi from '@/services/users';
import { useToast } from '@/composables/useToast';

export const useUsersStore = defineStore('users', () => {
  const { showSuccess, showError } = useToast();

  const users = ref<SlskdUser[]>([]);
  const total = ref(0);
  const stats = ref<UserStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<UserFilters>({
    limit:  50,
    offset: 0,
  });

  const hasMore = computed(() => users.value.length < total.value);

  async function fetchUsers(append = false) {
    loading.value = true;
    error.value = null;

    try {
      const requestFilters = append? { ...filters.value, offset: users.value.length }: filters.value;

      const response = await usersApi.getUsers(requestFilters);

      if (append) {
        users.value = [...users.value, ...response.items];
      } else {
        users.value = response.items;
      }

      total.value = response.total;
    } catch(e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch users';
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats() {
    try {
      stats.value = await usersApi.getStats();
    } catch(e) {
      console.error('Failed to fetch user stats:', e);
    }
  }

  async function updateUserStatus(id: string, status: SlskdUserStatus, notes?: string) {
    loading.value = true;
    error.value = null;

    try {
      const updatedUser = await usersApi.updateUser(id, { status, notes });

      // Update the user in the list
      const index = users.value.findIndex((u) => u.id === id);

      if (index !== -1) {
        users.value[index] = updatedUser;
      }

      showSuccess('User updated', `User status changed to ${ status }`);

      // Refresh stats
      await fetchStats();
    } catch(e) {
      error.value = e instanceof Error ? e.message : 'Failed to update user';
      showError('Failed to update user');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function bulkUpdateStatus(ids: string[], status: SlskdUserStatus) {
    loading.value = true;
    error.value = null;

    try {
      const result = await usersApi.bulkUpdate({ ids, status });

      showSuccess('Users updated', `${ result.count } user(s) updated to ${ status }`);

      // Refresh the list and stats
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch(e) {
      error.value = e instanceof Error ? e.message : 'Failed to bulk update users';
      showError('Failed to update users');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUserRecords(ids: string[]) {
    loading.value = true;
    error.value = null;

    try {
      const result = await usersApi.deleteUsers(ids);

      // Remove deleted users from the list
      users.value = users.value.filter((u) => !ids.includes(u.id));
      total.value = Math.max(0, total.value - result.count);

      showSuccess('Users deleted', `${ result.count } user(s) removed`);

      // Refresh stats
      await fetchStats();
    } catch(e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete users';
      showError('Failed to delete users');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function exportUserLists(): Promise<UserExport> {
    try {
      const data = await usersApi.exportUsers();

      showSuccess('Export complete', 'User lists exported successfully');

      return data;
    } catch(e) {
      showError('Failed to export users');
      throw e;
    }
  }

  async function importUserLists(data: UserImport) {
    loading.value = true;
    error.value = null;

    try {
      const result = await usersApi.importUsers(data);

      showSuccess('Import complete', result.message);

      // Refresh the list and stats
      await Promise.all([fetchUsers(), fetchStats()]);

      return result;
    } catch(e) {
      error.value = e instanceof Error ? e.message : 'Failed to import users';
      showError('Failed to import users');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: Partial<UserFilters>) {
    filters.value = {
      ...filters.value,
      ...newFilters,
      offset: 0,
    };
  }

  function setStatusFilter(status?: SlskdUserStatus) {
    setFilters({ status });
  }

  function setSearchFilter(search?: string) {
    setFilters({ search });
  }

  function loadMore() {
    return fetchUsers(true);
  }

  function reset() {
    users.value = [];
    total.value = 0;
    stats.value = null;
    error.value = null;
    filters.value = {
      limit:  50,
      offset: 0,
    };
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
    deleteUserRecords,
    exportUserLists,
    importUserLists,
    setFilters,
    setStatusFilter,
    setSearchFilter,
    loadMore,
    reset,
  };
});
