"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  ChevronRight,
  FileText,
  Shield,
  ChevronDown,
  Table2,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { type ContentBlock, type Template } from "@/lib/supabase";
import { renderTemplate, extractHeadings } from "@/lib/template-generator";

const COLOR_THEMES: Record<string, string[]> = {
  Auto: ["#7c3aed", "#0ea5e9", "#f97316", "#22c55e", "#ec4899", "#eab308"],
  Colorful: ["#3b82f6", "#eab308", "#22c55e", "#a855f7", "#f97316"],
  Colorless: ["#6b7280", "#9ca3af", "#4b5563", "#d1d5db", "#374151"],
  Blue: ["#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
  Yellow: ["#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"],
  Green: ["#15803d", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"],
  Purple: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
  Teal: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"],
  Orange: ["#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74"],
  Pink: ["#be185d", "#db2777", "#ec4899", "#f472b6", "#f9a8d4"],
  Red: ["#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5"],
};

function getChartColors(themeName: string): string[] {
  return COLOR_THEMES[themeName] || COLOR_THEMES.Auto;
}

function formatCurrency(amount: number): string {
  if (amount === 0) return "₹0";
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(2)} K`;
  return `₹${amount.toFixed(0)}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount === 0) return "₹0";
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

  type ProposalData = {
    id: string;
    title: string;
    subtitle: string | null;
    client_name: string | null;
    client_industry: string | null;
    region: string | null;
    validity_period: string | null;
    start_date: string | null;
    author_name: string | null;
    filled_data: Record<string, unknown>;
    content: ContentBlock[] | null;
    visual_placeholders: any[] | null;
    rendered_content: ContentBlock[] | null;
    template: Template | null;
    created_at: string;
    header_image_url: string | null;
    graph_color_palette: string | null;
  };

export default function PublicProposalViewer() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeSection, setActiveSection] = useState<string>("");
  const [viewInfo, setViewInfo] = useState<{ expires_at: string | null; view_count: number; max_views: number | null } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    validateAndFetch();
  }, [token]);

  async function validateAndFetch(pwd?: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/proposal-shares/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pwd }),
      });

      const data = await response.json();

      if (response.status === 401 && data.requires_password) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || "Unable to access this proposal");
        setLoading(false);
        return;
      }

      setProposal(data.proposal);
      setTemplate(data.proposal.template);
      setViewInfo(data.share);
      setRequiresPassword(false);
      setLoading(false);
    } catch (err) {
      setError("Failed to load proposal. Please try again.");
      setLoading(false);
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPassword(true);
    await validateAndFetch(password);
    setSubmittingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-400">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-xl">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <p className="text-sm text-slate-500">
              If you believe this is an error, please contact the person who shared this link with you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary/20 p-4 rounded-full">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white text-center mb-2">Password Protected</h1>
            <p className="text-slate-400 text-center mb-6">
              This proposal is password protected. Please enter the password to view.
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-slate-800 border-slate-700 text-white pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={submittingPassword || !password.trim()}>
                {submittingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "View Proposal"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal || !template) {
    return null;
  }

    const proposalContent = proposal.content || template.content;
    const proposalVisualPlaceholders = proposal.visual_placeholders || template.visual_placeholders;

    const renderedContent = template && proposal
      ? [
          ...renderTemplate(proposalContent, proposal.filled_data, proposalVisualPlaceholders),
          ...(template.fixed_sections && typeof template.fixed_sections === 'object' && !Array.isArray(template.fixed_sections) 
            ? Object.entries(template.fixed_sections)
              .filter(([, content]) => typeof content === 'string' && content.trim())
              .map(([title, content]) => ({
                id: `fixed-${title}`,
                type: 'paragraph' as const,
                content: `### ${title}\n\n${content}`
              })) 
            : [])
        ]
      : [];

  const headings = extractHeadings(renderedContent);
  const filledData = proposal.filled_data;
  const chartColors = getChartColors(proposal.graph_color_palette || filledData.chart_color_theme as string || "Auto");
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
      <div className="flex h-screen">
        <div className={`w-64 border-r shrink-0 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="p-4 border-b border-inherit">
            <div className="flex items-center gap-2 mb-3">
              <FileText className={`h-5 w-5 ${isDark ? "text-primary" : "text-primary"}`} />
              <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Proposal</span>
            </div>
            <h2 className={`font-bold text-lg leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {proposal.title}
            </h2>
            {proposal.client_name && (
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                for {proposal.client_name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Secure View
              </Badge>
            </div>
          </div>
          <div className="p-4">
            <h3 className={`text-xs font-semibold uppercase mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Contents
            </h3>
            <ScrollArea className="h-[calc(100vh-250px)]">
                <nav className="space-y-1">
                  {headings.map((heading, index) => {
                    const cleanTitle = heading.title.replace(/^\d+\.\s*/, '');
                    return (
                      <button
                        key={heading.id}
                        onClick={() => {
                          setActiveSection(heading.id);
                          document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate flex items-center gap-2 ${
                          activeSection === heading.id
                            ? "bg-primary text-primary-foreground"
                            : isDark
                            ? "text-slate-300 hover:bg-slate-800"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{index + 1}. {cleanTitle}</span>
                      </button>
                    );
                  })}
                </nav>
            </ScrollArea>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                {proposal.title}
              </h1>
              {viewInfo && (
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>View #{viewInfo.view_count}{viewInfo.max_views ? ` of ${viewInfo.max_views}` : ""}</span>
                  {viewInfo.expires_at && (
                    <span>Expires: {new Date(viewInfo.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="gap-2"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>

            <div className={`flex-1 overflow-auto p-6 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
                <div
                  ref={previewRef}
                  className={`max-w-4xl mx-auto shadow-lg rounded-3xl overflow-hidden ${
                    isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                  }`}
                >
                      {/* Header Image */}
                      {proposal.header_image_url && (
                        <div 
                          className="overflow-hidden"
                            style={{
                              width: `${filledData.header_image_width || 100}%`,
                              margin: (filledData.header_image_width as number || 100) < 100 ? '0 auto' : undefined,
                              borderRadius: (filledData.header_image_width as number || 100) === 100 
                                ? `24px 24px ${filledData.header_image_radius || 0}px ${filledData.header_image_radius || 0}px`
                                : `${filledData.header_image_radius || 12}px`,
                            }}
                        >
                          <img 
                            src={proposal.header_image_url} 
                            alt="Proposal Header" 
                            className="w-full object-cover"
                            style={{
                              height: `${filledData.header_image_height || 200}px`,
                            }}
                          />
                        </div>
                      )}

                    <div className="p-8">
                    {renderedContent.map((block, index) => (
                  <div 
                    key={block.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${Math.min(index * 50, 500)}ms`, animationFillMode: 'both', animationDuration: '500ms' }}
                    >
                      <ViewOnlyBlock
                        block={block}
                        filledData={filledData}
                        theme={theme}
                        chartColors={chartColors}
                      />
                    </div>
                  ))}
                    </div>
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}

function ViewOnlyBlock({
  block,
  filledData,
  theme,
  chartColors,
}: {
  block: ContentBlock;
  filledData: Record<string, unknown>;
  theme: "light" | "dark";
  chartColors: string[];
}) {
  const isDark = theme === "dark";
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);
  const [hoveredApp, setHoveredApp] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [hoveredPricing, setHoveredPricing] = useState<number | null>(null);
  const [activeFeatureView, setActiveFeatureView] = useState<"app" | "category">("app");
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  const [resourceView, setResourceView] = useState<"count" | "engagement">("count");
  const [activePricingTab, setActivePricingTab] = useState<string>("summary");

  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      let formatted = line;
      formatted = formatted.replace(/<strong[^>]*>([^<]+)<\/strong>/g, `<strong class="font-bold ${isDark ? 'text-white' : 'text-slate-900'}">$1</strong>`);
      formatted = formatted.replace(/<em[^>]*>([^<]+)<\/em>/g, `<em class="${isDark ? 'text-white' : 'text-slate-700'}">$1</em>`);
      formatted = formatted.replace(/<u[^>]*>([^<]+)<\/u>/g, `<u class="${isDark ? 'text-white' : 'text-slate-700'}">$1</u>`);
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, `<strong class="font-bold ${isDark ? 'text-white' : 'text-slate-900'}">$1</strong>`);
      formatted = formatted.replace(/\*([^*]+)\*/g, `<em class="${isDark ? 'text-white' : 'text-slate-700'}">$1</em>`);
      formatted = formatted.replace(/__([^_]+)__/g, `<u class="${isDark ? 'text-white' : 'text-slate-700'}">$1</u>`);
      formatted = formatted.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = filledData[key];
        if (value !== undefined && value !== null && value !== "") {
          return `<span class="${isDark ? 'text-white' : 'text-slate-900'}">${String(value)}</span>`;
        }
        return `<span class="${isDark ? 'text-slate-500' : 'text-slate-400'}">[${key}]</span>`;
      });

      if (line.startsWith("# ")) {
        return <h1 key={i} className={`text-3xl font-extrabold mt-6 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`} dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} />;
      }
      if (line.startsWith("## ")) {
        return <h2 key={i} className={`text-2xl font-bold mt-5 mb-3 border-b pb-1 ${isDark ? 'text-white border-slate-700' : 'text-slate-800 border-slate-200'}`} dangerouslySetInnerHTML={{ __html: formatted.slice(3) }} />;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className={`text-xl font-semibold mt-4 mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: formatted.slice(4) }} />;
      }
      return <p key={i} className={`mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  if (block.type === "heading") {
    const headingContent = typeof block.content === 'string' ? block.content : '';
    if (!headingContent) return null;
    return (
      <h2
        id={block.id}
        className={`text-2xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-4 border-b pb-2 ${
          isDark ? "text-white border-slate-700" : "text-slate-900 border-slate-200"
        }`}
        dangerouslySetInnerHTML={{ __html: headingContent }}
      />
    );
  }

  if (block.visualPlaceholder === "proposal_metadata") {
    const title = filledData.proposal_title as string || filledData.title as string || "";
    const subtitle = filledData.proposal_subtitle as string || filledData.subtitle as string || "";
    const author = filledData.proposal_author as string || filledData.author as string || "";
    const confidentiality = filledData.proposal_confidentiality as string || "";
    const version = filledData.version as string || "1.0";
    const clientName = filledData.client_name as string || "";
    const clientIndustry = filledData.client_industry as string || "";
    const region = filledData.region as string || "";
    const startDate = filledData.start_date as string || "";
    const validityPeriod = filledData.validity_period as string || "";

    const metadataFields = [
      { label: "Title", value: title },
      { label: "Subtitle", value: subtitle },
      { label: "Client", value: clientName },
      { label: "Industry", value: clientIndustry },
      { label: "Region", value: region },
      { label: "Author", value: author },
      { label: "Start Date", value: startDate ? new Date(startDate).toLocaleDateString() : "" },
      { label: "Validity", value: validityPeriod },
      { label: "Confidentiality", value: confidentiality },
      { label: "Version", value: version },
    ].filter(f => f.value);

    if (metadataFields.length === 0) return null;

    return (
      <div className="mb-8">
        <div className={`rounded-xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metadataFields.map((field, i) => (
              <div key={i} className="space-y-1">
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>{field.label}</p>
                <p className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

    if (block.visualPlaceholder === "delivery_plan" || block.visualPlaceholder === "delivery_phases_view") {
      const deliveryPhases = filledData.delivery_phases as any[] || [];
      const deliveryIntro = filledData.delivery_intro as string || "We divide development into three parts as below:";
      const startDate = filledData.start_date as string;

      if (deliveryPhases.length === 0) return null;

      const phaseDurations = deliveryPhases.map((p) => Math.max((p.weeks_end || 0) - (p.weeks_start || 0), 0));
      const totalDuration = Math.max(phaseDurations.reduce((sum, d) => sum + d, 0), 1);
      const totalWeeks = Math.max(deliveryPhases.reduce((max, p) => Math.max(max, p.weeks_end || 0), 0), 1);
      const phaseChartData = deliveryPhases.map((p, i) => ({
        name: `Phase${i + 1}`,
        duration: phaseDurations[i],
        label: `${phaseDurations[i]} (${Math.round((phaseDurations[i] / totalDuration) * 100)}%)`
      }));

      const getDateFromWeeks = (weeks: number) => {
        if (!startDate) return `Week ${weeks}`;
        const date = new Date(startDate);
        date.setDate(date.getDate() + weeks * 7);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      return (
          <div className="mb-8 space-y-8">
            <div id={block.id} className="scroll-mt-4">
              {deliveryIntro && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{deliveryIntro}</p>}

            {deliveryPhases.map((phase: any, i: number) => (
              <div key={i} className="mb-8">
                <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12}): {phase.title || ""}
                </h3>
                <ul className="space-y-3">
                  {(phase.platforms || []).filter((p: any) => p.name && p.features).map((platform: any, j: number) => (
                    <li key={j} className="flex">
                      <span className={`font-semibold min-w-[120px] ${isDark ? "text-slate-200" : "text-slate-800"}`}>{platform.name}:</span>
                      <span className={isDark ? "text-white" : "text-slate-600"}>{platform.features}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-6">
              <button className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${isDark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-900"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Duration in Weeks
              </button>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {(() => {
                    const totalDuration = Math.max(phaseChartData.reduce((sum, p) => sum + p.duration, 0), 1);
                    const segments = phaseChartData.reduce((acc: any[], p, i) => {
                      const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                      const percent = (p.duration / totalDuration) * 100;
                      acc.push({ ...p, startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
                      return acc;
                    }, []);
                    if (segments.length > 0 && segments[segments.length - 1].endPercent < 99.9) {
                      segments[segments.length - 1].endPercent = 100;
                    }
                    return segments.map((segment: any, i: number) => {
                      const circumference = 2 * Math.PI * 40;
                      const arcLength = ((segment.endPercent - segment.startPercent) / 100) * circumference;
                      const strokeDasharray = `${arcLength} ${circumference}`;
                      const strokeDashoffset = -(segment.startPercent / 100) * circumference;
                      return (
                        <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color}
                          strokeWidth={hoveredPhase === i ? "12" : "8"}
                          strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          style={{ opacity: hoveredPhase !== null && hoveredPhase !== i ? 0.4 : 1 }}
                          onMouseEnter={() => setHoveredPhase(i)} onMouseLeave={() => setHoveredPhase(null)}
                        />
                      );
                    });
                  })()}
                </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {hoveredPhase !== null ? (
                  <>
                    <span className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{phaseChartData[hoveredPhase]?.duration || 0}w</span>
                    <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>Phase {hoveredPhase + 1}</span>
                    <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{Math.round((phaseChartData[hoveredPhase]?.duration || 0) / totalDuration * 100)}%</span>
                  </>
                ) : (
                  <>
                    <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{totalDuration}</span>
                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Weeks</span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-8 space-y-2">
              {phaseChartData.map((p, i) => (
                <div key={i} className={`text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded ${hoveredPhase === i ? (isDark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-900") : (isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}
                  onMouseEnter={() => setHoveredPhase(i)} onMouseLeave={() => setHoveredPhase(null)}>
                  Phase {i + 1}: {p.duration} weeks ({Math.round(p.duration / totalDuration * 100)}%)
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-6">
            {phaseChartData.map((p, i) => (
              <div key={i} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${hoveredPhase === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""}`}
                onMouseEnter={() => setHoveredPhase(i)} onMouseLeave={() => setHoveredPhase(null)}>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Phase {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${isDark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-900"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Timeline
            </div>
          </div>

          <div className="relative">
            <div className={`flex text-xs mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {Array.from({ length: Math.ceil(totalWeeks / 4) + 1 }).map((_, ti) => (
                <div key={ti} className="flex-1 text-center">{getDateFromWeeks(ti * 4)}</div>
              ))}
            </div>
            <div className={`h-1 rounded mb-4 ${isDark ? "bg-slate-700" : "bg-slate-300"}`}></div>
            <div className="space-y-3">
              {deliveryPhases.map((phase: any, i: number) => {
                const startPercent = ((phase.weeks_start || 0) / totalWeeks) * 100;
                const widthPercent = (((phase.weeks_end || 0) - (phase.weeks_start || 0)) / totalWeeks) * 100;
                const duration = (phase.weeks_end || 0) - (phase.weeks_start || 0);
                return (
                  <div key={i} className="relative h-10" onMouseEnter={() => setHoveredPhase(i)} onMouseLeave={() => setHoveredPhase(null)}>
                    <div className={`absolute h-full rounded-lg flex items-center px-3 text-sm font-medium text-white cursor-pointer transition-all duration-200 ${hoveredPhase === i ? "scale-105 shadow-lg z-10" : hoveredPhase !== null ? "opacity-50" : ""}`}
                      style={{ left: `${startPercent}%`, width: `${widthPercent}%`, backgroundColor: chartColors[i % chartColors.length], minWidth: '120px' }}>
                      Phase {i + 1}: {duration}w ({Math.round(duration / totalDuration * 100)}%)
                    </div>
                  </div>
                );
              })}
            </div>
            {startDate && (
              <p className={`text-xs italic mt-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Assuming {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} as a start date</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (block.visualPlaceholder === "features_list_section") {
    const featureList = filledData.feature_list as any[] || [];
    const baselineTitle = filledData.baseline_title as string || `${filledData.client_name || 'Project'}-baseline-requirements`;
    if (featureList.length === 0) return null;

    const totalFeatures = featureList.length;
    const categoryByApp: Record<string, number> = {};
    featureList.forEach((f: any) => { const cat = f.category || "User"; categoryByApp[cat] = (categoryByApp[cat] || 0) + 1; });
    const appChartData = Object.entries(categoryByApp).map(([name, count], i) => ({ name, value: count, percent: ((count / totalFeatures) * 100).toFixed(1), color: chartColors[i % chartColors.length] }));
    const categoryBreakdown: Record<string, number> = {};
    featureList.forEach((f: any) => { const catName = f.subcategory || "General"; categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1; });
    const barChartData = Object.entries(categoryBreakdown).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    return (
      <div className="mb-8 space-y-6">
        <button onClick={() => setShowDetailedTable(!showDetailedTable)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}`}>
          <Table2 className="h-4 w-4" />
          <span className="font-medium">{baselineTitle}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showDetailedTable ? "rotate-180" : ""}`} />
        </button>

        {showDetailedTable && (
          <div className={`rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{baselineTitle}</h3>
              <Badge variant="secondary" className={isDark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-900"}>{totalFeatures} Features</Badge>
            </div>
            <div className={`overflow-auto max-h-[400px] rounded-lg border ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <Table>
                <TableHeader className={`sticky top-0 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  <TableRow className={isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}>
                    <TableHead className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>App</TableHead>
                    <TableHead className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Category</TableHead>
                    <TableHead className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Feature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureList.map((feature: any, i: number) => (
                    <TableRow key={i} className={isDark ? "hover:bg-slate-800/50 border-slate-700" : "hover:bg-slate-50 border-slate-200"}>
                      <TableCell className={isDark ? "text-slate-300" : "text-slate-600"}>
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                          {feature.category || "User"}
                        </div>
                      </TableCell>
                      <TableCell className={isDark ? "text-slate-400" : "text-slate-500"}>{feature.subcategory || "General"}</TableCell>
                      <TableCell className={isDark ? "text-white" : "text-slate-900"}>{feature.name || "Unnamed feature"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8">
            <button onClick={() => setActiveFeatureView("app")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeFeatureView === "app" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              <PieChartIcon className="w-4 h-4" /> Requirements # by APP
            </button>
            <button onClick={() => setActiveFeatureView("category")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeFeatureView === "category" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              <BarChart3 className="w-4 h-4" /> Requirement # By Category
            </button>
          </div>

          {activeFeatureView === "app" ? (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                <div className="relative w-64 h-64">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {(() => {
                      const segments = appChartData.reduce((acc: any[], item) => {
                        const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                        const percent = (item.value / totalFeatures) * 100;
                        acc.push({ ...item, startPercent: prevPercent, endPercent: prevPercent + percent });
                        return acc;
                      }, []);
                      if (segments.length > 0 && segments[segments.length - 1].endPercent < 99.9) {
                        segments[segments.length - 1].endPercent = 100;
                      }
                      return segments.map((segment: any, i: number) => {
                        const circumference = 2 * Math.PI * 40;
                        const arcLength = ((segment.endPercent - segment.startPercent) / 100) * circumference;
                        const strokeDasharray = `${arcLength} ${circumference}`;
                        const strokeDashoffset = -(segment.startPercent / 100) * circumference;
                        return (
                          <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color} strokeWidth={hoveredApp === i ? "12" : "8"}
                            strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-300 cursor-pointer"
                            style={{ opacity: hoveredApp !== null && hoveredApp !== i ? 0.4 : 1 }}
                            onMouseEnter={() => setHoveredApp(i)} onMouseLeave={() => setHoveredApp(null)} />
                        );
                      });
                    })()}
                  </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {hoveredApp !== null ? (
                    <>
                      <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{appChartData[hoveredApp]?.value || 0}</span>
                      <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>{appChartData[hoveredApp]?.name}</span>
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{appChartData[hoveredApp]?.percent}%</span>
                    </>
                  ) : (
                    <>
                      <span className={`text-5xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{totalFeatures}</span>
                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {appChartData.map((item, i) => (
                  <div key={i} className={`flex items-center justify-between gap-8 text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded ${hoveredApp === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""}`}
                    onMouseEnter={() => setHoveredApp(i)} onMouseLeave={() => setHoveredApp(null)}>
                    <span className={hoveredApp === i ? (isDark ? "text-white" : "text-slate-900") : (isDark ? "text-slate-400" : "text-slate-500")}>{item.name}</span>
                    <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{item.value} ({item.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
              {barChartData.map((item, i) => {
                const maxCount = Math.max(...barChartData.map(d => d.count));
                const width = (item.count / maxCount) * 100;
                return (
                  <div key={i} className={`flex items-center gap-4 cursor-pointer transition-all duration-200 ${hoveredCategory === i ? "scale-105" : hoveredCategory !== null ? "opacity-50" : ""}`}
                    onMouseEnter={() => setHoveredCategory(i)} onMouseLeave={() => setHoveredCategory(null)}>
                    <div className={`w-48 text-right text-sm truncate shrink-0 ${hoveredCategory === i ? (isDark ? "text-white font-medium" : "text-slate-900 font-medium") : (isDark ? "text-slate-400" : "text-slate-500")}`}>{item.name}</div>
                    <div className={`flex-1 h-6 rounded overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div className="h-full rounded transition-all duration-700" style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length], boxShadow: hoveredCategory === i ? '0 4px 12px rgba(0,0,0,0.3)' : 'none' }}></div>
                    </div>
                    <div className={`w-12 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{item.count} ({Math.round(item.count / totalFeatures * 100)}%)</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`flex flex-wrap justify-center gap-6 mt-8 pt-4 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
            {appChartData.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${hoveredApp === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""}`}
                onMouseEnter={() => setHoveredApp(i)} onMouseLeave={() => setHoveredApp(null)}>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (block.visualPlaceholder === "resource_engagement") {
    const resources = filledData.resource_plan as any[] || [];
    const resourceCount = resources.length;
    const defaultJustification = `${resourceCount} resource${resourceCount !== 1 ? 's' : ''}, with some engaged on an as-needed basis, can deliver the work effectively.`;
    const justification = filledData.resource_justification as string || defaultJustification;
    if (resources.length === 0) return null;

    const maxVal = resourceView === "count" ? Math.max(...resources.map(r => r.count || 0), 1) : 100;

    return (
      <div className="mb-8 space-y-4">
        <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{justification}</p>

        <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8">
            <button onClick={() => setResourceView("count")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${resourceView === "count" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Role & Count
            </button>
            <button onClick={() => setResourceView("engagement")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${resourceView === "engagement" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              % of Engagement
            </button>
          </div>

          <div className="space-y-6">
            {resources.map((res: any, i: number) => {
              const val = resourceView === "count" ? (res.count || 0) : (res.allocation || 100);
              const width = (val / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                  <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{res.role}</div>
                  <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }}></div>
                  </div>
                  <div className={`w-8 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{val}{resourceView === "engagement" ? "%" : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (block.visualPlaceholder === "pricing_section") {
    const phasePricing = filledData.phase_pricing_table as any[] || [];
    const taxPercent = Number(filledData.tax_percent) || 18;
    const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
    const totalWithTax = totalCost * (1 + taxPercent / 100);
    const pricingNotes = filledData.pricing_notes as string || "";
    if (phasePricing.length === 0) return null;

    return (
      <div className="mb-8 space-y-6">
        <p className={`leading-relaxed ${isDark ? "text-white" : "text-slate-600"}`}>
          Given the scope, team composition, and phased delivery, the complete {phasePricing.length}-phase engagement is priced at 
          <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span>, 
          totaling <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>, 
          with phase-wise distributions detailed below.
        </p>

        <div className={`rounded-2xl p-6 min-h-[400px] border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button onClick={() => setActivePricingTab("summary")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${activePricingTab === "summary" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Pricing Per Phase
            </button>
            {phasePricing.map((p, i) => (
              <button key={i} onClick={() => setActivePricingTab(`phase-${i}`)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${activePricingTab === `phase-${i}` ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {p.phase || `Phase ${i+1}`}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            {activePricingTab === "summary" ? (
              <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {(() => {
                          const effectiveTotal = totalCost > 0 ? totalCost : phasePricing.length;
                          const segments = phasePricing.reduce((acc: any[], p, i) => {
                            const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                            const percent = totalCost > 0 ? (Number(p.cost) / effectiveTotal) * 100 : (100 / phasePricing.length);
                            acc.push({ ...p, startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
                            return acc;
                          }, []);
                          const totalPercent = segments.length > 0 ? segments[segments.length - 1].endPercent : 0;
                          if (totalPercent < 99.9 && segments.length > 0) {
                            segments[segments.length - 1].endPercent = 100;
                          }
                          return segments.map((segment: any, i: number) => {
                            const circumference = 2 * Math.PI * 40;
                            const arcLength = ((segment.endPercent - segment.startPercent) / 100) * circumference;
                            const strokeDasharray = `${arcLength} ${circumference}`;
                            const strokeDashoffset = -(segment.startPercent / 100) * circumference;
                            return (
                              <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color} strokeWidth="10"
                                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                                className="hover:opacity-80 cursor-pointer transition-opacity" />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(totalCost)}</span>
                        <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Base Cost</span>
                      </div>
                    </div>
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  {phasePricing.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                      <span>{p.phase}: {formatCurrencyShort(Number(p.cost))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`flex items-center justify-between border-b pb-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{phasePricing[parseInt(activePricingTab.split("-")[1])]?.phase}</h4>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Detailed costing breakdown for this phase</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-violet-400">{formatCurrency(Number(phasePricing[parseInt(activePricingTab.split("-")[1])]?.cost))}</div>
                    <div className={`text-[10px] uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Phase Total</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={(phasePricing[parseInt(activePricingTab.split("-")[1])]?.breakdown || []).map((b: any) => ({ name: b.item, value: Number(b.cost) || 0 }))}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {(phasePricing[parseInt(activePricingTab.split("-")[1])]?.breakdown || []).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? "#1e293b" : "#fff", border: isDark ? "none" : "1px solid #e2e8f0", borderRadius: "8px", color: isDark ? "#fff" : "#1e293b" }}
                          itemStyle={{ color: isDark ? "#fff" : "#1e293b" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    {(phasePricing[parseInt(activePricingTab.split("-")[1])]?.breakdown || []).map((item: any, idx: number) => {
                      const percentage = (Number(item.cost) / (Number(phasePricing[parseInt(activePricingTab.split("-")[1])]?.cost) || 1)) * 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                              {item.item}
                            </span>
                            <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(Number(item.cost))} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-100 border-slate-200"}`}>
                  <Info className="h-4 w-4 text-violet-400 shrink-0" />
                  <p className={`text-[11px] italic ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    This breakdown covers the specialized resources and operational overheads allocated specifically for {phasePricing[parseInt(activePricingTab.split("-")[1])]?.phase}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {pricingNotes && <div className="p-4 bg-slate-50 rounded-xl border text-sm text-slate-600 italic">Note: {pricingNotes}</div>}
      </div>
    );
  }

  if (block.visualPlaceholder === "tasks_section") {
    const tasks = filledData.tasks_detailed as { type: string; description: string }[] || [];
    if (tasks.length === 0) return null;
    const orderedCategories: string[] = []; const groupedTasks: Record<string, string[]> = {};
    tasks.forEach(t => { if (!groupedTasks[t.type]) { groupedTasks[t.type] = []; orderedCategories.push(t.type); } groupedTasks[t.type].push(t.description); });

    return (
      <div className="mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, idx) => (
            <li key={idx}>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
              <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{groupedTasks[category].join(", ")}.</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.visualPlaceholder === "deliverables_section") {
    const deliverables = filledData.deliverables_detailed as { type: string; description: string }[] || [];
    const introText = filledData.deliverables_intro as string || "";
    if (deliverables.length === 0) return null;
    const orderedCategories: string[] = []; const groupedDeliverables: Record<string, string[]> = {};
    deliverables.forEach(d => { if (!groupedDeliverables[d.type]) { groupedDeliverables[d.type] = []; orderedCategories.push(d.type); } groupedDeliverables[d.type].push(d.description); });

    return (
      <div className="mb-8">
        {introText && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-500"}`}>{introText}</p>}
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, idx) => (
            <li key={idx}>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}</span>
              <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{groupedDeliverables[category].join(", ")}.</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.visualPlaceholder === "assumptions_section") {
    const assumptions = filledData.assumptions_detailed as { type: string; description: string }[] || [];
    if (assumptions.length === 0) return null;
    const orderedCategories: string[] = []; const groupedAssumptions: Record<string, string[]> = {};
    assumptions.forEach(a => { if (!groupedAssumptions[a.type]) { groupedAssumptions[a.type] = []; orderedCategories.push(a.type); } groupedAssumptions[a.type].push(a.description); });

    return (
      <div className="mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, catIdx) => (
            <li key={`assumption-${category}`}>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>A{catIdx + 1}: </span>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
              <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{groupedAssumptions[category].join(", ")}.</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.visualPlaceholder === "dependencies_section") {
    const dependencies = filledData.dependencies_detailed as { type: string; description: string }[] || [];
    if (dependencies.length === 0) return null;
    const orderedCategories: string[] = []; const groupedDependencies: Record<string, string[]> = {};
    dependencies.forEach(d => { if (!groupedDependencies[d.type]) { groupedDependencies[d.type] = []; orderedCategories.push(d.type); } groupedDependencies[d.type].push(d.description); });

    return (
      <div className="mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, catIdx) => (
            <li key={`dependency-${category}`}>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>D{catIdx + 1}: </span>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
              <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{groupedDependencies[category].join(", ")}.</span>
            </li>
          ))}
      </ul>
        </div>
      );
    }

    // Generic Table with Chart Section (dynamic sections like Risk Analysis)
    if (block.visualPlaceholder?.endsWith("_table_chart_section")) {
      const baseKey = block.visualPlaceholder.replace("_table_chart_section", "");
      const listKey = `${baseKey}_list`;
      const titleKey = `${baseKey}_title`;
      const columnsKey = `${baseKey}_columns`;
      
      const rawTableData = filledData[listKey];
      const items = Array.isArray(rawTableData) ? rawTableData as any[] : [];
      const tableTitle = filledData[titleKey] as string || baseKey.replace(/_/g, " ");
      const defaultColumns = [
        { key: "category", label: "Category" },
        { key: "subcategory", label: "Subcategory" },
        { key: "name", label: "Name" }
      ];
      const columns = (filledData[columnsKey] as any[] || defaultColumns);
      const [showTable, setShowTable] = useState(false);

      if (items.length === 0) return null;

      const categoryCount: Record<string, number> = {};
      items.forEach((item: any) => {
        const cat = item.category || "Other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const chartData = Object.entries(categoryCount).map(([name, count], i) => ({
        name, count, color: chartColors[i % chartColors.length], percent: ((count / items.length) * 100).toFixed(1)
      }));

      return (
        <div className="mb-8 space-y-6">
          <button 
            onClick={() => setShowTable(!showTable)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"
            }`}
          >
            <Table2 className="h-4 w-4" />
            <span className="font-medium">{tableTitle}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTable ? "rotate-180" : ""}`} />
          </button>

          {showTable && (
            <div className={`rounded-xl p-4 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <Table>
                <TableHeader>
                  <TableRow className={isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}>
                    {columns.map((col: any) => (
                      <TableHead key={col.key} className={isDark ? "text-slate-300" : "text-slate-700"}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, i: number) => (
                    <TableRow key={i} className={isDark ? "hover:bg-slate-800/50 border-slate-700" : "hover:bg-slate-50 border-slate-200"}>
                      {columns.map((col: any) => (
                        <TableCell key={col.key} className={isDark ? "text-slate-300" : "text-slate-600"}>{item[col.key] || "-"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {chartData.reduce((acc: any[], item) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const percent = (item.count / items.length) * 100;
                    acc.push({ ...item, startPercent: prevPercent, endPercent: prevPercent + percent });
                    return acc;
                  }, []).map((segment: any, i: number) => {
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                    const strokeDashoffset = -segment.startPercent / 100 * circumference;
                    return (
                      <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color} strokeWidth="8"
                        strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-500" />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{items.length}</span>
                  <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {chartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{item.name} ({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Generic Bar Graph Section (dynamic sections like Resource Plan)
    if (block.visualPlaceholder?.endsWith("_bar_graph_section")) {
      const baseKey = block.visualPlaceholder.replace("_bar_graph_section", "");
      const dataKey = `${baseKey}_data`;
      const justificationKey = `${baseKey}_justification`;
      
      const rawData = filledData[dataKey];
      const dataPoints = Array.isArray(rawData) ? rawData as { label: string; value: number; allocation?: number }[] : [];
      const justification = filledData[justificationKey] as string || "";
      const [viewMode, setViewMode] = useState<"count" | "engagement">("count");

      if (dataPoints.length === 0) return null;

      const maxVal = viewMode === "count" ? Math.max(...dataPoints.map(d => d.value || 0), 1) : 100;

      return (
        <div className="mb-8 space-y-4">
          {justification && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{justification}</p>}

          <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-8">
              <button onClick={() => setViewMode("count")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === "count" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                Count
              </button>
              <button onClick={() => setViewMode("engagement")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === "engagement" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                % Engagement
              </button>
            </div>

            <div className="space-y-6">
              {dataPoints.map((item: any, i: number) => {
                const val = viewMode === "count" ? (item.value || 0) : (item.allocation || 100);
                const width = (val / maxVal) * 100;
                return (
                  <div key={i} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{item.label}</div>
                    <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }}></div>
                    </div>
                    <div className={`w-8 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{val}{viewMode === "engagement" ? "%" : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Generic Calculations Section (dynamic sections like Pricing)
    if (block.visualPlaceholder?.endsWith("_calculations_section")) {
      const baseKey = block.visualPlaceholder.replace("_calculations_section", "");
      const tableKey = `${baseKey}_table`;
      const taxKey = `${baseKey}_tax`;
      const notesKey = `${baseKey}_notes`;
      
      const rawTableData = filledData[tableKey];
      const phaseData = Array.isArray(rawTableData) ? rawTableData as any[] : [];
      const taxPercent = Number(filledData[taxKey]) || 18;
      const notes = filledData[notesKey] as string || "";

      if (phaseData.length === 0) return null;

      const totalCost = phaseData.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
      const totalWithTax = totalCost * (1 + taxPercent / 100);

      return (
        <div className="mb-8 space-y-6">
          <p className={`leading-relaxed ${isDark ? "text-white" : "text-slate-600"}`}>
            Total cost: <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span> = 
            <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>
          </p>

          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {phaseData.reduce((acc: any[], p, i) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / phaseData.length);
                    acc.push({ ...p, startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
                    return acc;
                  }, []).map((segment: any, i: number) => {
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                    const strokeDashoffset = -segment.startPercent / 100 * circumference;
                    return (
                      <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color} strokeWidth="10"
                        strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-500" />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(totalCost)}</span>
                  <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Base Cost</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {phaseData.map((p: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                  <span>{p.phase}: {formatCurrencyShort(Number(p.cost))}</span>
                </div>
              ))}
            </div>
          </div>

          {notes && <div className={`p-4 rounded-xl border text-sm italic ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>Note: {notes}</div>}
        </div>
      );
    }

    // Generic Plan Section (dynamic sections like Delivery Plan)
    if (block.visualPlaceholder?.endsWith("_plan_section")) {
      const baseKey = block.visualPlaceholder.replace("_plan_section", "");
      const introKey = `${baseKey}_intro`;
      const phasesKey = `${baseKey}_phases`;
      
      const intro = filledData[introKey] as string || "";
      const rawPhases = filledData[phasesKey];
      const phases = Array.isArray(rawPhases) ? rawPhases as any[] : [];
      const startDate = filledData.start_date as string;

      if (phases.length === 0) return null;

      const phaseDurations = phases.map((p) => Math.max((p.weeks_end || 0) - (p.weeks_start || 0), 0));
      const totalDuration = Math.max(phaseDurations.reduce((sum, d) => sum + d, 0), 1);
      const totalWeeks = Math.max(phases.reduce((max, p) => Math.max(max, p.weeks_end || 0), 0), 1);

      const getDateFromWeeks = (weeks: number) => {
        if (!startDate) return `Week ${weeks}`;
        const date = new Date(startDate);
        date.setDate(date.getDate() + weeks * 7);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      return (
        <div className="mb-8 space-y-8">
          {intro && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{intro}</p>}

          {phases.map((phase: any, i: number) => (
            <div key={i} className="mb-8">
              <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
                Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12}): {phase.title || ""}
              </h3>
              <ul className="space-y-3">
                {(phase.platforms || []).filter((p: any) => p.name && p.features).map((platform: any, j: number) => (
                  <li key={j} className="flex">
                    <span className={`font-semibold min-w-[120px] ${isDark ? "text-slate-200" : "text-slate-800"}`}>{platform.name}:</span>
                    <span className={isDark ? "text-white" : "text-slate-600"}>{platform.features}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="relative">
              <div className={`flex text-xs mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {Array.from({ length: Math.ceil(totalWeeks / 4) + 1 }).map((_, ti) => (
                  <div key={ti} className="flex-1 text-center">{getDateFromWeeks(ti * 4)}</div>
                ))}
              </div>
              <div className={`h-1 rounded mb-4 ${isDark ? "bg-slate-700" : "bg-slate-300"}`}></div>
              <div className="space-y-3">
                {phases.map((phase: any, i: number) => {
                  const startPercent = ((phase.weeks_start || 0) / totalWeeks) * 100;
                  const widthPercent = (((phase.weeks_end || 0) - (phase.weeks_start || 0)) / totalWeeks) * 100;
                  const duration = (phase.weeks_end || 0) - (phase.weeks_start || 0);
                  return (
                    <div key={i} className="relative h-10">
                      <div className="absolute h-full rounded-lg flex items-center px-3 text-sm font-medium text-white"
                        style={{ left: `${startPercent}%`, width: `${widthPercent}%`, backgroundColor: chartColors[i % chartColors.length], minWidth: '120px' }}>
                        Phase {i + 1}: {duration}w ({Math.round(duration / totalDuration * 100)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
              {startDate && (
                <p className={`text-xs italic mt-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Assuming {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} as a start date</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Generic Subsections Section (dynamic sections like Change Management)
    if (block.visualPlaceholder?.endsWith("_subsections_section")) {
      const baseKey = block.visualPlaceholder.replace("_subsections_section", "");
      const subsection1 = filledData[`${baseKey}_subsection1_items`] as { key: string; value: string }[] || [];
      const subsection2 = filledData[`${baseKey}_subsection2_items`] as { key: string; value: string }[] || [];
      const subsection3 = filledData[`${baseKey}_subsection3_items`] as string[] || [];
      const subsection1Name = filledData[`${baseKey}_subsection1_name`] as string || "Subsection 1";
      const subsection2Name = filledData[`${baseKey}_subsection2_name`] as string || "Subsection 2";
      const subsection3Name = filledData[`${baseKey}_subsection3_name`] as string || "Subsection 3";

      if (subsection1.length === 0 && subsection2.length === 0 && subsection3.length === 0) return null;

      return (
        <div className="mb-8 space-y-6">
          {subsection1.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{subsection1Name}</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {subsection1.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {subsection2.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{subsection2Name}</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {subsection2.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {subsection3.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{subsection3Name}</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {subsection3.map((item, idx) => (
                  <li key={idx} className={isDark ? "text-white" : "text-slate-600"}>{item}.</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Generic Metadata Section
    if (block.visualPlaceholder?.endsWith("_metadata_section")) {
      const dataKey = block.visualPlaceholder.replace("_metadata_section", "");
      const rawMetaFields = filledData[dataKey];
      const fields = Array.isArray(rawMetaFields) ? rawMetaFields as { label: string; value: string }[] : [];

      if (fields.length === 0) return null;

      return (
        <div className="mb-8">
          <div className={`rounded-xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="grid grid-cols-2 gap-4">
              {fields.map((field, i) => (
                <div key={i} className="space-y-1">
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>{field.label}</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Generic Bullet Key-Value Section (like Deliverables)
    if (block.visualPlaceholder?.endsWith("_bullet_kv_section")) {
      const baseKey = block.visualPlaceholder.replace("_bullet_kv_section", "");
      const itemsKey = `${baseKey}_items`;
      const introKey = `${baseKey}_intro`;
      
      const rawItems = filledData[itemsKey];
      const items = Array.isArray(rawItems) ? rawItems as { type: string; description: string }[] : [];
      const intro = filledData[introKey] as string || "";

      if (items.length === 0) return null;

      const orderedCategories: string[] = [];
      const grouped: Record<string, string[]> = {};
      items.forEach(item => {
        if (!grouped[item.type]) {
          grouped[item.type] = [];
          orderedCategories.push(item.type);
        }
        grouped[item.type].push(item.description);
      });

      return (
        <div className="mb-8">
          {intro && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-500"}`}>{intro}</p>}
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, idx) => (
              <li key={idx}>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
                <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{grouped[category].join(", ")}.</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Generic Bullet Indexed Section (like Assumptions)
    if (block.visualPlaceholder?.endsWith("_bullet_indexed_section")) {
      const baseKey = block.visualPlaceholder.replace("_bullet_indexed_section", "");
      const itemsKey = `${baseKey}_items`;
      const prefixKey = `${baseKey}_prefix`;
      
      const rawItems = filledData[itemsKey];
      const items = Array.isArray(rawItems) ? rawItems as { type: string; description: string }[] : [];
      const prefix = filledData[prefixKey] as string || "A";

      if (items.length === 0) return null;

      const orderedCategories: string[] = [];
      const grouped: Record<string, string[]> = {};
      items.forEach(item => {
        if (!grouped[item.type]) {
          grouped[item.type] = [];
          orderedCategories.push(item.type);
        }
        grouped[item.type].push(item.description);
      });

      return (
        <div className="mb-8">
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, idx) => (
              <li key={idx}>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>{prefix}{idx + 1}: </span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
                <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{grouped[category].join(", ")}.</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Generic Indexed Section (like Assumptions/Dependencies)
    if (block.visualPlaceholder?.endsWith("_indexed_section")) {
      const baseKey = block.visualPlaceholder.replace("_indexed_section", "");
      const dataKey = `${baseKey}_items`;
      const prefixKey = `${baseKey}_prefix`;
      const rawIndexedData = filledData[dataKey];
      const items = Array.isArray(rawIndexedData) ? rawIndexedData as { type: string; description: string }[] : [];
      const prefix = (filledData[prefixKey] as string) || baseKey.charAt(0).toUpperCase();

      if (items.length === 0) return null;

      const orderedCategories: string[] = [];
      const groupedItems: Record<string, string[]> = {};
      items.forEach(item => {
        if (!groupedItems[item.type]) {
          groupedItems[item.type] = [];
          orderedCategories.push(item.type);
        }
        groupedItems[item.type].push(item.description);
      });

      return (
        <div className="mb-8">
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, catIdx) => {
              const categoryItems = groupedItems[category];
              return (
                <li key={`indexed-${category}`}>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>{prefix}{catIdx + 1}: </span>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
                  <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{categoryItems.join(", ")}.</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    // Generic Bar Section (like Resource Engagement)
    if (block.visualPlaceholder?.endsWith("_bar_section")) {
      const baseKey = block.visualPlaceholder.replace("_bar_section", "");
      const dataKey = `${baseKey}_data`;
      const justificationKey = `${baseKey}_justification`;
      const rawBarData = filledData[dataKey];
      const items = Array.isArray(rawBarData) ? rawBarData as { role: string; count: number; allocation: number }[] : [];
      const justification = filledData[justificationKey] as string || "";
      const [viewMode, setViewMode] = useState<"count" | "engagement">("count");

      if (items.length === 0) return null;

      const maxVal = viewMode === "count" 
        ? Math.max(...items.map(i => i.count || 0), 1) 
        : 100;

      return (
        <div className="mb-8 space-y-4">
          {justification && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{justification}</p>}
          
          <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-8">
              <button onClick={() => setViewMode("count")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  viewMode === "count" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}>
                Count
              </button>
              <button onClick={() => setViewMode("engagement")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  viewMode === "engagement" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}>
                % Engagement
              </button>
            </div>
            
            <div className="space-y-6">
              {items.map((item, i) => {
                const val = viewMode === "count" ? (item.count || 0) : (item.allocation || 100);
                const width = (val / maxVal) * 100;
                return (
                  <div key={i} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{item.role}</div>
                    <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div className="h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }}></div>
                    </div>
                    <div className={`w-8 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                      {val}{viewMode === "engagement" ? "%" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Generic KV Section (like Deliverables)
    if (block.visualPlaceholder?.endsWith("_kv_section")) {
      const baseKey = block.visualPlaceholder.replace("_kv_section", "");
      const itemsKey = `${baseKey}_items`;
      const introKey = `${baseKey}_intro`;
      const rawItems = filledData[itemsKey];
      const items = Array.isArray(rawItems) ? rawItems as { type: string; description: string }[] : [];
      const intro = filledData[introKey] as string || "";

      if (items.length === 0) return null;

      const orderedCategories: string[] = [];
      const grouped: Record<string, string[]> = {};
      items.forEach(item => {
        if (!grouped[item.type]) {
          grouped[item.type] = [];
          orderedCategories.push(item.type);
        }
        grouped[item.type].push(item.description);
      });

      return (
        <div className="mb-8">
          {intro && <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-500"}`}>{intro}</p>}
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, idx) => (
              <li key={idx}>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{category}:</span>
                <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{grouped[category].join(", ")}.</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (block.visualPlaceholder === "change_management_section") {
      const processItems = filledData.change_process_items as { key: string; value: string }[] || [];
      const classificationItems = filledData.change_classification_items as { key: string; value: string }[] || [];
      const constraintItems = filledData.change_constraint_items as string[] || [];
      if (processItems.length === 0 && classificationItems.length === 0 && constraintItems.length === 0) return null;

      return (
        <div className="mb-8 space-y-6">
          {processItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Process</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {processItems.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {classificationItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Classification</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {classificationItems.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {constraintItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Constraints</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {constraintItems.map((item, idx) => (
                  <li key={idx} className={isDark ? "text-white" : "text-slate-600"}>{item}.</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

      if (block.visualPlaceholder === "governance_list") {
        const cadenceItems = filledData.governance_cadence_items as { key: string; value: string }[] || [];
        const reportingItems = filledData.governance_reporting_items as { key: string; value: string }[] || [];
        const decisionItems = filledData.governance_decision_items as { key: string; value: string }[] || [];
        const cadenceName = filledData.governance_cadence_name as string || "Cadence";
        const reportingName = filledData.governance_reporting_name as string || "Reporting";
        const decisionName = filledData.governance_decision_name as string || "Decision Rights";
        
        if (cadenceItems.length === 0 && reportingItems.length === 0 && decisionItems.length === 0) return null;

        return (
          <div className="mb-8 space-y-6">
            {cadenceItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{cadenceName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {cadenceItems.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {reportingItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{reportingName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {reportingItems.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {decisionItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{decisionName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {decisionItems.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      if (block.visualPlaceholder === "governance_section" || block.visualPlaceholder === "governance_communication_section") {
        const cadenceItems = filledData.governance_cadence_items as { key: string; value: string }[] || [];
        const reportingItems = filledData.governance_reporting_items as { key: string; value: string }[] || [];
        const decisionItems = filledData.governance_decision_items as { key: string; value: string }[] || [];
        const cadenceName = filledData.governance_cadence_name as string || "Cadence";
        const reportingName = filledData.governance_reporting_name as string || "Reporting";
        const decisionName = filledData.governance_decision_name as string || "Decision Rights";
        
        if (cadenceItems.length === 0 && reportingItems.length === 0 && decisionItems.length === 0) return null;

        return (
          <div className="mb-8 space-y-6">
            {cadenceItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{cadenceName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {cadenceItems.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {reportingItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{reportingName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {reportingItems.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {decisionItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{decisionName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {decisionItems.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

    if (block.visualPlaceholder === "signoff_list" || block.visualPlaceholder === "signoff_requirements_section" || block.visualPlaceholder === "signoff_section") {
        const signoffRequirements = filledData.signoff_requirements as { stage: string; description: string }[] || [];
        const baselineLink = filledData.baseline_reference_link as string || "";
        
        if (signoffRequirements.length === 0) return null;

        return (
          <div className="mb-8 space-y-6">
            <ul className="space-y-3 list-disc list-outside ml-6">
              {signoffRequirements.map((item, idx) => (
                <li key={idx}>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.stage}:</span>
                  <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.description}.</span>
                </li>
              ))}
            </ul>
            {baselineLink && (
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Baseline Reference: <a href={baselineLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">{baselineLink}</a>
              </p>
            )}
          </div>
        );
      }

    if (block.type === "paragraph" && block.content.includes("{{governance_cadence_list}}")) {
      const cadenceItems = filledData.governance_cadence_items as { key: string; value: string }[] || [];
      const reportingItems = filledData.governance_reporting_items as { key: string; value: string }[] || [];
      const decisionItems = filledData.governance_decision_items as { key: string; value: string }[] || [];
      const cadenceName = filledData.governance_cadence_name as string || "Cadence";
      const reportingName = filledData.governance_reporting_name as string || "Reporting";
      const decisionName = filledData.governance_decision_name as string || "Decision Rights";

      const hasContent = cadenceItems.length > 0 || reportingItems.length > 0 || decisionItems.length > 0;
      if (!hasContent) return null;

      return (
        <div className="mb-8 space-y-6">
          {cadenceItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{cadenceName}</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {cadenceItems.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reportingItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{reportingName}</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {reportingItems.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {decisionItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{decisionName}</h3>
              <ul className="space-y-3 list-disc list-outside ml-6">
                {decisionItems.map((item, idx) => (
                  <li key={idx}>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                    <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

      if (block.type === "paragraph" && block.content.includes("{{signoffs_list}}")) {
        const signoffRequirements = filledData.signoff_requirements as { stage: string; description: string }[] || [];
        const baselineLink = filledData.baseline_reference_link as string || "";
        
        if (signoffRequirements.length === 0) return null;

        return (
          <div className="mb-8 space-y-6">
            <ul className="space-y-3 list-disc list-outside ml-6">
              {signoffRequirements.map((item, idx) => (
                <li key={idx}>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.stage}:</span>
                  <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.description}.</span>
                </li>
              ))}
            </ul>
            {baselineLink && (
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Baseline Reference: <a href={baselineLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">{baselineLink}</a>
              </p>
            )}
          </div>
        );
      }

      // Generic Subsections Section (like Change Management/Risk)
      if (block.visualPlaceholder?.endsWith("_subsections_section")) {
        const baseKey = block.visualPlaceholder.replace("_subsections_section", "");
        const subsection1 = filledData[`${baseKey}_subsection1_items`] as { key: string; value: string }[] || [];
        const subsection2 = filledData[`${baseKey}_subsection2_items`] as { key: string; value: string }[] || [];
        const subsection3 = filledData[`${baseKey}_subsection3_items`] as string[] || [];
        const subsection1Name = filledData[`${baseKey}_subsection1_name`] as string || "Subsection 1";
        const subsection2Name = filledData[`${baseKey}_subsection2_name`] as string || "Subsection 2";
        const subsection3Name = filledData[`${baseKey}_subsection3_name`] as string || "Subsection 3";

        if (subsection1.length === 0 && subsection2.length === 0 && subsection3.length === 0) return null;

        return (
          <div className="mb-8 space-y-6">
            {subsection1.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{subsection1Name}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {subsection1.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {subsection2.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{subsection2Name}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {subsection2.map((item, idx) => (
                    <li key={idx}>
                      <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                      <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {subsection3.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{subsection3Name}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {subsection3.map((item, idx) => (
                    <li key={idx} className={isDark ? "text-white" : "text-slate-600"}>{item}.</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      // Generic Metadata Section
      if (block.visualPlaceholder?.endsWith("_metadata_section")) {
        const dataKey = block.visualPlaceholder.replace("_metadata_section", "");
        const fields = filledData[dataKey] as { label: string; value: string }[] || [];

        if (fields.length === 0) return null;

        return (
          <div className="mb-8">
            <div className={`rounded-xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className="grid grid-cols-2 gap-4">
                {fields.map((field, i) => (
                  <div key={i} className="space-y-1">
                    <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>{field.label}</p>
                    <p className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // Generic Bar Section
      if (block.visualPlaceholder?.endsWith("_bar_section")) {
        const baseKey = block.visualPlaceholder.replace("_bar_section", "");
        const items = filledData[`${baseKey}_data`] as { role: string; count: number; allocation: number }[] || [];
        const justification = filledData[`${baseKey}_justification`] as string || "";

        if (items.length === 0) return null;

        const maxVal = Math.max(...items.map(r => r.count || 0), 1);

        return (
          <div className="mb-8 space-y-4">
            {justification && (
              <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{justification}</p>
            )}
            <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className="space-y-6">
                {items.map((item, i) => {
                  const width = (item.count / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{item.role}</div>
                      <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                        <div className="h-full rounded-full transition-all duration-1000 bg-emerald-500" style={{ width: `${width}%` }}></div>
                      </div>
                      <div className={`w-16 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{item.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // Generic Plan Section
      if (block.visualPlaceholder?.endsWith("_plan_section")) {
        const baseKey = block.visualPlaceholder.replace("_plan_section", "");
        const phases = filledData[`${baseKey}_phases`] as any[] || [];
        const introText = filledData[`${baseKey}_intro`] as string || "";

        if (phases.length === 0) return null;

        return (
          <div className="mb-8 space-y-6">
            {introText && (
              <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{introText}</p>
            )}
            {phases.map((phase: any, i: number) => (
              <div key={i} className="mb-6">
                <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12}): {phase.title || ""}
                </h3>
              </div>
            ))}
          </div>
        );
      }

      if (block.type === "paragraph") {
      const content = typeof block.content === 'string' ? block.content : '';
      if (!content) return null;
      const hasUnfilledPlaceholder = /\{\{[^}]+\}\}/.test(content);
      if (hasUnfilledPlaceholder && block.optional) return null;
      return (
        <div className={`mb-4 whitespace-pre-wrap leading-relaxed ${isDark ? "text-white" : "text-slate-700"}`}>
          {renderFormattedContent(content)}
        </div>
      );
    }

  if (block.type === "list" && block.items) {
    if (!block.items || block.items.length === 0) return null;
    return (
      <ul className={`mb-6 list-disc pl-6 space-y-2 ${isDark ? "text-white" : "text-slate-700"}`}>
        {block.items.map((item, i) => {
          const text = typeof item === "string" ? item : (item as Record<string, string>).objective || "";
          return text ? <li key={i}>{text}</li> : null;
        })}
      </ul>
    );
  }

  if (block.type === "image" && block.content) {
    return (
      <div className="mb-6">
        <img 
          src={block.content} 
          alt="Proposal content" 
          className="max-w-full rounded-lg shadow-md"
        />
      </div>
    );
  }

  return null;
}
