import { describe, expect, it } from 'vitest'
import {
  formatDelta,
  formatHours,
  parseHHMM,
  sumWorkedHours,
  workedHours,
  workedMinutes
} from './time'

describe('parseHHMM', () => {
  it('converte horários válidos em minutos', () => {
    expect(parseHHMM('00:00')).toBe(0)
    expect(parseHHMM('07:30')).toBe(450)
    expect(parseHHMM('23:59')).toBe(1439)
  })
  it('rejeita formatos inválidos', () => {
    expect(parseHHMM('24:00')).toBeNull()
    expect(parseHHMM('12:60')).toBeNull()
    expect(parseHHMM('7:5')).toBeNull()
    expect(parseHHMM('abc')).toBeNull()
  })
})

describe('workedMinutes', () => {
  it('computa jornada diurna simples', () => {
    expect(workedMinutes('08:00', '17:00', 60)).toBe(480) // 9h - 1h = 8h
  })

  it('desconta intervalo fixo', () => {
    expect(workedMinutes('07:00', '19:00', 60)).toBe(660) // 12h - 1h
    expect(workedMinutes('07:00', '19:00', 0)).toBe(720)
  })

  it('suporta virada de madrugada', () => {
    expect(workedMinutes('19:00', '07:00', 0)).toBe(720) // 12h
    expect(workedMinutes('22:00', '06:00', 60)).toBe(420) // 8h - 1h
  })

  it('nunca retorna negativo quando o intervalo excede o turno', () => {
    expect(workedMinutes('08:00', '08:30', 60)).toBe(0)
  })

  it('null com horário inválido', () => {
    expect(workedMinutes('', '17:00', 0)).toBeNull()
    expect(workedMinutes('08:00', '25:00', 0)).toBeNull()
  })
})

describe('workedHours', () => {
  it('converte para horas decimais', () => {
    expect(workedHours('19:00', '07:00', 0)).toBe(12)
    expect(workedHours('08:00', '16:45', 0)).toBe(8.75)
  })
})

describe('sumWorkedHours', () => {
  it('soma apenas registros válidos', () => {
    const punches = [
      { entrada: '08:00', saida: '17:00' }, // 9h
      { entrada: '19:00', saida: '07:00' }, // 12h
      { entrada: '', saida: '10:00' }, // inválido, ignora
      { entrada: '08:00', saida: '12:00' } // 4h
    ]
    expect(sumWorkedHours(punches, 0)).toBe(25)
  })
})

describe('formatação', () => {
  it('formatHours', () => {
    expect(formatHours(8)).toBe('8h')
    expect(formatHours(8.5)).toBe('8h30')
    expect(formatHours(0.75)).toBe('45min')
  })
  it('formatDelta com sinal', () => {
    expect(formatDelta(1.5)).toBe('+1h30')
    expect(formatDelta(-0.75)).toBe('-45min')
    expect(formatDelta(0)).toBe('no ponto')
  })
})
