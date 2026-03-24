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

  const openUrl = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (!isArchivo) return;
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const storagePath = extractStoragePath(recurso.url);

      if (!storagePath) {
        openUrl(recurso.url);
        return;
      }

      // Since lab-images is a public bucket, build the public URL directly
      const publicUrl = `https://aqfpzlrpqszoxbjojavc.supabase.co/storage/v1/object/public/lab-images/${encodeURIComponent(storagePath).replace(/%2F/g, "/")}`;

      if (isPdf) {
        openUrl(publicUrl);
      } else {
        // For non-PDF files, try signed URL with download disposition first
        const { data, error } = await supabase.storage
          .from("lab-images")
          .createSignedUrl(storagePath, 300, { download: recurso.titulo || true });

        if (!error && data?.signedUrl) {
          downloadFile(data.signedUrl, recurso.titulo || storagePath.split("/").pop() || "archivo");
        } else {
          // Fallback: use public URL
          downloadFile(publicUrl, recurso.titulo || storagePath.split("/").pop() || "archivo");
        }
      }
    } catch (err) {
      console.error("Error handling file:", err);
      openUrl(recurso.url);
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
