<template>
  <div class="chat-page">
    <!-- 顶部标题栏 -->
    <header class="chat-header">
      <div class="header-content">
        <h1 class="page-title">学习对话</h1>
        <p class="page-subtitle">拥有自学能力，学历是副产品</p>
      </div>
      <div class="header-actions">
        <button @click="startNewChat" class="new-chat-btn">
          <span class="btn-icon">💬</span>
          新对话
        </button>
      </div>
    </header>

    <!-- 主体内容区域 -->
    <div class="chat-content">
      <!-- 左侧对话历史 -->
      <aside class="chat-history">
        <div class="history-header">
          <h3>对话历史</h3>
          <span class="history-count">{{ conversations.length }}</span>
        </div>
        <div class="history-list">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            @click="loadConversation(conv.id)"
            @contextmenu.prevent="showContextMenu($event, conv)"
            :class="['history-item', { active: currentConversationId === conv.id }]"
          >
            <div class="history-title">{{ conv.title || '未命名对话' }}</div>
            <div class="history-time">{{ formatTime(conv.created_at) }}</div>
          </div>
          <div v-if="conversations.length === 0" class="empty-history">
            <div class="empty-icon">💬</div>
            <div class="empty-text">来聊聊？</div>
            <div class="empty-subtitle">开始你的第一次对话</div>
          </div>
        </div>
      </aside>

      <!-- 右侧聊天区域 -->
      <main class="chat-main">
        <div class="messages-container" ref="messagesContainer">
          <div v-if="messages.length === 0" class="welcome-message">
            <div class="welcome-icon">🤖</div>
            <h2>欢迎来到AI学习助手</h2>
            <p>我可以帮助你学习各种知识，回答问题，分析文档等。开始对话吧！</p>
          </div>

          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['message', message.role]"
          >
            <div class="message-avatar">
              <span v-if="message.role === 'user'">👤</span>
              <span v-else>🤖</span>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="getRenderedContent(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>

          <div v-if="isLoading" class="message assistant loading">
            <div class="message-avatar">
              <span>🤖</span>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-container">
            <textarea
              v-model="inputMessage"
              @keydown.enter.prevent="handleEnter"
              placeholder="输入你的问题..."
              class="message-input"
              rows="1"
              ref="messageInput"
            ></textarea>
            <button
              @click="sendMessage"
              :disabled="!inputMessage.trim() || isLoading"
              class="send-btn"
            >
              <span class="send-icon">🚀</span>
            </button>
          </div>

          <!-- 知识库管理区域 -->
          <div class="knowledge-section">
            <input
              type="file"
              id="fileInput"
              ref="fileInput"
              @change="handleFileUpload"
              accept=".txt,.md,.json,.csv,.log,.pdf"
              style="display: none"
            />

            <!-- 知识库控制按钮 -->
            <div class="knowledge-controls">
              <button @click="toggleKnowledgeMenu" class="knowledge-btn">
                📚 选择知识库
              </button>
              <button v-if="activeDocuments.length > 0" @click="clearAllDocuments" class="clear-btn">
                🗑️ 清除所有
              </button>

              <!-- RAG检索开关 -->
              <div class="rag-switch-wrapper" v-if="activeDocuments.length > 0">
                <label class="rag-switch">
                  <input
                    type="checkbox"
                    v-model="enableRAG"
                    @change="onRAGToggle"
                  >
                  <span class="rag-slider"></span>
                </label>
                <span class="rag-label">
                  {{ enableRAG ? '🔍 检索模式' : '💬 纯聊天' }}
                </span>
              </div>

              <span class="upload-info">
                {{ activeDocuments.length > 0
                  ? `已选择 ${activeDocuments.length} 个知识库`
                  : '未选择知识库（可选）' }}
              </span>
            </div>

            <!-- 显示已激活的知识库 -->
            <div v-if="activeDocuments.length > 0" class="active-knowledge-base">
              <div class="kb-header">
                <span class="kb-title">🌐 当前将使用以下知识库：</span>
              </div>
              <div class="kb-list">
                <div v-for="doc in activeDocuments" :key="doc.id" class="kb-item">
                  <span class="kb-icon">{{ doc.icon || '📄' }}</span>
                  <span class="kb-name">{{ doc.filename }}</span>
                  <button @click="removeActiveDocument(doc)" class="kb-remove" title="移除">
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- 上传进度条 -->
            <div v-if="isUploading" class="upload-progress-container">
              <div class="upload-progress-header">
                <span class="upload-icon">📤</span>
                <span class="upload-text">正在上传: {{ uploadingFileName }}</span>
                <span class="upload-percentage">{{ uploadProgress }}%</span>
              </div>
              <div class="upload-progress-bar">
                <div
                  class="upload-progress-fill"
                  :style="{ width: uploadProgress + '%' }"
                  :class="{ 'complete': uploadProgress === 100 }"
                ></div>
              </div>
            </div>


          </div>
        </div>
      </main>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="startRename">
        <span class="context-menu-icon">✏️</span>
        重命名
      </div>
      <div class="context-menu-item delete" @click="confirmDelete">
        <span class="context-menu-icon">🗑️</span>
        删除
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="renameDialog.show" class="modal-overlay" @click="cancelRename">
      <div class="modal-content" @click.stop>
        <h3>重命名对话</h3>
        <input
          v-model="renameDialog.newTitle"
          type="text"
          placeholder="输入新的标题"
          class="rename-input"
          @keydown.enter="saveRename"
          @keydown.esc="cancelRename"
          ref="renameInput"
        />
        <div class="modal-actions">
          <button @click="cancelRename" class="btn-cancel">取消</button>
          <button @click="saveRename" class="btn-confirm">确定</button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="deleteDialog.show" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除这个对话吗？此操作无法撤销。</p>
        <div class="modal-actions">
          <button @click="cancelDelete" class="btn-cancel">取消</button>
          <button @click="confirmDeleteAction" class="btn-delete">删除</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 知识库操作选择模态框 -->
  <div v-if="showKnowledgeMenu" class="modal-overlay" @click="toggleKnowledgeMenu">
    <div class="modal-content action-modal" @click.stop>
      <h3>选择操作</h3>
      <div class="action-buttons">
        <button @click="selectUploadNew" class="action-btn upload-btn">
          <span class="action-icon">📤</span>
          <span class="action-text">上传新知识库</span>
          <span class="action-desc">支持PDF、TXT、Markdown等格式（≤100MB）</span>
        </button>
        <button @click="showExistingDocs" class="action-btn select-btn">
          <span class="action-icon">📂</span>
          <span class="action-text">选择已有知识库</span>
          <span class="action-desc">从已上传的文档中选择</span>
        </button>
      </div>
      <button @click="toggleKnowledgeMenu" class="btn-cancel">取消</button>
    </div>
  </div>

  <!-- 已有知识库选择模态框 -->
  <div v-if="showExistingDocsList" class="modal-overlay" @click="cancelDocumentSelection">
    <div class="modal-content docs-modal-content" @click.stop>
      <h3>选择知识库</h3>
      <div class="docs-list">
        <div v-if="availableDocuments.length === 0" class="empty-state">
          暂无已上传的文档
        </div>
        <div
          v-for="doc in availableDocuments"
          :key="doc.id"
          class="doc-item"
          :class="{ selected: doc.selected }"
          @click="toggleDocumentSelection(doc)"
        >
          <div class="doc-checkbox"></div>
          <div class="doc-info">
            <div class="doc-icon">{{ doc.icon || '📄' }}</div>
            <div class="doc-details">
              <div class="doc-name">{{ doc.filename }}</div>
              <div class="doc-date">{{ formatTime(doc.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button @click="cancelDocumentSelection" class="btn-cancel">取消</button>
        <button @click="confirmDocumentSelection" class="btn-confirm">
          确定 {{ selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : '' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Toast提示框 -->
  <Transition name="toast">
    <div v-if="toast.show" class="toast-container">
      <div :class="['toast', `toast-${toast.type}`]">
        <span class="toast-icon">
          {{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️' }}
        </span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { supabase } from '../lib/supabase.js'
import {
  updateUserStats,
  incrementConversations,
  incrementQuestions,
  updateContinuousDays,
  updateWeeklyProgress,
  incrementStudyTime
} from '../utils/stats.js'
import { initDatabase } from '../utils/initDatabase.js'
import { extractTextFromPDF, isPDFFile, formatFileSize } from '../utils/pdfParser.js'

// 响应式数据
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const messageInput = ref(null)
const conversations = ref([])
const currentConversationId = ref(null)
const uploadedDocuments = ref([])

// 知识库选择相关
const showKnowledgeMenu = ref(false)
const showExistingDocsList = ref(false)
const selectedKnowledgeBase = ref(null)
const availableDocuments = ref([])
const selectedDocuments = ref([])
const activeDocuments = ref([])
const enableRAG = ref(false) // RAG检索开关

// 上传进度相关
const uploadProgress = ref(0)
const isUploading = ref(false)
const uploadingFileName = ref('')

// Toast提示相关
const toast = ref({
  show: false,
  message: '',
  type: 'success' // success, error, info
})

// 右键菜单相关
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  conversation: null
})

const renameDialog = ref({
  show: false,
  newTitle: ''
})

const deleteDialog = ref({
  show: false
})

const renameInput = ref(null)

// 初始化
onMounted(async () => {
  // 初始化数据库表
  await initDatabase()

  await loadConversations()
  adjustTextareaHeight()

  // 从 localStorage 恢复 RAG 开关状态
  const savedRAGState = localStorage.getItem('enableRAG')
  if (savedRAGState !== null) {
    enableRAG.value = savedRAGState === 'true'
  }

  // 初始化用户统计
  await initUserStats()

  // 测试数据库权限
  testDatabaseAccess()
})

// 初始化用户统计
async function initUserStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userData) {
      // 确保用户有统计记录
      await updateUserStats(userData.id, {})
      // 更新连续学习天数
      await updateContinuousDays(userData.id)
      // 更新周进步分数
      await updateWeeklyProgress(userData.id)
    }
  } catch (error) {
    console.error('初始化用户统计失败:', error)
  }
}

// 测试数据库访问权限
async function testDatabaseAccess() {
  console.log('🧪 开始测试数据库访问权限...')

  try {
    // 测试1：获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    console.log('✅ 当前用户:', user?.email)

    // 测试2：直接查询conversations表
    const { data: testData, error: testError } = await supabase
      .from('conversations')
      .select('*')

    if (testError) {
      console.error('❌ 查询conversations表失败:', testError)
      console.error('错误详情:', JSON.stringify(testError, null, 2))

      // 如果是权限问题，会显示特定的错误信息
      if (testError.message && testError.message.includes('policy')) {
        console.error('⚠️ 这是RLS权限问题！需要在Supabase中配置Row Level Security策略')
      }
    } else {
      console.log('✅ 成功查询conversations表，数据数量:', testData?.length || 0)
      console.log('数据内容:', testData)
    }

    // 测试3：查询messages表
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)

    if (msgError) {
      console.error('❌ 查询messages表失败:', msgError)
    } else {
      console.log('✅ 成功查询messages表')
    }

  } catch (error) {
    console.error('测试过程出错:', error)
  }
}

// 加载对话列表
async function loadConversations() {
  try {
    console.log('📥 开始加载对话列表...')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('用户未登录，跳过加载对话')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userData) {
      console.log('用户ID:', userData.id)

      const { data: conversations_data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('查询对话失败:', error)
        return
      }

      console.log('数据库返回的对话数据:', conversations_data)
      conversations.value = conversations_data || []
      console.log('✅ 加载对话列表完成，总数:', conversations.value.length)

      // 暂时禁用清理功能来排查问题
      // setTimeout(() => {
      //   cleanEmptyConversations()
      // }, 2000)
    }
  } catch (error) {
    console.error('❌ 加载对话列表失败:', error)
  }
}

