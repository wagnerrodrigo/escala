import { useEscalaStore } from '@/stores/escala'
import { addDays, categoryForDate, effectiveShift, plannedHours, todayISO } from '@/engine/schedule'

async function show(title: string, body: string) {
  const swReg = await navigator.serviceWorker?.getRegistration?.()
  if (swReg) {
    await swReg.showNotification(title, { body, icon: '/icons/icon-192.png' })
  } else {
    new Notification(title, { body, icon: '/icons/icon-192.png' })
  }
}

export function useNotifications() {
  const store = useEscalaStore()

  async function requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      await store.updateSettings({ notificationsEnabled: true })
      checkDuty()
      return true
    }
    return false
  }

  async function disable() {
    await store.updateSettings({ notificationsEnabled: false })
  }

  /** Avisa sobre o dia de hoje e se amanhã há plantão. Executa ao abrir o app. */
  async function checkDuty() {
    if (!('Notification' in window)) return
    if (!store.settings.notificationsEnabled || Notification.permission !== 'granted') return

    const today = todayISO()
    const tomorrow = addDays(today, 1)
    const infoToday = categoryForDate(today, store.activeScales, store.categories, store.categoryOverrides)
    const infoTomorrow = categoryForDate(tomorrow, store.activeScales, store.categories, store.categoryOverrides)

    if (infoToday.category?.kind === 'work') {
      const horas = plannedHours(infoToday, store.settings.breakMinutes, store.overrides)
      const shift = effectiveShift(today, infoToday.scale, store.overrides).shift
      const hol = store.holidayFor(today)
      const corpo = `${shift ? `Turno ${shift.start}→${shift.end}` : `Turno: ${infoToday.category.name} (${horas}h)`}${hol ? ` · feriado: ${hol.name}` : ''}`
      await show('Hoje é dia de trabalho', corpo)
    } else if (infoToday.category?.kind === 'off') {
      const hol = store.holidayFor(today)
      await show('Hoje é folga', hol ? `E é feriado: ${hol.name}. Aproveite!` : 'Aproveite o descanso!')
    } else if (!infoToday.category) {
      const hol = store.holidayFor(today)
      if (hol) await show('Hoje é feriado', hol.name)
    }
    if (infoTomorrow.category?.kind === 'work') {
      const shift = effectiveShift(tomorrow, infoTomorrow.scale, store.overrides).shift
      const hol = store.holidayFor(tomorrow)
      const corpo = `${shift ? `${shift.start}→${shift.end}` : infoTomorrow.category.name} — prepare o uniforme!${hol ? ` (feriado: ${hol.name})` : ''}`
      await show('Amanhã você trabalha', corpo)
    }
  }

  return { requestPermission, disable, checkDuty }
}
