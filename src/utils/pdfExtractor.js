/**
 * 客户端PDF文本提取工具
 * 使用PDF.js在浏览器中直接提取PDF文本
 * 支持按需加载，减少初始包大小
 */

let pdfjsLib = null;

// 懒加载PDF.js库
async function loadPDFJS() {
  if (!pdfjsLib) {
    // 动态导入PDF.js
    pdfjsLib = await import('pdfjs-dist');

    // 配置PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    console.log('PDF.js已动态加载');
  }
  return pdfjsLib;
}

/**
 * 从PDF文件提取文本
 * @param {File} file - PDF文件对象
 * @returns {Promise<string>} - 提取的文本内容
 */
export async function extractPDFText(file) {
  try {
    // 懒加载PDF.js
    const pdfjs = await loadPDFJS();

    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 加载PDF文档
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    console.log(`PDF加载成功，共${pdf.numPages}页`);

    let fullText = '';

    // 遍历所有页面
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 提取页面文本
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      fullText += `\n--- 第${pageNum}页 ---\n${pageText}\n`;

      // 显示进度
      const progress = Math.round((pageNum / pdf.numPages) * 100);
      console.log(`提取进度: ${progress}%`);
    }

    return fullText;

  } catch (error) {
    console.error('PDF文本提取失败:', error);
    throw new Error(`无法提取PDF内容: ${error.message}`);
  }
}

/**
 * 检查是否为PDF文件
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export function isPDFFile(file) {
  return file.type === 'application/pdf' ||
         file.name.toLowerCase().endsWith('.pdf');
}