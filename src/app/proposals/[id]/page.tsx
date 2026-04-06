"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Proposal, type Template, type PlaceholderField, type ContentBlock, type Comment, type VisualPlaceholder } from "@/lib/supabase";
import { renderTemplate, extractHeadings } from "@/lib/template-generator";
import { toast } from "sonner";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowLeft,
  Save,
  FileText,
  Eye,
  Edit3,
  Loader2,
  Download,
  MessageSquare,
  History,
  Plus,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Send,
  X,
  Info,
  Lightbulb,
  Sparkles,
  Bold,
  Italic,
  Underline,
  Image,
  BarChart3,
  Table2,
  Type,
  MousePointer,
  Lock,
  Unlock,
  PieChart as PieChartIcon,
  TrendingUp,
  LayoutGrid,
  ChevronDown,
  Sun,
  Moon,
  GripVertical,
  ListChecks,
  ListOrdered,
  Calculator,
  CalendarRange,
  Layers,
  ChevronRight,
  Share2,
  Link as LinkIcon,
  Copy,
  Shield,
  Clock,
  EyeOff,
  PanelLeftClose,
  PanelLeft,
  Undo2,
  Redo2,
} from "lucide-react";
import { REUSABLE_BLOCK_CONFIGS, type ReusableBlockType } from "@/lib/reusable-blocks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { ProposalForm } from "@/components/proposal-form";
import { InlineFormatToolbar } from "@/components/inline-format-toolbar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "@/components/theme-provider";

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

const CHART_COLORS = ["#7c3aed", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];

function getChartColors(themeName: string): string[] {
  return COLOR_THEMES[themeName] || COLOR_THEMES.Auto;
}

