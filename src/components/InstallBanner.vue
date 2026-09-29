<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEscalaStore } from '@/stores/escala'
import { useInstallPrompt } from '@/composables/useInstallPrompt'

const store = useEscalaStore()
const { canInstall, installed, showIosHint, install } = useInstallPrompt()
const dismissed = ref(false)

const visible = computed(
  () =>
    !dismissed.value &&
    store.loaded &&
    store.settings.onboardingDone &&
    !installed.value &&
    (canInstall.value || showIosHint.value)
)

async function onInstall() {
  await install()
}
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="install-banner">
      <span class="ic" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M12 2a2 2 0 0 1 2 2v1h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2zM9 9v2h6V9h3v9H6V9h3z" />
        </svg>
      </span>
      <div class="txt">
        <strong>Instalar o Escala</strong>
        <p v-if="canInstall" class="muted">Funciona 100% offline, direto na tela inicial.</p>
        <p v-else class="muted">
          Toque em <b>Compartilhar</b> ⬆️ e depois em <b>“Adicionar à Tela de Início”</b>.
        </p>
      </div>
      <button v-if="canInstall" class="btn small primary" @click="onInstall">Instalar</button>
      <button class="x" aria-label="Dispensar" @click="dismissed = true">✕</button>
    </div>
  </Transition>
</template>

<style scoped>
.install-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #1e293b, #16223a);
  border: 1px solid #34d3994d;
  border-radius: var(--radius);
  padding: 12px;
  margin-bottom: 12px;
}

.ic {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 10px;
  background: #34d39922;
  color: var(--accent);
}

.txt {
  flex: 1;
  min-width: 0;
}

.txt strong {
  font-size: 14px;
}

.txt p {
  margin: 2px 0 0;
  font-size: 12px;
}

.x {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
