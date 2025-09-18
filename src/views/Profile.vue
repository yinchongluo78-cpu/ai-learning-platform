<template>
  <div class="profile-page">
    <!-- 顶部标题栏 -->
    <header class="profile-header">
      <div class="header-content">
        <h1 class="page-title">个人中心</h1>
        <p class="page-subtitle">管理个人信息和学习统计</p>
      </div>
    </header>

    <div class="profile-content">
      <!-- 左侧个人信息 -->
      <div class="profile-left">
        <!-- 用户基本信息卡片 -->
        <div class="info-card">
          <div class="card-header">
            <h2>个人信息</h2>
            <button @click="toggleEdit" class="edit-btn">
              {{ isEditing ? '取消' : '编辑' }}
            </button>
          </div>

          <div class="user-avatar-section">
            <div class="avatar-container">
              <img :src="userInfo.avatar" :alt="userInfo.name" class="user-avatar" />
              <button v-if="isEditing" @click="changeAvatar" class="change-avatar-btn">
                📷
              </button>
            </div>
            <div class="avatar-info">
              <h3>{{ userInfo.name }}</h3>
              <p>{{ userInfo.age }}岁 · 加入{{ formatJoinTime(userInfo.created_at) }}</p>
            </div>
          </div>

          <div class="user-details">
            <div class="detail-item">
              <label>姓名</label>
              <input
                v-if="isEditing"
                v-model="editForm.name"
                type="text"
                class="edit-input"
              />
              <span v-else class="detail-value">{{ userInfo.name }}</span>
            </div>

            <div class="detail-item">
              <label>年龄</label>
              <input
                v-if="isEditing"
                v-model="editForm.age"
                type="number"
                min="8"
                max="15"
                class="edit-input"
              />
              <span v-else class="detail-value">{{ userInfo.age }}岁</span>
            </div>

            <div class="detail-item">
              <label>手机号</label>
              <input
                v-if="isEditing"
                v-model="editForm.phone"
                type="tel"
                class="edit-input"
              />
              <span v-else class="detail-value">{{ userInfo.phone }}</span>
            </div>

            <div class="detail-item">
              <label>邮箱</label>
              <span class="detail-value readonly">{{ userInfo.email }}</span>
            </div>

            <div class="detail-item">
              <label>密码</label>
              <input
                v-if="isEditing"
                v-model="editForm.password"
                type="password"
                placeholder="留空表示不修改密码"
                class="edit-input"
              />
              <span v-else class="detail-value">••••••••</span>
            </div>
          </div>

          <div v-if="isEditing" class="edit-actions">
            <button @click="saveProfile" :disabled="isSaving" class="save-btn">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
            <button @click="cancelEdit" class="cancel-btn">取消</button>
          </div>
        </div>

        <!-- 头像选择对话框 -->
        <div v-if="showAvatarDialog" class="modal-overlay" @click="closeAvatarDialog">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2>选择头像</h2>
              <button @click="closeAvatarDialog" class="close-btn">×</button>
            </div>

            <div class="avatar-options">
              <div
                v-for="avatar in avatarOptions"
                :key="avatar"
                @click="selectAvatar(avatar)"
                :class="['avatar-option', { selected: selectedAvatar === avatar }]"
              >
                <img :src="avatar" :alt="'头像选项'" />
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeAvatarDialog" class="cancel-btn">取消</button>
              <button @click="confirmAvatar" class="confirm-btn">确定</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧学习统计 -->
      <div class="profile-right">
        <!-- 排行榜卡片 -->
        <div class="leaderboard-card">
          <div class="card-header">
            <h2>学习排行榜</h2>
            <div class="leaderboard-tabs">
              <button
                v-for="tab in leaderboardTabs"
                :key="tab.key"
                @click="activeLeaderboard = tab.key"
                :class="['tab-btn', { active: activeLeaderboard === tab.key }]"
              >
                {{ tab.icon }} {{ tab.name }}
              </button>
            </div>
          </div>

          <div class="leaderboard-content">
            <!-- 努力榜 -->
            <div v-if="activeLeaderboard === 'effort'" class="ranking-list">
              <div
                v-for="(user, index) in effortRanking"
                :key="user.id"
                :class="['ranking-item', {
                  'is-me': user.id === userInfo.id,
                  'top-three': index < 3
                }]"
              >
                <div class="rank-number">
                  <span v-if="index === 0" class="medal">🥇</span>
                  <span v-else-if="index === 1" class="medal">🥈</span>
                  <span v-else-if="index === 2" class="medal">🥉</span>
                  <span v-else class="rank-num">{{ index + 1 }}</span>
                </div>
                <div class="user-info-rank">
                  <img :src="user.avatar" :alt="user.name" class="rank-avatar" />
                  <span class="rank-name">{{ user.name }}</span>
                </div>
                <div class="rank-stats">
                  <div class="stat-detail">
                    <span class="stat-num">{{ user.continuous_days }}</span>
                    <span class="stat-unit">连续天</span>
                  </div>
                  <div class="stat-detail">
                    <span class="stat-num">{{ Math.floor(user.total_study_minutes / 60) }}</span>
                    <span class="stat-unit">学时</span>
                  </div>
                </div>
              </div>
              <div v-if="effortRanking.length === 0" class="empty-ranking">
                <span>🏆</span>
                <p>暂无排行数据</p>
              </div>
            </div>

            <!-- 探索榜 -->
            <div v-if="activeLeaderboard === 'exploration'" class="ranking-list">
              <div
                v-for="(user, index) in explorationRanking"
                :key="user.id"
                :class="['ranking-item', {
                  'is-me': user.id === userInfo.id,
                  'top-three': index < 3
                }]"
              >
                <div class="rank-number">
                  <span v-if="index === 0" class="medal">🥇</span>
                  <span v-else-if="index === 1" class="medal">🥈</span>
                  <span v-else-if="index === 2" class="medal">🥉</span>
                  <span v-else class="rank-num">{{ index + 1 }}</span>
                </div>
                <div class="user-info-rank">
                  <img :src="user.avatar" :alt="user.name" class="rank-avatar" />
                  <span class="rank-name">{{ user.name }}</span>
                </div>
                <div class="rank-stats">
                  <div class="stat-detail">
                    <span class="stat-num">{{ user.topics_explored }}</span>
                    <span class="stat-unit">主题</span>
                  </div>
                  <div class="stat-detail">
                    <span class="stat-num">{{ user.questions_asked }}</span>
                    <span class="stat-unit">提问</span>
                  </div>
                </div>
              </div>
              <div v-if="explorationRanking.length === 0" class="empty-ranking">
                <span>🔍</span>
                <p>暂无排行数据</p>
              </div>
            </div>

            <!-- 进步榜 -->
            <div v-if="activeLeaderboard === 'progress'" class="ranking-list">
              <div
                v-for="(user, index) in progressRanking"
                :key="user.id"
                :class="['ranking-item', {
                  'is-me': user.id === userInfo.id,
                  'top-three': index < 3
                }]"
              >
                <div class="rank-number">
                  <span v-if="index === 0" class="medal">🥇</span>
                  <span v-else-if="index === 1" class="medal">🥈</span>
                  <span v-else-if="index === 2" class="medal">🥉</span>
                  <span v-else class="rank-num">{{ index + 1 }}</span>
                </div>
                <div class="user-info-rank">
                  <img :src="user.avatar" :alt="user.name" class="rank-avatar" />
                  <span class="rank-name">{{ user.name }}</span>
                </div>
                <div class="rank-stats">
                  <div class="stat-detail">
                    <span class="stat-num">+{{ user.weekly_growth_score }}</span>
                    <span class="stat-unit">进步</span>
                  </div>
                  <div class="stat-detail">
                    <span class="stat-num">{{ user.skills_unlocked }}</span>
                    <span class="stat-unit">技能</span>
                  </div>
                </div>
              </div>
              <div v-if="progressRanking.length === 0" class="empty-ranking">
                <span>📈</span>
                <p>暂无排行数据</p>
              </div>
            </div>
          </div>
        </div>
        <!-- 学习统计卡片 -->
        <div class="stats-card">
          <div class="card-header">
            <h2>学习统计</h2>
            <span class="stats-period">本月数据</span>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon">⏱️</div>
              <div class="stat-content">
                <div class="stat-value">{{ userInfo.learning_time || 0 }}</div>
                <div class="stat-label">学习次数</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">💬</div>
              <div class="stat-content">
                <div class="stat-value">{{ statsData.totalConversations }}</div>
                <div class="stat-label">对话次数</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">📚</div>
              <div class="stat-content">
                <div class="stat-value">{{ statsData.totalDocuments }}</div>
                <div class="stat-label">上传文档</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">🌐</div>
              <div class="stat-content">
                <div class="stat-value">{{ statsData.publicDocuments }}</div>
                <div class="stat-label">公开分享</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 学习进度卡片 -->
        <div class="progress-card">
          <div class="card-header">
            <h2>学习进度</h2>
          </div>

          <div class="progress-content">
            <div class="progress-item">
              <div class="progress-header">
                <span class="progress-title">本周学习目标</span>
                <span class="progress-value">{{ weeklyProgress }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: weeklyProgress + '%' }"
                ></div>
              </div>
              <div class="progress-desc">已完成 {{ Math.round(weeklyGoal * weeklyProgress / 100) }}/{{ weeklyGoal }} 次学习</div>
            </div>

            <div class="progress-item">
              <div class="progress-header">
                <span class="progress-title">知识掌握度</span>
                <span class="progress-value">{{ knowledgeProgress }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill knowledge"
                  :style="{ width: knowledgeProgress + '%' }"
                ></div>
              </div>
              <div class="progress-desc">基于你的学习内容和互动质量评估</div>
            </div>
          </div>
        </div>

        <!-- 最近活动卡片 -->
        <div class="activity-card">
          <div class="card-header">
            <h2>最近活动</h2>
          </div>

          <div class="activity-list">
            <div
              v-for="activity in recentActivities"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon">{{ activity.icon }}</div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-time">{{ formatTime(activity.time) }}</div>
              </div>
            </div>

            <div v-if="recentActivities.length === 0" class="empty-activity">
              暂无最近活动
            </div>
          </div>
        </div>

        <!-- 成就徽章卡片 -->
        <div class="achievements-card">
          <div class="card-header">
            <h2>成就徽章</h2>
          </div>

          <div class="achievements-grid">
            <div
              v-for="achievement in achievements"
              :key="achievement.id"
              :class="['achievement-item', { earned: achievement.earned }]"
              :title="achievement.description"
            >
              <div class="achievement-icon">{{ achievement.icon }}</div>
              <div class="achievement-name">{{ achievement.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

// 响应式数据
const userInfo = ref({
  id: null,
  name: '',
  age: 0,
  phone: '',
  email: '',
  avatar: '',
  created_at: '',
  learning_time: 0
})

const editForm = ref({
  name: '',
  age: 0,
  phone: '',
  password: '',
  avatar: ''
})

const isEditing = ref(false)
const isSaving = ref(false)
const showAvatarDialog = ref(false)
const selectedAvatar = ref('')

const statsData = ref({
  totalConversations: 0,
  totalDocuments: 0,
  publicDocuments: 0
})

const recentActivities = ref([])
const weeklyGoal = ref(10)

// 排行榜数据
const activeLeaderboard = ref('effort')
const effortRanking = ref([])
const explorationRanking = ref([])
const progressRanking = ref([])

const leaderboardTabs = [
  { key: 'effort', name: '努力榜', icon: '💪' },
  { key: 'exploration', name: '探索榜', icon: '🔍' },
  { key: 'progress', name: '进步榜', icon: '📈' }
]

// 计算属性
const weeklyProgress = computed(() => {
  const current = userInfo.value.learning_time || 0
  return Math.min((current / weeklyGoal.value) * 100, 100)
})

const knowledgeProgress = computed(() => {
  const base = Math.min((userInfo.value.learning_time || 0) * 5, 100)
  const bonus = Math.min((statsData.value.totalDocuments || 0) * 10, 20)
  return Math.min(base + bonus, 100)
})

// 头像选项
const avatarOptions = ref([
  'https://api.dicebear.com/7.x/adventurer/svg?seed=felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=lily',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=max',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=emma',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=sophie',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=lucas',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=mia'
])

// 成就系统
const achievements = ref([
  {
    id: 'first_chat',
    name: '初次对话',
    icon: '💬',
    description: '完成第一次AI对话',
    earned: false
  },
  {
    id: 'doc_uploader',
    name: '文档达人',
    icon: '📚',
    description: '上传了5个文档',
    earned: false
  },
  {
    id: 'active_learner',
    name: '学习积极分子',
    icon: '🎓',
    description: '连续学习7天',
    earned: false
  },
  {
    id: 'knowledge_sharer',
    name: '知识分享者',
    icon: '🌐',
    description: '分享了3个公开文档',
    earned: false
  }
])

// 初始化
onMounted(async () => {
  await loadUserProfile()
  await loadStats()
  await loadRecentActivities()
  await loadLeaderboards()
  updateAchievements()
})

// 加载用户资料
async function loadUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('用户未登录')
      return
    }

    console.log('当前认证用户:', user.email)

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (error) {
      console.error('查询用户信息失败:', error)
      return
    }

    if (userData) {
      userInfo.value = {
        ...userData,
        // 如果数据库有avatar则使用，否则生成默认头像
        avatar: userData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userData.name}`
      }
      console.log('用户信息加载成功:', userInfo.value)
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

// 加载统计数据
async function loadStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userData) {
      // 获取对话统计
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userData.id)

      // 获取文档统计
      const { data: documents } = await supabase
        .from('documents')
        .select('id, is_public')
        .eq('user_id', userData.id)

      statsData.value = {
        totalConversations: conversations?.length || 0,
        totalDocuments: documents?.length || 0,
        publicDocuments: documents?.filter(doc => doc.is_public).length || 0
      }
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载最近活动
async function loadRecentActivities() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userData) {
      const activities = []

      // 获取最近对话
      const { data: conversations } = await supabase
        .from('conversations')
        .select('title, created_at')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(3)

      conversations?.forEach(conv => {
        activities.push({
          id: `conv_${conv.created_at}`,
          icon: '💬',
          title: `开始对话: ${conv.title}`,
          time: conv.created_at
        })
      })

      // 获取最近文档
      const { data: documents } = await supabase
        .from('documents')
        .select('filename, created_at, is_public')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(3)

      documents?.forEach(doc => {
        activities.push({
          id: `doc_${doc.created_at}`,
          icon: doc.is_public ? '🌐' : '📚',
          title: `${doc.is_public ? '公开分享' : '上传文档'}: ${doc.filename}`,
          time: doc.created_at
        })
      })

      // 按时间排序
      recentActivities.value = activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5)
    }
  } catch (error) {
    console.error('加载最近活动失败:', error)
  }
}

// 更新成就状态
function updateAchievements() {
  achievements.value.forEach(achievement => {
    switch (achievement.id) {
      case 'first_chat':
        achievement.earned = statsData.value.totalConversations > 0
        break
      case 'doc_uploader':
        achievement.earned = statsData.value.totalDocuments >= 5
        break
      case 'active_learner':
        achievement.earned = (userInfo.value.learning_time || 0) >= 7
        break
      case 'knowledge_sharer':
        achievement.earned = statsData.value.publicDocuments >= 3
        break
    }
  })
}

// 切换编辑模式
function toggleEdit() {
  if (isEditing.value) {
    cancelEdit()
  } else {
    isEditing.value = true
    editForm.value = {
      name: userInfo.value.name,
      age: userInfo.value.age,
      phone: userInfo.value.phone,
      password: '',
      avatar: userInfo.value.avatar
    }
  }
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false
  editForm.value = {
    name: '',
    age: 0,
    phone: '',
    password: '',
    avatar: ''
  }
}

// 保存个人信息
async function saveProfile() {
  console.log('开始保存个人资料...')
  console.log('当前表单数据:', editForm.value)

  if (!editForm.value.name.trim()) {
    alert('请输入姓名')
    return
  }

  if (editForm.value.age < 8 || editForm.value.age > 15) {
    alert('年龄必须在8-15岁之间')
    return
  }

  isSaving.value = true

  try {
    const updateData = {
      name: editForm.value.name.trim(),
      age: editForm.value.age,
      phone: editForm.value.phone.trim(),
      avatar: editForm.value.avatar // 启用avatar保存
    }

    console.log('准备更新的数据:', updateData)
    console.log('用户ID:', userInfo.value.id)
    console.log('用户邮箱:', userInfo.value.email)

    if (editForm.value.password.trim()) {
      updateData.password = editForm.value.password
    }

    // 使用ID来更新，更可靠
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userInfo.value.id)
      .select()

    console.log('更新结果:', { data, error })

    if (error) {
      console.error('更新失败:', error)
      alert(`保存失败：${error.message}`)
    } else {
      userInfo.value = {
        ...userInfo.value,
        ...updateData
      }
      isEditing.value = false
      alert('个人信息更新成功！')
    }
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 更换头像
function changeAvatar() {
  selectedAvatar.value = editForm.value.avatar
  showAvatarDialog.value = true
}

// 选择头像
function selectAvatar(avatar) {
  selectedAvatar.value = avatar
  editForm.value.avatar = avatar // 同时更新editForm以显示选择状态
}

// 确认头像选择
function confirmAvatar() {
  editForm.value.avatar = selectedAvatar.value
  // 立即更新显示的头像
  userInfo.value.avatar = selectedAvatar.value
  closeAvatarDialog()
}

// 关闭头像选择对话框
function closeAvatarDialog() {
  showAvatarDialog.value = false
  selectedAvatar.value = ''
}

// 格式化加入时间
function formatJoinTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    return `${diffDays}天前`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}个月前`
  } else {
    return `${Math.floor(diffDays / 365)}年前`
  }
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 加载排行榜数据
async function loadLeaderboards() {
  try {
    // 努力榜 - 按连续学习天数和总学时排序
    const { data: effortData } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        continuous_days,
        total_study_minutes,
        users!inner (
          id,
          name,
          avatar
        )
      `)
      .order('continuous_days', { ascending: false })
      .order('total_study_minutes', { ascending: false })
      .limit(10)

    if (effortData) {
      effortRanking.value = effortData.map(item => ({
        id: item.users.id,
        name: item.users.name || '匿名用户',
        avatar: item.users.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.users.name}`,
        continuous_days: item.continuous_days || 0,
        total_study_minutes: item.total_study_minutes || 0
      }))
    }

    // 探索榜 - 按探索主题数和提问数排序
    const { data: explorationData } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        topics_explored,
        questions_asked,
        knowledge_shared,
        users!inner (
          id,
          name,
          avatar
        )
      `)
      .order('topics_explored', { ascending: false })
      .order('questions_asked', { ascending: false })
      .limit(10)

    if (explorationData) {
      explorationRanking.value = explorationData.map(item => ({
        id: item.users.id,
        name: item.users.name || '匿名用户',
        avatar: item.users.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.users.name}`,
        topics_explored: item.topics_explored || 0,
        questions_asked: item.questions_asked || 0
      }))
    }

    // 进步榜 - 按本周进步分数排序
    const { data: progressData } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        weekly_growth_score,
        skills_unlocked,
        challenges_completed,
        users!inner (
          id,
          name,
          avatar
        )
      `)
      .order('weekly_growth_score', { ascending: false })
      .order('skills_unlocked', { ascending: false })
      .limit(10)

    if (progressData) {
      progressRanking.value = progressData.map(item => ({
        id: item.users.id,
        name: item.users.name || '匿名用户',
        avatar: item.users.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.users.name}`,
        weekly_growth_score: item.weekly_growth_score || 0,
        skills_unlocked: item.skills_unlocked || 0
      }))
    }
  } catch (error) {
    console.error('加载排行榜失败:', error)
  }
}
</script>

