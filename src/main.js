import { createApp } from 'vue'
import './style.css'
import './styles/layout-fix.css'
import App from './App.vue'
import router from './router/index.js'

const app = createApp(App)
app.use(router)
app.mount('#app')
