-- 修复users表的avatar列
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 检查avatar列是否存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='users'
        AND column_name='avatar'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar TEXT;
        RAISE NOTICE 'Avatar column added successfully';
    ELSE
        RAISE NOTICE 'Avatar column already exists';
    END IF;
END $$;

-- 2. 为现有用户设置默认头像（如果avatar为NULL）
UPDATE users
SET avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || COALESCE(name, 'user' || id::text)
WHERE avatar IS NULL;

-- 3. 添加列注释
COMMENT ON COLUMN users.avatar IS '用户头像URL';

-- 4. 验证更改
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 5. 显示更新后的用户数据示例
SELECT id, name, email, avatar
FROM users
LIMIT 5;