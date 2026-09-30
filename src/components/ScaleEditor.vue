<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, PatternBlock, ShiftOption, WorkScale } from '@/types'
import {
  addDays,
  categoryForDate,
  effectiveShift,
  isValidScale,
  PRESETS,
  todayISO,
  uid,
  type PresetBlock
} from '@/engine/schedule'
import { formatHours, workedHours } from '@/engine/time'
import { useEscalaStore } from '@/stores/escala'

interface DraftBlock {
  categoryId: string
  days: number
  template?: PresetBlock
}

const props = defineProps<{ initial: WorkScale | null }>()
const emit = defineEmits<{ saved: []; close: [] }>()

const store = useEscalaStore()

const name = ref(props.initial?.name ?? '')
const startDate = ref(props.initial?.startDate ?? todayISO())
const workStart = ref(props.initial?.workStart ?? '')
const workEnd = ref(props.initial?.workEnd ?? '')
const rotEnabled = ref(Boolean(props.initial?.shiftRotation?.enabled))
const rotPeriodDays = ref(props.initial?.shiftRotation?.periodDays ?? 45)
const rotShifts = reactive<ShiftOption[]>(
  props.initial?.shiftRotation?.shifts.map((s) => ({ ...s })) ?? [{ start: '', end: '' }]
)
const presetId = ref(props.initial ? detectPreset() ?? 'custom' : '5x2')
const blocks = reactive<PatternBlock[]>(
  props.initial?.pattern.map((b) => ({ ...b })) ?? []
)

function detectPreset(): string | null {
  if (!props.initial) return null
  const p = props.initial.pattern
  if (p.length !== 2) return null
  const label = `${p[0].days}×${p[1].days}`
  return PRESETS.find((x) => x.label === label)?.id ?? null
}

const preset = computed(() => PRESETS.find((p) => p.id === presetId.value) ?? null)

watch(presetId, (id) => {
  const p = PRESETS.find((x) => x.id === id)
  if (p && (!name.value || /^Escala /.test(name.value))) name.value = `Escala ${p.label}`
  if (id === 'custom' && blocks.length === 0 && p) {
    for (const b of p.blocks) {
      const found = findTemplateCategory(b)
      blocks.push({ categoryId: found?.id ?? store.categories[0]?.id ?? '', days: b.days })
    }
  }
})

function findTemplateCategory(t: PresetBlock): Category | undefined {
  const byName = store.categories.find((c) => c.name.toLowerCase() === t.categoryName.toLowerCase())
  if (byName) return byName
  return store.categories.find((c) => c.kind === t.kind)
}

function draftBlocks(): DraftBlock[] {
  if (preset.value) return preset.value.blocks.map((b) => ({ categoryId: '', days: b.days, template: b }))
  return blocks.map((b) => ({ ...b }))
}

function resolveDrafts(drafts: DraftBlock[]): { pattern: PatternBlock[]; newCategories: Category[] } {
  const pattern: PatternBlock[] = []
  const newCategories: Category[] = []
  for (const d of drafts) {
    let categoryId = d.categoryId
    if (d.template) {
      const found = findTemplateCategory(d.template)
      if (found) {
        categoryId = found.id
      } else {
        const created = newCategories.find((c) => c.name.toLowerCase() === d.template!.categoryName.toLowerCase())
        if (created) {
          categoryId = created.id
        } else {
          const cat: Category = {
            id: uid(),
            name: d.template.categoryName,
            kind: d.template.kind,
            color: d.template.color,
            hoursPerDay: d.template.hoursPerDay
          }
          newCategories.push(cat)
          categoryId = cat.id
        }
      }
    }
    pattern.push({ categoryId, days: d.days })
  }
  return { pattern, newCategories }
}

/* ---------- jornada (entrada/saída da escala) ---------- */

const jornadaBruta = computed(() => workedHours(workStart.value || '00:00', workEnd.value || '00:00', 0))
const jornadaLiquida = computed(() =>
  workedHours(workStart.value || '00:00', workEnd.value || '00:00', store.settings.breakMinutes)
)

const jornadaCompleta = computed(() => Boolean(workStart.value && workEnd.value))
const jornadaParcial = computed(() => Boolean(workStart.value) !== Boolean(workEnd.value))

