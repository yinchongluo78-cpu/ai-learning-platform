<template>
  <div class="chatbot-container">
    <div class="chatbot-header">
      <h3>🤖 AI学习助手</h3>
      <p>我是你的专属学习伙伴，有任何问题都可以问我！</p>
      <button @click="clearHistory" class="clear-btn" style="margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer;">
        清空历史
      </button>
    </div>

    <!-- 聊天记录显示区域 -->
    <div class="chat-history" ref="chatHistoryRef">
      <div v-if="messages.length === 0" class="welcome-message">
        <div class="ai-message">
          <div class="message-content markdown-body" v-html="getRenderedContent(welcomeMessage)">
          </div>
        </div>
      </div>

      <div v-for="(message, index) in messages" :key="index" class="message-item">
        <!-- 用户消息 -->
        <div v-if="message.type === 'user'" class="user-message">
          <div class="message-content">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>

        <!-- AI回复 -->
        <div v-if="message.type === 'ai'" class="ai-message">
          <div class="message-content markdown-body" v-html="getRenderedContent(message.content)">
          </div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- 加载中指示器 -->
      <div v-if="isLoading" class="ai-message">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          AI正在思考中...
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-area">
      <form @submit.prevent="sendMessage">
        <div class="input-group">
          <textarea
            v-model="userInput"
            placeholder="在这里输入你的问题..."
            :disabled="isLoading"
            @keydown.enter.prevent="handleEnterKey"
            rows="2"
            ref="textareaRef"
          ></textarea>
          <button type="submit" :disabled="isLoading || !userInput.trim()">
            {{ isLoading ? '发送中...' : '发送' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { searchDocuments } from '../lib/documentProcessor.js'
import { renderMarkdown, getHighlightStyles } from '../lib/markdown.js'

// 响应式数据
const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const error = ref('')
const chatHistoryRef = ref(null)
const textareaRef = ref(null)
const currentUser = ref(null)
const conversationStartTime = ref(null)

// 欢迎消息（包含Markdown格式测试）
const welcomeMessage = `# 👋 欢迎来到AI学习平台！

我是你的 **AI学习助手**，随时为你提供帮助。

## 🚀 我可以帮你：
- 解答各种学习问题
- 解释复杂的概念
- 提供编程指导
- 讨论科技话题

## 💡 快速开始
你可以试试问我：
1. \`Python\` 如何定义函数？
2. 什么是**机器学习**？
3. 如何理解*递归算法*？

> 💭 提示：你可以上传文档，我会基于文档内容为你解答问题！

---
让我们开始学习之旅吧！🎯`

// 获取当前用户信息
onMounted(async () => {
  // 注入代码高亮样式
  const styleId = 'highlight-styles'
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style')
    styleElement.id = styleId
    styleElement.innerHTML = getHighlightStyles()
    document.head.appendChild(styleElement)
  }

  // 添加代码复制功能的事件委托
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
      const encodedCode = e.target.dataset.code
      if (encodedCode) {
        try {
          const code = decodeURIComponent(atob(encodedCode))
          navigator.clipboard.writeText(code).then(() => {
            const originalText = e.target.textContent
            e.target.textContent = '✅ 已复制'
            setTimeout(() => {
              e.target.textContent = originalText
            }, 2000)
          })
        } catch (err) {
          console.error('复制失败:', err)
        }
      }
    }
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    console.log('🔑 Auth用户:', user.email, user.id)

    // 从users表获取用户信息（使用email查找）
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single()

    console.log('👤 Users表用户数据:', userData)

    // 使用users表中的ID
    currentUser.value = userData || { id: user.id, email: user.email }
    console.log('✅ 当前用户:', currentUser.value)
    loadChatHistory()
  }
})

