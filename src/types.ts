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

export interface ShiftOption {
  start: string
  end: string
}

/** Rotação automática de horário: cada turno vale `periodDays` dias a partir do início da escala. */
export interface ShiftRotation {
  enabled: boolean
  periodDays: number
  shifts: ShiftOption[]
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
  /** Mudança automática de turno (opcional). */
  shiftRotation?: ShiftRotation
}

/** Horário personalizado de um dia específico (tem prioridade sobre a rotação e o padrão). */
export interface DayOverride {
  date: string
  start: string
  end: string
}

/** Feriado municipal/estadual/empresarial cadastrado pelo usuário. */
export interface CustomHoliday {
  date: string
  name: string
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
