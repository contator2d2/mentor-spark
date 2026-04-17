import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CapturePage from "./pages/CapturePage";
import TestPlayer from "./pages/TestPlayer";
import NotFound from "./pages/NotFound";

import AppLayout from "./components/layouts/AppLayout";
import MentoradoLayout from "./components/layouts/MentoradoLayout";

import Dashboard from "./pages/app/Dashboard";
import LeadsPage from "./pages/app/LeadsPage";
import CaptureSettings from "./pages/app/CaptureSettings";
import AiAssistant from "./pages/app/AiAssistant";
import AdminPage from "./pages/app/AdminPage";
import AdminTenants from "./pages/app/AdminTenants";
import AiProvidersPage from "./pages/app/AiProvidersPage";
import PlaceholderPage from "./pages/app/PlaceholderPage";
import Onboarding from "./pages/app/Onboarding";
import BrandingSettings from "./pages/app/BrandingSettings";
import MentoradosPage from "./pages/app/MentoradosPage";
import IntegrationsPage from "./pages/app/IntegrationsPage";
import AdminPlans from "./pages/app/AdminPlans";
import TestsListPage from "./pages/app/TestsListPage";
import TestBuilder from "./pages/app/TestBuilder";
import LeadDossier from "./pages/app/LeadDossier";
import PromptsPage from "./pages/app/PromptsPage";
import TasksKanban from "./pages/app/TasksKanban";
import ContentsPage from "./pages/app/ContentsPage";

import MentoradoHome from "./pages/me/MentoradoHome";

const queryClient = new QueryClient();

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  if (user.role === "prospect" || user.role === "mentorado") return <Navigate to="/me" replace />;
  if (user.role === "mentor" && !user.onboardingCompleted) return <Navigate to="/app/onboarding" replace />;
  return <Navigate to="/app" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter>
        <BrandingProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/c/:slug" element={<CapturePage />} />
              <Route path="/c/:slug/test/:testId" element={<TestPlayer />} />

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
                <Route path="leads/:id" element={<LeadDossier />} />
                <Route path="mentorados" element={<MentoradosPage />} />
                <Route path="tests" element={<TestsListPage />} />
                <Route path="tests/new" element={<TestBuilder />} />
                <Route path="tests/:id" element={<TestBuilder />} />
                <Route path="meetings" element={<PlaceholderPage title="Reuniões" description="Cards de reunião com transcrição + IA." endpoint="/meetings" />} />
                <Route path="tasks" element={<TasksKanban />} />
                <Route path="contents" element={<ContentsPage />} />
                <Route path="ai" element={<AiAssistant />} />
                <Route path="prompts" element={<PromptsPage />} />
                <Route path="capture" element={<CaptureSettings />} />
                <Route path="settings/branding" element={<BrandingSettings />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="admin/plans" element={<AdminPlans />} />
                <Route path="admin/tenants" element={<AdminTenants />} />
                <Route path="admin/ai-providers" element={<AiProvidersPage />} />
              </Route>

              {/* Onboarding (full-screen, mas exige auth) */}
              <Route
                path="/app/onboarding"
                element={
                  <ProtectedRoute roles={["mentor", "super_admin"]}>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

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
        </BrandingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
