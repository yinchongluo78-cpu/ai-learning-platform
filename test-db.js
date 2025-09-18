// 测试数据库连接
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yrbybqsoplmpregzjswk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyYnlicXNvcGxtcHJlZ3pqc3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzk5MTksImV4cCI6MjA3MzQxNTkxOX0.U0pYtbip_dRI5d3w6Bqne7lhgbSMFUrjgOjvVwac9rw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('🔍 开始检查数据库...\n')

  // 1. 获取当前用户
  const { data: { user } } = await supabase.auth.getUser()
  console.log('当前用户ID:', user?.id || '未登录')

  // 2. 检查files表
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('*')

  if (filesError) {
    console.error('❌ 查询files表失败:', filesError)
  } else {
    console.log('\n📁 Files表:')
    console.log('- 文件总数:', files.length)
    files.forEach(file => {
      console.log(`  - ${file.filename} (ID: ${file.id})`)
    })
  }

  // 3. 检查file_chunks表
  const { data: chunks, error: chunksError } = await supabase
    .from('file_chunks')
    .select('*')
    .limit(10)

  if (chunksError) {
    console.error('❌ 查询file_chunks表失败:', chunksError)
  } else {
    console.log('\n📄 File_chunks表:')
    console.log('- 切片总数:', chunks.length)
    if (chunks.length > 0) {
      console.log('- 第一个切片:')
      console.log('  - file_id:', chunks[0].file_id)
      console.log('  - 内容预览:', chunks[0].content?.substring(0, 100) + '...')
    }
  }

  // 4. 测试搜索功能
  if (files && files.length > 0) {
    console.log('\n🔍 测试搜索功能:')
    const testQuery = '经济'

    // 使用所有文件进行测试
    if (files.length > 0) {
      const fileIds = files.map(f => f.id)

      // 搜索切片
      const { data: searchChunks, error: searchError } = await supabase
        .from('file_chunks')
        .select('*')
        .in('file_id', fileIds)
        .limit(5)

      if (searchError) {
        console.error('❌ 搜索失败:', searchError)
      } else {
        console.log(`- 找到 ${searchChunks.length} 个切片`)

        // 测试关键词匹配
        const matches = searchChunks.filter(chunk =>
          chunk.content?.toLowerCase().includes(testQuery)
        )
        console.log(`- 包含"${testQuery}"的切片: ${matches.length}个`)
      }
    }
  }
}

testDatabase().catch(console.error)