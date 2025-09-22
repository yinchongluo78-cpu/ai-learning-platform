/**
 * 测试文档上传和读取功能
 */

import fs from 'fs';
import path from 'path';

// 模拟测试数据
const testDocuments = [
  {
    name: 'test-ai.txt',
    content: `人工智能基础知识

第一章：什么是人工智能
人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。

第二章：机器学习
机器学习是人工智能的核心，是使计算机具有智能的根本途径。机器学习是一门多学科交叉专业，涵盖概率论、统计学、逼近论、凸分析、算法复杂度理论等多门学科。

第三章：深度学习
深度学习是机器学习的一个分支。深度学习的概念源于人工神经网络的研究。含多隐层的多层感知器就是一种深度学习结构。

第四章：应用领域
1. 计算机视觉
2. 自然语言处理
3. 语音识别
4. 推荐系统
5. 自动驾驶`
  },
  {
    name: 'test-programming.md',
    content: `# Python编程指南

## 基础语法

### 变量和数据类型
Python是动态类型语言，变量不需要声明类型。

\`\`\`python
# 数字
num = 100
float_num = 3.14

# 字符串
name = "Python"

# 列表
my_list = [1, 2, 3, 4, 5]

# 字典
my_dict = {"key": "value"}
\`\`\`

### 控制流
- if条件语句
- for循环
- while循环

### 函数定义
\`\`\`python
def hello_world():
    print("Hello, World!")
\`\`\`

## 高级特性
- 装饰器
- 生成器
- 上下文管理器
- 元类编程`
  }
];

// 测试文档处理
async function testDocumentProcessing() {
  console.log('🧪 开始测试文档处理功能...\n');

  for (const doc of testDocuments) {
    console.log(`📄 处理文档: ${doc.name}`);
    console.log(`   内容长度: ${doc.content.length} 字符`);

    // 模拟切片
    const chunks = chunkDocument(doc.content);
    console.log(`   切片数量: ${chunks.length}`);

    // 显示前两个切片
    chunks.slice(0, 2).forEach((chunk, i) => {
      console.log(`   片段${i + 1}: ${chunk.content.substring(0, 50)}...`);
    });

    console.log('');
  }
}

// 简单的文档切片函数
function chunkDocument(text, maxChunkSize = 400) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++
        });
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // 添加最后一个片段
  if (currentChunk) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex
    });
  }

  return chunks;
}

// 测试向量化（模拟）
async function testEmbedding() {
  console.log('🔢 测试向量化功能...\n');

  const testText = "人工智能是计算机科学的一个重要分支";
  console.log(`   测试文本: "${testText}"`);

  // 模拟生成向量
  const embedding = generateMockEmbedding(testText);
  console.log(`   向量维度: ${embedding.length}`);
  console.log(`   向量前5维: [${embedding.slice(0, 5).map(n => n.toFixed(3)).join(', ')}...]`);
  console.log('');
}

// 生成模拟向量
function generateMockEmbedding(text, dimensions = 1536) {
  const vector = [];
  for (let i = 0; i < dimensions; i++) {
    // 使用文本长度作为种子生成伪随机数
    const seed = text.length + i;
    vector.push(Math.sin(seed) * Math.cos(seed * 0.1));
  }
  return vector;
}

// 测试相似度计算
function testSimilarity() {
  console.log('📊 测试相似度计算...\n');

  const texts = [
    "人工智能是未来的发展方向",
    "AI技术正在改变世界",
    "Python是一门编程语言",
    "机器学习需要大量数据"
  ];

  const embeddings = texts.map(t => generateMockEmbedding(t));

  console.log('   相似度矩阵:');
  for (let i = 0; i < texts.length; i++) {
    const similarities = [];
    for (let j = 0; j < texts.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      similarities.push(sim.toFixed(2));
    }
    console.log(`   "${texts[i].substring(0, 10)}...": [${similarities.join(', ')}]`);
  }
  console.log('');
}

// 计算余弦相似度
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// 创建测试文件
function createTestFiles() {
  console.log('📁 创建测试文件...\n');

  const testDir = path.join(process.cwd(), 'test-documents');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  for (const doc of testDocuments) {
    const filePath = path.join(testDir, doc.name);
    fs.writeFileSync(filePath, doc.content);
    console.log(`   ✅ 创建: ${doc.name}`);
  }

  console.log(`\n   测试文件已保存到: ${testDir}\n`);
}

// 执行所有测试
async function runAllTests() {
  console.log('========================================');
  console.log('     RAG系统文档处理测试');
  console.log('========================================\n');

  // 创建测试文件
  createTestFiles();

  // 测试文档处理
  await testDocumentProcessing();

  // 测试向量化
  await testEmbedding();

  // 测试相似度
  testSimilarity();

  console.log('========================================');
  console.log('✅ 所有测试完成！');
  console.log('========================================\n');

  console.log('💡 建议：');
  console.log('1. 使用test-documents目录中的文件测试上传功能');
  console.log('2. 检查LeanCloud控制台确认数据是否正确存储');
  console.log('3. 测试检索功能是否能找到相关内容');
}

// 运行测试
runAllTests().catch(console.error);