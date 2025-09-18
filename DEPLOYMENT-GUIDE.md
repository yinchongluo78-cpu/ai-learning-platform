# 部署指南

## Vercel部署步骤

### 1. 准备环境变量

需要在Vercel中配置以下环境变量（请使用你自己的值）：

```
# Supabase配置
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥

# DeepSeek API配置
VITE_DEEPSEEK_API_KEY=你的DeepSeek API密钥

# 阿里云OSS配置
VITE_OSS_REGION=你的OSS区域
VITE_OSS_ACCESS_KEY_ID=你的AccessKey ID
VITE_OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
VITE_OSS_BUCKET=你的Bucket名称
VITE_USE_OSS=true
```

### 2. 部署到Vercel

#### 方式一：通过GitHub（推荐）

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 导入GitHub仓库
4. 配置环境变量
5. 点击 Deploy

#### 方式二：使用Vercel CLI

```bash
npm i -g vercel
vercel
```

### 3. 配置生产环境变量

在Vercel项目设置中：
1. 进入 Settings → Environment Variables
2. 添加所有必需的环境变量
3. 保存并重新部署

### 4. 验证部署

- 测试用户注册登录
- 测试AI对话功能
- 测试文件上传
- 测试知识库搜索

## 注意事项

⚠️ **安全警告**：
- 永远不要将密钥提交到代码仓库
- 使用环境变量管理敏感信息
- 定期更换AccessKey

## 本地开发

1. 复制 `.env.example` 为 `.env.local`
2. 填入你的配置值
3. 运行 `npm run dev`

## 技术栈

- Frontend: Vue 3 + Vite
- Database: Supabase
- Storage: 阿里云OSS
- AI: DeepSeek API
- Deployment: Vercel