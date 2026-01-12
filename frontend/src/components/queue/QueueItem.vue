<script setup lang="ts">
import type { QueueItem } from '../../types'

defineProps<{
  item: QueueItem
  selected: boolean
}>()

const emit = defineEmits<{
  approve: []
  reject: []
  select: []
}>()

function getDefaultCover() {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"%3E%3Cpath stroke="%236b7280" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/%3E%3C/svg%3E'
}
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all',
      selected
        ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
    ]"
  >
    <div class="p-4 flex gap-4">
      <!-- Checkbox -->
      <div class="flex items-start pt-1">
        <input
          type="checkbox"
          :checked="selected"
          @change="emit('select')"
          class="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
        />
      </div>

      <!-- Cover Art -->
      <div class="flex-shrink-0">
        <img
          :src="item.cover_url || getDefaultCover()"
          :alt="`${item.album || item.title} cover`"
          class="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
          @error="($event.target as HTMLImageElement).src = getDefaultCover()"
        />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">
              {{ item.album || item.title }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
              {{ item.artist }}
            </p>
          </div>

          <!-- Source Badge -->
          <span
            :class="[
              'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full',
              item.source === 'listenbrainz'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
            ]"
          >
            {{ item.source === 'listenbrainz' ? 'ListenBrainz' : 'Catalog' }}
          </span>
        </div>

        <!-- Metadata Row -->
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span v-if="item.year" class="text-gray-500 dark:text-gray-500">
            {{ item.year }}
          </span>
          <span
            v-if="item.score !== undefined"
            class="text-gray-500 dark:text-gray-500"
          >
            Score: {{ item.score.toFixed(1) }}
          </span>
          <span class="text-gray-400 dark:text-gray-600 capitalize">
            {{ item.type }}
          </span>
        </div>

        <!-- Similar To -->
        <div
          v-if="item.similar_to && item.similar_to.length > 0"
          class="mt-2 flex items-center gap-2"
        >
          <span class="text-xs text-gray-400 dark:text-gray-500">Similar to:</span>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="artist in item.similar_to.slice(0, 3)"
              :key="artist"
              class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
            >
              {{ artist }}
            </span>
            <span
              v-if="item.similar_to.length > 3"
              class="text-xs text-gray-400 dark:text-gray-500"
            >
              +{{ item.similar_to.length - 3 }} more
            </span>
          </div>
        </div>

        <!-- Source Track -->
        <div v-if="item.source_track" class="mt-1">
          <span class="text-xs text-gray-400 dark:text-gray-500">
            From: {{ item.source_track }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex-shrink-0 flex flex-col gap-2">
        <button
          @click="emit('approve')"
          class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Approve
        </button>
        <button
          @click="emit('reject')"
          class="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Reject
        </button>
      </div>
    </div>
  </div>
</template>
