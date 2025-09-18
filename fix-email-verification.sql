-- 直接在数据库中验证所有现有用户
-- 这会让所有用户都能立即登录

UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmation_token = NULL,
    confirmation_sent_at = NULL
WHERE email_confirmed_at IS NULL;