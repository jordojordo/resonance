<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useQueueStore } from '../stores/queue'
import QueueFilters from '../components/queue/QueueFilters.vue'
import QueueList from '../components/queue/QueueList.vue'

const queueStore = useQueueStore()

onMounted(() => {
  queueStore.fetchPending()
})

watch(
  () => [queueStore.filters.source, queueStore.filters.sort, queueStore.filters.order],
  () => {
    queueStore.reset()
    queueStore.fetchPending()
  }
)

async function handleApprove(mbids: string[]) {
  try {
    await queueStore.approve(mbids)
  } catch {
    // Error is already handled in the store
  }
}

async function handleReject(mbids: string[]) {
  try {
    await queueStore.reject(mbids)
  } catch {
    // Error is already handled in the store
  }
}

function loadMore() {
  queueStore.loadMore()
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Queue</h1>
      <p class="mt-1 text-gray-600 dark:text-gray-400">
        Review and manage pending music recommendations
      </p>
    </div>

    <!-- Error Message -->
    <div
      v-if="queueStore.error"
      class="mb-6 p-4 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-xl"
    >
      {{ queueStore.error }}
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <QueueFilters
        :model-value="queueStore.filters"
        @update:model-value="queueStore.setFilters($event)"
      />
    </div>

    <!-- Total Count -->
    <div class="mb-4 text-sm text-gray-600 dark:text-gray-400">
      {{ queueStore.total }} pending item{{ queueStore.total === 1 ? '' : 's' }}
    </div>

    <!-- Queue List -->
    <QueueList
      :items="queueStore.items"
      :loading="queueStore.loading"
      @approve="handleApprove"
      @reject="handleReject"
    />

    <!-- Load More Button -->
    <div v-if="queueStore.hasMore && !queueStore.loading" class="mt-6 text-center">
      <button
        @click="loadMore"
        class="px-6 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
      >
        Load More
      </button>
    </div>
  </div>
</template>
