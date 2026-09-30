<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WorkScale } from '@/types'
import { cycleLength } from '@/engine/schedule'
import { useEscalaStore } from '@/stores/escala'
import ScaleEditor from '@/components/ScaleEditor.vue'

const store = useEscalaStore()

const editing = ref<WorkScale | null>(null)
const creating = ref(false)

const sorted = computed(() => [...store.scales].sort((a, b) => b.startDate.localeCompare(a.startDate)))

function summary(s: WorkScale): string {
  return s.pattern
    .map((b) => {
      const c = store.categoryById.get(b.categoryId)
      return `${c?.name ?? '?'} ${b.days}d`
    })
    .join(' → ')
}

function ptDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

async function toggleActive(s: WorkScale) {
  await store.saveScale({ ...s, active: !s.active })
}

async function remove(s: WorkScale) {
  if (confirm(`Excluir a escala "${s.name}"?`)) await store.deleteScale(s.id)
}

function closeEditor() {
  editing.value = null
  creating.value = false
}
</script>

<template>
  <div>
    <div v-if="sorted.length === 0" class="card">
      <h2>Sua escala começa aqui</h2>
      <p class="muted">Escolha um modelo pronto (5×2, 6×1, 12×36…) ou monte um ciclo personalizado. O calendário preenche tudo automaticamente.</p>
      <button class="btn primary" @click="creating = true">+ Nova escala</button>
    </div>

    <template v-else>
      <h3 class="section-title">Minhas escalas</h3>
      <div v-for="s in sorted" :key="s.id" class="card scale-row">
        <div class="scale-head">
          <strong>{{ s.name }}</strong>
          <span class="status" :class="{ on: s.active }">{{ s.active ? 'ativa' : 'pausada' }}</span>
        </div>
        <div class="muted">{{ summary(s) }} · ciclo {{ cycleLength(s.pattern) }}d · desde {{ ptDate(s.startDate) }}</div>
        <div v-if="s.shiftRotation?.enabled" class="rot-info">
          🔄 {{ s.shiftRotation.shifts.map((x) => `${x.start}→${x.end}`).join(' · ') }}
          ({{ s.shiftRotation.periodDays }}d cada, {{ s.shiftRotation.shifts.length }} turno{{ s.shiftRotation.shifts.length > 1 ? 's' : '' }})
        </div>
        <div v-else-if="s.workStart && s.workEnd" class="rot-info">🕐 {{ s.workStart }}→{{ s.workEnd }}</div>
        <div class="scale-actions">
          <button class="btn small" @click="toggleActive(s)">{{ s.active ? 'Pausar' : 'Ativar' }}</button>
          <button class="btn small" @click="editing = s">Editar</button>
          <button class="btn small danger" @click="remove(s)">Excluir</button>
        </div>
      </div>
      <button class="btn primary" style="width: 100%" @click="creating = true">+ Nova escala</button>
      <p class="muted hint">Quando várias escalas estão ativas, cada dia usa a escala com data de início mais recente antes dele — ideal para trocar de turno sem perder o histórico.</p>
    </template>

    <ScaleEditor v-if="creating || editing" :initial="editing" @close="closeEditor" @saved="closeEditor" />
  </div>
</template>

<style scoped>
h2 {
  margin: 4px 0 8px;
  font-size: 18px;
}

.scale-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.status {
  margin-left: auto;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 999px;
}

.status.on {
  color: var(--accent);
  border-color: #34d39966;
}

.scale-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.rot-info {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
  background: var(--card-2);
  border-radius: 8px;
  padding: 6px 10px;
}

.hint {
  margin-top: 12px;
}
</style>
