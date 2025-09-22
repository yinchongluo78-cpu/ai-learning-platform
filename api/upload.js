/**
 * 文档上传和处理API
 */

import { processPDFDocument, processTextDocument } from './document-processor.js';
import { getBatchEmbeddings } from './embeddings.js';
import { storeChunks, deleteDocumentChunks } from './vector-store.js';
import crypto from 'crypto';

/**
 * 处理文档上传
 * @param {Request} req - 请求对象
 * @param {Response} res - 响应对象
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file_name, content, file_type, replace = false } = req.body;

    // 参数验证
    if (!file_name || !content) {
      return res.status(400).json({ error: 'File name and content are required' });
    }

    // 文件大小限制（10MB）
    if (content.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }

    // 生成文档ID
    const docId = generateDocId(file_name);

    // 如果需要替换，先删除旧文档
    if (replace) {
      await deleteDocumentChunks(docId);
    }

    // 根据文件类型处理文档
    let chunks;
    if (file_type === 'pdf' || file_name.toLowerCase().endsWith('.pdf')) {
      chunks = processPDFDocument(content, file_name, docId);
    } else {
      chunks = processTextDocument(content, file_name, docId);
    }

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No content extracted from document' });
    }

    // 批量获取向量
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await getBatchEmbeddings(texts);

    // 存储到向量数据库
    const storedIds = await storeChunks(chunks, embeddings);

    // 返回处理结果
    res.status(200).json({
      success: true,
      doc_id: docId,
      file_name: file_name,
      chunks_created: chunks.length,
      stored_ids: storedIds,
      summary: {
        total_tokens: chunks.reduce((sum, c) => sum + c.metadata.tokens, 0),
        pages: Math.max(...chunks.map(c => c.metadata.page || 1))
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 生成文档ID
 * @param {string} fileName - 文件名
 * @returns {string} 文档ID
 */
function generateDocId(fileName) {
  const hash = crypto.createHash('md5');
  hash.update(fileName + Date.now().toString());
  return hash.digest('hex').substring(0, 16);
}

/**
 * 处理文档删除
 */
export async function deleteHandler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 批量上传处理
 */
export async function batchUploadHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    if (documents.length > 10) {
      return res.status(400).json({ error: 'Too many documents (max 10)' });
    }

    const results = [];

    for (const doc of documents) {
      try {
        const docId = generateDocId(doc.file_name);

        // 处理文档
        let chunks;
        if (doc.file_type === 'pdf') {
          chunks = processPDFDocument(doc.content, doc.file_name, docId);
        } else {
          chunks = processTextDocument(doc.content, doc.file_name, docId);
        }

        // 向量化和存储
        const texts = chunks.map(chunk => chunk.content);
        const embeddings = await getBatchEmbeddings(texts);
        const storedIds = await storeChunks(chunks, embeddings);

        results.push({
          success: true,
          doc_id: docId,
          file_name: doc.file_name,
          chunks_created: chunks.length
        });

      } catch (error) {
        results.push({
          success: false,
          file_name: doc.file_name,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      results: results,
      total_processed: results.filter(r => r.success).length,
      total_failed: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch upload failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}