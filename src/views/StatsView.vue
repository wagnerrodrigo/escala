<script setup lang="ts">
import { computed, ref } from 'vue'
import { endOfMonth, startOfMonth, statsForRange, todayISO } from '@/engine/schedule'
import { useEscalaStore } from '@/stores/escala'
import { monthLabel } from '@/utils/date'

const store = useEscalaStore()
const today = todayISO()
const [ty, tm] = today.split('-').map(Number)
const year = ref(ty)
const month = ref(tm)

function shift(delta: number) {
  let m = month.value + delta
  if (m < 1) { m = 12; year.value-- }
  if (m > 12) { m = 1; year.value++ }
  month.value = m
}

const monthStats = computed(() =>
  statsForRange(
    startOfMonth(year.value, month.value),
    endOfMonth(year.value, month.value),
    store.activeScales,
    store.categories
  )
)

const yearStats = computed(() =>
  statsForRange(
    startOfMonth(year.value, 1),
    endOfMonth(year.value, 12),
    store.activeScales,
    store.categories
  )
)

const workDays = computed(() => monthStats.value.counts.filter((c) => c.category.kind === 'work').reduce((s, c) => s + c.days, 0))
const workHours = computed(() => monthStats.value.counts.filter((c) => c.category.kind === 'work').reduce((s, c) => s + c.hours, 0))
const offDays = computed(() => monthStats.value.counts.filter((c) => c.category.kind === 'off').reduce((s, c) => s + c.days, 0))
const unclassified = computed(() => monthStats.value.totalDays - monthStats.value.counts.reduce((s, c) => s + c.days, 0))

const maxDays = computed(() => Math.max(1, ...monthStats.value.counts.map((c) => c.days)))
</script>

<template>
  <div>
    <div v-if="store.activeScales.length === 0" class="card">
      <p class="muted">Sem escala ativa — cadastre uma na aba <RouterLink to="/escala" style="color: var(--accent)">Escala</RouterLink>.</p>
    </div>

    <template v-else>
      <div class="month-nav">
        <button class="icon-btn" @click="shift(-1)">‹</button>
        <h2>{{ monthLabel(year, month) }}</h2>
        <button class="icon-btn" @click="shift(1)">›</button>
      </div>

      <div class="cards">
        <div class="card stat">
          <b class="accent">{{ workDays }}</b>
          <span>dias trabalhados</span>
        </div>
        <div class="card stat">
          <b class="accent">{{ workHours }}h</b>
          <span>horas no mês</span>
        </div>
        <div class="card stat">
          <b>{{ offDays }}</b>
          <span>folgas</span>
        </div>
        <div class="card stat">
          <b>{{ unclassified }}</b>
          <span>sem escala</span>
        </div>
      </div>

      <h3 class="section-title">Detalhamento do mês</h3>
      <div class="card">
        <div v-for="c in monthStats.counts" :key="c.category.id" class="bar-row">
          <div class="bar-label">
            <span class="dot" :style="{ background: c.category.color }"></span>
            {{ c.category.name }}
            <em>{{ c.days }} dias<i v-if="c.hours"> · {{ c.hours }}h</i></em>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: (c.days / maxDays) * 100 + '%', background: c.category.color }"></div>
          </div>
        </div>
        <p v-if="monthStats.counts.length === 0" class="muted">Nenhum dia classificado neste mês.</p>
      </div>

      <h3 class="section-title">Acumulado em {{ year }}</h3>
      <div class="card">
        <div v-for="c in yearStats.counts" :key="c.category.id" class="year-row">
          <span class="dot" :style="{ background: c.category.color }"></span>
          <span class="yr-name">{{ c.category.name }}</span>
          <span class="yr-days">{{ c.days }} dias</span>
          <span class="yr-hours" v-if="c.hours">{{ c.hours }}h</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.month-nav h2 { margin: 0; font-size: 17px; }

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cards .card { margin-bottom: 0; }

.stat { text-align: center; }

.stat b {
  display: block;
  font-size: 26px;
}

.stat b.accent { color: var(--accent); }

.stat span {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.bar-row { margin-bottom: 12px; }
.bar-row:last-child { margin-bottom: 0; }

.bar-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 5px;
}

.bar-label em {
  margin-left: auto;
  font-style: normal;
  color: var(--muted);
  font-weight: 600;
  font-size: 12px;
}

.bar-label i { font-style: normal; }

.bar-track {
  height: 8px;
  border-radius: 999px;
  background: var(--card-2);
  overflow: hidden;
}

.bar-fill { height: 100%; border-radius: 999px; }

.year-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}

.year-row:last-child { border-bottom: none; }

.yr-name { font-weight: 600; }
.yr-days { margin-left: auto; color: var(--muted); }
.yr-hours { width: 64px; text-align: right; color: var(--accent); font-weight: 700; }
</style>