// 清理空的对话记录（只清理超过5分钟且没有消息的对话）
async function cleanEmptyConversations() {
  try {
    const emptyConversations = []
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    for (const conv of conversations.value) {
      // 跳过当前正在进行的对话
      if (conv.id === currentConversationId.value) {
        continue
      }

      // 只检查5分钟前创建的对话
      if (conv.created_at > fiveMinutesAgo) {
        continue
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conv.id)
        .limit(1)

      if (!messages || messages.length === 0) {
        emptyConversations.push(conv.id)
      }
    }

    if (emptyConversations.length > 0) {
      console.log('清理陈旧的空对话记录:', emptyConversations.length, '个')

      // 从数据库删除空对话
      await supabase
        .from('conversations')
        .delete()
        .in('id', emptyConversations)

      // 从本地状态移除
      conversations.value = conversations.value.filter(c => !emptyConversations.includes(c.id))
    }
  } catch (error) {
    console.error('清理空对话失败:', error)
  }
}

// 开始新对话
async function startNewChat() {
  console.log('🚀 开始新对话 - 调用开始')
  console.log('当前对话历史数量（调用前）:', conversations.value.length)
  console.log('当前对话ID:', currentConversationId.value)
  console.log('当前消息数量:', messages.value.length)

  // 保存当前对话（如果有内容的话）
  if (currentConversationId.value && messages.value.length > 0) {
    console.log('当前对话已有内容，保留在历史中')
  }

  // 清空当前聊天显示状态（但不影响对话历史）
  messages.value = []
  currentConversationId.value = null
  inputMessage.value = ''

  console.log('📋 清空显示状态后，对话历史数量:', conversations.value.length)

  // 验证对话历史是否完整
  if (conversations.value.length === 0) {
    console.error('⚠️ 对话历史意外清空！尝试重新加载...')
    await loadConversations()
  }

  // 聚焦输入框
  await nextTick()
  messageInput.value?.focus()

  console.log('✅ 开始新对话完成，最终对话历史数量:', conversations.value.length)
}

