/**
 * 简化版搜索API - 使用关键词匹配
 * 适用于Vercel部署
 */

// 初始化存储
if (!global.documentStore) {
  global.documentStore = new Map();
}

if (!global.vectorStore) {
  global.vectorStore = new Map();
}

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      query,
      top_k = 3,
      threshold = 0.5,
      doc_ids = null
    } = req.body;

    // 参数验证
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 清洗查询
    const cleanQuery = query.trim().toLowerCase();
    const queryWords = cleanQuery.split(/\s+/);

    // 搜索所有相关片段
    const searchResults = [];

    // 遍历所有文档
    for (const [docId, chunks] of global.vectorStore.entries()) {
      // 如果指定了文档ID，只搜索指定文档
      if (doc_ids && !doc_ids.includes(docId)) {
        continue;
      }

      // 搜索每个片段
      for (const chunk of chunks) {
        const chunkContent = chunk.content.toLowerCase();

        // 计算简单的相似度分数
        let matchScore = 0;
        let matchedWords = 0;

        for (const word of queryWords) {
          if (word.length < 2) continue; // 忽略太短的词

          if (chunkContent.includes(word)) {
            // 计算词出现的次数
            const occurrences = (chunkContent.match(new RegExp(word, 'g')) || []).length;
            matchScore += occurrences * (1 / queryWords.length);
            matchedWords++;
          }
        }

        // 计算相似度（0-1之间）
        const similarity = matchedWords > 0 ?
          (matchScore / queryWords.length) * (matchedWords / queryWords.length) : 0;

        // 如果相似度高于阈值，添加到结果
        if (similarity >= threshold) {
          searchResults.push({
            content: chunk.content,
            similarity: similarity,
            metadata: chunk.metadata
          });
        }
      }
    }

    // 按相似度排序并返回top_k
    searchResults.sort((a, b) => b.similarity - a.similarity);
    const topResults = searchResults.slice(0, top_k);

    // 格式化返回结果
    const formattedResults = topResults.map(result => ({
      content: result.content,
      file_name: result.metadata?.file_name || 'unknown',
      page: result.metadata?.page || 1,
      similarity: result.similarity,
      doc_id: result.metadata?.doc_id,
      chunk_index: result.metadata?.chunk_index
    }));

    res.status(200).json({
      success: true,
      query: query,
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
}