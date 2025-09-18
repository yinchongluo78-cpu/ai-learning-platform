<template>
  <div class="auth-container">
    <!-- 左上角品牌标题 -->
    <div class="brand-title">
      智能少年
    </div>

    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="orbit orbit-1"></div>
      <div class="orbit orbit-2"></div>
      <div class="orbit orbit-3"></div>
    </div>

    <div class="auth-card glass-card">
      <!-- Logo区域 -->
      <div class="logo-section">
        <div class="logo-glow">
          <span class="logo-text">AI</span>
        </div>
        <h1 class="tech-title">学习平台</h1>
        <p class="subtitle">以自学为基础 以生产为导向</p>
      </div>

      <!-- 切换标签 -->
      <div class="tabs">
        <button
          :class="['tab', { active: isLogin }]"
          @click="isLogin = true"
        >
          登录
        </button>
        <button
          :class="['tab', { active: !isLogin }]"
          @click="isLogin = false"
        >
          注册
        </button>
        <div class="tab-indicator" :class="isLogin ? 'login' : 'register'"></div>
      </div>

      <!-- 登录表单 -->
      <form v-if="isLogin" @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <input
            type="email"
            v-model="loginForm.email"
            required
            placeholder="邮箱地址"
            class="glow-input"
          />
        </div>

        <div class="form-group">
          <input
            type="password"
            v-model="loginForm.password"
            required
            placeholder="密码"
            class="glow-input"
          />
        </div>

        <button type="submit" class="neon-button" :disabled="loading">
          {{ loading ? '登录中...' : '进入系统' }}
        </button>
      </form>

      <!-- 注册表单 -->
      <form v-else @submit.prevent="handleRegister" class="auth-form">
        <div class="form-row">
          <div class="form-group">
            <input
              type="text"
              v-model="registerForm.name"
              required
              placeholder="姓名"
              class="glow-input"
            />
          </div>

          <div class="form-group">
            <select v-model="registerForm.age" required class="glow-input">
              <option value="">年龄</option>
              <option v-for="age in ageOptions" :key="age" :value="age">
                {{ age }}岁
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <input
            type="tel"
            v-model="registerForm.phone"
            required
            placeholder="手机号码"
            class="glow-input"
          />
        </div>

        <div class="form-group">
          <input
            type="email"
            v-model="registerForm.email"
            required
            placeholder="邮箱地址"
            class="glow-input"
          />
        </div>

        <div class="form-group">
          <input
            type="password"
            v-model="registerForm.password"
            required
            placeholder="设置密码（至少6位）"
            minlength="6"
            class="glow-input"
          />
        </div>

        <button type="submit" class="neon-button" :disabled="loading">
          {{ loading ? '创建中...' : '创建账号' }}
        </button>
      </form>


      <!-- 错误信息 -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- 成功信息 -->
      <div v-if="success" class="success-message">
        {{ success }}
      </div>
    </div>

    <!-- 底部装饰文字 -->
    <div class="footer-text">
      <p>Powered by AI • Built for Future Creators</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const isLogin = ref(true)
const loading = ref(false)
const error = ref('')
const success = ref('')

// 登录表单数据
const loginForm = ref({
  email: '',
  password: ''
})

// 注册表单数据
const registerForm = ref({
  name: '',
  age: '',
  phone: '',
  email: '',
  password: ''
})

// 年龄选项（8-15岁）
const ageOptions = computed(() => {
  const ages = []
  for (let i = 8; i <= 15; i++) {
    ages.push(i)
  }
  return ages
})

// 切换登录/注册模式
function toggleMode() {
  isLogin.value = !isLogin.value
  error.value = ''
  success.value = ''
}

// 清空消息
function clearMessages() {
  error.value = ''
  success.value = ''
}

// 处理登录
async function handleLogin() {
  loading.value = true
  clearMessages()

  try {
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    if (loginError) {
      if (loginError.message.includes('Email not confirmed')) {
        error.value = '邮箱未验证。请检查邮箱中的验证链接，或联系管理员关闭邮箱验证要求。'
      } else {
        error.value = '登录失败：' + loginError.message
      }
    } else {
      success.value = '登录成功！'
      console.log('登录成功，用户信息：', data.user)

      // 登录成功后跳转到主页
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  } catch (err) {
    error.value = '登录出错：' + err.message
  }

  loading.value = false
}

// 处理注册
async function handleRegister() {
  loading.value = true
  clearMessages()

  try {
    console.log('开始注册用户:', registerForm.value.email)

    // 第一步：在Supabase Auth中注册用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registerForm.value.email,
      password: registerForm.value.password,
      options: {
        data: {
          name: registerForm.value.name,
          age: parseInt(registerForm.value.age),
          phone: registerForm.value.phone
        }
      }
    })

    if (authError) {
      error.value = '注册失败：' + authError.message
      loading.value = false
      return
    }

    console.log('Auth注册成功:', authData.user.id)

    // 立即保存用户详细信息到users表
    await saveUserProfile(authData.user)

    // 显示成功信息
    if (authData.user && !authData.user.email_confirmed_at) {
      success.value = '注册成功！请检查邮箱并点击验证链接完成注册。'
    } else {
      success.value = '注册成功！'
    }

    // 清空表单
    const formData = { ...registerForm.value } // 保存当前表单数据
    registerForm.value = {
      name: '',
      age: '',
      phone: '',
      email: '',
      password: ''
    }

  } catch (err) {
    error.value = '注册出错：' + err.message
    console.error('注册出错:', err)
  }

  loading.value = false
}

