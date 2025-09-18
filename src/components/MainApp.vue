<template>
  <div class="main-app">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <h1>🚀 AI学习平台</h1>
        <div class="user-info">
          <span v-if="userProfile">
            👋 {{ userProfile.name }}，{{ userProfile.age }}岁
          </span>
          <span v-else>👋 你好</span>
          <button @click="handleSignOut" class="sign-out-btn">退出登录</button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <!-- 左侧：学习统计面板 -->
      <aside class="stats-panel">
        <div class="stat-card">
          <h3>📊 学习统计</h3>
          <div class="stat-item">
            <span class="label">总学习时长：</span>
            <span class="value">{{ userProfile?.total_study_time || 0 }} 分钟</span>
          </div>
          <div class="stat-item">
            <span class="label">今日对话：</span>
            <span class="value">{{ todayConversations }} 次</span>
          </div>
          <div class="stat-item">
            <span class="label">上传文件：</span>
            <span class="value">{{ uploadedFiles }} 个</span>
          </div>
        </div>

        <div class="stat-card">
          <h3>📚 我的文件</h3>
          <div v-if="files.length === 0" class="empty-state">
            还没有上传任何学习资料
          </div>
          <div v-else class="file-list">
            <div v-for="file in files" :key="file.id" class="file-item">
              <span class="file-icon">📄</span>
              <span class="file-name">{{ file.filename }}</span>
              <button @click="deleteFile(file.id)" class="delete-btn" title="删除文件">
                ❌
              </button>
            </div>
          </div>
          <button class="upload-btn" @click="showUpload = true">
            + 上传新文件
          </button>
        </div>
      </aside>

      <!-- 右侧：AI对话区域 -->
      <section class="chat-section">
        <ChatBot />
      </section>
    </main>

    <!-- 文件上传弹窗 -->
    <div v-if="showUpload" class="upload-modal" @click="showUpload = false">
      <div class="upload-content" @click.stop>
        <h3>📁 上传学习资料</h3>
        <p>支持 PDF、TXT、图片等格式</p>

        <div class="upload-area"
             @drop="handleDrop"
             @dragover.prevent
             @dragenter.prevent>
          <input type="file"
                 ref="fileInput"
                 @change="handleFileSelect"
                 multiple
                 accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif"
                 style="display: none;">

          <div class="upload-placeholder">
            <div class="upload-icon">📤</div>
            <p>拖拽文件到这里，或点击选择文件</p>
            <button type="button" @click="triggerFileSelect">选择文件</button>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showUpload = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { supabase } from '../lib/supabase.js'
import { processDocument } from '../lib/documentProcessor.js'
import ChatBot from './ChatBot.vue'

// 使用认证状态
const { user, userProfile, signOut } = useAuth()

// 响应式数据
const showUpload = ref(false)
const files = ref([])
const conversations = ref([])
const fileInput = ref(null)

// 计算属性
const todayConversations = computed(() => {
  const today = new Date().toDateString()
  return conversations.value.filter(conv =>
    new Date(conv.created_at).toDateString() === today
  ).length
})

const uploadedFiles = computed(() => files.value.length)

// 页面加载时获取数据
onMounted(() => {
  loadUserFiles()
  loadConversations()
  refreshUserProfile()

  // 每30秒刷新一次用户数据，获取最新的学习时长
  setInterval(() => {
    refreshUserProfile()
  }, 30000)
})

// 刷新用户资料（获取最新的学习时长）
async function refreshUserProfile() {
  if (!userProfile.value) return

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userProfile.value.id)
      .single()

    if (!error && data) {
      // 更新本地的用户资料
      userProfile.value.total_study_time = data.total_study_time
      console.log('📊 当前学习时长：', data.total_study_time, '分钟')
    }
  } catch (err) {
    console.error('刷新用户资料失败:', err)
  }
}

// 加载用户文件
async function loadUserFiles() {
  if (!userProfile.value) return

  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userProfile.value.id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('加载文件失败:', error)
    } else {
      files.value = data
    }
  } catch (err) {
    console.error('加载文件出错:', err)
  }
}

// 加载对话记录
async function loadConversations() {
  if (!userProfile.value) return

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userProfile.value.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('加载对话记录失败:', error)
    } else {
      conversations.value = data
    }
  } catch (err) {
    console.error('加载对话记录出错:', err)
  }
}

