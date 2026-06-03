import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Palette,
  Link as LinkIcon,
  Globe,
  Copy,
  CheckCircle2,
  AlertCircle,
  QrCode as QrCodeIcon,
  ExternalLink,
} from "lucide-react";
import { MediaUpload } from "@/components/MediaUpload";

const APP_BASE_DOMAIN =
  (import.meta.env.VITE_APP_BASE_DOMAIN as string | undefined) || "gleego.com.br";

export default function BrandingSettings() {
   const { user, refreshUser: authRefresh, staffMentor } = useAuth();
   const { setBrand, refreshFromHost } = useBranding();
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");

   const initialData = staffMentor || user;
   const [form, setForm] = useState({
     brandName: initialData?.brandName || "",
     slug: initialData?.slug || "",
     brandLogoUrl: initialData?.brandLogoUrl || "",
     brandBannerUrl: (initialData as any)?.brandBannerUrl || "",
     brandMobileBannerUrl: (initialData as any)?.brandMobileBannerUrl || "",
      brandPrimaryColor: initialData?.brandPrimaryColor || "#1e3a8a",
      brandAccentColor: initialData?.brandAccentColor || "#d4a017",
      brandTheme: (initialData as any)?.brandTheme || "system",
      brandHighlightTheme: (initialData as any)?.brandHighlightTheme || "classic",
      brandDarkBannerUrl: (initialData as any)?.brandDarkBannerUrl || "",
      brandDarkLogoUrl: (initialData as any)?.brandDarkLogoUrl || "",
      customDomain: (initialData as any)?.customDomain || "",
   });
   useEffect(() => {
     const data = staffMentor || user;
     if (data) {
       setForm({
         brandName: data.brandName || "",
          slug: data.slug || "",
          brandLogoUrl: data.brandLogoUrl || "",
          brandBannerUrl: (data as any).brandBannerUrl || "",
           brandMobileBannerUrl: (data as any).brandMobileBannerUrl || "",
           brandPrimaryColor: data.brandPrimaryColor || "#1e3a8a",
           brandAccentColor: data.brandAccentColor || "#d4a017",
           brandTheme: (data as any).brandTheme || "system",
           brandHighlightTheme: (data as any).brandHighlightTheme || "classic",
           brandDarkBannerUrl: (data as any).brandDarkBannerUrl || "",
           brandDarkLogoUrl: (data as any).brandDarkLogoUrl || "",
           customDomain: (data as any).customDomain || "",
       });
     }
   }, [user, staffMentor]);

  // Hosts úteis derivados
  const currentHost = typeof window !== "undefined" ? window.location.host : "";
  const displayHost = currentHost.includes("localhost") ? "app.gleego.com.br" : currentHost;
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const subpathLink = useMemo(
    () => `${currentOrigin}/c/${form.slug || "seu-slug"}`,
    [currentOrigin, form.slug]
  );

  const subdomainLink = useMemo(() => {
    if (!APP_BASE_DOMAIN) return null;
    return `https://${form.slug || "seu-slug"}.${APP_BASE_DOMAIN}`;
  }, [form.slug]);

  const customDomainLink = useMemo(
    () => (form.customDomain ? `https://${form.customDomain}` : null),
    [form.customDomain]
  );

  function onChange(patch: Partial<typeof form>) {
    const next = { ...form, ...patch };
    setForm(next);
    setBrand({ ...next });
  }

  function normalizeSlug(v: string) {
    return v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug ? normalizeSlug(form.slug) : "",
        customDomain: form.customDomain?.trim().toLowerCase() || "",
      };
      await api("/me/brand", { method: "PUT", body: payload });
       if (payload.customDomain) {
         await refreshFromHost(payload.customDomain);
       }
       await authRefresh();
      toast.success("Branding salvo!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, label = "Link") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function loadQr() {
    if (!form.slug) {
      toast.error("Defina um slug primeiro");
      return;
    }
    setLoadingQr(true);
    try {
      const r = await api<{ qr: string; url: string }>(
        `/public/mentor/${encodeURIComponent(form.slug)}/qrcode`,
        { auth: false }
      );
      setQr(r.qr);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar QR");
    } finally {
      setLoadingQr(false);
    }
  }

  /** Verifica se o customDomain já resolve para este tenant via /public/tenant-by-host */
  async function checkDomain() {
    if (!form.customDomain) return;
    setDomainStatus("checking");
    try {
      const r = await api<any>(
        `/public/tenant-by-host?host=${encodeURIComponent(form.customDomain)}`,
        { auth: false }
      );
       const targetId = staffMentor?.id || user?.id;
       if (r && r.id === targetId) setDomainStatus("ok");
      else setDomainStatus("error");
    } catch {
      setDomainStatus("error");
    }
  }

  useEffect(() => {
    setDomainStatus("idle");
  }, [form.customDomain]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Branding & Domínio</h1>
          <p className="text-muted-foreground">
            Personalize a marca e o link que seus mentorados usarão para acessar.
          </p>
        </div>
      </div>

      {/* ============== APARÊNCIA ============== */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Aparência</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da plataforma</Label>
            <Input
              value={form.brandName}
              onChange={(e) => onChange({ brandName: e.target.value })}
              placeholder="Ex: Mentoria João Silva"
            />
          </div>
          <div className="space-y-2">
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
            <Label>Banner Desktop (Estilo Netflix)</Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandBannerUrl}
              onChange={(m) => onChange({ brandBannerUrl: m?.url || "" })}
              hint="Recomendado: 1920x600"
              maxSizeMB={5}
              compact={!!form.brandBannerUrl}
            />
          </div>
          <div className="space-y-2">
            <Label>Banner Mobile</Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandMobileBannerUrl}
              onChange={(m) => onChange({ brandMobileBannerUrl: m?.url || "" })}
              hint="Recomendado: 800x800"
              maxSizeMB={5}
              compact={!!form.brandMobileBannerUrl}
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
              <Input
                value={form.brandPrimaryColor}
                onChange={(e) => onChange({ brandPrimaryColor: e.target.value })}
              />
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
              <Input
                value={form.brandAccentColor}
                onChange={(e) => onChange({ brandAccentColor: e.target.value })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============== LINK PÚBLICO (slug) ============== */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Link público (slug)</h2>
          <Badge variant="default" className="ml-2">Funciona imediatamente</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Compartilhe este link nas redes sociais, WhatsApp ou bio do Instagram. Seus mentorados se cadastram por aqui.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            <Label>Seu slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              onBlur={(e) => onChange({ slug: normalizeSlug(e.target.value) })}
              placeholder="joao-silva"
            />
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números e hífen.
            </p>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Link de captação</Label>
            <div className="flex gap-2">
              <Input value={subpathLink} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copy(subpathLink, "Link")}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={subpathLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" onClick={loadQr} disabled={loadingQr}>
                {loadingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCodeIcon className="h-4 w-4" />}
              </Button>
            </div>
            {qr && (
              <div className="mt-3 flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                <img src={qr} alt="QR Code" className="h-32 w-32 bg-white rounded" />
                <div className="text-xs text-muted-foreground">
                  Escaneie ou clique com botão direito → salvar para usar em flyers, slides e cards.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============== SUBDOMÍNIO AUTOMÁTICO ============== */}
      {APP_BASE_DOMAIN && (
        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" />
            <h2 className="font-semibold">Subdomínio automático</h2>
            <Badge variant="secondary" className="ml-2">Disponível</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada mentor ganha automaticamente um subdomínio baseado no seu slug. Não precisa configurar nada.
          </p>
          <div className="flex gap-2">
            <Input value={subdomainLink || ""} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={() => subdomainLink && copy(subdomainLink, "Subdomínio")}>
              <Copy className="h-4 w-4" />
            </Button>
            {subdomainLink && (
              <Button variant="outline" size="icon" asChild>
                <a href={subdomainLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* ============== DOMÍNIO PRÓPRIO ============== */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Domínio próprio</h2>
          <Badge variant="outline" className="ml-2">White-label</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
        Use o seu próprio domínio (ex: <code className="text-xs bg-muted px-1 rounded">mentoria.suaempresa.com.br</code>) para
          uma experiência 100% white-label.
        </p>

        <div className="space-y-2">
          <Label>Seu domínio</Label>
          <div className="flex gap-2">
            <Input
              value={form.customDomain}
              onChange={(e) => onChange({ customDomain: e.target.value })}
              placeholder="app.suaempresa.com.br"
              className="font-mono"
            />
            <Button variant="outline" onClick={checkDomain} disabled={!form.customDomain || domainStatus === "checking"}>
              {domainStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Verificar
            </Button>
          </div>

          {domainStatus === "ok" && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Domínio configurado e apontando corretamente!
            </div>
          )}
          {domainStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Domínio ainda não está apontando. Verifique os passos abaixo.
            </div>
          )}
        </div>

        {/* Instruções DNS */}
        <div className="bg-muted/40 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Passo 1: Configurar DNS (No seu provedor)
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse o painel do seu registrador (Registro.br, Cloudflare, etc).</li>
            <li>Crie um registro <b>CNAME</b> com os seguintes valores:</li>
          </ol>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                  <th className="text-left py-2 pr-4 font-medium">Nome / Host</th>
                  <th className="text-left py-2 pr-4 font-medium">Valor / Aponta para</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">CNAME</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {form.customDomain ? (form.customDomain.includes(".") ? form.customDomain.split(".")[0] : "app") : "app"}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs">{displayHost}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(displayHost, "Host")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-sm font-medium flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Passo 2: Ativação no Servidor (Easypanel)
          </div>
          <p className="text-xs text-muted-foreground">
            Para que o servidor aceite o domínio e gere o SSL (HTTPS) automaticamente, você deve:
          </p>
          <div className="bg-background/50 p-3 rounded border border-border text-xs space-y-2">
            <p>1. No Easypanel, acesse seu <b>App → Domains</b>.</p>
            <p>2. Adicione o seu domínio customizado (ex: <code>{form.customDomain || "mentoria.com"}</code>).</p>
            <p className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1 mt-2">
              Dica: Para aceitar qualquer domínio automaticamente, adicione a regra <code>{"HostRegexp(`{host:.+}`)"}</code> nos domínios do App no Easypanel.
            </p>
          </div>
        </div>

        {customDomainLink && domainStatus === "ok" && (
          <div className="flex gap-2">
            <Input value={customDomainLink} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={() => copy(customDomainLink, "Domínio")}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href={customDomainLink} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </section>

      <div className="flex justify-end sticky bottom-4">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-elegant">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar tudo
        </Button>
      </div>
    </div>
  );
}
