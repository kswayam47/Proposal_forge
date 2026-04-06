"use client";

import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import SidebarLayout from "@/components/jira/SidebarLayout";

export default function ReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    // Skip auth redirect specifically for the PDF generator's target page
    if (!session && pathname !== "/reports/report") {
        redirect("/login");
    }

    return <SidebarLayout>{children}</SidebarLayout>;
}
