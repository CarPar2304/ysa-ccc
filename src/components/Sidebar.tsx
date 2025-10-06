import { NavLink } from "react-router-dom";
import { Home, Newspaper, BookOpen, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  { name: "YSA Conecta", href: "/", icon: Home },
  { name: "YSA Now", href: "/news", icon: Newspaper },
  { name: "YSA Lab", href: "/lab", icon: BookOpen },
];

export const Sidebar = () => {
  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card shadow-soft">
      <div className="flex h-16 items-center justify-center border-b border-border px-6">
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          YSA Región Pacífico
        </h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-accent text-accent-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all flex-1",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )
            }
          >
            <User className="h-5 w-5" />
            Perfil
          </NavLink>
          <ThemeToggle />
        </div>
        
        <button
          onClick={() => {
            // Logout logic will be added later
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};
