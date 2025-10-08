import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeMarkdown(content: string): string {
  // Replace <br> --- <br> patterns with proper markdown horizontal rules
  let normalized = content.replace(/<br\s*\/?>\s*---\s*<br\s*\/?>/gi, '\n\n---\n\n');
  
  // Ensure --- has blank lines around it
  normalized = normalized.replace(/([^\n])\n---\n/g, '$1\n\n---\n\n');
  normalized = normalized.replace(/\n---\n([^\n])/g, '\n\n---\n\n$1');
  
  // Clean up multiple consecutive blank lines (more than 2)
  normalized = normalized.replace(/\n{4,}/g, '\n\n\n');
  
  // Ensure proper spacing before lists
  normalized = normalized.replace(/([^\n])\n([*-] )/g, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');
  
  return normalized;
}
