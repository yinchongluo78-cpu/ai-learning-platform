<template>
  <div class="knowledge-page">
    <!-- 头部 -->
    <div class="knowledge-header">
      <div class="header-content">
        <h1>知识库</h1>
        <p>上传和管理您的文档，构建个人知识库</p>
      </div>
      <button @click="showUploadDialog = true" class="upload-btn">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        上传文档
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button
          @click="currentTab = 'my'"
          :class="['tab-btn', { active: currentTab === 'my' }]"
        >
          我的文档
        </button>
        <button
          @click="currentTab = 'public'"
          :class="['tab-btn', { active: currentTab === 'public' }]"
        >
          公开文档
        </button>
      </div>

      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文档..."
          class="search-input"
        >
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="documents-grid">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredDocuments.length === 0" class="empty-state">
        <svg width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
        </svg>
        <p>{{ currentTab === 'my' ? '还没有上传文档' : '暂无公开文档' }}</p>
      </div>

      <div v-else class="documents-list">
        <div
          v-for="doc in filteredDocuments"
          :key="doc.id"
          class="document-card"
          @click="viewDocument(doc)"
        >
          <div class="doc-icon">
            📄
          </div>
          <div class="doc-info">
            <h3>{{ doc.filename }}</h3>
            <p class="doc-preview">{{ getDocumentPreview(doc.content) }}</p>
            <div class="doc-meta">
              <span v-if="doc.size">{{ formatFileSize(doc.size) }}</span>
              <span>{{ formatTime(doc.created_at) }}</span>
            </div>
          </div>
          <div class="doc-actions">
            <button @click.stop="deleteDocument(doc)" class="delete-btn" v-if="doc.is_my_document">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传对话框 -->
    <div v-if="showUploadDialog" class="dialog-overlay" @click.self="closeUploadDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h2>上传文档到知识库</h2>
          <button @click="closeUploadDialog" class="close-btn">×</button>
        </div>

        <div class="dialog-content">
          <div class="upload-area" @click="triggerFileInput" @drop="handleDrop" @dragover.prevent>
            <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p>点击或拖拽上传文档</p>
            <p class="upload-hint">支持 .txt、.md、.pdf、.doc、.docx 等格式</p>
          </div>

          <input
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            multiple
            accept=".txt,.md,.pdf,.doc,.docx"
            style="display: none"
          >

          <!-- 已选择的文件 -->
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <h3>已选择的文件：</h3>
            <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
              <span>{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button @click="removeFile(index)" class="remove-file">×</button>
            </div>
          </div>

          <!-- 上传进度 -->
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <p class="progress-text">
              上传中... {{ uploadProgress }}%
              <span v-if="currentFileIndex">
                ({{ currentFileIndex }}/{{ totalFiles }})
              </span>
            </p>
          </div>

          <div class="upload-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="makePublic">
              <span>设为公开文档</span>
            </label>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="closeUploadDialog" class="cancel-btn" :disabled="isUploading">取消</button>
          <button @click="uploadDocuments" class="confirm-btn" :disabled="selectedFiles.length === 0 || isUploading">
            {{ isUploading ? '上传中...' : '上传' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 文档查看对话框 -->
    <div v-if="viewingDocument" class="dialog-overlay" @click.self="closeViewDialog">
      <div class="dialog view-dialog">
        <div class="dialog-header">
          <h2>{{ viewingDocument.filename }}</h2>
          <button @click="closeViewDialog" class="close-btn">×</button>
        </div>

        <div class="dialog-content">
          <div class="document-content" v-html="formatDocumentContent(viewingDocument.content)"></div>
        </div>

        <div class="modal-actions">
          <button @click="closeViewDialog" class="cancel-btn">关闭</button>
          <button @click="useInChat" class="confirm-btn">在对话中使用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'
import { extractTextFromPDF, isPDFFile } from '../utils/pdfParser.js'

const router = useRouter()

// 响应式数据
const documents = ref([])
const currentTab = ref('my')
const searchQuery = ref('')
const showUploadDialog = ref(false)
const selectedFiles = ref([])
const makePublic = ref(false)
const isUploading = ref(false)
const viewingDocument = ref(null)
const loading = ref(false)
const fileInput = ref(null)
const uploadProgress = ref(0)
const currentFileIndex = ref(0)
const totalFiles = ref(0)

// 计算属性
const filteredDocuments = computed(() => {
  let docs = documents.value

  // 按标签页筛选
  if (currentTab.value === 'my') {
    docs = docs.filter(doc => doc.is_my_document)
  } else {
    docs = docs.filter(doc => doc.is_public)
  }

  // 按搜索词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    docs = docs.filter(doc =>
      doc.filename.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query)
    )
  }

  return docs
})

// 生命周期
onMounted(() => {
  loadDocuments()
})

// 方法
async function loadDocuments() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('用户未登录')
      return
    }

    // 获取我的文档和公开文档
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('加载文档失败:', error)
      return
    }

    // 标记哪些是我的文档
    documents.value = data.map(doc => ({
      ...doc,
      is_my_document: doc.user_id === user.id
    }))

  } catch (error) {
    console.error('加载文档出错:', error)
  } finally {
    loading.value = false
  }
}

// 触发文件选择
function triggerFileInput() {
  fileInput.value?.click()
}

