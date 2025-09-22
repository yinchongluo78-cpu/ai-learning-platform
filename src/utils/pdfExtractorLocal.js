/**
 * 本地PDF文本提取工具 - 避免CDN问题
 * 使用本地PDF.js文件，完全避免Cloudflare
 */

let pdfjsLib = null;
let pdfjsWorker = null;

// 加载本地PDF.js
async function loadLocalPDFJS() {
  if (!pdfjsLib) {
    // 动态创建script标签加载本地PDF.js
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/pdf.min.mjs';
      script.type = 'module';

      script.onload = async () => {
        // 获取全局pdfjsLib
        pdfjsLib = window.pdfjsLib || window.pdfjsDist;

        if (pdfjsLib) {
          // 配置worker为本地文件
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          console.log('✅ 本地PDF.js加载成功');
          resolve(pdfjsLib);
        } else {
          reject(new Error('PDF.js加载失败'));
        }
      };

      script.onerror = () => {
        reject(new Error('无法加载PDF.js脚本'));
      };

      document.head.appendChild(script);
    });
  }
  return pdfjsLib;
}

/**
 * 从PDF文件提取文本
 * @param {File} file - PDF文件对象
 * @returns {Promise<string>} 提取的文本内容
 */
export async function extractTextFromPDF(file) {
  try {
    console.log('开始提取PDF文本...');

    // 加载本地PDF.js
    const pdf = await loadLocalPDFJS();

    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 加载PDF文档
    const loadingTask = pdf.getDocument({
      data: arrayBuffer,
      // 禁用自动获取worker
      useSystemFonts: true,
      disableAutoFetch: true,
      disableStream: true
    });

    const pdfDoc = await loadingTask.promise;
    console.log(`PDF加载成功，共 ${pdfDoc.numPages} 页`);

    let fullText = '';

    // 逐页提取文本
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 将文本项组合成字符串
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      fullText += `\n--- 第 ${pageNum} 页 ---\n${pageText}\n`;

      // 显示进度
      console.log(`已提取第 ${pageNum}/${pdfDoc.numPages} 页`);
    }

    console.log('✅ PDF文本提取完成');
    return fullText.trim();

  } catch (error) {
    console.error('❌ PDF文本提取失败:', error);

    // 降级处理：返回基本信息
    return `[PDF文件: ${file.name}]\n[大小: ${(file.size / 1024 / 1024).toFixed(2)}MB]\n[提取失败: ${error.message}]`;
  }
}

// 导出为默认函数
export default extractTextFromPDF;