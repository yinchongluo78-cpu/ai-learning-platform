// 测试数据库连接的脚本
import { supabase } from './lib/supabase.js'

// 测试连接是否正常
async function testConnection() {
  try {
    console.log('正在测试Supabase连接...')

    // 尝试获取数据库表信息
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      console.log('数据库表还未创建，这是正常的：', error.message)
      console.log('请按照说明在Supabase控制台创建表')
    } else {
      console.log('✅ 数据库连接成功！')
      console.log('数据：', data)
    }
  } catch (err) {
    console.error('❌ 连接失败：', err.message)
  }
}

testConnection()