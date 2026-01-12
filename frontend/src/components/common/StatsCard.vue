<script setup lang="ts">
defineProps<{
  title: string
  value: number | string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}>()
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ title }}
        </p>
        <p
          :class="[
            'mt-2 text-3xl font-bold',
            color === 'blue'
              ? 'text-blue-600 dark:text-blue-400'
              : color === 'green'
                ? 'text-green-600 dark:text-green-400'
                : color === 'purple'
                  ? 'text-purple-600 dark:text-purple-400'
                  : color === 'orange'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-900 dark:text-white',
          ]"
        >
          {{ value }}
        </p>
      </div>
      <div
        :class="[
          'w-12 h-12 rounded-lg flex items-center justify-center',
          color === 'blue'
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : color === 'green'
              ? 'bg-green-100 dark:bg-green-900/30'
              : color === 'purple'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : color === 'orange'
                  ? 'bg-orange-100 dark:bg-orange-900/30'
                  : 'bg-gray-100 dark:bg-gray-700',
        ]"
      >
        <slot name="icon">
          <svg
            :class="[
              'w-6 h-6',
              color === 'blue'
                ? 'text-blue-600 dark:text-blue-400'
                : color === 'green'
                  ? 'text-green-600 dark:text-green-400'
                  : color === 'purple'
                    ? 'text-purple-600 dark:text-purple-400'
                    : color === 'orange'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-400',
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </slot>
      </div>
    </div>
  </div>
</template>
