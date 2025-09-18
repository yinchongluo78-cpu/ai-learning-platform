/**
 * 文件下载辅助函数
 * 下载时恢复原始文件名
 */

import { getSignedUrl } from './aliyunOSS.js'

/**
 * 下载文件并恢复原始文件名
 * @param {string} ossFileName - OSS中的文件名
 * @param {string} originalName - 原始文件名
 */
export async function downloadFile(ossFileName, originalName) {
  try {
    // 1. 获取签名URL（私有文件需要）
    const url = await getSignedUrl(ossFileName)

    if (!url) {
      throw new Error('无法获取文件URL')
    }

    // 2. 创建下载链接
    const link = document.createElement('a')
    link.href = url
    link.download = originalName // 使用原始文件名！
    link.style.display = 'none'

    // 3. 触发下载
    document.body.appendChild(link)
    link.click()

    // 4. 清理
    setTimeout(() => {
      document.body.removeChild(link)
    }, 100)

    return true
  } catch (error) {
    console.error('下载文件失败:', error)
    return false
  }
}

/**
 * 预览文件（在新窗口打开）
 * @param {string} ossFileName - OSS中的文件名
 * @param {string} originalName - 原始文件名
 */
export async function previewFile(ossFileName, originalName) {
  try {
    // 获取签名URL
    const url = await getSignedUrl(ossFileName, 3600) // 1小时有效

    if (!url) {
      throw new Error('无法获取文件URL')
    }

    // 在新窗口打开
    window.open(url, '_blank')

    return true
  } catch (error) {
    console.error('预览文件失败:', error)
    return false
  }
}

/**
 * 获取文件信息显示
 * @param {Object} fileInfo - 文件信息对象
 * @returns {Object} - 格式化的显示信息
 */
export function getFileDisplayInfo(fileInfo) {
  return {
    name: fileInfo.originalName || '未知文件',
    size: formatFileSize(fileInfo.size || 0),
    type: getFileType(fileInfo.originalName || ''),
    icon: getFileIcon(fileInfo.originalName || '')
  }
}

/**
 * 获取文件类型
 * @param {string} fileName - 文件名
 * @returns {string} - 文件类型描述
 */
function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const types = {
    pdf: 'PDF文档',
    doc: 'Word文档',
    docx: 'Word文档',
    xls: 'Excel表格',
    xlsx: 'Excel表格',
    ppt: 'PPT演示',
    pptx: 'PPT演示',
    txt: '文本文件',
    md: 'Markdown文档',
    jpg: '图片',
    jpeg: '图片',
    png: '图片',
    gif: '图片'
  }
  return types[ext] || '文件'
}

/**
 * 获取文件图标
 * @param {string} fileName - 文件名
 * @returns {string} - 图标emoji
 */
function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const icons = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    txt: '📃',
    md: '📑',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️'
  }
  return icons[ext] || '📎'
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