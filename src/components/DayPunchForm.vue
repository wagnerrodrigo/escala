<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDelta, formatHours, workedHours } from '@/engine/time'
import { useEscalaStore } from '@/stores/escala'

const props = defineProps<{ date: string; plannedHours: number }>()
const emit = defineEmits<{ saved: [] }>()

const store = useEscalaStore()

const existing = computed(() => store.punchByDate.get(props.date))
const entrada = ref(existing.value?.entrada ?? '')
const saida = ref(existing.value?.saida ?? '')
const flash = ref('')

watch(
  () => props.date,
  () => {
    const p = store.punchByDate.get(props.date)
    entrada.value = p?.entrada ?? ''
    saida.value = p?.saida ?? ''
    flash.value = ''
  }
)

const horas = computed(() =>
  workedHours(entrada.value, saida.value, store.settings.breakMinutes)
)

const delta = computed(() =>
  horas.value === null || props.plannedHours <= 0 ? null : horas.value - props.plannedHours
)

const intervaloLabel = computed(() =>
  store.settings.breakMinutes > 0 ? ` (${store.settings.breakMinutes}min de intervalo)` : ''
)

async function save() {
  if (!entrada.value || !saida.value) return
  await store.savePunch({ date: props.date, entrada: entrada.value, saida: saida.value })
  flash.value = 'salvo ✓'
  setTimeout(() => (flash.value = ''), 1600)
  emit('saved')
}

async function remove() {
  await store.deletePunch(props.date)
  entrada.value = ''
  saida.value = ''
  emit('saved')
}
</script>

<template>
  <div class="punch">
    <div class="head">
      <span class="title">Registrar jornada</span>
      <span v-if="plannedHours > 0" class="planned muted">prev. {{ plannedHours }}h</span>
    </div>
    <div class="fields">
      <label class="f">
        <span>Entrada</span>
        <input type="time" v-model="entrada" />
      </label>
      <span class="arrow">→</span>
      <label class="f">
        <span>Saída</span>
        <input type="time" v-model="saida" />
      </label>
    </div>

    <div class="result" v-if="horas !== null">
      <b class="h">{{ formatHours(horas) }}</b>
      <span v-if="delta !== null" class="delta" :class="delta > 0 ? 'up' : delta < 0 ? 'down' : 'eq'">
        {{ formatDelta(delta) }}
      </span>
      <span class="muted intervalo">com {{ store.settings.breakMinutes }}min de intervalo</span>
    </div>
    <div class="result" v-else>
      <span class="muted">Informe entrada e saída para calcular as horas{{ intervaloLabel }}</span>
    </div>

    <div class="actions">
      <button class="btn small primary" :disabled="!entrada || !saida" @click="save">
        {{ existing ? 'Atualizar' : 'Salvar' }}
      </button>
      <button v-if="existing" class="btn small" @click="remove">Excluir</button>
      <span v-if="flash" class="flash">{{ flash }}</span>
    </div>
  </div>
</template>

<style scoped>
.punch {
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.head {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
}

.planned {
  margin-left: auto;
  font-weight: 700;
}

.fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.f {
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.f span {
  font-size: 12px;
}

.arrow {
  color: var(--muted);
  padding-top: 18px;
}

input[type='time'] {
  font-size: 16px;
  font-weight: 700;
}

.result {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 12px 0;
  min-height: 22px;
  flex-wrap: wrap;
}

.h {
  font-size: 22px;
  color: var(--accent);
}

.delta {
  font-size: 14px;
  font-weight: 800;
}

.delta.up {
  color: #fbbf24;
}

.delta.down {
  color: var(--danger);
}

.delta.eq {
  color: var(--accent);
}

.intervalo {
  font-size: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flash {
  margin-left: auto;
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
}
</style>
