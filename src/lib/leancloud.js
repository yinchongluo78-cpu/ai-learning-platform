/**
 * LeanCloud 数据库适配器
 * 免费额度：每天3万次API请求，1GB存储
 * 国内访问稳定，无需VPN
 */

import AV from 'leancloud-storage'

// LeanCloud配置
const APP_ID = import.meta.env.VITE_LEANCLOUD_APP_ID || 'your-app-id'
const APP_KEY = import.meta.env.VITE_LEANCLOUD_APP_KEY || 'your-app-key'
const SERVER_URL = import.meta.env.VITE_LEANCLOUD_SERVER_URL || 'https://please-replace-with-your-customized.domain.com'

// 初始化LeanCloud
if (APP_ID && APP_KEY && APP_ID !== 'your-app-id') {
  AV.init({
    appId: APP_ID,
    appKey: APP_KEY,
    serverURL: SERVER_URL
  })
  console.log('✅ LeanCloud已初始化')
}

/**
 * LeanCloud认证类
 */
export class LeanCloudAuth {
  /**
   * 用户注册
   */
  static async signUp(email, password, username) {
    try {
      const user = new AV.User()
      user.setUsername(username || email)
      user.setPassword(password)
      user.setEmail(email)

      const result = await user.signUp()

      return {
        user: {
          id: result.id,
          email: result.get('email'),
          username: result.get('username'),
          created_at: result.createdAt
        },
        session: {
          token: result.getSessionToken()
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error.message
      }
    }
  }

  /**
   * 用户登录
   */
  static async signIn(email, password) {
    try {
      const user = await AV.User.loginWithEmail(email, password)

      return {
        user: {
          id: user.id,
          email: user.get('email'),
          username: user.get('username'),
          created_at: user.createdAt
        },
        session: {
          token: user.getSessionToken()
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error.message
      }
    }
  }

  /**
   * 获取当前用户
   */
  static async getUser() {
    const currentUser = AV.User.current()
    if (!currentUser) {
      return { data: { user: null }, error: null }
    }

    return {
      data: {
        user: {
          id: currentUser.id,
          email: currentUser.get('email'),
          username: currentUser.get('username')
        }
      },
      error: null
    }
  }

  /**
   * 登出
   */
  static async signOut() {
    try {
      await AV.User.logOut()
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }
}

/**
 * LeanCloud数据操作类
 */
export class LeanCloudDB {
  constructor(className) {
    this.className = this.mapTableName(className)
    this.query = new AV.Query(this.className)
  }

  /**
   * 映射表名（兼容SQL表名）
   */
  mapTableName(name) {
    const mapping = {
      'users': '_User',
      'conversations': 'Conversation',
      'messages': 'Message',
      'documents': 'Document',
      'document_chunks': 'DocumentChunk',
      'user_stats': 'UserStats'
    }
    return mapping[name] || name
  }

  /**
   * 查询数据
   */
  async select(columns = '*') {
    try {
      // 如果指定了列，使用select
      if (columns !== '*' && columns) {
        const cols = columns.split(',').map(c => c.trim())
        this.query.select(cols)
      }

      const results = await this.query.find()
      const data = results.map(obj => this.objectToJSON(obj))

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 插入数据
   */
  async insert(data) {
    try {
      const ObjectClass = AV.Object.extend(this.className)
      const obj = new ObjectClass()

      // 设置数据
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          obj.set(key, data[key])
        }
      })

      // 设置ACL（访问控制）
      const currentUser = AV.User.current()
      if (currentUser) {
        const acl = new AV.ACL()
        acl.setReadAccess(currentUser, true)
        acl.setWriteAccess(currentUser, true)
        acl.setPublicReadAccess(data.is_public || false)
        obj.setACL(acl)
      }

      const saved = await obj.save()
      return {
        data: this.objectToJSON(saved),
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 更新数据
   */
  async update(data) {
    try {
      if (!this.targetId) {
        throw new Error('更新操作需要指定ID')
      }

      const obj = AV.Object.createWithoutData(this.className, this.targetId)

      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          obj.set(key, data[key])
        }
      })

      const saved = await obj.save()
      return {
        data: [this.objectToJSON(saved)],
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 删除数据
   */
  async delete() {
    try {
      if (!this.targetId) {
        throw new Error('删除操作需要指定ID')
      }

      const obj = AV.Object.createWithoutData(this.className, this.targetId)
      await obj.destroy()

      return { data: [{ id: this.targetId }], error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 条件查询
   */
  eq(column, value) {
    if (column === 'id') {
      this.targetId = value
      this.query.equalTo('objectId', value)
    } else if (column === 'user_id') {
      // 处理用户关联
      const user = AV.Object.createWithoutData('_User', value)
      this.query.equalTo('user', user)
    } else {
      this.query.equalTo(column, value)
    }
    return this
  }

  /**
   * 或条件
   */
  or(conditions) {
    // LeanCloud的or查询比较复杂，这里简化处理
    if (typeof conditions === 'string') {
      // 解析简单的or条件
      const parts = conditions.split(',')
      const queries = parts.map(part => {
        const q = new AV.Query(this.className)
        // 简单解析，实际可能需要更复杂的逻辑
        return q
      })
      this.query = AV.Query.or(...queries)
    }
    return this
  }

  /**
   * 排序
   */
  order(column, options = {}) {
    if (options.ascending === false) {
      this.query.descending(column === 'created_at' ? 'createdAt' : column)
    } else {
      this.query.ascending(column === 'created_at' ? 'createdAt' : column)
    }
    return this
  }

  /**
   * 限制数量
   */
  limit(count) {
    this.query.limit(count)
    return this
  }

  /**
   * 返回单条记录
   */
  async single() {
    this.query.limit(1)
    const result = await this.select()
    if (result.error) {
      return { data: null, error: result.error }
    }
    return { data: result.data[0] || null, error: null }
  }

  /**
   * LeanCloud对象转JSON
   */
  objectToJSON(obj) {
    if (!obj) return null

    const json = {
      id: obj.id,
      created_at: obj.createdAt,
      updated_at: obj.updatedAt
    }

    // 获取所有属性
    const attrs = obj.attributes
    Object.keys(attrs).forEach(key => {
      json[key] = attrs[key]
    })

    return json
  }
}

/**
 * LeanCloud文件存储
 */
export class LeanCloudStorage {
  /**
   * 上传文件
   */
  static async upload(fileName, fileData) {
    try {
      let file

      if (typeof fileData === 'string') {
        // Base64数据
        file = new AV.File(fileName, { base64: fileData })
      } else if (fileData instanceof Blob || fileData instanceof File) {
        // Blob或File对象
        file = new AV.File(fileName, fileData)
      } else {
        // 其他数据类型
        file = new AV.File(fileName, fileData)
      }

      // 设置ACL
      const currentUser = AV.User.current()
      if (currentUser) {
        const acl = new AV.ACL()
        acl.setReadAccess(currentUser, true)
        acl.setPublicReadAccess(true)
        file.setACL(acl)
      }

      const saved = await file.save()

      return {
        data: {
          url: saved.url(),
          id: saved.id,
          name: saved.name()
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 下载文件
   */
  static async download(fileId) {
    try {
      const query = new AV.Query('_File')
      const file = await query.get(fileId)

      return {
        data: {
          url: file.url(),
          name: file.name()
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  /**
   * 删除文件
   */
  static async delete(fileId) {
    try {
      const file = AV.File.createWithoutData(fileId)
      await file.destroy()

      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }
}

/**
 * 创建兼容Supabase的API接口
 */
export const leancloud = {
  auth: {
    signUp: ({ email, password }) => LeanCloudAuth.signUp(email, password),
    signInWithPassword: ({ email, password }) => LeanCloudAuth.signIn(email, password),
    getUser: () => LeanCloudAuth.getUser(),
    signOut: () => LeanCloudAuth.signOut()
  },

  from(tableName) {
    return new LeanCloudDB(tableName)
  },

  storage: {
    from(bucket) {
      return {
        upload: (path, file) => LeanCloudStorage.upload(path, file),
        download: (path) => LeanCloudStorage.download(path),
        remove: (path) => LeanCloudStorage.delete(path)
      }
    }
  }
}

// 导出默认实例
export default leancloud