/**
 * 数据库适配器
 * 根据环境配置自动选择Supabase、LeanCloud或阿里云数据库
 */

import { supabase } from './supabase.js'
import aliyunDB from './aliyun-db.js'
import leancloud from './leancloud.js'

// 检测使用哪个数据库
const USE_LEANCLOUD = import.meta.env.VITE_USE_LEANCLOUD === 'true'
const USE_ALIYUN = import.meta.env.VITE_USE_ALIYUN_DB === 'true'

let DB_PROVIDER = 'supabase'
let database = supabase

if (USE_LEANCLOUD) {
  DB_PROVIDER = 'leancloud'
  database = leancloud
} else if (USE_ALIYUN) {
  DB_PROVIDER = 'aliyun'
  database = aliyunDB
}

console.log(`🗄️ 使用数据库: ${DB_PROVIDER}`)

/**
 * 统一的数据库接口
 */
export { database }

/**
 * 数据库适配器类
 * 提供统一的API，兼容Supabase和阿里云
 */
class DatabaseAdapter {
  constructor() {
    this.provider = DB_PROVIDER
    this.db = database
  }

  /**
   * 认证相关操作
   */
  get auth() {
    if (USE_LEANCLOUD) {
      return database.auth
    } else if (USE_ALIYUN) {
      return {
        signUp: async ({ email, password }) => {
          const result = await aliyunDB.auth.signUp(email, password)
          if (result.error) {
            return { data: null, error: { message: result.error } }
          }
          // 保存token到localStorage
          localStorage.setItem('auth_token', result.token)
          return {
            data: {
              user: result.user,
              session: { access_token: result.token }
            },
            error: null
          }
        },

        signInWithPassword: async ({ email, password }) => {
          const result = await aliyunDB.auth.signIn(email, password)
          if (result.error) {
            return { data: null, error: { message: result.error } }
          }
          // 保存token到localStorage
          localStorage.setItem('auth_token', result.token)
          return {
            data: {
              user: result.user,
              session: { access_token: result.token }
            },
            error: null
          }
        },

        getUser: async () => {
          const token = localStorage.getItem('auth_token')
          if (!token) {
            return { data: { user: null }, error: null }
          }
          return await aliyunDB.auth.getUser(token)
        },

        signOut: async () => {
          localStorage.removeItem('auth_token')
          return await aliyunDB.auth.signOut()
        }
      }
    } else {
      // 使用Supabase原生API
      return supabase.auth
    }
  }

  /**
   * 数据库查询操作
   */
  from(table) {
    return this.db.from(table)
  }

  /**
   * 存储操作
   */
  get storage() {
    return this.db.storage
  }

  /**
   * 获取当前用户ID
   */
  async getCurrentUserId() {
    const { data: { user } } = await this.auth.getUser()
    if (!user) return null

    if (USE_LEANCLOUD || USE_ALIYUN) {
      return user.id
    } else {
      // Supabase需要先查询users表
      const { data: userData } = await this.from('users')
        .select('id')
        .eq('email', user.email)
        .single()
      return userData?.id
    }
  }

  /**
   * 事务操作（阿里云专用）
   */
  async transaction(callback) {
    if (USE_ALIYUN) {
      const client = await aliyunDB.getPool().connect()
      try {
        await client.query('BEGIN')
        const result = await callback(client)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } else {
      // Supabase不支持事务，直接执行
      return await callback(this.db)
    }
  }

  /**
   * 批量操作
   */
  async batchInsert(table, records) {
    if (USE_ALIYUN) {
      // 阿里云批量插入
      const results = []
      for (const record of records) {
        const result = await this.from(table).insert(record)
        results.push(result)
      }
      return results
    } else {
      // Supabase支持批量插入
      return await this.from(table).insert(records)
    }
  }
}

// 创建适配器实例
export const db = new DatabaseAdapter()

// 导出便捷方法
export const auth = db.auth
export const from = (table) => db.from(table)
export const storage = db.storage

// 默认导出
export default db