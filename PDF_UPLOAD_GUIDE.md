# PDF文件上传指南

## 功能特性

现在系统支持以下功能：
- ✅ **100MB文件大小限制** - 支持上传最大100MB的文件
- ✅ **PDF文档解析** - 自动提取PDF中的文本内容
- ✅ **多格式支持** - 支持PDF、TXT、Markdown、JSON、CSV、LOG等格式
- ✅ **智能分块** - 自动将大文档分割成小块以便于检索

## 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| PDF | .pdf | 自动解析提取文本内容 |
| 文本文件 | .txt | 纯文本文件 |
| Markdown | .md | Markdown格式文档 |
| JSON | .json | JSON数据文件 |
| CSV | .csv | CSV表格文件 |
| 日志文件 | .log | 系统日志文件 |

## 使用步骤

1. **选择文件**：点击"选择知识库"按钮，选择"上传新知识库"
2. **上传文件**：选择要上传的文件（最大100MB）
3. **等待解析**：
   - 对于PDF文件，系统会显示"正在解析PDF文档，请稍候..."
   - 解析完成后会显示页数和文档块数量
4. **使用知识库**：上传成功后，文档会自动激活，可以在对话中引用

## 数据库配置（重要）

⚠️ **首次使用前必须创建document_chunks表**

请在Supabase SQL编辑器中执行以下SQL：

```sql
-- 创建document_chunks表（如果不存在）
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_document
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id
  ON document_chunks(user_id);

-- 启用RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "用户只能访问自己的文档块"
  ON document_chunks FOR ALL
  USING (auth.uid() = user_id);
```

## PDF处理说明

### 支持的PDF特性
- ✅ 文本提取
- ✅ 多页文档
- ✅ 元数据提取（标题、作者等）
- ✅ 自动分页标记

### 当前限制
- ⚠️ 扫描版PDF（图片PDF）需要先进行OCR处理
- ⚠️ 加密的PDF需要先解密
- ⚠️ 复杂格式（如表格、图表）可能无法完美提取

### 最佳实践
1. **文档准备**：
   - 确保PDF文件包含可选择的文本
   - 避免上传扫描版PDF
   - 文件大小控制在100MB以内

2. **格式转换建议**：
   - 扫描版PDF → 使用OCR工具转换为文本PDF
   - 超大文件 → 分割成多个小文件
   - 加密文件 → 先解密后上传

## 故障排除

### 问题：上传进度卡在60%
**原因**：document_chunks表不存在
**解决**：执行上述SQL创建表

### 问题：PDF解析失败
**原因**：PDF文件可能是扫描版或加密的
**解决**：使用PDF转文本工具预处理

### 问题：文件太大无法上传
**原因**：文件超过100MB限制
**解决**：压缩或分割文件

## 技术细节

- 使用PDF.js库进行PDF解析
- 文档自动分块，每块1000字符
- 支持断点续传和错误恢复
- 自动激活RAG检索模式