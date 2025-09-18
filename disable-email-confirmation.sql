-- 关闭邮箱验证要求，允许用户直接登录
-- 这适合开发环境和内部使用

-- 更新现有用户的邮箱验证状态
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- 注意：这个SQL需要在Supabase的Auth设置中配置，不能在SQL Editor中执行