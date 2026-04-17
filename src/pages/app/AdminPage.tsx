import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const [mentors, setMentors] = useState<any[] | null>(null);
  useEffect(() => {
    api("/admin/mentors").then(setMentors);
  }, []);
  async function setStatus(id: string, status: string) {
    await api(`/admin/mentors/${id}/status`, { method: "PATCH", body: { status } });
    setMentors((m) => m?.map((x) => (x.id === id ? { ...x, status } : x)) || null);
    toast.success("Atualizado");
  }
  if (!mentors) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Aprovação de mentores</h1>
        <p className="text-muted-foreground mt-1">Gerencie quem tem acesso à plataforma.</p>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Email</th><th className="text-left p-3">Marca</th><th className="text-left p-3">Status</th><th className="p-3">Ações</th></tr>
          </thead>
          <tbody>
            {mentors.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3 text-muted-foreground">{m.email}</td>
                <td className="p-3">{m.brandName}</td>
                <td className="p-3"><Badge variant={m.status === "active" ? "default" : m.status === "pending" ? "secondary" : "destructive"}>{m.status}</Badge></td>
                <td className="p-3 flex gap-2 justify-end">
                  {m.status !== "active" && <Button size="sm" onClick={() => setStatus(m.id, "active")}><Check className="h-3 w-3 mr-1" />Aprovar</Button>}
                  {m.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "suspended")}><X className="h-3 w-3 mr-1" />Suspender</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
