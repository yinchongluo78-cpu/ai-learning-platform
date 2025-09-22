-- 启用向量扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建知识库表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建文档表
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建文档切片表（包含向量）
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- DeepSeek embeddings维度
  chunk_index INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建HNSW索引以加速向量搜索
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 创建文本搜索索引
CREATE INDEX ON document_chunks USING GIN (to_tsvector('chinese', content));

-- 创建搜索函数（向量 + 关键词混合搜索）
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector,
  knowledge_base_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5,
  filter_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    (knowledge_base_id IS NULL OR d.knowledge_base_id = knowledge_base_id)
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
    AND (filter_metadata = '{}'::JSONB OR dc.metadata @> filter_metadata)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 创建关键词搜索函数
CREATE OR REPLACE FUNCTION search_by_keywords(
  query_text TEXT,
  knowledge_base_id UUID DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  rank FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    ts_rank_cd(to_tsvector('chinese', dc.content), plainto_tsquery('chinese', query_text)) AS rank,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    (knowledge_base_id IS NULL OR d.knowledge_base_id = knowledge_base_id)
    AND to_tsvector('chinese', dc.content) @@ plainto_tsquery('chinese', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 创建混合搜索函数
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector,
  query_text TEXT,
  knowledge_base_id UUID DEFAULT NULL,
  vector_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  score FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) AS similarity,
      dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE
      (knowledge_base_id IS NULL OR d.knowledge_base_id = knowledge_base_id)
      AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ),
  keyword_results AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      ts_rank_cd(to_tsvector('chinese', dc.content), plainto_tsquery('chinese', query_text)) AS rank,
      dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE
      (knowledge_base_id IS NULL OR d.knowledge_base_id = knowledge_base_id)
      AND to_tsvector('chinese', dc.content) @@ plainto_tsquery('chinese', query_text)
  )
  SELECT
    COALESCE(v.id, k.id) AS id,
    COALESCE(v.document_id, k.document_id) AS document_id,
    COALESCE(v.content, k.content) AS content,
    COALESCE(v.similarity * vector_weight, 0) + COALESCE(k.rank * keyword_weight, 0) AS score,
    COALESCE(v.metadata, k.metadata) AS metadata
  FROM vector_results v
  FULL OUTER JOIN keyword_results k ON v.id = k.id
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- 创建索引
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_knowledge_base_id ON documents(knowledge_base_id);
CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();