<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, PatternBlock, WorkScale } from '@/types'
import {
  addDays,
  categoryForDate,
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

const previewDays = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.value)) return []
  const { pattern, newCategories } = resolveDrafts(draftBlocks())
  const cats = [...store.categories, ...newCategories]
  const scale: WorkScale = {
    id: 'preview', name: 'preview', startDate: startDate.value,
    pattern, active: true, createdAt: 0,
    workStart: workStart.value || undefined,
    workEnd: workEnd.value || undefined
  }
  const days: { date: string; category: Category | null }[] = []
  for (let i = 0; i < 14; i++) {
    const date = addDays(startDate.value, i)
    days.push({ date, category: categoryForDate(date, [scale], cats).category })
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
    workEnd: workEnd.value || undefined
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
        <p v-if="jornadaCompleta" class="jornada-result">
          <b>{{ formatHours(jornadaBruta ?? 0) }}</b> por dia
          <template v-if="store.settings.breakMinutes > 0">
            · com intervalo {{ store.settings.breakMinutes }}min = <b>{{ formatHours(jornadaLiquida ?? 0) }}</b>
          </template>
          <template v-if="horasNoCiclo !== null"> · ≈ <b>{{ horasNoCiclo }}h</b> no ciclo ({{ workDaysPerCycle }} dias de trabalho)</template>
        </p>
        <p v-else-if="jornadaParcial" class="warn">Preencha os dois horários ou nenhum.</p>
        <p v-else class="muted">Sem jornada definida, vale a hora por dia da categoria (fallback).</p>
      </div>

      <div class="field" v-if="previewDays.length">
        <label>Prévia (primeiros 14 dias)</label>
        <div class="preview">
          <span
            v-for="d in previewDays"
            :key="d.date"
            class="p-day"
            :style="d.category ? { background: d.category.color } : { background: 'var(--card-2)' }"
            :title="`${d.date} — ${d.category?.name ?? 'sem escala'}`"
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