/* ---------- mudança automática de turno ---------- */
const ROT_MAX = 3

function enableRotation() {
  rotEnabled.value = true
  if (rotShifts.length === 0) rotShifts.push({ start: '', end: '' })
  if (!rotShifts[0].start && workStart.value) {
    rotShifts[0].start = workStart.value
    rotShifts[0].end = workEnd.value
  }
}

watch(rotEnabled, (on) => {
  if (on && rotShifts.length === 1 && !rotShifts[0].start && workStart.value) {
    rotShifts[0].start = workStart.value
    rotShifts[0].end = workEnd.value
  }
})

function addShift() {
  if (rotShifts.length >= ROT_MAX) return
  rotShifts.push({ start: '', end: '' })
}

function removeShift(i: number) {
  if (rotShifts.length <= 1) return
  rotShifts.splice(i, 1)
}

function setShiftCount(n: number) {
  const target = Math.min(ROT_MAX, Math.max(1, Math.round(Number(n) || 1)))
  while (rotShifts.length < target) rotShifts.push({ start: '', end: '' })
  if (rotShifts.length > target) rotShifts.splice(target)
}

const rotCountModel = computed({
  get: () => rotShifts.length,
  set: (n: number) => setShiftCount(n)
})

const rotCompleta = computed(
  () =>
    rotShifts.length >= 1 &&
    rotShifts.length <= ROT_MAX &&
    rotPeriodDays.value >= 1 &&
    rotShifts.every((s) => s.start && s.end)
)

const rotTotalCycle = computed(() => rotPeriodDays.value * rotShifts.length)

const workDaysPerCycle = computed(() => {
  const { pattern, newCategories } = resolveDrafts(draftBlocks())
  const cats = new Map([...store.categories, ...newCategories].map((c) => [c.id, c]))
  return pattern
    .filter((b) => cats.get(b.categoryId)?.kind === 'work')
    .reduce((s, b) => s + b.days, 0)
})

const horasNoCiclo = computed(() => {
  if (!jornadaCompleta.value) return null
  const per = jornadaLiquida.value ?? 0
  return Math.round(per * workDaysPerCycle.value * 10) / 10
})

const draftRotation = computed(() =>
  rotEnabled.value
    ? {
        enabled: true,
        periodDays: rotPeriodDays.value,
        shifts: rotShifts.map((s) => ({ start: s.start, end: s.end }))
      }
    : undefined
)

const previewDays = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.value)) return []
  const { pattern, newCategories } = resolveDrafts(draftBlocks())
  const cats = [...store.categories, ...newCategories]
  const scale: WorkScale = {
    id: 'preview', name: 'preview', startDate: startDate.value,
    pattern, active: true, createdAt: 0,
    workStart: workStart.value || undefined,
    workEnd: workEnd.value || undefined,
    shiftRotation: draftRotation.value
  }
  const days: { date: string; category: Category | null; shift: ShiftOption | null }[] = []
  for (let i = 0; i < 14; i++) {
    const date = addDays(startDate.value, i)
    const info = categoryForDate(date, [scale], cats)
    days.push({ date, category: info.category, shift: effectiveShift(date, scale, []).shift })
  }
  return days
})

const error = ref('')

async function save() {
  error.value = ''
  if (jornadaParcial.value) {
    error.value = 'Preencha entrada e saída da jornada (ou deixe as duas vazias).'
    return
  }
  if (rotEnabled.value && !rotCompleta.value) {
    error.value =
      rotShifts.length > ROT_MAX
        ? 'Máximo de 3 turnos na mudança automática.'
        : 'Preencha entrada e saída de todos os turnos e uma duração válida (mín. 1 dia).'
    return
  }
  const { pattern, newCategories } = resolveDrafts(draftBlocks())
  const allCats = new Set([...store.categories.map((c) => c.id), ...newCategories.map((c) => c.id)])
  if (!pattern.length || pattern.some((b) => !allCats.has(b.categoryId))) {
    error.value = 'Cada bloco precisa de uma categoria válida.'
    return
  }
  const scale: WorkScale = {
    id: props.initial?.id ?? uid(),
    name: name.value.trim() || (preset.value ? `Escala ${preset.value.label}` : 'Minha escala'),
    startDate: startDate.value,
    pattern,
    active: props.initial?.active ?? true,
    createdAt: props.initial?.createdAt ?? Date.now(),
    workStart: workStart.value || undefined,
    workEnd: workEnd.value || undefined,
    shiftRotation: draftRotation.value
  }
  if (!isValidScale(scale)) {
    error.value = 'Preencha a data de início (AAAA-MM-DD) e dias válidos em todos os blocos.'
    return
  }
  for (const cat of newCategories) await store.saveCategory(cat)
  await store.saveScale(scale)
  await store.updateSettings({ onboardingDone: true })
  emit('saved')
}

