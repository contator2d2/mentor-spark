import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlaceholderPage({ title, description, endpoint }: { title: string; description: string; endpoint?: string }) {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    if (!endpoint) return setItems([]);
    api(endpoint).then(setItems).catch(() => setItems([]));
  }, [endpoint]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
        {items === null ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        ) : items.length === 0 ? (
          <>
            <p className="text-muted-foreground mb-4">Nenhum item ainda. Esta tela está pronta para receber UI completa.</p>
            <Button>Criar primeiro</Button>
          </>
        ) : (
          <pre className="text-left text-xs overflow-auto">{JSON.stringify(items, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