// 加载指定对话
async function loadConversation(conversationId) {
  try {
    console.log('加载对话:', conversationId)

    // 检查对话是否存在
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      console.log('对话不存在，移除本地记录')
      conversations.value = conversations.value.filter(c => c.id !== conversationId)
      return
    }

    currentConversationId.value = conversationId

    const { data: messages_data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    console.log('加载到的消息数量:', messages_data?.length || 0)

    messages.value = (messages_data || []).map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at
    }))

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('加载对话失败:', error)
    // 如果加载失败，从列表中移除这个对话
    conversations.value = conversations.value.filter(c => c.id !== conversationId)
  }
}

// 发送消息
async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  })

  isLoading.value = true

  try {
    // 记录是否是新对话
    const isNewConversation = !currentConversationId.value

    // 如果没有当前对话，先创建一个
    if (isNewConversation) {
      await createNewConversation(userMessage)
      // 获取当前用户ID并更新统计
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (userData) {
          await incrementConversations(userData.id)
          await updateContinuousDays(userData.id)
        }
      }
    }

    // 保存用户消息
    await saveMessage(currentConversationId.value, 'user', userMessage)

    // 更新提问统计
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (userData) {
        await incrementQuestions(userData.id)
      }
    }

    // 根据 RAG 开关决定是否搜索文档
    let relevantDocs = []
    if (enableRAG.value && activeDocuments.value.length > 0) {
      console.log('🔍 RAG检索模式: 开始搜索相关文档...')
      console.log('📞 调用搜索相关文档函数，用户消息:', userMessage)
      relevantDocs = await searchRelevantDocuments(userMessage)
      console.log('📋 搜索结果返回文档数量:', relevantDocs.length)

      if (relevantDocs.length > 0) {
        console.log('📄 找到相关文档，内容预览:', relevantDocs.map(doc => doc.substring(0, 50) + '...'))
      }
    } else {
      console.log('💬 纯聊天模式: 不进行文档检索')
      console.log('🎯 当前RAG状态:', enableRAG.value, '活动文档数量:', activeDocuments.value.length)
    }

    // 调用DeepSeek API
    const response = await callDeepSeekAPI(userMessage, relevantDocs)

    // 添加AI回复
    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    })

    // 保存AI消息
    await saveMessage(currentConversationId.value, 'assistant', response)

    // 如果是新对话，生成并更新标题
    if (isNewConversation && currentConversationId.value) {
      try {
        const title = await generateConversationTitle(userMessage, response)
        await updateConversationTitle(currentConversationId.value, title)
        console.log('📝 已生成对话标题:', title)
      } catch (error) {
        console.error('生成对话标题失败:', error)
      }
    }

    // 更新学习时间
    await updateLearningTime()

  } catch (error) {
    console.error('发送消息失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我现在无法回复。请稍后重试。',
      timestamp: new Date().toISOString()
    })
  } finally {
    isLoading.value = false
    await nextTick()
    scrollToBottom()
    adjustTextareaHeight()
  }
}

// 生成对话标题
async function generateConversationTitle(firstMessage, aiResponse) {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的对话标题生成助手。请根据用户的第一条消息和AI的回复，生成一个简洁、准确、有意义的对话标题。标题应该：1）不超过20个字符；2）准确概括对话主题；3）避免使用"聊天"、"对话"等通用词汇；4）直接输出标题，不要引号或其他装饰。'
          },
          {
            role: 'user',
            content: `用户问题：${firstMessage}\n\nAI回复：${aiResponse.slice(0, 200)}...\n\n请为这段对话生成一个合适的标题：`
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    })

    if (response.ok) {
      const data = await response.json()
      let title = data.choices[0].message.content.trim()
      // 移除可能的引号
      title = title.replace(/^["']|["']$/g, '')
      // 限制长度
      if (title.length > 20) {
        title = title.slice(0, 20) + '...'
      }
      return title || '新对话'
    }
  } catch (error) {
    console.error('生成标题失败:', error)
  }

  // 失败时返回默认标题
  return firstMessage.slice(0, 15) + (firstMessage.length > 15 ? '...' : '')
}

