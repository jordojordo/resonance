<script setup lang="ts">
import type { SlskdUserStatus } from '@/types';

import Tag from 'primevue/tag';

interface Props {
  status: SlskdUserStatus;
}

defineProps<Props>();

const statusConfig: Record<SlskdUserStatus, { severity: 'success' | 'warn' | 'danger' | 'secondary'; label: string }> = {
  trusted: { severity: 'success', label: 'Trusted' },
  flagged: { severity: 'warn', label: 'Flagged' },
  blocked: { severity: 'danger', label: 'Blocked' },
  neutral: { severity: 'secondary', label: 'Neutral' },
};
</script>

<template>
  <Tag
    :value="statusConfig[status].label"
    :severity="statusConfig[status].severity"
    class="user-status-badge"
  />
</template>

<style scoped>
.user-status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
