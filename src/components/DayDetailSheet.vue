<script setup lang="ts">
import { computed } from 'vue'
import type { DayInfo } from '@/types'
import { cycleLength, plannedHours } from '@/engine/schedule'
import { formatLongDate } from '@/utils/date'
import { useEscalaStore } from '@/stores/escala'
import DayPunchForm from './DayPunchForm.vue'

const props = defineProps<{ info: DayInfo }>()
defineEmits<{ close: [] }>()

const store = useEscalaStore()
const cat = computed(() => props.info.category)
const planejadas = computed(() => plannedHours(props.info, store.settings.breakMinutes))
</script>

<template>
  <div class="sheet-backdrop" @click.self="$emit('close')">
    <div class="sheet">
      <div class="date">{{ formatLongDate(info.date) }}</div>
      <template v-if="cat">
        <div class="row">
          <span class="dot" :style="{ background: cat.color }"></span>
          <strong class="name">{{ cat.name }}</strong>
          <span v-if="cat.kind === 'work' && planejadas > 0" class="hours">{{ planejadas }}h de turno</span>
        </div>
        <p class="muted" v-if="info.scale">
          Escala {{ info.scale.name }} — ciclo de {{ cycleLength(info.scale.pattern) }} dias
          (início em {{ info.scale.startDate.split('-').reverse().slice(0, 2).join('/') }})
          <template v-if="info.scale.workStart && info.scale.workEnd">
            · {{ info.scale.workStart }}→{{ info.scale.workEnd }}
          </template>
        </p>
        <DayPunchForm
          v-if="cat.kind === 'work'"
          :date="info.date"
          :planned-hours="planejadas"
          class="punch-slot"
        />
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

.punch-slot {
  margin-top: 12px;
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
