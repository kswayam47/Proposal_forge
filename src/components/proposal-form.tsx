"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Settings2,
  Upload,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { type Proposal, type Template } from "@/lib/supabase";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const FORM_STAGES = [
  { id: 1, name: "Metadata", icon: "📋", description: "Basic proposal info" },
  { id: 2, name: "Business", icon: "🏢", description: "Client & context" },
  { id: 3, name: "Features", icon: "⚡", description: "Requirements list" },
  { id: 4, name: "Delivery", icon: "📅", description: "Phases & timeline" },
  { id: 5, name: "Resources", icon: "👥", description: "Team & allocation" },
  { id: 6, name: "Pricing", icon: "💰", description: "Costs & terms" },
  { id: 7, name: "Final", icon: "✅", description: "Review & extras" },
];

interface ProposalFormProps {
  proposal: Proposal;
  template?: Template;
  onFieldChange: (key: string, value: any) => void;
  onGenerateAI?: (context: string) => Promise<void>;
  onRefineField?: (field: string, context: string) => Promise<void>;
  onGeneratePlatformFeatures?: (phaseIndex: number, platformIndex: number, platformName: string, phaseTitle: string, context: string) => Promise<void>;
  onGenerateGovernance?: (context: string) => Promise<void>;
  onGenerateChangeManagement?: (context: string) => Promise<void>;
  onGenerateDeliveryPhases?: (context: string) => Promise<void>;
}

