import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'calendar', component: () => import('@/views/CalendarView.vue'), meta: { tab: 'calendar' } },
    { path: '/estatisticas', name: 'stats', component: () => import('@/views/StatsView.vue'), meta: { tab: 'stats' } },
    { path: '/escala', name: 'scales', component: () => import('@/views/ScalesView.vue'), meta: { tab: 'scales' } },
    { path: '/ajustes', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { tab: 'settings' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

export default router
