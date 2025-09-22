/**
 * 向量存储服务 - 使用LeanCloud存储向量数据
 */

import AV from 'leancloud-storage';
import { getEmbedding, cosineSimilarity } from './embeddings.js';

// 初始化LeanCloud
const APP_ID = process.env.VITE_LEANCLOUD_APP_ID || 'eeILMchz3Jwga1ITnV9UcZmv-gzGzoHsz';
const APP_KEY = process.env.VITE_LEANCLOUD_APP_KEY || 'LP9Gj8NcalGomYEef7TRft4G';
const SERVER_URL = process.env.VITE_LEANCLOUD_SERVER_URL || 'https://eeilmchz.lc-cn-n1-shared.com';

AV.init({
  appId: APP_ID,
  appKey: APP_KEY,
  serverURL: SERVER_URL
});

// 定义向量存储类
const VectorChunk = AV.Object.extend('VectorChunk');

/**
 * 存储文档片段和向量
 * @param {Object} chunk - 文档片段
 * @param {number[]} embedding - 向量
 * @returns {Promise<string>} 存储的ID
 */
export async function storeChunk(chunk, embedding) {
  const vectorChunk = new VectorChunk();

  // 存储内容和元数据
  vectorChunk.set('content', chunk.content);
  vectorChunk.set('doc_id', chunk.metadata.doc_id);
  vectorChunk.set('file_name', chunk.metadata.file_name);
  vectorChunk.set('page', chunk.metadata.page || 1);
  vectorChunk.set('chunk_index', chunk.metadata.chunk_index);
  vectorChunk.set('type', chunk.metadata.type);

  // 将向量压缩存储（LeanCloud对大数组有限制）
  // 转换为Base64字符串以节省空间
  const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
  vectorChunk.set('embedding', embeddingBuffer.toString('base64'));

  // 额外存储一些统计信息
  vectorChunk.set('tokens', chunk.metadata.tokens);
  vectorChunk.set('created_at', chunk.metadata.created_at);

  const saved = await vectorChunk.save();
  return saved.id;
}

/**
 * 批量存储文档片段
 * @param {Array} chunks - 文档片段数组
 * @param {Array} embeddings - 向量数组
 * @returns {Promise<Array>} 存储的ID数组
 */
export async function storeChunks(chunks, embeddings) {
  const objects = [];

  for (let i = 0; i < chunks.length; i++) {
    const vectorChunk = new VectorChunk();
    const chunk = chunks[i];
    const embedding = embeddings[i];

    vectorChunk.set('content', chunk.content);
    vectorChunk.set('doc_id', chunk.metadata.doc_id);
    vectorChunk.set('file_name', chunk.metadata.file_name);
    vectorChunk.set('page', chunk.metadata.page || 1);
    vectorChunk.set('chunk_index', chunk.metadata.chunk_index);
    vectorChunk.set('type', chunk.metadata.type);

    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
    vectorChunk.set('embedding', embeddingBuffer.toString('base64'));

    vectorChunk.set('tokens', chunk.metadata.tokens);
    vectorChunk.set('created_at', chunk.metadata.created_at);

    objects.push(vectorChunk);
  }

  const saved = await AV.Object.saveAll(objects);
  return saved.map(obj => obj.id);
}

