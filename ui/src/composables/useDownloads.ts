import type { DownloadFilters } from '@/types';

import { computed } from 'vue';
import { useDownloadsStore } from '@/stores/downloads';

export function useDownloads() {
  const store = useDownloadsStore();

  const activeDownloads = computed(() => store.activeDownloads);
  const activeTotal = computed(() => store.activeTotal);
  const completedDownloads = computed(() => store.completedDownloads);
  const completedTotal = computed(() => store.completedTotal);
  const failedDownloads = computed(() => store.failedDownloads);
  const failedTotal = computed(() => store.failedTotal);
  const stats = computed(() => store.stats);
  const statsError = computed(() => store.statsError);
  const loading = computed(() => store.loading);
  const error = computed(() => store.error);
  const filters = computed(() => store.filters);

  const selectedTaskId = computed(() => store.selectedTaskId);
  const selectionModalVisible = computed(() => store.selectionModalVisible);
  const selectionLoading = computed(() => store.selectionLoading);

  const hasMoreCompleted = computed(() => store.hasMoreCompleted);
  const hasMoreFailed = computed(() => store.hasMoreFailed);

  async function fetchActive() {
    return store.fetchActive();
  }

  async function fetchCompleted(append = false) {
    return store.fetchCompleted(append);
  }

  async function fetchFailed(append = false) {
    return store.fetchFailed(append);
  }

  async function fetchStats() {
    return store.fetchStats();
  }

  async function retryFailed(ids: string[]) {
    return store.retryFailed(ids);
  }

  async function deleteDownloads(ids: string[]) {
    return store.deleteDownloads(ids);
  }

  function updateFilters(filters: Partial<DownloadFilters>) {
    store.setFilters(filters);
  }

  function loadMoreCompleted() {
    return store.loadMoreCompleted();
  }

  function loadMoreFailed() {
    return store.loadMoreFailed();
  }

  function reset() {
    store.reset();
  }

  function openSelectionModal(taskId: string) {
    store.openSelectionModal(taskId);
  }

  function closeSelectionModal() {
    store.closeSelectionModal();
  }

  async function selectResult(taskId: string, username: string, directory?: string) {
    return store.selectResult(taskId, username, directory);
  }

  async function skipResult(taskId: string, username: string) {
    return store.skipResult(taskId, username);
  }

  async function retrySearchForTask(taskId: string, query?: string) {
    return store.retrySearchForTask(taskId, query);
  }

  async function autoSelectForTask(taskId: string) {
    return store.autoSelectForTask(taskId);
  }

  return {
    activeDownloads,
    activeTotal,
    completedDownloads,
    completedTotal,
    failedDownloads,
    failedTotal,
    stats,
    statsError,
    loading,
    error,
    filters,

    selectedTaskId,
    selectionModalVisible,
    selectionLoading,

    hasMoreCompleted,
    hasMoreFailed,

    fetchActive,
    fetchCompleted,
    fetchFailed,
    fetchStats,
    retryFailed,
    deleteDownloads,
    updateFilters,
    loadMoreCompleted,
    loadMoreFailed,
    reset,

    openSelectionModal,
    closeSelectionModal,
    selectResult,
    skipResult,
    retrySearchForTask,
    autoSelectForTask,
  };
}