// 加载历史聊天记录
async function loadChatHistory() {
  try {
    const { data, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', currentUser.value.id)
      .order('created_at', { ascending: true })
      .limit(50) // 只加载最近50条

    if (fetchError) {
      console.error('加载聊天记录失败：', fetchError)
      return
    }

    // 转换数据格式
    const history = []
    data.forEach(conv => {
      // 处理用户消息
      let userContent = conv.message
      if (typeof userContent === 'object' && userContent !== null) {
        console.log('用户消息是对象:', userContent)
        userContent = userContent.content || userContent.message || JSON.stringify(userContent)
      }
      userContent = String(userContent || '')

      // 处理AI响应
      let aiContent = conv.ai_response

      // 如果是对象，尝试提取内容
      if (typeof aiContent === 'object' && aiContent !== null) {
        console.log('AI响应是对象:', aiContent)
        // 尝试各种可能的字段
        if (aiContent.content) {
          aiContent = aiContent.content
        } else if (aiContent.message) {
          aiContent = aiContent.message
        } else if (aiContent.choices && aiContent.choices[0]) {
          // 如果是完整的API响应对象
          if (aiContent.choices[0].message && aiContent.choices[0].message.content) {
            aiContent = aiContent.choices[0].message.content
          } else if (aiContent.choices[0].text) {
            aiContent = aiContent.choices[0].text
          }
        } else {
          // 如果都没有，转为JSON字符串
          aiContent = JSON.stringify(aiContent)
        }
      }
      aiContent = String(aiContent || '')

      history.push({
        type: 'user',
        content: userContent,
        timestamp: new Date(conv.created_at)
      })
      history.push({
        type: 'ai',
        content: aiContent,
        timestamp: new Date(conv.created_at)
      })
    })

    messages.value = history
    scrollToBottom()
  } catch (err) {
    console.error('加载聊天记录出错：', err)
  }
}

// 处理Enter键
function handleEnterKey(event) {
  // 如果没有按Shift，则发送消息
  if (!event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// 发送消息
async function sendMessage() {
  if (!userInput.value.trim() || isLoading.value) {
    console.log('消息发送被阻止：', {
      hasInput: !!userInput.value.trim(),
      isLoading: isLoading.value
    })
    return
  }

  // 检查用户是否已登录
  if (!currentUser.value) {
    error.value = '请先登录才能使用AI助手'
    return
  }

  const message = userInput.value.trim()
  userInput.value = ''
  error.value = ''

  console.log('🚀 开始发送消息:', message)

  // 记录对话开始时间
  if (!conversationStartTime.value) {
    conversationStartTime.value = new Date()
    console.log('⏰ 对话开始时间:', conversationStartTime.value)
  }

  // 添加用户消息到界面
  messages.value.push({
    type: 'user',
    content: message,
    timestamp: new Date()
  })

  // 设置加载状态
  isLoading.value = true
  console.log('⏳ 设置加载状态为 true')

  scrollToBottom()

  try {
    // 调用DeepSeek API
    console.log('📡 调用DeepSeek API')
    const aiResponse = await callDeepSeekAPI(message)
    console.log('✅ API调用成功，回复长度:', aiResponse.length)

    // 确保aiResponse是字符串
    const responseContent = typeof aiResponse === 'string' ? aiResponse : String(aiResponse)
    console.log('准备显示的AI回复:', responseContent)

    // 预先渲染Markdown
    let renderedContent = responseContent
    try {
      renderedContent = renderMarkdown(responseContent)
      console.log('预渲染的HTML:', renderedContent)
    } catch (err) {
      console.error('预渲染失败:', err)
    }

    // 添加AI回复到界面
    messages.value.push({
      type: 'ai',
      content: responseContent,
      renderedContent: renderedContent,  // 添加渲染后的内容
      timestamp: new Date()
    })

    // 保存对话到数据库
    console.log('💾 保存对话到数据库')
    await saveConversation(message, aiResponse)

    scrollToBottom()
  } catch (err) {
    console.error('❌ 发送消息失败：', err)
    error.value = 'AI助手暂时无法回复，请稍后再试：' + err.message
  } finally {
    // 确保加载状态被重置
    isLoading.value = false
    console.log('✅ 设置加载状态为 false')

    // 重新聚焦到输入框
    await nextTick()
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  }
}

// 调用DeepSeek API（增强版，支持文档检索）
async function callDeepSeekAPI(message) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DeepSeek API密钥未配置')
  }

  // 1. 先搜索相关文档
  console.log('🔍 搜索相关文档...')
  let relevantContext = ''
  let sources = []

  try {
    const searchResults = await searchDocuments(message, currentUser.value.id, 5)

    if (searchResults && searchResults.length > 0) {
      console.log('📚 找到', searchResults.length, '个相关文档片段')

      // 构建上下文
      relevantContext = '\n\n基于你上传的学习资料，以下是相关内容：\n'
      searchResults.forEach((doc, index) => {
        // 截取更多内容，让AI有更多上下文
        const contentPreview = doc.content.substring(0, 500)
        relevantContext += `\n[参考片段${index + 1}]：\n${contentPreview}\n`
        sources.push({
          content: doc.content,
          similarity: doc.similarity,
          preview: contentPreview
        })
      })

      console.log('📝 构建的上下文长度:', relevantContext.length)
      console.log('📄 参考内容预览:', sources[0]?.preview?.substring(0, 100))
    } else {
      console.log('📭 没有找到相关文档')
    }
  } catch (error) {
    console.error('文档搜索失败:', error)
    // 搜索失败不影响正常对话
  }

  // 2. 构建增强的系统提示
  let systemPrompt = '你是一个专门为8-15岁青少年设计的AI学习助手。你的任务是用简单易懂、有趣的方式回答他们关于科技、编程、人工智能和科学创新的问题。请用鼓励和启发的语调，帮助他们成为未来的创作者。回答要简洁、准确，并且适合这个年龄段的理解能力。'

  if (relevantContext) {
    systemPrompt += '\n\n请优先参考下面的学习资料来回答用户的问题。如果资料中有相关内容，请引用并解释；如果没有，则基于你的知识回答：' + relevantContext
  }

  // 3. 调用DeepSeek API
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
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
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`API调用失败: ${response.status}`)
  }

  const data = await response.json()
  console.log('API返回数据:', data)

  // 确保正确提取文本内容
  let aiResponse = ''
  if (data && data.choices && data.choices[0]) {
    // DeepSeek API 返回的格式
    if (data.choices[0].message && data.choices[0].message.content) {
      let content = data.choices[0].message.content

      // 如果content是对象，尝试获取真正的文本
      if (typeof content === 'object' && content !== null) {
        console.log('content是对象，尝试提取文本:', content)
        // 尝试各种可能的属性
        if (typeof content.text === 'string') {
          aiResponse = content.text
        } else if (typeof content.content === 'string') {
          aiResponse = content.content
        } else if (typeof content.message === 'string') {
          aiResponse = content.message
        } else {
          // 如果对象有toString方法或者valueOf方法
          const str = content.toString()
          if (str && str !== '[object Object]') {
            aiResponse = str
          } else {
            // 最后尝试JSON序列化
            aiResponse = JSON.stringify(content)
          }
        }
      } else {
        // content是字符串，直接使用
        aiResponse = String(content)
      }
    } else if (data.choices[0].text) {
      aiResponse = data.choices[0].text
    } else {
      console.error('无法从choices中提取内容:', data.choices[0])
      aiResponse = '抱歉，我无法理解API的响应格式。'
    }
  } else {
    console.error('API返回格式异常:', data)
    aiResponse = '抱歉，API返回了意外的格式。'
  }

  // 再次确保aiResponse是字符串
  if (typeof aiResponse !== 'string') {
    console.error('AI响应最终不是字符串，类型是:', typeof aiResponse, '值:', aiResponse)
    aiResponse = String(aiResponse || '')
  }

  console.log('最终提取的AI响应内容:', aiResponse)
  console.log('AI响应内容类型:', typeof aiResponse)

  // 4. 如果有引用的文档，添加来源说明
  if (sources.length > 0) {
    aiResponse += '\n\n📚 *回答参考了你上传的学习资料*'
  }

  return aiResponse
}

