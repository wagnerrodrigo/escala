/** Utilidades de jornada (entradas/saídas em "HH:MM"). Trabalha em minutos para evitar problemas de timezone. */

/** Converte "HH:MM" em minutos desde 00:00. Retorna null se inválido. */
export function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Minutos trabalhados entre entrada e saída, já descontando o intervalo.
 * Suporta virada de madrugada (saída <= entrada conta +24h).
 * Retorna null se algum horário for inválido.
 */
export function workedMinutes(
  entrada: string,
  saida: string,
  breakMinutes = 0
): number | null {
  const start = parseHHMM(entrada)
  const end = parseHHMM(saida)
  if (start === null || end === null) return null
  let raw = end - start
  if (raw <= 0) raw += 24 * 60
  const net = raw - breakMinutes
  return net < 0 ? 0 : net
}

/** Horas trabalhadas (decimal). Null se inválido. */
export function workedHours(
  entrada: string,
  saida: string,
  breakMinutes = 0
): number | null {
  const min = workedMinutes(entrada, saida, breakMinutes)
  return min === null ? null : min / 60
}

/** Soma horas de uma lista de [entrada, saida] ignorando registros inválidos. */
export function sumWorkedHours(
  punches: { entrada: string; saida: string }[],
  breakMinutes = 0
): number {
  let total = 0
  for (const p of punches) {
    const h = workedHours(p.entrada, p.saida, breakMinutes)
    if (h !== null) total += h
  }
  return Math.round(total * 100) / 100
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Diferença formatada com sinal, ex.: "+1h30", "-45min", "0". */
export function formatDelta(hours: number): string {
  const rounded = Math.round(hours * 100) / 100
  if (rounded === 0) return 'no ponto'
  const sign = rounded > 0 ? '+' : '-'
  return `${sign}${formatHours(Math.abs(rounded))}`
}
