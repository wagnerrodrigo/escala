<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DayInfo } from '@/types'
import { categoryForDate, endOfMonth, startOfMonth, statsForRange, todayISO } from '@/engine/schedule'
import { useEscalaStore } from '@/stores/escala'
import { useShare } from '@/composables/useShare'
import { monthLabel } from '@/utils/date'
import CalendarMonth from '@/components/CalendarMonth.vue'
import LegendBar from '@/components/LegendBar.vue'
import DayDetailSheet from '@/components/DayDetailSheet.vue'
import InstallBanner from '@/components/InstallBanner.vue'

const store = useEscalaStore()
const { exportCalendar } = useShare()

const today = todayISO()
const [ty, tm] = today.split('-').map(Number)
const year = ref(ty)
const month = ref(tm)
const selected = ref<DayInfo | null>(null)
const exporting = ref(false)
const exportArea = ref<HTMLElement | null>(null)

const monthInfo = computed(() => `${String(month.value).padStart(2, '0')}`)

function shift(delta: number) {
  let m = month.value + delta
  if (m < 1) { m = 12; year.value-- }
  if (m > 12) { m = 1; year.value++ }
  month.value = m
}

const todayInfo = computed(() =>
  categoryForDate(today, store.activeScales, store.categories)
)

const monthStats = computed(() =>
  statsForRange(startOfMonth(year.value, month.value), endOfMonth(year.value, month.value), store.activeScales, store.categories)
)

const workDays = computed(() =>
  monthStats.value.counts.filter((c) => c.category.kind === 'work').reduce((s, c) => s + c.days, 0)
)
const workHours = computed(() =>
  monthStats.value.counts.filter((c) => c.category.kind === 'work').reduce((s, c) => s + c.hours, 0)
)

const noScales = computed(() => store.loaded && store.activeScales.length === 0)

async function onExport() {
  if (!exportArea.value) return
  exporting.value = true
  try {
    await exportCalendar(exportArea.value, `escala-${year.value}-${monthInfo.value}.png`, `Escala — ${monthLabel(year.value, month.value)}`)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div>
    <InstallBanner />

    <div v-if="noScales" class="card empty">
      <h2>Bem-vindo 👋</h2>
      <p class="muted">Você ainda não cadastrou nenhuma escala. Crie a sua primeira para ver o calendário preenchido automaticamente.</p>
      <RouterLink to="/escala"><button class="btn primary">Criar minha escala</button></RouterLink>
    </div>

    <template v-else>
      <div class="today-banner card" v-if="todayInfo.category">
        <span class="dot" :style="{ background: todayInfo.category.color }"></span>
        <div>
          <strong>Hoje: {{ todayInfo.category.name }}</strong>
          <div class="muted" v-if="todayInfo.category.kind === 'work'">{{ todayInfo.category.hoursPerDay }}h de turno</div>
          <div class="muted" v-else>Dia de descanso</div>
        </div>
        <div class="month-counts">
          <div><b>{{ workDays }}</b><span>dias trab.</span></div>
          <div><b>{{ workHours }}h</b><span>no mês</span></div>
        </div>
      </div>

      <div ref="exportArea" class="card calendar-card">
        <div class="month-nav">
          <button class="icon-btn" @click="shift(-1)" aria-label="Mês anterior">‹</button>
          <h2>{{ monthLabel(year, month) }}</h2>
          <button class="icon-btn" @click="shift(1)" aria-label="Próximo mês">›</button>
        </div>
        <button v-if="`${year}-${monthInfo}` !== today.slice(0, 7)" class="btn small today-btn" @click="year = ty; month = tm">Ir para hoje</button>
        <CalendarMonth :year="year" :month="month" @select="selected = $event" />
        <LegendBar />
      </div>

      <button class="btn" style="width: 100%" :disabled="exporting" @click="onExport">
        {{ exporting ? 'Gerando imagem…' : '📷 Exportar mês como imagem' }}
      </button>
    </template>

    <DayDetailSheet v-if="selected" :info="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
.empty h2 {
  margin: 4px 0 8px;
}

.today-banner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-counts {
  margin-left: auto;
  display: flex;
  gap: 16px;
  text-align: center;
}

.month-counts b {
  display: block;
  font-size: 18px;
  color: var(--accent);
}

.month-counts span {
  font-size: 11px;
  color: var(--muted);
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.month-nav h2 {
  margin: 0;
  font-size: 17px;
}

.today-btn {
  margin: 0 auto 10px;
  display: block;
}

.calendar-card {
  box-shadow: var(--shadow);
}
</style>