<style scoped>
.profile-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  width: 100%;
  max-width: 100vw;
  position: relative;
  overflow-x: hidden;
}

/* 顶部标题栏 */
.profile-header {
  padding: 20px 60px 20px 24px; /* 更大的右侦内边距 */
  margin: 0 20px 0 0; /* 右侦留白 */
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
}

.header-content h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-content p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

/* 主体内容 */
.profile-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 24px 60px 24px 24px; /* 更大的右侦内边距 */
  overflow-y: auto;
  overflow-x: hidden;
  width: calc(100% - 20px);
  min-width: 0;
  margin-right: 20px; /* 右侦间距 */
}

/* 通用卡片样式 */
.info-card,
.stats-card,
.progress-card,
.activity-card,
.achievements-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.card-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* 个人信息卡片 */
.edit-btn {
  padding: 6px 12px;
  border: 1px solid var(--neon-blue);
  border-radius: 6px;
  background: transparent;
  color: var(--neon-blue);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-btn:hover {
  background: var(--neon-blue);
  color: white;
}

.user-avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.avatar-container {
  position: relative;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid var(--neon-blue);
  object-fit: cover;
}

.change-avatar-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--neon-blue);
  border-radius: 50%;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.change-avatar-btn:hover {
  transform: scale(1.1);
}

