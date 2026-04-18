import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClipboardList, Loader2, Plus, Pencil, Trash2, ExternalLink, Library } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function TestsListPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const nav = useNavigate();
  const { user } = useAuth();

  async function load() {
    try {
      setItems(await api<any[]>("/tests/templates"));
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Excluir este teste?")) return;
    await api(`/tests/templates/${id}`, { method: "DELETE" });
    toast.success("Excluído");
    load();
  }

  if (!items) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-3xl font-bold">Testes & Diagnósticos</h1>
            <p className="text-muted-foreground">Crie testes que classificam seus prospects automaticamente.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/app/tests/library")}>
            <Library className="h-4 w-4 mr-2" />Biblioteca
          </Button>
          <Button onClick={() => nav("/app/tests/new")}>
            <Plus className="h-4 w-4 mr-2" />Novo teste
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center space-y-4">
          <p className="text-muted-foreground">
            Nenhum teste ainda. Comece pela biblioteca ou crie do zero.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => nav("/app/tests/library")}>
              <Library className="h-4 w-4 mr-2" />Explorar biblioteca
            </Button>
            <Button onClick={() => nav("/app/tests/new")}>
              <Plus className="h-4 w-4 mr-2" />Criar do zero
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            const publicUrl = user?.slug ? `${window.location.origin}/c/${user.slug}/test/${t.id}` : null;
            return (
              <Card key={t.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold">{t.title}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="capitalize">{t.category}</Badge>
                      {t.sourceLibraryId && (
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                          <Library className="h-3 w-3 mr-1" />Da biblioteca
                        </Badge>
                      )}
                    </div>
                  </div>
                  {t.active && <Badge>Ativo</Badge>}
                </div>
                {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                <p className="text-xs text-muted-foreground">{t.questions?.length || 0} perguntas</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => nav(`/app/tests/${t.id}`)}>
                    <Pencil className="h-3 w-3 mr-1" />Editar
                  </Button>
                  {publicUrl && (
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}>
                      <ExternalLink className="h-3 w-3 mr-1" />Link público
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