// 处理文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  selectedFiles.value = [...selectedFiles.value, ...files]
}

// 处理拖拽
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
  if (!isUploading.value) {
    showUploadDialog.value = false
    selectedFiles.value = []
    uploadProgress.value = 0
    currentFileIndex.value = 0
    totalFiles.value = 0
  }
}

// 上传文档（简化版 - 通过服务器）
async function uploadDocuments() {
  if (selectedFiles.value.length === 0 || isUploading.value) return

  isUploading.value = true
  totalFiles.value = selectedFiles.value.length

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.$toast?.error('请先登录')
      return
    }

    const results = []

    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      currentFileIndex.value = i + 1
      uploadProgress.value = Math.round((i * 100) / totalFiles.value)

      try {
        // 读取文件内容
        let content = ''

        if (isPDFFile(file)) {
          // PDF文件暂时只保存文件信息（不依赖本地服务）
          content = `[PDF文档: ${file.name}]\n\n文件大小: ${formatFileSize(file.size)}\n\n注意：PDF内容提取需要后端服务支持。`
        } else {
          // 处理文本文件
          content = await readFileAsText(file)
        }

        // 保存到数据库（移除size字段以避免错误）
        const { data: document, error } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            filename: file.name,
            content: content,
            is_public: makePublic.value,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        results.push({ success: true, file: file.name })
        uploadProgress.value = Math.round(((i + 1) * 100) / totalFiles.value)

      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error)
        results.push({ success: false, file: file.name, error: error.message })
      }
    }

    // 统计结果
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    if (succeeded > 0) {
      window.$toast?.success(`成功上传 ${succeeded} 个文件${failed > 0 ? `，${failed} 个失败` : ''}`)
      await loadDocuments()
      closeUploadDialog()
    } else {
      window.$toast?.error('所有文件上传失败')
    }

  } catch (error) {
    console.error('上传失败:', error)
    window.$toast?.error('上传失败: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

// 读取文本文件
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

// 查看文档
function viewDocument(doc) {
  viewingDocument.value = doc
}

// 关闭查看对话框
function closeViewDialog() {
  viewingDocument.value = null
}

// 删除文档
async function deleteDocument(doc) {
  const confirmDelete = window.confirm(`确定要删除文档 "${doc.filename}" 吗？`)
  if (!confirmDelete) {
    return
  }

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id)

    if (error) {
      console.error('删除失败:', error)
      window.$toast?.error('删除失败')
      return
    }

    // 从列表中移除
    const index = documents.value.findIndex(d => d.id === doc.id)
    if (index > -1) {
      documents.value.splice(index, 1)
    }

    window.$toast?.success('删除成功')
  } catch (error) {
    console.error('删除文档出错:', error)
    window.$toast?.error('删除失败')
  }
}

// 在对话中使用
function useInChat() {
  if (viewingDocument.value) {
    router.push({
      path: '/dashboard/chat',
      query: {
        context: viewingDocument.value.id
      }
    })
  }
}

// 获取文档预览
function getDocumentPreview(content) {
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化文档内容
function formatDocumentContent(content) {
  // 简单的格式化，保留换行
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
/* 使用与原Knowledge.vue相同的样式 */
.knowledge-page {
  min-height: 100vh;
  background: var(--dark-bg);
  padding: 20px;
}

/* 头部样式 */
.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, rgba(20, 27, 45, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%);
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(59, 130, 246, 0.2);
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

.upload-btn {
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

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(20, 27, 45, 0.8);
  border-radius: 12px;
  margin-bottom: 24px;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
  border-color: transparent;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  padding: 8px 16px;
  background: rgba(10, 15, 30, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  width: 300px;
}

/* 文档网格 */
.documents-grid {
  min-height: 400px;
}

.documents-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.document-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(20, 27, 45, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.document-card:hover {
  transform: translateY(-2px);
  border-color: var(--neon-blue);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.doc-icon {
  font-size: 32px;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-preview {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.doc-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.doc-actions {
  display: flex;
  align-items: flex-start;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.delete-btn:hover {
  opacity: 1;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.dialog {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.view-dialog {
  max-width: 800px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.dialog-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}

.dialog-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.upload-area {
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: var(--neon-blue);
  background: rgba(59, 130, 246, 0.05);
}

.upload-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: var(--neon-blue);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

.selected-files {
  margin-top: 20px;
}

.selected-files h3 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(10, 15, 30, 0.4);
  border-radius: 8px;
  margin-bottom: 8px;
}

.file-size {
  color: var(--text-muted);
  font-size: 12px;
}

.remove-file {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.remove-file:hover {
  color: #ef4444;
}

.upload-progress {
  margin-top: 20px;
}

.progress-bar {
  height: 4px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  text-align: center;
}

.upload-options {
  margin-top: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
}

.dialog-actions, .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: transparent;
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--text-secondary);
}

.cancel-btn:hover:not(:disabled) {
  border-color: var(--neon-blue);
  color: var(--text-primary);
}

.confirm-btn {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  border: none;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.cancel-btn:disabled, .confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.document-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 加载和空状态 */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top-color: var(--neon-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  color: rgba(59, 130, 246, 0.3);
  margin-bottom: 16px;
}
</style>