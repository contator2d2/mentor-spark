import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * Tela de troca de senha — usada no primeiro login (senha temporária)
 * e quando o usuário quer alterar voluntariamente a senha.
 */
export default function ChangePasswordPage() {
  const { user, refreshUser, logout } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) {
    nav("/login", { replace: true });
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return toast.error("A nova senha precisa ter pelo menos 8 caracteres");
    if (next !== confirm) return toast.error("As senhas não conferem");
    setSaving(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      toast.success("Senha atualizada!");
      await refreshUser();
      if (user.role === "prospect" || user.role === "mentorado") nav("/me", { replace: true });
      else nav("/app", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Não foi possível trocar a senha");
    } finally {
      setSaving(false);
    }
  }

  const isForced = !!user.mustChangePassword;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="w-full max-w-md p-8 space-y-6 glass-card">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl">
            {isForced ? "Crie sua nova senha" : "Alterar senha"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isForced
              ? "Você entrou com uma senha temporária. Defina agora uma senha pessoal para continuar."
              : "Escolha uma nova senha de pelo menos 8 caracteres."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Senha atual {isForced && <span className="text-xs text-muted-foreground">(a temporária recebida)</span>}</Label>
            <Input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar nova senha
          </Button>
          {!isForced && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => nav(-1)}
            >
              Cancelar
            </Button>
          )}
          {isForced && (
            <button
              type="button"
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            >
              Sair
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}