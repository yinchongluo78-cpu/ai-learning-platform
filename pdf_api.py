#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PDF解析API服务器
用于处理PDF文件上传和文本提取
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)

# 配置CORS，允许前端访问
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# 配置
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    """检查文件扩展名"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'running',
        'service': 'PDF Parser API',
        'version': '1.0.0',
        'time': datetime.now().isoformat()
    })

@app.route('/parse-pdf', methods=['POST', 'OPTIONS'])
def parse_pdf():
    """解析PDF文件"""

    # 处理OPTIONS请求（CORS预检）
    if request.method == 'OPTIONS':
        return '', 200

    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有找到文件'
            }), 400

        file = request.files['file']

        # 检查文件名
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '文件名为空'
            }), 400

        # 检查文件类型
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': '文件类型不支持，请上传PDF文件'
            }), 400

        # 读取文件内容
        file_content = file.read()

        # 检查文件大小
        if len(file_content) > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'文件太大，最大支持{MAX_FILE_SIZE/1024/1024}MB'
            }), 400

        logger.info(f"开始解析PDF: {file.filename}, 大小: {len(file_content)/1024:.2f}KB")

        # 解析PDF
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        # 获取PDF信息
        num_pages = len(pdf_reader.pages)
        metadata = pdf_reader.metadata if pdf_reader.metadata else {}

        # 提取所有页面的文本
        full_text = ""
        page_texts = []

        for page_num in range(num_pages):
            try:
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()

                if page_text.strip():
                    page_texts.append(f"\n--- 第 {page_num + 1} 页 ---\n{page_text}")
                    full_text += page_text + "\n"

                # 记录进度
                if page_num % 10 == 0:
                    logger.info(f"已处理 {page_num + 1}/{num_pages} 页")

            except Exception as e:
                logger.warning(f"处理第{page_num + 1}页时出错: {str(e)}")
                continue

        # 清理文本（移除多余空白）
        full_text = ' '.join(full_text.split())

        logger.info(f"PDF解析完成: {file.filename}, 共{num_pages}页, 提取{len(full_text)}个字符")

        # 返回结果
        return jsonify({
            'success': True,
            'data': {
                'text': full_text,
                'pageCount': num_pages,
                'metadata': {
                    'title': metadata.get('/Title', file.filename),
                    'author': metadata.get('/Author', '未知作者'),
                    'subject': metadata.get('/Subject', ''),
                    'creator': metadata.get('/Creator', ''),
                    'producer': metadata.get('/Producer', ''),
                    'creationDate': str(metadata.get('/CreationDate', '')),
                    'modDate': str(metadata.get('/ModDate', '')),
                    'filename': file.filename,
                    'size': len(file_content),
                    'characterCount': len(full_text)
                }
            }
        })

    except PyPDF2.errors.PdfReadError as e:
        logger.error(f"PDF读取错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'PDF文件损坏或加密，无法读取'
        }), 400

    except Exception as e:
        logger.error(f"解析PDF时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'解析失败: {str(e)}'
        }), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    """处理文件过大错误"""
    return jsonify({
        'success': False,
        'error': '文件太大，请上传小于100MB的文件'
    }), 413

@app.errorhandler(500)
def internal_error(error):
    """处理服务器错误"""
    logger.error(f"服务器错误: {str(error)}")
    return jsonify({
        'success': False,
        'error': '服务器内部错误'
    }), 500

if __name__ == '__main__':
    print("""
    ╔════════════════════════════════════════╗
    ║     PDF解析API服务器                    ║
    ║     运行在: http://localhost:5001      ║
    ║     测试地址: http://localhost:5001/   ║
    ╔════════════════════════════════════════╝

    API端点:
    - GET  /          健康检查
    - POST /parse-pdf 解析PDF文件

    正在启动服务器...
    """)

    # 运行服务器
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )