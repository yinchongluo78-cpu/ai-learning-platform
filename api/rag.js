/**
 * 统一的RAG系统API - 整合所有功能到一个端点
 * 解决Vercel Hobby计划的12个函数限制
 */

import crypto from 'crypto';

// 初始化内存存储
if (!global.documentStore) {
  global.documentStore = new Map();
}

if (!global.vectorStore) {
  global.vectorStore = new Map();
}

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || 'sk-f5285c1c32504f1186cd1cb90fb88e75';
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/v1/chat/completions';

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 根据URL路径分发请求
  const { action } = req.query;

  try {
    switch (action) {
      case 'chat':
        return handleChat(req, res);
      case 'upload':
        return handleUpload(req, res);
      case 'search':
        return handleSearch(req, res);
      case 'documents':
        return handleDocuments(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 处理聊天请求
async function handleChat(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    messages,
    doc_ids = null,
    use_rag = false,
    top_k = 3,
    threshold = 0.75
  } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  let contextMessages = [...messages];
  let searchResults = null;

  // 如果启用RAG，执行文档检索
  if (use_rag && doc_ids && doc_ids.length > 0) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();

    if (lastUserMessage) {
      searchResults = performSearch(lastUserMessage.content, doc_ids, top_k, threshold);

      if (searchResults && searchResults.length > 0) {
        // 构建RAG上下文
        const ragContext = searchResults.map((result, index) => {
          const fileName = result.file_name || '未知文档';
          const page = result.page || 1;
          return `【参考${index + 1}】
来源：${fileName} - 第${page}页
相似度：${(result.similarity * 100).toFixed(1)}%
内容：${result.content}`;
        }).join('\n\n---\n\n');

        // 添加系统提示词
        const systemPrompt = {
          role: 'system',
          content: `你是一个基于知识库的智能助手。请严格基于以下提供的参考资料回答用户问题。

重要规则：
1. 只使用参考资料中的信息回答
2. 如果参考资料中没有相关信息，明确说明"资料中没有找到相关内容"
3. 回答时必须标注信息来源，格式：【文件名-页码】
4. 不要编造或推测资料中没有的内容

参考资料：
${ragContext}

请基于以上参考资料，准确回答用户的问题。`
        };

        contextMessages = contextMessages.filter(m => m.role !== 'system');
        contextMessages.unshift(systemPrompt);
      } else {
        // 没有找到相关内容
        return res.status(200).json({
          success: true,
          message: '资料中没有找到相关内容。请尝试换个问法，或者确认您要查询的内容是否在已上传的文档中。',
          no_results: true
        });
      }
    }
  }

  // 调用DeepSeek API
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: contextMessages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();

  return res.status(200).json({
    success: true,
    message: data.choices[0].message.content,
    search_results: searchResults,
    usage: data.usage
  });
}

// 处理文档上传
async function handleUpload(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file_name, content, file_type } = req.body;

  if (!file_name || !content) {
    return res.status(400).json({ error: 'File name and content are required' });
  }

  // 生成文档ID
  const docId = generateDocId(file_name);

  // 文档切片
  const chunks = chunkText(content, file_name, docId);

  // 存储文档
  global.documentStore.set(docId, {
    doc_id: docId,
    file_name: file_name,
    chunk_count: chunks.length,
    created_at: new Date().toISOString()
  });

  global.vectorStore.set(docId, chunks);

  return res.status(200).json({
    success: true,
    doc_id: docId,
    file_name: file_name,
    chunks_created: chunks.length
  });
}

// 处理搜索请求
async function handleSearch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    query,
    top_k = 3,
    threshold = 0.75,
    doc_ids = null
  } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const results = performSearch(query, doc_ids, top_k, threshold);

  return res.status(200).json({
    success: true,
    query: query,
    results: results,
    total: results.length
  });
}

// 处理文档管理
async function handleDocuments(req, res) {
  if (req.method === 'GET') {
    const documents = Array.from(global.documentStore.values());
    return res.status(200).json({
      success: true,
      documents: documents,
      total: documents.length
    });
  }

  if (req.method === 'DELETE') {
    const { doc_id } = req.body;
    if (!doc_id) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    global.documentStore.delete(doc_id);
    global.vectorStore.delete(doc_id);

    return res.status(200).json({
      success: true,
      doc_id: doc_id,
      deleted: true
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// 执行搜索
function performSearch(query, doc_ids, top_k, threshold) {
  const cleanQuery = query.trim().toLowerCase();
  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 1);
  const searchResults = [];

  for (const [docId, chunks] of global.vectorStore.entries()) {
    if (doc_ids && !doc_ids.includes(docId)) continue;

    for (const chunk of chunks) {
      const chunkContent = chunk.content.toLowerCase();
      let matchScore = 0;
      let matchedWords = 0;

      for (const word of queryWords) {
        if (chunkContent.includes(word)) {
          const occurrences = (chunkContent.match(new RegExp(word, 'g')) || []).length;
          matchScore += occurrences * (1 / queryWords.length);
          matchedWords++;
        }
      }

      const similarity = matchedWords > 0 ?
        (matchScore / queryWords.length) * (matchedWords / queryWords.length) : 0;

      if (similarity >= threshold) {
        searchResults.push({
          content: chunk.content,
          similarity: similarity,
          file_name: chunk.metadata?.file_name || 'unknown',
          page: chunk.metadata?.page || 1,
          doc_id: chunk.metadata?.doc_id,
          chunk_index: chunk.metadata?.chunk_index
        });
      }
    }
  }

  searchResults.sort((a, b) => b.similarity - a.similarity);
  return searchResults.slice(0, top_k);
}

// 生成文档ID
function generateDocId(fileName) {
  const hash = crypto.createHash('md5');
  hash.update(fileName + Date.now().toString());
  return hash.digest('hex').substring(0, 16);
}

// 文本切片
function chunkText(text, fileName, docId) {
  const CHUNK_SIZE = 500;
  const OVERLAP = 50;
  const chunks = [];

  text = text.replace(/\s+/g, ' ').trim();

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunkContent = text.substring(start, end);

    chunks.push({
      content: chunkContent,
      metadata: {
        doc_id: docId,
        file_name: fileName,
        chunk_index: chunkIndex++,
        page: Math.floor(start / 3000) + 1,
        start_pos: start,
        end_pos: end
      }
    });

    start = end - OVERLAP;
    if (start >= text.length - OVERLAP) break;
  }

  return chunks;
}