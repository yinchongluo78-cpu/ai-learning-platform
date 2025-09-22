import express from 'express';
import cors from 'cors';
import ragHandler from './api/rag.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 模拟Vercel的请求处理
app.all('/api/rag', async (req, res) => {
  // 创建模拟的Vercel请求和响应对象
  const mockReq = {
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers
  };

  const mockRes = {
    status: (code) => ({
      json: (data) => res.status(code).json(data),
      end: () => res.status(code).end()
    }),
    setHeader: (key, value) => res.setHeader(key, value)
  };

  try {
    await ragHandler(mockReq, mockRes);
  } catch (error) {
    console.error('RAG Handler Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`RAG测试服务器运行在 http://localhost:${PORT}`);
  console.log('测试端点: http://localhost:3001/api/rag?action=upload');
});