// 保存用户详细信息到users表
async function saveUserProfile(authUser) {
  try {
    console.log('保存用户详细信息:', authUser.id)
    console.log('用户ID格式检查:', typeof authUser.id, authUser.id)

    const profileData = {
      id: authUser.id, // Supabase Auth已经提供正确的UUID
      email: authUser.email,
      name: registerForm.value.name,
      age: parseInt(registerForm.value.age),
      phone: registerForm.value.phone,
      password: registerForm.value.password, // 明文存储密码（你的要求）
      total_study_time: 0
    }

    console.log('准备保存的数据:', profileData)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([profileData])
      .select()

    if (userError) {
      console.error('保存用户信息失败：', userError)
      // 不在注册界面显示这个错误，只在控制台记录
      console.log('详细错误信息:', JSON.stringify(userError, null, 2))
    } else {
      console.log('用户信息保存成功:', userData)
      success.value = '注册成功！用户信息已保存。'
    }
  } catch (err) {
    console.error('保存用户信息出错：', err)
    // 不在注册界面显示这个错误，只在控制台记录
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 20px;
}

/* 左上角品牌标题 */
.brand-title {
  position: fixed;
  top: 40px;
  left: 60px;
  font-size: 48px;
  font-weight: 900;
  font-family: 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #ffffff, #00d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 4px;
  z-index: 100;
  text-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
  animation: float-title 6s ease-in-out infinite;
}

@keyframes float-title {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  pointer-events: none;
}

.orbit {
  position: absolute;
  border: 2px solid rgba(0, 212, 255, 0.1);
  border-radius: 50%;
  animation: rotate 20s linear infinite;
}

.orbit-1 {
  width: 100%;
  height: 100%;
  animation-duration: 30s;
}

.orbit-2 {
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  animation-duration: 25s;
  animation-direction: reverse;
}

.orbit-3 {
  width: 40%;
  height: 40%;
  top: 30%;
  left: 30%;
  animation-duration: 20s;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 主卡片 */
.auth-card {
  width: 100%;
  max-width: 450px;
  padding: 40px;
  position: relative;
  z-index: 10;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo区域 */
.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-glow {
  display: inline-block;
  width: 80px;
  height: 80px;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.logo-text {
  font-size: 32px;
  font-weight: 900;
  color: white;
}

.tech-title {
  margin: 0 0 10px 0;
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple), var(--neon-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

/* 切换标签 */
.tabs {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 4px;
}

.tab {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  z-index: 2;
}

.tab.active {
  color: white;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: calc(50% - 11px);
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.tab-indicator.login {
  transform: translateX(0);
}

.tab-indicator.register {
  transform: translateX(calc(100% + 15px));
}

/* 表单样式 */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px;
}

.form-row {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.form-row .form-group {
  flex: 1;
  max-width: 180px;
}

.form-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 选择框样式 */
select.glow-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
}

/* 错误和成功提示 */
.error-message,
.success-message {
  margin-top: 20px;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: fadeIn 0.3s ease;
}

.error-message {
  background: rgba(255, 0, 110, 0.1);
  border: 1px solid rgba(255, 0, 110, 0.3);
  color: #ff006e;
}

.success-message {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 底部文字 */
.footer-text {
  margin-top: 30px;
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* 响应式设计 - 改进移动端体验 */
@media (max-width: 768px) {
  .brand-title {
    top: 20px;
    left: 20px;
    font-size: 32px;
    letter-spacing: 2px;
  }

  .auth-container {
    padding: 20px;
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
  }
}

@media (max-width: 480px) {
  .auth-container {
    min-height: 100vh;
    padding: 15px;
  }

  .auth-card {
    padding: 30px 20px;
    margin: 0;
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .tech-title {
    font-size: 28px;
  }

  .brand-title {
    font-size: 24px;
    top: 15px;
    left: 15px;
  }

  .subtitle {
    font-size: 12px;
  }

  /* 修复移动端输入框问题 */
  .tech-input {
    font-size: 16px !important; /* 防止iOS自动缩放 */
    padding: 14px 18px;
    -webkit-appearance: none;
  }

  .tech-button {
    padding: 14px;
    font-size: 16px;
    touch-action: manipulation; /* 优化触摸响应 */
  }

  /* 防止键盘弹出时布局错乱 */
  .auth-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>