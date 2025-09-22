# RAG 系统配置指南

## 系统架构

本项目实现了一个精准的 RAG（检索增强生成）系统，包含以下特性：

1. **默认纯聊天模式** - 不检索文档，直接使用 AI 回答
2. **精准知识库模式** - 基于上传文档的精准检索和引用
3. **混合检索** - 结合向量相似度和关键词匹配
4. **强制引用** - 回答必须基于检索结果，标注来源

## 快速开始

### 1. 配置数据库

由于 LeanCloud 不支持向量存储，需要使用 Supabase 的 PostgreSQL + pgvector：

1. 注册 [Supabase](https://supabase.com) 账号
2. 创建新项目
3. 在 SQL Editor 中执行 `api/migrations/001_create_rag_tables.sql`

### 2. 配置环境变量

复制 `.env.server.example` 为 `.env.server`：

```bash
cp .env.server.example .env.server
```

编辑 `.env.server`，填入你的配置：

```env
# Supabase配置（用于向量存储）
SUPABASE_URL=你的Supabase项目URL
SUPABASE_SERVICE_ROLE_KEY=你的service_role_key
SUPABASE_ANON_KEY=你的anon_key

# DeepSeek AI配置
DEEPSEEK_API_KEY=你的DeepSeek API密钥

# 服务器配置
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://smartyouth.top
```

### 3. 安装依赖

```bash
# 安装API服务器依赖
cd api
npm install

# 安装前端依赖
cd ..
npm install
```

### 4. 启动服务

```bash
# 启动API服务器（新终端）
cd api
npm run dev

# 启动前端开发服务器（新终端）
npm run dev
```

### 5. 访问系统

- 打开浏览器访问 http://localhost:5173
- 登录后点击"超级学霸"进入RAG系统

## 使用指南

### 创建知识库

1. 点击"知识库管理"
2. 输入知识库名称和描述
3. 点击"创建"

### 上传文档

1. 选择知识库
2. 点击"选择文件"
3. 支持格式：TXT（当前版本）
4. 文档会自动切片并向量化

### 精准问答

1. 开启"启用知识库"
2. 选择目标知识库
3. 输入问题
4. AI会基于文档内容回答，并标注信息来源

### 配置检索参数

- **Top K**：返回最相关的K个片段（默认3）
- **相似度阈值**：最低相似度要求（默认0.75）

## 技术细节

### 文本处理

- **切片大小**：500字符
- **重叠**：100字符
- **清理**：去除页眉页脚、页码等噪音

### 向量化

- 使用 DeepSeek embeddings API
- 维度：1536
- 索引：HNSW（高性能）

### 检索策略

1. **向量检索**：余弦相似度
2. **关键词检索**：中文分词 + 全文搜索
3. **混合权重**：向量0.7 + 关键词0.3

### 安全措施

- API限流：15分钟100次
- 文档上传限流：1小时10个
- 输入清洗和验证
- Service Role Key仅在服务端

## 部署到生产

### Vercel部署

1. 前端部署：
```bash
npm run build
vercel --prod
```

2. API服务器部署：
- 使用 Railway/Render/Heroku 等平台
- 或使用 Vercel Serverless Functions

### 环境变量配置

在 Vercel 中设置：
- `VITE_API_URL`：你的API服务器地址

### 数据库迁移

在 Supabase SQL Editor 中执行迁移脚本。

## 常见问题

### Q: 为什么不用 LeanCloud？
A: LeanCloud 不支持向量存储和相似度搜索，无法实现 RAG 功能。

### Q: 如何支持 PDF/Word 文档？
A: 安装额外依赖：
```bash
npm install pdf-parse mammoth
```

### Q: 如何提高检索精度？
A:
- 调高相似度阈值
- 减少 Top K 值
- 优化文档切片策略
- 清理文档噪音

### Q: API 调用频率限制？
A: DeepSeek API 有频率限制，建议添加缓存层。

## 开发路线图

- [x] 基础 RAG 系统
- [x] 混合检索
- [x] 引用标注
- [ ] PDF/Word 支持
- [ ] 图片 OCR
- [ ] 多轮对话优化
- [ ] 知识图谱
- [ ] 语义缓存

## 许可证

MIT

## 联系方式

有问题请提交 Issue 或联系开发者。