// 创建新对话
async function createNewConversation(firstMessage) {
  try {
    console.log('🔨 开始创建新对话...')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('用户未登录，无法创建对话')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userData) {
      // 使用最简单的数据格式
      const conversationData = {
        user_id: userData.id,
        title: '生成中...'
      }

      console.log('准备插入对话数据:', conversationData)

      const { data, error } = await supabase
        .from('conversations')
        .insert([conversationData])
        .select()

      if (error) {
        console.error('插入对话失败:', error)
        console.error('错误详情:', JSON.stringify(error, null, 2))
        return
      }

      if (data && data.length > 0) {
        const newConversation = data[0]
        currentConversationId.value = newConversation.id
        console.log('对话创建成功，ID:', newConversation.id)
        console.log('完整对话数据:', newConversation)
        console.log('当前对话历史数量（添加前）:', conversations.value.length)

        // 如果这是第一个对话，替换空状态；否则添加到开头
        if (conversations.value.length === 0) {
          conversations.value = [newConversation]
        } else {
          conversations.value.unshift(newConversation)
        }

        console.log('✅ 新对话已添加到历史，当前总数:', conversations.value.length)
        return newConversation.id
      } else {
        console.error('插入对话返回空数据:', data)
      }
    }
  } catch (error) {
    console.error('❌ 创建对话失败:', error)
  }
}

// 更新对话标题
async function updateConversationTitle(conversationId, title) {
  try {
    console.log('更新对话标题:', conversationId, title)

    const { error } = await supabase
      .from('conversations')
      .update({ title: title })
      .eq('id', conversationId)

    if (error) {
      console.error('更新对话标题失败:', error)
      console.error('错误详情:', JSON.stringify(error, null, 2))
    } else {
      console.log('对话标题更新成功')
      // 更新本地状态
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.title = title
        console.log('本地状态已更新')
      }
    }
  } catch (error) {
    console.error('更新对话标题异常:', error)
  }
}

// 保存消息
async function saveMessage(conversationId, role, content) {
  try {
    const messageData = {
      conversation_id: conversationId,
      role: role,
      content: content
    }

    console.log('保存消息:', messageData)
    const { error } = await supabase.from('messages').insert([messageData])

    if (error) {
      console.error('保存消息失败:', error)
      console.error('错误详情:', JSON.stringify(error, null, 2))
    } else {
      console.log('消息保存成功')
    }
  } catch (error) {
    console.error('保存消息异常:', error)
  }
}

// 搜索相关文档
async function searchRelevantDocuments(query) {
  try {
    console.log('🔍 开始搜索相关文档，查询词:', query)

    // 如果有选中的文档，只在选中的文档中搜索
    if (activeDocuments.value.length > 0) {
      console.log('📚 在选中的知识库中搜索，数量:', activeDocuments.value.length)
      const documentIds = activeDocuments.value.map(doc => doc.id)
      console.log('📋 文档IDs:', documentIds)

      // 搜索选中文档的chunks
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('content')
        .in('document_id', documentIds)

      if (error) {
        console.error('❌ 搜索选中文档失败:', error)
        return []
      }

      console.log('✅ 从选中文档中找到chunks:', chunks?.length || 0)

      if (!chunks || chunks.length === 0) {
        console.log('⚠️ 没有找到文档chunks，返回空数组')
        return []
      }

      // 改进的搜索逻辑：关键词匹配或相似度
      const queryLower = query.toLowerCase()
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1)

      console.log('🔍 搜索关键词:', queryWords)

      // 评分机制：根据匹配程度排序
      const scoredChunks = chunks.map(chunk => {
        const contentLower = chunk.content.toLowerCase()
        let score = 0

        // 完整查询匹配
        if (contentLower.includes(queryLower)) {
          score += 10
        }

        // 单词匹配
        queryWords.forEach(word => {
          if (contentLower.includes(word)) {
            score += 5
          }
        })

        return { content: chunk.content, score }
      })

      // 过滤出有相关性的chunks（score > 0）
      const relevantChunks = scoredChunks
        .filter(chunk => chunk.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // 只取最相关的5个chunks

      console.log('✅ 相关chunks数量:', relevantChunks.length)

      // 如果没有找到相关内容，返回前2个chunks作为上下文
      if (relevantChunks.length === 0 && chunks.length > 0) {
        console.log('⚠️ 没有找到完全匹配的内容，返回前2个文档块作为上下文')
        return chunks.slice(0, 2).map(chunk => chunk.content)
      }

      return relevantChunks.map(chunk => chunk.content)
    }

    // 原有的搜索逻辑（搜索所有文档）
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ 用户未登录')
      return []
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userError) {
      console.error('❌ 获取用户信息失败:', userError)
      return []
    }

    if (userData) {
      console.log('✅ 找到用户ID:', userData.id)

      const { data: documents, error: docError } = await supabase
        .from('document_chunks')
        .select('content, document_id')
        .eq('user_id', userData.id)

      if (docError) {
        console.error('❌ 获取文档块失败:', docError)
        return []
      }

      console.log('📄 找到文档块数量:', documents?.length || 0)

      if (documents && documents.length > 0) {
        const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1) // 过滤掉单字符
        console.log('🔑 搜索关键词:', keywords)

        const relevantDocs = documents.filter(doc => {
          const docContent = doc.content.toLowerCase()

          // 方法1：关键词匹配
          const keywordMatches = keywords.some(keyword =>
            docContent.includes(keyword)
          )

          // 方法2：模糊匹配 - 如果文档包含查询的任何字符
          const fuzzyMatches = query.toLowerCase().split('').some(char =>
            docContent.includes(char)
          )

          // 返回关键词匹配或者非常短的查询进行模糊匹配
          const matches = keywordMatches || (query.length <= 3 && fuzzyMatches)

          if (matches) {
            console.log('✅ 匹配文档片段:', docContent.substring(0, 100) + '...')
          }

          return matches
        })

        console.log('📋 找到相关文档数量:', relevantDocs.length)

        const result = relevantDocs.slice(0, 3).map(doc => doc.content)
        console.log('🎯 返回文档内容长度:', result.map(doc => doc.length))

        // 如果没有找到相关文档，返回前3个文档（兜底策略）
        if (result.length === 0 && documents.length > 0) {
          console.log('🔄 使用兜底策略：返回前3个文档')
          return documents.slice(0, 3).map(doc => doc.content)
        }

        return result
      }
    }
  } catch (error) {
    console.error('搜索文档失败:', error)
  }

  console.log('⚠️ 未找到相关文档')
  return []
}

