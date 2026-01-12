<script setup lang="ts">
import type { QueueFilters } from '../../types'

const props = defineProps<{
  modelValue: QueueFilters
}>()

const emit = defineEmits<{
  'update:modelValue': [value: QueueFilters]
}>()

function updateFilter<K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function toggleOrder() {
  updateFilter('order', props.modelValue.order === 'asc' ? 'desc' : 'asc')
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
  >
    <div class="flex flex-wrap items-center gap-4">
      <!-- Source Filter -->
      <div class="flex items-center gap-2">
        <label
          for="source-filter"
          class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Source
        </label>
        <select
          id="source-filter"
          :value="modelValue.source"
          @change="updateFilter('source', ($event.target as HTMLSelectElement).value as QueueFilters['source'])"
          class="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Sources</option>
          <option value="listenbrainz">ListenBrainz</option>
          <option value="catalog">Catalog</option>
        </select>
      </div>

      <!-- Sort -->
      <div class="flex items-center gap-2">
        <label
          for="sort-filter"
          class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Sort by
        </label>
        <select
          id="sort-filter"
          :value="modelValue.sort"
          @change="updateFilter('sort', ($event.target as HTMLSelectElement).value as QueueFilters['sort'])"
          class="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="added_at">Date Added</option>
          <option value="score">Score</option>
          <option value="artist">Artist</option>
          <option value="year">Year</option>
        </select>
      </div>

      <!-- Order Toggle -->
      <button
        @click="toggleOrder"
        class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <svg
          v-if="modelValue.order === 'desc'"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <svg
          v-else
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
          />
        </svg>
        {{ modelValue.order === 'desc' ? 'Descending' : 'Ascending' }}
      </button>
    </div>
  </div>
</template>
