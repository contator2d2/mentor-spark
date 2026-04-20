import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function CaptureSettings() {
  const { user } = useAuth();
  const [qr, setQr] = useState<{ url: string; qr: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.slug) return;
    const url = `${window.location.origin}/c/${user.slug}`;
    QRCode.toDataURL(url, { width: 512, margin: 2 })
      .then((dataUrl) => setQr({ url, qr: dataUrl }))
      .catch(() => toast.error("Erro ao gerar QR Code"))
      .finally(() => setLoading(false));
  }, [user?.slug]);

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (!qr) return <p className="text-muted-foreground">Configure seu slug primeiro.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Captação de leads</h1>
        <p className="text-muted-foreground mt-1">Compartilhe esse link ou imprima o QR para usar em eventos.</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
        <div>
          <label className="text-xs uppercase font-semibold text-muted-foreground">Seu link público</label>
          <div className="flex gap-2 mt-1">
            <Input readOnly value={qr.url} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(qr.url);
                toast.success("Link copiado");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <a href={qr.url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
        <div className="text-center">
          <img src={qr.qr} alt="QR Code" className="mx-auto w-64 h-64 border rounded-lg" />
          <a href={qr.qr} download={`qrcode-${user?.slug}.png`} className="text-sm text-primary hover:underline mt-2 inline-block">
            Baixar QR Code
          </a>
        </div>
      </div>
    </div>
  );
}
