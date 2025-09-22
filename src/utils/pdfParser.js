/**
 * PDF文档解析工具
 * 使用简化的本地处理，避免Cloudflare CDN问题
 */

/**
 * 将文件转换为Base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} - Base64字符串
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // 移除data:xxx;base64,前缀
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 从PDF文件中提取文本内容
 * @param {File} file - PDF文件对象
 * @returns {Promise<Object>} - 包含文本和元数据的对象
 */
export async function extractTextFromPDF(file) {
  try {
    console.log('📄 开始处理PDF文件:', file.name);

    // 读取文件基本信息作为降级方案
    const fileInfo = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString('zh-CN')
    };

    // 返回文件信息和使用建议
    const text = `
[PDF文档信息]
文件名：${fileInfo.name}
文件大小：${fileInfo.size}
文件类型：${fileInfo.type}
修改时间：${fileInfo.lastModified}

[提示]
由于技术限制，PDF内容暂时无法直接提取。
您可以：
1. 手动复制PDF中的重要内容到对话框
2. 简要描述PDF的主要内容
3. 等待功能更新

[使用建议]
在对话中描述您想了解的PDF相关问题，AI将基于您的描述提供帮助。
`;

    console.log('✅ PDF处理完成（降级模式）');

    return {
      text: text,
      pageCount: 0,
      metadata: {
        title: file.name,
        author: '未知',
        notice: '降级模式'
      }
    };

  } catch (error) {
    console.error('❌ PDF处理失败:', error);
    return {
      text: `[PDF文件：${file.name}]\n[处理失败：${error.message}]`,
      pageCount: 0,
      metadata: {
        title: file.name,
        author: '未知',
        error: error.message
      }
    };
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