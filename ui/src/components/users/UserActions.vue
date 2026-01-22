<script setup lang="ts">
import type { SlskdUser, SlskdUserStatus } from '@/types';

import Button from 'primevue/button';

interface Props {
  user: SlskdUser;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update-status', id: string, status: SlskdUserStatus): void;
  (e: 'delete', id: string): void;
}>();
</script>

<template>
  <div class="user-actions">
    <Button
      v-if="user.status !== 'trusted'"
      icon="pi pi-check"
      v-tooltip.top="'Trust'"
      severity="success"
      text
      rounded
      size="small"
      @click="emit('update-status', user.id, 'trusted')"
    />

    <Button
      v-if="user.status !== 'flagged'"
      icon="pi pi-flag"
      v-tooltip.top="'Flag'"
      severity="warn"
      text
      rounded
      size="small"
      @click="emit('update-status', user.id, 'flagged')"
    />

    <Button
      v-if="user.status !== 'blocked'"
      icon="pi pi-ban"
      v-tooltip.top="'Block'"
      severity="danger"
      text
      rounded
      size="small"
      @click="emit('update-status', user.id, 'blocked')"
    />

    <Button
      v-if="user.status !== 'neutral'"
      icon="pi pi-replay"
      v-tooltip.top="'Reset to Neutral'"
      severity="secondary"
      text
      rounded
      size="small"
      @click="emit('update-status', user.id, 'neutral')"
    />

    <Button
      icon="pi pi-trash"
      v-tooltip.top="'Delete'"
      severity="danger"
      text
      rounded
      size="small"
      @click="emit('delete', user.id)"
    />
  </div>
</template>

<style scoped>
.user-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}
</style>
