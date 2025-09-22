/**
 * 简化版文档管理API
 */

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 获取全局文档存储
  global.documents = global.documents || [];

  if (req.method === 'GET') {
    // 返回文档列表（不包含chunks详情）
    const docList = global.documents.map(doc => ({
      doc_id: doc.doc_id,
      file_name: doc.file_name,
      file_type: doc.file_type,
      chunk_count: doc.chunk_count,
      created_at: doc.created_at
    }));

    return res.status(200).json({
      success: true,
      documents: docList,
      total: docList.length
    });
  }

  if (req.method === 'DELETE') {
    const { doc_id } = req.body;

    if (!doc_id) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const index = global.documents.findIndex(d => d.doc_id === doc_id);

    if (index > -1) {
      global.documents.splice(index, 1);
      return res.status(200).json({
        success: true,
        doc_id: doc_id,
        chunks_deleted: 1
      });
    } else {
      return res.status(404).json({ error: 'Document not found' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}