/**
 * OSS文档直传服务
 * 支持大文件上传，绕过Vercel限制
 */

import { uploadToOSS, getSignedUrl } from './aliyunOSS.js'
import { supabase } from '../lib/supabase.js'

/**
 * 直接上传文档到OSS并保存记录到数据库
 * @param {File} file - 文件对象
 * @param {boolean} isPublic - 是否公开
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadDocumentToOSS(file, isPublic = false, onProgress = null) {
  try {
    // 1. 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('请先登录')
    }

    // 2. 检查文件类型
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    const fileExt = file.name.split('.').pop().toLowerCase()
    const isAllowed = allowedTypes.includes(file.type) ||
                      ['txt', 'md', 'pdf', 'doc', 'docx'].includes(fileExt)

    if (!isAllowed) {
      throw new Error('不支持的文件类型')
    }

    // 3. 上传文件到OSS
    console.log('[OSS文档] 开始上传文件:', file.name)

    const ossResult = await uploadToOSS(file, user.id, (progress) => {
      console.log('[OSS文档] 上传进度:', progress + '%')
      if (onProgress) {
        onProgress(progress)
      }
    })

    if (!ossResult.success) {
      throw new Error(ossResult.error || '文件上传失败')
    }

    console.log('[OSS文档] 上传成功:', ossResult.data)

    // 4. 处理文档内容
    let content = ''

    if (file.type === 'text/plain' || fileExt === 'txt' || fileExt === 'md') {
      // 文本文件直接读取
      content = await readFileAsText(file)
    } else if (file.type === 'application/pdf' || fileExt === 'pdf') {
      // PDF文件需要特殊处理
      console.log('[OSS文档] PDF文件，尝试提取文本')
      content = await extractPDFText(file)
    } else {
      // 其他文件类型暂时只保存文件信息
      content = `[文件: ${file.name}]`
    }

    // 5. 保存到数据库
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        filename: file.name,
        content: content,
        size: file.size,
        type: file.type || 'application/octet-stream',
        is_public: isPublic,
        oss_url: ossResult.data.url,
        oss_key: ossResult.data.fileName,
        original_name: ossResult.data.originalName,
        etag: ossResult.data.etag || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('[OSS文档] 数据库保存失败:', insertError)
      throw new Error('保存文档记录失败')
    }

    console.log('[OSS文档] 文档保存成功:', document)

    return {
      success: true,
      document: document,
      ossData: ossResult.data
    }

  } catch (error) {
    console.error('[OSS文档] 上传失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 读取文本文件内容
 * @param {File} file - 文件对象
 * @returns {Promise<string>} - 文件内容
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * 提取PDF文本内容（客户端简单提取）
 * @param {File} file - PDF文件
 * @returns {Promise<string>} - 提取的文本
 */
async function extractPDFText(file) {
  try {
    // 如果文件太大，只返回文件信息
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return `[大型PDF文件: ${file.name}, 大小: ${formatFileSize(file.size)}]`
    }

    // 对于小文件，可以尝试客户端提取
    // 注意：这需要引入PDF.js库
    // 这里先返回占位信息
    return `[PDF文件: ${file.name}, 大小: ${formatFileSize(file.size)}]`

  } catch (error) {
    console.error('[OSS文档] PDF提取失败:', error)
    return `[PDF文件: ${file.name}]`
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 获取文档的OSS下载链接
 * @param {string} ossKey - OSS文件key
 * @returns {Promise<string>} - 签名URL
 */
export async function getDocumentUrl(ossKey) {
  try {
    const url = await getSignedUrl(ossKey, 3600) // 1小时有效
    return url
  } catch (error) {
    console.error('[OSS文档] 获取URL失败:', error)
    return null
  }
}

/**
 * 批量上传文档
 * @param {FileList} files - 文件列表
 * @param {boolean} isPublic - 是否公开
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} - 上传结果数组
 */
export async function uploadMultipleDocuments(files, isPublic = false, onProgress = null) {
  const results = []
  const totalFiles = files.length

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i]

    // 计算总体进度
    const fileProgress = (progress) => {
      const overallProgress = ((i * 100) + progress) / totalFiles
      if (onProgress) {
        onProgress(Math.round(overallProgress), i + 1, totalFiles)
      }
    }

    const result = await uploadDocumentToOSS(file, isPublic, fileProgress)
    results.push({
      file: file.name,
      ...result
    })
  }

  return results
}