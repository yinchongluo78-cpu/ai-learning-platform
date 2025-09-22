/**
 * 简化版聊天API - 支持RAG
 */

const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || 'sk-f5285c1c32504f1186cd1cb90fb88e75';
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/v1/chat/completions';

// 简单的相似度计算（基于关键词匹配）
function calculateSimilarity(query, text) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();
  let matches = 0;

  queryWords.forEach(word => {
    if (textLower.includes(word)) {
      matches++;
    }
  });

  return matches / queryWords.length;
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
      messages,
      doc_ids = null,
      use_rag = false,
      top_k = 3,
      threshold = 0.75
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found' });
    }

    let contextMessages = [...messages];
    let searchResults = null;

    // 如果启用RAG，执行简单的文档搜索
    if (use_rag && doc_ids && doc_ids.length > 0) {
      global.documents = global.documents || [];

      // 查找相关文档
      const relevantDocs = global.documents.filter(doc => doc_ids.includes(doc.doc_id));

      if (relevantDocs.length === 0) {
        return res.status(200).json({
          success: true,
          message: '资料中没有找到相关内容。请先上传文档，或者确认您选择了正确的文档。',
          no_results: true
        });
      }

      // 搜索相关片段
      const allChunks = [];
      relevantDocs.forEach(doc => {
        if (doc.chunks) {
          doc.chunks.forEach(chunk => {
            const similarity = calculateSimilarity(lastUserMessage.content, chunk.content);
            if (similarity >= threshold) {
              allChunks.push({
                content: chunk.content,
                file_name: doc.file_name,
                page: chunk.page || 1,
                similarity: similarity
              });
            }
          });
        }
      });

      // 排序并取Top-K
      allChunks.sort((a, b) => b.similarity - a.similarity);
      searchResults = allChunks.slice(0, top_k);

      if (searchResults.length === 0) {
        return res.status(200).json({
          success: true,
          message: '资料中没有找到与您问题相关的内容。请尝试换个问法，或确认文档内容。',
          no_results: true
        });
      }

      // 构建RAG上下文
      let ragContext = '参考资料：\n\n';
      searchResults.forEach((result, index) => {
        ragContext += `【参考${index + 1}】\n`;
        ragContext += `来源：${result.file_name} - 第${result.page}页\n`;
        ragContext += `内容：${result.content}\n\n`;
      });

      const systemPrompt = {
        role: 'system',
        content: `你是一个基于知识库的智能助手。请严格基于以下提供的参考资料回答用户问题。

重要规则：
1. 只使用参考资料中的信息回答
2. 如果参考资料中没有相关信息，明确说明"资料中没有找到相关内容"
3. 回答时必须标注信息来源，格式：【文件名-页码】
4. 不要编造或推测资料中没有的内容

${ragContext}`
      };

      contextMessages = contextMessages.filter(m => m.role !== 'system');
      contextMessages.unshift(systemPrompt);
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
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json({
      success: true,
      message: data.choices[0].message.content,
      search_results: searchResults,
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat failed',
      message: error.message
    });
  }
}