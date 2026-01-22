<script setup lang="ts">
import type { SlskdUserStatus } from '@/types';

import { onMounted, ref, watch } from 'vue';
import { useUsers } from '@/composables/useUsers';

import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

import UserStats from '@/components/users/UserStats.vue';
import UserList from '@/components/users/UserList.vue';
import ErrorMessage from '@/components/common/ErrorMessage.vue';

const {
  users,
  stats,
  loading,
  error,
  fetchUsers,
  fetchStats,
  updateUserStatus,
  bulkUpdateStatus,
  deleteUsers,
  exportUsers,
  importUsers,
  setStatusFilter,
  setSearchFilter,
} = useUsers();

const activeTab = ref<'all' | SlskdUserStatus>('all');
const searchQuery = ref('');
const showImportDialog = ref(false);
const importText = ref('');
const importLoading = ref(false);

const loadData = async() => {
  await Promise.all([
    fetchUsers(),
    fetchStats(),
  ]);
};

const handleRefresh = async() => {
  await loadData();
};

const handleTabChange = (value: string | number) => {
  const tab = value as 'all' | SlskdUserStatus;

  activeTab.value = tab;
  setStatusFilter(tab === 'all' ? undefined : tab);
  fetchUsers();
};

const handleSearch = () => {
  setSearchFilter(searchQuery.value || undefined);
  fetchUsers();
};

const handleUpdateStatus = async(id: string, status: SlskdUserStatus) => {
  await updateUserStatus(id, status);
};

const handleBulkUpdate = async(ids: string[], status: SlskdUserStatus) => {
  await bulkUpdateStatus(ids, status);
};

const handleDelete = async(ids: string[]) => {
  await deleteUsers(ids);
};

const handleExport = async() => {
  try {
    const data = await exportUsers();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'resonance-users.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Error handled by store
  }
};

const handleImport = async() => {
  if (!importText.value.trim()) {
    return;
  }

  importLoading.value = true;

  try {
    const data = JSON.parse(importText.value);

    await importUsers(data);
    showImportDialog.value = false;
    importText.value = '';
  } catch(e) {
    console.error('Import failed:', e);
  } finally {
    importLoading.value = false;
  }
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      importText.value = e.target?.result as string || '';
    };
    reader.readAsText(file);
  }
};

let searchTimeout: ReturnType<typeof setTimeout> | undefined;

watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(handleSearch, 300);
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="users-page">
    <header class="users-page__header">
      <div>
        <h1 class="users-page__title">Users</h1>
        <p class="users-page__subtitle">
          Manage Soulseek user reputation for download prioritization.
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="Export"
          icon="pi pi-download"
          @click="handleExport"
          outlined
        />
        <Button
          label="Import"
          icon="pi pi-upload"
          @click="showImportDialog = true"
          outlined
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          @click="handleRefresh"
          :loading="loading"
        />
      </div>
    </header>

    <ErrorMessage
      :error="error"
      :loading="loading"
      @retry="loadData"
    />

    <UserStats :stats="stats" />

    <div class="users-page__search">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchQuery" placeholder="Search users" class="w-full" />
      </IconField>
    </div>

    <Tabs class="users-page__tabs" :value="activeTab" @update:value="handleTabChange">
      <TabList>
        <Tab value="all">All</Tab>
        <Tab value="trusted">Trusted</Tab>
        <Tab value="flagged">Flagged</Tab>
        <Tab value="blocked">Blocked</Tab>
        <Tab value="neutral">Neutral</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="all">
          <UserList
            :users="users"
            :loading="loading"
            @update-status="handleUpdateStatus"
            @bulk-update="handleBulkUpdate"
            @delete="handleDelete"
          />
        </TabPanel>

        <TabPanel value="trusted">
          <UserList
            :users="users"
            :loading="loading"
            @update-status="handleUpdateStatus"
            @bulk-update="handleBulkUpdate"
            @delete="handleDelete"
          />
        </TabPanel>

        <TabPanel value="flagged">
          <UserList
            :users="users"
            :loading="loading"
            @update-status="handleUpdateStatus"
            @bulk-update="handleBulkUpdate"
            @delete="handleDelete"
          />
        </TabPanel>

        <TabPanel value="blocked">
          <UserList
            :users="users"
            :loading="loading"
            @update-status="handleUpdateStatus"
            @bulk-update="handleBulkUpdate"
            @delete="handleDelete"
          />
        </TabPanel>

        <TabPanel value="neutral">
          <UserList
            :users="users"
            :loading="loading"
            @update-status="handleUpdateStatus"
            @bulk-update="handleBulkUpdate"
            @delete="handleDelete"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>

    <Dialog
      v-model:visible="showImportDialog"
      header="Import Users"
      :style="{ width: '500px' }"
      modal
    >
      <div class="import-dialog">
        <p class="mb-3 text-surface-400">
          Import a JSON file with trusted, flagged, and blocked user lists.
        </p>

        <div class="mb-3">
          <input
            type="file"
            accept=".json"
            @change="handleFileUpload"
            class="hidden"
            id="file-upload"
          />
          <label for="file-upload">
            <Button
              as="span"
              label="Choose File"
              icon="pi pi-file"
              outlined
              class="cursor-pointer"
            />
          </label>
        </div>

        <Textarea
          v-model="importText"
          placeholder='{"trusted": ["user1"], "blocked": ["user2"]}'
          rows="8"
          class="w-full"
        />
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showImportDialog = false"
        />
        <Button
          label="Import"
          icon="pi pi-check"
          :loading="importLoading"
          :disabled="!importText.trim()"
          @click="handleImport"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.users-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.users-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.users-page__title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--r-text-primary);
  margin: 0;
}

.users-page__subtitle {
  font-size: 1rem;
  color: var(--surface-300);
  margin: 0.5rem 0 0 0;
}

.users-page__search {
  margin-bottom: 1rem;
  max-width: 400px;
}

.users-page__tabs {
  margin-top: 1rem;
}

.import-dialog .hidden {
  display: none;
}

@media (max-width: 768px) {
  .users-page {
    padding: 1rem;
  }

  .users-page__header {
    flex-direction: column;
    gap: 1rem;
  }

  .users-page__title {
    font-size: 1.75rem;
  }
}
</style>
