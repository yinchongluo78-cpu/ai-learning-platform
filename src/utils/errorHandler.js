/**
 * 全局错误处理工具
 */

// 错误类型枚举
export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  API: 'api',
  UNKNOWN: 'unknown'
}

// 错误信息映射
const errorMessages = {
  network: '网络连接失败，请检查网络设置',
  auth: '认证失败，请重新登录',
  validation: '输入数据不合法',
  api: '服务器响应异常',
  unknown: '发生未知错误'
}

/**
 * 统一错误处理
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = []
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @param {boolean} showToast - 是否显示Toast
   */
  handle(error, context = '', showToast = true) {
    // 记录错误
    this.log(error, context)

    // 分析错误类型
    const errorType = this.classify(error)

    // 获取用户友好的错误信息
    const message = this.getUserMessage(error, errorType)

    // 显示错误提示
    if (showToast && window.$toast) {
      window.$toast.error(message)
    }

    // 开发环境打印详细错误
    if (import.meta.env.DEV) {
      console.error(`[${context}]`, error)
    }

    return { errorType, message }
  }

  /**
   * 分类错误
   */
  classify(error) {
    if (!error) return ErrorType.UNKNOWN

    // 网络错误
    if (error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.code === 'ECONNREFUSED') {
      return ErrorType.NETWORK
    }

    // 认证错误
    if (error.status === 401 ||
        error.message?.includes('auth') ||
        error.message?.includes('unauthorized')) {
      return ErrorType.AUTH
    }

    // 验证错误
    if (error.status === 400 ||
        error.message?.includes('validation')) {
      return ErrorType.VALIDATION
    }

    // API错误
    if (error.status >= 500 ||
        error.response?.status >= 500) {
      return ErrorType.API
    }

    return ErrorType.UNKNOWN
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(error, errorType) {
    // 优先使用自定义消息
    if (error.userMessage) {
      return error.userMessage
    }

    // 特殊错误处理
    const specialMessages = {
      'Failed to fetch': '网络连接失败，请检查网络',
      'Request timeout': '请求超时，请稍后重试',
      'File too large': '文件过大，请选择小于100MB的文件',
      'Invalid file type': '文件类型不支持',
      'Rate limit exceeded': '操作过于频繁，请稍后再试'
    }

    for (const [key, message] of Object.entries(specialMessages)) {
      if (error.message?.includes(key)) {
        return message
      }
    }

    // 返回默认消息
    return errorMessages[errorType] || errorMessages.unknown
  }

  /**
   * 记录错误日志
   */
  log(error, context) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack,
      data: error.data || {}
    }

    this.errorLog.push(errorEntry)

    // 保留最近100条错误
    if (this.errorLog.length > 100) {
      this.errorLog.shift()
    }
  }

  /**
   * 获取错误日志
   */
  getLog() {
    return [...this.errorLog]
  }

  /**
   * 清空错误日志
   */
  clearLog() {
    this.errorLog = []
  }
}

// 创建全局实例
export const errorHandler = new ErrorHandler()

/**
 * Vue全局错误处理配置
 */
export function setupErrorHandling(app) {
  // Vue错误处理
  app.config.errorHandler = (err, instance, info) => {
    errorHandler.handle(err, `Vue Component: ${info}`)
  }

  // Promise错误处理
  window.addEventListener('unhandledrejection', event => {
    event.preventDefault()
    errorHandler.handle(
      new Error(event.reason?.message || event.reason || 'Promise rejected'),
      'Unhandled Promise Rejection'
    )
  })

  // 全局错误处理
  window.addEventListener('error', event => {
    event.preventDefault()
    errorHandler.handle(
      event.error || new Error(event.message),
      'Global Error'
    )
  })
}

/**
 * API请求包装器 - 自动处理错误
 */
export async function apiWrapper(apiCall, context = 'API Call', options = {}) {
  const {
    showLoading = true,
    showError = true,
    timeout = 30000
  } = options

  try {
    // 显示加载状态
    if (showLoading && window.$toast) {
      window.$toast.loading('处理中...')
    }

    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    })

    // 执行API调用
    const result = await Promise.race([apiCall, timeoutPromise])

    // 清除加载状态
    if (showLoading && window.$toast) {
      window.$toast.dismiss()
    }

    return { success: true, data: result }

  } catch (error) {
    // 清除加载状态
    if (showLoading && window.$toast) {
      window.$toast.dismiss()
    }

    // 处理错误
    const { errorType, message } = errorHandler.handle(error, context, showError)

    return {
      success: false,
      error: error,
      errorType,
      message
    }
  }
}