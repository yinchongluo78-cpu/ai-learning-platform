/**
 * 简化版聊天API - 适用于Vercel部署
 * 支持RAG检索增强
 */

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || 'sk-f5285c1c32504f1186cd1cb90fb88e75';
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/v1/chat/completions';

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

    // 参数验证
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    let contextMessages = [...messages];
    let searchResults = null;

    // 如果启用RAG，执行文档检索
    if (use_rag && doc_ids && doc_ids.length > 0) {
      try {
        // 获取最新的用户消息
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();

        if (lastUserMessage) {
          // 调用搜索API
          const searchResponse = await fetch(
            process.env.VERCEL_URL ?
              `https://${process.env.VERCEL_URL}/api/search-simple` :
              'http://localhost:3000/api/search-simple',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: lastUserMessage.content,
                top_k: top_k,
                threshold: threshold,
                doc_ids: doc_ids
              })
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            searchResults = searchData.results;

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
      } catch (error) {
        console.error('RAG search error:', error);
        // 检索失败，继续使用普通聊天
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
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();

    // 返回响应
    res.status(200).json({
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage,
      rag_status: use_rag ? 'initializing' : 'disabled'
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