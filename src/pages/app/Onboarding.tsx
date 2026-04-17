import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const { setBrand } = useBranding();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brandName: user?.brandName || user?.name || "",
    slug: user?.slug || "",
    brandLogoUrl: user?.brandLogoUrl || "",
    brandPrimaryColor: user?.brandPrimaryColor || "#1e3a8a",
    brandAccentColor: user?.brandAccentColor || "#d4a017",
  });

  // preview ao vivo
  function onChange(patch: Partial<typeof form>) {
    const next = { ...form, ...patch };
    setForm(next);
    setBrand({ ...next });
  }

  async function save() {
    setSaving(true);
    try {
      await api("/me/onboarding/complete", { method: "POST", body: form });
      await refreshUser();
      toast.success("Onboarding concluído!");
      nav("/app");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-8 shadow-elegant">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-2xl font-bold">Bem-vindo, {user?.name?.split(" ")[0]}!</h1>
            <p className="text-sm text-muted-foreground">Configure seu white-label antes de começar.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da plataforma</Label>
            <Input value={form.brandName} onChange={(e) => onChange({ brandName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>URL pública (slug)</Label>
            <Input value={form.slug} onChange={(e) => onChange({ slug: e.target.value })} placeholder="joao-silva" />
            <p className="text-xs text-muted-foreground">Sua página de captação será /c/{form.slug || "seu-slug"}</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>URL do logotipo</Label>
            <Input value={form.brandLogoUrl} onChange={(e) => onChange({ brandLogoUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Cor primária</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.brandPrimaryColor}
                onChange={(e) => onChange({ brandPrimaryColor: e.target.value })}
                className="h-10 w-16 rounded border border-border cursor-pointer"
              />
              <Input value={form.brandPrimaryColor} onChange={(e) => onChange({ brandPrimaryColor: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor de destaque</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.brandAccentColor}
                onChange={(e) => onChange({ brandAccentColor: e.target.value })}
                className="h-10 w-16 rounded border border-border cursor-pointer"
              />
              <Input value={form.brandAccentColor} onChange={(e) => onChange({ brandAccentColor: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => nav("/app")}>Pular por agora</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e entrar
          </Button>
        </div>
      </div>
    </div>
  );
}
