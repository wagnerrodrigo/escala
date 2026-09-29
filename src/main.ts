import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useEscalaStore } from './stores/escala'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const store = useEscalaStore(pinia)
await store.load()

app.mount('#app')