function formatCurrency(amount: number): string {
  if (amount === 0) return "₹0";
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (absAmount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (absAmount >= 1000) {
    return `₹${(amount / 1000).toFixed(2)} K`;
  } else {
    return `₹${amount.toFixed(0)}`;
  }
}

function formatCurrencyShort(amount: number): string {
  if (amount === 0) return "₹0";
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  } else if (absAmount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (absAmount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  } else {
    return `₹${amount.toFixed(0)}`;
  }
}

type ChangeEntry = {
  field: string;
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
};

function getChanges(current: Record<string, unknown>, previous: Record<string, unknown>): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  const skipFields = ["_dynamic_sections"];
  
  const allKeys = new Set([...Object.keys(current), ...Object.keys(previous)]);
  
  for (const key of allKeys) {
    if (skipFields.includes(key)) continue;
    
    const currentVal = current[key];
    const prevVal = previous[key];
    
    const currentStr = JSON.stringify(currentVal);
    const prevStr = JSON.stringify(prevVal);
    
    if (currentStr !== prevStr) {
      if (prevVal === undefined || prevVal === null || prevVal === "") {
        if (currentVal !== undefined && currentVal !== null && currentVal !== "") {
          changes.push({ field: key, type: "added", newValue: currentVal });
        }
      } else if (currentVal === undefined || currentVal === null || currentVal === "") {
        changes.push({ field: key, type: "removed", oldValue: prevVal });
      } else {
        changes.push({ field: key, type: "modified", oldValue: prevVal, newValue: currentVal });
      }
    }
  }
  
  return changes;
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function truncateValue(value: unknown): string {
  if (value === undefined || value === null) return "-";
  
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.length} items]`;
  }
  
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    return `{${keys.slice(0, 2).join(", ")}${keys.length > 2 ? "..." : ""}}`;
  }
  
  const str = String(value);
  if (str.length > 50) {
    return str.substring(0, 50) + "...";
  }
  return str;
}

function InteractiveChartTooltip({ 
  children, 
  content, 
  isDark 
}: { 
  children: React.ReactNode; 
  content: React.ReactNode; 
  isDark: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {isVisible && (
        <div 
          className={`fixed z-50 px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none ${
            isDark ? "bg-slate-800 text-white border border-slate-700" : "bg-white text-slate-900 border border-slate-200"
          }`}
          style={{ 
            left: position.x + 15, 
            top: position.y - 10,
            transform: 'translateY(-50%)'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export default function ProposalEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showInsertVisual, setShowInsertVisual] = useState(false);
  const [insertVisualType, setInsertVisualType] = useState<"chart" | "table" | "image" | null>(null);
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null);
  const [newVisualData, setNewVisualData] = useState<Record<string, unknown>[]>([]);
  const [newVisualConfig, setNewVisualConfig] = useState<{
    name: string;
    chartType?: "bar" | "line" | "pie" | "area";
    columns: { key: string; label: string; type: string }[];
  }>({ name: "", columns: [] });
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("preview");
  const proposalTheme = globalTheme === "dark" ? "dark" : globalTheme === "light" ? "light" : "dark";
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    expires_in_days: 7,
    password: "",
    max_views: 0,
  });
  const [newShareLink, setNewShareLink] = useState<string | null>(null);
  const [showReusableBlockDialog, setShowReusableBlockDialog] = useState(false);
  const [selectedReusableBlockType, setSelectedReusableBlockType] = useState<string | null>(null);
  const [reusableBlockSectionName, setReusableBlockSectionName] = useState("");
  const [showAIAgentDialog, setShowAIAgentDialog] = useState(false);
  const [agentDescription, setAgentDescription] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [currentFormStage, setCurrentFormStage] = useState(1);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
const [insertImageAfterBlockId, setInsertImageAfterBlockId] = useState<string | null>(null);
    const [showHeaderPlaceholder, setShowHeaderPlaceholder] = useState(true);
    const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
    const [saveAsTemplateName, setSaveAsTemplateName] = useState("");
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('proposal_autosave_enabled');
      return saved === 'true';
    }
    return false;
  });
  
  const [undoStack, setUndoStack] = useState<Array<{proposal: Proposal, template: Template}>>([]);
  const [redoStack, setRedoStack] = useState<Array<{proposal: Proposal, template: Template}>>([]);
  const lastSavedState = useRef<{proposal: Proposal | null, template: Template | null}>({proposal: null, template: null});

  useEffect(() => {
    const handleFormStageChange = (event: CustomEvent<number>) => {
      setCurrentFormStage(event.detail);
    };
    window.addEventListener('setFormStage', handleFormStageChange as EventListener);
    return () => window.removeEventListener('setFormStage', handleFormStageChange as EventListener);
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, proposal, template]);
  
  const saveToUndoStack = useCallback(() => {
    if (proposal && template) {
      setUndoStack(prev => {
        const newStack = [...prev, { proposal: JSON.parse(JSON.stringify(proposal)), template: JSON.parse(JSON.stringify(template)) }];
        return newStack.slice(-50);
      });
      setRedoStack([]);
    }
  }, [proposal, template]);
  
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !proposal || !template) return;
    
    const newUndoStack = [...undoStack];
    const previousState = newUndoStack.pop();
    
    if (previousState) {
      setRedoStack(prev => [...prev, { proposal: JSON.parse(JSON.stringify(proposal)), template: JSON.parse(JSON.stringify(template)) }]);
      setUndoStack(newUndoStack);
      setProposal(previousState.proposal);
      setTemplate(previousState.template);
      setHasUnsavedChanges(true);
      toast.success("Undone");
    }
  }, [undoStack, proposal, template]);
  
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !proposal || !template) return;
    
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop();
    
    if (nextState) {
      setUndoStack(prev => [...prev, { proposal: JSON.parse(JSON.stringify(proposal)), template: JSON.parse(JSON.stringify(template)) }]);
      setRedoStack(newRedoStack);
      setProposal(nextState.proposal);
      setTemplate(nextState.template);
      setHasUnsavedChanges(true);
      toast.success("Redone");
    }
  }, [redoStack, proposal, template]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!template || !over || active.id === over.id) return;
    
    const oldIndex = template.content.findIndex((b) => b.id === active.id);
    const newIndex = template.content.findIndex((b) => b.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newContent = arrayMove(template.content, oldIndex, newIndex);
      setTemplate({ ...template, content: newContent });
      toast.success("Block moved");
    }
  };

  useEffect(() => {
    fetchProposal();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [params.id]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const autoSaveSetting = localStorage.getItem('proposal_autosave_enabled') === 'true';
      if (hasUnsavedChanges && !autoSaveSetting) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (proposal && template && params.id && autoSaveEnabled) {
      const draftKey = `proposal_draft_${params.id}`;
      const draft = {
        proposal: { filled_data: proposal.filled_data, title: proposal.title },
        template: { content: template.content, visual_placeholders: template.visual_placeholders },
        timestamp: Date.now()
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
    }, [proposal?.filled_data, proposal?.title, template?.content, template?.visual_placeholders, params.id, autoSaveEnabled]);
  
    async function fetchProposal() {
    const { data, error } = await supabase
      .from("proposals")
      .select("*, template:templates(*)")
      .eq("id", params.id)
      .single();

    if (error) {
      toast.error("Proposal not found");
      router.push("/proposals");
      return;
    }

    // Initialize template with content from proposal if available
    const proposalContent = data.content || data.template.content;
    const proposalVisualPlaceholders = data.visual_placeholders || data.template.visual_placeholders;
    
    const currentTemplate = {
      ...data.template,
      content: proposalContent,
      visual_placeholders: proposalVisualPlaceholders
    };

    const draftKey = `proposal_draft_${params.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    const autoSaveSetting = localStorage.getItem('proposal_autosave_enabled') === 'true';
    
    if (savedDraft && autoSaveSetting) {
      try {
        const draft = JSON.parse(savedDraft);
        const dbLastSaved = new Date(data.last_saved_at || data.updated_at || 0).getTime();
        const draftTimestamp = draft.timestamp || 0;
        
        if (draftTimestamp > dbLastSaved) {
          const mergedProposal = {
            ...data,
            filled_data: { ...data.filled_data, ...draft.proposal.filled_data },
            title: draft.proposal.title || data.title,
          };
          const mergedTemplate = {
            ...currentTemplate,
            content: draft.template.content || currentTemplate.content,
            visual_placeholders: draft.template.visual_placeholders || currentTemplate.visual_placeholders,
          };
          setProposal(mergedProposal);
          setTemplate(mergedTemplate);
          setHasUnsavedChanges(true);
          toast.info("Restored unsaved changes from your previous session");
        } else {
          setProposal(data);
          setTemplate(currentTemplate);
          localStorage.removeItem(draftKey);
        }
      } catch (e) {
        setProposal(data);
        setTemplate(currentTemplate);
      }
    } else {
        setProposal(data);
        setTemplate(currentTemplate);
        if (savedDraft && !autoSaveSetting) {
          localStorage.removeItem(draftKey);
        }
      }

      // Recalculate phase_pricing_table on load if feature_difficulties and feature_phases exist
      const filledData = data.filled_data || {};
      const features = filledData.feature_list as any[] || [];
      const featureDifficulties = filledData.feature_difficulties as Record<string, string> || {};
      const featurePhases = filledData.feature_phases as Record<string, number> || {};
      const phases = filledData.delivery_phases as any[] || [];
      
      if (phases.length > 0 && Object.keys(featureDifficulties).length > 0) {
        const difficultyHours = {
          easy: Number(filledData.effort_hours_easy) || 4,
          medium: Number(filledData.effort_hours_medium) || 8,
          complex: Number(filledData.effort_hours_complex) || 16
        };
        const hourlyRate = Number(filledData.effort_hourly_rate) || 100;
        const phaseBreakdownPercentages = filledData.phase_breakdown_percentages as Record<number, any[]> || {};
        
        const newPricing = phases.map((phase: any, idx: number) => {
          const phaseNum = idx + 1;
          const phaseFeatures = features.filter((f: any) => featurePhases[f.name] === phaseNum && featureDifficulties[f.name]);
          const phaseHours = phaseFeatures.reduce((total: number, f: any) => {
            const difficulty = featureDifficulties[f.name] as 'easy' | 'medium' | 'complex';
            return total + (difficulty ? difficultyHours[difficulty] : 0);
          }, 0);
          const phaseTimeCost = phaseHours * hourlyRate;
          const breakdown = phaseBreakdownPercentages[phaseNum] || [
            { item: "Development", percentage: 60 },
            { item: "Testing & QA", percentage: 20 },
            { item: "Project Management", percentage: 10 },
            { item: "Design", percentage: 10 }
          ];
            const breakdownCosts = breakdown.map((item: any) => ({
              item: item.item,
              contribution: item.percentage,
              cost: Math.round((phaseHours * (item.percentage / 100)) * hourlyRate)
            }));
          const phaseTotalCost = breakdownCosts.reduce((sum: number, item: any) => sum + item.cost, 0);
          
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
        
        const totalCost = newPricing.reduce((sum: number, p: any) => sum + p.cost, 0);
        
        // Update proposal with recalculated pricing
        setProposal(prev => prev ? {
          ...prev,
          filled_data: {
            ...prev.filled_data,
            phase_pricing_table: newPricing,
            total_cost: totalCost
          }
        } : prev);
      }

      const { data: commentsData } = await supabase
      .from("comments")
      .select("*")
      .eq("proposal_id", params.id)
      .order("created_at", { ascending: true });

    setComments(commentsData || []);
    setLoading(false);
  }

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    saveToUndoStack();
    setHasUnsavedChanges(true);
    setProposal((prev) => {
      if (!prev) return prev;
      
      const newFilledData = { ...prev.filled_data, [key]: value };
      
      if (key === "phase_pricing_table") {
        const pricing = value as any[] || [];
        const total = pricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
        newFilledData.total_cost = total;
      }
      
      const newProposal = {
        ...prev,
        title: key === "proposal_title" ? (value as string) : (key === "title" ? (value as string) : prev.title),
        filled_data: newFilledData,
      };

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      
      const autoSaveSetting = localStorage.getItem('proposal_autosave_enabled') === 'true';
      if (autoSaveSetting) {
        autoSaveTimer.current = setTimeout(() => {
          autoSave(newProposal);
        }, 2000);
      }

      return newProposal;
    });
  }, []);

  const autoSave = async (p: Proposal) => {
    const { error } = await supabase
      .from("proposals")
      .update({
        title: p.title,
        filled_data: p.filled_data,
        content: template?.content,
        visual_placeholders: template?.visual_placeholders,
        last_saved_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    
    if (!error && template) {
      const draftKey = `proposal_draft_${p.id}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
    }
  };

  const handleSave = async () => {
    if (!proposal || !template) return;
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    
    setShowCommitDialog(true);
  };

  const handleCommitSave = async () => {
    if (!proposal || !template) return;
    setSaving(true);

    const clientName = proposal.filled_data.client_name as string || proposal.client_name;
    
    const versionEntry = {
      version: proposal.version,
      filled_data: proposal.filled_data,
      template_content: template.content,
      visual_placeholders: template.visual_placeholders,
      saved_at: new Date().toISOString(),
      saved_by: "user",
      commit_message: commitMessage || "No message",
    };
    
    const newVersion = proposal.version + 1;
    const versionHistory = [...(proposal.version_history || []), versionEntry];
    
    const { error } = await supabase
      .from("proposals")
      .update({
        title: proposal.title,
        filled_data: proposal.filled_data,
        content: template.content,
        visual_placeholders: template.visual_placeholders,
        client_name: clientName,
        version: newVersion,
        version_history: versionHistory,
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Failed to save proposal");
    } else {
      setProposal({
        ...proposal,
        version: newVersion,
        version_history: versionHistory,
      });
      const draftKey = `proposal_draft_${proposal.id}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
      toast.success(`Changes committed as v${newVersion}`);
    }
    setSaving(false);
    setShowCommitDialog(false);
    setCommitMessage("");
  };

  const handleStatusChange = async (status: string) => {
    if (!proposal) return;

    const versionEntry = {
      version: proposal.version,
      filled_data: proposal.filled_data,
      saved_at: new Date().toISOString(),
      saved_by: "user",
    };

    const newVersion = status === "finalized" ? proposal.version + 1 : proposal.version;
    const versionHistory = status === "finalized" 
      ? [...(proposal.version_history || []), versionEntry]
      : proposal.version_history;

    const { error } = await supabase
      .from("proposals")
      .update({
        status,
        version: newVersion,
        version_history: versionHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      setProposal({ 
        ...proposal, 
        status: status as Proposal["status"], 
        version: newVersion,
        version_history: versionHistory 
      });
      toast.success(`Status updated to ${status}`);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !proposal) return;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        proposal_id: proposal.id,
        section_id: activeSection,
        content: newComment,
        author: "User",
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add comment");
    } else {
      setComments([...comments, data]);
      setNewComment("");
      toast.success("Comment added");
    }
  };

  const handleSignOff = async (stage: string, status: 'approved' | 'rejected', comments: string) => {
    if (!proposal) return;
    
    const newSignoffs = {
      ...(proposal.signoffs || {}),
      [stage]: {
        status,
        signed_by: "Current User",
        signed_at: new Date().toISOString(),
        comments
      }
    };
    
    const { error } = await supabase
      .from("proposals")
      .update({ signoffs: newSignoffs })
      .eq("id", proposal.id);
      
    if (error) {
      toast.error(`Failed to ${status} ${stage}`);
    } else {
      setProposal({ ...proposal, signoffs: newSignoffs });
      toast.success(`${stage} ${status}`);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .update({ status: "resolved" })
      .eq("id", commentId);

    if (error) {
      toast.error("Failed to resolve comment");
    } else {
      setComments(comments.map((c) => (c.id === commentId ? { ...c, status: "resolved" } : c)));
    }
  };

  const fetchShareLinks = async () => {
    if (!proposal) return;
    try {
      const response = await fetch(`/api/proposal-shares?proposal_id=${proposal.id}`);
      if (response.ok) {
        const data = await response.json();
        setShareLinks(data);
      }
    } catch (error) {
      console.error("Failed to fetch share links:", error);
    }
  };

  const handleCreateShareLink = async () => {
    if (!proposal || !template) return;
    setIsCreatingShare(true);
    try {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      
      const { error: proposalError } = await supabase
        .from("proposals")
        .update({
          title: proposal.title,
          filled_data: proposal.filled_data,
          content: template.content,
          visual_placeholders: template.visual_placeholders,
          last_saved_at: new Date().toISOString(),
        })
        .eq("id", proposal.id);

      if (proposalError) {
        throw new Error("Failed to save proposal data");
      }
      
      const draftKey = `proposal_draft_${proposal.id}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
      
      const response = await fetch("/api/proposal-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal_id: proposal.id,
          expires_in_days: shareSettings.expires_in_days || null,
          password: shareSettings.password || null,
          max_views: shareSettings.max_views || null,
          created_by: "user",
        }),
      });
      
      if (!response.ok) throw new Error("Failed to create share link");
      
      const data = await response.json();
      const fullUrl = `${window.location.origin}${data.share_url}`;
      setNewShareLink(fullUrl);
      await fetchShareLinks();
      toast.success("Changes saved and share link created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create share link");
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleDeleteShareLink = async (shareId: string) => {
    try {
      const response = await fetch(`/api/proposal-shares?share_id=${shareId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setShareLinks(shareLinks.filter((s) => s.id !== shareId));
        toast.success("Share link deleted");
      }
    } catch (error) {
      toast.error("Failed to delete share link");
    }
  };

  const handleToggleShareLink = async (shareId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/proposal-shares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_id: shareId, is_active: isActive }),
      });
      if (response.ok) {
        setShareLinks(shareLinks.map((s) => s.id === shareId ? { ...s, is_active: isActive } : s));
        toast.success(isActive ? "Link activated" : "Link deactivated");
      }
    } catch (error) {
      toast.error("Failed to update share link");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Link copied to clipboard!");
          return;
        } catch {
        }
      }
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        toast.success("Link copied to clipboard!");
      } else {
        toast.error("Failed to copy link");
      }
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

    const handleExportPDF = async () => {
      if (!previewRef.current || !template || !proposal) return;
      
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
        toast.error("Please allow popups to export PDF");
        return;
      }
      
      const isDark = proposalTheme === "dark";
      const bgColor = isDark ? "#0f172a" : "#ffffff";
      const textColor = isDark ? "#f8fafc" : "#1e293b";
      const borderColor = isDark ? "#334155" : "#e2e8f0";
      const mutedColor = isDark ? "#94a3b8" : "#64748b";
      const cardBg = isDark ? "#1e293b" : "#f8fafc";
      const chartColors = getChartColors(proposal.filled_data.chart_color_theme as string || "Auto");
      
      const headings = extractHeadings(renderedContent, proposal?.filled_data);
      const cleanHeadings = headings.map((h, i) => {
        const cleanTitle = h.title.replace(/^\d+\.\s*/, '');
        return `<div style="padding: 8px 0; border-bottom: 1px dotted ${borderColor}; color: ${textColor};">${i + 1}. ${cleanTitle}</div>`;
      }).join('');
      
      const clonedContent = previewRef.current.cloneNode(true) as HTMLElement;
      
      clonedContent.querySelectorAll('button').forEach(btn => btn.remove());
      clonedContent.querySelectorAll('.group-hover\\:opacity-100').forEach(el => (el as HTMLElement).remove());
      clonedContent.querySelectorAll('[class*="opacity-0"]').forEach(el => (el as HTMLElement).remove());
      clonedContent.querySelectorAll('.absolute.-right-2').forEach(el => (el as HTMLElement).remove());
      clonedContent.querySelectorAll('.absolute.-left-8').forEach(el => (el as HTMLElement).remove());
      clonedContent.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      clonedContent.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));
      
      clonedContent.querySelectorAll('[class*="cursor-"]').forEach(el => {
        el.classList.forEach(c => { if (c.includes('cursor-')) el.classList.remove(c); });
      });
      
      clonedContent.querySelectorAll('.recharts-wrapper').forEach(el => el.remove());
      clonedContent.querySelectorAll('.recharts-responsive-container').forEach(el => el.remove());
      clonedContent.querySelectorAll('[class*="recharts"]').forEach(el => el.remove());
      clonedContent.querySelectorAll('svg').forEach(el => {
        const viewBox = el.getAttribute('viewBox');
        if (viewBox && (viewBox.includes('0 0 100 100') || viewBox.includes('0 0 400') || viewBox.includes('0 0 500'))) {
          const parent = el.closest('.rounded-2xl, .rounded-xl, [class*="bg-gradient"], [class*="p-4"], [class*="p-6"]');
          if (parent) parent.remove();
          else el.remove();
        }
      });
      clonedContent.querySelectorAll('[class*="pdf-inline-chart"]').forEach(el => el.remove());
      clonedContent.querySelectorAll('[class*="grid"][class*="gap"]').forEach(el => {
        if (el.querySelector('svg') || el.querySelector('[class*="recharts"]')) {
          const hasOnlyCharts = Array.from(el.children).every(child => 
            child.querySelector('svg') || child.querySelector('[class*="recharts"]') || 
            child.textContent?.includes('Distribution') || child.textContent?.includes('Breakdown')
          );
          if (hasOnlyCharts && el.children.length <= 4) {
            el.remove();
          }
        }
      });
      clonedContent.querySelectorAll('[class*="rounded-2xl"], [class*="rounded-xl"]').forEach(el => {
        const hasChart = el.querySelector('svg') || el.querySelector('[class*="recharts"]');
        const text = el.textContent || '';
        if (hasChart && (text.includes('Distribution') || text.includes('by Phase') || text.includes('by App') || text.includes('Engagement') || text.includes('Timeline') || text.includes('Role') || text.includes('Resource'))) {
          el.remove();
        }
        if (text.includes('Role & Count') || text.includes('% of Engagement') || text.includes('Engagement (%)') || (text.includes('Role') && text.includes('%'))) {
          el.remove();
        }
      });
    
    const allStyles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');
    
    const contentHtml = clonedContent.innerHTML;
    
    const featureList = proposal.filled_data.feature_list as any[] || [];
    const deliveryPhases = proposal.filled_data.delivery_phases as any[] || [];
    const resources = proposal.filled_data.resource_plan as any[] || [];
    const phasePricing = proposal.filled_data.phase_pricing_table as any[] || [];
    
    const generateFeaturesChartHTML = () => {
      if (featureList.length === 0) return '';
      
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
      const maxBarCount = Math.max(...barChartData.map(d => d.count));
      
      let pieSegments = '';
      let prevPercent = 0;
      appChartData.forEach((item) => {
        const percent = (item.value / totalFeatures) * 100;
        const circumference = 2 * Math.PI * 40;
        const strokeDasharray = `${percent / 100 * circumference} ${circumference}`;
        const strokeDashoffset = -prevPercent / 100 * circumference;
        pieSegments += `<circle cx="50" cy="50" r="40" fill="none" stroke="${item.color}" stroke-width="8" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"/>`;
        prevPercent += percent;
      });
      
      const legendItems = appChartData.map((item) => 
        `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><div style="width: 12px; height: 12px; border-radius: 2px; background: ${item.color};"></div><span style="color: ${textColor};">${item.name}: ${item.value} (${item.percent}%)</span></div>`
      ).join('');
      
      const barItems = barChartData.map((item, i) => 
        `<div style="display: flex; align-items: center; gap: 12px; margin: 8px 0;">
          <div style="width: 150px; text-align: right; font-size: 12px; color: ${mutedColor};">${item.name}</div>
          <div style="flex: 1; height: 20px; background: ${isDark ? '#334155' : '#e2e8f0'}; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(item.count / maxBarCount) * 100}%; background: ${chartColors[i % chartColors.length]}; border-radius: 4px;"></div>
          </div>
          <div style="width: 60px; font-size: 12px; font-weight: 600; color: ${textColor};">${item.count} (${Math.round(item.count / totalFeatures * 100)}%)</div>
        </div>`
      ).join('');
      
      return `
        <div class="pdf-inline-chart" style="margin: 32px 0; padding: 24px; background: ${cardBg}; border-radius: 12px; border: 1px solid ${borderColor};">
          <div style="display: flex; gap: 40px; flex-wrap: wrap; justify-content: center; align-items: flex-start;">
            <div style="text-align: center;">
              <h5 style="font-size: 13px; font-weight: 600; color: ${textColor}; margin-bottom: 16px;">Requirements by App</h5>
              <div style="position: relative; width: 160px; height: 160px; margin: 0 auto;">
                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">${pieSegments}</svg>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <span style="font-size: 28px; font-weight: 700; color: ${textColor};">${totalFeatures}</span>
                  <span style="font-size: 10px; color: ${mutedColor};">Total</span>
                </div>
              </div>
              <div style="margin-top: 12px; text-align: left;">${legendItems}</div>
            </div>
            <div style="flex: 1; min-width: 280px;">
              <h5 style="font-size: 13px; font-weight: 600; color: ${textColor}; margin-bottom: 16px;">Requirements by Category</h5>
              ${barItems}
            </div>
          </div>
        </div>`;
    };
    
    const generateDeliveryChartHTML = () => {
      if (deliveryPhases.length === 0) return '';
      
      const phaseDurations = deliveryPhases.map((p: any) => Math.max((p.weeks_end || 0) - (p.weeks_start || 0), 0));
      const totalDuration = Math.max(phaseDurations.reduce((sum: number, d: number) => sum + d, 0), 1);
      
      let phaseSegments = '';
      let prevPercent = 0;
      phaseDurations.forEach((duration, i) => {
        const percent = (duration / totalDuration) * 100;
        const circumference = 2 * Math.PI * 40;
        const strokeDasharray = `${percent / 100 * circumference} ${circumference}`;
        const strokeDashoffset = -prevPercent / 100 * circumference;
        phaseSegments += `<circle cx="50" cy="50" r="40" fill="none" stroke="${chartColors[i % chartColors.length]}" stroke-width="8" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"/>`;
        prevPercent += percent;
      });
      
      const phaseLegend = phaseDurations.map((duration, i) => 
        `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><div style="width: 12px; height: 12px; border-radius: 2px; background: ${chartColors[i % chartColors.length]};"></div><span style="color: ${textColor};">Phase ${i+1}: ${duration}w (${Math.round(duration / totalDuration * 100)}%)</span></div>`
      ).join('');
      
      return `
        <div class="pdf-inline-chart" style="margin: 32px 0; padding: 24px; background: ${cardBg}; border-radius: 12px; border: 1px solid ${borderColor};">
          <div style="display: flex; justify-content: center; align-items: flex-start;">
            <div style="text-align: center;">
              <h5 style="font-size: 13px; font-weight: 600; color: ${textColor}; margin-bottom: 16px;">Duration by Phase</h5>
              <div style="position: relative; width: 180px; height: 180px; margin: 0 auto;">
                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">${phaseSegments}</svg>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; font-weight: 700; color: ${textColor};">${totalDuration}</span>
                  <span style="font-size: 11px; color: ${mutedColor};">Weeks</span>
                </div>
              </div>
              <div style="margin-top: 16px; text-align: left;">${phaseLegend}</div>
            </div>
          </div>
        </div>`;
    };
    
      const generateResourcesChartHTML = () => {
        if (resources.length === 0) return '';
        
        const engagementBars = resources.map((res: any, i: number) => {
          const val = res.allocation || 100;
          return `<div style="display: flex; align-items: center; gap: 12px; margin: 6px 0;">
            <div style="width: 130px; text-align: right; font-size: 11px; color: ${textColor};">${res.role}</div>
            <div style="flex: 1; height: 10px; background: ${isDark ? '#334155' : '#e2e8f0'}; border-radius: 5px; overflow: hidden;">
              <div style="height: 100%; width: ${val}%; background: ${chartColors[i % chartColors.length]}; border-radius: 5px;"></div>
            </div>
            <div style="width: 40px; font-size: 11px; font-weight: 600; color: ${textColor};">${val}%</div>
          </div>`;
        }).join('');
        
        return `
          <div class="pdf-inline-chart" style="margin: 32px 0; padding: 24px; background: ${cardBg}; border-radius: 12px; border: 1px solid ${borderColor};">
            <div style="display: flex; justify-content: center;">
              <div style="flex: 1; max-width: 500px;">
                <h5 style="font-size: 13px; font-weight: 600; color: ${textColor}; margin-bottom: 16px;">Engagement (%)</h5>
                ${engagementBars}
              </div>
            </div>
          </div>`;
    };
    
    const generatePricingChartHTML = () => {
      if (phasePricing.length === 0) return '';
      
      const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
      
      let pricingSegments = '';
      let prevPercent = 0;
      phasePricing.forEach((p: any, i: number) => {
        const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / phasePricing.length);
        const circumference = 2 * Math.PI * 40;
        const strokeDasharray = `${percent / 100 * circumference} ${circumference}`;
        const strokeDashoffset = -prevPercent / 100 * circumference;
        pricingSegments += `<circle cx="50" cy="50" r="40" fill="none" stroke="${chartColors[i % chartColors.length]}" stroke-width="10" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"/>`;
        prevPercent += percent;
      });
      
      const pricingLegend = phasePricing.map((p: any, i: number) => 
        `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><div style="width: 12px; height: 12px; border-radius: 2px; background: ${chartColors[i % chartColors.length]};"></div><span style="color: ${textColor};">${p.phase}: ${formatCurrencyShort(Number(p.cost))}</span></div>`
      ).join('');
      
      const phaseBreakdowns = phasePricing.map((p: any, phaseIdx: number) => {
        if (!p.breakdown || p.breakdown.length === 0) return '';
        const breakdownItems = p.breakdown.map((b: any, i: number) => {
          const percentage = (Number(b.cost) / (Number(p.cost) || 1)) * 100;
          return `<div style="margin: 5px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px;">
              <span style="color: ${mutedColor};">${b.item}</span>
              <span style="color: ${textColor}; font-weight: 500;">${formatCurrencyShort(Number(b.cost))}</span>
            </div>
            <div style="height: 5px; background: ${isDark ? '#334155' : '#e2e8f0'}; border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${percentage}%; background: ${chartColors[i % chartColors.length]}; border-radius: 3px;"></div>
            </div>
          </div>`;
        }).join('');
        
        return `<div style="flex: 1; min-width: 180px; padding: 14px; background: ${isDark ? '#1e293b' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${borderColor};">
          <div style="font-size: 12px; font-weight: 600; color: ${textColor}; margin-bottom: 10px;">${p.phase}</div>
          <div style="font-size: 18px; font-weight: 700; color: ${chartColors[phaseIdx % chartColors.length]}; margin-bottom: 10px;">${formatCurrency(Number(p.cost))}</div>
          ${breakdownItems}
        </div>`;
      }).join('');
      
      return `
        <div class="pdf-inline-chart" style="margin: 32px 0; padding: 24px; background: ${cardBg}; border-radius: 12px; border: 1px solid ${borderColor};">
          <div style="display: flex; gap: 32px; flex-wrap: wrap; justify-content: center; align-items: flex-start; margin-bottom: 24px;">
            <div style="text-align: center;">
              <h5 style="font-size: 13px; font-weight: 600; color: ${textColor}; margin-bottom: 16px;">Cost Distribution</h5>
              <div style="position: relative; width: 160px; height: 160px; margin: 0 auto;">
                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">${pricingSegments}</svg>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <span style="font-size: 16px; font-weight: 700; color: ${textColor};">${formatCurrencyShort(totalCost)}</span>
                  <span style="font-size: 9px; color: ${mutedColor};">Total</span>
                </div>
              </div>
              <div style="margin-top: 12px; text-align: left;">${pricingLegend}</div>
            </div>
          </div>
          <h5 style="font-size: 13px; font-weight: 600; color: ${textColor}; margin-bottom: 14px;">Phase Breakdown</h5>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">${phaseBreakdowns}</div>
        </div>`;
    };
    
      const featuresChart = generateFeaturesChartHTML();
      const deliveryChart = generateDeliveryChartHTML();
      const resourcesChart = generateResourcesChartHTML();
      const pricingChart = generatePricingChartHTML();
      
      const generateFeatureTableHTML = () => {
        if (featureList.length === 0) return '';
        
        const tableRows = featureList.map((feature: any, idx: number) => `
          <tr style="border-bottom: 1px solid ${borderColor};">
            <td style="padding: 10px 12px; font-size: 11px; color: ${textColor}; text-align: center;">${feature.category || 'User'}</td>
            <td style="padding: 10px 12px; font-size: 11px; color: ${mutedColor}; text-align: center;">${feature.subcategory || 'General'}</td>
            <td style="padding: 10px 12px; font-size: 12px; font-weight: 500; color: ${textColor};">${feature.name || ''}</td>
          </tr>
        `).join('');
        
        return `
          <div class="pdf-page-break"></div>
          <div class="pdf-inline-chart" style="margin: 24px 0;">
            <h5 style="font-size: 14px; font-weight: 600; color: ${textColor}; margin-bottom: 16px;">Feature Requirements List</h5>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden; font-size: 12px;">
              <thead>
                <tr style="background: ${isDark ? '#1e293b' : '#f1f5f9'};">
                  <th style="padding: 12px; font-size: 11px; font-weight: 600; color: ${textColor}; text-align: center; border-bottom: 2px solid ${borderColor};">App</th>
                  <th style="padding: 12px; font-size: 11px; font-weight: 600; color: ${textColor}; text-align: center; border-bottom: 2px solid ${borderColor};">Category</th>
                  <th style="padding: 12px; font-size: 11px; font-weight: 600; color: ${textColor}; text-align: left; border-bottom: 2px solid ${borderColor};">Feature</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>`;
      };
      
      const featureTable = generateFeatureTableHTML();
      
      let processedContent = contentHtml;
      
      const injectedSections = new Set<string>();
      
      const injectAfterSectionHeading = (html: string, sectionPattern: RegExp, contentToInject: string, sectionKey: string) => {
        if (!contentToInject) return html;
        if (injectedSections.has(sectionKey)) return html;
        
        const match = html.match(sectionPattern);
        if (match && match.index !== undefined) {
          injectedSections.add(sectionKey);
          
          const afterMatch = html.slice(match.index);
          const nextH2Match = afterMatch.slice(match[0].length).match(/<h2[^>]*>/i);
          let sectionEnd = nextH2Match ? match.index + match[0].length + nextH2Match.index! : html.length;
          
          const pageBreakMatch = afterMatch.slice(match[0].length).match(/class="pdf-page-break"/i);
          if (pageBreakMatch && pageBreakMatch.index! < (nextH2Match?.index || Infinity)) {
            sectionEnd = match.index + match[0].length + pageBreakMatch.index!;
          }
          
          return html.slice(0, sectionEnd) + contentToInject + html.slice(sectionEnd);
        }
        return html;
      };
      
      processedContent = injectAfterSectionHeading(processedContent, /<h2[^>]*>[^<]*Features\s*(&amp;|&|and)\s*Requirements[^<]*<\/h2>/i, featuresChart + featureTable, 'features');
      processedContent = injectAfterSectionHeading(processedContent, /<h2[^>]*>[^<]*(Delivery\s*Plan|Phases\s*(&amp;|&|and)\s*Timelines)[^<]*<\/h2>/i, deliveryChart, 'delivery');
      processedContent = injectAfterSectionHeading(processedContent, /<h2[^>]*>[^<]*(Resource\s*Engagement|Resource\s*Plan|Team\s*Composition)[^<]*<\/h2>/i, resourcesChart, 'resources');
      processedContent = injectAfterSectionHeading(processedContent, /<h2[^>]*>[^<]*(Pricing|Cost\s*Breakdown|Investment\s*Summary)[^<]*<\/h2>/i, pricingChart, 'pricing');
    
    const sanitizedContent = processedContent
      .replace(/class="pdf-page-break">/g, 'class="pdf-page-break"></div><div style="display:none;">')
      .replace(/class=['"]pdf-page-break['"]>\s*</g, 'class="pdf-page-break"></div><');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${proposal.title || "Proposal"} - PDF Export</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            ${allStyles}
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            html, body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: ${bgColor} !important;
              color: ${textColor};
              line-height: 1.8;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              min-height: 100%;
            }
            
            .cover-page {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              page-break-after: always;
              background: ${bgColor} !important;
            }
            
            .cover-page h1 { 
              font-size: 42px; 
              font-weight: 700; 
              margin-bottom: 32px; 
              color: ${textColor}; 
            }
            
            .cover-page p { 
              font-size: 18px; 
              color: ${mutedColor}; 
              margin-bottom: 12px; 
            }
            
            .toc-page {
              padding: 60px 40px;
              page-break-after: always;
              background: ${bgColor} !important;
              min-height: 100vh;
            }
            
            .toc-page h2 { 
              font-size: 28px; 
              font-weight: 700; 
              margin-bottom: 40px; 
              text-align: center; 
              color: ${textColor}; 
            }
            
            .toc-items { 
              max-width: 500px; 
              margin: 0 auto; 
              font-size: 14px;
              color: ${textColor};
            }
            
            .content-wrapper {
              padding: 40px;
              background: ${bgColor} !important;
              min-height: 100vh;
            }
            
            .proposal-content {
              max-width: 900px;
              margin: 0 auto;
              background: ${bgColor} !important;
              padding: 40px;
            }
            
            .pdf-all-charts-section {
              page-break-inside: avoid;
              break-inside: avoid;
              margin: 60px 0 !important;
              padding: 32px !important;
            }
            
            .pdf-inline-chart {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-before: auto;
              page-break-after: auto;
              margin: 24px 0 !important;
            }
            
            button { display: none !important; }
            [class*="cursor-pointer"] { cursor: default !important; }
            
            .rounded-2xl, .rounded-xl, .rounded-lg {
              border-radius: 12px;
              background: ${cardBg} !important;
            }
            
            svg { max-width: 100%; height: auto; }
            
            h1 { 
              color: ${textColor} !important; 
              margin-top: 40px !important;
              margin-bottom: 24px !important;
            }
            h2 { 
              color: ${textColor} !important; 
              border-color: ${borderColor} !important; 
              page-break-before: auto;
              page-break-after: avoid;
              page-break-inside: avoid;
              margin-top: 48px !important;
              margin-bottom: 28px !important;
              padding-bottom: 12px !important;
            }
            h2:first-child {
              margin-top: 0 !important;
            }
            h3 { 
              color: ${textColor} !important; 
              page-break-after: avoid;
              margin-top: 32px !important;
              margin-bottom: 20px !important;
            }
            p { 
              color: ${textColor} !important; 
              orphans: 3;
              widows: 3;
              margin-bottom: 16px !important;
            }
            li { 
              color: ${textColor} !important; 
              margin-bottom: 8px !important;
            }
            ul, ol {
              margin-bottom: 20px !important;
            }
            strong { color: ${textColor} !important; font-weight: 600; }
            span { color: ${textColor}; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
              page-break-inside: avoid;
            }
            
            th, td {
              padding: 12px 14px;
              text-align: left;
              border: 1px solid ${borderColor};
              font-size: 12px;
            }
            
            th {
              background: ${isDark ? '#1e293b' : '#f1f5f9'} !important;
              font-weight: 600;
              color: ${textColor} !important;
            }
            
            td {
              color: ${textColor} !important;
            }
            
            .group:hover .group-hover\\:opacity-100 { display: none !important; }
            
            .pdf-page-break {
              page-break-before: always;
              break-before: page;
              height: 0;
              margin: 0;
              padding: 0;
              display: block;
              visibility: hidden;
              font-size: 0;
              line-height: 0;
            }
            
            .rounded-2xl, .rounded-xl {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            svg, .recharts-wrapper, canvas, img {
              page-break-inside: avoid;
              break-inside: avoid;
              max-height: 400px;
            }
            
            ul, ol {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            [class*="space-y-"] > div {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            h2 + *, h3 + * {
              page-break-before: avoid;
            }
            
            @media print {
                html, body { 
                  -webkit-print-color-adjust: exact !important; 
                  print-color-adjust: exact !important;
                  background: ${bgColor} !important;
                  background-color: ${bgColor} !important;
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .cover-page { 
                page-break-after: always; 
                background: ${bgColor} !important;
                background-color: ${bgColor} !important;
              }
              .toc-page { 
                page-break-after: always; 
                background: ${bgColor} !important;
                background-color: ${bgColor} !important;
              }
              .content-wrapper { 
                background: ${bgColor} !important;
                background-color: ${bgColor} !important;
              }
              .proposal-content {
                background: ${bgColor} !important;
                background-color: ${bgColor} !important;
              }
              .no-print { display: none !important; }
              
              .pdf-page-break {
                  page-break-before: always !important;
                  break-before: page !important;
                }
                
                .pdf-inline-chart {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            
            @page { 
              size: A4; 
              margin: 15mm;
            }
        </style>
      </head>
      <body style="background: ${bgColor} !important; background-color: ${bgColor} !important; min-height: 100vh;">
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: ${bgColor}; z-index: -1;"></div>
        <div class="cover-page" style="background: ${bgColor} !important; background-color: ${bgColor} !important;">
          <h1>${proposal.title || "Business Proposal"}</h1>
          <p>Prepared for: <strong style="color: ${textColor};">${proposal.filled_data.client_name || proposal.client_name || "Client"}</strong></p>
          <p>Template: ${template.proposal_type}</p>
          <p>Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div class="toc-page" style="background: ${bgColor} !important;">
          <h2>Table of Contents</h2>
          <div class="toc-items">${cleanHeadings}</div>
        </div>
        
          <div class="content-wrapper" style="background: ${bgColor} !important;">
              <div class="proposal-content" style="background: ${bgColor} !important;">
                ${sanitizedContent}
              </div>
            </div>
        </body>
        </html>
      `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      toast.success("Print dialog opened - Save as PDF!");
    }, 1500);
  };

  const handleExportWord = async () => {
    if (!proposal || !template) return;
    
    toast.loading("Generating Word document...", { id: "word-export" });
    
    try {
      const chartImages: Record<string, string> = {};
      
      const chartContainers = previewRef.current?.querySelectorAll('.recharts-wrapper, svg[viewBox="0 0 100 100"]');
      if (chartContainers) {
        for (let i = 0; i < Math.min(chartContainers.length, 4); i++) {
          try {
            const container = chartContainers[i] as HTMLElement;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (container.tagName === 'svg' || container.querySelector('svg')) {
              const svgElement = container.tagName === 'svg' ? container : container.querySelector('svg');
              if (svgElement) {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                const img = new window.Image();
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  img.src = url;
                });
                
                canvas.width = img.width || 500;
                canvas.height = img.height || 300;
                ctx?.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                
                const dataUrl = canvas.toDataURL('image/png');
                const chartType = i === 0 ? 'features' : i === 1 ? 'delivery' : i === 2 ? 'resources' : 'pricing';
                chartImages[chartType] = dataUrl;
              }
            }
          } catch (e) {
            console.error(`Failed to capture chart ${i}:`, e);
          }
        }
      }

      const response = await fetch("/api/export-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          chartImages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate Word document");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal.title || "Proposal"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Word document downloaded!", { id: "word-export" });
    } catch (error: any) {
      console.error("Word export error:", error);
      toast.error(error.message || "Failed to export Word document", { id: "word-export" });
    }
  };

  const handleClone = async () => {
    if (!proposal) return;
    setSaving(true);
    const { id, created_at, updated_at, ...rest } = proposal;
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        ...rest,
        title: `${proposal.title} (Clone)`,
        status: "draft",
        version: 1,
        version_history: [],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to clone proposal");
    } else {
      toast.success("Proposal cloned successfully");
      router.push(`/proposals/${data.id}`);
    }
    setSaving(false);
  };

  const handleCreateVersion = async () => {
    if (!proposal) return;
    setSaving(true);
    const versionEntry = {
      version: proposal.version,
      filled_data: proposal.filled_data,
      saved_at: new Date().toISOString(),
      saved_by: "user",
    };
    
    const newVersion = proposal.version + 1;
    const { error } = await supabase
      .from("proposals")
      .update({
        version: newVersion,
        version_history: [...(proposal.version_history || []), versionEntry],
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);

    if (error) {
        toast.error("Failed to create new version");
      } else {
        setProposal({
          ...proposal,
          version: newVersion,
          version_history: [...(proposal.version_history || []), versionEntry],
        });
        toast.success(`Version ${newVersion} created`);
      }
      setSaving(false);
    };

    const handleSaveAsTemplate = async () => {
      if (!proposal || !template) return;
      setSaveAsTemplateName(`${proposal.title} Template`);
      setShowSaveAsTemplateDialog(true);
    };

    const confirmSaveAsTemplate = async () => {
      if (!proposal || !template || !saveAsTemplateName.trim()) return;
      
      setSaving(true);
      try {
        const { data: newTemplate, error } = await supabase
          .from("templates")
          .insert({
            name: saveAsTemplateName.trim(),
            proposal_type: template.proposal_type,
            industry: template.industry || "General",
            description: `Template created from proposal: ${proposal.title}`,
            content: template.content,
            placeholders_schema: template.placeholders_schema,
            visual_placeholders: template.visual_placeholders,
            fixed_sections: template.fixed_sections || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        
        setShowSaveAsTemplateDialog(false);
        setSaveAsTemplateName("");
        toast.success("Template saved successfully!");
        router.push(`/templates/${newTemplate.id}`);
      } catch (error: any) {
        toast.error(error.message || "Failed to save template");
      } finally {
        setSaving(false);
      }
    };

  const toggleLock = async () => {
    if (!proposal) return;
    const newLocked = !proposal.is_locked;
    const { error } = await supabase
      .from("proposals")
      .update({ is_locked: newLocked })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Failed to update lock status");
    } else {
      setProposal({ ...proposal, is_locked: newLocked });
      toast.success(newLocked ? "Proposal locked (read-only)" : "Proposal unlocked");
    }
  };
  const handleRestoreVersion = async (versionEntry: any) => {
      if (!proposal || !template) return;
      
      saveToUndoStack();
      
      const restoredFilledData = versionEntry.filled_data || versionEntry;
      const restoredTemplateContent = versionEntry.template_content || template.content;
      const restoredVisualPlaceholders = versionEntry.visual_placeholders || template.visual_placeholders;
      
      const newProposal = { 
        ...proposal, 
        filled_data: restoredFilledData 
      };
      
      const newTemplate = { 
        ...template, 
        content: restoredTemplateContent,
        visual_placeholders: restoredVisualPlaceholders 
      };
      
      setProposal(newProposal);
      setTemplate(newTemplate);
      
      await supabase
        .from("proposals")
        .update({ 
          filled_data: restoredFilledData, 
          content: restoredTemplateContent,
          visual_placeholders: restoredVisualPlaceholders,
          updated_at: new Date().toISOString() 
        })
        .eq("id", proposal.id);
      
      const draftKey = `proposal_draft_${proposal.id}`;
      localStorage.removeItem(draftKey);
      
      setShowVersionHistory(false);
      setHasUnsavedChanges(false);
      toast.success(`Restored to v${versionEntry.version} (all data and outline restored)`);
    };

  const handleUpdateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    if (!template) return;
    saveToUndoStack();
    setHasUnsavedChanges(true);
    const newContent = template.content.map((block) =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    setTemplate({ ...template, content: newContent });
    
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const autoSaveSetting = localStorage.getItem('proposal_autosave_enabled') === 'true';
    if (autoSaveSetting && proposal) {
      autoSaveTimer.current = setTimeout(() => {
        autoSave(proposal);
      }, 2000);
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!template) return;
    saveToUndoStack();
    
    // Check if this block is part of a dynamic section
    const dynamicSections = proposal?.filled_data._dynamic_sections as any[] || [];
    const sectionToRemove = dynamicSections.find(s => s.headingBlockId === blockId || s.contentBlockId === blockId);
    
    let newContent = template.content.filter((block) => block.id !== blockId);
    let newDynamicSections = dynamicSections;

    if (sectionToRemove) {
      // If deleting one part of a dynamic section, delete the other part too and clean up form
      newContent = newContent.filter(b => b.id !== sectionToRemove.headingBlockId && b.id !== sectionToRemove.contentBlockId);
      newDynamicSections = dynamicSections.filter(s => s.key !== sectionToRemove.key);
      
      if (proposal) {
        setProposal({
          ...proposal,
          filled_data: {
            ...proposal.filled_data,
            _dynamic_sections: newDynamicSections
          }
        });
      }
      toast.success("Section and associated form data removed");
    } else {
      toast.success("Block deleted");
    }

    setTemplate({ ...template, content: newContent });
  };

  const handleInsertBlock = (afterBlockId: string, newBlock: ContentBlock) => {
    if (!template) return;
    const index = template.content.findIndex((b) => b.id === afterBlockId);
    const newContent = [...template.content];
    newContent.splice(index + 1, 0, newBlock);
    setTemplate({ ...template, content: newContent });
  };

  const handleMakeFieldDynamic = (blockId: string, selectedText: string) => {
    if (!template || !selectedText.trim()) return;
    
    const fieldKey = selectedText.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const placeholder = `{{${fieldKey}}}`;
    
    const block = template.content.find((b) => b.id === blockId);
    if (!block || block.type !== "paragraph") return;
    
    const newContent = block.content.replace(selectedText, placeholder);
    handleUpdateBlock(blockId, { content: newContent });
    
    const newField: PlaceholderField = {
      key: fieldKey,
      label: selectedText,
      type: "text",
      required: false,
    };
    
    if (!template.placeholders_schema.find((f) => f.key === fieldKey)) {
      setTemplate({
        ...template,
        placeholders_schema: [...template.placeholders_schema, newField],
        content: template.content.map((b) =>
          b.id === blockId ? { ...b, content: newContent } : b
        ),
      });
    }
    
    toast.success(`Created dynamic field: ${selectedText}`);
  };

  const handleMakeFieldStatic = (blockId: string, placeholder: string) => {
    if (!template || !proposal) return;
    
    const match = placeholder.match(/\{\{(\w+)\}\}/);
    if (!match) return;
    
    const fieldKey = match[1];
    const value = proposal.filled_data[fieldKey] as string || placeholder;
    
    const block = template.content.find((b) => b.id === blockId);
    if (!block || block.type !== "paragraph") return;
    
    const newContent = block.content.replace(placeholder, value);
    handleUpdateBlock(blockId, { content: newContent });
    
    toast.success("Field converted to static text");
  };

  const handleHeaderImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !proposal) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proposalId", proposal.id);
      formData.append("imageType", "header");

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const { url } = await response.json();
      
      await supabase
        .from("proposals")
        .update({ header_image_url: url })
        .eq("id", proposal.id);

      setProposal({ ...proposal, header_image_url: url });
      toast.success("Header image uploaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      if (headerImageInputRef.current) {
        headerImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveHeaderImage = async () => {
    if (!proposal?.header_image_url) return;

    try {
      await supabase
        .from("proposals")
        .update({ header_image_url: null })
        .eq("id", proposal.id);

      setProposal({ ...proposal, header_image_url: null });
      toast.success("Header image removed");
    } catch (error) {
      toast.error("Failed to remove image");
    }
  };

  const handleContentImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !proposal || !template || !insertImageAfterBlockId) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proposalId", proposal.id);
      formData.append("imageType", "content");

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const { url } = await response.json();
      
      const newBlock: ContentBlock = {
        id: uuidv4(),
        type: "image",
        content: url,
      };
      
      handleInsertBlock(insertImageAfterBlockId, newBlock);
      toast.success("Image added to proposal");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      setInsertImageAfterBlockId(null);
      if (contentImageInputRef.current) {
        contentImageInputRef.current.value = "";
      }
    }
  };

  const handleGraphColorChange = async (palette: string) => {
    if (!proposal) return;
    
    const newFilledData = { ...proposal.filled_data, chart_color_theme: palette };
    setProposal({ ...proposal, filled_data: newFilledData, graph_color_palette: palette });
    setHasUnsavedChanges(true);
    
    await supabase
      .from("proposals")
      .update({ graph_color_palette: palette })
      .eq("id", proposal.id);
  };

  const handleInsertVisual = () => {
    if (!template || !insertVisualType || !insertAfterBlockId) return;
    
    const visualId = uuidv4();
    const visualName = newVisualConfig.name || `${insertVisualType}_${Date.now()}`;
    
    const newVisualPlaceholder: VisualPlaceholder = {
      id: visualId,
      type: insertVisualType === "image" ? "image" : insertVisualType,
      name: visualName,
      chartType: insertVisualType === "chart" ? newVisualConfig.chartType : undefined,
      schema: insertVisualType !== "image" ? {
        columns: newVisualConfig.columns.length > 0 ? newVisualConfig.columns : [
          { key: "label", label: "Label", type: "string" },
          { key: "value", label: "Value", type: "number" },
        ],
        description: `Data for ${visualName}`,
        insights: "Interactive visualization with hover insights",
      } : undefined,
    };
    
    const newBlock: ContentBlock = {
      id: uuidv4(),
      type: insertVisualType === "image" ? "image" : insertVisualType,
      content: "",
      visualPlaceholder: visualName,
    };
    
    handleInsertBlock(insertAfterBlockId, newBlock);
    setTemplate((prev) => prev ? {
      ...prev,
      visual_placeholders: [...prev.visual_placeholders, newVisualPlaceholder],
    } : null);
    
    if (newVisualData.length > 0) {
      handleFieldChange(visualName, newVisualData);
    }
    
    setShowInsertVisual(false);
    setInsertVisualType(null);
    setInsertAfterBlockId(null);
    setNewVisualData([]);
    setNewVisualConfig({ name: "", columns: [] });
    toast.success(`${insertVisualType} inserted`);
  };

  const openInsertVisualDialog = (type: "chart" | "table" | "image", afterBlockId: string) => {
    setInsertVisualType(type);
    setInsertAfterBlockId(afterBlockId);
    setShowInsertVisual(true);
    setNewVisualData([{}]);
    setNewVisualConfig({
      name: "",
      chartType: type === "chart" ? "bar" : undefined,
      columns: [
        { key: "label", label: "Label", type: "string" },
        { key: "value", label: "Value", type: "number" },
      ],
    });
  };

  const handleAddReusableBlock = () => {
    if (!template || !selectedReusableBlockType || !reusableBlockSectionName.trim()) return;
    
    const config = REUSABLE_BLOCK_CONFIGS.find(c => c.id === selectedReusableBlockType);
    if (!config) return;
    
    // Improved numbering: find the highest number in existing h1 headings
    const h1Headings = template.content.filter(b => b.type === "heading" && b.level === 1);
    let lastNumber = 0;
    
    h1Headings.forEach(h => {
      const match = h.content.match(/^(\d+)\./);
      if (match) {
        const num = parseInt(match[1]);
        if (num > lastNumber) lastNumber = num;
      }
    });
    
    const nextSectionNumber = lastNumber + 1;
    
    const { headingBlock, contentBlock, placeholderFields, formSectionConfig } = config.createBlock(reusableBlockSectionName, nextSectionNumber);
    
    const dynamicSections = proposal?.filled_data._dynamic_sections as any[] || [];
    const newDynamicSections = [...dynamicSections, formSectionConfig];
    
    const existingPlaceholders = Array.isArray(template.placeholders_schema) ? template.placeholders_schema : [];
    
    setTemplate({
      ...template,
      content: [...template.content, headingBlock, contentBlock],
      placeholders_schema: [
        ...existingPlaceholders,
        ...placeholderFields.filter(pf => 
          !existingPlaceholders.some(existing => existing.key === pf.key)
        ),
      ],
    });
    
    if (proposal) {
      const updatedProposal = {
        ...proposal,
        filled_data: {
          ...proposal.filled_data,
          _dynamic_sections: newDynamicSections,
        },
      };
      setProposal(updatedProposal);
    }
    
    setShowReusableBlockDialog(false);
    setSelectedReusableBlockType(null);
    setReusableBlockSectionName("");
    toast.success(`${reusableBlockSectionName} section added as section ${nextSectionNumber}`);
  };

  const calculateReadinessScore = () => {
    if (!proposal) return 0;
    const fields = [
      "client_name", "subtitle", "client_industry", "region", "start_date",
      "client_overview", "problem_statements", "features", "phases", 
      "resources", "total_cost", "payment_milestones"
    ];
    const filledFields = fields.filter(f => {
      const val = proposal.filled_data[f];
      if (Array.isArray(val)) return val.length > 0;
      return !!val;
    });
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const readinessScore = calculateReadinessScore();
  
  const renderedContent = template && proposal
    ? [
        ...renderTemplate(template.content, proposal.filled_data, template.visual_placeholders),
        ...(() => {
          const fs = template.fixed_sections;
          if (!fs || Array.isArray(fs) || typeof fs !== 'object') return [];
          return Object.entries(fs)
            .filter(([, content]) => typeof content === 'string' && content.trim())
            .map(([title, content]) => ({
              id: `fixed-${title}`,
              type: 'paragraph' as const,
              content: `### ${title}\n\n${content}`
            }));
        })()
      ]
    : [];

  const headings = extractHeadings(renderedContent, proposal?.filled_data);

  useEffect(() => {
    if (!previewRef.current || headings.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    
    return () => observer.disconnect();
  }, [headings]);


  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!proposal || !template) return null;

  return (
    <AppShell>
      <div className="flex h-full">
        {sidebarOpen && (
          <div className="w-56 border-r bg-card flex flex-col hidden lg:flex">
            <div className="p-4 flex items-center justify-between border-b">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {activeTab === "form" ? "Form Management" : "Outline"}
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
              <ScrollArea className="flex-1 p-4">
                {activeTab === "form" ? (
                  <nav className="space-y-1">
                    {[
                      { id: 1, label: "Metadata", icon: "📋" },
                      { id: 2, label: "Business", icon: "🏢" },
                      { id: 3, label: "Features", icon: "⚡" },
                      { id: 4, label: "Delivery", icon: "📅" },
                      { id: 5, label: "Resources", icon: "👥" },
                      { id: 6, label: "Pricing", icon: "💰" },
                      { id: 7, label: "Final", icon: "✅" },
                    ].map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          setCurrentFormStage(section.id);
                          const formStageEvent = new CustomEvent('setFormStage', { detail: section.id });
                          window.dispatchEvent(formStageEvent);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-200 truncate flex items-center gap-2 ${
                          currentFormStage === section.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted hover:translate-x-1"
                        }`}
                      >
                        <span>{section.icon}</span>
                        {section.id}. {section.label}
                      </button>
                    ))}
                  </nav>
                ) : (
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
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${
                          activeSection === heading.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {index + 1}. {cleanTitle}
                      </button>
                    );
                  })}
                </nav>
              )}
            </ScrollArea>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {!sidebarOpen && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:flex" onClick={() => setSidebarOpen(true)}>
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                )}
                <Link href="/proposals">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex flex-col">
                  <Input
                    value={proposal.title}
                    onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                    className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent w-[300px]"
                  />
                  <span className="text-xs text-muted-foreground">Template: {template.proposal_type}</span>
                </div>
              </div>
              
<div className="flex items-center gap-2">
                <Select value={proposal.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="h-4 w-px bg-border" />

                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            const newValue = !autoSaveEnabled;
                            setAutoSaveEnabled(newValue);
                            localStorage.setItem('proposal_autosave_enabled', String(newValue));
                            if (!newValue && params.id) {
                              localStorage.removeItem(`proposal_draft_${params.id}`);
                            }
                            toast.success(newValue ? "Autosave enabled - progress will persist on refresh" : "Autosave disabled - progress will reset on refresh");
                          }}
                          className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            autoSaveEnabled 
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <Save className="h-3 w-3" />
                          {autoSaveEnabled ? "Auto" : "Manual"}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{autoSaveEnabled ? "Autosave ON: Progress persists on refresh" : "Autosave OFF: Progress resets on refresh"}</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>

                  <div className="h-4 w-px bg-border" />

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Undo (Ctrl+Z)</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Redo (Ctrl+Y)</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowVersionHistory(true)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Version history</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setShowShareDialog(true);
                      fetchShareLinks();
                    }}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        More
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleClone}>
                          <Plus className="h-4 w-4 mr-2" />
                          Clone Proposal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSaveAsTemplate}>
                          <FileText className="h-4 w-4 mr-2" />
                          Save as Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCreateVersion}>
                          <History className="h-4 w-4 mr-2" />
                          New Version
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={toggleLock}>
                        {proposal.is_locked ? (
                          <>
                            <Unlock className="h-4 w-4 mr-2" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Lock
                          </>
                        )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button onClick={handleSave} disabled={saving} size="sm" className="h-8">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          </div>

            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="preview" value={activeTab} className="h-full flex flex-col" onValueChange={(value) => {
                setActiveTab(value);
                if (autoSaveTimer.current && proposal) {
                  clearTimeout(autoSaveTimer.current);
                  autoSaveTimer.current = null;
                  autoSave(proposal);
                }
              }}>
                <div className="px-4 pt-4 flex items-center justify-between">
                  <TabsList>
                      <TabsTrigger value="preview" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger value="form" className="gap-2">
                        <Edit3 className="h-4 w-4" />
                        Form Data
                      </TabsTrigger>
                        <TabsTrigger value="versions" className="gap-2">
                          <History className="h-4 w-4" />
                          Version Control
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Comments ({comments.filter((c) => c.status === "open").length})
                        </TabsTrigger>
                        <TabsTrigger value="signoffs" className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Sign-offs
                        </TabsTrigger>
                      </TabsList>
                </div>

                <TabsContent value="preview" className={`flex-1 overflow-auto p-4 ${proposalTheme === "dark" ? "bg-slate-950" : "bg-slate-100"}`}>
                  <div
                      ref={previewRef}
                      className={`max-w-4xl mx-auto shadow-lg rounded-3xl overflow-hidden proposal-content transition-colors duration-300 ${
                        proposalTheme === "dark" 
                          ? "bg-slate-900 text-white" 
                          : "bg-white text-slate-900"
                      }`}
                    >
                      <InlineFormatToolbar 
                          containerRef={editorContainerRef as React.RefObject<HTMLElement>} 
                          onFormat={() => {}} 
                          theme={proposalTheme} 
                        />
                              {/* Header Image Section with Full Controls */}
                              <div className="group relative">
                              {proposal.header_image_url ? (
                                <div className="relative">
                                  <div 
                                    className="overflow-hidden"
                                    style={{
                                      width: `${proposal.filled_data.header_image_width || 100}%`,
                                      margin: (proposal.filled_data.header_image_width as number || 100) < 100 ? '0 auto' : undefined,
                                      borderRadius: (proposal.filled_data.header_image_width as number || 100) === 100 
                                        ? `24px 24px ${proposal.filled_data.header_image_radius || 0}px ${proposal.filled_data.header_image_radius || 0}px`
                                        : `${proposal.filled_data.header_image_radius || 12}px`,
                                    }}
                                  >
                                    <img 
                                      src={proposal.header_image_url} 
                                      alt="Proposal Header" 
                                      className="w-full object-cover"
                                      style={{
                                        height: `${proposal.filled_data.header_image_height || 200}px`,
                                      }}
                                    />
                                  </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className={proposalTheme === "dark" ? "bg-slate-700/90 hover:bg-slate-600 text-white" : "bg-white/90 hover:bg-white"}
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                    <PopoverContent className="w-72" align="end">
                                      <div className="space-y-4">
                                        <h4 className="font-medium text-sm">Image Settings</h4>
                                        <div className="space-y-3">
                                          <div className="space-y-1">
                                            <Label className="text-xs">Width (%)</Label>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="range"
                                                min="30"
                                                max="100"
                                                value={proposal.filled_data.header_image_width as number || 100}
                                                onChange={(e) => handleFieldChange("header_image_width", parseInt(e.target.value))}
                                                className="flex-1"
                                              />
                                              <span className="text-xs w-10 text-right">{proposal.filled_data.header_image_width || 100}%</span>
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Height (px)</Label>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="range"
                                                min="80"
                                                max="500"
                                                step="10"
                                                value={proposal.filled_data.header_image_height as number || 200}
                                                onChange={(e) => handleFieldChange("header_image_height", parseInt(e.target.value))}
                                                className="flex-1"
                                              />
                                              <span className="text-xs w-12 text-right">{proposal.filled_data.header_image_height || 200}px</span>
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Corner Radius (px)</Label>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="range"
                                                min="0"
                                                max="50"
                                                value={proposal.filled_data.header_image_radius as number || 12}
                                                onChange={(e) => handleFieldChange("header_image_radius", parseInt(e.target.value))}
                                                className="flex-1"
                                              />
                                              <span className="text-xs w-10 text-right">{proposal.filled_data.header_image_radius || 12}px</span>
                                            </div>
                                          </div>
                                          <div className="pt-2 border-t flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1"
                                              onClick={() => headerImageInputRef.current?.click()}
                                            >
                                              Replace
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                handleFieldChange("header_image_width", 100);
                                                handleFieldChange("header_image_height", 200);
                                                handleFieldChange("header_image_radius", 12);
                                              }}
                                            >
                                              Reset
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleRemoveHeaderImage}
                                    className="bg-red-500/90 hover:bg-red-500"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              ) : showHeaderPlaceholder ? (
                                <div className="relative group/header mx-4 mt-4">
                                  <div 
                                    onClick={() => headerImageInputRef.current?.click()}
                                    className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                                      proposalTheme === "dark" 
                                        ? "border-slate-700 hover:border-slate-600 bg-slate-800/30" 
                                        : "border-slate-300 hover:border-slate-400 bg-slate-50"
                                    }`}
                                  >
                                    {isUploadingImage ? (
                                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    ) : (
                                      <>
                                        <Image className="h-8 w-8 text-muted-foreground mb-2" />
                                        <span className="text-sm text-muted-foreground">Click to add header image</span>
                                      </>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover/header:opacity-100 transition-opacity shadow-md"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowHeaderPlaceholder(false);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null}
                              <input
                                ref={headerImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleHeaderImageUpload}
                              />
                            </div>

                          <div className="p-8" ref={editorContainerRef}>
                            <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={renderedContent.map(b => b.id)} strategy={verticalListSortingStrategy}>
                          {renderedContent.map((block) => (
                            <SortableBlock
                              key={block.id}
                              block={block}
                              template={template}
                              isEditing={editingBlockId === block.id}
                              onStartEdit={() => setEditingBlockId(block.id)}
                              onStopEdit={() => setEditingBlockId(null)}
                              onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
                              onDelete={() => handleDeleteBlock(block.id)}
                              onMakeDynamic={(text) => handleMakeFieldDynamic(block.id, text)}
                              onMakeStatic={(placeholder) => handleMakeFieldStatic(block.id, placeholder)}
                              onInsertVisual={(type) => openInsertVisualDialog(type, block.id)}
                              filledData={proposal.filled_data}
                              onDataChange={handleFieldChange}
                              theme={proposalTheme}
                              chartColors={getChartColors(proposal.filled_data.chart_color_theme as string || "Auto")}
                              proposalId={proposal.id}
                            />
                          ))}
                        </SortableContext>
                        </DndContext>
                  
                    <div className="mt-8 pt-8 border-t border-dashed">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="w-full border-dashed border-2 hover:bg-muted">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Content Block
                        </Button>
                      </DropdownMenuTrigger>
<DropdownMenuContent align="center" className="w-72 max-h-[70vh] overflow-auto">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Basic Elements</div>
                          <DropdownMenuItem onClick={() => {
                            const newBlock: ContentBlock = {
                              id: uuidv4(),
                              type: "heading",
                              level: 1,
                              content: "New Section",
                            };
                            setTemplate({
                              ...template,
                              content: [...template.content, newBlock],
                            });
                          }}>
                            <Type className="h-4 w-4 mr-2" />
                            Heading
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const newBlock: ContentBlock = {
                              id: uuidv4(),
                              type: "paragraph",
                              content: "Enter your content here...",
                            };
                            setTemplate({
                              ...template,
                              content: [...template.content, newBlock],
                            });
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Paragraph
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const newBlock: ContentBlock = {
                              id: uuidv4(),
                              type: "pagebreak",
                              content: "",
                            };
                            setTemplate({
                              ...template,
                              content: [...template.content, newBlock],
                            });
                            toast.success("Page break added - will create a new page in PDF");
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Page Break
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Reusable Sections</div>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("bullet_key_value");
                            setShowReusableBlockDialog(true);
                          }}>
                            <ListChecks className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Bullet Points (Key-Value)</div>
                              <div className="text-xs text-muted-foreground">Like Deliverables</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("bullet_indexed");
                            setShowReusableBlockDialog(true);
                          }}>
                            <ListOrdered className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Bullet Points (Indexed)</div>
                              <div className="text-xs text-muted-foreground">Like Assumptions & Dependencies</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("calculations");
                            setShowReusableBlockDialog(true);
                          }}>
                            <Calculator className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Calculations Section</div>
                              <div className="text-xs text-muted-foreground">Like Pricing with breakdowns</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("bar_graph");
                            setShowReusableBlockDialog(true);
                          }}>
                            <BarChart3 className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Bar Graph Section</div>
                              <div className="text-xs text-muted-foreground">Like Resource Engagement</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("plan");
                            setShowReusableBlockDialog(true);
                          }}>
                            <CalendarRange className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Plan Section</div>
                              <div className="text-xs text-muted-foreground">Like Delivery Plan with timeline</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("table_chart");
                            setShowReusableBlockDialog(true);
                          }}>
                            <Table2 className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Table with Chart</div>
                              <div className="text-xs text-muted-foreground">Like Features & Requirements</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("metadata");
                            setShowReusableBlockDialog(true);
                          }}>
                            <Info className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Metadata Section</div>
                              <div className="text-xs text-muted-foreground">Like Proposal Metadata</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReusableBlockType("sections_subsections");
                            setShowReusableBlockDialog(true);
                          }}>
                            <Layers className="h-4 w-4 mr-2 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">Sections with Subsections</div>
                              <div className="text-xs text-muted-foreground">Like Change Management</div>
                            </div>
                          </DropdownMenuItem>
                            <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Custom Visuals</div>
                              {!proposal.header_image_url && !showHeaderPlaceholder && (
                                <DropdownMenuItem onClick={() => setShowHeaderPlaceholder(true)}>
                                  <Image className="h-4 w-4 mr-2" />
                                  Add Header Image
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openInsertVisualDialog("chart", template.content[template.content.length - 1]?.id || "")}>
                              <PieChartIcon className="h-4 w-4 mr-2" />
                              Custom Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openInsertVisualDialog("table", template.content[template.content.length - 1]?.id || "")}>
                              <Table2 className="h-4 w-4 mr-2" />
                              Custom Table
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setInsertImageAfterBlockId(template.content[template.content.length - 1]?.id || "");
                              contentImageInputRef.current?.click();
                            }}>
                              <Image className="h-4 w-4 mr-2" />
                              Upload Image
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <input
                          ref={contentImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleContentImageUpload}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                  <TabsContent value="form" className="flex-1 overflow-auto bg-muted/50">
                    <ProposalForm
                      proposal={proposal}
                      template={template}
                      onFieldChange={handleFieldChange}
                      onGenerateAI={async (context) => {
                        setIsGeneratingAI(true);
                        toast.promise(
                          (async () => {
                            const response = await fetch("/api/proposal-ai", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                action: "generate_business", 
                                context,
                                proposalId: proposal.id 
                              }),
                            });
                            const result = await response.json();
                            if (!response.ok) throw new Error(result.error || "AI Generation failed");
                            
                            if (result.updates) {
                              Object.entries(result.updates).forEach(([key, value]) => {
                                handleFieldChange(key, value);
                              });
                            }
                            setIsGeneratingAI(false);
                            return result.message || "Business Understanding generated";
                          })(),
                          {
                            loading: "AI is generating business understanding...",
                            success: (msg) => msg,
                            error: (err) => {
                              setIsGeneratingAI(false);
                              return err.message;
                            },
                          }
                        );
                      }}
                      onRefineField={async (field, context) => {
                          setIsGeneratingAI(true);
                          toast.promise(
                            (async () => {
                              const response = await fetch("/api/proposal-ai", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  action: "refine_field", 
                                  field,
                                  context,
                                  current_value: proposal.filled_data[field],
                                  project_context: proposal.filled_data.project_context,
                                  proposalId: proposal.id 
                                }),
                              });
                              const result = await response.json();
                              if (!response.ok) throw new Error(result.error || "AI Refinement failed");
                              
                              if (result.updates) {
                                Object.entries(result.updates).forEach(([key, value]) => {
                                  handleFieldChange(key, value);
                                });
                              }
                              setIsGeneratingAI(false);
                              return result.message || "Field refined successfully";
                            })(),
                            {
                              loading: `AI is refining ${field}...`,
                              success: (msg) => msg,
                              error: (err) => {
                                setIsGeneratingAI(false);
                                return err.message;
                              },
                            }
                          );
                        }}
                          onGeneratePlatformFeatures={async (phaseIndex, platformIndex, platformName, phaseTitle, context) => {
                            setIsGeneratingAI(true);
                            toast.promise(
                              (async () => {
                                const response = await fetch("/api/proposal-ai", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ 
                                    action: "generate_platform_features", 
                                    context,
                                    platform_name: platformName,
                                    phase_title: phaseTitle,
                                    current_value: (proposal.filled_data.delivery_phases as any[])?.[phaseIndex]?.platforms?.[platformIndex]?.features || "",
                                    project_context: proposal.filled_data.project_context,
                                    feature_list: proposal.filled_data.feature_list || [],
                                    proposalId: proposal.id 
                                  }),
                                });
                                const result = await response.json();
                                if (!response.ok) throw new Error(result.error || "AI Generation failed");
                                
                                if (result.updates?.features) {
                                  const phases = [...(proposal.filled_data.delivery_phases as any[] || [])];
                                  if (phases[phaseIndex]?.platforms?.[platformIndex]) {
                                    phases[phaseIndex].platforms[platformIndex].features = result.updates.features;
                                    handleFieldChange("delivery_phases", phases);
                                  }
                                }
                                setIsGeneratingAI(false);
                                return result.message || "Features generated successfully";
                              })(),
                              {
                                loading: `AI is generating features for ${platformName}...`,
                                success: (msg) => msg,
                                error: (err) => {
                                  setIsGeneratingAI(false);
                                  return err.message;
                                },
                              }
                            );
                          }}
                          onGenerateGovernance={async (context) => {
                              setIsGeneratingAI(true);
                              toast.promise(
                                (async () => {
                                  const response = await fetch("/api/proposal-ai", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ 
                                      action: "generate_governance", 
                                      context,
                                      project_context: proposal.filled_data.project_context,
                                      proposalId: proposal.id 
                                    }),
                                  });
                                  const result = await response.json();
                                  if (!response.ok) throw new Error(result.error || "AI Generation failed");
                                  
                                  if (result.updates) {
                                    const DEFAULT_CADENCE = ["Weekly Status Meeting", "Sprint Demo", "Monthly Review", "Daily Standup", "Release Planning"];
                                    const DEFAULT_REPORTING = ["Status Report", "Quality Report", "Release Notes", "Progress Dashboard", "Risk Register"];
                                    const DEFAULT_DECISION = ["PM", "TL", "Client Representative", "Product Owner", "Steering Committee"];
                                    
                                    const existingCadenceTags = proposal.filled_data.custom_governance_cadence_tags as string[] || [];
                                    const existingReportingTags = proposal.filled_data.custom_governance_reporting_tags as string[] || [];
                                    const existingDecisionTags = proposal.filled_data.custom_governance_decision_tags as string[] || [];
                                    
                                    const newCadenceTags = [...existingCadenceTags];
                                    const newReportingTags = [...existingReportingTags];
                                    const newDecisionTags = [...existingDecisionTags];
                                    
                                    if (result.updates.governance_cadence_items) {
                                      (result.updates.governance_cadence_items as {key: string; value: string}[]).forEach((item) => {
                                        if (!DEFAULT_CADENCE.includes(item.key) && !newCadenceTags.includes(item.key)) {
                                          newCadenceTags.push(item.key);
                                        }
                                      });
                                    }
                                    if (result.updates.governance_reporting_items) {
                                      (result.updates.governance_reporting_items as {key: string; value: string}[]).forEach((item) => {
                                        if (!DEFAULT_REPORTING.includes(item.key) && !newReportingTags.includes(item.key)) {
                                          newReportingTags.push(item.key);
                                        }
                                      });
                                    }
                                    if (result.updates.governance_decision_items) {
                                      (result.updates.governance_decision_items as {key: string; value: string}[]).forEach((item) => {
                                        if (!DEFAULT_DECISION.includes(item.key) && !newDecisionTags.includes(item.key)) {
                                          newDecisionTags.push(item.key);
                                        }
                                      });
                                    }
                                    
                                    if (newCadenceTags.length > existingCadenceTags.length) {
                                      handleFieldChange("custom_governance_cadence_tags", newCadenceTags);
                                    }
                                    if (newReportingTags.length > existingReportingTags.length) {
                                      handleFieldChange("custom_governance_reporting_tags", newReportingTags);
                                    }
                                    if (newDecisionTags.length > existingDecisionTags.length) {
                                      handleFieldChange("custom_governance_decision_tags", newDecisionTags);
                                    }
                                    
                                    Object.entries(result.updates).forEach(([key, value]) => {
                                      handleFieldChange(key, value);
                                    });
                                  }
                                  setIsGeneratingAI(false);
                                  return result.message || "Governance items generated successfully";
                                })(),
                                {
                                  loading: "AI is generating governance standards...",
                                  success: (msg) => msg,
                                  error: (err) => {
                                    setIsGeneratingAI(false);
                                    return err.message;
                                  },
                                }
                              );
                            }}
                          onGenerateChangeManagement={async (context) => {
                              setIsGeneratingAI(true);
                              toast.promise(
                                (async () => {
                                  const response = await fetch("/api/proposal-ai", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ 
                                      action: "generate_change_management", 
                                      context,
                                      project_context: proposal.filled_data.project_context,
                                      proposalId: proposal.id 
                                    }),
                                  });
                                  const result = await response.json();
                                  if (!response.ok) throw new Error(result.error || "AI Generation failed");
                                  
                                  if (result.updates) {
                                    const DEFAULT_PROCESS = ["Change Request (CR)", "Impact Assessment", "Approval", "Versioning", "Cut-off Windows", "Communication", "Documentation", "Review Process", "Escalation Path"];
                                    const DEFAULT_CLASSIFICATION = ["Minor Change", "Standard Change", "Major Change", "Emergency Change", "Critical Change"];
                                    
                                    const existingProcessTags = proposal.filled_data.custom_change_process_tags as string[] || [];
                                    const existingClassificationTags = proposal.filled_data.custom_change_classification_tags as string[] || [];
                                    
                                    const newProcessTags = [...existingProcessTags];
                                    const newClassificationTags = [...existingClassificationTags];
                                    
                                    if (result.updates.change_process_items) {
                                      (result.updates.change_process_items as {key: string; value: string}[]).forEach((item) => {
                                        if (!DEFAULT_PROCESS.includes(item.key) && !newProcessTags.includes(item.key)) {
                                          newProcessTags.push(item.key);
                                        }
                                      });
                                    }
                                    if (result.updates.change_classification_items) {
                                      (result.updates.change_classification_items as {key: string; value: string}[]).forEach((item) => {
                                        if (!DEFAULT_CLASSIFICATION.includes(item.key) && !newClassificationTags.includes(item.key)) {
                                          newClassificationTags.push(item.key);
                                        }
                                      });
                                    }
                                    
                                    if (newProcessTags.length > existingProcessTags.length) {
                                      handleFieldChange("custom_change_process_tags", newProcessTags);
                                    }
                                    if (newClassificationTags.length > existingClassificationTags.length) {
                                      handleFieldChange("custom_change_classification_tags", newClassificationTags);
                                    }
                                    
                                    Object.entries(result.updates).forEach(([key, value]) => {
                                      handleFieldChange(key, value);
                                    });
                                  }
                                  setIsGeneratingAI(false);
                                  return result.message || "Change management process generated successfully";
                                })(),
                                {
                                  loading: "AI is generating change management process...",
                                  success: (msg) => msg,
                                  error: (err) => {
                                    setIsGeneratingAI(false);
                                    return err.message;
                                  },
                                }
                              );
                            }}
                          onGenerateDeliveryPhases={async (context) => {
                            setIsGeneratingAI(true);
                            toast.promise(
                              (async () => {
                                const response = await fetch("/api/proposal-ai", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ 
                                    action: "generate_delivery_phases", 
                                    context,
                                    project_context: proposal.filled_data.project_context,
                                    feature_list: proposal.filled_data.feature_list || [],
                                    proposalId: proposal.id 
                                  }),
                                });
                                const result = await response.json();
                                if (!response.ok) throw new Error(result.error || "AI Generation failed");
                                
                                if (result.updates?.delivery_phases) {
                                  handleFieldChange("delivery_phases", result.updates.delivery_phases);
                                }
                                setIsGeneratingAI(false);
                                return result.message || "Delivery phases generated successfully";
                              })(),
                              {
                                loading: "AI is generating delivery plan...",
                                success: (msg) => msg,
                                error: (err) => {
                                  setIsGeneratingAI(false);
                                  return err.message;
                                },
                              }
                            );
                          }}
                        />
                  </TabsContent>


                <TabsContent value="signoffs" className="flex-1 overflow-auto p-4">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {[
                      { id: "architecture", label: "Architecture Approval", icon: LayoutGrid },
                      { id: "design", label: "Design Approval", icon: MousePointer },
                      { id: "uat", label: "Phase-wise UAT Sign-off", icon: CheckCircle2 },
                      { id: "final", label: "Final Acceptance", icon: Save },
                    ].map((stage) => {
                      const signoff = (proposal.signoffs || {})[stage.id];
                      return (
                        <Card key={stage.id} className="border-0 shadow-sm">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                              <stage.icon className="h-5 w-5 text-primary" />
                              {stage.label}
                            </CardTitle>
                            {signoff ? (
                              <Badge 
                                className={
                                  signoff.status === 'approved' 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-red-100 text-red-700"
                                }
                              >
                                {signoff.status.toUpperCase()}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">PENDING</Badge>
                            )}
                          </CardHeader>
                          <CardContent>
                            {signoff ? (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  Signed by: <span className="text-foreground font-medium">{signoff.signed_by}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Signed at: <span className="text-foreground font-medium">{new Date(signoff.signed_at).toLocaleString()}</span>
                                </p>
                                {signoff.comments && (
                                  <div className="mt-2 p-3 bg-muted/50 rounded-lg italic text-sm">
                                    "{signoff.comments}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <Textarea 
                                  placeholder="Add comments for this sign-off stage..."
                                  id={`comments-${stage.id}`}
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => {
                                      const comments = (document.getElementById(`comments-${stage.id}`) as HTMLTextAreaElement).value;
                                      handleSignOff(stage.id, 'approved', comments);
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4" /> Approve
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    className="flex-1 gap-2 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      const comments = (document.getElementById(`comments-${stage.id}`) as HTMLTextAreaElement).value;
                                      handleSignOff(stage.id, 'rejected', comments);
                                    }}
                                  >
                                    <X className="h-4 w-4" /> Reject
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="versions" className="flex-1 overflow-auto p-4">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <History className="h-5 w-5" />
                          Version Control
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Current version: <span className="font-semibold">v{proposal.version}</span>
                        </p>
                      </div>
                    </div>

                    {proposal.version_history && proposal.version_history.length > 0 ? (
                      <div className="space-y-4">
                        {[...proposal.version_history].reverse().map((entry, idx) => {
                          const prevEntry = proposal.version_history![proposal.version_history!.length - 1 - idx - 1];
                          const changes = getChanges(entry.filled_data, prevEntry?.filled_data || {});
                          
                          return (
                            <Card key={idx} className="border shadow-sm overflow-hidden">
                              <CardHeader className="pb-3 bg-muted/30">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                      v{entry.version}
                                    </div>
                                    <div>
                                      <CardTitle className="text-base flex items-center gap-2">
                                        {entry.commit_message || "No message"}
                                      </CardTitle>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {new Date(entry.saved_at).toLocaleString()} by {entry.saved_by || "user"}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestoreVersion(entry)}
                                    className="gap-1"
                                  >
                                    <History className="h-3 w-3" />
                                    Revert to this
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-4">
                                {changes.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                      Changes ({changes.length})
                                    </p>
                                    <div className="space-y-2 max-h-[300px] overflow-auto">
                                      {changes.map((change, ci) => (
                                        <div 
                                          key={ci} 
                                          className={`text-sm p-3 rounded-lg border ${
                                            change.type === "added" 
                                              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" 
                                              : change.type === "removed"
                                                ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                                                : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge 
                                              variant="outline" 
                                              className={`text-xs ${
                                                change.type === "added" 
                                                  ? "bg-emerald-100 text-emerald-700 border-emerald-300" 
                                                  : change.type === "removed"
                                                    ? "bg-red-100 text-red-700 border-red-300"
                                                    : "bg-amber-100 text-amber-700 border-amber-300"
                                              }`}
                                            >
                                              {change.type === "added" ? "+" : change.type === "removed" ? "-" : "~"}
                                            </Badge>
                                            <span className="font-medium">{formatFieldName(change.field)}</span>
                                          </div>
                                          {change.type === "modified" && (
                                            <div className="text-xs space-y-1 mt-2">
                                              <div className="flex gap-2">
                                                <span className="text-red-600 dark:text-red-400 font-mono bg-red-100 dark:bg-red-900/50 px-1 rounded line-through">
                                                  {truncateValue(change.oldValue)}
                                                </span>
                                              </div>
                                              <div className="flex gap-2">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded">
                                                  {truncateValue(change.newValue)}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                          {change.type === "added" && (
                                            <div className="text-xs mt-1 text-emerald-700 dark:text-emerald-300">
                                              {truncateValue(change.newValue)}
                                            </div>
                                          )}
                                          {change.type === "removed" && (
                                            <div className="text-xs mt-1 text-red-700 dark:text-red-300 line-through">
                                              {truncateValue(change.oldValue)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Initial version - no previous changes</p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="border-2 border-dashed">
                        <CardContent className="py-12 text-center">
                          <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="font-semibold text-lg mb-1">No version history yet</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Click "Save" to create your first commit and start tracking changes.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="flex-1 overflow-auto p-4">
                  <div className="max-w-2xl mx-auto space-y-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Add Comment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                        />
                        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {comments.map((comment) => (
                    <Card
                      key={comment.id}
                      className={`border-0 shadow-sm ${comment.status === "resolved" ? "opacity-60" : ""}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                              {comment.status === "resolved" && (
                                <Badge variant="secondary" className="text-xs">Resolved</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm">{comment.content}</p>
                          </div>
                          {comment.status === "open" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveComment(comment.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {comments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No comments yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

          <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
              <DialogDescription>
                Restore a previous version of this proposal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {proposal.version_history && proposal.version_history.length > 0 ? (
                proposal.version_history.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">Version {entry.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.saved_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreVersion(entry)}
                    >
                      Restore
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No version history available
                </p>
              )}
            </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-primary" />
                  Commit Changes
                </DialogTitle>
                <DialogDescription>
                  Save your changes with a commit message to track version history.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Commit Message</Label>
                  <Textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="e.g., Updated pricing for Phase 2, Added new features..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe what changes you made in this version.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCommitSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Commit v{proposal.version + 1}
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showSaveAsTemplateDialog} onOpenChange={setShowSaveAsTemplateDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Save as Template
                  </DialogTitle>
                  <DialogDescription>
                    Save this proposal structure as a reusable template. All filled data will be removed, keeping only the structure.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={saveAsTemplateName}
                      onChange={(e) => setSaveAsTemplateName(e.target.value)}
                      placeholder="Enter template name..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSaveAsTemplateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmSaveAsTemplate} disabled={saving || !saveAsTemplateName.trim()} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showInsertVisual} onOpenChange={setShowInsertVisual}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {insertVisualType === "chart" && <BarChart3 className="h-5 w-5" />}
                  {insertVisualType === "table" && <Table2 className="h-5 w-5" />}
                  {insertVisualType === "image" && <Image className="h-5 w-5" />}
                  Insert {insertVisualType}
                </DialogTitle>
                <DialogDescription>
                  Configure and add data for your {insertVisualType}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newVisualConfig.name}
                    onChange={(e) => setNewVisualConfig({ ...newVisualConfig, name: e.target.value })}
                    placeholder={`My ${insertVisualType}`}
                  />
                </div>
                
                {insertVisualType === "chart" && (
                  <div className="space-y-2">
                    <Label>Chart Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: "bar", icon: BarChart3, label: "Bar" },
                        { type: "pie", icon: PieChartIcon, label: "Pie" },
                      { type: "line", icon: TrendingUp, label: "Line" },
                      { type: "area", icon: LayoutGrid, label: "Area" },
                    ].map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        variant={newVisualConfig.chartType === type ? "default" : "outline"}
                        className="flex flex-col h-16 gap-1"
                        onClick={() => setNewVisualConfig({ ...newVisualConfig, chartType: type as "bar" | "pie" | "line" | "area" })}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {insertVisualType !== "image" && (
                <div className="space-y-2">
                  <Label>Data ({newVisualData.length} rows)</Label>
                  <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {newVisualConfig.columns.map((col) => (
                            <TableHead key={col.key} className="text-xs">{col.label}</TableHead>
                          ))}
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newVisualData.map((row, i) => (
                          <TableRow key={i}>
                            {newVisualConfig.columns.map((col) => (
                              <TableCell key={col.key} className="p-1">
                                <Input
                                  type={col.type === "number" ? "number" : "text"}
                                  value={(row[col.key] as string) || ""}
                                  onChange={(e) => {
                                    const newData = [...newVisualData];
                                    newData[i] = {
                                      ...newData[i],
                                      [col.key]: col.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value,
                                    };
                                    setNewVisualData(newData);
                                  }}
                                  className="h-8 text-sm"
                                  placeholder={col.label}
                                />
                              </TableCell>
                            ))}
                            <TableCell className="p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setNewVisualData(newVisualData.filter((_, idx) => idx !== i))}
                              >
                                <Trash2 className="h-3 w-3" />
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
                    onClick={() => setNewVisualData([...newVisualData, {}])}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Row
                  </Button>
                </div>
              )}
              
              {insertVisualType === "image" && (
                <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Image placeholder will be inserted</p>
                  <p className="text-xs">Upload functionality coming soon</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInsertVisual(false)}>
                Cancel
              </Button>
              <Button onClick={handleInsertVisual}>
                Insert {insertVisualType}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReusableBlockDialog} onOpenChange={setShowReusableBlockDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedReusableBlockType && (
                  <>
                    {selectedReusableBlockType === "bullet_key_value" && <ListChecks className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "bullet_indexed" && <ListOrdered className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "calculations" && <Calculator className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "bar_graph" && <BarChart3 className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "plan" && <CalendarRange className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "table_chart" && <Table2 className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "metadata" && <Info className="h-5 w-5 text-primary" />}
                    {selectedReusableBlockType === "sections_subsections" && <Layers className="h-5 w-5 text-primary" />}
                  </>
                )}
                Add Reusable Section
              </DialogTitle>
              <DialogDescription>
                {selectedReusableBlockType && REUSABLE_BLOCK_CONFIGS.find(c => c.id === selectedReusableBlockType)?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Section Name</Label>
                <Input
                  value={reusableBlockSectionName}
                  onChange={(e) => setReusableBlockSectionName(e.target.value)}
                  placeholder="e.g., Project Benefits, Risk Analysis, Team Structure..."
                />
                <p className="text-xs text-muted-foreground">
                  This will be the heading for your new section. The form fields will be created automatically.
                </p>
              </div>
              
              {selectedReusableBlockType && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">What you'll get:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {selectedReusableBlockType === "bullet_key_value" && (
                      <>
                        <li>• Bullet list with category/key and description pairs</li>
                        <li>• Introduction text field</li>
                        <li>• Same style as Deliverables section</li>
                      </>
                    )}
                    {selectedReusableBlockType === "bullet_indexed" && (
                      <>
                        <li>• Indexed bullet list (A1, A2, D1, D2, etc.)</li>
                        <li>• Category grouping with descriptions</li>
                        <li>• Same style as Assumptions & Dependencies</li>
                      </>
                    )}
                    {selectedReusableBlockType === "calculations" && (
                      <>
                        <li>• Phase/item table with cost breakdown</li>
                        <li>• Automatic total calculations</li>
                        <li>• Pie chart visualization</li>
                        <li>• Same style as Pricing section</li>
                      </>
                    )}
                    {selectedReusableBlockType === "bar_graph" && (
                      <>
                        <li>• Horizontal bar chart visualization</li>
                        <li>• Role/label with count or percentage</li>
                        <li>• Toggle between count and percentage views</li>
                        <li>• Same style as Resource Engagement</li>
                      </>
                    )}
                    {selectedReusableBlockType === "plan" && (
                      <>
                        <li>• Phase-based timeline with Gantt-style view</li>
                        <li>• Week-based duration chart</li>
                        <li>• Platform/feature breakdown per phase</li>
                        <li>• Same style as Delivery Plan</li>
                      </>
                    )}
                    {selectedReusableBlockType === "table_chart" && (
                      <>
                        <li>• Expandable data table</li>
                        <li>• Pie chart by category</li>
                        <li>• Bar chart by subcategory</li>
                        <li>• Same style as Features & Requirements</li>
                      </>
                    )}
                    {selectedReusableBlockType === "metadata" && (
                      <>
                        <li>• Key-value pairs display</li>
                        <li>• Clean metadata presentation</li>
                        <li>• Same style as Proposal Metadata</li>
                      </>
                    )}
                    {selectedReusableBlockType === "sections_subsections" && (
                      <>
                        <li>• Multiple subsections with titles</li>
                        <li>• Key-value pairs per subsection</li>
                        <li>• Simple list option for last subsection</li>
                        <li>• Same style as Change Management</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowReusableBlockDialog(false);
                setSelectedReusableBlockType(null);
                setReusableBlockSectionName("");
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddReusableBlock}
                disabled={!reusableBlockSectionName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Share Interactive Proposal
                </DialogTitle>
                <DialogDescription>
                  Create a secure, shareable link for your proposal with interactive charts and navigation.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {newShareLink && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Link created successfully!</span>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        value={newShareLink} 
                        readOnly 
                        className="text-sm font-mono bg-background"
                      />
                      <Button size="sm" onClick={() => copyToClipboard(newShareLink)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Security Settings
                  </h4>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Expires in (days)
                      </Label>
                      <Select 
                        value={String(shareSettings.expires_in_days)} 
                        onValueChange={(v) => setShareSettings({...shareSettings, expires_in_days: parseInt(v)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="0">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" />
                        Password Protection (optional)
                      </Label>
                      <Input
                        type="password"
                        placeholder="Leave empty for no password"
                        value={shareSettings.password}
                        onChange={(e) => setShareSettings({...shareSettings, password: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        Max Views (optional)
                      </Label>
                      <Input
                        type="number"
                        placeholder="0 = unlimited"
                        value={shareSettings.max_views || ""}
                        onChange={(e) => setShareSettings({...shareSettings, max_views: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleCreateShareLink} disabled={isCreatingShare} className="w-full">
                  {isCreatingShare ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Create Share Link
                    </>
                  )}
                </Button>

                {shareLinks.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground">Existing Links</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {shareLinks.map((link) => (
                        <div 
                          key={link.id} 
                          className={`p-3 rounded-lg border text-sm space-y-2 ${
                            link.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <code className="text-xs truncate max-w-[200px]">
                                {link.share_token.substring(0, 12)}...
                              </code>
                              {link.has_password && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Protected
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(`${window.location.origin}/view/${link.share_token}`)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => handleToggleShareLink(link.id, !link.is_active)}
                              >
                                {link.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteShareLink(link.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Views: {link.view_count}{link.max_views ? `/${link.max_views}` : ""}</span>
                            {link.expires_at && (
                              <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    );
  }

function SortableBlock({
  block,
  template,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onMakeDynamic,
  onMakeStatic,
  onInsertVisual,
  filledData,
  onDataChange,
  theme = "dark",
  chartColors = CHART_COLORS,
  proposalId,
}: {
  block: ContentBlock;
  template: Template;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onMakeDynamic: (text: string) => void;
  onMakeStatic: (placeholder: string) => void;
  onInsertVisual: (type: "chart" | "table" | "image") => void;
  filledData: Record<string, unknown>;
  onDataChange: (key: string, value: unknown) => void;
  theme?: "light" | "dark";
  chartColors?: string[];
  proposalId?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDark = theme === "dark";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/sortable relative ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/sortable:opacity-100 cursor-grab active:cursor-grabbing p-1 rounded transition-opacity ${
          isDark ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        }`}
      >
        <GripVertical className="h-4 w-4" />
      </div>
        <EditableBlockRenderer
          block={block}
          template={template}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMakeDynamic={onMakeDynamic}
          onMakeStatic={onMakeStatic}
          onInsertVisual={onInsertVisual}
          filledData={filledData}
          onDataChange={onDataChange}
          theme={theme}
          chartColors={chartColors}
          proposalId={proposalId}
        />
    </div>
  );
}

function EditableBlockRenderer({
  block,
  template,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onMakeDynamic,
  onMakeStatic,
  onInsertVisual,
  filledData,
  onDataChange,
  theme = "dark",
  chartColors = CHART_COLORS,
  proposalId,
}: {
  block: ContentBlock;
  template: Template;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onMakeDynamic: (text: string) => void;
  onMakeStatic: (placeholder: string) => void;
  onInsertVisual: (type: "chart" | "table" | "image") => void;
  filledData: Record<string, unknown>;
  onDataChange: (key: string, value: unknown) => void;
  theme?: "light" | "dark";
  chartColors?: string[];
  proposalId?: string;
}) {
  const isDark = theme === "dark";
  const activeChartColors = chartColors;
  const [localContent, setLocalContent] = useState(block.content);
  const [selectedText, setSelectedText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // All chart hover states - must be at top level to avoid hooks order issues
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);
  const [hoveredApp, setHoveredApp] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [hoveredPricing, setHoveredPricing] = useState<number | null>(null);
  const [hoveredResource, setHoveredResource] = useState<number | null>(null);
  
  // Feature section states
  const [activeFeatureView, setActiveFeatureView] = useState<"app" | "category">("app");
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  
  // Resource section state
  const [resourceView, setResourceView] = useState<"count" | "engagement">("count");
  
  // Pricing section state
  const [activePricingTab, setActivePricingTab] = useState<string>("summary");

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.content]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

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
        return `<span class="${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'} px-1 rounded cursor-pointer hover:opacity-80" data-placeholder="${match}">${match}</span>`;
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

  // SPECIAL HANDLING: Detect paragraph blocks with governance/signoff placeholder patterns
  // and render them as the proper sections (like Change Management / Deliverables)
  if (block.type === "paragraph" && block.content.includes("{{governance_cadence_list}}")) {
    const cadenceItems = filledData.governance_cadence_items as { key: string; value: string }[] || [];
    const reportingItems = filledData.governance_reporting_items as { key: string; value: string }[] || [];
    const decisionItems = filledData.governance_decision_items as { key: string; value: string }[] || [];

    const hasContent = cadenceItems.length > 0 || reportingItems.length > 0 || decisionItems.length > 0;

    if (!hasContent) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No governance details defined. Add cadence, reporting, and decision rights in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    return (
      <div className="group relative mb-8 space-y-6">
        {cadenceItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Cadence</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {cadenceItems.map((item, idx) => (
                <li key={`cadence-${idx}`}>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                  <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {reportingItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Reporting</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {reportingItems.map((item, idx) => (
                <li key={`reporting-${idx}`}>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                  <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {decisionItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Decision Rights</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {decisionItems.map((item, idx) => (
                <li key={`decision-${idx}`}>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.key}:</span>
                  <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  // SPECIAL HANDLING: Detect paragraph blocks with signoffs_list placeholder
  // and render them like Deliverables section
  if (block.type === "paragraph" && block.content.includes("{{signoffs_list}}")) {
    const signoffRequirements = filledData.signoff_requirements as { stage: string; description: string }[] || [];

    if (signoffRequirements.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No sign-off requirements defined. Add requirements in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    return (
      <div className="group relative mb-8">
        <ul className="space-y-3 list-disc list-outside ml-6">
          {signoffRequirements.map((req, idx) => (
            <li key={`signoff-${idx}`}>
              <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{req.stage}:</span>
              <span className={`ml-1 ${isDark ? "text-white" : "text-slate-600"}`}>{req.description}.</span>
            </li>
          ))}
        </ul>
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  if (block.type === "heading") {
    return (
      <div className="group relative" onMouseUp={handleSelection}>
        <h2
          id={block.id}
          className={`text-2xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-4 border-b pb-2 cursor-text transition-colors outline-none focus:ring-2 focus:ring-primary/20 rounded ${
            isDark ? "text-white border-slate-700" : "text-slate-900 border-slate-200"
          }`}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const newContent = e.currentTarget.textContent || "";
            if (newContent !== block.content) {
              onUpdate({ content: newContent });
            }
          }}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText={selectedText}
          onMakeDynamic={onMakeDynamic}
        />
        </div>
      );
    }

  // GOVERNANCE SECTION - Like Change Management (3 subsections with key-value items)
  if (block.visualPlaceholder === "governance_section") {
    const cadenceItems = filledData.governance_cadence_items as { key: string; value: string }[] || [];
    const reportingItems = filledData.governance_reporting_items as { key: string; value: string }[] || [];
    const decisionItems = filledData.governance_decision_items as { key: string; value: string }[] || [];

    const hasContent = cadenceItems.length > 0 || reportingItems.length > 0 || decisionItems.length > 0;

    if (!hasContent) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No governance details defined. Add cadence, reporting, and decision rights in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const handleCadenceItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...cadenceItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("governance_cadence_items", updated);
    };

    const handleReportingItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...reportingItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("governance_reporting_items", updated);
    };

    const handleDecisionItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...decisionItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("governance_decision_items", updated);
    };

    return (
      <div className="group relative mb-8 space-y-6">
        {/* Cadence Section */}
        {cadenceItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Cadence</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {cadenceItems.map((item, idx) => (
                <li key={`cadence-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleCadenceItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleCadenceItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reporting Section */}
        {reportingItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Reporting</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {reportingItems.map((item, idx) => (
                <li key={`reporting-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleReportingItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleReportingItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision Rights Section */}
        {decisionItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Decision Rights</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {decisionItems.map((item, idx) => (
                <li key={`decision-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleDecisionItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleDecisionItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  // SIGN-OFF REQUIREMENTS SECTION
  if (block.visualPlaceholder === "signoff_requirements_section") {
    const signoffRequirements = filledData.signoff_requirements as { stage: string; description: string }[] || [];

    if (signoffRequirements.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No sign-off requirements defined. Add requirements in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const handleSignoffEdit = (index: number, field: "stage" | "description", newValue: string) => {
      const updated = [...signoffRequirements];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("signoff_requirements", updated);
    };

    return (
      <div className="group relative mb-8">
        <ul className="space-y-3 list-disc list-outside ml-6">
          {signoffRequirements.map((req, idx) => (
            <li key={`signoff-${idx}`}>
              <span 
                className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newStage = e.currentTarget.textContent?.replace(/:$/, "").trim() || req.stage;
                  handleSignoffEdit(idx, "stage", newStage);
                }}
              >{req.stage}:</span>
              <span 
                className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newDesc = e.currentTarget.textContent?.replace(/\.$/, "").trim() || req.description;
                  handleSignoffEdit(idx, "description", newDesc);
                }}
              >{req.description}.</span>
            </li>
          ))}
        </ul>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

    // PROPOSAL METADATA SECTION
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
      { label: "Title", value: title, key: "proposal_title", placeholder: "Enter title" },
      { label: "Subtitle", value: subtitle, key: "proposal_subtitle", placeholder: "Enter subtitle" },
      { label: "Client", value: clientName, key: "client_name", placeholder: "Client name" },
      { label: "Industry", value: clientIndustry, key: "client_industry", placeholder: "Industry" },
      { label: "Region", value: region, key: "region", placeholder: "Region" },
      { label: "Author", value: author, key: "proposal_author", placeholder: "Author name" },
      { label: "Start Date", value: startDate ? new Date(startDate).toLocaleDateString() : "", key: "start_date", placeholder: "Start date" },
      { label: "Validity", value: validityPeriod, key: "validity_period", placeholder: "e.g. 30 days" },
      { label: "Confidentiality", value: confidentiality, key: "proposal_confidentiality", placeholder: "Level" },
      { label: "Version", value: version, key: "version", placeholder: "1.0" },
    ];

    return (
      <div className="group relative mb-8">
        <div className={`rounded-xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metadataFields.map((field, i) => (
              <div key={i} className="space-y-1">
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>{field.label}</p>
                <p 
                  className={`font-medium cursor-text hover:opacity-80 outline-none min-h-[24px] ${
                    field.value 
                      ? (isDark ? "text-white" : "text-slate-900")
                      : (isDark ? "text-slate-500 italic" : "text-slate-400 italic")
                  }`}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newValue = e.currentTarget.textContent || "";
                    if (newValue !== field.value && newValue !== field.placeholder) {
                      onDataChange(field.key, newValue);
                    }
                  }}
                  onFocus={(e) => {
                    if (!field.value && e.currentTarget.textContent === field.placeholder) {
                      e.currentTarget.textContent = "";
                    }
                  }}
                >{field.value || field.placeholder}</p>
              </div>
            ))}
          </div>
        </div>
        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

    // SPECIAL RENDERING FOR VISUAL PLACEHOLDERS (Overriding generic type checks)
    if (block.visualPlaceholder === "delivery_plan" || block.visualPlaceholder === "delivery_phases_view") {
      const deliveryPhases = filledData.delivery_phases as any[] || [];
      const deliveryIntro = filledData.delivery_intro as string || "We divide development into three parts as below:";
      const startDate = filledData.start_date as string;
      
      if (deliveryPhases.length === 0) {
        return (
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 mb-8 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No delivery phases defined. Add phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
        );
      }

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
        <div className="group relative mb-8 space-y-8">
          <div id={block.id} className="scroll-mt-4">
            <p 
              className={`italic mb-6 cursor-text hover:opacity-80 outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1 ${isDark ? "text-white" : "text-slate-600"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange("delivery_intro", e.currentTarget.textContent || deliveryIntro)}
            >{deliveryIntro}</p>

          {deliveryPhases.map((phase: any, i: number) => (
            <div key={i} className="mb-8">
              <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span
                  className="cursor-text hover:opacity-80 outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const text = e.currentTarget.textContent || "";
                    const match = text.match(/Phase\s*(\d+)\s*\(Weeks?\s*(\d+)[–-](\d+)\)/i);
                      if (match) {
                        const newPhases = [...deliveryPhases];
                        newPhases[i] = { ...newPhases[i], weeks_start: parseInt(match[2]), weeks_end: parseInt(match[3]) };
                        onDataChange("delivery_phases", newPhases);
                      }
                    }}
                  >Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12})</span>: 
                  <span 
                    className="ml-1 cursor-text hover:opacity-80"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newPhases = [...deliveryPhases];
                      newPhases[i] = { ...newPhases[i], title: e.currentTarget.textContent || "" };
                      onDataChange("delivery_phases", newPhases);
                    }}
                  >{phase.title || ""}</span>
                </h3>
              <ul className="space-y-3">
                {(phase.platforms || []).filter((p: any) => p.name && p.features).map((platform: any, j: number) => (
                  <li key={j} className="flex">
                    <span 
                      className={`font-semibold min-w-[120px] cursor-text hover:opacity-80 ${isDark ? "text-slate-200" : "text-slate-800"}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newPhases = [...deliveryPhases];
                        const newPlatforms = [...(newPhases[i].platforms || [])];
                        newPlatforms[j] = { ...newPlatforms[j], name: e.currentTarget.textContent?.replace(/:$/, "") || "" };
                        newPhases[i] = { ...newPhases[i], platforms: newPlatforms };
                        onDataChange("delivery_phases", newPhases);
                      }}
                    >{platform.name}:</span>
                    <span 
                      className={`cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newPhases = [...deliveryPhases];
                        const newPlatforms = [...(newPhases[i].platforms || [])];
                        newPlatforms[j] = { ...newPlatforms[j], features: e.currentTarget.textContent || "" };
                        newPhases[i] = { ...newPhases[i], platforms: newPlatforms };
                        onDataChange("delivery_phases", newPhases);
                      }}
                    >{platform.features}</span>
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
            <button className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Feature # Per Phase
            </button>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {phaseChartData.reduce((acc: any[], p, i) => {
                  const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                  const percent = (p.duration / totalDuration) * 100;
                  acc.push({
                    ...p,
                    startPercent: prevPercent,
                    endPercent: prevPercent + percent,
                    color: activeChartColors[i % activeChartColors.length]
                  });
                  return acc;
                }, []).map((segment: any, i: number) => {
                  const circumference = 2 * Math.PI * 40;
                  const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                  const strokeDashoffset = -segment.startPercent / 100 * circumference;
                  return (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={hoveredPhase === i ? "12" : "8"}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{ opacity: hoveredPhase !== null && hoveredPhase !== i ? 0.4 : 1 }}
                      onMouseEnter={() => setHoveredPhase(i)}
                      onMouseLeave={() => setHoveredPhase(null)}
                    />
                  );
                })}
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
                <div 
                  key={i} 
                  className={`text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded ${
                    hoveredPhase === i 
                      ? (isDark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-900") 
                      : (isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900")
                  }`}
                  onMouseEnter={() => setHoveredPhase(i)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  Phase {i + 1}: {p.duration} weeks ({Math.round(p.duration / totalDuration * 100)}%)
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-6">
            {phaseChartData.map((p, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${
                  hoveredPhase === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""
                }`}
                onMouseEnter={() => setHoveredPhase(i)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: activeChartColors[i % activeChartColors.length] }}></div>
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
                  <div 
                    key={i} 
                    className="relative h-10"
                    onMouseEnter={() => setHoveredPhase(i)}
                    onMouseLeave={() => setHoveredPhase(null)}
                  >
                    <div 
                      className={`absolute h-full rounded-lg flex items-center px-3 text-sm font-medium text-white cursor-pointer transition-all duration-200 ${
                        hoveredPhase === i ? "scale-105 shadow-lg z-10" : hoveredPhase !== null ? "opacity-50" : ""
                      }`}
                      style={{ 
                        left: `${startPercent}%`, 
                        width: `${widthPercent}%`,
                        backgroundColor: activeChartColors[i % activeChartColors.length],
                        minWidth: '120px'
                      }}
                    >
                      Phase {i + 1}: {duration}w ({Math.round(duration / totalWeeks * 100)}%)
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

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "features_list_section") {
    const featureList = filledData.feature_list as any[] || [];
    const baselineTitle = filledData.baseline_title as string || `${filledData.client_name || 'Project'}-baseline-requirements`;

    if (featureList.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No features defined. Add features in the <span className="font-semibold text-primary">Form Data</span> tab under Features & Requirements.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const totalFeatures = featureList.length;

    const categoryByApp: Record<string, number> = {};
    featureList.forEach((f: any) => {
      const cat = f.category || "User";
      categoryByApp[cat] = (categoryByApp[cat] || 0) + 1;
    });
    const appChartData = Object.entries(categoryByApp).map(([name, count], i) => ({
      name,
      value: count,
      percent: ((count / totalFeatures) * 100).toFixed(1),
      color: activeChartColors[i % activeChartColors.length]
    }));

    const categoryBreakdown: Record<string, number> = {};
    featureList.forEach((f: any) => {
      const catName = f.subcategory || "General";
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
    });
    const barChartData = Object.entries(categoryBreakdown)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="group relative mb-8 space-y-6">
        <button 
          onClick={() => setShowDetailedTable(!showDetailedTable)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"
          }`}
        >
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
            <button 
              onClick={() => setActiveFeatureView("app")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                activeFeatureView === "app" 
                  ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              Requirements # by APP
            </button>
            <button 
              onClick={() => setActiveFeatureView("category")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                activeFeatureView === "category" 
                  ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Requirement # By Category
            </button>
          </div>

          {activeFeatureView === "app" ? (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {appChartData.reduce((acc: any[], item) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const percent = (item.value / totalFeatures) * 100;
                    acc.push({
                      ...item,
                      startPercent: prevPercent,
                      endPercent: prevPercent + percent,
                    });
                    return acc;
                  }, []).map((segment: any, i: number) => {
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                    const strokeDashoffset = -segment.startPercent / 100 * circumference;
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={hoveredApp === i ? "12" : "8"}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        style={{ opacity: hoveredApp !== null && hoveredApp !== i ? 0.4 : 1 }}
                        onMouseEnter={() => setHoveredApp(i)}
                        onMouseLeave={() => setHoveredApp(null)}
                      />
                    );
                  })}
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
                  <div 
                    key={i} 
                    className={`flex items-center justify-between gap-8 text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded ${
                      hoveredApp === i 
                        ? (isDark ? "bg-slate-700" : "bg-slate-200") 
                        : ""
                    }`}
                    onMouseEnter={() => setHoveredApp(i)}
                    onMouseLeave={() => setHoveredApp(null)}
                  >
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
                  <div 
                    key={i} 
                    className={`flex items-center gap-4 cursor-pointer transition-all duration-200 ${
                      hoveredCategory === i ? "scale-105" : hoveredCategory !== null ? "opacity-50" : ""
                    }`}
                    onMouseEnter={() => setHoveredCategory(i)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className={`w-48 text-right text-sm truncate shrink-0 ${hoveredCategory === i ? (isDark ? "text-white font-medium" : "text-slate-900 font-medium") : (isDark ? "text-slate-400" : "text-slate-500")}`}>{item.name}</div>
                    <div className={`flex-1 h-6 rounded overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div 
                        className="h-full rounded transition-all duration-700"
                        style={{ 
                          width: `${width}%`, 
                          backgroundColor: activeChartColors[i % activeChartColors.length],
                          boxShadow: hoveredCategory === i ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                        }}
                      ></div>
                    </div>
                    <div className={`w-12 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{item.count} ({Math.round(item.count / totalFeatures * 100)}%)</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`flex flex-wrap justify-center gap-6 mt-8 pt-4 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
            {appChartData.map((item, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${
                  hoveredApp === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""
                }`}
                onMouseEnter={() => setHoveredApp(i)}
                onMouseLeave={() => setHoveredApp(null)}
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "resource_engagement") {
      const resources = filledData.resource_plan as any[] || [];
      const resourceCount = resources.length;
      const defaultJustification = `${resourceCount} resource${resourceCount !== 1 ? 's' : ''}, with some engaged on an as-needed basis, can deliver the work effectively.`;
      const justification = filledData.resource_justification as string || defaultJustification;

      if (resources.length === 0) {
        return (
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 mb-8 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No resources defined. Add resources in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
        );
      }

      const maxVal = resourceView === "count" 
        ? Math.max(...resources.map(r => r.count || 0), 1)
        : 100;

      return (
        <div className="group relative mb-8 space-y-4">
          <p 
            className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onDataChange("resource_justification", e.currentTarget.textContent || justification)}
          >{justification}</p>

          <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-8">
              <button 
                onClick={() => setResourceView("count")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  resourceView === "count" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Role & Count
              </button>
              <button 
                onClick={() => setResourceView("engagement")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  resourceView === "engagement" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                % of Engagement
              </button>
            </div>

              <div className="space-y-6">
                  {resources.map((res: any, i: number) => {
                    const val = resourceView === "count" ? (res.count || 0) : (res.allocation || 100);
                    const width = (val / maxVal) * 100;
                    return (
                      <div key={`res-${i}-${res.role}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        <div className={`w-48 text-right text-sm truncate cursor-text ${isDark ? "text-white" : "text-slate-500"}`}
                          contentEditable suppressContentEditableWarning
                          onBlur={(e) => {
                            const newRole = e.currentTarget.textContent?.trim() || res.role;
                            if (newRole !== res.role) {
                              const updated = resources.map((r: any, idx: number) => idx === i ? { ...r, role: newRole } : r);
                              onDataChange("resource_plan", updated);
                            }
                          }}
                        >{res.role}</div>
                        <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${width}%`, backgroundColor: activeChartColors[i % activeChartColors.length] }}
                          ></div>
                        </div>
                        <div className={`w-16 text-sm font-medium cursor-text ${isDark ? "text-white" : "text-slate-900"}`}
                          contentEditable suppressContentEditableWarning
                          onBlur={(e) => {
                            const text = e.currentTarget.textContent?.trim() || "";
                            const numVal = parseInt(text.replace(/%/g, ""));
                            if (!isNaN(numVal)) {
                              const updated = resources.map((r: any, idx: number) => {
                                if (idx === i) {
                                  return resourceView === "count" 
                                    ? { ...r, count: numVal } 
                                    : { ...r, allocation: numVal };
                                }
                                return r;
                              });
                              onDataChange("resource_plan", updated);
                            }
                          }}
                        >{val}{resourceView === "engagement" ? "%" : ""}</div>
                    </div>
                  );
                })}
              </div>
          </div>

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

  if (block.visualPlaceholder === "pricing_section") {
      const deliveryPhases = filledData.delivery_phases as any[] || [];
      const rawPhasePricing = filledData.phase_pricing_table as any[] || [];
      const taxPercent = Number(filledData.tax_percent) || 18;
      const pricingNotes = filledData.pricing_notes as string || "";
      
      // Use phase_pricing_table if it has data with costs, otherwise fall back to delivery_phases
      let phasePricing = rawPhasePricing;
      const hasPricingData = rawPhasePricing.length > 0 && rawPhasePricing.some((p: any) => Number(p.cost) > 0);
      
      if (!hasPricingData && deliveryPhases.length > 0) {
        // Generate placeholder pricing from delivery_phases
        phasePricing = deliveryPhases.map((phase: any, idx: number) => {
          const phaseNum = idx + 1;
          const phaseLabel = phase.title && phase.title.trim() !== "" 
            ? `Phase ${phaseNum}: ${phase.title}` 
            : `Phase ${phaseNum}`;
          
          return {
            phase: phaseLabel,
            cost: 0,
            breakdown: []
          };
        });
      }
      
      const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
      const totalWithTax = totalCost * (1 + taxPercent / 100);

      if (phasePricing.length === 0) {
        return (
          <div className="group relative mb-8 space-y-6">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No pricing phases defined. Define phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="group relative mb-8 space-y-6">
          <p 
            className={`leading-relaxed cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable
            suppressContentEditableWarning
          >
            Given the scope, team composition, and phased delivery, the complete {phasePricing.length}-phase engagement is priced at 
            <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span>, 
            totaling <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>, 
            with phase-wise distributions detailed below.
          </p>

          <div className={`rounded-2xl p-6 min-h-[400px] border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              <button 
                onClick={() => setActivePricingTab("summary")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                  activePricingTab === "summary" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Pricing Per Phase
              </button>
              {phasePricing.map((p, i) => (
                <button 
                  key={i}
                  onClick={() => setActivePricingTab(`phase-${i}`)}
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                    activePricingTab === `phase-${i}` 
                      ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                      : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                  }`}
                >
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
                      {phasePricing.reduce((acc: any[], p, i) => {
                        const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                        const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / phasePricing.length);
                        acc.push({
                          ...p,
                          startPercent: prevPercent,
                          endPercent: prevPercent + percent,
                          color: activeChartColors[i % activeChartColors.length]
                        });
                        return acc;
                      }, []).map((segment: any, i: number) => {
                        const circumference = 2 * Math.PI * 40;
                        const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                        const strokeDashoffset = -segment.startPercent / 100 * circumference;
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="hover:opacity-80 cursor-pointer transition-opacity"
                          />
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
                  {phasePricing.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: activeChartColors[i % activeChartColors.length] }}></div>
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
                      <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{phasePricing[parseInt(activePricingTab.split("-")[1])].phase}</h4>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Detailed costing breakdown for this phase</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-violet-400">{formatCurrency(Number(phasePricing[parseInt(activePricingTab.split("-")[1])].cost))}</div>
                    <div className={`text-[10px] uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Phase Total</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(phasePricing[parseInt(activePricingTab.split("-")[1])].breakdown || []).map((b: any) => ({
                            name: b.item,
                            value: Number(b.cost) || 0
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(phasePricing[parseInt(activePricingTab.split("-")[1])].breakdown || []).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={activeChartColors[index % activeChartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDark ? "#1e293b" : "#fff", border: isDark ? "none" : "1px solid #e2e8f0", borderRadius: "8px", color: isDark ? "#fff" : "#1e293b" }}
                          itemStyle={{ color: isDark ? "#fff" : "#1e293b" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    {(phasePricing[parseInt(activePricingTab.split("-")[1])].breakdown || []).map((item: any, idx: number) => {
                      const percentage = (Number(item.cost) / (Number(phasePricing[parseInt(activePricingTab.split("-")[1])].cost) || 1)) * 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeChartColors[idx % activeChartColors.length] }}></div>
                              {item.item}
                            </span>
                            <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(Number(item.cost))} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: activeChartColors[idx % activeChartColors.length]
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-100 border-slate-200"}`}>
                  <Info className="h-4 w-4 text-violet-400 shrink-0" />
                  <p className={`text-[11px] italic ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    This breakdown covers the specialized resources and operational overheads allocated specifically for {phasePricing[parseInt(activePricingTab.split("-")[1])].phase}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

          {pricingNotes && (
            <div className={`p-4 rounded-xl border text-sm italic ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
              Note: {pricingNotes}
            </div>
          )}

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
          </div>
        );
      }

  if (block.visualPlaceholder === "tasks_section") {
    const tasks = filledData.tasks_detailed as { type: string; description: string }[] || [];

    if (tasks.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No tasks defined. Add tasks in the <span className="font-semibold text-primary">Form Data</span> tab under Tasks Involved section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedTasks: Record<string, string[]> = {};
    tasks.forEach(t => {
      if (!groupedTasks[t.type]) {
        groupedTasks[t.type] = [];
        orderedCategories.push(t.type);
      }
      groupedTasks[t.type].push(t.description);
    });

    const handleTaskCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedTasks = tasks.map(t => 
          t.type === oldCategory ? { ...t, type: newCategory } : t
        );
        onDataChange("tasks_detailed", updatedTasks);
      }
    };

    const handleTaskItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherTasks = tasks.filter(t => t.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryTasks = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedTasks[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherTasks.slice(0, insertIndex),
        ...newCategoryTasks,
        ...otherTasks.slice(insertIndex)
      ];
      onDataChange("tasks_detailed", result);
    };

    return (
      <div className="group relative mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, idx) => {
            const items = groupedTasks[category];
            return (
              <li key={`task-cat-${idx}`} className="group/item">
                <span 
                  className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                    handleTaskCategoryEdit(category, newCategory);
                  }}
                >{category}:</span>
                <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      handleTaskItemsEdit(category, e.currentTarget.textContent || "");
                    }}
                  >
                    {items.join(", ")}.
                  </span>
              </li>
            );
          })}
        </ul>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

    if (block.visualPlaceholder === "deliverables_section") {
    const deliverables = filledData.deliverables_detailed as { type: string; description: string }[] || [];
    const introText = filledData.deliverables_intro as string || "Deliverables Explained with Future Benefits";

    if (deliverables.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No deliverables defined. Add deliverables in the <span className="font-semibold text-primary">Form Data</span> tab under Deliverables section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedDeliverables: Record<string, string[]> = {};
    deliverables.forEach(d => {
      if (!groupedDeliverables[d.type]) {
        groupedDeliverables[d.type] = [];
        orderedCategories.push(d.type);
      }
      groupedDeliverables[d.type].push(d.description);
    });

    const handleDeliverableCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedDeliverables = deliverables.map(d => 
          d.type === oldCategory ? { ...d, type: newCategory } : d
        );
        onDataChange("deliverables_detailed", updatedDeliverables);
      }
    };

    const handleDeliverableItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherDeliverables = deliverables.filter(d => d.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryDeliverables = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedDeliverables[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherDeliverables.slice(0, insertIndex),
        ...newCategoryDeliverables,
        ...otherDeliverables.slice(insertIndex)
      ];
      onDataChange("deliverables_detailed", result);
    };

    return (
        <div className="group relative mb-8">
          <p 
            className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-500"}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              onDataChange("deliverables_intro", e.currentTarget.textContent || introText);
            }}
          >{introText}</p>
          
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, idx) => {
              const items = groupedDeliverables[category];
              return (
                <li key={`deliverable-cat-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newCategory = e.currentTarget.textContent?.trim() || category;
                      handleDeliverableCategoryEdit(category, newCategory);
                    }}
                  >{category}</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      handleDeliverableItemsEdit(category, e.currentTarget.textContent || "");
                    }}
                  >
                    {items.join(", ")}.
                  </span>
                </li>
              );
            })}
          </ul>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "assumptions_section") {
    const assumptions = filledData.assumptions_detailed as { type: string; description: string }[] || [];

    if (assumptions.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No assumptions defined. Add assumptions in the <span className="font-semibold text-primary">Form Data</span> tab under Assumptions section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedAssumptions: Record<string, string[]> = {};
    assumptions.forEach(a => {
      if (!groupedAssumptions[a.type]) {
        groupedAssumptions[a.type] = [];
        orderedCategories.push(a.type);
      }
      groupedAssumptions[a.type].push(a.description);
    });

    const handleAssumptionCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedAssumptions = assumptions.map(a => 
          a.type === oldCategory ? { ...a, type: newCategory } : a
        );
        onDataChange("assumptions_detailed", updatedAssumptions);
      }
    };

    const handleAssumptionItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherAssumptions = assumptions.filter(a => a.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryAssumptions = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedAssumptions[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherAssumptions.slice(0, insertIndex),
        ...newCategoryAssumptions,
        ...otherAssumptions.slice(insertIndex)
      ];
      onDataChange("assumptions_detailed", result);
    };

      return (
        <div className="group relative mb-8">
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, catIdx) => {
              const items = groupedAssumptions[category];
              const combinedDescription = items.join(", ");
              return (
                <li key={`assumption-${category}`} className="group/item">
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>A{catIdx + 1}: </span>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                      handleAssumptionCategoryEdit(category, newCategory);
                    }}
                  >{category}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newText = e.currentTarget.textContent?.replace(/\.$/, "").trim() || combinedDescription;
                      handleAssumptionItemsEdit(category, newText);
                    }}
                  >
                    {combinedDescription}.
                  </span>
                </li>
              );
            })}
          </ul>

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

  if (block.visualPlaceholder === "dependencies_section") {
    const dependencies = filledData.dependencies_detailed as { type: string; description: string }[] || [];

    if (dependencies.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No dependencies defined. Add dependencies in the <span className="font-semibold text-primary">Form Data</span> tab under Dependencies section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedDependencies: Record<string, string[]> = {};
    dependencies.forEach(d => {
      if (!groupedDependencies[d.type]) {
        groupedDependencies[d.type] = [];
        orderedCategories.push(d.type);
      }
      groupedDependencies[d.type].push(d.description);
    });

    const handleDependencyCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedDependencies = dependencies.map(d => 
          d.type === oldCategory ? { ...d, type: newCategory } : d
        );
        onDataChange("dependencies_detailed", updatedDependencies);
      }
    };

    const handleDependencyItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherDependencies = dependencies.filter(d => d.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryDependencies = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedDependencies[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherDependencies.slice(0, insertIndex),
        ...newCategoryDependencies,
        ...otherDependencies.slice(insertIndex)
      ];
      onDataChange("dependencies_detailed", result);
    };

      return (
        <div className="group relative mb-8">
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, catIdx) => {
              const items = groupedDependencies[category];
              const combinedDescription = items.join(", ");
              return (
                <li key={`dependency-${category}`} className="group/item">
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>D{catIdx + 1}: </span>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                      handleDependencyCategoryEdit(category, newCategory);
                    }}
                  >{category}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newText = e.currentTarget.textContent?.replace(/\.$/, "").trim() || combinedDescription;
                      handleDependencyItemsEdit(category, newText);
                    }}
                  >
                    {combinedDescription}.
                  </span>
                </li>
              );
            })}
          </ul>

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
          </div>
        );
      }

  if (block.visualPlaceholder === "change_management_section") {
    const processItems = filledData.change_process_items as { key: string; value: string }[] || [];
    const classificationItems = filledData.change_classification_items as { key: string; value: string }[] || [];
    const constraintItems = filledData.change_constraint_items as string[] || [];

    const hasContent = processItems.length > 0 || classificationItems.length > 0 || constraintItems.length > 0;

    if (!hasContent) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No change management details defined. Add process, classification, and constraints in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const handleProcessItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...processItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("change_process_items", updated);
    };

    const handleClassificationItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...classificationItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("change_classification_items", updated);
    };

    const handleConstraintItemEdit = (index: number, newValue: string) => {
      const updated = [...constraintItems];
      updated[index] = newValue;
      onDataChange("change_constraint_items", updated);
    };

    return (
      <div className="group relative mb-8 space-y-6">
        {/* Process Section */}
        {processItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Process</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {processItems.map((item, idx) => (
                <li key={`process-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleProcessItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleProcessItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Classification Section */}
        {classificationItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Classification</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {classificationItems.map((item, idx) => (
                <li key={`classification-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleClassificationItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleClassificationItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Constraints Section */}
        {constraintItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Constraints</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {constraintItems.map((item, idx) => (
                <li key={`constraint-${idx}`}>
                  <span 
                    className={`cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item;
                      handleConstraintItemEdit(idx, newValue);
                    }}
                  >{item}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  // Generic Bullet Key-Value Section (like Deliverables)
  if (block.visualPlaceholder?.endsWith("_items_section")) {
    const dataKey = block.visualPlaceholder.replace("_section", "");
    const introKey = dataKey.replace("_items", "_intro");
    const rawItemsData = filledData[dataKey];
    const items = Array.isArray(rawItemsData) ? rawItemsData as { type: string; description: string }[] : [];
    const introText = filledData[introKey] as string || "";

    if (items.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

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
      <div className="group relative mb-8">
        {introText && (
          <p className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-500"}`}
            contentEditable suppressContentEditableWarning
            onBlur={(e) => onDataChange(introKey, e.currentTarget.textContent || introText)}
          >{introText}</p>
        )}
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, idx) => {
            const categoryItems = groupedItems[category];
            return (
              <li key={`item-${idx}`}>
                <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newCategory = e.currentTarget.textContent?.trim() || category;
                    if (newCategory !== category) {
                      const updated = items.map(i => i.type === category ? { ...i, type: newCategory } : i);
                      onDataChange(dataKey, updated);
                    }
                  }}
                >{category}</span>
                <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newItems = (e.currentTarget.textContent || "").replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
                    const otherItems = items.filter(i => i.type !== category);
                    const newCategoryItems = newItems.map(desc => ({ type: category, description: desc }));
                    onDataChange(dataKey, [...otherItems, ...newCategoryItems]);
                  }}
                >{categoryItems.join(", ")}.</span>
              </li>
            );
          })}
        </ul>
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  // Generic Indexed Bullet Section (like Assumptions/Dependencies)
  if (block.visualPlaceholder?.endsWith("_indexed_section")) {
    const baseKey = block.visualPlaceholder.replace("_indexed_section", "");
    const dataKey = `${baseKey}_items`;
    const prefixKey = `${baseKey}_prefix`;
    const rawIndexedData = filledData[dataKey];
    const items = Array.isArray(rawIndexedData) ? rawIndexedData as { type: string; description: string }[] : [];
    const prefix = (filledData[prefixKey] as string) || baseKey.charAt(0).toUpperCase();

    if (items.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

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
      <div className="group relative mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, catIdx) => {
            const categoryItems = groupedItems[category];
            return (
              <li key={`indexed-${category}`}>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>{prefix}{catIdx + 1}: </span>
                <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                    if (newCategory !== category) {
                      const updated = items.map(i => i.type === category ? { ...i, type: newCategory } : i);
                      onDataChange(dataKey, updated);
                    }
                  }}
                >{category}:</span>
                <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newItems = (e.currentTarget.textContent || "").replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
                    const otherItems = items.filter(i => i.type !== category);
                    const newCategoryItems = newItems.map(desc => ({ type: category, description: desc }));
                    onDataChange(dataKey, [...otherItems, ...newCategoryItems]);
                  }}
                >{categoryItems.join(", ")}.</span>
              </li>
            );
          })}
        </ul>
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  // Generic Bar Graph Section (like Resource Engagement)
  if (block.visualPlaceholder?.endsWith("_bar_section")) {
    const baseKey = block.visualPlaceholder.replace("_bar_section", "");
    const dataKey = `${baseKey}_data`;
    const justificationKey = `${baseKey}_justification`;
    const rawBarData = filledData[dataKey];
    const items = Array.isArray(rawBarData) ? rawBarData as { role: string; count: number; allocation: number }[] : [];
    const justification = filledData[justificationKey] as string || "";
    const [view, setView] = useState<"count" | "engagement">("count");

    if (items.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No data defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    const maxVal = view === "count" ? Math.max(...items.map(r => r.count || 0), 1) : 100;

    return (
      <div className="group relative mb-8 space-y-4">
        {justification && (
          <p className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable suppressContentEditableWarning
            onBlur={(e) => onDataChange(justificationKey, e.currentTarget.textContent || justification)}
          >{justification}</p>
        )}
        <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8">
            <button onClick={() => setView("count")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                view === "count" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}>
              <BarChart3 className="w-4 h-4" /> Count
            </button>
            <button onClick={() => setView("engagement")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                view === "engagement" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}>
              <TrendingUp className="w-4 h-4" /> % Allocation
            </button>
          </div>
          <div className="space-y-6">
            {items.map((item, i) => {
              const val = view === "count" ? (item.count || 0) : (item.allocation || 100);
              const width = (val / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{item.role}</div>
                  <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }}></div>
                  </div>
                  <div className={`w-8 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{val}{view === "engagement" ? "%" : ""}</div>
                </div>
              );
            })}
            </div>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

  // Generic Pricing/Calculations Section (like Pricing)
  if (block.visualPlaceholder?.endsWith("_pricing_section") && block.visualPlaceholder !== "pricing_section") {
    const baseKey = block.visualPlaceholder.replace("_pricing_section", "");
    const tableKey = `${baseKey}_table`;
    const taxKey = `${baseKey}_tax_percent`;
    const notesKey = `${baseKey}_notes`;
    
    const phasePricing = filledData[tableKey] as any[] || [];
    const taxPercent = Number(filledData[taxKey]) || 18;
    const pricingNotes = filledData[notesKey] as string || "";
    const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
    const totalWithTax = totalCost * (1 + taxPercent / 100);
    const [activePricingTab, setActiveTab] = useState<string>("summary");

    if (phasePricing.length === 0) {
      return (
        <div className="group relative mb-8 space-y-6">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No phases defined. Add phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    return (
      <div className="group relative mb-8 space-y-6">
        <p className={`leading-relaxed cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}>
          The complete engagement is priced at 
          <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span>, 
          totaling <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>.
        </p>

        <div className={`rounded-2xl p-6 min-h-[400px] border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button 
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                activePricingTab === "summary" 
                  ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                  : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              Overview
            </button>
            {phasePricing.map((p, i) => (
              <button 
                key={i}
                onClick={() => setActiveTab(`phase-${i}`)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                  activePricingTab === `phase-${i}` 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                {p.phase || `Item ${i+1}`}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            {activePricingTab === "summary" ? (
              <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {phasePricing.reduce((acc: any[], p, i) => {
                        const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                        const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / phasePricing.length);
                        acc.push({
                          ...p,
                          startPercent: prevPercent,
                          endPercent: prevPercent + percent,
                          color: chartColors[i % chartColors.length]
                        });
                        return acc;
                      }, []).map((segment: any, i: number) => {
                        const circumference = 2 * Math.PI * 40;
                        const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                        const strokeDashoffset = -segment.startPercent / 100 * circumference;
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="hover:opacity-80 cursor-pointer transition-opacity"
                          />
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
                  {phasePricing.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                      <span>{p.phase || `Item ${i+1}`}: {formatCurrencyShort(Number(p.cost))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                {(() => {
                  const idx = parseInt(activePricingTab.split("-")[1]);
                  const item = phasePricing[idx];
                  if (!item) return null;
                  return (
                    <div className={`p-6 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.phase || `Item ${idx+1}`}</h4>
                        <div className="text-2xl font-bold text-violet-400">{formatCurrency(Number(item.cost))}</div>
                      </div>
                      {item.breakdown && item.breakdown.length > 0 && (
                        <div className="space-y-3">
                          {item.breakdown.map((b: any, bi: number) => {
                            const percentage = (Number(b.cost) / (Number(item.cost) || 1)) * 100;
                            return (
                              <div key={bi} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>{b.item}</span>
                                  <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(Number(b.cost))} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className={`h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {pricingNotes && (
          <div className={`p-4 rounded-xl border text-sm italic ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
            Note: {pricingNotes}
          </div>
        )}

        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

    // Generic Plan Section (like Delivery Plan)
    if (block.visualPlaceholder?.endsWith("_plan_section") && block.visualPlaceholder !== "delivery_plan") {
      const baseKey = block.visualPlaceholder.replace("_plan_section", "");
      const phasesKey = `${baseKey}_phases`;
      const introKey = `${baseKey}_intro`;
      
      const phases = filledData[phasesKey] as any[] || [];
      const introText = filledData[introKey] as string || "";
      
      if (phases.length === 0) {
        return (
          <div className="group relative mb-8">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No phases defined. Add phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

      const totalWeeks = Math.max(phases.reduce((max, p) => Math.max(max, p.weeks_end || 0), 0), 1);

      const handlePlanPhaseEdit = (index: number, field: string, newValue: string | number) => {
        const updated = [...phases];
        updated[index] = { ...updated[index], [field]: newValue };
        onDataChange(phasesKey, updated);
      };

      return (
        <div className="group relative mb-8 space-y-6">
          {introText && (
            <p className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
              contentEditable suppressContentEditableWarning
              onBlur={(e) => onDataChange(introKey, e.currentTarget.textContent || introText)}
            >{introText}</p>
          )}

          {phases.map((phase: any, i: number) => (
            <div key={i} className="mb-6">
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span 
                  className="cursor-text hover:opacity-80"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const text = e.currentTarget.textContent || "";
                    const match = text.match(/Phase\s*(\d+)\s*\(Weeks?\s*(\d+)[–-](\d+)\)/i);
                    if (match) {
                      const updated = [...phases];
                      updated[i] = { ...updated[i], weeks_start: parseInt(match[2]), weeks_end: parseInt(match[3]) };
                      onDataChange(phasesKey, updated);
                    }
                  }}
                >Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12})</span>: 
                <span 
                  className="ml-1 cursor-text hover:opacity-80"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handlePlanPhaseEdit(i, "title", e.currentTarget.textContent || "")}
                >{phase.title || ""}</span>
              </h3>
            </div>
          ))}

          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {phases.reduce((acc: any[], p, i) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const duration = (p.weeks_end || 0) - (p.weeks_start || 0);
                    const percent = (duration / totalWeeks) * 100;
                    acc.push({ startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
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
                <span className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{totalWeeks}</span>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Weeks</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {phases.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Phase {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
      );
    }

    // Generic Table with Chart Section (like Features)
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
      const [activeView, setActiveView] = useState<"category" | "subcategory">("category");
      const [showTable, setShowTable] = useState(false);

      const handleTableItemEdit = (rowIndex: number, colKey: string, newValue: string) => {
        const updatedItems = [...items];
        updatedItems[rowIndex] = { ...updatedItems[rowIndex], [colKey]: newValue };
        onDataChange(listKey, updatedItems);
      };

      const handleColumnLabelEdit = (colIndex: number, newLabel: string) => {
        const updatedColumns = [...columns];
        updatedColumns[colIndex] = { ...updatedColumns[colIndex], label: newLabel };
        onDataChange(columnsKey, updatedColumns);
      };

      const handleTitleEdit = (newTitle: string) => {
        onDataChange(titleKey, newTitle);
      };

      if (items.length === 0) {
        return (
          <div className="group relative mb-8">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

      const categoryCount: Record<string, number> = {};
      items.forEach((item: any) => {
        const cat = item.category || "Other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const chartData = Object.entries(categoryCount).map(([name, count], i) => ({
        name, count, color: chartColors[i % chartColors.length], percent: ((count / items.length) * 100).toFixed(1)
      }));

      return (
        <div className="group relative mb-8 space-y-6">
          <button 
            onClick={() => setShowTable(!showTable)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"
            }`}
          >
            <Table2 className="h-4 w-4" />
            <span 
              className="font-medium cursor-text"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleTitleEdit(e.currentTarget.textContent || tableTitle)}
              onClick={(e) => e.stopPropagation()}
            >{tableTitle}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTable ? "rotate-180" : ""}`} />
          </button>

          {showTable && (
            <div className={`rounded-xl p-4 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <Table>
                <TableHeader>
                  <TableRow className={isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}>
                    {columns.map((col: any, colIdx: number) => (
                      <TableHead 
                        key={col.key} 
                        className={`${isDark ? "text-slate-300" : "text-slate-700"} cursor-text`}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleColumnLabelEdit(colIdx, e.currentTarget.textContent || col.label)}
                      >{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, i: number) => (
                    <TableRow key={i} className={isDark ? "hover:bg-slate-800/50 border-slate-700" : "hover:bg-slate-50 border-slate-200"}>
                      {columns.map((col: any) => (
                        <TableCell 
                          key={col.key} 
                          className={`${isDark ? "text-slate-300" : "text-slate-600"} cursor-text`}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleTableItemEdit(i, col.key, e.currentTarget.textContent || "")}
                        >{item[col.key] || "-"}</TableCell>
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
                      strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-500 hover:opacity-80 cursor-pointer" />
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

        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

      // Generic Metadata Section
    if (block.visualPlaceholder?.endsWith("_metadata_section")) {
      const dataKey = block.visualPlaceholder.replace("_metadata_section", "");
      const rawMetaFields = filledData[dataKey];
      const fields = Array.isArray(rawMetaFields) ? rawMetaFields as { label: string; value: string }[] : [];

      if (fields.length === 0) {
        return (
          <div className="group relative mb-8">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No metadata defined. Add fields in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

      const handleMetadataFieldEdit = (index: number, fieldType: "label" | "value", newValue: string) => {
        const updated = [...fields];
        updated[index] = { ...updated[index], [fieldType]: newValue };
        onDataChange(dataKey, updated);
      };

      return (
        <div className="group relative mb-8">
          <div className={`rounded-xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="grid grid-cols-2 gap-4">
              {fields.map((field, i) => (
                <div key={i} className="space-y-1">
                  <p 
                    className={`text-xs font-medium uppercase tracking-wider cursor-text hover:opacity-80 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleMetadataFieldEdit(i, "label", e.currentTarget.textContent || field.label)}
                  >{field.label}</p>
                  <p 
                    className={`font-medium cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleMetadataFieldEdit(i, "value", e.currentTarget.textContent || field.value)}
                  >{field.value}</p>
                </div>
              ))}
            </div>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

  // Generic Subsections Section (like Change Management)
  if (block.visualPlaceholder?.endsWith("_subsections_section")) {
    const baseKey = block.visualPlaceholder.replace("_subsections_section", "");
    const subsection1Key = `${baseKey}_subsection1_items`;
    const subsection2Key = `${baseKey}_subsection2_items`;
    const subsection3Key = `${baseKey}_subsection3_items`;
    const subsection1NameKey = `${baseKey}_subsection1_name`;
    const subsection2NameKey = `${baseKey}_subsection2_name`;
    const subsection3NameKey = `${baseKey}_subsection3_name`;
    
    const subsection1 = filledData[subsection1Key] as { key: string; value: string }[] || [];
    const subsection2 = filledData[subsection2Key] as { key: string; value: string }[] || [];
    const subsection3 = filledData[subsection3Key] as string[] || [];
    const subsection1Name = filledData[subsection1NameKey] as string || "Subsection 1 (Key-Value)";
    const subsection2Name = filledData[subsection2NameKey] as string || "Subsection 2 (Key-Value)";
    const subsection3Name = filledData[subsection3NameKey] as string || "Subsection 3 (Simple List)";

    const hasContent = subsection1.length > 0 || subsection2.length > 0 || subsection3.length > 0;

    if (!hasContent) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No content defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    const handleSubsection1Edit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...subsection1];
      updated[index] = { ...updated[index], [field]: newValue.replace(/:$/, "").replace(/\.$/, "") };
      onDataChange(subsection1Key, updated);
    };

    const handleSubsection2Edit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...subsection2];
      updated[index] = { ...updated[index], [field]: newValue.replace(/:$/, "").replace(/\.$/, "") };
      onDataChange(subsection2Key, updated);
    };

    const handleSubsection3Edit = (index: number, newValue: string) => {
      const updated = [...subsection3];
      updated[index] = newValue.replace(/\.$/, "");
      onDataChange(subsection3Key, updated);
    };

    return (
      <div className="group relative mb-8 space-y-6">
        {subsection1.length > 0 && (
          <div>
            <h3 
              className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange(subsection1NameKey, e.currentTarget.textContent || subsection1Name)}
            >{subsection1Name}</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {subsection1.map((item, idx) => (
                <li key={`sub1-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection1Edit(idx, "key", e.currentTarget.textContent || item.key)}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection1Edit(idx, "value", e.currentTarget.textContent || item.value)}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {subsection2.length > 0 && (
          <div>
            <h3 
              className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange(subsection2NameKey, e.currentTarget.textContent || subsection2Name)}
            >{subsection2Name}</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {subsection2.map((item, idx) => (
                <li key={`sub2-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection2Edit(idx, "key", e.currentTarget.textContent || item.key)}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection2Edit(idx, "value", e.currentTarget.textContent || item.value)}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {subsection3.length > 0 && (
          <div>
            <h3 
              className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange(subsection3NameKey, e.currentTarget.textContent || subsection3Name)}
            >{subsection3Name}</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {subsection3.map((item, idx) => (
                <li 
                  key={`sub3-${idx}`} 
                  className={`cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleSubsection3Edit(idx, e.currentTarget.textContent || item)}
                >{item}.</li>
              ))}
            </ul>
          </div>
        )}
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  if (block.type === "paragraph") {
      const hasUnfilledPlaceholder = /\{\{[^}]+\}\}/.test(block.content);
      if (hasUnfilledPlaceholder && block.optional && !isEditing) return null;
      
      const processMarkdown = (content: string) => {
        let processed = content;
        processed = processed.replace(/<strong[^>]*>([^<]+)<\/strong>/g, `<strong class="font-bold ${isDark ? 'text-white' : 'text-slate-900'}">$1</strong>`);
        processed = processed.replace(/<em[^>]*>([^<]+)<\/em>/g, `<em class="${isDark ? 'text-white' : 'text-slate-700'}">$1</em>`);
        processed = processed.replace(/<u[^>]*>([^<]+)<\/u>/g, `<u class="${isDark ? 'text-white' : 'text-slate-700'}">$1</u>`);
        processed = processed.replace(/\*\*([^*]+)\*\*/g, `<strong class="font-bold ${isDark ? 'text-white' : 'text-slate-900'}">$1</strong>`);
        processed = processed.replace(/\*([^*]+)\*/g, `<em class="${isDark ? 'text-white' : 'text-slate-700'}">$1</em>`);
        processed = processed.replace(/__([^_]+)__/g, `<u class="${isDark ? 'text-white' : 'text-slate-700'}">$1</u>`);
        processed = processed.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          const value = filledData[key];
          if (value !== undefined && value !== null && value !== "") {
            return `<span class="${isDark ? 'text-white' : 'text-slate-900'}">${String(value)}</span>`;
          }
          return `<span class="${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'} px-1 rounded">${match}</span>`;
        });
        return processed;
      };
      
      return (
        <div className="group relative mb-4" onMouseUp={handleSelection}>
          <div
            className={`whitespace-pre-wrap leading-relaxed cursor-text rounded p-2 -m-2 transition-colors outline-none focus:ring-2 focus:ring-primary/20 ${
              isDark 
                ? "text-white hover:bg-slate-800/50" 
                : "text-slate-700 hover:bg-slate-50"
            }`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newContent = e.currentTarget.innerHTML || "";
              if (newContent !== block.content) {
                onUpdate({ content: newContent });
              }
            }}
            dangerouslySetInnerHTML={{ __html: processMarkdown(block.content) }}
          />
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText={selectedText}
            onMakeDynamic={onMakeDynamic}
            onMakeStatic={onMakeStatic}
          />
        </div>
      );
    }

  if (block.type === "list") {
    const items = Array.isArray(block.items) ? block.items : [];
    if (items.length === 0) return null;
    return (
      <div className="group relative mb-6">
        <ul className={`list-disc pl-6 space-y-2 ${isDark ? "text-white" : "text-slate-700"}`}>
          {items.map((item, i) => {
            const text = typeof item === "string" ? item : (item as Record<string, string>).objective || "";
            return text ? <li key={i}>{text}</li> : null;
          })}
        </ul>
        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "delivery_plan" || block.visualPlaceholder === "delivery_phases_view") {
    const deliveryPhases = filledData.delivery_phases as any[] || [];
    const deliveryIntro = filledData.delivery_intro as string || "We divide development into three parts as below:";
    const startDate = filledData.start_date as string;
    
    if (deliveryPhases.length === 0) {
      return (
        <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 mb-8 ${
          isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
        }`}>
          <Info className="h-5 w-5 opacity-50" />
          <p className="text-sm">No delivery phases defined. Add phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
        </div>
      );
    }

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
      <div className="group relative mb-8 space-y-8">
        <div id={block.id} className="scroll-mt-4">
          <h2 
            className={`text-2xl font-bold border-b pb-2 mb-4 cursor-text outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1 ${isDark ? "text-white border-slate-700" : "text-slate-900 border-slate-200"}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newTitle = e.currentTarget.textContent || "Delivery Plan (Phases & Timelines)";
              onDataChange("delivery_plan_title", newTitle);
            }}
          >{filledData.delivery_plan_title as string || "Delivery Plan (Phases & Timelines)"}</h2>
          <p 
            className={`italic mb-6 cursor-text hover:opacity-80 outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onDataChange("delivery_intro", e.currentTarget.textContent || deliveryIntro)}
          >{deliveryIntro}</p>

          {deliveryPhases.map((phase: any, i: number) => (
            <div key={i} className="mb-8">
              <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span
                  className="cursor-text hover:opacity-80 outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const text = e.currentTarget.textContent || "";
                    const match = text.match(/Phase\s*(\d+)\s*\(Weeks?\s*(\d+)[–-](\d+)\)/i);
                      if (match) {
                        const newPhases = [...deliveryPhases];
                        newPhases[i] = { ...newPhases[i], weeks_start: parseInt(match[2]), weeks_end: parseInt(match[3]) };
                        onDataChange("delivery_phases", newPhases);
                      }
                    }}
                  >Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12})</span>: 
                  <span 
                    className="ml-1 cursor-text hover:opacity-80"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newPhases = [...deliveryPhases];
                      newPhases[i] = { ...newPhases[i], title: e.currentTarget.textContent || "" };
                      onDataChange("delivery_phases", newPhases);
                    }}
                  >{phase.title || ""}</span>
                </h3>
              <ul className="space-y-3">
                {(phase.platforms || []).filter((p: any) => p.name && p.features).map((platform: any, j: number) => (
                  <li key={j} className="flex">
                    <span 
                      className={`font-semibold min-w-[120px] cursor-text hover:opacity-80 ${isDark ? "text-slate-200" : "text-slate-800"}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newPhases = [...deliveryPhases];
                        const newPlatforms = [...(newPhases[i].platforms || [])];
                        newPlatforms[j] = { ...newPlatforms[j], name: e.currentTarget.textContent?.replace(/:$/, "") || "" };
                        newPhases[i] = { ...newPhases[i], platforms: newPlatforms };
                        onDataChange("delivery_phases", newPhases);
                      }}
                    >{platform.name}:</span>
                    <span 
                      className={`cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newPhases = [...deliveryPhases];
                        const newPlatforms = [...(newPhases[i].platforms || [])];
                        newPlatforms[j] = { ...newPlatforms[j], features: e.currentTarget.textContent || "" };
                        newPhases[i] = { ...newPhases[i], platforms: newPlatforms };
                        onDataChange("delivery_phases", newPhases);
                      }}
                    >{platform.features}</span>
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
            <button className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Feature # Per Phase
            </button>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {phaseChartData.reduce((acc: any[], p, i) => {
                  const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                  const percent = (p.duration / totalDuration) * 100;
                  acc.push({
                    ...p,
                    startPercent: prevPercent,
                    endPercent: prevPercent + percent,
                    color: activeChartColors[i % activeChartColors.length]
                  });
                  return acc;
                }, []).map((segment: any, i: number) => {
                  const circumference = 2 * Math.PI * 40;
                  const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                  const strokeDashoffset = -segment.startPercent / 100 * circumference;
                  return (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={hoveredPhase === i ? "12" : "8"}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{ opacity: hoveredPhase !== null && hoveredPhase !== i ? 0.4 : 1 }}
                      onMouseEnter={() => setHoveredPhase(i)}
                      onMouseLeave={() => setHoveredPhase(null)}
                    />
                  );
                })}
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
                <div 
                  key={i} 
                  className={`text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded ${
                    hoveredPhase === i 
                      ? (isDark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-900") 
                      : (isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900")
                  }`}
                  onMouseEnter={() => setHoveredPhase(i)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  Phase {i + 1}: {p.duration} weeks ({Math.round(p.duration / totalDuration * 100)}%)
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-6">
            {phaseChartData.map((p, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${
                  hoveredPhase === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""
                }`}
                onMouseEnter={() => setHoveredPhase(i)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: activeChartColors[i % activeChartColors.length] }}></div>
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
                  <div 
                    key={i} 
                    className="relative h-10"
                    onMouseEnter={() => setHoveredPhase(i)}
                    onMouseLeave={() => setHoveredPhase(null)}
                  >
                    <div 
                      className={`absolute h-full rounded-lg flex items-center px-3 text-sm font-medium text-white cursor-pointer transition-all duration-200 ${
                        hoveredPhase === i ? "scale-105 shadow-lg z-10" : hoveredPhase !== null ? "opacity-50" : ""
                      }`}
                      style={{ 
                        left: `${startPercent}%`, 
                        width: `${widthPercent}%`,
                        backgroundColor: activeChartColors[i % activeChartColors.length],
                        minWidth: '120px'
                      }}
                    >
                      Phase {i + 1}: {duration}w ({Math.round(duration / totalWeeks * 100)}%)
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

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "features_list_section") {
    const featureList = filledData.feature_list as any[] || [];
    const baselineTitle = filledData.baseline_title as string || `${filledData.client_name || 'Project'}-baseline-requirements`;

    if (featureList.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No features defined. Add features in the <span className="font-semibold text-primary">Form Data</span> tab under Features & Requirements.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const totalFeatures = featureList.length;

    const categoryByApp: Record<string, number> = {};
    featureList.forEach((f: any) => {
      const cat = f.category || "User";
      categoryByApp[cat] = (categoryByApp[cat] || 0) + 1;
    });
    const appChartData = Object.entries(categoryByApp).map(([name, count], i) => ({
      name,
      value: count,
      percent: ((count / totalFeatures) * 100).toFixed(1),
      color: activeChartColors[i % activeChartColors.length]
    }));

    const categoryBreakdown: Record<string, number> = {};
    featureList.forEach((f: any) => {
      const catName = f.subcategory || "General";
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
    });
    const barChartData = Object.entries(categoryBreakdown)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="group relative mb-8 space-y-6">
        <button 
          onClick={() => setShowDetailedTable(!showDetailedTable)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"
          }`}
        >
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
            <button 
              onClick={() => setActiveFeatureView("app")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                activeFeatureView === "app" 
                  ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              Requirements # by APP
            </button>
            <button 
              onClick={() => setActiveFeatureView("category")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                activeFeatureView === "category" 
                  ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Requirement # By Category
            </button>
          </div>

          {activeFeatureView === "app" ? (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {appChartData.reduce((acc: any[], item) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const percent = (item.value / totalFeatures) * 100;
                    acc.push({
                      ...item,
                      startPercent: prevPercent,
                      endPercent: prevPercent + percent,
                    });
                    return acc;
                  }, []).map((segment: any, i: number) => {
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                    const strokeDashoffset = -segment.startPercent / 100 * circumference;
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={hoveredApp === i ? "12" : "8"}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        style={{ opacity: hoveredApp !== null && hoveredApp !== i ? 0.4 : 1 }}
                        onMouseEnter={() => setHoveredApp(i)}
                        onMouseLeave={() => setHoveredApp(null)}
                      />
                    );
                  })}
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
                  <div 
                    key={i} 
                    className={`flex items-center justify-between gap-8 text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded ${
                      hoveredApp === i 
                        ? (isDark ? "bg-slate-700" : "bg-slate-200") 
                        : ""
                    }`}
                    onMouseEnter={() => setHoveredApp(i)}
                    onMouseLeave={() => setHoveredApp(null)}
                  >
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
                  <div 
                    key={i} 
                    className={`flex items-center gap-4 cursor-pointer transition-all duration-200 ${
                      hoveredCategory === i ? "scale-105" : hoveredCategory !== null ? "opacity-50" : ""
                    }`}
                    onMouseEnter={() => setHoveredCategory(i)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className={`w-48 text-right text-sm truncate shrink-0 ${hoveredCategory === i ? (isDark ? "text-white font-medium" : "text-slate-900 font-medium") : (isDark ? "text-slate-400" : "text-slate-500")}`}>{item.name}</div>
                    <div className={`flex-1 h-6 rounded overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div 
                        className="h-full rounded transition-all duration-700"
                        style={{ 
                          width: `${width}%`, 
                          backgroundColor: activeChartColors[i % activeChartColors.length],
                          boxShadow: hoveredCategory === i ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                        }}
                      ></div>
                    </div>
                    <div className={`w-12 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{item.count} ({Math.round(item.count / totalFeatures * 100)}%)</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`flex flex-wrap justify-center gap-6 mt-8 pt-4 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
            {appChartData.map((item, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all ${
                  hoveredApp === i ? (isDark ? "bg-slate-700" : "bg-slate-200") : ""
                }`}
                onMouseEnter={() => setHoveredApp(i)}
                onMouseLeave={() => setHoveredApp(null)}
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "resource_engagement") {
      const resources = filledData.resource_plan as any[] || [];
      const resourceCount = resources.length;
      const defaultJustification = `${resourceCount} resource${resourceCount !== 1 ? 's' : ''}, with some engaged on an as-needed basis, can deliver the work effectively.`;
      const justification = filledData.resource_justification as string || defaultJustification;

      if (resources.length === 0) {
        return (
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 mb-8 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No resources defined. Add resources in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
        );
      }

      const maxVal = resourceView === "count" 
        ? Math.max(...resources.map(r => r.count || 0), 1)
        : 100;

      return (
        <div className="group relative mb-8 space-y-4">
          <p 
            className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onDataChange("resource_justification", e.currentTarget.textContent || justification)}
          >{justification}</p>

          <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-8">
              <button 
                onClick={() => setResourceView("count")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  resourceView === "count" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Role & Count
              </button>
              <button 
                onClick={() => setResourceView("engagement")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  resourceView === "engagement" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                % of Engagement
              </button>
            </div>

              <div className="space-y-6">
                  {resources.map((res: any, i: number) => {
                    const val = resourceView === "count" ? (res.count || 0) : (res.allocation || 100);
                    const width = (val / maxVal) * 100;
                    return (
                      <div key={`res-${i}-${res.role}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        <div className={`w-48 text-right text-sm truncate cursor-text ${isDark ? "text-white" : "text-slate-500"}`}
                          contentEditable suppressContentEditableWarning
                          onBlur={(e) => {
                            const newRole = e.currentTarget.textContent?.trim() || res.role;
                            if (newRole !== res.role) {
                              const updated = resources.map((r: any, idx: number) => idx === i ? { ...r, role: newRole } : r);
                              onDataChange("resource_plan", updated);
                            }
                          }}
                        >{res.role}</div>
                        <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${width}%`, backgroundColor: activeChartColors[i % activeChartColors.length] }}
                          ></div>
                        </div>
                        <div className={`w-16 text-sm font-medium cursor-text ${isDark ? "text-white" : "text-slate-900"}`}
                          contentEditable suppressContentEditableWarning
                          onBlur={(e) => {
                            const text = e.currentTarget.textContent?.trim() || "";
                            const numVal = parseInt(text.replace(/%/g, ""));
                            if (!isNaN(numVal)) {
                              const updated = resources.map((r: any, idx: number) => {
                                if (idx === i) {
                                  return resourceView === "count" 
                                    ? { ...r, count: numVal } 
                                    : { ...r, allocation: numVal };
                                }
                                return r;
                              });
                              onDataChange("resource_plan", updated);
                            }
                          }}
                        >{val}{resourceView === "engagement" ? "%" : ""}</div>
                    </div>
                  );
                })}
              </div>
          </div>

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

  if (block.visualPlaceholder === "pricing_section") {
      const deliveryPhases = filledData.delivery_phases as any[] || [];
      const rawPhasePricing = filledData.phase_pricing_table as any[] || [];
      const taxPercent = Number(filledData.tax_percent) || 18;
      const pricingNotes = filledData.pricing_notes as string || "";
      
      // Use phase_pricing_table if it has data with costs, otherwise fall back to delivery_phases
      let phasePricing = rawPhasePricing;
      const hasPricingData = rawPhasePricing.length > 0 && rawPhasePricing.some((p: any) => Number(p.cost) > 0);
      
      if (!hasPricingData && deliveryPhases.length > 0) {
        // Generate placeholder pricing from delivery_phases
        phasePricing = deliveryPhases.map((phase: any, idx: number) => {
          const phaseNum = idx + 1;
          const phaseLabel = phase.title && phase.title.trim() !== "" 
            ? `Phase ${phaseNum}: ${phase.title}` 
            : `Phase ${phaseNum}`;
          
          return {
            phase: phaseLabel,
            cost: 0,
            breakdown: []
          };
        });
      }
      
      const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
      const totalWithTax = totalCost * (1 + taxPercent / 100);

      if (phasePricing.length === 0) {
        return (
          <div className="group relative mb-8 space-y-6">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No pricing phases defined. Define phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="group relative mb-8 space-y-6">
          <p 
            className={`leading-relaxed cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable
            suppressContentEditableWarning
          >
            Given the scope, team composition, and phased delivery, the complete {phasePricing.length}-phase engagement is priced at 
            <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span>, 
            totaling <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>, 
            with phase-wise distributions detailed below.
          </p>

          <div className={`rounded-2xl p-6 min-h-[400px] border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              <button 
                onClick={() => setActivePricingTab("summary")}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                  activePricingTab === "summary" 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Pricing Per Phase
              </button>
              {phasePricing.map((p, i) => (
                <button 
                  key={i}
                  onClick={() => setActivePricingTab(`phase-${i}`)}
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                    activePricingTab === `phase-${i}` 
                      ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                      : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                  }`}
                >
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
                      {phasePricing.reduce((acc: any[], p, i) => {
                        const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                        const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / phasePricing.length);
                        acc.push({
                          ...p,
                          startPercent: prevPercent,
                          endPercent: prevPercent + percent,
                          color: activeChartColors[i % activeChartColors.length]
                        });
                        return acc;
                      }, []).map((segment: any, i: number) => {
                        const circumference = 2 * Math.PI * 40;
                        const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                        const strokeDashoffset = -segment.startPercent / 100 * circumference;
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="hover:opacity-80 cursor-pointer transition-opacity"
                          />
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
                  {phasePricing.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: activeChartColors[i % activeChartColors.length] }}></div>
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
                      <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{phasePricing[parseInt(activePricingTab.split("-")[1])].phase}</h4>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Detailed costing breakdown for this phase</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-violet-400">{formatCurrency(Number(phasePricing[parseInt(activePricingTab.split("-")[1])].cost))}</div>
                    <div className={`text-[10px] uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Phase Total</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(phasePricing[parseInt(activePricingTab.split("-")[1])].breakdown || []).map((b: any) => ({
                            name: b.item,
                            value: Number(b.cost) || 0
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(phasePricing[parseInt(activePricingTab.split("-")[1])].breakdown || []).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={activeChartColors[index % activeChartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDark ? "#1e293b" : "#fff", border: isDark ? "none" : "1px solid #e2e8f0", borderRadius: "8px", color: isDark ? "#fff" : "#1e293b" }}
                          itemStyle={{ color: isDark ? "#fff" : "#1e293b" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    {(phasePricing[parseInt(activePricingTab.split("-")[1])].breakdown || []).map((item: any, idx: number) => {
                      const percentage = (Number(item.cost) / (Number(phasePricing[parseInt(activePricingTab.split("-")[1])].cost) || 1)) * 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeChartColors[idx % activeChartColors.length] }}></div>
                              {item.item}
                            </span>
                            <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(Number(item.cost))} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: activeChartColors[idx % activeChartColors.length]
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-100 border-slate-200"}`}>
                  <Info className="h-4 w-4 text-violet-400 shrink-0" />
                  <p className={`text-[11px] italic ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    This breakdown covers the specialized resources and operational overheads allocated specifically for {phasePricing[parseInt(activePricingTab.split("-")[1])].phase}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

          {pricingNotes && (
            <div className={`p-4 rounded-xl border text-sm italic ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
              Note: {pricingNotes}
            </div>
          )}

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
          </div>
        );
      }

  if (block.visualPlaceholder === "tasks_section") {
    const tasks = filledData.tasks_detailed as { type: string; description: string }[] || [];

    if (tasks.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No tasks defined. Add tasks in the <span className="font-semibold text-primary">Form Data</span> tab under Tasks Involved section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedTasks: Record<string, string[]> = {};
    tasks.forEach(t => {
      if (!groupedTasks[t.type]) {
        groupedTasks[t.type] = [];
        orderedCategories.push(t.type);
      }
      groupedTasks[t.type].push(t.description);
    });

    const handleTaskCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedTasks = tasks.map(t => 
          t.type === oldCategory ? { ...t, type: newCategory } : t
        );
        onDataChange("tasks_detailed", updatedTasks);
      }
    };

    const handleTaskItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherTasks = tasks.filter(t => t.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryTasks = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedTasks[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherTasks.slice(0, insertIndex),
        ...newCategoryTasks,
        ...otherTasks.slice(insertIndex)
      ];
      onDataChange("tasks_detailed", result);
    };

    return (
      <div className="group relative mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, idx) => {
            const items = groupedTasks[category];
            return (
              <li key={`task-cat-${idx}`} className="group/item">
                <span 
                  className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                    handleTaskCategoryEdit(category, newCategory);
                  }}
                >{category}:</span>
                <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      handleTaskItemsEdit(category, e.currentTarget.textContent || "");
                    }}
                  >
                    {items.join(", ")}.
                  </span>
              </li>
            );
          })}
        </ul>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

    if (block.visualPlaceholder === "deliverables_section") {
    const deliverables = filledData.deliverables_detailed as { type: string; description: string }[] || [];
    const introText = filledData.deliverables_intro as string || "Deliverables Explained with Future Benefits";

    if (deliverables.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No deliverables defined. Add deliverables in the <span className="font-semibold text-primary">Form Data</span> tab under Deliverables section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedDeliverables: Record<string, string[]> = {};
    deliverables.forEach(d => {
      if (!groupedDeliverables[d.type]) {
        groupedDeliverables[d.type] = [];
        orderedCategories.push(d.type);
      }
      groupedDeliverables[d.type].push(d.description);
    });

    const handleDeliverableCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedDeliverables = deliverables.map(d => 
          d.type === oldCategory ? { ...d, type: newCategory } : d
        );
        onDataChange("deliverables_detailed", updatedDeliverables);
      }
    };

    const handleDeliverableItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherDeliverables = deliverables.filter(d => d.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryDeliverables = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedDeliverables[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherDeliverables.slice(0, insertIndex),
        ...newCategoryDeliverables,
        ...otherDeliverables.slice(insertIndex)
      ];
      onDataChange("deliverables_detailed", result);
    };

    return (
        <div className="group relative mb-8">
          <p 
            className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-500"}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              onDataChange("deliverables_intro", e.currentTarget.textContent || introText);
            }}
          >{introText}</p>
          
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, idx) => {
              const items = groupedDeliverables[category];
              return (
                <li key={`deliverable-cat-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newCategory = e.currentTarget.textContent?.trim() || category;
                      handleDeliverableCategoryEdit(category, newCategory);
                    }}
                  >{category}</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      handleDeliverableItemsEdit(category, e.currentTarget.textContent || "");
                    }}
                  >
                    {items.join(", ")}.
                  </span>
                </li>
              );
            })}
          </ul>

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  if (block.visualPlaceholder === "assumptions_section") {
    const assumptions = filledData.assumptions_detailed as { type: string; description: string }[] || [];

    if (assumptions.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No assumptions defined. Add assumptions in the <span className="font-semibold text-primary">Form Data</span> tab under Assumptions section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedAssumptions: Record<string, string[]> = {};
    assumptions.forEach(a => {
      if (!groupedAssumptions[a.type]) {
        groupedAssumptions[a.type] = [];
        orderedCategories.push(a.type);
      }
      groupedAssumptions[a.type].push(a.description);
    });

    const handleAssumptionCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedAssumptions = assumptions.map(a => 
          a.type === oldCategory ? { ...a, type: newCategory } : a
        );
        onDataChange("assumptions_detailed", updatedAssumptions);
      }
    };

    const handleAssumptionItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherAssumptions = assumptions.filter(a => a.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryAssumptions = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedAssumptions[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherAssumptions.slice(0, insertIndex),
        ...newCategoryAssumptions,
        ...otherAssumptions.slice(insertIndex)
      ];
      onDataChange("assumptions_detailed", result);
    };

      return (
        <div className="group relative mb-8">
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, catIdx) => {
              const items = groupedAssumptions[category];
              const combinedDescription = items.join(", ");
              return (
                <li key={`assumption-${category}`} className="group/item">
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>A{catIdx + 1}: </span>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                      handleAssumptionCategoryEdit(category, newCategory);
                    }}
                  >{category}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newText = e.currentTarget.textContent?.replace(/\.$/, "").trim() || combinedDescription;
                      handleAssumptionItemsEdit(category, newText);
                    }}
                  >
                    {combinedDescription}.
                  </span>
                </li>
              );
            })}
          </ul>

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

  if (block.visualPlaceholder === "dependencies_section") {
    const dependencies = filledData.dependencies_detailed as { type: string; description: string }[] || [];

    if (dependencies.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No dependencies defined. Add dependencies in the <span className="font-semibold text-primary">Form Data</span> tab under Dependencies section.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const orderedCategories: string[] = [];
    const groupedDependencies: Record<string, string[]> = {};
    dependencies.forEach(d => {
      if (!groupedDependencies[d.type]) {
        groupedDependencies[d.type] = [];
        orderedCategories.push(d.type);
      }
      groupedDependencies[d.type].push(d.description);
    });

    const handleDependencyCategoryEdit = (oldCategory: string, newCategory: string) => {
      if (newCategory && newCategory !== oldCategory) {
        const updatedDependencies = dependencies.map(d => 
          d.type === oldCategory ? { ...d, type: newCategory } : d
        );
        onDataChange("dependencies_detailed", updatedDependencies);
      }
    };

    const handleDependencyItemsEdit = (category: string, newItemsText: string) => {
      const newItems = newItemsText.replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
      const otherDependencies = dependencies.filter(d => d.type !== category);
      const categoryIndex = orderedCategories.indexOf(category);
      const newCategoryDependencies = newItems.map(desc => ({ type: category, description: desc }));
      
      let insertIndex = 0;
      for (let i = 0; i < categoryIndex; i++) {
        insertIndex += groupedDependencies[orderedCategories[i]]?.length || 0;
      }
      
      const result = [
        ...otherDependencies.slice(0, insertIndex),
        ...newCategoryDependencies,
        ...otherDependencies.slice(insertIndex)
      ];
      onDataChange("dependencies_detailed", result);
    };

      return (
        <div className="group relative mb-8">
          <ul className="space-y-4 list-disc list-outside ml-6">
            {orderedCategories.map((category, catIdx) => {
              const items = groupedDependencies[category];
              const combinedDescription = items.join(", ");
              return (
                <li key={`dependency-${category}`} className="group/item">
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>D{catIdx + 1}: </span>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                      handleDependencyCategoryEdit(category, newCategory);
                    }}
                  >{category}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newText = e.currentTarget.textContent?.replace(/\.$/, "").trim() || combinedDescription;
                      handleDependencyItemsEdit(category, newText);
                    }}
                  >
                    {combinedDescription}.
                  </span>
                </li>
              );
            })}
          </ul>

          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
          </div>
        );
      }

  if (block.visualPlaceholder === "change_management_section") {
    const processItems = filledData.change_process_items as { key: string; value: string }[] || [];
    const classificationItems = filledData.change_classification_items as { key: string; value: string }[] || [];
    const constraintItems = filledData.change_constraint_items as string[] || [];

    const hasContent = processItems.length > 0 || classificationItems.length > 0 || constraintItems.length > 0;

    if (!hasContent) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No change management details defined. Add process, classification, and constraints in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar
            block={block}
            onDelete={onDelete}
            onInsertVisual={onInsertVisual}
            selectedText=""
            onMakeDynamic={onMakeDynamic}
          />
        </div>
      );
    }

    const handleProcessItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...processItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("change_process_items", updated);
    };

    const handleClassificationItemEdit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...classificationItems];
      updated[index] = { ...updated[index], [field]: newValue };
      onDataChange("change_classification_items", updated);
    };

    const handleConstraintItemEdit = (index: number, newValue: string) => {
      const updated = [...constraintItems];
      updated[index] = newValue;
      onDataChange("change_constraint_items", updated);
    };

    return (
      <div className="group relative mb-8 space-y-6">
        {/* Process Section */}
        {processItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Process</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {processItems.map((item, idx) => (
                <li key={`process-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleProcessItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleProcessItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Classification Section */}
        {classificationItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Classification</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {classificationItems.map((item, idx) => (
                <li key={`classification-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                      handleClassificationItemEdit(idx, "key", newKey);
                    }}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                      handleClassificationItemEdit(idx, "value", newValue);
                    }}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Constraints Section */}
        {constraintItems.length > 0 && (
          <div>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Constraints</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {constraintItems.map((item, idx) => (
                <li key={`constraint-${idx}`}>
                  <span 
                    className={`cursor-text hover:opacity-80 transition-opacity ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newValue = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item;
                      handleConstraintItemEdit(idx, newValue);
                    }}
                  >{item}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

  // Generic Bullet Key-Value Section (like Deliverables)
  if (block.visualPlaceholder?.endsWith("_items_section")) {
    const dataKey = block.visualPlaceholder.replace("_section", "");
    const introKey = dataKey.replace("_items", "_intro");
    const rawItemsData = filledData[dataKey];
    const items = Array.isArray(rawItemsData) ? rawItemsData as { type: string; description: string }[] : [];
    const introText = filledData[introKey] as string || "";

    if (items.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

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
      <div className="group relative mb-8">
        {introText && (
          <p className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-500"}`}
            contentEditable suppressContentEditableWarning
            onBlur={(e) => onDataChange(introKey, e.currentTarget.textContent || introText)}
          >{introText}</p>
        )}
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, idx) => {
            const categoryItems = groupedItems[category];
            return (
              <li key={`item-${idx}`}>
                <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newCategory = e.currentTarget.textContent?.trim() || category;
                    if (newCategory !== category) {
                      const updated = items.map(i => i.type === category ? { ...i, type: newCategory } : i);
                      onDataChange(dataKey, updated);
                    }
                  }}
                >{category}</span>
                <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newItems = (e.currentTarget.textContent || "").replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
                    const otherItems = items.filter(i => i.type !== category);
                    const newCategoryItems = newItems.map(desc => ({ type: category, description: desc }));
                    onDataChange(dataKey, [...otherItems, ...newCategoryItems]);
                  }}
                >{categoryItems.join(", ")}.</span>
              </li>
            );
          })}
        </ul>
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  // Generic Indexed Bullet Section (like Assumptions/Dependencies)
  if (block.visualPlaceholder?.endsWith("_indexed_section")) {
    const baseKey = block.visualPlaceholder.replace("_indexed_section", "");
    const dataKey = `${baseKey}_items`;
    const prefixKey = `${baseKey}_prefix`;
    const rawIndexedData = filledData[dataKey];
    const items = Array.isArray(rawIndexedData) ? rawIndexedData as { type: string; description: string }[] : [];
    const prefix = (filledData[prefixKey] as string) || baseKey.charAt(0).toUpperCase();

    if (items.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

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
      <div className="group relative mb-8">
        <ul className="space-y-4 list-disc list-outside ml-6">
          {orderedCategories.map((category, catIdx) => {
            const categoryItems = groupedItems[category];
            return (
              <li key={`indexed-${category}`}>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-500"}`}>{prefix}{catIdx + 1}: </span>
                <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newCategory = e.currentTarget.textContent?.replace(/:$/, "").trim() || category;
                    if (newCategory !== category) {
                      const updated = items.map(i => i.type === category ? { ...i, type: newCategory } : i);
                      onDataChange(dataKey, updated);
                    }
                  }}
                >{category}:</span>
                <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newItems = (e.currentTarget.textContent || "").replace(/\.$/, "").split(",").map(s => s.trim()).filter(Boolean);
                    const otherItems = items.filter(i => i.type !== category);
                    const newCategoryItems = newItems.map(desc => ({ type: category, description: desc }));
                    onDataChange(dataKey, [...otherItems, ...newCategoryItems]);
                  }}
                >{categoryItems.join(", ")}.</span>
              </li>
            );
          })}
        </ul>
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  // Generic Bar Graph Section (like Resource Engagement)
  if (block.visualPlaceholder?.endsWith("_bar_section")) {
    const baseKey = block.visualPlaceholder.replace("_bar_section", "");
    const dataKey = `${baseKey}_data`;
    const justificationKey = `${baseKey}_justification`;
    const rawBarData = filledData[dataKey];
    const items = Array.isArray(rawBarData) ? rawBarData as { role: string; count: number; allocation: number }[] : [];
    const justification = filledData[justificationKey] as string || "";
    const [view, setView] = useState<"count" | "engagement">("count");

    if (items.length === 0) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No data defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    const maxVal = view === "count" ? Math.max(...items.map(r => r.count || 0), 1) : 100;

    return (
      <div className="group relative mb-8 space-y-4">
        {justification && (
          <p className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
            contentEditable suppressContentEditableWarning
            onBlur={(e) => onDataChange(justificationKey, e.currentTarget.textContent || justification)}
          >{justification}</p>
        )}
        <div className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8">
            <button onClick={() => setView("count")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                view === "count" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}>
              <BarChart3 className="w-4 h-4" /> Count
            </button>
            <button onClick={() => setView("engagement")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                view === "engagement" ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}>
              <TrendingUp className="w-4 h-4" /> % Allocation
            </button>
          </div>
          <div className="space-y-6">
            {items.map((item, i) => {
              const val = view === "count" ? (item.count || 0) : (item.allocation || 100);
              const width = (val / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-48 text-right text-sm truncate ${isDark ? "text-white" : "text-slate-500"}`}>{item.role}</div>
                  <div className={`flex-1 h-3 rounded-full overflow-hidden relative ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${width}%`, backgroundColor: chartColors[i % chartColors.length] }}></div>
                  </div>
                  <div className={`w-8 text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{val}{view === "engagement" ? "%" : ""}</div>
                </div>
              );
            })}
            </div>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

  // Generic Pricing/Calculations Section (like Pricing)
  if (block.visualPlaceholder?.endsWith("_pricing_section") && block.visualPlaceholder !== "pricing_section") {
    const baseKey = block.visualPlaceholder.replace("_pricing_section", "");
    const tableKey = `${baseKey}_table`;
    const taxKey = `${baseKey}_tax_percent`;
    const notesKey = `${baseKey}_notes`;
    
    const phasePricing = filledData[tableKey] as any[] || [];
    const taxPercent = Number(filledData[taxKey]) || 18;
    const pricingNotes = filledData[notesKey] as string || "";
    const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
    const totalWithTax = totalCost * (1 + taxPercent / 100);
    const [activePricingTab, setActiveTab] = useState<string>("summary");

    if (phasePricing.length === 0) {
      return (
        <div className="group relative mb-8 space-y-6">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No phases defined. Add phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    return (
      <div className="group relative mb-8 space-y-6">
        <p className={`leading-relaxed cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}>
          The complete engagement is priced at 
          <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalCost)} + {taxPercent}% GST</span>, 
          totaling <span className={`font-bold mx-1 ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(totalWithTax)}</span>.
        </p>

        <div className={`rounded-2xl p-6 min-h-[400px] border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button 
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                activePricingTab === "summary" 
                  ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                  : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              Overview
            </button>
            {phasePricing.map((p, i) => (
              <button 
                key={i}
                onClick={() => setActiveTab(`phase-${i}`)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                  activePricingTab === `phase-${i}` 
                    ? (isDark ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-900") 
                    : (isDark ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-900")
                }`}
              >
                {p.phase || `Item ${i+1}`}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            {activePricingTab === "summary" ? (
              <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {phasePricing.reduce((acc: any[], p, i) => {
                        const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                        const percent = totalCost > 0 ? (Number(p.cost) / totalCost) * 100 : (100 / phasePricing.length);
                        acc.push({
                          ...p,
                          startPercent: prevPercent,
                          endPercent: prevPercent + percent,
                          color: chartColors[i % chartColors.length]
                        });
                        return acc;
                      }, []).map((segment: any, i: number) => {
                        const circumference = 2 * Math.PI * 40;
                        const strokeDasharray = `${(segment.endPercent - segment.startPercent) / 100 * circumference} ${circumference}`;
                        const strokeDashoffset = -segment.startPercent / 100 * circumference;
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="hover:opacity-80 cursor-pointer transition-opacity"
                          />
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
                  {phasePricing.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                      <span>{p.phase || `Item ${i+1}`}: {formatCurrencyShort(Number(p.cost))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                {(() => {
                  const idx = parseInt(activePricingTab.split("-")[1]);
                  const item = phasePricing[idx];
                  if (!item) return null;
                  return (
                    <div className={`p-6 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.phase || `Item ${idx+1}`}</h4>
                        <div className="text-2xl font-bold text-violet-400">{formatCurrency(Number(item.cost))}</div>
                      </div>
                      {item.breakdown && item.breakdown.length > 0 && (
                        <div className="space-y-3">
                          {item.breakdown.map((b: any, bi: number) => {
                            const percentage = (Number(b.cost) / (Number(item.cost) || 1)) * 100;
                            return (
                              <div key={bi} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>{b.item}</span>
                                  <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrencyShort(Number(b.cost))} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className={`h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {pricingNotes && (
          <div className={`p-4 rounded-xl border text-sm italic ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
            Note: {pricingNotes}
          </div>
        )}

        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

    // Generic Plan Section (like Delivery Plan)
    if (block.visualPlaceholder?.endsWith("_plan_section") && block.visualPlaceholder !== "delivery_plan") {
      const baseKey = block.visualPlaceholder.replace("_plan_section", "");
      const phasesKey = `${baseKey}_phases`;
      const introKey = `${baseKey}_intro`;
      
      const phases = filledData[phasesKey] as any[] || [];
      const introText = filledData[introKey] as string || "";
      
      if (phases.length === 0) {
        return (
          <div className="group relative mb-8">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No phases defined. Add phases in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

      const totalWeeks = Math.max(phases.reduce((max, p) => Math.max(max, p.weeks_end || 0), 0), 1);

      const handlePlanPhaseEdit = (index: number, field: string, newValue: string | number) => {
        const updated = [...phases];
        updated[index] = { ...updated[index], [field]: newValue };
        onDataChange(phasesKey, updated);
      };

      return (
        <div className="group relative mb-8 space-y-6">
          {introText && (
            <p className={`italic mb-6 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
              contentEditable suppressContentEditableWarning
              onBlur={(e) => onDataChange(introKey, e.currentTarget.textContent || introText)}
            >{introText}</p>
          )}

          {phases.map((phase: any, i: number) => (
            <div key={i} className="mb-6">
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span 
                  className="cursor-text hover:opacity-80"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const text = e.currentTarget.textContent || "";
                    const match = text.match(/Phase\s*(\d+)\s*\(Weeks?\s*(\d+)[–-](\d+)\)/i);
                    if (match) {
                      const updated = [...phases];
                      updated[i] = { ...updated[i], weeks_start: parseInt(match[2]), weeks_end: parseInt(match[3]) };
                      onDataChange(phasesKey, updated);
                    }
                  }}
                >Phase {i + 1} (Weeks {phase.weeks_start || 0}–{phase.weeks_end || 12})</span>: 
                <span 
                  className="ml-1 cursor-text hover:opacity-80"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handlePlanPhaseEdit(i, "title", e.currentTarget.textContent || "")}
                >{phase.title || ""}</span>
              </h3>
            </div>
          ))}

          <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {phases.reduce((acc: any[], p, i) => {
                    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
                    const duration = (p.weeks_end || 0) - (p.weeks_start || 0);
                    const percent = (duration / totalWeeks) * 100;
                    acc.push({ startPercent: prevPercent, endPercent: prevPercent + percent, color: chartColors[i % chartColors.length] });
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
                <span className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{totalWeeks}</span>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Weeks</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {phases.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Phase {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
      );
    }

    // Generic Table with Chart Section (like Features)
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
      const [activeView, setActiveView] = useState<"category" | "subcategory">("category");
      const [showTable, setShowTable] = useState(false);

      const handleTableItemEdit = (rowIndex: number, colKey: string, newValue: string) => {
        const updatedItems = [...items];
        updatedItems[rowIndex] = { ...updatedItems[rowIndex], [colKey]: newValue };
        onDataChange(listKey, updatedItems);
      };

      const handleColumnLabelEdit = (colIndex: number, newLabel: string) => {
        const updatedColumns = [...columns];
        updatedColumns[colIndex] = { ...updatedColumns[colIndex], label: newLabel };
        onDataChange(columnsKey, updatedColumns);
      };

      const handleTitleEdit = (newTitle: string) => {
        onDataChange(titleKey, newTitle);
      };

      if (items.length === 0) {
        return (
          <div className="group relative mb-8">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

      const categoryCount: Record<string, number> = {};
      items.forEach((item: any) => {
        const cat = item.category || "Other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const chartData = Object.entries(categoryCount).map(([name, count], i) => ({
        name, count, color: chartColors[i % chartColors.length], percent: ((count / items.length) * 100).toFixed(1)
      }));

      return (
        <div className="group relative mb-8 space-y-6">
          <button 
            onClick={() => setShowTable(!showTable)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"
            }`}
          >
            <Table2 className="h-4 w-4" />
            <span 
              className="font-medium cursor-text"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleTitleEdit(e.currentTarget.textContent || tableTitle)}
              onClick={(e) => e.stopPropagation()}
            >{tableTitle}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTable ? "rotate-180" : ""}`} />
          </button>

          {showTable && (
            <div className={`rounded-xl p-4 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <Table>
                <TableHeader>
                  <TableRow className={isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}>
                    {columns.map((col: any, colIdx: number) => (
                      <TableHead 
                        key={col.key} 
                        className={`${isDark ? "text-slate-300" : "text-slate-700"} cursor-text`}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleColumnLabelEdit(colIdx, e.currentTarget.textContent || col.label)}
                      >{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, i: number) => (
                    <TableRow key={i} className={isDark ? "hover:bg-slate-800/50 border-slate-700" : "hover:bg-slate-50 border-slate-200"}>
                      {columns.map((col: any) => (
                        <TableCell 
                          key={col.key} 
                          className={`${isDark ? "text-slate-300" : "text-slate-600"} cursor-text`}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleTableItemEdit(i, col.key, e.currentTarget.textContent || "")}
                        >{item[col.key] || "-"}</TableCell>
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
                      strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-500 hover:opacity-80 cursor-pointer" />
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

        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

      // Generic Metadata Section
    if (block.visualPlaceholder?.endsWith("_metadata_section")) {
      const dataKey = block.visualPlaceholder.replace("_metadata_section", "");
      const rawMetaFields = filledData[dataKey];
      const fields = Array.isArray(rawMetaFields) ? rawMetaFields as { label: string; value: string }[] : [];

      if (fields.length === 0) {
        return (
          <div className="group relative mb-8">
            <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
              isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
            }`}>
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No metadata defined. Add fields in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

      const handleMetadataFieldEdit = (index: number, fieldType: "label" | "value", newValue: string) => {
        const updated = [...fields];
        updated[index] = { ...updated[index], [fieldType]: newValue };
        onDataChange(dataKey, updated);
      };

      return (
        <div className="group relative mb-8">
          <div className={`rounded-xl p-6 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="grid grid-cols-2 gap-4">
              {fields.map((field, i) => (
                <div key={i} className="space-y-1">
                  <p 
                    className={`text-xs font-medium uppercase tracking-wider cursor-text hover:opacity-80 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleMetadataFieldEdit(i, "label", e.currentTarget.textContent || field.label)}
                  >{field.label}</p>
                  <p 
                    className={`font-medium cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleMetadataFieldEdit(i, "value", e.currentTarget.textContent || field.value)}
                  >{field.value}</p>
                </div>
              ))}
            </div>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

  // Generic Subsections Section (like Change Management)
  if (block.visualPlaceholder?.endsWith("_subsections_section")) {
    const baseKey = block.visualPlaceholder.replace("_subsections_section", "");
    const subsection1Key = `${baseKey}_subsection1_items`;
    const subsection2Key = `${baseKey}_subsection2_items`;
    const subsection3Key = `${baseKey}_subsection3_items`;
    const subsection1NameKey = `${baseKey}_subsection1_name`;
    const subsection2NameKey = `${baseKey}_subsection2_name`;
    const subsection3NameKey = `${baseKey}_subsection3_name`;
    
    const subsection1 = filledData[subsection1Key] as { key: string; value: string }[] || [];
    const subsection2 = filledData[subsection2Key] as { key: string; value: string }[] || [];
    const subsection3 = filledData[subsection3Key] as string[] || [];
    const subsection1Name = filledData[subsection1NameKey] as string || "Subsection 1 (Key-Value)";
    const subsection2Name = filledData[subsection2NameKey] as string || "Subsection 2 (Key-Value)";
    const subsection3Name = filledData[subsection3NameKey] as string || "Subsection 3 (Simple List)";

    const hasContent = subsection1.length > 0 || subsection2.length > 0 || subsection3.length > 0;

    if (!hasContent) {
      return (
        <div className="group relative mb-8">
          <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
            isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
          }`}>
            <Info className="h-5 w-5 opacity-50" />
            <p className="text-sm">No content defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
          </div>
          <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
        </div>
      );
    }

    const handleSubsection1Edit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...subsection1];
      updated[index] = { ...updated[index], [field]: newValue.replace(/:$/, "").replace(/\.$/, "") };
      onDataChange(subsection1Key, updated);
    };

    const handleSubsection2Edit = (index: number, field: "key" | "value", newValue: string) => {
      const updated = [...subsection2];
      updated[index] = { ...updated[index], [field]: newValue.replace(/:$/, "").replace(/\.$/, "") };
      onDataChange(subsection2Key, updated);
    };

    const handleSubsection3Edit = (index: number, newValue: string) => {
      const updated = [...subsection3];
      updated[index] = newValue.replace(/\.$/, "");
      onDataChange(subsection3Key, updated);
    };

    return (
      <div className="group relative mb-8 space-y-6">
        {subsection1.length > 0 && (
          <div>
            <h3 
              className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange(subsection1NameKey, e.currentTarget.textContent || subsection1Name)}
            >{subsection1Name}</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {subsection1.map((item, idx) => (
                <li key={`sub1-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection1Edit(idx, "key", e.currentTarget.textContent || item.key)}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection1Edit(idx, "value", e.currentTarget.textContent || item.value)}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {subsection2.length > 0 && (
          <div>
            <h3 
              className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange(subsection2NameKey, e.currentTarget.textContent || subsection2Name)}
            >{subsection2Name}</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {subsection2.map((item, idx) => (
                <li key={`sub2-${idx}`}>
                  <span 
                    className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection2Edit(idx, "key", e.currentTarget.textContent || item.key)}
                  >{item.key}:</span>
                  <span 
                    className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSubsection2Edit(idx, "value", e.currentTarget.textContent || item.value)}
                  >{item.value}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {subsection3.length > 0 && (
          <div>
            <h3 
              className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onDataChange(subsection3NameKey, e.currentTarget.textContent || subsection3Name)}
            >{subsection3Name}</h3>
            <ul className="space-y-3 list-disc list-outside ml-6">
              {subsection3.map((item, idx) => (
                <li 
                  key={`sub3-${idx}`} 
                  className={`cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleSubsection3Edit(idx, e.currentTarget.textContent || item)}
                >{item}.</li>
              ))}
            </ul>
          </div>
        )}
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  if (block.type === "image" && block.content) {
    return (
      <div className="group relative mb-6">
        <img 
          src={block.content} 
          alt="Proposal content" 
          className="max-w-full rounded-lg shadow-md"
        />
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  if (block.type === "pagebreak") {
    return (
      <div className="group relative my-8" data-page-break="true">
        <div className={`flex items-center gap-4 py-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          <div className={`flex-1 border-t-2 border-dashed ${isDark ? "border-slate-700" : "border-slate-300"}`}></div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <FileText className="h-4 w-4" />
            Page Break
          </div>
          <div className={`flex-1 border-t-2 border-dashed ${isDark ? "border-slate-700" : "border-slate-300"}`}></div>
        </div>
        <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
      </div>
    );
  }

  if (block.type === "table" || block.type === "chart") {
    const vp = template.visual_placeholders.find((v) => v.name === block.visualPlaceholder);
    
    if (!vp) return null;

    let data: Record<string, unknown>[] = [];
    
    if (vp.source && filledData[vp.source]) {
      const sourceData = filledData[vp.source] as Record<string, unknown>[];
      if (vp.chartType === "bar" && vp.name.includes("phase")) {
        const grouped: Record<string, number> = {};
        sourceData.forEach(item => {
          const phase = String(item.phase || "Unknown");
          grouped[phase] = (grouped[phase] || 0) + 1;
        });
        data = Object.entries(grouped).map(([phase, count]) => ({ phase, count }));
      } else if (vp.chartType === "pie" && vp.name.includes("feature")) {
        const grouped: Record<string, number> = {};
        sourceData.forEach(item => {
          const category = String(item.category || "Unknown");
          grouped[category] = (grouped[category] || 0) + 1;
        });
        data = Object.entries(grouped).map(([category, count]) => ({ category, count }));
      } else if (vp.chartType === "pie" && vp.name.includes("cost")) {
        data = sourceData.map(item => ({
          phase: item.phase,
          cost: Number(item.cost) || 0
        }));
      } else {
        data = sourceData;
      }
    } else {
      data = (block.data || filledData[block.visualPlaceholder || ""] || []) as Record<string, unknown>[];
    }

    return (
      <div className="group relative mb-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            {vp.type === 'chart' ? <BarChart className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {vp.name}
          </h4>
          
          {vp.schema?.insights && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-slate-50 text-primary hover:bg-primary/10">
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] p-3 bg-slate-900 text-white border-0 shadow-xl">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">AI Strategic Analysis</p>
                      <p className="text-slate-300 leading-snug">{vp.schema.insights}</p>
                    </div>
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>

          {data.length === 0 ? (
            <div className="p-6 border-2 border-dashed rounded-xl bg-slate-50/50 text-center text-slate-400 flex flex-col items-center gap-2">
              <Info className="h-5 w-5 opacity-50" />
              <p className="text-sm">No data yet. Add data in the <span className="font-semibold text-primary">Form Data</span> tab.</p>
            </div>
          ) : block.type === "table" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {vp.schema?.columns.map((col) => (
                    <TableHead key={col.key} className="font-bold text-slate-900">
                      {col.label}
                    </TableHead>
                  )) || Object.keys(data[0]).map(k => <TableHead key={k}>{k}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                    {(vp.schema?.columns.map(col => col.key) || Object.keys(data[0])).map((col) => (
                      <TableCell key={col} className="text-slate-700">
                        {typeof row[col] === "number"
                          ? (vp.schema?.columns.find(c => c.key === col)?.type === 'currency'
                            ? `$${(row[col] as number).toLocaleString()}`
                            : (row[col] as number).toLocaleString())
                          : String(row[col] || "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[350px] w-full p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              {vp.chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={data.map((item, i) => ({
                      name: String(item[vp.schema?.columns[0]?.key || 'label'] || `Item ${i + 1}`),
                      value: Number(item[vp.schema?.columns[1]?.key || 'value'] || 0),
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.map((_, i) => (
                        <Cell key={i} fill={activeChartColors[i % activeChartColors.length]} />
                      ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              ) : vp.chartType === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey={vp.schema?.columns[0]?.key || 'label'} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                    <Line 
                      type="monotone" 
                      dataKey={vp.schema?.columns[1]?.key || 'value'} 
                      stroke={activeChartColors[0]} 
                      strokeWidth={3} 
                      dot={{ fill: activeChartColors[0], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </LineChart>
              ) : vp.chartType === "area" ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={`colorValue-${block.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeChartColors[0]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={activeChartColors[0]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey={vp.schema?.columns[0]?.key || 'label'} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={vp.schema?.columns[1]?.key || 'value'} 
                    stroke={activeChartColors[0]} 
                    fillOpacity={1} 
                    fill={`url(#colorValue-${block.id})`} 
                    strokeWidth={3}
                  />
                </AreaChart>
              ) : (
                  <BarChart data={data} layout={vp.name.toLowerCase().includes('resource') ? 'vertical' : 'horizontal'}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      type={vp.name.toLowerCase().includes('resource') ? 'number' : 'category'}
                      dataKey={vp.name.toLowerCase().includes('resource') ? undefined : (vp.schema?.columns[0]?.key || 'label')} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={vp.name.toLowerCase().includes('resource') ? false : { fill: '#64748b', fontSize: 12 }}
                      hide={vp.name.toLowerCase().includes('resource')}
                    />
                    <YAxis 
                      type={vp.name.toLowerCase().includes('resource') ? 'category' : 'number'}
                      dataKey={vp.name.toLowerCase().includes('resource') ? (vp.schema?.columns[0]?.key || 'label') : undefined}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      width={vp.name.toLowerCase().includes('resource') ? 100 : 40}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                        dataKey={vp.schema?.columns[1]?.key || 'value'} 
                        fill={activeChartColors[0]} 
                        radius={vp.name.toLowerCase().includes('resource') ? [0, 6, 6, 0] : [6, 6, 0, 0]} 
                        barSize={vp.name.toLowerCase().includes('resource') ? 20 : 40}
                      />
                  </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
        <BlockToolbar
          block={block}
          onDelete={onDelete}
          onInsertVisual={onInsertVisual}
          selectedText=""
          onMakeDynamic={onMakeDynamic}
        />
      </div>
    );
  }

    if (block.type === "image") {
      return (
        <div className="group relative mb-8">
          <label className={`p-12 border-2 border-dashed rounded-2xl text-center flex flex-col items-center gap-4 transition-colors cursor-pointer ${
            isDark 
              ? "bg-slate-800/50 hover:border-primary hover:bg-primary/10 border-slate-700" 
              : "bg-slate-50 hover:border-primary hover:bg-primary/5 border-slate-200"
          }`}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("proposalId", proposalId || "general");
                  formData.append("imageType", "content");
                  
                  const response = await fetch("/api/upload-image", {
                    method: "POST",
                    body: formData,
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Upload failed");
                  }
                  
                  const data = await response.json();
                  onUpdate({ ...block, content: data.url });
                  toast.success("Image uploaded successfully");
                } catch (error) {
                  console.error("Image upload error:", error);
                  toast.error(error instanceof Error ? error.message : "Failed to upload image");
                }
              }}
            />
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isDark ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-400"
            }`}>
              <Image className="h-6 w-6" />
            </div>
            <div>
              <p className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{block.visualPlaceholder || "Image"}</p>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Click to upload or drag & drop</p>
            </div>
          </label>
          <BlockToolbar
              block={block}
              onDelete={onDelete}
              onInsertVisual={onInsertVisual}
              selectedText=""
              onMakeDynamic={onMakeDynamic}
            />
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
        
        const hasGovernanceContent = cadenceItems.length > 0 || reportingItems.length > 0 || decisionItems.length > 0;

        if (!hasGovernanceContent) {
          return (
            <div className="group relative mb-8">
              <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
                isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
              }`}>
                <Info className="h-5 w-5 opacity-50" />
                <p className="text-sm">No governance items defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab under Governance section.</p>
              </div>
              <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
            </div>
          );
        }

        return (
          <div className="group relative mb-8 space-y-6">
            {cadenceItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newName = e.currentTarget.textContent?.trim() || cadenceName;
                    if (newName !== cadenceName) onDataChange("governance_cadence_name", newName);
                  }}
                >{cadenceName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {cadenceItems.map((item, idx) => (
                    <li key={`cadence-${idx}`}>
                      <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => {
                          const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                          if (newKey !== item.key) {
                            const updated = cadenceItems.map((c, i) => i === idx ? { ...c, key: newKey } : c);
                            onDataChange("governance_cadence_items", updated);
                          }
                        }}
                      >{item.key}:</span>
                      <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => {
                          const newVal = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                          if (newVal !== item.value) {
                            const updated = cadenceItems.map((c, i) => i === idx ? { ...c, value: newVal } : c);
                            onDataChange("governance_cadence_items", updated);
                          }
                        }}
                      >{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {reportingItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newName = e.currentTarget.textContent?.trim() || reportingName;
                    if (newName !== reportingName) onDataChange("governance_reporting_name", newName);
                  }}
                >{reportingName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {reportingItems.map((item, idx) => (
                    <li key={`reporting-${idx}`}>
                      <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => {
                          const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                          if (newKey !== item.key) {
                            const updated = reportingItems.map((r, i) => i === idx ? { ...r, key: newKey } : r);
                            onDataChange("governance_reporting_items", updated);
                          }
                        }}
                      >{item.key}:</span>
                      <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => {
                          const newVal = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                          if (newVal !== item.value) {
                            const updated = reportingItems.map((r, i) => i === idx ? { ...r, value: newVal } : r);
                            onDataChange("governance_reporting_items", updated);
                          }
                        }}
                      >{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {decisionItems.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newName = e.currentTarget.textContent?.trim() || decisionName;
                    if (newName !== decisionName) onDataChange("governance_decision_name", newName);
                  }}
                >{decisionName}</h3>
                <ul className="space-y-3 list-disc list-outside ml-6">
                  {decisionItems.map((item, idx) => (
                    <li key={`decision-${idx}`}>
                      <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => {
                          const newKey = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.key;
                          if (newKey !== item.key) {
                            const updated = decisionItems.map((d, i) => i === idx ? { ...d, key: newKey } : d);
                            onDataChange("governance_decision_items", updated);
                          }
                        }}
                      >{item.key}:</span>
                      <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => {
                          const newVal = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.value;
                          if (newVal !== item.value) {
                            const updated = decisionItems.map((d, i) => i === idx ? { ...d, value: newVal } : d);
                            onDataChange("governance_decision_items", updated);
                          }
                        }}
                      >{item.value}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

    if (block.visualPlaceholder === "signoff_list" || block.visualPlaceholder === "signoff_requirements_section" || block.visualPlaceholder === "signoff_section") {
          const signoffRequirements = filledData.signoff_requirements as { stage: string; description: string }[] || [];
          const baselineLink = filledData.baseline_reference_link as string || "";
        
        if (signoffRequirements.length === 0) {
          return (
            <div className="group relative mb-8">
              <div className={`p-6 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 ${
                isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-slate-50/50 text-slate-400 border-slate-200"
              }`}>
                <Info className="h-5 w-5 opacity-50" />
                <p className="text-sm">No sign-off requirements defined. Add items in the <span className="font-semibold text-primary">Form Data</span> tab under Sign-off section.</p>
              </div>
              <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
            </div>
          );
        }

        return (
          <div className="group relative mb-8 space-y-6">
            <ul className="space-y-3 list-disc list-outside ml-6">
              {signoffRequirements.map((item, idx) => (
                <li key={`signoff-${idx}`}>
                  <span className={`font-bold cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-900"}`}
                    contentEditable suppressContentEditableWarning
                    onBlur={(e) => {
                      const newStage = e.currentTarget.textContent?.replace(/:$/, "").trim() || item.stage;
                      if (newStage !== item.stage) {
                        const updated = signoffRequirements.map((s, i) => i === idx ? { ...s, stage: newStage } : s);
                        onDataChange("signoff_requirements", updated);
                      }
                    }}
                  >{item.stage}:</span>
                  <span className={`ml-1 cursor-text hover:opacity-80 ${isDark ? "text-white" : "text-slate-600"}`}
                    contentEditable suppressContentEditableWarning
                    onBlur={(e) => {
                      const newDesc = e.currentTarget.textContent?.replace(/\.$/, "").trim() || item.description;
                      if (newDesc !== item.description) {
                        const updated = signoffRequirements.map((s, i) => i === idx ? { ...s, description: newDesc } : s);
                        onDataChange("signoff_requirements", updated);
                      }
                    }}
                  >{item.description}.</span>
                </li>
              ))}
            </ul>
            {baselineLink && (
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Baseline Reference: <span className="text-primary underline cursor-text hover:opacity-80"
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => {
                    const newLink = e.currentTarget.textContent?.trim() || baselineLink;
                    if (newLink !== baselineLink) {
                      onDataChange("baseline_reference_link", newLink);
                    }
                  }}
                >{baselineLink}</span>
              </p>
            )}
            <BlockToolbar block={block} onDelete={onDelete} onInsertVisual={onInsertVisual} selectedText="" onMakeDynamic={onMakeDynamic} />
          </div>
        );
      }

    return null;
}

function BlockToolbar({
  block,
  onDelete,
  onInsertVisual,
  selectedText,
  onMakeDynamic,
  onMakeStatic,
}: {
  block: ContentBlock;
  onDelete: () => void;
  onInsertVisual: (type: "chart" | "table" | "image") => void;
  selectedText: string;
  onMakeDynamic: (text: string) => void;
  onMakeStatic?: (placeholder: string) => void;
}) {
  return (
    <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
      <TooltipProvider>
        {selectedText && (
          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 shadow-sm"
                onClick={() => onMakeDynamic(selectedText)}
              >
                <MousePointer className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Make "{selectedText.slice(0, 20)}..." dynamic</p>
            </TooltipContent>
          </UITooltip>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm">
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="left">
            <DropdownMenuItem onClick={() => onInsertVisual("chart")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Insert Chart
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsertVisual("table")}>
              <Table2 className="h-4 w-4 mr-2" />
              Insert Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsertVisual("image")}>
              <Image className="h-4 w-4 mr-2" />
              Insert Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UITooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 shadow-sm text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Delete block</p>
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>
    </div>
  );
}

function VisualDataField({
  vp,
  value,
  onChange,
}: {
  vp: VisualPlaceholder;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const rows = (value as Record<string, unknown>[]) || [];
  const columns = vp.schema?.columns || [
    { key: "label", label: "Label", type: "string" },
    { key: "value", label: "Value", type: "number" },
  ];

  return (
    <Card className="border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col) => (
              <TableHead key={col.key} className="text-xs font-semibold">
                {col.label}
              </TableHead>
            ))}
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.key} className="py-2">
                  <Input
                    type={col.type === "number" || col.type === "currency" ? "number" : "text"}
                    value={(row[col.key] as string) || ""}
                    onChange={(e) => {
                      const newRows = [...rows];
                      newRows[i] = {
                        ...newRows[i],
                        [col.key]:
                          col.type === "number" || col.type === "currency"
                            ? parseFloat(e.target.value) || 0
                            : e.target.value,
                      };
                      onChange(newRows);
                    }}
                    className="h-8 text-sm"
                    placeholder={`Enter ${col.label.toLowerCase()}`}
                  />
                </TableCell>
              ))}
              <TableCell className="py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const newRows = rows.filter((_, idx) => idx !== i);
                    onChange(newRows);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="p-2 bg-muted/20 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...rows, {}])}
          className="w-full text-xs h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Data Row
        </Button>
      </div>
    </Card>
  );
}

function FormField({
  field,
  value,
  onChange,
  allData,
}: {
  field: PlaceholderField;
  value: unknown;
  onChange: (value: unknown) => void;
  allData: Record<string, unknown>;
}) {
  if (field.conditional) {
    const conditionMet = allData[field.conditional.field] === field.conditional.value;
    if (!conditionMet) return null;
  }

  if (field.type === "text") {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          rows={4}
        />
      </div>
    );
  }

  if (field.type === "number" || field.type === "currency") {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          type="number"
          value={(value as number) || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "list" && field.columns) {
    const items = (value as Record<string, string>[]) || [];
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Card className="border">
          <CardContent className="pt-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={item[field.columns![0].key] || ""}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], [field.columns![0].key]: e.target.value };
                    onChange(newItems);
                  }}
                  placeholder={field.columns![0].label}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newItems = items.filter((_, idx) => idx !== i);
                    onChange(newItems);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange([...items, {}])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (field.type === "table" && field.columns) {
    const rows = (value as Record<string, unknown>[]) || [];
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Card className="border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {field.columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {field.columns!.map((col) => (
                    <TableCell key={col.key}>
                      <Input
                        type={col.type === "number" || col.type === "currency" ? "number" : "text"}
                        value={(row[col.key] as string) || ""}
                        onChange={(e) => {
                          const newRows = [...rows];
                          newRows[i] = {
                            ...newRows[i],
                            [col.key]:
                              col.type === "number" || col.type === "currency"
                                ? parseFloat(e.target.value) || 0
                                : e.target.value,
                          };
                          onChange(newRows);
                        }}
                        className="h-8"
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const newRows = rows.filter((_, idx) => idx !== i);
                        onChange(newRows);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange([...rows, {}])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