.avatar-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.avatar-info p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-item label {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.detail-value.readonly {
  color: var(--text-secondary);
}

.edit-input {
  padding: 6px 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  background: rgba(20, 27, 45, 0.8);
  color: var(--text-primary);
  font-size: 14px;
  width: 150px;
  outline: none;
}

.edit-input:focus {
  border-color: var(--neon-blue);
}

.edit-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.save-btn,
.cancel-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-btn {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

/* 头像选择对话框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 18px;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 0, 110, 0.2);
  border-radius: 6px;
  color: var(--neon-pink);
  font-size: 18px;
  cursor: pointer;
}

.avatar-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.avatar-option {
  width: 80px;
  height: 80px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.avatar-option:hover {
  border-color: var(--neon-blue);
}

.avatar-option.selected {
  border-color: var(--neon-purple);
  box-shadow: 0 0 12px rgba(147, 51, 234, 0.4);
}

.avatar-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 统计卡片 */
.stats-period {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--neon-blue);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 进度卡片 */
.progress-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.progress-value {
  font-size: 14px;
  color: var(--neon-blue);
  font-weight: 600;
}

.progress-bar {
  height: 8px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple));
  border-radius: 4px;
  transition: width 0.6s ease;
}

.progress-fill.knowledge {
  background: linear-gradient(90deg, var(--neon-green), var(--neon-blue));
}

