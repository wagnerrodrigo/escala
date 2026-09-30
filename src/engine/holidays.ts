import { addDays, parseISO, toISO } from './schedule'

export interface Holiday {
  name: string
  /** 'nacional' | 'municipal' | 'estadual' | 'ponto-facultativo' */
  kind: HolidayKind
  movable: boolean
}

export type HolidayKind = 'nacional' | 'municipal' | 'estadual' | 'ponto-facultativo'

/** Páscoa (Domingo) via algoritmo de Meeus/Jones/Butcher (Gregoriano). Retorna ISO. */
export function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return toISO(Date.UTC(year, month - 1, day))
}

function shiftFromEaster(year: number, days: number): string {
  return addDays(easterSunday(year), days)
}

/** Feriados nacionais do Brasil + móveis (relativos à Páscoa) para um ano. */
export function brazilNationalHolidays(year: number): Record<string, Holiday> {
  const fixed: Record<string, Holiday> = {
    [`${year}-01-01`]: { name: 'Confraternização Universal', kind: 'nacional', movable: false },
    [`${year}-04-21`]: { name: 'Tiradentes', kind: 'nacional', movable: false },
    [`${year}-05-01`]: { name: 'Dia do Trabalhador', kind: 'nacional', movable: false },
    [`${year}-09-07`]: { name: 'Independência do Brasil', kind: 'nacional', movable: false },
    [`${year}-10-12`]: { name: 'Nossa Senhora Aparecida', kind: 'nacional', movable: false },
    [`${year}-11-02`]: { name: 'Finados', kind: 'nacional', movable: false },
    [`${year}-11-15`]: { name: 'Proclamação da República', kind: 'nacional', movable: false },
    [`${year}-11-20`]: { name: 'Consciência Negra', kind: 'nacional', movable: false },
    [`${year}-12-25`]: { name: 'Natal', kind: 'nacional', movable: false }
  }
  const movable: Record<string, Holiday> = {
    [shiftFromEaster(year, -48)]: { name: 'Carnaval', kind: 'ponto-facultativo', movable: true },
    [shiftFromEaster(year, -47)]: { name: 'Carnaval', kind: 'ponto-facultativo', movable: true },
    [shiftFromEaster(year, -2)]: { name: 'Paixão de Cristo', kind: 'nacional', movable: true },
    [shiftFromEaster(year, 60)]: { name: 'Corpus Christi', kind: 'ponto-facultativo', movable: true }
  }
  return { ...fixed, ...movable }
}

const cache = new Map<number, Record<string, Holiday>>()

function holidaysForYear(year: number): Record<string, Holiday> {
  let map = cache.get(year)
  if (!map) {
    map = brazilNationalHolidays(year)
    cache.set(year, map)
  }
  return map
}

/** Feriado nacional/móvel de uma data ISO, ou null. */
export function nationalHoliday(dateISO: string): Holiday | null {
  const year = Number(dateISO.slice(0, 4))
  return holidaysForYear(year)[dateISO] ?? null
}

export interface ResolvedHoliday extends Holiday {
  date: string
  source: 'nacional' | 'custom'
}

export interface ResolveOpts {
  showFacultative?: boolean
}

/**
 * Resolve o feriado de um dia combinando nacionais (automáticos) e personalizados.
 * Personalizados têm prioridade. Retorna null em dia comum.
 */
export function resolveHoliday(
  dateISO: string,
  custom: Record<string, string> = {},
  opts: ResolveOpts = {}
): ResolvedHoliday | null {
  const customName = custom[dateISO]
  if (customName) {
    return {
      date: dateISO,
      name: customName,
      kind: 'municipal',
      movable: false,
      source: 'custom'
    }
  }
  const nat = nationalHoliday(dateISO)
  if (!nat) return null
  if (nat.kind === 'ponto-facultativo' && opts.showFacultative === false) return null
  return { date: dateISO, ...nat, source: 'nacional' }
}

/** Data ISO a partir de parseISO re-exportado para conveniência dos consumidores. */
export function holidayKey(dateISO: string): string {
  return toISO(parseISO(dateISO))
}
