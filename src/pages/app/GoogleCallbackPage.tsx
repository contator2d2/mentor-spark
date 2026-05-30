import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("Parâmetros code ou state ausentes na resposta do Google.");
      return;
    }

    async function handleCallback() {
      try {
        // Chamamos o backend para processar o callback
        // O backend espera um GET com code e state
        await api(`/integrations/google/callback?code=${code}&state=${state}`);
        setStatus("success");
        setTimeout(() => {
          navigate("/app/integrations?google=ok");
        }, 2000);
      } catch (e: any) {
        console.error("Erro no callback do Google:", e);
        setStatus("error");
        setErrorMsg(e.message || "Erro desconhecido ao processar integração.");
        setTimeout(() => {
          navigate(`/app/integrations?google=error&msg=${encodeURIComponent(e.message || "Erro no processamento")}`);
        }, 3000);
      }
    }

    handleCallback();
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            {status === "error" && <AlertCircle className="h-6 w-6 text-destructive" />}
            Integração Google
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Finalizando conexão com sua conta Google..."}
            {status === "success" && "Conta conectada com sucesso!"}
            {status === "error" && "Ocorreu um erro na integração."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "error" && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 mb-4">
              {errorMsg}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {status === "loading" ? "Não feche esta página." : "Redirecionando de volta ao painel..."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
