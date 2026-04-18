// Prontuário da Empresa (entidade) — /app/companies/:id
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Building2, Loader2, UserPlus, Users, Calendar, FileText, Mail, KeyRound, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function CompanyDossier() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [savingPartner, setSavingPartner] = useState(false);
  const [partner, setPartner] = useState<any>({
    name: "", email: "", phone: "", partnerRole: "", partnerShare: "", cpf: "", grantAccess: true,
  });

  async function load() {
    try { setData(await api(`/companies/${id}`)); }
    catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  async function addPartner() {
    if (!partner.name || !partner.email) { toast.error("Nome e email obrigatórios"); return; }
    setSavingPartner(true);
    try {
      await api(`/companies/${id}/partners`, {
        method: "POST",
        body: {
          ...partner,
          partnerShare: partner.partnerShare ? Number(partner.partnerShare) : undefined,
        },
      });
      toast.success("Sócio adicionado!");
      setPartnerOpen(false);
      setPartner({ name: "", email: "", phone: "", partnerRole: "", partnerShare: "", cpf: "", grantAccess: true });
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingPartner(false);
    }
  }

  async function grantAccess(leadId: string) {
    try {
      const res = await api<any>(`/companies/partners/${leadId}/grant-access`, { method: "POST" });
      toast.success(res.sentEmail ? "Acesso liberado e email enviado" : "Acesso liberado");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  const { company, partners, meetings, contracts, stats } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => nav("/app/leads")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar
      </Button>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Building2 className="h-3 w-3" />Entidade jurídica
            </div>
            <h1 className="font-display text-3xl font-bold">{company.legalName}</h1>
            {company.tradeName && <div className="text-muted-foreground">{company.tradeName}</div>}
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              {company.cnpj && <span>CNPJ: {company.cnpj}</span>}
              {company.email && <span>{company.email}</span>}
              {company.phone && <span>{company.phone}</span>}
              {company.addressCity && <span>{company.addressCity}/{company.addressState}</span>}
            </div>
          </div>
          <Dialog open={partnerOpen} onOpenChange={setPartnerOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary"><UserPlus className="h-4 w-4 mr-2" />Adicionar sócio</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo sócio</DialogTitle>
                <DialogDescription>Cadastre um sócio vinculado a {company.legalName}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome *"><Input value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} /></Field>
                  <Field label="Email *"><Input type="email" value={partner.email} onChange={(e) => setPartner({ ...partner, email: e.target.value })} /></Field>
                  <Field label="Telefone"><Input value={partner.phone} onChange={(e) => setPartner({ ...partner, phone: e.target.value })} /></Field>
                  <Field label="CPF"><Input value={partner.cpf} onChange={(e) => setPartner({ ...partner, cpf: e.target.value })} /></Field>
                  <Field label="Cargo"><Input value={partner.partnerRole} onChange={(e) => setPartner({ ...partner, partnerRole: e.target.value })} /></Field>
                  <Field label="% Part."><Input type="number" value={partner.partnerShare} onChange={(e) => setPartner({ ...partner, partnerShare: e.target.value })} /></Field>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
                  <div>
                    <div className="text-sm font-medium">Liberar acesso ao app</div>
                    <div className="text-xs text-muted-foreground">Cria login e envia senha por email.</div>
                  </div>
                  <Switch checked={partner.grantAccess} onCheckedChange={(v) => setPartner({ ...partner, grantAccess: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addPartner} disabled={savingPartner} className="bg-gradient-primary">
                  {savingPartner && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Adicionar sócio
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Sócios" value={stats.partnersCount} />
        <StatCard icon={Calendar} label="Reuniões" value={stats.meetingsCount} />
        <StatCard icon={FileText} label="Contratos" value={stats.contractsCount} />
      </div>

      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Sócios ({partners.length})</TabsTrigger>
          <TabsTrigger value="meetings">Reuniões ({meetings.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contratos ({contracts.length})</TabsTrigger>
          <TabsTrigger value="data">Dados da empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-2">
          {partners.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum sócio cadastrado.</Card>
          ) : partners.map((p: any) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                  {p.name.split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                    <Mail className="h-3 w-3" />{p.email}
                    {p.partnerRole && <Badge variant="outline" className="text-[10px]">{p.partnerRole}</Badge>}
                    {p.partnerShare && <span>· {p.partnerShare}%</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.hasAccess ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 capitalize">{p.accessRole}</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => grantAccess(p.id)}>
                    <KeyRound className="h-3 w-3 mr-1" />Liberar acesso
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => nav(`/app/leads/${p.id}`)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="meetings" className="space-y-2">
          {meetings.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma reunião com sócios.</Card>
          ) : meetings.map((m: any) => (
            <Card key={m.id} className="p-4">
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(m.scheduledAt).toLocaleString("pt-BR")} · {m.status}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-2">
          {contracts.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum contrato gerado.</Card>
          ) : contracts.map((c: any) => (
            <Card key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.title || "Contrato"}</div>
                <div className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString("pt-BR")}</div>
              </div>
              <Badge variant="outline" className="capitalize">{c.status || "—"}</Badge>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="data">
          <Card className="p-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <DataRow k="Razão social" v={company.legalName} />
            <DataRow k="Nome fantasia" v={company.tradeName} />
            <DataRow k="CNPJ" v={company.cnpj} />
            <DataRow k="Inscrição estadual" v={company.stateRegistration} />
            <DataRow k="Email" v={company.email} />
            <DataRow k="Telefone" v={company.phone} />
            <DataRow k="Site" v={company.website} />
            <DataRow k="Segmento" v={company.segment} />
            <DataRow k="Funcionários" v={company.employees} />
            <DataRow k="Faturamento" v={company.revenue ? `R$ ${company.revenue}` : null} />
            <DataRow k="Endereço" v={[company.addressStreet, company.addressNumber].filter(Boolean).join(", ")} />
            <DataRow k="Cidade/UF" v={[company.addressCity, company.addressState].filter(Boolean).join("/")} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-3 w-3" />{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}
function DataRow({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-medium">{v || "—"}</div>
    </div>
  );
}
