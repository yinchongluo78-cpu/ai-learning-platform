/**
 * 文本向量化服务
 * 使用 DeepSeek API 进行文本嵌入
 */

const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || 'sk-f5285c1c32504f1186cd1cb90fb88e75';
const DEEPSEEK_EMBEDDING_URL = 'https://api.deepseek.com/v1/embeddings';

/**
 * 获取文本的向量表示
 * @param {string} text - 要向量化的文本
 * @returns {Promise<number[]>} 向量数组
 */
export async function getEmbedding(text) {
  try {
    const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('获取向量失败:', error);
    // 返回一个默认的1536维零向量作为降级方案
    return new Array(1536).fill(0);
  }
}

/**
 * 批量获取文本向量
 * @param {string[]} texts - 文本数组
 * @returns {Promise<number[][]>} 向量数组
 */
export async function getBatchEmbeddings(texts) {
  try {
    const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        input: texts,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error('批量获取向量失败:', error);
    // 返回默认向量数组
    return texts.map(() => new Array(1536).fill(0));
  }
}

/**
 * 计算两个向量的余弦相似度
 * @param {number[]} vec1 - 第一个向量
 * @param {number[]} vec2 - 第二个向量
 * @returns {number} 相似度（0-1之间）
 */
export function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('向量维度不匹配');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}