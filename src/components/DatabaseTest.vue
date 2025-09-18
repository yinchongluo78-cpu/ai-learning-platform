<template>
  <div class="database-test">
    <h2>数据库连接测试</h2>
    <button @click="testConnection" :disabled="testing">
      {{ testing ? '测试中...' : '测试连接' }}
    </button>

    <div v-if="result" class="result">
      <h3>测试结果：</h3>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const testing = ref(false)
const result = ref('')

async function testConnection() {
  testing.value = true
  result.value = ''

  try {
    console.log('正在测试Supabase连接...')
    result.value += '正在测试Supabase连接...\n'

    // 尝试获取数据库表信息
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      result.value += `数据库表还未创建，这是正常的：${error.message}\n`
      result.value += '请按照说明在Supabase控制台创建表\n'
    } else {
      result.value += '✅ 数据库连接成功！\n'
      result.value += `数据：${JSON.stringify(data, null, 2)}\n`
    }
  } catch (err) {
    result.value += `❌ 连接失败：${err.message}\n`
  }

  testing.value = false
}
</script>

<style scoped>
.database-test {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin: 20px;
}

.result {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>