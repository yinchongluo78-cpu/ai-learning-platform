import { createApp } from 'vue'
import './style.css'
import './styles/layout-fix.css'
import App from './App.vue'
import router from './router/index.js'
import { setupErrorHandling } from './utils/errorHandler.js'

const app = createApp(App)

// 设置全局错误处理
setupErrorHandling(app)

app.use(router)
app.mount('#app')
