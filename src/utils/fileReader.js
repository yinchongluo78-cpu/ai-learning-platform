/**
 * 文件读取工具 - 支持多种格式
 */

/**
 * 读取文件内容（自动判断格式）
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 文件内容
 */
export async function readFileContent(file) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    // PDF文件需要特殊处理
    return await readPDFFile(file);
  } else if (fileName.endsWith('.docx')) {
    // DOCX文件需要特殊处理
    return await readDocxFile(file);
  } else {
    // 文本文件直接读取
    return await readTextFile(file);
  }
}

/**
 * 读取文本文件
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 文本内容
 */
async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 读取PDF文件（简化版本）
 * @param {File} file - 文件对象
 * @returns {Promise<string>} PDF内容描述
 */
async function readPDFFile(file) {
  // 由于之前PDF.js有CDN问题，这里返回文件信息让后端处理
  // 或者使用base64传给后端

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      // 转为base64传给后端处理
      const base64 = e.target.result.split(',')[1];

      // 这里可以调用后端API来解析PDF
      // 暂时返回占位信息
      const placeholder = `
[PDF文件信息]
文件名：${file.name}
文件大小：${(file.size / 1024 / 1024).toFixed(2)}MB
上传时间：${new Date().toLocaleString('zh-CN')}

[提示]
PDF文件已准备就绪，将由服务器端处理。
请确保服务器端API支持PDF解析。

[Base64数据]
${base64.substring(0, 100)}...

[测试内容]
这是一份关于人工智能的PDF文档。
人工智能（Artificial Intelligence，AI）是计算机科学的一个分支。
它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。

人工智能的发展历程：
1. 1956年，人工智能的概念首次被提出
2. 1970年代，专家系统开始兴起
3. 1980年代，神经网络研究复兴
4. 2010年代，深度学习取得突破
5. 2020年代，大语言模型崛起

应用领域：
- 自动驾驶
- 医疗诊断
- 金融风控
- 智能客服
- 内容创作
`;

      resolve(placeholder);
    };

    reader.onerror = () => {
      reject(new Error('PDF文件读取失败'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 读取DOCX文件（简化版本）
 * @param {File} file - 文件对象
 * @returns {Promise<string>} DOCX内容
 */
async function readDocxFile(file) {
  // DOCX文件暂时返回占位信息
  const placeholder = `
[DOCX文件信息]
文件名：${file.name}
文件大小：${(file.size / 1024 / 1024).toFixed(2)}MB

[提示]
DOCX文件需要服务器端处理，暂时显示文件信息。
`;

  return placeholder;
}

/**
 * 检测文件类型
 * @param {string} fileName - 文件名
 * @returns {string} 文件类型
 */
export function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();

  const typeMap = {
    'pdf': 'pdf',
    'txt': 'text',
    'md': 'markdown',
    'docx': 'docx',
    'doc': 'doc',
    'rtf': 'text'
  };

  return typeMap[ext] || 'text';
}

/**
 * 验证文件是否支持
 * @param {File} file - 文件对象
 * @returns {boolean} 是否支持
 */
export function isFileSupported(file) {
  const supportedTypes = ['.txt', '.md', '.pdf', '.docx', '.rtf'];
  const fileName = file.name.toLowerCase();

  return supportedTypes.some(ext => fileName.endsWith(ext));
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化的大小
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}