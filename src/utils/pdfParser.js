import { supabase } from '../lib/supabase.js'

/**
 * PDF文档解析工具
 * 使用Supabase Edge Function处理PDF
 */

/**
 * 从PDF文件中提取文本内容
 * @param {File} file - PDF文件对象
 * @returns {Promise<Object>} - 包含文本和元数据的对象
 */
export async function extractTextFromPDF(file) {
  try {
    // 使用本地Python API
    const functionUrl = 'http://localhost:5001/parse-pdf'

    // 创建FormData
    const formData = new FormData()
    formData.append('file', file)

    // 调用Python API
    const response = await fetch(functionUrl, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'PDF解析失败')
    }

    return result.data

  } catch (error) {
    console.error('PDF解析失败:', error)

    // 方案2：如果Edge Function不可用，返回占位内容
    return {
      text: `[PDF文件: ${file.name}]\n\n⚠️ PDF解析功能需要部署后端服务。\n\n请按以下步骤操作：\n\n1. 安装Supabase CLI:\n   brew install supabase/tap/supabase\n\n2. 部署Edge Function:\n   chmod +x deploy-pdf-function.sh\n   ./deploy-pdf-function.sh\n\n3. 刷新页面重试\n\n或者：\n- 将PDF内容复制到TXT文件\n- 使用在线PDF转文本工具\n\n文件信息：\n- 文件名：${file.name}\n- 大小：${formatFileSize(file.size)}`,
      pageCount: 0,
      metadata: {
        title: file.name,
        author: '未知',
        notice: '需要部署Edge Function'
      }
    }
  }
}

/**
 * 检查文件是否为PDF
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export function isPDFFile(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化的大小字符串
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}