import { createClient } from '@supabase/supabase-js'

// 从环境变量获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 创建Supabase客户端（就像打开连接储藏室的钥匙）
export const supabase = createClient(supabaseUrl, supabaseKey)