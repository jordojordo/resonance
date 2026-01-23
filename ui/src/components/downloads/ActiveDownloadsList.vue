<script setup lang="ts">
import type { ActiveDownload } from '@/types';

import { ref } from 'vue';
import { formatRelativeTime } from '@/utils/formatters';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';

import DownloadProgress from './DownloadProgress.vue';
import QualityBadge from './QualityBadge.vue';
import EmptyState from '@/components/common/EmptyState.vue';

interface Props {
  downloads: ActiveDownload[];
  loading?:  boolean;
}

interface Emits {
  (e: 'delete', ids: string[]): void;
  (e: 'select', download: ActiveDownload): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedDownloads = ref<ActiveDownload[]>([]);

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined> = {
    downloading:       'success',
    searching:         'info',
    queued:            'warning',
    deferred:          'contrast',
    pending:           'secondary',
    pending_selection: 'warning',
  };

  return severityMap[status] || 'secondary';
};

const getStatusLabel = (status: string) => {
  if (status === 'pending_selection') {
    return 'Select Source';
  }

  return status;
};

const handleDelete = () => {
  const ids = selectedDownloads.value.map((d) => d.id);

  if (ids.length) {
    emit('delete', ids);
    selectedDownloads.value = [];
  }
};

const handleSelect = (download: ActiveDownload) => {
  emit('select', download);
};

function formatTimeRemaining(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) {
    return null;
  }

  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${ hours }h ${ minutes }m`;
  }

  return `${ minutes }m`;
}
</script>

<template>
  <div class="active-downloads-list">
    <div class="flex justify-content-end mb-3" v-if="downloads.length">
      <Button
        label="Delete Selected"
        icon="pi pi-trash"
        severity="danger"
        :disabled="!selectedDownloads.length"
        @click="handleDelete"
      />
    </div>

    <DataTable
      v-model:selection="selectedDownloads"
      :value="downloads"
      :loading="loading"
      striped-rows
      class="downloads-table"
      selection-mode="multiple"
      data-key="id"
    >
      <template #empty>
        <EmptyState
          icon="pi-cloud-download"
          title="No active downloads"
          message="Approved items will appear here when downloading"
        />
      </template>
      <Column selection-mode="multiple" header-style="width: 3rem"></Column>

      <Column field="artist" header="Artist" sortable>
        <template #body="{ data }">
          <div>
            <div class="font-semibold">{{ data.artist }}</div>
            <div class="text-sm text-surface-400">{{ data.album }}</div>
          </div>
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <div class="status-cell">
            <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
            <span v-if="data.status === 'pending_selection' && data.selectionExpiresAt" class="expires-in">
              {{ formatTimeRemaining(data.selectionExpiresAt) }}
            </span>
          </div>
        </template>
      </Column>

      <Column header="Quality" style="min-width: 120px">
        <template #body="{ data }">
          <QualityBadge v-if="data.quality" :quality="data.quality" />
          <span v-else class="text-surface-400 text-sm">-</span>
        </template>
      </Column>

      <Column header="Progress" style="min-width: 300px">
        <template #body="{ data }">
          <DownloadProgress v-if="data.progress" :progress="data.progress" />
          <span v-else class="text-surface-400 text-sm">Waiting...</span>
        </template>
      </Column>

      <Column field="slskdUsername" header="Source" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ data.slskdUsername || 'N/A' }}</span>
        </template>
      </Column>

      <Column field="queuedAt" header="Queued" sortable>
        <template #body="{ data }">
          <span class="text-sm text-surface-400">{{ formatRelativeTime(data.queuedAt) }}</span>
        </template>
      </Column>

      <Column header="Actions">
        <template #body="{ data }">
          <div class="actions-cell">
            <Button
              v-if="data.status === 'pending_selection'"
              icon="pi pi-list"
              severity="info"
              size="small"
              v-tooltip.top="'Select download source'"
              @click="handleSelect(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              outlined
              @click="emit('delete', [data.id])"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.active-downloads-list {
  width: 100%;
}

.status-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.expires-in {
  font-size: 0.75rem;
  color: var(--surface-400);
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
}
</style>
