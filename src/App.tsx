import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CapturePage from "./pages/CapturePage";
import NotFound from "./pages/NotFound";

import AppLayout from "./components/layouts/AppLayout";
import MentoradoLayout from "./components/layouts/MentoradoLayout";

import Dashboard from "./pages/app/Dashboard";
import LeadsPage from "./pages/app/LeadsPage";
import CaptureSettings from "./pages/app/CaptureSettings";
import AiAssistant from "./pages/app/AiAssistant";
import AdminPage from "./pages/app/AdminPage";
import PlaceholderPage from "./pages/app/PlaceholderPage";

import MentoradoHome from "./pages/me/MentoradoHome";

const queryClient = new QueryClient();

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  if (user.role === "prospect" || user.role === "mentorado") return <Navigate to="/me" replace />;
  return <Navigate to="/app" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/c/:slug" element={<CapturePage />} />

            {/* Painel do mentor */}
            <Route
              path="/app"
              element={
                <ProtectedRoute roles={["mentor", "super_admin"]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/:id" element={<PlaceholderPage title="Prontuário do mentorado" description="Histórico unificado: testes, reuniões, tarefas, anotações." />} />
              <Route path="mentorados" element={<PlaceholderPage title="Mentorados" description="Mentorados ativos." endpoint="/leads?stage=client" />} />
              <Route path="tests" element={<PlaceholderPage title="Testes & Diagnósticos" description="Builder de testes." endpoint="/tests/templates" />} />
              <Route path="meetings" element={<PlaceholderPage title="Reuniões" description="Cards de reunião com transcrição + IA." endpoint="/meetings" />} />
              <Route path="tasks" element={<PlaceholderPage title="Tarefas" description="Kanban de tarefas dos mentorados." endpoint="/tasks" />} />
              <Route path="contents" element={<PlaceholderPage title="Conteúdos" description="Biblioteca enviada aos mentorados/prospects." endpoint="/contents" />} />
              <Route path="ai" element={<AiAssistant />} />
              <Route path="capture" element={<CaptureSettings />} />
              <Route path="settings" element={<PlaceholderPage title="Configurações" description="Branding, perfil, integrações." />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>

            {/* App do prospect/mentorado */}
            <Route
              path="/me"
              element={
                <ProtectedRoute roles={["prospect", "mentorado"]}>
                  <MentoradoLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MentoradoHome />} />
              <Route path="tests" element={<PlaceholderPage title="Meus testes" description="Testes recebidos do seu mentor." endpoint="/tests/responses" />} />
              <Route path="contents" element={<PlaceholderPage title="Conteúdos" description="Liberados pelo seu mentor." endpoint="/contents" />} />
              <Route path="meetings" element={<PlaceholderPage title="Reuniões" description="Suas reuniões agendadas." endpoint="/meetings" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
