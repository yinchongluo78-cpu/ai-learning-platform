/**
 * 阿里云RDS PostgreSQL数据库连接模块
 * 替代Supabase，实现国内稳定访问
 */

import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// 数据库配置（需要在环境变量中设置）
const dbConfig = {
  host: import.meta.env.VITE_ALIYUN_DB_HOST || 'localhost',
  port: import.meta.env.VITE_ALIYUN_DB_PORT || 5432,
  database: import.meta.env.VITE_ALIYUN_DB_NAME || 'ai_learning',
  user: import.meta.env.VITE_ALIYUN_DB_USER || 'postgres',
  password: import.meta.env.VITE_ALIYUN_DB_PASSWORD || '',
  ssl: import.meta.env.VITE_ALIYUN_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // 连接池最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// JWT密钥
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production'

// 创建数据库连接池
let pool = null

/**
 * 获取数据库连接池
 */
export function getPool() {
  if (!pool) {
    pool = new Pool(dbConfig)

    // 连接错误处理
    pool.on('error', (err) => {
      console.error('数据库连接池错误:', err)
    })
  }
  return pool
}

/**
 * 执行数据库查询
 */
export async function query(text, params) {
  const client = await getPool().connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

/**
 * 用户认证类（替代Supabase Auth）
 */
export class AliyunAuth {
  /**
   * 用户注册
   */
  static async signUp(email, password, username) {
    try {
      // 检查用户是否已存在
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      if (existingUser.rows.length > 0) {
        throw new Error('用户已存在')
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10)

      // 创建用户
      const result = await query(
        `INSERT INTO users (email, password_hash, username, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, email, username`,
        [email, hashedPassword, username || email.split('@')[0]]
      )

      const user = result.rows[0]

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return {
        user,
        token,
        error: null
      }
    } catch (error) {
      return {
        user: null,
        token: null,
        error: error.message
      }
    }
  }

  /**
   * 用户登录
   */
  static async signIn(email, password) {
    try {
      // 查询用户
      const result = await query(
        'SELECT id, email, username, password_hash FROM users WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        throw new Error('用户不存在')
      }

      const user = result.rows[0]

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error('密码错误')
      }

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // 更新最后登录时间
      await query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      )

      delete user.password_hash // 不返回密码哈希

      return {
        user,
        token,
        error: null
      }
    } catch (error) {
      return {
        user: null,
        token: null,
        error: error.message
      }
    }
  }

  /**
   * 获取当前用户
   */
  static async getUser(token) {
    try {
      // 验证token
      const decoded = jwt.verify(token, JWT_SECRET)

      // 查询用户信息
      const result = await query(
        'SELECT id, email, username, created_at FROM users WHERE id = $1',
        [decoded.userId]
      )

      if (result.rows.length === 0) {
        throw new Error('用户不存在')
      }

      return {
        data: { user: result.rows[0] },
        error: null
      }
    } catch (error) {
      return {
        data: { user: null },
        error: error.message
      }
    }
  }

  /**
   * 登出
   */
  static async signOut() {
    // 客户端清除token即可
    return { error: null }
  }
}

/**
 * 数据库操作类（替代Supabase的from().select()等API）
 */
export class AliyunDB {
  constructor(tableName) {
    this.tableName = tableName
    this.filters = []
    this.orderBy = null
    this.limitCount = null
  }

  /**
   * 查询数据
   */
  async select(columns = '*') {
    let sql = `SELECT ${columns} FROM ${this.tableName}`
    const params = []
    let paramIndex = 1

    // 添加过滤条件
    if (this.filters.length > 0) {
      const whereClause = this.filters.map(filter => {
        params.push(filter.value)
        return `${filter.column} ${filter.operator} $${paramIndex++}`
      }).join(' AND ')
      sql += ` WHERE ${whereClause}`
    }

    // 添加排序
    if (this.orderBy) {
      sql += ` ORDER BY ${this.orderBy.column} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`
    }

    // 添加限制
    if (this.limitCount) {
      sql += ` LIMIT ${this.limitCount}`
    }

    try {
      const result = await query(sql, params)
      return { data: result.rows, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 插入数据
   */
  async insert(data) {
    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `

    try {
      const result = await query(sql, values)
      return { data: result.rows[0], error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 更新数据
   */
  async update(data) {
    const columns = Object.keys(data)
    const values = Object.values(data)
    let paramIndex = 1

    const setClause = columns.map(col => `${col} = $${paramIndex++}`).join(', ')
    let sql = `UPDATE ${this.tableName} SET ${setClause}`

    // 添加过滤条件
    if (this.filters.length > 0) {
      const whereClause = this.filters.map(filter => {
        values.push(filter.value)
        return `${filter.column} ${filter.operator} $${paramIndex++}`
      }).join(' AND ')
      sql += ` WHERE ${whereClause}`
    }

    sql += ' RETURNING *'

    try {
      const result = await query(sql, values)
      return { data: result.rows, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 删除数据
   */
  async delete() {
    let sql = `DELETE FROM ${this.tableName}`
    const params = []
    let paramIndex = 1

    // 添加过滤条件
    if (this.filters.length > 0) {
      const whereClause = this.filters.map(filter => {
        params.push(filter.value)
        return `${filter.column} ${filter.operator} $${paramIndex++}`
      }).join(' AND ')
      sql += ` WHERE ${whereClause}`
    }

    sql += ' RETURNING *'

    try {
      const result = await query(sql, params)
      return { data: result.rows, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 添加等于过滤条件
   */
  eq(column, value) {
    this.filters.push({ column, operator: '=', value })
    return this
  }

  /**
   * 添加或条件
   */
  or(conditions) {
    // 简化版本，暂不实现复杂OR逻辑
    return this
  }

  /**
   * 排序
   */
  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false }
    return this
  }

  /**
   * 限制返回数量
   */
  limit(count) {
    this.limitCount = count
    return this
  }

  /**
   * 返回单条记录
   */
  async single() {
    this.limitCount = 1
    const result = await this.select()
    if (result.error) {
      return { data: null, error: result.error }
    }
    return { data: result.data[0] || null, error: null }
  }
}

/**
 * 创建类似Supabase的API接口
 */
export const aliyunDB = {
  auth: AliyunAuth,

  from(tableName) {
    return new AliyunDB(tableName)
  },

  // 兼容性方法
  storage: {
    from() {
      console.warn('文件存储请使用阿里云OSS')
      return {
        upload: () => Promise.resolve({ data: null, error: '请使用OSS上传' }),
        download: () => Promise.resolve({ data: null, error: '请使用OSS下载' })
      }
    }
  }
}

// 导出默认实例
export default aliyunDB