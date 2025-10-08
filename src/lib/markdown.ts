export function normalizeMarkdown(content: string): string {
  let normalized = (content ?? "").toString();

  // Convert <br> tags to markdown paragraph breaks
  normalized = normalized.replace(/<br\s*\/?\s*>/gi, "\n\n");

  // Ensure horizontal rules have blank lines around them
  normalized = normalized.replace(/(^|\n)\s*-{3,}\s*(?=\n|$)/g, "\n\n---\n\n");

  // Ensure blank line before unordered lists
  normalized = normalized.replace(/([^\n])\n([*-]\s+)/g, "$1\n\n$2");

  // Ensure blank line before ordered lists
  normalized = normalized.replace(/([^\n])\n(\d+\.\s+)/g, "$1\n\n$2");

  // Collapse excessive blank lines to max 2
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
}
