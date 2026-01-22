<script setup lang="ts">
import type { SlskdUser, SlskdUserStatus } from '@/types';

import { ref } from 'vue';
import { formatRelativeTime, formatBytes, formatSpeed } from '@/utils/formatters';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';

import EmptyState from '@/components/common/EmptyState.vue';
import UserStatusBadge from './UserStatusBadge.vue';
import UserActions from './UserActions.vue';

interface Props {
  users:    SlskdUser[];
  loading?: boolean;
}

interface Emits {
  (e: 'update-status', id: string, status: SlskdUserStatus): void;
  (e: 'delete', ids: string[]): void;
  (e: 'bulk-update', ids: string[], status: SlskdUserStatus): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedUsers = ref<SlskdUser[]>([]);

const handleBulkUpdate = (status: SlskdUserStatus) => {
  const ids = selectedUsers.value.map((u) => u.id);

  if (ids.length) {
    emit('bulk-update', ids, status);
    selectedUsers.value = [];
  }
};

const handleDelete = () => {
  const ids = selectedUsers.value.map((u) => u.id);

  if (ids.length) {
    emit('delete', ids);
    selectedUsers.value = [];
  }
};

const handleUpdateStatus = (id: string, status: SlskdUserStatus) => {
  emit('update-status', id, status);
};

const handleDeleteSingle = (id: string) => {
  emit('delete', [id]);
};
</script>

<template>
  <div class="user-list">
    <div class="flex justify-content-end gap-2 mb-3" v-if="users.length">
      <Button
        label="Trust"
        icon="pi pi-check"
        severity="success"
        size="small"
        :disabled="!selectedUsers.length"
        @click="handleBulkUpdate('trusted')"
      />
      <Button
        label="Flag"
        icon="pi pi-flag"
        severity="warn"
        size="small"
        :disabled="!selectedUsers.length"
        @click="handleBulkUpdate('flagged')"
      />
      <Button
        label="Block"
        icon="pi pi-ban"
        severity="danger"
        size="small"
        :disabled="!selectedUsers.length"
        @click="handleBulkUpdate('blocked')"
      />
      <Button
        label="Delete"
        icon="pi pi-trash"
        severity="danger"
        outlined
        size="small"
        :disabled="!selectedUsers.length"
        @click="handleDelete"
      />
    </div>

    <DataTable
      v-model:selection="selectedUsers"
      :value="users"
      :loading="loading"
      striped-rows
      class="users-table"
      selection-mode="multiple"
      data-key="id"
    >
      <template #empty>
        <EmptyState
          icon="pi-users"
          title="No users found"
          message="Users will appear here as downloads are processed"
        />
      </template>

      <Column selection-mode="multiple" header-style="width: 3rem"></Column>

      <Column field="username" header="Username" sortable>
        <template #body="{ data }">
          <span class="font-semibold">{{ data.username }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <UserStatusBadge :status="data.status" />
        </template>
      </Column>

      <Column field="successCount" header="Success" sortable>
        <template #body="{ data }">
          <span class="text-green-500 font-semibold">{{ data.successCount }}</span>
        </template>
      </Column>

      <Column field="failureCount" header="Failures" sortable>
        <template #body="{ data }">
          <span :class="{ 'text-red-500 font-semibold': data.failureCount > 0 }">
            {{ data.failureCount }}
          </span>
        </template>
      </Column>

      <Column field="totalBytes" header="Downloaded" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ formatBytes(data.totalBytes) }}</span>
        </template>
      </Column>

      <Column field="averageSpeed" header="Avg Speed" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ formatSpeed(data.averageSpeed) }}</span>
        </template>
      </Column>

      <Column field="qualityScore" header="Quality" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ data.qualityScore }}/100</span>
        </template>
      </Column>

      <Column field="lastSeenAt" header="Last Seen" sortable>
        <template #body="{ data }">
          <span class="text-sm text-surface-400">{{ formatRelativeTime(data.lastSeenAt) }}</span>
        </template>
      </Column>

      <Column header="Actions">
        <template #body="{ data }">
          <UserActions
            :user="data"
            @update-status="handleUpdateStatus"
            @delete="handleDeleteSingle"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.user-list {
  width: 100%;
}
</style>