function addRow() {
  const first = store.categories[0]
  if (first) blocks.push({ categoryId: first.id, days: 1 })
}

function removeRow(i: number) {
  blocks.splice(i, 1)
}
</script>

<template>
  <div class="sheet-backdrop" @click.self="$emit('close')">
    <div class="sheet editor">
      <h2>{{ initial ? 'Editar escala' : 'Nova escala' }}</h2>

      <div class="field">
        <label>Modelo</label>
        <div class="presets">
          <button
            v-for="p in PRESETS"
            :key="p.id"
            class="chip"
            :class="{ selected: presetId === p.id }"
            @click="presetId = p.id"
          >{{ p.label }}</button>
          <button class="chip" :class="{ selected: presetId === 'custom' }" @click="presetId = 'custom'">Personalizada</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label>Nome</label>
          <input v-model="name" placeholder="Ex.: Escala do hospital" />
        </div>
        <div class="field">
          <label>Data de início</label>
          <input v-model="startDate" type="date" />
        </div>
      </div>

      <div class="field" v-if="preset">
        <label>Padrão</label>
        <div class="preset-summary">
          <span v-for="(b, i) in preset.blocks" :key="i" class="p-block">
            <b>{{ b.days }}d</b> {{ b.categoryName }}
          </span>
        </div>
        <p class="muted">Repete a cada {{ preset.blocks.reduce((s, b) => s + b.days, 0) }} dias. As categorias são criadas automaticamente.</p>
      </div>

      <div class="field" v-else-if="store.categories.length">
        <label>Blocos do ciclo</label>
        <div v-for="(b, i) in blocks" :key="i" class="block-row">
          <select v-model="b.categoryId">
            <option v-for="c in store.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <input v-model.number="b.days" type="number" min="1" step="1" class="days-input" />
          <span class="d-unit">dias</span>
          <button class="icon-btn" @click="removeRow(i)" aria-label="Remover bloco">×</button>
        </div>
        <button class="btn small" @click="addRow">+ Adicionar bloco</button>
      </div>
      <p v-else class="muted">Crie ao menos uma categoria em Ajustes antes de montar uma escala personalizada.</p>

      <div class="field jornada">
        <label>Jornada de trabalho <span class="muted">(opcional)</span></label>
        <div class="jornada-fields">
          <label class="jf">
            <span>Entrada</span>
            <input v-model="workStart" type="time" />
          </label>
          <span class="arrow">→</span>
          <label class="jf">
            <span>Saída</span>
            <input v-model="workEnd" type="time" />
          </label>
        </div>
        <p v-if="jornadaCompleta && !rotEnabled" class="jornada-result">
          <b>{{ formatHours(jornadaBruta ?? 0) }}</b> por dia
          <template v-if="store.settings.breakMinutes > 0">
            · com intervalo {{ store.settings.breakMinutes }}min = <b>{{ formatHours(jornadaLiquida ?? 0) }}</b>
          </template>
          <template v-if="horasNoCiclo !== null"> · ≈ <b>{{ horasNoCiclo }}h</b> no ciclo ({{ workDaysPerCycle }} dias de trabalho)</template>
        </p>
        <p v-else-if="jornadaParcial" class="warn">Preencha os dois horários ou nenhum.</p>
        <p v-else-if="!rotEnabled" class="muted">Sem jornada definida, vale a hora por dia da categoria (fallback).</p>
      </div>

      <div class="field rot">
        <div class="rot-head">
          <div>
            <label style="margin: 0">
              <input type="checkbox" v-model="rotEnabled" style="width: auto; margin-right: 8px; vertical-align: middle" />
              Mudança automática de horário
            </label>
            <p class="muted" style="margin: 2px 0 0">O turno troque a cada X dias, reiniciando após o último.</p>
          </div>
          <button
            v-if="!rotEnabled"
            class="btn small"
            type="button"
            @click="enableRotation"
          >Ativar</button>
        </div>

        <div v-if="rotEnabled" class="rot-body">
          <div class="grid-2">
            <div class="field">
              <label for="rot-count">Quantidade de turnos</label>
              <input
                id="rot-count"
                v-model.number="rotCountModel"
                type="number"
                min="1"
                max="3"
                step="1"
              />
            </div>
            <div class="field">
              <label for="rot-days">Duração de cada turno (dias)</label>
              <input id="rot-days" v-model.number="rotPeriodDays" type="number" min="1" step="1" />
            </div>
          </div>

          <label>Horários por turno</label>
          <div v-for="(s, i) in rotShifts" :key="i" class="rot-row">
            <span class="rot-num">{{ i + 1 }}º</span>
            <input v-model="s.start" type="time" aria-label="Entrada" />
            <span class="arrow-in">→</span>
            <input v-model="s.end" type="time" aria-label="Saída" />
            <button
              class="icon-btn"
              type="button"
              :disabled="rotShifts.length <= 1"
              @click="removeShift(i)"
              aria-label="Remover turno"
            >×</button>
          </div>
          <button
            class="btn small"
            type="button"
            :disabled="rotShifts.length >= ROT_MAX"
            @click="addShift"
          >+ Turno{{ rotShifts.length >= ROT_MAX ? ' (máx. 3)' : '' }}</button>

          <p v-if="rotCompleta" class="jornada-result">
            Ciclo completo: <b>{{ rotTotalCycle }} dias</b>
            ({{ rotShifts.length }} turno{{ rotShifts.length > 1 ? 's' : '' }} × {{ rotPeriodDays }} dias) · depois volta ao 1º turno.
          </p>
          <p v-else class="warn">Preencha todos os turnos (entrada e saída) e a duração.</p>
        </div>
      </div>

      <div class="field" v-if="previewDays.length">
        <label>Prévia (primeiros 14 dias)</label>
        <div class="preview">
          <span
            v-for="d in previewDays"
            :key="d.date"
            class="p-day"
            :style="d.category ? { background: d.category.color } : { background: 'var(--card-2)' }"
            :title="`${d.date} — ${d.category?.name ?? 'sem escala'}${d.shift ? ` ${d.shift.start}→${d.shift.end}` : ''}`"
          >{{ Number(d.date.slice(8)) }}</span>
        </div>
      </div>

      <p v-if="error" class="err">{{ error }}</p>

      <div class="actions">
        <button class="btn" @click="$emit('close')">Cancelar</button>
        <button class="btn primary" @click="save">Salvar escala</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  max-height: 86dvh;
  overflow-y: auto;
}

