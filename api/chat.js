/**
 * 聊天API - 支持RAG增强的对话
 */

import { vectorSearch } from './vector-store.js';

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || 'sk-f5285c1c32504f1186cd1cb90fb88e75';
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 处理聊天请求
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
      messages,
      doc_ids = null,
      use_rag = false,
      top_k = 3,
      threshold = 0.75
    } = req.body;

    // 参数验证
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // 获取最新的用户消息
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found' });
    }

    let contextMessages = [...messages];
    let searchResults = null;

    // 如果指定了文档ID，执行RAG检索
    if (use_rag && doc_ids && doc_ids.length > 0) {
      try {
        // 执行向量检索
        searchResults = await vectorSearch(lastUserMessage.content, {
          topK: top_k,
          threshold: threshold,
          docIds: doc_ids,
          includeMetadata: true
        });

        if (searchResults.length === 0) {
          // 没有找到相关内容，返回提示
          return res.status(200).json({
            success: true,
            message: '资料中没有找到相关内容。请尝试换个问法，或者确认您要查询的内容是否在已上传的文档中。',
            no_results: true
          });
        }

        // 构建增强的上下文
        const ragContext = buildRAGContext(searchResults);

        // 修改系统提示词
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

        // 替换或添加系统提示词
        contextMessages = contextMessages.filter(m => m.role !== 'system');
        contextMessages.unshift(systemPrompt);

      } catch (error) {
        console.error('RAG search error:', error);
        // 检索失败，降级为普通聊天
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

    // 返回响应
    res.status(200).json({
      success: true,
      message: data.choices[0].message.content,
      search_results: searchResults ? searchResults.map(r => ({
        content: r.content.substring(0, 200) + '...',
        file_name: r.metadata?.file_name,
        page: r.metadata?.page,
        similarity: r.similarity
      })) : null,
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 构建RAG上下文
 * @param {Array} searchResults - 搜索结果
 * @returns {string} 格式化的上下文
 */
function buildRAGContext(searchResults) {
  let context = '';

  searchResults.forEach((result, index) => {
    const fileName = result.metadata?.file_name || '未知文档';
    const page = result.metadata?.page || 1;

    context += `
【参考${index + 1}】
来源：${fileName} - 第${page}页
相似度：${(result.similarity * 100).toFixed(1)}%
内容：
${result.content}

---`;
  });

  return context;
}

/**
 * 流式响应处理器（用于SSE）
 */
export async function streamHandler(req, res) {
  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  try {
    const {
      messages,
      doc_ids = null,
      use_rag = false,
      top_k = 3,
      threshold = 0.75
    } = req.body;

    let contextMessages = [...messages];
    let searchResults = null;

    // RAG检索逻辑（同上）
    if (use_rag && doc_ids && doc_ids.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();

      searchResults = await vectorSearch(lastUserMessage.content, {
        topK: top_k,
        threshold: threshold,
        docIds: doc_ids,
        includeMetadata: true
      });

      if (searchResults.length === 0) {
        res.write(`data: ${JSON.stringify({
          type: 'no_results',
          content: '资料中没有找到相关内容'
        })}\n\n`);
        res.end();
        return;
      }

      const ragContext = buildRAGContext(searchResults);
      const systemPrompt = {
        role: 'system',
        content: `你是一个基于知识库的智能助手。请严格基于提供的参考资料回答。

参考资料：
${ragContext}`
      };

      contextMessages = contextMessages.filter(m => m.role !== 'system');
      contextMessages.unshift(systemPrompt);
    }

    // 调用DeepSeek流式API
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
        stream: true
      })
    });

    // 转发流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(`data: ${chunk}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}