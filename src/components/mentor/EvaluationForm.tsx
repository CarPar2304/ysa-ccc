import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScoreInput } from "../evaluation/ScoreInput";
import { RequirementBadge } from "../evaluation/RequirementBadge";
import { EvaluationSummary } from "../evaluation/EvaluationSummary";
import { NivelSelector } from "../evaluation/NivelSelector";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";

const evaluationSchema = z.object({
  // Criterios calificables (editables para jurado)
  puntaje_impacto: z.number().min(0).max(30),
  impacto_texto: z.string().min(10, "Debes agregar comentarios sobre el impacto"),
  puntaje_equipo: z.number().min(0).max(25),
  equipo_texto: z.string().min(10, "Debes agregar comentarios sobre el equipo"),
  puntaje_innovacion_tecnologia: z.number().min(0).max(25),
  innovacion_tecnologia_texto: z.string().min(10, "Debes agregar comentarios sobre innovación"),
  puntaje_ventas: z.number().min(0).max(15),
  ventas_texto: z.string().min(10, "Debes agregar comentarios sobre ventas"),
  puntaje_proyeccion_financiacion: z.number().min(0).max(5),
  proyeccion_financiacion_texto: z.string().min(10, "Debes agregar comentarios sobre proyección y financiación"),
  
  comentarios_adicionales: z.string().optional(),
});

// Función para calcular el nivel automáticamente basado en el puntaje (valores del enum)
const calculateNivel = (puntaje: number): "Starter" | "Growth" | "Scale" => {
  if (puntaje >= 0 && puntaje <= 50) return "Starter";
  if (puntaje > 50 && puntaje <= 80) return "Growth";
  return "Scale";
};

// Mapear valores del enum a etiquetas en español para UI
const getNivelLabel = (nivel: "Starter" | "Growth" | "Scale"): string => {
  const labels = {
    "Starter": "Bajo",
    "Growth": "Medio",
    "Scale": "Alto"
  };
  return labels[nivel];
};

type EvaluationFormData = z.infer<typeof evaluationSchema>;

interface EvaluationFormProps {
  emprendimientoId: string;
  cccEvaluation?: any;
  onSuccess?: () => void;
}

