// src/utils/markdown.js
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

// 配置 marked
marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', // 代码块样式前缀
  breaks: true, // 允许回车换行
  gfm: true,    // GitHub 风格
});

/**
 * 核心渲染函数
 * @param {string} content - Markdown 文本
 * @param {string} keyword - 需要高亮的搜索关键词 (可选)
 * @returns {string} - 安全的 HTML 字符串
 */
export const renderMarkdown = (content, keyword = '') => {
  if (!content) return '';

  // 1. Markdown 转 HTML
  let html = marked.parse(content);

  // 2. 安全清洗 (防止 XSS)
  html = DOMPurify.sanitize(html);

  // 3. 搜索关键词高亮 (智能处理，不破坏 HTML 标签)
  if (keyword && keyword.trim()) {
    const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义正则字符
    // 正则解释：(?![^<]*>) 确保不匹配 HTML 标签内的内容
    const reg = new RegExp(`(${safeKeyword})(?![^<]*>)`, 'gi');
    html = html.replace(reg, '<span class="highlight-text">$1</span>');
  }

  return html;
};