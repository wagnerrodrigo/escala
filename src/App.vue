<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { registerSW } from 'virtual:pwa-register'
import { useEscalaStore } from '@/stores/escala'
import { useNotifications } from '@/composables/useNotifications'

const route = useRoute()
const store = useEscalaStore()
const { checkDuty } = useNotifications()

const needRefresh = ref(false)

const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {},
  onNeedRefresh() {
    needRefresh.value = true
  }
})

onMounted(async () => {
  await store.load()
  checkDuty()
})

const tabs = [
  {
    name: 'calendar',
    label: 'Calendário',
    path: '/',
    icon: 'M7 2v2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM3 11v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9H3z'
  },
  {
    name: 'stats',
    label: 'Resumo',
    path: '/estatisticas',
    icon: 'M4 20V10h3v10H4zm6.5 0V4h3v16h-3zM17 20v-7h3v7h-3z'
  },
  {
    name: 'scales',
    label: 'Escala',
    path: '/escala',
    icon: 'M4 6h16v3H4V6zm0 5h16v3H4v-3zm0 5h10v3H4v-3z'
  },
  {
    name: 'settings',
    label: 'Ajustes',
    path: '/ajustes',
    icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.4 4l1.6 1.3-1 2.4-2-.5-1.4 1.2-.3 2.1h-2.6l-.3-2.1-1.4-1.2-2 .5-1-2.4L12 12l-1.6-1.3 1-2.4 2 .5L14.8 7.6l.3-2.1h2.6l.3 2.1 1.4 1.2 2-.5 1 2.4L20.4 12z'
  }
]
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark">E</span>
        <span>Escala</span>
      </div>
      <span class="muted" v-if="store.scales.length">
        {{ store.activeScales.length ? 'escala ativa' : 'sem escala ativa' }}
      </span>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <nav class="tabbar">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab"
        :class="{ active: route.name === tab.name }"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path :d="tab.icon" />
        </svg>
        <span>{{ tab.label }}</span>
      </RouterLink>
    </nav>

    <div v-if="needRefresh" class="update-toast">
      Nova versão disponível
      <button @click="updateSW(true)">Atualizar</button>
    </div>
  </div>
</template>