export const EvaluationForm = ({ emprendimientoId, cccEvaluation, onSuccess }: EvaluationFormProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCccReference, setShowCccReference] = useState(false);
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
      puntaje_proyeccion_financiacion: 0,
      proyeccion_financiacion_texto: "",
      comentarios_adicionales: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, [emprendimientoId]);

  // Pre-cargar valores desde cccEvaluation cuando esté disponible
  useEffect(() => {
    if (cccEvaluation && !existingEvaluation) {
      console.log("Pre-cargando valores desde evaluación CCC:", cccEvaluation);
      form.setValue("puntaje_impacto", cccEvaluation.puntaje_impacto || 0);
      form.setValue("puntaje_equipo", cccEvaluation.puntaje_equipo || 0);
      form.setValue("puntaje_innovacion_tecnologia", cccEvaluation.puntaje_innovacion_tecnologia || 0);
      form.setValue("puntaje_ventas", cccEvaluation.puntaje_ventas || 0);
      form.setValue("puntaje_proyeccion_financiacion", cccEvaluation.puntaje_proyeccion_financiacion || 0);
    }
  }, [cccEvaluation, existingEvaluation]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar evaluación existente del jurado
      const { data: evaluation } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .eq("mentor_id", user.id)
        .eq("tipo_evaluacion", "jurado")
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
          puntaje_proyeccion_financiacion: evaluation.puntaje_proyeccion_financiacion || 0,
          proyeccion_financiacion_texto: evaluation.proyeccion_financiacion_texto || "",
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
      
      // Calcular puntaje total de requisitos calificables (sin referido regional para jurado)
      const puntajeCalificables = 
        formData.puntaje_impacto + 
        formData.puntaje_equipo + 
        formData.puntaje_innovacion_tecnologia + 
        formData.puntaje_ventas + 
        formData.puntaje_proyeccion_financiacion;
      
      // Agregar puntaje de referido regional desde CCC
      const puntajeReferidoRegional = cccEvaluation?.puntaje_referido_regional || 0;
      const puntajeTotal = puntajeCalificables + puntajeReferidoRegional;
      
      // Calcular nivel automáticamente
      const nivelCalculado = calculateNivel(puntajeTotal);

      const evaluationData = {
        emprendimiento_id: emprendimientoId,
        mentor_id: user.id,
        tipo_evaluacion: 'jurado',
        nivel: nivelCalculado, // Nivel calculado automáticamente
        evaluacion_base_id: cccEvaluation?.id || null,
        puntaje_impacto: formData.puntaje_impacto,
        impacto_texto: formData.impacto_texto,
        puntaje_equipo: formData.puntaje_equipo,
        equipo_texto: formData.equipo_texto,
        puntaje_innovacion_tecnologia: formData.puntaje_innovacion_tecnologia,
        innovacion_tecnologia_texto: formData.innovacion_tecnologia_texto,
        puntaje_ventas: formData.puntaje_ventas,
        ventas_texto: formData.ventas_texto,
        puntaje_proyeccion_financiacion: formData.puntaje_proyeccion_financiacion,
        proyeccion_financiacion_texto: formData.proyeccion_financiacion_texto,
        puntaje_referido_regional: puntajeReferidoRegional, // Desde CCC
        referido_regional: cccEvaluation?.referido_regional || null, // Desde CCC
        puntaje: puntajeTotal,
        comentarios_adicionales: formData.comentarios_adicionales,
        // Requisitos habilitantes desde CCC
        cumple_ubicacion: cccEvaluation?.cumple_ubicacion ?? true,
        cumple_equipo_minimo: cccEvaluation?.cumple_equipo_minimo ?? false,
        cumple_dedicacion: cccEvaluation?.cumple_dedicacion ?? false,
        cumple_interes: cccEvaluation?.cumple_interes ?? false,
        estado,
        puede_editar: estado === 'borrador',
      };

      let error;
      if (existingEvaluation) {
        ({ error } = await supabase
          .from("evaluaciones")
          .update(evaluationData as any)
          .eq("id", existingEvaluation.id));
      } else {
        ({ error } = await supabase
          .from("evaluaciones")
          .insert(evaluationData as any));
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

  // Validar que existe evaluación CCC antes de mostrar el formulario
  if (!cccEvaluation) {
    return (
      <div className="p-6 border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          ⚠️ Evaluación CCC no disponible
        </h3>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Este emprendimiento aún no tiene una evaluación CCC de referencia. 
          Contacta al administrador para que cree primero la evaluación CCC antes de poder evaluar como jurado.
        </p>
      </div>
    );
  }

  const canEdit = !existingEvaluation || existingEvaluation.puede_editar;
  const isReadOnly = !canEdit;

  const watchedValues = form.watch();
  
  // Calcular puntaje total de requisitos calificables
  const puntajeCalificables = 
    watchedValues.puntaje_impacto + 
    watchedValues.puntaje_equipo + 
    watchedValues.puntaje_innovacion_tecnologia + 
    watchedValues.puntaje_ventas + 
    watchedValues.puntaje_proyeccion_financiacion;
  
  // Agregar puntaje de referido regional desde CCC
  const puntajeReferidoRegional = cccEvaluation?.puntaje_referido_regional || 0;
  const currentTotal = puntajeCalificables + puntajeReferidoRegional;
  
  // Calcular nivel basado en puntaje total
  const nivelCalculado = calculateNivel(currentTotal);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {isReadOnly && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">
              Esta evaluación ya fue enviada y no puede ser editada. Contacta al administrador si necesitas hacer cambios.
            </p>
          </div>
        )}

        {/* Referencia a evaluación CCC - Visible por defecto */}
        {cccEvaluation && !isReadOnly && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Evaluación CCC de Referencia</CardTitle>
              </div>
              <CardDescription>
                Los valores de esta evaluación se usarán como base. Los puntajes de requisitos calificables están pre-cargados para tu evaluación.
                <br />
                <strong>Nota:</strong> Los requisitos habilitantes, el referido regional y el nivel son de solo lectura y provienen de esta evaluación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Puntaje Total</p>
                  <p className="text-2xl font-bold text-primary">{cccEvaluation.puntaje || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Impacto</p>
                  <p className="text-lg font-semibold">{cccEvaluation.puntaje_impacto || 0} / 30</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Equipo</p>
                  <p className="text-lg font-semibold">{cccEvaluation.puntaje_equipo || 0} / 25</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Innovación</p>
                  <p className="text-lg font-semibold">{cccEvaluation.puntaje_innovacion_tecnologia || 0} / 25</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ventas</p>
                  <p className="text-lg font-semibold">{cccEvaluation.puntaje_ventas || 0} / 15</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Proyección</p>
                  <p className="text-lg font-semibold">{cccEvaluation.puntaje_proyeccion_financiacion || 0} / 5</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Referido Regional</p>
                  <p className="text-lg font-semibold">{cccEvaluation.puntaje_referido_regional || 0} / 5</p>
                </div>
              </div>
              
              {/* Requisitos Habilitantes de CCC */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Requisitos Habilitantes (desde CCC):</p>
                <div className="grid gap-2">
                  <RequirementBadge 
                    label="Ubicación en jurisdicción de CCC o suroccidente"
                    cumple={cccEvaluation.cumple_ubicacion ?? true}
                  />
                  <RequirementBadge 
                    label="Equipo de trabajo de al menos 2 personas"
                    cumple={cccEvaluation.cumple_equipo_minimo ?? false}
                  />
                  <RequirementBadge 
                    label="Al menos 1 persona dedicada al 100%"
                    cumple={cccEvaluation.cumple_dedicacion ?? false}
                  />
                  <RequirementBadge 
                    label="Interés en crear negocio innovador de base tecnológica"
                    cumple={cccEvaluation.cumple_interes ?? false}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nivel de Evaluación - Calculado Automáticamente */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Nivel de Evaluación</h3>
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nivel calculado automáticamente según puntaje:</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>• Bajo: 0-50 puntos</li>
                  <li>• Medio: 51-80 puntos</li>
                  <li>• Alto: 81-100 puntos</li>
                </ul>
              </div>
              <Badge 
                variant="outline" 
                className={`capitalize text-lg px-4 py-2 ${
                  nivelCalculado === 'Scale' ? 'border-green-500 text-green-700 dark:text-green-400' :
                  nivelCalculado === 'Growth' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' :
                  'border-red-500 text-red-700 dark:text-red-400'
                }`}
              >
                {getNivelLabel(nivelCalculado)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Puntaje actual: <strong>{currentTotal} / 100</strong>
            </p>
          </div>
        </div>

        <Separator />

        {/* Requisitos Habilitantes - Solo Lectura desde CCC */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">1. Requisitos Habilitantes</h3>
          <div className="p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-3">
              <Info className="h-4 w-4 inline mr-1" />
              Estos requisitos provienen de la evaluación CCC y son de solo lectura para el jurado.
            </p>
            <div className="grid gap-2">
              <RequirementBadge 
                label="Emprendedor ubicado en jurisdicción de CCC o suroccidente colombiano"
                cumple={cccEvaluation?.cumple_ubicacion ?? true}
              />
              <RequirementBadge 
                label="Equipo de trabajo de al menos 2 personas"
                cumple={cccEvaluation?.cumple_equipo_minimo ?? false}
              />
              <RequirementBadge 
                label="Al menos 1 persona dedicada al 100%"
                cumple={cccEvaluation?.cumple_dedicacion ?? false}
              />
              <RequirementBadge 
                label="Interés en crear negocio innovador de base tecnológica/científica"
                cumple={cccEvaluation?.cumple_interes ?? false}
              />
            </div>
            {(!cccEvaluation?.cumple_equipo_minimo || !cccEvaluation?.cumple_dedicacion || !cccEvaluation?.cumple_interes || !cccEvaluation?.cumple_ubicacion) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ Algunos requisitos habilitantes no se cumplen según la evaluación CCC.
                </p>
              </div>
            )}
          </div>
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

          {/* Proyección y Financiación */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="puntaje_proyeccion_financiacion"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ScoreInput
                      label="Proyección y Financiación"
                      description="Evalúa las proyecciones de crecimiento, planes de financiamiento y sostenibilidad financiera del emprendimiento."
                      maxScore={5}
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
              name="proyeccion_financiacion_texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios sobre Proyección y Financiación *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe tu evaluación de las proyecciones y financiación..."
                      className="min-h-[100px]"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Referido Regional - Solo Lectura desde CCC */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1">
                <Label className="text-base font-semibold">Referido Regional (Solo Lectura)</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Este puntaje proviene de la evaluación CCC y no es editable para el jurado.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-background rounded-md border">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Puntaje asignado:</p>
                <p className="text-2xl font-bold">{puntajeReferidoRegional} / 5</p>
              </div>
            </div>
            {cccEvaluation?.referido_regional && (
              <div className="p-3 bg-background rounded-md border">
                <p className="text-sm text-muted-foreground mb-1">Comentarios de CCC:</p>
                <p className="text-sm">{cccEvaluation.referido_regional}</p>
              </div>
            )}
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
          puntajeProyeccionFinanciacion={watchedValues.puntaje_proyeccion_financiacion}
          puntajeReferido={puntajeReferidoRegional}
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
