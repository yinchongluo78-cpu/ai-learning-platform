<template>
  <div class="knowledge-page">
    <!-- 顶部标题栏 -->
    <header class="knowledge-header">
      <div class="header-content">
        <h1 class="page-title">知识库</h1>
        <p class="page-subtitle">管理你的学习资料，与他人分享知识</p>
      </div>
      <div class="header-actions">
        <button @click="showUploadDialog = true" class="upload-btn">
          <span class="btn-icon">📁</span>
          上传文档
        </button>
      </div>
    </header>

    <!-- 筛选和搜索栏 -->
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
          公开资料
        </button>
      </div>
      <div class="search-container">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          placeholder="搜索文档..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="document-list">
      <div v-if="filteredDocuments.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>{{ currentTab === 'my' ? '还没有上传任何文档' : '暂无公开资料' }}</h3>
        <p>{{ currentTab === 'my' ? '点击上传按钮开始添加学习资料' : '等待其他用户分享知识' }}</p>
      </div>

      <div class="documents-grid">
        <div
          v-for="doc in filteredDocuments"
          :key="doc.id"
          class="document-card"
          @click="viewDocument(doc)"
        >
          <div class="doc-header">
            <div class="doc-icon">
              {{ getFileIcon(doc.filename) }}
            </div>
            <div class="doc-actions" v-if="currentTab === 'my'">
              <button @click.stop="togglePublic(doc)" class="action-btn" :title="doc.is_public ? '设为私有' : '设为公开'">
                {{ doc.is_public ? '🌐' : '🔒' }}
              </button>
              <button @click.stop="deleteDocument(doc.id)" class="action-btn delete" title="删除">
                🗑️
              </button>
            </div>
          </div>

          <div class="doc-content">
            <h3 class="doc-title">{{ doc.filename }}</h3>
            <p class="doc-preview">{{ getDocumentPreview(doc.content) }}</p>

            <div class="doc-meta">
              <span class="doc-size">{{ formatFileSize(doc.content.length) }}</span>
              <span class="doc-date">{{ formatTime(doc.created_at) }}</span>
              <span v-if="doc.is_public" class="public-badge">公开</span>
            </div>

            <div v-if="currentTab === 'public' && doc.author_name" class="doc-author">
              <span class="author-label">作者：</span>
              <span class="author-name">{{ doc.author_name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文档上传对话框 -->
    <div v-if="showUploadDialog" class="modal-overlay" @click="closeUploadDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>上传文档</h2>
          <button @click="closeUploadDialog" class="close-btn">×</button>
        </div>

        <div class="upload-area" @drop="handleDrop" @dragover.prevent>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileSelect"
            accept=".txt,.pdf,.doc,.docx,.md"
            multiple
            style="display: none"
          />

          <div class="upload-zone" @click="$refs.fileInput.click()">
            <div class="upload-icon">📁</div>
            <p class="upload-text">点击选择文件或拖拽文件到此处</p>
            <p class="upload-hint">支持 TXT、PDF、DOC、DOCX、MD 格式，单个文件不超过10MB</p>
          </div>

          <div v-if="selectedFiles.length > 0" class="selected-files">
            <h4>已选择的文件：</h4>
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
            >
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button @click="removeFile(index)" class="remove-file">×</button>
            </div>
          </div>
        </div>

        <div class="upload-options">
          <label class="checkbox-container">
            <input type="checkbox" v-model="makePublic" />
            <span class="checkmark"></span>
            设为公开（其他用户可以查看）
          </label>
        </div>

        <div class="modal-actions">
          <button @click="closeUploadDialog" class="cancel-btn">取消</button>
          <button
            @click="uploadFiles"
            :disabled="selectedFiles.length === 0 || isUploading"
            class="confirm-btn"
          >
            {{ isUploading ? '上传中...' : '上传' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 文档查看对话框 -->
    <div v-if="viewingDocument" class="modal-overlay" @click="closeViewDialog">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h2>{{ viewingDocument.filename }}</h2>
          <button @click="closeViewDialog" class="close-btn">×</button>
        </div>

        <div class="document-viewer">
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

// 初始化
onMounted(async () => {
  await loadDocuments()
})

// 加载文档列表
async function loadDocuments() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!userData) return

    // 获取我的文档
    const { data: myDocs } = await supabase
      .from('documents')
      .select('*, users!documents_user_id_fkey(name)')
      .eq('user_id', userData.id)

    // 获取公开文档
    const { data: publicDocs } = await supabase
      .from('documents')
      .select('*, users!documents_user_id_fkey(name)')
      .eq('is_public', true)
      .neq('user_id', userData.id)

    // 合并数据并标记
    documents.value = [
      ...(myDocs || []).map(doc => ({
        ...doc,
        is_my_document: true,
        author_name: doc.users?.name
      })),
      ...(publicDocs || []).map(doc => ({
        ...doc,
        is_my_document: false,
        author_name: doc.users?.name
      }))
    ]
  } catch (error) {
    console.error('加载文档失败:', error)
  }
}

// 搜索处理
function handleSearch() {
  // 搜索逻辑已在计算属性中处理
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

// 获取文档预览
function getDocumentPreview(content) {
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
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

// 查看文档
function viewDocument(doc) {
  viewingDocument.value = doc
}

// 关闭查看对话框
function closeViewDialog() {
  viewingDocument.value = null
}

// 在对话中使用
function useInChat() {
  // 这里可以将文档内容传递给聊天页面
  router.push('/dashboard/chat')
  closeViewDialog()
}

// 切换公开状态
async function togglePublic(doc) {
  try {
    const newPublicState = !doc.is_public

    const { error } = await supabase
      .from('documents')
      .update({ is_public: newPublicState })
      .eq('id', doc.id)

    if (!error) {
      doc.is_public = newPublicState
    }
  } catch (error) {
    console.error('更新文档状态失败:', error)
    alert('操作失败，请重试')
  }
}

// 删除文档
async function deleteDocument(docId) {
  if (!confirm('确定要删除这个文档吗？此操作不可撤销。')) return

  try {
    // 删除文档块
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', docId)

    // 删除文档
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId)

    if (!error) {
      documents.value = documents.value.filter(doc => doc.id !== docId)
    }
  } catch (error) {
    console.error('删除文档失败:', error)
    alert('删除失败，请重试')
  }
}

// 文件选择处理
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

// 上传文件
async function uploadFiles() {
  if (selectedFiles.value.length === 0) return

  isUploading.value = true

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!userData) return

    for (const file of selectedFiles.value) {
      // 检查文件大小
      if (file.size > 10 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过10MB限制`)
        continue
      }

      const content = await readFileContent(file)
      const chunks = chunkContent(content, 1000)

      // 保存文档
      const documentData = {
        id: crypto.randomUUID(),
        user_id: userData.id,
        filename: file.name,
        content: content,
        is_public: makePublic.value,
        created_at: new Date().toISOString()
      }

      const { data: doc } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (doc) {
        // 保存文档块
        for (let i = 0; i < chunks.length; i++) {
          const chunkData = {
            id: crypto.randomUUID(),
            document_id: doc.id,
            user_id: userData.id,
            content: chunks[i],
            chunk_index: i,
            created_at: new Date().toISOString()
          }
          await supabase.from('document_chunks').insert(chunkData)
        }

        // 添加到本地列表
        documents.value.unshift({
          ...doc,
          is_my_document: true,
          author_name: userData.name
        })
      }
    }

    closeUploadDialog()
    alert('文档上传成功！')

  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败，请重试')
  } finally {
    isUploading.value = false
  }
}

// 关闭上传对话框
function closeUploadDialog() {
  showUploadDialog.value = false
  selectedFiles.value = []
  makePublic.value = false
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

// 分割内容
function chunkContent(content, chunkSize) {
  const chunks = []
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize))
  }
  return chunks
}

// 格式化文档内容显示
function formatDocumentContent(content) {
  return content
    .replace(/\n/g, '<br>')
    .replace(/### (.*?)(<br>|$)/g, '<h3 class="text-lg font-bold mb-2 mt-4 text-blue-400">$1</h3>')
    .replace(/## (.*?)(<br>|$)/g, '<h2 class="text-xl font-bold mb-3 mt-5 text-blue-400">$1</h2>')
    .replace(/# (.*?)(<br>|$)/g, '<h1 class="text-2xl font-bold mb-4 mt-6 text-blue-400">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
}
</script>

<style scoped>
.knowledge-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  width: 100%;
  min-width: 100%;
  position: relative;
}

/* 顶部标题栏 */
.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px 20px 24px; /* 增加右侧内边距 */
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
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  border-color: var(--neon-blue);
  color: var(--neon-blue);
}

.tab-btn.active {
  background: var(--neon-blue);
  color: white;
  border-color: var(--neon-blue);
}

.search-container {
  position: relative;
}

.search-input {
  padding: 8px 12px 8px 36px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.8);
  color: var(--text-primary);
  font-size: 14px;
  width: 200px;
  outline: none;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  border-color: var(--neon-blue);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

/* 文档列表 */
.document-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 60px 24px 24px; /* 更大的右侧内边距 */
  width: calc(100% - 20px);
  min-width: 0;
  margin-right: 20px; /* 右侧间距 */
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.document-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.document-card:hover {
  transform: translateY(-2px);
  border-color: var(--neon-blue);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.doc-icon {
  font-size: 24px;
}

.doc-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: rgba(59, 130, 246, 0.3);
}

.action-btn.delete:hover {
  background: rgba(255, 0, 110, 0.3);
  color: var(--neon-pink);
}

.doc-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  word-break: break-all;
}

.doc-preview {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 12px;
}

.doc-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.public-badge {
  background: var(--neon-green);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
}

.doc-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.author-name {
  color: var(--neon-blue);
  font-weight: 500;
}

/* 模态框样式 */
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
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
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
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 0, 110, 0.3);
}

/* 上传区域 */
.upload-area {
  margin-bottom: 20px;
}

.upload-zone {
  border: 2px dashed rgba(59, 130, 246, 0.4);
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-zone:hover {
  border-color: var(--neon-blue);
  background: rgba(59, 130, 246, 0.05);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.selected-files {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.selected-files h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  margin-bottom: 8px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.file-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.remove-file {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 0, 110, 0.2);
  border-radius: 4px;
  color: var(--neon-pink);
  cursor: pointer;
  font-size: 14px;
}

/* 上传选项 */
.upload-options {
  margin-bottom: 20px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.checkbox-container input[type="checkbox"] {
  margin: 0;
}

/* 文档查看器 */
.document-viewer {
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 20px;
  background: rgba(20, 27, 45, 0.5);
  margin-bottom: 20px;
}

.document-content {
  color: var(--text-primary);
  line-height: 1.6;
  word-wrap: break-word;
}

/* 模态框按钮 */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

.confirm-btn {
  background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .knowledge-header {
    padding: 16px;
  }

  .filter-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .documents-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .modal-content {
    margin: 20px;
    max-width: none;
    width: auto;
  }
}
</style>