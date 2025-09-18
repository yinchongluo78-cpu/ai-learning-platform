<template>
  <div class="test-oss-page">
    <div class="container">
      <h1>阿里云OSS测试页面</h1>

      <!-- 连接状态 -->
      <div class="status-card">
        <h2>OSS连接状态</h2>
        <div class="status-info">
          <div class="info-item">
            <span class="label">Bucket:</span>
            <span class="value">{{ ossConfig.bucket }}</span>
          </div>
          <div class="info-item">
            <span class="label">地域:</span>
            <span class="value">{{ ossConfig.region }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态:</span>
            <span :class="['value', connectionStatus]">{{ connectionMessage }}</span>
          </div>
        </div>
        <button @click="testConnection" :disabled="testing" class="test-btn">
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
      </div>

      <!-- 文件上传测试 -->
      <div class="upload-card">
        <h2>文件上传测试</h2>
        <div class="upload-area"
             @drop="handleDrop"
             @dragover.prevent
             @dragenter.prevent>
          <input type="file"
                 ref="fileInput"
                 @change="handleFileSelect"
                 style="display: none">
          <div v-if="!uploadFile" @click="$refs.fileInput.click()" class="upload-prompt">
            <div class="upload-icon">📁</div>
            <p>点击选择文件或拖拽文件到此处</p>
            <p class="file-hint">支持txt、pdf、doc、md等格式，最大100MB</p>
          </div>
          <div v-else class="file-info">
            <div class="file-icon">📄</div>
            <p class="file-name">{{ uploadFile.name }}</p>
            <p class="file-size">{{ formatFileSize(uploadFile.size) }}</p>
            <button @click="clearFile" class="clear-btn">清除</button>
          </div>
        </div>

        <!-- 上传进度 -->
        <div v-if="uploading" class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p class="progress-text">上传中... {{ uploadProgress }}%</p>
        </div>

        <button v-if="uploadFile && !uploading"
                @click="uploadToOSS"
                class="upload-btn">
          上传到OSS
        </button>

        <!-- 上传结果 -->
        <div v-if="uploadResult" class="result-section">
          <h3>上传结果</h3>
          <div v-if="uploadResult.success" class="success-result">
            <p class="success-icon">✅</p>
            <p>文件上传成功！</p>
            <div class="result-details">
              <p><strong>文件名：</strong>{{ uploadResult.data.originalName }}</p>
              <p><strong>OSS路径：</strong>{{ uploadResult.data.fileName }}</p>
              <p><strong>文件大小：</strong>{{ formatFileSize(uploadResult.data.size) }}</p>
              <p><strong>访问URL：</strong></p>
              <a :href="uploadResult.data.url" target="_blank" class="file-url">
                {{ uploadResult.data.url }}
              </a>
            </div>
          </div>
          <div v-else class="error-result">
            <p class="error-icon">❌</p>
            <p>上传失败：{{ uploadResult.error }}</p>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div v-if="uploadHistory.length > 0" class="history-card">
        <h2>上传历史</h2>
        <div class="history-list">
          <div v-for="(item, index) in uploadHistory" :key="index" class="history-item">
            <div class="history-info">
              <span class="history-name">{{ item.name }}</span>
              <span class="history-time">{{ formatTime(item.time) }}</span>
            </div>
            <span :class="['history-status', item.success ? 'success' : 'error']">
              {{ item.success ? '成功' : '失败' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { initOSSClient, uploadToOSS as ossUpload } from '../utils/aliyunOSS.js'

// 响应式数据
const ossConfig = ref({
  bucket: import.meta.env.VITE_OSS_BUCKET || '未配置',
  region: import.meta.env.VITE_OSS_REGION || '未配置'
})

const connectionStatus = ref('pending')
const connectionMessage = ref('未测试')
const testing = ref(false)

const uploadFile = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadResult = ref(null)
const uploadHistory = ref([])

// 测试连接
async function testConnection() {
  testing.value = true
  connectionStatus.value = 'testing'
  connectionMessage.value = '测试中...'

  try {
    // 检查配置
    if (!import.meta.env.VITE_OSS_ACCESS_KEY_ID ||
        import.meta.env.VITE_OSS_ACCESS_KEY_ID === '你的AccessKey_ID') {
      throw new Error('AccessKey ID未配置')
    }

    if (!import.meta.env.VITE_OSS_ACCESS_KEY_SECRET ||
        import.meta.env.VITE_OSS_ACCESS_KEY_SECRET === '你的AccessKey_Secret') {
      throw new Error('AccessKey Secret未配置')
    }

    // 初始化OSS客户端
    const client = initOSSClient()
    if (!client) {
      throw new Error('OSS客户端初始化失败')
    }

    // 尝试列出文件（测试权限）
    const testFileName = `test/connection_test_${Date.now()}.txt`
    const testContent = new Blob(['OSS connection test'], { type: 'text/plain' })

    // 尝试上传一个小文件测试
    const result = await client.put(testFileName, testContent)

    if (result && result.res && result.res.status === 200) {
      // 测试成功，删除测试文件
      await client.delete(testFileName)
      connectionStatus.value = 'success'
      connectionMessage.value = '连接成功'
    } else {
      throw new Error('连接测试失败')
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    connectionStatus.value = 'error'
    connectionMessage.value = `连接失败: ${error.message}`
  } finally {
    testing.value = false
  }
}

// 处理文件选择
function handleFileSelect(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    uploadFile.value = files[0]
    uploadResult.value = null
  }
}

// 处理文件拖拽
function handleDrop(event) {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    uploadFile.value = files[0]
    uploadResult.value = null
  }
}

// 清除文件
function clearFile() {
  uploadFile.value = null
  uploadResult.value = null
  uploadProgress.value = 0
}

// 上传到OSS
async function uploadToOSS() {
  if (!uploadFile.value) return

  console.log('开始上传文件:', uploadFile.value.name)
  console.log('文件大小:', uploadFile.value.size)

  uploading.value = true
  uploadProgress.value = 0
  uploadResult.value = null

  try {
    // 使用测试用户ID
    const userId = 'test_user_' + Date.now()

    console.log('调用OSS上传，用户ID:', userId)

    // 调用上传函数
    const result = await ossUpload(
      uploadFile.value,
      userId,
      (progress) => {
        console.log('收到进度更新:', progress)
        uploadProgress.value = progress
      }
    )

    console.log('上传结果:', result)
    uploadResult.value = result

    // 添加到历史记录
    uploadHistory.value.unshift({
      name: uploadFile.value.name,
      time: new Date(),
      success: result.success
    })

    // 限制历史记录数量
    if (uploadHistory.value.length > 5) {
      uploadHistory.value.pop()
    }

  } catch (error) {
    console.error('上传失败 - 详细错误:', error)
    uploadResult.value = {
      success: false,
      error: error.message || '上传失败，请查看控制台'
    }
  } finally {
    uploading.value = false
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化时间
function formatTime(date) {
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  return date.toLocaleTimeString()
}

// 初始化
onMounted(() => {
  // 自动测试连接
  testConnection()
})
</script>

<style scoped>
.test-oss-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
  padding: 40px 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #3b82f6;
  margin-bottom: 40px;
  font-size: 32px;
}

/* 卡片样式 */
.status-card,
.upload-card,
.history-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

h2 {
  color: #e2e8f0;
  margin: 0 0 20px 0;
  font-size: 20px;
}

/* 连接状态 */
.status-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 6px;
}

.label {
  color: #94a3b8;
  font-size: 14px;
}

.value {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
}

.value.success {
  color: #10b981;
}

.value.error {
  color: #ef4444;
}

.value.testing {
  color: #f59e0b;
}

.test-btn,
.upload-btn,
.clear-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.test-btn {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
}

.test-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 上传区域 */
.upload-area {
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.upload-area:hover {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.05);
}

.upload-prompt {
  cursor: pointer;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-prompt p {
  color: #e2e8f0;
  margin: 8px 0;
}

.file-hint {
  font-size: 12px;
  color: #94a3b8;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 48px;
}

.file-name {
  color: #e2e8f0;
  font-weight: 500;
}

.file-size {
  color: #94a3b8;
  font-size: 14px;
}

.clear-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}

.upload-btn {
  width: 100%;
  background: linear-gradient(45deg, #10b981, #3b82f6);
  color: white;
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* 进度条 */
.progress-section {
  margin: 20px 0;
}

.progress-bar {
  height: 8px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

/* 上传结果 */
.result-section {
  margin-top: 20px;
  padding: 20px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
}

.result-section h3 {
  color: #e2e8f0;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.success-result,
.error-result {
  text-align: center;
}

.success-icon,
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.success-result p,
.error-result p {
  color: #e2e8f0;
  margin: 8px 0;
}

.result-details {
  text-align: left;
  margin-top: 20px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 6px;
}

.result-details p {
  margin: 8px 0;
  color: #94a3b8;
  font-size: 14px;
  word-break: break-all;
}

.result-details strong {
  color: #e2e8f0;
}

.file-url {
  color: #3b82f6;
  text-decoration: none;
  word-break: break-all;
  display: block;
  margin-top: 4px;
}

.file-url:hover {
  text-decoration: underline;
}

/* 历史记录 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 6px;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-name {
  color: #e2e8f0;
  font-size: 14px;
}

.history-time {
  color: #64748b;
  font-size: 12px;
}

.history-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.history-status.success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.history-status.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
</style>