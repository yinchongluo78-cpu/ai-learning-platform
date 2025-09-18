// 用户认证状态管理（就像房子的门卡管理系统）
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

// 全局用户状态
const user = ref(null)
const userProfile = ref(null)
const isLoading = ref(true)

export function useAuth() {

  // 监听认证状态变化
  onMounted(async () => {
    try {
      // 获取当前用户
      await getCurrentUser()

      // 监听认证状态变化
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('认证状态变化:', event, session?.user?.email)

        if (event === 'SIGNED_IN' && session?.user) {
          user.value = session.user
          await loadUserProfile(session.user.id)
          await ensureUserProfileExists(session.user)
        } else if (event === 'SIGNED_OUT') {
          user.value = null
          userProfile.value = null
        }

        isLoading.value = false
      })
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      isLoading.value = false
    }
  })

  // 获取当前用户
  async function getCurrentUser() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (currentUser) {
        user.value = currentUser
        await loadUserProfile(currentUser.id)
        await ensureUserProfileExists(currentUser)
      }
    } catch (error) {
      console.error('获取当前用户失败:', error)
    }

    isLoading.value = false
  }

  // 加载用户详细信息
  async function loadUserProfile(userId) {
    try {
      // 首先获取auth用户的email
      const authUser = user.value
      if (!authUser || !authUser.email) {
        console.log('无法获取用户email')
        return
      }

      // 使用email查询users表
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single()

      if (error) {
        console.log('用户资料不存在，需要创建:', error.message)
        userProfile.value = null
      } else {
        userProfile.value = data
        console.log('用户资料加载成功:', data)
      }
    } catch (err) {
      console.error('加载用户资料出错:', err)
    }
  }

  // 确保用户资料存在（如果不存在就创建）
  async function ensureUserProfileExists(authUser) {
    if (userProfile.value) {
      return // 已经存在，不需要创建
    }

    try {
      // 从auth的user_metadata中获取注册时填写的信息
      const metadata = authUser.user_metadata || {}

      const profileData = {
        id: authUser.id,
        email: authUser.email,
        name: metadata.name || '未设置',
        age: metadata.age || 12,
        phone: metadata.phone || '未设置',
        password: '***', // 不存储真实密码
        total_study_time: 0,
        created_at: authUser.created_at
      }

      const { data, error } = await supabase
        .from('users')
        .insert([profileData])
        .select()
        .single()

      if (error) {
        console.error('创建用户资料失败:', error)
      } else {
        userProfile.value = data
        console.log('用户资料创建成功:', data)
      }
    } catch (err) {
      console.error('创建用户资料出错:', err)
    }
  }

  // 更新用户资料
  async function updateUserProfile(updates) {
    if (!user.value) return { error: '用户未登录' }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      userProfile.value = data
      return { data }
    } catch (err) {
      return { error: err.message }
    }
  }

  // 登出
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('登出失败:', error)
        return { error: error.message }
      }

      user.value = null
      userProfile.value = null
      return { success: true }
    } catch (err) {
      console.error('登出出错:', err)
      return { error: err.message }
    }
  }

  return {
    user,
    userProfile,
    isLoading,
    getCurrentUser,
    loadUserProfile,
    updateUserProfile,
    signOut
  }
}