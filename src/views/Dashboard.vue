<template>
  <div class="dashboard-container">
    <!-- 侧边栏导航 -->
    <aside class="sidebar">
      <div class="logo-section">
        <div class="logo">
          <div class="logo-icon">AI</div>
          <h1 class="logo-text">智能少年</h1>
        </div>
        <p class="tagline">以自学为基础 以生产为导向</p>
      </div>

      <!-- 导航菜单 -->
      <nav class="nav-menu">
        <router-link to="/dashboard/chat" class="nav-item" active-class="active">
          <div class="nav-icon">💬</div>
          <span>学习对话</span>
        </router-link>

        <router-link to="/dashboard/knowledge-rag" class="nav-item" active-class="active">
          <div class="nav-icon">🎓</div>
          <span>RAG知识库</span>
        </router-link>

        <router-link to="/dashboard/rag" class="nav-item" active-class="active">
          <div class="nav-icon">🤖</div>
          <span>超级学霸</span>
        </router-link>

        <router-link to="/dashboard/knowledge" class="nav-item" active-class="active">
          <div class="nav-icon">📚</div>
          <span>普通知识库</span>
        </router-link>

        <router-link to="/dashboard/profile" class="nav-item" active-class="active">
          <div class="nav-icon">👤</div>
          <span>个人中心</span>
        </router-link>
      </nav>

      <!-- 底部用户信息 -->
      <div class="user-info">
        <div class="user-avatar">
          <img :src="userAvatar" :alt="userName" />
        </div>
        <div class="user-details">
          <div class="user-name">{{ userName }}</div>
          <div class="user-status">在线</div>
        </div>
        <button @click="logout" class="logout-btn">
          <span>🚪</span>
        </button>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'

const router = useRouter()
const userName = ref('小学')
const userAvatar = ref('https://api.dicebear.com/7.x/adventurer/svg?seed=felix')

// 获取用户信息
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // 从users表获取用户信息
    const { data: userData } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('email', user.email)
      .single()

    if (userData) {
      userName.value = userData.name || '小学'
      userAvatar.value = userData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userData.name}`
    }
  }
})

// 退出登录
async function logout() {
  const { error } = await supabase.auth.signOut()
  if (!error) {
    router.push('/auth')
  }
}
</script>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  width: 100%;
  /* 防止容器缩小 */
  min-width: 100%;
  position: relative;
}

/* 侧边栏样式 */
.sidebar {
  width: 200px;
  background: linear-gradient(180deg,
    rgba(20, 27, 45, 0.95) 0%,
    rgba(30, 41, 59, 0.9) 100%);
  border-right: 1px solid rgba(59, 130, 246, 0.2);
  display: flex;
  flex-direction: column;
  padding: 16px;
  backdrop-filter: blur(10px);
  flex-shrink: 0; /* 防止侧边栏收缩 */
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 900;
  color: white;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
}

.logo-text {
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.tagline {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.1);
  color: var(--text-primary);
  transform: translateX(4px);
}

.nav-item.active {
  background: linear-gradient(135deg,
    rgba(59, 130, 246, 0.2),
    rgba(147, 51, 234, 0.1));
  color: var(--neon-blue);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--neon-blue);
  box-shadow: 0 0 10px var(--neon-blue);
}

.nav-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--neon-blue);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-status {
  font-size: 12px;
  color: var(--neon-green);
}

.logout-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 0, 110, 0.1);
  border-radius: 8px;
  color: var(--neon-pink);
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 0, 110, 0.2);
  transform: scale(1.1);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  overflow: hidden;
  background: var(--bg-primary);
  /* 确保主内容区不会缩小 */
  min-width: 0;
  width: 100%;
  position: relative; /* 为子元素提供定位上下文 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 240px;
  }

  .logo-text {
    font-size: 20px;
  }

  .nav-item {
    padding: 12px 16px;
  }
}
</style>