<script setup lang="ts">
import type { UserStats as UserStatsType } from '@/types';

import DashboardStatsCard from '@/components/dashboard/DashboardStatsCard.vue';

interface Props {
  stats: UserStatsType | null;
}

defineProps<Props>();
</script>

<template>
  <div class="user-stats">
    <div class="flex gap-4">
      <DashboardStatsCard
        title="Total"
        :value="stats?.total ?? 0"
        color="primary"
        icon="pi-users"
      />

      <DashboardStatsCard
        title="Trusted"
        :value="stats?.trusted ?? 0"
        color="green"
        icon="pi-check-circle"
      />

      <DashboardStatsCard
        title="Flagged"
        :value="stats?.flagged ?? 0"
        color="orange"
        icon="pi-exclamation-triangle"
      />

      <DashboardStatsCard
        title="Blocked"
        :value="stats?.blocked ?? 0"
        color="purple"
        icon="pi-ban"
      />
    </div>
  </div>
</template>

<style scoped>
.user-stats {
  margin-bottom: 2rem;
}
</style>