// 调用DeepSeek API
async function callDeepSeekAPI(message, relevantDocs) {
  try {
    console.log('🤖 调用DeepSeek API，相关文档数量:', relevantDocs.length)

    let contextPrompt = ''
    let systemPrompt = ''

    if (relevantDocs.length > 0) {
      // 有文档时的上下文
      contextPrompt = `根据以下参考文档内容回答问题：

${relevantDocs.join('\n\n---\n\n')}

用户问题：`

      systemPrompt = '你是一个专业的AI学习助手，专门帮助8-15岁的孩子学习。请用简单易懂的语言回答问题，并且要有耐心和鼓励性。重要提醒：用户提供了相关的学习文档，请仔细阅读并基于文档内容来回答问题。如果文档中没有相关信息，请明确说明。'

      console.log('📖 使用了文档上下文，文档内容长度:', relevantDocs.join('').length)
      console.log('📝 提示词预览:', contextPrompt.substring(0, 200) + '...')
    } else {
      // 纯聊天模式
      contextPrompt = '用户问题：'
      systemPrompt = '你是孩子们的老师、玩伴和知己。你温暖、有趣、善于倾听，能够理解孩子的喜怒哀乐。你不会强行做学习心情，而是像朋友一样自然交流。可以先自我介绍，问兴趣或心情，让对话更自然亲切。'
      console.log('💬 纯聊天模式，没有文档上下文')
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: contextPrompt + message
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      console.error('DeepSeek API调用失败:', response.status, response.statusText)
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('DeepSeek API返回格式错误:', data)
      throw new Error('API返回数据格式错误')
    }

    return data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API调用异常:', error)
    return '抱歉，我现在无法回复。请检查网络连接或稍后重试。错误信息：' + error.message
  }
}

// 更新学习时间
async function updateLearningTime() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('learning_time')
      .eq('email', user.email)
      .single()

    if (userData) {
      const currentTime = userData.learning_time || 0
      const newTime = currentTime + 1

      await supabase
        .from('users')
        .update({ learning_time: newTime })
        .eq('email', user.email)
    }
  } catch (error) {
    console.error('更新学习时间失败:', error)
  }
}

// 切换知识库菜单显示
function toggleKnowledgeMenu() {
  showKnowledgeMenu.value = !showKnowledgeMenu.value
}

// 选择上传新知识库
function selectUploadNew() {
  showKnowledgeMenu.value = false
  // 触发文件选择器
  document.getElementById('fileInput').click()
}

// 显示已有文档列表
async function showExistingDocs() {
  showKnowledgeMenu.value = false
  showExistingDocsList.value = true

  // 加载用户的所有文档
  await loadAvailableDocuments()
}

// 加载可用文档列表
async function loadAvailableDocuments() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (userData) {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('id, filename, created_at')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('加载文档失败:', error)
        return
      }

      availableDocuments.value = docs.map(doc => ({
        ...doc,
        icon: getFileIcon(doc.filename),
        selected: selectedDocuments.value.some(d => d.id === doc.id)
      }))
    }
  } catch (error) {
    console.error('加载文档列表失败:', error)
  }
}

// 选择/取消选择文档
function toggleDocumentSelection(doc) {
  const index = selectedDocuments.value.findIndex(d => d.id === doc.id)
  if (index > -1) {
    selectedDocuments.value.splice(index, 1)
  } else {
    selectedDocuments.value.push(doc)
  }

  // 更新可用文档列表中的选中状态
  const availableDoc = availableDocuments.value.find(d => d.id === doc.id)
  if (availableDoc) {
    availableDoc.selected = !availableDoc.selected
  }
}

// 确认选择文档
function confirmDocumentSelection() {
  activeDocuments.value = [...selectedDocuments.value]
  selectedKnowledgeBase.value = activeDocuments.value.length > 0
    ? `已选择 ${activeDocuments.value.length} 个知识库`
    : null

  // 如果选择了文档，自动开启RAG检索
  if (activeDocuments.value.length > 0) {
    enableRAG.value = true
    localStorage.setItem('enableRAG', 'true')
    showToast(`已选择 ${activeDocuments.value.length} 个知识库，自动开启检索模式`, 'success')
  }

  showExistingDocsList.value = false
  console.log('✅ 已选择文档:', activeDocuments.value.map(d => d.filename))
}

// 取消选择文档
function cancelDocumentSelection() {
  showExistingDocsList.value = false
}

// 移除激活的文档
function removeActiveDocument(doc) {
  const index = activeDocuments.value.findIndex(d => d.id === doc.id)
  if (index > -1) {
    activeDocuments.value.splice(index, 1)
  }

  // 同时从selectedDocuments中移除
  const selectedIndex = selectedDocuments.value.findIndex(d => d.id === doc.id)
  if (selectedIndex > -1) {
    selectedDocuments.value.splice(selectedIndex, 1)
  }

  // 更新知识库显示状态
  if (activeDocuments.value.length === 0) {
    selectedKnowledgeBase.value = null
    // 移除所有文档后自动关闭RAG
    enableRAG.value = false
    localStorage.setItem('enableRAG', 'false')
    showToast(`已移除知识库：${doc.filename}，切换到纯聊天模式`, 'info')
  } else {
    selectedKnowledgeBase.value = `已选择 ${activeDocuments.value.length} 个知识库`
    showToast(`已移除知识库：${doc.filename}`, 'info')
  }
}