// 保存对话到数据库
async function saveConversation(userMessage, aiResponse) {
  try {
    // 计算实际的学习时长（分钟）
    let studyMinutes = 1 // 默认1分钟
    if (conversationStartTime.value) {
      const now = new Date()
      const diffMs = now - conversationStartTime.value
      studyMinutes = Math.max(1, Math.ceil(diffMs / 60000)) // 至少1分钟，向上取整
      console.log('⏱️ 本次对话时长：', studyMinutes, '分钟')
    }

    // 确保保存的是字符串
    const messageToSave = typeof userMessage === 'string' ? userMessage : String(userMessage)
    const responseToSave = typeof aiResponse === 'string' ? aiResponse : String(aiResponse)

    // 1. 保存对话记录
    const { error: saveError } = await supabase
      .from('conversations')
      .insert([
        {
          user_id: currentUser.value.id,
          message: messageToSave,
          ai_response: responseToSave,
          study_duration: studyMinutes
        }
      ])

    if (saveError) {
      console.error('保存对话记录失败：', saveError)
      return
    }

    // 2. 更新用户的总学习时长
    console.log('📊 更新学习时长...')

    // 先获取当前的学习时长
    const { data: userData, error: getUserError } = await supabase
      .from('users')
      .select('total_study_time')
      .eq('id', currentUser.value.id)
      .single()

    if (getUserError) {
      console.error('获取用户学习时长失败：', getUserError)
      return
    }

    // 更新学习时长（累加实际的学习分钟数）
    const newTotalTime = (userData?.total_study_time || 0) + studyMinutes
    const { error: updateError } = await supabase
      .from('users')
      .update({ total_study_time: newTotalTime })
      .eq('id', currentUser.value.id)

    if (updateError) {
      console.error('更新学习时长失败：', updateError)
    } else {
      console.log('✅ 学习时长更新成功，当前总时长：', newTotalTime, '分钟')
    }

  } catch (err) {
    console.error('保存对话记录出错：', err)
  }
}

