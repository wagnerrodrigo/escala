<script setup lang="ts">
import { useEscalaStore } from '@/stores/escala'

const store = useEscalaStore()
</script>

<template>
  <div class="legend">
    <span v-for="c in store.categories" :key="c.id" class="item">
      <i class="dot" :style="{ background: c.color }"></i>
      {{ c.name }}
    </span>
    <span class="item holiday">
      <b class="star">★</b>
      Feriado (automático)
    </span>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 12px;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.item.holiday .star {
  color: #fbbf24;
  font-size: 11px;
}
</style>
