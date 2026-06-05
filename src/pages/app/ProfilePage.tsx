import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, User, KeyRound, Phone, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/me", {
        method: "PATCH",
        body: { name, phone },
      });
      toast.success("Perfil atualizado!");
      await refreshUser();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  }

  const isMentorado = user?.role === "mentorado" || user?.role === "prospect";

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        {isMentorado && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/me")}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações de acesso e segurança.</p>
        </div>
      </div>
      
      <Card className="border-border/50 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <User className="w-5 h-5 text-primary" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-muted/30"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Inclua código do país e DDD (apenas números).</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de acesso</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground">O e-mail é usado para login e não pode ser alterado diretamente.</p>
            </div>
            <Button type="submit" disabled={saving} className="w-full md:w-auto">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-soft overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <KeyRound className="w-5 h-5 text-primary" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Recomendamos trocar sua senha se você recebeu uma senha temporária ou se não a altera há mais de 90 dias.
            </p>
          </div>
          <Button 
            variant="secondary" 
            className="w-full md:w-auto"
            onClick={() => navigate("/trocar-senha")}
          >
            Alterar Minha Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
