import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "ProposalForge",
  description: "AI-powered business proposal automation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="proposalforge-theme">
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </AuthProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
