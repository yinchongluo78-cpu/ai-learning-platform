-- 启用向量扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 修改file_chunks表，添加向量列
ALTER TABLE file_chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 创建向量索引以加速搜索
CREATE INDEX IF NOT EXISTS file_chunks_embedding_idx
ON file_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 创建向量搜索函数
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  file_id uuid,
  content text,
  page_number int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.file_id,
    fc.content,
    fc.page_number,
    1 - (fc.embedding <=> query_embedding) AS similarity
  FROM file_chunks fc
  JOIN files f ON fc.file_id = f.id
  WHERE
    fc.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR f.user_id = filter_user_id)
  ORDER BY fc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;