import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// 加载环境变量
dotenv.config({ path: '.env.server' });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
});

// Supabase客户端（使用service role key）
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// DeepSeek配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';

// CORS配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制100个请求
  message: '请求过于频繁，请稍后再试'
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 限制10个文档上传
  message: '上传文档过于频繁，请稍后再试'
});

// 应用限流
app.use('/api/', limiter);
app.use('/api/documents/upload', uploadLimiter);

// 获取文本的向量表示
async function getEmbedding(text) {
  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/embeddings`, {
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
    console.error('获取embedding失败:', error);
    throw error;
  }
}

// 文本切片函数
function splitText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text];

  let currentChunk = '';
  let currentLength = 0;

  for (const sentence of sentences) {
    if (currentLength + sentence.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // 保留重叠部分
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + sentence;
      currentLength = overlapText.length + sentence.length;
    } else {
      currentChunk += sentence;
      currentLength += sentence.length;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// 清理文本（去除页眉页脚等噪音）
function cleanText(text) {
  // 去除多余空白
  text = text.replace(/\s+/g, ' ').trim();

  // 去除页码模式
  text = text.replace(/第\s*\d+\s*页/g, '');
  text = text.replace(/\d+\s*\/\s*\d+/g, '');

  // 去除常见页眉页脚
  text = text.replace(/^.*版权所有.*$/gm, '');
  text = text.replace(/^.*机密.*$/gm, '');

  return text;
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 上传文档并处理
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, knowledgeBaseId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 简单的文本提取（生产环境应使用专业的文档解析库）
    let content = '';
    if (file.mimetype === 'text/plain') {
      content = file.buffer.toString('utf-8');
    } else {
      // 对于PDF等格式，这里需要使用专门的解析库
      // 暂时返回占位内容
      return res.status(400).json({
        error: '暂不支持该文件格式，请上传TXT文件'
      });
    }

    // 清理文本
    content = cleanText(content);

    // 创建文档记录
    const documentId = uuidv4();
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        knowledge_base_id: knowledgeBaseId,
        filename: file.originalname,
        content: content,
        file_size: file.size,
        mime_type: file.mimetype,
        created_at: new Date().toISOString()
      });

    if (docError) throw docError;

    // 切片并向量化
    const chunks = splitText(content);
    const chunkRecords = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk);

      chunkRecords.push({
        id: uuidv4(),
        document_id: documentId,
        content: chunk,
        embedding: embedding,
        chunk_index: i,
        metadata: {
          filename: file.originalname,
          page: Math.floor(i * 500 / 1000) + 1 // 估算页码
        }
      });

      // 避免请求过快
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 批量插入切片
    const { error: chunkError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (chunkError) throw chunkError;

    res.json({
      success: true,
      documentId,
      filename: file.originalname,
      chunkCount: chunks.length
    });

  } catch (error) {
    console.error('文档上传失败:', error);
    res.status(500).json({
      error: '文档处理失败',
      details: error.message
    });
  }
});

// 检索相关文档
app.post('/api/search', async (req, res) => {
  try {
    const {
      query,
      knowledgeBaseId,
      topK = 3,
      threshold = 0.75,
      filters = {}
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: '查询不能为空' });
    }

    // 获取查询的向量表示
    const queryEmbedding = await getEmbedding(query);

    // 使用pgvector进行相似度搜索
    const { data, error } = await supabase.rpc('search_documents', {
      query_embedding: queryEmbedding,
      knowledge_base_id: knowledgeBaseId,
      match_threshold: threshold,
      match_count: topK,
      filter_metadata: filters
    });

    if (error) throw error;

    // 格式化结果
    const results = data.map(item => ({
      content: item.content,
      similarity: item.similarity,
      metadata: item.metadata,
      documentId: item.document_id,
      chunkId: item.id
    }));

    res.json({
      success: true,
      results,
      query
    });

  } catch (error) {
    console.error('检索失败:', error);
    res.status(500).json({
      error: '检索失败',
      details: error.message
    });
  }
});

// 带知识库的聊天
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      knowledgeBaseId,
      useKnowledgeBase = false,
      history = []
    } = req.body;

    let context = '';
    let references = [];

    // 如果启用知识库，先进行检索
    if (useKnowledgeBase && knowledgeBaseId) {
      const searchResponse = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: message,
          knowledgeBaseId,
          topK: 3,
          threshold: 0.75
        })
      });

      const searchData = await searchResponse.json();

      if (searchData.results && searchData.results.length > 0) {
        // 构建上下文
        context = searchData.results.map((r, i) =>
          `[参考${i + 1}] ${r.content}`
        ).join('\n\n');

        // 收集引用
        references = searchData.results.map(r => ({
          filename: r.metadata.filename,
          page: r.metadata.page,
          content: r.content.substring(0, 100) + '...'
        }));
      }
    }

    // 构建系统提示词
    let systemPrompt = '你是一个智能助手。';
    if (useKnowledgeBase && context) {
      systemPrompt = `你是一个基于知识库的智能助手。请根据以下参考资料回答用户问题。
如果参考资料中没有相关信息，请明确说明"资料中没有找到相关内容"。
回答时请标注信息来源，格式：【文件名-页码】。

参考资料：
${context}`;
    }

    // 调用DeepSeek API
    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({
      success: true,
      reply,
      references: useKnowledgeBase ? references : [],
      useKnowledgeBase
    });

  } catch (error) {
    console.error('聊天失败:', error);
    res.status(500).json({
      error: '聊天失败',
      details: error.message
    });
  }
});

// 获取知识库列表
app.get('/api/knowledge-bases/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      knowledgeBases: data
    });

  } catch (error) {
    console.error('获取知识库失败:', error);
    res.status(500).json({
      error: '获取知识库失败',
      details: error.message
    });
  }
});

// 创建知识库
app.post('/api/knowledge-bases', async (req, res) => {
  try {
    const { userId, name, description } = req.body;

    const { data, error } = await supabase
      .from('knowledge_bases')
      .insert({
        id: uuidv4(),
        user_id: userId,
        name,
        description,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      knowledgeBase: data
    });

  } catch (error) {
    console.error('创建知识库失败:', error);
    res.status(500).json({
      error: '创建知识库失败',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`RAG API服务器运行在端口 ${PORT}`);
});