// 清除所有知识库
function clearAllDocuments() {
  activeDocuments.value = []
  selectedDocuments.value = []
  selectedKnowledgeBase.value = null

  // 清除知识库时自动关闭RAG
  enableRAG.value = false
  localStorage.setItem('enableRAG', 'false')

  showToast('已清除所有知识库，切换到纯聊天模式', 'info')
  console.log('🗑️ 清除所有知识库，关闭RAG检索')
}

// 处理文件上传
async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // 检查文件大小（限制为100MB）
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxSize) {
    showToast(`文件太大！请上传小于100MB的文件。当前文件大小：${formatFileSize(file.size)}`, 'error')
    event.target.value = ''
    return
  }

  // 检查文件类型
  const fileExtension = file.name.split('.').pop().toLowerCase()
  const supportedFormats = ['txt', 'md', 'json', 'csv', 'log', 'pdf']

  // Word文档暂不支持
  if (fileExtension === 'doc' || fileExtension === 'docx') {
    showToast('Word文档暂不支持，建议转换为TXT格式后上传', 'error')
    event.target.value = ''
    return
  }

  // 不支持的格式
  if (!supportedFormats.includes(fileExtension)) {
    showToast(`不支持的文件格式：.${fileExtension}`, 'error')
    event.target.value = ''
    return
  }

  // 开始上传
  isUploading.value = true
  uploadProgress.value = 0
  uploadingFileName.value = file.name

  try {
    // 模拟进度10%
    uploadProgress.value = 10

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    uploadProgress.value = 20

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    uploadProgress.value = 30

    if (userData) {
      let content = ''
      let extractedMetadata = {}

      // 根据文件类型处理
      if (isPDFFile(file)) {
        showToast('正在解析PDF文档，请稍候...', 'info')
        try {
          const pdfResult = await extractTextFromPDF(file)
          content = pdfResult.text
          extractedMetadata = pdfResult // 保存整个结果对象
          console.log(`📄 PDF解析成功，提取了 ${pdfResult.pageCount} 页内容`)
        } catch (pdfError) {
          console.error('PDF解析失败:', pdfError)
          showToast('PDF解析失败：' + pdfError.message, 'error')
          isUploading.value = false
          uploadProgress.value = 0
          uploadingFileName.value = ''
          event.target.value = ''
          return
        }
      } else {
        // 其他文本文件
        content = await readFileContent(file)
      }

      uploadProgress.value = 50

      const chunks = chunkContent(content, 1000)
      uploadProgress.value = 60

      const documentData = {
        id: crypto.randomUUID(),
        user_id: userData.id,
        filename: file.name,
        content: content,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase.from('documents').insert(documentData)
      if (error) {
        console.error('文档保存失败:', error)
        showToast('文档保存失败，请重试', 'error')
        return
      }

      console.log('📄 文档保存成功，开始保存文档块，数量:', chunks.length)

      uploadProgress.value = 70

      // 尝试保存chunks，但如果失败不影响主流程
      let chunksSuccess = false
      try {
        // 根据chunk数量计算进度
        const progressPerChunk = 25 / Math.max(chunks.length, 1) // 70%-95%分给chunks

        for (let i = 0; i < chunks.length; i++) {
          const chunkData = {
            id: crypto.randomUUID(),
            document_id: documentData.id,
            user_id: userData.id,
            content: chunks[i],
            chunk_index: i,
            created_at: new Date().toISOString()
          }

          const { error: chunkError } = await supabase.from('document_chunks').insert(chunkData)

          if (chunkError) {
            console.error(`文档块${i}保存失败:`, chunkError)
            // 如果是表不存在，跳出循环
            if (chunkError.code === '42P01' || chunkError.message?.includes('relation') || chunkError.message?.includes('does not exist')) {
              console.log('⚠️ document_chunks表不存在，跳过文档块保存')
              break
            }
            // 其他错误也跳过，不中断流程
            break
          }

          // 更新进度
          uploadProgress.value = Math.min(70 + Math.floor((i + 1) * progressPerChunk), 95)

          // 如果至少保存了一个chunk，标记为成功
          if (i === chunks.length - 1) {
            chunksSuccess = true
          }
        }
      } catch (chunkErr) {
        console.error('保存文档块时出错:', chunkErr)
        // 继续执行，不中断流程
      }

      // 无论chunks是否保存成功，都完成上传
      uploadProgress.value = 100

      if (!chunksSuccess) {
        console.log('⚠️ 文档块未能保存（可能表不存在），但文档主体已保存成功')
      }

      // 添加到已上传文档列表
      const uploadedDoc = {
        id: documentData.id,
        filename: file.name,
        size: file.size,
        uploadTime: new Date(),
        icon: getFileIcon(file.name)
      }
      uploadedDocuments.value.push(uploadedDoc)

      // 自动添加到激活的文档列表
      activeDocuments.value.push(uploadedDoc)

      // 自动开启RAG检索
      if (activeDocuments.value.length > 0) {
        enableRAG.value = true
        localStorage.setItem('enableRAG', 'true')
      }

      console.log('✅ 文档上传完成:', file.name)
      console.log('📚 当前激活文档数量:', activeDocuments.value.length)

      // 根据文件类型显示不同的成功消息
      let successMessage = ''
      if (isPDFFile(file)) {
        if (extractedMetadata.pageCount) {
          successMessage = `PDF文档"${file.name}"解析成功！共${extractedMetadata.pageCount}页，分为${chunks.length}个文档块。`
        } else {
          successMessage = `PDF文档"${file.name}"上传成功！共分为${chunks.length}个文档块。`
        }
      } else {
        successMessage = `文档"${file.name}"上传成功！共分为${chunks.length}个文档块。`
      }

      if (chunksSuccess) {
        showToast(successMessage, 'success')
      } else {
        showToast(`文档"${file.name}"已保存！`, 'success')
      }
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    showToast('文件上传失败，请重试', 'error')
  } finally {
    // 重置上传状态
    setTimeout(() => {
      isUploading.value = false
      uploadProgress.value = 0
      uploadingFileName.value = ''
    }, 1000) // 延迟1秒后隐藏进度条
  }

  event.target.value = ''
}

// 读取文件内容
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file, 'UTF-8')
  })
}

