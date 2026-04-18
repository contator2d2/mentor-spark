import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Palette } from "lucide-react";
import { MediaUpload } from "@/components/MediaUpload";

export default function BrandingSettings() {
  const { user, refreshUser } = useAuth();
  const { setBrand } = useBranding();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brandName: user?.brandName || "",
    slug: user?.slug || "",
    brandLogoUrl: user?.brandLogoUrl || "",
    brandPrimaryColor: user?.brandPrimaryColor || "#1e3a8a",
    brandAccentColor: user?.brandAccentColor || "#d4a017",
    customDomain: (user as any)?.customDomain || "",
  });

  function onChange(patch: Partial<typeof form>) {
    const next = { ...form, ...patch };
    setForm(next);
    setBrand({ ...next });
  }

  async function save() {
    setSaving(true);
    try {
      await api("/me/brand", { method: "PUT", body: form });
      await refreshUser();
      toast.success("Branding salvo!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Branding white-label</h1>
          <p className="text-muted-foreground">Personalize a aparência da sua plataforma para mentorados.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome da plataforma</Label>
          <Input value={form.brandName} onChange={(e) => onChange({ brandName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Slug público</Label>
          <Input value={form.slug} onChange={(e) => onChange({ slug: e.target.value })} />
          <p className="text-xs text-muted-foreground">Página: /c/{form.slug || "seu-slug"}</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Logotipo</Label>
          <MediaUpload
            accept={["image"]}
            value={form.brandLogoUrl}
            onChange={(m) => onChange({ brandLogoUrl: m?.url || "" })}
            hint="PNG, JPG ou SVG • até 5MB"
            maxSizeMB={5}
            compact={!!form.brandLogoUrl}
          />
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
        <div className="space-y-2 md:col-span-2">
          <Label>Domínio próprio (opcional)</Label>
          <Input
            value={form.customDomain}
            onChange={(e) => onChange({ customDomain: e.target.value })}
            placeholder="app.seudominio.com.br"
          />
          <p className="text-xs text-muted-foreground">
            Aponte um CNAME para o app principal. Quando seus mentorados abrirem esse domínio, verão sua marca.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar branding
        </Button>
      </div>
    </div>
  );
}
