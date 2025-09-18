/**
 * 全局加载状态管理
 * 统一管理应用中的各种加载状态
 */

import { ref, reactive } from 'vue'

// 全局加载状态
export const globalLoading = ref(false)

// 具体操作的加载状态
export const loadingStates = reactive({
  // 用户认证相关
  auth: {
    login: false,
    register: false,
    logout: false
  },
  // 对话相关
  chat: {
    sendMessage: false,
    loadConversations: false,
    saveConversation: false,
    deleteConversation: false
  },
  // 文档相关
  document: {
    upload: false,
    parse: false,
    delete: false,
    load: false
  },
  // PDF处理相关
  pdf: {
    extract: false,
    load: false
  },
  // 网络请求相关
  api: {
    request: false
  }
})

// 加载状态管理器
export class LoadingManager {
  constructor() {
    this.activeOperations = new Set()
    this.loadingQueue = new Map()
  }

  /**
   * 开始加载
   * @param {string} key - 加载操作的唯一标识
   * @param {string} message - 加载提示信息
   * @param {object} options - 配置选项
   */
  start(key, message = '加载中...', options = {}) {
    const {
      showGlobal = true,
      showToast = true,
      category = 'api',
      operation = 'request'
    } = options

    // 添加到活跃操作集合
    this.activeOperations.add(key)

    // 更新具体操作状态
    if (loadingStates[category] && loadingStates[category][operation] !== undefined) {
      loadingStates[category][operation] = true
    }

    // 更新全局状态
    if (showGlobal) {
      globalLoading.value = true
    }

    // 显示Toast提示
    if (showToast && window.$toast) {
      window.$toast.loading(message, key)
    }

    // 记录加载信息
    this.loadingQueue.set(key, {
      startTime: Date.now(),
      message,
      options
    })

    console.log(`🔄 开始加载: ${key} - ${message}`)
  }

  /**
   * 结束加载
   * @param {string} key - 加载操作的唯一标识
   * @param {object} result - 操作结果
   */
  finish(key, result = {}) {
    if (!this.activeOperations.has(key)) {
      console.warn(`Loading key "${key}" not found`)
      return
    }

    const loadingInfo = this.loadingQueue.get(key)
    if (!loadingInfo) {
      console.warn(`Loading info for key "${key}" not found`)
      return
    }

    const { options } = loadingInfo
    const { category = 'api', operation = 'request', showGlobal = true } = options
    const duration = Date.now() - loadingInfo.startTime

    // 从活跃操作中移除
    this.activeOperations.delete(key)
    this.loadingQueue.delete(key)

    // 更新具体操作状态
    if (loadingStates[category] && loadingStates[category][operation] !== undefined) {
      loadingStates[category][operation] = false
    }

    // 更新全局状态（只有当没有其他操作时才关闭）
    if (showGlobal && this.activeOperations.size === 0) {
      globalLoading.value = false
    }

    // 关闭Toast
    if (window.$toast) {
      window.$toast.dismiss(key)
    }

    // 显示结果提示
    if (result.success !== undefined && window.$toast) {
      if (result.success) {
        if (result.message) {
          window.$toast.success(result.message)
        }
      } else {
        if (result.message) {
          window.$toast.error(result.message)
        }
      }
    }

    console.log(`✅ 加载完成: ${key} - ${duration}ms`)
  }

  /**
   * 取消加载
   * @param {string} key - 加载操作的唯一标识
   */
  cancel(key) {
    if (!this.activeOperations.has(key)) {
      return
    }

    const loadingInfo = this.loadingQueue.get(key)
    if (loadingInfo) {
      const { options } = loadingInfo
      const { category = 'api', operation = 'request' } = options

      // 更新状态
      if (loadingStates[category] && loadingStates[category][operation] !== undefined) {
        loadingStates[category][operation] = false
      }
    }

    this.activeOperations.delete(key)
    this.loadingQueue.delete(key)

    // 更新全局状态
    if (this.activeOperations.size === 0) {
      globalLoading.value = false
    }

    // 关闭Toast
    if (window.$toast) {
      window.$toast.dismiss(key)
    }

    console.log(`❌ 加载取消: ${key}`)
  }

  /**
   * 取消所有加载
   */
  cancelAll() {
    for (const key of this.activeOperations) {
      this.cancel(key)
    }
  }

  /**
   * 获取当前加载状态
   */
  getStatus() {
    return {
      isLoading: globalLoading.value,
      activeCount: this.activeOperations.size,
      operations: Array.from(this.activeOperations),
      states: { ...loadingStates }
    }
  }
}

// 创建全局实例
export const loadingManager = new LoadingManager()

/**
 * Vue组合式API钩子
 */
export function useLoading() {
  /**
   * 执行带加载状态的异步操作
   */
  const withLoading = async (
    operation,
    key = `operation_${Date.now()}`,
    message = '处理中...',
    options = {}
  ) => {
    try {
      loadingManager.start(key, message, options)
      const result = await operation()
      loadingManager.finish(key, { success: true })
      return result
    } catch (error) {
      loadingManager.finish(key, {
        success: false,
        message: error.message || '操作失败'
      })
      throw error
    }
  }

  /**
   * 创建特定类别的加载函数
   */
  const createCategoryLoader = (category, defaultOptions = {}) => {
    return (operation, operationKey, message, options = {}) => {
      return withLoading(
        operation,
        operationKey,
        message,
        { category, ...defaultOptions, ...options }
      )
    }
  }

  // 预定义的加载函数
  const loadingFunctions = {
    auth: createCategoryLoader('auth'),
    chat: createCategoryLoader('chat'),
    document: createCategoryLoader('document'),
    pdf: createCategoryLoader('pdf'),
    api: createCategoryLoader('api')
  }

  return {
    globalLoading,
    loadingStates,
    loadingManager,
    withLoading,
    ...loadingFunctions
  }
}

/**
 * 自动清理长时间运行的加载状态
 */
export function setupLoadingCleanup() {
  const CLEANUP_INTERVAL = 60000 // 1分钟检查一次
  const MAX_LOADING_TIME = 300000 // 5分钟最大加载时间

  setInterval(() => {
    const now = Date.now()

    for (const [key, info] of loadingManager.loadingQueue.entries()) {
      if (now - info.startTime > MAX_LOADING_TIME) {
        console.warn(`长时间运行的加载操作已自动清理: ${key}`)
        loadingManager.cancel(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

// 在开发环境下自动设置清理
if (import.meta.env.DEV) {
  setupLoadingCleanup()
}