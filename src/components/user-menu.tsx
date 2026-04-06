"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface UserMenuProps {
    collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                {!collapsed && <Skeleton className="h-4 w-24" />}
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    const user = session.user;
    const initials = user.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || user.email?.slice(0, 2).toUpperCase() || "U";

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    if (collapsed) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center w-full p-2 hover:bg-sidebar-accent/50 rounded-lg transition-colors">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left overflow-hidden">
                        <p className="truncate text-sm font-medium text-sidebar-foreground">
                            {user.name || "User"}
                        </p>
                        <p className="truncate text-xs text-sidebar-foreground/60">
                            {user.email}
                        </p>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
