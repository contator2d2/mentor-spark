   Globe,
   LayoutGrid,
   Home,
   LayoutPanelLeft,
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Users,
  Kanban,
  ClipboardList,
  Calendar,
  CheckSquare,
  BookOpen,
  Sparkles,
  Bell,
  Settings,
   LogOut,
   UserCircle,
  ShieldCheck,
  QrCode,
  Cpu,
  KeyRound,
  Plug,
  Layers,
  Wallet,
  CalendarDays,
  FileText,
  KanbanSquare,
  MessageSquare,
  Zap,
  Menu,
  X,
  Briefcase,
  GraduationCap,
  DollarSign,
  CalendarClock,
  Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { usePlanFeatures, type PlanFeatures } from "@/hooks/usePlanFeatures";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
  feature?: keyof PlanFeatures;
}

const NAV: NavItem[] = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant", "agency"] },
   { to: "/app/agenda", label: "Agenda", icon: CalendarClock, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/leads", label: "Leads & Funil", icon: Kanban, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/boards", label: "Meus Kanbans", icon: KanbanSquare, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
    { to: "/app/demands", label: "Central de Demandas", icon: Briefcase, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "agency"] },
   { to: "/app/mentorados", label: "Mentorados", icon: Users, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/tests", label: "Testes", icon: ClipboardList, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/quiz", label: "Quizzes PVP", icon: Zap, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/meetings", label: "Reuniões", icon: Calendar, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowMeetings" },
   { to: "/app/scheduling", label: "Agenda Pública", icon: CalendarDays, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowScheduling" },
   { to: "/app/tasks", label: "Tarefas", icon: CheckSquare, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/billing", label: "Cobranças", icon: DollarSign, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowMentorBilling" },
   { to: "/app/trails", label: "Trilhas", icon: GraduationCap, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowTrails" },
   { to: "/app/access-groups", label: "Grupos de Acesso", icon: Users, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
   { to: "/app/community", label: "Comunidade", icon: Users, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowCommunity" },
   { to: "/app/analytics", label: "Analytics", icon: Sparkles, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowAdvancedAnalytics" },
   { to: "/app/messages/templates", label: "Mensagens", icon: MessageSquare, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowMessaging" },
   { to: "/app/whatsapp/groups", label: "Grupos WhatsApp", icon: Users, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowWhatsapp" },
   { to: "/app/automations", label: "Automações", icon: Zap, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowAutomations" },
    { to: "/app/team", label: "Equipe", icon: Users, roles: ["mentor", "super_admin", "mentor_team", "admin"] },
    { to: "/app/contents", label: "Conteúdos", icon: BookOpen, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor"] },
   { to: "/app/ai", label: "Assistente IA", icon: Sparkles, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowAi" },
   { to: "/app/prompts", label: "Prompts", icon: BookOpen, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"], feature: "allowAi" },
    { to: "/app/capture", label: "Captação / QR", icon: QrCode, roles: ["mentor", "mentor_team", "admin"] },
    { to: "/app/events", label: "Eventos", icon: CalendarDays, roles: ["mentor", "super_admin", "mentor_team", "admin", "editor", "attendant"] },
    { to: "/app/contracts/templates", label: "Contratos", icon: FileText, roles: ["mentor", "super_admin", "mentor_team", "admin"] },
    { to: "/app/integrations", label: "Integrações", icon: Plug, roles: ["mentor", "super_admin", "mentor_team", "admin"] },
     { to: "/app/settings/branding", label: "Branding", icon: Settings, roles: ["mentor", "super_admin", "mentor_team", "admin"] },
     { to: "/app/cms", label: "Site / CMS", icon: LayoutPanelLeft, roles: ["mentor", "super_admin", "mentor_team", "admin"] },
  { to: "/app/admin", label: "Mentores", icon: ShieldCheck, roles: ["super_admin"] },
  { to: "/app/admin/finance", label: "Financeiro", icon: Wallet, roles: ["super_admin"] },
  { to: "/app/admin/plans", label: "Planos", icon: Layers, roles: ["super_admin"] },
  { to: "/app/admin/tenants", label: "Tenants", icon: Users, roles: ["super_admin"] },
  { to: "/app/admin/ai-providers", label: "Provedores de IA", icon: Cpu, roles: ["super_admin"] },
  { to: "/app/admin/ai-usage", label: "Consumo IA / Tokens", icon: Sparkles, roles: ["super_admin"] },
  { to: "/app/admin/credentials", label: "Credenciais OAuth", icon: KeyRound, roles: ["super_admin"] },
  { to: "/app/admin/domains", label: "Domínios", icon: Globe, roles: ["super_admin"] },
];

// Atalhos rápidos para a bottom nav mobile
const MOBILE_QUICK = [
  { to: "/app", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/app/leads", label: "Leads", icon: Kanban },
  { to: "/app/mentorados", label: "Pessoas", icon: Users },
  { to: "/app/tasks", label: "Tarefas", icon: CheckSquare },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { brand } = useBranding();
  const { features } = usePlanFeatures();
  const loc = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = user ? NAV.filter((i) => {
    const userRole = user.role || "";
    const effectiveRole = userRole === "mentor_team" ? user.teamRole || "attendant" : userRole;
    if (i.roles && !i.roles.includes(effectiveRole)) return false;
    if (userRole === "super_admin") return true;
    if (i.feature && !features[i.feature]) return false;
    return true;
  }) : [];
  const displayName = brand?.brandName || user?.brandName || "Mentor Glee-go";

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="px-6 py-6 border-b border-sidebar-border flex items-center gap-3">
        {brand?.brandLogoUrl ? (
          <img src={brand.brandLogoUrl} alt={displayName} className="h-9 w-9 rounded object-contain bg-white/5 p-1" />
        ) : null}
        <div className="min-w-0">
          <div className="font-display text-lg text-white tracking-tight truncate">{displayName}</div>
          <div className="text-xs text-sidebar-foreground/60 mt-0.5">Mentoria Inteligente</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/app"}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white truncate">{user?.name}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          </div>
           <ThemeToggle className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white h-9 w-9" />
           <Button variant="ghost" size="icon" onClick={() => navigate("/app/profile")} className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white h-9 w-9" title="Meu Perfil">
             <UserCircle className="h-4 w-4" />
           </Button>
          <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <header className="md:hidden sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border/50 shadow-soft">
          <div className="px-3 pt-[env(safe-area-inset-top)]">
            <div className="h-14 flex items-center justify-between gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white h-10 w-10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col">
                  <SidebarContent onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <button
                onClick={() => navigate("/app")}
                className="flex items-center gap-2 min-w-0 flex-1 justify-center"
              >
                {brand?.brandLogoUrl ? (
                  <img src={brand.brandLogoUrl} alt={displayName} className="h-8 w-8 rounded object-contain bg-white/10 p-0.5 shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded bg-gradient-primary shrink-0 flex items-center justify-center text-white font-display font-bold text-sm">
                    {displayName.charAt(0)}
                  </div>
                )}
                <div className="font-display text-base text-white truncate">{displayName}</div>
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-white h-10 w-10"
                onClick={() => navigate("/app/mentorados")}
              >
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-10 max-w-7xl mx-auto animate-fade-in pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-10">
            <Outlet />
          </div>
        </main>

        {/* Bottom Nav Mobile - atalhos rápidos */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border/50 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          <div className="grid grid-cols-5">
            {MOBILE_QUICK.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-all relative",
                      isActive ? "text-white" : "text-sidebar-foreground/60",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-accent rounded-full" />
                      )}
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isActive && "bg-accent/20")}>
                        <Icon className={cn("h-4 w-4", isActive && "text-accent")} />
                      </div>
                      <span className="font-medium">{n.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-sidebar-foreground/60"
            >
              <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                <Menu className="h-4 w-4" />
              </div>
              <span className="font-medium">Mais</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
