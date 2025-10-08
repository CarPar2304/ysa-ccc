import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Send, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ScoreInput } from "../evaluation/ScoreInput";
import { RequirementBadge } from "../evaluation/RequirementBadge";
import { EvaluationSummary } from "../evaluation/EvaluationSummary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const evaluationSchema = z.object({
  puntaje_impacto: z.number().min(0).max(30),
  impacto_texto: z.string().min(10, "Debes agregar comentarios sobre el impacto"),
  puntaje_equipo: z.number().min(0).max(25),
  equipo_texto: z.string().min(10, "Debes agregar comentarios sobre el equipo"),
  puntaje_innovacion_tecnologia: z.number().min(0).max(25),
  innovacion_tecnologia_texto: z.string().min(10, "Debes agregar comentarios sobre innovación"),
  puntaje_ventas: z.number().min(0).max(15),
  ventas_texto: z.string().min(10, "Debes agregar comentarios sobre ventas"),
  comentarios_adicionales: z.string().optional(),
});

type EvaluationFormData = z.infer<typeof evaluationSchema>;

interface EvaluationFormProps {
  emprendimientoId: string;
  onSuccess?: () => void;
}

export const EvaluationForm = ({ emprendimientoId, onSuccess }: EvaluationFormProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [isJurado, setIsJurado] = useState(false);
  const [requirements, setRequirements] = useState({
    cumple_ubicacion: true,
    cumple_equipo_minimo: false,
    cumple_dedicacion: false,
    cumple_interes: false,
  });
  const [puntajeReferido, setPuntajeReferido] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      puntaje_impacto: 0,
      impacto_texto: "",
      puntaje_equipo: 0,
      equipo_texto: "",
      puntaje_innovacion_tecnologia: 0,
      innovacion_tecnologia_texto: "",
      puntaje_ventas: 0,
      ventas_texto: "",
      comentarios_adicionales: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, [emprendimientoId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar si es jurado para este emprendimiento
      const { data: assignment } = await supabase
        .from("mentor_emprendimiento_assignments")
        .select("es_jurado")
        .eq("mentor_id", user.id)
        .eq("emprendimiento_id", emprendimientoId)
        .eq("activo", true)
        .maybeSingle();

      setIsJurado(assignment?.es_jurado || false);

      // Si es jurado, obtener diagnóstico
      if (assignment?.es_jurado) {
        const { data: diagData } = await supabase
          .from("diagnosticos")
          .select("*")
          .eq("emprendimiento_id", emprendimientoId)
          .maybeSingle();

        setDiagnostico(diagData);
      }

      // Obtener datos del emprendimiento
      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select(`
          *,
          usuarios:user_id (municipio)
        `)
        .eq("id", emprendimientoId)
        .single();

      // Obtener datos del equipo
      const { data: equipo } = await supabase
        .from("equipos")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .maybeSingle();

      // Calcular requisitos habilitantes
      const cumple_equipo_minimo = (equipo?.equipo_total || 0) >= 2;
      const cumple_dedicacion = (equipo?.personas_full_time || 0) >= 1;
      const cumple_interes = !!emprendimiento?.descripcion;
      const municipio = emprendimiento?.usuarios?.municipio?.toUpperCase();
      const puntaje_referido = municipio && municipio !== "CALI" ? 5 : 0;

      setRequirements({
        cumple_ubicacion: true,
        cumple_equipo_minimo,
        cumple_dedicacion,
        cumple_interes,
      });
      setPuntajeReferido(puntaje_referido);

      // Buscar evaluación existente
      const { data: evaluation } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .eq("mentor_id", user.id)
        .maybeSingle();

      if (evaluation) {
        setExistingEvaluation(evaluation);
        form.reset({
          puntaje_impacto: evaluation.puntaje_impacto || 0,
          impacto_texto: evaluation.impacto_texto || "",
          puntaje_equipo: evaluation.puntaje_equipo || 0,
          equipo_texto: evaluation.equipo_texto || "",
          puntaje_innovacion_tecnologia: evaluation.puntaje_innovacion_tecnologia || 0,
          innovacion_tecnologia_texto: evaluation.innovacion_tecnologia_texto || "",
          puntaje_ventas: evaluation.puntaje_ventas || 0,
          ventas_texto: evaluation.ventas_texto || "",
          comentarios_adicionales: evaluation.comentarios_adicionales || "",
        });
      }
    } catch (error) {
      console.error("Error fetching evaluation data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (estado: 'borrador' | 'enviada') => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const formData = form.getValues();
      const puntajeTotal = 
        formData.puntaje_impacto + 
        formData.puntaje_equipo + 
        formData.puntaje_innovacion_tecnologia + 
        formData.puntaje_ventas + 
        puntajeReferido;

      const evaluationData = {
        emprendimiento_id: emprendimientoId,
        mentor_id: user.id,
        puntaje_impacto: formData.puntaje_impacto,
        impacto_texto: formData.impacto_texto,
        puntaje_equipo: formData.puntaje_equipo,
        equipo_texto: formData.equipo_texto,
        puntaje_innovacion_tecnologia: formData.puntaje_innovacion_tecnologia,
        innovacion_tecnologia_texto: formData.innovacion_tecnologia_texto,
        puntaje_ventas: formData.puntaje_ventas,
        ventas_texto: formData.ventas_texto,
        puntaje_referido_regional: puntajeReferido,
        puntaje: puntajeTotal,
        comentarios_adicionales: formData.comentarios_adicionales,
        cumple_ubicacion: requirements.cumple_ubicacion,
        cumple_equipo_minimo: requirements.cumple_equipo_minimo,
        cumple_dedicacion: requirements.cumple_dedicacion,
        cumple_interes: requirements.cumple_interes,
        estado,
        puede_editar: estado === 'borrador',
      };

      let error;
      if (existingEvaluation) {
        ({ error } = await supabase
          .from("evaluaciones")
          .update(evaluationData)
          .eq("id", existingEvaluation.id));
      } else {
        ({ error } = await supabase
          .from("evaluaciones")
          .insert(evaluationData));
      }

      if (error) throw error;

      toast({
        title: "Éxito",
        description: estado === 'enviada' 
          ? "Evaluación enviada correctamente" 
          : "Borrador guardado correctamente",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la evaluación",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (data: EvaluationFormData) => {
    setShowConfirmDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canEdit = !existingEvaluation || existingEvaluation.puede_editar;
  const isReadOnly = !canEdit;

  const watchedValues = form.watch();
  const currentTotal = 
    watchedValues.puntaje_impacto + 
    watchedValues.puntaje_equipo + 
    watchedValues.puntaje_innovacion_tecnologia + 
    watchedValues.puntaje_ventas + 
    puntajeReferido;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Diagnóstico (solo para jurados) */}
        {isJurado && diagnostico && (
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <CardTitle>Diagnóstico del Emprendimiento</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground">Click para expandir/contraer</span>
                  </div>
                  <CardDescription>
                    Información de contexto para la evaluación
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-6 prose-headings:mb-3 prose-p:my-3 prose-li:my-1 prose-table:my-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{diagnostico.contenido}</ReactMarkdown>
                  </div>
                  <p className="text-xs text-muted-foreground mt-6 pt-4 border-t">
                    Última actualización: {new Date(diagnostico.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {isReadOnly && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">
              Esta evaluación ya fue enviada y no puede ser editada. Contacta al administrador si necesitas hacer cambios.
            </p>
          </div>
        )}

        {/* Requisitos Habilitantes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">1. Requisitos Habilitantes</h3>
          <div className="space-y-3">
            <RequirementBadge 
              label="Emprendedor ubicado en jurisdicción de Cámara de Comercio de Cali o suroccidente colombiano"
              cumple={requirements.cumple_ubicacion}
            />
            <RequirementBadge 
              label="Equipo de trabajo de al menos 2 personas"
              cumple={requirements.cumple_equipo_minimo}
            />
            <RequirementBadge 
              label="Al menos 1 persona dedicada al 100%"
              cumple={requirements.cumple_dedicacion}
            />
            <RequirementBadge 
              label="Interés en crear negocio innovador de base tecnológica/científica"
              cumple={requirements.cumple_interes}
            />
          </div>
          {(!requirements.cumple_equipo_minimo || !requirements.cumple_dedicacion || !requirements.cumple_interes) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Algunos requisitos habilitantes no se cumplen. Esto puede afectar la elegibilidad del emprendimiento.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Requisitos Calificables */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">2. Requisitos Calificables</h3>

          {/* Impacto */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="puntaje_impacto"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ScoreInput
                      label="Impacto"
                      description="Evalúa si la idea de negocio es sostenible, social y ambientalmente relevante, y capaz de generar un desarrollo inclusivo y positivo en la comunidad."
                      maxScore={30}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="impacto_texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios sobre Impacto *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe tu evaluación del impacto del emprendimiento..."
                      className="min-h-[100px]"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Equipo */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="puntaje_equipo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ScoreInput
                      label="Equipo"
                      description="Evalúa el equipo para ejecutar la visión del emprendimiento. La dedicación es determinante para el escalamiento."
                      maxScore={25}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="equipo_texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios sobre Equipo *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe tu evaluación del equipo..."
                      className="min-h-[100px]"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Innovación y Tecnología */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="puntaje_innovacion_tecnologia"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ScoreInput
                      label="Innovación y Tecnología"
                      description="Evalúa la capacidad de crear productos o servicios que puedan diferenciarse en el mercado y que sean escalables."
                      maxScore={25}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="innovacion_tecnologia_texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios sobre Innovación y Tecnología *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe tu evaluación de la innovación y tecnología..."
                      className="min-h-[100px]"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Ventas */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="puntaje_ventas"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ScoreInput
                      label="Ventas"
                      description="Evalúa la viabilidad del modelo de negocio y su aceptación en el mercado para una demanda sostenida."
                      maxScore={15}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ventas_texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios sobre Ventas *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe tu evaluación de las ventas y modelo de negocio..."
                      className="min-h-[100px]"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Referido Regional - Automático */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Referido Regional</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Puntaje automático para emprendimientos fuera de Cali
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">
                {puntajeReferido} / 5
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Comentarios Adicionales */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">3. Comentarios Adicionales</h3>
          <FormField
            control={form.control}
            name="comentarios_adicionales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones Generales</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Agrega cualquier comentario adicional que consideres relevante..."
                    className="min-h-[120px]"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Resumen */}
        <EvaluationSummary
          puntajeImpacto={watchedValues.puntaje_impacto}
          puntajeEquipo={watchedValues.puntaje_equipo}
          puntajeInnovacion={watchedValues.puntaje_innovacion_tecnologia}
          puntajeVentas={watchedValues.puntaje_ventas}
          puntajeReferido={puntajeReferido}
        />

        {/* Botones de Acción */}
        {!isReadOnly && (
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave('borrador')}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Borrador
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Evaluación
            </Button>
          </div>
        )}

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Enviar Evaluación?</AlertDialogTitle>
              <AlertDialogDescription>
                Una vez enviada, la evaluación no podrá ser editada sin autorización del administrador.
                <br /><br />
                <strong>Puntaje Total: {currentTotal} / 100 puntos</strong>
                <br /><br />
                ¿Estás seguro de que deseas enviar esta evaluación?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowConfirmDialog(false);
                handleSave('enviada');
              }}>
                Confirmar y Enviar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  );
};
