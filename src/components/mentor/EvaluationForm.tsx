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
  // Criterios habilitantes - ahora manuales
  cumple_ubicacion: z.boolean(),
  cumple_equipo_minimo: z.boolean(),
  cumple_dedicacion: z.boolean(),
  cumple_interes: z.boolean(),
  
  // Nivel de evaluación
  nivel: z.enum(["alto", "medio", "bajo"], {
    required_error: "Debes seleccionar un nivel de evaluación"
  }),
  
  // Criterios calificables
  puntaje_impacto: z.number().min(0).max(30),
  impacto_texto: z.string().min(10, "Debes agregar comentarios sobre el impacto"),
  puntaje_equipo: z.number().min(0).max(25),
  equipo_texto: z.string().min(10, "Debes agregar comentarios sobre el equipo"),
  puntaje_innovacion_tecnologia: z.number().min(0).max(25),
  innovacion_tecnologia_texto: z.string().min(10, "Debes agregar comentarios sobre innovación"),
  puntaje_ventas: z.number().min(0).max(15),
  ventas_texto: z.string().min(10, "Debes agregar comentarios sobre ventas"),
  
  // Referido regional - ahora manual
  puntaje_referido_regional: z.number().min(0).max(5),
  referido_regional: z.string().optional(),
  
  comentarios_adicionales: z.string().optional(),
});

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
      cumple_ubicacion: true,
      cumple_equipo_minimo: false,
      cumple_dedicacion: false,
      cumple_interes: false,
      nivel: cccEvaluation?.nivel || "medio",
      puntaje_impacto: cccEvaluation?.puntaje_impacto || 0,
      impacto_texto: "",
      puntaje_equipo: cccEvaluation?.puntaje_equipo || 0,
      equipo_texto: "",
      puntaje_innovacion_tecnologia: cccEvaluation?.puntaje_innovacion_tecnologia || 0,
      innovacion_tecnologia_texto: "",
      puntaje_ventas: cccEvaluation?.puntaje_ventas || 0,
      ventas_texto: "",
      puntaje_referido_regional: cccEvaluation?.puntaje_referido_regional || 0,
      referido_regional: "",
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
          cumple_ubicacion: evaluation.cumple_ubicacion ?? true,
          cumple_equipo_minimo: evaluation.cumple_equipo_minimo ?? false,
          cumple_dedicacion: evaluation.cumple_dedicacion ?? false,
          cumple_interes: evaluation.cumple_interes ?? false,
          nivel: evaluation.nivel || cccEvaluation?.nivel || "medio",
          puntaje_impacto: evaluation.puntaje_impacto || 0,
          impacto_texto: evaluation.impacto_texto || "",
          puntaje_equipo: evaluation.puntaje_equipo || 0,
          equipo_texto: evaluation.equipo_texto || "",
          puntaje_innovacion_tecnologia: evaluation.puntaje_innovacion_tecnologia || 0,
          innovacion_tecnologia_texto: evaluation.innovacion_tecnologia_texto || "",
          puntaje_ventas: evaluation.puntaje_ventas || 0,
          ventas_texto: evaluation.ventas_texto || "",
          puntaje_referido_regional: evaluation.puntaje_referido_regional || 0,
          referido_regional: evaluation.referido_regional || "",
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
        formData.puntaje_referido_regional;

      const evaluationData = {
        emprendimiento_id: emprendimientoId,
        mentor_id: user.id,
        tipo_evaluacion: 'jurado',
        nivel: formData.nivel,
        evaluacion_base_id: cccEvaluation?.id || null,
        puntaje_impacto: formData.puntaje_impacto,
        impacto_texto: formData.impacto_texto,
        puntaje_equipo: formData.puntaje_equipo,
        equipo_texto: formData.equipo_texto,
        puntaje_innovacion_tecnologia: formData.puntaje_innovacion_tecnologia,
        innovacion_tecnologia_texto: formData.innovacion_tecnologia_texto,
        puntaje_ventas: formData.puntaje_ventas,
        ventas_texto: formData.ventas_texto,
        puntaje_referido_regional: formData.puntaje_referido_regional,
        referido_regional: formData.referido_regional,
        puntaje: puntajeTotal,
        comentarios_adicionales: formData.comentarios_adicionales,
        cumple_ubicacion: formData.cumple_ubicacion,
        cumple_equipo_minimo: formData.cumple_equipo_minimo,
        cumple_dedicacion: formData.cumple_dedicacion,
        cumple_interes: formData.cumple_interes,
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

  const canEdit = !existingEvaluation || existingEvaluation.puede_editar;
  const isReadOnly = !canEdit;

  const watchedValues = form.watch();
  const currentTotal = 
    watchedValues.puntaje_impacto + 
    watchedValues.puntaje_equipo + 
    watchedValues.puntaje_innovacion_tecnologia + 
    watchedValues.puntaje_ventas + 
    watchedValues.puntaje_referido_regional;

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

        {/* Referencia a evaluación CCC */}
        {cccEvaluation && !isReadOnly && (
          <Collapsible open={showCccReference} onOpenChange={setShowCccReference}>
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Evaluación CCC de Referencia</CardTitle>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showCccReference ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CardDescription>
                  Esta es la evaluación preliminar automática. Puedes usarla como referencia y modificar los puntajes si lo consideras necesario.
                </CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-2">
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
                      <p className="text-sm text-muted-foreground">Referido</p>
                      <p className="text-lg font-semibold">{cccEvaluation.puntaje_referido_regional || 0} / 5</p>
                    </div>
                  </div>
                  {cccEvaluation.nivel && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Nivel asignado:</p>
                      <Badge variant="outline" className="capitalize mt-1">{cccEvaluation.nivel}</Badge>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Nivel de Evaluación */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Nivel de Evaluación</h3>
          <FormField
            control={form.control}
            name="nivel"
            render={({ field }) => (
              <NivelSelector 
                value={field.value} 
                onChange={field.onChange}
                disabled={isReadOnly}
              />
            )}
          />
        </div>

        <Separator />

        {/* Requisitos Habilitantes - Ahora Editables */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">1. Requisitos Habilitantes</h3>
          <p className="text-sm text-muted-foreground">Evalúa manualmente cada criterio habilitante</p>
          
          <div className="space-y-4">
            {/* Ubicación */}
            <FormField
              control={form.control}
              name="cumple_ubicacion"
              render={({ field }) => (
                <FormItem className="p-4 border rounded-lg space-y-3">
                  <FormLabel>Emprendedor ubicado en jurisdicción de Cámara de Comercio de Cali o suroccidente colombiano</FormLabel>
                  <FormControl>
                    <RadioGroup
                      disabled={isReadOnly}
                      value={field.value ? "true" : "false"}
                      onValueChange={(value) => field.onChange(value === "true")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="ubicacion-cumple" />
                        <Label htmlFor="ubicacion-cumple" className="cursor-pointer">Cumple</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="ubicacion-no-cumple" />
                        <Label htmlFor="ubicacion-no-cumple" className="cursor-pointer">No Cumple</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Equipo Mínimo */}
            <FormField
              control={form.control}
              name="cumple_equipo_minimo"
              render={({ field }) => (
                <FormItem className="p-4 border rounded-lg space-y-3">
                  <FormLabel>Equipo de trabajo de al menos 2 personas</FormLabel>
                  <FormControl>
                    <RadioGroup
                      disabled={isReadOnly}
                      value={field.value ? "true" : "false"}
                      onValueChange={(value) => field.onChange(value === "true")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="equipo-cumple" />
                        <Label htmlFor="equipo-cumple" className="cursor-pointer">Cumple</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="equipo-no-cumple" />
                        <Label htmlFor="equipo-no-cumple" className="cursor-pointer">No Cumple</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Dedicación */}
            <FormField
              control={form.control}
              name="cumple_dedicacion"
              render={({ field }) => (
                <FormItem className="p-4 border rounded-lg space-y-3">
                  <FormLabel>Al menos 1 persona dedicada al 100%</FormLabel>
                  <FormControl>
                    <RadioGroup
                      disabled={isReadOnly}
                      value={field.value ? "true" : "false"}
                      onValueChange={(value) => field.onChange(value === "true")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="dedicacion-cumple" />
                        <Label htmlFor="dedicacion-cumple" className="cursor-pointer">Cumple</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="dedicacion-no-cumple" />
                        <Label htmlFor="dedicacion-no-cumple" className="cursor-pointer">No Cumple</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Interés */}
            <FormField
              control={form.control}
              name="cumple_interes"
              render={({ field }) => (
                <FormItem className="p-4 border rounded-lg space-y-3">
                  <FormLabel>Interés en crear negocio innovador de base tecnológica/científica</FormLabel>
                  <FormControl>
                    <RadioGroup
                      disabled={isReadOnly}
                      value={field.value ? "true" : "false"}
                      onValueChange={(value) => field.onChange(value === "true")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="interes-cumple" />
                        <Label htmlFor="interes-cumple" className="cursor-pointer">Cumple</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="interes-no-cumple" />
                        <Label htmlFor="interes-no-cumple" className="cursor-pointer">No Cumple</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {(!watchedValues.cumple_equipo_minimo || !watchedValues.cumple_dedicacion || !watchedValues.cumple_interes || !watchedValues.cumple_ubicacion) && (
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

          {/* Referido Regional - Ahora Manual */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="puntaje_referido_regional"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ScoreInput
                      label="Referido Regional"
                      description="Puntaje para emprendimientos ubicados fuera de Cali (máximo 5 puntos)"
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
              name="referido_regional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios sobre Referido Regional</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Agrega observaciones sobre la ubicación del emprendimiento..."
                      className="min-h-[80px]"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          puntajeReferido={watchedValues.puntaje_referido_regional}
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
