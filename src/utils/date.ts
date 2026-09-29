const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[new Date(toUTCMs(iso)).getUTCDay()]
}

export function isWeekend(iso: string): boolean {
  const dow = new Date(toUTCMs(iso)).getUTCDay()
  return dow === 0 || dow === 6
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1][0].toUpperCase()}${MONTHS[month - 1].slice(1)} de ${year}`
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} de ${MONTHS[m - 1]} de ${y}`
}

export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

function toUTCMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
