import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, BookOpen, Pencil, Trash2, Lock, Edit, FileText } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import { usePendingTasks } from "@/hooks/usePendingTasks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ModuleEditor } from "@/components/lab/ModuleEditor";

interface Modulo {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracion: string | null;
  orden: number | null;
  activo: boolean;
  imagen_url: string | null;
  nivel: string | null;
}

const Lab = () => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNivel, setUserNivel] = useState<string | null>(null);
  const [editableModules, setEditableModules] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, isAdmin, isBeneficiario, isMentor, isStakeholder } = useUserRole();
  const { isApproved, loading: quotaLoading } = useQuotaStatus(userId);

  // Stakeholders can view all modules (all levels), but cannot edit/create anything
  const canEditModules = isAdmin;
  const isViewOnly = isStakeholder;

  // Get module IDs for pending tasks
  const moduleIds = useMemo(() => modulos.map((m) => m.id), [modulos]);
  const { pendingTasks } = usePendingTasks(isBeneficiario ? userId : null, moduleIds);

  useEffect(() => {
    if (isBeneficiario && userId) {
      fetchUserNivel();
    }
  }, [userId, isBeneficiario]);

  useEffect(() => {
    fetchModulos();
  }, [userId, isAdmin, isBeneficiario, userNivel]);

  useEffect(() => {
    if (isMentor && userId && modulos.length > 0) {
      checkEditableModules();
    }
  }, [isMentor, userId, modulos]);

  const fetchUserNivel = async () => {
    if (!userId) return;
    
    try {
      // Obtener el emprendimiento del usuario
      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!emprendimiento) return;

      // Obtener el nivel del cupo aprobado
      const { data: asignacion } = await supabase
        .from("asignacion_cupos")
        .select("nivel")
        .eq("emprendimiento_id", emprendimiento.id)
        .eq("estado", "aprobado")
        .maybeSingle();

      if (asignacion?.nivel) {
        setUserNivel(asignacion.nivel);
      }
    } catch (error) {
      console.error("Error fetching user nivel:", error);
    }
  };

  const fetchModulos = async () => {
    try {
      let query = supabase
        .from("modulos")
        .select("*")
        .order("orden", { ascending: true });

      // Stakeholders: see all active modules (all levels)
      // Beneficiarios: only see active modules for their level
      // Mentores: see all (filter inactive they can't edit later)
      // Admins: see all
      if (isBeneficiario) {
        query = query.eq("activo", true);
        
        // Filtrar por nivel si el usuario tiene un nivel asignado
        if (userNivel) {
          query = query.or(`nivel.eq.${userNivel},nivel.is.null`);
        }
      } else if (isStakeholder) {
        // Stakeholders see all active modules regardless of level
        query = query.eq("activo", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setModulos(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los módulos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModuloClick = (moduloId: string) => {
    navigate(`/lab/${moduloId}`);
  };

  const checkEditableModules = async () => {
    if (!userId) return;
    
    try {
      const editableIds = new Set<string>();
      
      // Verificar para cada módulo si el mentor puede editarlo
      await Promise.all(
        modulos.map(async (modulo) => {
          const { data, error } = await supabase
            .rpc("can_edit_modulo", {
              _user_id: userId,
              _modulo_id: modulo.id,
            });

          if (!error && data) {
            editableIds.add(modulo.id);
          }
        })
      );
      
      setEditableModules(editableIds);
    } catch (error) {
      console.error("Error checking editable modules:", error);
    }
  };

  const handleDeleteModulo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("modulos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Módulo eliminado",
        description: "El módulo se eliminó correctamente",
      });

      fetchModulos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || (isBeneficiario && quotaLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Stakeholders always have access, beneficiaries need quota approval
  if (isBeneficiario && !isApproved) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl p-6">
          <Card className="shadow-soft border-border">
            <CardContent className="p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Acceso Restringido</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tu cupo aún no ha sido aprobado. Una vez que el equipo administrativo apruebe tu solicitud, 
                podrás acceder a YSA Lab para explorar los módulos y clases del programa.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const niveles: Array<{ key: string; label: string }> = [
    { key: "Starter", label: "Starter" },
    { key: "Growth", label: "Growth" },
    { key: "Scale", label: "Scale" },
  ];

  const renderModuleCard = (modulo: Modulo) => (
    <Card
      key={modulo.id}
      className="group overflow-hidden shadow-medium border-border hover:shadow-strong transition-all cursor-pointer"
      onClick={() => handleModuloClick(modulo.id)}
    >
      <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: '1600 / 400' }}>
        {modulo.imagen_url ? (
          <img
            src={modulo.imagen_url}
            alt={modulo.titulo}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-16 w-16 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge
            className={modulo.activo
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground shadow-md"
            }
          >
            {modulo.activo ? "Disponible" : "Inactivo"}
          </Badge>
          {isMentor && editableModules.has(modulo.id) && (
            <Badge className="bg-accent text-accent-foreground shadow-md flex items-center gap-1">
              <Edit className="h-3 w-3" />
              Puedes editarlo
            </Badge>
          )}
        </div>
        {modulo.nivel && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-background/90 backdrop-blur-sm shadow-md">
              {modulo.nivel}
            </Badge>
          </div>
        )}
        {isAdmin && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <ModuleEditor
              modulo={modulo}
              onSuccess={fetchModulos}
              trigger={
                <Button variant="secondary" size="sm" className="shadow-md">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" size="sm" className="shadow-md">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El módulo y todas sus clases serán eliminados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => handleDeleteModulo(modulo.id, e)}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {modulo.titulo}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-2 text-muted-foreground">
          {modulo.descripcion || "Explora este módulo para aprender más"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {modulo.duracion && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{modulo.duracion}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>Ver clases</span>
          </div>
          {isBeneficiario && pendingTasks[modulo.id] > 0 && (
            <Badge variant="destructive" className="gap-1">
              <FileText className="h-3 w-3" />
              {pendingTasks[modulo.id]} tarea(s) pendiente(s)
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Classroom</h1>
              {userNivel && !isStakeholder && (
                <Badge variant="secondary" className="text-sm">
                  Nivel {userNivel}
                </Badge>
              )}
              {isStakeholder && (
                <Badge variant="outline" className="text-sm">
                  Modo Visualización
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Descubre los módulos del programa de incubación y desarrolla tu emprendimiento
            </p>
          </div>
          {canEditModules && (
            <ModuleEditor onSuccess={fetchModulos} />
          )}
        </div>

        {/* Stakeholder: sections by level */}
        {isStakeholder ? (
          <div className="space-y-10">
            {niveles.map(({ key, label }) => {
              const nivelModulos = modulos.filter((m) => m.nivel === key);
              return (
                <div key={key} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground">Nivel {label}</h2>
                    <Badge variant="secondary">{nivelModulos.length}</Badge>
                  </div>
                  {nivelModulos.length === 0 ? (
                    <Card className="shadow-soft border-border">
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">Aún no disponible</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {nivelModulos.map(renderModuleCard)}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Modules without level */}
            {modulos.filter((m) => !m.nivel).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">General</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {modulos.filter((m) => !m.nivel).map(renderModuleCard)}
                </div>
              </div>
            )}
          </div>
        ) : modulos.length === 0 ? (
          <Card className="shadow-soft border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No hay módulos disponibles en este momento</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Editable modules section for mentors */}
            {isMentor && editableModules.size > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-accent" />
                  <h2 className="text-2xl font-bold text-foreground">Módulos que puedes editar</h2>
                  <Badge variant="secondary">{editableModules.size}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Estos son los módulos donde tienes permisos de creación y edición de clases
                </p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {modulos.filter((m) => editableModules.has(m.id)).map(renderModuleCard)}
                </div>
              </div>
            )}

            {/* Other modules */}
            <div className="space-y-4">
              {isMentor && editableModules.size > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-8">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-2xl font-bold text-foreground">Otros módulos</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Módulos disponibles para consulta
                  </p>
                </>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {modulos
                  .filter((m) => !editableModules.has(m.id))
                  .filter((m) => isAdmin || m.activo)
                  .map(renderModuleCard)}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Lab;
