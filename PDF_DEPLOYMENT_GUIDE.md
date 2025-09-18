# PDF功能部署指南

## 概述
PDF解析功能使用Supabase Edge Functions在服务器端处理，确保稳定性和性能。

## 部署步骤

### 1. 安装Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或使用npm
npm install -g supabase
```

### 2. 登录Supabase

```bash
supabase login
```

### 3. 初始化项目（如果还没有）

```bash
supabase init
```

### 4. 部署Edge Function

```bash
# 给脚本执行权限
chmod +x deploy-pdf-function.sh

# 运行部署脚本
./deploy-pdf-function.sh
```

或手动部署：

```bash
supabase functions deploy parse-pdf \
  --project-ref grqznqyqluehqjnufkxu
```

### 5. 测试函数

```bash
# 使用curl测试
curl -X POST https://grqznqyqluehqjnufkxu.supabase.co/functions/v1/parse-pdf \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -F "file=@test.pdf"
```

## 备选方案

### 方案A：使用Python后端（简单）

创建一个简单的Python API：

```python
# pdf_api.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io

app = Flask(__name__)
CORS(app)

@app.route('/parse-pdf', methods=['POST'])
def parse_pdf():
    try:
        file = request.files['file']

        # 读取PDF
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))

        # 提取文本
        text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.extract_text()

        return jsonify({
            'success': True,
            'data': {
                'text': text,
                'pageCount': len(pdf_reader.pages)
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    app.run(port=5000)
```

安装依赖：
```bash
pip install flask flask-cors PyPDF2
python pdf_api.py
```

### 方案B：使用Node.js后端

```javascript
// pdf-server.js
const express = require('express')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const cors = require('cors')

const app = express()
app.use(cors())

const upload = multer({ memory: true })

app.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    const dataBuffer = req.file.buffer
    const data = await pdfParse(dataBuffer)

    res.json({
      success: true,
      data: {
        text: data.text,
        pageCount: data.numpages,
        metadata: data.info
      }
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

app.listen(5000, () => {
  console.log('PDF服务运行在 http://localhost:5000')
})
```

安装依赖：
```bash
npm install express multer pdf-parse cors
node pdf-server.js
```

### 方案C：使用免费API服务

如果不想自己部署，可以使用：

1. **OCR.space API**（免费）
   - 支持PDF和图片
   - 每月500次免费调用
   - https://ocr.space/ocrapi

2. **ConvertAPI**（免费试用）
   - PDF转文本
   - https://www.convertapi.com/

## 更新前端配置

如果使用自己的后端，修改 `src/utils/pdfParser.js`：

```javascript
// 修改API地址
const functionUrl = 'http://localhost:5000/parse-pdf' // 你的后端地址
```

## 注意事项

1. **文件大小限制**：Edge Function限制为6MB，本地后端可设置更大
2. **安全性**：生产环境需要添加认证和速率限制
3. **性能**：大文件建议分块处理
4. **OCR支持**：扫描版PDF需要额外的OCR处理

## 故障排除

### Edge Function部署失败
- 检查Supabase CLI版本：`supabase --version`
- 确认已登录：`supabase login`
- 检查项目ID是否正确

### PDF解析失败
- 确认PDF未加密
- 检查文件大小是否超限
- 尝试其他PDF文件测试

### 网络错误
- 检查CORS配置
- 确认后端服务运行中
- 检查防火墙设置

## 联系支持

如需帮助，请提issue或联系开发者。