// 触发文件选择
function triggerFileSelect() {
  console.log('触发文件选择')
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 处理文件选择
function handleFileSelect(event) {
  console.log('文件选择事件触发', event.target.files)
  const selectedFiles = Array.from(event.target.files)
  if (selectedFiles.length > 0) {
    console.log('选择了', selectedFiles.length, '个文件')
    uploadFiles(selectedFiles)
  } else {
    console.log('没有选择文件')
  }
}

// 处理拖拽文件
function handleDrop(event) {
  event.preventDefault()
  const droppedFiles = Array.from(event.dataTransfer.files)
  uploadFiles(droppedFiles)
}

// 上传文件（增强版本，支持文档处理）
async function uploadFiles(fileList) {
  console.log('🚀 uploadFiles 开始执行')
  console.log('用户信息:', user.value?.id)
  console.log('文件列表:', fileList)

  if (!user.value) {
    console.error('❌ 用户未登录')
    alert('请先登录')
    return
  }

  if (fileList.length === 0) {
    console.error('❌ 没有选择文件')
    alert('请选择文件')
    return
  }

  console.log('✅ 准备上传', fileList.length, '个文件')

  for (const file of fileList) {
    try {
      console.log('📁 处理文件:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      // 判断是否是文本类文件
      const isTextFile = file.type.includes('text') ||
                        file.name.endsWith('.txt') ||
                        file.name.endsWith('.md') ||
                        file.name.endsWith('.csv')

      if (isTextFile) {
        // 文本文件：进行简化的文档处理
        console.log('📄 检测到文本文件，开始简化处理...')

        // 先保存文件基本信息
        const insertData = {
          user_id: userProfile.value.id,
          filename: file.name,
          file_path: `documents/${userProfile.value.id}/${file.name}`,
          file_type: file.type || 'text/plain',
          file_size: file.size
        }

        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .insert([insertData])
          .select()
          .single()

        if (fileError) {
          console.error('保存文件失败:', fileError)
          alert(`保存失败：${fileError.message}`)
          continue
        }

        console.log('✅ 文件保存成功:', fileData.id)

        // 读取并保存文件内容为一个切片（简化版本）
        try {
          const reader = new FileReader()
          reader.onload = async (e) => {
            const content = e.target.result
            console.log('📖 读取文件内容，长度:', content.length)

            // 简单切分：每500字符一个片段
            const chunkSize = 500
            const chunks = []
            for (let i = 0; i < content.length; i += chunkSize) {
              chunks.push(content.substring(i, i + chunkSize))
            }

            console.log('✂️ 切分成', chunks.length, '个片段')

            // 保存切片
            for (let i = 0; i < Math.min(chunks.length, 10); i++) { // 最多保存10个片段
              const { error: chunkError } = await supabase
                .from('file_chunks')
                .insert([{
                  file_id: fileData.id,
                  content: chunks[i],
                  page_number: 1,
                  chunk_index: i
                }])

              if (chunkError) {
                console.error(`片段 ${i + 1} 保存失败:`, chunkError)
              } else {
                console.log(`✅ 片段 ${i + 1}/${chunks.length} 保存成功`)
              }
            }

            alert(`✅ 文档 ${file.name} 处理完成！保存了 ${Math.min(chunks.length, 10)} 个知识片段`)
          }

          reader.onerror = (error) => {
            console.error('读取文件失败:', error)
            alert('文件读取失败')
          }

          reader.readAsText(file)
        } catch (err) {
          console.error('处理文档出错:', err)
          alert(`处理失败：${err.message}`)
        }
      } else {
        // 非文本文件：只保存文件信息
        const insertData = {
          user_id: userProfile.value.id,
          filename: file.name,
          file_path: `mock/${userProfile.value.id}/${file.name}`,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size
        }

        console.log('💾 保存文件信息:', insertData)

        const { data: fileData, error: dbError } = await supabase
          .from('files')
          .insert([insertData])
          .select()

        if (dbError) {
          console.error('❌ 保存文件信息失败:', dbError)
          alert(`上传失败：${file.name} - ${dbError.message}`)
        } else {
          console.log('✅ 文件信息保存成功:', fileData)
          alert(`✅ 上传成功：${file.name}`)
        }
      }
    } catch (err) {
      console.error('❌ 上传文件出错:', err)
      alert(`❌ 上传出错：${file.name} - ${err.message}`)
    }
  }

  console.log('🔄 重新加载文件列表')
  // 重新加载文件列表
  await loadUserFiles()
  showUpload.value = false
  console.log('✅ 上传流程完成')
}

// 删除文件
async function deleteFile(fileId) {
  if (!confirm('确定要删除这个文件吗？')) {
    return
  }

  try {
    console.log('🗑️ 删除文件:', fileId)

    // 1. 先删除相关的文档切片
    const { error: chunkError } = await supabase
      .from('file_chunks')
      .delete()
      .eq('file_id', fileId)

    if (chunkError) {
      console.error('删除文档切片失败:', chunkError)
    }

    // 2. 删除文件记录
    const { error: fileError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (fileError) {
      console.error('删除文件失败:', fileError)
      alert('删除失败：' + fileError.message)
    } else {
      console.log('✅ 文件删除成功')
      alert('文件已删除')
      // 重新加载文件列表
      await loadUserFiles()
    }
  } catch (err) {
    console.error('删除文件出错:', err)
    alert('删除出错：' + err.message)
  }
}

// 退出登录
async function handleSignOut() {
  const { error } = await signOut()
  if (error) {
    alert('退出登录失败：' + error)
  }
  // 成功退出后，父组件会自动切换到登录界面
}
</script>

<style scoped>
.main-app {
  min-height: 100vh;
  background: #f8f9fa;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  font-size: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.sign-out-btn {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.sign-out-btn:hover {
  background: rgba(255,255,255,0.3);
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
  margin: 0 0 15px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-item .label {
  color: #666;
}

.stat-item .value {
  font-weight: bold;
  color: #007bff;
}

.file-list {
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.file-icon {
  font-size: 16px;
}

.file-name {
  font-size: 14px;
  color: #555;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 20px 0;
  font-style: italic;
}

.upload-btn {
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

.upload-btn:hover {
  background: #0056b3;
}

.chat-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 文件上传弹窗 */
.upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.upload-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  margin: 20px;
}

.upload-content h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin: 20px 0;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #007bff;
}

.upload-placeholder {
  color: #666;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.upload-placeholder button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .app-main {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .header-content {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}
</style>