.progress-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 活动卡片 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.activity-icon {
  font-size: 20px;
  width: 32px;
  text-align: center;
}

.activity-title {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.empty-activity {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 排行榜卡片 */
.leaderboard-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  margin-bottom: 20px;
}

.leaderboard-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: var(--text-primary);
}

.tab-btn.active {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
  border-color: transparent;
}

.leaderboard-content {
  margin-top: 20px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.ranking-item:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateX(4px);
}

.ranking-item.top-three {
  background: linear-gradient(135deg,
    rgba(59, 130, 246, 0.1),
    rgba(147, 51, 234, 0.05));
  border-color: rgba(59, 130, 246, 0.2);
}

.ranking-item.is-me {
  background: linear-gradient(135deg,
    rgba(16, 185, 129, 0.15),
    rgba(59, 130, 246, 0.1));
  border-color: var(--neon-green);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}

.rank-number {
  width: 32px;
  text-align: center;
}

.medal {
  font-size: 24px;
}

.rank-num {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
}

.user-info-rank {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.rank-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.3);
}

.rank-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.rank-stats {
  display: flex;
  gap: 20px;
}

.stat-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--neon-blue);
}

.stat-unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-ranking {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.empty-ranking span {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-ranking p {
  margin: 0;
  font-size: 14px;
}

/* 成就卡片 */
.achievements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.achievement-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s ease;
  opacity: 0.5;
}

.achievement-item.earned {
  opacity: 1;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
}

.achievement-icon {
  font-size: 24px;
}

.achievement-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .profile-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .achievements-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .profile-header {
    padding: 16px;
  }

  .profile-content {
    padding: 16px;
  }

  .user-avatar-section {
    flex-direction: column;
    text-align: center;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .edit-input {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .achievements-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .avatar-options {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>