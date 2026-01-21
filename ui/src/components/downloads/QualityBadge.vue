<script setup lang="ts">
import type { QualityInfo, QualityTier } from '@/types';

import { computed } from 'vue';

import Tag from 'primevue/tag';

interface Props {
  quality: QualityInfo;
}

const props = defineProps<Props>();

const tierSeverity = computed<'success' | 'info' | 'warn' | 'danger' | 'secondary'>(() => {
  const severityMap: Record<QualityTier, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    lossless: 'success',
    high:     'info',
    standard: 'warn',
    low:      'danger',
    unknown:  'secondary',
  };

  return severityMap[props.quality.tier] || 'secondary';
});

const formatLabel = computed(() => props.quality.format.toUpperCase());

const bitrateLabel = computed(() => {
  if (props.quality.tier === 'lossless') {
    if (props.quality.bitDepth && props.quality.sampleRate) {
      return `${ props.quality.bitDepth }bit/${ Math.round(props.quality.sampleRate / 1000) }kHz`;
    }

    return null;
  }

  if (props.quality.bitRate) {
    return `${ props.quality.bitRate }kbps`;
  }

  return null;
});
</script>

<template>
  <div class="quality-badge">
    <Tag :value="formatLabel" :severity="tierSeverity" class="quality-badge__format" />
    <span v-if="bitrateLabel" class="quality-badge__bitrate">{{ bitrateLabel }}</span>
  </div>
</template>

<style scoped>
.quality-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quality-badge__format {
  text-transform: uppercase;
  font-weight: 600;
}

.quality-badge__bitrate {
  font-size: 0.75rem;
  color: var(--surface-400);
}
</style>
