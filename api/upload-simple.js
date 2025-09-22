/**
 * 简化版文档上传API - 用于测试
 */

// 内存中存储文档（仅用于演示）
let documents = [];

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

    if (!file_name || !content) {
      return res.status(400).json({ error: 'File name and content are required' });
    }

    // 生成文档ID
    const docId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // 简单的文档切片（每500字符一片）
    const chunkSize = 500;
    const chunks = [];

    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push({
        id: `${docId}_${i}`,
        doc_id: docId,
        content: content.substring(i, i + chunkSize),
        file_name: file_name,
        page: Math.floor(i / chunkSize) + 1,
        chunk_index: chunks.length
      });
    }

    // 存储文档信息
    const docInfo = {
      doc_id: docId,
      file_name: file_name,
      file_type: file_type || 'text',
      chunk_count: chunks.length,
      created_at: new Date().toISOString(),
      chunks: chunks
    };

    // 简单存储在全局变量（实际应存到数据库）
    global.documents = global.documents || [];
    global.documents.push(docInfo);

    res.status(200).json({
      success: true,
      doc_id: docId,
      file_name: file_name,
      chunks_created: chunks.length,
      summary: {
        total_characters: content.length,
        pages: chunks.length
      }
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