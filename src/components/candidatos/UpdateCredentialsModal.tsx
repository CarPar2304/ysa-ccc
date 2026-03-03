import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, KeyRound } from "lucide-react";

interface UpdateCredentialsModalProps {
  open: boolean;
  onClose: () => void;
}

export const UpdateCredentialsModal = ({ open, onClose }: UpdateCredentialsModalProps) => {
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; nombres: string; apellidos: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setFoundUser(null);

    const { data } = await supabase
      .from("usuarios")
      .select("id, email, nombres, apellidos")
      .ilike("email", searchEmail.trim())
      .maybeSingle();

    setSearching(false);
    if (data) {
      setFoundUser(data);
    } else {
      toast({ title: "No encontrado", description: "No se encontró un usuario con ese correo.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!foundUser) return;
    if (!newEmail.trim() && !newPassword.trim()) {
      toast({ title: "Error", description: "Ingresa al menos un nuevo correo o contraseña.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: Record<string, string> = { user_id: foundUser.id };
    if (newEmail.trim()) payload.new_email = newEmail.trim();
    if (newPassword.trim()) payload.new_password = newPassword.trim();

    const { data, error } = await supabase.functions.invoke("update-user-credentials", { body: payload });

    setSaving(false);
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message || "Error al actualizar credenciales", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Credenciales actualizadas correctamente." });
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchEmail("");
    setFoundUser(null);
    setNewEmail("");
    setNewPassword("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Cambiar Correo / Contraseña
          </DialogTitle>
          <DialogDescription>
            Actualiza el correo y/o contraseña de un usuario sin enviar notificación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Buscar usuario por correo actual</Label>
            <div className="flex gap-2">
              <Input
                placeholder="usuario@email.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {foundUser && (
            <>
              <div className="p-3 rounded-md bg-muted text-sm">
                <p className="font-medium">{foundUser.nombres} {foundUser.apellidos}</p>
                <p className="text-muted-foreground">{foundUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Nuevo correo (opcional)</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nuevo@email.com" />
              </div>

              <div className="space-y-2">
                <Label>Nueva contraseña (opcional)</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </>
          )}
        </div>

        {foundUser && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Actualizar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
