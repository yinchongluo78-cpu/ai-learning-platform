<template>
  <div class="test-page">
    <h1>OSS简单测试</h1>

    <div class="test-section">
      <h2>步骤1: 检查配置</h2>
      <button @click="checkConfig">检查配置</button>
      <pre v-if="configInfo">{{ configInfo }}</pre>
    </div>

    <div class="test-section">
      <h2>步骤2: 测试连接</h2>
      <button @click="testSimpleUpload">测试上传小文本</button>
      <pre v-if="testResult">{{ testResult }}</pre>
    </div>

    <div class="test-section">
      <h2>步骤3: 手动测试</h2>
      <p>AccessKey ID (前10位): {{ keyIdPreview }}</p>
      <p>Secret长度: {{ secretLength }}</p>
      <p>Bucket: {{ bucket }}</p>
      <p>Region: {{ region }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import OSS from 'ali-oss'

const configInfo = ref('')
const testResult = ref('')

const keyIdPreview = ref('')
const secretLength = ref(0)
const bucket = ref('')
const region = ref('')

onMounted(() => {
  // 显示配置信息（不显示完整密钥）
  const keyId = import.meta.env.VITE_OSS_ACCESS_KEY_ID
  const secret = import.meta.env.VITE_OSS_ACCESS_KEY_SECRET

  keyIdPreview.value = keyId ? keyId.substring(0, 10) + '...' : '未配置'
  secretLength.value = secret ? secret.length : 0
  bucket.value = import.meta.env.VITE_OSS_BUCKET || '未配置'
  region.value = import.meta.env.VITE_OSS_REGION || '未配置'
})

function checkConfig() {
  const config = {
    hasKeyId: !!import.meta.env.VITE_OSS_ACCESS_KEY_ID,
    hasSecret: !!import.meta.env.VITE_OSS_ACCESS_KEY_SECRET,
    secretLength: import.meta.env.VITE_OSS_ACCESS_KEY_SECRET?.length,
    bucket: import.meta.env.VITE_OSS_BUCKET,
    region: import.meta.env.VITE_OSS_REGION,
    时间: new Date().toISOString()
  }

  configInfo.value = JSON.stringify(config, null, 2)
}

async function testSimpleUpload() {
  testResult.value = '开始测试...\n'

  try {
    // 创建新的客户端实例
    const client = new OSS({
      region: import.meta.env.VITE_OSS_REGION || 'oss-cn-shenzhen',
      accessKeyId: import.meta.env.VITE_OSS_ACCESS_KEY_ID,
      accessKeySecret: import.meta.env.VITE_OSS_ACCESS_KEY_SECRET,
      bucket: import.meta.env.VITE_OSS_BUCKET || 'smartyouth-docs-luoyinchong',
      secure: true
    })

    testResult.value += '客户端创建成功\n'

    // 创建测试内容
    const testContent = new Blob(['测试内容 ' + new Date().toISOString()], { type: 'text/plain' })
    const fileName = `test/simple_test_${Date.now()}.txt`

    testResult.value += `准备上传文件: ${fileName}\n`

    // 尝试上传
    const result = await client.put(fileName, testContent)

    testResult.value += '上传成功！\n'
    testResult.value += `结果: ${JSON.stringify(result, null, 2)}\n`

    // 尝试删除测试文件
    await client.delete(fileName)
    testResult.value += '测试文件已删除\n'

  } catch (error) {
    testResult.value += `错误: ${error.message}\n`
    testResult.value += `错误代码: ${error.code}\n`
    testResult.value += `详细信息: ${error.toString()}\n`

    // 特殊错误处理
    if (error.code === 'SignatureDoesNotMatch') {
      testResult.value += '\n可能的原因:\n'
      testResult.value += '1. AccessKey Secret有误\n'
      testResult.value += '2. 系统时间不同步\n'
      testResult.value += '3. Region或Bucket配置错误\n'
    }
  }
}
</script>

<style scoped>
.test-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  background: #1a1a1a;
  color: white;
  min-height: 100vh;
}

h1 {
  color: #3b82f6;
  margin-bottom: 30px;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

h2 {
  color: #93c5fd;
  margin-bottom: 15px;
  font-size: 18px;
}

button {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #2563eb;
}

pre {
  margin-top: 15px;
  padding: 15px;
  background: #0a0a0a;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.5;
}

p {
  margin: 10px 0;
  color: #e5e5e5;
}
</style>