<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Category } from '@/types'
import { db, DEFAULT_CATEGORIES } from '@/db/database'
import { uid } from '@/engine/schedule'
import { useEscalaStore } from '@/stores/escala'
import { useNotifications } from '@/composables/useNotifications'

const store = useEscalaStore()
const { requestPermission, disable } = useNotifications()

const notifSupported = typeof window !== 'undefined' && 'Notification' in window

const statusText = computed(() => {
  if (!notifSupported) return 'Seu navegador não suporta notificações.'
  if (!store.settings.notificationsEnabled) return 'Desativadas.'
  return 'Ativas — lembretes de plantão ao abrir o app.'
})

const permDenied = ref(false)

async function enableNotifications() {
  const ok = await requestPermission()
  permDenied.value = !ok && Notification.permission === 'denied'
}

function categoryUsed(id: string): boolean {
  return store.scales.some((s) => s.pattern.some((b) => b.categoryId === id))
}

async function saveCat(cat: Category) {
  await store.saveCategory({ ...cat })
}

async function removeCat(cat: Category) {
  if (categoryUsed(cat.id)) return
  if (confirm(`Excluir a categoria "${cat.name}"?`)) await store.deleteCategory(cat.id)
}

async function resetCats() {
  if (!confirm('Restaurar categorias padrão? Escalas existentes que usam categorias customizadas podem ficar com blocos sem categoria.')) return
  for (const c of DEFAULT_CATEGORIES) await store.saveCategory({ ...c })
}

const newCat = reactive({ name: '', kind: 'other' as Category['kind'], color: '#8b5cf6', hoursPerDay: 8 })

async function addCategory() {
  if (!newCat.name.trim()) return
  await store.saveCategory({
    id: uid(),
    name: newCat.name.trim(),
    kind: newCat.kind,
    color: newCat.color,
    hoursPerDay: newCat.kind === 'work' ? newCat.hoursPerDay : 0
  })
  newCat.name = ''
}

async function wipeAll() {
  if (!confirm('Apagar TODAS as escalas, categorias e ajustes? Não há como desfazer.')) return
  await db.delete()
  location.reload()
}
</script>

<template>
  <div>
    <h3 class="section-title">Notificações de plantão</h3>
    <div class="card">
      <p class="muted" style="margin-top: 0">{{ statusText }}</p>
      <p class="muted">O app avisa “hoje é dia de trabalho” e “amanhã você trabalha” quando você o abre. Sem servidor, não é possível enviar push com o app totalmente fechado.</p>
      <div style="display: flex; gap: 8px">
        <button v-if="!store.settings.notificationsEnabled" class="btn primary small" :disabled="!notifSupported || permDenied" @click="enableNotifications">Ativar notificações</button>
        <button v-else class="btn small" @click="disable">Desativar</button>
      </div>
      <p v-if="permDenied" class="err">Permissão bloqueada no navegador — libere em Configurações do site.</p>
    </div>

    <h3 class="section-title">Categorias</h3>
    <div class="card">
      <div v-for="c in store.categories" :key="c.id" class="cat-row">
        <input
          type="color"
          :value="c.color"
          @change="saveCat({ ...c, color: ($event.target as HTMLInputElement).value })"
          aria-label="Cor"
        />
        <input
          class="cat-name"
          :value="c.name"
          @change="saveCat({ ...c, name: ($event.target as HTMLInputElement).value })"
        />
        <input
          v-if="c.kind === 'work'"
          class="cat-hours"
          type="number"
          min="0"
          max="24"
          :value="c.hoursPerDay"
          @change="saveCat({ ...c, hoursPerDay: Number(($event.target as HTMLInputElement).value) || 0 })"
        />
        <button class="icon-btn" :disabled="categoryUsed(c.id)" :title="categoryUsed(c.id) ? 'Em uso em alguma escala' : 'Excluir'" @click="removeCat(c)">🗑</button>
      </div>

      <div class="cat-row add-row">
        <input v-model="newCat.color" type="color" aria-label="Cor" />
        <input class="cat-name" v-model="newCat.name" placeholder="Nova categoria" />
        <select v-model="newCat.kind">
          <option value="work">trabalho</option>
          <option value="off">folga</option>
          <option value="other">outro</option>
        </select>
        <button class="btn small" @click="addCategory">+</button>
      </div>
      <button class="btn small" style="margin-top: 10px" @click="resetCats">Restaurar padrão</button>
    </div>

    <h3 class="section-title">Dados</h3>
    <div class="card">
      <p class="muted" style="margin-top: 0">Tudo é salvo neste dispositivo (IndexedDB) — o app funciona 100% offline.</p>
      <button class="btn danger" @click="wipeAll">Apagar todos os dados</button>
    </div>

    <p class="muted about">Escala · PWA v1.0.0 · Vue 3 + Vite</p>
  </div>
</template>

<style scoped>
.cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cat-name {
  flex: 1;
}

.cat-hours {
  width: 70px;
}

.add-row select {
  width: 110px;
}

.err {
  color: var(--danger);
  font-size: 13px;
}

.about {
  text-align: center;
  margin-top: 20px;
}
</style>