// 获取渲染后的内容
function getRenderedContent(content) {
  if (!content || typeof content !== 'string') {
    return String(content || '')
  }

  // 简单的Markdown处理
  return content
    .replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-bold mb-2 mt-4 text-blue-400">$1</h3>')
    .replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-bold mb-3 mt-5 text-blue-400">$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1 class="text-2xl font-bold mb-4 mt-6 text-blue-400">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-cyan-300">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-purple-300">$1</em>')
    .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
    .replace(/^- (.*?)$/gm, '<li class="list-disc list-inside">$1</li>')
    .replace(/^(\d+)\. (.*?)$/gm, '<li class="list-decimal list-inside">$1. $2</li>')
    .replace(/\n\n/g, '</p><p class="my-3 leading-relaxed">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p class="my-3 leading-relaxed">')
    .replace(/$/, '</p>')
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''

  try {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    return time.toLocaleDateString()
  } catch (error) {
    console.error('格式化时间出错:', error)
    return ''
  }
}

// 清空历史记录
async function clearHistory() {
  if (confirm('确定要清空所有历史对话记录吗？')) {
    try {
      // 删除该用户的所有对话记录
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', currentUser.value.id)

      if (error) {
        console.error('清空历史记录失败:', error)
        alert('清空失败，请重试')
      } else {
        messages.value = []
        alert('历史记录已清空')
      }
    } catch (err) {
      console.error('清空历史记录出错:', err)
      alert('清空失败，请重试')
    }
  }
}

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
  }
}
</script>

<style>
/* 引入代码高亮样式 */
@import 'highlight.js/styles/github-dark.css';

/* Markdown内容样式 */
.markdown-body {
  font-size: 15px;
  line-height: 1.7;
  color: #2c3e50;
}

/* 标题样式 */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #1a202c;
}

.markdown-body h1 {
  font-size: 2em;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.3em;
}

.markdown-body h3 {
  font-size: 1.25em;
}

/* 段落样式 */
.markdown-body p {
  margin-bottom: 16px;
}

/* 列表样式 */
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-body li {
  margin-bottom: 8px;
  line-height: 1.7;
}

.markdown-body li > ul,
.markdown-body li > ol {
  margin-top: 8px;
}

/* 代码块样式 */
.markdown-body .code-block {
  background: #1e2329;
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.markdown-body .code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #161a1f;
  border-bottom: 1px solid #2d333b;
  font-size: 12px;
}

.markdown-body .code-language {
  color: #7ee83f;
  font-weight: 600;
  text-transform: uppercase;
}

.markdown-body .copy-btn {
  background: #2d333b;
  color: #e6edf3;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  outline: none;
}

.markdown-body .copy-btn:hover {
  background: #3d444d;
  transform: translateY(-1px);
}

.markdown-body .copy-btn:active {
  transform: translateY(0);
}

.markdown-body pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: transparent;
}

