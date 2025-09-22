/**
 * 文档管理API
 */

import { listDocuments, getDocumentInfo, deleteDocumentChunks } from './vector-store.js';

/**
 * 处理文档列表请求
 * @param {Request} req - 请求对象
 * @param {Response} res - 响应对象
 */
export default async function handler(req, res) {
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
    const documents = await listDocuments();

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

    const deletedCount = await deleteDocumentChunks(doc_id);

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