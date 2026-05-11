import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Signup() {
  const { signupMentor } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState({ name: "", email: "", password: "", brandName: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signupMentor(data);
      if (res.access_token) {
        toast.success("Conta criada! Vamos configurar sua marca.");
        nav("/app/onboarding");
      } else {
        toast.success(res.message || "Cadastro recebido");
        nav("/login");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between">
        <Link to="/" className="font-display text-2xl font-bold">Mentor Glee-go</Link>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight mb-4">Crie seu espaço de mentoria.</h1>
          <p className="text-white/70">
            Cadastro com aprovação manual. Após aprovado, você terá branding próprio, captação por QR e IA personalizada.
          </p>
        </div>
        <div className="text-sm text-white/50">© {new Date().getFullYear()} Mentor Glee-go</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Solicitar acesso</h2>
            <p className="text-sm text-muted-foreground mt-1">Conte um pouco sobre você.</p>
          </div>
          <div className="space-y-2">
            <Label>Seu nome</Label>
            <Input required value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome da sua mentoria (opcional)</Label>
            <Input value={data.brandName} onChange={(e) => setData({ ...data, brandName: e.target.value })} placeholder="Ex: Crescer Consultoria" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Senha (mín. 8 caracteres)</Label>
            <Input type="password" required minLength={8} value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
