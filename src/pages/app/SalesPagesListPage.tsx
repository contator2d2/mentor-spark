import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Copy, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type SalesPage = {
  id: string;
  slug: string;
  title: string;
  headline?: string;
  priceCents: number;
  published: boolean;
  updatedAt: string;
};

export default function SalesPagesListPage() {
  const [items, setItems] = useState<SalesPage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const data = await api<SalesPage[]>("/sales-pages");
      setItems(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createEmpty = async () => {
    try {
      const p = await api<SalesPage>("/sales-pages", {
        method: "POST",
        body: { title: "Nova página de vendas" },
      });
      navigate(`/app/sales-pages/${p.id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta página?")) return;
    try {
      await api(`/sales-pages/${id}`, { method: "DELETE" });
      toast.success("Página excluída");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${user?.slug || "seu-slug"}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Páginas de Venda
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Uma página, um produto. IA escreve a copy, você publica com checkout Asaas em minutos.
          </p>
        </div>
        <Button onClick={createEmpty} className="bg-gradient-primary shadow-glow">
          <Plus className="h-4 w-4 mr-2" /> Nova página
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-primary/50 mb-3" />
          <h2 className="font-bold text-lg mb-1">Sua primeira página de vendas</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Descreva seu produto em 1 frase e a IA gera hero, benefícios, FAQ e CTA. Depois é só configurar o preço e publicar.
          </p>
          <Button onClick={createEmpty} className="bg-gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-2" /> Criar minha primeira página
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/app/sales-pages/${p.id}`} className="font-bold hover:text-primary">
                    {p.title}
                  </Link>
                  {p.published ? (
                    <Badge className="bg-primary/15 text-primary border-primary/20">Publicada</Badge>
                  ) : (
                    <Badge variant="outline">Rascunho</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  /p/{user?.slug || "seu-slug"}/{p.slug} · R$ {(p.priceCents / 100).toFixed(2)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyUrl(p.slug)}>
                  <Copy className="h-4 w-4" />
                </Button>
                {p.published && (
                  <a href={`/p/${user?.slug}/${p.slug}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                )}
                <Link to={`/app/sales-pages/${p.id}`}>
                  <Button size="sm">Editar</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}