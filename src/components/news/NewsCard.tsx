import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface NewsCardProps {
  noticia: {
    id: string;
    titulo: string;
    descripcion: string | null;
    contenido: string | null;
    categoria: string | null;
    created_at: string;
    imagen_url: string | null;
    publicado: boolean;
  };
  isAdmin?: boolean;
  onClick: () => void;
}

/** Strip markdown syntax for a plain-text preview */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/(\*{1,2}|_{1,2})/g, "")
    .replace(/>\s+/g, "")
    .replace(/[-*]\s+/g, "")
    .replace(/\d+\.\s+/g, "")
    .replace(/---+/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

export const NewsCard = ({ noticia, isAdmin, onClick }: NewsCardProps) => {
  const preview = noticia.descripcion || (noticia.contenido ? stripMarkdown(noticia.contenido) : null);

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Image — compact aspect ratio */}
      <div className="aspect-[16/10] overflow-hidden bg-muted relative">
        {noticia.imagen_url ? (
          <img
            src={noticia.imagen_url}
            alt={noticia.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-accent/30">
            <span className="text-2xl font-bold text-muted-foreground/20 select-none">
              {noticia.titulo.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {isAdmin && !noticia.publicado && (
          <Badge variant="secondary" className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm text-[10px]">
            Borrador
          </Badge>
        )}
      </div>

      {/* Content — tighter padding */}
      <div className="p-2.5 space-y-1">
        <div className="flex items-center gap-1.5">
          {noticia.categoria && (
            <Badge variant="outline" className="text-[9px] font-medium uppercase tracking-wider text-primary border-primary/30 px-1.5 py-0">
              {noticia.categoria}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(noticia.created_at), "d MMM yyyy", { locale: es })}
          </span>
        </div>

        <h3 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {noticia.titulo}
        </h3>

        {preview && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {preview}
          </p>
        )}
      </div>
    </article>
  );
};
