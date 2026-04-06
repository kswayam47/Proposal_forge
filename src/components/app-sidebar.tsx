"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Plus,
  Settings,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Users,
  LogOut,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession, signOut } from "next-auth/react";

const navigation = [
  { name: "Templates", href: "/templates", icon: FolderOpen },
  { name: "Proposals", href: "/proposals", icon: FileText },
];

const SUPERADMIN_EMAILS = ["ananta@gmail.com", "swayam@gmail.com", "swayamkewlani118@gmail.com"];

interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AppSidebar({ collapsed = false, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.email && SUPERADMIN_EMAILS.includes(session.user.email);

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen w-16 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggle}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary hover:bg-sidebar-primary/90 transition-colors"
                >
                  <span className="text-xs font-bold text-sidebar-primary-foreground">PF</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          </div>


          <ScrollArea className="flex-1 px-2">
            <nav className="space-y-1 py-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-lg p-2.5 transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t border-sidebar-border p-2 space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center justify-center w-full rounded-lg p-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center justify-center w-full rounded-lg p-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sign Out</p>
              </TooltipContent>
            </Tooltip>
            {session?.user && (
              <div className="px-2 py-2 mt-1 border-t border-sidebar-border/50 pt-2">
                <div className="text-xs font-medium text-sidebar-foreground truncate">{session.user.name || session.user.email?.split("@")[0]}</div>
                <div className="text-[10px] text-sidebar-foreground/60 truncate">{session.user.role || "user"}</div>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-xs font-bold text-sidebar-primary-foreground">PF</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">ProposalForge</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>


      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4 space-y-1">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Dark Mode
            </>
          )}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        {session?.user && (
          <div className="px-3 py-2 mt-2 border-t border-sidebar-border/50 pt-3">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{session.user.name || session.user.email?.split("@")[0]}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{session.user.email}</div>
            <Badge variant="outline" className="mt-1 text-[10px]">{session.user.role || "user"}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
