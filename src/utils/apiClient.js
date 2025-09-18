/**
 * API 客户端工具
 * 提供统一的网络请求封装，包含超时处理、错误处理、重试机制
 */

import { apiWrapper } from './errorHandler.js'

// 默认配置
const DEFAULT_CONFIG = {
  timeout: 30000, // 30秒超时
  retries: 3, // 重试3次
  retryDelay: 1000, // 重试延迟1秒
  baseHeaders: {
    'Content-Type': 'application/json'
  }
}

/**
 * 创建带超时的fetch请求
 */
export function createFetchWithTimeout(timeout = DEFAULT_CONFIG.timeout) {
  return function fetchWithTimeout(url, options = {}) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ])
  }
}

/**
 * 网络请求重试机制
 */
export async function fetchWithRetry(
  url,
  options = {},
  config = {}
) {
  const {
    retries = DEFAULT_CONFIG.retries,
    retryDelay = DEFAULT_CONFIG.retryDelay,
    timeout = DEFAULT_CONFIG.timeout
  } = config

  const fetchWithTimeout = createFetchWithTimeout(timeout)

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options)

      // 检查响应状态
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        error.response = response
        throw error
      }

      return response

    } catch (error) {
      // 最后一次重试失败时，抛出错误
      if (i === retries) {
        throw error
      }

      // 某些错误不需要重试
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw error
      }

      // 等待后重试
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)))
      }

      console.log(`请求重试 ${i + 1}/${retries}: ${url}`)
    }
  }
}

/**
 * API 客户端类
 */
export class ApiClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    const requestOptions = {
      ...options,
      headers: {
        ...this.config.baseHeaders,
        ...options.headers
      }
    }

    const result = await apiWrapper(
      () => fetchWithRetry(url, requestOptions, this.config),
      `API Request: ${options.method || 'GET'} ${url}`,
      {
        showLoading: false, // 由调用方控制loading
        showError: true,
        timeout: this.config.timeout
      }
    )

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  /**
   * GET 请求
   */
  async get(url, config = {}) {
    return this.request(url, { method: 'GET', ...config })
  }

  /**
   * POST 请求
   */
  async post(url, data = null, config = {}) {
    const options = {
      method: 'POST',
      ...config
    }

    if (data) {
      if (data instanceof FormData) {
        options.body = data
        // 不设置Content-Type，让浏览器自动设置
        delete options.headers?.['Content-Type']
      } else {
        options.body = JSON.stringify(data)
      }
    }

    return this.request(url, options)
  }

  /**
   * PUT 请求
   */
  async put(url, data = null, config = {}) {
    const options = {
      method: 'PUT',
      ...config
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    return this.request(url, options)
  }

  /**
   * DELETE 请求
   */
  async delete(url, config = {}) {
    return this.request(url, { method: 'DELETE', ...config })
  }

  /**
   * 上传文件
   */
  async upload(url, file, options = {}) {
    const formData = new FormData()
    formData.append('file', file)

    // 添加额外的表单字段
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    return this.post(url, formData, {
      ...options,
      // 上传文件需要更长的超时时间
      timeout: options.timeout || 60000
    })
  }
}

/**
 * 默认API客户端实例
 */
export const apiClient = new ApiClient()

/**
 * DeepSeek AI API 专用客户端
 */
export const deepSeekClient = new ApiClient({
  timeout: 60000, // AI请求可能较慢
  retries: 2,
  baseHeaders: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY || ''}`
  }
})

/**
 * Supabase API 增强封装
 */
export class SupabaseApiClient {
  constructor(supabaseClient) {
    this.supabase = supabaseClient
    this.client = new ApiClient({
      timeout: 15000, // 数据库操作一般较快
      retries: 2
    })
  }

  /**
   * 安全的用户查询
   */
  async getCurrentUser() {
    const result = await apiWrapper(
      () => this.supabase.auth.getUser(),
      'Get Current User'
    )

    if (!result.success) {
      return null
    }

    return result.data?.data?.user || null
  }

  /**
   * 安全的数据查询
   */
  async safeQuery(queryBuilder, context = 'Database Query') {
    const result = await apiWrapper(
      () => queryBuilder,
      context
    )

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  /**
   * 批量操作
   */
  async batchOperation(operations, context = 'Batch Operation') {
    const results = []

    for (const operation of operations) {
      try {
        const result = await this.safeQuery(operation.query, operation.context || context)
        results.push({ success: true, data: result })
      } catch (error) {
        results.push({ success: false, error })
      }
    }

    return results
  }
}

/**
 * 网络状态检测
 */
export class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine
    this.setupEventListeners()
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      window.$toast?.success('网络连接已恢复')
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      window.$toast?.error('网络连接已断开')
    })
  }

  /**
   * 检查网络连接
   */
  async checkConnection() {
    if (!this.isOnline) {
      throw new Error('网络连接不可用')
    }

    try {
      // 尝试发送一个小的请求来检测网络
      await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors'
      })
      return true
    } catch {
      this.isOnline = false
      throw new Error('网络连接检测失败')
    }
  }
}

// 创建网络监控实例
export const networkMonitor = new NetworkMonitor()