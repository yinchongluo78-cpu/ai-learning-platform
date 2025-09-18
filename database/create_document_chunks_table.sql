-- 创建document_chunks表（如果不存在）
-- 用于存储文档的分块内容，支持RAG检索功能

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

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id
  ON document_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index
  ON document_chunks(document_id, chunk_index);

-- 启用行级安全策略
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：用户只能访问自己的文档块
CREATE POLICY "用户只能查看自己的文档块"
  ON document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的文档块"
  ON document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的文档块"
  ON document_chunks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的文档块"
  ON document_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- 授予必要的权限
GRANT ALL ON document_chunks TO authenticated;
GRANT ALL ON document_chunks TO service_role;

-- 添加注释
COMMENT ON TABLE document_chunks IS '存储文档的分块内容，用于RAG检索';
COMMENT ON COLUMN document_chunks.id IS '文档块的唯一标识符';
COMMENT ON COLUMN document_chunks.document_id IS '所属文档ID';
COMMENT ON COLUMN document_chunks.user_id IS '所属用户ID';
COMMENT ON COLUMN document_chunks.content IS '文档块的文本内容';
COMMENT ON COLUMN document_chunks.chunk_index IS '文档块的索引位置';
COMMENT ON COLUMN document_chunks.created_at IS '创建时间';