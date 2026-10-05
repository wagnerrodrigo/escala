import { describe, expect, it } from 'vitest'
import type { Category, WorkScale } from '@/types'
import {
  addDays,
  blockForScaleAt,
  categoryForDate,
  cycleLength,
  daysBetween,
  effectiveShift,
  endOfMonth,
  isRotationConfigValid,
  monthMatrix,
  pickScale,
  plannedHours,
  rotationShift,
  statsForRange
} from './schedule'

const trabalho: Category = { id: 'cat-trab', name: 'Trabalho', kind: 'work', color: '#22c55e', hoursPerDay: 8 }
const folga: Category = { id: 'cat-folga', name: 'Folga', kind: 'off', color: '#38bdf8', hoursPerDay: 0 }
const ferias: Category = { id: 'cat-ferias', name: 'Férias', kind: 'other', color: '#f59e0b', hoursPerDay: 0 }
const categories = [trabalho, folga, ferias]

function scale(startDate: string, blocks: { categoryId: string; days: number }[], id = 'esc-1'): WorkScale {
  return { id, name: id, startDate, pattern: blocks, active: true, createdAt: 1 }
}

const s5x2 = scale('2026-01-05', [
  { categoryId: trabalho.id, days: 5 },
  { categoryId: folga.id, days: 2 }
])

const s12x36 = scale('2026-01-01', [
  { categoryId: trabalho.id, days: 12 },
  { categoryId: folga.id, days: 36 }
])

describe('datas', () => {
  it('daysBetween é exato entre meses e anos', () => {
    expect(daysBetween('2026-01-05', '2026-01-05')).toBe(0)
    expect(daysBetween('2026-01-05', '2026-02-01')).toBe(27)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2) // ano bissexto
  })

  it('addDays atravessa fronteiras de mês/ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('folga extra', () => {
  it('substitui somente a categoria do dia e não desloca o ciclo', () => {
    const categoryOverrides = [{ date: '2026-01-07', categoryId: folga.id }]

    expect(categoryForDate('2026-01-07', [s5x2], categories, categoryOverrides).category?.id).toBe(folga.id)
    expect(categoryForDate('2026-01-08', [s5x2], categories, categoryOverrides).category?.id).toBe(trabalho.id)
    expect(plannedHours(categoryForDate('2026-01-07', [s5x2], categories, categoryOverrides))).toBe(0)
  })
})

describe('motor de padrão', () => {
  it('5×2: dias 0-4 trabalho, 5-6 folga, ciclo reinicia', () => {
    expect(categoryForDate('2026-01-05', [s5x2], categories).category?.id).toBe(trabalho.id)
    expect(categoryForDate('2026-01-09', [s5x2], categories).category?.id).toBe(trabalho.id)
    expect(categoryForDate('2026-01-10', [s5x2], categories).category?.id).toBe(folga.id)
    expect(categoryForDate('2026-01-11', [s5x2], categories).category?.id).toBe(folga.id)
    expect(categoryForDate('2026-01-12', [s5x2], categories).category?.id).toBe(trabalho.id)
  })

  it('12×36 respeita o ciclo de 48 dias', () => {
    for (let d = 0; d < 12; d++) {
      expect(categoryForDate(addDays('2026-01-01', d), [s12x36], categories).category?.id).toBe(trabalho.id)
    }
    expect(categoryForDate('2026-01-13', [s12x36], categories).category?.id).toBe(folga.id)
    expect(categoryForDate('2026-02-17', [s12x36], categories).category?.id).toBe(folga.id) // último dia de folga (offset 47)
    expect(categoryForDate('2026-02-18', [s12x36], categories).category?.id).toBe(trabalho.id) // ciclo reinicia (offset 48)
    expect(cycleLength(s12x36.pattern)).toBe(48)
  })

  it('data anterior ao início não tem categoria', () => {
    const info = categoryForDate('2026-01-04', [s5x2], categories)
    expect(info.category).toBeNull()
    expect(info.scale).toBeNull()
    expect(blockForScaleAt(s5x2, '2026-01-04')).toBeNull()
  })

  it('pickScale escolhe a escala vigente mais recente', () => {
    const nova = scale('2026-03-01', [{ categoryId: ferias.id, days: 30 }], 'esc-2')
    const scales = [s5x2, nova]
    expect(pickScale(scales, '2026-02-28')?.id).toBe('esc-1')
    expect(pickScale(scales, '2026-03-15')?.id).toBe('esc-2')
    expect(pickScale(scales, '2026-03-15') && categoryForDate('2026-03-15', scales, categories).category?.id).toBe(ferias.id)
  })

  it('escala inativa ou inválida é ignorada', () => {
    const inativa = { ...s5x2, id: 'esc-in', active: false }
    const invalida: WorkScale = { id: 'esc-inv', name: 'x', startDate: '2026-01-01', pattern: [], active: true, createdAt: 0 }
    expect(categoryForDate('2026-01-06', [inativa, invalida], categories).category).toBeNull()
  })
})

