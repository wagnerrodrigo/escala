import { workedHours } from './time'
import type {
  Category,
  CategoryCount,
  CategoryKind,
  DayInfo,
  MonthCell,
  PatternBlock,
  RangeStats,
  WorkScale
} from '@/types'

const MS_PER_DAY = 86_400_000

export function parseISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function toISO(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  return Math.round((parseISO(toISOStr) - parseISO(fromISO)) / MS_PER_DAY)
}

export function addDays(iso: string, n: number): string {
  return toISO(parseISO(iso) + n * MS_PER_DAY)
}

export function startOfMonth(year: number, month: number): string {
  return toISO(Date.UTC(year, month - 1, 1))
}

export function endOfMonth(year: number, month: number): string {
  return toISO(Date.UTC(year, month, 0))
}

export function cycleLength(pattern: PatternBlock[]): number {
  return pattern.reduce((sum, b) => sum + b.days, 0)
}

export function isValidScale(scale: WorkScale): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(scale.startDate) &&
    scale.pattern.length > 0 &&
    scale.pattern.every((b) => Number.isInteger(b.days) && b.days > 0 && b.categoryId) &&
    cycleLength(scale.pattern) > 0
  )
}

/** Escala vigente para a data: a de início mais recente entre as ativas e válidas. */
export function pickScale(scales: WorkScale[], date: string): WorkScale | null {
  const candidates = scales.filter((s) => isValidScale(s) && s.active && s.startDate <= date)
  if (candidates.length === 0) return null
  return candidates.reduce((best, s) =>
    s.startDate > best.startDate ||
    (s.startDate === best.startDate && s.createdAt > best.createdAt)
      ? s
      : best
  )
}

export function blockForScaleAt(scale: WorkScale, date: string): PatternBlock | null {
  const cycle = cycleLength(scale.pattern)
  if (cycle === 0) return null
  const offset = daysBetween(scale.startDate, date)
  if (offset < 0) return null
  let pos = offset % cycle
  for (const block of scale.pattern) {
    if (pos < block.days) return block
    pos -= block.days
  }
  return null
}

export function categoryForDate(
  date: string,
  scales: WorkScale[],
  categories: Category[]
): DayInfo {
  const scale = pickScale(scales, date)
  if (!scale) return { date, category: null, scale: null }
  const block = blockForScaleAt(scale, date)
  if (!block) return { date, category: null, scale }
  const category = categories.find((c) => c.id === block.categoryId) ?? null
  return { date, category, scale }
}

/**
 * Horas planejadas para um dia: jornada da escala (entrada/saída, com desconto
 * do intervalo) tem prioridade; sem ela, vale o hoursPerDay da categoria.
 */
export function plannedHours(info: DayInfo, breakMinutes = 0): number {
  const { category, scale } = info
  if (!category) return 0
  if (category.kind === 'work' && scale?.workStart && scale?.workEnd) {
    return workedHours(scale.workStart, scale.workEnd, breakMinutes) ?? category.hoursPerDay
  }
  return category.hoursPerDay
}

/** Grade do mês em semanas (domingo a sábado). Células preenchem bordas dos meses vizinhos. */
export function monthMatrix(year: number, month: number): MonthCell[][] {
  const first = startOfMonth(year, month)
  const last = endOfMonth(year, month)
  const firstDow = new Date(parseISO(first)).getUTCDay()
  const totalDays = daysBetween(first, last) + 1

  const cells: MonthCell[] = []
  for (let i = -firstDow; i < totalDays; i++) {
    const date = addDays(first, i)
    cells.push({ date, inMonth: i >= 0 && i < totalDays })
  }
  // completa a última semana com dias do mês seguinte
  let cursor = addDays(first, totalDays - 1)
  while (cells.length % 7 !== 0) {
    cursor = addDays(cursor, 1)
    cells.push({ date: cursor, inMonth: false })
  }
  const weeks: MonthCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function statsForRange(
  from: string,
  to: string,
  scales: WorkScale[],
  categories: Category[],
  breakMinutes = 0
): RangeStats {
  const byCategory = new Map<string, CategoryCount>()
  let totalDays = 0
  for (let ms = parseISO(from); ms <= parseISO(to); ms += MS_PER_DAY) {
    const date = toISO(ms)
    totalDays++
    const info = categoryForDate(date, scales, categories)
    const category = info.category
    if (!category) continue
    let entry = byCategory.get(category.id)
    if (!entry) {
      entry = { category, days: 0, hours: 0 }
      byCategory.set(category.id, entry)
    }
    entry.days++
    entry.hours += plannedHours(info, breakMinutes)
  }
  const counts = [...byCategory.values()].sort((a, b) => b.days - a.days)
  return { from, to, totalDays, counts }
}

export interface PresetBlock {
  categoryName: string
  kind: CategoryKind
  days: number
  hoursPerDay: number
  color: string
}

export interface PresetTemplate {
  id: string
  label: string
  blocks: PresetBlock[]
}

const WORK_COLOR = '#22c55e'
const OFF_COLOR = '#38bdf8'

export const PRESETS: PresetTemplate[] = [
  {
    id: '5x2',
    label: '5×2',
    blocks: [
      { categoryName: 'Trabalho', kind: 'work', days: 5, hoursPerDay: 8, color: WORK_COLOR },
      { categoryName: 'Folga', kind: 'off', days: 2, hoursPerDay: 0, color: OFF_COLOR }
    ]
  },
  {
    id: '6x1',
    label: '6×1',
    blocks: [
      { categoryName: 'Trabalho', kind: 'work', days: 6, hoursPerDay: 8, color: WORK_COLOR },
      { categoryName: 'Folga', kind: 'off', days: 1, hoursPerDay: 0, color: OFF_COLOR }
    ]
  },
  {
    id: '4x2',
    label: '4×2',
    blocks: [
      { categoryName: 'Trabalho', kind: 'work', days: 4, hoursPerDay: 8, color: WORK_COLOR },
      { categoryName: 'Folga', kind: 'off', days: 2, hoursPerDay: 0, color: OFF_COLOR }
    ]
  },
  {
    id: '12x36',
    label: '12×36',
    blocks: [
      { categoryName: 'Trabalho', kind: 'work', days: 12, hoursPerDay: 12, color: WORK_COLOR },
      { categoryName: 'Folga', kind: 'off', days: 36, hoursPerDay: 0, color: OFF_COLOR }
    ]
  },
  {
    id: '24x48',
    label: '24×48',
    blocks: [
      { categoryName: 'Plantonista', kind: 'work', days: 1, hoursPerDay: 24, color: WORK_COLOR },
      { categoryName: 'Folga', kind: 'off', days: 2, hoursPerDay: 0, color: OFF_COLOR }
    ]
  }
]

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