.editor h2 {
  margin: 0 0 14px;
  font-size: 18px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font-size: 14px;
  padding: 8px 14px;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.preset-summary {
  display: flex;
  gap: 14px;
  background: var(--card-2);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.preset-summary b {
  color: var(--accent);
}

.block-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.block-row select {
  flex: 1;
}

.days-input {
  width: 64px;
}

.d-unit {
  font-size: 13px;
  color: var(--muted);
}

.jornada {
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.jornada-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.jf {
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jf span {
  font-size: 12px;
}

.jornada-fields input[type='time'] {
  font-size: 16px;
  font-weight: 700;
}

.arrow {
  color: var(--muted);
  padding-top: 18px;
}

.jornada-result {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--text);
}

.jornada-result b {
  color: var(--accent);
}

.warn {
  margin: 10px 0 0;
  font-size: 13px;
  color: #fbbf24;
  font-weight: 600;
}

.rot {
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.rot-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.rot-head label {
  color: var(--text);
  font-size: 14px;
}

.rot-head .btn {
  margin-left: auto;
}

.rot-body {
  margin-top: 12px;
}

.rot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.rot-row input[type='time'] {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
}

.rot-num {
  flex: none;
  width: 26px;
  font-weight: 800;
  color: var(--accent);
  font-size: 14px;
}

.arrow-in {
  color: var(--muted);
}

.preview {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.p-day {
  aspect-ratio: 1;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.err {
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.actions .btn {
  flex: 1;
}
</style>
