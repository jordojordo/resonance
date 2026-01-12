<script setup lang="ts">
import { ref, computed } from 'vue'
import QueueItemComponent from './QueueItem.vue'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import type { QueueItem } from '../../types'

const props = defineProps<{
  items: QueueItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  approve: [mbids: string[]]
  reject: [mbids: string[]]
}>()

const selectedMbids = ref<Set<string>>(new Set())

const hasSelection = computed(() => selectedMbids.value.size > 0)
const allSelected = computed(
  () => props.items.length > 0 && selectedMbids.value.size === props.items.length
)

function toggleSelect(mbid: string) {
  if (selectedMbids.value.has(mbid)) {
    selectedMbids.value.delete(mbid)
  } else {
    selectedMbids.value.add(mbid)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedMbids.value.clear()
  } else {
    selectedMbids.value = new Set(props.items.map((item) => item.mbid))
  }
}

function approveSelected() {
  emit('approve', Array.from(selectedMbids.value))
  selectedMbids.value.clear()
}

function rejectSelected() {
  emit('reject', Array.from(selectedMbids.value))
  selectedMbids.value.clear()
}

function approveItem(mbid: string) {
  emit('approve', [mbid])
  selectedMbids.value.delete(mbid)
}

function rejectItem(mbid: string) {
  emit('reject', [mbid])
  selectedMbids.value.delete(mbid)
}
</script>

<template>
  <div>
    <!-- Bulk Actions -->
    <div
      v-if="items.length > 0"
      class="mb-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3"
    >
      <div class="flex items-center gap-3">
        <input
          type="checkbox"
          :checked="allSelected"
          :indeterminate="hasSelection && !allSelected"
          @change="toggleSelectAll"
          class="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
        />
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ selectedMbids.size }} of {{ items.length }} selected
        </span>
      </div>

      <div v-if="hasSelection" class="flex items-center gap-2">
        <button
          @click="approveSelected"
          class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          Approve Selected
        </button>
        <button
          @click="rejectSelected"
          class="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
        >
          Reject Selected
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && items.length === 0" class="py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="items.length === 0"
      class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center"
    >
      <svg
        class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No pending items
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        The queue is empty. Check back later for new recommendations.
      </p>
    </div>

    <!-- Items List -->
    <div v-else class="space-y-3">
      <QueueItemComponent
        v-for="item in items"
        :key="item.mbid"
        :item="item"
        :selected="selectedMbids.has(item.mbid)"
        @select="toggleSelect(item.mbid)"
        @approve="approveItem(item.mbid)"
        @reject="rejectItem(item.mbid)"
      />
    </div>

    <!-- Loading More Indicator -->
    <div v-if="loading && items.length > 0" class="py-6">
      <LoadingSpinner />
    </div>
  </div>
</template>
