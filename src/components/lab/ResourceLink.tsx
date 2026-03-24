import { useState } from "react";
import { ExternalLink, FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Recurso {
  titulo: string;
  url: string;
  tipo?: "link" | "archivo";
}

const extractStoragePath = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/\/object\/(?:public|sign)\/lab-images\/(.+)$/);
    if (match) return decodeURIComponent(match[1].split("?")[0]);
  } catch {
    // not a URL
  }
  return null;
};

export const ResourceLink = ({ recurso }: { recurso: Recurso }) => {
  const [loading, setLoading] = useState(false);
  const isArchivo = recurso.tipo === "archivo";
  const isPdf =
    recurso.url?.toLowerCase().endsWith(".pdf") ||
    recurso.titulo?.toLowerCase().endsWith(".pdf");

  const handleClick = async (e: React.MouseEvent) => {
    if (!isArchivo) return; // let default <a> behaviour handle links
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const storagePath = extractStoragePath(recurso.url);

      if (!storagePath) {
        // Not a storage URL – just open it directly
        window.open(recurso.url, "_blank");
        return;
      }

      if (isPdf) {
        // Try signed URL first, fallback to public URL
        const { data, error } = await supabase.storage
          .from("lab-images")
          .createSignedUrl(storagePath, 300);
        if (!error && data?.signedUrl) {
          window.open(data.signedUrl, "_blank");
        } else {
          // Fallback: open the original public URL
          window.open(recurso.url, "_blank");
        }
      } else {
        // Try signed download URL first
        const { data, error } = await supabase.storage
          .from("lab-images")
          .createSignedUrl(storagePath, 300, { download: recurso.titulo || true });

        if (!error && data?.signedUrl) {
          const a = document.createElement("a");
          a.href = data.signedUrl;
          a.download = recurso.titulo || storagePath.split("/").pop() || "archivo";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          // Fallback: try blob download
          const { data: blob, error: blobErr } = await supabase.storage
            .from("lab-images")
            .download(storagePath);
          if (blobErr) {
            // Last resort: open original URL
            window.open(recurso.url, "_blank");
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = recurso.titulo || storagePath.split("/").pop() || "archivo";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch (err) {
      console.error("Error handling file:", err);
      window.open(recurso.url, "_blank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <a
      href={recurso.url}
      target={isArchivo ? undefined : "_blank"}
      rel={isArchivo ? undefined : "noopener noreferrer"}
      onClick={isArchivo ? handleClick : undefined}
      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
      ) : isArchivo ? (
        <FileDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="text-foreground flex-1">{recurso.titulo}</span>
      {isArchivo && (
        <span className="text-xs text-muted-foreground">
          {loading ? "Descargando..." : "Descargar"}
        </span>
      )}
    </a>
  );
};
