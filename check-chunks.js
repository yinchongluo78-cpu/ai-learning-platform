// 检查文档切片
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yrbybqsoplmpregzjswk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyYnlicXNvcGxtcHJlZ3pqc3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzk5MTksImV4cCI6MjA3MzQxNTkxOX0.U0pYtbip_dRI5d3w6Bqne7lhgbSMFUrjgOjvVwac9rw'
)

async function checkChunks() {
  // 1. 检查刚上传的文件
  const fileId = '877d3299-95cf-47e0-8894-54ee4557df94'

  console.log('🔍 检查文件ID:', fileId)

  // 2. 查看这个文件的切片
  const { data: chunks, error } = await supabase
    .from('file_chunks')
    .select('*')
    .eq('file_id', fileId)

  if (error) {
    console.error('查询失败:', error)
  } else {
    console.log('📄 该文件的切片数量:', chunks?.length || 0)
    if (chunks && chunks.length > 0) {
      console.log('第一个切片内容:', chunks[0].content?.substring(0, 100))
      console.log('切片包含"微观经济学":', chunks[0].content?.includes('微观经济学'))
    }
  }

  // 3. 测试搜索
  const query = '微观经济学'
  const queryLower = query.toLowerCase()

  if (chunks && chunks.length > 0) {
    const matches = chunks.filter(chunk => {
      const content = (chunk.content || '').toLowerCase()
      return content.includes(queryLower) || content.includes('经济')
    })

    console.log(`\n🔍 包含"${query}"或"经济"的切片:`, matches.length)

    if (matches.length === 0) {
      // 检查内容编码问题
      console.log('\n📝 所有切片内容预览:')
      chunks.forEach((chunk, i) => {
        console.log(`切片${i+1}: ${chunk.content?.substring(0, 50)}...`)
      })
    }
  }
}

checkChunks().catch(console.error)