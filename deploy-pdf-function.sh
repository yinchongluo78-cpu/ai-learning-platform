#!/bin/bash

# 部署PDF解析函数到Supabase Edge Functions

echo "🚀 部署PDF解析函数到Supabase..."

# 请先安装Supabase CLI
# brew install supabase/tap/supabase

# 登录Supabase（如果还没登录）
# supabase login

# 部署函数
supabase functions deploy parse-pdf \
  --project-ref grqznqyqluehqjnufkxu

echo "✅ 部署完成！"
echo ""
echo "函数URL: https://grqznqyqluehqjnufkxu.supabase.co/functions/v1/parse-pdf"
echo ""
echo "测试命令："
echo "curl -X POST https://grqznqyqluehqjnufkxu.supabase.co/functions/v1/parse-pdf \\"
echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "  -F 'file=@test.pdf'"