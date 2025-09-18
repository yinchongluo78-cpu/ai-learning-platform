// Markdown渲染配置
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

// 配置代码高亮
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  }
}))

// 配置Markdown选项
marked.setOptions({
  breaks: true,        // 支持换行符
  gfm: true,          // 支持GitHub风格的Markdown
  headerIds: false,    // 不生成标题ID
  mangle: false,      // 不混淆邮箱地址
  sanitize: false     // 允许HTML（注意安全性）
})

// 自定义渲染器
const renderer = new marked.Renderer()

// 自定义标题渲染
renderer.heading = function(text, level) {
  const sizes = {
    1: 'text-2xl font-bold mb-4 mt-6',
    2: 'text-xl font-bold mb-3 mt-5',
    3: 'text-lg font-bold mb-2 mt-4',
    4: 'text-base font-bold mb-2 mt-3',
    5: 'text-sm font-bold mb-1 mt-2',
    6: 'text-sm font-bold mb-1 mt-2'
  }
  return `<h${level} class="${sizes[level]} text-blue-400">${text}</h${level}>`
}

// 自定义列表渲染
renderer.list = function(body, ordered) {
  const type = ordered ? 'ol' : 'ul'
  const listClass = ordered
    ? 'list-decimal list-inside space-y-1 my-3 ml-4'
    : 'list-disc list-inside space-y-1 my-3 ml-4'
  return `<${type} class="${listClass}">${body}</${type}>`
}

// 自定义段落渲染
renderer.paragraph = function(text) {
  return `<p class="my-3 leading-relaxed">${text}</p>`
}

// 自定义代码块渲染
renderer.code = function(code, language) {
  const validLanguage = hljs.getLanguage(language) ? language : 'plaintext'
  const highlighted = hljs.highlight(code, { language: validLanguage }).value
  // 生成唯一ID用于复制功能
  const codeId = 'code-' + Math.random().toString(36).substr(2, 9)
  // 将代码内容编码为Base64以安全传递
  const encodedCode = btoa(encodeURIComponent(code))
  return `
    <div class="code-block my-4">
      <div class="code-header">
        <span class="code-language">${validLanguage}</span>
        <button class="copy-btn" data-code="${encodedCode}" data-code-id="${codeId}">
          📋 复制
        </button>
      </div>
      <pre class="code-content"><code class="hljs language-${validLanguage}" id="${codeId}">${highlighted}</code></pre>
    </div>
  `
}

// 自定义行内代码
renderer.codespan = function(code) {
  return `<code class="inline-code">${code}</code>`
}

// 自定义强调文本
renderer.strong = function(text) {
  return `<strong class="font-bold text-cyan-300">${text}</strong>`
}

// 自定义斜体文本
renderer.em = function(text) {
  return `<em class="italic text-purple-300">${text}</em>`
}

// 自定义链接
renderer.link = function(href, title, text) {
  return `<a href="${href}" target="_blank" rel="noopener" class="text-blue-400 hover:text-blue-300 underline" title="${title || text}">${text}</a>`
}

// 自定义引用块
renderer.blockquote = function(quote) {
  return `<blockquote class="border-l-4 border-blue-400 pl-4 my-4 italic text-gray-300">${quote}</blockquote>`
}

// 自定义表格
renderer.table = function(header, body) {
  return `
    <div class="table-wrapper my-4 overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-700">
          ${header}
        </thead>
        <tbody class="bg-gray-800">
          ${body}
        </tbody>
      </table>
    </div>
  `
}

// 设置自定义渲染器
marked.use({ renderer })

// 导出渲染函数
export function renderMarkdown(text) {
  try {
    // 确保输入是字符串
    if (!text) {
      return ''
    }

    // 如果输入不是字符串，尝试转换
    if (typeof text !== 'string') {
      console.warn('Markdown输入不是字符串:', text)
      text = String(text)
    }

    // 预处理文本，确保换行符正确
    const processedText = text
      .replace(/\n\n/g, '\n\n')  // 保持段落分隔
      .replace(/(\d+)\.\s+/g, '$1. ') // 修复有序列表格式

    const result = marked(processedText)
    console.log('marked返回值类型:', typeof result)
    console.log('marked返回值内容前50字符:', result.substring(0, 50))
    return result
  } catch (error) {
    console.error('Markdown渲染错误:', error, 'Input:', text)
    // 出错时返回转义后的原文本
    return text ? String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
  }
}

// 获取代码高亮样式（GitHub Dark主题）
export function getHighlightStyles() {
  return `
    /* 代码块整体样式 */
    .code-block {
      background: #1e1e2e;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #313244;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #181825;
      border-bottom: 1px solid #313244;
      font-size: 12px;
    }

    .code-language {
      color: #a6adc8;
      font-weight: 600;
      text-transform: uppercase;
    }

    .copy-btn {
      background: #313244;
      color: #cdd6f4;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .copy-btn:hover {
      background: #45475a;
    }

    .code-content {
      padding: 16px;
      overflow-x: auto;
      margin: 0;
    }

    .code-content code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 14px;
      line-height: 1.6;
    }

    /* 行内代码样式 */
    .inline-code {
      background: rgba(139, 213, 202, 0.1);
      color: #89dceb;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9em;
    }

    /* Highlight.js GitHub Dark 主题 */
    .hljs {
      color: #c9d1d9;
      background: transparent;
    }

    .hljs-comment,
    .hljs-quote {
      color: #8b949e;
      font-style: italic;
    }

    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-type {
      color: #ff7b72;
    }

    .hljs-literal,
    .hljs-number,
    .hljs-tag .hljs-attr,
    .hljs-template-variable,
    .hljs-variable {
      color: #79c0ff;
    }

    .hljs-string,
    .hljs-doctag,
    .hljs-regexp {
      color: #a5d6ff;
    }

    .hljs-title,
    .hljs-name,
    .hljs-selector-id,
    .hljs-selector-class {
      color: #7ee83f;
    }

    .hljs-symbol,
    .hljs-bullet,
    .hljs-link {
      color: #d2a8ff;
    }

    .hljs-built_in,
    .hljs-builtin-name {
      color: #ffa657;
    }

    .hljs-meta {
      color: #58a6ff;
    }

    .hljs-deletion {
      color: #ffdcd7;
      background-color: #67060c;
    }

    .hljs-addition {
      color: #aff5b4;
      background-color: #033a16;
    }

    .hljs-emphasis {
      font-style: italic;
    }

    .hljs-strong {
      font-weight: bold;
    }
  `
}