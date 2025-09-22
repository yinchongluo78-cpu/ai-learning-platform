/**
 * 文档处理器 - 负责文档解析、切片和预处理
 */

/**
 * 文档切片配置
 */
const CHUNK_CONFIG = {
  maxTokens: 400,         // 每个片段最大token数
  overlapTokens: 80,      // 重叠token数
  minChunkSize: 50,       // 最小片段长度
  maxChunkSize: 1500      // 最大片段长度（字符）
};

/**
 * 清理文本中的噪音
 * @param {string} text - 原始文本
 * @returns {string} 清理后的文本
 */
function cleanText(text) {
  // 移除页眉页脚常见模式
  text = text.replace(/第\s*\d+\s*页/g, '');
  text = text.replace(/Page\s+\d+/gi, '');
  text = text.replace(/\d+\s*\/\s*\d+/g, '');

  // 移除目录行（通常包含很多省略号或点）
  text = text.replace(/^.*\.{5,}.*\d+\s*$/gm, '');
  text = text.replace(/^.*…{3,}.*\d+\s*$/gm, '');

  // 移除多余的空白
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\s+/g, ' ');

  // 移除控制字符
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return text.trim();
}

/**
 * 估算文本的token数量（简化版）
 * @param {string} text - 文本
 * @returns {number} 估算的token数
 */
function estimateTokens(text) {
  // 中文字符约1.5个token，英文单词约1个token
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  const numbers = text.match(/\d+/g) || [];

  return Math.ceil(
    chineseChars.length * 1.5 +
    englishWords.length +
    numbers.length * 0.5
  );
}

/**
 * 智能切分文档为片段
 * @param {string} text - 文档文本
 * @param {Object} metadata - 文档元数据
 * @returns {Array} 切片数组
 */
export function chunkDocument(text, metadata = {}) {
  // 清理文本
  text = cleanText(text);

  const chunks = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // 如果单个段落超过最大限制，需要进一步切分
    if (paragraphTokens > CHUNK_CONFIG.maxTokens) {
      // 先保存当前块
      if (currentChunk) {
        chunks.push(createChunk(currentChunk, chunkIndex++, metadata));
        currentChunk = '';
        currentTokens = 0;
      }

      // 切分长段落
      const sentences = paragraph.split(/[。！？.!?]+/);
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (currentTokens + sentenceTokens > CHUNK_CONFIG.maxTokens) {
          if (currentChunk) {
            chunks.push(createChunk(currentChunk, chunkIndex++, metadata));
            // 保留部分内容作为重叠
            const overlap = getOverlapText(currentChunk);
            currentChunk = overlap + sentence;
            currentTokens = estimateTokens(currentChunk);
          } else {
            currentChunk = sentence;
            currentTokens = sentenceTokens;
          }
        } else {
          currentChunk += (currentChunk ? '。' : '') + sentence;
          currentTokens += sentenceTokens;
        }
      }
    } else {
      // 正常添加段落
      if (currentTokens + paragraphTokens > CHUNK_CONFIG.maxTokens) {
        if (currentChunk) {
          chunks.push(createChunk(currentChunk, chunkIndex++, metadata));
          // 保留部分内容作为重叠
          const overlap = getOverlapText(currentChunk);
          currentChunk = overlap + '\n\n' + paragraph;
          currentTokens = estimateTokens(currentChunk);
        } else {
          currentChunk = paragraph;
          currentTokens = paragraphTokens;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }
  }

  // 保存最后一个块
  if (currentChunk && currentChunk.length >= CHUNK_CONFIG.minChunkSize) {
    chunks.push(createChunk(currentChunk, chunkIndex++, metadata));
  }

  return chunks;
}

/**
 * 获取重叠文本
 * @param {string} text - 原文本
 * @returns {string} 重叠部分
 */
function getOverlapText(text) {
  const tokens = estimateTokens(text);
  if (tokens <= CHUNK_CONFIG.overlapTokens) {
    return text;
  }

  // 简化处理：取最后约80个token的内容
  const chars = Math.floor(text.length * CHUNK_CONFIG.overlapTokens / tokens);
  return '...' + text.slice(-chars);
}

/**
 * 创建文档片段对象
 * @param {string} content - 片段内容
 * @param {number} index - 片段索引
 * @param {Object} metadata - 元数据
 * @returns {Object} 片段对象
 */
function createChunk(content, index, metadata) {
  return {
    content: content.trim(),
    metadata: {
      ...metadata,
      chunk_index: index,
      tokens: estimateTokens(content),
      created_at: new Date().toISOString()
    }
  };
}

/**
 * 从PDF提取的文本中解析页码信息
 * @param {string} text - PDF文本
 * @returns {Array} 带页码的文本片段
 */
export function parsePDFWithPages(text) {
  const pagePattern = /--- 第 (\d+) 页 ---/g;
  const pages = [];
  let lastIndex = 0;
  let lastPage = 1;

  let match;
  while ((match = pagePattern.exec(text)) !== null) {
    const pageNum = parseInt(match[1]);
    const pageContent = text.substring(lastIndex, match.index).trim();

    if (pageContent) {
      pages.push({
        page: lastPage,
        content: pageContent
      });
    }

    lastPage = pageNum;
    lastIndex = match.index + match[0].length;
  }

  // 添加最后一页
  const lastContent = text.substring(lastIndex).trim();
  if (lastContent) {
    pages.push({
      page: lastPage,
      content: lastContent
    });
  }

  return pages.length > 0 ? pages : [{ page: 1, content: text }];
}

/**
 * 处理PDF文档
 * @param {string} text - PDF文本
 * @param {string} fileName - 文件名
 * @param {string} docId - 文档ID
 * @returns {Array} 处理后的片段
 */
export function processPDFDocument(text, fileName, docId) {
  const pages = parsePDFWithPages(text);
  const allChunks = [];

  for (const pageData of pages) {
    const chunks = chunkDocument(pageData.content, {
      doc_id: docId,
      file_name: fileName,
      page: pageData.page,
      type: 'pdf'
    });

    allChunks.push(...chunks);
  }

  return allChunks;
}

/**
 * 处理普通文本文档
 * @param {string} text - 文本内容
 * @param {string} fileName - 文件名
 * @param {string} docId - 文档ID
 * @returns {Array} 处理后的片段
 */
export function processTextDocument(text, fileName, docId) {
  return chunkDocument(text, {
    doc_id: docId,
    file_name: fileName,
    page: 1,
    type: 'text'
  });
}