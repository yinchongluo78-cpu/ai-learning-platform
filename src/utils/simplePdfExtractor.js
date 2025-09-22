/**
 * 简化的PDF文本提取 - 不依赖任何外部库
 * 使用服务端API或降级处理
 */

/**
 * 从PDF文件提取文本
 * @param {File} file - PDF文件对象
 * @returns {Promise<string>} 提取的文本内容
 */
export async function extractTextFromPDF(file) {
  try {
    console.log('📄 开始处理PDF文件:', file.name);

    // 方案1：尝试使用OSS上传并在服务端处理
    // 由于OSS在国外访问有问题，暂时跳过

    // 方案2：读取文件基本信息作为降级方案
    const fileInfo = {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString('zh-CN')
    };

    // 返回文件信息作为内容
    const content = `
[PDF文档信息]
文件名：${fileInfo.name}
文件大小：${fileInfo.size}
文件类型：${fileInfo.type}
修改时间：${fileInfo.lastModified}

[提示]
由于技术限制，PDF内容暂时无法直接提取。
您可以：
1. 手动复制PDF中的重要内容到对话框
2. 简要描述PDF的主要内容
3. 等待功能更新

[使用建议]
在对话中描述您想了解的PDF相关问题，AI将基于您的描述提供帮助。
`;

    console.log('✅ PDF处理完成（降级模式）');
    return content;

  } catch (error) {
    console.error('❌ PDF处理失败:', error);
    return `[PDF文件：${file.name}]\n[处理失败：${error.message}]`;
  }
}

// 导出为默认函数
export default extractTextFromPDF;