import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase.js'

// 导入页面组件
import AuthForm from '../components/AuthForm.vue'
import Dashboard from '../views/Dashboard.vue'
import Chat from '../views/Chat.vue'
// import Knowledge from '../views/Knowledge.vue'  // 旧版本
// import KnowledgeOSS from '../views/KnowledgeOSS.vue'  // OSS直传版本（连接超时）
import KnowledgeSimple from '../views/KnowledgeSimple.vue'  // 简化版本：通过服务器上传
import Profile from '../views/Profile.vue'
import TestOSS from '../views/TestOSS.vue'
import TestOSSSimple from '../views/TestOSSSimple.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthForm,
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'DashboardHome',
        redirect: '/dashboard/chat'
      },
      {
        path: 'chat',
        name: 'Chat',
        component: Chat
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: KnowledgeSimple  // 使用简化版本
      },
      {
        path: 'profile',
        name: 'Profile',
        component: Profile
      }
    ]
  },
  {
    path: '/test-oss',
    name: 'TestOSS',
    component: TestOSS
  },
  {
    path: '/test-oss-simple',
    name: 'TestOSSSimple',
    component: TestOSSSimple
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (to.meta.requiresAuth && !user) {
      next('/auth')
    } else if (to.meta.requiresGuest && user) {
      next('/dashboard')
    } else {
      next()
    }
  } catch (error) {
    console.error('路由守卫认证检查失败:', error)
    if (to.meta.requiresAuth) {
      next('/auth')
    } else {
      next()
    }
  }
})

export default router