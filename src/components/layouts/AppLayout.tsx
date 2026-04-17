import { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  ShieldCheck,
  QrCode,
  Cpu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["mentor", "super_admin"] },
  { to: "/app/leads", label: "Leads & Funil", icon: Kanban, roles: ["mentor", "super_admin"] },
  { to: "/app/mentorados", label: "Mentorados", icon: Users, roles: ["mentor", "super_admin"] },
  { to: "/app/tests", label: "Testes", icon: ClipboardList, roles: ["mentor", "super_admin"] },
  { to: "/app/meetings", label: "Reuniões", icon: Calendar, roles: ["mentor", "super_admin"] },
  { to: "/app/tasks", label: "Tarefas", icon: CheckSquare, roles: ["mentor", "super_admin"] },
  { to: "/app/contents", label: "Conteúdos", icon: BookOpen, roles: ["mentor", "super_admin"] },
  { to: "/app/ai", label: "Assistente IA", icon: Sparkles, roles: ["mentor", "super_admin"] },
  { to: "/app/capture", label: "Captação / QR", icon: QrCode, roles: ["mentor"] },
  { to: "/app/settings", label: "Configurações", icon: Settings, roles: ["mentor", "super_admin"] },
  { to: "/app/admin", label: "Admin", icon: ShieldCheck, roles: ["super_admin"] },
  { to: "/app/admin/ai-providers", label: "Provedores de IA", icon: Cpu, roles: ["super_admin"] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const items = NAV.filter((i) => !i.roles || i.roles.includes(user?.role || ""));

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="font-display text-xl text-white tracking-tight">
            {user?.brandName || "MentorFlow"}
          </div>
          <div className="text-xs text-sidebar-foreground/60 mt-1">Mentoria Inteligente</div>
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
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm text-white truncate">{user?.name}</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
