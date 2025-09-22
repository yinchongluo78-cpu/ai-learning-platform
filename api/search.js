/**
 * 搜索API - 处理向量检索请求
 */

import { vectorSearch, hybridSearch } from './vector-store.js';

/**
 * 处理搜索请求
 * @param {Request} req - 请求对象
 * @param {Response} res - 响应对象
 */
export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      query,
      top_k = 3,
      threshold = 0.75,
      doc_ids = null,
      keywords = [],
      use_hybrid = false
    } = req.body;

    // 参数验证
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (query.length > 1000) {
      return res.status(400).json({ error: 'Query too long' });
    }

    // 清洗输入
    const cleanQuery = query.trim().replace(/[<>]/g, '');

    // 执行搜索
    let results;
    if (use_hybrid && keywords.length > 0) {
      // 混合搜索
      results = await hybridSearch(cleanQuery, {
        topK: Math.min(top_k, 10), // 限制最大返回数
        threshold: Math.max(threshold, 0.5), // 确保阈值合理
        docIds: doc_ids,
        keywords: keywords.slice(0, 5), // 限制关键词数量
        includeMetadata: true
      });
    } else {
      // 纯向量搜索
      results = await vectorSearch(cleanQuery, {
        topK: Math.min(top_k, 10),
        threshold: Math.max(threshold, 0.5),
        docIds: doc_ids,
        includeMetadata: true
      });
    }

    // 格式化返回结果
    const formattedResults = results.map(result => ({
      content: result.content,
      file_name: result.metadata?.file_name || 'unknown',
      page: result.metadata?.page || 1,
      similarity: result.similarity,
      doc_id: result.metadata?.doc_id,
      chunk_index: result.metadata?.chunk_index
    }));

    res.status(200).json({
      success: true,
      query: cleanQuery,
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 限流中间件（简单实现）
 */
const requestCounts = new Map();
const RATE_LIMIT = 30; // 每分钟最多30次请求
const WINDOW = 60000; // 1分钟窗口

export function rateLimiter(req, res, next) {
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 1, windowStart: now });
  } else {
    const clientData = requestCounts.get(clientId);

    // 检查是否在时间窗口内
    if (now - clientData.windowStart < WINDOW) {
      clientData.count++;

      if (clientData.count > RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests' });
      }
    } else {
      // 重置窗口
      clientData.count = 1;
      clientData.windowStart = now;
    }
  }

  // 定期清理旧记录
  if (Math.random() < 0.01) {
    for (const [id, data] of requestCounts.entries()) {
      if (now - data.windowStart > WINDOW * 2) {
        requestCounts.delete(id);
      }
    }
  }

  if (next) next();
}