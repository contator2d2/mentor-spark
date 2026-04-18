import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Shield, KeyRound, Send, UserCheck, UserX, Copy, RefreshCw,
  Smartphone, CheckCircle2, AlertTriangle, Lock,
} from "lucide-react";
import { toast } from "sonner";

interface AccessInfo {
  hasAccess: boolean;
  lead: { id: string; name: string; email: string; phone?: string };
  user: null | {
    id: string;
    email: string;
    role: string;
    status: "pending" | "active" | "suspended";
    mustChangePassword: boolean;
    credentialsSentAt?: string;
    createdAt: string;
  };
}

const ROLE_LABEL: Record<string, string> = {
  mentorado: "Mentorado",
  prospect: "Prospect",
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: "Ativo",       cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  suspended: { label: "Suspenso",    cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  pending:   { label: "Pendente",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

export function AcessoTab({ leadId }: { leadId: string }) {
  const [info, setInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [enableOpen, setEnableOpen] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [role, setRole] = useState<"mentorado" | "prospect">("mentorado");
  const [sendCredentials, setSendCredentials] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setInfo(await api<AccessInfo>(`/prontuario/${leadId}/access`));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [leadId]);

  function genTemp() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    setDefaultPassword(out);
  }

  async function enableAccess() {
    if (defaultPassword && defaultPassword.length < 8) {
      toast.error("Senha precisa ter pelo menos 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ ok: boolean; password: string; sentCredentials: boolean }>(
        `/prontuario/${leadId}/access/enable`,
        { method: "POST", body: { defaultPassword: defaultPassword || undefined, role, sendCredentials } },
      );
      setGeneratedPassword(res.password);
      toast.success(
        sendCredentials
          ? "Acesso habilitado e credenciais enviadas!"
          : "Acesso habilitado.",
      );
      setEnableOpen(false);
      setDefaultPassword("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function disable() {
    if (!confirm("Suspender o acesso deste mentorado ao app?")) return;
    try {
      await api(`/prontuario/${leadId}/access/disable`, { method: "POST" });
      toast.success("Acesso suspenso");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function reactivate() {
    try {
      await api(`/prontuario/${leadId}/access/reactivate`, { method: "POST" });
      toast.success("Acesso reativado");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function resend() {
    if (!confirm("Gerar uma nova senha temporária e reenviar credenciais?")) return;
    try {
      const res = await api<{ ok: boolean; password: string }>(
        `/prontuario/${leadId}/access/resend`,
        { method: "POST" },
      );
      setGeneratedPassword(res.password);
      toast.success("Credenciais reenviadas!");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function changeRole(newRole: "mentorado" | "prospect") {
    try {
      await api(`/prontuario/${leadId}/access/role`, {
        method: "POST",
        body: { role: newRole },
      });
      toast.success("Permissão atualizada");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading || !info) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const u = info.user;
  const status = u ? STATUS_META[u.status] : null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <Card className="p-5 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">Acesso ao app</h3>
            <p className="text-sm text-muted-foreground">
              Habilite o login do mentorado, defina uma senha padrão e gerencie permissões. Ele será obrigado a trocar a senha no primeiro acesso.
            </p>
          </div>
        </div>
      </Card>

      {/* Senha gerada (banner pós-ação) */}
      {generatedPassword && (
        <Card className="p-4 border-emerald-500/40 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-emerald-300">Senha temporária gerada</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="px-3 py-1.5 rounded-md bg-card border border-border/60 font-mono text-base tracking-widest">
                  {generatedPassword}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success("Copiado"); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Anote ou copie agora — esta senha não será mostrada de novo. O mentorado precisará trocá-la no primeiro login.
              </div>
              <Button size="sm" variant="ghost" className="mt-2 h-7" onClick={() => setGeneratedPassword(null)}>
                Esconder
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Status atual */}
      {!info.hasAccess ? (
        <Card className="p-6">
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold">Sem acesso ao app</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Este mentorado ainda não tem login. Habilite o acesso para que ele use o app, receba materiais, tarefas e responda testes.
              </p>
            </div>
            <Button onClick={() => setEnableOpen(true)} className="bg-gradient-primary mt-2">
              <UserCheck className="h-4 w-4 mr-2" />
              Habilitar acesso ao app
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5 space-y-5">
          {/* Identidade */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Email de login</div>
              <div className="font-medium text-base">{u!.email}</div>
              {info.lead.phone && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Smartphone className="h-3 w-3" /> {info.lead.phone}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={status!.cls}>{status!.label}</Badge>
              {u!.mustChangePassword && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Trocar senha no 1º login
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Permissão / role */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Permissão</Label>
            <div className="flex items-center gap-3">
              <Select value={u!.role} onValueChange={(v) => changeRole(v as any)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentorado">Mentorado (acesso completo)</SelectItem>
                  <SelectItem value="prospect">Prospect (acesso limitado)</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {u!.role === "mentorado"
                  ? "Vê trilhas, tarefas, materiais, comunidade e financeiro."
                  : "Acesso restrito — útil enquanto está em negociação."}
              </span>
            </div>
          </div>

          <Separator />

          {/* Ações de senha + canais */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={resend}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Gerar nova senha + reenviar
            </Button>
            <Button variant="outline" onClick={() => setEnableOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Definir senha personalizada
            </Button>
          </div>

          <Separator />

          {/* Suspensão */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
            <div>
              <div className="text-sm font-medium">Acesso ativo</div>
              <div className="text-xs text-muted-foreground">
                {u!.status === "active"
                  ? "O mentorado pode entrar no app normalmente."
                  : "O mentorado está bloqueado e não consegue logar."}
              </div>
            </div>
            {u!.status === "active" ? (
              <Button variant="outline" size="sm" onClick={disable} className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10">
                <UserX className="h-4 w-4 mr-2" />Suspender
              </Button>
            ) : (
              <Button size="sm" onClick={reactivate} className="bg-emerald-500/90 hover:bg-emerald-500 text-white">
                <UserCheck className="h-4 w-4 mr-2" />Reativar
              </Button>
            )}
          </div>

          {u!.credentialsSentAt && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Send className="h-3 w-3" />
              Últimas credenciais enviadas em {new Date(u!.credentialsSentAt).toLocaleString("pt-BR")}
            </div>
          )}
        </Card>
      )}

      {/* Dialog: habilitar / definir senha */}
      <Dialog open={enableOpen} onOpenChange={setEnableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{info.hasAccess ? "Definir nova senha" : "Habilitar acesso ao app"}</DialogTitle>
            <DialogDescription>
              {info.hasAccess
                ? "Defina uma nova senha padrão. O mentorado será obrigado a trocar no próximo login."
                : "Crie a conta do mentorado. Defina uma senha padrão ou deixe em branco para gerar uma temporária aleatória."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Senha padrão (mínimo 8 caracteres)</Label>
              <div className="flex gap-2">
                <Input
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="Ex: Mentor2026 (ou deixe em branco)"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={genTemp}>Gerar</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Em branco = gera uma senha temporária forte automaticamente.
              </p>
            </div>

            {!info.hasAccess && (
              <div className="space-y-1">
                <Label className="text-xs">Permissão inicial</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentorado">Mentorado</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
              <div>
                <div className="text-sm font-medium">Enviar credenciais</div>
                <div className="text-xs text-muted-foreground">Por email + WhatsApp (se configurados).</div>
              </div>
              <Switch checked={sendCredentials} onCheckedChange={setSendCredentials} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnableOpen(false)}>Cancelar</Button>
            <Button onClick={enableAccess} disabled={submitting} className="bg-gradient-primary">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {info.hasAccess ? "Atualizar senha" : "Habilitar acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
