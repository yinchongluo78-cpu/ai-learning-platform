<template>
  <div class="knowledge-rag">
    <!-- 头部 -->
    <header class="header">
      <h1>📚 超级学霸 - RAG知识库</h1>
      <div class="header-actions">
        <button @click="showUploadDialog = true" class="btn-primary">
          📤 上传文档
        </button>
        <button @click="refreshDocuments" class="btn-secondary">
          🔄 刷新
        </button>
      </div>
    </header>

    <!-- 主体布局 -->
    <div class="main-container">
      <!-- 左侧：文档列表 -->
      <aside class="document-sidebar">
        <h3>📁 知识库文档</h3>

        <div v-if="documents.length === 0" class="empty-state">
          <p>暂无文档</p>
          <small>点击上传按钮添加文档</small>
        </div>

        <div v-else class="document-list">
          <div
            v-for="doc in documents"
            :key="doc.doc_id"
            :class="['document-item', { active: selectedDocs.includes(doc.doc_id) }]"
            @click="toggleDocument(doc.doc_id)"
          >
            <input
              type="checkbox"
              :checked="selectedDocs.includes(doc.doc_id)"
              @click.stop
              @change="toggleDocument(doc.doc_id)"
            />
            <div class="doc-info">
              <div class="doc-name">{{ doc.file_name }}</div>
              <div class="doc-meta">
                <span>{{ doc.chunk_count }} 片段</span>
                <span>{{ formatDate(doc.created_at) }}</span>
              </div>
            </div>
            <button
              @click.stop="deleteDocument(doc.doc_id)"
              class="btn-delete"
              title="删除文档"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="sidebar-footer">
          <label class="rag-toggle">
            <input
              type="checkbox"
              v-model="useRAG"
              @change="onRAGToggle"
            />
            <span>启用知识库检索</span>
          </label>
          <small v-if="selectedDocs.length > 0">
            已选择 {{ selectedDocs.length }} 个文档
          </small>
        </div>
      </aside>

      <!-- 右侧：聊天界面 -->
      <main class="chat-container">
        <!-- 检索设置 -->
        <div v-if="useRAG" class="rag-settings">
          <div class="setting-item">
            <label>Top-K:</label>
            <input
              type="number"
              v-model.number="ragSettings.topK"
              min="1"
              max="10"
            />
          </div>
          <div class="setting-item">
            <label>相似度阈值:</label>
            <input
              type="number"
              v-model.number="ragSettings.threshold"
              min="0.5"
              max="1.0"
              step="0.05"
            />
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="messages" ref="messagesContainer">
          <div v-if="messages.length === 0" class="welcome-message">
            <h2>👋 欢迎使用RAG知识库</h2>
            <p>上传文档后，我可以基于文档内容精准回答你的问题</p>
            <div class="tips">
              <h4>💡 使用提示：</h4>
              <ul>
                <li>默认模式下，我会像普通聊天一样回答</li>
                <li>选择文档并启用RAG后，我只会基于文档内容回答</li>
                <li>每个回答都会标注信息来源【文件名-页码】</li>
                <li>如果文档中没有相关信息，我会明确告知</li>
              </ul>
            </div>
          </div>

          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role]"
          >
            <div class="message-content">
              <div v-if="msg.role === 'assistant' && msg.sources" class="sources">
                <div class="source-header">📎 参考来源：</div>
                <div v-for="(source, idx) in msg.sources" :key="idx" class="source-item">
                  <span class="source-file">{{ source.file_name }}</span>
                  <span class="source-page">第{{ source.page }}页</span>
                  <span class="source-similarity">相似度: {{ (source.similarity * 100).toFixed(1) }}%</span>
                </div>
              </div>
              <div class="message-text" v-html="formatMessage(msg.content)"></div>
            </div>
          </div>

          <div v-if="isLoading" class="message assistant loading">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-container">
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
            class="send-btn"
          >
            发送
          </button>
        </div>
      </main>
    </div>

    <!-- 上传对话框 -->
    <div v-if="showUploadDialog" class="modal-overlay" @click="closeUploadDialog">
      <div class="modal-content" @click.stop>
        <h3>📤 上传文档到知识库</h3>

        <div class="upload-area"
             @drop="handleDrop"
             @dragover.prevent
             @dragenter.prevent>
          <input
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            accept=".txt,.md,.pdf,.docx"
            multiple
            style="display: none"
          />
          <button @click="$refs.fileInput.click()" class="upload-btn">
            选择文件
          </button>
          <p>或拖拽文件到此处</p>
          <small>支持 TXT, MD, PDF, DOCX 格式</small>
        </div>

        <div v-if="selectedFiles.length > 0" class="file-list">
          <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
            <span>{{ file.name }}</span>
            <span>{{ formatFileSize(file.size) }}</span>
            <button @click="removeFile(index)">❌</button>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeUploadDialog" class="btn-cancel">取消</button>
          <button
            @click="uploadFiles"
            :disabled="selectedFiles.length === 0 || isUploading"
            class="btn-primary"
          >
            {{ isUploading ? '上传中...' : '开始上传' }}
          </button>
        </div>

        <div v-if="uploadProgress" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <span>{{ uploadProgress }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { marked } from 'marked'

// 状态管理
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const documents = ref([])
const selectedDocs = ref([])
const useRAG = ref(false)
const showUploadDialog = ref(false)
const selectedFiles = ref([])
const isUploading = ref(false)
const uploadProgress = ref(0)
const messagesContainer = ref(null)

// RAG设置
const ragSettings = ref({
  topK: 3,
  threshold: 0.75
})

// 格式化消息（支持Markdown）
function formatMessage(content) {
  // 处理引用标记
  content = content.replace(/【([^】]+)】/g, '<span class="citation">[$1]</span>')
  return marked(content)
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 切换文档选择
function toggleDocument(docId) {
  const index = selectedDocs.value.indexOf(docId)
  if (index > -1) {
    selectedDocs.value.splice(index, 1)
  } else {
    selectedDocs.value.push(docId)
  }
}

// 切换RAG模式
function onRAGToggle() {
  if (useRAG.value && selectedDocs.value.length === 0) {
    alert('请先选择至少一个文档')
    useRAG.value = false
  }
}

// 发送消息
async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage = {
    role: 'user',
    content: inputMessage.value
  }
  messages.value.push(userMessage)

  const currentInput = inputMessage.value
  inputMessage.value = ''
  isLoading.value = true

  try {
    const requestBody = {
      messages: messages.value.map(m => ({
        role: m.role,
        content: m.content
      })),
      use_rag: useRAG.value,
      doc_ids: useRAG.value ? selectedDocs.value : null,
      top_k: ragSettings.value.topK,
      threshold: ragSettings.value.threshold
    }

    const response = await fetch('/api/rag?action=chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (data.no_results) {
      messages.value.push({
        role: 'assistant',
        content: data.message
      })
    } else {
      messages.value.push({
        role: 'assistant',
        content: data.message,
        sources: data.search_results
      })
    }

  } catch (error) {
    console.error('发送失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，发送消息时出现错误。请稍后再试。'
    })
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

// 处理回车键
function handleEnter(event) {
  if (!event.shiftKey) {
    sendMessage()
  }
}

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 刷新文档列表
async function refreshDocuments() {
  try {
    const response = await fetch('/api/rag?action=documents')
    const data = await response.json()
    documents.value = data.documents || []
  } catch (error) {
    console.error('获取文档列表失败:', error)
  }
}

// 删除文档
async function deleteDocument(docId) {
  if (!confirm('确定要删除这个文档吗？')) return

  try {
    const response = await fetch('/api/rag?action=documents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ doc_id: docId })
    })

    if (response.ok) {
      // 从选择列表中移除
      const index = selectedDocs.value.indexOf(docId)
      if (index > -1) {
        selectedDocs.value.splice(index, 1)
      }

      // 刷新文档列表
      await refreshDocuments()
    }
  } catch (error) {
    console.error('删除文档失败:', error)
  }
}

// 文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  selectedFiles.value = [...selectedFiles.value, ...files]
}