// 分割内容为块
function chunkContent(content, chunkSize) {
  const chunks = []
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize))
  }
  return chunks
}

// 处理Enter键
function handleEnter(event) {
  if (event.shiftKey) {
    return
  }
  event.preventDefault()
  sendMessage()
}

// 自动调整输入框高度
function adjustTextareaHeight() {
  const textarea = messageInput.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }
}

// 滚动到底部
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 渲染Markdown内容
function getRenderedContent(content) {
  if (typeof content !== 'string') {
    return String(content)
  }

  return content
    .replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-bold mb-2 mt-4 text-blue-400">$1</h3>')
    .replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-bold mb-3 mt-5 text-blue-400">$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1 class="text-2xl font-bold mb-4 mt-6 text-blue-400">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-cyan-300">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-yellow-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-green-400 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>')
    .replace(/\n/g, '<br>')
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

// 获取文件图标
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const iconMap = {
    txt: '📄',
    pdf: '📕',
    doc: '📘',
    docx: '📘',
    md: '📝'
  }
  return iconMap[ext] || '📄'
}


// 显示Toast提示
function showToast(message, type = 'success') {
  toast.value.message = message
  toast.value.type = type
  toast.value.show = true

  // 3秒后自动关闭
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// RAG 开关切换
function onRAGToggle() {
  // 保存开关状态到 localStorage
  localStorage.setItem('enableRAG', enableRAG.value.toString())

  // 显示提示
  const mode = enableRAG.value ? '检索模式' : '纯聊天模式'
  showToast(`已切换到${mode}`, 'info')
  console.log(`🔄 切换到${mode}, RAG状态: ${enableRAG.value}`)

  // 如果关闭RAG但没有文档，给出提示
  if (enableRAG.value && activeDocuments.value.length === 0) {
    showToast('请先选择知识库', 'info')
    enableRAG.value = false
    localStorage.setItem('enableRAG', 'false')
  }
}

// 右键菜单相关函数
function showContextMenu(event, conversation) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    conversation: conversation
  }

  // 添加全局点击监听器来隐藏菜单
  document.addEventListener('click', hideContextMenu)
}

function hideContextMenu() {
  contextMenu.value.show = false
  document.removeEventListener('click', hideContextMenu)
}

// 重命名相关函数
function startRename() {
  renameDialog.value = {
    show: true,
    newTitle: contextMenu.value.conversation.title || '未命名对话'
  }
  hideContextMenu()

  // 等待DOM更新后聚焦输入框
  nextTick(() => {
    if (renameInput.value) {
      renameInput.value.focus()
      renameInput.value.select()
    }
  })
}

function cancelRename() {
  renameDialog.value.show = false
}

async function saveRename() {
  const newTitle = renameDialog.value.newTitle.trim()
  if (!newTitle) return

  try {
    await updateConversationTitle(contextMenu.value.conversation.id, newTitle)
    renameDialog.value.show = false
    console.log('重命名成功:', newTitle)
  } catch (error) {
    console.error('重命名失败:', error)
  }
}

// 删除相关函数
function confirmDelete() {
  deleteDialog.value.show = true
  hideContextMenu()
}

function cancelDelete() {
  deleteDialog.value.show = false
}

async function confirmDeleteAction() {
  try {
    const conversationId = contextMenu.value.conversation.id

    // 删除数据库中的对话和相关消息
    await supabase.from('messages').delete().eq('conversation_id', conversationId)
    await supabase.from('conversations').delete().eq('id', conversationId)

    // 从本地状态中移除
    conversations.value = conversations.value.filter(c => c.id !== conversationId)

    // 如果删除的是当前对话，切换到新对话状态
    if (currentConversationId.value === conversationId) {
      await startNewChat()
    }

    deleteDialog.value.show = false
    console.log('删除对话成功')
  } catch (error) {
    console.error('删除对话失败:', error)
  }
}
</script>

<style scoped>
.chat-page {
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
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 60px 20px 24px; /* 更大的右侧内边距 */
  margin: 0 20px 0 0; /* 右侧留白 */
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

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 主体内容 */
.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  width: calc(100% - 20px); /* Leave space on the right */
  min-width: 0;
  padding-right: 20px; /* Visual breathing room */
}

/* 左侧对话历史 */
.chat-history {
  width: 180px;
  background: rgba(20, 27, 45, 0.95);
  border-right: 1px solid rgba(59, 130, 246, 0.2);
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.history-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.history-count {
  background: var(--neon-blue);
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  font-size: 12px;
}

.history-item:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.history-item.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-history {
  text-align: center;
  color: var(--text-secondary);
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.8;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.8;
}

/* 右侧聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  background: rgba(30, 41, 59, 0.9);
  margin-right: 8px; /* Small gap from edge */
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 10px 20px 20px; /* 调整右侧内边距，给消息更多空间 */
  scroll-behavior: smooth;
  max-width: 100%; /* 限制容器宽度 */
}

/* 欢迎消息 */
.welcome-message {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-message h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

/* 消息样式 */
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: fadeInUp 0.5s ease;
  padding: 0 20px;
  max-width: 100%; /* 限制最大宽度 */
  overflow: hidden; /* 防止内容溢出 */
}

.message.user {
  justify-content: flex-end;
  flex-direction: row-reverse;
  padding-right: 40px; /* 增加右侧内边距，防止头像溢出 */
  padding-left: 60px; /* 左侧留白保持平衡 */
}

.message.user .message-content {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
  text-align: left;
  margin-right: 0;
  margin-left: auto;
}

