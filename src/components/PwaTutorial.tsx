import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, MoreVertical, PlusSquare, Download } from "lucide-react";

export function PwaTutorial() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          <Smartphone className="w-4 h-4 mr-2" />
          Como Instalar no Celular
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar Aplicativo</DialogTitle>
          <DialogDescription>
            Siga as instruções abaixo para adicionar o app à sua tela de início.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* iOS Section */}
          {(isIOS || (!isIOS && !isAndroid)) && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Smartphone className="w-4 h-4" /> iPhone / iPad (Safari)
              </h3>
              <ol className="text-sm space-y-3 list-decimal list-inside text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>Toque no botão de <strong>Compartilhar</strong></span>
                  <Share className="w-4 h-4 inline-block text-blue-500" />
                </li>
                <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong></li>
                <li className="flex items-start gap-2">
                  <span>Toque em <strong>Adicionar</strong> no canto superior</span>
                  <PlusSquare className="w-4 h-4 inline-block text-blue-500" />
                </li>
              </ol>
            </div>
          )}

          {/* Android Section */}
          {(isAndroid || (!isIOS && !isAndroid)) && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Smartphone className="w-4 h-4" /> Android (Chrome)
              </h3>
              <ol className="text-sm space-y-3 list-decimal list-inside text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>Toque nos <strong>três pontinhos</strong> (menu)</span>
                  <MoreVertical className="w-4 h-4 inline-block" />
                </li>
                <li className="flex items-start gap-2">
                  <span>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></span>
                  <Download className="w-4 h-4 inline-block" />
                </li>
                <li>Siga as instruções na tela e confirme a instalação</li>
              </ol>
            </div>
          )}

          <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground italic">
            Dica: Uma vez instalado, o aplicativo funcionará de forma muito mais rápida e fluida, além de ocupar menos espaço que um app tradicional.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
