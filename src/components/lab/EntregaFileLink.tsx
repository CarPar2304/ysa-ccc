import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { getEntregaSignedUrl } from "@/lib/entregaStorage";

interface EntregaFileLinkProps {
  archivo: { name: string; url: string };
  className?: string;
}

export const EntregaFileLink = ({ archivo, className }: EntregaFileLinkProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const signedUrl = await getEntregaSignedUrl(archivo.url);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Error opening file:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className || "text-xs text-primary hover:underline flex items-center gap-1 bg-muted px-2 py-1 rounded border border-border disabled:opacity-50"}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
      {archivo.name}
    </button>
  );
};
