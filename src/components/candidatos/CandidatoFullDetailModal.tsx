import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidatoData } from "@/pages/Candidatos";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { ExportOptionsModal } from "./ExportOptionsModal";
import { 
  User, Building2, Users, TrendingUp, DollarSign, CheckCircle2, 
  FileText, ClipboardList, Download, Globe, Calendar, MapPin,
  Shield, UserCheck, Phone, Mail, IdCard
} from "lucide-react";
import { useState } from "react";

interface CandidatoFullDetailModalProps {
  candidato: CandidatoData | null;
  open: boolean;
  onClose: () => void;
}

export const CandidatoFullDetailModal = ({ candidato, open, onClose }: CandidatoFullDetailModalProps) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  if (!candidato) return null;

  const InfoRow = ({ label, value }: { label: string; value: string | number | boolean | undefined | null }) => (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">
        {value === true ? "Sí" : value === false ? "No" : value || "N/A"}
      </span>
    </div>
  );

  const TextBlock = ({ label, value }: { label: string; value: string | undefined | null }) => (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="text-sm bg-muted/50 p-3 rounded-md">{value || "N/A"}</p>
    </div>
  );

  const getScoreColor = (score: number | undefined | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">
                  {candidato.nombres} {candidato.apellidos}
                </DialogTitle>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {candidato.cupo?.estado === "aprobado" ? (
                    <Badge variant="default" className="bg-green-500">Beneficiario</Badge>
                  ) : candidato.cupo?.estado === "rechazado" ? (
                    <Badge variant="destructive">Rechazado</Badge>
                  ) : (
                    <Badge variant="secondary">Candidato</Badge>
                  )}
                  {candidato.cupo && (
                    <>
                      <Badge variant="outline">{candidato.cupo.nivel}</Badge>
                      <Badge variant="outline">Cohorte {candidato.cupo.cohorte}</Badge>
                    </>
                  )}
                  {candidato.emprendimiento?.nivel_definitivo && (
                    <Badge variant="default">{candidato.emprendimiento.nivel_definitivo}</Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="usuario" className="flex-1">
            <TabsList className="w-full justify-start px-6 pt-2 bg-transparent border-b rounded-none">
              <TabsTrigger value="usuario" className="gap-2">
                <User className="h-4 w-4" />
                Usuario
              </TabsTrigger>
              <TabsTrigger value="emprendimiento" className="gap-2">
                <Building2 className="h-4 w-4" />
                Emprendimiento
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="gap-2">
                <FileText className="h-4 w-4" />
                Diagnóstico
              </TabsTrigger>
              <TabsTrigger value="evaluaciones" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Evaluaciones
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-200px)]">
              {/* Tab Usuario */}
              <TabsContent value="usuario" className="p-6 space-y-6 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <IdCard className="h-5 w-5" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow label="Tipo de Documento" value={candidato.tipo_documento} />
                    <InfoRow label="Número de Identificación" value={candidato.numero_identificacion} />
                    <InfoRow label="Género" value={candidato.genero} />
                    <InfoRow label="Año de Nacimiento" value={candidato.ano_nacimiento} />
                    <InfoRow label="Identificación Étnica" value={candidato.identificacion_etnica} />
                    <InfoRow label="Menor de Edad" value={candidato.menor_de_edad} />
                    <InfoRow label="Nivel de Inglés" value={candidato.nivel_ingles} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Contacto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow label="Email" value={candidato.email} />
                    <InfoRow label="Celular" value={candidato.celular} />
                    <InfoRow label="Dirección" value={candidato.direccion} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Ubicación
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow label="Departamento" value={candidato.departamento} />
                    <InfoRow label="Municipio" value={candidato.municipio} />
                  </CardContent>
                </Card>

                {candidato.biografia && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Biografía</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{candidato.biografia}</p>
                    </CardContent>
                  </Card>
                )}

                {candidato.autorizaciones && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Autorizaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <InfoRow label="Tratamiento de Datos" value={candidato.autorizaciones.tratamiento_datos} />
                      <InfoRow label="Datos Sensibles" value={candidato.autorizaciones.datos_sensibles} />
                      <InfoRow label="Contacto por Correo" value={candidato.autorizaciones.correo} />
                      <InfoRow label="Contacto por Celular" value={candidato.autorizaciones.celular} />
                    </CardContent>
                  </Card>
                )}

                {candidato.acudiente && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        Acudiente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <InfoRow label="Nombre" value={`${candidato.acudiente.nombres} ${candidato.acudiente.apellidos}`} />
                      <InfoRow label="Relación" value={candidato.acudiente.relacion_con_menor} />
                      <InfoRow label="Email" value={candidato.acudiente.email} />
                      <InfoRow label="Celular" value={candidato.acudiente.celular} />
                      <InfoRow label="Tipo de Documento" value={candidato.acudiente.tipo_documento} />
                      <InfoRow label="Identificación" value={candidato.acudiente.numero_identificacion} />
                    </CardContent>
                  </Card>
                )}

                {candidato.cupo && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Estado del Cupo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <InfoRow label="Estado" value={candidato.cupo.estado} />
                      <InfoRow label="Nivel" value={candidato.cupo.nivel} />
                      <InfoRow label="Cohorte" value={candidato.cupo.cohorte} />
                      <InfoRow label="Notas" value={candidato.cupo.notas} />
                      <InfoRow 
                        label="Fecha de Asignación" 
                        value={candidato.cupo.fecha_asignacion ? 
                          new Date(candidato.cupo.fecha_asignacion).toLocaleDateString('es-CO') : 
                          undefined
                        } 
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab Emprendimiento */}
              <TabsContent value="emprendimiento" className="p-6 space-y-6 mt-0">
                {candidato.emprendimiento ? (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Información General
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <InfoRow label="Nombre" value={candidato.emprendimiento.nombre} />
                        <InfoRow label="Categoría" value={candidato.emprendimiento.categoria} />
                        <InfoRow label="Etapa" value={candidato.emprendimiento.etapa} />
                        <InfoRow label="Nivel Definitivo" value={candidato.emprendimiento.nivel_definitivo} />
                        <InfoRow label="Industria Vertical" value={candidato.emprendimiento.industria_vertical} />
                        <InfoRow label="Año de Fundación" value={candidato.emprendimiento.ano_fundacion} />
                        <InfoRow label="Estado Unidad Productiva" value={candidato.emprendimiento.estado_unidad_productiva} />
                      </CardContent>
                    </Card>

                    {candidato.emprendimiento.descripcion && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Descripción</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{candidato.emprendimiento.descripcion}</p>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          Mercado y Clientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <InfoRow label="Tipo de Cliente" value={candidato.emprendimiento.tipo_cliente} />
                        <InfoRow label="Alcance de Mercado" value={candidato.emprendimiento.alcance_mercado} />
                        <InfoRow label="Ventas Último Año" value={candidato.emprendimiento.ventas_ultimo_ano} />
                        <InfoRow label="Página Web" value={candidato.emprendimiento.pagina_web} />
                        <InfoRow label="Nivel de Innovación" value={candidato.emprendimiento.nivel_innovacion} />
                        <InfoRow label="Integración Tecnológica" value={candidato.emprendimiento.integracion_tecnologia} />
                        <InfoRow label="Plan de Negocios" value={candidato.emprendimiento.plan_negocios} />
                        <InfoRow label="Formalización" value={candidato.emprendimiento.formalizacion} />
                      </CardContent>
                    </Card>

                    {candidato.equipo && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Equipo
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <InfoRow label="Equipo Total" value={candidato.equipo.equipo_total} />
                          <InfoRow label="Fundadoras" value={candidato.equipo.fundadoras} />
                          <InfoRow label="Colaboradoras" value={candidato.equipo.colaboradoras} />
                          <InfoRow label="Colaboradores Jóvenes" value={candidato.equipo.colaboradores_jovenes} />
                          <InfoRow label="Personas Full-time" value={candidato.equipo.personas_full_time} />
                          <InfoRow label="Equipo Técnico" value={candidato.equipo.equipo_tecnico} />
                          <InfoRow label="Organigrama" value={candidato.equipo.organigrama} />
                          <InfoRow label="Tipo de Decisiones" value={candidato.equipo.tipo_decisiones} />
                        </CardContent>
                      </Card>
                    )}

                    {candidato.financiamiento && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Financiamiento
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <InfoRow label="Busca Financiamiento" value={candidato.financiamiento.busca_financiamiento} />
                          <InfoRow label="Monto Buscado" value={candidato.financiamiento.monto_buscado} />
                          <InfoRow label="Financiamiento Previo" value={candidato.financiamiento.financiamiento_previo} />
                          <InfoRow label="Monto Recibido" value={candidato.financiamiento.monto_recibido ? `$${candidato.financiamiento.monto_recibido.toLocaleString()}` : undefined} />
                          <InfoRow label="Tipo de Actor" value={candidato.financiamiento.tipo_actor} />
                          <InfoRow label="Tipo de Inversión" value={candidato.financiamiento.tipo_inversion} />
                          <InfoRow label="Etapa" value={candidato.financiamiento.etapa} />
                        </CardContent>
                      </Card>
                    )}

                    {candidato.proyecciones && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Proyecciones
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <TextBlock label="Principales Objetivos" value={candidato.proyecciones.principales_objetivos} />
                          <TextBlock label="Desafíos" value={candidato.proyecciones.desafios} />
                          <TextBlock label="Acciones de Crecimiento" value={candidato.proyecciones.acciones_crecimiento} />
                          <InfoRow label="Impacto" value={candidato.proyecciones.impacto} />
                          <InfoRow label="Intención de Internacionalización" value={candidato.proyecciones.intencion_internacionalizacion} />
                          <InfoRow label="Decisiones Acciones Crecimiento" value={candidato.proyecciones.decisiones_acciones_crecimiento} />
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay información de emprendimiento disponible
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab Diagnóstico */}
              <TabsContent value="diagnostico" className="p-6 space-y-6 mt-0">
                {candidato.diagnostico?.contenido ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Diagnóstico
                      </CardTitle>
                      {candidato.diagnostico.updated_at && (
                        <p className="text-sm text-muted-foreground">
                          Última actualización: {new Date(candidato.diagnostico.updated_at).toLocaleDateString('es-CO')}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={candidato.diagnostico.contenido} />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay diagnóstico disponible para este candidato
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab Evaluaciones */}
              <TabsContent value="evaluaciones" className="p-6 space-y-6 mt-0">
                {candidato.evaluaciones_detalle && candidato.evaluaciones_detalle.length > 0 ? (
                  <>
                    {/* Resumen de puntajes promedio */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Resumen de Evaluaciones</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-primary">{candidato.evaluaciones_detalle.length}</p>
                            <p className="text-sm text-muted-foreground">Evaluaciones</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className={`text-2xl font-bold ${getScoreColor(
                              candidato.evaluaciones_detalle.reduce((a, b) => a + (b.puntaje || 0), 0) / candidato.evaluaciones_detalle.length
                            )}`}>
                              {(candidato.evaluaciones_detalle.reduce((a, b) => a + (b.puntaje || 0), 0) / candidato.evaluaciones_detalle.length).toFixed(1)}
                            </p>
                            <p className="text-sm text-muted-foreground">Puntaje Promedio</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold">
                              {candidato.evaluaciones_detalle.filter(e => e.tipo_evaluacion === 'ccc').length}
                            </p>
                            <p className="text-sm text-muted-foreground">CCC</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold">
                              {candidato.evaluaciones_detalle.filter(e => e.tipo_evaluacion === 'jurado').length}
                            </p>
                            <p className="text-sm text-muted-foreground">Jurado</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lista de evaluaciones */}
                    {candidato.evaluaciones_detalle.map((evaluacion, index) => (
                      <Card key={evaluacion.id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <ClipboardList className="h-5 w-5" />
                              Evaluación {index + 1}
                              <Badge variant={evaluacion.tipo_evaluacion === 'ccc' ? 'secondary' : 'default'}>
                                {evaluacion.tipo_evaluacion.toUpperCase()}
                              </Badge>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {evaluacion.nivel && (
                                <Badge variant="outline">{evaluacion.nivel}</Badge>
                              )}
                              <span className={`text-xl font-bold ${getScoreColor(evaluacion.puntaje)}`}>
                                {evaluacion.puntaje || 0}/100
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(evaluacion.created_at).toLocaleDateString('es-CO')}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Puntajes */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Impacto</p>
                              <p className="text-lg font-semibold">{evaluacion.puntaje_impacto || 0}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Equipo</p>
                              <p className="text-lg font-semibold">{evaluacion.puntaje_equipo || 0}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Innovación/Tecnología</p>
                              <p className="text-lg font-semibold">{evaluacion.puntaje_innovacion_tecnologia || 0}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Ventas</p>
                              <p className="text-lg font-semibold">{evaluacion.puntaje_ventas || 0}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Proyección/Financiación</p>
                              <p className="text-lg font-semibold">{evaluacion.puntaje_proyeccion_financiacion || 0}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Referido Regional</p>
                              <p className="text-lg font-semibold">{evaluacion.puntaje_referido_regional || 0}</p>
                            </div>
                          </div>

                          {/* Requisitos Habilitantes */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Requisitos Habilitantes</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={evaluacion.cumple_ubicacion ? "default" : "destructive"}>
                                {evaluacion.cumple_ubicacion ? "✓" : "✗"} Ubicación
                              </Badge>
                              <Badge variant={evaluacion.cumple_equipo_minimo ? "default" : "destructive"}>
                                {evaluacion.cumple_equipo_minimo ? "✓" : "✗"} Equipo Mínimo
                              </Badge>
                              <Badge variant={evaluacion.cumple_dedicacion ? "default" : "destructive"}>
                                {evaluacion.cumple_dedicacion ? "✓" : "✗"} Dedicación
                              </Badge>
                              <Badge variant={evaluacion.cumple_interes ? "default" : "destructive"}>
                                {evaluacion.cumple_interes ? "✓" : "✗"} Interés
                              </Badge>
                            </div>
                          </div>

                          {/* Retroalimentación textual */}
                          {(evaluacion.impacto_texto || evaluacion.equipo_texto || evaluacion.innovacion_tecnologia_texto || 
                            evaluacion.ventas_texto || evaluacion.proyeccion_financiacion_texto || evaluacion.comentarios_adicionales) && (
                            <div className="space-y-3 pt-4 border-t">
                              <p className="text-sm font-medium">Retroalimentación</p>
                              {evaluacion.impacto_texto && <TextBlock label="Impacto" value={evaluacion.impacto_texto} />}
                              {evaluacion.equipo_texto && <TextBlock label="Equipo" value={evaluacion.equipo_texto} />}
                              {evaluacion.innovacion_tecnologia_texto && <TextBlock label="Innovación/Tecnología" value={evaluacion.innovacion_tecnologia_texto} />}
                              {evaluacion.ventas_texto && <TextBlock label="Ventas" value={evaluacion.ventas_texto} />}
                              {evaluacion.proyeccion_financiacion_texto && <TextBlock label="Proyección/Financiación" value={evaluacion.proyeccion_financiacion_texto} />}
                              {evaluacion.comentarios_adicionales && <TextBlock label="Comentarios Adicionales" value={evaluacion.comentarios_adicionales} />}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay evaluaciones disponibles para este candidato
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ExportOptionsModal
        candidato={candidato}
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </>
  );
};
