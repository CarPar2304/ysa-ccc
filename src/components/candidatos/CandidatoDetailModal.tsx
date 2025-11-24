import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CandidatoData } from "@/pages/Candidatos";
import { User, Building2, Users, TrendingUp, DollarSign, CheckCircle2 } from "lucide-react";

interface CandidatoDetailModalProps {
  candidato: CandidatoData | null;
  open: boolean;
  onClose: () => void;
}

export const CandidatoDetailModal = ({ candidato, open, onClose }: CandidatoDetailModalProps) => {
  if (!candidato) return null;

  const InfoSection = ({ 
    title, 
    icon: Icon, 
    children 
  }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode 
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Icon className="h-5 w-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="pl-7 space-y-2 text-sm">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | number | boolean | undefined }) => (
    <div className="grid grid-cols-2 gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium break-words">
        {value === true ? "Sí" : value === false ? "No" : value || "N/A"}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">
            {candidato.nombres} {candidato.apellidos}
          </DialogTitle>
          <div className="flex gap-2 mt-2">
            {candidato.cupo?.estado === "aprobado" ? (
              <Badge variant="default" className="bg-green-500">Beneficiario</Badge>
            ) : (
              <Badge variant="secondary">Candidato</Badge>
            )}
            {candidato.cupo && (
              <>
                <Badge variant="outline">{candidato.cupo.nivel}</Badge>
                <Badge variant="outline">Cohorte {candidato.cupo.cohorte}</Badge>
              </>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Información Personal */}
            <InfoSection title="Información Personal" icon={User}>
              <InfoRow label="Email" value={candidato.email} />
              <InfoRow label="Celular" value={candidato.celular} />
              <InfoRow label="Identificación" value={candidato.numero_identificacion} />
              <InfoRow label="Departamento" value={candidato.departamento} />
              <InfoRow label="Municipio" value={candidato.municipio} />
            </InfoSection>

            <Separator />

            {/* Emprendimiento */}
            {candidato.emprendimiento && (
              <>
                <InfoSection title="Emprendimiento" icon={Building2}>
                  <InfoRow label="Nombre" value={candidato.emprendimiento.nombre} />
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Descripción:</span>
                    <span className="font-medium break-words">
                      {candidato.emprendimiento.descripcion || "N/A"}
                    </span>
                  </div>
                  <InfoRow label="Categoría" value={candidato.emprendimiento.categoria} />
                  <InfoRow label="Etapa" value={candidato.emprendimiento.etapa} />
                  <InfoRow label="Nivel Definitivo" value={candidato.emprendimiento.nivel_definitivo} />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Estado del Cupo */}
            {candidato.cupo && (
              <>
                <InfoSection title="Estado del Cupo" icon={CheckCircle2}>
                  <InfoRow label="Estado" value={candidato.cupo.estado} />
                  <InfoRow label="Nivel" value={candidato.cupo.nivel} />
                  <InfoRow label="Cohorte" value={candidato.cupo.cohorte} />
                  <InfoRow 
                    label="Fecha de Asignación" 
                    value={candidato.cupo.fecha_asignacion ? 
                      new Date(candidato.cupo.fecha_asignacion).toLocaleDateString('es-ES') : 
                      "N/A"
                    } 
                  />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Equipo */}
            {candidato.equipo && (
              <>
                <InfoSection title="Equipo" icon={Users}>
                  <InfoRow label="Equipo Total" value={candidato.equipo.equipo_total} />
                  <InfoRow label="Fundadoras" value={candidato.equipo.fundadoras} />
                  <InfoRow label="Colaboradoras" value={candidato.equipo.colaboradoras} />
                  <InfoRow label="Equipo Técnico" value={candidato.equipo.equipo_tecnico} />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Proyecciones */}
            {candidato.proyecciones && (
              <>
                <InfoSection title="Proyecciones" icon={TrendingUp}>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Objetivos:</span>
                    <span className="font-medium break-words">
                      {candidato.proyecciones.principales_objetivos || "N/A"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Desafíos:</span>
                    <span className="font-medium break-words">
                      {candidato.proyecciones.desafios || "N/A"}
                    </span>
                  </div>
                  <InfoRow label="Impacto" value={candidato.proyecciones.impacto} />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Financiamiento */}
            {candidato.financiamiento && (
              <>
                <InfoSection title="Financiamiento" icon={DollarSign}>
                  <InfoRow 
                    label="Busca Financiamiento" 
                    value={candidato.financiamiento.busca_financiamiento} 
                  />
                  <InfoRow 
                    label="Monto Buscado" 
                    value={candidato.financiamiento.monto_buscado} 
                  />
                  <InfoRow 
                    label="Financiamiento Previo" 
                    value={candidato.financiamiento.financiamiento_previo} 
                  />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Evaluaciones */}
            <InfoSection title="Evaluaciones" icon={CheckCircle2}>
              <InfoRow label="Total de Evaluaciones" value={candidato.evaluaciones || 0} />
            </InfoSection>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
