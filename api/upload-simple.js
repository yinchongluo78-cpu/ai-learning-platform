/**
 * 简化版文档上传API - 使用内存存储和简单文本匹配
 * 适用于Vercel部署
 */

const crypto = require('crypto');

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
    const { file_name, content, file_type } = req.body;

    // 参数验证
    if (!file_name || !content) {
      return res.status(400).json({ error: 'File name and content are required' });
    }

    // 生成文档ID
    const docId = generateDocId(file_name);

    // 简单的文档切片（每500字符一片）
    const chunks = chunkText(content, file_name, docId);

    // 存储文档信息
    global.documentStore.set(docId, {
      doc_id: docId,
      file_name: file_name,
      chunk_count: chunks.length,
      created_at: new Date().toISOString()
    });

    // 存储文档片段
    global.vectorStore.set(docId, chunks);

    // 返回处理结果
    res.status(200).json({
      success: true,
      doc_id: docId,
      file_name: file_name,
      chunks_created: chunks.length,
      message: '文档上传成功'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
}

// 生成文档ID
function generateDocId(fileName) {
  const hash = crypto.createHash('md5');
  hash.update(fileName + Date.now().toString());
  return hash.digest('hex').substring(0, 16);
}

// 简单的文本切片
function chunkText(text, fileName, docId) {
  const CHUNK_SIZE = 500; // 每片500字符
  const OVERLAP = 50; // 重叠50字符
  const chunks = [];

  // 清理文本
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
        page: Math.floor(start / 3000) + 1, // 估算页码
        start_pos: start,
        end_pos: end
      }
    });

    // 下一片从重叠位置开始
    start = end - OVERLAP;
    if (start >= text.length - OVERLAP) break;
  }

  return chunks;
}