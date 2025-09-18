import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('请确保环境变量配置正确')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanDatabase() {
  try {
    // 1. 获取所有对话记录
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('*')

    if (fetchError) {
      console.error('获取对话记录失败:', fetchError)
      return
    }

    console.log(`找到 ${conversations.length} 条对话记录`)

    // 2. 清理每条记录
    for (const conv of conversations) {
      let needsUpdate = false
      let cleanedResponse = conv.ai_response

      // 检查ai_response是否是对象
      if (typeof conv.ai_response === 'object' && conv.ai_response !== null) {
        console.log(`记录 ${conv.id} 的ai_response是对象，正在清理...`)

        // 尝试提取实际内容
        if (conv.ai_response.choices && conv.ai_response.choices[0]) {
          if (conv.ai_response.choices[0].message && conv.ai_response.choices[0].message.content) {
            cleanedResponse = conv.ai_response.choices[0].message.content
            needsUpdate = true
          }
        }
      }

      // 如果需要更新，执行更新
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ ai_response: cleanedResponse })
          .eq('id', conv.id)

        if (updateError) {
          console.error(`更新记录 ${conv.id} 失败:`, updateError)
        } else {
          console.log(`✅ 记录 ${conv.id} 已清理`)
        }
      }
    }

    console.log('数据库清理完成！')
  } catch (error) {
    console.error('清理数据库出错:', error)
  }
}

// 执行清理
cleanDatabase()