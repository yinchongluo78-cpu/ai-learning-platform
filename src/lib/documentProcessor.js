// 文档处理器 - 负责解析和切片文档
import { supabase } from './supabase.js'

// 文本切片配置
const CHUNK_SIZE = 500 // 每个切片的字符数
const CHUNK_OVERLAP = 100 // 切片之间的重叠字符数

/**
 * 处理上传的文档
 * @param {File} file - 上传的文件
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 返回切片数组
 */
export async function processDocument(file, userId) {
  console.log('📄 开始处理文档:', file.name)

  try {
    // 1. 读取文件内容
    const text = await readFileAsText(file)
    console.log('📖 文件内容长度:', text.length)

    // 2. 切片文本
    const chunks = splitTextIntoChunks(text)
    console.log('✂️ 生成切片数:', chunks.length)

    // 3. 保存文件信息到数据库
    console.log('💾 保存文件信息到数据库...')
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert([{
        user_id: userId,
        filename: file.name,
        file_path: `documents/${userId}/${file.name}`,
        file_type: file.type || 'text/plain',
        file_size: file.size
      }])
      .select()
      .single()

    if (fileError) {
      console.error('保存文件信息失败:', fileError)
      throw new Error('保存文件信息失败: ' + fileError.message)
    }

    console.log('✅ 文件信息保存成功:', fileData.id)

    // 4. 保存切片到数据库（分批保存，避免一次性插入太多）
    console.log('💾 开始保存文档切片...')
    const savedChunks = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`💾 保存切片 ${i + 1}/${chunks.length}`)

      try {
        const { data: chunkData, error: chunkError } = await supabase
          .from('file_chunks')
          .insert([{
            file_id: fileData.id,
            content: chunk.text,
            page_number: chunk.page || 1,
            chunk_index: i
          }])
          .select()
          .single()

        if (chunkError) {
          console.error(`切片 ${i + 1} 保存失败:`, chunkError)
          // 继续保存其他切片
        } else {
          savedChunks.push(chunkData)
        }
      } catch (err) {
        console.error(`切片 ${i + 1} 保存出错:`, err)
        // 继续保存其他切片
      }
    }

    console.log('✅ 文档处理完成，成功保存了', savedChunks.length, '/', chunks.length, '个切片')

    if (savedChunks.length === 0) {
      throw new Error('所有切片保存失败')
    }

    return savedChunks

  } catch (error) {
    console.error('❌ 文档处理失败:', error)
    throw error
  }
}

/**
 * 读取文件为文本
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 文件文本内容
 */
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      resolve(event.target.result)
    }

    reader.onerror = (error) => {
      reject(new Error('文件读取失败: ' + error))
    }

    // 根据文件类型选择读取方式
    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      reader.readAsText(file)
    } else if (file.type.includes('pdf')) {
      // PDF需要特殊处理（简化版本，实际需要pdf.js库）
      reject(new Error('PDF文件暂时需要手动转换为文本'))
    } else {
      reader.readAsText(file)
    }
  })
}

/**
 * 将文本切分成小块
 * @param {string} text - 原始文本
 * @returns {Array} 切片数组
 */
function splitTextIntoChunks(text) {
  const chunks = []

  // 先按段落分割
  const paragraphs = text.split(/\n\n+/)

  let currentChunk = ''

  for (const paragraph of paragraphs) {
    // 如果段落本身就很长，需要进一步切分
    if (paragraph.length > CHUNK_SIZE) {
      // 按句子切分
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            page: Math.floor(chunks.length / 5) + 1 // 简单的页码估算
          })
          // 保留部分内容作为重叠
          currentChunk = currentChunk.slice(-CHUNK_OVERLAP) + sentence
        } else {
          currentChunk += sentence + ' '
        }
      }
    } else {
      // 段落较短，直接添加
      if (currentChunk.length + paragraph.length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          page: Math.floor(chunks.length / 5) + 1
        })
        currentChunk = currentChunk.slice(-CHUNK_OVERLAP) + paragraph
      } else {
        currentChunk += paragraph + '\n\n'
      }
    }
  }

  // 保存最后一个切片
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      page: Math.floor(chunks.length / 5) + 1
    })
  }

  return chunks
}

