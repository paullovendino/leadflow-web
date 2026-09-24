<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import { stageTone } from '@/lib/stage'

defineProps<{
  name?: string | null
  slug?: string | null
}>()
</script>

<template>
  <AppBadge :tone="stageTone(slug)">{{ name ?? 'No stage' }}</AppBadge>
</template>
