<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { DayInfo } from '@/types'
import { cycleLength, effectiveShift, plannedHours } from '@/engine/schedule'
import { formatHours } from '@/engine/time'
import { formatLongDate } from '@/utils/date'
import { useEscalaStore } from '@/stores/escala'
import DayPunchForm from './DayPunchForm.vue'

const props = defineProps<{ info: DayInfo }>()
defineEmits<{ close: [] }>()

const store = useEscalaStore()
const cat = computed(() => props.info.category)
const holiday = computed(() => store.holidayFor(props.info.date))
const planejadas = computed(() =>
  plannedHours(props.info, store.settings.breakMinutes, store.overrides)
)

const efetivo = computed(() => effectiveShift(props.info.date, props.info.scale, store.overrides))

const sourceLabel = computed(() => {
  switch (efetivo.value.source) {
    case 'override':
      return { text: 'Personalizado neste dia', cls: 'custom' }
    case 'rotation':
      return { text: 'Automático — rotação da escala', cls: '' }
    case 'default':
      return { text: 'Automático — padrão da escala', cls: '' }
    default:
      return { text: 'Nenhum horário automático', cls: '' }
  }
})

const hourFields = reactive({ start: '', end: '' })

function syncFields() {
  hourFields.start = efetivo.value.shift?.start ?? ''
  hourFields.end = efetivo.value.shift?.end ?? ''
}
syncFields()
watch(efetivo, syncFields)

const canSave = computed(() => Boolean(hourFields.start && hourFields.end))
const isOverride = computed(() => efetivo.value.source === 'override')

async function salvarAlteracao() {
  if (!canSave.value) return
  await store.saveOverride({ date: props.info.date, start: hourFields.start, end: hourFields.end })
}

async function restaurar() {
  await store.deleteOverride(props.info.date)
}
</script>

<template>
  <div class="sheet-backdrop" @click.self="$emit('close')">
    <div class="sheet">
      <div class="date">{{ formatLongDate(info.date) }}</div>
      <div v-if="holiday" class="holiday-chip">
        ★ Feriado: {{ holiday.name }}
        <span class="kind-tag">{{ holiday.source === 'custom' ? 'personalizado' : holiday.kind.replace('-', ' ') }}</span>
      </div>
      <template v-if="cat">
        <div class="row">
          <span class="dot" :style="{ background: cat.color }"></span>
          <strong class="name">{{ cat.name }}</strong>
          <span v-if="cat.kind === 'work' && planejadas > 0" class="hours">{{ formatHours(planejadas) }} de turno</span>
        </div>
        <p class="muted" v-if="info.scale">
          Escala {{ info.scale.name }} — ciclo de {{ cycleLength(info.scale.pattern) }} dias
          (início em {{ info.scale.startDate.split('-').reverse().slice(0, 2).join('/') }})
        </p>

        <div class="shift-box" v-if="cat.kind === 'work'">
          <div class="shift-head">
            <span class="shift-title">Horário previsto deste dia</span>
            <span class="src" :class="sourceLabel.cls">{{ sourceLabel.text }}</span>
          </div>
          <div class="shift-fields">
            <input v-model="hourFields.start" type="time" aria-label="Entrada" />
            <span class="arrow">→</span>
            <input v-model="hourFields.end" type="time" aria-label="Saída" />
          </div>
          <div class="shift-actions">
            <button class="btn small primary" :disabled="!canSave" @click="salvarAlteracao">
              {{ isOverride ? 'Atualizar alteração' : 'Salvar alteração' }}
            </button>
            <button v-if="isOverride" class="btn small" @click="restaurar">Restaurar automático</button>
          </div>
          <p class="muted note">Muda apenas este dia — a escala continua igual para os demais.</p>
        </div>

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

.holiday-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fbbf2422;
  border: 1px solid #fbbf2466;
  color: #fcd34d;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.kind-tag {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
  border-left: 1px solid #fbbf2466;
  padding-left: 8px;
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

.shift-box {
  margin-top: 12px;
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.shift-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.shift-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
}

.src {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}

.src.custom {
  color: #fbbf24;
  border-color: #fbbf2466;
}

.shift-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shift-fields input {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
}

.arrow {
  color: var(--muted);
}

.shift-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.note {
  margin: 8px 0 0;
  font-size: 12px;
}

.punch-slot {
  margin-top: 12px;
}
</style>
