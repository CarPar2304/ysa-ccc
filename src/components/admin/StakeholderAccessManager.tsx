import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Filter, User, Loader2, LayoutGrid } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { STAKEHOLDER_PAGES } from "@/hooks/useStakeholderAccess";

interface StakeholderUser {
  user_id: string;
  nombres: string | null;
  apellidos: string | null;
  email: string | null;
}

interface StakeholderFilter {
  id: string;
  user_id: string;
  campo: string;
  valor: string;
  activo: boolean;
  created_at: string;
}

const CAMPO_LABELS: Record<string, string> = {
  municipio: "Municipio",
  departamento: "Departamento",
  ubicacion_principal: "Ubicación principal",
  nivel_definitivo: "Nivel definitivo",
};

const CAMPO_OPTIONS = Object.keys(CAMPO_LABELS);

export const StakeholderAccessManager = () => {
  const [stakeholders, setStakeholders] = useState<StakeholderUser[]>([]);
  const [filters, setFilters] = useState<StakeholderFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStakeholder, setSelectedStakeholder] = useState<string | null>(null);
  const [newCampo, setNewCampo] = useState("");
  const [newValor, setNewValor] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchStakeholders();
  }, []);

  useEffect(() => {
    if (selectedStakeholder) {
      fetchFilters(selectedStakeholder);
    }
  }, [selectedStakeholder]);

  useEffect(() => {
    if (newCampo) {
      fetchSuggestions(newCampo);
    } else {
      setSuggestions([]);
    }
  }, [newCampo]);

  const fetchStakeholders = async () => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "stakeholder");

      if (!roles?.length) {
        setStakeholders([]);
        setLoading(false);
        return;
      }

      const userIds = roles.map((r) => r.user_id);
      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nombres, apellidos, email")
        .in("id", userIds);

      setStakeholders(
        (users || []).map((u) => ({
          user_id: u.id,
          nombres: u.nombres,
          apellidos: u.apellidos,
          email: u.email,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async (userId: string) => {
    const { data } = await supabase
      .from("stakeholder_filtros")
      .select("*")
      .eq("user_id", userId)
      .order("campo")
      .order("valor");

    setFilters((data as StakeholderFilter[]) || []);
  };

  const fetchSuggestions = async (campo: string) => {
    let values: string[] = [];
    try {
      if (campo === "municipio") {
        const { data } = await supabase
          .from("usuarios")
          .select("municipio")
          .not("municipio", "is", null);
        values = [...new Set((data || []).map((d) => d.municipio).filter(Boolean))] as string[];
      } else if (campo === "departamento") {
        const { data } = await supabase
          .from("usuarios")
          .select("departamento")
          .not("departamento", "is", null);
        values = [...new Set((data || []).map((d) => d.departamento).filter(Boolean))] as string[];
      } else if (campo === "ubicacion_principal") {
        const { data } = await supabase
          .from("emprendimientos")
          .select("ubicacion_principal")
          .not("ubicacion_principal", "is", null);
        values = [...new Set((data || []).map((d) => d.ubicacion_principal).filter(Boolean))] as string[];
      } else if (campo === "nivel_definitivo") {
        const { data } = await supabase
          .from("emprendimientos")
          .select("nivel_definitivo")
          .not("nivel_definitivo", "is", null);
        values = [...new Set((data || []).map((d) => d.nivel_definitivo).filter(Boolean))] as string[];
      }
    } catch (err) {
      console.error(err);
    }
    setSuggestions(values.sort());
  };

  const addFilter = async () => {
    if (!selectedStakeholder || !newCampo || !newValor.trim()) {
      toast.error("Selecciona un campo y un valor");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("stakeholder_filtros").insert({
        user_id: selectedStakeholder,
        campo: newCampo,
        valor: newValor.trim(),
        activo: true,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Este filtro ya existe");
        } else {
          throw error;
        }
      } else {
        toast.success("Filtro agregado");
        setNewValor("");
        fetchFilters(selectedStakeholder);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al agregar filtro");
    } finally {
      setAdding(false);
    }
  };

  const deleteFilter = async (filterId: string) => {
    if (!selectedStakeholder) return;
    const { error } = await supabase
      .from("stakeholder_filtros")
      .delete()
      .eq("id", filterId);
    if (error) {
      toast.error("Error al eliminar filtro");
    } else {
      toast.success("Filtro eliminado");
      fetchFilters(selectedStakeholder);
    }
  };

  const toggleFilter = async (filterId: string, activo: boolean) => {
    if (!selectedStakeholder) return;
    const { error } = await supabase
      .from("stakeholder_filtros")
      .update({ activo })
      .eq("id", filterId);
    if (error) {
      toast.error("Error al actualizar filtro");
    } else {
      fetchFilters(selectedStakeholder);
    }
  };

  // Page access helpers
  const pageFilters = filters.filter((f) => f.campo === "pagina_acceso");
  const activePageKeys = new Set(pageFilters.filter((f) => f.activo).map((f) => f.valor));
  const hasPageRestrictions = pageFilters.length > 0;

  const togglePageAccess = async (pageKey: string, enabled: boolean) => {
    if (!selectedStakeholder) return;

    if (enabled) {
      // Add page access filter
      const { error } = await supabase.from("stakeholder_filtros").insert({
        user_id: selectedStakeholder,
        campo: "pagina_acceso",
        valor: pageKey,
        activo: true,
      });
      if (error && error.code !== "23505") {
        toast.error("Error al agregar acceso");
        return;
      }
    } else {
      // Remove page access filter
      const filter = pageFilters.find((f) => f.valor === pageKey);
      if (filter) {
        await supabase.from("stakeholder_filtros").delete().eq("id", filter.id);
      }
    }
    fetchFilters(selectedStakeholder);
  };

  const clearAllPageRestrictions = async () => {
    if (!selectedStakeholder) return;
    for (const f of pageFilters) {
      await supabase.from("stakeholder_filtros").delete().eq("id", f.id);
    }
    toast.success("Restricciones de páginas eliminadas");
    fetchFilters(selectedStakeholder);
  };

  const selectedUser = stakeholders.find((s) => s.user_id === selectedStakeholder);
  const dataFilters = filters.filter((f) => f.campo !== "pagina_acceso");
  const groupedFilters = dataFilters.reduce<Record<string, StakeholderFilter[]>>((acc, f) => {
    acc[f.campo] = acc[f.campo] || [];
    acc[f.campo].push(f);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Gestión de acceso Stakeholders</h2>
        <p className="text-sm text-muted-foreground">
          Configura qué páginas y qué información puede ver cada stakeholder.
          Sin restricciones configuradas, el stakeholder ve todo.
        </p>
      </div>

      {stakeholders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay stakeholders registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Stakeholder list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stakeholders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {stakeholders.map((s) => {
                const isSelected = selectedStakeholder === s.user_id;
                return (
                  <button
                    key={s.user_id}
                    onClick={() => setSelectedStakeholder(s.user_id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {s.nombres} {s.apellidos}
                      </div>
                      <div className={`text-xs truncate ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {s.email}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Filter management */}
          <div className="space-y-4">
            {!selectedStakeholder ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Selecciona un stakeholder para gestionar sus filtros de acceso.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Page access card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Acceso a páginas
                      </CardTitle>
                      {hasPageRestrictions && (
                        <Button variant="ghost" size="sm" onClick={clearAllPageRestrictions} className="text-xs h-7">
                          Quitar restricciones
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!hasPageRestrictions && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Sin restricciones — acceso a todas las páginas. Activa las páginas que deseas permitir para restringir.
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {STAKEHOLDER_PAGES.map((page) => {
                        const isEnabled = hasPageRestrictions ? activePageKeys.has(page.key) : false;
                        return (
                          <label
                            key={page.key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors ${
                              hasPageRestrictions && isEnabled
                                ? "border-primary bg-primary/5"
                                : hasPageRestrictions && !isEnabled
                                ? "border-border bg-muted/30 text-muted-foreground"
                                : "border-border"
                            }`}
                          >
                            <Checkbox
                              checked={hasPageRestrictions ? isEnabled : true}
                              onCheckedChange={(checked) => togglePageAccess(page.key, !!checked)}
                            />
                            <span>{page.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Data filters card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros de datos — {selectedUser?.nombres} {selectedUser?.apellidos}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add filter form */}
                    <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-1.5 min-w-[160px]">
                        <Label className="text-xs">Campo</Label>
                        <Select value={newCampo} onValueChange={(v) => { setNewCampo(v); setNewValor(""); }}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CAMPO_OPTIONS.map((c) => (
                              <SelectItem key={c} value={c}>{CAMPO_LABELS[c]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <Label className="text-xs">Valor</Label>
                        {suggestions.length > 0 ? (
                          <Select value={newValor} onValueChange={setNewValor}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar valor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {suggestions.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9"
                            placeholder="Escribir valor..."
                            value={newValor}
                            onChange={(e) => setNewValor(e.target.value)}
                          />
                        )}
                      </div>

                      <Button size="sm" onClick={addFilter} disabled={adding || !newCampo || !newValor.trim()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>

                    {/* Current filters */}
                    {dataFilters.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin filtros de datos — este stakeholder ve toda la información.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedFilters).map(([campo, items]) => (
                          <div key={campo} className="space-y-2">
                            <h4 className="text-sm font-medium text-foreground">
                              {CAMPO_LABELS[campo] || campo}
                            </h4>
                            <div className="space-y-1">
                              {items.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between px-3 py-2 rounded-md border bg-background"
                                >
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={f.activo}
                                      onCheckedChange={(checked) => toggleFilter(f.id, checked)}
                                    />
                                    <Badge variant={f.activo ? "default" : "secondary"} className="font-normal">
                                      {f.valor}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => deleteFilter(f.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
