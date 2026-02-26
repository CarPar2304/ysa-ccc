import { supabase } from "@/integrations/supabase/client";

const ENTREGAS_BUCKET = "entregas";
const SUPABASE_URL = "https://aqfpzlrpqszoxbjojavc.supabase.co";

/**
 * Extracts the storage path from a stored URL or returns the path as-is.
 * Handles both old public URLs and raw storage paths.
 */
export function extractEntregaPath(urlOrPath: string): string {
  // If it's a full Supabase URL, extract the path after the bucket name
  const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${ENTREGAS_BUCKET}/`;
  const signedPrefix = `${SUPABASE_URL}/storage/v1/object/sign/${ENTREGAS_BUCKET}/`;

  if (urlOrPath.startsWith(publicPrefix)) {
    return decodeURIComponent(urlOrPath.slice(publicPrefix.length).split("?")[0]);
  }
  if (urlOrPath.startsWith(signedPrefix)) {
    return decodeURIComponent(urlOrPath.slice(signedPrefix.length).split("?")[0]);
  }
  // Already a path
  return urlOrPath;
}

/**
 * Generates a signed URL for a file in the entregas bucket.
 * Works with both old public URLs and raw storage paths.
 */
export async function getEntregaSignedUrl(urlOrPath: string, expiresIn = 3600): Promise<string | null> {
  const path = extractEntregaPath(urlOrPath);

  const { data, error } = await supabase.storage
    .from(ENTREGAS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
  return data.signedUrl;
}
