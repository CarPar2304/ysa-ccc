/**
 * Client-side image compression + upload validation.
 * Reduces stored file size and Cached Egress on Supabase Storage.
 */

const IMAGE_MIME = /^image\/(jpe?g|png|webp|gif|bmp)$/i;

export const SIZE_LIMITS = {
  /** Hard reject for any image input (raw, before compression). */
  IMAGE_RAW_MAX: 25 * 1024 * 1024, // 25 MB
  /** Output target for compressed images. */
  IMAGE_OUT_MAX: 5 * 1024 * 1024, // 5 MB
  /** Hard reject for entrega documents (per file). */
  ENTREGA_FILE_MAX: 15 * 1024 * 1024, // 15 MB
  /** Total per submission. */
  ENTREGA_TOTAL_MAX: 50 * 1024 * 1024, // 50 MB
};

export function isImageFile(file: File): boolean {
  return IMAGE_MIME.test(file.type);
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Compress an image File to a max dimension and quality using <canvas>.
 * Falls back to the original file if anything fails.
 *
 * @param file        Source image file
 * @param maxDim      Max width/height in px (default 1600)
 * @param quality     0..1 (default 0.82)
 * @param mime        Output mime; defaults to image/jpeg (or image/png if alpha needed)
 */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.82,
  mime: "image/jpeg" | "image/webp" | "image/png" = "image/jpeg"
): Promise<File> {
  if (!isImageFile(file)) return file;
  if (file.type === "image/gif") return file; // preserve animation

  if (file.size > SIZE_LIMITS.IMAGE_RAW_MAX) {
    throw new Error(
      `La imagen pesa ${formatBytes(file.size)}. El máximo permitido es ${formatBytes(
        SIZE_LIMITS.IMAGE_RAW_MAX
      )}.`
    );
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo decodificar la imagen"));
      i.src = dataUrl;
    });

    let { width, height } = img;
    if (width <= maxDim && height <= maxDim && file.size <= SIZE_LIMITS.IMAGE_OUT_MAX) {
      return file;
    }

    const ratio = Math.min(maxDim / width, maxDim / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    );
    if (!blob) return file;

    const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch (err) {
    console.warn("compressImage fallback:", err);
    return file;
  }
}

/**
 * Validate a list of files against entrega limits.
 * Throws an Error with a Spanish message if any rule fails.
 */
export function validateEntregaFiles(files: File[]): void {
  let total = 0;
  for (const f of files) {
    if (f.size > SIZE_LIMITS.ENTREGA_FILE_MAX) {
      throw new Error(
        `"${f.name}" pesa ${formatBytes(f.size)}. El máximo por archivo es ${formatBytes(
          SIZE_LIMITS.ENTREGA_FILE_MAX
        )}.`
      );
    }
    total += f.size;
  }
  if (total > SIZE_LIMITS.ENTREGA_TOTAL_MAX) {
    throw new Error(
      `El total de archivos pesa ${formatBytes(total)}. El máximo por entrega es ${formatBytes(
        SIZE_LIMITS.ENTREGA_TOTAL_MAX
      )}.`
    );
  }
}
