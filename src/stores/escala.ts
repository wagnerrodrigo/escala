import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Category, CustomHoliday, DayOverride, Punch, WorkScale } from '@/types'
import { resolveHoliday, type ResolvedHoliday } from '@/engine/holidays'
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
  const overrides = ref<DayOverride[]>([])
  const customHolidays = ref<CustomHoliday[]>([])
  const settings = ref<SettingsRow>({
    id: 'app',
    notificationsEnabled: false,
    onboardingDone: false,
    breakMinutes: 60,
    showFacultative: true
  })
  const loaded = ref(false)

  const activeScales = computed(() => scales.value.filter((s) => s.active))

  const punchByDate = computed(() => {
    const map = new Map<string, Punch>()
    for (const p of punches.value) map.set(p.date, p)
    return map
  })

  const overrideByDate = computed(() => {
    const map = new Map<string, DayOverride>()
    for (const o of overrides.value) map.set(o.date, o)
    return map
  })

  const categoryById = computed(() => {
    const map = new Map<string, Category>()
    for (const c of categories.value) map.set(c.id, c)
    return map
  })

  const customHolidayMap = computed(() => {
    const m: Record<string, string> = {}
    for (const h of customHolidays.value) m[h.date] = h.name
    return m
  })

  function holidayFor(dateISO: string): ResolvedHoliday | null {
    return resolveHoliday(dateISO, customHolidayMap.value, {
      showFacultative: settings.value.showFacultative
    })
  }

  async function load() {
    await ensureSeeded()
    categories.value = await db.categories.orderBy('id').toArray()
    scales.value = await db.scales.orderBy('startDate').toArray()
    punches.value = await db.punches.orderBy('date').toArray()
    overrides.value = await db.overrides.orderBy('date').toArray()
    customHolidays.value = await db.holidays.orderBy('date').toArray()
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

  async function saveOverride(override: DayOverride) {
    await db.overrides.put(override)
    overrides.value = await db.overrides.orderBy('date').toArray()
  }

  async function deleteOverride(date: string) {
    await db.overrides.delete(date)
    overrides.value = await db.overrides.orderBy('date').toArray()
  }

  async function saveHoliday(holiday: CustomHoliday) {
    await db.holidays.put(holiday)
    customHolidays.value = await db.holidays.orderBy('date').toArray()
  }

  async function deleteHoliday(date: string) {
    await db.holidays.delete(date)
    customHolidays.value = await db.holidays.orderBy('date').toArray()
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
    overrides,
    customHolidays,
    settings,
    loaded,
    activeScales,
    punchByDate,
    overrideByDate,
    categoryById,
    customHolidayMap,
    holidayFor,
    load,
    saveCategory,
    deleteCategory,
    saveScale,
    deleteScale,
    savePunch,
    deletePunch,
    saveOverride,
    deleteOverride,
    saveHoliday,
    deleteHoliday,
    updateSettings,
    newScaleId
  }
})
