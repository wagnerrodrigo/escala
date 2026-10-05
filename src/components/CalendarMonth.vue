<script setup lang="ts">
import { computed } from 'vue'
import type { DayInfo } from '@/types'
import { categoryForDate, monthMatrix, todayISO } from '@/engine/schedule'
import { useEscalaStore } from '@/stores/escala'
import DayCell from './DayCell.vue'

const props = defineProps<{ year: number; month: number }>()
const emit = defineEmits<{ select: [info: DayInfo] }>()

const store = useEscalaStore()
const today = todayISO()

const weeks = computed(() =>
  monthMatrix(props.year, props.month).map((week) =>
    week.map((cell) => ({
      cell,
      info: categoryForDate(cell.date, store.activeScales, store.categories, store.categoryOverrides),
      holiday: store.holidayFor(cell.date)?.name ?? null
    }))
  )
)

const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
</script>

<template>
  <div class="grid">
    <span v-for="(w, i) in weekdayLabels" :key="'h' + i" class="head">{{ w }}</span>
    <template v-for="(week, wi) in weeks" :key="wi">
      <DayCell
        v-for="entry in week"
        :key="entry.cell.date"
        :cell="entry.cell"
        :info="entry.info"
        :today="today"
        :has-punch="store.punchByDate.has(entry.cell.date)"
        :has-override="store.overrideByDate.has(entry.cell.date)"
        :has-category-override="store.categoryOverrideByDate.has(entry.cell.date)"
        :holiday="entry.holiday"
        @select="emit('select', entry.info)"
      />
    </template>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.head {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  padding-bottom: 2px;
}
</style>
