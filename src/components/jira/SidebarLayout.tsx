"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
    BarChart3, Users, GitBranch, ChevronLeft, ChevronRight, LayoutDashboard, CalendarDays
} from "lucide-react";

const NAV_ITEMS = [
    {
        key: "employee",
        label: "Employee View",
        icon: BarChart3,
        href: "/reports",
        description: "Individual performance",
    },
    {
        key: "admin",
        label: "Admin View",
        icon: Users,
        href: "/reports/admin",
        description: "Team comparison",
    },
    {
        key: "pipelines",
        label: "Pipelines",
        icon: GitBranch,
        href: "/reports/pipelines",
        description: "Automated reports",
    },
    {
        key: "leaves",
        label: "Leave Tracker",
        icon: CalendarDays,
        href: "/reports/leaves",
        description: "Mark & manage leaves",
    },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    // Don't show sidebar on /report page
    if (pathname === "/reports/report") return <>{children}</>;

    const activeKey = (() => {
        if (pathname === "/reports") return "employee";
        if (pathname === "/reports/admin") return "admin";
        if (pathname?.startsWith("/reports/pipelines")) return "pipelines";
        if (pathname?.startsWith("/reports/leaves")) return "leaves";
        return null;
    })();

    const handleNav = (item: typeof NAV_ITEMS[0]) => {
        router.push(item.href);
    };

    return (
        <div className="flex min-h-screen bg-[#f8f9fb]">
            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col text-white transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[220px]"
                    }`}
                style={{ background: "linear-gradient(180deg, #0a2e3d 0%, #0d3a4a 100%)" }}
            >
                {/* Logo */}
                <div className={`flex items-center gap-3 px-4 h-20 border-b border-white/5 shrink-0 ${collapsed ? "justify-center" : ""}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10 shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/woodfrog-logo.svg" alt="Woodfrog" width={24} height={24} />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-base font-black tracking-tight leading-none">ProposalForge</p>
                            <p className="text-[10px] font-bold text-[#39D6E3] uppercase tracking-[0.2em] mt-1.5 opacity-80">Pro</p>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-2 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeKey === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => handleNav(item)}
                                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all group ${isActive
                                    ? "bg-white/10 text-white"
                                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                    }`}
                            >
                                <item.icon
                                    size={18}
                                    className={`shrink-0 ${isActive ? "text-[#39D6E3]" : "text-white/40 group-hover:text-white/60"}`}
                                />
                                {!collapsed && (
                                    <div className="min-w-0">
                                        <p className={`text-xs font-semibold truncate ${isActive ? "text-white" : ""}`}>
                                            {item.label}
                                        </p>
                                        <p className="text-[9px] text-white/30 truncate">{item.description}</p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Collapse toggle */}
                <div className="px-2 pb-4">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        {!collapsed && <span className="text-[10px] font-medium">Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* Main content area */}
            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? "ml-[68px]" : "ml-[220px]"
                    }`}
            >
                {/* Content */}
                <main className="flex-1">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200/60 bg-white/60 backdrop-blur-sm">
                    <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/woodfrog-logo.svg" alt="Woodfrog" width={16} height={16} />
                            <span className="text-[10px] text-gray-400">
                                ProposalForge Pro · Internal Productivity Suite
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-300">
                            {new Date().getFullYear()} · IST
                        </span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
