import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Category, Punch, WorkScale } from '@/types'
import {
  db,
  ensureSeeded,
  newId,
  type SettingsRow
} from '@/db/database'

export const useEscalaStore = defineStore('escala', () => {
  const categories = ref<Category[]>([])
  const scales = ref<WorkScale[]>([])
  const punches = ref<Punch[]>([])
  const settings = ref<SettingsRow>({
    id: 'app',
    notificationsEnabled: false,
    onboardingDone: false,
    breakMinutes: 60
  })
  const loaded = ref(false)

  const activeScales = computed(() => scales.value.filter((s) => s.active))

  const punchByDate = computed(() => {
    const map = new Map<string, Punch>()
    for (const p of punches.value) map.set(p.date, p)
    return map
  })

  const categoryById = computed(() => {
    const map = new Map<string, Category>()
    for (const c of categories.value) map.set(c.id, c)
    return map
  })

  async function load() {
    await ensureSeeded()
    categories.value = await db.categories.orderBy('id').toArray()
    scales.value = await db.scales.orderBy('startDate').toArray()
    punches.value = await db.punches.orderBy('date').toArray()
    const row = await db.settings.get('app')
    if (row) settings.value = row
    loaded.value = true
  }

  async function saveCategory(category: Category) {
    await db.categories.put(category)
    scales.value = await db.scales.toArray()
    categories.value = await db.categories.orderBy('id').toArray()
  }

  async function deleteCategory(id: string) {
    await db.categories.delete(id)
    categories.value = await db.categories.orderBy('id').toArray()
  }

  async function saveScale(scale: WorkScale) {
    await db.scales.put(scale)
    scales.value = await db.scales.orderBy('startDate').toArray()
  }

  async function savePunch(punch: Punch) {
    await db.punches.put(punch)
    punches.value = await db.punches.orderBy('date').toArray()
  }

  async function deletePunch(date: string) {
    await db.punches.delete(date)
    punches.value = await db.punches.orderBy('date').toArray()
  }

  async function deleteScale(id: string) {
    await db.scales.delete(id)
    scales.value = await db.scales.orderBy('startDate').toArray()
  }

  async function updateSettings(patch: Partial<Omit<SettingsRow, 'id'>>) {
    const next = { ...settings.value, ...patch }
    await db.settings.put(next)
    settings.value = next
  }

  function newScaleId() {
    return newId()
  }

  return {
    categories,
    scales,
    punches,
    settings,
    loaded,
    activeScales,
    punchByDate,
    categoryById,
    load,
    saveCategory,
    deleteCategory,
    saveScale,
    deleteScale,
    savePunch,
    deletePunch,
    updateSettings,
    newScaleId
  }
})
