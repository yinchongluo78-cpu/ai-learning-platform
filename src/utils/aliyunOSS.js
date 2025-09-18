/**
 * 阿里云OSS文件上传工具
 * 用于替代Supabase Storage，提供更好的国内访问速度
 */

import OSS from 'ali-oss'

// OSS配置（这些值需要从环境变量或配置文件读取）
const OSS_CONFIG = {
  region: import.meta.env.VITE_OSS_REGION || 'oss-cn-shenzhen',
  accessKeyId: import.meta.env.VITE_OSS_ACCESS_KEY_ID,
  accessKeySecret: import.meta.env.VITE_OSS_ACCESS_KEY_SECRET,
  bucket: import.meta.env.VITE_OSS_BUCKET || 'smartyouth-docs-luoyinchong',
  secure: true, // 使用HTTPS
}

// 创建OSS客户端实例
let ossClient = null

/**
 * 初始化OSS客户端
 */
export function initOSSClient() {
  if (!ossClient && OSS_CONFIG.accessKeyId) {
    console.log('[OSS] 初始化客户端，配置:', {
      region: OSS_CONFIG.region,
      bucket: OSS_CONFIG.bucket,
      accessKeyId: OSS_CONFIG.accessKeyId ? OSS_CONFIG.accessKeyId.substring(0, 10) + '...' : 'undefined',
      secretLength: OSS_CONFIG.accessKeySecret ? OSS_CONFIG.accessKeySecret.length : 0,
      hasSecret: !!OSS_CONFIG.accessKeySecret
    })
    ossClient = new OSS(OSS_CONFIG)
  }
  return ossClient
}

/**
 * 上传文件到OSS
 * @param {File} file - 文件对象
 * @param {string} userId - 用户ID
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadToOSS(file, userId, onProgress = null) {
  console.log('[OSS] 开始上传，文件:', file.name, '大小:', file.size)

  try {
    const client = initOSSClient()

    if (!client) {
      console.error('[OSS] 客户端初始化失败，配置:', OSS_CONFIG)
      throw new Error('OSS客户端未初始化，请检查配置')
    }

    console.log('[OSS] 客户端初始化成功')

    // 生成文件路径
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `documents/${userId}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // 简化上传选项，去掉可能导致问题的配置
    const options = {
      // 进度回调
      progress: (p) => {
        console.log('OSS上传进度:', p)
        if (onProgress) {
          const progressPercent = Math.floor(p * 100)
          onProgress(progressPercent)
        }
      }
    }

    // 大文件分片上传
    if (file.size > 100 * 1024 * 1024) { // 大于100MB使用分片上传
      const result = await client.multipartUpload(fileName, file, {
        ...options,
        partSize: 1024 * 1024 * 5, // 5MB per part
        parallel: 3, // 并发上传数
      })

      console.log('[OSS] 分片上传完成，原始结果:', result)

      // 获取文件URL
      const fileUrl = result.res?.requestUrls?.[0]?.split('?')[0] ||
                     `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com/${fileName}`

      return {
        success: true,
        data: {
          url: fileUrl,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          etag: result.etag || ''
        }
      }
    } else {
      // 普通上传 - 模拟进度（因为put方法不支持实时进度）
      if (onProgress) {
        onProgress(30) // 开始上传
      }

      const result = await client.put(fileName, file, options)

      if (onProgress) {
        onProgress(100) // 上传完成
      }

      console.log('[OSS] 上传完成，原始结果:', result)

      // 获取文件URL（result.url可能不存在，需要手动构建）
      const fileUrl = result.url || `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com/${fileName}`

      return {
        success: true,
        data: {
          url: fileUrl,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          etag: result.res?.headers?.etag || result.etag || ''
        }
      }
    }
  } catch (error) {
    console.error('OSS上传失败 - 详细错误:', error)
    console.error('错误类型:', error.name)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)

    // 提供更详细的错误信息
    let errorMessage = error.message

    if (error.code === 'InvalidAccessKeyId') {
      errorMessage = 'AccessKey ID无效，请检查配置'
    } else if (error.code === 'SignatureDoesNotMatch') {
      errorMessage = 'AccessKey Secret错误，请检查配置'
    } else if (error.code === 'AccessDenied') {
      errorMessage = '没有权限，请检查RAM用户权限'
    } else if (error.code === 'NoSuchBucket') {
      errorMessage = 'Bucket不存在，请检查Bucket名称'
    }

    return {
      success: false,
      error: errorMessage,
      details: error.toString()
    }
  }
}

/**
 * 获取文件的临时访问URL（用于私有文件）
 * @param {string} fileName - OSS中的文件名
 * @param {number} expires - 过期时间（秒），默认1小时
 * @returns {string} - 临时访问URL
 */
export async function getSignedUrl(fileName, expires = 3600) {
  try {
    const client = initOSSClient()

    if (!client) {
      throw new Error('OSS客户端未初始化')
    }

    // 生成签名URL
    const url = client.signatureUrl(fileName, {
      expires: expires,
      response: {
        'content-disposition': 'inline'
      }
    })

    return url
  } catch (error) {
    console.error('生成签名URL失败:', error)
    return null
  }
}

/**
 * 删除OSS文件
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} - 是否删除成功
 */
export async function deleteFromOSS(fileName) {
  try {
    const client = initOSSClient()

    if (!client) {
      throw new Error('OSS客户端未初始化')
    }

    await client.delete(fileName)
    return true
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

/**
 * 获取OSS直传策略（用于前端直传）
 * 这个功能需要后端配合生成STS token
 * @returns {Promise<Object>} - STS凭证
 */
export async function getSTSToken() {
  try {
    // 调用后端API获取STS token
    const response = await fetch('/api/oss/sts-token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('获取STS token失败')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取STS token失败:', error)
    return null
  }
}

/**
 * 使用STS token创建临时OSS客户端（更安全）
 * @param {Object} stsToken - STS凭证
 * @returns {OSS} - OSS客户端实例
 */
export function createSTSClient(stsToken) {
  return new OSS({
    region: OSS_CONFIG.region,
    accessKeyId: stsToken.AccessKeyId,
    accessKeySecret: stsToken.AccessKeySecret,
    stsToken: stsToken.SecurityToken,
    bucket: OSS_CONFIG.bucket,
    secure: true
  })
}

/**
 * 检查文件类型是否允许
 * @param {File} file - 文件对象
 * @returns {boolean} - 是否允许
 */
export function isAllowedFileType(file) {
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/markdown',
    'text/html',
    'application/json'
  ]

  return allowedTypes.includes(file.type) ||
         file.name.endsWith('.txt') ||
         file.name.endsWith('.md')
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化的大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}