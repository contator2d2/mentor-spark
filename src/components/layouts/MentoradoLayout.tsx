import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BookOpen, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/me", label: "Início", icon: LayoutDashboard },
  { to: "/me/tests", label: "Meus testes", icon: ClipboardList },
  { to: "/me/contents", label: "Conteúdos", icon: BookOpen },
  { to: "/me/meetings", label: "Reuniões", icon: Calendar },
];

export default function MentoradoLayout() {
  const { user, logout } = useAuth();
  const { brand } = useBranding();
  const displayName = brand?.brandName || "Sua jornada";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {brand?.brandLogoUrl && (
              <img src={brand.brandLogoUrl} alt={displayName} className="h-9 w-9 rounded object-contain bg-white/5 p-1" />
            )}
            <div className="font-display text-lg text-white truncate">{displayName}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-sidebar-foreground/80 hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/me"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? "border-accent text-white"
                      : "border-transparent text-sidebar-foreground/70 hover:text-white",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
