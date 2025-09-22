/**
 * 简化版文档管理API - 使用内存存储
 * 适用于Vercel部署
 */

// 使用全局变量存储文档（注意：这只是临时方案，重启会丢失）
// 实际生产环境应使用数据库
if (!global.documentStore) {
  global.documentStore = new Map();
}

if (!global.vectorStore) {
  global.vectorStore = new Map();
}

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// 获取文档列表
async function handleGet(req, res) {
  try {
    const documents = Array.from(global.documentStore.values());

    res.status(200).json({
      success: true,
      documents: documents,
      total: documents.length
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get documents'
    });
  }
}

// 添加文档
async function handlePost(req, res) {
  try {
    const { doc_id, file_name, content, chunks } = req.body;

    if (!doc_id || !file_name) {
      return res.status(400).json({ error: 'Document ID and file name are required' });
    }

    // 存储文档信息
    global.documentStore.set(doc_id, {
      doc_id,
      file_name,
      chunk_count: chunks ? chunks.length : 1,
      created_at: new Date().toISOString()
    });

    // 存储文档片段和向量
    if (chunks) {
      global.vectorStore.set(doc_id, chunks);
    }

    res.status(200).json({
      success: true,
      doc_id,
      message: 'Document stored successfully'
    });
  } catch (error) {
    console.error('Store document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store document'
    });
  }
}

// 删除文档
async function handleDelete(req, res) {
  try {
    const { doc_id } = req.body;

    if (!doc_id) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const deleted = global.documentStore.delete(doc_id);
    global.vectorStore.delete(doc_id);

    res.status(200).json({
      success: true,
      doc_id,
      deleted
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
}