/**
 * 文档管理API - Vercel Serverless Function
 */

// 模拟向量存储（实际应该使用LeanCloud）
const mockDocuments = [];

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
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * 获取文档列表
 */
async function handleGet(req, res) {
  try {
    // 暂时返回模拟数据
    const documents = mockDocuments;

    res.status(200).json({
      success: true,
      documents: documents,
      total: documents.length
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get documents',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 删除文档
 */
async function handleDelete(req, res) {
  try {
    const { doc_id } = req.body;

    if (!doc_id) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // 模拟删除
    const index = mockDocuments.findIndex(d => d.doc_id === doc_id);
    if (index > -1) {
      mockDocuments.splice(index, 1);
    }
    const deletedCount = index > -1 ? 1 : 0;

    res.status(200).json({
      success: true,
      doc_id: doc_id,
      chunks_deleted: deletedCount
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}