.message.assistant .message-content {
  background: rgba(30, 41, 59, 0.8);
  color: var(--text-primary);
  margin-right: 0;
  text-align: left;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.assistant .message-avatar {
  margin-right: 0;
  margin-left: 0;
}

.message.user .message-avatar {
  margin-left: 12px;
  margin-right: 0;
}

.message-content {
  max-width: 70%;
  padding: 16px 20px;
  border-radius: 18px;
  position: relative;
}

.message.assistant .message-content {
  max-width: 90%;
}

.message-text {
  line-height: 1.6;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 8px;
}

/* 加载动画 */
.loading .message-content {
  padding: 20px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--neon-blue);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 输入区域 */
.input-area {
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  padding: 20px 50px 20px 20px; /* 更大的右侦内边距 */
  margin-right: 8px; /* 右侧间距 */
  border-radius: 0 0 12px 12px;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 12px;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  background: rgba(20, 27, 45, 0.8);
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  outline: none;
  transition: border-color 0.3s ease;
}

.message-input:focus {
  border-color: var(--neon-blue);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.message-input::placeholder {
  color: var(--text-secondary);
}

.send-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border-radius: 12px;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-upload-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-btn {
  padding: 8px 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-btn:hover {
  border-color: var(--neon-blue);
  color: var(--neon-blue);
}

.upload-info {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 已上传文档样式 */
.uploaded-docs {
  margin-top: 12px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
}

.uploaded-docs-header {
  margin-bottom: 8px;
}

.docs-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--neon-blue);
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.doc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.doc-item:hover {
  background: rgba(59, 130, 246, 0.15);
}

.doc-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.doc-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-details {
  font-size: 11px;
  color: var(--text-secondary);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-history {
    width: 240px;
  }

  .message-content {
    max-width: 85%;
  }

  .input-area {
    padding: 16px;
  }
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 120px;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.context-menu-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.context-menu-item.delete:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.context-menu-icon {
  font-size: 14px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 90vw;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.modal-content h3 {
  color: var(--text-primary);
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-content p {
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.rename-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  background: rgba(20, 27, 45, 0.8);
  color: var(--text-primary);
  font-size: 14px;
  margin-bottom: 20px;
  outline: none;
  transition: border-color 0.3s ease;
}

.rename-input:focus {
  border-color: var(--neon-blue);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel, .btn-confirm, .btn-delete {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: rgba(75, 85, 99, 0.8);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: rgba(75, 85, 99, 1);
}

.btn-confirm {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-delete {
  background: linear-gradient(45deg, #ef4444, #dc2626);
  color: white;
}

.btn-delete:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* 知识库管理区域 */
.knowledge-section {
  margin: 16px 0;
  padding: 16px;
  background: rgba(30, 41, 59, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.knowledge-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.knowledge-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.knowledge-btn:hover {
  background: linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3));
  border-color: var(--neon-blue);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  transform: translateY(-1px);
}

/* 操作选择模态框 */
.action-modal {
  width: 420px;
  max-width: 90vw;
  padding: 32px;
  text-align: center;
}

.action-modal h3 {
  margin-bottom: 24px;
  font-size: 20px;
  color: var(--text-primary);
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.action-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--neon-blue);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
}

.action-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.action-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.action-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 已选择文档显示 */
.selected-docs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-label {
  color: var(--text-secondary);
  font-size: 12px;
  margin-bottom: 8px;
}

.doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 13px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.doc-tag-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-doc {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  line-height: 1;
}

.remove-doc:hover {
  background: rgba(239, 68, 68, 0.3);
  transform: scale(1.1);
}

/* 文档选择模态框 */
.docs-modal-content {
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
}

.docs-list {
  max-height: 400px;
  overflow-y: auto;
  margin: 20px 0;
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  background: rgba(20, 27, 45, 0.6);
}

.doc-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  cursor: pointer;
  transition: background 0.2s ease;
}

.doc-item:last-child {
  border-bottom: none;
}

.doc-item:hover {
  background: rgba(59, 130, 246, 0.05);
}

.doc-item.selected {
  background: rgba(59, 130, 246, 0.1);
}

.doc-checkbox {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  border: 2px solid rgba(59, 130, 246, 0.5);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.doc-item.selected .doc-checkbox {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border-color: transparent;
}

.doc-item.selected .doc-checkbox::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.doc-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-icon {
  font-size: 20px;
}

.doc-details {
  flex: 1;
}

.doc-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.doc-date {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 文件信息提示 */
.upload-info {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  margin-left: auto;
}

/* 激活的知识库显示 */
.active-knowledge-base {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
}

.kb-header {
  margin-bottom: 10px;
}

.kb-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.kb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kb-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.kb-item:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.kb-icon {
  font-size: 16px;
}

.kb-name {
  flex: 1;
  color: var(--text-primary);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-remove {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 50%;
  color: #ef4444;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

.kb-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  transform: scale(1.1);
}

/* RAG开关样式 */
.rag-switch-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px;
}

.rag-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.rag-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.rag-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(75, 85, 99, 0.5);
  transition: .4s;
  border-radius: 24px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.rag-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.rag-switch input:checked + .rag-slider {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border-color: var(--neon-blue);
}

.rag-switch input:checked + .rag-slider:before {
  transform: translateX(20px);
}

.rag-label {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Toast提示框样式 */
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(30, 41, 59, 0.98);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  pointer-events: all;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast-success {
  border: 1px solid rgba(34, 197, 94, 0.3);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(30, 41, 59, 0.98));
}

.toast-error {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(30, 41, 59, 0.98));
}

.toast-info {
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(30, 41, 59, 0.98));
}

.toast-icon {
  font-size: 20px;
}

.toast-message {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  max-width: 400px;
}

/* Toast动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* 上传进度条样式 */
.upload-progress-container {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  padding: 16px;
  margin-top: 12px;
  animation: fadeInUp 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.upload-progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.upload-icon {
  font-size: 20px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.upload-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-percentage {
  font-size: 16px;
  font-weight: 700;
  color: var(--neon-blue);
  min-width: 45px;
  text-align: right;
}

.upload-progress-bar {
  height: 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple));
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.upload-progress-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  to {
    left: 100%;
  }
}

.upload-progress-fill.complete {
  background: linear-gradient(90deg, var(--neon-green), var(--neon-blue));
  animation: glow 0.5s ease;
}

@keyframes glow {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }
}
</style>