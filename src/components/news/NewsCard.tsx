import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface NewsCardProps {
  noticia: {
    id: string;
    titulo: string;
    descripcion: string | null;
    categoria: string | null;
    created_at: string;
    imagen_url: string | null;
    publicado: boolean;
  };
  isAdmin?: boolean;
  onClick: () => void;
}

export const NewsCard = ({ noticia, isAdmin, onClick }: NewsCardProps) => {
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="aspect-[16/9] overflow-hidden bg-muted relative">
        {noticia.imagen_url ? (
          <img
            src={noticia.imagen_url}
            alt={noticia.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-accent/30">
            <span className="text-3xl font-bold text-muted-foreground/30 select-none">
              {noticia.titulo.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {isAdmin && !noticia.publicado && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-xs">
            Borrador
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {noticia.categoria && (
            <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider text-primary border-primary/30">
              {noticia.categoria}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {noticia.titulo}
        </h3>

        {noticia.descripcion && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {noticia.descripcion}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(noticia.created_at), "d MMM yyyy", { locale: es })}
        </div>
      </div>
    </article>
  );
};
