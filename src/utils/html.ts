/**
 * 清理 HTML 内容，只保留纯文本
 * @param html - HTML 字符串
 * @returns 纯文本内容
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  let text = html;

  // 处理换行标签，转换为换行符
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");

  // 处理列表项前缀
  text = text.replace(/<li[^>]*>/gi, "• ");

  // 移除所有 HTML 标签
  text = text.replace(/<[^>]*>/g, "");

  // 解码常见的 HTML 实体
  const htmlEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&hellip;": "…",
    "&mdash;": "—",
    "&ndash;": "–",
    "&ensp;": " ",
    "&emsp;": "  ",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  // 替换已知的 HTML 实体
  for (const [entity, char] of Object.entries(htmlEntities)) {
    text = text.replace(new RegExp(entity, "g"), char);
  }

  // 解码数字实体（如 &#60; 和 &#x3C;）
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // 清理多余空白
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  text = text.replace(/^\s+|\s+$/gm, "");

  return text.trim();
}

/**
 * 清理简历内容中的 HTML，保留结构化的文本格式
 * @param content - 可能包含 HTML 的内容
 * @returns 清理后的纯文本
 */
export function cleanResumeContent(content: string | undefined | null): string {
  if (!content) return "";
  return stripHtml(content);
}
