import Dexie, { type Table } from 'dexie'
import type { Category, WorkScale } from '@/types'
import { uid } from '@/engine/schedule'

export interface SettingsRow {
  id: string
  notificationsEnabled: boolean
  onboardingDone: boolean
}

class EscalaDB extends Dexie {
  categories!: Table<Category, string>
  scales!: Table<WorkScale, string>
  settings!: Table<SettingsRow, string>

  constructor() {
    super('escala-db')
    this.version(1).stores({
      categories: 'id, kind',
      scales: 'id, startDate, active',
      settings: 'id'
    })
  }
}

export const db = new EscalaDB()

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-trabalho', name: 'Trabalho', kind: 'work', color: '#22c55e', hoursPerDay: 8 },
  { id: 'cat-folga', name: 'Folga', kind: 'off', color: '#38bdf8', hoursPerDay: 0 },
  { id: 'cat-ferias', name: 'Férias', kind: 'other', color: '#f59e0b', hoursPerDay: 0 },
  { id: 'cat-feriado', name: 'Feriado', kind: 'other', color: '#a855f7', hoursPerDay: 0 }
]

export async function ensureSeeded(): Promise<void> {
  const hasSettings = await db.settings.get('app')
  if (!hasSettings) {
    await db.settings.add({ id: 'app', notificationsEnabled: false, onboardingDone: false })
  }
  const catCount = await db.categories.count()
  if (catCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  }
}

export function newId(): string {
  return uid()
}
