export type CategoryKind = 'work' | 'off' | 'other'

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  color: string
  hoursPerDay: number
}

export interface PatternBlock {
  categoryId: string
  days: number
}

export interface WorkScale {
  id: string
  name: string
  startDate: string
  pattern: PatternBlock[]
  active: boolean
  createdAt: number
  /** Jornada de trabalho ("HH:MM"). Opcional — sem ela vale o hoursPerDay da categoria. */
  workStart?: string
  workEnd?: string
}

export interface DayInfo {
  date: string
  category: Category | null
  scale: WorkScale | null
}

export interface MonthCell {
  date: string
  inMonth: boolean
}

export interface CategoryCount {
  category: Category
  days: number
  hours: number
}

export interface Punch {
  date: string
  entrada: string
  saida: string
}

export interface RangeStats {
  from: string
  to: string
  totalDays: number
  counts: CategoryCount[]
}
