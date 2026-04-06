"use client";

import { useState } from "react";
import {
  BarChart3,
  FileText,
  Info,
  PieChart as PieChartIcon,
  TrendingUp,
  ChevronDown,
  Table2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ContentBlock } from "@/lib/supabase";

const CHART_COLORS = ["#7c3aed", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];

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

export function ReadOnlyBlockRenderer({
  block,
  filledData,
  theme = "dark",
  chartColors = CHART_COLORS,
}: {
  block: ContentBlock;
  filledData: Record<string, unknown>;
  theme?: "light" | "dark";
  chartColors?: string[];
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
    return (
      <h2
        id={block.id}
        className={`text-2xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-4 border-b pb-2 ${
          isDark ? "text-white border-slate-700" : "text-slate-900 border-slate-200"
        }`}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  }

  if (block.visualPlaceholder === "delivery_plan" || block.visualPlaceholder === "delivery_phases_view") {
    const deliveryPhases = filledData.delivery_phases as any[] || [];
    const deliveryIntro = filledData.delivery_intro as string || "We divide development into three parts as below:";
    const startDate = filledData.start_date as string;

    if (deliveryPhases.length === 0) {
      return <div className={`p-6 border-2 border-dashed rounded-xl text-center mb-8 ${isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"}`}>
        <p className="text-sm">No delivery phases defined.</p>
      </div>;
    }

    const totalWeeks = Math.max(deliveryPhases.reduce((max, p) => Math.max(max, p.weeks_end || 0), 0), 1);
    const phaseChartData = deliveryPhases.map((p, i) => ({
      name: `Phase${i + 1}`,
      duration: (p.weeks_end || 0) - (p.weeks_start || 0),
      label: `${(p.weeks_end || 0) - (p.weeks_start || 0)} (${Math.round(((p.weeks_end || 0) - (p.weeks_start || 0)) / totalWeeks * 100)}%)`
    }));

    return (
      <div className="mb-8 space-y-8">
        <div id={block.id} className="scroll-mt-4">
          <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${isDark ? "text-white border-slate-700" : "text-slate-900 border-slate-200"}`}>
            {filledData.delivery_plan_title as string || "Delivery Plan (Phases & Timelines)"}
          </h2>
          <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{deliveryIntro}</p>

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
          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {phaseChartData.reduce((acc: any[], p, i) => {
                  const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                  const percent = (p.duration / totalWeeks) * 100;
                  acc.push({ ...p, startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
                  return acc;
                }, []).map((segment: any, i: number) => {
                  const circumference = 2 * Math.PI * 40;
                  const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                  const strokeDashoffset = -segment.startPercent / 100 * circumference;
                  return (
                    <circle
                      key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color}
                      strokeWidth={hoveredPhase === i ? "12" : "8"}
                      strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{ opacity: hoveredPhase !== null && hoveredPhase !== i ? 0.4 : 1 }}
                      onMouseEnter={() => setHoveredPhase(i)} onMouseLeave={() => setHoveredPhase(null)}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {hoveredPhase !== null ? (
                  <>
                    <span className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{phaseChartData[hoveredPhase]?.duration || 0}w</span>
                    <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>Phase {hoveredPhase + 1}</span>
                  </>
                ) : (
                  <>
                    <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{totalWeeks}</span>
                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Weeks</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-6">
            {phaseChartData.map((p, i) => (
              <div key={i} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${hoveredPhase === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""}`}
                onMouseEnter={() => setHoveredPhase(i)} onMouseLeave={() => setHoveredPhase(null)}>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Phase {i + 1}: {p.duration}w</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (block.visualPlaceholder === "features_list_section") {
    const featureList = filledData.feature_list as any[] || [];
    const baselineTitle = filledData.baseline_title as string || `${filledData.client_name || 'Project'}-baseline-requirements`;

    if (featureList.length === 0) {
      return <div className={`p-6 border-2 border-dashed rounded-xl text-center mb-8 ${isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"}`}>
        <p className="text-sm">No features defined.</p>
      </div>;
    }

    const totalFeatures = featureList.length;
    const categoryByApp: Record<string, number> = {};
    featureList.forEach((f: any) => {
      const cat = f.category || "User";
      categoryByApp[cat] = (categoryByApp[cat] || 0) + 1;
    });
    const appChartData = Object.entries(categoryByApp).map(([name, count], i) => ({
      name, value: count, percent: ((count / totalFeatures) * 100).toFixed(1), color: chartColors[i % chartColors.length]
    }));

    const categoryBreakdown: Record<string, number> = {};
    featureList.forEach((f: any) => {
      const catName = f.subcategory || "General";
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
    });
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
          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{baselineTitle}</h3>
              <Badge variant="secondary">{totalFeatures} Features</Badge>
            </div>
            <div className={`overflow-auto max-h-[400px] rounded-lg border ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <Table>
                <TableHeader className={`sticky top-0 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  <TableRow>
                    <TableHead className={isDark ? "text-slate-300" : "text-slate-700"}>App</TableHead>
                    <TableHead className={isDark ? "text-slate-300" : "text-slate-700"}>Category</TableHead>
                    <TableHead className={isDark ? "text-slate-300" : "text-slate-700"}>Feature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureList.map((feature: any, i: number) => (
                    <TableRow key={i} className={isDark ? "hover:bg-slate-800/50 border-slate-700" : "hover:bg-slate-50 border-slate-200"}>
                      <TableCell className={isDark ? "text-slate-300" : "text-slate-600"}>{feature.category || "User"}</TableCell>
                      <TableCell className={isDark ? "text-slate-400" : "text-slate-500"}>{feature.subcategory || "General"}</TableCell>
                      <TableCell className={isDark ? "text-white" : "text-slate-900"}>{feature.name || "Unnamed"}</TableCell>
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
                  {appChartData.reduce((acc: any[], item) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const percent = (item.value / totalFeatures) * 100;
                    acc.push({ ...item, startPercent: prevPercent, endPercent: prevPercent + percent });
                    return acc;
                  }, []).map((segment: any, i: number) => {
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                    const strokeDashoffset = -segment.startPercent / 100 * circumference;
                    return (
                      <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color}
                        strokeWidth={hoveredApp === i ? "12" : "8"} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        style={{ opacity: hoveredApp !== null && hoveredApp !== i ? 0.4 : 1 }}
                        onMouseEnter={() => setHoveredApp(i)} onMouseLeave={() => setHoveredApp(null)}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {hoveredApp !== null ? (
                    <>
                      <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{appChartData[hoveredApp]?.value || 0}</span>
                      <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>{appChartData[hoveredApp]?.name}</span>
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
                    <div className={`w-48 text-right text-sm truncate shrink-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.name}</div>
                    <div className={`flex-1 h-6 rounded overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div className="h-full rounded transition-all duration-700" style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }}></div>
                    </div>
                    <div className={`w-12 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{item.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.visualPlaceholder === "resource_engagement") {
    const resources = filledData.resource_plan as any[] || [];
    const resourceCount = resources.length;
    const defaultJustification = `${resourceCount} resource${resourceCount !== 1 ? 's' : ''}, with some engaged on an as-needed basis, can deliver the work effectively.`;
    const justification = filledData.resource_justification as string || defaultJustification;

    if (resources.length === 0) {
      return <div className={`p-6 border-2 border-dashed rounded-xl text-center mb-8 ${isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"}`}>
        <p className="text-sm">No resources defined.</p>
      </div>;
    }

    const maxVal = resourceView === "count" ? Math.max(...resources.map(r => r.count || 0), 1) : 100;

    return (
      <div className="mb-8 space-y-4">
        <p className={`italic mb-6 ${isDark ? "text-white" : "text-slate-600"}`}>{justification}</p>
        <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8">
            <button onClick={() => setResourceView("count")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${resourceView === "count" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              Role & Count
            </button>
            <button onClick={() => setResourceView("engagement")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${resourceView === "engagement" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              % of Engagement
            </button>
          </div>
          <div className="space-y-6">
            {resources.map((res: any, i: number) => {
              const val = resourceView === "count" ? (res.count || 0) : (res.allocation || 100);
              const width = (val / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{res.role}</div>
                  <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }} />
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

    if (phasePricing.length === 0) {
      return <div className={`p-6 border-2 border-dashed rounded-xl text-center mb-8 ${isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"}`}>
        <p className="text-sm">No pricing information defined.</p>
      </div>;
    }

    const pricingChartData = phasePricing.map((p, i) => ({ name: p.phase || `Phase ${i + 1}`, cost: Number(p.cost) || 0 }));

    return (
      <div className="mb-8 space-y-6">
        <p className={`leading-relaxed ${isDark ? "text-white" : "text-slate-600"}`}>
          Given the scope, team composition, and phased delivery, the complete {phasePricing.length}-phase engagement is priced at 
          <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span>, 
          totaling <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>.
        </p>

        <div className={`rounded-2xl p-6 min-h-[400px] border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button onClick={() => setActivePricingTab("summary")}
              className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors ${activePricingTab === "summary" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
              Pricing Per Phase
            </button>
            {phasePricing.map((p, i) => (
              <button key={i} onClick={() => setActivePricingTab(`phase-${i}`)}
                className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors ${activePricingTab === `phase-${i}` ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                {p.phase || `Phase ${i + 1}`}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            {activePricingTab === "summary" ? (
              <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {pricingChartData.reduce((acc: any[], p, i) => {
                        const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                        const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / pricingChartData.length);
                        acc.push({ ...p, startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
                        return acc;
                      }, []).map((segment: any, i: number) => {
                        const circumference = 2 * Math.PI * 40;
                        const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                        const strokeDashoffset = -segment.startPercent / 100 * circumference;
                        return (
                          <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={segment.color} strokeWidth="10"
                            strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                            className="hover:opacity-80 cursor-pointer transition-opacity"
                            onMouseEnter={() => setHoveredPricing(i)} onMouseLeave={() => setHoveredPricing(null)} />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(totalCost)}</span>
                      <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Base Cost</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {pricingChartData.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                      <span>{p.name}: {formatCurrencyShort(p.cost)}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-6 pt-4 border-t w-full text-left ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <div className="flex justify-between mb-2">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>Subtotal</span>
                    <span className={isDark ? "text-white" : "text-slate-900"}>{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>Tax ({taxPercent}%)</span>
                    <span className={isDark ? "text-white" : "text-slate-900"}>{formatCurrency(totalCost * taxPercent / 100)}</span>
                  </div>
                  <div className={`flex justify-between text-lg font-bold pt-2 border-t ${isDark ? "border-slate-700 text-white" : "border-slate-200 text-slate-900"}`}>
                    <span>Total</span>
                    <span>{formatCurrency(totalWithTax)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {phasePricing.map((p, i) => {
                  if (activePricingTab !== `phase-${i}`) return null;
                  return (
                    <div key={i} className="w-full text-left">
                      <h3 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{p.phase || `Phase ${i + 1}`}</h3>
                      <div className={`text-4xl font-bold mb-6 text-primary`}>{formatCurrency(Number(p.cost) || 0)}</div>
                      {p.description && <p className={`mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{p.description}</p>}
                      {p.breakdown && p.breakdown.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Breakdown:</h4>
                          {p.breakdown.map((b: any, bi: number) => {
                            const percentage = (Number(b.cost) / (Number(p.cost) || 1)) * 100;
                            return (
                              <div key={bi} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>{b.item}</span>
                                  <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(Number(b.cost))} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className={`h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: chartColors[bi % chartColors.length] }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
        {pricingNotes && <p className={`text-sm italic ${isDark ? "text-slate-400" : "text-slate-600"}`}>{pricingNotes}</p>}
      </div>
    );
  }

  if (block.visualPlaceholder === "tasks_section") {
    const tasks = filledData.tasks_detailed as { type: string; description: string }[] || [];
    if (tasks.length === 0) return null;

    const orderedCategories: string[] = [];
    const groupedTasks: Record<string, string[]> = {};
    tasks.forEach(t => {
      if (!groupedTasks[t.type]) { groupedTasks[t.type] = []; orderedCategories.push(t.type); }
      groupedTasks[t.type].push(t.description);
    });

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

    const orderedCategories: string[] = [];
    const groupedDeliverables: Record<string, string[]> = {};
    deliverables.forEach(d => {
      if (!groupedDeliverables[d.type]) { groupedDeliverables[d.type] = []; orderedCategories.push(d.type); }
      groupedDeliverables[d.type].push(d.description);
    });

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

    const orderedCategories: string[] = [];
    const groupedAssumptions: Record<string, string[]> = {};
    assumptions.forEach(a => {
      if (!groupedAssumptions[a.type]) { groupedAssumptions[a.type] = []; orderedCategories.push(a.type); }
      groupedAssumptions[a.type].push(a.description);
    });

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

    const orderedCategories: string[] = [];
    const groupedDependencies: Record<string, string[]> = {};
    dependencies.forEach(d => {
      if (!groupedDependencies[d.type]) { groupedDependencies[d.type] = []; orderedCategories.push(d.type); }
      groupedDependencies[d.type].push(d.description);
    });

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

  if (block.type === "paragraph") {
    const hasUnfilledPlaceholder = /\{\{[^}]+\}\}/.test(block.content);
    if (hasUnfilledPlaceholder && block.optional) return null;
    return (
      <div className={`mb-4 whitespace-pre-wrap leading-relaxed ${isDark ? "text-white" : "text-slate-700"}`}>
        {renderFormattedContent(block.content)}
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

  return null;
}