/**
 * 向量搜索
 * @param {string} query - 查询文本
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function vectorSearch(query, options = {}) {
  const {
    topK = 3,
    threshold = 0.75,
    docIds = null,
    includeMetadata = true
  } = options;

  // 获取查询向量
  const queryEmbedding = await getEmbedding(query);

  // 构建查询
  const avQuery = new AV.Query('VectorChunk');

  // 如果指定了文档ID，添加过滤
  if (docIds && docIds.length > 0) {
    avQuery.containedIn('doc_id', docIds);
  }

  // 获取候选结果（由于LeanCloud不支持向量索引，需要获取更多候选）
  avQuery.limit(100); // 获取更多候选以进行客户端排序
  const candidates = await avQuery.find();

  // 计算相似度并排序
  const results = [];
  for (const candidate of candidates) {
    const embeddingBase64 = candidate.get('embedding');
    const embeddingBuffer = Buffer.from(embeddingBase64, 'base64');
    const embedding = Array.from(new Float32Array(embeddingBuffer.buffer));

    const similarity = cosineSimilarity(queryEmbedding, embedding);

    if (similarity >= threshold) {
      results.push({
        id: candidate.id,
        content: candidate.get('content'),
        similarity: similarity,
        metadata: includeMetadata ? {
          doc_id: candidate.get('doc_id'),
          file_name: candidate.get('file_name'),
          page: candidate.get('page'),
          chunk_index: candidate.get('chunk_index'),
          type: candidate.get('type'),
          tokens: candidate.get('tokens')
        } : null
      });
    }
  }

  // 按相似度排序并返回topK
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * 混合搜索（向量 + 关键词）
 * @param {string} query - 查询文本
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function hybridSearch(query, options = {}) {
  const {
    topK = 3,
    threshold = 0.75,
    docIds = null,
    keywords = [],
    includeMetadata = true
  } = options;

  // 执行向量搜索
  const vectorResults = await vectorSearch(query, {
    topK: topK * 2, // 获取更多结果用于融合
    threshold: threshold * 0.9, // 稍微降低阈值
    docIds,
    includeMetadata
  });

  // 如果有关键词，进行关键词过滤和加权
  if (keywords.length > 0) {
    const keywordBoost = 0.1; // 关键词匹配的权重提升

    vectorResults.forEach(result => {
      let keywordScore = 0;
      const contentLower = result.content.toLowerCase();

      for (const keyword of keywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          keywordScore += keywordBoost;
        }
      }

      // 融合分数
      result.similarity = result.similarity * (1 + keywordScore);
    });

    // 重新排序
    vectorResults.sort((a, b) => b.similarity - a.similarity);
  }

  // 过滤低于阈值的结果
  const finalResults = vectorResults.filter(r => r.similarity >= threshold);

  return finalResults.slice(0, topK);
}

/**
 * 删除文档的所有片段
 * @param {string} docId - 文档ID
 * @returns {Promise<number>} 删除的片段数
 */
export async function deleteDocumentChunks(docId) {
  const query = new AV.Query('VectorChunk');
  query.equalTo('doc_id', docId);

  const chunks = await query.find();
  await AV.Object.destroyAll(chunks);

  return chunks.length;
}

/**
 * 获取文档信息
 * @param {string} docId - 文档ID
 * @returns {Promise<Object>} 文档信息
 */
export async function getDocumentInfo(docId) {
  const query = new AV.Query('VectorChunk');
  query.equalTo('doc_id', docId);
  query.limit(1);

  const chunk = await query.first();
  if (!chunk) {
    return null;
  }

  // 获取文档的总片段数
  const countQuery = new AV.Query('VectorChunk');
  countQuery.equalTo('doc_id', docId);
  const totalChunks = await countQuery.count();

  return {
    doc_id: docId,
    file_name: chunk.get('file_name'),
    type: chunk.get('type'),
    total_chunks: totalChunks,
    created_at: chunk.get('created_at')
  };
}

/**
 * 列出所有文档
 * @returns {Promise<Array>} 文档列表
 */
export async function listDocuments() {
  const query = new AV.Query('VectorChunk');
  query.select(['doc_id', 'file_name', 'type', 'created_at']);
  query.limit(1000);

  const chunks = await query.find();

  // 去重并整理文档信息
  const docMap = new Map();

  for (const chunk of chunks) {
    const docId = chunk.get('doc_id');
    if (!docMap.has(docId)) {
      docMap.set(docId, {
        doc_id: docId,
        file_name: chunk.get('file_name'),
        type: chunk.get('type'),
        created_at: chunk.get('created_at'),
        chunk_count: 1
      });
    } else {
      docMap.get(docId).chunk_count++;
    }
  }

  return Array.from(docMap.values());
}