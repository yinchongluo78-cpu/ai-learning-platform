-- 添加缺失的avatar列到users表
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 添加avatar列（如果不存在）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- 2. 设置默认值（使用随机头像）
UPDATE users
SET avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || name
WHERE avatar IS NULL;

-- 3. 添加注释
COMMENT ON COLUMN users.avatar IS '用户头像URL';

-- 查看表结构确认
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;