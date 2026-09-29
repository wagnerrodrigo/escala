<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, PatternBlock, WorkScale } from '@/types'
import { addDays, categoryForDate, isValidScale, PRESETS, todayISO } from '@/engine/schedule'
import { useEscalaStore } from '@/stores/escala'
import { uid } from '@/engine/schedule'

const props = defineProps<{ initial: WorkScale | null }>()
const emit = defineEmits<{ saved: []; close: [] }>()

const store = useEscalaStore()

const name = ref(props.initial?.name ?? '')
const startDate = ref(props.initial?.startDate ?? todayISO())
const presetId = ref<string>(detectPreset() ?? 'custom')
const blocks = reactive<PatternBlock[]>(
  props.initial ? props.initial.pattern.map((b) => ({ ...b })) : []
)

function detectPreset(): string | null {
  if (!props.initial) return null
  const label = scaleLabel(props.initial.pattern)
  return PRESETS.find((p) => p.label === label)?.id ?? null
}

function scaleLabel(pattern: PatternBlock[]): string {
  if (pattern.length !== 2) return ''
  return `${pattern[0].days}×${pattern[1].days}`
}

const preset = computed(() => PRESETS.find((p) => p.id === presetId.value) ?? null)

watch(presetId, (id) => {
  const p = PRESETS.find((x) => x.id === id)
  if (!p) return
  name.value = p.label === name.value || !name.value ? `Escala ${p.label}` : name.value
})

function findCategory(templateName: string, kind: string): Category | undefined {
  return store.categories.find(
    (c) => c.name.toLowerCase() === templateName.toLowerCase() && c.kind === kind
  )
}

const customRows = computed({
  get: () => blocks,
  set: (v) => {
    blocks.length = 0
    blocks.push(...v)
  }
})

function addRow() {
  const first = store.categories[0]
  if (first) blocks.push({ categoryId: first.id, days: 1 })
}

function removeRow(i: number) {
  blocks.splice(i, 1)
}

const error = ref('')

const previewDays = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.value)) return []
  const tempScale: WorkScale | null = null
  void tempScale
  const days: { date: string; category: Category | null }[] = []
  const scales: WorkScale[] = [{
    id: 'preview', name: 'preview', startDate: startDate.value,
    pattern: patternForSave(), active: true, createdAt: 0
  }]
  const cats = categoriesForSave(scales[0].pattern)
  for (let i = 0; i < 14; i++) {
    const date = addDays(startDate.value, i)
    const info = categoryForDate(date, scales, cats)
    days.push({ date, category: info.category })
  }
  return days
})

function patternForSave(): PatternBlock[] {
  if (preset.value) {
    return preset.value.blocks.map((b) => ({ categoryId: '', days: b.days, _name: b.categoryName, _kind: b.kind, _color: b.color, _hours: b.hoursPerDay } as unknown as PatternBlock))
  }
  return blocks.map((b) => ({ ...b }))
}

function categoriesForSave(pattern: PatternBlock[]): Category[] {
  const extra: Category[] = []
  for (const b of pattern as unknown as (PatternBlock & { _name?: string })[]) {
    if (b._name) {
      const found = findCategory(b._name, (b as unknown as { _kind: string })._kind)
      b.categoryId = found ? found.id : `new-${b._name}`
      if (!found) {
        extra.push({
          id: b.categoryId, name: b._name,
          kind: (b as unknown as { _kind: Category['kind'] })._kind,
          color: (b as unknown as { _color: string })._color,
          hoursPerDay: (b as unknown as { _hours: number })._hours
        })
      }
    }
  }
  return [...store.categories, ...extra]
}

function save() {
  error.value = ''
  const pattern = patternForSave()
  const cats = categoriesForSave(pattern)
  const scale: WorkScale = {
    id: props.initial?.id ?? uid(),
    name: name.value.trim() || (preset.value ? `Escala ${preset.value.label}` : 'Minha escala'),
    startDate: startDate.value,
    pattern: pattern.map((b) => ({ categoryId: b.categoryId, days: b.days })),
    active: props.initial?.active ?? true,
    createdAt: props.initial?.createdAt ?? Date.now()
  }
  if (!isValidScale(scale)) {
    error.value = 'Preencha a data de início e um padrão com blocos válidos (categoria + dias).'
    return
  }
  for (const cat of cats) {
    if (cat.id.startsWith('new-')) store.saveCategory(cat)
  }
  store.saveScale(scale)
  emit('saved')
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
        <p class="muted">Repete a cada {{ preset.blocks.reduce((s, b) => s + b.days, 0) }} dias.</p>
      </div>

      <div class="field" v-else>
        <label> Blocos do ciclo</label>
        <div v-for="(b, i) in customRows" :key="i" class="block-row">
          <select v-model="b.categoryId">
            <option v-for="c in store.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <input v-model.number="b.days" type="number" min="1" step="1" class="days-input" />
          <span class="d-unit">dias</span>
          <button class="icon-btn" @click="removeRow(i)" aria-label="Remover bloco">×</button>
        </div>
        <button class="btn small" @click="addRow">+ Adicionar bloco</button>
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

.chip { font-size: 14px; padding: 8px 14px; }

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.preset-summary {
  display: flex;
  gap: 10px;
  background: var(--card-2);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.preset-summary b { color: var(--accent); }

.block-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.days-input { width: 64px; }

.d-unit { font-size: 13px; color: var(--muted); }

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

.err { color: var(--danger); font-size: 13px; }

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.actions .btn { flex: 1; }
</style>
