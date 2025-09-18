/**
 * 统一的存储服务
 * 支持Supabase Storage和阿里云OSS
 * 可通过环境变量切换
 */

import { supabase } from '../lib/supabase.js'
import { uploadToOSS, getSignedUrl, deleteFromOSS, isAllowedFileType } from './aliyunOSS.js'

// 判断是否使用OSS
const USE_OSS = import.meta.env.VITE_USE_OSS === 'true'

/**
 * 统一的文件上传接口
 * @param {File} file - 文件对象
 * @param {string} userId - 用户ID
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadFile(file, userId, onProgress = null) {
  // 检查文件类型
  if (!isAllowedFileType(file)) {
    return {
      success: false,
      error: '不支持的文件类型'
    }
  }

  // 检查文件大小（100MB限制）
  if (file.size > 100 * 1024 * 1024) {
    return {
      success: false,
      error: '文件大小超过100MB限制'
    }
  }

  if (USE_OSS) {
    // 使用阿里云OSS
    console.log('使用阿里云OSS上传文件')
    return await uploadToOSS(file, userId, onProgress)
  } else {
    // 使用Supabase Storage
    console.log('使用Supabase Storage上传文件')
    return await uploadToSupabase(file, userId, onProgress)
  }
}

/**
 * 上传到Supabase Storage
 * @param {File} file - 文件对象
 * @param {string} userId - 用户ID
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} - 上传结果
 */
async function uploadToSupabase(file, userId, onProgress = null) {
  try {
    // 生成文件路径
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // 模拟进度回调（Supabase不支持原生进度）
    if (onProgress) {
      onProgress(10)
    }

    // 上传到Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (onProgress) {
      onProgress(90)
    }

    if (error) {
      throw error
    }

    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    if (onProgress) {
      onProgress(100)
    }

    return {
      success: true,
      data: {
        url: publicUrl,
        fileName: fileName,
        originalName: file.name,
        size: file.size,
        storageType: 'supabase'
      }
    }
  } catch (error) {
    console.error('Supabase上传失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取文件URL
 * @param {string} fileName - 文件名或路径
 * @param {string} storageType - 存储类型（oss/supabase）
 * @returns {Promise<string>} - 文件URL
 */
export async function getFileUrl(fileName, storageType = null) {
  // 如果明确指定了存储类型
  if (storageType === 'oss') {
    return await getSignedUrl(fileName)
  } else if (storageType === 'supabase') {
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)
    return publicUrl
  }

  // 根据当前配置决定
  if (USE_OSS) {
    return await getSignedUrl(fileName)
  } else {
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)
    return publicUrl
  }
}

/**
 * 删除文件
 * @param {string} fileName - 文件名或路径
 * @param {string} storageType - 存储类型（oss/supabase）
 * @returns {Promise<boolean>} - 是否删除成功
 */
export async function deleteFile(fileName, storageType = null) {
  // 如果明确指定了存储类型
  if (storageType === 'oss') {
    return await deleteFromOSS(fileName)
  } else if (storageType === 'supabase') {
    const { error } = await supabase.storage
      .from('documents')
      .remove([fileName])
    return !error
  }

  // 根据当前配置决定
  if (USE_OSS) {
    return await deleteFromOSS(fileName)
  } else {
    const { error } = await supabase.storage
      .from('documents')
      .remove([fileName])
    return !error
  }
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

/**
 * 检查存储服务状态
 * @returns {Object} - 服务状态
 */
export function getStorageStatus() {
  return {
    currentProvider: USE_OSS ? 'aliyun-oss' : 'supabase',
    ossEnabled: USE_OSS,
    maxFileSize: '100MB',
    allowedTypes: [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown'
    ]
  }
}