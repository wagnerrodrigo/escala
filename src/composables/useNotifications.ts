import { useEscalaStore } from '@/stores/escala'
import { categoryForDate, effectiveShift, plannedHours, todayISO } from '@/engine/schedule'

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

  /** Notifica uma vez por dia, na primeira abertura: hoje é dia de trabalho ou folga. */
  async function checkDuty() {
    if (!('Notification' in window)) return
    if (!store.settings.notificationsEnabled || Notification.permission !== 'granted') return

    const today = todayISO()
    if (store.settings.lastNotifiedDate === today) return

    const info = categoryForDate(today, store.activeScales, store.categories, store.categoryOverrides)

    if (info.category?.kind === 'work') {
      const horas = plannedHours(info, store.settings.breakMinutes, store.overrides)
      const shift = effectiveShift(today, info.scale, store.overrides).shift
      const hol = store.holidayFor(today)
      const corpo = `${shift ? `Turno ${shift.start}→${shift.end}` : `Turno: ${info.category.name} (${horas}h)`}${hol ? ` · feriado: ${hol.name}` : ''}`
      await show('Hoje é dia de trabalho', corpo)
    } else if (info.category?.kind === 'off') {
      const hol = store.holidayFor(today)
      await show('Hoje é folga', hol ? `E é feriado: ${hol.name}. Aproveite!` : 'Aproveite o descanso!')
    } else {
      return
    }

    await store.updateSettings({ lastNotifiedDate: today })
  }

  return { requestPermission, disable, checkDuty }
}
