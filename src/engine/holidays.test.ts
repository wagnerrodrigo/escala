import { describe, expect, it } from 'vitest'
import { brazilNationalHolidays, easterSunday, nationalHoliday, resolveHoliday } from './holidays'

describe('Páscoa (computus)', () => {
  it('datas conhecidas', () => {
    expect(easterSunday(2025)).toBe('2025-04-20')
    expect(easterSunday(2026)).toBe('2026-04-05')
    expect(easterSunday(2027)).toBe('2027-03-28')
  })
})

describe('feriados nacionais', () => {
  it('fixos do ano', () => {
    const h = brazilNationalHolidays(2026)
    expect(h['2026-01-01']?.name).toBe('Confraternização Universal')
    expect(h['2026-04-21']?.name).toBe('Tiradentes')
    expect(h['2026-11-20']?.name).toBe('Consciência Negra')
    expect(h['2026-12-25']?.name).toBe('Natal')
  })

  it('móveis derivados da Páscoa 2026 (5 de abril)', () => {
    const h = brazilNationalHolidays(2026)
    expect(h['2026-04-03']?.name).toBe('Paixão de Cristo') // sexta -2
    expect(h['2026-02-17']?.name).toBe('Carnaval') // terça -47
    expect(h['2026-06-04']?.name).toBe('Corpus Christi') // +60
  })

  it('nationalHoliday reconhece e ignora dias comuns', () => {
    expect(nationalHoliday('2026-05-01')?.name).toBe('Dia do Trabalhador')
    expect(nationalHoliday('2026-05-02')).toBeNull()
  })

  it('marca ponto facultativo corretamente', () => {
    expect(nationalHoliday('2026-02-17')?.kind).toBe('ponto-facultativo')
    expect(nationalHoliday('2026-04-03')?.kind).toBe('nacional')
  })
})

describe('resolveHoliday (nacional + personalizado)', () => {
  it('personalizado tem prioridade e aparece como municipal', () => {
    const r = resolveHoliday('2026-03-19', { '2026-03-19': 'São José (padroeiro da cidade)' })
    expect(r?.source).toBe('custom')
    expect(r?.name).toBe('São José (padroeiro da cidade)')
  })

  it('sem personalização cai no nacional', () => {
    const r = resolveHoliday('2026-12-25', {})
    expect(r?.source).toBe('nacional')
    expect(r?.name).toBe('Natal')
  })

  it('dia normal retorna null', () => {
    expect(resolveHoliday('2026-08-14', {})).toBeNull()
  })

  it('ponto facultativo some quando showFacultative=false', () => {
    expect(resolveHoliday('2026-02-17', {})?.name).toBe('Carnaval') // incluído por padrão
    expect(resolveHoliday('2026-02-17', {}, { showFacultative: false })).toBeNull()
    expect(resolveHoliday('2026-12-25', {}, { showFacultative: false })?.name).toBe('Natal') // nacional permanece
  })
})
