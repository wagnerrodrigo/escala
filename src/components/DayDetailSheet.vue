<script setup lang="ts">
import { computed } from 'vue'
import type { DayInfo } from '@/types'
import { cycleLength } from '@/engine/schedule'
import { formatLongDate } from '@/utils/date'

const props = defineProps<{ info: DayInfo }>()
defineEmits<{ close: [] }>()

const cat = computed(() => props.info.category)
</script>

<template>
  <div class="sheet-backdrop" @click.self="$emit('close')">
    <div class="sheet">
      <div class="date">{{ formatLongDate(info.date) }}</div>
      <template v-if="cat">
        <div class="row">
          <span class="dot" :style="{ background: cat.color }"></span>
          <strong class="name">{{ cat.name }}</strong>
          <span v-if="cat.kind === 'work'" class="hours">{{ cat.hoursPerDay }}h de turno</span>
        </div>
        <p class="muted" v-if="info.scale">
          Escala {{ info.scale.name }} — ciclo de {{ cycleLength(info.scale.pattern) }} dias
          (início em {{ info.scale.startDate.split('-').reverse().slice(0, 2).join('/') }})
        </p>
      </template>
      <p v-else class="muted">
        {{ info.scale ? 'Dia não coberto por esta escala.' : 'Nenhuma escala ativa para este dia.' }}
      </p>
      <button class="btn" style="width: 100%; margin-top: 10px" @click="$emit('close')">Fechar</button>
    </div>
  </div>
</template>

<style scoped>
.date {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 18px;
}

.hours {
  margin-left: auto;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
</style>
