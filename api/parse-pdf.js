// Vercel Serverless Function for PDF parsing
const pdf = require('pdf-parse');

module.exports = async (req, res) => {
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
    const { base64Data } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'No PDF data provided'
      });
    }

    // 将base64转换为Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // 解析PDF
    const data = await pdf(buffer);

    // 返回提取的文本和元数据
    return res.status(200).json({
      success: true,
      data: {
        text: data.text,
        pageCount: data.numpages,
        metadata: data.metadata || {},
        info: data.info || {}
      }
    });

  } catch (error) {
    console.error('PDF parsing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse PDF'
    });
  }
};