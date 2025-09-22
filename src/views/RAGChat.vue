<template>
  <div class="rag-chat-container">
    <!-- 顶部栏 -->
    <div class="header">
      <h1>🎓 超级学霸 - 智能问答系统</h1>
      <div class="header-actions">
        <button @click="showKnowledgeManager = true" class="btn-secondary">
          📚 知识库管理
        </button>
        <button @click="logout" class="btn-danger">退出</button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="main-content">
      <!-- 左侧知识库选择 -->
      <div class="sidebar">
        <h3>知识库</h3>
        <div class="knowledge-base-selector">
          <label class="toggle-container">
            <input
              type="checkbox"
              v-model="useKnowledgeBase"
              @change="handleKnowledgeBaseToggle"
            >
            <span class="toggle-label">启用知识库</span>
          </label>

          <select
            v-if="useKnowledgeBase"
            v-model="selectedKnowledgeBase"
            class="kb-select"
          >
            <option value="">选择知识库...</option>
            <option
              v-for="kb in knowledgeBases"
              :key="kb.id"
              :value="kb.id"
            >
              {{ kb.name }}
            </option>
          </select>
        </div>

        <!-- 配置面板 -->
        <div v-if="useKnowledgeBase" class="config-panel">
          <h4>检索配置</h4>
          <div class="config-item">
            <label>Top K:</label>
            <input
              type="number"
              v-model.number="searchConfig.topK"
              min="1"
              max="10"
            >
          </div>
          <div class="config-item">
            <label>相似度阈值:</label>
            <input
              type="number"
              v-model.number="searchConfig.threshold"
              min="0"
              max="1"
              step="0.05"
            >
          </div>
        </div>

        <!-- 文档上传 -->
        <div v-if="selectedKnowledgeBase" class="upload-section">
          <h4>上传文档</h4>
          <input
            type="file"
            ref="fileInput"
            accept=".txt,.pdf,.docx"
            @change="handleFileUpload"
            style="display: none"
          >
          <button @click="$refs.fileInput.click()" class="btn-upload">
            📄 选择文件
          </button>
          <div v-if="uploadProgress > 0" class="progress-bar">
            <div
              class="progress-fill"
              :style="{width: uploadProgress + '%'}"
            ></div>
          </div>
        </div>
      </div>

      <!-- 右侧聊天区域 -->
      <div class="chat-area">
        <!-- 消息列表 -->
        <div class="messages" ref="messagesContainer">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role]"
          >
            <div class="message-content">
              <div v-if="msg.role === 'user'" class="user-message">
                {{ msg.content }}
              </div>
              <div v-else class="assistant-message">
                <div class="message-text" v-html="formatMessage(msg.content)"></div>

                <!-- 引用来源 -->
                <div v-if="msg.references && msg.references.length > 0" class="references">
                  <h5>📌 引用来源：</h5>
                  <div
                    v-for="(ref, refIndex) in msg.references"
                    :key="refIndex"
                    class="reference-item"
                  >
                    <span class="ref-filename">{{ ref.filename }}</span>
                    <span class="ref-page">页 {{ ref.page }}</span>
                    <div class="ref-preview">{{ ref.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 加载中提示 -->
          <div v-if="isLoading" class="message assistant">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <textarea
            v-model="inputMessage"
            @keydown.enter.prevent="handleEnter"
            placeholder="输入你的问题..."
            :disabled="isLoading"
            rows="3"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!inputMessage.trim() || isLoading"
            class="btn-send"
          >
            发送
          </button>
        </div>
      </div>
    </div>

    <!-- 知识库管理弹窗 -->
    <div v-if="showKnowledgeManager" class="modal">
      <div class="modal-content">
        <h2>知识库管理</h2>

        <!-- 创建新知识库 -->
        <div class="kb-create">
          <h3>创建知识库</h3>
          <input
            v-model="newKB.name"
            placeholder="知识库名称"
            class="input-field"
          >
          <textarea
            v-model="newKB.description"
            placeholder="描述（可选）"
            class="input-field"
            rows="3"
          ></textarea>
          <button @click="createKnowledgeBase" class="btn-primary">
            创建
          </button>
        </div>

        <!-- 知识库列表 -->
        <div class="kb-list">
          <h3>已有知识库</h3>
          <div
            v-for="kb in knowledgeBases"
            :key="kb.id"
            class="kb-item"
          >
            <div class="kb-info">
              <h4>{{ kb.name }}</h4>
              <p>{{ kb.description }}</p>
              <small>创建时间：{{ formatDate(kb.created_at) }}</small>
            </div>
            <button
              @click="deleteKnowledgeBase(kb.id)"
              class="btn-delete"
            >
              删除
            </button>
          </div>
        </div>

        <button @click="showKnowledgeManager = false" class="btn-close">
          关闭
        </button>
      </div>
    </div>

    <!-- Toast提示 -->
    <Toast ref="toast" />
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import Toast from '../components/Toast.vue'

// API配置
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default {
  name: 'RAGChat',
  components: {
    Toast
  },
  setup() {
    const router = useRouter()
    const toast = ref(null)
    const messagesContainer = ref(null)

    // 状态
    const messages = ref([])
    const inputMessage = ref('')
    const isLoading = ref(false)
    const useKnowledgeBase = ref(false)
    const selectedKnowledgeBase = ref('')
    const knowledgeBases = ref([])
    const showKnowledgeManager = ref(false)
    const uploadProgress = ref(0)

    // 配置
    const searchConfig = ref({
      topK: 3,
      threshold: 0.75
    })

    // 新建知识库表单
    const newKB = ref({
      name: '',
      description: ''
    })

    // 获取当前用户
    const getCurrentUser = () => {
      const userStr = localStorage.getItem('user')
      return userStr ? JSON.parse(userStr) : null
    }

    // 加载知识库列表
    const loadKnowledgeBases = async () => {
      try {
        const user = getCurrentUser()
        if (!user) return

        const response = await fetch(`${API_BASE}/api/knowledge-bases/${user.id}`)
        const data = await response.json()

        if (data.success) {
          knowledgeBases.value = data.knowledgeBases
        }
      } catch (error) {
        console.error('加载知识库失败:', error)
        toast.value?.show('加载知识库失败', 'error')
      }
    }

    // 创建知识库
    const createKnowledgeBase = async () => {
      if (!newKB.value.name.trim()) {
        toast.value?.show('请输入知识库名称', 'warning')
        return
      }

      try {
        const user = getCurrentUser()
        const response = await fetch(`${API_BASE}/api/knowledge-bases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            name: newKB.value.name,
            description: newKB.value.description
          })
        })

        const data = await response.json()
        if (data.success) {
          knowledgeBases.value.push(data.knowledgeBase)
          newKB.value = { name: '', description: '' }
          toast.value?.show('知识库创建成功', 'success')
        }
      } catch (error) {
        console.error('创建知识库失败:', error)
        toast.value?.show('创建知识库失败', 'error')
      }
    }

    // 删除知识库
    const deleteKnowledgeBase = async (id) => {
      if (!confirm('确定删除这个知识库吗？')) return

      try {
        // 这里应该调用删除API
        knowledgeBases.value = knowledgeBases.value.filter(kb => kb.id !== id)
        toast.value?.show('知识库已删除', 'success')
      } catch (error) {
        console.error('删除知识库失败:', error)
        toast.value?.show('删除知识库失败', 'error')
      }
    }

    // 处理文件上传
    const handleFileUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      if (!selectedKnowledgeBase.value) {
        toast.value?.show('请先选择知识库', 'warning')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', getCurrentUser().id)
      formData.append('knowledgeBaseId', selectedKnowledgeBase.value)

      try {
        uploadProgress.value = 10

        const response = await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          body: formData
        })

        uploadProgress.value = 100

        const data = await response.json()
        if (data.success) {
          toast.value?.show(`文档上传成功，已切分为${data.chunkCount}个片段`, 'success')
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error('文档上传失败:', error)
        toast.value?.show(error.message || '文档上传失败', 'error')
      } finally {
        uploadProgress.value = 0
        event.target.value = ''
      }
    }

    // 发送消息
    const sendMessage = async () => {
      const message = inputMessage.value.trim()
      if (!message) return

      // 添加用户消息
      messages.value.push({
        role: 'user',
        content: message
      })

      inputMessage.value = ''
      isLoading.value = true

      try {
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            knowledgeBaseId: selectedKnowledgeBase.value,
            useKnowledgeBase: useKnowledgeBase.value && selectedKnowledgeBase.value,
            history: messages.value.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          })
        })

        const data = await response.json()

        if (data.success) {
          messages.value.push({
            role: 'assistant',
            content: data.reply,
            references: data.references
          })
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        messages.value.push({
          role: 'assistant',
          content: '抱歉，发生了错误。请稍后重试。'
        })
      } finally {
        isLoading.value = false
        scrollToBottom()
      }
    }

    // 处理回车键
    const handleEnter = (event) => {
      if (!event.shiftKey) {
        sendMessage()
      }
    }

    // 处理知识库开关
    const handleKnowledgeBaseToggle = () => {
      if (useKnowledgeBase.value && !selectedKnowledgeBase.value && knowledgeBases.value.length > 0) {
        selectedKnowledgeBase.value = knowledgeBases.value[0].id
      }
    }

    // 格式化消息（支持Markdown）
    const formatMessage = (content) => {
      return marked(content)
    }

    // 格式化日期
    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleString('zh-CN')
    }

    // 滚动到底部
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    // 退出登录
    const logout = () => {
      localStorage.removeItem('user')
      router.push('/auth')
    }

    // 初始化
    onMounted(() => {
      const user = getCurrentUser()
      if (!user) {
        router.push('/auth')
        return
      }

      loadKnowledgeBases()

      // 添加欢迎消息
      messages.value.push({
        role: 'assistant',
        content: '你好！我是超级学霸AI助手。\n\n默认情况下，我会直接回答你的问题。如果你想基于特定文档获得答案，请：\n1. 开启"启用知识库"开关\n2. 选择或创建知识库\n3. 上传相关文档\n\n然后我就能基于你的文档内容提供精准答案，并标注信息来源。'
      })
    })

    return {
      messages,
      inputMessage,
      isLoading,
      useKnowledgeBase,
      selectedKnowledgeBase,
      knowledgeBases,
      showKnowledgeManager,
      uploadProgress,
      searchConfig,
      newKB,
      messagesContainer,
      toast,
      sendMessage,
      handleEnter,
      handleKnowledgeBaseToggle,
      handleFileUpload,
      createKnowledgeBase,
      deleteKnowledgeBase,
      formatMessage,
      formatDate,
      logout
    }
  }
}
</script>

<style scoped>
.rag-chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: white;
  padding: 1.5rem;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
}

.sidebar h3 {
  margin-top: 0;
  color: #2d3748;
}

.knowledge-base-selector {
  margin-bottom: 2rem;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
}

.toggle-label {
  user-select: none;
}

.kb-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 0.25rem;
  font-size: 0.9rem;
}

.config-panel {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.config-panel h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #4a5568;
  font-size: 0.9rem;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.config-item label {
  font-size: 0.85rem;
  color: #718096;
}

.config-item input {
  width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 0.25rem;
}

.upload-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}

.upload-section h4 {
  margin-bottom: 1rem;
  color: #4a5568;
  font-size: 0.9rem;
}

.btn-upload {
  width: 100%;
  padding: 0.75rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-upload:hover {
  background: #3182ce;
}

.progress-bar {
  margin-top: 0.5rem;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #48bb78;
  transition: width 0.3s ease;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.messages {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.message {
  margin-bottom: 1.5rem;
}

.message.user .message-content {
  display: flex;
  justify-content: flex-end;
}

.user-message {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  border-radius: 1rem 1rem 0 1rem;
  max-width: 70%;
  word-wrap: break-word;
}

.assistant-message {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 0 1rem 1rem 1rem;
  max-width: 80%;
}

.message-text {
  color: #2d3748;
  line-height: 1.6;
}

.references {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.references h5 {
  margin: 0 0 0.5rem 0;
  color: #718096;
  font-size: 0.85rem;
}

.reference-item {
  background: white;
  padding: 0.75rem;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
  border: 1px solid #e2e8f0;
}

.ref-filename {
  font-weight: 600;
  color: #4a5568;
  margin-right: 0.5rem;
}

.ref-page {
  color: #718096;
  font-size: 0.85rem;
}

.ref-preview {
  margin-top: 0.5rem;
  color: #718096;
  font-size: 0.85rem;
  font-style: italic;
}

.loading-dots {
  display: flex;
  gap: 0.25rem;
  padding: 1rem;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: #cbd5e0;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.input-area {
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 1rem;
}

.input-area textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 0.5rem;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
}

.input-area textarea:focus {
  outline: none;
  border-color: #667eea;
}

.btn-send {
  padding: 0 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s, opacity 0.2s;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 按钮样式 */
.btn-primary {
  background: #667eea;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-secondary {
  background: white;
  color: #4a5568;
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e0;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-danger {
  background: #f56565;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-delete {
  background: #fc8181;
  color: white;
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
}

/* 模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
  color: #2d3748;
}

.kb-create {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.input-field {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 0.25rem;
  font-family: inherit;
}

.kb-list {
  margin-bottom: 1rem;
}

.kb-item {
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 0.25rem;
  margin-bottom: 0.75rem;
}

.kb-info h4 {
  margin: 0 0 0.25rem 0;
  color: #2d3748;
}

.kb-info p {
  margin: 0 0 0.5rem 0;
  color: #718096;
  font-size: 0.9rem;
}

.kb-info small {
  color: #a0aec0;
  font-size: 0.8rem;
}

.btn-close {
  width: 100%;
  padding: 0.75rem;
  background: #718096;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  margin-top: 1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .header h1 {
    font-size: 1.2rem;
  }

  .user-message,
  .assistant-message {
    max-width: 90%;
  }
}

/* Markdown内容样式 */
.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.message-text :deep(p) {
  margin-bottom: 0.75rem;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.message-text :deep(code) {
  background: #f7fafc;
  padding: 0.125rem 0.25rem;
  border-radius: 0.125rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  background: #2d3748;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #cbd5e0;
  padding-left: 1rem;
  margin: 0.75rem 0;
  color: #718096;
}
</style>