// 拖拽处理
function handleDrop(event) {
  event.preventDefault()
  const files = Array.from(event.dataTransfer.files)
  selectedFiles.value = [...selectedFiles.value, ...files]
}

// 移除文件
function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

// 关闭上传对话框
function closeUploadDialog() {
  showUploadDialog.value = false
  selectedFiles.value = []
  uploadProgress.value = 0
}

// 上传文件
async function uploadFiles() {
  if (selectedFiles.value.length === 0) return

  isUploading.value = true
  uploadProgress.value = 0

  try {
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      const content = await readFileContent(file)

      await fetch('/api/rag?action=upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_name: file.name,
          content: content,
          file_type: getFileType(file.name)
        })
      })

      uploadProgress.value = Math.round((i + 1) / selectedFiles.value.length * 100)
    }

    // 刷新文档列表
    await refreshDocuments()
    closeUploadDialog()
    alert('文档上传成功！')

  } catch (error) {
    console.error('上传失败:', error)
    alert('文档上传失败，请重试')
  } finally {
    isUploading.value = false
  }
}

// 读取文件内容
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// 获取文件类型
function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  return ext === 'pdf' ? 'pdf' : 'text'
}

// 组件挂载
onMounted(() => {
  refreshDocuments()
})
</script>

<style scoped>
.knowledge-rag {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 头部 */
.header {
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* 主容器 */
.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
}

/* 文档侧边栏 */
.document-sidebar {
  width: 300px;
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.document-sidebar h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.document-list {
  flex: 1;
  overflow-y: auto;
}

.document-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.document-item:hover {
  background: #f5f5f5;
}

.document-item.active {
  background: #e8f5e9;
  border-color: #4caf50;
}

.doc-info {
  flex: 1;
  margin: 0 0.75rem;
}

.doc-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.doc-meta {
  font-size: 0.75rem;
  color: #666;
  display: flex;
  gap: 1rem;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.7;
}

.btn-delete:hover {
  opacity: 1;
}

.sidebar-footer {
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.rag-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* 聊天容器 */
.chat-container {
  flex: 1;
  background: white;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.rag-settings {
  padding: 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  gap: 2rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setting-item input {
  width: 80px;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* 消息区域 */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.welcome-message {
  text-align: center;
  padding: 2rem;
}

.tips {
  text-align: left;
  max-width: 500px;
  margin: 2rem auto;
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 10px;
}

.tips ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.tips li {
  margin: 0.5rem 0;
}

.message {
  margin-bottom: 1.5rem;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user .message-content {
  background: #e3f2fd;
  margin-left: auto;
  max-width: 70%;
}

.message.assistant .message-content {
  background: #f5f5f5;
  max-width: 70%;
}

.message-content {
  padding: 1rem;
  border-radius: 10px;
}

.sources {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #fff3e0;
  border-radius: 8px;
}

.source-header {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.source-item {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #666;
}

.source-file {
  font-weight: 500;
  color: #333;
}

.message-text {
  line-height: 1.6;
}

.message-text :deep(.citation) {
  color: #1976d2;
  font-weight: 500;
  font-size: 0.875rem;
}

.loading-dots {
  display: flex;
  gap: 0.25rem;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: bounce 1.4s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

/* 输入区域 */
.input-container {
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 1rem;
}

.input-container textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
}

.send-btn {
  padding: 0 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.send-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 按钮样式 */
.btn-primary {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #5a67d8;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #f5f5ff;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 10px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 10px;
  padding: 2rem;
  text-align: center;
  margin: 1rem 0;
}

.upload-btn {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1rem;
}

.file-list {
  margin: 1rem 0;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.upload-progress {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s;
}
</style>