.markdown-body code {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

/* 行内代码样式 */
.markdown-body .inline-code {
  background: #f0f4f8;
  color: #e01e5a;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

/* 引用块样式 */
.markdown-body blockquote {
  margin: 16px 0;
  padding: 0 1em;
  color: #6a737d;
  border-left: 4px solid #dfe2e5;
  background: #f6f8fa;
  border-radius: 0 8px 8px 0;
}

.markdown-body blockquote > :first-child {
  margin-top: 0;
}

.markdown-body blockquote > :last-child {
  margin-bottom: 0;
}

/* 表格样式 */
.markdown-body table {
  display: block;
  width: 100%;
  overflow: auto;
  margin: 16px 0;
}

.markdown-body table th {
  font-weight: 600;
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
  background: #f6f8fa;
}

.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-body table tr {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

.markdown-body table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

/* 链接样式 */
.markdown-body a {
  color: #0969da;
  text-decoration: none;
  font-weight: 500;
}

.markdown-body a:hover {
  text-decoration: underline;
}

/* 图片样式 */
.markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
  border-radius: 8px;
  margin: 16px 0;
}

/* 分割线样式 */
.markdown-body hr {
  height: 2px;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

/* 强调文本 */
.markdown-body strong {
  font-weight: 600;
  color: #1a202c;
}

.markdown-body em {
  font-style: italic;
  color: #4a5568;
}

/* 删除线 */
.markdown-body del {
  text-decoration: line-through;
  color: #6a737d;
}

/* 键盘按键样式 */
.markdown-body kbd {
  display: inline-block;
  padding: 3px 5px;
  font: 11px 'SF Mono', Consolas, monospace;
  line-height: 10px;
  color: #444d56;
  vertical-align: middle;
  background-color: #fafbfc;
  border: 1px solid #c6cbd1;
  border-bottom-color: #959da5;
  border-radius: 3px;
  box-shadow: inset 0 -1px 0 #959da5;
}

/* 任务列表样式 */
.markdown-body .task-list-item {
  list-style-type: none;
  padding-left: 0;
}

.markdown-body .task-list-item input {
  margin-right: 8px;
}
</style>

<style scoped>
.chatbot-container {
  max-width: 800px;
  margin: 20px auto;
  border: 1px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chatbot-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.chatbot-header h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.chatbot-header p {
  margin: 0;
  opacity: 0.9;
}

.chat-history {
  height: 400px;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.welcome-message {
  text-align: center;
  margin-bottom: 20px;
}

.message-item {
  margin-bottom: 15px;
}

.user-message {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.user-message .message-content {
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.95),
    rgba(139, 92, 246, 0.9)
  );
  color: white;
  padding: 16px 20px;
  border-radius: 20px 20px 4px 20px;
  max-width: 70%;
  word-wrap: break-word;
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.3),
              0 2px 8px rgba(0, 0, 0, 0.1);
  font-weight: 500;
  letter-spacing: 0.3px;
  line-height: 1.6;
}

.ai-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  animation: slideInLeft 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ai-message .message-content {
  background: linear-gradient(135deg,
    rgba(20, 27, 45, 0.95),
    rgba(30, 41, 59, 0.9)
  );
  color: #e2e8f0;
  padding: 20px 24px;
  border-radius: 20px 20px 20px 4px;
  max-width: 85%;
  word-wrap: break-word;
  border: 1px solid rgba(59, 130, 246, 0.3);
  line-height: 1.7;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15),
              0 2px 8px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.ai-message .message-content::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  height: 2px;
  background: linear-gradient(90deg,
    transparent,
    rgba(59, 130, 246, 0.8),
    rgba(147, 51, 234, 0.8),
    transparent
  );
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.message-time {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
  padding: 0 8px;
}

.typing-indicator {
  display: inline-flex;
  gap: 6px;
  margin-right: 10px;
  padding: 4px;
}

.typing-indicator span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: inline-block;
  animation: typing 1.8s infinite ease-in-out;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
}
.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
}
.typing-indicator span:nth-child(3) {
  animation-delay: 0s;
  background: linear-gradient(135deg, #06b6d4, #10b981);
}

@keyframes typing {
  0%, 60%, 100% {
    transform: scale(0.7) translateY(0);
    opacity: 0.3;
    filter: blur(0);
  }
  30% {
    transform: scale(1.2) translateY(-6px);
    opacity: 1;
    filter: blur(0);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.6);
  }
}

.chat-input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid #e9ecef;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-group textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
}

.input-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.input-group button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.input-group button:hover:not(:disabled) {
  background: #0056b3;
}

.input-group button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 20px;
  text-align: center;
  border-top: 1px solid #f5c6cb;
}
</style>