import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, ClipboardList, BookOpen, Calendar, Bell, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/me", label: "Início", icon: Home, end: true },
  { to: "/me/tests", label: "Testes", icon: ClipboardList },
  { to: "/me/contents", label: "Conteúdos", icon: BookOpen },
  { to: "/me/meetings", label: "Agenda", icon: Calendar },
];

export default function MentoradoLayout() {
  const { user, logout } = useAuth();
  const { brand } = useBranding();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const displayName = brand?.brandName || "Mentoria";

  useEffect(() => {
    api<any[]>("/notifications")
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setNotifications(arr.slice(0, 10));
        setUnread(arr.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, []);

  async function markAllRead() {
    try {
      await api("/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header app-style */}
      <header className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border/50 shadow-soft">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="h-14 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate("/me")}
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              {brand?.brandLogoUrl ? (
                <img
                  src={brand.brandLogoUrl}
                  alt={displayName}
                  className="h-9 w-9 rounded-lg object-contain bg-white/10 p-1 shrink-0"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-primary shrink-0 flex items-center justify-center text-white font-display font-bold">
                  {displayName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 text-left">
                <div className="font-display text-sm text-white truncate leading-tight">
                  {displayName}
                </div>
                <div className="text-[11px] text-sidebar-foreground/60 truncate leading-tight">
                  Olá, {user?.name?.split(" ")[0] || "mentorado"}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white h-10 w-10"
                  >
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-hot text-[10px] font-semibold flex items-center justify-center text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    Notificações
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary hover:underline font-normal"
                      >
                        Marcar todas
                      </button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Nenhuma notificação ainda.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className={cn(
                          "flex flex-col items-start gap-0.5 py-2.5",
                          !n.read && "bg-primary/5",
                        )}
                      >
                        <div className="text-sm font-medium">{n.title || "Atualização"}</div>
                        {n.body && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString("pt-BR") : ""}
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white h-10 w-10"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav fixa */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border/50 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-all relative",
                    isActive
                      ? "text-white"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground/90",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 bg-accent rounded-full" />
                    )}
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                        isActive && "bg-accent/20 scale-105",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive && "text-accent")} />
                    </div>
                    <span className="font-medium">{n.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
