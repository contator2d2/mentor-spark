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
  Share2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
      brandCoursesLayout: (initialData as any)?.brandCoursesLayout || "netflix",
      brandDarkBannerUrl: (initialData as any)?.brandDarkBannerUrl || "",
      brandDarkLogoUrl: (initialData as any)?.brandDarkLogoUrl || "",
      brandOgImageUrl: (initialData as any)?.brandOgImageUrl || "",
      brandOgDescription: (initialData as any)?.brandOgDescription || "",
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
           brandCoursesLayout: (data as any).brandCoursesLayout || "netflix",
           brandDarkBannerUrl: (data as any).brandDarkBannerUrl || "",
           brandDarkLogoUrl: (data as any).brandDarkLogoUrl || "",
           brandOgImageUrl: (data as any).brandOgImageUrl || "",
           brandOgDescription: (data as any).brandOgDescription || "",
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

  const shareLink = useMemo(() => {
    const base = form.customDomain
      ? `https://${form.customDomain}`
      : currentOrigin;
    return `${base}/api/public/share/mentor/${form.slug || "seu-slug"}`;
  }, [form.customDomain, form.slug, currentOrigin]);

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
      if (payload.customDomain) {
        // Re-verifica o domínio para atualizar o status visual
        setTimeout(() => { checkDomain(); }, 300);
      }
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
            <Label>Nome da plataforma (Título)</Label>
            <Input
              value={form.brandName}
              onChange={(e) => onChange({ brandName: e.target.value })}
              placeholder="Deixe vazio para mostrar apenas a logo"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Se você deixar este campo vazio, apenas a sua logo será exibida no cabeçalho.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Logotipo (Claro/Padrão)</Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandLogoUrl}
              onChange={(m) => onChange({ brandLogoUrl: m?.url || "" })}
              hint="PNG, JPG ou SVG • para fundo escuro"
              maxSizeMB={5}
              compact={!!form.brandLogoUrl}
            />
          </div>
          <div className="space-y-2">
            <Label>Logotipo (Escuro)</Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandDarkLogoUrl}
              onChange={(m) => onChange({ brandDarkLogoUrl: m?.url || "" })}
              hint="Opcional • Usado quando o sistema está em modo escuro"
              maxSizeMB={5}
              compact={!!form.brandDarkLogoUrl}
            />
          </div>
          <div className="space-y-2">
            <Label>Banner Desktop (Claro/Padrão)</Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandBannerUrl}
              onChange={(m) => onChange({ brandBannerUrl: m?.url || "" })}
              hint="Estilo Netflix • Recomendado: 1920x600"
              maxSizeMB={5}
              compact={!!form.brandBannerUrl}
            />
          </div>
          <div className="space-y-2">
            <Label>Banner Desktop (Escuro)</Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandDarkBannerUrl}
              onChange={(m) => onChange({ brandDarkBannerUrl: m?.url || "" })}
              hint="Opcional • Substitui o banner no modo escuro"
              maxSizeMB={5}
              compact={!!form.brandDarkBannerUrl}
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
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-2">
              <Share2 className="h-3.5 w-3.5" />
              Imagem de compartilhamento (Redes sociais)
            </Label>
            <MediaUpload
              accept={["image"]}
              value={form.brandOgImageUrl}
              onChange={(m) => onChange({ brandOgImageUrl: m?.url || "" })}
              hint="Recomendado: 1200×630 • Aparece no WhatsApp, Facebook, LinkedIn e X quando alguém envia o seu link"
              maxSizeMB={5}
              compact={!!form.brandOgImageUrl}
            />
            <p className="text-[10px] text-muted-foreground italic">
              Se ficar em branco, usamos o banner e depois a logo como fallback.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição para o preview</Label>
            <Textarea
              rows={2}
              value={form.brandOgDescription}
              onChange={(e) => onChange({ brandOgDescription: e.target.value })}
              placeholder="Ex: Área exclusiva de mentoria com cursos, conteúdos e acompanhamento."
              maxLength={200}
            />
            <p className="text-[10px] text-muted-foreground">
              Texto curto que aparece embaixo do título quando o link é compartilhado. Máx. 200 caracteres.
            </p>
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
          <div className="space-y-2">
            <Label>Tema do Sistema</Label>
            <select
              value={form.brandTheme}
              onChange={(e) => onChange({ brandTheme: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="system">Preferência do Usuário (Sistema)</option>
              <option value="light">Sempre Claro</option>
              <option value="dark">Sempre Escuro</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Estilo de Destaque (Modo Escuro)</Label>
            <select
              value={form.brandHighlightTheme}
              onChange={(e) => onChange({ brandHighlightTheme: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="classic">Clássico (Sóbrio)</option>
              <option value="premium">Premium (Dourado/Glow)</option>
              <option value="neon">Vibrante (Neon/Futurista)</option>
              <option value="impact">Impacto (Contrastante)</option>
            </select>
          </div>
        </div>

        {/* ============== LAYOUT DA ÁREA DE CURSOS ============== */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div>
            <Label className="text-base">Layout da Área de Cursos</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha como os cards de cursos aparecem para os seus mentorados. O glow neon e a animação de entrada são aplicados automaticamente no modo escuro.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "netflix", label: "Netflix", desc: "Linhas horizontais com scroll lateral", preview: "rows" },
              { value: "grid", label: "Grade", desc: "Pôsteres uniformes em grade", preview: "grid" },
              { value: "neon", label: "Neon Glow", desc: "Cards grandes com glow vibrante", preview: "neon" },
              { value: "cinema", label: "Cinema", desc: "Destaque cinematográfico, 1 por linha", preview: "cinema" },
            ].map((opt) => {
              const active = form.brandCoursesLayout === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ brandCoursesLayout: opt.value })}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${active ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}
                >
                  <div className="aspect-video rounded-md bg-muted overflow-hidden mb-2 relative">
                    {opt.preview === "rows" && (
                      <div className="absolute inset-0 flex flex-col gap-1 p-1.5">
                        <div className="flex gap-1 flex-1"><div className="flex-1 bg-primary/40 rounded-sm"/><div className="flex-1 bg-primary/30 rounded-sm"/><div className="flex-1 bg-primary/20 rounded-sm"/></div>
                        <div className="flex gap-1 flex-1"><div className="flex-1 bg-accent/40 rounded-sm"/><div className="flex-1 bg-accent/30 rounded-sm"/><div className="flex-1 bg-accent/20 rounded-sm"/></div>
                      </div>
                    )}
                    {opt.preview === "grid" && (
                      <div className="absolute inset-0 grid grid-cols-3 gap-1 p-1.5">
                        {Array.from({length:6}).map((_,i)=>(<div key={i} className="bg-primary/30 rounded-sm"/>))}
                      </div>
                    )}
                    {opt.preview === "neon" && (
                      <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2 bg-black">
                        <div className="bg-primary/30 rounded shadow-[0_0_8px_hsl(var(--primary))]"/>
                        <div className="bg-accent/30 rounded shadow-[0_0_8px_hsl(var(--accent))]"/>
                      </div>
                    )}
                    {opt.preview === "cinema" && (
                      <div className="absolute inset-0 flex flex-col gap-1 p-1.5">
                        <div className="flex-1 bg-gradient-to-r from-primary/40 to-accent/40 rounded-sm"/>
                        <div className="flex-1 bg-gradient-to-r from-accent/30 to-primary/30 rounded-sm"/>
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">{opt.desc}</div>
                </button>
              );
            })}
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
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                Este domínio ainda não está vinculado à sua conta no servidor.
                <div className="text-muted-foreground mt-1">
                  Clique em <b>Salvar</b> no final desta página para registrar o domínio. Depois, confirme que o DNS (CNAME) e a ativação no Easypanel já foram feitos conforme os passos abaixo.
                </div>
              </div>
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
