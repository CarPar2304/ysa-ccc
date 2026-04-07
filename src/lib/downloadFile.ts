/**
 * Downloads a file from a URL with a specific filename.
 * Uses fetch + blob to ensure the download attribute works
 * even for cross-origin URLs (e.g. Supabase signed URLs).
 */
export async function downloadFileWithName(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
