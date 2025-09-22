# RAG知识库系统 - 使用说明

## 🎯 系统特点

本系统实现了一个精准的RAG（Retrieval-Augmented Generation）知识库系统，具有以下特点：

### 核心功能
1. **默认纯聊天模式**：未选择知识库时，系统作为普通AI助手
2. **精准检索**：基于向量相似度检索，Top-K=3，相似度阈值0.75
3. **强制引用**：回答必须基于检索结果，每条信息标注【文件名-页码】
4. **安全合规**：服务端持有API密钥，前端仅使用匿名密钥

### 技术架构
- **前端**：Vue 3 + Vite
- **数据库**：LeanCloud（支持国内访问）
- **AI模型**：DeepSeek Chat API
- **向量化**：DeepSeek Embeddings
- **文档处理**：智能切片（400 tokens/片，80 tokens重叠）

## 📚 使用指南

### 1. 上传文档
- 点击"上传文档"按钮
- 支持格式：TXT, MD, PDF, DOCX
- 文档会自动切片、向量化并存储

### 2. 选择知识库模式
- **关闭RAG**：普通聊天模式，AI可以自由回答
- **开启RAG**：精准模式，AI只基于选定文档回答

### 3. 检索设置
- **Top-K**：返回最相似的K个片段（默认3）
- **相似度阈值**：过滤低相似度结果（默认0.75）

### 4. 引用说明
开启RAG后，AI回答会包含：
- 【文件名-页码】格式的引用标记
- 参考来源列表，显示相似度百分比
- 如果没有找到相关内容，明确告知"资料中没有找到相关内容"

## 🔧 配置说明

### 环境变量配置
```bash
# 复制示例文件
cp .env.example .env.local

# 编辑配置文件
vim .env.local
```

### 必需配置项
- `VITE_LEANCLOUD_APP_ID`：LeanCloud应用ID
- `VITE_LEANCLOUD_APP_KEY`：LeanCloud应用密钥
- `VITE_DEEPSEEK_API_KEY`：DeepSeek API密钥

## 🚀 部署指南

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产部署
```bash
# 构建项目
npm run build

# 部署到Vercel
git push origin main
```

## ⚠️ 注意事项

1. **密钥安全**：
   - 永远不要将API密钥提交到代码仓库
   - 使用环境变量管理敏感信息
   - 服务端保存service role密钥

2. **文档处理**：
   - PDF文档会自动识别页码
   - 自动去除页眉页脚等噪音
   - 智能切片保证上下文连贯

3. **性能优化**：
   - 文档切片缓存在LeanCloud
   - 向量计算结果持久化存储
   - 支持批量文档上传

## 📊 API接口

### /api/upload
上传并处理文档
```json
POST /api/upload
{
  "file_name": "example.pdf",
  "content": "文档内容",
  "file_type": "pdf"
}
```

### /api/search
向量检索
```json
POST /api/search
{
  "query": "查询内容",
  "top_k": 3,
  "threshold": 0.75,
  "doc_ids": ["doc1", "doc2"]
}
```

### /api/chat
RAG增强对话
```json
POST /api/chat
{
  "messages": [...],
  "use_rag": true,
  "doc_ids": ["doc1"],
  "top_k": 3,
  "threshold": 0.75
}
```

## 🔍 常见问题

### Q: 为什么选择LeanCloud？
A: LeanCloud在国内可直接访问，无需VPN，适合中国用户。

### Q: 如何提高检索准确度？
A: 可以调整相似度阈值，或增加Top-K数量。

### Q: 支持哪些文档格式？
A: 目前支持TXT、MD、PDF、DOCX格式。

### Q: 如何处理大文档？
A: 系统会自动切片，每片约400 tokens，确保检索效率。

## 📝 更新日志

### v1.0.0 (2024-01-22)
- 初始版本发布
- 实现基础RAG功能
- 支持多文档管理
- 添加引用标注功能