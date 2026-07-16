import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ArrowLeft, Sparkles, Loader2, Save, Plus, Trash2, ExternalLink, Copy, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Feature = { icon?: string; title: string; text?: string };
type Faq = { q: string; a: string };
type Testimonial = { name: string; role?: string; quote: string; avatarUrl?: string };

type SalesPage = {
  id: string;
  slug: string;
  title: string;
  productType: string;
  productRefId?: string | null;
  headline?: string;
  subheadline?: string;
  description?: string;
  heroImageUrl?: string;
  videoUrl?: string;
  features: Feature[];
  faqs: Faq[];
  testimonials: Testimonial[];
  badges: string[];
  guaranteeText?: string;
  ctaText: string;
  priceCents: number;
  currency: string;
  originalPriceCents?: number | null;
  maxInstallments: number;
  paymentMode: "one_time" | "subscription";
  subscriptionCycle?: string | null;
  paymentProviderId?: string | null;
  published: boolean;
  seo?: { title?: string; description?: string; ogImage?: string };
};

type Provider = { id: string; type: string; label?: string; environment: string; hasApiKey: boolean };

export default function SalesPageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState<SalesPage | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // AI form
  const [briefing, setBriefing] = useState("");
  const [audience, setAudience] = useState("");
  const [priceHint, setPriceHint] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, provs] = await Promise.all([
          api<SalesPage>(`/sales-pages/${id}`),
          api<Provider[]>(`/events/payments/providers`).catch(() => [] as Provider[]),
        ]);
        setPage(p);
        setProviders((provs || []).filter((x) => x.type === "asaas"));
      } catch (e: any) {
        toast.error(e.message);
        navigate("/app/sales-pages");
      }
    })();
  }, [id]);

  const patch = (upd: Partial<SalesPage>) => setPage((prev) => (prev ? { ...prev, ...upd } : prev));

  const save = async (extra?: Partial<SalesPage>) => {
    if (!page) return;
    try {
      setSaving(true);
      const body = { ...page, ...(extra || {}) };
      const saved = await api<SalesPage>(`/sales-pages/${page.id}`, { method: "PUT", body });
      setPage(saved);
      toast.success("Salvo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!page) return;
    if (!page.paymentProviderId) {
      toast.error("Escolha um provedor Asaas antes de publicar.");
      return;
    }
    if (!page.priceCents) {
      toast.error("Defina um preço maior que zero.");
      return;
    }
    await save({ published: true });
    toast.success("Página publicada!");
  };

  const unpublish = async () => save({ published: false });

  const generateWithAi = async () => {
    if (briefing.trim().length < 10) {
      toast.error("Descreva o produto em pelo menos 10 caracteres.");
      return;
    }
    try {
      setGenerating(true);
      const g = await api<any>("/sales-pages/generate", {
        method: "POST",
        body: { briefing, audience, priceHint, productType: page?.productType },
      });
      patch({
        title: g.title || page?.title,
        headline: g.headline,
        subheadline: g.subheadline,
        description: g.description,
        features: g.features || [],
        badges: g.badges || [],
        guaranteeText: g.guaranteeText,
        ctaText: g.ctaText || page?.ctaText,
        faqs: g.faqs || [],
        seo: g.seo,
      });
      toast.success("Copy gerada! Revise e salve.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const publicUrl = page ? `${window.location.origin}/p/${user?.slug || "seu-slug"}/${page.slug}` : "";

  if (!page) return <div className="p-6">Carregando…</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/app/sales-pages"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display">{page.title}</h1>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              {page.published ? (
                <Badge className="bg-primary/15 text-primary border-primary/20">Publicada</Badge>
              ) : (
                <Badge variant="outline">Rascunho</Badge>
              )}
              <span className="truncate">{publicUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}
                className="hover:text-foreground"
              ><Copy className="h-3 w-3" /></button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {page.published && (
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button variant="outline"><ExternalLink className="h-4 w-4 mr-2" />Ver</Button>
            </a>
          )}
          <Button variant="outline" onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
          {page.published ? (
            <Button variant="outline" onClick={unpublish}>Despublicar</Button>
          ) : (
            <Button onClick={publish} className="bg-gradient-primary shadow-glow">
              <Rocket className="h-4 w-4 mr-2" />Publicar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai"><Sparkles className="h-3 w-3 mr-1" />Gerar com IA</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="offer">Oferta</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="checkout">Checkout</TabsTrigger>
        </TabsList>

        {/* ===== IA ===== */}
        <TabsContent value="ai">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Descreva seu produto
              </h3>
              <p className="text-sm text-muted-foreground">
                A IA vai escrever hero, benefícios, FAQ, CTA e SEO. Você revisa e ajusta.
              </p>
            </div>
            <div>
              <Label>O que você vende? (obrigatório)</Label>
              <Textarea
                rows={3}
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Ex: mentoria em grupo de 3 meses para advogados iniciantes que querem sair da CLT e abrir escritório próprio. Inclui 12 encontros ao vivo, comunidade e templates de contratos."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Público-alvo</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Advogados de 25-40 anos, recém-formados" />
              </div>
              <div>
                <Label>Preço / oferta</Label>
                <Input value={priceHint} onChange={(e) => setPriceHint(e.target.value)} placeholder="R$ 2.997 à vista ou 12x R$ 297" />
              </div>
            </div>
            <Button onClick={generateWithAi} disabled={generating} className="bg-gradient-primary shadow-glow">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar copy com IA
            </Button>
          </Card>
        </TabsContent>

        {/* ===== Conteúdo ===== */}
        <TabsContent value="content" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Nome interno / título</Label>
              <Input value={page.title} onChange={(e) => patch({ title: e.target.value })} />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={page.slug} onChange={(e) => patch({ slug: e.target.value })} />
            </div>
            <div>
              <Label>Headline (título do hero)</Label>
              <Input value={page.headline || ""} onChange={(e) => patch({ headline: e.target.value })} />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea rows={2} value={page.subheadline || ""} onChange={(e) => patch({ subheadline: e.target.value })} />
            </div>
            <div>
              <Label>Descrição / pitch</Label>
              <Textarea rows={4} value={page.description || ""} onChange={(e) => patch({ description: e.target.value })} />
            </div>
            <ImageUploadField
              label="Imagem hero"
              value={page.heroImageUrl}
              onChange={(url) => patch({ heroImageUrl: url })}
              aspect="16/9"
            />
            <div>
              <Label>URL de vídeo (YouTube/Vimeo — opcional)</Label>
              <Input value={page.videoUrl || ""} onChange={(e) => patch({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Benefícios / Features</h3>
              <Button variant="outline" size="sm" onClick={() => patch({ features: [...page.features, { title: "Novo benefício", text: "" }] })}>
                <Plus className="h-4 w-4 mr-1" />Adicionar
              </Button>
            </div>
            {page.features.map((f, i) => (
              <div key={i} className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <Input value={f.title} onChange={(e) => {
                  const arr = [...page.features]; arr[i] = { ...f, title: e.target.value }; patch({ features: arr });
                }} placeholder="Título" />
                <Input value={f.text || ""} onChange={(e) => {
                  const arr = [...page.features]; arr[i] = { ...f, text: e.target.value }; patch({ features: arr });
                }} placeholder="Descrição curta" />
                <Button variant="ghost" size="sm" onClick={() => patch({ features: page.features.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-bold">Badges (destaque abaixo do CTA)</h3>
            <div className="flex gap-2 flex-wrap">
              {page.badges.map((b, i) => (
                <div key={i} className="flex items-center gap-1 border rounded-full pl-3 pr-1 py-1 bg-muted/40">
                  <input
                    className="bg-transparent text-sm outline-none w-40"
                    value={b}
                    onChange={(e) => {
                      const arr = [...page.badges]; arr[i] = e.target.value; patch({ badges: arr });
                    }}
                  />
                  <button onClick={() => patch({ badges: page.badges.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => patch({ badges: [...page.badges, "Novo destaque"] })}>
                <Plus className="h-3 w-3 mr-1" />Adicionar
              </Button>
            </div>
            <div>
              <Label>Texto de garantia</Label>
              <Input value={page.guaranteeText || ""} onChange={(e) => patch({ guaranteeText: e.target.value })} placeholder="Garantia incondicional de 7 dias" />
            </div>
          </Card>
        </TabsContent>

        {/* ===== Oferta ===== */}
        <TabsContent value="offer">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={(page.priceCents / 100).toString()}
                  onChange={(e) => patch({ priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                />
              </div>
              <div>
                <Label>Preço "de" — opcional (riscado)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={page.originalPriceCents ? (page.originalPriceCents / 100).toString() : ""}
                  onChange={(e) => patch({ originalPriceCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                />
              </div>
              <div>
                <Label>Máximo de parcelas (cartão)</Label>
                <Input
                  type="number" min="1" max="12"
                  value={page.maxInstallments}
                  onChange={(e) => patch({ maxInstallments: Math.max(1, Math.min(12, parseInt(e.target.value || "1"))) })}
                />
              </div>
              <div>
                <Label>Modelo</Label>
                <Select value={page.paymentMode} onValueChange={(v: any) => patch({ paymentMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Pagamento único</SelectItem>
                    <SelectItem value="subscription">Assinatura recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {page.paymentMode === "subscription" && (
                <div>
                  <Label>Ciclo</Label>
                  <Select value={page.subscriptionCycle || "MONTHLY"} onValueChange={(v) => patch({ subscriptionCycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                      <SelectItem value="SEMIANNUALLY">Semestral</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>Texto do botão (CTA)</Label>
              <Input value={page.ctaText} onChange={(e) => patch({ ctaText: e.target.value })} />
            </div>
          </Card>
        </TabsContent>

        {/* ===== FAQ ===== */}
        <TabsContent value="faq">
          <Card className="p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Perguntas frequentes</h3>
              <Button variant="outline" size="sm" onClick={() => patch({ faqs: [...page.faqs, { q: "Nova pergunta", a: "" }] })}>
                <Plus className="h-4 w-4 mr-1" />Adicionar
              </Button>
            </div>
            {page.faqs.map((f, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex gap-2 items-start">
                  <Input value={f.q} onChange={(e) => {
                    const arr = [...page.faqs]; arr[i] = { ...f, q: e.target.value }; patch({ faqs: arr });
                  }} placeholder="Pergunta" />
                  <Button variant="ghost" size="sm" onClick={() => patch({ faqs: page.faqs.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea rows={2} value={f.a} onChange={(e) => {
                  const arr = [...page.faqs]; arr[i] = { ...f, a: e.target.value }; patch({ faqs: arr });
                }} placeholder="Resposta" />
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* ===== Checkout ===== */}
        <TabsContent value="checkout">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-1">Provedor de pagamento Asaas</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Cada mentor conecta a própria conta Asaas em <Link to="/app/integrations" className="text-primary underline">Integrações</Link>. O dinheiro cai direto na sua conta.
              </p>
              {providers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum provedor Asaas configurado ainda. <Link to="/app/integrations" className="text-primary font-medium underline">Configurar agora →</Link>
                </div>
              ) : (
                <Select
                  value={page.paymentProviderId || ""}
                  onValueChange={(v) => patch({ paymentProviderId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione uma conta Asaas" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label || "Asaas"} · {p.environment === "production" ? "Produção" : "Sandbox"} {p.hasApiKey ? "" : " (sem key)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/15 p-4 text-sm space-y-1">
              <div className="font-semibold">Como funciona</div>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Cliente escolhe <b>PIX</b> ou <b>Cartão</b> no checkout transparente (sem sair da página).</li>
                <li>PIX gera QR Code + copia-e-cola na hora.</li>
                <li>Cartão aceita parcelamento até {page.maxInstallments}x.</li>
                <li>O valor cai direto na sua conta Asaas — 0% de intermediário da plataforma.</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}