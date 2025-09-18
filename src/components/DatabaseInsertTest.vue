<template>
  <div class="db-test">
    <h4>🧪 数据库插入测试</h4>
    <p>这个工具用来测试能否直接向users表插入数据</p>

    <form @submit.prevent="testInsert">
      <div class="form-row">
        <input v-model="testData.name" placeholder="测试姓名" required>
        <input v-model="testData.email" type="email" placeholder="测试邮箱" required>
        <select v-model="testData.age" required>
          <option value="">年龄</option>
          <option v-for="age in [8,9,10,11,12,13,14,15]" :key="age" :value="age">{{ age }}岁</option>
        </select>
      </div>
      <div class="form-row">
        <input v-model="testData.phone" placeholder="测试手机号" required>
        <input v-model="testData.password" placeholder="测试密码" required>
        <button type="submit" :disabled="testing">
          {{ testing ? '测试中...' : '测试插入' }}
        </button>
      </div>
    </form>

    <div v-if="result" class="result">
      <h5>测试结果：</h5>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const testing = ref(false)
const result = ref('')

const testData = ref({
  name: '测试用户',
  email: 'test' + Date.now() + '@example.com',
  age: 12,
  phone: '13800000000',
  password: '123456'
})

async function testInsert() {
  testing.value = true
  result.value = ''

  try {
    console.log('开始测试插入数据:', testData.value)

    // 生成一个正确格式的UUID作为测试
    const fakeUserId = crypto.randomUUID()

    const insertData = {
      id: fakeUserId,
      email: testData.value.email,
      name: testData.value.name,
      age: parseInt(testData.value.age),
      phone: testData.value.phone,
      password: testData.value.password,
      total_study_time: 0
    }

    const { data, error } = await supabase
      .from('users')
      .insert([insertData])
      .select()

    if (error) {
      result.value = `❌ 插入失败：${error.message}\n\n错误详情：${JSON.stringify(error, null, 2)}`
    } else {
      result.value = `✅ 插入成功！\n\n插入的数据：${JSON.stringify(data, null, 2)}`

      // 更新测试邮箱，准备下次测试
      testData.value.email = 'test' + Date.now() + '@example.com'
    }
  } catch (err) {
    result.value = `❌ 测试出错：${err.message}`
    console.error('测试插入出错:', err)
  }

  testing.value = false
}
</script>

<style scoped>
.db-test {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
}

.form-row {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.form-row input,
.form-row select {
  flex: 1;
  min-width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
}

.form-row button {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.form-row button:disabled {
  background: #ccc;
}

.result {
  margin-top: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.result pre {
  font-size: 10px;
  white-space: pre-wrap;
  margin: 0;
}
</style>