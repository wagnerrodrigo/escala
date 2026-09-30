<script setup lang="ts">
import { computed } from 'vue'
import type { DayInfo, MonthCell } from '@/types'
import { withAlpha } from '@/utils/color'

const props = defineProps<{
  cell: MonthCell
  info: DayInfo
  today: string
  hasPunch: boolean
  hasOverride: boolean
  holiday?: string | null
}>()

const day = computed(() => Number(props.cell.date.slice(8)))

const style = computed(() => {
  const cat = props.info.category
  const stripe = props.holiday ? `inset 0 -4px 0 #fbbf24` : ''
  if (!cat || !props.cell.inMonth) {
    return {
      background: 'transparent',
      color: props.cell.inMonth ? 'inherit' : 'var(--muted)',
      boxShadow: stripe || undefined
    }
  }
  const ring = `inset 0 0 0 1px ${withAlpha(cat.color, '66')}`
  return {
    background: withAlpha(cat.color, '3d'),
    color: '#f1f5f9',
    boxShadow: stripe ? `${stripe}, ${ring}` : ring
  }
})

const isToday = computed(() => props.cell.date === props.today)
const shortLabel = computed(() => {
  const cat = props.info.category
  if (!cat || !props.cell.inMonth) return ''
  return cat.name.slice(0, 1)
})
</script>

<template>
  <button
    class="day-cell"
    :class="{ today: isToday, dim: !cell.inMonth, holiday: Boolean(holiday) }"
    :style="style"
    :title="holiday ? `Feriado: ${holiday}` : undefined"
    @click="$emit('select')"
  >
    <span class="num">{{ day }}</span>
    <span v-if="shortLabel" class="lbl">{{ shortLabel }}</span>
    <span v-if="holiday" class="hol" aria-hidden="true">★</span>
    <span v-if="hasPunch" class="tick" aria-hidden="true">✓</span>
    <span v-if="hasOverride" class="pen" aria-hidden="true">✎</span>
  </button>
</template>

<style scoped>
.day-cell {
  position: relative;
  aspect-ratio: 1;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: pointer;
  padding: 0;
}

.day-cell .lbl {
  font-size: 9px;
  font-weight: 700;
  opacity: 0.85;
  text-transform: uppercase;
}

.day-cell.dim {
  opacity: 0.35;
}

.day-cell.today {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.tick {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 9px;
  font-weight: 900;
  color: var(--accent);
  line-height: 1;
}

.pen {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 9px;
  font-weight: 900;
  color: #fbbf24;
  line-height: 1;
}

.hol {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  line-height: 1;
  color: #fbbf24;
}
</style>
