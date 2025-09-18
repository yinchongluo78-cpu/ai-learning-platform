import { supabase } from '../lib/supabase.js'

export async function initDatabase() {
  try {
    console.log('🔧 检查数据库表结构...')

    // 检查document_chunks表是否存在
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('⚠️ document_chunks表不存在，需要在Supabase中创建')
      console.log('请在Supabase SQL编辑器中执行以下SQL：')
      console.log(`
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);

-- 设置RLS策略
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能访问自己的文档块" ON document_chunks
  FOR ALL USING (auth.uid() = user_id);
      `)

      return false
    }

    console.log('✅ 数据库表结构正常')
    return true

  } catch (error) {
    console.error('数据库初始化错误:', error)
    return false
  }
}

// SQL创建语句（供手动执行）
export const CREATE_DOCUMENT_CHUNKS_TABLE = `
-- 创建document_chunks表
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);

-- 启用RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "用户只能访问自己的文档块" ON document_chunks
  FOR ALL USING (auth.uid() = user_id);
`