import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase.js'

// 导入页面组件 - 使用懒加载
const AuthForm = () => import('../components/AuthForm.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const Chat = () => import('../views/Chat.vue')
// import Knowledge from '../views/Knowledge.vue'  // 旧版本
// import KnowledgeOSS from '../views/KnowledgeOSS.vue'  // OSS直传版本（连接超时）
// import KnowledgeSimple from '../views/KnowledgeSimple.vue'  // 简化版本：通过服务器上传
const KnowledgeLocal = () => import('../views/KnowledgeLocal.vue')  // 最简版本：无外部依赖
const KnowledgeRAG = () => import('../views/KnowledgeRAG.vue')  // RAG知识库系统
const Profile = () => import('../views/Profile.vue')
const TestOSS = () => import('../views/TestOSS.vue')
const TestOSSSimple = () => import('../views/TestOSSSimple.vue')
const RAGChat = () => import('../views/RAGChat.vue')  // RAG聊天界面

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
        component: KnowledgeLocal  // 使用最简版本
      },
      {
        path: 'rag',
        name: 'RAGChat',
        component: RAGChat  // RAG精准问答
      },
      {
        path: 'knowledge-rag',
        name: 'KnowledgeRAG',
        component: KnowledgeRAG  // RAG知识库系统
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