export function ProposalForm({ 
  proposal, 
  template, 
  onFieldChange, 
  onGenerateAI, 
  onRefineField, 
  onGeneratePlatformFeatures,
  onGenerateGovernance,
  onGenerateChangeManagement,
  onGenerateDeliveryPhases
}: ProposalFormProps) {
  const data = proposal.filled_data || {};
  const [projectContext, setProjectContext] = useState(data.project_context || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [refineContext, setRefineContext] = useState<Record<string, string>>({});
  const [activeRefineField, setActiveRefineField] = useState<string | null>(null);
  const [activePlatformRefine, setActivePlatformRefine] = useState<{ phaseIndex: number; platformIndex: number } | null>(null);
  const [platformRefineContext, setPlatformRefineContext] = useState<string>("");

  const handleRefine = async (field: string) => {
    if (!onRefineField) return;
    setIsGenerating(true);
    await onRefineField(field, refineContext[field] || "");
    setIsGenerating(false);
    setActiveRefineField(null);
  };
  
  const filteredDynamicSections = useMemo(() => {
    const dynamicSections = (data._dynamic_sections as any[] || []);
    if (!template) return dynamicSections;
    
    const existingBlockIds = new Set(template.content.map(b => b.id));
    return dynamicSections.filter(section => 
      existingBlockIds.has(section.headingBlockId) || existingBlockIds.has(section.contentBlockId)
    );
  }, [data._dynamic_sections, template]);
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({0: true});
  const [numberOfPhases, setNumberOfPhases] = useState<number>((data.delivery_phases as any[] || []).length || 0);
  const [currentStage, setCurrentStage] = useState(1);
  const [unlockedStages, setUnlockedStages] = useState<number[]>([1]);

  useEffect(() => {
    const handleSetFormStage = (event: CustomEvent<number>) => {
      const targetStage = event.detail;
      if (targetStage >= 1 && targetStage <= 7) {
        setCurrentStage(targetStage);
        setTimeout(() => {
          const formContent = document.querySelector('[data-section="' + targetStage + '"]');
          if (formContent) {
            formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };
    
    window.addEventListener('setFormStage', handleSetFormStage as EventListener);
    return () => window.removeEventListener('setFormStage', handleSetFormStage as EventListener);
  }, []);

  // Update unlocked stages based on data
  useEffect(() => {
    const checks: Record<number, string[]> = {
      1: ["proposal_title", "client_name"],
      2: ["client_overview"],
      3: ["feature_list"],
      4: ["delivery_phases"],
      5: ["resource_plan"],
      6: ["phase_pricing_table"],
    };

    let newUnlocked = [1];
    for (let i = 1; i <= 6; i++) {
      const fields = checks[i] || [];
      const isComplete = fields.every(f => {
        const val = data[f];
        if (Array.isArray(val)) return val.length > 0;
        return !!val;
      });
      if (isComplete) {
        newUnlocked.push(i + 1);
      } else {
        break;
      }
    }
    setUnlockedStages([...new Set(newUnlocked)]);
  }, [data]);

  const initializePhases = (count: number) => {
    const currentPhases = data.delivery_phases as any[] || [];
    const currentPricing = data.phase_pricing_table as any[] || [];
    
    if (count === currentPhases.length) return;
    
    const newPhases: any[] = [];
    const newPricing: any[] = [];
    
    for (let i = 0; i < count; i++) {
      if (currentPhases[i]) {
        newPhases.push(currentPhases[i]);
        newPricing.push(currentPricing[i] || {
          phase: `Phase ${i + 1}: ${currentPhases[i].title || ''}`,
          cost: 0,
          breakdown: [
            { item: "Development", cost: 0 },
            { item: "Design", cost: 0 },
            { item: "QA & Testing", cost: 0 },
            { item: "Project Management", cost: 0 }
          ]
        });
      } else {
        const prevEnd = newPhases.length > 0 ? (newPhases[newPhases.length - 1].weeks_end || 0) : 0;
        newPhases.push({
          name: `Phase ${i + 1}`,
          weeks_start: prevEnd,
          weeks_end: prevEnd + 8,
          title: "",
          platforms: [
            { name: "User App", features: "" },
            { name: "Supplier Web", features: "" },
            { name: "Admin Web", features: "" },
            { name: "Integrations", features: "" }
          ]
        });
        newPricing.push({
          phase: `Phase ${i + 1}`,
          cost: 0,
          breakdown: [
            { item: "Development", cost: 0 },
            { item: "Design", cost: 0 },
            { item: "QA & Testing", cost: 0 },
            { item: "Project Management", cost: 0 }
          ]
        });
      }
    }
    
    onFieldChange("delivery_phases", newPhases);
    setTimeout(() => {
      onFieldChange("phase_pricing_table", newPricing);
    }, 10);
    setNumberOfPhases(count);
    
    const expanded: Record<number, boolean> = {};
    newPhases.forEach((_, i) => expanded[i] = i === 0);
    setExpandedPhases(expanded);
  };

  const recalculateTotalCost = () => {
    const pricing = data.phase_pricing_table as any[] || [];
    const total = pricing.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    if (total !== Number(data.total_cost)) {
      onFieldChange("total_cost", total);
    }
  };

  const handleTableRowChange = (tableKey: string, rowIndex: number, field: string, value: any) => {
    const rows = [...(data[tableKey] as any[] || [])];
    rows[rowIndex] = { ...rows[rowIndex], [field]: value };
    onFieldChange(tableKey, rows);
  };

  const addTableRow = (tableKey: string, defaultRow: any) => {
    const rows = [...(data[tableKey] as any[] || [])];
    rows.push(defaultRow);
    onFieldChange(tableKey, rows);
  };

  const removeTableRow = (tableKey: string, rowIndex: number) => {
    const rows = [...(data[tableKey] as any[] || [])];
    rows.splice(rowIndex, 1);
    onFieldChange(tableKey, rows);
  };

    const handlePhaseChange = (phaseIndex: number, field: string, value: any) => {
      const phases = [...(data.delivery_phases as any[] || [])];
      phases[phaseIndex] = { ...phases[phaseIndex], [field]: value };
      
      const updates: Record<string, any> = {
        delivery_phases: phases
      };

      // Sync phase name to pricing table if it exists
      if (field === "title") {
        const pricing = [...(data.phase_pricing_table as any[] || [])];
        if (pricing[phaseIndex]) {
          const phaseNum = phaseIndex + 1;
          const phaseLabel = value && String(value).trim() !== "" && String(value).toLowerCase() !== `phase ${phaseNum}`
            ? `Phase ${phaseNum}: ${value}`
            : `Phase ${phaseNum}`;
          pricing[phaseIndex] = { ...pricing[phaseIndex], phase: phaseLabel };
          updates.phase_pricing_table = pricing;
        }
      }

      // Batch updates if possible, though onFieldChange only takes one key
      Object.entries(updates).forEach(([key, val]) => {
        onFieldChange(key, val);
      });
    };

  const handlePhasePlatformChange = (phaseIndex: number, platformIndex: number, field: string, value: any) => {
    const phases = [...(data.delivery_phases as any[] || [])];
    const platforms = [...(phases[phaseIndex]?.platforms || [])];
    platforms[platformIndex] = { ...platforms[platformIndex], [field]: value };
    phases[phaseIndex] = { ...phases[phaseIndex], platforms };
    onFieldChange("delivery_phases", phases);
  };

  const addPhase = () => {
    const phases = [...(data.delivery_phases as any[] || [])];
    const pricing = [...(data.phase_pricing_table as any[] || [])];
    const newPhaseNum = phases.length + 1;
    const newPhase = {
      name: `Phase ${newPhaseNum}`,
      weeks_start: phases.length > 0 ? (phases[phases.length - 1].weeks_end || 0) + 1 : 0,
      weeks_end: (phases.length > 0 ? (phases[phases.length - 1].weeks_end || 0) : 0) + 8,
      title: "",
      platforms: [
        { name: "User App", features: "" },
        { name: "Supplier Web", features: "" },
        { name: "Admin Web", features: "" },
        { name: "Integrations", features: "" }
      ]
    };
    phases.push(newPhase);
    pricing.push({ 
      phase: `Phase ${newPhaseNum}`, 
      cost: 0,
      breakdown: [
        { item: "Development", cost: 0 },
        { item: "Design", cost: 0 },
        { item: "QA & Testing", cost: 0 },
        { item: "Project Management", cost: 0 }
      ]
    });
    
    // Update both at once using a combined object
    onFieldChange("delivery_phases", phases);
    setTimeout(() => {
      onFieldChange("phase_pricing_table", pricing);
    }, 10);
    setNumberOfPhases(phases.length);
    
    setExpandedPhases({ ...expandedPhases, [phases.length - 1]: true });
  };

  const removePhase = (index: number) => {
    const phases = [...(data.delivery_phases as any[] || [])];
    const pricing = [...(data.phase_pricing_table as any[] || [])];
    phases.splice(index, 1);
    pricing.splice(index, 1);
    
    onFieldChange("delivery_phases", phases);
    setTimeout(() => {
      onFieldChange("phase_pricing_table", pricing);
    }, 10);
    setNumberOfPhases(phases.length);
  };

  const addPlatformToPhase = (phaseIndex: number) => {
    const phases = [...(data.delivery_phases as any[] || [])];
    const platforms = [...(phases[phaseIndex]?.platforms || [])];
    platforms.push({ name: "", features: "" });
    phases[phaseIndex] = { ...phases[phaseIndex], platforms };
    onFieldChange("delivery_phases", phases);
  };

  const removePlatformFromPhase = (phaseIndex: number, platformIndex: number) => {
    const phases = [...(data.delivery_phases as any[] || [])];
    const platforms = [...(phases[phaseIndex]?.platforms || [])];
    platforms.splice(platformIndex, 1);
    phases[phaseIndex] = { ...phases[phaseIndex], platforms };
    onFieldChange("delivery_phases", phases);
  };

  const getStageCompletion = (stageId: number): number => {
    const checks: Record<number, string[]> = {
      1: ["proposal_title", "client_name"],
      2: ["client_overview", "problem_statements"],
      3: ["feature_list"],
      4: ["delivery_phases"],
      5: ["resource_plan"],
      6: ["phase_pricing_table", "total_cost"],
      7: ["deliverables_detailed"],
    };
    const fields = checks[stageId] || [];
    if (fields.length === 0) return 0;
    const filled = fields.filter(f => {
      const val = data[f];
      if (Array.isArray(val)) return val.length > 0;
      return !!val;
    });
    return Math.round((filled.length / fields.length) * 100);
  };

  const totalCompletion = Math.round(
    FORM_STAGES.reduce((sum, s) => sum + getStageCompletion(s.id), 0) / FORM_STAGES.length
  );

  const scrollToSection = (sectionNum: number) => {
    const sectionElement = document.querySelector(`[data-section="${sectionNum}"]`);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navigateToStage = (stageId: number) => {
    setCurrentStage(stageId);
    const formStageEvent = new CustomEvent('setFormStage', { detail: stageId });
    window.dispatchEvent(formStageEvent);
  };

  const StageNavigation = ({ stageId }: { stageId: number }) => {
    const isFirst = stageId === 1;
    const isLast = stageId === FORM_STAGES.length;
    const isNextUnlocked = unlockedStages.includes(stageId + 1);
    
    return (
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-dashed">
        {!isFirst ? (
          <Button 
            variant="outline" 
            onClick={() => navigateToStage(stageId - 1)}
            className="gap-2"
          >
            <ChevronUp className="h-4 w-4" /> Previous: {FORM_STAGES[stageId - 2].name}
          </Button>
        ) : <div />}
        
        {!isLast && (
          <Button 
            onClick={() => navigateToStage(stageId + 1)}
            disabled={!isNextUnlocked}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isNextUnlocked ? (
              <>Next: {FORM_STAGES[stageId].name} <ChevronDown className="h-4 w-4" /></>
            ) : (
              <><AlertCircle className="h-4 w-4" /> Complete Stage to Unlock Next</>
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* Simple Section Progress */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pt-2 pb-4 border-b mb-6 -mx-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xl tracking-tight">
                    Section {currentStage} <span className="text-muted-foreground font-medium text-lg ml-1">of {FORM_STAGES.length}</span>
                  </h3>
                  <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-none rounded-full flex items-center gap-1.5 font-semibold">
                    <span className="text-base">{FORM_STAGES[currentStage - 1]?.icon}</span>
                    {FORM_STAGES[currentStage - 1]?.name}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium">{FORM_STAGES[currentStage - 1]?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-xl border">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-background shadow-sm rounded-lg"
                onClick={() => currentStage > 1 && navigateToStage(currentStage - 1)}
                disabled={currentStage === 1}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-background rounded-lg border shadow-sm">
                <span className="text-sm font-bold text-primary">{currentStage}</span>
                <span className="text-xs text-muted-foreground font-medium">/</span>
                <span className="text-sm font-bold text-muted-foreground">{FORM_STAGES.length}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-background shadow-sm rounded-lg"
                onClick={() => currentStage < FORM_STAGES.length && unlockedStages.includes(currentStage + 1) && navigateToStage(currentStage + 1)}
                disabled={currentStage === FORM_STAGES.length || !unlockedStages.includes(currentStage + 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/30 overflow-hidden">
            <motion.div 
              className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStage / FORM_STAGES.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        <div className="pt-4 space-y-8">
            {currentStage === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Section 1: Metadata */}
                  <Card data-section="1" id="form-basic">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">1. Proposal Metadata</CardTitle>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Proposal Title</Label>
                      <Input value={data.proposal_title || proposal.title || ""} onChange={(e) => onFieldChange("proposal_title", e.target.value)} placeholder="Enter proposal title" />
                      <p className="text-[10px] text-muted-foreground italic">Required to unlock next stage</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input value={data.proposal_subtitle || ""} onChange={(e) => onFieldChange("proposal_subtitle", e.target.value)} placeholder="Short description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Name</Label>
                      <Input value={data.client_name || ""} onChange={(e) => onFieldChange("client_name", e.target.value)} placeholder="Client company name" />
                      <p className="text-[10px] text-muted-foreground italic">Required to unlock next stage</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Client Industry</Label>
                      <Input value={data.client_industry || ""} onChange={(e) => onFieldChange("client_industry", e.target.value)} placeholder="e.g. Healthcare, Fintech" />
                    </div>
                    <div className="space-y-2">
                      <Label>Region / Country</Label>
                      <Input value={data.region || ""} onChange={(e) => onFieldChange("region", e.target.value)} placeholder="e.g. India, USA" />
                    </div>
                    <div className="space-y-2">
                      <Label>Author Name</Label>
                      <Input value={data.proposal_author || ""} onChange={(e) => onFieldChange("proposal_author", e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Start Date</Label>
                      <Input type="date" value={data.start_date || ""} onChange={(e) => onFieldChange("start_date", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validity Period</Label>
                      <Input value={data.validity_period || ""} onChange={(e) => onFieldChange("validity_period", e.target.value)} placeholder="e.g. 30 days" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confidentiality Level</Label>
                      <Select value={data.proposal_confidentiality || "Medium"} onValueChange={(val) => onFieldChange("proposal_confidentiality", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Confidential">Confidential</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input value={data.version || "1.0"} onChange={(e) => onFieldChange("version", e.target.value)} placeholder="1.0" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visual Settings */}
                <Card data-section="1b">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Visual Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Graph Color Theme</Label>
                      <p className="text-xs text-muted-foreground mb-2">Select a color palette for charts and graphs in your proposal</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { name: "Auto", colors: ["#7c3aed", "#0ea5e9", "#f97316", "#22c55e", "#ec4899", "#eab308"] },
                            { name: "Colorful", colors: ["#3b82f6", "#eab308", "#22c55e", "#a855f7", "#f97316"] },
                            { name: "Colorless", colors: ["#6b7280", "#9ca3af", "#4b5563", "#d1d5db", "#374151"] },
                            { name: "Blue", colors: ["#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"] },
                            { name: "Yellow", colors: ["#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"] },
                            { name: "Green", colors: ["#15803d", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"] },
                            { name: "Purple", colors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"] },
                            { name: "Teal", colors: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"] },
                            { name: "Orange", colors: ["#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74"] },
                            { name: "Pink", colors: ["#be185d", "#db2777", "#ec4899", "#f472b6", "#f9a8d4"] },
                            { name: "Red", colors: ["#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5"] },
                          ].map((theme) => (
                          <button
                            key={theme.name}
                            type="button"
                            onClick={() => onFieldChange("chart_color_theme", theme.name)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              (data.chart_color_theme || "Auto") === theme.name
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex gap-1 justify-center mb-2">
                              {theme.colors.slice(0, 5).map((color, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <p className="text-xs font-medium text-center">{theme.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              <StageNavigation stageId={1} />
            </motion.div>
          )}

              {currentStage === 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Section 2: Business Understanding */}
                  <Card data-section="2" id="form-business">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">2. Business Understanding</CardTitle>
                    </div>
                  </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Project Context / Details (AI Input)
                          </Label>
                          <Textarea 
                            value={projectContext} 
                            onChange={(e) => {
                              setProjectContext(e.target.value);
                              onFieldChange("project_context", e.target.value);
                            }} 
                            placeholder="Provide details about the project, client needs, and any specific context for the AI to generate the proposal..." 
                            rows={4}
                          />
                        </div>
                        <Button 
                          onClick={() => onGenerateAI?.(projectContext)}
                          disabled={isGenerating || !projectContext.trim()}
                          className="w-full gap-2"
                        >
                          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          Generate Business Understanding by AI
                        </Button>
                      </div>

                      <div className="space-y-6 pt-4">
                        {[
                          { id: "client_overview", label: "Client Overview", placeholder: "Describe the client's business, market position, and background..." },
                          { id: "platform_description", label: "Platform Description", placeholder: "Describe the platform components:\n- User App: What users can do\n- Supplier Web: What suppliers can do\n- Admin Web Console: What admins can manage" },
                          { id: "value_drivers", label: "Unique Value Drivers", placeholder: "What makes this solution unique and valuable?" }
                        ].map((field) => (
                          <div key={field.id} className="space-y-2 group relative">
                            <div className="flex items-center justify-between">
                              <Label>{field.label}</Label>
                              {activeRefineField === field.id ? (
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setActiveRefineField(null)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => setActiveRefineField(field.id)}
                                >
                                  <Pencil className="h-3 w-3" /> Refine with AI
                                </Button>
                              )}
                            </div>
                            
                            {activeRefineField === field.id && (
                              <div className="flex gap-2 mb-2 animate-in slide-in-from-top-2">
                                <Input 
                                  placeholder="What changes should AI make to this field?" 
                                  value={refineContext[field.id] || ""}
                                  onChange={(e) => setRefineContext({ ...refineContext, [field.id]: e.target.value })}
                                  className="h-8 text-xs"
                                />
                                <Button 
                                  size="sm" 
                                  className="h-8 gap-1"
                                  onClick={() => handleRefine(field.id)}
                                  disabled={isGenerating || !refineContext[field.id]?.trim()}
                                >
                                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                  Update
                                </Button>
                              </div>
                            )}

                            <Textarea 
                              value={data[field.id] || ""} 
                              onChange={(e) => onFieldChange(field.id, e.target.value)} 
                              placeholder={field.placeholder} 
                              rows={field.id === "platform_description" ? 6 : 4} 
                            />
                            {field.id === "platform_description" && (
                              <p className="text-xs text-muted-foreground">Describe what each platform comprises of: User App perspective, Supplier Web perspective, and Admin Web Console</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                </Card>
                <StageNavigation stageId={2} />
              </motion.div>
            )}

            {currentStage === 3 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Section 3: Features Table */}
                  <Card data-section="3" id="form-features">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">3. Features & Requirements</CardTitle>
                      <div className="flex items-center gap-2">
                        <label htmlFor="csv-upload-features">
                          <Button variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                            <span>
                              <Upload className="h-4 w-4" /> Import CSV
                            </span>
                          </Button>
                        </label>
                        <input
                          id="csv-upload-features"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                const lines = text.split('\n').filter(line => line.trim());
                                if (lines.length < 2) return;
                                
                                const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                                
                                const subcategoryIndex = headers.findIndex(h => 
                                  h.includes('subcategory') || h === 'sub' || h === 'sub category' || h === 'sub-category'
                                );
                                
                                const appIndex = headers.findIndex((h, idx) => {
                                  if (idx === subcategoryIndex) return false;
                                  return h.includes('app') || h === 'category' || h === 'type' || h === 'platform';
                                });
                                
                                const categoryIndex = subcategoryIndex >= 0 ? subcategoryIndex : headers.findIndex((h, idx) => {
                                  if (idx === appIndex) return false;
                                  return h.includes('category') || h.includes('group') || h.includes('module');
                                });
                                
                                const nameIndex = headers.findIndex(h => h.includes('feature') || h.includes('name') || h.includes('requirement') || h.includes('description'));
                                
                                const features = lines.slice(1).map(line => {
                                  const values: string[] = [];
                                  let current = '';
                                  let inQuotes = false;
                                  for (let i = 0; i < line.length; i++) {
                                    const char = line[i];
                                    if (char === '"') {
                                      inQuotes = !inQuotes;
                                    } else if (char === ',' && !inQuotes) {
                                      values.push(current.trim().replace(/^"|"$/g, ''));
                                      current = '';
                                    } else {
                                      current += char;
                                    }
                                  }
                                  values.push(current.trim().replace(/^"|"$/g, ''));
                                  
                                  const appValue = appIndex >= 0 ? values[appIndex]?.trim() : '';
                                  const categoryValue = categoryIndex >= 0 ? values[categoryIndex]?.trim() : '';
                                  const nameValue = nameIndex >= 0 ? values[nameIndex]?.trim() : values[0]?.trim() || '';
                                  
                                  return {
                                    category: appValue || 'User',
                                    subcategory: categoryValue || 'General',
                                    name: nameValue,
                                  };
                                }).filter(f => f.name);
                                
                                const existing = data.feature_list as any[] || [];
                                onFieldChange('feature_list', [...existing, ...features]);
                              };
                            reader.readAsText(file);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">CSV format: App, Category, Feature (or just Feature names one per row)</p>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Baseline Requirements Title</Label>
                      <Input value={data.baseline_title || ""} onChange={(e) => onFieldChange("baseline_title", e.target.value)} placeholder="e.g. ProjectName-baseline-requirements" />
                      <p className="text-xs text-muted-foreground">This title will appear as the clickable button in the Features section</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Categories (comma-separated)</Label>
                      <Input value={data.custom_categories || ""} onChange={(e) => onFieldChange("custom_categories", e.target.value)} placeholder="e.g. Onboarding, Discovery, CRM" />
                      <p className="text-xs text-muted-foreground">Add custom category options for the Category dropdown</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>System Capabilities Summary</Label>
                    <Textarea value={data.system_capabilities_summary || ""} onChange={(e) => onFieldChange("system_capabilities_summary", e.target.value)} placeholder="High-level summary of the system capabilities..." rows={3} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">Feature List <span className="text-xs text-muted-foreground">(Powers charts - App, Category columns)</span></Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>App</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="w-[40%]">Feature</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.feature_list || []).map((row: any, i: number) => {
                            const customCats = (data.custom_categories as string || "").split(",").map((c: string) => c.trim()).filter(Boolean);
                            const defaultCats = ["Onboarding & Identity", "Discovery & Planning", "Social & SSO", "Data Enrichment", "Analytics & Marketing", "Settings & Support", "Payments", "Orders", "CRM & Loyalty", "Notifications"];
                            const allCategories = [...new Set([...defaultCats, ...customCats])];
                            
                            return (
                              <TableRow key={i}>
                                <TableCell className="p-1">
                                  <Select value={row.category || "User"} onValueChange={(val) => handleTableRowChange("feature_list", i, "category", val)}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="User">User</SelectItem>
                                      <SelectItem value="Supplier">Supplier</SelectItem>
                                      <SelectItem value="Admin">Admin</SelectItem>
                                      <SelectItem value="Integration">Integration</SelectItem>
                                      <SelectItem value="Merchant">Merchant</SelectItem>
                                      <SelectItem value="Driver">Driver</SelectItem>
                                      <SelectItem value="API">API</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-1">
                                  <Select value={row.subcategory || "General"} onValueChange={(val) => handleTableRowChange("feature_list", i, "subcategory", val)}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="General">General</SelectItem>
                                      {allCategories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-1">
                                  <Input value={row.name || ""} onChange={(e) => handleTableRowChange("feature_list", i, "name", e.target.value)} placeholder="Feature name" className="h-9" />
                                </TableCell>
                                <TableCell className="p-1">
                                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeTableRow("feature_list", i)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow("feature_list", { name: "", category: "User", subcategory: "General" })}>
                      <Plus className="h-4 w-4 mr-1" /> Add Feature
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <StageNavigation stageId={3} />
            </motion.div>
          )}

          {currentStage === 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
                  {/* Section 4: Delivery Plan - Enhanced */}
                    <Card className="border-2 border-primary/20" data-section="4" id="form-delivery">
                    <CardHeader className="pb-4 bg-primary/5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">4. Delivery Plan (Phases & Timelines)</CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 bg-background shadow-sm hover:bg-primary/5"
                          onClick={() => {
                            const context = prompt("Describe how you want to structure the phases (optional):") || "Generate 3-4 professional phases";
                            onGenerateDeliveryPhases?.(context);
                          }}
                        >
                          <Sparkles className="h-4 w-4 text-primary" />
                          Completely generate by AI
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Define each phase with platform-wise features. This generates the timeline and charts automatically.
                      </p>
                    </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Number of Phases <span className="text-destructive">*</span></Label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          min={1}
                          max={10}
                          value={numberOfPhases} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setNumberOfPhases(val);
                          }}
                          placeholder="e.g. 3" 
                          className="w-24"
                        />
                        <Button 
                          onClick={() => initializePhases(numberOfPhases)}
                          disabled={numberOfPhases < 1}
                        >
                          Generate Phases
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Enter the number of phases and click Generate to create phase sections.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Delivery Introduction</Label>
                    <Textarea 
                      value={data.delivery_intro || `We divide development into ${(data.delivery_phases as any[] || []).length || 'multiple'} parts as below:`} 
                      onChange={(e) => onFieldChange("delivery_intro", e.target.value)} 
                      placeholder="We divide development into three parts as below:" 
                      rows={2} 
                    />
                  </div>

                  {(data.delivery_phases as any[] || []).map((phase: any, phaseIndex: number) => (
                    <Collapsible 
                      key={phaseIndex} 
                      open={expandedPhases[phaseIndex]} 
                      onOpenChange={(open) => setExpandedPhases({ ...expandedPhases, [phaseIndex]: open })}
                    >
                      <Card className="border-l-4 border-l-primary">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {expandedPhases[phaseIndex] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="font-bold text-primary">
                                  Phase {phaseIndex + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12})
                                </span>
                                {phase.title && <span className="text-muted-foreground">: {phase.title}</span>}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => { e.stopPropagation(); removePhase(phaseIndex); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Phase Title</Label>
                                <Input 
                                  value={phase.title || ""} 
                                  onChange={(e) => handlePhaseChange(phaseIndex, "title", e.target.value)} 
                                  placeholder="e.g. Go-Live Core" 
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Start Week</Label>
                                <Input 
                                  type="number" 
                                  value={phase.weeks_start || 0} 
                                  onChange={(e) => handlePhaseChange(phaseIndex, "weeks_start", parseInt(e.target.value) || 0)} 
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">End Week</Label>
                                <Input 
                                  type="number" 
                                  value={phase.weeks_end || 12} 
                                  onChange={(e) => handlePhaseChange(phaseIndex, "weeks_end", parseInt(e.target.value) || 12)} 
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Duration</Label>
                                <Input 
                                  disabled 
                                  value={`${(phase.weeks_end || 12) - (phase.weeks_start || 0)} weeks`} 
                                  className="h-9 bg-muted"
                                />
                              </div>
                            </div>

                              <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={(data.platforms_label || "Platforms / Components")}
                                      onChange={(e) => onFieldChange("platforms_label", e.target.value)}
                                      className="h-7 w-44 text-sm font-semibold border-dashed"
                                      placeholder="Label..."
                                    />
                                    <span className="text-[10px] text-muted-foreground">(editable)</span>
                                  </div>
                                {(phase.platforms || []).map((platform: any, platformIndex: number) => {
                                  const isActiveRefine = activePlatformRefine?.phaseIndex === phaseIndex && activePlatformRefine?.platformIndex === platformIndex;
                                  return (
                                  <div key={platformIndex} className="space-y-2">
                                    <div className="flex gap-2 items-start group">
                                      <div className="w-32 shrink-0">
                                        <Input 
                                          value={platform.name || ""} 
                                          onChange={(e) => handlePhasePlatformChange(phaseIndex, platformIndex, "name", e.target.value)} 
                                          placeholder="Platform" 
                                          className="h-9 font-medium"
                                        />
                                      </div>
                                      <div className="flex-1 relative">
                                        <Textarea 
                                          value={platform.features || ""} 
                                          onChange={(e) => handlePhasePlatformChange(phaseIndex, platformIndex, "features", e.target.value)} 
                                          placeholder="List features separated by commas: Onboarding, Dashboard, Notifications..."
                                          rows={2}
                                        />
                                        {!isActiveRefine && (
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="absolute top-1 right-1 h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background"
                                            onClick={() => {
                                              setActivePlatformRefine({ phaseIndex, platformIndex });
                                              setPlatformRefineContext("");
                                            }}
                                          >
                                            <Sparkles className="h-3 w-3" /> Refine with AI
                                          </Button>
                                        )}
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 text-destructive shrink-0"
                                        onClick={() => removePlatformFromPhase(phaseIndex, platformIndex)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {isActiveRefine && (
                                      <div className="flex gap-2 ml-32 animate-in slide-in-from-top-2">
                                        <Input 
                                          placeholder={`What features should AI generate for ${platform.name || 'this platform'}?`}
                                          value={platformRefineContext}
                                          onChange={(e) => setPlatformRefineContext(e.target.value)}
                                          className="h-8 text-xs flex-1"
                                        />
                                        <Button 
                                          size="sm" 
                                          className="h-8 gap-1"
                                          onClick={async () => {
                                            if (onGeneratePlatformFeatures) {
                                              setIsGenerating(true);
                                              await onGeneratePlatformFeatures(
                                                phaseIndex, 
                                                platformIndex, 
                                                platform.name || "Platform",
                                                phase.title || `Phase ${phaseIndex + 1}`,
                                                platformRefineContext || "Generate relevant features"
                                              );
                                              setIsGenerating(false);
                                            }
                                            setActivePlatformRefine(null);
                                            setPlatformRefineContext("");
                                          }}
                                          disabled={isGenerating}
                                        >
                                          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                          Generate
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-8"
                                          onClick={() => {
                                            setActivePlatformRefine(null);
                                            setPlatformRefineContext("");
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                                })}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-dashed"
                                  onClick={() => addPlatformToPhase(phaseIndex)}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Platform
                                </Button>
                              </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}

                  <Button 
                    variant="default" 
                    className="w-full gap-2"
                    onClick={addPhase}
                  >
                    <Plus className="h-4 w-4" /> Add Phase
                  </Button>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                    <strong>Tip:</strong> The timeline chart and duration donut will be automatically generated from your phase data.
                  </div>
                </CardContent>
              </Card>
              <StageNavigation stageId={4} />
            </motion.div>
          )}

          {currentStage === 5 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
                {/* Section 5: Resources Table */}
                  <Card data-section="5" id="form-resources">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">5. Resource Engagement</CardTitle>
                    </div>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Team Size</Label>
                      <Input type="number" value={data.team_size || ""} onChange={(e) => onFieldChange("team_size", e.target.value)} placeholder="e.g. 8" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Resource Plan</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Role</TableHead>
                            <TableHead className="w-[15%]">Count</TableHead>
                            <TableHead className="w-[15%]">Allocation %</TableHead>
                            <TableHead>Phases</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.resource_plan || []).map((row: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="p-1">
                                <Input value={row.role || ""} onChange={(e) => handleTableRowChange("resource_plan", i, "role", e.target.value)} placeholder="e.g. Senior Developer" className="h-9" />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input type="number" value={row.count || ""} onChange={(e) => handleTableRowChange("resource_plan", i, "count", parseInt(e.target.value) || 0)} placeholder="2" className="h-9" />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input type="number" value={row.allocation || ""} onChange={(e) => handleTableRowChange("resource_plan", i, "allocation", parseInt(e.target.value) || 0)} placeholder="100" className="h-9" />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input value={row.phases || ""} onChange={(e) => handleTableRowChange("resource_plan", i, "phases", e.target.value)} placeholder="1, 2, 3" className="h-9" />
                              </TableCell>
                              <TableCell className="p-1">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeTableRow("resource_plan", i)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow("resource_plan", { role: "", count: 1, allocation: 100, phases: "" })}>
                      <Plus className="h-4 w-4 mr-1" /> Add Resource
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Team Justification</Label>
                    <Textarea value={data.resource_justification || ""} onChange={(e) => onFieldChange("resource_justification", e.target.value)} placeholder="Explain why this team composition is ideal for the project..." rows={3} />
                  </div>
                </CardContent>
              </Card>
              <StageNavigation stageId={5} />
            </motion.div>
          )}

{currentStage === 6 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                  {/* Section 6: Pricing */}
                    <Card data-section="6" id="form-pricing">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">6. Pricing & Commercials</CardTitle>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pricing Model</Label>
                        <Select value={data.pricing_model || "Fixed"} onValueChange={(val) => onFieldChange("pricing_model", val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fixed">Fixed Price</SelectItem>
                            <SelectItem value="T&M">Time & Materials</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                            <SelectItem value="Retainer">Retainer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tax / GST (%)</Label>
                        <Input type="number" value={data.tax_percent || "18"} onChange={(e) => onFieldChange("tax_percent", e.target.value)} placeholder="18" />
                      </div>
                    </div>

                    <EffortBasedPricingSection data={data} onFieldChange={onFieldChange} />

                <div className="space-y-2">
                  <Label>Payment Milestones</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Milestone</TableHead>
                          <TableHead className="w-[15%]">%</TableHead>
                          <TableHead>Amount (₹)</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.payment_milestones_table || []).map((row: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="p-1">
                              <Input value={row.milestone || ""} onChange={(e) => handleTableRowChange("payment_milestones_table", i, "milestone", e.target.value)} placeholder="Project Kickoff" className="h-9" />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input type="number" value={row.percentage || ""} onChange={(e) => handleTableRowChange("payment_milestones_table", i, "percentage", parseInt(e.target.value) || 0)} placeholder="20" className="h-9" />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input type="number" value={row.amount || ""} onChange={(e) => handleTableRowChange("payment_milestones_table", i, "amount", parseInt(e.target.value) || 0)} placeholder="1000000" className="h-9" />
                            </TableCell>
                            <TableCell className="p-1">
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeTableRow("payment_milestones_table", i)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow("payment_milestones_table", { milestone: "", percentage: 0, amount: 0 })}>
                    <Plus className="h-4 w-4 mr-1" /> Add Milestone
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Pricing Notes</Label>
                  <Textarea value={data.pricing_notes || ""} onChange={(e) => onFieldChange("pricing_notes", e.target.value)} placeholder="Additional terms, exclusions, payment terms..." rows={3} />
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">AI cannot modify pricing numbers. Only narrative text can be enhanced.</p>
                </div>
              </CardContent>
              </Card>
              <StageNavigation stageId={6} />
            </motion.div>
          )}

          {currentStage === 7 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
                {/* Section 7: Tasks */}
                <Card data-section="7">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">7. Tasks Involved</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Select a category and check suggestions to add, or add your own custom descriptions.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TasksCategorySection data={data} onFieldChange={onFieldChange} />
                  </CardContent>
                </Card>

                {/* Section 8: Deliverables */}
                <Card data-section="8">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">8. Deliverables</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Select a category and check suggestions to add, or add your own custom descriptions.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DeliverablesCategorySection data={data} onFieldChange={onFieldChange} />
                  </CardContent>
                </Card>

                {/* Section 9: Assumptions */}
                <Card data-section="9">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">9. Assumptions</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Select a category and check suggestions to add, or add your own custom descriptions.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AssumptionsCategorySection data={data} onFieldChange={onFieldChange} />
                  </CardContent>
                </Card>

                {/* Section 10: Dependencies */}
                <Card data-section="10">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">10. Dependencies</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Select a category and check suggestions to add, or add your own custom descriptions.</p>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <DependenciesCategorySection data={data} onFieldChange={onFieldChange} />
                </CardContent>
              </Card>

            {/* Section 11: Governance */}
            <Card data-section="11">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">11. Governance & Communication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <GovernanceSection data={data} onFieldChange={onFieldChange} onGenerateGovernance={onGenerateGovernance} />
              </CardContent>
            </Card>

            {/* Section 12: Change Management */}
            <Card data-section="12">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">12. Change Management</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Define the process, classification, and constraints for handling change requests.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ChangeManagementSection data={data} onFieldChange={onFieldChange} onGenerateChangeManagement={onGenerateChangeManagement} />
              </CardContent>
            </Card>

            {/* Section 13: Sign-offs & Appendices */}
            <Card data-section="13">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">13. Sign-offs & Appendices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignOffSection data={data} onFieldChange={onFieldChange} />
              </CardContent>
            </Card>

              {/* Dynamic Sections - Added via Reusable Blocks */}
              {filteredDynamicSections.map((section: any, sectionIdx: number) => (
                <DynamicFormSection 
                  key={`${section.key}-${sectionIdx}`} 
                  section={section} 
                  data={data} 
                  onFieldChange={onFieldChange}
                  sectionIndex={sectionIdx}
                />
              ))}
              <StageNavigation stageId={7} />
            </motion.div>
          )}
        </div>
        </div>
      </div>
    );
}

function EffortBasedPricingSection({ data, onFieldChange }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void }) {
  const features = (data.feature_list || []) as { category: string; subcategory: string; name: string }[];
  const featureDifficulties = (data.feature_difficulties || {}) as Record<string, 'easy' | 'medium' | 'complex'>;
  const featurePhases = (data.feature_phases || {}) as Record<string, number>;
  const phases = (data.delivery_phases || []) as { title: string; name: string }[];
  const phaseBreakdownPercentages = (data.phase_breakdown_percentages || {}) as Record<number, { item: string; percentage: number }[]>;
  
  const difficultyHours = {
    easy: Number(data.effort_hours_easy) || 4,
    medium: Number(data.effort_hours_medium) || 8,
    complex: Number(data.effort_hours_complex) || 16
  };
  
  const hourlyRate = Number(data.effort_hourly_rate) || 100;

  const defaultBreakdown = [
    { item: "Development", percentage: 60 },
    { item: "Testing & QA", percentage: 20 },
    { item: "Project Management", percentage: 10 },
    { item: "Design", percentage: 10 }
  ];

  const setFeatureDifficulty = (featureName: string, difficulty: 'easy' | 'medium' | 'complex') => {
    const newDifficulties = { ...featureDifficulties, [featureName]: difficulty };
    onFieldChange("feature_difficulties", newDifficulties);
  };

  const setFeaturePhase = (featureName: string, phaseNum: number) => {
    const newPhases = { ...featurePhases, [featureName]: phaseNum };
    onFieldChange("feature_phases", newPhases);
  };

  const setAllDifficulty = (difficulty: 'easy' | 'medium' | 'complex') => {
    const newDifficulties: Record<string, 'easy' | 'medium' | 'complex'> = {};
    features.forEach(f => {
      newDifficulties[f.name] = difficulty;
    });
    onFieldChange("feature_difficulties", newDifficulties);
  };

  const setAllPhase = (phaseNum: number) => {
    const newPhases: Record<string, number> = {};
    features.forEach(f => {
      newPhases[f.name] = phaseNum;
    });
    onFieldChange("feature_phases", newPhases);
  };

  const getPhaseBreakdown = (phaseIndex: number) => {
    return phaseBreakdownPercentages[phaseIndex] || defaultBreakdown;
  };

  const updatePhaseBreakdown = (phaseIndex: number, breakdown: { item: string; percentage: number }[]) => {
    const newBreakdowns = { ...phaseBreakdownPercentages, [phaseIndex]: breakdown };
    onFieldChange("phase_breakdown_percentages", newBreakdowns);
  };

  const counts = {
    easy: features.filter(f => featureDifficulties[f.name] === 'easy').length,
    medium: features.filter(f => featureDifficulties[f.name] === 'medium').length,
    complex: features.filter(f => featureDifficulties[f.name] === 'complex').length,
    unassigned: features.filter(f => !featureDifficulties[f.name]).length
  };

  const calculatePhaseHours = (phaseNum: number) => {
    return features
      .filter(f => featurePhases[f.name] === phaseNum && featureDifficulties[f.name])
      .reduce((total, f) => {
        const difficulty = featureDifficulties[f.name];
        return total + (difficulty ? difficultyHours[difficulty] : 0);
      }, 0);
  };

  const calculatePhaseTimeCost = (phaseNum: number) => {
    return calculatePhaseHours(phaseNum) * hourlyRate;
  };

    const calculatePhaseBreakdownCosts = (phaseNum: number) => {
      const phaseHours = calculatePhaseHours(phaseNum);
      const breakdown = getPhaseBreakdown(phaseNum);
      return breakdown.map(item => ({
        ...item,
        cost: Math.round((phaseHours * (item.percentage / 100)) * hourlyRate)
      }));
    };

  const calculatePhaseTotalCost = (phaseNum: number) => {
    const breakdownCosts = calculatePhaseBreakdownCosts(phaseNum);
    return breakdownCosts.reduce((sum, item) => sum + item.cost, 0);
  };

  const totalHours = 
    (counts.easy * difficultyHours.easy) + 
    (counts.medium * difficultyHours.medium) + 
    (counts.complex * difficultyHours.complex);

  const totalCost = totalHours * hourlyRate;

  const grandTotal = phases.length > 0 
    ? phases.reduce((sum, _, idx) => sum + calculatePhaseTotalCost(idx + 1), 0)
    : totalCost;

  const syncToPhaseBreakdown = useCallback(() => {
    const newPricing = phases.map((phase, idx) => {
      const phaseNum = idx + 1;
      const breakdownCosts = calculatePhaseBreakdownCosts(phaseNum);
      const phaseTotalCost = calculatePhaseTotalCost(phaseNum);
    const phaseLabel = phase.title && phase.title.trim() !== "" && phase.title.toLowerCase() !== `phase ${phaseNum}`
      ? `Phase ${phaseNum}: ${phase.title}`
      : `Phase ${phaseNum}`;
    return {
      phase: phaseLabel,
      cost: phaseTotalCost,
      breakdown: breakdownCosts.map(b => ({ item: b.item, contribution: b.percentage, cost: b.cost }))
    };
    });
    onFieldChange("phase_pricing_table", newPricing);
  }, [phases, calculatePhaseBreakdownCosts, calculatePhaseTotalCost, onFieldChange]);

  // Auto-sync pricing to phase_pricing_table whenever calculations change
  const lastSyncRef = useRef<string>("");

  useEffect(() => {
    if (phases.length > 0) {
      const newPricing = phases.map((phase, idx) => {
        const phaseNum = idx + 1;
        const phaseFeatures = features.filter(f => featurePhases[f.name] === phaseNum && featureDifficulties[f.name]);
        const phaseHours = phaseFeatures.reduce((total, f) => {
          const difficulty = featureDifficulties[f.name];
          return total + (difficulty ? difficultyHours[difficulty] : 0);
        }, 0);
        const phaseTimeCost = phaseHours * hourlyRate;
        const breakdown = phaseBreakdownPercentages[phaseNum] || [
          { item: "Development", percentage: 60 },
          { item: "Testing & QA", percentage: 20 },
          { item: "Project Management", percentage: 10 },
          { item: "Design", percentage: 10 }
        ];
          const breakdownCosts = breakdown.map(item => ({
            item: item.item,
            contribution: item.percentage,
            cost: Math.round((phaseHours * (item.percentage / 100)) * hourlyRate)
          }));
        const phaseTotalCost = breakdownCosts.reduce((sum, item) => sum + item.cost, 0);
        
        // Fix: Better phase naming logic
        const phaseLabel = phase.title && phase.title.trim() !== "" && phase.title.toLowerCase() !== `phase ${phaseNum}`
          ? `Phase ${phaseNum}: ${phase.title}` 
          : `Phase ${phaseNum}`;

        return {
          phase: phaseLabel,
          cost: phaseTotalCost,
          breakdown: breakdownCosts
        };
      });

      const syncKey = JSON.stringify(newPricing);
      if (syncKey !== lastSyncRef.current) {
        lastSyncRef.current = syncKey;
        onFieldChange("phase_pricing_table", newPricing);
        
        const total = newPricing.reduce((sum, p) => sum + p.cost, 0);
        onFieldChange("total_cost", total);
      }
    }
  }, [phases, features, featureDifficulties, featurePhases, difficultyHours, hourlyRate, phaseBreakdownPercentages, onFieldChange]);

  return (
    <Card className="border-2 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Effort-Based Pricing Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Assign difficulty and phase to each feature, then configure cost breakdown percentages per phase
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Hours for Easy</Label>
            <Select 
              value={String(difficultyHours.easy)} 
              onValueChange={(val) => onFieldChange("effort_hours_easy", Number(val))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8,10,12,16,20,24].map(h => (
                  <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Hours for Medium</Label>
            <Select 
              value={String(difficultyHours.medium)} 
              onValueChange={(val) => onFieldChange("effort_hours_medium", Number(val))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2,4,6,7,8,10,12,14,16,20,24,32].map(h => (
                  <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Hours for Complex</Label>
            <Select 
              value={String(difficultyHours.complex)} 
              onValueChange={(val) => onFieldChange("effort_hours_complex", Number(val))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4,6,8,10,12,16,20,24,32,40,48,56,64].map(h => (
                  <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Hourly Rate (₹)</Label>
            <Input 
              type="number" 
              value={hourlyRate} 
              onChange={(e) => onFieldChange("effort_hourly_rate", Number(e.target.value) || 100)} 
              className="h-9"
            />
          </div>
        </div>

        {features.length === 0 ? (
            <div className="p-6 border-2 border-dashed rounded-lg text-center bg-muted/50 dark:bg-slate-800/50">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No features added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Stage 3 (Features) to add features first</p>
            </div>
          ) : phases.length === 0 ? (
            <div className="p-6 border-2 border-dashed rounded-lg text-center bg-muted/50 dark:bg-slate-800/50">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No phases defined yet</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Stage 4 (Delivery) to define phases first</p>
            </div>
          ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-sm font-semibold">Feature Assignment ({features.length} features)</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100" onClick={() => setAllDifficulty('easy')}>
                    All Easy
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => setAllDifficulty('medium')}>
                    All Medium
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100" onClick={() => setAllDifficulty('complex')}>
                    All Complex
                  </Button>
                  <span className="border-l mx-1" />
                  {phases.map((phase, idx) => (
                    <Button 
                      key={idx}
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      onClick={() => setAllPhase(idx + 1)}
                    >
                      All P{idx + 1}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto border rounded-lg bg-background dark:bg-slate-900">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                    <TableRow>
                      <TableHead className="w-[80px]">App</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead className="w-[100px]">Phase</TableHead>
                      <TableHead className="w-[120px]">Difficulty</TableHead>
                      <TableHead className="w-[70px] text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature, i) => {
                      const difficulty = featureDifficulties[feature.name];
                      const phaseNum = featurePhases[feature.name];
                      const hours = difficulty ? difficultyHours[difficulty] : 0;
                      return (
                        <TableRow key={i} className={!difficulty || !phaseNum ? 'bg-amber-50/50' : ''}>
                          <TableCell className="py-2 text-xs">{feature.category}</TableCell>
                          <TableCell className="py-2 text-xs">{feature.subcategory}</TableCell>
                          <TableCell className="py-2 text-sm font-medium">{feature.name}</TableCell>
                          <TableCell className="py-2">
                            <Select 
                              value={phaseNum ? String(phaseNum) : ''} 
                              onValueChange={(val) => setFeaturePhase(feature.name, Number(val))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Phase" />
                              </SelectTrigger>
                              <SelectContent>
                                {phases.map((phase, idx) => (
                                  <SelectItem key={idx} value={String(idx + 1)}>
                                    P{idx + 1}: {phase.title || phase.name || `Phase ${idx + 1}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-2">
                            <Select 
                              value={difficulty || ''} 
                              onValueChange={(val) => setFeatureDifficulty(feature.name, val as 'easy' | 'medium' | 'complex')}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    Easy ({difficultyHours.easy}h)
                                  </span>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Medium ({difficultyHours.medium}h)
                                  </span>
                                </SelectItem>
                                <SelectItem value="complex">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    Complex ({difficultyHours.complex}h)
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm font-mono">
                            {hours > 0 ? `${hours}h` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{counts.easy}</div>
                <div className="text-xs text-green-600 dark:text-green-500">Easy ({counts.easy * difficultyHours.easy}h)</div>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.medium}</div>
                <div className="text-xs text-amber-600 dark:text-amber-500">Medium ({counts.medium * difficultyHours.medium}h)</div>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">{counts.complex}</div>
                <div className="text-xs text-red-600 dark:text-red-500">Complex ({counts.complex * difficultyHours.complex}h)</div>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{counts.unassigned}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Unassigned</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Phase-wise Cost Breakdown</Label>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 text-xs gap-1"
                  onClick={syncToPhaseBreakdown}
                >
                  <Sparkles className="h-3 w-3" /> Sync to Phase Pricing Below
                </Button>
              </div>
              
              {phases.map((phase, idx) => {
                const phaseNum = idx + 1;
                const phaseHours = calculatePhaseHours(phaseNum);
                const phaseTimeCost = calculatePhaseTimeCost(phaseNum);
                const breakdownCosts = calculatePhaseBreakdownCosts(phaseNum);
                const phaseTotalCost = calculatePhaseTotalCost(phaseNum);
                const featuresInPhase = features.filter(f => featurePhases[f.name] === phaseNum);
                const breakdown = getPhaseBreakdown(phaseNum);

                return (
                  <Card key={idx} className="border-l-4 border-l-violet-500 overflow-hidden dark:bg-slate-800/50">
                      <div className="p-4 bg-violet-50/50 dark:bg-violet-950/30 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-violet-700 dark:text-violet-400">
                          Phase {phaseNum}: {phase.title || phase.name || ''}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({featuresInPhase.length} features)
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Phase Total</div>
                        <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                          ₹{phaseTotalCost.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Total Hours</div>
                          <div className="text-lg font-bold">{phaseHours}h</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Hourly Rate</div>
                          <div className="text-lg font-bold">₹{hourlyRate}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Base Time Cost</div>
                          <div className="text-lg font-bold text-emerald-600">₹{phaseTimeCost.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cost Breakdown (% of Base Time Cost = ₹{phaseTimeCost.toLocaleString()})
                        </Label>
                        <div className="space-y-2">
                          {breakdown.map((item, itemIdx) => {
                            const cost = Math.round(phaseTimeCost * (item.percentage / 100));
                            return (
                              <div key={itemIdx} className="flex gap-2 items-center p-2 rounded-lg border bg-card">
                                <Input
                                  value={item.item}
                                  onChange={(e) => {
                                    const newBreakdown = [...breakdown];
                                    newBreakdown[itemIdx] = { ...newBreakdown[itemIdx], item: e.target.value };
                                    updatePhaseBreakdown(phaseNum, newBreakdown);
                                  }}
                                  placeholder="Item name"
                                  className="h-8 text-sm flex-1 font-medium"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <Input
                                    type="number"
                                    value={item.percentage}
                                    onChange={(e) => {
                                      const newBreakdown = [...breakdown];
                                      newBreakdown[itemIdx] = { ...newBreakdown[itemIdx], percentage: Number(e.target.value) || 0 };
                                      updatePhaseBreakdown(phaseNum, newBreakdown);
                                    }}
                                    className="h-8 text-sm w-16 text-center font-semibold"
                                  />
                                  <span className="text-xs text-muted-foreground font-medium">%</span>
                                </div>
                                <div className="text-right shrink-0 w-24">
                                  <span className="text-sm font-bold text-primary">₹{cost.toLocaleString()}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => {
                                    const newBreakdown = breakdown.filter((_, i) => i !== itemIdx);
                                    updatePhaseBreakdown(phaseNum, newBreakdown);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 border-dashed w-full"
                          onClick={() => {
                            const newBreakdown = [...breakdown, { item: "Other", percentage: 0 }];
                            updatePhaseBreakdown(phaseNum, newBreakdown);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Cost Item
                        </Button>
                      </div>

                      <div className="p-3 bg-violet-100/50 dark:bg-violet-900/30 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Sum of Breakdown ({breakdown.reduce((sum, b) => sum + b.percentage, 0)}%)
                        </span>
                        <span className="text-lg font-bold text-violet-700 dark:text-violet-300">
                          ₹{phaseTotalCost.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

              <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950/50 dark:to-teal-950/50 rounded-xl border border-emerald-200 dark:border-emerald-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Hours</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{totalHours}h</div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Base Cost (All Phases)</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">₹{grandTotal.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">GST ({Number(data.tax_percent) || 18}%)</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{Math.round(grandTotal * ((Number(data.tax_percent) || 18) / 100)).toLocaleString()}</div>
                  </div>
                  <div className="bg-emerald-200/50 dark:bg-emerald-800/30 rounded-lg p-2 -m-2">
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Grand Total (incl. GST)</div>
                    <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">₹{Math.round(grandTotal * (1 + (Number(data.tax_percent) || 18) / 100)).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

const DELIVERABLE_CATEGORIES = {
  "Solution Architecture": {
    suggestions: [
      "Architecture diagrams",
      "Data models",
      "Integration specifications",
      "Interface standards",
      "Dependency documentation",
      "Failure domain mapping",
      "SLA specifications",
      "Security review documentation"
    ],
    defaultDescription: "A complete set of architecture diagrams, data models, and integration specifications defines how all components interact, what data flows look like, and the standards for interfaces."
  },
  "Code": {
    suggestions: [
      "Production-grade code for Mobile (iOS/Android)",
      "Supplier Web application",
      "Admin Web dashboard",
      "API implementations",
      "Modular patterns with tests",
      "CI/CD pipeline configuration",
      "Reusable component library",
      "API contracts documentation"
    ],
    defaultDescription: "Production-grade code for the Mobile (iOS/Android) app, Supplier Web, Admin Web, and APIs implements the agreed capabilities with modular patterns, tests, and CI/CD readiness."
  },
  "Test Results": {
    suggestions: [
      "Unit test reports",
      "Integration test reports",
      "E2E/UAT sign-offs",
      "Performance test results",
      "Security scan reports",
      "Regression test suite",
      "Quality gate documentation",
      "Compliance reports"
    ],
    defaultDescription: "Evidence packs including unit and integration reports plus E2E/UAT sign-offs demonstrate correctness, reliability, and user acceptance."
  },
  "Design": {
    suggestions: [
      "Figma files",
      "Component library",
      "Design tokens",
      "Style guide",
      "Accessibility documentation",
      "Localization assets",
      "Dark mode support",
      "Brand guidelines"
    ],
    defaultDescription: "Deliverables include Figma files, a component library, and design tokens that standardize UI/UX across platforms."
  },
  "Documentation": {
    suggestions: [
      "Technical documentation",
      "API documentation",
      "User guides",
      "Deployment runbooks",
      "Operational procedures",
      "Training materials",
      "Release notes",
      "Knowledge transfer docs"
    ],
    defaultDescription: "Comprehensive documentation covering technical specifications, API references, user guides, and operational procedures."
  },
  "Infrastructure": {
    suggestions: [
      "Cloud infrastructure setup",
      "CI/CD pipelines",
      "Monitoring dashboards",
      "Logging configuration",
      "Backup procedures",
      "Disaster recovery plan",
      "Environment configurations",
      "Security configurations"
    ],
    defaultDescription: "Infrastructure deliverables include cloud setup, CI/CD pipelines, monitoring, and operational tooling for production readiness."
  }
};

function DeliverablesCategorySection({ data, onFieldChange }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySuggestions, setNewCategorySuggestions] = useState("");
  const [customCategories, setCustomCategories] = useState<Record<string, { suggestions: string[]; defaultDescription: string }>>({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  useEffect(() => {
    loadCustomCategories();
  }, []);
  
  const loadCustomCategories = async () => {
    try {
      const res = await fetch("/api/deliverable-categories");
      if (res.ok) {
        const cats = await res.json();
        const customCats: Record<string, { suggestions: string[]; defaultDescription: string }> = {};
        cats.forEach((cat: any) => {
          customCats[cat.name] = {
            suggestions: cat.suggestions || [],
            defaultDescription: cat.default_description || ""
          };
        });
        setCustomCategories(customCats);
      }
    } catch (e) {
      console.error("Failed to load custom categories", e);
    } finally {
      setLoadingCategories(false);
    }
  };
  
  const saveCustomCategory = async () => {
    if (!newCategoryName.trim()) return;
    const suggestions = newCategorySuggestions.split(",").map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/deliverable-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          suggestions,
          default_description: `${newCategoryName} deliverables include: ${suggestions.join(", ")}.`
        })
      });
      if (res.ok) {
        setCustomCategories(prev => ({
          ...prev,
          [newCategoryName.trim()]: {
            suggestions,
            defaultDescription: `${newCategoryName} deliverables include: ${suggestions.join(", ")}.`
          }
        }));
        setNewCategoryName("");
        setNewCategorySuggestions("");
        setShowAddCategory(false);
      }
    } catch (e) {
      console.error("Failed to save custom category", e);
    }
  };
  
  const allCategories = { ...DELIVERABLE_CATEGORIES, ...customCategories };
  
  const deliverables = (data.deliverables_detailed || []) as { type: string; description: string }[];
  
  const addDeliverable = (type: string, description: string) => {
    const newDeliverables = [...deliverables, { type, description }];
    onFieldChange("deliverables_detailed", newDeliverables);
  };
  
  const removeDeliverable = (index: number) => {
    const newDeliverables = deliverables.filter((_, i) => i !== index);
    onFieldChange("deliverables_detailed", newDeliverables);
  };
  
  const toggleSuggestion = (category: string, suggestion: string, isChecked: boolean) => {
    if (isChecked) {
      addDeliverable(category, suggestion);
    } else {
      const idx = deliverables.findIndex(d => d.type === category && d.description === suggestion);
      if (idx !== -1) removeDeliverable(idx);
    }
  };
  
  const isSuggestionSelected = (category: string, suggestion: string) => {
    return deliverables.some(d => d.type === category && d.description === suggestion);
  };
  
  const addAllFromCategory = (category: string) => {
    const suggestions = allCategories[category]?.suggestions || [];
    const newItems = suggestions
      .filter(s => !isSuggestionSelected(category, s))
      .map(s => ({ type: category, description: s }));
    onFieldChange("deliverables_detailed", [...deliverables, ...newItems]);
  };
  
  const uniqueTypes = [...new Set(deliverables.map(d => d.type))];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Deliverable Category</Label>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddCategory(!showAddCategory)}>
            <Plus className="h-3 w-3" /> Add Custom Category
          </Button>
        </div>
        
        {showAddCategory && (
          <Card className="border-dashed border-2 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Security, Training"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggestions (comma-separated)</Label>
              <Textarea
                value={newCategorySuggestions}
                onChange={(e) => setNewCategorySuggestions(e.target.value)}
                placeholder="e.g., Penetration testing reports, Security audit, Vulnerability assessment"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={saveCustomCategory} disabled={!newCategoryName.trim()}>
                Save Category
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2">
          {loadingCategories ? (
            <span className="text-xs text-muted-foreground">Loading categories...</span>
          ) : (
            Object.keys(allCategories).map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className="text-xs"
              >
                {cat}
              </Button>
            ))
          )}
        </div>
      </div>
      
      {selectedCategory && allCategories[selectedCategory] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedCategory} Suggestions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addAllFromCategory(selectedCategory)}>
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allCategories[selectedCategory]?.defaultDescription}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allCategories[selectedCategory]?.suggestions.map(suggestion => (
                <div key={suggestion} className="flex items-center space-x-2 p-2 border rounded hover:bg-white/50">
                  <Checkbox
                    id={`${selectedCategory}-${suggestion}`}
                    checked={isSuggestionSelected(selectedCategory, suggestion)}
                    onCheckedChange={(checked) => toggleSuggestion(selectedCategory, suggestion, !!checked)}
                  />
                  <label htmlFor={`${selectedCategory}-${suggestion}`} className="text-xs cursor-pointer flex-1">
                    {suggestion}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Add custom description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!customDescription.trim()}
                onClick={() => {
                  addDeliverable(selectedCategory, customDescription.trim());
                  setCustomDescription("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label>Current Deliverables ({deliverables.length} items)</Label>
        {deliverables.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No deliverables added yet. Select a category above to add items.
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTypes.map(category => {
              const categoryItems = deliverables.filter(d => d.type === category);
              if (categoryItems.length === 0) return null;
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <ul className="space-y-1">
                      {categoryItems.map((item, idx) => {
                        const globalIdx = deliverables.findIndex(d => d === item);
                        return (
                          <li key={idx} className="flex items-start justify-between text-sm group">
                            <span className="flex-1">{item.description}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeDeliverable(globalIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ASSUMPTION_CATEGORIES = {
  "Platforms": {
    suggestions: [
      "User on iOS/Android",
      "Supplier on mobile + web",
      "Admin web-only to optimize UX",
      "Independent release cadences",
      "Security hardening per platform",
      "Platform-specific optimizations"
    ],
    defaultDescription: "User on iOS/Android, Supplier on mobile + web, Admin web-only to optimize UX, security, and independent release cadences."
  },
  "Auth": {
    suggestions: [
      "OTP and SSO for low-friction user entry",
      "Supplier OTP+mPIN for secure recurring access",
      "Admin email+MFA to harden privileged operations",
      "Session management and token refresh",
      "Role-based access control",
      "Password policies and recovery flows"
    ],
    defaultDescription: "OTP and SSO for low-friction user entry; Supplier OTP+mPIN for secure recurring access; Admin email+MFA to harden privileged operations."
  },
  "Integrations": {
    suggestions: [
      "KYC provider integration",
      "WhatsApp/messaging integration",
      "Firebase for notifications",
      "Google Maps integration",
      "Google/iCal calendar sync",
      "Payment gateway selection",
      "Stable API contracts for vendor swaps",
      "Third-party API versioning support"
    ],
    defaultDescription: "KYC, WhatsApp, Firebase, Google Maps, Google/iCal, and payment gateway selection, all behind stable API contracts to allow vendor swaps later."
  },
  "Booking Types": {
    suggestions: [
      "Support ~11 types with initial focus on 5 high-impact flows",
      "Modular design to add new types without major rework",
      "Flexible booking configuration",
      "Custom booking rules engine",
      "Multi-slot booking support",
      "Cancellation and rescheduling policies"
    ],
    defaultDescription: "Support ~11 types with an initial focus on 5 high-impact flows, using a modular design to add new types without major rework."
  },
  "Languages": {
    suggestions: [
      "Start with English",
      "Add two regional languages later",
      "i18n-ready design tokens",
      "RTL support preparation",
      "Content translation processes",
      "Locale-specific formatting"
    ],
    defaultDescription: "Start with English, add two regional languages later with i18n-ready design tokens and content processes."
  },
  "Data & AI": {
    suggestions: [
      "Begin with tags/rules for reliable baselines",
      "Expand to AI search capabilities",
      "Itinerary generation once data quality matures",
      "Feedback loops for model improvement",
      "Data quality monitoring",
      "ML model versioning"
    ],
    defaultDescription: "Begin with tags/rules for reliable baselines, then expand to AI search and itinerary generation once data quality and signals mature."
  },
  "Architecture Baseline": {
    suggestions: [
      "Modern, componentized stack",
      "Mobile, web, APIs with clear boundaries",
      "Reduce coupling between services",
      "Speed future feature delivery",
      "Microservices or modular monolith",
      "Event-driven architecture support"
    ],
    defaultDescription: "A modern, componentized stack (mobile, web, APIs) with clear boundaries to reduce coupling and speed future feature delivery."
  },
  "Performance & Scale": {
    suggestions: [
      "Target fast user interactions (<200–300ms)",
      "Horizontal scalability on web/API tiers",
      "Efficient mobile caching",
      "Low-latency experiences",
      "CDN and edge caching",
      "Database query optimization"
    ],
    defaultDescription: "Target fast user interactions (<200–300ms on key actions), horizontal scalability on web/API tiers, and efficient mobile caching for low-latency experiences."
  },
  "Security & Compliance": {
    suggestions: [
      "Role-based access",
      "Encryption in transit/at rest",
      "Audit logs",
      "Vendor KYC alignment",
      "Standard compliance expectations",
      "Data privacy controls",
      "Security incident response plan"
    ],
    defaultDescription: "Role-based access, encryption in transit/at rest, audit logs, and vendor KYC to align with standard compliance expectations."
  }
};

function AssumptionsCategorySection({ data, onFieldChange }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySuggestions, setNewCategorySuggestions] = useState("");
  const [customCategories, setCustomCategories] = useState<Record<string, { suggestions: string[]; defaultDescription: string }>>({});
  
  const allCategories = { ...ASSUMPTION_CATEGORIES, ...customCategories };
  
  const assumptions = (data.assumptions_detailed || []) as { type: string; description: string }[];
  
  const addAssumption = (type: string, description: string) => {
    const newAssumptions = [...assumptions, { type, description }];
    onFieldChange("assumptions_detailed", newAssumptions);
  };
  
  const removeAssumption = (index: number) => {
    const newAssumptions = assumptions.filter((_, i) => i !== index);
    onFieldChange("assumptions_detailed", newAssumptions);
  };
  
  const toggleSuggestion = (category: string, suggestion: string, isChecked: boolean) => {
    if (isChecked) {
      addAssumption(category, suggestion);
    } else {
      const idx = assumptions.findIndex(d => d.type === category && d.description === suggestion);
      if (idx !== -1) removeAssumption(idx);
    }
  };
  
  const isSuggestionSelected = (category: string, suggestion: string) => {
    return assumptions.some(d => d.type === category && d.description === suggestion);
  };
  
  const addAllFromCategory = (category: string) => {
    const suggestions = allCategories[category]?.suggestions || [];
    const newItems = suggestions
      .filter(s => !isSuggestionSelected(category, s))
      .map(s => ({ type: category, description: s }));
    onFieldChange("assumptions_detailed", [...assumptions, ...newItems]);
  };
  
  const uniqueTypes = [...new Set(assumptions.map(d => d.type))];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Assumption Category</Label>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddCategory(!showAddCategory)}>
            <Plus className="h-3 w-3" /> Add Custom Category
          </Button>
        </div>
        
        {showAddCategory && (
          <Card className="border-dashed border-2 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Compliance, Testing"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggestions (comma-separated)</Label>
              <Textarea
                value={newCategorySuggestions}
                onChange={(e) => setNewCategorySuggestions(e.target.value)}
                placeholder="e.g., GDPR compliance required, SOC2 certification"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => {
                if (!newCategoryName.trim()) return;
                const suggestions = newCategorySuggestions.split(",").map(s => s.trim()).filter(Boolean);
                setCustomCategories(prev => ({
                  ...prev,
                  [newCategoryName.trim()]: {
                    suggestions,
                    defaultDescription: `${newCategoryName} assumptions include: ${suggestions.join(", ")}.`
                  }
                }));
                setNewCategoryName("");
                setNewCategorySuggestions("");
                setShowAddCategory(false);
              }} disabled={!newCategoryName.trim()}>
                Save Category
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(allCategories).map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
      
      {selectedCategory && allCategories[selectedCategory] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedCategory} Suggestions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addAllFromCategory(selectedCategory)}>
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allCategories[selectedCategory]?.defaultDescription}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allCategories[selectedCategory]?.suggestions.map(suggestion => (
                <div key={suggestion} className="flex items-center space-x-2 p-2 border rounded hover:bg-white/50">
                  <Checkbox
                    id={`assumption-${selectedCategory}-${suggestion}`}
                    checked={isSuggestionSelected(selectedCategory, suggestion)}
                    onCheckedChange={(checked) => toggleSuggestion(selectedCategory, suggestion, !!checked)}
                  />
                  <label htmlFor={`assumption-${selectedCategory}-${suggestion}`} className="text-xs cursor-pointer flex-1">
                    {suggestion}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Add custom assumption description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!customDescription.trim()}
                onClick={() => {
                  addAssumption(selectedCategory, customDescription.trim());
                  setCustomDescription("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label>Current Assumptions ({assumptions.length} items)</Label>
        {assumptions.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No assumptions added yet. Select a category above to add items.
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTypes.map(category => {
              const categoryItems = assumptions.filter(d => d.type === category);
              if (categoryItems.length === 0) return null;
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <ul className="space-y-1">
                      {categoryItems.map((item, idx) => {
                        const globalIdx = assumptions.findIndex(d => d === item);
                        return (
                          <li key={idx} className="flex items-start justify-between text-sm group">
                            <span className="flex-1">{item.description}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeAssumption(globalIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const DEPENDENCY_CATEGORIES = {
  "Client Resources": {
    suggestions: [
      "Brand assets within 1 week of kickoff",
      "Content and copy finalized before design phase",
      "Subject matter experts available for requirements",
      "Timely feedback and approvals (within 2 business days)",
      "Test data provision for staging environments",
      "Business rules documentation"
    ],
    defaultDescription: "Client to provide brand assets, content, SME availability, timely feedback, and test data as needed."
  },
  "Third-party APIs": {
    suggestions: [
      "Payment gateway API access and credentials",
      "SMS/messaging provider credentials",
      "Maps API keys and quotas",
      "KYC verification service access",
      "Email service provider setup",
      "Cloud storage credentials"
    ],
    defaultDescription: "Access to payment gateway, SMS, maps, KYC, email, and cloud storage APIs with appropriate credentials and quotas."
  },
  "Infrastructure": {
    suggestions: [
      "Cloud infrastructure setup and access",
      "Domain and SSL certificates",
      "CI/CD pipeline access",
      "Staging and production environments",
      "Database provisioning",
      "CDN configuration"
    ],
    defaultDescription: "Cloud infrastructure, domains, SSL certificates, CI/CD access, and environment provisioning."
  },
  "Compliance & Legal": {
    suggestions: [
      "Privacy policy and terms approved",
      "Data processing agreements signed",
      "Regulatory compliance clearances",
      "Security audit requirements defined",
      "GDPR/CCPA compliance confirmation",
      "Legal review of contracts"
    ],
    defaultDescription: "Privacy policy, data processing agreements, regulatory clearances, and compliance requirements confirmed."
  },
  "Team & Access": {
    suggestions: [
      "Development team onboarded",
      "Access to client systems/tools",
      "VPN/network access if required",
      "Communication channels set up",
      "Project management tool access",
      "Code repository access"
    ],
    defaultDescription: "Team onboarding, system access, VPN setup, communication channels, and repository access."
  },
  "Design & UX": {
    suggestions: [
      "Brand guidelines provided",
      "Design system approval",
      "User research data shared",
      "Wireframe sign-off process",
      "Accessibility requirements defined",
      "Localization requirements confirmed"
    ],
    defaultDescription: "Brand guidelines, design system, user research data, and accessibility requirements provided."
  }
};

function DependenciesCategorySection({ data, onFieldChange }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySuggestions, setNewCategorySuggestions] = useState("");
  const [customCategories, setCustomCategories] = useState<Record<string, { suggestions: string[]; defaultDescription: string }>>({});
  
  const allCategories = { ...DEPENDENCY_CATEGORIES, ...customCategories };
  
  const dependencies = (data.dependencies_detailed || []) as { type: string; description: string }[];
  
  const addDependency = (type: string, description: string) => {
    const newDependencies = [...dependencies, { type, description }];
    onFieldChange("dependencies_detailed", newDependencies);
  };
  
  const removeDependency = (index: number) => {
    const newDependencies = dependencies.filter((_, i) => i !== index);
    onFieldChange("dependencies_detailed", newDependencies);
  };
  
  const toggleSuggestion = (category: string, suggestion: string, isChecked: boolean) => {
    if (isChecked) {
      addDependency(category, suggestion);
    } else {
      const idx = dependencies.findIndex(d => d.type === category && d.description === suggestion);
      if (idx !== -1) removeDependency(idx);
    }
  };
  
  const isSuggestionSelected = (category: string, suggestion: string) => {
    return dependencies.some(d => d.type === category && d.description === suggestion);
  };
  
  const addAllFromCategory = (category: string) => {
    const suggestions = allCategories[category]?.suggestions || [];
    const newItems = suggestions
      .filter(s => !isSuggestionSelected(category, s))
      .map(s => ({ type: category, description: s }));
    onFieldChange("dependencies_detailed", [...dependencies, ...newItems]);
  };
  
  const uniqueTypes = [...new Set(dependencies.map(d => d.type))];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Dependency Category</Label>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddCategory(!showAddCategory)}>
            <Plus className="h-3 w-3" /> Add Custom Category
          </Button>
        </div>
        
        {showAddCategory && (
          <Card className="border-dashed border-2 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Hardware, Vendors"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggestions (comma-separated)</Label>
              <Textarea
                value={newCategorySuggestions}
                onChange={(e) => setNewCategorySuggestions(e.target.value)}
                placeholder="e.g., Server hardware procurement, Vendor contract finalized"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => {
                if (!newCategoryName.trim()) return;
                const suggestions = newCategorySuggestions.split(",").map(s => s.trim()).filter(Boolean);
                setCustomCategories(prev => ({
                  ...prev,
                  [newCategoryName.trim()]: {
                    suggestions,
                    defaultDescription: `${newCategoryName} dependencies include: ${suggestions.join(", ")}.`
                  }
                }));
                setNewCategoryName("");
                setNewCategorySuggestions("");
                setShowAddCategory(false);
              }} disabled={!newCategoryName.trim()}>
                Save Category
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(allCategories).map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
      
      {selectedCategory && allCategories[selectedCategory] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedCategory} Suggestions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addAllFromCategory(selectedCategory)}>
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allCategories[selectedCategory]?.defaultDescription}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allCategories[selectedCategory]?.suggestions.map(suggestion => (
                <div key={suggestion} className="flex items-center space-x-2 p-2 border rounded hover:bg-white/50">
                  <Checkbox
                    id={`dependency-${selectedCategory}-${suggestion}`}
                    checked={isSuggestionSelected(selectedCategory, suggestion)}
                    onCheckedChange={(checked) => toggleSuggestion(selectedCategory, suggestion, !!checked)}
                  />
                  <label htmlFor={`dependency-${selectedCategory}-${suggestion}`} className="text-xs cursor-pointer flex-1">
                    {suggestion}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Add custom dependency description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!customDescription.trim()}
                onClick={() => {
                  addDependency(selectedCategory, customDescription.trim());
                  setCustomDescription("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label>Current Dependencies ({dependencies.length} items)</Label>
        {dependencies.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No dependencies added yet. Select a category above to add items.
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTypes.map(category => {
              const categoryItems = dependencies.filter(d => d.type === category);
              if (categoryItems.length === 0) return null;
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <ul className="space-y-1">
                      {categoryItems.map((item, idx) => {
                        const globalIdx = dependencies.findIndex(d => d === item);
                        return (
                          <li key={idx} className="flex items-start justify-between text-sm group">
                            <span className="flex-1">{item.description}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeDependency(globalIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_PROCESS_KEY_OPTIONS = [
  "Change Request (CR)",
  "Impact Assessment",
  "Approval",
  "Versioning",
  "Cut-off Windows",
  "Communication",
  "Documentation",
  "Review Process",
  "Escalation Path"
];

const DEFAULT_CLASSIFICATION_KEY_OPTIONS = [
  "Minor Change",
  "Standard Change",
  "Major Change",
  "Emergency Change",
  "Critical Change"
];

function ChangeManagementSection({ data, onFieldChange, onGenerateChangeManagement }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void; onGenerateChangeManagement?: (context: string) => Promise<void> }) {
  const [processSelectedKey, setProcessSelectedKey] = useState("");
  const [processCustomValue, setProcessCustomValue] = useState("");
  const [classificationSelectedKey, setClassificationSelectedKey] = useState("");
  const [classificationCustomValue, setClassificationCustomValue] = useState("");
  const [constraintValue, setConstraintValue] = useState("");
  
  const [showAddProcessTag, setShowAddProcessTag] = useState(false);
  const [showAddClassificationTag, setShowAddClassificationTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);

  const processItems = (data.change_process_items || []) as { key: string; value: string }[];
  const classificationItems = (data.change_classification_items || []) as { key: string; value: string }[];
  const constraintItems = (data.change_constraint_items || []) as string[];
  
  const customProcessTags = (data.custom_change_process_tags || []) as string[];
  const customClassificationTags = (data.custom_change_classification_tags || []) as string[];
  
  const allProcessOptions = [...DEFAULT_PROCESS_KEY_OPTIONS, ...customProcessTags];
  const allClassificationOptions = [...DEFAULT_CLASSIFICATION_KEY_OPTIONS, ...customClassificationTags];

  const processSectionName = (data.change_process_name as string) || "Process";
  const classificationSectionName = (data.change_classification_name as string) || "Classification";
  const constraintSectionName = (data.change_constraint_name as string) || "Constraints";
  
  const addCustomProcessTag = () => {
    if (!newTagName.trim() || allProcessOptions.includes(newTagName.trim())) return;
    onFieldChange("custom_change_process_tags", [...customProcessTags, newTagName.trim()]);
    setProcessSelectedKey(newTagName.trim());
    setNewTagName("");
    setShowAddProcessTag(false);
  };
  
  const addCustomClassificationTag = () => {
    if (!newTagName.trim() || allClassificationOptions.includes(newTagName.trim())) return;
    onFieldChange("custom_change_classification_tags", [...customClassificationTags, newTagName.trim()]);
    setClassificationSelectedKey(newTagName.trim());
    setNewTagName("");
    setShowAddClassificationTag(false);
  };

  const addProcessItem = (key: string, value: string) => {
    if (!key.trim() || !value.trim()) return;
    onFieldChange("change_process_items", [...processItems, { key: key.trim(), value: value.trim() }]);
  };

  const removeProcessItem = (index: number) => {
    onFieldChange("change_process_items", processItems.filter((_, i) => i !== index));
  };

  const updateProcessItem = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...processItems];
    updated[index] = { ...updated[index], [field]: newValue };
    onFieldChange("change_process_items", updated);
  };

  const addClassificationItem = (key: string, value: string) => {
    if (!key.trim() || !value.trim()) return;
    onFieldChange("change_classification_items", [...classificationItems, { key: key.trim(), value: value.trim() }]);
  };

  const removeClassificationItem = (index: number) => {
    onFieldChange("change_classification_items", classificationItems.filter((_, i) => i !== index));
  };

  const updateClassificationItem = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...classificationItems];
    updated[index] = { ...updated[index], [field]: newValue };
    onFieldChange("change_classification_items", updated);
  };

  const addConstraintItem = (value: string) => {
    if (!value.trim()) return;
    onFieldChange("change_constraint_items", [...constraintItems, value.trim()]);
  };

  const removeConstraintItem = (index: number) => {
    onFieldChange("change_constraint_items", constraintItems.filter((_, i) => i !== index));
  };

  const updateConstraintItem = (index: number, newValue: string) => {
    const updated = [...constraintItems];
    updated[index] = newValue;
    onFieldChange("change_constraint_items", updated);
  };

  const handleGenerateAI = async () => {
    if (!onGenerateChangeManagement) return;
    setIsGenerating(true);
    await onGenerateChangeManagement(aiContext || "Generate standard change management process");
    setIsGenerating(false);
    setShowAiInput(false);
    setAiContext("");
  };

  return (
    <div className="space-y-8">
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Generation / Refinement
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAiInput(!showAiInput)}
          >
            <Sparkles className="h-3 w-3" /> Generate with AI
          </Button>
        </div>
        
        {showAiInput && (
          <div className="flex gap-2 animate-in slide-in-from-top-2">
            <Input
              placeholder="Describe your change management needs (optional)..."
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setShowAiInput(false);
                setAiContext("");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Process Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={processSectionName}
              onChange={(e) => onFieldChange("change_process_name", e.target.value)}
              className="h-8 w-40 text-base font-semibold border-dashed"
              placeholder="Section name..."
            />
            <span className="text-xs text-muted-foreground">(editable)</span>
          </div>
          <Badge variant="secondary">{processItems.length} items</Badge>
        </div>
        
        <div className="space-y-3">
          {processItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start group">
              <div className="w-1/3">
                <Select value={item.key} onValueChange={(val) => updateProcessItem(idx, "key", val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allProcessOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  value={item.value}
                  onChange={(e) => updateProcessItem(idx, "value", e.target.value)}
                  placeholder="Description..."
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeProcessItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          {showAddProcessTag ? (
            <div className="flex gap-2 items-center">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="h-9 flex-1"
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={addCustomProcessTag} disabled={!newTagName.trim()}>
                Save Tag
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setShowAddProcessTag(false); setNewTagName(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={processSelectedKey} onValueChange={setProcessSelectedKey}>
                <SelectTrigger className="h-9 w-1/3">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {allProcessOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowAddProcessTag(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Tag
              </Button>
              <Input
                value={processCustomValue}
                onChange={(e) => setProcessCustomValue(e.target.value)}
                placeholder="Description..."
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!processSelectedKey || !processCustomValue.trim()}
                onClick={() => {
                  addProcessItem(processSelectedKey, processCustomValue);
                  setProcessSelectedKey("");
                  setProcessCustomValue("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Classification Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={classificationSectionName}
              onChange={(e) => onFieldChange("change_classification_name", e.target.value)}
              className="h-8 w-44 text-base font-semibold border-dashed"
              placeholder="Section name..."
            />
            <span className="text-xs text-muted-foreground">(editable)</span>
          </div>
          <Badge variant="secondary">{classificationItems.length} items</Badge>
        </div>
        
        <div className="space-y-3">
          {classificationItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start group">
              <div className="w-1/3">
                <Select value={item.key} onValueChange={(val) => updateClassificationItem(idx, "key", val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allClassificationOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  value={item.value}
                  onChange={(e) => updateClassificationItem(idx, "value", e.target.value)}
                  placeholder="Description..."
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeClassificationItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          {showAddClassificationTag ? (
            <div className="flex gap-2 items-center">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="h-9 flex-1"
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={addCustomClassificationTag} disabled={!newTagName.trim()}>
                Save Tag
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setShowAddClassificationTag(false); setNewTagName(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={classificationSelectedKey} onValueChange={setClassificationSelectedKey}>
                <SelectTrigger className="h-9 w-1/3">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {allClassificationOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowAddClassificationTag(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Tag
              </Button>
              <Input
                value={classificationCustomValue}
                onChange={(e) => setClassificationCustomValue(e.target.value)}
                placeholder="Description..."
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!classificationSelectedKey || !classificationCustomValue.trim()}
                onClick={() => {
                  addClassificationItem(classificationSelectedKey, classificationCustomValue);
                  setClassificationSelectedKey("");
                  setClassificationCustomValue("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Constraints Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={constraintSectionName}
              onChange={(e) => onFieldChange("change_constraint_name", e.target.value)}
              className="h-8 w-40 text-base font-semibold border-dashed"
              placeholder="Section name..."
            />
            <span className="text-xs text-muted-foreground">(editable)</span>
          </div>
          <Badge variant="secondary">{constraintItems.length} items</Badge>
        </div>
        
        <div className="space-y-3">
          {constraintItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center group">
              <div className="flex-1">
                <Input
                  value={item}
                  onChange={(e) => updateConstraintItem(idx, e.target.value)}
                  placeholder="Constraint description..."
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeConstraintItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
          <Input
            value={constraintValue}
            onChange={(e) => setConstraintValue(e.target.value)}
            placeholder="Add a constraint..."
            className="h-9 flex-1"
          />
          <Button
            size="sm"
            className="h-9"
            disabled={!constraintValue.trim()}
            onClick={() => {
              addConstraintItem(constraintValue);
              setConstraintValue("");
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

const TASK_CATEGORIES = {
  "Technology Exploration & Selection": {
    suggestions: [
      "Identify and validate auth solutions",
      "Evaluate KYC providers",
      "Assess messaging platforms",
      "Review maps integration options",
      "Evaluate calendar/scheduling tools",
      "Research AI/ML tools",
      "Compare payments providers"
    ],
    defaultDescription: "Identify and validate auth, KYC, messaging, maps, calendar, AI, and payments tools."
  },
  "Solution Design — High Level": {
    suggestions: [
      "Define architecture",
      "Create core data models",
      "Plan integration strategy",
      "Design system boundaries",
      "Define API contracts",
      "Plan scalability approach"
    ],
    defaultDescription: "Define architecture, core data models, and integration strategy."
  },
  "Solution Design — Low Level": {
    suggestions: [
      "Specify APIs",
      "Design user flows",
      "Define component contracts",
      "Create sequence diagrams",
      "Design database schemas",
      "Plan error handling"
    ],
    defaultDescription: "Specify APIs, user flows, and component contracts for implementation."
  },
  "UX/UI Design": {
    suggestions: [
      "Produce wireframes",
      "Create high-fidelity screens",
      "Build consistent design system",
      "Design responsive layouts",
      "Create interactive prototypes",
      "Define design tokens"
    ],
    defaultDescription: "Produce wireframes, high-fidelity screens, and a consistent design system."
  },
  "Development — Mobile": {
    suggestions: [
      "Build iOS/Android app",
      "Iterate across planned phases",
      "Implement offline capabilities",
      "Integrate push notifications",
      "Optimize performance",
      "Handle device-specific features"
    ],
    defaultDescription: "Build and iterate the iOS/Android app across planned phases."
  },
  "Development — Web": {
    suggestions: [
      "Build supplier web application",
      "Build admin web applications",
      "Align releases with mobile",
      "Implement responsive design",
      "Optimize for performance",
      "Handle cross-browser compatibility"
    ],
    defaultDescription: "Build supplier and admin web applications with aligned releases."
  },
  "Testing": {
    suggestions: [
      "Run unit tests",
      "Run integration tests",
      "Conduct E2E testing",
      "Perform UAT",
      "Execute performance tests",
      "Conduct security testing"
    ],
    defaultDescription: "Run unit, integration, E2E, and UAT to ensure quality and reliability."
  },
  "Documentation": {
    suggestions: [
      "Maintain API docs",
      "Create runbooks",
      "Write admin guides",
      "Conduct periodic reviews",
      "Document architecture decisions",
      "Create user manuals"
    ],
    defaultDescription: "Maintain API docs, runbooks, and admin guides with periodic reviews."
  },
  "AI Practices & Data": {
    suggestions: [
      "Develop tagging models",
      "Build itinerary generation",
      "Create weather pipelines",
      "Implement feedback loops",
      "Train ML models",
      "Set up data pipelines"
    ],
    defaultDescription: "Develop tagging models, itinerary generation, weather pipelines, and feedback loops."
  },
  "Deployment & Release": {
    suggestions: [
      "Ship to app stores",
      "Deploy web applications",
      "Set up CI/CD pipelines",
      "Implement feature flags",
      "Plan controlled rollouts",
      "Configure environments"
    ],
    defaultDescription: "Ship to stores and web with CI/CD, feature flags, and controlled rollouts."
  },
  "Project Management": {
    suggestions: [
      "Manage backlog",
      "Run sprints",
      "Conduct demos",
      "Facilitate retros",
      "Track progress",
      "Coordinate stakeholders"
    ],
    defaultDescription: "Manage backlog, sprints, demos, and retros for steady delivery."
  }
};

function TasksCategorySection({ data, onFieldChange }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySuggestions, setNewCategorySuggestions] = useState("");
  const [customCategories, setCustomCategories] = useState<Record<string, { suggestions: string[]; defaultDescription: string }>>({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  useEffect(() => {
    loadCustomCategories();
  }, []);
  
  const loadCustomCategories = async () => {
    try {
      const res = await fetch("/api/task-categories");
      if (res.ok) {
        const cats = await res.json();
        const customCats: Record<string, { suggestions: string[]; defaultDescription: string }> = {};
        cats.forEach((cat: any) => {
          customCats[cat.name] = {
            suggestions: cat.suggestions || [],
            defaultDescription: cat.default_description || ""
          };
        });
        setCustomCategories(customCats);
      }
    } catch (e) {
      console.error("Failed to load custom task categories", e);
    } finally {
      setLoadingCategories(false);
    }
  };
  
  const saveCustomCategory = async () => {
    if (!newCategoryName.trim()) return;
    const suggestions = newCategorySuggestions.split(",").map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/task-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          suggestions,
          default_description: `${newCategoryName} tasks include: ${suggestions.join(", ")}.`
        })
      });
      if (res.ok) {
        setCustomCategories(prev => ({
          ...prev,
          [newCategoryName.trim()]: {
            suggestions,
            defaultDescription: `${newCategoryName} tasks include: ${suggestions.join(", ")}.`
          }
        }));
        setNewCategoryName("");
        setNewCategorySuggestions("");
        setShowAddCategory(false);
      }
    } catch (e) {
      console.error("Failed to save custom task category", e);
    }
  };
  
  const allCategories = { ...TASK_CATEGORIES, ...customCategories };
  
  const tasks = (data.tasks_detailed || []) as { type: string; description: string }[];
  
  const addTask = (type: string, description: string) => {
    const newTasks = [...tasks, { type, description }];
    onFieldChange("tasks_detailed", newTasks);
  };
  
  const removeTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    onFieldChange("tasks_detailed", newTasks);
  };
  
  const toggleSuggestion = (category: string, suggestion: string, isChecked: boolean) => {
    if (isChecked) {
      addTask(category, suggestion);
    } else {
      const idx = tasks.findIndex(d => d.type === category && d.description === suggestion);
      if (idx !== -1) removeTask(idx);
    }
  };
  
  const isSuggestionSelected = (category: string, suggestion: string) => {
    return tasks.some(d => d.type === category && d.description === suggestion);
  };
  
  const addAllFromCategory = (category: string) => {
    const suggestions = allCategories[category]?.suggestions || [];
    const newItems = suggestions
      .filter(s => !isSuggestionSelected(category, s))
      .map(s => ({ type: category, description: s }));
    onFieldChange("tasks_detailed", [...tasks, ...newItems]);
  };
  
  const uniqueTypes = [...new Set(tasks.map(d => d.type))];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Task Category</Label>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddCategory(!showAddCategory)}>
            <Plus className="h-3 w-3" /> Add Custom Category
          </Button>
        </div>
        
        {showAddCategory && (
          <Card className="border-dashed border-2 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Security Auditing, Training"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggestions (comma-separated)</Label>
              <Textarea
                value={newCategorySuggestions}
                onChange={(e) => setNewCategorySuggestions(e.target.value)}
                placeholder="e.g., Conduct penetration testing, Review security protocols, Train team"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={saveCustomCategory} disabled={!newCategoryName.trim()}>
                Save Category
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2">
          {loadingCategories ? (
            <span className="text-xs text-muted-foreground">Loading categories...</span>
          ) : (
            Object.keys(allCategories).map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className="text-xs"
              >
                {cat}
              </Button>
            ))
          )}
        </div>
      </div>
      
      {selectedCategory && allCategories[selectedCategory] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedCategory} Suggestions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addAllFromCategory(selectedCategory)}>
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allCategories[selectedCategory]?.defaultDescription}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allCategories[selectedCategory]?.suggestions.map(suggestion => (
                <div key={suggestion} className="flex items-center space-x-2 p-2 border rounded hover:bg-white/50">
                  <Checkbox
                    id={`task-${selectedCategory}-${suggestion}`}
                    checked={isSuggestionSelected(selectedCategory, suggestion)}
                    onCheckedChange={(checked) => toggleSuggestion(selectedCategory, suggestion, !!checked)}
                  />
                  <label htmlFor={`task-${selectedCategory}-${suggestion}`} className="text-xs cursor-pointer flex-1">
                    {suggestion}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Add custom task description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!customDescription.trim()}
                onClick={() => {
                  addTask(selectedCategory, customDescription.trim());
                  setCustomDescription("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label>Current Tasks ({tasks.length} items)</Label>
        {tasks.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No tasks added yet. Select a category above to add items.
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTypes.map(category => {
              const categoryItems = tasks.filter(d => d.type === category);
              if (categoryItems.length === 0) return null;
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <ul className="space-y-1">
                      {categoryItems.map((item, idx) => {
                        const globalIdx = tasks.findIndex(d => d === item);
                        return (
                          <li key={idx} className="flex items-start justify-between text-sm group">
                            <span className="flex-1">{item.description}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeTask(globalIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableLabel({ 
  value, 
  onSave, 
  className = "",
  iconClassName = "h-3 w-3",
  allowDelete = false,
  onDelete = () => {},
  inputClassName = "h-7 text-xs py-0 px-2 min-w-[120px]"
}: { 
  value: string; 
  onSave: (val: string) => void;
  className?: string;
  iconClassName?: string;
  allowDelete?: boolean;
  onDelete?: () => void;
  inputClassName?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input 
          value={tempValue} 
          onChange={(e) => setLocalValue(e.target.value)}
          className={inputClassName}
          autoFocus
          onBlur={() => {
            onSave(tempValue);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(tempValue);
              setIsEditing(false);
            } else if (e.key === "Escape") {
              setLocalValue(value);
              setIsEditing(false);
            }
          }}
        />
      </div>
    );
  }

    return (
      <div className={`flex items-center gap-1.5 group/label cursor-pointer ${className}`} onClick={() => setIsEditing(true)}>
        <span>{value}</span>
        <button 
          type="button"
          className="opacity-0 group-hover/label:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
          <Pencil className={iconClassName} />
        </button>
        {allowDelete && (
          <button 
            type="button"
            className="opacity-0 group-hover/label:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 text-destructive rounded"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <X className={iconClassName} />
          </button>
        )}
      </div>
    );
  }

function EditableLabelInline({ 
  value, 
  onSave, 
  className = "" 
}: { 
  value: string; 
  onSave: (value: string) => void; 
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <Input 
        value={tempValue} 
        onChange={(e) => setTempValue(e.target.value)}
        className={`h-6 text-xs px-1 ${className}`}
        autoFocus
        onBlur={() => {
          onSave(tempValue);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(tempValue);
            setIsEditing(false);
          } else if (e.key === "Escape") {
            setTempValue(value);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-muted/50 px-1 rounded ${className}`} 
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}

function EditableCellInline({ 
  value, 
  onSave, 
  placeholder = "",
  className = "" 
}: { 
  value: string; 
  onSave: (value: string) => void; 
  placeholder?: string;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <Input 
        value={tempValue} 
        onChange={(e) => setTempValue(e.target.value)}
        className={`h-9 ${className}`}
        placeholder={placeholder}
        autoFocus
        onBlur={() => {
          onSave(tempValue);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(tempValue);
            setIsEditing(false);
          } else if (e.key === "Escape") {
            setTempValue(value);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div 
      className={`h-9 px-3 flex items-center cursor-text rounded border border-transparent hover:border-input hover:bg-muted/30 transition-colors ${className}`}
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  );
}

// DYNAMIC BULLET KEY-VALUE SECTION - EXACT COPY OF DELIVERABLES
function DynamicBulletKeyValueSection({ 
  data, 
  onFieldChange, 
  dataKey,
  introKey,
  sectionKey
}: { 
  data: Record<string, any>; 
  onFieldChange: (key: string, value: any) => void;
  dataKey: string;
  introKey: string;
  sectionKey: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySuggestions, setNewCategorySuggestions] = useState("");
  const [customCategories, setCustomCategories] = useState<Record<string, { suggestions: string[]; defaultDescription: string }>>({});
  
  const allCategories = { ...DELIVERABLE_CATEGORIES, ...customCategories };
  
  const items = (data[dataKey] || []) as { type: string; description: string }[];
  
  const addItem = (type: string, description: string) => {
    const newItems = [...items, { type, description }];
    onFieldChange(dataKey, newItems);
  };
  
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onFieldChange(dataKey, newItems);
  };
  
  const toggleSuggestion = (category: string, suggestion: string, isChecked: boolean) => {
    if (isChecked) {
      addItem(category, suggestion);
    } else {
      const idx = items.findIndex(d => d.type === category && d.description === suggestion);
      if (idx !== -1) removeItem(idx);
    }
  };
  
  const isSuggestionSelected = (category: string, suggestion: string) => {
    return items.some(d => d.type === category && d.description === suggestion);
  };
  
  const addAllFromCategory = (category: string) => {
    const suggestions = allCategories[category]?.suggestions || [];
    const newItems = suggestions
      .filter(s => !isSuggestionSelected(category, s))
      .map(s => ({ type: category, description: s }));
    onFieldChange(dataKey, [...items, ...newItems]);
  };
  
  const uniqueTypes = [...new Set(items.map(d => d.type))];

  return (
    <div className="space-y-6">
      {introKey && (
        <div className="space-y-2">
          <Label>Introduction</Label>
          <Textarea 
            value={data[introKey] || ""} 
            onChange={(e) => onFieldChange(introKey, e.target.value)} 
            placeholder="Introduction text..."
            rows={2} 
          />
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Category</Label>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddCategory(!showAddCategory)}>
            <Plus className="h-3 w-3" /> Add Custom Category
          </Button>
        </div>
        
        {showAddCategory && (
          <Card className="border-dashed border-2 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Security, Training"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggestions (comma-separated)</Label>
              <Textarea
                value={newCategorySuggestions}
                onChange={(e) => setNewCategorySuggestions(e.target.value)}
                placeholder="e.g., Item 1, Item 2, Item 3"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => {
                if (!newCategoryName.trim()) return;
                const suggestions = newCategorySuggestions.split(",").map(s => s.trim()).filter(Boolean);
                setCustomCategories(prev => ({
                  ...prev,
                  [newCategoryName.trim()]: {
                    suggestions,
                    defaultDescription: `${newCategoryName} items include: ${suggestions.join(", ")}.`
                  }
                }));
                setNewCategoryName("");
                setNewCategorySuggestions("");
                setShowAddCategory(false);
              }} disabled={!newCategoryName.trim()}>
                Save Category
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(allCategories).map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
      
      {selectedCategory && allCategories[selectedCategory] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedCategory} Suggestions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addAllFromCategory(selectedCategory)}>
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allCategories[selectedCategory]?.defaultDescription}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allCategories[selectedCategory]?.suggestions.map(suggestion => (
                <div key={suggestion} className="flex items-center space-x-2 p-2 border rounded hover:bg-white/50">
                  <Checkbox
                    id={`${sectionKey}-${selectedCategory}-${suggestion}`}
                    checked={isSuggestionSelected(selectedCategory, suggestion)}
                    onCheckedChange={(checked) => toggleSuggestion(selectedCategory, suggestion, !!checked)}
                  />
                  <label htmlFor={`${sectionKey}-${selectedCategory}-${suggestion}`} className="text-xs cursor-pointer flex-1">
                    {suggestion}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Add custom description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!customDescription.trim()}
                onClick={() => {
                  addItem(selectedCategory, customDescription.trim());
                  setCustomDescription("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label>Current Items ({items.length})</Label>
        {items.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No items added yet. Select a category above to add items.
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTypes.map(category => {
              const categoryItems = items.filter(d => d.type === category);
              if (categoryItems.length === 0) return null;
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <ul className="space-y-1">
                      {categoryItems.map((item, idx) => {
                        const globalIdx = items.findIndex(d => d === item);
                        return (
                          <li key={idx} className="flex items-start justify-between text-sm group">
                            <span className="flex-1">{item.description}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeItem(globalIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// DYNAMIC BULLET INDEXED SECTION - EXACT COPY OF ASSUMPTIONS
function DynamicBulletIndexedSection({ 
  data, 
  onFieldChange, 
  dataKey,
  prefixKey,
  sectionKey
}: { 
  data: Record<string, any>; 
  onFieldChange: (key: string, value: any) => void;
  dataKey: string;
  prefixKey: string;
  sectionKey: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySuggestions, setNewCategorySuggestions] = useState("");
  const [customCategories, setCustomCategories] = useState<Record<string, { suggestions: string[]; defaultDescription: string }>>({});
  
  const allCategories = { ...ASSUMPTION_CATEGORIES, ...customCategories };
  
  const items = (data[dataKey] || []) as { type: string; description: string }[];
  const prefix = data[prefixKey] || sectionKey.charAt(0).toUpperCase();
  
  const addItem = (type: string, description: string) => {
    const newItems = [...items, { type, description }];
    onFieldChange(dataKey, newItems);
  };
  
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onFieldChange(dataKey, newItems);
  };
  
  const toggleSuggestion = (category: string, suggestion: string, isChecked: boolean) => {
    if (isChecked) {
      addItem(category, suggestion);
    } else {
      const idx = items.findIndex(d => d.type === category && d.description === suggestion);
      if (idx !== -1) removeItem(idx);
    }
  };
  
  const isSuggestionSelected = (category: string, suggestion: string) => {
    return items.some(d => d.type === category && d.description === suggestion);
  };
  
  const addAllFromCategory = (category: string) => {
    const suggestions = allCategories[category]?.suggestions || [];
    const newItems = suggestions
      .filter(s => !isSuggestionSelected(category, s))
      .map(s => ({ type: category, description: s }));
    onFieldChange(dataKey, [...items, ...newItems]);
  };
  
  const uniqueTypes = [...new Set(items.map(d => d.type))];

  return (
    <div className="space-y-6">
      <div className="space-y-2 w-32">
        <Label>Index Prefix</Label>
        <Input 
          value={data[prefixKey] || ""} 
          onChange={(e) => onFieldChange(prefixKey, e.target.value)} 
          placeholder="e.g. A, D" 
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Category</Label>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddCategory(!showAddCategory)}>
            <Plus className="h-3 w-3" /> Add Custom Category
          </Button>
        </div>
        
        {showAddCategory && (
          <Card className="border-dashed border-2 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Compliance, Testing"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggestions (comma-separated)</Label>
              <Textarea
                value={newCategorySuggestions}
                onChange={(e) => setNewCategorySuggestions(e.target.value)}
                placeholder="e.g., Requirement 1, Requirement 2"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => {
                if (!newCategoryName.trim()) return;
                const suggestions = newCategorySuggestions.split(",").map(s => s.trim()).filter(Boolean);
                setCustomCategories(prev => ({
                  ...prev,
                  [newCategoryName.trim()]: {
                    suggestions,
                    defaultDescription: `${newCategoryName} items include: ${suggestions.join(", ")}.`
                  }
                }));
                setNewCategoryName("");
                setNewCategorySuggestions("");
                setShowAddCategory(false);
              }} disabled={!newCategoryName.trim()}>
                Save Category
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(allCategories).map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
      
      {selectedCategory && allCategories[selectedCategory] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedCategory} Suggestions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addAllFromCategory(selectedCategory)}>
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allCategories[selectedCategory]?.defaultDescription}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allCategories[selectedCategory]?.suggestions.map(suggestion => (
                <div key={suggestion} className="flex items-center space-x-2 p-2 border rounded hover:bg-white/50">
                  <Checkbox
                    id={`${sectionKey}-indexed-${selectedCategory}-${suggestion}`}
                    checked={isSuggestionSelected(selectedCategory, suggestion)}
                    onCheckedChange={(checked) => toggleSuggestion(selectedCategory, suggestion, !!checked)}
                  />
                  <label htmlFor={`${sectionKey}-indexed-${selectedCategory}-${suggestion}`} className="text-xs cursor-pointer flex-1">
                    {suggestion}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Add custom description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!customDescription.trim()}
                onClick={() => {
                  addItem(selectedCategory, customDescription.trim());
                  setCustomDescription("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label>Current Items ({items.length})</Label>
        {items.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No items added yet. Select a category above to add items.
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTypes.map((category, catIdx) => {
              const categoryItems = items.filter(d => d.type === category);
              if (categoryItems.length === 0) return null;
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{prefix}{catIdx + 1}: {category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <ul className="space-y-1">
                      {categoryItems.map((item, idx) => {
                        const globalIdx = items.findIndex(d => d === item);
                        return (
                          <li key={idx} className="flex items-start justify-between text-sm group">
                            <span className="flex-1">{item.description}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeItem(globalIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DynamicFormSection({ 
  section, 
  data, 
  onFieldChange,
  sectionIndex 
}: { 
  section: { 
    key: string; 
    title: string; 
    type: string; 
    dataKeys: string[]; 
    fields?: { key: string; label: string; type: string }[];
    headingBlockId?: string;
    contentBlockId?: string;
  };
  data: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  sectionIndex: number;
}) {
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({0: true});

  const updateSectionTitle = (newTitle: string) => {
    const dynamicSections = [...(data._dynamic_sections as any[] || [])];
    dynamicSections[sectionIndex] = { ...dynamicSections[sectionIndex], title: newTitle };
    onFieldChange("_dynamic_sections", dynamicSections);
  };

  const updateFieldLabel = (fieldKey: string, newLabel: string) => {
    const dynamicSections = [...(data._dynamic_sections as any[] || [])];
    const fields = [...(dynamicSections[sectionIndex].fields || [])];
    const fieldIdx = fields.findIndex((f: any) => f.key === fieldKey);
    if (fieldIdx !== -1) {
      fields[fieldIdx] = { ...fields[fieldIdx], label: newLabel };
      dynamicSections[sectionIndex] = { ...dynamicSections[sectionIndex], fields };
      onFieldChange("_dynamic_sections", dynamicSections);
    }
  };

  const removeField = (fieldKey: string) => {
    const dynamicSections = [...(data._dynamic_sections as any[] || [])];
    const fields = (dynamicSections[sectionIndex].fields || []).filter((f: any) => f.key !== fieldKey);
    dynamicSections[sectionIndex] = { ...dynamicSections[sectionIndex], fields };
    onFieldChange("_dynamic_sections", dynamicSections);
  };

  const handleTableRowChange = (tableKey: string, rowIndex: number, field: string, value: any) => {
    const rows = [...(data[tableKey] as any[] || [])];
    rows[rowIndex] = { ...rows[rowIndex], [field]: value };
    onFieldChange(tableKey, rows);
  };

  const addTableRow = (tableKey: string, defaultRow: any) => {
    const rows = [...(data[tableKey] as any[] || [])];
    rows.push(defaultRow);
    onFieldChange(tableKey, rows);
  };

  const removeTableRow = (tableKey: string, rowIndex: number) => {
    const rows = [...(data[tableKey] as any[] || [])];
    rows.splice(rowIndex, 1);
    onFieldChange(tableKey, rows);
  };

  const getFieldLabel = (key: string, fallback: string) => {
    return section.fields?.find(f => f.key === key)?.label || fallback;
  };

  const isFieldHidden = (key: string) => {
    return section.fields && !section.fields.some(f => f.key === key);
  };

  const handleNestedUpdate = (tableKey: string, rowIndex: number, nestedField: string, nestedIndex: number, field: string, value: any) => {
    const rows = [...(data[tableKey] as any[] || [])];
    const nested = [...(rows[rowIndex]?.[nestedField] || [])];
    nested[nestedIndex] = { ...nested[nestedIndex], [field]: value };
    rows[rowIndex] = { ...rows[rowIndex], [nestedField]: nested };
    onFieldChange(tableKey, rows);
  };

  const addNestedRow = (tableKey: string, rowIndex: number, nestedField: string, defaultRow: any) => {
    const rows = [...(data[tableKey] as any[] || [])];
    const nested = [...(rows[rowIndex]?.[nestedField] || [])];
    nested.push(defaultRow);
    rows[rowIndex] = { ...rows[rowIndex], [nestedField]: nested };
    onFieldChange(tableKey, rows);
  };

  const removeNestedRow = (tableKey: string, rowIndex: number, nestedField: string, nestedIndex: number) => {
    const rows = [...(data[tableKey] as any[] || [])];
    const nested = [...(rows[rowIndex]?.[nestedField] || [])].filter((_, i) => i !== nestedIndex);
    rows[rowIndex] = { ...rows[rowIndex], [nestedField]: nested };
    onFieldChange(tableKey, rows);
  };

    // 1. CALCULATIONS TYPE (MIMICS PRICING) - ALL LABELS DOUBLE-CLICK EDITABLE
    if (section.type === "calculations") {
      const tableKey = section.dataKeys[0];
      const taxKey = section.dataKeys[1];
      const notesKey = section.dataKeys[2];
      const pricingData = (data[tableKey] as any[] || []);
      const totalCost = pricingData.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);

      const labelsKey = `${section.key}_labels`;
      const defaultLabels = {
        totalBaseCost: "Total Base Cost",
        gst: "GST",
        totalPayable: "Total Payable (incl. GST)",
        costingBreakdown: "Costing Breakdown",
        itemName: "Item name",
        cost: "Cost",
        addLineItem: "Add Line Item",
        addItem: "Add Item",
        phaseName: "Phase/Item name"
      };
      const labels = { ...defaultLabels, ...(data[labelsKey] || {}) };
      
      const updateLabel = (key: string, value: string) => {
        onFieldChange(labelsKey, { ...labels, [key]: value });
      };

      return (
        <Card className="border-2 border-violet-500/20">
          <CardHeader className="pb-4 bg-violet-50/50">
            <CardTitle className="text-lg">
              <EditableLabel value={section.title} onSave={updateSectionTitle} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isFieldHidden(taxKey) && (
                <div className="space-y-2">
                  <EditableLabelInline value={getFieldLabel(taxKey, "Tax / GST (%)")} onSave={(val) => updateFieldLabel(taxKey, val)} className="text-sm font-medium" />
                  <Input 
                    type="number" 
                    value={data[taxKey] || "18"} 
                    onChange={(e) => onFieldChange(taxKey, e.target.value)} 
                    placeholder="18" 
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <EditableLabelInline value={labels.totalBaseCost} onSave={(val) => updateLabel("totalBaseCost", val)} className="text-sm font-medium" />
                <span className="text-xl font-bold text-primary">₹{totalCost.toLocaleString()}</span>
              </div>
              {!isFieldHidden(taxKey) && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium"><EditableLabelInline value={labels.gst} onSave={(val) => updateLabel("gst", val)} className="inline" /> ({data[taxKey] || 18}%):</span>
                    <span className="text-lg font-semibold text-muted-foreground">₹{(totalCost * (Number(data[taxKey]) || 18) / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <EditableLabelInline value={labels.totalPayable} onSave={(val) => updateLabel("totalPayable", val)} className="text-sm font-bold" />
                    <span className="text-2xl font-bold text-emerald-600">₹{(totalCost * (1 + (Number(data[taxKey]) || 18) / 100)).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <EditableLabelInline value={getFieldLabel(tableKey, "Phases / Items")} onSave={(val) => updateFieldLabel(tableKey, val)} className="text-lg font-bold" />
                <Badge variant="secondary">{pricingData.length} items</Badge>
              </div>
              
              {pricingData.map((row: any, i: number) => (
                <Card key={i} className="border-l-4 border-l-violet-500">
                  <CardHeader className="py-3 bg-violet-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-violet-100 text-violet-700">Item {i+1}</Badge>
                        <Input 
                          value={row.phase || ""} 
                          onChange={(e) => handleTableRowChange(tableKey, i, "phase", e.target.value)} 
                          placeholder={labels.phaseName}
                          className="h-8 w-64 font-bold bg-transparent border-none focus-visible:ring-0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <EditableLabelInline value={labels.cost} onSave={(val) => updateLabel("cost", val)} className="text-xs font-semibold" />
                        <Input 
                          type="number" 
                          value={row.cost || 0} 
                          onChange={(e) => handleTableRowChange(tableKey, i, "cost", parseInt(e.target.value) || 0)} 
                          className="h-8 w-32 font-bold text-violet-700"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTableRow(tableKey, i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <EditableLabelInline value={labels.costingBreakdown} onSave={(val) => updateLabel("costingBreakdown", val)} className="text-xs uppercase tracking-wider text-muted-foreground font-bold" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(row.breakdown || []).map((item: any, itemIdx: number) => (
                        <div key={itemIdx} className="flex gap-2 items-center">
                          <Input 
                            value={item.item || ""} 
                            onChange={(e) => {
                              const breakdown = [...(row.breakdown || [])];
                              breakdown[itemIdx] = { ...breakdown[itemIdx], item: e.target.value };
                              handleTableRowChange(tableKey, i, "breakdown", breakdown);
                            }} 
                            placeholder={labels.itemName}
                            className="h-8 text-xs"
                          />
                          <Input 
                            type="number" 
                            value={item.cost || 0} 
                            onChange={(e) => {
                              const breakdown = [...(row.breakdown || [])];
                              breakdown[itemIdx] = { ...breakdown[itemIdx], cost: parseInt(e.target.value) || 0 };
                              const newTotal = breakdown.reduce((sum: number, b: any) => sum + (Number(b.cost) || 0), 0);
                              const rows = [...pricingData];
                              rows[i] = { ...rows[i], breakdown, cost: newTotal };
                              onFieldChange(tableKey, rows);
                            }} 
                            placeholder={labels.cost}
                            className="h-8 text-xs w-24"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => {
                              const breakdown = [...(row.breakdown || [])].filter((_, idx) => idx !== itemIdx);
                              const newTotal = breakdown.reduce((sum: number, b: any) => sum + (Number(b.cost) || 0), 0);
                              const rows = [...pricingData];
                              rows[i] = { ...rows[i], breakdown, cost: newTotal };
                              onFieldChange(tableKey, rows);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7 border-dashed w-full"
                      onClick={() => {
                        const breakdown = [...(row.breakdown || [])];
                        breakdown.push({ item: "Other", cost: 0 });
                        handleTableRowChange(tableKey, i, "breakdown", breakdown);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> <EditableLabelInline value={labels.addLineItem} onSave={(val) => updateLabel("addLineItem", val)} className="text-xs" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Button 
                variant="default" 
                className="w-full gap-2"
                onClick={() => addTableRow(tableKey, { 
                  phase: "", 
                  cost: 0, 
                  breakdown: [
                    { item: "Development", cost: 0 },
                    { item: "Design", cost: 0 }
                  ] 
                })}
              >
                <Plus className="h-4 w-4" /> <EditableLabelInline value={labels.addItem} onSave={(val) => updateLabel("addItem", val)} className="text-sm" />
              </Button>
            </div>

            {!isFieldHidden(notesKey) && (
              <div className="space-y-2">
                <EditableLabelInline value={getFieldLabel(notesKey, "Notes")} onSave={(val) => updateFieldLabel(notesKey, val)} className="text-sm font-medium" />
                <Textarea 
                  value={data[notesKey] || ""} 
                  onChange={(e) => onFieldChange(notesKey, e.target.value)} 
                  placeholder="Additional notes..." 
                  rows={3} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

  // 2. BAR GRAPH TYPE (MIMICS RESOURCE ENGAGEMENT) - ALL LABELS DOUBLE-CLICK EDITABLE
  if (section.type === "bar_graph") {
    const justificationKey = section.dataKeys[0];
    const dataKey = section.dataKeys[1];
    const resources = (data[dataKey] as any[] || []);

    const labelsKey = `${section.key}_labels`;
    const defaultLabels = {
      labelRole: "Label / Role",
      count: "Count",
      allocation: "Allocation %",
      addRow: "Add Row"
    };
    const labels = { ...defaultLabels, ...(data[labelsKey] || {}) };
    
    const updateLabel = (key: string, value: string) => {
      onFieldChange(labelsKey, { ...labels, [key]: value });
    };

    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            <EditableLabel value={section.title} onSave={updateSectionTitle} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <EditableLabelInline value={getFieldLabel(dataKey, "Data Points")} onSave={(val) => updateFieldLabel(dataKey, val)} className="text-sm font-medium" />
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead><EditableLabelInline value={labels.labelRole} onSave={(val) => updateLabel("labelRole", val)} className="font-semibold text-xs" /></TableHead>
                    <TableHead className="w-[15%]"><EditableLabelInline value={labels.count} onSave={(val) => updateLabel("count", val)} className="font-semibold text-xs" /></TableHead>
                    <TableHead className="w-[15%]"><EditableLabelInline value={labels.allocation} onSave={(val) => updateLabel("allocation", val)} className="font-semibold text-xs" /></TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="p-1">
                        <Input value={row.role || ""} onChange={(e) => handleTableRowChange(dataKey, i, "role", e.target.value)} placeholder={labels.labelRole} className="h-9" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={row.count || ""} onChange={(e) => handleTableRowChange(dataKey, i, "count", parseInt(e.target.value) || 0)} className="h-9" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={row.allocation || ""} onChange={(e) => handleTableRowChange(dataKey, i, "allocation", parseInt(e.target.value) || 0)} className="h-9" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeTableRow(dataKey, i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow(dataKey, { role: "", count: 1, allocation: 100 })}>
              <Plus className="h-4 w-4 mr-1" /> <EditableLabelInline value={labels.addRow} onSave={(val) => updateLabel("addRow", val)} className="text-sm" />
            </Button>
          </div>
          {!isFieldHidden(justificationKey) && (
            <div className="space-y-2">
              <EditableLabelInline value={getFieldLabel(justificationKey, "Justification / Description")} onSave={(val) => updateFieldLabel(justificationKey, val)} className="text-sm font-medium" />
              <Textarea value={data[justificationKey] || ""} onChange={(e) => onFieldChange(justificationKey, e.target.value)} placeholder="Explain the distribution..." rows={3} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 3. BULLET KEY-VALUE TYPE - NO AI
  if (section.type === "bullet_key_value") {
    const introKey = section.dataKeys[0];
    const dataKey = section.dataKeys[1];
    
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            <EditableLabel value={section.title} onSave={updateSectionTitle} />
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Select a category and check suggestions to add, or add your own custom descriptions.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <DynamicBulletKeyValueSection 
            data={data} 
            onFieldChange={onFieldChange} 
            dataKey={dataKey}
            introKey={introKey}
            sectionKey={section.key}
          />
        </CardContent>
      </Card>
    );
  }

  // 4. BULLET INDEXED TYPE - NO AI
  if (section.type === "bullet_indexed") {
    const dataKey = section.dataKeys[0];
    const prefixKey = section.dataKeys[1];
    
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            <EditableLabel value={section.title} onSave={updateSectionTitle} />
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Select a category and check suggestions to add, or add your own custom descriptions.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <DynamicBulletIndexedSection 
            data={data} 
            onFieldChange={onFieldChange} 
            dataKey={dataKey}
            prefixKey={prefixKey}
            sectionKey={section.key}
          />
        </CardContent>
      </Card>
    );
  }

  // 5. PLAN TYPE (MIMICS DELIVERY PLAN) - ALL LABELS DOUBLE-CLICK EDITABLE
    if (section.type === "plan") {
      const introKey = section.dataKeys[0];
      const phasesKey = section.dataKeys[1];
      const phases = (data[phasesKey] as any[] || []);
      
      const labelsKey = `${section.key}_labels`;
      const defaultLabels = {
        startWeek: "Start Week",
        endWeek: "End Week",
        platformsSection: "Platforms / Components",
        platformName: "Platform name",
        platformFeatures: "Features / scope items",
        addPlatform: "Add Platform",
        addPhase: "Add Phase"
      };
      const labels = { ...defaultLabels, ...(data[labelsKey] || {}) };
      
      const updateLabel = (key: string, value: string) => {
        onFieldChange(labelsKey, { ...labels, [key]: value });
      };

      return (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-4 bg-primary/5">
            <CardTitle className="text-lg">
              <EditableLabel value={section.title} onSave={updateSectionTitle} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {!isFieldHidden(introKey) && (
              <div className="space-y-2">
                <EditableLabelInline value={getFieldLabel(introKey, "Introduction")} onSave={(val) => updateFieldLabel(introKey, val)} className="text-sm font-medium" />
                <Textarea value={data[introKey] || ""} onChange={(e) => onFieldChange(introKey, e.target.value)} rows={2} />
              </div>
            )}

            <div className="space-y-4">
              <EditableLabelInline value={getFieldLabel(phasesKey, "Phases")} onSave={(val) => updateFieldLabel(phasesKey, val)} className="font-bold" />
              {phases.map((phase, i) => (
                <Card key={i} className="border-l-4 border-l-primary overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Input 
                        value={phase.title || ""} 
                        onChange={(e) => handleTableRowChange(phasesKey, i, "title", e.target.value)} 
                        placeholder={`Phase ${i+1} Title`}
                        className="h-8 font-bold bg-transparent border-none focus-visible:ring-0"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTableRow(phasesKey, i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <EditableLabelInline value={labels.startWeek} onSave={(val) => updateLabel("startWeek", val)} className="text-xs" />
                          <Input type="number" value={phase.weeks_start || 0} onChange={(e) => handleTableRowChange(phasesKey, i, "weeks_start", parseInt(e.target.value) || 0)} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <EditableLabelInline value={labels.endWeek} onSave={(val) => updateLabel("endWeek", val)} className="text-xs" />
                          <Input type="number" value={phase.weeks_end || 0} onChange={(e) => handleTableRowChange(phasesKey, i, "weeks_end", parseInt(e.target.value) || 0)} className="h-8" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <EditableLabelInline value={labels.platformsSection} onSave={(val) => updateLabel("platformsSection", val)} className="text-xs font-semibold" />
                        <div className="space-y-2">
                          {(phase.platforms || []).map((platform: any, pIdx: number) => (
                            <div key={pIdx} className="flex gap-2 items-start group">
                              <Input 
                                value={platform.name || ""} 
                                onChange={(e) => handleNestedUpdate(phasesKey, i, "platforms", pIdx, "name", e.target.value)}
                                placeholder={labels.platformName}
                                className="h-8 w-1/3 text-xs"
                              />
                              <Input 
                                value={platform.features || ""} 
                                onChange={(e) => handleNestedUpdate(phasesKey, i, "platforms", pIdx, "features", e.target.value)}
                                placeholder={labels.platformFeatures}
                                className="h-8 flex-1 text-xs"
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                                onClick={() => removeNestedRow(phasesKey, i, "platforms", pIdx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-dashed h-7 text-xs"
                            onClick={() => addNestedRow(phasesKey, i, "platforms", { name: "", features: "" })}
                          >
                            <Plus className="h-3 w-3 mr-1" /> <EditableLabelInline value={labels.addPlatform} onSave={(val) => updateLabel("addPlatform", val)} className="text-xs" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" className="w-full border-dashed" onClick={() => addTableRow(phasesKey, { title: "", weeks_start: 0, weeks_end: 4, platforms: [] })}>
                  <Plus className="h-4 w-4 mr-1" /> <EditableLabelInline value={labels.addPhase} onSave={(val) => updateLabel("addPhase", val)} className="text-sm" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

    // 6. TABLE CHART TYPE (MIMICS FEATURES) - WITH EDITABLE COLUMNS - ALL LABELS DOUBLE-CLICK EDITABLE
    if (section.type === "table_chart") {
      const titleKey = section.dataKeys[0];
      const listKey = section.dataKeys[1];
      const columnsKey = `${section.key}_columns`;
      const items = (data[listKey] as any[] || []);
      const defaultColumns = [
        { key: "category", label: "Category" },
        { key: "subcategory", label: "Subcategory" },
        { key: "name", label: "Name" }
      ];
      const columns = (data[columnsKey] as any[] || defaultColumns);

      const labelsKey = `${section.key}_labels`;
      const defaultLabels = {
        addColumn: "Add Column",
        addRow: "Add Row"
      };
      const labels = { ...defaultLabels, ...(data[labelsKey] || {}) };
      
      const updateLabel = (key: string, value: string) => {
        onFieldChange(labelsKey, { ...labels, [key]: value });
      };

      const updateColumnLabel = (colIdx: number, newLabel: string) => {
        const newColumns = [...columns];
        newColumns[colIdx] = { ...newColumns[colIdx], label: newLabel };
        onFieldChange(columnsKey, newColumns);
      };

      const removeColumn = (colIdx: number) => {
        const colKey = columns[colIdx].key;
        const newColumns = columns.filter((_: any, i: number) => i !== colIdx);
        const newItems = items.map((row: any) => {
          const newRow = { ...row };
          delete newRow[colKey];
          return newRow;
        });
        onFieldChange(columnsKey, newColumns);
        onFieldChange(listKey, newItems);
      };

      const addColumn = () => {
        const newColKey = `col_${Date.now()}`;
        const newColumns = [...columns, { key: newColKey, label: "New Column" }];
        const newItems = items.map((row: any) => ({ ...row, [newColKey]: "" }));
        onFieldChange(columnsKey, newColumns);
        onFieldChange(listKey, newItems);
      };

      return (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              <EditableLabel value={section.title} onSave={updateSectionTitle} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isFieldHidden(titleKey) && (
              <div className="space-y-2">
                <EditableLabelInline value={getFieldLabel(titleKey, "Table Title")} onSave={(val) => updateFieldLabel(titleKey, val)} className="text-sm font-medium" />
                <Input value={data[titleKey] || ""} onChange={(e) => onFieldChange(titleKey, e.target.value)} />
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <EditableLabelInline value={getFieldLabel(listKey, "Items")} onSave={(val) => updateFieldLabel(listKey, val)} className="font-bold" />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addColumn}>
                  <Plus className="h-3 w-3" /> <EditableLabelInline value={labels.addColumn} onSave={(val) => updateLabel("addColumn", val)} className="text-xs" />
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {columns.map((col: any, colIdx: number) => (
                        <TableHead key={col.key} className="min-w-[120px]">
                          <div className="flex items-center gap-1 group">
                            <EditableLabelInline
                              value={col.label}
                              onSave={(val) => updateColumnLabel(colIdx, val)}
                              className="font-semibold text-xs"
                            />
                            {columns.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                                onClick={() => removeColumn(colIdx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {items.map((row: any, i: number) => (
                        <TableRow key={i}>
                          {columns.map((col: any) => (
                            <TableCell key={col.key} className="p-1">
                              <EditableCellInline 
                                value={row[col.key] || ""} 
                                onSave={(val) => handleTableRowChange(listKey, i, col.key, val)} 
                                placeholder={col.label}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="p-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeTableRow(listKey, i)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-dashed" 
                onClick={() => {
                  const newRow: any = {};
                  columns.forEach((col: any) => { newRow[col.key] = ""; });
                  addTableRow(listKey, newRow);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> <EditableLabelInline value={labels.addRow} onSave={(val) => updateLabel("addRow", val)} className="text-sm" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // 7. METADATA TYPE (MIMICS PROPOSAL METADATA) - ALL LABELS DOUBLE-CLICK EDITABLE
    if (section.type === "metadata") {
      const fieldsKey = section.dataKeys[0];
      const fields = (data[fieldsKey] as any[] || []);

      const labelsKey = `${section.key}_labels`;
      const defaultLabels = {
        addMetadataField: "Add Metadata Field",
        newFieldDefault: "New Field"
      };
      const labels = { ...defaultLabels, ...(data[labelsKey] || {}) };
      
      const updateLabel = (key: string, value: string) => {
        onFieldChange(labelsKey, { ...labels, [key]: value });
      };

      return (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              <EditableLabel value={section.title} onSave={updateSectionTitle} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field, i) => (
                <div key={i} className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <EditableLabelInline value={field.label || `Field ${i+1}`} onSave={(val) => handleTableRowChange(fieldsKey, i, "label", val)} className="text-sm font-medium" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeTableRow(fieldsKey, i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input value={field.value || ""} onChange={(e) => handleTableRowChange(fieldsKey, i, "value", e.target.value)} placeholder={`Enter ${field.label}...`} />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow(fieldsKey, { label: labels.newFieldDefault, value: "" })}>
              <Plus className="h-4 w-4 mr-1" /> <EditableLabelInline value={labels.addMetadataField} onSave={(val) => updateLabel("addMetadataField", val)} className="text-sm" />
            </Button>
          </CardContent>
        </Card>
      );
    }

    // 8. SECTIONS SUBSECTIONS TYPE (MIMICS CHANGE MANAGEMENT) - ALL LABELS DOUBLE-CLICK EDITABLE
    if (section.type === "sections_subsections") {
      const sub1Key = section.dataKeys[0];
      const sub2Key = section.dataKeys[1];
      const sub3Key = section.dataKeys[2];

      const labelsKey = `${section.key}_labels`;
      const defaultLabels = {
        title: "Title",
        description: "Description",
        point: "Point...",
        addItem: "Add Item",
        addPoint: "Add Point"
      };
      const labels = { ...defaultLabels, ...(data[labelsKey] || {}) };
      
      const updateLabel = (key: string, value: string) => {
        onFieldChange(labelsKey, { ...labels, [key]: value });
      };

      return (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              <EditableLabel value={section.title} onSave={updateSectionTitle} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {[sub1Key, sub2Key].map((key, idx) => {
              if (isFieldHidden(key)) return null;
              const items = (data[key] as any[] || []);
              return (
                <div key={key} className="space-y-4">
                  <EditableLabelInline value={getFieldLabel(key, `Subsection ${idx+1}`)} onSave={(val) => updateFieldLabel(key, val)} className="text-base font-semibold" />
                  <div className="space-y-3">
                    {items.map((item, i) => (
                      <div key={i} className="flex gap-2 items-start group">
                        <Input value={item.key || ""} onChange={(e) => handleTableRowChange(key, i, "key", e.target.value)} placeholder={labels.title} className="h-9 w-1/3" />
                        <Input value={item.value || ""} onChange={(e) => handleTableRowChange(key, i, "value", e.target.value)} placeholder={labels.description} className="h-9 flex-1" />
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeTableRow(key, i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow(key, { key: "", value: "" })}><Plus className="h-4 w-4 mr-1" /> <EditableLabelInline value={labels.addItem} onSave={(val) => updateLabel("addItem", val)} className="text-sm" /></Button>
                </div>
              );
            })}
            {!isFieldHidden(sub3Key) && (
              <div className="space-y-4">
                <EditableLabelInline value={getFieldLabel(sub3Key, "Subsection 3")} onSave={(val) => updateFieldLabel(sub3Key, val)} className="text-base font-semibold" />
                <div className="space-y-3">
                  {(data[sub3Key] as any[] || []).map((item, i) => (
                    <div key={i} className="flex gap-2 items-center group">
                      <Input value={item.item || ""} onChange={(e) => handleTableRowChange(sub3Key, i, "item", e.target.value)} placeholder={labels.point} className="h-9 flex-1" />
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeTableRow(sub3Key, i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addTableRow(sub3Key, { item: "" })}><Plus className="h-4 w-4 mr-1" /> <EditableLabelInline value={labels.addPoint} onSave={(val) => updateLabel("addPoint", val)} className="text-sm" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          <EditableLabel value={section.title} onSave={updateSectionTitle} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Generic section: {section.type}</p>
      </CardContent>
    </Card>
  );
}

function SignOffSection({ data, onFieldChange }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);
  
  const defaultRequirements = [
    { stage: "Architecture Approval", description: "Sign-off on technical architecture and design decisions" },
    { stage: "Phase-wise UAT", description: "User acceptance testing sign-off at the end of each phase" },
    { stage: "Final Acceptance", description: "Final project delivery and acceptance sign-off" }
  ];
  
  useEffect(() => {
    if (!data.signoff_requirements || (data.signoff_requirements as any[]).length === 0) {
      onFieldChange("signoff_requirements", defaultRequirements);
    }
  }, []);
  
  const signoffRequirements = (data.signoff_requirements && (data.signoff_requirements as any[]).length > 0) 
    ? (data.signoff_requirements as { stage: string; description: string }[])
    : defaultRequirements;
  
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/proposal-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_signoff_requirements",
          context: aiContext || "Generate standard sign-off requirements",
          project_context: data.project_context || ""
        })
      });
      const result = await response.json();
      if (result.updates?.signoff_requirements) {
        onFieldChange("signoff_requirements", result.updates.signoff_requirements);
      }
    } catch (e) {
      console.error("AI generation failed", e);
    } finally {
      setIsGenerating(false);
      setShowAiInput(false);
      setAiContext("");
    }
  };
  
  const addRequirement = () => {
    onFieldChange("signoff_requirements", [...signoffRequirements, { stage: "", description: "" }]);
  };
  
  const updateRequirement = (index: number, field: "stage" | "description", value: string) => {
    const updated = [...signoffRequirements];
    updated[index] = { ...updated[index], [field]: value };
    onFieldChange("signoff_requirements", updated);
  };
  
  const removeRequirement = (index: number) => {
    onFieldChange("signoff_requirements", signoffRequirements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Sign-off Requirements
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAiInput(!showAiInput)}
          >
            <Sparkles className="h-3 w-3" /> Generate with AI
          </Button>
        </div>
        
        {showAiInput && (
          <div className="flex gap-2 animate-in slide-in-from-top-2">
            <Input
              placeholder="Describe your sign-off needs (optional)..."
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setShowAiInput(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {signoffRequirements.map((req, idx) => (
          <div key={idx} className="flex gap-2 items-start group">
            <div className="w-1/3">
              <Input
                value={req.stage}
                onChange={(e) => updateRequirement(idx, "stage", e.target.value)}
                placeholder="Stage name (e.g., UAT Sign-off)"
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <Input
                value={req.description}
                onChange={(e) => updateRequirement(idx, "description", e.target.value)}
                placeholder="Description..."
                className="h-9"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeRequirement(idx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addRequirement}>
        <Plus className="h-4 w-4 mr-1" /> Add Sign-off Requirement
      </Button>

      <div className="space-y-2 pt-4 border-t">
        <Label>Baseline Reference Link</Label>
        <Input
          value={data.baseline_reference_link || ""}
          onChange={(e) => onFieldChange("baseline_reference_link", e.target.value)}
          placeholder="https://docs.google.com/..."
        />
      </div>
    </div>
  );
}

const DEFAULT_GOVERNANCE_CADENCE_OPTIONS = [
  "Weekly Status Meeting",
  "Bi-weekly Steering Review",
  "Daily Stand-ups (internal)",
  "Monthly Review",
  "Sprint Planning",
  "Sprint Demo",
  "Retrospective"
];

const DEFAULT_GOVERNANCE_REPORTING_OPTIONS = [
  "Status Report",
  "Quality Report",
  "Release Notes",
  "Progress Dashboard",
  "Risk Register"
];

const DEFAULT_GOVERNANCE_DECISION_OPTIONS = [
  "PM",
  "TL",
  "Client Representative",
  "Product Owner",
  "Steering Committee"
];

function GovernanceSection({ data, onFieldChange, onGenerateGovernance }: { data: Record<string, any>; onFieldChange: (key: string, value: any) => void; onGenerateGovernance?: (context: string) => Promise<void> }) {
  const [cadenceSelectedKey, setCadenceSelectedKey] = useState("");
  const [cadenceCustomValue, setCadenceCustomValue] = useState("");
  const [reportingSelectedKey, setReportingSelectedKey] = useState("");
  const [reportingCustomValue, setReportingCustomValue] = useState("");
  const [decisionSelectedKey, setDecisionSelectedKey] = useState("");
  const [decisionCustomValue, setDecisionCustomValue] = useState("");
  
  const [showAddCadenceTag, setShowAddCadenceTag] = useState(false);
  const [showAddReportingTag, setShowAddReportingTag] = useState(false);
  const [showAddDecisionTag, setShowAddDecisionTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);

  const cadenceItems = (data.governance_cadence_items || []) as { key: string; value: string }[];
  const reportingItems = (data.governance_reporting_items || []) as { key: string; value: string }[];
  const decisionItems = (data.governance_decision_items || []) as { key: string; value: string }[];
  
  const customCadenceTags = (data.custom_governance_cadence_tags || []) as string[];
  const customReportingTags = (data.custom_governance_reporting_tags || []) as string[];
  const customDecisionTags = (data.custom_governance_decision_tags || []) as string[];
  
  const allCadenceOptions = [...DEFAULT_GOVERNANCE_CADENCE_OPTIONS, ...customCadenceTags];
  const allReportingOptions = [...DEFAULT_GOVERNANCE_REPORTING_OPTIONS, ...customReportingTags];
  const allDecisionOptions = [...DEFAULT_GOVERNANCE_DECISION_OPTIONS, ...customDecisionTags];

  const cadenceSectionName = (data.governance_cadence_name as string) || "Cadence";
  const reportingSectionName = (data.governance_reporting_name as string) || "Reporting";
  const decisionSectionName = (data.governance_decision_name as string) || "Decision Rights";
  
  const addCustomCadenceTag = () => {
    if (!newTagName.trim() || allCadenceOptions.includes(newTagName.trim())) return;
    onFieldChange("custom_governance_cadence_tags", [...customCadenceTags, newTagName.trim()]);
    setCadenceSelectedKey(newTagName.trim());
    setNewTagName("");
    setShowAddCadenceTag(false);
  };
  
  const addCustomReportingTag = () => {
    if (!newTagName.trim() || allReportingOptions.includes(newTagName.trim())) return;
    onFieldChange("custom_governance_reporting_tags", [...customReportingTags, newTagName.trim()]);
    setReportingSelectedKey(newTagName.trim());
    setNewTagName("");
    setShowAddReportingTag(false);
  };
  
  const addCustomDecisionTag = () => {
    if (!newTagName.trim() || allDecisionOptions.includes(newTagName.trim())) return;
    onFieldChange("custom_governance_decision_tags", [...customDecisionTags, newTagName.trim()]);
    setDecisionSelectedKey(newTagName.trim());
    setNewTagName("");
    setShowAddDecisionTag(false);
  };

  const addCadenceItem = (key: string, value: string) => {
    if (!key.trim() || !value.trim()) return;
    onFieldChange("governance_cadence_items", [...cadenceItems, { key: key.trim(), value: value.trim() }]);
  };

  const removeCadenceItem = (index: number) => {
    onFieldChange("governance_cadence_items", cadenceItems.filter((_, i) => i !== index));
  };

  const updateCadenceItem = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...cadenceItems];
    updated[index] = { ...updated[index], [field]: newValue };
    onFieldChange("governance_cadence_items", updated);
  };

  const addReportingItem = (key: string, value: string) => {
    if (!key.trim() || !value.trim()) return;
    onFieldChange("governance_reporting_items", [...reportingItems, { key: key.trim(), value: value.trim() }]);
  };

  const removeReportingItem = (index: number) => {
    onFieldChange("governance_reporting_items", reportingItems.filter((_, i) => i !== index));
  };

  const updateReportingItem = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...reportingItems];
    updated[index] = { ...updated[index], [field]: newValue };
    onFieldChange("governance_reporting_items", updated);
  };

  const addDecisionItem = (key: string, value: string) => {
    if (!key.trim() || !value.trim()) return;
    onFieldChange("governance_decision_items", [...decisionItems, { key: key.trim(), value: value.trim() }]);
  };

  const removeDecisionItem = (index: number) => {
    onFieldChange("governance_decision_items", decisionItems.filter((_, i) => i !== index));
  };

  const updateDecisionItem = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...decisionItems];
    updated[index] = { ...updated[index], [field]: newValue };
    onFieldChange("governance_decision_items", updated);
  };

  const handleGenerateAI = async () => {
    if (!onGenerateGovernance) return;
    setIsGenerating(true);
    await onGenerateGovernance(aiContext || "Generate standard governance and communication standards");
    setIsGenerating(false);
    setShowAiInput(false);
    setAiContext("");
  };

  return (
    <div className="space-y-8">
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Generation / Refinement
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAiInput(!showAiInput)}
          >
            <Sparkles className="h-3 w-3" /> Generate with AI
          </Button>
        </div>
        
        {showAiInput && (
          <div className="flex gap-2 animate-in slide-in-from-top-2">
            <Input
              placeholder="Describe your governance needs (optional)..."
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setShowAiInput(false);
                setAiContext("");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Cadence Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={cadenceSectionName}
              onChange={(e) => onFieldChange("governance_cadence_name", e.target.value)}
              className="h-8 w-40 text-base font-semibold border-dashed"
              placeholder="Section name..."
            />
            <span className="text-xs text-muted-foreground">(editable)</span>
          </div>
          <Badge variant="secondary">{cadenceItems.length} items</Badge>
        </div>
        
        <div className="space-y-3">
          {cadenceItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start group">
              <div className="w-1/3">
                <Select value={item.key} onValueChange={(val) => updateCadenceItem(idx, "key", val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCadenceOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  value={item.value}
                  onChange={(e) => updateCadenceItem(idx, "value", e.target.value)}
                  placeholder="Description (e.g., Every Monday at 10 AM)"
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeCadenceItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          {showAddCadenceTag ? (
            <div className="flex gap-2 items-center">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="h-9 flex-1"
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={addCustomCadenceTag} disabled={!newTagName.trim()}>
                Save Tag
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setShowAddCadenceTag(false); setNewTagName(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={cadenceSelectedKey} onValueChange={setCadenceSelectedKey}>
                <SelectTrigger className="h-9 w-1/3">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {allCadenceOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowAddCadenceTag(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Tag
              </Button>
              <Input
                value={cadenceCustomValue}
                onChange={(e) => setCadenceCustomValue(e.target.value)}
                placeholder="Description..."
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!cadenceSelectedKey || !cadenceCustomValue.trim()}
                onClick={() => {
                  addCadenceItem(cadenceSelectedKey, cadenceCustomValue);
                  setCadenceSelectedKey("");
                  setCadenceCustomValue("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reporting Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={reportingSectionName}
              onChange={(e) => onFieldChange("governance_reporting_name", e.target.value)}
              className="h-8 w-40 text-base font-semibold border-dashed"
              placeholder="Section name..."
            />
            <span className="text-xs text-muted-foreground">(editable)</span>
          </div>
          <Badge variant="secondary">{reportingItems.length} items</Badge>
        </div>
        
        <div className="space-y-3">
          {reportingItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start group">
              <div className="w-1/3">
                <Select value={item.key} onValueChange={(val) => updateReportingItem(idx, "key", val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allReportingOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  value={item.value}
                  onChange={(e) => updateReportingItem(idx, "value", e.target.value)}
                  placeholder="Description (e.g., Weekly progress report sent every Friday)"
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeReportingItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          {showAddReportingTag ? (
            <div className="flex gap-2 items-center">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="h-9 flex-1"
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={addCustomReportingTag} disabled={!newTagName.trim()}>
                Save Tag
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setShowAddReportingTag(false); setNewTagName(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={reportingSelectedKey} onValueChange={setReportingSelectedKey}>
                <SelectTrigger className="h-9 w-1/3">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {allReportingOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowAddReportingTag(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Tag
              </Button>
              <Input
                value={reportingCustomValue}
                onChange={(e) => setReportingCustomValue(e.target.value)}
                placeholder="Description..."
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!reportingSelectedKey || !reportingCustomValue.trim()}
                onClick={() => {
                  addReportingItem(reportingSelectedKey, reportingCustomValue);
                  setReportingSelectedKey("");
                  setReportingCustomValue("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Decision Rights Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={decisionSectionName}
              onChange={(e) => onFieldChange("governance_decision_name", e.target.value)}
              className="h-8 w-44 text-base font-semibold border-dashed"
              placeholder="Section name..."
            />
            <span className="text-xs text-muted-foreground">(editable)</span>
          </div>
          <Badge variant="secondary">{decisionItems.length} items</Badge>
        </div>
        
        <div className="space-y-3">
          {decisionItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start group">
              <div className="w-1/3">
                <Select value={item.key} onValueChange={(val) => updateDecisionItem(idx, "key", val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allDecisionOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  value={item.value}
                  onChange={(e) => updateDecisionItem(idx, "value", e.target.value)}
                  placeholder="Description (e.g., Final approval on all technical decisions)"
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeDecisionItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          {showAddDecisionTag ? (
            <div className="flex gap-2 items-center">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New role/tag name..."
                className="h-9 flex-1"
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={addCustomDecisionTag} disabled={!newTagName.trim()}>
                Save Tag
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setShowAddDecisionTag(false); setNewTagName(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={decisionSelectedKey} onValueChange={setDecisionSelectedKey}>
                <SelectTrigger className="h-9 w-1/3">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {allDecisionOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowAddDecisionTag(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Tag
              </Button>
              <Input
                value={decisionCustomValue}
                onChange={(e) => setDecisionCustomValue(e.target.value)}
                placeholder="Description..."
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!decisionSelectedKey || !decisionCustomValue.trim()}
                onClick={() => {
                  addDecisionItem(decisionSelectedKey, decisionCustomValue);
                  setDecisionSelectedKey("");
                  setDecisionCustomValue("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