/**
 * 生成文本的向量表示（使用DeepSeek或其他嵌入模型）
 * @param {string} text - 要向量化的文本
 * @returns {Promise<Array<number>>} 向量数组
 */
export async function generateEmbedding(text) {
  // 这里简化处理，实际应该调用嵌入API
  // 可以使用：
  // 1. OpenAI Embeddings API
  // 2. DeepSeek的嵌入模型
  // 3. 本地的sentence-transformers

  console.log('🔢 生成向量（模拟）:', text.substring(0, 50) + '...')

  // 模拟返回一个1536维的向量（OpenAI标准维度）
  const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5)

  return mockEmbedding
}

/**
 * 搜索相关文档
 * @param {string} query - 搜索查询
 * @param {string} userId - 用户ID
 * @param {number} limit - 返回结果数量
 * @returns {Promise<Array>} 相关文档片段
 */
export async function searchDocuments(query, userId, limit = 5) {
  try {
    console.log('🔍 搜索文档:', query)
    console.log('📋 用户ID:', userId)

    // 首先获取用户的所有文件
    const { data: userFiles, error: filesError } = await supabase
      .from('files')
      .select('id')
      .eq('user_id', userId)

    if (filesError) {
      console.error('获取用户文件失败:', filesError)
      return []
    }

    console.log('📁 用户文件数量:', userFiles?.length || 0)

    if (!userFiles || userFiles.length === 0) {
      console.log('📭 用户没有上传文档，用户ID:', userId)

      // 调试：查看所有文件
      const { data: allFiles } = await supabase
        .from('files')
        .select('user_id, filename')
      console.log('🔍 数据库中所有文件:', allFiles)

      return []
    }

    // 获取这些文件的切片
    const fileIds = userFiles.map(f => f.id)
    console.log('📎 文件IDs:', fileIds)

    const { data: chunks, error } = await supabase
      .from('file_chunks')
      .select('*')
      .in('file_id', fileIds)
      .limit(20) // 获取最近的20个切片

    if (error) {
      console.error('获取文档切片失败:', error)
      return []
    }

    console.log('📚 获取到的切片数量:', chunks?.length || 0)

    if (!chunks || chunks.length === 0) {
      console.log('📭 没有找到文档切片')

      // 调试：直接查询某个文件的切片
      if (fileIds.length > 0) {
        const { data: testChunks } = await supabase
          .from('file_chunks')
          .select('*')
          .eq('file_id', fileIds[0])
          .limit(1)
        console.log('🔍 测试查询第一个文件的切片:', testChunks)
      }

      return []
    }

    // 改进的关键词匹配算法
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1)

    console.log('🔍 搜索关键词:', queryLower)
    console.log('🔍 分词结果:', queryWords)

    // 给每个切片打分
    const scoredChunks = chunks
      .map(chunk => {
        const content = (chunk.content || '').toLowerCase()
        let score = 0

        // 完全匹配得分最高
        if (content.includes(queryLower)) {
          score += 10
        }

        // 每个关键词匹配加分
        queryWords.forEach(word => {
          if (content.includes(word)) {
            score += 3
          }
        })

        // 特别处理中文关键词（不转换为小写）
        const originalQuery = query
        const originalContent = chunk.content || ''
        if (originalContent.includes(originalQuery)) {
          score += 10
        }

        // 检查是否包含"经济"相关词汇
        if (originalContent.includes('经济') || originalContent.includes('微观') || originalContent.includes('金融')) {
          score += 2
        }

        return {
          ...chunk,
          score,
          similarity: Math.min(score / 10, 1) // 归一化分数
        }
      })
      .filter(chunk => chunk.score > 0) // 只保留有匹配的切片
      .sort((a, b) => b.score - a.score) // 按分数排序
      .slice(0, limit)

    console.log('📚 找到相关文档:', scoredChunks.length)

    // 调试：显示第一个切片的匹配情况
    if (chunks.length > 0) {
      const firstChunk = chunks[0]
      console.log('🔍 第一个切片内容预览:', firstChunk.content?.substring(0, 100))
      console.log('🔍 是否包含"微观经济学":', firstChunk.content?.includes('微观经济学'))
    }

    return scoredChunks

  } catch (error) {
    console.error('❌ 文档搜索失败:', error)
    return []
  }
}