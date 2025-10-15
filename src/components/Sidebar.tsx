import { NavLink, useNavigate } from "react-router-dom";
import { Home, Newspaper, BookOpen, LogOut, Settings, FileCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "./ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import logo from "@/assets/logo-ysa.png";

const navigation = [
  { name: "YSA Conecta", href: "/", icon: Home },
  { name: "YSA Now", href: "/news", icon: Newspaper },
  { name: "YSA Lab", href: "/lab", icon: BookOpen },
];

export const Sidebar = () => {
  const { isAdmin, isMentor } = useUserRole();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const [labOpen, setLabOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("usuarios")
          .select("nombres, apellidos, avatar_url")
          .eq("id", user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (!userProfile) return "U";
    return `${userProfile.nombres?.[0] || ""}${userProfile.apellidos?.[0] || ""}`.toUpperCase();
  };

  const getUserFullName = () => {
    if (!userProfile) return "Usuario";
    return `${userProfile.nombres || ""} ${userProfile.apellidos || ""}`.trim();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarPrimitive collapsible="icon" className="bg-sidebar-background border-sidebar-border">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center px-4 border-b border-sidebar-border">
          {open && (
            <img 
              src={logo} 
              alt="YSA" 
              className="h-12 w-auto object-contain"
            />
          )}
        </div>

        <SidebarContent className="px-4 py-6">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {navigation.map((item) => {
                  if (item.name === "YSA Lab") {
                    return (
                      <Collapsible
                        key={item.name}
                        open={labOpen}
                        onOpenChange={setLabOpen}
                      >
                        <SidebarMenuItem>
                          {open ? (
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={cn(
                                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  location.pathname === item.href && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)] border-l-2 border-primary"
                                )}
                              >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="flex-1 text-left">{item.name}</span>
                                <ChevronDown className={cn(
                                  "h-4 w-4 transition-transform duration-300",
                                  labOpen && "rotate-180"
                                )} />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton
                                  asChild
                                  className={cn(
                                    "w-full flex items-center justify-center rounded-xl p-3 transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-primary",
                                    location.pathname === item.href && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)]"
                                  )}
                                >
                                  <NavLink to={item.href}>
                                    <item.icon className="h-5 w-5" />
                                  </NavLink>
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="right" 
                                className="bg-popover text-popover-foreground border-border shadow-md animate-in fade-in-0 zoom-in-95"
                                sideOffset={8}
                              >
                                {item.name}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {open && (
                            <CollapsibleContent>
                              <SidebarMenuSub className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border/50">
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    asChild
                                    className="rounded-lg px-4 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 ease-in-out"
                                  >
                                    <NavLink to="/lab">
                                      Módulos
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          )}
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.name}>
                      {open ? (
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.href}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)] border-l-2 border-primary"
                              )
                            }
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span>{item.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <NavLink to={item.href}>
                              {({ isActive }) => (
                                <SidebarMenuButton
                                  className={cn(
                                    "w-full flex items-center justify-center rounded-xl p-3 transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-primary",
                                    isActive && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)]"
                                  )}
                                >
                                  <item.icon className="h-5 w-5" />
                                </SidebarMenuButton>
                              )}
                            </NavLink>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="bg-popover text-popover-foreground border-border shadow-md animate-in fade-in-0 zoom-in-95"
                            sideOffset={8}
                          >
                            {item.name}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </SidebarMenuItem>
                  );
                })}

                {isAdmin && (
                  <SidebarMenuItem>
                    {open ? (
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin"
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              isActive && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)] border-l-2 border-primary"
                            )
                          }
                        >
                          <Settings className="h-5 w-5 shrink-0" />
                          <span>Admin Panel</span>
                        </NavLink>
                      </SidebarMenuButton>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink to="/admin">
                            {({ isActive }) => (
                              <SidebarMenuButton
                                className={cn(
                                  "w-full flex items-center justify-center rounded-xl p-3 transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-primary",
                                  isActive && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)]"
                                )}
                              >
                                <Settings className="h-5 w-5" />
                              </SidebarMenuButton>
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="bg-popover text-popover-foreground border-border shadow-md animate-in fade-in-0 zoom-in-95"
                          sideOffset={8}
                        >
                          Admin Panel
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </SidebarMenuItem>
                )}

                {isMentor && (
                  <SidebarMenuItem>
                    {open ? (
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/mentor"
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              isActive && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)] border-l-2 border-primary"
                            )
                          }
                        >
                          <FileCheck className="h-5 w-5 shrink-0" />
                          <span>Panel Mentor</span>
                        </NavLink>
                      </SidebarMenuButton>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink to="/mentor">
                            {({ isActive }) => (
                              <SidebarMenuButton
                                className={cn(
                                  "w-full flex items-center justify-center rounded-xl p-3 transition-colors duration-200 ease-in-out text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-primary",
                                  isActive && "bg-sidebar-active text-sidebar-accent-foreground shadow-[var(--sidebar-active-shadow)]"
                                )}
                              >
                                <FileCheck className="h-5 w-5" />
                              </SidebarMenuButton>
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="bg-popover text-popover-foreground border-border shadow-md animate-in fade-in-0 zoom-in-95"
                          sideOffset={8}
                        >
                          Panel Mentor
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User Profile Card at Bottom */}
        <div className="border-t border-sidebar-border p-4 mt-auto">
          {open ? (
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3 hover:bg-sidebar-accent transition-colors duration-200 ease-in-out shadow-sm border border-sidebar-border hover:border-sidebar-border/80 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Ver perfil"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {getUserFullName()}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    Beneficiario
                  </p>
                </div>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-destructive"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-sidebar-accent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Ver perfil"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile?.avatar_url} />
                      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="bg-popover text-popover-foreground border-border shadow-md animate-in fade-in-0 zoom-in-95"
                  sideOffset={8}
                >
                  {getUserFullName()}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center rounded-xl p-3 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-destructive"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="bg-popover text-popover-foreground border-border shadow-md animate-in fade-in-0 zoom-in-95"
                  sideOffset={8}
                >
                  Cerrar sesión
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </SidebarPrimitive>
    </TooltipProvider>
  );
};
