/**
 * 将字符串转换为URL友好的slug形式
 * 支持中英文，处理特殊字符，空格转为短横线
 * @param text 要转换的文本
 * @returns 转换后的slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // 将空格和特殊字符替换为短横线
    .replace(/[\s\W-]+/g, '-')
    // 移除开头和结尾的短横线
    .replace(/^-+|-+$/g, '')
    // 确保最终没有特殊字符
    .replace(/[^\w\-]+/g, '')
    // 避免重复的短横线
    .replace(/-+/g, '-');
} 