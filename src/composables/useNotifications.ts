import { useEscalaStore } from '@/stores/escala'
import { addDays, categoryForDate, todayISO } from '@/engine/schedule'

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
    const infoToday = categoryForDate(today, store.activeScales, store.categories)
    const infoTomorrow = categoryForDate(tomorrow, store.activeScales, store.categories)

    if (infoToday.category?.kind === 'work') {
      await show('Hoje é dia de trabalho', `Turno: ${infoToday.category.name} (${infoToday.category.hoursPerDay}h)`)
    } else if (infoToday.category?.kind === 'off') {
      await show('Hoje é folga', 'Aproveite o descanso!')
    }
    if (infoTomorrow.category?.kind === 'work') {
      await show('Amanhã você trabalha', `${infoTomorrow.category.name} — prepare o uniforme!`)
    }
  }

  return { requestPermission, disable, checkDuty }
}