describe('grade do mês', () => {
  it('setembro/2026 começa na semana do dia 1 e cobre todo o mês', () => {
    const weeks = monthMatrix(2026, 9)
    const flat = weeks.flat()
    expect(flat[0].date).toBe('2026-08-30') // domingo
    expect(flat.filter((c) => c.inMonth).length).toBe(30)
    expect(flat.filter((c) => c.inMonth)[0].date).toBe('2026-09-01')
    expect(flat[flat.length - 1].date >= endOfMonth(2026, 9)).toBe(true)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('fevereiro de ano comum gera 4 semanas', () => {
    const weeks = monthMatrix(2026, 2)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    expect(weeks.flat().filter((c) => c.inMonth).length).toBe(28)
  })
})

describe('estatísticas', () => {
  it('soma dias e horas no intervalo de um mês', () => {
    const stats = statsForRange('2026-09-01', '2026-09-30', [s5x2], categories)
    expect(stats.totalDays).toBe(30)
    const total = stats.counts.reduce((s, c) => s + c.days, 0)
    expect(total).toBe(30)
    const trab = stats.counts.find((c) => c.category.id === trabalho.id)
    expect(trab?.hours).toBe((trab?.days ?? 0) * 8)
  })

  it('dia sem escala conta como não classificado', () => {
    // escala começa em 2026-01-05; 03 e 04 ficam antes do início
    const stats = statsForRange('2026-01-03', '2026-01-06', [s5x2], categories)
    expect(stats.totalDays).toBe(4)
    const classified = stats.counts.reduce((s, c) => s + c.days, 0)
    expect(stats.totalDays - classified).toBe(2) // 03 e 04 de janeiro
  })
})

describe('jornada da escala (plannedHours)', () => {
  const sComJornada: WorkScale = {
    ...s5x2,
    id: 'esc-jornada',
    workStart: '07:00',
    workEnd: '19:00'
  }
  const sNoturno: WorkScale = {
    ...s5x2,
    id: 'esc-noturno',
    workStart: '19:00',
    workEnd: '07:00'
  }

  it('jornada da escala tem prioridade sobre hoursPerDay da categoria', () => {
    const info = categoryForDate('2026-01-05', [sComJornada], categories)
    expect(plannedHours(info, 0)).toBe(12) // categoria diria 8
  })

  it('desconta o intervalo fixo', () => {
    const info = categoryForDate('2026-01-05', [sComJornada], categories)
    expect(plannedHours(info, 60)).toBe(11)
  })

  it('suporta virada noturna', () => {
    const info = categoryForDate('2026-01-05', [sNoturno], categories)
    expect(plannedHours(info, 60)).toBe(11) // 19:00→07:00 = 12h - 1h
  })

  it('fallback: sem jornada usa hoursPerDay da categoria', () => {
    const info = categoryForDate('2026-01-05', [s5x2], categories)
    expect(plannedHours(info, 60)).toBe(8)
  })

  it('dia de folga tem 0 horas planejadas', () => {
    const info = categoryForDate('2026-01-10', [sComJornada], categories)
    expect(plannedHours(info, 60)).toBe(0)
  })

  it('statsForRange reflete a jornada e o intervalo', () => {
    const stats = statsForRange('2026-01-05', '2026-01-09', [sComJornada], categories, 60)
    const trab = stats.counts.find((c) => c.category.id === trabalho.id)
    expect(trab?.days).toBe(5)
    expect(trab?.hours).toBe(55) // 5 dias x 11h
  })
})

describe('rotação automática de turno', () => {
  const rot = {
    enabled: true,
    periodDays: 45,
    shifts: [
      { start: '14:00', end: '22:30' },
      { start: '22:00', end: '05:30' },
      { start: '05:30', end: '14:00' }
    ]
  }
  const sRot: WorkScale = {
    ...s5x2,
    id: 'esc-rot',
    startDate: '2026-01-01',
    workStart: '14:00',
    workEnd: '22:30',
    shiftRotation: rot
  }

  it('aplica cada turno por 45 dias e cicla após o último', () => {
    expect(rotationShift(sRot, '2026-01-01')?.start).toBe('14:00') // offset 0
    expect(rotationShift(sRot, addDays('2026-01-01', 44))?.start).toBe('14:00')
    expect(rotationShift(sRot, addDays('2026-01-01', 45))?.start).toBe('22:00') // turno 2
    expect(rotationShift(sRot, addDays('2026-01-01', 89))?.start).toBe('22:00')
    expect(rotationShift(sRot, addDays('2026-01-01', 90))?.start).toBe('05:30') // turno 3
    expect(rotationShift(sRot, addDays('2026-01-01', 134))?.start).toBe('05:30')
    expect(rotationShift(sRot, addDays('2026-01-01', 135))?.start).toBe('14:00') // reinicia o ciclo
    expect(rotationShift(sRot, '2025-12-31')).toBeNull() // antes do início
  })

  it('horas planejadas acompanham o turno vigente', () => {
    const d1 = categoryForDate('2026-01-01', [sRot], categories) // offset 0 = trabalho
    expect(plannedHours(d1, 60)).toBe(7.5) // 14:00→22:30 = 8h30 - 1h de intervalo
    const dia46 = categoryForDate(addDays('2026-01-01', 45), [sRot], categories)
    expect(plannedHours(dia46, 0)).toBe(7.5) // 22:00→05:30 = 7h30, sem intervalo
  })

  it('rotação incompleta ou com 4 turnos é ignorada (cai no padrão)', () => {
    const incompleta: WorkScale = {
      ...sRot,
      id: 'r1',
      shiftRotation: { enabled: true, periodDays: 45, shifts: [{ start: '08:00', end: '' }] }
    }
    expect(isRotationConfigValid(incompleta.shiftRotation)).toBe(false)
    expect(rotationShift(incompleta, '2026-01-01')).toBeNull()
    const info = categoryForDate('2026-01-01', [incompleta], categories)
    expect(plannedHours(info, 0)).toBe(8.5) // usa o workStart/workEnd da escala

    const quatroTurnos: WorkScale = {
      ...sRot,
      id: 'r2',
      shiftRotation: { enabled: true, periodDays: 45, shifts: [...rot.shifts, { start: '06:00', end: '14:00' }] }
    }
    expect(isRotationConfigValid(quatroTurnos.shiftRotation)).toBe(false)
  })

  it('rotação com 1 ou 2 turnos é válida e funciona', () => {
    const dois: WorkScale = {
      ...sRot,
      id: 'r3',
      shiftRotation: { enabled: true, periodDays: 10, shifts: rot.shifts.slice(0, 2) }
    }
    expect(isRotationConfigValid(dois.shiftRotation)).toBe(true)
    expect(rotationShift(dois, addDays('2026-01-01', 12))?.start).toBe('22:00')
    expect(rotationShift(dois, addDays('2026-01-01', 25))?.start).toBe('14:00')
  })
})

describe('ajuste individual do dia (override)', () => {
  const sPadrao: WorkScale = {
    ...s5x2,
    id: 'esc-padrao',
    startDate: '2026-01-01',
    workStart: '14:00',
    workEnd: '22:30'
  }
  const sRot2: WorkScale = {
    ...s5x2,
    id: 'esc-rot2',
    startDate: '2026-01-01',
    workStart: '14:00',
    workEnd: '22:30',
    shiftRotation: {
      enabled: true,
      periodDays: 45,
      shifts: [
        { start: '14:00', end: '22:30' },
        { start: '22:00', end: '05:30' }
      ]
    }
  }

  it('override vence a rotação e o padrão', () => {
    const overrides = [{ date: '2026-01-03', start: '06:00', end: '10:00' }]
    const eff = effectiveShift('2026-01-03', sRot2, overrides)
    expect(eff.source).toBe('override')
    const info = categoryForDate('2026-01-03', [sRot2], categories)
    expect(plannedHours(info, 0, overrides)).toBe(4)
  })

  it('fontes automáticas: rotação e padrão da escala', () => {
    expect(effectiveShift('2026-01-01', sRot2, []).source).toBe('rotation')
    expect(effectiveShift('2026-01-01', sPadrao, []).source).toBe('default')
    expect(effectiveShift('2026-01-01', s5x2, []).source).toBeNull() // sem jornada nem rotação
    expect(effectiveShift('2026-01-01', null, []).source).toBeNull()
  })

  it('statsForRange aplica override apenas no dia certo', () => {
    const overrides = [{ date: '2026-01-05', start: '08:00', end: '12:00' }]
    // 05 trab (override 4h) · 06-07 folga · 08 trab (rotação 14:00→22:30 = 8,5h)
    const stats = statsForRange('2026-01-05', '2026-01-08', [sRot2], categories, 0, overrides)
    const trab = stats.counts.find((c) => c.category.id === trabalho.id)
    expect(trab?.hours).toBe(12.5)
  })
})
