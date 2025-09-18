-- 添加缺失的列到documents表
-- 如果列不存在则添加

-- 添加size列（文件大小）
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS size BIGINT;

-- 添加其他可能缺失的列
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS oss_url TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS oss_key TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_name TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS etag TEXT;

-- 更新现有记录的size为默认值（如果为NULL）
UPDATE documents
SET size = 0
WHERE size IS NULL;

-- 查看表结构确认
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'documents';