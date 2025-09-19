# LeanCloud 免费部署指南（推荐）

## ✨ 为什么选择LeanCloud？

- **完全免费**：每天3万次API请求，1GB存储
- **国内访问稳定**：无需VPN，国内有节点
- **简单易用**：5分钟即可配置完成
- **功能完整**：数据库、文件存储、用户系统一体化

## 📋 快速开始

### 1. 注册LeanCloud账号

1. 访问 [LeanCloud中国区](https://www.leancloud.cn) 或 [国际版](https://leancloud.app)
2. 注册账号（推荐使用中国区，访问更快）
3. 创建应用，选择**开发版**（免费）

### 2. 获取应用配置

进入应用控制台，点击**设置** → **应用凭证**，获取：
- `App ID`
- `App Key`
- `REST API 服务器地址`（如果使用国际版需要自定义域名）

### 3. 配置项目

创建 `.env.local` 文件：

```env
# 使用LeanCloud
VITE_USE_LEANCLOUD=true

# LeanCloud配置
VITE_LEANCLOUD_APP_ID=your-app-id
VITE_LEANCLOUD_APP_KEY=your-app-key
VITE_LEANCLOUD_SERVER_URL=https://your-server-url.leancloud.cn

# DeepSeek AI配置
VITE_DEEPSEEK_API_KEY=your-deepseek-api-key

# 如果需要关闭Supabase
VITE_USE_SUPABASE=false
```

### 4. 更新database.js

修改 `src/lib/database.js`：

```javascript
import leancloud from './leancloud.js'

// 根据配置选择数据库
const USE_LEANCLOUD = import.meta.env.VITE_USE_LEANCLOUD === 'true'
export const database = USE_LEANCLOUD ? leancloud : supabase
```

## 🚀 部署方案

### 方案A：Vercel部署（推荐）

1. **推送代码到GitHub**
2. **连接Vercel**
3. **配置环境变量**
4. **自动部署**

### 方案B：Gitee Pages（国内免费）

1. **构建项目**
   ```bash
   npm run build
   ```

2. **推送到Gitee**
   ```bash
   git remote add gitee https://gitee.com/your-username/ai-learning
   git push gitee main
   ```

3. **开启Gitee Pages**
   - 进入仓库设置
   - 选择服务 → Gitee Pages
   - 选择部署目录为 `dist`

### 方案C：本地部署

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
npm run preview
```

## 📊 LeanCloud控制台使用

### 数据管理

1. **存储** → **结构化数据**：查看和管理数据
2. **用户** → **用户列表**：管理用户
3. **文件** → **文件管理**：管理上传的文件

### 设置权限

1. **存储** → **服务设置** → **权限设置**
2. 建议设置：
   - 用户注册：开放
   - 数据读取：登录用户
   - 数据写入：创建者

## 🔧 常见问题

### 1. 跨域问题

如果遇到跨域问题，在LeanCloud控制台：
- **设置** → **安全中心** → **Web安全域名**
- 添加你的域名（如 `https://your-app.vercel.app`）

### 2. 请求限制

免费版限制：
- API请求：3万次/天
- 文件上传：1GB存储
- 云函数：暂不可用

### 3. 数据迁移

从Supabase迁移：
1. 导出Supabase数据为JSON
2. 使用LeanCloud数据导入功能
3. 或编写迁移脚本

## 💰 费用对比

| 服务 | 免费额度 | 超出费用 |
|-----|---------|---------|
| LeanCloud | 3万请求/天，1GB存储 | ¥0.01/千次请求 |
| Supabase | 500MB存储，2GB传输 | $25/月起 |
| 阿里云RDS | 无免费额度 | ~¥200/月 |
| Firebase | 1GB存储，10GB传输 | 按用量付费 |

## 🎯 性能优化

1. **启用缓存**
   ```javascript
   // 启用查询缓存
   query.setCachePolicy(AV.Query.CachePolicy.CACHE_ELSE_NETWORK)
   ```

2. **批量操作**
   ```javascript
   // 批量保存
   AV.Object.saveAll(objects)
   ```

3. **索引优化**
   - 在控制台为常用查询字段建立索引

## 📚 学习资源

- [LeanCloud文档](https://docs.leancloud.cn)
- [JavaScript SDK指南](https://leancloud.cn/docs/sdk_setup-js.html)
- [REST API文档](https://leancloud.cn/docs/rest_api.html)

## 🆘 技术支持

- LeanCloud论坛：https://forum.leancloud.cn
- 工单系统：控制台内提交
- QQ群：官方技术支持群

## ✅ 检查清单

- [ ] 注册LeanCloud账号
- [ ] 创建应用获取凭证
- [ ] 配置.env.local
- [ ] 更新database.js
- [ ] 本地测试正常
- [ ] 部署到线上
- [ ] 配置安全域名
- [ ] 测试所有功能

## 🎉 完成！

恭喜！你已经成功配置了免费的、国内可访问的AI学习平台！

**优势总结**：
- ✅ 完全免费（小型应用）
- ✅ 国内访问无障碍
- ✅ 5分钟快速配置
- ✅ 自动扩展，无需运维