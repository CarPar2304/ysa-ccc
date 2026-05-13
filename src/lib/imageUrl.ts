/**
 * Image URL helpers to reduce Supabase Storage egress.
 *
 * Supabase Storage supports on-the-fly image transformations via the
 * `/storage/v1/render/image/public/...` endpoint. Variants are cached at the
 * CDN so listing pages can serve small thumbnails instead of the original
 * full-size files.
 *
 * Usage:
 *   <img src={getThumbUrl(post.imagen_url, { width: 720, quality: 75 })} />
 *   <AvatarImage src={getThumbUrl(user.avatar_url, { width: 96, quality: 70 })} />
 *
 * Accepts either a stored full public URL or a raw `bucket/path` string.
 */

export type ThumbOptions = {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  resize?: "cover" | "contain" | "fill";
};

const PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_IMAGE_SEGMENT = "/storage/v1/render/image/public/";

/**
 * Returns a transformed (thumbnail) URL for a Supabase Storage public image.
 * - If the input already points to the render endpoint, leaves it alone.
 * - If it's null/empty/non-Supabase URL, returns the input as-is.
 * - Strips any pre-existing query string before applying transform params.
 */
export function getThumbUrl(
  urlOrNull: string | null | undefined,
  opts: ThumbOptions = {}
): string | undefined {
  if (!urlOrNull) return undefined;
  const url = urlOrNull.trim();
  if (!url) return undefined;

  // Only rewrite Supabase public storage URLs.
  if (!url.includes(PUBLIC_OBJECT_SEGMENT) && !url.includes(RENDER_IMAGE_SEGMENT)) {
    return url;
  }

  const base = url.split("?")[0].replace(PUBLIC_OBJECT_SEGMENT, RENDER_IMAGE_SEGMENT);

  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(Math.round(opts.width)));
  if (opts.height) params.set("height", String(Math.round(opts.height)));
  params.set("quality", String(opts.quality ?? 75));
  if (opts.resize) params.set("resize", opts.resize);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Convenience presets. */
export const Thumb = {
  avatar: (url?: string | null) => getThumbUrl(url, { width: 96, quality: 70, resize: "cover" }),
  avatarLg: (url?: string | null) => getThumbUrl(url, { width: 192, quality: 75, resize: "cover" }),
  cardSm: (url?: string | null) => getThumbUrl(url, { width: 400, quality: 75, resize: "cover" }),
  cardMd: (url?: string | null) => getThumbUrl(url, { width: 480, quality: 75, resize: "cover" }),
  cardLg: (url?: string | null) => getThumbUrl(url, { width: 720, quality: 75, resize: "cover" }),
  detail: (url?: string | null) => getThumbUrl(url, { width: 1280, quality: 80 }),
};
